import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Actividad } from '../../../servicios/actividad';

@Component({
  imports: [NgFor, NgIf, DatePipe, FormsModule],
  selector: 'app-admin-actividad',
  styleUrl: './admin-actividad.css',
  templateUrl: './admin-actividad.html',
})
export class AdminActividad implements OnInit {
  private actividad = inject(Actividad);

  registros = signal<any[]>([]);
  filtrados = signal<any[]>([]);
  usuarios = signal<string[]>([]);
  cargando = signal(true);

  // Filtros
  texto = '';
  usuario = '';
  periodo = 'todo';

  periodos = [
    { valor: 'todo', nombre: 'Todo' },
    { valor: 'hoy', nombre: 'Hoy' },
    { valor: '7', nombre: 'Últimos 7 días' },
    { valor: '30', nombre: 'Últimos 30 días' },
  ];

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);

    const datos = await this.actividad.getActividad();

    this.registros.set(datos);

    // Lista de emails sin repetir para el select de usuarios
    const emails: string[] = [];

    for (let r of datos) {
      if (!emails.includes(r.usuario_email)) {
        emails.push(r.usuario_email);
      }
    }

    this.usuarios.set(emails);
    this.filtrar();
    this.cargando.set(false);
  }

  filtrar() {
    const texto = this.texto.trim().toLowerCase();
    const desde = this.fechaDesde();

    const resultado = this.registros().filter(r => {
      if (texto && !r.descripcion.toLowerCase().includes(texto)) {
        return false;
      }

      if (this.usuario && r.usuario_email !== this.usuario) {
        return false;
      }

      if (desde && this.fechaLocal(r.fecha) < desde) {
        return false;
      }

      return true;
    });

    this.filtrados.set(resultado);
  }

  fechaLocal(fecha: string) {
    return new Date(fecha + "Z");
  }

  nombreUsuario(email: string) {
    if (email === "emucomun@gmail.com") {
      return "Admin";
    }

    return email;
  }

  limpiarFiltros() {
    this.texto = '';
    this.usuario = '';
    this.periodo = 'todo';
    this.filtrar();
  }

  // Primer momento del período elegido, o null si es "todo"
  private fechaDesde(): Date | null {
    if (this.periodo === 'todo') {
      return null;
    }

    const hoy = new Date();
    const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    if (this.periodo === 'hoy') {
      return inicioDeHoy;
    }

    return new Date(inicioDeHoy.getTime() - (Number(this.periodo) - 1) * 24 * 3600000);
  }
}