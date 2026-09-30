import { CanDeactivateFn } from '@angular/router';

export interface ConCambiosSinGuardar { 
  tieneCambiosSinGuardar(): boolean;
}

export const cambiosSinGuardarGuard: 
CanDeactivateFn<ConCambiosSinGuardar> = ( componente ) => {
  if (componente.tieneCambiosSinGuardar()) {
    return confirm('Tenes cambios sin guardar ¿Queres salir igual?');
  }

  return true;
};
