import { inject, Service } from '@angular/core';
import { Auth } from './auth';

@Service()
export class Salas {
    private cliente = inject(Auth);

    // butacas(count) y funciones(count) le piden a Supabase solo la cantidad de cada relación
    async getSalas() {
        const { data, error } = await this.cliente.client()
        .from('salas')
        .select('id, nombre, butacas(count), funciones(count)')
        .order('id', { ascending: true });

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }

    // Devuelve la sala creada y el error (para poder distinguir "nombre repetido")
    async crearSala(nombre: string) {
        const { data, error } = await this.cliente.client()
        .from('salas')
        .insert({ nombre })
        .select()
        .single();

        return { sala: data, error };
    }

    async eliminarSala(id: number) {
        // Primero las butacas: dependen de la sala
        const { error: errorButacas } = await this.cliente.client()
        .from('butacas')
        .delete()
        .eq('sala_id', id);

        if (errorButacas != null) {
            console.log(errorButacas);
            return false;
        }

        const { error } = await this.cliente.client()
        .from('salas')
        .delete()
        .eq('id', id);

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }
}