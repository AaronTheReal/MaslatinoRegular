import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NoticiasService } from '../../services/noticias-service';
import { Noticia } from '../../../models/noticia.model';

@Component({
  selector: 'app-noticias-recientes',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './noticias-recientes.html',
  styleUrls: ['./noticias-recientes.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoticiasRecientes {
  // Use inject() to avoid "used before initialization"
  private readonly noticiasService = inject(NoticiasService);

  // Now it's safe to create the observable as a class field
  readonly noticias$ = this.noticiasService.getNoticiasRecientes(3);

  trackById(index: number, noticia: Noticia): string {
    return noticia?._id ?? String(index);
  }
}
