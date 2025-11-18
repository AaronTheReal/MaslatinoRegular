import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminUserService } from './../../../services/useradmin-service';

// Importa los componentes hijos
import { AdminUsuarioListComponent } from './admin-usuario-list/admin-usuario-list';
import { AdminUsuarioFormComponent } from './admin-usuario-form/admin-usuario-form';

export type AdminRole = 'Periodista' | 'Escritor' | 'Administrador' | 'Tecnico';

export interface AdminUser {
  _id?: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-panel-usuarios',
  standalone: true,
  imports: [CommonModule, AdminUsuarioListComponent, AdminUsuarioFormComponent],
  templateUrl: './panel-usuarios.html',
  styleUrl: './panel-usuarios.css'
})
export class PanelUsuarios implements OnInit {

  usuarios: AdminUser[] = [];
  loading = false;
  saving = false;

  mode: 'create' | 'edit' = 'create';
  usuarioSeleccionado: AdminUser | null = null;

  errorMessage = '';

  constructor(private adminUserService: AdminUserService) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.loading = true;
    this.errorMessage = '';
    this.adminUserService.obtenerUsuarios().subscribe({
      next: (data:any) => {
        this.usuarios = data;
        this.loading = false;
      },
      error: (err:any) => {
        console.error(err);
        this.errorMessage = 'Error al cargar usuarios';
        this.loading = false;
      }
    });
  }

  onCrearNuevo(): void {
    this.mode = 'create';
    this.usuarioSeleccionado = null;
  }

  onEditarUsuario(user: AdminUser): void {
    this.mode = 'edit';
    this.usuarioSeleccionado = { ...user };
  }

  onToggleActivo(user: AdminUser): void {
    if (!user._id) return;
    const nuevoEstado = !user.isActive;

    this.adminUserService
      .actualizarUsuario(user._id, { isActive: nuevoEstado })
      .subscribe({
        next: () => this.cargarUsuarios(),
        error: (err:any) => {
          console.error(err);
          this.errorMessage = 'No se pudo cambiar el estado del usuario';
        }
      });
  }

  onEliminarUsuario(user: AdminUser): void {
    if (!user._id) return;
    if (!confirm(`¿Seguro que quieres desactivar/eliminar a ${user.name}?`)) {
      return;
    }

    this.adminUserService.eliminarUsuario(user._id).subscribe({
      next: () => this.cargarUsuarios(),
      error: (err:any) => {
        console.error(err);
        this.errorMessage = 'No se pudo eliminar el usuario';
      }
    });
  }

  onSubmitUsuario(payload: { mode: 'create' | 'edit'; data: any; id?: string }): void {
    this.saving = true;
    this.errorMessage = '';

    if (payload.mode === 'create') {
      this.adminUserService.crearUsuario(payload.data).subscribe({
        next: () => {
          this.saving = false;
          this.mode = 'create';
          this.usuarioSeleccionado = null;
          this.cargarUsuarios();
        },
        error: (err:any) => {
          console.error(err);
          this.errorMessage = err?.error?.message || 'Error al crear usuario';
          this.saving = false;
        }
      });
    } else if (payload.mode === 'edit' && payload.id) {
      this.adminUserService.actualizarUsuario(payload.id, payload.data).subscribe({
        next: () => {
          this.saving = false;
          this.mode = 'create';
          this.usuarioSeleccionado = null;
          this.cargarUsuarios();
        },
        error: (err:any) => {
          console.error(err);
          this.errorMessage = err?.error?.message || 'Error al actualizar usuario';
          this.saving = false;
        }
      });
    }
  }

  onCancelEdicion(): void {
    this.mode = 'create';
    this.usuarioSeleccionado = null;
  }
}
