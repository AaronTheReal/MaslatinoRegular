import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type WeatherCondition =
  | 'soleado'
  | 'parcialmente-nublado'
  | 'nublado'
  | 'lluvia'
  | 'tormenta'
  | 'nieve';

export interface WeatherData {
  city: string;
  coordinates: { lat: number; lon: number };
  temperature: number;
  feelsLike: number;
  weatherCode: number;
  condition: WeatherCondition;
  description: string;
  precipitationProbability: number;
  lastUpdated: string;
}

// Icono según la condición climática normalizada por el backend
export const WEATHER_ICONS: Record<WeatherCondition, string> = {
  soleado: 'assets/iconospartes/sol.svg',
  'parcialmente-nublado': 'assets/iconospartes/nube-sol.svg',
  nublado: 'assets/iconospartes/nube.svg',
  lluvia: 'assets/iconospartes/lluvia.svg',
  tormenta: 'assets/iconospartes/tormenta.svg',
  nieve: 'assets/iconospartes/nieve.svg',
};

// Icono fijo para la sensación térmica
export const WEATHER_FEELS_LIKE_ICON = 'assets/iconospartes/termometro.svg';

// Icono fijo para la probabilidad de lluvia
export const WEATHER_PRECIPITATION_ICON = 'assets/iconospartes/gota.svg';

@Injectable({ providedIn: 'root' })
export class WeatherService {

  // Cambia esta URL según tu entorno
  //private baseUrl = 'http://localhost:3000/aaron/maslatinoNetwork/weather';
  private baseUrl = 'https://realnetworkmaslatino-teas.onrender.com/aaron/maslatinoNetwork/weather';

  constructor(private http: HttpClient) {}

  /**
   * Obtener el clima actual de una ciudad
   * Ejemplo: getWeather('boston')
   */
  getWeather(city: string): Observable<WeatherData> {
    const cityLower = city.toLowerCase().trim();
    return this.http.get<WeatherData>(`${this.baseUrl}/${cityLower}`);
  }
}
