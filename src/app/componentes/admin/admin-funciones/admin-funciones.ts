import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Peliculas } from '../../../servicios/peliculas';
import { Salas } from '../../../servicios/salas';
import { Funciones } from '../../../servicios/funciones';
import { Actividad } from '../../../servicios/actividad';
import { fechaValidator } from '../../../validadores/fecha-valida';
import { ConCambiosSinGuardar } from '../../../guards/cambios-sin-guardar-guard';
import { aTextoLocal } from '../../../utils/fechas';
import { buscarSalaLibre, calcularOcupacion, Ocupacion } from '../../../utils/asignar-sala';

@Component({
  imports: [NgFor, NgIf, DatePipe, ReactiveFormsModule],
  selector: 'app-admin-funciones',
  styleUrl: './admin-funciones.css',
  templateUrl: './admin-funciones.html',
})
export class AdminFunciones implements OnInit, ConCambiosSinGuardar {
  private fb = inject(FormBuilder);
  private peliculasService = inject(Peliculas);
  private salasService = inject(Salas);
  private funcionesService = inject(Funciones);
  private actividad = inject(Actividad);

  peliculas = signal<any[]>([]);
  salas = signal<any[]>([]);
  proximas = signal<any[]>([]);

  // Vista previa: lo que se va a crear y las fechas que no tienen sala
  plan = signal<{ fecha: Date; salaId: number; salaNombre: string }[]>([]);
  sinSala = signal<Date[]>([]);

  mensaje = signal('');
  error = signal('');
  trabajando = signal(false);

  // getDay(): 0 = domingo, 1 = lunes ... 6 = sábado
  diasSemana = [
    { valor: 1, nombre: 'Lun' }, { valor: 2, nombre: 'Mar' }, { valor: 3, nombre: 'Mié' },
    { valor: 4, nombre: 'Jue' }, { valor: 5, nombre: 'Vie' }, { valor: 6, nombre: 'Sáb' },
    { valor: 0, nombre: 'Dom' },
  ];
  horas = Array.from({ length: 14 }, (_, i) => i + 10);     // 10 a 23
  minutos = [0, 15, 30, 45];
  dias = Array.from({ length: 31 }, (_, i) => i + 1);
  meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  anios = [new Date().getFullYear(), new Date().getFullYear() + 1];
  opcionesSemanas = [1, 2, 3, 4, 5, 6, 7, 8];

  form = this.fb.group({
    peliculaId: [null as number | null, [Validators.required]],
    diasElegidos: [[] as number[], [Validators.required]],
    hora: [18, [Validators.required]],
    minuto: [0, [Validators.required]],
    diaDesde: [new Date().getDate(), [Validators.required]],
    mesDesde: [new Date().getMonth() + 1, [Validators.required]],
    anioDesde: [new Date().getFullYear(), [Validators.required]],
    semanas: [2, [Validators.required]],
  }, { validators: fechaValidator('diaDesde', 'mesDesde', 'anioDesde') });

  async ngOnInit() {
    const todas = await this.peliculasService.getPeliculasAdmin();
    this.peliculas.set(todas.filter((p: any) => p.activa));
    this.salas.set(await this.salasService.getSalas());
    await this.cargarProximas();
  }

  async cargarProximas() {
    this.proximas.set(await this.funcionesService.getProximasFunciones());
  }

  tieneCambiosSinGuardar() {
    return this.form.dirty || this.plan().length > 0;
  }

  diaElegido(valor: number) {
    return this.form.value.diasElegidos!.includes(valor);
  }

  toggleDia(valor: number) {
    const actuales = this.form.value.diasElegidos!;
    const nuevos = actuales.includes(valor) ? actuales.filter(d => d !== valor) : [...actuales, valor];

    this.form.patchValue({ diasElegidos: nuevos });
    this.form.get('diasElegidos')!.markAsTouched();
    this.form.markAsDirty();
    this.limpiarPlan();
  }

  // Paso 1: calcular fechas y asignar salas (todavía no guarda nada)
  async verFunciones() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.limpiarMensajes();
    this.limpiarPlan();

    const v = this.form.value;
    const pelicula = this.peliculas().find(p => p.id === v.peliculaId);
    const fechas = this.generarFechas();

