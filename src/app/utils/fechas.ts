// Date → 'AAAA-MM-DDTHH:mm:00' en hora local (formato de fecha_hora en Supabase)
export function aTextoLocal(fecha: Date): string {
    const dos = (n: number) => String(n).padStart(2, '0');

    return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:00`;
}