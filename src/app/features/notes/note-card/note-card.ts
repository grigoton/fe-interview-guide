import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleService } from '../../../core/services/locale.service';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';
import { CourseNote } from '../interfaces/note.interface';

/** How long the "copied" confirmation stays on a copy button, in ms. */
const COPIED_FEEDBACK_MS = 1400;

/**
 * One saved note: header with title/date/tags, Markdown-rendered body.
 *
 * Expansion and the delete confirmation are *controlled* by the page, so it can
 * expand everything at once and keep at most one pending delete.
 */
@Component({
  selector: 'app-note-card',
  standalone: true,
  imports: [TranslateModule, MarkdownPipe, LocalDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './note-card.html',
  styleUrl: './note-card.scss',
})
export class NoteCardComponent {
  private readonly localeService = inject(LocaleService);

  readonly note = input.required<CourseNote>();
  readonly expanded = input(false);
  /** True while this card's delete button is awaiting confirmation. */
  readonly confirmingDelete = input(false);

  readonly toggled = output<void>();
  readonly edited = output<void>();
  readonly removed = output<void>();

  protected readonly locale = this.localeService.currentLocale;

  /** Plain-text opening of the body, shown while the card is collapsed. */
  protected readonly excerpt = computed(() => {
    const text = this.note()
      .body.replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#>*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 150 ? `${text.slice(0, 150)}…` : text;
  });

  /** A note edited later than it was written shows its update date instead. */
  protected readonly wasEdited = computed(() => this.note().updatedAt !== this.note().createdAt);

  protected toggle(): void {
    this.toggled.emit();
  }

  protected onEdit(event: Event): void {
    event.stopPropagation();
    this.edited.emit();
  }

  protected onRemove(event: Event): void {
    event.stopPropagation();
    this.removed.emit();
  }

  /**
   * Copy buttons inside the rendered Markdown are plain HTML emitted by
   * {@link MarkdownPipe}, so Angular cannot bind them — handle them by
   * delegation from the body container instead.
   */
  protected onBodyClick(event: MouseEvent): void {
    const button = (event.target as HTMLElement | null)?.closest<HTMLElement>('.md-copy');
    if (!button) return;

    const code = button.parentElement?.querySelector('code')?.textContent ?? '';
    if (!code) return;

    void navigator.clipboard
      .writeText(code)
      .then(() => {
        button.classList.add('is-copied');
        setTimeout(() => button.classList.remove('is-copied'), COPIED_FEEDBACK_MS);
      })
      .catch(() => {
        // clipboard denied or unavailable (insecure context) — fail silently
      });
  }
}
