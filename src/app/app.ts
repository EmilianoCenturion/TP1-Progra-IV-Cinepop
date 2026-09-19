import { Component, signal} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Nav } from './componentes/nav/nav';

@Component({
  imports: [RouterOutlet, Nav],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('Tp1-pagina-cine');
}