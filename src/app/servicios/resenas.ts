import { inject, Service } from '@angular/core';
import { Auth } from './auth';

@Service()
export class Resenas {
    cliente = inject(Auth);

    async getResenas() {
        const { data, error } = await this.cliente.client()
        .from('resenas')
        .select('*, peliculas(nombre, imagen_url), usuarios(nombre)')
        .order('creado_en', {ascending: false})
        .limit(5)

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }
}
