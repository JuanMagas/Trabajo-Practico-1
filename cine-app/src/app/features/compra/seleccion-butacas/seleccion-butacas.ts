import { Component, OnInit, OnDestroy, signal, inject, HostListener } from '@angular/core';
import { NgIf } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MapaButacas } from '../../../shared/componentes/mapa-butacas/mapa-butacas';
import { ButacasService, ButacaOcupada } from '../butacas-service';
import { obtenerSesionCompraId } from '../../../shared/utils/sesion';
import { Butaca } from '../../../models/butaca';

@Component({
  selector: 'app-seleccion-butacas',
  standalone: true,
  imports: [MapaButacas, NgIf],
  templateUrl: './seleccion-butacas.html',
  styleUrl: './seleccion-butacas.css',
})
export class SeleccionButacas implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private butacasService = inject(ButacasService);

  private funcionId = this.route.snapshot.paramMap.get('funcionId')!;
  private sesionId = obtenerSesionCompraId();
  private desuscribir: (() => void) | null = null;
  private seleccionPrevia: Butaca[] = [];

  ocupadas = signal<ButacaOcupada[]>([]);
  rechazadas = signal<ButacaOcupada[]>([]);
  seleccion = signal<Butaca[]>([]);
  errorMsg = signal<string | null>(null);

  async ngOnInit() {
    await this.cargarOcupadas();
    this.desuscribir = this.butacasService.suscribirCambios(this.funcionId, () => this.cargarOcupadas());
  }

  ngOnDestroy() {
    this.desuscribir?.();
    this.butacasService.liberarTodasDeSesion(this.funcionId, this.sesionId);
  }

  @HostListener('window:beforeunload')
  liberarAlCerrarPestana() {
    this.butacasService.liberarTodasDeSesion(this.funcionId, this.sesionId);
  }

  private async cargarOcupadas() {
  const data = await this.butacasService.getOcupadas(this.funcionId, this.sesionId);
  console.log('[cargarOcupadas] sesionId propia:', this.sesionId, '| ocupadas recibidas:', data);
  this.ocupadas.set(data);
}

  async onSeleccionCambio(nuevaSeleccion: Butaca[]) {
    this.errorMsg.set(null);

    const clave = (b: { fila: string; columna: number }) => `${b.fila}-${b.columna}`;
    const previasClaves = new Set(this.seleccionPrevia.map(clave));
    const nuevasClaves = new Set(nuevaSeleccion.map(clave));

    const agregadas = nuevaSeleccion.filter((b) => !previasClaves.has(clave(b)));
    const quitadas = this.seleccionPrevia.filter((b) => !nuevasClaves.has(clave(b)));

    console.log('[onSeleccionCambio] agregadas:', agregadas, '| quitadas:', quitadas);

    this.seleccionPrevia = nuevaSeleccion;
    this.seleccion.set(nuevaSeleccion);

    if (quitadas.length > 0) {
      await this.butacasService.liberar(this.funcionId, quitadas, this.sesionId);
    }

    if (agregadas.length > 0) {
      const { rechazadas } = await this.butacasService.reservar(this.funcionId, agregadas, this.sesionId);
      console.log('[onSeleccionCambio] rechazadas:', rechazadas);

      if (rechazadas.length > 0) {
        this.errorMsg.set('Alguien reservó una de tus butacas justo antes que vos. Elegí otra.');
        this.rechazadas.set(rechazadas);
        this.seleccionPrevia = this.seleccionPrevia.filter(
          (b) => !rechazadas.some((r) => r.fila === b.fila && r.columna === b.columna)
        );
        this.seleccion.set(this.seleccionPrevia);
      }

      await this.cargarOcupadas();
    }
  }
}