import { ScheduleBlock, ScheduleDay } from '../interfaces/schedule.interface';

/**
 * The fixed week, exactly as written in the spec.
 *
 * This is data, not settings: nothing in the app edits it. Times are local
 * `"HH:MM"` strings compared against the device clock.
 *
 * Rules baked into the numbers below (they are not enforced at runtime — the
 * data already satisfies them):
 * - the work block and the 17:00 session start never move;
 * - on a session day everything before 17:00 finishes before 17:00;
 * - a session's end is unknown and is never displayed anywhere.
 */

/** Weekday mornings are identical: warm-up 07:00, dog 07:15, shower 07:55. */
function weekdayMorning(day: string): ScheduleBlock[] {
  return [
    {
      id: `${day}-0700`,
      start: '07:00',
      type: 'routine',
      title: { ru: 'Разминка', en: 'Warm-up' },
      note: { ru: '15 мин', en: '15 min' },
    },
    {
      id: `${day}-0715`,
      start: '07:15',
      type: 'routine',
      title: { ru: 'Собака', en: 'Dog walk' },
      note: { ru: '40 мин', en: '40 min' },
    },
    {
      id: `${day}-0755`,
      start: '07:55',
      type: 'routine',
      title: { ru: 'Душ', en: 'Shower' },
    },
  ];
}

