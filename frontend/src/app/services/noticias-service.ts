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
      console.log('getNoticiasRecientes from TransferState:', data);
      this.ts.remove(key);
      return of(data);
    }
    const observable = this.http.get<Noticia[]>(`${this.baseUrl}/noticias/recientes?limit=${limit}`).pipe(
      tap(data => console.log('getNoticiasRecientes from HTTP:', data))
    );
    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }
    return observable;
  }

  getNoticiasRecomendadas(limit = 3): Observable<Noticia[]> {
    const key = makeStateKey<Noticia[]>('noticias-recomendadas-' + limit);
    if (this.ts.hasKey(key)) {
      const data = this.ts.get<Noticia[]>(key, []);
      console.log('getNoticiasRecomendadas from TransferState:', data);
      this.ts.remove(key);
      return of(data);
    }
    const observable = this.http.get<Noticia[]>(`${this.baseUrl}/noticias/recomendadas?limit=${limit}`).pipe(
      tap(data => console.log('getNoticiasRecomendadas from HTTP:', data))
    );
    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }
    return observable;
  }

  getNoticiaById(id: string): Observable<Noticia> {
    console.log('Fetching noticia with id:', id);
    const key = makeStateKey<Noticia>('noticia-' + id);
    if (this.ts.hasKey(key)) {
      const data = this.ts.get<Noticia>(key, null as unknown as Noticia);
      console.log('getNoticiaById from TransferState:', data);
      this.ts.remove(key);
      return of(data);
    }
    const observable = this.http.get<{ noticia: Noticia }>(`${this.baseUrl}/noticia/${id}`).pipe(
      map(response => response.noticia || null),
      tap(data => console.log('getNoticiaById from HTTP:', data))
    );
    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }
    return observable;
  }

  getNoticiaBySlug(slug: string): Observable<Noticia> {
    const key = makeStateKey<Noticia>('noticia-slug-' + slug);
    if (this.ts.hasKey(key)) {
      const data = this.ts.get<Noticia>(key, null as unknown as Noticia);
      console.log('getNoticiaBySlug from TransferState:', data);
      this.ts.remove(key);
      return of(data);
    }
    const observable = this.http
      .get<{ noticia: Noticia }>(`${this.baseUrl}/noticia/slug/${encodeURIComponent(slug)}`)
      .pipe(
        map(r => r.noticia || null),
        tap(data => console.log('getNoticiaBySlug from HTTP:', data))
      );
    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }
    return observable;
  }

  updateNoticia(id: string, data: Noticia): Observable<Noticia> {
    console.log('Updating noticia with id:', id, 'Data:', data);
    const key = makeStateKey<Noticia>('noticia-' + id);
    const observable = this.http.put<Noticia>(`${this.baseUrl}/noticia/${id}`, data).pipe(
      tap(data => console.log('updateNoticia response:', data)),
      catchError(error => {
        console.error('Update Noticia Error:', error);
        throw error;
      })
    );
    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(updatedData => this.ts.set(key, updatedData)));
    }
    return observable;
  }

  deleteNoticia(id: string): Observable<void> {
    console.log('Deleting noticia with id:', id);
    const key = makeStateKey<Noticia>('noticia-' + id);
    const observable = this.http.delete<void>(`${this.baseUrl}/noticia/${id}`).pipe(
      tap(() => console.log('deleteNoticia successful')),
      catchError(error => {
        console.error('Delete Noticia Error:', error);
        throw error;
      })
    );
    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(() => this.ts.remove(key)));
    }
    return observable;
  }

  toggleAutorizarNoticia(id: string, autorizada: boolean): Observable<Noticia> {
    console.log(`Toggling autorización for noticia with id: ${id}, autorizada: ${autorizada}`);
    return this.http.patch<Noticia>(`${this.baseUrl}/noticia/${id}/autorizar`, { autorizada }).pipe(
      tap(data => console.log('toggleAutorizarNoticia response:', data)),
      catchError(error => {
        console.error('Toggle Autorizar Noticia Error:', error);
        throw error;
      })
    );
  }

  getArchivos(): Observable<{ anio: number, mes: number, nombre: string }[]> {
    const key = makeStateKey<{ anio: number, mes: number, nombre: string }[]>('archivos');
    if (this.ts.hasKey(key)) {
      const data = this.ts.get<{ anio: number, mes: number, nombre: string }[]>(key, []);
      console.log('getArchivos from TransferState:', data);
      this.ts.remove(key);
      return of(data);
    }
    const observable = this.http.get<{ anio: number, mes: number, nombre: string }[]>(`${this.baseUrl}/archivos`).pipe(
      tap(data => console.log('getArchivos from HTTP:', data)),
      catchError(error => {
        console.error('Get Archivos Error:', error);
        throw error;
      })
    );
    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }
    return observable;
  }

  getCategorias(): Observable<{ _id: string, name: string, slug: string, color?: string }[]> {
    const key = makeStateKey<{ _id: string, name: string, slug: string, color?: string }[]>('categorias');
    if (this.ts.hasKey(key)) {
      const data = this.ts.get<{ _id: string, name: string, slug: string, color?: string }[]>(key, []);
      console.log('getCategorias from TransferState:', data);
      this.ts.remove(key);
      return of(data);
    }
    const observable = this.http.get<{ _id: string, name: string, slug: string, color?: string }[]>(`${this.baseUrl}/categorias`).pipe(
      tap(data => console.log('getCategorias from HTTP:', data)),
      catchError(error => {
        console.error('Get Categorias Error:', error);
        throw error;
      })
    );
    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }
    return observable;
  }

  getNoticiasByArchive(anio: number, mes: number): Observable<Noticia[]> {
    const key = makeStateKey<Noticia[]>(`noticias-archivo-${anio}-${mes}`);
    if (this.ts.hasKey(key)) {
      const data = this.ts.get<Noticia[]>(key, []);
      console.log('getNoticiasByArchive from TransferState:', data);
      this.ts.remove(key);
      return of(data);
    }
    const observable = this.http.get<Noticia[]>(`${this.baseUrl}/noticias/archivo/${anio}/${mes}`).pipe(
      tap(data => console.log('getNoticiasByArchive from HTTP:', data)),
      catchError(error => {
        console.error('Get Noticias by Archive Error:', error);
        throw error;
      })
    );
    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }
    return observable;
  }

  getNoticiasByCategory(slug: string): Observable<Noticia[]> {
    const key = makeStateKey<Noticia[]>(`noticias-categoria-${slug}`);
    if (this.ts.hasKey(key)) {
      const data = this.ts.get<Noticia[]>(key, []);
      console.log('getNoticiasByCategory from TransferState:', data);
      this.ts.remove(key);
      return of(data);
    }
    const observable = this.http.get<Noticia[]>(`${this.baseUrl}/noticias/categoria/${encodeURIComponent(slug)}`).pipe(
      tap(data => console.log('getNoticiasByCategory from HTTP:', data)),
      catchError(error => {
        console.error('Get Noticias by Category Error:', error);
        throw error;
      })
    );
    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }
    return observable;
  }
}