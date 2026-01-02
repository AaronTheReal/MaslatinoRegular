import { Component, Inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NavBar } from './shared/nav-bar/nav-bar';
import { Footer } from './shared/footer/footer';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Overlay } from './shared/overlay/overlay';
import { RadioPlayerComponent } from './shared/radio-player/radio-player';
import { PLATFORM_ID } from '@angular/core';
import { filter } from 'rxjs/operators';

// 👇 IMPORTA TU PLAYER GLOBAL AQUÍ
import { MegaphoneGlobalPlayerComponent } from './shared/megaphone-player/megaphone-player-global/megaphone-player-global';

declare global {
  interface Window {
    dataLayer: any[];
  }
}

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

  private firstNav = true;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    // ✅ Evita errores en SSR: esto solo debe correr en el navegador
    if (!isPlatformBrowser(this.platformId)) return;

    // Asegura dataLayer
    window.dataLayer = window.dataLayer || [];

    // ✅ Virtual pageviews en navegación interna (SPA)
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        // Evita duplicar el page_view inicial (All Pages ya lo manda el Google tag)
        if (this.firstNav) {
          this.firstNav = false;
          return;
        }

        window.dataLayer.push({
          event: 'virtual_pageview',
          page_location: location.href,
          page_title: document.title,
          page_path: e.urlAfterRedirects
        });
      });
  }

  onSearchPicked(ev: { title: string; route?: string }) {
    console.log('Picked:', ev);
  }
}
