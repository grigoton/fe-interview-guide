import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleService } from '../../../core/services/locale.service';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';
import { ProgressService } from '../services/progress.service';
import { QUESTION_NUMBERS } from '../data';
import { InterviewQuestion, ProgressStatus } from '../interfaces/question.interface';

/** How long the "copied" confirmation stays on a copy button, in ms. */
const COPIED_FEEDBACK_MS = 1400;

/**
 * A single interview question with inline progress controls.
 *
 * Expansion is *controlled* by the parent list (so it can expand/collapse all
 * at once); the card only reports intent via {@link toggled}.
 *
 * Collapsed: level badge, question text, tags and a status accent.
 * Expanded: Markdown-rendered answer plus an optional standalone snippet —
 * every code block gets a copy button.
 */
@Component({
  selector: 'app-question-card',
  standalone: true,
  imports: [TranslateModule, MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './question-card.html',
  styleUrl: './question-card.scss',
})
export class QuestionCardComponent {
  private readonly localeService = inject(LocaleService);
  private readonly progress = inject(ProgressService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly question = input.required<InterviewQuestion>();
  readonly expanded = input(false);

  readonly toggled = output<void>();
  /**
   * "Collapse, record this status and move on to the next question."
   *
   * Handled by the list, not here: it owns the open set *and* needs to know
   * which card comes next before the status changes — a new status can drop
   * this card out of the filtered list altogether.
   */
  readonly advanced = output<ProgressStatus>();

  protected readonly locale = this.localeService.currentLocale;
  protected readonly snippetCopied = signal(false);
  protected readonly questionCopied = signal(false);

  protected readonly levelClass = computed(() => `lvl--${this.question().level.toLowerCase()}`);
  /** Display-only counter (`#042`); the authoring id stays out of the UI. */
  protected readonly number = computed(() => QUESTION_NUMBERS.get(this.question().id) ?? '');
  protected readonly status = computed<ProgressStatus>(() =>
    this.progress.status(this.question().id),
  );

  private copyTimer?: ReturnType<typeof setTimeout>;
  private questionCopyTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.copyTimer);
      clearTimeout(this.questionCopyTimer);
    });
  }

  protected toggle(): void {
    this.toggled.emit();
  }

  /**
   * Collapse from the foot of the answer.
   *
   * A long answer leaves the scroll position far below the card's header, and
   * losing the body would drop the reader somewhere arbitrary — so once the
   * card has shrunk, put its header back under the sticky top bar.
   */
  protected collapse(): void {
    this.toggled.emit();

    afterNextRender(() => this.revealHeader({ onlyIfAbove: true }), {
      injector: this.injector,
    });
  }

  /** Foot buttons: decide "learning" / "known" and let the list open the next one. */
  protected advance(status: ProgressStatus): void {
    this.advanced.emit(status);
  }

  /**
   * Scroll so the card's header sits just under the sticky top bar.
   *
   * With `onlyIfAbove`, a header that is still on screen is left alone: the
   * reader has not lost their place, so the page should not move under them.
   */
  revealHeader(options: { onlyIfAbove?: boolean } = {}): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const offset = this.stickyOffset();
    if (options.onlyIfAbove && rect.top >= offset) return;
    window.scrollTo({ top: rect.top + window.scrollY - offset });
  }

  /** Height of the sticky top bar, plus a little air. */
  private stickyOffset(): number {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--topbar-h');
    const height = Number.parseFloat(raw);
    return (Number.isFinite(height) ? height : 60) + 8;
  }

  protected setStatus(status: ProgressStatus, event: Event): void {
    event.stopPropagation();
    // Clicking the active status again clears it back to "new".
    const next = this.status() === status ? 'new' : status;
    this.progress.setStatus(this.question().id, next);
  }

  /** Copy the question title in the current locale, without toggling the card. */
  protected copyQuestion(event: Event): void {
    event.stopPropagation();
    const text = this.question().question[this.locale()];
    if (!text) return;
    void this.writeClipboard(text).then((ok) => {
      if (!ok) return;
      this.questionCopied.set(true);
      clearTimeout(this.questionCopyTimer);
      this.questionCopyTimer = setTimeout(() => this.questionCopied.set(false), COPIED_FEEDBACK_MS);
    });
  }

  /** Copy the standalone `codeSnippet`. */
  protected copySnippet(): void {
    const snippet = this.question().codeSnippet;
    if (!snippet) return;
    void this.writeClipboard(snippet).then((ok) => {
      if (!ok) return;
      this.snippetCopied.set(true);
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.snippetCopied.set(false), COPIED_FEEDBACK_MS);
    });
  }

  /**
   * Copy buttons inside the rendered Markdown are plain HTML emitted by
   * {@link MarkdownPipe}, so Angular cannot bind them — handle them by
   * delegation from the answer container instead.
   */
  protected onAnswerClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLElement>('.md-copy');
    if (!button) return;

    const code = button.parentElement?.querySelector('code')?.textContent ?? '';
    if (!code) return;

    void this.writeClipboard(code).then((ok) => {
      if (!ok) return;
      button.classList.add('is-copied');
      setTimeout(() => button.classList.remove('is-copied'), COPIED_FEEDBACK_MS);
    });
  }

  private async writeClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Clipboard denied or unavailable (insecure context) — fail silently.
      return false;
    }
  }
}
