export interface Producto {
  id: string;
  categoriaId: string;
  nombre: string;
  precio: number;
}

export interface ItemPedido {
  productoId: string;
  cantidad: number;
}