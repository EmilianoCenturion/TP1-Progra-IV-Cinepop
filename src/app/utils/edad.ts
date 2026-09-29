export function calcularEdad(fechaNacimiento: string): number {
    const nacimiento = new Date(fechaNacimiento + 'T00:00:00')
    const hoy = new Date();

    let edad = hoy.getFullYear() - nacimiento.getFullYear();

    const yaCumplio = hoy.getMonth() > nacimiento.getMonth() 
        || (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() >= 
        nacimiento.getDate()); 

    if (!yaCumplio) {
        edad --;
    }

    return edad;
}