import { Routes } from '@angular/router';
import { NoticiasRecientes } from './componentes/noticias-recientes/noticias-recientes';
import { Dashboard } from './componentes/dashboard/dashboard';
import { NoticiasIndividuales } from './pages/noticias-individuales/noticias-individuales';

export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'noticias-recientes', component: NoticiasRecientes },
  { path: 'noticia/:id', component: NoticiasIndividuales },
];