import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CityFanzoneResponse } from '../../models/cities.model';
import { API_BASE_URL } from './api-base-url';

@Injectable({ providedIn: 'root' })
export class FanzoneService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL).replace(/\/+$/, '')}/fanzone`;

  /**
   * Bares deportivos de una ciudad y, si está confirmada, la sede oficial del
   * FIFA Fan Festival (`fanFest`, `null` en las ciudades sin sede).
   */
  getBestFanzone(citySlug: string): Observable<CityFanzoneResponse> {
    return this.http.get<CityFanzoneResponse>(
      `${this.baseUrl}/${encodeURIComponent(citySlug.toLowerCase().trim())}`,
    );
  }
}
