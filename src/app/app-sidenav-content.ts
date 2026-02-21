import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, merge, of } from 'rxjs';
import { NavigationEnd } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { TranslateModule } from '@ngx-translate/core';
import { TOPICS } from './features/topics/topic-nav.data';

@Component({
  selector: 'app-sidenav-content',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatListModule, MatExpansionModule, TranslateModule],
  templateUrl: './app-sidenav-content.html',
  styleUrl: './app-sidenav-content.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppSidenavContent {
  private readonly router = inject(Router);

  navClick = output<void>();

  protected readonly topics = signal(TOPICS);

  protected readonly currentTopicId = toSignal(
    merge(
      of(this.getTopicIdFromUrl(this.router.url)),
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map(() => this.getTopicIdFromUrl(this.router.url))
      )
    ),
    { initialValue: '' }
  );

  protected readonly isOnTopicsRoute = toSignal(
    merge(
      of(this.router.url.startsWith('/topics')),
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map(() => this.router.url.startsWith('/topics'))
      )
    ),
    { initialValue: this.router.url.startsWith('/topics') }
  );

  protected onNavClick(): void {
    this.navClick.emit();
  }

  private getTopicIdFromUrl(url: string): string {
    const m = /\/topics\/([^/?#]+)/.exec(url);
    return m ? m[1] : '';
  }
}
