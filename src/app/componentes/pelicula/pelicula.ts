import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink} from '@angular/router';
import { Peliculas } from '../../servicios/peliculas';
import { Funciones } from '../../servicios/funciones';
import { Location, NgIf, NgFor, DatePipe} from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../../servicios/auth';
import { Resenas } from '../../servicios/resenas';

@Component({
  imports: [NgIf, FormsModule, ReactiveFormsModule, NgFor, DatePipe, RouterLink],
  selector: 'app-pelicula',
  styleUrl: './pelicula.css',
  templateUrl: './pelicula.html',
})
export class Pelicula implements OnInit{
  
  estrellas = [1, 2, 3, 4, 5];

  pelicula = signal<any | null>(null);

  funciones = signal<any[]>([]);

  funcionSeleccionada = signal<any>(null);

  // Reseña del usuario: 'cargando' | 'login' | 'no-vio' | 'ya-reseno' | 'puede'
  estadoResena = signal('cargando');
  mensajeResena = signal('');
  errorResena = signal('');
  enviandoResena = signal(false);
  private usuarioId: string | null = null;
  private fb = inject(FormBuilder);

  formResena = this.fb.group({
    calificacion: [0, [Validators.min(1)]],
    comentario: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
  });

  constructor(private route: ActivatedRoute, 
              private peliculasService: Peliculas,
              private location: Location,
              private funcionesService: Funciones,
              private auth: Auth,
              private resenasService: Resenas) {}

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

      await this.verificarResena(Number(id));
    })
  }

  // Decide si el usuario puede reseñar esta película y, si no, por qué
  async verificarResena(peliculaId: number) {
    const perfil = await this.auth.getPerfil();

    // Solo los clientes registrados tienen perfil en "usuarios"
    if (!perfil) {
      this.estadoResena.set('login');
      return;
    }

    this.usuarioId = perfil.id;

    if (await this.resenasService.yaReseno(perfil.id, peliculaId)) {
      this.estadoResena.set('ya-reseno');
      return;
    }

    if (!(await this.resenasService.vioLaPelicula(perfil.id, peliculaId))) {
      this.estadoResena.set('no-vio');
      return;
    }

    this.estadoResena.set('puede');
  }

  elegirCalificacion(n: number) {
    this.formResena.patchValue({ calificacion: n });
  }

  async enviarResena() {
    if (this.formResena.invalid) {
      this.formResena.markAllAsTouched();
      return;
    }

    this.enviandoResena.set(true);
    this.errorResena.set('');
    const peliculaId = this.pelicula().id;
    const v = this.formResena.value;

    const ok = await this.resenasService.crearResena(this.usuarioId!, peliculaId, v.calificacion!, v.comentario!.trim());

    this.enviandoResena.set(false);

    if (!ok) {
      this.errorResena.set('No se pudo guardar la reseña. Probá de nuevo.');
      return;
    }

    // Se vuelve a pedir la película para que aparezca la reseña nueva y se recalcule el promedio
    this.pelicula.set(await this.peliculasService.getPelicula(peliculaId));
    this.estadoResena.set('ya-reseno');
    this.mensajeResena.set('¡Gracias por tu reseña!');
  }

  seleccionarFuncion(f: any) {
    this.funcionSeleccionada.set(f);
  }
}