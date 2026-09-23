import { Component, inject, OnInit } from '@angular/core';
import { Peliculas } from '../../servicios/peliculas';
import { Resenas } from '../../servicios/resenas';
import { NgFor , NgIf} from '@angular/common';
import { FormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  imports: [NgFor, NgIf, FormsModule, RouterLink],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home implements OnInit {
  router = inject(Router)
  peliculasService = inject(Peliculas);
  resenasService = inject(Resenas);

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
  }
}
