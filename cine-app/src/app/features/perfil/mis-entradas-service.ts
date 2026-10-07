import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';

export interface CompraResumen {
  codigoQr: string;
  estado: 'confirmada' | 'validada' | 'cancelada';
  total: number;
  creditoUsado: number;
  funcionId: string;
  pelicula: string;
  restriccionEdad: number | null;
  sala: number;
  fechaFuncion: string;
  horaInicio: string;
  formato: string;
  idioma: string;
  inicio: string;
  butacas: string | null;
  candyEntregado: boolean;
  productos: { nombre: string; cantidad: number }[];
  puedeCancelar: boolean;
}

export interface SaldoUsuario {
  credito: number;
  puntos: number;
}

@Injectable({ providedIn: 'root' })
export class MisEntradasService {
  private supabase = inject(SupabaseClientService).client;

  async listar(): Promise<CompraResumen[]> {
    const { data, error } = await this.supabase.rpc('mis_entradas');
    if (error) throw new Error(error.message);

    return (data as any[]).map((c) => ({
      codigoQr: c.codigo_qr,
      estado: c.estado,
      total: Number(c.total),
      creditoUsado: Number(c.credito_usado),
      funcionId: c.funcion_id,
      pelicula: c.pelicula,
      restriccionEdad: c.restriccion_edad,
      sala: c.sala,
      fechaFuncion: c.fecha_funcion,
      horaInicio: c.hora_inicio,
      formato: c.formato,
      idioma: c.idioma,
      inicio: c.inicio,
      butacas: c.butacas,
      candyEntregado: c.candy_entregado,
      productos: c.productos ?? [],
      puedeCancelar: c.puede_cancelar,
    }));
  }

  async saldo(): Promise<SaldoUsuario> {
    const { data: auth } = await this.supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return { credito: 0, puntos: 0 };

    const { data, error } = await this.supabase
      .from('usuarios')
      .select('credito, puntos_fidelidad')
      .eq('id', uid)
      .single();
    if (error) throw new Error(error.message);

    return { credito: Number(data.credito), puntos: data.puntos_fidelidad };
  }

  // Toda la validación (dueño, plazo de 2 h, estado) la hace el servidor
  async cancelar(codigo: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('cancelar_compra', { p_codigo: codigo });
    if (error) throw new Error(error.message);
    return Number(data.credito_devuelto);
  }
}