import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { SECTIONS, SectionKey } from '../../../../models/cities.model';

/** Rejilla de tarjetas para elegir sección. */
@Component({
  selector: 'app-partes',
  standalone: true,
  templateUrl: './partes.html',
  styleUrl: './partes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Partes {
  readonly sections = SECTIONS;

  readonly selectedSection = input<SectionKey>('restaurantes');
  readonly sectionSelected = output<SectionKey>();
}
