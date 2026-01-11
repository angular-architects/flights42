import { Routes } from '@angular/router';

import { MilesOverview } from './miles-overview';
import { NextLevelPage } from './next-leve-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'miles' },
  { path: 'miles', component: MilesOverview },
  { path: 'next-level', component: NextLevelPage },
];
