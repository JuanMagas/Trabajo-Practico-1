import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';
import { AccionLog, LogActividad } from '../../models/log-actividad';

@Injectable({ providedIn: 'root' })
export class LogService {
  private supabase = inject(SupabaseClientService).client;

  // El servidor comprueba que quien llama sea admin y devuelve máximo 500 filas
  async listar(accion: AccionLog | null, desde: string | null, hasta: string | null): Promise<LogActividad[]> {
    const { data, error } = await this.supabase.rpc('log_admin', {
      p_accion: accion,
      p_desde: desde || null,
      p_hasta: hasta || null,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as LogActividad[];
  }
}
