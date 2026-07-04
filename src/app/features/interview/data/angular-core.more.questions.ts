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
      ru: `## 🧩 Простыми словами

Представь, что каждый HTTP-запрос из твоего приложения проходит через череду «контрольных постов» по пути на сервер и обратно. Интерсептор — это такой пост: он может посмотреть запрос, что-то в него добавить (например, пропуск-токен), а на обратном пути осмотреть ответ или поймать ошибку. В новом Angular эти посты — просто маленькие функции, а не громоздкие классы.

### Что такое функциональный интерсептор

Начиная с Angular 15, интерсептор — это **обычная функция** типа \`HttpInterceptorFn\`, а не класс с зависимостями через конструктор. Ты регистрируешь их списком через \`provideHttpClient(withInterceptors([...]))\`.

Функция получает два аргумента: \`req\` (запрос) и \`next\` (следующий пост в цепочке). Внутри можно вызвать \`inject()\`, чтобы достать любой сервис — потому что функция выполняется в так называемом injection-контексте (месте, где Angular знает, как выдавать зависимости).

\`\`\`ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } })
    : req;
  return next(authReq);
};
\`\`\`

Здесь мы достаём токен и, если он есть, добавляем заголовок \`Authorization\`. Обрати внимание: \`req\` **иммутабелен** (его нельзя менять напрямую), поэтому мы делаем \`req.clone()\` — создаём копию с изменениями. В конце вызываем \`next(authReq)\`, чтобы передать запрос дальше.

### Порядок выполнения

\`next\` — это следующий обработчик в цепочке. Интерсепторы выполняются в том порядке, в котором ты их зарегистрировал, а ответ идёт обратно в **обратном** порядке — как стопка тарелок: положил первой, снял последней.

### Retry (повтор при ошибке)

Так как \`next(req)\` возвращает поток (Observable), мы можем навесить на него RxJS-операторы. \`retry\` с настройкой \`delay\` даёт экспоненциальный backoff — то есть каждая следующая попытка ждёт всё дольше, чтобы не долбить упавший сервер:

\`\`\`ts
export const retryInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(retry({ count: 3, delay: (_, i) => timer(2 ** i * 300) }));
\`\`\`

До 3 повторов, пауза \`2^i * 300\` мс растёт с каждой попыткой (300, 600, 1200 мс).

### Кэширование

Держим \`Map<url, HttpResponse>\` (например, в сервисе). Для GET-запросов, если ответ уже лежит в кэше, возвращаем его через \`of(cached)\` вместо реального запроса. Иначе пропускаем запрос дальше и по пути сохраняем ответ через оператор \`tap\`.

### Регистрация

\`\`\`ts
bootstrapApplication(App, {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, retryInterceptor, cacheInterceptor]),
    ),
  ],
});
\`\`\`

## ⚠️ Подводные камни

- Забыл \`req.clone()\` и пытаешься менять \`req\` напрямую — не сработает, запрос иммутабелен.
- Порядок важен: auth обычно ставят первым, logging — крайним.
- \`withInterceptorsFromDi()\` нужен, только если у тебя остались старые классовые интерсепторы на токене \`HTTP_INTERCEPTORS\`.

## 🎯 Запомни

- Интерсептор — это функция \`(req, next) => Observable\`, регистрируется через \`withInterceptors([...])\`.
- \`req\` иммутабелен: меняешь только через \`req.clone()\`.
- Интерсепторы видят и успешный \`HttpResponse\`, и ошибки — удобно централизованно ловить 401 и редиректить на логин.
- Функциональный стиль проще тестировать и tree-shake'ить (выкидывать неиспользуемый код при сборке).`,
      en: `## 🧩 In plain words

Imagine every HTTP request from your app passing through a series of "checkpoints" on its way to the server and back. An interceptor is one of those checkpoints: it can look at the request, add something to it (like an access token), and on the way back inspect the response or catch an error. In modern Angular these checkpoints are just small functions, not bulky classes.

### What a functional interceptor is

Since Angular 15, an interceptor is a **plain function** of type \`HttpInterceptorFn\`, not a class with constructor dependencies. You register them as a list via \`provideHttpClient(withInterceptors([...]))\`.

The function gets two arguments: \`req\` (the request) and \`next\` (the next checkpoint in the chain). Inside you can call \`inject()\` to grab any service — because the function runs in an injection context (a place where Angular knows how to hand out dependencies).

\`\`\`ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } })
    : req;
  return next(authReq);
};
\`\`\`

Here we grab the token and, if present, add the \`Authorization\` header. Note: \`req\` is **immutable** (you can't change it in place), so we use \`req.clone()\` — make a copy with the changes. Finally we call \`next(authReq)\` to pass the request onward.

### Execution order

\`next\` is the next handler in the chain. Interceptors run in the order you registered them, and the response flows back in **reverse** order — like a stack of plates: first one down, last one up.

### Retry

Since \`next(req)\` returns a stream (an Observable), we can attach RxJS operators to it. \`retry\` with a \`delay\` gives exponential backoff — each next attempt waits longer, so you don't hammer a failing server:

\`\`\`ts
export const retryInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(retry({ count: 3, delay: (_, i) => timer(2 ** i * 300) }));
\`\`\`

Up to 3 retries, and the pause \`2^i * 300\` ms grows each attempt (300, 600, 1200 ms).

### Caching

Keep a \`Map<url, HttpResponse>\` (e.g. in a service). For GET requests, if the answer is already in the cache, return it via \`of(cached)\` instead of a real request. Otherwise pass the request through and store the response along the way using the \`tap\` operator.

### Registration

\`\`\`ts
bootstrapApplication(App, {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, retryInterceptor, cacheInterceptor]),
    ),
  ],
});
\`\`\`

## ⚠️ Common pitfalls

- Forgetting \`req.clone()\` and trying to mutate \`req\` directly won't work — the request is immutable.
- Order matters: auth usually goes first, logging usually last.
- \`withInterceptorsFromDi()\` is only needed if you still have old class-based interceptors on the \`HTTP_INTERCEPTORS\` token.

## 🎯 Key takeaways

- An interceptor is a function \`(req, next) => Observable\`, registered via \`withInterceptors([...])\`.
- \`req\` is immutable: change it only through \`req.clone()\`.
- Interceptors see both the successful \`HttpResponse\` and errors — handy for centrally catching 401 and redirecting to login.
- The functional style is easier to test and tree-shake (drop unused code at build time).`,
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
      ru: `## 🧩 Простыми словами

Представь приложение как здание. HTTP-обработка ошибок — это охрана на входной двери, которая ловит проблемы только с «посылками» (запросами к серверу). А \`ErrorHandler\` — это дежурный на всё здание: он ловит любую аварию, где бы она ни случилась, если её никто другой не поймал. Это последний рубеж, чтобы приложение не рухнуло молча.

### Что такое ErrorHandler

Angular даёт токен \`ErrorHandler\` — единую точку для **необработанных** ошибок: исключений в lifecycle-хуках (методах жизненного цикла компонента), в обработчиках событий, в асинхронном коде внутри зоны Angular. По умолчанию он просто пишет ошибку в \`console.error\`. Подменив его своим классом, ты централизуешь логирование — например, отправку в Sentry.

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

Здесь мы показываем пользователю уведомление и логируем ошибку. Регистрируем через провайдер, который говорит Angular использовать наш класс вместо стандартного.

### Чем отличается от HTTP-перехвата

- **HTTP-интерсептор / \`catchError\`** ловит только ошибки сети: статусы 4xx/5xx, таймауты. Именно здесь логично делать retry (повтор), обновление токена, маппинг в доменные ошибки (перевод «500» в понятное «сервис недоступен»).
- **\`ErrorHandler\`** ловит **всё остальное**: \`TypeError\`, ошибки рендеринга, неперехваченные \`throw\`. Это последний рубеж, куда падает то, что не поймали раньше.

## ⚠️ Подводные камни

- \`handleError\` выполняется **внутри** Angular-зоны, поэтому навигация и обновление UI из него работают. Но осторожно с ошибками внутри самого обработчика — можно словить бесконечный цикл.
- В zoneless-режиме (без Zone.js) всё так же: ошибки в change detection и эффектах попадают в \`ErrorHandler\`.
- Промисы, отклонённые **вне** зоны Angular, могут до него не дойти — для них нужен глобальный \`window.onunhandledrejection\`.
- Никогда не глотай ошибку молча: всегда логируй, иначе отладка станет невозможной.
- Для SSR (рендеринга на сервере) нужна отдельная стратегия — там нет \`window\` и всплывающих уведомлений.

## 🎯 Запомни

- \`ErrorHandler\` — глобальная «сеть безопасности» для всех необработанных ошибок; переопределяешь его через провайдер.
- HTTP-перехват — про сетевые ошибки и повторы; \`ErrorHandler\` — про всё остальное (последний рубеж).
- Логируй всегда, но берегись цикла из-за ошибок внутри самого обработчика.`,
      en: `## 🧩 In plain words

Picture your app as a building. HTTP error handling is the guard at the front door who only catches problems with "packages" (requests to the server). \`ErrorHandler\`, on the other hand, is the caretaker for the whole building: it catches any incident, wherever it happens, if nobody else caught it. It's the last line of defence so the app doesn't crash silently.

### What ErrorHandler is

Angular provides the \`ErrorHandler\` token — a single point for **unhandled** errors: exceptions in lifecycle hooks (component lifecycle methods), in event handlers, in async code inside the Angular zone. By default it just writes the error to \`console.error\`. By overriding it with your own class, you centralize logging — for example, sending to Sentry.

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

Here we show the user a notification and log the error. We register it via a provider that tells Angular to use our class instead of the default one.

### How it differs from HTTP handling

- An **HTTP interceptor / \`catchError\`** only catches network errors: 4xx/5xx statuses, timeouts. This is exactly where retry, token refresh and mapping to domain errors (turning a "500" into a friendly "service unavailable") belong.
- \`ErrorHandler\` catches **everything else**: \`TypeError\`, render errors, uncaught \`throw\`. It's the last line of defence for whatever wasn't caught earlier.

## ⚠️ Common pitfalls

- \`handleError\` runs **inside** the Angular zone, so navigation and UI updates from it work. But beware of errors inside the handler itself — you can trigger an infinite loop.
- In zoneless mode (no Zone.js) it's the same: errors in change detection and effects reach \`ErrorHandler\`.
- Promises rejected **outside** the Angular zone may not arrive here — for those you need a global \`window.onunhandledrejection\`.
- Never swallow an error silently: always log, or debugging becomes impossible.
- For SSR (server-side rendering) you need a separate strategy — there's no \`window\` or pop-up notifications there.

## 🎯 Key takeaways

- \`ErrorHandler\` is the global "safety net" for all unhandled errors; you override it via a provider.
- HTTP handling is about network errors and retries; \`ErrorHandler\` is about everything else (the last line of defence).
- Always log, but watch out for a loop caused by errors inside the handler itself.`,
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
      ru: `## 🧩 Простыми словами

Иногда приложению нужно что-то подготовить до того, как показать первый экран: загрузить настройки, узнать, какие фичи включены, проверить, залогинен ли пользователь. \`APP_INITIALIZER\` — это как «прогрев двигателя» перед поездкой: Angular ждёт, пока эта подготовка закончится, и только потом рисует интерфейс.

### Назначение

\`APP_INITIALIZER\` — это hook (точка подключения), который выполняется **до** того, как Angular отрендерит корневой компонент. Если фабрика возвращает \`Promise\` или \`Observable\` (асинхронный результат), Angular **дожидается** его завершения. Используется для критичных задач старта: загрузки runtime-конфига (настроек, которые известны только во время работы), фиче-флагов, локали, проверки сессии.

\`\`\`ts
// классический multi-провайдер
{
  provide: APP_INITIALIZER,
  multi: true,
  useFactory: (config: ConfigService) => () => config.load(),
  deps: [ConfigService],
}
\`\`\`

\`multi: true\` означает, что таких инициализаторов может быть несколько, и Angular соберёт их все. \`deps\` перечисляет зависимости, которые нужно передать в фабрику.

### provideAppInitializer (Angular 19+)

Новый функциональный API без боилерплейта с \`multi\`/\`deps\`; внутри работает \`inject()\`, поэтому зависимости достаются прямо в теле функции:

\`\`\`ts
provideAppInitializer(() => {
  const config = inject(ConfigService);
  return config.load();
});
\`\`\`

Тот же смысл, но короче и чище.

### Как влияет на старт

- Все инициализаторы (это multi-токен, их может быть много) запускаются **параллельно**, а бутстрап ждёт завершения **всех** \`Promise\`.
- Долгий инициализатор задерживает первый рендер — клади туда только то, что **обязано** быть готово до появления UI.
- Ошибка или reject в инициализаторе **прерывает** бутстрап — приложение просто не стартует.

## ⚠️ Подводные камни

- Не путай с \`ENVIRONMENT_INITIALIZER\`: тот выполняется при создании EnvironmentInjector (раньше и для каждого инжектора) и **не ждёт** асинхронную работу.
- Для конфига часто комбинируют с фабрикой \`InjectionToken\`, чтобы загруженные значения были доступны синхронно во всём приложении.
- В SSR инициализаторы выполняются и на сервере — учитывай отсутствие \`window\`.

## 🎯 Запомни

- \`APP_INITIALIZER\` / \`provideAppInitializer\` откладывает первый рендер, пока не завершится подготовка (например, загрузка конфига).
- Angular ждёт все инициализаторы; их ошибка прерывает старт приложения.
- Клади туда только по-настоящему обязательное — иначе замедлишь запуск.`,
      en: `## 🧩 In plain words

Sometimes an app needs to prepare something before it shows the first screen: load settings, find out which features are enabled, check whether the user is logged in. \`APP_INITIALIZER\` is like "warming up the engine" before a drive: Angular waits for this prep to finish, and only then draws the interface.

### Purpose

\`APP_INITIALIZER\` is a hook (a plug-in point) that runs **before** Angular renders the root component. If the factory returns a \`Promise\` or \`Observable\` (an async result), Angular **waits** for it to settle. Used for critical startup tasks: loading runtime config (settings only known at run time), feature flags, locale, session checks.

\`\`\`ts
// classic multi-provider
{
  provide: APP_INITIALIZER,
  multi: true,
  useFactory: (config: ConfigService) => () => config.load(),
  deps: [ConfigService],
}
\`\`\`

\`multi: true\` means there can be several such initializers, and Angular will collect them all. \`deps\` lists the dependencies to pass into the factory.

### provideAppInitializer (Angular 19+)

A new functional API without the \`multi\`/\`deps\` boilerplate; \`inject()\` works inside, so dependencies are grabbed right in the function body:

\`\`\`ts
provideAppInitializer(() => {
  const config = inject(ConfigService);
  return config.load();
});
\`\`\`

Same meaning, but shorter and cleaner.

### Effect on startup

- All initializers (it's a multi-token, so there can be many) run **in parallel**, and bootstrap awaits **all** the \`Promise\`s.
- A slow initializer delays the first render — only put things there that **must** be ready before the UI appears.
- An error or rejection in an initializer **aborts** bootstrap — the app simply doesn't start.

## ⚠️ Common pitfalls

- Don't confuse it with \`ENVIRONMENT_INITIALIZER\`: that runs when an EnvironmentInjector is created (earlier and per injector) and does **not** await async work.
- For config it's often combined with an \`InjectionToken\` factory so the loaded values are synchronously available across the whole app.
- In SSR initializers run on the server too — account for the missing \`window\`.

## 🎯 Key takeaways

- \`APP_INITIALIZER\` / \`provideAppInitializer\` delays the first render until the prep (e.g. loading config) finishes.
- Angular awaits all initializers; an error in one aborts app startup.
- Only put truly essential work there — otherwise you slow down launch.`,
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
      ru: `## 🧩 Простыми словами

Когда ты пишешь стили для компонента, важный вопрос: останутся ли они «внутри» этого компонента или расползутся на всю страницу? \`ViewEncapsulation\` — это настройка, которая решает, насколько сильно стили компонента изолированы от остального приложения. Представь три варианта: невидимый заборчик (Emulated), настоящая бетонная стена (ShadowDom) или совсем без забора (None).

### Emulated (по умолчанию)

Angular **эмулирует** (имитирует) Shadow DOM, не используя его по-настоящему. При компиляции к каждому элементу компонента добавляется уникальный атрибут (например, \`_ngcontent-xxx\`), а селекторы стилей переписываются так, чтобы срабатывать только с этим атрибутом. В итоге стили компонента не «протекают» наружу — но **глобальные стили** всё же просачиваются внутрь. Работает в любом браузере, реальный Shadow DOM не нужен.

### ShadowDom

Использует **нативный** (встроенный в браузер) Shadow DOM через \`attachShadow\`. Это полная изоляция: глобальные стили **не** проникают внутрь, а стили компонента не выходят наружу. Минусы: ломается стилизация снаружи (например, темы), \`document\`-селекторы и некоторые сторонние библиотеки могут не работать, а проекция контента идёт через нативный \`<slot>\`.

### None

Стили компонента становятся **глобальными** — добавляются в \`<head>\` без скоупинга (без ограничения области). Любой компонент может быть ими затронут. Применяют осознанно для глобальных тем или ресетов (сброса стилей).

### Почему ::ng-deep устарел

\`::ng-deep\` (и старые \`/deep/\`, \`>>>\`) отключает скоупинг для части селектора, позволяя стилю «пробить» границу и дотянуться до дочерних компонентов. Он **deprecated** (объявлен устаревшим), потому что относится к удалённому из стандарта механизму Shadow DOM piercing и в нативном Shadow DOM просто не работает.

### Современные альтернативы

- CSS Custom Properties (CSS-переменные) — они **наследуются** сквозь любые границы, идеальны для тем.
- \`::part()\` и \`::slotted()\` — для стилизации содержимого в Shadow DOM.
- Глобальные стили или \`encapsulation: None\` для конкретного слоя дизайн-системы.

\`\`\`ts
@Component({
  selector: 'app-card',
  encapsulation: ViewEncapsulation.Emulated, // по умолчанию: CSS со скоупингом через атрибут
  styles: [':host { --card-bg: white; } .body { background: var(--card-bg); }'],
})
export class CardComponent {}
\`\`\`

## ⚠️ Подводные камни

- В Emulated не удивляйся, что глобальные стили влияют на компонент — изоляция односторонняя.
- ShadowDom даёт настоящую изоляцию, но именно поэтому темы «снаружи» перестают работать — не включай его бездумно.
- Не тянись к \`::ng-deep\` для новых задач: используй CSS-переменные.

## 🎯 Запомни

- Emulated (по умолчанию) — стили не текут наружу, но глобальные текут внутрь.
- ShadowDom — полная нативная изоляция в обе стороны, но со своими ограничениями.
- None — стили становятся глобальными.
- \`::ng-deep\` устарел; для «пробивания» границ используй CSS Custom Properties.`,
      en: `## 🧩 In plain words

When you write styles for a component, a key question is: do they stay "inside" that component, or do they spill across the whole page? \`ViewEncapsulation\` is the setting that decides how strongly a component's styles are isolated from the rest of the app. Picture three options: an invisible little fence (Emulated), a real concrete wall (ShadowDom), or no fence at all (None).

### Emulated (default)

Angular **emulates** (imitates) Shadow DOM without actually using it. At compile time a unique attribute (e.g. \`_ngcontent-xxx\`) is added to each component element, and style selectors are rewritten so they only match with that attribute. As a result the component's styles don't "leak" out — but **global styles** still seep in. Works in any browser, no real Shadow DOM needed.

### ShadowDom

Uses the browser's **native** (built-in) Shadow DOM via \`attachShadow\`. This is full isolation: global styles do **not** penetrate inside, and component styles don't escape. Downsides: external styling (like theming) breaks, \`document\` selectors and some third-party libraries may not work, and content projection goes through the native \`<slot>\`.

### None

Component styles become **global** — added to \`<head>\` with no scoping (no area restriction). Any component can be affected. Used deliberately for global themes or resets.

### Why ::ng-deep is deprecated

\`::ng-deep\` (and the old \`/deep/\`, \`>>>\`) disables scoping for part of a selector, letting a style "pierce" the boundary and reach into child components. It is **deprecated** because it belongs to the Shadow DOM piercing mechanism that was removed from the spec, and it simply doesn't work in native Shadow DOM.

### Modern alternatives

- CSS Custom Properties (CSS variables) — they **inherit** across any boundary, ideal for theming.
- \`::part()\` and \`::slotted()\` — for styling content in Shadow DOM.
- Global styles or \`encapsulation: None\` for a specific design-system layer.

\`\`\`ts
@Component({
  selector: 'app-card',
  encapsulation: ViewEncapsulation.Emulated, // default: attribute-scoped CSS
  styles: [':host { --card-bg: white; } .body { background: var(--card-bg); }'],
})
export class CardComponent {}
\`\`\`

## ⚠️ Common pitfalls

- With Emulated, don't be surprised that global styles affect the component — the isolation is one-way.
- ShadowDom gives real isolation, but that's exactly why "external" themes stop working — don't enable it thoughtlessly.
- Don't reach for \`::ng-deep\` for new work: use CSS variables instead.

## 🎯 Key takeaways

- Emulated (default) — styles don't leak out, but global styles leak in.
- ShadowDom — full native isolation both ways, but with its own limitations.
- None — styles become global.
- \`::ng-deep\` is deprecated; use CSS Custom Properties to cross boundaries.`,
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
      ru: `## 🧩 Простыми словами

Представь, что твой Angular-код — это гость в чужом доме, а DOM (структура страницы) — это сам дом. \`Renderer2\` — это вежливый посредник: вместо того чтобы самому хватать стены руками (\`document.querySelector\`, \`innerHTML\`), ты просишь посредника внести изменения. Это удобно, потому что тот же код будет работать и там, где дома в привычном виде нет (например, при рендеринге на сервере). А \`DomSanitizer\` — это охранник, который проверяет, не пытается ли кто-то протащить в дом вредоносный код. XSS (Cross-Site Scripting) — это как раз атака, когда злоумышленник подсовывает свой скрипт через данные, и тот выполняется в браузере жертвы.

### Что такое Renderer2 и зачем он нужен

\`Renderer2\` — это абстракция (прослойка) над DOM, которая позволяет менять элементы страницы **без прямого обращения** к глобальному объекту \`document\`. Причины использовать его:

- **Platform-agnostic** (не привязан к платформе): код работает при SSR (Server-Side Rendering — отрисовка на сервере, где объекта \`document\` вообще нет) и в Web Workers (фоновые потоки браузера без доступа к DOM).
- Совместим с системой анимаций Angular и с будущими движками отрисовки.

\`\`\`ts
const r = inject(Renderer2);
r.setAttribute(el, 'aria-hidden', 'true');
r.addClass(el, 'active');
const unlisten = r.listen(el, 'click', () => {});
\`\`\`

Здесь мы через посредника ставим атрибут, добавляем CSS-класс и вешаем обработчик клика. Метод \`listen\` возвращает функцию \`unlisten\`, вызвав которую, ты отписываешься от события.

Прямое присваивание \`nativeElement.innerHTML = ...\` — это антипаттерн: оно ломает SSR (на сервере нет DOM) и открывает дыру для XSS.

### Контекстная санитизация — защита по умолчанию

Санитизация — это очистка данных от опасных частей. Angular по умолчанию **санитизирует** все интерполяции (\`{{ ... }}\`) и property-биндинги в зависимости от **контекста**, куда попадает значение: HTML, STYLE (стили), URL, RESOURCE_URL (адрес ресурса вроде \`<iframe>\`). Опасный HTML вырезается, ссылки вида \`javascript:\` блокируются.

Именно поэтому \`{{ userInput }}\` безопасен: текст экранируется (спецсимволы вроде \`<\` превращаются в безобидные), и вставить скрипт через него нельзя.

### DomSanitizer — ручной пропуск для доверенных значений

Иногда тебе действительно нужно вставить готовый HTML или URL, которому ты доверяешь. Тогда Angular требует **явно** пометить значение доверенным:

\`\`\`ts
const safe = inject(DomSanitizer).bypassSecurityTrustHtml(html);
// [innerHTML]="safe"
\`\`\`

Методы \`bypassSecurityTrust*\` — это «escape hatch» (аварийный люк, обход защиты). Использовать их можно **только** для значений, в безопасности которых ты абсолютно уверен (не пользовательский ввод!). Иначе ты своими руками создаёшь XSS-уязвимость.

## ⚠️ Подводные камни

- \`[innerHTML]\` всегда проходит санитизацию (\`SecurityContext.HTML\`) — скрипты вырезаются; чтобы вставить HTML «как есть», нужен bypass.
- \`[src]\` / \`[href]\` для ресурсов (например, \`<iframe>\`) требуют контекст \`RESOURCE_URL\` — его нельзя санитизировать, можно только сделать bypass, поэтому будь особенно осторожен.
- \`bypassSecurityTrust*\` с пользовательскими данными = ты сам открыл дверь атаке.
- Trusted Types (часть механизма CSP — Content Security Policy) усиливают защиту уже на уровне браузера.

## 🎯 Запомни

- \`Renderer2\` = безопасный посредник для работы с DOM, который не ломается на сервере и в Web Workers.
- Angular по умолчанию санитизирует данные по контексту, поэтому \`{{ }}\` защищён от XSS автоматически.
- \`bypassSecurityTrust*\` — аварийный обход; применяй только к данным, которым доверяешь, никогда к пользовательскому вводу.`,
      en: `## 🧩 In plain words

Think of your Angular code as a guest in someone else's house, and the DOM (the page structure) as the house itself. \`Renderer2\` is a polite middleman: instead of grabbing the walls with your own hands (\`document.querySelector\`, \`innerHTML\`), you ask the middleman to make changes. This is handy because the same code also works where the house doesn't exist in its usual form (for example, when rendering on the server). And \`DomSanitizer\` is a security guard who checks whether anyone is trying to smuggle malicious code into the house. XSS (Cross-Site Scripting) is exactly that kind of attack: an attacker slips their script in through data, and it runs in the victim's browser.

### What Renderer2 is and why you need it

\`Renderer2\` is an abstraction (a layer) over the DOM that lets you change page elements **without touching** the global \`document\` object directly. Reasons to use it:

- **Platform-agnostic**: the code works with SSR (Server-Side Rendering — drawing on the server, where the \`document\` object doesn't exist at all) and in Web Workers (background browser threads with no DOM access).
- Compatible with Angular's animation system and with future render engines.

\`\`\`ts
const r = inject(Renderer2);
r.setAttribute(el, 'aria-hidden', 'true');
r.addClass(el, 'active');
const unlisten = r.listen(el, 'click', () => {});
\`\`\`

Here, through the middleman, we set an attribute, add a CSS class, and attach a click handler. The \`listen\` method returns an \`unlisten\` function; calling it unsubscribes from the event.

Direct assignment \`nativeElement.innerHTML = ...\` is an anti-pattern: it breaks SSR (no DOM on the server) and opens an XSS hole.

### Contextual sanitization — protection by default

Sanitization means cleaning data of its dangerous parts. By default Angular **sanitizes** all interpolations (\`{{ ... }}\`) and property bindings depending on the **context** the value lands in: HTML, STYLE, URL, RESOURCE_URL (a resource address like \`<iframe>\`). Dangerous HTML is stripped, and \`javascript:\` URLs are blocked.

This is exactly why \`{{ userInput }}\` is safe: the text is escaped (special characters like \`<\` become harmless), so you can't inject a script through it.

### DomSanitizer — a manual pass for trusted values

Sometimes you genuinely need to insert ready-made HTML or a URL that you trust. In that case Angular requires you to **explicitly** mark the value as trusted:

\`\`\`ts
const safe = inject(DomSanitizer).bypassSecurityTrustHtml(html);
// [innerHTML]="safe"
\`\`\`

The \`bypassSecurityTrust*\` methods are an "escape hatch" (an emergency bypass of the protection). Use them **only** for values whose safety you are absolutely certain of (not user input!). Otherwise you create the XSS vulnerability with your own hands.

## ⚠️ Common pitfalls

- \`[innerHTML]\` always goes through sanitization (\`SecurityContext.HTML\`) — scripts are stripped; to insert HTML verbatim you need a bypass.
- \`[src]\` / \`[href]\` for resources (e.g. \`<iframe>\`) require the \`RESOURCE_URL\` context — which cannot be sanitized, only bypassed, so be extra careful.
- \`bypassSecurityTrust*\` with user data = you opened the door to the attack yourself.
- Trusted Types (part of the CSP — Content Security Policy — mechanism) strengthen protection at the browser level.

## 🎯 Key takeaways

- \`Renderer2\` = a safe middleman for DOM work that doesn't break on the server or in Web Workers.
- Angular sanitizes data by context by default, so \`{{ }}\` is protected from XSS automatically.
- \`bypassSecurityTrust*\` is an emergency bypass; apply it only to data you trust, never to user input.`,
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
      ru: `## 🧩 Простыми словами

Представь, что ты собираешь страницу из деталей. Иногда тебе нужна невидимая коробка, которая группирует детали, но сама не занимает места на витрине — это \`ng-container\`. Иногда у тебя есть готовый «трафарет» (шаблон), и ты хочешь напечатать его в разных местах с разными данными — это \`ngTemplateOutlet\`. А иногда ты хочешь на лету решить, какой именно готовый блок (компонент) поставить сюда — это \`ngComponentOutlet\`. Все три — инструменты, чтобы гибко управлять тем, что и где появляется на странице.

### ng-container — невидимая обёртка

\`ng-container\` — это логический контейнер, который **не создаёт** реальный DOM-элемент. Он нужен, чтобы:

- навесить структурную директиву (\`*ngIf\`, \`*ngFor\` — директивы, которые добавляют или убирают элементы) без лишнего обёрточного \`<div>\`;
- сгруппировать несколько узлов, не засоряя разметку.

Особенно полезен, когда на один элемент нельзя повесить сразу две структурные директивы (это запрещено в Angular).

\`\`\`html
<ng-container *ngIf="user as u">
  <h2>{{ u.name }}</h2>
</ng-container>
\`\`\`

Здесь \`*ngIf\` работает, но в итоговом HTML никакого \`<ng-container>\` не будет — только \`<h2>\`, если условие истинно.

### ngTemplateOutlet — печать шаблона с данными

\`ngTemplateOutlet\` рендерит \`ng-template\` (кусок шаблона-заготовки) в заданном месте и передаёт ему **контекст** — набор данных. Это механизм переиспользования кусков разметки и настройки компонентов снаружи (передал свой шаблон — компонент его отрисовал).

\`\`\`html
<ng-template #row let-item let-i="index">{{ i }}: {{ item }}</ng-template>
<ng-container
  [ngTemplateOutlet]="row"
  [ngTemplateOutletContext]="{ $implicit: data, index: 0 }" />
\`\`\`

Ключ \`$implicit\` в контексте — это «значение по умолчанию»: оно маппится на переменную без имени, то есть на \`let-item\`. Остальные ключи (\`index\`) привязываются по имени через \`let-i="index"\`.

### ngComponentOutlet — динамический выбор компонента

\`ngComponentOutlet\` декларативно (то есть прямо в шаблоне, без ручного императивного кода) рендерит **компонент по его классу** — динамически, без вызова \`ViewContainerRef.createComponent\`. Поддерживает передачу inputs, свой инжектор и проекцию контента (начиная с Angular 16.2).

\`\`\`html
<ng-container
  [ngComponentOutlet]="widgetClass"
  [ngComponentOutletInputs]="{ title: 'Hi' }" />
\`\`\`

Здесь \`widgetClass\` — это переменная с классом компонента; поменяешь её значение — отрисуется другой компонент.

### Когда что использовать

- \`ng-container\` — структурная группировка без создания DOM.
- \`ngTemplateOutlet\` — повтор или инъекция шаблона с данными (паттерн «slot с данными»).
- \`ngComponentOutlet\` — динамический выбор компонента декларативно (дашборды, плагины, CMS-виджеты).

## ⚠️ Подводные камни

- Нельзя ставить две структурные директивы на один элемент — используй \`ng-container\` как обёртку для одной из них.
- В \`ngTemplateOutletContext\` именно \`$implicit\` попадает в \`let-item\` без имени; остальные переменные требуют явного имени ключа.
- \`ngComponentOutletInputs\` работает только с Angular 16.2+; на старых версиях inputs так не передашь.

## 🎯 Запомни

- \`ng-container\` = невидимая коробка для группировки и структурных директив.
- \`ngTemplateOutlet\` = печатаем один шаблон в разных местах с разным контекстом.
- \`ngComponentOutlet\` = выбираем и рендерим компонент по классу на лету, прямо в шаблоне.`,
      en: `## 🧩 In plain words

Imagine assembling a page out of parts. Sometimes you need an invisible box that groups parts but takes no space on the display shelf itself — that's \`ng-container\`. Sometimes you have a ready-made "stencil" (a template) and you want to print it in different places with different data — that's \`ngTemplateOutlet\`. And sometimes you want to decide on the fly which ready-made block (component) to place here — that's \`ngComponentOutlet\`. All three are tools for flexibly controlling what appears where on the page.

### ng-container — the invisible wrapper

\`ng-container\` is a logical container that creates **no** real DOM element. Use it to:

- attach a structural directive (\`*ngIf\`, \`*ngFor\` — directives that add or remove elements) without an extra wrapping \`<div>\`;
- group several nodes without cluttering the markup.

It's especially handy when you can't put two structural directives on one element (Angular forbids that).

\`\`\`html
<ng-container *ngIf="user as u">
  <h2>{{ u.name }}</h2>
</ng-container>
\`\`\`

Here \`*ngIf\` works, but the final HTML contains no \`<ng-container>\` — only the \`<h2>\`, if the condition is true.

### ngTemplateOutlet — printing a template with data

\`ngTemplateOutlet\` renders an \`ng-template\` (a template blueprint fragment) at a given place and passes it a **context** — a set of data. It's a mechanism for reusing markup fragments and customizing components from outside (you pass in your template, the component draws it).

\`\`\`html
<ng-template #row let-item let-i="index">{{ i }}: {{ item }}</ng-template>
<ng-container
  [ngTemplateOutlet]="row"
  [ngTemplateOutletContext]="{ $implicit: data, index: 0 }" />
\`\`\`

The \`$implicit\` key in the context is the "default value": it maps to the unnamed variable, i.e. \`let-item\`. Other keys (\`index\`) bind by name via \`let-i="index"\`.

### ngComponentOutlet — dynamic component selection

\`ngComponentOutlet\` declaratively (right in the template, without manual imperative code) renders a **component by its class** — dynamically, without calling \`ViewContainerRef.createComponent\`. It supports passing inputs, a custom injector, and content projection (since Angular 16.2).

\`\`\`html
<ng-container
  [ngComponentOutlet]="widgetClass"
  [ngComponentOutletInputs]="{ title: 'Hi' }" />
\`\`\`

Here \`widgetClass\` is a variable holding a component class; change its value and a different component is drawn.

### When to use which

- \`ng-container\` — structural grouping without creating DOM.
- \`ngTemplateOutlet\` — repeat or inject a template with data (the "slot with data" pattern).
- \`ngComponentOutlet\` — dynamic component selection declaratively (dashboards, plugins, CMS widgets).

## ⚠️ Common pitfalls

- You can't put two structural directives on one element — use \`ng-container\` as a wrapper for one of them.
- In \`ngTemplateOutletContext\` it's specifically \`$implicit\` that lands in the unnamed \`let-item\`; other variables need an explicit key name.
- \`ngComponentOutletInputs\` only works on Angular 16.2+; on older versions you can't pass inputs this way.

## 🎯 Key takeaways

- \`ng-container\` = an invisible box for grouping and structural directives.
- \`ngTemplateOutlet\` = print one template in different places with different context.
- \`ngComponentOutlet\` = pick and render a component by class on the fly, right in the template.`,
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
      ru: `## 🧩 Простыми словами

Знаешь звёздочку \`*\` перед директивами вроде \`*ngIf\` и \`*ngFor\`? Это просто удобное сокращение (синтаксический сахар). Под капотом Angular разворачивает эту запись в более длинную форму с \`<ng-template>\` — заготовкой, которую директива может показать или спрятать. Структурная директива — это код, который сам решает: создавать этот кусок разметки или нет, и сколько раз его повторить. Написать свою такую директиву несложно: тебе дают в руки «трафарет» содержимого и «место для вставки», а ты командуешь, что с ними делать.

### Что такое структурная директива

Звёздочка \`*\` — это синтаксический сахар. Запись \`<div *appUnless="cond">\` разворачивается компилятором в:

\`\`\`html
<ng-template appUnless [appUnless]="cond">
  <div></div>
</ng-template>
\`\`\`

То есть содержимое оборачивается в \`<ng-template>\` (заготовку, которая не рендерится сама по себе). Директива получает два инструмента через инъекцию:

- \`TemplateRef\` — ссылку на содержимое (сам трафарет);
- \`ViewContainerRef\` — точку вставки (место, куда можно поставить отрисованный трафарет).

И сама решает, создавать ли view (отрисованный экземпляр шаблона).

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

Это директива-«если НЕ»: когда условие ложно, она рисует содержимое через \`createEmbeddedView\`, когда истинно — убирает его через \`clear\`. Флаг \`created\` не даёт создавать view повторно.

### Как разворачивается микросинтаксис

Микросинтаксис — это компактная строка внутри кавычек у структурной директивы. Например, \`*ngFor="let item of items; let i = index; trackBy: fn"\` разворачивается по правилам:

- первое слово после \`*\` — имя директивы и её главный input;
- ключевые слова (\`of\`, \`let\`, \`as\`) маппятся на inputs (например, \`of items\` становится \`ngForOf\`) и на контекстные переменные;
- \`let x = expr\` создаёт локальную переменную из контекста embedded view (например, \`let i = index\` даёт тебе индекс текущего элемента).

### Type-guards — подсказки типов для шаблона

Для строгой типизации внутри шаблона к директиве добавляют статические свойства \`ngTemplateGuard_\` и метод \`ngTemplateContextGuard\`. Они говорят компилятору, как **сузить** типы внутри шаблона — например, \`*ngIf\` благодаря им сужает значение к non-null (гарантирует, что внутри блока значение точно не \`null\`).

## ⚠️ Подводные камни

- Современный синтаксис \`@if\` / \`@for\` (встроенный control flow) вшит в компилятор и работает быстрее кастомных директив — но кастомные структурные директивы всё ещё нужны для своей логики (например, \`*appHasPermission\`).
- На один элемент можно повесить только одну структурную директиву; для нескольких используй \`ng-container\`.
- Не забывай очищать view (\`vcr.clear()\`) при изменении условия — иначе получишь дубли или устаревшую разметку.

## 🎯 Запомни

- \`*\` = сахар: \`<div *dir>\` превращается в \`<ng-template dir>\` с обёрнутым содержимым.
- Директиве дают \`TemplateRef\` (что рисовать) и \`ViewContainerRef\` (куда рисовать); она сама решает когда и сколько раз.
- Микросинтаксис — правила разбора строки в inputs и контекстные переменные; \`let x = ...\` берёт значение из контекста view.`,
      en: `## 🧩 In plain words

You know the asterisk \`*\` in front of directives like \`*ngIf\` and \`*ngFor\`? It's just a convenient shorthand (syntactic sugar). Under the hood Angular expands it into a longer form with \`<ng-template>\` — a blueprint the directive can show or hide. A structural directive is code that decides for itself: whether to create this piece of markup, and how many times to repeat it. Writing your own such directive isn't hard: you're handed a "stencil" of the content and an "insertion spot," and you command what to do with them.

### What a structural directive is

The asterisk \`*\` is syntactic sugar. The expression \`<div *appUnless="cond">\` is desugared by the compiler into:

\`\`\`html
<ng-template appUnless [appUnless]="cond">
  <div></div>
</ng-template>
\`\`\`

That is, the content is wrapped in an \`<ng-template>\` (a blueprint that doesn't render on its own). The directive receives two tools via injection:

- \`TemplateRef\` — a reference to the content (the stencil itself);
- \`ViewContainerRef\` — the insertion point (a spot where the rendered stencil can be placed).

And it decides for itself whether to create the view (a rendered instance of the template).

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

This is an "if NOT" directive: when the condition is false it draws the content via \`createEmbeddedView\`, and when true it removes it via \`clear\`. The \`created\` flag prevents creating the view twice.

### How the microsyntax desugars

Microsyntax is the compact string inside the quotes of a structural directive. For example, \`*ngFor="let item of items; let i = index; trackBy: fn"\` desugars by rules:

- the first word after \`*\` is the directive name and its primary input;
- keywords (\`of\`, \`let\`, \`as\`) map to inputs (e.g. \`of items\` becomes \`ngForOf\`) and to context variables;
- \`let x = expr\` creates a local variable from the embedded view context (e.g. \`let i = index\` gives you the current item's index).

### Type guards — type hints for the template

For strict typing inside the template you add static members to the directive: \`ngTemplateGuard_\` and a \`ngTemplateContextGuard\` method. They tell the compiler how to **narrow** types inside the template — for example, thanks to them \`*ngIf\` narrows the value to non-null (guarantees that inside the block the value is definitely not \`null\`).

## ⚠️ Common pitfalls

- The modern \`@if\` / \`@for\` syntax (built-in control flow) is baked into the compiler and runs faster than custom directives — but custom structural directives are still useful for your own logic (e.g. \`*appHasPermission\`).
- You can attach only one structural directive to a single element; for several, use \`ng-container\`.
- Don't forget to clear the view (\`vcr.clear()\`) when the condition changes — otherwise you'll get duplicates or stale markup.

## 🎯 Key takeaways

- \`*\` = sugar: \`<div *dir>\` turns into \`<ng-template dir>\` with the content wrapped.
- The directive is given a \`TemplateRef\` (what to draw) and a \`ViewContainerRef\` (where to draw); it decides when and how many times.
- Microsyntax = rules for parsing the string into inputs and context variables; \`let x = ...\` takes a value from the view context.`,
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
      ru: `## 🧩 Простыми словами

Представь настольную игру, где у фишки есть несколько клеток-состояний: «закрыто» и «открыто». Анимации Angular работают похоже: ты описываешь состояния и правила плавного перехода между ними, а Angular сам проигрывает движение. Вместо того чтобы писать анимацию в CSS, ты описываешь её прямо в коде компонента как **машину состояний** — набор клеток и переходов. Это удобно, когда анимация зависит от данных (например, от того, открыт блок или нет).

### Декларативная модель

Анимации Angular описываются как **машина состояний** (набор состояний и переходов) в метаданных компонента, а не в CSS-файле. Чтобы они заработали, их нужно подключить провайдером: \`provideAnimationsAsync()\` (или \`provideAnimations()\`).

### Триггер и состояния

- \`trigger\` связывает имя анимации с шаблоном — в разметке ты обращаешься к нему через \`[@name]\`.
- \`state\` задаёт стиль **конечного состояния** (как элемент выглядит, когда он в этом состоянии).
- \`transition\` описывает саму анимацию перехода между состояниями.

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

Здесь \`<=>\` означает «в обе стороны» (из \`closed\` в \`open\` и обратно). Символ \`*\` в стиле — это «текущее вычисленное значение» (например, реальная высота элемента, которую заранее не знаешь).

### Спец-переходы

- \`:enter\` / \`:leave\` — для появления и удаления элемента (это алиасы, то есть псевдонимы, для \`void => *\` и \`* => void\`, где \`void\` — состояние «элемента ещё/уже нет»).
- \`:increment\` / \`:decrement\` — срабатывают при увеличении или уменьшении числового значения.

### keyframes и query/stagger

- \`keyframes\` задаёт промежуточные кадры анимации через \`offset\` (доля от 0 до 1 — где по времени находится кадр).
- \`query\` находит вложенные элементы, а \`stagger\` анимирует список с задержкой между элементами (эффект «волны»).

\`\`\`ts
transition('* => *', [
  query(':enter', [
    style({ opacity: 0 }),
    stagger(50, animate('200ms', style({ opacity: 1 }))),
  ], { optional: true }),
])
\`\`\`

Здесь каждый появляющийся элемент проявляется на 50 мс позже предыдущего. Флаг \`{ optional: true }\` не даёт упасть, если элементов не нашлось.

## ⚠️ Подводные камни

- Анимации выполняются через Web Animations API браузера; \`:leave\` откладывает реальное удаление элемента из DOM до конца анимации.
- Пакет \`@angular/animations\` весит немало — для простых эффектов часто достаточно обычных CSS-transitions.
- В SSR (рендеринг на сервере) анимации запускаются только в браузере после гидратации (когда серверный HTML «оживает» на клиенте).

## 🎯 Запомни

- Анимации Angular = машина состояний в метаданных компонента: \`trigger\` → \`state\` → \`transition\`.
- \`*\` = текущее вычисленное значение (например, авто-высота); \`:enter\` / \`:leave\` = появление / удаление.
- \`keyframes\` даёт промежуточные кадры, \`query\` + \`stagger\` — «волну» по списку; для простого хватает CSS.`,
      en: `## 🧩 In plain words

Picture a board game where a token has a few state-squares: "closed" and "open." Angular animations work similarly: you describe states and the rules for smoothly moving between them, and Angular plays the motion for you. Instead of writing the animation in CSS, you describe it right in the component code as a **state machine** — a set of squares and transitions. This is handy when the animation depends on data (for example, whether a block is open or not).

### Declarative model

Angular animations are described as a **state machine** (a set of states and transitions) in the component metadata, not in a CSS file. To make them work you must enable them with a provider: \`provideAnimationsAsync()\` (or \`provideAnimations()\`).

### Trigger and states

- \`trigger\` binds an animation name to the template — in the markup you reference it via \`[@name]\`.
- \`state\` defines the **end-state** style (how the element looks when it's in that state).
- \`transition\` describes the actual animation between states.

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

Here \`<=>\` means "both directions" (from \`closed\` to \`open\` and back). The \`*\` in a style means "current computed value" (e.g. the element's real height, which you don't know in advance).

### Special transitions

- \`:enter\` / \`:leave\` — for an element appearing and being removed (these are aliases, i.e. nicknames, for \`void => *\` and \`* => void\`, where \`void\` is the "element doesn't exist yet/anymore" state).
- \`:increment\` / \`:decrement\` — fire when a numeric value increases or decreases.

### keyframes and query/stagger

- \`keyframes\` defines intermediate animation frames via \`offset\` (a fraction from 0 to 1 — where in time the frame sits).
- \`query\` finds nested elements, and \`stagger\` animates a list with a delay between items (a "wave" effect).

\`\`\`ts
transition('* => *', [
  query(':enter', [
    style({ opacity: 0 }),
    stagger(50, animate('200ms', style({ opacity: 1 }))),
  ], { optional: true }),
])
\`\`\`

Here each appearing element fades in 50 ms later than the previous one. The \`{ optional: true }\` flag keeps it from failing if no elements are found.

## ⚠️ Common pitfalls

- Animations run via the browser's Web Animations API; \`:leave\` delays the actual removal of the element from the DOM until the animation finishes.
- The \`@angular/animations\` package is sizable — plain CSS transitions are often enough for simple effects.
- In SSR (server-side rendering) animations run only in the browser after hydration (when the server HTML "comes alive" on the client).

## 🎯 Key takeaways

- Angular animations = a state machine in the component metadata: \`trigger\` → \`state\` → \`transition\`.
- \`*\` = current computed value (e.g. auto height); \`:enter\` / \`:leave\` = appearance / removal.
- \`keyframes\` gives intermediate frames, \`query\` + \`stagger\` gives a list "wave"; for simple cases CSS is enough.`,
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
      ru: `## 🧩 Простыми словами

Представь, что картинки на сайте — это гости, которые приходят на вечеринку. Если каждый гость сам решает, когда прийти и сколько места занять, начинается хаос: страница дёргается, главная картинка грузится последней. \`NgOptimizedImage\` — это распорядитель, который заранее бронирует места и пропускает важных гостей вперёд. В итоге страница выглядит стабильно и главная картинка появляется быстро.

### Зачем это нужно: LCP и Core Web Vitals

**Core Web Vitals** — набор метрик Google, которыми измеряют «ощущение скорости» сайта. Одна из главных — **LCP** (Largest Contentful Paint, «отрисовка самого большого элемента»): сколько секунд проходит до появления самого крупного видимого элемента, а это почти всегда большая картинка (баннер, hero-изображение). Чем быстрее она появилась — тем ниже LCP и тем лучше.

\`NgOptimizedImage\` — это директива Angular (директива — переиспользуемое поведение, которое навешивается на HTML-элемент). Ты подключаешь её и вместо обычного атрибута \`src\` пишешь \`ngSrc\`:

\`\`\`html
<img ngSrc="hero.jpg" width="800" height="600" priority alt="Hero" />
\`\`\`

### Что директива делает автоматически

- **Требует \`width\` и \`height\`.** Зная размеры заранее, браузер резервирует место под картинку и не дёргает вёрстку, когда она догрузится. Это убирает **CLS** (Cumulative Layout Shift — «скачки» вёрстки), ещё одну метрику Core Web Vitals.
- **Ленивая загрузка по умолчанию** (\`loading="lazy"\`): картинки грузятся, только когда пользователь до них доскроллит. Исключение — приоритетные (см. ниже).
- **\`priority\`** — пометь этим атрибутом ту самую LCP-картинку (обычно баннер вверху). Директива добавит \`fetchpriority="high"\` и \`loading="eager"\` (грузить сразу, не откладывая), а также **preload**-подсказку в \`<head>\` — команду браузеру «начни качать это как можно раньше». Всё это ускоряет появление главной картинки.
- **\`srcset\` генерируется автоматически** по набору контрольных ширин (breakpoint'ов). \`srcset\` — это список вариантов картинки под разные размеры экрана, чтобы телефон не качал версию для 4K-монитора.
- **Предупреждения в dev-режиме**: директива подскажет, если файл слишком тяжёлый, у LCP-картинки забыт \`priority\` или размеры указаны неверно.

### Image loaders (загрузчики через CDN)

**CDN** (Content Delivery Network) — сеть серверов, которая раздаёт и на лету обрабатывает картинки: меняет размер, конвертирует в современные форматы **WebP/AVIF** (они весят меньше JPEG при том же качестве). Через провайдер-функцию (\`provideImgixLoader\`, \`provideCloudflareLoader\` или свой кастомный loader) директива сама переписывает URL картинки под нужный CDN:

\`\`\`ts
provideImgixLoader('https://cdn.example.com/')
\`\`\`

Теперь \`ngSrc="hero.jpg"\` превратится в ссылку на CDN с нужным размером и форматом.

### Полезные атрибуты

- **\`fill\`** — для адаптивных картинок «на всю ширину контейнера», когда точные \`width\`/\`height\` в пикселях задать нельзя. Вместо размеров пишешь \`fill\`, а родительский элемент делаешь \`position: relative\`.
- **\`ngSrcset\`** — задаёт плотности или ширины вручную: \`ngSrcset="1x, 2x"\` (для обычного и retina-экрана) или \`ngSrcset="100w, 200w"\` (по ширине в пикселях).

## ⚠️ Подводные камни

- Директива **не сжимает сами файлы** — этим занимается CDN/loader. Она управляет тем, **как** браузер их грузит (когда, в каком приоритете, каким размером).
- Нельзя одновременно указывать \`ngSrc\` и обычный \`src\` на одном \`<img>\` — выбери что-то одно.
- Забыть \`priority\` на LCP-картинке — частая ошибка: тогда она грузится лениво и метрика проседает.
- \`width\`/\`height\` обязательны (кроме режима \`fill\`) — без них директива выдаст ошибку.

## 🎯 Запомни

- \`NgOptimizedImage\` + атрибут \`ngSrc\` = быстрый LCP и отсутствие скачков вёрстки «из коробки».
- \`priority\` — на главную (LCP) картинку; остальные грузятся лениво сами.
- Обязательные \`width\`/\`height\` резервируют место и убивают CLS.
- Оптимизацией самих файлов занимается CDN/loader, директива — дирижёр загрузки.`,
      en: `## 🧩 In plain words

Think of the images on a page as guests arriving at a party. If each guest decides on their own when to show up and how much space to take, chaos follows: the page jumps around, and the most important picture loads last. \`NgOptimizedImage\` is the host who reserves seats in advance and lets the VIP guests in first. The result: a stable-looking page and a hero image that appears fast.

### Why it matters: LCP and Core Web Vitals

**Core Web Vitals** are Google's metrics for how fast a site *feels*. One of the main ones is **LCP** (Largest Contentful Paint): how many seconds pass before the biggest visible element shows up — and that's almost always a large image (a banner or hero image). The faster it appears, the lower the LCP and the better.

\`NgOptimizedImage\` is an Angular directive (a directive is reusable behavior attached to an HTML element). You enable it and, instead of the usual \`src\` attribute, you write \`ngSrc\`:

\`\`\`html
<img ngSrc="hero.jpg" width="800" height="600" priority alt="Hero" />
\`\`\`

### What the directive does automatically

- **Requires \`width\` and \`height\`.** Knowing the size up front, the browser reserves space for the image and doesn't reshuffle the layout when it loads. This eliminates **CLS** (Cumulative Layout Shift — layout "jumps"), another Core Web Vitals metric.
- **Lazy loading by default** (\`loading="lazy"\`): images load only when the user scrolls near them. The exception is priority images (below).
- **\`priority\`** — mark your LCP image (usually the banner at the top) with this. The directive adds \`fetchpriority="high"\` and \`loading="eager"\` (load right away, don't defer), plus a **preload** hint in \`<head>\` — a command telling the browser to start fetching this as early as possible. All of it makes the hero image appear sooner.
- **\`srcset\` is generated automatically** from a set of breakpoints. \`srcset\` is a list of image variants for different screen sizes, so a phone doesn't download the 4K-monitor version.
- **Dev-mode warnings**: it flags files that are too heavy, an LCP image missing \`priority\`, or wrong dimensions.

### Image loaders (CDN-backed)

A **CDN** (Content Delivery Network) is a network of servers that serves and transforms images on the fly: resizes them and converts them to modern **WebP/AVIF** formats (smaller than JPEG at the same quality). Via a provider function (\`provideImgixLoader\`, \`provideCloudflareLoader\`, or a custom loader) the directive rewrites the image URL for the chosen CDN:

\`\`\`ts
provideImgixLoader('https://cdn.example.com/')
\`\`\`

Now \`ngSrc="hero.jpg"\` becomes a CDN link with the right size and format.

### Handy attributes

- **\`fill\`** — for responsive "fill the container" images where you can't state exact pixel \`width\`/\`height\`. Use \`fill\` instead of dimensions, and make the parent element \`position: relative\`.
- **\`ngSrcset\`** — set densities or widths manually: \`ngSrcset="1x, 2x"\` (normal and retina screens) or \`ngSrcset="100w, 200w"\` (by pixel width).

## ⚠️ Common pitfalls

- The directive **does not compress the files themselves** — the CDN/loader does. It controls **how** the browser loads them (when, at what priority, at what size).
- You cannot set both \`ngSrc\` and a plain \`src\` on the same \`<img>\` — pick one.
- Forgetting \`priority\` on the LCP image is a common mistake: it then loads lazily and the metric suffers.
- \`width\`/\`height\` are mandatory (except in \`fill\` mode) — without them the directive throws an error.

## 🎯 Key takeaways

- \`NgOptimizedImage\` + the \`ngSrc\` attribute = fast LCP and no layout jumps, out of the box.
- Put \`priority\` on the main (LCP) image; the rest lazy-load on their own.
- Mandatory \`width\`/\`height\` reserve space and kill CLS.
- File optimization is the CDN/loader's job; the directive conducts the loading.`,
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
      ru: `## 🧩 Простыми словами

Представь книгу, где тяжёлые главы с картинками напечатаны на отдельных вкладышах. Пока читатель до них не дошёл, вкладыши лежат в коробке и не утяжеляют книгу. \`@defer\` делает то же самое с кодом: тяжёлые части страницы не грузятся сразу, а подтягиваются отдельным «вкладышем» только тогда, когда действительно нужны. Пока их нет, можно показать заглушку или спиннер.

### Идея @defer

\`@defer\` (появился в Angular 17) **лениво** загружает код зависимостей блока отдельным файлом (**чанком** — куском бандла) и рисует содержимое только когда сработает **триггер** (условие запуска). За счёт этого начальный бандл (initial bundle — то, что грузится при первом открытии) становится меньше, а **TTI** (Time To Interactive — момент, когда со страницей уже можно взаимодействовать) наступает раньше.

### Четыре блока

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

- **\`@defer\`** — сам ленивый блок; его содержимое появится после триггера.
- **\`@placeholder\`** — что показать **до** начала загрузки (например, кнопку или текст). Рендерится сразу, но, в отличие от defer-блока, его зависимости **не** откладываются.
- **\`@loading\`** — что показать, **пока** грузится чанк (спиннер). Параметры \`after 100ms\` (не показывать первые 100 мс) и \`minimum 1s\` (показывать минимум 1 с) убирают неприятное мелькание спиннера.
- **\`@error\`** — что показать, если загрузка чанка провалилась (например, пропал интернет).

### Триггеры (когда запускать загрузку)

- **\`on idle\`** (по умолчанию) — когда браузер свободен, через \`requestIdleCallback\`.
- **\`on viewport\`** — когда блок (или его placeholder) появился на экране; внутри работает **IntersectionObserver** (браузерный API слежения за видимостью элемента).
- **\`on interaction\`** — по клику/нажатию пользователя; **\`on hover\`** — при наведении курсора.
- **\`on timer(2s)\`** — через заданное время; **\`on immediate\`** — сразу после отрисовки страницы.
- **\`when condition\`** — по булевому выражению или сигналу (\`when isReady()\`).

Триггеры можно комбинировать через \`;\` и привязывать к конкретному элементу-ссылке: \`on viewport(ref)\` сработает, когда в зону видимости попадёт именно элемент \`ref\`.

### prefetch (загрузить заранее, но не показывать)

\`prefetch\` качает чанк **впрок**, ещё не рендеря его, по отдельному триггеру:

\`\`\`html
@defer (on interaction; prefetch on idle) { ... }
\`\`\`

Здесь код тихо скачается, когда браузер свободен (\`prefetch on idle\`), а покажется только по клику (\`on interaction\`). К моменту реального показа файл уже в кэше — ждать не придётся.

## ⚠️ Подводные камни

- Все зависимости defer-блока должны быть **standalone** (самодостаточными компонентами/директивами без NgModule) и использоваться **только внутри** блока. Если тот же компонент нужен где-то ещё вне блока — он не отложится, и весь смысл теряется.
- Слишком агрессивный \`on immediate\` почти сводит на нет пользу — код всё равно грузится сразу.
- При **SSR** (server-side rendering — отрисовка на сервере) с incremental hydration границы \`@defer\` становятся точками частичной **гидратации** (оживления серверного HTML на клиенте).

## 🎯 Запомни

- \`@defer\` откладывает загрузку **кода** до срабатывания триггера — меньше стартовый бандл, быстрее TTI.
- Четыре блока: \`@defer\` (контент), \`@placeholder\` (до), \`@loading\` (во время), \`@error\` (при сбое).
- Триггеры: \`idle\`, \`viewport\`, \`interaction\`, \`hover\`, \`timer\`, \`immediate\`, \`when\` — можно комбинировать.
- \`prefetch\` качает чанк заранее, чтобы к моменту показа он уже был в кэше.`,
      en: `## 🧩 In plain words

Picture a book where the heavy, image-filled chapters are printed on separate inserts. Until the reader gets to them, the inserts sit in a box and don't weigh the book down. \`@defer\` does the same with code: the heavy parts of a page don't load right away — they're pulled in as a separate "insert" only when actually needed. Until then, you can show a placeholder or a spinner.

### The @defer idea

\`@defer\` (introduced in Angular 17) **lazily** loads the block's dependency code as a separate file (a **chunk** — a slice of the bundle) and renders the content only when a **trigger** (start condition) fires. This shrinks the initial bundle (what loads on first open) and makes **TTI** (Time To Interactive — the moment the page is usable) arrive sooner.

### The four blocks

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

- **\`@defer\`** — the lazy block itself; its content shows after the trigger.
- **\`@placeholder\`** — what to show **before** loading starts (e.g. a button or text). It renders immediately, but unlike the defer block, its dependencies are **not** deferred.
- **\`@loading\`** — what to show **while** the chunk loads (a spinner). The options \`after 100ms\` (don't show for the first 100 ms) and \`minimum 1s\` (show for at least 1 s) prevent an ugly spinner flicker.
- **\`@error\`** — what to show if the chunk fails to load (e.g. the connection dropped).

### Triggers (when to start loading)

- **\`on idle\`** (default) — when the browser is free, via \`requestIdleCallback\`.
- **\`on viewport\`** — when the block (or its placeholder) enters the screen; it uses **IntersectionObserver** under the hood (a browser API that watches element visibility).
- **\`on interaction\`** — on a user click/tap; **\`on hover\`** — on cursor hover.
- **\`on timer(2s)\`** — after a set delay; **\`on immediate\`** — right after the page renders.
- **\`when condition\`** — on a boolean expression or signal (\`when isReady()\`).

Triggers can be combined with \`;\` and bound to a specific reference element: \`on viewport(ref)\` fires when that exact \`ref\` element enters the viewport.

### prefetch (load ahead, don't show yet)

\`prefetch\` fetches the chunk **in advance** without rendering it, on its own trigger:

\`\`\`html
@defer (on interaction; prefetch on idle) { ... }
\`\`\`

Here the code quietly downloads when the browser is free (\`prefetch on idle\`), but shows only on click (\`on interaction\`). By the time of the real display, the file is already cached — no waiting.

## ⚠️ Common pitfalls

- All defer-block dependencies must be **standalone** (self-contained components/directives with no NgModule) and used **only inside** the block. If the same component is used somewhere else outside the block, it won't be deferred, and the whole point is lost.
- An overly aggressive \`on immediate\` almost defeats the purpose — the code still loads right away.
- Under **SSR** (server-side rendering) with incremental hydration, \`@defer\` boundaries become partial **hydration** points (bringing server HTML to life on the client).

## 🎯 Key takeaways

- \`@defer\` postpones loading the **code** until a trigger fires — smaller initial bundle, faster TTI.
- Four blocks: \`@defer\` (content), \`@placeholder\` (before), \`@loading\` (during), \`@error\` (on failure).
- Triggers: \`idle\`, \`viewport\`, \`interaction\`, \`hover\`, \`timer\`, \`immediate\`, \`when\` — combinable.
- \`prefetch\` downloads the chunk ahead of time so it's already cached when shown.`,
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
      ru: `## 🧩 Простыми словами

Когда компонент подписывается на поток данных, он как будто оставляет открытый кран. Если закрыть компонент, но не закрыть кран — вода продолжит течь (утечка памяти, лишние вызовы). Раньше приходилось вручную заводить «вентиль» и не забывать закрывать его при уничтожении. \`DestroyRef\` и \`takeUntilDestroyed\` — это автоматический вентиль, который сам перекрывается, как только компонент умирает.

### Проблема: ручные отписки

**Подписка** (subscription) — это когда ты говоришь потоку (Observable из RxJS): «сообщай мне о новых значениях». Пока не отпишешься, поток держит ссылку на твой колбэк — отсюда утечки. Классический способ уборки — оператор \`takeUntil(this.destroy$)\` с отдельным \`Subject\`:

\`\`\`ts
private destroy$ = new Subject<void>();
ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
\`\`\`

\`Subject\` тут — «сигнальная ракета»: в \`ngOnDestroy\` (метод жизненного цикла, вызывается при уничтожении компонента) ты её пускаешь, и все подписки с \`takeUntil\` завершаются. Работает, но это много шаблонного кода, и легко забыть.

### DestroyRef

\`DestroyRef\` — инжектируемый токен (объект, который ты получаешь через систему внедрения зависимостей Angular функцией \`inject()\`). Он даёт доступ к моменту уничтожения **текущего контекста** — компонента, директивы или сервиса с тем же временем жизни. Его метод \`onDestroy(cb)\` регистрирует колбэк, который выполнится при уничтожении:

\`\`\`ts
private destroyRef = inject(DestroyRef);
ngOnInit() {
  const id = setInterval(tick, 1000);
  this.destroyRef.onDestroy(() => clearInterval(id));
}
\`\`\`

Здесь мы регистрируем очистку таймера прямо рядом с его созданием — не нужно отдельно лезть в \`ngOnDestroy\`.

### takeUntilDestroyed

Это RxJS-оператор, который сам завершает подписку при уничтожении контекста, используя \`DestroyRef\` под капотом. По сути — готовый \`takeUntil\`, за которым не надо следить:

\`\`\`ts
this.data$
  .pipe(takeUntilDestroyed()) // в конструкторе/инициализаторе поля — берёт DestroyRef сам
  .subscribe();
\`\`\`

### Где его можно вызывать

- **Без аргумента** \`takeUntilDestroyed()\` должен вызываться в **injection-контексте** — то есть там, где Angular разрешает \`inject()\`: в инициализаторе поля или в конструкторе. Тогда оператор сам достанет \`DestroyRef\`.
- **Вне** этого контекста (например, в \`ngOnInit\` или в обычном колбэке) \`inject()\` уже недоступен, поэтому ref нужно передать явно:

\`\`\`ts
ngOnInit() {
  this.svc.stream$
    .pipe(takeUntilDestroyed(this.destroyRef)) // ref передан руками
    .subscribe(v => this.handle(v));
}
\`\`\`

## ⚠️ Подводные камни

- Главная ошибка — вызвать \`takeUntilDestroyed()\` **без** аргумента вне injection-контекста: будет ошибка «inject() must be called from an injection context». Решение — заранее получить \`destroyRef = inject(DestroyRef)\` в поле и передавать его явно.
- Работает для любого контекста с DI, включая сервисы, предоставленные **на уровне компонента** (они уничтожаются вместе с ним). А вот глобальный сервис (\`providedIn: 'root'\`) живёт всё время работы приложения — там «уничтожение» практически не наступает.
- Оператор не отменяет необходимость правильно завершать «горячие» источники, но для подписок это идиоматичная замена ручному \`ngOnDestroy\`.
- В связке с сигналами (\`toSignal\` — превращает Observable в сигнал) отписка происходит автоматически, так что ручной \`takeUntilDestroyed\` нужен реже.

## 🎯 Запомни

- \`DestroyRef.onDestroy(cb)\` — регистрирует очистку рядом с местом, где ресурс создан.
- \`takeUntilDestroyed()\` — автоматическая отписка от Observable при уничтожении контекста.
- Без аргумента — только в injection-контексте (поле/конструктор); в \`ngOnInit\`/колбэке передавай \`DestroyRef\` явно.
- Это современная замена паттерну \`takeUntil(destroy$)\` с ручным \`Subject\`.`,
      en: `## 🧩 In plain words

When a component subscribes to a stream of data, it's like leaving a tap open. If you close the component but not the tap, water keeps flowing (a memory leak, extra calls). You used to have to set up a "valve" by hand and remember to close it on destruction. \`DestroyRef\` and \`takeUntilDestroyed\` are an automatic valve that shuts itself off the moment the component dies.

### The problem: manual unsubscription

A **subscription** is when you tell a stream (an RxJS Observable): "notify me of new values." Until you unsubscribe, the stream holds a reference to your callback — hence the leaks. The classic cleanup is the \`takeUntil(this.destroy$)\` operator with a dedicated \`Subject\`:

\`\`\`ts
private destroy$ = new Subject<void>();
ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
\`\`\`

The \`Subject\` here is a "signal flare": in \`ngOnDestroy\` (a lifecycle method called when the component is destroyed) you fire it, and all subscriptions with \`takeUntil\` complete. It works, but it's a lot of boilerplate and easy to forget.

### DestroyRef

\`DestroyRef\` is an injectable token (an object you obtain through Angular's dependency injection via the \`inject()\` function). It gives access to the destruction moment of the **current context** — a component, directive, or service with the same lifetime. Its \`onDestroy(cb)\` method registers a callback that runs on destruction:

\`\`\`ts
private destroyRef = inject(DestroyRef);
ngOnInit() {
  const id = setInterval(tick, 1000);
  this.destroyRef.onDestroy(() => clearInterval(id));
}
\`\`\`

Here we register the timer cleanup right next to where it's created — no need to jump over to \`ngOnDestroy\` separately.

### takeUntilDestroyed

This is an RxJS operator that completes the subscription itself when the context is destroyed, using \`DestroyRef\` under the hood. It's essentially a ready-made \`takeUntil\` you don't have to babysit:

\`\`\`ts
this.data$
  .pipe(takeUntilDestroyed()) // in constructor/field initializer — grabs DestroyRef itself
  .subscribe();
\`\`\`

### Where you can call it

- **Without an argument**, \`takeUntilDestroyed()\` must be called in an **injection context** — that is, where Angular allows \`inject()\`: a field initializer or the constructor. Then the operator fetches \`DestroyRef\` itself.
- **Outside** that context (e.g. in \`ngOnInit\` or a regular callback) \`inject()\` is no longer available, so you must pass the ref explicitly:

\`\`\`ts
ngOnInit() {
  this.svc.stream$
    .pipe(takeUntilDestroyed(this.destroyRef)) // ref passed by hand
    .subscribe(v => this.handle(v));
}
\`\`\`

## ⚠️ Common pitfalls

- The main mistake is calling \`takeUntilDestroyed()\` **without** an argument outside an injection context: you'll get "inject() must be called from an injection context." Fix: grab \`destroyRef = inject(DestroyRef)\` in a field up front and pass it explicitly.
- It works for any DI context, including **component-level** services (destroyed together with the component). A global service (\`providedIn: 'root'\`), however, lives for the whole app's lifetime — "destruction" essentially never happens there.
- The operator doesn't remove the need to properly complete "hot" sources, but for subscriptions it's the idiomatic replacement for a manual \`ngOnDestroy\`.
- Combined with signals (\`toSignal\` — turns an Observable into a signal) unsubscription is automatic, so manual \`takeUntilDestroyed\` is needed less often.

## 🎯 Key takeaways

- \`DestroyRef.onDestroy(cb)\` — registers cleanup right where the resource is created.
- \`takeUntilDestroyed()\` — automatic unsubscription from an Observable when the context is destroyed.
- No argument → injection context only (field/constructor); in \`ngOnInit\`/callbacks pass \`DestroyRef\` explicitly.
- It's the modern replacement for the \`takeUntil(destroy$)\` pattern with a manual \`Subject\`.`,
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
      ru: `## 🧩 Простыми словами

Сигналы в Angular — это «умные коробки» со значениями: когда значение меняется, всё, что от него зависит, само пересчитывается. Но у этой автоматики есть тонкие настройки. \`effect\` умеет прибираться за собой перед каждым перезапуском. \`untracked\` позволяет «подсмотреть» значение, не подписываясь на него. А кастомное \`equal\` учит сигнал не дёргаться, когда данные по сути те же. Разберём по очереди.

### Cleanup в effect (уборка)

**Сигнал** (signal) — контейнер значения, который оповещает подписчиков об изменениях. **\`effect\`** — функция, которая автоматически перезапускается, когда меняется любой прочитанный внутри неё сигнал (например, чтобы что-то залогировать или сделать запрос).

Колбэк \`effect\` получает аргумент \`onCleanup\` — функцию, куда ты кладёшь «уборку». Она вызывается **перед каждым** повторным запуском эффекта и при его уничтожении. Идеальное место, чтобы отменить таймер, подписку или сетевой запрос:

\`\`\`ts
effect((onCleanup) => {
  const ctrl = new AbortController();
  fetch(url(), { signal: ctrl.signal });
  onCleanup(() => ctrl.abort());
});
\`\`\`

Здесь \`AbortController\` — способ отменить \`fetch\`. Как только \`url()\` изменится и эффект перезапустится, старый запрос отменяется через \`onCleanup\`, и мы не получим ответ от устаревшего запроса.

### untracked (прочитать, но не подписываться)

По умолчанию **любой** сигнал, прочитанный внутри \`effect\` или \`computed\`, становится **зависимостью** — то есть его изменение вызовет пересчёт. Иногда это не нужно: значение хочется просто «подсмотреть». Для этого есть \`untracked(() => ...)\` — читает сигнал **без** создания зависимости:

\`\`\`ts
effect(() => {
  const value = data();                  // зависимость: меняется — эффект перезапустится
  const cfg = untracked(() => config());  // НЕ зависимость: изменение config эффект не тронет
  log(value, cfg);
});
\`\`\`

Типичный случай: эффект должен реагировать на \`data\`, но брать **текущее** значение \`config\`, не перезапускаясь всякий раз, когда \`config\` дёрнулся. Без \`untracked\` были бы лишние перезапуски.

### Кастомное equality у computed

**\`computed\`** — сигнал, вычисляемый из других сигналов. По умолчанию Angular сравнивает старое и новое значение через \`Object.is\` (проверка «это тот же самый объект?»). Для объектов и массивов это ловушка: новый массив с точно теми же данными — это новая ссылка, поэтому \`Object.is\` считает его изменившимся, и всё зависимое пересчитывается зря.

Опция \`equal\` задаёт свою функцию сравнения:

\`\`\`ts
const list = computed(() => filter(items()), {
  equal: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]),
});
\`\`\`

Если \`equal\` вернёт \`true\` (значения «равны»), Angular считает, что ничего не изменилось — зависимые computed, эффекты и шаблон **не** пересчитываются. Это экономит **CD** (Change Detection — проход Angular, обновляющий DOM).

## ⚠️ Подводные камни

- Слишком тяжёлая \`equal\`-функция (например, глубокое сравнение больших структур) может обойтись **дороже**, чем один лишний пересчёт. Всегда мерь, прежде чем оптимизировать.
- \`untracked\` не «замораживает» значение: он вернёт актуальное на момент вызова, просто не создаст зависимость.
- \`untracked\` также нужен, чтобы безопасно писать в сигнал или вызывать сторонние методы внутри \`computed\`, не нарушая правило «computed должен быть чистым».
- \`onCleanup\` вызывается и перед перезапуском, и при уничтожении — не рассчитывай, что он сработает только один раз.

## 🎯 Запомни

- \`onCleanup\` в \`effect\` — отмена ресурсов **перед каждым** перезапуском и при уничтожении.
- \`untracked(() => sig())\` — прочитать сигнал без подписки, чтобы не ловить лишние перезапуски.
- \`equal\` у \`computed\`/\`signal\` учит сравнивать по содержимому, а не по ссылке, и пропускать ненужный пересчёт.
- Кастомное \`equal\` экономит Change Detection, но само не должно быть тяжелее выгоды — мерь.`,
      en: `## 🧩 In plain words

Signals in Angular are "smart boxes" holding values: when a value changes, everything that depends on it recomputes automatically. But this automation has fine-tuning knobs. \`effect\` can clean up after itself before each re-run. \`untracked\` lets you "peek" at a value without subscribing to it. And a custom \`equal\` teaches a signal not to twitch when the data is essentially the same. Let's take them one at a time.

### Cleanup in effect

A **signal** is a value container that notifies subscribers of changes. An **\`effect\`** is a function that automatically re-runs whenever any signal read inside it changes (e.g. to log something or make a request).

The \`effect\` callback receives an \`onCleanup\` argument — a function where you put the "cleanup." It's called **before each** re-run of the effect and on its destruction. It's the perfect place to cancel a timer, subscription, or network request:

\`\`\`ts
effect((onCleanup) => {
  const ctrl = new AbortController();
  fetch(url(), { signal: ctrl.signal });
  onCleanup(() => ctrl.abort());
});
\`\`\`

Here \`AbortController\` is a way to cancel a \`fetch\`. As soon as \`url()\` changes and the effect re-runs, the old request is aborted via \`onCleanup\`, so we don't get a response from a stale request.

### untracked (read, but don't subscribe)

By default, **any** signal read inside an \`effect\` or \`computed\` becomes a **dependency** — meaning its change triggers a recompute. Sometimes that's not what you want: you just want to "peek." That's what \`untracked(() => ...)\` is for — it reads a signal **without** creating a dependency:

\`\`\`ts
effect(() => {
  const value = data();                  // dependency: when it changes, the effect re-runs
  const cfg = untracked(() => config());  // NOT a dependency: a config change won't touch the effect
  log(value, cfg);
});
\`\`\`

Typical case: the effect must react to \`data\` but read the **current** value of \`config\` without re-running every time \`config\` twitches. Without \`untracked\` you'd get extra re-runs.

### Custom equality on computed

A **\`computed\`** is a signal derived from other signals. By default Angular compares the old and new value with \`Object.is\` (a "is it the very same object?" check). For objects and arrays this is a trap: a new array with exactly the same data is a new reference, so \`Object.is\` sees it as changed, and everything downstream recomputes for nothing.

The \`equal\` option provides a custom comparator:

\`\`\`ts
const list = computed(() => filter(items()), {
  equal: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]),
});
\`\`\`

If \`equal\` returns \`true\` (the values are "equal"), Angular treats it as unchanged — dependent computeds, effects, and the template do **not** recompute. This saves **CD** (Change Detection — Angular's pass that updates the DOM).

## ⚠️ Common pitfalls

- An overly heavy \`equal\` function (e.g. deep-comparing large structures) can cost **more** than a single redundant recompute. Always measure before optimizing.
- \`untracked\` doesn't "freeze" the value: it returns the current value at call time, it just doesn't create a dependency.
- \`untracked\` is also needed to safely write to a signal or call side-effecting methods inside a \`computed\` without breaking the "a computed must be pure" rule.
- \`onCleanup\` runs both before a re-run and on destruction — don't assume it fires only once.

## 🎯 Key takeaways

- \`onCleanup\` in \`effect\` — cancel resources **before each** re-run and on destruction.
- \`untracked(() => sig())\` — read a signal without subscribing, to avoid extra re-runs.
- \`equal\` on \`computed\`/\`signal\` teaches comparison by content, not by reference, and skips needless recomputes.
- A custom \`equal\` saves Change Detection, but it must not cost more than the benefit — measure.`,
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
      ru: `## 🧩 Простыми словами

Представь форму, где заранее неизвестно, сколько будет полей: пользователь может добавить один телефон, а может пять. Для таких «списков переменной длины» в Angular есть \`FormArray\` — коробка, в которую можно на лету докидывать и вынимать поля. А \`updateOn\` решает, **когда** форма реагирует на ввод (сразу, при потере фокуса или при отправке), а \`valueChanges\` — это «радиоволна», которая сообщает вам о каждом изменении значения.

### FormArray — список полей переменной длины

\`FormArray\` — это коллекция контролов с числовыми индексами (0, 1, 2...). В отличие от \`FormGroup\`, у которого поля фиксированные и именованные (\`name\`, \`email\`), \`FormArray\` подходит, когда количество полей заранее неизвестно: теги, строки таблицы, набор телефонов.

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

Здесь \`push\` добавляет новый контрол в конец, а \`removeAt(i)\` удаляет по индексу — как работа с обычным массивом, только для полей формы.

### Типизация (Angular 14+)

С типизированными формами (появились в Angular 14) \`FormArray<FormControl<string>>\` даёт типобезопасное значение \`value: string[]\` — TypeScript знает, что внутри строки. Опция \`nonNullable: true\` (или \`NonNullableFormBuilder\`) убирает \`| null\` из типа и делает так, что \`reset()\` возвращает контрол к начальному значению, а не к \`null\`.

### updateOn — когда форма реагирует

\`updateOn\` — стратегия, определяющая, **в какой момент** контрол обновляет своё значение и запускает валидацию:

- \`'change'\` (по умолчанию) — на каждый ввод символа.
- \`'blur'\` — при потере фокуса. Валидаций меньше, удобно для тяжёлых асинхронных валидаторов (например, проверка занятости логина на сервере).
- \`'submit'\` — только при отправке формы.

\`\`\`ts
new FormControl('', { updateOn: 'blur', validators: [Validators.required] })
\`\`\`

Можно задать \`updateOn\` на уровне всей группы — тогда дети унаследуют стратегию.

### valueChanges — поток изменений

\`valueChanges\` — это \`Observable\` (поток данных), который эмитит новое значение при каждом изменении (с учётом \`updateOn\`). Рядом есть парный \`statusChanges\` — поток статуса валидности. Значение приходит **типизированным**. Для побочных эффектов (сохранение, запросы) оборачивайте поток в \`takeUntilDestroyed\` (авто-отписка при уничтожении компонента) и \`debounceTime\` (не дёргать на каждый символ).

\`\`\`ts
this.form.controls.phones.valueChanges
  .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
  .subscribe(phones => this.savePhones(phones)); // phones: string[]
\`\`\`

Здесь мы ждём 300 мс тишины после последнего изменения телефонов и только потом сохраняем — это защищает сервер от лавины запросов.

## ⚠️ Подводные камни

- \`getRawValue()\` включает и \`disabled\`-контролы, которых нет в обычном \`value\`.
- \`patchValue\` обновляет только переданные поля, а \`setValue\` требует указать **все** поля.
- При \`emitEvent: false\` программное обновление **не** вызывает \`valueChanges\` — так избегают бесконечных циклов, когда подписка сама меняет форму.

## 🎯 Запомни

- \`FormArray\` — для списков переменной длины; \`push\`/\`removeAt\` управляют полями.
- \`updateOn\` (\`change\`/\`blur\`/\`submit\`) решает, когда срабатывает валидация и обновляется значение.
- \`valueChanges\` — типизированный поток изменений; всегда добавляйте \`takeUntilDestroyed\`, чтобы не текла память.`,
      en: `## 🧩 In plain words

Imagine a form where you don't know upfront how many fields there will be: a user might add one phone number, or five. For such "variable-length lists" Angular has \`FormArray\` — a box you can add fields to and remove them from on the fly. \`updateOn\` decides **when** the form reacts to input (immediately, on blur, or on submit), and \`valueChanges\` is a "radio signal" that tells you about every value change.

### FormArray — a variable-length list of fields

\`FormArray\` is a collection of controls with numeric indices (0, 1, 2...). Unlike \`FormGroup\`, which has fixed named fields (\`name\`, \`email\`), \`FormArray\` fits when the number of fields isn't known ahead of time: tags, table rows, a set of phones.

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

Here \`push\` appends a new control, and \`removeAt(i)\` deletes one by index — just like working with a regular array, but for form fields.

### Typing (Angular 14+)

With typed forms (introduced in Angular 14) \`FormArray<FormControl<string>>\` yields a type-safe \`value: string[]\` — TypeScript knows the items are strings. The \`nonNullable: true\` option (or \`NonNullableFormBuilder\`) removes the \`| null\` from the type and makes \`reset()\` return the control to its initial value instead of \`null\`.

### updateOn — when the form reacts

\`updateOn\` is the strategy deciding **at what moment** a control updates its value and runs validation:

- \`'change'\` (default) — on every keystroke.
- \`'blur'\` — on focus loss. Fewer validations, handy for heavy async validators (e.g. checking username availability on the server).
- \`'submit'\` — only when the form is submitted.

\`\`\`ts
new FormControl('', { updateOn: 'blur', validators: [Validators.required] })
\`\`\`

You can set \`updateOn\` at the group level — children then inherit the strategy.

### valueChanges — the stream of changes

\`valueChanges\` is an \`Observable\` (a data stream) that emits a new value on each change (respecting \`updateOn\`). There's a paired \`statusChanges\` — a stream of validity status. The value arrives **typed**. For side effects (saving, requests) wrap the stream in \`takeUntilDestroyed\` (auto-unsubscribe when the component is destroyed) and \`debounceTime\` (don't fire on every keystroke).

\`\`\`ts
this.form.controls.phones.valueChanges
  .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
  .subscribe(phones => this.savePhones(phones)); // phones: string[]
\`\`\`

Here we wait for 300 ms of silence after the last phone edit and only then save — protecting the server from a flood of requests.

## ⚠️ Common pitfalls

- \`getRawValue()\` includes \`disabled\` controls, which are absent from the plain \`value\`.
- \`patchValue\` updates only the passed fields, while \`setValue\` requires **all** fields.
- With \`emitEvent: false\` a programmatic update does **not** trigger \`valueChanges\` — this avoids infinite loops where a subscription itself changes the form.

## 🎯 Key takeaways

- \`FormArray\` is for variable-length lists; \`push\`/\`removeAt\` manage the fields.
- \`updateOn\` (\`change\`/\`blur\`/\`submit\`) decides when validation runs and the value updates.
- \`valueChanges\` is a typed stream of changes; always add \`takeUntilDestroyed\` to avoid memory leaks.`,
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
      ru: `## 🧩 Простыми словами

Два разных инструмента роутера про «уход» и «возврат». \`CanDeactivate\` — это охранник у выхода: он спрашивает «точно уходишь? у тебя же несохранённые изменения» и может не выпустить. \`RouteReuseStrategy\` — это про то, пересоздавать ли компонент заново при возврате или сохранить его как есть (как свернуть вкладку в браузере, а не закрыть).

### CanDeactivate — охранник на выходе

\`CanDeactivate\` — это гвард (проверка), который вызывается **перед уходом** с маршрута и может **отменить** навигацию. Классический случай: пользователь заполнил форму, но не сохранил и жмёт «назад» — надо спросить «уйти без сохранения?».

\`\`\`ts
export const unsavedGuard: CanDeactivateFn<FormComponent> = (cmp) =>
  cmp.form.pristine || confirm('Покинуть без сохранения?');
\`\`\`

\`pristine\` означает «форму не трогали». Если её меняли — показываем \`confirm\`. Возврат \`false\` останавливает навигацию, \`UrlTree\` перенаправляет, а \`Observable<boolean>\` позволяет дождаться ответа из диалога. Функциональный стиль (\`CanDeactivateFn\`) заменил старый классовый интерфейс; внутри доступен \`inject()\` для получения сервисов.

\`\`\`ts
export const unsavedGuard: CanDeactivateFn<EditComponent> = (component) => {
  if (component.form.pristine) return true;
  const dialog = inject(ConfirmDialog);
  return dialog.confirm('Discard changes?');
};
// route: { path: 'edit', component: EditComponent, canDeactivate: [unsavedGuard] }
\`\`\`

### RouteReuseStrategy — переиспользовать компонент или пересоздавать

\`RouteReuseStrategy\` — стратегия, которая решает, **переиспользовать** ли уже созданный компонент маршрута вместо его пересоздания с нуля. По умолчанию Angular переиспользует компонент, если меняются только параметры **того же** роута (например, \`/user/1\` → \`/user/2\`): компонент не пересоздаётся, а просто эмитит новый \`paramMap\`.

Кастомная стратегия позволяет **сохранять и восстанавливать** целые поддеревья (методы detach/store/retrieve) — например, кэшировать состояние вкладок или результаты поиска, чтобы при возврате назад страница осталась ровно такой, какой её оставили.

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

Здесь \`shouldDetach\` говорит «этот роут стоит сохранить при уходе», \`store\` кладёт сохранённый компонент в кэш, а \`shouldAttach\`/\`retrieve\` восстанавливают его при возврате.

## ⚠️ Подводные камни

- Переиспользование компонента означает, что \`ngOnInit\` **не** вызывается повторно — подписывайтесь на \`paramMap\`/\`data\`, а не читайте \`snapshot\` один раз, иначе данные не обновятся при смене параметров.
- Неаккуратная reuse-стратегия ведёт к утечкам памяти (компоненты сохранены, но никогда не восстанавливаются) и к устаревшему состоянию на экране.
- \`shouldReuseRoute\` сравнивает \`future\` и \`curr\` снапшоты — это основа дефолтного поведения переиспользования.

## 🎯 Запомни

- \`CanDeactivate\` — охранник перед уходом; вернёшь \`false\`/\`UrlTree\` — навигация отменяется или перенаправляется.
- \`RouteReuseStrategy\` решает, пересоздавать компонент или сохранить его (detach/store/retrieve).
- При переиспользовании \`ngOnInit\` не срабатывает снова — слушайте \`paramMap\`, а не читайте snapshot единожды.`,
      en: `## 🧩 In plain words

Two different router tools about "leaving" and "coming back". \`CanDeactivate\` is a guard at the exit door: it asks "are you sure you want to leave? you have unsaved changes" and can block you. \`RouteReuseStrategy\` is about whether to recreate a component from scratch when you return, or keep it as-is (like minimizing a browser tab instead of closing it).

### CanDeactivate — the guard at the exit

\`CanDeactivate\` is a guard (a check) invoked **before leaving** a route that can **cancel** navigation. The classic case: the user filled in a form, didn't save, and hits "back" — you need to ask "leave without saving?".

\`\`\`ts
export const unsavedGuard: CanDeactivateFn<FormComponent> = (cmp) =>
  cmp.form.pristine || confirm('Leave without saving?');
\`\`\`

\`pristine\` means "the form was never touched". If it was changed, we show a \`confirm\`. Returning \`false\` stops navigation, a \`UrlTree\` redirects, and an \`Observable<boolean>\` lets you wait for an answer from a dialog. The functional style (\`CanDeactivateFn\`) replaced the old class interface; \`inject()\` is available inside to grab services.

\`\`\`ts
export const unsavedGuard: CanDeactivateFn<EditComponent> = (component) => {
  if (component.form.pristine) return true;
  const dialog = inject(ConfirmDialog);
  return dialog.confirm('Discard changes?');
};
// route: { path: 'edit', component: EditComponent, canDeactivate: [unsavedGuard] }
\`\`\`

### RouteReuseStrategy — reuse a component or recreate it

\`RouteReuseStrategy\` is a strategy that decides whether to **reuse** an already created route component instead of recreating it from scratch. By default Angular reuses the component when only the params of the **same** route change (e.g. \`/user/1\` → \`/user/2\`): the component isn't recreated, it simply emits a new \`paramMap\`.

A custom strategy lets you **store and restore** whole subtrees (the detach/store/retrieve methods) — e.g. caching tab state or search results so that when you navigate back the page is exactly as you left it.

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

Here \`shouldDetach\` says "this route is worth saving on leave", \`store\` puts the saved component into a cache, and \`shouldAttach\`/\`retrieve\` restore it on return.

## ⚠️ Common pitfalls

- Reusing a component means \`ngOnInit\` is **not** called again — subscribe to \`paramMap\`/\`data\` instead of reading the \`snapshot\` once, or your data won't update when params change.
- A careless reuse strategy causes memory leaks (components stored but never restored) and stale state on screen.
- \`shouldReuseRoute\` compares the \`future\` and \`curr\` snapshots — the basis of the default reuse behavior.

## 🎯 Key takeaways

- \`CanDeactivate\` is a guard before leaving; return \`false\`/\`UrlTree\` to cancel or redirect navigation.
- \`RouteReuseStrategy\` decides whether to recreate a component or keep it (detach/store/retrieve).
- On reuse \`ngOnInit\` doesn't fire again — listen to \`paramMap\` rather than reading the snapshot once.`,
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
      ru: `## 🧩 Простыми словами

Представь, что всё приложение — это один огромный чемодан, который пользователь скачивает при первом заходе. Чем он больше, тем дольше грузится старт. Code splitting разрезает чемодан на части: сначала грузим только нужное для первой страницы, а раздел «Админка» скачаем лениво, лишь когда пользователь туда зайдёт. Preloading — умный ход: пока пользователь смотрит первую страницу, мы **в фоне** тихонько докачиваем остальные части, чтобы переход был мгновенным.

### Code splitting на уровне роутов

\`loadComponent\`/\`loadChildren\` с динамическим \`import()\` создают **отдельные чанки** (файлы), которые грузятся лениво — только при переходе на маршрут. Это уменьшает initial bundle (то, что качается при старте).

\`\`\`ts
{
  path: 'admin',
  loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent),
}
\`\`\`

Минус ленивой загрузки: при **первом** переходе пользователь ждёт сетевой запрос чанка — короткая заминка.

### Preloading — фоновая докачка

Preloading решает этот минус: он грузит ленивые чанки **в фоне** уже после старта приложения, не блокируя его. Настраивается во \`provideRouter\`:

- \`withPreloading(PreloadAllModules)\` — грузит в фоне **все** ленивые маршруты. Просто, но качает лишнее (даже то, куда пользователь не зайдёт).
- \`NoPreloading\` (по умолчанию) — ничего не предзагружается.
- **Кастомная стратегия** — точечно: например, по флагу \`data: { preload: true }\` или в зависимости от скорости сети.

\`\`\`ts
@Injectable()
export class SelectivePreload implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>) {
    return route.data?.['preload'] ? load() : of(null);
  }
}
provideRouter(routes, withPreloading(SelectivePreload))
\`\`\`

Здесь метод \`preload\` для каждого роута решает: если стоит флаг — вызываем \`load()\` (качаем сейчас), иначе \`of(null)\` (пропускаем).

\`\`\`ts
bootstrapApplication(App, {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
// route: { path: 'reports', loadChildren: () => import('./reports.routes') }
\`\`\`

## ⚠️ Подводные камни

- Preloading стартует, когда приложение **стабильно** (после первого рендера), чтобы не конкурировать за пропускную способность с критичными для старта ресурсами.
- Можно учитывать \`navigator.connection\` (Network Information API) и не предзагружать на медленном или нестабильном («lie-fi») соединении.
- \`@defer\` и preloading решают **разные** задачи: \`@defer\` — про ленивую загрузку **частей шаблона**, preloading — про **роуты**; их часто комбинируют.
- В сочетании с SSR ленивые роуты влияют на границы гидратации (hydration boundaries).

## 🎯 Запомни

- Code splitting (\`loadComponent\`/\`loadChildren\` + \`import()\`) режет бандл на ленивые чанки — меньше initial bundle.
- Preloading докачивает чанки в фоне, убирая заминку при первом переходе.
- \`PreloadAllModules\` — просто, но грузит всё; кастомная \`PreloadingStrategy\` — точечно и умнее.`,
      en: `## 🧩 In plain words

Imagine the whole app is one giant suitcase the user downloads on first visit. The bigger it is, the slower the startup. Code splitting cuts the suitcase into parts: first we load only what the landing page needs, and the "Admin" section we download lazily, only when the user goes there. Preloading is the clever move: while the user looks at the first page, we quietly download the remaining parts **in the background**, so the next navigation feels instant.

### Route-level code splitting

\`loadComponent\`/\`loadChildren\` with a dynamic \`import()\` create **separate chunks** (files) loaded lazily — only when navigating to the route. This shrinks the initial bundle (what gets downloaded at startup).

\`\`\`ts
{
  path: 'admin',
  loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent),
}
\`\`\`

The downside of lazy loading: on the **first** navigation the user waits for the chunk's network request — a short hiccup.

### Preloading — background download

Preloading addresses this: it loads lazy chunks **in the background** after app start, without blocking it. Configured in \`provideRouter\`:

- \`withPreloading(PreloadAllModules)\` — loads **all** lazy routes in the background. Simple, but fetches too much (even routes the user never visits).
- \`NoPreloading\` (default) — nothing is preloaded.
- A **custom strategy** — selectively: e.g. by a \`data: { preload: true }\` flag or depending on network speed.

\`\`\`ts
@Injectable()
export class SelectivePreload implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>) {
    return route.data?.['preload'] ? load() : of(null);
  }
}
provideRouter(routes, withPreloading(SelectivePreload))
\`\`\`

Here the \`preload\` method decides per route: if the flag is set we call \`load()\` (fetch now), otherwise \`of(null)\` (skip it).

\`\`\`ts
bootstrapApplication(App, {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
// route: { path: 'reports', loadChildren: () => import('./reports.routes') }
\`\`\`

## ⚠️ Common pitfalls

- Preloading starts once the app is **stable** (after the first render) so it doesn't compete for bandwidth with resources critical to startup.
- You can consider \`navigator.connection\` (Network Information API) and skip preloading on slow or unstable ("lie-fi") connections.
- \`@defer\` and preloading solve **different** problems: \`@defer\` is about lazily loading **template parts**, preloading is about **routes**; they're often combined.
- Combined with SSR, lazy routes affect hydration boundaries.

## 🎯 Key takeaways

- Code splitting (\`loadComponent\`/\`loadChildren\` + \`import()\`) cuts the bundle into lazy chunks — smaller initial bundle.
- Preloading fetches chunks in the background, removing the hiccup on the first navigation.
- \`PreloadAllModules\` is simple but loads everything; a custom \`PreloadingStrategy\` is selective and smarter.`,
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
      ru: `## 🧩 Простыми словами

Пайп (pipe) в Angular — это маленький преобразователь данных в шаблоне: \`{{ price | currency }}\`. Есть два типа. «Чистый» пайп — как калькулятор с памятью: если ты дал те же числа, что и в прошлый раз, он не считает заново, а сразу отдаёт запомненный ответ (это и есть мемоизация). «Нечистый» пайп памяти не доверяет и пересчитывает **каждый раз**. \`async\` — особый нечистый пайп: он сам подписывается на поток данных и сам отписывается, избавляя вас от ручной рутины.

### Чистые пайпы и мемоизация

По умолчанию пайп **pure** (чистый). Его метод \`transform\` вызывается **только** когда меняется ссылка на входной аргумент (или сам binding пайпа). Angular кэширует последний результат: если входы те же — \`transform\` не вызывается, возвращается прежнее значение. Это мемоизация (запоминание результата) на уровне change detection, которая делает пайпы дешёвыми.

Важное следствие: если мутировать массив без создания новой ссылки (\`arr.push(x)\`), pure-пайп **не** обновится — Angular видит «та же ссылка» и пропускает пересчёт. Нужна новая ссылка (\`arr = [...arr, x]\`).

### Нечистые пайпы

\`pure: false\` отключает мемоизацию: \`transform\` вызывается **на каждом** проходе change detection. Это нужно пайпам, которые зависят от внутреннего состояния или времени: \`async\`, \`json\` (для отладки), кастомный фильтр по мутируемому массиву. Цена — частые вызовы, поэтому \`transform\` должен быть лёгким, иначе он бьёт по производительности.

\`\`\`ts
@Pipe({ name: 'filter', pure: false }) // impure: выполняется на каждом проходе CD
export class FilterPipe implements PipeTransform {
  transform(items: Item[], term: string): Item[] {
    return items.filter(i => i.name.includes(term)); // держите это дешёвым!
  }
}
\`\`\`

### Как устроен AsyncPipe

\`AsyncPipe\` — это нечистый пайп с внутренним состоянием. Пошагово:

1. При первом \`transform(obs$)\` он **подписывается** на Observable/Promise и запоминает ссылку на источник.
2. На каждое новое значение колбэк вызывает \`ChangeDetectorRef.markForCheck()\` — помечает view «грязным», чтобы Angular его перерисовал (критично для стратегии OnPush и zoneless-режима), и сохраняет последнее значение.
3. Сам \`transform\` возвращает закэшированное последнее значение. Вызывается он часто (пайп же impure), но реальная работа происходит только при новом emit.
4. Если ссылка на источник **сменилась** (вы подставили другой Observable), пайп **отписывается** от старого и подписывается на новый.
5. В \`ngOnDestroy\` пайпа подписка закрывается — **автоматическая отписка** без утечек памяти.

\`\`\`html
@if (user$ | async; as user) { {{ user.name }} }
\`\`\`

Здесь \`as user\` сохраняет значение в переменную, чтобы использовать его несколько раз без повторных подписок.

## ⚠️ Подводные камни

- \`async\` избавляет от ручных \`subscribe\`/\`unsubscribe\` и корректно работает с OnPush через \`markForCheck\`.
- Несколько \`| async\` на **один и тот же** поток создают **несколько подписок** (несколько запросов!) — выносите значение в \`as\`-переменную.
- В мире сигналов \`toSignal(obs$)\` — более идиоматичная альтернатива \`async\`.

## 🎯 Запомни

- Pure-пайп пересчитывается только при смене **ссылки** на вход — отсюда мемоизация и требование иммутабельности.
- Impure-пайп (\`pure: false\`) считает на каждом CD — держите \`transform\` лёгким.
- \`AsyncPipe\` — нечистый пайп, который сам подписывается, дёргает \`markForCheck\` на emit и автоматически отписывается в \`ngOnDestroy\`.`,
      en: `## 🧩 In plain words

A pipe in Angular is a small data transformer in the template: \`{{ price | currency }}\`. There are two kinds. A "pure" pipe is like a calculator with memory: if you feed it the same numbers as last time, it doesn't recompute — it hands back the remembered answer (that's memoization). An "impure" pipe trusts no memory and recomputes **every time**. \`async\` is a special impure pipe: it subscribes to a data stream and unsubscribes for you, sparing you the manual chore.

### Pure pipes and memoization

By default a pipe is **pure**. Its \`transform\` method is called **only** when the reference of an input argument changes (or the pipe binding itself). Angular caches the last result: if the inputs are the same, \`transform\` isn't called and the previous value is returned. This is memoization (caching the result) at the change-detection level, which makes pipes cheap.

Important consequence: if you mutate an array without creating a new reference (\`arr.push(x)\`), a pure pipe does **not** update — Angular sees "same reference" and skips the recompute. You need a new reference (\`arr = [...arr, x]\`).

### Impure pipes

\`pure: false\` disables memoization: \`transform\` is called on **every** change-detection pass. This is needed for pipes that depend on internal state or time: \`async\`, \`json\` (for debugging), a custom filter over a mutated array. The cost is frequent calls, so \`transform\` must be lightweight or it hurts performance.

\`\`\`ts
@Pipe({ name: 'filter', pure: false }) // impure: runs every CD pass
export class FilterPipe implements PipeTransform {
  transform(items: Item[], term: string): Item[] {
    return items.filter(i => i.name.includes(term)); // keep this cheap!
  }
}
\`\`\`

### How AsyncPipe works

\`AsyncPipe\` is an impure pipe with internal state. Step by step:

1. On the first \`transform(obs$)\` it **subscribes** to the Observable/Promise and remembers the source reference.
2. On each new value the callback calls \`ChangeDetectorRef.markForCheck()\` — marks the view "dirty" so Angular re-renders it (crucial for the OnPush strategy and zoneless mode), and stores the latest value.
3. \`transform\` itself returns the cached latest value. It's called often (the pipe is impure), but real work happens only on a new emit.
4. If the source reference **changes** (you swapped in a different Observable), the pipe **unsubscribes** from the old one and subscribes to the new one.
5. In the pipe's \`ngOnDestroy\` the subscription is closed — **automatic unsubscription** without memory leaks.

\`\`\`html
@if (user$ | async; as user) { {{ user.name }} }
\`\`\`

Here \`as user\` stores the value in a variable so you can use it several times without extra subscriptions.

## ⚠️ Common pitfalls

- \`async\` removes manual \`subscribe\`/\`unsubscribe\` and works correctly with OnPush via \`markForCheck\`.
- Multiple \`| async\` on the **same** stream create **multiple subscriptions** (multiple requests!) — extract the value into an \`as\` variable.
- In the signals world \`toSignal(obs$)\` is a more idiomatic alternative to \`async\`.

## 🎯 Key takeaways

- A pure pipe recomputes only when the input **reference** changes — hence the memoization and the immutability requirement.
- An impure pipe (\`pure: false\`) computes on every CD pass — keep \`transform\` lightweight.
- \`AsyncPipe\` is an impure pipe that subscribes itself, calls \`markForCheck\` on emit, and auto-unsubscribes in \`ngOnDestroy\`.`,
    },
    codeSnippet: `@Pipe({ name: 'filter', pure: false }) // impure: runs every CD pass
export class FilterPipe implements PipeTransform {
  transform(items: Item[], term: string): Item[] {
    return items.filter(i => i.name.includes(term)); // keep this cheap!
  }
}`,
  },
];
