import { CanActivateFn } from '@angular/router';

export const empleadoGuard: CanActivateFn = (route, state) => {
  return true;
};
