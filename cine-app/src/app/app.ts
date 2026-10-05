import { Component, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Navbar } from './shared/componentes/navbar/navbar';
import { AuthService } from './core/services/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'cine-app';

  private auth = inject(AuthService);
  private router = inject(Router);

  // Rutas que requieren sesión: si se pierde la sesión estando en ellas, se vuelve al inicio.
  // /compra queda afuera a propósito: se puede comprar como anónimo.
  private readonly rutasProtegidas = ['/perfil', '/admin', '/empleado'];

  // Distingue "nunca hubo sesión / todavía cargando" de "se cerró la sesión"
  private huboSesion = false;

  constructor() {
    effect(() => {
      const userId = this.auth.currentUserId();

      if (userId) {
        this.huboSesion = true;
        return;
      }

      if (!this.huboSesion) return; // carga inicial, no es un logout
      this.huboSesion = false;

      const url = this.router.url;
      if (this.rutasProtegidas.some((r) => url.startsWith(r))) {
        this.router.navigateByUrl('/');
      }
    });
  }
}