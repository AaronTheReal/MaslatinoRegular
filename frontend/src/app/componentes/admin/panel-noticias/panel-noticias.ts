import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NoticiasService } from '../../../services/noticias-service';
import { VistaPrevia } from '../../admin/panel-noticias/vista-previa/vista-previa';
import { NgSelectModule } from '@ng-select/ng-select';
import { CategoriaService, CategoriaPayload } from '../../../services/categorias-service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Component({
  selector: 'app-panel-noticias',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, VistaPrevia, FormsModule, NgSelectModule],
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
      title: ['', [Validators.required, Validators.maxLength(60), Validators.minLength(50)]],
      slug: ['', Validators.required],
      summary: ['', [Validators.maxLength(160), Validators.minLength(150)]],
      tags: this.fb.array([]),
      categories: [[], Validators.required],
      location: this.fb.group({
        country: [''],
        region: [''],
        city: ['']
      }),
      meta: this.fb.group({
        description: ['', [Validators.required, Validators.maxLength(160), Validators.minLength(150)]],
        image: ['', [Validators.required, Validators.pattern(/https?:\/\/.+/)]]
      }),
      state: ['draft'],
      publishAt: [null],
      content: this.fb.array([], this.maxOneH1Validator())
    });

    this.noticiaForm.get('title')?.valueChanges.subscribe(title => {
      if (title) {
        const slug = this.generateSlug(title);
        this.noticiaForm.get('slug')?.setValue(slug);
      }
    });
  }

  ngOnInit(): void {
    this.previewDataObj = this.buildPreviewData();
    this.noticiaForm.valueChanges.subscribe(() => {
      this.previewDataObj = this.buildPreviewData();
    });
    this.loadCategories();
    console.log('PanelNoticias inicializado');
  }

  private generateSlug(title: string): string {
    return title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
  }

  private maxOneH1Validator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const content = control as FormArray;
      const h1Count = content.controls.filter(group => group.get('tag')?.value === 'h1').length;
      return h1Count > 1 ? { multipleH1: true } : null;
    };
  }

  private buildPreviewData() {
    const raw = this.noticiaForm.value;
    return {
      ...raw,
      content: raw.content.map((block: any) => {
        const base = { ...block, style: { ...(block.style || {}) } };
        switch (block.type) {
          case 'text':
            return { ...base, html: marked.parse(block.text || '') };
          case 'list':
            return { ...base, itemsHtml: block.items.map((item: string) => marked.parse(item)) };
          case 'quote':
            const quoteHtml = marked.parse(`> ${block.quote || ''}`);
            return { ...base, html: quoteHtml, style: { ...base.style, textAlign: 'center' } };
          case 'image':
            const captionHtml = block.caption ? marked.parse(block.caption) : '';
            return { ...base, captionHtml };
          default:
            return base;
        }
      }),
      meta: {
        description: raw.meta.description || '',
        image: raw.meta.image || ''
      }
    };
  }

  get content(): FormArray {
    return this.noticiaForm.get('content') as FormArray;
  }

  get tags(): FormArray {
    return this.noticiaForm.get('tags') as FormArray;
  }

  addTag() {
    this.tags.push(this.fb.control('', Validators.required));
  }

  removeTag(index: number) {
    this.tags.removeAt(index);
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
          style: this.fb.group({
            fontSize: [''],
            fontWeight: [''],
            fontFamily: ['']
          })
        });
      case 'image':
        return this.fb.group({
          type: ['image'],
          url: ['', Validators.required],
          alt: ['', Validators.required],
          caption: ['']
        });
      case 'list':
        return this.fb.group({
          type: ['list'],
          ordered: [false],
          items: this.fb.array([this.fb.control('', Validators.required)])
        });
      case 'quote':
        return this.fb.group({
          type: ['quote'],
          quote: ['', Validators.required],
          authorQuote: [''],
          style: this.fb.group({
            fontFamily: ['Arial, sans-serif'],
            fontStyle: ['italic'],
            textAlign: ['center']
          })
        });
      case 'link':
        return this.fb.group({
          type: ['link'],
          href: ['', [Validators.required, Validators.pattern(/https?:\/\/.+/) ]],
          textLink: ['', Validators.required]
        });
      default:
        return this.fb.group({ type: [type], data: [''] });
    }
  }

  addBlock(type: string) {
    const blockGroup = this.createBlockGroup(type);
    this.content.push(blockGroup);
    this.blockOpenState.push(true);
    this.content.updateValueAndValidity();
  }

  removeBlock(i: number) {
    this.content.removeAt(i);
    this.blockOpenState.splice(i, 1);
    this.content.updateValueAndValidity();
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

  loadCategories() {
    this.categoriasService.obtenerCategorias().subscribe(categories => {
      this.categoriasDisponibles = categories;
      console.log("categorias", categories);
    });
  }

  onSubmit() {
    this.markAllTouched();
    if (this.noticiaForm.invalid) {
      console.error('Form is invalid:', this.noticiaForm.errors);
      console.error('Form value:', this.noticiaForm.value);
      alert('Por favor, completa todos los campos requeridos, incluyendo meta descripción e imagen destacada.');
      return;
    }
    const data = this.prepareSubmitData();
    this.noticiasService.createNoticia(data).subscribe({
      next: res => {
        console.log('Noticia creada:', res);
        this.resetForm();
        alert('Noticia creada exitosamente.');
      },
      error: err => {
        console.error('Error creating noticia:', err);
        alert('Error al crear la noticia: ' + err.message);
      }
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
    this.tags.markAllAsTouched();
  }

  private resetForm() {
    this.noticiaForm.reset({ state: 'draft', publishAt: null });
    while (this.content.length) this.content.removeAt(0);
    while (this.tags.length) this.tags.removeAt(0);
  }

  private prepareSubmitData() {
    const raw = this.noticiaForm.value;
    const categories: string[] = raw.categories;
    const authorId = 'a94f23c8bd7e4ad1f6c30ae5';
    const submitData = {
      ...raw,
      categories,
      author: authorId,
      meta: {
        description: raw.meta.description || '',
        image: raw.meta.image || ''
      }
    };
    console.log('Submit Data:', JSON.stringify(submitData, null, 2));
    return submitData;
  }

  get previewData() {
    return this.buildPreviewData();
  }
}