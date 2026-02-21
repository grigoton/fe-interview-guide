import { Injectable, inject, signal, computed } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type LocaleId = 'en' | 'ru';

const STORAGE_KEY = 'fe-guide-locale';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly translate = inject(TranslateService);

  private readonly current = signal<LocaleId>(this.loadStored());

  readonly currentLocale = this.current.asReadonly();

  constructor() {
    this.translate.addLangs(['en', 'ru']);
    this.translate.setDefaultLang('ru');
    const stored = this.loadStored();
    this.translate.use(stored);
    this.current.set(stored);
  }

  setLocale(locale: LocaleId): void {
    this.translate.use(locale);
    this.current.set(locale);
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore
    }
  }

  toggleLocale(): void {
    const next: LocaleId = this.current() === 'ru' ? 'en' : 'ru';
    this.setLocale(next);
  }

  private loadStored(): LocaleId {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'en' || v === 'ru') return v;
    } catch {
      // ignore
    }
    return 'ru';
  }
}
