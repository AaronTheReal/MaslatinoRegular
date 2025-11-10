import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import {
  CalendarioService,
  CalendarItem,
} from '../../../services/calendario-service';

@Component({
  selector: 'app-carrusel-eventos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carrusel-eventos.html',
  styleUrls: ['./carrusel-eventos.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CarruselEventos implements OnInit {
  items: CalendarItem[] = [];
  loadingList = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private calendarioService: CalendarioService
  ) {}

  async ngOnInit(): Promise<void> {
    // Registrar <swiper-container> solo en navegador (evita SSR issues)
    if (isPlatformBrowser(this.platformId)) {
      await import('swiper/element/bundle');
    }
    this.loadItems();
  }

  private loadItems(): void {
    this.loadingList = true;

    // Sin tocar el service: usamos listUpcoming con filtros válidos
    this.calendarioService
      .listUpcoming({
        kind: 'evento',
        limit: 12,
        sort: 'startAt:asc',
      })
      .subscribe({
        next: (res) => {
          this.items = res.data || [];
          this.loadingList = false;
          console.log("items",this.items);
        },
        error: () => {
          this.loadingList = false;
          console.error('Error al cargar eventos');
        },
      });

    // Alternativa si quieres controlar estado en request:
    // this.calendarioService.list({
    //   kind: 'evento',
    //   status: 'published',
    //   sort: 'startAt:asc',
    //   limit: 12,
    //   from: new Date().toISOString(),
    // }).subscribe(...)
  }
}
