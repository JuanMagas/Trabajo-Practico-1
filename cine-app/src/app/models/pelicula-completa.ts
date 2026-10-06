import { Pelicula } from './pelicula';
import { Genero } from './genero';

// Película con lo que hace falta para mostrarla: géneros, promedio de estrellas y ventas.
export interface PeliculaCompleta extends Pelicula {
  generos: Genero[];
  promedio: number | null; // null si todavía no tiene reseñas
  cantidadResenas: number;
  entradasVendidas: number;
}