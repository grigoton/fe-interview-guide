import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { ClockService } from './clock.service';
import { Workload } from '../interfaces/schedule.interface';
import { dateKey } from '../schedule.util';

const STORAGE_KEY = 'fe-guide-schedule';

/** Everything the schedule remembers — and it only ever remembers one day. */
interface StoredDay {
  /** Local `YYYY-MM-DD` the marks below belong to. */
  date: string;
  /** Ids of the blocks and goals ticked off today. */
  done: string[];
  /** How much work today turned out to have — picks the goals of the window. */
  workload: Workload;
}

/**
 * Today's ticks and the workload switch, persisted to `localStorage`.
 *
 * State is scoped to a single day by design: the record carries the date it was
 * written on, and both the ticks and the workload are dropped as soon as the
 * device clock rolls into the next day — no history is kept. A fresh day starts
 * on `heavy`, the assumption being that work is there until it turns out not
 * to be.
 */
@Injectable({ providedIn: 'root' })
export class ScheduleStateService {
  private readonly clock = inject(ClockService);

  private readonly state = signal<StoredDay>(this.load());

  /** Blocks and goals ticked off today. */
  readonly done = computed(() => new Set(this.state().done));
  /** Number of ticked items — cheaper than materialising the set. */
  readonly doneCount = computed(() => this.state().done.length);
  /** Which goal list the productive window shows today. */
  readonly workload = computed(() => this.state().workload);

  constructor() {
    // Midnight rollover: the app may well be open across it.
    effect(() => {
      const today = dateKey(this.clock.now());
      if (untracked(this.state).date !== today) {
        this.state.set(emptyDay(today));
        this.persist();
      }
    });
  }

  isDone(id: string): boolean {
    return this.state().done.includes(id);
  }

  toggle(id: string): void {
    this.state.update((current) => {
      const done = current.done.includes(id)
        ? current.done.filter((entry) => entry !== id)
        : [...current.done, id];
      return { ...current, done };
    });
    this.persist();
  }

  /** Clears today's ticks; the workload switch stays as it is. */
  clearDone(): void {
    this.state.update((current) => ({ ...current, done: [] }));
    this.persist();
  }

  /**
   * Switches the day between the two goal lists.
   *
   * Ticks are left alone on purpose: the two lists share nothing but their
   * subjects, and a goal ticked under one workload stays ticked if you switch
   * back — the hour was still spent.
   */
  setWorkload(workload: Workload): void {
    this.state.update((current) => ({ ...current, workload }));
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
    } catch {
      // storage unavailable — the day still works, it just won't survive a reload
    }
  }

  private load(): StoredDay {
    const today = dateKey(new Date());
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredDay> | null;
        // Anything written on an earlier day is stale by design.
        if (parsed && parsed.date === today) {
          return {
            date: today,
            done: Array.isArray(parsed.done)
              ? parsed.done.filter((id) => typeof id === 'string')
              : [],
            workload: parsed.workload === 'light' ? 'light' : 'heavy',
          };
        }
      }
    } catch {
      // ignore corrupt/unavailable storage
    }
    return emptyDay(today);
  }
}

function emptyDay(date: string): StoredDay {
  return { date, done: [], workload: 'heavy' };
}
