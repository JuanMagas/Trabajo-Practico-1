import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';

export interface DatosPelicula {
  titulo: string;
  sinopsis: string;
  imagenUrl: string | null;
  duracionMinutos: number;
  restriccionEdad: number | null;
  estado: string;
  fechaEstreno: string; // YYYY-MM-DD
}

@Injectable({ providedIn: 'root' })
export class PeliculasAdminService {
  private supabase = inject(SupabaseClientService).client;

  // Crea o actualiza la película y deja sus géneros exactamente como se pidió
  // (se reemplazan las filas de pelicula_generos).
  async guardar(datos: DatosPelicula, generoIds: string[], id?: string): Promise<{ error: string | null }> {
    const fila = {
      titulo: datos.titulo,
      sinopsis: datos.sinopsis,
      imagen_url: datos.imagenUrl,
      duracion_minutos: datos.duracionMinutos,
      restriccion_edad: datos.restriccionEdad,
      estado: datos.estado,
      fecha_estreno: datos.fechaEstreno,
    };

    let peliculaId = id;

    if (id) {
      const { data, error } = await this.supabase
        .from('peliculas')
        .update(fila)
        .eq('id', id)
        .select('id');
      if (error) return { error: error.message };
      // Si RLS deniega el update no hay error: se afectan 0 filas
      if (!data || data.length === 0) return { error: 'No se pudo guardar: sin permisos o la película ya no existe' };
    } else {
      const { data, error } = await this.supabase
        .from('peliculas')
        .insert(fila)
        .select('id')
        .single();
      if (error || !data) return { error: error?.message ?? 'No se pudo crear la película' };
      peliculaId = data.id;
    }

    const borrado = await this.supabase.from('pelicula_generos').delete().eq('pelicula_id', peliculaId!);
    if (borrado.error) return { error: borrado.error.message };

    if (generoIds.length > 0) {
      const { error } = await this.supabase
        .from('pelicula_generos')
        .insert(generoIds.map((generoId) => ({ pelicula_id: peliculaId, genero_id: generoId })));
      if (error) return { error: error.message };
    }

    return { error: null };
  }

  async crearGenero(nombre: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.from('generos').insert({ nombre });
    return { error: error?.message ?? null };
  }
}