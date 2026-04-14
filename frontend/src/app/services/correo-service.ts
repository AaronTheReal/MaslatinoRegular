import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CorreoPayload {
  _id?: string;
  correo: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class CorreoService {

  //baseUrl = 'http://localhost:3000/aaron/maslatino';
  baseUrl = 'https://maslatinoregular.onrender.com/aaron/maslatino';

  constructor(private http: HttpClient) {}

  // ─────────────────────────────
  // SUSCRIPCIÓN (Frontend - Usuario)
  // ─────────────────────────────
  suscribir(correo: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/correos`, { correo });
  }

  // ─────────────────────────────
  // ADMIN
  // ─────────────────────────────
  obtenerCorreos(): Observable<CorreoPayload[]> {
    return this.http.get<CorreoPayload[]>(`${this.baseUrl}/correos`);
  }

  eliminarCorreo(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/correos/${id}`);
  }
}