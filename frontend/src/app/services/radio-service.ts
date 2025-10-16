// radio.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface RadioData {
  title: string;
  description?: string;
  image?: string;
  scriptEmbed: string;
  streamUrl?: string;
  categories: string[];
  tags?: string[];
  language?: string;
  author?: string;
  authorName?: string;
  meta?: {
    description?: string;
    image?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class RadioService {
   private baseUrl = 'http://localhost:3000/aaron/maslatino'; // mismo estilo que el tuyo
   //private baseUrl = 'https://maslatino.onrender.com/aaron/maslatino'; // Ajusta si tu backend cambia

  constructor(private http: HttpClient) {}

  guardarRadio(data: RadioData) {
    return this.http.post(`${this.baseUrl}/radioPost`, data);
  }

  obtenerRadios() {
    return this.http.get<RadioData[]>(`${this.baseUrl}/radios`);
  }

  obtenerRadioPorId(id: string) {
    return this.http.get<RadioData>(`${this.baseUrl}/radios/${id}`);
  }
}
