import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';

export interface RecompensaAdmin {
  id: string;
  tipo: 'entrada' | 'producto';
  nombre: string;
  puntosCosto: number;
  activo: boolean;
}

export interface ProductoOpcion {
  id: string;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class RecompensasService {
  private supabase = inject(SupabaseClientService).client;

  async listar(): Promise<RecompensaAdmin[]> {
    const { data, error } = await this.supabase
      .from('recompensas')
      .select('id, tipo, puntos_costo, activo, productos(nombre)')
      .order('puntos_costo');
    if (error) throw new Error(error.message);

    return (data ?? []).map((r: any) => ({
      id: r.id,
      tipo: r.tipo,
      nombre: r.tipo === 'entrada' ? 'Entrada gratis' : (r.productos?.nombre ?? 'Producto'),
      puntosCosto: r.puntos_costo,
      activo: r.activo,
    }));
  }

  async productos(): Promise<ProductoOpcion[]> {
    const { data, error } = await this.supabase
      .from('productos')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre');
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async crear(tipo: 'entrada' | 'producto', productoId: string | null, puntosCosto: number): Promise<void> {
    const { error } = await this.supabase.from('recompensas').insert({
      tipo,
      producto_id: tipo === 'producto' ? productoId : null,
      puntos_costo: puntosCosto,
    });
    if (error) throw new Error(error.message);
  }

  // .select('id') permite detectar un update rechazado por RLS (no da error, devuelve 0 filas)
  async actualizar(id: string, cambios: { puntosCosto?: number; activo?: boolean }): Promise<void> {
    const fila: Record<string, unknown> = {};
    if (cambios.puntosCosto !== undefined) fila['puntos_costo'] = cambios.puntosCosto;
    if (cambios.activo !== undefined) fila['activo'] = cambios.activo;

    const { data, error } = await this.supabase.from('recompensas').update(fila).eq('id', id).select('id');
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error('No tenés permiso para modificar recompensas');
  }
}