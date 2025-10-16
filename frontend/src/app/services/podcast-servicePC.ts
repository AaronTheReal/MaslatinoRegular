import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MetaData {
  description?: string;
  image?: string;
  keywords?: string[];
}

export interface EpisodePayload {
  _id?: string;
  title: string;
  description?: string;
  audioUrl: string;
  image?: string;
  duration?: number;
  releaseDate?: string;
}

export interface PodcastDesktopPayload {
  _id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  authorName?: string;
  coverImage?: string;
  bannerImage?: string;
  language: string;
  order?: number;
  featured?: boolean;
  categories: string[];
  tags?: string[];
  relatedLinks?: string[];
  episodes?: EpisodePayload[];
  layout?: 'classic' | 'grid' | 'carousel';
  meta?: MetaData;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class PodcastPCService {
  private API_URL = 'http://localhost:3000/aaron/maslatino/podcasts-pc'; // ajusta según entorno

  constructor(private http: HttpClient) {}

  crearPodcast(payload: PodcastDesktopPayload): Observable<PodcastDesktopPayload> {
    return this.http.post<PodcastDesktopPayload>(this.API_URL, payload);
  }

  obtenerPodcasts(): Observable<PodcastDesktopPayload[]> {
    return this.http.get<PodcastDesktopPayload[]>(this.API_URL);
  }

  obtenerPodcastsHome(): Observable<PodcastDesktopPayload[]> {
    return this.http.get<PodcastDesktopPayload[]>(`${this.API_URL}/home`);
  }

  obtenerPodcastPorId(id: string): Observable<PodcastDesktopPayload> {
    return this.http.get<PodcastDesktopPayload>(`${this.API_URL}/${id}`);
  }

  actualizarPodcast(id: string, payload: PodcastDesktopPayload): Observable<PodcastDesktopPayload> {
    return this.http.put<PodcastDesktopPayload>(`${this.API_URL}/${id}`, payload);
  }

  eliminarPodcast(id: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.API_URL}/${id}`);
  }

  obtenerPorNombreCategoria(nombre: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/by-category-name/${nombre}`);
  }

  agregarEpisodio(podcastId: string, episode: EpisodePayload): Observable<EpisodePayload> {
    return this.http.post<EpisodePayload>(`${this.API_URL}/${podcastId}/episodios`, episode);
  }

  editarEpisodio(podcastId: string, episodioId: string, episode: EpisodePayload): Observable<EpisodePayload> {
    return this.http.put<EpisodePayload>(`${this.API_URL}/${podcastId}/episodios/${episodioId}`, episode);
  }

  eliminarEpisodio(podcastId: string, episodioId: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.API_URL}/${podcastId}/episodios/${episodioId}`);
  }
}
