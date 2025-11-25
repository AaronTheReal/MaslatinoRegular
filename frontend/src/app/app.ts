import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './shared/nav-bar/nav-bar';
import { Footer } from './shared/footer/footer';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Overlay } from './shared/overlay/overlay';
import { RadioPlayerComponent } from './shared/radio-player/radio-player';

// 👇 IMPORTA TU PLAYER GLOBAL AQUÍ
import { MegaphoneGlobalPlayerComponent } from './shared/megaphone-player/megaphone-player-global/megaphone-player-global';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavBar,
    Footer,
    CommonModule,
    ReactiveFormsModule,
    Overlay,
    MegaphoneGlobalPlayerComponent,
    RadioPlayerComponent
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
