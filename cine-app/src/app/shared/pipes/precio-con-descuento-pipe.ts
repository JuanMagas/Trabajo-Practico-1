import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'precioConDescuento',
})
export class PrecioConDescuentoPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
