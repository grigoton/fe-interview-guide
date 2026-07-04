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
