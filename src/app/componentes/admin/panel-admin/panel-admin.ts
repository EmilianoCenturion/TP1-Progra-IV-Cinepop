import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';

@Component({
  imports: [RouterOutlet, NgIf],
  selector: 'app-panel-admin',
  styleUrl: './panel-admin.css',
  templateUrl: './panel-admin.html',
})
export class PanelAdmin {
  private router = inject(Router);

  // En /admin (las tarjetas) no tiene sentido mostrar "volver"
  estaEnInicio() {
    return this.router.url === '/admin';
  }

  volver() {
    this.router.navigate(['/admin']);
  }
}