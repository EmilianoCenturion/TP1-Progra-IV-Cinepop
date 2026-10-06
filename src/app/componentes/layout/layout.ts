import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { Nav } from '../nav/nav';
import { Reserva } from '../../servicios/reserva';

@Component({
  imports: [Nav, RouterOutlet, NgIf],
  selector: 'app-layout',
  styleUrl: './layout.css',
  templateUrl: './layout.html',
})
export class Layout {
  reserva = inject(Reserva);
  private router = inject(Router);

  // Sale del modo combo y vuelve al home
  cancelarCombo() {
    this.reserva.limpiar();
    this.router.navigate(['/home']);
  }
}