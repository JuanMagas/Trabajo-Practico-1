import { Injectable } from '@angular/core';
import { toDataURL } from 'qrcode';
import { jsPDF } from 'jspdf';
import { CompraConfirmada } from '../../models/resumen-compra';

@Injectable({ providedIn: 'root' })
export class QrPdfService {
  // El QR contiene únicamente el código de la compra (un UUID). Toda la información
  // real vive en la base de datos: el QR es solo la "llave" para encontrarla.
  generarQrDataUrl(codigo: string): Promise<string> {
    return toDataURL(codigo, { width: 300, margin: 1 });
  }

  async descargarPdf(compra: CompraConfirmada): Promise<void> {
    const qr = await this.generarQrDataUrl(compra.codigoQr);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    let y = 20;
    doc.setFontSize(20);
    doc.text('CineApp - Entradas', 20, y);

    y += 12;
    doc.setFontSize(16);
    doc.text(compra.pelicula, 20, y);

    y += 8;
    doc.setFontSize(11);
    doc.text(`Fecha: ${compra.fechaFuncion}   Hora: ${compra.horaInicio}`, 20, y);
    y += 6;
    doc.text(`Sala ${compra.sala} - ${compra.formato} - ${compra.idioma}`, 20, y);

    y += 10;
    doc.setFontSize(12);
    doc.text('Butacas:', 20, y);
    doc.setFontSize(11);
    for (const e of compra.entradas) {
      y += 6;
      const tipo = e.tipo === 'estandar' ? '' : ` (${e.tipo.toUpperCase()})`;
      doc.text(`${e.fila}${e.columna}${tipo}  -  $${e.precio.toFixed(2)}`, 25, y);
    }

    if (compra.productos.length > 0) {
      y += 10;
      doc.setFontSize(12);
      doc.text('Candy bar (se retira con este mismo QR):', 20, y);
      doc.setFontSize(11);
      for (const p of compra.productos) {
        y += 6;
        const subtotal = p.cantidad * p.precioUnitario;
        doc.text(`${p.cantidad} x ${p.nombre}  -  $${subtotal.toFixed(2)}`, 25, y);
      }
    }

    y += 10;
    doc.setFontSize(12);
    doc.text(`Total: $${compra.total.toFixed(2)}`, 20, y);

    if (compra.requiereAdulto) {
      y += 10;
      doc.setFontSize(11);
      doc.text(
        `Pelicula con restriccion de edad (+${compra.restriccionEdad}): debe asistir un adulto.`,
        20,
        y
      );
    }

    // Si el contenido ya llegó muy abajo, el QR va en una hoja nueva
    y += 10;
    if (y > 205) {
      doc.addPage();
      y = 20;
    }

    doc.addImage(qr, 'PNG', 20, y, 60, 60);
    y += 66;
    doc.setFontSize(9);
    doc.text(`Codigo: ${compra.codigoQr}`, 20, y);
    y += 5;
    doc.text('Presenta este QR en la entrada y en el candy bar. Cada uno se usa una sola vez.', 20, y);

    doc.save(`entradas-${compra.codigoQr.slice(0, 8)}.pdf`);
  }
}