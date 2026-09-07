import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleService } from '../../../core/services/locale.service';
import { BlockRowComponent } from '../block-row/block-row';
import { ClockService } from '../services/clock.service';
import { ScheduleStateService } from '../services/schedule-state.service';
import { SPARE_DAY } from '../data';
import { TimelineEntry } from '../interfaces/schedule.interface';
import { buildTimeline, dayForDate, formatDuration, minutesOfDay, toClock } from '../schedule.util';

/**
 * The main screen: what is running now, what comes next, and the day as a
 * list of blocks you tick off.
 *
 * Nothing here is editable — the week is fixed data. The only two switches are
 * the spare day and the ticks themselves, and both are dropped at midnight.
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

  /** The weekday as the calendar has it, ignoring the spare-day switch. */
  private readonly calendarDay = computed(() => dayForDate(this.clock.now()));

  /** The grid actually being lived today. */
  protected readonly day = computed(() =>
    this.state.spareDay() ? SPARE_DAY : this.calendarDay(),
  );

  private readonly nowMin = computed(() => minutesOfDay(this.clock.now()));

  protected readonly timeline = computed(() =>
    buildTimeline(this.day(), this.nowMin(), this.state.done()),
  );

  protected readonly current = computed<TimelineEntry | null>(
    () => this.timeline().find((entry) => entry.status === 'current') ?? null,
  );

  protected readonly next = computed<TimelineEntry | null>(
    () => this.timeline().find((entry) => entry.status === 'upcoming') ?? null,
  );

  protected readonly doneCount = computed(
    () => this.timeline().filter((entry) => entry.done).length,
  );

  protected readonly dateLabel = computed(() =>
    new Intl.DateTimeFormat(this.locale() === 'ru' ? 'ru-RU' : 'en-GB', {
      day: 'numeric',
      month: 'long',
    }).format(this.clock.now()),
  );

  /** `10:50 – 13:50`, or just `с 17:00` when the block has no fixed end. */
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

  /** `08:15 · Зал` — the block queued up after the current one. */
  protected readonly nextLabel = computed(() => {
    const entry = this.next();
    if (!entry) return '';
    const time = entry.startMin !== null ? toClock(entry.startMin) : entry.block.timeLabel?.[this.locale()];
    const title = entry.block.title[this.locale()];
    return time ? `${time} · ${title}` : title;
  });

  /**
   * How far the day has run, 0–100.
   *
   * The bar spans from getting up to the start of the last block: that block
   * is the session (or the free evening) and its end is deliberately unknown,
   * so there is nothing to stretch the bar to.
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
