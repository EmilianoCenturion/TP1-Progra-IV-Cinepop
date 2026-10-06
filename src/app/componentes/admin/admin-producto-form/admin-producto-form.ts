import { Component, inject, OnInit, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Candys } from '../../../servicios/candys';
import { Actividad } from '../../../servicios/actividad';
import { ConCambiosSinGuardar } from '../../../guards/cambios-sin-guardar-guard';

@Component({
  imports: [NgFor, NgIf, ReactiveFormsModule],
  selector: 'app-admin-producto-form',
  styleUrl: './admin-producto-form.css',
  templateUrl: './admin-producto-form.html',
})
export class AdminProductoForm implements OnInit, ConCambiosSinGuardar {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private candyService = inject(Candys);
  private actividad = inject(Actividad);

  categorias = signal<any[]>([]);
  editando = signal<any>(null);      // null = alta
  cargando = signal(true);
  guardando = signal(false);
  error = signal('');

  // Después de guardar se navega a la lista: evita que el guard pregunte
  private guardado = false;

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    precio: [null as number | null, [Validators.required, Validators.min(1)]],
    categoria_id: [null as number | null, [Validators.required]],
    imagen_ruta: ['', [Validators.required]],
  });

  async ngOnInit() {
    this.categorias.set(await this.candyService.getCategorias());

    this.route.paramMap.subscribe(async params => {
      const id = params.get('id');

      // Sin :id en la URL = producto nuevo
      if (!id) {
        this.cargando.set(false);
        return;
      }

      const p = await this.candyService.getProducto(Number(id));

      if (!p) {
        this.guardado = true;
        this.router.navigate(['/admin/candy']);
        return;
      }

      this.editando.set(p);
      this.form.reset({
        nombre: p.nombre,
        precio: p.precio,
        categoria_id: p.categoria_id,
        imagen_ruta: p.imagen_ruta,
      });
      this.cargando.set(false);
    });
  }

  // Lo usa el guard canDeactivate
  tieneCambiosSinGuardar() {
    return this.form.dirty && !this.guardado;
  }

  cancelar() {
    this.router.navigate(['/admin/candy']);   // si hay cambios, el guard pregunta
  }

  async guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set('');

    const v = this.form.value;
    const datos = {
      nombre: v.nombre!.trim(),
      precio: v.precio,
      categoria_id: v.categoria_id,
      imagen_ruta: v.imagen_ruta!.trim(),
    };

    const anterior = this.editando();

    const error = anterior
      ? await this.candyService.actualizarProducto(anterior.id, datos)
      : await this.candyService.crearProducto(datos);

    this.guardando.set(false);

    if (error != null) {
      // 23505 = nombre repetido (productos_candy.nombre es unique)
      this.error.set(error.code === '23505' ? 'Ya existe un producto con ese nombre.' : 'No se pudo guardar el producto.');
      return;
    }

    if (anterior) {
      let mensaje = `Editó el producto de candy "${datos.nombre}"`;

      if (anterior.precio !== datos.precio) {
        mensaje += `. Precio: de $${anterior.precio} a $${datos.precio}`;
      }

      await this.actividad.registrar(mensaje);
    } else {
      await this.actividad.registrar(`Creó el producto de candy "${datos.nombre}"`);
    }

    this.guardado = true;
    this.router.navigate(['/admin/candy'], {
      state: { mensaje: anterior ? 'Producto actualizado.' : 'Producto creado.' }
    });
  }
}