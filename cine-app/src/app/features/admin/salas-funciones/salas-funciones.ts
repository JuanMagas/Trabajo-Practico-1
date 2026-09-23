import { Component, OnInit, signal, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { SalasService } from '../salas-service';
import { Sala } from '../../../models/sala';

@Component({
  selector: 'app-salas-funciones',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './salas-funciones.html',
  styleUrl: './salas-funciones.css',
})
export class SalasFunciones implements OnInit {
  private salasService = inject(SalasService);

  salas = signal<Sala[]>([]);
  nuevoNumero = signal<number | null>(null);
  errorMsg = signal<string | null>(null);
  cargando = signal(false);

  ngOnInit() {
    this.cargarSalas();
  }

  async cargarSalas() {
    const { data } = await this.salasService.getAll();
    this.salas.set((data as Sala[]) ?? []);
  }

  async agregarSala() {
    this.errorMsg.set(null);
    const numero = this.nuevoNumero();

    if (!numero || numero <= 0) {
      this.errorMsg.set('Ingresá un número de sala válido');
      return;
    }

    if (this.salas().some(s => s.numero === numero)) {
      this.errorMsg.set('Ya existe una sala con ese número');
      return;
    }

    this.cargando.set(true);
    const { error } = await this.salasService.create(numero);
    this.cargando.set(false);

    if (error) {
      this.errorMsg.set('No se pudo crear la sala');
      return;
    }

    this.nuevoNumero.set(null);
    this.cargarSalas();
  }

  async eliminarSala(id: string) {
    await this.salasService.delete(id);
    this.cargarSalas();
  }

  actualizarNumero(event: Event) {
    const valor = (event.target as HTMLInputElement).value;
    this.nuevoNumero.set(valor ? Number(valor) : null);
  }
}