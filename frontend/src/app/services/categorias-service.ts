
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CategoriaPayload {
  _id?: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  //private baseUrl = 'http://localhost:3000/aaron/maslatino';
  private baseUrl = 'https://maslatinoregular.onrender.com/aaron/maslatino';

  constructor(private http: HttpClient) {}

  crearCategoria(data: CategoriaPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/categoriaPost`, data);
  }

  obtenerCategorias(): Observable<CategoriaPayload[]> {
    return this.http.get<CategoriaPayload[]>(`${this.baseUrl}/categorias`);
  }

  obtenerCategoriaPorId(id: string): Observable<CategoriaPayload> {
    return this.http.get<CategoriaPayload>(`${this.baseUrl}/categorias/${id}`);
  }

  actualizarCategoria(id: string, data: CategoriaPayload): Observable<any> {
    return this.http.put(`${this.baseUrl}/categorias/${id}`, data);
  }

  eliminarCategoria(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/categorias/${id}`);
  }

  getCategoriasByIds(ids: string[]): Observable<CategoriaPayload[]> {
    return this.http.post<CategoriaPayload[]>(`${this.baseUrl}/categorias/by-ids`, { ids });
  }
}
