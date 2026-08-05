import { Component, inject, input, signal, effect } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';

import { FanzoneService, Place, FanFestZone } from '../../../../services/fanzone-service';
import { CityInfo } from '../../restaurantes';

const DEFAULT_CITY: CityInfo = { name: 'YOUR CITY', image: '', highlight: 'YOUR CITY' };

@Component({
  selector: 'app-parte-fanzone',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './parte-fanzone.html',
  styleUrl: './parte-fanzone.css',
})
export class ParteFanzone {
  private fanzoneService = inject(FanzoneService);

  // City received from the parent component
  city = input<CityInfo>(DEFAULT_CITY);

  // City slug (e.g. 'kansas-city'), used to query the backend
  citySlug = input<string>('');

  // Signals for the sports bars and the official Fan Fest zone
  places = signal<Place[]>([]);
  fanFest = signal<FanFestZone | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  constructor() {
    // Every time the city changes, we load the sports bars
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

    this.fanzoneService.getBestFanzone(citySlug).subscribe({
      next: (response) => {
        this.places.set(response.places);
        this.fanFest.set(response.fanFest ?? null);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('We could not load the sports bars right now. Please try again later.');
        this.loading.set(false);
      }
    });
  }
}
