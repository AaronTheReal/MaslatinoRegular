import { Component, inject, signal, effect, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { CommonModule, NgOptimizedImage } from '@angular/common';

import { RestaurantesParte } from './partes/restaurantes-parte/restaurantes-parte';
import { Partes, SectionKey } from './partes/partes';
import { ParteEventos } from './partes/parte-eventos/parte-eventos';
import { ParteHangout } from './partes/parte-hangout/parte-hangout';
import { ParteFanzone } from './partes/parte-fanzone/parte-fanzone';
import { ParteTurismo } from './partes/parte-turismo/parte-turismo';
import {
  WeatherService,
  WeatherData,
  WEATHER_ICONS,
  WEATHER_FEELS_LIKE_ICON,
  WEATHER_PRECIPITATION_ICON,
} from '../../services/weather-service';

export type CityInfo = {
  name: string;
  image: string;
  highlight: string;
};

const CITY_MAP: Record<string, CityInfo> = {
  'atlanta':       { name: 'ATLANTA',       image: 'assets/cyties/atlanta.png',            highlight: 'ATLANTA' },
  'boston':        { name: 'BOSTON',        image: 'assets/cyties/boston.png',             highlight: 'BOSTON' },
  'dallas':        { name: 'DALLAS',        image: 'assets/cyties/dallas.png',             highlight: 'DALLAS' },
  'filadelfia':    { name: 'PHILADELPHIA',  image: 'assets/cyties/filadelfia.png',         highlight: 'PHILADELPHIA' },
  'houston':       { name: 'HOUSTON',       image: 'assets/cyties/houston.png',            highlight: 'HOUSTON' },
  'kansas-city':   { name: 'KANSAS CITY',   image: 'assets/cyties/kansas%20city.png',      highlight: 'KANSAS CITY' },
  'los-angeles':   { name: 'LOS ANGELES',   image: 'assets/cyties/los%20angeles.png',      highlight: 'LOS ANGELES' },
  'miami':         { name: 'MIAMI',         image: 'assets/cyties/miami.png',              highlight: 'MIAMI' },
  'new-york':      { name: 'NEW YORK',      image: 'assets/cyties/new%20york.png',         highlight: 'NEW YORK' },
  'san-francisco': { name: 'SAN FRANCISCO', image: 'assets/cyties/san%20francisco.png',    highlight: 'SAN FRANCISCO' },
  'seattle':       { name: 'SEATTLE',       image: 'assets/cyties/seattle.png',            highlight: 'SEATTLE' },
};

const DEFAULT_CITY: CityInfo = { name: 'YOUR CITY', image: '', highlight: 'YOUR CITY' };

// Cyclic order of the sections for arrow navigation (carousel mode)
const SECTION_ORDER: SectionKey[] = ['eventos', 'hangout', 'fanzone', 'turismo', 'restaurantes'];

// Representative color for each section (matches its hero background)
const SECTION_COLORS: Record<SectionKey, string> = {
  eventos: '#fe0900',
  hangout: '#b121fe',
  fanzone: '#00cf82',
  turismo: '#fdb700',
  restaurantes: '#9747FF',
};

@Component({
  selector: 'app-restaurantes',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage, RestaurantesParte, Partes, ParteEventos, ParteHangout, ParteFanzone, ParteTurismo],
  templateUrl: './restaurantes.html',
  styleUrl: './restaurantes.css'
})
export class Restaurantes {
  private route = inject(ActivatedRoute);
  private weatherService = inject(WeatherService);

  // Signal for the current city (comes from the URL)
  city = toSignal(
    this.route.paramMap.pipe(
      map(params => CITY_MAP[(params.get('ciudad') || '').toLowerCase()] ?? DEFAULT_CITY)
    ),
    { initialValue: DEFAULT_CITY }
  );

  // Slug of the current city (comes from the URL), used to query the weather
  citySlug = toSignal(
    this.route.paramMap.pipe(
      map(params => (params.get('ciudad') || '').toLowerCase())
    ),
    { initialValue: '' }
  );

  // Signals for the weather
  weather = signal<WeatherData | null>(null);
  weatherLoading = signal<boolean>(true);
  weatherError = signal<string | null>(null);

  // Icon based on the current weather condition
  weatherIcon = computed(() => {
    const data = this.weather();
    return data ? WEATHER_ICONS[data.condition] : WEATHER_ICONS['soleado'];
  });

  // Fixed icon for the "feels like" temperature
  feelsLikeIcon = WEATHER_FEELS_LIKE_ICON;

  // Fixed icon for the chance of rain
  precipitationIcon = WEATHER_PRECIPITATION_ICON;

  // Selected section in the category selector ("Restaurantes" by default)
  selectedSection = signal<SectionKey>('restaurantes');

  // Carousel mode: hides app-partes and shows the content with navigation arrows
  carouselMode = signal<boolean>(false);

  // Order of the sections, exposed for the "dots" indicator in the template
  readonly sectionOrder = SECTION_ORDER;

  // Representative color of the active section (dynamic accent for the pill/dots)
  activeSectionColor = computed(() => SECTION_COLORS[this.selectedSection()]);

  // Representative color of a given section (for the dots)
  colorFor(section: SectionKey): string {
    return SECTION_COLORS[section];
  }

  // Selects a section from app-partes and activates carousel mode
  onSectionSelected(section: SectionKey) {
    this.selectedSection.set(section);
    this.carouselMode.set(true);
  }

  // Shows the category selector again (app-partes)
  closeCarousel() {
    this.carouselMode.set(false);
  }

  // Advances to the next section in cyclic order
  nextSection() {
    const currentIndex = SECTION_ORDER.indexOf(this.selectedSection());
    const nextIndex = (currentIndex + 1) % SECTION_ORDER.length;
    this.selectedSection.set(SECTION_ORDER[nextIndex]);
  }

  // Goes back to the previous section in cyclic order
  prevSection() {
    const currentIndex = SECTION_ORDER.indexOf(this.selectedSection());
    const prevIndex = (currentIndex - 1 + SECTION_ORDER.length) % SECTION_ORDER.length;
    this.selectedSection.set(SECTION_ORDER[prevIndex]);
  }

  // Selected temperature unit (defaults to Fahrenheit: US cities)
  temperatureUnit = signal<'C' | 'F'>('F');

  // Current temperature displayed according to the selected unit
  displayTemperature = computed(() => this.convertTemperature(this.weather()?.temperature));

  // "Feels like" temperature displayed according to the selected unit
  displayFeelsLike = computed(() => this.convertTemperature(this.weather()?.feelsLike));

  setUnit(unit: 'C' | 'F') {
    this.temperatureUnit.set(unit);
  }

  // The backend returns temperatures in Fahrenheit; we convert locally without querying the API again
  private convertTemperature(fahrenheit: number | undefined): number | null {
    if (fahrenheit == null) return null;
    return this.temperatureUnit() === 'F'
      ? Math.round(fahrenheit)
      : Math.round((fahrenheit - 32) * 5 / 9);
  }

  constructor() {
    // Every time the city changes, we fetch the weather
    effect(() => {
      const slug = this.citySlug();
      if (slug && CITY_MAP[slug]) {
        this.loadWeather(slug);
      }
    });
  }

  private loadWeather(citySlug: string) {
    this.weatherLoading.set(true);
    this.weatherError.set(null);

    this.weatherService.getWeather(citySlug).subscribe({
      next: (data) => {
        this.weather.set(data);
        this.weatherLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.weatherError.set('We could not load the weather right now.');
        this.weatherLoading.set(false);
      }
    });
  }
}