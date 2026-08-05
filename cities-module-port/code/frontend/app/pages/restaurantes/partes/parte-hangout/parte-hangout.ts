import { Component, inject, input, signal, effect } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';

import { HangoutService, Place } from '../../../../services/hangout-service';
import { CityInfo } from '../../restaurantes';

const DEFAULT_CITY: CityInfo = { name: 'YOUR CITY', image: '', highlight: 'YOUR CITY' };

@Component({
  selector: 'app-parte-hangout',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './parte-hangout.html',
  styleUrl: './parte-hangout.css',
})
export class ParteHangout {
  private hangoutService = inject(HangoutService);

  // City received from the parent component
  city = input<CityInfo>(DEFAULT_CITY);

  // City slug (e.g. 'kansas-city'), used to query the backend
  citySlug = input<string>('');

  // Signals for the hangout places
  places = signal<Place[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  constructor() {
    // Every time the city changes, we load the hangout places
    effect(() => {
      const slug = this.citySlug();
      if (slug) {
        this.loadPlaces(slug);
      }
    });
  }

  private loadPlaces(citySlug: string) {
    this.loading.set(true);
    this.error.set(null);

    this.hangoutService.getBestHangout(citySlug).subscribe({
      next: (response) => {
        this.places.set(response.places);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('We could not load the hangout spots right now. Please try again later.');
        this.loading.set(false);
      }
    });
  }
}
