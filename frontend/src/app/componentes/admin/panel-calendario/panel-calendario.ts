import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';

import {
  CalendarioService,
  CalendarItem,
  CalendarStatus,
  CalendarKind,
  PaginatedResponse,
} from './../../../services/calendario-service';

import {
  CategoriaService,
  CategoriaPayload,
} from '../../../services/categorias-service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core'; // necesario para <mat-option>
import {PanelCalendarioPc} from '../../admin/panel-calendario/panel-calendario-pc/panel-calendario-pc'
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-panel-calendario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule,MatFormFieldModule,MatSelectModule,MatOptionModule,PanelCalendarioPc,RouterModule],
  templateUrl: './panel-calendario.html',
  styleUrls: ['./panel-calendario.css'],
})
export class PanelCalendario implements OnInit {
  
  selectedTab: 'agregar' | 'administrar' | 'stats' = 'agregar';

  form!: FormGroup;
  editing = false;
  calendarIdEditing: string | null = null;

  categorias: CategoriaPayload[] = [];
  items: CalendarItem[] = [];
  meta: { total: number; page: number; limit: number; pages: number } | null = null;

  // Filtros/estado de tabla
  tablePage = 1;
  tableLimit = 10;
  tableSort = 'startAt:asc';
  tableStatus: CalendarStatus | '' = '';
  tableKind: CalendarKind | '' = '';

  // stats
  statsData = signal<{ total: number; published: number; upcoming: number; past: number } | null>(null);

  // Helpers UI
  loadingList = false;
  loadingSubmit = false;

  constructor(
    private fb: FormBuilder,
    private calendarioService: CalendarioService,
    private categoriaService: CategoriaService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadCategorias();
    this.loadItems();
    this.loadStats();

    // Autogenerar slug cuando cambia el título (solo si no estamos editando)
    this.form.get('title')?.valueChanges.subscribe((value: string) => {
      if (!this.editing) {
        const slug = this.generarSlug(value || '');
        this.form.get('slug')?.setValue(slug, { emitEvent: false });
      }
    });
  }

  private buildForm() {
    this.form = this.fb.group({
      kind: ['evento', Validators.required],
      title: ['', Validators.required],
      slug: ['', Validators.required],

      excerpt: [''],
      body: [''],
      image: [''],

      startAt: ['', Validators.required], // datetime-local
      endAt: [''],
      allDay: [false],
      timezone: ['America/Monterrey', Validators.required],

      location: this.fb.group({
        name: [''],
        address: [''],
        lat: [null],
        lng: [null],
      }),

      link: this.fb.group({
        label: [''],
        url: [''],
        external: [true],
      }),

      categories: [[] as string[]], // Ids
      tags: [''], // coma-separado

      status: ['draft', Validators.required],
      featured: [false],
    });
  }

