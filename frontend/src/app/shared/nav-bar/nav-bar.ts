import {
  Component,
  Output,
  EventEmitter,
  ViewEncapsulation,
  ElementRef,
  HostListener,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

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

  constructor(private el: ElementRef<HTMLElement>) {}

  onLoginClick() {
    this.loginClicked.emit();
  }

  onSearchClick(ev?: Event) {
    ev?.stopPropagation();
    this.searchClicked.emit();
  }

  toggleMenu(ev?: Event) {
    ev?.stopPropagation();
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
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
}
