import { InterviewQuestion } from '../interfaces/question.interface';

export const ANGULAR_CORE_QUESTIONS_MORE: InterviewQuestion[] = [
  {
    id: 'ng-037',
    category: 'angular-core',
    level: 'Hard',
    tags: ['http', 'interceptors', 'functional'],
    question: {
      ru: 'Как работают функциональные HTTP-интерсепторы и как на них построить auth, retry и кэширование?',
      en: 'How do functional HTTP interceptors work, and how do you build auth, retry and caching with them?',
    },
    answer: {
      ru: `## Функциональные интерсепторы

С Angular 15 интерсепторы — это **обычные функции** \`HttpInterceptorFn\`, а не классы с DI через конструктор. Регистрируются через \`provideHttpClient(withInterceptors([...]))\`. Внутри функции можно вызывать \`inject()\`, потому что она выполняется в injection-контексте.

\`\`\`ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } })
    : req;
  return next(authReq);
};
\`\`\`

\`req\` **иммутабелен** — нужно \`req.clone()\`. \`next\` — это следующий обработчик в цепочке; интерсепторы выполняются в порядке регистрации, ответ идёт в обратном порядке.

## Retry

Оборачиваем поток в RxJS-операторы. \`retry\` с \`delay\` даёт экспоненциальный backoff:

\`\`\`ts
export const retryInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(retry({ count: 3, delay: (_, i) => timer(2 ** i * 300) }));
\`\`\`

## Кэширование

Храним \`Map<url, HttpResponse>\` (например, в сервисе) и для GET возвращаем \`of(cached)\` вместо запроса, иначе пропускаем дальше и кэшируем через \`tap\`.

## Нюансы

- \`withInterceptorsFromDi()\` нужен для совместимости со старыми классовыми \`HTTP_INTERCEPTORS\`.
- Порядок важен: auth обычно первым, logging — крайним.
- Интерсепторы видят и \`HttpResponse\`, и ошибки — можно централизованно ловить 401 и редиректить на логин.
- Функциональный стиль проще тестировать и tree-shake'ить.`,
      en: `## Functional interceptors

Since Angular 15 interceptors are **plain functions** of type \`HttpInterceptorFn\`, not classes with constructor DI. They are registered via \`provideHttpClient(withInterceptors([...]))\`. Inside the function you can call \`inject()\` because it runs in an injection context.

\`\`\`ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } })
    : req;
  return next(authReq);
};
\`\`\`

\`req\` is **immutable** — you must \`req.clone()\`. \`next\` is the next handler in the chain; interceptors run in registration order, the response flows back in reverse.

## Retry

Wrap the stream in RxJS operators. \`retry\` with \`delay\` gives exponential backoff:

\`\`\`ts
export const retryInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(retry({ count: 3, delay: (_, i) => timer(2 ** i * 300) }));
\`\`\`

## Caching

Keep a \`Map<url, HttpResponse>\` (e.g. in a service) and for GETs return \`of(cached)\` instead of a request, otherwise pass through and cache via \`tap\`.

## Nuances

- \`withInterceptorsFromDi()\` is needed for compatibility with legacy class-based \`HTTP_INTERCEPTORS\`.
- Order matters: auth usually first, logging usually last.
- Interceptors see both \`HttpResponse\` and errors — you can centrally catch 401 and redirect to login.
- The functional style is easier to test and tree-shake.`,
    },
    codeSnippet: `bootstrapApplication(App, {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, retryInterceptor, cacheInterceptor]),
    ),
  ],
});`,
  },
  {
    id: 'ng-038',
    category: 'angular-core',
    level: 'Hard',
    tags: ['error-handling', 'error-handler', 'global'],
    question: {
      ru: 'Как организовать глобальную обработку ошибок через ErrorHandler и чем она отличается от перехвата в HTTP?',
      en: 'How do you set up global error handling via ErrorHandler, and how does it differ from HTTP-level handling?',
    },
    answer: {
      ru: `## ErrorHandler

Angular предоставляет токен \`ErrorHandler\` — единую точку для **необработанных** ошибок: исключения в lifecycle-хуках, обработчиках событий, асинхронном коде внутри зоны. По умолчанию он просто пишет в \`console.error\`. Подменяя его, вы централизуете логирование (Sentry и т.п.).

\`\`\`ts
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private notifier = inject(NotificationService);
  handleError(error: unknown): void {
    const e = error instanceof HttpErrorResponse ? error : asError(error);
    this.notifier.show('Что-то пошло не так');
    console.error(e);
  }
}
// providers: [{ provide: ErrorHandler, useClass: GlobalErrorHandler }]
\`\`\`

## Отличие от HTTP-перехвата

- **HTTP-интерсептор / catchError** ловит только ошибки сети: статусы 4xx/5xx, таймауты. Здесь логично делать retry, обновление токена, маппинг в доменные ошибки.
- **ErrorHandler** ловит **всё остальное**: \`TypeError\`, ошибки рендеринга, неперехваченные \`throw\`. Это последний рубеж.

## Нюансы

- \`handleError\` выполняется **внутри** Angular-зоны — навигация и обновление UI из него работают, но осторожно с повторными ошибками (риск цикла).
- В zoneless-режиме всё так же: ошибки в CD/эффектах попадают в \`ErrorHandler\`.
- Промисы, отклонённые **вне** зоны, могут не дойти — нужен глобальный \`window.onunhandledrejection\`.
- Не глотайте ошибку молча: всегда логируйте, иначе отладка станет невозможной.
- Для SSR используйте отдельную стратегию — на сервере нет \`window\`/уведомлений.`,
      en: `## ErrorHandler

Angular provides the \`ErrorHandler\` token — a single point for **unhandled** errors: exceptions in lifecycle hooks, event handlers, async code inside the zone. By default it just writes to \`console.error\`. By overriding it you centralize logging (Sentry, etc.).

\`\`\`ts
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private notifier = inject(NotificationService);
  handleError(error: unknown): void {
    const e = error instanceof HttpErrorResponse ? error : asError(error);
    this.notifier.show('Something went wrong');
    console.error(e);
  }
}
// providers: [{ provide: ErrorHandler, useClass: GlobalErrorHandler }]
\`\`\`

## Difference from HTTP handling

- An **HTTP interceptor / catchError** only catches network errors: 4xx/5xx statuses, timeouts. That is where retry, token refresh and mapping to domain errors belong.
- \`ErrorHandler\` catches **everything else**: \`TypeError\`, render errors, uncaught \`throw\`. It is the last line of defence.

## Nuances

- \`handleError\` runs **inside** the Angular zone — navigation and UI updates from it work, but beware re-entrant errors (loop risk).
- In zoneless mode it is the same: errors in CD/effects reach \`ErrorHandler\`.
- Promises rejected **outside** the zone may not arrive — you need a global \`window.onunhandledrejection\`.
- Never swallow an error silently: always log, or debugging becomes impossible.
- For SSR use a separate strategy — there is no \`window\`/notifications on the server.`,
    },
    codeSnippet: `@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private logger = inject(LoggingService);
  handleError(error: unknown): void {
    this.logger.captureException(error);
  }
}`,
  },
  {
    id: 'ng-039',
    category: 'angular-core',
    level: 'Medium',
    tags: ['app-initializer', 'bootstrap', 'startup'],
    question: {
      ru: 'Зачем нужен APP_INITIALIZER / provideAppInitializer и как он влияет на старт приложения?',
      en: 'What is APP_INITIALIZER / provideAppInitializer for, and how does it affect app startup?',
    },
    answer: {
      ru: `## Назначение

\`APP_INITIALIZER\` — это hook, который выполняется **до** того, как Angular отрендерит корневой компонент. Если фабрика возвращает \`Promise\` или \`Observable\`, Angular **дожидается** его завершения. Используется для критичных задач старта: загрузка runtime-конфига, фиче-флагов, локали, проверки сессии.

\`\`\`ts
// классический multi-провайдер
{
  provide: APP_INITIALIZER,
  multi: true,
  useFactory: (config: ConfigService) => () => config.load(),
  deps: [ConfigService],
}
\`\`\`

## provideAppInitializer (Angular 19+)

Новый функциональный API без \`multi\`/\`deps\`-боилерплейта; внутри работает \`inject()\`:

\`\`\`ts
provideAppInitializer(() => {
  const config = inject(ConfigService);
  return config.load();
});
\`\`\`

## Как влияет на старт

- Все инициализаторы (это multi-токен) запускаются **параллельно**, бутстрап ждёт **все** \`Promise\`.
- Долгий инициализатор задерживает первый рендер — кладите туда только то, что **обязано** быть готово до UI.
- Ошибка/reject в инициализаторе **прерывает** бутстрап — приложение не стартует.

## Нюансы

- Для конфига часто комбинируют с фабрикой \`InjectionToken\`, чтобы значения были доступны синхронно везде.
- Не путать с \`ENVIRONMENT_INITIALIZER\`: тот выполняется при создании EnvironmentInjector (раньше и для каждого инжектора), без ожидания async.
- В SSR инициализаторы выполняются и на сервере — учитывайте отсутствие \`window\`.`,
      en: `## Purpose

\`APP_INITIALIZER\` is a hook that runs **before** Angular renders the root component. If the factory returns a \`Promise\` or \`Observable\`, Angular **waits** for it to settle. Used for critical startup tasks: loading runtime config, feature flags, locale, session checks.

\`\`\`ts
// classic multi-provider
{
  provide: APP_INITIALIZER,
  multi: true,
  useFactory: (config: ConfigService) => () => config.load(),
  deps: [ConfigService],
}
\`\`\`

## provideAppInitializer (Angular 19+)

A new functional API without \`multi\`/\`deps\` boilerplate; \`inject()\` works inside:

\`\`\`ts
provideAppInitializer(() => {
  const config = inject(ConfigService);
  return config.load();
});
\`\`\`

## Effect on startup

- All initializers (it is a multi-token) run **in parallel**, bootstrap awaits **all** \`Promise\`s.
- A slow initializer delays the first render — only put things that **must** be ready before the UI.
- An error/rejection in an initializer **aborts** bootstrap — the app does not start.

## Nuances

- For config, it is often combined with an \`InjectionToken\` factory so values are synchronously available everywhere.
- Do not confuse with \`ENVIRONMENT_INITIALIZER\`: that runs when an EnvironmentInjector is created (earlier and per injector), without awaiting async work.
- In SSR initializers run on the server too — account for the missing \`window\`.`,
    },
    codeSnippet: `bootstrapApplication(App, {
  providers: [
    provideAppInitializer(() => inject(ConfigService).load()),
  ],
});`,
  },
  {
    id: 'ng-040',
    category: 'angular-core',
    level: 'Medium',
    tags: ['view-encapsulation', 'shadow-dom', 'styles'],
    question: {
      ru: 'Чем отличаются ViewEncapsulation Emulated, ShadowDom и None, и почему ::ng-deep устарел?',
      en: 'How do ViewEncapsulation Emulated, ShadowDom and None differ, and why is ::ng-deep deprecated?',
    },
    answer: {
      ru: `## Emulated (по умолчанию)

Angular **эмулирует** Shadow DOM, не используя его. При компиляции к каждому элементу компонента добавляется уникальный атрибут (\`_ngcontent-xxx\`), а селекторы стилей переписываются с этим атрибутом. Стили компонента не «протекают» наружу, но и **глобальные стили** просачиваются внутрь. Работает везде, без реального Shadow DOM.

## ShadowDom

Использует **нативный** Shadow DOM браузера: \`attachShadow\`. Полная изоляция — глобальные стили **не** проникают внутрь, а стили компонента не выходят наружу. Минусы: ломается стилизация снаружи (темы), \`document\`-селекторы и некоторые сторонние библиотеки могут не работать; проекция идёт через нативный \`<slot>\`.

## None

Стили компонента становятся **глобальными** — добавляются в \`<head>\` без скоупинга. Любой компонент может быть затронут. Применяют осознанно для глобальных тем/ресетов.

## ::ng-deep

\`::ng-deep\` (и старые \`/deep/\`, \`>>>\`) отключает скоупинг для части селектора, позволяя стилю «пробить» границу в дочерние компоненты. Он **deprecated**, потому что это часть устаревшего стандарта Shadow DOM piercing, и в нативном Shadow DOM не работает.

## Современные альтернативы

- CSS Custom Properties (переменные) — они **наследуются** сквозь любые границы, идеальны для тем.
- \`::part()\` / \`::slotted()\` для Shadow DOM.
- Глобальные стили или \`encapsulation: None\` для конкретного дизайн-системного слоя.

\`\`\`ts
@Component({ encapsulation: ViewEncapsulation.Emulated })
\`\`\``,
      en: `## Emulated (default)

Angular **emulates** Shadow DOM without using it. At compile time a unique attribute (\`_ngcontent-xxx\`) is added to each component element, and style selectors are rewritten with that attribute. Component styles do not leak out, but **global styles** still seep in. Works everywhere, no real Shadow DOM.

## ShadowDom

Uses the browser's **native** Shadow DOM: \`attachShadow\`. Full isolation — global styles do **not** penetrate inside, and component styles do not escape. Downsides: external styling (theming) breaks, \`document\` selectors and some third-party libraries may not work; projection goes through native \`<slot>\`.

## None

Component styles become **global** — added to \`<head>\` with no scoping. Any component can be affected. Used deliberately for global themes/resets.

## ::ng-deep

\`::ng-deep\` (and the old \`/deep/\`, \`>>>\`) disables scoping for part of a selector, letting a style "pierce" the boundary into child components. It is **deprecated** because it is part of the removed Shadow DOM piercing spec and does not work in native Shadow DOM.

## Modern alternatives

- CSS Custom Properties (variables) — they **inherit** across any boundary, ideal for theming.
- \`::part()\` / \`::slotted()\` for Shadow DOM.
- Global styles or \`encapsulation: None\` for a specific design-system layer.

\`\`\`ts
@Component({ encapsulation: ViewEncapsulation.Emulated })
\`\`\``,
    },
    codeSnippet: `@Component({
  selector: 'app-card',
  encapsulation: ViewEncapsulation.Emulated, // default: attribute-scoped CSS
  styles: [':host { --card-bg: white; } .body { background: var(--card-bg); }'],
})
export class CardComponent {}`,
  },
  {
    id: 'ng-041',
    category: 'angular-core',
    level: 'Hard',
    tags: ['renderer2', 'dom-sanitizer', 'security', 'xss'],
    question: {
      ru: 'Зачем использовать Renderer2 и как DomSanitizer защищает от XSS?',
      en: 'Why use Renderer2, and how does DomSanitizer protect against XSS?',
    },
    answer: {
      ru: `## Renderer2

\`Renderer2\` — абстракция над DOM, которая позволяет манипулировать элементами **без прямого обращения** к \`document\`. Зачем:
- **Platform-agnostic**: работает в SSR (где нет \`document\`), в Web Workers.
- Совместимо с анимациями и будущими рендер-движками.

\`\`\`ts
const r = inject(Renderer2);
r.setAttribute(el, 'aria-hidden', 'true');
r.addClass(el, 'active');
const unlisten = r.listen(el, 'click', () => {});
\`\`\`

Прямой \`nativeElement.innerHTML = ...\` — антипаттерн: ломает SSR и открывает XSS.

## Контекстная санитизация

Angular по умолчанию **санитизирует** все интерполяции и property-биндинги в зависимости от контекста: HTML, STYLE, URL, RESOURCE_URL. Опасный HTML вырезается, \`javascript:\`-URL блокируется. Поэтому \`{{ userInput }}\` безопасен — текст экранируется.

## DomSanitizer

Когда нужно вставить доверенный HTML/URL, Angular требует **явно** пометить значение доверенным:

\`\`\`ts
const safe = inject(DomSanitizer).bypassSecurityTrustHtml(html);
// [innerHTML]="safe"
\`\`\`

\`bypassSecurityTrust*\` — это «escape hatch». Использовать **только** для значений, в безопасности которых вы уверены (не пользовательский ввод), иначе вы сами создаёте XSS.

## Нюансы

- \`[innerHTML]\` проходит санитизацию (\`SecurityContext.HTML\`) — скрипты вырезаются; чтобы вставить как есть, нужен bypass.
- \`[src]\`/\`[href]\` для ресурсов (\`<iframe>\`) требуют \`RESOURCE_URL\` — его нельзя санитизировать, только bypass.
- Trusted Types (CSP) усиливают защиту на уровне браузера.`,
      en: `## Renderer2

\`Renderer2\` is an abstraction over the DOM that lets you manipulate elements **without touching** \`document\` directly. Why:
- **Platform-agnostic**: works in SSR (no \`document\`), Web Workers.
- Compatible with animations and future render engines.

\`\`\`ts
const r = inject(Renderer2);
r.setAttribute(el, 'aria-hidden', 'true');
r.addClass(el, 'active');
const unlisten = r.listen(el, 'click', () => {});
\`\`\`

Direct \`nativeElement.innerHTML = ...\` is an anti-pattern: it breaks SSR and opens XSS.

## Contextual sanitization

By default Angular **sanitizes** all interpolations and property bindings depending on context: HTML, STYLE, URL, RESOURCE_URL. Dangerous HTML is stripped, \`javascript:\` URLs are blocked. That is why \`{{ userInput }}\` is safe — text is escaped.

## DomSanitizer

When you need to insert trusted HTML/URL, Angular requires you to **explicitly** mark the value trusted:

\`\`\`ts
const safe = inject(DomSanitizer).bypassSecurityTrustHtml(html);
// [innerHTML]="safe"
\`\`\`

\`bypassSecurityTrust*\` is an "escape hatch". Use it **only** for values you are sure are safe (not user input), otherwise you create the XSS yourself.

## Nuances

- \`[innerHTML]\` is sanitized (\`SecurityContext.HTML\`) — scripts are stripped; to insert verbatim you need bypass.
- \`[src]\`/\`[href]\` for resources (\`<iframe>\`) require \`RESOURCE_URL\` — which cannot be sanitized, only bypassed.
- Trusted Types (CSP) strengthen protection at the browser level.`,
    },
    codeSnippet: `@Directive({ selector: '[appHighlight]' })
export class HighlightDirective {
  private r = inject(Renderer2);
  private el = inject(ElementRef);
  ngOnInit() {
    this.r.setStyle(this.el.nativeElement, 'background', 'yellow');
  }
}`,
  },
  {
    id: 'ng-042',
    category: 'angular-core',
    level: 'Medium',
    tags: ['ng-container', 'template-outlet', 'component-outlet'],
    question: {
      ru: 'Для чего нужны ng-container, ngTemplateOutlet и ngComponentOutlet?',
      en: 'What are ng-container, ngTemplateOutlet and ngComponentOutlet used for?',
    },
    answer: {
      ru: `## ng-container

Логический контейнер, который **не создаёт** DOM-элемент. Нужен, чтобы навесить структурную директиву (\`*ngIf\`, \`*ngFor\`, \`@if\` обёртку) или сгруппировать узлы без лишнего \`<div>\`. Особенно полезен, когда нельзя ставить две структурные директивы на один элемент.

\`\`\`html
<ng-container *ngIf="user as u">
  <h2>{{ u.name }}</h2>
</ng-container>
\`\`\`

## ngTemplateOutlet

Рендерит \`ng-template\` в заданном месте, с передачей **контекста**. Это механизм переиспользования кусков шаблона и кастомизации компонентов (передача шаблона снаружи).

\`\`\`html
<ng-template #row let-item let-i="index">{{ i }}: {{ item }}</ng-template>
<ng-container
  [ngTemplateOutlet]="row"
  [ngTemplateOutletContext]="{ $implicit: data, index: 0 }" />
\`\`\`

Ключ \`$implicit\` маппится на \`let-item\` без имени.

## ngComponentOutlet

Декларативно рендерит **компонент по классу**, динамически — без \`ViewContainerRef.createComponent\`. Поддерживает inputs, инжектор и проекцию контента (Angular 16.2+).

\`\`\`html
<ng-container
  [ngComponentOutlet]="widgetClass"
  [ngComponentOutletInputs]="{ title: 'Hi' }" />
\`\`\`

## Когда что

- \`ng-container\` — структурная группировка без DOM.
- \`ngTemplateOutlet\` — повтор/инъекция шаблона с контекстом (паттерн «slot с данными»).
- \`ngComponentOutlet\` — динамический выбор компонента (дашборды, плагины, CMS-виджеты) декларативно.`,
      en: `## ng-container

A logical container that creates **no** DOM element. Use it to attach a structural directive (\`*ngIf\`, \`*ngFor\`, an \`@if\` wrapper) or group nodes without an extra \`<div>\`. Especially handy when you cannot put two structural directives on one element.

\`\`\`html
<ng-container *ngIf="user as u">
  <h2>{{ u.name }}</h2>
</ng-container>
\`\`\`

## ngTemplateOutlet

Renders an \`ng-template\` at a given place, passing a **context**. It is a mechanism for reusing template fragments and customizing components (passing a template from outside).

\`\`\`html
<ng-template #row let-item let-i="index">{{ i }}: {{ item }}</ng-template>
<ng-container
  [ngTemplateOutlet]="row"
  [ngTemplateOutletContext]="{ $implicit: data, index: 0 }" />
\`\`\`

The \`$implicit\` key maps to the unnamed \`let-item\`.

## ngComponentOutlet

Declaratively renders a **component by class**, dynamically — without \`ViewContainerRef.createComponent\`. It supports inputs, an injector and content projection (Angular 16.2+).

\`\`\`html
<ng-container
  [ngComponentOutlet]="widgetClass"
  [ngComponentOutletInputs]="{ title: 'Hi' }" />
\`\`\`

## When to use which

- \`ng-container\` — structural grouping without DOM.
- \`ngTemplateOutlet\` — repeat/inject a template with context (the "slot with data" pattern).
- \`ngComponentOutlet\` — dynamic component selection (dashboards, plugins, CMS widgets) declaratively.`,
    },
    codeSnippet: `<ng-template #cell let-value let-col="col">{{ col }}: {{ value }}</ng-template>

<ng-container
  *ngFor="let row of rows"
  [ngTemplateOutlet]="cell"
  [ngTemplateOutletContext]="{ $implicit: row.value, col: row.col }" />`,
  },
  {
    id: 'ng-043',
    category: 'angular-core',
    level: 'Hard',
    tags: ['structural-directives', 'microsyntax', 'template-ref'],
    question: {
      ru: 'Как написать кастомную структурную директиву и как разворачивается её микросинтаксис?',
      en: 'How do you write a custom structural directive, and how does its microsyntax desugar?',
    },
    answer: {
      ru: `## Что такое структурная директива

Звёздочка \`*\` — это синтаксический сахар. \`<div *appUnless="cond">\` разворачивается в:

\`\`\`html
<ng-template appUnless [appUnless]="cond">
  <div></div>
</ng-template>
\`\`\`

Директива получает \`TemplateRef\` (содержимое) и \`ViewContainerRef\` (точка вставки) и сама решает, создавать ли view.

\`\`\`ts
@Directive({ selector: '[appUnless]' })
export class UnlessDirective {
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private created = false;

  @Input() set appUnless(cond: boolean) {
    if (!cond && !this.created) {
      this.vcr.createEmbeddedView(this.tpl);
      this.created = true;
    } else if (cond && this.created) {
      this.vcr.clear();
      this.created = false;
    }
  }
}
\`\`\`

## Микросинтаксис

\`*ngFor="let item of items; let i = index; trackBy: fn"\` разворачивается по правилам: первое слово после \`*\` — имя директивы и её главный input; ключевые слова (\`of\`, \`let\`, \`as\`) маппятся на inputs (\`ngForOf\`) и контекстные переменные. \`let x = expr\` создаёт локальную переменную из контекста embedded view.

## Type-guards

Для строгой типизации шаблона добавляют статический \`ngTemplateGuard_\` и \`ngTemplateContextGuard\`, чтобы внутри шаблона типы сужались (как \`*ngIf\` сужает к non-null).

## Нюансы

- Современный \`@if\`/\`@for\` (control flow) встроен в компилятор и быстрее; кастомные структурные директивы всё ещё нужны для своей логики (\`*appHasPermission\`).
- Один элемент — одна структурная директива; используйте \`ng-container\` для нескольких.`,
      en: `## What a structural directive is

The asterisk \`*\` is syntactic sugar. \`<div *appUnless="cond">\` desugars to:

\`\`\`html
<ng-template appUnless [appUnless]="cond">
  <div></div>
</ng-template>
\`\`\`

The directive receives a \`TemplateRef\` (the content) and a \`ViewContainerRef\` (the insertion point) and decides whether to create the view itself.

\`\`\`ts
@Directive({ selector: '[appUnless]' })
export class UnlessDirective {
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private created = false;

  @Input() set appUnless(cond: boolean) {
    if (!cond && !this.created) {
      this.vcr.createEmbeddedView(this.tpl);
      this.created = true;
    } else if (cond && this.created) {
      this.vcr.clear();
      this.created = false;
    }
  }
}
\`\`\`

## Microsyntax

\`*ngFor="let item of items; let i = index; trackBy: fn"\` desugars by rules: the first word after \`*\` is the directive name and its primary input; keywords (\`of\`, \`let\`, \`as\`) map to inputs (\`ngForOf\`) and context variables. \`let x = expr\` creates a local variable from the embedded view context.

## Type guards

For strict template typing you add a static \`ngTemplateGuard_\` and \`ngTemplateContextGuard\` so types narrow inside the template (like \`*ngIf\` narrows to non-null).

## Nuances

- The modern \`@if\`/\`@for\` (control flow) is built into the compiler and faster; custom structural directives are still useful for your own logic (\`*appHasPermission\`).
- One element — one structural directive; use \`ng-container\` for several.`,
    },
    codeSnippet: `@Directive({ selector: '[appRepeat]' })
export class RepeatDirective {
  private tpl = inject(TemplateRef<{ $implicit: number }>);
  private vcr = inject(ViewContainerRef);
  @Input() set appRepeat(count: number) {
    this.vcr.clear();
    for (let i = 0; i < count; i++) {
      this.vcr.createEmbeddedView(this.tpl, { $implicit: i });
    }
  }
}`,
  },
  {
    id: 'ng-044',
    category: 'angular-core',
    level: 'Medium',
    tags: ['animations', 'triggers', 'keyframes'],
    question: {
      ru: 'Как устроены анимации @angular/animations: триггеры, состояния, переходы и keyframes?',
      en: 'How do @angular/animations work: triggers, states, transitions and keyframes?',
    },
    answer: {
      ru: `## Декларативная модель

Анимации Angular описываются как **машина состояний** в метаданных компонента, а не в CSS. Подключаются через \`provideAnimationsAsync()\` (или \`provideAnimations()\`).

## Триггер и состояния

\`trigger\` связывает имя анимации с шаблоном (\`[@name]\`). \`state\` задаёт стиль конечного состояния, \`transition\` — анимацию между состояниями.

\`\`\`ts
animations: [
  trigger('open', [
    state('closed', style({ height: '0', opacity: 0 })),
    state('open', style({ height: '*', opacity: 1 })),
    transition('closed <=> open', animate('300ms ease-in-out')),
  ]),
]
// <div [@open]="isOpen ? 'open' : 'closed'">
\`\`\`

\`*\` — «текущее вычисленное значение» (например, реальная высота).

## Спец-переходы

- \`:enter\` / \`:leave\` — для появления/удаления элемента (алиасы \`void => *\` и \`* => void\`).
- \`:increment\` / \`:decrement\` — по числовому значению.

## keyframes и query/stagger

\`keyframes\` задаёт промежуточные кадры с \`offset\`. \`query\` + \`stagger\` анимируют список с задержкой между элементами.

\`\`\`ts
transition('* => *', [
  query(':enter', [
    style({ opacity: 0 }),
    stagger(50, animate('200ms', style({ opacity: 1 }))),
  ], { optional: true }),
])
\`\`\`

## Нюансы

- Анимации выполняются через Web Animations API; \`:leave\` откладывает реальное удаление DOM до конца анимации.
- Пакет \`@angular/animations\` весит немало — для простых эффектов часто достаточно CSS transitions.
- В SSR анимации запускаются только в браузере после гидратации.`,
      en: `## Declarative model

Angular animations are described as a **state machine** in the component metadata, not in CSS. Enabled via \`provideAnimationsAsync()\` (or \`provideAnimations()\`).

## Trigger and states

\`trigger\` binds an animation name to the template (\`[@name]\`). \`state\` defines an end-state style, \`transition\` defines the animation between states.

\`\`\`ts
animations: [
  trigger('open', [
    state('closed', style({ height: '0', opacity: 0 })),
    state('open', style({ height: '*', opacity: 1 })),
    transition('closed <=> open', animate('300ms ease-in-out')),
  ]),
]
// <div [@open]="isOpen ? 'open' : 'closed'">
\`\`\`

\`*\` means "current computed value" (e.g. the real height).

## Special transitions

- \`:enter\` / \`:leave\` — for element appearance/removal (aliases of \`void => *\` and \`* => void\`).
- \`:increment\` / \`:decrement\` — by numeric value.

## keyframes and query/stagger

\`keyframes\` defines intermediate frames with \`offset\`. \`query\` + \`stagger\` animate a list with a delay between items.

\`\`\`ts
transition('* => *', [
  query(':enter', [
    style({ opacity: 0 }),
    stagger(50, animate('200ms', style({ opacity: 1 }))),
  ], { optional: true }),
])
\`\`\`

## Nuances

- Animations run via the Web Animations API; \`:leave\` delays the actual DOM removal until the animation finishes.
- The \`@angular/animations\` package is sizable — plain CSS transitions are often enough for simple effects.
- In SSR animations only run in the browser after hydration.`,
    },
    codeSnippet: `trigger('flash', [
  transition(':enter', [
    animate('600ms', keyframes([
      style({ background: 'yellow', offset: 0 }),
      style({ background: 'orange', offset: 0.5 }),
      style({ background: 'transparent', offset: 1 }),
    ])),
  ]),
])`,
  },
  {
    id: 'ng-045',
    category: 'angular-core',
    level: 'Medium',
    tags: ['ng-optimized-image', 'performance', 'lcp'],
    question: {
      ru: 'Что даёт директива NgOptimizedImage и как она улучшает LCP?',
      en: 'What does the NgOptimizedImage directive give you, and how does it improve LCP?',
    },
    answer: {
      ru: `## Назначение

\`NgOptimizedImage\` (атрибут \`ngSrc\`) — директива для оптимальной загрузки изображений, напрямую влияющая на **Core Web Vitals**, особенно LCP (Largest Contentful Paint).

\`\`\`html
<img ngSrc="hero.jpg" width="800" height="600" priority alt="Hero" />
\`\`\`

## Что она делает автоматически

- **Требует width/height** — резервирует место и устраняет CLS (layout shift).
- **lazy loading** по умолчанию (\`loading="lazy"\`) для всех, кроме приоритетных.
- **priority** — для LCP-картинки: добавляет \`fetchpriority="high"\`, \`loading="eager"\` и **preload**-подсказку в \`<head>\`, ускоряя загрузку.
- **srcset** генерируется автоматически по набору breakpoint'ов для адаптивности.
- **Предупреждения в dev**: о слишком больших файлах, отсутствии \`priority\` у LCP, неверных размерах.

## Image loaders

Через \`provideImgixLoader\`/\`provideCloudflareLoader\` или кастомный loader директива переписывает URL под CDN с ресайзом и форматом (WebP/AVIF):

\`\`\`ts
provideImgixLoader('https://cdn.example.com/')
\`\`\`

## Нюансы

- Для адаптивных изображений на всю ширину используйте \`fill\` вместо width/height (родитель должен быть \`position: relative\`).
- \`ngSrcset\` задаёт плотности/ширины: \`ngSrcset="1x, 2x"\` или \`"100w, 200w"\`.
- Директива не оптимизирует сами файлы — это делает CDN/loader; она управляет **как** браузер их грузит.
- Нельзя одновременно \`ngSrc\` и \`src\`.`,
      en: `## Purpose

\`NgOptimizedImage\` (the \`ngSrc\` attribute) is a directive for optimal image loading that directly affects **Core Web Vitals**, especially LCP (Largest Contentful Paint).

\`\`\`html
<img ngSrc="hero.jpg" width="800" height="600" priority alt="Hero" />
\`\`\`

## What it does automatically

- **Requires width/height** — reserves space and eliminates CLS (layout shift).
- **Lazy loading** by default (\`loading="lazy"\`) for everything except priority images.
- **priority** — for the LCP image: adds \`fetchpriority="high"\`, \`loading="eager"\` and a **preload** hint in \`<head>\`, speeding up loading.
- **srcset** is generated automatically from a set of breakpoints for responsiveness.
- **Dev warnings**: oversized files, missing \`priority\` on the LCP image, wrong dimensions.

## Image loaders

Via \`provideImgixLoader\`/\`provideCloudflareLoader\` or a custom loader the directive rewrites URLs for a CDN with resizing and format (WebP/AVIF):

\`\`\`ts
provideImgixLoader('https://cdn.example.com/')
\`\`\`

## Nuances

- For full-width responsive images use \`fill\` instead of width/height (the parent must be \`position: relative\`).
- \`ngSrcset\` sets densities/widths: \`ngSrcset="1x, 2x"\` or \`"100w, 200w"\`.
- The directive does not optimize the files themselves — the CDN/loader does; it controls **how** the browser loads them.
- You cannot use \`ngSrc\` and \`src\` together.`,
    },
    codeSnippet: `@Component({
  imports: [NgOptimizedImage],
  template: \`
    <img ngSrc="hero.avif" width="1200" height="630" priority alt="Banner" />
    <img ngSrc="thumb.jpg" width="120" height="120" alt="Thumb" />
  \`,
})
export class GalleryComponent {}`,
  },
  {
    id: 'ng-046',
    category: 'angular-core',
    level: 'Hard',
    tags: ['defer', 'triggers', 'prefetch', 'lazy-loading'],
    question: {
      ru: 'Какие триггеры, prefetch и блоки (@placeholder/@loading/@error) есть у @defer и как они работают?',
      en: 'What triggers, prefetch and blocks (@placeholder/@loading/@error) does @defer have, and how do they work?',
    },
    answer: {
      ru: `## Идея @defer

\`@defer\` (Angular 17+) лениво загружает **код** зависимостей блока отдельным чанком и рендерит содержимое только при срабатывании триггера. Это снижает initial bundle и улучшает TTI.

## Блоки

\`\`\`html
@defer (on viewport) {
  <app-heavy-chart [data]="data" />
} @placeholder (minimum 500ms) {
  <div>Прокрутите ниже</div>
} @loading (after 100ms; minimum 1s) {
  <app-spinner />
} @error {
  <p>Не удалось загрузить</p>
}
\`\`\`

- \`@placeholder\` — до начала загрузки (опционально, рендерится сразу, но его зависимости не отложены).
- \`@loading\` — пока грузится чанк; \`after\`/\`minimum\` убирают мелькание.
- \`@error\` — если загрузка чанка провалилась.

## Триггеры

- \`on idle\` (по умолчанию) — при \`requestIdleCallback\`.
- \`on viewport\` — когда блок (или placeholder) попадает в видимую область (IntersectionObserver).
- \`on interaction\`, \`on hover\` — по событию пользователя.
- \`on timer(2s)\`, \`on immediate\`.
- \`when condition\` — по булевому выражению/сигналу.

Триггеры можно комбинировать и привязывать к элементу-ссылке: \`on viewport(ref)\`.

## prefetch

\`prefetch\` загружает чанк **заранее**, не рендеря его, по отдельному триггеру: \`@defer (on interaction; prefetch on idle)\`. Так код уже в кэше к моменту реального показа.

## Нюансы

- Все зависимости defer-блока должны быть **standalone** и использоваться только внутри блока, иначе они не отложатся.
- В SSR с incremental hydration defer-границы становятся точками частичной гидратации.`,
      en: `## The @defer idea

\`@defer\` (Angular 17+) lazily loads the **code** of the block's dependencies as a separate chunk and renders the content only when a trigger fires. This shrinks the initial bundle and improves TTI.

## Blocks

\`\`\`html
@defer (on viewport) {
  <app-heavy-chart [data]="data" />
} @placeholder (minimum 500ms) {
  <div>Scroll down</div>
} @loading (after 100ms; minimum 1s) {
  <app-spinner />
} @error {
  <p>Failed to load</p>
}
\`\`\`

- \`@placeholder\` — before loading starts (optional, rendered immediately, but its dependencies are not deferred).
- \`@loading\` — while the chunk loads; \`after\`/\`minimum\` prevent flicker.
- \`@error\` — if the chunk fails to load.

## Triggers

- \`on idle\` (default) — on \`requestIdleCallback\`.
- \`on viewport\` — when the block (or placeholder) enters the viewport (IntersectionObserver).
- \`on interaction\`, \`on hover\` — on a user event.
- \`on timer(2s)\`, \`on immediate\`.
- \`when condition\` — on a boolean expression/signal.

Triggers can be combined and bound to a reference element: \`on viewport(ref)\`.

## prefetch

\`prefetch\` loads the chunk **ahead of time** without rendering it, on a separate trigger: \`@defer (on interaction; prefetch on idle)\`. So the code is already cached when the real display happens.

## Nuances

- All defer-block dependencies must be **standalone** and used only inside the block, otherwise they will not be deferred.
- In SSR with incremental hydration, defer boundaries become partial-hydration points.`,
    },
    codeSnippet: `@defer (on hover; prefetch on idle) {
  <app-comments [postId]="id" />
} @placeholder {
  <button>Show comments</button>
} @loading (minimum 300ms) {
  <app-spinner />
}`,
  },
  {
    id: 'ng-047',
    category: 'angular-core',
    level: 'Hard',
    tags: ['destroy-ref', 'take-until-destroyed', 'cleanup'],
    question: {
      ru: 'Как DestroyRef и takeUntilDestroyed решают проблему отписок и где их можно вызывать?',
      en: 'How do DestroyRef and takeUntilDestroyed solve unsubscription, and where can they be used?',
    },
    answer: {
      ru: `## Проблема

Классический паттерн отписки — \`takeUntil(this.destroy$)\` с \`Subject\`, который нужно создавать, эмитить и завершать в \`ngOnDestroy\`. Много шаблонного кода и легко забыть.

## DestroyRef

\`DestroyRef\` — инжектируемый токен, дающий доступ к моменту уничтожения текущего контекста (компонента, директивы, сервиса с тем же lifecycle). Метод \`onDestroy(cb)\` регистрирует колбэк очистки.

\`\`\`ts
private destroyRef = inject(DestroyRef);
ngOnInit() {
  const id = setInterval(tick, 1000);
  this.destroyRef.onDestroy(() => clearInterval(id));
}
\`\`\`

## takeUntilDestroyed

RxJS-оператор, который автоматически завершает подписку при уничтожении контекста, используя \`DestroyRef\` под капотом.

\`\`\`ts
this.data$
  .pipe(takeUntilDestroyed()) // в конструкторе/поле — берёт DestroyRef сам
  .subscribe();
\`\`\`

## Где вызывать

- **Без аргумента** \`takeUntilDestroyed()\` должен вызываться в **injection-контексте** (инициализатор поля, конструктор), чтобы получить \`DestroyRef\` через \`inject()\`.
- **Вне** этого контекста (например, в \`ngOnInit\` или колбэке) нужно передать ref явно: \`takeUntilDestroyed(this.destroyRef)\`.

## Нюансы

- Работает для любого контекста с DI, включая сервисы, предоставленные на уровне компонента (уничтожаются вместе с ним).
- Не отменяет необходимость завершать «горячие» источники; но для подписок это идиоматичная замена \`ngOnDestroy\`.
- В связке с сигналами (\`toSignal\`) отписка происходит автоматически — ручной \`takeUntilDestroyed\` нужен реже.`,
      en: `## The problem

The classic unsubscription pattern is \`takeUntil(this.destroy$)\` with a \`Subject\` you must create, emit and complete in \`ngOnDestroy\`. Lots of boilerplate and easy to forget.

## DestroyRef

\`DestroyRef\` is an injectable token giving access to the destruction moment of the current context (component, directive, service with the same lifecycle). The \`onDestroy(cb)\` method registers a cleanup callback.

\`\`\`ts
private destroyRef = inject(DestroyRef);
ngOnInit() {
  const id = setInterval(tick, 1000);
  this.destroyRef.onDestroy(() => clearInterval(id));
}
\`\`\`

## takeUntilDestroyed

An RxJS operator that automatically completes the subscription when the context is destroyed, using \`DestroyRef\` under the hood.

\`\`\`ts
this.data$
  .pipe(takeUntilDestroyed()) // in constructor/field — grabs DestroyRef itself
  .subscribe();
\`\`\`

## Where to call it

- **Without an argument** \`takeUntilDestroyed()\` must be called in an **injection context** (field initializer, constructor) to obtain \`DestroyRef\` via \`inject()\`.
- **Outside** that context (e.g. in \`ngOnInit\` or a callback) you must pass the ref explicitly: \`takeUntilDestroyed(this.destroyRef)\`.

## Nuances

- It works for any DI context, including component-level services (destroyed together with the component).
- It does not remove the need to complete "hot" sources; but for subscriptions it is the idiomatic replacement for \`ngOnDestroy\`.
- Combined with signals (\`toSignal\`) unsubscription is automatic — manual \`takeUntilDestroyed\` is needed less often.`,
    },
    codeSnippet: `export class WidgetComponent {
  private destroyRef = inject(DestroyRef);
  private svc = inject(DataService);

  ngOnInit() {
    this.svc.stream$
      .pipe(takeUntilDestroyed(this.destroyRef)) // explicit ref outside ctor
      .subscribe(v => this.handle(v));
  }
}`,
  },
  {
    id: 'ng-048',
    category: 'angular-core',
    level: 'Expert',
    tags: ['effect', 'untracked', 'computed-equality'],
    question: {
      ru: 'Как работают cleanup в effect, untracked и кастомное equality у computed?',
      en: 'How do effect cleanup, untracked and custom computed equality work?',
    },
    answer: {
      ru: `## Cleanup в effect

Колбэк effect получает \`onCleanup\`, который вызывается **перед каждым** повторным запуском и при уничтожении. Это место для отмены таймеров, подписок, запросов:

\`\`\`ts
effect((onCleanup) => {
  const ctrl = new AbortController();
  fetch(url(), { signal: ctrl.signal });
  onCleanup(() => ctrl.abort());
});
\`\`\`

## untracked

По умолчанию **любой** сигнал, прочитанный внутри \`effect\`/\`computed\`, становится зависимостью. \`untracked(() => ...)\` читает сигнал **без** создания зависимости — эффект не перезапустится при его изменении.

\`\`\`ts
effect(() => {
  const value = data();              // зависимость
  const cfg = untracked(() => config()); // НЕ зависимость
  log(value, cfg);
});
\`\`\`

Типичный кейс: эффект должен реагировать на \`data\`, но использовать «текущее» значение \`config\` без подписки на него — иначе лишние перезапуски.

## Кастомное equality у computed

\`computed\`/\`signal\` по умолчанию сравнивают через \`Object.is\`. Для объектов/массивов это означает, что новая ссылка с теми же данными считается изменением. Опция \`equal\` задаёт свою функцию сравнения:

\`\`\`ts
const list = computed(() => filter(items()), {
  equal: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]),
});
\`\`\`

Если \`equal\` вернёт \`true\`, значение считается неизменным — зависимые computed/effects/шаблон **не** пересчитываются, что экономит CD.

## Нюансы

- \`untracked\` также нужен, чтобы безопасно вызывать методы/писать вне реактивного трекинга внутри computed.
- Слишком тяжёлая \`equal\`-функция может стоить дороже, чем лишний пересчёт — мерьте.
- \`untracked\` не делает чтение «замороженным»: оно вернёт актуальное значение на момент вызова.`,
      en: `## Cleanup in effect

An effect callback receives \`onCleanup\`, called **before each** re-run and on destruction. It is the place to cancel timers, subscriptions, requests:

\`\`\`ts
effect((onCleanup) => {
  const ctrl = new AbortController();
  fetch(url(), { signal: ctrl.signal });
  onCleanup(() => ctrl.abort());
});
\`\`\`

## untracked

By default **any** signal read inside \`effect\`/\`computed\` becomes a dependency. \`untracked(() => ...)\` reads a signal **without** creating a dependency — the effect will not re-run when it changes.

\`\`\`ts
effect(() => {
  const value = data();              // dependency
  const cfg = untracked(() => config()); // NOT a dependency
  log(value, cfg);
});
\`\`\`

Typical case: an effect must react to \`data\` but use the "current" value of \`config\` without subscribing to it — otherwise extra re-runs.

## Custom equality on computed

\`computed\`/\`signal\` compare via \`Object.is\` by default. For objects/arrays this means a new reference with the same data counts as a change. The \`equal\` option provides a custom comparator:

\`\`\`ts
const list = computed(() => filter(items()), {
  equal: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]),
});
\`\`\`

If \`equal\` returns \`true\`, the value is considered unchanged — dependent computeds/effects/template do **not** recompute, saving CD.

## Nuances

- \`untracked\` is also needed to safely call methods/write outside reactive tracking inside a computed.
- An overly heavy \`equal\` function may cost more than a redundant recompute — measure.
- \`untracked\` does not "freeze" the read: it returns the current value at call time.`,
    },
    codeSnippet: `const result = computed(
  () => expensiveTransform(source()),
  { equal: (a, b) => a.id === b.id }, // skip recompute when id is stable
);

effect((onCleanup) => {
  const sub = stream(query()).subscribe();
  onCleanup(() => sub.unsubscribe());
});`,
  },
  {
    id: 'ng-049',
    category: 'angular-core',
    level: 'Hard',
    tags: ['forms', 'form-array', 'value-changes', 'update-on'],
    question: {
      ru: 'Как работать с FormArray, updateOn и valueChanges в типизированных реактивных формах?',
      en: 'How do you work with FormArray, updateOn and valueChanges in typed reactive forms?',
    },
    answer: {
      ru: `## FormArray

\`FormArray\` — динамическая коллекция контролов с числовыми индексами. В отличие от \`FormGroup\` (фиксированные именованные поля), используется для списков переменной длины: теги, строки таблицы, набор телефонов.

\`\`\`ts
form = this.fb.group({
  name: this.fb.control('', { nonNullable: true }),
  phones: this.fb.array<FormControl<string>>([]),
});
get phones() { return this.form.controls.phones; }
addPhone() {
  this.phones.push(this.fb.control('', { nonNullable: true }));
}
removePhone(i: number) { this.phones.removeAt(i); }
\`\`\`

## Типизация

Со строго типизированными формами (Angular 14+) \`FormArray<FormControl<string>>\` даёт типобезопасный \`value: string[]\`. \`nonNullable: true\` (или \`NonNullableFormBuilder\`) убирает \`| null\` и делает reset к initial вместо \`null\`.

## updateOn

Стратегия, **когда** контрол обновляет значение и валидируется:
- \`'change'\` (по умолчанию) — на каждый ввод.
- \`'blur'\` — при потере фокуса (меньше валидаций, удобно для тяжёлых async-валидаторов).
- \`'submit'\` — только при сабмите формы.

\`\`\`ts
new FormControl('', { updateOn: 'blur', validators: [Validators.required] })
\`\`\`

Можно задать на уровне группы — наследуется детьми.

## valueChanges

\`Observable\`, эмитящий при изменении значения (с учётом \`updateOn\`). Есть парный \`statusChanges\`. \`valueChanges\` отдаёт **типизированное** значение; для side-effect'ов оборачивайте в \`takeUntilDestroyed\` и \`debounceTime\`.

## Нюансы

- \`getRawValue()\` включает \`disabled\`-контролы (которых нет в \`value\`).
- \`patchValue\` для частичного, \`setValue\` требует все поля.
- \`valueChanges\` не эмитит при \`emitEvent: false\` — полезно, чтобы не зациклить программные апдейты.`,
      en: `## FormArray

\`FormArray\` is a dynamic collection of controls with numeric indices. Unlike \`FormGroup\` (fixed named fields), it is used for variable-length lists: tags, table rows, a set of phones.

\`\`\`ts
form = this.fb.group({
  name: this.fb.control('', { nonNullable: true }),
  phones: this.fb.array<FormControl<string>>([]),
});
get phones() { return this.form.controls.phones; }
addPhone() {
  this.phones.push(this.fb.control('', { nonNullable: true }));
}
removePhone(i: number) { this.phones.removeAt(i); }
\`\`\`

## Typing

With strictly typed forms (Angular 14+), \`FormArray<FormControl<string>>\` yields a type-safe \`value: string[]\`. \`nonNullable: true\` (or \`NonNullableFormBuilder\`) removes the \`| null\` and resets to the initial value instead of \`null\`.

## updateOn

The strategy for **when** a control updates its value and validates:
- \`'change'\` (default) — on every input.
- \`'blur'\` — on focus loss (fewer validations, handy for heavy async validators).
- \`'submit'\` — only on form submit.

\`\`\`ts
new FormControl('', { updateOn: 'blur', validators: [Validators.required] })
\`\`\`

It can be set at the group level — inherited by children.

## valueChanges

An \`Observable\` emitting on value change (respecting \`updateOn\`). There is a paired \`statusChanges\`. \`valueChanges\` emits the **typed** value; for side effects wrap it in \`takeUntilDestroyed\` and \`debounceTime\`.

## Nuances

- \`getRawValue()\` includes \`disabled\` controls (absent from \`value\`).
- \`patchValue\` for partial, \`setValue\` requires all fields.
- \`valueChanges\` does not emit with \`emitEvent: false\` — useful to avoid loops on programmatic updates.`,
    },
    codeSnippet: `this.form.controls.phones.valueChanges
  .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
  .subscribe(phones => this.savePhones(phones)); // phones: string[]`,
  },
  {
    id: 'ng-050',
    category: 'angular-core',
    level: 'Hard',
    tags: ['router', 'can-deactivate', 'route-reuse-strategy'],
    question: {
      ru: 'Как работают CanDeactivate и RouteReuseStrategy и какие задачи они решают?',
      en: 'How do CanDeactivate and RouteReuseStrategy work, and what problems do they solve?',
    },
    answer: {
      ru: `## CanDeactivate

Гвард, который вызывается **перед уходом** с маршрута и может **отменить** навигацию. Главный кейс — «у вас несохранённые изменения, точно уйти?».

\`\`\`ts
export const unsavedGuard: CanDeactivateFn<FormComponent> = (cmp) =>
  cmp.form.pristine || confirm('Покинуть без сохранения?');
\`\`\`

Возврат \`false\`/\`UrlTree\`/\`Observable<boolean>\` останавливает или перенаправляет навигацию. Функциональный стиль (\`CanDeactivateFn\`) заменил классовый интерфейс; внутри доступен \`inject()\`.

## RouteReuseStrategy

Стратегия, определяющая, **переиспользовать** ли уже созданный компонент маршрута вместо его пересоздания. По умолчанию Angular переиспользует компонент, если меняются только параметры одного и того же роута (тогда срабатывает не пересоздание, а \`paramMap\`-emit).

Кастомная стратегия позволяет **сохранять и восстанавливать** целые поддеревья (detach/store/retrieve) — например, кэшировать состояние вкладок или результаты поиска при возврате назад.

\`\`\`ts
class TabReuseStrategy extends BaseRouteReuseStrategy {
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return route.data['reuse'] === true;
  }
  store(route, handle) { this.handlers[key(route)] = handle; }
  shouldAttach(route) { return !!this.handlers[key(route)]; }
  retrieve(route) { return this.handlers[key(route)] ?? null; }
}
// { provide: RouteReuseStrategy, useClass: TabReuseStrategy }
\`\`\`

## Нюансы

- Переиспользование компонента означает, что \`ngOnInit\` **не** вызывается повторно — подписывайтесь на \`paramMap\`/\`data\`, а не читайте snapshot один раз.
- Неаккуратная reuse-стратегия ведёт к утечкам памяти (сохранённые, но никогда не восстановленные хендлеры) и устаревшему состоянию.
- \`shouldReuseRoute\` сравнивает \`future\` и \`curr\` снапшоты — основа дефолтного поведения.`,
      en: `## CanDeactivate

A guard invoked **before leaving** a route that can **cancel** navigation. The main case is "you have unsaved changes, leave anyway?".

\`\`\`ts
export const unsavedGuard: CanDeactivateFn<FormComponent> = (cmp) =>
  cmp.form.pristine || confirm('Leave without saving?');
\`\`\`

Returning \`false\`/\`UrlTree\`/\`Observable<boolean>\` stops or redirects navigation. The functional style (\`CanDeactivateFn\`) replaced the class interface; \`inject()\` is available inside.

## RouteReuseStrategy

A strategy that decides whether to **reuse** an already created route component instead of recreating it. By default Angular reuses the component when only the params of the same route change (then it is not recreated, but \`paramMap\` emits).

A custom strategy lets you **store and restore** whole subtrees (detach/store/retrieve) — e.g. caching tab state or search results when navigating back.

\`\`\`ts
class TabReuseStrategy extends BaseRouteReuseStrategy {
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return route.data['reuse'] === true;
  }
  store(route, handle) { this.handlers[key(route)] = handle; }
  shouldAttach(route) { return !!this.handlers[key(route)]; }
  retrieve(route) { return this.handlers[key(route)] ?? null; }
}
// { provide: RouteReuseStrategy, useClass: TabReuseStrategy }
\`\`\`

## Nuances

- Reusing a component means \`ngOnInit\` is **not** called again — subscribe to \`paramMap\`/\`data\` instead of reading the snapshot once.
- A careless reuse strategy causes memory leaks (stored but never restored handlers) and stale state.
- \`shouldReuseRoute\` compares the \`future\` and \`curr\` snapshots — the basis of the default behavior.`,
    },
    codeSnippet: `export const unsavedGuard: CanDeactivateFn<EditComponent> = (component) => {
  if (component.form.pristine) return true;
  const dialog = inject(ConfirmDialog);
  return dialog.confirm('Discard changes?');
};
// route: { path: 'edit', component: EditComponent, canDeactivate: [unsavedGuard] }`,
  },
  {
    id: 'ng-051',
    category: 'angular-core',
    level: 'Hard',
    tags: ['router', 'preloading', 'code-splitting'],
    question: {
      ru: 'Какие стратегии preloading бывают и как работает route-level code splitting?',
      en: 'What preloading strategies exist, and how does route-level code splitting work?',
    },
    answer: {
      ru: `## Code splitting на уровне роутов

\`loadComponent\`/\`loadChildren\` с динамическим \`import()\` создают **отдельные чанки**, которые грузятся лениво при переходе на маршрут. Это уменьшает initial bundle.

\`\`\`ts
{
  path: 'admin',
  loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent),
}
\`\`\`

Минус ленивой загрузки: при первом переходе пользователь ждёт сетевой запрос чанка.

## Preloading

Preloading решает этот минус, загружая ленивые чанки **в фоне** после старта приложения, не блокируя его. Настраивается во \`provideRouter\`:

- \`withPreloading(PreloadAllModules)\` — грузит **все** ленивые маршруты в фоне. Просто, но качает лишнее.
- \`NoPreloading\` (по умолчанию) — ничего не предзагружается.
- **Кастомная стратегия** — точечно, например по флагу \`data: { preload: true }\` или по скорости сети.

\`\`\`ts
@Injectable()
export class SelectivePreload implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>) {
    return route.data?.['preload'] ? load() : of(null);
  }
}
provideRouter(routes, withPreloading(SelectivePreload))
\`\`\`

## Нюансы

- Preloading стартует, когда приложение **стабильно** (после первого рендера), чтобы не конкурировать за пропускную способность с критичными ресурсами.
- Можно учитывать \`navigator.connection\` (Network Information API), чтобы не предзагружать на медленном/lie-fi соединении.
- \`@defer\` и preloading решают **разные** задачи: defer — для **частей шаблона**, preloading — для **роутов**; их часто комбинируют.
- В сочетании с SSR ленивые роуты влияют на hydration-границы.`,
      en: `## Route-level code splitting

\`loadComponent\`/\`loadChildren\` with a dynamic \`import()\` create **separate chunks** loaded lazily when navigating to the route. This shrinks the initial bundle.

\`\`\`ts
{
  path: 'admin',
  loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent),
}
\`\`\`

The downside of lazy loading: on the first navigation the user waits for the chunk's network request.

## Preloading

Preloading addresses this by loading lazy chunks **in the background** after app start, without blocking it. Configured in \`provideRouter\`:

- \`withPreloading(PreloadAllModules)\` — loads **all** lazy routes in the background. Simple, but fetches too much.
- \`NoPreloading\` (default) — nothing is preloaded.
- A **custom strategy** — selectively, e.g. by a \`data: { preload: true }\` flag or network speed.

\`\`\`ts
@Injectable()
export class SelectivePreload implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>) {
    return route.data?.['preload'] ? load() : of(null);
  }
}
provideRouter(routes, withPreloading(SelectivePreload))
\`\`\`

## Nuances

- Preloading starts once the app is **stable** (after the first render) so it does not compete for bandwidth with critical resources.
- You can consider \`navigator.connection\` (Network Information API) to avoid preloading on slow/lie-fi connections.
- \`@defer\` and preloading solve **different** problems: defer for **template parts**, preloading for **routes**; they are often combined.
- Combined with SSR, lazy routes affect hydration boundaries.`,
    },
    codeSnippet: `bootstrapApplication(App, {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
// route: { path: 'reports', loadChildren: () => import('./reports.routes') }`,
  },
  {
    id: 'ng-052',
    category: 'angular-core',
    level: 'Expert',
    tags: ['async-pipe', 'pure-pipe', 'memoization'],
    question: {
      ru: 'Как async pipe работает внутри и почему чистые пайпы мемоизируются, а нечистые — нет?',
      en: 'How does the async pipe work internally, and why are pure pipes memoized while impure ones are not?',
    },
    answer: {
      ru: `## Чистые пайпы и мемоизация

Пайп по умолчанию **pure**. Его \`transform\` вызывается **только** когда меняется ссылка на входной аргумент (или сам пайп-binding). Angular кэширует последний результат: если входы те же — \`transform\` не вызывается, возвращается прежнее значение. Это мемоизация на уровне CD, делающая пайпы дешёвыми.

Следствие: мутация массива без новой ссылки (\`arr.push\`) **не** обновит pure-пайп — нужна новая ссылка.

## Нечистые пайпы

\`pure: false\` отключает мемоизацию: \`transform\` вызывается **на каждом** проходе CD. Это нужно для пайпов, зависящих от внутреннего состояния или времени (\`async\`, \`json\` для отладки, кастомный фильтр по мутируемому массиву). Цена — частые вызовы, поэтому \`transform\` должен быть лёгким, иначе бьёт по производительности.

## Как устроен AsyncPipe

\`AsyncPipe\` — нечистый пайп с состоянием:
1. При первом \`transform(obs$)\` он **подписывается** на Observable/Promise и запоминает ссылку.
2. На каждое значение колбэк вызывает \`ChangeDetectorRef.markForCheck()\`, помечая view грязным (важно для OnPush/zoneless), и сохраняет последнее значение.
3. \`transform\` возвращает закэшированное последнее значение (вызывается часто, т.к. пайп impure, но реальная работа — только при новом emit).
4. Если ссылка на источник **сменилась**, пайп **отписывается** от старого и подписывается на новый.
5. В \`ngOnDestroy\` пайпа подписка закрывается — **автоматическая отписка** без утечек.

\`\`\`html
@if (user$ | async; as user) { {{ user.name }} }
\`\`\`

## Нюансы

- \`async\` устраняет ручные \`subscribe\`/\`unsubscribe\` и интегрируется с OnPush через \`markForCheck\`.
- Несколько \`| async\` на один поток создают **несколько подписок** — выносите в \`as\` переменную.
- В мире сигналов \`toSignal\` — более идиоматичная альтернатива \`async\`.`,
      en: `## Pure pipes and memoization

A pipe is **pure** by default. Its \`transform\` is called **only** when the reference of an input argument changes (or the pipe binding itself). Angular caches the last result: if inputs are the same, \`transform\` is not called and the previous value is returned. This is CD-level memoization that makes pipes cheap.

Consequence: mutating an array without a new reference (\`arr.push\`) does **not** update a pure pipe — you need a new reference.

## Impure pipes

\`pure: false\` disables memoization: \`transform\` is called on **every** CD pass. This is needed for pipes that depend on internal state or time (\`async\`, \`json\` for debugging, a custom filter over a mutated array). The cost is frequent calls, so \`transform\` must be lightweight or it hurts performance.

## How AsyncPipe works

\`AsyncPipe\` is a stateful impure pipe:
1. On the first \`transform(obs$)\` it **subscribes** to the Observable/Promise and remembers the reference.
2. On each value the callback calls \`ChangeDetectorRef.markForCheck()\`, marking the view dirty (crucial for OnPush/zoneless), and stores the latest value.
3. \`transform\` returns the cached latest value (called often since the pipe is impure, but real work happens only on a new emit).
4. If the source reference **changes**, the pipe **unsubscribes** from the old one and subscribes to the new one.
5. In the pipe's \`ngOnDestroy\` the subscription is closed — **automatic unsubscription** without leaks.

\`\`\`html
@if (user$ | async; as user) { {{ user.name }} }
\`\`\`

## Nuances

- \`async\` removes manual \`subscribe\`/\`unsubscribe\` and integrates with OnPush via \`markForCheck\`.
- Multiple \`| async\` on one stream create **multiple subscriptions** — extract into an \`as\` variable.
- In the signals world \`toSignal\` is a more idiomatic alternative to \`async\`.`,
    },
    codeSnippet: `@Pipe({ name: 'filter', pure: false }) // impure: runs every CD pass
export class FilterPipe implements PipeTransform {
  transform(items: Item[], term: string): Item[] {
    return items.filter(i => i.name.includes(term)); // keep this cheap!
  }
}`,
  },
];
