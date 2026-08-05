import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface MatchTeams {
  home: string;
  away: string;
}

export interface Match {
  id: string;
  citySlug: string;
  stadium: string;
  date: string;
  stage: string;
  teams: MatchTeams;
}

export interface CityMatchesResponse {
  city: string;
  count: number;
  matches: Match[];
}

@Injectable({ providedIn: 'root' })
export class EventosService {

  private baseUrl = 'https://realnetworkmaslatino-teas.onrender.com/aaron/maslatinoNetwork/eventos';

  constructor(private http: HttpClient) {}

  /**
   * Obtener los partidos del Mundial 2026 que se juegan en una ciudad
   * Ejemplo: getEventosByCity('atlanta')
   */
  getEventosByCity(city: string): Observable<CityMatchesResponse> {
    const cityLower = city.toLowerCase().trim();
    return this.http.get<CityMatchesResponse>(`${this.baseUrl}/${cityLower}`);
  }
}
