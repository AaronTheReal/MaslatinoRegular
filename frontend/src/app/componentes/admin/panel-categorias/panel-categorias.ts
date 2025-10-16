import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CategoriaService, CategoriaPayload } from '../../../services/categorias-service';

@Component({
  selector: 'app-panel-categorias',
  templateUrl: './panel-categorias.html',
  styleUrls: ['./panel-categorias.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class PanelCategorias {
  selectedTab: string = 'agregar';
  categoryForm: FormGroup;
  editing: boolean = false;
  categoriaIdEditando: string | null = null;
  categorias: CategoriaPayload[] = [];

  constructor(private fb: FormBuilder, private categoriasService: CategoriaService) {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      slug: ['', Validators.required],
      description: [''],
      image: ['', Validators.required],
      color: ['#007bff', Validators.required]
    });

    this.categoryForm.get('name')?.valueChanges.subscribe((nombre: string) => {
      if (!this.editing) {
        const slug = this.generarSlug(nombre);
        this.categoryForm.get('slug')?.setValue(slug, { emitEvent: false });
      }
    });

    this.obtenerCategorias();
  }

  generarSlug(nombre: string): string {
    return nombre
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    this.editing = false;
    this.categoryForm.reset({ color: '#007bff' });
  }

  onSubmit() {
    if (this.categoryForm.invalid) return;

    const formData = this.categoryForm.value;

    if (this.editing && this.categoriaIdEditando) {
      this.categoriasService.actualizarCategoria(this.categoriaIdEditando, formData).subscribe({
        next: (res) => {
          alert('✅ Categoría actualizada');
          this.resetFormulario();
          this.obtenerCategorias();
        },
        error: (err) => alert(err.error?.error || 'Error al actualizar')
      });
    } else {
      this.categoriasService.crearCategoria(formData).subscribe({
        next: (res) => {
          alert('✅ Categoría creada');
          this.resetFormulario();
          this.obtenerCategorias();
        },
        error: (err) => alert(err.error?.error || 'Error al crear')
      });
    }
  }

  obtenerCategorias() {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (res) => this.categorias = res,
      error: () => alert('Error al cargar categorías')
    });
  }

  editarCategoria(categoria: CategoriaPayload) {
    this.selectedTab = 'agregar';
    this.editing = true;
    this.categoriaIdEditando = categoria._id || null;
    this.categoryForm.patchValue(categoria);
  }

  eliminarCategoria(id: string) {
    if (confirm('¿Seguro que quieres eliminar esta categoría?')) {
      this.categoriasService.eliminarCategoria(id).subscribe({
        next: () => {
          alert('✅ Categoría eliminada');
          this.obtenerCategorias();
        },
        error: () => alert('Error al eliminar categoría')
      });
    }
  }

  resetFormulario() {
    this.categoryForm.reset({ color: '#007bff' });
    this.editing = false;
    this.categoriaIdEditando = null;
  }
}
