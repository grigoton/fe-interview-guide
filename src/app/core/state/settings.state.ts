import { Injectable } from '@angular/core';
import { Action, State, StateContext } from '@ngxs/store';

export type ThemeId = 'light' | 'dark';

export class SetTheme {
  static readonly type = '[Settings] Set theme';
  constructor(public theme: ThemeId) {}
}

export interface SettingsStateModel {
  theme: ThemeId;
}

const DEFAULT_THEME: ThemeId = 'light';

@State<SettingsStateModel>({
  name: 'settings',
  defaults: {
    theme: DEFAULT_THEME
  }
})
@Injectable()
export class SettingsState {
  @Action(SetTheme)
  setTheme(ctx: StateContext<SettingsStateModel>, action: SetTheme): void {
    ctx.patchState({ theme: action.theme });
  }
}
