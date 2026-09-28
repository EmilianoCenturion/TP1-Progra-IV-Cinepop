import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function clavesCoincidenValidator(campo1: string, campo2: string): ValidatorFn {
    return (grupo: AbstractControl): ValidationErrors | null => {
        const valor1 = grupo.get(campo1)?.value;
        const valor2 = grupo.get(campo2)?.value;

        if (valor1 !== valor2) {
            return { losControlesNoCoinciden: true }
        } else {
            return null;
        }
    };
}
