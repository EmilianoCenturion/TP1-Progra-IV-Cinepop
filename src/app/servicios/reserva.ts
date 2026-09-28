import { Service, signal } from '@angular/core';

@Service()
export class Reserva {
    funcionId = signal<number | null>(null);
    butacasSeleccionadas = signal<any[]>([]);
    carritoCandy = signal<any[]>([]);

    setFuncionId(id: number) {
        this.funcionId.set(id)
    }
    
    setButacas(butacas: any[]) {
        this.butacasSeleccionadas.set(butacas);
    }

    serCarrito(carrito: any[]) {
        this.carritoCandy.set(carrito);
    }

    limpiar() {
        this.funcionId.set(null);
        this.butacasSeleccionadas.set([]);
        this.carritoCandy.set([]);
    }
}
