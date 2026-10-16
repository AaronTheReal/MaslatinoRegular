import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Anuncio, Publicidad, anunciosVigentes } from './publicidad';

// Un día de la campaña. Sin fecha fija, estas pruebas empezarían a fallar el
// 4 de noviembre, cuando el anuncio de Healey caduca.
const EN_CAMPANA = '2026-10-20T12:00:00-04:00';

describe('Publicidad', () => {
  let component: Publicidad;
  let fixture: ComponentFixture<Publicidad>;
  let el: HTMLElement;

  async function crearEl(fecha: string, alVerse?: 'al instante') {
    spyOn(Date, 'now').and.returnValue(Date.parse(fecha));
    await TestBed.configureTestingModule({
      imports: [Publicidad]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Publicidad);
    component = fixture.componentInstance;
    // Sin IntersectionObserver de verdad: la prueba decide cuándo "se ve".
    spyOn<any>(component, 'observarVisibilidad').and.callFake(
      (_el: HTMLElement, cb: () => void) => { if (alVerse) cb(); }
    );
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  const eventos = () => (window.dataLayer || []).filter((e: any) => e?.event?.startsWith('anuncio_'));

  beforeEach(() => {
    window.dataLayer = [];
  });

  describe('durante la campaña', () => {
    beforeEach(async () => {
      await crearEl(EN_CAMPANA);
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('pinta cada anuncio con su pieza de escritorio y la de celular', () => {
      const slides = el.querySelectorAll('.slide picture');
      expect(slides.length).toBe(component.ads.length);

      const source = el.querySelector('picture source')!;
      const img = el.querySelector('picture img') as HTMLImageElement;
      expect(source.getAttribute('media')).toBe('(max-width: 767px)');
      expect(source.getAttribute('srcset')).toContain('MauraHealey_MasLatino_Post');
      expect(source.getAttribute('width')).toBe('1080');
      expect(img.getAttribute('src')).toContain('Maura_healey_Mas_Latino_Banner');
      expect(img.alt).toContain('Maura Healey');
    });

    it('en escritorio ofrece el WebP en dos anchos antes que el GIF', () => {
      const fuentes = Array.from(el.querySelectorAll('picture source'));
      const webp = fuentes.find((s) => s.getAttribute('type') === 'image/webp')!;

      // Detrás de la de celular: el <picture> usa la primera que encaja.
      expect(fuentes.indexOf(webp)).toBe(1);
      expect(webp.getAttribute('srcset')).toContain('healey-banner-1517.webp 1517w');
      expect(webp.getAttribute('srcset')).toContain('healey-banner-3034.webp 3034w');
      expect(webp.getAttribute('sizes')).toBe('100vw');
    });

    it('el enlace va marcado como pagado, abre aparte y lleva las utm', () => {
      const a = el.querySelector('.slide a') as HTMLAnchorElement;
      const url = new URL(a.href);
      expect(url.origin).toBe('https://www.maurahealey.com');
      expect(url.searchParams.get('utm_source')).toBe('maslatino');
      expect(url.searchParams.get('utm_medium')).toBe('banner');
      expect(url.searchParams.get('utm_campaign')).toBe('healey-2026');
      expect(a.rel).toContain('sponsored');
      expect(a.target).toBe('_blank');
    });

    it('con un solo anuncio no muestra flechas ni puntos', () => {
      expect(component.ads.length).toBe(1);
      expect(el.querySelector('.nav-arrow')).toBeNull();
      expect(el.querySelector('.indicators')).toBeNull();
    });

    it('el clic deja anuncio_clic en el dataLayer', () => {
      const a = el.querySelector('.slide a') as HTMLAnchorElement;
      a.addEventListener('click', (e) => e.preventDefault()); // que no abra la pestaña
      a.click();

      expect(eventos()).toEqual([
        jasmine.objectContaining({ event: 'anuncio_clic', anuncio: 'healey-2026' }),
      ]);
      expect(['celular', 'escritorio']).toContain(eventos()[0].formato);
    });

    it('no cuenta la vista mientras no se ve', () => {
      expect(eventos()).toEqual([]);
    });
  });

  it('cuenta la vista una sola vez cuando se ve', async () => {
    await crearEl(EN_CAMPANA, 'al instante');
    (component as any).registrarVista(); // un segundo aviso no suma otra

    expect(eventos()).toEqual([
      jasmine.objectContaining({ event: 'anuncio_vista', anuncio: 'healey-2026' }),
    ]);
  });

  it('después de la elección no pinta nada', async () => {
    await crearEl('2026-11-04T00:00:00-05:00');

    expect(component.ads).toEqual([]);
    expect(el.querySelector('.publicidad-carousel')).toBeNull();
    expect(el.querySelector('br')).toBeNull();
  });

  describe('anunciosVigentes', () => {
    const base = { alt: '', link: '', escritorio: { src: '', w: 1, h: 1 }, celular: { src: '', w: 1, h: 1 } };
    const conFin: Anuncio = { ...base, id: 'con-fin', hasta: '2026-11-04T00:00:00-05:00' };
    const sinFin: Anuncio = { ...base, id: 'sin-fin' };

    it('lo muestra hasta el último minuto del 3 de noviembre en Massachusetts', () => {
      const ids = anunciosVigentes([conFin, sinFin], Date.parse('2026-11-03T23:59:00-05:00')).map((a) => a.id);
      expect(ids).toEqual(['con-fin', 'sin-fin']);
    });

    it('lo quita desde la medianoche, y el que no tiene fecha sigue', () => {
      const ids = anunciosVigentes([conFin, sinFin], Date.parse('2026-11-04T00:00:00-05:00')).map((a) => a.id);
      expect(ids).toEqual(['sin-fin']);
    });
  });
});
