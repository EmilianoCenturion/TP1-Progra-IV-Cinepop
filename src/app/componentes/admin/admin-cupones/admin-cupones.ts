import { Component, inject, OnInit, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Cupones } from '../../../servicios/cupones';
import { Actividad } from '../../../servicios/actividad';
import { ConCambiosSinGuardar } from '../../../guards/cambios-sin-guardar-guard';

@Component({
  imports: [NgFor, NgIf, ReactiveFormsModule],
  selector: 'app-admin-cupones',
  styleUrl: './admin-cupones.css',
  templateUrl: './admin-cupones.html',
})
export class AdminCupones implements OnInit, ConCambiosSinGuardar {
  private fb = inject(FormBuilder);
  private cuponesService = inject(Cupones);
  private actividad = inject(Actividad);

  cupones = signal<any[]>([]);
  mensaje = signal('');
  error = signal('');

  tipos = ['Primera compra', 'Mayor de 50', 'Otro'];

  form = this.fb.group({
    codigo: ['', [Validators.required, Validators.minLength(3)]],
    tipo: ['Primera compra', [Validators.required]],
    tipoOtro: [""],
    porcentaje: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cupones.set(await this.cuponesService.getCuponesAdmin());
  }

  // Lo usa el guard canDeactivate
  tieneCambiosSinGuardar() {
    return this.form.dirty;
  }

  async crear() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.limpiarMensajes();

    // Los códigos se guardan en mayúsculas y sin espacios
    const codigo = this.form.value.codigo!.trim().toUpperCase();
    
    let tipo = this.form.value.tipo!;

    if (tipo === 'Otro') {
      tipo = this.form.value.tipoOtro!.trim();

      if (tipo.length < 3) {
        this.error.set('Escribí el nombre del tipo de cupón (al menos 3 letras).');
        return;
      }
    }

    const porcentaje = this.form.value.porcentaje!;

    const error = await this.cuponesService.crearCupon(codigo, tipo, porcentaje);

    if (error != null) {
      // 23505 = código repetido (codigo_cupon es unique)
      this.error.set(error.code === '23505' ? 'Ya existe un cupón con ese código.' : 'No se pudo crear el cupón.');
      return;
    }

    await this.actividad.registrar(`Creó el cupón "${codigo}" (${tipo}, ${porcentaje}%)`);
    this.mensaje.set(`Cupón "${codigo}" creado. Activalo para que se pueda usar.`);
        this.form.reset({ codigo: '', tipo: 'Primera compra', tipoOtro: '', porcentaje: 10 });
    await this.cargar();
  }

  async guardarPorcentaje(c: any, valor: string) {
    this.limpiarMensajes();
    const porcentaje = Number(valor);

    if (!porcentaje || porcentaje < 1 || porcentaje > 100) {
      this.error.set('El porcentaje tiene que estar entre 1 y 100.');
      return;
    }

    if (porcentaje === c.porcentaje_descuento) {
      return;
    }

    const ok = await this.cuponesService.cambiarPorcentaje(c.id, porcentaje);

    if (!ok) {
      this.error.set('No se pudo cambiar el porcentaje.');
      return;
    }

    await this.actividad.registrar(`Cambió el descuento del cupón "${c.codigo_cupon}" de ${c.porcentaje_descuento}% a ${porcentaje}%`);
    this.mensaje.set('Porcentaje actualizado.');
    await this.cargar();
  }

  async cambiarEstado(c: any) {
    this.limpiarMensajes();
    const activar = !c.estado;

    const ok = await this.cuponesService.cambiarEstado(c.id, activar);

    if (!ok) {
      this.error.set('No se pudo cambiar el estado.');
      return;
    }

    // Solo puede haber un cupón de primera compra activo, porque se aplica solo
    if (activar && c.tipo_cupon === 'Primera compra') {
      await this.cuponesService.desactivarOtrosPrimeraCompra(c.id);
    }

    await this.actividad.registrar(`${activar ? 'Activó' : 'Desactivó'} el cupón "${c.codigo_cupon}"`);
    await this.cargar();
  }

  async eliminar(c: any) {
    this.limpiarMensajes();

    if (c.compras[0].count > 0) {
      this.error.set(`"${c.codigo_cupon}" ya se usó en compras: no se puede eliminar, desactivalo.`);
      return;
    }

    if (!confirm(`¿Eliminar el cupón "${c.codigo_cupon}"?`)) {
      return;
    }

    const ok = await this.cuponesService.eliminarCupon(c.id);

    if (!ok) {
      this.error.set('No se pudo eliminar el cupón.');
      return;
    }

    await this.actividad.registrar(`Eliminó el cupón "${c.codigo_cupon}"`);
    await this.cargar();
  }

  private limpiarMensajes() {
    this.mensaje.set('');
    this.error.set('');
  }
}