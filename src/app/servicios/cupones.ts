import { inject, Service } from '@angular/core';
import { Auth } from './auth'

@Service()
export class Cupones {
    private cliente = inject(Auth);

    // El cupon de bienvenida activo (el admin puede cambiar su porcentajee)

    async getCuponPrimeraCompra() {
        const { data, error } = await this.cliente.client()
        .from('cupones')
        .select('*')
        .eq('tipo_cupon', 'Primera compra')
        .eq('estado', true)
        .limit(1)
        .maybeSingle();

        if (error != null) {
            console.log(error);
            return null;
        }

        return data;
    }

    async getCuponPorCodigo(codigo: string) {
        const { data, error} = await this.cliente.client()
        .from('cupones')
        .select('*')
        .ilike('codigo_cupon', codigo.trim())
        .eq('estado', true)
        .maybeSingle();

        if (error != null) {
            console.log(error);
            return null;
        }

        return data;
    }

    // Primera compra = nunca compro nada (aunque haya cancelado, el cupon ya lo uso)
    async esPrimeraCompra(usuarioId: string) {
        const { count, error } = await this.cliente.client()
        .from('compras')
        .select('id', { count: 'exact', head: true})
        .eq('usuario_id', usuarioId)

        if (error != null) {
            console.log(error);
            return false;
        }

        return count === 0;
    }

    // |----- Admin

    // compras(count) trae cuántas veces se usó cada cupón
    async getCuponesAdmin() {
        const { data, error } = await this.cliente.client()
        .from('cupones')
        .select('*, compras(count)')
        .order('id', { ascending: true })

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }

    // Devuelve el error (o null) para detectar el código repetido (23505)
    async crearCupon(codigo: string, tipo: string, porcentaje: number) {
        const { error } = await this.cliente.client()
        .from('cupones')
        .insert({ codigo_cupon: codigo, tipo_cupon: tipo, porcentaje_descuento: porcentaje, estado: false })

        return error;
    }

    async cambiarPorcentaje(id: number, porcentaje: number) {
        const { error } = await this.cliente.client()
        .from('cupones')
        .update({ porcentaje_descuento: porcentaje })
        .eq('id', id)

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }

    async cambiarEstado(id: number, estado: boolean) {
        const { error } = await this.cliente.client()
        .from('cupones')
        .update({ estado })
        .eq('id', id)

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }

    // El de primera compra se aplica solo: tiene que haber uno solo activo
    async desactivarOtrosPrimeraCompra(idActivo: number) {
        const { error } = await this.cliente.client()
        .from('cupones')
        .update({ estado: false })
        .eq('tipo_cupon', 'Primera compra')
        .neq('id', idActivo)

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }

    async eliminarCupon(id: number) {
        const { error } = await this.cliente.client()
        .from('cupones')
        .delete()
        .eq('id', id)

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }
}
