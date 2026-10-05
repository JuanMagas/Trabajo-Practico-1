import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../peliculas-service';
import { FuncionesService } from '../../admin/funciones-service';
import { PeliculaCompleta } from '../../../models/pelicula-completa';
import { Funcion } from '../../../models/funcion';
import { esFutura, etiquetaDiaCorto } from '../../../shared/utils/fechas';

// "Acción" y "accion" deben coincidir al buscar
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

@Component({
  selector: 'app-listado',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './listado.html',
  styleUrl: './listado.css',
})
export class Listado implements OnInit {
  private peliculasService = inject(PeliculasService);
  private funcionesService = inject(FuncionesService);

  readonly maxFunciones = 4; // más que eso va en el detalle: evita pantallas larguísimas
  readonly etiquetaDiaCorto = etiquetaDiaCorto;

  cargando = signal(true);
  peliculas = signal<PeliculaCompleta[]>([]);
  funciones = signal<Funcion[]>([]);

  busqueda = signal('');
  generoSeleccionado = signal<string | null>(null);

  // Cartelera ordenada por entradas vendidas (de más a menos) y, a igualdad, por título.
  // Las 3 primeras con ventas son el "top 3" y quedan arriba.
  private ranking = computed(() =>
    this.peliculas()
      .filter((p) => p.estado === 'cartelera')
      .sort((a, b) => b.entradasVendidas - a.entradasVendidas || a.titulo.localeCompare(b.titulo))
  );

  private topIds = computed(() =>
    this.ranking()
      .filter((p) => p.entradasVendidas > 0)
      .slice(0, 3)
      .map((p) => p.id)
  );

  // Solo géneros que realmente tienen alguna película en cartelera
  generosDisponibles = computed(() => {
    const mapa = new Map<string, string>();
    for (const p of this.ranking()) for (const g of p.generos) mapa.set(g.id, g.nombre);
    return [...mapa.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  visibles = computed(() => {
    const texto = normalizar(this.busqueda());
    const genero = this.generoSeleccionado();

    return this.ranking().filter((p) => {
      const coincideTexto = !texto || normalizar(p.titulo).includes(texto);
      const coincideGenero = !genero || p.generos.some((g) => g.id === genero);
      return coincideTexto && coincideGenero;
    });
  });

  // Funciones que todavía no empezaron, por película y en orden cronológico
  private proximasPorPelicula = computed(() => {
    const mapa = new Map<string, Funcion[]>();
    const futuras = this.funciones()
      .filter((f) => esFutura(f.fecha, f.horaInicio))
      .sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio));

    for (const f of futuras) {
      const lista = mapa.get(f.peliculaId) ?? [];
      lista.push(f);
      mapa.set(f.peliculaId, lista);
    }
    return mapa;
  });

  hayFiltros = computed(() => this.busqueda().trim() !== '' || this.generoSeleccionado() !== null);

  async ngOnInit() {
    const [peliculas, funciones] = await Promise.all([
      this.peliculasService.getAllCompletas(),
      this.funcionesService.getAll(),
    ]);
    this.peliculas.set(peliculas);
    this.funciones.set(funciones);
    this.cargando.set(false);
  }

  valor(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  elegirGenero(id: string | null) {
    this.generoSeleccionado.set(this.generoSeleccionado() === id ? null : id);
  }

  limpiarFiltros() {
    this.busqueda.set('');
    this.generoSeleccionado.set(null);
  }

  puesto(peliculaId: string): number {
    return this.topIds().indexOf(peliculaId) + 1; // 0 si no está en el top 3
  }

  proximas(peliculaId: string): Funcion[] {
    return this.proximasPorPelicula().get(peliculaId) ?? [];
  }
}