import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleService } from '../../../core/services/locale.service';
import { BlockRowComponent } from '../block-row/block-row';
import { ClockService } from '../services/clock.service';
import { ScheduleStateService } from '../services/schedule-state.service';
import { ScheduleDay } from '../interfaces/schedule.interface';
import { buildTimeline, minutesOfDay } from '../schedule.util';

/**
 * One day of the week grid.
 *
 * Only the day that is actually running can be ticked — marks are scoped to
 * the current date, so the other cards are read-only.
 */
@Component({
  selector: 'app-day-card',
  standalone: true,
  imports: [TranslateModule, BlockRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './day-card.html',
  styleUrl: './day-card.scss',
})
export class DayCardComponent {
  private readonly localeService = inject(LocaleService);
  private readonly clock = inject(ClockService);

  protected readonly state = inject(ScheduleStateService);

  readonly day = input.required<ScheduleDay>();
  /** True for the day being lived right now: highlighted and tickable. */
  readonly active = input(false);

  protected readonly locale = this.localeService.currentLocale;

  protected readonly timeline = computed(() =>
    buildTimeline(
      this.day(),
      this.active() ? minutesOfDay(this.clock.now()) : null,
      this.state.done(),
    ),
  );

  protected readonly doneCount = computed(
    () => this.timeline().filter((entry) => entry.done).length,
  );
}
