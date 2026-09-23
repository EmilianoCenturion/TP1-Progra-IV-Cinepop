import { Component, OnInit, signal } from '@angular/core';
import { Location, NgFor, NgIf } from '@angular/common';
import { Butaca } from '../../servicios/butaca';
import { ActivatedRoute } from '@angular/router';
import { Funciones } from '../../servicios/funciones';

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

  constructor(private butacaService: Butaca, 
    private route: ActivatedRoute, 
    private location: Location, 
    private funciones: Funciones) {}

  ngOnInit() {
    this.route.paramMap.subscribe( async params => {
      const id = params.get('id')

      if(!id) {
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
        grupos.push( { fila: butaca.fila, butacas: [butaca] })
      }
    }

    return grupos;
  }

  estaOcupada(butacaId: number) {
    return this.idsOcupados().includes(butacaId);
  }

  esFinDeBloque(butaca: any): boolean {
  if (butaca.tipo_butaca === 'Accesible') {
    return butaca.numero === 2 || butaca.numero === 12;
  }
  return butaca.numero === 4 || butaca.numero === 24;
}
}
