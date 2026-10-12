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
import { Puntos } from '../../servicios/puntos';

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
  private puntosService = inject(Puntos);

  butacas = this.reservaService.butacasSeleccionadas;
  carritoCandy = this.reservaService.carritoCandy;
  combo = this.reservaService.combo;

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
  butacaOcupada = signal(false);
  creditoDisponible = signal(0);
  usarCredito = true;

  // Canje de puntos: cuántas entradas y cuántos productos se pagan con puntos
  esCliente = signal(false);
  saldoPuntos = signal(0);
  recompensaEntrada = signal<any>(null);
  recompensasProductos = signal<any[]>([]);
  entradasCanjeadas = signal(0);
  productosCanjeados = signal<any[]>([]);

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
        this.esCliente.set(true);

        this.edadUsuario.set(calcularEdad(perfil.fecha_nacimiento));
        this.creditoDisponible.set(perfil.credito_disponible ?? 0);
        await this.cargarPuntos(perfil.id);

        // Beneficio por registrarse: se aplica solo si es su primera compra
        if ( await this.cuponesService.esPrimeraCompra(perfil.id)) {
          this.cuponAplicado.set( await this.cuponesService.getCuponPrimeraCompra())
        }
      }
  }

  private async cargarPuntos(usuarioId: string) {
    this.saldoPuntos.set(await this.puntosService.getSaldo(usuarioId));

    const productos = [];

    for (let r of await this.puntosService.getRecompensas(true)) {
      if (r.tipo === 'Entrada') {
        this.recompensaEntrada.set(r);
      } else {
        productos.push(r);
      }
    }

    this.recompensasProductos.set(productos);
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

  // Con combo, las entradas y su candy ya están en el precio del combo
  subtotal() {
    const combo = this.combo();

    if (combo) {
      return combo.precio + this.totalCandy();
    }

    return this.totalButacas() + this.totalCandy();
  }

  // Productos del combo con la misma forma que el carrito: { producto: { nombre }, cantidad }
  itemsDelCombo() {
    const items = [];

    for (let cp of this.combo().combos_productos) {
      items.push({ producto: { nombre: cp.productos_candy.nombre }, cantidad: cp.cantidad });
    }

    return items;
  }

  // |----- Canje de puntos

  costoEntrada() {
    return this.recompensaEntrada()?.costo_puntos ?? 0;
  }

  // Con combo las entradas ya están en el precio del combo: no se pueden canjear
  puedeCanjearEntradas() {
    return this.recompensaEntrada() != null && !this.combo();
  }

  // Los productos del carrito que tienen una recompensa activa
  productosCanjeables() {
    const lista = [];

    for (let item of this.carritoCandy()) {
      for (let r of this.recompensasProductos()) {
        if (r.producto_id === item.producto.id) {
          lista.push({ item, recompensa: r });
        }
      }
    }

    return lista;
  }

  hayCanjes() {
    return this.saldoPuntos() > 0 && (this.puedeCanjearEntradas() || this.productosCanjeables().length > 0);
  }

  cantidadCanjeada(productoId: number) {
    for (let p of this.productosCanjeados()) {
      if (p.productoId === productoId) {
        return p.cantidad;
      }
    }

    return 0;
  }

  puntosUsados() {
    let puntos = this.entradasCanjeadas() * this.costoEntrada();

    for (let p of this.productosCanjeados()) {
      puntos += p.cantidad * p.costo;
    }

    return puntos;
  }

  puntosRestantes() {
    return this.saldoPuntos() - this.puntosUsados();
  }

  cambiarEntradasCanjeadas(cambio: number) {
    const nueva = this.entradasCanjeadas() + cambio;

    if (nueva < 0 || nueva > this.butacas().length) {
      return;
    }

    if (cambio > 0 && this.costoEntrada() > this.puntosRestantes()) {
      return;
    }

    this.entradasCanjeadas.set(nueva);
  }

  cambiarProductoCanjeado(item: any, recompensa: any, cambio: number) {
    const nueva = this.cantidadCanjeada(item.producto.id) + cambio;

    if (nueva < 0 || nueva > item.cantidad) {
      return;
    }

    if (cambio > 0 && recompensa.costo_puntos > this.puntosRestantes()) {
      return;
    }

    const lista = [];

    for (let p of this.productosCanjeados()) {
      if (p.productoId !== item.producto.id) {
        lista.push(p);
      }
    }

    if (nueva > 0) {
      lista.push({ productoId: item.producto.id, cantidad: nueva, costo: recompensa.costo_puntos, precio: item.producto.precio });
    }

    this.productosCanjeados.set(lista);
  }

  // Las entradas gratis son las más baratas de las elegidas
  butacasCanjeadas() {
    const ordenadas = [...this.butacas()];
    ordenadas.sort((a, b) => Number(a.precio) - Number(b.precio));

    return ordenadas.slice(0, this.entradasCanjeadas());
  }

  // Cuánta plata se ahorra con lo canjeado
  descuentoPuntos() {
    let suma = 0;

    for (let b of this.butacasCanjeadas()) {
      suma += Number(b.precio);
    }

    for (let p of this.productosCanjeados()) {
      suma += p.cantidad * p.precio;
    }

    return suma;
  }

  // Lo que se le manda al servicio para guardar los canjes
  private datosCanje() {
    const butacaIds = [];

    for (let b of this.butacasCanjeadas()) {
      butacaIds.push(b.id);
    }

    return { butacaIds, costoEntrada: this.costoEntrada(), productos: this.productosCanjeados() };
  }

  // El cupón se aplica sobre lo que queda después de canjear
  descuento () {
    const cupon = this.cuponAplicado();

    if (!cupon) {
      return 0;
    }

    return Math.round((this.subtotal() - this.descuentoPuntos()) * cupon.porcentaje_descuento / 100);
  }

  total() {
    return this.subtotal() - this.descuentoPuntos() - this.descuento()
  }

  // El crédito cubre hasta el total; lo que sobra queda en la cuenta para otra compra
  creditoUsado() {
    if (!this.usarCredito) {
      return 0;
    }

    return Math.min(this.creditoDisponible(), this.total());
  }

  // Lo que falta pagar con el método de pago elegido
  aPagar() {
    return this.total() - this.creditoUsado();
  }

  // El crédito se usa junto con otro método de pago, o solo si alcanza para todo
  metodoPagoFinal() {
    // Todo pagado con puntos
    if (this.total() === 0) {
      return 'Puntos';
    }

    if (this.creditoUsado() === 0) {
      return this.metodoPago;
    }

    if (this.aPagar() === 0) {
      return 'Crédito';
    }

    return this.metodoPago + ' + Crédito';
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
    this.butacaOcupada.set(false);

    const resultado = await this.compraService.confirmarCompra(
      this.reservaService.funcionId()!,
      this.butacas(),
      this.carritoCandy(),
      this.metodoPagoFinal(),
      this.total(),
      this.cuponAplicado()?.id ?? null,
      this.combo(),
      this.creditoUsado(),
      this.datosCanje()
    );

    this.procesando.set(false);

    if (resultado == null) {
      this.errorConfirmar.set(true);
      return;
    }

    // Otra persona compró alguna de estas butacas mientras tanto
    if (resultado === 'ocupada') {
      this.butacaOcupada.set(true);
      return;
    }

    this.resultado.set(resultado);

    // Con combo, en el PDF se listan los productos que incluye
    const candy = this.combo() ? this.itemsDelCombo() : this.carritoCandy();
    this.resumen.set({ butacas: this.butacas(), candy });
    
    this.reservaService.limpiar()
  }

  // Vuelve a la sala para elegir butacas libres (la lista de ocupadas se recarga)
  volverAButacas() {
    this.router.navigate(['/funcion', this.reservaService.funcionId(), 'butacas']);
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
    if (this.procesando() || this.funcionPasada() || this.bloqueadaPorEdad() || this.butacaOcupada()) {
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
