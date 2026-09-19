import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../servicios/auth';

export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  
  const usuario = await auth.getUser();

  if (usuario) {
    return true;
  }

  const emailAnon = localStorage.getItem('emailAnon')

  if (emailAnon) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
