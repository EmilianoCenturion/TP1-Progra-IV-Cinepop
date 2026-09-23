import { inject, Service } from '@angular/core';
import { Auth } from './auth';

@Service()
export class Funciones {
    cliente = inject(Auth)

    async getFuncionesPelicula(peliculaId: number) {
        const { data, error } = await this.cliente.client()
        .from('funciones')
        .select('*, salas(nombre)')
        .eq('pelicula_id', peliculaId)
        .order('fecha_hora', { ascending: true })

        if (error != null) {
            console.log(error);
            return null;
        }

        return data;
    }

    async getFuncionId(funcionId: number) {
        const { data, error } = await this.cliente.client()
        .from('funciones')
        .select('*, salas(nombre)')
        .eq('id', funcionId)
        .single()
        
        if (error != null) {
            console.log(error);
            return null;
        }

        return data;
    }
}
