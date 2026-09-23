import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const empleadoGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const { data } = await authService.getUser();
  if (!data.user) {
    router.navigate(['/auth/login']);
    return false;
  }

  const { data: perfil } = await authService.getPerfil(data.user.id);
  if (perfil?.rol === 'empleado' || perfil?.rol === 'admin') return true;

  router.navigate(['/']);
  return false;
};