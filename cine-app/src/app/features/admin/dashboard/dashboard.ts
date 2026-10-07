import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FilaFacturacion, PeliculaTop, ProductoTop, ReportesService } from '../reportes-service';
import { hoyArgentina, sumarDias } from '../../../shared/utils/fechas';
import { FechaPipe } from '../../../shared/pipes/fecha-pipe';

@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe, RouterLink, FechaPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private reportes = inject(ReportesService);

  readonly secciones = [
    { ruta: '/admin/peliculas', titulo: 'Películas' },
    { ruta: '/admin/salas-funciones', titulo: 'Salas y funciones' },
    { ruta: '/admin/productos', titulo: 'Productos' },
    { ruta: '/admin/recompensas', titulo: 'Recompensas' },
    { ruta: '/admin/combos', titulo: 'Combos' },
    { ruta: '/admin/cupones', titulo: 'Cupones' },
    { ruta: '/admin/reportes', titulo: 'Reportes' },
    { ruta: '/admin/log', titulo: 'Log de actividad' },
  ];

  filas = signal<FilaFacturacion[]>([]); // últimos 30 días
  topPelicula = signal<PeliculaTop | null>(null);
  topProducto = signal<ProductoTop | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  // La última fila es siempre "hoy"
  hoy = computed(() => this.filas().at(-1) ?? null);
  ultimos7 = computed(() => this.filas().slice(-7));

  facturacion7 = computed(() => this.ultimos7().reduce((s, f) => s + f.facturacion, 0));
  facturacion30 = computed(() => this.filas().reduce((s, f) => s + f.facturacion, 0));
  entradas7 = computed(() => this.ultimos7().reduce((s, f) => s + f.entradas, 0));
  entradas30 = computed(() => this.filas().reduce((s, f) => s + f.entradas, 0));
  max7 = computed(() => Math.max(1, ...this.ultimos7().map(f => f.facturacion)));

  async ngOnInit() {
    const hasta = hoyArgentina();
    const desde = sumarDias(hasta, -29);
    try {
      const [filas, peliculas, productos] = await Promise.all([
        this.reportes.facturacion(desde, hasta),
        this.reportes.peliculasTop('semana', 1),
        this.reportes.productosTop(desde, hasta),
      ]);
      this.filas.set(filas);
      this.topPelicula.set(peliculas[0] ?? null);
      this.topProducto.set(productos[0] ?? null);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }

  alto(f: FilaFacturacion): number {
    return (f.facturacion / this.max7()) * 100;
  }
}
