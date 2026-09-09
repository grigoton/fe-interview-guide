import { LocalizedText } from '../../../shared/interfaces/localized-text';

/**
 * Difficulty level of an interview question.
 * - Medium  — solid mid-level understanding expected.
 * - Hard    — strong senior knowledge, edge cases, trade-offs.
 * - Expert  — tricky "under the hood" / staff-level insight.
 */
export type QuestionLevel = 'Medium' | 'Hard' | 'Expert';

/**
 * Stable identifiers for the top-level interview modules.
 *
 * Ordered as the filter sidebar presents them. The language, the reactive
 * library, the state library, the framework and the platform are separate
 * modules: TypeScript-only theory is not mixed into `js-state`, RxJS and NgRx
 * have their own modules rather than sharing the JS one, and transport/browser
 * topics live in `network-browser` rather than being scattered across
 * performance and architecture.
 */
export type InterviewCategoryId =
  | 'js-state'
  | 'rxjs'
  | 'ngrx'
  | 'html-css-performance'
  | 'architecture-testing'
  | 'angular-signals'
  | 'live-coding'
  | 'typescript'
  | 'network-browser'
  | 'hr-questions';

/**
 * Learning progress status for a single question, persisted locally.
 * - `new`      — not yet touched (default; not stored explicitly).
 * - `learning` — currently studying / revisiting.
 * - `known`    — confidently learned.
 */
export type ProgressStatus = 'new' | 'learning' | 'known';

// Shared with the schedule feature; re-exported so the existing
// `LocalizedText` imports from this file keep working.
export type { LocalizedText };

/**
 * A single interview question with a deep, bilingual answer.
 *
 * `answer.ru` / `answer.en` may contain Markdown (headings, lists, bold,
 * inline code and fenced ```lang code blocks) — rendered by `MarkdownPipe`.
 * `codeSnippet` is an optional standalone, highlighted code example shown
 * below the answer.
 */
export interface InterviewQuestion {
  /** Unique, human-readable id, e.g. `'ts-001'`, `'ng-012'`. */
  id: string;
  category: InterviewCategoryId;
  level: QuestionLevel;
  /** Lowercase, kebab-case topical tags, e.g. `['generics', 'conditional-types']`. */
  tags: string[];
  question: LocalizedText;
  /** Detailed answer; Markdown allowed. */
  answer: LocalizedText;
  /** Optional standalone code example (plain string, monospace block). */
  codeSnippet?: string;
}

/**
 * Top-level interview module metadata (used for navigation, tabs, counters).
 */
export interface InterviewCategory {
  id: InterviewCategoryId;
  /** i18n key for the display name. */
  titleKey: string;
  /** i18n key for a short description. */
  descriptionKey: string;
  /** Material symbol / emoji used as a visual marker. */
  icon: string;
}
