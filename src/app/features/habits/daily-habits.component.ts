import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
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
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';

export interface Habit {
  id: string;
  name: string;
  days: boolean[];
  progress: number;
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

@Component({
  selector: 'app-daily-habits',
  standalone: true,
  imports: [
    MatCheckboxModule,
    MatProgressBarModule,
    MatButtonModule,
    MatInputModule,
    MatTabsModule,
    MatIconModule,
    FormsModule,
    DragDropModule,
    TranslateModule,
  ],
  templateUrl: './daily-habits.component.html',
  styleUrls: ['./daily-habits.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailyHabitsComponent {
  readonly maxUsers = MAX_USERS;
  readonly maxSections = MAX_SECTIONS;
  readonly users = signal<HabitUser[]>([]);
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

  readonly weekDaysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly weekDaysShortKeys = [
    'HABITS_DAY_MON',
    'HABITS_DAY_TUE',
    'HABITS_DAY_WED',
    'HABITS_DAY_THU',
    'HABITS_DAY_FRI',
    'HABITS_DAY_SAT',
    'HABITS_DAY_SUN',
  ];

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

  onUserTabChange(index: number): void {
    const u = this.users();
    const user = u[index];
    if (user) {
      this.activeUserId.set(user.id);
      const firstSection = user.store.sections[0];
      this.activeSectionId.set(firstSection?.id ?? null);
    }
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
  }

  addHabit(): void {
    const newHabit: Habit = {
      id: crypto.randomUUID?.() ?? Date.now().toString(36),
      name: '',
      days: Array(DAYS_IN_WEEK).fill(false),
      progress: 0,
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

  onToggleDay(habitId: string, dayIndex: number, checked: boolean): void {
    const uid = this.activeUserId();
    const sectionId = this.currentSection().id;
    if (!uid) return;
    this.users.update((users) =>
      users.map((u) => {
        if (u.id !== uid) return u;
        const sections = u.store.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const habits = s.habits.map((h) => {
            if (h.id !== habitId) return h;
            const days = [...h.days];
            days[dayIndex] = checked;
            const progress = this.recalcProgress(days);
            return { ...h, days, progress };
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

  onSectionTabChange(index: number): void {
    const sections = this.currentSections();
    const section = sections[index];
    if (section) this.activeSectionId.set(section.id);
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
        return {
          id: typeof h.id === 'string' ? h.id : `habit-${i}`,
          name: typeof h.name === 'string' ? h.name : '',
          days,
          progress: this.recalcProgress(days),
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
