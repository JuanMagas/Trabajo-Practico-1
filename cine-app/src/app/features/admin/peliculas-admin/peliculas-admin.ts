import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PeliculasService } from '../../peliculas/peliculas-service';
import { PeliculasAdminService } from '../peliculas-admin-service';
import { PeliculaCompleta } from '../../../models/pelicula-completa';
import { Genero } from '../../../models/genero';

@Component({
  selector: 'app-peliculas-admin',
  imports: [],
  templateUrl: './peliculas-admin.html',
  styleUrl: './peliculas-admin.css',
})
export class PeliculasAdmin implements OnInit {
  private peliculasService = inject(PeliculasService);
  private adminService = inject(PeliculasAdminService);

  peliculas = signal<PeliculaCompleta[]>([]);
  generos = signal<Genero[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  errorMsg = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  // Formulario (sirve para crear y para editar)
  editandoId = signal<string | null>(null);
  titulo = signal('');
  sinopsis = signal('');
  imagenUrl = signal('');
  duracion = signal('');
  restriccion = signal(''); // '' = sin restricción, '13' o '18'
  estado = signal('proximamente');
  fechaEstreno = signal('');
  generoIds = signal<string[]>([]);

  nuevoGenero = signal('');

  tituloFormulario = computed(() => (this.editandoId() ? 'Editar película' : 'Nueva película'));

  ngOnInit() {
    this.cargar();
  }

  valor(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  private async cargar() {
    const [peliculas, generos] = await Promise.all([
      this.peliculasService.getAllCompletas(),
      this.peliculasService.getGeneros(),
    ]);
    this.peliculas.set(peliculas);
    this.generos.set(generos);
    this.cargando.set(false);
  }

  alternarGenero(id: string) {
    this.generoIds.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async crearGenero() {
    const nombre = this.nuevoGenero().trim();
    if (!nombre) {
      this.errorMsg.set('Ingresá el nombre del género');
      return;
    }
    if (this.generos().some((g) => g.nombre.toLowerCase() === nombre.toLowerCase())) {
      this.errorMsg.set('Ese género ya existe');
      return;
    }

    this.errorMsg.set(null);
    this.mensaje.set(null);
    const { error } = await this.adminService.crearGenero(nombre);
    if (error) {
      this.errorMsg.set(error);
      return;
    }
    this.nuevoGenero.set('');
    this.mensaje.set('Género creado');
    await this.cargar();
  }

  editar(p: PeliculaCompleta) {
    this.errorMsg.set(null);
    this.mensaje.set(null);
    this.editandoId.set(p.id);
    this.titulo.set(p.titulo);
    this.sinopsis.set(p.sinopsis);
    this.imagenUrl.set(p.imagenUrl ?? '');
    this.duracion.set(String(p.duracionMinutos));
    this.restriccion.set(p.restriccionEdad ? String(p.restriccionEdad) : '');
    this.estado.set(p.estado);
    this.fechaEstreno.set(p.fechaEstreno);
    this.generoIds.set(p.generos.map((g) => g.id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  limpiarFormulario() {
    this.editandoId.set(null);
    this.titulo.set('');
    this.sinopsis.set('');
    this.imagenUrl.set('');
    this.duracion.set('');
    this.restriccion.set('');
    this.estado.set('proximamente');
    this.fechaEstreno.set('');
    this.generoIds.set([]);
  }

  async guardar() {
    if (this.guardando()) return;
    this.errorMsg.set(null);
    this.mensaje.set(null);

    const titulo = this.titulo().trim();
    const sinopsis = this.sinopsis().trim();
    const duracion = Number(this.duracion());

    if (!titulo || !sinopsis) {
      this.errorMsg.set('Completá el título y la sinopsis');
      return;
    }
    if (!Number.isInteger(duracion) || duracion <= 0) {
      this.errorMsg.set('La duración debe ser un número entero de minutos mayor a 0');
      return;
    }
    if (!this.fechaEstreno()) {
      this.errorMsg.set('Elegí la fecha de estreno');
      return;
    }
    if (this.generoIds().length === 0) {
      this.errorMsg.set('Elegí al menos un género');
      return;
    }

    this.guardando.set(true);
    const { error } = await this.adminService.guardar(
      {
        titulo,
        sinopsis,
        imagenUrl: this.imagenUrl().trim() || null,
        duracionMinutos: duracion,
        restriccionEdad: this.restriccion() ? Number(this.restriccion()) : null,
        estado: this.estado(),
        fechaEstreno: this.fechaEstreno(),
      },
      this.generoIds(),
      this.editandoId() ?? undefined
    );
    this.guardando.set(false);

    if (error) {
      this.errorMsg.set(error);
      return;
    }

    this.mensaje.set(this.editandoId() ? 'Película actualizada' : 'Película creada');
    this.limpiarFormulario();
    await this.cargar();
  }
}