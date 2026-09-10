import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleService } from '../../../core/services/locale.service';
import { DayCardComponent } from '../day-card/day-card';
import { ClockService } from '../services/clock.service';
import { ScheduleStateService } from '../services/schedule-state.service';
import { WEEK, WEEK_TALLY } from '../data';
import { ScheduleDay } from '../interfaces/schedule.interface';
import { dayForDate } from '../schedule.util';

/**
 * The whole week at a glance, plus what it adds up to. The day being lived is
 * highlighted and is the only one that can be ticked — marks belong to the
 * current date and are dropped at midnight.
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
  protected readonly tally = WEEK_TALLY;

  private readonly todayId = computed(() => dayForDate(this.clock.now()).id);

  /** True for today's card — the only one whose boxes are live. */
  protected isActive(day: ScheduleDay): boolean {
    return day.id === this.todayId();
  }
}
