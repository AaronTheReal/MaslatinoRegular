import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface PlacePhoto {
  url: string;
  authorName?: string;
  authorUri?: string;
}

export interface Place {
  _id?: string;
  placeId: string;
  name: string;
  formattedAddress: string;
  rating: number;
  priceLevel?: string;
  googleMapsUri?: string;
  photos: PlacePhoto[];
  lastUpdated?: string;
}

export interface FanFestZone {
  name: string;
  address: string;
  dates: string;
}

export interface CityFanzoneResponse {
  city: string;
  lastUpdated: string;
  count: number;
  places: Place[];
  fanFest?: FanFestZone | null;
}

@Injectable({ providedIn: 'root' })
export class FanzoneService {

  private baseUrl = 'https://realnetworkmaslatino-teas.onrender.com/aaron/maslatinoNetwork/fanzone';

  constructor(private http: HttpClient) {}

  /**
   * Obtener los mejores bares deportivos (y, si existe, la zona oficial de FIFA Fan Festival) de una ciudad
   * Ejemplo: getBestFanzone('boston')
   */
  getBestFanzone(city: string): Observable<CityFanzoneResponse> {
    const cityLower = city.toLowerCase().trim();
    return this.http.get<CityFanzoneResponse>(`${this.baseUrl}/${cityLower}`);
  }
}
