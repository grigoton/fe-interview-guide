import { Routes } from '@angular/router';

export const notesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./notes-page/notes-page').then((m) => m.NotesPageComponent),
  },
];
