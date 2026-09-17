import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { ShareButton } from './share-button';

const URL_NOTICIA = 'https://maslatino.com/noticia/alex-saab-declara-culpable-cooperara-eeuu';
const TITULO = 'Alex Saab se declara culpable y cooperará con EE.UU';
const RESUMEN = 'El empresario colombiano se declaró culpable en Miami.';

describe('ShareButton', () => {
  let fixture: ComponentFixture<ShareButton>;
  let component: ShareButton;
  /** Acceso a los métodos protegidos, que existen para poder simularlos. */
  let interno: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareButton],
    }).compileComponents();

    fixture = TestBed.createComponent(ShareButton);
    component = fixture.componentInstance;
    interno = component as any;

    fixture.componentRef.setInput('url', URL_NOTICIA);
    fixture.componentRef.setInput('title', TITULO);
    fixture.componentRef.setInput('text', RESUMEN);
  });

  /**
   * El navegador del runner SÍ tiene navigator.share, así que el escenario de
   * escritorio hay que forzarlo. Se fija antes del primer render porque el
   * componente consulta el soporte una sola vez, al hidratar.
   */
  const render = (conCompartirNativo: boolean) => {
    spyOn(interno, 'canShareNative').and.returnValue(conCompartirNativo);
    // Dos pasadas a propósito: la primera pinta y dispara afterNextRender (que
    // es cuando se consulta el soporte), la segunda refleja ya el resultado.
    fixture.detectChanges();
    fixture.detectChanges();
  };

  it('should create', () => {
    render(false);

    expect(component).toBeTruthy();
  });

  it('no ofrece el compartir del sistema hasta que termina de hidratar', () => {
    // Es el estado con el que sale el HTML del servidor: allí no hay navigator
    // y cambiar el DOM durante la hidratación la rompería.
    expect(interno.nativeSupported()).toBeFalse();
  });

  describe('con compartir nativo disponible', () => {
    beforeEach(() => render(true));

    it('abre la hoja del sistema con título, texto y enlace', () => {
      const share = spyOn(interno, 'nativeShare').and.returnValue(Promise.resolve());

      component.compartir();

      expect(share).toHaveBeenCalledWith({
        title: TITULO,
        text: RESUMEN,
        url: URL_NOTICIA,
      });
    });

    it('no hace nada si el usuario cierra la hoja de compartir', async () => {
      const abort = new DOMException('cancelado', 'AbortError');
      spyOn(interno, 'nativeShare').and.returnValue(Promise.reject(abort));
      const clipboard = spyOn(interno, 'writeClipboard').and.returnValue(Promise.resolve());

      component.compartir();
      await fixture.whenStable();

      expect(clipboard).not.toHaveBeenCalled();
      expect(interno.copiado()).toBeFalse();
    });

    it('cae al portapapeles si el compartir falla de verdad', async () => {
      spyOn(interno, 'nativeShare').and.returnValue(Promise.reject(new Error('roto')));
      const clipboard = spyOn(interno, 'writeClipboard').and.returnValue(Promise.resolve());

      component.compartir();
      await fixture.whenStable();

      expect(clipboard).toHaveBeenCalledWith(URL_NOTICIA);
    });

    it('muestra el botón de compartir del sistema', () => {
      expect(fixture.nativeElement.querySelector('.share-btn--native')).not.toBeNull();
    });
  });

  describe('sin compartir nativo', () => {
    beforeEach(() => render(false));

    it('copia el enlace al portapapeles', async () => {
      const clipboard = spyOn(interno, 'writeClipboard').and.returnValue(Promise.resolve());

      component.compartir();
      await fixture.whenStable();

      expect(clipboard).toHaveBeenCalledWith(URL_NOTICIA);
    });

    it('esconde el botón del sistema y deja los enlaces directos', () => {
      expect(fixture.nativeElement.querySelector('.share-btn--native')).toBeNull();
      expect(fixture.nativeElement.querySelector('.share-btn--whatsapp')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.share-btn--facebook')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.share-btn--x')).not.toBeNull();
    });

    it('avisa de que copió el enlace y el aviso se apaga solo', fakeAsync(() => {
      spyOn(interno, 'writeClipboard').and.returnValue(Promise.resolve());

      component.copiarEnlace();
      tick();
      fixture.detectChanges();

      expect(interno.copiado()).toBeTrue();
      expect(fixture.nativeElement.querySelector('.share-bar__status').textContent).toContain(
        'Enlace copiado'
      );

      tick(2500);
      fixture.detectChanges();

      expect(interno.copiado()).toBeFalse();
    }));

    it('aguanta que el portapapeles no esté disponible', async () => {
      spyOn(interno, 'writeClipboard').and.returnValue(Promise.reject(new Error('sin permiso')));

      component.copiarEnlace();
      await fixture.whenStable();

      expect(interno.copiado()).toBeFalse();
    });
  });

  describe('enlaces de respaldo', () => {
    beforeEach(() => render(false));

    it('arma el de WhatsApp con el título y el enlace', () => {
      const href = fixture.nativeElement
        .querySelector('.share-btn--whatsapp')
        .getAttribute('href');

      expect(href).toContain('https://wa.me/?text=');
      expect(href).toContain(encodeURIComponent(URL_NOTICIA));
      expect(href).toContain(encodeURIComponent(TITULO));
    });

    it('arma el de Facebook solo con el enlace', () => {
      const href = fixture.nativeElement
        .querySelector('.share-btn--facebook')
        .getAttribute('href');

      expect(href).toBe(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL_NOTICIA)}`
      );
    });

    it('abre las redes en otra pestaña sin dejarles acceso a la nuestra', () => {
      const enlaces: HTMLAnchorElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('.share-bar__actions a')
      );

      expect(enlaces.length).toBe(3);
      enlaces.forEach((a) => {
        expect(a.getAttribute('target')).toBe('_blank');
        expect(a.getAttribute('rel')).toContain('noopener');
      });
    });
  });

  describe('variante compacta', () => {
    it('enseña un solo botón, sin la barra completa', () => {
      fixture.componentRef.setInput('variant', 'compacto');
      render(true);

      expect(fixture.nativeElement.querySelector('.share-chip')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.share-bar')).toBeNull();
    });

    it('dice que comparte cuando el sistema tiene hoja de compartir', () => {
      fixture.componentRef.setInput('variant', 'compacto');
      render(true);

      expect(
        fixture.nativeElement.querySelector('.share-chip').getAttribute('aria-label')
      ).toBe('Compartir esta noticia');
    });

    it('dice que copia el enlace cuando no lo tiene', () => {
      fixture.componentRef.setInput('variant', 'compacto');
      render(false);

      expect(
        fixture.nativeElement.querySelector('.share-chip').getAttribute('aria-label')
      ).toBe('Copiar el enlace de esta noticia');
    });
  });
});
