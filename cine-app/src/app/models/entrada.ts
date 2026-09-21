import { TipoButaca } from './butaca';

export interface Entrada {
  id: string;
  compraId: string;
  funcionId: string;
  fila: string;
  columna: number;
  tipoButaca: TipoButaca;
  precioPagado: number;
}