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

    
}
