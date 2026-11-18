import { Routes } from '@angular/router';
import { SIMULATIONS, simulationRoutes } from './simulations/simulation-catalog';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home').then((m) => m.HomeComponent),
  },
  ...simulationRoutes(SIMULATIONS),
  { path: '**', redirectTo: '' },
];
