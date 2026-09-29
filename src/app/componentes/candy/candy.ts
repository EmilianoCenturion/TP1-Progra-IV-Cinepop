import { Location, NgFor, NgIf } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Candys } from '../../servicios/candys';
import { Reserva } from '../../servicios/reserva';
import { Router } from '@angular/router';

@Component({
  imports: [NgFor, NgIf],
  selector: 'app-candy',
  styleUrl: './candy.css',
  templateUrl: './candy.html',
})
export class Candy {

  categorias = signal<any[]>([]);
  carrito = signal<any[]>([]);

  constructor (
    private candyService: Candys, 
    private location: Location,
    private reserva: Reserva,
    private router: Router
  ) { }

  async ngOnInit () {
    const resultado = await this.candyService.getCategoriasConProductos();

    if (!resultado) {
      this.location.back()
      return;
    }

    this.categorias.set(resultado);
  }

  agregar(producto: any) {
    const actual = this.carrito();
    const nuevaLista: any[] = [];
    let encontrado = false;

    for (let item of actual) {
      if (item.producto.id === producto.id) {
        nuevaLista.push({ producto: item.producto, cantidad: item.cantidad + 1});
        encontrado = true;
      } else {
        nuevaLista.push(item);
      }
    }

    if (!encontrado) {
      nuevaLista.push({producto, cantidad: 1});
    }

    this.carrito.set(nuevaLista);
  }

  quitar(producto: any) {
    const actual = this.carrito();
    const nuevaLista: any[] = [];

    for (let item of actual) {
      if(item.producto.id === producto.id) {
        if (item.cantidad > 1) {
          nuevaLista.push({ producto: item.producto, cantidad: item.cantidad - 1 })
        } 
      } else {
          nuevaLista.push(item);
      }
    }

    this.carrito.set(nuevaLista);
  }

  cantidadEnCarrito(productoId: number) {
    const item = this.carrito().find(i => i.producto.id === productoId)

    return item ? item.cantidad: 0;
  }

  total() { 
    let suma = 0;

    for (let item of this.carrito()) {
      suma += item.producto.precio * item.cantidad;
    }

    return suma;
  }

  continuar() {
    this.reserva.setCarrito(this.carrito());
    this.router.navigate(['/funcion', this.reserva.funcionId(), 'checkout']);
  }
}
