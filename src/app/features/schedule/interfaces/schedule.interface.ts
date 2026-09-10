import { LocalizedText } from '../../../shared/interfaces/localized-text';

/**
 * Kind of a schedule block. Drives colour and weight only — the app never
 * reorders or reschedules anything, the week is fixed data.
 *
 * - `routine`  — the morning chain, identical every day: alarm, dog, shower.
 * - `meal`     — breakfast.
 * - `work`     — the productive window. Its contents depend on the workload.
 * - `anchor`   — the block the day is built around (gym, hand review).
 * - `session`  — poker session. Starts at a fixed time, end is never shown.
 * - `free`     — deliberately unplanned time.
 */
export type BlockType = 'routine' | 'meal' | 'work' | 'anchor' | 'session' | 'free';

/**
 * How much paid work the day actually turned out to have.
 *
 * The productive window is the same length either way — only what has to fit
 * inside it changes, so this picks a goal list rather than a schedule.
 */
export type Workload = 'heavy' | 'light';

/**
 * One goal inside a productive window: something that must fit into the block,
 * with no start time of its own. Ticked separately from the block.
 */
export interface BlockGoal {
  /** Stable id — also the key its own "done" mark is stored under. */
  id: string;
  title: LocalizedText;
  /** How much time it needs, e.g. `1–1,5 ч`. */
  note?: LocalizedText;
  /** Only if the rest of the block closed early — never at the others' cost. */
  extra?: boolean;
}

/** One line of a day. */
export interface ScheduleBlock {
  /** Stable id — also the key the "done" mark is stored under. */
  id: string;
  /**
   * Local start as `"HH:MM"`, or `null` for a block with no start of its own
   * (the weekend's "some time today" hour). A `null` block is never "current".
   */
  start: string | null;
  /** Shown in the time column when {@link start} is `null`, e.g. "в течение дня". */
  timeLabel?: LocalizedText;
  title: LocalizedText;
  /** Grey second line: duration or a caveat. */
  note?: LocalizedText;
  type: BlockType;
  /** No fixed duration — the end time and the countdown stay hidden. */
  flexible?: boolean;
  /**
   * What has to fit inside this block, one list per workload. Present on the
   * productive window only; every other block is just itself.
   */
  goals?: Record<Workload, BlockGoal[]>;
}

export type DayId = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface ScheduleDay {
  id: DayId;
  /** `Date#getDay()` value (0 = Sunday). */
  weekday: number;
  name: LocalizedText;
  /** Short caption of what the day is built around, e.g. "зал, длинный день". */
  tag: LocalizedText;
  weekend?: boolean;
  /** Explanatory line above the blocks (used by the weekend). */
  hint?: LocalizedText;
  blocks: ScheduleBlock[];
}

/** Where a block sits relative to the current time. */
export type BlockStatus = 'past' | 'current' | 'upcoming';

/** A goal resolved against the day's "done" marks. */
export interface GoalEntry {
  goal: BlockGoal;
  done: boolean;
}

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
  /** The goals of the workload currently in force; empty for a plain block. */
  goals: GoalEntry[];
}
