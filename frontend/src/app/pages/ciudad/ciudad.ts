import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs/operators';

import {
  CityDefinition,
  findCityBySlug,
  findSection,
  SECTION_ORDER,
  SectionKey,
  WEATHER_FEELS_LIKE_ICON,
  WEATHER_ICONS,
  WEATHER_PRECIPITATION_ICON,
  WeatherData,
} from '../../../models/cities.model';
import { WeatherService } from '../../services/weather-service';
import { Partes } from './partes/partes';
import { ParteEventos } from './partes/parte-eventos/parte-eventos';
import { ParteFanzone } from './partes/parte-fanzone/parte-fanzone';
import { ParteHangout } from './partes/parte-hangout/parte-hangout';
import { ParteRestaurantes } from './partes/parte-restaurantes/parte-restaurantes';
import { ParteTurismo } from './partes/parte-turismo/parte-turismo';

const SITE_ORIGIN = 'https://maslatino.com';

@Component({
  selector: 'app-ciudad',
  standalone: true,
  imports: [
    Partes,
    ParteEventos,
    ParteFanzone,
    ParteHangout,
    ParteRestaurantes,
    ParteTurismo,
  ],
  templateUrl: './ciudad.html',
  styleUrl: './ciudad.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ciudad {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly weatherService = inject(WeatherService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  readonly citySlug = toSignal(
    this.route.paramMap.pipe(
      map((params) => (params.get('ciudad') || '').toLowerCase().trim()),
    ),
    { initialValue: '' },
  );

  readonly city = computed<CityDefinition | undefined>(() =>
    findCityBySlug(this.citySlug()),
  );
  readonly cityName = computed(() => this.city()?.name ?? '');

  readonly weather = signal<WeatherData | null>(null);
  readonly weatherLoading = signal<boolean>(true);
  readonly weatherError = signal<string | null>(null);

  readonly weatherIcon = computed(() => {
    const data = this.weather();
    return data ? WEATHER_ICONS[data.condition] : WEATHER_ICONS['soleado'];
  });
  readonly feelsLikeIcon = WEATHER_FEELS_LIKE_ICON;
  readonly precipitationIcon = WEATHER_PRECIPITATION_ICON;

  readonly selectedSection = signal<SectionKey>('restaurantes');
  readonly carouselMode = signal<boolean>(false);
  readonly sectionOrder = SECTION_ORDER;
  readonly activeSectionColor = computed(() => findSection(this.selectedSection()).color);

  /** Fahrenheit por defecto: las once ciudades son de Estados Unidos. */
  readonly temperatureUnit = signal<'C' | 'F'>('F');
  readonly displayTemperature = computed(() =>
    this.convertTemperature(this.weather()?.temperature),
  );
  readonly displayFeelsLike = computed(() =>
    this.convertTemperature(this.weather()?.feelsLike),
  );

  constructor() {
    effect(() => {
      const slug = this.citySlug();
      if (!slug) return;

      // Un slug inexistente no debe dejar la página a medias ni pedir datos
      // de una ciudad que no existe: se vuelve al listado.
      if (!findCityBySlug(slug)) {
        void this.router.navigate(['/cities']);
        return;
      }

      this.applySeoTags();
      this.loadWeather(slug);
    });
  }

  colorFor(section: SectionKey): string {
    return findSection(section).color;
  }

  onSectionSelected(section: SectionKey): void {
    this.selectedSection.set(section);
    this.carouselMode.set(true);
  }

  closeCarousel(): void {
    this.carouselMode.set(false);
  }

  nextSection(): void {
    const index = SECTION_ORDER.indexOf(this.selectedSection());
    this.selectedSection.set(SECTION_ORDER[(index + 1) % SECTION_ORDER.length]);
  }

  prevSection(): void {
    const index = SECTION_ORDER.indexOf(this.selectedSection());
    const previous = (index - 1 + SECTION_ORDER.length) % SECTION_ORDER.length;
    this.selectedSection.set(SECTION_ORDER[previous]);
  }

  setUnit(unit: 'C' | 'F'): void {
    this.temperatureUnit.set(unit);
  }

  /** El backend siempre entrega Fahrenheit; el cambio de unidad no vuelve a llamar a la API. */
  private convertTemperature(fahrenheit: number | undefined): number | null {
    if (fahrenheit == null) return null;
    return this.temperatureUnit() === 'F'
      ? Math.round(fahrenheit)
      : Math.round(((fahrenheit - 32) * 5) / 9);
  }

  private applySeoTags(): void {
    const city = this.city();
    if (!city) return;

    const title = `Qué hacer en ${city.name} | Mas Latino`;
    const description =
      `Clima, eventos del Mundial 2026, restaurantes, turismo y vida nocturna en ` +
      `${city.name}. Guía de la ciudad para la comunidad latina.`;
    const canonical = `${SITE_ORIGIN}/cities/${city.slug}`;

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:image', content: `${SITE_ORIGIN}/${city.image}` });
    this.setCanonical(canonical);
  }

  private setCanonical(href: string): void {
    const head = this.document.head;
    if (!head) return;

    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private loadWeather(citySlug: string): void {
    this.weatherLoading.set(true);
    this.weatherError.set(null);

    this.weatherService.getWeather(citySlug).subscribe({
      next: (data) => {
        this.weather.set(data);
        this.weatherLoading.set(false);
      },
      error: () => {
        this.weatherError.set('No pudimos cargar el clima en este momento.');
        this.weatherLoading.set(false);
      },
    });
  }
}
