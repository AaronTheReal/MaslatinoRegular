import { Component, Input, CUSTOM_ELEMENTS_SCHEMA, OnChanges, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Podcast } from '../../../../services/podcastDespliegue-service';
import { CdnImagePipe } from '../../../../pipes/cdn-image.pipe';

const PLACEHOLDER = 'assets/placeholder.svg';

@Component({
  selector: 'app-podcast-pagina-episodios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './podcast-pagina-episodios.html',
  styleUrl: './podcast-pagina-episodios.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PodcastPaginaEpisodios implements OnChanges {
  @Input() podcast: Podcast | null = null;

  private readonly platformId = inject(PLATFORM_ID);

  // El pipe se usa desde TS porque la precarga y el <img> tienen que pedir
  // exactamente la misma URL; si una fuera la original y otra la del CDN el
  // navegador descargaria la portada dos veces.
  private readonly cdn = new CdnImagePipe();

  heroBgLoaded = false;
  coverLoaded = false;

  /** Portada cuadrada: se muestra a 230px como maximo, 480 cubre pantallas 2x */
  get coverSrc(): string {
    return this.cdn.transform(this.podcast?.coverImage, 480) || PLACEHOLDER;
  }

  /** Fondo del hero: ocupa el ancho completo de la seccion */
  get heroBgSrc(): string {
    return this.cdn.transform(this.podcast?.coverImage2, 1600);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['podcast']) {
      this.resetLoadingState();

      // En SSR no existe Image(): marcar cargado para que el HTML
      // (título/descripción) se serialice y los bots lo vean.
      if (!isPlatformBrowser(this.platformId)) {
        this.heroBgLoaded = true;
        this.coverLoaded = true;
        return;
      }

      const heroBg = this.heroBgSrc;
      if (heroBg) {
        this.preloadImage(heroBg, 'background');
      } else {
        this.heroBgLoaded = true;
      }

      if (this.podcast?.coverImage) {
        this.preloadImage(this.coverSrc, 'cover');
      } else {
        this.coverLoaded = true;
      }
    }
  }

  private resetLoadingState(): void {
    this.heroBgLoaded = false;
    this.coverLoaded = false;
  }

  private preloadImage(src: string, target: 'background' | 'cover'): void {
    const img = new Image();

    img.onload = () => {
      if (target === 'background') {
        this.heroBgLoaded = true;
      } else {
        this.coverLoaded = true;
      }
    };

    img.onerror = () => {
      if (target === 'background') {
        this.heroBgLoaded = true;
      } else {
        this.coverLoaded = true;
      }
    };

    img.src = src;
  }

  get heroBackgroundStyle(): string {
    const bg = this.heroBgSrc;
    return this.heroBgLoaded && bg ? `url("${bg}")` : 'none';
  }

  get contentReady(): boolean {
    return this.heroBgLoaded && this.coverLoaded;
  }

  get descriptionText(): string {
    return this.podcast?.description || 'Descripción no disponible';
  }

  get titleText(): string {
    return this.podcast?.title || 'Portada del podcast';
  }
}