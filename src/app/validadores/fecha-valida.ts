import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";
import { groupBy } from "rxjs";

// Valida que dia/mes/año formen una fecha real

export function fechaValidator(campoDia: string, campoMes: string, campoAnio: string): ValidatorFn {
    return (grupo: AbstractControl): ValidationErrors | null => {
        const dia = Number(grupo.get(campoDia)?.value);
        const mes = Number(grupo.get(campoMes)?.value);
        const anio = Number(grupo.get(campoAnio)?.value);

        // Si falta alguno, de eso se encarga Validators.required
        if (!dia || !mes || !anio) {
            return null;
        }

        const fecha = new Date(anio, mes -1, dia);

        if (fecha.getMonth() !== mes - 1) {
            return { fechaInvalida: true };
        }

        return null;
    };
}