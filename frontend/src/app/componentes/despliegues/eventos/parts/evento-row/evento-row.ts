import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CalendarPCService, CalendarItemPC } from '../../../../../services/calendario-servicePC';

@Component({
  selector: 'app-evento-row',
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './evento-row.html',
  styleUrls: ['./evento-row.css'],
   standalone: true,

})
export class EventoRow {
  @Input() evento!: CalendarItemPC;
  get isPast(): boolean {
    const end = this.evento?.endAt ? new Date(this.evento.endAt).getTime() : new Date(this.evento.startAt).getTime();
    return end < Date.now();
  }
  get firstLink() { return (this.evento.links?.[0]) ?? null; }
}