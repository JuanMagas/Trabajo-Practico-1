export interface Producto {
  id: string;
  categoriaId: string;
  nombre: string;
  precio: number;
  activo?: boolean; // solo lo usa el admin; el catálogo público trae únicamente activos
}

// Lo único que el cliente le manda al servidor sobre el candy: qué y cuántos.
// El nombre y el precio los pone el servidor.
export interface ItemPedido {
  productoId: string;
  cantidad: number;
}