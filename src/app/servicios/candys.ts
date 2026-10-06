import { inject, Service } from '@angular/core';
import { Auth } from './auth';
import { from, retry } from 'rxjs';

@Service()
export class Candys {
    cliente = inject(Auth);

    // Para el cliente (pantalla de candy en la compra)
    async getCategoriasConProductos() {
        const { data, error } = await this.cliente.client()
        .from('categorias_candy')
        .select('*, productos_candy(*)')
        .order('nombre', { ascending: true})

        if (error != null) {
            console.log(error);
            return null;
        }

        return data;
    }

    // |--------- Admin: categorias

    // Productos_candy(count) trae solo la cantidad de productos de cada categoria
    async getCategorias() {
        const { data, error } = await this.cliente.client()
        .from('categorias_candy')
        .select('id, nombre, productos_candy(count)')
        .order('nombre', { ascending: true })

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }

    // Devuelve el error (o null) para que el componente detecte el error 23505 que es el erorr de nombre rapetido
    async crearCategoria(nombre: string) {
        const { error } = await this.cliente.client()
        .from('categorias_candy')
        .insert( {nombre} )

        return error;
    }

    async eliminarCategoria(id: number) {
        const { error } = await this.cliente.client()
        .from('categorias_candy')
        .delete()
        .eq('id', id)

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }

    // Combos que se ofrecen en el home
    async getCombosActivos() {
        const { data, error } = await this.cliente.client()
        .from('combos')
        .select('*, combos_productos(cantidad, productos_candy(nombre))')
        .eq('activo', true)
        .order('precio', { ascending: true })

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }

    // |----- Admin: productos 

    async getProductosAdmin() {
        const { data, error } = await this.cliente.client()
        .from('productos_candy')
        .select('*, categorias_candy(nombre)')
        .order('categoria_id', { ascending: true })
        .order('nombre', { ascending: true })

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }

    async getProducto(id: number) {
        const { data, error } = await this.cliente.client()
        .from('productos_candy')
        .select('*')
        .eq('id', id)
        .maybeSingle()

        if (error != null) {
            console.log(error);
            return null;
        }
        
        return data;
    }

    async crearProducto(datos: any) {
        const { error } = await this.cliente.client() 
        .from('productos_candy')
        .insert(datos);

        return error;
    }

    async actualizarProducto(id: number, datos: any) {
        const { error } = await this.cliente.client()
        .from('productos_candy')
        .update(datos)
        .eq('id', id)

        return error;
    }

    async puedeEliminarProducto(id:number) {
        const { count: vendidos } = await this.cliente.client()
        .from('compra_items')
        .select('id', { count: 'exact', head: true })
        .eq('producto_id', id)

        const { count: enCombos } = await this.cliente.client()
        .from('combos_productos')
        .select('combo_id', { count: 'exact', head: true })
        .eq('producto_id', id)

        return vendidos === 0 && enCombos === 0;
    }

    async eliminarProducto(id: number) {
        const { error } = await this.cliente.client()
        .from('productos_candy')
        .delete()
        .eq('id', id)

        if (error != null) {
            console.log(error);
            return false;
        }
    
        return true;
    }

    // combos_productos trae los productos de cada combo con su cantidad
    async getCombosAdmin() {
        const { data, error } = await this.cliente.client()
        .from('combos')
        .select('*, combos_productos(cantidad, productos_candy(id, nombre))')
        .order('nombre', { ascending: true })

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }

    async getCombo(id: number) {
        const { data, error } = await this.cliente.client()
        .from('combos')
        .select('*, combos_productos(producto_id, cantidad)')
        .eq('id', id)
        .maybeSingle()

        if (error != null) {
            console.log(error);
            return null;
        }

        return data;
    }

    // items = [{ producto_id, cantidad }]. Devuelve el error (o null)
    async crearCombo(datos: any, items: any[]) {
        const { data: combo, error } = await this.cliente.client()
        .from('combos')
        .insert({ nombre: datos.nombre, precio: datos.precio, cantidad_entradas: datos.cantidad_entradas, imagen_ruta: datos.imagen_ruta, activo: true })
        .select()
        .single()

        if (error != null) {
            return error;
        }

        return await this.guardarProductosDelCombo(combo.id, items);
    }

    async actualizarCombo(id: number, datos: any, items: any[]) {
        const { error } = await this.cliente.client()
        .from('combos')
        .update(datos)
        .eq('id', id)

        if (error != null) {
            return error;
        }

        return await this.guardarProductosDelCombo(id, items);
    }

    // Borra los productos que tenía el combo y guarda los nuevos
    private async guardarProductosDelCombo(comboId: number, items: any[]) {
        const { error: errorBorrar } = await this.cliente.client()
        .from('combos_productos')
        .delete()
        .eq('combo_id', comboId)

        if (errorBorrar != null) {
            return errorBorrar;
        }

        const filas = [];

        for (let item of items) {
            filas.push({ combo_id: comboId, producto_id: item.producto_id, cantidad: item.cantidad });
        }

        const { error } = await this.cliente.client()
        .from('combos_productos')
        .insert(filas)

        return error;
    }

    async cambiarActivoCombo(id: number, activo: boolean) {
        const { error } = await this.cliente.client()
        .from('combos')
        .update({ activo })
        .eq('id', id)

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }

    // Solo se puede eliminar si nunca se vendió (no se pierde historial)
    async puedeEliminarCombo(id: number) {
        const { count } = await this.cliente.client()
        .from('compra_items')
        .select('id', { count: 'exact', head: true })
        .eq('combo_id', id)

        return count === 0;
    }

    async eliminarCombo(id: number) {
        // Primero la tabla intermedia, si no la base no deja borrar el combo
        const { error: errorProductos } = await this.cliente.client()
        .from('combos_productos')
        .delete()
        .eq('combo_id', id)

        if (errorProductos != null) {
            console.log(errorProductos);
            return false;
        }

        const { error } = await this.cliente.client()
        .from('combos')
        .delete()
        .eq('id', id)

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }
}
