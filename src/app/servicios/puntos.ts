import { inject, Service } from '@angular/core';
import { Auth } from './auth';

@Service()
export class Puntos {
    private cliente = inject(Auth);

    // El saldo no se guarda: es la suma de todos los movimientos del usuario
    async getSaldo(usuarioId: string) {
        const { data, error } = await this.cliente.client()
        .from('puntos_movimientos')
        .select('puntos')
        .eq('usuario_id', usuarioId)

        if (error != null) {
            console.log(error);
            return 0;
        }

        let saldo = 0;

        for (let m of data) {
            saldo += m.puntos;
        }

        return saldo;
    }

    async getMovimientos(usuarioId: string) {
        const { data, error } = await this.cliente.client()
        .from('puntos_movimientos')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('creado_en', { ascending: false })
        .order('id', { ascending: false })

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }

    async registrar(movimientos: any[]) {
        if (movimientos.length === 0) {
            return true;
        }

        const { error } = await this.cliente.client()
        .from('puntos_movimientos')
        .insert(movimientos)

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }

    // Al cancelar se deshace todo lo de esa compra: se quitan los puntos ganados y se devuelven los canjeados
    async revertirCompra(usuarioId: string, compraId: number) {
        const { data, error } = await this.cliente.client()
        .from('puntos_movimientos')
        .select('puntos')
        .eq('compra_id', compraId)

        if (error != null) {
            console.log(error);
            return false;
        }

        let total = 0;

        for (let m of data) {
            total += m.puntos;
        }

        if (total === 0) {
            return true;
        }

        return await this.registrar([{
            usuario_id: usuarioId,
            compra_id: compraId,
            puntos: -total,
            descripcion: `Cancelación de la compra N° ${compraId}`,
        }]);
    }

    // |----- Recompensas (el admin define cuántos puntos cuesta cada una)

    async getRecompensas(soloActivas: boolean) {
        let consulta = this.cliente.client()
        .from('recompensas')
        .select('*, productos_candy(nombre, precio)')
        .order('tipo', { ascending: true })
        .order('id', { ascending: true })

        if (soloActivas) {
            consulta = consulta.eq('activa', true);
        }

        const { data, error } = await consulta;

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }

    // Devuelve el error (o null) para detectar la recompensa repetida (23505)
    async crearRecompensa(tipo: string, productoId: number | null, costo: number) {
        const { error } = await this.cliente.client()
        .from('recompensas')
        .insert({ tipo, producto_id: productoId, costo_puntos: costo })

        return error;
    }

    async actualizarRecompensa(id: number, datos: any) {
        const { error } = await this.cliente.client()
        .from('recompensas')
        .update(datos)
        .eq('id', id)

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }

    async eliminarRecompensa(id: number) {
        const { error } = await this.cliente.client()
        .from('recompensas')
        .delete()
        .eq('id', id)

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }
}
