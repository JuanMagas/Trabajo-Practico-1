import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HistorialService, MiResena } from '../historial-service';
import { EstrellasPipe } from '../../../shared/pipes/estrellas-pipe';

@Component({
  selector: 'app-mis-resenas',
  imports: [RouterLink, DatePipe, EstrellasPipe],
  templateUrl: './mis-resenas.html',
  styleUrl: './mis-resenas.css',
})
export class MisResenas implements OnInit {
  private service = inject(HistorialService);

  resenas = signal<MiResena[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  guardando = signal(false);

  readonly valores = [1, 2, 3, 4, 5];

  // reseña que se está editando, con sus valores provisorios
  editandoId = signal<string | null>(null);
  editEstrellas = signal(0);
  editComentario = signal('');

  // reseña esperando confirmación para borrarse
  borrandoId = signal<string | null>(null);

  async ngOnInit() {
    await this.cargar();
  }

  private async cargar() {
    try {
      this.resenas.set(await this.service.misResenas());
      this.error.set(null);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }

  editar(r: MiResena) {
    this.borrandoId.set(null);
    this.editandoId.set(r.id);
    this.editEstrellas.set(r.estrellas);
    this.editComentario.set(r.comentario ?? '');
  }

  cancelarEdicion() {
    this.editandoId.set(null);
  }

  onComentario(event: Event) {
    this.editComentario.set((event.target as HTMLTextAreaElement).value);
  }

  async guardar(r: MiResena) {
    if (this.editEstrellas() < 1 || this.guardando()) return;
    await this.ejecutar(async () => {
      await this.service.actualizarResena(r.id, this.editEstrellas(), this.editComentario());
      this.editandoId.set(null);
    });
  }

  async eliminar(r: MiResena) {
    await this.ejecutar(async () => {
      await this.service.eliminarResena(r.id);
      this.borrandoId.set(null);
    });
  }

  private async ejecutar(accion: () => Promise<void>) {
    this.guardando.set(true);
    this.error.set(null);
    try {
      await accion();
      await this.cargar();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.guardando.set(false);
    }
  }
}