import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client';
import { Sala } from '../../models/sala';

@Injectable({ providedIn: 'root' })
export class SalasService {
  private supabase = inject(SupabaseClientService).client;

  getAll() {
    return this.supabase.from('salas').select('*').order('numero');
  }

  create(numero: number) {
    return this.supabase.from('salas').insert({ numero }).select().single();
  }

  delete(id: string) {
    return this.supabase.from('salas').delete().eq('id', id);
  }
}