    if (fechas.length === 0) {
      this.error.set('No hay fechas futuras que coincidan con esos días.');
      return;
    }

    this.trabajando.set(true);

    // Funciones que ya existen alrededor de esas fechas (un día antes y después, por las que cruzan la medianoche)
    const desde = new Date(fechas[0].getTime() - 24 * 3600000);
    const hasta = new Date(fechas[fechas.length - 1].getTime() + 24 * 3600000);
    const existentes = await this.funcionesService.getFuncionesEntre(desde, hasta);

    this.trabajando.set(false);

    if (existentes == null) {
      this.error.set('No se pudieron consultar las funciones existentes.');
      return;
    }

    const ocupadas: Ocupacion[] = existentes.map((f: any) =>
      calcularOcupacion(f.sala_id, new Date(f.fecha_hora), f.peliculas.duracion)
    );

    const plan: { fecha: Date; salaId: number; salaNombre: string }[] = [];
    const sinSala: Date[] = [];

    for (const fecha of fechas) {
      const salaId = buscarSalaLibre(this.salas(), ocupadas, fecha, pelicula.duracion);

      if (salaId == null) {
        sinSala.push(fecha);
        continue;
      }

      plan.push({ fecha, salaId, salaNombre: this.salas().find(s => s.id === salaId).nombre });
      // La nueva también ocupa la sala: así las del mismo lote no se pisan entre sí
      ocupadas.push(calcularOcupacion(salaId, fecha, pelicula.duracion));
    }

    this.plan.set(plan);
    this.sinSala.set(sinSala);
  }

  // Paso 2: guardar lo que muestra la vista previa
  async confirmar() {
    const v = this.form.value;
    const pelicula = this.peliculas().find(p => p.id === v.peliculaId);

    this.trabajando.set(true);

    const ok = await this.funcionesService.crearFunciones(
      this.plan().map(p => ({ pelicula_id: pelicula.id, sala_id: p.salaId, fecha_hora: aTextoLocal(p.fecha) }))
    );

    this.trabajando.set(false);

    if (!ok) {
      this.error.set('No se pudieron crear las funciones.');
      return;
    }

    const dias = this.diasSemana.filter(d => v.diasElegidos!.includes(d.valor)).map(d => d.nombre).join(', ');
    const hora = `${String(v.hora).padStart(2, '0')}:${String(v.minuto).padStart(2, '0')}`;
    await this.actividad.registrar(`Creó ${this.plan().length} funciones de "${pelicula.nombre}" (${dias} ${hora})`);

    this.mensaje.set(`Se crearon ${this.plan().length} funciones.`);
    this.limpiarPlan();
    this.form.markAsPristine();
    await this.cargarProximas();
  }

  async eliminar(f: any) {
    this.limpiarMensajes();

    if (f.entradas[0].count > 0) {
      this.error.set('Esa función tiene entradas vendidas: no se puede eliminar.');
      return;
    }

    if (!confirm(`¿Eliminar la función de "${f.peliculas.nombre}"?`)) {
      return;
    }

    const ok = await this.funcionesService.eliminarFuncion(f.id);

    if (!ok) {
      this.error.set('No se pudo eliminar la función.');
      return;
    }

    await this.actividad.registrar(`Eliminó la función de "${f.peliculas.nombre}" del ${aTextoLocal(new Date(f.fecha_hora)).replace('T', ' ').slice(0, 16)} en ${f.salas.nombre}`);
    await this.cargarProximas();
  }

  limpiarPlan() {
    this.plan.set([]);
    this.sinSala.set([]);
  }

  // Todas las fechas entre "desde" y "desde + N semanas" que caen en los días elegidos, a la hora elegida
  private generarFechas(): Date[] {
    const v = this.form.value;
    const ahora = new Date();
    const fechas: Date[] = [];

    for (let i = 0; i < v.semanas! * 7; i++) {
      const fecha = new Date(v.anioDesde!, v.mesDesde! - 1, v.diaDesde! + i, v.hora!, v.minuto!);

      if (v.diasElegidos!.includes(fecha.getDay()) && fecha > ahora) {
        fechas.push(fecha);
      }
    }

    return fechas;
  }

  private limpiarMensajes() {
    this.mensaje.set('');
    this.error.set('');
  }
}