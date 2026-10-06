import { Component, inject, OnInit, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Candys } from '../../../servicios/candys';
import { Actividad } from '../../../servicios/actividad';
import { ConCambiosSinGuardar } from '../../../guards/cambios-sin-guardar-guard';

@Component({
  imports: [NgFor, NgIf, ReactiveFormsModule],
  selector: 'app-admin-combo-form',
  styleUrl: './admin-combo-form.css',
  templateUrl: './admin-combo-form.html',
})
export class AdminComboForm implements OnInit, ConCambiosSinGuardar {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private candyService = inject(Candys);
  private actividad = inject(Actividad);

  productos = signal<any[]>([]);
  editando = signal<any>(null);      // null = alta
  cargando = signal(true);
  guardando = signal(false);
  error = signal('');

  // Productos que lleva el combo: { producto_id, nombre, cantidad }
  items = signal<any[]>([]);

  // Después de guardar se navega a la lista: evita que el guard pregunte
  private guardado = false;
  // Agregar o quitar productos no ensucia el form: lo marcamos a mano para el guard
  private itemsCambiaron = false;

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    precio: [null as number | null, [Validators.required, Validators.min(1)]],
    cantidad_entradas: [1, [Validators.required, Validators.min(1)]],
    imagen_ruta: ['', [Validators.required]],
  });

  // Mini formulario para agregar un producto al combo
  formItem = this.fb.group({
    producto_id: [null as number | null, [Validators.required]],
    cantidad: [1, [Validators.required, Validators.min(1)]],
  });

  async ngOnInit() {
    this.productos.set(await this.candyService.getProductosAdmin());

    this.route.paramMap.subscribe(async params => {
      const id = params.get('id');

      // Sin :id en la URL = combo nuevo
      if (!id) {
        this.cargando.set(false);
        return;
      }

      const c = await this.candyService.getCombo(Number(id));

      if (!c) {
        this.guardado = true;
        this.router.navigate(['/admin/candy']);
        return;
      }

      this.editando.set(c);
      this.form.reset({
        nombre: c.nombre,
        precio: c.precio,
        cantidad_entradas: c.cantidad_entradas,
        imagen_ruta: c.imagen_ruta,
      });

      const items = [];

      for (let cp of c.combos_productos) {
        items.push({ producto_id: cp.producto_id, nombre: this.nombreProducto(cp.producto_id), cantidad: cp.cantidad });
      }

      this.items.set(items);
      this.cargando.set(false);
    });
  }

  // Lo usa el guard canDeactivate
  tieneCambiosSinGuardar() {
    return (this.form.dirty || this.itemsCambiaron) && !this.guardado;
  }

  agregarItem() {
    if (this.formItem.invalid) {
      this.formItem.markAllAsTouched();
      return;
    }

    const productoId = this.formItem.value.producto_id!;
    const cantidad = this.formItem.value.cantidad!;
    const nuevaLista = [];
    let encontrado = false;

    // Si el producto ya estaba, se suma la cantidad
    for (let item of this.items()) {
      if (item.producto_id === productoId) {
        nuevaLista.push({ producto_id: productoId, nombre: item.nombre, cantidad: item.cantidad + cantidad });
        encontrado = true;
      } else {
        nuevaLista.push(item);
      }
    }

    if (!encontrado) {
      nuevaLista.push({ producto_id: productoId, nombre: this.nombreProducto(productoId), cantidad });
    }

    this.items.set(nuevaLista);
    this.itemsCambiaron = true;
    this.formItem.reset({ producto_id: null, cantidad: 1 });
  }

  quitarItem(productoId: number) {
    const nuevaLista = [];

    for (let item of this.items()) {
      if (item.producto_id !== productoId) {
        nuevaLista.push(item);
      }
    }

    this.items.set(nuevaLista);
    this.itemsCambiaron = true;
  }

  cancelar() {
    this.router.navigate(['/admin/candy']);   // si hay cambios, el guard pregunta
  }

  async guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.items().length === 0) {
      this.error.set('Agregá al menos un producto al combo.');
      return;
    }

    this.guardando.set(true);
    this.error.set('');

    const v = this.form.value;
    const datos = {
      nombre: v.nombre!.trim(),
      precio: v.precio,
      cantidad_entradas: v.cantidad_entradas,
      imagen_ruta: v.imagen_ruta!.trim(),
    };

    const anterior = this.editando();

    // Un combo nuevo arranca activo
    const error = anterior
      ? await this.candyService.actualizarCombo(anterior.id, datos, this.items())
      : await this.candyService.crearCombo(datos, this.items());

    this.guardando.set(false);

    if (error != null) {
      // 23505 = nombre repetido (combos.nombre es unique)
      this.error.set(error.code === '23505' ? 'Ya existe un combo con ese nombre.' : 'No se pudo guardar el combo.');
      return;
    }

    if (anterior) {
      let mensaje = `Editó el combo "${datos.nombre}"`;

      if (anterior.precio !== datos.precio) {
        mensaje += `. Precio: de $${anterior.precio} a $${datos.precio}`;
      }

      await this.actividad.registrar(mensaje);
    } else {
      await this.actividad.registrar(`Creó el combo "${datos.nombre}"`);
    }

    this.guardado = true;
    this.router.navigate(['/admin/candy'], {
      state: { mensaje: anterior ? 'Combo actualizado.' : 'Combo creado.' }
    });
  }

  private nombreProducto(id: number) {
    const producto = this.productos().find(p => p.id === id);
    return producto ? producto.nombre : '';
  }
}