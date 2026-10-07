import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';
import { Producto } from '../../models/producto';

export interface CategoriaConProductos {
  id: string;
  nombre: string;
  productos: Producto[];
}

export interface DatosProducto {
  categoriaId: string;
  nombre: string;
  precio: number;
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private supabase = inject(SupabaseClientService).client;

    private mapProducto(p: any): Producto {
    return {
      id: p.id,
      categoriaId: p.categoria_id,
      nombre: p.nombre,
      precio: Number(p.precio),
      activo: p.activo,
      comboId: p.combo_id ?? null,
    };
  }

  // ---------- Público (candy bar): categorías con sus productos activos ----------
  // Los productos virtuales de los combos no se listan acá: se muestran en la sección "Combos".
  async obtenerCatalogo(): Promise<{ categorias: CategoriaConProductos[]; error: string | null }> {
    const { data, error } = await this.supabase
      .from('categorias_productos')
      .select('id, nombre, productos(id, categoria_id, nombre, precio, activo, combo_id)')
      .eq('productos.activo', true)
      .order('nombre');

    if (error) return { categorias: [], error: error.message };

    const categorias = (data ?? [])
      .map((c: any) => ({
        id: c.id,
        nombre: c.nombre,
        productos: (c.productos ?? [])
          .map((p: any) => this.mapProducto(p))
          .filter((p: Producto) => !p.comboId)
          .sort((a: Producto, b: Producto) => a.nombre.localeCompare(b.nombre)),
      }))
      .filter((c: CategoriaConProductos) => c.productos.length > 0); // no mostrar categorías vacías

    return { categorias, error: null };
  }

  // ---------- Admin ----------
  // Todas las categorías (también las vacías) con todos sus productos (también los dados de baja).
  // Los productos virtuales de los combos se ocultan: su precio se edita desde "Combos".
  async obtenerTodoAdmin(): Promise<{ categorias: CategoriaConProductos[]; error: string | null }> {
    const { data, error } = await this.supabase
      .from('categorias_productos')
      .select('id, nombre, productos(id, categoria_id, nombre, precio, activo, combo_id)')
      .order('nombre');

    if (error) return { categorias: [], error: error.message };

    const categorias = (data ?? [])
      .map((c: any) => {
        const todos = (c.productos ?? []).map((p: any) => this.mapProducto(p));
        return {
          id: c.id,
          nombre: c.nombre,
          soloCombos: todos.length > 0 && todos.every((p: Producto) => !!p.comboId),
          productos: todos
            .filter((p: Producto) => !p.comboId)
            .sort((a: Producto, b: Producto) => a.nombre.localeCompare(b.nombre)),
        };
      })
      .filter((c: any) => !c.soloCombos) // la categoría "Combos" no se gestiona acá
      .map(({ soloCombos, ...resto }: any) => resto as CategoriaConProductos);

    return { categorias, error: null };
  }

  async crearCategoria(nombre: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.from('categorias_productos').insert({ nombre });
    return { error: error?.message ?? null };
  }

  async crearProducto(datos: DatosProducto): Promise<{ error: string | null }> {
    const { error } = await this.supabase.from('productos').insert({
      categoria_id: datos.categoriaId,
      nombre: datos.nombre,
      precio: datos.precio,
    });
    return { error: error?.message ?? null };
  }

  async actualizarProducto(id: string, datos: DatosProducto): Promise<{ error: string | null }> {
    const { data, error } = await this.supabase
      .from('productos')
      .update({ categoria_id: datos.categoriaId, nombre: datos.nombre, precio: datos.precio })
      .eq('id', id)
      .select('id');

    return { error: this.resultadoEscritura(error?.message, data) };
  }

  // Baja lógica: el producto deja de verse en el candy bar, pero las compras viejas lo siguen referenciando.
  async cambiarActivo(id: string, activo: boolean): Promise<{ error: string | null }> {
    const { data, error } = await this.supabase
      .from('productos')
      .update({ activo })
      .eq('id', id)
      .select('id');

    return { error: this.resultadoEscritura(error?.message, data) };
  }

  // Cuando RLS deniega un update no hay error: simplemente se afectan 0 filas.
  // Se detecta pidiendo las filas afectadas.
  private resultadoEscritura(mensaje: string | undefined, filas: unknown[] | null): string | null {
    if (mensaje) return mensaje;
    if (!filas || filas.length === 0) return 'No se pudo guardar: sin permisos o el producto ya no existe';
    return null;
  }
}