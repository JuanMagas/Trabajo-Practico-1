export type TipoSangre = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type Rol = 'cliente' | 'empleado' | 'admin';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  tipoSangre: TipoSangre;
  colorOjos: string;
  diasVacaciones: number;
  puntosFidelidad: number;
  credito: number;
  rol: Rol;
}