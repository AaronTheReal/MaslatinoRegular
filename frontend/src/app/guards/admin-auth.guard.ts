import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

export const adminAuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);

  const token = localStorage.getItem('admin_token');
  const userStr = localStorage.getItem('admin_user');

  // 1. No hay token → login
  if (!token) {
    return router.createUrlTree(['/admin-login'], {
      queryParams: { redirectTo: state.url }
    });
  }

  // 2. Hay token pero NO hay usuario o el role está corrupto → login
  if (!userStr) {
    localStorage.removeItem('admin_token'); // limpiamos basura
    return router.createUrlTree(['/admin-login'], {
      queryParams: { redirectTo: state.url }
    });
  }

  try {
    const user = JSON.parse(userStr);
    if (!user?.role) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      return router.createUrlTree(['/admin-login'], {
        queryParams: { redirectTo: state.url }
      });
    }
  } catch (e) {
    // JSON corrupto
    localStorage.clear(); // limpiamos todo por seguridad
    return router.createUrlTree(['/admin-login'], {
      queryParams: { redirectTo: state.url }
    });
  }

  // Todo bien → entra al panel
  return true;
};