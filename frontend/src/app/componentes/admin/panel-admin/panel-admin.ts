import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

type AdminRole = 'Periodista' | 'Escritor' | 'Administrador' | 'Tecnico';

@Component({
  selector: 'app-panel-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './panel-admin.html',
  styleUrls: ['./panel-admin.css'],
})
export class PanelAdmin implements OnInit {
  userRole: AdminRole | null = null;

  ngOnInit(): void {
    const raw = localStorage.getItem('admin_user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.userRole = parsed?.role as AdminRole;
      } catch (e) {
        console.error('Error parsing admin_user from localStorage', e);
      }
    }
  }

  // Helpers de permisos visuales
  isAdmin(): boolean {
    return this.userRole === 'Administrador';
  }

  // Noticias: Admin, Periodista, Escritor
  canSeeNoticias(): boolean {
    return (
      this.userRole === 'Administrador' ||
      this.userRole === 'Periodista' ||
      this.userRole === 'Escritor'
    );
  }

  // Podcasts: Admin, Tecnico
  canSeePodcasts(): boolean {
    return this.userRole === 'Administrador' || this.userRole === 'Tecnico';
  }

  // El resto (Calendario, Categorías, Usuarios, Multimedia): sólo Admin por ahora
  canSeeCalendario(): boolean {
    return this.isAdmin();
  }

  canSeeCategorias(): boolean {
    return this.isAdmin();
  }

  canSeeUsuarios(): boolean {
    return this.isAdmin();
  }

  canSeeMultimedia(): boolean {
    return this.isAdmin();
  }
}
