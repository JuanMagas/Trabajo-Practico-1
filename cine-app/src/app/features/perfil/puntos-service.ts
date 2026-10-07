import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';

export interface RecompensaDisponible {
  id: string;
  tipo: 'entrada' | 'producto';
  nombre: string;
  puntosCosto: number;
}

export interface CanjeRealizado {
  id: string;
  codigo: string;
  nombre: string;
  puntosUsados: number;
  fecha: string;
  entregado: boolean;
}

@Injectable({ providedIn: 'root' })
export class PuntosService {
  private supabase = inject(SupabaseClientService).client;

  async recompensas(): Promise<RecompensaDisponible[]> {
    const { data, error } = await this.supabase
      .from('recompensas')
      .select('id, tipo, puntos_costo, productos(nombre)')
      .eq('activo', true)
      .order('puntos_costo');
    if (error) throw new Error(error.message);

    return (data ?? []).map((r: any) => ({
      id: r.id,
      tipo: r.tipo,
      nombre: r.tipo === 'entrada' ? 'Entrada gratis' : (r.productos?.nombre ?? 'Producto'),
      puntosCosto: r.puntos_costo,
    }));
  }

  // La RLS solo deja ver los canjes propios
  async misCanjes(): Promise<CanjeRealizado[]> {
    const { data, error } = await this.supabase
      .from('canjes_puntos')
      .select('id, codigo, puntos_usados, fecha, entregado_en, recompensas(tipo, productos(nombre))')
      .order('fecha', { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? []).map((c: any) => ({
      id: c.id,
      codigo: c.codigo,
      nombre: c.recompensas?.tipo === 'entrada' ? 'Entrada gratis' : (c.recompensas?.productos?.nombre ?? 'Producto'),
      puntosUsados: c.puntos_usados,
      fecha: c.fecha,
      entregado: !!c.entregado_en,
    }));
  }

  // Los puntos se descuentan en el servidor, en la misma transacción que el canje
  async canjear(recompensaId: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('canjear_recompensa', { p_recompensa_id: recompensaId });
    if (error) throw new Error(error.message);
    return data.codigo as string;
  }
}