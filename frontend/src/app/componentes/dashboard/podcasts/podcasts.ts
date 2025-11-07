import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PodcastPCService, PodcastDesktopPayload } from './../../../services/podcast-servicePC';

@Component({
  selector: 'app-podcasts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './podcasts.html',
  styleUrls: ['./podcasts.css'],
})
export class Podcasts implements OnInit  {
  podcasts: PodcastDesktopPayload[] = [];
  errorMessage: string | null = null;
  loading = true;

  constructor(private podcastServicePC: PodcastPCService) {}

  ngOnInit(): void {
    this.podcastServicePC.obtenerPodcastsHome().subscribe({
      next: (data) => {
        this.podcasts = data ?? [];
        this.loading = false;
        console.log('✅ Podcasts recibidos:', this.podcasts);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'No se pudieron cargar los podcasts destacados';
        this.loading = false;
      }
    });
  }

  /**
   * Limitamos a 5 podcasts para que respete el layout visual Builder
   * (small, medium, large, medium, small).
   */
  podcastsLimited(): PodcastDesktopPayload[] {
    return this.podcasts.slice(0, 5);
  }

  // trackBy para @for
  trackById = (_: number, p: PodcastDesktopPayload) =>
    (p as any)._id ?? (p as any).id ?? (p as any).slug ?? _;

  // imagen de portada
  getCover(p: PodcastDesktopPayload): string {
    return (
      (p as any).coverImage ||
      (p as any).image ||
      (p as any).bannerImage ||
      'assets/placeholders/podcast-cover.png'
    );
  }

  // título
  getTitle(p: PodcastDesktopPayload): string {
    return (
      (p as any).title ||
      (p as any).name ||
      'Podcast'
    );
  }

  // acción play
  onPlay(p: PodcastDesktopPayload) {
    // Aquí conectas con tu reproductor global / guardar "last played" / etc.
    console.log('▶️ Play:', this.getTitle(p), p);
  }

  /**
   * Builder mostró distintos tamaños visuales de card:
   * - small
   * - medium
   * - large
   * - medium
   * - small
   * Mapeamos por índice.
   */
  getSizeClass(idx: number): string {
    const map = ['podcast-card-small', 'podcast-card-medium', 'podcast-card-large', 'podcast-card-medium', 'podcast-card-small'];
    return map[idx] || 'podcast-card-medium';
  }

  /**
   * El botón Play en Builder cambiaba de tamaño (40,45,55).
   * Aquí devolvemos medidas coherentes con el índice.
   */
  getPlaySize(idx: number): number {
    switch (this.getSizeClass(idx)) {
      case 'podcast-card-small':
        return 40;
      case 'podcast-card-large':
        return 55;
      default:
        return 45;
    }
  }

  /**
   * Necesitamos viewBox y radios que correspondan a cada SVG.
   * Builder usó:
   *  - small: 40x40 r=20 path "M15 12L28 20L15 28V12Z"
   *  - med:   45x45 r=22.5 path "M17 13L31 22.5L17 32V13Z"
   *  - large: 55x55 r=27.5 path "M21 17L39 27.5L21 38V17Z"
   */
  getPlayViewBox(idx: number): string {
    const sizeClass = this.getSizeClass(idx);
    if (sizeClass === 'podcast-card-small') return '0 0 40 40';
    if (sizeClass === 'podcast-card-large') return '0 0 55 55';
    return '0 0 45 45'; // medium / default
  }

  getPlayRadius(idx: number): number {
    const sizeClass = this.getSizeClass(idx);
    if (sizeClass === 'podcast-card-small') return 20;
    if (sizeClass === 'podcast-card-large') return 27.5;
    return 22.5; // medium / default
  }

  getPlayPath(idx: number): string {
    const sizeClass = this.getSizeClass(idx);
    if (sizeClass === 'podcast-card-small') {
      // small path
      return 'M15 12L28 20L15 28V12Z';
    }
    if (sizeClass === 'podcast-card-large') {
      // large path
      return 'M21 17L39 27.5L21 38V17Z';
    }
    // medium path
    return 'M17 13L31 22.5L17 32V13Z';
  }
}
