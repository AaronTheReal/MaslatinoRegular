import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface RestaurantPhoto {
  url: string;
  authorName?: string;
  authorUri?: string;
}

export interface Restaurant {
  _id?: string;
  placeId: string;
  name: string;
  formattedAddress: string;
  rating: number;
  priceLevel?: string;
  googleMapsUri?: string;
  photos: RestaurantPhoto[];
  lastUpdated?: string;
}

export interface CityRestaurantsResponse {
  city: string;
  lastUpdated: string;
  count: number;
  restaurants: Restaurant[];
}

@Injectable({ providedIn: 'root' })
export class RestaurantsService {

  // Cambia esta URL según tu entorno
   //private baseUrl = 'http://localhost:3000/aaron/maslatinoNetwork/restaurants';
  private baseUrl = 'https://realnetworkmaslatino-teas.onrender.com/aaron/maslatinoNetwork/restaurants';

  constructor(private http: HttpClient) {}

  /**
   * Obtener los mejores restaurantes de una ciudad
   * Ejemplo: getBestRestaurants('boston')
   */
  getBestRestaurants(city: string): Observable<CityRestaurantsResponse> {
    const cityLower = city.toLowerCase().trim();
    return this.http.get<CityRestaurantsResponse>(`${this.baseUrl}/${cityLower}`);
  }

  /**
   * Obtener lista de ciudades disponibles
   */
  getAvailableCities(): Observable<{ count: number; cities: any[] }> {
    return this.http.get<{ count: number; cities: any[] }>(`${this.baseUrl}/cities`);
  }

  /**
   * Forzar actualización de una ciudad (útil para admin o pruebas)
   */
  refreshRestaurants(city: string): Observable<any> {
    const cityLower = city.toLowerCase().trim();
    return this.http.post(`${this.baseUrl}/refresh/${cityLower}`, {});
  }

  /**
   * Forzar actualización de todas las ciudades
   */
  refreshAllCities(): Observable<any> {
    return this.http.post(`${this.baseUrl}/refresh-all`, {});
  }
}