import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Roles } from '../servicios/roles';

export function rolGuard(rolRequerido: string): CanActivateFn {
  return async () => {
    const rolesService = inject(Roles);
    const router = inject(Router);

    const rol = await rolesService.getRol();

    if (rol === rolRequerido) {
      return true;
    }

    // Devuelve un UrlYree que hace que el router redirija al mismo
    return router.createUrlTree(['/home'])
  }
};
