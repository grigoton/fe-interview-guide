import { InterviewQuestion } from '../interfaces/question.interface';

export const ARCHITECTURE_TESTING_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'arch-001',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['nx', 'monorepo', 'module-boundaries'],
    question: {
      ru: 'Как в Nx организуются libs и apps, и как enforce-module-boundaries предотвращает архитектурную деградацию?',
      en: 'How are libs and apps organized in Nx, and how does enforce-module-boundaries prevent architectural decay?',
    },
    answer: {
      ru: `## apps vs libs
В Nx **apps — это тонкие оболочки** (deployable units): они собирают вместе фичи и почти не содержат логики. Вся реальная логика живёт в **libs**. Чем больше кода вы выносите в libs, тем лучше работают \`affected\` и кэш.

## Типы библиотек
Принято делить libs по тегам \`type\`:
- \`feature\` — умные компоненты, привязанные к роутингу/состоянию.
- \`ui\` — презентационные, переиспользуемые компоненты.
- \`data-access\` — сервисы, state, HTTP.
- \`util\` — чистые функции без зависимостей от Angular.

И по \`scope\` (домену): \`scope:orders\`, \`scope:shared\`.

## enforce-module-boundaries
ESLint-правило \`@nx/enforce-module-boundaries\` читает теги из \`project.json\` и блокирует недопустимые импорты:
- \`feature\` может зависеть от \`ui/data-access/util\`, но **не наоборот** (\`util\` не должен импортировать \`feature\`).
- \`scope:orders\` не может импортировать \`scope:billing\` напрямую — только через \`scope:shared\`.

\`\`\`json
{ "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:ui","type:data-access","type:util"] }
\`\`\`

## Почему это важно
Без enforcement монорепозиторий быстро превращается в **big ball of mud**: циклические зависимости, нарушение направления зависимостей, невозможность изолированного тестирования. Правило работает на этапе lint/CI, поэтому нарушение ловится до merge.

**Когда НЕ усложнять:** на маленьком проекте (1-2 команды) дробная сетка тегов создаёт трение без пользы — начните с грубого деления и уточняйте по мере роста.`,
      en: `## apps vs libs
In Nx, **apps are thin shells** (deployable units): they wire features together and contain almost no logic. All real logic lives in **libs**. The more code you push into libs, the better \`affected\` and caching work.

## Library types
Libs are conventionally split by a \`type\` tag:
- \`feature\` — smart components bound to routing/state.
- \`ui\` — presentational, reusable components.
- \`data-access\` — services, state, HTTP.
- \`util\` — pure functions with no Angular dependency.

And by \`scope\` (domain): \`scope:orders\`, \`scope:shared\`.

## enforce-module-boundaries
The ESLint rule \`@nx/enforce-module-boundaries\` reads tags from \`project.json\` and blocks illegal imports:
- \`feature\` may depend on \`ui/data-access/util\`, but **not the reverse** (\`util\` must not import \`feature\`).
- \`scope:orders\` cannot import \`scope:billing\` directly — only via \`scope:shared\`.

\`\`\`json
{ "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:ui","type:data-access","type:util"] }
\`\`\`

## Why it matters
Without enforcement a monorepo quickly becomes a **big ball of mud**: cyclic dependencies, violated dependency direction, impossible isolated testing. The rule runs at lint/CI time, so violations are caught before merge.

**When NOT to over-engineer:** on a small project (1-2 teams) a fine-grained tag grid creates friction without payoff — start with coarse splits and refine as you grow.`,
    },
  },
  {
    id: 'arch-002',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['nx', 'affected', 'caching'],
    question: {
      ru: 'Как работает affected-граф и computation caching в Nx, и какие подводные камни кэша?',
      en: 'How do the affected graph and computation caching work in Nx, and what are the caching pitfalls?',
    },
    answer: {
      ru: `## Граф проекта
Nx строит **граф зависимостей проектов** (project graph), анализируя статические импорты и явные \`implicitDependencies\`. \`nx affected\` сравнивает текущий git-diff с базой (\`--base=main\`) и определяет, какие проекты затронуты транзитивно.

## affected
Вместо запуска тестов/сборки по всему репо вы запускаете их только для затронутых проектов:
\`\`\`bash
nx affected -t test build --base=origin/main
\`\`\`
На больших монорепозиториях это сокращает CI с часов до минут.

## Computation caching
Nx хэширует **все входы** задачи: исходники проекта и его зависимостей, версии зависимостей, переменные окружения, флаги команды, версию самого Nx. Если хэш совпадает — берётся результат из локального или remote-кэша (Nx Cloud), задача не выполняется (cache hit).

## Подводные камни
- **Неучтённые входы.** Если задача читает файл/env, не объявленный во входах, кэш отдаст устаревший результат. Решение: точно настроить \`inputs\`/\`namedInputs\`.
- **Недетерминированные сборки** (timestamps, случайные хэши) ломают воспроизводимость кэша.
- **Side-effects вне outputs.** Кэшируются только объявленные \`outputs\`; если задача пишет вне их, при cache hit эти артефакты не восстановятся.
- **Загрязнение remote-кэша** некорректными результатами при misconfiguration — нужен read-only доступ для PR-агентов.

**Вывод:** кэш надёжен ровно настолько, насколько честно описаны входы и выходы.`,
      en: `## Project graph
Nx builds a **project dependency graph** by analyzing static imports plus explicit \`implicitDependencies\`. \`nx affected\` diffs the working tree against a base (\`--base=main\`) and determines which projects are transitively affected.

## affected
Instead of running tests/builds across the whole repo, you run them only for affected projects:
\`\`\`bash
nx affected -t test build --base=origin/main
\`\`\`
On large monorepos this cuts CI from hours to minutes.

## Computation caching
Nx hashes **all inputs** of a task: the project's sources and those of its dependencies, dependency versions, environment variables, command flags, and the Nx version itself. If the hash matches, the result is pulled from local or remote cache (Nx Cloud) and the task is skipped (cache hit).

## Pitfalls
- **Unaccounted inputs.** If a task reads a file/env not declared as an input, the cache returns a stale result. Fix: configure \`inputs\`/\`namedInputs\` precisely.
- **Non-deterministic builds** (timestamps, random hashes) break cache reproducibility.
- **Side-effects outside outputs.** Only declared \`outputs\` are cached; if a task writes elsewhere, those artifacts won't be restored on a cache hit.
- **Remote cache poisoning** from bad results under misconfiguration — PR agents should have read-only access.

**Takeaway:** the cache is only as reliable as the honesty of your declared inputs and outputs.`,
    },
  },
  {
    id: 'arch-003',
    category: 'architecture-testing',
    level: 'Expert',
    tags: ['micro-frontends', 'module-federation', 'version-skew'],
    question: {
      ru: 'Что такое Module Federation и как решается проблема version skew общих зависимостей в микрофронтендах?',
      en: 'What is Module Federation and how is the version-skew problem of shared dependencies solved in micro-frontends?',
    },
    answer: {
      ru: `## Module Federation
Webpack/rspack Module Federation позволяет одному бандлу (**remote**) экспонировать модули, а другому (**host**) загружать их в рантайме, минуя сборку. Это даёт **независимый деплой** команд: каждая команда владеет своим remote.

## Shared dependencies
Ключевая фича — \`shared\`: Angular, RxJS и т.п. помечаются как разделяемые, чтобы не грузить их дважды.
\`\`\`js
shared: { '@angular/core': { singleton: true, strictVersion: true, requiredVersion: '^17.0.0' } }
\`\`\`

## Version skew
Проблема: host на Angular 17, remote собран с Angular 16. Стратегии:
- **singleton: true** — в рантайме грузится одна копия (наибольшая совместимая версия). Риск: если версии несовместимы, ломается DI/zone.
- **strictVersion: true** — при несовместимости бросается ошибка вместо тихой поломки (fail fast).
- **requiredVersion** — ограничивает диапазон.

Для библиотек с глобальным состоянием (Angular, RxJS — особенно из-за \`instanceof\`-проверок и единого \`Zone\`) singleton обязателен. Несколько копий Zone.js или RxJS приводят к трудноуловимым багам.

## Trade-offs
- **Плюсы:** независимый деплой, изоляция команд, частичные релизы.
- **Минусы:** runtime-связанность через shared, сложность отладки, риск version skew, дублирование при отказе от singleton, увеличенная operational-сложность.

**Когда НЕ использовать:** одна команда, единый релизный цикл — монолитный SPA проще и быстрее. MFE окупается при >3-4 автономных командах с разными частотами релизов.`,
      en: `## Module Federation
Webpack/rspack Module Federation lets one bundle (**remote**) expose modules and another (**host**) load them at runtime, bypassing the build. This enables **independent deployment** per team: each team owns its remote.

## Shared dependencies
The key feature is \`shared\`: Angular, RxJS, etc. are marked shareable to avoid loading them twice.
\`\`\`js
shared: { '@angular/core': { singleton: true, strictVersion: true, requiredVersion: '^17.0.0' } }
\`\`\`

## Version skew
Problem: host on Angular 17, remote built with Angular 16. Strategies:
- **singleton: true** — one copy is loaded at runtime (highest compatible version). Risk: if versions are incompatible, DI/zone breaks.
- **strictVersion: true** — throws on incompatibility instead of failing silently (fail fast).
- **requiredVersion** — constrains the range.

For libraries with global state (Angular, RxJS — especially due to \`instanceof\` checks and a single \`Zone\`) singleton is mandatory. Multiple copies of Zone.js or RxJS cause subtle, hard-to-trace bugs.

## Trade-offs
- **Pros:** independent deploy, team isolation, partial releases.
- **Cons:** runtime coupling via shared, harder debugging, version-skew risk, duplication if you drop singleton, increased operational complexity.

**When NOT to use:** a single team with one release cadence — a monolithic SPA is simpler and faster. MFEs pay off with 3-4+ autonomous teams on different release cadences.`,
    },
  },
  {
    id: 'arch-004',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['micro-frontends', 'single-spa', 'isolation'],
    question: {
      ru: 'Сравните single-spa и Module Federation. Как обеспечивается изоляция микрофронтендов?',
      en: 'Compare single-spa and Module Federation. How is micro-frontend isolation achieved?',
    },
    answer: {
      ru: `## single-spa
**single-spa** — это оркестратор жизненного цикла: каждый MFE регистрируется с функциями \`bootstrap/mount/unmount\`, а root-config решает, какой MFE активен по URL. Он **агностичен к сборке** и фреймворку (можно смешивать React, Angular, Vue).

## Module Federation
MF — это механизм **разделения кода на уровне сборки**, а не оркестрации. Часто их комбинируют: single-spa для маршрутизации между MFE + MF для шаринга зависимостей.

## Сравнение
- **single-spa:** сильная сторона — гетерогенные стеки и явный lifecycle; слабая — больше boilerplate, ручной шаринг зависимостей.
- **MF:** сильная — нативный шаринг и lazy-загрузка; слабая — привязка к webpack/rspack, runtime-связанность.

## Изоляция
Истинная изоляция требует усилий, потому что MFE делят один документ:
- **Стили:** Shadow DOM, CSS-модули, или префиксы/scoping, чтобы не было утечек глобального CSS.
- **JS-глобалы:** избегать загрязнения \`window\`; каждая команда — свой namespace.
- **Состояние:** общение через события/CustomEvent или явный shared-store, а не общие mutable-объекты.
- **Падения:** error boundaries вокруг каждого MFE, чтобы краш одного не ронял shell.
- **Zone/DI (Angular):** singleton-шаринг рантайма обязателен.

## Failure mode
Самая частая ошибка — **скрытая глобальная связанность**: один MFE монки-патчит \`window.fetch\` или мутирует общий store, ломая соседей. Лечится дисциплиной контрактов и контрактными тестами на границах.`,
      en: `## single-spa
**single-spa** is a lifecycle orchestrator: each MFE registers with \`bootstrap/mount/unmount\` functions, and a root-config decides which MFE is active per URL. It is **build- and framework-agnostic** (you can mix React, Angular, Vue).

## Module Federation
MF is a **build-time code-sharing** mechanism, not orchestration. They are often combined: single-spa for routing between MFEs + MF for sharing dependencies.

## Comparison
- **single-spa:** strength — heterogeneous stacks and explicit lifecycle; weakness — more boilerplate, manual dependency sharing.
- **MF:** strength — native sharing and lazy loading; weakness — webpack/rspack lock-in, runtime coupling.

## Isolation
True isolation takes effort because MFEs share one document:
- **Styles:** Shadow DOM, CSS modules, or prefixing/scoping to prevent global CSS leakage.
- **JS globals:** avoid polluting \`window\`; each team gets its namespace.
- **State:** communicate via events/CustomEvent or an explicit shared store, not shared mutable objects.
- **Crashes:** error boundaries around each MFE so one crash doesn't take down the shell.
- **Zone/DI (Angular):** singleton runtime sharing is mandatory.

## Failure mode
The most common failure is **hidden global coupling**: one MFE monkey-patches \`window.fetch\` or mutates a shared store, breaking neighbors. The cure is contract discipline and contract tests at the boundaries.`,
    },
  },
  {
    id: 'arch-005',
    category: 'architecture-testing',
    level: 'Medium',
    tags: ['design-patterns', 'container-presentational'],
    question: {
      ru: 'Объясните паттерн smart/dumb (container/presentational) в Angular. Когда он начинает мешать?',
      en: 'Explain the smart/dumb (container/presentational) pattern in Angular. When does it start to hurt?',
    },
    answer: {
      ru: `## Суть
Компоненты делятся на два типа:
- **Smart (container):** знают о бизнес-логике, инжектят сервисы/state, оркестрируют данные. Часто привязаны к роуту.
- **Dumb (presentational):** получают данные через \`@Input\`/сигналы, эмитят события через \`@Output\`, не знают об источнике данных. Используют \`OnPush\`.

## Зачем
- **Переиспользуемость:** dumb-компоненты не привязаны к контексту.
- **Тестируемость:** presentational тестируются как чистые функции от входов; смарт мокаются на уровне сервисов.
- **Производительность:** dumb с \`OnPush\` и иммутабельными входами минимизируют ререндеры.

## Пример
\`\`\`ts
// dumb
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
class UserCardComponent { @Input() user!: User; @Output() select = new EventEmitter<string>(); }
\`\`\`

## Когда мешает
- **Prop drilling:** при глубокой иерархии передача через 5 уровней \`@Input\`/\`@Output\` становится мучительной — лучше facade/store, доступный нужному уровню.
- **Искусственное дробление:** не каждый компонент стоит делить; для одноразового view-кода это overhead.
- **С сигналами/store** граница размывается: presentational может читать из инжектируемого store напрямую, оставаясь "глупым" по логике.

**Вывод:** это эвристика, а не закон. Применяйте, когда есть выгода от переиспользования и тестируемости, а не из ритуала.`,
      en: `## Essence
Components split into two kinds:
- **Smart (container):** know business logic, inject services/state, orchestrate data. Often route-bound.
- **Dumb (presentational):** receive data via \`@Input\`/signals, emit via \`@Output\`, know nothing about the data source. Use \`OnPush\`.

## Why
- **Reusability:** dumb components aren't tied to context.
- **Testability:** presentational tested as pure functions of inputs; smart ones mock at the service level.
- **Performance:** dumb with \`OnPush\` and immutable inputs minimize re-renders.

## Example
\`\`\`ts
// dumb
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
class UserCardComponent { @Input() user!: User; @Output() select = new EventEmitter<string>(); }
\`\`\`

## When it hurts
- **Prop drilling:** in deep hierarchies, threading through 5 levels of \`@Input\`/\`@Output\` becomes painful — prefer a facade/store available at the needed level.
- **Artificial fragmentation:** not every component is worth splitting; for one-off view code it's overhead.
- **With signals/store** the boundary blurs: a presentational component may read from an injected store directly while staying "dumb" in logic.

**Takeaway:** it's a heuristic, not a law. Apply it where reuse and testability pay off, not as ritual.`,
    },
  },
  {
    id: 'arch-006',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['design-patterns', 'facade', 'state-management'],
    question: {
      ru: 'Что такое Facade-паттерн в Angular-стейте и какие у него плюсы и риски?',
      en: 'What is the Facade pattern in Angular state, and what are its benefits and risks?',
    },
    answer: {
      ru: `## Идея
**Facade** — это инжектируемый сервис, который скрывает детали стейт-менеджмента (NgRx selectors/dispatch, signals, RxJS subjects) за простым API. Компоненты зависят от фасада, а не от store напрямую.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class OrdersFacade {
  readonly orders$ = this.store.select(selectOrders);
  loadOrders() { this.store.dispatch(loadOrders()); }
}
\`\`\`

## Плюсы
- **Инкапсуляция:** компонент не знает про NgRx; можно сменить реализацию (NgRx → signals) без правки компонентов.
- **Упрощённое API:** \`facade.orders$\` вместо selector-импортов везде.
- **Тестируемость:** в тестах подменяется один фасад.
- **Dependency inversion:** компонент зависит от абстракции (фасада), а не от конкретного store.

## Риски
- **God-object:** фасад разрастается, становится свалкой методов всего домена.
- **Лишний слой:** для простого state добавляет boilerplate без выгоды.
- **Сокрытие сложности ≠ устранение:** селекторная логика просто переезжает, и фасад может маскировать неоптимальные подписки.
- **Связывание доменов:** один фасад, тянущий несколько доменов, нарушает разделение.

## Когда применять
Оправдан в крупных приложениях с **NgRx и многими потребителями**, где важна возможность миграции и единая точка входа в домен. Для маленького приложения с парой сигналов фасад — overengineering.`,
      en: `## Idea
A **Facade** is an injectable service that hides state-management details (NgRx selectors/dispatch, signals, RxJS subjects) behind a simple API. Components depend on the facade, not the store directly.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class OrdersFacade {
  readonly orders$ = this.store.select(selectOrders);
  loadOrders() { this.store.dispatch(loadOrders()); }
}
\`\`\`

## Benefits
- **Encapsulation:** the component knows nothing about NgRx; you can swap the implementation (NgRx → signals) without touching components.
- **Simplified API:** \`facade.orders$\` instead of selector imports everywhere.
- **Testability:** mock one facade in tests.
- **Dependency inversion:** the component depends on an abstraction (the facade), not a concrete store.

## Risks
- **God object:** the facade grows into a dumping ground for the whole domain.
- **Extra layer:** for simple state it adds boilerplate with no payoff.
- **Hiding complexity ≠ removing it:** selector logic just moves, and the facade can mask suboptimal subscriptions.
- **Domain coupling:** one facade pulling in multiple domains breaks separation.

## When to use
Justified in large apps with **NgRx and many consumers**, where migration ability and a single domain entry point matter. For a small app with a couple of signals, a facade is over-engineering.`,
    },
  },
  {
    id: 'arch-007',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['solid', 'angular', 'dependency-inversion'],
    question: {
      ru: 'Как принципы SOLID применяются к Angular-приложениям? Дайте конкретные примеры.',
      en: 'How do SOLID principles apply to Angular applications? Give concrete examples.',
    },
    answer: {
      ru: `## S — Single Responsibility
Компонент отвечает только за представление; HTTP, маппинг, бизнес-правила — в сервисах. Симптом нарушения: компонент на 600 строк с \`HttpClient\` внутри.

## O — Open/Closed
Расширяйте поведение через DI-токены и стратегии, а не правкой существующих классов. Пример: \`HTTP_INTERCEPTORS\` — добавляете интерсептор, не трогая \`HttpClient\`.

## L — Liskov Substitution
Любая реализация абстрактного сервиса должна быть взаимозаменяема. Если \`MockAuthService\` ломает контракт \`AuthService\`, тесты лгут.

## I — Interface Segregation
Не заставляйте потребителя зависеть от большого сервиса ради одного метода. Делите на узкие абстракции/токены:
\`\`\`ts
export const LOGGER = new InjectionToken<Logger>('Logger');
\`\`\`

## D — Dependency Inversion
Компоненты/сервисы зависят от **абстракций** (\`InjectionToken\`, \`abstract class\`), а конкретные реализации подставляет DI:
\`\`\`ts
providers: [{ provide: PaymentGateway, useClass: StripeGateway }]
\`\`\`
Это сердце Angular: DI-контейнер — встроенная реализация DIP. Благодаря этому в тестах подставляются фейки, а production-реализацию можно менять конфигурацией.

## Практический эффект
SOLID в Angular даёт **тестируемость** (моки через DI), **гибкость** (смена реализаций) и **локальность изменений**. Главное — не превращать в карго-культ: для тривиального кода абстракции ради абстракций вредны.`,
      en: `## S — Single Responsibility
A component is responsible only for presentation; HTTP, mapping, and business rules belong in services. Violation symptom: a 600-line component with \`HttpClient\` inside.

## O — Open/Closed
Extend behavior via DI tokens and strategies, not by editing existing classes. Example: \`HTTP_INTERCEPTORS\` — add an interceptor without touching \`HttpClient\`.

## L — Liskov Substitution
Any implementation of an abstract service must be interchangeable. If \`MockAuthService\` breaks the \`AuthService\` contract, the tests lie.

## I — Interface Segregation
Don't force a consumer to depend on a large service for one method. Split into narrow abstractions/tokens:
\`\`\`ts
export const LOGGER = new InjectionToken<Logger>('Logger');
\`\`\`

## D — Dependency Inversion
Components/services depend on **abstractions** (\`InjectionToken\`, \`abstract class\`), and DI supplies the concrete implementation:
\`\`\`ts
providers: [{ provide: PaymentGateway, useClass: StripeGateway }]
\`\`\`
This is the heart of Angular: the DI container is a built-in DIP implementation. It lets tests inject fakes and lets you swap the production implementation via configuration.

## Practical effect
SOLID in Angular yields **testability** (mocks via DI), **flexibility** (swappable implementations), and **change locality**. The key is to avoid cargo-culting: abstractions for their own sake hurt trivial code.`,
    },
  },
  {
    id: 'arch-008',
    category: 'architecture-testing',
    level: 'Medium',
    tags: ['folder-structure', 'feature-structure', 'scalability'],
    question: {
      ru: 'Как организовать масштабируемую feature-структуру папок в крупном Angular-приложении?',
      en: 'How do you organize a scalable feature-based folder structure in a large Angular app?',
    },
    answer: {
      ru: `## Feature-first, не type-first
Плохо: группировка по типу (\`components/\`, \`services/\`, \`pipes/\` со всем приложением внутри) — не масштабируется, всё связано со всем.

Хорошо: группировка по **фиче/домену**:
\`\`\`
src/app/
  features/orders/      # smart-компоненты, роутинг, стейт домена
  features/billing/
  shared/ui/            # переиспользуемые dumb-компоненты
  core/                 # singletons: auth, interceptors, config
\`\`\`

## Слои внутри фичи
\`\`\`
orders/
  data-access/   # сервисы, store, модели
  feature/       # smart-компоненты + routing
  ui/            # presentational
  util/
\`\`\`

## Принципы
- **Низкая связанность между доменами:** \`orders\` не импортирует \`billing\` напрямую — только через \`shared\`.
- **\`core\` — для синглтонов**, импортируется один раз.
- **Barrel-файлы (\`index.ts\`)** определяют публичный API фичи; внутреннее не торчит наружу.
- **Lazy-loading по фичам:** каждый домен — отдельный route-чанк.

## Сигналы проблем
- Циклические импорты между фичами → нужна выделенная shared-зона или пересмотр границ.
- \`shared\` превращается в свалку → делите на \`shared/ui\`, \`shared/util\`, \`shared/data-access\`.

## Связь с Nx
В монорепозитории эта структура естественно ложится на **libs с тегами**, и границы enforce-ятся линтером, а не дисциплиной.`,
      en: `## Feature-first, not type-first
Bad: grouping by type (\`components/\`, \`services/\`, \`pipes/\` with the whole app inside) — doesn't scale, everything couples to everything.

Good: group by **feature/domain**:
\`\`\`
src/app/
  features/orders/      # smart components, routing, domain state
  features/billing/
  shared/ui/            # reusable dumb components
  core/                 # singletons: auth, interceptors, config
\`\`\`

## Layers within a feature
\`\`\`
orders/
  data-access/   # services, store, models
  feature/       # smart components + routing
  ui/            # presentational
  util/
\`\`\`

## Principles
- **Low coupling between domains:** \`orders\` doesn't import \`billing\` directly — only via \`shared\`.
- **\`core\` is for singletons**, imported once.
- **Barrel files (\`index.ts\`)** define a feature's public API; internals stay hidden.
- **Lazy-loading per feature:** each domain is its own route chunk.

## Trouble signals
- Cyclic imports between features → you need a dedicated shared zone or a boundary rethink.
- \`shared\` becomes a dumping ground → split into \`shared/ui\`, \`shared/util\`, \`shared/data-access\`.

## Relation to Nx
In a monorepo this structure maps naturally onto **tagged libs**, and boundaries are enforced by the linter, not by discipline.`,
    },
  },
  {
    id: 'arch-009',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['feature-flags', 'release-strategy'],
    question: {
      ru: 'Как реализовать feature flags во фронтенде и какие архитектурные риски они несут?',
      en: 'How do you implement feature flags on the frontend, and what architectural risks do they carry?',
    },
    answer: {
      ru: `## Зачем
Feature flags разделяют **деплой** и **релиз**: код влит, но включается рантайм-флагом. Это даёт canary/постепенный rollout, A/B-тесты, kill switch и trunk-based development без долгих веток.

## Реализация в Angular
- Сервис флагов с источником (LaunchDarkly, Unleash, или собственный конфиг), загружаемый при \`APP_INITIALIZER\`.
- Доступ через сигнал/Observable, структурную директиву или route guard.
\`\`\`ts
@if (flags.isOn('new-checkout')) { <app-new-checkout /> } @else { <app-legacy-checkout /> }
\`\`\`

## Стратегии оценки
- **Client-side** — быстро, но флаг виден в бандле (не для секретов/безопасности).
- **Server-side / edge** — безопаснее, нужно для авторизационных решений.

## Риски
- **Flag debt:** забытые флаги копятся, код ветвится экспоненциально. Нужен процесс удаления (TTL, тикеты на cleanup).
- **Комбинаторный взрыв тестирования:** N флагов = 2^N путей; тестируются только значимые комбинации.
- **Мёртвый код** за выключенными флагами разрастается.
- **Безопасность:** клиентский флаг не скрывает фичу от любопытного пользователя — код в бандле.
- **Производительность:** синхронная загрузка флагов на старте может блокировать рендер.

## Best practices
Различайте короткоживущие release-флаги (удалять быстро) и долгоживущие operational/permission-флаги. Логируйте использование, чтобы находить мёртвые флаги.`,
      en: `## Why
Feature flags decouple **deploy** from **release**: code is merged but switched on by a runtime flag. This enables canary/gradual rollouts, A/B tests, a kill switch, and trunk-based development without long-lived branches.

## Implementation in Angular
- A flags service backed by a source (LaunchDarkly, Unleash, or a custom config), loaded at \`APP_INITIALIZER\`.
- Access via signal/Observable, a structural directive, or a route guard.
\`\`\`ts
@if (flags.isOn('new-checkout')) { <app-new-checkout /> } @else { <app-legacy-checkout /> }
\`\`\`

## Evaluation strategies
- **Client-side** — fast, but the flag is visible in the bundle (not for secrets/security).
- **Server-side / edge** — safer, required for authorization decisions.

## Risks
- **Flag debt:** forgotten flags pile up, branching code grows exponentially. You need a removal process (TTL, cleanup tickets).
- **Test combinatorial explosion:** N flags = 2^N paths; only meaningful combinations get tested.
- **Dead code** behind off flags accumulates.
- **Security:** a client flag doesn't hide a feature from a curious user — the code is in the bundle.
- **Performance:** synchronous flag loading at startup can block render.

## Best practices
Distinguish short-lived release flags (remove fast) from long-lived operational/permission flags. Log usage to find dead flags.`,
    },
  },
  {
    id: 'arch-010',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['state-management', 'decision-making', 'ngrx'],
    question: {
      ru: 'Как выбрать стейт-менеджмент: signals, NgRx, NgRx SignalStore, сервис с RxJS? По каким критериям?',
      en: 'How do you choose state management: signals, NgRx, NgRx SignalStore, an RxJS service? By what criteria?',
    },
    answer: {
      ru: `## Спектр решений
1. **Локальное состояние компонента (signals/RxJS)** — для UI-состояния, не разделяемого вне компонента.
2. **Сервис с сигналами / BehaviorSubject** — для shared-состояния среднего масштаба; минимум boilerplate.
3. **NgRx SignalStore** — структурированный store на сигналах с computed/methods/rxMethod; меньше церемоний, чем классический NgRx.
4. **Классический NgRx (Redux)** — события, редьюсеры, эффекты, devtools, time-travel.

## Критерии выбора
- **Масштаб и число потребителей:** много несвязанных потребителей одного состояния → store.
- **Сложность асинхронных потоков:** много гонок/отмен/координации эффектов → NgRx Effects/rxMethod.
- **Аудит и отладка:** нужны action-лог, time-travel, воспроизводимость → классический NgRx.
- **Командная дисциплина:** строгий event-sourcing полезен большим командам; маленькой — это оверхед.
- **Производительность ререндеров:** сигналы дают точечную реактивность без zone.

## Анти-паттерны
- NgRx ради CRUD-формы — церемония без выгоды.
- Глобальный store для чисто локального UI-состояния.
- Дублирование server state в store вместо использования кэширующего слоя данных.

## Эвристика
Начинайте с **сигналов и сервисов**; вводите NgRx, когда боль от ручной координации (гонки, инвалидация, аудит) превышает стоимость boilerplate. Server-state часто лучше держать в специализированном data-layer, а не в общем store.`,
      en: `## Spectrum of options
1. **Local component state (signals/RxJS)** — for UI state not shared beyond the component.
2. **Service with signals / BehaviorSubject** — for medium-scale shared state; minimal boilerplate.
3. **NgRx SignalStore** — a structured signal-based store with computed/methods/rxMethod; less ceremony than classic NgRx.
4. **Classic NgRx (Redux)** — actions, reducers, effects, devtools, time-travel.

## Selection criteria
- **Scale and number of consumers:** many unrelated consumers of one state → a store.
- **Async flow complexity:** many races/cancellations/effect coordination → NgRx Effects/rxMethod.
- **Audit and debugging:** need action logs, time-travel, reproducibility → classic NgRx.
- **Team discipline:** strict event-sourcing helps big teams; for a small one it's overhead.
- **Re-render performance:** signals give fine-grained reactivity without zone.

## Anti-patterns
- NgRx for a CRUD form — ceremony with no payoff.
- A global store for purely local UI state.
- Duplicating server state in the store instead of using a caching data layer.

## Heuristic
Start with **signals and services**; introduce NgRx when the pain of manual coordination (races, invalidation, audit) exceeds the cost of boilerplate. Server state is often better kept in a dedicated data layer than in a general store.`,
    },
  },
  {
    id: 'arch-011',
    category: 'architecture-testing',
    level: 'Medium',
    tags: ['design-system', 'component-library'],
    question: {
      ru: 'Как спроектировать дизайн-систему и библиотеку компонентов для нескольких команд?',
      en: 'How do you design a design system and component library for multiple teams?',
    },
    answer: {
      ru: `## Слои дизайн-системы
1. **Design tokens** — атомарные значения (цвета, отступы, типографика) как единый источник истины, обычно через CSS custom properties. Тема меняется без пересборки компонентов.
2. **Примитивы** — \`Button\`, \`Input\`, \`Dialog\`: presentational, без бизнес-логики, доступные (a11y) по умолчанию.
3. **Паттерны/композиты** — формы, таблицы из примитивов.

## Принципы
- **API-стабильность:** ломающие изменения компонентов = боль для всех потребителей. Строгий semver, deprecation-период.
- **Доступность встроена:** фокус, ARIA, клавиатура — на уровне примитива, не на потребителе. CDK от Angular даёт harness и a11y-утилиты.
- **Тематизация через токены**, а не форки компонентов.
- **Минимум зависимостей:** библиотека не должна тянуть конкретный state-менеджер.

## Поставка
- В монорепозитории — отдельная \`ui\`-lib с тегами и контролем границ.
- В полиреп — версионированный npm-пакет; нужен строгий процесс релизов.

## Риски
- **Coupling:** компонент с бизнес-логикой нельзя переиспользовать.
- **Версионный скос** между командами при полиреп — кто-то отстаёт на мажоре.
- **Over-abstraction:** слишком гибкий API (десятки пропсов) хуже, чем несколько чётких вариантов.

## Тестирование
Визуальная регрессия (Chromatic/Playwright snapshots), unit на логику взаимодействия, и harness-тесты для контракта.`,
      en: `## Design-system layers
1. **Design tokens** — atomic values (colors, spacing, typography) as a single source of truth, usually via CSS custom properties. Theming changes without rebuilding components.
2. **Primitives** — \`Button\`, \`Input\`, \`Dialog\`: presentational, no business logic, accessible (a11y) by default.
3. **Patterns/composites** — forms, tables built from primitives.

## Principles
- **API stability:** breaking component changes = pain for all consumers. Strict semver, deprecation windows.
- **Accessibility built in:** focus, ARIA, keyboard at the primitive level, not the consumer's. Angular's CDK provides harnesses and a11y utilities.
- **Theme via tokens**, not component forks.
- **Minimal dependencies:** the library shouldn't drag in a specific state manager.

## Delivery
- In a monorepo — a dedicated \`ui\` lib with tags and boundary enforcement.
- In polyrepo — a versioned npm package; you need a strict release process.

## Risks
- **Coupling:** a component with business logic can't be reused.
- **Version skew** between teams in polyrepo — someone lags a major version.
- **Over-abstraction:** an overly flexible API (dozens of props) is worse than a few clear variants.

## Testing
Visual regression (Chromatic/Playwright snapshots), unit tests on interaction logic, and harness tests for the contract.`,
    },
  },
  {
    id: 'arch-012',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['monorepo', 'polyrepo', 'trade-offs'],
    question: {
      ru: 'Монорепозиторий против полирепозиториев: какие trade-offs и когда что выбирать?',
      en: 'Monorepo vs polyrepo: what are the trade-offs and when to choose each?',
    },
    answer: {
      ru: `## Monorepo
Один репозиторий для многих проектов/библиотек.

**Плюсы:**
- **Атомарные изменения** через несколько пакетов в одном PR.
- **Единый тулинг**, версии зависимостей, стандарты.
- **Простой code-sharing** и рефакторинг с глобальной видимостью.
- С Nx/Turborepo — \`affected\`-граф и кэш делают CI быстрым несмотря на размер.

**Минусы:**
- Нужна инфраструктура (Nx, кэш, граф), иначе CI деградирует.
- Риск **жёсткой связанности**, если не enforce-ить границы.
- Контроль доступа на уровне репо грубее.
- Огромная история git, медленные операции без оптимизаций.

## Polyrepo
Репозиторий на проект/команду.

**Плюсы:**
- **Сильная изоляция** и независимые владение/доступы/релизы.
- Простая ментальная модель per-repo.

**Минусы:**
- **Версионный ад** разделяемых пакетов — изменение API требует скоординированных релизов.
- Дублирование тулинга и дрейф стандартов.
- Кросс-репо рефакторинг болезненный.

## Выбор
- **Monorepo** — одна организация, много взаимозависимых фронтенд-проектов, общий дизайн-система/утилиты, желание атомарных рефакторингов.
- **Polyrepo** — слабо связанные продукты, разные организации/комплаенс-границы, независимые жизненные циклы.

**Вывод:** ключевой вопрос — стоимость координации против стоимости изоляции. Monorepo переносит сложность в тулинг; polyrepo — в процессы релизов.`,
      en: `## Monorepo
One repository for many projects/libraries.

**Pros:**
- **Atomic changes** across multiple packages in one PR.
- **Unified tooling**, dependency versions, standards.
- **Easy code-sharing** and refactoring with global visibility.
- With Nx/Turborepo, the \`affected\` graph and cache keep CI fast despite size.

**Cons:**
- Requires infrastructure (Nx, cache, graph) or CI degrades.
- Risk of **tight coupling** if boundaries aren't enforced.
- Repo-level access control is coarser.
- Huge git history, slow operations without optimizations.

## Polyrepo
One repository per project/team.

**Pros:**
- **Strong isolation** with independent ownership/access/releases.
- Simple per-repo mental model.

**Cons:**
- **Versioning hell** for shared packages — an API change needs coordinated releases.
- Duplicated tooling and standards drift.
- Cross-repo refactoring is painful.

## Choosing
- **Monorepo** — one org, many interdependent frontend projects, a shared design system/utilities, desire for atomic refactors.
- **Polyrepo** — loosely coupled products, different orgs/compliance boundaries, independent lifecycles.

**Takeaway:** the core question is coordination cost vs isolation cost. Monorepo pushes complexity into tooling; polyrepo into release processes.`,
    },
  },
  {
    id: 'arch-013',
    category: 'architecture-testing',
    level: 'Medium',
    tags: ['testing-pyramid', 'testing-trophy', 'strategy'],
    question: {
      ru: 'Объясните testing pyramid и testing trophy. Какая модель подходит для фронтенда и почему?',
      en: 'Explain the testing pyramid and the testing trophy. Which model fits the frontend and why?',
    },
    answer: {
      ru: `## Testing Pyramid
Классическая модель (Mike Cohn): много **unit**-тестов внизу, меньше **integration** в середине, минимум **e2e** наверху. Логика: чем выше, тем дороже и медленнее тест, тем он более flaky.

## Testing Trophy
Модель Kent C. Dodds для фронтенда: акцент на **integration**-тестах (самая широкая часть), статика снизу (типы, lint), unit и e2e — тоньше. Девиз: *"Test behavior, not implementation"*.

## Почему trophy для фронтенда
- UI-юниты часто тестируют детали реализации, ломаются при рефакторинге, дают **низкую отдачу на надёжность**.
- Integration-тест компонента с реальным DOM и замоканной сетью проверяет то, что важно пользователю, и устойчив к рефакторингу.
- **Статический анализ** (TS, ESLint) ловит целый класс багов бесплатно — фундамент трофея.

## Что брать
- **Unit** — для чистой логики: утилиты, редьюсеры, форматтеры, алгоритмы.
- **Integration/component** — основной объём: компонент + шаблон + сервисы (замоканные на границе HTTP).
- **e2e** — критичные пользовательские сценарии (happy paths оплаты/логина), немного, из-за стоимости и flakiness.

## Анти-паттерн
**Ice-cream cone** — много e2e, мало unit: медленный, нестабильный CI. Coverage 100% на unit тоже обманчив — он не гарантирует, что фичи работают вместе.`,
      en: `## Testing Pyramid
The classic model (Mike Cohn): many **unit** tests at the bottom, fewer **integration** in the middle, minimal **e2e** at the top. Rationale: higher means costlier, slower, flakier tests.

## Testing Trophy
Kent C. Dodds's frontend model: emphasis on **integration** tests (the widest part), static analysis at the base (types, lint), with unit and e2e thinner. Motto: *"Test behavior, not implementation"*.

## Why the trophy for frontend
- UI unit tests often test implementation details, break on refactoring, and give **low reliability return**.
- An integration test of a component with real DOM and mocked network checks what matters to the user and survives refactoring.
- **Static analysis** (TS, ESLint) catches a whole class of bugs for free — the trophy's base.

## What to use
- **Unit** — for pure logic: utilities, reducers, formatters, algorithms.
- **Integration/component** — the bulk: component + template + services (mocked at the HTTP boundary).
- **e2e** — critical user journeys (checkout/login happy paths), few, due to cost and flakiness.

## Anti-pattern
The **ice-cream cone** — many e2e, few unit: slow, unstable CI. 100% unit coverage is also deceptive — it doesn't guarantee features work together.`,
    },
  },
  {
    id: 'arch-014',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['testbed', 'shallow', 'deep'],
    question: {
      ru: 'Чем отличаются shallow и deep тесты компонентов в Angular TestBed? Какие trade-offs?',
      en: 'What is the difference between shallow and deep component tests in Angular TestBed? What are the trade-offs?',
    },
    answer: {
      ru: `## Deep (integration) тест
Рендерит компонент **со всеми реальными дочерними компонентами**. Проверяет интеграцию шаблона и поведения с детьми.
- **Плюс:** ловит реальные баги взаимодействия, ближе к пользователю.
- **Минус:** хрупкость (падает из-за неполадок в детях), медленнее, тянет много зависимостей в TestBed.

## Shallow тест
Изолирует тестируемый компонент, **заменяя детей заглушками** (mock-компоненты с тем же селектором/Input/Output, либо \`NO_ERRORS_SCHEMA\`).
- **Плюс:** быстро, фокус на логике именно этого компонента, устойчиво к изменениям детей.
- **Минус:** не ловит интеграционные баги; \`NO_ERRORS_SCHEMA\` опасен — глушит реальные ошибки шаблона (опечатки в селекторах проходят молча).

## Пример настройки
\`\`\`ts
TestBed.configureTestingModule({
  imports: [ParentComponent],
  // shallow: подменяем дитя
}).overrideComponent(ParentComponent, { set: { imports: [MockChildComponent] } });
\`\`\`

## Trade-offs
- **\`NO_ERRORS_SCHEMA\` vs mock-компоненты:** схема проще, но скрывает ошибки; явные mock-компоненты безопаснее (ngMocks помогает).
- **Скорость vs реализм:** shallow быстрее, deep реалистичнее.

## Рекомендация
Тестируйте **поведение и контракт** компонента (Input/Output, рендер), а не приватные детали. Используйте shallow для сложной логики родителя и deep для критичных интеграций. Избегайте \`NO_ERRORS_SCHEMA\` как способа "заткнуть" ошибки.`,
      en: `## Deep (integration) test
Renders the component **with all real child components**. Verifies template and behavior integration with children.
- **Pro:** catches real interaction bugs, closer to the user.
- **Con:** fragile (fails due to child issues), slower, pulls many dependencies into TestBed.

## Shallow test
Isolates the component under test, **stubbing children** (mock components with the same selector/Input/Output, or \`NO_ERRORS_SCHEMA\`).
- **Pro:** fast, focused on this component's logic, resilient to child changes.
- **Con:** misses integration bugs; \`NO_ERRORS_SCHEMA\` is dangerous — it silences real template errors (selector typos pass silently).

## Setup example
\`\`\`ts
TestBed.configureTestingModule({
  imports: [ParentComponent],
  // shallow: replace the child
}).overrideComponent(ParentComponent, { set: { imports: [MockChildComponent] } });
\`\`\`

## Trade-offs
- **\`NO_ERRORS_SCHEMA\` vs mock components:** the schema is simpler but hides errors; explicit mock components are safer (ngMocks helps).
- **Speed vs realism:** shallow is faster, deep is more realistic.

## Recommendation
Test the component's **behavior and contract** (Input/Output, rendering), not private details. Use shallow for complex parent logic and deep for critical integrations. Avoid \`NO_ERRORS_SCHEMA\` as a way to "shut up" errors.`,
    },
  },
  {
    id: 'arch-015',
    category: 'architecture-testing',
    level: 'Medium',
    tags: ['test-doubles', 'mocks', 'spies'],
    question: {
      ru: 'В чём разница между dummy, stub, spy, mock и fake? Когда что применять?',
      en: 'What is the difference between dummy, stub, spy, mock, and fake? When to use each?',
    },
    answer: {
      ru: `## Терминология (по Gerard Meszaros)
- **Dummy** — объект, передаваемый только для заполнения параметров; не используется. Пример: \`null\` или пустой объект как неважный аргумент.
- **Stub** — возвращает заранее заданные ответы, чтобы провести тест по нужному пути. Не проверяет взаимодействия.
- **Spy** — оборачивает реальный (или поддельный) объект и **записывает вызовы** (аргументы, число раз) для последующей проверки.
- **Mock** — объект с **заранее заданными ожиданиями**; тест падает, если ожидаемые вызовы не произошли (behaviour verification).
- **Fake** — рабочая, но упрощённая реализация (in-memory репозиторий вместо реальной БД).

## В Jest/Jasmine
Границы размыты: \`jest.fn()\` и \`spyOn\` совмещают spy и stub.
\`\`\`ts
const repo = { save: jest.fn().mockResolvedValue({ id: 1 }) }; // stub + spy
service.create(dto);
expect(repo.save).toHaveBeenCalledWith(dto); // verification — mock-стиль
\`\`\`

## Когда что
- **State verification (stub/fake):** проверяете результат/состояние — устойчивее к рефакторингу.
- **Behaviour verification (mock/spy):** проверяете, что вызов произошёл — нужно для side-effect-зависимостей (логирование, отправка письма), но переусердствование привязывает тест к реализации.

## Анти-паттерн
**Over-mocking** — мокание всего подряд: тест проходит, но проверяет, что код вызывает себя так, как написан, а не что он работает. Предпочитайте fakes и state verification, где возможно.`,
      en: `## Terminology (per Gerard Meszaros)
- **Dummy** — an object passed only to fill parameters; never used. Example: \`null\` or an empty object as an irrelevant argument.
- **Stub** — returns canned answers to drive the test down a path. Doesn't verify interactions.
- **Spy** — wraps a real (or fake) object and **records calls** (args, counts) for later verification.
- **Mock** — an object with **preprogrammed expectations**; the test fails if expected calls don't happen (behaviour verification).
- **Fake** — a working but simplified implementation (in-memory repo instead of a real DB).

## In Jest/Jasmine
The lines blur: \`jest.fn()\` and \`spyOn\` combine spy and stub.
\`\`\`ts
const repo = { save: jest.fn().mockResolvedValue({ id: 1 }) }; // stub + spy
service.create(dto);
expect(repo.save).toHaveBeenCalledWith(dto); // verification — mock style
\`\`\`

## When to use which
- **State verification (stub/fake):** assert the result/state — more refactor-resilient.
- **Behaviour verification (mock/spy):** assert a call happened — needed for side-effect dependencies (logging, sending email), but overusing it couples the test to implementation.

## Anti-pattern
**Over-mocking** — mocking everything: the test passes but verifies that the code calls itself the way it's written, not that it works. Prefer fakes and state verification where possible.`,
    },
  },
  {
    id: 'arch-016',
    category: 'architecture-testing',
    level: 'Expert',
    tags: ['rxjs', 'marble-testing', 'testscheduler'],
    question: {
      ru: 'Что такое marble testing и как тестировать сложные RxJS-потоки через TestScheduler?',
      en: 'What is marble testing and how do you test complex RxJS streams with TestScheduler?',
    },
    answer: {
      ru: `## Идея
Marble testing описывает асинхронные потоки **виртуальным временем** через ASCII-диаграммы ("мраморы"). \`TestScheduler\` синхронно прокручивает время, делая детерминированными даже \`debounceTime\`/\`delay\`.

## Синтаксис мраморов
- \`-\` — один кадр времени (frame).
- \`a\`, \`b\` — эмиссии значений.
- \`|\` — complete, \`#\` — error.
- \`()\` — синхронная группировка в одном кадре.
- \`^\` — точка подписки (для hot observables).

## Почему лучше fakeAsync для RxJS
Marble одновременно описывает **значения, тайминг и завершение** в одной строке и сравнивает их декларативно — это точнее для операторов времени, чем ручной \`tick()\`.

## Пример
\`\`\`ts
testScheduler.run(({ cold, expectObservable }) => {
  const source$ = cold('-a--b--c|', { a: 1, b: 2, c: 3 });
  const result$ = source$.pipe(map(x => x * 10));
  expectObservable(result$).toBe('-a--b--c|', { a: 10, b: 20, c: 30 });
});
\`\`\`

## Тестирование времени
\`\`\`ts
const result$ = source$.pipe(debounceTime(20, testScheduler));
expectObservable(result$).toBe('-----x|', { x: ... });
\`\`\`

## Подводные камни
- В \`testScheduler.run()\` каждый \`-\` = 1 кадр, но **\`debounceTime(20)\`** считается в виртуальных миллисекундах — синхронизируйте единицы.
- Hot vs cold: \`hot()\` для shared-источников с \`^\`, \`cold()\` — для свежей подписки.
- Подписки проверяются через \`expectSubscriptions\` — ловит утечки/неотписки.

**Вывод:** marble — лучший инструмент для операторов времени и сложной композиции; для простых синхронных потоков достаточно обычного \`subscribe\` + assertion.`,
      en: `## Idea
Marble testing describes async streams with **virtual time** via ASCII diagrams ("marbles"). \`TestScheduler\` advances time synchronously, making even \`debounceTime\`/\`delay\` deterministic.

## Marble syntax
- \`-\` — one time frame.
- \`a\`, \`b\` — value emissions.
- \`|\` — complete, \`#\` — error.
- \`()\` — synchronous grouping in one frame.
- \`^\` — subscription point (for hot observables).

## Why better than fakeAsync for RxJS
Marbles describe **values, timing, and completion** in one line and compare them declaratively — more precise for time operators than manual \`tick()\`.

## Example
\`\`\`ts
testScheduler.run(({ cold, expectObservable }) => {
  const source$ = cold('-a--b--c|', { a: 1, b: 2, c: 3 });
  const result$ = source$.pipe(map(x => x * 10));
  expectObservable(result$).toBe('-a--b--c|', { a: 10, b: 20, c: 30 });
});
\`\`\`

## Testing time
\`\`\`ts
const result$ = source$.pipe(debounceTime(20, testScheduler));
expectObservable(result$).toBe('-----x|', { x: ... });
\`\`\`

## Pitfalls
- In \`testScheduler.run()\` each \`-\` = 1 frame, but **\`debounceTime(20)\`** counts in virtual milliseconds — keep units consistent.
- Hot vs cold: \`hot()\` for shared sources with \`^\`, \`cold()\` for a fresh subscription.
- Subscriptions are checked via \`expectSubscriptions\` — catches leaks/missing unsubscribes.

**Takeaway:** marbles are the best tool for time operators and complex composition; for simple synchronous streams a plain \`subscribe\` + assertion suffices.`,
    },
  },
  {
    id: 'arch-017',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['fakeasync', 'tick', 'async-testing'],
    question: {
      ru: 'Как работают fakeAsync, tick и flush в Angular? Чем отличаются от waitForAsync?',
      en: 'How do fakeAsync, tick, and flush work in Angular? How do they differ from waitForAsync?',
    },
    answer: {
      ru: `## fakeAsync
\`fakeAsync\` создаёт зону с **виртуальными часами**: \`setTimeout\`, \`Promise\`, \`setInterval\` ставятся в очередь, а не выполняются реально. Это делает асинхронный тест **синхронным и детерминированным** — без реальных задержек и без флакки.

## tick / flush
- **\`tick(ms)\`** — продвигает виртуальное время на \`ms\`, исполняя все макротаски, чей таймер истёк, и микротаски.
- **\`tick()\`** без аргумента — обрабатывает уже готовые микротаски (промисы).
- **\`flush()\`** — выполняет **все** ожидающие таймеры до опустошения очереди, возвращая прошедшее виртуальное время. Удобно, когда точное число ms неизвестно.
- **\`flushMicrotasks()\`** — только промисы.

\`\`\`ts
it('debounces', fakeAsync(() => {
  let value: string;
  service.search('a'); tick(200);
  service.result$.subscribe(v => value = v);
  flush();
  expect(value!).toBe('result');
}));
\`\`\`

## Подводные камни
- **\`tick()\` падает**, если осталась незавершённая периодическая задача (\`setInterval\`) — нужно \`discardPeriodicTasks()\`.
- **\`XHR\`/реальный fetch** нельзя «тикнуть» — fakeAsync не контролирует настоящий I/O, нужен \`HttpTestingController\`.

## waitForAsync (бывш. async)
\`waitForAsync\` НЕ использует виртуальное время. Он оборачивает тест в зону, отслеживает все асинхронные задачи и завершает тест, когда они стабилизируются (\`fixture.whenStable()\`). Подходит для реальных промисов, когда виртуальное время не нужно.

## Когда что
- **fakeAsync** — таймеры, debounce, контролируемый тайминг, синхронные ассерты.
- **waitForAsync** — реальные промисы/template-bindings без необходимости управлять временем.`,
      en: `## fakeAsync
\`fakeAsync\` creates a zone with a **virtual clock**: \`setTimeout\`, \`Promise\`, \`setInterval\` are queued rather than really executed. This makes an async test **synchronous and deterministic** — no real delays, no flakiness.

## tick / flush
- **\`tick(ms)\`** — advances virtual time by \`ms\`, running all macrotasks whose timer elapsed plus microtasks.
- **\`tick()\`** without args — processes ready microtasks (promises).
- **\`flush()\`** — runs **all** pending timers until the queue drains, returning elapsed virtual time. Handy when the exact ms count is unknown.
- **\`flushMicrotasks()\`** — promises only.

\`\`\`ts
it('debounces', fakeAsync(() => {
  let value: string;
  service.search('a'); tick(200);
  service.result$.subscribe(v => value = v);
  flush();
  expect(value!).toBe('result');
}));
\`\`\`

## Pitfalls
- **\`tick()\` throws** if a pending periodic task (\`setInterval\`) remains — call \`discardPeriodicTasks()\`.
- **\`XHR\`/real fetch** can't be "ticked" — fakeAsync doesn't control real I/O; use \`HttpTestingController\`.

## waitForAsync (formerly async)
\`waitForAsync\` does NOT use virtual time. It wraps the test in a zone, tracks all async tasks, and completes the test when they stabilize (\`fixture.whenStable()\`). Good for real promises when virtual time isn't needed.

## When to use which
- **fakeAsync** — timers, debounce, controlled timing, synchronous asserts.
- **waitForAsync** — real promises/template bindings without needing to control time.`,
    },
  },
  {
    id: 'arch-018',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['httptestingcontroller', 'angular', 'testing'],
    question: {
      ru: 'Как тестировать HTTP-взаимодействия в Angular с HttpTestingController?',
      en: 'How do you test HTTP interactions in Angular with HttpTestingController?',
    },
    answer: {
      ru: `## Назначение
\`HttpTestingController\` (из \`provideHttpClientTesting()\`) подменяет HTTP-бэкенд: реальные запросы не уходят, вы перехватываете их, проверяете и отвечаете вручную. Это **детерминированно и быстро** — без сети.

## Базовый поток
\`\`\`ts
TestBed.configureTestingModule({
  providers: [provideHttpClient(), provideHttpClientTesting(), UserService],
});
const http = TestBed.inject(HttpTestingController);

service.getUsers().subscribe(users => expect(users.length).toBe(2));

const req = http.expectOne('/api/users');     // запрос ожидался
expect(req.request.method).toBe('GET');
req.flush([{ id: 1 }, { id: 2 }]);            // отдаём ответ
http.verify();                                 // нет необработанных запросов
\`\`\`

## Возможности
- **\`expectOne\` / \`match\`** — проверка URL, метода, заголовков, тела, query-параметров.
- **\`req.flush(body, { status, statusText })\`** — успех или ошибка (\`flush(null, { status: 500 })\`).
- **\`req.error(new ProgressEvent('error'))\`** — сетевой сбой для проверки error-handling.
- **\`http.verify()\`** в \`afterEach\` — падает, если есть невыполненные/лишние запросы (ловит лишние/забытые вызовы).

## Что тестировать
- Корректность сформированного запроса (params, headers, тело).
- Маппинг ответа в модель.
- Обработку ошибок и retry-логику.
- Отмену/повторные запросы при race conditions.

## Подводные камни
- Подписка обязательна — без \`subscribe()\` запрос не «выстрелит» (ленивость Observable).
- \`verify()\` забывают вызвать → лишние запросы остаются незамеченными.
- Для retry с задержкой комбинируйте с \`fakeAsync\`/\`tick\`, чтобы продвинуть таймеры backoff.`,
      en: `## Purpose
\`HttpTestingController\` (from \`provideHttpClientTesting()\`) replaces the HTTP backend: real requests don't go out — you intercept, assert, and respond manually. It's **deterministic and fast** — no network.

## Basic flow
\`\`\`ts
TestBed.configureTestingModule({
  providers: [provideHttpClient(), provideHttpClientTesting(), UserService],
});
const http = TestBed.inject(HttpTestingController);

service.getUsers().subscribe(users => expect(users.length).toBe(2));

const req = http.expectOne('/api/users');     // a request was expected
expect(req.request.method).toBe('GET');
req.flush([{ id: 1 }, { id: 2 }]);            // deliver the response
http.verify();                                 // no outstanding requests
\`\`\`

## Capabilities
- **\`expectOne\` / \`match\`** — assert URL, method, headers, body, query params.
- **\`req.flush(body, { status, statusText })\`** — success or error (\`flush(null, { status: 500 })\`).
- **\`req.error(new ProgressEvent('error'))\`** — network failure to test error handling.
- **\`http.verify()\`** in \`afterEach\` — fails if any unhandled/extra requests remain (catches stray/forgotten calls).

## What to test
- Correctness of the formed request (params, headers, body).
- Mapping the response into a model.
- Error handling and retry logic.
- Cancellation/duplicate requests under race conditions.

## Pitfalls
- A subscription is required — without \`subscribe()\` the request never "fires" (Observable laziness).
- Forgetting \`verify()\` → stray requests go unnoticed.
- For delayed retry, combine with \`fakeAsync\`/\`tick\` to advance backoff timers.`,
    },
  },
  {
    id: 'arch-019',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['cdk-harness', 'component-testing'],
    question: {
      ru: 'Что такое component harnesses в Angular CDK и почему они лучше прямого доступа к DOM в тестах?',
      en: 'What are Angular CDK component harnesses and why are they better than direct DOM access in tests?',
    },
    answer: {
      ru: `## Что это
**Component Harness** — это абстракция CDK, дающая тестам стабильное **API для взаимодействия с компонентом**, скрывая его внутреннюю DOM-структуру. Material-компоненты поставляют готовые harness (\`MatButtonHarness\`, \`MatSelectHarness\`).

## Проблема, которую решает
Прямой доступ к DOM в тестах хрупок: \`fixture.nativeElement.querySelector('.mat-button-wrapper span')\` ломается при любом изменении внутренней разметки Material. Harness инкапсулирует селекторы — при обновлении версии меняется harness, а не ваши тесты.

## Пример
\`\`\`ts
const loader = TestbedHarnessEnvironment.loader(fixture);
const button = await loader.getHarness(MatButtonHarness.with({ text: 'Save' }));
await button.click();
const select = await loader.getHarness(MatSelectHarness);
await select.open();
await select.clickOptions({ text: 'Option 2' });
\`\`\`

## Преимущества
- **Устойчивость:** тесты не зависят от внутренней верстки.
- **Переносимость:** один harness работает и в unit (TestBed), и в e2e (Protractor/WebDriver окружения через другой \`HarnessEnvironment\`).
- **Читаемость:** API выражено в терминах поведения (\`click\`, \`getText\`), а не CSS-селекторов.
- **Асинхронность по умолчанию:** все методы возвращают промисы, корректно дожидаясь стабилизации.

## Своя реализация
Для собственных компонентов наследуют \`ComponentHarness\`, объявляют \`hostSelector\` и методы-локаторы через \`this.locatorFor(...)\`.

## Когда не нужно
Для простых компонентов без сложного DOM прямой \`DebugElement\` дешевле. Harness окупается на сложных интерактивных виджетах и в дизайн-системах, где важна стабильность контракта тестов.`,
      en: `## What it is
A **Component Harness** is a CDK abstraction giving tests a stable **API to interact with a component**, hiding its internal DOM structure. Material ships ready-made harnesses (\`MatButtonHarness\`, \`MatSelectHarness\`).

## The problem it solves
Direct DOM access in tests is fragile: \`fixture.nativeElement.querySelector('.mat-button-wrapper span')\` breaks on any change to Material's internal markup. A harness encapsulates selectors — on a version bump the harness changes, not your tests.

## Example
\`\`\`ts
const loader = TestbedHarnessEnvironment.loader(fixture);
const button = await loader.getHarness(MatButtonHarness.with({ text: 'Save' }));
await button.click();
const select = await loader.getHarness(MatSelectHarness);
await select.open();
await select.clickOptions({ text: 'Option 2' });
\`\`\`

## Benefits
- **Robustness:** tests don't depend on internal markup.
- **Portability:** one harness works in unit (TestBed) and e2e environments via a different \`HarnessEnvironment\`.
- **Readability:** the API is expressed in behavior terms (\`click\`, \`getText\`), not CSS selectors.
- **Async by default:** all methods return promises, properly awaiting stabilization.

## Custom harnesses
For your own components, extend \`ComponentHarness\`, declare a \`hostSelector\`, and locate elements via \`this.locatorFor(...)\`.

## When not needed
For simple components without complex DOM, direct \`DebugElement\` access is cheaper. Harnesses pay off for complex interactive widgets and in design systems where test-contract stability matters.`,
    },
  },
  {
    id: 'arch-020',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['e2e', 'cypress', 'playwright'],
    question: {
      ru: 'Сравните Cypress и Playwright для e2e. Как бороться с flakiness и стабить сеть?',
      en: 'Compare Cypress and Playwright for e2e. How do you fight flakiness and stub the network?',
    },
    answer: {
      ru: `## Архитектурное различие
- **Cypress** работает **внутри браузера**, в том же event loop, что приложение. Отличный DX, time-travel debugger, авто-retry команд. Минусы: исторически слабая многотабовость/мультидоменность, один браузерный движок на тест, иногда упирается в свою архитектуру.
- **Playwright** управляет браузером **снаружи через CDP/протоколы**. Поддерживает Chromium, Firefox, WebKit, параллелизм, несколько контекстов/табов, мощный network interception, авто-waiting.

## Борьба с flakiness
- **Авто-waiting вместо sleep:** оба ждут видимости/actionability элемента; никогда не используйте фиксированные \`wait(3000)\`.
- **Стабильные селекторы:** \`data-testid\`, а не CSS-классы/текст, чувствительные к вёрстке.
- **Изоляция состояния:** чистая БД/сидинг через API перед каждым тестом, не через UI.
- **Retries на уровне раннера:** Playwright \`retries\`, Cypress \`retries\` — для маскировки редкой нестабильности (но это лечение симптома, найдите причину).
- **Детерминированное время/данные:** мокать \`Date.now\`, рандом, анимации отключать.

## Network stubbing
\`\`\`ts
// Playwright
await page.route('**/api/users', route => route.fulfill({ json: [{ id: 1 }] }));
// Cypress
cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('users');
cy.wait('@users');
\`\`\`
Стаб сети убирает зависимость от бэкенда → быстрее и стабильнее. Но **смешивайте** с реальными контрактными/e2e на критичных путях, иначе моки разойдутся с реальным API.

## Выбор
Playwright — для кросс-браузерности, параллелизма и сложных сценариев. Cypress — для богатого DX и команд, ценящих интерактивную отладку. Оба сильны; Playwright чаще выигрывает на масштабе CI.`,
      en: `## Architectural difference
- **Cypress** runs **inside the browser**, in the same event loop as the app. Great DX, time-travel debugger, automatic command retries. Cons: historically weak multi-tab/multi-domain support, one engine per test, sometimes hits its own architecture limits.
- **Playwright** drives the browser **externally via CDP/protocols**. Supports Chromium, Firefox, WebKit, parallelism, multiple contexts/tabs, powerful network interception, auto-waiting.

## Fighting flakiness
- **Auto-waiting, not sleeps:** both wait for element visibility/actionability; never use fixed \`wait(3000)\`.
- **Stable selectors:** \`data-testid\`, not layout-sensitive CSS classes/text.
- **State isolation:** clean DB/seed via API before each test, not through the UI.
- **Runner-level retries:** Playwright \`retries\`, Cypress \`retries\` — to mask rare instability (but that treats a symptom; find the cause).
- **Deterministic time/data:** mock \`Date.now\`, random; disable animations.

## Network stubbing
\`\`\`ts
// Playwright
await page.route('**/api/users', route => route.fulfill({ json: [{ id: 1 }] }));
// Cypress
cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('users');
cy.wait('@users');
\`\`\`
Stubbing the network removes backend dependency → faster and more stable. But **mix in** real contract/e2e tests on critical paths, or mocks will drift from the real API.

## Choosing
Playwright — for cross-browser, parallelism, complex scenarios. Cypress — for rich DX and teams valuing interactive debugging. Both are strong; Playwright usually wins at CI scale.`,
    },
  },
  {
    id: 'arch-021',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['coverage', 'mutation-testing', 'quality'],
    question: {
      ru: 'Почему code coverage обманчив и как mutation testing измеряет реальную силу тестов?',
      en: 'Why is code coverage deceptive and how does mutation testing measure real test strength?',
    },
    answer: {
      ru: `## Проблема coverage
Code coverage измеряет, **какие строки исполнились** во время тестов, но НЕ то, **проверены ли они ассертами**. Тест без единого \`expect\` может дать 100% coverage:
\`\`\`ts
it('runs', () => { calculate(2, 3); }); // 100% покрытия, 0 проверок
\`\`\`
Coverage отвечает на "был ли код запущен", а не "правильно ли он работает". Высокий процент создаёт ложное чувство безопасности.

## Другие ловушки
- **Метрика как цель:** требование "90% coverage" провоцирует бессмысленные тесты ради цифры (закон Гудхарта).
- **Branch vs line:** line coverage не ловит непокрытые ветки/условия.
- **Покрытие ≠ важность:** 100% на тривиальных геттерах, 0% на критичной логике даёт усреднённый «хороший» процент.

## Mutation testing
Mutation testing (Stryker для JS/TS) вносит **мутации** в исходный код (меняет \`+\` на \`-\`, \`>\` на \`>=\`, \`true\` на \`false\`, удаляет вызовы) и проверяет, **падает ли хоть один тест**.
- **Killed mutant** — тест поймал изменение (хорошо).
- **Survived mutant** — мутация прошла незамеченной → тесты слабы именно здесь.

**Mutation score** = killed / total — реальная мера способности тестов ловить регрессии.

## Trade-off
Mutation testing вычислительно дорог (множество прогонов), поэтому его запускают на ключевых модулях или ночью в CI, а не на каждый PR. Это лучшая прокси-метрика качества тестов, но используйте её как диагностику, а не как новую жёсткую цель.`,
      en: `## The coverage problem
Code coverage measures **which lines executed** during tests, NOT **whether they were asserted**. A test with no \`expect\` can yield 100% coverage:
\`\`\`ts
it('runs', () => { calculate(2, 3); }); // 100% coverage, 0 assertions
\`\`\`
Coverage answers "was the code run", not "does it work correctly". A high percentage creates false confidence.

## Other traps
- **Metric as a target:** mandating "90% coverage" provokes meaningless tests for the number (Goodhart's law).
- **Branch vs line:** line coverage misses uncovered branches/conditions.
- **Coverage ≠ importance:** 100% on trivial getters and 0% on critical logic averages to a "good" percentage.

## Mutation testing
Mutation testing (Stryker for JS/TS) injects **mutations** into source (changes \`+\` to \`-\`, \`>\` to \`>=\`, \`true\` to \`false\`, removes calls) and checks whether **any test fails**.
- **Killed mutant** — a test caught the change (good).
- **Survived mutant** — the mutation went unnoticed → tests are weak there.

**Mutation score** = killed / total — the real measure of tests' ability to catch regressions.

## Trade-off
Mutation testing is computationally expensive (many runs), so run it on key modules or nightly in CI, not on every PR. It's the best proxy for test quality, but use it as a diagnostic, not a new hard target.`,
    },
  },
  {
    id: 'arch-022',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['ci-cd', 'pipeline', 'frontend'],
    question: {
      ru: 'Как спроектировать CI/CD-пайплайн для крупного фронтенд-проекта?',
      en: 'How do you design a CI/CD pipeline for a large frontend project?',
    },
    answer: {
      ru: `## Этапы пайплайна
1. **Install** — кэшируемая установка зависимостей (lockfile, кэш npm/pnpm store).
2. **Static** — lint, type-check, format-check. Дёшево и ловит много.
3. **Unit/Integration** — основная масса тестов, параллельно по шардам.
4. **Build** — production-сборка, проверка бандла.
5. **E2E** — на собранном артефакте, в headless-браузерах, параллельно.
6. **Deploy** — preview-окружение на PR, прод по merge в main.

## Оптимизации скорости
- **Affected-граф (Nx/Turborepo)** — гонять только затронутые проекты.
- **Computation cache** (локальный + remote) — пропуск неизменённых задач.
- **Шардинг тестов** — делить набор между N воркерами.
- **Параллелизм этапов** независимых задач.
- **Fail-fast** на дешёвых этапах перед дорогими.

## Качество и контроль
- **Quality gates:** падение при упавших тестах, превышении бандл-бюджета, регрессии coverage/Lighthouse.
- **Bundle/performance budgets** в сборке (\`budgets\` Angular, size-limit).
- **Visual regression** на ключевых страницах.
- **Артефакты:** отчёты coverage, e2e-видео/трейсы, source maps.

## Деплой-стратегии
- **Preview-окружения** на каждый PR (Vercel/Netlify/собственный k8s).
- **Canary/постепенный rollout** + feature flags для разделения деплоя и релиза.
- **Immutable-артефакты** с откатом.

## Failure modes
- Flaky e2e тормозят merge → retries + карантин нестабильных.
- Раздутый кэш/отсутствие affected → CI деградирует с ростом репо.
- Секреты в логах сборки → строгий secret-scanning.

**Принцип:** быстрый, детерминированный, с понятными gate'ами — медленный CI убивает скорость команды.`,
      en: `## Pipeline stages
1. **Install** — cacheable dependency install (lockfile, npm/pnpm store cache).
2. **Static** — lint, type-check, format-check. Cheap and catches a lot.
3. **Unit/Integration** — the bulk of tests, parallel across shards.
4. **Build** — production build, bundle check.
5. **E2E** — against the built artifact, in headless browsers, in parallel.
6. **Deploy** — preview environment on PR, production on merge to main.

## Speed optimizations
- **Affected graph (Nx/Turborepo)** — run only affected projects.
- **Computation cache** (local + remote) — skip unchanged tasks.
- **Test sharding** — split the suite across N workers.
- **Stage parallelism** for independent tasks.
- **Fail-fast** on cheap stages before expensive ones.

## Quality and gating
- **Quality gates:** fail on failing tests, bundle-budget overrun, coverage/Lighthouse regression.
- **Bundle/performance budgets** in the build (Angular \`budgets\`, size-limit).
- **Visual regression** on key pages.
- **Artifacts:** coverage reports, e2e videos/traces, source maps.

## Deploy strategies
- **Preview environments** per PR (Vercel/Netlify/own k8s).
- **Canary/gradual rollout** + feature flags to decouple deploy from release.
- **Immutable artifacts** with rollback.

## Failure modes
- Flaky e2e stall merges → retries + quarantine of unstable tests.
- Bloated cache/no affected → CI degrades as the repo grows.
- Secrets in build logs → strict secret scanning.

**Principle:** fast, deterministic, with clear gates — slow CI kills team velocity.`,
    },
  },
  {
    id: 'arch-023',
    category: 'architecture-testing',
    level: 'Expert',
    tags: ['system-design', 'spa', 'scalability'],
    question: {
      ru: 'Спроектируйте крупномасштабный SPA (например, дашборд аналитики). Какие ключевые решения?',
      en: 'Design a large-scale SPA (e.g., an analytics dashboard). What are the key decisions?',
    },
    answer: {
      ru: `## Подход к ответу
Сильный ответ структурируется по осям: загрузка, данные, состояние, рендер, real-time, надёжность.

## Загрузка и доставка
- **Code splitting** по фичам/роутам + lazy loading; **route-level preloading** вероятных переходов.
- **SSR/SSG или гидратация** для TTFB и SEO, если нужно.
- **Performance budgets** на чанки; tree-shaking.

## Слой данных
- **Кэширующий data-layer** (TanStack Query-подобный): дедупликация запросов, кэш, stale-while-revalidate, фоновая ревалидация.
- **Нормализация** server state, чтобы избежать дублей.
- **Пагинация/виртуализация** больших таблиц/списков (\`cdk-virtual-scroll\`).

## Состояние
- Разделить **server state** (кэш-слой) и **client/UI state** (signals/store). Не смешивать.
- Глобальный store только для действительно разделяемого состояния.

## Рендер и производительность
- \`OnPush\` + сигналы, мемоизация тяжёлых вычислений, виртуализация, перенос тяжёлых расчётов в Web Worker.
- Графики — canvas/WebGL при больших объёмах данных.

## Real-time
- WebSocket/SSE для живых метрик; буферизация/throttle обновлений, чтобы не топить change detection.

## Надёжность и UX
- **Error boundaries**, skeleton-загрузка, retry с backoff, optimistic updates с откатом.
- **Offline/PWA** при необходимости; i18n и a11y с самого начала.

## Cross-cutting
- **Auth** с silent token refresh; **observability** (RUM, error tracking); **feature flags** для постепенного rollout; модульная архитектура (Nx libs) для масштаба команды.

**Главное в ответе** — назвать trade-offs (SSR-сложность vs SEO, нормализация vs простота) и приоритизировать под конкретные требования, а не перечислять buzzwords.`,
      en: `## How to answer
A strong answer is structured by axes: loading, data, state, rendering, real-time, reliability.

## Loading and delivery
- **Code splitting** by feature/route + lazy loading; **route-level preloading** of likely navigations.
- **SSR/SSG or hydration** for TTFB and SEO if needed.
- **Performance budgets** on chunks; tree-shaking.

## Data layer
- A **caching data layer** (TanStack Query-like): request deduplication, caching, stale-while-revalidate, background revalidation.
- **Normalize** server state to avoid duplicates.
- **Pagination/virtualization** for large tables/lists (\`cdk-virtual-scroll\`).

## State
- Separate **server state** (cache layer) from **client/UI state** (signals/store). Don't mix them.
- A global store only for genuinely shared state.

## Rendering and performance
- \`OnPush\` + signals, memoize heavy computations, virtualization, offload heavy work to a Web Worker.
- Charts — canvas/WebGL for large datasets.

## Real-time
- WebSocket/SSE for live metrics; buffer/throttle updates so change detection isn't flooded.

## Reliability and UX
- **Error boundaries**, skeleton loading, retry with backoff, optimistic updates with rollback.
- **Offline/PWA** if needed; i18n and a11y from the start.

## Cross-cutting
- **Auth** with silent token refresh; **observability** (RUM, error tracking); **feature flags** for gradual rollout; modular architecture (Nx libs) for team scale.

**The key in the answer** — name the trade-offs (SSR complexity vs SEO, normalization vs simplicity) and prioritize for the concrete requirements, not list buzzwords.`,
    },
  },
  {
    id: 'arch-024',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['caching', 'http-cache', 'strategy'],
    question: {
      ru: 'Какие стратегии кэширования существуют во фронтенде и как выбрать подходящую?',
      en: 'What frontend caching strategies exist and how do you choose the right one?',
    },
    answer: {
      ru: `## Уровни кэша
1. **HTTP-кэш (браузер):** заголовки \`Cache-Control\`, \`ETag\`, \`Last-Modified\`. Immutable-ассеты с хэшем в имени → \`max-age=31536000, immutable\`. HTML — \`no-cache\`.
2. **Service Worker (PWA):** программируемый кэш для offline и контроля.
3. **In-memory app-cache:** data-layer (TanStack Query/собственный) кэширует ответы API в памяти SPA.
4. **CDN/edge:** кэш ближе к пользователю.
5. **Persistent:** localStorage/IndexedDB для оффлайна и быстрого холодного старта.

## Стратегии Service Worker
- **Cache-first** — для статики/неизменного: быстро, но рискует устареванием.
- **Network-first** — для данных, где важна свежесть, с фолбэком на кэш.
- **Stale-while-revalidate** — отдать кэш мгновенно, обновить в фоне: лучший UX-баланс для часто меняющихся, но не критично свежих данных.

## Инвалидация — главная сложность
*"There are only two hard things: cache invalidation and naming things."*
- **Хэш в имени файла** решает инвалидацию ассетов (новый билд = новый URL).
- **Tag/key-based инвалидация** в data-layer: после мутации инвалидировать связанные запросы.
- **TTL** и **stale-while-revalidate** ограничивают возраст без ручной инвалидации.

## Выбор
- Неизменные ассеты → агрессивный immutable HTTP-кэш.
- Часто читаемые, редко меняемые данные → SWR + in-memory.
- Критично свежие данные (баланс, торги) → network-first / no-cache, опционально real-time.

**Риски:** устаревшие данные у пользователя, рассинхрон между вкладками, разрастание persistent-кэша. Всегда планируйте стратегию инвалидации до внедрения кэша.`,
      en: `## Cache layers
1. **HTTP cache (browser):** \`Cache-Control\`, \`ETag\`, \`Last-Modified\` headers. Hashed immutable assets → \`max-age=31536000, immutable\`. HTML → \`no-cache\`.
2. **Service Worker (PWA):** programmable cache for offline and control.
3. **In-memory app cache:** a data layer (TanStack Query/custom) caches API responses in SPA memory.
4. **CDN/edge:** cache closer to the user.
5. **Persistent:** localStorage/IndexedDB for offline and fast cold starts.

## Service Worker strategies
- **Cache-first** — for static/immutable: fast but risks staleness.
- **Network-first** — for data where freshness matters, with cache fallback.
- **Stale-while-revalidate** — serve cache instantly, refresh in background: the best UX balance for frequently changing but not critically fresh data.

## Invalidation — the hard part
*"There are only two hard things: cache invalidation and naming things."*
- **Hash in filename** solves asset invalidation (new build = new URL).
- **Tag/key-based invalidation** in the data layer: after a mutation, invalidate related queries.
- **TTL** and **stale-while-revalidate** bound age without manual invalidation.

## Choosing
- Immutable assets → aggressive immutable HTTP cache.
- Frequently read, rarely changed data → SWR + in-memory.
- Critically fresh data (balance, trading) → network-first / no-cache, optionally real-time.

**Risks:** stale data shown to users, cross-tab desync, persistent-cache bloat. Always plan the invalidation strategy before adding a cache.`,
    },
  },
  {
    id: 'arch-025',
    category: 'architecture-testing',
    level: 'Expert',
    tags: ['websocket', 'sse', 'real-time'],
    question: {
      ru: 'Как спроектировать real-time-фронтенд на WebSocket/SSE при высокой нагрузке?',
      en: 'How do you design a real-time frontend over WebSocket/SSE at scale?',
    },
    answer: {
      ru: `## WebSocket vs SSE
- **SSE** — однонаправленный (сервер→клиент) поверх HTTP, авто-reconnect, проще, проходит через прокси, ограничение на число соединений на домен (HTTP/1.1). Идеален для лент/уведомлений.
- **WebSocket** — двунаправленный, низкий overhead, нужен для чата/совместного редактирования/торговли. Сложнее в инфраструктуре (sticky sessions, апгрейд).

## Надёжность соединения
- **Reconnect с экспоненциальным backoff + jitter**, чтобы при массовом обрыве не было thundering herd.
- **Heartbeat/ping-pong** для обнаружения мёртвых соединений.
- **Resume/replay:** курсор/последний \`id\` события (\`Last-Event-ID\` у SSE), чтобы не терять сообщения после reconnect.

## Производительность клиента
- **Батчинг/throttle входящих апдейтов** — не дёргать change detection на каждое сообщение; агрегировать за кадр (\`requestAnimationFrame\`/буфер).
- **\`runOutsideAngular\`** для парсинга, входить в зону только для применённого состояния.
- **Backpressure:** при потоке быстрее, чем UI успевает, сбрасывать/коалесцировать промежуточные значения (брать последнее).

## Согласованность данных
- Различать **снапшот + дельты**: загрузить начальное состояние REST'ом, затем применять инкрементальные события.
- Обрабатывать **out-of-order** и дубли (идемпотентность по \`id\`).

## Масштаб инфраструктуры
- Sticky sessions или stateless через pub/sub (Redis); горизонтальное масштабирование gateway.
- Fan-out через топики; авторизация на апгрейде соединения.

## Failure modes
- Утечки соединений при незакрытых подписках.
- Перегрузка CD при высокочастотных апдейтах.
- Потеря сообщений без replay-механизма.

**Деградация:** при падении сокета — фолбэк на polling, индикатор «offline», очередь исходящих действий.`,
      en: `## WebSocket vs SSE
- **SSE** — unidirectional (server→client) over HTTP, auto-reconnect, simpler, passes through proxies, limited connections per domain (HTTP/1.1). Ideal for feeds/notifications.
- **WebSocket** — bidirectional, low overhead, needed for chat/collaborative editing/trading. Harder on infra (sticky sessions, upgrade).

## Connection reliability
- **Reconnect with exponential backoff + jitter** so a mass disconnect doesn't cause a thundering herd.
- **Heartbeat/ping-pong** to detect dead connections.
- **Resume/replay:** a cursor/last event \`id\` (\`Last-Event-ID\` in SSE) to avoid losing messages after reconnect.

## Client performance
- **Batch/throttle incoming updates** — don't trigger change detection per message; aggregate per frame (\`requestAnimationFrame\`/buffer).
- **\`runOutsideAngular\`** for parsing, entering the zone only for applied state.
- **Backpressure:** when the stream outpaces the UI, drop/coalesce intermediate values (keep the latest).

## Data consistency
- Distinguish **snapshot + deltas**: load initial state via REST, then apply incremental events.
- Handle **out-of-order** and duplicates (idempotency by \`id\`).

## Infra scale
- Sticky sessions or stateless via pub/sub (Redis); horizontally scale the gateway.
- Fan-out via topics; authorize on connection upgrade.

## Failure modes
- Connection leaks from unclosed subscriptions.
- CD overload under high-frequency updates.
- Message loss without a replay mechanism.

**Degradation:** on socket failure — fall back to polling, an "offline" indicator, and an outbound-action queue.`,
    },
  },
  {
    id: 'arch-026',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['offline-first', 'pwa', 'optimistic-updates'],
    question: {
      ru: 'Как реализовать offline-first приложение и оптимистичные обновления с откатом?',
      en: 'How do you implement an offline-first app and optimistic updates with rollback?',
    },
    answer: {
      ru: `## Offline-first архитектура
Принцип: локальное хранилище — **источник истины для UI**, сеть — механизм синхронизации.
- **Service Worker** кэширует app shell и ассеты (cache-first) для запуска без сети.
- **IndexedDB** хранит данные приложения; UI читает из него, не из сети напрямую.
- **Sync layer** реплицирует локальные изменения на сервер, когда сеть доступна (Background Sync API).

## Оптимистичные обновления
UI применяет изменение **немедленно**, не дожидаясь сервера, и откатывает при ошибке.
\`\`\`ts
async function optimisticUpdate(item) {
  const prev = store.snapshot();
  store.apply(item);                 // мгновенно показать
  try { await api.save(item); }
  catch { store.restore(prev); toast('Не удалось сохранить'); } // откат
}
\`\`\`

## Очередь мутаций оффлайн
- Изменения складываются в **outbox** (IndexedDB) с флагом «pending».
- При восстановлении сети очередь воспроизводится по порядку, с retry/backoff.
- Идемпотентные ключи мутаций, чтобы повтор при двойной отправке не дублировал.

## Разрешение конфликтов
- **Last-write-wins** — просто, но теряет данные.
- **Версионирование/ETag** — отклонять stale-запись, ресолвить вручную или мерджить.
- **CRDT** — для совместного редактирования без потерь (сложно).

## Подводные камни
- **Рассинхрон** локального и серверного состояния при конфликтах.
- **Раздувание IndexedDB** без очистки.
- **UX честности:** показывать статус («синхронизируется», «не сохранено»), чтобы пользователь понимал расхождение между видимым и реально подтверждённым.
- Тестировать сетевые сбои и частичные синхронизации, а не только happy path.`,
      en: `## Offline-first architecture
Principle: local storage is the **source of truth for the UI**, the network is a sync mechanism.
- **Service Worker** caches the app shell and assets (cache-first) so it launches without network.
- **IndexedDB** holds app data; the UI reads from it, not from the network directly.
- **Sync layer** replicates local changes to the server when the network is available (Background Sync API).

## Optimistic updates
The UI applies a change **immediately**, without waiting for the server, and rolls back on error.
\`\`\`ts
async function optimisticUpdate(item) {
  const prev = store.snapshot();
  store.apply(item);                 // show instantly
  try { await api.save(item); }
  catch { store.restore(prev); toast('Failed to save'); } // rollback
}
\`\`\`

## Offline mutation queue
- Changes go into an **outbox** (IndexedDB) flagged "pending".
- When the network returns, the queue replays in order, with retry/backoff.
- Idempotent mutation keys so a retry on double-send doesn't duplicate.

## Conflict resolution
- **Last-write-wins** — simple but loses data.
- **Versioning/ETag** — reject stale writes, resolve manually or merge.
- **CRDT** — for lossless collaborative editing (complex).

## Pitfalls
- **Desync** of local and server state on conflicts.
- **IndexedDB bloat** without cleanup.
- **UX honesty:** show status ("syncing", "not saved") so the user understands the gap between what's shown and what's actually confirmed.
- Test network failures and partial syncs, not just the happy path.`,
    },
  },
  {
    id: 'arch-027',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['auth', 'token-refresh', 'security'],
    question: {
      ru: 'Как реализовать аутентификацию с refresh токенов и silent renewal во фронтенде?',
      en: 'How do you implement authentication with token refresh and silent renewal on the frontend?',
    },
    answer: {
      ru: `## Хранение токенов
- **Access token** — короткоживущий (5-15 мин). Хранить в памяти (переменная/сигнал), НЕ в localStorage (XSS-уязвимость).
- **Refresh token** — долгоживущий. Лучше всего в **httpOnly + Secure + SameSite cookie**, недоступной JS → защита от XSS. Refresh через credentialled-запрос.

## Поток обновления
При \`401\` интерсептор запускает refresh и повторяет исходный запрос:
\`\`\`ts
catchError(err => {
  if (err.status === 401) return refresh$.pipe(switchMap(() => retry(req)));
  return throwError(() => err);
})
\`\`\`

## Проблема одновременных 401
Несколько параллельных запросов получают 401 → нельзя запускать несколько refresh. Решение: **single-flight** — первый запускает refresh, остальные ждут результата через \`shareReplay\`/мьютекс-Subject.
\`\`\`ts
private refresh$ = this.doRefresh().pipe(shareReplay(1));
\`\`\`

## Silent renewal
Проактивно обновлять access **до истечения** (по таймеру/exp claim), чтобы пользователь не ловил 401. В OIDC — silent renew через скрытый iframe или refresh-token grant.

## Безопасность
- **Refresh token rotation:** каждый refresh выдаёт новый refresh-токен, старый инвалидируется → кража одноразового токена бесполезна; обнаружение reuse = компрометация.
- **CSRF:** при cookie-хранении нужна CSRF-защита (double-submit/SameSite).
- **Logout:** ревокация на сервере, очистка cookie, сброс in-memory access.

## Подводные камни
- localStorage для токенов = классическая XSS-уязвимость.
- Гонки refresh без single-flight → шторм запросов и логауты.
- Бесконечный retry-цикл при стабильном 401 — ограничивать попытки.
- Мультивкладочная синхронизация логаута через \`BroadcastChannel\`/storage event.`,
      en: `## Token storage
- **Access token** — short-lived (5-15 min). Keep in memory (variable/signal), NOT in localStorage (XSS-vulnerable).
- **Refresh token** — long-lived. Best in an **httpOnly + Secure + SameSite cookie**, inaccessible to JS → XSS protection. Refresh via a credentialled request.

## Refresh flow
On \`401\`, an interceptor triggers refresh and retries the original request:
\`\`\`ts
catchError(err => {
  if (err.status === 401) return refresh$.pipe(switchMap(() => retry(req)));
  return throwError(() => err);
})
\`\`\`

## The concurrent-401 problem
Several parallel requests get 401 → you must not launch multiple refreshes. Solution: **single-flight** — the first triggers refresh, the rest await the result via \`shareReplay\`/a mutex Subject.
\`\`\`ts
private refresh$ = this.doRefresh().pipe(shareReplay(1));
\`\`\`

## Silent renewal
Proactively refresh the access token **before expiry** (timer/exp claim) so the user never hits a 401. In OIDC — silent renew via a hidden iframe or refresh-token grant.

## Security
- **Refresh token rotation:** each refresh issues a new refresh token and invalidates the old → a stolen one-time token is useless; reuse detection = compromise.
- **CSRF:** cookie storage needs CSRF protection (double-submit/SameSite).
- **Logout:** server-side revocation, cookie clearing, in-memory access reset.

## Pitfalls
- localStorage for tokens = classic XSS vulnerability.
- Refresh races without single-flight → a request storm and logouts.
- Infinite retry loop on a persistent 401 — cap attempts.
- Multi-tab logout sync via \`BroadcastChannel\`/storage event.`,
    },
  },
  {
    id: 'arch-028',
    category: 'architecture-testing',
    level: 'Medium',
    tags: ['debounce', 'algorithm', 'closures'],
    question: {
      ru: 'Реализуйте debounce с поддержкой leading/trailing и cancel. Объясните применение.',
      en: 'Implement debounce with leading/trailing support and cancel. Explain its use.',
    },
    answer: {
      ru: `## Что делает debounce
Debounce откладывает вызов функции до тех пор, пока не пройдёт \`wait\` мс **без новых вызовов**. Каждый новый вызов сбрасывает таймер. Применение: поиск-as-you-type, ресайз, валидация поля — вызвать обработчик только когда поток событий «успокоился».

## Отличие от throttle
- **Debounce:** реагирует на **конец** всплеска (один раз после паузы).
- **Throttle:** ограничивает частоту до 1 раз в \`wait\` (равномерно во время всплеска).

## Leading vs trailing
- **trailing (по умолчанию):** вызов после паузы.
- **leading:** вызов на первом событии, потом тишина до новой паузы.

## Сложность
- Время: \`O(1)\` на вызов. Память: \`O(1)\`.

## Подводные камни
- Сохранять \`this\` и аргументы последнего вызова (для trailing — именно последние).
- В Angular для подобного предпочтительнее RxJS \`debounceTime\`, но в DOM-утилитах нужен ручной debounce.
- Не забывать \`cancel\` при уничтожении компонента, иначе утечка/вызов после destroy.`,
      en: `## What debounce does
Debounce postpones a function call until \`wait\` ms pass **without new calls**. Each new call resets the timer. Use cases: search-as-you-type, resize, field validation — invoke the handler only once the event stream "settles".

## Difference from throttle
- **Debounce:** reacts to the **end** of a burst (once after a pause).
- **Throttle:** caps frequency to once per \`wait\` (evenly during a burst).

## Leading vs trailing
- **trailing (default):** call after the pause.
- **leading:** call on the first event, then silence until a new pause.

## Complexity
- Time: \`O(1)\` per call. Space: \`O(1)\`.

## Pitfalls
- Preserve \`this\` and the last call's arguments (for trailing — the latest ones).
- In Angular, RxJS \`debounceTime\` is preferable for streams, but DOM utilities need a manual debounce.
- Don't forget \`cancel\` on component destroy, or you leak/fire after destroy.`,
    },
    codeSnippet: `// Time: O(1) per call, Space: O(1)
interface DebounceOptions { leading?: boolean; trailing?: boolean; }

function debounce<T extends (...args: any[]) => void>(
  fn: T,
  wait: number,
  { leading = false, trailing = true }: DebounceOptions = {},
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown;

  function debounced(this: unknown, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;
    const callNow = leading && timer === null;

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (trailing && lastArgs && !callNow) {
        fn.apply(lastThis, lastArgs);
      }
      lastArgs = null;
    }, wait);

    if (callNow) fn.apply(this, args);
  }

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };
  return debounced;
}`,
  },
  {
    id: 'arch-029',
    category: 'architecture-testing',
    level: 'Medium',
    tags: ['throttle', 'algorithm', 'performance'],
    question: {
      ru: 'Реализуйте throttle с trailing-вызовом. Когда throttle лучше debounce?',
      en: 'Implement throttle with a trailing call. When is throttle better than debounce?',
    },
    answer: {
      ru: `## Что делает throttle
Throttle гарантирует вызов функции **не чаще одного раза в \`wait\` мс**. В отличие от debounce, он выполняет обработчик **во время** непрерывного потока событий, а не только после паузы.

## Когда лучше debounce
- **Скролл/прогресс-бар:** нужно обновлять регулярно во время прокрутки, не дожидаясь её конца → throttle.
- **Мышиные перемещения для рисования** — равномерные сэмплы.
- **Rate-limiting вызовов API** при непрерывном вводе.

Debounce же лучше, когда важен только **финальный** результат всплеска (автодополнение поиска).

## Trailing-вызов
Без trailing последнее событие в интервале может потеряться. Trailing гарантирует, что финальное значение тоже будет обработано после окончания окна.

## Сложность
- Время: \`O(1)\` на вызов. Память: \`O(1)\`.

## Подводные камни
- Точность времени: используйте \`Date.now()\`/\`performance.now()\`, а не только \`setTimeout\`, для корректного учёта прошедшего интервала.
- Сохранять последние аргументы для trailing.
- В RxJS аналог — \`throttleTime(wait, asyncScheduler, { trailing: true })\`.`,
      en: `## What throttle does
Throttle guarantees a function is called **at most once per \`wait\` ms**. Unlike debounce, it runs the handler **during** a continuous stream of events, not only after a pause.

## When better than debounce
- **Scroll/progress bar:** you must update regularly during scrolling, not wait for it to end → throttle.
- **Mouse moves for drawing** — even samples.
- **Rate-limiting API calls** during continuous input.

Debounce is better when only the **final** result of a burst matters (search autocomplete).

## Trailing call
Without trailing, the last event in an interval can be lost. Trailing guarantees the final value is also processed after the window ends.

## Complexity
- Time: \`O(1)\` per call. Space: \`O(1)\`.

## Pitfalls
- Time accuracy: use \`Date.now()\`/\`performance.now()\`, not just \`setTimeout\`, to track the elapsed interval correctly.
- Preserve the last arguments for trailing.
- The RxJS analog is \`throttleTime(wait, asyncScheduler, { trailing: true })\`.`,
    },
    codeSnippet: `// Time: O(1) per call, Space: O(1)
function throttle<T extends (...args: any[]) => void>(fn: T, wait: number) {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown;

  function throttled(this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - lastCall);
    lastArgs = args;
    lastThis = this;

    if (remaining <= 0) {                 // leading edge
      if (timer) { clearTimeout(timer); timer = null; }
      lastCall = now;
      fn.apply(this, args);
    } else if (!timer) {                  // schedule trailing edge
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer = null;
        if (lastArgs) fn.apply(lastThis, lastArgs);
      }, remaining);
    }
  }

  throttled.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastCall = 0;
  };
  return throttled;
}`,
  },
  {
    id: 'arch-030',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['deep-clone', 'algorithm', 'cycles'],
    question: {
      ru: 'Реализуйте deep clone с обработкой циклических ссылок, Map, Set и Date.',
      en: 'Implement a deep clone that handles cyclic references, Map, Set, and Date.',
    },
    answer: {
      ru: `## Задача
Глубокое копирование должно рекурсивно дублировать вложенные структуры, **не разделяя ссылок** с оригиналом, и при этом:
- не зацикливаться на **циклических ссылках**;
- сохранять разделяемые ссылки (один и тот же объект, встречающийся дважды, должен остаться одним в клоне);
- корректно копировать \`Date\`, \`Map\`, \`Set\`, массивы.

## Почему \`JSON.parse(JSON.stringify())\` плох
- Теряет \`undefined\`, функции, \`Symbol\`.
- Ломает \`Date\` (превращает в строку), \`Map\`/\`Set\` (в \`{}\`).
- Бросает на циклах.
- Не сохраняет прототипы и разделяемые ссылки.

## Решение
Ключ — **WeakMap** \`original → clone\`. Перед клонированием объекта проверяем кэш: если уже клонировали — возвращаем существующий клон. Это разом решает и циклы, и разделяемые ссылки за \`O(1)\` поиск.

## Сложность
- Время: \`O(n)\` по числу узлов. Память: \`O(n)\` (клон + WeakMap).

## Замечания
- \`structuredClone()\` — нативное решение (поддерживает циклы, Map/Set/Date), но не клонирует функции и кастомные прототипы как класс-инстансы; для production предпочтительно оно, ручную реализацию спрашивают для проверки понимания.
- Для классов с методами нужно сохранять прототип через \`Object.create(Object.getPrototypeOf(obj))\`.`,
      en: `## Task
Deep clone must recursively duplicate nested structures **without sharing references** with the original, while:
- not looping forever on **cyclic references**;
- preserving shared references (the same object appearing twice should stay one in the clone);
- correctly copying \`Date\`, \`Map\`, \`Set\`, arrays.

## Why \`JSON.parse(JSON.stringify())\` is bad
- Loses \`undefined\`, functions, \`Symbol\`.
- Breaks \`Date\` (turns to string), \`Map\`/\`Set\` (to \`{}\`).
- Throws on cycles.
- Doesn't preserve prototypes or shared references.

## Solution
The key is a **WeakMap** \`original → clone\`. Before cloning an object, check the cache: if already cloned, return the existing clone. This solves both cycles and shared references with \`O(1)\` lookup.

## Complexity
- Time: \`O(n)\` in the number of nodes. Space: \`O(n)\` (clone + WeakMap).

## Notes
- \`structuredClone()\` is the native solution (handles cycles, Map/Set/Date), but doesn't clone functions or custom prototypes as class instances; for production prefer it — the manual version is asked to test understanding.
- For classes with methods, preserve the prototype via \`Object.create(Object.getPrototypeOf(obj))\`.`,
    },
    codeSnippet: `// Time: O(n), Space: O(n)
function deepClone<T>(value: T, seen = new WeakMap<object, any>()): T {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (value instanceof RegExp) return new RegExp(value.source, value.flags) as T;

  const ref = value as unknown as object;
  if (seen.has(ref)) return seen.get(ref);        // cycle / shared ref

  if (Array.isArray(value)) {
    const arr: any[] = [];
    seen.set(ref, arr);
    for (const item of value) arr.push(deepClone(item, seen));
    return arr as T;
  }
  if (value instanceof Map) {
    const map = new Map();
    seen.set(ref, map);
    value.forEach((v, k) => map.set(deepClone(k, seen), deepClone(v, seen)));
    return map as T;
  }
  if (value instanceof Set) {
    const set = new Set();
    seen.set(ref, set);
    value.forEach(v => set.add(deepClone(v, seen)));
    return set as T;
  }
  const clone = Object.create(Object.getPrototypeOf(value));
  seen.set(ref, clone);
  for (const key of Reflect.ownKeys(value as object)) {
    clone[key] = deepClone((value as any)[key], seen);
  }
  return clone;
}`,
  },
  {
    id: 'arch-031',
    category: 'architecture-testing',
    level: 'Medium',
    tags: ['memoize', 'algorithm', 'caching'],
    question: {
      ru: 'Реализуйте memoize с настраиваемым ключом кэша. Какие риски у мемоизации?',
      en: 'Implement memoize with a configurable cache key. What are the risks of memoization?',
    },
    answer: {
      ru: `## Идея
Мемоизация кэширует результат **чистой функции** по её аргументам: повторный вызов с теми же аргументами возвращает закэшированное значение, экономя вычисления. Работает только для **детерминированных функций без побочных эффектов**.

## Ключ кэша
Главная тонкость — как из аргументов сделать ключ:
- \`JSON.stringify(args)\` — просто, но дорого и ломается на циклах/функциях/порядке ключей.
- Кастомный \`resolver\` — гибко (например, по \`id\`).
- Для одного объекта-аргумента — \`WeakMap\` (без утечек, GC сам чистит).

## Сложность
- Поиск/вставка: \`O(1)\` (с \`Map\`). Память: \`O(k)\` по числу уникальных ключей.

## Риски
- **Рост памяти:** кэш без ограничения копит все ключи — для бесконечного потока аргументов это утечка. Решение: LRU-ограничение или \`WeakMap\`.
- **Stale-результаты:** если функция зависит от внешнего изменяемого состояния — кэш отдаст устаревшее. Мемоизировать только чистые функции.
- **Неверный ключ:** примитивный resolver может схлопнуть разные аргументы в один ключ → неправильный результат.
- **Накладные расходы:** для дешёвых функций кэш медленнее прямого вычисления.

## В Angular
Сигналы/\`computed\` дают мемоизацию из коробки; пайпы лучше делать \`pure\`. Ручной memoize — для тяжёлых чистых вычислений вне реактивного контекста.`,
      en: `## Idea
Memoization caches a **pure function's** result by its arguments: a repeated call with the same arguments returns the cached value, saving computation. Works only for **deterministic, side-effect-free functions**.

## Cache key
The key subtlety is turning arguments into a key:
- \`JSON.stringify(args)\` — simple but costly and breaks on cycles/functions/key order.
- A custom \`resolver\` — flexible (e.g., by \`id\`).
- For a single object argument — a \`WeakMap\` (no leaks, GC cleans up).

## Complexity
- Lookup/insert: \`O(1)\` (with a \`Map\`). Space: \`O(k)\` in the number of unique keys.

## Risks
- **Memory growth:** an unbounded cache accumulates all keys — for an unbounded argument stream that's a leak. Fix: LRU bound or \`WeakMap\`.
- **Stale results:** if the function depends on external mutable state, the cache returns stale data. Only memoize pure functions.
- **Wrong key:** a naive resolver may collapse distinct arguments to one key → wrong result.
- **Overhead:** for cheap functions the cache is slower than direct computation.

## In Angular
Signals/\`computed\` provide memoization out of the box; pipes should be \`pure\`. Manual memoize is for heavy pure computations outside the reactive context.`,
    },
    codeSnippet: `// Lookup/insert: O(1), Space: O(k unique keys)
function memoize<T extends (...args: any[]) => any>(
  fn: T,
  resolver: (...args: Parameters<T>) => string = (...a) => JSON.stringify(a),
): T & { clear: () => void } {
  const cache = new Map<string, ReturnType<T>>();

  const memoized = function (this: unknown, ...args: Parameters<T>) {
    const key = resolver(...args);
    if (cache.has(key)) return cache.get(key)!;
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  } as T & { clear: () => void };

  memoized.clear = () => cache.clear();
  return memoized;
}`,
  },
  {
    id: 'arch-032',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['curry', 'algorithm', 'functional'],
    question: {
      ru: 'Реализуйте функцию curry, поддерживающую частичное применение по нескольку аргументов.',
      en: 'Implement a curry function supporting partial application of several arguments at a time.',
    },
    answer: {
      ru: `## Каррирование
Каррирование превращает функцию \`f(a, b, c)\` в цепочку, которую можно вызывать частично: \`f(a)(b)(c)\`, \`f(a, b)(c)\`, \`f(a)(b, c)\` — все эквивалентны. Функция выполняется, когда накоплено достаточно аргументов (по \`fn.length\`).

## Зачем
- **Частичное применение:** зафиксировать первые аргументы, получить специализированную функцию (\`const add5 = add(5)\`).
- **Композиция:** удобно строить пайплайны (\`pipe/compose\`) из унарных функций.
- **Переиспользование** конфигурации без классов.

## Ключевые моменты реализации
- Опираемся на **\`fn.length\`** (арность) для решения, достаточно ли аргументов.
- Если аргументов хватает — вызываем; иначе возвращаем функцию, накапливающую остаток.
- Сохраняем \`this\` через \`apply\`.

## Сложность
- Каждый шаг — \`O(1)\` плюс конкатенация аргументов. Память — \`O(n)\` на накопленные аргументы.

## Ограничения
- Не работает с **rest-параметрами/значениями по умолчанию** — у них \`fn.length\` не отражает реальную арность.
- Не подходит для функций с переменным числом аргументов.
- Перебарщивать вредно: глубокое каррирование ухудшает читаемость стека и отладку. В реальном коде чаще используют \`bind\` или стрелочные обёртки.`,
      en: `## Currying
Currying turns \`f(a, b, c)\` into a chain that can be called partially: \`f(a)(b)(c)\`, \`f(a, b)(c)\`, \`f(a)(b, c)\` — all equivalent. The function runs once enough arguments are accumulated (per \`fn.length\`).

## Why
- **Partial application:** fix the first arguments to get a specialized function (\`const add5 = add(5)\`).
- **Composition:** convenient for building \`pipe/compose\` pipelines of unary functions.
- **Reuse** of configuration without classes.

## Key implementation points
- Rely on **\`fn.length\`** (arity) to decide whether enough arguments are present.
- If enough — invoke; otherwise return a function accumulating the rest.
- Preserve \`this\` via \`apply\`.

## Complexity
- Each step is \`O(1)\` plus argument concatenation. Space is \`O(n)\` for accumulated arguments.

## Limitations
- Doesn't work with **rest params/default values** — their \`fn.length\` doesn't reflect real arity.
- Unsuitable for variadic functions.
- Overuse hurts: deep currying worsens stack readability and debugging. Real code more often uses \`bind\` or arrow wrappers.`,
    },
    codeSnippet: `// Each call O(1) + arg copy, Space: O(n) accumulated args
function curry<T extends (...args: any[]) => any>(fn: T) {
  return function curried(this: unknown, ...args: any[]): any {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return (...rest: any[]) => curried.apply(this, [...args, ...rest]);
  };
}

// Usage:
const sum = (a: number, b: number, c: number) => a + b + c;
const c = curry(sum);
// c(1)(2)(3) === 6
// c(1, 2)(3) === 6
// c(1)(2, 3) === 6`,
  },
  {
    id: 'arch-033',
    category: 'architecture-testing',
    level: 'Medium',
    tags: ['event-emitter', 'algorithm', 'observer'],
    question: {
      ru: 'Реализуйте типобезопасный EventEmitter с on/off/once/emit. Где такой паттерн применяется?',
      en: 'Implement a type-safe EventEmitter with on/off/once/emit. Where is this pattern used?',
    },
    answer: {
      ru: `## Паттерн Observer
EventEmitter — реализация паттерна **Observer/PubSub**: издатель эмитит именованные события, подписчики реагируют, не зная друг о друге. Это **слабая связанность** между частями системы.

## Где применяется
- Node.js \`EventEmitter\`, DOM-события, шина событий между модулями/MFE.
- В Angular \`@Output()\` — это EventEmitter поверх RxJS Subject.
- Decoupled-коммуникация без прямых ссылок (вместо тесной связки через DI).

## Ключевые операции
- **on(event, handler)** — подписка; вернуть функцию-отписку для удобства.
- **off(event, handler)** — отписка (важно для предотвращения утечек).
- **once(event, handler)** — однократная подписка (оборачивает handler, снимает после первого вызова).
- **emit(event, payload)** — синхронный вызов всех подписчиков.

## Сложность
- \`on\`/\`emit\`: \`O(k)\` по числу подписчиков события. Память: \`O(n)\` подписок.

## Подводные камни
- **Утечки памяти:** забытый \`off\` держит handler и его замыкание → главная проблема ручных эмиттеров. Возврат unsubscribe-функции снижает риск.
- **Порядок и ошибки:** исключение в одном handler не должно ронять остальных — оборачивать в try/catch.
- **Мутация списка во время emit:** копировать массив подписчиков перед итерацией.
- **Типобезопасность:** карта \`event → payload\` через generic даёт проверку типов аргументов на компиляции.`,
      en: `## Observer pattern
EventEmitter implements the **Observer/PubSub** pattern: a publisher emits named events and subscribers react without knowing each other. This is **loose coupling** between system parts.

## Where used
- Node.js \`EventEmitter\`, DOM events, an event bus between modules/MFEs.
- In Angular, \`@Output()\` is an EventEmitter over an RxJS Subject.
- Decoupled communication without direct references (instead of tight coupling via DI).

## Key operations
- **on(event, handler)** — subscribe; return an unsubscribe function for convenience.
- **off(event, handler)** — unsubscribe (important to prevent leaks).
- **once(event, handler)** — one-time subscription (wraps the handler, removes after first call).
- **emit(event, payload)** — synchronously invokes all subscribers.

## Complexity
- \`on\`/\`emit\`: \`O(k)\` in the number of subscribers. Space: \`O(n)\` subscriptions.

## Pitfalls
- **Memory leaks:** a forgotten \`off\` keeps the handler and its closure → the main problem of manual emitters. Returning an unsubscribe function reduces risk.
- **Order and errors:** an exception in one handler shouldn't crash the rest — wrap in try/catch.
- **Mutating the list during emit:** copy the subscriber array before iterating.
- **Type safety:** an \`event → payload\` map via generics gives compile-time argument type checking.`,
    },
    codeSnippet: `// on/emit: O(k subscribers), Space: O(n subscriptions)
type Handler<P> = (payload: P) => void;

class EventEmitter<Events extends Record<string, any>> {
  private listeners = new Map<keyof Events, Set<Handler<any>>>();

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    this.listeners.get(event)?.delete(handler);
  }

  once<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    const wrap: Handler<Events[K]> = (p) => { this.off(event, wrap); handler(p); };
    return this.on(event, wrap);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    // copy to allow mutation during iteration
    for (const handler of [...(this.listeners.get(event) ?? [])]) {
      try { handler(payload); } catch (e) { console.error(e); }
    }
  }
}`,
  },
  {
    id: 'arch-034',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['lru-cache', 'algorithm', 'data-structures'],
    question: {
      ru: 'Реализуйте LRU-кэш с O(1) get и put. Где он применяется во фронтенде?',
      en: 'Implement an LRU cache with O(1) get and put. Where is it used on the frontend?',
    },
    answer: {
      ru: `## Задача
LRU (Least Recently Used) кэш хранит до \`capacity\` элементов; при переполнении вытесняет **наименее недавно использованный**. И \`get\`, и \`put\` должны быть \`O(1)\`.

## Структура данных
Классическое решение — **doubly linked list + hash map**:
- Hash map: \`key → node\` для \`O(1)\` доступа.
- Двусвязный список: порядок использования; голова — самый свежий, хвост — кандидат на вытеснение. Перемещение узла и удаление хвоста — \`O(1)\`.

## Трюк с JS \`Map\`
В JS \`Map\` **сохраняет порядок вставки**, поэтому LRU делается компактнее: при \`get\` удаляем и заново вставляем ключ (он становится «последним»); при переполнении удаляем \`map.keys().next().value\` (первый = самый старый). Это \`O(1)\` амортизированно и проще двусвязного списка.

## Сложность
- \`get\`/\`put\`: \`O(1)\`. Память: \`O(capacity)\`.

## Применение во фронтенде
- Кэш результатов API/изображений с ограничением памяти.
- Мемоизация с границей (вместо неограниченного кэша — избегаем утечки).
- Кэш вычисленных значений в дашбордах, кэш роутов/чанков.

## Подводные камни
- Без границы кэш = утечка памяти; LRU решает это детерминированно.
- **TTL отдельно от LRU:** LRU вытесняет по использованию, но не по «протуханию» — для свежести нужен ещё и TTL.
- Конкурентный доступ в Web Worker требует синхронизации.`,
      en: `## Task
An LRU (Least Recently Used) cache holds up to \`capacity\` items; on overflow it evicts the **least recently used**. Both \`get\` and \`put\` must be \`O(1)\`.

## Data structure
The classic solution is a **doubly linked list + hash map**:
- Hash map: \`key → node\` for \`O(1)\` access.
- Doubly linked list: usage order; head = most recent, tail = eviction candidate. Moving a node and removing the tail are \`O(1)\`.

## JS \`Map\` trick
JS \`Map\` **preserves insertion order**, so an LRU is more compact: on \`get\`, delete and re-insert the key (it becomes "most recent"); on overflow, delete \`map.keys().next().value\` (first = oldest). This is \`O(1)\` amortized and simpler than a linked list.

## Complexity
- \`get\`/\`put\`: \`O(1)\`. Space: \`O(capacity)\`.

## Frontend use
- Caching API results/images with a memory bound.
- Bounded memoization (instead of an unbounded cache — avoiding leaks).
- Caching computed values in dashboards, caching routes/chunks.

## Pitfalls
- Without a bound the cache leaks memory; LRU solves this deterministically.
- **TTL is separate from LRU:** LRU evicts by usage, not staleness — freshness needs a TTL too.
- Concurrent access in a Web Worker needs synchronization.`,
    },
    codeSnippet: `// get/put: O(1), Space: O(capacity) — using Map insertion order
class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private capacity: number) {}

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    this.map.delete(key);     // remove...
    this.map.set(key, value); // ...and re-insert => most recently used
    return value;
  }

  put(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.capacity) {
      const oldest = this.map.keys().next().value as K; // least recently used
      this.map.delete(oldest);
    }
    this.map.set(key, value);
  }
}`,
  },
  {
    id: 'arch-035',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['concurrency', 'promise-pool', 'algorithm'],
    question: {
      ru: 'Реализуйте promise pool (ограничитель конкурентности). Зачем он нужен?',
      en: 'Implement a promise pool (concurrency limiter). Why is it needed?',
    },
    answer: {
      ru: `## Проблема
\`Promise.all(tasks)\` запускает **все** промисы сразу. Если задач тысячи (например, 1000 HTTP-запросов), это:
- перегружает сервер (rate limits, 429);
- упирается в лимит браузера на одновременные соединения;
- исчерпывает память/дескрипторы.

Нужен **ограничитель конкурентности**: выполнять не более \`limit\` задач одновременно, остальные — в очередь.

## Идея реализации
- Держим \`limit\` «слотов». Запускаем первые \`limit\` задач.
- Как только одна завершилась — берём следующую из очереди (рекурсивно/через указатель).
- Собираем результаты по индексу, сохраняя порядок.

## Сложность
- Время: \`O(n)\` задач, ограничено пропускной способностью \`limit\`. Память: \`O(n)\` под результаты.

## Применение во фронтенде
- Массовая загрузка файлов/изображений батчами.
- Префетч множества ресурсов без штурма сети.
- Параллельная обработка с контролем нагрузки на API.

## Подводные камни
- **Обработка ошибок:** решить — fail-fast (как \`Promise.all\`) или собрать все результаты (как \`allSettled\`). Часто нужен второй вариант, чтобы одна ошибка не отменяла всё.
- **Сохранение порядка** результатов независимо от порядка завершения.
- **Backpressure:** при бесконечном источнике задач очередь нужно ограничивать.
- Готовые решения: \`p-limit\`, \`p-map\` — в production лучше брать их.`,
      en: `## Problem
\`Promise.all(tasks)\` starts **all** promises at once. With thousands of tasks (e.g., 1000 HTTP requests) this:
- overloads the server (rate limits, 429);
- hits the browser's concurrent-connection limit;
- exhausts memory/handles.

You need a **concurrency limiter**: run at most \`limit\` tasks at once, queue the rest.

## Implementation idea
- Keep \`limit\` "slots". Launch the first \`limit\` tasks.
- As soon as one finishes — take the next from the queue (recursively/via a pointer).
- Collect results by index, preserving order.

## Complexity
- Time: \`O(n)\` tasks, bounded by \`limit\` throughput. Space: \`O(n)\` for results.

## Frontend use
- Bulk uploading files/images in batches.
- Prefetching many resources without flooding the network.
- Parallel processing with controlled API load.

## Pitfalls
- **Error handling:** decide — fail-fast (like \`Promise.all\`) or collect all results (like \`allSettled\`). Often the latter is needed so one error doesn't cancel everything.
- **Preserving order** of results regardless of completion order.
- **Backpressure:** with an infinite task source the queue must be bounded.
- Off-the-shelf: \`p-limit\`, \`p-map\` — prefer them in production.`,
    },
    codeSnippet: `// Time: O(n) bounded by 'limit' concurrency, Space: O(n)
async function promisePool<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const current = nextIndex++;      // claim a task index
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}`,
  },
  {
    id: 'arch-036',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['retry', 'backoff', 'algorithm'],
    question: {
      ru: 'Реализуйте retry с экспоненциальной задержкой и jitter. Когда retry опасен?',
      en: 'Implement retry with exponential backoff and jitter. When is retry dangerous?',
    },
    answer: {
      ru: `## Задача
\`retry\` повторяет асинхронную операцию при сбое до \`maxRetries\` раз. **Экспоненциальный backoff** увеличивает паузу с каждой попыткой (\`base * 2^attempt\`), а **jitter** добавляет случайность, чтобы множество клиентов не ретраили синхронно.

## Зачем backoff и jitter
- **Backoff** даёт перегруженному сервису время восстановиться вместо немедленного штурма.
- **Jitter** предотвращает **thundering herd**: без рандома все клиенты, упавшие в один момент, ретраят одновременно и снова валят сервис.

## Сложность
- Время: до \`O(maxRetries)\` попыток. Память: \`O(1)\`.

## Когда retry ОПАСЕН
- **Не-идемпотентные операции:** retry \`POST /payment\` может **списать деньги дважды**. Ретраить безопасно только идемпотентные (GET, PUT с idempotency-key).
- **Ошибки 4xx (кроме 429/408):** \`400/401/403/404\` не исправятся повтором — ретраить бессмысленно, только нагрузка. Ретраить стоит сетевые сбои и 5xx/429.
- **Retry storm / каскад:** при системном сбое массовые ретраи усиливают перегрузку — нужен **circuit breaker**, который отключает попытки при череде ошибок.
- **Без верхней границы** — бесконечный цикл.

## Best practices
- Различать retryable и non-retryable ошибки.
- Ограничивать общее время (\`AbortController\`/timeout), а не только число попыток.
- Комбинировать с circuit breaker на уровне сервиса.
- В RxJS — \`retry({ count, delay })\` или \`retryWhen\` с \`timer\` и jitter.`,
      en: `## Task
\`retry\` repeats an async operation on failure up to \`maxRetries\` times. **Exponential backoff** grows the pause each attempt (\`base * 2^attempt\`), and **jitter** adds randomness so many clients don't retry in lockstep.

## Why backoff and jitter
- **Backoff** gives an overloaded service time to recover instead of an immediate hammer.
- **Jitter** prevents a **thundering herd**: without randomness, all clients that failed at the same moment retry simultaneously and crash the service again.

## Complexity
- Time: up to \`O(maxRetries)\` attempts. Space: \`O(1)\`.

## When retry is DANGEROUS
- **Non-idempotent operations:** retrying \`POST /payment\` can **charge twice**. Only retry idempotent operations safely (GET, PUT with an idempotency key).
- **4xx errors (except 429/408):** \`400/401/403/404\` won't fix on retry — pointless, just load. Retry network failures and 5xx/429.
- **Retry storm / cascade:** during a systemic failure, mass retries amplify overload — you need a **circuit breaker** that disables attempts after a streak of errors.
- **No upper bound** — an infinite loop.

## Best practices
- Distinguish retryable from non-retryable errors.
- Cap total time (\`AbortController\`/timeout), not just attempt count.
- Combine with a service-level circuit breaker.
- In RxJS — \`retry({ count, delay })\` or \`retryWhen\` with \`timer\` and jitter.`,
    },
    codeSnippet: `// Time: up to O(maxRetries), Space: O(1)
async function retry<T>(
  fn: () => Promise<T>,
  { retries = 3, baseDelay = 300, factor = 2, maxDelay = 5000,
    shouldRetry = () => true }: {
    retries?: number; baseDelay?: number; factor?: number;
    maxDelay?: number; shouldRetry?: (err: unknown) => boolean;
  } = {},
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err)) throw err;
      const expo = Math.min(baseDelay * factor ** attempt, maxDelay);
      const jitter = Math.random() * expo;           // full jitter
      await new Promise(res => setTimeout(res, jitter));
      attempt++;
    }
  }
}`,
  },
  {
    id: 'arch-037',
    category: 'architecture-testing',
    level: 'Medium',
    tags: ['flatten', 'algorithm', 'recursion'],
    question: {
      ru: 'Реализуйте flatten вложенного массива до заданной глубины (и итеративно для глубоких массивов).',
      en: 'Implement flatten of a nested array to a given depth (and iteratively for deep arrays).',
    },
    answer: {
      ru: `## Задача
Превратить \`[1, [2, [3, [4]]]]\` в плоский массив. Параметр \`depth\` ограничивает уровень разворачивания (как нативный \`Array.prototype.flat(depth)\`).

## Рекурсивное решение
Идём по элементам: если элемент — массив и глубина > 0, рекурсивно разворачиваем с \`depth - 1\`; иначе кладём как есть.

## Сложность
- Время: \`O(n)\`, где n — общее число элементов (включая вложенные).
- Память: \`O(n)\` под результат + \`O(d)\` стек рекурсии (d — глубина вложенности).

## Проблема глубоких массивов
Рекурсия рискует **переполнить стек** на очень глубоких структурах (тысячи уровней). Для бесконечной глубины безопаснее **итеративный** подход через стек (массив-stack), который не использует call stack:
\`\`\`ts
// stack-based, O(n) время, без переполнения call stack
function flattenDeep(arr) {
  const stack = [...arr], res = [];
  while (stack.length) {
    const next = stack.pop();
    Array.isArray(next) ? stack.push(...next) : res.unshift(next);
  }
  return res;
}
\`\`\`
(Примечание: \`unshift\` тут \`O(n)\` — для производительности лучше \`push\` + финальный \`reverse\`.)

## Замечания
- Нативный \`arr.flat(Infinity)\` обычно лучший выбор; ручная реализация — для собеседования или старого окружения.
- \`reduce\` + \`concat\` — элегантно, но \`concat\` создаёт промежуточные массивы (\`O(n²)\` в худшем случае).`,
      en: `## Task
Turn \`[1, [2, [3, [4]]]]\` into a flat array. The \`depth\` parameter limits the unwrapping level (like native \`Array.prototype.flat(depth)\`).

## Recursive solution
Iterate elements: if an element is an array and depth > 0, recurse with \`depth - 1\`; otherwise push as-is.

## Complexity
- Time: \`O(n)\`, where n is the total number of elements (including nested).
- Space: \`O(n)\` for the result + \`O(d)\` recursion stack (d = nesting depth).

## The deep-array problem
Recursion risks a **stack overflow** on very deep structures (thousands of levels). For arbitrary depth an **iterative** approach via an explicit stack (array-stack) is safer — it doesn't use the call stack:
\`\`\`ts
// stack-based, O(n) time, no call-stack overflow
function flattenDeep(arr) {
  const stack = [...arr], res = [];
  while (stack.length) {
    const next = stack.pop();
    Array.isArray(next) ? stack.push(...next) : res.unshift(next);
  }
  return res;
}
\`\`\`
(Note: \`unshift\` here is \`O(n)\` — for performance prefer \`push\` + a final \`reverse\`.)

## Notes
- Native \`arr.flat(Infinity)\` is usually the best choice; the manual version is for interviews or legacy environments.
- \`reduce\` + \`concat\` is elegant but \`concat\` creates intermediate arrays (\`O(n²)\` worst case).`,
    },
    codeSnippet: `// Recursive: Time O(n), Space O(n) + O(d) call stack
function flatten<T>(arr: any[], depth = 1): T[] {
  const result: T[] = [];
  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) {
      result.push(...flatten<T>(item, depth - 1));
    } else {
      result.push(item);
    }
  }
  return result;
}

// Iterative deep flatten — no call-stack overflow. Time O(n), Space O(n)
function flattenDeep<T>(arr: any[]): T[] {
  const stack = [...arr];
  const result: T[] = [];
  while (stack.length) {
    const next = stack.pop();
    if (Array.isArray(next)) stack.push(...next);
    else result.push(next);
  }
  return result.reverse(); // restore original order (push+reverse beats unshift)
}`,
  },
  {
    id: 'arch-038',
    category: 'architecture-testing',
    level: 'Medium',
    tags: ['group-by', 'algorithm', 'data-transform'],
    question: {
      ru: 'Реализуйте groupBy с настраиваемой функцией ключа. Объясните типизацию.',
      en: 'Implement groupBy with a configurable key function. Explain the typing.',
    },
    answer: {
      ru: `## Задача
\`groupBy\` разбивает массив на группы по ключу, который вычисляется из каждого элемента. Результат — объект (или \`Map\`) \`ключ → массив элементов\`.

## Реализация
Один проход \`reduce\`: для каждого элемента считаем ключ, кладём элемент в соответствующий бакет (создавая массив при первом появлении ключа).

## Сложность
- Время: \`O(n)\`. Память: \`O(n)\`.

## Map vs объект
- **Объект** — удобно, но ключи приводятся к строке; теряются объектные/числовые ключи (\`1\` и \`'1'\` схлопнутся).
- **\`Map\`** — сохраняет тип ключа, не имеет коллизий с прототипом (\`__proto__\`, \`constructor\`); предпочтительнее для нетривиальных ключей.

## Типизация (TS)
\`\`\`ts
function groupBy<T, K extends PropertyKey>(
  items: T[], keyFn: (item: T) => K
): Record<K, T[]>
\`\`\`
- \`K extends PropertyKey\` ограничивает ключ \`string | number | symbol\`.
- \`Record<K, T[]>\` точно отражает форму результата.
- Для \`Map\`-версии — \`Map<K, T[]>\` без ограничения \`PropertyKey\`.

## Замечания
- В современных рантаймах есть нативный \`Object.groupBy\`/\`Map.groupBy\` — предпочитайте их.
- Стабильность порядка: элементы внутри группы сохраняют исходный порядок (важно для UI).
- Анти-паттерн — мутировать входной массив; \`groupBy\` должен быть чистым.`,
      en: `## Task
\`groupBy\` splits an array into groups by a key computed from each element. The result is an object (or \`Map\`) \`key → array of elements\`.

## Implementation
A single \`reduce\` pass: for each element compute the key and push the element into the matching bucket (creating an array on the key's first appearance).

## Complexity
- Time: \`O(n)\`. Space: \`O(n)\`.

## Map vs object
- **Object** — convenient, but keys are coerced to strings; object/number keys are lost (\`1\` and \`'1'\` collapse).
- **\`Map\`** — preserves the key type, no collisions with the prototype (\`__proto__\`, \`constructor\`); preferable for non-trivial keys.

## Typing (TS)
\`\`\`ts
function groupBy<T, K extends PropertyKey>(
  items: T[], keyFn: (item: T) => K
): Record<K, T[]>
\`\`\`
- \`K extends PropertyKey\` constrains the key to \`string | number | symbol\`.
- \`Record<K, T[]>\` precisely reflects the result shape.
- For the \`Map\` version — \`Map<K, T[]>\` without the \`PropertyKey\` constraint.

## Notes
- Modern runtimes have native \`Object.groupBy\`/\`Map.groupBy\` — prefer them.
- Order stability: elements within a group keep their original order (important for UI).
- Anti-pattern — mutating the input array; \`groupBy\` should be pure.`,
    },
    codeSnippet: `// Time: O(n), Space: O(n)
function groupBy<T, K extends PropertyKey>(
  items: readonly T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] ??= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

// Map version — preserves key type, avoids prototype collisions
function groupByMap<T, K>(items: readonly T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}`,
  },
  {
    id: 'arch-039',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['deep-equality', 'algorithm', 'comparison'],
    question: {
      ru: 'Реализуйте deep equality для объектов, массивов, Map, Set, Date и NaN.',
      en: 'Implement deep equality for objects, arrays, Map, Set, Date, and NaN.',
    },
    answer: {
      ru: `## Задача
Структурное сравнение: два значения равны, если рекурсивно совпадают их содержимое, а не ссылки. Нужно корректно обработать примитивы, \`NaN\`, \`Date\`, \`RegExp\`, массивы, \`Map\`, \`Set\` и обычные объекты.

## Тонкие случаи
- **\`NaN\`:** \`NaN === NaN\` → \`false\`, но при глубоком сравнении \`NaN\` должен равняться \`NaN\`. Используем \`Object.is\` для примитивов.
- **\`+0\` vs \`-0\`:** \`Object.is(+0, -0)\` → \`false\`; решите, важно ли это для домена.
- **\`Date\`:** сравнивать по \`getTime()\`.
- **\`Map\`/\`Set\`:** сравнивать размер и содержимое без оглядки на порядок вставки.
- **Разные конструкторы/прототипы:** \`{}\` и \`Object.create(null)\` — равны ли? Зависит от строгости.

## Сложность
- Время: \`O(n)\` по числу узлов. Память: \`O(d)\` на стек рекурсии.

## Циклы
Для структур с циклическими ссылками нужен \`WeakMap\`/набор посещённых пар, иначе бесконечная рекурсия (опущено в базовой версии ради ясности; в production добавить).

## Применение
- \`OnPush\`/мемоизация: дешёвая поверхностная проверка обычно предпочтительнее глубокой (\`O(n)\` дорого на каждом CD). Глубокое равенство — для тестовых ассертов, кэш-инвалидации, дедупликации.

## Предостережение
Глубокое сравнение дорого; в горячем пути (change detection) лучше **иммутабельность + сравнение ссылок**. Готовые: lodash \`isEqual\`, \`fast-deep-equal\`.`,
      en: `## Task
Structural comparison: two values are equal if their contents match recursively, not their references. You must correctly handle primitives, \`NaN\`, \`Date\`, \`RegExp\`, arrays, \`Map\`, \`Set\`, and plain objects.

## Subtle cases
- **\`NaN\`:** \`NaN === NaN\` → \`false\`, but deep equality should treat \`NaN\` as equal to \`NaN\`. Use \`Object.is\` for primitives.
- **\`+0\` vs \`-0\`:** \`Object.is(+0, -0)\` → \`false\`; decide if it matters for your domain.
- **\`Date\`:** compare by \`getTime()\`.
- **\`Map\`/\`Set\`:** compare size and contents regardless of insertion order.
- **Different constructors/prototypes:** are \`{}\` and \`Object.create(null)\` equal? Depends on strictness.

## Complexity
- Time: \`O(n)\` in the number of nodes. Space: \`O(d)\` recursion stack.

## Cycles
For cyclic structures you need a \`WeakMap\`/visited-pair set, otherwise infinite recursion (omitted in the base version for clarity; add it in production).

## Use
- \`OnPush\`/memoization: a cheap shallow check is usually preferable to deep (\`O(n)\` is costly per CD). Deep equality fits test assertions, cache invalidation, deduplication.

## Caveat
Deep comparison is expensive; on a hot path (change detection) prefer **immutability + reference comparison**. Off-the-shelf: lodash \`isEqual\`, \`fast-deep-equal\`.`,
    },
    codeSnippet: `// Time: O(n), Space: O(d) recursion
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true; // handles NaN, primitives, same ref
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  if (a.constructor !== b.constructor) return false;

  if (a instanceof Date) return a.getTime() === (b as Date).getTime();
  if (a instanceof RegExp) return a.toString() === (b as RegExp).toString();

  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) if (!b.has(k) || !deepEqual(v, b.get(k))) return false;
    return true;
  }
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }
  if (Array.isArray(a)) {
    if (a.length !== (b as unknown[]).length) return false;
    return a.every((v, i) => deepEqual(v, (b as unknown[])[i]));
  }
  const keysA = Reflect.ownKeys(a), keysB = Reflect.ownKeys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k =>
    Object.prototype.hasOwnProperty.call(b, k) &&
    deepEqual((a as any)[k], (b as any)[k]),
  );
}`,
  },
  {
    id: 'arch-040',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['promise-polyfill', 'algorithm', 'async'],
    question: {
      ru: 'Реализуйте полифилы Promise.all и Promise.allSettled. В чём их семантическое различие?',
      en: 'Implement polyfills for Promise.all and Promise.allSettled. What is their semantic difference?',
    },
    answer: {
      ru: `## Семантическое различие
- **\`Promise.all\`** — **fail-fast**: резолвится массивом результатов, когда выполнятся ВСЕ; реджектится сразу при ПЕРВОМ отклонении, остальные результаты теряются. Используйте, когда нужны все или ничего.
- **\`Promise.allSettled\`** — **ждёт все** независимо от исходов; никогда не реджектится; возвращает массив объектов \`{ status: 'fulfilled', value }\` или \`{ status: 'rejected', reason }\`. Используйте, когда нужны итоги всех операций даже при частичных сбоях (например, отправка N независимых запросов).

## Ключевые детали реализации
- **Сохранение порядка:** результаты кладутся по **индексу**, а не по порядку завершения.
- **Счётчик завершённых:** резолвим внешний промис, когда счётчик достиг длины.
- **Пустой массив:** \`Promise.all([])\` резолвится немедленно \`[]\` — обработать граничный случай.
- **Не-промисы:** оборачивать каждый элемент в \`Promise.resolve(item)\` (вход может содержать обычные значения).

## Сложность
- Время: \`O(n)\` на постановку + параллельное ожидание. Память: \`O(n)\` под результаты.

## Подводные камни
- Гонка: использовать локальный счётчик, а не \`results.length\` (массив с «дырами» имеет неверную длину при разреженности).
- \`Promise.all\` НЕ отменяет уже запущенные промисы при реджекте — они продолжают выполняться (промисы не отменяемы). Для отмены нужен \`AbortController\`.
- \`allSettled\` полезен в дашбордах: одна упавшая панель не должна ронять остальные.`,
      en: `## Semantic difference
- **\`Promise.all\`** — **fail-fast**: resolves with an array of results when ALL complete; rejects immediately on the FIRST rejection, discarding other results. Use it for all-or-nothing.
- **\`Promise.allSettled\`** — **waits for all** regardless of outcome; never rejects; returns an array of \`{ status: 'fulfilled', value }\` or \`{ status: 'rejected', reason }\`. Use it when you need outcomes of all operations even with partial failures (e.g., sending N independent requests).

## Key implementation details
- **Order preservation:** results are placed by **index**, not completion order.
- **Completed counter:** resolve the outer promise when the counter reaches the length.
- **Empty array:** \`Promise.all([])\` resolves immediately with \`[]\` — handle the edge case.
- **Non-promises:** wrap each item in \`Promise.resolve(item)\` (the input may contain plain values).

## Complexity
- Time: \`O(n)\` to schedule + parallel waiting. Space: \`O(n)\` for results.

## Pitfalls
- Race: use a local counter, not \`results.length\` (a sparse array has a misleading length).
- \`Promise.all\` does NOT cancel already-started promises on rejection — they keep running (promises aren't cancelable). For cancellation use \`AbortController\`.
- \`allSettled\` is useful in dashboards: one failed panel shouldn't take down the others.`,
    },
    codeSnippet: `// Both: Time O(n) schedule + parallel wait, Space O(n)
function promiseAll<T>(items: Array<T | Promise<T>>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = new Array(items.length);
    let completed = 0;
    if (items.length === 0) return resolve(results);
    items.forEach((item, i) => {
      Promise.resolve(item).then(
        value => {
          results[i] = value;             // preserve order by index
          if (++completed === items.length) resolve(results);
        },
        err => reject(err),               // fail-fast on first rejection
      );
    });
  });
}

type Settled<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown };

function promiseAllSettled<T>(items: Array<T | Promise<T>>): Promise<Settled<T>[]> {
  return new Promise(resolve => {
    const results: Settled<T>[] = new Array(items.length);
    let completed = 0;
    if (items.length === 0) return resolve(results);
    items.forEach((item, i) => {
      Promise.resolve(item).then(
        value => { results[i] = { status: 'fulfilled', value }; },
        reason => { results[i] = { status: 'rejected', reason }; },
      ).finally(() => {
        if (++completed === items.length) resolve(results);
      });
    });
  });
}`,
  },
];
