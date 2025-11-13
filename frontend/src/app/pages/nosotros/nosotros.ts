import { Component } from '@angular/core';
import {SeccionConectando} from './seccion-conectando/seccion-conectando';
import {SeccionPlataforma} from './seccion-plataforma/seccion-plataforma';
import {SeccionPilares} from './seccion-pilares/seccion-pilares';
import {SeccionTecnologia} from './seccion-tecnologia/seccion-tecnologia';
import {MasQueMedios} from './mas-que-medios/mas-que-medios';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nosotros',
  imports: [
      SeccionConectando,
      SeccionPlataforma,
      SeccionPilares,
      SeccionTecnologia,
      MasQueMedios,
      CommonModule
  ],
  templateUrl: './nosotros.html',
  styleUrl: './nosotros.css'
})
export class Nosotros {

}
