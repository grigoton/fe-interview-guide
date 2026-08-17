import { Injectable, computed, signal } from '@angular/core';
import { Course, CourseDraft, CourseNote, NoteDraft } from '../interfaces/note.interface';

const STORAGE_KEY = 'fe-guide-course-notes';
const SCHEMA_VERSION = 1;

interface NotesSnapshot {
  courses: Course[];
  notes: CourseNote[];
  /** Course opened last, so a reload lands back where the user left off. */
  activeCourseId: string | null;
}

const EMPTY: NotesSnapshot = { courses: [], notes: [], activeCourseId: null };

/**
 * Courses and their notes, persisted to `localStorage`.
 *
 * This is the only place the notes data is written, so every mutation goes
 * through {@link mutate}: it updates the signal and flushes to storage in one
 * step. Newest items are kept at the head of their array, which is also the
 * order the UI shows them in.
 *
 * The whole store is user-authored, so everything read back from storage (or
 * from an imported file) is re-validated field by field before it is trusted.
 */
@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly state = signal<NotesSnapshot>(this.load());

  readonly courses = computed(() => this.state().courses);
  readonly notes = computed(() => this.state().notes);
  readonly activeCourseId = computed(() => this.state().activeCourseId);

  readonly activeCourse = computed(
    () => this.courses().find((c) => c.id === this.activeCourseId()) ?? null,
  );

  /** `{ [courseId]: noteCount }`, for the course list badges. */
  readonly noteCountByCourse = computed(() => {
    const out: Record<string, number> = {};
    for (const note of this.notes()) out[note.courseId] = (out[note.courseId] ?? 0) + 1;
    return out;
  });

  // ── courses ──────────────────────────────────────────────────────────────

  /** Creates a course and opens it. */
  addCourse(draft: CourseDraft): Course {
    const now = new Date().toISOString();
    const course: Course = {
      id: this.newId('c'),
      title: draft.title.trim(),
      provider: draft.provider.trim(),
      url: draft.url.trim(),
      createdAt: now,
    };
    this.mutate((s) => ({
      ...s,
      courses: [course, ...s.courses],
      activeCourseId: course.id,
    }));
    return course;
  }

  updateCourse(id: string, draft: CourseDraft): void {
    this.mutate((s) => ({
      ...s,
      courses: s.courses.map((c) =>
        c.id === id
          ? { ...c, title: draft.title.trim(), provider: draft.provider.trim(), url: draft.url.trim() }
          : c,
      ),
    }));
  }

  /** Removes a course together with its notes, then opens the next one. */
  removeCourse(id: string): void {
    this.mutate((s) => {
      const courses = s.courses.filter((c) => c.id !== id);
      return {
        courses,
        notes: s.notes.filter((n) => n.courseId !== id),
        activeCourseId:
          s.activeCourseId === id ? (courses[0]?.id ?? null) : s.activeCourseId,
      };
    });
  }

  selectCourse(id: string | null): void {
    this.mutate((s) => ({ ...s, activeCourseId: id }));
  }

  // ── notes ────────────────────────────────────────────────────────────────

  addNote(courseId: string, draft: NoteDraft): CourseNote {
    const now = new Date().toISOString();
    const note: CourseNote = {
      id: this.newId('n'),
      courseId,
      title: draft.title.trim(),
      body: draft.body,
      tags: this.cleanTags(draft.tags),
      createdAt: now,
      updatedAt: now,
    };
    this.mutate((s) => ({ ...s, notes: [note, ...s.notes] }));
    return note;
  }

  updateNote(id: string, draft: NoteDraft): void {
    const now = new Date().toISOString();
    this.mutate((s) => ({
      ...s,
      notes: s.notes.map((n) =>
        n.id === id
          ? {
              ...n,
              title: draft.title.trim(),
              body: draft.body,
              tags: this.cleanTags(draft.tags),
              updatedAt: now,
            }
          : n,
      ),
    }));
  }

  removeNote(id: string): void {
    this.mutate((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
  }

  // ── backup ───────────────────────────────────────────────────────────────

  /**
   * The notes live only in this browser, so a plain-JSON backup is the escape
   * hatch: it survives a cleared profile or a move to another machine.
   */
  toJson(): string {
    const { courses, notes } = this.state();
    return JSON.stringify({ version: SCHEMA_VERSION, courses, notes }, null, 2);
  }

  /**
   * Merges a previously exported file into the store: entries with a known id
   * are overwritten, the rest are appended. Returns how many entries came in,
   * or `null` if the file was not a readable export.
   */
  importJson(raw: string): { courses: number; notes: number } | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!parsed || typeof parsed !== 'object') return null;

    const payload = parsed as { courses?: unknown; notes?: unknown };
    const courses = this.normalizeList(payload.courses, (v) => this.normalizeCourse(v));
    const notes = this.normalizeList(payload.notes, (v) => this.normalizeNote(v));
    if (!courses.length && !notes.length) return null;

    this.mutate((s) => {
      const merged = {
        courses: this.mergeById(s.courses, courses),
        notes: this.mergeById(s.notes, notes),
      };
      return {
        ...merged,
        activeCourseId: s.activeCourseId ?? merged.courses[0]?.id ?? null,
      };
    });

    return { courses: courses.length, notes: notes.length };
  }

  // ── internals ────────────────────────────────────────────────────────────

  private mutate(update: (current: NotesSnapshot) => NotesSnapshot): void {
    this.state.update(update);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: SCHEMA_VERSION, ...this.state() }),
      );
    } catch {
      // storage full or unavailable — keep the in-memory state usable
    }
  }

  private load(): NotesSnapshot {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      return { ...EMPTY };
    }
    if (!raw) return { ...EMPTY };

    try {
      const parsed = JSON.parse(raw) as Partial<NotesSnapshot>;
      const courses = this.normalizeList(parsed.courses, (v) => this.normalizeCourse(v));
      const notes = this.normalizeList(parsed.notes, (v) => this.normalizeNote(v));
      const active =
        typeof parsed.activeCourseId === 'string' &&
        courses.some((c) => c.id === parsed.activeCourseId)
          ? parsed.activeCourseId
          : (courses[0]?.id ?? null);
      return { courses, notes, activeCourseId: active };
    } catch {
      return { ...EMPTY };
    }
  }

  private mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
    const byId = new Map(incoming.map((item) => [item.id, item]));
    const kept = current.map((item) => byId.get(item.id) ?? item);
    const known = new Set(current.map((item) => item.id));
    return [...incoming.filter((item) => !known.has(item.id)), ...kept];
  }

  private normalizeList<T>(value: unknown, normalize: (item: unknown) => T | null): T[] {
    if (!Array.isArray(value)) return [];
    return value.map(normalize).filter((item): item is T => item !== null);
  }

  private normalizeCourse(value: unknown): Course | null {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<Course>;
    if (typeof raw.id !== 'string' || typeof raw.title !== 'string') return null;
    return {
      id: raw.id,
      title: raw.title,
      provider: typeof raw.provider === 'string' ? raw.provider : '',
      url: typeof raw.url === 'string' ? raw.url : '',
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    };
  }

  private normalizeNote(value: unknown): CourseNote | null {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<CourseNote>;
    if (typeof raw.id !== 'string' || typeof raw.courseId !== 'string') return null;
    const createdAt =
      typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
    return {
      id: raw.id,
      courseId: raw.courseId,
      title: typeof raw.title === 'string' ? raw.title : '',
      body: typeof raw.body === 'string' ? raw.body : '',
      tags: this.cleanTags(Array.isArray(raw.tags) ? raw.tags : []),
      createdAt,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt,
    };
  }

  private cleanTags(tags: readonly unknown[]): string[] {
    const seen = new Set<string>();
    for (const tag of tags) {
      if (typeof tag !== 'string') continue;
      const clean = tag.trim();
      if (clean) seen.add(clean);
    }
    return [...seen];
  }

  private newId(prefix: string): string {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return `${prefix}_${uuid}`;
    // Older Safari / insecure contexts have no randomUUID.
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}
