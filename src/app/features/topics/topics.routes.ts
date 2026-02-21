import { Routes } from '@angular/router';

export const topicsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./topics-shell').then(m => m.TopicsShell),
    children: [
      { path: '', redirectTo: 'javascript', pathMatch: 'full' },
      { path: ':id', loadComponent: () => import('./topic-detail').then(m => m.TopicDetail) }
    ]
  }
];
