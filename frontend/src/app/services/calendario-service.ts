import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/** ====== Tipos / Interfaces ====== */

export type CalendarKind = 'anuncio' | 'evento';
export type CalendarStatus = 'draft' | 'published' | 'archived';

export interface CalendarLocation {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface CalendarLink {
  label?: string;
  url?: string;
  external?: boolean;
}

export interface CalendarItem {
  _id?: string;
  kind: CalendarKind;
  title: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  image?: string;

  startAt: string;   // ISO string
  endAt?: string;
  allDay: boolean;
  timezone: string;

  location?: CalendarLocation;
  link?: CalendarLink;

  categories: string[];
  tags?: string[];

  status: CalendarStatus;
  featured: boolean;

  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  ok: boolean;
  data: T[];
  meta: PaginatedMeta & Record<string, any>;
}

export interface SingleResponse<T> {
  ok: boolean;
  data: T;
  message?: string;
}

export interface StatsResponse {
  ok: boolean;
  data: {
    total: number;
    published: number;
    upcoming: number;
    past: number;
  };
}

export interface CalendarListParams {
  status?: CalendarStatus;
  from?: string;      // ISO date (YYYY-MM-DD) o ISO datetime
  to?: string;        // "
  q?: string;
  category?: string;  // ObjectId
  tag?: string;
  kind?: CalendarKind;
  featured?: boolean;
  page?: number;
  limit?: number;
  sort?: string;      // "startAt:asc" | "startAt:desc" | "-createdAt" ...
}

/** ====== Util ====== */
function buildParams(params: Record<string, any>): HttpParams {
  let httpParams = new HttpParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val === undefined || val === null || val === '') return;
    // Booleanos a string
    if (typeof val === 'boolean') {
      httpParams = httpParams.set(key, String(val));
    } else {
      httpParams = httpParams.set(key, val);
    }
  });
  return httpParams;
}

/** ====== Service ====== */

@Injectable({ providedIn: 'root' })
export class CalendarioService {
  // Ajusta a tu prefijo real
  //private baseUrl = 'http://localhost:3000/aaron/maslatino';
  private baseUrl = 'https://maslatinoregular.onrender.com/aaron/maslatino';

  constructor(private http: HttpClient) {}

  /** Crear */
  createItem(payload: Partial<CalendarItem>): Observable<SingleResponse<CalendarItem>> {
    return this.http.post<SingleResponse<CalendarItem>>(
      `${this.baseUrl}/calendar`,
      payload
    );
  }

  /** Listar con filtros + paginación */
  list(params: CalendarListParams = {}): Observable<PaginatedResponse<CalendarItem>> {
    const httpParams = buildParams(params as any);
    return this.http.get<PaginatedResponse<CalendarItem>>(
      `${this.baseUrl}/calendar`,
      { params: httpParams }
    );
  }

  /** Próximos (upcoming) */
  listUpcoming(params: Omit<CalendarListParams, 'status'> = {}): Observable<PaginatedResponse<CalendarItem>> {
    const httpParams = buildParams(params as any);
    return this.http.get<PaginatedResponse<CalendarItem>>(
      `${this.baseUrl}/calendar/upcoming`,
      { params: httpParams }
    );
  }

  /** Pasados (past) */
  listPast(params: Omit<CalendarListParams, 'status'> = {}): Observable<PaginatedResponse<CalendarItem>> {
    const httpParams = buildParams(params as any);
    return this.http.get<PaginatedResponse<CalendarItem>>(
      `${this.baseUrl}/calendar/past`,
      { params: httpParams }
    );
  }

  /** Obtener por ID */
  getById(id: string): Observable<SingleResponse<CalendarItem>> {
    return this.http.get<SingleResponse<CalendarItem>>(
      `${this.baseUrl}/calendar/${id}`
    );
  }

  /** Obtener por slug */
  getBySlug(slug: string): Observable<SingleResponse<CalendarItem>> {
    return this.http.get<SingleResponse<CalendarItem>>(
      `${this.baseUrl}/calendar/slug/${slug}`
    );
  }

  /** Obtener por nombre de categoría (como en podcasts) */
  getByCategoryName(name: string, params: Omit<CalendarListParams, 'category'> = {}): Observable<PaginatedResponse<CalendarItem>> {
    const httpParams = buildParams(params as any);
    return this.http.get<PaginatedResponse<CalendarItem>>(
      `${this.baseUrl}/calendar/by-category-name/${encodeURIComponent(name)}`,
      { params: httpParams }
    );
  }

  /** Actualizar */
  update(id: string, payload: Partial<CalendarItem>): Observable<SingleResponse<CalendarItem>> {
    return this.http.put<SingleResponse<CalendarItem>>(
      `${this.baseUrl}/calendar/${id}`,
      payload
    );
  }

  /** Publicar */
  publish(id: string): Observable<SingleResponse<CalendarItem>> {
    return this.http.patch<SingleResponse<CalendarItem>>(
      `${this.baseUrl}/calendar/${id}/publish`,
      {}
    );
  }

  /** Archivar */
  archive(id: string): Observable<SingleResponse<CalendarItem>> {
    return this.http.patch<SingleResponse<CalendarItem>>(
      `${this.baseUrl}/calendar/${id}/archive`,
      {}
    );
  }

  /** Toggle destacado */
  toggleFeatured(id: string, featured: boolean): Observable<SingleResponse<CalendarItem>> {
    return this.http.patch<SingleResponse<CalendarItem>>(
      `${this.baseUrl}/calendar/${id}/featured`,
      { featured }
    );
  }

  /** Eliminar */
  delete(id: string): Observable<SingleResponse<null>> {
    return this.http.delete<SingleResponse<null>>(
      `${this.baseUrl}/calendar/${id}`
    );
  }

  /** Stats */
  stats(): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.baseUrl}/calendar/stats`);
  }

  /** Bulk publish */
  bulkPublish(ids: string[]): Observable<SingleResponse<any>> {
    return this.http.patch<SingleResponse<any>>(
      `${this.baseUrl}/calendar/bulk/publish`,
      { ids }
    );
  }

  /** Bulk delete */
  bulkDelete(ids: string[]): Observable<SingleResponse<any>> {
    return this.http.request<SingleResponse<any>>(
      'delete',
      `${this.baseUrl}/calendar/bulk`,
      { body: { ids } }
    );
  }

    obtenerItems(): Observable<CalendarItem[]> {
      return this.http.get<CalendarItem[]>(this.baseUrl);
    }
}
