import { Routes } from '@angular/router';

/**
 * The interview knowledge base is the whole site, so it lives at the root.
 * `/interview` is kept as a redirect: the previously deployed build served the
 * feature from that path, and installed PWAs / bookmarks still point there.
 */
export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/interview/interview.routes').then(m => m.interviewRoutes)
  },
  { path: 'interview', redirectTo: '', pathMatch: 'full' },
  {
    path: 'notes',
    loadChildren: () => import('./features/notes/notes.routes').then(m => m.notesRoutes)
  },
  { path: '**', redirectTo: '' }
];
