// services/mux-service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateUploadBody {
  podcastId: string;
  episodeId: string;
  kind: 'video' | 'audio';
  playbackPolicy: 'public' | 'signed';
  staticRenditions?: Array<{ resolution: 'highest' | 'audio-only' }>; // opcional
}

export interface CreateUploadResponse {
  uploadId: string;
  url: string; // Direct Upload URL (PUT / reanudable)
}

@Injectable({ providedIn: 'root' })
export class MuxService {
  private API_URL = 'http://localhost:3000/maslatino/mux'; // ajusta a tu backend
  constructor(private http: HttpClient) {}

  createDirectUpload(body: CreateUploadBody): Observable<CreateUploadResponse> {
    return this.http.post<CreateUploadResponse>(`${this.API_URL}/uploads`, body);
  }

  // (Opcional) consultar estado mux del episodio
  getEpisodeMuxStatus(podcastId: string, episodeId: string) {
    return this.http.get<{ mux: any }>(`${this.API_URL}/episodes/${podcastId}/${episodeId}/mux`);
  }

  // (Opcional) añadir subtítulos (tu backend sube el .vtt a storage y llama a Mux Tracks API)
  addTextTrack(assetId: string, formData: FormData) {
    return this.http.post(`${this.API_URL}/assets/${assetId}/tracks`, formData);
  }

  // (Opcional) pedir URL firmada si usas playback "signed"
  getSignedPlaybackToken(playbackId: string) {
    return this.http.get<{ token: string }>(`${this.API_URL}/playback/${playbackId}/token`);
  }
}
