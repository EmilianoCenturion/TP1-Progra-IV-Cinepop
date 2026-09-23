import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../servicios/auth';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { RolAdmin } from '../../directivas/rol-admin';

@Component({
  imports: [FormsModule, NgIf, RouterLinkActive, RouterLink, RolAdmin],
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
    const emailAnon = localStorage.getItem('emailAnon');

    if (usuario || emailAnon) {
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

  mostrarLupa(): boolean {
    return !(this.router.url === '/cartelera')
  }
}
