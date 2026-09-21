import { Idioma } from './pelicula';

export type Formato = '2D' | '3D' | '4D' | '5D';

export interface Funcion {
  id: string;
  peliculaId: string;
  salaId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  formato: Formato;
  idioma: Idioma;
  precio: number;
  precioPreventa: number | null;
  fechaFinPreventa: string | null;
}