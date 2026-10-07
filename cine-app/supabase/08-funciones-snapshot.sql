-- Snapshot del estado actual de las funciones de compra, canjes, validación y consultas.
-- Idempotente: se puede ejecutar sobre una base existente sin romper nada.
-- Reemplaza a los antiguos 08 (crédito), 09 (canjes) y 10 (mis películas / stats).

-- ============ Helpers de rol ============
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from usuarios where id = auth.uid() and rol = 'admin');
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from usuarios where id = auth.uid() and rol in ('admin','empleado'));
$$;

create or replace function public.tipo_butaca_de_fila(p_fila text)
returns text
language sql
immutable
as $$
  select case
    when p_fila in ('J', 'K')      then 'accesible'
    when p_fila in ('R', 'S', 'T') then 'vip'
    else 'estandar'
  end;
$$;

-- ============ Cálculo y confirmación de compra ============
create or replace function public.calcular_compra_base(
  p_funcion_id uuid,
  p_sesion_id  text,
  p_productos  jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c_multiplicador_vip  constant numeric := 1.5;
  c_max_por_producto   constant int     := 20;

  v_uid          uuid := auth.uid();
  v_hoy          date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_func         funciones%rowtype;
  v_titulo       text;
  v_restriccion  int;
  v_nacimiento   date;
  v_edad         int;
  v_primera      boolean := false;
  v_base         numeric(10,2);
  v_pct          numeric(5,2);
  v_cupon        text;
  v_items        jsonb;
  v_productos    jsonb;
  v_pedidos      int;
  v_sub_entradas numeric(10,2);
  v_tot_entradas numeric(10,2);
  v_sub_prod     numeric(10,2);
  v_subtotal     numeric(10,2);
  v_total        numeric(10,2);
begin
  select * into v_func from funciones where id = p_funcion_id;
  if not found then
    raise exception 'La función no existe';
  end if;

  select titulo, restriccion_edad into v_titulo, v_restriccion
    from peliculas where id = v_func.pelicula_id;

  if v_uid is not null then
    select fecha_nacimiento into v_nacimiento from usuarios where id = v_uid;
    if v_nacimiento is not null then
      v_edad := extract(year from age(v_hoy, v_nacimiento))::int;
    end if;
  end if;

  -- Anónimos pueden comprar (la pantalla ya advirtió la restricción);
  -- un usuario logueado menor a la edad mínima no.
  if v_restriccion is not null and v_edad is not null and v_edad < v_restriccion then
    raise exception 'No cumplís la edad mínima (+%) para esta película', v_restriccion;
  end if;

  v_base := case
    when v_func.precio_preventa is not null
     and v_func.fecha_fin_preventa is not null
     and v_hoy <= v_func.fecha_fin_preventa
    then v_func.precio_preventa
    else v_func.precio
  end;

  v_pct := 0;
  if v_uid is not null then
    v_primera := not exists (
      select 1 from compras where usuario_id = v_uid and estado <> 'cancelada'
    );

    select c.porcentaje, c.tipo into v_pct, v_cupon
      from cupones c
     where c.activo
       and (
            (c.tipo = 'primera-compra' and v_primera)
         or (c.tipo = 'segmentado-edad' and v_edad is not null and v_edad > c.edad_minima)
       )
     order by c.porcentaje desc
     limit 1;

    v_pct := coalesce(v_pct, 0);
  end if;

  -- Entradas (una fila por butaca reservada vigente de esta sesión)
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'fila',            r.fila,
             'columna',         r.columna,
             'tipo',            t.tipo,
             'precio_unitario', t.precio,
             'precio_final',    round(t.precio * (1 - v_pct / 100), 2)
           ) order by r.fila, r.columna
         ), '[]'::jsonb)
    into v_items
    from butacas_reservadas r
    cross join lateral (
      select tipo_butaca_de_fila(r.fila) as tipo,
             round(v_base * case when tipo_butaca_de_fila(r.fila) = 'vip'
                                 then c_multiplicador_vip else 1 end, 2) as precio
    ) t
   where r.funcion_id = p_funcion_id
     and r.sesion_id  = p_sesion_id
     and r.expira_en  > now();

  if jsonb_array_length(v_items) = 0 then
    raise exception 'No tenés butacas reservadas vigentes (la reserva dura 10 minutos)';
  end if;

  -- Productos del candy bar: nombre y precio salen de la tabla, nunca del cliente.
  select count(distinct e->>'producto_id') into v_pedidos
    from jsonb_array_elements(coalesce(p_productos, '[]'::jsonb)) e
   where (e->>'cantidad')::int > 0;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'producto_id',     p.id,
             'nombre',          p.nombre,
             'cantidad',        x.cantidad,
             'precio_unitario', p.precio,
             'subtotal',        round(p.precio * x.cantidad, 2)
           ) order by p.nombre
         ), '[]'::jsonb)
    into v_productos
    from (
      select (e->>'producto_id')::uuid as producto_id,
             sum((e->>'cantidad')::int)::int as cantidad
        from jsonb_array_elements(coalesce(p_productos, '[]'::jsonb)) e
       where (e->>'cantidad')::int > 0
       group by 1
    ) x
    join productos p on p.id = x.producto_id and p.activo;

  if jsonb_array_length(v_productos) <> v_pedidos then
    raise exception 'Alguno de los productos elegidos ya no está disponible';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_productos) i
     where (i->>'cantidad')::int > c_max_por_producto
  ) then
    raise exception 'Máximo % unidades por producto', c_max_por_producto;
  end if;

  select sum((i->>'precio_unitario')::numeric), sum((i->>'precio_final')::numeric)
    into v_sub_entradas, v_tot_entradas
    from jsonb_array_elements(v_items) i;

  select coalesce(sum((i->>'subtotal')::numeric), 0)
    into v_sub_prod
    from jsonb_array_elements(v_productos) i;

  -- El descuento solo toca a las entradas
  v_subtotal := v_sub_entradas + v_sub_prod;
  v_total    := v_tot_entradas + v_sub_prod;

  return jsonb_build_object(
    'pelicula',             v_titulo,
    'fecha_funcion',        v_func.fecha,
    'hora_inicio',          v_func.hora_inicio,
    'formato',              v_func.formato,
    'idioma',               v_func.idioma,
    'restriccion_edad',     v_restriccion,
    'requiere_adulto',      v_restriccion is not null,
    'items',                v_items,
    'productos',            v_productos,
    'total_productos',      v_sub_prod,
    'subtotal',             v_subtotal,
    'descuento_porcentaje', v_pct,
    'cupon',                v_cupon,
    'total',                v_total
  );
