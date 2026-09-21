export type TipoButaca = 'estandar' | 'accesible' | 'vip';

export interface Butaca {
  fila: string;      // 'A'..'T'
  columna: number;
  tipo: TipoButaca;
}