import { Pipe, PipeTransform } from '@angular/core';

export type FormatoFecha = 'completa' | 'corta' | 'dia' | 'diaCorto' | 'mes';

@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(valor: string | null | undefined, formato: FormatoFecha = 'completa'): string {
    if (!valor) return '';
    const fecha = valor.slice(0, 10);
    const [y, m, d] = fecha.split('-');

    switch (formato) {
      case 'corta':
        return `${d}/${m}`;
      case 'dia':
        // "lunes 6 de octubre"
        return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
      case 'diaCorto':
        // "lun, 6 oct"
        return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
      case 'mes':
        // "octubre de 2026"
        return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', {
          month: 'long',
          year: 'numeric',
        });
      default:
        return `${d}/${m}/${y}`;
    }
  }
}