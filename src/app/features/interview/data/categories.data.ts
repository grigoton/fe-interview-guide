import { InterviewCategory } from '../interfaces/question.interface';

/**
 * The top-level interview modules, in the order the filter sidebar lists them.
 * Display strings live in the i18n files under the `INT_CAT_*` keys.
 */
export const INTERVIEW_CATEGORIES: InterviewCategory[] = [
  {
    id: 'js-state',
    titleKey: 'INT_CAT_js-state',
    descriptionKey: 'INT_CAT_DESC_js-state',
    icon: '🧠'
  },
  {
    id: 'html-css-performance',
    titleKey: 'INT_CAT_html-css-performance',
    descriptionKey: 'INT_CAT_DESC_html-css-performance',
    icon: '⚡'
  },
  {
    id: 'architecture-testing',
    titleKey: 'INT_CAT_architecture-testing',
    descriptionKey: 'INT_CAT_DESC_architecture-testing',
    icon: '🏛️'
  },
  {
    id: 'angular-signals',
    titleKey: 'INT_CAT_angular-signals',
    descriptionKey: 'INT_CAT_DESC_angular-signals',
    icon: '🅰️'
  },
  {
    id: 'live-coding',
    titleKey: 'INT_CAT_live-coding',
    descriptionKey: 'INT_CAT_DESC_live-coding',
    icon: '💻'
  },
  {
    id: 'typescript',
    titleKey: 'INT_CAT_typescript',
    descriptionKey: 'INT_CAT_DESC_typescript',
    icon: '🔷'
  },
  {
    id: 'network-browser',
    titleKey: 'INT_CAT_network-browser',
    descriptionKey: 'INT_CAT_DESC_network-browser',
    icon: '🌐'
  },
  {
    id: 'hr-questions',
    titleKey: 'INT_CAT_hr-questions',
    descriptionKey: 'INT_CAT_DESC_hr-questions',
    icon: '🤝'
  }
];
