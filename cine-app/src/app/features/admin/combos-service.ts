import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';
import { Combo } from '../../models/combo';

export interface DatosCombo {
  id: string | null;
  nombre: string;
  precio: number;
  incluyeEntrada: boolean;
  activo: boolean;
  items: { productoId: string; cantidad: number }[];
}

@Injectable({ providedIn: 'root' })
export class CombosService {
  private supabase = inject(SupabaseClientService).client;

  // soloActivos = true para el candy bar; el admin los ve todos (la RLS lo permite)
  async listar(soloActivos: boolean): Promise<Combo[]> {
    let consulta = this.supabase
      .from('combos')
      .select('id, nombre, precio, incluye_entrada, activo, combo_productos(cantidad, productos(id, nombre, precio))')
      .order('precio');
    if (soloActivos) consulta = consulta.eq('activo', true);

    const { data, error } = await consulta;
    if (error) throw new Error(error.message);

    return (data ?? []).map((c: any) => {
      const items = (c.combo_productos ?? [])
        .filter((cp: any) => cp.productos)
        .map((cp: any) => ({
          productoId: cp.productos.id,
          nombre: cp.productos.nombre,
          cantidad: cp.cantidad,
          precio: Number(cp.productos.precio),
        }));

      return {
        id: c.id,
        nombre: c.nombre,
        precio: Number(c.precio),
        incluyeEntrada: c.incluye_entrada,
        activo: c.activo,
        items: items.map((i: any) => ({ productoId: i.productoId, nombre: i.nombre, cantidad: i.cantidad })),
        valorSeparado: items.reduce((s: number, i: any) => s + i.precio * i.cantidad, 0),
      } as Combo;
    });
  }

  // Todo se valida y guarda en una función SQL (solo admin): combo + productos + producto virtual
  async guardar(datos: DatosCombo): Promise<void> {
    const { error } = await this.supabase.rpc('guardar_combo', {
      p_id: datos.id,
      p_nombre: datos.nombre,
      p_precio: datos.precio,
      p_incluye_entrada: datos.incluyeEntrada,
      p_activo: datos.activo,
      p_items: datos.items.map(i => ({ producto_id: i.productoId, cantidad: i.cantidad })),
    });
    if (error) throw new Error(error.message);
  }
}