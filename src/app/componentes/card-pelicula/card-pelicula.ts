import { NgFor, NgIf } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  imports: [NgIf, NgFor],
  selector: 'app-card-pelicula',
  styleUrl: './card-pelicula.css',
  templateUrl: './card-pelicula.html',
})
export class CardPelicula {

  pelicula = input.required<any>();

  seleccionada = output<number>();

  seleccionar() {
    this.seleccionada.emit(this.pelicula().id);
  }
}
