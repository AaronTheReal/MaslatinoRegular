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

export interface CityPlacesResponse {
  city: string;
  lastUpdated: string;
  count: number;
  places: Place[];
}

@Injectable({ providedIn: 'root' })
export class HangoutService {

  private baseUrl = 'https://realnetworkmaslatino-teas.onrender.com/aaron/maslatinoNetwork/hangout';

  constructor(private http: HttpClient) {}

  /**
   * Obtener los mejores lugares para pasar el tiempo (bares, cafés, parques) de una ciudad
   * Ejemplo: getBestHangout('boston')
   */
  getBestHangout(city: string): Observable<CityPlacesResponse> {
    const cityLower = city.toLowerCase().trim();
    return this.http.get<CityPlacesResponse>(`${this.baseUrl}/${cityLower}`);
  }
}
