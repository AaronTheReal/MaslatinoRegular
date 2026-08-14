import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Place, SectionDefinition } from '../../../../../models/cities.model';
import { CdnImagePipe } from '../../../../pipes/cdn-image.pipe';
import { ImgFadeDirective } from '../../../../shared/img-fade.directive';

/**
 * Ancho al que se pide cada foto. La rejilla es de 2/3/4 columnas, asi que la
 * tarjeta mas ancha ronda los 280 px; 600 cubre las pantallas de doble
 * densidad sin traerse la foto entera.
 */
const PLACE_PHOTO_WIDTH = 600;

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
  imports: [CommonModule, CdnImagePipe, ImgFadeDirective],
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

  /**
   * Foto de la tarjeta pedida al ancho al que se ve.
   *
   * El proxy de fotos acepta `?w=` y se lo pasa a Google como `maxWidthPx`,
   * pero nadie se lo enviaba: cada tarjeta descargaba la foto a 800 px de
   * ancho para pintarla en una caja de ~280. Estas URLs no pasan por el pipe
   * `cdnimg` porque el host del backend no esta en la allowlist
   * `remote_images` de netlify.toml, asi que el recorte tiene que pedirse en
   * origen.
   */
  photoUrl(place: Place): string {
    const url = place.photos?.[0]?.url ?? '';
    if (!url) return '';
    return `${url}${url.includes('?') ? '&' : '?'}w=${PLACE_PHOTO_WIDTH}`;
  }

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
