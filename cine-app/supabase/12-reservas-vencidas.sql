-- ============================================================
-- 12 - Barrido de reservas de butacas vencidas
-- Las reservas duran 10 minutos (expira_en). Esta función borra las vencidas
-- para que esas butacas vuelvan a poder reservarse.
-- Es SECURITY DEFINER porque un cliente anónimo no puede borrar filas ajenas,
-- y solo toca filas que ya expiraron.
-- ============================================================
create or replace function public.liberar_reservas_vencidas()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_borradas int;
begin
  delete from butacas_reservadas where expira_en <= now();
  get diagnostics v_borradas = row_count;
  return v_borradas;
end;
$$;

revoke all on function public.liberar_reservas_vencidas() from public;
grant execute on function public.liberar_reservas_vencidas() to anon, authenticated;

-- Opcional (barrido automático cada minuto, aunque nadie esté comprando):
-- 1) Activá la extensión pg_cron en Supabase: Database -> Extensions.
-- 2) Corré:
-- select cron.schedule('limpiar-reservas', '* * * * *', $$select public.liberar_reservas_vencidas()$$);
