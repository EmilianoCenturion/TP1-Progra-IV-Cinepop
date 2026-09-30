import { Component, signal } from '@angular/core';
import { Auth } from '../../servicios/auth';
import { FormBuilder, FormGroup, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIf, NgFor } from '@angular/common';
import { clavesCoincidenValidator } from '../../validadores/claves-coinciden';
import { fechaValidator } from '../../validadores/fecha-valida';

@Component({
  imports: [ReactiveFormsModule, RouterLink, NgIf, NgFor],
  selector: 'app-registro',
  styleUrl: './registro.css',
  templateUrl: './registro.html',
})
export class Registro {

  mensajeError = signal("");

  dias = Array.from({ length: 31 }, (_, i) => i + 1)
  meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  anios = Array.from({ length: 100 }, (_,i) => new Date().getFullYear() - i);

  formRegistro! : FormGroup;
  
  constructor (private auth: Auth, private fb: FormBuilder , private router: Router) {
    this.formRegistro = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      contraseña: ["", [Validators.required, Validators.minLength(6)]],
      confirmarContraseña: ["", [Validators.required]],
      nombre: ["", [Validators.required, Validators.minLength(2)]],
      apellido: ["", [Validators.required, Validators.minLength(2)]],
      diaNacimiento: ["", [Validators.required]],
      mesNacimiento: ["", [Validators.required]],
      anioNacimiento: ["", [Validators.required]],
      tipoSangre: ["", [Validators.required, Validators.minLength(2)]],
      colorOjos: ["", [Validators.required, Validators.minLength(2)]],
      diasVacaciones: [0, [Validators.required, Validators.min(0), Validators.max(30)]]
    }, { validators: [clavesCoincidenValidator('contraseña', 'confirmarContraseña'), 
                      fechaValidator('diaNacimiento', 'mesNacimiento', 'anioNacimiento')] });
  }
  
  async resultadoRegistro() {
    this.mensajeError.set("");

    let resultado = await this.auth.signUp(
      this.formRegistro.value.email!, 
      this.formRegistro.value.nombre!, 
      this.formRegistro.value.apellido!, 
      this.fechaNacimiento(), 
      this.formRegistro.value.tipoSangre!, 
      this.formRegistro.value.colorOjos!, 
      this.formRegistro.value.diasVacaciones!, 
      this.formRegistro.value.contraseña!
    );

    if (resultado != null) {
      this.mensajeError.set(resultado);
    } else {
      this.router.navigate(["/login"]);
    }
  }

  private fechaNacimiento() {
    const v = this.formRegistro.value;

    const dosDigitos = (n: number) => 
      String(n).padStart(2, '0');

      return `${v.anioNacimiento}-${dosDigitos(v.mesNacimiento)}-${dosDigitos(v.diaNacimiento)}`;
  }
}
