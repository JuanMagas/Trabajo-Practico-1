import { Component, input, output, signal, effect } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { generarLayoutPorFila, limitesDeGrupo } from '../../utils/layout-sala';
import { Butaca } from '../../../models/butaca';

@Component({
  selector: 'app-mapa-butacas',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './mapa-butacas.html',
  styleUrl: './mapa-butacas.css',
})
export class MapaButacas {
  butacasOcupadas = input<{ fila: string; columna: number }[]>([]);
  maxSeleccionables = input<number>(10);

  // Butacas que el padre necesita sacar de la selección local porque el servidor rechazó la reserva (alguien se adelantó)
  liberarExternamente = input<{ fila: string; columna: number }[]>([]);

  seleccionCambio = output<Butaca[]>();

  private layoutPorFila = generarLayoutPorFila();
  filas = Array.from(this.layoutPorFila.keys());

  private seleccionadas = signal<Set<string>>(new Set());

  constructor() {
    effect(() => {
      const aLiberar = this.liberarExternamente();
      if (aLiberar.length === 0) return;

      const actuales = new Set(this.seleccionadas());
      let cambio = false;

      for (const b of aLiberar) {
        const clave = this.clave(b.fila, b.columna);
        if (actuales.has(clave)) {
          actuales.delete(clave);
          cambio = true;
        }
      }

      if (cambio) {
        this.seleccionadas.set(actuales);
        this.emitirSeleccion();
      }
    });
  }

  private clave(fila: string, columna: number): string {
    return `${fila}-${columna}`;
  }

  butacasDeFila(fila: string): Butaca[] {
    return this.layoutPorFila.get(fila) ?? [];
  }

  esPasilloDespues(butaca: Butaca): boolean {
    return limitesDeGrupo(butaca.tipo).includes(butaca.columna);
  }

  estaOcupada(butaca: Butaca): boolean {
    return this.butacasOcupadas().some(
      (o) => o.fila === butaca.fila && o.columna === butaca.columna
    );
  }

  estaSeleccionada(butaca: Butaca): boolean {
    return this.seleccionadas().has(this.clave(butaca.fila, butaca.columna));
  }

  toggleButaca(butaca: Butaca) {
    if (this.estaOcupada(butaca)) return;

    const clave = this.clave(butaca.fila, butaca.columna);
    const actuales = new Set(this.seleccionadas());

    if (actuales.has(clave)) {
      actuales.delete(clave);
    } else {
      if (actuales.size >= this.maxSeleccionables()) return;
      actuales.add(clave);
    }

    this.seleccionadas.set(actuales);
    this.emitirSeleccion();
  }

  private emitirSeleccion() {
    const todas = Array.from(this.layoutPorFila.values()).flat();
    const seleccion = todas.filter((b) => this.seleccionadas().has(this.clave(b.fila, b.columna)));
    this.seleccionCambio.emit(seleccion);
  }
}