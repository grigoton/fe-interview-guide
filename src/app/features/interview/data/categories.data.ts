import { InterviewCategory } from '../interfaces/question.interface';

/**
 * The five top-level interview modules, in the order presented in the UI.
 * Display strings live in the i18n files under the `INT_CAT_*` keys.
 */
export const INTERVIEW_CATEGORIES: InterviewCategory[] = [
  {
    id: 'javascript-typescript',
    titleKey: 'INT_CAT_javascript-typescript',
    descriptionKey: 'INT_CAT_DESC_javascript-typescript',
    icon: '🟨'
  },
  {
    id: 'angular-core',
    titleKey: 'INT_CAT_angular-core',
    descriptionKey: 'INT_CAT_DESC_angular-core',
    icon: '🅰️'
  },
  {
    id: 'rxjs-state',
    titleKey: 'INT_CAT_rxjs-state',
    descriptionKey: 'INT_CAT_DESC_rxjs-state',
    icon: '🔁'
  },
  {
    id: 'web-performance',
    titleKey: 'INT_CAT_web-performance',
    descriptionKey: 'INT_CAT_DESC_web-performance',
    icon: '⚡'
  },
  {
    id: 'architecture-testing',
    titleKey: 'INT_CAT_architecture-testing',
    descriptionKey: 'INT_CAT_DESC_architecture-testing',
    icon: '🏛️'
  },
  {
    id: 'live-coding',
    titleKey: 'INT_CAT_live-coding',
    descriptionKey: 'INT_CAT_DESC_live-coding',
    icon: '💻'
  }
];
