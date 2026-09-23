import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Nav } from '../nav/nav';

@Component({
  imports: [Nav, RouterOutlet],
  selector: 'app-layout',
  styleUrl: './layout.css',
  templateUrl: './layout.html',
})
export class Layout {}
