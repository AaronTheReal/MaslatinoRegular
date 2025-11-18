// src/app/guards/admin-auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

export const adminAuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);

  const token = localStorage.getItem('admin_token');

  // Si NO hay token → redirige al login
  if (!token) {
    return router.createUrlTree(['/admin-login'], {
      queryParams: { redirectTo: state.url } // opcional: para volver a donde quería entrar
    });
  }

  // Si hay token, lo dejamos pasar
  return true;
};
