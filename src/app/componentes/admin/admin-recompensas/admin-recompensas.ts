import { Component, inject, OnInit, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Puntos } from '../../../servicios/puntos';
import { Candys } from '../../../servicios/candys';
import { Actividad } from '../../../servicios/actividad';

// Se muestra dentro de la página de cupones: el admin define cuántos puntos cuesta cada recompensa
@Component({
  imports: [NgFor, NgIf, ReactiveFormsModule],
  selector: 'app-admin-recompensas',
  styleUrl: './admin-recompensas.css',
  templateUrl: './admin-recompensas.html',
})
export class AdminRecompensas implements OnInit {
  private fb = inject(FormBuilder);
  private puntosService = inject(Puntos);
  private candyService = inject(Candys);
  private actividad = inject(Actividad);

  recompensas = signal<any[]>([]);
  productos = signal<any[]>([]);
  mensaje = signal('');
  error = signal('');

  form = this.fb.group({
    tipo: ['Entrada', [Validators.required]],
    productoId: [null as number | null],
    costo: [500, [Validators.required, Validators.min(1)]],
  });

  async ngOnInit() {
    this.productos.set(await this.candyService.getProductosAdmin());
    await this.cargar();
  }

  async cargar() {
    this.recompensas.set(await this.puntosService.getRecompensas(false));
  }

  nombre(r: any) {
    return r.tipo === 'Entrada' ? 'Entrada gratis' : r.productos_candy.nombre;
  }

  async crear() {
    this.limpiarMensajes();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const tipo = this.form.value.tipo!;
    const productoId = tipo === 'Producto' ? Number(this.form.value.productoId) : null;
    const costo = this.form.value.costo!;

    if (tipo === 'Producto' && !productoId) {
      this.error.set('Elegí el producto.');
      return;
    }

    const error = await this.puntosService.crearRecompensa(tipo, productoId, costo);

    if (error != null) {
      // 23505 = ya hay una recompensa para la entrada o para ese producto
      this.error.set(error.code === '23505' ? 'Esa recompensa ya existe: cambiale el costo en la tabla.' : 'No se pudo crear la recompensa.');
      return;
    }

    await this.actividad.registrar(`Creó la recompensa de puntos "${this.nombreNueva(tipo, productoId)}" (${costo} puntos)`);
    this.mensaje.set('Recompensa creada.');
    this.form.reset({ tipo: 'Entrada', productoId: null, costo: 500 });
    await this.cargar();
  }

  async guardarCosto(r: any, valor: string) {
    this.limpiarMensajes();
    const costo = Number(valor);

    if (!costo || costo < 1) {
      this.error.set('El costo tiene que ser de al menos 1 punto.');
      return;
    }

    if (costo === r.costo_puntos) {
      return;
    }

    const ok = await this.puntosService.actualizarRecompensa(r.id, { costo_puntos: costo });

    if (!ok) {
      this.error.set('No se pudo cambiar el costo.');
      return;
    }

    await this.actividad.registrar(`Cambió el costo de "${this.nombre(r)}" de ${r.costo_puntos} a ${costo} puntos`);
    this.mensaje.set('Costo actualizado.');
    await this.cargar();
  }

  async cambiarEstado(r: any) {
    this.limpiarMensajes();

    const ok = await this.puntosService.actualizarRecompensa(r.id, { activa: !r.activa });

    if (!ok) {
      this.error.set('No se pudo cambiar el estado.');
      return;
    }

    await this.actividad.registrar(`${r.activa ? 'Desactivó' : 'Activó'} la recompensa "${this.nombre(r)}"`);
    await this.cargar();
  }

  async eliminar(r: any) {
    this.limpiarMensajes();

    if (!confirm(`¿Eliminar la recompensa "${this.nombre(r)}"? Los canjes ya hechos no se pierden.`)) {
      return;
    }

    const ok = await this.puntosService.eliminarRecompensa(r.id);

    if (!ok) {
      this.error.set('No se pudo eliminar la recompensa.');
      return;
    }

    await this.actividad.registrar(`Eliminó la recompensa "${this.nombre(r)}"`);
    await this.cargar();
  }

  private nombreNueva(tipo: string, productoId: number | null) {
    if (tipo === 'Entrada') {
      return 'Entrada gratis';
    }

    for (let p of this.productos()) {
      if (p.id === productoId) {
        return p.nombre;
      }
    }

    return 'Producto';
  }

  private limpiarMensajes() {
    this.mensaje.set('');
    this.error.set('');
  }
}
