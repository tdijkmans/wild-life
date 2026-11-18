import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'ecosystem',
    loadComponent: () => import('./features/ecosystem/ecosystem').then((m) => m.EcosystemComponent),
  },
  { path: '**', redirectTo: '' },
];
