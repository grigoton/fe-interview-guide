import { InterviewQuestion } from '../interfaces/question.interface';
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

export { INTERVIEW_CATEGORIES } from './categories.data';

/**
 * Flat list of every interview question across all six modules.
 * Order follows the category order so callers can group/filter cheaply.
 */
export const ALL_QUESTIONS: InterviewQuestion[] = [
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
  ...LIVE_CODING_QUESTIONS
];
