import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Category {
  name: string;
  color: string;
}

interface RecentEntry {
  title: string;
  link: string;
}

@Component({
  selector: 'app-noticia-individual',
  imports: [CommonModule],
  template: `
    <article class="noticia-individual">
      <div class="hero-section">
        <div class="hero-image-container">
          <!-- Hero image placeholder -->
        </div>
        <div class="hero-overlay">
          <span class="category-label">SPORTS</span>
          <h1 class="hero-title">Casa Blanca: Trump Comenzó Una Reforma Millonaria En El Ala Este</h1>
        </div>
      </div>

      <div class="article-container">
        <div class="article-content">
          <time class="article-date">22/10/2025</time>

          <h2 class="article-heading">Lujo, mármol y poder: Trump arranca la remodelación más ambiciosa de la Casa Blanca en más de medio siglo.</h2>

          <div class="article-body">
            <p>Las máquinas excavadoras comenzaron a trabajar el lunes 20 de octubre de 2025 en los terrenos de la Casa Blanca, marcando el inicio formal de una ambiciosa remodelación impulsada por el presidente Donald Trump. La obra principal es la construcción de un nuevo salón de baile valuado en 250 millones de dólares, pero el plan abarca mucho más: renovaciones interiores, rediseño del ala de las Rosas y cambios estructurales que reflejan la estética dorada característica del mandatario.</p>

            <p>Trump ha asumido personalmente el papel de lo que él mismo llama el "constructor en jefe" de una Casa Blanca "más moderna y respetada". En cada aparición pública, el magnate converrtido en político destaca su faceta de diseñador. "Siempre he sido un constructor y ahora estoy construyendo una nación que vuelve a ser respetada", dijo Trump durante una cena con donantes el pasado mes, donde anunció que magnates aliados financiarían buena parte de las obras.</p>

            <div class="embedded-tweet">
              <!-- Twitter embed placeholder -->
              <div class="tweet-placeholder">
                <p class="tweet-header">@World_Watcher_ · Seguir</p>
                <p class="tweet-text">The U.S. Treasury Department has ordered employees not to photograph or film the ongoing demolition and construction work on the East Wing of the White House as part of President Trump's $250 million State Ballroom project.</p>
                <div class="tweet-hashtags">#Trump #DonaldTrump #WhiteHouse</div>
                <div class="tweet-images">
                  <div class="tweet-image-placeholder"></div>
                  <div class="tweet-image-placeholder"></div>
                </div>
                <time class="tweet-time">4:18 a. m. · 21 oct. 2025</time>
              </div>
            </div>

            <h3 class="section-title">Un nuevo rostro para la residencia presidencial</h3>

            <p>El plan maestro incluye la demolición parcial del Ala Este para levantar el nuevo salón de baile —una estructura de mármol y vidrio con capacidad para unas 900 personas— y la remodelación de espacios emblemáticos como el Baño Kennedy, el Salón de Recepciones y el Salón de los Diplomáticos, y el Jardín de las Rosas, convirtiéndolo en un patio de piedra al estilo de Mar-a-Lago. Trump ha dicho que busca un "esplendor clásico de la era de la guerra civil", un estilo que ha generado tanto admiración como críticas.</p>

            <p>Según la Casa Blanca, los proyectos se financian con aportaciones privadas, principalmente de empresarios que han contribuido a las campañas del presidente. El propio Trump ha bromeado en público diciendo que la construcción del salón "es el precio de tener acceso al presidente".</p>

            <p class="source-label">FUENTE:</p>

            <div class="share-section">
              <p class="share-title">Comparte esta noticia:</p>
              <div class="social-buttons">
                <button class="social-btn facebook" aria-label="Compartir en Facebook">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>
                <button class="social-btn twitter" aria-label="Compartir en Twitter">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </button>
                <button class="social-btn whatsapp" aria-label="Compartir en WhatsApp">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </button>
                <button class="social-btn linkedin" aria-label="Compartir en LinkedIn">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </button>
                <button class="social-btn tiktok" aria-label="Compartir en TikTok">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside class="sidebar">
          <div class="sidebar-section categories-section">
            <h3 class="sidebar-title">CATEGORIAS</h3>
            <div class="category-tags">
              <button *ngFor="let category of categories" 
                      class="category-tag" 
                      [style.background-color]="category.color">
                {{category.name}}
              </button>
            </div>
          </div>

          <div class="sidebar-section recent-entries">
            <div class="section-header">
              <div class="plus-icon">+</div>
              <h3 class="sidebar-title white">ENTRADAS RECIENTES</h3>
            </div>
            <ul class="entries-list">
              <li *ngFor="let entry of recentEntries" class="entry-item">
                <a [href]="entry.link">{{entry.title}}</a>
              </li>
            </ul>
          </div>

          <div class="sidebar-section also-interesting">
            <div class="section-header">
              <div class="plus-icon">+</div>
              <h3 class="sidebar-title white">TAMBIÉN TE PUEDE INTERESAR</h3>
            </div>
            <ul class="entries-list">
              <li *ngFor="let entry of alsoInteresting" class="entry-item">
                <a [href]="entry.link">{{entry.title}}</a>
              </li>
            </ul>
          </div>

          <div class="sidebar-section archives">
            <div class="section-header">
              <div class="plus-icon">+</div>
              <h3 class="sidebar-title white">ARCHIVOS</h3>
            </div>
            <ul class="archives-list">
              <li *ngFor="let month of archiveMonths" class="archive-item">
                <a [href]="'#'">{{month}}</a>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </article>
  `,
  styles: `
    .noticia-individual {
      background: #fff;
      font-family: Inter, -apple-system, Roboto, Helvetica, sans-serif;
    }

    .hero-section {
      position: relative;
      width: 100%;
      height: 450px;
      overflow: hidden;
    }

    .hero-image-container {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .hero-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 40px;
      background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .category-label {
      display: inline-block;
      background: rgba(255, 255, 255, 0.9);
      color: #000;
      padding: 6px 16px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      align-self: flex-start;
      letter-spacing: 0.5px;
    }

    .hero-title {
      color: #fff;
      font-size: 48px;
      font-weight: 700;
      line-height: 1.2;
      margin: 0;
      max-width: 900px;
    }

    .article-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 60px 40px;
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 60px;
    }

    .article-content {
      max-width: 800px;
    }

    .article-date {
      display: block;
      font-size: 16px;
      color: #666;
      margin-bottom: 24px;
    }

    .article-heading {
      font-size: 32px;
      font-weight: 600;
      line-height: 1.3;
      color: #000;
      margin: 0 0 32px;
    }

    .article-body {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .article-body p {
      font-size: 18px;
      line-height: 1.7;
      color: #333;
      margin: 0;
    }

    .embedded-tweet {
      margin: 32px 0;
    }

    .tweet-placeholder {
      border: 1px solid #e1e8ed;
      border-radius: 12px;
      padding: 16px;
      background: #fff;
    }

    .tweet-header {
      font-size: 15px;
      font-weight: 600;
      color: #1da1f2;
      margin: 0 0 12px;
    }

    .tweet-text {
      font-size: 15px;
      line-height: 1.5;
      color: #14171a;
      margin: 0 0 12px;
    }

    .tweet-hashtags {
      color: #1da1f2;
      font-size: 15px;
      margin-bottom: 12px;
    }

    .tweet-images {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .tweet-image-placeholder {
      aspect-ratio: 16/9;
      background: #f0f0f0;
      border-radius: 8px;
    }

    .tweet-time {
      font-size: 13px;
      color: #657786;
    }

    .section-title {
      font-size: 24px;
      font-weight: 600;
      color: #000;
      margin: 32px 0 16px;
    }

    .source-label {
      font-weight: 600;
      color: #000;
      margin-top: 32px;
    }

    .share-section {
      margin-top: 48px;
      padding-top: 32px;
      border-top: 2px solid #e0e0e0;
    }

    .share-title {
      font-size: 20px;
      font-weight: 600;
      color: #000;
      margin: 0 0 20px;
    }

    .social-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .social-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s, opacity 0.2s;
    }

    .social-btn:hover {
      transform: translateY(-2px);
      opacity: 0.9;
    }

    .social-btn.facebook {
      background: #1877f2;
      color: #fff;
    }

    .social-btn.twitter {
      background: #000;
      color: #fff;
    }

    .social-btn.whatsapp {
      background: #25d366;
      color: #fff;
    }

    .social-btn.linkedin {
      background: #0077b5;
      color: #fff;
    }

    .social-btn.tiktok {
      background: #000;
      color: #fff;
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .sidebar-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .categories-section .sidebar-title {
      background: #f44336;
      color: #fff;
      padding: 12px 20px;
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    .category-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .category-tag {
      padding: 8px 18px;
      border: none;
      border-radius: 20px;
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .category-tag:hover {
      transform: translateY(-2px);
    }

    .section-header {
      background: #f44336;
      color: #fff;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .plus-icon {
      font-size: 24px;
      font-weight: 700;
      line-height: 1;
    }

    .sidebar-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    .sidebar-title.white {
      color: #fff;
    }

    .entries-list,
    .archives-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .entry-item a,
    .archive-item a {
      color: #000;
      text-decoration: none;
      font-size: 16px;
      line-height: 1.4;
      transition: color 0.2s;
      display: block;
    }

    .entry-item a:hover,
    .archive-item a:hover {
      color: #f44336;
    }

    .entry-item a::before {
      content: '• ';
      color: #f44336;
      font-weight: 700;
      margin-right: 8px;
    }

    .archive-item a::before {
      content: '• ';
      color: #f44336;
      font-weight: 700;
      margin-right: 8px;
    }

    @media (max-width: 1024px) {
      .article-container {
        grid-template-columns: 1fr;
        gap: 40px;
      }

      .sidebar {
        order: 2;
      }

      .hero-title {
        font-size: 36px;
      }
    }

    @media (max-width: 768px) {
      .hero-section {
        height: 350px;
      }

      .hero-overlay {
        padding: 24px;
      }

      .hero-title {
        font-size: 28px;
      }

      .article-container {
        padding: 40px 20px;
      }

      .article-heading {
        font-size: 26px;
      }

      .article-body p {
        font-size: 16px;
      }
    }

    @media (max-width: 480px) {
      .hero-section {
        height: 280px;
      }

      .hero-title {
        font-size: 22px;
      }

      .article-heading {
        font-size: 22px;
      }

      .social-buttons {
        justify-content: center;
      }
    }
  `,
})
export class PruebaComponent {
  categories: Category[] = [
    { name: 'Negocios', color: '#8F50F8' },
    { name: 'Deportes', color: '#00CB7E' },
    { name: 'Arte', color: '#8F50F8' },
    { name: 'Entretenimiento', color: '#FE3824' },
    { name: 'Familia', color: '#FFAB02' },
    { name: 'Finanzas', color: '#FF0400' },
    { name: 'Mundo', color: '#8F50F8' },
    { name: 'Noticias locales', color: '#00CB7E' },
    { name: 'Religión', color: '#8F50F8' },
    { name: 'Tecnología', color: '#FFAB02' }
  ];

  recentEntries: RecentEntry[] = [
    { title: 'EE.UU. llegó a 13,7 millones de indocumentados en 2023', link: '#' },
    { title: 'EE.UU. llegó a 13,7 millones de indocumentados en 2023', link: '#' },
    { title: 'EE.UU. llegó a 13,7 millones de indocumentados en 2023', link: '#' }
  ];

  alsoInteresting: RecentEntry[] = [
    { title: 'EE.UU. llegó a 13,7 millones de indocumentados en 2023', link: '#' },
    { title: 'EE.UU. llegó a 13,7 millones de indocumentados en 2023', link: '#' },
    { title: 'EE.UU. llegó a 13,7 millones de indocumentados en 2023', link: '#' }
  ];

  archiveMonths: string[] = [
    'octubre 2025',
    'septiembre 2025',
    'agosto 2025',
    'julio 2025',
    'junio 2025',
    'mayo 2025',
    'abril 2025',
    'marzo 2025',
    'febrero 2025',
    'enero 2020'
  ];
}
