-- Log automático de funciones (sin tocar Angular)
create or replace function public.log_crear_funcion()
returns trigger
language plpgsql
security definer
set search_path = public
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

drop trigger if exists trg_log_crear_funcion on funciones;
create trigger trg_log_crear_funcion
  after insert on funciones
  for each row execute function public.log_crear_funcion();


create or replace function public.log_cambio_precio_funcion()
returns trigger
language plpgsql
security definer
set search_path = public
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

drop trigger if exists trg_log_cambio_precio_funcion on funciones;
create trigger trg_log_cambio_precio_funcion
  after update of precio, precio_preventa on funciones
  for each row execute function public.log_cambio_precio_funcion();
