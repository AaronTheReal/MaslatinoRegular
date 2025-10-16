
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { Observable, of, tap, map } from 'rxjs';
import { Noticia } from '../../models/noticia.model';
import { isPlatformServer } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class NoticiasService {
  private http = inject(HttpClient);
  private ts = inject(TransferState);
  private platformId = inject(PLATFORM_ID);

  private baseUrl = 'http://localhost:3000/aaron/maslatino';

  createNoticia(data: Noticia): Observable<Noticia> {
    return this.http.post<Noticia>(`${this.baseUrl}/noticiasPost`, data);
  }

  getNoticias(): Observable<Noticia[]> {
    return this.http.get<Noticia[]>(`${this.baseUrl}/getNoticias`);
  }

  getNoticiasRecientes(limit = 200): Observable<Noticia[]> {
    const key = makeStateKey<Noticia[]>('noticias-recientes-' + limit);

    if (this.ts.hasKey(key)) {
      const data = this.ts.get<Noticia[]>(key, []);
      this.ts.remove(key);
      return of(data);
    }

    const observable = this.http.get<Noticia[]>(`${this.baseUrl}/noticias/recientes?limit=${limit}`);

    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }

    return observable;
  }

  getNoticiasRecomendadas(limit = 3): Observable<Noticia[]> {
    const key = makeStateKey<Noticia[]>('noticias-recomendadas-' + limit);

    if (this.ts.hasKey(key)) {
      const data = this.ts.get<Noticia[]>(key, []);
      this.ts.remove(key);
      return of(data);
    }

    const observable = this.http.get<Noticia[]>(`${this.baseUrl}/noticias/recomendadas?limit=${limit}`);

    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }

    return observable;
  }

  getNoticiaById(id: string): Observable<Noticia> {
    console.log('Fetching noticia with id:', id);
    const key = makeStateKey<Noticia>('noticia-' + id);
    if (this.ts.hasKey(key)) {
      console.log('Using TransferState data');
      const data = this.ts.get<Noticia>(key, null as unknown as Noticia);
      this.ts.remove(key);
      return of(data);
    }
    const observable = this.http.get<{ noticia: Noticia }>(`${this.baseUrl}/noticia/${id}`).pipe(
      map(response => response.noticia || null)
    );
    if (isPlatformServer(this.platformId)) {
      console.log('Server-side fetch for id:', id);
      return observable.pipe(
        tap(data => {
          console.log('Server fetched data:', data);
          this.ts.set(key, data);
        })
      );
    }
    console.log('Client-side fetch for id:', id);
    return observable;
  }

  getNoticiaBySlug(slug: string): Observable<Noticia> {
    const key = makeStateKey<Noticia>('noticia-slug-' + slug);
    if (this.ts.hasKey(key)) {
      const data = this.ts.get<Noticia>(key, null as unknown as Noticia);
      this.ts.remove(key);
      return of(data);
    }
    const observable = this.http
      .get<{ noticia: Noticia }>(`${this.baseUrl}/noticia/slug/${encodeURIComponent(slug)}`)
      .pipe(map(r => r.noticia || null));

    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }
    return observable;
  }

  
}