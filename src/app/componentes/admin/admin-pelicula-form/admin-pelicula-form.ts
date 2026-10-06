import { Component, inject, OnInit, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Peliculas } from '../../../servicios/peliculas';
import { Actividad } from '../../../servicios/actividad';
import { fechaValidator } from '../../../validadores/fecha-valida';
import { ConCambiosSinGuardar } from '../../../guards/cambios-sin-guardar-guard';

@Component({
  imports: [NgFor, NgIf, ReactiveFormsModule],
  selector: 'app-admin-pelicula-form',
  styleUrl: './admin-pelicula-form.css',
  templateUrl: './admin-pelicula-form.html',
})
export class AdminPeliculaForm implements OnInit, ConCambiosSinGuardar {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private peliculasService = inject(Peliculas);
  private actividad = inject(Actividad);

  generos = signal<any[]>([]);
  editando = signal<any>(null);      // null = alta
  cargando = signal(true);
  guardando = signal(false);
  error = signal('');

  // Después de guardar se navega a la lista: esto evita que el guard pregunte
  private guardado = false;

  dias = Array.from({ length: 31 }, (_, i) => i + 1);
  meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  anios = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 5 + i);   // 5 años atrás a +2

  form = this.fb.group({
    nombre: ['', [Validators.required]],
    sinopsis: ['', [Validators.required, Validators.minLength(10)]],
    imagen_url: ['', [Validators.required]],
    duracion: [null as number | null, [Validators.required, Validators.min(1)]],
    formato: ['2D', [Validators.required]],
    idioma: ['Castellano', [Validators.required]],
    clasificacion_edad: [0, [Validators.required]],
    precio_normal: [null as number | null, [Validators.required, Validators.min(1)]],
    precio_preventa: [null as number | null, [Validators.required, Validators.min(1)]],
    diaEstreno: [null as number | null, [Validators.required]],
    mesEstreno: [null as number | null, [Validators.required]],
    anioEstreno: [null as number | null, [Validators.required]],
    generos: [[] as number[], [Validators.required]],
  }, { validators: fechaValidator('diaEstreno', 'mesEstreno', 'anioEstreno') });

  async ngOnInit() {
    this.generos.set(await this.peliculasService.getGeneros());

    this.route.paramMap.subscribe(async params => {
      const id = params.get('id');

      // Sin :id en la URL = película nueva
      if (!id) {
        this.cargando.set(false);
        return;
      }

      const p = await this.peliculasService.getPeliculaAdmin(Number(id));

      if (!p) {
        this.guardado = true;
        this.router.navigate(['/admin/peliculas']);
        return;
      }

      const estreno = new Date(p.fecha_estreno);

      this.editando.set(p);
      this.form.reset({
        nombre: p.nombre,
        sinopsis: p.sinopsis,
        imagen_url: p.imagen_url,
        duracion: p.duracion,
        formato: p.formato,
        idioma: p.idioma,
        clasificacion_edad: p.clasificacion_edad,
        precio_normal: p.precio_normal,
        precio_preventa: p.precio_preventa,
        diaEstreno: estreno.getDate(),
        mesEstreno: estreno.getMonth() + 1,
        anioEstreno: estreno.getFullYear(),
        generos: p.peliculas_generos.map((pg: any) => pg.genero_id),
      });
      this.cargando.set(false);
    });
  }

  // Lo usa el guard canDeactivate
  tieneCambiosSinGuardar() {
    return this.form.dirty && !this.guardado;
  }

  generoElegido(id: number) {
    return this.form.value.generos!.includes(id);
  }

  toggleGenero(id: number) {
    const actuales = this.form.value.generos!;
    const nuevos = actuales.includes(id) ? actuales.filter(g => g !== id) : [...actuales, id];

    this.form.patchValue({ generos: nuevos });
    this.form.get('generos')!.markAsTouched();
    this.form.markAsDirty();   // patchValue no marca "dirty": sin esto el guard no se enteraría
  }

  cancelar() {
    this.router.navigate(['/admin/peliculas']);   // si hay cambios, el guard pregunta
  }

  async guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set('');

    const v = this.form.value;
    const dosDigitos = (n: number) => String(n).padStart(2, '0');

    const datos = {
      nombre: v.nombre!.trim(),
      sinopsis: v.sinopsis!.trim(),
      imagen_url: v.imagen_url!.trim(),
      duracion: v.duracion,
      formato: v.formato,
      idioma: v.idioma,
      clasificacion_edad: v.clasificacion_edad,
      precio_normal: v.precio_normal,
      precio_preventa: v.precio_preventa,
      fecha_estreno: `${v.anioEstreno}-${dosDigitos(v.mesEstreno!)}-${dosDigitos(v.diaEstreno!)}T00:00:00`,
    };

    const anterior = this.editando();
    let ok;

    if (anterior) {
      ok = await this.peliculasService.actualizarPelicula(anterior.id, datos, v.generos!);
      if (ok) {
        await this.registrarEdicion(anterior, datos);
      }
    } else {
      ok = await this.peliculasService.crearPelicula(datos, v.generos!);
      if (ok) {
        await this.actividad.registrar(`Creó la película "${datos.nombre}"`);
      }
    }

    this.guardando.set(false);

    if (!ok) {
      this.error.set('No se pudo guardar la película.');
      return;
    }

    this.guardado = true;
    // "state" viaja con la navegación: la lista lo lee para mostrar el mensaje
    this.router.navigate(['/admin/peliculas'], {
      state: { mensaje: anterior ? 'Película actualizada.' : 'Película creada.' }
    });
  }

  // Un solo registro por edición; si cambió algún precio, se detalla en el mismo mensaje
  private async registrarEdicion(anterior: any, datos: any) {
    let mensaje = `Editó la película "${datos.nombre}"`;

    if (anterior.precio_normal !== datos.precio_normal) {
      mensaje += `. Precio normal: de $${anterior.precio_normal} a $${datos.precio_normal}`;
    }

    if (anterior.precio_preventa !== datos.precio_preventa) {
      mensaje += `. Precio de preventa: de $${anterior.precio_preventa} a $${datos.precio_preventa}`;
    }

    await this.actividad.registrar(mensaje);
  }
}