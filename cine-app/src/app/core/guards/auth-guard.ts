import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const { data } = await authService.getUser();
  if (data.user) return true;

  router.navigate(['/auth/login']);
  return false;
};