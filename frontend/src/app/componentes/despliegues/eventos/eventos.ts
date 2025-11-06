import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Event {
  id: number;
  date: string;
  time: string;
  description: string;
  imageUrl: string;
  month: string;
}

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './eventos.html',
  styleUrls: ['./eventos.css'],
})
export class Eventos {
  activeFilter = 'Todo';
  expandedMonths = new Set(['OCTUBRE', 'NOVIEMBRE']);

  filters = ['Todo', 'Esta semana', 'Próxima semana'];
  months = ['OCTUBRE', 'NOVIEMBRE'];

  events: Event[] = [
    {
      id: 1,
      date: '18 de noviembre',
      time: '7:30pm',
      description: 'Lorem ipsum dolor sit amet, consectetuer',
      imageUrl: 'https://api.builder.io/api/v1/image/assets/TEMP/6b02145477e7b9bb1161b86e6855b18dd52e52cb?width=807',
      month: 'OCTUBRE'
    },
    {
      id: 2,
      date: '18 de noviembre',
      time: '7:30pm',
      description: 'Lorem ipsum dolor sit amet, consectetuer',
      imageUrl: 'https://api.builder.io/api/v1/image/assets/TEMP/6b02145477e7b9bb1161b86e6855b18dd52e52cb?width=807',
      month: 'OCTUBRE'
    },
    {
      id: 3,
      date: '18 de noviembre',
      time: '7:30pm',
      description: 'Lorem ipsum dolor sit amet, consectetuer',
      imageUrl: 'https://api.builder.io/api/v1/image/assets/TEMP/6b02145477e7b9bb1161b86e6855b18dd52e52cb?width=807',
      month: 'NOVIEMBRE'
    },
    {
      id: 4,
      date: '18 de noviembre',
      time: '7:30pm',
      description: 'Lorem ipsum dolor sit amet, consectetuer',
      imageUrl: 'https://api.builder.io/api/v1/image/assets/TEMP/6b02145477e7b9bb1161b86e6855b18dd52e52cb?width=807',
      month: 'NOVIEMBRE'
    },
    {
      id: 5,
      date: '18 de noviembre',
      time: '7:30pm',
      description: 'Lorem ipsum dolor sit amet, consectetuer',
      imageUrl: 'https://api.builder.io/api/v1/image/assets/TEMP/6b02145477e7b9bb1161b86e6855b18dd52e52cb?width=807',
      month: 'NOVIEMBRE'
    },
    {
      id: 6,
      date: '18 de noviembre',
      time: '7:30pm',
      description: 'Lorem ipsum dolor sit amet, consectetuer',
      imageUrl: 'https://api.builder.io/api/v1/image/assets/TEMP/6b02145477e7b9bb1161b86e6855b18dd52e52cb?width=807',
      month: 'NOVIEMBRE'
    }
  ];

  setActiveFilter(filter: string): void {
    this.activeFilter = filter;
  }

  toggleMonth(month: string): void {
    if (this.expandedMonths.has(month)) {
      this.expandedMonths.delete(month);
    } else {
      this.expandedMonths.add(month);
    }
  }

  isMonthExpanded(month: string): boolean {
    return this.expandedMonths.has(month);
  }

  getEventsByMonth(month: string): Event[] {
    // Nota: aquí podrías aplicar el filtro "Esta semana / Próxima semana"
    // de forma real si lo necesitas.
    return this.events.filter(event => event.month === month);
  }
}
