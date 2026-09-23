import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client';
import { Usuario } from '../../models/usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseClientService).client;

  async signUp(email: string, password: string, datosPerfil: Omit<Usuario, 'id' | 'email' | 'puntosFidelidad' | 'credito' | 'rol'>) {
    const { data, error } = await this.supabase.auth.signUp({ email, password });

    if (error || !data.user) {
      return { error };
    }

    const { error: errorPerfil } = await this.supabase.from('usuarios').insert({
      id: data.user.id,
      email,
      ...datosPerfil,
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