import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { TopicSubContent } from '../../shared/interfaces/topic-content';
import { TOPIC_CONTENT_BY_KEY } from './topic-content.data';
import { TOPICS } from './topic-nav.data';

@Component({
  selector: 'app-topic-detail',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topic-detail.html',
  styles: [`
    .topic-detail { padding: 2rem; }
    .topic-detail h2 { margin-top: 0; color: var(--mat-sys-on-surface); }
    .topic-detail p { color: var(--mat-sys-on-surface-variant); }
    .topic-detail a { color: var(--mat-sys-primary); }
    .topic-detail .code-block { margin: 1rem 0; }
    .topic-detail .code-block pre { margin: 0; padding: 1rem; overflow-x: auto; background: var(--mat-sys-surface-container-high); border-radius: 8px; font-family: ui-monospace, monospace; font-size: 0.875rem; }
    .topic-detail .code-block code { white-space: pre; }
    .topic-detail .code-block .code-lang { font-size: 0.75rem; color: var(--mat-sys-on-surface-variant); margin-bottom: 0.25rem; }
  `]
})
export class TopicDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly topicId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' }
  );
  protected readonly subId = toSignal(
    this.route.queryParamMap.pipe(map((q) => q.get('sub') ?? '')),
    { initialValue: this.route.snapshot.queryParamMap.get('sub') ?? '' }
  );

  protected readonly contentKey = computed(() => {
    const id = this.topicId();
    const sub = this.subId();
    if (!id || !sub) return '';
    return `${id}_${sub}`;
  });

  protected readonly content = computed<TopicSubContent | null>(() => {
    const key = this.contentKey();
    return key ? (TOPIC_CONTENT_BY_KEY[key] ?? null) : null;
  });

  constructor() {
    effect(() => {
      const id = this.topicId();
      const sub = this.subId();
      if (!id) return;
      const topic = TOPICS.find((t) => t.id === id);
      if (!topic?.children?.length) return;
      if (!sub) {
        this.router.navigate([], {
          queryParams: { sub: topic.children[0].id },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    });
  }
}
