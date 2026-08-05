import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CITIES, CityDefinition } from '../../../models/cities.model';

@Component({
  selector: 'app-cities',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cities.html',
  styleUrl: './cities.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cities {
  /**
   * Las 11 ciudades salen de una constante compartida. En el módulo de origen
   * estaban repetidas en once bloques `<a>` idénticos dentro del HTML, además
   * de en otros tres sitios del código.
   */
  readonly cities = CITIES;

  trackBySlug(_index: number, city: CityDefinition): string {
    return city.slug;
  }
}
