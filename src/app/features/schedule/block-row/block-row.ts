import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleService } from '../../../core/services/locale.service';
import { TimelineEntry } from '../interfaces/schedule.interface';

/**
 * One line of a day: a tick box, the start time and what happens — plus, on a
 * productive window, the goals that have to fit inside it.
 *
 * The row itself is a `<label>`, so anywhere on it toggles the box — the target
 * has to be forgiving on a phone. The goals sit outside that label, each with
 * its own, so ticking a goal never crosses out the block. Rows of days other
 * than today are rendered disabled: ticks only ever belong to the current day.
 */
@Component({
  selector: 'app-block-row',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './block-row.html',
  styleUrl: './block-row.scss',
})
export class BlockRowComponent {
  private readonly localeService = inject(LocaleService);

  readonly entry = input.required<TimelineEntry>();
  /** False for any day that is not today — the boxes are shown, but locked. */
  readonly interactive = input(true);

  readonly toggled = output<void>();
  /** Id of the goal whose box was clicked. */
  readonly goalToggled = output<string>();

  protected readonly locale = this.localeService.currentLocale;

  protected readonly goals = computed(() => this.entry().goals);

  /** Start time, or the written label of a block that has no start of its own. */
  protected readonly time = computed(() => {
    const block = this.entry().block;
    return block.start ?? block.timeLabel?.[this.locale()] ?? '—';
  });

  protected readonly rowClass = computed(() => {
    const entry = this.entry();
    return [
      `is-${entry.block.type}`,
      `is-${entry.status}`,
      entry.done ? 'is-done' : '',
      this.interactive() ? '' : 'is-locked',
    ]
      .filter(Boolean)
      .join(' ');
  });
}
