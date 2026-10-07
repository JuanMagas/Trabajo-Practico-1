import { Pipe, PipeTransform } from '@angular/core';

// Solo para mostrar una vista previa (por ejemplo, en el ABM de cupones).
// El precio que se cobra siempre lo calcula el servidor.
@Pipe({ name: 'precioConDescuento' })
export class PrecioConDescuentoPipe implements PipeTransform {
  transform(precio: number | null | undefined, porcentaje: number | null | undefined): number {
    if (precio == null) return 0;
    const pct = Math.min(Math.max(porcentaje ?? 0, 0), 100);
    return Math.round(precio * (1 - pct / 100) * 100) / 100;
  }
}