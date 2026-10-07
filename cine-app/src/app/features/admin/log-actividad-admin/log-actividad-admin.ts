import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LogService } from '../log-service';
import { AccionLog, LogActividad } from '../../../models/log-actividad';

@Component({
  selector: 'app-log-actividad-admin',
  imports: [DatePipe],
  templateUrl: './log-actividad-admin.html',
  styleUrl: './log-actividad-admin.css',
})
export class LogActividadAdmin implements OnInit {
  private service = inject(LogService);

  readonly acciones: { valor: AccionLog; etiqueta: string }[] = [
    { valor: 'crear-funcion', etiqueta: 'Función creada' },
    { valor: 'modificar-precio', etiqueta: 'Precio modificado' },
    { valor: 'validar-qr', etiqueta: 'Entrada validada' },
    { valor: 'entregar-candy', etiqueta: 'Candy entregado' },
    { valor: 'entregar-canje', etiqueta: 'Canje entregado' },
  ];

  registros = signal<LogActividad[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  accion = signal<AccionLog | null>(null);
  desde = signal('');
  hasta = signal('');

  async ngOnInit() {
    await this.buscar();
  }

  valor(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  etiqueta(accion: AccionLog): string {
    return this.acciones.find(a => a.valor === accion)?.etiqueta ?? accion;
  }

  cambiarAccion(valor: string) {
    this.accion.set(valor === '' ? null : (valor as AccionLog));
  }

  async buscar() {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.registros.set(await this.service.listar(this.accion(), this.desde(), this.hasta()));
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }
}
