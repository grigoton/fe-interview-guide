import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** How often the clock signal is refreshed. Minutes are the finest unit shown. */
const TICK_MS = 30_000;

/**
 * The current time as a signal, so "what is on now" recomputes on its own.
 *
 * Provided in root but created lazily — the interval only starts once a
 * schedule screen injects it.
 */
@Injectable({ providedIn: 'root' })
export class ClockService {
  private readonly tick = signal(new Date());

  /** Current local time, refreshed every 30 s. */
  readonly now = this.tick.asReadonly();

  constructor() {
    const timer = setInterval(() => this.tick.set(new Date()), TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
