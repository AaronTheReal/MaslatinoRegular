import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CityRestaurantsResponse } from '../../models/cities.model';
import { API_BASE_URL } from './api-base-url';

@Injectable({ providedIn: 'root' })
export class RestaurantsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL).replace(/\/+$/, '')}/restaurants`;

  /**
   * Mejores restaurantes de una ciudad, buscados por SLUG.
   *
   * Se consulta siempre con el slug (`kansas-city`), nunca con el nombre para
   * mostrar. En el módulo de origen esta sección era la única que usaba el
   * nombre, y eso generaba claves incoherentes en Mongo (`kansas city` frente a
   * `kansas-city`) que el frontend nunca volvía a leer.
   */
  getBestRestaurants(citySlug: string): Observable<CityRestaurantsResponse> {
    return this.http.get<CityRestaurantsResponse>(
      `${this.baseUrl}/${encodeURIComponent(citySlug.toLowerCase().trim())}`,
    );
  }

  /** Ciudades con datos cacheados. Endpoint público de diagnóstico. */
  getAvailableCities(): Observable<{ count: number; cities: unknown[] }> {
    return this.http.get<{ count: number; cities: unknown[] }>(`${this.baseUrl}/cities`);
  }
}
