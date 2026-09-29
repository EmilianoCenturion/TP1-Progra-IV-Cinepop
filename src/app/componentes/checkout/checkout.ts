import { Component, inject, signal } from '@angular/core';
import { Reserva } from '../../servicios/reserva';
import { Compra } from '../../servicios/compra';
import { Router } from '@angular/router';
import { Funciones } from '../../servicios/funciones';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../servicios/auth';
import { calcularEdad } from '../../utils/edad';
import { PdfEntradas } from '../../servicios/pdf-entradas';
import { Cupones } from '../../servicios/cupones';

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
  private cuponesService = inject(Cupones)

  butacas = this.reservaService.butacasSeleccionadas;
  carritoCandy = this.reservaService.carritoCandy;
  
  cuponAplicado = signal<any>(null);
  errorCupon = signal('');
  codigoCupon = '';
  private usuarioId: string | null = null;
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
        this.usuarioId = perfil.id;

        this.edadUsuario.set(calcularEdad(perfil.fecha_nacimiento));

        // Beneficio por registrarse: se aplica solo si es su primera compra
        if ( await this.cuponesService.esPrimeraCompra(perfil.id)) {
          this.cuponAplicado.set( await this.cuponesService.getCuponPrimeraCompra())
        }
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

  subtotal() {
    return this.totalButacas() + this.totalCandy();
  }

  descuento () {
    const cupon = this.cuponAplicado();

    if (!cupon) {
      return 0;
    }

    return Math.round(this.subtotal() * cupon.porcentaje_descuento / 100);
  }

  total() {
    return this.subtotal() - this.descuento()
  }

  async aplicarCupon() {
    this.errorCupon.set('');

    const cupon = await this.cuponesService.getCuponPorCodigo(this.codigoCupon);

    if (!cupon) {
      this.errorCupon.set('El cupón no existe o no está activo')
      return;
    }

    if (cupon.tipo_cupon === 'Mayor de 50') {
      const edad = this.edadUsuario();

      if (edad === null) {
        this.errorCupon.set('Iniciá sesión para usar este cupón')
        return;
      }

      if (edad <= 50) {
        this.errorCupon.set('Este cupón es solo para mayores de 50 años')
        return;
      }
    }

    if (cupon.tipo_cupon === 'Primera compra') {
      if (!this.usuarioId || !(await this.cuponesService.esPrimeraCompra(this.usuarioId))) {
        this.errorCupon.set('Este cupón es solo para la primera compra de usuarios registrados');
        return;
      }
    }

    // Un solo cupon por compra: reemplaza al que hubiera
    this.cuponAplicado.set(cupon);
    this.codigoCupon = '';
  }

  quitarCupon() {
    this.cuponAplicado.set(null);
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
      this.total(),
      this.cuponAplicado()?.id ?? null
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
