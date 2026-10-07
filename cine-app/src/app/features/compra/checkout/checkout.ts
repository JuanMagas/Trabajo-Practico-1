import { Component, OnDestroy, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ComprasService } from '../compras-service';
import { ButacasService } from '../butacas-service';
import { CarritoCandyService } from '../carrito-candy-service';
import { AuthService } from '../../../core/services/auth';
import { obtenerSesionCompraId } from '../../../shared/utils/sesion';
import { ResumenCompra } from '../../../models/resumen-compra';
import { VipHighlight } from '../../../shared/directivas/vip-highlight';

@Component({
  selector: 'app-checkout',
  imports: [DecimalPipe, VipHighlight],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private comprasService = inject(ComprasService);
  private butacasService = inject(ButacasService);
  private carrito = inject(CarritoCandyService);
  private auth = inject(AuthService);

  private funcionId = this.route.snapshot.paramMap.get('funcionId')!;
  private sesionId = obtenerSesionCompraId();

  // true cuando ya no hay que liberar las butacas al salir de la pantalla
  // (se pagó, o se volvió a otra pantalla que las sigue necesitando)
  private reservasResueltas = false;

  // Para detectar que el usuario cambió (login/logout) mientras se está en el checkout
  private usuarioPrevio = this.auth.currentUserId();

  cargando = signal(true);
  procesando = signal(false);
  errorMsg = signal<string | null>(null);
  resumen = signal<ResumenCompra | null>(null);
  advertenciaAceptada = signal(false);

  puedePagar = computed(() => {
    if (this.procesando()) return false;
    const r = this.resumen();
    if (!r) return false;
    return !r.requiereAdulto || this.advertenciaAceptada();
  });

  hayVip = computed(() => this.resumen()?.items.some((i) => i.tipo === 'vip') ?? false);

  constructor() {
    // Si cambia el usuario (por ej. se desloguea), el precio puede cambiar
    // (cupones, edad). Se recalcula el resumen.
    effect(() => {
      const id = this.auth.currentUserId();
      if (id === this.usuarioPrevio) return;
      this.usuarioPrevio = id;
      untracked(() => this.cargarResumen());
    });
  }

  ngOnInit() {
    this.cargarResumen();
  }

  private async cargarResumen() {
    this.cargando.set(true);
    this.errorMsg.set(null);

    const { resumen, error } = await this.comprasService.calcular(
      this.funcionId,
      this.sesionId,
      this.carrito.items(this.funcionId)
    );
    this.cargando.set(false);

    if (error || !resumen) {
      this.resumen.set(null);
      this.errorMsg.set(error ?? 'No se pudo calcular la compra');
      return;
    }
    this.resumen.set(resumen);
  }

  onAdvertencia(event: Event) {
    this.advertenciaAceptada.set((event.target as HTMLInputElement).checked);
  }

  // Si se sale del checkout sin pagar, las butacas vuelven a quedar libres
  ngOnDestroy() {
    if (!this.reservasResueltas) {
      this.butacasService.liberarTodasDeSesion(this.funcionId, this.sesionId);
    }
  }

  // Volver al candy bar: se conservan reservas y carrito para poder editar el pedido.
  volver() {
    this.reservasResueltas = true;
    this.router.navigate(['/compra', this.funcionId, 'candy']);
  }

  async pagar() {
    if (!this.puedePagar()) return;

    this.procesando.set(true);
    this.errorMsg.set(null);

    // El pago es simulado: no hay pasarela. La confirmación real (compra, entradas
    // y productos) la hace el servidor en una sola transacción.
    const { codigo, error } = await this.comprasService.confirmar(
      this.funcionId,
      this.sesionId,
      this.carrito.items(this.funcionId)
    );

    if (error || !codigo) {
      this.procesando.set(false);
      this.errorMsg.set(error ?? 'No se pudo confirmar la compra');
      return;
    }

    this.reservasResueltas = true; // el servidor ya borró las reservas
    this.carrito.limpiar();
    this.router.navigate(['/compra', this.funcionId, 'confirmacion'], {
      queryParams: { qr: codigo },
    });
  }
}