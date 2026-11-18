import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'ecosystem',
    loadComponent: () => import('./pages/ecosystem/ecosystem').then((m) => m.EcosystemComponent),
  },
  { path: '**', redirectTo: '' },
];
