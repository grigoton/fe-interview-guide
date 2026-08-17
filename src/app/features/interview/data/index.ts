import { InterviewQuestion } from '../interfaces/question.interface';
import { INTERVIEW_CATEGORIES } from './categories.data';
import { JS_TS_QUESTIONS } from './javascript-typescript.questions';
import { JS_TS_QUESTIONS_MORE } from './javascript-typescript.more.questions';
import { ANGULAR_CORE_QUESTIONS } from './angular-core.questions';
import { ANGULAR_CORE_QUESTIONS_MORE } from './angular-core.more.questions';
import { RXJS_STATE_QUESTIONS } from './rxjs-state.questions';
import { RXJS_STATE_QUESTIONS_MORE } from './rxjs-state.more.questions';
import { WEB_PERFORMANCE_QUESTIONS } from './web-performance.questions';
import { WEB_PERFORMANCE_QUESTIONS_MORE } from './web-performance.more.questions';
import { ARCHITECTURE_TESTING_QUESTIONS } from './architecture-testing.questions';
import { ARCHITECTURE_TESTING_QUESTIONS_MORE } from './architecture-testing.more.questions';
import { LIVE_CODING_QUESTIONS } from './live-coding.questions';
import { HR_QUESTIONS } from './hr-questions.questions';
import { HR_QUESTIONS_MORE } from './hr-questions.more.questions';

export { INTERVIEW_CATEGORIES } from './categories.data';

/**
 * Source files group questions by how they were authored, not by module — a
 * question's module is whatever its own `category` says. Import order is
 * therefore meaningless here; {@link ALL_QUESTIONS} re-groups the flat list.
 */
const AUTHORED_QUESTIONS: InterviewQuestion[] = [
  ...JS_TS_QUESTIONS,
  ...JS_TS_QUESTIONS_MORE,
  ...ANGULAR_CORE_QUESTIONS,
  ...ANGULAR_CORE_QUESTIONS_MORE,
  ...RXJS_STATE_QUESTIONS,
  ...RXJS_STATE_QUESTIONS_MORE,
  ...WEB_PERFORMANCE_QUESTIONS,
  ...WEB_PERFORMANCE_QUESTIONS_MORE,
  ...ARCHITECTURE_TESTING_QUESTIONS,
  ...ARCHITECTURE_TESTING_QUESTIONS_MORE,
  ...LIVE_CODING_QUESTIONS,
  ...HR_QUESTIONS,
  ...HR_QUESTIONS_MORE
];

const CATEGORY_ORDER = new Map(INTERVIEW_CATEGORIES.map((c, i) => [c.id, i]));

/**
 * Flat list of every interview question, grouped by module in sidebar order and
 * by id within a module, so callers can group/filter cheaply and the display
 * numbers below run in the same order the UI lists them.
 */
export const ALL_QUESTIONS: InterviewQuestion[] = [...AUTHORED_QUESTIONS].sort((a, b) => {
  const byCategory =
    (CATEGORY_ORDER.get(a.category) ?? Number.MAX_SAFE_INTEGER) -
    (CATEGORY_ORDER.get(b.category) ?? Number.MAX_SAFE_INTEGER);
  return byCategory || a.id.localeCompare(b.id);
});

/**
 * Short display number per question (`'001'`…), shown in the UI instead of the
 * authoring id. Derived from the position in {@link ALL_QUESTIONS}, so it moves
 * when questions are added — it labels a question, it does not identify one.
 * Progress stays keyed by {@link InterviewQuestion.id}.
 */
export const QUESTION_NUMBERS: ReadonlyMap<string, string> = new Map(
  ALL_QUESTIONS.map((q, i) => [q.id, String(i + 1).padStart(3, '0')])
);
