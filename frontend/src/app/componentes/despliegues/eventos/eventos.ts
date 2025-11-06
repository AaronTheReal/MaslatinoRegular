import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarioService, CalendarItem, PaginatedResponse } from '../../../services/calendario-service';
import { RouterModule } from '@angular/router';

type Filtro = 'Todo' | 'Esta semana' | 'Próxima semana';

interface EventVM {
  id: string;
  slug?: string;
  title: string;
  description: string;
  imageUrl: string;
  monthKey: string;   // p.ej., "SEPTIEMBRE 2025"
  dateLabel: string;  // p.ej., "19 de septiembre de 2025"
  timeLabel: string;  // p.ej., "12:30 a. m."
  timezone: string;
  rawDate: Date;      // para filtros por semana
}

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './eventos.html',
  styleUrls: ['./eventos.css'],
})
export class Eventos implements OnInit {
  // ----- UI State -----
  activeFilter = signal<Filtro>('Todo');
  expandedMonths = signal<Set<string>>(new Set<string>());
  loading = signal<boolean>(true);
  errorMsg = signal<string | null>(null);

  // ----- Filtros disponibles tipados -----
  readonly filters: Filtro[] = ['Todo', 'Esta semana', 'Próxima semana'];

  // ----- Data -----
  events = signal<EventVM[]>([]);
  months = computed(() => {
    const map = new Map<string, EventVM[]>();
    for (const ev of this.events()) {
      if (!map.has(ev.monthKey)) map.set(ev.monthKey, []);
      map.get(ev.monthKey)!.push(ev);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1][0].rawDate.getTime() - b[1][0].rawDate.getTime())
      .map(([k]) => k);
  });

  constructor(private calSrv: CalendarioService) {}

  ngOnInit(): void {
    this.fetch();
  }

  // ====== Networking ======
  private fetch(): void {
    this.loading.set(true);
    this.errorMsg.set(null);

    this.calSrv.list({
      kind: 'evento',
      status: 'published',
      sort: 'startAt:asc',
      limit: 200,
    }).subscribe({
      next: (res: PaginatedResponse<CalendarItem>) => {
        const items = (res?.data ?? []);
        const vms = items
          .filter(it => !!it.startAt)
          .map(it => this.toVM(it))
          .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

        this.events.set(vms);

        // Expandir mes actual y el siguiente por defecto
        const today = new Date();
        const currentKey = this.monthKeyFromDate(today);
        const nextKey = this.monthKeyFromDate(this.addDays(this.startOfMonth(today), 32));
        const expanded = new Set<string>();
        if (vms.some(e => e.monthKey === currentKey)) expanded.add(currentKey);
        if (vms.some(e => e.monthKey === nextKey)) expanded.add(nextKey);
        if (!expanded.size && this.months().length) expanded.add(this.months()[0]);
        this.expandedMonths.set(expanded);

        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set('No se pudieron cargar los eventos.');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  // ====== Mapping / Formatting ======
  private toVM(it: CalendarItem): EventVM {
    const tz = it.timezone || 'America/Monterrey';
    const d = new Date(it.startAt);
    const monthKey = this.monthKeyFromDate(d);
    const dateLabel = this.formatDateMX(d, tz);
    const timeLabel = it.allDay ? 'Todo el día' : this.formatTimeMX(d, tz);

    return {
      id: it._id || (globalThis.crypto?.randomUUID?.() ?? String(Math.random())),
      slug: it.slug,
      title: it.title,
      description: it.excerpt || it.title,
      imageUrl: it.image || 'https://placehold.co/800x500?text=Evento',
      monthKey,
      dateLabel,
      timeLabel,
      timezone: tz,
      rawDate: d,
    };
  }

  private monthKeyFromDate(d: Date): string {
    const m = d.toLocaleString('es-MX', { month: 'long' });
    return `${m.toUpperCase()} ${d.getFullYear()}`;
  }

  private formatDateMX(d: Date, timeZone: string): string {
    const day = new Intl.DateTimeFormat('es-MX', { day: '2-digit', timeZone }).format(d);
    const month = new Intl.DateTimeFormat('es-MX', { month: 'long', timeZone }).format(d);
    const year = new Intl.DateTimeFormat('es-MX', { year: 'numeric', timeZone }).format(d);
    return `${Number(day)} de ${month} de ${year}`;
  }

  private formatTimeMX(d: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    }).format(d);
  }

  // ====== Filtros por semana ======
  setActiveFilter(filter: Filtro): void {
    this.activeFilter.set(filter);
  }

  private startOfWeek(d: Date): Date {
    // Semana inicia lunes
    const dd = new Date(d);
    const day = (dd.getDay() + 6) % 7; // 0 = lunes
    dd.setHours(0, 0, 0, 0);
    dd.setDate(dd.getDate() - day);
    return dd;
  }

  private endOfWeek(d: Date): Date {
    const s = this.startOfWeek(d);
    const e = new Date(s);
    e.setDate(s.getDate() + 7); // exclusivo
    return e;
  }

  private addDays(d: Date, days: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + days);
    return r;
  }

  private startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  private inRange(date: Date, from: Date, toExclusive: Date): boolean {
    const t = date.getTime();
    return t >= from.getTime() && t < toExclusive.getTime();
  }

  private passFilter(ev: EventVM): boolean {
    const f = this.activeFilter();
    if (f === 'Todo') return true;

    const now = new Date();
    const thisFrom = this.startOfWeek(now);
    const thisTo = this.endOfWeek(now);

    if (f === 'Esta semana') {
      return this.inRange(ev.rawDate, thisFrom, thisTo);
    }
    // Próxima semana
    const nextWeekFrom = this.addDays(thisFrom, 7);
    const nextWeekTo = this.addDays(thisFrom, 14);
    return this.inRange(ev.rawDate, nextWeekFrom, nextWeekTo);
  }

  // ====== Template helpers ======
  toggleMonth(monthKey: string): void {
    const copy = new Set(this.expandedMonths());
    if (copy.has(monthKey)) copy.delete(monthKey);
    else copy.add(monthKey);
    this.expandedMonths.set(copy);
  }

  isMonthExpanded(monthKey: string): boolean {
    return this.expandedMonths().has(monthKey);
  }

  getEventsByMonth(monthKey: string): EventVM[] {
    return this.events().filter(e => e.monthKey === monthKey && this.passFilter(e));
  }

  trackById(_: number, ev: EventVM) {
    return ev.id;
  }
}
