import { inject, Service } from '@angular/core';
import { Auth } from './auth';
import { aTextoLocal } from '../utils/fechas';

@Service()
export class Funciones {
    cliente = inject(Auth)

    async getFuncionesPelicula(peliculaId: number) {
        
        const ahora = new Date();
        const ahoraLocal = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0,19)

        const { data, error } = await this.cliente.client()
        .from('funciones')
        .select('*, salas(nombre)')
        .eq('pelicula_id', peliculaId)
        .gte('fecha_hora', ahoraLocal)
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
        .select('*, salas(nombre), peliculas(nombre, clasificacion_edad)')
        .eq('id', funcionId)
        .single()
        
        if (error != null) {
            console.log(error);
            return null;
        }

        return data;
    }

    // Funciones existentes en un rango, con la duración de su película (para calcular cuándo terminan)
    async getFuncionesEntre(desde: Date, hasta: Date) {
        const { data, error } = await this.cliente.client()
        .from('funciones')
        .select('id, sala_id, fecha_hora, peliculas(duracion)')
        .gte('fecha_hora', aTextoLocal(desde))
        .lte('fecha_hora', aTextoLocal(hasta));

        if (error != null) {
            console.log(error);
            return null;
        }

        return data;
    }

    async getProximasFunciones() {
        const { data, error } = await this.cliente.client()
        .from('funciones')
        .select('id, fecha_hora, salas(nombre), peliculas(nombre, duracion), entradas(count)')
        .gte('fecha_hora', aTextoLocal(new Date()))
        .order('fecha_hora', { ascending: true });

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }

    async crearFunciones(funciones: { pelicula_id: number; sala_id: number; fecha_hora: string }[]) {
        const { error } = await this.cliente.client()
        .from('funciones')
        .insert(funciones);

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }

    async eliminarFuncion(id: number) {
        const { error } = await this.cliente.client()
        .from('funciones')
        .delete()
        .eq('id', id);

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }
}
