import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toDataURL } from 'qrcode';
import { MisEntradasService } from '../mis-entradas-service';
import { CanjeRealizado, PuntosService, RecompensaDisponible } from '../puntos-service';

@Component({
  selector: 'app-mis-puntos',
  imports: [DatePipe],
  templateUrl: './mis-puntos.html',
  styleUrl: './mis-puntos.css',
})
export class MisPuntos implements OnInit {
  private puntosService = inject(PuntosService);
  private entradasService = inject(MisEntradasService);

  puntos = signal(0);
  recompensas = signal<RecompensaDisponible[]>([]);
  canjes = signal<CanjeRealizado[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  confirmando = signal<string | null>(null);
  procesando = signal(false);

  // último canje hecho: se muestra el código y el QR para presentarlo
  ultimo = signal<{ nombre: string; codigo: string; qr: string } | null>(null);

  async ngOnInit() {
    await this.cargar();
  }

  private async cargar() {
    this.cargando.set(true);
    try {
      const [saldo, recompensas, canjes] = await Promise.all([
        this.entradasService.saldo(),
        this.puntosService.recompensas(),
        this.puntosService.misCanjes(),
      ]);
      this.puntos.set(saldo.puntos);
      this.recompensas.set(recompensas);
      this.canjes.set(canjes);
      this.error.set(null);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }

  alcanza(r: RecompensaDisponible): boolean {
    return this.puntos() >= r.puntosCosto;
  }

  async canjear(r: RecompensaDisponible) {
    this.procesando.set(true);
    this.error.set(null);
    try {
      const codigo = await this.puntosService.canjear(r.id);
      this.ultimo.set({ nombre: r.nombre, codigo, qr: await toDataURL(codigo, { width: 220, margin: 1 }) });
      this.confirmando.set(null);
      await this.cargar();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.procesando.set(false);
    }
  }
}