import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CalendarPCService, CalendarItemPC } from './../../../../services/calendario-servicePC';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import {
  CategoriaService,
  CategoriaPayload,
} from '../../../../services/categorias-service';

@Component({
  selector: 'app-panel-calendario-pc',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatSelectModule,RouterModule],
  templateUrl: './panel-calendario-pc.html',
  styleUrls: ['./panel-calendario-pc.css']
})
export class PanelCalendarioPc implements OnInit {
  selectedTab = 'agregar';
  form!: FormGroup;
  locationGroup!: FormGroup;
  linkGroup!: FormGroup;
  categorias: CategoriaPayload[] = [];
  items: CalendarItemPC[] = [];
  editing = false;
  loadingSubmit = false;
  loadingList = false;

  tableStatus = '';
  tableKind = '';
  tableSort = 'startAt:asc';
  tableLimit = 10;
  tablePage = 1;
  meta: any = null;

  constructor(private fb: FormBuilder, private calendarService: CalendarPCService,private categoriaService: CategoriaService) {}

  ngOnInit(): void {
    this.loadCategorias();
    this.locationGroup = this.fb.group({
      name: [''],
      address: [''],
      lat: [null],
      lng: [null]
    });

    this.linkGroup = this.fb.group({
      label: [''],
      url: [''],
      external: [false]
    });

    this.form = this.fb.group({
      kind: ['evento', Validators.required],
      status: ['draft'],
      featured: [false],
      title: ['', Validators.required],
      slug: [''],
      excerpt: [''],
      body: [''],
      image: [''],
      allDay: [false],
      timezone: [''],
      startAt: ['', Validators.required],
      endAt: [''],
      location: this.locationGroup,
      links: this.linkGroup,
      categories: [[]],
      tags: ['']
    });

    this.loadItems();
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    if (tab === 'administrar') {
      this.loadItems();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loadingSubmit = true;
    const payload = this.form.value as CalendarItemPC;
    if (this.editing && payload._id) {
      this.calendarService.actualizarItem(payload._id, payload).subscribe(() => {
        this.resetForm();
        this.loadItems();
      });
    } else {
      this.calendarService.crearItem(payload).subscribe(() => {
        this.resetForm();
        this.loadItems();
      });
    }
  }

  editarItem(item: CalendarItemPC): void {
    this.editing = true;
    this.selectedTab = 'agregar';
    this.form.patchValue(item);
  }

  eliminarItem(id: string): void {
    this.calendarService.eliminarItem(id).subscribe(() => {
      this.loadItems();
    });
  }
  loadCategorias() {
    this.categoriaService.obtenerCategorias().subscribe({
      next: (res) => (this.categorias = res),
      error: () => alert('Error al cargar categorías'),
    });
  }

  toggleFeatured(item: CalendarItemPC): void {
    if (!item._id) return;
    const update = { ...item, featured: !item.featured };
    this.calendarService.actualizarItem(item._id, update).subscribe(() => this.loadItems());
  }

  publishItem(id: string): void {
    this.calendarService.actualizarItem(id, { status: 'published' }).subscribe(() => this.loadItems());
  }

  archiveItem(id: string): void {
    this.calendarService.actualizarItem(id, { status: 'archived' }).subscribe(() => this.loadItems());
  }

  onFilter(): void {
    this.loadItems();
  }

  onChangeSort(val: string): void {
    this.tableSort = val;
    this.loadItems();
  }

  onChangeLimit(val: number): void {
    this.tableLimit = val;
    this.loadItems();
  }

  onChangePage(val: number): void {
    this.tablePage = val;
    this.loadItems();
  }

  statsData() {
    if (!this.items.length) return null;
    const now = new Date();
    return {
      total: this.items.length,
      published: this.items.filter(i => i.status === 'published').length,
      upcoming: this.items.filter(i => new Date(i.startAt) > now).length,
      past: this.items.filter(i => new Date(i.startAt) <= now).length,
    };
  }

  resetForm(): void {
    this.form.reset({
      kind: 'evento',
      status: 'draft',
      featured: false,
      title: '',
      slug: '',
      excerpt: '',
      body: '',
      image: '',
      allDay: false,
      timezone: '',
      startAt: '',
      endAt: '',
      categories: [],
      tags: ''
    });
    this.locationGroup.reset();
    this.linkGroup.reset();
    this.editing = false;
    this.loadingSubmit = false;
  }

  private loadItems(): void {
    this.loadingList = true;
    this.calendarService.obtenerItems().subscribe(data => {
      this.items = data;
      this.loadingList = false;
    });
  }
}
