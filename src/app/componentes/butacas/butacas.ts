import { Component, OnInit, signal } from '@angular/core';
import { JsonPipe, Location, NgFor, NgIf } from '@angular/common';
import { Butaca } from '../../servicios/butaca';
import { ActivatedRoute, Router } from '@angular/router';
import { Funciones } from '../../servicios/funciones';
import { Reserva } from '../../servicios/reserva';


@Component({
  imports: [NgIf, NgFor],
  selector: 'app-butacas',
  styleUrl: './butacas.css',
  templateUrl: './butacas.html',
})
export class Butacas implements OnInit {

  funcion = signal<any>(null);
  filasAgrupadas = signal<any[]>([]);
  idsOcupados = signal<number[]>([]);

  butacaSeleccionada = signal<any[]>([]);

  constructor(private butacaService: Butaca,
    private route: ActivatedRoute,
    private location: Location,
    private funciones: Funciones,
    private router: Router,
    private reserva: Reserva) {}

  ngOnInit() {
    this.route.paramMap.subscribe(async params => {
      const id = params.get('id')

      if (!id) {
        this.location.back();
        return;
      }

      const resultado = await this.funciones.getFuncionId(Number(id));
      const resultadoButacasOcupadas = await this.butacaService.getButacasOcupadas(Number(id))

      if (!resultado || !resultadoButacasOcupadas) {
        this.location.back();
        return;
      }

      const resultadoButacasSala = await this.butacaService.getButacasPorSala(resultado.sala_id);

      if (!resultadoButacasSala) {
        this.location.back();
        return;
      }

      this.funcion.set(resultado);
      this.filasAgrupadas.set(this.agruparPorFila(resultadoButacasSala));
      this.idsOcupados.set(resultadoButacasOcupadas.map(r => r.butaca_id))
    })
  }

  private agruparPorFila(butacas: any[]) {
    const grupos: { fila: string, butacas: any[] }[] = []

    for (const butaca of butacas) {
      const ultimoGrupo = grupos[grupos.length - 1];

      if (ultimoGrupo && ultimoGrupo.fila === butaca.fila) {
        ultimoGrupo.butacas.push(butaca);
      } else {
        if (ultimoGrupo && ultimoGrupo.fila === 'J') {
          grupos.push({ fila: 'K', butacas: [] });
        }
        grupos.push({ fila: butaca.fila, butacas: [butaca] });
      }
    }

    return grupos;
  }

  estaOcupada(butacaId: number) {
    return this.idsOcupados().includes(butacaId);
  }

  esFinDeBloque(butaca: any): boolean {
  if (butaca.tipo_butaca === 'Accesible') {
    return false;
  }
  return butaca.numero === 4 || butaca.numero === 24;
  }

  seleccionarButacas(id: number) {
    
    if (this.estaOcupada(id)) {
      return
    }
    
    const butacaActual = this.butacaSeleccionada();
    const nuevaLista: any[] = [];

    let encontrado = false;

    for (let butacaId of butacaActual) {
      if (butacaId === id) {
        encontrado = true;
      } else {
        nuevaLista.push(butacaId)
      }
    }

    if (!encontrado) {
      nuevaLista.push(id)
    }

    this.butacaSeleccionada.set(nuevaLista);
  }

  estaSeleccionada(butacaId: any) {
    return this.butacaSeleccionada().some(b => b.id === butacaId)
  }

  total() {
    let suma = 0;

    for (let b of this.butacaSeleccionada()) {
      suma += b.precio;
    }

    return suma;
  }

  irACandy() {
    this.reserva.setFuncionId(this.funcion().id);
    this.reserva.setButacas(this.butacaSeleccionada());
    this.router.navigate(['/funcion', this.funcion().id, 'candy'])
  }
}