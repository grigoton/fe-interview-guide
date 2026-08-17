/**
 * A course the user is taking (or has finished) — the container its notes
 * belong to.
 */
export interface Course {
  id: string;
  title: string;
  /** Platform or author: "Anthropic", "Udemy", a person… May be empty. */
  provider: string;
  /** Link back to the course page. Only `http(s)` links are rendered. */
  url: string;
  /** ISO timestamp. */
  createdAt: string;
}

/** A single note inside a course. The body is Markdown. */
export interface CourseNote {
  id: string;
  courseId: string;
  title: string;
  /** Markdown source, rendered through `MarkdownPipe`. */
  body: string;
  tags: string[];
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
}

/** Editable fields of a course, as produced by the course form. */
export type CourseDraft = Pick<Course, 'title' | 'provider' | 'url'>;

/** Editable fields of a note, as produced by the note editor. */
export type NoteDraft = Pick<CourseNote, 'title' | 'body' | 'tags'>;
