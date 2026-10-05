import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';
import { Producto } from '../../models/producto';

export interface CategoriaConProductos {
  id: string;
  nombre: string;
  productos: Producto[];
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private supabase = inject(SupabaseClientService).client;

  // Una sola consulta: categorías con sus productos activos adentro.
  async obtenerCatalogo(): Promise<{ categorias: CategoriaConProductos[]; error: string | null }> {
    const { data, error } = await this.supabase
      .from('categorias_productos')
      .select('id, nombre, productos(id, categoria_id, nombre, precio, activo)')
      .eq('productos.activo', true)
      .order('nombre');

    if (error) return { categorias: [], error: error.message };

    const categorias = (data ?? [])
      .map((c: any) => ({
        id: c.id,
        nombre: c.nombre,
        productos: (c.productos ?? [])
          .map((p: any): Producto => ({
            id: p.id,
            categoriaId: p.categoria_id,
            nombre: p.nombre,
            precio: Number(p.precio),
          }))
          .sort((a: Producto, b: Producto) => a.nombre.localeCompare(b.nombre)),
      }))
      .filter((c: CategoriaConProductos) => c.productos.length > 0); // no mostrar categorías vacías

    return { categorias, error: null };
  }
}