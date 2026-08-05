import { Component, inject, input, signal, effect } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';

import { EventosService, Match } from '../../../../services/eventos-service';
import { CityInfo } from '../../restaurantes';

const DEFAULT_CITY: CityInfo = { name: 'YOUR CITY', image: '', highlight: 'YOUR CITY' };

@Component({
  selector: 'app-parte-eventos',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './parte-eventos.html',
  styleUrl: './parte-eventos.css',
})
export class ParteEventos {
  private eventosService = inject(EventosService);

  // City received from the parent component
  city = input<CityInfo>(DEFAULT_CITY);

  // City slug (e.g. 'kansas-city'), used to query the backend
  citySlug = input<string>('');

  // Signals for the World Cup 2026 matches
  matches = signal<Match[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  constructor() {
    // Every time the city changes, we load the matches
    effect(() => {
      const slug = this.citySlug();
      if (slug) {
        this.loadMatches(slug);
      }
    });
  }

  private loadMatches(citySlug: string) {
    this.loading.set(true);
    this.error.set(null);

    this.eventosService.getEventosByCity(citySlug).subscribe({
      next: (response) => {
        this.matches.set(response.matches);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('We could not load the World Cup matches right now. Please try again later.');
        this.loading.set(false);
      }
    });
  }

  formatDate(dateStr: string): string {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
