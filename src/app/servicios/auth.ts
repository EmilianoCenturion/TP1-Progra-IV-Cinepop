import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environments';

@Service()
export class Auth {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabasePublishableKey);
    }

    async signIn(email: string, password: string) {
        const { error } = await this.supabase.auth.signInWithPassword({email, password});

        if (error != null) {
            return error.message;
        }

        return null;
    }

    async signUp(email: string, nombre: string, apellido: string, fecha_nacimiento: string, tipo_sangre: string, color_ojos: string, dias_vacaciones: number, password: string) {
        const { data, error } = await this.supabase.auth.signUp({ email, password });

        if (error != null) {
            return error.message;
        } else {
            const { error: insertError }  = await this.supabase.from('usuarios').insert({id: data.user?.id, nombre, apellido, fecha_nacimiento, tipo_sangre, color_ojos, dias_vacaciones});
            return insertError?.message ?? null;
        }
    }

    async signOut() {
        const { error } = await this.supabase.auth.signOut(); 

        if (error != null) {
            return error.message;
        }  

        return null;
    }

    async getUser() {
        const { data: { user }, error } = await this.supabase.auth.getUser()

        if (error != null) {
            console.log(error.message);
            return null;
        } else {
            return user;
        }
    }

    client() {
        return this.supabase;
    }

}
