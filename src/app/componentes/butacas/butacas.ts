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

  avisoCombo = signal("");

  constructor(private butacaService: Butaca,
    private route: ActivatedRoute,
    private location: Location,
    private funciones: Funciones,
    private router: Router,
    public reserva: Reserva) {}

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

  seleccionarButacas(butaca: any) {

    if (this.estaOcupada(butaca.id)) {
      return
    }

    const butacaActual = this.butacaSeleccionada();
    const nuevaLista: any[] = [];

    let encontrado = false;

    for (let b of butacaActual) {
      if (b.id === butaca.id) {
        encontrado = true;
      } else {
        nuevaLista.push(b)
      }
    }

    if (!encontrado) {
      const combo = this.reserva.combo();

      // Con combo no se pueden elegir más butacas que las entradas que incluye
      if (combo && nuevaLista.length >= combo.cantidad_entradas) {
        this.avisoCombo.set(`El combo incluye ${combo.cantidad_entradas} entradas: deseleccioná una para elegir otra.`);
        return;
      }

      nuevaLista.push(butaca)
    }

    this.avisoCombo.set('');
    this.butacaSeleccionada.set(nuevaLista);
  }

  estaSeleccionada(butacaId: any) {
    return this.butacaSeleccionada().some(b => b.id === butacaId)
  }

  total() {
    let suma = 0;

    for (let b of this.butacaSeleccionada()) {
      // precio es numeric en Supabase y llega como string
      suma += Number(b.precio);
    }

    return suma;
  }

  // Con combo hay que elegir exactamente las entradas que incluye
  puedeContinuar() {
    const combo = this.reserva.combo();

    if (combo) {
      return this.butacaSeleccionada().length === combo.cantidad_entradas;
    }

    return this.butacaSeleccionada().length > 0;
  }

  continuar() {
    this.reserva.setFuncionId(this.funcion().id);
    this.reserva.setButacas(this.butacaSeleccionada());

    // El combo ya trae el candy: va directo al checkout
    if (this.reserva.combo()) {
      this.reserva.setCarrito([]);
      this.router.navigate(['/funcion', this.funcion().id, 'checkout']);
      return;
    }

    this.router.navigate(['/funcion', this.funcion().id, 'candy'])
  }
}