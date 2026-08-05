import { Component, inject, input, signal, effect } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';

import { TurismoService, Place } from '../../../../services/turismo-service';
import { CityInfo } from '../../restaurantes';

const DEFAULT_CITY: CityInfo = { name: 'YOUR CITY', image: '', highlight: 'YOUR CITY' };

@Component({
  selector: 'app-parte-turismo',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './parte-turismo.html',
  styleUrl: './parte-turismo.css',
})
export class ParteTurismo {
  private turismoService = inject(TurismoService);

  // City received from the parent component
  city = input<CityInfo>(DEFAULT_CITY);

  // City slug (e.g. 'kansas-city'), used to query the backend
  citySlug = input<string>('');

  // Signals for the tourist attractions
  places = signal<Place[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  constructor() {
    // Every time the city changes, we load the tourist attractions
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

    this.turismoService.getBestTurismo(citySlug).subscribe({
      next: (response) => {
        this.places.set(response.places);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('We could not load the tourist attractions right now. Please try again later.');
        this.loading.set(false);
      }
    });
  }
}
