import { Component, inject, OnInit } from '@angular/core';
import { Peliculas } from '../../servicios/peliculas';
import { Resenas } from '../../servicios/resenas';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { Router} from '@angular/router';
import { CardPelicula } from '../card-pelicula/card-pelicula';
import { Candys } from '../../servicios/candys';
import { Reserva } from '../../servicios/reserva';

@Component({
  imports: [NgFor, NgIf, FormsModule, CardPelicula],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home implements OnInit {
  router = inject(Router)
  peliculasService = inject(Peliculas);
  resenasService = inject(Resenas);
  candyService = inject(Candys);
  reserva = inject(Reserva);

  combos = signal<any[]>([]);

  resenas = signal<any[]>([]);

  filtro = "";

  generos = signal<any[]>([]);

  peliculasFiltradas = signal<any[]>([]);

  generosSeleccionados = signal<number[]>([]);

  estrellas = [1, 2, 3, 4, 5]; 

  top3 = signal<any[]>([])

  peliculas = signal<any[]>([]);

  async ngOnInit() {
    this.peliculas.set(await this.peliculasService.getPeliculas());
    this.top3.set(await this.peliculasService.tresPeliculasMasVendidas());
    this.resenas.set(await this.resenasService.getResenas());
    this.combos.set(await this.candyService.getCombosActivos());
  }

  // Empieza una compra con combo: se guarda en Reserva y se va a elegir la película
  elegirCombo(combo: any) {
    this.reserva.limpiar();
    this.reserva.setCombo(combo);
    this.router.navigate(['/cartelera']);
  }

  // "1 Pochoclo grande, 2 Gaseosa"
  productosDelCombo(combo: any) {
    const partes: string[] = [];

    for (let cp of combo.combos_productos) {
      partes.push(`${cp.cantidad} ${cp.productos_candy.nombre}`);
    }

    return partes.join(', ');
  }

  verPelicula(id: number) {
    this.router.navigate(['/pelicula', id]);
  }
}