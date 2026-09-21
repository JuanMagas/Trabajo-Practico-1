export type EstadoCompra = 'confirmada' | 'validada' | 'cancelada';

export interface Compra {
  id: string;
  usuarioId: string | null;
  fecha: string;
  total: number;
  estado: EstadoCompra;
  codigoQr: string;
  creditoUsado: number;
}