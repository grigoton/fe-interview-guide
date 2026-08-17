import { InterviewQuestion } from '../interfaces/question.interface';

export const ANGULAR_CORE_QUESTIONS_MORE: InterviewQuestion[] = [
  {
    id: 'ng-037',
    category: 'network-browser',
    level: 'Hard',
    tags: ['http', 'interceptors', 'functional'],
    question: {
      ru: 'Как работают функциональные HTTP-интерсепторы и как на них построить auth, retry и кэширование?',
      en: 'How do functional HTTP interceptors work, and how do you build auth, retry and caching with them?',
    },
    answer: {
      ru: `## Коротко

Интерсептор — это **функция-посредник**, через которую проходит каждый HTTP-запрос по пути «наружу» и каждый ответ по пути «обратно». С Angular 15 это обычная функция типа \`HttpInterceptorFn\`, а не класс с DI через конструктор.

Аналогия: посылка едет по конвейеру мимо нескольких столов. За первым столом наклеивают пропуск (токен), за вторым смотрят, нет ли такой же посылки на складе (кэш), за третьим ведут журнал. Ответ едет назад по тем же столам, но в **обратном** порядке.

## Как это работает по шагам

1. Регистрируем список функций: \`provideHttpClient(withInterceptors([authInterceptor, retryInterceptor, cacheInterceptor]))\`.
2. Каждая функция получает два аргумента: \`req\` — сам запрос, и \`next\` — «следующий стол» в цепочке.
3. Запрос **иммутабелен**: поменять заголовок «на месте» нельзя, делаем копию — \`req.clone({ setHeaders: ... })\`.
4. Возвращаем \`next(newReq)\`. Это \`Observable\` ответа — на него можно навесить любые RxJS-операторы.
5. Запросы проходят цепочку **сверху вниз**, в порядке регистрации; ответы возвращаются **снизу вверх**.
6. Внутри функции работает \`inject()\`: она вызывается в injection-контексте, поэтому сервисы берём без конструктора.

## Пример

\`\`\`ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: 'Bearer ' + token } })
    : req;
  return next(authReq);
};
\`\`\`

Почему так: мы не мутируем \`req\`, а создаём его копию с новым заголовком и отдаём дальше через \`next\`. Если токена нет — просто пропускаем оригинал, ничего не ломая.

## Retry и кэш на том же механизме

Retry — это просто оператор на потоке ответа. \`retry\` с функцией \`delay\` даёт экспоненциальный backoff (0.3с, 0.6с, 1.2с):

\`\`\`ts
export const retryInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(retry({ count: 3, delay: (_, i) => timer(2 ** i * 300) }));
\`\`\`

Кэш — это \`Map<url, HttpResponse>\` (обычно живёт в сервисе). Для GET: если ответ уже лежит в мапе, возвращаем \`of(cached)\` и \`next\` **вообще не вызываем** — запрос в сеть не уходит. Иначе пропускаем дальше и кладём ответ в мапу через \`tap\`.

## Что сказать на собеседовании

> Начиная с Angular 15 интерсепторы — это функции типа \`HttpInterceptorFn\`, которые регистрируются в \`provideHttpClient(withInterceptors([...]))\`. Функция получает иммутабельный \`HttpRequest\` и \`next\`, поэтому для изменения запроса делаем \`req.clone()\`, а результат \`next(req)\` — это Observable, на который можно навесить RxJS-операторы. Запросы идут по цепочке в порядке регистрации, ответы — в обратном. На этом строятся auth, retry через \`retry({ count, delay })\` и централизованная обработка 401. Внутри работает \`inject()\`, потому что функция выполняется в injection-контексте; старые классовые \`HTTP_INTERCEPTORS\` подключаются рядом через \`withInterceptorsFromDi()\`.

## Ловушки

- **Забыть \`clone()\`** и попытаться сделать \`req.headers.set(...)\` «на месте» — заголовки иммутабельны, изменение молча потеряется.
- **Порядок регистрации**: интерсептор, стоящий после кэша, не увидит запрос, который кэш «закоротил» через \`of(cached)\`.
- Спросят: **как ужиться со старыми классовыми интерсепторами** — ответ \`withInterceptorsFromDi()\`.
- **Retry на не-идемпотентных запросах** (POST/PATCH) создаёт дубли — ограничивайте по методу и статусу.
- **Кэш без инвалидации** — классический баг: после POST/PUT нужно чистить соответствующие ключи.
- 401 ловим через \`catchError\` внутри интерсептора, но **осторожно с бесконечным циклом**: refresh-запрос сам пройдёт через этот же интерсептор.`,
      en: `## In short

An interceptor is a **middleman function** that every HTTP request passes through on its way out, and every response passes through on its way back. Since Angular 15 it is a plain function of type \`HttpInterceptorFn\`, not a class with constructor DI.

Analogy: a parcel travels along a conveyor past several desks. At the first desk they stick on a pass (the token), at the second they check whether the same parcel is already in the warehouse (cache), at the third they write it into a log. The response travels back past the same desks in **reverse** order.

## How it works, step by step

1. You register a list of functions: \`provideHttpClient(withInterceptors([authInterceptor, retryInterceptor, cacheInterceptor]))\`.
2. Each function gets two arguments: \`req\` — the request itself, and \`next\` — the "next desk" in the chain.
3. The request is **immutable**: you cannot change a header in place, you make a copy — \`req.clone({ setHeaders: ... })\`.
4. You return \`next(newReq)\`. That is an \`Observable\` of the response — you can pipe any RxJS operators onto it.
5. Requests travel the chain **top-down**, in registration order; responses come back **bottom-up**.
6. \`inject()\` works inside the function: it runs in an injection context, so you grab services without a constructor.

## Example

\`\`\`ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: 'Bearer ' + token } })
    : req;
  return next(authReq);
};
\`\`\`

Why it looks like this: we never mutate \`req\`, we create a copy with the new header and hand it on via \`next\`. If there is no token we simply pass the original through, breaking nothing.

## Retry and caching on the same mechanism

Retry is just an operator on the response stream. \`retry\` with a \`delay\` function gives exponential backoff (0.3s, 0.6s, 1.2s):

\`\`\`ts
export const retryInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(retry({ count: 3, delay: (_, i) => timer(2 ** i * 300) }));
\`\`\`

Caching is a \`Map<url, HttpResponse>\` (usually living in a service). For GETs: if the response is already in the map, return \`of(cached)\` and **never call** \`next\` — no network request goes out. Otherwise pass through and store the response via \`tap\`.

## What to say in the interview

> Since Angular 15 interceptors are functions of type \`HttpInterceptorFn\` registered in \`provideHttpClient(withInterceptors([...]))\`. The function receives an immutable \`HttpRequest\` and a \`next\` handler, so to modify the request you call \`req.clone()\`, and the result of \`next(req)\` is an Observable you can pipe RxJS operators onto. Requests travel the chain in registration order and responses come back in reverse, which is why auth goes first and logging last. On this you build auth (attaching the token), retry with exponential backoff via \`retry({ count, delay })\`, caching (returning \`of(cached)\` for GETs instead of calling \`next\`) and centralized 401 handling with a redirect to login. \`inject()\` works inside because the function runs in an injection context; legacy class-based \`HTTP_INTERCEPTORS\` are plugged in alongside via \`withInterceptorsFromDi()\`. The functional style is easier to test and it is tree-shakeable.

## Gotchas

- **Forgetting \`clone()\`** and trying \`req.headers.set(...)\` in place — headers are immutable, the change is silently lost.
- **Registration order**: an interceptor placed after the cache never sees a request the cache short-circuited with \`of(cached)\`.
- They will ask **how this coexists with legacy class interceptors** — the answer is \`withInterceptorsFromDi()\`.
- **Retrying non-idempotent requests** (POST/PATCH) creates duplicates — restrict by method and status.
- **A cache with no invalidation** is the classic bug: after a POST/PUT you must evict the matching keys.
- Catch 401 with \`catchError\` inside the interceptor, but **beware of an infinite loop**: the refresh request goes through the very same interceptor.`,
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
    category: 'angular-signals',
    level: 'Hard',
    tags: ['error-handling', 'error-handler', 'global'],
    question: {
      ru: 'Как организовать глобальную обработку ошибок через ErrorHandler и чем она отличается от перехвата в HTTP?',
      en: 'How do you set up global error handling via ErrorHandler, and how does it differ from HTTP-level handling?',
    },
    answer: {
      ru: `## Коротко

\`ErrorHandler\` — это **один общий приёмник всех необработанных ошибок** приложения. Всё, что «упало» и никем не поймано — исключение в lifecycle-хуке, в обработчике клика, в асинхронном коде внутри зоны — прилетает в его метод \`handleError\`. По умолчанию он просто делает \`console.error\`; подменив его, вы централизуете логирование (Sentry и т.п.).

Аналогия: **сетка под цирковым батутом**. Акробат (ваш код) должен приземляться сам; но если сорвался — ловит сетка. HTTP-обработка — это, наоборот, страховочный трос на конкретном трюке: она ловит только падения одного вида.

## Как это работает по шагам

1. Angular по умолчанию регистрирует свой \`ErrorHandler\` в корневом инжекторе.
2. Вы пишете свой класс с методом \`handleError(error: unknown)\` и подменяете токен: \`{ provide: ErrorHandler, useClass: GlobalErrorHandler }\`.
3. Любая ошибка, которую не поймали локально (\`try/catch\`, \`catchError\`), всплывает до Angular — и он зовёт ваш \`handleError\`.
4. Внутри вы решаете, что делать: залогировать во внешний сервис, показать пользователю тост, при желании — увести на страницу ошибки.
5. \`handleError\` выполняется **внутри** Angular-зоны, поэтому навигация и обновление UI прямо из него работают.

## Пример

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

Почему так: сначала нормализуем «что угодно» в понятный объект (в \`handleError\` может прилететь строка или что угодно, тип — \`unknown\`), потом одним местом говорим пользователю и одним местом пишем в лог.

## Чем отличается от перехвата в HTTP

- **HTTP-интерсептор / \`catchError\`** ловит **только сетевые** ошибки: статусы 4xx/5xx, таймауты. Именно здесь место для retry, обновления токена, маппинга ответа сервера в доменные ошибки. Это «локальный», осмысленный уровень.
- **\`ErrorHandler\`** ловит **всё остальное**: \`TypeError\`, ошибки рендеринга, неперехваченные \`throw\`. Это последний рубеж, и там вы уже не «чините», а фиксируете факт.
- Практика: чинить и уточнять — в интерсепторе, логировать и показывать общий тост — в \`ErrorHandler\`. Иначе одна и та же ошибка покажется пользователю дважды.

## Что сказать на собеседовании

> \`ErrorHandler\` — это DI-токен и единая точка входа для всех необработанных ошибок: исключений в lifecycle-хуках, обработчиках событий и асинхронном коде внутри зоны. Дефолтная реализация пишет в \`console.error\`, а мы подменяем её своим классом через \`{ provide: ErrorHandler, useClass: ... }\` и заводим туда Sentry. Важно разделять уровни: HTTP-интерсептор и \`catchError\` отвечают за сетевые ошибки, а \`ErrorHandler\` — последний рубеж для всего остального, включая \`TypeError\` и ошибки рендеринга. Промисы, отклонённые вне зоны, до него не долетают, поэтому дополнительно вешаем \`window.onunhandledrejection\`.

## Ловушки

- **Ошибка внутри \`handleError\`** порождает новую ошибку → бесконечный цикл. Оборачивайте тело в \`try/catch\`.
- **Двойное уведомление**: интерсептор уже показал тост про 500, и \`ErrorHandler\` показывает свой. Договоритесь, кто «главный» по HTTP.
- **Промисы вне зоны** (\`.then\` из стороннего SDK) могут не дойти — нужен глобальный \`window.onunhandledrejection\`.
- **Молчаливое проглатывание**: пустой \`catchError(() => EMPTY)\` убивает и ошибку, и возможность её найти. Всегда логируйте.
- **SSR**: на сервере нет \`window\`, \`localStorage\` и UI-уведомлений — нужна отдельная реализация.
- Спросят про **zoneless**: ответ — ничего не меняется, ошибки из CD и \`effect\` по-прежнему попадают в \`ErrorHandler\`.`,
      en: `## In short

\`ErrorHandler\` is **one shared sink for every unhandled error** in the app. Anything that blew up and nobody caught — an exception in a lifecycle hook, in a click handler, in async code inside the zone — lands in its \`handleError\` method. By default it just does \`console.error\`; by swapping it out you centralize logging (Sentry, etc.).

Analogy: **the safety net under a circus trapeze**. The acrobat (your code) is supposed to land on their own; if they slip, the net catches them. HTTP handling is the opposite — a safety rope on one specific trick, catching only one kind of fall.

## How it works, step by step

1. Angular registers its own \`ErrorHandler\` in the root injector by default.
2. You write your own class with a \`handleError(error: unknown)\` method and override the token: \`{ provide: ErrorHandler, useClass: GlobalErrorHandler }\`.
3. Any error not caught locally (\`try/catch\`, \`catchError\`) bubbles up to Angular, and Angular calls your \`handleError\`.
4. Inside you decide what to do: log to an external service, show the user a toast, optionally navigate to an error page.
5. \`handleError\` runs **inside** the Angular zone, so navigating and updating the UI straight from it works.

## Example

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

Why it looks like this: first we normalize "whatever came in" into a sane object (the parameter is \`unknown\` — a plain string can arrive), then we tell the user in one place and write to the log in one place.

## How it differs from HTTP-level handling

- An **HTTP interceptor / \`catchError\`** catches **network errors only**: 4xx/5xx statuses, timeouts. That is where retry, token refresh and mapping server responses to domain errors belong. It is the local, meaningful layer.
- \`ErrorHandler\` catches **everything else**: \`TypeError\`, render errors, uncaught \`throw\`. It is the last line of defence, where you no longer "fix" anything — you record the fact.
- Rule of thumb: fix and enrich in the interceptor, log and show a generic toast in \`ErrorHandler\`. Otherwise the same failure is reported to the user twice.

## What to say in the interview

> \`ErrorHandler\` is a DI token and the single entry point for all unhandled errors: exceptions in lifecycle hooks, event handlers and async code inside the zone. The default implementation writes to \`console.error\`; we replace it with our own class via \`{ provide: ErrorHandler, useClass: ... }\` and wire Sentry plus one user-facing notification there. It matters to separate the layers: the HTTP interceptor and \`catchError\` own network errors — retry, token refresh, mapping 4xx/5xx to domain errors; \`ErrorHandler\` is the last line of defence for everything else, including \`TypeError\` and render errors. It runs inside the Angular zone, so you can navigate and update the UI from it, but you must guard against throwing inside the handler itself — that loops. In zoneless mode the behaviour is the same: errors from change detection and effects still reach \`ErrorHandler\`. Promises rejected outside the zone never get there, so we also attach \`window.onunhandledrejection\`, and for SSR we keep a separate strategy because there is no \`window\` and no toasts on the server.

## Gotchas

- **Throwing inside \`handleError\`** produces a new error → infinite loop. Wrap the body in \`try/catch\`.
- **Double notification**: the interceptor already showed a toast for the 500 and \`ErrorHandler\` shows another. Decide who owns HTTP.
- **Promises outside the zone** (a \`.then\` from a third-party SDK) may not arrive — you need a global \`window.onunhandledrejection\`.
- **Silent swallowing**: an empty \`catchError(() => EMPTY)\` kills both the error and any chance of finding it. Always log.
- **SSR**: no \`window\`, no \`localStorage\`, no UI notifications on the server — you need a separate implementation.
- They will ask about **zoneless**: the answer is that nothing changes, errors from CD and \`effect\` still reach \`ErrorHandler\`.`,
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
    category: 'angular-signals',
    level: 'Medium',
    tags: ['app-initializer', 'bootstrap', 'startup'],
    question: {
      ru: 'Зачем нужен APP_INITIALIZER / provideAppInitializer и как он влияет на старт приложения?',
      en: 'What is APP_INITIALIZER / provideAppInitializer for, and how does it affect app startup?',
    },
    answer: {
      ru: `## Коротко

Это **hook «сделай до открытия»**: код, который Angular выполняет **до** рендера корневого компонента. Если функция вернула \`Promise\` или \`Observable\`, Angular **дождётся** его — и только потом покажет UI.

Аналогия: магазин перед открытием. Пока двери закрыты, вы включаете свет, кладёте в кассу разменные деньги и вешаете актуальный ценник. Покупателей (UI) пускаете только после этого. Загрузка runtime-конфига, фиче-флагов, локали, проверка сессии — это ровно тот самый «ценник».

## Как это работает по шагам

1. Регистрируете инициализатор в провайдерах: современно — \`provideAppInitializer(fn)\`, по-старому — multi-провайдер \`APP_INITIALIZER\`.
2. На бутстрапе Angular собирает **все** зарегистрированные инициализаторы (это multi-токен — их может быть много).
3. Запускает их **параллельно**, а не по очереди.
4. Ждёт, пока разрешатся **все** возвращённые \`Promise\`/\`Observable\`.
5. Только после этого создаёт и рендерит корневой компонент.
6. Если хоть один зареджектился — **бутстрап прерывается**, приложение вообще не стартует.

## Пример

\`\`\`ts
// современно: Angular 19+
provideAppInitializer(() => {
  const config = inject(ConfigService);
  return config.load();
});

// как это выглядело раньше — тот же смысл, больше боилерплейта
{
  provide: APP_INITIALIZER,
  multi: true,
  useFactory: (config: ConfigService) => () => config.load(),
  deps: [ConfigService],
}
\`\`\`

Почему так: \`provideAppInitializer\` — просто функция, внутри которой работает \`inject()\`, поэтому не нужны ни \`multi: true\`, ни ручной список \`deps\`. Старую форму знать всё равно надо — в легаси-проектах она везде.

## Зачем это нужно на практике

- **Runtime-конфиг**: собранный бандл один, а адрес API у dev/stage/prod разный — тянем \`config.json\` до старта, чтобы сервисы уже читали готовые значения синхронно.
- **Фиче-флаги**: чтобы UI не «моргал», показывая сначала выключенную фичу, а потом включённую.
- **Локаль / переводы**: чтобы первый кадр был уже на нужном языке.
- **Проверка сессии**: чтобы гвард на первом роуте знал, залогинен ли пользователь.

Правило: сюда кладут только то, без чего **нельзя** показать первый экран. Всё остальное грузим уже после старта.

## Что сказать на собеседовании

> \`APP_INITIALIZER\` — это multi-токен, чьи фабрики Angular выполняет до рендера корневого компонента; если фабрика возвращает \`Promise\` или \`Observable\`, бутстрап дожидается её завершения. Все инициализаторы запускаются параллельно, и бутстрап ждёт их все, а reject любого из них прерывает старт приложения. Начиная с Angular 19 есть функциональный API \`provideAppInitializer(fn)\` — без \`multi\` и \`deps\`, с \`inject()\` внутри. Типовые задачи: загрузка runtime-конфига, фиче-флагов, проверка сессии. И помню, что долгий инициализатор напрямую отодвигает первый рендер, а в SSR он выполняется ещё и на сервере, где нет \`window\`.

## Ловушки

- **Долгий инициализатор = белый экран.** Всё, что не обязано быть готово до UI, туда класть нельзя.
- **Reject валит приложение целиком.** Оборачивайте в \`catchError\`/\`try\` и предусматривайте fallback-конфиг.
- **Не путать с \`ENVIRONMENT_INITIALIZER\`** — тот срабатывает при создании EnvironmentInjector, раньше и для каждого инжектора, и async не ждёт. Любимый уточняющий вопрос.
- **Возврат не-Promise**: если фабрика вернула \`void\`, ждать нечего — асинхронщина внутри «уплывёт» мимо бутстрапа.
- **SSR**: инициализатор отработает и на сервере; обращение к \`window\`/\`localStorage\` там упадёт.
- **Порядок между инициализаторами не гарантирован** — они параллельны; если нужен порядок, стройте цепочку внутри одного.`,
      en: `## In short

It is the **"do this before opening"** hook: code Angular runs **before** it renders the root component. If your function returns a \`Promise\` or \`Observable\`, Angular **waits** for it — and only then shows the UI.

Analogy: a shop before opening. While the doors are locked you switch on the lights, put change in the till and hang up today's price list. Customers (the UI) are let in only after that. Loading runtime config, feature flags, locale, checking the session — that is exactly the "price list".

## How it works, step by step

1. You register an initializer in providers: modern — \`provideAppInitializer(fn)\`, legacy — the \`APP_INITIALIZER\` multi-provider.
2. On bootstrap Angular collects **all** registered initializers (it is a multi-token, there can be many).
3. It runs them **in parallel**, not one after another.
4. It waits until **all** returned \`Promise\`s/\`Observable\`s settle.
5. Only then does it create and render the root component.
6. If any one of them rejects, **bootstrap aborts** — the app never starts.

## Example

\`\`\`ts
// modern: Angular 19+
provideAppInitializer(() => {
  const config = inject(ConfigService);
  return config.load();
});

// how it used to look — same meaning, more boilerplate
{
  provide: APP_INITIALIZER,
  multi: true,
  useFactory: (config: ConfigService) => () => config.load(),
  deps: [ConfigService],
}
\`\`\`

Why it looks like this: \`provideAppInitializer\` is just a function with \`inject()\` available inside, so no \`multi: true\` and no hand-written \`deps\` list. You still need to recognise the old form — legacy projects are full of it.

## Why you actually need it

- **Runtime config**: one built bundle, but different API hosts for dev/stage/prod — fetch \`config.json\` before startup so services read ready values synchronously.
- **Feature flags**: so the UI does not flicker, showing a feature off and then on.
- **Locale / translations**: so the very first frame is already in the right language.
- **Session check**: so the guard on the first route already knows whether the user is logged in.

Rule: only put in here what the first screen **cannot** be shown without. Everything else loads after startup.

## What to say in the interview

> \`APP_INITIALIZER\` is a multi-token whose factories Angular executes before rendering the root component; if a factory returns a \`Promise\` or \`Observable\`, bootstrap waits for it to settle. All initializers run in parallel and bootstrap awaits all of them, and a rejection in any one aborts app startup. Since Angular 19 there is a functional API, \`provideAppInitializer(fn)\` — no \`multi\`, no \`deps\`, with \`inject()\` available inside. Typical jobs: loading runtime config, feature flags, locale, checking the session; it is often combined with an \`InjectionToken\` factory so the rest of the app reads those values synchronously. I do not confuse it with \`ENVIRONMENT_INITIALIZER\`, which runs when each \`EnvironmentInjector\` is created — earlier in time and without awaiting async work. And I keep in mind that a slow initializer directly delays the first render, and that in SSR it also runs on the server, where there is no \`window\`.

## Gotchas

- **A slow initializer means a white screen.** Anything not required before the UI must not go in there.
- **A rejection kills the whole app.** Wrap in \`catchError\`/\`try\` and provide a fallback config.
- **Do not confuse it with \`ENVIRONMENT_INITIALIZER\`** — that fires when an EnvironmentInjector is created, earlier and per injector, and does not await async work. A favourite follow-up question.
- **Returning a non-Promise**: if the factory returns \`void\`, there is nothing to await — the async work inside floats past bootstrap.
- **SSR**: the initializer also runs on the server; touching \`window\`/\`localStorage\` there throws.
- **Order between initializers is not guaranteed** — they are parallel; if you need ordering, chain inside a single one.`,
    },
    codeSnippet: `bootstrapApplication(App, {
  providers: [
    provideAppInitializer(() => inject(ConfigService).load()),
  ],
});`,
  },
  {
    id: 'ng-040',
    category: 'angular-signals',
    level: 'Medium',
    tags: ['view-encapsulation', 'shadow-dom', 'styles'],
    question: {
      ru: 'Чем отличаются ViewEncapsulation Emulated, ShadowDom и None, и почему ::ng-deep устарел?',
      en: 'How do ViewEncapsulation Emulated, ShadowDom and None differ, and why is ::ng-deep deprecated?',
    },
    answer: {
      ru: `## Коротко

Инкапсуляция отвечает на один вопрос: **насколько стили компонента изолированы от всего остального**. Есть три уровня.

Аналогия: офис. **Emulated** — у каждого сотрудника бейдж отдела, и правила написаны как «только для тех, у кого бейдж №7»: чужие правила внутрь долетают, ваши наружу — нет. **ShadowDom** — настоящая переговорка со звукоизоляцией: ни звука наружу, ни звука внутрь. **None** — вы просто кричите на весь опенспейс, слышат все.

## Три режима

1. **Emulated (по умолчанию).** Angular **эмулирует** Shadow DOM, не используя его. При компиляции к каждому элементу компонента добавляется уникальный атрибут (\`_ngcontent-xxx\`), а все селекторы в \`styles\` переписываются с этим атрибутом. Итог: стили компонента **не протекают наружу**, но **глобальные стили просачиваются внутрь**. Работает в любом браузере, без настоящего Shadow DOM.
2. **ShadowDom.** Используется **нативный** Shadow DOM браузера — \`attachShadow\`. Полная изоляция в обе стороны: глобальные стили внутрь **не** проходят, стили компонента наружу тоже. Проекция контента идёт через нативный \`<slot>\`. Минусы: ломается стилизация снаружи (темы), \`document\`-селекторы и некоторые сторонние библиотеки перестают работать.
3. **None.** Стили компонента становятся **глобальными** — просто добавляются в \`<head>\` без всякого скоупинга. Затронуть может любой компонент в приложении. Используют осознанно: глобальные темы, ресеты, слой дизайн-системы.

## Пример

\`\`\`ts
@Component({ encapsulation: ViewEncapsulation.Emulated })
\`\`\`

Почему так: это дефолт, и в 95% случаев менять его не нужно. \`ShadowDom\` берут, когда компонент встраивается в чужую страницу (виджет), а \`None\` — когда сам компонент и есть источник глобальных стилей.

## Почему ::ng-deep устарел и чем его заменить

\`::ng-deep\` (и совсем старые \`/deep/\`, \`>>>\`) отключает скоупинг для части селектора и позволяет стилю **пробить границу** в дочерние компоненты. Он помечен **deprecated**, потому что это часть выброшенного стандарта Shadow DOM piercing — в нативном Shadow DOM он просто не работает.

Чем заменять:

- **CSS Custom Properties (переменные)** — они **наследуются** сквозь любые границы, включая Shadow DOM. Идеальный инструмент для тем: компонент объявляет \`--card-bg\`, снаружи вы его переопределяете.
- **\`::part()\` / \`::slotted()\`** — штатные способы дать доступ к внутренностям в Shadow DOM.
- **Глобальные стили** или \`encapsulation: None\` для конкретного слоя дизайн-системы.

## Что сказать на собеседовании

> \`ViewEncapsulation\` определяет, как скоупятся стили компонента. По умолчанию это \`Emulated\`: Angular не использует настоящий Shadow DOM, а добавляет элементам атрибут вида \`_ngcontent-xxx\` и переписывает селекторы — поэтому стили компонента наружу не текут, но глобальные внутрь просачиваются. \`ShadowDom\` включает нативный \`attachShadow\` и даёт полную двустороннюю изоляцию, но снаружи компонент почти невозможно затемизировать. \`None\` выкидывает стили в \`<head>\` глобально. \`::ng-deep\` устарел и в нативном режиме не работает вовсе; современная замена — CSS-переменные, которые наследуются сквозь любые границы.

## Ловушки

- **Emulated ≠ изоляция.** Частая ошибка: думать, что глобальный \`button { ... }\` не достанет внутрь компонента. Достанет.
- **\`:host\` и \`:host-context\`** работают во всех режимах — это способ стилизовать сам элемент компонента, спросят обязательно.
- **Переезд на ShadowDom ломает темы**: всё, что снаружи задавалось глобальным CSS, перестанет применяться.
- **\`::ng-deep\` без \`:host\` перед ним** делает правило фактически глобальным — утечка на всё приложение. Если уж применяете, то только как \`:host ::ng-deep .foo\`.
- **None у нескольких компонентов** — гонка за то, чей стиль загрузился последним. Отладка кошмарная.
- Спросят про **порядок**: глобальные стили из \`styles.css\` и стили компонентов конкурируют по обычным правилам специфичности, никакой магии тут нет.`,
      en: `## In short

Encapsulation answers one question: **how isolated a component's styles are from everything else**. There are three levels.

Analogy: an office. **Emulated** — everyone wears a department badge and the rules read "only for badge #7 holders": other people's rules still reach inside, yours never leave. **ShadowDom** — a real soundproofed meeting room: no sound out, no sound in. **None** — you just shout across the open-plan floor and everyone hears you.

## The three modes

1. **Emulated (default).** Angular **emulates** Shadow DOM without using it. At compile time a unique attribute (\`_ngcontent-xxx\`) is added to each component element and every selector in \`styles\` is rewritten with that attribute. Result: component styles **do not leak out**, but **global styles do seep in**. Works in any browser, no real Shadow DOM involved.
2. **ShadowDom.** Uses the browser's **native** Shadow DOM — \`attachShadow\`. Full isolation both ways: global styles do **not** get in, component styles do not get out. Content projection goes through the native \`<slot>\`. Downsides: styling from outside (theming) breaks, \`document\` selectors and some third-party libraries stop working.
3. **None.** Component styles become **global** — they are simply added to \`<head>\` with no scoping at all. Any component in the app can be affected. Use deliberately: global themes, resets, a design-system layer.

## Example

\`\`\`ts
@Component({ encapsulation: ViewEncapsulation.Emulated })
\`\`\`

Why it looks like this: it is the default and in 95% of cases you should not change it. Reach for \`ShadowDom\` when the component is embedded into someone else's page (a widget), and for \`None\` when the component itself is the source of global styles.

## Why ::ng-deep is deprecated and what replaces it

\`::ng-deep\` (and the ancient \`/deep/\`, \`>>>\`) disables scoping for part of a selector and lets a style **pierce the boundary** into child components. It is marked **deprecated** because it belongs to the removed Shadow DOM piercing spec — in native Shadow DOM it simply does not work.

What to use instead:

- **CSS Custom Properties (variables)** — they **inherit** across any boundary, Shadow DOM included. The ideal theming tool: the component declares \`--card-bg\` and you override it from outside.
- **\`::part()\` / \`::slotted()\`** — the sanctioned ways to expose internals in Shadow DOM.
- **Global styles** or \`encapsulation: None\` for one specific design-system layer.

## What to say in the interview

> \`ViewEncapsulation\` decides how a component's styles are scoped. The default is \`Emulated\`: Angular does not use real Shadow DOM but at compile time stamps elements with an attribute like \`_ngcontent-xxx\` and rewrites the selectors — so component styles never leak out, while global styles do seep in. \`ShadowDom\` turns on native \`attachShadow\` and gives full two-way isolation with projection through \`<slot>\`, at the price of the component being nearly impossible to theme from outside and \`document\` selectors plus some third-party libraries breaking. \`None\` dumps the styles into \`<head>\` globally — only deliberately, for resets and themes. \`::ng-deep\` along with the old \`/deep/\` and \`>>>\` is deprecated because it is a leftover of a piercing capability removed from the spec, and in native Shadow DOM it does not work at all; the modern replacement is CSS custom properties, which inherit across any boundary, plus \`::part()\` and \`::slotted()\`.

## Gotchas

- **Emulated is not isolation.** A common mistake is assuming a global \`button { ... }\` cannot reach inside a component. It can.
- **\`:host\` and \`:host-context\`** work in every mode — they are how you style the component's own element, and you will be asked about them.
- **Switching to ShadowDom breaks theming**: everything previously set by global CSS from outside stops applying.
- **\`::ng-deep\` without a leading \`:host\`** makes the rule effectively global — a leak across the whole app. If you must use it, write \`:host ::ng-deep .foo\`.
- **\`None\` on several components** turns into a race over whose stylesheet loaded last. Debugging is miserable.
- They will ask about **ordering**: global styles from \`styles.css\` and component styles compete by ordinary specificity rules — there is no magic here.`,
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
    category: 'network-browser',
    level: 'Hard',
    tags: ['renderer2', 'dom-sanitizer', 'security', 'xss'],
    question: {
      ru: 'Зачем использовать Renderer2 и как DomSanitizer защищает от XSS?',
      en: 'Why use Renderer2, and how does DomSanitizer protect against XSS?',
    },
    answer: {
      ru: `## Коротко

Здесь два разных механизма, и оба про «не трогай DOM напрямую».

\`Renderer2\` — **переводчик между вашим кодом и платформой**. Вы говорите «добавь класс», а он сам решает, как это сделать: в браузере, на сервере при SSR (где \`document\` вообще нет) или в Web Worker.

\`DomSanitizer\` — **таможенник на границе шаблона**. Всё, что вы вставляете в разметку, он досматривает и вырезает опасное. \`bypassSecurityTrust*\` — это дипломатический паспорт: проносишь без досмотра, но и отвечаешь сам.

## Как это работает по шагам

1. Значение попадает в шаблон — через интерполяцию \`{{ x }}\` или property-биндинг \`[innerHTML]\`, \`[src]\`, \`[style]\`.
2. Angular определяет **контекст безопасности**: HTML, STYLE, URL или RESOURCE_URL — каждый со своими правилами.
3. Для интерполяции \`{{ }}\` значение просто **экранируется как текст**: теги не станут тегами. Поэтому \`{{ userInput }}\` безопасен по определению.
4. Для \`[innerHTML]\` включается санитайзер контекста HTML: \`<script>\`, \`onerror\`, \`javascript:\`-ссылки **вырезаются**, безопасная разметка остаётся.
5. Если вы **точно** знаете, что HTML доверенный, вы явно помечаете его через \`DomSanitizer.bypassSecurityTrustHtml()\` — Angular получает специальный объект и досмотр пропускает.
6. Для RESOURCE_URL (\`<iframe src>\`, \`<script src>\`) санитизации **не существует** в принципе: Angular либо принимает значение, либо требует bypass — потому что «частично безопасного» url для исполняемого ресурса не бывает.

## Пример

\`\`\`ts
// Renderer2: платформенно-независимая работа с элементом
const r = inject(Renderer2);
r.setAttribute(el, 'aria-hidden', 'true');
r.addClass(el, 'active');
const unlisten = r.listen(el, 'click', () => {});

// DomSanitizer: осознанный обход санитизации
const safe = inject(DomSanitizer).bypassSecurityTrustHtml(html);
// [innerHTML]="safe"
\`\`\`

Почему так: \`r.listen\` возвращает функцию отписки — её надо вызвать при уничтожении, иначе утечка. А \`bypassSecurityTrustHtml\` применяем **только** к строке, которую сформировали мы сами, а не пользователь; иначе вы своими руками открываете XSS.

## Зачем Renderer2, а не прямой доступ к DOM

- **SSR**: на сервере нет \`document\` — прямой \`nativeElement.innerHTML = ...\` там просто упадёт или отработает не так.
- **Другие платформы**: Web Worker, будущие рендер-движки — \`Renderer2\` абстрагирует их все.
- **Безопасность**: прямой \`innerHTML\` идёт мимо санитайзера — это готовая XSS-дыра.
- **Совместимость с анимациями** Angular и с внутренним учётом элементов.

Прямой \`nativeElement.innerHTML = ...\` — классический антипаттерн: ломает SSR и открывает XSS одновременно.

## Что сказать на собеседовании

> \`Renderer2\` — абстракция над DOM: менять элементы, не обращаясь к \`document\` напрямую — \`setAttribute\`, \`addClass\`, \`setStyle\`. Она нужна ради платформенной независимости — SSR, где нет \`document\`. Прямая запись в \`nativeElement.innerHTML\` — антипаттерн: ломает SSR и обходит санитизацию. Angular по умолчанию контекстно санитизирует интерполяции и property-биндинги — контексты HTML, STYLE, URL и RESOURCE_URL. Интерполяция экранирует текст, поэтому \`{{ userInput }}\` безопасен, а \`[innerHTML]\` проходит через \`SecurityContext.HTML\`. Для доверенного контента есть \`DomSanitizer.bypassSecurityTrust*\` — escape hatch для значений, которые не приходят от пользователя.

## Ловушки

- **\`bypassSecurityTrustHtml(userInput)\`** — это и есть XSS. Самая частая ошибка на код-ревью.
- **Интерполяция vs \`[innerHTML]\`**: \`{{ }}\` экранирует и всегда безопасна, \`[innerHTML]\` санитизирует, но всё же вставляет разметку. Спросят разницу.
- **RESOURCE_URL нельзя санитизировать** — только bypass. Для \`<iframe [src]>\` придётся использовать \`bypassSecurityTrustResourceUrl\` и валидировать домен самому.
- **\`r.listen\` возвращает unlisten** — не вызвали, получили утечку слушателя.
- **Санитизация не защищает от всего**: она про DOM. SQL-инъекции, серверные шаблоны и открытые редиректы — вне её зоны.
- **Стили**: \`[style]\` со строкой из пользовательского ввода тоже опасен (\`SecurityContext.STYLE\`); безопаснее биндить конкретные свойства.
- Спросят про **Trusted Types** — это браузерный механизм CSP, который запрещает присваивать в \`innerHTML\` произвольные строки; Angular с ним совместим.`,
      en: `## In short

Two different mechanisms here, and both say "don't touch the DOM directly".

\`Renderer2\` is a **translator between your code and the platform**. You say "add a class" and it decides how: in the browser, on the server during SSR (where there is no \`document\` at all), or in a Web Worker.

\`DomSanitizer\` is **customs at the template border**. Everything you put into markup gets inspected and the dangerous parts are cut out. \`bypassSecurityTrust*\` is a diplomatic passport: you skip the check, and you carry the responsibility.

## How it works, step by step

1. A value reaches the template — via interpolation \`{{ x }}\` or a property binding like \`[innerHTML]\`, \`[src]\`, \`[style]\`.
2. Angular determines the **security context**: HTML, STYLE, URL or RESOURCE_URL — each with its own rules.
3. For interpolation \`{{ }}\` the value is simply **escaped as text**: tags never become tags. That is why \`{{ userInput }}\` is safe by definition.
4. For \`[innerHTML]\` the HTML-context sanitizer kicks in: \`<script>\`, \`onerror\`, \`javascript:\` links are **stripped**, safe markup survives.
5. If you **know for certain** the HTML is trusted, you mark it explicitly with \`DomSanitizer.bypassSecurityTrustHtml()\` — Angular receives a special wrapper object and skips the inspection.
6. For RESOURCE_URL (\`<iframe src>\`, \`<script src>\`) sanitization **does not exist** at all: Angular either accepts the value or demands a bypass — because there is no such thing as a partially safe URL for an executable resource.

## Example

\`\`\`ts
// Renderer2: platform-independent element manipulation
const r = inject(Renderer2);
r.setAttribute(el, 'aria-hidden', 'true');
r.addClass(el, 'active');
const unlisten = r.listen(el, 'click', () => {});

// DomSanitizer: a deliberate bypass of sanitization
const safe = inject(DomSanitizer).bypassSecurityTrustHtml(html);
// [innerHTML]="safe"
\`\`\`

Why it looks like this: \`r.listen\` returns an unlisten function you must call on destroy or you leak the listener. And \`bypassSecurityTrustHtml\` is applied **only** to a string you built yourself, never to user input — otherwise you are hand-crafting the XSS.

## Why Renderer2 instead of touching the DOM directly

- **SSR**: there is no \`document\` on the server — a direct \`nativeElement.innerHTML = ...\` simply throws or misbehaves.
- **Other platforms**: Web Workers, future render engines — \`Renderer2\` abstracts them all.
- **Security**: a direct \`innerHTML\` goes around the sanitizer — a ready-made XSS hole.
- **Compatibility** with Angular animations and its internal element bookkeeping.

A direct \`nativeElement.innerHTML = ...\` is the classic anti-pattern: it breaks SSR and opens XSS at the same time.

## What to say in the interview

> \`Renderer2\` is an abstraction over the DOM that lets you change elements without touching \`document\` directly: \`setAttribute\`, \`addClass\`, \`setStyle\`, \`listen\`. It exists for platform independence — SSR where \`document\` is missing, Web Workers, future renderers — and for compatibility with animations. Writing straight into \`nativeElement.innerHTML\` is an anti-pattern: it breaks SSR and bypasses sanitization. On XSS: by default Angular contextually sanitizes every interpolation and property binding across the HTML, STYLE, URL and RESOURCE_URL contexts. Interpolation escapes text, so \`{{ userInput }}\` is safe, while \`[innerHTML]\` goes through \`SecurityContext.HTML\`, where scripts and \`javascript:\` links get stripped. When you must insert known-trusted content you use \`DomSanitizer.bypassSecurityTrust*\` — an escape hatch strictly for values that do not come from users. RESOURCE_URL for \`iframe\` and \`script\` is a special case: it cannot be sanitized, only explicitly trusted. On top of that, Trusted Types at the CSP level harden things further.

## Gotchas

- **\`bypassSecurityTrustHtml(userInput)\`** is literally an XSS. The most common code-review finding.
- **Interpolation vs \`[innerHTML]\`**: \`{{ }}\` escapes and is always safe, \`[innerHTML]\` sanitizes but still inserts markup. You will be asked for the difference.
- **RESOURCE_URL cannot be sanitized** — only bypassed. For \`<iframe [src]>\` you must use \`bypassSecurityTrustResourceUrl\` and validate the domain yourself.
- **\`r.listen\` returns unlisten** — not calling it leaks the listener.
- **Sanitization is not a silver bullet**: it is about the DOM. SQL injection, server-side templates and open redirects are outside its scope.
- **Styles**: a \`[style]\` bound to a user-supplied string is dangerous too (\`SecurityContext.STYLE\`); binding individual properties is safer.
- They will ask about **Trusted Types** — a browser CSP mechanism that forbids assigning arbitrary strings to \`innerHTML\`; Angular is compatible with it.`,
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
    category: 'angular-signals',
    level: 'Medium',
    tags: ['ng-container', 'template-outlet', 'component-outlet'],
    question: {
      ru: 'Для чего нужны ng-container, ngTemplateOutlet и ngComponentOutlet?',
      en: 'What are ng-container, ngTemplateOutlet and ngComponentOutlet used for?',
    },
    answer: {
      ru: `## Коротко

Три инструмента про то, **как класть что-то в шаблон, не мусоря в DOM**.

Аналогии: \`ng-container\` — **скрепка**: держит бумаги вместе, но в готовом документе её нет. \`ngTemplateOutlet\` — **резиновый штамп**: вырезали один раз, шлёпаете где угодно и каждый раз другими чернилами (контекстом). \`ngComponentOutlet\` — **розетка**: в неё можно воткнуть любой прибор, решение принимается в рантайме.

## Из чего состоит

1. **\`ng-container\`** — логический контейнер, который **не создаёт DOM-элемент**. Нужен, чтобы навесить структурную директиву (\`*ngIf\`, \`*ngFor\`) или сгруппировать узлы без лишнего \`<div>\`. Особенно спасает, когда на один элемент нельзя повесить две структурные директивы.
2. **\`ngTemplateOutlet\`** — рендерит уже объявленный \`ng-template\` в нужном месте и передаёт в него **контекст** (данные). Это механизм переиспользования кусков шаблона и кастомизации компонентов: шаблон приходит снаружи, компонент решает, где его отрисовать.
3. **\`ngComponentOutlet\`** — декларативно рендерит **компонент по его классу**, выбранному динамически, без ручного \`ViewContainerRef.createComponent\`. Поддерживает inputs, свой инжектор и проекцию контента (Angular 16.2+).

## Пример

\`\`\`html
<!-- 1. группировка без лишнего DOM -->
<ng-container *ngIf="user as u">
  <h2>{{ u.name }}</h2>
</ng-container>

<!-- 2. штамп + чернила -->
<ng-template #row let-item let-i="index">{{ i }}: {{ item }}</ng-template>
<ng-container
  [ngTemplateOutlet]="row"
  [ngTemplateOutletContext]="{ $implicit: data, index: 0 }" />

<!-- 3. розетка: класс компонента приходит из данных -->
<ng-container
  [ngComponentOutlet]="widgetClass"
  [ngComponentOutletInputs]="{ title: 'Hi' }" />
\`\`\`

Почему так: ключ \`$implicit\` в контексте маппится на **безымянный** \`let-item\` — это соглашение, «главное значение». Все остальные ключи забираются по имени: \`let-i="index"\`.

## Когда что использовать

- **\`ng-container\`** — когда нужна структурная группировка, а лишний \`<div>\` сломает вёрстку (grid, flex, \`<tr>\`/\`<td>\`, \`<select>\`).
- **\`ngTemplateOutlet\`** — когда компонент должен позволить потребителю **подменить кусок разметки**, но данными управляет сам. Паттерн «slot с данными»: таблица отдаёт наружу строку и индекс, а как её рисовать — решает потребитель.
- **\`ngComponentOutlet\`** — когда **сам класс компонента** неизвестен на этапе написания шаблона: дашборды с настраиваемыми виджетами, плагины, CMS-блоки, рендер по типу из бэкенда.

## Что сказать на собеседовании

> \`ng-container\` — логический группирующий узел, не порождающий DOM-элемент; его используют, чтобы навесить структурную директиву или сгруппировать разметку без лишнего \`div\`. \`ngTemplateOutlet\` рендерит переданный \`TemplateRef\` в нужной точке и прокидывает в него контекст через \`ngTemplateOutletContext\`, где ключ \`$implicit\` соответствует безымянной \`let\`-переменной — это основа паттерна «слот с данными». \`ngComponentOutlet\` делает то же для компонентов: создаёт компонент по классу, выбранному в рантайме, поддерживает \`ngComponentOutletInputs\` и заменяет ручной \`ViewContainerRef.createComponent\`.

## Ловушки

- **\`ng-template\` сам по себе ничего не рендерит.** Объявили и забыли вывести — на экране пусто, ошибок нет. Частый «баг-призрак».
- **\`$implicit\` — единственный безымянный.** \`let-item\` без \`=\` берёт именно его; остальное только по имени.
- **Контекст не типизирован по умолчанию** — для строгой типизации нужен \`ngTemplateContextGuard\` в своей директиве.
- **Две структурные директивы на одном элементе** — ошибка компиляции; спросят, как обойти (ответ: \`ng-container\`).
- **\`ngComponentOutlet\` требует standalone-компонент** (или корректный инжектор) и не отдаёт вам инстанс напрямую — если нужен доступ к инстансу, берите \`ViewContainerRef.createComponent\`.
- Спросят про **современный контрол-флоу**: \`@if\`/\`@for\` часто убирают необходимость в \`ng-container\` для условий, но для группировки и для аутлетов он по-прежнему нужен.`,
      en: `## In short

Three tools about **putting things into a template without littering the DOM**.

Analogies: \`ng-container\` is a **paper clip** — it holds pages together but is not part of the finished document. \`ngTemplateOutlet\` is a **rubber stamp** — you carve it once and press it anywhere, each time with different ink (the context). \`ngComponentOutlet\` is a **power socket** — you can plug any appliance in, and the choice is made at runtime.

## What they are

1. **\`ng-container\`** — a logical container that creates **no DOM element**. Use it to attach a structural directive (\`*ngIf\`, \`*ngFor\`) or group nodes without an extra \`<div>\`. It is a lifesaver when you cannot put two structural directives on one element.
2. **\`ngTemplateOutlet\`** — renders an already declared \`ng-template\` at a chosen place and passes it a **context** (data). It is the mechanism for reusing template fragments and customizing components: the template comes from outside, the component decides where to draw it.
3. **\`ngComponentOutlet\`** — declaratively renders a **component by its class**, chosen dynamically, without a manual \`ViewContainerRef.createComponent\`. It supports inputs, a custom injector and content projection (Angular 16.2+).

## Example

\`\`\`html
<!-- 1. grouping with no extra DOM -->
<ng-container *ngIf="user as u">
  <h2>{{ u.name }}</h2>
</ng-container>

<!-- 2. stamp plus ink -->
<ng-template #row let-item let-i="index">{{ i }}: {{ item }}</ng-template>
<ng-container
  [ngTemplateOutlet]="row"
  [ngTemplateOutletContext]="{ $implicit: data, index: 0 }" />

<!-- 3. socket: the component class comes from data -->
<ng-container
  [ngComponentOutlet]="widgetClass"
  [ngComponentOutletInputs]="{ title: 'Hi' }" />
\`\`\`

Why it looks like this: the \`$implicit\` key of the context maps to the **unnamed** \`let-item\` — a convention meaning "the main value". Every other key is picked up by name: \`let-i="index"\`.

## When to use which

- **\`ng-container\`** — when you need structural grouping and an extra \`<div>\` would break the layout (grid, flex, \`<tr>\`/\`<td>\`, \`<select>\`).
- **\`ngTemplateOutlet\`** — when a component should let the consumer **swap a piece of markup** while the component still owns the data. The "slot with data" pattern: a table hands out the row and index, the consumer decides how to draw it.
- **\`ngComponentOutlet\`** — when the **component class itself** is unknown while writing the template: dashboards with configurable widgets, plugins, CMS blocks, rendering by a type coming from the backend.

## What to say in the interview

> \`ng-container\` is a logical grouping node that produces no DOM element; you use it to attach a structural directive or group markup without a redundant \`div\`, including the case where you need two structural directives but cannot put them on one element. \`ngTemplateOutlet\` renders a given \`TemplateRef\` at a chosen point and passes a context through \`ngTemplateOutletContext\`, where the \`$implicit\` key corresponds to the unnamed \`let\` variable — that is the basis of the "slot with data" pattern and of customizable components. \`ngComponentOutlet\` does the same for components: it declaratively instantiates a component from a class chosen at runtime, supports \`ngComponentOutletInputs\`, a custom injector and content projection since Angular 16.2, and replaces a manual \`ViewContainerRef.createComponent\`. In practice: \`ng-container\` is about structure, \`ngTemplateOutlet\` about reusing markup, \`ngComponentOutlet\` about picking a component dynamically.

## Gotchas

- **An \`ng-template\` renders nothing on its own.** Declare it and forget to output it and the screen stays blank with no error. A classic phantom bug.
- **\`$implicit\` is the only unnamed one.** \`let-item\` with no \`=\` picks exactly that; everything else is by name.
- **The context is untyped by default** — for strict typing you need an \`ngTemplateContextGuard\` in your own directive.
- **Two structural directives on one element** is a compile error; they will ask how to work around it (answer: \`ng-container\`).
- **\`ngComponentOutlet\` needs a standalone component** (or a correct injector) and does not hand you the instance — if you need the instance, use \`ViewContainerRef.createComponent\`.
- They will ask about **modern control flow**: \`@if\`/\`@for\` often remove the need for \`ng-container\` around conditions, but for grouping and for outlets it is still required.`,
    },
    codeSnippet: `<ng-template #cell let-value let-col="col">{{ col }}: {{ value }}</ng-template>

<ng-container
  *ngFor="let row of rows"
  [ngTemplateOutlet]="cell"
  [ngTemplateOutletContext]="{ $implicit: row.value, col: row.col }" />`,
  },
  {
    id: 'ng-043',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['structural-directives', 'microsyntax', 'template-ref'],
    question: {
      ru: 'Как написать кастомную структурную директиву и как разворачивается её микросинтаксис?',
      en: 'How do you write a custom structural directive, and how does its microsyntax desugar?',
    },
    answer: {
      ru: `## Коротко

Структурная директива — это код, который **сам решает, появится разметка в DOM или нет** (и сколько раз). Звёздочка \`*\` — просто **сокращение**: компилятор разворачивает её в \`ng-template\`.

Аналогия: у вас есть **чертёж дома** (\`TemplateRef\`) и **пустой участок земли** (\`ViewContainerRef\`). Директива — прораб: смотрит на условие и решает, строить дом на этом участке, снести его или построить десять копий.

## Как это работает по шагам

1. Вы пишете \`<div *appUnless="cond">\`.
2. Компилятор **разворачивает** это в обёртку \`ng-template\` — сам \`div\` внутрь неё уезжает, в DOM его пока нет.
3. Директива через DI получает \`TemplateRef\` (тот самый чертёж — содержимое шаблона) и \`ViewContainerRef\` (точку вставки — участок).
4. Значение из \`*appUnless="cond"\` приходит в **одноимённый input** — сеттер \`appUnless\`.
5. В сеттере вы решаете: \`vcr.createEmbeddedView(tpl)\` — построить, \`vcr.clear()\` — снести.
6. Angular сам уничтожит созданные view при уничтожении хоста.

Разворот выглядит так:

\`\`\`html
<ng-template appUnless [appUnless]="cond">
  <div></div>
</ng-template>
\`\`\`

## Пример

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

Почему так: флаг \`created\` нужен, чтобы **не пересоздавать view** на каждое одинаковое значение — иначе при каждом апдейте разметка будет умирать и рождаться заново, теряя фокус и состояние.

## Микросинтаксис и типизация

\`*ngFor="let item of items; let i = index; trackBy: fn"\` разворачивается по формальным правилам:

- Первое слово после \`*\` — **имя директивы** и одновременно её главный input.
- Ключевые слова (\`of\`, \`as\`, произвольные суффиксы) склеиваются с именем директивы в имена inputs: \`of\` → \`ngForOf\`, \`trackBy\` → \`ngForTrackBy\`.
- \`let x = expr\` не создаёт input — оно объявляет **локальную переменную из контекста** embedded view (\`index\`, \`first\`, \`even\` и т.д.).
- \`as\` сохраняет результат выражения в переменную шаблона.

Для строгой типизации внутри шаблона директиве добавляют статические **type-guard**'ы: \`ngTemplateGuard_<имяInput>\` и \`ngTemplateContextGuard\`. Именно благодаря им \`*ngIf="user"\` внутри шаблона сужает тип к non-null — без них компилятор шаблонов ничего о ваших условиях не знает.

## Что сказать на собеседовании

> Звёздочка в структурной директиве — синтаксический сахар: компилятор разворачивает \`<div *appUnless="cond">\` в \`<ng-template appUnless [appUnless]="cond">\` с этим \`div\` внутри. Директива инжектит \`TemplateRef\` — содержимое шаблона, и \`ViewContainerRef\` — точку вставки, и в сеттере input решает, вызвать \`createEmbeddedView\` или \`clear\`. Микросинтаксис разворачивается по правилам: первое слово после звёздочки — имя директивы и её основной input, а \`of\` и \`trackBy\` склеиваются в \`ngForOf\` и \`ngForTrackBy\`. Чтобы типы сужались внутри шаблона, как у \`ngIf\`, директиве добавляют статические \`ngTemplateGuard_\` и \`ngTemplateContextGuard\`.

## Ловушки

- **Одна структурная директива на элемент.** Две — ошибка компиляции; обходится \`ng-container\`.
- **Пересоздание view на каждый апдейт** — потеря фокуса, скролла и состояния дочерних компонентов. Держите флаг «уже создано».
- **Забыть type-guard** — внутри шаблона тип не сузится, и строгий режим шаблонов начнёт ругаться на \`possibly null\`.
- **Имя input должно совпадать с селектором**: для \`*appUnless\` главный input обязан называться \`appUnless\`, иначе значение не придёт.
- **\`@if\`/\`@for\` — не замена всему**: они встроены в компилятор и не являются директивами, их нельзя расширить. Своя логика — по-прежнему структурная директива.
- Спросят про **\`createEmbeddedView\` с контекстом**: второй аргумент — объект контекста, где \`$implicit\` доступен как безымянный \`let-x\`.`,
      en: `## In short

A structural directive is code that **decides for itself whether markup appears in the DOM** (and how many times). The asterisk \`*\` is just **shorthand**: the compiler expands it into an \`ng-template\`.

Analogy: you have a **house blueprint** (\`TemplateRef\`) and an **empty plot of land** (\`ViewContainerRef\`). The directive is the foreman: it looks at the condition and decides whether to build the house on that plot, demolish it, or put up ten copies.

## How it works, step by step

1. You write \`<div *appUnless="cond">\`.
2. The compiler **desugars** it into an \`ng-template\` wrapper — the \`div\` moves inside it and is not in the DOM yet.
3. Through DI the directive receives a \`TemplateRef\` (the blueprint — the template content) and a \`ViewContainerRef\` (the insertion point — the plot).
4. The value from \`*appUnless="cond"\` arrives in the **identically named input** — the \`appUnless\` setter.
5. In that setter you decide: \`vcr.createEmbeddedView(tpl)\` to build, \`vcr.clear()\` to demolish.
6. Angular destroys the created views automatically when the host is destroyed.

The desugared form looks like this:

\`\`\`html
<ng-template appUnless [appUnless]="cond">
  <div></div>
</ng-template>
\`\`\`

## Example

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

Why it looks like this: the \`created\` flag exists so the view is **not recreated** on every identical value — otherwise the markup would die and be reborn on each update, losing focus and state.

## Microsyntax and typing

\`*ngFor="let item of items; let i = index; trackBy: fn"\` desugars by formal rules:

- The first word after \`*\` is the **directive name** and simultaneously its primary input.
- Keywords (\`of\`, \`as\`, arbitrary suffixes) are concatenated with the directive name into input names: \`of\` → \`ngForOf\`, \`trackBy\` → \`ngForTrackBy\`.
- \`let x = expr\` does not create an input — it declares a **local variable from the embedded view context** (\`index\`, \`first\`, \`even\`, and so on).
- \`as\` stores the result of an expression in a template variable.

For strict typing inside the template you add static **type guards** to the directive: \`ngTemplateGuard_<inputName>\` and \`ngTemplateContextGuard\`. They are precisely why \`*ngIf="user"\` narrows the type to non-null inside the template — without them the template compiler knows nothing about your condition.

## What to say in the interview

> The asterisk on a structural directive is syntactic sugar: the compiler expands \`<div *appUnless="cond">\` into \`<ng-template appUnless [appUnless]="cond">\` with that \`div\` inside. The directive itself injects \`TemplateRef\` — the template content — and \`ViewContainerRef\` — the insertion point — and in the setter of its primary input decides whether to call \`createEmbeddedView\` or \`clear\`. Microsyntax desugars by rules: the first word after the asterisk is the directive name and its primary input, keywords like \`of\` and \`trackBy\` concatenate into \`ngForOf\` and \`ngForTrackBy\`, and \`let x = expr\` creates a local variable from the embedded view context. To make types narrow inside the template the way \`ngIf\` does, you add the static \`ngTemplateGuard_\` and \`ngTemplateContextGuard\`.

## Gotchas

- **One structural directive per element.** Two is a compile error; work around it with \`ng-container\`.
- **Recreating the view on every update** loses focus, scroll position and child component state. Keep an "already created" flag.
- **Forgetting the type guard** means no narrowing inside the template, and strict template checking starts complaining about \`possibly null\`.
- **The input name must match the selector**: for \`*appUnless\` the primary input must be called \`appUnless\`, otherwise the value never arrives.
- **\`@if\`/\`@for\` do not replace everything**: they are built into the compiler and are not directives, so you cannot extend them. Custom logic still means a structural directive.
- They will ask about **\`createEmbeddedView\` with a context**: the second argument is the context object, where \`$implicit\` is available as the unnamed \`let-x\`.`,
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
    category: 'angular-signals',
    level: 'Medium',
    tags: ['animations', 'triggers', 'keyframes'],
    question: {
      ru: 'Как устроены анимации @angular/animations: триггеры, состояния, переходы и keyframes?',
      en: 'How do @angular/animations work: triggers, states, transitions and keyframes?',
    },
    answer: {
      ru: `## Коротко

Анимации Angular — это **машина состояний**, описанная в метаданных компонента, а не в CSS. Вы перечисляете, в каких состояниях бывает элемент и как он между ними переезжает; Angular сам проигрывает переход.

Аналогия: **дверь**. У неё два состояния — «закрыта» и «открыта», у каждого своё положение (\`state\` + \`style\`). А то, как именно она поворачивается между ними — за сколько миллисекунд и с каким ускорением — это \`transition\`. Имя выключателя на стене, которым вы всем этим управляете, — \`trigger\`.

## Как это работает по шагам

1. Подключаем провайдер: \`provideAnimationsAsync()\` (или \`provideAnimations()\`).
2. В метаданных компонента объявляем \`trigger('open', [...])\` — это и есть «имя выключателя».
3. Внутри перечисляем \`state('closed', style({...}))\` и \`state('open', style({...}))\` — **конечные** стили каждого положения.
4. Добавляем \`transition('closed <=> open', animate('300ms ease-in-out'))\` — правило переезда между ними.
5. В шаблоне привязываем триггер к выражению: \`<div [@open]="isOpen ? 'open' : 'closed'">\`.
6. Как только выражение меняет значение, Angular находит подходящий \`transition\` и проигрывает анимацию через Web Animations API.

## Пример

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

Почему так: \`*\` означает «**текущее вычисленное значение**» — реальную высоту содержимого. Это спасает от классической проблемы CSS «нельзя анимировать до \`height: auto\`»: Angular измерит фактическую высоту и подставит её.

## Спец-переходы, keyframes и stagger

- **\`:enter\` / \`:leave\`** — алиасы для \`void => *\` и \`* => void\`, то есть появление и удаление элемента из DOM.
- **\`:increment\` / \`:decrement\`** — срабатывают по изменению **числового** значения в большую или меньшую сторону (удобно для каруселей и счётчиков).
- **\`keyframes\`** — промежуточные кадры с \`offset\` от 0 до 1, как в раскадровке мультфильма.
- **\`query\` + \`stagger\`** — находим набор элементов и запускаем их не одновременно, а с задержкой друг за другом: «волна» вместо «вспышки».

\`\`\`ts
transition('* => *', [
  query(':enter', [
    style({ opacity: 0 }),
    stagger(50, animate('200ms', style({ opacity: 1 }))),
  ], { optional: true }),
])
\`\`\`

## Что сказать на собеседовании

> Анимации описываются декларативно как машина состояний в метаданных компонента и подключаются через \`provideAnimationsAsync()\`. \`trigger\` даёт анимации имя, по которому она привязывается к элементу как \`[@name]\`; \`state\` описывает конечный стиль состояния, \`transition\` — правило перехода с \`animate\`. Спецзначение \`*\` — текущее вычисленное значение, поэтому можно анимировать высоту до реального размера содержимого, чего чистым CSS не сделать. Под капотом всё исполняется через Web Animations API, причём на \`:leave\` — это алиас \`* => void\` — Angular откладывает удаление элемента из DOM до конца анимации.

## Ловушки

- **\`:leave\` не сработает**, если элемент удаляется не Angular'ом (например, вы сами дёрнули DOM) — удаление откладывает именно фреймворк.
- **Забыть \`{ optional: true }\` в \`query\`** — если элементов нет, анимация упадёт с ошибкой.
- **Вес бандла**: \`@angular/animations\` не бесплатен. Спросят, зачем он, если есть CSS transitions — ответ: состояния, \`:leave\`, \`stagger\` и координация с жизненным циклом.
- **SSR**: на сервере анимации не проигрываются; первый кадр после гидратации может «дёрнуться», если состояние выбрано неудачно.
- **\`height: '*'\` стоит layout-пересчёта** — на длинных списках это заметно.
- Спросят про **\`prefers-reduced-motion\`**: анимации нужно уметь отключать для пользователей, которым они мешают.`,
      en: `## In short

Angular animations are a **state machine** declared in the component metadata, not in CSS. You list the states an element can be in and how it travels between them; Angular plays the transition for you.

Analogy: **a door**. It has two states — closed and open — each with its own position (\`state\` + \`style\`). How exactly it swings between them, over how many milliseconds and with what easing, is the \`transition\`. The name of the wall switch you operate it all with is the \`trigger\`.

## How it works, step by step

1. Add the provider: \`provideAnimationsAsync()\` (or \`provideAnimations()\`).
2. In the component metadata declare \`trigger('open', [...])\` — that is the "switch name".
3. Inside it list \`state('closed', style({...}))\` and \`state('open', style({...}))\` — the **end** styles of each position.
4. Add \`transition('closed <=> open', animate('300ms ease-in-out'))\` — the rule for travelling between them.
5. In the template bind the trigger to an expression: \`<div [@open]="isOpen ? 'open' : 'closed'">\`.
6. As soon as the expression changes value, Angular picks the matching \`transition\` and plays it through the Web Animations API.

## Example

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

Why it looks like this: \`*\` means "**the current computed value**" — the real height of the content. It solves the classic CSS problem of not being able to animate to \`height: auto\`: Angular measures the actual height and substitutes it.

## Special transitions, keyframes and stagger

- **\`:enter\` / \`:leave\`** — aliases for \`void => *\` and \`* => void\`, i.e. an element appearing in and being removed from the DOM.
- **\`:increment\` / \`:decrement\`** — fire when a **numeric** value goes up or down (handy for carousels and counters).
- **\`keyframes\`** — intermediate frames with an \`offset\` from 0 to 1, like a cartoon storyboard.
- **\`query\` + \`stagger\`** — select a set of elements and start them not all at once but one after another with a delay: a wave instead of a flash.

\`\`\`ts
transition('* => *', [
  query(':enter', [
    style({ opacity: 0 }),
    stagger(50, animate('200ms', style({ opacity: 1 }))),
  ], { optional: true }),
])
\`\`\`

## What to say in the interview

> Angular animations are declared as a state machine in the component metadata and enabled via \`provideAnimationsAsync()\`. \`trigger\` gives the animation a name it is bound to the element with as \`[@name]\`; \`state\` describes a state's end style and \`transition\` the rule for moving between states with \`animate\`. The special value \`*\` means the current computed value, which is how you animate height up to the real content size — something plain CSS cannot do. There are built-in transitions \`:enter\` and \`:leave\`, aliases of \`void => *\` and \`* => void\`, plus \`:increment\` and \`:decrement\` for numeric values. Under the hood everything runs through the Web Animations API, and on \`:leave\` Angular defers the actual DOM removal until the animation finishes.

## Gotchas

- **\`:leave\` will not fire** if the element is removed by something other than Angular (e.g. you touched the DOM yourself) — it is the framework that defers the removal.
- **Forgetting \`{ optional: true }\` in \`query\`** — if there are no matching elements the animation throws.
- **Bundle weight**: \`@angular/animations\` is not free. They will ask why not just CSS transitions — the answer is states, \`:leave\`, \`stagger\` and lifecycle coordination.
- **SSR**: animations do not play on the server; the first frame after hydration can jump if the initial state is chosen badly.
- **\`height: '*'\` costs a layout recalculation** — noticeable on long lists.
- They will ask about **\`prefers-reduced-motion\`**: you must be able to switch animations off for users who need that.`,
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
    category: 'angular-signals',
    level: 'Medium',
    tags: ['ng-optimized-image', 'performance', 'lcp'],
    question: {
      ru: 'Что даёт директива NgOptimizedImage и как она улучшает LCP?',
      en: 'What does the NgOptimizedImage directive give you, and how does it improve LCP?',
    },
    answer: {
      ru: `## Коротко

\`NgOptimizedImage\` — директива, которая **заставляет вас и браузер грузить картинки правильно**. Вместо \`src\` пишете \`ngSrc\`, и она сама расставляет все атрибуты, влияющие на **Core Web Vitals**: в первую очередь на LCP (Largest Contentful Paint) и CLS.

Аналогия: хорошая служба доставки. Место под коробку в прихожей размечено заранее, поэтому, когда её принесут, мебель двигать не придётся (это \`width\`/\`height\` против CLS). Один важный заказ везут экспрессом (\`priority\`), остальные — попутным рейсом, когда доедет (\`loading="lazy"\`).

## Как это работает по шагам

1. Импортируете \`NgOptimizedImage\` в компонент и меняете \`src\` на \`ngSrc\`.
2. Директива **требует** \`width\` и \`height\` (или \`fill\`) — без них будет ошибка. Браузер заранее резервирует место, и **CLS исчезает**.
3. Всем изображениям она по умолчанию ставит \`loading="lazy"\` — грузятся, только когда нужны.
4. Изображению с атрибутом \`priority\` — наоборот: \`loading="eager"\`, \`fetchpriority="high"\` и **preload**-подсказка в \`<head>\`. Браузер начинает качать его сразу, ещё до разбора всего DOM.
5. Автоматически генерируется \`srcset\` по набору breakpoint'ов, чтобы на мобильном не качался десктопный файл.
6. В dev-режиме директива **ругается в консоль**: файл сильно больше отображаемого размера, у LCP-картинки нет \`priority\`, размеры не совпадают с реальными пропорциями.

## Пример

\`\`\`html
<img ngSrc="hero.jpg" width="800" height="600" priority alt="Hero" />
\`\`\`

Почему так: \`priority\` ставится **ровно одной** картинке на экране — той, что и есть LCP-элемент (обычно баннер в первом экране). Если пометить приоритетными все, приоритет перестаёт что-либо значить и вы просто забиваете канал.

## Image loaders и CDN

Сама директива **файлы не сжимает**. Она умеет переписывать URL под ваш CDN, а уже CDN отдаёт нужный размер и формат (WebP/AVIF):

\`\`\`ts
provideImgixLoader('https://cdn.example.com/')
\`\`\`

Есть готовые лоадеры (\`provideImgixLoader\`, \`provideCloudflareLoader\` и другие) и возможность написать свой — это просто функция, которая из имени файла и нужной ширины собирает итоговый URL. Такой лоадер и делает \`srcset\` осмысленным: без него все варианты указывали бы на один и тот же файл.

## Что сказать на собеседовании

> \`NgOptimizedImage\` — директива, подключаемая через атрибут \`ngSrc\`, которая доводит загрузку изображений до best practice и влияет на Core Web Vitals. Она обязательно требует \`width\` и \`height\` либо режим \`fill\`, за счёт чего браузер резервирует место и уходит CLS. По умолчанию она ставит \`loading="lazy"\`, а для LCP-изображения атрибут \`priority\` включает \`loading="eager"\`, \`fetchpriority="high"\` и добавляет preload-подсказку в \`<head>\`. Она генерирует \`srcset\` по breakpoint'ам. Сама она изображения не оптимизирует — за это отвечает CDN через image loader, который переписывает URL с нужной шириной и форматом WebP/AVIF.

## Ловушки

- **\`ngSrc\` и \`src\` одновременно нельзя** — директива выбросит ошибку.
- **\`priority\` на всех картинках** обесценивает приоритет и вредит LCP. Приоритетная — одна, та, что видна сразу.
- **\`fill\` без \`position: relative\` у родителя** — картинка «уедет» на весь экран или схлопнется.
- **width/height — это соотношение сторон, а не CSS-размер.** Реальный размер задаёт CSS; неверные пропорции директива подсветит предупреждением.
- **Без image loader \`srcset\` бесполезен** — все варианты ведут на один файл, экономии нет.
- Спросят, **что именно улучшает LCP**: ответ — preload плюс \`fetchpriority="high"\`, а не «оптимизация картинки» как таковая.
- **Динамические URL**: если \`ngSrc\` меняется в рантайме, следите, чтобы менялись и размеры, иначе получите растянутое изображение.`,
      en: `## In short

\`NgOptimizedImage\` is a directive that **makes you and the browser load images correctly**. You write \`ngSrc\` instead of \`src\` and it sets every attribute that matters for **Core Web Vitals** — primarily LCP (Largest Contentful Paint) and CLS.

Analogy: a good delivery service. The floor space for the box is marked out in advance, so when it arrives no furniture has to be shoved around (that is \`width\`/\`height\` versus CLS). One important parcel goes express (\`priority\`); the rest travel whenever there is room (\`loading="lazy"\`).

## How it works, step by step

1. You import \`NgOptimizedImage\` into the component and change \`src\` to \`ngSrc\`.
2. The directive **requires** \`width\` and \`height\` (or \`fill\`) — without them it errors. The browser reserves the space up front and **CLS disappears**.
3. By default it sets \`loading="lazy"\` on every image — they load only when needed.
4. For an image marked \`priority\` it does the opposite: \`loading="eager"\`, \`fetchpriority="high"\` and a **preload** hint in \`<head>\`. The browser starts fetching it immediately, before the whole DOM is parsed.
5. It generates a \`srcset\` from a set of breakpoints so a phone does not download the desktop-sized file.
6. In dev mode the directive **complains in the console**: the file is far larger than its displayed size, the LCP image has no \`priority\`, the declared dimensions do not match the real aspect ratio.

## Example

\`\`\`html
<img ngSrc="hero.jpg" width="800" height="600" priority alt="Hero" />
\`\`\`

Why it looks like this: \`priority\` goes on **exactly one** image on screen — the one that actually is the LCP element (usually the above-the-fold banner). Mark everything as priority and priority stops meaning anything; you just saturate the connection.

## Image loaders and the CDN

The directive itself **does not compress files**. What it can do is rewrite URLs for your CDN, and the CDN then serves the right size and format (WebP/AVIF):

\`\`\`ts
provideImgixLoader('https://cdn.example.com/')
\`\`\`

There are ready-made loaders (\`provideImgixLoader\`, \`provideCloudflareLoader\` and others) and you can write your own — it is just a function that builds the final URL from a file name and a requested width. That loader is what makes \`srcset\` meaningful: without it every candidate would point at the same file.

## What to say in the interview

> \`NgOptimizedImage\` is a directive applied through the \`ngSrc\` attribute that brings image loading up to best practice and directly affects Core Web Vitals. It mandates \`width\` and \`height\`, or the \`fill\` mode, so the browser reserves the space and CLS goes away. By default it applies \`loading="lazy"\`, while the \`priority\` attribute on the LCP image switches on \`loading="eager"\`, \`fetchpriority="high"\` and adds a preload hint to \`<head>\`. It also generates a \`srcset\` across breakpoints, and in dev mode warns about oversized files, incorrect dimensions and a missing \`priority\` on the LCP image. It does not optimize the images themselves — that is the CDN's job through an image loader such as \`provideImgixLoader\` or a custom function that rewrites the URL with the requested width and a WebP/AVIF format. For full-width images you use \`fill\`, which requires the parent to be \`position: relative\`, and \`ngSrcset\` lets you set densities or widths by hand.

## Gotchas

- **You cannot have \`ngSrc\` and \`src\` at the same time** — the directive throws.
- **\`priority\` on every image** devalues priority and hurts LCP. Exactly one image — the one visible immediately.
- **\`fill\` without \`position: relative\` on the parent** — the image escapes to full screen or collapses.
- **width/height are an aspect ratio, not a CSS size.** The real size comes from CSS; a wrong ratio triggers a directive warning.
- **Without an image loader \`srcset\` is pointless** — every candidate resolves to the same file, so nothing is saved.
- They will ask **what exactly improves LCP**: the answer is the preload plus \`fetchpriority="high"\`, not "image optimization" as such.
- **Dynamic URLs**: if \`ngSrc\` changes at runtime, make sure the dimensions change too, or you get a stretched image.`,
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
    category: 'angular-signals',
    level: 'Hard',
    tags: ['defer', 'triggers', 'prefetch', 'lazy-loading'],
    question: {
      ru: 'Какие триггеры, prefetch и блоки (@placeholder/@loading/@error) есть у @defer и как они работают?',
      en: 'What triggers, prefetch and blocks (@placeholder/@loading/@error) does @defer have, and how do they work?',
    },
    answer: {
      ru: `## Коротко

\`@defer\` (Angular 17+) — это **«не грузи, пока не понадобится»** прямо в шаблоне. Код компонентов внутри блока уезжает в **отдельный чанк**, и этот чанк скачивается только когда сработал триггер. Итог: меньше initial bundle, быстрее TTI.

Аналогия: **торговый автомат**. Товар лежит не в витрине, а на складе; его привозят, когда вы нажали кнопку. А \`prefetch\` — это когда кладовщик заранее принёс коробку в подсобку: вы нажимаете, и выдача мгновенная.

## Как это работает по шагам

1. Оборачиваете тяжёлую часть шаблона в \`@defer (...) { ... }\`.
2. Компилятор видит, какие компоненты, директивы и пайпы используются **только внутри** блока, и выносит их в отдельный чанк.
3. Изначально рендерится \`@placeholder\` — он в основном бандле, поэтому появляется сразу.
4. Срабатывает триггер (скролл, ховер, клик, простой браузера…) — начинается загрузка чанка, показывается \`@loading\`.
5. Чанк загружен — Angular заменяет placeholder реальным содержимым.
6. Если загрузка провалилась (сеть отвалилась, деплой поменял хэши файлов) — показывается \`@error\`.

## Пример

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

Почему так: \`after 100ms\` означает «не показывай спиннер, если всё загрузилось за мгновение», а \`minimum 1s\` — «если уж показал, подержи хотя бы секунду». Вместе они убирают неприятное мелькание. \`minimum\` у \`@placeholder\` работает так же — не даёт заглушке моргнуть.

## Триггеры и prefetch

- \`on idle\` — **по умолчанию**, при \`requestIdleCallback\`, когда браузеру нечем заняться.
- \`on viewport\` — когда блок (или его placeholder) попал в видимую область; под капотом IntersectionObserver.
- \`on interaction\`, \`on hover\` — по действию пользователя.
- \`on timer(2s)\`, \`on immediate\` — по таймеру и сразу после отрисовки.
- \`when condition\` — по булевому выражению или сигналу.

Триггеры **комбинируются** и умеют смотреть на другой элемент по ссылке: \`on viewport(ref)\`.

\`prefetch\` — это отдельный триггер на **скачивание без показа**: \`@defer (on interaction; prefetch on idle)\`. Пока пользователь читает страницу, код уже тихо приехал в кэш; клик отрисуется мгновенно.

## Что сказать на собеседовании

> \`@defer\` появился в Angular 17 и позволяет лениво загружать код части шаблона: компилятор выносит зависимости блока в отдельный чанк, который скачивается при срабатывании триггера, за счёт чего уменьшается initial bundle и улучшается TTI. У блока есть \`@placeholder\` в основном бандле, \`@loading\` с параметрами \`after\` и \`minimum\` против мелькания спиннера и \`@error\`. Триггеры: \`on idle\` по умолчанию, \`on viewport\` через IntersectionObserver, \`on interaction\` и \`when\` по булеву выражению. Ключевое ограничение: зависимости внутри блока должны быть standalone и не использоваться снаружи, иначе они попадут в основной бандл.

## Ловушки

- **Компонент используется и внутри, и снаружи блока** — тогда он всё равно в основном бандле, и \`@defer\` не даёт ничего. Проверяйте по факту, а не по ощущениям.
- **Зависимости должны быть standalone** — NgModule-компоненты так не отложить.
- **Тяжёлые зависимости в \`@placeholder\`** сводят идею на нет: placeholder не откладывается.
- **\`on viewport\` без \`@placeholder\`**: блоку нечего наблюдать, пока он пуст — нужен видимый якорь.
- **\`@error\` часто забывают**, а после деплоя старые чанки исчезают, и пользователь видит пустоту.
- Спросят про **разницу с ленивыми роутами**: \`@defer\` — про **части шаблона**, \`loadComponent\` — про **маршруты**; они дополняют друг друга.
- **Не оборачивайте в \`@defer\` контент первого экрана** — сделаете LCP только хуже.`,
      en: `## In short

\`@defer\` (Angular 17+) is **"don't load it until it's needed"** written straight into the template. The code of the components inside the block moves into a **separate chunk**, and that chunk is downloaded only when a trigger fires. Result: a smaller initial bundle and a faster TTI.

Analogy: a **vending machine**. The goods are not in the display case but in the warehouse; they are brought over once you press the button. And \`prefetch\` is the stock keeper carrying the box into the back room in advance: you press, and delivery is instant.

## How it works, step by step

1. You wrap the heavy part of the template in \`@defer (...) { ... }\`.
2. The compiler sees which components, directives and pipes are used **only inside** the block and moves them into a separate chunk.
3. Initially the \`@placeholder\` renders — it lives in the main bundle, so it appears immediately.
4. A trigger fires (scroll, hover, click, browser idle…) — chunk loading starts and \`@loading\` is shown.
5. The chunk arrives — Angular replaces the placeholder with the real content.
6. If loading failed (network dropped, a deploy changed the file hashes) — \`@error\` is shown.

## Example

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

Why it looks like this: \`after 100ms\` means "don't show a spinner if it loaded instantly", and \`minimum 1s\` means "if you did show it, keep it for at least a second". Together they remove the ugly flicker. \`minimum\` on \`@placeholder\` works the same way — it stops the placeholder from blinking.

## Triggers and prefetch

- \`on idle\` — the **default**, on \`requestIdleCallback\`, when the browser has nothing else to do.
- \`on viewport\` — when the block (or its placeholder) enters the viewport; IntersectionObserver under the hood.
- \`on interaction\`, \`on hover\` — on a user action.
- \`on timer(2s)\`, \`on immediate\` — on a timer, and right after rendering.
- \`when condition\` — on a boolean expression or a signal.

Triggers **combine** and can watch another element by reference: \`on viewport(ref)\`.

\`prefetch\` is a separate trigger for **downloading without showing**: \`@defer (on interaction; prefetch on idle)\`. While the user reads the page the code quietly lands in cache; the click then renders instantly.

## What to say in the interview

> \`@defer\` arrived in Angular 17 and lazily loads the code of a template section: the compiler moves the block's dependencies into a separate chunk that is downloaded only when a trigger fires, which shrinks the initial bundle and improves TTI. The block has a \`@placeholder\`, which lives in the main bundle and shows immediately, a \`@loading\` with \`after\` and \`minimum\` to prevent spinner flicker, and an \`@error\` for a failed chunk load. Triggers: \`on idle\` by default, \`on viewport\` via IntersectionObserver, \`on interaction\`, \`on hover\`, \`on timer\`, \`on immediate\` and \`when\` on a boolean expression or signal; they can be combined and bound to another element by reference. Separately there is \`prefetch\` with its own trigger, which pulls the chunk ahead of time without rendering anything so the reveal is instant. The key constraint: every dependency inside the block must be standalone and unused outside it, otherwise it ends up in the main bundle and nothing gets deferred.

## Gotchas

- **A component used both inside and outside the block** stays in the main bundle anyway, so \`@defer\` buys you nothing. Verify with the build output, not by intuition.
- **Dependencies must be standalone** — NgModule components cannot be deferred this way.
- **Heavy dependencies in \`@placeholder\`** defeat the purpose: the placeholder is not deferred.
- **\`on viewport\` with no \`@placeholder\`**: there is nothing to observe while the block is empty — you need a visible anchor.
- **\`@error\` is often forgotten**, and after a deploy the old chunks vanish and the user sees nothing.
- They will ask about **the difference from lazy routes**: \`@defer\` is about **template parts**, \`loadComponent\` about **routes**; they complement each other.
- **Do not wrap above-the-fold content in \`@defer\`** — you will only make LCP worse.`,
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
    category: 'angular-signals',
    level: 'Hard',
    tags: ['destroy-ref', 'take-until-destroyed', 'cleanup'],
    question: {
      ru: 'Как DestroyRef и takeUntilDestroyed решают проблему отписок и где их можно вызывать?',
      en: 'How do DestroyRef and takeUntilDestroyed solve unsubscription, and where can they be used?',
    },
    answer: {
      ru: `## Коротко

\`DestroyRef\` — это **список дел «сделать при выселении»** для конкретного компонента, директивы или сервиса. Вы регистрируете в нём колбэки, и Angular сам вызовет их в момент уничтожения. \`takeUntilDestroyed\` — готовый RxJS-оператор поверх этого механизма: подписка завершается сама.

Аналогия: **выезд из отеля**. Раньше вы вручную бегали отменять будильник, бронь спа и завтрак (это \`destroy$\`-\`Subject\` плюс \`ngOnDestroy\`). Теперь на ресепшене есть список: сдал ключ — всё отменилось автоматически.

## Как это работает по шагам

1. Раньше писали так: заводили \`private destroy$ = new Subject<void>()\`, в \`ngOnDestroy\` делали \`next()\` и \`complete()\`, а в каждый поток добавляли \`takeUntil(this.destroy$)\`. Много шаблонного кода, и один забытый \`takeUntil\` = утечка.
2. Теперь инжектим \`DestroyRef\` — токен, дающий доступ к моменту уничтожения **текущего** контекста.
3. Вызываем \`destroyRef.onDestroy(cb)\` — колбэк попадает в очередь очистки.
4. Когда Angular уничтожает компонент/директиву/сервис, он проходит по этой очереди и выполняет все колбэки.
5. \`takeUntilDestroyed()\` делает то же самое за вас: внутри он берёт \`DestroyRef\` и завершает поток на уничтожении.

## Пример

\`\`\`ts
private destroyRef = inject(DestroyRef);
ngOnInit() {
  const id = setInterval(tick, 1000);
  this.destroyRef.onDestroy(() => clearInterval(id));
}
\`\`\`

\`\`\`ts
this.data$
  .pipe(takeUntilDestroyed()) // в конструкторе/поле — берёт DestroyRef сам
  .subscribe();
\`\`\`

Почему так: \`onDestroy\` годится для **любой** очистки — таймеры, слушатели, WebSocket, а не только RxJS. \`takeUntilDestroyed\` — частный, но самый частый случай.

## Где можно вызывать

- **Без аргумента** \`takeUntilDestroyed()\` обязан вызываться в **injection-контексте**: инициализатор поля класса или конструктор. Только там доступен \`inject()\`, через который он и достаёт \`DestroyRef\`.
- **Вне** injection-контекста — в \`ngOnInit\`, в колбэке, внутри метода — нужно передать ссылку явно: \`takeUntilDestroyed(this.destroyRef)\`, где \`destroyRef\` заранее получен полем класса.
- Это же правило действует для \`inject()\` вообще: контекст есть при создании инстанса, а не в произвольный момент жизни.

## Что сказать на собеседовании

> \`DestroyRef\` — инжектируемый токен, дающий доступ к моменту уничтожения текущего DI-контекста: компонента, директивы или сервиса. Его метод \`onDestroy\` регистрирует колбэк очистки — не только для RxJS, но и для таймеров и слушателей. Поверх него работает \`takeUntilDestroyed\`, который завершает подписку при уничтожении контекста и заменяет паттерн с \`destroy$\`-Subject'ом. Важный нюанс: без аргумента \`takeUntilDestroyed\` должен вызываться в injection-контексте — в инициализаторе поля или конструкторе, потому что внутри использует \`inject()\`; в \`ngOnInit\` \`DestroyRef\` передают явно.

## Ловушки

- **\`takeUntilDestroyed()\` без аргумента в \`ngOnInit\`** — рантайм-ошибка про injection context. Самый популярный вопрос по теме.
- **\`takeUntilDestroyed\` не последним в \`pipe\`** — операторы после него продолжат работать; ставьте его как можно ближе к \`subscribe\`.
- **Сервис в \`providedIn: 'root'\`** живёт всё приложение, его \`DestroyRef\` сработает только при уничтожении приложения — для покомпонентной очистки провайдьте сервис на уровне компонента.
- **Горячие источники** (глобальный \`Subject\`, WebSocket) не закроются сами — отписка не равна завершению источника.
- **\`onDestroy\` регистрируется один раз**: если вызвать его в методе, который дёргается многократно, колбэки накопятся.
- Спросят про **сигналы**: \`toSignal\` отписывается сам, и это ещё один аргумент отказаться от ручных подписок.`,
      en: `## In short

\`DestroyRef\` is a **"things to do at checkout" list** for one specific component, directive or service. You register callbacks on it and Angular runs them at destruction time. \`takeUntilDestroyed\` is a ready-made RxJS operator built on top: the subscription completes itself.

Analogy: **checking out of a hotel**. You used to run around cancelling the alarm call, the spa booking and breakfast by hand (that is the \`destroy$\` Subject plus \`ngOnDestroy\`). Now reception keeps a list: hand back the key and everything is cancelled automatically.

## How it works, step by step

1. The old way: declare \`private destroy$ = new Subject<void>()\`, call \`next()\` and \`complete()\` in \`ngOnDestroy\`, and add \`takeUntil(this.destroy$)\` to every stream. Lots of boilerplate, and one forgotten \`takeUntil\` equals a leak.
2. Now you inject \`DestroyRef\` — a token giving access to the destruction moment of the **current** context.
3. You call \`destroyRef.onDestroy(cb)\` — the callback joins the cleanup queue.
4. When Angular destroys the component/directive/service, it walks that queue and runs every callback.
5. \`takeUntilDestroyed()\` does the same for you: internally it grabs \`DestroyRef\` and completes the stream on destruction.

## Example

\`\`\`ts
private destroyRef = inject(DestroyRef);
ngOnInit() {
  const id = setInterval(tick, 1000);
  this.destroyRef.onDestroy(() => clearInterval(id));
}
\`\`\`

\`\`\`ts
this.data$
  .pipe(takeUntilDestroyed()) // in constructor/field — grabs DestroyRef itself
  .subscribe();
\`\`\`

Why it looks like this: \`onDestroy\` suits **any** cleanup — timers, listeners, WebSockets — not just RxJS. \`takeUntilDestroyed\` is the special, and by far the most common, case.

## Where you can call it

- **Without an argument** \`takeUntilDestroyed()\` must be called in an **injection context**: a class field initializer or the constructor. Only there is \`inject()\` available, which is how it obtains \`DestroyRef\`.
- **Outside** an injection context — in \`ngOnInit\`, in a callback, inside a method — you must pass the reference explicitly: \`takeUntilDestroyed(this.destroyRef)\`, with \`destroyRef\` captured earlier as a class field.
- The same rule governs \`inject()\` in general: the context exists while the instance is being created, not at an arbitrary later moment.

## What to say in the interview

> \`DestroyRef\` is an injectable token giving access to the destruction moment of the current DI context: a component, a directive or a service with the same lifecycle. Its \`onDestroy\` method registers a cleanup callback, which is handy not only for RxJS but for timers, listeners and sockets. On top of it sits the \`takeUntilDestroyed\` operator, which completes a subscription automatically when the context is destroyed and replaces the classic pattern with a \`destroy$\` Subject and \`takeUntil\` in \`ngOnDestroy\`. The important nuance is where you call it: without an argument it must run in an injection context, i.e. a field initializer or the constructor, because it uses \`inject()\` internally; in \`ngOnInit\` or a callback you have to pass the \`DestroyRef\` explicitly. It works for any DI context, including services provided at component level and destroyed along with the component. It does not remove the need to complete hot sources, and combined with signals and \`toSignal\` unsubscription is automatic, so manual \`takeUntilDestroyed\` is needed less and less.

## Gotchas

- **\`takeUntilDestroyed()\` with no argument inside \`ngOnInit\`** throws an injection-context runtime error. The most popular question on this topic.
- **\`takeUntilDestroyed\` not last in the \`pipe\`** — operators after it keep working; put it as close to \`subscribe\` as possible.
- **A \`providedIn: 'root'\` service** lives for the whole app, so its \`DestroyRef\` fires only when the app is destroyed — for per-component cleanup, provide the service at component level.
- **Hot sources** (a global \`Subject\`, a WebSocket) do not close themselves — unsubscribing is not the same as completing the source.
- **\`onDestroy\` registers once**: calling it inside a method that runs repeatedly piles up callbacks.
- They will ask about **signals**: \`toSignal\` unsubscribes on its own, which is another argument for dropping manual subscriptions.`,
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
    category: 'angular-signals',
    level: 'Expert',
    tags: ['effect', 'untracked', 'computed-equality'],
    question: {
      ru: 'Как работают cleanup в effect, untracked и кастомное equality у computed?',
      en: 'How do effect cleanup, untracked and custom computed equality work?',
    },
    answer: {
      ru: `## Коротко

Три тонких инструмента реактивности сигналов, каждый решает свою проблему.

Аналогия — **помощник, который переделывает работу при изменении входных данных**. \`onCleanup\` — «прежде чем переделывать, отмени то, что начал в прошлый раз». \`untracked\` — «посмотри на настенные часы, но не подписывайся на уведомления от них». \`equal\` — вахтёр, который сравнивает два списка гостей и говорит: «состав тот же, рассадку не переделываем».

## Три механизма

1. **Cleanup в \`effect\`.** Колбэк эффекта получает функцию \`onCleanup\`. Всё, что вы в неё передадите, выполнится **перед каждым** повторным запуском эффекта и один раз при уничтожении. Это штатное место для отмены таймеров, подписок и незавершённых HTTP-запросов.
2. **\`untracked\`.** По умолчанию **любой** сигнал, прочитанный внутри \`effect\` или \`computed\`, автоматически становится зависимостью. Обёртка \`untracked(() => ...)\` читает значение **без** регистрации зависимости — при его изменении эффект не перезапустится.
3. **Кастомный \`equal\` у \`computed\`.** Сигналы сравнивают старое и новое значение через \`Object.is\`. Для объектов и массивов это значит, что **новая ссылка с теми же данными** считается изменением и тянет за собой пересчёт всего вниз по графу. Опция \`equal\` задаёт свою функцию сравнения.

## Пример

\`\`\`ts
effect((onCleanup) => {
  const ctrl = new AbortController();
  fetch(url(), { signal: ctrl.signal });
  onCleanup(() => ctrl.abort());
});

effect(() => {
  const value = data();                  // зависимость
  const cfg = untracked(() => config()); // НЕ зависимость
  log(value, cfg);
});

const list = computed(() => filter(items()), {
  equal: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]),
});
\`\`\`

Почему так: в первом эффекте при смене \`url()\` старый запрос **отменяется** до старта нового — иначе гонка, и ответ на устаревший запрос может перезаписать актуальный. Во втором — эффект реагирует на \`data\`, но берёт «текущее» значение \`config\` без подписки на него. В третьем — если \`equal\` вернул \`true\`, значение считается неизменным и зависимые \`computed\`, эффекты и шаблон **не** пересчитываются.

## Зачем это нужно на практике

- **onCleanup** — единственный корректный способ не оставить за собой хвосты при частых перезапусках эффекта: гонки запросов, накопленные \`setInterval\`, живые подписки.
- **untracked** — лечит «эффект перезапускается слишком часто». Разделяем: на что реагируем и что просто читаем. Он же нужен, чтобы внутри \`computed\` безопасно вызвать метод или что-то записать, не втянув лишние зависимости в граф.
- **equal** — лечит «всё пересчитывается, хотя данные те же». Особенно при работе с массивами, которые пересоздаются на каждый запрос: сравнили по содержимому — и весь хвост зависимостей не тронулся, change detection сэкономлен.

## Что сказать на собеседовании

> Колбэк \`effect\` принимает функцию \`onCleanup\`, которая вызывается перед каждым повторным запуском и при уничтожении эффекта — туда кладут \`AbortController.abort\`, \`clearInterval\` и отписки. \`untracked\` нужен потому, что любой сигнал, прочитанный внутри \`effect\`, становится зависимостью: обернув чтение в \`untracked\`, получаем значение, но не подписываемся. У \`signal\` и \`computed\` есть опция \`equal\`: сравнение идёт через \`Object.is\`, поэтому новый массив с тем же содержимым считается изменением, а своя функция сравнения позволяет вернуть \`true\`, и тогда зависимые эффекты и шаблон не пересчитываются.

## Ловушки

- **\`untracked\` не «замораживает» значение** — он вернёт актуальное на момент вызова, просто не создаст зависимость. Частое заблуждение.
- **Тяжёлая \`equal\`-функция** может стоить дороже, чем лишний пересчёт. Глубокое сравнение большого дерева — почти всегда плохая идея.
- **Запись в сигнал внутри \`effect\`** без \`untracked\` легко даёт цикл; Angular ругается на такие записи не просто так.
- **\`onCleanup\` не вызывается для «текущего» запуска** — только перед следующим и при уничтожении. Логика «отменить сейчас» так не пишется.
- **Забыть \`onCleanup\` при \`fetch\`** — классическая гонка: ответ на старый запрос приходит позже нового и затирает свежие данные.
- **\`equal\` не сделает мутацию видимой**: если вы мутируете массив по той же ссылке, сигнал изменения вообще не увидит — тут поможет только новая ссылка.
- Спросят разницу с RxJS: \`untracked\` — это про **граф зависимостей**, а не про «пропустить эмит», аналога \`withLatestFrom\` тут нет, хотя смысл похож.`,
      en: `## In short

Three fine-grained tools of signal reactivity, each solving its own problem.

The analogy is **an assistant who redoes a job whenever the inputs change**. \`onCleanup\` says "before redoing it, cancel what you started last time". \`untracked\` says "glance at the wall clock, but don't subscribe to notifications from it". \`equal\` is the doorman comparing two guest lists and saying "same people, no need to redo the seating".

## The three mechanisms

1. **Cleanup in \`effect\`.** The effect callback receives an \`onCleanup\` function. Whatever you pass into it runs **before every** re-run of the effect and once on destruction. It is the sanctioned place to cancel timers, subscriptions and in-flight HTTP requests.
2. **\`untracked\`.** By default **any** signal read inside an \`effect\` or \`computed\` automatically becomes a dependency. Wrapping the read in \`untracked(() => ...)\` reads the value **without** registering a dependency — a change to it will not re-run the effect.
3. **A custom \`equal\` on \`computed\`.** Signals compare the old and new value with \`Object.is\`. For objects and arrays that means **a new reference holding the same data** counts as a change and drags a recompute down the whole graph. The \`equal\` option supplies your own comparator.

## Example

\`\`\`ts
effect((onCleanup) => {
  const ctrl = new AbortController();
  fetch(url(), { signal: ctrl.signal });
  onCleanup(() => ctrl.abort());
});

effect(() => {
  const value = data();                  // dependency
  const cfg = untracked(() => config()); // NOT a dependency
  log(value, cfg);
});

const list = computed(() => filter(items()), {
  equal: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]),
});
\`\`\`

Why it looks like this: in the first effect, when \`url()\` changes the old request is **aborted** before the new one starts — otherwise you get a race and a stale response can overwrite the fresh one. In the second, the effect reacts to \`data\` but reads the "current" \`config\` without subscribing to it. In the third, if \`equal\` returns \`true\` the value counts as unchanged and dependent \`computed\`s, effects and the template do **not** recompute.

## Why you actually need it

- **onCleanup** is the only correct way not to leave loose ends when an effect re-runs often: request races, piled-up \`setInterval\`s, live subscriptions.
- **untracked** cures "my effect re-runs far too often". It separates what you react to from what you merely read. It is also how you safely call a method or write something inside a \`computed\` without dragging extra dependencies into the graph.
- **equal** cures "everything recomputes even though the data is identical". Especially with arrays rebuilt on every request: compare by content and the whole tail of dependents stays untouched, saving change detection.

## What to say in the interview

> An \`effect\` callback takes an \`onCleanup\` function, invoked before every re-run and on destruction of the effect — that is where \`AbortController.abort\`, \`clearInterval\` and unsubscribes go, so restarted runs do not race each other. \`untracked\` exists because by default any signal read inside an \`effect\` or \`computed\` automatically becomes a dependency: wrapping the read in \`untracked\` gives you the current value without subscribing to it, so there are no superfluous re-runs. It is also used to call a method outside reactive tracking inside a computed. Finally, \`signal\` and \`computed\` accept an \`equal\` option: comparison defaults to \`Object.is\`, so a new array with identical content counts as a change; a custom comparator can return \`true\`, and then dependent computeds, effects and the template do not recompute, which saves change detection. That said, an overly heavy \`equal\` can cost more than the redundant recompute, so it is a question of measurement.

## Gotchas

- **\`untracked\` does not "freeze" the value** — it returns the value current at call time, it just does not create a dependency. A common misconception.
- **A heavy \`equal\` function** can cost more than the extra recompute. Deep-comparing a large tree is almost always a bad idea.
- **Writing to a signal inside an \`effect\`** without \`untracked\` easily creates a loop; Angular complains about such writes for a reason.
- **\`onCleanup\` does not fire for the current run** — only before the next one and on destruction. "Cancel right now" cannot be written this way.
- **Forgetting \`onCleanup\` around a \`fetch\`** is the classic race: the stale response lands after the fresh one and overwrites good data.
- **\`equal\` will not make a mutation visible**: mutate an array under the same reference and the signal sees no change at all — only a new reference helps.
- They will ask how it maps to RxJS: \`untracked\` is about the **dependency graph**, not about skipping an emission — there is no direct \`withLatestFrom\` here, even if the intent rhymes.`,
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
    category: 'angular-signals',
    level: 'Hard',
    tags: ['forms', 'form-array', 'value-changes', 'update-on'],
    question: {
      ru: 'Как работать с FormArray, updateOn и valueChanges в типизированных реактивных формах?',
      en: 'How do you work with FormArray, updateOn and valueChanges in typed reactive forms?',
    },
    answer: {
      ru: `## Коротко

\`FormArray\` — это **список контролов переменной длины**, доступ к элементам по номеру, а не по имени. \`updateOn\` говорит, **когда** контрол обновляет значение и валидируется. \`valueChanges\` — поток, который эмитит эти обновления.

Аналогия: \`FormGroup\` — **печатный бланк** с заранее заданными полями «Имя», «Дата рождения». \`FormArray\` — **нумерованный список**, куда вы дописываете строки ручкой: телефон 1, телефон 2, телефон 3. А \`updateOn\` — это момент, когда кассир пробивает чек: на каждый товар, в конце ленты или только когда вы нажали «оплатить».

## Как это работает по шагам

1. Создаёте массив: \`this.fb.array<FormControl<string>>([])\` — сначала пустой.
2. Добавляете элементы в рантайме: \`push(control)\`, удаляете \`removeAt(i)\`, есть также \`insert\`, \`clear\`, \`at(i)\`.
3. Со строго типизированными формами (Angular 14+) \`FormArray<FormControl<string>>\` даёт типобезопасный \`value: string[]\` — TypeScript знает, что внутри строки.
4. \`nonNullable: true\` (или \`NonNullableFormBuilder\`) убирает \`| null\` из типа и заставляет \`reset()\` возвращать **начальное значение** вместо \`null\`.
5. \`updateOn\` задаёт момент обновления: \`'change'\` (по умолчанию, на каждый ввод), \`'blur'\` (при потере фокуса), \`'submit'\` (только на сабмите). Можно задать на уровне группы — дети унаследуют.
6. \`valueChanges\` эмитит **с учётом** \`updateOn\`, отдавая уже типизированное значение. Рядом есть парный \`statusChanges\` — про валидность.

## Пример

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

\`\`\`ts
new FormControl('', { updateOn: 'blur', validators: [Validators.required] })
\`\`\`

Почему так: геттер \`phones\` нужен, чтобы в шаблоне не писать длинную цепочку и не терять типизацию. А \`updateOn: 'blur'\` резко снижает число прогонов валидаторов — критично, если валидатор асинхронный и ходит на сервер.

## Когда какой updateOn

- **\`'change'\`** — интерактивные подсказки прямо во время ввода: индикатор силы пароля, счётчик символов.
- **\`'blur'\`** — почти всё остальное. Пользователя не ругают, пока он ещё печатает; async-валидаторы стреляют один раз на поле, а не на каждую букву.
- **\`'submit'\`** — длинные формы-«анкеты», где показывать ошибки до нажатия кнопки просто раздражает.

Для \`valueChanges\` с side-эффектами (автосохранение, запрос на сервер) практически всегда нужна связка \`debounceTime\` + \`takeUntilDestroyed\`, иначе получите запрос на каждую нажатую клавишу и утечку подписки.

## Что сказать на собеседовании

> \`FormArray\` — динамическая коллекция контролов по числовому индексу, в отличие от \`FormGroup\` с фиксированным набором именованных полей; его берут для списков переменной длины и управляют через \`push\`, \`removeAt\`, \`clear\`. С типизированными формами из Angular 14 \`FormArray<FormControl<string>>\` даёт \`value: string[]\`, а \`nonNullable\` убирает \`null\` из типа, и \`reset\` возвращает начальное значение. \`updateOn\` определяет момент обновления и валидации — \`change\` по умолчанию, \`blur\` для тяжёлых асинхронных валидаторов. Из практики: \`getRawValue\` включает disabled-контролы, а \`emitEvent: false\` подавляет эмит, чтобы апдейты не зацикливались.

## Ловушки

- **\`disabled\` контролы не попадают в \`value\`.** Классический баг «поле пропало при сабмите» — лечится \`getRawValue()\`.
- **Бесконечный цикл**: в подписке на \`valueChanges\` вызвали \`patchValue\` без \`{ emitEvent: false }\`.
- **\`setValue\` требует ВСЕ поля**, \`patchValue\` — только нужные. Спросят разницу почти наверняка.
- **\`updateOn: 'blur'\` плюс программный \`setValue\`**: значение обновится сразу, стратегия касается пользовательского ввода.
- **\`removeAt\` внутри цикла** по возрастанию индексов сдвигает элементы — идите с конца или пересоберите массив.
- **Подписка без \`takeUntilDestroyed\`** на \`valueChanges\` — утечка при пересоздании компонента.
- Спросят про **современный подход**: значения формы можно поднять в сигнал через \`toSignal(form.valueChanges)\`, но сама форма остаётся RxJS-ориентированной.`,
      en: `## In short

\`FormArray\` is a **variable-length list of controls**, addressed by index rather than by name. \`updateOn\` says **when** a control updates its value and validates. \`valueChanges\` is the stream that emits those updates.

Analogy: \`FormGroup\` is a **printed form** with predefined fields "Name" and "Date of birth". \`FormArray\` is a **numbered list** where you keep writing extra rows by hand: phone 1, phone 2, phone 3. And \`updateOn\` is the moment the cashier rings things up: on every item, at the end of the belt, or only when you hit "pay".

## How it works, step by step

1. You create the array: \`this.fb.array<FormControl<string>>([])\` — empty at first.
2. You add items at runtime with \`push(control)\` and remove with \`removeAt(i)\`; there are also \`insert\`, \`clear\` and \`at(i)\`.
3. With strictly typed forms (Angular 14+), \`FormArray<FormControl<string>>\` yields a type-safe \`value: string[]\` — TypeScript knows the contents are strings.
4. \`nonNullable: true\` (or \`NonNullableFormBuilder\`) strips \`| null\` from the type and makes \`reset()\` restore the **initial value** instead of \`null\`.
5. \`updateOn\` sets the update moment: \`'change'\` (default, on every keystroke), \`'blur'\` (on focus loss), \`'submit'\` (only on submit). Set it on the group and children inherit it.
6. \`valueChanges\` emits **according to** \`updateOn\`, handing you an already typed value. Its sibling \`statusChanges\` covers validity.

## Example

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

\`\`\`ts
new FormControl('', { updateOn: 'blur', validators: [Validators.required] })
\`\`\`

Why it looks like this: the \`phones\` getter keeps the template free of long chains and preserves typing. And \`updateOn: 'blur'\` sharply reduces validator runs — critical when the validator is async and hits the server.

## Which updateOn to choose

- **\`'change'\`** — live hints while typing: a password-strength meter, a character counter.
- **\`'blur'\`** — almost everything else. The user is not scolded while still typing, and async validators fire once per field rather than once per letter.
- **\`'submit'\`** — long questionnaire-style forms where showing errors before the button is pressed is simply annoying.

For \`valueChanges\` with side effects (autosave, a server call) you almost always need \`debounceTime\` plus \`takeUntilDestroyed\`, otherwise you get a request per keystroke and a leaked subscription.

## What to say in the interview

> \`FormArray\` is a dynamic collection of controls addressed by numeric index, unlike \`FormGroup\` with its fixed set of named fields; you use it for variable-length lists — phones, tags, table rows — and manage it with \`push\`, \`removeAt\`, \`insert\` and \`clear\`. With the strictly typed forms introduced in Angular 14, \`FormArray<FormControl<string>>\` gives a type-safe \`value: string[]\`, while the \`nonNullable\` flag or \`NonNullableFormBuilder\` removes \`null\` from the type and makes \`reset\` restore the initial value instead of \`null\`. \`updateOn\` decides when the value updates and validates — \`change\` by default, \`blur\` for heavy async validators, \`submit\` for long forms. From practice it matters that \`getRawValue\` includes disabled controls that are absent from \`value\`, and that \`emitEvent: false\` suppresses the emission so programmatic updates do not loop.

## Gotchas

- **Disabled controls are missing from \`value\`.** The classic "my field vanished on submit" bug — fixed with \`getRawValue()\`.
- **Infinite loop**: calling \`patchValue\` inside a \`valueChanges\` subscription without \`{ emitEvent: false }\`.
- **\`setValue\` requires EVERY field**, \`patchValue\` only the ones you pass. You will almost certainly be asked the difference.
- **\`updateOn: 'blur'\` plus a programmatic \`setValue\`**: the value updates immediately — the strategy governs user input only.
- **\`removeAt\` inside an ascending loop** shifts the remaining items — iterate backwards or rebuild the array.
- **Subscribing to \`valueChanges\` without \`takeUntilDestroyed\`** leaks when the component is recreated.
- They will ask about the **modern approach**: you can lift form values into a signal with \`toSignal(form.valueChanges)\`, but the forms API itself is still RxJS-oriented.`,
    },
    codeSnippet: `this.form.controls.phones.valueChanges
  .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
  .subscribe(phones => this.savePhones(phones)); // phones: string[]`,
  },
  {
    id: 'ng-050',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['router', 'can-deactivate', 'route-reuse-strategy'],
    question: {
      ru: 'Как работают CanDeactivate и RouteReuseStrategy и какие задачи они решают?',
      en: 'How do CanDeactivate and RouteReuseStrategy work, and what problems do they solve?',
    },
    answer: {
      ru: `## Коротко

Оба механизма про **момент ухода с маршрута**, но решают разные задачи.

\`CanDeactivate\` — **вахтёр на выходе**: перед тем как вас выпустить, спрашивает «точно уходите, у вас же несохранённые изменения?» и может навигацию отменить.

\`RouteReuseStrategy\` — **правило гостиницы**: сносить ли номер после выезда или сохранить его как есть и вернуть тому же гостю при следующем заезде. По умолчанию Angular номер сносит; кастомная стратегия позволяет сохранять и восстанавливать целые поддеревья.

## Как это работает по шагам

1. Пользователь инициирует навигацию прочь с текущего маршрута.
2. Роутер собирает гварды \`canDeactivate\` уходящего роута и вызывает их **до** активации нового.
3. Гвард получает **инстанс компонента** — это его особенность: только он из всех гвардов видит компонент, с которого уходят.
4. Возврат \`true\` — уходим; \`false\` — навигация отменяется, адресная строка откатывается; \`UrlTree\` — уходим, но в другое место; можно вернуть \`Observable\`/\`Promise\` и показать модалку.
5. Если ушли, роутер спрашивает \`RouteReuseStrategy\`: \`shouldDetach\` — сохранить ли поддерево? Если да — \`store\` кладёт хендл в вашу мапу.
6. При возврате назад: \`shouldAttach\` — есть ли сохранённое? \`retrieve\` отдаёт хендл, и Angular **восстанавливает** ровно тот же компонент со всем состоянием, вместо создания нового.

## Пример

\`\`\`ts
export const unsavedGuard: CanDeactivateFn<FormComponent> = (cmp) =>
  cmp.form.pristine || confirm('Покинуть без сохранения?');
\`\`\`

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

Почему так: функциональный \`CanDeactivateFn\` заменил старый классовый интерфейс — внутри доступен \`inject()\`, поэтому вместо \`confirm\` легко подставить свой диалоговый сервис. А в стратегии решение сохранять принимается по флагу в \`route.data\`, а не «для всех подряд» — это ключ к тому, чтобы не утечь.

## Зачем кастомная RouteReuseStrategy

По умолчанию Angular переиспользует компонент, **если меняются только параметры одного и того же роута**: с \`/user/1\` на \`/user/2\` компонент не пересоздаётся, а просто эмитит новый \`paramMap\`. За это отвечает \`shouldReuseRoute\`, сравнивающий снапшоты \`future\` и \`curr\`.

Кастомная стратегия нужна, когда надо сохранить состояние **между разными маршрутами**:

- вкладки, между которыми пользователь прыгает туда-сюда, и терять прокрутку/фильтры нельзя;
- результаты поиска: ушли в карточку товара, вернулись назад — список и позиция скролла на месте;
- тяжёлые дашборды, пересоздание которых стоит секунду.

## Что сказать на собеседовании

> \`CanDeactivate\` — гвард, вызываемый перед уходом с маршрута; он единственный получает инстанс компонента и может отменить навигацию, вернув \`false\`, перенаправить её через \`UrlTree\` или вернуть \`Observable\` и дождаться ответа пользователя из модалки. \`RouteReuseStrategy\` отвечает на другой вопрос — пересоздавать ли компонент маршрута: по умолчанию Angular переиспользует его, если поменялись только параметры того же роута. Главный подводный камень: при переиспользовании \`ngOnInit\` повторно не вызывается, поэтому параметры надо читать через подписку на \`paramMap\`.

## Ловушки

- **\`ngOnInit\` не вызовется повторно** при переиспользовании. Читайте параметры через подписку на \`paramMap\`/\`data\`, а не из \`snapshot\` один раз. Это тот самый баг «перешёл на другого юзера, а данные старые».
- **Утечка памяти** в кастомной стратегии: сохранили хендл и никогда не восстановили и не уничтожили. Нужна политика очистки.
- **\`CanDeactivate\` не ловит закрытие вкладки** — для этого нужен \`beforeunload\`. Спрашивают часто.
- **Возврат \`false\` и адресная строка**: при popstate браузер уже сменил URL, роутер откатывает — на старых версиях бывали визуальные артефакты.
- **Устаревшее состояние**: восстановленный компонент показывает данные, которые уже неактуальны. Нужен явный refresh при attach.
- **Гвард с \`confirm()\`** блокирует поток и плохо тестируется — используйте свой диалоговый сервис через \`inject()\`.
- Спросят про **порядок гвардов**: \`canDeactivate\` уходящего роута выполняется **раньше**, чем \`canActivate\` целевого.`,
      en: `## In short

Both mechanisms are about **the moment you leave a route**, but they solve different problems.

\`CanDeactivate\` is the **guard at the exit**: before letting you out it asks "are you sure — you have unsaved changes?" and can cancel the navigation.

\`RouteReuseStrategy\` is the **hotel policy**: do we tear the room down after checkout, or keep it exactly as it was and hand it back to the same guest next time? By default Angular tears it down; a custom strategy lets you store and restore whole subtrees.

## How it works, step by step

1. The user starts navigating away from the current route.
2. The router collects the \`canDeactivate\` guards of the outgoing route and calls them **before** activating the new one.
3. The guard receives the **component instance** — its distinguishing feature: it is the only guard that sees the component you are leaving.
4. Returning \`true\` lets you go; \`false\` cancels the navigation and the address bar rolls back; a \`UrlTree\` sends you somewhere else instead; you can also return an \`Observable\`/\`Promise\` and show a modal.
5. Once you have left, the router asks the \`RouteReuseStrategy\`: \`shouldDetach\` — should this subtree be kept? If yes, \`store\` puts the handle into your map.
6. On the way back: \`shouldAttach\` — is anything stored? \`retrieve\` returns the handle and Angular **restores** that exact component with all its state instead of creating a new one.

## Example

\`\`\`ts
export const unsavedGuard: CanDeactivateFn<FormComponent> = (cmp) =>
  cmp.form.pristine || confirm('Leave without saving?');
\`\`\`

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

Why it looks like this: the functional \`CanDeactivateFn\` replaced the old class interface — \`inject()\` works inside, so swapping \`confirm\` for your own dialog service is trivial. And in the strategy the decision to store is driven by a flag in \`route.data\` rather than "everything, always" — that is the key to not leaking.

## Why a custom RouteReuseStrategy

By default Angular reuses the component **when only the parameters of the same route change**: going from \`/user/1\` to \`/user/2\` does not recreate the component, it just emits a new \`paramMap\`. That decision lives in \`shouldReuseRoute\`, which compares the \`future\` and \`curr\` snapshots.

A custom strategy is for keeping state **across different routes**:

- tabs the user jumps between, where losing scroll position and filters is unacceptable;
- search results: you open a product page, go back, and the list and scroll offset are still there;
- heavy dashboards whose recreation costs a full second.

## What to say in the interview

> \`CanDeactivate\` is a guard invoked before leaving a route; it is the only guard that receives the component instance and it can cancel navigation by returning \`false\`, redirect it by returning a \`UrlTree\`, or return an \`Observable\`/\`Promise\` and wait for the user's answer from a modal. The classic case is warning about unsaved changes. \`RouteReuseStrategy\` answers a different question: whether to recreate the route component. By default Angular reuses it when only that same route's parameters changed — then instead of recreation it simply emits \`paramMap\`, and the decision comes from \`shouldReuseRoute\`. The main pitfall is that on reuse \`ngOnInit\` is not called again, so parameters must be read via a \`paramMap\` subscription rather than once from the snapshot.

## Gotchas

- **\`ngOnInit\` does not run again** on reuse. Read parameters via a \`paramMap\`/\`data\` subscription, not once from \`snapshot\`. This is exactly the "switched user, still showing the old data" bug.
- **Memory leak** in a custom strategy: a handle stored and then never restored nor destroyed. You need an eviction policy.
- **\`CanDeactivate\` does not catch closing the tab** — that needs \`beforeunload\`. Asked often.
- **Returning \`false\` and the address bar**: on popstate the browser already changed the URL and the router rolls it back — older versions had visual artefacts here.
- **Stale state**: the restored component shows data that is no longer current. You need an explicit refresh on attach.
- **A guard using \`confirm()\`** blocks the thread and is awkward to test — use your own dialog service via \`inject()\`.
- They will ask about **guard ordering**: the outgoing route's \`canDeactivate\` runs **before** the target route's \`canActivate\`.`,
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
    category: 'angular-signals',
    level: 'Hard',
    tags: ['router', 'preloading', 'code-splitting'],
    question: {
      ru: 'Какие стратегии preloading бывают и как работает route-level code splitting?',
      en: 'What preloading strategies exist, and how does route-level code splitting work?',
    },
    answer: {
      ru: `## Коротко

Code splitting режет приложение на куски: код каждого ленивого маршрута уезжает в **отдельный чанк**, который скачивается только при переходе на этот маршрут. Preloading убирает главный минус такого подхода — он тихонько **докачивает эти чанки в фоне**, пока пользователь ничего не делает.

Аналогия: **ресторан**. Ленивая загрузка — блюдо начинают готовить только когда вы его заказали: холодильник маленький, но ждать придётся. Preloading — повар в тихий час заранее нарезал заготовки: заказ выносят почти мгновенно, а зал при этом не заставлен готовыми тарелками.

## Как это работает по шагам

1. В роутах пишете \`loadComponent\` или \`loadChildren\` с динамическим \`import()\`.
2. Сборщик видит динамический импорт и **вырезает** этот код из основного бандла в отдельный чанк.
3. Пользователь открывает приложение — качается только основной бандл, старт быстрее.
4. Пользователь переходит на \`/admin\` — только теперь браузер идёт за чанком по сети. Это и есть минус: **первый переход тормозит**.
5. Подключаете preloading в \`provideRouter\` — и роутер, дождавшись, пока приложение станет **стабильным** (то есть после первого рендера), начинает докачивать ленивые чанки в фоне.
6. К моменту реального перехода чанк уже в кэше — переход мгновенный.

## Пример

\`\`\`ts
{
  path: 'admin',
  loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent),
}
\`\`\`

\`\`\`ts
@Injectable()
export class SelectivePreload implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>) {
    return route.data?.['preload'] ? load() : of(null);
  }
}
provideRouter(routes, withPreloading(SelectivePreload))
\`\`\`

Почему так: стратегия — это функция «грузить или нет» для **каждого** ленивого роута. Вернули \`load()\` — качаем, вернули \`of(null)\` — пропускаем. Флаг берём из \`route.data\`, так решение остаётся рядом с описанием маршрута.

## Какую стратегию выбрать

- **\`NoPreloading\`** — дефолт. Ничего не докачивается; подходит, когда трафик дорог или ленивых роутов очень много.
- **\`withPreloading(PreloadAllModules)\`** — качает **всё**. Одна строка, отличный результат для небольших админок; на крупном приложении вы выкачиваете мегабайты, которые пользователь никогда не откроет.
- **Кастомная стратегия** — золотая середина: предзагружаем 2–3 самых вероятных следующих экрана по флагу \`data: { preload: true }\`. Можно смотреть на \`navigator.connection\` (Network Information API) и не качать ничего на медленном или нестабильном соединении.

И отдельно: \`@defer\` и preloading — **разные** инструменты. \`@defer\` откладывает **части шаблона**, preloading работает с **маршрутами**. В реальном приложении их комбинируют.

## Что сказать на собеседовании

> Code splitting на уровне роутов — \`loadComponent\` и \`loadChildren\` с динамическим \`import()\`: сборщик выносит код в отдельный чанк, initial bundle уменьшается. Плата — задержка при первом переходе; её убирает preloading, настраиваемый в \`provideRouter\` через \`withPreloading\`. Из коробки есть \`NoPreloading\` и \`PreloadAllModules\`, который качает все ленивые маршруты в фоне — на большом приложении избыточно. Поэтому чаще пишут свою \`PreloadingStrategy\`, которая решает по флагу в \`route.data\`. Preloading стартует, когда приложение становится стабильным, чтобы не конкурировать за канал с критичными ресурсами.

## Ловушки

- **\`PreloadAllModules\` на большом приложении** — вы качаете всё, включая админку, которую пользователь не увидит. Мобильный трафик скажет спасибо.
- **Общая зависимость в нескольких ленивых роутах** дублируется по чанкам или выносится в common — смотрите на реальную карту бандла, а не на предположения.
- **Не путать preloading с prefetch у \`@defer\`**: разные уровни (маршрут против части шаблона), любимый уточняющий вопрос.
- **Гварды выполняются до загрузки чанка** — тяжёлый \`canActivate\` сведёт выигрыш на нет.
- **Ошибка загрузки чанка после деплоя**: хэши файлов поменялись, старый чанк исчез, навигация падает. Нужен ретрай или мягкая перезагрузка страницы.
- **Слишком мелкая нарезка** роутов даёт десятки запросов вместо одного — накладные расходы съедают выигрыш.
- Спросят про **SSR**: ленивые роуты влияют на границы гидратации, и это надо учитывать при incremental hydration.`,
      en: `## In short

Code splitting slices the app up: the code of each lazy route moves into a **separate chunk** downloaded only when you navigate to that route. Preloading removes the main drawback of that approach — it quietly **fetches those chunks in the background** while the user is doing nothing.

Analogy: a **restaurant**. Lazy loading means the dish is only started once you order it: a small fridge, but you wait. Preloading is the chef prepping ingredients during the quiet hour: the order comes out almost instantly, and the dining room is not cluttered with pre-made plates.

## How it works, step by step

1. In your routes you write \`loadComponent\` or \`loadChildren\` with a dynamic \`import()\`.
2. The bundler sees the dynamic import and **carves** that code out of the main bundle into its own chunk.
3. The user opens the app — only the main bundle is downloaded, so startup is faster.
4. The user navigates to \`/admin\` — only now does the browser fetch the chunk over the network. That is the drawback: **the first navigation stalls**.
5. You enable preloading in \`provideRouter\`, and the router — once the app becomes **stable**, i.e. after the first render — starts fetching lazy chunks in the background.
6. By the time the real navigation happens the chunk is already cached, and the transition is instant.

## Example

\`\`\`ts
{
  path: 'admin',
  loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent),
}
\`\`\`

\`\`\`ts
@Injectable()
export class SelectivePreload implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>) {
    return route.data?.['preload'] ? load() : of(null);
  }
}
provideRouter(routes, withPreloading(SelectivePreload))
\`\`\`

Why it looks like this: a strategy is a "fetch or not" function called for **every** lazy route. Return \`load()\` and it downloads; return \`of(null)\` and it skips. The flag comes from \`route.data\`, so the decision stays next to the route definition.

## Which strategy to pick

- **\`NoPreloading\`** — the default. Nothing is prefetched; fine when bandwidth is expensive or you have a great many lazy routes.
- **\`withPreloading(PreloadAllModules)\`** — fetches **everything**. One line, an excellent result for a small admin app; on a large product you download megabytes the user will never open.
- **A custom strategy** — the sweet spot: preload the two or three most likely next screens via a \`data: { preload: true }\` flag. You can also check \`navigator.connection\` (Network Information API) and fetch nothing on a slow or flaky connection.

And separately: \`@defer\` and preloading are **different** tools. \`@defer\` defers **parts of a template**, preloading works with **routes**. Real apps combine them.

## What to say in the interview

> Route-level code splitting is done with \`loadComponent\` and \`loadChildren\` plus a dynamic \`import()\`: the bundler moves that code into a separate chunk and the initial bundle shrinks. The price is a delay on the first navigation while the chunk travels over the network. Preloading removes it, configured in \`provideRouter\` through \`withPreloading\`. Out of the box there is \`NoPreloading\` by default and \`PreloadAllModules\`, which fetches every lazy route in the background — simple, but excessive on a large app. So people usually write their own \`PreloadingStrategy\`: its \`preload\` method receives the \`Route\` and a load function and decides whether to call it or return \`of(null)\`; the decision typically comes from a flag in \`route.data\`. An important detail: preloading only starts once the app is stable, that is after the first render, so it does not compete for bandwidth with critical resources.

## Gotchas

- **\`PreloadAllModules\` on a large app** downloads everything, including the admin area the user will never see. Mobile data users will not thank you.
- **A shared dependency across several lazy routes** either duplicates across chunks or gets hoisted into a common one — read the real bundle map instead of guessing.
- **Do not confuse preloading with \`@defer\`'s prefetch**: different levels (route versus template part), a favourite follow-up question.
- **Guards run before the chunk loads** — a heavy \`canActivate\` cancels out the gain.
- **Chunk load failures after a deploy**: file hashes changed, the old chunk is gone, navigation throws. You need a retry or a soft page reload.
- **Over-splitting routes** produces dozens of requests instead of one — the overhead eats the benefit.
- They will ask about **SSR**: lazy routes affect hydration boundaries, which matters for incremental hydration.`,
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
    category: 'angular-signals',
    level: 'Expert',
    tags: ['async-pipe', 'pure-pipe', 'memoization'],
    question: {
      ru: 'Как async pipe работает внутри и почему чистые пайпы мемоизируются, а нечистые — нет?',
      en: 'How does the async pipe work internally, and why are pure pipes memoized while impure ones are not?',
    },
    answer: {
      ru: `## Коротко

Пайп по умолчанию **чистый (pure)**: Angular запоминает последний результат и не пересчитывает его, пока не изменилась **ссылка** на входной аргумент. \`pure: false\` эту память отключает, и \`transform\` зовётся на **каждом** проходе change detection.

Аналогия: **калькулятор с памятью**. Спросили «2 + 2» — посчитал и записал ответ на бумажку. Спросили то же самое — просто показал бумажку, не считая заново. Это pure. А нечистый пайп — сотрудник, который на каждый взгляд в его сторону пересчитывает всё с нуля: иногда так надо, но дорого.

## Как это работает по шагам

1. На каждом цикле change detection Angular доходит до выражения с пайпом.
2. Для **pure**-пайпа он сравнивает входные аргументы с прошлыми — по ссылке, через \`Object.is\`.
3. Аргументы те же — \`transform\` **не вызывается вообще**, возвращается сохранённый результат. Это мемоизация на уровне CD, и именно она делает пайпы дешёвыми.
4. Ссылка изменилась — \`transform\` вызывается, результат кэшируется заново.
5. Отсюда важное следствие: **мутация массива без новой ссылки** (\`arr.push(x)\`) pure-пайп **не обновит**. Нужна новая ссылка.
6. Для **impure**-пайпа (\`pure: false\`) шаг сравнения выкидывается: \`transform\` зовётся каждый проход CD. Это нужно пайпам, зависящим от внутреннего состояния или времени: \`async\`, \`json\` для отладки, фильтр по мутируемому массиву. Цена — сотни вызовов в секунду, поэтому \`transform\` обязан быть очень лёгким.

## Пример

\`\`\`html
@if (user$ | async; as user) { {{ user.name }} }
\`\`\`

Почему так: \`as user\` сохраняет результат в переменную шаблона. Без этого приёма каждое повторное \`user$ | async\` в разметке создаст **отдельную подписку** — а для HTTP-потока это отдельный запрос.

## Как устроен AsyncPipe изнутри

\`AsyncPipe\` — нечистый пайп **с состоянием**:

1. При первом \`transform(obs$)\` он **подписывается** на Observable или Promise и запоминает ссылку на источник.
2. На каждое пришедшее значение колбэк сохраняет его в поле и вызывает \`ChangeDetectorRef.markForCheck()\` — помечает view и всех родителей «грязными». Именно поэтому \`async\` корректно работает с OnPush и в zoneless-режиме.
3. Сам \`transform\` при этом возвращает просто **закэшированное последнее значение**. Он вызывается часто, ведь пайп impure, но реальная работа происходит только на новый emit.
4. Если ссылка на источник **сменилась**, пайп **отписывается** от старого и подписывается на новый.
5. В \`ngOnDestroy\` пайпа подписка закрывается — это и есть **автоматическая отписка** без утечек.

## Что сказать на собеседовании

> По умолчанию пайп чистый: \`transform\` вызывается только при смене ссылки на аргумент, результат кэшируется — это мемоизация на уровне change detection. Мутация массива без новой ссылки чистый пайп не обновит. Флаг \`pure: false\` отключает мемоизацию, и \`transform\` вызывается на каждом проходе CD, поэтому он обязан быть лёгким. \`AsyncPipe\` — нечистый пайп с состоянием: подписывается на Observable, на каждое значение дёргает \`ChangeDetectorRef.markForCheck()\`, что критично для OnPush и zoneless, а в \`ngOnDestroy\` закрывает подписку.

## Ловушки

- **\`arr.push()\` и pure-пайп** — экран не обновился. Классика; лечится новой ссылкой (\`[...arr, x]\`).
- **Несколько \`| async\` на один поток** = несколько подписок = несколько HTTP-запросов. Спасает \`as\` или \`shareReplay\`.
- **Тяжёлая логика в impure-пайпе** убивает производительность: он выполняется на каждом проходе CD, а их могут быть сотни.
- **Фильтрация и сортировка в пайпах** — известный антипаттерн; Angular сознательно не даёт \`filter\`/\`orderBy\` из коробки.
- **Пайп с сайд-эффектами** (запрос внутри \`transform\`) непредсказуем: вы не контролируете, сколько раз его вызовут.
- Спросят: **почему \`async\` не течёт** — ответ про \`ngOnDestroy\` самого пайпа и смену источника по ссылке.
- **\`markForCheck\`, а не \`detectChanges\`** — важная деталь: пайп только помечает путь до корня грязным, а не запускает проверку немедленно.`,
      en: `## In short

A pipe is **pure** by default: Angular remembers the last result and does not recompute it until the **reference** of an input argument changes. \`pure: false\` switches that memory off, and \`transform\` runs on **every** change detection pass.

Analogy: **a calculator with memory**. You ask "2 + 2" — it computes and writes the answer on a sticky note. Ask the same again — it just shows the note without recomputing. That is pure. An impure pipe is the colleague who recalculates everything from scratch every time you glance their way: sometimes necessary, always expensive.

## How it works, step by step

1. On every change detection cycle Angular reaches the expression containing the pipe.
2. For a **pure** pipe it compares the input arguments with the previous ones — by reference, via \`Object.is\`.
3. Same arguments — \`transform\` is **not called at all**, the stored result is returned. This is CD-level memoization, and it is exactly what makes pipes cheap.
4. Reference changed — \`transform\` runs and the result is cached anew.
5. Hence the important consequence: **mutating an array without a new reference** (\`arr.push(x)\`) does **not** update a pure pipe. You need a new reference.
6. For an **impure** pipe (\`pure: false\`) the comparison step is dropped: \`transform\` runs on every CD pass. That is required by pipes depending on internal state or time: \`async\`, \`json\` for debugging, a filter over a mutated array. The cost is hundreds of calls per second, so \`transform\` must be extremely cheap.

## Example

\`\`\`html
@if (user$ | async; as user) { {{ user.name }} }
\`\`\`

Why it looks like this: \`as user\` stores the result in a template variable. Without that trick each repeated \`user$ | async\` in the markup creates its **own subscription** — and for an HTTP stream that means another request.

## How AsyncPipe works inside

\`AsyncPipe\` is an impure pipe **with state**:

1. On the first \`transform(obs$)\` it **subscribes** to the Observable or Promise and remembers the source reference.
2. On each incoming value the callback stores it in a field and calls \`ChangeDetectorRef.markForCheck()\` — marking the view and all its ancestors dirty. That is precisely why \`async\` works correctly with OnPush and in zoneless mode.
3. \`transform\` itself merely returns the **cached latest value**. It is called often, since the pipe is impure, but real work only happens on a new emission.
4. If the source reference **changes**, the pipe **unsubscribes** from the old one and subscribes to the new one.
5. In the pipe's \`ngOnDestroy\` the subscription is closed — that is the **automatic unsubscription** with no leaks.

## What to say in the interview

> By default a pipe is pure, and Angular calls its \`transform\` only when the reference of an input argument changes; the result is cached, so this is memoization at the change detection level, which is what makes pipes cheap. The \`pure: false\` flag disables memoization and \`transform\` starts running on every CD pass; that is needed for pipes with internal state or a time dependency, so such a \`transform\` must be as light as possible. \`AsyncPipe\` is exactly that kind of stateful impure pipe: on the first call it subscribes to the Observable or Promise and remembers the reference, on each value it stores the value and calls \`ChangeDetectorRef.markForCheck()\`, which is critical for OnPush and zoneless, while \`transform\` itself just hands back the last cached value. In its own \`ngOnDestroy\` it closes the subscription — hence automatic unsubscription without leaks. A practical nuance: several \`async\` pipes on the same stream create several subscriptions, so the result is extracted via \`as\`.

## Gotchas

- **\`arr.push()\` with a pure pipe** — the screen does not update. A classic; fixed with a new reference (\`[...arr, x]\`).
- **Several \`| async\` on one stream** = several subscriptions = several HTTP requests. Use \`as\` or \`shareReplay\`.
- **Heavy logic in an impure pipe** destroys performance: it runs on every CD pass, and there can be hundreds.
- **Filtering and sorting inside pipes** is a well-known anti-pattern; Angular deliberately ships no built-in \`filter\`/\`orderBy\`.
- **A pipe with side effects** (a request inside \`transform\`) is unpredictable: you do not control how many times it is invoked.
- They will ask **why \`async\` does not leak** — the answer is the pipe's own \`ngOnDestroy\` plus the source-reference swap.
- **\`markForCheck\`, not \`detectChanges\`** — an important detail: the pipe only marks the path to the root dirty, it does not trigger a check immediately.`,
    },
    codeSnippet: `@Pipe({ name: 'filter', pure: false }) // impure: runs every CD pass
export class FilterPipe implements PipeTransform {
  transform(items: Item[], term: string): Item[] {
    return items.filter(i => i.name.includes(term)); // keep this cheap!
  }
}`,
  },
];
