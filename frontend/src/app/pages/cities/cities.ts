import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CityDefinition, VISIBLE_CITIES } from '../../../models/cities.model';
import { CdnImagePipe } from '../../pipes/cdn-image.pipe';

@Component({
  selector: 'app-cities',
  standalone: true,
  imports: [RouterLink, CdnImagePipe],
  templateUrl: './cities.html',
  styleUrl: './cities.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cities {
  /**
   * Las ciudades salen de una constante compartida. En el módulo de origen
   * estaban repetidas en once bloques `<a>` idénticos dentro del HTML, además
   * de en otros tres sitios del código.
   *
   * Hoy solo se listan Boston, Miami y Nueva York (`VISIBLE_CITIES`); las otras
   * ocho siguen definidas y con ruta propia, pero ocultas de la portada.
   */
  readonly cities = VISIBLE_CITIES;

  trackBySlug(_index: number, city: CityDefinition): string {
    return city.slug;
  }
}
