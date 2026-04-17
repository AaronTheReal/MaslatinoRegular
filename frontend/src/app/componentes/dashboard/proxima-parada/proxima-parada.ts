import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoriaService, CategoriaPayload } from '../../../services/categorias-service'; // Ajusta la ruta según tu estructura

@Component({
  selector: 'app-proxima-parada',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './proxima-parada.html',
  styleUrl: './proxima-parada.css'
})
export class ProximaParada implements OnInit {

  cities: CategoriaPayload[] = [];
  loading = true;
  error = false;

  constructor(private categoriaService: CategoriaService) {}

  ngOnInit(): void {
    this.cargarCiudades();
  }

  cargarCiudades(): void {
    this.categoriaService.obtenerCategorias().subscribe({
      next: (categorias: CategoriaPayload[]) => {
        // Filtrar solo tipo "cities" y ordenar alfabéticamente por nombre
        console.log(categorias);
        this.cities = categorias
          .filter(cat => cat.tipo === 'cities')
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar ciudades:', err);
        this.error = true;
        this.loading = false;
      }
    });
  }
}