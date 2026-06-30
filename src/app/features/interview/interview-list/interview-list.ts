import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleService } from '../../../core/services/locale.service';
import { ProgressService } from '../services/progress.service';
import { QuestionCardComponent } from '../question-card/question-card';
import { INTERVIEW_CATEGORIES, ALL_QUESTIONS } from '../data';
import {
  InterviewCategoryId,
  ProgressStatus,
  QuestionLevel
} from '../interfaces/question.interface';

type CategoryFilter = InterviewCategoryId | 'all';
type LevelFilter = QuestionLevel | 'all';
type StatusFilter = ProgressStatus | 'all';

/**
 * Knowledge-base browser: filter the full interview Q&A set by category,
 * difficulty, learning status and free-text search, with a live progress bar.
 * Question/answer language follows the global {@link LocaleService}.
 */
@Component({
  selector: 'app-interview-list',
  standalone: true,
  imports: [TranslateModule, QuestionCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './interview-list.html',
  styleUrl: './interview-list.scss'
})
export class InterviewListComponent {
  private readonly localeService = inject(LocaleService);
  private readonly progress = inject(ProgressService);

  protected readonly locale = this.localeService.currentLocale;
  protected readonly categories = INTERVIEW_CATEGORIES;
  protected readonly levels: QuestionLevel[] = ['Medium', 'Hard', 'Expert'];

  protected readonly selectedCategory = signal<CategoryFilter>('all');
  protected readonly selectedLevel = signal<LevelFilter>('all');
  protected readonly selectedStatus = signal<StatusFilter>('all');
  protected readonly search = signal('');

  /** Total questions per category id (plus `all`), for the counters. */
  protected readonly countByCategory = computed(() => {
    const counts: Record<string, number> = { all: ALL_QUESTIONS.length };
    for (const q of ALL_QUESTIONS) {
      counts[q.category] = (counts[q.category] ?? 0) + 1;
    }
    return counts;
  });

  /** Aggregate learning progress across the whole base. */
  protected readonly stats = computed(() => {
    const map = this.progress.statuses();
    const total = ALL_QUESTIONS.length;
    let known = 0;
    let learning = 0;
    for (const q of ALL_QUESTIONS) {
      const s = map[q.id];
      if (s === 'known') known++;
      else if (s === 'learning') learning++;
    }
    return {
      total,
      known,
      learning,
      remaining: total - known - learning,
      knownPct: total ? Math.round((known / total) * 100) : 0,
      learningPct: total ? Math.round((learning / total) * 100) : 0
    };
  });

  protected readonly filtered = computed(() => {
    const cat = this.selectedCategory();
    const level = this.selectedLevel();
    const status = this.selectedStatus();
    const term = this.search().trim().toLowerCase();
    const loc = this.locale();
    const map = this.progress.statuses();

    return ALL_QUESTIONS.filter((q) => {
      if (cat !== 'all' && q.category !== cat) return false;
      if (level !== 'all' && q.level !== level) return false;
      if (status !== 'all' && (map[q.id] ?? 'new') !== status) return false;
      if (term) {
        const haystack = (
          q.question[loc] +
          ' ' +
          q.answer[loc] +
          ' ' +
          q.tags.join(' ') +
          ' ' +
          q.id
        ).toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  });

  protected selectCategory(id: CategoryFilter): void {
    this.selectedCategory.set(id);
  }

  protected selectLevel(level: LevelFilter): void {
    this.selectedLevel.set(level);
  }

  protected selectStatus(status: StatusFilter): void {
    this.selectedStatus.set(status);
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected resetFilters(): void {
    this.selectedCategory.set('all');
    this.selectedLevel.set('all');
    this.selectedStatus.set('all');
    this.search.set('');
  }

  protected resetProgress(): void {
    this.progress.reset();
  }
}
