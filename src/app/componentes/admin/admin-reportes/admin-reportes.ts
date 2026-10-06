import { Component, inject, OnInit, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Reportes } from '../../../servicios/reportes';

@Component({
  imports: [NgFor, NgIf, FormsModule],
  selector: 'app-admin-reportes',
  styleUrl: './admin-reportes.css',
  templateUrl: './admin-reportes.html',
})
export class AdminReportes implements OnInit {
  private reportesService = inject(Reportes);

  cargando = signal(true);
  periodo = '30';

  periodos = [
    { valor: '7', nombre: 'Últimos 7 días' },
    { valor: '30', nombre: 'Últimos 30 días' },
    { valor: 'todo', nombre: 'Todo' },
  ];

  // Resultados de cada reporte
  resumen = signal({ facturacion: 0, compras: 0, entradas: 0, promedio: 0 });
  porDia = signal<any[]>([]);
  porPelicula = signal<any[]>([]);
  candy = signal<any[]>([]);

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);

    const compras = await this.reportesService.getCompras(this.fechaDesde());

    this.calcularResumen(compras);
    this.calcularPorDia(compras);
    this.calcularPorPelicula(compras);
    this.calcularCandy(compras);

    this.cargando.set(false);
  }

  private calcularResumen(compras: any[]) {
    let facturacion = 0;
    let entradas = 0;

    for (let c of compras) {
      facturacion += c.total_pagado;
      entradas += c.entradas.length;
    }

    const promedio = compras.length > 0 ? Math.round(facturacion / compras.length) : 0;

    this.resumen.set({ facturacion, compras: compras.length, entradas, promedio });
  }

  // Una fila por día: cantidad de compras y facturación
  private calcularPorDia(compras: any[]) {
    const dias: any[] = [];

    for (let c of compras) {
      // fecha_compra está en UTC: con la "Z" se pasa a la hora local antes de tomar el día
      const dia = new Date(c.fecha_compra + 'Z').toLocaleDateString('es-AR');
      const fila = dias.find(d => d.dia === dia);

      if (fila) {
        fila.compras += 1;
        fila.total += c.total_pagado;
      } else {
        dias.push({ dia, compras: 1, total: c.total_pagado });
      }
    }

    // Las compras vienen de la más nueva a la más vieja, así que los días quedan en ese orden
    this.porDia.set(dias);
  }

  // Entradas vendidas por película, de la más vendida a la menos vendida
  private calcularPorPelicula(compras: any[]) {
    const peliculas: any[] = [];

    for (let c of compras) {
      for (let e of c.entradas) {
        const nombre = e.funciones.peliculas.nombre;
        const fila = peliculas.find(p => p.nombre === nombre);

        if (fila) {
          fila.entradas += 1;
        } else {
          peliculas.push({ nombre, entradas: 1 });
        }
      }
    }

    peliculas.sort((a, b) => b.entradas - a.entradas);
    this.porPelicula.set(peliculas);
  }

  // Productos y combos vendidos, del más vendido al menos vendido
  private calcularCandy(compras: any[]) {
    const items: any[] = [];

    for (let c of compras) {
      for (let item of c.compra_items) {
        // Cada ítem es un producto o un combo (nunca los dos)
        const nombre = item.productos_candy ? item.productos_candy.nombre : item.combos.nombre;
        const tipo = item.productos_candy ? 'Producto' : 'Combo';
        const fila = items.find(i => i.nombre === nombre && i.tipo === tipo);

        if (fila) {
          fila.cantidad += item.cantidad;
          fila.total += item.cantidad * item.precio_unitario;
        } else {
          items.push({ nombre, tipo, cantidad: item.cantidad, total: item.cantidad * item.precio_unitario });
        }
      }
    }

    items.sort((a, b) => b.cantidad - a.cantidad);
    this.candy.set(items);
  }

  // Primer momento del período elegido, o null si es "todo"
  private fechaDesde(): Date | null {
    if (this.periodo === 'todo') {
      return null;
    }

    const hoy = new Date();
    const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    return new Date(inicioDeHoy.getTime() - (Number(this.periodo) - 1) * 24 * 3600000);
  }
}