import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Place, SectionDefinition } from '../../../../../models/cities.model';

/**
 * Rejilla de lugares con su hero de sección.
 *
 * Turismo, Hang out, Fan Zone y Restaurantes tenían en el origen cuatro
 * componentes con la misma plantilla y el mismo CSS, cambiando solo el color,
 * el icono y los textos. Aquí la presentación vive una vez y cada sección
 * aporta únicamente su origen de datos.
 */
@Component({
  selector: 'app-place-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './place-list.html',
  styleUrl: './place-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceList {
  readonly section = input.required<SectionDefinition>();
  readonly cityName = input<string>('');
  readonly places = input<Place[]>([]);
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);

  /** Google devuelve `PRICE_LEVEL_MODERATE`; al lector solo le sirve la parte final. */
  priceLabel(priceLevel: string | undefined): string {
    if (!priceLevel) return '';
    return priceLevel
      .replace('PRICE_LEVEL_', '')
      .toLowerCase()
      .replace(/_/g, ' ');
  }

  trackByPlaceId(_index: number, place: Place): string {
    return place.placeId;
  }
}
