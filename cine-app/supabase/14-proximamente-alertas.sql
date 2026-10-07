-- ============================================================
-- 14 - Próximamente: venta abierta 7 días antes del estreno + alertas
-- ============================================================

-- 1) ¿Está abierta la venta de esta película? (desde 7 días antes del estreno)
create or replace function public.venta_abierta(p_pelicula_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (now() at time zone 'America/Argentina/Buenos_Aires')::date >= p.fecha_estreno - 7
       from peliculas p
      where p.id = p_pelicula_id),
    false
  );
$$;

revoke all on function public.venta_abierta(uuid) from public;
grant execute on function public.venta_abierta(uuid) to anon, authenticated;


-- 2) El servidor no deja vender entradas antes de que abra la venta
create or replace function public.validar_venta_abierta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pelicula uuid;
begin
  select pelicula_id into v_pelicula from funciones where id = new.funcion_id;

  if not venta_abierta(v_pelicula) then
    raise exception 'La venta de entradas de esta película todavía no está abierta';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validar_venta_abierta on entradas;
create trigger trg_validar_venta_abierta
  before insert on entradas
  for each row execute function public.validar_venta_abierta();


-- 3) Alertas de "avisame cuando haya entradas"
create table if not exists alertas_pelicula (
  usuario_id  uuid not null references usuarios(id) on delete cascade,
  pelicula_id uuid not null references peliculas(id) on delete cascade,
  creada_en   timestamptz not null default now(),
  avisada_en  timestamptz,
  primary key (usuario_id, pelicula_id)
);

alter table alertas_pelicula enable row level security;

drop policy if exists "alertas_ver_propias" on alertas_pelicula;
create policy "alertas_ver_propias" on alertas_pelicula
  for select to authenticated using (usuario_id = auth.uid());

drop policy if exists "alertas_crear_propias" on alertas_pelicula;
create policy "alertas_crear_propias" on alertas_pelicula
  for insert to authenticated with check (usuario_id = auth.uid());

drop policy if exists "alertas_borrar_propias" on alertas_pelicula;
create policy "alertas_borrar_propias" on alertas_pelicula
  for delete to authenticated using (usuario_id = auth.uid());


-- 4) Alertas del usuario que ya se pueden cumplir y todavía no avisó:
--    venta abierta + al menos una función futura.
create or replace function public.mis_alertas_disponibles()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('pelicula_id', p.id, 'titulo', p.titulo) order by p.titulo),
    '[]'::jsonb
  )
  from alertas_pelicula a
  join peliculas p on p.id = a.pelicula_id
  where a.usuario_id = auth.uid()
    and a.avisada_en is null
    and venta_abierta(p.id)
    and exists (
      select 1
        from funciones f
       where f.pelicula_id = p.id
         and (f.fecha + f.hora_inicio) > (now() at time zone 'America/Argentina/Buenos_Aires')
    );
$$;

create or replace function public.marcar_alerta_avisada(p_pelicula_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update alertas_pelicula
     set avisada_en = now()
   where usuario_id = auth.uid()
     and pelicula_id = p_pelicula_id
     and avisada_en is null;
$$;

revoke all on function public.mis_alertas_disponibles()        from public, anon;
revoke all on function public.marcar_alerta_avisada(uuid)      from public, anon;
grant execute on function public.mis_alertas_disponibles()     to authenticated;
grant execute on function public.marcar_alerta_avisada(uuid)   to authenticated;
