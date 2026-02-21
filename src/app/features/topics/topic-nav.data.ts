import { TopicNavItem } from '../../shared/interfaces/topic-nav-item';

export const TOPICS: TopicNavItem[] = [
  {
    id: 'javascript',
    labelKey: 'NAV_TOPIC_javascript',
    children: [
      { id: 'types', labelKey: 'NAV_SUB_javascript_types' },
      { id: 'functions', labelKey: 'NAV_SUB_javascript_functions' },
      { id: 'async', labelKey: 'NAV_SUB_javascript_async' }
    ]
  },
  {
    id: 'angular',
    labelKey: 'NAV_TOPIC_angular',
    children: [
      { id: 'components', labelKey: 'NAV_SUB_angular_components' },
      { id: 'routing', labelKey: 'NAV_SUB_angular_routing' },
      { id: 'forms', labelKey: 'NAV_SUB_angular_forms' }
    ]
  },
  {
    id: 'scss',
    labelKey: 'NAV_TOPIC_scss',
    children: [
      { id: 'variables', labelKey: 'NAV_SUB_scss_variables' },
      { id: 'mixins', labelKey: 'NAV_SUB_scss_mixins' },
      { id: 'nesting', labelKey: 'NAV_SUB_scss_nesting' }
    ]
  },
  {
    id: 'html',
    labelKey: 'NAV_TOPIC_html',
    children: [
      { id: 'semantics', labelKey: 'NAV_SUB_html_semantics' },
      { id: 'forms', labelKey: 'NAV_SUB_html_forms' },
      { id: 'a11y', labelKey: 'NAV_SUB_html_a11y' }
    ]
  },
  {
    id: 'rxjs',
    labelKey: 'NAV_TOPIC_rxjs',
    children: [
      { id: 'observables', labelKey: 'NAV_SUB_rxjs_observables' },
      { id: 'operators', labelKey: 'NAV_SUB_rxjs_operators' },
      { id: 'subjects', labelKey: 'NAV_SUB_rxjs_subjects' }
    ]
  },
  {
    id: 'ngrx',
    labelKey: 'NAV_TOPIC_ngrx',
    children: [
      { id: 'store', labelKey: 'NAV_SUB_ngrx_store' },
      { id: 'actions', labelKey: 'NAV_SUB_ngrx_actions' },
      { id: 'effects', labelKey: 'NAV_SUB_ngrx_effects' }
    ]
  }
];
