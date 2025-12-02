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

  constructor(
    private fb: FormBuilder,
    private categoriasService: CategoriaService
  ) {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      slug: ['', Validators.required],
      description: [''],
      image: ['', Validators.required],
      color: ['#007bff', Validators.required],

      // 🔹 Campos SEO
      metaTitle: ['', [Validators.maxLength(70)]],
      metaDescription: ['', [Validators.maxLength(160)]],
      seoIndexable: [true]
    });

    // Autogenerar slug desde name cuando NO estás editando
    this.categoryForm.get('name')?.valueChanges.subscribe((nombre: string) => {
      if (!this.editing) {
        const slug = this.generarSlug(nombre || '');
        this.categoryForm.get('slug')?.setValue(slug, { emitEvent: false });
      }
    });

    this.obtenerCategorias();
  }

  generarSlug(nombre: string): string {
    return nombre
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    this.editing = false;
    this.categoriaIdEditando = null;
    this.categoryForm.reset({
      color: '#007bff',
      seoIndexable: true
    });
  }

  onSubmit() {
    if (this.categoryForm.invalid) return;

    const formData = this.categoryForm.value;

    if (this.editing && this.categoriaIdEditando) {
      this.categoriasService.actualizarCategoria(this.categoriaIdEditando, formData).subscribe({
        next: () => {
          alert('✅ Categoría actualizada');
          this.resetFormulario();
          this.obtenerCategorias();
        },
        error: (err) => alert(err.error?.error || 'Error al actualizar')
      });
    } else {
      this.categoriasService.crearCategoria(formData).subscribe({
        next: () => {
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
      next: (res) => (this.categorias = res),
      error: () => alert('Error al cargar categorías')
    });
  }

  editarCategoria(categoria: CategoriaPayload) {
    this.selectedTab = 'agregar';
    this.editing = true;
    this.categoriaIdEditando = categoria._id || null;

    // Rellenar formulario con todo, incluyendo SEO
    this.categoryForm.patchValue({
      name: categoria.name,
      slug: categoria.slug,
      description: categoria.description,
      image: categoria.image,
      color: categoria.color || '#007bff',
      metaTitle: (categoria as any).metaTitle || '',
      metaDescription: (categoria as any).metaDescription || '',
      seoIndexable: (categoria as any).seoIndexable ?? true
    });
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
    this.categoryForm.reset({
      color: '#007bff',
      seoIndexable: true
    });
    this.editing = false;
    this.categoriaIdEditando = null;
  }
    async onPickCategoryImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    const contentType = file.type || 'application/octet-stream';

    // 1) Pedir URL firmada al backend (mismo endpoint que usas en noticias)
    const sign = await fetch(
      'https://maslatinoregular.onrender.com/aaron/maslatino/sign-upload',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType,
          approxSize: file.size,
        }),
      }
    );

    if (!sign.ok) {
      alert('No se pudo firmar la subida de la imagen de categoría.');
      return;
    }

    const { uploadUrl, publicUrl } = await sign.json();

    // 2) Subir archivo directo a S3
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });

    if (!put.ok) {
      alert('Fallo al subir la imagen a S3.');
      return;
    }

    // 3) Guardar la URL pública en el formulario (campo "image")
    this.categoryForm.patchValue({
      image: publicUrl,
    });
    this.categoryForm.get('image')?.updateValueAndValidity();

    // opcional: limpiar el input file
    input.value = '';
  }

}
