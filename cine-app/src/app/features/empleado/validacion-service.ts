import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';

export interface ResultadoValidacion {
  pelicula: string;
  fechaFuncion: string;
  horaInicio: string;
  sala: string;
  formato: string;
  idioma: string;
  butacas: string;
  cantidad: number;
}

export interface ProductoEntregado {
  nombre: string;
  cantidad: number;
}

export interface CanjeEntregado {
  tipo: 'entrada' | 'producto';
  recompensa: string;
}

@Injectable({ providedIn: 'root' })
export class ValidacionService {
  private supabase = inject(SupabaseClientService).client;

  // Toda la lógica (estado, permisos, fecha, log) vive en la función SQL;
  // acá solo se llama y se traduce la respuesta.
  async validar(codigo: string): Promise<{ resultado: ResultadoValidacion | null; error: string | null }> {
    const { data, error } = await this.supabase.rpc('validar_entrada', { p_codigo: codigo.trim() });

    if (error) {
      return { resultado: null, error: error.message };
    }

    return {
      resultado: {
        pelicula: data.pelicula,
        fechaFuncion: data.fecha_funcion,
        horaInicio: data.hora_inicio,
        sala: data.sala,
        formato: data.formato,
        idioma: data.idioma,
        butacas: data.butacas,
        cantidad: data.cantidad,
      },
      error: null,
    };
  }

  // Entregar el candy es independiente de validar la entrada: cada uno "gasta" su parte del QR.
  async entregarCandy(codigo: string): Promise<{ productos: ProductoEntregado[] | null; error: string | null }> {
    const { data, error } = await this.supabase.rpc('entregar_candy', { p_codigo: codigo.trim() });

    if (error) {
      return { productos: null, error: error.message };
    }

    return {
      productos: (data.productos ?? []).map((p: any) => ({
        nombre: p.nombre,
        cantidad: Number(p.cantidad),
      })),
      error: null,
    };
  }

  // Un canje de puntos (entrada gratis o producto) se entrega una única vez.
  async entregarCanje(codigo: string): Promise<{ canje: CanjeEntregado | null; error: string | null }> {
    const { data, error } = await this.supabase.rpc('entregar_canje', { p_codigo: codigo.trim() });

    if (error) {
      return { canje: null, error: error.message };
    }

    return { canje: { tipo: data.tipo, recompensa: data.recompensa }, error: null };
  }
}