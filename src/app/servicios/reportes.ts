import { inject, Service } from '@angular/core';
import { Auth } from './auth';

@Service()
export class Reportes {
    private cliente = inject(Auth);

    // Compras no canceladas desde una fecha (null = todas), con sus entradas y su candy
    async getCompras(desde: Date | null) {
        let consulta = this.cliente.client()
        .from('compras')
        .select('id, total_pagado, fecha_compra, entradas(id, funciones(peliculas(nombre))), compra_items(cantidad, precio_unitario, productos_candy(nombre), combos(nombre))')
        .eq('cancelada', false)
        .order('fecha_compra', { ascending: false })

        // fecha_compra se guarda en UTC: se compara con la fecha en UTC
        if (desde != null) {
            consulta = consulta.gte('fecha_compra', desde.toISOString());
        }

        const { data, error } = await consulta;

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }
}