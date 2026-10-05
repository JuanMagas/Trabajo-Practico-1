import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';
import { Pelicula } from '../../models/pelicula';
import { Genero } from '../../models/genero';
import { PeliculaCompleta } from '../../models/pelicula-completa';

@Injectable({ providedIn: 'root' })
export class PeliculasService {
  private supabase = inject(SupabaseClientService).client;

  async getAll(): Promise<Pelicula[]> {
    const { data } = await this.supabase.from('peliculas').select('*').order('titulo');
    return (data ?? []).map(this.mapDesdeDb);
  }

  async getGeneros(): Promise<Genero[]> {
    const { data } = await this.supabase.from('generos').select('id, nombre').order('nombre');
    return (data ?? []).map((g: any) => ({ id: g.id, nombre: g.nombre }));
  }

  // Todas las películas con géneros (un solo query con el join) y estadísticas (una función SQL).
  async getAllCompletas(): Promise<PeliculaCompleta[]> {
    const [peliculas, stats] = await Promise.all([
      this.supabase
        .from('peliculas')
        .select('*, pelicula_generos(generos(id, nombre))')
        .order('titulo'),
      this.cargarStats(),
    ]);

    return (peliculas.data ?? []).map((row: any) => this.armar(row, stats));
  }

  async getCompletaById(id: string): Promise<PeliculaCompleta | null> {
    const [peliculas, stats] = await Promise.all([
      this.supabase
        .from('peliculas')
        .select('*, pelicula_generos(generos(id, nombre))')
        .eq('id', id)
        .maybeSingle(),
      this.cargarStats(),
    ]);

    if (!peliculas.data) return null;
    return this.armar(peliculas.data, stats);
  }

  private async cargarStats(): Promise<Map<string, any>> {
    const { data } = await this.supabase.rpc('stats_peliculas');
    return new Map((data ?? []).map((s: any) => [s.pelicula_id, s]));
  }

  private armar(row: any, stats: Map<string, any>): PeliculaCompleta {
    const s = stats.get(row.id);
    return {
      ...this.mapDesdeDb(row),
      generos: (row.pelicula_generos ?? [])
        .map((pg: any) => pg.generos)
        .filter((g: any) => !!g)
        .map((g: any) => ({ id: g.id, nombre: g.nombre })),
      promedio: s?.promedio != null ? Number(s.promedio) : null,
      cantidadResenas: s?.cantidad_resenas ?? 0,
      entradasVendidas: s?.entradas_vendidas ?? 0,
    };
  }

  private mapDesdeDb(row: any): Pelicula {
    return {
      id: row.id,
      titulo: row.titulo,
      sinopsis: row.sinopsis,
      imagenUrl: row.imagen_url,
      duracionMinutos: row.duracion_minutos,
      restriccionEdad: row.restriccion_edad,
      estado: row.estado,
      fechaEstreno: row.fecha_estreno,
      createdAt: row.created_at,
    };
  }
}