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
import { MegaphoneGlobalPlayerComponent } from './shared/megaphone-player/megaphone-player-global/megaphone-player-global';
import {AdsComponent} from './componentes/ads/ads'
import {AudioFloatingPlayerComponent} from './shared/audio-floating-player.component/audio-floating-player.component';
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
    RadioPlayerComponent,
    AdsComponent,
    AudioFloatingPlayerComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  isSearchOpen = false;
  isPodcastDetailRoute = false; // 👈 NUEVA BANDERA

  protected readonly title = signal('nombre-proyecto');
  private firstNav = true;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {

    if (!isPlatformBrowser(this.platformId)) return;

    // 🔎 Chequeo inicial por si ya carga en /podcast-show/:id
    const initialPath = (this.router.url || '').split('?')[0];
    this.isPodcastDetailRoute =
      initialPath.startsWith('/podcast-show/') &&
      initialPath.split('/').length === 3;

    window.dataLayer = window.dataLayer || [];

      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => {

          const path = (e.urlAfterRedirects || '').split('?')[0];

          // ✅ SOLO cuando es /podcast-show/:id exacto
          this.isPodcastDetailRoute =
            path.startsWith('/podcast-show/') &&
            path.split('/').length === 3;

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
