export type TipoCupon = 'primera-compra' | 'segmentado-edad';

export interface Cupon {
  id: string;
  tipo: TipoCupon;
  porcentaje: number;
  edadMinima: number | null;
  activo: boolean;
}