end;
$$;

create or replace function public.confirmar_compra(
  p_funcion_id uuid,
  p_sesion_id  text,
  p_productos  jsonb default '[]'::jsonb
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid        uuid := auth.uid();
  v_calc       jsonb;
  v_compra_id  uuid;
  v_codigo     text := gen_random_uuid()::text;
  v_item       jsonb;
  v_aplicar    numeric := 0;
begin
  perform 1
     from butacas_reservadas
    where funcion_id = p_funcion_id
      and sesion_id  = p_sesion_id
      and expira_en  > now()
      for update;

  -- Bloquea la fila del usuario: dos compras simultáneas no pueden gastar el mismo crédito
  if v_uid is not null then
    perform 1 from usuarios where id = v_uid for update;
  end if;

  v_calc    := calcular_compra(p_funcion_id, p_sesion_id, p_productos);
  v_aplicar := (v_calc->>'credito_aplicado')::numeric;

  insert into compras (usuario_id, total, estado, codigo_qr, credito_usado, funcion_id)
  values (v_uid, (v_calc->>'total')::numeric, 'confirmada', v_codigo, v_aplicar, p_funcion_id)
  returning id into v_compra_id;

  for v_item in select jsonb_array_elements(v_calc->'items') loop
    insert into entradas (compra_id, funcion_id, fila, columna, tipo_butaca, precio_pagado)
    values (
      v_compra_id,
      p_funcion_id,
      v_item->>'fila',
      (v_item->>'columna')::int,
      v_item->>'tipo',
      (v_item->>'precio_final')::numeric
    );
  end loop;

  insert into compra_productos (compra_id, producto_id, cantidad, precio_unitario)
  select v_compra_id,
         (i->>'producto_id')::uuid,
         (i->>'cantidad')::int,
         (i->>'precio_unitario')::numeric
    from jsonb_array_elements(v_calc->'productos') i;

  delete from butacas_reservadas
   where funcion_id = p_funcion_id and sesion_id = p_sesion_id;

  -- Puntos: 1 por peso efectivamente pagado (lo cubierto con crédito no suma)
  if v_uid is not null then
    update usuarios
       set credito          = credito - v_aplicar,
           puntos_fidelidad = puntos_fidelidad
                              + floor((v_calc->>'total')::numeric - v_aplicar)::int
     where id = v_uid;
  end if;

  return v_codigo;
end;
$$;

create or replace function public.cancelar_compra(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid     uuid := auth.uid();
  v_compra  compras%rowtype;
  v_func    funciones%rowtype;
  v_inicio  timestamptz;
  v_puntos  int;
begin
  if v_uid is null then
    raise exception 'Tenés que iniciar sesión para cancelar una compra';
  end if;

  select * into v_compra from compras where codigo_qr = trim(p_codigo) for update;

  if not found or v_compra.usuario_id is distinct from v_uid then
    raise exception 'No encontramos esa compra en tu cuenta';
  end if;
  if v_compra.estado = 'cancelada' then
    raise exception 'La compra ya estaba cancelada';
  end if;
  if v_compra.estado = 'validada' then
    raise exception 'La entrada ya fue utilizada, no se puede cancelar';
  end if;
  if v_compra.candy_entregado_en is not null then
    raise exception 'Ya retiraste los productos del candy bar, no se puede cancelar';
  end if;

  select * into v_func from funciones where id = v_compra.funcion_id;
  v_inicio := (v_func.fecha::date + v_func.hora_inicio::time) at time zone 'America/Argentina/Buenos_Aires';

  if now() > v_inicio - interval '2 hours' then
    raise exception 'Solo se puede cancelar hasta 2 horas antes de la función';
  end if;

  -- Libera las butacas (el unique de entradas impediría venderlas de nuevo)
  delete from entradas where compra_id = v_compra.id;

  update compras
     set estado = 'cancelada', cancelada_en = now()
   where id = v_compra.id;

  -- Sin devolución de dinero: el total completo vuelve como crédito
  -- y se quitan los puntos que había dado esta compra.
  v_puntos := floor(v_compra.total - v_compra.credito_usado)::int;

  update usuarios
     set credito          = credito + v_compra.total,
         puntos_fidelidad = greatest(0, puntos_fidelidad - v_puntos)
   where id = v_uid;

  return jsonb_build_object('credito_devuelto', v_compra.total);
end;
$$;

-- ============ Canjes de puntos ============
create or replace function public.canjear_recompensa(p_recompensa_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid     uuid := auth.uid();
  v_rec     recompensas%rowtype;
  v_puntos  int;
  v_codigo  text;
begin
  if v_uid is null then
    raise exception 'Tenés que iniciar sesión para canjear puntos';
  end if;

  select * into v_rec from recompensas where id = p_recompensa_id and activo;
  if not found then
    raise exception 'La recompensa no está disponible';
  end if;

  -- Bloquea al usuario: dos canjes simultáneos no pueden gastar los mismos puntos
  select puntos_fidelidad into v_puntos from usuarios where id = v_uid for update;

  if v_puntos < v_rec.puntos_costo then
    raise exception 'Te faltan % puntos para esta recompensa', v_rec.puntos_costo - v_puntos;
  end if;

  update usuarios set puntos_fidelidad = puntos_fidelidad - v_rec.puntos_costo where id = v_uid;

  insert into canjes_puntos (usuario_id, recompensa_id, puntos_usados)
  values (v_uid, v_rec.id, v_rec.puntos_costo)
  returning codigo into v_codigo;

  return jsonb_build_object('codigo', v_codigo, 'puntos_restantes', v_puntos - v_rec.puntos_costo);
end;
$$;

create or replace function public.entregar_canje(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid    uuid := auth.uid();
  v_canje  canjes_puntos%rowtype;
  v_tipo   text;
  v_nombre text;
begin
  if v_uid is null or not is_staff() then
    raise exception 'No tenés permisos para entregar canjes';
  end if;

  select * into v_canje from canjes_puntos where codigo = trim(p_codigo) for update;
  if not found then
    raise exception 'Código inválido: no existe ningún canje con ese código';
  end if;
  if v_canje.entregado_en is not null then
    raise exception 'Este canje ya fue entregado';
  end if;

  select r.tipo, coalesce(p.nombre, 'Entrada gratis')
    into v_tipo, v_nombre
    from recompensas r
    left join productos p on p.id = r.producto_id
   where r.id = v_canje.recompensa_id;

  update canjes_puntos set entregado_en = now() where id = v_canje.id;

  insert into log_actividad (usuario_id, accion, detalle)
  values (v_uid, 'entregar-canje', format('Canje %s | %s', v_canje.codigo, v_nombre));

  return jsonb_build_object('tipo', v_tipo, 'recompensa', v_nombre);
end;
$$;

-- ============ Validación en puerta y candy ============
create or replace function public.validar_entrada(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid      uuid := auth.uid();
  v_hoy      date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_compra   compras%rowtype;
  v_func     funciones%rowtype;
  v_titulo   text;
  v_sala     text;
  v_butacas  text;
  v_cantidad int;
begin
  if v_uid is null or not is_staff() then
    raise exception 'No tenés permisos para validar entradas';
  end if;

  select * into v_compra
    from compras
   where codigo_qr = trim(p_codigo)
     for update;

  if not found then
    raise exception 'Código inválido: no existe ninguna compra con ese código';
  end if;
  if v_compra.estado = 'validada' then
    raise exception 'Esta entrada ya fue validada';
  end if;
  if v_compra.estado = 'cancelada' then
    raise exception 'Esta compra fue cancelada';
  end if;

  select f.* into v_func
    from funciones f
    join entradas e on e.funcion_id = f.id
   where e.compra_id = v_compra.id
   limit 1;

  if v_func.fecha::date <> v_hoy then
    raise exception 'La función no es para hoy (es el %)', v_func.fecha;
  end if;

  select titulo into v_titulo from peliculas where id = v_func.pelicula_id;
  select numero::text into v_sala from salas where id = v_func.sala_id;

  select string_agg(fila || columna::text, ', ' order by fila, columna), count(*)
    into v_butacas, v_cantidad
    from entradas
   where compra_id = v_compra.id;

  update compras set estado = 'validada' where id = v_compra.id;

  insert into log_actividad (usuario_id, accion, detalle)
  values (
    v_uid,
    'validar-qr',
    format('Compra %s | %s | %s %s | %s entrada(s)',
           v_compra.codigo_qr, v_titulo, v_func.fecha, v_func.hora_inicio, v_cantidad)
  );

  return jsonb_build_object(
    'pelicula',      v_titulo,
    'fecha_funcion', v_func.fecha,
    'hora_inicio',   v_func.hora_inicio,
    'sala',          v_sala,
    'formato',       v_func.formato,
    'idioma',        v_func.idioma,
    'butacas',       v_butacas,
    'cantidad',      v_cantidad
  );
end;
$$;

create or replace function public.entregar_candy(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid       uuid := auth.uid();
  v_compra    compras%rowtype;
  v_productos jsonb;
begin
  if v_uid is null or not is_staff() then
    raise exception 'No tenés permisos para entregar productos';
  end if;

  select * into v_compra
    from compras
   where codigo_qr = trim(p_codigo)
     for update;

  if not found then
    raise exception 'Código inválido: no existe ninguna compra con ese código';
  end if;
  if v_compra.estado = 'cancelada' then
    raise exception 'Esta compra fue cancelada';
  end if;
  if v_compra.candy_entregado_en is not null then
    raise exception 'Los productos de esta compra ya fueron entregados';
  end if;

  select jsonb_agg(
           jsonb_build_object('nombre', pr.nombre, 'cantidad', cp.cantidad)
           order by pr.nombre)
    into v_productos
    from compra_productos cp
    join productos pr on pr.id = cp.producto_id
   where cp.compra_id = v_compra.id;

  if v_productos is null then
    raise exception 'Esta compra no incluye productos del candy bar';
  end if;

  update compras set candy_entregado_en = now() where id = v_compra.id;

  insert into log_actividad (usuario_id, accion, detalle)
  values (v_uid, 'entregar-candy', format('Compra %s', v_compra.codigo_qr));

  return jsonb_build_object('productos', v_productos);
end;
$$;

-- ============ Consultas del usuario ============
create or replace function public.obtener_compra(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'codigo_qr',        c.codigo_qr,
    'estado',           c.estado,
    'fecha',            c.fecha,
    'total',            c.total,
    'pelicula',         p.titulo,
    'restriccion_edad', p.restriccion_edad,
    'requiere_adulto',  p.restriccion_edad is not null,
    'sala',             s.numero,
    'fecha_funcion',    f.fecha,
    'hora_inicio',      f.hora_inicio,
    'formato',          f.formato,
    'idioma',           f.idioma,
    'entradas', (
      select jsonb_agg(
               jsonb_build_object(
                 'fila',    e.fila,
                 'columna', e.columna,
                 'tipo',    e.tipo_butaca,
                 'precio',  e.precio_pagado
               ) order by e.fila, e.columna)
        from entradas e
       where e.compra_id = c.id
    ),
    'productos', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'nombre',          pr.nombre,
                 'cantidad',        cp.cantidad,
                 'precio_unitario', cp.precio_unitario
               ) order by pr.nombre)
        from compra_productos cp
        join productos pr on pr.id = cp.producto_id
       where cp.compra_id = c.id
    ), '[]'::jsonb),
    'candy_entregado', c.candy_entregado_en is not null
  )
  from compras c
  join lateral (select funcion_id from entradas where compra_id = c.id limit 1) ef on true
  join funciones f on f.id = ef.funcion_id
  join peliculas p on p.id = f.pelicula_id
  join salas s     on s.id = f.sala_id
  where c.codigo_qr = p_codigo;
$$;

create or replace function public.mis_entradas()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(fila order by (fila->>'inicio') desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'codigo_qr',        c.codigo_qr,
      'estado',           c.estado,
      'fecha_compra',     c.fecha,
      'total',            c.total,
      'credito_usado',    c.credito_usado,
      'funcion_id',       f.id,
      'pelicula_id',      p.id,
      'pelicula',         p.titulo,
      'restriccion_edad', p.restriccion_edad,
      'sala',             s.numero,
      'fecha_funcion',    f.fecha,
      'hora_inicio',      f.hora_inicio,
      'formato',          f.formato,
      'idioma',           f.idioma,
      'inicio',           (f.fecha::date + f.hora_inicio::time),
      'butacas',          (select string_agg(e.fila || e.columna::text, ', ' order by e.fila, e.columna)
                             from entradas e where e.compra_id = c.id),
      'candy_entregado',  c.candy_entregado_en is not null,
      'productos',        (select coalesce(jsonb_agg(jsonb_build_object(
                                      'nombre', pr.nombre, 'cantidad', cp.cantidad)
                                    order by pr.nombre), '[]'::jsonb)
                             from compra_productos cp
                             join productos pr on pr.id = cp.producto_id
                            where cp.compra_id = c.id),
      'puede_cancelar',   c.estado = 'confirmada'
                          and c.candy_entregado_en is null
                          and now() <= ((f.fecha::date + f.hora_inicio::time)
                                        at time zone 'America/Argentina/Buenos_Aires') - interval '2 hours'
    ) as fila
    from compras c
    join funciones f on f.id = c.funcion_id
    join peliculas p on p.id = f.pelicula_id
    join salas s     on s.id = f.sala_id
   where c.usuario_id = auth.uid()
  ) t;
$$;

create or replace function public.mis_peliculas()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(fila order by (fila->>'fecha_funcion') desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'pelicula_id',   p.id,
      'titulo',        p.titulo,
      'imagen_url',    p.imagen_url,
      'fecha_funcion', f.fecha,
      'estrellas',     (select r.estrellas
                          from resenas r
                         where r.usuario_id = c.usuario_id
                           and r.pelicula_id = p.id)
    ) as fila
    from compras c
    join funciones f on f.id = c.funcion_id
    join peliculas p on p.id = f.pelicula_id
   where c.usuario_id = auth.uid()
     and c.estado = 'validada'
  ) t;
