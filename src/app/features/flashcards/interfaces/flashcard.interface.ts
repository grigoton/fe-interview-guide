export type FlashcardDifficulty = 'easy' | 'medium' | 'hard';

export interface Flashcard {
  question: string;
  answer: string;
  difficulty: FlashcardDifficulty;
  topic: string;
}
