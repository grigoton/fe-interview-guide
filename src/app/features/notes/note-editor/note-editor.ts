import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';
import { CourseNote, NoteDraft } from '../interfaces/note.interface';

/**
 * Write / edit form for one note.
 *
 * The three fields are `linkedSignal`s over the {@link note} input, so passing
 * a different note resets the form while local typing still wins in between.
 * `Ctrl/⌘ + Enter` saves and `Escape` cancels — the form is usually opened
 * straight from the keyboard.
 */
@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [TranslateModule, MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './note-editor.html',
  styleUrl: './note-editor.scss',
})
export class NoteEditorComponent {
  /** Note being edited, or `null` when composing a new one. */
  readonly note = input<CourseNote | null>(null);

  readonly saved = output<NoteDraft>();
  readonly cancelled = output<void>();

  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  protected readonly title = linkedSignal(() => this.note()?.title ?? '');
  protected readonly body = linkedSignal(() => this.note()?.body ?? '');
  protected readonly tags = linkedSignal(() => this.note()?.tags.join(', ') ?? '');

  protected readonly preview = signal(false);
  protected readonly isEdit = computed(() => this.note() !== null);
  protected readonly canSave = computed(() => this.title().trim().length > 0);

  constructor() {
    afterNextRender(() => this.titleInput()?.nativeElement.focus());
  }

  protected onTitle(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
  }

  protected onBody(event: Event): void {
    this.body.set((event.target as HTMLTextAreaElement).value);
  }

  protected onTags(event: Event): void {
    this.tags.set((event.target as HTMLInputElement).value);
  }

  protected togglePreview(next: boolean): void {
    this.preview.set(next);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (!this.canSave()) return;
    this.saved.emit({
      title: this.title(),
      body: this.body(),
      tags: this.tags().split(','),
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  /** Keyboard shortcuts scoped to the form, so they never fight the page. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      this.submit(event);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
    }
  }
}
