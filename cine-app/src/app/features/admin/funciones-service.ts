import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';
import { Funcion, Formato } from '../../models/funcion';
import { Idioma } from '../../models/pelicula';

interface NuevaFuncionInput {
  peliculaId: string;
  fecha: string;
  horaInicio: string;
  formato: Formato;
  idioma: Idioma;
  precio: number;
  precioPreventa: number | null;
  fechaFinPreventa: string | null;
}

@Injectable({ providedIn: 'root' })
export class FuncionesService {
  private supabase = inject(SupabaseClientService).client;

  private readonly BUFFER_MINUTOS = 30;

  async getAll(): Promise<Funcion[]> {
    const { data } = await this.supabase
      .from('funciones')
      .select('*')
      .order('fecha')
      .order('hora_inicio');

    return (data ?? []).map(this.mapDesdeDb);
  }

  async getPorSalaYFecha(salaId: string, fecha: string): Promise<Funcion[]> {
    const { data } = await this.supabase
      .from('funciones')
      .select('*')
      .eq('sala_id', salaId)
      .eq('fecha', fecha);

    return (data ?? []).map(this.mapDesdeDb);
  }

  private horaAMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }

  private minutosAHora(minutos: number): string {
    const h = Math.floor(minutos / 60) % 24;
    const m = minutos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private hayConflictoConBuffer(
    inicioA: number,
    finA: number,
    inicioB: number,
    finB: number,
    buffer: number
  ): boolean {
    return inicioB < finA + buffer && inicioA < finB + buffer;
  }

  async crearConAsignacionAutomatica(
    input: NuevaFuncionInput,
    duracionPelicula: number
  ): Promise<{ error: string | null; funcion?: Funcion }> {
    const inicioNueva = this.horaAMinutos(input.horaInicio);
    const finNueva = inicioNueva + duracionPelicula;

    // La base exige hora_fin > hora_inicio, así que una función no puede cruzar la medianoche
    if (finNueva >= 24 * 60) {
      const maxInicio = 24 * 60 - duracionPelicula - 1;
      return {
        error:
          maxInicio >= 0
            ? `La función terminaría después de las 00:00. Para esta película, el último inicio posible es a las ${this.minutosAHora(maxInicio)}.`
            : 'La película dura demasiado para entrar en un mismo día.',
      };
    }

    const horaFinReal = this.minutosAHora(finNueva);

    const { data: salas } = await this.supabase.from('salas').select('*').order('numero');
    if (!salas || salas.length === 0) {
      return { error: 'No hay salas creadas todavía' };
    }

    for (const sala of salas) {
      const funcionesDeLaSala = await this.getPorSalaYFecha(sala.id, input.fecha);

      const hayConflicto = funcionesDeLaSala.some((f) => {
        const inicioExistente = this.horaAMinutos(f.horaInicio);
        const finExistente = this.horaAMinutos(f.horaFin);
        return this.hayConflictoConBuffer(
          inicioNueva,
          finNueva,
          inicioExistente,
          finExistente,
          this.BUFFER_MINUTOS
        );
      });

      if (!hayConflicto) {
        const { data, error } = await this.supabase
          .from('funciones')
          .insert({
            pelicula_id: input.peliculaId,
            sala_id: sala.id,
            fecha: input.fecha,
            hora_inicio: input.horaInicio,
            hora_fin: horaFinReal,
            formato: input.formato,
            idioma: input.idioma,
            precio: input.precio,
            precio_preventa: input.precioPreventa,
            fecha_fin_preventa: input.fechaFinPreventa,
          })
          .select()
          .single();

        if (error) return { error: `No se pudo guardar la función: ${error.message}` };
        return { error: null, funcion: this.mapDesdeDb(data) };
      }
    }

    return { error: 'No hay ninguna sala libre en ese horario' };
  }

  private mapDesdeDb(row: any): Funcion {
    return {
      id: row.id,
      peliculaId: row.pelicula_id,
      salaId: row.sala_id,
      fecha: row.fecha,
      horaInicio: row.hora_inicio,
      horaFin: row.hora_fin,
      formato: row.formato,
      idioma: row.idioma,
      precio: row.precio,
      precioPreventa: row.precio_preventa,
      fechaFinPreventa: row.fecha_fin_preventa,
    };
  }
}