-- ============================================================
-- CANDY BAR: productos dentro de la compra + entrega con el mismo QR
-- Correr completo en el SQL Editor (después de 02 y 03).
-- ============================================================

-- 1) Cambios de esquema -------------------------------------------------

-- Precio congelado al momento de la venta: si el admin cambia el precio
-- mañana, el historial y los reportes no se alteran.
alter table compra_productos add column if not exists precio_unitario numeric;
update compra_productos cp
   set precio_unitario = p.precio
  from productos p
 where p.id = cp.producto_id and cp.precio_unitario is null;
alter table compra_productos alter column precio_unitario set not null;

-- El QR sirve para dos cosas distintas (entrada y candy), cada una se
-- "gasta" por separado. `estado` sigue siendo solo de la entrada.
alter table compras add column if not exists candy_entregado_en timestamptz;

-- Para "dar de baja" un producto sin romper compras viejas que lo referencian.
alter table productos add column if not exists activo boolean not null default true;

-- El catálogo tiene que poder leerlo cualquiera (también anónimos).
-- Si RLS no está activado en estas tablas, estas políticas no cambian nada.
drop policy if exists "categorias_productos_select_publico" on categorias_productos;
create policy "categorias_productos_select_publico" on categorias_productos
  for select to anon, authenticated using (true);

drop policy if exists "productos_select_publico" on productos;
create policy "productos_select_publico" on productos
  for select to anon, authenticated using (activo);


-- 2) calcular_compra: ahora también recibe productos -------------------
-- p_productos = [{"producto_id": "...", "cantidad": 2}, ...]
-- El cliente manda solo ids y cantidades; nombre y precio salen de la base.
drop function if exists public.calcular_compra(uuid, text);
drop function if exists public.confirmar_compra(uuid, text);

create or replace function public.calcular_compra(
  p_funcion_id uuid,
  p_sesion_id  text,
  p_productos  jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
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

  -- Productos del candy bar: se agrupan por producto y se toman nombre y
  -- precio de la tabla. Un producto inexistente o dado de baja corta la compra.
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


-- 3) confirmar_compra: crea compra, entradas y productos en una transacción
create or replace function public.confirmar_compra(
  p_funcion_id uuid,
  p_sesion_id  text,
  p_productos  jsonb default '[]'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_calc       jsonb;
  v_compra_id  uuid;
  v_codigo     text := gen_random_uuid()::text;
  v_item       jsonb;
begin
  perform 1
     from butacas_reservadas
    where funcion_id = p_funcion_id
      and sesion_id  = p_sesion_id
      and expira_en  > now()
      for update;

  v_calc := calcular_compra(p_funcion_id, p_sesion_id, p_productos);

  insert into compras (usuario_id, total, estado, codigo_qr, credito_usado)
  values (v_uid, (v_calc->>'total')::numeric, 'confirmada', v_codigo, 0)
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

  if v_uid is not null then
    update usuarios
       set puntos_fidelidad = puntos_fidelidad + floor((v_calc->>'total')::numeric)::int
     where id = v_uid;
  end if;

  return v_codigo;
end;
$$;


-- 4) obtener_compra: ahora incluye productos y estado de entrega
create or replace function public.obtener_compra(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = public
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


-- 5) entregar_candy: el empleado entrega la comida; el QR deja de servir
--    para el candy (la entrada se valida aparte con validar_entrada).
create or replace function public.entregar_candy(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
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


-- 6) Permisos
revoke all on function public.calcular_compra(uuid, text, jsonb)  from public;
revoke all on function public.confirmar_compra(uuid, text, jsonb) from public;
revoke all on function public.obtener_compra(text)                from public;
revoke all on function public.entregar_candy(text)                from public;
grant execute on function public.calcular_compra(uuid, text, jsonb)  to anon, authenticated;
grant execute on function public.confirmar_compra(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.obtener_compra(text)                to anon, authenticated;
grant execute on function public.entregar_candy(text)                to authenticated;
