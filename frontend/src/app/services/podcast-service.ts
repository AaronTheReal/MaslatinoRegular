import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
export interface MetaData {
  description?: string;
  image?: string;
}
export interface MuxPlaybackId { id: string; policy: 'public' | 'signed'; }

export interface EpisodeMux {
  uploadId?: string;
  assetId?: string;
  playbackIds?: MuxPlaybackId[];
  status?: 'waiting_for_upload' | 'preparing' | 'ready' | 'errored' | 'cancelled_upload';
  duration?: number;
  aspect_ratio?: string;
  error?: any;
  // (Opcional) estado de static renditions
  static_renditions?: Array<{ resolution: 'highest' | 'audio-only' | '270p' | '360p' | '480p' | '540p' | '720p' | '1080p' | '1440p' | '2160p'; status: 'preparing'|'ready'|'errored'|'skipped'; name: string; }>;
}

export interface AdsConfig {
  enabled: boolean;
  adTagUrl?: string;       // VAST/IMA tag
  midrollTimes?: number[]; // segundos
}

export interface EpisodePayload {
  _id?: string;
  title: string;
  description?: string;
  image?: string;
  kind: 'video' | 'audio';
  defaultPlaybackPolicy: 'public' | 'signed';
  ads?: AdsConfig;
  mux?: EpisodeMux;
  duration?: number;
  releaseDate?: string;

  // Legacy (para mantener compatibilidad si hace falta)
  audioUrl?: string;
  videoUrl?: string;
}

export interface PodcastPayload {
  _id?: string;
  title: string;
  description?: string;
  authorName?: string;
  coverImage?: string;
  coverImage2?: string;
  language: string;
  categories: string[];
  tags?: string[];
  episodes?: EpisodePayload[];
  meta?: MetaData; // 👈 Agrega esta línea
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class PodcastService {
  //private API_URL = 'http://localhost:3000/aaron/maslatino/podcasts'; // cámbialo según tu backend
   //private API_URL = 'https://maslatino.onrender.com/aaron/maslatino/podcasts'; // Ajusta si tu backend cambia
  private API_URL = 'https://maslatinoregular.onrender.com/aaron/maslatino/podcasts';

  constructor(private http: HttpClient) {}

  crearPodcast(payload: PodcastPayload): Observable<PodcastPayload> {
    return this.http.post<PodcastPayload>(this.API_URL, payload);
  }

  obtenerPodcasts(): Observable<PodcastPayload[]> {
    return this.http.get<PodcastPayload[]>(this.API_URL);
  }

  actualizarPodcast(id: string, payload: PodcastPayload): Observable<PodcastPayload> {
    return this.http.put<PodcastPayload>(`${this.API_URL}/${id}`, payload);
  }

  eliminarPodcast(id: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.API_URL}/${id}`);
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
    obtenerPodcastsHome(): Observable<PodcastPayload[]> {
      return this.http.get<PodcastPayload[]>(`${this.API_URL}/home`);
    }
  
}