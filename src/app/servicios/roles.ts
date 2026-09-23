import { inject, Service } from '@angular/core';
import { Auth } from './auth';

@Service()
export class Roles {
    cliente = inject(Auth)

    async getRol() {
        const usuario = await this.cliente.getUser()
        
        if (!usuario) {
            return null
        }

        const { data, error } = await this.cliente.client()
        .from('roles_usuarios')
        .select('rol_usuario')
        .eq('id', usuario.id)
        .single();

        if (error != null) {
            return null
        }

        return data.rol_usuario
    }
}
