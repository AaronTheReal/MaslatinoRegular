import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-publicidad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './publicidad.html',
  styleUrl: './publicidad.css'
})
export class Publicidad implements OnInit, OnDestroy {
  @ViewChild('carousel') carousel!: ElementRef<HTMLDivElement>;

  currentIndex = 0;
  ads: any[] = [];
  private intervalId: any;

  // Estados del drag (movimiento en vivo)
  private isDragging = false;
  private startX = 0;
  dragOffsetPercent = 0;
  transitionStyle = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

  // === TUS IMÁGENES (sin tocar) ===
  private desktopAds = [
    { image: 'assets/publicidad.jpg', alt: 'Publicidad 1', link: 'https://saravialaw.com/' },
    { image: 'assets/publicidad2.png', alt: 'Publicidad 2', link: 'https://temporada.boricorridor.com/' }
  ];

  private mobileAds = [
    { image: 'assets/publicidad/publicidad.jpg', alt: 'Publicidad Mobile 1', link: 'https://saravialaw.com/' },
    { image: 'assets/publicidad/publicidad2.png', alt: 'Publicidad Mobile 2', link: 'https://temporada.boricorridor.com/' }
  ];

  ngOnInit(): void {
    this.loadAds();
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  private loadAds(): void {
    this.ads = window.innerWidth < 768 ? this.mobileAds : this.desktopAds;
  }

  @HostListener('window:resize')
  onResize(): void {
    const isMobileNow = window.innerWidth < 768;
    const currentIsMobile = this.ads === this.mobileAds;

    if (isMobileNow !== currentIsMobile) {
      this.stopAutoPlay();
      this.loadAds();
      this.currentIndex = 0;
      this.startAutoPlay();
    }
  }

  private startAutoPlay(): void {
    this.stopAutoPlay();
    this.intervalId = setInterval(() => this.nextAd(), 5000);
  }

  private stopAutoPlay(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // === NAVEGACIÓN ===
  nextAd(): void {
    this.currentIndex = (this.currentIndex + 1) % this.ads.length;
  }

  prevAd(): void {
    this.currentIndex = (this.currentIndex - 1 + this.ads.length) % this.ads.length;
  }

  goTo(index: number): void {
    this.currentIndex = index;
  }

  getTransform(): string {
    const base = -this.currentIndex * 100;
    return `translateX(${base + this.dragOffsetPercent}%)`;
  }

  // === DRAG / SWIPE (movimiento en vivo sin parpadeo) ===
  private getClientX(e: MouseEvent | TouchEvent): number {
    return (e as TouchEvent).touches ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
  }

  startDrag(e: MouseEvent | TouchEvent): void {
    this.isDragging = true;
    this.startX = this.getClientX(e);
    this.dragOffsetPercent = 0;
    this.transitionStyle = 'none';
    this.stopAutoPlay(); // pausa mientras arrastras
  }

  drag(e: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;
    const currentX = this.getClientX(e);
    const diff = currentX - this.startX;
    const containerWidth = this.carousel.nativeElement.offsetWidth;
    this.dragOffsetPercent = (diff / containerWidth) * 100;
  }

  endDrag(): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    const threshold = 18;
    if (this.dragOffsetPercent < -threshold) {
      this.nextAd();
    } else if (this.dragOffsetPercent > threshold) {
      this.prevAd();
    }

    this.dragOffsetPercent = 0;
    this.transitionStyle = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    // reactiva autoplay
    setTimeout(() => this.startAutoPlay(), 800);
  }

  // Evitar que las flechas activen el drag
  next(e: Event): void {
    e.stopPropagation();
    this.nextAd();
  }

  prev(e: Event): void {
    e.stopPropagation();
    this.prevAd();
  }
}