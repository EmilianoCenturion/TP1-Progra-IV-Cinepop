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
  
  mensajeError: string = ""
  
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

  ingresarAnon() {
    localStorage.setItem('nombreAnon', this.formAnon.value.nombreAnon!);
    localStorage.setItem('emailAnon', this.formAnon.value.emailAnon!);
    this.router.navigate(['/home']);
  }

  async resultadoLogin() {
    let resultado = await this.auth.signIn(this.formLogin.value.email!, this.formLogin.value.contraseña!)
    if (resultado != null) {
      this.mensajeError = resultado;
    } else {
      this.router.navigate(["/home"])
    }
  }

  activarFormAnon() {
    this.mostrarFormAnon.set(!this.mostrarFormAnon());
  }
}

