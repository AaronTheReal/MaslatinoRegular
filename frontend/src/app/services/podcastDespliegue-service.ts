// src/app/services/podcastDespliegue-service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Episode {
  _id: string;
  title: string;
  description?: string;
  image?: string;
  kind: 'video' | 'audio';
  duration?: number;
  mux?: {
    assetId?: string;
    playbackIds?: Array<{ id: string; policy: 'public' | 'signed' }>;
    status?: string;
  };
  releaseDate?: Date | string;
  createdAt?: Date | string;
  progress?: number;    
  publishedAt?: string | Date; // ← Agrega esto (fecha de publicación)
  thumbnail?: string;          // ← Agrega esto (URL de miniatura)      
}

export interface Podcast {
  _id: string;
  title: string;
  description?: string;
  coverImage?: string;
  episodes: Episode[];
  authorName?: string;
  categories?: string[];
  language?: string;
  tags?: string[];
  meta?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

@Injectable({ providedIn: 'root' })
export class PodcastService {
  private baseUrl = 'https://maslatinoregular.onrender.com/aaron/maslatino'; // Ajusta según tu backend
  //private baseUrl = 'http://localhost:3000/aaron/maslatino';

  constructor(private http: HttpClient) {}

  // Obtener todos los shows (adaptado de getShows)
  getShows(): Observable<Podcast[]> {
    return this.http.get<unknown>(`${this.baseUrl}/shows`).pipe(
      map((data: unknown) => {
        if (Array.isArray(data)) {
          return data as Podcast[];
        } else if (data && typeof data === 'object' && 'shows' in data && Array.isArray((data as { shows: unknown[] }).shows)) {
          return (data as { shows: Podcast[] }).shows;
        } else {
          return [];
        }
      }),
      catchError(() => of([]))
    );
  }

  // Obtener un show específico por ID (incluyendo episodios)
  getShowById(id: string): Observable<Podcast> {
    return this.http.post<unknown>(`${this.baseUrl}/showIndividual`, { id }).pipe(
      map((data: unknown) => data as Podcast),
      catchError(() => of({ _id: '', title: '', episodes: [] } as Podcast))
    );
  }
  getSignedToken(playbackId: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.baseUrl}/mux/playback/:playbackId/token'`, { playbackId });
  }
  // Obtener todos los podcasts
  getPodcasts(): Observable<Podcast[]> {
      return this.http.get<unknown>(`${this.baseUrl}/podcasts`).pipe(
        map((data: unknown) => {
          if (Array.isArray(data)) return data as Podcast[];
          if (data && typeof data === 'object' && 'podcasts' in data) {
            return (data as { podcasts: Podcast[] }).podcasts || [];
          }
          return [];
        }),
        catchError(() => of([]))
      );
    }
  // Obtener un podcast específico por ID
  getPodcastById(id: string): Observable<Podcast> {
    return this.http.post<unknown>(`${this.baseUrl}/podcastIndividual`, { id }).pipe(
      map((data: unknown) => data as Podcast),
      catchError(() => of({ _id: '', title: '', episodes: [] } as Podcast))
    );
  }

  // Obtener podcasts por nombre de categoría
  getPodcastCategoria(nombreCategoria: string): Observable<{ results: Podcast[] }> {
    const nombre = encodeURIComponent(nombreCategoria.trim());
    return this.http.get<unknown>(`${this.baseUrl}/podcasts/by-category-name/${nombre}`).pipe(
      map((data: unknown) => {
        if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown[] }).results)) {
          return data as { results: Podcast[] };
        } else {
          return { results: [] };
        }
      }),
      catchError(() => of({ results: [] }))
    );
  }

  // Obtener podcasts por ID de categoría
  getPodcastCategoriaPorId(id: string): Observable<{ results: Podcast[] } | Podcast[]> {
    return this.http.get<unknown>(`${this.baseUrl}/podcasts/categoria-id/${id}`).pipe(
      map((data: unknown) => {
        if (Array.isArray(data)) {
          return data as Podcast[];
        } else if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown[] }).results)) {
          return data as { results: Podcast[] };
        } else {
          return { results: [] };
        }
      }),
      catchError(() => of({ results: [] }))
    );
  }

  // Obtener podcast por ID de episodio (devuelve el podcast completo para filtrar el episodio en frontend)
  getPodcastByEpisodeId(id: string): Observable<Podcast> {
    return this.http.get<unknown>(`${this.baseUrl}/podcasts/episode/${id}`).pipe(
      map((data: unknown) => {
        if (data && typeof data === 'object' && 'episodes' in data && Array.isArray((data as { episodes: unknown[] }).episodes)) {
          return data as Podcast;
        } else {
          // Fallback con propiedades mínimas requeridas
          return {
            _id: '',
            title: '',
            description: '',
            coverImage: '',
            episodes: [],
            authorName: '',
            categories: []
          } as Podcast;
        }
      }),
      catchError(() => of({
        _id: '',
        title: '',
        description: '',
        coverImage: '',
        episodes: [],
        authorName: '',
        categories: []
      } as Podcast))
    );
  }
}