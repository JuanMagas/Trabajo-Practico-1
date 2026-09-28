import { Component, OnInit, signal, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../peliculas-service';
import { FuncionesService } from '../../admin/funciones-service';
import { Pelicula } from '../../../models/pelicula';
import { Funcion } from '../../../models/funcion';

@Component({
  selector: 'app-listado',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink],
  templateUrl: './listado.html',
  styleUrl: './listado.css',
})
export class Listado implements OnInit {
  private peliculasService = inject(PeliculasService);
  private funcionesService = inject(FuncionesService);

  peliculas = signal<Pelicula[]>([]);
  funciones = signal<Funcion[]>([]);

  async ngOnInit() {
    const [todasLasPeliculas, todasLasFunciones] = await Promise.all([
      this.peliculasService.getAll(),
      this.funcionesService.getAll(),
    ]);

    this.peliculas.set(todasLasPeliculas.filter((p) => p.estado === 'cartelera'));
    this.funciones.set(todasLasFunciones);
  }

  funcionesDe(peliculaId: string): Funcion[] {
    return this.funciones().filter((f) => f.peliculaId === peliculaId);
  }
}