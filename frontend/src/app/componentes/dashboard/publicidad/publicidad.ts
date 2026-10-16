import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
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
export interface Anuncio {
  /** Nombre con el que llega a GA4 (parámetro `anuncio` de sus eventos). */
  id: string;
  alt: string;
  link: string;
  escritorio: ImagenAnuncio;
  celular: ImagenAnuncio;
  /** Momento en que deja de mostrarse, con zona horaria. Sin fecha, no caduca. */
  hasta?: string;
}

// Campaña Maura Healey (gobernadora, elección del 3 de noviembre de 2026).
// El GIF de escritorio es animado: se sirve tal cual, sin pasar por el CDN de
// imágenes, para que no pierda la animación.
const ANUNCIOS: Anuncio[] = [
  {
    id: 'healey-2026',
    alt: 'Vote el 3 de noviembre por la gobernadora Maura Healey. Pagado por el Partido Demócrata de Massachusetts.',
    // Las utm_* hacen que en la analítica de la campaña las visitas que les
    // mandamos salgan como "maslatino / banner".
    link: 'https://www.maurahealey.com/?utm_source=maslatino&utm_medium=banner&utm_campaign=healey-2026',
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
    // Se quita sola al acabar el día de la elección: medianoche en
    // Massachusetts. El 3 de noviembre ya rige el horario de invierno (UTC-5).
    hasta: '2026-11-04T00:00:00-05:00',
  },
];

// Campañas anteriores, fuera de rotación: Saravia Law (https://saravialaw.com/)
// y Temporada Boricorridor (https://temporada.boricorridor.com/). Sus piezas de
// escritorio siguen en assets/publicidad.jpg y assets/publicidad2.png; las de
// celular se quitaron de assets/publicidad/ al subir la de Healey.

/** Los anuncios que siguen vigentes en `ahora` (milisegundos, como Date.now()). */
export function anunciosVigentes(anuncios: readonly Anuncio[], ahora: number): Anuncio[] {
  return anuncios.filter((a) => !a.hasta || ahora < Date.parse(a.hasta));
}

/** Eventos del anuncio que se dejan en el dataLayer de GTM. */
type EventoAnuncio = 'anuncio_vista' | 'anuncio_clic';

@Component({
  selector: 'app-publicidad',
  standalone: true,
  imports: [CommonModule, CdnSrcsetPipe],
  templateUrl: './publicidad.html',
  styleUrl: './publicidad.css'
})
export class Publicidad implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('carousel') carousel!: ElementRef<HTMLDivElement>;

  currentIndex = 0;
  readonly ads = anunciosVigentes(ANUNCIOS, Date.now());
  private intervalId: any;

  // Medición de la vista (ver observarVisibilidad)
  private observador?: IntersectionObserver;
  private temporizadorVista?: ReturnType<typeof setTimeout>;
  private vistaEnviada = false;

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

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.ads.length) return;
    this.observarVisibilidad(this.carousel.nativeElement, () => this.registrarVista());
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
    this.observador?.disconnect();
    clearTimeout(this.temporizadorVista);
  }

  // === MEDICIÓN (GA4 vía GTM) ===

  /**
   * Una vista cuenta como la cuenta la industria publicitaria (IAB): al menos
   * la mitad del anuncio en pantalla durante un segundo seguido. Si sale de
   * pantalla antes, el segundo vuelve a empezar.
   */
  protected observarVisibilidad(el: HTMLElement, alVerse: () => void): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.observador = new IntersectionObserver(([entrada]) => {
      clearTimeout(this.temporizadorVista);
      if (entrada.isIntersecting && entrada.intersectionRatio >= 0.5) {
        this.temporizadorVista = setTimeout(alVerse, 1000);
      }
    }, { threshold: 0.5 });
    this.observador.observe(el);
  }

  /** Una sola vista por visita a la página. */
  private registrarVista(): void {
    if (this.vistaEnviada) return;
    this.vistaEnviada = true;
    this.observador?.disconnect();
    this.enviarEvento('anuncio_vista', this.ads[this.currentIndex]);
  }

  registrarClic(ad: Anuncio): void {
    this.enviarEvento('anuncio_clic', ad);
  }

  /**
   * Deja el evento en el dataLayer. Llega a GA4 solo si GTM tiene un activador
   * para estos eventos: la etiqueta de GA4 del contenedor no reenvía eventos
   * de gtag() ni otros eventos personalizados (comprobado el 16/10/2026).
   */
  protected enviarEvento(evento: EventoAnuncio, ad: Anuncio): void {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: evento,
      anuncio: ad.id,
      formato: window.matchMedia('(max-width: 767px)').matches ? 'celular' : 'escritorio',
    });
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
