import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// === Interfaces ===

export type AdminRole = 'Periodista' | 'Escritor' | 'Administrador' | 'Tecnico';

export interface AdminUser {
  _id?: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminLoginPayload {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  message: string;
  token: string;
  user: {
    id?: string;
    _id?: string;
    name: string;
    email: string;
    role: AdminRole;
  };
}

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  /**
   * Ajusta esta URL a tu backend real.
   */
   private API_URL = 'https://maslatinoregular.onrender.com/aaron/maslatino/admin';
  //private API_URL = 'http://localhost:3000/aaron/maslatino/admin';

  constructor(private http: HttpClient) {}

  /** 🔑 Headers con Authorization: Bearer <token> */
  private getAuthHeaders(): HttpHeaders | undefined {
    const token = localStorage.getItem('admin_token');
    if (!token) return undefined;

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  // =========================
  // AUTH / LOGIN (sin headers)
  // =========================

  login(payload: AdminLoginPayload): Observable<AdminLoginResponse> {
    return this.http.post<AdminLoginResponse>(`${this.API_URL}/login`, payload);
  }

  // =========================
  // CRUD de usuarios del panel
  // =========================

  /**
   * Crear usuario del panel (Administrador, Periodista, etc.)
   */
  crearUsuario(user: {
    name: string;
    email: string;
    password: string;
    role: AdminRole;
  }): Observable<{ message: string; user: AdminUser }> {
    const headers = this.getAuthHeaders();
    return this.http.post<{ message: string; user: AdminUser }>(
      `${this.API_URL}/usuarios`,
      user,
      { headers }
    );
  }

  /**
   * Listar todos los usuarios del panel
   */
  obtenerUsuarios(): Observable<AdminUser[]> {
    console.log('si llega?');
    const headers = this.getAuthHeaders();
    return this.http.get<AdminUser[]>(`${this.API_URL}/usuarios`, { headers });
  }

  /**
   * Obtener un usuario por ID
   */
  obtenerUsuarioPorId(id: string): Observable<AdminUser> {
    const headers = this.getAuthHeaders();
    return this.http.get<AdminUser>(`${this.API_URL}/usuarios/${id}`, { headers });
  }

  /**
   * Actualizar usuario
   */
  actualizarUsuario(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      role: AdminRole;
      isActive: boolean;
      password: string;
    }>
  ): Observable<{ message: string; user: AdminUser }> {
    const headers = this.getAuthHeaders();
    return this.http.put<{ message: string; user: AdminUser }>(
      `${this.API_URL}/usuarios/${id}`,
      data,
      { headers }
    );
  }

  /**
   * Desactivar / eliminar usuario
   */
  eliminarUsuario(
    id: string
  ): Observable<{ message: string; user?: AdminUser }> {
    const headers = this.getAuthHeaders();
    return this.http.delete<{ message: string; user?: AdminUser }>(
      `${this.API_URL}/usuarios/${id}`,
      { headers }
    );
  }
}
