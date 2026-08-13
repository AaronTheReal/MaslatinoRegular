import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CalendarPCService, CalendarItemPC } from '../../../../../services/calendario-servicePC';
import { CdnImagePipe } from '../../../../../pipes/cdn-image.pipe';
import { ImgFadeDirective } from '../../../../../shared/img-fade.directive';

@Component({
  selector: 'app-evento-card',
  imports: [CommonModule, RouterModule, DatePipe, CdnImagePipe, ImgFadeDirective],
  templateUrl: './evento-card.html',
  styleUrls: ['./evento-card.css'],
    standalone: true,

})
export class EventoCard {
  @Input() evento!: CalendarItemPC;

  /** El respaldo lo pone la plantilla: un SVG no debe pasar por el Image CDN. */
  get cover(): string {
    return this.evento?.image || this.evento?.gallery?.[0] || '';
  }

  get isPast(): boolean {
    const end = this.evento?.endAt ? new Date(this.evento.endAt).getTime() : new Date(this.evento.startAt).getTime();
    return end < Date.now();
  }

  get firstLink() {
    return (this.evento.links && this.evento.links.length) ? this.evento.links[0] : null;
  }
}