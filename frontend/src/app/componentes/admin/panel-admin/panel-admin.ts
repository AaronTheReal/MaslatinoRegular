import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router'; // ← agregamos Router

type AdminRole = 'Periodista' | 'Escritor' | 'Administrador' | 'Tecnico';

@Component({
  selector: 'app-panel-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './panel-admin.html',
  styleUrls: ['./panel-admin.css'],
})
export class PanelAdmin implements OnInit {
  userRole: AdminRole | null = null;

  constructor(private router: Router) {} // ← inyectamos Router

  ngOnInit(): void {
    const raw = localStorage.getItem('admin_user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.userRole = parsed?.role as AdminRole;

        // Defensa extra: si no hay role → cerrar sesión inmediatamente
        if (!this.userRole) {
          this.logout();
        }
      } catch (e) {
        console.error('Error parsing admin_user', e);
        this.logout();
      }
    } else {
      this.logout(); // por si acaso
    }
  }

  // ==================== BOTÓN CERRAR SESIÓN ====================
  logout(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    this.router.navigate(['/admin-login']);
  }

  // === Tus helpers de permisos (sin cambios) ===
  isAdmin(): boolean {
    return this.userRole === 'Administrador';
  }

  canSeeNoticias(): boolean {
    return (
      this.userRole === 'Administrador' ||
      this.userRole === 'Periodista' ||
      this.userRole === 'Escritor'
    );
  }

  canSeePodcasts(): boolean {
    return this.userRole === 'Administrador' || this.userRole === 'Tecnico';
  }

  canSeeCalendario(): boolean { return this.isAdmin(); }
  canSeeCategorias(): boolean { return this.isAdmin(); }
  canSeeUsuarios(): boolean { return this.isAdmin(); }
  canSeeMultimedia(): boolean { return this.isAdmin(); }
}