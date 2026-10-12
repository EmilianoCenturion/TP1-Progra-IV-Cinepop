import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Auth } from '../../servicios/auth';
import { Compra } from '../../servicios/compra';
import { Puntos } from '../../servicios/puntos';
import { Resenas } from '../../servicios/resenas';

@Component({
  imports: [NgIf, NgFor, DatePipe, RouterLink],
  selector: 'app-mi-cuenta',
  styleUrl: './mi-cuenta.css',
  templateUrl: './mi-cuenta.html',
})
export class MiCuenta implements OnInit {
  private auth = inject(Auth);
  private compraService = inject(Compra);
  private puntosService = inject(Puntos);
  private resenasService = inject(Resenas);

  cargando = signal(true);
  perfil = signal<any>(null);
  compras = signal<any[]>([]);
  saldoPuntos = signal(0);
  movimientos = signal<any[]>([]);
  misPeliculas = signal<any[]>([]);
  estrellas = [1, 2, 3, 4, 5];
  cancelandoId = signal<number | null>(null);
  mensaje = signal('');
  error = signal('');

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    // Solo los clientes registrados tienen perfil (y crédito)
    const perfil = await this.auth.getPerfil();
    this.perfil.set(perfil);

    if (perfil) {
      this.compras.set(await this.compraService.getMisCompras(perfil.id));
      this.saldoPuntos.set(await this.puntosService.getSaldo(perfil.id));
      this.movimientos.set(await this.puntosService.getMovimientos(perfil.id));
      this.armarMisPeliculas(await this.resenasService.getResenasDeUsuario(perfil.id));
    }

    this.cargando.set(false);
  }

  // Todas las entradas de una compra son de la misma función
  funcionDe(compra: any) {
    if (compra.entradas.length === 0) {
      return null;
    }

    return compra.entradas[0].funciones;
  }

  // fecha_compra se guarda en UTC: con la "Z" se muestra en hora local
  fechaCompra(compra: any) {
    return new Date(compra.fecha_compra + 'Z');
  }

  // Una tarjeta por película vista: compras no canceladas de funciones que ya empezaron
  private armarMisPeliculas(resenas: any[]) {
    const peliculas: any[] = [];

    for (let c of this.compras()) {
      const funcion = this.funcionDe(c);

      if (c.cancelada || !funcion || new Date(funcion.fecha_hora) > new Date()) {
        continue;
      }

      // Las compras vienen de la más nueva a la más vieja: la primera vez que aparece es la última vez que la vio
      let yaEsta = false;

      for (let p of peliculas) {
        if (p.id === funcion.peliculas.id) {
          yaEsta = true;
        }
      }

      if (yaEsta) {
        continue;
      }

      let calificacion = 0;

      for (let r of resenas) {
        if (r.pelicula_id === funcion.peliculas.id) {
          calificacion = r.calificacion;
        }
      }

      peliculas.push({
        id: funcion.peliculas.id,
        nombre: funcion.peliculas.nombre,
        imagen_url: funcion.peliculas.imagen_url,
        fecha: funcion.fecha_hora,
        calificacion,
      });
    }

    this.misPeliculas.set(peliculas);
  }

  // creado_en se guarda en UTC
  fechaMovimiento(m: any) {
    return new Date(m.creado_en + 'Z');
  }

  butacasDe(compra: any) {
    let texto = '';

    for (let e of compra.entradas) {
      if (texto !== '') {
        texto += ', ';
      }

      texto += e.butacas.fila + e.butacas.numero;
    }

    return texto;
  }

  algunaUsada(compra: any) {
    for (let e of compra.entradas) {
      if (e.ingreso_validado || e.candy_retirado) {
        return true;
      }
    }

    return false;
  }

  // Se puede cancelar hasta 2 horas antes de la función, si no se usó ninguna entrada
  puedeCancelar(compra: any) {
    const funcion = this.funcionDe(compra);

    if (compra.cancelada || !funcion || this.algunaUsada(compra)) {
      return false;
    }

    // fecha_hora está en hora local, por eso va sin "Z"
    const limite = new Date(funcion.fecha_hora).getTime() - 2 * 3600000;

    return Date.now() < limite;
  }

  estado(compra: any) {
    if (compra.cancelada) {
      return 'Cancelada';
    }

    const funcion = this.funcionDe(compra);

    if (funcion && new Date(funcion.fecha_hora) <= new Date()) {
      return 'Finalizada';
    }

    return 'Activa';
  }

  async cancelar(compra: any) {
    const ok = confirm(`¿Cancelar la compra N° ${compra.id}? No se devuelve dinero: se te acreditan $${compra.total_pagado} en tu cuenta para futuras compras.`);

    if (!ok) {
      return;
    }

    this.mensaje.set('');
    this.error.set('');

    // Se vuelve a controlar al confirmar: la página pudo quedar abierta y ya faltar menos de 2 horas
    if (!this.puedeCancelar(compra)) {
      this.error.set('Ya no se puede cancelar: faltan menos de 2 horas para la función.');
      await this.cargar();
      return;
    }
    this.cancelandoId.set(compra.id);

    const cancelada = await this.compraService.cancelarCompra(compra, this.perfil().id);

    this.cancelandoId.set(null);

    if (!cancelada) {
      this.error.set('No se pudo cancelar la compra. Probá de nuevo.');
      return;
    }

    this.mensaje.set(`Compra N° ${compra.id} cancelada. Se acreditaron $${compra.total_pagado} en tu cuenta y se ajustaron tus puntos.`);

    // Se recarga para ver el crédito nuevo y el estado de la compra
    await this.cargar();
  }
}