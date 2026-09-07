import { LocalizedText } from '../../../shared/interfaces/localized-text';

/**
 * Kind of a schedule block. Drives colour and weight only — the app never
 * reorders or reschedules anything, the week is fixed data.
 *
 * - `routine`  — the fixed morning chain (warm-up, dog, shower).
 * - `meal`     — breakfast / lunch / dinner.
 * - `work`     — the job. Never moves.
 * - `anchor`   — the block the day is built around (gym, course, job search).
 * - `project`  — own project.
 * - `chores`   — cooking and household.
 * - `session`  — poker session. Starts at a fixed time, end is never shown.
 * - `busy`     — the evening is taken by something outside the flat.
 * - `free`     — deliberately unplanned time.
 */
export type BlockType =
  | 'routine'
  | 'meal'
  | 'work'
  | 'anchor'
  | 'project'
  | 'chores'
  | 'session'
  | 'busy'
  | 'free';

/** One line of a day. */
export interface ScheduleBlock {
  /** Stable id — also the key the "done" mark is stored under. */
  id: string;
  /**
   * Local start as `"HH:MM"`, or `null` for a block with no start of its own
   * (Saturday's "until 13:15" stretch). A `null` block is never "current".
   */
  start: string | null;
  /** Shown in the time column when {@link start} is `null`, e.g. "до 13:15". */
  timeLabel?: LocalizedText;
  title: LocalizedText;
  /** Grey second line: duration or a caveat. */
  note?: LocalizedText;
  type: BlockType;
  /** No fixed duration — the end time and the countdown stay hidden. */
  flexible?: boolean;
}

export type DayId = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | 'spare';

export interface ScheduleDay {
  id: DayId;
  /** `Date#getDay()` value (0 = Sunday). `null` for the spare day. */
  weekday: number | null;
  name: LocalizedText;
  /** Short caption of what the day is built around, e.g. "зал, сессия". */
  tag: LocalizedText;
  weekend?: boolean;
  /** Explanatory line above the blocks (used by the spare day). */
  hint?: LocalizedText;
  blocks: ScheduleBlock[];
}

/** Where a block sits relative to the current time. */
export type BlockStatus = 'past' | 'current' | 'upcoming';

/** A block resolved against the clock and the day's "done" marks. */
export interface TimelineEntry {
  block: ScheduleBlock;
  /** Minutes since local midnight, or `null` for a block with no start. */
  startMin: number | null;
  /**
   * Start of the next timed block. `null` for the last block of the day —
   * its end is open by design (a session's end is never predicted).
   */
  endMin: number | null;
  status: BlockStatus;
  done: boolean;
}
