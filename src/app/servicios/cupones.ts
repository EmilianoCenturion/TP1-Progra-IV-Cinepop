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
}
