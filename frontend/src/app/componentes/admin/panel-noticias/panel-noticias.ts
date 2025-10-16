// src/app/admin/panel-noticias/panel-noticias.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ReactiveFormsModule,FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NoticiasService } from '../../../services/noticias-service';
import { VistaPrevia } from '../../admin/panel-noticias/vista-previa/vista-previa';
import { NgSelectModule } from '@ng-select/ng-select';
import { CategoriaService, CategoriaPayload } from '../../../services/categorias-service';

// Para convertir Markdown a HTML y sanitizarlo
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Component({
  selector: 'app-panel-noticias',
  standalone: true,
  imports: [
    ReactiveFormsModule, 
    CommonModule, 
    VistaPrevia,
    FormsModule,
    NgSelectModule
  ],
  templateUrl: './panel-noticias.html',
  styleUrls: ['./panel-noticias.css']
})
export class PanelNoticias implements OnInit {
  noticiaForm: FormGroup;
  categoriasDisponibles: CategoriaPayload[] = [];

  previewDataObj: any;
  blockOpenState: boolean[] = [];

  constructor(
    private fb: FormBuilder,
    private noticiasService: NoticiasService,
    private sanitizer: DomSanitizer,
    private categoriasService: CategoriaService
  ) {
  this.noticiaForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    summary: ['', Validators.maxLength(500)],
    categories: [[], Validators.required],
    location: this.fb.group({ country: [''], region: [''], city: [''] }),
    state: ['draft'],
    publishAt: [null],
    content: this.fb.array([])
  });

  }

  ngOnInit(): void {
      this.previewDataObj = this.buildPreviewData();
// Cada vez que cambie el form, reconstruimos
  this.noticiaForm.valueChanges.subscribe(() => {
    this.previewDataObj = this.buildPreviewData();
  });
  this.loadCategories();
    console.log('PanelNoticias inicializado');
  }

private buildPreviewData() {
  const raw = this.noticiaForm.value;
  return {
    ...raw,
    content: raw.content.map((block: any) => {
      const base = { ...block, style: { ...(block.style || {}) } };

      switch (block.type) {
        case 'text':
          return { 
            ...base, 
            html: marked.parse(block.text || '') 
          };

        case 'list':
          return { 
            ...base, 
            itemsHtml: block.items.map((item: string) => marked.parse(item)) 
          };

        case 'quote':
          const quoteHtml = marked.parse(`> ${block.quote || ''}`);
          return { 
            ...base, 
            html: quoteHtml, 
            style: { ...base.style, textAlign: 'center' } 
          };

        case 'image':
          const captionHtml = block.caption
            ? marked.parse(block.caption)
            : '';
          return {
            ...base,
            captionHtml
          };


        default:
          return base;
      }
    })
  };
}

  get content(): FormArray {
    return this.noticiaForm.get('content') as FormArray;
  }

  getListItems(blockIndex: number): FormArray {
    const blockGroup = this.content.at(blockIndex) as FormGroup;
    const itemsControl = blockGroup.get('items');
    return itemsControl instanceof FormArray ? itemsControl : this.fb.array([]);
  }
  getBlock(i: number): FormGroup {
    return this.content.at(i) as FormGroup;
  }
  private createBlockGroup(type: string): FormGroup {
    switch (type) {
      case 'text':
        return this.fb.group({
          type: ['text'],
          text: ['', Validators.required],
          tag: ['p'],
          style: this.fb.group({ fontSize: [''], fontWeight: [''], fontFamily: [''] })
        });
      case 'image':
        return this.fb.group({ type: ['image'], url: ['', Validators.required], alt: [''], caption: [''] });
      case 'list':
        return this.fb.group({ type: ['list'], ordered: [false], items: this.fb.array([this.fb.control('', Validators.required)]) });

      case 'quote':
        return this.fb.group({
          type: ['quote'],
          quote: ['', Validators.required],
          authorQuote: [''],
          // <-- Agregamos estilo al bloque de cita
          style: this.fb.group({
            fontFamily: ['Arial, sans-serif'],
            fontStyle:  ['italic'],
            textAlign:  ['center']
          })
        });
        //case 'quote':
        // en createBlockGroup(type==='quote')
        //return this.fb.group({ type: ['quote'], quote: ['', Validators.required], authorQuote: [''] });
      case 'link':
        return this.fb.group({ type: ['link'], href: ['', [Validators.required, Validators.pattern(/https?:\/\/.+/)]], textLink: ['', Validators.required] });
      default:
        return this.fb.group({ type: [type], data: [''] });
    }
  }

  addBlock(type: string) {
    const blockGroup = this.createBlockGroup(type);
    this.content.push(blockGroup);
    // Inicialmente cerrado
    this.blockOpenState.push(true);
  }
  removeBlock(i: number) {
    this.content.removeAt(i);
    this.blockOpenState.splice(i, 1);
  }

  toggleBlock(i: number) {
    this.blockOpenState[i] = !this.blockOpenState[i];
  }
  addListItem(blockIndex: number) {
    this.getListItems(blockIndex).push(this.fb.control('', Validators.required));
  }

  removeListItem(blockIndex: number, itemIndex: number) {
    const items = this.getListItems(blockIndex);
    if (items.length > 1) items.removeAt(itemIndex);
  }

  loadCategories(){
        this.categoriasService.obtenerCategorias().subscribe(categories => {
        this.categoriasDisponibles = categories;
      
        console.log("categorias",categories);
          });
    }

    
  onSubmit() {
    this.markAllTouched();
    if (this.noticiaForm.invalid) return;

    const data = this.prepareSubmitData();
    this.noticiasService.createNoticia(data).subscribe({
      next: res => {
        console.log('Noticia creada:', res);
        this.resetForm();
      },
      error: err => console.error('Error:', err)
    });
  }

  private markAllTouched() {
    this.noticiaForm.markAllAsTouched();
    this.content.controls.forEach((group, i) => {
      if (group.get('type')?.value === 'list') {
        this.getListItems(i).markAllAsTouched();
      } else {
        Object.values((group as FormGroup).controls).forEach(ctrl => ctrl.markAsTouched());
      }
    });
  }

  private resetForm() {
    this.noticiaForm.reset({ state: 'draft', publishAt: null });
    while (this.content.length) this.content.removeAt(0);
  }

  private prepareSubmitData() {
    const raw = this.noticiaForm.value;
    const categories: string[] = raw.categories;  // ya es un string[]
  
    const authorId = 'a94f23c8bd7e4ad1f6c30ae5';

    return { ...raw, categories, author: authorId };
  }

get previewData() {
  return this.buildPreviewData();
}

}
