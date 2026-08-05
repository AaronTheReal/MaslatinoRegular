import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { SECTIONS, SectionKey } from '../../../../models/cities.model';
import { CdnImagePipe } from '../../../pipes/cdn-image.pipe';

/** Rejilla de tarjetas para elegir sección. */
@Component({
  selector: 'app-partes',
  standalone: true,
  imports: [CdnImagePipe],
  templateUrl: './partes.html',
  styleUrl: './partes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Partes {
  readonly sections = SECTIONS;

  readonly selectedSection = input<SectionKey>('restaurantes');
  readonly sectionSelected = output<SectionKey>();
}
