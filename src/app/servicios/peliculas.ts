import { inject, Service } from '@angular/core';
import { Auth } from './auth';
import { aTextoLocal } from '../utils/fechas';

@Service()
export class Peliculas {
    cliente = inject(Auth)

    private calcularPromedio(resenas: any[]) {
        if ( resenas.length === 0) {
            return null;
        }   

        let suma = 0;

        for (let r of resenas) {
            suma += r.calificacion;
        }

        return Math.round((suma / resenas.length) * 10) / 10
    }

    async getPeliculas() {

        const { data, error } = await this.cliente.client()
        .from('peliculas')
        .select('*, peliculas_generos(genero_id, generos(nombre)), resenas(calificacion)')
        .eq('activa', true)
        .lte('fecha_estreno', aTextoLocal( new Date() ))

        if (error != null) {
            console.log(error);
            
            return []
        } 
        

        const peliculasConPromedio = data.map((pelicula: any) => {
            
            pelicula.promedio = this.calcularPromedio(pelicula.resenas);

            return pelicula;
        });

        return peliculasConPromedio;
    }

    // Películas que se estrenan más adelante, de la más cercana a la más lejana
    // funciones(fecha_hora) sirve para saber si ya tienen entradas a la venta
    async getProximamente() {
        const ahora = aTextoLocal(new Date());

        const { data, error } = await this.cliente.client()
        .from('peliculas')
        .select('id, nombre, sinopsis, imagen_url, duracion, formato, idioma, clasificacion_edad, fecha_estreno, funciones(fecha_hora)')
        .eq('activa', true)
        .gt('fecha_estreno', ahora)
        .order('fecha_estreno', { ascending: true })

        if (error != null) {
            console.log(error);
            return [];
        }

        for (let p of data as any[]) {
            p.enVenta = false;

            for (let f of p.funciones) {
                if (f.fecha_hora >= ahora) {
                    p.enVenta = true;
                }
            }
        }

        return data;
    }

    async getPelicula(id: number) {

        const { data, error } = await this.cliente.client()
        .from('peliculas')
        .select('*, peliculas_generos(genero_id, generos(nombre)), resenas(calificacion, comentario, creado_en, usuarios(nombre))')
        .eq('id', id)
        .order('creado_en', { referencedTable: 'resenas', ascending: false})
        .single()

        if (error != null) {
            console.log(error);
            
            return null
        } 

        data.promedio = this.calcularPromedio(data.resenas);

        return data;
    };

    async tresPeliculasMasVendidas() {

        const { data, error } = await this.cliente.client()
        .from('peliculas')
        .select('*, peliculas_generos(genero_id, generos(nombre)), resenas(calificacion), funciones(entradas(id, compra_id, compras(cancelada)))')
        .eq('activa', true)

        if (error != null) {
            console.log(error);
            return [];
        }

        data.forEach(pelicula => {
            pelicula.cantidadVendida = this.contarEntradasVendidas(pelicula);

            pelicula.promedio = this.calcularPromedio(pelicula.resenas);
        });

        data.sort((a, b) => b.cantidadVendida - a.cantidadVendida);

        return data.slice(0, 3);
    }

    private contarEntradasVendidas(pelicula: any) {
        let contador = 0;

        for (let funcion of pelicula.funciones) {
            for( let entrada of funcion.entradas) {
                if (entrada.compras.cancelada === false) {
                    contador += 1
                }
            }
        }

        return contador;
    }

    async getGeneros() {
        const { data , error } = await this.cliente.client()
        .from('generos')
        .select('id, nombre')

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }

    async getPeliculasAdmin() {
        const { data, error } = await this.cliente.client()
        .from('peliculas')
        .select('*, peliculas_generos(genero_id, generos(nombre))')
        .order('nombre', { ascending: true } );

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }

    async crearPelicula(datos: any, generosIds: number[]) {
        const { data, error } = await this.cliente.client()
        .from('peliculas')
        .insert(datos)
        .select()
        .single();

        if (error != null) {
            console.log(error);
            return null; 
        }

        const okGeneros = await this.guardarGeneros(data.id, generosIds);

        return okGeneros ? data : null;
    }

    async actualizarPelicula(id: number, datos: any, generosIds: number[]) {
        const { error } = await this.cliente.client()
        .from('peliculas')
        .update(datos)
        .eq('id', id)

        if (error != null) {
            console.log();
            return false;
        }

        return await this.guardarGeneros(id, generosIds);
    }

    async cambiarActiva(id: number, activa:boolean) {
        const { error } = await this.cliente.client()
        .from('peliculas')
        .update({ activa })
        .eq('id', id)

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }

    // Reemplaza los generos: borra los que tenia y guarda los elegidos
    private async guardarGeneros(peliculaId: number, generosIds: number[]) {
        const { error: errorBorrar } = await this.cliente.client()
        .from('peliculas_generos')
        .delete()
        .eq('pelicula_id', peliculaId)

        if (errorBorrar != null) {
            console.log(errorBorrar);
            return false;
        }

        const { error } = await this.cliente.client()
        .from('peliculas_generos')
        .insert(generosIds.map(generoId => ({ pelicula_id: 
            peliculaId, genero_id: generoId })));

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }

    // Solo se puede eliminar si no tiene funciones ni reseñas (no se pierde historial)
    async puedeEliminar(id: number) {
        const { count: funciones } = await this.cliente.client()
        .from('funciones')
        .select('id', { count: 'exact', head: true })
        .eq('pelicula_id', id);

        const { count: resenas } = await this.cliente.client()
        .from('resenas')
        .select('id', { count: 'exact', head: true })
        .eq('pelicula_id', id);

        return funciones === 0 && resenas === 0;
    }

    async eliminarPelicula(id: number) {
        // Primero la tabla intermedia, si no la base no deja borrar la película
        const { error: errorGeneros } = await this.cliente.client()
        .from('peliculas_generos')
        .delete()
        .eq('pelicula_id', id);

        if (errorGeneros != null) {
            console.log(errorGeneros);
            return false;
        }

        const { error } = await this.cliente.client()
        .from('peliculas')
        .delete()
        .eq('id', id);

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }

    async getPeliculaAdmin(id: number) {
        const { data, error } = await this.cliente.client()
        .from('peliculas')
        .select('*, peliculas_generos(genero_id)')
        .eq('id', id)
        .maybeSingle()

        if (error != null) {
            console.log(error);
            return null;
        }

        return data;
    }
}
