import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';

import { findSection, Place } from '../../../../../models/cities.model';
import { RestaurantsService } from '../../../../services/restaurants-service';
import { PlaceList } from '../place-list/place-list';

@Component({
  selector: 'app-parte-restaurantes',
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
export class ParteRestaurantes {
  private readonly restaurantsService = inject(RestaurantsService);

  readonly section = findSection('restaurantes');

  /**
   * Slug de la ciudad. En el módulo de origen esta sección —y solo esta— se
   * consultaba con el nombre para mostrar (`KANSAS CITY`), lo que pedía
   * `/restaurants/kansas%20city` mientras el resto pedía `/…/kansas-city`.
   * Eso generó claves duplicadas en Mongo que el frontend nunca volvía a leer.
   */
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

    this.restaurantsService.getBestRestaurants(slug).subscribe({
      next: (response) => {
        this.places.set(response.restaurants ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar los restaurantes. Inténtalo de nuevo más tarde.');
        this.loading.set(false);
      },
    });
  }
}
