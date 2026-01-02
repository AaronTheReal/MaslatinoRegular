import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  CategoriaService,
  CategoriaPayload
} from '../../../services/categorias-service';

@Component({
  selector: 'app-panel-categorias',
  templateUrl: './panel-categorias.html',
  styleUrls: ['./panel-categorias.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class PanelCategorias {
  selectedTab: string = 'agregar';
  categoryForm: FormGroup;
  editing = false;
  categoriaIdEditando: string | null = null;
  categorias: CategoriaPayload[] = [];

  constructor(
    private fb: FormBuilder,
    private categoriasService: CategoriaService
  ) {
    this.categoryForm = this.fb.group({
      // ─────────────────────────────
      // Básico
      // ─────────────────────────────
      name: ['', Validators.required],
      description: [''],
      image: ['', Validators.required],
      color: ['#007bff', Validators.required],
      order: [0],

      // ─────────────────────────────
      // SEO
      // ─────────────────────────────
      metaTitle: ['', Validators.maxLength(70)],
      metaDescription: ['', Validators.maxLength(160)],
      seoIndexable: [true],
      canonicalUrl: [''],

      // ─────────────────────────────
      // Open Graph
      // ─────────────────────────────
      ogTitle: ['', Validators.maxLength(70)],
      ogDescription: ['', Validators.maxLength(160)],
      ogImage: [''],

      // ─────────────────────────────
      // Editorial
      // ─────────────────────────────
      status: ['published'],
      schemaType: ['CollectionPage']
    });

    this.obtenerCategorias();
  }

  // ─────────────────────────────
  // Tabs
  // ─────────────────────────────
  selectTab(tab: string) {
    this.selectedTab = tab;
    this.resetFormulario();
  }

  // ─────────────────────────────
  // Submit
  // ─────────────────────────────
  onSubmit() {
    if (this.categoryForm.invalid) return;

    const formData = this.categoryForm.value;

    if (this.editing && this.categoriaIdEditando) {
      this.categoriasService
        .actualizarCategoria(this.categoriaIdEditando, formData)
        .subscribe({
          next: () => {
            alert('✅ Categoría actualizada');
            this.resetFormulario();
            this.obtenerCategorias();
          },
          error: err =>
            alert(err.error?.error || 'Error al actualizar categoría')
        });
    } else {
      this.categoriasService.crearCategoria(formData).subscribe({
        next: () => {
          alert('✅ Categoría creada');
          this.resetFormulario();
          this.obtenerCategorias();
        },
        error: err =>
          alert(err.error?.error || 'Error al crear categoría')
      });
    }
  }

  // ─────────────────────────────
  // CRUD helpers
  // ─────────────────────────────
  obtenerCategorias() {
    this.categoriasService.obtenerCategorias().subscribe({
      next: res => (this.categorias = res),
      error: () => alert('Error al cargar categorías')
    });
  }

  editarCategoria(categoria: CategoriaPayload) {
    this.selectedTab = 'agregar';
    this.editing = true;
    this.categoriaIdEditando = categoria._id || null;

    this.categoryForm.patchValue({
      name: categoria.name,
      description: categoria.description,
      image: categoria.image,
      color: categoria.color || '#007bff',
      order: categoria.order ?? 0,

      // SEO
      metaTitle: categoria.metaTitle || '',
      metaDescription: categoria.metaDescription || '',
      seoIndexable: categoria.seoIndexable ?? true,
      canonicalUrl: categoria.canonicalUrl || '',

      // Open Graph
      ogTitle: categoria.ogTitle || '',
      ogDescription: categoria.ogDescription || '',
      ogImage: categoria.ogImage || categoria.image,

      // Editorial
      status: categoria.status || 'published',
      schemaType: categoria.schemaType || 'CollectionPage'
    });
  }

  eliminarCategoria(id: string) {
    if (!confirm('¿Seguro que quieres eliminar esta categoría?')) return;

    this.categoriasService.eliminarCategoria(id).subscribe({
      next: () => {
        alert('✅ Categoría eliminada');
        this.obtenerCategorias();
      },
      error: () => alert('Error al eliminar categoría')
    });
  }

  // ─────────────────────────────
  // Reset
  // ─────────────────────────────
  resetFormulario() {
    this.categoryForm.reset({
      color: '#007bff',
      seoIndexable: true,
      status: 'published',
      schemaType: 'CollectionPage',
      order: 0
    });

    this.editing = false;
    this.categoriaIdEditando = null;
  }

  // ─────────────────────────────
  // Upload imagen categoría (S3)
  // ─────────────────────────────
  async onPickCategoryImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    const contentType = file.type || 'application/octet-stream';

    try {
      const sign = await fetch(
        'https://maslatinoregular.onrender.com/aaron/maslatino/sign-upload',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType,
            approxSize: file.size
          })
        }
      );

      if (!sign.ok) {
        alert('No se pudo firmar la subida de la imagen.');
        return;
      }

      const { uploadUrl, publicUrl } = await sign.json();

      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file
      });

      if (!put.ok) {
        alert('Fallo al subir la imagen a S3.');
        return;
      }

      this.categoryForm.patchValue({
        image: publicUrl,
        ogImage: publicUrl
      });

      this.categoryForm.get('image')?.updateValueAndValidity();
      input.value = '';
    } catch (err) {
      console.error(err);
      alert('Error al subir la imagen.');
    }
  }
}