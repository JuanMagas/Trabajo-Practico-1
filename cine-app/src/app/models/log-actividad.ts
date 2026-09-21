export type AccionLog = 'crear-funcion' | 'modificar-precio' | 'validar-qr' | 'entregar-candy';

export interface LogActividad {
  id: string;
  usuarioId: string;
  accion: AccionLog;
  detalle: string;
  fecha: string;
}