import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleService } from '../../../core/services/locale.service';
import { NoteCardComponent } from '../note-card/note-card';
import { NoteEditorComponent } from '../note-editor/note-editor';
import { NotesService } from '../services/notes.service';
import { Course, CourseDraft, CourseNote, NoteDraft } from '../interfaces/note.interface';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';

const EMPTY_COURSE: CourseDraft = { title: '', provider: '', url: '' };

/**
 * Course notebook: a list of courses on the left, the notes of the selected
 * course on the right.
 *
 * All state lives in {@link NotesService} (and therefore in `localStorage`);
 * this component only owns transient UI state — which form is open, what is
 * expanded, and which delete is awaiting confirmation.
 */
@Component({
  selector: 'app-notes-page',
  standalone: true,
  imports: [TranslateModule, NoteCardComponent, NoteEditorComponent, LocalDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notes-page.html',
  styleUrl: './notes-page.scss',
})
export class NotesPageComponent {
  private readonly notesService = inject(NotesService);
  private readonly localeService = inject(LocaleService);
  private readonly injector = inject(Injector);

  private readonly courseTitleInput = viewChild<ElementRef<HTMLInputElement>>('courseTitleInput');

  protected readonly locale = this.localeService.currentLocale;
  protected readonly courses = this.notesService.courses;
  protected readonly activeCourse = this.notesService.activeCourse;
  protected readonly noteCounts = this.notesService.noteCountByCourse;

  // ── transient UI state ───────────────────────────────────────────────────
  protected readonly courseFormOpen = signal(false);
  /** Course being edited by the form, or `null` when it creates a new one. */
  protected readonly editingCourseId = signal<string | null>(null);
  protected readonly courseDraft = signal<CourseDraft>(EMPTY_COURSE);

  protected readonly noteEditorOpen = signal(false);
  protected readonly editingNote = signal<CourseNote | null>(null);

  protected readonly search = signal('');
  protected readonly expandedIds = signal<ReadonlySet<string>>(new Set());
  /** Id of the course or note whose delete button is awaiting confirmation. */
  protected readonly pendingDeleteId = signal<string | null>(null);
  protected readonly importResult = signal<{ courses: number; notes: number } | 'error' | null>(
    null,
  );

  // ── derived data ─────────────────────────────────────────────────────────
  protected readonly totalNotes = computed(() => this.notesService.notes().length);

  /** Notes of the open course, newest first. */
  protected readonly courseNotes = computed(() => {
    const course = this.activeCourse();
    if (!course) return [];
    return this.notesService
      .notes()
      .filter((n) => n.courseId === course.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  protected readonly filteredNotes = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.courseNotes();
    return this.courseNotes().filter((note) =>
      `${note.title} ${note.body} ${note.tags.join(' ')}`.toLowerCase().includes(term),
    );
  });

  protected readonly allExpanded = computed(() => {
    const visible = this.filteredNotes();
    if (!visible.length) return false;
    const open = this.expandedIds();
    return visible.every((note) => open.has(note.id));
  });

  // ── courses ──────────────────────────────────────────────────────────────

  protected noteCount(courseId: string): number {
    return this.noteCounts()[courseId] ?? 0;
  }

  protected selectCourse(id: string): void {
    this.notesService.selectCourse(id);
    this.closeNoteEditor();
    this.search.set('');
    this.pendingDeleteId.set(null);
  }

  protected startCourse(): void {
    this.editingCourseId.set(null);
    this.courseDraft.set(EMPTY_COURSE);
    this.openCourseForm();
  }

  protected editCourse(course: Course): void {
    this.editingCourseId.set(course.id);
    this.courseDraft.set({ title: course.title, provider: course.provider, url: course.url });
    this.openCourseForm();
  }

  protected setCourseField(field: keyof CourseDraft, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.courseDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  protected submitCourse(event: Event): void {
    event.preventDefault();
    const draft = this.courseDraft();
    if (!draft.title.trim()) return;

    const editingId = this.editingCourseId();
    if (editingId) {
      this.notesService.updateCourse(editingId, draft);
    } else {
      this.notesService.addCourse(draft);
    }
    this.closeCourseForm();
  }

  protected closeCourseForm(): void {
    this.courseFormOpen.set(false);
    this.editingCourseId.set(null);
    this.courseDraft.set(EMPTY_COURSE);
  }

  /** Two-step delete: the first click arms the button, the second confirms. */
  protected removeCourse(course: Course): void {
    if (this.pendingDeleteId() !== course.id) {
      this.pendingDeleteId.set(course.id);
      return;
    }
    this.notesService.removeCourse(course.id);
    this.pendingDeleteId.set(null);
    this.closeCourseForm();
    this.closeNoteEditor();
  }

  private openCourseForm(): void {
    this.courseFormOpen.set(true);
    this.pendingDeleteId.set(null);
    afterNextRender(() => this.courseTitleInput()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  // ── notes ────────────────────────────────────────────────────────────────

  protected startNote(): void {
    this.editingNote.set(null);
    this.noteEditorOpen.set(true);
    this.pendingDeleteId.set(null);
  }

  protected editNote(note: CourseNote): void {
    this.editingNote.set(note);
    this.noteEditorOpen.set(true);
    this.pendingDeleteId.set(null);
  }

  protected saveNote(draft: NoteDraft): void {
    const course = this.activeCourse();
    if (!course) return;

    const editing = this.editingNote();
    let id: string;
    if (editing) {
      this.notesService.updateNote(editing.id, draft);
      id = editing.id;
    } else {
      id = this.notesService.addNote(course.id, draft).id;
    }

    // A note you just wrote should be readable straight away.
    this.expandedIds.update((current) => new Set(current).add(id));
    this.closeNoteEditor();
  }

  protected closeNoteEditor(): void {
    this.noteEditorOpen.set(false);
    this.editingNote.set(null);
  }

  protected removeNote(note: CourseNote): void {
    if (this.pendingDeleteId() !== note.id) {
      this.pendingDeleteId.set(note.id);
      return;
    }
    this.notesService.removeNote(note.id);
    this.pendingDeleteId.set(null);
    if (this.editingNote()?.id === note.id) this.closeNoteEditor();
  }

  protected isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  protected toggleExpanded(id: string): void {
    // Any other interaction disarms a pending delete, so it can't be hit later
    // by accident.
    this.pendingDeleteId.set(null);
    this.expandedIds.update((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected toggleExpandAll(): void {
    const visible = this.filteredNotes();
    const collapse = this.allExpanded();
    this.expandedIds.update((current) => {
      const next = new Set(current);
      for (const note of visible) {
        if (collapse) next.delete(note.id);
        else next.add(note.id);
      }
      return next;
    });
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  // ── backup ───────────────────────────────────────────────────────────────

  /** Downloads the whole notebook as JSON — the only copy lives in this browser. */
  protected exportNotes(): void {
    const blob = new Blob([this.notesService.toJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `course-notes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset so picking the same file twice fires `change` again.
    input.value = '';
    if (!file) return;

    void file
      .text()
      .then((text) => this.importResult.set(this.notesService.importJson(text) ?? 'error'))
      .catch(() => this.importResult.set('error'));
  }
}
