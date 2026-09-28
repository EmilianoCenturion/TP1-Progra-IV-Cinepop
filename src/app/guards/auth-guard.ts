import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../servicios/auth';

export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  
  const usuario = await auth.getUser();
  const emailAnon = localStorage.getItem('emailAnon')

  if (usuario || emailAnon) {
    return true;
  }
  
  router.navigate(['/login']);
  return false;
};
