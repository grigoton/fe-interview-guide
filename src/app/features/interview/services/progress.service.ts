import { Injectable, signal } from '@angular/core';
import { ProgressStatus } from '../interfaces/question.interface';

const STORAGE_KEY = 'fe-guide-progress';

/**
 * Tracks per-question learning progress (`learning` / `known`) and persists it
 * to `localStorage`. Questions with no stored status are treated as `new`.
 *
 * Exposes the full status map as a signal so any component reacts to changes.
 */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly map = signal<Record<string, ProgressStatus>>(this.load());

  /** Reactive snapshot of all tracked statuses (`new` entries are omitted). */
  readonly statuses = this.map.asReadonly();

  status(id: string): ProgressStatus {
    return this.map()[id] ?? 'new';
  }

  setStatus(id: string, status: ProgressStatus): void {
    this.map.update((current) => {
      const next = { ...current };
      if (status === 'new') {
        delete next[id];
      } else {
        next[id] = status;
      }
      return next;
    });
    this.persist();
  }

  /** Advance status in the cycle: new → learning → known → new. */
  cycle(id: string): void {
    const order: ProgressStatus[] = ['new', 'learning', 'known'];
    const next = order[(order.indexOf(this.status(id)) + 1) % order.length];
    this.setStatus(id, next);
  }

  /** Wipe all tracked progress. */
  reset(): void {
    this.map.set({});
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.map()));
    } catch {
      // storage unavailable — ignore
    }
  }

  private load(): Record<string, ProgressStatus> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, ProgressStatus>;
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // ignore corrupt/unavailable storage
    }
    return {};
  }
}
