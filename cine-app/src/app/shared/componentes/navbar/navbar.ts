import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { AlertasService } from '../../../features/peliculas/alertas-service';
import { SoloAdmin } from '../../directivas/solo-admin';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, SoloAdmin],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  authService = inject(AuthService);
  alertas = inject(AlertasService);

  esStaff = computed(() => {
    const rol = this.authService.perfil()?.rol;
    return rol === 'empleado' || rol === 'admin';
  });

  logout() {
    this.authService.signOut();
  }
}