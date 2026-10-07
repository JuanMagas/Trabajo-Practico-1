import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';

export interface FilaFacturacion {
  dia: string;
  compras: number;
  entradas: number;
  facturacion: number;
  creditoUsado: number;
}

// periodo = primer día de la semana o del mes
export interface PeliculaTop {
  periodo: string;
  titulo: string;
  entradas: number;
}

export interface ProductoTop {
  nombre: string;
  cantidad: number;
  importe: number;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private supabase = inject(SupabaseClientService).client;

  async facturacion(desde: string, hasta: string): Promise<FilaFacturacion[]> {
    const { data, error } = await this.supabase.rpc('reporte_facturacion', { p_desde: desde, p_hasta: hasta });
    if (error) throw new Error(error.message);

    return ((data ?? []) as any[]).map(f => ({
      dia: f.dia,
      compras: Number(f.compras),
      entradas: Number(f.entradas),
      facturacion: Number(f.facturacion),
      creditoUsado: Number(f.credito_usado),
    }));
  }

  // Top 5 de cada período; "cantidad" es cuántas semanas o meses hacia atrás (1 a 12)
  async peliculasTop(periodo: 'semana' | 'mes', cantidad = 4): Promise<PeliculaTop[]> {
    const { data, error } = await this.supabase.rpc('reporte_peliculas_top', {
      p_periodo: periodo,
      p_cantidad: cantidad,
    });
    if (error) throw new Error(error.message);

    return ((data ?? []) as any[]).map(p => ({
      periodo: p.periodo,
      titulo: p.titulo,
      entradas: Number(p.entradas),
    }));
  }

    async productosTop(desde: string, hasta: string): Promise<ProductoTop[]> {
    const { data, error } = await this.supabase.rpc('reporte_productos_top', { p_desde: desde, p_hasta: hasta });
    if (error) throw new Error(error.message);

    return ((data ?? []) as any[]).map(p => ({
      nombre: p.producto,
      cantidad: Number(p.cantidad),
      importe: Number(p.importe),
    }));
  }
}