import { Component, inject, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Validacion } from '../../servicios/validacion';
import { Actividad } from '../../servicios/actividad';
import { aTextoLocal } from '../../utils/fechas';

@Component({
  imports: [NgIf, NgFor, FormsModule, DatePipe],
  selector: 'app-validar-qr',
  styleUrl: './validar-qr.css',
  templateUrl: './validar-qr.html',
})
export class ValidarQr {
  private validacion = inject(Validacion);
  private actividad = inject(Actividad);

  codigo = '';
  procesando = signal(false);

  // Resultado de la última validación: { ok, titulo, detalle, compra, tipo }
  resultado = signal<any>(null);

  async validar(tipo: string) {
    if (!this.codigo.trim() || this.procesando()) {
      return;
    }

    this.procesando.set(true);
    this.resultado.set(null);

    const compra = await this.validacion.buscarCompra(this.codigo);

    if (!compra || compra.entradas.length === 0) {
      this.mostrar(false, 'Código inválido', 'No existe ninguna compra con ese código.', null, tipo);
      return;
    }

    if (compra.cancelada) {
      this.mostrar(false, 'Compra cancelada', 'Esta compra fue cancelada: el QR no sirve.', compra, tipo);
      return;
    }

    if (tipo === 'ingreso') {
      await this.validarIngreso(compra);
    } else {
      await this.entregarCandy(compra);
    }
  }

  private async validarIngreso(compra: any) {
    let faltanEntrar = false;

    for (let e of compra.entradas) {
      if (!e.ingreso_validado) {
        faltanEntrar = true;
      }
    }

    if (!faltanEntrar) {
      this.mostrar(false, 'QR ya usado', 'Las entradas de esta compra ya se usaron para ingresar.', compra, 'ingreso');
      return;
    }

    if (!this.esDeHoy(compra, 'ingreso')) {
      return;
    }

    if (!(await this.validacion.validarIngreso(compra.id))) {
      this.mostrar(false, 'No se pudo validar', 'Probá de nuevo.', compra, 'ingreso');
      return;
    }

    const cantidad = compra.entradas.length;

    await this.actividad.registrar(`Validó el ingreso de la compra N° ${compra.id} (${this.funcion(compra).peliculas.nombre}, ${cantidad} ${cantidad === 1 ? 'entrada' : 'entradas'})`);
    this.mostrar(true, 'Ingreso validado', `¡Pueden pasar ${cantidad} ${cantidad === 1 ? 'persona' : 'personas'} a la sala!`, compra, 'ingreso');
  }

  private async entregarCandy(compra: any) {
    if (compra.compra_items.length === 0) {
      this.mostrar(false, 'Sin candy', 'Esta compra no incluye productos del candy bar.', compra, 'candy');
      return;
    }

    if (compra.entradas[0].candy_retirado) {
      this.mostrar(false, 'Candy ya entregado', 'El candy de esta compra ya se retiró.', compra, 'candy');
      return;
    }

    if (!this.esDeHoy(compra, 'candy')) {
      return;
    }

    if (!(await this.validacion.entregarCandy(compra.id))) {
      this.mostrar(false, 'No se pudo entregar', 'Probá de nuevo.', compra, 'candy');
      return;
    }

    await this.actividad.registrar(`Entregó el candy de la compra N° ${compra.id}`);
    this.mostrar(true, 'Candy entregado', 'Entregale estos productos:', compra, 'candy');
  }

  private mostrar(ok: boolean, titulo: string, detalle: string, compra: any, tipo: string) {
    this.resultado.set({ ok, titulo, detalle, compra, tipo });
    this.procesando.set(false);

    // Si salió bien, se limpia el campo para el próximo cliente
    if (ok) {
      this.codigo = '';
    }
  }

    // El ingreso y el candy solo se validan el día de la función (fecha_hora está en hora local)
  private esDeHoy(compra: any, tipo: string) {
    const hoy = aTextoLocal(new Date()).slice(0, 10);
    const diaFuncion = this.funcion(compra).fecha_hora.slice(0, 10);

    if (diaFuncion === hoy) {
      return true;
    }

    // Se muestran las dos fechas para que el empleado vea el motivo
    const formatear = (texto: string) => texto.slice(8, 10) + '/' + texto.slice(5, 7) + '/' + texto.slice(0, 4);
    this.mostrar(false, 'Fecha incorrecta', `La función es el ${formatear(diaFuncion)} y hoy es ${formatear(hoy)}.`, compra, tipo);

    return false;
  }

  // Todas las entradas de una compra son de la misma función
  funcion(compra: any) {
    return compra.entradas[0].funciones;
  }

  butacas(compra: any) {
    let texto = '';

    for (let e of compra.entradas) {
      texto += (texto === '' ? '' : ', ') + e.butacas.fila + e.butacas.numero;
    }

    return texto;
  }

  nombreItem(item: any) {
    return item.productos_candy ? item.productos_candy.nombre : item.combos.nombre;
  }
}