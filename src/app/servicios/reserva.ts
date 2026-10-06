import { Service, signal } from '@angular/core';

@Service()
export class Reserva {
    funcionId = signal<number | null>(null);
    butacasSeleccionadas = signal<any[]>([]);
    carritoCandy = signal<any[]>([]);
    combo = signal<any>(null);

    setFuncionId(id: number) {
        this.funcionId.set(id)
    }
    
    setButacas(butacas: any[]) {
        this.butacasSeleccionadas.set(butacas);
    }

    setCarrito(carrito: any[]) {
        this.carritoCandy.set(carrito);
    }

    setCombo(combo: any) {
        this.combo.set(combo);
    }

    limpiar() {
        this.funcionId.set(null);
        this.butacasSeleccionadas.set([]);
        this.carritoCandy.set([]);
        this.combo.set(null);
    }
}
