export const MINUTOS_LIMPIEZA = 30;

// Período que una función ocupa la sala: desde que empieza hasta que termina + 30 min
export interface Ocupacion {
    salaId: number;
    inicio: Date;
    fin: Date;     // ya incluye los 30 minutos
}

export function calcularOcupacion(salaId: number, inicio: Date, duracionMin: number): Ocupacion {
    const fin = new Date(inicio.getTime() + (duracionMin + MINUTOS_LIMPIEZA) * 60000);
    return { salaId, inicio, fin };
}

// Dos períodos se pisan si cada uno empieza antes de que termine el otro
function sePisan(a: Ocupacion, b: Ocupacion): boolean {
    return a.inicio < b.fin && b.inicio < a.fin;
}

// Devuelve el id de la primera sala libre, o null si están todas ocupadas
export function buscarSalaLibre(salas: any[], ocupadas: Ocupacion[], inicio: Date, duracionMin: number): number | null {
    for (const sala of salas) {
        const nueva = calcularOcupacion(sala.id, inicio, duracionMin);
        const ocupadasDeEsaSala = ocupadas.filter(o => o.salaId === sala.id);

        if (!ocupadasDeEsaSala.some(o => sePisan(o, nueva))) {
            return sala.id;
        }
    }

    return null;
}