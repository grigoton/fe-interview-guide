import { LocalizedText } from '../../../shared/interfaces/localized-text';

/** One cell of the week tally: a figure and what it counts. */
export interface WeekTally {
  value: LocalizedText;
  label: LocalizedText;
}

/**
 * What the week adds up to. Static copy derived from the grid, not computed
 * stats — the ranges are the two workloads: the low figure is a week where
 * work fills the windows, the high one a week where it does not.
 */
export const WEEK_TALLY: WeekTally[] = [
  {
    value: { ru: '33 ч', en: '33 h' },
    label: { ru: 'продуктивного времени, ПН–ПТ', en: 'of productive time, Mon–Fri' },
  },
  { value: { ru: '4', en: '4' }, label: { ru: 'покерных сессии', en: 'poker sessions' } },
  {
    value: { ru: '3 × 2 ч', en: '3 × 2 h' },
    label: { ru: 'зал: ПН, СР, ПТ', en: 'gym: Mon, Wed, Fri' },
  },
  {
    value: { ru: '5–9 ч', en: '5–9 h' },
    label: { ru: 'курс по ИИ', en: 'AI course' },
  },
  {
    value: { ru: '5–7,5 ч', en: '5–7.5 h' },
    label: { ru: 'подготовка к собесам', en: 'interview prep' },
  },
  {
    value: { ru: 'до 3 ч', en: 'up to 3 h' },
    label: { ru: 'покерный сайт, только в лёгкую неделю', en: 'poker site, on a light week only' },
  },
  {
    value: { ru: '2 ч', en: '2 h' },
    label: { ru: 'разбор раздач, СБ и ВС', en: 'hand review, Sat and Sun' },
  },
  {
    value: { ru: '06:55', en: '06:55' },
    label: { ru: 'подъём все семь дней', en: 'alarm all seven days' },
  },
];
