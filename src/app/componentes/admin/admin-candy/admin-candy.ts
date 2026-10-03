import { Component, inject, OnInit, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Candys } from '../../../servicios/candys';
import { Actividad } from '../../../servicios/actividad';

@Component({
  imports: [NgFor, NgIf, ReactiveFormsModule],
  selector: 'app-admin-candy',
  styleUrl: './admin-candy.css',
  templateUrl: './admin-candy.html',
})
export class AdminCandy implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private candyService = inject(Candys);
  private actividad = inject(Actividad);

  categorias = signal<any[]>([]);
  productos = signal<any[]>([]);
  mensaje = signal('');
  error = signal('');

  formCategoria = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
  });

  async ngOnInit() {
    // Mensaje que manda el formulario al volver ("Producto creado", etc.)
    const mensaje = history.state?.mensaje;
    if (mensaje) {
      this.mensaje.set(mensaje);
    }

    await this.cargar();
  }

  async cargar() {
    this.categorias.set(await this.candyService.getCategorias());
    this.productos.set(await this.candyService.getProductosAdmin());
  }

  async crearCategoria() {
    if (this.formCategoria.invalid) {
      this.formCategoria.markAllAsTouched();
      return;
    }

    this.limpiarMensajes();
    const nombre = this.formCategoria.value.nombre!.trim();
    const error = await this.candyService.crearCategoria(nombre);

    if (error != null) {
      // 23505 = nombre repetido (categorias_candy.nombre es unique)
      this.error.set(error.code === '23505' ? 'Ya existe esa categoría.' : 'No se pudo crear la categoría.');
      return;
    }

    await this.actividad.registrar(`Creó la categoría de candy "${nombre}"`);
    this.mensaje.set(`Categoría "${nombre}" creada.`);
    this.formCategoria.reset();
    await this.cargar();
  }

  async eliminarCategoria(c: any) {
    this.limpiarMensajes();

    if (c.productos_candy[0].count > 0) {
      this.error.set(`"${c.nombre}" tiene productos: no se puede eliminar.`);
      return;
    }

    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) {
      return;
    }

    const ok = await this.candyService.eliminarCategoria(c.id);

    if (!ok) {
      this.error.set('No se pudo eliminar la categoría.');
      return;
    }

    await this.actividad.registrar(`Eliminó la categoría de candy "${c.nombre}"`);
    await this.cargar();
  }

  nuevoProducto() {
    this.router.navigate(['/admin/candy/productos/nuevo']);
  }

  editarProducto(p: any) {
    this.router.navigate(['/admin/candy/productos', p.id, 'editar']);
  }

  async eliminarProducto(p: any) {
    this.limpiarMensajes();

    if (!(await this.candyService.puedeEliminarProducto(p.id))) {
      this.error.set(`"${p.nombre}" ya se vendió o está en un combo: no se puede eliminar.`);
      return;
    }

    if (!confirm(`¿Eliminar "${p.nombre}"?`)) {
      return;
    }

    const ok = await this.candyService.eliminarProducto(p.id);

    if (!ok) {
      this.error.set('No se pudo eliminar el producto.');
      return;
    }

    await this.actividad.registrar(`Eliminó el producto de candy "${p.nombre}"`);
    await this.cargar();
  }

  private limpiarMensajes() {
    this.mensaje.set('');
    this.error.set('');
  }
}