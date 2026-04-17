import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CategoriaPayload {
  _id?: string;

  // Identidad
  name: string;
  slug?: string; // ⚠️ ahora opcional (lo genera el backend)
  description?: string;

  // UX / Visual
  image?: string;
  color?: string;
  order?: number;

  // ─────────────────────────────
  // SEO ON-PAGE
  // ─────────────────────────────
  metaTitle?: string;
  metaDescription?: string;
  seoIndexable?: boolean;
  canonicalUrl?: string;

  // ─────────────────────────────
  // Open Graph / Social
  // ─────────────────────────────
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;

  // ─────────────────────────────
  // Editorial / Schema
  // ─────────────────────────────
  status?: 'draft' | 'published';
  schemaType?: string;

  // Fechas (solo lectura)
  createdAt?: string;
  updatedAt?: string;
  tipo?: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  //baseUrl = 'http://localhost:3000/aaron/maslatino';
  baseUrl = 'https://maslatinoregular.onrender.com/aaron/maslatino';

  constructor(private http: HttpClient) {}

  // ─────────────────────────────
  // ADMIN
  // ─────────────────────────────
  crearCategoria(data: CategoriaPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/categoriaPost`, data);
  }

  obtenerCategorias(): Observable<CategoriaPayload[]> {
    return this.http.get<CategoriaPayload[]>(`${this.baseUrl}/categorias`);
  }

  obtenerCategoriaPorId(id: string): Observable<CategoriaPayload> {
    return this.http.get<CategoriaPayload>(`${this.baseUrl}/categorias/${id}`);
  }

  actualizarCategoria(id: string, data: Partial<CategoriaPayload>): Observable<any> {
    return this.http.put(`${this.baseUrl}/categorias/${id}`, data);
  }

  eliminarCategoria(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/categorias/${id}`);
  }

  getCategoriasByIds(ids: string[]): Observable<CategoriaPayload[]> {
    return this.http.post<CategoriaPayload[]>(
      `${this.baseUrl}/categorias/by-ids`,
      { ids }
    );
  }

  // ─────────────────────────────
  // SEO / FRONTEND
  // ─────────────────────────────
  obtenerCategoriasPublicas(): Observable<CategoriaPayload[]> {
    return this.http.get<CategoriaPayload[]>(
      `${this.baseUrl}/categorias-publicas`
    );
  }

  obtenerCategoriaPorSlug(slug: string): Observable<CategoriaPayload> {
    return this.http.get<CategoriaPayload>(
      `${this.baseUrl}/categoria/${slug}`
    );
  }
}
