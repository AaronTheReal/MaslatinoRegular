import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';

import { FanFestZone, findSection, Place } from '../../../../../models/cities.model';
import { FanzoneService } from '../../../../services/fanzone-service';
import { PlaceList } from '../place-list/place-list';

@Component({
  selector: 'app-parte-fanzone',
  standalone: true,
  imports: [PlaceList],
  templateUrl: './parte-fanzone.html',
  styleUrl: './parte-fanzone.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParteFanzone {
  private readonly fanzoneService = inject(FanzoneService);

  readonly section = findSection('fanzone');

  readonly citySlug = input<string>('');
  readonly cityName = input<string>('');

  readonly places = signal<Place[]>([]);
  /** Sede oficial del FIFA Fan Festival; solo 4 de las 11 ciudades la tienen. */
  readonly fanFest = signal<FanFestZone | null>(null);
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

    this.fanzoneService.getBestFanzone(slug).subscribe({
      next: (response) => {
        this.places.set(response.places ?? []);
        this.fanFest.set(response.fanFest ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar los bares deportivos. Inténtalo de nuevo más tarde.');
        this.loading.set(false);
      },
    });
  }
}
