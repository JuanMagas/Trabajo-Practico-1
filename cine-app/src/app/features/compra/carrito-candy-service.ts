import { Injectable, signal } from '@angular/core';
import { ItemPedido } from '../../models/producto';

export const MAX_POR_PRODUCTO = 20; // mismo tope que valida el servidor

// Guarda en memoria lo que el usuario eligió del candy bar entre pantallas
// (candy -> checkout). Está atado a una función: si empieza otra compra,
// el carrito anterior no se arrastra.
@Injectable({ providedIn: 'root' })
export class CarritoCandyService {
  private funcionActual = signal<string | null>(null);
  private cantidades = signal<Record<string, number>>({});

  items(funcionId: string): ItemPedido[] {
    if (this.funcionActual() !== funcionId) return [];
    return Object.entries(this.cantidades())
      .filter(([, cantidad]) => cantidad > 0)
      .map(([productoId, cantidad]) => ({ productoId, cantidad }));
  }

  cantidadDe(funcionId: string, productoId: string): number {
    if (this.funcionActual() !== funcionId) return 0;
    return this.cantidades()[productoId] ?? 0;
  }

  cambiar(funcionId: string, productoId: string, delta: number) {
    if (this.funcionActual() !== funcionId) {
      this.funcionActual.set(funcionId);
      this.cantidades.set({});
    }
    const nueva = Math.min(
      MAX_POR_PRODUCTO,
      Math.max(0, (this.cantidades()[productoId] ?? 0) + delta)
    );
    this.cantidades.update((c) => ({ ...c, [productoId]: nueva }));
  }

  limpiar() {
    this.funcionActual.set(null);
    this.cantidades.set({});
  }
}