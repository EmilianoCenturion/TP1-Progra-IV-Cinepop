import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink} from '@angular/router';
import { Peliculas } from '../../servicios/peliculas';
import { Funciones } from '../../servicios/funciones';
import { Location, NgIf, NgFor, DatePipe} from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [NgIf, FormsModule, NgFor, DatePipe, RouterLink],
  selector: 'app-pelicula',
  styleUrl: './pelicula.css',
  templateUrl: './pelicula.html',
})
export class Pelicula implements OnInit{

  pelicula = signal<any | null>(null);

  funciones = signal<any[]>([]);

  funcionSeleccionada = signal<any>(null);

  constructor(private route: ActivatedRoute, 
              private peliculasService: Peliculas,
              private location: Location,
              private funcionesService: Funciones) {}

  ngOnInit() {
    this.route.paramMap.subscribe( async params => {
      const id = params.get('id')
      
      if (!id) {
        this.location.back();
        return;
      }

      const resultado = await this.peliculasService.getPelicula(Number(id))
      const resultadoFunciones = await this.funcionesService.getFuncionesPelicula(Number(id))

      if (!resultado || !resultadoFunciones) {
        this.location.back();
        return;
      }

      this.pelicula.set(resultado);
      this.funciones.set(resultadoFunciones);
    })
  }

  seleccionarFuncion(f: any) {
    this.funcionSeleccionada.set(f);
  }
}
