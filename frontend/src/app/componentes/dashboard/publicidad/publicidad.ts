import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CdnSrcsetPipe } from '../../../pipes/cdn-image.pipe';

/** Una imagen del anuncio con sus medidas reales (evitan el salto al cargar). */
interface ImagenAnuncio {
  src: string;
  w: number;
  h: number;
}

/**
 * Cada anuncio trae su pieza de escritorio y la de celular. Las dos van en un
 * <picture>: el navegador baja solo la que corresponde al ancho de pantalla y
 * el servidor ya puede pintarlo (antes se elegía con JavaScript, así que el
 * anuncio aparecía después de cargar y empujaba hacia abajo lo de debajo).
 */
interface Anuncio {
  alt: string;
  link: string;
  escritorio: ImagenAnuncio;
  celular: ImagenAnuncio;
}

// Campaña Maura Healey (gobernadora, elección del 3 de noviembre de 2026).
// El GIF de escritorio es animado: se sirve tal cual, sin pasar por el CDN de
// imágenes, para que no pierda la animación.
const ANUNCIOS: Anuncio[] = [
  {
    alt: 'Vote el 3 de noviembre por la gobernadora Maura Healey. Pagado por el Partido Demócrata de Massachusetts.',
    link: 'https://www.maurahealey.com/',
    escritorio: {
      src: 'assets/publicidad/Maura_healey_Mas_Latino_Banner_728x90px_Final_SPACompu.gif',
      w: 1517,
      h: 188,
    },
    celular: {
      src: 'assets/publicidad/MauraHealey_MasLatino_Post_1080x1080px_SPA_v1Celular.jpg',
      w: 1080,
      h: 1080,
    },
  },
];

// Campañas anteriores, fuera de rotación: Saravia Law (https://saravialaw.com/)
// y Temporada Boricorridor (https://temporada.boricorridor.com/). Sus piezas de
// escritorio siguen en assets/publicidad.jpg y assets/publicidad2.png; las de
// celular se quitaron de assets/publicidad/ al subir la de Healey.

@Component({
  selector: 'app-publicidad',
  standalone: true,
  imports: [CommonModule, CdnSrcsetPipe],
  templateUrl: './publicidad.html',
  styleUrl: './publicidad.css'
})
export class Publicidad implements OnInit, OnDestroy {
  @ViewChild('carousel') carousel!: ElementRef<HTMLDivElement>;

  currentIndex = 0;
  readonly ads = ANUNCIOS;
  private intervalId: any;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  // Estados del drag (movimiento en vivo)
  private isDragging = false;
  private startX = 0;
  dragOffsetPercent = 0;
  transitionStyle = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

  /** Con un solo anuncio no hay carrusel: ni flechas, ni puntos, ni arrastre. */
  get esCarrusel(): boolean {
    return this.ads.length > 1;
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  private startAutoPlay(): void {
    this.stopAutoPlay();
    if (!this.esCarrusel) return;
    this.intervalId = setInterval(() => this.nextAd(), 5000);
  }

  private stopAutoPlay(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // === NAVEGACIÓN ===
  nextAd(): void {
    this.currentIndex = (this.currentIndex + 1) % this.ads.length;
  }

  prevAd(): void {
    this.currentIndex = (this.currentIndex - 1 + this.ads.length) % this.ads.length;
  }

  goTo(index: number): void {
    this.currentIndex = index;
  }

  getTransform(): string {
    const base = -this.currentIndex * 100;
    return `translateX(${base + this.dragOffsetPercent}%)`;
  }

  // === DRAG / SWIPE (movimiento en vivo sin parpadeo) ===
  private getClientX(e: MouseEvent | TouchEvent): number {
    return (e as TouchEvent).touches ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
  }

  startDrag(e: MouseEvent | TouchEvent): void {
    if (!this.esCarrusel) return;
    this.isDragging = true;
    this.startX = this.getClientX(e);
    this.dragOffsetPercent = 0;
    this.transitionStyle = 'none';
    this.stopAutoPlay(); // pausa mientras arrastras
  }

  drag(e: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;
    const currentX = this.getClientX(e);
    const diff = currentX - this.startX;
    const containerWidth = this.carousel.nativeElement.offsetWidth;
    this.dragOffsetPercent = (diff / containerWidth) * 100;
  }

  endDrag(): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    const threshold = 18;
    if (this.dragOffsetPercent < -threshold) {
      this.nextAd();
    } else if (this.dragOffsetPercent > threshold) {
      this.prevAd();
    }

    this.dragOffsetPercent = 0;
    this.transitionStyle = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    // reactiva autoplay
    setTimeout(() => this.startAutoPlay(), 800);
  }

  // Evitar que las flechas activen el drag
  next(e: Event): void {
    e.stopPropagation();
    this.nextAd();
  }

  prev(e: Event): void {
    e.stopPropagation();
    this.prevAd();
  }
}