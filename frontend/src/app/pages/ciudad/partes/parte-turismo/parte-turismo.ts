import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';

import { findSection, Place } from '../../../../../models/cities.model';
import { TurismoService } from '../../../../services/turismo-service';
import { PlaceList } from '../place-list/place-list';

@Component({
  selector: 'app-parte-turismo',
  standalone: true,
  imports: [PlaceList],
  template: `
    <app-place-list
      [section]="section"
      [cityName]="cityName()"
      [places]="places()"
      [loading]="loading()"
      [error]="error()"
    ></app-place-list>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParteTurismo {
  private readonly turismoService = inject(TurismoService);

  readonly section = findSection('turismo');

  /** Slug de la ciudad: es la clave con la que se consulta la API. */
  readonly citySlug = input<string>('');
  readonly cityName = input<string>('');

  readonly places = signal<Place[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const slug = this.citySlug();
      if (slug) this.load(slug);
    });
  }

  private load(slug: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.turismoService.getBestTurismo(slug).subscribe({
      next: (response) => {
        this.places.set(response.places ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar las atracciones turísticas. Inténtalo de nuevo más tarde.');
        this.loading.set(false);
      },
    });
  }
}
