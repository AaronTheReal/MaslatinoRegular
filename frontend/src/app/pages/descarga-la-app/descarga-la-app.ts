import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-descarga-la-app',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './descarga-la-app.html',
  styleUrls: ['./descarga-la-app.css']
})
export class DescargaLaApp {
  // ✅ Tus datos reales
  private readonly ANDROID_PACKAGE = 'com.maslatino.app';
  private readonly IOS_APP_ID      = '6698865116';

  // ⬇️ pon aquí tu esquema si lo tienes (p. ej. 'maslatino://').
  // Si no tienes deep link aún, déjalo vacío '' y caerá a la tienda.
  private readonly CUSTOM_SCHEME   = '';

  // Fallbacks a tienda (con tus URLs reales)
  private get androidStoreUrl() {
    // Incluyo hl=es_MX como pasaste en tu enlace
    return `https://play.google.com/store/apps/details?id=${this.ANDROID_PACKAGE}&hl=es_MX`;
  }
  private get iosStoreUrl() {
    // Tu URL real de App Store
    return `https://apps.apple.com/us/app/mas-latino/id${this.IOS_APP_ID}`;
  }

  // Intent Android (si tienes esquema; si no, abre la tienda)
  private get androidIntentUrl() {
    const fallback = encodeURIComponent(this.androidStoreUrl);
    const pkg = this.ANDROID_PACKAGE;
    const scheme = (this.CUSTOM_SCHEME || '').split('://')[0] || 'https';
    return `intent://open#Intent;scheme=${scheme};package=${pkg};S.browser_fallback_url=${fallback};end`;
  }

  openAndroid(evt: Event) {
    evt.preventDefault();
    const hasScheme = !!this.CUSTOM_SCHEME;
    if (hasScheme && /Android/i.test(navigator.userAgent)) {
      window.location.href = this.androidIntentUrl;
      return;
    }
    if (hasScheme) {
      this.tryOpen(this.CUSTOM_SCHEME, this.androidStoreUrl);
    } else {
      window.open(this.androidStoreUrl, '_blank', 'noopener');
    }
  }

  openIOS(evt: Event) {
    evt.preventDefault();
    const hasScheme = !!this.CUSTOM_SCHEME;
    if (hasScheme && /iPad|iPhone|iPod/i.test(navigator.userAgent)) {
      const iosNativeStore = `itms-apps://apps.apple.com/app/id${this.IOS_APP_ID}`;
      this.tryOpen(this.CUSTOM_SCHEME, iosNativeStore);
    } else if (hasScheme) {
      this.tryOpen(this.CUSTOM_SCHEME, this.iosStoreUrl);
    } else {
      window.open(this.iosStoreUrl, '_blank', 'noopener');
    }
  }

  private tryOpen(deepLink: string, fallbackUrl: string) {
    const t = Date.now();
    window.location.assign(deepLink);
    setTimeout(() => {
      const hidden = document.hidden || (document as any).webkitHidden;
      if (!hidden && Date.now() - t < 2000) {
        window.location.href = fallbackUrl;
      }
    }, 800);
  }
}
