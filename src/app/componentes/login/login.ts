import { Component, signal } from '@angular/core';
import { Auth } from '../../servicios/auth';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';

@Component({
  imports: [ReactiveFormsModule, NgIf, RouterLink, FormsModule],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  constructor (private auth: Auth, private router: Router, private fb: FormBuilder) {
    this.formAnon = this.fb.group({
      nombreAnon: ["", Validators.required],
      emailAnon: ["", [Validators.required, Validators.email]]
    });
  }

  mostrarFormAnon = signal(false);
  
  mensajeError = signal("");
  
  nombreAnon = "";
  emailAnon = "";  

  formLogin = new FormGroup({ 
    email: new FormControl("", {
      validators: [Validators.required, Validators.email],
    }),
    contraseña: new FormControl("", {
      validators: [Validators.required]
    })
  })

  formAnon: FormGroup;

  async ingresarAnon() {
    // Si había alguien logueado, se cierra su sesión: el anónimo no debe comprar con esa cuenta
    await this.auth.signOut();

    localStorage.setItem('nombreAnon', this.formAnon.value.nombreAnon!);
    localStorage.setItem('emailAnon', this.formAnon.value.emailAnon!);
    this.router.navigate(['/home']);
  }

    async resultadoLogin() {
      this.mensajeError.set("");

      let resultado = await this.auth.signIn(this.formLogin.value.email!, this.formLogin.value.contraseña!)

      if (resultado == null) {
        this.router.navigate(["/home"])
        return;
      }

      // Supabase devuelve el error en inglés: se traduce el más común
      if (resultado === 'Invalid login credentials') {
        this.mensajeError.set('Email o contraseña incorrectos.');
      } else {
        this.mensajeError.set(resultado);
      }
  }

  activarFormAnon() {
    this.mostrarFormAnon.set(!this.mostrarFormAnon());
  }
}

