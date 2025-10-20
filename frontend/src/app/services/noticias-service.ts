
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { Observable, of, tap, map, catchError } from 'rxjs';
import { Noticia } from '../../models/noticia.model';
import { isPlatformServer } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class NoticiasService {
  private http = inject(HttpClient);
  private ts = inject(TransferState);
  private platformId = inject(PLATFORM_ID);

  private baseUrl = 'http://localhost:3000/aaron/maslatino';

  createNoticia(data: Noticia): Observable<Noticia> {
    console.log('Sending to backend:', data);
    return this.http.post<Noticia>(`${this.baseUrl}/noticiasPost`, data).pipe(
      catchError(error => {
        console.error('Create Noticia Error:', error);
        throw error;
      })
    );
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

  updateNoticia(id: string, data: Noticia): Observable<Noticia> {
    console.log('Updating noticia with id:', id, 'Data:', data);
    const key = makeStateKey<Noticia>('noticia-' + id);
    const observable = this.http.put<Noticia>(`${this.baseUrl}/noticia/${id}`, data).pipe(
      catchError(error => {
        console.error('Update Noticia Error:', error);
        throw error;
      })
    );

    if (isPlatformServer(this.platformId)) {
      console.log('Server-side update for id:', id);
      return observable.pipe(
        tap(updatedData => {
          console.log('Server updated data:', updatedData);
          this.ts.set(key, updatedData);
        })
      );
    }

    console.log('Client-side update for id:', id);
    return observable;
  }
  deleteNoticia(id: string): Observable<void> {
    console.log('Deleting noticia with id:', id);
    const key = makeStateKey<Noticia>('noticia-' + id);
    const observable = this.http.delete<void>(`${this.baseUrl}/noticia/${id}`).pipe(
      catchError(error => {
        console.error('Delete Noticia Error:', error);
        throw error;
      })
    );

    if (isPlatformServer(this.platformId)) {
      console.log('Server-side delete for id:', id);
      return observable.pipe(
        tap(() => {
          console.log('Server deleted noticia:', id);
          this.ts.remove(key); // Remove from TransferState on deletion
        })
      );
    }

    console.log('Client-side delete for id:', id);
    return observable;
  }

  toggleAutorizarNoticia(id: string, autorizada: boolean): Observable<Noticia> {
  console.log(`Toggling autorización for noticia with id: ${id}, autorizada: ${autorizada}`);
  return this.http.patch<Noticia>(`${this.baseUrl}/noticia/${id}/autorizar`, { autorizada }).pipe(
    catchError(error => {
      console.error('Toggle Autorizar Noticia Error:', error);
      throw error;
    })
  );
}
}
