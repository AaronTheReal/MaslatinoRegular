// src/app/.../podcasts.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PodcastPCService, PodcastDesktopPayload } from './../../../services/podcast-servicePC';

// 👇 Asegúrate de que esta ruta corresponde a tu archivo real:
import { MegaphonePlayerService } from './../../../shared/megaphone-player/megaphone.service';

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

  // URL de tu playlist Megaphone
  private readonly megaphoneEmbedUrl = 'https://playlist.megaphone.fm?p=MTSTA4599725524';

  // 👇 INYECTA AQUÍ el servicio (no lo declares aparte)
  constructor(
    private podcastServicePC: PodcastPCService,
    private megaphonePlayerService: MegaphonePlayerService
  ) {}

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

  podcastsLimited(): PodcastDesktopPayload[] {
    return this.podcasts.slice(0, 5);
  }

  trackById = (_: number, p: PodcastDesktopPayload) =>
    (p as any)._id ?? (p as any).id ?? (p as any).slug ?? _;

  getCover(p: PodcastDesktopPayload): string {
    return (
      (p as any).coverImage ||
      (p as any).image ||
      (p as any).bannerImage ||
      'assets/placeholders/podcast-cover.png'
    );
  }

  getTitle(p: PodcastDesktopPayload): string {
    return (
      (p as any).title ||
      (p as any).name ||
      'Podcast'
    );
  }

  // ▶️ acción play -> abrir player global
  onPlay(p: PodcastDesktopPayload) {
    console.log('▶️ Play:', this.getTitle(p), p);

    // abrir el player global con tu playlist de Megaphone
    this.megaphonePlayerService.open(this.megaphoneEmbedUrl);
  }

  getSizeClass(idx: number): string {
    const map = ['podcast-card-small', 'podcast-card-medium', 'podcast-card-large', 'podcast-card-medium', 'podcast-card-small'];
    return map[idx] || 'podcast-card-medium';
  }

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

  getPlayViewBox(idx: number): string {
    const sizeClass = this.getSizeClass(idx);
    if (sizeClass === 'podcast-card-small') return '0 0 40 40';
    if (sizeClass === 'podcast-card-large') return '0 0 55 55';
    return '0 0 45 45';
  }

  getPlayRadius(idx: number): number {
    const sizeClass = this.getSizeClass(idx);
    if (sizeClass === 'podcast-card-small') return 20;
    if (sizeClass === 'podcast-card-large') return 27.5;
    return 22.5;
  }

  getPlayPath(idx: number): string {
    const sizeClass = this.getSizeClass(idx);
    if (sizeClass === 'podcast-card-small') {
      return 'M15 12L28 20L15 28V12Z';
    }
    if (sizeClass === 'podcast-card-large') {
      return 'M21 17L39 27.5L21 38V17Z';
    }
    return 'M17 13L31 22.5L17 32V13Z';
  }
}
