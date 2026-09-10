import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { TodayViewComponent } from './today-view';
import { ScheduleStateService } from '../services/schedule-state.service';
import { buildTimeline, countTicks, dayForDate } from '../schedule.util';

describe('TodayViewComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TodayViewComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideTranslateService({ defaultLanguage: 'ru' }),
      ],
    }).compileComponents();
  });

  it('renders one tick box per block and per goal of today', () => {
    const fixture = TestBed.createComponent(TodayViewComponent);
    fixture.detectChanges();

    const boxes = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    const expected = countTicks(buildTimeline(dayForDate(new Date()), null, new Set(), 'heavy'));

    expect(boxes.length).toBe(expected.total);
    expect([...boxes].every((box) => !box.disabled)).toBe(true);
  });

  it('remembers a ticked block', () => {
    const fixture = TestBed.createComponent(TodayViewComponent);
    fixture.detectChanges();

    const first = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    first.click();
    fixture.detectChanges();

    const state = TestBed.inject(ScheduleStateService);
    const firstId = dayForDate(new Date()).blocks[0].id;
    expect(state.isDone(firstId)).toBe(true);
    expect(localStorage.getItem('fe-guide-schedule')).toContain(firstId);

    first.click();
    fixture.detectChanges();
    expect(state.isDone(firstId)).toBe(false);
  });

  it('swaps the goals of the productive window with the workload', () => {
    const fixture = TestBed.createComponent(TodayViewComponent);
    const state = TestBed.inject(ScheduleStateService);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const titles = () =>
      [...host.querySelectorAll('.goal-title')].map((el) => el.textContent?.trim());
    const window = dayForDate(new Date()).blocks.find((block) => block.goals);

    // A weekend has no productive window, so there are no goals to swap.
    const heavy = window?.goals?.heavy.map((goal) => goal.title.ru) ?? [];
    const light = window?.goals?.light.map((goal) => goal.title.ru) ?? [];

    expect(titles()).toEqual(heavy);

    state.setWorkload('light');
    fixture.detectChanges();
    expect(titles()).toEqual(light);
  });

  it('ticks a goal without crossing off the block it sits in', () => {
    const fixture = TestBed.createComponent(TodayViewComponent);
    const state = TestBed.inject(ScheduleStateService);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const box = host.querySelector<HTMLInputElement>('.goal-box');
    const window = dayForDate(new Date()).blocks.find((block) => block.goals);
    if (!box || !window) return; // weekend: no productive window today

    box.click();
    fixture.detectChanges();

    expect(state.isDone(window.goals!.heavy[0].id)).toBe(true);
    expect(state.isDone(window.id)).toBe(false);
  });

  it("drops yesterday's ticks and workload", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const stale = `${yesterday.getFullYear()}-01-01`;
    localStorage.setItem(
      'fe-guide-schedule',
      JSON.stringify({ date: stale, done: ['mon-0655'], workload: 'light' }),
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ScheduleStateService] });
    const state = TestBed.inject(ScheduleStateService);

    expect(state.doneCount()).toBe(0);
    expect(state.workload()).toBe('heavy');
  });
});
