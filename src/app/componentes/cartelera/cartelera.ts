import { Component, inject, OnInit } from '@angular/core';
import { signal } from '@angular/core';
import { Peliculas } from '../../servicios/peliculas';
import { FormsModule} from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  imports: [FormsModule, NgFor, NgIf, RouterLink],
  selector: 'app-cartelera',
  styleUrl: './cartelera.css',
  templateUrl: './cartelera.html',
})
export class Cartelera implements OnInit{
  peliculasService = inject(Peliculas);
  activatedRoute = inject(ActivatedRoute);

  filtro = "";

  filtroHome = "";

  generos = signal<any[]>([]);

  generosSeleccionados = signal<number[]>([]);

  peliculas = signal<any[]>([]);

  peliculasFiltradas = signal<any[]>([]);

  async ngOnInit() {
    this.peliculas.set(await this.peliculasService.getPeliculas());
    this.generos.set(await this.peliculasService.getGeneros());

    this.activatedRoute.queryParamMap.subscribe( params => {
      this.filtro = params.get('buscar') || "";
      this.filtrarPelicula();
    })
  }

  filtrarPelicula() {
    const resultado = this.peliculas().filter(pelicula => {
      const cumpleTexto = pelicula.nombre.toLowerCase().includes(this.filtro.toLowerCase());

      if (cumpleTexto === false) {
        return false;
      }

      if (this.generosSeleccionados().length === 0) {
        return true;
      }

      return pelicula.peliculas_generos.some((pg: any) => this.generosSeleccionados().includes(pg.genero_id));
    });

    this.peliculasFiltradas.set(resultado);
  }

  seleccionaGenero(id: number) {
    const actual = this.generosSeleccionados();
    const nuevaLista: number[] = [];

    let encontrado = false;

    for (let generoId of actual) {
      if (generoId === id) {
        encontrado = true;
      } else {
        nuevaLista.push(generoId);
      }
    }

    if ( encontrado === false) {
      nuevaLista.push(id);
    }

    this.generosSeleccionados.set(nuevaLista);
    this.filtrarPelicula();
  }
}
