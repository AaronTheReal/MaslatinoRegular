// src/app/services/calendar-pc.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Location {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  mapEmbedUrl?: string;
}

export interface Link {
  label?: string;
  url?: string;
  external?: boolean;
}

export interface MetaData {
  title?: string;
  description?: string;
  image?: string;
}

export interface CalendarItemPC {
  _id?: string;
  kind: 'anuncio' | 'evento';
  title: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  image?: string;
  gallery?: string[];

  startAt: string;
  endAt?: string;
  allDay?: boolean;
  timezone?: string;

  location?: Location;
  links?: Link[];

  categories: string[];
  tags?: string[];

  status?: 'draft' | 'published' | 'archived';
  featured?: boolean;
  highlightColor?: string;

  meta?: MetaData;

  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class CalendarPCService {
  private API_URL = 'http://localhost:3000/aaron/maslatino/calendar-pc';
  // private API_URL = 'https://maslatino.onrender.com/aaron/maslatino/calendar-pc'; // producción

  constructor(private http: HttpClient) {}

  crearItem(data: CalendarItemPC): Observable<CalendarItemPC> {
    return this.http.post<CalendarItemPC>(this.API_URL, data);
  }

  obtenerItems(): Observable<CalendarItemPC[]> {
    return this.http.get<CalendarItemPC[]>(this.API_URL);
  }

  obtenerItemPorId(id: string): Observable<CalendarItemPC> {
    return this.http.get<CalendarItemPC>(`${this.API_URL}/${id}`);
  }

  obtenerDestacadosHome(): Observable<CalendarItemPC[]> {
    return this.http.get<CalendarItemPC[]>(`${this.API_URL}/home`);
  }

  obtenerPorCategoria(name: string): Observable<{ categoria: any; resultados: CalendarItemPC[] }> {
    return this.http.get<{ categoria: any; resultados: CalendarItemPC[] }>(
      `${this.API_URL}/by-category-name/${name}`
    );
  }

    actualizarItem(id: string, data: Partial<CalendarItemPC>): Observable<any> {
      return this.http.put(`${this.API_URL}/${id}`, data);
    }
  eliminarItem(id: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.API_URL}/${id}`);
  }
}
