// Componente: podcast.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PodcastPCService, PodcastDesktopPayload } from './../../../services/podcast-servicePC';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-podcasts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './podcasts.html',
  styleUrls: ['./podcasts.css']
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

  trackById = (_: number, p: PodcastDesktopPayload) => (p as any)._id ?? (p as any).id ?? (p as any).slug ?? _;

  getCover(p: PodcastDesktopPayload): string {
    return (p as any).coverImage || (p as any).image || (p as any).bannerImage || 'assets/placeholders/podcast-cover.png';
  }

  getTitle(p: PodcastDesktopPayload): string {
    return (p as any).title || (p as any).name || 'Podcast';
  }

  getSlugOrId(p: PodcastDesktopPayload): string {
    return (p as any).slug ?? (p as any)._id ?? (p as any).id ?? '';
  }

  onPlay(p: PodcastDesktopPayload) {
    // Conecta con tu reproductor global aquí
    console.log('Play:', this.getTitle(p), p);
  }
}
