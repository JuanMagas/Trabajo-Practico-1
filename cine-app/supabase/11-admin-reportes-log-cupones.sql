-- ============================================================
-- 11 - ADMIN: reportes, consulta del log y ABM de cupones
-- Todas las funciones validan is_admin() en el servidor.
-- ============================================================

-- 1) Cupones: datos válidos y permiso de escritura solo para el admin
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cupones_porcentaje_valido') then
    alter table cupones
      add constraint cupones_porcentaje_valido
      check (porcentaje > 0 and porcentaje <= 100) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'cupones_edad_segun_tipo') then
    alter table cupones
      add constraint cupones_edad_segun_tipo
      check (
        (tipo = 'segmentado-edad' and edad_minima is not null and edad_minima > 0)
        or (tipo = 'primera-compra' and edad_minima is null)
      ) not valid;
  end if;
end $$;

alter table cupones enable row level security;

drop policy if exists "cupones_admin_total" on cupones;
create policy "cupones_admin_total" on cupones
  for all to authenticated
  using (is_admin()) with check (is_admin());


-- 2) Consulta del log de actividad (con nombre del usuario)
create or replace function public.log_admin(p_accion text, p_desde date, p_hasta date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c_zona constant text := 'America/Argentina/Buenos_Aires';
begin
  if not is_admin() then
    raise exception 'Solo administradores';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.fecha desc)
    from (
      select l.id,
             l.fecha,
             l.accion,
             l.detalle,
             trim(coalesce(u.nombre, '') || ' ' || coalesce(u.apellido, '')) as usuario
        from log_actividad l
        left join usuarios u on u.id = l.usuario_id
       where (p_accion is null or l.accion = p_accion)
         and (p_desde  is null or (l.fecha at time zone c_zona)::date >= p_desde)
         and (p_hasta  is null or (l.fecha at time zone c_zona)::date <= p_hasta)
       order by l.fecha desc
       limit 500
    ) x
  ), '[]'::jsonb);
end;
$$;


-- 3) Facturación por día (días sin ventas incluidos, en cero).
--    facturacion = lo efectivamente cobrado (total - crédito aplicado).
--    Las compras canceladas no cuentan.
create or replace function public.reporte_facturacion(p_desde date, p_hasta date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c_zona constant text := 'America/Argentina/Buenos_Aires';
begin
  if not is_admin() then
    raise exception 'Solo administradores';
  end if;
  if p_desde is null or p_hasta is null or p_desde > p_hasta then
    raise exception 'Rango de fechas inválido';
  end if;
  if p_hasta - p_desde > 366 then
    raise exception 'El rango máximo es de 366 días';
  end if;

  return coalesce((
    select jsonb_agg(
             jsonb_build_object(
               'dia',          d.dia,
               'compras',      coalesce(r.compras, 0),
               'entradas',     coalesce(r.entradas, 0),
               'facturacion',  coalesce(r.facturacion, 0),
               'credito_usado', coalesce(r.credito_usado, 0)
             )
             order by d.dia
           )
      from (select g::date as dia
              from generate_series(p_desde, p_hasta, interval '1 day') g) d
      left join (
        select (c.fecha at time zone c_zona)::date          as dia,
               count(*)                                     as compras,
               coalesce(sum(en.cant), 0)                    as entradas,
               sum(c.total - coalesce(c.credito_usado, 0))  as facturacion,
               sum(coalesce(c.credito_usado, 0))            as credito_usado
          from compras c
          left join lateral (
            select count(*) as cant from entradas e where e.compra_id = c.id
          ) en on true
         where c.estado <> 'cancelada'
         group by 1
      ) r on r.dia = d.dia
  ), '[]'::jsonb);
end;
$$;


-- 4) Top de películas por entradas vendidas ('semana' = últimos 7 días, 'mes' = últimos 30)
create or replace function public.reporte_peliculas_top(p_periodo text, p_cantidad int default 5)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c_zona constant text := 'America/Argentina/Buenos_Aires';
  v_hoy   date := (now() at time zone c_zona)::date;
  v_desde date;
begin
  if not is_admin() then
    raise exception 'Solo administradores';
  end if;
  if p_periodo not in ('semana', 'mes') then
    raise exception 'Período inválido';
  end if;

  v_desde := case when p_periodo = 'semana' then v_hoy - 6 else v_hoy - 29 end;

  return coalesce((
    select jsonb_agg(to_jsonb(t) order by t.entradas desc, t.titulo)
    from (
      select p.id,
             p.titulo,
             count(e.id)                         as entradas,
             coalesce(sum(e.precio_pagado), 0)   as recaudado
        from entradas e
        join compras c   on c.id = e.compra_id
        join funciones f on f.id = e.funcion_id
        join peliculas p on p.id = f.pelicula_id
       where c.estado <> 'cancelada'
         and (c.fecha at time zone c_zona)::date >= v_desde
       group by p.id, p.titulo
       order by count(e.id) desc, p.titulo
       limit greatest(p_cantidad, 1)
    ) t
  ), '[]'::jsonb);
end;
$$;


-- 5) Productos del candy más vendidos en un rango
create or replace function public.reporte_productos_top(p_desde date, p_hasta date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c_zona constant text := 'America/Argentina/Buenos_Aires';
begin
  if not is_admin() then
    raise exception 'Solo administradores';
  end if;
  if p_desde is null or p_hasta is null or p_desde > p_hasta then
    raise exception 'Rango de fechas inválido';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(t) order by t.cantidad desc, t.nombre)
    from (
      select pr.id,
             pr.nombre,
             sum(cp.cantidad)::int                      as cantidad,
             sum(cp.cantidad * cp.precio_unitario)      as recaudado
        from compra_productos cp
        join compras c    on c.id = cp.compra_id
        join productos pr on pr.id = cp.producto_id
       where c.estado <> 'cancelada'
         and (c.fecha at time zone c_zona)::date between p_desde and p_hasta
       group by pr.id, pr.nombre
       order by sum(cp.cantidad) desc, pr.nombre
       limit 10
    ) t
  ), '[]'::jsonb);
end;
$$;


-- 6) Solo usuarios logueados pueden llamarlas (y cada una exige is_admin())
revoke all on function public.log_admin(text, date, date)             from public, anon;
revoke all on function public.reporte_facturacion(date, date)         from public, anon;
revoke all on function public.reporte_peliculas_top(text, int)        from public, anon;
revoke all on function public.reporte_productos_top(date, date)       from public, anon;

grant execute on function public.log_admin(text, date, date)          to authenticated;
grant execute on function public.reporte_facturacion(date, date)      to authenticated;
grant execute on function public.reporte_peliculas_top(text, int)     to authenticated;
grant execute on function public.reporte_productos_top(date, date)    to authenticated;
