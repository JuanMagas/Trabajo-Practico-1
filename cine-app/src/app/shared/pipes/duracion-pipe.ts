import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'duracion',
})
export class DuracionPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
