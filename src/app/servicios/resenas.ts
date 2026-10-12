import { inject, Service } from '@angular/core';
import { Auth } from './auth';
import { aTextoLocal } from '../utils/fechas';


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

    async yaReseno(usuarioId: string, peliculaId: number) {
        const { count } = await this.cliente.client()
        .from('resenas')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', usuarioId)
        .eq('pelicula_id', peliculaId)

        return count !== 0;
    }

    async vioLaPelicula(usuarioId: string, peliculaId: number) {
        const { count, error } = await this.cliente.client()
        .from('entradas')
        .select('id, compras!inner(usuario_id, cancelada), funciones!inner(pelicula_id, fecha_hora)', {
            count: 'exact', head : true })
        .eq('compras.usuario_id', usuarioId)
        .eq('compras.cancelada', false)
        .eq('funciones.pelicula_id', peliculaId)
        .lte('funciones.fecha_hora', aTextoLocal( new Date() ))

        if (error != null) {
            console.log(error);
            return false;
        }

        return count !== null && count > 0;
    }

    async crearResena(usuarioId: string, peliculaId: number, calificacion: number, comentario: string) {
        const { error } = await this.cliente.client()
        .from('resenas')
        .insert( { usuario_id: usuarioId, pelicula_id: peliculaId, calificacion, comentario })

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }

    // Las reseñas de un usuario, para mostrar su calificación en "Mis películas"
    async getResenasDeUsuario(usuarioId: string) {
        const { data, error } = await this.cliente.client()
        .from('resenas')
        .select('pelicula_id, calificacion')
        .eq('usuario_id', usuarioId)

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }
}
