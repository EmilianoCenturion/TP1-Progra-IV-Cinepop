import { inject, Service } from '@angular/core';
import { Auth } from './auth';

// Pantalla del empleado: validar el ingreso a la sala y entregar el candy con el código del QR
@Service()
export class Validacion {
    private cliente = inject(Auth);

    // Busca la compra por su código (el mismo texto que tiene el QR). Se ignoran mayúsculas, espacios y guiones
    async buscarCompra(codigo: string) {
        const limpio = codigo.toUpperCase().replace(/[\s-]/g, '');

        const { data, error } = await this.cliente.client()
        .from('compras')
        .select('id, codigo, cancelada, entradas(id, ingreso_validado, candy_retirado, butacas(fila, numero), funciones(fecha_hora, peliculas(nombre), salas(nombre))), compra_items(cantidad, productos_candy(nombre), combos(nombre))')
        .eq('codigo', limpio)
        .maybeSingle()

        if (error != null) {
            console.log(error);
            return null;
        }

        return data as any;
    }

    // El mismo QR habilita a todas las entradas de la compra.
    // .eq('ingreso_validado', false) evita validar dos veces
    async validarIngreso(compraId: number) {
        const { data, error } = await this.cliente.client()
        .from('entradas')
        .update({ ingreso_validado: true })
        .eq('compra_id', compraId)
        .eq('ingreso_validado', false)
        .select()

        if (error != null) {
            console.log(error);
            return false;
        }

        return data.length > 0;
    }

    // El candy es de la compra: se marca en todas sus entradas para que no se entregue dos veces
    async entregarCandy(compraId: number) {
        const { data, error } = await this.cliente.client()
        .from('entradas')
        .update({ candy_retirado: true })
        .eq('compra_id', compraId)
        .eq('candy_retirado', false)
        .select()

        if (error != null) {
            console.log(error);
            return false;
        }

        return data.length > 0;
    }
}