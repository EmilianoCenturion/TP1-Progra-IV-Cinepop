import { Component, inject, OnInit, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Empleados } from '../../../servicios/empleados';
import { Actividad } from '../../../servicios/actividad';
import { ConCambiosSinGuardar } from '../../../guards/cambios-sin-guardar-guard';

@Component({
  imports: [NgFor, NgIf, ReactiveFormsModule],
  selector: 'app-admin-empleados',
  styleUrl: './admin-empleados.css',
  templateUrl: './admin-empleados.html',
})
export class AdminEmpleados implements OnInit, ConCambiosSinGuardar {
  private fb = inject(FormBuilder);
  private empleadosService = inject(Empleados);
  private actividad = inject(Actividad);

  empleados = signal<any[]>([]);
  mensaje = signal('');
  error = signal('');
  guardando = signal(false);

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.empleados.set(await this.empleadosService.getEmpleados());
  }

  // Lo usa el guard canDeactivate
  tieneCambiosSinGuardar() {
    return this.form.dirty;
  }

  async crear() {
    this.mensaje.set('');
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);

    const nombre = this.form.value.nombre!.trim();
    const email = this.form.value.email!.trim().toLowerCase();

    const error = await this.empleadosService.crearEmpleado(nombre, email, this.form.value.password!);

    this.guardando.set(false);

    if (error != null) {
      this.error.set(error);
      return;
    }

    await this.actividad.registrar(`Dio de alta al empleado ${nombre} (${email})`);
    this.mensaje.set(`Empleado ${nombre} creado. Ya puede ingresar con ${email} y su contraseña.`);
    this.form.reset({ nombre: '', email: '', password: '' });
    await this.cargar();
  }

  async darDeBaja(e: any) {
    this.mensaje.set('');
    this.error.set('');

    if (!confirm(`¿Dar de baja a ${e.nombre}? Ya no va a poder validar QR.`)) {
      return;
    }

    if (!(await this.empleadosService.darDeBaja(e.id))) {
      this.error.set('No se pudo dar de baja al empleado.');
      return;
    }

    await this.actividad.registrar(`Dio de baja al empleado ${e.nombre} (${e.email})`);
    await this.cargar();
  }
}