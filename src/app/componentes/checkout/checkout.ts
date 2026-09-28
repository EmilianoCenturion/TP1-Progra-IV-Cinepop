import { Component, inject, signal } from '@angular/core';
import { Reserva } from '../../servicios/reserva';
import { Compra } from '../../servicios/compra';
import { Router } from '@angular/router';

@Component({
  imports: [],
  selector: 'app-checkout',
  styleUrl: './checkout.css',
  templateUrl: './checkout.html',
})
export class Checkout {
  private reserva = inject(Reserva);
  private compraService = inject(Compra);
  private router = inject(Router);

  butacas = this.reserva.butacasSeleccionadas;
  carritoCandy = this.reserva.carritoCandy;
  metodoPago = signal<string>('Tarjeta');
  procesando = signal(false);
  resultado = signal<any>(null);
  errorConfirmar = signal(false);

  totalButacas() {
    let suma = 0;

    for (let b of this.butacas()) {
      suma += b.precio;
    }

    return suma;
  }

  totalCandy() {
    let suma = 0;

    for (let item of this.carritoCandy()) {
      suma += item.producto.precio * item.cantidad;
    }

    return suma;
  }

}
