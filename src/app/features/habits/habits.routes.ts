import { Routes } from '@angular/router';

export const habitsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./daily-habits.component').then((m) => m.DailyHabitsComponent),
  },
];

