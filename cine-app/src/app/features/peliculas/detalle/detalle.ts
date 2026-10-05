import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PeliculasService } from '../peliculas-service';
import { FuncionesService } from '../../admin/funciones-service';
import { ResenasService, ResenaPublica } from '../resenas-service';
import { AuthService } from '../../../core/services/auth';
import { PeliculaCompleta } from '../../../models/pelicula-completa';
import { Funcion } from '../../../models/funcion';
import { esFutura, etiquetaDia } from '../../../shared/utils/fechas';

interface DiaFunciones {
  fecha: string;
  funciones: Funcion[];
}

@Component({
  selector: 'app-detalle',
  imports: [DecimalPipe, DatePipe, RouterLink],
  templateUrl: './detalle.html',
  styleUrl: './detalle.css',
})
export class Detalle implements OnInit {
  private route = inject(ActivatedRoute);
  private peliculasService = inject(PeliculasService);
  private funcionesService = inject(FuncionesService);
  private resenasService = inject(ResenasService);
  auth = inject(AuthService);

  private peliculaId = this.route.snapshot.paramMap.get('id')!;

  readonly etiquetaDia = etiquetaDia;
  readonly opcionesEstrellas = [1, 2, 3, 4, 5];

  cargando = signal(true);
  pelicula = signal<PeliculaCompleta | null>(null);
  funciones = signal<Funcion[]>([]);
  resenas = signal<ResenaPublica[]>([]);

  // formulario de mi reseña
  miEstrellas = signal(0);
  miComentario = signal('');
  tieneResena = signal(false);
  guardando = signal(false);
  errorResena = signal<string | null>(null);
  mensajeResena = signal<string | null>(null);

  // Funciones que todavía no empezaron, agrupadas por día
  funcionesPorDia = computed<DiaFunciones[]>(() => {
    const futuras = this.funciones()
      .filter((f) => f.peliculaId === this.peliculaId && esFutura(f.fecha, f.horaInicio))
      .sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio));

    const dias: DiaFunciones[] = [];
    for (const f of futuras) {
      const ultimo = dias[dias.length - 1];
      if (ultimo && ultimo.fecha === f.fecha) ultimo.funciones.push(f);
      else dias.push({ fecha: f.fecha, funciones: [f] });
    }
    return dias;
  });

  constructor() {
    // La sesión puede resolverse después de que la pantalla carga (F5): cuando
    // cambia el usuario, se vuelve a buscar su reseña.
    effect(() => {
      const userId = this.auth.currentUserId();
      untracked(() => this.cargarMiResena(userId));
    });
  }

  async ngOnInit() {
    const [pelicula, funciones, resenas] = await Promise.all([
      this.peliculasService.getCompletaById(this.peliculaId),
      this.funcionesService.getAll(),
      this.resenasService.listar(this.peliculaId),
    ]);
    this.pelicula.set(pelicula);
    this.funciones.set(funciones);
    this.resenas.set(resenas);
    this.cargando.set(false);
  }

  private async cargarMiResena(userId: string | null) {
    if (!userId) {
      this.miEstrellas.set(0);
      this.miComentario.set('');
      this.tieneResena.set(false);
      return;
    }
    const mia = await this.resenasService.miResena(this.peliculaId, userId);
    this.miEstrellas.set(mia?.estrellas ?? 0);
    this.miComentario.set(mia?.comentario ?? '');
    this.tieneResena.set(!!mia);
  }

  // Después de guardar o borrar, se refrescan el promedio y la lista pública
  private async recargarResenas() {
    const [pelicula, resenas] = await Promise.all([
      this.peliculasService.getCompletaById(this.peliculaId),
      this.resenasService.listar(this.peliculaId),
    ]);
    this.pelicula.set(pelicula);
    this.resenas.set(resenas);
  }

  estrellasTexto(n: number): string {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  onComentario(event: Event) {
    this.miComentario.set((event.target as HTMLTextAreaElement).value);
  }

  async guardarResena() {
    const userId = this.auth.currentUserId();
    if (!userId || this.guardando()) return;

    this.errorResena.set(null);
    this.mensajeResena.set(null);

    if (this.miEstrellas() < 1) {
      this.errorResena.set('Elegí de 1 a 5 estrellas');
      return;
    }

    this.guardando.set(true);
    const { error } = await this.resenasService.guardar(
      this.peliculaId,
      userId,
      this.miEstrellas(),
      this.miComentario().trim() || null
    );
    this.guardando.set(false);

    if (error) {
      this.errorResena.set('No se pudo guardar tu reseña');
      return;
    }

    this.tieneResena.set(true);
    this.mensajeResena.set('Reseña guardada');
    await this.recargarResenas();
  }

  async eliminarResena() {
    const userId = this.auth.currentUserId();
    if (!userId || this.guardando()) return;

    this.errorResena.set(null);
    this.mensajeResena.set(null);
    this.guardando.set(true);
    const { error } = await this.resenasService.eliminar(this.peliculaId, userId);
    this.guardando.set(false);

    if (error) {
      this.errorResena.set('No se pudo eliminar tu reseña');
      return;
    }

    this.miEstrellas.set(0);
    this.miComentario.set('');
    this.tieneResena.set(false);
    this.mensajeResena.set('Reseña eliminada');
    await this.recargarResenas();
  }
}