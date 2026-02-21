import { Routes } from '@angular/router';

export const practiceRoutes: Routes = [
  { path: '', loadComponent: () => import('./practice').then(m => m.Practice) }
];
