import { Pipe, PipeTransform } from '@angular/core';

// ['Acción','Drama'] -> "Acción · Drama" (acepta strings u objetos con "nombre")
@Pipe({ name: 'generos' })
export class GenerosPipe implements PipeTransform {
  transform(generos: (string | { nombre: string })[] | null | undefined, max = 0): string {
    if (!generos?.length) return '';
    const nombres = generos.map((g) => (typeof g === 'string' ? g : g.nombre));
    if (max > 0 && nombres.length > max) {
      return `${nombres.slice(0, max).join(' · ')} +${nombres.length - max}`;
    }
    return nombres.join(' · ');
  }
}