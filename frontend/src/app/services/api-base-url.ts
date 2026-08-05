import { InjectionToken } from '@angular/core';

/**
 * Raíz de la API del backend.
 *
 * El módulo Cities llegaba con la URL escrita a mano en cada uno de sus seis
 * servicios (y apuntando al backend de MasLatino Network), así que cambiar de
 * entorno obligaba a editar seis archivos. Aquí se declara una sola vez y se
 * puede sustituir en las pruebas o por entorno con
 * `{ provide: API_BASE_URL, useValue: '...' }`.
 */
export const DEFAULT_API_BASE_URL =
  'https://maslatinoregular.onrender.com/aaron/maslatino';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => DEFAULT_API_BASE_URL,
});
