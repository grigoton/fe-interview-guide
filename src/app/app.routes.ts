import { Routes } from '@angular/router';
import { environment } from '../environments/environment';

const interviewRoute = {
  path: 'interview',
  loadChildren: () =>
    import('./features/interview/interview.routes').then(m => m.interviewRoutes)
};

/** Full app — all features (used locally / non-deployed builds). */
const fullRoutes: Routes = [
  { path: '', redirectTo: 'topics', pathMatch: 'full' },
  {
    path: 'topics',
    loadChildren: () => import('./features/topics/topics.routes').then(m => m.topicsRoutes)
  },
  {
    path: 'habits',
    loadChildren: () => import('./features/habits/habits.routes').then(m => m.habitsRoutes)
  },
  interviewRoute,
  {
    path: 'practice',
    loadChildren: () => import('./features/practice/practice.routes').then(m => m.practiceRoutes)
  },
  {
    path: 'flashcards',
    loadChildren: () =>
      import('./features/flashcards/flashcards.routes').then(m => m.flashcardsRoutes)
  }
];

/** Deployed build — only the Interview feature is reachable. */
const interviewOnlyRoutes: Routes = [
  { path: '', redirectTo: 'interview', pathMatch: 'full' },
  interviewRoute,
  { path: '**', redirectTo: 'interview' }
];

export const routes: Routes = environment.interviewOnly ? interviewOnlyRoutes : fullRoutes;