  selectTab(tab: 'agregar' | 'administrar' | 'stats') {
    this.selectedTab = tab;
    if (tab === 'administrar') {
      this.loadItems();
    } else if (tab === 'stats') {
      this.loadStats();
    }
    if (tab === 'agregar' && !this.editing) {
      this.resetForm();
    }
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

  // -----------------------
  // CRUD
  // -----------------------

  onSubmit() {
    if (this.form.invalid) return;

    this.loadingSubmit = true;

    const payload = this.preparePayload();

    if (this.editing && this.calendarIdEditing) {
      this.calendarioService.update(this.calendarIdEditing, payload).subscribe({
        next: (res) => {
          alert('✅ Evento/Anuncio actualizado');
          this.loadingSubmit = false;
          this.resetForm();
          this.loadItemsIfAdminTab();
        },
        error: (err) => {
          console.error(err);
          alert(err.error?.message || '❌ Error al actualizar');
          this.loadingSubmit = false;
        },
      });
    } else {
      this.calendarioService.createItem(payload).subscribe({
        next: (res) => {
          alert('✅ Evento/Anuncio creado');
          this.loadingSubmit = false;
          this.resetForm();
          this.loadItemsIfAdminTab();
        },
        error: (err) => {
          console.error(err);
          alert(err.error?.message || '❌ Error al crear');
          this.loadingSubmit = false;
        },
      });
    }
  }

  editarItem(item: CalendarItem) {
    this.selectedTab = 'agregar';
    this.editing = true;
    this.calendarIdEditing = item._id || null;

    // Convertir ISO -> datetime-local (yyyy-MM-ddTHH:mm)
    const startLocal = this.isoToLocal(item.startAt);
    const endLocal = item.endAt ? this.isoToLocal(item.endAt) : '';

    this.form.patchValue({
      ...item,
      startAt: startLocal,
      endAt: endLocal,
      tags: (item.tags || []).join(', '),
      categories: (item.categories || []) as any, // si ya vienen como ids
    });
  }

  eliminarItem(id: string) {
    if (!confirm('¿Seguro que quieres eliminar este elemento del calendario?')) return;
    this.calendarioService.delete(id).subscribe({
      next: () => {
        alert('✅ Eliminado correctamente');
        this.loadItems();
      },
      error: (err) => {
        console.error(err);
        alert('�_SECURITY_ERROR❌ Error al eliminar');
      },
    });
  }

  publishItem(id: string) {
    this.calendarioService.publish(id).subscribe({
      next: () => {
        alert('✅ Publicado');
        this.loadItems();
      },
      error: (err) => {
        console.error(err);
        alert('❌ Error al publicar');
      },
    });
  }

  archiveItem(id: string) {
    this.calendarioService.archive(id).subscribe({
      next: () => {
        alert('✅ Archivado');
        this.loadItems();
      },
      error: (err) => {
        console.error(err);
        alert('❌ Error al archivar');
      },
    });
  }

  toggleFeatured(item: CalendarItem) {
    const newVal = !item.featured;
    if (!item._id) return;
    this.calendarioService.toggleFeatured(item._id, newVal).subscribe({
      next: (res) => {
        item.featured = res.data.featured;
      },
      error: (err) => {
        console.error(err);
        alert('❌ Error al cambiar destacado');
      },
    });
  }

  // -----------------------
  // Loaders
  // -----------------------

  loadCategorias() {
    this.categoriaService.obtenerCategorias().subscribe({
      next: (res) => (this.categorias = res),
      error: () => alert('Error al cargar categorías'),
    });
  }

  loadItems() {
    this.loadingList = true;
    this.calendarioService
      .list({
        page: this.tablePage,
        limit: this.tableLimit,
        sort: this.tableSort,
        status: this.tableStatus || undefined,
        kind: this.tableKind || undefined,
      })
      .subscribe({
        next: (res: PaginatedResponse<CalendarItem>) => {
          this.items = res.data;
          this.meta = res.meta;
          this.loadingList = false;
        },
        error: (err) => {
          console.error(err);
          alert('Error al cargar calendario');
          this.loadingList = false;
        },
      });
  }

  loadStats() {
    this.calendarioService.stats().subscribe({
      next: (res) => this.statsData.set(res.data),
      error: (err) => console.error(err),
    });
  }

  // -----------------------
  // Helpers
  // -----------------------

  resetForm() {
    this.form.reset({
      kind: 'evento',
      status: 'draft',
      timezone: 'America/Monterrey',
      allDay: false,
      link: { external: true },
      categories: [],
      featured: false,
    });
    this.editing = false;
    this.calendarIdEditing = null;
  }

  loadItemsIfAdminTab() {
    if (this.selectedTab === 'administrar') {
      this.loadItems();
    }
  }

  // Combinar payload final (tags CSV -> array, fechas a ISO)
  private preparePayload(): Partial<CalendarItem> {
    const raw = this.form.value;

    const startAtISO = raw.startAt ? new Date(raw.startAt).toISOString() : undefined;
    const endAtISO = raw.endAt ? new Date(raw.endAt).toISOString() : undefined;

    const tagsArr = (raw.tags || '')
      .split(',')
      .map((t: string) => t.trim())
      .filter((t: string) => !!t);

    return {
      ...raw,
      startAt: startAtISO,
      endAt: endAtISO,
      tags: tagsArr,
    };
  }

  private isoToLocal(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
  }

  // UI handlers para tabla
  onChangePage(page: number) {
    if (!this.meta) return;
    if (page < 1 || page > this.meta.pages) return;
    this.tablePage = page;
    this.loadItems();
  }

  onChangeLimit(limit: number) {
    this.tableLimit = limit;
    this.tablePage = 1;
    this.loadItems();
  }

  onChangeSort(sort: string) {
    this.tableSort = sort;
    this.loadItems();
  }

  onFilter() {
    this.tablePage = 1;
    this.loadItems();
  }

  // Getter para el grupo 'location'
  get locationGroup(): FormGroup {
    return this.form.get('location') as FormGroup;
  }

  // Getter para el grupo 'link'
  get linkGroup(): FormGroup {
    return this.form.get('link') as FormGroup;
  }
}