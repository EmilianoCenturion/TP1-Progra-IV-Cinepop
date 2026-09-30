import { inject, Service } from '@angular/core';
import { Auth } from './auth';

@Service()
export class Actividad {
    private cliente = inject(Auth);

    async registrar(descripcion: string) {
        const user = await this.cliente.getUser()

        if (!user) {
            return;
        }

        const { error } = await this.cliente.client()
        .from('log_auditoria')
        .insert({ usuario_id: user.id, usuario_email: user.email, descripcion });

        if (error != null) {
            console.log(error);
        }
    }

    async getActividad() {
        const { data, error } = await this.cliente.client()
        .from('log_auditoria')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(200);

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }
}
