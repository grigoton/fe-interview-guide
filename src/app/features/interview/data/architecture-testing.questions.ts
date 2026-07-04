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
      ru: `## 🧩 Простыми словами

Представь большой жилой дом. **apps** в Nx — это подъезды с дверью на улицу: через них люди входят, но сами по себе они почти пустые. Вся мебель, кухни и комнаты (реальная логика) находятся в **libs** — отдельных квартирах-библиотеках. А \`enforce-module-boundaries\` — это правила дома: они запрещают, например, тянуть провод из чужой квартиры напрямую, чтобы дом не превратился в хаос из перепутанных проводов.

Nx — это инструмент для управления **монорепозиторием** (одним git-репозиторием, где живёт много проектов сразу).

### apps против libs

В Nx **apps — это тонкие оболочки** (по-английски _thin shells_), то есть готовые к деплою единицы (_deployable units_). Они лишь собирают фичи вместе и почти не содержат собственной логики. Вся настоящая логика живёт в **libs** (библиотеках).

Правило простое: чем больше кода вы выносите в libs, тем лучше работают две важные фичи Nx — \`affected\` (запуск задач только для затронутых проектов) и кэш (переиспользование прошлых результатов). Крупный \`app\` с логикой внутри мешает Nx понимать, что именно изменилось.

### Типы библиотек

Библиотеки принято помечать **тегами** (метками) двух видов. Первый — тег \`type\` (тип библиотеки по роли):

- \`feature\` — «умные» компоненты, привязанные к маршрутизации и состоянию приложения.
- \`ui\` — презентационные, переиспользуемые компоненты (просто показывают данные).
- \`data-access\` — сервисы, работа с состоянием, HTTP-запросы.
- \`util\` — чистые функции без зависимостей от Angular (мелкие помощники).

Второй тег — \`scope\` (домен, к какой части бизнеса относится): например \`scope:orders\` (заказы) или \`scope:shared\` (общее для всех).

### enforce-module-boundaries

Это ESLint-правило \`@nx/enforce-module-boundaries\`. **ESLint** — линтер, инструмент, который проверяет код на нарушения правил. Правило читает теги из файла \`project.json\` каждой библиотеки и **блокирует недопустимые импорты** (запрещённые связи между библиотеками):

- \`feature\` может зависеть от \`ui\`, \`data-access\`, \`util\`, но **не наоборот** — например, \`util\` не должен импортировать \`feature\`. Зависимости должны течь только в одну сторону, от общего к частному.
- \`scope:orders\` не может импортировать \`scope:billing\` напрямую — только через общий слой \`scope:shared\`. Это не даёт доменам срастись друг с другом.

Конфигурация выглядит так:

\`\`\`json
{ "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:ui","type:data-access","type:util"] }
\`\`\`

Здесь \`sourceTag\` — тег библиотеки-источника, а \`onlyDependOnLibsWithTags\` — единственные теги, от которых ей разрешено зависеть.

### Почему это важно

Без такого контроля монорепозиторий быстро превращается в **big ball of mud** (большой ком грязи — так называют архитектуру, где всё связано со всем). Появляются циклические зависимости (A зависит от B, B зависит от A), нарушается направление зависимостей, и уже невозможно тестировать модули по отдельности.

Главный плюс: правило работает на этапе линтинга и в CI (автоматической проверке при загрузке кода), поэтому нарушение ловится **до merge** (до вливания кода в основную ветку), а не спустя месяцы.

## ⚠️ Подводные камни

- **Слишком дробная сетка тегов на маленьком проекте** создаёт трение без пользы: люди тратят время на теги вместо работы.
- Легко забыть проставить теги новой библиотеке — тогда правило её не защитит.
- Направление зависимостей нужно продумать заранее: переделывать связи в большом репо больно.

## 🎯 Запомни

- **apps — тонкие оболочки для деплоя, вся логика — в libs.** Больше кода в libs = лучше работают \`affected\` и кэш.
- Теги делят библиотеки по \`type\` (feature/ui/data-access/util) и по \`scope\` (домену).
- \`enforce-module-boundaries\` следит, чтобы зависимости текли в одну сторону, и ловит нарушения в CI до merge.
- На маленьком проекте начните с грубого деления и уточняйте теги по мере роста.`,
      en: `## 🧩 In plain words

Picture a big apartment building. In Nx, **apps** are like the entrances with a door to the street: people come in through them, but the entrances themselves are almost empty. All the furniture, kitchens, and rooms (the real logic) live in **libs** — separate library-apartments. And \`enforce-module-boundaries\` is the building's rulebook: it forbids, say, running a wire straight from someone else's apartment, so the building doesn't turn into a mess of tangled wires.

Nx is a tool for managing a **monorepo** (one git repository that holds many projects at once).

### apps vs libs

In Nx, **apps are thin shells** — deployable units. They just wire features together and contain almost no logic of their own. All the real logic lives in **libs** (libraries).

The rule is simple: the more code you push into libs, the better two key Nx features work — \`affected\` (running tasks only for the projects a change touches) and caching (reusing past results). A fat \`app\` with logic inside makes it harder for Nx to see what actually changed.

### Library types

Libraries are conventionally marked with **tags** (labels) of two kinds. The first is the \`type\` tag (the library's role):

- \`feature\` — "smart" components bound to routing and application state.
- \`ui\` — presentational, reusable components (they just display data).
- \`data-access\` — services, state handling, HTTP requests.
- \`util\` — pure functions with no Angular dependency (small helpers).

The second tag is \`scope\` (the business domain it belongs to): e.g. \`scope:orders\` or \`scope:shared\` (common to everything).

### enforce-module-boundaries

This is the ESLint rule \`@nx/enforce-module-boundaries\`. **ESLint** is a linter — a tool that checks code against rules. The rule reads the tags from each library's \`project.json\` file and **blocks illegal imports** (forbidden links between libraries):

- \`feature\` may depend on \`ui\`, \`data-access\`, \`util\`, but **not the reverse** — for example, \`util\` must not import \`feature\`. Dependencies must flow one way, from general to specific.
- \`scope:orders\` cannot import \`scope:billing\` directly — only through the shared layer \`scope:shared\`. This stops domains from fusing together.

The config looks like this:

\`\`\`json
{ "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:ui","type:data-access","type:util"] }
\`\`\`

Here \`sourceTag\` is the source library's tag, and \`onlyDependOnLibsWithTags\` is the only set of tags it is allowed to depend on.

### Why it matters

Without this control a monorepo quickly becomes a **big ball of mud** (a nickname for architecture where everything is tied to everything). You get cyclic dependencies (A depends on B, B depends on A), a violated dependency direction, and it becomes impossible to test modules in isolation.

The big win: the rule runs at lint time and in CI (the automated check when code is pushed), so a violation is caught **before merge** (before code is merged into the main branch), not months later.

## ⚠️ Common pitfalls

- **An overly fine-grained tag grid on a small project** creates friction with no payoff: people spend time on tags instead of work.
- It's easy to forget to tag a new library — then the rule won't protect it.
- The dependency direction must be thought through up front: reworking links in a large repo is painful.

## 🎯 Key takeaways

- **apps are thin deployable shells; all logic goes in libs.** More code in libs = better \`affected\` and caching.
- Tags split libraries by \`type\` (feature/ui/data-access/util) and by \`scope\` (domain).
- \`enforce-module-boundaries\` keeps dependencies flowing one way and catches violations in CI before merge.
- On a small project, start with coarse splits and refine tags as you grow.`,
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
      ru: `## 🧩 Простыми словами

Представь, что у тебя огромная кухня из сотни блюд, и ты поменял одну щепотку соли в одном соусе. Глупо перегатавливать все сто блюд заново. Nx делает так же с кодом: он строит карту, «кто от кого зависит», и пересобирает/перетестирует **только то, что реально задето** изменением. А ещё он запоминает уже готовые результаты: если те же входные данные встречались раньше — берёт готовый ответ из «холодильника», не считая заново.

Nx — инструмент для монорепозитория (одного репозитория с множеством проектов).

### Граф проекта

Nx строит **граф зависимостей проектов** (project graph) — карту связей «проект A зависит от проекта B». Он делает это, анализируя статические импорты (\`import ... from ...\` в коде) плюс явные \`implicitDependencies\` (зависимости, которые нельзя увидеть по импортам, поэтому их прописывают руками).

Команда \`nx affected\` берёт текущие изменения (git-diff между вашей веткой и базой, например \`--base=main\`) и вычисляет, какие проекты затронуты — в том числе **транзитивно** (если изменили B, а от него зависит A, то A тоже затронут).

### affected

Вместо запуска тестов и сборки по всему репозиторию вы запускаете их только для затронутых проектов:

\`\`\`bash
nx affected -t test build --base=origin/main
\`\`\`

Здесь \`-t test build\` — какие задачи (targets) выполнить, а \`--base\` — с чем сравнивать изменения. На больших монорепозиториях это сокращает CI (автоматическую проверку) с часов до минут.

### Computation caching

**Кэширование вычислений** — вторая суперсила. Nx берёт **все входы** задачи и считает от них хэш (короткий отпечаток; если хоть что-то поменялось — отпечаток другой). В качестве входов учитываются:

- исходники самого проекта и его зависимостей,
- версии зависимостей,
- переменные окружения (env),
- флаги команды,
- версия самого Nx.

Если хэш совпадает с уже виденным — результат берётся из кэша, локального или удалённого (remote-кэш, например Nx Cloud — общее хранилище на всю команду), и задача вообще не выполняется. Это называется **cache hit** (попадание в кэш).

### Подводные камни

- **Неучтённые входы.** Если задача читает файл или переменную окружения, которые не объявлены во входах, кэш отдаст устаревший результат — Nx же «не знал», что это влияет. Решение: точно настроить \`inputs\` и \`namedInputs\` (списки того, что считается входом).
- **Недетерминированные сборки.** Если сборка каждый раз даёт разный результат (вставляет timestamps, случайные хэши), воспроизводимость кэша ломается.
- **Side-effects вне outputs.** Кэшируются только объявленные \`outputs\` (файлы-результаты). Если задача пишет что-то вне их, то при попадании в кэш эти артефакты не восстановятся — задача-то не запускалась.
- **Загрязнение remote-кэша** (cache poisoning): при неверной настройке в общий кэш попадают битые результаты, и вся команда получает их. Поэтому PR-агентам (автоматике на pull request) дают только read-only доступ к кэшу.

## ⚠️ Подводные камни

- Кэш надёжен ровно настолько, насколько честно и полно описаны входы (\`inputs\`) и выходы (\`outputs\`).
- «Волшебно устаревший результат» почти всегда означает неучтённый вход — ищите env или файл, о котором Nx не знает.
- Не давайте автоматике право на запись в общий кэш, пока не уверены в её корректности.

## 🎯 Запомни

- \`affected\` запускает задачи только для проектов, реально затронутых изменением (по графу зависимостей) — CI из часов превращается в минуты.
- Кэш работает через хэш **всех** входов: совпал хэш — результат берётся готовым, задача не выполняется.
- Главная причина багов кэша — неучтённые входы и side-effects вне объявленных outputs.
- Ограничивайте доступ к remote-кэшу, чтобы не отравить его битыми результатами.`,
      en: `## 🧩 In plain words

Imagine a huge kitchen with a hundred dishes, and you changed one pinch of salt in one sauce. It would be silly to re-cook all hundred dishes. Nx does the same thing with code: it builds a map of "who depends on whom" and rebuilds/re-tests **only what your change actually touched**. It also remembers finished results: if the same inputs showed up before, it grabs the ready answer from the "fridge" instead of computing again.

Nx is a tool for a monorepo (one repository holding many projects).

### Project graph

Nx builds a **project dependency graph** — a map of links like "project A depends on project B." It does this by analyzing static imports (\`import ... from ...\` in the code) plus explicit \`implicitDependencies\` (dependencies that can't be seen from imports, so you declare them by hand).

The \`nx affected\` command takes your current changes (a git diff between your branch and a base, e.g. \`--base=main\`) and figures out which projects are affected — including **transitively** (if you changed B and A depends on B, then A is affected too).

### affected

Instead of running tests and builds across the whole repo, you run them only for affected projects:

\`\`\`bash
nx affected -t test build --base=origin/main
\`\`\`

Here \`-t test build\` is which tasks (targets) to run, and \`--base\` is what to diff the changes against. On large monorepos this cuts CI (the automated check) from hours to minutes.

### Computation caching

**Computation caching** is the second superpower. Nx takes **all inputs** of a task and computes a hash from them (a short fingerprint; if anything changes, the fingerprint changes). The inputs it accounts for include:

- the sources of the project itself and its dependencies,
- dependency versions,
- environment variables (env),
- command flags,
- the Nx version itself.

If the hash matches one it has seen before, the result is pulled from cache — local or remote (a remote cache like Nx Cloud is shared storage for the whole team) — and the task doesn't run at all. This is called a **cache hit**.

### Pitfalls

- **Unaccounted inputs.** If a task reads a file or env variable that isn't declared as an input, the cache returns a stale result — Nx "didn't know" it mattered. Fix: configure \`inputs\` and \`namedInputs\` (the lists of what counts as an input) precisely.
- **Non-deterministic builds.** If a build produces a different result each time (injecting timestamps, random hashes), cache reproducibility breaks.
- **Side-effects outside outputs.** Only declared \`outputs\` (result files) are cached. If a task writes something outside them, those artifacts won't be restored on a cache hit — the task never ran.
- **Remote cache poisoning.** With bad configuration, broken results land in the shared cache and the whole team gets them. That's why PR agents (automation on pull requests) are given read-only access to the cache.

## ⚠️ Common pitfalls

- The cache is only as reliable as how honestly and completely you declare inputs (\`inputs\`) and outputs (\`outputs\`).
- A "magically stale result" almost always means an unaccounted input — look for an env var or file Nx doesn't know about.
- Don't grant automation write access to the shared cache until you trust its correctness.

## 🎯 Key takeaways

- \`affected\` runs tasks only for projects a change actually touches (via the dependency graph) — turning CI from hours into minutes.
- Caching works by hashing **all** inputs: hash matches, the result is reused and the task is skipped.
- The main cause of cache bugs is unaccounted inputs and side-effects outside declared outputs.
- Restrict remote-cache access so it doesn't get poisoned with broken results.`,
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
      ru: `## 🧩 Простыми словами

Представь торговый центр, где каждый магазин (команда) сам оформляет свою витрину и может обновлять её, не закрывая весь центр. **Module Federation** — это способ собрать сайт из таких независимых «магазинов»: один сайт (host) в момент работы подгружает куски другого сайта (remote), не пересобирая всё вместе. Проблема **version skew** (расхождение версий) — это когда магазины принесли разные версии одного и того же генератора электричества (например, Angular), и нужно решить, чью версию использовать, чтобы ничего не заискрило.

**Микрофронтенды (MFE)** — подход, где один большой фронтенд разбит на несколько независимо разрабатываемых и деплоящихся частей.

### Module Federation

**Module Federation** (сокращённо MF) — механизм в сборщиках Webpack и rspack. Он позволяет одному бандлу (собранному пакету кода) — его называют **remote** — экспонировать (открывать наружу) свои модули, а другому бандлу — **host** — загружать эти модули **в рантайме** (во время работы приложения в браузере), минуя общую сборку.

Главная выгода — **независимый деплой** (independent deployment): каждая команда владеет своим remote и выкатывает его отдельно, не дожидаясь остальных.

### Shared dependencies

Ключевая фича MF — \`shared\` (разделяемые зависимости). Крупные библиотеки вроде Angular или RxJS помечают как разделяемые, чтобы не грузить их в браузер дважды (иначе host и remote притащили бы по своей копии).

\`\`\`js
shared: { '@angular/core': { singleton: true, strictVersion: true, requiredVersion: '^17.0.0' } }
\`\`\`

### Version skew

**Version skew** — расхождение версий: например, host собран на Angular 17, а remote — на Angular 16. Что использовать в рантайме? Есть три стратегии-настройки:

- **\`singleton: true\`** — в рантайме грузится ровно одна копия библиотеки (берётся наибольшая совместимая версия). Риск: если версии всё же несовместимы, ломается DI (dependency injection — механизм подстановки зависимостей в Angular) или Zone (система отслеживания изменений).
- **\`strictVersion: true\`** — при несовместимости бросается ошибка сразу, вместо тихой поломки где-то позже. Это принцип **fail fast** (падай быстро и явно).
- **\`requiredVersion\`** — задаёт допустимый диапазон версий (например \`^17.0.0\`).

Для библиотек с **глобальным состоянием** (Angular, RxJS) singleton фактически обязателен. Причина: такие библиотеки полагаются на проверки \`instanceof\` (проверка «это объект того же самого класса?») и на единственный экземпляр \`Zone\`. Если в приложении окажутся две копии Zone.js или RxJS, появляются трудноуловимые баги — объект из одной копии не будет «узнан» другой.

### Trade-offs

**Плюсы:**

- независимый деплой команд,
- изоляция команд друг от друга,
- частичные релизы (можно выкатить одну часть, не трогая остальные).

**Минусы:**

- runtime-связанность через \`shared\` (части всё же зависят друг от друга во время работы),
- сложнее отладка,
- риск version skew,
- дублирование кода, если отказаться от singleton,
- выше операционная сложность (больше инфраструктуры и координации).

## ⚠️ Подводные камни

- Для Angular/RxJS всегда ставьте \`singleton: true\` — иначе две копии Zone/RxJS дадут баги, которые почти невозможно поймать.
- Без \`strictVersion\` несовместимость версий проявится тихо и поздно — лучше пусть падает сразу.
- Микрофронтенды не бесплатны: одна команда с единым релизным циклом почти всегда счастливее с монолитным SPA.

## 🎯 Запомни

- Module Federation: **remote** экспонирует модули, **host** грузит их в рантайме — отсюда независимый деплой команд.
- \`shared\` не даёт грузить общие библиотеки дважды; \`singleton\`/\`strictVersion\`/\`requiredVersion\` управляют version skew.
- Для библиотек с глобальным состоянием (Angular, RxJS, Zone) singleton обязателен.
- MFE окупаются при 3-4+ автономных командах с разной частотой релизов; для одной команды проще монолит.`,
      en: `## 🧩 In plain words

Picture a shopping mall where each store (team) decorates its own storefront and can update it without shutting the whole mall down. **Module Federation** is a way to assemble a site out of such independent "stores": one site (host) pulls in pieces of another site (remote) at runtime, without rebuilding everything together. The **version-skew** problem is when the stores brought different versions of the same power generator (say, Angular), and you must decide whose version to use so nothing sparks.

**Micro-frontends (MFEs)** are an approach where one big frontend is split into several independently developed and deployed parts.

### Module Federation

**Module Federation** (MF for short) is a mechanism in the Webpack and rspack bundlers. It lets one bundle (a packaged blob of code) — called a **remote** — expose (open up) its modules, and another bundle — the **host** — load those modules **at runtime** (while the app is running in the browser), bypassing a shared build.

The main benefit is **independent deployment**: each team owns its remote and ships it separately, without waiting on the others.

### Shared dependencies

MF's key feature is \`shared\` (shared dependencies). Big libraries like Angular or RxJS are marked shareable so they aren't loaded into the browser twice (otherwise the host and remote would each drag in their own copy).

\`\`\`js
shared: { '@angular/core': { singleton: true, strictVersion: true, requiredVersion: '^17.0.0' } }
\`\`\`

### Version skew

**Version skew** means version mismatch: e.g., the host is built on Angular 17 but the remote on Angular 16. Which one runs at runtime? There are three strategy settings:

- **\`singleton: true\`** — exactly one copy of the library is loaded at runtime (the highest compatible version is chosen). Risk: if the versions really are incompatible, DI (dependency injection — Angular's mechanism for supplying dependencies) or Zone (its change-detection system) breaks.
- **\`strictVersion: true\`** — on incompatibility it throws an error immediately, instead of failing silently somewhere later. This is the **fail fast** principle (fail early and loudly).
- **\`requiredVersion\`** — sets the allowed version range (e.g. \`^17.0.0\`).

For libraries with **global state** (Angular, RxJS) singleton is effectively mandatory. The reason: such libraries rely on \`instanceof\` checks ("is this an object of the exact same class?") and on a single \`Zone\` instance. If two copies of Zone.js or RxJS end up in the app, you get subtle, hard-to-trace bugs — an object from one copy won't be "recognized" by the other.

### Trade-offs

**Pros:**

- independent deployment per team,
- teams isolated from one another,
- partial releases (ship one part without touching the rest).

**Cons:**

- runtime coupling via \`shared\` (the parts still depend on each other while running),
- harder debugging,
- version-skew risk,
- code duplication if you drop singleton,
- higher operational complexity (more infrastructure and coordination).

## ⚠️ Common pitfalls

- For Angular/RxJS always set \`singleton: true\` — otherwise two copies of Zone/RxJS cause bugs that are nearly impossible to catch.
- Without \`strictVersion\`, a version incompatibility surfaces silently and late — better to let it fail immediately.
- Micro-frontends aren't free: a single team with one release cadence is almost always happier with a monolithic SPA.

## 🎯 Key takeaways

- Module Federation: a **remote** exposes modules, a **host** loads them at runtime — hence independent deployment per team.
- \`shared\` prevents loading common libraries twice; \`singleton\`/\`strictVersion\`/\`requiredVersion\` control version skew.
- For libraries with global state (Angular, RxJS, Zone) singleton is mandatory.
- MFEs pay off with 3-4+ autonomous teams on different release cadences; for a single team a monolith is simpler.`,
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
      ru: `## 🧩 Простыми словами

Представь, что несколько театральных трупп играют на одной сцене по очереди. Нужен режиссёр, который решает, кто сейчас выходит, а кто уходит за кулисы — это **single-spa**. А **Module Federation** — это склад общего реквизита, откуда все берут одни и те же декорации, чтобы не тащить по копии каждому. Оба помогают собрать сайт из независимых частей (микрофронтендов), но решают разные задачи: один дирижирует, другой делится кодом.

**Микрофронтенды (MFE)** — подход, где один фронтенд разбит на несколько независимо разрабатываемых частей.

### single-spa

**single-spa** — это оркестратор жизненного цикла (lifecycle orchestrator). Каждый MFE регистрируется с тремя функциями:

- \`bootstrap\` — однократная инициализация,
- \`mount\` — «выйти на сцену» (отрисоваться),
- \`unmount\` — «уйти со сцены» (убраться и освободить ресурсы).

Специальный **root-config** (корневой конфиг) решает, какой MFE активен в зависимости от URL. Важное свойство: single-spa **агностичен к сборке и фреймворку** — то есть ему всё равно, чем и на чём собран MFE. Можно смешивать React, Angular и Vue на одной странице.

### Module Federation

Module Federation (MF) — это механизм **разделения кода на уровне сборки** (build-time), а не оркестрации. Он про то, как поделиться зависимостями и подгрузить чужие модули, а не про то, кто когда «выходит на сцену».

На практике их часто комбинируют: single-spa отвечает за маршрутизацию между MFE, а MF — за шаринг общих зависимостей между ними.

### Сравнение

- **single-spa:** сильная сторона — гетерогенные стеки (разные фреймворки вместе) и явный, понятный lifecycle. Слабая — больше boilerplate (шаблонного кода) и ручной шаринг зависимостей.
- **Module Federation:** сильная сторона — нативный шаринг зависимостей и ленивая (lazy) загрузка по требованию. Слабая — привязка к webpack/rspack (lock-in) и runtime-связанность (части зависят друг от друга во время работы).

### Изоляция

Настоящая изоляция требует усилий, потому что все MFE делят **один документ** (одну HTML-страницу, один \`window\`, один общий CSS). Что нужно изолировать:

- **Стили (CSS).** Использовать Shadow DOM (браузерная технология «капсулы», куда не протекают чужие стили), CSS-модули или префиксы/scoping, чтобы глобальный CSS не утекал и не ломал соседей.
- **JS-глобалы.** Не загрязнять \`window\` — у каждой команды свой namespace (пространство имён), чтобы имена не сталкивались.
- **Состояние.** Общаться через события (\`CustomEvent\`) или явный общий store, а не через общие изменяемые (mutable) объекты, которые можно незаметно испортить.
- **Падения.** Ставить error boundaries (обёртки, ловящие ошибки) вокруг каждого MFE, чтобы краш одного не ронял весь shell (каркас-хост).
- **Zone/DI (Angular).** Singleton-шаринг рантайма обязателен — одна копия Zone и DI на всех (иначе баги с \`instanceof\` и change detection).

### Failure mode

Самая частая ошибка — **скрытая глобальная связанность** (hidden global coupling): один MFE тихо монки-патчит \`window.fetch\` (подменяет глобальную функцию) или мутирует общий store, и этим ломает соседей, хотя формально они независимы. Лечится дисциплиной контрактов (чёткими договорённостями о границах) и контрактными тестами на этих границах.

## ⚠️ Подводные камни

- MFE делят один \`window\` и один CSS — без явной изоляции они незаметно влияют друг на друга.
- Монки-патчинг глобалов и общие mutable-объекты — источник самых коварных багов «сломалось у соседа».
- single-spa и MF решают разные задачи (оркестрация против шаринга кода) — их не «или-или», часто берут оба.

## 🎯 Запомни

- **single-spa** дирижирует жизненным циклом MFE (\`bootstrap/mount/unmount\`) и не зависит от фреймворка; **MF** делит код на уровне сборки. Часто используются вместе.
- Изоляция — это работа: Shadow DOM/scoping для CSS, свой namespace вместо \`window\`, события вместо общих объектов, error boundaries, singleton Zone/DI.
- Главный враг — скрытая глобальная связанность; защита — контракты и контрактные тесты на границах.`,
      en: `## 🧩 In plain words

Imagine several theater troupes performing on one stage in turns. You need a director who decides who steps out now and who goes backstage — that's **single-spa**. And **Module Federation** is a shared prop warehouse everyone pulls the same scenery from, so nobody hauls their own copy. Both help assemble a site from independent parts (micro-frontends), but they solve different problems: one conducts, the other shares code.

**Micro-frontends (MFEs)** are an approach where one frontend is split into several independently developed parts.

### single-spa

**single-spa** is a lifecycle orchestrator. Each MFE registers with three functions:

- \`bootstrap\` — one-time initialization,
- \`mount\` — "step onto the stage" (render),
- \`unmount\` — "leave the stage" (clean up and free resources).

A special **root-config** decides which MFE is active based on the URL. A key property: single-spa is **build- and framework-agnostic** — it doesn't care how or with what an MFE was built. You can mix React, Angular, and Vue on one page.

### Module Federation

Module Federation (MF) is a **build-time code-sharing** mechanism, not orchestration. It's about how to share dependencies and pull in someone else's modules, not about who "steps onto the stage" when.

In practice the two are often combined: single-spa handles routing between MFEs, while MF handles sharing common dependencies among them.

### Comparison

- **single-spa:** strength — heterogeneous stacks (different frameworks together) and an explicit, clear lifecycle. Weakness — more boilerplate (repetitive setup code) and manual dependency sharing.
- **Module Federation:** strength — native dependency sharing and lazy (on-demand) loading. Weakness — webpack/rspack lock-in and runtime coupling (parts depend on each other while running).

### Isolation

True isolation takes effort because all MFEs share **one document** (one HTML page, one \`window\`, one global CSS). What needs isolating:

- **Styles (CSS).** Use Shadow DOM (a browser "capsule" technology that outside styles can't leak into), CSS modules, or prefixing/scoping so global CSS doesn't leak and break neighbors.
- **JS globals.** Don't pollute \`window\` — each team gets its own namespace so names don't collide.
- **State.** Communicate via events (\`CustomEvent\`) or an explicit shared store, not via shared mutable objects that can be silently corrupted.
- **Crashes.** Put error boundaries (wrappers that catch errors) around each MFE so one crash doesn't take down the whole shell (the host frame).
- **Zone/DI (Angular).** Singleton runtime sharing is mandatory — one copy of Zone and DI for all (otherwise you get \`instanceof\` and change-detection bugs).

### Failure mode

The most common failure is **hidden global coupling**: one MFE quietly monkey-patches \`window.fetch\` (swaps out a global function) or mutates a shared store, breaking neighbors even though they're formally independent. The cure is contract discipline (clear agreements about boundaries) and contract tests at those boundaries.

## ⚠️ Common pitfalls

- MFEs share one \`window\` and one CSS — without explicit isolation they quietly affect each other.
- Monkey-patching globals and shared mutable objects are the source of the nastiest "it broke on my neighbor" bugs.
- single-spa and MF solve different problems (orchestration vs. code sharing) — it's not either/or; teams often use both.

## 🎯 Key takeaways

- **single-spa** orchestrates the MFE lifecycle (\`bootstrap/mount/unmount\`) and is framework-agnostic; **MF** shares code at build time. They're often used together.
- Isolation is work: Shadow DOM/scoping for CSS, your own namespace instead of \`window\`, events instead of shared objects, error boundaries, singleton Zone/DI.
- The main enemy is hidden global coupling; the defense is contracts and contract tests at the boundaries.`,
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
      ru: `## 🧩 Простыми словами

Представь ресторан. Есть **официант**, который ходит на кухню, знает меню, оформляет заказ и разбирается во всей кухонной логике. И есть **тарелка**, которая просто красиво показывает еду — ей всё равно, откуда взялась еда, её задача только выглядеть хорошо. В Angular компоненты делят так же: одни («умные») добывают данные и управляют логикой, другие («глупые») просто рисуют то, что им дали.

### Два типа компонентов

**Smart (container, «умный»)** — знает бизнес-логику, подключает сервисы и стейт (хранилище данных приложения), организует поток данных. Часто привязан к роуту (то есть отвечает за целую страницу-маршрут).

**Dumb (presentational, «глупый»)** — получает данные снаружи через \`@Input\` (входные свойства) или сигналы, а о своих действиях сообщает наверх через \`@Output\` (события). Он ничего не знает о том, откуда данные берутся. Обычно использует стратегию \`OnPush\` (Angular перерисовывает такой компонент только когда его входы реально поменялись, а не на каждый чих).

### Зачем это нужно

- **Переиспользуемость:** «глупый» компонент не привязан к контексту, его можно вставить куда угодно.
- **Тестируемость:** presentational тестируется как чистая функция — «дал вход, проверил, что нарисовалось»; у smart-компонентов подменяют (мокают) сервисы.
- **Производительность:** «глупые» компоненты с \`OnPush\` и иммутабельными (неизменяемыми) входами перерисовываются реже.

### Пример

\`\`\`ts
// dumb
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
class UserCardComponent { @Input() user!: User; @Output() select = new EventEmitter<string>(); }
\`\`\`

Здесь \`UserCardComponent\` принимает готового \`user\` через \`@Input\` и, когда на карточку нажали, выкидывает событие \`select\` наружу через \`@Output\`. Сам он не грузит пользователей и не знает, кто их ему дал.

## ⚠️ Подводные камни

- **Prop drilling («проброс пропсов»):** в глубокой иерархии протаскивать данные через 5 уровней \`@Input\`/\`@Output\` мучительно. Лучше дать нужному уровню доступ к facade/store (сервис-обёртка над хранилищем).
- **Искусственное дробление:** не каждый компонент стоит делить надвое. Для одноразового view-кода это лишний overhead (накладные расходы).
- **С сигналами/store граница размывается:** presentational-компонент может читать из инжектируемого store напрямую и всё равно оставаться «глупым» по бизнес-логике.

## 🎯 Запомни

- Smart добывает данные и управляет логикой; dumb только рисует то, что ему дали.
- Главная выгода — переиспользуемость и лёгкое тестирование «глупых» компонентов.
- Это эвристика, а не закон: применяй ради реальной пользы, а не по ритуалу.`,
      en: `## 🧩 In plain words

Picture a restaurant. There's a **waiter** who walks to the kitchen, knows the menu, places the order, and understands all the kitchen logic. And there's a **plate** that just presents the food nicely — it doesn't care where the food came from, its only job is to look good. In Angular, components split the same way: some ("smart") fetch data and run logic, others ("dumb") simply draw whatever they're handed.

### The two component types

**Smart (container):** knows the business logic, injects services and state (the app's data store), orchestrates data flow. Often route-bound (responsible for a whole page/route).

**Dumb (presentational):** receives data from outside via \`@Input\` (input properties) or signals, and reports its actions upward via \`@Output\` (events). It knows nothing about where the data comes from. It typically uses the \`OnPush\` strategy (Angular re-renders it only when its inputs actually change, not on every tick).

### Why bother

- **Reusability:** a dumb component isn't tied to any context, so you can drop it anywhere.
- **Testability:** presentational is tested like a pure function — "give it an input, check what got rendered"; for smart components you mock (substitute) the services.
- **Performance:** dumb components with \`OnPush\` and immutable (unchanging) inputs re-render less often.

### Example

\`\`\`ts
// dumb
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
class UserCardComponent { @Input() user!: User; @Output() select = new EventEmitter<string>(); }
\`\`\`

Here \`UserCardComponent\` takes a ready-made \`user\` via \`@Input\` and, when the card is clicked, emits a \`select\` event outward via \`@Output\`. It never loads users itself and doesn't know who handed them over.

## ⚠️ Common pitfalls

- **Prop drilling:** in a deep hierarchy, threading data through 5 levels of \`@Input\`/\`@Output\` is painful. Better to give the level that needs it access to a facade/store (a service wrapping the data store).
- **Artificial fragmentation:** not every component is worth splitting in two. For one-off view code it's pure overhead.
- **With signals/store the boundary blurs:** a presentational component may read from an injected store directly and still stay "dumb" in terms of business logic.

## 🎯 Key takeaways

- Smart fetches data and runs logic; dumb just draws what it's given.
- The main payoff is reusability and easy testing of the dumb components.
- It's a heuristic, not a law: apply it for real benefit, not as ritual.`,
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
      ru: `## 🧩 Простыми словами

Facade (фасад) — это как стойка регистрации в отеле. Ты подходишь и говоришь: «заселите меня» или «вызовите такси». Тебе не нужно знать, как устроена уборка номеров, бухгалтерия и договоры с таксопарками — всё это спрятано за стойкой. В Angular фасад — это сервис, который прячет сложную «внутреннюю кухню» управления состоянием за простыми понятными методами.

### Идея

**Facade** — это инжектируемый сервис (класс, который Angular сам создаёт и подставляет туда, где он нужен), скрывающий детали стейт-менеджмента (управления состоянием) за простым API. Под капотом может быть что угодно: NgRx с его селекторами и dispatch, сигналы, RxJS-субъекты. Компоненты зависят от фасада, а не от store (хранилища) напрямую.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class OrdersFacade {
  readonly orders$ = this.store.select(selectOrders);
  loadOrders() { this.store.dispatch(loadOrders()); }
}
\`\`\`

Здесь компонент просто читает \`orders$\` и вызывает \`loadOrders()\`. Слова «selector» и «dispatch» (термины NgRx) остаются внутри фасада — снаружи их не видно.

### Плюсы

- **Инкапсуляция (сокрытие деталей):** компонент не знает про NgRx. Можно поменять реализацию (например, NgRx → сигналы) и не трогать компоненты.
- **Упрощённое API:** пишешь \`facade.orders$\` вместо того, чтобы тащить импорты селекторов по всему проекту.
- **Тестируемость:** в тестах подменяется один фасад, а не весь стор.
- **Dependency inversion (инверсия зависимостей):** компонент зависит от абстракции (фасада), а не от конкретного хранилища.

### Риски

- **God-object («бог-объект»):** фасад разрастается и превращается в свалку методов всего домена.
- **Лишний слой:** для простого состояния это лишний boilerplate (шаблонный код) без выгоды.
- **Сокрытие сложности ≠ её устранение:** логика селекторов просто переезжает внутрь, и фасад может маскировать неоптимальные подписки.
- **Связывание доменов:** один фасад, тянущий сразу несколько доменов, нарушает их разделение.

## ⚠️ Подводные камни

- Не делай один общий фасад на всё приложение — по фасаду на домен (orders, billing и т.д.).
- Не добавляй фасад «на всякий случай»: если за ним всего пара сигналов, это оверинжиниринг.
- Помни, что фасад прячет сложность, но не убирает её — плохие подписки внутри останутся плохими.

## 🎯 Запомни

- Facade — сервис, прячущий детали стейта (NgRx/сигналы) за простым API.
- Даёт инкапсуляцию, лёгкие тесты и возможность сменить реализацию без правки компонентов.
- Оправдан в крупных приложениях с NgRx и многими потребителями; для маленького — оверинжиниринг.`,
      en: `## 🧩 In plain words

A Facade is like a hotel front desk. You walk up and say "check me in" or "call me a taxi." You don't need to know how room cleaning, accounting, or the taxi-company contracts work — all of that is hidden behind the desk. In Angular, a facade is a service that hides the complex "inner machinery" of state management behind a few simple, clear methods.

### The idea

A **Facade** is an injectable service (a class Angular creates and supplies wherever it's needed) that hides state-management details behind a simple API. Under the hood there can be anything: NgRx with its selectors and dispatch, signals, RxJS subjects. Components depend on the facade, not on the store (data container) directly.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class OrdersFacade {
  readonly orders$ = this.store.select(selectOrders);
  loadOrders() { this.store.dispatch(loadOrders()); }
}
\`\`\`

Here a component just reads \`orders$\` and calls \`loadOrders()\`. The words "selector" and "dispatch" (NgRx terms) stay inside the facade — they're invisible from outside.

### Benefits

- **Encapsulation (hiding details):** the component knows nothing about NgRx. You can swap the implementation (say, NgRx → signals) without touching components.
- **Simplified API:** you write \`facade.orders$\` instead of dragging selector imports all over the project.
- **Testability:** you mock one facade in tests instead of the whole store.
- **Dependency inversion:** the component depends on an abstraction (the facade), not a concrete store.

### Risks

- **God object:** the facade grows into a dumping ground for the whole domain's methods.
- **Extra layer:** for simple state it's just boilerplate (repetitive plumbing code) with no payoff.
- **Hiding complexity ≠ removing it:** selector logic simply moves inside, and the facade can mask suboptimal subscriptions.
- **Domain coupling:** one facade pulling in several domains at once breaks their separation.

## ⚠️ Common pitfalls

- Don't make a single global facade for the whole app — one facade per domain (orders, billing, etc.).
- Don't add a facade "just in case": if only a couple of signals sit behind it, that's over-engineering.
- Remember the facade hides complexity but doesn't erase it — bad subscriptions inside stay bad.

## 🎯 Key takeaways

- A Facade is a service that hides state details (NgRx/signals) behind a simple API.
- It gives encapsulation, easy tests, and the ability to swap implementations without editing components.
- Justified in large apps with NgRx and many consumers; for a small one it's over-engineering.`,
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
      ru: `## 🧩 Простыми словами

SOLID — это пять правил хорошего кода, придуманных, чтобы код было легко менять и не страшно ломать. Названия звучат пугающе, но идея простая: пусть каждый кусок делает одну вещь, и пусть детали легко заменяются, как лампочки в люстре. Хорошая новость: Angular со своим DI (внедрением зависимостей) сам подталкивает тебя к SOLID — многое ты уже делаешь, даже не зная названий.

### S — Single Responsibility (одна ответственность)

Каждый класс должен отвечать за что-то одно. Компонент отвечает только за представление (что видно на экране); HTTP-запросы, маппинг (преобразование данных) и бизнес-правила живут в сервисах. Симптом нарушения: компонент на 600 строк, внутри которого сидит \`HttpClient\` и сам ходит в сеть.

### O — Open/Closed (открыт для расширения, закрыт для изменения)

Добавляй новое поведение, не переписывая старые классы. В Angular это делают через DI-токены и стратегии. Пример: \`HTTP_INTERCEPTORS\` — ты добавляешь свой интерсептор (перехватчик запросов), не трогая сам \`HttpClient\`.

### L — Liskov Substitution (подстановка Барбары Лисков)

Любая реализация абстракции должна быть взаимозаменяема без сюрпризов. Если \`MockAuthService\` (подделка для тестов) нарушает контракт настоящего \`AuthService\`, то тесты «зелёные», но лгут — в проде поведение другое.

### I — Interface Segregation (разделение интерфейсов)

Не заставляй потребителя зависеть от огромного сервиса ради одного метода. Дели на узкие абстракции и токены:

\`\`\`ts
export const LOGGER = new InjectionToken<Logger>('Logger');
\`\`\`

\`InjectionToken\` — это «ярлычок», по которому DI понимает, что именно подставить. Так компонент просит ровно \`Logger\`, а не весь мега-сервис.

### D — Dependency Inversion (инверсия зависимостей)

Компоненты и сервисы зависят от **абстракций** (\`InjectionToken\`, \`abstract class\`), а конкретную реализацию подставляет DI:

\`\`\`ts
providers: [{ provide: PaymentGateway, useClass: StripeGateway }]
\`\`\`

Читается так: «когда кто-то просит \`PaymentGateway\`, дай ему \`StripeGateway\`». Это сердце Angular: его DI-контейнер — встроенная реализация DIP. Благодаря этому в тестах легко подставить фейки, а production-реализацию можно менять одной строкой конфигурации.

## ⚠️ Подводные камни

- Не превращай SOLID в карго-культ: абстракции ради абстракций вредят тривиальному коду.
- Мок, нарушающий контракт (L), делает тесты бесполезными — они «проходят», но не отражают реальность.
- Один жирный сервис-«всё-в-одном» нарушает сразу S и I; дроби его.

## 🎯 Запомни

- S — одна ответственность на класс; O — расширяй, не правь; L — реализации взаимозаменяемы; I — узкие абстракции; D — зависимость от абстракций.
- DI-контейнер Angular — это встроенный DIP; отсюда тестируемость и сменяемость реализаций.
- Применяй с умом: цель — гибкость и тесты, а не абстракции ради галочки.`,
      en: `## 🧩 In plain words

SOLID is five rules for good code, invented so that code stays easy to change and safe to touch. The names sound scary, but the idea is simple: let each piece do one thing, and let details swap out easily, like light bulbs in a chandelier. Good news: Angular, with its DI (dependency injection), already nudges you toward SOLID — you're doing much of it without knowing the names.

### S — Single Responsibility

Each class should be responsible for one thing. A component is responsible only for presentation (what's on screen); HTTP calls, mapping (data transformation), and business rules live in services. Violation symptom: a 600-line component with \`HttpClient\` inside, hitting the network itself.

### O — Open/Closed (open for extension, closed for modification)

Add new behavior without rewriting old classes. In Angular you do this via DI tokens and strategies. Example: \`HTTP_INTERCEPTORS\` — you add your own interceptor (request hook) without touching \`HttpClient\` itself.

### L — Liskov Substitution

Any implementation of an abstraction must be interchangeable without surprises. If \`MockAuthService\` (a test stand-in) breaks the real \`AuthService\` contract, your tests are "green" but lying — behavior differs in production.

### I — Interface Segregation

Don't force a consumer to depend on a huge service for one method. Split into narrow abstractions and tokens:

\`\`\`ts
export const LOGGER = new InjectionToken<Logger>('Logger');
\`\`\`

An \`InjectionToken\` is a "label" DI uses to know exactly what to supply. This way a component asks for just \`Logger\`, not some mega-service.

### D — Dependency Inversion

Components and services depend on **abstractions** (\`InjectionToken\`, \`abstract class\`), and DI supplies the concrete implementation:

\`\`\`ts
providers: [{ provide: PaymentGateway, useClass: StripeGateway }]
\`\`\`

Read it as: "when someone asks for \`PaymentGateway\`, give them \`StripeGateway\`." This is the heart of Angular: its DI container is a built-in DIP implementation. It lets tests inject fakes easily, and lets you swap the production implementation with one line of config.

## ⚠️ Common pitfalls

- Don't cargo-cult SOLID: abstractions for their own sake hurt trivial code.
- A mock that breaks the contract (L) makes tests useless — they "pass" but don't reflect reality.
- One fat "all-in-one" service violates both S and I at once; break it up.

## 🎯 Key takeaways

- S — one responsibility per class; O — extend, don't edit; L — implementations are interchangeable; I — narrow abstractions; D — depend on abstractions.
- Angular's DI container is a built-in DIP; that's where testability and swappable implementations come from.
- Apply it thoughtfully: the goal is flexibility and tests, not abstractions for a checkbox.`,
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
      ru: `## 🧩 Простыми словами

Представь большую кухню. Можно свалить все ножи в один ящик, все ложки в другой, все тарелки в третий — «по типу вещей». Звучит логично, но когда готовишь конкретное блюдо, ты бегаешь по всей кухне. Гораздо удобнее собрать всё для завтрака в одну зону, всё для десертов — в другую. В Angular то же самое: папки лучше группировать не по типу файлов, а по фиче (по кусочку функциональности приложения).

### Feature-first, а не type-first

**Плохо** — группировка по типу: папки \`components/\`, \`services/\`, \`pipes/\`, и внутри каждой свалено вообще всё приложение. Это не масштабируется: всё связано со всем, и найти нужное трудно.

**Хорошо** — группировка по **фиче/домену** (по смысловому куску приложения):

\`\`\`
src/app/
  features/orders/      # smart-компоненты, роутинг, стейт домена
  features/billing/
  shared/ui/            # переиспользуемые dumb-компоненты
  core/                 # singletons: auth, interceptors, config
\`\`\`

Здесь \`orders\` (заказы) и \`billing\` (оплата) — самостоятельные домены; \`shared\` — общее добро; \`core\` — синглтоны (объекты в одном экземпляре на всё приложение).

### Слои внутри фичи

Каждую фичу тоже полезно разложить по слоям:

\`\`\`
orders/
  data-access/   # сервисы, store, модели
  feature/       # smart-компоненты + routing
  ui/            # presentational
  util/
\`\`\`

\`data-access\` работает с данными, \`feature\` — умные компоненты страниц, \`ui\` — «глупые» компоненты для отрисовки, \`util\` — мелкие помощники.

### Принципы

- **Низкая связанность между доменами:** \`orders\` не импортирует \`billing\` напрямую — только через \`shared\`.
- **\`core\` — для синглтонов**, импортируется ровно один раз.
- **Barrel-файлы (\`index.ts\`)** задают публичный API фичи: наружу торчит только то, что положено, внутреннее спрятано.
- **Lazy-loading по фичам:** каждый домен грузится отдельным route-чанком (кусок кода подтягивается только когда пользователь заходит на этот маршрут).

## ⚠️ Подводные камни

- Циклические импорты между фичами (A тянет B, а B тянет A) → нужна выделенная shared-зона или пересмотр границ.
- \`shared\` превращается в свалку всего подряд → дели на \`shared/ui\`, \`shared/util\`, \`shared/data-access\`.
- Группировка по типу файлов кажется аккуратной на старте, но разваливается на масштабе.

### Связь с Nx

В монорепозитории (одном репозитории на много проектов) эта структура естественно ложится на **libs с тегами**, и границы между доменами enforce-ятся (проверяются) линтером автоматически, а не держатся на дисциплине команды.

## 🎯 Запомни

- Группируй по фиче/домену, а не по типу файлов.
- Держи домены независимыми, общее выноси в \`shared\`, синглтоны — в \`core\`, публичный API — через barrel-файлы.
- В монорепо на Nx границы доменов можно закрепить линтером, а не только договорённостью.`,
      en: `## 🧩 In plain words

Picture a big kitchen. You could dump all the knives in one drawer, all the spoons in another, all the plates in a third — "by type of thing." Sounds logical, but when you cook one specific dish you end up running all over the kitchen. It's far handier to gather everything for breakfast in one zone and everything for desserts in another. Angular is the same: group folders not by file type but by feature (a slice of app functionality).

### Feature-first, not type-first

**Bad** — grouping by type: folders \`components/\`, \`services/\`, \`pipes/\`, each stuffed with the entire app. It doesn't scale: everything couples to everything, and finding things is hard.

**Good** — grouping by **feature/domain** (a meaningful slice of the app):

\`\`\`
src/app/
  features/orders/      # smart components, routing, domain state
  features/billing/
  shared/ui/            # reusable dumb components
  core/                 # singletons: auth, interceptors, config
\`\`\`

Here \`orders\` and \`billing\` are self-contained domains; \`shared\` is common goods; \`core\` holds singletons (objects with a single instance for the whole app).

### Layers within a feature

Each feature is worth laying out in layers too:

\`\`\`
orders/
  data-access/   # services, store, models
  feature/       # smart components + routing
  ui/            # presentational
  util/
\`\`\`

\`data-access\` handles data, \`feature\` holds the smart page components, \`ui\` holds the dumb rendering components, \`util\` holds small helpers.

### Principles

- **Low coupling between domains:** \`orders\` doesn't import \`billing\` directly — only via \`shared\`.
- **\`core\` is for singletons**, imported exactly once.
- **Barrel files (\`index.ts\`)** define a feature's public API: only what's meant to be public sticks out, internals stay hidden.
- **Lazy-loading per feature:** each domain loads as its own route chunk (code that's fetched only when the user visits that route).

## ⚠️ Common pitfalls

- Cyclic imports between features (A pulls B, and B pulls A) → you need a dedicated shared zone or a boundary rethink.
- \`shared\` turns into a dumping ground for everything → split it into \`shared/ui\`, \`shared/util\`, \`shared/data-access\`.
- Grouping by file type looks tidy at the start but falls apart at scale.

### Relation to Nx

In a monorepo (one repository for many projects) this structure maps naturally onto **tagged libs**, and the boundaries between domains are enforced by the linter automatically, not held up by team discipline.

## 🎯 Key takeaways

- Group by feature/domain, not by file type.
- Keep domains independent, push common code to \`shared\`, singletons to \`core\`, and expose a public API via barrel files.
- In an Nx monorepo, domain boundaries can be enforced by the linter, not just by agreement.`,
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
      ru: `## 🧩 Простыми словами

Представь выключатель света в стене. Провода уже проложены и лампочка вкручена (код влит в проект), но свет не горит, пока ты не щёлкнешь выключателем. **Feature flag** (флаг фичи) — это такой выключатель для куска функциональности: код уже в приложении, но он «включается» отдельным переключателем во время работы программы, а не в момент выкладки.

Это позволяет разделить два разных события: **деплой** (выложить код на сервер) и **релиз** (показать фичу пользователям). Раньше это было одно и то же, а с флагами — нет.

### Зачем это нужно

Когда деплой и релиз разделены, открывается много возможностей:
- **Canary / постепенный rollout** — включить фичу сначала для 1% пользователей, потом для 10%, потом для всех. Если что-то ломается, страдает меньшинство.
- **A/B-тесты** — показать одним пользователям вариант A, другим вариант B, и сравнить.
- **Kill switch** (аварийный выключатель) — если фича сломалась в проде, её гасят одним щелчком, без срочного передеплоя.
- **Trunk-based development** — команда мержит код в главную ветку часто и маленькими кусками, а незаконченные фичи прячет за выключенным флагом, вместо того чтобы держать долгоживущие ветки, которые потом мучительно сливать.

### Как реализовать в Angular

Нужен **сервис флагов** — объект, который знает состояние всех выключателей. Он берёт данные из источника: это может быть готовый сервис вроде **LaunchDarkly** или **Unleash**, либо ваш собственный конфиг-файл. Флаги обычно загружают при старте приложения через \`APP_INITIALIZER\` — это хук Angular, который выполняет код до того, как приложение начнёт рендериться.

Доступ к флагу дают через сигнал/Observable (реактивное значение), структурную директиву или route guard (защиту маршрута). В шаблоне это выглядит так:

\`\`\`ts
@if (flags.isOn('new-checkout')) { <app-new-checkout /> } @else { <app-legacy-checkout /> }
\`\`\`

Здесь \`flags.isOn('new-checkout')\` спрашивает у сервиса: «выключатель new-checkout включён?». Если да — показываем новый компонент оформления заказа, если нет — старый.

### Где вычисляется флаг

Есть два подхода, где именно решается, включён флаг или нет:
- **Client-side (на клиенте)** — быстро, но значение флага попадает в JavaScript-бандл, который скачивает браузер. Это значит, что любой любопытный пользователь может его увидеть. Не годится для секретов и решений о безопасности.
- **Server-side / edge (на сервере или CDN-краю)** — безопаснее, потому что решение принимается там, куда пользователь не заглянет. Обязательно для авторизационных решений (кому что можно).

### Архитектурные риски

- **Flag debt (долг флагов):** забытые флаги накапливаются. Каждый флаг добавляет развилку в код (\`if\` включён / \`if\` выключен), и когда флагов много, код ветвится лавинообразно. Нужен процесс удаления — например, TTL (срок жизни флага) и тикеты на очистку.
- **Комбинаторный взрыв тестирования:** N флагов дают 2^N возможных сочетаний включено/выключено. Всё это протестировать невозможно, поэтому проверяют только значимые комбинации.
- **Мёртвый код:** за выключенными флагами копится код, который никто не удаляет и который просто разрастается.
- **Безопасность:** повторим важное — клиентский флаг не прячет фичу, потому что код всё равно лежит в бандле.
- **Производительность:** если флаги грузятся синхронно на старте, эта загрузка может заблокировать первый рендер и пользователь дольше смотрит на пустой экран.

### Best practices

Различайте два типа флагов:
- **Короткоживущие release-флаги** — включают новую фичу, удаляются вскоре после полного раскатывания.
- **Долгоживущие operational/permission-флаги** — управляют настройками или правами доступа, живут долго намеренно.

Логируйте использование флагов — это помогает находить мёртвые флаги, которые давно можно удалить.

## ⚠️ Подводные камни

- Клиентский флаг не защищает секретную фичу — код виден в бандле.
- Забытые флаги превращаются в технический долг и запутывают код.
- Синхронная загрузка флагов на старте может тормозить рендер.
- Не пытайтесь протестировать все 2^N комбинаций — только важные.

## 🎯 Запомни

- Feature flag разделяет **деплой** (выложить код) и **релиз** (показать фичу) — это его главная суперсила.
- Даёт постепенный rollout, A/B-тесты и аварийный kill switch.
- Клиентские флаги видны в бандле — не для безопасности.
- У каждого флага должен быть план удаления, иначе накопится flag debt.`,
      en: `## 🧩 In plain words

Think of a light switch on the wall. The wiring is already run and the bulb is screwed in (the code is merged into the project), but the light stays off until you flip the switch. A **feature flag** is exactly this kind of switch for a piece of functionality: the code is already in the app, but it's "turned on" by a separate toggle while the program runs, not at the moment you ship it.

This lets you split two events that used to be one: **deploy** (push code to the server) and **release** (show the feature to users). With flags, those become independent.

### Why you'd want this

Once deploy and release are separated, a lot opens up:
- **Canary / gradual rollout** — turn a feature on for 1% of users first, then 10%, then everyone. If something breaks, only a minority feels it.
- **A/B tests** — show some users variant A and others variant B, then compare.
- **Kill switch** — if a feature breaks in production, you shut it off with one flip, no emergency redeploy.
- **Trunk-based development** — the team merges code into the main branch often, in small pieces, and hides unfinished features behind an off flag, instead of keeping long-lived branches that are painful to merge later.

### How to implement it in Angular

You need a **flags service** — an object that knows the state of every switch. It reads from a source: a ready-made service like **LaunchDarkly** or **Unleash**, or your own config file. Flags are usually loaded at app startup via \`APP_INITIALIZER\` — an Angular hook that runs code before the app begins rendering.

Access to a flag is given through a signal/Observable (a reactive value), a structural directive, or a route guard. In a template it looks like this:

\`\`\`ts
@if (flags.isOn('new-checkout')) { <app-new-checkout /> } @else { <app-legacy-checkout /> }
\`\`\`

Here \`flags.isOn('new-checkout')\` asks the service: "is the new-checkout switch on?" If yes, show the new checkout component; if no, the legacy one.

### Where the flag is evaluated

There are two approaches for where the on/off decision is actually made:
- **Client-side** — fast, but the flag's value ends up in the JavaScript bundle the browser downloads. That means any curious user can see it. Not suitable for secrets or security decisions.
- **Server-side / edge** — safer, because the decision is made somewhere the user can't peek. Required for authorization decisions (who's allowed to do what).

### Architectural risks

- **Flag debt:** forgotten flags pile up. Each flag adds a fork in the code (\`if\` on / \`if\` off), and when there are many, the branching grows like an avalanche. You need a removal process — for example a TTL (flag lifetime) and cleanup tickets.
- **Test combinatorial explosion:** N flags produce 2^N possible on/off combinations. You can't test them all, so you test only the meaningful ones.
- **Dead code:** code accumulates behind off flags that nobody deletes and that just keeps growing.
- **Security:** worth repeating — a client-side flag doesn't hide a feature, because the code is in the bundle anyway.
- **Performance:** if flags load synchronously at startup, that load can block the first render, so the user stares at a blank screen longer.

### Best practices

Distinguish two kinds of flags:
- **Short-lived release flags** — turn on a new feature, then get deleted soon after full rollout.
- **Long-lived operational/permission flags** — control settings or access rights and live long on purpose.

Log flag usage — it helps you find dead flags that could have been removed long ago.

## ⚠️ Common pitfalls

- A client-side flag doesn't protect a secret feature — the code is visible in the bundle.
- Forgotten flags turn into technical debt and tangle up the code.
- Synchronous flag loading at startup can slow down render.
- Don't try to test all 2^N combinations — only the important ones.

## 🎯 Key takeaways

- A feature flag separates **deploy** (push code) from **release** (show the feature) — that's its core superpower.
- It enables gradual rollout, A/B tests, and an emergency kill switch.
- Client-side flags are visible in the bundle — not for security.
- Every flag needs a removal plan, or flag debt piles up.`,
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
      ru: `## 🧩 Простыми словами

**Стейт-менеджмент** — это то, как приложение хранит и обновляет свои данные (состояние): что в корзине, какой пользователь залогинен, открыто ли меню. Вопрос не в том, «какой инструмент самый крутой», а в том, «какой инструмент по размеру задачи». Молотком не забивают гвоздик от картины, но и отвёрткой не строят дом.

В Angular есть целый спектр вариантов — от совсем простых до тяжёлых. Задача — выбрать самый простой, которого хватает, и усложнять только когда реально болит.

### Спектр решений — от лёгкого к тяжёлому

1. **Локальное состояние компонента (signals/RxJS)** — данные живут внутри одного компонента и никому наружу не нужны. Сигнал (\`signal\`) — это реактивная переменная: меняешь значение, и всё, что от неё зависит, само обновляется. Идеально для UI-состояния вроде «открыт ли этот аккордеон».
2. **Сервис с сигналами / BehaviorSubject** — состояние среднего масштаба, которое делят несколько компонентов. Сервис (общий объект-одиночка) держит данные, компоненты их читают. \`BehaviorSubject\` — это RxJS-контейнер, который хранит текущее значение и отдаёт его новым подписчикам. Минимум лишнего кода.
3. **NgRx SignalStore** — структурированное хранилище на сигналах. Даёт готовые кирпичики: \`computed\` (производные значения), \`methods\` (методы для изменения) и \`rxMethod\` (для асинхронных потоков). Церемоний меньше, чем в классическом NgRx.
4. **Классический NgRx (Redux)** — самый тяжёлый вариант. Всё меняется через **события (actions)**, которые обрабатывают **редьюсеры (reducers)** — чистые функции, вычисляющие новое состояние. Побочные эффекты (запросы к серверу) живут в **эффектах (effects)**. Взамен получаешь devtools, лог всех действий и **time-travel** — возможность отматывать состояние назад, как видео.

### По каким критериям выбирать

- **Масштаб и число потребителей:** если одно и то же состояние читают много несвязанных мест приложения — пора в store.
- **Сложность асинхронных потоков:** если много гонок (кто первый ответит), отмен запросов и координации эффектов — тут выручают NgRx Effects / rxMethod.
- **Аудит и отладка:** если нужен полный лог действий, time-travel и воспроизводимость багов — это сильная сторона классического NgRx.
- **Командная дисциплина:** строгий event-sourcing (всё через события) наводит порядок в большой команде, но для маленькой это лишний вес.
- **Производительность ререндеров:** сигналы дают точечную реактивность — обновляется ровно то, что изменилось, без обхода всего дерева через zone.js.

### Анти-паттерны

- **NgRx ради простой CRUD-формы** — куча церемоний (actions, reducers, effects) без всякой выгоды.
- **Глобальный store для чисто локального UI-состояния** — зачем выносить «открыт ли тултип» на весь мир.
- **Дублирование server state в store** — данные с сервера лучше держать в специальном кэширующем data-слое, а не копировать вручную в общий store.

### Практическая эвристика

Начинай с **сигналов и сервисов**. Вводи NgRx только когда боль от ручной координации (гонки, инвалидация кэша, потребность в аудите) станет больше, чем стоимость его boilerplate. И помни: **server-state** (данные, которые живут на сервере) часто удобнее держать в отдельном data-layer, а не в общем store приложения.

## ⚠️ Подводные камни

- Тянуть NgRx в маленький проект «на будущее» — платить церемониями сразу, а выгоду получить может и никогда.
- Держать серверные данные в store вручную — придётся самому решать инвалидацию и синхронизацию; проще взять кэширующий слой.
- Глобализировать локальное состояние — усложняет код без причины.

## 🎯 Запомни

- Выбирай не «лучший» инструмент, а самый простой из достаточных.
- Стартуй с сигналов/сервисов; усложняй только когда ручная координация реально болит.
- NgRx окупается на масштабе, сложной асинхронности и потребности в аудите/time-travel.
- Server-state — часто в отдельный data-layer, а не в общий store.`,
      en: `## 🧩 In plain words

**State management** is how an app stores and updates its data (its state): what's in the cart, which user is logged in, whether the menu is open. The question isn't "which tool is coolest," but "which tool fits the size of the job." You don't drive a picture nail with a sledgehammer, and you don't build a house with a screwdriver.

Angular offers a whole spectrum, from very simple to heavyweight. The goal is to pick the simplest thing that's enough, and reach for more power only when it actually hurts.

### The spectrum — from light to heavy

1. **Local component state (signals/RxJS)** — data lives inside one component and nobody outside needs it. A signal (\`signal\`) is a reactive variable: change its value and everything depending on it updates itself. Perfect for UI state like "is this accordion open."
2. **Service with signals / BehaviorSubject** — medium-scale state shared by a few components. A service (a shared singleton object) holds the data; components read it. A \`BehaviorSubject\` is an RxJS container that stores the current value and hands it to new subscribers. Minimal extra code.
3. **NgRx SignalStore** — a structured, signal-based store. It gives ready-made building blocks: \`computed\` (derived values), \`methods\` (to change state), and \`rxMethod\` (for async flows). Less ceremony than classic NgRx.
4. **Classic NgRx (Redux)** — the heaviest option. Everything changes through **actions** (events) handled by **reducers** — pure functions that compute the new state. Side effects (server calls) live in **effects**. In return you get devtools, a log of every action, and **time-travel** — rewinding state like a video.

### The criteria for choosing

- **Scale and number of consumers:** if the same state is read by many unrelated parts of the app, it's time for a store.
- **Async flow complexity:** lots of races (who answers first), request cancellations, and effect coordination — that's where NgRx Effects / rxMethod earn their keep.
- **Audit and debugging:** if you need a full action log, time-travel, and reproducible bugs, that's classic NgRx's strong suit.
- **Team discipline:** strict event-sourcing (everything through actions) brings order to a big team, but for a small one it's dead weight.
- **Re-render performance:** signals give fine-grained reactivity — exactly what changed updates, without walking the whole tree via zone.js.

### Anti-patterns

- **NgRx for a simple CRUD form** — a pile of ceremony (actions, reducers, effects) with no payoff.
- **A global store for purely local UI state** — no need to broadcast "is the tooltip open" to the whole world.
- **Duplicating server state in the store** — data from the server is better kept in a dedicated caching data layer than copied by hand into a general store.

### A practical heuristic

Start with **signals and services**. Introduce NgRx only when the pain of manual coordination (races, cache invalidation, the need for an audit trail) grows bigger than the cost of its boilerplate. And remember: **server state** (data that lives on the server) is often better kept in a dedicated data layer than in the app's general store.

## ⚠️ Common pitfalls

- Pulling NgRx into a small project "for the future" means paying the ceremony cost now for a benefit that may never arrive.
- Keeping server data in the store by hand forces you to solve invalidation and syncing yourself; a caching layer is easier.
- Globalizing local state complicates the code for no reason.

## 🎯 Key takeaways

- Pick not the "best" tool but the simplest one that's sufficient.
- Start with signals/services; add complexity only when manual coordination genuinely hurts.
- NgRx pays off at scale, with complex async, and when you need audit/time-travel.
- Server state often belongs in a dedicated data layer, not the general store.`,
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
      ru: `## 🧩 Простыми словами

**Дизайн-система** — это как набор LEGO для интерфейса. Есть базовые кубики (кнопки, поля ввода) и правила, как их красить и соединять. Когда несколько команд строят из одних и тех же кубиков, все продукты выглядят и ведут себя одинаково, и никто не изобретает кнопку заново.

**Библиотека компонентов** — это коробка с этими кубиками (готовый код), а дизайн-система — ещё и правила, как ими пользоваться. Главная задача — сделать так, чтобы кубики легко переиспользовались многими командами и не ломались при обновлениях.

### Слои дизайн-системы

Дизайн-систему удобно строить слоями, снизу вверх:

1. **Design tokens (токены)** — самые атомарные значения: цвета, отступы, шрифты. Это единый источник истины, обычно заданный через CSS custom properties (переменные CSS вида \`--color-primary\`). Смысл: чтобы сменить тему (например, тёмную на светлую), меняешь токены — и все компоненты перекрашиваются, ничего не пересобирая.
2. **Примитивы** — базовые компоненты: \`Button\`, \`Input\`, \`Dialog\`. Они **presentational** (только показывают, без бизнес-логики) и **доступные (a11y)** по умолчанию — то есть работают с клавиатуры и с экранными читалками из коробки.
3. **Паттерны / композиты** — более крупные штуки, собранные из примитивов: формы, таблицы.

### Ключевые принципы

- **API-стабильность:** если ломающее изменение прилетает в общий компонент, больно становится всем командам-потребителям сразу. Поэтому — строгий semver (версионирование, где мажорная версия сигналит о ломающих изменениях) и период deprecation (сначала помечаем старое устаревшим, даём время мигрировать, потом удаляем).
- **Доступность встроена:** фокус, ARIA-атрибуты, работа с клавиатуры делаются на уровне примитива, а не перекладываются на того, кто его использует. Angular **CDK** (Component Dev Kit) даёт для этого готовые harness (тест-обёртки) и a11y-утилиты.
- **Тематизация через токены**, а не форк компонентов — не копируй кнопку, чтобы перекрасить, просто поменяй токен.
- **Минимум зависимостей:** библиотека не должна тащить за собой конкретный state-менеджер или другие тяжёлые зависимости, иначе она навяжет их всем.

### Как поставлять командам

- **В монорепозитории** — отдельная \`ui\`-библиотека с тегами и контролем границ (чтобы команды не лезли во внутренности друг друга).
- **В полиреп (много репозиториев)** — версионированный npm-пакет; тут нужен строгий процесс релизов, иначе команды разъедутся по версиям.

### Риски

- **Coupling (связанность):** если в компонент затесалась бизнес-логика, его уже не переиспользуешь в другом месте — он «прирос» к своему контексту.
- **Версионный скос:** при полиреп разные команды сидят на разных версиях, кто-то отстаёт на целый мажор — и общий контракт расползается.
- **Over-abstraction (переусложнение):** слишком гибкий API с десятками пропсов запутывает сильнее, чем несколько чётких готовых вариантов. Иногда меньше свободы — лучше.

### Тестирование

- **Визуальная регрессия** (Chromatic или Playwright-снапшоты) — ловит, когда кнопка внезапно поехала визуально.
- **Unit-тесты** на логику взаимодействия (клики, состояния).
- **Harness-тесты** — проверяют контракт компонента через официальные тест-обёртки CDK.

## ⚠️ Подводные камни

- Бизнес-логика внутри примитива убивает переиспользуемость — держи примитивы «глупыми».
- Слишком много пропсов = API, в котором никто не разберётся; предпочитай чёткие варианты.
- В полиреп без дисциплины релизов команды застрянут на разных версиях.
- Не форкай компонент ради новой темы — для этого есть токены.

## 🎯 Запомни

- Строй слоями: токены → примитивы → паттерны.
- Токены — единый источник истины для тем; меняй их, а не форкай компоненты.
- a11y и стабильность API закладывай в примитивы, а не перекладывай на потребителей.
- Меньше связанности и меньше «магической гибкости» — легче переиспользовать.`,
      en: `## 🧩 In plain words

A **design system** is like a LEGO set for your interface. There are basic bricks (buttons, inputs) and rules for how to color and connect them. When several teams build from the same bricks, all the products look and behave the same, and nobody reinvents the button.

A **component library** is the box of those bricks (the actual code), while a design system is that plus the rules for using them. The main goal is to make the bricks easy to reuse across many teams and hard to break during updates.

### Design-system layers

It helps to build a design system in layers, bottom to top:

1. **Design tokens** — the most atomic values: colors, spacing, typography. They're a single source of truth, usually defined via CSS custom properties (CSS variables like \`--color-primary\`). The point: to switch a theme (say dark to light) you change the tokens, and every component re-colors itself without any rebuild.
2. **Primitives** — the base components: \`Button\`, \`Input\`, \`Dialog\`. They're **presentational** (they only display, no business logic) and **accessible (a11y)** by default — meaning they work with the keyboard and screen readers out of the box.
3. **Patterns / composites** — bigger things assembled from primitives: forms, tables.

### Key principles

- **API stability:** if a breaking change lands in a shared component, every consuming team hurts at once. So: strict semver (versioning where a major bump signals breaking changes) and a deprecation window (mark the old thing deprecated first, give people time to migrate, then remove it).
- **Accessibility built in:** focus, ARIA attributes, and keyboard support are done at the primitive level, not offloaded to whoever uses it. Angular's **CDK** (Component Dev Kit) provides ready-made harnesses (test wrappers) and a11y utilities for this.
- **Theme via tokens**, not component forks — don't copy a button just to recolor it, just change the token.
- **Minimal dependencies:** the library shouldn't drag along a specific state manager or other heavy dependencies, or it forces them on everyone.

### How to deliver it to teams

- **In a monorepo** — a dedicated \`ui\` library with tags and boundary enforcement (so teams don't reach into each other's internals).
- **In polyrepo (many repositories)** — a versioned npm package; here you need a strict release process, or teams drift apart across versions.

### Risks

- **Coupling:** if business logic sneaks into a component, you can't reuse it elsewhere — it's "grown into" its context.
- **Version skew:** in polyrepo, different teams sit on different versions, someone lags a whole major, and the shared contract frays.
- **Over-abstraction:** an overly flexible API with dozens of props confuses more than a few clear, ready-made variants. Sometimes less freedom is better.

### Testing

- **Visual regression** (Chromatic or Playwright snapshots) — catches when a button suddenly shifts visually.
- **Unit tests** on interaction logic (clicks, states).
- **Harness tests** — verify a component's contract through CDK's official test wrappers.

## ⚠️ Common pitfalls

- Business logic inside a primitive kills reusability — keep primitives "dumb."
- Too many props = an API nobody can figure out; prefer clear variants.
- In polyrepo without release discipline, teams get stuck on different versions.
- Don't fork a component for a new theme — that's what tokens are for.

## 🎯 Key takeaways

- Build in layers: tokens → primitives → patterns.
- Tokens are the single source of truth for themes; change them, don't fork components.
- Bake a11y and API stability into primitives, don't offload them to consumers.
- Less coupling and less "magic flexibility" means easier reuse.`,
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
      ru: `## 🧩 Простыми словами

Представь, что у компании много проектов. Их можно хранить двумя способами. **Monorepo** (моно-репозиторий) — это как один большой дом, где все команды живут под одной крышей: общая кухня, общие правила. **Polyrepo** (много репозиториев) — это посёлок из отдельных домиков: у каждой команды свой дом, свои ключи, свои порядки.

Ни один вариант не «правильный» — это компромисс. Главный вопрос простой: что для вас дешевле — **координировать** всех под одной крышей или **изолировать** каждого в своём домике.

### Monorepo — всё в одном репозитории

Один репозиторий на много проектов и библиотек.

**Плюсы:**
- **Атомарные изменения** — можно поменять несколько пакетов в одном PR (pull request), и всё едет вместе, согласованно.
- **Единый тулинг** — одни версии зависимостей, одни линтеры, одни стандарты для всех.
- **Простой code-sharing** — легко переиспользовать код и рефакторить, потому что всё видно целиком.
- С **Nx** или **Turborepo** есть граф \`affected\` (что затронуто изменением) и кэш — они пересобирают и тестируют только изменённое, поэтому CI остаётся быстрым несмотря на размер репо.

**Минусы:**
- Нужна инфраструктура (Nx, кэш, граф зависимостей), иначе CI начнёт деградировать по мере роста.
- Риск **жёсткой связанности (tight coupling)**, если не enforce-ить границы между проектами — все начнут лезть друг к другу.
- Контроль доступа на уровне репозитория грубее: сложно дать кому-то доступ только к части.
- Огромная история git — операции могут тормозить без специальных оптимизаций.

### Polyrepo — репозиторий на команду/проект

Отдельный репозиторий на каждый проект или команду.

**Плюсы:**
- **Сильная изоляция** — независимые владение, доступы и релизы. Каждый сам себе хозяин.
- Простая ментальная модель: смотришь на один репозиторий и всё про него понимаешь.

**Минусы:**
- **Версионный ад** для общих пакетов — если поменять API общей библиотеки, придётся согласованно выпускать релизы во всех репозиториях, которые её используют.
- Дублирование тулинга и дрейф стандартов — каждый настраивает своё, и со временем всё расходится.
- Кросс-репо рефакторинг болезненный — изменение, затрагивающее несколько репозиториев, приходится делать частями.

### Когда что выбирать

- **Monorepo** — когда это одна организация с множеством взаимозависимых фронтенд-проектов, общей дизайн-системой и утилитами, и вы хотите делать атомарные рефакторинги через всё сразу.
- **Polyrepo** — когда продукты слабо связаны, у них разные организации или комплаенс-границы (например, требования безопасности не позволяют смешивать), и у каждого свой независимый жизненный цикл.

### Главная мысль

Ключевой вопрос — **стоимость координации против стоимости изоляции**. Monorepo переносит сложность в тулинг (нужны Nx, кэш, enforce границ). Polyrepo переносит сложность в процессы релизов (нужно координировать версии между репозиториями). Ты не убираешь сложность, ты выбираешь, куда её положить.

## ⚠️ Подводные камни

- Monorepo без Nx/кэша/границ рано или поздно превращается в медленный CI и клубок связанностей.
- Polyrepo с общими библиотеками ведёт к версионному аду и болезненным кросс-репо изменениям.
- «Выбрать по моде» — плохо; выбирай по тому, что дешевле именно вашей команде.

## 🎯 Запомни

- Оба варианта — компромисс, «правильного» нет.
- Monorepo: атомарные изменения и общий тулинг, но нужна инфраструктура и контроль границ.
- Polyrepo: сильная изоляция и независимость, но версионный ад для общего кода.
- Суть: monorepo кладёт сложность в тулинг, polyrepo — в процессы релизов.`,
      en: `## 🧩 In plain words

Imagine a company with many projects. There are two ways to store them. A **monorepo** is like one big house where all the teams live under one roof: shared kitchen, shared rules. A **polyrepo** (many repositories) is a village of separate little houses: each team has its own house, its own keys, its own way of doing things.

Neither is "the right one" — it's a trade-off. The core question is simple: which is cheaper for you — to **coordinate** everyone under one roof, or to **isolate** each team in its own house.

### Monorepo — everything in one repository

One repository for many projects and libraries.

**Pros:**
- **Atomic changes** — you can change several packages in one PR (pull request), and it all ships together, in sync.
- **Unified tooling** — one set of dependency versions, one set of linters, one set of standards for everyone.
- **Easy code-sharing** — reusing and refactoring code is easy because you see the whole thing.
- With **Nx** or **Turborepo** there's an \`affected\` graph (what a change touched) and a cache — they rebuild and test only what changed, so CI stays fast despite the repo's size.

**Cons:**
- Requires infrastructure (Nx, cache, dependency graph), or CI degrades as it grows.
- Risk of **tight coupling** if boundaries between projects aren't enforced — everyone starts reaching into everyone else.
- Repo-level access control is coarser: it's hard to grant someone access to only part of it.
- Huge git history — operations can slow down without special optimizations.

### Polyrepo — one repository per team/project

A separate repository for each project or team.

**Pros:**
- **Strong isolation** — independent ownership, access, and releases. Each team is its own boss.
- Simple mental model: look at one repository and you understand it fully.

**Cons:**
- **Versioning hell** for shared packages — if you change a shared library's API, you have to coordinate releases across every repository that uses it.
- Duplicated tooling and standards drift — each team configures its own, and over time everything diverges.
- Cross-repo refactoring is painful — a change spanning several repositories has to be done piecemeal.

### When to choose which

- **Monorepo** — when it's one organization with many interdependent frontend projects, a shared design system and utilities, and you want atomic refactors across everything at once.
- **Polyrepo** — when products are loosely coupled, they belong to different orgs or compliance boundaries (e.g. security rules forbid mixing), and each has its own independent lifecycle.

### The main idea

The core question is **coordination cost vs isolation cost**. A monorepo pushes complexity into tooling (you need Nx, caching, boundary enforcement). A polyrepo pushes complexity into release processes (you need to coordinate versions across repositories). You don't remove the complexity, you choose where to put it.

## ⚠️ Common pitfalls

- A monorepo without Nx/cache/boundaries eventually becomes slow CI and a tangle of coupling.
- A polyrepo with shared libraries leads to versioning hell and painful cross-repo changes.
- Choosing "by fashion" is bad; choose by what's cheaper for your specific team.

## 🎯 Key takeaways

- Both options are trade-offs; there's no universally "right" one.
- Monorepo: atomic changes and unified tooling, but needs infrastructure and boundary enforcement.
- Polyrepo: strong isolation and independence, but versioning hell for shared code.
- The essence: monorepo puts complexity in tooling, polyrepo in release processes.`,
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
      ru: `## 🧩 Простыми словами

Тесты бывают разного «масштаба»: маленькие проверяют одну функцию, большие — весь сценарий в браузере. Вопрос в том, каких сколько делать. «Пирамида» и «трофей» — это две картинки-подсказки, которые говорят, где держать основной вес ваших тестов. Представьте, что вы решаете, сколько сил вложить в проверку каждой детали автомобиля, а сколько — в тест-драйв всей машины.

### Testing Pyramid (пирамида тестов)

Классическая модель, которую предложил Майк Кон (Mike Cohn). Форма — пирамида, широкая снизу:

- Внизу (много) — **unit**-тесты. _Unit_ (юнит) — это проверка одного маленького кусочка кода в изоляции: одна функция, один класс.
- В середине (меньше) — **integration**-тесты. _Integration_ (интеграция) — проверка, что несколько кусочков работают вместе.
- Наверху (совсем мало) — **e2e**-тесты. _e2e_ (end-to-end, «от края до края») — проверка всего сценария целиком, как это делает живой пользователь в браузере.

Логика простая: чем выше по пирамиде, тем тест дороже, медленнее и более _flaky_ (капризный — то проходит, то падает без изменений в коде). Поэтому дорогих тестов делаем мало, дешёвых — много.

### Testing Trophy (трофей тестов)

Модель Кента Доддса (Kent C. Dodds), заточенная под фронтенд. Форма — как спортивный кубок:

- Основание — **статический анализ**. Это типы (TypeScript) и линтер (ESLint) — инструменты, которые ловят ошибки, даже не запуская код.
- Самая широкая часть (главный акцент) — **integration**-тесты.
- Тоньше — **unit** и **e2e**.

Девиз трофея: _«Test behavior, not implementation»_ — «проверяй поведение, а не то, как оно внутри устроено».

### Почему для фронтенда лучше трофей

- UI-юниты часто цепляются к деталям реализации (какой метод вызвался, как называется внутренняя переменная). Из-за этого они ломаются при любом рефакторинге, хотя приложение работает — **низкая отдача по надёжности**.
- Integration-тест компонента с настоящим DOM (структура страницы в памяти) и замоканной сетью проверяет именно то, что важно пользователю, и переживает рефакторинг спокойно.
- Статический анализ ловит целый класс ошибок бесплатно — поэтому он в фундаменте трофея.

### Что и где применять

- **Unit** — для чистой логики: утилиты, редьюсеры, форматтеры, алгоритмы. То, что легко проверить входом-выходом.
- **Integration / component** — основной объём: компонент + его шаблон + сервисы, замоканные на границе HTTP (то есть подделываем только сетевые запросы, а всё остальное настоящее).
- **e2e** — критичные пользовательские сценарии (happy path оплаты, логина). Их немного из-за цены и капризности.

## ⚠️ Подводные камни

- **Ice-cream cone** («рожок мороженого») — перевёрнутая пирамида: много e2e, мало unit. Итог — медленный и нестабильный CI (автоматический прогон тестов при каждом коммите).
- **100% покрытие юнит-тестами обманчиво**: оно не гарантирует, что фичи работают вместе. Можно покрыть каждую функцию и всё равно иметь сломанный экран.
- Не путайте цель: тесты нужны для уверенности в поведении, а не ради красивой цифры покрытия.

## 🎯 Запомни

- Пирамида: много unit → меньше integration → мало e2e (чем выше, тем дороже и капризнее).
- Трофей (для фронтенда): фундамент из типов/линта, а главный вес — на integration-тестах.
- Проверяй поведение, а не детали реализации — такие тесты переживают рефакторинг.
- Избегай «рожка мороженого»: перекос в e2e делает CI медленным и нестабильным.`,
      en: `## 🧩 In plain words

Tests come in different "sizes": small ones check a single function, big ones run a whole scenario in a browser. The question is how many of each to write. The "pyramid" and the "trophy" are two picture-hints that tell you where to keep the bulk of your tests. Think of deciding how much effort to spend checking each car part versus test-driving the whole car.

### Testing Pyramid

The classic model, proposed by Mike Cohn. It's shaped like a pyramid, wide at the bottom:

- Bottom (many) — **unit** tests. A _unit_ is a check of one tiny piece of code in isolation: one function, one class.
- Middle (fewer) — **integration** tests, which check that several pieces work together.
- Top (very few) — **e2e** tests. _e2e_ (end-to-end) checks a whole scenario the way a real user would in a browser.

The logic is simple: the higher up the pyramid, the more expensive, slower, and _flaky_ (unreliable — passing then failing with no code change) the test. So make few expensive tests and many cheap ones.

### Testing Trophy

Kent C. Dodds's model, tuned for the frontend. It's shaped like a sports trophy:

- The base — **static analysis**. That's types (TypeScript) and a linter (ESLint) — tools that catch bugs without even running the code.
- The widest part (the main emphasis) — **integration** tests.
- Thinner — **unit** and **e2e**.

The trophy's motto: _"Test behavior, not implementation"_ — check what the code does, not how it's built inside.

### Why the trophy fits the frontend

- UI unit tests often cling to implementation details (which method was called, the name of an internal variable). So they break on any refactor even though the app still works — **low reliability return**.
- An integration test of a component with a real DOM (the page structure held in memory) and a mocked network checks exactly what matters to the user and survives refactoring calmly.
- Static analysis catches a whole class of bugs for free — that's why it's the trophy's foundation.

### What to use where

- **Unit** — for pure logic: utilities, reducers, formatters, algorithms. Things easy to check by input and output.
- **Integration / component** — the bulk: component + its template + services, mocked at the HTTP boundary (we fake only the network calls, everything else is real).
- **e2e** — critical user journeys (checkout and login happy paths). Keep few, due to cost and flakiness.

## ⚠️ Common pitfalls

- **Ice-cream cone** — the inverted pyramid: many e2e, few unit. Result: slow, unstable CI (the automatic test run on every commit).
- **100% unit coverage is deceptive**: it doesn't guarantee features work together. You can cover every function and still have a broken screen.
- Don't confuse the goal: tests exist for confidence in behavior, not for a pretty coverage number.

## 🎯 Key takeaways

- Pyramid: many unit → fewer integration → few e2e (higher means costlier and flakier).
- Trophy (for frontend): a base of types/lint, with the main weight on integration tests.
- Test behavior, not implementation details — such tests survive refactoring.
- Avoid the "ice-cream cone": an e2e-heavy skew makes CI slow and unstable.`,
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
      ru: `## 🧩 Простыми словами

Когда вы тестируете Angular-компонент, у него часто есть дочерние компоненты внутри. Вопрос: подставлять ли их настоящими или заменить на «пустышки»? _Deep_-тест берёт всё по-настоящему, как матрёшку со всеми фигурками внутри. _Shallow_-тест оставляет только внешнюю матрёшку, а внутренние заменяет картонными макетами. \`TestBed\` — это «стенд для сборки» компонента в тесте (Angular-инструмент, который создаёт компонент вместе с его окружением).

### Deep (integration) тест

Рендерит компонент **со всеми настоящими дочерними компонентами**. Проверяет, что шаблон и поведение реально стыкуются с детьми.

- **Плюс:** ловит настоящие баги взаимодействия, ближе к тому, что видит пользователь.
- **Минус:** хрупкость — тест падает, даже если сломался ребёнок, а не сам компонент. Медленнее и тянет много зависимостей в \`TestBed\` (каждому ребёнку нужны его сервисы, импорты и т.д.).

### Shallow тест

Изолирует тестируемый компонент, **заменяя детей заглушками**. Заглушка — это либо mock-компонент (пустышка с тем же селектором, теми же \`@Input()\`/\`@Output()\`, но без внутренней логики), либо схема \`NO_ERRORS_SCHEMA\`, которая говорит Angular «не ругайся на незнакомые теги».

- **Плюс:** быстро, фокус на логике именно этого компонента, устойчиво к изменениям в детях.
- **Минус:** не ловит интеграционные баги. А \`NO_ERRORS_SCHEMA\` опасен — он глушит настоящие ошибки шаблона: опечатку в имени селектора или в \`@Input()\` тест пропустит молча.

### Пример настройки

\`\`\`ts
TestBed.configureTestingModule({
  imports: [ParentComponent],
  // shallow: подменяем дитя
}).overrideComponent(ParentComponent, { set: { imports: [MockChildComponent] } });
\`\`\`

Здесь мы собираем родителя, но через \`overrideComponent\` подсовываем ему \`MockChildComponent\` вместо настоящего ребёнка — это и есть shallow-подход.

### Trade-offs (на что меняем что)

- **\`NO_ERRORS_SCHEMA\` vs mock-компоненты:** схема проще в написании, но прячет ошибки. Явные mock-компоненты безопаснее, потому что сохраняют контракт (селектор, Input/Output). Библиотека \`ngMocks\` помогает создавать такие заглушки автоматически.
- **Скорость vs реализм:** shallow быстрее и стабильнее, deep реалистичнее и ближе к пользователю.

## ⚠️ Подводные камни

- \`NO_ERRORS_SCHEMA\` как способ «заткнуть» ошибки — частая ошибка: тест зеленеет, но реальная опечатка в шаблоне проходит незамеченной.
- Deep-тесты легко превращаются в хрупкие: падение в глубоко вложенном ребёнке роняет тест родителя, и вы тратите время на чужую поломку.
- Тестирование приватных деталей (внутренних методов, полей) вместо контракта — тест ломается на каждом рефакторинге.

## 🎯 Запомни

- Deep — все дети настоящие: реалистично, но хрупко и медленно. Shallow — дети-заглушки: быстро и изолированно, но без интеграционных багов.
- Проверяйте **поведение и контракт** (Input/Output, что отрендерилось), а не приватные детали.
- Shallow — для сложной логики родителя; deep — для критичных интеграций.
- Избегайте \`NO_ERRORS_SCHEMA\` для «глушения» ошибок; предпочитайте явные mock-компоненты.`,
      en: `## 🧩 In plain words

When you test an Angular component, it often has child components inside it. The question: do you use the real children, or replace them with "dummies"? A _deep_ test uses everything for real, like a nesting doll with all the figures inside. A _shallow_ test keeps only the outer doll and swaps the inner ones for cardboard cutouts. \`TestBed\` is the "assembly rig" for a component in a test (an Angular tool that builds the component together with its surroundings).

### Deep (integration) test

Renders the component **with all the real child components**. It checks that the template and behavior genuinely fit together with the children.

- **Pro:** catches real interaction bugs, closer to what the user sees.
- **Con:** fragile — the test fails even when a child broke, not the component itself. Slower, and it pulls many dependencies into \`TestBed\` (each child needs its own services, imports, and so on).

### Shallow test

Isolates the component under test by **replacing children with stubs**. A stub is either a mock component (a dummy with the same selector, the same \`@Input()\`/\`@Output()\`, but no internal logic), or the \`NO_ERRORS_SCHEMA\`, which tells Angular "don't complain about unknown tags."

- **Pro:** fast, focused on this component's own logic, resilient to changes in the children.
- **Con:** misses integration bugs. And \`NO_ERRORS_SCHEMA\` is dangerous — it silences real template errors: a typo in a selector name or an \`@Input()\` slips through unnoticed.

### Setup example

\`\`\`ts
TestBed.configureTestingModule({
  imports: [ParentComponent],
  // shallow: replace the child
}).overrideComponent(ParentComponent, { set: { imports: [MockChildComponent] } });
\`\`\`

Here we build the parent, but via \`overrideComponent\` we slip it a \`MockChildComponent\` instead of the real child — that's the shallow approach.

### Trade-offs

- **\`NO_ERRORS_SCHEMA\` vs mock components:** the schema is simpler to write but hides errors. Explicit mock components are safer because they keep the contract (selector, Input/Output). The \`ngMocks\` library helps generate such stubs automatically.
- **Speed vs realism:** shallow is faster and more stable, deep is more realistic and closer to the user.

## ⚠️ Common pitfalls

- Using \`NO_ERRORS_SCHEMA\` to "shut up" errors is a common mistake: the test goes green, but a real template typo passes unnoticed.
- Deep tests easily become fragile: a failure in a deeply nested child topples the parent's test, and you waste time on someone else's breakage.
- Testing private details (internal methods, fields) instead of the contract makes the test break on every refactor.

## 🎯 Key takeaways

- Deep — all children real: realistic, but fragile and slow. Shallow — stubbed children: fast and isolated, but no integration bugs.
- Test **behavior and contract** (Input/Output, what rendered), not private details.
- Use shallow for complex parent logic; deep for critical integrations.
- Avoid \`NO_ERRORS_SCHEMA\` for silencing errors; prefer explicit mock components.`,
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
      ru: `## 🧩 Простыми словами

Когда мы тестируем код, ему часто нужны «соседи»: база данных, сервис, другой объект. В тесте настоящих соседей брать неудобно — они медленные или непредсказуемые. Поэтому мы подставляем подделки. Но подделки бывают разные: одна просто занимает место, другая заранее знает ответ, третья записывает, кто к ней обращался. Эти виды называются _test doubles_ («дублёры теста», как каскадёры-дублёры в кино). Их пять, и у каждого своя роль.

### Терминология (по Джерарду Мезаросу)

- **Dummy** («болванка») — объект, который передают только чтобы заполнить параметр; внутри он не используется. Например, \`null\` или пустой объект как неважный аргумент.
- **Stub** («заглушка») — возвращает заранее заготовленные ответы, чтобы провести тест по нужной ветке. Сам он ничего не проверяет.
- **Spy** («шпион») — оборачивает настоящий (или поддельный) объект и **записывает вызовы**: с какими аргументами и сколько раз его позвали. Потом это можно проверить.
- **Mock** («имитация с ожиданиями») — объект с **заранее прописанными ожиданиями**. Тест падает, если ожидаемые вызовы не случились. Это называется _behaviour verification_ — проверка поведения (что вызвали).
- **Fake** («упрощённая реализация») — рабочая, но упрощённая версия. Например, репозиторий в памяти вместо настоящей базы данных: работает по-настоящему, но без диска и сети.

### В Jest / Jasmine границы размыты

На практике в популярных фреймворках эти роли смешиваются. \`jest.fn()\` и \`spyOn\` совмещают в себе и заглушку (stub), и шпиона (spy) сразу:

\`\`\`ts
const repo = { save: jest.fn().mockResolvedValue({ id: 1 }) }; // stub + spy
service.create(dto);
expect(repo.save).toHaveBeenCalledWith(dto); // проверка вызова — mock-стиль
\`\`\`

Тут \`mockResolvedValue\` задаёт готовый ответ (роль stub), а \`toHaveBeenCalledWith\` проверяет, что метод позвали с нужным аргументом (роль spy/mock).

### Когда что применять

- **State verification (stub / fake)** — проверяете результат или итоговое состояние. Такой тест устойчивее к рефакторингу, потому что ему всё равно, _как_ код добрался до результата.
- **Behaviour verification (mock / spy)** — проверяете, что вызов _произошёл_. Нужно для зависимостей с побочными эффектами, где нет видимого результата: логирование, отправка письма. Но если этим злоупотреблять, тест намертво привязывается к тому, как код написан.

## ⚠️ Подводные камни

- **Over-mocking** (перемокивание) — когда мокают вообще всё подряд. Тест проходит, но по сути проверяет, что код вызывает сам себя так, как написан, а не что он реально работает.
- Проверка поведения там, где хватило бы проверки результата, делает тесты хрупкими: меняешь реализацию — тест краснеет, хотя всё работает.
- Путаница терминов на собеседовании: помните, что stub про _ответы_, а mock/spy про _проверку вызовов_.

## 🎯 Запомни

- Dummy — заполнить параметр; Stub — дать готовый ответ; Spy — записать вызовы; Mock — проверить ожидаемые вызовы; Fake — упрощённая рабочая реализация.
- State verification (stub/fake) устойчивее к рефакторингу, чем behaviour verification (mock/spy).
- В Jest/Jasmine \`jest.fn()\`/\`spyOn\` — это stub и spy в одном.
- Предпочитайте fakes и проверку состояния; избегайте over-mocking.`,
      en: `## 🧩 In plain words

When we test code, it often needs "neighbors": a database, a service, another object. Using real neighbors in a test is inconvenient — they're slow or unpredictable. So we substitute fakes. But fakes come in flavors: one just fills a slot, another knows the answer ahead of time, a third records who called it. These flavors are called _test doubles_ (like stunt doubles in movies). There are five, each with its own job.

### Terminology (per Gerard Meszaros)

- **Dummy** — an object passed only to fill a parameter; it's never actually used inside. For example, \`null\` or an empty object as an irrelevant argument.
- **Stub** — returns canned, pre-prepared answers to drive the test down a particular branch. It doesn't verify anything itself.
- **Spy** — wraps a real (or fake) object and **records the calls**: with what arguments and how many times it was called. You can check that afterwards.
- **Mock** — an object with **preprogrammed expectations**. The test fails if the expected calls didn't happen. This is called _behaviour verification_ — checking what was called.
- **Fake** — a working but simplified version. For example, an in-memory repository instead of a real database: it genuinely works, but without disk or network.

### In Jest / Jasmine the lines blur

In practice, popular frameworks mix these roles. \`jest.fn()\` and \`spyOn\` combine a stub and a spy at once:

\`\`\`ts
const repo = { save: jest.fn().mockResolvedValue({ id: 1 }) }; // stub + spy
service.create(dto);
expect(repo.save).toHaveBeenCalledWith(dto); // call check — mock style
\`\`\`

Here \`mockResolvedValue\` sets a canned answer (the stub role), while \`toHaveBeenCalledWith\` checks the method was called with the right argument (the spy/mock role).

### When to use which

- **State verification (stub / fake)** — you assert the result or the final state. Such a test is more refactor-resilient, because it doesn't care _how_ the code reached the result.
- **Behaviour verification (mock / spy)** — you assert a call _happened_. Needed for side-effect dependencies with no visible result: logging, sending an email. But overuse ties the test tightly to how the code is written.

## ⚠️ Common pitfalls

- **Over-mocking** — mocking absolutely everything. The test passes but essentially verifies that the code calls itself the way it's written, not that it actually works.
- Verifying behavior where a result check would do makes tests fragile: change the implementation and the test goes red even though everything works.
- Mixing up the terms in an interview: remember stub is about _answers_, while mock/spy is about _verifying calls_.

## 🎯 Key takeaways

- Dummy — fill a parameter; Stub — give a canned answer; Spy — record calls; Mock — verify expected calls; Fake — a simplified working implementation.
- State verification (stub/fake) is more refactor-resilient than behaviour verification (mock/spy).
- In Jest/Jasmine, \`jest.fn()\`/\`spyOn\` are a stub and a spy in one.
- Prefer fakes and state verification; avoid over-mocking.`,
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
      ru: `## 🧩 Простыми словами

RxJS — это библиотека для работы с потоками событий во времени: клики, ответы сервера, таймеры. Тестировать их сложно, потому что они асинхронные — значения приходят «когда-то потом». Marble testing («тестирование мраморами») решает это так: вместо настоящего времени рисуем поток маленькой ASCII-картинкой, где каждый символ — один тик виртуальных часов. А \`TestScheduler\` («тестовый планировщик») прокручивает эти виртуальные часы мгновенно, так что даже задержки в 20 секунд проходят за долю миллисекунды и всегда одинаково.

### Идея

Marble-диаграмма описывает поток **виртуальным временем**. Символы («мраморы») выстраиваются в строку, и по ней видно, что и когда эмитит (выдаёт) поток. \`TestScheduler\` синхронно прокручивает это время, делая детерминированными (предсказуемыми, всегда одинаковыми) даже операторы вроде \`debounceTime\` и \`delay\`, которые в реальности зависят от часов.

### Синтаксис мраморов

- \`-\` — один кадр времени (frame), пустой тик.
- \`a\`, \`b\` — эмиссии значений (поток выдал значение с меткой \`a\`).
- \`|\` — complete (поток завершился), \`#\` — error (поток упал с ошибкой).
- \`()\` — синхронная группировка: всё внутри скобок происходит в одном кадре.
- \`^\` — точка подписки (нужна для hot observables, о них ниже).

### Почему это лучше fakeAsync для RxJS

\`fakeAsync\` + \`tick()\` — другой способ управлять временем в тестах, но там время двигаешь вручную. Marble же одной строкой описывает сразу **значения, тайминг и завершение** и сравнивает их декларативно (просто «ожидаемое равно фактическому»). Для операторов, зависящих от времени, это точнее и читаемее, чем ручной \`tick()\`.

### Пример

\`\`\`ts
testScheduler.run(({ cold, expectObservable }) => {
  const source$ = cold('-a--b--c|', { a: 1, b: 2, c: 3 });
  const result$ = source$.pipe(map(x => x * 10));
  expectObservable(result$).toBe('-a--b--c|', { a: 10, b: 20, c: 30 });
});
\`\`\`

Читается так: \`source$\` выдаёт 1, потом 2, потом 3 и завершается. Оператор \`map\` умножает каждое на 10. Мы ожидаем поток с той же формой во времени, но со значениями 10, 20, 30. Объект в конце — это «легенда»: чему равна каждая буква.

### Тестирование времени

\`\`\`ts
const result$ = source$.pipe(debounceTime(20, testScheduler));
expectObservable(result$).toBe('-----x|', { x: ... });
\`\`\`

\`debounceTime(20)\` ждёт 20 виртуальных миллисекунд тишины перед тем, как пропустить значение. Благодаря \`TestScheduler\` эти 20 мс проматываются мгновенно, а диаграмма показывает, в каком кадре в итоге появится результат.

## ⚠️ Подводные камни

- Внутри \`testScheduler.run()\` каждый \`-\` = 1 кадр, но \`debounceTime(20)\` считает в виртуальных миллисекундах — следите, чтобы единицы совпадали, иначе диаграмма и реальность разойдутся.
- Hot vs cold: \`cold()\` — поток начинает выдавать значения с момента подписки (у каждого подписчика свой прогон). \`hot()\` — общий источник, который «живёт» независимо от подписки, поэтому нужна метка \`^\`, показывающая, когда мы подписались.
- Подписки проверяются отдельно через \`expectSubscriptions\` — это ловит утечки и забытые отписки (когда поток остаётся подписан дольше, чем нужно).

## 🎯 Запомни

- Marble testing описывает потоки ASCII-диаграммой в виртуальном времени; \`TestScheduler\` прокручивает время мгновенно и детерминированно.
- Символы: \`-\` кадр, буквы — значения, \`|\` complete, \`#\` error, \`()\` группировка, \`^\` подписка.
- Лучший инструмент для операторов времени (\`debounceTime\`, \`delay\`) и сложной композиции; для простых синхронных потоков хватит обычного \`subscribe\` + assertion.
- Следите за единицами времени и различайте hot/cold; проверяйте подписки через \`expectSubscriptions\`.`,
      en: `## 🧩 In plain words

RxJS is a library for working with streams of events over time: clicks, server responses, timers. They're hard to test because they're asynchronous — values arrive "sometime later." Marble testing solves this: instead of real time, you draw the stream as a tiny ASCII picture where each character is one tick of a virtual clock. And the \`TestScheduler\` spins that virtual clock instantly, so even a 20-second delay runs in a fraction of a millisecond, and always the same way.

### The idea

A marble diagram describes a stream using **virtual time**. The symbols ("marbles") line up in a string, and from it you can see what the stream emits and when. \`TestScheduler\` advances that time synchronously, making even operators like \`debounceTime\` and \`delay\` — which normally depend on the real clock — deterministic (predictable, always identical).

### Marble syntax

- \`-\` — one time frame, an empty tick.
- \`a\`, \`b\` — value emissions (the stream produced a value labeled \`a\`).
- \`|\` — complete (the stream finished), \`#\` — error (the stream failed).
- \`()\` — synchronous grouping: everything inside the parentheses happens in one frame.
- \`^\` — the subscription point (needed for hot observables, more below).

### Why it beats fakeAsync for RxJS

\`fakeAsync\` + \`tick()\` is another way to control time in tests, but there you advance time by hand. Marbles describe **values, timing, and completion** in a single line and compare them declaratively (just "expected equals actual"). For time-dependent operators, that's more precise and more readable than manual \`tick()\`.

### Example

\`\`\`ts
testScheduler.run(({ cold, expectObservable }) => {
  const source$ = cold('-a--b--c|', { a: 1, b: 2, c: 3 });
  const result$ = source$.pipe(map(x => x * 10));
  expectObservable(result$).toBe('-a--b--c|', { a: 10, b: 20, c: 30 });
});
\`\`\`

Read it as: \`source$\` emits 1, then 2, then 3, and completes. The \`map\` operator multiplies each by 10. We expect a stream with the same shape in time but values 10, 20, 30. The object at the end is the "legend": what each letter equals.

### Testing time

\`\`\`ts
const result$ = source$.pipe(debounceTime(20, testScheduler));
expectObservable(result$).toBe('-----x|', { x: ... });
\`\`\`

\`debounceTime(20)\` waits for 20 virtual milliseconds of silence before letting a value through. Thanks to \`TestScheduler\`, those 20 ms fast-forward instantly, and the diagram shows in which frame the result finally appears.

## ⚠️ Common pitfalls

- Inside \`testScheduler.run()\` each \`-\` = 1 frame, but \`debounceTime(20)\` counts in virtual milliseconds — keep the units consistent, or the diagram and reality will diverge.
- Hot vs cold: \`cold()\` — the stream starts emitting from the moment of subscription (each subscriber gets its own run). \`hot()\` — a shared source that "lives" independently of subscription, so you need the \`^\` marker showing when you subscribed.
- Subscriptions are checked separately via \`expectSubscriptions\` — this catches leaks and forgotten unsubscribes (when a stream stays subscribed longer than it should).

## 🎯 Key takeaways

- Marble testing describes streams as an ASCII diagram in virtual time; \`TestScheduler\` advances time instantly and deterministically.
- Symbols: \`-\` frame, letters — values, \`|\` complete, \`#\` error, \`()\` grouping, \`^\` subscription.
- Best tool for time operators (\`debounceTime\`, \`delay\`) and complex composition; for simple synchronous streams a plain \`subscribe\` + assertion is enough.
- Watch your time units and distinguish hot/cold; verify subscriptions with \`expectSubscriptions\`.`,
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
      ru: `## 🧩 Простыми словами

Представь, что асинхронный код — это будильники, заведённые «сработать через 200 мс». В обычном тесте пришлось бы реально ждать эти 200 мс, а ожидание делает тесты медленными и капризными. \`fakeAsync\` даёт тебе пульт от машины времени: ты сам крутишь стрелки часов вперёд командой \`tick\`, будильники срабатывают мгновенно, и тест остаётся быстрым и предсказуемым.

### Что такое fakeAsync

\`fakeAsync\` — это функция-обёртка вокруг тела теста. Она создаёт зону с **виртуальными часами**: любой \`setTimeout\`, \`Promise\` или \`setInterval\` не выполняется по-настоящему, а становится в очередь и ждёт, пока ты сам прокрутишь время.

Это превращает асинхронный тест в **синхронный и детерминированный** (то есть с одинаковым результатом при каждом запуске). Нет реальных задержек — значит, нет «флаки»-тестов (flaky — тесты, которые то проходят, то падают без изменений в коде).

### tick, flush и их варианты

Когда задачи стоят в очереди, ими надо управлять вручную. Вот инструменты:

- **\`tick(ms)\`** — продвигает виртуальное время на \`ms\` миллисекунд. Всё, у чего таймер к этому моменту истёк (макрозадачи вроде \`setTimeout\`), выполняется, плюс обрабатываются микрозадачи (промисы).
- **\`tick()\`** без аргумента — просто обрабатывает уже готовые микрозадачи (разрешённые промисы), время не двигает.
- **\`flush()\`** — выполняет **все** ожидающие таймеры, пока очередь не опустеет, и возвращает, сколько виртуального времени прошло. Удобно, когда точное число миллисекунд неизвестно.
- **\`flushMicrotasks()\`** — прогоняет только промисы, не трогая таймеры.

Термин «макрозадача» — это отложенный вызов вроде \`setTimeout\`; «микрозадача» — это то, что стоит в очереди промисов и выполняется раньше макрозадач.

\`\`\`ts
it('debounces', fakeAsync(() => {
  let value: string;
  service.search('a'); tick(200);
  service.result$.subscribe(v => value = v);
  flush();
  expect(value!).toBe('result');
}));
\`\`\`

Здесь \`service.search('a')\` запускает поиск с задержкой (debounce). \`tick(200)\` прокручивает часы на 200 мс, чтобы debounce «сработал». \`flush()\` добивает всё оставшееся в очереди, и только потом мы проверяем результат — синхронно, без реального ожидания.

### waitForAsync (раньше назывался async)

\`waitForAsync\` — совсем другой подход: он **НЕ** использует виртуальное время. Он оборачивает тест в зону, следит за всеми асинхронными задачами и завершает тест, когда они естественным образом стабилизируются (обычно через \`fixture.whenStable()\` — промис, который разрешается, когда всё асинхронное доделалось).

Подходит для реальных промисов и биндингов в шаблоне, когда управлять временем вручную не нужно — ты просто ждёшь, пока всё само устаканится.

## ⚠️ Подводные камни

- **\`tick()\` упадёт**, если в очереди осталась незавершённая периодическая задача (\`setInterval\`). Нужно вызвать \`discardPeriodicTasks()\`, чтобы её убрать.
- **Реальный I/O нельзя «тикнуть».** \`XHR\` или настоящий \`fetch\` fakeAsync не контролирует — виртуальные часы на реальную сеть не влияют. Для HTTP используй \`HttpTestingController\`.

## 🎯 Запомни

- **fakeAsync** = виртуальные часы: сам крутишь время через \`tick\`/\`flush\`, тест синхронный и стабильный.
- **\`tick(ms)\`** двигает время и выполняет таймеры; **\`flush()\`** добивает всю очередь, когда точное время неизвестно.
- **waitForAsync** не про время — он просто ждёт стабилизации реальных промисов через \`whenStable()\`.
- Бери **fakeAsync** для таймеров/debounce/точного тайминга, **waitForAsync** — для реальных промисов без нужды рулить временем.`,
      en: `## 🧩 In plain words

Think of async code as alarm clocks set to "go off in 200 ms." In a normal test you'd have to actually wait those 200 ms, and waiting makes tests slow and flaky. \`fakeAsync\` hands you a time-machine remote: you spin the clock hands forward yourself with \`tick\`, the alarms fire instantly, and the test stays fast and predictable.

### What fakeAsync is

\`fakeAsync\` is a wrapper function around your test body. It creates a zone with a **virtual clock**: any \`setTimeout\`, \`Promise\`, or \`setInterval\` doesn't really run — it goes into a queue and waits until you advance time yourself.

This turns an async test into a **synchronous and deterministic** one (same result on every run). No real delays means no flaky tests (flaky = tests that pass and fail at random without code changes).

### tick, flush, and their variants

Once tasks sit in the queue, you drive them by hand. Here are the tools:

- **\`tick(ms)\`** — advances virtual time by \`ms\` milliseconds. Everything whose timer has elapsed by then (macrotasks like \`setTimeout\`) runs, plus queued microtasks (promises).
- **\`tick()\`** with no argument — just processes ready microtasks (resolved promises); it doesn't move time.
- **\`flush()\`** — runs **all** pending timers until the queue drains, and returns how much virtual time passed. Handy when the exact ms count is unknown.
- **\`flushMicrotasks()\`** — runs promises only, leaving timers alone.

The term "macrotask" means a deferred call like \`setTimeout\`; a "microtask" sits in the promise queue and runs before macrotasks.

\`\`\`ts
it('debounces', fakeAsync(() => {
  let value: string;
  service.search('a'); tick(200);
  service.result$.subscribe(v => value = v);
  flush();
  expect(value!).toBe('result');
}));
\`\`\`

Here \`service.search('a')\` kicks off a debounced search. \`tick(200)\` spins the clock 200 ms so the debounce "fires." \`flush()\` clears whatever's left in the queue, and only then do we assert the result — synchronously, with no real waiting.

### waitForAsync (formerly async)

\`waitForAsync\` takes the opposite approach: it does **NOT** use virtual time. It wraps the test in a zone, tracks all async tasks, and finishes the test when they naturally stabilize (usually via \`fixture.whenStable()\` — a promise that resolves once all async work is done).

Good for real promises and template bindings when you don't need to control time by hand — you just wait for everything to settle on its own.

## ⚠️ Common pitfalls

- **\`tick()\` throws** if a pending periodic task (\`setInterval\`) is still in the queue. Call \`discardPeriodicTasks()\` to clear it.
- **Real I/O can't be "ticked."** \`XHR\` or a real \`fetch\` isn't controlled by fakeAsync — the virtual clock has no effect on the real network. Use \`HttpTestingController\` for HTTP.

## 🎯 Key takeaways

- **fakeAsync** = virtual clock: you spin time with \`tick\`/\`flush\`, and the test is synchronous and stable.
- **\`tick(ms)\`** advances time and runs timers; **\`flush()\`** drains the whole queue when the exact time is unknown.
- **waitForAsync** isn't about time — it just waits for real promises to stabilize via \`whenStable()\`.
- Reach for **fakeAsync** for timers/debounce/precise timing, and **waitForAsync** for real promises when you don't need to steer time.`,
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
      ru: `## 🧩 Простыми словами

Представь, что ты тестируешь официанта, но не хочешь, чтобы он реально бегал на кухню. Вместо кухни ты ставишь себя: официант делает заказ — ты его перехватываешь, проверяешь, что он попросил правильное блюдо, и сам подаёшь ему готовую тарелку. \`HttpTestingController\` — это как раз такая «поддельная кухня» для HTTP-запросов: настоящие запросы в сеть не уходят, ты ловишь их и отвечаешь вручную. Быстро, предсказуемо, без интернета.

### Назначение

\`HttpTestingController\` подключается через \`provideHttpClientTesting()\` и подменяет настоящий HTTP-бэкенд (то, что реально отправляет запросы). Реальные запросы никуда не уходят — ты их **перехватываешь**, проверяешь и сам даёшь ответ.

Плюс в том, что тест становится **детерминированным** (одинаковый результат каждый раз) и **быстрым**, потому что нет обращения к сети.

### Базовый поток

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

Шаг за шагом: подключаем тестовый HTTP; вызываем сервис и **обязательно подписываемся** (без этого запрос не «выстрелит»); ловим запрос через \`expectOne\` и проверяем метод; отдаём ему подготовленный ответ через \`flush\`; в конце \`verify()\` убеждается, что не осталось лишних запросов.

### Возможности

- **\`expectOne\` / \`match\`** — проверяют, что был ровно один (или сколько нужно) запрос, и позволяют сверить URL, метод, заголовки, тело, query-параметры.
- **\`req.flush(body, { status, statusText })\`** — отдать ответ: либо успех, либо ошибку (например \`flush(null, { status: 500 })\` — серверная ошибка).
- **\`req.error(new ProgressEvent('error'))\`** — сымитировать сетевой сбой, чтобы проверить обработку ошибок.
- **\`http.verify()\`** — обычно вызывается в \`afterEach\`; падает, если остались невыполненные или лишние запросы, и так ловит забытые вызовы.

### Что тестировать

- Правильно ли собран запрос — параметры, заголовки, тело.
- Как ответ маппится (преобразуется) в модель данных.
- Обработку ошибок и retry-логику (повторные попытки).
- Отмену и повторные запросы при гонках (race conditions — когда несколько запросов конкурируют).

## ⚠️ Подводные камни

- Подписка обязательна — без \`subscribe()\` запрос вообще не отправится. Observable «ленивый»: он ничего не делает, пока на него не подписались.
- Про \`verify()\` часто забывают — тогда лишние запросы остаются незамеченными и баги проскакивают.
- Для retry с задержкой (backoff — пауза между попытками) комбинируй с \`fakeAsync\`/\`tick\`, чтобы прокрутить таймеры этих пауз.

## 🎯 Запомни

- \`HttpTestingController\` — «поддельный бэкенд»: перехватываешь запрос, проверяешь его и сам отвечаешь через \`flush\`.
- Всегда **подписывайся** на Observable, иначе запрос не сработает.
- Проверяй и **исходящий запрос** (метод, URL, тело), и **обработку ответа/ошибок**.
- Вызывай \`verify()\` в \`afterEach\`, чтобы ловить лишние и забытые запросы.`,
      en: `## 🧩 In plain words

Imagine testing a waiter but you don't want them actually running to the kitchen. Instead of the kitchen, you stand in: the waiter places an order — you intercept it, check they asked for the right dish, and hand them a ready plate yourself. \`HttpTestingController\` is exactly that "fake kitchen" for HTTP requests: real network requests never go out, you catch them and respond by hand. Fast, predictable, no internet.

### Purpose

\`HttpTestingController\` is wired up via \`provideHttpClientTesting()\` and replaces the real HTTP backend (the thing that actually sends requests). Real requests never leave — you **intercept** them, assert on them, and respond yourself.

The payoff is a test that's **deterministic** (same result every time) and **fast**, because there's no network round-trip.

### Basic flow

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

Step by step: wire up the testing HTTP; call the service and **make sure to subscribe** (without it the request never "fires"); catch the request with \`expectOne\` and check the method; hand it a prepared response via \`flush\`; finally \`verify()\` confirms no stray requests are left.

### Capabilities

- **\`expectOne\` / \`match\`** — assert that exactly one (or as many as needed) request happened, and let you verify URL, method, headers, body, and query params.
- **\`req.flush(body, { status, statusText })\`** — deliver a response: either success or an error (e.g. \`flush(null, { status: 500 })\` for a server error).
- **\`req.error(new ProgressEvent('error'))\`** — simulate a network failure to test error handling.
- **\`http.verify()\`** — usually called in \`afterEach\`; it fails if any unhandled or extra requests remain, catching stray/forgotten calls.

### What to test

- Whether the request is built correctly — params, headers, body.
- How the response is mapped (transformed) into a data model.
- Error handling and retry logic (repeat attempts).
- Cancellation and duplicate requests under race conditions (when several requests compete).

## ⚠️ Common pitfalls

- A subscription is required — without \`subscribe()\` the request never goes out. An Observable is "lazy": it does nothing until someone subscribes.
- People forget \`verify()\` — then stray requests slip by unnoticed and bugs sneak through.
- For delayed retry (backoff — a pause between attempts), combine with \`fakeAsync\`/\`tick\` to advance those pause timers.

## 🎯 Key takeaways

- \`HttpTestingController\` is a "fake backend": you intercept the request, assert on it, and respond yourself via \`flush\`.
- Always **subscribe** to the Observable, or the request won't fire.
- Test both the **outgoing request** (method, URL, body) and the **response/error handling**.
- Call \`verify()\` in \`afterEach\` to catch stray and forgotten requests.`,
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
      ru: `## 🧩 Простыми словами

Представь, что твой тест хочет «нажать кнопку Save». Он может либо лезть напрямую в HTML и искать нужный \`<span>\` внутри кнопки по CSS-классу (и ломаться, как только вёрстка чуть изменится), либо попросить готового «помощника»: «дай мне кнопку с текстом Save и нажми её». Этот помощник — и есть **component harness**. Он прячет внутреннюю структуру компонента за понятным API, так что тесты остаются целыми, даже когда разметку внутри перекроили.

### Что это такое

**Component Harness** — это абстракция из Angular CDK, которая даёт тестам стабильное **API для взаимодействия с компонентом**, скрывая его внутреннюю DOM-структуру (то, как компонент устроен в HTML). Библиотека Angular Material поставляет готовые harness — например \`MatButtonHarness\`, \`MatSelectHarness\`.

### Какую проблему решает

Прямой доступ к DOM в тестах хрупкий. Например:

\`\`\`ts
fixture.nativeElement.querySelector('.mat-button-wrapper span')
\`\`\`

Такой селектор сломается при любом изменении внутренней разметки Material — а она меняется от версии к версии. Harness **инкапсулирует** (прячет внутри себя) эти селекторы: когда выходит новая версия Material, обновляется harness, а твои тесты остаются нетронутыми.

### Пример

\`\`\`ts
const loader = TestbedHarnessEnvironment.loader(fixture);
const button = await loader.getHarness(MatButtonHarness.with({ text: 'Save' }));
await button.click();
const select = await loader.getHarness(MatSelectHarness);
await select.open();
await select.clickOptions({ text: 'Option 2' });
\`\`\`

Здесь \`loader\` — точка входа, через которую достаются harness. Мы просим кнопку по её тексту \`Save\` и жмём её, затем берём выпадающий список, открываем его и кликаем нужную опцию. Заметь: код говорит о **поведении** («нажми», «открой»), а не о CSS-селекторах.

### Преимущества

- **Устойчивость:** тесты не зависят от внутренней вёрстки компонента.
- **Переносимость:** один и тот же harness работает и в unit-тестах (через TestBed), и в e2e-окружениях — достаточно подставить другой \`HarnessEnvironment\`.
- **Читаемость:** API выражено в терминах поведения (\`click\`, \`getText\`), а не низкоуровневых селекторов.
- **Асинхронность по умолчанию:** все методы возвращают промисы и корректно дожидаются стабилизации (пока Angular обновит представление).

### Своя реализация

Для собственных компонентов можно написать свой harness: наследуешь класс \`ComponentHarness\`, объявляешь \`hostSelector\` (селектор корневого элемента компонента) и методы-локаторы через \`this.locatorFor(...)\`, которые находят внутренние элементы.

## ⚠️ Подводные камни

- **Не всегда оправдано.** Для простых компонентов без сложного DOM прямой доступ через \`DebugElement\` дешевле и быстрее написать.
- Harness окупается на сложных интерактивных виджетах и в дизайн-системах, где важна стабильность «контракта» тестов на долгой дистанции.

## 🎯 Запомни

- Harness — это стабильный API-«помощник» поверх компонента, прячущий его внутренний DOM.
- Главная выгода: обновление версии Material ломает harness (его чинят авторы), а не сотни твоих тестов.
- Пиши тесты в терминах поведения (\`click\`, \`getText\`), а не хрупких CSS-селекторов.
- Для простых компонентов harness избыточен — там достаточно \`DebugElement\`.`,
      en: `## 🧩 In plain words

Imagine your test wants to "click the Save button." It can either dig straight into the HTML and hunt for the right \`<span>\` inside the button by CSS class (and break the moment the markup shifts), or ask a ready-made "helper": "give me the button with text Save and click it." That helper is a **component harness**. It hides the component's internal structure behind a clean API, so your tests survive even when the markup inside gets reshuffled.

### What it is

A **Component Harness** is an Angular CDK abstraction that gives tests a stable **API to interact with a component**, hiding its internal DOM structure (how the component is laid out in HTML). Angular Material ships ready-made harnesses — for example \`MatButtonHarness\`, \`MatSelectHarness\`.

### The problem it solves

Direct DOM access in tests is fragile. For example:

\`\`\`ts
fixture.nativeElement.querySelector('.mat-button-wrapper span')
\`\`\`

A selector like this breaks on any change to Material's internal markup — and that markup changes from version to version. A harness **encapsulates** (hides inside itself) those selectors: when a new Material version ships, the harness is updated while your tests stay untouched.

### Example

\`\`\`ts
const loader = TestbedHarnessEnvironment.loader(fixture);
const button = await loader.getHarness(MatButtonHarness.with({ text: 'Save' }));
await button.click();
const select = await loader.getHarness(MatSelectHarness);
await select.open();
await select.clickOptions({ text: 'Option 2' });
\`\`\`

Here \`loader\` is the entry point you pull harnesses from. We ask for the button by its text \`Save\` and click it, then grab a dropdown, open it, and click the option we want. Notice the code talks about **behavior** ("click," "open"), not CSS selectors.

### Benefits

- **Robustness:** tests don't depend on the component's internal markup.
- **Portability:** the same harness works in unit tests (via TestBed) and in e2e environments — just swap in a different \`HarnessEnvironment\`.
- **Readability:** the API is expressed in behavior terms (\`click\`, \`getText\`), not low-level selectors.
- **Async by default:** all methods return promises and properly await stabilization (until Angular finishes updating the view).

### Custom harnesses

For your own components you can write a harness: extend the \`ComponentHarness\` class, declare a \`hostSelector\` (the selector for the component's root element), and locate inner elements via \`this.locatorFor(...)\`.

## ⚠️ Common pitfalls

- **Not always worth it.** For simple components without complex DOM, direct access through \`DebugElement\` is cheaper and quicker to write.
- Harnesses pay off on complex interactive widgets and in design systems, where the long-term stability of the test "contract" matters.

## 🎯 Key takeaways

- A harness is a stable API "helper" over a component that hides its internal DOM.
- The big win: a version bump breaks the harness (which its authors fix), not hundreds of your tests.
- Write tests in terms of behavior (\`click\`, \`getText\`), not brittle CSS selectors.
- For simple components a harness is overkill — \`DebugElement\` is enough there.`,
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
      ru: `## 🧩 Простыми словами

E2E-тесты (end-to-end — «от начала до конца») проверяют приложение так, как это делает живой человек: открывают браузер, кликают кнопки, вводят текст. Cypress и Playwright — два самых популярных инструмента для этого. Разница между ними — как между водителем, который сидит внутри машины, и оператором, который управляет ей снаружи по радио. Оба довезут, но возможности разные. А главная головная боль таких тестов — «флакость» (flakiness), когда тест то проходит, то падает без причины.

### Архитектурное различие

- **Cypress** работает **внутри браузера**, в том же event loop (цикле событий), что и само приложение. Отсюда отличный опыт разработчика (DX): time-travel debugger (можно «отмотать» тест и посмотреть каждый шаг), автоматический retry команд (повтор до успеха). Минусы: исторически слабая поддержка нескольких вкладок и доменов, один браузерный движок на тест, иногда упирается в собственную архитектуру.
- **Playwright** управляет браузером **снаружи**, через протоколы вроде CDP (Chrome DevTools Protocol — «пульт управления» браузером). Поддерживает движки Chromium, Firefox и WebKit, параллельный запуск, несколько контекстов и вкладок, мощный перехват сети и авто-ожидание.

### Борьба с флакостью

- **Авто-ожидание вместо пауз.** Оба инструмента сами ждут, пока элемент станет видимым и готовым к действию. Никогда не ставь фиксированные \`wait(3000)\` — это главный источник флакости.
- **Стабильные селекторы.** Используй \`data-testid\` (специальный атрибут-метка для тестов), а не CSS-классы или текст, которые меняются при редизайне.
- **Изоляция состояния.** Готовь чистую БД или наполняй данные (seeding) через API перед каждым тестом, а не кликами по UI — так быстрее и надёжнее.
- **Retry на уровне раннера.** У Playwright и Cypress есть настройка \`retries\` — повтор упавшего теста. Это маскирует редкую нестабильность, но лечит симптом, а не причину — ищи корень проблемы.
- **Детерминированные время и данные.** Подменяй \`Date.now\`, случайные числа; отключай анимации, чтобы поведение было одинаковым при каждом запуске.

### Подмена сети (stubbing)

\`\`\`ts
// Playwright
await page.route('**/api/users', route => route.fulfill({ json: [{ id: 1 }] }));
// Cypress
cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('users');
cy.wait('@users');
\`\`\`

Подмена сети (stub — заранее заготовленный поддельный ответ) убирает зависимость от реального бэкенда, поэтому тесты быстрее и стабильнее. Но **обязательно смешивай** это с настоящими контрактными или e2e-тестами на критичных путях, иначе моки со временем разойдутся с реальным API, и тесты будут «зелёными» на сломанном приложении.

### Как выбрать

Playwright — когда нужна кросс-браузерность, параллелизм и сложные сценарии (несколько вкладок, домены). Cypress — когда важен богатый DX и команда ценит интерактивную отладку. Оба инструмента сильны; на масштабе CI (continuous integration — автоматический прогон тестов на сервере) Playwright чаще выигрывает по скорости и гибкости.

## ⚠️ Подводные камни

- Фиксированные \`wait(3000)\` — главный враг стабильности. Полагайся на авто-ожидание.
- Селекторы по тексту и CSS-классам ломаются при редизайне — используй \`data-testid\`.
- Только замоканная сеть = риск «зелёных» тестов на реально сломанном API. Держи и настоящие проверки контракта.
- \`retries\` прячут проблему, а не решают её — всегда ищи корневую причину флакости.

## 🎯 Запомни

- Cypress — внутри браузера (супер-DX, отладка), Playwright — снаружи (кросс-браузер, параллелизм, масштаб).
- Против флакости: авто-ожидание вместо пауз, \`data-testid\`, изоляция состояния, детерминированные время/данные.
- Подмена сети ускоряет и стабилизирует тесты, но не заменяет реальные контрактные проверки.
- \`retries\` маскируют симптом — настоящее решение в устранении причины.`,
      en: `## 🧩 In plain words

E2E tests (end-to-end) exercise an app the way a real person would: open a browser, click buttons, type text. Cypress and Playwright are the two most popular tools for this. The difference between them is like a driver sitting inside the car versus an operator steering it from outside by radio. Both get you there, but their capabilities differ. And the big headache of these tests is "flakiness" — when a test passes and fails at random for no reason.

### Architectural difference

- **Cypress** runs **inside the browser**, in the same event loop as the app itself. That gives a great developer experience (DX): a time-travel debugger (you can "rewind" the test and inspect each step) and automatic command retries (retry until success). Cons: historically weak support for multiple tabs and domains, one browser engine per test, and it sometimes hits its own architecture's limits.
- **Playwright** drives the browser **externally**, via protocols like CDP (Chrome DevTools Protocol — the browser's "remote control"). It supports the Chromium, Firefox, and WebKit engines, parallel runs, multiple contexts and tabs, powerful network interception, and auto-waiting.

### Fighting flakiness

- **Auto-waiting instead of sleeps.** Both tools wait on their own until an element is visible and ready to act on. Never use a fixed \`wait(3000)\` — it's the number-one source of flakiness.
- **Stable selectors.** Use \`data-testid\` (a dedicated marker attribute for tests), not CSS classes or text that change on a redesign.
- **State isolation.** Prepare a clean DB or seed data via the API before each test, not by clicking through the UI — it's faster and more reliable.
- **Runner-level retries.** Playwright and Cypress both have a \`retries\` setting — re-running a failed test. This masks rare instability, but it treats the symptom, not the cause — find the root.
- **Deterministic time and data.** Mock \`Date.now\` and random numbers; disable animations so behavior is identical on every run.

### Network stubbing

\`\`\`ts
// Playwright
await page.route('**/api/users', route => route.fulfill({ json: [{ id: 1 }] }));
// Cypress
cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('users');
cy.wait('@users');
\`\`\`

Stubbing the network (a stub is a pre-canned fake response) removes the dependency on a real backend, so tests are faster and more stable. But **be sure to mix in** real contract or e2e tests on critical paths, or your mocks will drift from the real API over time and tests will stay "green" on a broken app.

### How to choose

Playwright — when you need cross-browser coverage, parallelism, and complex scenarios (multiple tabs, domains). Cypress — when rich DX matters and the team values interactive debugging. Both are strong; at CI scale (continuous integration — automated test runs on a server) Playwright usually wins on speed and flexibility.

## ⚠️ Common pitfalls

- Fixed \`wait(3000)\` is the main enemy of stability. Rely on auto-waiting instead.
- Text- and CSS-class selectors break on redesigns — use \`data-testid\`.
- Mocked network only = risk of "green" tests on a genuinely broken API. Keep some real contract checks too.
- \`retries\` hide the problem rather than solving it — always hunt for the root cause of flakiness.

## 🎯 Key takeaways

- Cypress runs inside the browser (superb DX, debugging); Playwright drives it from outside (cross-browser, parallelism, scale).
- Against flakiness: auto-waiting instead of sleeps, \`data-testid\`, state isolation, deterministic time/data.
- Network stubbing speeds up and stabilizes tests but doesn't replace real contract checks.
- \`retries\` mask the symptom — the real fix is removing the cause.`,
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
      ru: `## 🧩 Простыми словами

Представь, что ты проверяешь машину перед поездкой: обошёл её кругом, потрогал все двери — и написал в отчёте «осмотрел на 100%». Но ты ни разу не проверил, работают ли тормоза и заводится ли двигатель. Так и code coverage: он говорит, что тесты «дотронулись» до строк кода, но не говорит, проверили ли они, что код работает **правильно**. Mutation testing — это как специально сломать тормоза и посмотреть, заметят ли это твои проверки.

### Что вообще такое code coverage

**Code coverage (покрытие кода)** — это метрика, которая показывает, какие строки исходного кода **исполнились** во время прогона тестов. Инструмент запускает тесты и отмечает: «вот эта строка выполнилась, а эта — нет». Итог обычно показывают в процентах.

Проблема в том, что coverage отвечает только на вопрос «был ли код запущен», но НЕ на вопрос «а проверил ли тест, что результат правильный». Тест может выполнить код и не сделать ни одной проверки:

\`\`\`ts
it('runs', () => { calculate(2, 3); }); // 100% покрытия, 0 проверок
\`\`\`

Здесь функция \`calculate\` вызвана, все её строки «покрыты», но нет ни одного \`expect\` — то есть теста как такового нет. Мы даже не смотрим, что она вернула. А coverage бодро покажет 100%. Отсюда ложное чувство безопасности: цифра высокая, а тесты пустые.

### Другие ловушки coverage

- **Метрика становится целью.** Если начальство требует «90% покрытия», люди начинают писать бессмысленные тесты просто ради цифры. Это закон Гудхарта: как только метрику делают целью, она перестаёт быть хорошей метрикой.
- **Line coverage против branch coverage.** _Line coverage_ считает исполненные строки, а _branch coverage_ — исполненные ветки условий (\`if\`/\`else\`). Строка с \`if\` может «исполниться», но ветку \`else\` тесты так и не проверили. Line coverage этого не поймает.
- **Покрытие не равно важности.** Можно на 100% покрыть тривиальные геттеры и на 0% — критичную бизнес-логику. В среднем получится «хороший» процент, который скрывает, что самое важное не протестировано.

### Как работает mutation testing

**Mutation testing (мутационное тестирование)** переворачивает вопрос. Вместо «запустился ли код» оно спрашивает «а заметят ли тесты, если код сломать». Для JS/TS популярный инструмент — **Stryker**.

Идея простая: инструмент берёт твой исходный код и вносит в него маленькие поломки — **мутации**. Например, меняет \`+\` на \`-\`, \`>\` на \`>=\`, \`true\` на \`false\`, удаляет вызов функции. Каждая такая мутация — это как искусственно внесённый баг. Потом прогоняются тесты и проверяется: упал ли хоть один?

- **Killed mutant (убитый мутант)** — хотя бы один тест упал, то есть поймал поломку. Это хорошо: тесты бдят.
- **Survived mutant (выживший мутант)** — мутация прошла, а все тесты остались зелёными. Это плохо: значит, именно в этом месте тесты слабые и настоящий баг они бы тоже пропустили.

**Mutation score (мутационный балл)** = убитые мутанты / все мутанты. Это и есть реальная мера того, насколько тесты способны ловить регрессии (случайно внесённые баги), а не просто «трогать» строки.

### Trade-off: почему это не серебряная пуля

Mutation testing вычислительно дорогой: чтобы проверить каждую мутацию, надо заново прогнать тесты, и таких прогонов получаются сотни или тысячи. Поэтому его обычно запускают не на каждый pull request, а на ключевых модулях или ночью в CI (системе автоматических прогонов). Это лучшая на сегодня прокси-метрика качества тестов, но использовать её стоит как диагностику — «где мои тесты слабые», — а не как новую жёсткую цель, иначе снова попадём в ловушку закона Гудхарта.

## ⚠️ Подводные камни

- Высокий coverage без ассертов — самая частая иллюзия качества.
- Погоня за процентом порождает мусорные тесты (закон Гудхарта).
- Line coverage маскирует непокрытые ветки — смотри хотя бы branch coverage.
- Mutation testing дорогой: не гоняй на каждый PR, выбирай критичные модули.

## 🎯 Запомни

- Coverage говорит «код запущен», а не «код проверен и работает».
- Тест без \`expect\` может дать 100% покрытия и ноль пользы.
- Mutation testing ломает код нарочно и смотрит, поймают ли это тесты; mutation score = убитые / всего.
- Используй mutation score как диагностику слабых мест, а не как цель ради цифры.`,
      en: `## 🧩 In plain words

Imagine you're inspecting a car before a trip: you walk around it, touch every door, and write in your report "inspected 100%." But you never checked whether the brakes work or the engine starts. That's code coverage: it tells you the tests "touched" the lines of code, but not whether they checked that the code actually works **correctly**. Mutation testing is like deliberately breaking the brakes and seeing whether your checks notice.

### What code coverage actually is

**Code coverage** is a metric that shows which lines of source code **executed** while the tests ran. The tool runs your tests and marks "this line ran, that one didn't." The result is usually shown as a percentage.

The catch: coverage only answers "was the code run," NOT "did the test check that the result was correct." A test can execute the code and make zero assertions:

\`\`\`ts
it('runs', () => { calculate(2, 3); }); // 100% coverage, 0 assertions
\`\`\`

Here \`calculate\` is called, all its lines are "covered," but there's not a single \`expect\` — so there's really no test at all. We never even look at what it returned. Yet coverage happily reports 100%. Hence the false confidence: high number, empty tests.

### Other coverage traps

- **The metric becomes the target.** If management demands "90% coverage," people start writing meaningless tests just for the number. That's Goodhart's law: once a metric becomes a target, it stops being a good metric.
- **Line coverage vs branch coverage.** _Line coverage_ counts executed lines; _branch coverage_ counts executed branches of a condition (\`if\`/\`else\`). A line with an \`if\` may "execute," yet the tests never exercised the \`else\` branch. Line coverage won't catch that.
- **Coverage isn't importance.** You can get 100% on trivial getters and 0% on critical business logic. The average looks like a "good" percentage, hiding the fact that the most important part is untested.

### How mutation testing works

**Mutation testing** flips the question around. Instead of "did the code run," it asks "would the tests notice if the code broke." For JS/TS the popular tool is **Stryker**.

The idea is simple: the tool takes your source code and injects tiny breakages — **mutations**. For example, it changes \`+\` to \`-\`, \`>\` to \`>=\`, \`true\` to \`false\`, or removes a function call. Each mutation is like an artificially planted bug. Then it runs the tests and checks: did at least one fail?

- **Killed mutant** — at least one test failed, i.e. caught the breakage. Good: the tests are on guard.
- **Survived mutant** — the mutation slipped through and all tests stayed green. Bad: right there, the tests are weak, and a real bug would slip through too.

**Mutation score** = killed mutants / total mutants. This is the real measure of how well your tests catch regressions (accidentally introduced bugs), rather than just "touching" lines.

### The trade-off: why it's not a silver bullet

Mutation testing is computationally expensive: to check each mutation, the tests have to be re-run, and there can be hundreds or thousands of such runs. So it's usually run not on every pull request, but on key modules or nightly in CI (the automated build/test system). It's the best proxy for test quality we have today, but use it as a diagnostic — "where are my tests weak" — not as a new hard target, or you fall back into Goodhart's trap.

## ⚠️ Common pitfalls

- High coverage with no assertions is the most common illusion of quality.
- Chasing a percentage breeds junk tests (Goodhart's law).
- Line coverage masks uncovered branches — look at branch coverage at least.
- Mutation testing is expensive: don't run it on every PR, pick critical modules.

## 🎯 Key takeaways

- Coverage says "code was run," not "code was checked and works."
- A test with no \`expect\` can hit 100% coverage and zero value.
- Mutation testing breaks code on purpose and sees if tests catch it; mutation score = killed / total.
- Use mutation score to diagnose weak spots, not as a number to chase.`,
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
      ru: `## 🧩 Простыми словами

CI/CD-пайплайн — это конвейер на заводе для твоего кода. С одного конца заезжает свежий коммит, и он проезжает через станции контроля: проверка стиля, тесты, сборка, снова тесты, и в конце — отгрузка пользователям. **CI (Continuous Integration)** — «непрерывная интеграция», автоматическая проверка каждого изменения. **CD (Continuous Delivery/Deployment)** — «непрерывная доставка», автоматический выкат готового кода. Задача — сделать этот конвейер быстрым и надёжным, чтобы команда не ждала его часами.

### Этапы пайплайна по порядку

1. **Install** — установка зависимостей (библиотек). Делается с кэшем: по \`lockfile\` (файлу с точными версиями) и с сохранённым хранилищем npm/pnpm, чтобы не качать всё заново каждый раз.
2. **Static** — статические проверки: _lint_ (поиск ошибок стиля и подозрительного кода), _type-check_ (проверка типов TypeScript), _format-check_ (проверка форматирования). Это дёшево по времени и ловит много проблем, поэтому идёт первым.
3. **Unit/Integration** — основная масса тестов. Гоняются параллельно по _шардам_ (набор тестов делится на куски, каждый бежит на своём воркере).
4. **Build** — production-сборка приложения и проверка получившегося бандла (итогового файла с кодом).
5. **E2E** — end-to-end тесты (сквозные, имитируют реального пользователя) на уже собранном приложении, в _headless_-браузерах (браузер без окна, работает в фоне), тоже параллельно.
6. **Deploy** — выкат: preview-окружение (временный сайт для просмотра) на каждый PR, а production — при слиянии в main.

### Как ускорить пайплайн

Медленный CI убивает скорость команды, поэтому оптимизации важны:

- **Affected-граф** (инструменты Nx/Turborepo) — гонять проверки только для тех частей проекта, которых коснулось изменение, а не для всего репозитория.
- **Computation cache** (кэш вычислений, локальный + удалённый) — если задача уже выполнялась с тем же входом, взять готовый результат и пропустить её.
- **Шардинг тестов** — делить набор тестов между N воркерами, чтобы они бежали одновременно.
- **Параллелизм этапов** — независимые задачи запускать одновременно, а не в очередь.
- **Fail-fast** — сначала дешёвые быстрые проверки; если они упали, не тратить время на дорогие.

### Качество и контрольные ворота

_Quality gates_ (ворота качества) — это условия, при которых пайплайн падает и не пускает код дальше:

- падение при упавших тестах, при превышении бюджета размера бандла, при регрессии coverage или метрик Lighthouse (инструмент замера производительности).
- **Bundle/performance budgets** — заранее заданные лимиты на размер и скорость (\`budgets\` в Angular, инструмент size-limit); превысил — сборка красная.
- **Visual regression** — сравнение скриншотов ключевых страниц, чтобы поймать случайные изменения вёрстки.
- **Артефакты** — то, что пайплайн сохраняет для разбора: отчёты coverage, видео и трейсы e2e-тестов, source maps (карты для расшифровки минифицированного кода).

### Стратегии деплоя

- **Preview-окружения** на каждый PR (Vercel/Netlify или собственный кластер k8s) — можно посмотреть изменения вживую до слияния.
- **Canary / постепенный rollout** — выкатывать новую версию сначала малой части пользователей; плюс _feature flags_ (переключатели функций), чтобы отделить деплой от релиза: код уже на проде, но включается флагом.
- **Immutable-артефакты** — каждая сборка неизменяема и хранится, поэтому откат к прошлой версии мгновенный.

### Типичные режимы отказа (failure modes)

- **Flaky-тесты** (нестабильные e2e, которые падают случайно) тормозят слияние → лечится ретраями и карантином нестабильных тестов.
- Раздутый кэш или отсутствие affected-графа → CI деградирует по мере роста репозитория.
- Секреты (пароли, токены) в логах сборки → обязателен строгий secret-scanning (автопоиск утёкших секретов).

## ⚠️ Подводные камни

- Тяжёлые e2e без параллелизма и ретраев делают CI медленным и раздражающим.
- Без affected-графа и кэша большой монорепозиторий со временем задыхается.
- Flaky-тесты подрывают доверие ко всему пайплайну — их нужно чинить или изолировать.
- Секреты легко утекают в логи — сканируй логи и артефакты.

## 🎯 Запомни

- Порядок этапов: дёшево и быстро сначала (lint, типы), дорого потом (e2e, deploy), fail-fast между ними.
- Скорость держится на трёх китах: affected-граф, кэш вычислений, шардинг/параллелизм.
- Quality gates делают качество автоматическим: упал бюджет или тест — код не проходит.
- Принцип: быстрый, детерминированный пайплайн с понятными воротами; медленный CI убивает скорость команды.`,
      en: `## 🧩 In plain words

A CI/CD pipeline is a factory conveyor belt for your code. A fresh commit rolls in one end and passes through inspection stations: style check, tests, build, more tests, and finally shipping to users. **CI (Continuous Integration)** means automatically checking every change. **CD (Continuous Delivery/Deployment)** means automatically shipping finished code. The goal is to make this conveyor fast and reliable, so the team isn't stuck waiting for it for hours.

### Pipeline stages in order

1. **Install** — install dependencies (libraries). Done with caching: keyed by the \`lockfile\` (a file with exact versions) and a saved npm/pnpm store, so you don't re-download everything each time.
2. **Static** — static checks: _lint_ (finds style errors and suspicious code), _type-check_ (validates TypeScript types), _format-check_ (checks formatting). This is cheap in time and catches a lot, so it goes first.
3. **Unit/Integration** — the bulk of the tests. Run in parallel across _shards_ (the test set is split into chunks, each running on its own worker).
4. **Build** — the production build of the app and a check of the resulting bundle (the final code file).
5. **E2E** — end-to-end tests (they simulate a real user) against the already-built app, in _headless_ browsers (a browser with no window, running in the background), also in parallel.
6. **Deploy** — shipping: a preview environment (a temporary site to look at) per PR, and production on merge to main.

### How to speed up the pipeline

Slow CI kills team velocity, so optimizations matter:

- **Affected graph** (Nx/Turborepo tools) — run checks only for the parts of the project the change touched, not the whole repo.
- **Computation cache** (local + remote) — if a task already ran with the same input, take the saved result and skip it.
- **Test sharding** — split the test set across N workers so they run at the same time.
- **Stage parallelism** — run independent tasks simultaneously instead of queuing them.
- **Fail-fast** — cheap fast checks first; if they fail, don't waste time on the expensive ones.

### Quality and gating

_Quality gates_ are conditions under which the pipeline fails and blocks the code from going further:

- fail on failing tests, on exceeding the bundle-size budget, on a coverage or Lighthouse regression (Lighthouse is a performance-measuring tool).
- **Bundle/performance budgets** — preset limits on size and speed (Angular \`budgets\`, the size-limit tool); exceed them and the build goes red.
- **Visual regression** — comparing screenshots of key pages to catch accidental layout changes.
- **Artifacts** — what the pipeline saves for debugging: coverage reports, e2e videos and traces, source maps (maps that decode minified code).

### Deploy strategies

- **Preview environments** per PR (Vercel/Netlify or your own k8s cluster) — you can view the changes live before merging.
- **Canary / gradual rollout** — release the new version to a small fraction of users first; plus _feature flags_ (function toggles) to decouple deploy from release: the code is already on prod but is switched on by a flag.
- **Immutable artifacts** — each build is unchangeable and stored, so rolling back to a previous version is instant.

### Common failure modes

- **Flaky tests** (unstable e2e that fail at random) stall merges → fixed with retries and quarantining the unstable tests.
- A bloated cache or no affected graph → CI degrades as the repo grows.
- Secrets (passwords, tokens) in build logs → strict secret-scanning (auto-detection of leaked secrets) is mandatory.

## ⚠️ Common pitfalls

- Heavy e2e without parallelism and retries make CI slow and annoying.
- Without an affected graph and cache, a big monorepo eventually chokes.
- Flaky tests erode trust in the whole pipeline — fix or isolate them.
- Secrets leak into logs easily — scan logs and artifacts.

## 🎯 Key takeaways

- Stage order: cheap and fast first (lint, types), expensive later (e2e, deploy), fail-fast in between.
- Speed rests on three pillars: affected graph, computation cache, sharding/parallelism.
- Quality gates make quality automatic: a busted budget or test blocks the code.
- Principle: a fast, deterministic pipeline with clear gates; slow CI kills team velocity.`,
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
      ru: `## 🧩 Простыми словами

Представь, что тебя просят спроектировать большой дом (аналитический дашборд). Никто не ждёт, что ты сразу назовёшь марку каждого гвоздя. От тебя ждут, что ты разложишь задачу по этажам: как люди входят (загрузка), как течёт вода (данные), где что хранится (состояние), как обставлены комнаты (рендер), и что делать, если протечёт крыша (надёжность). Сильный ответ на собеседовании — это не список модных слов, а разбор задачи по осям с честными компромиссами.

### Как вообще отвечать на такой вопрос

**SPA (Single Page Application)** — «одностраничное приложение»: сайт, который грузится один раз, а дальше перерисовывает содержимое без полной перезагрузки страницы. Проектирование большого SPA удобно структурировать по осям: загрузка, данные, состояние, рендер, real-time, надёжность. Проходишь по каждой и называешь решения плюс их цену.

### Загрузка и доставка

- **Code splitting** (разделение кода) по фичам и роутам плюс **lazy loading** (ленивая загрузка) — грузим не весь код сразу, а куски по мере надобности. Плюс **route-level preloading** — заранее подгружаем код тех страниц, куда пользователь скорее всего перейдёт.
- **SSR/SSG или гидратация**, если нужно. _SSR_ — рендеринг на сервере, _SSG_ — генерация статики на этапе сборки; оба ускоряют **TTFB** (время до первого байта) и помогают SEO. _Гидратация_ — «оживление» серверного HTML на клиенте.
- **Performance budgets** (бюджеты производительности) на размер чанков; **tree-shaking** — автоудаление неиспользуемого кода из сборки.

### Слой данных

- **Кэширующий data-layer** (вроде TanStack Query) — прослойка, которая: дедуплицирует одинаковые запросы, кэширует ответы, работает по _stale-while-revalidate_ (сразу отдаёт закэшированное, а свежее подтягивает в фоне) и делает фоновую ревалидацию.
- **Нормализация** server state (состояния с сервера) — хранить каждую сущность один раз по её id, чтобы не плодить дубликаты одних и тех же данных.
- **Пагинация/виртуализация** больших таблиц и списков (\`cdk-virtual-scroll\`) — рендерить только видимые строки, а не все тысячи сразу.

### Состояние

- Разделяй **server state** (данные с сервера, живут в кэш-слое) и **client/UI state** (локальное состояние интерфейса — открыт ли попап, что в фильтре; живёт в signals/store). Не смешивай их — это разные по природе вещи.
- Глобальный store заводи только для действительно разделяемого между экранами состояния, а не для всего подряд.

### Рендер и производительность

- \`OnPush\` (стратегия обнаружения изменений в Angular, при которой компонент перерисовывается только по явному сигналу) плюс сигналы; мемоизация (кэширование результата) тяжёлых вычислений; виртуализация; вынос тяжёлых расчётов в **Web Worker** (фоновый поток, чтобы не блокировать интерфейс).
- Графики при больших объёмах данных рисуй через canvas/WebGL, а не через тысячи DOM-элементов.

### Real-time (живые обновления)

- **WebSocket/SSE** для живых метрик (постоянное соединение, сервер сам шлёт обновления). Обновления обязательно буферизуй или троттли (ограничивай частоту), иначе поток данных затопит обнаружение изменений и всё затормозит.

### Надёжность и UX

- **Error boundaries** (границы ошибок — изолируют сбой одного блока, чтобы не падало всё приложение), skeleton-загрузка (серые заглушки вместо пустого экрана), retry с backoff (повтор запроса с нарастающей паузой), optimistic updates (сразу показать результат, откатить если сервер отверг).
- **Offline/PWA** при необходимости; **i18n** (интернационализация — поддержка языков) и **a11y** (доступность для людей с ограничениями) закладывай с самого начала, а не потом.

### Сквозные вопросы (cross-cutting)

- **Auth** (аутентификация) с silent token refresh (тихое обновление токена в фоне, чтобы пользователя не разлогинивало).
- **Observability** (наблюдаемость): RUM (замер реального поведения пользователей) и error tracking (сбор ошибок с прода).
- **Feature flags** для постепенного rollout; модульная архитектура (например, Nx libs) — чтобы над проектом могла работать большая команда, не мешая друг другу.

### Главное на собеседовании

Ценность ответа — не в перечислении buzzwords, а в том, чтобы назвать **trade-offs** (компромиссы) и приоритеты под конкретные требования. Например: SSR даёт SEO, но усложняет проект; нормализация убирает дубли, но добавляет сложности. Хороший инженер выбирает под задачу, а не тащит всё сразу.

## ⚠️ Подводные камни

- Смешивать server state и UI state в одном сторе — источник багов и лишней сложности.
- Real-time без троттлинга топит change detection и вешает интерфейс.
- Большие списки без виртуализации убивают производительность рендера.
- Ответ из одних buzzwords без компромиссов и приоритетов — слабый ответ.

## 🎯 Запомни

- Разбирай задачу по осям: загрузка, данные, состояние, рендер, real-time, надёжность.
- Server state и client/UI state — разные вещи, храни их раздельно.
- Большие объёмы = виртуализация, Web Worker, canvas/WebGL, троттлинг real-time.
- Сила ответа — в названных trade-offs и приоритизации под требования, а не в списке модных слов.`,
      en: `## 🧩 In plain words

Imagine you're asked to design a big house (an analytics dashboard). Nobody expects you to name the brand of every nail up front. They expect you to break the problem down floor by floor: how people get in (loading), how water flows (data), where things are stored (state), how the rooms are furnished (rendering), and what to do if the roof leaks (reliability). A strong interview answer isn't a list of buzzwords — it's breaking the problem down by axes with honest trade-offs.

### How to answer this kind of question

**SPA (Single Page Application)** — a site that loads once and then redraws its content without a full page reload. Designing a large SPA is best structured by axes: loading, data, state, rendering, real-time, reliability. Walk through each and name the decisions plus their cost.

### Loading and delivery

- **Code splitting** by feature and route plus **lazy loading** — don't load all the code at once, load chunks as needed. Plus **route-level preloading** — prefetch the code of pages the user is likely to navigate to.
- **SSR/SSG or hydration** if needed. _SSR_ renders on the server, _SSG_ generates static pages at build time; both improve **TTFB** (time to first byte) and help SEO. _Hydration_ is "bringing the server HTML to life" on the client.
- **Performance budgets** on chunk sizes; **tree-shaking** — automatic removal of unused code from the build.

### Data layer

- A **caching data layer** (like TanStack Query) — a layer that: deduplicates identical requests, caches responses, works via _stale-while-revalidate_ (serves cached data instantly and fetches fresh data in the background), and does background revalidation.
- **Normalize** server state — store each entity once by its id, so you don't duplicate the same data in multiple places.
- **Pagination/virtualization** for large tables and lists (\`cdk-virtual-scroll\`) — render only the visible rows, not all thousands at once.

### State

- Separate **server state** (data from the server, lives in the cache layer) from **client/UI state** (local interface state — is a popup open, what's in a filter; lives in signals/store). Don't mix them — they're fundamentally different things.
- Use a global store only for state genuinely shared across screens, not for everything.

### Rendering and performance

- \`OnPush\` (an Angular change-detection strategy where a component re-renders only on an explicit signal) plus signals; memoization (caching a result) of heavy computations; virtualization; offloading heavy work to a **Web Worker** (a background thread, so the UI isn't blocked).
- For large datasets, draw charts via canvas/WebGL rather than thousands of DOM elements.

### Real-time (live updates)

- **WebSocket/SSE** for live metrics (a persistent connection where the server pushes updates itself). Always buffer or throttle (rate-limit) updates, or the data stream floods change detection and everything stalls.

### Reliability and UX

- **Error boundaries** (they isolate a failure in one block so the whole app doesn't crash), skeleton loading (grey placeholders instead of a blank screen), retry with backoff (retrying a request with a growing pause), optimistic updates (show the result immediately, roll back if the server rejects it).
- **Offline/PWA** if needed; **i18n** (internationalization — language support) and **a11y** (accessibility for people with disabilities) built in from the start, not bolted on later.

### Cross-cutting concerns

- **Auth** (authentication) with silent token refresh (quietly renewing the token in the background so the user isn't logged out).
- **Observability**: RUM (measuring real user behavior) and error tracking (collecting errors from production).
- **Feature flags** for gradual rollout; modular architecture (e.g. Nx libs) — so a large team can work on the project without stepping on each other.

### The key in an interview

The value of your answer isn't in listing buzzwords — it's in naming the **trade-offs** and priorities for the concrete requirements. For example: SSR gives you SEO but complicates the project; normalization removes duplicates but adds complexity. A good engineer chooses for the task rather than dragging in everything at once.

## ⚠️ Common pitfalls

- Mixing server state and UI state in one store is a source of bugs and needless complexity.
- Real-time without throttling floods change detection and freezes the UI.
- Large lists without virtualization kill rendering performance.
- An answer of pure buzzwords with no trade-offs or priorities is a weak answer.

## 🎯 Key takeaways

- Break the problem down by axes: loading, data, state, rendering, real-time, reliability.
- Server state and client/UI state are different things — store them separately.
- Large volumes = virtualization, Web Worker, canvas/WebGL, real-time throttling.
- An answer's strength is in stated trade-offs and prioritizing for requirements, not a list of buzzwords.`,
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
      ru: `## 🧩 Простыми словами

Кэш — это как держать часто нужные вещи под рукой, а не бегать за ними в магазин каждый раз. Во фронтенде «магазин» — это сервер, а «под рукой» — браузер, память приложения, диск. Кэширование делает сайт быстрым, но у него есть коварная обратная сторона: закэшированная вещь может устареть, а ты об этом не узнаешь. Поэтому главный вопрос не «как кэшировать», а «как вовремя выбросить устаревшее».

### Уровни кэша — где вообще хранят

Кэш во фронтенде живёт на нескольких уровнях, от браузера до сервера:

1. **HTTP-кэш (браузер).** Управляется заголовками ответа: \`Cache-Control\`, \`ETag\`, \`Last-Modified\`. Ассеты с хэшем в имени (например \`app.a1b2c3.js\`) неизменны, поэтому им ставят \`max-age=31536000, immutable\` (кэшируй на год, не перепроверяй). А HTML — \`no-cache\` (всегда сверяйся с сервером), потому что он ссылается на свежие ассеты.
2. **Service Worker (PWA).** Программируемый кэш: ты сам пишешь код, что и как кэшировать. Даёт offline-работу и полный контроль.
3. **In-memory app-cache.** Data-layer (TanStack Query или свой) держит ответы API прямо в памяти работающего SPA.
4. **CDN/edge.** Кэш на серверах, физически близких к пользователю, — ответ приходит быстрее.
5. **Persistent.** localStorage/IndexedDB — хранилище на диске, переживает перезагрузку; нужно для оффлайна и быстрого «холодного старта».

### Стратегии Service Worker

Когда кэшем управляешь ты сам, есть три классические стратегии:

- **Cache-first** — сначала смотрим в кэш, идём в сеть только если там пусто. Быстро, но рискуем показать устаревшее. Годится для статики и неизменных файлов.
- **Network-first** — сначала сеть, кэш как запасной вариант если сети нет. Для данных, где важна свежесть.
- **Stale-while-revalidate (SWR)** — мгновенно отдаём закэшированное, а параллельно в фоне обновляем кэш к следующему разу. Лучший баланс UX для данных, которые часто меняются, но не критично быть секунда-в-секунду свежими.

### Инвалидация — самое сложное

> «В программировании только две по-настоящему трудные вещи: инвалидация кэша и придумывание имён.»

_Инвалидация_ — это выбрасывание устаревших данных из кэша. Способы:

- **Хэш в имени файла** решает инвалидацию ассетов автоматически: новый билд меняет содержимое → меняется хэш → меняется URL → браузер видит новый файл и качает заново. Старый кэш просто больше не запрашивается.
- **Tag/key-based инвалидация** в data-layer: каждый запрос помечен ключом; после мутации (изменения данных на сервере) инвалидируешь связанные запросы, и они перезагружаются.
- **TTL** (time-to-live, срок жизни записи) и **stale-while-revalidate** ограничивают возраст данных автоматически, без ручного вмешательства.

### Как выбрать стратегию

Выбор зависит от того, как часто данные меняются и насколько критична свежесть:

- Неизменные ассеты (js/css с хэшем, картинки) → агрессивный immutable HTTP-кэш на год.
- Часто читаемые, редко меняемые данные → SWR плюс in-memory кэш.
- Критично свежие данные (баланс счёта, биржевые котировки) → network-first или \`no-cache\`, при необходимости real-time через WebSocket.

## ⚠️ Подводные камни

- Устаревшие данные у пользователя — прямое следствие слишком агрессивного кэша.
- Рассинхрон между вкладками: в одной вкладке данные обновились, в другой остались старыми.
- Разрастание persistent-кэша (localStorage/IndexedDB) без чистки со временем засоряет диск.
- Планируй стратегию инвалидации ДО внедрения кэша, а не после первого бага.

## 🎯 Запомни

- Кэш живёт на уровнях: HTTP → Service Worker → память приложения → CDN → диск.
- Три стратегии SW: cache-first (скорость), network-first (свежесть), SWR (баланс).
- Хэш в имени файла — бесплатная и надёжная инвалидация ассетов.
- Самое трудное — инвалидация; продумывай её заранее, иначе покажешь пользователю устаревшее.`,
      en: `## 🧩 In plain words

A cache is like keeping things you need often within arm's reach instead of running to the store every time. On the frontend the "store" is the server, and "arm's reach" is the browser, the app's memory, the disk. Caching makes a site fast, but it has a sneaky downside: a cached thing can go stale without you knowing. So the real question isn't "how do I cache" but "how do I throw out the stale copy in time."

### Cache layers — where things are stored

Frontend caching lives at several layers, from the browser to the server:

1. **HTTP cache (browser).** Controlled by response headers: \`Cache-Control\`, \`ETag\`, \`Last-Modified\`. Assets with a hash in the filename (e.g. \`app.a1b2c3.js\`) are immutable, so they get \`max-age=31536000, immutable\` (cache for a year, don't revalidate). HTML gets \`no-cache\` (always check with the server), because it points to the freshest assets.
2. **Service Worker (PWA).** A programmable cache: you write the code for what and how to cache. It enables offline work and full control.
3. **In-memory app cache.** A data layer (TanStack Query or your own) keeps API responses right in the running SPA's memory.
4. **CDN/edge.** A cache on servers physically close to the user — the response arrives faster.
5. **Persistent.** localStorage/IndexedDB — on-disk storage that survives a reload; needed for offline and a fast "cold start."

### Service Worker strategies

When you control the cache yourself, there are three classic strategies:

- **Cache-first** — check the cache first, hit the network only if it's empty. Fast, but risks showing stale data. Good for static, immutable files.
- **Network-first** — network first, cache as a fallback if there's no network. For data where freshness matters.
- **Stale-while-revalidate (SWR)** — serve the cached copy instantly, and in parallel refresh the cache in the background for next time. The best UX balance for data that changes often but doesn't need to be second-by-second fresh.

### Invalidation — the hard part

> "There are only two hard things in computer science: cache invalidation and naming things."

_Invalidation_ is throwing stale data out of the cache. Ways to do it:

- **Hash in the filename** solves asset invalidation automatically: a new build changes the content → the hash changes → the URL changes → the browser sees a new file and re-downloads it. The old cache entry is simply never requested again.
- **Tag/key-based invalidation** in the data layer: each request is tagged with a key; after a mutation (a change to data on the server) you invalidate related queries and they reload.
- **TTL** (time-to-live, how long an entry lives) and **stale-while-revalidate** bound the age of data automatically, with no manual intervention.

### How to choose a strategy

The choice depends on how often data changes and how critical freshness is:

- Immutable assets (hashed js/css, images) → aggressive immutable HTTP cache for a year.
- Frequently read, rarely changed data → SWR plus an in-memory cache.
- Critically fresh data (account balance, stock quotes) → network-first or \`no-cache\`, optionally real-time via WebSocket.

## ⚠️ Common pitfalls

- Stale data shown to the user is the direct result of a too-aggressive cache.
- Cross-tab desync: one tab refreshed the data, another still shows the old copy.
- Persistent-cache bloat (localStorage/IndexedDB) without cleanup clogs the disk over time.
- Plan the invalidation strategy BEFORE adding a cache, not after the first bug.

## 🎯 Key takeaways

- Cache lives in layers: HTTP → Service Worker → app memory → CDN → disk.
- Three SW strategies: cache-first (speed), network-first (freshness), SWR (balance).
- A hash in the filename is free, reliable asset invalidation.
- The hardest part is invalidation; design it up front, or you'll show the user stale data.`,
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
      ru: `## 🧩 Простыми словами

Обычный сайт работает как поход в магазин: ты (браузер) спрашиваешь — сервер отвечает, и на этом всё. Но чат, биржевые котировки или уведомления так не построишь: там сервер должен сам «толкать» тебе новости, как только они появились. Для этого есть два способа открыть постоянный канал связи: **SSE** (сервер шлёт тебе поток, ты только слушаешь) и **WebSocket** (полноценная двусторонняя рация — оба говорят и слушают). А когда пользователей тысячи, главная головная боль — не потерять сообщения и не перегрузить браузер потоком апдейтов.

### SSE против WebSocket: что выбрать

**SSE (Server-Sent Events)** — это односторонний поток «сервер → клиент» поверх обычного HTTP. Клиент только слушает. Плюсы: браузер сам переподключается при обрыве, всё работает поверх привычного HTTP, легко проходит через прокси и корпоративные фаерволы. Минус: в HTTP/1.1 есть лимит на число одновременных соединений к одному домену. SSE идеален для лент новостей и уведомлений — там, где данные текут только в одну сторону.

**WebSocket** — это двунаправленный канал: и клиент, и сервер могут слать сообщения в любой момент, с очень маленькими накладными расходами на каждое сообщение. Нужен там, где обе стороны активно общаются: чат, совместное редактирование документа, торговля. Расплата — сложнее инфраструктура: соединение начинается как HTTP-запрос и «апгрейдится» до WebSocket (upgrade), а балансировщик должен направлять клиента всегда на тот же сервер (sticky sessions).

### Надёжность соединения

Сеть рвётся постоянно — метро, лифт, переключение Wi-Fi. Канал надо уметь восстанавливать так, чтобы это не разрушило систему.

- **Reconnect с экспоненциальным backoff + jitter.** При обрыве не долбить сервер переподключениями раз в секунду, а увеличивать паузу (1с, 2с, 4с...) и добавлять случайный разброс (jitter). Иначе при массовом обрыве все клиенты ринутся переподключаться в одну и ту же секунду — это «thundering herd» (стадо), которое добьёт сервер.
- **Heartbeat / ping-pong.** Периодически слать друг другу маленькие «пинги». Если ответа нет — соединение мёртвое (хотя формально ещё «открыто»), надо переподключаться.
- **Resume / replay.** Хранить курсор или \`id\` последнего полученного события. При переподключении сказать серверу «я остановился на событии №150, дай всё, что было после». В SSE для этого есть встроенный заголовок \`Last-Event-ID\`. Без этого механизма сообщения, пришедшие во время обрыва, просто теряются.

### Производительность на клиенте

При высокой нагрузке сервер может слать десятки сообщений в секунду. Если на каждое перерисовывать UI — браузер задохнётся.

- **Батчинг / throttle входящих апдейтов.** Не запускать перерисовку (в Angular — change detection, механизм обнаружения изменений) на каждое сообщение. Копить их в буфере и применять пачкой раз в кадр — например через \`requestAnimationFrame\` (колбэк, который браузер вызывает перед отрисовкой кадра, ~60 раз в секунду).
- **\`runOutsideAngular\`.** Тяжёлый разбор входящих данных делать вне «зоны» Angular, чтобы он не запускал проверку изменений на каждый чих. Возвращаться в зону только в момент, когда готовое состояние надо показать на экране.
- **Backpressure (противодавление).** Если поток данных быстрее, чем UI успевает рисовать, промежуточные значения можно выбрасывать и брать только последнее. Пример: котировка обновилась 50 раз за секунду — пользователю важна только текущая цена, а не все 50 промежуточных.

### Согласованность данных

- **Снапшот + дельты.** Начальное состояние загрузить обычным REST-запросом (полный «снимок»), а дальше применять только инкрементальные события-изменения (дельты). Так не приходится каждый раз качать всё заново.
- **Порядок и дубликаты.** Сообщения могут прийти не по порядку (out-of-order) или продублироваться. Спасает идемпотентность по \`id\`: у каждого события уникальный идентификатор, и повторно применять одно и то же событие безопасно — результат не изменится.

### Масштаб инфраструктуры

- **Sticky sessions или stateless через pub/sub.** Либо балансировщик всегда шлёт клиента на один и тот же сервер (sticky), либо серверы делают без состояния и обмениваются сообщениями через общую шину — pub/sub-систему вроде Redis (издатель публикует, подписчики получают). Второй вариант проще масштабировать горизонтально (добавлять серверы-gateway).
- **Fan-out через топики.** Сообщение публикуется в «топик» (тему), и рассылается всем подписчикам этого топика.
- **Авторизация на апгрейде.** Проверять права доступа в момент установки соединения, а не потом.

## ⚠️ Подводные камни

- **Утечки соединений.** Незакрытые подписки при уходе со страницы копятся и держат живые сокеты — обязательно закрывать при уничтожении компонента.
- **Перегрузка change detection** при высокочастотных апдейтах без батчинга — UI начинает лагать.
- **Потеря сообщений** без механизма replay: всё, что пришло во время обрыва, исчезает бесследно.

## 🎯 Запомни

- **SSE** — односторонний, простой, для лент и уведомлений. **WebSocket** — двусторонний, для чата и совместной работы, но сложнее в инфраструктуре.
- Надёжность = reconnect с backoff+jitter, heartbeat для мёртвых соединений, resume по \`Last-Event-ID\`/курсору против потери сообщений.
- На клиенте батчить апдейты (не дёргать перерисовку на каждое сообщение) и применять backpressure — брать последнее значение.
- Всегда предусматривай деградацию: при падении сокета — фолбэк на polling, индикатор «offline» и очередь исходящих действий.`,
      en: `## 🧩 In plain words

A normal website works like a trip to a shop: you (the browser) ask, the server answers, done. But you can't build a chat, live stock prices, or notifications that way — there the server itself must "push" news to you the moment it happens. Two mechanisms open a persistent channel for that: **SSE** (the server sends you a stream, you only listen) and **WebSocket** (a full two-way walkie-talkie — both sides talk and listen). And once you have thousands of users, the real headache is not losing messages and not drowning the browser in a flood of updates.

### SSE versus WebSocket: which to pick

**SSE (Server-Sent Events)** is a one-way "server → client" stream over ordinary HTTP. The client only listens. Pros: the browser auto-reconnects on a drop, it rides on familiar HTTP, and it slips easily through proxies and corporate firewalls. Con: HTTP/1.1 limits how many simultaneous connections you can have to one domain. SSE is ideal for news feeds and notifications — anywhere data flows in one direction only.

**WebSocket** is a bidirectional channel: both client and server can send messages at any moment, with very low overhead per message. You need it wherever both sides actively talk: chat, collaborative document editing, trading. The price is harder infrastructure: the connection starts as an HTTP request and "upgrades" to WebSocket (the upgrade), and the load balancer must always route a client to the same server (sticky sessions).

### Connection reliability

Networks drop constantly — subways, elevators, Wi-Fi handoffs. You must be able to restore the channel without wrecking the system.

- **Reconnect with exponential backoff + jitter.** On a drop, don't hammer the server every second — grow the pause (1s, 2s, 4s...) and add a random spread (jitter). Otherwise a mass disconnect makes every client rush to reconnect in the same second — a "thundering herd" that finishes off the server.
- **Heartbeat / ping-pong.** Periodically send tiny "pings" to each other. No reply means the connection is dead (even if formally still "open") and you should reconnect.
- **Resume / replay.** Keep a cursor or the \`id\` of the last received event. On reconnect, tell the server "I stopped at event #150, give me everything after that." SSE has a built-in \`Last-Event-ID\` header for exactly this. Without such a mechanism, any message that arrived during the outage is simply lost.

### Client performance

Under load the server may send dozens of messages per second. If you redraw the UI on every one, the browser chokes.

- **Batch / throttle incoming updates.** Don't trigger a redraw (in Angular, change detection — the mechanism that checks for changes) per message. Buffer them and apply in a batch once per frame — for example via \`requestAnimationFrame\` (a callback the browser runs right before painting a frame, ~60 times a second).
- **\`runOutsideAngular\`.** Do heavy parsing of incoming data outside Angular's "zone" so it doesn't run change detection on every twitch. Re-enter the zone only when the finished state needs to appear on screen.
- **Backpressure.** If the data stream is faster than the UI can paint, you can drop intermediate values and keep only the latest. Example: a quote updates 50 times a second — the user only cares about the current price, not all 50 in-between values.

### Data consistency

- **Snapshot + deltas.** Load the initial state with a normal REST request (a full "snapshot"), then apply only incremental change events (deltas). That way you never re-download everything.
- **Order and duplicates.** Messages can arrive out-of-order or duplicated. Idempotency by \`id\` saves you: every event has a unique identifier, and applying the same event twice is safe — the result doesn't change.

### Infra scale

- **Sticky sessions or stateless via pub/sub.** Either the balancer always routes a client to the same server (sticky), or servers stay stateless and exchange messages over a shared bus — a pub/sub system like Redis (a publisher publishes, subscribers receive). The second option scales horizontally more easily (just add gateway servers).
- **Fan-out via topics.** A message is published to a "topic" and delivered to every subscriber of that topic.
- **Authorize on upgrade.** Check access rights at the moment the connection is established, not later.

## ⚠️ Common pitfalls

- **Connection leaks.** Subscriptions left unclosed when leaving a page pile up and hold live sockets open — always close them when the component is destroyed.
- **Change detection overload** under high-frequency updates without batching — the UI starts to lag.
- **Message loss** without a replay mechanism: anything that arrived during an outage vanishes without a trace.

## 🎯 Key takeaways

- **SSE** — one-way, simple, for feeds and notifications. **WebSocket** — two-way, for chat and collaboration, but harder on infrastructure.
- Reliability = reconnect with backoff+jitter, heartbeat to spot dead connections, resume via \`Last-Event-ID\`/cursor to avoid losing messages.
- On the client, batch updates (don't redraw per message) and apply backpressure — keep the latest value.
- Always plan for degradation: on socket failure, fall back to polling, show an "offline" indicator, and queue outbound actions.`,
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
      ru: `## 🧩 Простыми словами

Представь заметки в телефоне: ты пишешь текст, и он появляется мгновенно — даже в самолёте без интернета. А когда сеть вернётся, всё само синхронизируется с облаком. Это и есть **offline-first**: приложение работает от локальных данных на устройстве, а сеть — лишь способ «догнать» сервер потом. **Оптимистичные обновления** — родственная идея: не заставлять пользователя ждать ответа сервера, а сразу показывать результат, как будто всё уже сохранилось. Если сервер вдруг откажет — тихо откатить изменение назад.

### Архитектура offline-first

Главный принцип: **локальное хранилище — источник истины для UI**, а сеть — лишь механизм синхронизации. Экран рисуется из локальных данных, а не напрямую из ответов сервера.

- **Service Worker** — фоновый скрипт-прокси между приложением и сетью. Он кэширует «оболочку» приложения (app shell — HTML, CSS, JS) и ассеты по стратегии cache-first (сначала берём из кэша), чтобы приложение запускалось вообще без сети.
- **IndexedDB** — встроенная в браузер база данных. В ней лежат данные приложения, и UI читает именно из неё, а не из сети.
- **Sync layer (слой синхронизации)** — реплицирует локальные изменения на сервер, когда сеть доступна. Помогает **Background Sync API** — браузер сам дошлёт отложенные изменения, даже если пользователь уже закрыл вкладку.

### Оптимистичные обновления

UI применяет изменение **немедленно**, не дожидаясь сервера, и откатывает его при ошибке. «Оптимистично» — потому что мы заранее верим в успех.

\`\`\`ts
async function optimisticUpdate(item) {
  const prev = store.snapshot();
  store.apply(item);                 // мгновенно показать
  try { await api.save(item); }
  catch { store.restore(prev); toast('Не удалось сохранить'); } // откат
}
\`\`\`

Что здесь происходит: сначала мы сохраняем текущее состояние (\`snapshot\` — снимок, чтобы было куда вернуться), затем сразу применяем изменение на экране. Дальше пытаемся сохранить на сервере. Если запрос упал — восстанавливаем прежнее состояние (\`restore\`) и показываем пользователю уведомление. Пользователь видит мгновенную реакцию, а редкий откат — честная плата за скорость.

### Очередь мутаций офлайн

Когда сети нет, изменения нельзя отправить сразу — их надо складывать и отправить позже.

- Изменения (мутации) кладутся в **outbox** («исходящие», как папка в почте) в IndexedDB с флагом «pending» (ожидает отправки).
- Когда сеть возвращается, очередь воспроизводится **по порядку**, с retry/backoff (повтор при неудаче с нарастающей паузой).
- У каждой мутации — **идемпотентный ключ** (уникальный идентификатор операции). Если при плохой связи запрос ушёл дважды, сервер по ключу поймёт, что это одна и та же операция, и не создаст дубликат.

### Разрешение конфликтов

Конфликт возникает, когда локальная и серверная версии данных разошлись — например, ту же запись поменяли с другого устройства.

- **Last-write-wins** — «побеждает последняя запись». Просто, но молча теряет чужие изменения.
- **Версионирование / ETag** — у данных есть версия (или тег \`ETag\`). Если пытаешься записать поверх устаревшей версии — сервер отклоняет запись, и её надо разрешить вручную или смерджить.
- **CRDT** (специальные структуры данных, которые умеют автоматически сливаться без потерь) — для совместного редактирования без конфликтов. Мощно, но сложно в реализации.

## ⚠️ Подводные камни

- **Рассинхрон** локального и серверного состояния при конфликтах — данные на экране и на сервере расходятся.
- **Раздувание IndexedDB** без регулярной очистки — база бесконтрольно растёт.
- **UX честности:** показывай статус («синхронизируется», «не сохранено»), чтобы пользователь понимал разницу между тем, что видно, и тем, что реально подтверждено сервером.
- Тестируй сетевые сбои и частичные синхронизации, а не только happy path (идеальный сценарий) — именно на сбоях всё и ломается.

## 🎯 Запомни

- Offline-first = **локальное хранилище — источник истины для UI**, сеть лишь синхронизирует. Основа: Service Worker + IndexedDB + слой синхронизации.
- Оптимистичное обновление: показать сразу, сохранив снимок, и откатиться при ошибке сервера.
- Офлайн-мутации складывай в outbox-очередь с идемпотентными ключами и retry/backoff при возврате сети.
- Всегда показывай статус синхронизации — пользователь должен видеть, что подтверждено, а что нет.`,
      en: `## 🧩 In plain words

Picture the notes app on your phone: you type text and it appears instantly — even on a plane with no internet. When the network comes back, everything syncs to the cloud on its own. That's **offline-first**: the app runs off local data on the device, and the network is just a way to "catch up" the server later. **Optimistic updates** are a sibling idea: don't make the user wait for the server's reply — show the result immediately, as if it were already saved. If the server ends up rejecting it, quietly roll the change back.

### Offline-first architecture

The core principle: **local storage is the source of truth for the UI**, and the network is merely a sync mechanism. The screen is drawn from local data, not directly from server responses.

- **Service Worker** — a background proxy script sitting between the app and the network. It caches the app "shell" (app shell — HTML, CSS, JS) and assets with a cache-first strategy (take from cache first) so the app launches with no network at all.
- **IndexedDB** — a database built into the browser. It holds the app's data, and the UI reads from it, not from the network.
- **Sync layer** — replicates local changes to the server when the network is available. The **Background Sync API** helps here — the browser will send the deferred changes itself, even if the user already closed the tab.

### Optimistic updates

The UI applies a change **immediately**, without waiting for the server, and rolls it back on error. "Optimistic" because we bet on success up front.

\`\`\`ts
async function optimisticUpdate(item) {
  const prev = store.snapshot();
  store.apply(item);                 // show instantly
  try { await api.save(item); }
  catch { store.restore(prev); toast('Failed to save'); } // rollback
}
\`\`\`

What happens here: first we save the current state (\`snapshot\` — a copy to fall back to), then immediately apply the change on screen. Next we try to save to the server. If the request fails, we restore the previous state (\`restore\`) and show the user a toast. The user gets an instant reaction, and the rare rollback is the honest price of that speed.

### Offline mutation queue

When there's no network, changes can't be sent right away — they must be stored and sent later.

- Changes (mutations) go into an **outbox** (like the outbox folder in email) in IndexedDB, flagged "pending" (waiting to be sent).
- When the network returns, the queue replays **in order**, with retry/backoff (retry on failure with a growing pause).
- Each mutation carries an **idempotent key** (a unique operation id). If a flaky connection sent the request twice, the server uses the key to recognize it's the same operation and won't create a duplicate.

### Conflict resolution

A conflict arises when local and server versions of the data diverge — for example, the same record was changed from another device.

- **Last-write-wins** — the last write wins. Simple, but silently loses other people's changes.
- **Versioning / ETag** — the data has a version (or an \`ETag\` tag). If you try to write over a stale version, the server rejects the write, and it must be resolved manually or merged.
- **CRDT** (special data structures that merge automatically without loss) — for lossless collaborative editing. Powerful, but complex to implement.

## ⚠️ Common pitfalls

- **Desync** of local and server state on conflicts — what's on screen and what's on the server drift apart.
- **IndexedDB bloat** without regular cleanup — the database grows unchecked.
- **UX honesty:** show status ("syncing", "not saved") so the user understands the gap between what's shown and what the server has actually confirmed.
- Test network failures and partial syncs, not just the happy path — failures are exactly where things break.

## 🎯 Key takeaways

- Offline-first = **local storage is the source of truth for the UI**, the network only syncs. Foundation: Service Worker + IndexedDB + a sync layer.
- Optimistic update: show it right away after saving a snapshot, and roll back on a server error.
- Queue offline mutations in an outbox with idempotent keys and retry/backoff when the network returns.
- Always show sync status — the user must see what's confirmed and what isn't.`,
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
      ru: `## 🧩 Простыми словами

Представь клуб с браслетами. **Access-токен** — это браслет на входе: короткоживущий, показал охране — тебя пустили. Чтобы браслет нельзя было украсть и пользоваться вечно, он «сгорает» через 5-15 минут. **Refresh-токен** — это твой паспорт в гардеробе: по нему на стойке тебе выдают свежий браслет, когда старый истёк. Задача фронтенда — хранить эти два токена безопасно и **незаметно** обновлять браслет, чтобы пользователь никогда не упирался в «вас разлогинило».

### Где хранить токены

- **Access-токен** — короткоживущий (5-15 минут). Хранить **в памяти** (обычная переменная или сигнал). НЕ в \`localStorage\`: туда может залезть любой чужой скрипт при XSS-атаке (injection постороннего JavaScript на страницу) и украсть токен.
- **Refresh-токен** — долгоживущий, поэтому куда ценнее и опаснее при краже. Лучшее место — **httpOnly + Secure + SameSite cookie**. \`httpOnly\` значит, что JavaScript вообще не может его прочитать (защита от XSS), \`Secure\` — только по HTTPS, \`SameSite\` — не отправляется на чужие сайты. Обновление делается запросом «с учётными данными» (credentialled), браузер сам приложит cookie.

### Поток обновления

Когда access-токен протух, сервер отвечает \`401 Unauthorized\`. Интерсептор (перехватчик запросов) ловит эту ошибку, запускает обновление токена и повторяет исходный запрос — пользователь ничего не замечает.

\`\`\`ts
catchError(err => {
  if (err.status === 401) return refresh$.pipe(switchMap(() => retry(req)));
  return throwError(() => err);
})
\`\`\`

Здесь на \`401\` мы переключаемся (\`switchMap\`) на поток обновления \`refresh$\`, а после успеха повторяем исходный запрос \`req\`. Любую другую ошибку просто пробрасываем дальше.

### Проблема одновременных 401

Представь, что страница разом отправила 5 запросов, и у всех истёк токен — прилетело 5 ответов \`401\`. Если каждый запустит своё обновление, сервер получит 5 параллельных refresh-ов — шторм и хаос. Решение — **single-flight** («один в полёте»): первый 401 запускает обновление, остальные **ждут его результат**, а не запускают своё.

\`\`\`ts
private refresh$ = this.doRefresh().pipe(shareReplay(1));
\`\`\`

\`shareReplay(1)\` делает так, что все подписчики получают **один и тот же** результат одного обновления, а не дёргают его заново. То же самое можно сделать через мьютекс-Subject (флаг «обновление уже идёт»).

### Silent renewal (тихое обновление)

Вместо того чтобы ждать \`401\`, лучше обновлять access-токен **заранее, до истечения** — по таймеру или по полю \`exp\` (время истечения) внутри токена. Тогда пользователь вообще никогда не попадёт на 401. В OIDC (стандарт авторизации поверх OAuth) это делают через скрытый iframe или через refresh-token grant.

### Безопасность

- **Refresh token rotation (ротация).** При каждом обновлении сервер выдаёт **новый** refresh-токен, а старый сразу инвалидирует. Украденный одноразовый токен становится бесполезным. Более того: если сервер видит, что кто-то попытался использовать уже потраченный токен (reuse), это сигнал компрометации — можно разлогинить всю сессию.
- **CSRF.** При хранении в cookie нужна защита от CSRF-атак (когда чужой сайт заставляет твой браузер отправить запрос с твоей cookie). Помогают double-submit-токен и \`SameSite\`.
- **Logout.** Полноценный выход — это ревокация (аннулирование) refresh-токена на сервере, очистка cookie и сброс access-токена из памяти.

## ⚠️ Подводные камни

- **\`localStorage\` для токенов** — классическая XSS-уязвимость: любой внедрённый скрипт унесёт токен.
- **Гонки refresh без single-flight** — параллельные обновления превращаются в шторм запросов и могут выкидывать пользователя.
- **Бесконечный retry-цикл** при стабильном \`401\` (например, refresh тоже протух) — обязательно ограничивай число попыток.
- **Мультивкладочная синхронизация:** если пользователь разлогинился в одной вкладке, оповести остальные через \`BroadcastChannel\` или событие \`storage\`.

## 🎯 Запомни

- Access-токен — в памяти (короткий), refresh-токен — в httpOnly cookie (недоступен JS). \`localStorage\` для токенов — это XSS-дыра.
- При \`401\` интерсептор тихо обновляет токен и повторяет запрос; ещё лучше — silent renewal заранее, до истечения.
- Параллельные 401 решаются паттерном single-flight (\`shareReplay\`) — одно обновление на всех.
- Безопасность: ротация refresh-токенов, CSRF-защита при cookie, ограничение retry и синхронизация logout между вкладками.`,
      en: `## 🧩 In plain words

Picture a club with wristbands. The **access token** is the wristband at the door: short-lived, you flash it and security lets you in. So a stolen one can't be used forever, it "expires" after 5-15 minutes. The **refresh token** is your ID at the coat check: the desk uses it to hand you a fresh wristband when the old one expires. The frontend's job is to store these two tokens safely and **silently** renew the wristband so the user never hits a "you've been logged out" wall.

### Where to store tokens

- **Access token** — short-lived (5-15 min). Keep it **in memory** (a plain variable or a signal). NOT in \`localStorage\`: any foreign script can reach in there during an XSS attack (injecting outside JavaScript into the page) and steal the token.
- **Refresh token** — long-lived, so far more valuable and dangerous if stolen. The best place is an **httpOnly + Secure + SameSite cookie**. \`httpOnly\` means JavaScript can't read it at all (XSS protection), \`Secure\` means HTTPS-only, \`SameSite\` means it isn't sent to other sites. Refresh happens via a "credentialled" request — the browser attaches the cookie itself.

### Refresh flow

When the access token goes stale, the server responds \`401 Unauthorized\`. An interceptor (a request hook) catches this error, triggers a token refresh, and retries the original request — the user notices nothing.

\`\`\`ts
catchError(err => {
  if (err.status === 401) return refresh$.pipe(switchMap(() => retry(req)));
  return throwError(() => err);
})
\`\`\`

Here, on a \`401\` we switch (\`switchMap\`) to the refresh stream \`refresh$\`, and once it succeeds we retry the original request \`req\`. Any other error is simply rethrown.

### The concurrent-401 problem

Imagine the page fired 5 requests at once and all had an expired token — 5 \`401\` responses come back. If each launches its own refresh, the server gets 5 parallel refreshes — a storm and chaos. The fix is **single-flight**: the first 401 triggers the refresh, and the rest **wait for its result** instead of starting their own.

\`\`\`ts
private refresh$ = this.doRefresh().pipe(shareReplay(1));
\`\`\`

\`shareReplay(1)\` makes all subscribers receive the **same** result of a single refresh rather than re-triggering it. The same effect can be achieved with a mutex Subject (a "refresh already in progress" flag).

### Silent renewal

Rather than waiting for a \`401\`, it's better to refresh the access token **proactively, before it expires** — on a timer or from the \`exp\` (expiry time) claim inside the token. Then the user never hits a 401 at all. In OIDC (an auth standard on top of OAuth) this is done via a hidden iframe or a refresh-token grant.

### Security

- **Refresh token rotation.** On each refresh the server issues a **new** refresh token and immediately invalidates the old one. A stolen one-time token becomes useless. More than that: if the server sees someone try to use an already-spent token (reuse), it's a compromise signal — you can log out the whole session.
- **CSRF.** Cookie storage needs protection against CSRF attacks (where another site tricks your browser into sending a request with your cookie). A double-submit token and \`SameSite\` help.
- **Logout.** A proper logout means revoking (invalidating) the refresh token server-side, clearing the cookie, and resetting the in-memory access token.

## ⚠️ Common pitfalls

- **\`localStorage\` for tokens** — the classic XSS vulnerability: any injected script walks off with the token.
- **Refresh races without single-flight** — parallel refreshes turn into a request storm and can log the user out.
- **Infinite retry loop** on a persistent \`401\` (e.g. the refresh token is also stale) — always cap the number of attempts.
- **Multi-tab sync:** if the user logs out in one tab, notify the others via \`BroadcastChannel\` or the \`storage\` event.

## 🎯 Key takeaways

- Access token — in memory (short). Refresh token — in an httpOnly cookie (unreadable by JS). \`localStorage\` for tokens is an XSS hole.
- On \`401\`, an interceptor silently refreshes and retries; even better — silent renewal ahead of expiry.
- Concurrent 401s are solved with single-flight (\`shareReplay\`) — one refresh shared by all.
- Security: refresh token rotation, CSRF protection with cookies, capped retries, and logout sync across tabs.`,
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
      ru: `## 🧩 Простыми словами

Представь дверь лифта: пока люди продолжают заходить, она не закрывается. Стоит потоку прекратиться на пару секунд — двери закрываются, лифт едет. Это и есть **debounce**: он откладывает вызов функции до тех пор, пока события не «успокоятся». Каждое новое событие сбрасывает таймер обратно. Классический пример — поиск во время печати: не слать запрос на каждую букву, а подождать, пока пользователь допечатает и остановится.

### Что делает debounce

Debounce откладывает вызов функции, пока не пройдёт \`wait\` миллисекунд **без новых вызовов**. Каждый новый вызов сбрасывает таймер на начало. Применяют его для поиска-as-you-type (по мере набора), обработки ресайза окна, валидации поля ввода — то есть везде, где обработчик надо запустить только когда поток событий утих.

### Отличие от throttle

Эти два часто путают, но ведут они себя по-разному:

- **Debounce** реагирует на **конец** всплеска — один раз, после паузы. (Ждём тишины.)
- **Throttle** ограничивает частоту до одного раза в \`wait\` — равномерно **во время** всплеска. (Не чаще, чем раз в N мс.)

Пример: при быстрой прокрутке debounce сработает один раз, когда ты остановишься; throttle — стабильно раз в 200 мс всю дорогу.

### Leading против trailing

Можно выбрать, в какой момент всплеска дёрнуть функцию:

- **trailing (по умолчанию):** вызов **после** паузы, в конце всплеска.
- **leading:** вызов **на первом** событии, а потом тишина до новой паузы.

### Разбор реализации

\`\`\`ts
// Time: O(1) per call, Space: O(1)
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
}
\`\`\`

Как это работает по шагам:

- Через **замыкание** (closure — функция помнит переменные из внешней области) хранятся \`timer\` (текущий таймер), \`lastArgs\` и \`lastThis\` (аргументы и контекст последнего вызова).
- \`callNow\` истинно, только если включён \`leading\` и таймера ещё нет — значит это первое событие всплеска, вызываем сразу.
- Каждый вызов **сбрасывает** старый таймер (\`clearTimeout\`) и заводит новый на \`wait\` мс. Именно поэтому пока сыплются события — срабатывания не будет.
- Когда таймер наконец «дозвонит», для режима \`trailing\` вызываем \`fn\` с **последними** сохранёнными аргументами. Проверка \`!callNow\` не даёт задвоить вызов, если он уже был сделан на leading-фронте.
- \`fn.apply(lastThis, lastArgs)\` сохраняет правильный \`this\` и передаёт актуальные аргументы.
- \`cancel()\` гасит запланированный вызов — критично при уничтожении компонента.

### Сложность

- Время: \`O(1)\` на каждый вызов. Память: \`O(1)\` — храним лишь один таймер и последние аргументы.

## ⚠️ Подводные камни

- Обязательно сохранять \`this\` и аргументы **последнего** вызова (для trailing важны именно свежие данные, а не первые).
- В Angular для потоков событий предпочтительнее RxJS-оператор \`debounceTime\`, но для «голых» DOM-утилит нужен ручной debounce, как выше.
- Не забывай вызвать \`cancel\` при уничтожении компонента — иначе утечка таймера и вызов функции уже после destroy.

## 🎯 Запомни

- Debounce = «подожди тишины»: вызвать функцию, только когда прошло \`wait\` мс без новых событий; каждое событие сбрасывает таймер.
- Debounce ловит **конец** всплеска, throttle равномерно ограничивает частоту **во время** всплеска.
- leading — вызов на первом событии, trailing — после паузы; храни последние аргументы и \`this\`.
- Всегда реализуй \`cancel\` и вызывай его при destroy, чтобы избежать утечек и вызовов после размонтирования.`,
      en: `## 🧩 In plain words

Picture an elevator door: while people keep stepping in, it won't close. Let the flow stop for a couple of seconds — the doors close and the elevator goes. That's **debounce**: it postpones a function call until events "settle down." Every new event resets the timer back to the start. The classic example is search-as-you-type: don't fire a request on every letter, wait until the user finishes typing and pauses.

### What debounce does

Debounce postpones a function call until \`wait\` milliseconds pass **without new calls**. Each new call resets the timer to the beginning. It's used for search-as-you-type, window resize handling, input field validation — anywhere the handler should run only once the event stream goes quiet.

### Difference from throttle

These two are often confused, but they behave differently:

- **Debounce** reacts to the **end** of a burst — once, after a pause. (Wait for silence.)
- **Throttle** caps frequency to once per \`wait\` — evenly **during** a burst. (No more than once per N ms.)

Example: during fast scrolling, debounce fires once when you stop; throttle fires steadily once every 200 ms the whole way.

### Leading versus trailing

You can choose at which point of the burst to invoke the function:

- **trailing (default):** call **after** the pause, at the end of the burst.
- **leading:** call on the **first** event, then silence until a new pause.

### Walking through the implementation

\`\`\`ts
// Time: O(1) per call, Space: O(1)
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
}
\`\`\`

How it works, step by step:

- A **closure** (a function that remembers variables from its outer scope) holds \`timer\` (the current timer), plus \`lastArgs\` and \`lastThis\` (the arguments and context of the last call).
- \`callNow\` is true only when \`leading\` is on and there's no timer yet — meaning this is the first event of a burst, so we call immediately.
- Every call **resets** the old timer (\`clearTimeout\`) and starts a new one for \`wait\` ms. That's precisely why nothing fires while events keep pouring in.
- When the timer finally "rings," for \`trailing\` mode we call \`fn\` with the **last** saved arguments. The \`!callNow\` check prevents a double call if it already fired on the leading edge.
- \`fn.apply(lastThis, lastArgs)\` preserves the correct \`this\` and passes the up-to-date arguments.
- \`cancel()\` kills the scheduled call — critical on component destroy.

### Complexity

- Time: \`O(1)\` per call. Space: \`O(1)\` — we keep just one timer and the last arguments.

## ⚠️ Common pitfalls

- Always preserve \`this\` and the **last** call's arguments (for trailing, the fresh data matters, not the first).
- In Angular, the RxJS \`debounceTime\` operator is preferable for event streams, but bare DOM utilities need a manual debounce like the one above.
- Don't forget to call \`cancel\` on component destroy — otherwise you leak the timer and fire the function after destroy.

## 🎯 Key takeaways

- Debounce = "wait for silence": call the function only after \`wait\` ms pass with no new events; every event resets the timer.
- Debounce catches the **end** of a burst; throttle evenly caps frequency **during** the burst.
- leading — call on the first event; trailing — call after the pause; store the last arguments and \`this\`.
- Always implement \`cancel\` and call it on destroy to avoid leaks and post-unmount calls.`,
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
      ru: `## 🧩 Простыми словами

Представь турникет в метро: сколько бы людей ни толпилось, он пропускает по одному человеку раз в несколько секунд, равномерно. Throttle (троттлинг) — это такой турникет для вызовов функции: сколько бы событий ни сыпалось, обработчик срабатывает **не чаще одного раза за заданный интервал**. Это удобно, когда события идут потоком (скролл, движение мыши), а реагировать надо регулярно, но не на каждый чих.

### Что делает throttle

Throttle гарантирует, что функция вызывается **максимум один раз за \`wait\` миллисекунд** (\`wait\` — это длина окна, например 200 мс). Ключевое отличие от его брата **debounce**: throttle срабатывает **прямо во время** непрерывного потока событий, а debounce ждёт, пока поток утихнет, и вызывает функцию только после паузы.

Простая аналогия: throttle — это «делаю по фотографии каждые 200 мс, пока ты бежишь». Debounce — это «сделаю одну фотографию, только когда ты остановишься».

### Когда throttle лучше debounce

- **Скролл и прогресс-бар:** индикатор нужно обновлять регулярно, пока страница крутится, а не ждать конца прокрутки → throttle.
- **Движение мыши при рисовании:** нужны равномерные «сэмплы» (снимки позиции) через равные промежутки, чтобы линия была гладкой → throttle.
- **Ограничение частоты вызовов API (rate-limiting)** при непрерывном вводе: не хотим слать запрос на каждое нажатие, но хотим слать регулярно.

А вот **debounce** выигрывает, когда важен только **финальный** результат всплеска событий. Классика — автодополнение поиска: пока человек печатает, запросы не нужны, нужен один запрос по итоговой строке.

### Trailing-вызов (замыкающий вызов)

Термин: **leading edge** — вызов в начале окна (сразу на первом событии), **trailing edge** — вызов в конце окна (после того как окно закрылось).

Проблема: если просто пропускать события чаще, чем раз в \`wait\`, то **последнее** событие в окне может потеряться. Пример: пользователь докрутил до самого низа, но финальное положение скролла не обработалось, потому что оно пришло «между» разрешёнными вызовами.

Trailing-вызов это чинит: он запоминает последние аргументы и **гарантированно вызывает функцию ещё раз после закрытия окна**, чтобы финальное значение точно обработалось.

Вот реализация с leading + trailing:

\`\`\`ts
// Время: O(1) на вызов, Память: O(1)
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
}
\`\`\`

Как это читать по шагам:
- \`remaining\` — сколько миллисекунд ещё осталось до конца текущего окна. Если оно \`<= 0\`, значит окно прошло и можно вызывать сразу (leading edge).
- Каждый вызов сохраняет \`lastArgs\` и \`lastThis\` — последние аргументы и контекст, чтобы trailing-вызов сработал именно с ними.
- Если окно ещё не закрылось и таймер не заведён — ставим \`setTimeout\` на остаток времени. Он и есть тот самый гарантированный финальный вызов (trailing edge).
- \`cancel()\` сбрасывает всё, если нужно отменить запланированный вызов (например, при размонтировании компонента).

### Сложность

- **Время:** \`O(1)\` на каждый вызов (никаких циклов, просто арифметика и одна проверка).
- **Память:** \`O(1)\` (храним лишь несколько переменных).

## ⚠️ Подводные камни

- **Меряй время реальными часами.** Используй \`Date.now()\` или \`performance.now()\` для подсчёта прошедшего интервала, а не полагайся только на \`setTimeout\` — таймеры могут срабатывать неточно.
- **Не теряй последние аргументы.** Обязательно сохраняй их для trailing-вызова, иначе финальное событие пропадёт.
- В RxJS аналог этого поведения — \`throttleTime(wait, asyncScheduler, { trailing: true })\`.

## 🎯 Запомни

- Throttle = «не чаще раза в \`wait\` мс», срабатывает **во время** потока событий.
- Debounce = «только после паузы»; выбирай его, когда важен лишь финальный результат всплеска.
- Trailing-вызов гарантирует обработку **последнего** события в окне — без него хвост потока теряется.
- Скролл, рисование мышью, rate-limit API → throttle. Автодополнение поиска → debounce.`,
      en: `## 🧩 In plain words

Think of a subway turnstile: no matter how big the crowd, it lets one person through every few seconds, evenly. Throttle is that turnstile for function calls: no matter how many events pour in, the handler fires **at most once per fixed interval**. This is handy when events come in a stream (scroll, mouse movement) and you need to react regularly, but not to every single tick.

### What throttle does

Throttle guarantees a function runs **at most once per \`wait\` milliseconds** (\`wait\` is the window length, e.g. 200 ms). The key difference from its sibling **debounce**: throttle fires **during** a continuous stream of events, while debounce waits for the stream to go quiet and only calls the function after a pause.

A simple analogy: throttle is "take one photo every 200 ms while you run." Debounce is "take one photo only once you stop."

### When throttle beats debounce

- **Scroll and progress bar:** the indicator must update regularly while the page scrolls, not wait for scrolling to finish → throttle.
- **Mouse moves for drawing:** you want even "samples" (position snapshots) at regular intervals so the line stays smooth → throttle.
- **Rate-limiting API calls** during continuous input: you don't want a request per keystroke, but you do want them sent regularly.

**Debounce**, on the other hand, wins when only the **final** result of a burst matters. The classic case is search autocomplete: while the user is typing you need no requests, just one request for the final string.

### Trailing call

Terms: **leading edge** — a call at the start of the window (immediately on the first event); **trailing edge** — a call at the end of the window (after it closes).

The problem: if you simply drop events that arrive more often than once per \`wait\`, the **last** event in the window can be lost. Example: the user scrolled all the way to the bottom, but that final scroll position never got handled because it arrived "between" the allowed calls.

The trailing call fixes this: it remembers the last arguments and **guarantees one more call after the window closes**, so the final value is definitely processed.

Here is an implementation with leading + trailing:

\`\`\`ts
// Time: O(1) per call, Space: O(1)
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
}
\`\`\`

How to read it step by step:
- \`remaining\` — how many milliseconds are left until the end of the current window. If it's \`<= 0\`, the window has passed and we can call immediately (leading edge).
- Every call saves \`lastArgs\` and \`lastThis\` — the latest arguments and context — so the trailing call fires with exactly those.
- If the window hasn't closed yet and no timer is set, we schedule a \`setTimeout\` for the remaining time. That timer is the guaranteed final call (trailing edge).
- \`cancel()\` resets everything if you need to abort a scheduled call (e.g., when a component unmounts).

### Complexity

- **Time:** \`O(1)\` per call (no loops, just arithmetic and one check).
- **Space:** \`O(1)\` (we keep only a few variables).

## ⚠️ Common pitfalls

- **Measure time with a real clock.** Use \`Date.now()\` or \`performance.now()\` to track the elapsed interval instead of relying on \`setTimeout\` alone — timers can fire imprecisely.
- **Don't lose the last arguments.** Always save them for the trailing call, or the final event is dropped.
- In RxJS the analog of this behavior is \`throttleTime(wait, asyncScheduler, { trailing: true })\`.

## 🎯 Key takeaways

- Throttle = "at most once per \`wait\` ms," fires **during** the event stream.
- Debounce = "only after a pause"; pick it when only the final result of a burst matters.
- The trailing call guarantees the **last** event in the window is handled — without it the tail of the stream is lost.
- Scroll, mouse drawing, API rate-limit → throttle. Search autocomplete → debounce.`,
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
      ru: `## 🧩 Простыми словами

Представь, что у тебя есть матрёшка, и ты хочешь сделать её точную копию — да так, чтобы, покрасив копию, ты случайно не покрасил оригинал. **Глубокое клонирование (deep clone)** — это когда ты копируешь объект вместе со всеми вложенными объектами «до самого дна», а не просто дублируешь верхнюю ссылку. Сложность в том, что объекты могут ссылаться сами на себя (циклы) и содержать хитрые типы вроде \`Map\`, \`Set\`, \`Date\`.

### Что именно требуется

Глубокая копия должна рекурсивно продублировать все вложенные структуры, **не разделяя ссылок** с оригиналом (изменил копию — оригинал не тронут), и при этом:
- не зациклиться на **циклических ссылках** (когда объект прямо или косвенно ссылается сам на себя);
- сохранить **разделяемые ссылки** — если один и тот же объект встречается в структуре дважды, в клоне он тоже должен остаться одним объектом, а не превратиться в две независимые копии;
- корректно скопировать \`Date\` (дату), \`Map\` и \`Set\` (коллекции), массивы.

### Почему \`JSON.parse(JSON.stringify())\` — плохой путь

Многие клонируют объект, превратив его в строку JSON и обратно. Это соблазнительно коротко, но ломается на многом:
- Теряет \`undefined\`, функции и \`Symbol\` — они просто исчезают.
- Ломает \`Date\` (превращает в строку) и \`Map\`/\`Set\` (превращает в пустой \`{}\`).
- **Бросает ошибку на циклах** — \`JSON.stringify\` не умеет сериализовать объект, ссылающийся сам на себя.
- Не сохраняет прототипы (то есть класс-инстанс станет обычным объектом) и разделяемые ссылки.

### Решение: WeakMap как «журнал уже скопированного»

Главный приём — завести **\`WeakMap\`** (словарь \`оригинал → клон\`). \`WeakMap\` — это словарь, где ключами могут быть объекты, а неиспользуемые записи автоматически подчищает сборщик мусора.

Логика простая: перед тем как клонировать объект, заглядываем в этот журнал. Если объект там уже есть — значит мы его уже начали клонировать, возвращаем готовый клон. Это одним махом решает **обе** проблемы — и циклы, и разделяемые ссылки — за \`O(1)\` поиск.

\`\`\`ts
// Время: O(n), Память: O(n)
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
}
\`\`\`

Что здесь происходит по порядку:
- **Примитивы** (число, строка, \`null\` и т.п.) возвращаются как есть — их копировать нечего.
- **\`Date\` и \`RegExp\`** пересоздаются напрямую своими конструкторами.
- **Проверка \`seen.has(ref)\`** — тот самый журнал: если уже видели, отдаём существующий клон и не уходим в бесконечную рекурсию.
- **Важнейшая деталь:** для массива/\`Map\`/\`Set\`/объекта мы сначала кладём пустой клон в \`seen\`, и **только потом** заполняем его. Если сделать наоборот, цикл (объект внутри себя) снова уронит рекурсию.
- Для обычных объектов \`Object.create(Object.getPrototypeOf(value))\` сохраняет прототип, а \`Reflect.ownKeys\` копирует все ключи, включая \`Symbol\`-и.

### Сложность

- **Время:** \`O(n)\`, где \`n\` — число узлов (мы обходим каждый ровно один раз благодаря журналу).
- **Память:** \`O(n)\` — сам клон плюс записи в \`WeakMap\`.

## ⚠️ Подводные камни

- Всегда клади заготовку клона в \`seen\` **до** рекурсивного заполнения — иначе циклы снова приведут к бесконечной рекурсии.
- \`JSON\`-трюк молча теряет данные — не используй его там, где есть \`Date\`, \`Map\`, \`Set\`, функции или циклы.
- Ручная реализация не копирует функции и не «оживляет» класс-инстансы полностью — это ожидаемо.

## 🎯 Запомни

- Глубокий клон = рекурсивная копия без общих ссылок с оригиналом.
- \`WeakMap\` (оригинал → клон) решает разом и циклы, и разделяемые ссылки за \`O(1)\`.
- \`JSON.parse(JSON.stringify())\` ломается на циклах, \`Date\`, \`Map\`/\`Set\`, функциях и прототипах.
- В продакшене предпочитай нативный \`structuredClone()\` (поддерживает циклы, \`Map\`/\`Set\`/\`Date\`); ручную реализацию спрашивают, чтобы проверить понимание.`,
      en: `## 🧩 In plain words

Imagine you have a nesting doll and want an exact copy — one where painting the copy won't accidentally paint the original. **Deep cloning** means copying an object together with all its nested objects "all the way down," not just duplicating the top-level reference. The tricky part is that objects can point back to themselves (cycles) and can contain special types like \`Map\`, \`Set\`, and \`Date\`.

### What exactly is required

A deep copy must recursively duplicate all nested structures **without sharing references** with the original (change the copy, the original stays untouched), while also:
- not looping forever on **cyclic references** (when an object refers, directly or indirectly, to itself);
- preserving **shared references** — if the same object appears twice in the structure, it should stay one object in the clone too, not split into two independent copies;
- correctly copying \`Date\`, \`Map\`, \`Set\`, and arrays.

### Why \`JSON.parse(JSON.stringify())\` is a bad path

Many people clone by turning the object into a JSON string and back. It's tempting and short, but it breaks in many ways:
- Loses \`undefined\`, functions, and \`Symbol\` — they simply vanish.
- Breaks \`Date\` (turns it into a string) and \`Map\`/\`Set\` (turns them into an empty \`{}\`).
- **Throws on cycles** — \`JSON.stringify\` can't serialize an object that refers to itself.
- Doesn't preserve prototypes (so a class instance becomes a plain object) or shared references.

### The solution: a WeakMap as a "log of what's already copied"

The key trick is a **\`WeakMap\`** (a dictionary \`original → clone\`). A \`WeakMap\` is a dictionary whose keys can be objects, and whose unused entries the garbage collector cleans up automatically.

The logic is simple: before cloning an object, check this log. If the object is already there, we've already started cloning it — return the existing clone. This solves **both** problems at once — cycles and shared references — with an \`O(1)\` lookup.

\`\`\`ts
// Time: O(n), Space: O(n)
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
}
\`\`\`

What happens, in order:
- **Primitives** (number, string, \`null\`, etc.) are returned as-is — there's nothing to copy.
- **\`Date\` and \`RegExp\`** are rebuilt directly with their own constructors.
- **The \`seen.has(ref)\` check** is the log: if we've seen it, return the existing clone and avoid infinite recursion.
- **The crucial detail:** for an array/\`Map\`/\`Set\`/object we first put an empty clone into \`seen\`, and **only then** fill it. Do it the other way around and a cycle (an object inside itself) will crash the recursion again.
- For plain objects, \`Object.create(Object.getPrototypeOf(value))\` preserves the prototype, and \`Reflect.ownKeys\` copies all keys, including \`Symbol\`s.

### Complexity

- **Time:** \`O(n)\`, where \`n\` is the number of nodes (we visit each exactly once thanks to the log).
- **Space:** \`O(n)\` — the clone itself plus the \`WeakMap\` entries.

## ⚠️ Common pitfalls

- Always put the clone stub into \`seen\` **before** filling it recursively — otherwise cycles cause infinite recursion again.
- The \`JSON\` trick silently loses data — don't use it where there are \`Date\`, \`Map\`, \`Set\`, functions, or cycles.
- A manual implementation doesn't copy functions and doesn't fully "revive" class instances — that's expected.

## 🎯 Key takeaways

- Deep clone = a recursive copy with no references shared with the original.
- A \`WeakMap\` (original → clone) solves both cycles and shared references at once, in \`O(1)\`.
- \`JSON.parse(JSON.stringify())\` breaks on cycles, \`Date\`, \`Map\`/\`Set\`, functions, and prototypes.
- In production prefer the native \`structuredClone()\` (handles cycles, \`Map\`/\`Set\`/\`Date\`); the manual version is asked to test understanding.`,
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
      ru: `## 🧩 Простыми словами

Представь, что тебя спросили «сколько будет 17 × 23», ты посчитал и записал ответ на бумажку. В следующий раз при том же вопросе ты не считаешь заново — просто смотришь в бумажку. **Мемоизация (memoize)** — это ровно та бумажка для функции: результат сохраняется по аргументам, и повторный вызов с теми же аргументами мгновенно возвращает готовый ответ.

### Идея

Мемоизация кэширует результат **чистой функции** по её аргументам. Чистая функция (pure function) — это функция, которая при одних и тех же входных данных всегда даёт один и тот же результат и не имеет побочных эффектов (не меняет ничего снаружи). Именно поэтому мемоизация работает только для **детерминированных функций без побочных эффектов** — иначе бумажка соврёт.

### Ключ кэша — самое тонкое место

Кэш хранится как словарь \`ключ → результат\`. Главный вопрос: как из аргументов сделать этот ключ?
- **\`JSON.stringify(args)\`** — просто и универсально, но дорого по времени и ломается на циклах, функциях и разном порядке ключей в объектах.
- **Кастомный \`resolver\`** — своя функция, которая строит ключ так, как нужно именно тебе (например, по \`id\` объекта). Гибко и быстро.
- **\`WeakMap\`** — если аргумент один и это объект: не течёт по памяти, сборщик мусора чистит запись сам, когда объект больше не нужен.

\`\`\`ts
// Поиск/вставка: O(1), Память: O(k уникальных ключей)
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
}
\`\`\`

Разбор:
- \`resolver\` по умолчанию склеивает аргументы через \`JSON.stringify\`, но его можно заменить своим — в этом и есть «настраиваемый ключ».
- Если ключ уже в \`cache\` — сразу возвращаем сохранённое значение, не вызывая \`fn\`.
- Иначе считаем, кладём в кэш и возвращаем.
- \`clear()\` позволяет вручную сбросить кэш (например, когда данные устарели).

### Сложность

- **Поиск/вставка:** \`O(1)\` при использовании \`Map\`.
- **Память:** \`O(k)\`, где \`k\` — число уникальных ключей, которые накопились в кэше.

## ⚠️ Подводные камни

- **Рост памяти.** Кэш без ограничения копит все ключи. Если аргументы бесконечно разные — это фактически утечка. Решение: ограничить размер (LRU — выбрасывать давно не используемые) или \`WeakMap\`.
- **Устаревшие (stale) результаты.** Если функция тайком зависит от внешнего изменяемого состояния, кэш вернёт старый ответ. Мемоизируй только чистые функции.
- **Неверный ключ.** Слишком грубый \`resolver\` может схлопнуть разные аргументы в один ключ → неправильный результат.
- **Накладные расходы.** Для дешёвых функций поход в кэш может оказаться медленнее, чем просто посчитать заново.

### В контексте Angular

Сигналы и \`computed\` дают мемоизацию из коробки — пересчитывают значение, только когда меняются зависимости. Пайпы стоит делать \`pure\`, чтобы Angular не гонял их лишний раз. Ручной \`memoize\` пригодится для тяжёлых чистых вычислений вне реактивного контекста.

## 🎯 Запомни

- Мемоизация = «посчитал раз, запомнил, дальше отдаёшь из кэша». Только для чистых функций.
- Всё решает построение ключа: \`JSON.stringify\`, кастомный \`resolver\` или \`WeakMap\` для объекта-аргумента.
- Главные риски: рост памяти (нужен LRU/\`WeakMap\`) и устаревшие результаты у нечистых функций.
- Для дешёвых вычислений мемоизация может только замедлить.`,
      en: `## 🧩 In plain words

Imagine someone asks "what's 17 × 23," you work it out and jot the answer on a sticky note. Next time they ask the same thing, you don't recompute — you just read the note. **Memoization** is exactly that sticky note for a function: the result is stored by its arguments, and a repeated call with the same arguments returns the ready answer instantly.

### The idea

Memoization caches a **pure function's** result by its arguments. A pure function is one that, given the same inputs, always returns the same output and has no side effects (it changes nothing outside itself). That's exactly why memoization works only for **deterministic, side-effect-free functions** — otherwise the sticky note would lie.

### The cache key — the subtlest part

The cache is a dictionary \`key → result\`. The core question: how do you turn arguments into that key?
- **\`JSON.stringify(args)\`** — simple and universal, but costly in time and breaks on cycles, functions, and different key orders in objects.
- **A custom \`resolver\`** — your own function that builds the key the way you need (e.g., by an object's \`id\`). Flexible and fast.
- **A \`WeakMap\`** — if there's a single object argument: no memory leaks, the garbage collector clears the entry itself once the object is no longer needed.

\`\`\`ts
// Lookup/insert: O(1), Space: O(k unique keys)
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
}
\`\`\`

Breakdown:
- \`resolver\` by default joins arguments via \`JSON.stringify\`, but you can replace it with your own — that's the "configurable key."
- If the key is already in \`cache\`, we return the stored value right away without calling \`fn\`.
- Otherwise we compute, store it in the cache, and return.
- \`clear()\` lets you manually reset the cache (e.g., when the data is stale).

### Complexity

- **Lookup/insert:** \`O(1)\` when using a \`Map\`.
- **Space:** \`O(k)\`, where \`k\` is the number of unique keys accumulated in the cache.

## ⚠️ Common pitfalls

- **Memory growth.** An unbounded cache accumulates all keys. If arguments are endlessly different, that's effectively a leak. Fix: bound the size (LRU — evict least-recently-used) or use a \`WeakMap\`.
- **Stale results.** If the function secretly depends on external mutable state, the cache returns the old answer. Only memoize pure functions.
- **Wrong key.** A too-coarse \`resolver\` may collapse distinct arguments into one key → wrong result.
- **Overhead.** For cheap functions, a trip to the cache can be slower than just recomputing.

### In the Angular context

Signals and \`computed\` provide memoization out of the box — they recompute a value only when its dependencies change. Pipes should be \`pure\` so Angular doesn't run them needlessly. A manual \`memoize\` is useful for heavy pure computations outside the reactive context.

## 🎯 Key takeaways

- Memoization = "compute once, remember, then serve from the cache." Only for pure functions.
- It all hinges on building the key: \`JSON.stringify\`, a custom \`resolver\`, or a \`WeakMap\` for an object argument.
- The main risks: memory growth (needs LRU/\`WeakMap\`) and stale results from impure functions.
- For cheap computations, memoization may only slow things down.`,
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
      ru: `## 🧩 Простыми словами

Представь автомат по продаже кофе, которому нужно три вещи: тип напитка, размер и количество сахара. Обычно ты вводишь всё сразу. **Каррирование (currying)** — это когда автомат позволяет вводить данные по частям: сначала выбрал «капучино», потом «большой», потом «два сахара» — и только когда собраны все три, автомат делает кофе. Так функцию \`f(a, b, c)\` можно вызывать не всю сразу, а по кусочкам.

### Что такое каррирование

Каррирование превращает функцию \`f(a, b, c)\` в цепочку, которую можно вызывать частично. Все эти варианты эквивалентны и дают один результат:
- \`f(a)(b)(c)\`
- \`f(a, b)(c)\`
- \`f(a)(b, c)\`

Функция реально выполняется в тот момент, когда накоплено **достаточно аргументов**. «Достаточно» определяется по \`fn.length\` — это встроенное свойство, показывающее, сколько именованных параметров объявлено у функции (её **арность**).

### Зачем это нужно

- **Частичное применение (partial application):** зафиксировать первые аргументы и получить специализированную функцию. Например, \`const add5 = add(5)\` — теперь \`add5(10)\` даёт \`15\`.
- **Композиция:** удобно строить пайплайны (\`pipe\`/\`compose\`) из унарных функций (принимающих один аргумент).
- **Переиспользование конфигурации** без создания классов — просто фиксируешь часть параметров.

### Ключевые моменты реализации

- Опираемся на **\`fn.length\`** (арность), чтобы решить, хватает ли уже аргументов.
- Если хватает — вызываем \`fn\`; если нет — возвращаем новую функцию, которая накопит остаток аргументов и снова себя проверит.
- Сохраняем \`this\` через \`apply\`, чтобы каррированная функция вела себя как оригинал в контексте объекта.

\`\`\`ts
// Каждый вызов O(1) + копирование аргументов, Память: O(n) накопленных аргументов
function curry<T extends (...args: any[]) => any>(fn: T) {
  return function curried(this: unknown, ...args: any[]): any {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return (...rest: any[]) => curried.apply(this, [...args, ...rest]);
  };
}

// Использование:
const sum = (a: number, b: number, c: number) => a + b + c;
const c = curry(sum);
// c(1)(2)(3) === 6
// c(1, 2)(3) === 6
// c(1)(2, 3) === 6
\`\`\`

Как это работает:
- Внутренняя функция \`curried\` смотрит, сколько аргументов уже собрано (\`args.length\`).
- Если их не меньше, чем нужно функции (\`fn.length\`), — вызываем оригинал с накопленными аргументами.
- Иначе возвращаем стрелочную функцию, которая принимает следующую порцию (\`rest\`), склеивает её с уже собранными (\`[...args, ...rest]\`) и снова зовёт \`curried\`. Так цепочка накапливается, пока аргументов не станет достаточно.

### Сложность

- Каждый шаг — \`O(1)\` плюс конкатенация массива аргументов.
- Память — \`O(n)\` на накопленные аргументы.

## ⚠️ Подводные камни

- **Rest-параметры и значения по умолчанию ломают всё.** У функции с \`...rest\` или \`= значением\` \`fn.length\` не отражает реальную арность, и каррирование не поймёт, когда пора вызывать.
- **Не подходит для функций с переменным числом аргументов** (variadic) по той же причине.
- **Не переусердствуй.** Глубокое каррирование ухудшает читаемость стека вызовов и усложняет отладку. В реальном коде чаще берут \`bind\` или простые стрелочные обёртки.

## 🎯 Запомни

- Каррирование = вызывать функцию по частям; она срабатывает, когда собрано аргументов не меньше \`fn.length\`.
- Главный механизм — сравнение \`args.length\` с арностью \`fn.length\` и рекурсивное накопление.
- Даёт частичное применение и удобную композицию.
- Не работает с rest-параметрами, дефолтами и variadic-функциями; злоупотребление вредит отладке.`,
      en: `## 🧩 In plain words

Imagine a coffee machine that needs three things: the drink type, the size, and the amount of sugar. Normally you enter everything at once. **Currying** is when the machine lets you enter data in pieces: first "cappuccino," then "large," then "two sugars" — and only once all three are gathered does the machine make the coffee. So a function \`f(a, b, c)\` can be called not all at once, but bit by bit.

### What currying is

Currying turns a function \`f(a, b, c)\` into a chain that can be called partially. All of these are equivalent and produce the same result:
- \`f(a)(b)(c)\`
- \`f(a, b)(c)\`
- \`f(a)(b, c)\`

The function actually runs the moment **enough arguments** are accumulated. "Enough" is determined by \`fn.length\` — a built-in property showing how many named parameters a function declares (its **arity**).

### Why it's useful

- **Partial application:** fix the first arguments and get a specialized function. For example, \`const add5 = add(5)\` — now \`add5(10)\` gives \`15\`.
- **Composition:** convenient for building \`pipe\`/\`compose\` pipelines out of unary functions (ones that take a single argument).
- **Reuse of configuration** without creating classes — you just fix some of the parameters.

### Key implementation points

- Rely on **\`fn.length\`** (arity) to decide whether there are enough arguments yet.
- If there are enough, call \`fn\`; if not, return a new function that will accumulate the remaining arguments and check itself again.
- Preserve \`this\` via \`apply\`, so the curried function behaves like the original in an object's context.

\`\`\`ts
// Each call O(1) + arg copy, Space: O(n) accumulated args
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
// c(1)(2, 3) === 6
\`\`\`

How it works:
- The inner \`curried\` function checks how many arguments have been gathered (\`args.length\`).
- If that's at least what the function needs (\`fn.length\`), we call the original with the accumulated arguments.
- Otherwise we return an arrow function that takes the next batch (\`rest\`), merges it with the ones already gathered (\`[...args, ...rest]\`), and calls \`curried\` again. That's how the chain accumulates until there are enough arguments.

### Complexity

- Each step is \`O(1)\` plus concatenation of the arguments array.
- Space is \`O(n)\` for the accumulated arguments.

## ⚠️ Common pitfalls

- **Rest params and default values break everything.** For a function with \`...rest\` or \`= value\`, \`fn.length\` doesn't reflect the real arity, and currying won't know when to invoke.
- **Not suitable for variadic functions** (variable argument count) for the same reason.
- **Don't overdo it.** Deep currying worsens call-stack readability and complicates debugging. Real code more often uses \`bind\` or plain arrow wrappers.

## 🎯 Key takeaways

- Currying = calling a function in pieces; it fires once at least \`fn.length\` arguments are gathered.
- The core mechanism is comparing \`args.length\` to the arity \`fn.length\` and accumulating recursively.
- It enables partial application and convenient composition.
- It doesn't work with rest params, defaults, or variadic functions; overuse hurts debugging.`,
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
      ru: `## 🧩 Простыми словами

Представь радиостанцию. Ведущий что-то говорит «в эфир» (эмитит событие), а слушатели, настроенные на эту волну, слышат сообщение и реагируют. Ведущий не знает, кто именно сейчас слушает, а слушатели не знают друг о друге — они связаны только «названием волны». \`EventEmitter\` — это как раз такая радиостанция внутри кода: одни части приложения «кричат» о событиях, другие — подписываются и реагируют.

### Что это за паттерн

\`EventEmitter\` — реализация паттерна **Observer** (он же **PubSub**, publisher/subscriber). Суть: **издатель** эмитит именованные события, а **подписчики** реагируют на них, ничего не зная друг о друге. Это называется **слабая связанность** (loose coupling) — части системы не держат прямых ссылок друг на друга, а общаются через посредника. Благодаря этому их легко менять и тестировать по отдельности.

### Где это применяется

- Node.js — встроенный класс \`EventEmitter\`, на нём построена половина платформы (стримы, серверы).
- DOM-события в браузере (\`addEventListener\`) — тот же принцип.
- Шина событий (event bus) между модулями или микрофронтендами (MFE), когда им нужно общаться, не импортируя друг друга напрямую.
- В Angular \`@Output()\` — это \`EventEmitter\` поверх RxJS \`Subject\`: так дочерний компонент сообщает родителю о событиях.

### Ключевые операции

- **\`on(event, handler)\`** — подписаться на событие. Удобно сразу вернуть функцию-отписку, чтобы потом легко отменить подписку.
- **\`off(event, handler)\`** — отписаться. Важно для предотвращения утечек памяти.
- **\`once(event, handler)\`** — подписка на один раз: обработчик срабатывает и тут же снимается. Реализуется через обёртку, которая внутри себя вызывает \`off\`.
- **\`emit(event, payload)\`** — синхронно вызвать всех подписчиков этого события, передав им данные (payload).

### Как это выглядит в коде

\`\`\`ts
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
    // копируем список, чтобы разрешить его изменение во время итерации
    for (const handler of [...(this.listeners.get(event) ?? [])]) {
      try { handler(payload); } catch (e) { console.error(e); }
    }
  }
}
\`\`\`

Что здесь происходит по шагам: обработчики хранятся в \`Map\`, где ключ — имя события, а значение — \`Set\` обработчиков (Set сам отбрасывает дубликаты). \`on\` добавляет обработчик и возвращает готовую функцию-отписку. \`once\` оборачивает обработчик так, что тот сначала снимает себя, а потом вызывает исходный. \`emit\` перебирает копию списка и вызывает каждый обработчик в \`try/catch\`.

### Про типобезопасность

Обрати внимание на generic \`Events extends Record<string, any>\` — это карта «имя события → тип его payload». Благодаря ей TypeScript на этапе компиляции проверяет, что вы эмитите правильный тип данных для нужного события, а обработчик получает именно тот тип, который ожидает. Это и есть «типобезопасный» EventEmitter.

### Сложность

- \`on\` / \`emit\`: \`O(k)\`, где \`k\` — число подписчиков конкретного события.
- Память: \`O(n)\` — по общему числу подписок.

## ⚠️ Подводные камни

- **Утечки памяти:** забыли вызвать \`off\` — обработчик и всё его замыкание (closure, захваченные переменные) остаются в памяти навсегда. Это главная беда ручных эмиттеров. Возврат функции-отписки из \`on\` сильно снижает риск.
- **Ошибки в обработчиках:** исключение в одном обработчике не должно ронять остальных — поэтому каждый вызов оборачиваем в \`try/catch\`.
- **Мутация списка во время \`emit\`:** если обработчик подписывается/отписывается прямо во время рассылки, итерация может сломаться. Решение — итерировать по копии массива подписчиков.

## 🎯 Запомни

- \`EventEmitter\` = паттерн Observer/PubSub: слабая связанность через именованные события.
- Четыре операции: \`on\` (подписка), \`off\` (отписка), \`once\` (разовая), \`emit\` (рассылка).
- Всегда давай способ отписаться — иначе утечки памяти.
- Generic-карта «событие → payload» даёт проверку типов на компиляции.`,
      en: `## 🧩 In plain words

Picture a radio station. The host says something "on air" (emits an event), and listeners tuned to that frequency hear it and react. The host doesn't know exactly who is listening right now, and the listeners don't know about each other — they're connected only by the "name of the frequency." An \`EventEmitter\` is exactly this kind of radio station inside your code: some parts of the app "shout" about events, and others subscribe and react.

### What pattern is this

\`EventEmitter\` implements the **Observer** pattern (also called **PubSub**, publisher/subscriber). The idea: a **publisher** emits named events, and **subscribers** react to them without knowing about each other. This is called **loose coupling** — parts of the system don't hold direct references to each other; they talk through a middleman. That makes them easy to change and test in isolation.

### Where it's used

- Node.js — the built-in \`EventEmitter\` class; half the platform is built on it (streams, servers).
- DOM events in the browser (\`addEventListener\`) follow the same principle.
- An event bus between modules or micro-frontends (MFEs), when they need to talk without importing each other directly.
- In Angular, \`@Output()\` is an \`EventEmitter\` over an RxJS \`Subject\`: this is how a child component tells its parent about events.

### Key operations

- **\`on(event, handler)\`** — subscribe to an event. It's handy to return an unsubscribe function right away, so you can easily cancel later.
- **\`off(event, handler)\`** — unsubscribe. Important for preventing memory leaks.
- **\`once(event, handler)\`** — subscribe for a single call: the handler fires once and immediately removes itself. Implemented via a wrapper that calls \`off\` inside itself.
- **\`emit(event, payload)\`** — synchronously call all subscribers of this event, passing them the data (payload).

### What it looks like in code

\`\`\`ts
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
    // copy the list to allow mutation during iteration
    for (const handler of [...(this.listeners.get(event) ?? [])]) {
      try { handler(payload); } catch (e) { console.error(e); }
    }
  }
}
\`\`\`

Step by step: handlers live in a \`Map\` where the key is the event name and the value is a \`Set\` of handlers (a Set drops duplicates on its own). \`on\` adds a handler and returns a ready-made unsubscribe function. \`once\` wraps the handler so it first removes itself, then calls the original. \`emit\` iterates over a copy of the list and calls each handler inside a \`try/catch\`.

### About type safety

Notice the generic \`Events extends Record<string, any>\` — it's a map of "event name → payload type." Thanks to it, TypeScript checks at compile time that you emit the right data type for a given event, and that the handler receives exactly the type it expects. That's what makes this a "type-safe" EventEmitter.

### Complexity

- \`on\` / \`emit\`: \`O(k)\`, where \`k\` is the number of subscribers to a specific event.
- Space: \`O(n)\` — the total number of subscriptions.

## ⚠️ Common pitfalls

- **Memory leaks:** forget to call \`off\` and the handler plus its entire closure (captured variables) stays in memory forever. This is the main problem of manual emitters. Returning an unsubscribe function from \`on\` greatly reduces the risk.
- **Errors in handlers:** an exception in one handler shouldn't crash the rest — so wrap each call in \`try/catch\`.
- **Mutating the list during \`emit\`:** if a handler subscribes/unsubscribes mid-broadcast, iteration can break. The fix is to iterate over a copy of the subscriber array.

## 🎯 Key takeaways

- \`EventEmitter\` = the Observer/PubSub pattern: loose coupling through named events.
- Four operations: \`on\` (subscribe), \`off\` (unsubscribe), \`once\` (one-time), \`emit\` (broadcast).
- Always give a way to unsubscribe — otherwise you get memory leaks.
- A generic "event → payload" map gives compile-time type checking.`,
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
      ru: `## 🧩 Простыми словами

Представь маленькую полку, на которую влезает только 5 книг. Приходит шестая — надо что-то убрать. Логично убрать ту книгу, которую ты дольше всех не открывал: раз она не нужна давно, вряд ли понадобится сейчас. Это и есть **LRU-кэш** (Least Recently Used — «наименее недавно использованный»): хранилище ограниченного размера, которое при переполнении выкидывает самый «залежавшийся» элемент.

### Задача

LRU-кэш хранит до \`capacity\` элементов. Когда места не хватает, он **вытесняет наименее недавно использованный** элемент. Хитрость в требовании: и \`get\` (взять по ключу), и \`put\` (положить) должны работать за \`O(1)\` — то есть за постоянное время, не зависящее от размера кэша.

### Классическая структура данных

Каноническое решение — **двусвязный список + хеш-таблица (hash map)**:

- Хеш-таблица: \`ключ → узел\`, чтобы находить элемент за \`O(1)\`.
- Двусвязный список хранит **порядок использования**: голова — самый свежий элемент, хвост — кандидат на вытеснение. Двусвязный (у каждого узла ссылки и вперёд, и назад) нужен, чтобы вырезать узел из середины и переставить его в голову за \`O(1)\`.

При каждом обращении элемент перемещается в голову; когда переполнение — удаляем хвост.

### Трюк с JS \`Map\`

В JavaScript у \`Map\` есть суперспособность: он **сохраняет порядок вставки ключей**. Это позволяет сделать LRU гораздо компактнее, без ручного списка:

- При \`get\`: удаляем ключ и тут же вставляем заново — он «переезжает» в конец и становится самым свежим.
- При переполнении: удаляем \`map.keys().next().value\` — это первый ключ, то есть самый старый.

Получается \`O(1)\` амортизированно и заметно проще двусвязного списка.

### Как это выглядит в коде

\`\`\`ts
class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private capacity: number) {}

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    this.map.delete(key);     // удаляем...
    this.map.set(key, value); // ...и вставляем заново => самый свежий
    return value;
  }

  put(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.capacity) {
      const oldest = this.map.keys().next().value as K; // самый старый
      this.map.delete(oldest);
    }
    this.map.set(key, value);
  }
}
\`\`\`

Разбор: \`get\` при попадании удаляет и заново вставляет ключ, поднимая его в «свежие». \`put\` — если ключ уже есть, удаляет его (чтобы потом вставить в конец); если места нет, удаляет самый первый (старый) ключ; и только затем кладёт новое значение.

### Сложность

- \`get\` / \`put\`: \`O(1)\`.
- Память: \`O(capacity)\`.

### Применение во фронтенде

- Кэш результатов API или изображений с ограничением по памяти.
- **Мемоизация с границей** — вместо безграничного кэша, который растёт бесконечно и течёт.
- Кэш вычисленных значений в дашбордах, кэш загруженных роутов или чанков (частей бандла).

## ⚠️ Подводные камни

- Кэш **без ограничения размера = утечка памяти**: он растёт бесконечно. LRU решает это детерминированно — размер всегда ограничен.
- **TTL — это не то же самое, что LRU.** LRU вытесняет по факту использования, но ничего не знает о «протухании» данных. Если важна свежесть (данные устаревают со временем), нужен ещё и TTL (time-to-live).
- **Конкурентный доступ** из Web Worker или нескольких потоков требует синхронизации — иначе гонки за общий кэш.

## 🎯 Запомни

- LRU выкидывает элемент, к которому дольше всего не обращались, при переполнении.
- Цель — \`O(1)\` на \`get\` и \`put\`: классика это список + hash map, но в JS хватает одного \`Map\` благодаря порядку вставки.
- LRU ограничивает память; для свежести данных добавляй отдельный TTL.`,
      en: `## 🧩 In plain words

Picture a small shelf that fits only 5 books. A sixth one arrives — you have to remove something. It makes sense to remove the book you haven't opened in the longest time: if you haven't needed it for ages, you probably won't need it now. That's an **LRU cache** (Least Recently Used): a fixed-size store that, when full, throws out the most "stale" item.

### The task

An LRU cache holds up to \`capacity\` items. When there's no room, it **evicts the least recently used** item. The catch is the requirement: both \`get\` (fetch by key) and \`put\` (store) must run in \`O(1)\` — constant time, independent of the cache size.

### The classic data structure

The canonical solution is a **doubly linked list + hash map**:

- Hash map: \`key → node\`, so you can find an item in \`O(1)\`.
- The doubly linked list stores the **usage order**: head = most recent item, tail = eviction candidate. It's doubly linked (each node points both forward and back) so you can cut a node out of the middle and move it to the head in \`O(1)\`.

On each access the item moves to the head; on overflow you delete the tail.

### The JS \`Map\` trick

In JavaScript, \`Map\` has a superpower: it **preserves key insertion order**. This lets you build an LRU far more compactly, without a manual list:

- On \`get\`: delete the key and immediately re-insert it — it "moves" to the end and becomes the most recent.
- On overflow: delete \`map.keys().next().value\` — that's the first key, i.e. the oldest.

The result is \`O(1)\` amortized and noticeably simpler than a linked list.

### What it looks like in code

\`\`\`ts
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
}
\`\`\`

Breakdown: on a hit, \`get\` deletes and re-inserts the key, promoting it to "most recent." \`put\` — if the key already exists, it deletes it (to re-insert at the end); if there's no room, it deletes the very first (oldest) key; and only then stores the new value.

### Complexity

- \`get\` / \`put\`: \`O(1)\`.
- Space: \`O(capacity)\`.

### Frontend use

- Caching API results or images with a memory bound.
- **Bounded memoization** — instead of an unbounded cache that grows forever and leaks.
- Caching computed values in dashboards, caching loaded routes or chunks (bundle parts).

## ⚠️ Common pitfalls

- A cache **without a size bound = a memory leak**: it grows forever. LRU solves this deterministically — the size is always capped.
- **TTL is not the same as LRU.** LRU evicts based on usage, but knows nothing about data going "stale." If freshness matters (data expires over time), you also need a TTL (time-to-live).
- **Concurrent access** from a Web Worker or multiple threads needs synchronization — otherwise you get races over the shared cache.

## 🎯 Key takeaways

- LRU evicts the item that hasn't been touched for the longest time when full.
- The goal is \`O(1)\` for \`get\` and \`put\`: the classic is a list + hash map, but in JS a single \`Map\` suffices thanks to insertion order.
- LRU bounds memory; for data freshness add a separate TTL.`,
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
      ru: `## 🧩 Простыми словами

Представь кассу в супермаркете. Если пустить 1000 покупателей одновременно к одной кассе — будет хаос. Логичнее открыть, скажем, 5 касс и пропускать людей по мере освобождения: как только один расплатился, следующий из очереди подходит. **Promise pool** делает ровно это с асинхронными задачами: держит одновременно не больше \`limit\` «в работе», а остальные ждут своей очереди.

### Проблема

\`Promise.all(tasks)\` запускает **все** промисы разом. Если задач тысячи (например, 1000 HTTP-запросов), это:

- перегружает сервер — он отвечает ошибками rate limit (429 Too Many Requests);
- упирается в лимит браузера на одновременные соединения к одному домену;
- исчерпывает память и системные дескрипторы.

Решение — **ограничитель конкурентности** (concurrency limiter): выполнять одновременно не больше \`limit\` задач, остальные держать в очереди.

### Идея реализации

- Держим \`limit\` «слотов»-воркеров. Запускаем первые \`limit\` задач.
- Как только один воркер освободился — берёт следующую задачу из очереди (через общий указатель на следующий индекс).
- Складываем результаты **по индексу задачи**, чтобы сохранить исходный порядок независимо от того, кто когда финишировал.

### Как это выглядит в коде

\`\`\`ts
async function promisePool<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const current = nextIndex++;      // застолбить индекс задачи
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
\`\`\`

Разбор: \`tasks\` — это массив **функций**, возвращающих промис (не сами промисы! иначе они бы уже запустились). Мы создаём \`limit\` воркеров. Каждый воркер в цикле хватает следующий свободный индекс через \`nextIndex++\` и ждёт выполнения этой задачи. Пока есть задачи — воркеры разбирают их. \`Promise.all(workers)\` ждёт, пока все воркеры опустошат очередь.

### Сложность

- Время: \`O(n)\` задач, но их одновременность ограничена величиной \`limit\`.
- Память: \`O(n)\` под массив результатов.

### Применение во фронтенде

- Массовая загрузка файлов или изображений батчами.
- Префетч множества ресурсов без «штурма» сети.
- Параллельная обработка данных с контролем нагрузки на API.

## ⚠️ Подводные камни

- **Обработка ошибок:** реши заранее — fail-fast (первая же ошибка отменяет всё, как \`Promise.all\`) или собрать все результаты (как \`Promise.allSettled\`). Часто нужен второй вариант, чтобы одна упавшая задача не обнулила всю работу.
- **Сохранение порядка:** результаты нужно раскладывать по индексу, а не по порядку завершения — иначе перемешаются.
- **Backpressure (обратное давление):** если источник задач бесконечный (стрим), очередь надо ограничивать, иначе она разрастётся в памяти.
- **Готовые решения:** \`p-limit\`, \`p-map\` уже всё это решают и протестированы — в production лучше брать их, а не писать своё.

## 🎯 Запомни

- Promise pool = «запускать не больше \`limit\` задач одновременно», остальные в очередь.
- Нужен, чтобы не штурмовать сервер/сеть и не ловить 429 и падения памяти.
- Складывай результаты по индексу и заранее реши стратегию ошибок (fail-fast vs allSettled).
- В production используй \`p-limit\` / \`p-map\`.`,
      en: `## 🧩 In plain words

Picture a supermarket checkout. Letting 1000 shoppers rush a single register at once is chaos. It's smarter to open, say, 5 registers and let people through as spots free up: as soon as one pays, the next in line steps up. A **promise pool** does exactly this with async tasks: it keeps at most \`limit\` "in progress" at a time, and the rest wait their turn.

### The problem

\`Promise.all(tasks)\` starts **all** the promises at once. With thousands of tasks (e.g., 1000 HTTP requests) this:

- overloads the server — it responds with rate-limit errors (429 Too Many Requests);
- hits the browser's limit on concurrent connections to one domain;
- exhausts memory and system handles.

The fix is a **concurrency limiter**: run at most \`limit\` tasks at a time and keep the rest queued.

### Implementation idea

- Keep \`limit\` "slot" workers. Launch the first \`limit\` tasks.
- As soon as a worker frees up — it grabs the next task from the queue (via a shared pointer to the next index).
- Store results **by task index**, to preserve the original order regardless of who finished when.

### What it looks like in code

\`\`\`ts
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
}
\`\`\`

Breakdown: \`tasks\` is an array of **functions** that return a promise (not the promises themselves! otherwise they'd already be running). We create \`limit\` workers. Each worker loops, grabbing the next free index via \`nextIndex++\` and awaiting that task. As long as tasks remain, the workers pick them off. \`Promise.all(workers)\` waits until all workers have drained the queue.

### Complexity

- Time: \`O(n)\` tasks, but their concurrency is capped at \`limit\`.
- Space: \`O(n)\` for the results array.

### Frontend use

- Bulk uploading files or images in batches.
- Prefetching many resources without flooding the network.
- Parallel data processing with controlled API load.

## ⚠️ Common pitfalls

- **Error handling:** decide up front — fail-fast (the first error cancels everything, like \`Promise.all\`) or collect all results (like \`Promise.allSettled\`). Often the latter is wanted so one failed task doesn't wipe out all the work.
- **Preserving order:** place results by index, not by completion order — otherwise they get shuffled.
- **Backpressure:** if the task source is infinite (a stream), the queue must be bounded, or it'll balloon in memory.
- **Off-the-shelf solutions:** \`p-limit\`, \`p-map\` already handle all this and are battle-tested — prefer them in production over rolling your own.

## 🎯 Key takeaways

- A promise pool = "run at most \`limit\` tasks at once," rest queued.
- Needed so you don't hammer the server/network and hit 429s or memory crashes.
- Store results by index and decide the error strategy up front (fail-fast vs allSettled).
- In production, use \`p-limit\` / \`p-map\`.`,
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
      ru: `## 🧩 Простыми словами

Ты звонишь другу, а он не берёт трубку. Разумно ли набирать снова и снова каждую секунду? Нет — ты подождёшь чуть-чуть, потом подольше, потом ещё дольше. Это **экспоненциальный backoff**: с каждой неудачей пауза растёт. А чтобы тысячи людей, у которых связь пропала одновременно, не перезванивали синхронно в одну и ту же секунду, каждый добавляет случайную задержку — это **jitter** (дрожание).

### Задача

\`retry\` повторяет асинхронную операцию при сбое до \`maxRetries\` раз. **Экспоненциальный backoff** увеличивает паузу с каждой попыткой по формуле \`base * 2^attempt\` (1с, 2с, 4с, 8с…). **Jitter** добавляет случайность к этой паузе, чтобы множество клиентов не ретраили строго одновременно.

### Зачем backoff и jitter

- **Backoff** даёт перегруженному сервису время восстановиться, вместо того чтобы бить по нему сразу же снова.
- **Jitter** предотвращает **thundering herd** («стадо, ломящееся в дверь»): без случайности все клиенты, упавшие в один и тот же момент, ретраят одновременно и снова роняют только-только вставший сервис. Разброс во времени размазывает нагрузку.

### Как это выглядит в коде

\`\`\`ts
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
}
\`\`\`

Разбор: пробуем выполнить \`fn\`. Если удалось — сразу возвращаем результат. Если упало — проверяем два условия выхода: закончились попытки (\`attempt >= retries\`) или ошибка не подлежит повтору (\`shouldRetry(err)\` вернул \`false\`) — тогда пробрасываем ошибку. Иначе считаем задержку: экспоненциальная \`baseDelay * factor ** attempt\`, ограниченная сверху через \`maxDelay\` (чтобы паузы не росли бесконечно). \`Math.random() * expo\` — это «full jitter», полностью случайная задержка в диапазоне \`[0, expo]\`. Ждём и увеличиваем счётчик попыток.

### Сложность

- Время: до \`O(maxRetries)\` попыток. Память: \`O(1)\`.

### Когда retry ОПАСЕН

- **Не-идемпотентные операции.** Идемпотентная операция — та, что при повторе даёт тот же результат. Retry \`POST /payment\` может **списать деньги дважды**. Безопасно ретраить только идемпотентное: \`GET\`, \`PUT\`, или \`POST\` с idempotency-key (сервер по этому ключу распознаёт дубль).
- **Ошибки 4xx (кроме 429 и 408).** \`400/401/403/404\` не исправятся повтором — запрос как был неверным, так и останется. Это лишь лишняя нагрузка. Ретраить осмысленно только сетевые сбои и \`5xx\`/\`429\`.
- **Retry storm / каскад.** При системном сбое массовые ретраи усиливают перегрузку. Нужен **circuit breaker** («предохранитель»): после серии ошибок он временно вообще перестаёт пропускать запросы, давая сервису прийти в себя.
- **Без верхней границы** ретраи превращаются в бесконечный цикл.

## ⚠️ Подводные камни

- Не ретрай вслепую: различай retryable (сеть, 5xx, 429) и non-retryable (4xx, бизнес-ошибки) ситуации.
- Ограничивай **общее время** через \`AbortController\`/timeout, а не только число попыток — иначе даже 3 ретрая с backoff могут растянуться надолго.
- Комбинируй с circuit breaker на уровне сервиса.
- В RxJS это \`retry({ count, delay })\` или \`retryWhen\` с \`timer\` и jitter.

## 🎯 Запомни

- Backoff = растущая пауза между попытками; jitter = случайность, чтобы клиенты не ретраили хором.
- Ретрай только идемпотентное и только временные ошибки (сеть, 5xx, 429).
- Всегда ставь верхнюю границу попыток/времени и комбинируй с circuit breaker.`,
      en: `## 🧩 In plain words

You call a friend and they don't pick up. Is it smart to redial every single second? No — you wait a bit, then longer, then longer still. That's **exponential backoff**: each failure makes the pause grow. And so that thousands of people who all lost signal at once don't redial in the exact same second, each adds a random delay — that's **jitter**.

### The task

\`retry\` repeats an async operation on failure up to \`maxRetries\` times. **Exponential backoff** grows the pause each attempt with the formula \`base * 2^attempt\` (1s, 2s, 4s, 8s…). **Jitter** adds randomness to that pause so many clients don't retry in perfect lockstep.

### Why backoff and jitter

- **Backoff** gives an overloaded service time to recover, instead of hammering it again immediately.
- **Jitter** prevents a **thundering herd**: without randomness, all clients that failed at the same moment retry simultaneously and crash the just-recovered service again. Spreading them out in time smooths the load.

### What it looks like in code

\`\`\`ts
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
}
\`\`\`

Breakdown: we try to run \`fn\`. On success, return the result immediately. On failure, check two exit conditions: attempts exhausted (\`attempt >= retries\`) or the error isn't retryable (\`shouldRetry(err)\` returned \`false\`) — then rethrow. Otherwise compute the delay: exponential \`baseDelay * factor ** attempt\`, capped from above by \`maxDelay\` (so pauses don't grow forever). \`Math.random() * expo\` is "full jitter" — a fully random delay in the range \`[0, expo]\`. We wait and increment the attempt counter.

### Complexity

- Time: up to \`O(maxRetries)\` attempts. Space: \`O(1)\`.

### When retry is DANGEROUS

- **Non-idempotent operations.** An idempotent operation gives the same result when repeated. Retrying \`POST /payment\` can **charge twice**. Only retry idempotent things safely: \`GET\`, \`PUT\`, or \`POST\` with an idempotency key (the server uses that key to spot a duplicate).
- **4xx errors (except 429 and 408).** \`400/401/403/404\` won't fix on retry — a bad request stays bad. It's just extra load. Only network failures and \`5xx\`/\`429\` are worth retrying.
- **Retry storm / cascade.** During a systemic failure, mass retries amplify the overload. You need a **circuit breaker**: after a streak of errors it temporarily stops passing requests through at all, giving the service room to recover.
- **No upper bound** turns retries into an infinite loop.

## ⚠️ Common pitfalls

- Don't retry blindly: distinguish retryable (network, 5xx, 429) from non-retryable (4xx, business errors) situations.
- Cap the **total time** with \`AbortController\`/timeout, not just the attempt count — otherwise even 3 retries with backoff can drag on.
- Combine with a service-level circuit breaker.
- In RxJS this is \`retry({ count, delay })\` or \`retryWhen\` with \`timer\` and jitter.

## 🎯 Key takeaways

- Backoff = a growing pause between attempts; jitter = randomness so clients don't retry in unison.
- Only retry idempotent operations and only transient errors (network, 5xx, 429).
- Always set an upper bound on attempts/time and combine with a circuit breaker.`,
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
      ru: `## 🧩 Простыми словами

Представь матрёшку: коробка внутри коробки внутри коробки. Массив тоже может быть вложенным: \`[1, [2, [3]]]\`. **Flatten** (от англ. flat — «плоский») — это когда мы вынимаем все матрёшки наружу и выкладываем их в один ряд: \`[1, 2, 3]\`. Иногда мы говорим «раскрывай только на N уровней вглубь» — за это отвечает параметр глубины.

### Что именно требуется

Задача: превратить \`[1, [2, [3, [4]]]]\` в плоский массив. Параметр \`depth\` (глубина) ограничивает, насколько глубоко мы разворачиваем. Ровно так же работает встроенный метод \`Array.prototype.flat(depth)\` — например \`flat(1)\` раскроет только один уровень.

### Рекурсивное решение

**Рекурсия** — это когда функция вызывает сама себя для более мелкой части задачи. Идея простая: идём по элементам массива. Если элемент — сам массив и глубину ещё не исчерпали (\`depth > 0\`), разворачиваем его тем же способом, но с уменьшенной глубиной (\`depth - 1\`). Если это обычное значение — кладём его в результат как есть.

\`\`\`ts
// Рекурсивно: время O(n), память O(n) + O(d) стек вызовов
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
\`\`\`

Здесь \`Array.isArray(item)\` проверяет, массив ли элемент, а \`...\` (spread) «высыпает» элементы вложенного результата в родительский массив.

### Сложность

- Время: \`O(n)\`, где n — общее число элементов, считая вложенные. Каждый элемент трогаем один раз.
- Память: \`O(n)\` под результат плюс \`O(d)\` на стек рекурсии, где d — глубина вложенности.

### Проблема очень глубоких массивов

**Стек вызовов (call stack)** — это внутренний список «кто кого вызвал». У него есть предел. Если массив вложен на тысячи уровней, рекурсия наделает тысячи вложенных вызовов и стек **переполнится** (ошибка «Maximum call stack size exceeded»).

Чтобы этого избежать, используем **итеративный** подход: заводим свой массив-стек и работаем через цикл \`while\`, вообще не углубляясь в рекурсию. Свой стек живёт в обычной памяти (куче), а она гораздо просторнее call stack.

\`\`\`ts
// Итеративный глубокий flatten — без переполнения стека. Время O(n), память O(n)
function flattenDeep<T>(arr: any[]): T[] {
  const stack = [...arr];
  const result: T[] = [];
  while (stack.length) {
    const next = stack.pop();
    if (Array.isArray(next)) stack.push(...next);
    else result.push(next);
  }
  return result.reverse(); // восстановить исходный порядок (push+reverse быстрее unshift)
}
\`\`\`

Как это работает: берём элемент с конца (\`pop\`). Если это массив — «высыпаем» его обратно в стек. Если значение — кладём в результат. Поскольку мы берём с конца, порядок в итоге перевернётся, поэтому в конце делаем \`reverse()\`. Можно было бы вместо этого класть в начало через \`unshift\`, но \`unshift\` каждый раз сдвигает весь массив и стоит \`O(n)\` — поэтому \`push\` + один финальный \`reverse\` быстрее.

## ⚠️ Подводные камни

- Рекурсивный вариант красив, но на очень глубоких структурах падает с переполнением стека — для «бесконечной» глубины берите итеративный.
- \`reduce\` + \`concat\` выглядит элегантно, но \`concat\` каждый раз создаёт новый промежуточный массив — в худшем случае это \`O(n²)\`.
- Не забывайте про пустые массивы и не-массивы внутри: код выше их корректно кладёт как обычные значения.

## 🎯 Запомни

- Нативный \`arr.flat(depth)\` или \`arr.flat(Infinity)\` — обычно лучший выбор; ручная реализация нужна для собеседования или старого окружения.
- Рекурсия проста и читаема, но ограничена глубиной call stack.
- Для произвольно глубоких массивов используй итерацию через собственный стек — переполнения не будет.`,
      en: `## 🧩 In plain words

Picture a nesting doll: a box inside a box inside a box. An array can be nested too: \`[1, [2, [3]]]\`. **Flatten** means pulling all the dolls out and laying them in a single row: \`[1, 2, 3]\`. Sometimes we say "only unwrap N levels deep" — that's what the depth parameter controls.

### What's actually asked

The task: turn \`[1, [2, [3, [4]]]]\` into a flat array. The \`depth\` parameter limits how deep we unwrap. This mirrors the built-in \`Array.prototype.flat(depth)\` — for example \`flat(1)\` unwraps only one level.

### Recursive solution

**Recursion** is when a function calls itself on a smaller piece of the problem. The idea is simple: walk the elements. If an element is itself an array and we still have depth left (\`depth > 0\`), unwrap it the same way but with reduced depth (\`depth - 1\`). If it's a plain value, push it into the result as-is.

\`\`\`ts
// Recursive: Time O(n), Space O(n) + O(d) call stack
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
\`\`\`

Here \`Array.isArray(item)\` checks whether the element is an array, and \`...\` (spread) pours the elements of the nested result into the parent array.

### Complexity

- Time: \`O(n)\`, where n is the total number of elements including nested ones. Each element is touched once.
- Space: \`O(n)\` for the result plus \`O(d)\` for the recursion stack, where d is the nesting depth.

### The deep-array problem

The **call stack** is an internal list of "who called whom." It has a limit. If an array is nested thousands of levels deep, recursion makes thousands of nested calls and the stack **overflows** ("Maximum call stack size exceeded").

To avoid that, use an **iterative** approach: keep your own array-stack and work through a \`while\` loop, never recursing at all. Your own stack lives in ordinary memory (the heap), which is far roomier than the call stack.

\`\`\`ts
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
}
\`\`\`

How it works: take an element off the end (\`pop\`). If it's an array, pour it back into the stack. If it's a value, push it to the result. Because we take from the end, the order ends up reversed, so we \`reverse()\` at the end. We could instead prepend with \`unshift\`, but \`unshift\` shifts the whole array every time and costs \`O(n)\` — so \`push\` + one final \`reverse\` is faster.

## ⚠️ Common pitfalls

- The recursive version is elegant but blows up with a stack overflow on very deep structures — for "infinite" depth use the iterative one.
- \`reduce\` + \`concat\` looks elegant, but \`concat\` builds a new intermediate array each time — \`O(n²)\` in the worst case.
- Don't forget empty arrays and non-array values inside: the code above correctly pushes them as plain values.

## 🎯 Key takeaways

- Native \`arr.flat(depth)\` or \`arr.flat(Infinity)\` is usually the best choice; the manual version is for interviews or legacy environments.
- Recursion is simple and readable but bounded by the call-stack depth.
- For arbitrarily deep arrays, iterate with your own stack — no overflow.`,
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
      ru: `## 🧩 Простыми словами

Представь корзину фруктов и коробки с ярлыками «яблоки», «бананы», «груши». \`groupBy\` — это когда ты раскладываешь фрукты по коробкам по какому-то признаку. «Признак» задаёшь ты сам через функцию: например, «группируй по первой букве» или «по цвету». На выходе — коробки, где ключ это название группы, а значение — список того, что в неё попало.

### Что делает groupBy

\`groupBy\` разбивает массив на группы по ключу, который вычисляется из каждого элемента специальной функцией \`keyFn\`. Результат — объект (или \`Map\`) вида \`ключ → массив элементов\`.

### Реализация

Делаем один проход методом \`reduce\` (сворачивает массив в одно значение — здесь в объект-аккумулятор). Для каждого элемента считаем ключ и кладём элемент в нужную «коробку». Если коробки ещё нет — создаём пустой массив при первом появлении ключа.

\`\`\`ts
// Время: O(n), Память: O(n)
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
\`\`\`

Тут \`acc[key] ??= []\` означает «если под этим ключом ничего нет — положи туда пустой массив», а затем в него делаем \`push\`. \`??=\` — это присвоение только если значение \`null\`/\`undefined\`.

### Сложность

- Время: \`O(n)\` — один проход по массиву.
- Память: \`O(n)\` — храним все элементы в группах.

### Map или объект

- **Объект** — удобно и привычно, но ключи всегда приводятся к строке. Поэтому объектные ключи теряются, а число и строка схлопываются: \`1\` и \`'1'\` попадут в одну группу.
- **\`Map\`** — сохраняет исходный тип ключа (число остаётся числом, объект — объектом) и не конфликтует со служебными именами прототипа вроде \`__proto__\` или \`constructor\`. Для нетривиальных ключей предпочтительнее.

\`\`\`ts
// Версия с Map — сохраняет тип ключа, избегает коллизий с прототипом
function groupByMap<T, K>(items: readonly T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}
\`\`\`

### Типизация в TypeScript

\`\`\`ts
function groupBy<T, K extends PropertyKey>(
  items: T[], keyFn: (item: T) => K
): Record<K, T[]>
\`\`\`

- \`T\` — тип элементов массива, \`K\` — тип ключа.
- \`K extends PropertyKey\` ограничивает ключ типами \`string | number | symbol\` — именно тем, что можно использовать как ключ объекта.
- \`Record<K, T[]>\` — это «объект, где ключи типа K, а значения массивы T» — точно отражает форму результата.
- В \`Map\`-версии ограничение \`PropertyKey\` не нужно: \`Map<K, T[]>\` умеет ключи любого типа.

## ⚠️ Подводные камни

- В объектной версии \`1\` и \`'1'\` попадут в одну группу — если ключи разного типа важны, берите \`Map\`.
- Не мутируйте входной массив — \`groupBy\` должен быть чистой функцией (только читает вход, не меняет его).
- Служебные ключи (\`__proto__\`) в объекте могут вести себя странно; \`Map\` от этого свободен.

## 🎯 Запомни

- В современных рантаймах есть встроенные \`Object.groupBy\` / \`Map.groupBy\` — предпочитайте их.
- Один проход \`reduce\` или \`for\` даёт \`O(n)\`; порядок элементов внутри группы сохраняется (важно для UI).
- Нужны нестроковые или объектные ключи — используй \`Map\`, а не обычный объект.`,
      en: `## 🧩 In plain words

Picture a basket of fruit and boxes labeled "apples," "bananas," "pears." \`groupBy\` is when you sort the fruit into boxes by some trait. You choose the trait via a function: "group by first letter," say, or "by color." The output is boxes where the key is the group's name and the value is the list of things that landed in it.

### What groupBy does

\`groupBy\` splits an array into groups by a key computed from each element by a \`keyFn\` function. The result is an object (or \`Map\`) shaped \`key → array of elements\`.

### Implementation

Do a single pass with \`reduce\` (which folds an array into one value — here an accumulator object). For each element, compute the key and drop the element into the right "box." If the box doesn't exist yet, create an empty array on the key's first appearance.

\`\`\`ts
// Time: O(n), Space: O(n)
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
\`\`\`

Here \`acc[key] ??= []\` means "if there's nothing under this key, put an empty array there," and then we \`push\` into it. \`??=\` assigns only when the value is \`null\`/\`undefined\`.

### Complexity

- Time: \`O(n)\` — one pass over the array.
- Space: \`O(n)\` — we store every element across the groups.

### Map vs object

- **Object** — convenient and familiar, but keys are always coerced to strings. So object keys are lost, and a number and a string collapse: \`1\` and \`'1'\` land in the same group.
- **\`Map\`** — preserves the original key type (a number stays a number, an object stays an object) and never collides with special prototype names like \`__proto__\` or \`constructor\`. Preferable for non-trivial keys.

\`\`\`ts
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
}
\`\`\`

### Typing in TypeScript

\`\`\`ts
function groupBy<T, K extends PropertyKey>(
  items: T[], keyFn: (item: T) => K
): Record<K, T[]>
\`\`\`

- \`T\` is the element type, \`K\` is the key type.
- \`K extends PropertyKey\` constrains the key to \`string | number | symbol\` — exactly what can be used as an object key.
- \`Record<K, T[]>\` means "an object whose keys are of type K and values are arrays of T" — it precisely reflects the result shape.
- The \`Map\` version needs no \`PropertyKey\` constraint: \`Map<K, T[]>\` accepts keys of any type.

## ⚠️ Common pitfalls

- In the object version \`1\` and \`'1'\` land in the same group — if key types matter, use a \`Map\`.
- Don't mutate the input array — \`groupBy\` should be a pure function (it reads the input, never changes it).
- Special keys (\`__proto__\`) can behave oddly on a plain object; \`Map\` is free of that.

## 🎯 Key takeaways

- Modern runtimes have built-in \`Object.groupBy\` / \`Map.groupBy\` — prefer them.
- A single \`reduce\` or \`for\` pass gives \`O(n)\`; element order within a group is preserved (important for UI).
- Need non-string or object keys? Use a \`Map\`, not a plain object.`,
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
      ru: `## 🧩 Простыми словами

\`===\` в JavaScript для объектов проверяет только **ссылку** — то есть «это буквально одна и та же коробка в памяти?». Два разных объекта с одинаковым содержимым он посчитает разными. **Deep equality** (глубокое равенство) отвечает на другой вопрос: «а если заглянуть внутрь и сравнить всё содержимое рекурсивно — они одинаковые?». Это как сравнивать не «тот же самый лист бумаги», а «на обоих листах написано одно и то же».

### Что требуется

Написать структурное сравнение: два значения равны, если рекурсивно совпадает их содержимое, а не ссылки. Нужно корректно обработать примитивы, \`NaN\`, \`Date\`, \`RegExp\`, массивы, \`Map\`, \`Set\` и обычные объекты.

### Тонкие случаи, о которых легко забыть

- **\`NaN\`:** в JS \`NaN === NaN\` даёт \`false\` (странность стандарта), но при глубоком сравнении мы хотим считать \`NaN\` равным \`NaN\`. Спасает \`Object.is\`, который для \`NaN\` возвращает \`true\`. Используем его для примитивов.
- **\`+0\` и \`-0\`:** \`Object.is(+0, -0)\` даёт \`false\`. Решите сами, важна ли для вашей задачи разница между «плюс ноль» и «минус ноль».
- **\`Date\`:** сравнивать по \`getTime()\` — числу миллисекунд, а не по ссылке.
- **\`Map\` / \`Set\`:** сравнивать размер и содержимое, не обращая внимания на порядок вставки.
- **Разные конструкторы/прототипы:** равны ли \`{}\` и \`Object.create(null)\`? Зависит от того, насколько строгое сравнение вам нужно.

### Реализация

\`\`\`ts
// Время: O(n), Память: O(d) на рекурсию
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true; // покрывает NaN, примитивы, одну и ту же ссылку
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
}
\`\`\`

Разберём по шагам. Сначала \`Object.is(a, b)\` — быстрая проверка: одинаковые примитивы, \`NaN\`, или буквально одна ссылка. Дальше отсеиваем случай, когда хотя бы одно значение не объект (или \`null\`) — тогда они не равны. Проверяем, что у них один конструктор (нельзя равнять массив и обычный объект). Потом — специальные типы: \`Date\` по времени, \`RegExp\` по строковому виду, \`Map\`/\`Set\` по размеру и содержимому, массив поэлементно. В самом конце — обычные объекты: берём все ключи через \`Reflect.ownKeys\` (включая символы), сверяем их число и рекурсивно сравниваем значения.

### Сложность

- Время: \`O(n)\` по числу узлов (мы проходим каждый элемент структуры один раз).
- Память: \`O(d)\` на стек рекурсии, где d — глубина вложенности.

### Циклические ссылки

Если объект ссылается сам на себя (\`a.self = a\`), наивная рекурсия зациклится навсегда. Для production нужен \`WeakMap\` или набор уже посещённых пар, чтобы вовремя остановиться. В базовой версии выше это опущено ради ясности — но в реальном коде добавьте.

### Где это применять

Глубокое сравнение уместно для тестовых проверок (assert, что результат равен ожидаемому), инвалидации кэша и дедупликации. А вот в «горячем пути» — например, при обнаружении изменений (change detection) в UI-фреймворках — оно слишком дорого: \`O(n)\` на каждый цикл. Там лучше дешёвая **поверхностная** проверка или **иммутабельность + сравнение ссылок** (если объект не менялся, ссылка та же, и сравнение мгновенно).

## ⚠️ Подводные камни

- Забыть про \`NaN\`: обычный \`===\` его сломает — используйте \`Object.is\` для примитивов.
- Забыть про циклические ссылки — будет бесконечная рекурсия.
- Использовать глубокое равенство в change detection — убьёте производительность.
- \`Date\` и \`RegExp\` без спецобработки сравнятся как пустые объекты \`{}\` и дадут ложное «равны».

## 🎯 Запомни

- \`===\` сравнивает ссылки; deep equality сравнивает содержимое рекурсивно.
- \`Object.is\` для примитивов решает проблему \`NaN\`; спецтипы (\`Date\`, \`RegExp\`, \`Map\`, \`Set\`) нужно обрабатывать отдельно.
- Глубокое сравнение дорого — на горячем пути предпочитай иммутабельность и сравнение ссылок. Готовые решения: lodash \`isEqual\`, \`fast-deep-equal\`.`,
      en: `## 🧩 In plain words

In JavaScript, \`===\` on objects only checks the **reference** — "is this literally the same box in memory?" Two different objects with identical contents count as unequal. **Deep equality** answers a different question: "if we look inside and compare all the contents recursively, are they the same?" It's like comparing not "the very same sheet of paper" but "both sheets have the same thing written on them."

### What's required

Write a structural comparison: two values are equal if their contents match recursively, not their references. You must correctly handle primitives, \`NaN\`, \`Date\`, \`RegExp\`, arrays, \`Map\`, \`Set\`, and plain objects.

### Subtle cases that are easy to forget

- **\`NaN\`:** in JS, \`NaN === NaN\` is \`false\` (a spec quirk), but for deep equality we want \`NaN\` to equal \`NaN\`. \`Object.is\` saves us — it returns \`true\` for \`NaN\`. Use it for primitives.
- **\`+0\` and \`-0\`:** \`Object.is(+0, -0)\` is \`false\`. Decide whether the difference between "plus zero" and "minus zero" matters for your domain.
- **\`Date\`:** compare by \`getTime()\` — the millisecond number, not the reference.
- **\`Map\` / \`Set\`:** compare size and contents regardless of insertion order.
- **Different constructors/prototypes:** are \`{}\` and \`Object.create(null)\` equal? Depends on how strict you want to be.

### Implementation

\`\`\`ts
// Time: O(n), Space: O(d) recursion
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
}
\`\`\`

Step by step. First \`Object.is(a, b)\` — a fast check: identical primitives, \`NaN\`, or literally the same reference. Next we rule out the case where at least one value isn't an object (or is \`null\`) — then they're unequal. We check they share a constructor (you can't equate an array and a plain object). Then the special types: \`Date\` by time, \`RegExp\` by its string form, \`Map\`/\`Set\` by size and contents, arrays element by element. Finally, plain objects: grab all keys via \`Reflect.ownKeys\` (including symbols), compare their count, and recursively compare the values.

### Complexity

- Time: \`O(n)\` in the number of nodes (we visit each element of the structure once).
- Space: \`O(d)\` for the recursion stack, where d is the nesting depth.

### Cyclic references

If an object references itself (\`a.self = a\`), naive recursion loops forever. For production you need a \`WeakMap\` or a visited-pair set to stop in time. The base version above omits this for clarity — but add it in real code.

### Where to use it

Deep comparison fits test assertions (asserting a result equals the expected one), cache invalidation, and deduplication. But on a "hot path" — for example, change detection in UI frameworks — it's too costly: \`O(n)\` every cycle. There, prefer a cheap **shallow** check or **immutability + reference comparison** (if the object hasn't changed, the reference is the same, and the comparison is instant).

## ⚠️ Common pitfalls

- Forgetting \`NaN\`: plain \`===\` breaks it — use \`Object.is\` for primitives.
- Forgetting cyclic references — infinite recursion results.
- Using deep equality in change detection — it kills performance.
- Without special handling, \`Date\` and \`RegExp\` compare as empty objects \`{}\` and give a false "equal."

## 🎯 Key takeaways

- \`===\` compares references; deep equality compares contents recursively.
- \`Object.is\` for primitives solves the \`NaN\` problem; special types (\`Date\`, \`RegExp\`, \`Map\`, \`Set\`) need their own handling.
- Deep comparison is expensive — on a hot path prefer immutability and reference comparison. Off-the-shelf: lodash \`isEqual\`, \`fast-deep-equal\`.`,
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
      ru: `## 🧩 Простыми словами

Представь, что ты отправил трёх курьеров с заданиями и ждёшь их дома. \`Promise.all\` — это строгий начальник: как только ОДИН курьер провалился, он всё бросает и объявляет провал, даже если двое других справились. \`Promise.allSettled\` — это терпеливый начальник: он дожидается ВСЕХ курьеров и записывает по каждому «справился» или «провалился», не паникуя. **Промис (Promise)** — это объект-обещание: «результат будет позже», он либо выполнится (fulfilled), либо отклонится (rejected).

### Смысловое различие

- **\`Promise.all\`** работает по принципу **fail-fast** («падаем при первой же ошибке»): он резолвится массивом результатов, когда выполнятся ВСЕ промисы; но реджектится (отклоняется) сразу при ПЕРВОМ отклонении, и остальные результаты теряются. Используй, когда нужно «всё или ничего».
- **\`Promise.allSettled\`** **ждёт все** промисы независимо от исхода; сам он никогда не реджектится; возвращает массив объектов \`{ status: 'fulfilled', value }\` или \`{ status: 'rejected', reason }\`. Используй, когда важны итоги всех операций даже при частичных сбоях — например, отправка N независимых запросов.

### Полифилы (реализация)

**Полифил** — это ручная реализация встроенной возможности, чтобы понять, как она устроена (или чтобы работало в старом окружении).

\`\`\`ts
// Оба: Время O(n) на постановку + параллельное ожидание, Память O(n)
function promiseAll<T>(items: Array<T | Promise<T>>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = new Array(items.length);
    let completed = 0;
    if (items.length === 0) return resolve(results);
    items.forEach((item, i) => {
      Promise.resolve(item).then(
        value => {
          results[i] = value;             // сохраняем порядок по индексу
          if (++completed === items.length) resolve(results);
        },
        err => reject(err),               // fail-fast при первом отклонении
      );
    });
  });
}
\`\`\`

Ключевая идея: результат каждого промиса кладём в \`results[i]\` — **по его индексу**, а не по порядку завершения. Ведём счётчик \`completed\`; когда он достиг длины массива — резолвим внешний промис. При первой же ошибке зовём \`reject\`.

\`\`\`ts
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
}
\`\`\`

Здесь разница в том, что и успех, и ошибка просто записываются в \`results[i]\` как объект со \`status\`, а счётчик увеличиваем в \`finally\` (он срабатывает в любом случае). Внешний промис только резолвится — никогда не реджектится.

### Ключевые детали

- **Сохранение порядка:** результаты кладутся по индексу, а не в порядке завершения. Быстрый промис не «перепрыгнёт» медленный в итоговом массиве.
- **Счётчик завершённых:** резолвим, когда \`completed\` достиг длины. Нельзя полагаться на \`results.length\`.
- **Пустой массив:** \`Promise.all([])\` немедленно резолвится пустым \`[]\` — обработать этот граничный случай отдельно.
- **Не-промисы:** оборачиваем каждый элемент в \`Promise.resolve(item)\`, потому что во входе могут быть обычные значения, а не только промисы.

### Сложность

- Время: \`O(n)\` на постановку задач плюс параллельное ожидание.
- Память: \`O(n)\` под массив результатов.

## ⚠️ Подводные камни

- Не считай завершённость через \`results.length\`: разреженный массив («с дырами») даёт неверную длину. Веди отдельный счётчик.
- \`Promise.all\` при реджекте НЕ отменяет уже запущенные промисы — они продолжают выполняться (промисы в принципе не отменяемы). Для настоящей отмены нужен \`AbortController\`.
- \`allSettled\` незаменим в дашбордах: одна упавшая панель не должна ронять остальные.

## 🎯 Запомни

- \`Promise.all\` — «всё или ничего», падает при первой ошибке; \`allSettled\` — дожидается всех и никогда не реджектится.
- Результаты всегда по индексу; используй локальный счётчик и обрабатывай пустой массив.
- Реджект \`all\` не останавливает уже запущенные операции — для отмены бери \`AbortController\`.`,
      en: `## 🧩 In plain words

Imagine you sent three couriers on errands and are waiting at home. \`Promise.all\` is a strict boss: the moment ONE courier fails, it drops everything and declares failure, even if the other two succeeded. \`Promise.allSettled\` is a patient boss: it waits for ALL couriers and records "succeeded" or "failed" for each, without panicking. A **Promise** is a promise-object: "the result comes later" — it either fulfills or rejects.

### Semantic difference

- **\`Promise.all\`** works **fail-fast** ("fail at the first error"): it resolves with an array of results when ALL promises complete; but it rejects immediately on the FIRST rejection, and the other results are discarded. Use it for "all or nothing."
- **\`Promise.allSettled\`** **waits for all** promises regardless of outcome; it never rejects; it returns an array of \`{ status: 'fulfilled', value }\` or \`{ status: 'rejected', reason }\`. Use it when the outcomes of all operations matter even with partial failures — e.g., sending N independent requests.

### Polyfills (implementation)

A **polyfill** is a hand-written implementation of a built-in feature, to understand how it works (or to make it run in a legacy environment).

\`\`\`ts
// Both: Time O(n) schedule + parallel wait, Space O(n)
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
\`\`\`

The key idea: each promise's result goes into \`results[i]\` — **by its index**, not by completion order. We keep a \`completed\` counter; when it reaches the array length, we resolve the outer promise. On the first error we call \`reject\`.

\`\`\`ts
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
}
\`\`\`

The difference here: both success and error are simply written into \`results[i]\` as an object with a \`status\`, and the counter is incremented in \`finally\` (which runs either way). The outer promise only ever resolves — it never rejects.

### Key details

- **Order preservation:** results are placed by index, not by completion order. A fast promise won't "jump ahead" of a slow one in the final array.
- **Completed counter:** resolve when \`completed\` reaches the length. Don't rely on \`results.length\`.
- **Empty array:** \`Promise.all([])\` resolves immediately with \`[]\` — handle this edge case separately.
- **Non-promises:** wrap each item in \`Promise.resolve(item)\`, because the input may contain plain values, not only promises.

### Complexity

- Time: \`O(n)\` to schedule the tasks plus parallel waiting.
- Space: \`O(n)\` for the results array.

## ⚠️ Common pitfalls

- Don't gauge completion via \`results.length\`: a sparse array ("with holes") reports a misleading length. Keep a separate counter.
- On rejection, \`Promise.all\` does NOT cancel the already-started promises — they keep running (promises aren't cancelable at all). For real cancellation use \`AbortController\`.
- \`allSettled\` is indispensable in dashboards: one failed panel shouldn't take down the others.

## 🎯 Key takeaways

- \`Promise.all\` is "all or nothing," failing on the first error; \`allSettled\` waits for all and never rejects.
- Results always go by index; use a local counter and handle the empty array.
- A rejection in \`all\` doesn't stop already-started operations — use \`AbortController\` for cancellation.`,
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
