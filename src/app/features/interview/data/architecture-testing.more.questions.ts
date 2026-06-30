import { InterviewQuestion } from '../interfaces/question.interface';

export const ARCHITECTURE_TESTING_QUESTIONS_MORE: InterviewQuestion[] = [
  {
    id: 'arch-041',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['clean-architecture', 'hexagonal', 'ddd'],
    question: {
      ru: 'Как применить чистую/гексагональную архитектуру и DDD-слоение во фронтенде, и где это оправдано?',
      en: 'How do you apply clean/hexagonal architecture and DDD layering on the frontend, and where is it justified?',
    },
    answer: {
      ru: `## Слои
Идея гексагона (ports & adapters) — **изолировать домен от деталей доставки** (UI, HTTP, storage):
- **Domain** — сущности, value-objects, доменные правила. Чистый TypeScript, без Angular/RxJS.
- **Application (use-cases)** — оркестрация: \`PlaceOrderUseCase\` зависит от **портов** (интерфейсов \`OrderRepository\`), а не от \`HttpClient\`.
- **Infrastructure (adapters)** — реализации портов: \`HttpOrderRepository\`, \`LocalStorageCartRepository\`.
- **Presentation** — компоненты/сторы, вызывающие use-cases.

## Направление зависимостей
Всё указывает **внутрь, к домену**. Внешние слои зависят от абстракций, заданных внутренними. Это **dependency inversion**: домен определяет интерфейс репозитория, инфраструктура его реализует и подключается через DI.

## Зачем
- Бизнес-логика тестируется **без TestBed** — чистые unit-тесты, наносекунды.
- Замена REST на GraphQL = новый адаптер, домен не трогаем.
- Явные границы предотвращают «протекание» HTTP-DTO в шаблоны.

## Failure modes / когда НЕ надо
- **Over-engineering**: на CRUD-приложении из 5 форм слои = чистый оверхед и тонны маппинга DTO↔domain.
- **Anemic domain**: если сущности — просто структуры данных, а вся логика в сервисах, вы получили процедурный код в дорогой обёртке.
- Команда без опыта DDD создаёт «неправильные» границы, и рефакторинг хуже, чем плоская структура.

Применяйте на доменно-сложных продуктах (страхование, биллинг, трейдинг), а не на витринах.`,
      en: `## Layers
The hexagon (ports & adapters) idea is to **isolate the domain from delivery details** (UI, HTTP, storage):
- **Domain** — entities, value-objects, business rules. Pure TypeScript, no Angular/RxJS.
- **Application (use-cases)** — orchestration: \`PlaceOrderUseCase\` depends on **ports** (an \`OrderRepository\` interface), not on \`HttpClient\`.
- **Infrastructure (adapters)** — port implementations: \`HttpOrderRepository\`, \`LocalStorageCartRepository\`.
- **Presentation** — components/stores invoking use-cases.

## Dependency direction
Everything points **inward, toward the domain**. Outer layers depend on abstractions defined by inner ones. This is **dependency inversion**: the domain declares the repository interface, infrastructure implements it and is wired via DI.

## Why
- Business logic is tested **without TestBed** — pure unit tests, nanoseconds.
- Swapping REST for GraphQL = a new adapter; the domain stays untouched.
- Explicit boundaries stop HTTP DTOs from leaking into templates.

## Failure modes / when NOT to
- **Over-engineering**: on a 5-form CRUD app the layers are pure overhead and endless DTO↔domain mapping.
- **Anemic domain**: if entities are just data bags and all logic lives in services, you have procedural code in an expensive wrapper.
- A team with no DDD experience draws the wrong boundaries, making refactors worse than a flat structure.

Apply it to domain-rich products (insurance, billing, trading), not to content sites.`,
    },
    codeSnippet: `// domain/order.ts — pure, no framework
export class Order {
  constructor(public readonly id: string, private items: Item[]) {}
  total(): Money { return this.items.reduce((s, i) => s.add(i.price), Money.zero()); }
}

// application/place-order.usecase.ts — depends on a PORT
export interface OrderRepository { save(o: Order): Promise<void>; }
export class PlaceOrderUseCase {
  constructor(private repo: OrderRepository) {}      // inversion
  async exec(order: Order) {
    if (order.total().isZero()) throw new EmptyOrderError();
    await this.repo.save(order);
  }
}

// infrastructure/http-order.repository.ts — ADAPTER
@Injectable()
export class HttpOrderRepository implements OrderRepository {
  constructor(private http: HttpClient) {}
  save(o: Order) { return firstValueFrom(this.http.post('/api/orders', toDto(o))); }
}`,
  },
  {
    id: 'arch-042',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['bff', 'api-gateway', 'system-design'],
    question: {
      ru: 'Что такое Backend-for-Frontend (BFF) и какие проблемы он решает по сравнению с прямыми вызовами микросервисов?',
      en: 'What is the Backend-for-Frontend (BFF) pattern and what problems does it solve versus calling microservices directly?',
    },
    answer: {
      ru: `## Проблема
SPA, обращающийся напрямую к 8 микросервисам, страдает от: **over-/under-fetching**, N+1 round-trips на медленных сетях, утечки внутренней доменной модели в клиент, CORS-ада и дублирования агрегации/авторизации на клиенте.

## Идея BFF
**Отдельный backend на каждый тип клиента** (web, iOS, Android). BFF:
- **Агрегирует** несколько вызовов сервисов в один ответ, заточенный под экран.
- Делает **shape transformation** — отдаёт ровно те поля, что нужны UI.
- Держит **секреты и токены** на сервере (web-BFF хранит сессию в httpOnly-cookie, обменивает её на внутренние токены — клиент не видит access-token).
- Централизует retry/circuit-breaker/кэш.

## Trade-offs
- ✅ Меньше round-trips, тоньше клиент, лучше безопасность (token handler pattern).
- ❌ **Ещё один деплой-юнит** и команда-владелец; риск, что BFF превратится в «толстый» оркестратор с бизнес-логикой (а она должна жить в доменных сервисах).
- ❌ Дублирование BFF на каждый клиент → дрейф логики. GraphQL/BFF-федерация частично решают это.

## Когда НЕ надо
Один web-клиент + хорошо спроектированный API-gateway часто достаточен — BFF добавляет операционную стоимость. Не плодите BFF, если у вас один тип клиента и стабильные контракты. BFF оправдан при множестве платформ с разными потребностями в данных и при необходимости скрыть токены от браузера.`,
      en: `## The problem
A SPA hitting 8 microservices directly suffers from **over-/under-fetching**, N+1 round-trips on slow networks, leaking the internal domain model to the client, CORS hell, and duplicated aggregation/authorization in the browser.

## The BFF idea
**A dedicated backend per client type** (web, iOS, Android). The BFF:
- **Aggregates** several service calls into one screen-shaped response.
- Does **shape transformation** — returns exactly the fields the UI needs.
- Keeps **secrets and tokens** server-side (a web BFF stores the session in an httpOnly cookie and exchanges it for internal tokens — the client never sees the access token).
- Centralizes retry/circuit-breaker/caching.

## Trade-offs
- ✅ Fewer round-trips, thinner client, better security (token-handler pattern).
- ❌ **Another deploy unit** and owning team; risk the BFF becomes a fat orchestrator full of business logic (which belongs in domain services).
- ❌ Duplicating a BFF per client → logic drift. GraphQL / BFF federation partly mitigate this.

## When NOT to
A single web client plus a well-designed API gateway is often enough — a BFF adds operational cost. Don't multiply BFFs if you have one client type and stable contracts. A BFF earns its keep with multiple platforms that have different data needs and when you must hide tokens from the browser.`,
    },
  },
  {
    id: 'arch-043',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['graphql', 'apollo', 'normalized-cache'],
    question: {
      ru: 'GraphQL против REST на клиенте: какие проблемы решает нормализованный кэш Apollo и где он подводит?',
      en: 'GraphQL vs REST on the client: what does Apollo\'s normalized cache solve and where does it bite?',
    },
    answer: {
      ru: `## REST vs GraphQL на клиенте
REST: фиксированные ресурсы → over/under-fetching, версионирование, много эндпоинтов. GraphQL: **клиент описывает форму данных**, один запрос на экран, строгая схема как контракт. Цена — сложность кэша и риск дорогих/N+1 резолверов на сервере.

## Нормализованный кэш Apollo
Apollo разбирает ответ на объекты по \`__typename\` + \`id\` и хранит их **плоско** (как мини-БД), а не по запросам. Эффекты:
- Мутация, вернувшая \`User{id, name}\`, **автоматически обновляет** все экраны с этим пользователем.
- Дедупликация: один объект — одна запись.

## Где подводит (failure modes)
- **Списки не нормализуются волшебно**: после \`addTodo\` новый элемент не появится в кэшированном списке сам — нужен \`update\`-колбэк или \`refetchQueries\`. Классический баг.
- **Объекты без id** (или без выбранного \`id\` в запросе) кэшируются по пути запроса → дубли и рассинхрон. Нужны \`keyFields\`.
- **Пагинация** требует ручных \`merge\`/\`read\` в \`typePolicies\`; иначе страницы затирают друг друга.
- Инвалидция кэша по-прежнему трудна — «one of the two hard problems».

## Когда НЕ брать GraphQL
Простой CRUD с предсказуемыми ресурсами, маленькая команда, или когда HTTP-кэширование/CDN на REST даёт больше выгоды, чем гибкость запросов. Не тащите Apollo ради «модно»; \`fetch\` + RTK Query/TanStack Query часто проще.`,
      en: `## REST vs GraphQL on the client
REST: fixed resources → over/under-fetching, versioning, many endpoints. GraphQL: **the client declares the data shape**, one request per screen, a strict schema as contract. The cost is cache complexity and the risk of expensive/N+1 resolvers server-side.

## Apollo's normalized cache
Apollo splits a response into objects keyed by \`__typename\` + \`id\` and stores them **flat** (a mini database), not per query. Effects:
- A mutation returning \`User{id, name}\` **auto-updates** every screen showing that user.
- Deduplication: one object, one record.

## Where it bites (failure modes)
- **Lists are not magically normalized**: after \`addTodo\` the new item won't appear in a cached list by itself — you need an \`update\` callback or \`refetchQueries\`. A classic bug.
- **Objects without an id** (or without selecting \`id\` in the query) cache by query path → duplicates and drift. You need \`keyFields\`.
- **Pagination** requires manual \`merge\`/\`read\` in \`typePolicies\`; otherwise pages overwrite each other.
- Cache invalidation is still hard — "one of the two hard problems".

## When NOT to pick GraphQL
Simple CRUD with predictable resources, a small team, or when HTTP caching/CDN over REST buys more than query flexibility. Don't adopt Apollo to be trendy; \`fetch\` + RTK Query / TanStack Query is often simpler.`,
    },
    codeSnippet: `const cache = new InMemoryCache({
  typePolicies: {
    User: { keyFields: ['id'] },               // identity for normalization
    Query: {
      fields: {
        feed: {                                 // cursor pagination merge
          keyArgs: ['filter'],
          merge(existing = { items: [] }, incoming) {
            return { ...incoming, items: [...existing.items, ...incoming.items] };
          },
        },
      },
    },
  },
});

// after a mutation, lists need an explicit update — they are NOT auto-inserted
addTodo({
  variables: { text },
  update(cache, { data }) {
    cache.modify({ fields: { todos: (refs = []) => [...refs, data.addTodo] } });
  },
});`,
  },
  {
    id: 'arch-044',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['error-handling', 'error-boundaries', 'resilience'],
    question: {
      ru: 'Как спроектировать глобальную обработку ошибок и устойчивость SPA: ErrorHandler, границы ошибок, деградация?',
      en: 'How do you design global error handling and SPA resilience: ErrorHandler, error boundaries, graceful degradation?',
    },
    answer: {
      ru: `## Уровни обработки
1. **Глобальный \`ErrorHandler\`** (Angular) ловит непойманные синхронные/RxJS-ошибки — единая точка для логирования в Sentry и показа toast. Но он **не локализует** сбой: упавший компонент не «огораживается» сам.
2. **HTTP-интерсептор** — централизованная обработка 401 (refresh/logout), 403, 5xx, сетевых ошибок и retry с backoff для идемпотентных запросов.
3. **Границы ошибок (error boundaries)**: в React — \`componentDidCatch\`/\`<ErrorBoundary>\`, изолирующие поддерево. В Angular нет встроенных — паттерн реализуют через \`@defer (error)\`, обёртку с \`try\`/локальным \`ErrorHandler\`, или ловлю ошибки рендера на уровне роутера.

## Принципы устойчивости
- **Fail soft, not whole-page**: ошибка в виджете «погода» не должна ронять весь дашборд → деградируйте до плейсхолдера.
- Различайте **ожидаемые** (валидация, 404 → доменный поток) и **неожиданные** (баг → ErrorHandler + алерт) ошибки. Не показывайте пользователю stack-trace.
- **Circuit breaker** на флапающий бэкенд: после N ошибок временно отдавайте кэш/фолбэк, не долбите сервис.
- Сетевые сбои → retry с экспоненциальным backoff + jitter, но **только идемпотентные** операции; POST с retry без идемпотентного ключа = двойные заказы.

## Failure modes
- Глобальный \`catchError\`, проглатывающий всё → «тихие» баги. Логируйте всегда.
- Toast на каждую ошибку фонового поллинга → спам. Дедуплицируйте.
- ErrorHandler, бросающий ошибку сам → бесконечный цикл.

## Когда проще
Для маленьких приложений достаточно глобального ErrorHandler + интерсептора; полноценные границы и circuit breaker — для крупных дашбордов с независимыми виджетами.`,
      en: `## Layers of handling
1. **Global \`ErrorHandler\`** (Angular) catches uncaught sync/RxJS errors — one place to log to Sentry and show a toast. But it **does not localize** the failure: a crashed component does not fence itself off.
2. **HTTP interceptor** — centralized handling of 401 (refresh/logout), 403, 5xx, network errors, and retry-with-backoff for idempotent requests.
3. **Error boundaries**: in React, \`componentDidCatch\`/\`<ErrorBoundary>\` isolate a subtree. Angular has none built-in — the pattern is done via \`@defer (error)\`, a wrapper with a local \`ErrorHandler\`, or catching render errors at the router level.

## Resilience principles
- **Fail soft, not whole-page**: an error in a "weather" widget must not crash the whole dashboard → degrade to a placeholder.
- Distinguish **expected** errors (validation, 404 → domain flow) from **unexpected** ones (a bug → ErrorHandler + alert). Never show users a stack trace.
- **Circuit breaker** on a flapping backend: after N failures, temporarily serve cache/fallback instead of hammering the service.
- Network failures → retry with exponential backoff + jitter, but **only idempotent** operations; a POST retried without an idempotency key = double orders.

## Failure modes
- A global \`catchError\` that swallows everything → silent bugs. Always log.
- A toast on every background-poll error → spam. Deduplicate.
- An ErrorHandler that itself throws → infinite loop.

## When simpler is fine
For small apps a global ErrorHandler + interceptor suffices; full boundaries and circuit breakers are for large dashboards with independent widgets.`,
    },
    codeSnippet: `@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private sentry = inject(SentryService);
  private toast = inject(ToastService);
  handleError(error: unknown): void {
    const e = error instanceof HttpErrorResponse ? null : error; // HTTP handled in interceptor
    if (e) { this.sentry.capture(e); this.toast.errorOnce('Something went wrong'); }
    console.error(error);            // never silently swallow
  }
}

// Angular @defer acts as a lightweight error boundary for a subtree:
// @defer (on viewport) { <risky-widget/> } @error { <fallback-placeholder/> }`,
  },
  {
    id: 'arch-045',
    category: 'architecture-testing',
    level: 'Expert',
    tags: ['observability', 'sentry', 'source-maps', 'tracing'],
    question: {
      ru: 'Как выстроить observability фронтенда: Sentry, RUM, source maps, distributed tracing и Core Web Vitals?',
      en: 'How do you build frontend observability: Sentry, RUM, source maps, distributed tracing, and Core Web Vitals?',
    },
    answer: {
      ru: `## Три столпа на фронтенде
- **Errors** (Sentry/Bugsnag): непойманные исключения, unhandledrejection, ошибки фреймворка. Группировка по fingerprint, release-трекинг.
- **RUM (Real User Monitoring)**: реальные **Core Web Vitals** (LCP, INP, CLS) по перцентилям (p75!), не лабораторный Lighthouse. Сегментируйте по устройству/гео/релизу.
- **Tracing**: распределённые трейсы, связывающие клиентский запрос с бэкенд-спанами через \`traceparent\` (W3C Trace Context / OpenTelemetry).

## Source maps — критично
Минифицированный stack-trace бесполезен. Source maps **загружаются в Sentry на этапе CI** (не публикуются на проде — иначе раскрываете исходники). Привязка по \`release\` + \`dist\`. Без корректного release-versioning символикация ломается.

## Distributed tracing
Браузер начинает span на \`fetch\`, прокидывает \`traceparent\` header → бэкенд продолжает тот же trace. Так видно полный путь: «медленный LCP» → конкретный медленный downstream-сервис.

## Failure modes / стоимость
- **PII-утечки**: Sentry по умолчанию шлёт URL, иногда тела. Настройте \`beforeSend\` scrubbing — GDPR.
- **Sampling**: 100% трейсов на проде = огромный счёт. \`tracesSampleRate\` 0.1–0.2 + хвостовое семплирование ошибок.
- **Шум**: ошибки от расширений браузера/ботов (\`ResizeObserver loop\`, \`Script error.\`) → \`ignoreErrors\`/\`denyUrls\`, иначе дашборд бесполезен.
- **Quota/rate limiting** при сторме ошибок маскирует реальную проблему.

## Метрика-цель
Алертить на **регрессию p75 INP/LCP по релизу** и на всплеск error-rate, а не на абсолютные единичные ошибки.`,
      en: `## Three pillars on the frontend
- **Errors** (Sentry/Bugsnag): uncaught exceptions, unhandledrejection, framework errors. Grouped by fingerprint, tied to a release.
- **RUM (Real User Monitoring)**: real **Core Web Vitals** (LCP, INP, CLS) by percentile (p75!), not lab Lighthouse. Segment by device/geo/release.
- **Tracing**: distributed traces linking a client request to backend spans via \`traceparent\` (W3C Trace Context / OpenTelemetry).

## Source maps — critical
A minified stack trace is useless. Source maps are **uploaded to Sentry during CI** (not published to prod — that would expose your source). Tied to \`release\` + \`dist\`. Without correct release versioning, symbolication breaks.

## Distributed tracing
The browser starts a span on \`fetch\`, propagates a \`traceparent\` header → the backend continues the same trace. You can see the full path: "slow LCP" → a specific slow downstream service.

## Failure modes / cost
- **PII leaks**: Sentry sends URLs and sometimes bodies by default. Configure \`beforeSend\` scrubbing — GDPR.
- **Sampling**: 100% of traces in prod = a huge bill. \`tracesSampleRate\` 0.1–0.2 plus tail-sampling of errors.
- **Noise**: browser-extension/bot errors (\`ResizeObserver loop\`, \`Script error.\`) → \`ignoreErrors\`/\`denyUrls\`, or the dashboard is useless.
- **Quota/rate limiting** during an error storm masks the real problem.

## Target metric
Alert on a **per-release p75 INP/LCP regression** and on error-rate spikes, not on isolated absolute errors.`,
    },
    codeSnippet: `Sentry.init({
  dsn: env.dsn,
  release: env.gitSha,                 // must match uploaded source maps
  tracesSampleRate: 0.15,              // distributed tracing sample
  integrations: [Sentry.browserTracingIntegration()],
  tracePropagationTargets: [/^\\/api\\//], // attach traceparent to our API
  ignoreErrors: ['ResizeObserver loop limit exceeded', 'Script error.'],
  beforeSend(event) {                  // scrub PII before it leaves the browser
    if (event.request?.url) event.request.url = stripQuery(event.request.url);
    return event;
  },
});
// CI step (not shipped to prod): sentry-cli sourcemaps upload --release $GIT_SHA ./dist`,
  },
  {
    id: 'arch-046',
    category: 'architecture-testing',
    level: 'Expert',
    tags: ['oauth2', 'oidc', 'pkce', 'token-storage'],
    question: {
      ru: 'Глубоко об аутентификации SPA: OAuth2/OIDC, PKCE, хранение токенов, silent refresh, CSRF.',
      en: 'Deep dive on SPA auth: OAuth2/OIDC, PKCE, token storage, silent refresh, and CSRF.',
    },
    answer: {
      ru: `## Поток для SPA
Современный стандарт — **Authorization Code Flow + PKCE**. Implicit flow устарел (токен в URL-фрагменте, легко украсть). PKCE защищает публичного клиента (нет secret): клиент генерит \`code_verifier\`, шлёт его SHA-256 (\`code_challenge\`); при обмене кода предъявляет verifier — перехваченный код бесполезен без него.

## OIDC поверх OAuth2
OAuth2 = **авторизация** (доступ к API). OIDC добавляет **аутентификацию**: \`id_token\` (JWT) с claims о пользователе. Не используйте \`access_token\` для идентификации — он для ресурсов, не для «кто это».

## Хранение токенов — главный спор
- **localStorage**: доступен любому JS → **уязвим к XSS** (украл скрипт — украл токен). Удобно, но небезопасно.
- **httpOnly + Secure + SameSite cookie**: JS не читает → XSS не крадёт токен, но появляется **CSRF**-вектор. Лучший вариант для web — **BFF/token-handler pattern**: токены живут на BFF, браузер держит только сессионную httpOnly-cookie.
- Компромисс: access-token в памяти (переменная), refresh — в httpOnly-cookie.

## Silent refresh
Короткоживущий access-token (5–15 мин) + refresh. Обновление: **refresh-token rotation** через httpOnly-cookie на бэкенде (не в JS). Старый iframe-silent-renew ломается из-за блокировки third-party cookies.

## CSRF
Возникает только при cookie-based auth. Защита: \`SameSite=Lax/Strict\`, double-submit token, или проверка \`Origin\`. С токеном в заголовке \`Authorization\` CSRF неактуален (но возвращается XSS-риск).

## Вывод
Нет «безопасного localStorage». Выбор — это **XSS-риск vs CSRF-риск**; для серьёзных продуктов берите BFF и не храните токены в JS-доступной памяти дольше необходимого.`,
      en: `## Flow for SPAs
The modern standard is **Authorization Code Flow + PKCE**. Implicit flow is deprecated (token in the URL fragment, easily stolen). PKCE protects a public client (no secret): the client generates a \`code_verifier\`, sends its SHA-256 (\`code_challenge\`); at code exchange it presents the verifier — an intercepted code is useless without it.

## OIDC on top of OAuth2
OAuth2 = **authorization** (API access). OIDC adds **authentication**: an \`id_token\` (JWT) with user claims. Don't use the \`access_token\` for identity — it's for resources, not for "who is this".

## Token storage — the core debate
- **localStorage**: readable by any JS → **vulnerable to XSS** (steal the script, steal the token). Convenient but unsafe.
- **httpOnly + Secure + SameSite cookie**: JS can't read it → XSS can't steal the token, but you introduce a **CSRF** vector. Best for web is the **BFF/token-handler pattern**: tokens live on the BFF, the browser holds only a session httpOnly cookie.
- Compromise: access token in memory (a variable), refresh in an httpOnly cookie.

## Silent refresh
Short-lived access token (5–15 min) + refresh. Renewal via **refresh-token rotation** through a backend httpOnly cookie (not in JS). The old hidden-iframe silent renew breaks under third-party cookie blocking.

## CSRF
Only arises with cookie-based auth. Defenses: \`SameSite=Lax/Strict\`, a double-submit token, or \`Origin\` checks. With a token in the \`Authorization\` header CSRF is moot (but the XSS risk returns).

## Takeaway
There is no "safe localStorage". The choice is **XSS risk vs CSRF risk**; for serious products use a BFF and don't keep tokens in JS-reachable memory longer than necessary.`,
    },
    codeSnippet: `// PKCE: derive the challenge from a random verifier
const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
const challenge = base64url(new Uint8Array(digest));
// authorize: redirect with code_challenge=<challenge>&code_challenge_method=S256
// token exchange: POST code + code_verifier=<verifier>  — proves possession

// Token-handler/BFF: client never touches the access token
// GET /bff/me  ->  cookie: session=<httpOnly>  ->  BFF attaches Bearer to upstream`,
  },
  {
    id: 'arch-047',
    category: 'architecture-testing',
    level: 'Expert',
    tags: ['csp', 'sri', 'supply-chain-security'],
    question: {
      ru: 'Как Content Security Policy, SRI и борьба с supply-chain атаками защищают фронтенд?',
      en: 'How do Content Security Policy, SRI, and supply-chain defenses protect the frontend?',
    },
    answer: {
      ru: `## CSP — защита от XSS «в глубину»
CSP — HTTP-заголовок, ограничивающий, откуда грузятся скрипты/стили/коннекты. Даже при инъекции CSP может **не дать выполниться** чужому скрипту.
- \`script-src 'self'\` блокирует inline и сторонние скрипты. Inline разрешают через **nonce** (\`'nonce-abc'\`, генерится на запрос) или hash — не через \`'unsafe-inline'\`.
- Избегайте \`'unsafe-eval'\` (ломает JIT-шаблоны, но Angular AOT не требует).
- \`'strict-dynamic'\` + nonce — современный «правильный» CSP, не зависящий от whitelists хостов.
- Начинайте с **\`Content-Security-Policy-Report-Only\`** + report-uri, чтобы не сломать прод, потом включайте enforce.

## SRI (Subresource Integrity)
\`<script integrity="sha384-..." crossorigin>\` — браузер сверяет хэш загруженного файла; если CDN скомпрометирован и подменил файл, скрипт **не выполнится**. Обязательно для скриптов с внешних CDN.

## Supply-chain атаки
Главная угроза 2020-х: вредонос не в вашем коде, а в **зависимости** (\`event-stream\`, \`ua-parser-js\`, typosquatting, hijack мейнтейнера).
- **Lockfile** + \`npm ci\` (никаких плавающих версий в проде).
- **Аудит**: \`npm audit\`, Snyk/Socket в CI; \`--ignore-scripts\` чтобы не давать postinstall-скриптам исполняться.
- **SBOM** (CycloneDX) и provenance/sigstore.
- Минимизируйте дерево зависимостей — каждый transitive-пакет это поверхность атаки.

## Failure modes
- Слишком слабый CSP (\`'unsafe-inline'\`) = театр безопасности.
- SRI на часто-обновляемом CDN-файле ломает загрузку при легитимном обновлении.
- \`npm audit\` тонет в low-severity transitive-шуме → усталость и игнор. Приоритизируйте достижимые уязвимости.`,
      en: `## CSP — defense-in-depth against XSS
CSP is an HTTP header that restricts where scripts/styles/connections may load from. Even with an injection, CSP can **prevent** a foreign script from executing.
- \`script-src 'self'\` blocks inline and third-party scripts. Allow inline via a **nonce** (\`'nonce-abc'\`, generated per request) or a hash — not via \`'unsafe-inline'\`.
- Avoid \`'unsafe-eval'\` (breaks JIT templates, but Angular AOT doesn't need it).
- \`'strict-dynamic'\` + nonce is the modern "correct" CSP, independent of host whitelists.
- Start with **\`Content-Security-Policy-Report-Only\`** + a report-uri so you don't break prod, then enforce.

## SRI (Subresource Integrity)
\`<script integrity="sha384-..." crossorigin>\` — the browser checks the hash of the fetched file; if a CDN is compromised and swaps the file, the script **won't run**. Mandatory for scripts from external CDNs.

## Supply-chain attacks
The dominant 2020s threat: the malware is not in your code but in a **dependency** (\`event-stream\`, \`ua-parser-js\`, typosquatting, maintainer hijack).
- **Lockfile** + \`npm ci\` (no floating versions in prod).
- **Audit**: \`npm audit\`, Snyk/Socket in CI; \`--ignore-scripts\` to stop postinstall scripts running.
- **SBOM** (CycloneDX) and provenance/sigstore.
- Minimize the dependency tree — every transitive package is attack surface.

## Failure modes
- Too-weak a CSP (\`'unsafe-inline'\`) = security theater.
- SRI on a frequently-updated CDN file breaks loading on a legitimate update.
- \`npm audit\` drowns in low-severity transitive noise → fatigue and ignore. Prioritize reachable vulnerabilities.`,
    },
    codeSnippet: `// Strong, nonce-based CSP (set per-response on the server):
// Content-Security-Policy:
//   default-src 'self';
//   script-src 'self' 'nonce-r4Nd0m' 'strict-dynamic';
//   object-src 'none'; base-uri 'self';
//   report-to csp-endpoint
<script nonce="r4Nd0m" src="/main.js"></script>

<!-- SRI pins the exact bytes of a CDN asset -->
<script src="https://cdn.example.com/lib.js"
        integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
        crossorigin="anonymous"></script>`,
  },
  {
    id: 'arch-048',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['performance-budgets', 'lighthouse-ci', 'pipeline'],
    question: {
      ru: 'Как внедрить performance budgets и Lighthouse CI в пайплайн, чтобы предотвращать регрессии производительности?',
      en: 'How do you enforce performance budgets and Lighthouse CI in the pipeline to prevent perf regressions?',
    },
    answer: {
      ru: `## Зачем бюджеты
Производительность деградирует **постепенно**: +10 КБ тут, +1 зависимость там. Performance budget — это **жёсткий потолок** (размер бандла, LCP, TBT), нарушение которого **ломает CI**, делая регрессию видимой в PR, а не в проде через месяц.

## Два уровня бюджетов
1. **Bundle budgets** (быстро, детерминированно): в Angular — \`budgets\` в \`angular.json\` (\`maximumError\` на initial и на компонентные стили). Ловит «случайно затащил moment.js».
2. **Lighthouse CI** (метрики): прогон LHCI на каждый PR, ассерты на \`largest-contentful-paint\`, \`total-blocking-time\`, \`cumulative-layout-shift\`, performance-score.

## Как встроить
- LHCI поднимает превью-сборку, гоняет несколько раз (медиана — Lighthouse шумный), сравнивает с бюджетом из \`lighthouserc.js\`. \`assertions\` с \`error\`/\`warn\`.
- Лучше мерить **лабораторно + детерминированно** в CI (стабильный CPU/сеть throttling), а тренды — через RUM в проде. Лаборатория ловит регрессии, RUM показывает реальность.

## Failure modes
- **Флакость**: Lighthouse в шумном CI-раннере даёт ±5–10 баллов → ложные падения. Решение: median of N, warn вместо error на нестабильных метриках, выделенный раннер.
- **Бюджет «на отвал»**: слишком щедрый потолок ничего не ловит; слишком жёсткий — все его отключают. Калибруйте от текущего значения + небольшой запас, ужесточайте постепенно (ratchet).
- Только score, без per-metric ассертов → можно «компенсировать» падение одной метрики ростом другой.

## Когда хватит малого
Для лендинга достаточно bundle-budget; LHCI окупается на продуктовых SPA с командой и историей регрессий.`,
      en: `## Why budgets
Performance decays **gradually**: +10 KB here, +1 dependency there. A performance budget is a **hard ceiling** (bundle size, LCP, TBT) whose breach **fails CI**, making the regression visible in the PR rather than in prod a month later.

## Two budget levels
1. **Bundle budgets** (fast, deterministic): in Angular, \`budgets\` in \`angular.json\` (\`maximumError\` on initial and on component styles). Catches "accidentally pulled in moment.js".
2. **Lighthouse CI** (metrics): run LHCI per PR, assert on \`largest-contentful-paint\`, \`total-blocking-time\`, \`cumulative-layout-shift\`, and the performance score.

## How to wire it
- LHCI boots a preview build, runs several times (median — Lighthouse is noisy), compares against the budget in \`lighthouserc.js\`. \`assertions\` with \`error\`/\`warn\`.
- Prefer **lab + deterministic** measurement in CI (stable CPU/network throttling); track trends via prod RUM. Lab catches regressions, RUM shows reality.

## Failure modes
- **Flakiness**: Lighthouse on a noisy CI runner swings ±5–10 points → false failures. Fix: median of N, warn (not error) on unstable metrics, a dedicated runner.
- **Toothless budget**: too generous catches nothing; too strict and everyone disables it. Calibrate from the current value plus a small margin, then ratchet down gradually.
- Score-only, no per-metric asserts → a drop in one metric can be "compensated" by another rising.

## When less is enough
For a landing page a bundle budget suffices; LHCI pays off on product SPAs with a team and a history of regressions.`,
    },
    codeSnippet: `// angular.json — hard bundle budget, fails the build
"budgets": [
  { "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" },
  { "type": "anyComponentStyle", "maximumError": "6kb" }
]

// lighthouserc.js — metric budgets in CI
module.exports = {
  ci: {
    collect: { numberOfRuns: 3 },                 // median; Lighthouse is noisy
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-blocking-time':      ['error', { maxNumericValue: 300 }],
        'cumulative-layout-shift':  ['warn',  { maxNumericValue: 0.1 }],
      },
    },
  },
};`,
  },
  {
    id: 'arch-049',
    category: 'architecture-testing',
    level: 'Medium',
    tags: ['storybook', 'component-driven', 'design-tokens'],
    question: {
      ru: 'Что даёт Storybook и component-driven development, и как сюда вписываются design tokens?',
      en: 'What do Storybook and component-driven development give you, and how do design tokens fit in?',
    },
    answer: {
      ru: `## Component-Driven Development (CDD)
Строим UI **снизу вверх**: сначала изолированные «глупые» компоненты, потом композиция. Storybook — каталог, где компонент рендерится в **изоляции от приложения, роутинга и бэкенда**, со всеми состояниями (loading, error, empty, RTL, тёмная тема) как отдельными «stories».

## Зачем
- **Параллельная работа**: дизайн/верстка идёт без готового API (мокаем пропсы).
- **Визуальная документация** живая, не устаревший Confluence.
- База для **visual regression** (Chromatic/Percy) и **accessibility** (a11y-аддон, axe).
- **Interaction tests** (\`play\`-функции) прямо на stories — клики/ввод без полного e2e.

## Design tokens
Токены — **единый источник истины** для дизайн-значений (цвета, отступы, типографика, радиусы) в виде платформо-независимых данных (JSON), из которых **генерируются** CSS custom properties, SCSS-переменные, иногда нативные платформы (через Style Dictionary). Это разрывает связь «значение захардкожено в компоненте» → тему/ребрендинг меняем в одном месте, поддержка тёмной темы через переопределение токенов.

## Failure modes
- **Drift**: stories устаревают, если их не гонять в CI → мёртвая документация. Включайте Storybook в pipeline.
- Дубли логики: бизнес-моки в stories расходятся с реальностью.
- Токены без дисциплины → «magic colors» в обход системы; нужен lint, запрещающий хардкод hex.
- Для крошечного приложения Storybook — лишняя инфраструктура; окупается на design-system / многокомандных продуктах.`,
      en: `## Component-Driven Development (CDD)
Build UI **bottom-up**: isolated "dumb" components first, then composition. Storybook is a catalog where a component renders **isolated from the app, routing, and backend**, with every state (loading, error, empty, RTL, dark theme) as a separate "story".

## Why
- **Parallel work**: design/markup proceeds without a ready API (mock the props).
- **Living visual documentation**, not stale Confluence.
- A base for **visual regression** (Chromatic/Percy) and **accessibility** (the a11y addon, axe).
- **Interaction tests** (\`play\` functions) right on stories — clicks/typing without full e2e.

## Design tokens
Tokens are the **single source of truth** for design values (colors, spacing, typography, radii) as platform-agnostic data (JSON) from which CSS custom properties, SCSS variables, and sometimes native platforms are **generated** (via Style Dictionary). This breaks the "value hardcoded in the component" link → theming/rebranding changes in one place, and dark theme is a token override.

## Failure modes
- **Drift**: stories rot if not run in CI → dead docs. Put Storybook in the pipeline.
- Logic duplication: business mocks in stories diverge from reality.
- Tokens without discipline → "magic colors" bypassing the system; you need lint forbidding hardcoded hex.
- For a tiny app Storybook is excess infrastructure; it pays off on design systems / multi-team products.`,
    },
  },
  {
    id: 'arch-050',
    category: 'architecture-testing',
    level: 'Expert',
    tags: ['contract-testing', 'pact', 'visual-regression'],
    question: {
      ru: 'Что такое contract testing (Pact) и visual regression testing, и какие провалы интеграции они ловят?',
      en: 'What are contract testing (Pact) and visual regression testing, and which integration failures do they catch?',
    },
    answer: {
      ru: `## Проблема, которую решает contract testing
E2E через все сервисы — медленный и хрупкий; mock-и в unit-тестах **могут разойтись с реальным API**, и тогда тесты зелёные, а прод падает. Contract testing проверяет, что **ожидания клиента и возможности провайдера совпадают**, без поднятия всей системы.

## Pact (consumer-driven)
- **Consumer** (фронтенд) в своих тестах описывает ожидаемые запросы/ответы → генерится **pact-файл** (контракт).
- Контракт публикуется в **Pact Broker**.
- **Provider** (бэкенд) в своём CI **верифицирует** контракт против реальной реализации.
- Бэкенд не может «тихо» сломать поле, которое нужно фронту — верификация провайдера упадёт. Это ловит интеграционные регрессии **на стороне провайдера до деплоя**.

## Когда НЕ Pact
Для публичного API с тысячами неизвестных потребителей consumer-driven не работает (контракты пишет потребитель) → используйте provider-driven схему/OpenAPI + schema-валидацию. Pact силён при немногих известных потребителях в одной организации.

## Visual regression testing
Скриншот компонента/страницы сравнивается с baseline по пикселям/диффу (Chromatic, Percy, Playwright \`toHaveScreenshot\`). Ловит то, что **функциональные тесты не видят**: сломанный CSS, наезд элементов, регрессию темы, неверный шрифт.

## Failure modes
- **Flaky-скриншоты**: антиалиасинг, шрифты, анимации, дата/время → ложные диффы. Решение: маскировать динамику, фиксировать вьюпорт/шрифты, пиксельный threshold, детерминированные данные.
- Огромный объём baseline-апдейтов → «rubber-stamp» аппрувы, теряется смысл.
- Pact-broker без \`can-i-deploy\` гейта = контракты есть, но никто не блокирует несовместимый деплой.`,
      en: `## The problem contract testing solves
End-to-end across all services is slow and brittle; mocks in unit tests **can drift from the real API**, so tests stay green while prod breaks. Contract testing verifies that **consumer expectations and provider capabilities match**, without standing up the whole system.

## Pact (consumer-driven)
- The **consumer** (frontend) describes expected requests/responses in its tests → a **pact file** (contract) is generated.
- The contract is published to a **Pact Broker**.
- The **provider** (backend) **verifies** the contract against its real implementation in its CI.
- The backend can't silently break a field the frontend needs — provider verification fails. This catches integration regressions **on the provider side before deploy**.

## When NOT Pact
For a public API with thousands of unknown consumers, consumer-driven doesn't work (consumers author contracts) → use a provider-driven schema/OpenAPI + schema validation. Pact shines with a few known consumers inside one organization.

## Visual regression testing
A screenshot of a component/page is compared to a baseline by pixels/diff (Chromatic, Percy, Playwright \`toHaveScreenshot\`). It catches what **functional tests can't see**: broken CSS, overlapping elements, a theme regression, a wrong font.

## Failure modes
- **Flaky screenshots**: anti-aliasing, fonts, animations, date/time → false diffs. Fix: mask dynamic regions, pin viewport/fonts, a pixel threshold, deterministic data.
- A flood of baseline updates → rubber-stamp approvals, losing the point.
- A Pact broker without a \`can-i-deploy\` gate = contracts exist but nothing blocks an incompatible deploy.`,
    },
    codeSnippet: `// Consumer (frontend) Pact test — declares the expected interaction
provider.addInteraction({
  state: 'user 42 exists',
  uponReceiving: 'a request for user 42',
  withRequest: { method: 'GET', path: '/users/42' },
  willRespondWith: {
    status: 200,
    body: { id: Matchers.like(42), name: Matchers.like('Ada') }, // shape, not exact value
  },
});
// -> publishes a pact; the provider CI must verify it, and
//    'pact-broker can-i-deploy' gates the release if verification is missing/failing.`,
  },
  {
    id: 'arch-051',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['release-strategy', 'canary', 'semantic-versioning'],
    question: {
      ru: 'Сравните trunk-based, canary, blue-green и feature-branch релизы; как сюда вписываются semver и changesets в монорепо?',
      en: 'Compare trunk-based, canary, blue-green, and feature-branch releases; how do semver and changesets fit in a monorepo?',
    },
    answer: {
      ru: `## Стратегии ветвления
- **Feature branches / Gitflow**: долгоживущие ветки → болезненные merge-конфликты, отложенная интеграция, «integration hell». Подходит для редких релизов/версионируемого ПО.
- **Trunk-based**: все коммитят в \`main\` маленькими порциями, фичи прячутся за **feature flags**. Быстрая интеграция, основа CD. Требует сильного CI и дисциплины (флаги, а не ветки).

## Стратегии деплоя
- **Blue-green**: две идентичные среды; переключаем трафик на «green» целиком; мгновенный rollback переключением назад. Дорого (двойная инфра), но просто.
- **Canary**: выкатываем новую версию **на 1–5% трафика**, следим за метриками/ошибками, постепенно увеличиваем. Ограничивает «радиус поражения», ловит проблемы на реальном трафике. Требует хорошей observability и автоматического rollback по SLO.
- Часто комбинируют: trunk-based + canary.

## Semver и changesets в монорепо
- **Semantic versioning**: MAJOR (breaking) / MINOR (feature) / PATCH (fix). Контракт для потребителей пакетов.
- В монорепо встаёт вопрос: версионировать всё одной версией или независимо. **Changesets** — каждый PR прикладывает changeset (тип бампа + описание); при релизе агрегируется в version-бамп + changelog только затронутых пакетов. Решает «что бампать» детерминированно.

## Failure modes
- Trunk-based **без** флагов и быстрого CI → ломаный \`main\`, блокирующий всех.
- Canary без авто-rollback → деградация тянется, пока человек заметит.
- Forgotten feature flags → технический долг и комбинаторный взрыв состояний.
- Blue-green с stateful-миграциями БД: схема должна быть **forward/backward-compatible**, иначе rollback невозможен.`,
      en: `## Branching strategies
- **Feature branches / Gitflow**: long-lived branches → painful merge conflicts, deferred integration, "integration hell". Fits infrequent releases / versioned software.
- **Trunk-based**: everyone commits to \`main\` in small slices, features hidden behind **feature flags**. Fast integration, the basis of CD. Needs strong CI and discipline (flags, not branches).

## Deployment strategies
- **Blue-green**: two identical environments; switch all traffic to "green"; instant rollback by switching back. Expensive (double infra) but simple.
- **Canary**: roll the new version to **1–5% of traffic**, watch metrics/errors, ramp up gradually. Limits the blast radius, catches issues on real traffic. Needs good observability and automatic rollback on SLO breach.
- Often combined: trunk-based + canary.

## Semver and changesets in a monorepo
- **Semantic versioning**: MAJOR (breaking) / MINOR (feature) / PATCH (fix). A contract for package consumers.
- In a monorepo the question is: one version for everything, or independent. **Changesets** — each PR attaches a changeset (bump type + description); at release these aggregate into a version bump + changelog for only the affected packages. Solves "what to bump" deterministically.

## Failure modes
- Trunk-based **without** flags and fast CI → a broken \`main\` blocking everyone.
- Canary without auto-rollback → degradation drags on until a human notices.
- Forgotten feature flags → tech debt and a combinatorial explosion of states.
- Blue-green with stateful DB migrations: the schema must be **forward/backward-compatible**, or rollback is impossible.`,
    },
  },
  {
    id: 'arch-052',
    category: 'architecture-testing',
    level: 'Medium',
    tags: ['msw', 'http-mocking', 'test-isolation'],
    question: {
      ru: 'Зачем мокать HTTP на сетевом уровне через MSW и как это улучшает изоляцию и устойчивость тестов?',
      en: 'Why mock HTTP at the network layer with MSW, and how does it improve test isolation and robustness?',
    },
    answer: {
      ru: `## Проблема обычных моков
Подмена \`HttpClient\`/\`fetch\` спай-ами завязывает тест на **детали реализации**: переписали слой данных (REST→GraphQL, axios→fetch) — тесты красные, хотя поведение то же. Плюс легко замокать «не то» и пропустить реальный баг сериализации/URL.

## MSW (Mock Service Worker)
MSW перехватывает запросы **на сетевом уровне** — через Service Worker в браузере и через перехват на уровне Node в тестах. Код приложения делает **настоящий \`fetch\`/HttpClient-вызов**; MSW отвечает по объявленным handler-ам.
- Один набор handler-ов переиспользуется в **unit, component (Storybook), e2e и dev-режиме** (работа без бэкенда).
- Тест не знает, *как* приложение делает запрос — проверяется поведение, а не реализация. Рефактор клиента не ломает тесты.

## Изоляция и устойчивость
- **Детерминизм**: нет похода в реальную сеть → нет флака от latency/недоступности.
- **Изоляция**: \`server.resetHandlers()\` после каждого теста сбрасывает переопределения → тесты не «протекают» друг в друга.
- Легко эмулировать **edge-cases**: 500, таймаут, пустой массив, медленный ответ — без хрупких спай-конфигов.

## Failure modes
- Забыли \`resetHandlers()\` в \`afterEach\` → состояние «течёт», тесты зависят от порядка.
- Расхождение handler-ов с реальным API (MSW не валидирует против схемы) → ложная уверенность; сочетайте с contract testing.
- \`onUnhandledRequest: 'bypass'\` маскирует «забытые» эндпоинты → ставьте \`'error'\` в тестах.
- В Node нужен правильный setup для версии (fetch/undici); неверная инициализация — частая причина «не перехватывает».`,
      en: `## The problem with ordinary mocks
Stubbing \`HttpClient\`/\`fetch\` with spies couples tests to **implementation details**: rewrite the data layer (REST→GraphQL, axios→fetch) and tests go red though behavior is unchanged. It's also easy to mock the wrong thing and miss a real serialization/URL bug.

## MSW (Mock Service Worker)
MSW intercepts requests **at the network layer** — via a Service Worker in the browser and via Node-level interception in tests. Application code makes a **real \`fetch\`/HttpClient call**; MSW responds per declared handlers.
- One set of handlers is reused across **unit, component (Storybook), e2e, and dev mode** (running without a backend).
- The test doesn't know *how* the app makes the request — you assert behavior, not implementation. A client refactor doesn't break tests.

## Isolation and robustness
- **Determinism**: no real network hop → no flakiness from latency/outages.
- **Isolation**: \`server.resetHandlers()\` after each test clears overrides → tests don't leak into each other.
- Easy to emulate **edge cases**: 500, timeout, empty array, slow response — without brittle spy configs.

## Failure modes
- Forgetting \`resetHandlers()\` in \`afterEach\` → state leaks, tests depend on order.
- Handlers drifting from the real API (MSW doesn't validate against a schema) → false confidence; pair with contract testing.
- \`onUnhandledRequest: 'bypass'\` hides forgotten endpoints → set \`'error'\` in tests.
- In Node you need the right setup for the version (fetch/undici); wrong init is a common "it doesn't intercept" cause.`,
    },
    codeSnippet: `import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'Ada' })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); // catch forgotten endpoints
afterEach(() => server.resetHandlers());   // isolation: no leakage between tests
afterAll(() => server.close());

it('renders an error state on 500', async () => {
  server.use(http.get('/api/users/:id', () => new HttpResponse(null, { status: 500 })));
  // ... app makes a REAL request; component shows the error path
});`,
  },
  {
    id: 'arch-053',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['flaky-tests', 'signals-testing', 'test-isolation'],
    question: {
      ru: 'Как тестировать сигнальные/zoneless-компоненты и системно бороть flaky-тесты?',
      en: 'How do you test signal-based/zoneless components and systematically tackle flaky tests?',
    },
    answer: {
      ru: `## Тестирование сигналов и zoneless
В zoneless-режиме нет Zone.js, которая «магически» триггерила change detection. В тестах сигналов:
- Сигналы — **синхронны**: \`count.set(1); expect(count()).toBe(1)\` без TestBed.
- Но **рендер** обновляется не сам: после изменения вызывайте \`fixture.detectChanges()\` (или \`await fixture.whenStable()\`), потому что нет zone-хука, который сделает это автоматически.
- \`computed\` — ленив и мемоизирован: проверяйте через чтение, помните про «glitch-free» — промежуточные значения не наблюдаются.
- \`effect()\` исполняется в reactive-контексте; для теста используйте \`TestBed.flushEffects()\`/\`tick\`, иначе ассерт сработает до эффекта.
- \`fakeAsync\` + \`tick()\` для таймеров; для микротасок — \`await fixture.whenStable()\`.

## Источники flaky-тестов
1. **Время/async**: реальные \`setTimeout\`/\`Date.now\`/анимации → \`fakeAsync\`, fake timers, мокать часы.
2. **Порядок и общее состояние**: глобальные синглтоны, не сброшенные моки/стораджи, **общий DOM** → каждый тест должен сам себя готовить и чистить (\`afterEach\` reset, fresh TestBed).
3. **Гонки сети**: реальные запросы/недетерминированный порядок ответов → MSW/HttpTestingController.
4. **Хрупкие селекторы/ожидания**: \`waitFor\` по фактическому условию, не \`sleep(500)\`.

## Системная борьба
- **Изоляция по умолчанию**: тесты должны проходить в любом порядке (\`--shuffle\`/random seed это проверяет).
- **Quarantine + tracking**: флак не «ретраить вслепую» — пометить, починить причину; авто-retry скрывает реальные баги-гонки.
- Детерминизм данных (фиксированный seed, замороженное время).

## Failure mode
\`retries: 3\` в CI как «лекарство» → зелёный CI поверх реальной гонки в проде. Retry — индикатор, не решение.`,
      en: `## Testing signals and zoneless
In zoneless mode there is no Zone.js to "magically" trigger change detection. For signal tests:
- Signals are **synchronous**: \`count.set(1); expect(count()).toBe(1)\` with no TestBed.
- But the **render** doesn't update by itself: after a change call \`fixture.detectChanges()\` (or \`await fixture.whenStable()\`), because no zone hook does it automatically.
- \`computed\` is lazy and memoized: assert via reads, and remember it's "glitch-free" — intermediate values aren't observed.
- \`effect()\` runs in a reactive context; in tests use \`TestBed.flushEffects()\`/\`tick\`, or the assertion fires before the effect.
- \`fakeAsync\` + \`tick()\` for timers; \`await fixture.whenStable()\` for microtasks.

## Sources of flaky tests
1. **Time/async**: real \`setTimeout\`/\`Date.now\`/animations → \`fakeAsync\`, fake timers, mock the clock.
2. **Order and shared state**: global singletons, un-reset mocks/storage, a **shared DOM** → each test must set up and clean up after itself (\`afterEach\` reset, fresh TestBed).
3. **Network races**: real requests / non-deterministic response order → MSW/HttpTestingController.
4. **Brittle selectors/waits**: \`waitFor\` on the actual condition, not \`sleep(500)\`.

## Systematic mitigation
- **Isolation by default**: tests must pass in any order (\`--shuffle\`/random seed proves it).
- **Quarantine + tracking**: don't blindly retry flakes — tag them, fix the cause; auto-retry hides real race bugs.
- Deterministic data (fixed seed, frozen time).

## Failure mode
\`retries: 3\` in CI as a "cure" → green CI over a real race that ships to prod. A retry is a signal, not a solution.`,
    },
    codeSnippet: `it('updates the view after a signal change (zoneless)', () => {
  const fixture = TestBed.createComponent(CounterComponent);
  fixture.detectChanges();                       // initial render
  fixture.componentInstance.count.set(5);        // signal is synchronous...
  expect(fixture.componentInstance.count()).toBe(5);
  fixture.detectChanges();                        // ...but the DOM needs an explicit CD
  expect(fixture.nativeElement.textContent).toContain('5');
});

it('flushes effects deterministically', () => {
  const fixture = TestBed.createComponent(Cmp);
  fixture.componentInstance.value.set(1);
  TestBed.flushEffects();                          // run effects now, no implicit timing
  expect(logSpy).toHaveBeenCalledWith(1);
});`,
  },
];
