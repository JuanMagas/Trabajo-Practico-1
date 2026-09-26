import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';
import { Pelicula } from '../../models/pelicula';

@Injectable({ providedIn: 'root' })
export class PeliculasService {
  private supabase = inject(SupabaseClientService).client;

  async getAll(): Promise<Pelicula[]> {
    const { data } = await this.supabase.from('peliculas').select('*').order('titulo');
    return (data ?? []).map(this.mapDesdeDb);
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