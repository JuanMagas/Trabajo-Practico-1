import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HistorialService, PeliculaVista } from '../historial-service';
import { EstrellasPipe } from '../../../shared/pipes/estrellas-pipe';

@Component({
  selector: 'app-mis-peliculas',
  imports: [RouterLink, DatePipe, EstrellasPipe],
  templateUrl: './mis-peliculas.html',
  styleUrl: './mis-peliculas.css',
})
export class MisPeliculas implements OnInit {
  private service = inject(HistorialService);

  peliculas = signal<PeliculaVista[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  async ngOnInit() {
    try {
      this.peliculas.set(await this.service.peliculasVistas());
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }
}