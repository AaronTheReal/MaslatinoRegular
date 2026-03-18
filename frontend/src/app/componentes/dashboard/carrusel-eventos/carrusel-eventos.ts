import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  AfterViewInit,
  Inject,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  CalendarioService,
  CalendarItem,
} from '../../../services/calendario-service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-carrusel-eventos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './carrusel-eventos.html',
  styleUrls: ['./carrusel-eventos.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CarruselEventos implements OnInit, AfterViewInit {
  items: CalendarItem[] = [];
  displayItems: CalendarItem[] = [];
  loadingList = false;

  @ViewChild('swiperEl') swiperEl!: ElementRef<HTMLElement & { swiper?: any; initialize?: () => void }>;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private calendarioService: CalendarioService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      await import('swiper/element/bundle');
    }
    this.loadItems();
  }

  ngAfterViewInit(): void {
    // Si los datos ya están listos, esto termina de asegurar el layout correcto.
    setTimeout(() => this.updateSwiper(), 0);
  }

  private updateSwiper(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = this.swiperEl?.nativeElement;
        if (!container) return;

        // Inicializa Swiper solo cuando Angular ya pintó los slides.
        if (!container.swiper && typeof container.initialize === 'function') {
          container.initialize();
        }

        const swiper = container.swiper;
        if (!swiper) return;

        // Con displayItems duplicado, usamos slideTo() y no slideToLoop().
        // Esto fija el carrusel exactamente en el bloque central, donde el peek izquierdo ya existe.
        const startIndex = this.items.length * 2;

        swiper.updateSize();
        swiper.updateSlides();
        swiper.update();
        swiper.loopFix?.();

        swiper.slideTo(startIndex, 0, false);
        swiper.update();
        swiper.loopFix?.();

        // Segundo pase corto para cerrar el cálculo visual en el primer render.
        requestAnimationFrame(() => {
          swiper.slideTo(startIndex, 0, false);
          swiper.update();
          swiper.loopFix?.();
        });
      });
    });
  }

  private loadItems(): void {
    this.loadingList = true;
    this.calendarioService
      .listUpcoming({
        kind: 'evento',
        limit: 12,
        sort: 'startAt:asc',
      })
      .subscribe({
        next: (res) => {
          this.items = res.data || [];

          // 4 duplicados = suficiente para tener contenido real a ambos lados.
          this.displayItems = [
            ...this.items,
            ...this.items,
            ...this.items,
            ...this.items,
          ];

          this.loadingList = false;

          this.cdr.detectChanges();
          setTimeout(() => this.updateSwiper(), 0);

          console.log('✅ Primer evento:', this.items[0]?.title);
        },
        error: () => {
          this.loadingList = false;
          console.error('Error al cargar eventos');
        },
      });
  }
}