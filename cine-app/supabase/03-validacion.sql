-- ============================================================
-- VALIDACIÓN DE ENTRADAS (empleado)
-- Una compra pasa de 'confirmada' a 'validada' una sola vez; después
-- el QR deja de funcionar. Todo en una función = una transacción.
-- ============================================================
create or replace function public.validar_entrada(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
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
  -- Solo personal (empleado o admin). Se verifica en el servidor, no en Angular.
  if v_uid is null or not is_staff() then
    raise exception 'No tenés permisos para validar entradas';
  end if;

  -- "for update" bloquea la fila: si dos empleados validan el mismo QR a la vez,
  -- el segundo espera y después lo encuentra ya validado.
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

revoke all on function public.validar_entrada(text) from public;
grant execute on function public.validar_entrada(text) to authenticated;
