export type Idioma = 'castellano' | 'subtitulada';
export type EstadoPelicula = 'cartelera' | 'proximamente' | 'archivada';

export interface Pelicula {
  id: string;
  titulo: string;
  sinopsis: string;
  imagenUrl: string;
  duracionMinutos: number;
  restriccionEdad: 13 | 18 | null;
  estado: EstadoPelicula;
  fechaEstreno: string;
  createdAt: string;
}