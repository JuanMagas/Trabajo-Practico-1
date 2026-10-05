import { TipoButaca } from './butaca';
import { Formato } from './funcion';
import { Idioma } from './pelicula';

// Lo que devuelve el servidor (calcular_compra) antes de pagar.
export interface ItemResumen {
  fila: string;
  columna: number;
  tipo: TipoButaca;
  precioUnitario: number;
  precioFinal: number; // ya con el descuento aplicado
}

export interface ItemProductoResumen {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface ResumenCompra {
  pelicula: string;
  fechaFuncion: string;
  horaInicio: string;
  formato: Formato;
  idioma: Idioma;
  restriccionEdad: 13 | 18 | null;
  requiereAdulto: boolean;
  items: ItemResumen[];
  productos: ItemProductoResumen[];
  totalProductos: number;
  subtotal: number; // entradas sin descuento + productos
  descuentoPorcentaje: number; // solo aplica a las entradas
  cupon: string | null;
  total: number;
}

// Lo que devuelve el servidor (obtener_compra) una vez pagada.
export interface EntradaConfirmada {
  fila: string;
  columna: number;
  tipo: TipoButaca;
  precio: number;
}

export interface ProductoConfirmado {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CompraConfirmada {
  codigoQr: string;
  estado: 'confirmada' | 'validada' | 'cancelada';
  fecha: string;
  total: number;
  pelicula: string;
  restriccionEdad: 13 | 18 | null;
  requiereAdulto: boolean;
  sala: number;
  fechaFuncion: string;
  horaInicio: string;
  formato: Formato;
  idioma: Idioma;
  entradas: EntradaConfirmada[];
  productos: ProductoConfirmado[];
  candyEntregado: boolean;
}