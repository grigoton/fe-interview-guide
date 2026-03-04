import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AiFlashcardService } from '../../../core/services/ai-flashcard.service';
import { FlashcardItemComponent } from '../flashcard-item/flashcard-item';
import { TOPICS } from '../../topics/topic-nav.data';

@Component({
  selector: 'app-flashcard-list',
  standalone: true,
  imports: [TranslateModule, FlashcardItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flashcard-list.html',
})
export class FlashcardListComponent {
  private readonly aiFlashcard = inject(AiFlashcardService);

  readonly topics = TOPICS;
  readonly selectedTopic = signal<string>(TOPICS[0]?.id ?? 'javascript');
  readonly cards = this.aiFlashcard.cards;
  readonly isLoading = this.aiFlashcard.isLoading;
  readonly error = this.aiFlashcard.error;
  readonly remainingRequests = this.aiFlashcard.remainingRequests;

  onTopicChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedTopic.set(value);
  }

  generate(): void {
    if (this.aiFlashcard.isLoading()) return;
    this.aiFlashcard.generateCards(this.selectedTopic());
  }
}
