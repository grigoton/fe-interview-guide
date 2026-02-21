import { inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Store } from '@ngxs/store';
import { SetTheme, ThemeId } from '../state/settings.state';

const THEME_ATTR = 'data-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly store = inject(Store);

  applyTheme(theme: ThemeId): void {
    const root = this.document?.documentElement;
    if (root) {
      root.setAttribute(THEME_ATTR, theme);
    }
  }

  setTheme(theme: ThemeId): void {
    this.store.dispatch(new SetTheme(theme));
    this.applyTheme(theme);
  }

  getTheme(): ThemeId {
    return this.store.selectSnapshot((state) => state.settings?.theme) ?? 'light';
  }
}
