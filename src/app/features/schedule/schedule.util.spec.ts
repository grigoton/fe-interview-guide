import { WEEK } from './data';
import {
  buildTimeline,
  countTicks,
  dayForDate,
  formatDuration,
  toClock,
  toMinutes,
} from './schedule.util';

/** Sunday is `getDay() === 0`, so the week array is not indexed by weekday. */
const MONDAY = WEEK[0];
const TUESDAY = WEEK[1];
const SATURDAY = WEEK[5];

describe('schedule.util', () => {
  it('maps a date to the right day of the fixed week', () => {
    // 2026-09-07 is a Monday, 2026-09-13 a Sunday.
    expect(dayForDate(new Date(2026, 8, 7)).id).toBe('mon');
    expect(dayForDate(new Date(2026, 8, 13)).id).toBe('sun');
  });

  it('converts between "HH:MM" and minutes', () => {
    expect(toMinutes('06:55')).toBe(415);
    expect(toClock(415)).toBe('06:55');
  });

  it('ends a block where the next one starts', () => {
    const timeline = buildTimeline(MONDAY, toMinutes('13:00'), new Set(), 'heavy');
    const window = timeline.find((entry) => entry.block.id === 'mon-1200');

    expect(window?.status).toBe('current');
    expect(window?.endMin).toBe(toMinutes('19:00'));
    expect(timeline.find((entry) => entry.block.id === 'mon-0900')?.status).toBe('past');
    expect(timeline.find((entry) => entry.block.id === 'mon-1900')?.status).toBe('upcoming');
  });

  it('leaves the session open-ended', () => {
    const timeline = buildTimeline(TUESDAY, toMinutes('22:40'), new Set(), 'heavy');
    const session = timeline.at(-1);

    expect(session?.block.type).toBe('session');
    expect(session?.status).toBe('current');
    // No end time exists to show — the session's finish is never predicted.
    expect(session?.endMin).toBeNull();
  });

  it('starts every day of the week with the same morning', () => {
    for (const day of WEEK) {
      expect(day.blocks[0].start).toBe('06:55');
      expect(day.blocks[6].start).toBe('08:40');
    }
  });

  it('never makes a block without a start the current one', () => {
    // The weekend's two untimed hours sit below the session, so nothing ends
    // them: they stay open all day and are only ever closed by a tick.
    for (const nowMin of [toMinutes('11:00'), toMinutes('19:30')]) {
      const timeline = buildTimeline(SATURDAY, nowMin, new Set(), 'heavy');
      const hands = timeline.find((entry) => entry.block.id === 'sat-hands');

      expect(hands?.startMin).toBeNull();
      expect(hands?.status).toBe('upcoming');
    }

    // ...and they do not cut the session short either.
    const evening = buildTimeline(SATURDAY, toMinutes('19:30'), new Set(), 'heavy');
    const session = evening.find((entry) => entry.block.id === 'sat-session');
    expect(session?.status).toBe('current');
    expect(session?.endMin).toBeNull();
  });

  it('marks nothing as current for a day that is not today', () => {
    const timeline = buildTimeline(MONDAY, null, new Set(), 'heavy');
    expect(timeline.every((entry) => entry.status === 'upcoming')).toBe(true);
  });

  it('carries the done marks through', () => {
    const timeline = buildTimeline(MONDAY, toMinutes('13:00'), new Set(['mon-1200']), 'heavy');
    expect(timeline.find((entry) => entry.block.id === 'mon-1200')?.done).toBe(true);
    expect(timeline.find((entry) => entry.block.id === 'mon-0900')?.done).toBe(false);
  });

  it('shows the goals of the workload it was given, with their own marks', () => {
    const at = (workload: 'heavy' | 'light', done: Set<string>) =>
      buildTimeline(MONDAY, toMinutes('13:00'), done, workload).find(
        (entry) => entry.block.id === 'mon-1200',
      );

    expect(at('heavy', new Set())?.goals.map((item) => item.goal.id)).toEqual(
      MONDAY.blocks.find((block) => block.id === 'mon-1200')!.goals!.heavy.map((goal) => goal.id),
    );
    expect(at('light', new Set())?.goals.map((item) => item.goal.id)).toEqual(
      MONDAY.blocks.find((block) => block.id === 'mon-1200')!.goals!.light.map((goal) => goal.id),
    );

    const marked = at('light', new Set(['mon-g-course-l']))?.goals ?? [];
    expect(marked.find((item) => item.goal.id === 'mon-g-course-l')?.done).toBe(true);
    expect(marked.find((item) => item.goal.id === 'mon-g-prep-l')?.done).toBe(false);
  });

  it('counts goals alongside the blocks they sit in', () => {
    const timeline = buildTimeline(MONDAY, null, new Set(['mon-0655', 'mon-g-course']), 'heavy');
    const goalCount = timeline.reduce((sum, entry) => sum + entry.goals.length, 0);

    expect(goalCount).toBe(3);
    expect(countTicks(timeline)).toEqual({ done: 2, total: MONDAY.blocks.length + 3 });
  });

  it('formats durations in both locales', () => {
    expect(formatDuration(85, 'ru')).toBe('1 ч 25 мин');
    expect(formatDuration(45, 'ru')).toBe('45 мин');
    expect(formatDuration(120, 'en')).toBe('2 h');
  });

  it('keeps every session day clear before the session starts', () => {
    // The spec's hard rule: nothing scheduled before a session may run past
    // the moment it begins.
    for (const day of WEEK) {
      const session = day.blocks.find((block) => block.type === 'session');
      if (!session?.start) continue;
      const sessionStart = toMinutes(session.start);
      const before = day.blocks.filter(
        (block) => block.start !== null && toMinutes(block.start) < sessionStart,
      );
      const timeline = buildTimeline(day, null, new Set(), 'heavy');

      for (const block of before) {
        const entry = timeline.find((item) => item.block.id === block.id);
        expect(entry?.endMin ?? 0).toBeLessThanOrEqual(sessionStart);
      }
    }
  });
});
