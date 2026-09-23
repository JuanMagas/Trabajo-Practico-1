import { Injectable, inject, signal } from '@angular/core';
import { SupabaseClientService } from './supabase-client';
import { Usuario } from '../../models/usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseClientService).client;

  currentUserId = signal<string | null>(null);
  perfil = signal<Usuario | null>(null);

  constructor() {
    // Estado inicial al cargar la app
    this.supabase.auth.getUser().then(({ data }) => {
      this.actualizarEstado(data.user?.id ?? null);
    });

    // Se dispara automáticamente en cada login/logout, sin recargar la página
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.actualizarEstado(session?.user?.id ?? null);
    });
  }

  private async actualizarEstado(userId: string | null) {
    this.currentUserId.set(userId);

    if (!userId) {
      this.perfil.set(null);
      return;
    }

    const { data } = await this.getPerfil(userId);
    this.perfil.set(data as Usuario ?? null);
  }

  async signUp(email: string, password: string, datosPerfil: Omit<Usuario, 'id' | 'email' | 'puntosFidelidad' | 'credito' | 'rol'>) {
    const { data, error } = await this.supabase.auth.signUp({ email, password });

    if (error || !data.user) {
      return { error };
    }

    const { error: errorPerfil } = await this.supabase.from('usuarios').insert({
      id: data.user.id,
      email,
      nombre: datosPerfil.nombre,
      apellido: datosPerfil.apellido,
      fecha_nacimiento: datosPerfil.fechaNacimiento,
      tipo_sangre: datosPerfil.tipoSangre,
      color_ojos: datosPerfil.colorOjos,
      dias_vacaciones: datosPerfil.diasVacaciones,
    });

    return { error: errorPerfil ?? null };
  }

  signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  signOut() {
    return this.supabase.auth.signOut();
  }

  getUser() {
    return this.supabase.auth.getUser();
  }

  async getPerfil(userId: string) {
    return this.supabase.from('usuarios').select('*').eq('id', userId).single();
  }
}