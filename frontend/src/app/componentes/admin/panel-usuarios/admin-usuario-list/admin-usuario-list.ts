import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 👈 IMPORTANTE
import { AdminUser, AdminRole } from '../panel-usuarios'; // ajusta path si hace falta

@Component({
  selector: 'app-admin-usuario-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule        // 👈 AQUÍ PARA QUE FUNCIONE [(ngModel)]
  ],
  templateUrl: './admin-usuario-list.html',
  styleUrl: './admin-usuario-list.css'
})
export class AdminUsuarioListComponent {

  @Input() usuarios: AdminUser[] = [];
  @Input() loading = false;

  @Output() crearNuevo = new EventEmitter<void>();
  @Output() editar = new EventEmitter<AdminUser>();
  @Output() toggleActivo = new EventEmitter<AdminUser>();
  @Output() eliminar = new EventEmitter<AdminUser>();

  filtroTexto = '';
  filtroRol: AdminRole | 'todos' = 'todos';

  get usuariosFiltrados(): AdminUser[] {
    return this.usuarios
      .filter(u => {
        if (this.filtroRol !== 'todos' && u.role !== this.filtroRol) return false;
        if (!this.filtroTexto) return true;

        const t = this.filtroTexto.toLowerCase();
        return (
          u.name?.toLowerCase().includes(t) ||
          u.email?.toLowerCase().includes(t)
        );
      });
  }

  onCrearNuevoClick(): void {
    this.crearNuevo.emit();
  }

  onEditarClick(user: AdminUser): void {
    this.editar.emit(user);
  }

  onToggleActivoClick(user: AdminUser): void {
    this.toggleActivo.emit(user);
  }

  onEliminarClick(user: AdminUser): void {
    this.eliminar.emit(user);
  }

  roleBadgeClass(role: AdminRole): string {
    switch (role) {
      case 'Administrador':
        return 'badge badge-admin';
      case 'Tecnico':
        return 'badge badge-tech';
      case 'Periodista':
        return 'badge badge-journalist';
      case 'Escritor':
        return 'badge badge-writer';
      default:
        return 'badge';
    }
  }
}
