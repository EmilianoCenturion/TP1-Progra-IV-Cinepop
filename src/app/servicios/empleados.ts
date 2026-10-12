import { inject, Service } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { Auth } from './auth';
import { environment } from '../../environments/environments';

// Alta y baja de empleados (los que validan los QR) desde el panel de admin
@Service()
export class Empleados {
    private cliente = inject(Auth);

    async getEmpleados() {
        const { data, error } = await this.cliente.client()
        .from('roles_usuarios')
        .select('id, nombre, email')
        .eq('rol_usuario', 'Empleado')
        .order('nombre', { ascending: true })

        if (error != null) {
            console.log(error);
            return [];
        }

        return data;
    }

    // Devuelve el mensaje de error, o null si salió bien
    async crearEmpleado(nombre: string, email: string, password: string) {
        // signUp con el cliente normal cerraría la sesión del admin y lo dejaría logueado como el empleado.
        // Por eso se usa un cliente aparte que no guarda la sesión
        const clienteAlta = createClient(environment.supabaseUrl, environment.supabasePublishableKey, {
            auth: { persistSession: false, autoRefreshToken: false, storageKey: 'cinepop-alta-empleado' },
        });

        const { data, error } = await clienteAlta.auth.signUp({ email, password });

        if (error != null) {
            return error.message === 'User already registered' ? 'Ese email ya está registrado.' : error.message;
        }

        // Supabase no avisa con error si el email ya existía: devuelve un usuario sin identidades
        if (!data.user || data.user.identities?.length === 0) {
            return 'Ese email ya está registrado.';
        }

        // El rol se guarda con la sesión del admin
        const { error: errorRol } = await this.cliente.client()
        .from('roles_usuarios')
        .insert({ id: data.user.id, rol_usuario: 'Empleado', nombre, email })

        if (errorRol != null) {
            console.log(errorRol);
            return 'Se creó el usuario pero no se le pudo asignar el rol.';
        }

        return null;
    }

    // La cuenta sigue existiendo, pero sin el rol ya no puede entrar a "Validar QR"
    async darDeBaja(id: string) {
        const { error } = await this.cliente.client()
        .from('roles_usuarios')
        .delete()
        .eq('id', id)
        .eq('rol_usuario', 'Empleado')

        if (error != null) {
            console.log(error);
            return false;
        }

        return true;
    }
}