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

];