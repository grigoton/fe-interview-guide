import { LocalizedText } from '../../../shared/interfaces/localized-text';

/** One cell of the week tally: a figure and what it counts. */
export interface WeekTally {
  value: LocalizedText;
  label: LocalizedText;
}

/** A "why the week looks like this" paragraph: bold lead-in, then the body. */
export interface ScheduleNote {
  lead: LocalizedText;
  text: LocalizedText;
}

/** What the week adds up to. Static copy from the plan, not computed stats. */
export const WEEK_TALLY: WeekTally[] = [
  {
    value: { ru: '25 ч', en: '25 h' },
    label: { ru: 'работа, 5 ч × 5 дней', en: 'work, 5 h × 5 days' },
  },
  { value: { ru: '4', en: '4' }, label: { ru: 'покерных сессии', en: 'poker sessions' } },
  {
    value: { ru: '3', en: '3' },
    label: { ru: 'тренировки по 1:30', en: 'gym sessions of 1:30' },
  },
  { value: { ru: '4 ч', en: '4 h' }, label: { ru: 'курс Anthropic', en: 'Anthropic course' } },
  { value: { ru: '5 ч', en: '5 h' }, label: { ru: 'поиск работы', en: 'job search' } },
  { value: { ru: '4 ч 10', en: '4 h 10' }, label: { ru: 'свой проект', en: 'own project' } },
  { value: { ru: '1,5 ч', en: '1.5 h' }, label: { ru: 'обучение покеру', en: 'poker study' } },
  {
    value: { ru: '3', en: '3' },
    label: { ru: 'приёма пищи каждый день', en: 'meals every day' },
  },
];

/** "Приоритеты и что под них подстроено" — the reasoning behind the grid. */
export const SCHEDULE_NOTES: ScheduleNote[] = [
  {
    lead: {
      ru: '45 минут в день сняли главное ограничение.',
      en: 'Forty-five minutes a day removed the main constraint.',
    },
    text: {
      ru: 'Теперь 5 часов работы помещаются при полной тренировке в 1:30, а не только при укороченной. Заодно в будни появился ужин до сессии — раньше его приходилось есть за столами.',
      en: 'Five hours of work now fit alongside a full 1:30 workout, not just a shortened one. Weekdays also gained dinner before the session — it used to be eaten at the tables.',
    },
  },
  {
    lead: {
      ru: 'Пятая сессия убрана — это дало 3 часа блокам.',
      en: 'The fifth session is gone — that freed 3 hours for the blocks.',
    },
    text: {
      ru: 'Курс вырос вдвое, до 4 ч: вторник днём и пятница вечером. Поиск работы вырос до 5 ч: вторник вечером, четверг днём и час в воскресенье.',
      en: 'The course doubled to 4 h: Tuesday afternoon and Friday evening. Job search grew to 5 h: Tuesday evening, Thursday afternoon and an hour on Sunday.',
    },
  },
  {
    lead: {
      ru: 'Сессии разнесены: понедельник, четверг, суббота, воскресенье.',
      en: 'Sessions are spread out: Monday, Thursday, Saturday, Sunday.',
    },
    text: {
      ru: 'Пятница отдана курсу именно поэтому — если поставить сессию туда, выйдет три подряд с пятницы по воскресенье, и понедельник начнётся разбитым.',
      en: 'Friday goes to the course for exactly that reason — a session there would make three in a row from Friday to Sunday, and Monday would start wrecked.',
    },
  },
  {
    lead: {
      ru: 'Порядок снятия на запасном дне — заранее, а не по настроению.',
      en: 'What gets cut on a spare day is decided in advance, not by mood.',
    },
    text: {
      ru: 'Первым уходит зал, вторым дневной блок, третьим проект. Работа, сессия, курс, поиск работы и покерная теория не снимаются никогда: они добираются вечером вторника или пятницы.',
      en: 'The gym goes first, the day block second, the project third. Work, the session, the course, the job search and poker theory are never cut: they are caught up on Tuesday or Friday evening.',
    },
  },
  {
    lead: {
      ru: 'Если запасной день включается три раза за неделю',
      en: 'If the spare day fires three times in one week',
    },
    text: {
      ru: '— дело не в расписании. Значит сессий на неделе больше, чем выдерживает сон, и следующую неделю имеет смысл провести с тремя.',
      en: '— the schedule is not the problem. There are more sessions than sleep can carry, and the next week is better run with three.',
    },
  },
  {
    lead: {
      ru: 'Подъём считается от отбоя, а не по будильнику.',
      en: 'Wake-up is counted from lights out, not from the alarm.',
    },
    text: {
      ru: 'Лёг до 23:30 — встаёшь в 07:00 и день идёт как в сетке. Лёг позже — 7,5 часов сна, и включается запасной день. Жёсткая граница одна: в день с сессией подъём не позже 09:20, иначе 5 часов работы не успевают закрыться до 17:00.',
      en: 'In bed before 23:30 — up at 07:00 and the day runs as laid out. Later than that — 7.5 hours of sleep and the spare day kicks in. There is one hard limit: on a session day, up no later than 09:20, otherwise five hours of work cannot close before 17:00.',
    },
  },
  {
    lead: {
      ru: 'Зал остаётся в понедельник, среду и пятницу, 08:15.',
      en: 'The gym stays on Monday, Wednesday and Friday at 08:15.',
    },
    text: {
      ru: 'Если утро сорвалось из-за поздней сессии, тренировка не переносится по дням, а просто пропускается — на неделе их будет две вместо трёх.',
      en: 'If the morning collapses after a late session, the workout is not moved to another day, it is simply skipped — two that week instead of three.',
    },
  },
  {
    lead: { ru: 'Суббота: утро свободно до 11:30.', en: 'Saturday: the morning is free until 11:30.' },
    text: {
      ru: 'Завтрак вне дома с собакой без расписания, дальше два блока. Если неделя была лёгкой — второй блок можно снять и оставить день себе.',
      en: 'Breakfast out with the dog, no timing, then two blocks. If the week was easy, drop the second block and keep the day.',
    },
  },
  {
    lead: {
      ru: 'Резерва теперь два: вечер вторника и вечер пятницы.',
      en: 'There are two reserves now: Tuesday evening and Friday evening.',
    },
    text: {
      ru: 'Всё слетевшее переносится туда. Не отдавай их обратно под пятую сессию — именно из них состоит прибавка к курсу и поиску работы.',
      en: 'Anything that slips moves there. Do not hand them back to a fifth session — they are exactly what the course and the job search gained.',
    },
  },
  {
    lead: {
      ru: 'Ничего не заходит за 17:00 в дни сессий.',
      en: 'Nothing runs past 17:00 on session days.',
    },
    text: {
      ru: 'В понедельник и пятницу работа кончается в 16:35, в четверг поиск работы в 16:30 — дальше только ужин. Это и есть страховка старта в 17:00.',
      en: 'On Monday and Friday work ends at 16:35, on Thursday the job search ends at 16:30 — after that, only dinner. That is what protects the 17:00 start.',
    },
  },
];
