import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { TodayViewComponent } from './today-view';
import { ScheduleStateService } from '../services/schedule-state.service';
import { dayForDate } from '../schedule.util';

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

  it('renders one tick box per block of today', () => {
    const fixture = TestBed.createComponent(TodayViewComponent);
    fixture.detectChanges();

    const boxes = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    expect(boxes.length).toBe(dayForDate(new Date()).blocks.length);
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

  it('swaps in the spare day and keeps its own ticks', () => {
    const fixture = TestBed.createComponent(TodayViewComponent);
    const state = TestBed.inject(ScheduleStateService);
    fixture.detectChanges();

    state.setSpareDay(true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('h1')?.textContent).toContain('После поздней сессии');
    expect(host.querySelectorAll('input[type="checkbox"]').length).toBe(8);
  });

  it('drops yesterday\'s ticks', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const stale = `${yesterday.getFullYear()}-01-01`;
    localStorage.setItem(
      'fe-guide-schedule',
      JSON.stringify({ date: stale, done: ['mon-0700'], spare: true }),
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ScheduleStateService] });
    const state = TestBed.inject(ScheduleStateService);

    expect(state.doneCount()).toBe(0);
    expect(state.spareDay()).toBe(false);
  });
});
