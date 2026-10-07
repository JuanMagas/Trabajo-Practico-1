import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CombosService } from '../combos-service';
import { ProductosService } from '../productos-service';
import { Combo } from '../../../models/combo';
import { Producto } from '../../../models/producto';

@Component({
  selector: 'app-combos-admin',
  imports: [DecimalPipe],
  templateUrl: './combos-admin.html',
  styleUrl: './combos-admin.css',
})
export class CombosAdmin implements OnInit {
  private combosService = inject(CombosService);
  private productosService = inject(ProductosService);

  combos = signal<Combo[]>([]);
  productos = signal<Producto[]>([]);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);
  guardando = signal(false);

  // Formulario (sirve para crear y para editar)
  editandoId = signal<string | null>(null);
  nombre = signal('');
  precio = signal('');
  incluyeEntrada = signal(true);
  cantidades = signal<Record<string, number>>({}); // productoId -> cantidad (0 = no incluido)

  itemsElegidos = computed(() =>
    Object.entries(this.cantidades())
      .filter(([, cantidad]) => cantidad > 0)
      .map(([productoId, cantidad]) => ({ productoId, cantidad }))
  );

  // Solo para orientar al admin: el precio real lo guarda y cobra el servidor
  valorSeparado = computed(() => {
    const precios = new Map(this.productos().map(p => [p.id, p.precio]));
    return this.itemsElegidos().reduce((s, i) => s + (precios.get(i.productoId) ?? 0) * i.cantidad, 0);
  });

  puedeGuardar = computed(
    () =>
      !this.guardando() &&
      this.nombre().trim() !== '' &&
      Number(this.precio()) > 0 &&
      this.itemsElegidos().length > 0
  );

  async ngOnInit() {
    await this.cargar();
  }

  private async cargar() {
    try {
      const [combos, catalogo] = await Promise.all([
        this.combosService.listar(false),
        this.productosService.obtenerTodoAdmin(),
      ]);
      this.combos.set(combos);
      this.productos.set(
        catalogo.categorias.flatMap(c => c.productos).filter(p => p.activo !== false)
      );
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  valor(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  cantidadDe(productoId: string): number {
    return this.cantidades()[productoId] ?? 0;
  }

  cambiarCantidad(productoId: string, event: Event) {
    const n = Math.min(20, Math.max(0, Math.floor(Number(this.valor(event)) || 0)));
    this.cantidades.update(c => ({ ...c, [productoId]: n }));
  }

  editar(c: Combo) {
    this.error.set(null);
    this.mensaje.set(null);
    this.editandoId.set(c.id);
    this.nombre.set(c.nombre);
    this.precio.set(String(c.precio));
    this.incluyeEntrada.set(c.incluyeEntrada);
    this.cantidades.set(Object.fromEntries(c.items.map(i => [i.productoId, i.cantidad])));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  limpiar() {
    this.editandoId.set(null);
    this.nombre.set('');
    this.precio.set('');
    this.incluyeEntrada.set(true);
    this.cantidades.set({});
  }

  async guardar() {
    if (!this.puedeGuardar()) return;
    await this.ejecutar(
      {
        id: this.editandoId(),
        nombre: this.nombre().trim(),
        precio: Number(this.precio()),
        incluyeEntrada: this.incluyeEntrada(),
        activo: this.combos().find(c => c.id === this.editandoId())?.activo ?? true,
        items: this.itemsElegidos(),
      },
      this.editandoId() ? 'Combo actualizado' : 'Combo creado',
      true
    );
  }

  async alternarActivo(c: Combo) {
    await this.ejecutar(
      {
        id: c.id,
        nombre: c.nombre,
        precio: c.precio,
        incluyeEntrada: c.incluyeEntrada,
        activo: !c.activo,
        items: c.items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad })),
      },
      c.activo ? 'Combo desactivado' : 'Combo activado',
      false
    );
  }

  private async ejecutar(datos: Parameters<CombosService['guardar']>[0], ok: string, limpiarForm: boolean) {
    this.guardando.set(true);
    this.error.set(null);
    this.mensaje.set(null);
    try {
      await this.combosService.guardar(datos);
      this.mensaje.set(ok);
      if (limpiarForm) this.limpiar();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.guardando.set(false);
      await this.cargar();
    }
  }
}