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
import {PodcastComponent} from './componentes/despliegues/podcast/podcast'
import {Nosotros} from './pages/nosotros/nosotros'
import {NoticiasTodas} from './componentes/despliegues/noticias-todas/noticias-todas'
import { LoginForm } from './componentes/admin/login-form/login-form'; 
import { adminAuthGuard } from './guards/admin-auth.guard';

//show
import {Eventos} from './componentes/despliegues/eventos/eventos'
import {PruebaComponent} from './componentes/prueba-component/prueba-component'
import{Contactanos} from './pages/contactanos/contactanos'
import{PrivacyPolicy} from './pages/privacy-policy/privacy-policy'
import {Terminos} from './pages/terminos/terminos'

export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'noticias-recientes', component: NoticiasRecientes },

  //{ path: ':slug', component: NoticiasIndividuales },
 { path: 'noticia/:slug', component: NoticiasIndividuales },



  //admin-panel

  { path: 'admin-login', component: LoginForm },

  // 🛡️ RUTAS PROTEGIDAS DEL ADMIN PANEL
  { path: 'admin-panel', component: PanelAdmin, canActivate: [adminAuthGuard] },
  { path: 'usuarios-panel', component: PanelUsuarios, canActivate: [adminAuthGuard] },
  { path: 'calendario-panel', component: PanelCalendario, canActivate: [adminAuthGuard] },
  { path: 'calendario-panel-pc', component: PanelCalendarioPc, canActivate: [adminAuthGuard] },
  { path: 'multimedia-panel', component: PanelMultimedia, canActivate: [adminAuthGuard] },
  { path: 'noticias-panel', component: PanelNoticias, canActivate: [adminAuthGuard] },
  { path: 'podcast-panel', component: PanelPodcast, canActivate: [adminAuthGuard] },
  { path: 'radio-panel', component: PanelRadio, canActivate: [adminAuthGuard] },
  { path: 'categorias-panel', component: PanelCategorias, canActivate: [adminAuthGuard] },
  { path: 'admin-noticias', component: AdminNoticias, canActivate: [adminAuthGuard] },
  { path: 'admin/noticiaseditar/:id', component: EditarNoticias, canActivate: [adminAuthGuard] },

  { path: 'archivo/:anio/:mes', component: NoticiasDespliegue },
  { path: 'categoria/:slug', component: NoticiasDespliegue },

    { path: 'eventos-show', component: Eventos },
    { path: 'recomendadas-show', component: NoticiasRecomendadas },
  { path: 'podcast-show', component: PodcastComponent },
  {path: 'descarga-la-app', component:DescargaLaApp},
  {path: 'nosotros-pagina', component:Nosotros},
  {path: 'noticias-todas', component:NoticiasTodas},

  {path: 'prueba-component', component:PruebaComponent},
  {path: 'contactanos', component:Contactanos},

  
    {path: 'privacy-policy', component:PrivacyPolicy},
    {path: 'terminos-condiciones', component:Terminos},






];