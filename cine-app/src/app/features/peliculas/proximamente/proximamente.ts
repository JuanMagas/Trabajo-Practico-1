import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../peliculas-service';
import { AlertasService } from '../alertas-service';
import { FuncionesService } from '../../admin/funciones-service';
import { AuthService } from '../../../core/services/auth';
import { PeliculaCompleta } from '../../../models/pelicula-completa';
import { Funcion } from '../../../models/funcion';
import { esFutura, hoyArgentina, sumarDias } from '../../../shared/utils/fechas';
import { DuracionPipe } from '../../../shared/pipes/duracion-pipe';
import { GenerosPipe } from '../../../shared/pipes/generos-pipe';
import { FechaPipe } from '../../../shared/pipes/fecha-pipe';

interface Preventa {
  precio: number;
  precioNormal: number;
  hasta: string;
}

interface Tarjeta {
  pelicula: PeliculaCompleta;
  ventaDesde: string;
  abierta: boolean; // ya pasó la fecha de apertura de venta
  hayFunciones: boolean;
  preventa: Preventa | null;
}

// La venta se abre 7 días antes del estreno (lo mismo que valida el servidor)
const DIAS_VENTA_ANTICIPADA = 7;

@Component({
  selector: 'app-proximamente',
  imports: [DecimalPipe, RouterLink, DuracionPipe, GenerosPipe, FechaPipe],
  templateUrl: './proximamente.html',
  styleUrl: './proximamente.css',
})
export class Proximamente implements OnInit {
  private peliculasService = inject(PeliculasService);
  private funcionesService = inject(FuncionesService);
  private alertasService = inject(AlertasService);
  auth = inject(AuthService);

  peliculas = signal<PeliculaCompleta[]>([]);
  funciones = signal<Funcion[]>([]);
  conAlerta = signal<Set<string>>(new Set());
  cargando = signal(true);
  trabajando = signal<string | null>(null); // id de la película cuya alerta se está guardando
  error = signal<string | null>(null);

  tarjetas = computed<Tarjeta[]>(() => {
    const hoy = hoyArgentina();
    const futuras = this.funciones().filter(f => esFutura(f.fecha, f.horaInicio));

    return this.peliculas()
      .filter(p => p.estado === 'proximamente')
      .sort((a, b) => a.fechaEstreno.localeCompare(b.fechaEstreno))
      .map(p => {
        const ventaDesde = sumarDias(p.fechaEstreno, -DIAS_VENTA_ANTICIPADA);
        const delaPelicula = futuras.filter(f => f.peliculaId === p.id);

        // Preventa vigente: la función con el precio de preventa más bajo que todavía no venció
        const enPreventa = delaPelicula
          .filter(f => f.precioPreventa != null && f.fechaFinPreventa != null && f.fechaFinPreventa >= hoy)
          .sort((a, b) => a.precioPreventa! - b.precioPreventa!)[0];

        return {
          pelicula: p,
          ventaDesde,
          abierta: hoy >= ventaDesde,
          hayFunciones: delaPelicula.length > 0,
          preventa: enPreventa
            ? { precio: enPreventa.precioPreventa!, precioNormal: enPreventa.precio, hasta: enPreventa.fechaFinPreventa! }
            : null,
        };
      });
  });

  async ngOnInit() {
    try {
      const [peliculas, funciones] = await Promise.all([
        this.peliculasService.getAllCompletas(),
        this.funcionesService.getAll(),
      ]);
      this.peliculas.set(peliculas);
      this.funciones.set(funciones);

      if (this.auth.currentUserId()) {
        this.conAlerta.set(await this.alertasService.misAlertas());
      }
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }

  async alternarAlerta(peliculaId: string) {
    if (this.trabajando()) return;
    this.trabajando.set(peliculaId);
    this.error.set(null);

    try {
      const activa = this.conAlerta().has(peliculaId);
      if (activa) await this.alertasService.desactivar(peliculaId);
      else await this.alertasService.activar(peliculaId);

      this.conAlerta.update(set => {
        const nuevo = new Set(set);
        if (activa) nuevo.delete(peliculaId);
        else nuevo.add(peliculaId);
        return nuevo;
      });
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.trabajando.set(null);
    }
  }
}