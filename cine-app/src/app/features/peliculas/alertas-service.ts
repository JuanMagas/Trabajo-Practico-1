import { Injectable, effect, inject, signal } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';
import { AuthService } from '../../core/services/auth';

export interface AlertaDisponible {
  peliculaId: string;
  titulo: string;
}

@Injectable({ providedIn: 'root' })
export class AlertasService {
  private supabase = inject(SupabaseClientService).client;
  private auth = inject(AuthService);

  // Alertas ya cumplidas (hay entradas) que el usuario todavía no vio: alimentan la campanita del navbar
  avisos = signal<AlertaDisponible[]>([]);

  constructor() {
    // Se recarga solo al loguearse y se vacía al salir
    effect(() => {
      if (this.auth.currentUserId()) this.cargarAvisos();
      else this.avisos.set([]);
    });
  }

  async cargarAvisos(): Promise<void> {
    const { data, error } = await this.supabase.rpc('mis_alertas_disponibles');
    if (error) {
      console.error('[alertas]', error.message);
      return;
    }
    this.avisos.set(
      ((data ?? []) as any[]).map(a => ({ peliculaId: a.pelicula_id, titulo: a.titulo }))
    );
  }

  // Ids de las películas en las que el usuario activó la alerta (la RLS devuelve solo las suyas)
  async misAlertas(): Promise<Set<string>> {
    const { data, error } = await this.supabase.from('alertas_pelicula').select('pelicula_id');
    if (error) throw new Error(error.message);
    return new Set((data ?? []).map((a: any) => a.pelicula_id as string));
  }

  async activar(peliculaId: string): Promise<void> {
    const usuarioId = this.auth.currentUserId();
    if (!usuarioId) throw new Error('Tenés que iniciar sesión para activar alertas');

    const { error } = await this.supabase
      .from('alertas_pelicula')
      .insert({ usuario_id: usuarioId, pelicula_id: peliculaId });
    // 23505 = ya la tenía activada: no es un error para el usuario
    if (error && error.code !== '23505') throw new Error(error.message);
  }

  async desactivar(peliculaId: string): Promise<void> {
    const { error } = await this.supabase
      .from('alertas_pelicula')
      .delete()
      .eq('pelicula_id', peliculaId);
    if (error) throw new Error(error.message);
  }

  async marcarAvisada(peliculaId: string): Promise<void> {
    this.avisos.update(lista => lista.filter(a => a.peliculaId !== peliculaId));
    await this.supabase.rpc('marcar_alerta_avisada', { p_pelicula_id: peliculaId });
  }
}