$$;

create or replace function public.stats_peliculas()
returns table(pelicula_id uuid, promedio numeric, cantidad_resenas integer, entradas_vendidas integer)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id,
         (select round(avg(r.estrellas)::numeric, 1) from resenas r where r.pelicula_id = p.id),
         (select count(*)::int from resenas r where r.pelicula_id = p.id),
         (select count(*)::int
            from entradas e
            join compras c on c.id = e.compra_id
            join funciones f on f.id = e.funcion_id
           where f.pelicula_id = p.id and c.estado <> 'cancelada')
    from peliculas p;
$$;

create or replace function public.resenas_de_pelicula(p_pelicula_id uuid)
returns table(estrellas integer, comentario text, fecha timestamptz, autor text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select r.estrellas, r.comentario, r.fecha,
         u.nombre || ' ' || left(u.apellido, 1) || '.'
    from resenas r
    join usuarios u on u.id = r.usuario_id
   where r.pelicula_id = p_pelicula_id
   order by r.fecha desc;
$$;

-- ============ Log automático de cambios de precio y funciones nuevas ============
create or replace function public.log_cambio_precio_producto()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.precio is distinct from old.precio and auth.uid() is not null then
    insert into log_actividad (usuario_id, accion, detalle)
    values (
      auth.uid(),
      'modificar-precio',
      format('Producto "%s": $%s -> $%s', new.nombre, old.precio, new.precio)
    );
  end if;
  return new;
end;
$$;

create or replace function public.log_cambio_precio_funcion()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is not null
     and (new.precio is distinct from old.precio
          or new.precio_preventa is distinct from old.precio_preventa) then
    insert into log_actividad (usuario_id, accion, detalle)
    values (
      auth.uid(),
      'modificar-precio',
      format('Función %s: precio $%s -> $%s, preventa $%s -> $%s',
             new.id, old.precio, new.precio,
             coalesce(old.precio_preventa::text, '-'),
             coalesce(new.precio_preventa::text, '-'))
    );
  end if;
  return new;
end;
$$;

create or replace function public.log_crear_funcion()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_titulo text;
  v_sala   text;
begin
  if auth.uid() is not null then
    select titulo into v_titulo from peliculas where id = new.pelicula_id;
    select numero::text into v_sala from salas where id = new.sala_id;

    insert into log_actividad (usuario_id, accion, detalle)
    values (
      auth.uid(),
      'crear-funcion',
      format('"%s" | sala %s | %s %s | %s %s',
             v_titulo, v_sala, new.fecha, new.hora_inicio, new.formato, new.idioma)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_cambio_precio_producto on productos;
create trigger trg_log_cambio_precio_producto
  after update of precio on productos
  for each row execute function log_cambio_precio_producto();

drop trigger if exists trg_log_crear_funcion on funciones;
create trigger trg_log_crear_funcion
  after insert on funciones
  for each row execute function log_crear_funcion();

drop trigger if exists trg_log_cambio_precio_funcion on funciones;
create trigger trg_log_cambio_precio_funcion
  after update of precio, precio_preventa on funciones
  for each row execute function log_cambio_precio_funcion();

-- La función validar_venta_abierta() está definida en 14-proximamente-alertas.sql.
-- Este trigger va en 14, después de crearla; no se crea acá para no depender de un archivo posterior.