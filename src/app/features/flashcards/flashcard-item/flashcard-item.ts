import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { Flashcard } from '../interfaces/flashcard.interface';

@Component({
  selector: 'app-flashcard-item',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flashcard-item.html',
  styles: [
    `
      .flip-container {
        perspective: 1000px;
      }
      .flip-inner {
        transform-style: preserve-3d;
        transition: transform 0.4s ease;
      }
      .flip-front,
      .flip-back {
        backface-visibility: hidden;
      }
      .flip-back {
        transform: rotateY(180deg);
      }
      .flipped .flip-inner {
        transform: rotateY(180deg);
      }
    `,
  ],
})
export class FlashcardItemComponent {
  readonly card = input.required<Flashcard>();
  readonly flipped = signal(false);

  toggle(): void {
    this.flipped.update((v) => !v);
  }
}
