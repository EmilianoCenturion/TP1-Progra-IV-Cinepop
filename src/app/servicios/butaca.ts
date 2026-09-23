import { inject, Service } from '@angular/core';
import { Auth } from './auth';

@Service()
export class Butaca {
    cliente = inject(Auth)
    
    async generarButacas(salaId: number) {
        const filasNormales = ['A','B','C','D','E','F','G','H','I','L','M','N','O','P','Q'];
        const filaVip = ['R','S','T'];

        const butacas: { sala_id: number; fila: string; numero: number; tipo_butaca: string}[] = [];

        for (const fila of filasNormales) {
            for (let numero = 1; numero <= 28; numero++) {
                butacas.push({ sala_id: salaId, fila, numero, tipo_butaca: 'Normal'});
            }
        }

        for (let numero = 1; numero <= 14; numero++) {
            butacas.push({ sala_id: salaId, fila: 'J', numero, tipo_butaca: 'Accesible'});
        }

        for (const fila of filaVip) {
            for (let numero = 1; numero <= 28; numero++) {
                butacas.push({ sala_id: salaId, fila, numero, tipo_butaca: 'VIP'});
            }
        }

        const { error } = await this.cliente.client()
            .from('butacas')
            .insert(butacas)

        if (error != null) {
            console.log(error);
        }
    }

    async getButacasPorSala(salaId: number) {
        const { data, error } = await this.cliente.client()
        .from('butacas')
        .select('*')
        .eq('sala_id', salaId)
        .order('fila', {ascending: true})
        .order('numero', {ascending: true})
        
        if (error != null) {
            console.log(error);
            return null;
        }

        return data;
    }

    async getButacasOcupadas(funcionId: number) {
        const { data, error } = await this.cliente.client()
        .from('entradas')
        .select('butaca_id')
        .eq('funcion_id', funcionId)

        if (error != null) {
            console.log(error);
            return null;
        }

        return data;
    }
}
