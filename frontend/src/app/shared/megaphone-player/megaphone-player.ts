import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-megaphone-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './megaphone-player.html',
  styleUrl: './megaphone-player.css',
})
export class MegaphonePlayerComponent {
  @Input() embedUrl!: string;      // src que te da Megaphone
  @Input() height = 220;           // alto del player, ajustable

  safeSrc?: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    if (this.embedUrl) {
      this.safeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.embedUrl);
    }
  }

  ngOnChanges() {
    if (this.embedUrl) {
      this.safeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.embedUrl);
    }
  }
}
