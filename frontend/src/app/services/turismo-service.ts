import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CityPlacesResponse } from '../../models/cities.model';
import { API_BASE_URL } from './api-base-url';

@Injectable({ providedIn: 'root' })
export class TurismoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL).replace(/\/+$/, '')}/turismo`;

  /** Atracciones turísticas de una ciudad, buscadas por slug. */
  getBestTurismo(citySlug: string): Observable<CityPlacesResponse> {
    return this.http.get<CityPlacesResponse>(
      `${this.baseUrl}/${encodeURIComponent(citySlug.toLowerCase().trim())}`,
    );
  }
}
