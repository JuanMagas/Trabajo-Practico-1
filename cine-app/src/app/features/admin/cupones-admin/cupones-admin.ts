import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CuponesService } from '../cupones-service';
import { Cupon, TipoCupon } from '../../../models/cupon';
import { PrecioConDescuentoPipe } from '../../../shared/pipes/precio-con-descuento-pipe';

@Component({
  selector: 'app-cupones-admin',
  imports: [PrecioConDescuentoPipe],
  templateUrl: './cupones-admin.html',
  styleUrl: './cupones-admin.css',
})
export class CuponesAdmin implements OnInit {
  private service = inject(CuponesService);

  // Solo para la vista previa: el precio real lo calcula siempre el servidor
  readonly precioEjemplo = 5000;

  cupones = signal<Cupon[]>([]);
  error = signal<string | null>(null);
  guardando = signal(false);

  tipo = signal<TipoCupon>('primera-compra');
  porcentaje = signal<number | null>(null);
  edadMinima = signal<number | null>(null);

  puedeCrear = computed(() => {
    const pct = this.porcentaje() ?? 0;
    if (this.guardando() || !(pct > 0 && pct <= 100)) return false;
    return this.tipo() === 'primera-compra' || (this.edadMinima() ?? 0) > 0;
  });

  async ngOnInit() {
    await this.cargar();
  }

  private async cargar() {
    try {
      this.cupones.set(await this.service.listar());
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  valor(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  descripcion(c: Cupon): string {
    return c.tipo === 'primera-compra'
      ? 'Primera compra'
      : `Mayores de ${c.edadMinima} años`;
  }

  async crear() {
    if (!this.puedeCrear()) return;
    await this.ejecutar(async () => {
      await this.service.crear({
        tipo: this.tipo(),
        porcentaje: this.porcentaje()!,
        edadMinima: this.edadMinima(),
      });
      this.porcentaje.set(null);
      this.edadMinima.set(null);
    });
  }

  async cambiarPorcentaje(c: Cupon, event: Event) {
    const nuevo = Number(this.valor(event));
    if (!(nuevo > 0 && nuevo <= 100) || nuevo === c.porcentaje) {
      await this.cargar();
      return;
    }
    await this.ejecutar(() => this.service.actualizar(c.id, { porcentaje: nuevo }));
  }

  async alternarActivo(c: Cupon) {
    await this.ejecutar(() => this.service.actualizar(c.id, { activo: !c.activo }));
  }

  private async ejecutar(accion: () => Promise<void>) {
    this.guardando.set(true);
    this.error.set(null);
    try {
      await accion();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.guardando.set(false);
      await this.cargar();
    }
  }
}
