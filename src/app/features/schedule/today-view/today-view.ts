import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleService } from '../../../core/services/locale.service';
import { BlockRowComponent } from '../block-row/block-row';
import { ClockService } from '../services/clock.service';
import { ScheduleStateService } from '../services/schedule-state.service';
import { TimelineEntry } from '../interfaces/schedule.interface';
import {
  buildTimeline,
  countTicks,
  dayForDate,
  formatDuration,
  minutesOfDay,
  toClock,
} from '../schedule.util';

/**
 * The main screen: what is running now, what comes next, and the day as a
 * list of blocks you tick off.
 *
 * Nothing here is editable — the week is fixed data. The only two switches are
 * the workload and the ticks themselves, and both are dropped at midnight.
 */
@Component({
  selector: 'app-today-view',
  standalone: true,
  imports: [TranslateModule, RouterLink, BlockRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './today-view.html',
  styleUrl: './today-view.scss',
})
export class TodayViewComponent {
  private readonly localeService = inject(LocaleService);
  private readonly clock = inject(ClockService);

  protected readonly state = inject(ScheduleStateService);
  protected readonly locale = this.localeService.currentLocale;

  protected readonly day = computed(() => dayForDate(this.clock.now()));

  private readonly nowMin = computed(() => minutesOfDay(this.clock.now()));

  protected readonly timeline = computed(() =>
    buildTimeline(this.day(), this.nowMin(), this.state.done(), this.state.workload()),
  );

  protected readonly current = computed<TimelineEntry | null>(
    () => this.timeline().find((entry) => entry.status === 'current') ?? null,
  );

  protected readonly next = computed<TimelineEntry | null>(
    () => this.timeline().find((entry) => entry.status === 'upcoming') ?? null,
  );

  /** Ticks and tickables, goals included — the counter under the progress bar. */
  protected readonly ticks = computed(() => countTicks(this.timeline()));

  protected readonly dateLabel = computed(() =>
    new Intl.DateTimeFormat(this.locale() === 'ru' ? 'ru-RU' : 'en-GB', {
      day: 'numeric',
      month: 'long',
    }).format(this.clock.now()),
  );

  /** `12:00 – 19:00`, or just `с 16:30` when the block has no fixed end. */
  protected readonly currentRange = computed(() => {
    const entry = this.current();
    if (!entry || entry.startMin === null) return '';
    const start = toClock(entry.startMin);
    if (entry.block.flexible || entry.endMin === null) return start;
    return `${start} – ${toClock(entry.endMin)}`;
  });

  /**
   * Time left in the current block, or `null` when there is none to show —
   * a session's end is unknown and must never be guessed at.
   */
  protected readonly remaining = computed(() => {
    const entry = this.current();
    if (!entry || entry.endMin === null || entry.block.flexible) return null;
    return formatDuration(entry.endMin - this.nowMin(), this.locale());
  });

  /** `09:00 · Зал` — the block queued up after the current one. */
  protected readonly nextLabel = computed(() => {
    const entry = this.next();
    if (!entry) return '';
    const time =
      entry.startMin !== null ? toClock(entry.startMin) : entry.block.timeLabel?.[this.locale()];
    const title = entry.block.title[this.locale()];
    return time ? `${time} · ${title}` : title;
  });

  /**
   * How far the day has run, 0–100.
   *
   * The bar spans from the alarm to the start of the last timed block: that
   * block is the session (or the free evening) and its end is deliberately
   * unknown, so there is nothing to stretch the bar to.
   */
  protected readonly progress = computed(() => {
    const starts = this.timeline()
      .map((entry) => entry.startMin)
      .filter((value): value is number => value !== null);
    if (starts.length < 2) return 0;

    const first = starts[0];
    const last = starts[starts.length - 1];
    const share = ((this.nowMin() - first) / (last - first)) * 100;
    return Math.min(100, Math.max(0, Math.round(share)));
  });
}
