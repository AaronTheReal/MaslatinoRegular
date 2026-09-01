import {
  Component,
  DestroyRef,
  Output,
  EventEmitter,
  ViewEncapsulation,
  ElementRef,
  HostListener,
  Input,
  NgZone,
  PLATFORM_ID,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Píxeles que hay que desplazar la página para que el menú se cierre solo.
 * El panel es `position: fixed`: si no se cierra, se queda flotando sobre un
 * contenido que ya no le corresponde. 64 px es el punto amable: el rebote de
 * un móvil o un roce del trackpad no llegan, pero un scroll con intención sí.
 */
const CLOSE_ON_SCROLL_PX = 64;

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
  encapsulation: ViewEncapsulation.None
})
export class NavBar {

  /** Control global (lo puedes pasar desde App) */
  @Input() showFloatingActions = true;

  /**
   * Si es true el nav ocultará las acciones flotantes (lupa + dropdown).
   * El padre (App) debe pasar esto como:
   * [hideFloatingActionsOnPodcastDetail]="isPodcastDetailRoute"
   */
  @Input() hideFloatingActionsOnPodcastDetail = false;

  @Output() searchClicked = new EventEmitter<void>();
  @Output() loginClicked = new EventEmitter<void>();

  isMenuOpen = false;

  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** `scrollY` al abrir el menú; base para medir cuánto se ha desplazado. */
  private scrollAnchor = 0;
  /** Quita el listener de scroll; solo existe mientras el menú está abierto. */
  private detachScroll?: () => void;

  constructor(private el: ElementRef<HTMLElement>, router: Router) {
    // Navegar cierra el menú: antes seguía abierto encima de la página nueva.
    router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed()
      )
      .subscribe(() => this.closeMenu());

    // Si el nav muere con el menú abierto, el listener de scroll se va con él.
    inject(DestroyRef).onDestroy(() => this.closeMenu());
  }

  onLoginClick() {
    this.loginClicked.emit();
  }

  onSearchClick(ev?: Event) {
    ev?.stopPropagation();
    // El buscador abre su propia capa; dejar el menú detrás se ve roto.
    this.closeMenu();
    this.searchClicked.emit();
  }

  toggleMenu(ev?: Event) {
    ev?.stopPropagation();
    if (this.isMenuOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    if (this.isMenuOpen) return;
    this.isMenuOpen = true;
    this.watchScroll();
  }

  closeMenu() {
    if (!this.isMenuOpen) return;
    this.isMenuOpen = false;
    this.detachScroll?.();
    this.detachScroll = undefined;
  }

  /**
   * Clic dentro del panel: no debe llegar al listener del documento (cerraría
   * el menú al arrastrar su scroll interno), pero un clic en un enlace sí lo
   * cierra, incluso cuando el enlace apunta a la página actual y el router no
   * emite ninguna navegación.
   */
  onPanelClick(ev: MouseEvent) {
    ev.stopPropagation();

    const target = ev.target as HTMLElement | null;
    if (target?.closest('a')) {
      this.closeMenu();
    }
  }

  // Cerrar con ESC
  @HostListener('document:keydown.escape')
  onEsc() {
    this.closeMenu();
  }

  // Cerrar si se hace clic fuera
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    if (!this.isMenuOpen) return;

    const target = ev.target as Node;
    if (!this.el.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }

  /**
   * El listener vive solo mientras el menú está abierto y fuera de la zona de
   * Angular: el scroll de toda la app no debe disparar detección de cambios.
   * Solo se vuelve a entrar en la zona en el momento de cerrar.
   */
  private watchScroll() {
    if (!this.isBrowser) return;

    this.scrollAnchor = this.currentScrollY();

    const onScroll = () => {
      if (Math.abs(this.currentScrollY() - this.scrollAnchor) < CLOSE_ON_SCROLL_PX) return;
      this.zone.run(() => this.closeMenu());
    };

    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', onScroll, { passive: true });
    });

    this.detachScroll = () => window.removeEventListener('scroll', onScroll);
  }

  /** Única lectura del scroll del navegador; aislada para poder simularla. */
  protected currentScrollY(): number {
    return window.scrollY;
  }
}
