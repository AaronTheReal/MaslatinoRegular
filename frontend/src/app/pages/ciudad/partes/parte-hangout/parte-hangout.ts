import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';

import { findSection, Place } from '../../../../../models/cities.model';
import { HangoutService } from '../../../../services/hangout-service';
import { PlaceList } from '../place-list/place-list';

@Component({
  selector: 'app-parte-hangout',
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
export class ParteHangout {
  private readonly hangoutService = inject(HangoutService);

  readonly section = findSection('hangout');

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

    this.hangoutService.getBestHangout(slug).subscribe({
      next: (response) => {
        this.places.set(response.places ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar los lugares para salir. Inténtalo de nuevo más tarde.');
        this.loading.set(false);
      },
    });
  }
}
