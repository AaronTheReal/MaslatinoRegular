import { Component, inject, input, signal, effect } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';

import { RestaurantsService, Restaurant } from '../../../../services/places-service';
import { CityInfo } from '../../restaurantes';

const DEFAULT_CITY: CityInfo = { name: 'YOUR CITY', image: '', highlight: 'YOUR CITY' };

@Component({
  selector: 'app-restaurantes-parte',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './restaurantes-parte.html',
  styleUrl: './restaurantes-parte.css',
})
export class RestaurantesParte {
  private restaurantsService = inject(RestaurantsService);

  // City received from the parent component
  city = input<CityInfo>(DEFAULT_CITY);

  // Signals for the restaurants
  restaurants = signal<Restaurant[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  constructor() {
    // Every time the city changes, we load the restaurants
    effect(() => {
      const currentCity = this.city();
      if (currentCity.highlight !== 'YOUR CITY') {
        this.loadRestaurants(currentCity.highlight);
      }
    });
  }

  private loadRestaurants(cityName: string) {
    this.loading.set(true);
    this.error.set(null);

    this.restaurantsService.getBestRestaurants(cityName).subscribe({
      next: (response) => {
        this.restaurants.set(response.restaurants);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('We could not load the restaurants right now. Please try again later.');
        this.loading.set(false);
      }
    });
  }
}
