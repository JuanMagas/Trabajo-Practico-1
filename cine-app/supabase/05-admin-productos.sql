-- ============================================================
-- ADMIN DE PRODUCTOS: permisos de escritura + log de cambios de precio
-- ============================================================

-- 1) Solo el admin escribe (y ve también los productos dados de baja).
--    Las políticas "for all" incluyen select; se suman a la de lectura pública.
drop policy if exists "productos_admin_todo" on productos;
create policy "productos_admin_todo" on productos
  for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "categorias_productos_admin_todo" on categorias_productos;
create policy "categorias_productos_admin_todo" on categorias_productos
  for all to authenticated
  using (is_admin()) with check (is_admin());

-- 2) El precio no puede ser negativo (la base es la última defensa, no Angular)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'productos_precio_positivo') then
    alter table productos add constraint productos_precio_positivo check (precio >= 0);
  end if;
end $$;

-- 3) Log automático: cada cambio de precio queda registrado con el admin que lo hizo.
--    Es un trigger: no depende de que la pantalla se acuerde de registrar nada.
--    Si el cambio se hace desde el SQL Editor (sin usuario de la app) no se registra,
--    porque log_actividad.usuario_id es obligatorio.
create or replace function public.log_cambio_precio_producto()
returns trigger
language plpgsql
security definer
set search_path = public
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

drop trigger if exists trg_log_cambio_precio_producto on productos;
create trigger trg_log_cambio_precio_producto
  after update of precio on productos
  for each row execute function public.log_cambio_precio_producto();
