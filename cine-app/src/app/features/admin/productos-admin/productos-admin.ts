import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CategoriaConProductos, ProductosService } from '../productos-service';
import { Producto } from '../../../models/producto';

@Component({
  selector: 'app-productos-admin',
  imports: [DecimalPipe],
  templateUrl: './productos-admin.html',
  styleUrl: './productos-admin.css',
})
export class ProductosAdmin implements OnInit {
  private productosService = inject(ProductosService);

  categorias = signal<CategoriaConProductos[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  errorMsg = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  // formulario de nueva categoría
  nuevaCategoria = signal('');

  // formulario de nuevo producto
  prodCategoriaId = signal('');
  prodNombre = signal('');
  prodPrecio = signal('');

  // edición en línea de un producto
  editandoId = signal<string | null>(null);
  editCategoriaId = signal('');
  editNombre = signal('');
  editPrecio = signal('');

  ngOnInit() {
    this.cargar();
  }

  valor(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  private async cargar() {
    const { categorias, error } = await this.productosService.obtenerTodoAdmin();
    this.cargando.set(false);

    if (error) {
      this.errorMsg.set(error);
      return;
    }
    this.categorias.set(categorias);

    if (!this.prodCategoriaId() && categorias.length > 0) {
      this.prodCategoriaId.set(categorias[0].id);
    }
  }

  // "12,5" o "12.5" -> 12.5; devuelve null si no es un número válido y no negativo
  private parsePrecio(texto: string): number | null {
    if (texto.trim() === '') return null;
    const n = Number(texto.replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  private async ejecutar(
    accion: () => Promise<{ error: string | null }>,
    mensajeOk: string
  ): Promise<boolean> {
    if (this.guardando()) return false;

    this.guardando.set(true);
    this.errorMsg.set(null);
    this.mensaje.set(null);

    const { error } = await accion();
    this.guardando.set(false);

    if (error) {
      this.errorMsg.set(error);
      return false;
    }

    this.mensaje.set(mensajeOk);
    await this.cargar();
    return true;
  }

  async crearCategoria() {
    const nombre = this.nuevaCategoria().trim();
    if (!nombre) {
      this.errorMsg.set('Ingresá un nombre para la categoría');
      return;
    }
    const ok = await this.ejecutar(() => this.productosService.crearCategoria(nombre), 'Categoría creada');
    if (ok) this.nuevaCategoria.set('');
  }

  async crearProducto() {
    const nombre = this.prodNombre().trim();
    const precio = this.parsePrecio(this.prodPrecio());

    if (!this.prodCategoriaId()) {
      this.errorMsg.set('Elegí una categoría (creá una si no hay ninguna)');
      return;
    }
    if (!nombre) {
      this.errorMsg.set('Ingresá el nombre del producto');
      return;
    }
    if (precio === null) {
      this.errorMsg.set('Ingresá un precio válido (número mayor o igual a 0)');
      return;
    }

    const ok = await this.ejecutar(
      () => this.productosService.crearProducto({ categoriaId: this.prodCategoriaId(), nombre, precio }),
      'Producto creado'
    );
    if (ok) {
      this.prodNombre.set('');
      this.prodPrecio.set('');
    }
  }

  editar(p: Producto) {
    this.errorMsg.set(null);
    this.mensaje.set(null);
    this.editandoId.set(p.id);
    this.editCategoriaId.set(p.categoriaId);
    this.editNombre.set(p.nombre);
    this.editPrecio.set(String(p.precio));
  }

  cancelarEdicion() {
    this.editandoId.set(null);
  }

  async guardarEdicion() {
    const id = this.editandoId();
    if (!id) return;

    const nombre = this.editNombre().trim();
    const precio = this.parsePrecio(this.editPrecio());

    if (!nombre) {
      this.errorMsg.set('El nombre no puede estar vacío');
      return;
    }
    if (precio === null) {
      this.errorMsg.set('Ingresá un precio válido (número mayor o igual a 0)');
      return;
    }

    const ok = await this.ejecutar(
      () => this.productosService.actualizarProducto(id, { categoriaId: this.editCategoriaId(), nombre, precio }),
      'Producto actualizado'
    );
    if (ok) this.editandoId.set(null);
  }

  alternarActivo(p: Producto) {
    const activar = p.activo === false;
    return this.ejecutar(
      () => this.productosService.cambiarActivo(p.id, activar),
      activar ? 'Producto activado' : 'Producto dado de baja'
    );
  }
}