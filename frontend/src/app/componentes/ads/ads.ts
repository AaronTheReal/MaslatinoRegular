import { AfterViewInit, Component } from '@angular/core';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

@Component({
  selector: 'app-ads',
  standalone: true,
  templateUrl: './ads.html',
  styleUrls: ['./ads.css']
})
export class AdsComponent implements AfterViewInit {

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch (error) {
        console.error('AdSense error:', error);
      }
    }
  }
}
