-- ============================================================
-- 13 - El perfil se crea automáticamente al crearse el usuario de Auth
-- Registro atómico: si falla el insert del perfil, falla todo el signUp y no
-- queda un usuario en auth.users sin fila en `usuarios`.
-- Los datos llegan en raw_user_meta_data (options.data del signUp).
-- Solo se leen los campos de perfil: puntos, crédito y rol salen de los defaults
-- de la tabla, nunca de lo que mande el cliente.
-- jsonb_populate_record convierte cada valor al tipo real de la columna.
-- ============================================================
create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios
    (id, email, nombre, apellido, fecha_nacimiento, tipo_sangre, color_ojos, dias_vacaciones)
  select new.id,
         new.email,
         r.nombre,
         r.apellido,
         r.fecha_nacimiento,
         r.tipo_sangre,
         r.color_ojos,
         r.dias_vacaciones
    from jsonb_populate_record(null::public.usuarios, coalesce(new.raw_user_meta_data, '{}'::jsonb)) r;

  return new;
end;
$$;

drop trigger if exists trg_crear_perfil_usuario on auth.users;
create trigger trg_crear_perfil_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_usuario();
