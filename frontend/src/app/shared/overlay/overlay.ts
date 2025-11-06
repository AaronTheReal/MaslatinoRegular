import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

type SectionKey = 'quienes' | 'categorias' | 'podcast' | 'locales' | 'contacto' | 'privacy' | 'todo';

@Component({
  selector: 'app-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './overlay.html',
  styleUrls: ['./overlay.css']
})
export class Overlay implements OnInit, OnChanges, OnDestroy {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() selected = new EventEmitter<{ title: string; route?: string }>();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('panel') panelRef!: ElementRef<HTMLDivElement>;

  query = '';
  activeSection: SectionKey = 'todo';
  highlightedIndex = -1; // for keyboard navigation
  showResults = false;

  // Quick links (your navbar sections)
  quickLinks = [
    { key: 'quienes',  label: '¿Quiénes Somos?', icon: '👥', route: '/quienes-somos' },
    { key: 'podcast',  label: 'Podcast',         icon: '🎧', route: '/podcast' },
    { key: 'locales',  label: 'Noticias Locales',icon: '📰', route: '/noticias-locales' },
    { key: 'contacto', label: 'Contacto',        icon: '✉️', route: '/contacto' },
    { key: 'privacy',  label: 'Privacy Policy',  icon: '🔐', route: '/privacy-policy' },
  ] as const;

  // Mock data (replace later with service)
  private mockResults = [
    { title: 'Nuestra misión y valores', section: 'quienes', route: '/quienes-somos#mision' },
    { title: 'Equipo editorial', section: 'quienes', route: '/quienes-somos#equipo' },
    { title: 'Tecnología y Cultura', section: 'categorias', route: '/categorias/tecnologia' },
    { title: 'Deportes y Salud', section: 'categorias', route: '/categorias/deportes' },
    { title: 'Podcast: Voces de la Comunidad', section: 'podcast', route: '/podcast/voces' },
    { title: 'Última hora Torreón', section: 'locales', route: '/noticias-locales/ultima-hora' },
    { title: 'Contacto Prensa', section: 'contacto', route: '/contacto?tipo=prensa' },
    { title: 'Cómo tratamos tus datos', section: 'privacy', route: '/privacy-policy#datos' },
  ] as const;

  filtered: Array<{ title: string; section: string; route?: string }> = [];
  recent = ['elecciones', 'mux streaming', 'angular ssr', 'mas latino'].slice(0, 4);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (this.open) this.afterOpen();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue) {
      this.afterOpen();
    } else if (changes['open'] && !changes['open'].currentValue) {
      if (isPlatformBrowser(this.platformId)) {
        document.body.classList.remove('no-scroll');
      }
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.remove('no-scroll');
    }
  }

  private resetState() {
    this.query = '';
    this.activeSection = 'todo';
    this.highlightedIndex = -1;
    this.showResults = false;
    this.applyFilter();
  }

  // Keyboard handlers (ESC, arrows, enter)
  @HostListener('window:keydown', ['$event'])
  onKey(ev: KeyboardEvent) {
    if (!this.open) return;
    if (ev.key === 'Escape') {
      ev.preventDefault();
      this.close();
    }
    if (this.showResults && this.filtered.length) {
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filtered.length - 1);
        this.scrollResultIntoView();
      }
      if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
        this.scrollResultIntoView();
      }
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const item = this.filtered[this.highlightedIndex] ?? this.filtered[0];
        if (item) this.pick(item);
      }
    }
  }

  onQueryChange() {
    this.showResults = this.query.trim().length > 0;
    this.highlightedIndex = -1;
    this.applyFilter();
  }

  setSection(key: SectionKey) {
    this.activeSection = key;
    this.highlightedIndex = -1;
    this.applyFilter();
    // Keep focus on input
    this.searchInput?.nativeElement?.focus();
  }

  private applyFilter() {
    const q = this.query.toLowerCase().trim();
    const bySection = (r: any) => this.activeSection === 'todo' ? true : r.section === this.activeSection;
    const byQuery = (r: any) => !q ? true : r.title.toLowerCase().includes(q);
    this.filtered = this.mockResults.filter(r => bySection(r) && byQuery(r));
  }

  pick(item: { title: string; route?: string }) {
    this.selected.emit(item);
    // Navigate via routerLink in template; here just close for now
    this.close();
  }

  useRecent(r: string) {
    this.query = r;
    this.onQueryChange();
    this.showResults = true;
  }

  close() {
    this.open = false;
    this.closed.emit();
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.remove('no-scroll');
    }
  }

  private scrollResultIntoView() {
    if (isPlatformBrowser(this.platformId)) {
      const id = `result-${this.highlightedIndex}`;
      const el = document.getElementById(id);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }

  private justOpened = false;

  private afterOpen() {
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.add('no-scroll');
    }
    this.justOpened = true;
    setTimeout(() => { this.justOpened = false; }, 0);
    setTimeout(() => this.searchInput?.nativeElement?.focus(), 0);
    this.resetState();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    if (!this.open || this.justOpened) return;
    const panel = this.panelRef?.nativeElement;
    if (panel && !panel.contains(ev.target as Node)) this.close();
  }
}