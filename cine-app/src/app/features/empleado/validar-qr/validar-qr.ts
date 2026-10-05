import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { ValidacionService, ResultadoValidacion, ProductoEntregado } from '../validacion-service';

@Component({
  selector: 'app-validar-qr',
  imports: [],
  templateUrl: './validar-qr.html',
  styleUrl: './validar-qr.css',
})
export class ValidarQr {
  private validacionService = inject(ValidacionService);

  private campo = viewChild<ElementRef<HTMLInputElement>>('campo');

  codigo = signal('');
  procesando = signal(false);
  resultado = signal<ResultadoValidacion | null>(null);
  entrega = signal<ProductoEntregado[] | null>(null);
  errorMsg = signal<string | null>(null);

  puedeActuar = computed(() => this.codigo().trim().length > 0 && !this.procesando());

  onCodigo(event: Event) {
    this.codigo.set((event.target as HTMLInputElement).value);
  }

  // Enter (o el lector) dispara la validación de la entrada
  validarEntrada() {
    return this.ejecutar(async () => {
      const { resultado, error } = await this.validacionService.validar(this.codigo());
      if (error || !resultado) {
        this.errorMsg.set(error ?? 'No se pudo validar la entrada');
      } else {
        this.resultado.set(resultado);
      }
    });
  }

  entregarCandy() {
    return this.ejecutar(async () => {
      const { productos, error } = await this.validacionService.entregarCandy(this.codigo());
      if (error || !productos) {
        this.errorMsg.set(error ?? 'No se pudo registrar la entrega');
      } else {
        this.entrega.set(productos);
      }
    });
  }

  private async ejecutar(accion: () => Promise<void>) {
    if (!this.puedeActuar()) return;

    this.procesando.set(true);
    this.resultado.set(null);
    this.entrega.set(null);
    this.errorMsg.set(null);

    await accion();

    this.procesando.set(false);

    // Queda listo para la próxima lectura (lector o tipeo)
    this.codigo.set('');
    const input = this.campo()?.nativeElement;
    if (input) {
      input.value = '';
      input.focus();
    }
  }
}