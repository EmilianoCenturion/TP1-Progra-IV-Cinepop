import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Peliculas } from '../../../servicios/peliculas';
import { Actividad } from '../../../servicios/actividad';
import { fechaValidator } from '../../../validadores/fecha-valida';

@Component({
  imports: [NgFor, NgIf, DatePipe, ReactiveFormsModule],
  selector: 'app-admin-peliculas',
  styleUrl: './admin-peliculas.css',
  templateUrl: './admin-peliculas.html',
})
export class AdminPeliculas implements OnInit {
  private fb = inject(FormBuilder);
  private peliculasService = inject(Peliculas);
  private actividad = inject(Actividad);

  peliculas = signal<any[]>([]);
  generos = signal<any[]>([]);
  mostrarForm = signal(false);
  editando = signal<any>(null);        // null = alta, si no, la película que se edita
  mensaje = signal('');
  error = signal('');
  guardando = signal(false);

  dias = Array.from({ length: 31 }, (_, i) => i + 1);
  meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  anios = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i);   // año pasado a +2

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
    generos: [[] as number[], [Validators.required]],   // required en un array = al menos uno
  }, { validators: fechaValidator('diaEstreno', 'mesEstreno', 'anioEstreno') });

  async ngOnInit() {
    await this.cargar();
    this.generos.set(await this.peliculasService.getGeneros());
  }

  async cargar() {
    this.peliculas.set(await this.peliculasService.getPeliculasAdmin());
  }

  nueva() {
    this.editando.set(null);
    this.form.reset({ formato: '2D', idioma: 'Castellano', clasificacion_edad: 0, generos: [] });
    this.limpiarMensajes();
    this.mostrarForm.set(true);
  }

  editar(p: any) {
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
    this.limpiarMensajes();
    this.mostrarForm.set(true);
  }

  cancelar() {
    this.mostrarForm.set(false);
  }

  generoElegido(id: number) {
    return this.form.value.generos!.includes(id);
  }

  toggleGenero(id: number) {
    const actuales = this.form.value.generos!;
    const nuevos = actuales.includes(id) ? actuales.filter(g => g !== id) : [...actuales, id];

    this.form.patchValue({ generos: nuevos });
    this.form.get('generos')!.markAsTouched();
  }

  async guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();   // muestra en rojo lo que falta
      return;
    }

    this.guardando.set(true);
    this.limpiarMensajes();

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

    this.mensaje.set(anterior ? 'Película actualizada.' : 'Película creada.');
    this.mostrarForm.set(false);
    await this.cargar();
  }

  async cambiarActiva(p: any) {
    const ok = await this.peliculasService.cambiarActiva(p.id, !p.activa);

    if (!ok) {
      this.error.set('No se pudo cambiar el estado.');
      return;
    }

    await this.actividad.registrar(`${p.activa ? 'Ocultó' : 'Publicó'} la película "${p.nombre}"`);
    await this.cargar();
  }

  // Los cambios de precio se registran aparte (lo pide la consigna)
  private async registrarEdicion(anterior: any, datos: any) {
    if (anterior.precio_normal !== datos.precio_normal) {
      await this.actividad.registrar(`Cambió el precio normal de "${datos.nombre}" de $${anterior.precio_normal} a $${datos.precio_normal}`);
    }

    if (anterior.precio_preventa !== datos.precio_preventa) {
      await this.actividad.registrar(`Cambió el precio de preventa de "${datos.nombre}" de $${anterior.precio_preventa} a $${datos.precio_preventa}`);
    }

    await this.actividad.registrar(`Editó la película "${datos.nombre}"`);
  }

  async eliminar(p: any) {
    this.limpiarMensajes();

    if (!(await this.peliculasService.puedeEliminar(p.id))) {
      this.error.set(`"${p.nombre}" tiene funciones o reseñas: no se puede eliminar, ocultala.`);
      return;
    }

    if (!confirm(`¿Eliminar "${p.nombre}"? No se puede deshacer.`)) {
      return;
    }

    const ok = await this.peliculasService.eliminarPelicula(p.id);

    if (!ok) {
      this.error.set('No se pudo eliminar la película.');
      return;
    }

    await this.actividad.registrar(`Eliminó la película "${p.nombre}"`);
    this.mensaje.set('Película eliminada.');
    await this.cargar();
}

  private limpiarMensajes() {
    this.mensaje.set('');
    this.error.set('');
  }
}