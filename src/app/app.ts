import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { fromEvent, debounceTime, map, shareReplay, tap } from 'rxjs';
import { ThemeService } from './core/services/theme.service';
import { LocaleService } from './core/services/locale.service';
import { AppSidenavContent } from './app-sidenav-content';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    TranslateModule,
    AppSidenavContent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly themeService = inject(ThemeService);
  protected readonly locale = inject(LocaleService);

  protected readonly isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(
      map((result) => result.matches),
      shareReplay(1),
    ),
    { initialValue: false },
  );

  protected readonly theme = signal<'light' | 'dark'>(this.themeService.getTheme());

  protected readonly sidenavOpen = signal(true);

  /** Set while window is being resized; disables sidebar transition to avoid jump at 600px breakpoint */
  protected readonly isResizing = signal(false);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      if (this.isHandset()) {
        this.sidenavOpen.set(false);
      }
    });

    fromEvent(window, 'resize')
      .pipe(
        tap(() => this.isResizing.set(true)),
        debounceTime(150),
        tap(() => this.isResizing.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected toggleSidenav(): void {
    this.sidenavOpen.update((v) => !v);
  }

  ngOnInit(): void {
    this.themeService.applyTheme(this.themeService.getTheme());
  }

  protected toggleTheme(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.themeService.setTheme(next);
    this.theme.set(next);
  }
}
