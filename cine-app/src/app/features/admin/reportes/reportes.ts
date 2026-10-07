import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  FilaFacturacion,
  PeliculaTop,
  ProductoTop,
  ReportesService,
} from '../reportes-service';
import { ReportesExportService } from '../reportes-export-service';
import { hoyArgentina, sumarDias } from '../../../shared/utils/fechas';
import { FechaPipe } from '../../../shared/pipes/fecha-pipe';

interface GrupoPeriodo {
  periodo: string;
  items: PeliculaTop[];
}

// Agrupa el top por período (la base ya lo devuelve ordenado de más nuevo a más viejo)
function agrupar(lista: PeliculaTop[]): GrupoPeriodo[] {
  const grupos: GrupoPeriodo[] = [];
  for (const p of lista) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.periodo === p.periodo) ultimo.items.push(p);
    else grupos.push({ periodo: p.periodo, items: [p] });
  }
  return grupos;
}

@Component({
  selector: 'app-reportes',
  imports: [DecimalPipe, FechaPipe],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes implements OnInit {
  private service = inject(ReportesService);
  private exportador = inject(ReportesExportService);

  readonly rangosRapidos = [7, 30, 90];

  desde = signal(sumarDias(hoyArgentina(), -29));
  hasta = signal(hoyArgentina());

  filas = signal<FilaFacturacion[]>([]);
  productos = signal<ProductoTop[]>([]);
  peliculasSemana = signal<PeliculaTop[]>([]);
  peliculasMes = signal<PeliculaTop[]>([]);

  cargando = signal(true);
  exportando = signal(false);
  error = signal<string | null>(null);

  gruposSemana = computed(() => agrupar(this.peliculasSemana()));
  gruposMes = computed(() => agrupar(this.peliculasMes()));

  totalFacturacion = computed(() => this.filas().reduce((s, f) => s + f.facturacion, 0));
  totalCompras = computed(() => this.filas().reduce((s, f) => s + f.compras, 0));
  totalEntradas = computed(() => this.filas().reduce((s, f) => s + f.entradas, 0));
  totalCredito = computed(() => this.filas().reduce((s, f) => s + f.creditoUsado, 0));
  maxFacturacion = computed(() => Math.max(1, ...this.filas().map(f => f.facturacion)));

  async ngOnInit() {
    await this.cargar();
  }

  valor(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  alto(f: FilaFacturacion): number {
    return (f.facturacion / this.maxFacturacion()) * 100;
  }

  // Ancho de la barra relativo al máximo de su propia lista
  ancho(valor: number, lista: { entradas?: number; cantidad?: number }[]): number {
    const max = Math.max(1, ...lista.map(x => x.entradas ?? x.cantidad ?? 0));
    return (valor / max) * 100;
  }

  async rangoRapido(dias: number) {
    this.hasta.set(hoyArgentina());
    this.desde.set(sumarDias(hoyArgentina(), -(dias - 1)));
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [filas, productos, semana, mes] = await Promise.all([
        this.service.facturacion(this.desde(), this.hasta()),
        this.service.productosTop(this.desde(), this.hasta()),
        this.service.peliculasTop('semana', 4),
        this.service.peliculasTop('mes', 3),
      ]);
      this.filas.set(filas);
      this.productos.set(productos);
      this.peliculasSemana.set(semana);
      this.peliculasMes.set(mes);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }

  private datos() {
    return {
      desde: this.desde(),
      hasta: this.hasta(),
      filas: this.filas(),
      peliculasSemana: this.peliculasSemana(),
      peliculasMes: this.peliculasMes(),
      productos: this.productos(),
    };
  }

  exportarExcel() {
    this.exportador.exportarExcel(this.datos());
  }

  async exportarPdf() {
    this.exportando.set(true);
    try {
      await this.exportador.exportarPdf(this.datos());
    } finally {
      this.exportando.set(false);
    }
  }
}