import {
  Directive,
  ElementRef,
  HostListener,
  OnInit,
  PLATFORM_ID,
  Renderer2,
  inject
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Mantiene el esqueleto del contenedor hasta que la <img> termina de cargar, y
 * entonces funde la imagen.
 *
 * Sin esto los esqueletos de la web solo cubren la peticion de datos: en cuanto
 * llega el JSON las tarjetas se pintan con huecos en blanco durante toda la
 * descarga de las portadas, que es la parte lenta. El contenedor que lleve la
 * clase .img-skeleton late hasta que esta directiva le pone .img-ready.
 *
 * La opacidad se aplica solo desde el navegador: si el JS no llega a ejecutarse
 * la imagen se ve igual, nunca se queda invisible.
 */
@Directive({ selector: 'img[appImgFade]', standalone: true })
export class ImgFadeDirective implements OnInit {
  private readonly host = inject<ElementRef<HTMLImageElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private revealed = false;

  ngOnInit(): void {
    if (!this.isBrowser || this.revealed) return;

    const img = this.host.nativeElement;

    // Servida desde cache: ya esta pintada, no hay nada que fundir.
    if (img.complete && img.naturalWidth > 0) {
      this.reveal();
      return;
    }

    this.renderer.setStyle(img, 'opacity', '0');
    this.renderer.setStyle(img, 'transition', 'opacity .4s ease');
  }

  @HostListener('load')
  onLoad(): void {
    this.reveal();
  }

  /** Un 404 no debe dejar el esqueleto latiendo para siempre. */
  @HostListener('error')
  onError(): void {
    this.reveal();
  }

  private reveal(): void {
    this.revealed = true;

    const img = this.host.nativeElement;
    this.renderer.setStyle(img, 'opacity', '1');

    const parent = img.parentElement;
    if (parent) this.renderer.addClass(parent, 'img-ready');
  }
}
