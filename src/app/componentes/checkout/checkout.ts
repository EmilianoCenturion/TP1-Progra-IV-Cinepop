import { Component, importProvidersFrom, inject, signal } from '@angular/core';
import { Reserva } from '../../servicios/reserva';
import { Compra } from '../../servicios/compra';
import { Router } from '@angular/router';
import { Funciones } from '../../servicios/funciones';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../servicios/auth';
import { calcularEdad } from '../../utils/edad';
import { PdfEntradas } from '../../servicios/pdf-entradas';

@Component({
  imports: [NgIf, NgFor, FormsModule, DatePipe],
  selector: 'app-checkout',
  styleUrl: './checkout.css',
  templateUrl: './checkout.html',
})
export class Checkout {
  private reservaService = inject(Reserva);
  private compraService = inject(Compra);
  private router = inject(Router);
  private funcionesService = inject(Funciones);
  private auth = inject(Auth);
  private pdfService = inject(PdfEntradas);

  butacas = this.reservaService.butacasSeleccionadas;
  carritoCandy = this.reservaService.carritoCandy;
  
  resumen = signal<any>(null);
  edadUsuario = signal<number | null>(null);
  funcionPasada = signal(false);
  funcion = signal<any>(null);
  confirmarEdad = false;
  metodoPago = 'Tarjeta';
  procesando = signal(false);
  resultado = signal<any>(null);
  errorConfirmar = signal(false);

  async ngOnInit() {
      if (this.butacas().length === 0 || this.reservaService.funcionId() === null) {
        this.router.navigate(['/cartelera']);
        return;
      }

      const funcion = await this.funcionesService.getFuncionId(this.reservaService.funcionId()!);

      if (!funcion) {
        this.router.navigate(['/cartelera']);
        return;
      }

      this.funcion.set(funcion);
      // Doble control: la ficha ya no muestra funciones pasadas, pero pudo empezar mientras compraba
      this.funcionPasada.set(new Date(funcion.fecha_hora) <= new Date());

      const perfil = await this.auth.getPerfil();

      if (perfil) {
        this.edadUsuario.set(calcularEdad(perfil.fecha_nacimiento));
      }
  }

  totalButacas() {
    let suma = 0;

    for (let b of this.butacas()) {
      suma += Number(b.precio);
    }

    return suma;
  }

  totalCandy() {
    let suma = 0;

    for (let item of this.carritoCandy()) {
      suma += item.producto.precio * item.cantidad;
    }

    return suma;
  }

  total() {
    return this.totalButacas() + this.totalCandy();
  }

  async confirmar() {

    if (!this.puedeConfirmar()) {
      return;
    }

    this.procesando.set(true);
    this.errorConfirmar.set(false);

    const resultado = await this.compraService.confirmarCompra(
      this.reservaService.funcionId()!,
      this.butacas(),
      this.carritoCandy(),
      this.metodoPago,
      this.total()
    );

    this.procesando.set(false);

    if (resultado == null) {
      this.errorConfirmar.set(true);
      return;
    }

    this.resultado.set(resultado);

    // antes de limpiar la reserva guardamos butacas y candy para armar el PDF
    this.resumen.set({ butacas: this.butacas(), candy: this.carritoCandy() });
    
    this.reservaService.limpiar()
  }

  edadMinima(): number { 
    return this.funcion()?.peliculas.clasificacion_edad ?? 0;
  }

  bloqueadaPorEdad(): boolean {
    const edad = this.edadUsuario();
    return edad !== null && edad < this.edadMinima();
  }

  debeConfirmarEdad(): boolean { 
    return this.edadUsuario() === null && this.edadMinima() > 0;
  }

  puedeConfirmar(): boolean { 
    if (this.procesando() || this.funcionPasada() || this.bloqueadaPorEdad()) {
      return false;
    } 

    if (this.debeConfirmarEdad() && !this.confirmarEdad) {
      return false;
    }

    return true;
  }

  async descargarPdf() {
    const r = this.resultado();

    await this.pdfService.generar(
      r.compra,
      r.entradas,
      this.resumen().butacas,
      this.resumen().candy,
      this.funcion()
    );
  }
}
