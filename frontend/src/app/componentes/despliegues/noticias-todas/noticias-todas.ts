import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface NewsArticle {
  id: number;
  title: string;
  date: string;
  category: string;
  categoryColor: string;
  imageUrl: string;
}

@Component({
  selector: 'app-noticias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './noticias-todas.html',
  styleUrls: ['./noticias-todas.css'],
})
export class NoticiasTodas {
  activeCategory = 'All';

  categories = ['All', 'Negocios', 'Deportes', 'Política', 'Entretenimiento', 'Arte'];

  articles: NewsArticle[] = [
    {
      id: 1,
      title: 'Boston Bruins inician temporada con cambios y homenaje a Chara',
      date: 'June 20, 2025',
      category: 'Deportes',
      categoryColor: '#00CB7E',
      imageUrl: 'https://api.builder.io/api/v1/image/assets/TEMP/86ad8a59c5c68a686daa40c57db1a964d5aba874?width=996'
    },
    {
      id: 2,
      title: 'Trump devuelve protagonismo al Columbus Day y exalta a Colón',
      date: 'June 20, 2025',
      category: 'Política',
      categoryColor: '#FAAF3E',
      imageUrl: 'https://api.builder.io/api/v1/image/assets/TEMP/df42d6908767c0667015ea0518a10e3cfa7fce80?width=1063'
    },
    {
      id: 3,
      title: 'El Louvre Sufre Uno De Los Robos Más Audaces De Su Historia',
      date: 'June 20, 2025',
      category: 'Arte',
      categoryColor: '#8F50F8',
      imageUrl: 'https://api.builder.io/api/v1/image/assets/TEMP/fe3672af5c7c377c51ae9b39f62e3d3b5b5bba34?width=1046'
    },
    {
      id: 4,
      title: 'Boston Bruins inician temporada con cambios y homenaje a Chara',
      date: 'June 20, 2025',
      category: 'Deportes',
      categoryColor: '#00CB7E',
      imageUrl: 'https://api.builder.io/api/v1/image/assets/TEMP/86ad8a59c5c68a686daa40c57db1a964d5aba874?width=996'
    }
  ];

  get filteredArticles(): NewsArticle[] {
    if (this.activeCategory === 'All') {
      return this.articles;
    }
    return this.articles.filter(article => article.category === this.activeCategory);
  }

  setActiveCategory(category: string): void {
    this.activeCategory = category;
  }

  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'All': '#000',
      'Negocios': '#8F50F8',
      'Deportes': '#00CB7E',
      'Política': '#FAAF3E',
      'Entretenimiento': '#FE3824',
      'Arte': '#8F50F8'
    };
    return colors[category] || '#000';
  }
}
