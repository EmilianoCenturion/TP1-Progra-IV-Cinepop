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
        total: number,
        cuponId: number | null,
        combo: any
    ) {
        const user = await this.cliente.getUser();
        // Solo los clientes tienen fila en "usuarios": un admin o un anónimo compran sin usuario_id
        const perfil = await this.cliente.getPerfil();
        const usuarioId = perfil?.id ?? null;
        const email = user?.email ?? localStorage.getItem('emailAnon')

        const { data: compra, error: errorCompra } = await this.cliente.client()
        .from('compras')
        .insert({
            usuario_id: usuarioId,
            email_comprador: email,
            total_pagado: total,
            metodo_pago: metodoPago,
            fecha_compra: new Date().toISOString(),
            cupon_id: cuponId
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
            await this.deshacerCompra(compra.id);

            // 23505 = la regla "una sola entrada por butaca y función": alguien la compró antes
            if (errorEntradas.code === '23505') {
                return 'ocupada';
            }

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
                await this.deshacerCompra(compra.id);
                return null;
            }
        }

        // El combo se guarda como un ítem más, con su precio congelado
        if (combo != null) {
            const { error: errorCombo } = await this.cliente.client()
            .from('compra_items')
            .insert({ compra_id: compra.id, combo_id: combo.id, cantidad: 1, precio_unitario: combo.precio })

            if (errorCombo != null) {
                console.log(errorCombo);
                await this.deshacerCompra(compra.id);
                return null;
            }
        }

        return { compra, entradas };
    }

    // Si falla un paso después de crear la compra, se borra lo que quedó a medias
    private async deshacerCompra(compraId: number) {
        await this.cliente.client().from('compra_items').delete().eq('compra_id', compraId);
        await this.cliente.client().from('entradas').delete().eq('compra_id', compraId);
        await this.cliente.client().from('compras').delete().eq('id', compraId);
    }
}