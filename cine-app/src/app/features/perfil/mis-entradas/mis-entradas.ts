import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CompraResumen, MisEntradasService, SaldoUsuario } from '../mis-entradas-service';

type Pestana = 'proximas' | 'historial';

@Component({
  selector: 'app-mis-entradas',
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './mis-entradas.html',
  styleUrl: './mis-entradas.css',
})
export class MisEntradas implements OnInit {
  private service = inject(MisEntradasService);

  compras = signal<CompraResumen[]>([]);
  saldo = signal<SaldoUsuario>({ credito: 0, puntos: 0 });
  pestana = signal<Pestana>('proximas');
  cargando = signal(true);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);

  // código de la compra que está esperando confirmación de cancelación
  confirmando = signal<string | null>(null);
  cancelando = signal(false);

  proximas = computed(() => this.compras().filter((c) => this.esProxima(c)));
  historial = computed(() => this.compras().filter((c) => !this.esProxima(c)));
  visibles = computed(() => (this.pestana() === 'proximas' ? this.proximas() : this.historial()));

  async ngOnInit() {
    await this.cargar();
  }

  private esProxima(c: CompraResumen): boolean {
    return c.estado === 'confirmada' && new Date(c.inicio).getTime() > Date.now();
  }

  private async cargar() {
    this.cargando.set(true);
    try {
      const [compras, saldo] = await Promise.all([this.service.listar(), this.service.saldo()]);
      this.compras.set(compras);
      this.saldo.set(saldo);
      this.error.set(null);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }

  fechaHora(c: CompraResumen): string {
    const [y, m, d] = c.fechaFuncion.slice(0, 10).split('-');
    return `${d}/${m}/${y} · ${c.horaInicio.slice(0, 5)} hs`;
  }

  etiquetaEstado(c: CompraResumen): string {
    if (c.estado === 'cancelada') return 'Cancelada';
    if (c.estado === 'validada') return 'Usada';
    return this.esProxima(c) ? 'Confirmada' : 'Vencida';
  }

  pedirCancelar(codigo: string) {
    this.aviso.set(null);
    this.confirmando.set(codigo);
  }

  descartarCancelar() {
    this.confirmando.set(null);
  }

  async confirmarCancelar(c: CompraResumen) {
    this.cancelando.set(true);
    this.error.set(null);
    try {
      const credito = await this.service.cancelar(c.codigoQr);
      this.confirmando.set(null);
      this.aviso.set(`Compra cancelada. Se acreditaron $${credito} a tu crédito.`);
      await this.cargar();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cancelando.set(false);
    }
  }
}