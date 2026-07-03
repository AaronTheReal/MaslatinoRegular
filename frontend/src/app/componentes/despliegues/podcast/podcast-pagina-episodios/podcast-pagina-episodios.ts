import { Component, Input, CUSTOM_ELEMENTS_SCHEMA, OnChanges, SimpleChanges, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Podcast } from '../../../../services/podcastDespliegue-service';

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

  heroBgLoaded = false;
  coverLoaded = false;

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

      if (this.podcast?.coverImage2) {
        this.preloadImage(this.podcast.coverImage2, 'background');
      } else {
        this.heroBgLoaded = true;
      }

      if (this.podcast?.coverImage) {
        this.preloadImage(this.podcast.coverImage, 'cover');
      } else {
        this.coverLoaded = true;
      }

      console.log('🎙️ Podcast recibido en PodcastPaginaEpisodios:', this.podcast);
      console.log('📌 Título del podcast:', this.podcast?.title);
      console.log('📌 Cantidad de episodios:', this.podcast?.episodes?.length || 0);
      console.log('📌 Episodios:', this.podcast?.episodes);
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
    return this.heroBgLoaded && this.podcast?.coverImage2
      ? `url("${this.podcast.coverImage2}")`
      : 'none';
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