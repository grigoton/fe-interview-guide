import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';

export interface Habit {
  id: string;
  name: string;
  days: boolean[];
  progress: number;
  /** Checked by date key YYYY-MM-DD for calendar view */
  checks: Record<string, boolean>;
}

export interface HabitSection {
  id: string;
  title: string;
  order: number;
  habits: Habit[];
}

export interface HabitStore {
  version: 1;
  sections: HabitSection[];
  updatedAt: string;
}

export type HabitUserId = string;

export interface HabitUser {
  id: HabitUserId;
  name: string;
  store: HabitStore;
}

export interface HabitUsersRoot {
  version: 1;
  activeUserId: HabitUserId | null;
  users: HabitUser[];
}

const STORAGE_KEY = 'daily-habits-users-v1';
const DAYS_IN_WEEK = 7;
const DEFAULT_HABIT_NAMES = ['Зубы', 'Разминка', 'Дыхание', 'Книги', 'Закаливание'];
const WEEKDAYS = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];
const MORNING_SECTION_ID = 'morning';
const MAX_USERS = 5;
const MAX_SECTIONS = 5;
const TAB_ITEM_WIDTH_PX = 300;
const HABITS_VIEWPORT_WIDTH_PX = 600;
const HABITS_SCROLL_STEP_PX = 600;
const HABITS_SCROLL_EDGE_THRESHOLD_PX = 2;

