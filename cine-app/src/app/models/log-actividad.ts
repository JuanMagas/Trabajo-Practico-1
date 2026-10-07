export type AccionLog =
  | 'crear-funcion'
  | 'modificar-precio'
  | 'validar-qr'
  | 'entregar-candy'
  | 'entregar-canje';

export interface LogActividad {
  usuario: string;
  accion: AccionLog;
  detalle: string;
  fecha: string;
}