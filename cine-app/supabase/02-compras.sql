-- ============================================================
-- COMPRA: cálculo y confirmación atómica
-- Ejecutar en el SQL Editor de Supabase (después del esquema inicial).
--
-- Idea central: el PRECIO lo calcula siempre el servidor. El cliente
-- (Angular) solo muestra el resultado y pide confirmar; nunca manda
-- precios ni tipos de butaca, así nadie puede alterarlos desde el navegador.
--
-- NOTA: 04-candy.sql reemplaza calcular_compra, confirmar_compra y
-- obtener_compra por versiones que también manejan productos del candy bar.
-- ============================================================


-- Tipo de butaca según la fila. Es la misma regla que usa layout-sala.ts en el
-- frontend (J,K accesibles / R,S,T VIP), pero acá es la que manda para cobrar.
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


-- ------------------------------------------------------------
-- calcular_compra: devuelve el resumen (ítems, descuento, total) de las
-- butacas que esta sesión tiene reservadas y vigentes. No escribe nada,
-- así que sirve tanto para mostrar el checkout como para confirmar.
-- ------------------------------------------------------------
create or replace function public.calcular_compra(p_funcion_id uuid, p_sesion_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c_multiplicador_vip constant numeric := 1.5;   -- VIP cuesta 50% más que el precio base

  v_uid          uuid := auth.uid();             -- null si la compra es anónima
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
  v_subtotal     numeric(10,2);
  v_total        numeric(10,2);
begin
  select * into v_func from funciones where id = p_funcion_id;
  if not found then
    raise exception 'La función no existe';
  end if;

  select titulo, restriccion_edad into v_titulo, v_restriccion
    from peliculas where id = v_func.pelicula_id;

  -- Edad del comprador (solo si está logueado)
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

  -- Precio base: preventa mientras la fecha de fin de preventa no haya pasado
  v_base := case
    when v_func.precio_preventa is not null
     and v_func.fecha_fin_preventa is not null
     and v_hoy <= v_func.fecha_fin_preventa
    then v_func.precio_preventa
    else v_func.precio
  end;

  -- Cupón: solo usuarios registrados. No se acumulan: se aplica el de mayor porcentaje.
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

  -- Ítems: una fila por butaca reservada (vigente) de esta sesión
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

  select sum((i->>'precio_unitario')::numeric), sum((i->>'precio_final')::numeric)
    into v_subtotal, v_total
    from jsonb_array_elements(v_items) i;

  return jsonb_build_object(
    'pelicula',             v_titulo,
    'fecha_funcion',        v_func.fecha,
    'hora_inicio',          v_func.hora_inicio,
    'formato',              v_func.formato,
    'idioma',               v_func.idioma,
    'restriccion_edad',     v_restriccion,
    'requiere_adulto',      v_restriccion is not null,
    'items',                v_items,
    'subtotal',             v_subtotal,
    'descuento_porcentaje', v_pct,
    'cupon',                v_cupon,
    'total',                v_total
  );
end;
$$;


-- ------------------------------------------------------------
-- confirmar_compra: todo o nada. Crea la compra, crea las entradas,
-- libera las reservas y suma puntos, en UNA transacción (una función
-- plpgsql es atómica: si algo falla, no queda nada a medias).
-- Devuelve el código del QR.
-- ------------------------------------------------------------
create or replace function public.confirmar_compra(p_funcion_id uuid, p_sesion_id text)
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
  -- Bloquea las reservas de esta sesión: si se confirma dos veces a la vez
  -- (doble click, dos pestañas), la segunda espera y después no encuentra nada.
  perform 1
     from butacas_reservadas
    where funcion_id = p_funcion_id
      and sesion_id  = p_sesion_id
      and expira_en  > now()
      for update;

  v_calc := calcular_compra(p_funcion_id, p_sesion_id);

  insert into compras (usuario_id, total, estado, codigo_qr, credito_usado)
  values (v_uid, (v_calc->>'total')::numeric, 'confirmada', v_codigo, 0)
  returning id into v_compra_id;

  -- Si una butaca ya estaba vendida, el unique (funcion_id, fila, columna) de
  -- `entradas` hace fallar esto y se revierte todo.
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

  delete from butacas_reservadas
   where funcion_id = p_funcion_id and sesion_id = p_sesion_id;

  -- Fidelización: 1 punto por peso pagado (solo usuarios registrados)
  if v_uid is not null then
    update usuarios
       set puntos_fidelidad = puntos_fidelidad + floor((v_calc->>'total')::numeric)::int
     where id = v_uid;
  end if;

  return v_codigo;
end;
$$;


-- ------------------------------------------------------------
-- obtener_compra: devuelve una compra a partir de su código QR.
-- Existe porque la compra anónima no tiene dueño: con RLS nadie podría
-- volver a leerla. El código (un UUID) funciona como llave secreta:
-- quien lo tiene, puede ver y descargar su comprobante.
-- ------------------------------------------------------------
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
    )
  )
  from compras c
  join lateral (select funcion_id from entradas where compra_id = c.id limit 1) ef on true
  join funciones f on f.id = ef.funcion_id
  join peliculas p on p.id = f.pelicula_id
  join salas s     on s.id = f.sala_id
  where c.codigo_qr = p_codigo;
$$;


-- Solo se ejecutan por la API (rpc), nunca como tablas
revoke all on function public.calcular_compra(uuid, text)  from public;
revoke all on function public.confirmar_compra(uuid, text) from public;
revoke all on function public.obtener_compra(text)         from public;
grant execute on function public.calcular_compra(uuid, text)  to anon, authenticated;
grant execute on function public.confirmar_compra(uuid, text) to anon, authenticated;
grant execute on function public.obtener_compra(text)         to anon, authenticated;


-- ------------------------------------------------------------
-- Cupón de primera compra (20%). Revisá antes en la tabla `cupones`
-- que no exista ya uno; si existe, no corras este insert.
-- ------------------------------------------------------------
-- insert into cupones (tipo, porcentaje, edad_minima, activo)
-- values ('primera-compra', 20, null, true);
