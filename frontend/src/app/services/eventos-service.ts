import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CityMatchesResponse } from '../../models/cities.model';
import { API_BASE_URL } from './api-base-url';

@Injectable({ providedIn: 'root' })
export class EventosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL).replace(/\/+$/, '')}/eventos`;

  /** Partidos del Mundial 2026 que se juegan en una ciudad. */
  getEventosByCity(citySlug: string): Observable<CityMatchesResponse> {
    return this.http.get<CityMatchesResponse>(
      `${this.baseUrl}/${encodeURIComponent(citySlug.toLowerCase().trim())}`,
    );
  }
}
