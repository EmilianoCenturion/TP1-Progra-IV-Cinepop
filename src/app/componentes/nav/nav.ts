import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../servicios/auth';
import { NgIf } from '@angular/common';
import { Reserva } from '../../servicios/reserva';
import { RolAdmin } from '../../directivas/rol-admin';


@Component({
  imports: [NgIf, RouterLinkActive, RouterLink, RolAdmin],
  selector: 'app-nav',
  styleUrl: './nav.css',
  templateUrl: './nav.html',
})
export class Nav implements OnInit{
  reservasService = inject(Reserva);
  router = inject(Router);
  auth = inject(Auth);

  usuarioLogueado = signal(false);

  // Solo los clientes registrados tienen perfil en "usuarios" (y por lo tanto "Mi cuenta")
  esCliente = signal(false);

  async ngOnInit() {
    const usuario = await this.auth.getUser();
    const emailAnon = localStorage.getItem('emailAnon');

    if (usuario) {
      this.esCliente.set((await this.auth.getPerfil()) != null);
    }

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

  async cerrarSesion() {
    await this.auth.signOut();

    // El anonimo no tiene sesion en Supabase: se "desloguea" borrando sus datos en el localStorage

    localStorage.removeItem('emailAnon');
    localStorage.removeItem('nombreAnon');

    // Que no quede una compra a medias de la sesion anterior

    this.reservasService.limpiar();

    this.router.navigate(['/login']);
  }
}
