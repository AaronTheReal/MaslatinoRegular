import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PodcastPCService, PodcastDesktopPayload } from './../../../services/podcast-servicePC';

@Component({
  selector: 'app-podcasts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="podcast-section">
      <!-- Header / título de bloque -->
      <h2 class="podcast-headline">PODCAST</h2>

      <p class="podcast-intro">
        Conéctate con tus raíces latinas. Voces reales. Historias reales. Hecho por nosotros.
      </p>

      <!-- Estados de carga / error -->
      <div class="status-wrapper" *ngIf="loading || errorMessage">
        <div class="loader" *ngIf="loading">
          <div class="spinner"></div>
          <p class="loader-text">Cargando podcasts...</p>
        </div>

        <div class="error-box" *ngIf="!loading && errorMessage">
          <p class="error-text">{{ errorMessage }}</p>
        </div>
      </div>

      <!-- Grid de podcasts -->
      <div class="podcast-grid" *ngIf="!loading && !errorMessage">
        @for (p of podcasts; track trackById) {
          <!-- CARD -->
          <div class="podcast-card-container">
            <!-- Wrapper imagen/fondo -->
            <div
              class="podcast-image-wrapper"
              [style.background-color]="getBgColor(p)"
            >
              <!-- cover -->
              <img
                class="podcast-image"
                [src]="getCover(p)"
                [alt]="getTitle(p)"
                loading="lazy"
              />

              <!-- botón play flotante -->
              <button
                class="play-button"
                type="button"
                aria-label="Reproducir podcast"
                (click)="onPlay(p)"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M8 5v14l11-7L8 5z" fill="currentColor" />
                </svg>
              </button>
            </div>

            <!-- título del podcast -->
            <p class="podcast-card-title">
              {{ getTitle(p) }}
            </p>
          </div>
        }
      </div>

      <!-- CTA "ver más" -->
      <a
        class="view-more-button"
        [routerLink]="['/podcast-list']"
        aria-label="Ver todos los podcasts"
      >
        ver más
      </a>
    </section>
  `,
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

  // slug/id para deep link
  getSlugOrId(p: PodcastDesktopPayload): string {
    return (
      (p as any).slug ??
      (p as any)._id ??
      (p as any).id ??
      ''
    );
  }

  // color de fondo detrás de la portada
  // Builder.io usaba un color específico por card.
  // Acá: si en tu backend ya guardas algo tipo "themeColor" / "backgroundColor", úsalo.
  // Si no existe, caemos a un fallback neutro oscuro.
  getBgColor(p: PodcastDesktopPayload): string {
    return (
      (p as any).backgroundColor ||
      (p as any).themeColor ||
      '#1a1a1a'
    );
  }

  // Play: conecta con tu reproductor global
  onPlay(p: PodcastDesktopPayload) {
    // Aquí puedes despachar al player global, guardar "last played", etc.
    console.log('▶️ Play:', this.getTitle(p), p);
  }
}
