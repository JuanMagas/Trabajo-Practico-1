import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';

export interface ResenaPublica {
  estrellas: number;
  comentario: string | null;
  fecha: string;
  autor: string; // "Nombre I."
}

export interface MiResena {
  estrellas: number;
  comentario: string | null;
}

@Injectable({ providedIn: 'root' })
export class ResenasService {
  private supabase = inject(SupabaseClientService).client;

  // Listado público: pasa por una función SQL que solo devuelve nombre e inicial del autor.
  async listar(peliculaId: string): Promise<ResenaPublica[]> {
    const { data } = await this.supabase.rpc('resenas_de_pelicula', { p_pelicula_id: peliculaId });
    return (data ?? []).map((r: any) => ({
      estrellas: r.estrellas,
      comentario: r.comentario,
      fecha: r.fecha,
      autor: r.autor,
    }));
  }

  async miResena(peliculaId: string, usuarioId: string): Promise<MiResena | null> {
    const { data } = await this.supabase
      .from('resenas')
      .select('estrellas, comentario')
      .eq('pelicula_id', peliculaId)
      .eq('usuario_id', usuarioId)
      .maybeSingle();
    return data ? { estrellas: data.estrellas, comentario: data.comentario } : null;
  }

  // Una reseña por persona y película: si ya existe, se actualiza (upsert sobre la restricción única).
  async guardar(
    peliculaId: string,
    usuarioId: string,
    estrellas: number,
    comentario: string | null
  ): Promise<{ error: string | null }> {
    const { error } = await this.supabase.from('resenas').upsert(
      {
        usuario_id: usuarioId,
        pelicula_id: peliculaId,
        estrellas,
        comentario,
        fecha: new Date().toISOString(),
      },
      { onConflict: 'usuario_id,pelicula_id' }
    );
    return { error: error?.message ?? null };
  }

  async eliminar(peliculaId: string, usuarioId: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase
      .from('resenas')
      .delete()
      .eq('pelicula_id', peliculaId)
      .eq('usuario_id', usuarioId);
    return { error: error?.message ?? null };
  }
}