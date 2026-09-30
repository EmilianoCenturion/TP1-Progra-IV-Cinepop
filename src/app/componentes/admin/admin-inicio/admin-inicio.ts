import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  imports: [],
  selector: 'app-admin-inicio',
  styleUrl: './admin-inicio.css',
  templateUrl: './admin-inicio.html',
})
export class AdminInicio {
  private router = inject(Router);

  irA(ruta: string) {
    this.router.navigate(['/admin', ruta]);
  }
}