import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';

import { findSection, Match } from '../../../../../models/cities.model';
import { EventosService } from '../../../../services/eventos-service';
import { CdnImagePipe } from '../../../../pipes/cdn-image.pipe';

@Component({
  selector: 'app-parte-eventos',
  standalone: true,
  imports: [CdnImagePipe],
  templateUrl: './parte-eventos.html',
  styleUrl: './parte-eventos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParteEventos {
  private readonly eventosService = inject(EventosService);

  readonly section = findSection('eventos');

  readonly citySlug = input<string>('');
  readonly cityName = input<string>('');

  readonly matches = signal<Match[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const slug = this.citySlug();
      if (slug) this.load(slug);
    });
  }

  /** El backend entrega la fecha como `YYYY-MM-DD`, sin hora ni zona. */
  formatDate(dateStr: string): string {
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private load(slug: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.eventosService.getEventosByCity(slug).subscribe({
      next: (response) => {
        this.matches.set(response.matches ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar los partidos del Mundial. Inténtalo de nuevo más tarde.');
        this.loading.set(false);
      },
    });
  }
}
