import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Publicidad } from './publicidad';

describe('Publicidad', () => {
  let component: Publicidad;
  let fixture: ComponentFixture<Publicidad>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Publicidad]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Publicidad);
    component = fixture.componentInstance;
    fixture.detectChanges();
    el = fixture.nativeElement;
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

  it('el enlace va marcado como pagado y abre aparte', () => {
    const a = el.querySelector('.slide a') as HTMLAnchorElement;
    expect(a.href).toBe('https://www.maurahealey.com/');
    expect(a.rel).toContain('sponsored');
    expect(a.target).toBe('_blank');
  });

  it('con un solo anuncio no muestra flechas ni puntos', () => {
    expect(component.ads.length).toBe(1);
    expect(el.querySelector('.nav-arrow')).toBeNull();
    expect(el.querySelector('.indicators')).toBeNull();
  });
});
