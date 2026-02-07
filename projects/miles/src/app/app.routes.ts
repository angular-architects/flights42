import { Routes } from '@angular/router';

import { MilesOverview } from './miles-overview';
import { NextLevelPage } from './next-leve-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', component: MilesOverview },
  { path: 'next-level', component: NextLevelPage },
];

export default routes;
