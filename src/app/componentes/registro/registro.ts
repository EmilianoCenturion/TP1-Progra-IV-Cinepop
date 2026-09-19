import { Component } from '@angular/core';
import { Auth } from '../../servicios/auth';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-registro',
  styleUrl: './registro.css',
  templateUrl: './registro.html',
})
export class Registro {

  mensajeError: string = "";

  formRegistro! : FormGroup;
  
  constructor (private auth: Auth, private fb: FormBuilder , private router: Router) {
    this.formRegistro = this.fb.group({ 
      email: ["", [Validators.required, Validators.email]],
      contraseña: ["", [Validators.required,]],
      nombre: ["", [Validators.required, Validators.minLength(2)]],
      apellido: ["", [Validators.required, Validators.minLength(2)]],
      fechaNacimiento: ["", [Validators.required]],
      tipoSangre: ["", [Validators.required, Validators.minLength(2)]],
      colorOjos: ["", [Validators.required, Validators.minLength(2)]],
      diasVacaciones: [0, [Validators.required, Validators.min(0), Validators.max(30)]]
    });
  }
  
  async resultadoRegistro() {
    let resultado = await this.auth.signUp(
      this.formRegistro.value.email!, 
      this.formRegistro.value.nombre!, 
      this.formRegistro.value.apellido!, 
      this.formRegistro.value.fechaNacimiento!, 
      this.formRegistro.value.tipoSangre!, 
      this.formRegistro.value.colorOjos!, 
      this.formRegistro.value.diasVacaciones!, 
      this.formRegistro.value.contraseña!
    );

    if (resultado != null) {
      this.mensajeError = resultado;
    } else {
      this.router.navigate(["/login"]);
    }
  }
}
