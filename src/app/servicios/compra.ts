import { inject, Service } from '@angular/core';
import { Auth } from './auth';
import { Puntos } from './puntos';

@Service()
export class Compra {
    private cliente = inject(Auth)
    private puntosService = inject(Puntos)

    async confirmarCompra(
        funcionId: number,
        butacas: any[],
        carritoCandy: any[],
        metodoPago: string,
        total: number,
        cuponId: number | null,
        combo: any,
        creditoUsado: number,
        canje: any
    ) {
        const user = await this.cliente.getUser();
        // Solo los clientes tienen fila en "usuarios": un admin o un anónimo compran sin usuario_id
        const perfil = await this.cliente.getPerfil();
        const usuarioId = perfil?.id ?? null;
        const email = user?.email ?? localStorage.getItem('emailAnon')

        // Un solo código (y un solo QR) por compra. Si justo se repite (23505), se prueba con otro
        let compra: any = null;

        for (let intento = 0; intento < 3 && compra == null; intento++) {
            const { data, error: errorCompra } = await this.cliente.client()
            .from('compras')
            .insert({
                usuario_id: usuarioId,
                email_comprador: email,
                total_pagado: total,
                credito_usado: creditoUsado,
                metodo_pago: metodoPago,
                fecha_compra: new Date().toISOString(),
                cupon_id: cuponId,
                codigo: this.generarCodigo(),
            })
            .select()
            .single()

            if (errorCompra != null && errorCompra.code !== '23505') {
                console.log(errorCompra);
                return null;
            }

            compra = data;
        }

        if (compra == null) {
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

        // Lo canjeado con puntos va en un ítem aparte con precio 0, para poder vincularlo al canje
        const nuevosItems: any[] = [];
        const costosCanje: number[] = [];

        for (let item of carritoCandy) {
            let canjeados = 0;
            let costo = 0;

            for (let p of canje.productos) {
                if (p.productoId === item.producto.id) {
                    canjeados = p.cantidad;
                    costo = p.costo;
                }
            }

            if (item.cantidad - canjeados > 0) {
                nuevosItems.push({ compra_id: compra.id, producto_id: item.producto.id, cantidad: item.cantidad - canjeados, precio_unitario: item.producto.precio });
                costosCanje.push(0);
            }

            if (canjeados > 0) {
                nuevosItems.push({ compra_id: compra.id, producto_id: item.producto.id, cantidad: canjeados, precio_unitario: 0 });
                costosCanje.push(costo);
            }
        }

        let itemsGuardados: any[] = [];

        if (nuevosItems.length > 0) {
            const { data: items, error: errorItems } = await this.cliente.client()
            .from('compra_items')
            .insert(nuevosItems)
            .select('id, producto_id, cantidad, productos_candy(nombre)')

            if (errorItems != null) {
                console.log(errorItems);
                await this.deshacerCompra(compra.id);
                return null;
            }

            itemsGuardados = items;
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

        // El crédito se descuenta recién cuando la compra quedó completa
        if (creditoUsado > 0) {
            await this.sumarCredito(usuarioId!, -creditoUsado);
        }

        // Puntos: solo los clientes registrados. Se restan los canjes y se suma 1 punto por peso pagado
        if (usuarioId != null) {
            const movimientos: any[] = [];

            for (let e of entradas) {
                if (canje.butacaIds.includes(e.butaca_id)) {
                    movimientos.push({ usuario_id: usuarioId, compra_id: compra.id, entrada_id: e.id, puntos: -canje.costoEntrada, descripcion: 'Canje: entrada gratis' });
                }
            }

            // insert().select() devuelve los ítems en el mismo orden en que se mandaron
            for (let i = 0; i < itemsGuardados.length; i++) {
                if (costosCanje[i] > 0) {
                    const item = itemsGuardados[i];
                    movimientos.push({ usuario_id: usuarioId, compra_id: compra.id, compra_item_id: item.id, puntos: -(item.cantidad * costosCanje[i]), descripcion: `Canje: ${item.cantidad} ${item.productos_candy.nombre}` });
                }
            }

            if (total > 0) {
                movimientos.push({ usuario_id: usuarioId, compra_id: compra.id, puntos: total, descripcion: `Compra N° ${compra.id}` });
            }

            await this.puntosService.registrar(movimientos);
        }

        return { compra, entradas };
    }

    // 8 caracteres sin los que se confunden al leerlos (0/O, 1/I): fácil de tipear si el QR no se puede escanear
    private generarCodigo() {
        const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let codigo = '';

        for (let i = 0; i < 8; i++) {
            codigo += caracteres[Math.floor(Math.random() * caracteres.length)];
        }

        return codigo;
    }

    // Compras del cliente, de la más nueva a la más vieja, con lo necesario para mostrarlas
    async getMisCompras(usuarioId: string) {
        const { data, error } = await this.cliente.client()
        .from('compras')
        .select('id, codigo, total_pagado, credito_usado, metodo_pago, fecha_compra, cancelada, fecha_cancelacion, entradas(id, ingreso_validado, candy_retirado, butacas(fila, numero, tipo_butaca), funciones(fecha_hora, peliculas(id, nombre, imagen_url), salas(nombre))), compra_items(cantidad, productos_candy(nombre), combos(nombre))')
        .eq('usuario_id', usuarioId)
        .order('fecha_compra', { ascending: false })

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }

    // No se devuelve dinero: el total pagado vuelve como crédito en la cuenta
    async cancelarCompra(compra: any, usuarioId: string) {
        // .eq('cancelada', false) evita devolver el crédito dos veces si se aprieta el botón de nuevo
        const { data, error } = await this.cliente.client()
        .from('compras')
        .update({ cancelada: true, fecha_cancelacion: new Date().toISOString() })
        .eq('id', compra.id)
        .eq('cancelada', false)
        .select()

        if (error != null || data.length === 0) {
            console.log(error);
            return false;
        }

        // Las entradas anuladas liberan la butaca y su QR deja de servir
        const { error: errorEntradas } = await this.cliente.client()
        .from('entradas')
        .update({ anulada: true })
        .eq('compra_id', compra.id)

        if (errorEntradas != null) {
            console.log(errorEntradas);
        }

        // Se quitan los puntos que ganó con esta compra y se devuelven los que canjeó
        await this.puntosService.revertirCompra(usuarioId, compra.id);

        return await this.sumarCredito(usuarioId, compra.total_pagado);
    }

    // Suma (o resta, con un monto negativo) crédito a la cuenta del cliente
    private async sumarCredito(usuarioId: string, monto: number) {
        const { data: usuario, error } = await this.cliente.client()
        .from('usuarios')
        .select('credito_disponible')
        .eq('id', usuarioId)
        .single()

        if (error != null) {
            console.log(error);
            return false;
        }

        const { error: errorUpdate } = await this.cliente.client()
        .from('usuarios')
        .update({ credito_disponible: usuario.credito_disponible + monto })
        .eq('id', usuarioId)

        if (errorUpdate != null) {
            console.log(errorUpdate);
            return false;
        }

        return true;
    }

    // Si falla un paso después de crear la compra, se borra lo que quedó a medias
    private async deshacerCompra(compraId: number) {
        await this.cliente.client().from('compra_items').delete().eq('compra_id', compraId);
        await this.cliente.client().from('entradas').delete().eq('compra_id', compraId);
        await this.cliente.client().from('compras').delete().eq('id', compraId);
    }
}