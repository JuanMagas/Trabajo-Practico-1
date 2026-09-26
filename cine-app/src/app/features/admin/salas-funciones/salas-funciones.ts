import { Component, OnInit, signal, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { SalasService } from '../salas-service';
import { FuncionesService } from '../funciones-service';
import { PeliculasService } from '../../peliculas/peliculas-service';
import { Sala } from '../../../models/sala';
import { Funcion, Formato } from '../../../models/funcion';
import { Pelicula, Idioma } from '../../../models/pelicula';

@Component({
  selector: 'app-salas-funciones',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './salas-funciones.html',
  styleUrl: './salas-funciones.css',
})
export class SalasFunciones implements OnInit {
  private salasService = inject(SalasService);
  private funcionesService = inject(FuncionesService);
  private peliculasService = inject(PeliculasService);

  // --- Salas ---
  salas = signal<Sala[]>([]);
  nuevoNumero = signal<number | null>(null);
  errorSala = signal<string | null>(null);
  cargandoSala = signal(false);

  // --- Funciones ---
  funciones = signal<Funcion[]>([]);
  peliculas = signal<Pelicula[]>([]);
  errorFuncion = signal<string | null>(null);
  cargandoFuncion = signal(false);

  peliculaSeleccionada = signal<string>('');
  fecha = signal<string>('');
  horaInicio = signal<string>('');
  formato = signal<Formato>('2D');
  idioma = signal<Idioma>('castellano');
  precio = signal<number | null>(null);

  ngOnInit() {
    this.cargarSalas();
    this.cargarFunciones();
    this.cargarPeliculas();
  }

  // --- Salas ---
  async cargarSalas() {
    const { data } = await this.salasService.getAll();
    this.salas.set((data as Sala[]) ?? []);
  }

  async agregarSala() {
    this.errorSala.set(null);
    const numero = this.nuevoNumero();

    if (!numero || numero <= 0) {
      this.errorSala.set('Ingresá un número de sala válido');
      return;
    }
    if (this.salas().some((s) => s.numero === numero)) {
      this.errorSala.set('Ya existe una sala con ese número');
      return;
    }

    this.cargandoSala.set(true);
    const { error } = await this.salasService.create(numero);
    this.cargandoSala.set(false);

    if (error) {
      this.errorSala.set('No se pudo crear la sala');
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

  // --- Funciones ---
  async cargarFunciones() {
    const data = await this.funcionesService.getAll();
    this.funciones.set(data);
  }

  async cargarPeliculas() {
    const data = await this.peliculasService.getAll();
    this.peliculas.set(data);
  }

  tituloPelicula(peliculaId: string): string {
    return this.peliculas().find((p) => p.id === peliculaId)?.titulo ?? '(desconocida)';
  }

  numeroSala(salaId: string): number | string {
    return this.salas().find((s) => s.id === salaId)?.numero ?? '?';
  }

  async agregarFuncion() {
    this.errorFuncion.set(null);

    const peliculaId = this.peliculaSeleccionada();
    const fecha = this.fecha();
    const horaInicio = this.horaInicio();
    const precio = this.precio();

    if (!peliculaId || !fecha || !horaInicio || !precio || precio <= 0) {
      this.errorFuncion.set('Completá todos los campos correctamente');
      return;
    }

    const pelicula = this.peliculas().find((p) => p.id === peliculaId);
    if (!pelicula) {
      this.errorFuncion.set('Película no encontrada');
      return;
    }

    this.cargandoFuncion.set(true);
    const { error } = await this.funcionesService.crearConAsignacionAutomatica(
      {
        peliculaId,
        fecha,
        horaInicio,
        formato: this.formato(),
        idioma: this.idioma(),
        precio,
        precioPreventa: null,
        fechaFinPreventa: null,
      },
      pelicula.duracionMinutos
    );
    this.cargandoFuncion.set(false);

    if (error) {
      this.errorFuncion.set(error);
      return;
    }

    this.peliculaSeleccionada.set('');
    this.fecha.set('');
    this.horaInicio.set('');
    this.precio.set(null);
    this.cargarFunciones();
  }

  actualizarPelicula(event: Event) {
    this.peliculaSeleccionada.set((event.target as HTMLSelectElement).value);
  }
  actualizarFecha(event: Event) {
    this.fecha.set((event.target as HTMLInputElement).value);
  }
  actualizarHoraInicio(event: Event) {
    this.horaInicio.set((event.target as HTMLInputElement).value);
  }
  actualizarFormato(event: Event) {
    this.formato.set((event.target as HTMLSelectElement).value as Formato);
  }
  actualizarIdioma(event: Event) {
    this.idioma.set((event.target as HTMLSelectElement).value as Idioma);
  }
  actualizarPrecio(event: Event) {
    const valor = (event.target as HTMLInputElement).value;
    this.precio.set(valor ? Number(valor) : null);
  }
}