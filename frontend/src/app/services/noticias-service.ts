import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { Observable, of, tap, map, shareReplay, catchError } from 'rxjs';
import { Noticia } from '../../models/noticia.model';
import { isPlatformServer } from '@angular/common';
export interface NoticiaCategoriaPage {
  items: Noticia[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
export interface ArchivoItem {
  anio: number;
  mes: number;
  nombre: string;
}
// Define esta interfaz en tu service o en un models.ts
export interface PaginatedNoticias {
  items: Noticia[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
export interface ArchivosPage {
  items: ArchivoItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}


@Injectable({ providedIn: 'root' })
export class NoticiasService {
  private http = inject(HttpClient);
  private ts = inject(TransferState);
  private platformId = inject(PLATFORM_ID);

  // Ajusta para prod con ENV si aplica
  private baseUrl = 'http://localhost:3000/aaron/maslatino';
  //private baseUrl = 'https://maslatinoregular.onrender.com/aaron/maslatino';
   //private baseUrl = 'https://maslatino.onrender.com/aaron/maslatino'; // Ajusta si tu backend cambia

  /** ======== CRUD ======== */

  /** Lista todas las noticias (usa el endpoint que ya tenías en admin) */
  getNoticias(): Observable<Noticia[]> {
    const key = makeStateKey<Noticia[]>('noticias-todas');
    if (this.ts.hasKey(key)) {
      const data = this.ts.get<Noticia[]>(key, []);
      this.ts.remove(key);
      return of(data);
    }
    const observable = this.http
      .get<Noticia[]>(`${this.baseUrl}/getNoticias`)
      .pipe(shareReplay(1));

    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }
    return observable;
  }
  // ======== Paginación real desde backend (con filtros) ========
  getNoticiasPaginadas(
    page = 1,
    limit = 5,
    search?: string,
    categoryId?: string
  ): Observable<{ items: Noticia[]; total: number; page: number; limit: number }> {
    const normSearch = (search || '').trim();
    const normCat    = (categoryId || '').trim();

    const key = makeStateKey<{ items: Noticia[]; total: number; page: number; limit: number }>(
      `noticias-pag-${page}-${limit}-${normSearch || 'all'}-${normCat || 'all'}`
    );

    // TransferState: si ya viene del SSR, lo usamos
    if (this.ts.hasKey(key)) {
      const data = this.ts.get(key, { items: [], total: 0, page, limit });
      this.ts.remove(key);
      return of(data);
    }

    let url = `${this.baseUrl}/noticias/paginadas?page=${page}&limit=${limit}`;
    if (normSearch) {
      url += `&q=${encodeURIComponent(normSearch)}`;
    }
    if (normCat) {
      url += `&categoryId=${encodeURIComponent(normCat)}`;
    }

    const observable = this.http
      .get<{ items: Noticia[]; total: number; page: number; limit: number }>(url)
      .pipe(shareReplay(1));

    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }

    return observable;
  }

  /** Crear */
  createNoticia(data: Noticia): Observable<Noticia> {
    console.log("queee", data);
    return this.http
      .post<Noticia>(`${this.baseUrl}/noticiasPost`, data)
      .pipe(shareReplay(1));
  }

  /** Actualizar */
  updateNoticia(id: string, data: Noticia): Observable<Noticia> {
    return this.http
      .put<Noticia>(`${this.baseUrl}/noticia/${id}`, data)
      .pipe(shareReplay(1));
  }

  /** Eliminar */
  deleteNoticia(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/noticia/${id}`)
      .pipe(shareReplay(1));
  }

  /** Autorizar/Desautorizar */
  toggleAutorizarNoticia(id: string, autorizada: boolean): Observable<Noticia> {
    return this.http
      .patch<Noticia>(`${this.baseUrl}/noticia/${id}/autorizar`, { autorizada })
      .pipe(shareReplay(1));
  }

  /** ======== Lecturas optimizadas (con TransferState) ======== */

  getNoticiasRecientes(limit = 0): Observable<Noticia[]> {
    const key = makeStateKey<Noticia[]>('noticias-recientes-' + limit);
    if (this.ts.hasKey(key)) {
      const data = this.ts.get<Noticia[]>(key, []);
      this.ts.remove(key);
      return of(data);
    }
    const observable = this.http
      .get<Noticia[]>(`${this.baseUrl}/noticias/recientes?limit=${limit}`)
      .pipe(shareReplay(1));
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
    const observable = this.http
      .get<Noticia[]>(`${this.baseUrl}/noticias/recomendadas?limit=${limit}`)
      .pipe(shareReplay(1));
    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }
    return observable;
  }

  getNoticiaById(id: string): Observable<Noticia> {
    const key = makeStateKey<Noticia>('noticia-' + id);
    if (this.ts.hasKey(key)) {
      const data = this.ts.get<Noticia>(key, null as unknown as Noticia);
      this.ts.remove(key);
      return of(data);
    }
    const observable = this.http
      .get<{ noticia: Noticia }>(`${this.baseUrl}/noticia/${id}`)
      .pipe(map(r => r.noticia || null), shareReplay(1));
    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }
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
      .pipe(map(r => r.noticia || null), shareReplay(1));
    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }
    return observable;
  }


getArchivos(page: number = 1, limit: number = 12): Observable<ArchivosPage> {
  const key = makeStateKey<ArchivosPage>(`archivos-p${page}-l${limit}`);

  if (this.ts.hasKey(key)) {
    const data = this.ts.get<ArchivosPage>(key, {
      items: [],
      total: 0,
      page,
      totalPages: 1,
      limit,
      hasNextPage: false,
      hasPrevPage: false
    });
    this.ts.remove(key);
    return of(data);
  }

  const observable = this.http
    .get<ArchivosPage>(`${this.baseUrl}/archivos`, {
      params: {
        page: page.toString(),
        limit: limit.toString()
      }
    })
    .pipe(shareReplay(1));

  if (isPlatformServer(this.platformId)) {
    return observable.pipe(tap(data => this.ts.set(key, data)));
  }

  return observable;
}


  getCategorias(): Observable<{ _id: string; name: string; slug: string; color?: string }[]> {
    const key = makeStateKey<{ _id: string; name: string; slug: string; color?: string }[]>('categorias');
    if (this.ts.hasKey(key)) {
      const data = this.ts.get<{ _id: string; name: string; slug: string; color?: string }[]>(key, []);
      this.ts.remove(key);
      return of(data);
    }
    const observable = this.http
      .get<{ _id: string; name: string; slug: string; color?: string }[]>(`${this.baseUrl}/categorias`)
      .pipe(shareReplay(1));
    if (isPlatformServer(this.platformId)) {
      return observable.pipe(tap(data => this.ts.set(key, data)));
    }
    return observable;
  }

getNoticiasByArchive(
  anio: number,
  mes: number,
  page: number = 1,
  limit: number = 10
): Observable<PaginatedNoticias> {
  const key = makeStateKey<PaginatedNoticias>(`noticias-archivo-${anio}-${mes}-p${page}-l${limit}`);

  if (this.ts.hasKey(key)) {
    const data = this.ts.get<PaginatedNoticias>(key, {
      items: [],
      total: 0,
      page,
      totalPages: 1,
      limit,
      hasNextPage: false,
      hasPrevPage: false,
    });
    this.ts.remove(key);
    return of(data);
  }

  const params = new HttpParams()
    .set('page', page.toString())
    .set('limit', limit.toString());

  const observable = this.http
    .get<PaginatedNoticias>(`${this.baseUrl}/noticias/archivo/${anio}/${mes}`, { params })
    .pipe(shareReplay(1));

  if (isPlatformServer(this.platformId)) {
    return observable.pipe(tap(data => this.ts.set(key, data)));
  }

  return observable;
}
  getNoticiasByCategory(
  slug: string,
  page: number = 1,
  limit: number = 10
): Observable<NoticiaCategoriaPage> {
  const key = makeStateKey<NoticiaCategoriaPage>(
    `noticias-categoria-${slug}-p${page}-l${limit}`
  );

  if (this.ts.hasKey(key)) {
    const data = this.ts.get<NoticiaCategoriaPage>(key, {
      items: [],
      total: 0,
      page,
      totalPages: 1,
      limit,
      hasNextPage: false,
      hasPrevPage: false
    });
    this.ts.remove(key);
    return of(data);
  }

  const observable = this.http
    .get<NoticiaCategoriaPage>(
      `${this.baseUrl}/noticias/categoria/${encodeURIComponent(slug)}`,
      {
        params: {
          page: page.toString(),
          limit: limit.toString()
        }
      }
    )
    .pipe(shareReplay(1));

  if (isPlatformServer(this.platformId)) {
    return observable.pipe(tap(data => this.ts.set(key, data)));
  }

  return observable;
}
  checkImageUnique(url: string): Observable<boolean> {
    return this.http.get<{ unique: boolean }>(`${this.baseUrl}/image-unique?url=${encodeURIComponent(url)}`).pipe(
      map(res => res.unique),
      catchError(() => of(true)) // Fallback if endpoint not implemented
    );
  }
}
