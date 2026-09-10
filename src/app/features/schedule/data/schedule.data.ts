import { BlockGoal, ScheduleBlock, ScheduleDay, Workload } from '../interfaces/schedule.interface';

/**
 * The fixed week, exactly as written in the spec.
 *
 * This is data, not settings: nothing in the app edits it. Times are local
 * `"HH:MM"` strings compared against the device clock.
 *
 * Rules baked into the numbers below (they are not enforced at runtime — the
 * data already satisfies them):
 * - the morning chain is identical on all seven days, 06:55 → 08:50;
 * - the gym days (Mon, Wed, Fri) push breakfast to 11:00 and the productive
 *   window to 12:00; the session days (Tue, Thu) start it at 10:00;
 * - a session's end is unknown and is never displayed anywhere;
 * - the productive window never changes length — only its goals do, and which
 *   list applies is the one thing the day is asked about.
 */

/**
 * 06:55 → 08:50, the same every day of the week.
 *
 * Getting out of bed and the bathroom are one block on purpose: the spec gives
 * them the same 07:05, and a block that ends the moment it starts could never
 * be shown as running.
 */
function morning(day: string): ScheduleBlock[] {
  return [
    {
      id: `${day}-0655`,
      start: '06:55',
      type: 'routine',
      title: { ru: 'Будильник, пробуждение', en: 'Alarm, wake up' },
      note: { ru: '10 минут до подъёма', en: '10 minutes before getting up' },
    },
    {
      id: `${day}-0705`,
      start: '07:05',
      type: 'routine',
      title: { ru: 'Подъём, утренний туалет', en: 'Out of bed, bathroom' },
      note: { ru: '10 мин', en: '10 min' },
    },
    {
      id: `${day}-0715`,
      start: '07:15',
      type: 'routine',
      title: { ru: 'Разминка', en: 'Warm-up' },
      note: { ru: '10 мин', en: '10 min' },
    },
    {
      id: `${day}-0725`,
      start: '07:25',
      type: 'routine',
      title: { ru: 'Сборы на прогулку', en: 'Getting ready for the walk' },
      note: { ru: '10 мин', en: '10 min' },
    },
    {
      id: `${day}-0735`,
      start: '07:35',
      type: 'routine',
      title: { ru: 'Выход с собакой', en: 'Out with the dog' },
      note: { ru: '50 мин', en: '50 min' },
    },
    {
      id: `${day}-0825`,
      start: '08:25',
      type: 'routine',
      title: { ru: 'Дома: помыть собаку, раздеться', en: 'Home: wash the dog, get changed' },
      note: { ru: '15 мин', en: '15 min' },
    },
    {
      id: `${day}-0840`,
      start: '08:40',
      type: 'routine',
      title: { ru: 'Душ', en: 'Shower' },
      note: { ru: '10 мин', en: '10 min' },
    },
  ];
}

/** The gym morning: 09:00 → 11:00, then breakfast until noon. */
function gymMorning(day: string): ScheduleBlock[] {
  return [
    {
      id: `${day}-0900`,
      start: '09:00',
      type: 'anchor',
      title: { ru: 'Зал', en: 'Gym' },
      note: { ru: '2 ч', en: '2 h' },
    },
    {
      id: `${day}-1100`,
      start: '11:00',
      type: 'meal',
      title: { ru: 'Завтрак', en: 'Breakfast' },
      note: { ru: '1 ч', en: '1 h' },
    },
  ];
}

/** Course and interview prep, the two goals that appear on every weekday. */
function goal(
  id: string,
  title: { ru: string; en: string },
  note: { ru: string; en: string },
): BlockGoal {
  return { id, title, note };
}

const COURSE = { ru: 'Курс по ИИ', en: 'AI course' };
const PREP = { ru: 'Подготовка к собесам', en: 'Interview prep' };
const POKER_SITE = { ru: 'Работа над покерным сайтом', en: 'Work on the poker site' };
const MAX_WORK = { ru: 'Работа по максимуму', en: 'Work, as much as there is' };

/**
 * A heavy day is the same on all five weekdays: work fills the window, and an
 * hour of the course and an hour of prep are still due inside it.
 */
