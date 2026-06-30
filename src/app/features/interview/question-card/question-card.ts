import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleService } from '../../../core/services/locale.service';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';
import { ProgressService } from '../services/progress.service';
import { InterviewQuestion, ProgressStatus } from '../interfaces/question.interface';

/**
 * A single, expandable interview question with inline progress controls.
 * Collapsed: level badge, tags, progress accent and the question text.
 * Expanded: Markdown-rendered answer plus optional code snippet.
 */
@Component({
  selector: 'app-question-card',
  standalone: true,
  imports: [TranslateModule, MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './question-card.html',
  styleUrl: './question-card.scss'
})
export class QuestionCardComponent {
  private readonly localeService = inject(LocaleService);
  private readonly progress = inject(ProgressService);

  readonly question = input.required<InterviewQuestion>();

  protected readonly locale = this.localeService.currentLocale;
  protected readonly expanded = signal(false);

  protected readonly levelClass = computed(() => `level-${this.question().level.toLowerCase()}`);
  protected readonly status = computed<ProgressStatus>(() => this.progress.status(this.question().id));

  protected toggle(): void {
    this.expanded.update((v) => !v);
  }

  protected setStatus(status: ProgressStatus, event: Event): void {
    event.stopPropagation();
    // Clicking the active status again clears it back to "new".
    const next = this.status() === status ? 'new' : status;
    this.progress.setStatus(this.question().id, next);
  }
}
