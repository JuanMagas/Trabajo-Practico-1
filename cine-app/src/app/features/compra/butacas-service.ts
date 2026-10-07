import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';

export interface ButacaOcupada {
  fila: string;
  columna: number;
}

@Injectable({ providedIn: 'root' })
export class ButacasService {
  private supabase = inject(SupabaseClientService).client;

  private readonly MINUTOS_RESERVA = 10;

  // Butacas no disponibles = ya vendidas (entradas) + reservadas por cualquier sesión (propia o ajena) mientras no hayan expirado
  async getOcupadas(funcionId: string, sesionIdPropia?: string): Promise<ButacaOcupada[]> {
    const [entradas, reservas] = await Promise.all([
      this.supabase.from('entradas').select('fila, columna').eq('funcion_id', funcionId),
      this.supabase
        .from('butacas_reservadas')
        .select('fila, columna, sesion_id')
        .eq('funcion_id', funcionId)
        .gt('expira_en', new Date().toISOString()),
    ]);

    const deEntradas = entradas.data ?? [];
    const deReservas = (reservas.data ?? [])
      .filter((r: any) => r.sesion_id !== sesionIdPropia)
      .map((r: any) => ({ fila: r.fila, columna: r.columna }));

    return [...deEntradas, ...deReservas];
  }

  // Intenta reservar butacas para esta sesión. Devuelve las que NO se pudieron reservar (porque alguien se adelantó justo antes).
  async reservar(
    funcionId: string,
    butacas: ButacaOcupada[],
    sesionId: string
  ): Promise<{ rechazadas: ButacaOcupada[] }> {
    const expiraEn = new Date(Date.now() + this.MINUTOS_RESERVA * 60 * 1000).toISOString();
    const rechazadas: ButacaOcupada[] = [];

    // Libera las reservas vencidas: si no, su fila bloquearía el insert de la nueva reserva
    await this.supabase.rpc('liberar_reservas_vencidas');

    for (const b of butacas) {
      const { error } = await this.supabase.from('butacas_reservadas').insert({
        funcion_id: funcionId,
        fila: b.fila,
        columna: b.columna,
        sesion_id: sesionId,
        expira_en: expiraEn,
      });

      if (error) {
        console.error(`[reservar] FALLÓ ${b.fila}${b.columna}:`, error.message, error);
        rechazadas.push(b);
      } else {
        console.log(`[reservar] OK ${b.fila}${b.columna}`);
      }
    }

    return { rechazadas };
  }

  async liberar(funcionId: string, butacas: ButacaOcupada[], sesionId: string) {
    for (const b of butacas) {
      await this.supabase
        .from('butacas_reservadas')
        .delete()
        .eq('funcion_id', funcionId)
        .eq('fila', b.fila)
        .eq('columna', b.columna)
        .eq('sesion_id', sesionId);
    }
  }

  async liberarTodasDeSesion(funcionId: string, sesionId: string) {
    await this.supabase
      .from('butacas_reservadas')
      .delete()
      .eq('funcion_id', funcionId)
      .eq('sesion_id', sesionId);
  }

  suscribirCambios(funcionId: string, onCambio: () => void) {
    const canal = this.supabase
      .channel(`butacas-funcion-${funcionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'butacas_reservadas', filter: `funcion_id=eq.${funcionId}` },
        () => onCambio()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'entradas', filter: `funcion_id=eq.${funcionId}` },
        () => onCambio()
      )
      .subscribe();

    return () => this.supabase.removeChannel(canal);
  }
}