export interface ComboItem {
  productoId: string;
  nombre: string;
  cantidad: number;
}

export interface Combo {
  id: string; // es también el id del producto virtual que viaja en el carrito
  nombre: string;
  precio: number;
  incluyeEntrada: boolean;
  activo: boolean;
  items: ComboItem[];
  valorSeparado: number; // lo que costarían los productos por separado (solo referencia)
}