import { inject, Service } from '@angular/core';
import { Auth } from './auth';

@Service()
export class Peliculas {
    cliente = inject(Auth)

    async getPeliculas() {

        const { data, error } = await this.cliente.client()
        .from('peliculas')
        .select('*, peliculas_generos(genero_id, generos(nombre)), resenas(calificacion)')
        
        if (error != null) {
            console.log(error);
            
            return []
        } 

        const peliculasConPromedio = data.map((pelicula: any) => {
            let promedio = null;

            if (pelicula.resenas.length > 0) {
                let suma = 0;
                
                for (let r of pelicula.resenas) {
                    suma = suma + r.calificacion;
                }

                promedio = suma / pelicula.resenas.length;
            }
            
            pelicula.promedio = promedio;

            return pelicula;
        });

        return peliculasConPromedio;
    }

    async getPelicula(id: number) {

        const { data, error } = await this.cliente.client()
        .from('peliculas')
        .select('*, peliculas_generos(genero_id, generos(nombre))')
        .eq('id', id)
        .single()

        if (error != null) {
            console.log(error);
            
            return null
        } 

        return data;
    };

    async tresPeliculasMasVendidas() {

        const { data, error } = await this.cliente.client()
        .from('peliculas')
        .select('*, peliculas_generos(genero_id, generos(nombre)), resenas(calificacion), funciones(entradas(id, compra_id, compras(cancelada)))')

        if (error != null) {
            console.log(error);
            return [];
        }

        data.forEach(pelicula => {
            pelicula.cantidadVendida = this.contarEntradasVendidas(pelicula);

            let promedio = null;

            if (pelicula.resenas.length > 0) {
                let suma = 0;

                for (let r of pelicula.resenas) {
                    suma = suma + r.calificacion;
                }

                promedio = suma / pelicula.resenas.length;
            }

            pelicula.promedio = promedio;
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
}
