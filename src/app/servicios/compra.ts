import { inject, Service } from '@angular/core';
import { Auth } from './auth';

@Service()
export class Compra {
    private cliente = inject(Auth)

    async confirmarCompra(
        funcionId: number,
        butacas: any[],
        carritoCandy: any[],
        metodoPago: string,
        total: number
    ) {
        const user = await this.cliente.getUser();
        const usuarioId = user?.id ?? null;
        const email = user?.email ?? localStorage.getItem('emailAnon')

        const { data: compra, error: errorCompra } = await this.cliente.client()
        .from('compras')
        .insert({
            usuario_id: usuarioId,
            email_comprador: email,
            total_pagado: total,
            metodo_pago: metodoPago,
            fecha_compra: new Date().toISOString(),
        })
        .select()
        .single()

        if (errorCompra != null) {
            console.log(errorCompra);
            return null;
        }

        const nuevasEntradas = butacas.map(b => ({
            compra_id: compra.id,
            funcion_id: funcionId,
            butaca_id: b.id,
            qr: crypto.randomUUID(),
        }));

        const { data: entradas, error: errorEntradas } = await this.cliente.client()
        .from('entradas')
        .insert(nuevasEntradas)
        .select();

        if (errorEntradas != null) {
            console.log(errorEntradas);
            return null;
        }

        if (carritoCandy.length > 0) {
            const nuevosItems = carritoCandy.map(item => ({
                compra_id: compra.id,
                producto_id: item.producto.id,
                cantidad: item.cantidad,
                precio_unitario: item.producto.precio,
            }))

            const { error: errorItems } = await this.cliente.client()
            .from('compra_items')
            .insert(nuevosItems)

            if (errorItems != null) {
                console.log(errorItems);
                return null;
            }
        }

        return { compra, entradas };
    }
}
