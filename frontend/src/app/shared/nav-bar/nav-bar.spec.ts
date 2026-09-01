import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { NavBar } from './nav-bar';

describe('NavBar', () => {
  let component: NavBar;
  let fixture: ComponentFixture<NavBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavBar],
      providers: [provideRouter([{ path: '**', children: [] }])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('se cierra al navegar a otra página', async () => {
    component.openMenu();
    expect(component.isMenuOpen).toBeTrue();

    await TestBed.inject(Router).navigateByUrl('/otra-pagina');

    expect(component.isMenuOpen).toBeFalse();
  });

  it('se cierra al hacer clic en un enlace del panel', () => {
    component.openMenu();

    const link = fixture.nativeElement.querySelector('.menu-list a') as HTMLElement;
    link.click();

    expect(component.isMenuOpen).toBeFalse();
  });

  it('sigue abierto si el clic cae en el panel pero no en un enlace', () => {
    component.openMenu();

    const title = fixture.nativeElement.querySelector('.menu-title') as HTMLElement;
    title.click();

    expect(component.isMenuOpen).toBeTrue();
  });

  describe('scroll de la página', () => {
    /** El runner de Karma no scrollea de verdad: se simula la posición. */
    const scrollTo = (y: number) => {
      scrollY.and.returnValue(y);
      window.dispatchEvent(new Event('scroll'));
    };

    let scrollY: jasmine.Spy<() => number>;

    beforeEach(() => {
      scrollY = spyOn<any>(component, 'currentScrollY').and.returnValue(0);
    });

    it('aguanta un desplazamiento mínimo', () => {
      component.openMenu();

      scrollTo(20);

      expect(component.isMenuOpen).toBeTrue();
    });

    it('se cierra cuando el desplazamiento ya tiene intención', () => {
      component.openMenu();

      scrollTo(300);

      expect(component.isMenuOpen).toBeFalse();
    });

    it('mide desde donde se abrió, no desde el principio de la página', () => {
      scrollY.and.returnValue(1200);
      component.openMenu();

      scrollTo(1230);
      expect(component.isMenuOpen).toBeTrue();

      scrollTo(1400);
      expect(component.isMenuOpen).toBeFalse();
    });

    it('deja de escuchar el scroll una vez cerrado', () => {
      const removeSpy = spyOn(window, 'removeEventListener').and.callThrough();

      component.openMenu();
      component.closeMenu();

      expect(removeSpy).toHaveBeenCalledWith('scroll', jasmine.any(Function));
    });
  });
});
