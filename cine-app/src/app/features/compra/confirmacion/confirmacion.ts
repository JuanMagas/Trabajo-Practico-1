import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ComprasService } from '../compras-service';
import { QrPdfService } from '../../../core/services/qr-pdf-service';
import { CompraConfirmada } from '../../../models/resumen-compra';

@Component({
  selector: 'app-confirmacion',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.css',
})
export class Confirmacion implements OnInit {
  private route = inject(ActivatedRoute);
  private comprasService = inject(ComprasService);
  private qrPdfService = inject(QrPdfService);

  cargando = signal(true);
  errorMsg = signal<string | null>(null);
  compra = signal<CompraConfirmada | null>(null);
  qrDataUrl = signal<string | null>(null);
  generandoPdf = signal(false);

  async ngOnInit() {
    // El código viaja en la URL (?qr=...): es lo único que identifica la compra,
    // incluso si el comprador es anónimo y no tiene cuenta.
    const codigo = this.route.snapshot.queryParamMap.get('qr');

    if (!codigo) {
      this.cargando.set(false);
      this.errorMsg.set('Falta el código de la compra');
      return;
    }

    const compra = await this.comprasService.obtenerPorCodigo(codigo);
    this.cargando.set(false);

    if (!compra) {
      this.errorMsg.set('No encontramos esa compra');
      return;
    }

    this.compra.set(compra);
    this.qrDataUrl.set(await this.qrPdfService.generarQrDataUrl(compra.codigoQr));
  }

  async descargarPdf() {
    const compra = this.compra();
    if (!compra || this.generandoPdf()) return;

    this.generandoPdf.set(true);
    await this.qrPdfService.descargarPdf(compra);
    this.generandoPdf.set(false);
  }
}
