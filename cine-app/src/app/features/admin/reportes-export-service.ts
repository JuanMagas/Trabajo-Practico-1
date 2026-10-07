import { Injectable } from '@angular/core';
import { FilaFacturacion, PeliculaTop, ProductoTop } from './reportes-service';

export interface DatosReporte {
  desde: string;
  hasta: string;
  filas: FilaFacturacion[];
  peliculasSemana: PeliculaTop[];
  peliculasMes: PeliculaTop[];
  productos: ProductoTop[];
}

// "2026-10-07" -> "07/10/2026"
function fecha(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// Texto seguro para CSV: nunca falla con undefined y escapa las comillas
function texto(valor: unknown): string {
  return `"${String(valor ?? '').replace(/"/g, '""')}"`;
}

@Injectable({ providedIn: 'root' })
export class ReportesExportService {
  // CSV con ";" y BOM UTF-8: Excel en español lo abre con las columnas y tildes bien
  exportarExcel(datos: DatosReporte): void {
    const lineas: string[] = [];
    lineas.push('Facturación por día');
    lineas.push('Día;Compras;Entradas;Facturación;Crédito usado');
    for (const f of datos.filas) {
      lineas.push([fecha(f.dia), f.compras, f.entradas, f.facturacion, f.creditoUsado].join(';'));
    }

    lineas.push('');
    lineas.push('Películas más vistas');
    lineas.push('Tipo;Desde;Película;Entradas');
    for (const p of datos.peliculasSemana) {
      lineas.push(['Semana', fecha(p.periodo), texto(p.titulo), p.entradas].join(';'));
    }
    for (const p of datos.peliculasMes) {
      lineas.push(['Mes', fecha(p.periodo), texto(p.titulo), p.entradas].join(';'));
    }

    lineas.push('');
    lineas.push('Productos más vendidos');
    lineas.push('Producto;Cantidad;Recaudado');
    for (const p of datos.productos) {
      lineas.push([texto(p.nombre), p.cantidad, p.importe].join(';'));
    }

    const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${datos.desde}_${datos.hasta}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // jspdf se carga recién al exportar, así no pesa en el bundle inicial
  async exportarPdf(datos: DatosReporte): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let y = 20;

    const linea = (texto: string, tamano = 10, negrita = false) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(tamano);
      doc.setFont('helvetica', negrita ? 'bold' : 'normal');
      doc.text(texto, 15, y);
      y += tamano === 10 ? 6 : 9;
    };

    linea('CineApp - Reporte', 16, true);
    linea(`Período: ${fecha(datos.desde)} al ${fecha(datos.hasta)}`);

    const totalFact = datos.filas.reduce((s, f) => s + f.facturacion, 0);
    const totalEntradas = datos.filas.reduce((s, f) => s + f.entradas, 0);
    const totalCompras = datos.filas.reduce((s, f) => s + f.compras, 0);
    linea(`Facturación: $${totalFact}   Compras: ${totalCompras}   Entradas: ${totalEntradas}`);
    y += 4;

    linea('Facturación por día', 12, true);
    for (const f of datos.filas.filter(x => x.compras > 0)) {
      linea(`${fecha(f.dia)}   compras ${f.compras}   entradas ${f.entradas}   $${f.facturacion}`);
    }
    y += 4;

    linea('Películas más vistas por semana', 12, true);
    for (const p of datos.peliculasSemana) {
      linea(`Semana del ${fecha(p.periodo)}: ${p.titulo} - ${p.entradas} entradas`);
    }
    y += 4;

    linea('Películas más vistas por mes', 12, true);
    for (const p of datos.peliculasMes) {
      linea(`Mes de ${fecha(p.periodo)}: ${p.titulo} - ${p.entradas} entradas`);
    }
    y += 4;

    linea('Productos más vendidos', 12, true);
    for (const p of datos.productos) {
      linea(`${p.nombre} - ${p.cantidad} u. ($${p.importe})`);
    }

    doc.save(`reporte-${datos.desde}_${datos.hasta}.pdf`);
  }
}