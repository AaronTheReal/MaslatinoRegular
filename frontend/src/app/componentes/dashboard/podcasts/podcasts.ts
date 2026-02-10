import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PodcastPCService, PodcastDesktopPayload } from './../../../services/podcast-servicePC';
import { MegaphonePlayerService } from './../../../shared/megaphone-player/megaphone.service';

@Component({
  selector: 'app-podcasts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './podcasts.html',
  styleUrls: ['./podcasts.css'],
})
export class Podcasts implements OnInit {
  private readonly maxVisible = 5;
  private readonly megaphoneEmbedUrl = 'https://playlist.megaphone.fm?p=MTSTA4599725524'; // Verifica este URL

  podcasts: PodcastDesktopPayload[] = [];
  errorMessage: string | null = null;
  loading = true;
  currentIndex = 0; // Índice para el carrusel

  constructor(
    private podcastServicePC: PodcastPCService,
    private megaphonePlayerService: MegaphonePlayerService
  ) {}

  ngOnInit(): void {
    this.podcastServicePC.obtenerPodcastsHome().subscribe({
      next: (data) => {
        this.podcasts = data ?? [];
        this.loading = false;
        this.ensureIndexInBounds();
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
    return this.podcasts.slice(0, this.maxVisible);
  }

  get totalSlides(): number {
    return this.podcastsLimited().length;
  }

  get canNavigate(): boolean {
    return this.totalSlides > 1;
  }

  onPrevious(): void {
    if (!this.canNavigate) return;
    this.currentIndex = (this.currentIndex - 1 + this.totalSlides) % this.totalSlides;
    console.log('← Prev: currentIndex', this.currentIndex); // Debug
  }

  onNext(): void {
    if (!this.canNavigate) return;
    this.currentIndex = (this.currentIndex + 1) % this.totalSlides;
    console.log('→ Next: currentIndex', this.currentIndex); // Debug
  }

  getSlideAriaLabel(index: number): string {
    const list = this.podcastsLimited();
    const item = list[index];
    const title = item ? this.getTitle(item) : 'Podcast';
    return `Podcast ${index + 1} de ${this.totalSlides}: ${title}`;
  }

  trackById = (_: number, p: PodcastDesktopPayload) =>
    (p as any)._id ?? (p as any).id ?? (p as any).slug ?? _;

  getCover(p: PodcastDesktopPayload): string {
    return (p as any).coverImage || (p as any).image || (p as any).bannerImage || 'assets/placeholders/podcast-cover.png';
  }

  getTitle(p: PodcastDesktopPayload): string {
    return (p as any).title || (p as any).name || 'Podcast';
  }

  onPlay(p: PodcastDesktopPayload) {
    console.log('▶️ Play:', this.getTitle(p), p);
    try {
      this.megaphonePlayerService.open(this.megaphoneEmbedUrl);
      console.log('Player abierto con éxito');
    } catch (error) {
      console.error('Error al abrir player:', error);
    }
  }

  getSizeClass(idx: number): string {
    const map = ['podcast-card-small', 'podcast-card-medium', 'podcast-card-large', 'podcast-card-medium', 'podcast-card-small'];
    return map[idx] || 'podcast-card-medium';
  }

  getPlaySize(idx: number): number {
    const size = this.getSizeClass(idx);
    return size === 'podcast-card-small' ? 40 : size === 'podcast-card-large' ? 55 : 45;
  }

  getPlayViewBox(idx: number): string {
    const size = this.getSizeClass(idx);
    return size === 'podcast-card-small' ? '0 0 40 40' : size === 'podcast-card-large' ? '0 0 55 55' : '0 0 45 45';
  }

  getPlayRadius(idx: number): number {
    const size = this.getSizeClass(idx);
    return size === 'podcast-card-small' ? 20 : size === 'podcast-card-large' ? 27.5 : 22.5;
  }

  getPlayPath(idx: number): string {
    const size = this.getSizeClass(idx);
    if (size === 'podcast-card-small') return 'M15 12L28 20L15 28V12Z';
    if (size === 'podcast-card-large') return 'M21 17L39 27.5L21 38V17Z';
    return 'M17 13L31 22.5L17 32V13Z';
  }
isComingSoon(idx: number): boolean {
  // 0 sí, 1 sí, 2 no, 3 sí, 4 sí
  return idx !== 1 && idx !== 2;
}

  private ensureIndexInBounds(): void {
    if (this.totalSlides === 0) {
      this.currentIndex = 0;
      return;
    }
    this.currentIndex = ((this.currentIndex % this.totalSlides) + this.totalSlides) % this.totalSlides;
  }
}