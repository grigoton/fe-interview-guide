import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-practice',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="practice">
      <h2>{{ 'PRACTICE_TITLE' | translate }}</h2>
      <p>{{ 'PRACTICE_DESC' | translate }}</p>
      <a routerLink="/topics">{{ 'PRACTICE_LINK_TOPICS' | translate }}</a>
    </div>
  `,
  styles: [`
    .practice { padding: 2rem; }
    a { color: var(--mat-sys-primary); }
  `]
})
export class Practice {}
