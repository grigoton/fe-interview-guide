import { SPARE_DAY, WEEK } from './data';
import { buildTimeline, dayForDate, formatDuration, toClock, toMinutes } from './schedule.util';

/** Sunday is `getDay() === 0`, so the week array is not indexed by weekday. */
const MONDAY = WEEK[0];
const SATURDAY = WEEK[5];

describe('schedule.util', () => {
  it('maps a date to the right day of the fixed week', () => {
    // 2026-09-07 is a Monday, 2026-09-13 a Sunday.
    expect(dayForDate(new Date(2026, 8, 7)).id).toBe('mon');
    expect(dayForDate(new Date(2026, 8, 13)).id).toBe('sun');
  });

  it('converts between "HH:MM" and minutes', () => {
    expect(toMinutes('08:15')).toBe(495);
    expect(toClock(495)).toBe('08:15');
  });

  it('ends a block where the next one starts', () => {
    const timeline = buildTimeline(MONDAY, toMinutes('11:30'), new Set());
    const work = timeline.find((entry) => entry.block.id === 'mon-1050');

    expect(work?.status).toBe('current');
    expect(work?.endMin).toBe(toMinutes('13:50'));
    expect(timeline.find((entry) => entry.block.id === 'mon-0815')?.status).toBe('past');
    expect(timeline.find((entry) => entry.block.id === 'mon-1700')?.status).toBe('upcoming');
  });

  it('leaves the session open-ended', () => {
    const timeline = buildTimeline(MONDAY, toMinutes('22:40'), new Set());
    const session = timeline.at(-1);

    expect(session?.block.type).toBe('session');
    expect(session?.status).toBe('current');
    // No end time exists to show — the session's finish is never predicted.
    expect(session?.endMin).toBeNull();
  });

  it('never makes a block without a start the current one', () => {
    const free = () =>
      buildTimeline(SATURDAY, toMinutes('11:00'), new Set()).find(
        (entry) => entry.block.id === 'sat-free',
      );

    expect(free()?.startMin).toBeNull();
    expect(free()?.status).toBe('upcoming');
    // The breakfast above it runs until the next timed block, 13:15.
    const breakfast = buildTimeline(SATURDAY, toMinutes('11:00'), new Set()).find(
      (entry) => entry.block.id === 'sat-0915',
    );
    expect(breakfast?.status).toBe('current');
    expect(breakfast?.endMin).toBe(toMinutes('13:15'));

    const after = buildTimeline(SATURDAY, toMinutes('14:00'), new Set()).find(
      (entry) => entry.block.id === 'sat-free',
    );
    expect(after?.status).toBe('past');
  });

  it('marks nothing as current for a day that is not today', () => {
    const timeline = buildTimeline(MONDAY, null, new Set());
    expect(timeline.every((entry) => entry.status === 'upcoming')).toBe(true);
  });

  it('carries the done marks through', () => {
    const timeline = buildTimeline(SPARE_DAY, toMinutes('12:00'), new Set(['spare-1055']));
    expect(timeline.find((entry) => entry.block.id === 'spare-1055')?.done).toBe(true);
    expect(timeline.find((entry) => entry.block.id === 'spare-0900')?.done).toBe(false);
  });

  it('formats durations in both locales', () => {
    expect(formatDuration(85, 'ru')).toBe('1 ч 25 мин');
    expect(formatDuration(45, 'ru')).toBe('45 мин');
    expect(formatDuration(120, 'en')).toBe('2 h');
  });

  it('keeps every session day clear before 17:00', () => {
    // The spec's hard rule: on a session day nothing scheduled before the
    // session may run past its 17:00 start.
    for (const day of [...WEEK, SPARE_DAY]) {
      const session = day.blocks.find((block) => block.type === 'session');
      if (!session?.start) continue;
      const sessionStart = toMinutes(session.start);
      const before = day.blocks.filter(
        (block) => block.start !== null && toMinutes(block.start) < sessionStart,
      );
      const timeline = buildTimeline(day, null, new Set());

      for (const block of before) {
        const entry = timeline.find((item) => item.block.id === block.id);
        expect(entry?.endMin ?? 0).toBeLessThanOrEqual(sessionStart);
      }
    }
  });
});
