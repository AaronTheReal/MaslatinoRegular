// src/app/app.ts
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './shared/nav-bar/nav-bar';
import { Footer } from './shared/footer/footer';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

// 👇 Asegúrate de apuntar a la ruta correcta del Overlay
import { Overlay } from './shared/overlay/overlay'; // <-- path real

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavBar,
    Footer,
    CommonModule,
    ReactiveFormsModule,
    Overlay, // <-- IMPORTAR AQUÍ
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  isSearchOpen = false;
  protected readonly title = signal('nombre-proyecto');

  onSearchPicked(ev: { title: string; route?: string }) {
    console.log('Picked:', ev);
  }
}
