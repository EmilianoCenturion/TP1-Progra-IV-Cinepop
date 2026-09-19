import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../servicios/auth';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  imports: [FormsModule, NgIf ,RouterLinkActive, RouterLink],
  selector: 'app-nav',
  styleUrl: './nav.css',
  templateUrl: './nav.html',
})
export class Nav implements OnInit{
  router = inject(Router);
  auth = inject(Auth);

  usuarioLogueado = signal(false);

  filtro = "";

  async ngOnInit() {
    const usuario = await this.auth.getUser();
    const emailAnonimo = localStorage.getItem('emailAnonimo');

    if (usuario || emailAnonimo) {
      this.usuarioLogueado.set(true);
    } else {
      this.usuarioLogueado.set(false);
    }
  }

  ocultarNav(): boolean {
    const rutasSinNav = ['/login', '/registro'];
    return rutasSinNav.includes(this.router.url);
  }

  buscarEnCartelera() {
    if (this.filtro.trim() === "") {
      this.router.navigate(['/cartelera']);
    } else {
      this.router.navigate(['/cartelera'], { queryParams: { buscar: this.filtro } });
    }
  }

  buscarEnvio() {
    if (this.router.url.startsWith('/cartelera')) {
      this.router.navigate(['/cartelera'], {
        queryParams: { buscar: this.filtro },
        queryParamsHandling: 'merge'
      });
    }
  }

  mostrarLupa(): boolean{
    return this.router.url === '/home';
  }
}
