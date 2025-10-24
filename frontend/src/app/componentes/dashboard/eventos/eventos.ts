import { Component, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
import { CalendarPCService, CalendarItemPC } from './../../../services/calendario-servicePC';
import { CategoriaService, CategoriaPayload } from '../../../services/categorias-service';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-eventos',
  imports: [CommonModule,RouterModule],
  templateUrl: './eventos.html',
  styleUrl: './eventos.css',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Eventos implements AfterViewInit, OnInit {
  categorias: CategoriaPayload[] = [];
  selectedCat = 'Todo';
  items: CalendarItemPC[] = [];
  loadingList = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private calendarService: CalendarPCService,
    private categoriaService: CategoriaService
  ) {}

  ngOnInit(): void {
    this.loadCategorias();
    this.loadItems();
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      new Swiper('.ultimas-noticias-swiper', {
        modules: [Navigation, Pagination], // Pass modules here
        slidesPerView: 1,
        centeredSlides: true,
        spaceBetween: 24,
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
        loop: true,
      });
    }
  }

  loadCategorias() {
    this.categoriaService.obtenerCategorias().subscribe({
      next: (res) => (this.categorias = res),
      error: () => alert('Error al cargar categorías'),
    });
  }

  loadItems(): void {
    this.loadingList = true;
    this.calendarService.obtenerItems().subscribe({
      next: (data) => {
        this.items = data;
        this.loadingList = false;
        console.log('items', this.items);
      },
      error: () => {
        this.loadingList = false;
        alert('Error al cargar items');
      },
    });
  }
}