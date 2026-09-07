import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleService } from '../../../core/services/locale.service';
import { DayCardComponent } from '../day-card/day-card';
import { ClockService } from '../services/clock.service';
import { ScheduleStateService } from '../services/schedule-state.service';
import { SCHEDULE_NOTES, SPARE_DAY, WEEK, WEEK_TALLY } from '../data';
import { ScheduleDay } from '../interfaces/schedule.interface';
import { dayForDate } from '../schedule.util';

/**
 * The whole week at a glance, plus the spare day and the reasoning behind the
 * grid. The day being lived is highlighted and is the only one that can be
 * ticked — marks belong to the current date and are dropped at midnight.
 */
@Component({
  selector: 'app-week-view',
  standalone: true,
  imports: [TranslateModule, RouterLink, DayCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './week-view.html',
  styleUrl: './week-view.scss',
})
export class WeekViewComponent {
  private readonly localeService = inject(LocaleService);
  private readonly clock = inject(ClockService);

  protected readonly state = inject(ScheduleStateService);
  protected readonly locale = this.localeService.currentLocale;

  protected readonly week = WEEK;
  protected readonly spareDay = SPARE_DAY;
  protected readonly tally = WEEK_TALLY;
  protected readonly notes = SCHEDULE_NOTES;

  private readonly todayId = computed(() => dayForDate(this.clock.now()).id);

  /** True for today's card — unless the day has been switched to the spare grid. */
  protected isActive(day: ScheduleDay): boolean {
    return day.id === this.todayId() && !this.state.spareDay();
  }
}
