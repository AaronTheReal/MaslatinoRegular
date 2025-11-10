import { Routes } from '@angular/router';
import { NoticiasRecientes } from './componentes/noticias-recientes/noticias-recientes';
import { Dashboard } from './componentes/dashboard/dashboard';
import { NoticiasIndividuales } from './pages/noticias-individuales/noticias-individuales';
import { SobreNosotros} from './componentes/info/sobre-nosotros/sobre-nosotros'

//admin panel
import { PanelCategorias } from './componentes/admin/panel-categorias/panel-categorias';
import { PanelAdmin } from '../app/componentes/admin/panel-admin/panel-admin';
import { PanelCalendario } from './componentes/admin/panel-calendario/panel-calendario';
import { PanelPodcast } from './componentes/admin/panel-podcast/panel-podcast';
import { PanelCalendarioPc } from './componentes/admin/panel-calendario/panel-calendario-pc/panel-calendario-pc';
import { PanelUsuarios } from './componentes/admin/panel-usuarios/panel-usuarios';
import { PanelMultimedia } from './componentes/admin/panel-multimedia/panel-multimedia';
import { PanelNoticias } from './componentes/admin/panel-noticias/panel-noticias';
import { PanelRadio } from './componentes/admin/panel-radio/panel-radio';
import {AdminNoticias} from './componentes/admin/panel-noticias/admin-noticias/admin-noticias'
import {EditarNoticias} from './componentes/admin/panel-noticias/editar-noticias/editar-noticias'
import {NoticiasDespliegue} from './pages/noticias-despliegue/noticias-despliegue'
import {NoticiasRecomendadas} from './componentes/despliegues/noticias-recomendadas/noticias-recomendadas'
import {DescargaLaApp} from './pages/descarga-la-app/descarga-la-app'
import {Podcast} from './componentes/despliegues/podcast/podcast'
import {Nosotros} from './pages/nosotros/nosotros'
import {NoticiasTodas} from './componentes/despliegues/noticias-todas/noticias-todas'

//show
import {Eventos} from './componentes/despliegues/eventos/eventos'
import {PruebaComponent} from './componentes/prueba-component/prueba-component'
export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'noticias-recientes', component: NoticiasRecientes },

  { path: 'noticia/:slug', component: NoticiasIndividuales },
  { path: 'sobre-nosotros', component: SobreNosotros },


  //admin-panel
  { path: 'admin-panel', component: PanelAdmin },
  { path: 'usuarios-panel', component: PanelUsuarios },
  { path: 'calendario-panel', component: PanelCalendario },
  { path: 'calendario-panel-pc', component: PanelCalendarioPc },
  { path: 'multimedia-panel', component: PanelMultimedia },
  { path: 'noticias-panel', component: PanelNoticias },
  { path: 'podcast-panel', component: PanelPodcast },
  { path: 'radio-panel', component: PanelRadio },
  { path: 'categorias-panel', component: PanelCategorias },
  { path: 'admin-noticias', component: AdminNoticias },
  { path: 'admin/noticiaseditar/:id', component: EditarNoticias },


  { path: 'archivo/:anio/:mes', component: NoticiasDespliegue },
  { path: 'categoria/:slug', component: NoticiasDespliegue },

    { path: 'eventos-show', component: Eventos },
    { path: 'recomendadas-show', component: NoticiasRecomendadas },
  { path: 'podcast-show', component: Podcast },
  {path: 'descarga-la-app', component:DescargaLaApp},
  {path: 'nosotros-pagina', component:Nosotros},
  {path: 'nosotros-pagina', component:Nosotros},
  {path: 'noticias-todas', component:NoticiasTodas},

  {path: 'prueba-component', component:PruebaComponent},
  





];