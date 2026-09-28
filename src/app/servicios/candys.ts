import { inject, Service } from '@angular/core';
import { Auth } from './auth';

@Service()
export class Candys {
    cliente = inject(Auth);

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
}
