import { Routes } from '@angular/router';

export const interviewRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./interview-list/interview-list').then((m) => m.InterviewListComponent)
  }
];
