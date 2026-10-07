import { Directive, input } from '@angular/core';

// Uso: <li [appVipHighlight]="i.tipo">
// Resalta la fila cuando el tipo de butaca es VIP.
@Directive({
  selector: '[appVipHighlight]',
  host: {
    '[style.background]': "esVip() ? '#fff7e0' : null",
    '[style.border-left]': "esVip() ? '4px solid #c9a227' : null",
    '[style.padding-left]': "esVip() ? '0.5rem' : null",
  },
})
export class VipHighlight {
  appVipHighlight = input<string | null | undefined>();

  esVip() {
    return this.appVipHighlight() === 'vip';
  }
}