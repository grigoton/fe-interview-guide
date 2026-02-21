import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'topics', pathMatch: 'full' },
  {
    path: 'topics',
    loadChildren: () => import('./features/topics/topics.routes').then(m => m.topicsRoutes)
  },
  {
    path: 'practice',
    loadChildren: () => import('./features/practice/practice.routes').then(m => m.practiceRoutes)
  }
];
