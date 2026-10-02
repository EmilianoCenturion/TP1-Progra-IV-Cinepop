import { inject, Service, signal } from '@angular/core';
import { Auth } from './auth';

@Service()
export class Butaca {
    cliente = inject(Auth);
    
    // Provisorio: precio fijo por tipo (igual que la Sala 1) hasta que el precio salga de la película
    private precioPorTipo: Record<string, number> = { Normal: 4500, Accesible: 4500, VIP: 9000 };

    async generarButacas(salaId: number) {
        const filasNormales = ['A','B','C','D','E','F','G','H','I','L','M','N','O','P','Q'];
        const filaVip = ['R','S','T'];

        const butacas: { sala_id: number; fila: string; numero: number; tipo_butaca: string; precio: number }[] = [];

        for (const fila of filasNormales) {
            for (let numero = 1; numero <= 28; numero++) {
                butacas.push({ sala_id: salaId, fila, numero, tipo_butaca: 'Normal', precio: this.precioPorTipo['Normal'] });
            }
        }

        for (let numero = 1; numero <= 14; numero++) {
            butacas.push({ sala_id: salaId, fila: 'J', numero, tipo_butaca: 'Accesible', precio: this.precioPorTipo['Accesible'] });
        }

        for (const fila of filaVip) {
            for (let numero = 1; numero <= 28; numero++) {
                butacas.push({ sala_id: salaId, fila, numero, tipo_butaca: 'VIP', precio: this.precioPorTipo['VIP'] });
            }
        }

        const { error } = await this.cliente.client()
            .from('butacas')
            .insert(butacas)

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
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
