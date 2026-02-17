import { Component, OnInit,CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import {ConectarRaices} from './conectar-raices/conectar-raices'
import {Contactanos} from './contactanos/contactanos'
import {Eventos} from './eventos/eventos'
import {ExperienciaTodo} from './experiencia-todo/experiencia-todo'
import {NoticiasDestacadas} from './noticias-destacadas/noticias-destacadas'
import {Podcasts} from './podcasts/podcasts'
import {Recomendadas} from './recomendadas/recomendadas'
import {Unete} from './unete/unete'
import {Publicidad} from './publicidad/publicidad'
import {CarruselEventos} from './carrusel-eventos/carrusel-eventos'
import { CommonModule } from '@angular/common';
import {AdsComponent} from '../ads/ads'


@Component({
  selector: 'app-dashboard',
  imports: [
    ConectarRaices,
    Contactanos,
    Eventos,
    ExperienciaTodo,
    NoticiasDestacadas,
    Podcasts,
    Recomendadas,
    Unete,
    CarruselEventos,
    Publicidad,
    CommonModule,
    AdsComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  schemas:[CUSTOM_ELEMENTS_SCHEMA]

})
export class Dashboard implements OnInit {
  constructor() { }

  ngOnInit(): void {
   
  }
}
