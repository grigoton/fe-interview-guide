import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeService } from './core/services/theme.service';
import { LocaleService } from './core/services/locale.service';

/**
 * Application shell.
 *
 * The top bar carries the brand, the two sections of the site (interview
 * knowledge base and course notes) and the theme/locale controls. The page
 * itself scrolls the window, which is what lets the feature screens use
 * `position: sticky` for their own toolbars.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly themeService = inject(ThemeService);

  protected readonly locale = inject(LocaleService);
  protected readonly theme = signal<'light' | 'dark'>(this.themeService.getTheme());

  constructor() {
    // Applied in the constructor, not ngOnInit, so the attribute is set before
    // the first paint of the shell.
    this.themeService.applyTheme(this.theme());
  }

  protected toggleTheme(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.themeService.setTheme(next);
    this.theme.set(next);
  }
}