function heavyGoals(day: string): BlockGoal[] {
  return [
    goal(`${day}-g-work`, MAX_WORK, { ru: 'сколько её есть', en: 'however much there is' }),
    goal(`${day}-g-course`, COURSE, { ru: '1 ч', en: '1 h' }),
    goal(`${day}-g-prep`, PREP, { ru: '1 ч', en: '1 h' }),
  ];
}

/**
 * Goals of a gym day's window (Mon, Wed, Fri) — seven hours, so a light day
 * also has room for the poker site.
 *
 * `pokerSiteExtra` marks Wednesday: the window is an hour shorter there, so the
 * site is only picked up if the rest closed early.
 */
function longDayGoals(day: string, pokerSiteExtra = false): Record<Workload, BlockGoal[]> {
  return {
    heavy: heavyGoals(day),
    light: [
      goal(`${day}-g-course-l`, COURSE, { ru: '2 ч', en: '2 h' }),
      goal(`${day}-g-prep-l`, PREP, { ru: '1,5 ч', en: '1.5 h' }),
      {
        ...goal(`${day}-g-site-l`, POKER_SITE, { ru: '1 ч', en: '1 h' }),
        extra: pokerSiteExtra,
      },
    ],
  };
}

/**
 * Goals of a session day's window (Tue, Thu) — half an hour shorter and with a
 * session waiting at the end of it, so a light day stops at the two hours and
 * a half that always have to happen.
 */
function sessionDayGoals(day: string): Record<Workload, BlockGoal[]> {
  return {
    heavy: heavyGoals(day),
    light: [
      goal(`${day}-g-course-l`, COURSE, { ru: '1,5 ч', en: '1.5 h' }),
      goal(`${day}-g-prep-l`, PREP, { ru: '1,5 ч', en: '1.5 h' }),
    ],
  };
}

/** The poker session — the one block whose finish is never predicted. */
function session(day: string, start: string, note: { ru: string; en: string }): ScheduleBlock {
  return {
    id: `${day}-session`,
    start,
    type: 'session',
    title: { ru: 'Покерная сессия', en: 'Poker session' },
    note,
    flexible: true,
  };
}

const OPEN_END = { ru: 'конец непредсказуем', en: 'end is unpredictable' };

const MONDAY: ScheduleDay = {
  id: 'mon',
  weekday: 1,
  name: { ru: 'Понедельник', en: 'Monday' },
  tag: { ru: 'зал, длинный день', en: 'gym, long day' },
  blocks: [
    ...morning('mon'),
    ...gymMorning('mon'),
    {
      id: 'mon-1200',
      start: '12:00',
      type: 'work',
      title: { ru: 'Продуктивное время', en: 'Productive time' },
      note: { ru: '7 ч, до 19:00', en: '7 h, until 19:00' },
      goals: longDayGoals('mon'),
    },
    {
      id: 'mon-1900',
      start: '19:00',
      type: 'free',
      title: { ru: 'Вечер свободен', en: 'The evening is free' },
      flexible: true,
    },
  ],
};

const TUESDAY: ScheduleDay = {
  id: 'tue',
  weekday: 2,
  name: { ru: 'Вторник', en: 'Tuesday' },
  tag: { ru: 'сессия в 16:30', en: 'session at 16:30' },
  blocks: [
    ...morning('tue'),
    {
      id: 'tue-0900',
      start: '09:00',
      type: 'meal',
      title: { ru: 'Завтрак', en: 'Breakfast' },
      note: { ru: '1 ч', en: '1 h' },
    },
    {
      id: 'tue-1000',
      start: '10:00',
      type: 'work',
      title: { ru: 'Продуктивное время', en: 'Productive time' },
      note: { ru: '6 ч 30 мин, до 16:30', en: '6 h 30 min, until 16:30' },
      goals: sessionDayGoals('tue'),
    },
    session('tue', '16:30', OPEN_END),
  ],
};

