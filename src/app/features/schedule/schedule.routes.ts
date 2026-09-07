import { Routes } from '@angular/router';

export const scheduleRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./today-view/today-view').then((m) => m.TodayViewComponent),
  },
  {
    path: 'week',
    loadComponent: () => import('./week-view/week-view').then((m) => m.WeekViewComponent),
  },
];
