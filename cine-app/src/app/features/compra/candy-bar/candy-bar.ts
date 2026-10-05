import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoriaConProductos, ProductosService } from '../../admin/productos-service';
import { CarritoCandyService, MAX_POR_PRODUCTO } from '../carrito-candy-service';
import { ButacasService } from '../butacas-service';
import { obtenerSesionCompraId } from '../../../shared/utils/sesion';

@Component({
  selector: 'app-candy-bar',
  imports: [DecimalPipe],
  templateUrl: './candy-bar.html',
  styleUrl: './candy-bar.css',
})
export class CandyBar implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productosService = inject(ProductosService);
  private carrito = inject(CarritoCandyService);
  private butacasService = inject(ButacasService);

  private funcionId = this.route.snapshot.paramMap.get('funcionId')!;
  private sesionId = obtenerSesionCompraId();

  // true cuando se avanza al checkout: las reservas NO se liberan, el checkout las necesita
  private conservarReservas = false;

  readonly maximo = MAX_POR_PRODUCTO;

  cargando = signal(true);
  errorMsg = signal<string | null>(null);
  categorias = signal<CategoriaConProductos[]>([]);

  private precios = computed(() => {
    const mapa = new Map<string, number>();
    for (const c of this.categorias()) for (const p of c.productos) mapa.set(p.id, p.precio);
    return mapa;
  });

  cantidadTotal = computed(() =>
    this.carrito.items(this.funcionId).reduce((suma, i) => suma + i.cantidad, 0)
  );

  // Solo informativo: el total real lo calcula el servidor en el checkout.
  totalReferencia = computed(() =>
    this.carrito
      .items(this.funcionId)
      .reduce((suma, i) => suma + (this.precios().get(i.productoId) ?? 0) * i.cantidad, 0)
  );

  async ngOnInit() {
    const { categorias, error } = await this.productosService.obtenerCatalogo();
    this.cargando.set(false);
    if (error) {
      this.errorMsg.set('No se pudo cargar el candy bar');
      return;
    }
    this.categorias.set(categorias);
  }

  // Si se sale de la pantalla sin avanzar, las butacas vuelven a quedar libres
  ngOnDestroy() {
    if (!this.conservarReservas) {
      this.butacasService.liberarTodasDeSesion(this.funcionId, this.sesionId);
    }
  }

  @HostListener('window:beforeunload')
  liberarAlCerrarPestana() {
    this.butacasService.liberarTodasDeSesion(this.funcionId, this.sesionId);
  }

  cantidad(productoId: string): number {
    return this.carrito.cantidadDe(this.funcionId, productoId);
  }

  sumar(productoId: string) {
    this.carrito.cambiar(this.funcionId, productoId, 1);
  }

  restar(productoId: string) {
    this.carrito.cambiar(this.funcionId, productoId, -1);
  }

  continuar() {
    this.conservarReservas = true;
    this.router.navigate(['/compra', this.funcionId, 'checkout']);
  }

  // Volver a elegir butacas: se liberan las reservas (el mapa arranca vacío) y se descarta el carrito.
  async volver() {
    await this.butacasService.liberarTodasDeSesion(this.funcionId, this.sesionId);
    this.carrito.limpiar();
    this.router.navigate(['/compra', this.funcionId, 'butacas']);
  }
}