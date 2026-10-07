import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';

export interface PeliculaVista {
  peliculaId: string;
  titulo: string;
  imagenUrl: string | null;
  fechaFuncion: string;
  estrellas: number | null;
}

export interface MiResena {
  id: string;
  peliculaId: string;
  titulo: string;
  imagenUrl: string | null;
  estrellas: number;
  comentario: string | null;
  fecha: string;
}

@Injectable({ providedIn: 'root' })
export class HistorialService {
  private supabase = inject(SupabaseClientService).client;

  async peliculasVistas(): Promise<PeliculaVista[]> {
    const { data, error } = await this.supabase.rpc('mis_peliculas');
    if (error) throw new Error(error.message);

    return (data as any[]).map((p) => ({
      peliculaId: p.pelicula_id,
      titulo: p.titulo,
      imagenUrl: p.imagen_url,
      fechaFuncion: p.fecha_funcion,
      estrellas: p.estrellas,
    }));
  }

  // La RLS de resenas solo deja ver las propias
  async misResenas(): Promise<MiResena[]> {
    const { data, error } = await this.supabase
      .from('resenas')
      .select('id, pelicula_id, estrellas, comentario, fecha, peliculas(titulo, imagen_url)')
      .order('fecha', { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? []).map((r: any) => ({
      id: r.id,
      peliculaId: r.pelicula_id,
      titulo: r.peliculas?.titulo ?? 'Película',
      imagenUrl: r.peliculas?.imagen_url ?? null,
      estrellas: r.estrellas,
      comentario: r.comentario,
      fecha: r.fecha,
    }));
  }

  // .select('id') detecta un update rechazado por RLS (devuelve 0 filas, sin error)
  async actualizarResena(id: string, estrellas: number, comentario: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('resenas')
      .update({ estrellas, comentario: comentario.trim() || null })
      .eq('id', id)
      .select('id');
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error('No se pudo modificar la reseña');
  }

  async eliminarResena(id: string): Promise<void> {
    const { data, error } = await this.supabase.from('resenas').delete().eq('id', id).select('id');
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error('No se pudo eliminar la reseña');
  }
}