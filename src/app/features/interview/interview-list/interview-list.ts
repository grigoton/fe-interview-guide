import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleService } from '../../../core/services/locale.service';
import { ProgressService } from '../services/progress.service';
import { QuestionCardComponent } from '../question-card/question-card';
import { ALL_QUESTIONS, INTERVIEW_CATEGORIES, QUESTION_NUMBERS } from '../data';
import {
  InterviewCategoryId,
  ProgressStatus,
  QuestionLevel,
} from '../interfaces/question.interface';

type CategoryFilter = InterviewCategoryId | 'all';
type LevelFilter = QuestionLevel | 'all';
type StatusFilter = ProgressStatus | 'all';

/** Radius of the progress ring, in the SVG's own user units. */
const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Knowledge-base browser: filter the full interview Q&A set by category,
 * difficulty, learning status and free-text search.
 *
 * Card expansion is owned here rather than by each card, so "expand all" and
 * "collapse all" are possible and the open set survives re-filtering.
 * Question/answer language follows the global {@link LocaleService}.
 */
@Component({
  selector: 'app-interview-list',
  standalone: true,
  imports: [TranslateModule, QuestionCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './interview-list.html',
  styleUrl: './interview-list.scss',
  host: { '(document:keydown)': 'onDocumentKeydown($event)' },
})
export class InterviewListComponent {
  private readonly localeService = inject(LocaleService);
  private readonly progress = inject(ProgressService);

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly locale = this.localeService.currentLocale;
  protected readonly categories = INTERVIEW_CATEGORIES;
  protected readonly levels: QuestionLevel[] = ['Medium', 'Hard', 'Expert'];
  protected readonly statuses: StatusFilter[] = ['all', 'new', 'learning', 'known'];

  protected readonly ringRadius = RING_RADIUS;
  protected readonly ringCircumference = RING_CIRCUMFERENCE;

  protected readonly selectedCategory = signal<CategoryFilter>('all');
  protected readonly selectedLevel = signal<LevelFilter>('all');
  protected readonly selectedStatus = signal<StatusFilter>('all');
  protected readonly search = signal('');

  /** Advanced filters are collapsed on narrow screens; CSS pins them open ≥900px. */
  protected readonly filtersOpen = signal(false);

  private readonly expandedIds = signal<ReadonlySet<string>>(new Set());

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
      learningPct: total ? Math.round((learning / total) * 100) : 0,
    };
  });

  /** Ring arc lengths. The learning arc is drawn behind, so it carries both slices. */
  protected readonly ringKnownDash = computed(
    () => (this.stats().knownPct / 100) * RING_CIRCUMFERENCE,
  );
  protected readonly ringLearningDash = computed(
    () => ((this.stats().knownPct + this.stats().learningPct) / 100) * RING_CIRCUMFERENCE,
  );

  /** `{ total, known }` per category id, plus an `all` bucket, for the rail. */
  protected readonly countByCategory = computed(() => {
    const map = this.progress.statuses();
    // Seeded with every module, so the rail can render a count for one that
    // currently has no questions instead of blowing up on `undefined`.
    const out: Record<string, { total: number; known: number }> = {
      all: { total: 0, known: 0 },
    };
    for (const cat of INTERVIEW_CATEGORIES) out[cat.id] = { total: 0, known: 0 };
    for (const q of ALL_QUESTIONS) {
      const bucket = (out[q.category] ??= { total: 0, known: 0 });
      const isKnown = map[q.id] === 'known';
      bucket.total++;
      out['all'].total++;
      if (isKnown) {
        bucket.known++;
        out['all'].known++;
      }
    }
    return out;
  });

  /**
   * Everything the filters match *except* the status filter. Status counts are
   * scoped to this, so "Learning 2" answers "…within what I'm looking at",
   * while the category counts stay absolute.
   */
  private readonly beforeStatus = computed(() => {
    const cat = this.selectedCategory();
    const level = this.selectedLevel();
    const term = this.search().trim().toLowerCase();
    const loc = this.locale();

    return ALL_QUESTIONS.filter((q) => {
      if (cat !== 'all' && q.category !== cat) return false;
      if (level !== 'all' && q.level !== level) return false;
      if (term) {
        const haystack = (
          q.question[loc] +
          ' ' +
          q.answer[loc] +
          ' ' +
          q.tags.join(' ') +
          ' ' +
          q.id +
          ' ' +
          // The card shows the display number, so let people search by it too.
          (QUESTION_NUMBERS.get(q.id) ?? '')
        ).toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  });

  /** Question totals per status within the current category/level/search. */
  protected readonly countByStatus = computed(() => {
    const map = this.progress.statuses();
    const out: Record<StatusFilter, number> = { all: 0, new: 0, learning: 0, known: 0 };
    for (const q of this.beforeStatus()) {
      out.all++;
      out[map[q.id] ?? 'new']++;
    }
    return out;
  });

  protected readonly filtered = computed(() => {
    const status = this.selectedStatus();
    if (status === 'all') return this.beforeStatus();

    const map = this.progress.statuses();
    return this.beforeStatus().filter((q) => (map[q.id] ?? 'new') === status);
  });

  /** How many filters deviate from the default — badges the mobile "Filters" toggle. */
  protected readonly activeFilterCount = computed(() => {
    let n = 0;
    if (this.selectedCategory() !== 'all') n++;
    if (this.selectedLevel() !== 'all') n++;
    if (this.selectedStatus() !== 'all') n++;
    if (this.search().trim()) n++;
    return n;
  });

  /** True once every currently visible question is open. */
  protected readonly allExpanded = computed(() => {
    const visible = this.filtered();
    if (!visible.length) return false;
    const open = this.expandedIds();
    return visible.every((q) => open.has(q.id));
  });

  protected isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  protected toggleExpanded(id: string): void {
    this.expandedIds.update((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  /** Expand every visible question, or collapse them if they are all open. */
  protected toggleExpandAll(): void {
    const visible = this.filtered();
    if (this.allExpanded()) {
      this.expandedIds.update((current) => {
        const next = new Set(current);
        for (const q of visible) next.delete(q.id);
        return next;
      });
      return;
    }
    this.expandedIds.update((current) => {
      const next = new Set(current);
      for (const q of visible) next.add(q.id);
      return next;
    });
  }

  protected selectCategory(id: CategoryFilter): void {
    this.selectedCategory.set(id);
  }

  protected selectLevel(level: LevelFilter): void {
    this.selectedLevel.set(level);
  }

  protected selectStatus(status: StatusFilter): void {
    this.selectedStatus.set(status);
  }

  /** i18n key for a status filter button (`all` has its own wording). */
  protected statusLabelKey(status: StatusFilter): string {
    return status === 'all' ? 'INT_ALL_STATUSES' : `INT_STATUS_${status.toUpperCase()}`;
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.search.set('');
    this.searchInput()?.nativeElement.focus();
  }

  protected toggleFilters(): void {
    this.filtersOpen.update((v) => !v);
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

  /** `/` focuses search from anywhere; `Escape` inside the field clears it. */
  protected onDocumentKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const isTyping =
      !!target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable === true);

    if (event.key === '/' && !isTyping) {
      event.preventDefault();
      this.searchInput()?.nativeElement.focus();
      return;
    }

    if (event.key === 'Escape' && target === this.searchInput()?.nativeElement) {
      this.search.set('');
    }
  }
}
