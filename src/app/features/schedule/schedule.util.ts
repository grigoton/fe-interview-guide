import { LocaleId } from '../../core/services/locale.service';
import { WEEK } from './data';
import { BlockStatus, ScheduleDay, TimelineEntry } from './interfaces/schedule.interface';

/** `"HH:MM"` → minutes since local midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':');
  return Number(h) * 60 + Number(m);
}

/** Minutes since local midnight → `"HH:MM"`. */
export function toClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Minutes elapsed today, on the device's own clock. */
export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * `YYYY-MM-DD` in local time — the key the day's marks are stored under.
 * Built from the local parts on purpose: `toISOString()` is UTC and would roll
 * the day over at the wrong moment.
 */
export function dateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** The scheduled day for a calendar date. */
export function dayForDate(date: Date): ScheduleDay {
  const weekday = date.getDay();
  return WEEK.find((day) => day.weekday === weekday) ?? WEEK[0];
}

/**
 * Resolves a day's blocks against the clock.
 *
 * A block runs until the next block that has a start of its own, so the end
 * time is never invented. The last block of the day has no end: a session's
 * finish is unknown and must not be shown or guessed.
 *
 * `nowMin` is `null` for any day that is not today — nothing is highlighted.
 */
export function buildTimeline(
  day: ScheduleDay,
  nowMin: number | null,
  done: ReadonlySet<string>,
): TimelineEntry[] {
  const starts = day.blocks.map((block) => (block.start ? toMinutes(block.start) : null));

  return day.blocks.map((block, i) => {
    const startMin = starts[i];
    // The next block with a real start — a "no start" row (Saturday's stretch
    // until 13:15) never ends the block above it.
    const endMin = starts.slice(i + 1).find((value): value is number => value !== null) ?? null;

    let status: BlockStatus = 'upcoming';
    if (nowMin !== null) {
      if (startMin === null) {
        // Has no start of its own, so it can never be "now"; it is over once
        // the next timed block has begun.
        status = endMin !== null && nowMin >= endMin ? 'past' : 'upcoming';
      } else if (endMin !== null && nowMin >= endMin) {
        status = 'past';
      } else if (nowMin >= startMin) {
        status = 'current';
      }
    }

    return { block, startMin, endMin, status, done: done.has(block.id) };
  });
}

/** Human duration: `1 ч 25 мин` / `1 h 25 min`. */
export function formatDuration(minutes: number, locale: LocaleId): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  const hourUnit = locale === 'ru' ? 'ч' : 'h';
  const minUnit = locale === 'ru' ? 'мин' : 'min';

  if (h && m) return `${h} ${hourUnit} ${m} ${minUnit}`;
  if (h) return `${h} ${hourUnit}`;
  return `${m} ${minUnit}`;
}
