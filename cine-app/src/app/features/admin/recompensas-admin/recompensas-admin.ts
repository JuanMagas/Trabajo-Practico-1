import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ProductoOpcion, RecompensaAdmin, RecompensasService } from '../recompensas-service';

@Component({
  selector: 'app-recompensas-admin',
  imports: [],
  templateUrl: './recompensas-admin.html',
  styleUrl: './recompensas-admin.css',
})
export class RecompensasAdmin implements OnInit {
  private service = inject(RecompensasService);

  recompensas = signal<RecompensaAdmin[]>([]);
  productos = signal<ProductoOpcion[]>([]);
  error = signal<string | null>(null);
  guardando = signal(false);

  // formulario de alta
  tipo = signal<'entrada' | 'producto'>('entrada');
  productoId = signal('');
  puntos = signal<number | null>(null);

  // edición del costo: se guarda al salir del campo
  puedeCrear = computed(
    () =>
      !this.guardando() &&
      (this.puntos() ?? 0) > 0 &&
      (this.tipo() === 'entrada' || this.productoId() !== '')
  );

  async ngOnInit() {
    await this.cargar();
  }

  private async cargar() {
    try {
      const [recompensas, productos] = await Promise.all([this.service.listar(), this.service.productos()]);
      this.recompensas.set(recompensas);
      this.productos.set(productos);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  valor(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  async crear() {
    if (!this.puedeCrear()) return;
    await this.ejecutar(async () => {
      await this.service.crear(this.tipo(), this.productoId() || null, this.puntos()!);
      this.puntos.set(null);
      this.productoId.set('');
    });
  }

  async cambiarPuntos(r: RecompensaAdmin, event: Event) {
    const nuevo = Number(this.valor(event));
    if (!Number.isInteger(nuevo) || nuevo <= 0 || nuevo === r.puntosCosto) {
      await this.cargar();
      return;
    }
    await this.ejecutar(() => this.service.actualizar(r.id, { puntosCosto: nuevo }));
  }

  async alternarActivo(r: RecompensaAdmin) {
    await this.ejecutar(() => this.service.actualizar(r.id, { activo: !r.activo }));
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