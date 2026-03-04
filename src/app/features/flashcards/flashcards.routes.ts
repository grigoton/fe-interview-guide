import { Routes } from '@angular/router';

export const flashcardsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./flashcard-list/flashcard-list').then((m) => m.FlashcardListComponent),
  },
];