@Component({
  selector: 'app-daily-habits',
  standalone: true,
  imports: [
    MatCheckboxModule,
    MatProgressBarModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    FormsModule,
    DragDropModule,
    TranslateModule,
  ],
  templateUrl: './daily-habits.component.html',
  styleUrls: ['./daily-habits.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailyHabitsComponent implements AfterViewInit {
  readonly maxUsers = MAX_USERS;
  readonly maxSections = MAX_SECTIONS;
  readonly tabItemWidth = TAB_ITEM_WIDTH_PX;
  readonly viewportWidth = HABITS_VIEWPORT_WIDTH_PX;
  readonly users = signal<HabitUser[]>([]);

  @ViewChild('userScrollViewport') userScrollViewport?: ElementRef<HTMLDivElement>;
  @ViewChild('sectionScrollViewport') sectionScrollViewport?: ElementRef<HTMLDivElement>;

  readonly canScrollUsersLeft = signal(false);
  readonly canScrollUsersRight = signal(false);
  readonly canScrollSectionsLeft = signal(false);
  readonly canScrollSectionsRight = signal(false);

  readonly selectedYear = signal<number>(new Date().getFullYear());
  readonly selectedMonth = signal<number>(new Date().getMonth() + 1);

  readonly activeUserId = signal<HabitUserId | null>(null);
  readonly activeSectionId = signal<string | null>(null);
  readonly editingSectionId = signal<string | null>(null);
  readonly editingUserId = signal<HabitUserId | null>(null);
  readonly deletedHabit = signal<{
    userId: HabitUserId;
    sectionId: string;
    habit: Habit;
    index: number;
  } | null>(null);

  readonly now = signal<Date>(new Date());
  readonly hours = computed(() => this.now().getHours().toString().padStart(2, '0'));
  readonly minutes = computed(() => this.now().getMinutes().toString().padStart(2, '0'));
  readonly seconds = computed(() => this.now().getSeconds().toString().padStart(2, '0'));
  readonly weekday = computed(() => WEEKDAYS[this.now().getDay()]);
  readonly formattedDate = computed(() => {
    const d = this.now();
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}.${d.getFullYear()}`;
  });
  readonly weekNumber = computed(() => this.getISOWeek(this.now()));
  readonly totalWeeksInYear = computed(() => {
    const d = this.now();
    const dec31 = new Date(d.getFullYear(), 11, 31);
    return this.getISOWeek(dec31);
  });

  readonly activeUser = computed(
    () => this.users().find((u) => u.id === this.activeUserId()) ?? null,
  );
  readonly currentStore = computed(
    () => this.activeUser()?.store ?? this.createEmptyStore(),
  );
  readonly currentSections = computed(() => this.currentStore().sections);
  readonly currentSection = computed(() => {
    const sections = this.currentSections();
    const id = this.activeSectionId();
    if (id) {
      const found = sections.find((s) => s.id === id);
      if (found) return found;
    }
    return sections[0] ?? this.createDefaultSection();
  });
  readonly habits = computed(() => this.currentSection().habits);

  readonly years = computed(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1, current + 2];
  });
  readonly monthNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  readonly selectedMonthName = computed(() =>
    this.translate.instant('HABITS_MONTH_' + this.selectedMonth()),
  );
  readonly daysInSelectedMonth = computed(() => {
    const y = this.selectedYear();
    const m = this.selectedMonth();
    return new Date(y, m, 0).getDate();
  });
  readonly daysInMonthArray = computed(() => {
    const n = this.daysInSelectedMonth();
    return Array.from({ length: n }, (_, i) => i + 1);
  });

  private readonly translate = inject(TranslateService);
  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor(destroyRef: DestroyRef) {
    this.loadFromStorage();
    this.startClock();

    effect(() => {
      const u = this.users();
      const activeId = this.activeUserId();
      if (u.length === 0) return;
      try {
        const root: HabitUsersRoot = {
          version: 1,
          activeUserId: activeId,
          users: u,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
      } catch {
        // ignore
      }
    });

    destroyRef.onDestroy(() => {
      if (this.timerId !== null) clearInterval(this.timerId);
    });
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const isUndo =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z';
    if (!isUndo) return;
    const last = this.deletedHabit();
    if (!last) return;
    if (last.userId !== this.activeUserId() || last.sectionId !== this.activeSectionId()) return;

    this.users.update((users) =>
      users.map((u) => {
        if (u.id !== last.userId) return u;
        const sections = u.store.sections.map((s) => {
          if (s.id !== last.sectionId) return s;
          const habits = [...s.habits];
          habits.splice(last.index, 0, last.habit);
          return { ...s, habits };
        });
        return { ...u, store: { ...u.store, sections } };
      }),
    );
    this.deletedHabit.set(null);
    event.preventDefault();
  }

  setActiveUser(userId: HabitUserId): void {
    const user = this.users().find((u) => u.id === userId);
    if (user) {
      this.activeUserId.set(user.id);
      const firstSection = user.store.sections[0];
      this.activeSectionId.set(firstSection?.id ?? null);
    }
  }

  setActiveSection(sectionId: string): void {
    this.activeSectionId.set(sectionId);
  }

  lastUserHasDefaultName(): boolean {
    const u = this.users();
    if (u.length === 0) return false;
    const last = u[u.length - 1];
    return last.name === `Пользователь ${u.length}`;
  }

  lastSectionHasDefaultTitle(): boolean {
    const sections = this.currentSections();
    if (sections.length === 0) return false;
    const last = sections[sections.length - 1];
    return last.title === this.translate.instant('HABITS_ADD_TRACKER');
  }

  canAddUser(): boolean {
    return this.users().length < MAX_USERS && !this.lastUserHasDefaultName();
  }

  canAddSection(): boolean {
    return this.currentSections().length < MAX_SECTIONS && !this.lastSectionHasDefaultTitle();
  }

  updateUsersScrollState(): void {
    const el = this.userScrollViewport?.nativeElement;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    this.canScrollUsersLeft.set(scrollLeft > HABITS_SCROLL_EDGE_THRESHOLD_PX);
    this.canScrollUsersRight.set(maxScroll > HABITS_SCROLL_EDGE_THRESHOLD_PX && scrollLeft < maxScroll - HABITS_SCROLL_EDGE_THRESHOLD_PX);
  }

  updateSectionsScrollState(): void {
    const el = this.sectionScrollViewport?.nativeElement;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    this.canScrollSectionsLeft.set(scrollLeft > HABITS_SCROLL_EDGE_THRESHOLD_PX);
    this.canScrollSectionsRight.set(maxScroll > HABITS_SCROLL_EDGE_THRESHOLD_PX && scrollLeft < maxScroll - HABITS_SCROLL_EDGE_THRESHOLD_PX);
  }

  onUserViewportScroll(): void {
    this.updateUsersScrollState();
  }

  onSectionViewportScroll(): void {
    this.updateSectionsScrollState();
  }

  scrollUsersLeft(): void {
    if (!this.canScrollUsersLeft()) return;
    const el = this.userScrollViewport?.nativeElement;
    if (!el) return;
    const target = Math.max(0, el.scrollLeft - HABITS_SCROLL_STEP_PX);
    el.scrollTo({ left: target, behavior: 'smooth' });
    setTimeout(() => this.updateUsersScrollState(), 350);
  }

  scrollUsersRight(): void {
    if (!this.canScrollUsersRight()) return;
    const el = this.userScrollViewport?.nativeElement;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const target = Math.min(maxScroll, el.scrollLeft + HABITS_SCROLL_STEP_PX);
    el.scrollTo({ left: target, behavior: 'smooth' });
    setTimeout(() => this.updateUsersScrollState(), 350);
  }

  scrollSectionsLeft(): void {
    if (!this.canScrollSectionsLeft()) return;
    const el = this.sectionScrollViewport?.nativeElement;
    if (!el) return;
    const target = Math.max(0, el.scrollLeft - HABITS_SCROLL_STEP_PX);
    el.scrollTo({ left: target, behavior: 'smooth' });
    setTimeout(() => this.updateSectionsScrollState(), 350);
  }

  scrollSectionsRight(): void {
    if (!this.canScrollSectionsRight()) return;
    const el = this.sectionScrollViewport?.nativeElement;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const target = Math.min(maxScroll, el.scrollLeft + HABITS_SCROLL_STEP_PX);
    el.scrollTo({ left: target, behavior: 'smooth' });
    setTimeout(() => this.updateSectionsScrollState(), 350);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.updateUsersScrollState();
      this.updateSectionsScrollState();
    }, 0);
  }

  private scrollUserViewportToEnd(): void {
    setTimeout(() => {
      const el = this.userScrollViewport?.nativeElement;
      if (el) {
        el.scrollTo({ left: el.scrollWidth - el.clientWidth, behavior: 'smooth' });
        setTimeout(() => this.updateUsersScrollState(), 350);
      }
    }, 0);
  }

  private scrollSectionViewportToEnd(): void {
    setTimeout(() => {
      const el = this.sectionScrollViewport?.nativeElement;
      if (el) {
        el.scrollTo({ left: el.scrollWidth - el.clientWidth, behavior: 'smooth' });
        setTimeout(() => this.updateSectionsScrollState(), 350);
      }
    }, 0);
  }

  addUser(): void {
    if (this.users().length >= MAX_USERS) return;
    const id = crypto.randomUUID?.() ?? 'user-' + Date.now();
    const name = `Пользователь ${this.users().length + 1}`;
    const store = this.createDefaultStore();
    this.users.update((list) => [...list, { id, name, store }]);
    this.activeUserId.set(id);
    const firstSection = store.sections[0];
    this.activeSectionId.set(firstSection?.id ?? null);
    this.scrollUserViewportToEnd();
  }

  deleteUser(userId: HabitUserId): void {
    const list = this.users();
    if (list.length <= 1) return;
    const idx = list.findIndex((u) => u.id === userId);
    if (idx < 0) return;
    const nextIndex = idx === 0 ? 0 : idx - 1;
    const nextId = list[nextIndex]?.id ?? null;
    this.users.update((l) => l.filter((u) => u.id !== userId));
    this.activeUserId.set(nextId);
    setTimeout(() => this.updateUsersScrollState(), 0);
  }

  addHabit(): void {
    const newHabit: Habit = {
      id: crypto.randomUUID?.() ?? Date.now().toString(36),
      name: '',
      days: Array(DAYS_IN_WEEK).fill(false),
      progress: 0,
      checks: {},
    };
    const sectionId = this.currentSection().id;
    const uid = this.activeUserId();
    if (!uid) return;
    this.users.update((users) =>
      users.map((u) => {
        if (u.id !== uid) return u;
        const sections = u.store.sections.map((s) =>
          s.id === sectionId
            ? { ...s, habits: [...s.habits, newHabit] }
            : s,
        );
        return { ...u, store: { ...u.store, sections } };
      }),
    );
  }

  onNameChange(habitId: string, name: string): void {
    const uid = this.activeUserId();
    const sectionId = this.currentSection().id;
    if (!uid) return;
    this.users.update((users) =>
      users.map((u) => {
        if (u.id !== uid) return u;
        const sections = u.store.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                habits: s.habits.map((h) =>
                  h.id === habitId ? { ...h, name: name.trim() } : h,
                ),
              }
            : s,
        );
        return { ...u, store: { ...u.store, sections } };
      }),
    );
  }

  getDateKey(day: number): string {
    const y = this.selectedYear();
    const m = this.selectedMonth();
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  getCheck(habit: Habit, day: number): boolean {
    const key = this.getDateKey(day);
    return !!habit.checks?.[key];
  }

  getProgressForMonth(habit: Habit): number {
    const daysInMonth = this.daysInSelectedMonth();
    let checked = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (this.getCheck(habit, d)) checked++;
    }
    return daysInMonth === 0 ? 0 : Math.round((checked / daysInMonth) * 100);
  }

  /** Number of days that count for "progress so far": up to today in current month, or full month in the past. */
  possibleDaysInSelectedMonth(): number {
    const y = this.selectedYear();
    const m = this.selectedMonth();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const daysInMonth = this.daysInSelectedMonth();
    if (y > currentYear || (y === currentYear && m > currentMonth)) return 0;
    if (y < currentYear || (y === currentYear && m < currentMonth)) return daysInMonth;
    return now.getDate();
  }

  /** Progress so far: checked count in 1..possibleDays, and percent. Used for the diagram below the table. */
  getProgressSoFar(habit: Habit): { checked: number; possible: number; percent: number } {
    const possible = this.possibleDaysInSelectedMonth();
    let checked = 0;
    for (let d = 1; d <= possible; d++) {
      if (this.getCheck(habit, d)) checked++;
    }
    const percent = possible === 0 ? 0 : Math.round((checked / possible) * 100);
    return { checked, possible, percent };
  }

  /** CSS class for progress color: red (low) -> yellow (mid) -> green (high). */
  getProgressColorClass(percent: number): string {
    if (percent >= 67) return 'progress-diagram-color-high';
    if (percent >= 34) return 'progress-diagram-color-mid';
    return 'progress-diagram-color-low';
  }

  onToggleDate(habitId: string, day: number, checked: boolean): void {
    const uid = this.activeUserId();
    const sectionId = this.currentSection().id;
    if (!uid) return;
    const dateKey = this.getDateKey(day);
    this.users.update((users) =>
      users.map((u) => {
        if (u.id !== uid) return u;
        const sections = u.store.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const habits = s.habits.map((h) => {
            if (h.id !== habitId) return h;
            const checks = { ...(h.checks ?? {}), [dateKey]: checked };
            const progress = this.getProgressForMonth({ ...h, checks });
            return { ...h, checks, progress };
          });
          return { ...s, habits };
        });
        return { ...u, store: { ...u.store, sections } };
      }),
    );
  }

  deleteHabit(habitId: string): void {
    const uid = this.activeUserId();
    const section = this.currentSection();
    if (!uid) return;
    const index = section.habits.findIndex((h) => h.id === habitId);
    if (index < 0) return;
    const habit = section.habits[index];
    this.deletedHabit.set({
      userId: uid,
      sectionId: section.id,
      habit,
      index,
    });
    this.users.update((users) =>
      users.map((u) => {
        if (u.id !== uid) return u;
        const sections = u.store.sections.map((s) =>
          s.id === section.id
            ? { ...s, habits: s.habits.filter((h) => h.id !== habitId) }
            : s,
        );
        return { ...u, store: { ...u.store, sections } };
      }),
    );
  }

  reorderHabits(event: CdkDragDrop<Habit[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const uid = this.activeUserId();
    const sectionId = this.currentSection().id;
    if (!uid) return;
    this.users.update((users) =>
      users.map((u) => {
        if (u.id !== uid) return u;
        const sections = u.store.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const habits = [...s.habits];
          moveItemInArray(habits, event.previousIndex, event.currentIndex);
          return { ...s, habits };
        });
        return { ...u, store: { ...u.store, sections } };
      }),
    );
  }

  selectedTabIndex(): number {
    const id = this.activeUserId();
    if (!id) return 0;
    const idx = this.users().findIndex((u) => u.id === id);
    return idx < 0 ? 0 : idx;
  }

  selectedSectionTabIndex(): number {
    const id = this.activeSectionId();
    const sections = this.currentSections();
    if (!id || sections.length === 0) return 0;
    const idx = sections.findIndex((s) => s.id === id);
    return idx < 0 ? 0 : idx;
  }


  startEditSection(sectionId: string, event: Event): void {
    event.stopPropagation();
    this.editingSectionId.set(sectionId);
  }

  startEditUser(userId: HabitUserId, event: Event): void {
    event.stopPropagation();
    this.editingUserId.set(userId);
  }

  saveUserName(userId: HabitUserId, newName: string): void {
    const name = newName?.trim() || this.users().find((u) => u.id === userId)?.name || '';
    this.users.update((users) =>
      users.map((u) => (u.id === userId ? { ...u, name } : u)),
    );
    this.editingUserId.set(null);
  }

  saveSectionTitle(sectionId: string, newTitle: string): void {
    const title = newTitle?.trim() || this.currentSections().find((s) => s.id === sectionId)?.title || '';
    const uid = this.activeUserId();
    if (!uid) return;
    this.users.update((users) =>
      users.map((u) => {
        if (u.id !== uid) return u;
        const sections = u.store.sections.map((s) =>
          s.id === sectionId ? { ...s, title } : s,
        );
        return { ...u, store: { ...u.store, sections } };
      }),
    );
    this.editingSectionId.set(null);
  }

  addSection(): void {
    const uid = this.activeUserId();
    if (!uid) return;
    const sections = this.currentSections();
    if (sections.length >= MAX_SECTIONS) return;
    const maxOrder = sections.length === 0 ? 0 : Math.max(...sections.map((s) => s.order), 0);
    const id = crypto.randomUUID?.() ?? 'section-' + Date.now();
    const newSection: HabitSection = {
      id,
      title: this.translate.instant('HABITS_ADD_TRACKER'),
      order: maxOrder + 1,
      habits: [],
    };
    this.users.update((users) =>
      users.map((u) => {
        if (u.id !== uid) return u;
        return { ...u, store: { ...u.store, sections: [...u.store.sections, newSection] } };
      }),
    );
    this.activeSectionId.set(id);
    this.scrollSectionViewportToEnd();
  }

  deleteSection(sectionId: string, event: Event): void {
    event.stopPropagation();
    const uid = this.activeUserId();
    if (!uid) return;
    const sections = this.currentSections();
    if (sections.length <= 1) return;
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const nextIndex = idx === 0 ? 1 : idx - 1;
    const nextSectionId = sections[nextIndex]?.id ?? sections[0]?.id ?? null;
    this.users.update((users) =>
      users.map((u) => {
        if (u.id !== uid) return u;
        const newSections = u.store.sections.filter((s) => s.id !== sectionId);
        return { ...u, store: { ...u.store, sections: newSections } };
      }),
    );
    if (this.activeSectionId() === sectionId) this.activeSectionId.set(nextSectionId);
    setTimeout(() => this.updateSectionsScrollState(), 0);
  }

  /** ISO week number (1–52 or 1–53) for the given date */
  private getISOWeek(date: Date): number {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const diff = d.getTime() - jan1.getTime();
    return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
  }

  private startClock(): void {
    this.timerId = setInterval(() => this.now.set(new Date()), 1000);
  }

  private recalcProgress(days: boolean[]): number {
    const checked = days.filter(Boolean).length;
    return Math.round((checked / DAYS_IN_WEEK) * 100);
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.initDefault();
        return;
      }
      const root = JSON.parse(raw) as HabitUsersRoot;
      if (
        !root ||
        root.version !== 1 ||
        !Array.isArray(root.users) ||
        root.users.length === 0
      ) {
        this.initDefault();
        return;
      }
      const users = this.normalizeUsers(root.users);
      this.users.set(users);
      const activeId =
        root.activeUserId && users.some((u) => u.id === root.activeUserId)
          ? root.activeUserId
          : users[0].id;
      this.activeUserId.set(activeId);
      const activeUser = users.find((u) => u.id === activeId);
      const firstSection = activeUser?.store.sections[0];
      this.activeSectionId.set(firstSection?.id ?? null);
    } catch {
      this.initDefault();
    }
  }

  private normalizeUsers(users: HabitUser[]): HabitUser[] {
    return users.map((u) => ({
      id: String(u.id),
      name: String(u.name || 'User'),
      store: this.normalizeStore(u.store),
    }));
  }

  private normalizeStore(store: HabitStore): HabitStore {
    const sections = (store.sections ?? []).map((s) => ({
      id: String(s.id || MORNING_SECTION_ID),
      title: String(s.title || 'Morning Rituals'),
      order: Number(s.order) ?? 0,
      habits: (s.habits ?? []).map((h, i) => {
        const days =
          Array.isArray(h.days) && h.days.length === DAYS_IN_WEEK
            ? h.days.map((d) => !!d)
            : Array(DAYS_IN_WEEK).fill(false);
        const checks =
          h.checks && typeof h.checks === 'object' && !Array.isArray(h.checks) ? { ...h.checks } : {};
        return {
          id: typeof h.id === 'string' ? h.id : `habit-${i}`,
          name: typeof h.name === 'string' ? h.name : '',
          days,
          progress: this.recalcProgress(days),
          checks,
        };
      }),
    }));
    if (sections.length === 0) sections.push(this.createDefaultSection());
    return {
      version: 1,
      sections,
      updatedAt: new Date().toISOString(),
    };
  }

  private initDefault(): void {
    const user = this.createFirstUser();
    this.users.set([user]);
    this.activeUserId.set(user.id);
    const firstSection = user.store.sections[0];
    this.activeSectionId.set(firstSection?.id ?? null);
  }

  private createFirstUser(): HabitUser {
    const id = 'anton';
    return {
      id,
      name: 'Anton',
      store: this.createDefaultStore(),
    };
  }

  private createDefaultStore(): HabitStore {
    return {
      version: 1,
      sections: [this.createDefaultSection()],
      updatedAt: new Date().toISOString(),
    };
  }

  private createDefaultSection(): HabitSection {
    const habits: Habit[] = DEFAULT_HABIT_NAMES.map((name, index) => {
      const days = Array(DAYS_IN_WEEK).fill(false);
      return {
        id: `default-${index}`,
        name,
        days,
        progress: this.recalcProgress(days),
        checks: {},
      };
    });
    return {
      id: MORNING_SECTION_ID,
      title: 'Morning Rituals',
      order: 1,
      habits,
    };
  }

  private createEmptyStore(): HabitStore {
    return {
      version: 1,
      sections: [this.createDefaultSection()],
      updatedAt: new Date().toISOString(),
    };
  }
}
