-- ============================================================
-- PELÍCULAS, GÉNEROS Y RESEÑAS
-- ============================================================

-- 1) Lectura pública del catálogo; escritura solo admin ------------------
drop policy if exists "peliculas_select_publico" on peliculas;
create policy "peliculas_select_publico" on peliculas
  for select to anon, authenticated using (true);

drop policy if exists "generos_select_publico" on generos;
create policy "generos_select_publico" on generos
  for select to anon, authenticated using (true);

drop policy if exists "pelicula_generos_select_publico" on pelicula_generos;
create policy "pelicula_generos_select_publico" on pelicula_generos
  for select to anon, authenticated using (true);

drop policy if exists "peliculas_admin_todo" on peliculas;
create policy "peliculas_admin_todo" on peliculas
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "generos_admin_todo" on generos;
create policy "generos_admin_todo" on generos
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "pelicula_generos_admin_todo" on pelicula_generos;
create policy "pelicula_generos_admin_todo" on pelicula_generos
  for all to authenticated using (is_admin()) with check (is_admin());


-- 2) Reseñas: una por persona y película, 1 a 5 estrellas, comentario corto
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'resenas_usuario_pelicula_unico') then
    alter table resenas add constraint resenas_usuario_pelicula_unico unique (usuario_id, pelicula_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'resenas_estrellas_rango') then
    alter table resenas add constraint resenas_estrellas_rango check (estrellas between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'resenas_comentario_corto') then
    alter table resenas add constraint resenas_comentario_corto
      check (comentario is null or char_length(comentario) <= 280);
  end if;
end $$;

-- Cada usuario ve y escribe SOLO su propia fila. El listado público de reseñas
-- pasa por una función (abajo) que no expone datos personales.
drop policy if exists "resenas_select_propia" on resenas;
create policy "resenas_select_propia" on resenas
  for select to authenticated using (usuario_id = auth.uid());

drop policy if exists "resenas_insert_propia" on resenas;
create policy "resenas_insert_propia" on resenas
  for insert to authenticated with check (usuario_id = auth.uid());

drop policy if exists "resenas_update_propia" on resenas;
create policy "resenas_update_propia" on resenas
  for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "resenas_delete_propia" on resenas;
create policy "resenas_delete_propia" on resenas
  for delete to authenticated using (usuario_id = auth.uid());


-- 3) Reseñas de una película, para cualquiera (también anónimos).
--    Devuelve solo "Nombre I." del autor: la tabla usuarios sigue privada.
create or replace function public.resenas_de_pelicula(p_pelicula_id uuid)
returns table (estrellas int, comentario text, fecha timestamptz, autor text)
language sql
stable
security definer
set search_path = public
as $$
  select r.estrellas, r.comentario, r.fecha,
         u.nombre || ' ' || left(u.apellido, 1) || '.'
    from resenas r
    join usuarios u on u.id = r.usuario_id
   where r.pelicula_id = p_pelicula_id
   order by r.fecha desc;
$$;


-- 4) Estadísticas por película: promedio, cantidad de reseñas y entradas vendidas
--    (las entradas de compras canceladas no cuentan). Sirve para el promedio
--    de estrellas y para el top 3 de más vendidas.
create or replace function public.stats_peliculas()
returns table (pelicula_id uuid, promedio numeric, cantidad_resenas int, entradas_vendidas int)
language sql
stable
security definer
set search_path = public
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


revoke all on function public.resenas_de_pelicula(uuid) from public;
revoke all on function public.stats_peliculas()          from public;
grant execute on function public.resenas_de_pelicula(uuid) to anon, authenticated;
grant execute on function public.stats_peliculas()          to anon, authenticated;


-- 5) Géneros iniciales (correr solo si la tabla está vacía)
-- insert into generos (nombre) values
--   ('Acción'), ('Aventura'), ('Animación'), ('Comedia'), ('Drama'),
--   ('Terror'), ('Suspenso'), ('Ciencia ficción'), ('Romance'), ('Documental');