const WEDNESDAY: ScheduleDay = {
  id: 'wed',
  weekday: 3,
  name: { ru: 'Среда', en: 'Wednesday' },
  tag: { ru: 'зал, до 18:00', en: 'gym, until 18:00' },
  blocks: [
    ...morning('wed'),
    ...gymMorning('wed'),
    {
      id: 'wed-1200',
      start: '12:00',
      type: 'work',
      title: { ru: 'Продуктивное время', en: 'Productive time' },
      note: { ru: '6 ч, до 18:00', en: '6 h, until 18:00' },
      goals: longDayGoals('wed', true),
    },
    {
      id: 'wed-1800',
      start: '18:00',
      type: 'free',
      title: { ru: 'Вечер свободен', en: 'The evening is free' },
      flexible: true,
    },
  ],
};

const THURSDAY: ScheduleDay = {
  id: 'thu',
  weekday: 4,
  name: { ru: 'Четверг', en: 'Thursday' },
  tag: { ru: 'сессия в 16:30', en: 'session at 16:30' },
  blocks: [
    ...morning('thu'),
    {
      id: 'thu-0900',
      start: '09:00',
      type: 'meal',
      title: { ru: 'Завтрак', en: 'Breakfast' },
      note: { ru: '1 ч', en: '1 h' },
    },
    {
      id: 'thu-1000',
      start: '10:00',
      type: 'work',
      title: { ru: 'Продуктивное время', en: 'Productive time' },
      note: { ru: '6 ч 30 мин, до 16:30', en: '6 h 30 min, until 16:30' },
      goals: sessionDayGoals('thu'),
    },
    session('thu', '16:30', OPEN_END),
  ],
};

const FRIDAY: ScheduleDay = {
  id: 'fri',
  weekday: 5,
  name: { ru: 'Пятница', en: 'Friday' },
  tag: { ru: 'зал, длинный день', en: 'gym, long day' },
  blocks: [
    ...morning('fri'),
    ...gymMorning('fri'),
    {
      id: 'fri-1200',
      start: '12:00',
      type: 'work',
      title: { ru: 'Продуктивное время', en: 'Productive time' },
      note: { ru: '7 ч, до 19:00', en: '7 h, until 19:00' },
      goals: longDayGoals('fri'),
    },
    {
      id: 'fri-1900',
      start: '19:00',
      type: 'free',
      title: { ru: 'Вечер свободен', en: 'The evening is free' },
      flexible: true,
    },
  ],
};

/**
 * Saturday and Sunday are identical: the morning chain, then no grid at all.
 *
 * The two hours that still have to happen carry no start time — they are shown
 * last, below the session, and are ticked whenever they are actually done.
 */
function weekend(day: 'sat' | 'sun', name: { ru: string; en: string }): ScheduleDay {
  return {
    id: day,
    weekday: day === 'sat' ? 6 : 0,
    weekend: true,
    name,
    tag: { ru: 'без сетки, сессия', en: 'no grid, session' },
    hint: {
      ru: 'Сетки нет. Держится только сессия и два часа занятий — разбор раздач и час обучения.',
      en: 'No grid. Only the session holds, plus two hours of study — hand review and an hour of learning.',
    },
    blocks: [
      ...morning(day),
      {
        id: `${day}-0900`,
        start: '09:00',
        type: 'free',
        title: { ru: 'День без сетки', en: 'A day with no grid' },
        note: { ru: 'планы по ситуации', en: 'plans as they come' },
        flexible: true,
      },
      session(day, '15:00', {
        ru: '15:00 или 16:00, конец непредсказуем',
        en: '15:00 or 16:00, end is unpredictable',
      }),
      {
        id: `${day}-hands`,
        start: null,
        timeLabel: { ru: 'в день', en: 'in the day' },
        type: 'anchor',
        title: { ru: 'Разбор раздач', en: 'Hand review' },
        note: { ru: '1 ч', en: '1 h' },
      },
      {
        id: `${day}-study`,
        start: null,
        timeLabel: { ru: 'в день', en: 'in the day' },
        type: 'anchor',
        title: { ru: 'Обучение на свой выбор', en: 'An hour of learning, your pick' },
        note: { ru: '1 ч, если нет других планов', en: '1 h, if nothing else is planned' },
      },
    ],
  };
}

const SATURDAY = weekend('sat', { ru: 'Суббота', en: 'Saturday' });
const SUNDAY = weekend('sun', { ru: 'Воскресенье', en: 'Sunday' });

/** Monday → Sunday, in reading order. */
export const WEEK: ScheduleDay[] = [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY];
