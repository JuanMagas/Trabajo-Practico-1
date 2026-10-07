import { Pipe, PipeTransform } from '@angular/core';

// 4 -> "★★★★☆" | null -> ""
@Pipe({ name: 'estrellas' })
export class EstrellasPipe implements PipeTransform {
  transform(valor: number | null | undefined, maximo = 5): string {
    if (!valor) return '';
    const llenas = Math.min(Math.max(Math.round(valor), 0), maximo);
    return '★'.repeat(llenas) + '☆'.repeat(maximo - llenas);
  }
}