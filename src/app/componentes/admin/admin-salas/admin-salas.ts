import { Component, inject, OnInit, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Salas } from '../../../servicios/salas';
import { Butaca } from '../../../servicios/butaca';
import { Actividad } from '../../../servicios/actividad';
import { ConCambiosSinGuardar } from '../../../guards/cambios-sin-guardar-guard';

@Component({
  imports: [NgFor, NgIf, ReactiveFormsModule],
  selector: 'app-admin-salas',
  styleUrl: './admin-salas.css',
  templateUrl: './admin-salas.html',
})
export class AdminSalas implements OnInit, ConCambiosSinGuardar {
  private fb = inject(FormBuilder);
  private salasService = inject(Salas);
  private butacaService = inject(Butaca);
  private actividad = inject(Actividad);

  salas = signal<any[]>([]);
  mensaje = signal('');
  error = signal('');
  creando = signal(false);

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.salas.set(await this.salasService.getSalas());
  }

  async crear() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.creando.set(true);
    this.limpiarMensajes();

    const nombre = this.form.value.nombre!.trim();
    const { sala, error } = await this.salasService.crearSala(nombre);

    if (error != null) {
      // 23505 = violación de "unique": ya hay una sala con ese nombre
      this.error.set(error.code === '23505' ? 'Ya existe una sala con ese nombre.' : 'No se pudo crear la sala.');
      this.creando.set(false);
      return;
    }

    const okButacas = await this.butacaService.generarButacas(sala.id);

    if (!okButacas) {
      // Si fallan las butacas, se borra la sala para no dejar una sala vacía
      await this.salasService.eliminarSala(sala.id);
      this.error.set('No se pudieron generar las butacas. La sala no se creó.');
      this.creando.set(false);
      return;
    }

    await this.actividad.registrar(`Creó la sala "${nombre}" con sus butacas`);

    this.mensaje.set(`Sala "${nombre}" creada con 518 butacas.`);
    this.form.reset();
    this.creando.set(false);
    await this.cargar();
  }

  async eliminar(s: any) {
    this.limpiarMensajes();

    if (s.funciones[0].count > 0) {
      this.error.set(`"${s.nombre}" tiene funciones: no se puede eliminar.`);
      return;
    }

    if (!confirm(`¿Eliminar "${s.nombre}" y sus butacas? No se puede deshacer.`)) {
      return;
    }

    const ok = await this.salasService.eliminarSala(s.id);

    if (!ok) {
      this.error.set('No se pudo eliminar la sala.');
      return;
    }

    await this.actividad.registrar(`Eliminó la sala "${s.nombre}"`);
    this.mensaje.set('Sala eliminada.');
    await this.cargar();
  }

  private limpiarMensajes() {
    this.mensaje.set('');
    this.error.set('');
  }

  tieneCambiosSinGuardar() {
    return this.form.dirty;
  }
}