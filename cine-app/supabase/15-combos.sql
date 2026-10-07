-- ============================================================
-- 15 - Combos: entrada + productos a precio fijo, configurables por el admin
--
-- Cada combo tiene una fila "producto virtual" en `productos` con el MISMO id.
-- Así el combo viaja por el flujo del candy (carrito, compra_productos, QR,
-- entrega y reportes) sin tocar confirmar_compra.
-- Si el combo incluye entrada, calcular_compra deja en $0 la butaca más barata
-- por cada combo y cobra el precio fijo del combo.
-- ============================================================

-- 1) Columnas nuevas
alter table combos    add column if not exists activo   boolean not null default true;
alter table productos add column if not exists combo_id uuid references combos(id);

create unique index if not exists productos_combo_id_key
  on productos (combo_id) where combo_id is not null;

-- 2) Permisos: las policies de combos y combo_productos están en 01-esquema.sql
--    (lectura pública, escritura solo admin). RLS ya está activado allí.


-- 3) Crear o editar un combo (todo junto, validado en el servidor)
--    p_items: [{"producto_id": "...", "cantidad": 2}, ...]
create or replace function public.guardar_combo(
  p_id              uuid,
  p_nombre          text,
  p_precio          numeric,
  p_incluye_entrada boolean,
  p_activo          boolean,
  p_items           jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id     uuid := coalesce(p_id, gen_random_uuid());
  v_nombre text := trim(coalesce(p_nombre, ''));
  v_cat    uuid;
begin
  if not is_admin() then
    raise exception 'Solo el administrador puede configurar combos';
  end if;
  if v_nombre = '' then
    raise exception 'El combo necesita un nombre';
  end if;
  if p_precio is null or p_precio <= 0 then
    raise exception 'El precio del combo debe ser mayor a 0';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El combo necesita al menos un producto';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) i
     where coalesce((i->>'cantidad')::int, 0) not between 1 and 20
  ) then
    raise exception 'La cantidad de cada producto debe estar entre 1 y 20';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_items) i
      left join productos p on p.id = (i->>'producto_id')::uuid
     where p.id is null or p.combo_id is not null
  ) then
    raise exception 'Alguno de los productos no existe o es otro combo';
  end if;

  insert into combos (id, nombre, precio, incluye_entrada, activo)
  values (v_id, v_nombre, p_precio, coalesce(p_incluye_entrada, false), coalesce(p_activo, true))
  on conflict (id) do update
     set nombre          = excluded.nombre,
         precio          = excluded.precio,
         incluye_entrada = excluded.incluye_entrada,
         activo          = excluded.activo;

  delete from combo_productos where combo_id = v_id;
  insert into combo_productos (combo_id, producto_id, cantidad)
  select v_id, (i->>'producto_id')::uuid, sum((i->>'cantidad')::int)::int
    from jsonb_array_elements(p_items) i
   group by 2;

  -- Producto virtual del combo (mismo id), en la categoría "Combos"
  select id into v_cat from categorias_productos where nombre = 'Combos' limit 1;
  if v_cat is null then
    insert into categorias_productos (nombre) values ('Combos') returning id into v_cat;
  end if;

  insert into productos (id, categoria_id, nombre, precio, activo, combo_id)
  values (v_id, v_cat, 'Combo ' || v_nombre, p_precio, coalesce(p_activo, true), v_id)
  on conflict (id) do update
     set categoria_id = excluded.categoria_id,
         nombre       = excluded.nombre,
         precio       = excluded.precio,
         activo       = excluded.activo;

  return v_id;
end;
$$;

revoke all on function public.guardar_combo(uuid, text, numeric, boolean, boolean, jsonb) from public, anon;
grant execute on function public.guardar_combo(uuid, text, numeric, boolean, boolean, jsonb) to authenticated;


-- 4) calcular_compra con combos. Es tu versión actual + el bloque "Combos con entrada".
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
  v_uid         uuid := auth.uid();
  v_func        funciones%rowtype;
  v_inicio      timestamptz;
  v_calc        jsonb;
  v_total       numeric;
  v_credito     numeric := 0;
  v_aplicar     numeric := 0;
  v_combos      int;
  v_butacas     int;
  v_items       jsonb;
  v_tot_entr    numeric;
  v_sub_entr    numeric;
begin
  select * into v_func from funciones where id = p_funcion_id;
  if not found then
    raise exception 'La función no existe';
  end if;

  v_inicio := (v_func.fecha::date + v_func.hora_inicio::time) at time zone 'America/Argentina/Buenos_Aires';
  if v_inicio <= now() then
    raise exception 'Esta función ya comenzó, no se pueden comprar entradas';
  end if;

  v_calc := calcular_compra_base(p_funcion_id, p_sesion_id, p_productos);

  -- Combos con entrada incluida: por cada uno, la butaca más barata queda en $0
  select coalesce(sum((i->>'cantidad')::int), 0)::int
    into v_combos
    from jsonb_array_elements(v_calc->'productos') i
    join combos c on c.id = (i->>'producto_id')::uuid
   where c.incluye_entrada;

  if v_combos > 0 then
    v_butacas := jsonb_array_length(v_calc->'items');
    if v_combos > v_butacas then
      raise exception 'Cada combo incluye una entrada: elegiste % combos y solo % butacas', v_combos, v_butacas;
    end if;

    select jsonb_agg(
             case when t.rn <= v_combos
                  then jsonb_set(t.item, '{precio_final}', '0'::jsonb) || '{"en_combo": true}'::jsonb
                  else t.item
             end
             order by t.ord
           )
      into v_items
      from (
        select x.item,
               x.ord,
               row_number() over (order by (x.item->>'precio_final')::numeric, x.ord) as rn
          from jsonb_array_elements(v_calc->'items') with ordinality as x(item, ord)
      ) t;

    select coalesce(sum((i->>'precio_final')::numeric), 0),
           coalesce(sum(case when i->>'en_combo' = 'true' then 0 else (i->>'precio_unitario')::numeric end), 0)
      into v_tot_entr, v_sub_entr
      from jsonb_array_elements(v_items) i;

    v_calc := v_calc || jsonb_build_object(
      'items',          v_items,
      'total',          v_tot_entr + (v_calc->>'total_productos')::numeric,
      'subtotal',       v_sub_entr + (v_calc->>'total_productos')::numeric,
      'combo_entradas', v_combos
    );
  end if;

  v_total := (v_calc->>'total')::numeric;

  if v_uid is not null then
    select credito into v_credito from usuarios where id = v_uid;
    v_credito := coalesce(v_credito, 0);
    v_aplicar := least(v_credito, v_total);
  end if;

  return v_calc || jsonb_build_object(
    'credito_disponible', v_credito,
    'credito_aplicado',   v_aplicar,
    'a_pagar',            v_total - v_aplicar
  );
end;
$$;
