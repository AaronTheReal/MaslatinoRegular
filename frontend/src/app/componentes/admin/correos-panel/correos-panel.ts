import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CorreoService, CorreoPayload } from '../../../services/correo-service'; // ← ajusta la ruta según tu estructura

@Component({
  selector: 'app-correos-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './correos-panel.html',
  styleUrl: './correos-panel.css'
})
export class CorreosPanel implements OnInit {

  // Datos
  correos = signal<CorreoPayload[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');

  // Paginación
  currentPage = signal<number>(1);
  pageSize = 20;
  totalCorreos = signal<number>(0);

  constructor(private correoService: CorreoService) {}

  ngOnInit(): void {
    this.cargarCorreos();
  }

  cargarCorreos() {
    this.loading.set(true);
    this.error.set('');

    this.correoService.obtenerCorreos().subscribe({
      next: (data) => {
        this.correos.set(data);
        this.totalCorreos.set(data.length);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar los correos');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  // Correos de la página actual
  get correosPaginados() {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.correos().slice(start, start + this.pageSize);
  }

  // Total de páginas
  get totalPaginas() {
    return Math.ceil(this.totalCorreos() / this.pageSize);
  }

  cambiarPagina(pagina: number) {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.currentPage.set(pagina);
  }

  anterior() {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  siguiente() {
    if (this.currentPage() < this.totalPaginas) this.currentPage.update(p => p + 1);
  }
}