import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-publicidad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './publicidad.html',
  styleUrl: './publicidad.css'
})
export class Publicidad implements OnInit, OnDestroy {
  currentIndex = 0;

  ads = [
    {
      image: 'assets/publicidad.jpg',
      alt: 'Publicidad 1',
      link: 'https://saravialaw.com/'
    },
    {
      image: 'assets/publicidad2.png',
      alt: 'Publicidad 2',
      link: 'https://saravialaw.com/'
    }
  ];

  private intervalId: any;

  ngOnInit(): void {
    this.intervalId = setInterval(() => {
      this.nextAd();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  nextAd(): void {
    this.currentIndex = (this.currentIndex + 1) % this.ads.length;
  }

  goToAd(index: number): void {
    this.currentIndex = index;
  }
}