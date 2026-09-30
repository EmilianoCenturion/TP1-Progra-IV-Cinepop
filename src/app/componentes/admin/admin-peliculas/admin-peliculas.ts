import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { Peliculas } from '../../../servicios/peliculas';
import { Actividad } from '../../../servicios/actividad';

@Component({
  imports: [NgFor, NgIf, DatePipe],
  selector: 'app-admin-peliculas',
  styleUrl: './admin-peliculas.css',
  templateUrl: './admin-peliculas.html',
})
export class AdminPeliculas implements OnInit {
  private router = inject(Router);
  private peliculasService = inject(Peliculas);
  private actividad = inject(Actividad);

  peliculas = signal<any[]>([]);
  mensaje = signal('');
  error = signal('');

  async ngOnInit() {
    // Mensaje que manda el formulario al volver ("Película creada", etc.)
    const mensaje = history.state?.mensaje;
    if (mensaje) {
      this.mensaje.set(mensaje);
    }

    await this.cargar();
  }

  async cargar() {
    this.peliculas.set(await this.peliculasService.getPeliculasAdmin());
  }

  nueva() {
    this.router.navigate(['/admin/peliculas/nueva']);
  }

  editar(p: any) {
    this.router.navigate(['/admin/peliculas', p.id, 'editar']);
  }

  async cambiarActiva(p: any) {
    this.limpiarMensajes();

    const ok = await this.peliculasService.cambiarActiva(p.id, !p.activa);

    if (!ok) {
      this.error.set('No se pudo cambiar el estado.');
      return;
    }

    await this.actividad.registrar(`${p.activa ? 'Ocultó' : 'Publicó'} la película "${p.nombre}"`);
    await this.cargar();
  }

  async eliminar(p: any) {
    this.limpiarMensajes();

    if (!(await this.peliculasService.puedeEliminar(p.id))) {
      this.error.set(`"${p.nombre}" tiene funciones o reseñas: no se puede eliminar, ocultala.`);
      return;
    }

    if (!confirm(`¿Eliminar "${p.nombre}"? No se puede deshacer.`)) {
      return;
    }

    const ok = await this.peliculasService.eliminarPelicula(p.id);

    if (!ok) {
      this.error.set('No se pudo eliminar la película.');
      return;
    }

    await this.actividad.registrar(`Eliminó la película "${p.nombre}"`);
    this.mensaje.set('Película eliminada.');
    await this.cargar();
  }

  private limpiarMensajes() {
    this.mensaje.set('');
    this.error.set('');
  }
}