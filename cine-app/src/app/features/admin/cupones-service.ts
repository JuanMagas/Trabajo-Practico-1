import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';
import { Cupon, TipoCupon } from '../../models/cupon';

export interface NuevoCupon {
  tipo: TipoCupon;
  porcentaje: number;
  edadMinima: number | null;
}

@Injectable({ providedIn: 'root' })
export class CuponesService {
  private supabase = inject(SupabaseClientService).client;

  async listar(): Promise<Cupon[]> {
    const { data, error } = await this.supabase
      .from('cupones')
      .select('id, tipo, porcentaje, edad_minima, activo')
      .order('porcentaje', { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? []).map((c: any) => ({
      id: c.id,
      tipo: c.tipo,
      porcentaje: Number(c.porcentaje),
      edadMinima: c.edad_minima,
      activo: c.activo,
    }));
  }

  async crear(cupon: NuevoCupon): Promise<void> {
    const { error } = await this.supabase.from('cupones').insert({
      tipo: cupon.tipo,
      porcentaje: cupon.porcentaje,
      edad_minima: cupon.tipo === 'segmentado-edad' ? cupon.edadMinima : null,
      activo: true,
    });
    if (error) throw new Error(error.message);
  }

  // .select('id') permite detectar un update rechazado por RLS (no da error, devuelve 0 filas)
  async actualizar(id: string, cambios: { porcentaje?: number; activo?: boolean }): Promise<void> {
    const fila: Record<string, unknown> = {};
    if (cambios.porcentaje !== undefined) fila['porcentaje'] = cambios.porcentaje;
    if (cambios.activo !== undefined) fila['activo'] = cambios.activo;

    const { data, error } = await this.supabase.from('cupones').update(fila).eq('id', id).select('id');
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error('No tenés permiso para modificar cupones');
  }
}