const MONDAY: ScheduleDay = {
  id: 'mon',
  weekday: 1,
  name: { ru: 'Понедельник', en: 'Monday' },
  tag: { ru: 'зал, сессия', en: 'gym, session' },
  blocks: [
    ...weekdayMorning('mon'),
    {
      id: 'mon-0815',
      start: '08:15',
      type: 'anchor',
      title: { ru: 'Зал', en: 'Gym' },
      note: { ru: '1:50 с дорогой', en: '1:50 incl. travel' },
    },
    {
      id: 'mon-1005',
      start: '10:05',
      type: 'meal',
      title: { ru: 'Завтрак', en: 'Breakfast' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'mon-1050',
      start: '10:50',
      type: 'work',
      title: { ru: 'Работа', en: 'Work' },
      note: { ru: '3 ч', en: '3 h' },
    },
    {
      id: 'mon-1350',
      start: '13:50',
      type: 'meal',
      title: { ru: 'Обед и собака', en: 'Lunch and dog' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'mon-1435',
      start: '14:35',
      type: 'work',
      title: { ru: 'Работа', en: 'Work' },
      note: { ru: '2 ч — итого 5 ч', en: '2 h — 5 h in total' },
    },
    {
      id: 'mon-1635',
      start: '16:35',
      type: 'meal',
      title: { ru: 'Ужин', en: 'Dinner' },
      note: { ru: 'перед сессией', en: 'before the session' },
    },
    {
      id: 'mon-1700',
      start: '17:00',
      type: 'session',
      title: { ru: 'Покерная сессия', en: 'Poker session' },
      note: { ru: 'конец непредсказуем', en: 'end is unpredictable' },
      flexible: true,
    },
  ],
};

const TUESDAY: ScheduleDay = {
  id: 'tue',
  weekday: 2,
  name: { ru: 'Вторник', en: 'Tuesday' },
  tag: { ru: 'курс и поиск работы', en: 'course and job search' },
  blocks: [
    ...weekdayMorning('tue'),
    {
      id: 'tue-0815',
      start: '08:15',
      type: 'meal',
      title: { ru: 'Завтрак', en: 'Breakfast' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'tue-0900',
      start: '09:00',
      type: 'work',
      title: { ru: 'Работа', en: 'Work' },
      note: { ru: '3 ч', en: '3 h' },
    },
    {
      id: 'tue-1200',
      start: '12:00',
      type: 'meal',
      title: { ru: 'Обед и собака', en: 'Lunch and dog' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'tue-1245',
      start: '12:45',
      type: 'work',
      title: { ru: 'Работа', en: 'Work' },
      note: { ru: '2 ч — итого 5 ч', en: '2 h — 5 h in total' },
    },
    {
      id: 'tue-1445',
      start: '14:45',
      type: 'anchor',
      title: { ru: 'Курс Anthropic', en: 'Anthropic course' },
      note: { ru: '2 ч', en: '2 h' },
    },
    {
      id: 'tue-1645',
      start: '16:45',
      type: 'meal',
      title: { ru: 'Ужин', en: 'Dinner' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'tue-1730',
      start: '17:30',
      type: 'anchor',
      title: { ru: 'Поиск работы', en: 'Job search' },
      note: { ru: '2 ч 15 мин', en: '2 h 15 min' },
    },
    {
      id: 'tue-1945',
      start: '19:45',
      type: 'free',
      title: { ru: 'Свободно', en: 'Free' },
      note: { ru: 'вечер свободен', en: 'the evening is yours' },
      flexible: true,
    },
  ],
};

const WEDNESDAY: ScheduleDay = {
  id: 'wed',
  weekday: 3,
  name: { ru: 'Среда', en: 'Wednesday' },
  tag: { ru: 'зал, вечер занят', en: 'gym, evening taken' },
  blocks: [
    ...weekdayMorning('wed'),
    {
      id: 'wed-0815',
      start: '08:15',
      type: 'anchor',
      title: { ru: 'Зал', en: 'Gym' },
      note: { ru: '1:50 с дорогой', en: '1:50 incl. travel' },
    },
    {
      id: 'wed-1005',
      start: '10:05',
      type: 'meal',
      title: { ru: 'Завтрак', en: 'Breakfast' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'wed-1050',
      start: '10:50',
      type: 'work',
      title: { ru: 'Работа', en: 'Work' },
      note: { ru: '3 ч', en: '3 h' },
    },
    {
      id: 'wed-1350',
      start: '13:50',
      type: 'meal',
      title: { ru: 'Обед и собака', en: 'Lunch and dog' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'wed-1435',
      start: '14:35',
      type: 'work',
      title: { ru: 'Работа', en: 'Work' },
      note: { ru: '2 ч — итого 5 ч', en: '2 h — 5 h in total' },
    },
    {
      id: 'wed-1635',
      start: '16:35',
      type: 'project',
      title: { ru: 'Свой проект', en: 'Own project' },
      note: { ru: '1 ч 10 мин', en: '1 h 10 min' },
    },
    {
      id: 'wed-1745',
      start: '17:45',
      type: 'busy',
      title: { ru: 'Сборы, выход', en: 'Get ready, head out' },
      note: { ru: 'вечер занят, ужин вне дома', en: 'evening taken, dinner out' },
      flexible: true,
    },
  ],
};

const THURSDAY: ScheduleDay = {
  id: 'thu',
  weekday: 4,
  name: { ru: 'Четверг', en: 'Thursday' },
  tag: { ru: 'поиск работы, сессия', en: 'job search, session' },
  blocks: [
    ...weekdayMorning('thu'),
    {
      id: 'thu-0815',
      start: '08:15',
      type: 'meal',
      title: { ru: 'Завтрак', en: 'Breakfast' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'thu-0900',
      start: '09:00',
      type: 'work',
      title: { ru: 'Работа', en: 'Work' },
      note: { ru: '3 ч', en: '3 h' },
    },
    {
      id: 'thu-1200',
      start: '12:00',
      type: 'meal',
      title: { ru: 'Обед и собака', en: 'Lunch and dog' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'thu-1245',
      start: '12:45',
      type: 'work',
      title: { ru: 'Работа', en: 'Work' },
      note: { ru: '2 ч — итого 5 ч', en: '2 h — 5 h in total' },
    },
    {
      id: 'thu-1445',
      start: '14:45',
      type: 'anchor',
      title: { ru: 'Поиск работы', en: 'Job search' },
      note: { ru: '1 ч 45 мин', en: '1 h 45 min' },
    },
    {
      id: 'thu-1630',
      start: '16:30',
      type: 'meal',
      title: { ru: 'Ужин', en: 'Dinner' },
      note: { ru: 'перед сессией', en: 'before the session' },
    },
    {
      id: 'thu-1700',
      start: '17:00',
      type: 'session',
      title: { ru: 'Покерная сессия', en: 'Poker session' },
      note: { ru: 'конец непредсказуем', en: 'end is unpredictable' },
      flexible: true,
    },
  ],
};

const FRIDAY: ScheduleDay = {
  id: 'fri',
  weekday: 5,
  name: { ru: 'Пятница', en: 'Friday' },
  tag: { ru: 'зал, курс', en: 'gym, course' },
  blocks: [
    ...weekdayMorning('fri'),
    {
      id: 'fri-0815',
      start: '08:15',
      type: 'anchor',
      title: { ru: 'Зал', en: 'Gym' },
      note: { ru: '1:50 с дорогой', en: '1:50 incl. travel' },
    },
    {
      id: 'fri-1005',
      start: '10:05',
      type: 'meal',
      title: { ru: 'Завтрак', en: 'Breakfast' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'fri-1050',
      start: '10:50',
      type: 'work',
      title: { ru: 'Работа', en: 'Work' },
      note: { ru: '3 ч', en: '3 h' },
    },
    {
      id: 'fri-1350',
      start: '13:50',
      type: 'meal',
      title: { ru: 'Обед и собака', en: 'Lunch and dog' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'fri-1435',
      start: '14:35',
      type: 'work',
      title: { ru: 'Работа', en: 'Work' },
      note: { ru: '2 ч — итого 5 ч', en: '2 h — 5 h in total' },
    },
    {
      id: 'fri-1635',
      start: '16:35',
      type: 'meal',
      title: { ru: 'Ужин', en: 'Dinner' },
      note: { ru: '40 мин', en: '40 min' },
    },
    {
      id: 'fri-1715',
      start: '17:15',
      type: 'anchor',
      title: { ru: 'Курс Anthropic', en: 'Anthropic course' },
      note: { ru: '2 ч', en: '2 h' },
    },
    {
      id: 'fri-1915',
      start: '19:15',
      type: 'free',
      title: { ru: 'Свободно', en: 'Free' },
      note: { ru: 'чтение, отдых', en: 'reading, rest' },
      flexible: true,
    },
  ],
};

const SATURDAY: ScheduleDay = {
  id: 'sat',
  weekday: 6,
  weekend: true,
  name: { ru: 'Суббота', en: 'Saturday' },
  tag: { ru: 'свободное утро, сессия', en: 'free morning, session' },
  blocks: [
    {
      id: 'sat-0830',
      start: '08:30',
      type: 'routine',
      title: { ru: 'Разминка, собака', en: 'Warm-up, dog' },
    },
    {
      id: 'sat-0915',
      start: '09:15',
      type: 'free',
      title: { ru: 'Завтрак вне дома, с собакой', en: 'Breakfast out, with the dog' },
      note: { ru: 'без привязки ко времени', en: 'no fixed time' },
      flexible: true,
    },
    {
      id: 'sat-free',
      start: null,
      timeLabel: { ru: 'до 13:15', en: 'until 13:15' },
      type: 'free',
      title: { ru: 'Свободно', en: 'Free' },
      note: { ru: 'свои дела, отдых', en: 'errands, rest' },
    },
    {
      id: 'sat-1315',
      start: '13:15',
      type: 'meal',
      title: { ru: 'Обед и собака', en: 'Lunch and dog' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'sat-1400',
      start: '14:00',
      type: 'project',
      title: { ru: 'Свой проект', en: 'Own project' },
      note: { ru: '1,5 ч', en: '1.5 h' },
    },
    {
      id: 'sat-1530',
      start: '15:30',
      type: 'meal',
      title: { ru: 'Свободно, ужин', en: 'Free, dinner' },
    },
    {
      id: 'sat-1700',
      start: '17:00',
      type: 'session',
      title: { ru: 'Покерная сессия', en: 'Poker session' },
      note: { ru: 'конец непредсказуем', en: 'end is unpredictable' },
      flexible: true,
    },
  ],
};

const SUNDAY: ScheduleDay = {
  id: 'sun',
  weekday: 0,
  weekend: true,
  name: { ru: 'Воскресенье', en: 'Sunday' },
  tag: { ru: 'покер, проект, быт', en: 'poker, project, chores' },
  blocks: [
    {
      id: 'sun-0830',
      start: '08:30',
      type: 'routine',
      title: { ru: 'Разминка, собака', en: 'Warm-up, dog' },
    },
    {
      id: 'sun-0915',
      start: '09:15',
      type: 'meal',
      title: { ru: 'Завтрак', en: 'Breakfast' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'sun-1000',
      start: '10:00',
      type: 'anchor',
      title: { ru: 'Покер: теория и разбор рук', en: 'Poker: theory and hand review' },
      note: { ru: '1,5 ч', en: '1.5 h' },
    },
    {
      id: 'sun-1130',
      start: '11:30',
      type: 'anchor',
      title: { ru: 'Поиск работы', en: 'Job search' },
      note: { ru: '1 ч', en: '1 h' },
    },
    {
      id: 'sun-1230',
      start: '12:30',
      type: 'meal',
      title: { ru: 'Обед и собака', en: 'Lunch and dog' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'sun-1315',
      start: '13:15',
      type: 'project',
      title: { ru: 'Свой проект', en: 'Own project' },
      note: { ru: '1,5 ч', en: '1.5 h' },
    },
    {
      id: 'sun-1445',
      start: '14:45',
      type: 'chores',
      title: { ru: 'Готовка на неделю, быт', en: 'Cooking for the week, chores' },
      note: { ru: '1 ч 45 мин', en: '1 h 45 min' },
    },
    {
      id: 'sun-1630',
      start: '16:30',
      type: 'meal',
      title: { ru: 'Ужин, итоги недели', en: 'Dinner, week review' },
      note: { ru: '15 мин на план', en: '15 min for planning' },
    },
    {
      id: 'sun-1700',
      start: '17:00',
      type: 'session',
      title: { ru: 'Покерная сессия', en: 'Poker session' },
      note: { ru: 'конец непредсказуем', en: 'end is unpredictable' },
      flexible: true,
    },
  ],
};

/**
 * The shortened day after a late session. Switched on by hand, never
 * automatically. The gym and the day block are already dropped here — the
 * order in which blocks get cut is fixed: gym first, then the day block, then
 * the own project.
 */
export const SPARE_DAY: ScheduleDay = {
  id: 'spare',
  weekday: null,
  name: { ru: 'После поздней сессии', en: 'After a late session' },
  tag: { ru: 'запасной день', en: 'spare day' },
  hint: {
    ru: 'Включается, если лёг позже 01:00. Подъём 7,5 ч после отбоя, но не позже 09:20 в день с сессией.',
    en: 'Switch it on after going to bed past 01:00. Get up 7.5 h after lights out, and no later than 09:20 on a session day.',
  },
  blocks: [
    {
      id: 'spare-0900',
      start: '09:00',
      type: 'routine',
      title: { ru: 'Разминка, собака', en: 'Warm-up, dog' },
      note: { ru: '50 мин', en: '50 min' },
    },
    {
      id: 'spare-0950',
      start: '09:50',
      type: 'routine',
      title: { ru: 'Душ', en: 'Shower' },
    },
    {
      id: 'spare-1010',
      start: '10:10',
      type: 'meal',
      title: { ru: 'Завтрак', en: 'Breakfast' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'spare-1055',
      start: '10:55',
      type: 'work',
      title: { ru: 'Работа', en: 'Work' },
      note: { ru: '3 ч', en: '3 h' },
    },
    {
      id: 'spare-1355',
      start: '13:55',
      type: 'meal',
      title: { ru: 'Обед и собака', en: 'Lunch and dog' },
      note: { ru: '45 мин', en: '45 min' },
    },
    {
      id: 'spare-1440',
      start: '14:40',
      type: 'work',
      title: { ru: 'Работа', en: 'Work' },
      note: { ru: '2 ч — итого 5 ч', en: '2 h — 5 h in total' },
    },
    {
      id: 'spare-1640',
      start: '16:40',
      type: 'meal',
      title: { ru: 'Ужин', en: 'Dinner' },
    },
    {
      id: 'spare-1700',
      start: '17:00',
      type: 'session',
      title: { ru: 'Сессия или вечерний блок', en: 'Session or evening block' },
      note: {
        ru: 'зал пропущен, дневной блок ушёл в резерв',
        en: 'gym skipped, day block moved to the reserve',
      },
      flexible: true,
    },
  ],
};

/** Monday → Sunday, in reading order. */
export const WEEK: ScheduleDay[] = [
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FRIDAY,
  SATURDAY,
  SUNDAY,
];
