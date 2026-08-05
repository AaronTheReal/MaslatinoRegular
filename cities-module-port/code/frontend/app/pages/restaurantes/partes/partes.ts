import { Component, input, output } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';

// Identifier for each selectable section/category
export type SectionKey = 'eventos' | 'hangout' | 'fanzone' | 'turismo' | 'restaurantes';

@Component({
  selector: 'app-partes',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './partes.html',
  styleUrl: './partes.css',
})
export class Partes {
categories: { subtitle: string; title: string; bg: string; icon: string; id: SectionKey }[] = [
  {
    subtitle: 'For entertainment',
    title: 'Events',
    bg: 'bg-[#fe0900]',
    icon: 'assets/iconospartes/eventos.webp',
    id: 'eventos',
  },
  {
    subtitle: 'To pass the time',
    title: 'Hang out',
    bg: 'bg-[#b121fe]',
    icon: 'assets/iconospartes/hangout.webp',
    id: 'hangout',
  },
  {
    subtitle: 'Live the experience',
    title: 'Fan Zone',
    bg: 'bg-[#00cf82]',
    icon: 'assets/iconospartes/fanzone.webp',
    id: 'fanzone',
  },
  {
    subtitle: 'Tour the city',
    title: 'Tourism',
    bg: 'bg-[#fdb700]',
    icon: 'assets/iconospartes/turismo.webp',
    id: 'turismo',
  },
];

foodCategory: { subtitle: string; title: string; bg: string; icon: string; id: SectionKey } = {
  subtitle: 'To eat',
  title: 'The best restaurants',
  bg: 'bg-[#b121fe]',
  icon: 'assets/iconospartes/restaurantes.webp',
  id: 'restaurantes',
};

// Currently selected section (controlled by the parent component)
selectedSection = input<SectionKey>('restaurantes');

// Emits the chosen section when a card is clicked
sectionSelected = output<SectionKey>();
}