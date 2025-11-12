import { Component, Output, EventEmitter, ViewEncapsulation, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-nav-bar',
  imports: [CommonModule, RouterModule],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
  encapsulation: ViewEncapsulation.None
})
export class NavBar {
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

  // Cierra con ESC
  @HostListener('document:keydown.escape')
  onEsc() {
    this.closeMenu();
  }

  // Cierra si clicas fuera del componente
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    if (!this.isMenuOpen) return;
    const target = ev.target as Node;
    if (!this.el.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }
}
