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
      ru: `## Коротко

В Nx код делится на **apps — тонкие «витрины», которые только склеивают фичи, и libs — где живёт весь настоящий код**. Каждой библиотеке вешают ярлыки-теги, а ESLint-правило \`@nx/enforce-module-boundaries\` следит, чтобы никто не импортировал то, что ему не положено.

Аналогия: большой офис. \`apps\` — это ресепшн: красивый, но там ничего не производят. \`libs\` — отделы. Теги — пропуска: бухгалтерия не ходит в серверную. Охранник (ESLint) проверяет пропуск **на входе**, то есть до merge, а не когда человек уже всё сломал внутри.

## Как это работает по шагам

1. Всю логику выносим в **libs**, в \`apps\` оставляем роутинг и склейку. Чем тоньше app, тем точнее работают \`affected\` и кэш.
2. Каждой библиотеке в \`project.json\` проставляем теги по двум осям.
3. Ось **\`type\`** — что это за код: \`feature\` (умные компоненты, привязанные к роуту и стейту), \`ui\` (презентационные переиспользуемые компоненты), \`data-access\` (сервисы, стейт, HTTP), \`util\` (чистые функции без Angular).
4. Ось **\`scope\`** — чей это домен: \`scope:orders\`, \`scope:billing\`, \`scope:shared\`.
5. В конфиге ESLint описываем, кому от кого можно зависеть. Направление строго сверху вниз: \`feature\` → \`ui\`/\`data-access\`/\`util\`. **Обратно нельзя**: \`util\` не имеет права импортировать \`feature\`.
6. Домены не лезут друг в друга напрямую: \`scope:orders\` не импортирует \`scope:billing\`, только через \`scope:shared\`.
7. Нарушил — красный lint в CI, PR не вмёрджится.

## Пример

\`\`\`json
{ "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:ui","type:data-access","type:util"] }
\`\`\`

Почему так: правило работает **не на именах папок, а на тегах**, поэтому переезд библиотеки между директориями ничего не ломает. И проверка идёт в lint, а не в рантайме — архитектура защищена автоматом, а не устной договорённостью на ревью.

## Что сказать на собеседовании

> В Nx apps — это тонкие деплой-оболочки, вся реальная логика лежит в libs; чем больше кода в libs, тем точнее работают \`affected\` и кэш. Библиотеки размечаются тегами по двум осям: \`type\` (feature, ui, data-access, util) и \`scope\` — домен (orders, billing, shared). ESLint-правило \`@nx/enforce-module-boundaries\` читает эти теги из \`project.json\` и блокирует импорты против правил: feature может зависеть от ui, data-access и util, но не наоборот, а один домен не тянет другой напрямую — только через shared. Проверка идёт на lint/CI, поэтому архитектурная деградация ловится до merge. Без этого монорепо быстро превращается в big ball of mud: циклы, обратные зависимости, невозможность тестировать библиотеку изолированно. Нюанс: на маленьком проекте из одной-двух команд дробная сетка тегов даёт только трение — начинаю с грубого деления и уточняю по мере роста.

## Ловушки

- **Теги без правил бесполезны.** Проставили \`type:ui\`, но не описали \`depConstraints\` — enforcement не работает вообще.
- **Всё в apps.** Логика в приложении не попадает в граф как отдельный проект, поэтому \`affected\` пересобирает всё подряд.
- **Библиотека без тегов** по умолчанию может не подпадать под ограничения — заведите правило-заглушку для тега \`*\`.
- **Обход через относительные пути.** \`../../other-lib/src/internal\` иногда проходит мимо правила; закрывайте это \`allow\`-списком и запретом глубоких импортов мимо \`index.ts\`.
- **Спросят следом:** как разрывать циклы (вынести общее в \`util\`/\`shared\`), и почему \`util\` не должен зависеть от Angular (чтобы его можно было тестировать без TestBed).
- **Слишком мелкое дробление:** сотни микробиблиотек замедляют graph и лишают команду скорости — гранулярность должна соответствовать размеру команд.`,
      en: `## In short

Nx splits the repo into **apps — thin shop windows that only wire features together — and libs, where all the real code lives**. Every library gets tags, and the ESLint rule \`@nx/enforce-module-boundaries\` makes sure nobody imports what they aren't allowed to.

Analogy: a big office. \`apps\` are the reception desk — nice looking, nothing is produced there. \`libs\` are the departments. Tags are badges: accounting doesn't walk into the server room. The guard (ESLint) checks the badge **at the door**, i.e. before merge, not after someone already broke things inside.

## How it works, step by step

1. Push all logic into **libs**, leave routing and wiring in \`apps\`. The thinner the app, the sharper \`affected\` and caching get.
2. Tag every library in \`project.json\` along two axes.
3. The **\`type\`** axis — what kind of code it is: \`feature\` (smart components bound to routing and state), \`ui\` (presentational reusable components), \`data-access\` (services, state, HTTP), \`util\` (pure functions with no Angular dependency).
4. The **\`scope\`** axis — which domain owns it: \`scope:orders\`, \`scope:billing\`, \`scope:shared\`.
5. In the ESLint config you declare who may depend on whom. The direction is strictly downward: \`feature\` → \`ui\`/\`data-access\`/\`util\`. **Never the reverse**: \`util\` must not import \`feature\`.
6. Domains don't reach into each other: \`scope:orders\` cannot import \`scope:billing\` directly, only via \`scope:shared\`.
7. Break a rule and lint goes red in CI — the PR simply doesn't merge.

## Example

\`\`\`json
{ "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:ui","type:data-access","type:util"] }
\`\`\`

Why this works: the rule keys off **tags, not folder names**, so moving a library between directories breaks nothing. And it runs at lint time, not runtime — the architecture is defended by automation instead of a verbal agreement in code review.

## What to say in the interview

> In Nx, apps are thin deployable shells; all real logic lives in libs, and the more code sits in libs the better \`affected\` and caching work. Libraries are tagged along two axes: \`type\` (feature, ui, data-access, util) and \`scope\`, the domain (orders, billing, shared). The ESLint rule \`@nx/enforce-module-boundaries\` reads those tags from \`project.json\` and blocks illegal imports: feature may depend on ui, data-access and util but never the reverse, and one domain can't pull another directly — only through shared. It runs at lint/CI time, so architectural decay is caught before merge. Without it a monorepo turns into a big ball of mud: cycles, inverted dependencies, libraries you can't test in isolation. The nuance: on a small project with one or two teams a fine-grained tag grid is pure friction — I start coarse and refine as the org grows.

## Gotchas

- **Tags without rules do nothing.** You set \`type:ui\` but never wrote \`depConstraints\` — enforcement is simply off.
- **Everything in the app.** Logic inside the application isn't a separate node in the graph, so \`affected\` rebuilds everything anyway.
- **Untagged libraries** may fall outside the constraints by default — add a catch-all rule for the \`*\` tag.
- **Escaping via relative paths.** \`../../other-lib/src/internal\` can slip past the rule; close it with the allow-list plus a ban on deep imports that bypass \`index.ts\`.
- **Follow-up questions:** how to break a cycle (extract the shared piece into \`util\`/\`shared\`), and why \`util\` must not depend on Angular (so it can be tested without TestBed).
- **Over-splitting:** hundreds of micro-libraries slow the graph down and kill velocity — granularity should match team size.`,
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
      ru: `## Коротко

Nx знает, **какой проект от какого зависит**, поэтому в CI гоняет тесты и сборку только для того, что реально затронул ваш коммит (\`affected\`). А результат каждой задачи он кладёт в кэш под «отпечатком пальца» из всех входных данных: совпал отпечаток — задачу вообще не запускаем, просто достаём готовый результат.

Аналогия: кухня ресторана. Поменяли рецепт соуса — переделываем только блюда с этим соусом, а не всё меню (\`affected\`). А если заказ в точности такой же, как полчаса назад, повар достаёт готовую порцию из холодильника вместо готовки заново (кэш). Опасность одна: если в рецепте не записан ингредиент, повар не заметит, что он изменился, и выдаст старое блюдо.

## Как это работает по шагам

1. Nx строит **project graph** — граф зависимостей между проектами, анализируя статические импорты плюс явно указанные \`implicitDependencies\` (для того, что импортами не выражается: конфиги, env-файлы).
2. \`nx affected\` берёт git-diff от базы (\`--base=origin/main\`) и находит изменённые проекты, а затем **транзитивно** — всех, кто от них зависит.
3. Задачи запускаются только для этого подмножества. На больших монорепо это превращает часы CI в минуты.
4. Перед запуском каждой задачи Nx считает **хэш всех входов**: исходники проекта и его зависимостей, версии пакетов, переменные окружения, флаги команды, версию самого Nx.
5. Хэш есть в локальном или удалённом кэше (Nx Cloud) → **cache hit**: задача не выполняется, из кэша восстанавливаются объявленные \`outputs\` и лог.
6. Хэша нет → задача выполняется, результат кладётся в кэш под этим хэшем.

## Пример

\`\`\`bash
nx affected -t lint test build --base=origin/main
\`\`\`

\`\`\`json
{ "namedInputs": { "production": ["default", "!{projectRoot}/**/*.spec.ts"] },
  "targetDefaults": { "build": { "inputs": ["production", "^production"], "outputs": ["{projectRoot}/dist"], "cache": true } } }
\`\`\`

Почему так: \`^production\` означает «и то же самое у моих зависимостей». Исключение спеков из входов build даёт больше cache hit — правка теста не должна инвалидировать сборку.

## Что сказать на собеседовании

> Nx строит граф зависимостей проектов из статических импортов и \`implicitDependencies\`. \`nx affected\` сравнивает ветку с базой, находит изменённые проекты и транзитивно всех зависящих, и гоняет задачи только для них — на большом монорепо это часы CI против минут. Поверх этого работает computation caching: Nx хэширует все входы задачи — исходники проекта и зависимостей, версии пакетов, env-переменные, флаги, версию Nx. Совпал хэш — задача не выполняется, из кэша достаются объявленные outputs, локально или из Nx Cloud. Главный подвох в том, что кэш надёжен ровно настолько, насколько честно описаны inputs и outputs: если задача читает необъявленный файл или env, вы получите устаревший результат, а если пишет вне outputs — при cache hit артефакт не восстановится. Поэтому я точно настраиваю \`namedInputs\` и даю PR-агентам только read-only доступ к remote-кэшу.

## Ловушки

- **Неучтённые входы.** Задача читает файл или env, которого нет в \`inputs\` → тихо отдаётся устаревший результат. Самый опасный класс багов: «на CI зелено, в проде сломано».
- **Недетерминированная сборка** (таймстемпы, случайные хэши, порядок файлов) — кэш формально работает, но результаты невоспроизводимы.
- **Side-effects вне \`outputs\`.** Кэш восстанавливает только объявленные пути; всё остальное после cache hit просто исчезнет.
- **Загрязнение remote-кэша:** сломанный агент записал плохой результат — теперь его получают все. Лечится read-only токенами для PR и write-доступом только с main.
- **\`affected\` слепа к неявным связям:** миграция БД, shared JSON, генератор кода — если не прописать \`implicitDependencies\`, зависимый проект не пересоберётся.
- **Спросят следом:** чем \`affected\` отличается от «прогнать всё» на релизной ветке (на релизе часто честно гоняют всё) и почему \`nx reset\` — первый шаг при странном поведении.`,
      en: `## In short

Nx knows **which project depends on which**, so CI only runs tests and builds for what your commit actually touched (\`affected\`). On top of that it stores every task result under a fingerprint of all its inputs: same fingerprint, no execution — just restore the finished result.

Analogy: a restaurant kitchen. Change the sauce recipe and you only remake the dishes that use that sauce, not the whole menu (\`affected\`). And if an order is identical to one from half an hour ago, the chef pulls the ready portion from the fridge instead of cooking again (the cache). One danger: if an ingredient isn't written down in the recipe, the chef won't notice it changed and will serve the stale dish.

## How it works, step by step

1. Nx builds a **project graph** — the dependency graph between projects — from static imports plus explicit \`implicitDependencies\` (for things imports can't express: configs, env files).
2. \`nx affected\` diffs your branch against a base (\`--base=origin/main\`), finds the changed projects, then walks the graph to find everyone that depends on them **transitively**.
3. Tasks run only for that subset. On a large monorepo this turns hours of CI into minutes.
4. Before running each task Nx computes a **hash of all inputs**: the project's sources and its dependencies' sources, package versions, environment variables, command flags, and the Nx version itself.
5. Hash found in the local or remote cache (Nx Cloud) → **cache hit**: the task never runs; the declared \`outputs\` and the log are restored instead.
6. Hash not found → the task runs and its result is stored under that hash.

## Example

\`\`\`bash
nx affected -t lint test build --base=origin/main
\`\`\`

\`\`\`json
{ "namedInputs": { "production": ["default", "!{projectRoot}/**/*.spec.ts"] },
  "targetDefaults": { "build": { "inputs": ["production", "^production"], "outputs": ["{projectRoot}/dist"], "cache": true } } }
\`\`\`

Why this works: \`^production\` means "and the same set from my dependencies". Excluding spec files from the build inputs buys you more cache hits — editing a test should never invalidate the build.

## What to say in the interview

> Nx builds a project dependency graph from static imports and \`implicitDependencies\`. \`nx affected\` diffs the branch against a base, finds changed projects plus everything transitively depending on them, and runs tasks only for those — hours of CI versus minutes on a big monorepo. On top sits computation caching: Nx hashes every input of a task — the project's and its dependencies' sources, package versions, env vars, flags, the Nx version. If the hash matches, the task is skipped and the declared outputs are restored from the local cache or Nx Cloud. The catch is that the cache is only as trustworthy as your declared inputs and outputs: a task reading an undeclared file or env var silently returns a stale result, and anything written outside \`outputs\` simply won't come back on a cache hit. So I configure \`namedInputs\` precisely and give PR agents read-only access to the remote cache.

## Gotchas

- **Undeclared inputs.** The task reads a file or env var missing from \`inputs\` → a stale result comes back silently. The nastiest bug class: green on CI, broken in production.
- **Non-deterministic builds** (timestamps, random hashes, file ordering) — the cache technically works, but results aren't reproducible.
- **Side effects outside \`outputs\`.** Only declared paths are restored; everything else vanishes after a cache hit.
- **Remote cache poisoning:** one misconfigured agent writes a bad result and now everyone gets it. Fix with read-only tokens for PRs and write access only from main.
- **\`affected\` is blind to implicit links:** DB migrations, shared JSON, code generators — without \`implicitDependencies\` the dependent project never rebuilds.
- **Follow-ups:** how \`affected\` differs from "run everything" on a release branch (releases often do run everything), and why \`nx reset\` is step one whenever behavior looks weird.`,
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
      ru: `## Коротко

Module Federation — это когда **одно приложение в рантайме подгружает куски кода из другого приложения**, собранного отдельно и другой командой. Тот, кто отдаёт код, называется **remote**, тот, кто подтягивает — **host**. Общие библиотеки (Angular, RxJS) объявляются как \`shared\`, чтобы не тащить их дважды.

Аналогия: торговый центр. Host — само здание с эскалаторами, remotes — магазины, каждый со своим ремонтом и своим графиком открытия. \`shared\` — это общая электросеть: подключаться к ней должны все, но если один магазин требует 220 В, а другой 110 В, — вот это и есть **version skew**, и кто-то сгорит.

## Как это работает по шагам

1. Remote в своём конфиге объявляет \`exposes\` — какие модули он отдаёт наружу.
2. Host объявляет \`remotes\` — откуда и что тянуть; загрузка происходит **в рантайме**, минуя общую сборку.
3. Отсюда главный приз — **независимый деплой**: команда выкатывает свой remote, host пересобирать не нужно.
4. Обе стороны в секции \`shared\` перечисляют общие библиотеки, чтобы Angular не грузился дважды.
5. В рантайме контейнер сверяет версии shared-зависимостей и решает, какую копию отдать всем.
6. Тут и возникает version skew: host на Angular 17, remote собран под Angular 16. Управляем тремя ручками — \`singleton\`, \`strictVersion\`, \`requiredVersion\`.

## Три ручки против version skew

- **\`singleton: true\`** — в рантайме живёт ровно одна копия (берётся наибольшая совместимая версия). Обязательно для всего, что держит глобальное состояние: Angular, RxJS, Zone.js. Риск: если версии реально несовместимы, ломается DI и зоны.
- **\`strictVersion: true\`** — при несовместимости бросается ошибка сразу (fail fast), а не тихая поломка через полчаса в проде.
- **\`requiredVersion\`** — сужает допустимый диапазон, чтобы «наибольшая совместимая» не оказалась чем-то диким.

Почему singleton не опция для Angular и RxJS: проверки \`instanceof\` (например, «это точно наш \`HttpErrorResponse\`?») и единственный \`Zone\` работают только при одной копии в памяти. Две копии RxJS дают операторы, которые «не видят» чужие Observable.

## Пример

\`\`\`js
shared: { '@angular/core': { singleton: true, strictVersion: true, requiredVersion: '^17.0.0' } }
\`\`\`

Почему так: \`singleton\` гарантирует одну копию DI и Zone, \`strictVersion\` превращает несовместимость в громкую ошибку на старте, а \`requiredVersion\` фиксирует контракт версии между командами.

## Что сказать на собеседовании

> Module Federation позволяет одному бандлу — remote — экспонировать модули, а другому — host — загружать их в рантайме, минуя общую сборку. Главная ценность в независимом деплое: каждая команда владеет своим remote и выкатывает его отдельно. Общие библиотеки объявляются в секции \`shared\`, чтобы Angular и RxJS не грузились дважды. Отсюда и проблема version skew: host на одной мажорной версии, remote на другой. Лечится тремя настройками: \`singleton: true\` — одна копия в рантайме, обязательна для всего с глобальным состоянием, потому что \`instanceof\` и единый Zone работают только при одной копии; \`strictVersion: true\` — падать сразу и громко вместо тихой поломки; \`requiredVersion\` — сузить диапазон. Плата за независимый деплой — runtime-связанность через shared и сложная отладка. Одной команде с общим релизным циклом MFE не нужны: монолитный SPA проще; MFE окупаются от трёх-четырёх автономных команд с разными частотами релизов.

## Ловушки

- **Отказ от singleton ради «изоляции»** приводит к двум копиям Zone.js/RxJS и багам, которые не воспроизводятся локально.
- **\`strictVersion: false\` по умолчанию тихо съедает** несовместимость — падает потом и в другом месте.
- **Версии живут отдельно от кода:** remote задеплоили с новым Angular, а host не знает — нужен runtime-контроль совместимости и стенд интеграции.
- **Отладка через два бандла**: source maps, разные версии одной библиотеки в стеке — заложите время.
- **Спросят следом:** чем MF отличается от single-spa (MF — шаринг кода на уровне сборки, single-spa — оркестрация жизненного цикла), и как откатить сломанный remote (версионированные URL ремоутов + фиче-флаг).
- **Не путайте с ленивой загрузкой:** \`loadChildren\` внутри одного приложения — это не микрофронтенд, там нет независимого деплоя.`,
      en: `## In short

Module Federation is when **one application loads chunks of code from another application at runtime**, built separately by a different team. The side handing code out is the **remote**, the side pulling it in is the **host**. Common libraries (Angular, RxJS) are declared as \`shared\` so they aren't downloaded twice.

Analogy: a shopping mall. The host is the building with the escalators; remotes are the shops, each with its own fit-out and its own opening schedule. \`shared\` is the mall's electrical grid: everyone must plug into it, but if one shop needs 220 V and another 110 V — that's **version skew**, and something is going to burn.

## How it works, step by step

1. The remote declares \`exposes\` in its config — which modules it hands out.
2. The host declares \`remotes\` — where to pull from; loading happens **at runtime**, bypassing any shared build.
3. That's the prize — **independent deployment**: a team ships its remote without rebuilding the host.
4. Both sides list common libraries under \`shared\` so Angular isn't loaded twice.
5. At runtime the container compares shared versions and decides which single copy everyone gets.
6. That's where version skew appears: host on Angular 17, remote built against Angular 16. You steer it with three knobs — \`singleton\`, \`strictVersion\`, \`requiredVersion\`.

## Three knobs against version skew

- **\`singleton: true\`** — exactly one copy lives at runtime (the highest compatible version wins). Mandatory for anything holding global state: Angular, RxJS, Zone.js. Risk: if the versions truly are incompatible, DI and zones break.
- **\`strictVersion: true\`** — throw immediately on incompatibility (fail fast) instead of failing silently half an hour later in production.
- **\`requiredVersion\`** — narrows the acceptable range so "highest compatible" doesn't resolve to something wild.

Why singleton isn't optional for Angular and RxJS: \`instanceof\` checks (e.g. "is this really our \`HttpErrorResponse\`?") and the single \`Zone\` only work with one copy in memory. Two copies of RxJS give you operators that don't recognise the other copy's Observables.

## Example

\`\`\`js
shared: { '@angular/core': { singleton: true, strictVersion: true, requiredVersion: '^17.0.0' } }
\`\`\`

Why this works: \`singleton\` guarantees one DI container and one Zone, \`strictVersion\` turns incompatibility into a loud startup error, and \`requiredVersion\` pins the version contract between teams.

## What to say in the interview

> Module Federation lets one bundle — the remote — expose modules while another — the host — loads them at runtime, bypassing a shared build. The value is independent deployment: each team owns and ships its own remote. Common libraries go under \`shared\` so Angular and RxJS aren't loaded twice, and that's exactly where version skew comes from — host on one major, remote on another. Three settings handle it: \`singleton: true\` gives one runtime copy and is mandatory for anything with global state, because \`instanceof\` checks and a single Zone only work with one copy; \`strictVersion: true\` fails fast and loudly instead of breaking subtly; \`requiredVersion\` narrows the range. The price of independent deploy is runtime coupling through \`shared\` and much harder debugging. A single team on one release cadence doesn't need MFEs — a monolithic SPA is simpler; they pay off from three or four autonomous teams shipping on different schedules.

## Gotchas

- **Dropping singleton "for isolation"** gives you two copies of Zone.js/RxJS and bugs that never reproduce locally.
- **\`strictVersion\` defaults to off**, so incompatibility is swallowed and surfaces later somewhere unrelated.
- **Versions travel separately from code:** a remote ships with a new Angular and the host has no idea — you need runtime compatibility checks and an integration environment.
- **Debugging spans two bundles**: source maps, two versions of the same library in one stack trace — budget time for it.
- **Follow-ups:** how MF differs from single-spa (MF shares code at build level, single-spa orchestrates lifecycles), and how you roll back a broken remote (versioned remote URLs plus a feature flag).
- **Don't confuse it with lazy loading:** \`loadChildren\` inside one app is not a micro-frontend — there's no independent deployment.`,
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
      ru: `## Коротко

Это **инструменты про разные вещи, а не конкуренты**. single-spa решает «кто сейчас на экране»: он включает и выключает микрофронтенды по URL. Module Federation решает «откуда взялся код»: он умеет шарить модули и библиотеки между отдельно собранными бандлами. Их часто ставят вместе.

Аналогия: концерт. single-spa — конферансье с расписанием: объявляет номер, выводит артиста на сцену и уводит его (\`bootstrap/mount/unmount\`). Module Federation — общий бэклайн: барабаны и усилители, которыми пользуются все группы, чтобы каждая не везла свои. Конферансье не заменяет усилитель, а усилитель не объявляет номера.

## Как это работает по шагам

1. **single-spa:** каждый MFE публикует три функции — \`bootstrap\`, \`mount\`, \`unmount\`.
2. Root-config регистрирует приложения и по текущему URL решает, кого смонтировать, а кого размонтировать.
3. Он **агностичен к сборщику и фреймворку** — можно смешивать React, Angular и Vue в одном экране.
4. **Module Federation:** remote объявляет \`exposes\`, host — \`remotes\`, общие библиотеки идут в \`shared\`. Это шаринг **на уровне сборки**, оркестрации там нет вообще.
5. Комбинация: single-spa маршрутизирует между MFE, MF даёт им общий Angular/RxJS вместо трёх копий.
6. **Сильные и слабые стороны.** single-spa: разнородные стеки и явный lifecycle — но много boilerplate и ручной шаринг зависимостей. MF: нативный шаринг и ленивая загрузка из коробки — но привязка к webpack/rspack и runtime-связанность через \`shared\`.
7. **Практический выбор:** однородный Angular-стек → чистый MF; зоопарк фреймворков или постепенная миграция с legacy → single-spa, при желании плюс MF для зависимостей.

## Изоляция: где реально течёт

MFE живут в **одном документе**, поэтому изоляция не бесплатна:

- **Стили:** Shadow DOM, CSS-модули или жёсткие префиксы — иначе глобальный CSS одной команды перекрасит чужие кнопки.
- **JS-глобалы:** не мусорить в \`window\`, у каждой команды свой namespace.
- **Состояние:** общение через события/\`CustomEvent\` или явный shared-store, а не через общие мутируемые объекты.
- **Падения:** error boundary вокруг каждого MFE, чтобы краш одного не ронял весь shell.
- **Zone/DI в Angular:** singleton-шаринг рантайма обязателен, иначе два DI и два Zone.

## Пример

\`\`\`ts
// single-spa: контракт микрофронтенда
export async function bootstrap() { /* один раз: подготовка */ }
export async function mount(props: { domElement: HTMLElement }) { /* отрисовать в свой контейнер */ }
export async function unmount() { /* убрать DOM, отписаться, снять таймеры */ }
\`\`\`

Почему так: \`unmount\` — самое важное место. Если MFE не снимает подписки, слушатели \`window\` и таймеры, каждое переключение роутов копит утечки, и через двадцать минут работы вкладка тормозит.

## Что сказать на собеседовании

> single-spa — это оркестратор жизненного цикла: каждый микрофронтенд регистрируется с \`bootstrap/mount/unmount\`, а root-config по URL решает, кто активен; он агностичен к сборщику и фреймворку, поэтому подходит для зоопарка стеков. Module Federation — не оркестрация, а шаринг кода на уровне сборки: remote экспонирует модули, host грузит их в рантайме, общие библиотеки идут в \`shared\`. Их часто комбинируют: single-spa маршрутизирует, MF шарит зависимости. Компромисс: single-spa даёт гетерогенность ценой boilerplate и ручного шаринга, MF — нативный шаринг ценой привязки к webpack и runtime-связанности. Изоляция при этом не бесплатна, потому что все живут в одном документе: стили через Shadow DOM или префиксы, никакого мусора в \`window\`, общение событиями, error boundary вокруг каждого MFE. Самый частый провал — скрытая глобальная связанность, когда один MFE патчит \`window.fetch\` или мутирует общий store; лечится контрактами и контрактными тестами на границах.

## Ловушки

- **Считать их альтернативами.** Это разные слои: оркестрация против шаринга кода. За такое цепляются сразу.
- **Забытый \`unmount\`** — утечки памяти и «призрачные» подписчики, которые продолжают дёргать API размонтированного MFE.
- **Глобальный CSS.** Reset или \`* { box-sizing }\` из одного MFE ломает вёрстку соседей; Shadow DOM защищает, но мешает глобальным темам и порталам/оверлеям.
- **Монки-патчинг \`window.fetch\`/\`history\`** ради своих нужд — классический источник «у соседей всё сломалось после нашего релиза».
- **Общий mutable store** превращает независимые команды обратно в монолит, только без компилятора, который поймает несовместимость.
- **Спросят следом:** как версионировать контракт между shell и MFE (semver + контрактные тесты) и что делать, если два MFE требуют разные мажорные версии Angular (изолировать через iframe/Web Component либо синхронизировать релиз).`,
      en: `## In short

These are **tools for different jobs, not competitors**. single-spa answers "who is on screen right now": it mounts and unmounts micro-frontends by URL. Module Federation answers "where did this code come from": it shares modules and libraries between separately built bundles. They are frequently used together.

Analogy: a concert. single-spa is the compère with the running order — announces an act, brings the band on stage, takes them off (\`bootstrap/mount/unmount\`). Module Federation is the shared backline: the drums and amps every band uses so nobody hauls their own. The compère doesn't replace the amp, and the amp doesn't announce the acts.

## How it works, step by step

1. **single-spa:** every MFE exports three functions — \`bootstrap\`, \`mount\`, \`unmount\`.
2. A root-config registers the apps and, based on the current URL, decides who gets mounted and who gets unmounted.
3. It is **build- and framework-agnostic** — you can mix React, Angular and Vue on one screen.
4. **Module Federation:** the remote declares \`exposes\`, the host declares \`remotes\`, shared libraries go into \`shared\`. That's sharing at **build level**; there is no orchestration in it at all.
5. Combined: single-spa routes between MFEs while MF gives them one Angular/RxJS instead of three copies.
6. **Strengths and weaknesses.** single-spa: heterogeneous stacks and an explicit lifecycle — but lots of boilerplate and manual dependency sharing. MF: native sharing and lazy loading out of the box — but webpack/rspack lock-in and runtime coupling through \`shared\`.
7. **Practical call:** homogeneous Angular stack → plain MF; a zoo of frameworks or a gradual legacy migration → single-spa, optionally plus MF for the dependencies.

## Isolation: where it actually leaks

MFEs live in **one document**, so isolation isn't free:

- **Styles:** Shadow DOM, CSS modules or hard prefixes — otherwise one team's global CSS repaints everyone else's buttons.
- **JS globals:** don't litter \`window\`; each team gets its own namespace.
- **State:** communicate via events/\`CustomEvent\` or an explicit shared store, never shared mutable objects.
- **Crashes:** an error boundary around each MFE so one crash doesn't take down the shell.
- **Zone/DI in Angular:** singleton runtime sharing is mandatory, otherwise you get two DI containers and two Zones.

## Example

\`\`\`ts
// single-spa: the micro-frontend contract
export async function bootstrap() { /* once: prepare */ }
export async function mount(props: { domElement: HTMLElement }) { /* render into your own container */ }
export async function unmount() { /* remove DOM, unsubscribe, clear timers */ }
\`\`\`

Why this matters: \`unmount\` is the critical one. If an MFE doesn't drop its subscriptions, \`window\` listeners and timers, every route switch leaks a bit more, and twenty minutes in the tab crawls.

## What to say in the interview

> single-spa is a lifecycle orchestrator: each micro-frontend registers \`bootstrap/mount/unmount\`, and a root-config decides by URL who is active; it's build- and framework-agnostic, which makes it the answer for mixed stacks. Module Federation isn't orchestration at all — it's build-level code sharing: the remote exposes modules, the host loads them at runtime, common libraries go into \`shared\`. They're often combined: single-spa routes, MF shares dependencies. The trade-off: single-spa buys heterogeneity with boilerplate and manual sharing, MF buys native sharing with webpack lock-in and runtime coupling. Isolation is never free, since everyone shares one document: styles via Shadow DOM or prefixes, no pollution of \`window\`, communication through events, an error boundary per MFE. The classic failure is hidden global coupling — one MFE patches \`window.fetch\` or mutates a shared store and breaks its neighbours; the cure is contracts and contract tests at the boundaries.

## Gotchas

- **Treating them as alternatives.** They're different layers — orchestration vs code sharing. Interviewers pounce on this instantly.
- **A forgotten \`unmount\`** leaks memory and leaves ghost subscribers still hitting APIs for an MFE that's off screen.
- **Global CSS.** A reset or \`* { box-sizing }\` from one MFE wrecks its neighbours; Shadow DOM protects you but complicates global theming and overlays/portals.
- **Monkey-patching \`window.fetch\`/\`history\`** for your own needs is the classic source of "everything broke for the other team after our release".
- **A shared mutable store** turns independent teams back into a monolith — only now without a compiler to catch the incompatibility.
- **Follow-ups:** how you version the shell↔MFE contract (semver plus contract tests), and what to do when two MFEs need different Angular majors (isolate via iframe/Web Component, or synchronise the upgrade).`,
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
      ru: `## Коротко

Компоненты делят на два сорта. **Smart (container)** знает, откуда берутся данные: инжектит сервисы и стейт, дёргает API, обычно висит на роуте. **Dumb (presentational)** ничего не знает про источник — ему дали данные через \`@Input\`, он их нарисовал и через \`@Output\` крикнул «на меня нажали».

Аналогия: ресторан. Официант (smart) ходит на кухню, знает меню, оформляет заказ. Тарелка (dumb) просто показывает то, что на неё положили, и не имеет понятия, откуда взялась еда. Тарелку можно поставить на любой стол — тем она и ценна.

## Как это работает по шагам

1. Умный компонент инжектит сервис/store и получает данные.
2. Он передаёт их вниз через \`@Input\` (или сигнальные \`input()\`) — только то, что нужно для отрисовки.
3. Глупый компонент ставит \`ChangeDetectionStrategy.OnPush\` и просто рисует полученное.
4. Пользователь кликнул — глупый компонент не решает, что делать, а эмитит событие через \`@Output\`.
5. Умный ловит событие и выполняет действие: диспатчит в store, вызывает API, меняет роут.
6. Профит: **глупые компоненты переиспользуются** где угодно и тестируются как чистая функция «вход → разметка», а умные достаточно протестировать с замоканным сервисом.

## Пример

\`\`\`ts
// dumb
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
class UserCardComponent { @Input() user!: User; @Output() select = new EventEmitter<string>(); }
\`\`\`

Почему так: у компонента нет ни одного \`inject()\`, поэтому его тест — это «дал объект, проверил разметку», без TestBed-мокинга HTTP. А \`OnPush\` плюс иммутабельные входы означают, что Angular перерисует его только при реальной смене ссылки на \`user\`.

## Что сказать на собеседовании

> Компоненты делятся на smart-контейнеры и dumb-презентационные. Контейнер инжектит сервисы и store, оркестрирует данные и обычно привязан к роуту; презентационный получает всё через \`@Input\` или сигналы, отдаёт события через \`@Output\` и ничего не знает об источнике данных. Выгода тройная: переиспользуемость, потому что dumb не привязан к контексту; тестируемость, потому что он тестируется как чистая функция от входов, а мокать надо только сервисы контейнера; и производительность, потому что с \`OnPush\` и иммутабельными входами он перерисовывается только при смене ссылки. Но это эвристика, а не закон: на глубокой иерархии начинается prop drilling через пять уровней — тогда лучше фасад или store прямо на нужном уровне. И с сигналами граница размывается: презентационный компонент может читать инжектированный store напрямую и всё равно оставаться «глупым» по логике.

## Ловушки

- **Prop drilling.** Пробрасывать \`@Input\`/\`@Output\` через пять уровней мучительно и хрупко — введите фасад/store на нужном уровне вместо ритуала.
- **Искусственное дробление.** Одноразовый кусок вёрстки не нужно резать на container + presentational: это чистый overhead.
- **Dumb с \`inject(HttpClient)\`** — уже не dumb. Первый признак: тест требует TestBed и мока HTTP.
- **\`OnPush\` + мутация объекта.** Изменили поле внутри \`user\` без новой ссылки — вид не обновится. Это самая частая практическая боль паттерна.
- **\`@Output\`, который эмитит уже принятое решение** («удалить пользователя») вместо факта («нажали кнопку удаления») — так логика утекает вниз.
- **Спросят следом:** как паттерн меняется с сигналами (\`input()\`/\`output()\`, \`computed\` вместо ручных пересчётов) и чем container отличается от фасада (фасад — сервис, container — компонент, который его использует).`,
      en: `## In short

Components come in two flavours. A **smart (container)** component knows where data comes from: it injects services and state, calls APIs, and usually sits on a route. A **dumb (presentational)** component knows nothing about the source — it was handed data via \`@Input\`, it renders it, and via \`@Output\` it shouts "someone clicked me".

Analogy: a restaurant. The waiter (smart) walks to the kitchen, knows the menu, places the order. The plate (dumb) just displays whatever was put on it and has no idea where the food came from. You can put that plate on any table — that's exactly what makes it valuable.

## How it works, step by step

1. The smart component injects a service/store and gets the data.
2. It passes it down through \`@Input\` (or signal \`input()\`) — only what's needed for rendering.
3. The dumb component sets \`ChangeDetectionStrategy.OnPush\` and simply renders what it got.
4. The user clicks — the dumb component doesn't decide what happens; it emits through \`@Output\`.
5. The smart one catches the event and acts: dispatches to the store, calls the API, navigates.
6. The payoff: **dumb components are reusable anywhere** and testable as a pure "input → markup" function, while smart ones only need a mocked service in their test.

## Example

\`\`\`ts
// dumb
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
class UserCardComponent { @Input() user!: User; @Output() select = new EventEmitter<string>(); }
\`\`\`

Why this works: the component has no \`inject()\` at all, so its test is "pass an object, assert the markup" — no TestBed HTTP mocking. And \`OnPush\` plus immutable inputs mean Angular re-renders it only when the \`user\` reference actually changes.

## What to say in the interview

> Components split into smart containers and dumb presentational ones. The container injects services and state, orchestrates data and is usually route-bound; the presentational one receives everything via \`@Input\` or signals, emits through \`@Output\`, and knows nothing about the data source. The payoff is threefold: reusability, because a dumb component isn't tied to context; testability, because it's tested as a pure function of its inputs and only the container's services need mocking; and performance, because with \`OnPush\` and immutable inputs it re-renders only on a reference change. But it's a heuristic, not a law: in deep hierarchies you get prop drilling through five levels, and then a facade or store injected at the right level beats the ritual. With signals the line blurs anyway — a presentational component can read an injected store directly and still be "dumb" in terms of logic.

## Gotchas

- **Prop drilling.** Threading \`@Input\`/\`@Output\` through five levels is painful and brittle — introduce a facade/store at the level that needs it.
- **Artificial fragmentation.** One-off view markup doesn't need splitting into container + presentational; that's pure overhead.
- **A dumb component with \`inject(HttpClient)\`** is no longer dumb. The tell: its test suddenly needs TestBed and an HTTP mock.
- **\`OnPush\` plus mutation.** Change a field inside \`user\` without a new reference and the view won't update — the pattern's most common day-to-day pain.
- **An \`@Output\` that emits a decision** ("delete the user") instead of a fact ("delete button clicked") leaks logic downward.
- **Follow-ups:** how the pattern shifts with signals (\`input()\`/\`output()\`, \`computed\` instead of manual recalculation), and how a container differs from a facade (the facade is a service, the container is the component using it).`,
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
      ru: `## Коротко

**Facade** — это обычный инжектируемый сервис, который прячет за собой всю кухню стейт-менеджмента: селекторы, \`dispatch\`, сигналы, сабджекты. Компонент вызывает \`facade.loadOrders()\` и читает \`facade.orders$\`, и понятия не имеет, что внутри NgRx.

Аналогия: ресепшн отеля. Вы говорите «нужен трансфер в аэропорт» — и не звоните в гараж, не оформляете путевой лист, не ищете свободного водителя. Ресепшн — узкая понятная дверь в сложную систему. Но если через ресепшн начать заказывать вообще всё, включая ремонт лифта, он превратится в бутылочное горлышко.

## Как это работает по шагам

1. Заводим сервис \`OrdersFacade\` — один на домен.
2. Наружу он выставляет **два вида вещей**: потоки/сигналы для чтения и методы-команды для действий.
3. Внутри он делает \`store.select(...)\` и \`store.dispatch(...)\` — это единственное место в домене, которое знает про NgRx.
4. Компоненты инжектят фасад и больше нигде не импортируют селекторы и экшены.
5. В тестах компонента подменяется **один** провайдер — фасад, а не половина стора.
6. Захотели переехать с NgRx на сигналы — меняете внутренности фасада, компоненты не трогаете.

## Пример

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class OrdersFacade {
  readonly orders$ = this.store.select(selectOrders);
  loadOrders() { this.store.dispatch(loadOrders()); }
}
\`\`\`

Почему так: компонент зависит от **абстракции** (фасада), а не от конкретного стора — это dependency inversion в чистом виде. Плюс имя метода \`loadOrders()\` читается лучше, чем \`dispatch(loadOrders())\` с импортом экшена в каждом компоненте.

## Что сказать на собеседовании

> Фасад — это инжектируемый сервис, который прячет детали стейт-менеджмента — селекторы, dispatch, сигналы, сабджекты — за простым API; компоненты зависят от фасада, а не от стора. Плюсы: инкапсуляция, потому что компонент не знает про NgRx и реализацию можно сменить на сигналы, не трогая компоненты; простое API вместо импорта селекторов повсюду; тестируемость, потому что в тесте подменяется один провайдер; и dependency inversion — зависимость на абстракцию. Риски тоже конкретные: фасад легко превращается в god-object, свалку методов всего домена; для простого стейта это лишний слой без выгоды; и главное — сокрытие сложности не равно её устранению, неоптимальные подписки просто переезжают внутрь. Моё правило: фасад оправдан в крупном приложении с NgRx и множеством потребителей, один фасад на домен; на маленьком приложении с парой сигналов это оверинжиниринг.

## Ловушки

- **God-object.** Фасад на 40 методов — признак, что домен пора делить, а не что фасад плохой.
- **Один фасад на несколько доменов** снова связывает то, что вы разделяли: \`OrdersFacade\`, который лезет в биллинг, — уже не фасад, а мост.
- **Фасад-прокси.** Если каждый метод — это ровно один \`dispatch\` и ничего больше, слой действительно может быть лишним; спросите себя, что он инкапсулирует.
- **Маскировка неэффективности:** внутри фасада легко спрятать подписку без \`distinctUntilChanged\` или селектор без мемоизации — снаружи это не видно.
- **Утечка типов NgRx наружу:** если фасад возвращает \`Action\` или внутренние стейт-типы, миграция «без правки компонентов» перестаёт быть возможной.
- **Спросят следом:** чем фасад отличается от смарт-компонента (фасад переиспользуется несколькими компонентами) и нужен ли он при NgRx SignalStore (часто store сам и есть фасад).`,
      en: `## In short

A **facade** is just an injectable service that hides the whole state-management kitchen behind it: selectors, \`dispatch\`, signals, subjects. The component calls \`facade.loadOrders()\` and reads \`facade.orders$\`, and has no idea NgRx is in there.

Analogy: a hotel front desk. You say "I need a ride to the airport" — you don't phone the garage, fill in a dispatch form, or hunt for a free driver. The desk is one narrow, understandable door into a complex system. But if you start ordering everything through it, including elevator repairs, it becomes a bottleneck.

## How it works, step by step

1. Create an \`OrdersFacade\` service — one per domain.
2. It exposes **two kinds of things**: streams/signals to read, and command methods to act.
3. Inside it does \`store.select(...)\` and \`store.dispatch(...)\` — the only place in the domain that knows about NgRx.
4. Components inject the facade and stop importing selectors and actions anywhere else.
5. In a component test you replace **one** provider — the facade — instead of half the store.
6. Want to migrate from NgRx to signals? You rewrite the facade's internals; components stay untouched.

## Example

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class OrdersFacade {
  readonly orders$ = this.store.select(selectOrders);
  loadOrders() { this.store.dispatch(loadOrders()); }
}
\`\`\`

Why this works: the component depends on an **abstraction** (the facade) rather than a concrete store — textbook dependency inversion. And \`loadOrders()\` reads better than \`dispatch(loadOrders())\` plus an action import in every component.

## What to say in the interview

> A facade is an injectable service that hides state-management details — selectors, dispatch, signals, subjects — behind a simple API; components depend on the facade rather than the store. The benefits: encapsulation, since the component knows nothing about NgRx and you could swap it for signals without touching components; a simpler API instead of selector imports everywhere; testability, because a test replaces a single provider; and dependency inversion — depending on an abstraction. The risks are just as concrete: a facade easily degenerates into a god object, a dumping ground for the whole domain; for simple state it's a layer with no payoff; and crucially, hiding complexity isn't removing it — suboptimal subscriptions just move inside. My rule: a facade earns its place in a large app with NgRx and many consumers, one facade per domain; for a small app with a couple of signals it's over-engineering.

## Gotchas

- **God object.** A 40-method facade means the domain needs splitting, not that facades are bad.
- **One facade spanning several domains** re-couples exactly what you separated: an \`OrdersFacade\` reaching into billing is a bridge, not a facade.
- **The pass-through facade.** If every method is exactly one \`dispatch\` and nothing else, the layer may genuinely be redundant — ask what it actually encapsulates.
- **Masked inefficiency:** it's easy to bury a subscription without \`distinctUntilChanged\` or an unmemoized selector inside — nothing shows from outside.
- **Leaking NgRx types:** if the facade returns \`Action\` or internal state types, "migrate without touching components" stops being true.
- **Follow-ups:** how a facade differs from a smart component (the facade is reused by several components), and whether you still need one with NgRx SignalStore (often the store *is* the facade).`,
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
      ru: `## Коротко

SOLID — это пять правил про то, **как резать код на куски, чтобы завтрашнее изменение не заставляло переписывать полприложения**. В Angular они ложатся почти буквально, потому что DI-контейнер уже встроен во фреймворк.

Аналогия: кухонный гарнитур из модулей. У каждого ящика одно назначение (S), новый ящик добавляется без распиливания старых (O), любой ящик подходит в любую нишу того же размера (L), розетка не заставляет вас покупать всю плиту ради одного разъёма (I), а техника подключается к стандартной розетке, а не припаивается к проводке (D).

## Пять букв на пальцах

1. **S — Single Responsibility.** Компонент отвечает только за представление; HTTP, маппинг и бизнес-правила живут в сервисах. Симптом нарушения: компонент на 600 строк с \`HttpClient\` внутри.
2. **O — Open/Closed.** Поведение расширяем через DI-токены и стратегии, а не правкой существующих классов. Живой пример: \`HTTP_INTERCEPTORS\` — вы добавляете интерсептор, вообще не трогая \`HttpClient\`.
3. **L — Liskov Substitution.** Любая реализация абстрактного сервиса взаимозаменяема с другой. Если \`MockAuthService\` ломает контракт \`AuthService\` (например, возвращает синхронно то, что должно быть Observable), тесты просто лгут.
4. **I — Interface Segregation.** Не заставляйте потребителя зависеть от огромного сервиса ради одного метода. Режьте на узкие абстракции и токены: \`export const LOGGER = new InjectionToken<Logger>('Logger');\`
5. **D — Dependency Inversion.** Компоненты и сервисы зависят от **абстракций** (\`InjectionToken\`, \`abstract class\`), а конкретику подставляет DI. Это сердце Angular: DI-контейнер — встроенная реализация DIP.

## Пример

\`\`\`ts
export abstract class PaymentGateway { abstract charge(sum: number): Observable<Receipt>; }

// прод
providers: [{ provide: PaymentGateway, useClass: StripeGateway }]
// тест
providers: [{ provide: PaymentGateway, useClass: FakeGateway }]
\`\`\`

Почему так: компонент не знает слова «Stripe». Замена платёжного провайдера — правка одной строки в провайдерах, а тест не ходит в сеть вообще.

## Что сказать на собеседовании

> В Angular SOLID ложится почти буквально. S: компонент отвечает только за представление, HTTP и бизнес-правила — в сервисах; симптом нарушения — компонент на 600 строк с \`HttpClient\` внутри. O: расширяем через DI-токены и стратегии, канонический пример — \`HTTP_INTERCEPTORS\`, где новое поведение добавляется без правки \`HttpClient\`. L: любая реализация абстрактного сервиса взаимозаменяема — если мок ломает контракт, тесты лгут. I: не тянуть здоровый сервис ради одного метода, резать на узкие \`InjectionToken\`. D — главное: зависим от абстракций, а конкретику подставляет DI, и DI-контейнер Angular и есть встроенная реализация этого принципа; отсюда фейки в тестах и смена реализации конфигурацией. Практический эффект — тестируемость, гибкость и локальность изменений. Но это не карго-культ: для тривиального кода абстракция ради абстракции только добавляет прыжков по файлам.

## Ловушки

- **Абстракция ради абстракции.** Интерфейс с единственной реализацией, которая никогда не поменяется, — это не DIP, это лишний файл.
- **SRP как «одна функция на класс».** Ответственность — это причина для изменения, а не количество строк.
- **Нарушение LSP в моках** — самый коварный случай: фейк возвращает данные синхронно, тест зелёный, прод падает на асинхронности.
- **\`useClass\` вместо \`useExisting\`** там, где нужен один и тот же экземпляр: получите две копии сервиса и разное состояние.
- **Интерфейс TypeScript нельзя использовать как DI-токен** — он стирается при компиляции. Нужен \`InjectionToken\` или \`abstract class\`.
- **Спросят следом:** приведите нарушение каждого принципа из своего реального проекта, и чем OCP отличается от простого наследования (расширение без модификации, а не переопределение).`,
      en: `## In short

SOLID is five rules about **how to cut code into pieces so that tomorrow's change doesn't force you to rewrite half the app**. In Angular they map almost literally, because the DI container is already baked into the framework.

Analogy: a modular kitchen. Every drawer has one purpose (S), a new drawer is added without sawing up the old ones (O), any drawer fits any slot of the same size (L), a socket doesn't force you to buy the whole cooker just to get one plug (I), and appliances plug into a standard socket instead of being soldered to the wiring (D).

## The five letters, in plain words

1. **S — Single Responsibility.** A component is responsible for presentation only; HTTP, mapping and business rules live in services. Violation symptom: a 600-line component with \`HttpClient\` inside.
2. **O — Open/Closed.** Extend behaviour through DI tokens and strategies, not by editing existing classes. The living example: \`HTTP_INTERCEPTORS\` — you add an interceptor without touching \`HttpClient\` at all.
3. **L — Liskov Substitution.** Any implementation of an abstract service is interchangeable with another. If \`MockAuthService\` breaks the \`AuthService\` contract (say, returns synchronously what should be an Observable), your tests are simply lying.
4. **I — Interface Segregation.** Don't force a consumer to depend on a huge service for one method. Split into narrow abstractions and tokens: \`export const LOGGER = new InjectionToken<Logger>('Logger');\`
5. **D — Dependency Inversion.** Components and services depend on **abstractions** (\`InjectionToken\`, \`abstract class\`), and DI supplies the concrete one. This is the heart of Angular: the DI container is a built-in DIP implementation.

## Example

\`\`\`ts
export abstract class PaymentGateway { abstract charge(sum: number): Observable<Receipt>; }

// production
providers: [{ provide: PaymentGateway, useClass: StripeGateway }]
// test
providers: [{ provide: PaymentGateway, useClass: FakeGateway }]
\`\`\`

Why this works: the component never hears the word "Stripe". Swapping payment providers is a one-line change in providers, and the test never touches the network.

## What to say in the interview

> SOLID maps almost literally onto Angular. S: a component handles presentation only, HTTP and business rules go to services; the violation symptom is a 600-line component with \`HttpClient\` in it. O: extend via DI tokens and strategies — the canonical example is \`HTTP_INTERCEPTORS\`, where new behaviour is added without editing \`HttpClient\`. L: any implementation of an abstract service must be interchangeable — if the mock breaks the contract, the tests lie. I: don't drag in a fat service for one method; split into narrow \`InjectionToken\`s. And D, the big one: depend on abstractions while DI supplies the concrete class — Angular's DI container is literally a built-in implementation of that principle, which is what gives you fakes in tests and implementation swaps by configuration. The practical payoff is testability, flexibility and change locality. But it isn't a cargo cult: for trivial code, abstraction for its own sake just adds file-hopping.

## Gotchas

- **Abstraction for its own sake.** An interface with exactly one implementation that will never change isn't DIP, it's an extra file.
- **Reading SRP as "one function per class".** A responsibility is a reason to change, not a line count.
- **LSP violations in mocks** are the sneakiest case: the fake returns data synchronously, the test is green, production breaks on the async path.
- **\`useClass\` where you needed \`useExisting\`**: you end up with two instances of the service and two divergent states.
- **A TypeScript interface can't be a DI token** — it's erased at compile time. Use an \`InjectionToken\` or an \`abstract class\`.
- **Follow-ups:** give a violation of each principle from a real project of yours, and explain how OCP differs from plain inheritance (extension without modification, not overriding).`,
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
      ru: `## Коротко

Папки группируем **по фиче (домену), а не по типу файла**. Не \`components/\`, \`services/\`, \`pipes/\` на всё приложение, а \`orders/\`, \`billing/\`, где внутри каждой фичи уже лежат свои компоненты и сервисы.

Аналогия: картотека. Можно разложить документы по типу бумаги — «все договоры в одном ящике, все счета в другом». Тогда чтобы собрать одно дело, вы бегаете по всем ящикам. А можно по делу: одно дело — один ящик, всё под рукой, и передать дело коллеге можно целиком. Второй вариант и есть feature-first.

## Как это работает по шагам

1. **Верхний уровень режем по доменам**, а не по типам файлов.
2. Оставляем ровно три служебные зоны: \`core/\` (синглтоны: auth, интерсепторы, конфиг — импортируется один раз), \`shared/\` (переиспользуемое между доменами) и \`features/\` (сами домены).
3. **Внутри каждой фичи — слои**: \`data-access/\` (сервисы, store, модели), \`feature/\` (smart-компоненты и роутинг), \`ui/\` (presentational), \`util/\` (чистые функции).
4. **Публичный API фичи задаём barrel-файлом \`index.ts\`**: наружу торчит только то, что экспортировано, остальное — внутренности.
5. **Домены не импортируют друг друга напрямую**: \`orders\` не тянет \`billing\`, общее уходит в \`shared\`.
6. **Ленивая загрузка по фичам**: каждый домен — свой route-чанк, поэтому граница папок совпадает с границей бандла.

## Пример

\`\`\`
src/app/
  core/                 # синглтоны: auth, interceptors, config
  shared/ui/            # переиспользуемые dumb-компоненты
  features/orders/
    data-access/        # сервисы, store, модели
    feature/            # smart-компоненты + routing
    ui/                 # presentational
    util/
    index.ts            # публичный API фичи
  features/billing/
\`\`\`

Почему так: границы папок совпадают с границами lazy-чанков и с границами ответственности команд. Удалить фичу целиком = удалить одну папку — это лучший тест на правильность структуры.

## Что сказать на собеседовании

> Группирую feature-first, а не type-first: \`components/\`, \`services/\`, \`pipes/\` на всё приложение не масштабируются, потому что там всё связано со всем. Верхний уровень — домены плюс \`core\` для синглтонов и \`shared\` для переиспользуемого. Внутри каждой фичи слои: data-access, feature, ui, util. Публичный API фичи описывается barrel-файлом \`index.ts\`, внутренности наружу не торчат; домены не импортируют друг друга напрямую, только через \`shared\`; ленивая загрузка идёт по фичам, поэтому граница папки совпадает с границей чанка. Сигналы проблем простые: появились циклические импорты между фичами — значит границы проведены неверно; \`shared\` превратился в свалку — делим на \`shared/ui\`, \`shared/util\`, \`shared/data-access\`. В Nx-монорепо это ложится один в один на libs с тегами, и границы уже проверяет линтер, а не дисциплина.

## Ловушки

- **\`shared\` как помойка.** Через полгода это самая большая папка проекта, и любая правка в ней задевает всех. Дробите и не бойтесь дублировать мелочь.
- **Циклические импорты между фичами** — не техническая проблема, а сигнал, что границу домена провели не там.
- **Глубокие импорты мимо \`index.ts\`** (\`orders/feature/internal/helper\`) убивают весь смысл публичного API: внутренности становятся контрактом.
- **\`core\`, импортированный дважды** в NgModule-мире давал вторые экземпляры синглтонов; в standalone/\`providedIn: 'root'\` проблема ушла, но её любят спрашивать.
- **Слишком ранняя нарезка.** На старте проекта из трёх экранов десять уровней папок — это трение без выгоды.
- **Спросят следом:** чем это отличается от feature-sliced design, и как понять, что фича «созрела» для выноса в отдельную библиотеку (её импортируют минимум два потребителя и она релизится отдельно).`,
      en: `## In short

Group folders **by feature (domain), not by file type**. Not \`components/\`, \`services/\`, \`pipes/\` spanning the whole app, but \`orders/\`, \`billing/\`, each holding its own components and services.

Analogy: a filing cabinet. You can file by paper type — "all contracts in one drawer, all invoices in another". Then assembling one case means running between every drawer. Or you file by case: one case, one drawer, everything at hand, and you can hand the whole case to a colleague. The second option is feature-first.

## How it works, step by step

1. **Cut the top level by domain**, not by file type.
2. Keep exactly three service zones: \`core/\` (singletons — auth, interceptors, config, imported once), \`shared/\` (reused across domains) and \`features/\` (the domains themselves).
3. **Layer inside each feature**: \`data-access/\` (services, store, models), \`feature/\` (smart components and routing), \`ui/\` (presentational), \`util/\` (pure functions).
4. **Define the feature's public API with an \`index.ts\` barrel**: only what's exported is visible; everything else is internals.
5. **Domains don't import each other directly**: \`orders\` never pulls \`billing\`; shared pieces move to \`shared\`.
6. **Lazy-load per feature**: each domain is its own route chunk, so folder boundaries line up with bundle boundaries.

## Example

\`\`\`
src/app/
  core/                 # singletons: auth, interceptors, config
  shared/ui/            # reusable dumb components
  features/orders/
    data-access/        # services, store, models
    feature/            # smart components + routing
    ui/                 # presentational
    util/
    index.ts            # the feature's public API
  features/billing/
\`\`\`

Why this works: folder boundaries coincide with lazy-chunk boundaries and with team ownership. Deleting a feature should mean deleting one folder — that's the best test of whether your structure is right.

## What to say in the interview

> I group feature-first, not type-first: \`components/\`, \`services/\`, \`pipes/\` across the whole app doesn't scale because everything ends up coupled to everything. The top level is domains plus \`core\` for singletons and \`shared\` for reusable pieces. Inside each feature there are layers: data-access, feature, ui, util. A feature's public API is defined by an \`index.ts\` barrel and internals stay hidden; domains never import each other directly, only through \`shared\`; lazy loading is per feature, so a folder boundary equals a chunk boundary. The warning signs are simple: cyclic imports between features mean the domain boundary is drawn in the wrong place, and a \`shared\` folder turning into a dumping ground means splitting it into \`shared/ui\`, \`shared/util\`, \`shared/data-access\`. In an Nx monorepo this maps one-to-one onto tagged libs, where the linter enforces the boundaries instead of discipline.

## Gotchas

- **\`shared\` as a junk drawer.** Six months in it's the biggest folder in the repo and every change there touches everyone. Split it, and don't fear duplicating small things.
- **Cyclic imports between features** aren't a technical problem — they're a signal that the domain boundary is wrong.
- **Deep imports past \`index.ts\`** (\`orders/feature/internal/helper\`) destroy the point of a public API: internals become the contract.
- **\`core\` imported twice** used to create duplicate singletons in the NgModule world; standalone and \`providedIn: 'root'\` fixed it, but interviewers still love asking.
- **Slicing too early.** Ten folder levels for a three-screen app is friction with no payoff.
- **Follow-ups:** how this differs from feature-sliced design, and how you know a feature is ready to become its own library (at least two consumers import it and it releases separately).`,
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
      ru: `## Коротко

Feature flag — это **рантайм-выключатель для куска функциональности**. Код уже в проде, но пользователи его не видят, пока флаг не включат. Смысл в том, чтобы разделить **деплой** (код доехал) и **релиз** (фичу увидели люди).

Аналогия: в новом здании этаж достроен, лифт до него ходит, но кнопка заклеена. Хотите — открыли для десяти сотрудников, посмотрели, потом для всех. Что-то пошло не так — заклеили обратно за секунду, без сноса здания (это и есть kill switch). Беда начинается, когда таких заклеенных кнопок в лифте тридцать, и никто не помнит, что за ними.

## Как это работает по шагам

1. Заводим **сервис флагов** с источником: LaunchDarkly, Unleash или собственный конфиг.
2. Грузим значения на старте приложения через \`APP_INITIALIZER\` — до первого рендера.
3. Отдаём флаг наружу как сигнал/Observable, а в шаблоне используем условие, структурную директиву или route guard.
4. Выбираем **где вычисляется флаг**: client-side — быстро, но флаг и код видны в бандле; server-side/edge — безопаснее и обязательно для авторизационных решений.
5. Раскатываем постепенно: 1% → 10% → 100%, с возможностью мгновенно выключить.
6. **Удаляем флаг** сразу после полной раскатки — это отдельный обязательный шаг, а не «когда-нибудь».

## Пример

\`\`\`ts
@if (flags.isOn('new-checkout')) { <app-new-checkout /> } @else { <app-legacy-checkout /> }
\`\`\`

Почему так: обе ветки живут в одном бандле и обе компилируются — значит, старый код не «протухает» молча, а типы проверяются. Плата за это — размер бандла и то, что оба пути надо держать рабочими.

## Что сказать на собеседовании

> Feature flags разделяют деплой и релиз: код влит в main и задеплоен, а включается рантайм-флагом. Это даёт постепенную раскатку и canary, A/B-тесты, kill switch и trunk-based development без долгоживущих веток. В Angular это сервис флагов поверх LaunchDarkly, Unleash или своего конфига, значения грузятся в \`APP_INITIALIZER\`, а доступ идёт через сигнал, структурную директиву или route guard. Ключевое различие — где флаг вычисляется: клиентская проверка быстрая, но код лежит в бандле, поэтому она не годится для безопасности; авторизационные решения только на сервере или на edge. Главный риск — flag debt: забытые флаги ветвят код экспоненциально, N флагов дают 2^N путей, все не протестируешь. Поэтому я разделяю короткоживущие release-флаги, которые удаляются сразу после раскатки, и долгоживущие operational- или permission-флаги, и логирую обращения к флагам, чтобы находить мёртвые.

## Ловушки

- **Клиентский флаг — не безопасность.** Код лежит в бандле; любопытный пользователь включит фичу в devtools. Права — только на сервере.
- **Flag debt.** Через год у вас 80 флагов, половина всегда \`true\`, и никто не рискует их убрать. Лечение: TTL на флаг, автотикет на cleanup, дашборд использования.
- **Комбинаторный взрыв.** Тестировать все 2^N сочетаний невозможно — фиксируйте набор поддерживаемых комбинаций и тестируйте только их.
- **Блокирующая загрузка.** Синхронный запрос флагов в \`APP_INITIALIZER\` задерживает первый рендер; нужны таймаут и безопасные дефолты на случай недоступности провайдера.
- **Флаг посреди рантайма меняет значение** — компонент, который прочитал его один раз в конструкторе, останется в старом состоянии.
- **Спросят следом:** чем feature flag отличается от ветки (флаг живёт в проде и обратим мгновенно) и как флаги влияют на миграции БД/контракты API (обратно совместимые изменения обязательны, иначе откат невозможен).`,
      en: `## In short

A feature flag is a **runtime switch for a chunk of functionality**. The code is already in production, but users don't see it until the flag is turned on. The point is to decouple **deploy** (the code arrived) from **release** (people can see it).

Analogy: a new building where a floor is finished and the lift reaches it, but the button is taped over. Untape it for ten employees, watch, then open it to everyone. Something goes wrong — tape it back in a second, no demolition needed (that's the kill switch). Trouble starts when thirty buttons in that lift are taped over and nobody remembers what's behind them.

## How it works, step by step

1. Create a **flags service** backed by a source: LaunchDarkly, Unleash, or your own config.
2. Load the values at app startup via \`APP_INITIALIZER\` — before the first render.
3. Expose each flag as a signal/Observable and consume it in the template, in a structural directive, or in a route guard.
4. Decide **where the flag is evaluated**: client-side is fast, but flag and code are visible in the bundle; server-side/edge is safer and mandatory for authorization decisions.
5. Roll out gradually: 1% → 10% → 100%, with the ability to kill it instantly.
6. **Delete the flag** right after full rollout — that's a required step, not a someday.

## Example

\`\`\`ts
@if (flags.isOn('new-checkout')) { <app-new-checkout /> } @else { <app-legacy-checkout /> }
\`\`\`

Why this works: both branches live in the same bundle and both compile, so the old path doesn't silently rot and types stay checked. The price is bundle size and the duty to keep both paths working.

## What to say in the interview

> Feature flags decouple deploy from release: the code is merged and shipped, but switched on by a runtime flag. That buys you gradual rollouts and canaries, A/B tests, a kill switch, and trunk-based development without long-lived branches. In Angular it's a flags service on top of LaunchDarkly, Unleash or a custom config, loaded in \`APP_INITIALIZER\`, exposed through a signal, a structural directive or a route guard. The key distinction is where evaluation happens: client-side is fast but the code sits in the bundle, so it's never a security boundary — authorization decisions belong on the server or the edge. The main risk is flag debt: forgotten flags branch the code exponentially, N flags mean 2^N paths and you can't test them all. So I separate short-lived release flags, deleted immediately after rollout, from long-lived operational or permission flags, and log flag reads to find the dead ones.

## Gotchas

- **A client flag is not security.** The code is in the bundle; a curious user flips it in devtools. Permissions belong on the server.
- **Flag debt.** A year in you have 80 flags, half permanently \`true\`, and nobody dares remove them. Cure: a TTL per flag, an auto-created cleanup ticket, and a usage dashboard.
- **Combinatorial explosion.** You can't test all 2^N combinations — declare the supported set of combinations and test only those.
- **Blocking startup.** A synchronous flag fetch in \`APP_INITIALIZER\` delays first render; you need a timeout and safe defaults when the provider is unreachable.
- **Flags that change mid-session**: a component that read the value once in its constructor stays stuck in the old state.
- **Follow-ups:** how a flag differs from a branch (it lives in production and is reversible instantly), and how flags interact with DB migrations and API contracts (backwards-compatible changes are mandatory, otherwise rollback is impossible).`,
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
      ru: `## Коротко

Это не выбор «что круче», а **выбор уровня церемонии под размер боли**. Есть лесенка из четырёх ступеней, и подниматься по ней надо только тогда, когда текущая ступень реально мешает.

Аналогия: хранение вещей. Мелочь в кармане — локальные сигналы. Полка в комнате — сервис с сигналами. Шкаф с подписанными коробками — SignalStore. Складской терминал с журналом «кто, что и когда вынес» — классический NgRx. Строить складской терминал ради трёх носков — не порядок, а бюрократия. Но искать документ в кармане, когда вещей тысяча, тоже невозможно.

## Четыре ступени и когда подниматься

1. **Локальное состояние компонента (signals или RxJS)** — UI-состояние, которое не нужно никому за пределами компонента: открыт ли аккордеон, что в поле поиска.
2. **Сервис с сигналами или \`BehaviorSubject\`** — shared-состояние среднего масштаба. Минимум boilerplate, читается любым джуном. Это дефолт для 80% приложений.
3. **NgRx SignalStore** — структурированный store на сигналах: \`withState\`, \`computed\`, методы, \`rxMethod\` для асинхронщины. Меньше церемоний, чем классический NgRx, но уже есть форма и правила.
4. **Классический NgRx (Redux)** — экшены, редьюсеры, эффекты, devtools, time-travel. Максимум церемонии и максимум прослеживаемости.

**По каким критериям поднимаетесь:**
- **Число потребителей.** Много несвязанных мест читают одно состояние → пора в store.
- **Сложность асинхронщины.** Гонки, отмены, координация нескольких эффектов → NgRx Effects или \`rxMethod\`.
- **Аудит и отладка.** Нужен лог действий, воспроизведение бага по экшенам, time-travel → классический NgRx.
- **Размер команды.** Строгий event-sourcing дисциплинирует большую команду; маленькой это чистый оверхед.
- **Производительность.** Сигналы дают точечную реактивность без zone — обновляется только то, что реально зависит от значения.

## Пример

\`\`\`ts
// ступень 2: этого хватает чаще, чем кажется
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<CartItem[]>([]);
  readonly items = this._items.asReadonly();
  readonly total = computed(() => this._items().reduce((s, i) => s + i.price, 0));
  add(item: CartItem) { this._items.update(list => [...list, item]); }
}
\`\`\`

Почему так: здесь уже есть всё, за что любят store — единый источник истины, производные значения, иммутабельные обновления — но нет ни одного экшена и ни одного файла boilerplate.

## Что сказать на собеседовании

> Я смотрю на это как на лесенку. Локальное состояние компонента — обычные сигналы. Shared-состояние среднего масштаба — сервис с сигналами или BehaviorSubject, минимум boilerplate, и это дефолт для большинства приложений. Дальше NgRx SignalStore — структурированный store на сигналах с computed, методами и rxMethod, меньше церемоний, чем классический NgRx. И классический NgRx с экшенами, редьюсерами, эффектами и devtools — когда реально нужны лог действий, time-travel и воспроизводимость. Критерии подъёма: много несвязанных потребителей одного состояния, сложная асинхронщина с гонками и отменами, требование аудита, большая команда, которой нужна дисциплина. Моя эвристика — начинать с сигналов и сервисов и вводить NgRx, когда боль от ручной координации превышает стоимость boilerplate. И отдельно: server state я предпочитаю держать в кэширующем data-слое, а не дублировать в общем store.

## Ловушки

- **NgRx ради CRUD-формы.** Три файла и пять экшенов, чтобы сохранить профиль, — это церемония без выгоды.
- **Глобальный store для локального UI.** «Открыт ли дропдаун» в глобальном стейте — гарантированные конфликты между экземплярами компонента.
- **Дублирование server state.** Копия серверных данных в store живёт своей жизнью и протухает; инвалидацией должен заниматься data-слой.
- **Store как свалка.** Один \`AppState\` на всё вместо срезов по доменам — и вот вы снова в монолите.
- **«Начнём сразу с NgRx, чтобы потом не переписывать»** — переписывать со временем всё равно придётся, но теперь ещё и boilerplate тащить.
- **Спросят следом:** чем SignalStore отличается от классического NgRx по модели (методы вместо экшенов, нет глобальной шины) и как тестировать каждый вариант (сервис — напрямую, NgRx — редьюсеры как чистые функции плюс marble-тесты эффектов).`,
      en: `## In short

This isn't a "which is coolest" question — it's **choosing a level of ceremony that matches the size of the pain**. There's a four-rung ladder, and you climb a rung only when the current one actually hurts.

Analogy: storing your things. Small stuff in your pocket — local signals. A shelf in the room — a service with signals. A wardrobe with labelled boxes — SignalStore. A warehouse with a log of who took what and when — classic NgRx. Building a warehouse for three socks isn't tidiness, it's bureaucracy. But finding one document in your pocket when you own a thousand things is impossible too.

## The four rungs and when to climb

1. **Local component state (signals or RxJS)** — UI state nobody outside the component needs: is the accordion open, what's in the search box.
2. **A service with signals or a \`BehaviorSubject\`** — medium-scale shared state. Minimal boilerplate, readable by any junior. This is the default for 80% of apps.
3. **NgRx SignalStore** — a structured signal-based store: \`withState\`, \`computed\`, methods, \`rxMethod\` for async. Less ceremony than classic NgRx, but with shape and rules.
4. **Classic NgRx (Redux)** — actions, reducers, effects, devtools, time-travel. Maximum ceremony and maximum traceability.

**The criteria for climbing:**
- **Number of consumers.** Many unrelated places read the same state → time for a store.
- **Async complexity.** Races, cancellations, coordinating several effects → NgRx Effects or \`rxMethod\`.
- **Audit and debugging.** You need an action log, bug replay from actions, time-travel → classic NgRx.
- **Team size.** Strict event-sourcing disciplines a large team; for a small one it's pure overhead.
- **Performance.** Signals give fine-grained reactivity without zone — only what truly depends on a value updates.

## Example

\`\`\`ts
// rung 2: this is enough more often than people think
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<CartItem[]>([]);
  readonly items = this._items.asReadonly();
  readonly total = computed(() => this._items().reduce((s, i) => s + i.price, 0));
  add(item: CartItem) { this._items.update(list => [...list, item]); }
}
\`\`\`

Why this works: it already has everything people love about a store — a single source of truth, derived values, immutable updates — with zero actions and zero boilerplate files.

## What to say in the interview

> I treat this as a ladder. Component-local state is plain signals. Medium-scale shared state is a service with signals or a BehaviorSubject — minimal boilerplate, and honestly the default for most apps. Above that sits NgRx SignalStore: a structured signal store with computed, methods and rxMethod, far less ceremony than classic NgRx. And classic NgRx with actions, reducers, effects and devtools when you genuinely need an action log, time-travel and reproducibility. The criteria for climbing a rung: many unrelated consumers of the same state, complex async with races and cancellations, an audit requirement, or a big team that needs the discipline. My heuristic is to start with signals and services and introduce NgRx when the pain of manual coordination exceeds the cost of boilerplate. Separately, I keep server state in a caching data layer rather than duplicating it into a general store.

## Gotchas

- **NgRx for a CRUD form.** Three files and five actions to save a profile is ceremony with no payoff.
- **A global store for local UI.** "Is the dropdown open" in global state guarantees conflicts between component instances.
- **Duplicating server state.** A copy of server data in the store lives its own life and goes stale; invalidation belongs to the data layer.
- **The store as a junk drawer.** One \`AppState\` for everything instead of domain slices puts you right back in a monolith.
- **"Let's start with NgRx so we don't rewrite later"** — you'll rewrite anyway, only now dragging boilerplate along.
- **Follow-ups:** how SignalStore differs from classic NgRx conceptually (methods instead of actions, no global bus), and how you test each option (a service directly; NgRx reducers as pure functions plus marble tests for effects).`,
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
      ru: `## Коротко

Дизайн-система — это **три этажа**: токены (голые значения — цвета, отступы, шрифты), примитивы (\`Button\`, \`Input\`, \`Dialog\`) и паттерны, собранные из примитивов (формы, таблицы). Чем ниже этаж, тем стабильнее должен быть его API.

Аналогия: конструктор Lego. Токены — это пластик и цвета, из которых льют детали. Примитивы — сами кубики: их немного видов, они идеально стыкуются и никогда не меняют размер шипов. Паттерны — готовые модели из инструкции. Если производитель однажды поменяет шаг шипов, все построенные дома по всему миру развалятся — вот почему API примитивов трогать страшнее всего.

## Как это работает по шагам

1. **Начинаем с токенов**, а не с компонентов. Цвета, отступы, типографика — единый источник истины, обычно через CSS custom properties. Тогда тема меняется **без пересборки компонентов**.
2. **Строим примитивы**: presentational, без бизнес-логики, доступные по умолчанию. Фокус, ARIA, клавиатура зашиты внутрь, а не оставлены потребителю. Angular CDK даёт a11y-утилиты и component harness.
3. **Собираем паттерны** — формы, таблицы, фильтры — из примитивов, а не в обход них.
4. **Фиксируем контракт**: строгий semver и период депрекации, потому что ломающее изменение компонента — это боль всех команд одновременно.
5. **Решаем, как поставлять**: в монорепо — отдельная \`ui\`-lib с тегами и enforce-границами; в полирепо — версионированный npm-пакет и жёсткий релизный процесс.
6. **Держим зависимости минимальными**: библиотека не должна тянуть за собой конкретный state-менеджер.

## Пример

\`\`\`css
:root { --ds-color-primary: #2563eb; --ds-space-2: 8px; --ds-radius-md: 6px; }
[data-theme='dark'] { --ds-color-primary: #60a5fa; }
\`\`\`

\`\`\`ts
@Component({ selector: 'ds-button', changeDetection: ChangeDetectionStrategy.OnPush })
export class DsButtonComponent { @Input() variant: 'primary' | 'ghost' | 'danger' = 'primary'; }
\`\`\`

Почему так: тему переключает одна строка на \`<html>\`, а не форк компонентов. И вариантов ровно три — фиксированный список вместо двадцати пропсов вида \`color\`, \`bg\`, \`borderWidth\`, из которых команды соберут двадцать разных «primary».

## Что сказать на собеседовании

> Дизайн-систему я строю слоями. Внизу design tokens — цвета, отступы, типографика как единый источник истины через CSS custom properties, чтобы тема менялась без пересборки компонентов. Выше примитивы: Button, Input, Dialog — презентационные, без бизнес-логики и доступные по умолчанию, причём фокус, ARIA и клавиатура зашиты в примитив, а не в потребителя; Angular CDK даёт для этого a11y-утилиты и harness. Сверху паттерны — формы и таблицы из примитивов. Ключевые принципы: стабильность API со строгим semver и периодом депрекации, тематизация через токены, а не форки компонентов, и минимум зависимостей — библиотека не должна тянуть конкретный state-менеджер. В монорепо это отдельная ui-lib с тегами, в полирепо — версионированный npm-пакет с жёстким релизным процессом. Главный риск — over-abstraction: API с десятками пропсов хуже, чем несколько чётких вариантов. Тестирую визуальной регрессией через Chromatic или снапшоты Playwright, юнитами на логику взаимодействия и harness-тестами на контракт.

## Ловушки

- **Бизнес-логика внутри примитива.** \`ds-button\`, который сам знает про права пользователя, перестаёт быть переиспользуемым — а это вся ценность.
- **Over-abstraction.** Двадцать пропсов «на все случаи» дают двадцать несовместимых кнопок. Ограниченный набор вариантов сильнее гибкости.
- **Версионный скос в полирепо:** одна команда на v3, другая на v1, баг-фикс приходится бэкпортировать в обе.
- **Форк компонента ради темы** вместо токена — и вот у вас две реализации диалога, которые расходятся.
- **A11y «потом».** Дописывать фокус-трап и ARIA в уже разошедшийся по продуктам компонент дороже в разы, чем заложить сразу.
- **Спросят следом:** как проводить ломающее изменение (codemod плюс мажор плюс параллельная поддержка старого API) и как мерить принятие дизайн-системы (доля экранов на примитивах, число локальных «своих» кнопок).`,
      en: `## In short

A design system has **three floors**: tokens (raw values — colours, spacing, type), primitives (\`Button\`, \`Input\`, \`Dialog\`), and patterns assembled from primitives (forms, tables). The lower the floor, the more stable its API has to be.

Analogy: Lego. Tokens are the plastic and the colours the bricks are moulded from. Primitives are the bricks themselves: few kinds, perfect fit, and the stud spacing never changes. Patterns are the finished models in the instruction booklet. If the manufacturer ever changed the stud spacing, every house ever built would collapse — which is exactly why touching a primitive's API is the scariest change of all.

## How it works, step by step

1. **Start with tokens**, not components. Colours, spacing, typography as a single source of truth, usually CSS custom properties. Then theming changes **without rebuilding components**.
2. **Build primitives**: presentational, no business logic, accessible by default. Focus, ARIA and keyboard handling are baked in, not left to the consumer. Angular CDK supplies a11y utilities and component harnesses.
3. **Assemble patterns** — forms, tables, filters — out of primitives rather than around them.
4. **Freeze the contract**: strict semver and a deprecation window, because a breaking component change is pain for every team at once.
5. **Decide on delivery**: in a monorepo a dedicated \`ui\` lib with tags and enforced boundaries; in polyrepo a versioned npm package with a rigorous release process.
6. **Keep dependencies minimal**: the library must not drag a particular state manager along.

## Example

\`\`\`css
:root { --ds-color-primary: #2563eb; --ds-space-2: 8px; --ds-radius-md: 6px; }
[data-theme='dark'] { --ds-color-primary: #60a5fa; }
\`\`\`

\`\`\`ts
@Component({ selector: 'ds-button', changeDetection: ChangeDetectionStrategy.OnPush })
export class DsButtonComponent { @Input() variant: 'primary' | 'ghost' | 'danger' = 'primary'; }
\`\`\`

Why this works: the theme flips with one attribute on \`<html>\` instead of forking components. And there are exactly three variants — a fixed list beats twenty props like \`color\`, \`bg\`, \`borderWidth\` that teams will use to build twenty different "primaries".

## What to say in the interview

> I build a design system in layers. At the bottom, design tokens — colours, spacing, typography as a single source of truth via CSS custom properties, so themes change without rebuilding components. Above that, primitives: Button, Input, Dialog — presentational, no business logic, accessible by default, with focus, ARIA and keyboard behaviour baked into the primitive rather than the consumer; Angular CDK gives you a11y utilities and harnesses for that. On top, patterns like forms and tables composed from primitives. The key principles are API stability with strict semver and deprecation windows, theming through tokens instead of component forks, and minimal dependencies — the library shouldn't pull in a specific state manager. In a monorepo it's a tagged ui lib; in polyrepo a versioned npm package with a strict release process. The biggest risk is over-abstraction: an API with dozens of props is worse than a few clear variants. I test it with visual regression via Chromatic or Playwright snapshots, unit tests on interaction logic, and harness tests for the contract.

## Gotchas

- **Business logic inside a primitive.** A \`ds-button\` that knows about user permissions stops being reusable — and reuse was the whole point.
- **Over-abstraction.** Twenty "just in case" props yield twenty incompatible buttons. A constrained variant list beats flexibility.
- **Version skew in polyrepo:** one team on v3, another on v1, and every bugfix has to be backported to both.
- **Forking a component to theme it** instead of using a token — now you maintain two dialogs that slowly diverge.
- **Accessibility "later".** Retrofitting a focus trap and ARIA into a component already spread across products costs many times more than building it in.
- **Follow-ups:** how you land a breaking change (codemod plus a major plus a parallel-support window), and how you measure adoption (share of screens built on primitives, count of local one-off buttons).`,
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
      ru: `## Коротко

Monorepo — **один репозиторий на много проектов**; polyrepo — по репозиторию на проект или команду. Выбор сводится к одному вопросу: что вам дороже обходится — **координация или изоляция**.

Аналогия: monorepo — большая общая квартира с общей кухней. Переставить мебель во всех комнатах разом легко, посуда одна на всех, но нужны правила, иначе бардак и шум. Polyrepo — отдельные квартиры: тихо, у каждого свой ключ и свой ремонт, но чтобы всем поменять одинаковые розетки, придётся обойти каждую квартиру и договориться с каждым жильцом.

## Плюсы, минусы и когда что

1. **Monorepo, плюсы:** атомарные изменения через несколько пакетов в **одном PR**; единый тулинг, версии зависимостей и стандарты; простой code-sharing и рефакторинг с глобальной видимостью. С Nx/Turborepo граф \`affected\` и кэш держат CI быстрым несмотря на размер.
2. **Monorepo, минусы:** без инфраструктуры (Nx, кэш, граф) CI деградирует; без enforce-границ появляется **жёсткая связанность**; контроль доступа на уровне репо грубее; огромная git-история и медленные операции без оптимизаций.
3. **Polyrepo, плюсы:** сильная изоляция, независимые владение, доступы и релизы; простая ментальная модель — один репозиторий помещается в голову.
4. **Polyrepo, минусы:** **версионный ад** разделяемых пакетов — смена API требует скоординированных релизов; дублирование тулинга и дрейф стандартов; кросс-репо рефакторинг болезненный.
5. **Берём monorepo,** когда это одна организация с множеством взаимозависимых фронтенд-проектов, общей дизайн-системой и утилитами, и вы хотите атомарные рефакторинги.
6. **Берём polyrepo,** когда продукты слабо связаны, живут в разных организациях или комплаенс-границах и релизятся независимо.

## Пример

\`\`\`bash
# monorepo: правка API библиотеки и все её потребители — один PR, один зелёный CI
nx affected -t lint test build --base=origin/main

# polyrepo: то же изменение
# 1) PR в ui-kit  2) релиз ui-kit@3.0.0  3) PR в app-a  4) PR в app-b  5) молиться
\`\`\`

Почему так: в монорепо компилятор проверяет совместимость **в момент правки**, в полирепо — только после релиза пакета, у каждого потребителя отдельно и в разное время.

## Что сказать на собеседовании

> Monorepo — один репозиторий на много проектов, polyrepo — репозиторий на проект. Monorepo даёт атомарные изменения через несколько пакетов в одном PR, единый тулинг и версии, простой шаринг кода и рефакторинг с глобальной видимостью; с Nx или Turborepo граф affected и кэш держат CI быстрым несмотря на размер. Цена — нужна инфраструктура, иначе CI деградирует, нужны enforce-границы, иначе всё связывается со всем, и контроль доступа на уровне репозитория грубее. Polyrepo даёт сильную изоляцию, независимые релизы и простую ментальную модель, но платит версионным адом разделяемых пакетов, дублированием тулинга и болезненными кросс-репо рефакторингами. Ключевой вопрос — стоимость координации против стоимости изоляции: monorepo переносит сложность в тулинг, polyrepo — в процессы релизов. Практически: одна организация с взаимозависимыми проектами и общей дизайн-системой — monorepo; слабо связанные продукты в разных орг- или комплаенс-границах — polyrepo.

## Ловушки

- **Monorepo без границ** — это не монорепо, а монолит: через год всё импортирует всё, и разделить уже нельзя.
- **Monorepo без кэша и \`affected\`:** CI на 40 минут для правки одной строки убивает всю выгоду.
- **Путать монорепо с монолитом деплоя.** В монорепо приложения по-прежнему деплоятся независимо — это разные оси.
- **Polyrepo и «мы просто быстро зарелизим пакет»:** на практике потребители обновляются месяцами, и вы поддерживаете три мажора одновременно.
- **Копипаста вместо shared-пакета** в полирепо — фикс безопасности придётся вносить в семь мест, и в двух про него забудут.
- **Спросят следом:** как в монорепо давать разные права на разные части (CODEOWNERS плюс правила на путях) и как мигрировать из полирепо в монорепо, сохранив историю (\`git subtree\`/\`filter-repo\` по одному проекту).`,
      en: `## In short

A monorepo is **one repository holding many projects**; a polyrepo is one repository per project or team. The choice comes down to a single question: which costs you more — **coordination or isolation**?

Analogy: a monorepo is one big flat with a shared kitchen. Rearranging furniture in every room at once is easy and there's one set of dishes, but you need house rules or it turns into noise and chaos. A polyrepo is separate flats: quiet, everyone has their own key and their own renovation — but to change the same power socket everywhere you must visit each flat and negotiate with each tenant.

## Pros, cons, and when to pick which

1. **Monorepo, pros:** atomic changes across several packages in **one PR**; unified tooling, dependency versions and standards; easy code sharing and refactoring with global visibility. With Nx/Turborepo, the \`affected\` graph and the cache keep CI fast despite the size.
2. **Monorepo, cons:** without infrastructure (Nx, cache, graph) CI degrades; without enforced boundaries you get **tight coupling**; repo-level access control is coarse; a huge git history and slow operations unless optimized.
3. **Polyrepo, pros:** strong isolation with independent ownership, access and releases; a simple mental model — one repo fits in your head.
4. **Polyrepo, cons:** **versioning hell** for shared packages — an API change requires coordinated releases; duplicated tooling and standards drift; cross-repo refactoring is painful.
5. **Pick monorepo** when it's one organization with many interdependent frontend projects, a shared design system and utilities, and you want atomic refactors.
6. **Pick polyrepo** when products are loosely coupled, sit in different orgs or compliance boundaries, and release on independent lifecycles.

## Example

\`\`\`bash
# monorepo: change a library API and every consumer in one PR, one green CI run
nx affected -t lint test build --base=origin/main

# polyrepo: the same change
# 1) PR in ui-kit  2) release ui-kit@3.0.0  3) PR in app-a  4) PR in app-b  5) pray
\`\`\`

Why this matters: in a monorepo the compiler verifies compatibility **at the moment of the edit**; in a polyrepo only after the package is released, separately for each consumer, at different times.

## What to say in the interview

> A monorepo is one repository for many projects, a polyrepo is one repository per project. The monorepo buys atomic changes across packages in a single PR, unified tooling and versions, easy code sharing and refactors with global visibility; with Nx or Turborepo the affected graph and cache keep CI fast despite the size. The cost is that you need that infrastructure or CI degrades, you need enforced boundaries or everything couples to everything, and repo-level access control is coarser. The polyrepo buys strong isolation, independent releases and a simple mental model, and pays with versioning hell for shared packages, duplicated tooling and painful cross-repo refactoring. The core question is coordination cost versus isolation cost: a monorepo pushes complexity into tooling, a polyrepo into release processes. Practically: one org with interdependent projects and a shared design system → monorepo; loosely coupled products across org or compliance boundaries → polyrepo.

## Gotchas

- **A monorepo without boundaries** isn't a monorepo, it's a monolith: a year later everything imports everything and it can't be split.
- **A monorepo without caching and \`affected\`:** a 40-minute CI run for a one-line change destroys the entire benefit.
- **Confusing monorepo with monolithic deployment.** Apps in a monorepo still deploy independently — these are separate axes.
- **Polyrepo and "we'll just ship the package quickly":** in practice consumers upgrade over months and you support three majors at once.
- **Copy-paste instead of a shared package** in polyrepo means a security fix must land in seven places, and two of them will be forgotten.
- **Follow-ups:** how you grant different permissions to different parts of a monorepo (CODEOWNERS plus path rules), and how you migrate polyrepo → monorepo preserving history (\`git subtree\`/\`filter-repo\`, one project at a time).`,
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
      ru: `## Коротко

Обе модели отвечают на вопрос «каких тестов сколько писать». **Пирамида** (Mike Cohn): широкий фундамент из unit-тестов, поменьше интеграционных, совсем чуть-чуть e2e. **Трофей** (Kent C. Dodds, специально про фронтенд): внизу статика — типы и линт, а самая широкая часть — **интеграционные** тесты; unit и e2e тоньше.

Аналогия: дом. Фундамент дешёвый, быстрый и держит всё — это unit и статика. Крыша дорогая, ставится долго и в ветер шатается — это e2e. Дом только из крыши не стоит, дом из одного фундамента бесполезен. Разница между пирамидой и трофеем в том, что во фронтенде «фундамент» — это не микротесты каждой функции, а типы плюс проверка того, что экран целиком работает.

## Три уровня и что где брать

1. **Статика (только в трофее).** TypeScript и ESLint ловят целый класс багов бесплатно, без единого написанного теста. Это самый дешёвый уровень уверенности.
2. **Unit** — для **чистой логики**: утилиты, редьюсеры, форматтеры, алгоритмы. Быстрые, стабильные, точечные.
3. **Integration / component** — **основной объём во фронтенде**: компонент вместе с шаблоном и сервисами, сеть замокана на HTTP-границе. Проверяет то, что видит пользователь, и переживает рефакторинг.
4. **e2e** — критичные пользовательские сценарии: логин, оплата. Мало, потому что дорого и flaky.
5. **Почему для фронтенда именно трофей:** UI-юниты часто проверяют детали реализации, ломаются от любого рефакторинга и дают низкую отдачу на реальную надёжность. Интеграционный тест компонента с настоящим DOM и замоканной сетью проверяет поведение, а не устройство.

## Пример

\`\`\`ts
// integration: проверяем поведение, а не внутренности
it('shows an error when saving fails', async () => {
  render(OrderFormComponent, { providers: [{ provide: OrdersApi, useValue: failingApi }] });
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
});
\`\`\`

Почему так: тест не знает ни имён приватных методов, ни структуры шаблона — он ищет элементы так же, как их находит пользователь (по роли и тексту). Переименуйте метод или перепишите вёрстку — тест останется зелёным. Сломается он только если сломается поведение.

## Что сказать на собеседовании

> Пирамида Кона — это много unit внизу, меньше integration, минимум e2e; логика в том, что чем выше уровень, тем тест дороже, медленнее и более flaky. Трофей Кента Доддса адаптирует это под фронтенд: в основании статический анализ — типы и линт, самая широкая часть — интеграционные тесты, а unit и e2e тоньше. Девиз — тестируй поведение, а не реализацию. Для фронтенда я выбираю трофей, потому что UI-юниты обычно проверяют детали реализации, ломаются при любом рефакторинге и дают низкую отдачу на надёжность, а интеграционный тест компонента с реальным DOM и замоканной на HTTP-границе сетью проверяет ровно то, что важно пользователю. Раскладка такая: unit — на чистую логику вроде утилит, редьюсеров и форматтеров; integration — основной объём; e2e — только критичные сценарии вроде логина и оплаты. Главный анти-паттерн — перевёрнутый рожок мороженого, когда e2e много, а unit мало: CI медленный и нестабильный.

## Ловушки

- **Ice-cream cone.** Много e2e и мало unit: сорокаминутный CI, который падает через раз и которому перестают верить.
- **100% coverage как цель.** Покрытие не гарантирует, что фичи работают вместе; можно покрыть всё и не поймать ни одного реального бага.
- **Тесты на детали реализации:** проверка приватных методов, вызовов конкретных функций, CSS-классов вместо ролей — такие тесты ломает любой рефакторинг.
- **Мок не на той границе.** Мокать сервис приложения вместо HTTP означает, что тест перестаёт проверять собственный код приложения.
- **e2e на все ветки** вместо happy path: время прогона растёт линейно, а ценность — нет.
- **Спросят следом:** где именно вы ставите границу мока (HTTP через MSW/\`HttpTestingController\`), что делать с flaky e2e (карантин плюс расследование, а не \`retry: 3\` навсегда) и почему статика — часть тестовой стратегии.`,
      en: `## In short

Both models answer "how many of each kind of test should I write". The **pyramid** (Mike Cohn): a wide foundation of unit tests, fewer integration tests, very few e2e. The **trophy** (Kent C. Dodds, specifically for frontend): static analysis at the base — types and lint — with **integration** tests as the widest part, and unit and e2e thinner.

Analogy: a house. The foundation is cheap, fast, and holds everything up — that's unit tests and static analysis. The roof is expensive, slow to build and rattles in the wind — that's e2e. A house that's only a roof doesn't stand; a house that's only a foundation is useless. The difference between pyramid and trophy is that on the frontend the "foundation" isn't micro-testing every function — it's types plus proving that a whole screen works.

## Three levels and what belongs where

1. **Static analysis (trophy only).** TypeScript and ESLint catch a whole class of bugs for free, without a single test written. It's the cheapest confidence you can buy.
2. **Unit** — for **pure logic**: utilities, reducers, formatters, algorithms. Fast, stable, precise.
3. **Integration / component** — **the bulk of frontend testing**: the component with its template and services, network mocked at the HTTP boundary. It checks what the user sees and survives refactoring.
4. **e2e** — critical user journeys: login, checkout. Few of them, because they're expensive and flaky.
5. **Why the trophy fits the frontend:** UI unit tests usually assert implementation details, break on every refactor, and give a poor return on real reliability. An integration test with real DOM and a mocked network tests behaviour, not construction.

## Example

\`\`\`ts
// integration: assert behaviour, not internals
it('shows an error when saving fails', async () => {
  render(OrderFormComponent, { providers: [{ provide: OrdersApi, useValue: failingApi }] });
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
});
\`\`\`

Why this works: the test knows nothing about private method names or template structure — it finds elements the way a user does, by role and text. Rename a method or rewrite the markup and it stays green. It only fails when behaviour actually breaks.

## What to say in the interview

> Cohn's pyramid is many unit tests at the bottom, fewer integration, minimal e2e; the reasoning is that the higher you go, the costlier, slower and flakier the test. Kent Dodds's trophy adapts that for the frontend: static analysis at the base — types and lint — integration tests as the widest band, with unit and e2e thinner. The motto is test behaviour, not implementation. I pick the trophy for frontend because UI unit tests typically assert implementation details, break on any refactor and give a low reliability return, while an integration test of a component with real DOM and the network mocked at the HTTP boundary checks exactly what matters to the user. The split I use: unit for pure logic like utilities, reducers and formatters; integration as the bulk; e2e only for critical journeys like login and checkout. The main anti-pattern is the ice-cream cone — lots of e2e and few unit tests — which gives you a slow, unstable CI.

## Gotchas

- **The ice-cream cone.** Many e2e, few unit: a forty-minute pipeline that fails half the time and that nobody trusts any more.
- **100% coverage as a goal.** Coverage doesn't prove features work together; you can cover everything and catch no real bug.
- **Testing implementation details:** asserting private methods, specific function calls, or CSS classes instead of roles — any refactor breaks them.
- **Mocking at the wrong boundary.** Mocking your own app service instead of HTTP means the test stops exercising your own code.
- **e2e for every branch** instead of the happy path: runtime grows linearly, value doesn't.
- **Follow-ups:** exactly where you draw the mocking boundary (HTTP, via MSW or \`HttpTestingController\`), what you do with flaky e2e (quarantine plus investigation, not a permanent \`retry: 3\`), and why static analysis counts as part of the test strategy.`,
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
      ru: `## Коротко

Вопрос только в одном: **рендерим ли мы настоящих детей компонента или подменяем их картонными заглушками**. Deep — настоящие дети, всё по-честному. Shallow — дети заменены на пустышки с теми же селекторами и \`@Input\`/\`@Output\`.

Аналогия: краш-тест автомобиля. Deep — вы сажаете в машину живого человека: максимально реалистично, но дорого, страшно и результат зависит от того, как человек себя чувствовал. Shallow — сажаете манекен: быстро, повторяемо, вы проверяете именно конструкцию кузова. Только не забывайте, что манекен не расскажет, удобно ли на самом деле сидеть.

## Как это работает по шагам

1. **Deep (integration) тест** рендерит компонент **со всеми реальными детьми**. Проверяет, что шаблон и поведение действительно стыкуются с дочерними компонентами.
   - Плюс: ловит настоящие баги взаимодействия, ближе к пользователю.
   - Минус: хрупкий (падает из-за поломок в детях), медленный, тянет в TestBed кучу зависимостей.
2. **Shallow тест** изолирует компонент, **заменяя детей заглушками**: mock-компоненты с тем же селектором и тем же контрактом \`@Input\`/\`@Output\`.
   - Плюс: быстро, фокус на логике именно этого компонента, изменения в детях его не ломают.
   - Минус: интеграционные баги не ловятся вообще.
3. Есть два способа сделать shallow: **явные mock-компоненты** (безопасно, помогает \`ngMocks\`) и **\`NO_ERRORS_SCHEMA\`** (проще, но опасно).
4. \`NO_ERRORS_SCHEMA\` глушит **все** неизвестные теги и атрибуты — то есть опечатка в селекторе дочернего компонента пройдёт молча, и тест будет зелёным на сломанном шаблоне.
5. **Рекомендация:** shallow для сложной логики родителя, deep для критичных интеграций. И в обоих случаях тестируйте **контракт и поведение** (входы, выходы, отрендеренный результат), а не приватные детали.

## Пример

\`\`\`ts
TestBed.configureTestingModule({
  imports: [ParentComponent],
  // shallow: подменяем дитя
}).overrideComponent(ParentComponent, { set: { imports: [MockChildComponent] } });
\`\`\`

Почему так: \`MockChildComponent\` объявляет те же \`@Input\`/\`@Output\`, что и настоящий, поэтому шаблон родителя всё ещё проверяется компилятором. Замените это на \`NO_ERRORS_SCHEMA\` — и проверка исчезнет вместе с ошибками.

## Что сказать на собеседовании

> Deep-тест рендерит компонент со всеми реальными дочерними компонентами и проверяет интеграцию шаблона с ними: он ловит настоящие баги взаимодействия и ближе к пользователю, но медленнее, хрупче и тянет в TestBed много зависимостей — падает из-за поломок в детях. Shallow изолирует компонент, подменяя детей заглушками с тем же селектором и тем же контрактом входов-выходов: быстро, сфокусировано на логике родителя, устойчиво к изменениям в детях, но интеграционные баги не ловит. Отдельно важно: заглушки я делаю явными mock-компонентами, например через ngMocks, а не через \`NO_ERRORS_SCHEMA\` — схема проще, но глушит реальные ошибки шаблона, и опечатка в селекторе проходит молча. Практика: shallow для сложной логики родителя, deep для критичных интеграций, и в обоих случаях тестируем контракт — входы, выходы, отрендеренный результат, — а не приватные детали.

## Ловушки

- **\`NO_ERRORS_SCHEMA\` как «заткнуть ошибки»** — самая частая ошибка. Тест зелёный, шаблон сломан, компонент в проде не рендерится.
- **Мок с другим контрактом.** Заглушка без нужного \`@Output\` делает тест бессмысленным: родитель «эмитит в пустоту».
- **Deep-тест, который на самом деле e2e:** подтянули реальные сервисы и HTTP — и получили медленный flaky тест, который валится по чужой вине.
- **Проверка приватных методов и CSS-классов** вместо ролей и текста — любой рефакторинг красит CI в красный.
- **Забытый \`fixture.detectChanges()\`** (или \`ComponentFixtureAutoDetect\`): DOM не обновился, тест падает «непонятно почему».
- **Спросят следом:** чем это отличается от подхода Testing Library (там deep по умолчанию и запрос по ролям) и когда вместо TestBed достаточно просто создать класс компонента через \`new\` (когда логики много, а шаблона нет).`,
      en: `## In short

It comes down to one thing: **do we render the component's real children, or swap them for cardboard stand-ins**. Deep means real children, everything for real. Shallow means children replaced by stubs with the same selector and the same \`@Input\`/\`@Output\` contract.

Analogy: a car crash test. Deep is putting a real person in the car — maximally realistic, but expensive, scary, and the result depends on how that person felt that day. Shallow is the dummy: fast, repeatable, and it tests exactly the body structure. Just remember the dummy will never tell you whether the seat is actually comfortable.

## How it works, step by step

1. **A deep (integration) test** renders the component **with all real children**. It verifies that the template and behaviour genuinely line up with the child components.
   - Pro: catches real interaction bugs, closer to the user.
   - Con: fragile (fails because of breakage in children), slower, drags a pile of dependencies into TestBed.
2. **A shallow test** isolates the component, **stubbing the children**: mock components with the same selector and the same \`@Input\`/\`@Output\` contract.
   - Pro: fast, focused on this component's own logic, unaffected by changes in children.
   - Con: it catches no integration bugs at all.
3. There are two ways to go shallow: **explicit mock components** (safe; \`ngMocks\` helps) and **\`NO_ERRORS_SCHEMA\`** (simpler but dangerous).
4. \`NO_ERRORS_SCHEMA\` silences **every** unknown tag and attribute — so a typo in a child selector passes silently and your test stays green on a broken template.
5. **Recommendation:** shallow for complex parent logic, deep for critical integrations. In both cases test the **contract and behaviour** (inputs, outputs, rendered output), not private details.

## Example

\`\`\`ts
TestBed.configureTestingModule({
  imports: [ParentComponent],
  // shallow: replace the child
}).overrideComponent(ParentComponent, { set: { imports: [MockChildComponent] } });
\`\`\`

Why this works: \`MockChildComponent\` declares the same \`@Input\`/\`@Output\` as the real one, so the parent's template is still compiler-checked. Swap it for \`NO_ERRORS_SCHEMA\` and that checking disappears along with the errors.

## What to say in the interview

> A deep test renders the component with all its real children and verifies template integration with them: it catches genuine interaction bugs and is closer to the user, but it's slower, more fragile and pulls a lot of dependencies into TestBed — it fails when a child breaks. A shallow test isolates the component by stubbing children with the same selector and the same input/output contract: fast, focused on the parent's logic, resilient to child changes, but it catches no integration bugs. One thing I'm strict about: I stub with explicit mock components, e.g. via ngMocks, rather than \`NO_ERRORS_SCHEMA\` — the schema is simpler but silences real template errors, so a selector typo passes unnoticed. In practice: shallow for complex parent logic, deep for critical integrations, and in both cases test the contract — inputs, outputs, rendered output — not private details.

## Gotchas

- **\`NO_ERRORS_SCHEMA\` used to "shut errors up"** is the classic mistake. Green test, broken template, nothing renders in production.
- **A stub with a different contract.** A mock missing the needed \`@Output\` makes the test meaningless: the parent emits into the void.
- **A deep test that is really an e2e:** you wired in real services and HTTP, and now you have a slow, flaky test that fails for someone else's reasons.
- **Asserting private methods and CSS classes** instead of roles and text — any refactor turns CI red.
- **A forgotten \`fixture.detectChanges()\`** (or \`ComponentFixtureAutoDetect\`): the DOM never updates and the test fails "for no reason".
- **Follow-ups:** how this differs from the Testing Library approach (deep by default, queries by role), and when you can skip TestBed entirely and just \`new\` the component class (lots of logic, no template).`,
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
      ru: `## Коротко

Это **пять степеней «поддельности»** зависимости в тесте — от совсем пустышки до почти настоящей реализации. Классификация Джерарда Мезароса; на практике важно не заучить названия, а понимать, что вы проверяете: **результат** или **факт вызова**.

Аналогия: съёмки фильма. Dummy — манекен на заднем плане, его никто не касается. Stub — актёр, который произносит одну заранее написанную реплику. Spy — тот же актёр, но с диктофоном: потом можно послушать, что ему сказали. Mock — актёр с требованием в контракте: «мне обязаны сказать три реплики, иначе я срываю съёмку». Fake — настоящий работающий реквизит, только дешёвый: пистолет стреляет холостыми.

## Пять видов и когда что

1. **Dummy** — объект, который передают только чтобы заполнить параметр; он не используется вообще. Например, \`null\` или пустой объект как неважный аргумент.
2. **Stub** — возвращает заранее заданные ответы, чтобы провести тест по нужной ветке. Взаимодействия не проверяет.
3. **Spy** — оборачивает реальный или поддельный объект и **записывает вызовы**: аргументы, количество, порядок — чтобы проверить их потом.
4. **Mock** — объект с **заранее заданными ожиданиями**. Если ожидаемый вызов не произошёл, тест падает. Это behaviour verification.
5. **Fake** — рабочая, но упрощённая реализация: in-memory репозиторий вместо настоящей БД.
6. **В Jest/Jasmine границы размыты:** \`jest.fn()\` и \`spyOn\` совмещают stub и spy в одном объекте, поэтому спор о терминах на практике сводится к вопросу «что вы утверждаете в \`expect\`».

## Пример

\`\`\`ts
const repo = { save: jest.fn().mockResolvedValue({ id: 1 }) }; // stub + spy
service.create(dto);
expect(repo.save).toHaveBeenCalledWith(dto); // verification — mock-стиль
\`\`\`

Почему так: \`mockResolvedValue\` — это stub-часть (даёт нужный ответ), \`toHaveBeenCalledWith\` — mock-часть (проверяет факт вызова). Второе привязывает тест к реализации сильнее, поэтому применяйте его только там, где сам вызов и есть наблюдаемый эффект.

## Что сказать на собеседовании

> По классификации Мезароса это пять видов test double. Dummy передаётся только чтобы заполнить параметр и не используется. Stub возвращает заранее заданные ответы и ведёт тест по нужной ветке, но взаимодействия не проверяет. Spy оборачивает объект и записывает вызовы — аргументы и количество — для последующей проверки. Mock содержит заранее заданные ожидания и роняет тест, если ожидаемый вызов не произошёл. Fake — рабочая, но упрощённая реализация, например in-memory репозиторий вместо БД. В Jest и Jasmine границы размыты: \`jest.fn()\` и \`spyOn\` совмещают stub и spy. Практически я выбираю по типу проверки: state verification через stub или fake — проверяю результат и состояние, это устойчиво к рефакторингу; behaviour verification через mock или spy — только для зависимостей-сайдэффектов вроде логирования или отправки письма. Главный анти-паттерн — over-mocking: когда замокано всё, тест проверяет, что код вызывает сам себя так, как написан, а не что он работает.

## Ловушки

- **Over-mocking.** Если в тесте пять моков, вы тестируете свою же реализацию. Такой тест никогда не поймает баг, зато сломается от любого рефакторинга.
- **Мок, который «умнее» оригинала:** возвращает синхронно то, что в реальности асинхронно, или никогда не бросает ошибку — тест зелёный, прод падает.
- **\`toHaveBeenCalledTimes\` на всё подряд.** Количество вызовов — деталь реализации, если только это не платёж или письмо.
- **Fake без тестов на сам fake.** In-memory репозиторий с багом даёт ложную уверенность во всех тестах сразу.
- **Незачищенные спаи между тестами** (\`jest.restoreAllMocks\`) — тесты начинают влиять друг на друга и падать в зависимости от порядка.
- **Спросят следом:** что предпочесть для HTTP (fake-сервер вроде MSW или \`HttpTestingController\` вместо мока сервиса) и почему state verification обычно надёжнее behaviour verification.`,
      en: `## In short

These are **five degrees of fakeness** for a dependency in a test — from a total dud to an almost-real implementation. The taxonomy is Gerard Meszaros's; in practice what matters isn't memorising names but knowing what you're asserting: **the result** or **the fact that a call happened**.

Analogy: a film set. A dummy is the mannequin in the background nobody touches. A stub is an extra who delivers one pre-written line. A spy is the same extra wearing a recorder — afterwards you can replay what was said to them. A mock is an actor with a contract clause: "I must be given three lines or I walk off". A fake is real working kit, just cheap: the gun fires blanks.

## The five kinds and when to use which

1. **Dummy** — an object passed only to fill a parameter; never actually used. E.g. \`null\` or an empty object as an irrelevant argument.
2. **Stub** — returns canned answers to drive the test down a chosen branch. Verifies no interactions.
3. **Spy** — wraps a real or fake object and **records calls**: arguments, counts, order — so you can assert on them later.
4. **Mock** — an object with **preprogrammed expectations**. If an expected call doesn't happen, the test fails. That's behaviour verification.
5. **Fake** — a working but simplified implementation: an in-memory repository instead of a real database.
6. **In Jest/Jasmine the lines blur:** \`jest.fn()\` and \`spyOn\` are stub and spy in one object, so the terminology debate collapses to "what does your \`expect\` actually assert".

## Example

\`\`\`ts
const repo = { save: jest.fn().mockResolvedValue({ id: 1 }) }; // stub + spy
service.create(dto);
expect(repo.save).toHaveBeenCalledWith(dto); // verification — mock style
\`\`\`

Why this works: \`mockResolvedValue\` is the stub half (it supplies the answer), \`toHaveBeenCalledWith\` is the mock half (it asserts the call). The second couples the test to the implementation far more, so use it only where the call itself *is* the observable effect.

## What to say in the interview

> Meszaros's taxonomy gives five kinds of test double. A dummy is passed only to fill a parameter and never used. A stub returns canned answers to drive the test down a branch but verifies no interactions. A spy wraps an object and records calls — arguments and counts — for later assertions. A mock carries preprogrammed expectations and fails the test if an expected call never happens. A fake is a working but simplified implementation, like an in-memory repository instead of a database. In Jest and Jasmine the boundaries blur, since \`jest.fn()\` and \`spyOn\` combine stub and spy. Practically I choose by what I'm verifying: state verification with a stub or fake — assert the result and the state, which survives refactoring; behaviour verification with a mock or spy — only for side-effect dependencies like logging or sending email. The big anti-pattern is over-mocking: with everything mocked, the test proves the code calls itself the way it's written, not that it works.

## Gotchas

- **Over-mocking.** Five mocks in one test means you're testing your own implementation. It'll never catch a bug but will break on every refactor.
- **A mock "smarter" than the original:** it returns synchronously what's really async, or never throws — green test, broken production.
- **\`toHaveBeenCalledTimes\` everywhere.** Call counts are an implementation detail unless the call is a payment or an email.
- **A fake with no tests of its own.** A buggy in-memory repository gives false confidence across every test at once.
- **Spies not reset between tests** (\`jest.restoreAllMocks\`) — tests start influencing each other and fail depending on order.
- **Follow-ups:** what you'd use for HTTP (a fake server like MSW, or \`HttpTestingController\`, rather than mocking the service), and why state verification is generally more robust than behaviour verification.`,
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
      ru: `## Коротко

Marble testing — это способ **нарисовать поток строкой ASCII** и сравнить нарисованное с тем, что реально выдал оператор. \`TestScheduler\` при этом крутит **виртуальное время**: \`debounceTime(300)\` отрабатывает мгновенно и всегда одинаково, никаких реальных задержек и никакой флакки.

Аналогия: нотная запись. Вместо «сыграй и послушай, вроде похоже» вы пишете партитуру: вот здесь нота, здесь пауза на два такта, здесь конец. Две партитуры можно сравнить символ в символ, не проигрывая музыку в реальном времени. Мраморная диаграмма — это партитура для Observable.

## Как это работает по шагам

1. Создаём \`TestScheduler\` и запускаем всё внутри \`testScheduler.run(...)\` — там время виртуальное.
2. Описываем источник строкой мраморов через \`cold()\` или \`hot()\`.
3. Строим результат обычным \`pipe(...)\`.
4. Через \`expectObservable(result$).toBe(...)\` описываем **ожидаемую** диаграмму.
5. Синтаксис мраморов:
   - \`-\` — один кадр времени (frame);
   - \`a\`, \`b\` — эмиссии значений (сами значения передаются вторым аргументом);
   - \`|\` — complete, \`#\` — error;
   - \`()\` — синхронная группировка нескольких событий в одном кадре;
   - \`^\` — точка подписки, только для hot observables.
6. Почему это лучше \`fakeAsync\` для RxJS: одна строка одновременно описывает **значения, тайминг и завершение**, и сравнение идёт декларативно — точнее, чем ручные \`tick()\` вперемешку с ассертами.

## Пример

\`\`\`ts
testScheduler.run(({ cold, expectObservable }) => {
  const source$ = cold('-a--b--c|', { a: 1, b: 2, c: 3 });
  const result$ = source$.pipe(map(x => x * 10));
  expectObservable(result$).toBe('-a--b--c|', { a: 10, b: 20, c: 30 });
});
\`\`\`

\`\`\`ts
// оператор времени: debounce получает тот же виртуальный планировщик
const result$ = source$.pipe(debounceTime(20, testScheduler));
expectObservable(result$).toBe('-----x|', { x: 'last' });
\`\`\`

Почему так: ожидание — это тоже диаграмма, а не набор из «эмитнул столько-то раз». Если оператор сдвинет значение на один кадр, тест это увидит; обычный \`subscribe\` с массивом значений такой сдвиг не заметит.

## Что сказать на собеседовании

> Marble testing описывает асинхронные потоки ASCII-диаграммами и виртуальным временем: \`TestScheduler\` прокручивает время синхронно, поэтому даже \`debounceTime\` и \`delay\` становятся детерминированными. В диаграмме дефис — это один кадр времени, буква — эмиссия значения, вертикальная черта — complete, решётка — error, круглые скобки — синхронная группировка в одном кадре, крышечка — точка подписки для hot-потоков. Для RxJS это точнее, чем \`fakeAsync\` с ручными \`tick\`, потому что одна строка описывает сразу значения, тайминг и завершение, и сравнение идёт декларативно. Отдельно полезен \`expectSubscriptions\` — он проверяет, когда была подписка и отписка, и ловит утечки. Главный подвох — единицы измерения: внутри \`run()\` один дефис равен одному кадру, а \`debounceTime(20)\` считается в виртуальных миллисекундах, их надо согласовывать. Для простых синхронных потоков marble избыточен — там хватает обычного \`subscribe\` с ассертом.

## Ловушки

- **Путаница кадров и миллисекунд.** \`-\` — один кадр, а \`debounceTime(20)\` — 20 виртуальных мс. Несогласованность даёт диаграммы, которые «почти сходятся».
- **\`cold\` вместо \`hot\` и наоборот.** \`cold()\` — каждая подписка получает свою копию с нуля; \`hot()\` — общий источник, где значения до \`^\` теряются. Перепутали — получили несуществующий баг.
- **Реальные таймеры внутри \`run()\`:** если оператор создан без переданного планировщика, а код использует глобальный \`setTimeout\`, виртуальное время его не увидит.
- **Забытый \`expectSubscriptions\`** — самый простой способ доказать, что \`switchMap\` действительно отменил предыдущую подписку.
- **Marble ради marble.** Для \`of(1).pipe(map(...))\` диаграмма только усложняет чтение.
- **Спросят следом:** как протестировать \`switchMap\` с отменой (две диаграммы плюс \`expectSubscriptions\`) и чем \`TestScheduler\` отличается от \`fakeAsync\` (первый — только RxJS, второй — вся зона Angular, включая таймеры шаблона).`,
      en: `## In short

Marble testing lets you **draw a stream as an ASCII string** and compare that drawing with what the operator actually produced. \`TestScheduler\` runs on **virtual time**: \`debounceTime(300)\` completes instantly and identically every run — no real delays, no flakiness.

Analogy: sheet music. Instead of "play it and listen, sounds about right", you write the score: a note here, a two-bar rest there, the ending here. Two scores can be compared symbol by symbol without playing anything in real time. A marble diagram is the score for an Observable.

## How it works, step by step

1. Create a \`TestScheduler\` and run everything inside \`testScheduler.run(...)\` — time is virtual in there.
2. Describe the source with a marble string via \`cold()\` or \`hot()\`.
3. Build the result with an ordinary \`pipe(...)\`.
4. Declare the **expected** diagram with \`expectObservable(result$).toBe(...)\`.
5. Marble syntax:
   - \`-\` — one time frame;
   - \`a\`, \`b\` — value emissions (the values themselves go in the second argument);
   - \`|\` — complete, \`#\` — error;
   - \`()\` — synchronous grouping of several events in one frame;
   - \`^\` — subscription point, hot observables only.
6. Why this beats \`fakeAsync\` for RxJS: one line describes **values, timing and completion** at once, and the comparison is declarative — far more precise than manual \`tick()\` calls interleaved with assertions.

## Example

\`\`\`ts
testScheduler.run(({ cold, expectObservable }) => {
  const source$ = cold('-a--b--c|', { a: 1, b: 2, c: 3 });
  const result$ = source$.pipe(map(x => x * 10));
  expectObservable(result$).toBe('-a--b--c|', { a: 10, b: 20, c: 30 });
});
\`\`\`

\`\`\`ts
// a time operator: debounce gets the same virtual scheduler
const result$ = source$.pipe(debounceTime(20, testScheduler));
expectObservable(result$).toBe('-----x|', { x: 'last' });
\`\`\`

Why this works: the expectation is itself a diagram, not "it emitted N times". If the operator shifts a value by a single frame, the test catches it; a plain \`subscribe\` collecting values into an array never would.

## What to say in the interview

> Marble testing describes async streams with ASCII diagrams and virtual time: \`TestScheduler\` advances the clock synchronously, so even \`debounceTime\` and \`delay\` become deterministic. In the diagram a dash is one time frame, a letter is a value emission, a pipe is complete, a hash is error, parentheses group events synchronously in one frame, and a caret marks the subscription point for hot streams. For RxJS this beats \`fakeAsync\` with manual \`tick\` calls, because one line captures values, timing and completion together and the comparison is declarative. \`expectSubscriptions\` is separately valuable — it asserts when subscription and unsubscription happened and catches leaks. The main trap is units: inside \`run()\` one dash is one frame while \`debounceTime(20)\` counts virtual milliseconds, so you have to keep them aligned. For simple synchronous streams marbles are overkill — a plain \`subscribe\` with an assertion is enough.

## Gotchas

- **Frames vs milliseconds.** A \`-\` is one frame, but \`debounceTime(20)\` is 20 virtual ms. Mixing them gives diagrams that "almost" line up.
- **\`cold\` where you needed \`hot\`, or vice versa.** \`cold()\` replays from scratch for every subscriber; \`hot()\` is a shared source where anything before \`^\` is lost. Swap them and you'll chase a bug that doesn't exist.
- **Real timers inside \`run()\`:** if an operator wasn't given the scheduler and the code uses a global \`setTimeout\`, virtual time never sees it.
- **Skipping \`expectSubscriptions\`** — it's the simplest way to prove that \`switchMap\` really cancelled the previous inner subscription.
- **Marbles for marbles' sake.** For \`of(1).pipe(map(...))\` a diagram only makes the test harder to read.
- **Follow-ups:** how you'd test \`switchMap\` cancellation (two diagrams plus \`expectSubscriptions\`), and how \`TestScheduler\` differs from \`fakeAsync\` (the former covers RxJS only, the latter the whole Angular zone including template timers).`,
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
      ru: `## Коротко

\`fakeAsync\` даёт тесту **пульт от времени**. Внутри него \`setTimeout\`, \`setInterval\` и промисы не выполняются по-настоящему, а встают в очередь; вы сами решаете, когда их «проиграть», вызывая \`tick()\` или \`flush()\`. Тест становится синхронным и детерминированным.

Аналогия: запись матча вместо прямого эфира. В прямом эфире вы ждёте 300 реальных миллисекунд и надеетесь, что успели. В записи вы перематываете вперёд ровно на нужный момент — и так каждый раз одинаково. \`waitForAsync\` — это, наоборот, честный прямой эфир: пульта нет, вы просто ждёте, пока всё утихнет.

## Как это работает по шагам

1. \`fakeAsync\` оборачивает тест в зону с **виртуальными часами**: все асинхронные задачи ставятся в очередь вместо реального выполнения.
2. **\`tick(ms)\`** продвигает виртуальное время на \`ms\` и выполняет все макротаски, чей таймер истёк, плюс микротаски.
3. **\`tick()\`** без аргумента прогоняет уже готовые микротаски — то есть промисы.
4. **\`flush()\`** выполняет **все** ожидающие таймеры, пока очередь не опустеет, и возвращает, сколько виртуального времени прошло. Удобно, когда точное число миллисекунд неизвестно.
5. **\`flushMicrotasks()\`** — только промисы, таймеры не трогает.
6. **\`waitForAsync\`** (бывший \`async\`) работает иначе: **никакого виртуального времени**. Он тоже оборачивает тест в зону, но просто отслеживает все асинхронные задачи и завершает тест, когда они стабилизируются — обычно в паре с \`fixture.whenStable()\`.
7. **Выбор:** \`fakeAsync\` — когда есть таймеры, debounce, нужен контроль тайминга и синхронные ассерты. \`waitForAsync\` — когда есть реальные промисы и биндинги шаблона, а временем управлять не нужно.

## Пример

\`\`\`ts
it('debounces', fakeAsync(() => {
  let value: string;
  service.search('a'); tick(200);
  service.result$.subscribe(v => value = v);
  flush();
  expect(value!).toBe('result');
}));
\`\`\`

Почему так: \`tick(200)\` проматывает окно debounce, а \`flush()\` добивает всё, что осталось в очереди. Ассерт стоит **после** — и он синхронный, поэтому нельзя случайно проверить состояние до того, как оно наступило.

## Что сказать на собеседовании

> \`fakeAsync\` создаёт зону с виртуальными часами: \`setTimeout\`, \`setInterval\` и промисы ставятся в очередь вместо реального выполнения, поэтому асинхронный тест становится синхронным и детерминированным, без реальных задержек и без флакки. \`tick(ms)\` продвигает виртуальное время и выполняет истёкшие макротаски вместе с микротасками, \`tick()\` без аргумента прогоняет только готовые микротаски, \`flush()\` выполняет все оставшиеся таймеры до опустошения очереди и возвращает прошедшее время, \`flushMicrotasks()\` — только промисы. \`waitForAsync\`, бывший \`async\`, устроен иначе: виртуального времени там нет, он отслеживает асинхронные задачи и завершает тест, когда они стабилизировались, обычно через \`fixture.whenStable()\`. Выбираю так: \`fakeAsync\` для таймеров, debounce и контролируемого тайминга; \`waitForAsync\` для реальных промисов и биндингов, когда временем управлять не нужно. Главный подвох — \`fakeAsync\` не контролирует настоящий I/O, поэтому HTTP всё равно нужен \`HttpTestingController\`.

## Ловушки

- **«1 periodic timer still in the queue».** \`tick()\` падает, если остался незавершённый \`setInterval\` — нужен \`discardPeriodicTasks()\`.
- **Реальный XHR/fetch «тикнуть» нельзя.** \`fakeAsync\` управляет зоной, а не сетью — для HTTP берите \`HttpTestingController\`.
- **Смешивать \`fakeAsync\` и \`await\`** в одном тесте — прямой путь к зависшему или непредсказуемому тесту.
- **\`flush()\` вместо точного \`tick()\`** прячет ошибки в таймингах: тест проходит, даже если задержка настроена неверно.
- **Забытый \`fixture.detectChanges()\` после \`tick()\`** — данные пришли, но DOM ещё старый.
- **Спросят следом:** как это меняется в zoneless-приложениях (там \`fakeAsync\` уже не про Zone.js, а тестируют через сигналы и явные \`await\`), и чем \`flush()\` отличается от \`flushMicrotasks()\`.`,
      en: `## In short

\`fakeAsync\` hands your test **a remote control for time**. Inside it, \`setTimeout\`, \`setInterval\` and promises don't really run — they queue up, and you decide when to play them by calling \`tick()\` or \`flush()\`. The test becomes synchronous and deterministic.

Analogy: a recorded match instead of a live broadcast. Live, you wait 300 real milliseconds and hope you caught it. On the recording you fast-forward to exactly the right moment, identically every time. \`waitForAsync\` is the opposite — an honest live broadcast: no remote, you just wait for things to settle.

## How it works, step by step

1. \`fakeAsync\` wraps the test in a zone with a **virtual clock**: every async task is queued instead of really executing.
2. **\`tick(ms)\`** advances virtual time by \`ms\` and runs every macrotask whose timer elapsed, plus microtasks.
3. **\`tick()\`** with no argument drains the ready microtasks — i.e. promises.
4. **\`flush()\`** runs **all** pending timers until the queue is empty and returns how much virtual time passed. Handy when you don't know the exact millisecond count.
5. **\`flushMicrotasks()\`** — promises only, timers untouched.
6. **\`waitForAsync\`** (formerly \`async\`) works differently: **no virtual time at all**. It also wraps the test in a zone, but simply tracks async tasks and finishes the test when they stabilize — usually paired with \`fixture.whenStable()\`.
7. **Choosing:** \`fakeAsync\` when there are timers, debounces, and you need timing control with synchronous asserts. \`waitForAsync\` for real promises and template bindings where controlling time isn't needed.

## Example

\`\`\`ts
it('debounces', fakeAsync(() => {
  let value: string;
  service.search('a'); tick(200);
  service.result$.subscribe(v => value = v);
  flush();
  expect(value!).toBe('result');
}));
\`\`\`

Why this works: \`tick(200)\` fast-forwards past the debounce window and \`flush()\` drains whatever is left in the queue. The assertion comes **after** and is synchronous, so you can't accidentally check state before it has arrived.

## What to say in the interview

> \`fakeAsync\` creates a zone with a virtual clock: \`setTimeout\`, \`setInterval\` and promises are queued instead of really executing, which makes an async test synchronous and deterministic, with no real delays and no flakiness. \`tick(ms)\` advances virtual time and runs elapsed macrotasks plus microtasks, \`tick()\` with no argument drains only ready microtasks, \`flush()\` runs all remaining timers until the queue empties and returns the elapsed virtual time, and \`flushMicrotasks()\` handles promises only. \`waitForAsync\`, formerly \`async\`, is built differently: there's no virtual time — it tracks async tasks and completes the test once they stabilize, usually via \`fixture.whenStable()\`. My rule: \`fakeAsync\` for timers, debounce and controlled timing; \`waitForAsync\` for real promises and bindings where time control isn't needed. The key caveat is that \`fakeAsync\` doesn't control real I/O, so HTTP still needs \`HttpTestingController\`.

## Gotchas

- **"1 periodic timer still in the queue".** \`tick()\` throws when a \`setInterval\` is still pending — call \`discardPeriodicTasks()\`.
- **You can't "tick" a real XHR/fetch.** \`fakeAsync\` controls the zone, not the network — use \`HttpTestingController\` for HTTP.
- **Mixing \`fakeAsync\` with \`await\`** in the same test is the fast route to a hung or unpredictable test.
- **\`flush()\` instead of a precise \`tick()\`** hides timing bugs: the test passes even if the delay is configured wrong.
- **Forgetting \`fixture.detectChanges()\` after \`tick()\`** — the data arrived but the DOM is still the old one.
- **Follow-ups:** how this changes in zoneless apps (\`fakeAsync\` is no longer about Zone.js there; you test through signals and explicit awaits), and how \`flush()\` differs from \`flushMicrotasks()\`.`,
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
      ru: `## Коротко

\`HttpTestingController\` — это **поддельный бэкенд внутри теста**. Реальные запросы никуда не уходят: вы их перехватываете, проверяете, что запрос сформирован правильно, и сами решаете, чем ответить — данными, 500-й или сетевым сбоем.

Аналогия: почтовое отделение в песочнице. Письмо не улетает адресату — оно ложится вам на стол. Вы читаете конверт (URL, метод, заголовки), убеждаетесь, что адрес верный, и сами кладёте в ящик ответ, который хотите. И в конце проверяете, что на столе не осталось неразобранных писем.

## Как это работает по шагам

1. В \`TestBed\` подключаем \`provideHttpClient()\` и \`provideHttpClientTesting()\` — второй подменяет реальный HTTP-бэкенд.
2. Достаём контроллер: \`TestBed.inject(HttpTestingController)\`.
3. Вызываем метод сервиса и **обязательно подписываемся** — без \`subscribe()\` запрос вообще не уйдёт, Observable ленив.
4. Ловим запрос: \`expectOne(...)\` или \`match(...)\`. Здесь же проверяем URL, метод, заголовки, тело и query-параметры.
5. Отвечаем: \`req.flush(body)\` для успеха, \`req.flush(null, { status: 500, statusText: 'Server Error' })\` для ошибки, \`req.error(new ProgressEvent('error'))\` для сетевого сбоя.
6. В \`afterEach\` вызываем \`http.verify()\` — он падает, если остались необработанные или лишние запросы.
7. **Что здесь стоит тестировать:** корректность сформированного запроса, маппинг ответа в модель, обработку ошибок и retry-логику, поведение при гонках и отменах.

## Пример

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

Почему так: \`expectOne\` — это уже ассерт. Он падает, если запроса не было или их оказалось два, поэтому лишний дублирующий вызов API ловится автоматически, без отдельной проверки.

## Что сказать на собеседовании

> \`HttpTestingController\` из \`provideHttpClientTesting()\` подменяет HTTP-бэкенд: реальные запросы не уходят, вы их перехватываете, проверяете и отвечаете вручную — это быстро и детерминированно, без сети. Схема простая: вызвали метод сервиса, обязательно подписались, поймали запрос через \`expectOne\` или \`match\`, проверили URL, метод, заголовки, тело и параметры, отдали ответ через \`flush\`. Ошибки моделируются тем же \`flush\` со статусом 500 или методом \`error\` с ProgressEvent для сетевого сбоя. В \`afterEach\` обязательно \`verify()\` — он падает, если остались необработанные или лишние запросы, и это лучший способ поймать дублирующиеся вызовы API. Тестирую я здесь корректность сформированного запроса, маппинг ответа в модель, обработку ошибок и retry. Главный подвох — ленивость Observable: без \`subscribe()\` запрос не выстрелит и тест упадёт на \`expectOne\`. А для retry с задержкой это комбинируется с \`fakeAsync\` и \`tick\`, чтобы промотать backoff-таймеры.

## Ловушки

- **Забыли \`subscribe()\`** — запроса нет, \`expectOne\` падает с «Expected one matching request, found none». Классика.
- **Забыли \`verify()\`** — лишние и «висящие» запросы остаются незамеченными, а именно они обычно и есть баг.
- **Retry с backoff без \`fakeAsync\`:** повторный запрос ждёт таймера, которого в тесте никто не проматывает.
- **\`expectOne\` по строке URL, когда есть query-параметры** — совпадения не будет; используйте предикат или \`match\`.
- **Проверять только happy path.** Ошибочные ветки в HTTP-сервисах ломаются чаще успешных.
- **Спросят следом:** чем это отличается от MSW (MSW перехватывает на уровне сети и работает и в браузере, и в e2e; \`HttpTestingController\` — только внутри Angular DI) и как тестировать интерсепторы (через тот же контроллер, проверяя заголовки на перехваченном запросе).`,
      en: `## In short

\`HttpTestingController\` is a **fake backend living inside your test**. Real requests never leave: you intercept them, assert the request was built correctly, and decide what to answer with — data, a 500, or a network failure.

Analogy: a sandbox post office. The letter never reaches the recipient — it lands on your desk. You read the envelope (URL, method, headers), confirm the address is right, and drop whatever reply you want into the mailbox yourself. At the end you check no unopened letters are left on the desk.

## How it works, step by step

1. In \`TestBed\`, provide \`provideHttpClient()\` and \`provideHttpClientTesting()\` — the latter swaps out the real HTTP backend.
2. Grab the controller: \`TestBed.inject(HttpTestingController)\`.
3. Call the service method and **always subscribe** — without \`subscribe()\` nothing is sent at all, since Observables are lazy.
4. Catch the request with \`expectOne(...)\` or \`match(...)\`. This is where you assert URL, method, headers, body and query params.
5. Respond: \`req.flush(body)\` for success, \`req.flush(null, { status: 500, statusText: 'Server Error' })\` for an error, \`req.error(new ProgressEvent('error'))\` for a network failure.
6. Call \`http.verify()\` in \`afterEach\` — it fails if any unhandled or extra requests remain.
7. **What's worth testing here:** the shape of the outgoing request, mapping the response into a model, error handling and retry logic, behaviour under races and cancellations.

## Example

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

Why this works: \`expectOne\` is itself an assertion. It fails if there was no request — or two — so an accidental duplicate API call is caught automatically without a dedicated check.

## What to say in the interview

> \`HttpTestingController\`, from \`provideHttpClientTesting()\`, replaces the HTTP backend: real requests never go out, you intercept them, assert, and respond by hand — fast and deterministic, no network involved. The flow is simple: call the service method, subscribe (this is mandatory), catch the request with \`expectOne\` or \`match\`, assert URL, method, headers, body and params, then deliver a response with \`flush\`. Errors are modelled with the same \`flush\` and a 500 status, or with \`error\` and a ProgressEvent for a network failure. \`verify()\` in \`afterEach\` is non-negotiable — it fails on unhandled or extra requests, which is the best way to catch duplicated API calls. What I test here is the shape of the outgoing request, the mapping of the response into a model, error handling and retries. The main trap is Observable laziness: with no \`subscribe()\` the request never fires and the test dies on \`expectOne\`. And for delayed retries you combine it with \`fakeAsync\` and \`tick\` to advance the backoff timers.

## Gotchas

- **Forgetting \`subscribe()\`** — no request exists and \`expectOne\` fails with "Expected one matching request, found none". A classic.
- **Forgetting \`verify()\`** — stray and dangling requests go unnoticed, and those are usually the actual bug.
- **Retry with backoff and no \`fakeAsync\`:** the retry waits on a timer nobody advances in the test.
- **\`expectOne\` with a bare URL string when query params exist** — it won't match; use a predicate or \`match\`.
- **Testing only the happy path.** Error branches in HTTP services break far more often than success ones.
- **Follow-ups:** how it compares to MSW (MSW intercepts at the network layer and works in the browser and in e2e too; \`HttpTestingController\` lives only inside Angular's DI), and how you test interceptors (through the same controller, asserting headers on the intercepted request).`,
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
      ru: `## Коротко

Component Harness — это **пульт управления компонентом для тестов**. Вместо того чтобы лезть в чужую вёрстку через \`querySelector('.mat-button-wrapper span')\`, тест говорит \`button.click()\` и \`select.open()\`. Внутреннее устройство DOM спрятано за стабильным API.

Аналогия: пульт от телевизора. Вам не нужно знать, какая микросхема отвечает за громкость, — вы жмёте кнопку «+». Производитель может полностью переделать начинку, но кнопка останется на месте. Прямой доступ к DOM — это лезть паяльником внутрь корпуса: работает ровно до первого обновления модели.

## Как это работает по шагам

1. Из фикстуры получаем загрузчик: \`TestbedHarnessEnvironment.loader(fixture)\`.
2. Просим у него нужный harness: \`loader.getHarness(MatButtonHarness.with({ text: 'Save' }))\`. Фильтры (\`with\`) позволяют выбрать конкретный экземпляр.
3. Взаимодействуем **в терминах поведения**: \`click()\`, \`getText()\`, \`open()\`, \`clickOptions()\` — никаких CSS-селекторов.
4. Все методы **асинхронные и возвращают промисы**: harness сам дожидается стабилизации, поэтому не нужны ручные \`detectChanges\` вперемешку с \`whenStable\`.
5. Material поставляет готовые harness для своих компонентов (\`MatButtonHarness\`, \`MatSelectHarness\` и т.д.). При обновлении версии Material меняется harness — **а не ваши тесты**.
6. Для своих компонентов пишем свой: наследуемся от \`ComponentHarness\`, объявляем \`hostSelector\` и локаторы через \`this.locatorFor(...)\`.
7. **Бонус — переносимость:** один и тот же harness работает и в unit-тестах через TestBed, и в e2e-окружении через другой \`HarnessEnvironment\`.

## Пример

\`\`\`ts
const loader = TestbedHarnessEnvironment.loader(fixture);
const button = await loader.getHarness(MatButtonHarness.with({ text: 'Save' }));
await button.click();
const select = await loader.getHarness(MatSelectHarness);
await select.open();
await select.clickOptions({ text: 'Option 2' });
\`\`\`

Почему так: тест читается как сценарий пользователя, а не как обход DOM-дерева. И если Material в следующей версии переименует внутренний класс, ваш тест этого даже не заметит.

## Что сказать на собеседовании

> Component Harness — это абстракция CDK, которая даёт тестам стабильное API для взаимодействия с компонентом и прячет его внутреннюю DOM-структуру. Проблема, которую она решает: прямой доступ к DOM хрупок — \`querySelector\` по внутреннему классу Material ломается при любом обновлении вёрстки библиотеки. Harness инкапсулирует селекторы, поэтому при обновлении версии меняется harness, а не ваши тесты. Плюсы: устойчивость к изменениям вёрстки; переносимость — один harness работает и в TestBed, и в e2e через другой HarnessEnvironment; читаемость, потому что API выражено в терминах поведения — click, getText — а не CSS; и асинхронность по умолчанию, все методы возвращают промисы и сами дожидаются стабилизации. Для своих компонентов наследуемся от ComponentHarness, объявляем hostSelector и локаторы через locatorFor. Когда не нужно: для простого компонента без сложного DOM прямой DebugElement дешевле; harness окупается на сложных интерактивных виджетах и в дизайн-системах, где важна стабильность контракта тестов.

## Ловушки

- **Забытый \`await\`.** Все методы harness асинхронные; без \`await\` тест проверит состояние до клика и будет падать через раз.
- **Смешивание harness с ручным \`detectChanges()\`** приводит к гонкам: harness уже стабилизирует фикстуру сам.
- **Harness там, где хватает \`DebugElement\`.** Для \`<div>\` с текстом это лишний слой абстракции.
- **Свой harness без \`hostSelector\`** — загрузчик просто не найдёт компонент.
- **Забывают про \`getAllHarnesses\`**, когда на странице несколько одинаковых виджетов, и получают «первый попавшийся».
- **Спросят следом:** чем harness отличается от Page Object в e2e (тот же принцип, но harness привязан к компоненту и переносим между окружениями) и как выбрать конкретный экземпляр среди многих (фильтры через \`with\`).`,
      en: `## In short

A component harness is a **remote control for a component in tests**. Instead of reaching into someone else's markup with \`querySelector('.mat-button-wrapper span')\`, the test says \`button.click()\` and \`select.open()\`. The internal DOM is hidden behind a stable API.

Analogy: a TV remote. You don't need to know which chip handles the volume — you press "+". The manufacturer can redesign the internals completely and the button stays put. Direct DOM access is taking a soldering iron to the chassis: it works right up until the next model.

## How it works, step by step

1. Get a loader from the fixture: \`TestbedHarnessEnvironment.loader(fixture)\`.
2. Ask it for the harness you need: \`loader.getHarness(MatButtonHarness.with({ text: 'Save' }))\`. Filters via \`with\` pick a specific instance.
3. Interact **in behavioural terms**: \`click()\`, \`getText()\`, \`open()\`, \`clickOptions()\` — no CSS selectors anywhere.
4. Every method is **async and returns a promise**: the harness waits for stabilization itself, so you don't interleave manual \`detectChanges\` and \`whenStable\`.
5. Material ships ready-made harnesses for its components (\`MatButtonHarness\`, \`MatSelectHarness\`, …). When Material updates, the harness changes — **not your tests**.
6. For your own components, write your own: extend \`ComponentHarness\`, declare a \`hostSelector\`, and locate elements with \`this.locatorFor(...)\`.
7. **Bonus — portability:** the same harness runs in unit tests through TestBed and in an e2e environment through a different \`HarnessEnvironment\`.

## Example

\`\`\`ts
const loader = TestbedHarnessEnvironment.loader(fixture);
const button = await loader.getHarness(MatButtonHarness.with({ text: 'Save' }));
await button.click();
const select = await loader.getHarness(MatSelectHarness);
await select.open();
await select.clickOptions({ text: 'Option 2' });
\`\`\`

Why this works: the test reads like a user journey rather than a DOM traversal. And if Material renames an internal class in the next release, your test never notices.

## What to say in the interview

> A component harness is a CDK abstraction that gives tests a stable API for interacting with a component while hiding its internal DOM. The problem it solves is that direct DOM access is fragile — a \`querySelector\` on a Material internal class breaks whenever the library's markup changes. The harness encapsulates the selectors, so a version bump changes the harness, not your tests. The benefits: robustness against markup changes; portability, since one harness runs in TestBed and in e2e via a different HarnessEnvironment; readability, because the API speaks behaviour — click, getText — not CSS; and async by default, with every method returning a promise and awaiting stabilization itself. For your own components you extend ComponentHarness, declare a hostSelector and locate elements with locatorFor. When it isn't worth it: for a simple component with trivial DOM, direct DebugElement access is cheaper; harnesses pay off for complex interactive widgets and in design systems where the stability of the test contract matters.

## Gotchas

- **A forgotten \`await\`.** Every harness method is async; without \`await\` the test asserts before the click lands and fails intermittently.
- **Mixing harnesses with manual \`detectChanges()\`** creates races — the harness already stabilizes the fixture for you.
- **A harness where \`DebugElement\` would do.** For a \`<div>\` with text it's a pointless layer.
- **A custom harness without \`hostSelector\`** — the loader simply won't find the component.
- **Forgetting \`getAllHarnesses\`** when several identical widgets exist on the page, and silently testing "whichever came first".
- **Follow-ups:** how a harness differs from an e2e Page Object (same idea, but a harness is bound to a component and portable between environments), and how you target one instance among many (filters via \`with\`).`,
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
      ru: `## Коротко

Главная разница — **где живёт сам тест**. Cypress выполняется **внутри браузера**, в том же event loop, что и приложение. Playwright управляет браузером **снаружи**, по протоколу.

Аналогия: Cypress — врач, который забрался внутрь пациента: видит всё изнутри в мельчайших подробностях (отсюда шикарный DX и time-travel-отладка), но сам ограничен размерами пациента — тяжело работать сразу с двумя пациентами или переходить между доменами. Playwright — врач с пультом снаружи: может вести несколько пациентов параллельно, разных видов (Chromium, Firefox, WebKit), но не видит происходящее так же интимно.

А flaky-тест — это как пожарная сигнализация, которая срабатывает, когда вы жарите котлеты: пару раз проверили, потом перестали реагировать вообще, и в настоящий пожар никто не побежит.

## Как это работает по шагам

1. **Cypress:** внутри браузера, тот же event loop. Плюсы — отличный DX, time-travel debugger, авто-retry команд. Минусы — исторически слабые многотабовость и мультидоменность, один браузерный движок на прогон, иногда упираешься в саму архитектуру.
2. **Playwright:** снаружи, через CDP и другие протоколы. Плюсы — Chromium, Firefox и WebKit, параллелизм, несколько контекстов и вкладок, мощный перехват сети, авто-waiting.
3. **Против flakiness — авто-waiting вместо sleep.** Оба инструмента умеют ждать видимости и actionability элемента. Фиксированный \`wait(3000)\` не использовать никогда: на медленном CI он мал, на быстром — трата времени.
4. **Стабильные селекторы:** \`data-testid\`, а не CSS-классы и тексты, чувствительные к вёрстке и локализации.
5. **Изоляция состояния:** чистая БД или сидинг **через API** перед каждым тестом, а не кликами по UI. Тест не должен зависеть от того, что оставил предыдущий.
6. **Retries на уровне раннера** есть и там, и там — но это лечение симптома. Ставьте, чтобы не блокировать команду, и параллельно ищите причину.
7. **Детерминированные время и данные:** мокать \`Date.now\`, фиксировать сиды рандома, отключать анимации.
8. **Стаб сети** убирает зависимость от бэкенда — быстрее и стабильнее. Но обязательно **смешивайте** с настоящими контрактными или e2e-тестами на критичных путях, иначе моки незаметно разойдутся с реальным API.

## Пример

\`\`\`ts
// Playwright
await page.route('**/api/users', route => route.fulfill({ json: [{ id: 1 }] }));
// Cypress
cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('users');
cy.wait('@users');
\`\`\`

Почему так: \`cy.wait('@users')\` ждёт **конкретное событие сети**, а не абстрактные три секунды. Это и есть главный приём против флакки — ждать факта, а не времени.

## Что сказать на собеседовании

> Архитектурно они разные. Cypress работает внутри браузера, в том же event loop, что приложение: отсюда отличный DX, time-travel debugger и авто-retry команд, но исторически слабая поддержка нескольких вкладок и доменов и один движок на прогон. Playwright управляет браузером снаружи через протокол: Chromium, Firefox и WebKit, честный параллелизм, несколько контекстов, мощный перехват сети и авто-waiting. С flakiness борюсь системно: авто-waiting вместо фиксированных sleep, селекторы по \`data-testid\`, а не по классам и тексту, изоляция состояния через сидинг по API, а не через UI, детерминированное время и данные, отключённые анимации. Retries раннера использую как временную заглушку, чтобы не блокировать команду, но нестабильный тест ставлю в карантин и ищу причину. Сеть стабаю через \`page.route\` или \`cy.intercept\` — это убирает зависимость от бэкенда, но на критичных путях обязательно оставляю сценарии против настоящего API, иначе моки разойдутся с реальностью. Выбор: Playwright для кросс-браузерности и масштаба CI, Cypress — где ценят интерактивную отладку.

## Ловушки

- **\`wait(3000)\` вместо ожидания события.** На быстрой машине зелено, на загруженном CI — красно. Ждите элемент или запрос, а не время.
- **\`retries: 3\` навсегда.** Так вы прячете реальный баг гонки и учите команду не верить красному прогону.
- **Сидинг через UI.** Логин кликами в каждом тесте — это плюс минуты к прогону и главный источник каскадных падений.
- **Только замоканная сеть.** Через полгода моки описывают API, которого уже нет, а тесты зелёные.
- **Селекторы по тексту** ломаются от локализации и правок копирайта.
- **Спросят следом:** как вы отличаете flaky-тест от реального бага (прогон на том же коммите несколько раз), и что делать с общим состоянием при параллельных прогонах (отдельный набор данных и пользователь на воркер).`,
      en: `## In short

The core difference is **where the test itself lives**. Cypress runs **inside the browser**, in the same event loop as the app. Playwright drives the browser **from outside**, over a protocol.

Analogy: Cypress is a doctor who climbed inside the patient — sees everything from within in exquisite detail (hence the superb DX and time-travel debugging), but is limited by the patient's size: two patients at once, or moving between them, is awkward. Playwright is a doctor with a remote outside: can run several patients in parallel, of different species (Chromium, Firefox, WebKit), but doesn't see the internals quite so intimately.

And a flaky test is the smoke alarm that goes off while you're frying onions: you check it twice, then stop reacting entirely — and nobody moves during a real fire.

## How it works, step by step

1. **Cypress:** inside the browser, same event loop. Pros — excellent DX, time-travel debugger, automatic command retries. Cons — historically weak multi-tab and multi-domain support, one engine per run, and occasionally you hit the architecture itself.
2. **Playwright:** outside, via CDP and other protocols. Pros — Chromium, Firefox and WebKit, real parallelism, multiple contexts and tabs, powerful network interception, auto-waiting.
3. **Against flakiness — auto-waiting, never sleeps.** Both tools wait for visibility and actionability. A fixed \`wait(3000)\` is always wrong: too short on a loaded CI machine, wasted time on a fast one.
4. **Stable selectors:** \`data-testid\`, not CSS classes or text that shift with layout and localization.
5. **State isolation:** a clean database or seeding **through the API** before each test, not by clicking the UI. A test must not depend on what the previous one left behind.
6. **Runner-level retries** exist in both — but they treat the symptom. Enable them so the team isn't blocked, and hunt the cause in parallel.
7. **Deterministic time and data:** mock \`Date.now\`, pin random seeds, disable animations.
8. **Network stubbing** removes the backend dependency — faster and more stable. But you must **mix in** real contract or e2e tests on critical paths, or your mocks quietly drift away from the real API.

## Example

\`\`\`ts
// Playwright
await page.route('**/api/users', route => route.fulfill({ json: [{ id: 1 }] }));
// Cypress
cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('users');
cy.wait('@users');
\`\`\`

Why this works: \`cy.wait('@users')\` waits for a **specific network event**, not an abstract three seconds. That's the central anti-flake technique — wait for a fact, not for a duration.

## What to say in the interview

> They differ architecturally. Cypress runs inside the browser in the same event loop as the app, which gives you great DX, a time-travel debugger and automatic command retries, but historically weak multi-tab and multi-domain support and one engine per run. Playwright drives the browser externally over a protocol: Chromium, Firefox and WebKit, real parallelism, multiple contexts, powerful network interception and auto-waiting. I fight flakiness systematically: auto-waiting instead of fixed sleeps, \`data-testid\` selectors rather than classes or text, state isolation by seeding through the API instead of the UI, deterministic time and data, animations disabled. Runner retries I treat as a temporary shield so the team isn't blocked, while the unstable test goes into quarantine and I chase the root cause. I stub the network with \`page.route\` or \`cy.intercept\`, which removes the backend dependency — but I always keep some scenarios against the real API on critical paths, otherwise mocks drift from reality. My pick: Playwright for cross-browser coverage and CI scale, Cypress where interactive debugging is prized.

## Gotchas

- **\`wait(3000)\` instead of waiting for an event.** Green on a fast machine, red on a busy CI runner. Wait for an element or a request, never a duration.
- **\`retries: 3\` forever.** You've hidden a real race condition and taught the team to distrust red runs.
- **Seeding through the UI.** Clicking through login in every test adds minutes and is the top source of cascading failures.
- **Fully mocked network only.** Six months later your mocks describe an API that no longer exists — and everything is green.
- **Text-based selectors** break on localization and copy tweaks.
- **Follow-ups:** how you distinguish a flaky test from a real bug (rerun on the same commit several times), and how you handle shared state under parallel runs (a dedicated data set and user per worker).`,
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
      ru: `## Коротко

Coverage меряет, **какие строки исполнились**, а вовсе не то, **проверил ли их хоть один \`expect\`**. Mutation testing идёт с другой стороны: он **портит ваш код** и смотрит, заметят ли это тесты. Не заметили — значит тесты в этом месте бесполезны.

Аналогия: проверка охраны на объекте. Coverage — это отчёт «охранник обошёл все коридоры»: обошёл, галочка стоит, но спал он при этом или нет — неизвестно. Mutation testing — это когда вы подсылаете человека без пропуска и смотрите, поднимут ли тревогу. Только второе реально что-то доказывает.

## Как это работает по шагам

1. **Почему coverage обманчив.** Тест без единого ассерта даёт 100% покрытия строки: \`it('runs', () => { calculate(2, 3); });\` — код исполнился, но никто не проверил результат.
2. **Метрика как цель.** Требование «90% coverage» рождает бессмысленные тесты ради цифры — классический закон Гудхарта.
3. **Line vs branch.** Line coverage не видит непокрытые ветки и условия: строка с тернарником посчитается покрытой, хотя проверена одна половина.
4. **Покрытие ≠ важность.** 100% на тривиальных геттерах и 0% на критичной логике в среднем дают «хороший» процент.
5. **Mutation testing** (для JS/TS — Stryker) вносит в исходный код **мутации**: меняет \`+\` на \`-\`, \`>\` на \`>=\`, \`true\` на \`false\`, удаляет вызовы.
6. После каждой мутации прогоняются тесты. **Killed mutant** — хоть один тест упал, изменение поймано, хорошо. **Survived mutant** — все тесты зелёные на испорченном коде, значит здесь тесты слабые.
7. **Mutation score = killed / total** — это уже честная мера способности тестов ловить регрессии.

## Пример

\`\`\`ts
export const isAdult = (age: number) => age >= 18;

// тест даёт 100% coverage
it('works', () => { expect(isAdult(30)).toBe(true); });

// Stryker меняет >= на > — тест всё равно зелёный: mutant survived.
// Граница 18 не проверена, а это ровно тот баг, который поедет в прод.
\`\`\`

Почему так: покрытие говорит «строка исполнена», mutation score говорит «поведение зафиксировано». Разница видна ровно на границах, где живёт большинство реальных багов.

## Что сказать на собеседовании

> Code coverage измеряет, какие строки исполнились во время тестов, но не то, проверены ли они ассертами: тест вообще без \`expect\` даёт сто процентов покрытия. То есть coverage отвечает на вопрос «был ли код запущен», а не «работает ли он правильно», и высокий процент создаёт ложную уверенность. Плюс типовые ловушки: метрика как цель по закону Гудхарта, line coverage не видит непокрытые ветки, и сто процентов на тривиальных геттерах при нуле на критичной логике дают усреднённо приличную цифру. Mutation testing, в JS это Stryker, работает иначе: он вносит мутации в исходный код — меняет плюс на минус, больше на больше-или-равно, true на false, удаляет вызовы — и смотрит, упал ли хоть один тест. Убитый мутант значит, что тест поймал изменение; выживший — что тесты здесь слабы. Mutation score, отношение убитых к общему числу, и есть реальная мера способности ловить регрессии. Расплата — это дорого по вычислениям, поэтому я гоняю его на ключевых модулях или ночью, а не на каждом PR, и использую как диагностику, а не как новую жёсткую цель.

## Ловушки

- **Coverage-гейт как самоцель.** Команда начинает писать тесты без ассертов и вызывать геттеры, лишь бы цифра прошла.
- **Мутационное тестирование на каждый PR** — прогон занимает десятки минут: это ночная задача или запуск по изменённым файлам.
- **Mutation score 100% как новая цель** — та же ошибка, что и с coverage, только дороже. Смотрите на выживших мутантов в критичных модулях, а не на процент.
- **Эквивалентные мутанты:** некоторые мутации не меняют поведение вообще, и убить их невозможно в принципе — их наличие не повод писать тест.
- **Coverage без branch-метрики** прячет непроверенные ветки условий.
- **Спросят следом:** какую цифру покрытия вы считаете разумной (обычно говорят про порог «не снижать текущий уровень» вместо абсолютного числа) и как выбрать модули для мутационного прогона (критичная бизнес-логика, платежи, расчёты).`,
      en: `## In short

Coverage measures **which lines executed**, not **whether a single \`expect\` checked them**. Mutation testing comes at it from the other side: it **damages your code** and sees whether the tests notice. If they don't, the tests there are worthless.

Analogy: auditing site security. Coverage is the report "the guard walked every corridor" — the box is ticked, but whether he was asleep the whole time is unknown. Mutation testing is sending in someone without a badge to see if an alarm goes off. Only the second one proves anything.

## How it works, step by step

1. **Why coverage deceives.** A test with no assertion at all yields 100% line coverage: \`it('runs', () => { calculate(2, 3); });\` — the code ran, nobody checked the result.
2. **The metric as a target.** Mandating "90% coverage" breeds meaningless tests written for the number — textbook Goodhart's law.
3. **Line vs branch.** Line coverage can't see uncovered branches: a line with a ternary counts as covered even though only one half was exercised.
4. **Coverage ≠ importance.** 100% on trivial getters and 0% on critical logic averages out to a respectable-looking number.
5. **Mutation testing** (Stryker in the JS/TS world) injects **mutations** into the source: \`+\` becomes \`-\`, \`>\` becomes \`>=\`, \`true\` becomes \`false\`, calls get deleted.
6. After each mutation the suite runs. A **killed mutant** means at least one test failed — the change was caught, good. A **survived mutant** means everything stayed green on broken code, so the tests are weak there.
7. **Mutation score = killed / total** — that's an honest measure of how well your tests catch regressions.

## Example

\`\`\`ts
export const isAdult = (age: number) => age >= 18;

// this test gives 100% coverage
it('works', () => { expect(isAdult(30)).toBe(true); });

// Stryker flips >= to > — the test is still green: mutant survived.
// The boundary at 18 was never checked, and that's exactly the bug that ships.
\`\`\`

Why this matters: coverage says "the line ran", mutation score says "the behaviour is pinned down". The gap shows up precisely at boundaries, where most real bugs live.

## What to say in the interview

> Code coverage measures which lines executed during the tests, not whether they were asserted: a test with no \`expect\` at all still reports 100%. So coverage answers "was the code run", not "does it work", and a high number creates false confidence. The usual traps come with it: the metric as a target per Goodhart's law, line coverage blind to uncovered branches, and 100% on trivial getters next to 0% on critical logic averaging into a respectable figure. Mutation testing — Stryker in JS — works differently: it injects mutations into the source, flipping plus to minus, greater-than to greater-or-equal, true to false, deleting calls, and checks whether any test fails. A killed mutant means a test caught the change; a survived one means the tests are weak there. The mutation score, killed over total, is the real measure of regression-catching power. The cost is computation: I run it on key modules or nightly rather than on every PR, and I treat it as a diagnostic rather than a new hard target.

## Gotchas

- **A coverage gate as the goal.** The team starts writing assertion-free tests and calling getters just to clear the bar.
- **Mutation testing on every PR** — a run takes tens of minutes; make it nightly or scoped to changed files.
- **Chasing a 100% mutation score** is the same mistake as chasing coverage, only more expensive. Look at surviving mutants in critical modules, not at the percentage.
- **Equivalent mutants:** some mutations don't change behaviour at all and can never be killed — their existence isn't a reason to write a test.
- **Coverage without the branch metric** hides untested condition branches.
- **Follow-ups:** what coverage number you consider sane (the usual answer is a ratchet — "don't drop below current" — rather than an absolute), and how you pick modules for mutation runs (critical business logic, payments, calculations).`,
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
      ru: `## Коротко

CI/CD-пайплайн строится по одному принципу: **сначала дешёвые проверки, потом дорогие**. Линт и типы падают за 30 секунд, e2e — за 20 минут; значит, всё, что можно поймать линтом, должно ловиться до того, как мы потратили 20 минут.

Аналогия: контроль в аэропорту. Сначала смотрят посадочный (мгновенно), потом сканируют багаж, и только избранных ведут на личный досмотр. Никто не начинает с досмотра всех подряд — очередь встанет, и люди опоздают на рейсы. Медленный CI — это ровно такая очередь, только опаздывает вся команда.

## Порядок решений при проектировании

1. **Install** — установка зависимостей строго по lockfile, с кэшем npm/pnpm store. Иначе каждый прогон качает интернет заново.
2. **Static** — lint, type-check, format-check. Дёшево и ловит много; ставим первым и включаем fail-fast.
3. **Unit/Integration** — основной объём тестов, параллельно по шардам между N воркерами.
4. **Build** — production-сборка и проверка бандла на бюджеты.
5. **E2E** — на уже собранном артефакте, в headless-браузерах, параллельно.
6. **Deploy** — preview-окружение на каждый PR, прод по merge в main.
7. **Ускорение:** \`affected\`-граф (Nx/Turborepo) гоняет только затронутые проекты; computation cache, локальный и remote, пропускает неизменённые задачи; шардинг делит тесты; независимые этапы идут параллельно.
8. **Quality gates:** падаем на упавших тестах, превышении бандл-бюджета (\`budgets\` в Angular, size-limit), регрессии coverage или Lighthouse. Добавляем визуальную регрессию на ключевых страницах.
9. **Артефакты сохраняем всегда:** отчёты покрытия, видео и трейсы e2e, source maps — без них разбор падения превращается в гадание.
10. **Деплой:** preview-окружения на PR (Vercel/Netlify или свой k8s), canary и постепенная раскатка вместе с feature flags, чтобы отделить деплой от релиза, и **иммутабельные артефакты** — откат это возврат к предыдущему артефакту, а не пересборка.

## Пример

\`\`\`yaml
jobs:
  static:  { run: nx affected -t lint type-check }          # ~1 мин, fail-fast
  test:    { needs: static, strategy: { matrix: { shard: [1,2,3,4] } } }
  build:   { needs: static, run: nx affected -t build }
  e2e:     { needs: build,  run: npx playwright test --shard=1/4 }
  deploy:  { needs: [test, e2e], if: "github.ref == 'refs/heads/main'" }
\`\`\`

Почему так: \`build\` не ждёт тестов — это независимые ветки графа, они идут параллельно. А \`e2e\` работает с тем же артефактом, который поедет в прод, а не с отдельной сборкой.

## Что сказать на собеседовании

> Я строю пайплайн от дешёвого к дорогому: install с кэшем по lockfile, затем статика — линт, типы, формат, с fail-fast, потом unit и integration параллельно по шардам, потом production-сборка с проверкой бандл-бюджетов, потом e2e на уже собранном артефакте, и деплой: preview-окружение на каждый PR и прод по merge в main. Скорость держу affected-графом Nx или Turborepo, локальным и удалённым computation-кэшем, шардингом тестов и параллелизмом независимых этапов. Quality gates — падение на тестах, превышении бандл-бюджета, регрессии coverage или Lighthouse, плюс визуальная регрессия на ключевых страницах. Артефакты сохраняю всегда: coverage, видео и трейсы e2e, source maps. Деплой — иммутабельные артефакты с откатом, canary и постепенная раскатка поверх feature flags, чтобы разделить деплой и релиз. Типовые failure modes: flaky e2e блокируют merge — лечу карантином и расследованием, а не вечными retry; отсутствие affected и кэша — CI деградирует с ростом репозитория; секреты в логах сборки — нужен строгий secret scanning. Принцип один: быстрый, детерминированный, с понятными гейтами — медленный CI убивает скорость команды.

## Ловушки

- **Дорогое перед дешёвым.** e2e стартуют раньше линта — и вы платите 20 минут, чтобы узнать про неиспользуемый импорт.
- **Flaky e2e блокируют merge.** Retry как временная мера — можно; карантин плюс расследование — обязательно, иначе команда перестаёт верить красному CI.
- **Отсутствие \`affected\` и кэша** в растущем монорепо: CI линейно деградирует, и в какой-то момент разработчики начинают мержить не дожидаясь.
- **Секреты в логах сборки** — печатать env для отладки нельзя; нужен secret scanning и маскирование.
- **Сборка отдельно для e2e и отдельно для прода** — вы тестируете не то, что деплоите.
- **Спросят следом:** как обеспечить откат за минуту (иммутабельный артефакт плюс переключение указателя, а не пересборка) и как не дать кэшу отдать протухший результат (честные \`inputs\` и детерминированная сборка).`,
      en: `## In short

A CI/CD pipeline follows one principle: **cheap checks first, expensive ones later**. Lint and types fail in 30 seconds, e2e takes 20 minutes; so anything a linter could catch must be caught before you've spent those 20 minutes.

Analogy: airport security. First they glance at your boarding pass (instant), then scan the bags, and only a few people get a full pat-down. Nobody starts by patting down everyone — the queue jams and people miss flights. A slow CI is exactly that queue, except the whole team is late.

## The order of decisions when designing it

1. **Install** — dependencies strictly from the lockfile, with the npm/pnpm store cached. Otherwise every run re-downloads the internet.
2. **Static** — lint, type-check, format-check. Cheap and catches a lot; put it first and fail fast.
3. **Unit/Integration** — the bulk of the tests, parallel across N shards.
4. **Build** — the production build, plus bundle-budget checks.
5. **E2E** — against the already-built artifact, headless, in parallel.
6. **Deploy** — a preview environment per PR, production on merge to main.
7. **Speed:** the \`affected\` graph (Nx/Turborepo) runs only touched projects; the computation cache, local and remote, skips unchanged tasks; sharding splits the suite; independent stages run in parallel.
8. **Quality gates:** fail on failing tests, on bundle-budget overrun (Angular \`budgets\`, size-limit), on coverage or Lighthouse regressions. Add visual regression on key pages.
9. **Always keep artifacts:** coverage reports, e2e videos and traces, source maps — without them, debugging a failure is guesswork.
10. **Deploy:** preview environments per PR (Vercel/Netlify or your own k8s), canary and gradual rollout combined with feature flags to decouple deploy from release, and **immutable artifacts** — rollback means pointing back at the previous artifact, not rebuilding.

## Example

\`\`\`yaml
jobs:
  static:  { run: nx affected -t lint type-check }          # ~1 min, fail-fast
  test:    { needs: static, strategy: { matrix: { shard: [1,2,3,4] } } }
  build:   { needs: static, run: nx affected -t build }
  e2e:     { needs: build,  run: npx playwright test --shard=1/4 }
  deploy:  { needs: [test, e2e], if: "github.ref == 'refs/heads/main'" }
\`\`\`

Why this works: \`build\` doesn't wait for tests — they're independent branches of the graph and run in parallel. And \`e2e\` runs against the very artifact that ships, not a separate build.

## What to say in the interview

> I order the pipeline cheap to expensive: install with a lockfile-keyed cache, then static checks — lint, types, formatting — with fail-fast, then unit and integration tests parallel across shards, then the production build with bundle-budget checks, then e2e against that built artifact, then deploy: a preview environment per PR and production on merge to main. Speed comes from the affected graph in Nx or Turborepo, a local plus remote computation cache, test sharding and parallelism across independent stages. Quality gates fail the build on tests, bundle-budget overruns, coverage or Lighthouse regressions, plus visual regression on key pages. I always retain artifacts: coverage, e2e videos and traces, source maps. Deployment uses immutable artifacts with rollback, canary and gradual rollout on top of feature flags so deploy and release are decoupled. The usual failure modes: flaky e2e blocking merges — handled with quarantine and investigation, not permanent retries; missing affected and caching, so CI degrades as the repo grows; and secrets leaking into build logs, which needs strict secret scanning. The principle is one line: fast, deterministic, clearly gated — a slow CI kills team velocity.

## Gotchas

- **Expensive before cheap.** E2E starting before lint means paying 20 minutes to learn about an unused import.
- **Flaky e2e blocking merges.** Retries as a stopgap are fine; quarantine plus investigation is mandatory, or the team stops believing a red pipeline.
- **No \`affected\` and no cache** in a growing monorepo: CI degrades linearly until developers start merging without waiting.
- **Secrets in build logs** — never dump env for debugging; you need secret scanning and masking.
- **Building separately for e2e and for production** means you're not testing what you ship.
- **Follow-ups:** how you guarantee a one-minute rollback (immutable artifact plus flipping a pointer, not a rebuild), and how you stop the cache serving stale results (honest \`inputs\` and a deterministic build).`,
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
      ru: `## Коротко

Это вопрос не про технологии, а про **умение резать задачу на оси и по каждой назвать компромисс**. Осей шесть: доставка кода, данные, состояние, рендер, real-time, надёжность. Плюс сквозные вещи — авторизация, наблюдаемость, флаги, модульность.

Аналогия: проектирование дома. Никто не начинает с выбора обоев. Сначала — сколько людей живёт (нагрузка), потом фундамент и несущие стены (архитектура данных и состояния), потом коммуникации (сеть, real-time), и только потом отделка. Собеседующий проверяет, начнёте вы с фундамента или с перечисления модных обоев.

## Порядок решений

1. **Доставка кода.** Code splitting по фичам и роутам плюс ленивая загрузка; preloading вероятных переходов на уровне роутинга. SSR/SSG или гидратация — только если реально нужны TTFB и SEO (для внутреннего дашборда обычно нет). Performance budgets на чанки и tree-shaking.
2. **Слой данных.** Кэширующий data-layer в духе TanStack Query: дедупликация одинаковых запросов, кэш, stale-while-revalidate, фоновая ревалидация. Нормализация серверного состояния, чтобы одна сущность не жила в трёх копиях. Пагинация и виртуализация больших таблиц (\`cdk-virtual-scroll\`).
3. **Состояние.** Жёстко разделить **server state** (живёт в кэш-слое) и **client/UI state** (сигналы или store). Не смешивать: у них разные жизненные циклы и разная инвалидация. Глобальный store — только для действительно разделяемого.
4. **Рендер.** \`OnPush\` плюс сигналы, мемоизация тяжёлых вычислений, виртуализация списков, тяжёлые расчёты — в Web Worker. Графики на больших объёмах — canvas или WebGL, а не SVG на 50 тысяч точек.
5. **Real-time.** WebSocket или SSE для живых метрик, обязательно с буферизацией и throttle обновлений, иначе поток сообщений утопит change detection.
6. **Надёжность и UX.** Error boundaries вокруг виджетов, skeleton-загрузка, retry с backoff, оптимистичные обновления с откатом. Offline/PWA — по требованиям; i18n и a11y закладываются с первого дня, а не прикручиваются потом.
7. **Сквозное.** Авторизация с silent refresh токена; наблюдаемость — RUM и error tracking; feature flags для постепенной раскатки; модульная архитектура (Nx libs с тегами), чтобы масштабировалась не только программа, но и команда.

## Пример

\`\`\`
dashboard/
  data-access/   # кэш-слой: дедупликация, SWR, нормализация
  widgets/       # ленивые виджеты, каждый со своим error boundary
  realtime/      # WS-клиент: буфер + throttle перед выдачей в UI
  shell/         # роутинг, layout, preloading
\`\`\`

Почему так: каждый виджет — самостоятельная единица загрузки, ошибки и обновления. Упавший виджет показывает свою заглушку, а не роняет дашборд; медленный виджет не задерживает остальные.

## Что сказать на собеседовании

> Я раскладываю такой дизайн по осям и по каждой называю компромисс. Доставка: code splitting по роутам и фичам, ленивая загрузка, preloading вероятных переходов, бюджеты на чанки; SSR беру только если реально нужны SEO и TTFB, потому что он дорог в поддержке. Данные: кэширующий data-layer с дедупликацией запросов, stale-while-revalidate и фоновой ревалидацией, нормализация серверного состояния и виртуализация больших таблиц. Состояние: жёстко разделяю server state в кэш-слое и client state в сигналах или сторе — это ключевое решение, смешивание их и рождает большинство багов синхронизации. Рендер: OnPush и сигналы, мемоизация, виртуализация, тяжёлые расчёты в Web Worker, графики на canvas при больших объёмах. Real-time: WebSocket или SSE с буферизацией и throttle, иначе change detection захлебнётся. Надёжность: error boundary на виджет, скелетоны, retry с backoff, оптимистичные апдейты с откатом. И сквозное — auth с silent refresh, RUM и error tracking, feature flags и модульная структура Nx-библиотек под масштаб команды.

## Ловушки

- **Перечисление buzzwords без компромиссов.** «Возьмём микрофронтенды, SSR и NgRx» без объяснения цены — самый частый провал на этом вопросе.
- **Смешение server state и UI state.** Ответ сервера, скопированный в глобальный store, немедленно начинает протухать, и никто не знает, кто его инвалидирует.
- **SSR «на всякий случай»** для внутреннего дашборда за логином: сложность есть, SEO не нужно.
- **Real-time без throttle.** 500 сообщений в секунду × change detection = замерзший интерфейс.
- **a11y и i18n «на потом»** — переделка через год стоит дороже, чем вся первоначальная разработка этой части.
- **Спросят следом:** что вы уточните у заказчика до проектирования (число пользователей, объём данных на экране, требования к свежести, SEO, оффлайн) и как деградирует система при падении WS (фолбэк на polling плюс индикатор состояния).`,
      en: `## In short

This question isn't about technologies — it's about **slicing the problem into axes and naming the trade-off on each**. There are six axes: code delivery, data, state, rendering, real-time, reliability. Plus cross-cutting concerns: auth, observability, flags, modularity.

Analogy: designing a house. Nobody starts by picking wallpaper. First, how many people will live there (load), then the foundation and load-bearing walls (data and state architecture), then the utilities (network, real-time), and only then the finish. The interviewer is checking whether you start with the foundation or with a list of fashionable wallpapers.

## The order of decisions

1. **Code delivery.** Code splitting by feature and route plus lazy loading; route-level preloading of likely navigations. SSR/SSG or hydration only if TTFB and SEO genuinely matter (for an internal dashboard they usually don't). Performance budgets on chunks and tree-shaking.
2. **Data layer.** A caching data layer in the spirit of TanStack Query: request deduplication, caching, stale-while-revalidate, background revalidation. Normalized server state so one entity doesn't live in three copies. Pagination and virtualization for large tables (\`cdk-virtual-scroll\`).
3. **State.** Firmly separate **server state** (lives in the cache layer) from **client/UI state** (signals or a store). Don't mix: they have different lifecycles and different invalidation rules. A global store only for genuinely shared state.
4. **Rendering.** \`OnPush\` plus signals, memoized heavy computations, list virtualization, heavy math offloaded to a Web Worker. Charts over large datasets on canvas or WebGL, not SVG with 50,000 nodes.
5. **Real-time.** WebSocket or SSE for live metrics, always with buffering and throttling, otherwise the message stream drowns change detection.
6. **Reliability and UX.** Error boundaries around widgets, skeleton loading, retry with backoff, optimistic updates with rollback. Offline/PWA per requirements; i18n and a11y designed in from day one, not bolted on later.
7. **Cross-cutting.** Auth with silent token refresh; observability — RUM and error tracking; feature flags for gradual rollout; a modular architecture (tagged Nx libs) so the team scales, not just the code.

## Example

\`\`\`
dashboard/
  data-access/   # cache layer: dedup, SWR, normalization
  widgets/       # lazy widgets, each with its own error boundary
  realtime/      # WS client: buffer + throttle before handing to the UI
  shell/         # routing, layout, preloading
\`\`\`

Why this works: each widget is its own unit of loading, failure and refresh. A crashed widget shows its own fallback instead of taking down the dashboard, and a slow one doesn't hold up the others.

## What to say in the interview

> I break a design like this into axes and name the trade-off on each. Delivery: code splitting by route and feature, lazy loading, preloading likely navigations, chunk budgets; I only add SSR when SEO and TTFB genuinely matter, because it's expensive to maintain. Data: a caching layer with request deduplication, stale-while-revalidate and background revalidation, normalized server state and virtualized large tables. State: I keep server state in the cache layer strictly separate from client state in signals or a store — that's the key decision, since mixing them causes most sync bugs. Rendering: OnPush and signals, memoization, virtualization, heavy computation in a Web Worker, canvas charts for large datasets. Real-time: WebSocket or SSE with buffering and throttling, otherwise change detection drowns. Reliability: an error boundary per widget, skeletons, retry with backoff, optimistic updates with rollback. And cross-cutting: auth with silent refresh, RUM and error tracking, feature flags, and a modular Nx library structure sized for the team.

## Gotchas

- **Listing buzzwords without trade-offs.** "We'll use micro-frontends, SSR and NgRx" with no cost analysis is the most common way to fail this question.
- **Blending server state with UI state.** A server response copied into a global store starts going stale immediately, and nobody owns its invalidation.
- **SSR "just in case"** for an internal dashboard behind a login: all the complexity, none of the SEO benefit.
- **Real-time without throttling.** 500 messages a second times change detection equals a frozen UI.
- **a11y and i18n "later"** — retrofitting a year in costs more than the original build of that area.
- **Follow-ups:** what you'd clarify with the stakeholder before designing (user count, data volume per screen, freshness requirements, SEO, offline), and how the system degrades when the socket dies (fall back to polling plus a status indicator).`,
    },
  },
  {
    id: 'arch-024',
    category: 'network-browser',
    level: 'Hard',
    tags: ['caching', 'http-cache', 'strategy'],
    question: {
      ru: 'Какие стратегии кэширования существуют во фронтенде и как выбрать подходящую?',
      en: 'What frontend caching strategies exist and how do you choose the right one?',
    },
    answer: {
      ru: `## Коротко

Кэш во фронтенде — это **пять этажей**, и на каждом свои правила: HTTP-кэш браузера, Service Worker, кэш в памяти приложения, CDN/edge и постоянное хранилище. Выбор стратегии сводится к одному вопросу: **насколько страшно показать пользователю устаревшие данные**.

Аналогия: холодильник, морозилка и магазин. Крупу можно держать годами — это ассеты с хэшем в имени, кладём на самую дальнюю полку и не трогаем. Молоко берём свежее, но вчерашнее выпить можно — это stale-while-revalidate. А курс валют или баланс счёта из холодильника доставать нельзя вообще: только из магазина, каждый раз.

## Пять уровней и три стратегии

1. **HTTP-кэш браузера** — заголовки \`Cache-Control\`, \`ETag\`, \`Last-Modified\`. Ассеты с хэшем в имени: \`max-age=31536000, immutable\`. HTML — \`no-cache\`, иначе пользователи застрянут на старой версии приложения.
2. **Service Worker (PWA)** — программируемый кэш: даёт офлайн и полный контроль над тем, что и когда отдавать.
3. **Кэш в памяти приложения** — data-layer вроде TanStack Query или свой: держит ответы API в памяти SPA, дедуплицирует одинаковые запросы.
4. **CDN/edge** — копия ближе к пользователю, снимает нагрузку и задержку.
5. **Постоянное хранилище** — localStorage/IndexedDB для офлайна и быстрого холодного старта.

**Три стратегии Service Worker:**
- **Cache-first** — для статики и неизменного: максимально быстро, но рискуете отдать устаревшее.
- **Network-first** — когда важна свежесть, с фолбэком на кэш при отсутствии сети.
- **Stale-while-revalidate** — отдать кэш мгновенно и обновить в фоне. Лучший баланс UX для данных, которые часто меняются, но не критичны по свежести.

**Инвалидация — самая сложная часть.** Хэш в имени файла решает вопрос для ассетов: новый билд — новый URL, старого кэша просто не существует. В data-layer работает инвалидация по ключам и тегам: после мутации сбрасываем связанные запросы. TTL и SWR ограничивают возраст без ручной инвалидации.

## Пример

\`\`\`
main.a3f9c2.js   →  Cache-Control: max-age=31536000, immutable
index.html       →  Cache-Control: no-cache
GET /api/profile →  SWR: отдать кэш, обновить в фоне
GET /api/balance →  no-store: только сеть
\`\`\`

Почему так: \`index.html\` с \`no-cache\` проверяется каждый раз и приносит ссылки на новые хэшированные файлы. Если закэшировать HTML агрессивно, пользователь навсегда останется на старой версии — это самая дорогая ошибка кэширования SPA.

## Что сказать на собеседовании

> Кэш во фронтенде многоуровневый: HTTP-кэш браузера через \`Cache-Control\` и \`ETag\`, Service Worker для офлайна и программируемых стратегий, in-memory кэш в data-layer, CDN на edge и постоянное хранилище в IndexedDB. Базовое правило доставки: ассеты с хэшем в имени кэшируются агрессивно как immutable на год, а HTML — с \`no-cache\`, иначе пользователи застрянут на старой версии. Стратегий три: cache-first для неизменного — быстро, но рискует устареванием; network-first там, где важна свежесть, с фолбэком на кэш; и stale-while-revalidate — отдать кэш мгновенно и обновить в фоне, это лучший баланс для часто меняющихся, но не критичных данных. Выбор делаю по цене устаревших данных: неизменные ассеты — immutable; часто читаемое и редко меняемое — SWR плюс in-memory; критично свежее вроде баланса или торгов — network-first или no-store, возможно real-time. Самое сложное — инвалидация: хэш в имени файла для ассетов, инвалидация по ключам и тегам после мутаций в data-layer, TTL там, где ручная инвалидация невозможна. Стратегию инвалидации я всегда продумываю до внедрения кэша, а не после.

## Ловушки

- **Закэшированный \`index.html\`.** Пользователь месяцами сидит на старой версии, а вы получаете «у меня баг не воспроизводится».
- **Кэш без плана инвалидации.** Добавить кэш — полдня, вычистить протухшие данные у тысяч пользователей — недели.
- **Рассинхрон между вкладками:** в одной вкладке данные обновились, в другой нет. Лечится \`BroadcastChannel\` или событиями storage.
- **Разрастание IndexedDB/localStorage** без очистки — рано или поздно упираетесь в квоту и получаете странные ошибки записи.
- **Service Worker, который не обновляется:** старый SW продолжает отдавать старый app shell; нужен внятный флоу \`skipWaiting\` и уведомление пользователя.
- **Спросят следом:** чем \`no-cache\` отличается от \`no-store\` (первый разрешает хранить, но требует ревалидации, второй запрещает хранить вообще) и как работает \`ETag\` с 304 (сервер подтверждает актуальность без передачи тела).`,
      en: `## In short

Frontend caching is **five floors**, each with its own rules: the browser's HTTP cache, the Service Worker, the in-memory app cache, CDN/edge, and persistent storage. Picking a strategy comes down to one question: **how bad is it to show the user stale data**.

Analogy: fridge, freezer and shop. Dry grains keep for years — those are hashed assets, put them on the back shelf and never touch them. Milk you want fresh, but yesterday's is still drinkable — that's stale-while-revalidate. But an exchange rate or an account balance must never come out of the fridge: shop, every single time.

## Five layers and three strategies

1. **Browser HTTP cache** — \`Cache-Control\`, \`ETag\`, \`Last-Modified\`. Hashed assets get \`max-age=31536000, immutable\`. HTML gets \`no-cache\`, or users get stuck on an old build.
2. **Service Worker (PWA)** — a programmable cache: gives you offline and full control over what is served when.
3. **In-memory app cache** — a data layer like TanStack Query or your own: keeps API responses in SPA memory and deduplicates identical requests.
4. **CDN/edge** — a copy closer to the user, cutting load and latency.
5. **Persistent storage** — localStorage/IndexedDB for offline and fast cold starts.

**Three Service Worker strategies:**
- **Cache-first** — for static, immutable things: fastest, but you risk serving stale content.
- **Network-first** — where freshness matters, with a cache fallback when the network is gone.
- **Stale-while-revalidate** — serve the cache instantly and refresh in the background. The best UX balance for data that changes often but isn't freshness-critical.

**Invalidation is the hard part.** A hash in the filename solves it for assets: new build, new URL, the old cache entry is simply irrelevant. In the data layer you invalidate by key and tag — after a mutation, drop the related queries. TTL and SWR bound the age when manual invalidation isn't feasible.

## Example

\`\`\`
main.a3f9c2.js   →  Cache-Control: max-age=31536000, immutable
index.html       →  Cache-Control: no-cache
GET /api/profile →  SWR: serve cache, refresh in background
GET /api/balance →  no-store: network only
\`\`\`

Why this works: \`index.html\` with \`no-cache\` is revalidated every time and delivers links to the new hashed files. Cache the HTML aggressively and users stay on an old build forever — the most expensive caching mistake in SPAs.

## What to say in the interview

> Frontend caching is layered: the browser HTTP cache via \`Cache-Control\` and \`ETag\`, a Service Worker for offline and programmable strategies, an in-memory cache in the data layer, a CDN at the edge, and persistent storage in IndexedDB. The baseline delivery rule: hashed assets are cached aggressively as immutable for a year, while HTML is served \`no-cache\`, otherwise users get pinned to an old build. There are three strategies: cache-first for immutable content — fastest but risks staleness; network-first where freshness matters, with a cache fallback; and stale-while-revalidate, serving the cache instantly and refreshing in the background, which is the best balance for frequently changing but non-critical data. I choose by the cost of staleness: immutable assets get the aggressive cache; frequently read, rarely changed data gets SWR plus in-memory; critically fresh data like a balance or trading prices gets network-first or no-store, possibly real-time. The hardest part is invalidation: filename hashes for assets, key- and tag-based invalidation after mutations in the data layer, TTL where manual invalidation isn't possible. I design the invalidation strategy before adding the cache, never after.

## Gotchas

- **A cached \`index.html\`.** Users sit on an old build for months and you get "I can't reproduce your bug".
- **A cache with no invalidation plan.** Adding a cache takes half a day; purging stale data from thousands of clients takes weeks.
- **Cross-tab desync:** data refreshed in one tab, stale in another. Fix with \`BroadcastChannel\` or storage events.
- **IndexedDB/localStorage bloat** with no cleanup — eventually you hit the quota and get baffling write errors.
- **A Service Worker that never updates:** the old SW keeps serving the old app shell; you need a clear \`skipWaiting\` flow and a user prompt.
- **Follow-ups:** how \`no-cache\` differs from \`no-store\` (the first allows storing but requires revalidation, the second forbids storing at all), and how \`ETag\` works with a 304 (the server confirms freshness without resending the body).`,
    },
  },
  {
    id: 'arch-025',
    category: 'network-browser',
    level: 'Expert',
    tags: ['websocket', 'sse', 'real-time'],
    question: {
      ru: 'Как спроектировать real-time-фронтенд на WebSocket/SSE при высокой нагрузке?',
      en: 'How do you design a real-time frontend over WebSocket/SSE at scale?',
    },
    answer: {
      ru: `## Коротко

Сначала выбираем **трубу**: SSE — одностороннее вещание сервер→клиент поверх обычного HTTP, WebSocket — двусторонний канал. Дальше вся сложность не в подключении, а в трёх вещах: **переживать обрывы, не топить UI потоком сообщений и не терять данные**.

Аналогия: радиостанция против рации. SSE — радио: станция вещает, вы только слушаете, приёмник сам ловит волну заново, если вы проехали тоннель. WebSocket — рация: говорить можно в обе стороны, но связь надо держать, батарейку тратить и следить, чтобы канал не забился. И в обоих случаях, если новости сыплются быстрее, чем вы способны слушать, нужен не «слушать быстрее», а конспект раз в секунду.

## Порядок решений

1. **Выбор транспорта.** **SSE** — однонаправленный поверх HTTP, авто-reconnect из коробки, проще, спокойно проходит прокси; минус — лимит соединений на домен в HTTP/1.1. Идеален для лент и уведомлений. **WebSocket** — двунаправленный, низкий overhead, нужен для чата, совместного редактирования, торговли; минус — сложнее инфраструктура: апгрейд соединения, sticky sessions.
2. **Надёжность соединения.** Reconnect с **экспоненциальным backoff и jitter** — без jitter при массовом обрыве все клиенты вернутся одновременно и добьют сервер (thundering herd). Heartbeat/ping-pong, чтобы отличить живое соединение от зависшего.
3. **Не терять сообщения.** Resume по курсору или последнему \`id\` события (в SSE это \`Last-Event-ID\`), чтобы после reconnect догрузить пропущенное, а не начать с чистого листа.
4. **Производительность клиента.** Не дёргать change detection на каждое сообщение: буферизовать и отдавать в UI пачками, агрегируя за кадр через \`requestAnimationFrame\`. Парсинг делать в \`runOutsideAngular\`, входя в зону только с готовым состоянием.
5. **Backpressure.** Если поток быстрее, чем UI успевает рисовать, промежуточные значения **коалесцируем**: для котировки важна последняя цена, а не все 200 промежуточных.
6. **Согласованность.** Схема «снапшот + дельты»: начальное состояние тянем REST-ом, затем применяем инкрементальные события. Обрабатываем приход не по порядку и дубли — идемпотентность по \`id\` события.
7. **Инфраструктура.** Sticky sessions либо stateless-шлюз с pub/sub (Redis), горизонтальное масштабирование gateway, fan-out по топикам, авторизация в момент апгрейда соединения.
8. **Деградация.** Сокет упал — фолбэк на polling, честный индикатор «offline» и очередь исходящих действий, которая доедет при восстановлении.

## Пример

\`\`\`ts
// буферизация: одно обновление UI на кадр вместо сотен
messages$.pipe(
  bufferTime(100),
  filter(batch => batch.length > 0),
  map(batch => mergeIntoSnapshot(batch)),
).subscribe(state => this.state.set(state));
\`\`\`

Почему так: сто сообщений в секунду превращаются в десять обновлений сигнала. Пользователь разницы не увидит, а change detection перестанет быть узким местом.

## Что сказать на собеседовании

> Транспорт выбираю по направленности: SSE — однонаправленный поток сервер-клиент поверх HTTP, с авто-reconnect и \`Last-Event-ID\`, проще и лучше проходит прокси, идеален для лент и уведомлений; WebSocket — двунаправленный и с низким overhead, нужен для чата, совместного редактирования и торговли, но сложнее инфраструктурно из-за апгрейда и sticky sessions. Дальше три группы решений. Надёжность: reconnect с экспоненциальным backoff и обязательным jitter, чтобы при массовом обрыве не было thundering herd, heartbeat для детекта мёртвых соединений и resume по курсору последнего события, чтобы не терять сообщения. Производительность клиента: буферизация и throttle входящих апдейтов, агрегация за кадр, парсинг вне зоны Angular и backpressure — при слишком быстром потоке коалесцируем промежуточные значения и берём последнее. Согласованность: снапшот через REST плюс дельты по сокету, идемпотентность по id и обработка сообщений не по порядку. И деградация: при падении сокета фолбэк на polling, индикатор offline и очередь исходящих действий.

## Ловушки

- **Reconnect без jitter.** Все клиенты возвращаются в одну и ту же секунду и укладывают только что поднявшийся сервер.
- **Обновление стейта на каждое сообщение.** При 500 сообщениях в секунду интерфейс просто замерзает — нужен буфер.
- **Незакрытые подписки** при уходе с роута: соединения копятся, память течёт, сервер держит мёртвых клиентов.
- **Только дельты без снапшота.** Клиент, подключившийся позже, не знает исходного состояния и рисует чепуху.
- **Отсутствие идемпотентности:** после reconnect сервер шлёт события повторно, и счётчики удваиваются.
- **Спросят следом:** как авторизовать WebSocket (токен на апгрейде, а не в query-строке, которая утекает в логи), и почему SSE упирается в лимит соединений на HTTP/1.1, но не на HTTP/2.`,
      en: `## In short

First pick the **pipe**: SSE is a one-way server→client broadcast over ordinary HTTP; WebSocket is a two-way channel. After that, the difficulty isn't connecting — it's three things: **surviving disconnects, not drowning the UI in messages, and not losing data**.

Analogy: a radio station versus a walkie-talkie. SSE is radio: the station broadcasts, you only listen, and your receiver re-tunes itself after you drive through a tunnel. WebSocket is the walkie-talkie: you can talk both ways, but you have to hold the link, spend battery, and keep the channel from jamming. And in both cases, when news arrives faster than you can listen, the answer isn't "listen faster" — it's a summary once a second.

## The order of decisions

1. **Transport choice.** **SSE** — unidirectional over HTTP, auto-reconnect built in, simpler, sails through proxies; downside is the per-domain connection limit on HTTP/1.1. Ideal for feeds and notifications. **WebSocket** — bidirectional, low overhead, required for chat, collaborative editing and trading; downside is heavier infrastructure: the upgrade handshake and sticky sessions.
2. **Connection reliability.** Reconnect with **exponential backoff plus jitter** — without jitter, a mass disconnect brings every client back at the same instant and re-kills the server (thundering herd). Heartbeat/ping-pong to tell a live connection from a hung one.
3. **Don't lose messages.** Resume from a cursor or the last event \`id\` (\`Last-Event-ID\` in SSE) so a reconnect replays what you missed instead of starting blank.
4. **Client performance.** Don't trigger change detection per message: buffer and hand batches to the UI, aggregating per frame with \`requestAnimationFrame\`. Parse inside \`runOutsideAngular\`, entering the zone only with finished state.
5. **Backpressure.** When the stream outpaces rendering, **coalesce** intermediate values: for a price ticker only the latest price matters, not all 200 in between.
6. **Consistency.** The snapshot-plus-deltas model: fetch initial state over REST, then apply incremental events. Handle out-of-order delivery and duplicates via idempotency on the event \`id\`.
7. **Infrastructure.** Sticky sessions or a stateless gateway with pub/sub (Redis), horizontal gateway scaling, fan-out by topic, and authorization at the moment of the upgrade.
8. **Degradation.** Socket down — fall back to polling, show an honest "offline" indicator, and queue outbound actions to flush on recovery.

## Example

\`\`\`ts
// buffering: one UI update per frame instead of hundreds
messages$.pipe(
  bufferTime(100),
  filter(batch => batch.length > 0),
  map(batch => mergeIntoSnapshot(batch)),
).subscribe(state => this.state.set(state));
\`\`\`

Why this works: a hundred messages a second become ten signal updates. The user can't tell the difference, and change detection stops being the bottleneck.

## What to say in the interview

> I pick the transport by directionality: SSE is a one-way server-to-client stream over HTTP with built-in reconnect and \`Last-Event-ID\`, simpler and proxy-friendly, ideal for feeds and notifications; WebSocket is bidirectional and low-overhead, required for chat, collaborative editing and trading, but heavier on infrastructure because of the upgrade and sticky sessions. Then three groups of decisions. Reliability: reconnect with exponential backoff and mandatory jitter so a mass disconnect doesn't cause a thundering herd, heartbeats to detect dead connections, and resume from the last event cursor so nothing is lost. Client performance: buffer and throttle incoming updates, aggregate per frame, parse outside the Angular zone, and apply backpressure — when the stream outpaces the UI, coalesce intermediate values and keep the latest. Consistency: a REST snapshot plus socket deltas, idempotency by event id, and handling out-of-order delivery. And degradation: on socket failure fall back to polling, show an offline indicator, and queue outbound actions.

## Gotchas

- **Reconnect without jitter.** Every client returns in the same second and flattens the server that just came back up.
- **Updating state per message.** At 500 messages a second the UI simply freezes — you need the buffer.
- **Unclosed subscriptions** on route change: connections pile up, memory leaks, and the server holds dead clients.
- **Deltas with no snapshot.** A client that connects late has no baseline state and renders nonsense.
- **No idempotency:** after a reconnect the server replays events and your counters double.
- **Follow-ups:** how you authorize a WebSocket (a token on the upgrade, not in the query string where it leaks into logs), and why SSE hits a connection limit on HTTP/1.1 but not on HTTP/2.`,
    },
  },
  {
    id: 'arch-026',
    category: 'network-browser',
    level: 'Hard',
    tags: ['offline-first', 'pwa', 'optimistic-updates'],
    question: {
      ru: 'Как реализовать offline-first приложение и оптимистичные обновления с откатом?',
      en: 'How do you implement an offline-first app and optimistic updates with rollback?',
    },
    answer: {
      ru: `## Коротко

Offline-first — это когда **источником истины для интерфейса становится локальное хранилище, а сеть превращается просто в механизм синхронизации**. UI всегда читает из IndexedDB и всегда пишет в него; отправка на сервер — отдельный фоновый процесс.

Аналогия: бухгалтерия в командировке. Вы не звоните в головной офис перед каждой записью — вы пишете в свой блокнот (локальное хранилище), а по возвращении переносите всё в общую базу по порядку (очередь синхронизации). Оптимистичное обновление — это когда вы сразу считаете запись сделанной; откат — когда в офисе говорят «эта операция не прошла», и вы вычёркиваете строку и извиняетесь.

## Как это работает по шагам

1. **Service Worker** кэширует app shell и ассеты по стратегии cache-first — приложение открывается вообще без сети.
2. **IndexedDB** хранит данные приложения. UI читает **из него**, а не из сети напрямую. Это ключевое архитектурное решение: интерфейс никогда не «ждёт сеть».
3. **Sync layer** реплицирует локальные изменения на сервер, когда сеть появляется (Background Sync API).
4. **Оптимистичное обновление:** изменение применяется в UI немедленно, до ответа сервера. Перед этим сохраняем снапшот, чтобы было куда откатиться.
5. **Outbox-очередь:** каждое изменение кладётся в отдельное хранилище с флагом «pending». При восстановлении сети очередь воспроизводится **по порядку**, с retry и backoff.
6. **Идемпотентные ключи мутаций:** клиент генерирует \`clientMutationId\`, сервер по нему отбрасывает повтор. Иначе двойная отправка создаст два заказа.
7. **Разрешение конфликтов** — выбираем осознанно: last-write-wins просто, но теряет данные; версионирование через ETag отклоняет устаревшую запись и даёт смержить руками; CRDT решает задачу без потерь, но это дорого и оправдано в совместном редактировании.

## Пример

\`\`\`ts
async function optimisticUpdate(item) {
  const prev = store.snapshot();
  store.apply(item);                 // мгновенно показать
  try { await api.save(item); }
  catch { store.restore(prev); toast('Не удалось сохранить'); } // откат
}
\`\`\`

Почему так: снапшот берётся **до** применения, поэтому откат всегда возможен, даже если между делом пришли другие изменения. И пользователь обязательно получает уведомление — молчаливый откат хуже, чем ошибка.

## Что сказать на собеседовании

> Принцип offline-first: локальное хранилище — источник истины для UI, а сеть только синхронизирует. Service Worker кэширует app shell и ассеты по cache-first, чтобы приложение стартовало без сети; данные лежат в IndexedDB, и интерфейс читает оттуда, а не из сети; отдельный sync-слой реплицирует изменения на сервер через Background Sync, когда связь появляется. Оптимистичные обновления: снимаю снапшот, применяю изменение в UI немедленно, при ошибке восстанавливаю снапшот и показываю уведомление. Офлайн-мутации складываю в outbox в IndexedDB с флагом pending и воспроизвожу по порядку с retry и backoff, обязательно с идемпотентными ключами мутаций, иначе повтор создаст дубликат. Конфликты решаю осознанно: last-write-wins прост, но теряет данные; версионирование через ETag отклоняет устаревшую запись; CRDT даёт слияние без потерь, но дорог и оправдан в совместном редактировании. И критично важен честный UX: статус «синхронизируется» или «не сохранено», чтобы пользователь понимал разницу между показанным и подтверждённым.

## Ловушки

- **Оптимистичный апдейт без отката** — пользователь видит сохранённые данные, которых на сервере нет. Самая болезненная категория багов доверия.
- **Очередь без идемпотентности:** ретрай после таймаута создаёт второй платёж, хотя первый прошёл.
- **Нечестный UX.** Если интерфейс не отличает «сохранено локально» от «подтверждено сервером», пользователь узнает правду в самый неподходящий момент.
- **Раздувание IndexedDB** без чистки: квота кончается, запись падает, и приложение внезапно перестаёт работать офлайн.
- **Тестирование только happy path.** Сетевые сбои, частичная синхронизация, конфликт версий — именно там и живут баги offline-first.
- **Спросят следом:** как решаете конфликт, если два устройства правили одну запись (ETag/версия плюс явный экран разрешения), и почему порядок в очереди важен (мутация «удалить» после «создать» и наоборот дают разный результат).`,
      en: `## In short

Offline-first means **local storage becomes the source of truth for the UI, and the network is demoted to a sync mechanism**. The UI always reads from IndexedDB and always writes to it; pushing to the server is a separate background process.

Analogy: doing the books on a business trip. You don't call head office before each entry — you write in your notebook (local storage) and transfer everything into the shared ledger in order when you're back (the sync queue). An optimistic update is treating the entry as done immediately; a rollback is when the office says "that transaction was rejected" and you cross the line out and apologise.

## How it works, step by step

1. **A Service Worker** caches the app shell and assets cache-first — the app opens with no network at all.
2. **IndexedDB** holds the app data. The UI reads **from it**, never from the network directly. That's the key architectural decision: the interface never "waits for the network".
3. **A sync layer** replicates local changes to the server whenever connectivity returns (Background Sync API).
4. **Optimistic update:** the change lands in the UI immediately, before the server replies. You snapshot state first so there's somewhere to roll back to.
5. **An outbox queue:** every change goes into a dedicated store flagged "pending". When the network returns the queue replays **in order**, with retry and backoff.
6. **Idempotent mutation keys:** the client generates a \`clientMutationId\` and the server drops duplicates by it. Otherwise a double send creates two orders.
7. **Conflict resolution** is a deliberate choice: last-write-wins is simple but loses data; ETag-based versioning rejects the stale write and lets you merge manually; CRDTs solve it losslessly but are expensive and only pay off in collaborative editing.

## Example

\`\`\`ts
async function optimisticUpdate(item) {
  const prev = store.snapshot();
  store.apply(item);                 // show instantly
  try { await api.save(item); }
  catch { store.restore(prev); toast('Failed to save'); } // rollback
}
\`\`\`

Why this works: the snapshot is taken **before** applying, so rollback is always possible even if other changes arrived meanwhile. And the user is always told — a silent rollback is worse than an error.

## What to say in the interview

> The offline-first principle is that local storage is the source of truth for the UI while the network only synchronizes. A Service Worker caches the app shell and assets cache-first so the app starts without connectivity; data lives in IndexedDB and the UI reads from there rather than the network; a separate sync layer replicates changes to the server via Background Sync when the connection returns. For optimistic updates I snapshot state, apply the change to the UI immediately, and on failure restore the snapshot and surface a notification. Offline mutations go into an outbox in IndexedDB flagged pending and replay in order with retry and backoff, always with idempotent mutation keys, otherwise a retry creates a duplicate. Conflicts are resolved deliberately: last-write-wins is simple but loses data; ETag versioning rejects the stale write; CRDTs merge losslessly but are expensive and justified mainly for collaborative editing. And honest UX is critical: a "syncing" or "not saved" status so the user understands the gap between what's displayed and what's confirmed.

## Gotchas

- **An optimistic update with no rollback** — the user sees saved data that doesn't exist on the server. The most damaging class of trust bugs.
- **A queue without idempotency:** a retry after a timeout creates a second payment even though the first went through.
- **Dishonest UX.** If the UI doesn't distinguish "saved locally" from "confirmed by the server", the user finds out at the worst possible moment.
- **IndexedDB bloat** with no cleanup: the quota fills, writes fail, and the app abruptly stops working offline.
- **Testing only the happy path.** Network failures, partial syncs and version conflicts are exactly where offline-first bugs live.
- **Follow-ups:** how you resolve a conflict when two devices edited the same record (ETag/version plus an explicit resolution screen), and why queue order matters (a delete after a create versus the reverse give different results).`,
    },
  },
  {
    id: 'arch-027',
    category: 'network-browser',
    level: 'Hard',
    tags: ['auth', 'token-refresh', 'security'],
    question: {
      ru: 'Как реализовать аутентификацию с refresh токенов и silent renewal во фронтенде?',
      en: 'How do you implement authentication with token refresh and silent renewal on the frontend?',
    },
    answer: {
      ru: `## Коротко

Есть **два токена с разными ролями**. Access — короткий пропуск на 5–15 минут, лежит в памяти и ходит в каждом запросе. Refresh — долгий, лежит в httpOnly-куке, недоступной JavaScript, и нужен только чтобы выпросить новый access. Задача фронтенда — обновлять access **до** того, как пользователь упрётся в 401.

Аналогия: пропуск в бизнес-центре. Access — бумажный талон на 15 минут, его не жалко: украли — через четверть часа он бесполезен. Refresh — ваша именная карта в закрытом кармане, по ней на ресепшне выдают новый талон. И карту при каждом обмене меняют на новую (ротация): если старой попытались воспользоваться — значит, её украли, и охрана блокирует всё.

## Как это работает по шагам

1. **Access token** — короткоживущий, хранится **в памяти** (переменная, сигнал), не в localStorage: localStorage читается любым XSS-скриптом.
2. **Refresh token** — долгоживущий, лежит в **httpOnly + Secure + SameSite** куке, недоступной JS. Обновление идёт credentialled-запросом, где кука уходит автоматически.
3. **Реактивный сценарий:** пришёл \`401\` → интерсептор запускает refresh и после успеха повторяет исходный запрос.
4. **Проблема одновременных 401:** пять параллельных запросов получат 401 одновременно, и наивная реализация запустит пять refresh. Лечение — **single-flight**: первый запускает обновление, остальные ждут тот же результат через \`shareReplay(1)\` или мьютекс-Subject.
5. **Silent renewal — проактивный сценарий:** обновлять access **до истечения**, по таймеру от \`exp\`, чтобы пользователь вообще не встречал 401. В OIDC это silent renew через скрытый iframe или refresh-token grant.
6. **Refresh token rotation:** каждый refresh выдаёт новый refresh-токен и инвалидирует старый. Украденный одноразовый токен бесполезен, а **повторное использование старого = сигнал компрометации**, и сервер убивает всю сессию.
7. **CSRF:** раз refresh лежит в куке, нужна защита — \`SameSite\` плюс double-submit-токен.
8. **Logout:** ревокация на сервере, очистка куки и сброс access из памяти — все три шага, иначе выход только «визуальный».

## Пример

\`\`\`ts
// single-flight: одно обновление на всех
private refresh$ = this.doRefresh().pipe(shareReplay(1));

catchError(err => {
  if (err.status === 401) return this.refresh$.pipe(switchMap(() => retry(req)));
  return throwError(() => err);
})
\`\`\`

Почему так: \`shareReplay(1)\` превращает refresh в единственный запрос, результат которого получают все ожидающие. Без этого при загрузке дашборда с десятью виджетами вы получите десять параллельных refresh и, при включённой ротации, мгновенный разлогин.

## Что сказать на собеседовании

> Access-токен делаю короткоживущим, на 5–15 минут, и храню в памяти — в localStorage нельзя, это классическая XSS-уязвимость. Refresh-токен долгоживущий и лежит в httpOnly Secure SameSite-куке, недоступной JavaScript, обновление идёт credentialled-запросом. Реактивная схема: на 401 интерсептор запускает refresh и повторяет исходный запрос. Ключевая деталь — проблема одновременных 401: несколько параллельных запросов не должны порождать несколько refresh, поэтому делаю single-flight через \`shareReplay(1)\` — первый запускает обновление, остальные ждут его результата. Плюс silent renewal: обновляю access проактивно по таймеру от claim \`exp\`, чтобы пользователь вообще не встречал 401. По безопасности обязательна ротация refresh-токенов — каждый обмен выдаёт новый и инвалидирует старый, а повторное использование старого трактуется как компрометация и рвёт сессию; при хранении в куке нужна CSRF-защита; при логауте — ревокация на сервере, очистка куки и сброс access из памяти. И синхронизация логаута между вкладками через \`BroadcastChannel\`.

## Ловушки

- **Токены в localStorage.** Любой XSS — и сессия угнана. Классический вопрос-ловушка на собеседовании.
- **Гонки refresh без single-flight** — шторм запросов, а с ротацией ещё и мгновенный разлогин, потому что второй refresh приходит со старым токеном.
- **Бесконечный retry-цикл.** Если сервер стабильно отдаёт 401, интерсептор будет обновлять и повторять вечно; нужен лимит попыток и выход на логин.
- **Логаут только в одной вкладке.** Синхронизируйте через \`BroadcastChannel\` или storage event, иначе в соседней вкладке пользователь всё ещё «внутри».
- **Refresh-запрос через тот же интерсептор** — 401 на refresh запускает refresh, и получается рекурсия. Исключайте этот URL явно.
- **Спросят следом:** почему access в памяти теряется при перезагрузке страницы и это нормально (его тихо восстанавливают refresh-ом по куке) и чем httpOnly-кука лучше localStorage при том, что от CSRF она не защищает (она закрывает XSS, а CSRF закрывают SameSite и токен).`,
      en: `## In short

There are **two tokens with different jobs**. The access token is a short 5–15 minute pass, kept in memory and attached to every request. The refresh token is long-lived, kept in an httpOnly cookie that JavaScript cannot read, and exists only to obtain a new access token. The frontend's job is to renew the access token **before** the user hits a 401.

Analogy: passes in an office building. The access token is a paper slip valid for 15 minutes — losing it barely matters, since it's useless a quarter of an hour later. The refresh token is your personal card in a zipped pocket; you show it at reception to get a fresh slip. And the card is replaced with a new one at every exchange (rotation): if someone tries the old card, it was stolen, and security locks everything down.

## How it works, step by step

1. **Access token** — short-lived, stored **in memory** (a variable, a signal), never in localStorage, which any XSS payload can read.
2. **Refresh token** — long-lived, in an **httpOnly + Secure + SameSite** cookie invisible to JS. Renewal happens via a credentialled request where the cookie travels automatically.
3. **The reactive path:** a \`401\` arrives → the interceptor triggers a refresh and, on success, retries the original request.
4. **The concurrent-401 problem:** five parallel requests all get 401 at once, and a naive implementation fires five refreshes. The fix is **single-flight**: the first starts the refresh, the rest await the same result via \`shareReplay(1)\` or a mutex Subject.
5. **Silent renewal — the proactive path:** refresh the access token **before expiry**, on a timer derived from \`exp\`, so the user never meets a 401 at all. In OIDC that's silent renew via a hidden iframe or a refresh-token grant.
6. **Refresh token rotation:** every refresh issues a new refresh token and invalidates the old one. A stolen single-use token is worthless, and **reuse of an old one signals compromise** — the server kills the whole session.
7. **CSRF:** since the refresh token lives in a cookie, you need protection — \`SameSite\` plus a double-submit token.
8. **Logout:** server-side revocation, cookie clearing, and wiping the in-memory access token — all three, or the logout is only cosmetic.

## Example

\`\`\`ts
// single-flight: one refresh shared by everyone
private refresh$ = this.doRefresh().pipe(shareReplay(1));

catchError(err => {
  if (err.status === 401) return this.refresh$.pipe(switchMap(() => retry(req)));
  return throwError(() => err);
})
\`\`\`

Why this works: \`shareReplay(1)\` collapses the refresh into a single request whose result every waiter receives. Without it, loading a dashboard with ten widgets fires ten parallel refreshes — and with rotation enabled, that's an instant logout.

## What to say in the interview

> I keep the access token short-lived, 5 to 15 minutes, and store it in memory — localStorage is off limits, that's the classic XSS exposure. The refresh token is long-lived in an httpOnly, Secure, SameSite cookie that JavaScript can't read, and renewal goes through a credentialled request. The reactive flow: on a 401 the interceptor runs a refresh and retries the original request. The critical detail is the concurrent-401 problem: parallel requests must not spawn parallel refreshes, so I use single-flight via \`shareReplay(1)\` — the first triggers the refresh and the rest await its result. On top I add silent renewal, refreshing proactively on a timer from the \`exp\` claim so the user never hits a 401. On security, refresh token rotation is mandatory — every exchange issues a new token and invalidates the old, and reuse of an old one is treated as compromise and tears down the session; cookie storage needs CSRF protection; and logout means server-side revocation, cookie clearing and wiping the in-memory token. Plus cross-tab logout sync through \`BroadcastChannel\`.

## Gotchas

- **Tokens in localStorage.** One XSS and the session is stolen. A classic interview trap.
- **Refresh races without single-flight** — a request storm, and with rotation an instant logout, because the second refresh arrives carrying the already-invalidated token.
- **An infinite retry loop.** If the server keeps returning 401, the interceptor refreshes and retries forever; cap the attempts and fall back to the login screen.
- **Logout in one tab only.** Sync via \`BroadcastChannel\` or a storage event, otherwise the neighbouring tab is still "inside".
- **Routing the refresh call through the same interceptor** — a 401 on refresh triggers a refresh, and you've built recursion. Exclude that URL explicitly.
- **Follow-ups:** why an in-memory access token is lost on page reload and why that's fine (it's silently restored via the refresh cookie), and why an httpOnly cookie beats localStorage even though it doesn't stop CSRF (it closes XSS; CSRF is closed by SameSite plus a token).`,
    },
  },
  {
    id: 'arch-028',
    category: 'live-coding',
    level: 'Medium',
    tags: ['debounce', 'algorithm', 'closures'],
    question: {
      ru: 'Реализуйте debounce с поддержкой leading/trailing и cancel. Объясните применение.',
      en: 'Implement debounce with leading/trailing support and cancel. Explain its use.',
    },
    answer: {
      ru: `## Коротко

Debounce откладывает вызов функции до тех пор, пока не пройдёт \`wait\` миллисекунд **без новых вызовов**. Каждый новый вызов **сбрасывает таймер** заново. То есть функция срабатывает один раз — когда поток событий утих.

Аналогия: автоматическая дверь в лифте. Пока люди заходят, дверь каждый раз начинает отсчёт заново; закроется она только когда три секунды никто не входил. Throttle — это, наоборот, дверь по расписанию: закрывается каждые пять секунд независимо от того, кто заходит.

## Как это работает по шагам

1. При каждом вызове **сохраняем последние аргументы и \`this\`** — при trailing сработает именно последний набор.
2. Если таймер уже был — **сбрасываем** его и заводим новый на \`wait\` мс.
3. **Trailing (по умолчанию):** когда таймер наконец дотикал без прерываний, вызываем функцию.
4. **Leading:** вызываем сразу на первом событии, а дальше молчим, пока не наступит новая пауза.
5. **\`cancel()\`** сбрасывает таймер и забывает накопленные аргументы — нужен при уничтожении компонента.
6. **Отличие от throttle:** debounce реагирует на **конец** всплеска (один раз после паузы), throttle ограничивает частоту до одного раза в \`wait\` и работает **во время** всплеска.

## Пример

\`\`\`ts
const search = debounce((q: string) => api.search(q), 300);
input.addEventListener('input', e => search((e.target as HTMLInputElement).value));
// печатаем "angular" за 500 мс → один запрос вместо семи
\`\`\`

Почему так: сеть дёргается один раз, с финальным значением. Именно поэтому debounce — правильный выбор для поиска-as-you-type: промежуточные «a», «an», «ang» никому не нужны.

## Что сказать на собеседовании

> Debounce откладывает вызов функции до тех пор, пока не пройдёт заданный интервал без новых вызовов; каждый новый вызов сбрасывает таймер. Применяется там, где нужен только финальный результат всплеска событий: поиск по мере ввода, ресайз окна, валидация поля. Отличие от throttle принципиальное: debounce реагирует на конец всплеска и срабатывает один раз после паузы, а throttle ограничивает частоту до одного вызова в интервал и работает прямо во время всплеска — поэтому для скролла нужен throttle, а для автодополнения debounce. Есть два режима: trailing по умолчанию — вызов после паузы, и leading — вызов на первом событии с тишиной до следующей паузы. Сложность O(1) по времени и памяти. Из практических нюансов: обязательно сохранять \`this\` и аргументы последнего вызова, обязательно иметь \`cancel\` и звать его при уничтожении компонента, иначе получим утечку и вызов после destroy. В Angular для потоков я предпочту RxJS \`debounceTime\`, ручная реализация нужна для DOM-утилит.

## Ловушки

- **Потерянный \`this\`.** Если внутри вызвать \`fn(...args)\` вместо \`fn.apply(lastThis, lastArgs)\`, метод класса сломается.
- **Старые аргументы.** При trailing надо вызывать с **последними** аргументами, а не с теми, что были при заведении таймера.
- **Нет \`cancel\`** — после ухода с роута таймер дотикает и дёрнет уничтоженный компонент.
- **Debounce вместо throttle на скролле:** прогресс-бар не обновится ни разу, пока пользователь не остановится.
- **Общий debounce на несколько независимых источников** — события одного гасят события другого.
- **Спросят следом:** как сделать так, чтобы debounce возвращал промис с результатом, и почему в RxJS \`debounceTime\` внутри \`switchMap\` ещё и отменяет предыдущий запрос — то, чего ручной debounce сам не делает.`,
      en: `## In short

Debounce postpones a call until \`wait\` milliseconds have passed **with no new calls**. Every new call **resets the timer**. So the function fires exactly once — when the stream of events has settled.

Analogy: a lift's automatic doors. While people keep stepping in, the countdown restarts each time; the doors close only after three seconds with nobody entering. Throttle is the opposite — doors on a schedule, closing every five seconds regardless of who's walking in.

## How it works, step by step

1. On every call, **store the latest arguments and \`this\`** — trailing must fire with that latest set.
2. If a timer already exists, **clear it** and start a fresh one for \`wait\` ms.
3. **Trailing (default):** when the timer finally elapses uninterrupted, invoke the function.
4. **Leading:** invoke immediately on the first event, then stay silent until a new pause occurs.
5. **\`cancel()\`** clears the timer and forgets the buffered arguments — essential on component destroy.
6. **Versus throttle:** debounce reacts to the **end** of a burst (once, after the pause); throttle caps frequency to once per \`wait\` and keeps firing **during** the burst.

## Example

\`\`\`ts
const search = debounce((q: string) => api.search(q), 300);
input.addEventListener('input', e => search((e.target as HTMLInputElement).value));
// typing "angular" in 500 ms → one request instead of seven
\`\`\`

Why this works: the network is hit once, with the final value. That's exactly why debounce fits search-as-you-type: nobody needs the intermediate "a", "an", "ang".

## What to say in the interview

> Debounce postpones a call until a given interval passes with no new calls; each new call resets the timer. It fits anywhere only the final result of a burst matters: search-as-you-type, window resize, field validation. The difference from throttle is fundamental: debounce reacts to the end of a burst and fires once after the pause, while throttle caps the rate to one call per interval and keeps firing during the burst — which is why scrolling wants throttle and autocomplete wants debounce. There are two modes: trailing by default, calling after the pause, and leading, calling on the first event then staying quiet until the next pause. Complexity is O(1) in time and space. Practical details: you must preserve \`this\` and the latest call's arguments, and you must expose a \`cancel\` and call it on component destroy, otherwise you leak and fire into a destroyed component. In Angular I'd reach for RxJS \`debounceTime\` for streams; the hand-rolled version is for DOM utilities.

## Gotchas

- **Losing \`this\`.** Calling \`fn(...args)\` instead of \`fn.apply(lastThis, lastArgs)\` breaks any class method.
- **Stale arguments.** Trailing must invoke with the **latest** arguments, not the ones present when the timer was set.
- **No \`cancel\`** — after leaving the route the timer still fires into a destroyed component.
- **Debounce where throttle was needed on scroll:** the progress bar never updates until the user stops.
- **One shared debounce across several independent sources** — events from one silence events from another.
- **Follow-ups:** how you'd make the debounced function return a promise with the result, and why RxJS \`debounceTime\` inside a \`switchMap\` also cancels the in-flight request — something a hand-rolled debounce doesn't do on its own.`,
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
    category: 'live-coding',
    level: 'Medium',
    tags: ['throttle', 'algorithm', 'performance'],
    question: {
      ru: 'Реализуйте throttle с trailing-вызовом. Когда throttle лучше debounce?',
      en: 'Implement throttle with a trailing call. When is throttle better than debounce?',
    },
    answer: {
      ru: `## Коротко

Throttle гарантирует, что функция вызовется **не чаще одного раза в \`wait\` миллисекунд**. В отличие от debounce, он работает **во время** непрерывного потока событий, а не только после его окончания.

Аналогия: турникет в метро. Люди подходят непрерывно, но пропускает он строго по одному в секунду — поток не останавливается, просто становится равномерным. Debounce же — это охранник, который открывает дверь только когда очередь окончательно рассосалась.

## Как это работает по шагам

1. Запоминаем время **последнего фактического вызова**.
2. На новом событии считаем, сколько осталось до конца окна: \`wait - (now - lastCall)\`.
3. Осталось ноль или меньше — **leading edge**: вызываем немедленно и обновляем \`lastCall\`.
4. Окно ещё не истекло — планируем **trailing**-вызов на остаток окна, если он ещё не запланирован.
5. При этом всегда сохраняем **последние** аргументы и \`this\`, чтобы trailing сработал с актуальным значением.
6. **Зачем trailing:** без него последнее событие внутри окна просто теряется — прокрутка остановилась на позиции 780, а обработчик остался с 640.
7. **Когда throttle, а не debounce:** скролл и прогресс-бар (обновлять надо во время прокрутки, а не после), мышиные перемещения для рисования (нужны равномерные сэмплы), rate-limiting вызовов API при непрерывном вводе. Debounce лучше там, где важен только **финальный** результат всплеска — например, автодополнение поиска.

## Пример

\`\`\`ts
const onScroll = throttle(() => updateProgressBar(window.scrollY), 100);
window.addEventListener('scroll', onScroll, { passive: true });
// событий сотни в секунду → максимум 10 обновлений, но они идут ВО ВРЕМЯ прокрутки
\`\`\`

Почему так: с debounce полоска прогресса не двинулась бы вообще, пока пользователь скроллит. Здесь же она едет плавно, а нагрузка ограничена сверху.

## Что сказать на собеседовании

> Throttle гарантирует вызов не чаще одного раза в заданный интервал. Ключевое отличие от debounce: он выполняет обработчик во время непрерывного потока событий, а не только после паузы. Поэтому для скролла, прогресс-баров, перемещений мыши при рисовании и rate-limiting API нужен throttle, а debounce — там, где важен только финальный результат всплеска, как в автодополнении. Реализация: храню время последнего вызова, на новом событии считаю остаток окна; если окно истекло — вызываю сразу, это leading edge; если нет — планирую trailing-вызов на остаток. Trailing обязателен, иначе последнее событие внутри окна теряется и UI застревает на предпоследнем значении. Важная деталь реализации — считать время через \`Date.now()\` или \`performance.now()\`, а не полагаться только на \`setTimeout\`, иначе интервалы поплывут. И сохранять последние аргументы для trailing-вызова. Сложность O(1) по времени и памяти. В RxJS аналог — \`throttleTime\` с опцией \`trailing: true\`.

## Ловушки

- **Throttle без trailing.** Последнее событие теряется: пользователь остановил скролл, а индикатор показывает позицию столетней давности.
- **Опора только на \`setTimeout\`** без учёта реального прошедшего времени — интервалы плывут, особенно во вкладке в фоне.
- **Потерянные аргументы и \`this\`** — та же ошибка, что и в debounce.
- **Throttle там, где нужен debounce:** автодополнение начнёт слать запрос каждые 300 мс во время набора вместо одного в конце.
- **Не забыть \`cancel\`** при уничтожении компонента, иначе запланированный trailing выстрелит в пустоту.
- **Спросят следом:** чем throttle отличается от \`requestAnimationFrame\`-троттлинга (rAF привязан к кадру и не выполняется в фоновой вкладке — для визуальных обновлений он часто лучше) и что произойдёт при \`wait = 0\`.`,
      en: `## In short

Throttle guarantees a function runs **at most once per \`wait\` milliseconds**. Unlike debounce, it keeps firing **during** a continuous stream of events, not just after it ends.

Analogy: a subway turnstile. People keep arriving, but it admits exactly one per second — the flow never stops, it just becomes even. Debounce, by contrast, is the guard who opens the door only once the queue has completely cleared.

## How it works, step by step

1. Record the time of the **last actual invocation**.
2. On each new event, compute how much of the window remains: \`wait - (now - lastCall)\`.
3. Zero or less remaining — **leading edge**: invoke immediately and update \`lastCall\`.
4. Window not yet elapsed — schedule a **trailing** call for the remainder, if one isn't scheduled already.
5. Always keep the **latest** arguments and \`this\`, so the trailing call fires with the current value.
6. **Why trailing matters:** without it the last event inside a window is simply dropped — scrolling stopped at 780 but the handler is stuck at 640.
7. **When throttle over debounce:** scrolling and progress bars (you must update during the scroll, not after), mouse moves for drawing (you want even samples), rate-limiting API calls during continuous input. Debounce wins where only the **final** result of a burst matters, like search autocomplete.

## Example

\`\`\`ts
const onScroll = throttle(() => updateProgressBar(window.scrollY), 100);
window.addEventListener('scroll', onScroll, { passive: true });
// hundreds of events per second → at most 10 updates, but they happen DURING the scroll
\`\`\`

Why this works: with debounce the progress bar wouldn't move at all while the user scrolls. Here it glides along while the workload stays capped.

## What to say in the interview

> Throttle guarantees a call at most once per interval. The key difference from debounce is that it runs the handler during a continuous stream of events, not only after a pause. That's why scrolling, progress bars, mouse moves for drawing and API rate-limiting want throttle, while debounce fits cases where only the final result of a burst matters, like autocomplete. Implementation: I store the last invocation time, compute the remaining window on each event, invoke immediately if the window elapsed — that's the leading edge — and otherwise schedule a trailing call for the remainder. Trailing is mandatory, otherwise the last event inside a window is lost and the UI freezes on the second-to-last value. An important implementation detail is measuring time with \`Date.now()\` or \`performance.now()\` rather than relying on \`setTimeout\` alone, or the intervals drift. And keep the latest arguments for the trailing call. Complexity is O(1) in time and space. The RxJS equivalent is \`throttleTime\` with \`trailing: true\`.

## Gotchas

- **Throttle without trailing.** The last event is dropped: the user stopped scrolling but the indicator shows an ancient position.
- **Relying on \`setTimeout\` alone** without measuring elapsed time — intervals drift, especially in a backgrounded tab.
- **Losing arguments and \`this\`** — the same mistake as in debounce.
- **Throttle where debounce belonged:** autocomplete starts firing a request every 300 ms while typing instead of one at the end.
- **Forgetting \`cancel\`** on component destroy, so the scheduled trailing call fires into nothing.
- **Follow-ups:** how throttle differs from \`requestAnimationFrame\` throttling (rAF is frame-aligned and doesn't run in a background tab — often better for visual updates), and what happens when \`wait = 0\`.`,
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
    category: 'live-coding',
    level: 'Hard',
    tags: ['deep-clone', 'algorithm', 'cycles'],
    question: {
      ru: 'Реализуйте deep clone с обработкой циклических ссылок, Map, Set и Date.',
      en: 'Implement a deep clone that handles cyclic references, Map, Set, and Date.',
    },
    answer: {
      ru: `## Коротко

Нужно рекурсивно скопировать объект так, чтобы клон **не делил ни одной ссылки** с оригиналом. Вся хитрость — в одной структуре данных: **WeakMap «оригинал → клон»**. Она разом решает и бесконечную рекурсию на циклах, и сохранение разделяемых ссылок.

Аналогия: перерисовываете карту метро от руки. Ветки пересекаются, и один и тот же узел встречается снова и снова. Если не отмечать «эту станцию я уже нарисовал, вот она», вы будете рисовать её бесконечно (цикл) или нарисуете две разных станции с одним названием (потеря общей ссылки). WeakMap — это ваш список уже нарисованных станций.

## Как это работает по шагам

1. **Примитивы и \`null\`** возвращаем как есть — копировать нечего.
2. **Особые типы обрабатываем отдельно**: \`Date\` → новый \`Date\` по таймстемпу, \`RegExp\` → новый по \`source\` и \`flags\`.
3. **Проверяем WeakMap.** Если этот объект уже клонировали — возвращаем существующий клон. Это и есть защита от циклов и сохранение общих ссылок.
4. **Создаём пустой клон и СРАЗУ кладём его в WeakMap** — до того, как начали копировать содержимое. Порядок критичен: иначе рекурсия вернётся к этому же объекту и не найдёт его в кэше.
5. **Рекурсивно копируем содержимое:** элементы массива, пары \`Map\` (ключи тоже клонируем), значения \`Set\`, собственные ключи объекта через \`Reflect.ownKeys\` — так подхватываются и символы.
6. **Прототип сохраняем** через \`Object.create(Object.getPrototypeOf(value))\`, иначе экземпляр класса превратится в обычный объект и потеряет методы.
7. **Сложность:** время \`O(n)\` по числу узлов, память \`O(n)\` на клон плюс WeakMap.

## Пример

\`\`\`ts
const a: any = { name: 'root' };
a.self = a;                       // цикл
const shared = { id: 1 };
a.x = shared; a.y = shared;       // одна ссылка дважды

const c = deepClone(a);
c.self === c;                     // true — цикл сохранён, не завис
c.x === c.y;                      // true — общая ссылка осталась общей
c.x === shared;                   // false — и при этом это уже копия
\`\`\`

Почему так: \`JSON.parse(JSON.stringify(a))\` на этом объекте просто бросит исключение. А если убрать цикл — потеряет \`undefined\`, функции и символы, превратит \`Date\` в строку, \`Map\` и \`Set\` в \`{}\`, а \`c.x\` и \`c.y\` станут двумя разными объектами.

## Что сказать на собеседовании

> Задача — рекурсивно продублировать структуру, не разделяя ссылок с оригиналом, при этом не зациклиться на циклических ссылках, сохранить разделяемые ссылки — один объект, встреченный дважды, должен остаться одним и в клоне — и корректно скопировать Date, Map, Set и массивы. \`JSON.parse(JSON.stringify())\` для этого не годится: он теряет undefined, функции и символы, превращает Date в строку, а Map и Set в пустой объект, бросает исключение на циклах и не сохраняет ни прототипы, ни общие ссылки. Ключ решения — WeakMap из оригинала в клон: перед клонированием проверяем кэш и, если объект уже склонирован, возвращаем готовый клон; это одним приёмом решает и циклы, и разделяемые ссылки за O(1). Критично класть клон в WeakMap до рекурсивного обхода содержимого, иначе цикл всё равно повесит функцию. Сложность — O(n) по времени и памяти. В проде я возьму нативный \`structuredClone\`, который поддерживает циклы, Map, Set и Date; ручную реализацию спрашивают, чтобы проверить понимание. Ограничение обоих подходов — функции не клонируются, а для классов надо явно сохранять прототип через \`Object.create\`.

## Ловушки

- **Клон кладётся в WeakMap после обхода** — и защита от циклов не работает вообще. Самая частая ошибка на живом кодинге.
- **\`JSON.parse(JSON.stringify())\` как ответ** — покажите, что знаете все пять его проблем, иначе вопрос на этом и закончится.
- **Потерянный прототип:** экземпляр класса становится обычным объектом, методы исчезают.
- **Ключи \`Map\` не клонируются** — если ключ объект, клон продолжит делить его с оригиналом.
- **\`Object.keys\` вместо \`Reflect.ownKeys\`** теряет символьные и неперечисляемые ключи.
- **Спросят следом:** почему именно \`WeakMap\`, а не \`Map\` (слабые ссылки не мешают сборке мусора), что \`structuredClone\` делает с функциями и DOM-узлами (бросает \`DataCloneError\`) и как обойти глубокую рекурсию на очень вложенных структурах (итеративный обход со стеком).`,
      en: `## In short

You need to copy an object recursively so the clone **shares no reference at all** with the original. The whole trick lives in one data structure: a **WeakMap "original → clone"**. It solves infinite recursion on cycles and preservation of shared references in a single move.

Analogy: redrawing a metro map by hand. Lines cross, and the same interchange appears again and again. Without ticking off "I've already drawn this station, here it is", you'd draw it forever (a cycle) or end up with two different stations sharing one name (a lost shared reference). The WeakMap is your list of stations already drawn.

## How it works, step by step

1. **Primitives and \`null\`** are returned as-is — there's nothing to copy.
2. **Special types get their own branch**: \`Date\` → a new \`Date\` from the timestamp, \`RegExp\` → a new one from \`source\` and \`flags\`.
3. **Check the WeakMap.** If this object was already cloned, return the existing clone. That's the cycle guard and the shared-reference preservation in one.
4. **Create the empty clone and put it in the WeakMap IMMEDIATELY** — before copying any contents. The order is critical: otherwise recursion reaches the same object and won't find it in the cache.
5. **Recursively copy the contents:** array elements, \`Map\` entries (clone the keys too), \`Set\` values, and own keys via \`Reflect.ownKeys\` so symbols come along.
6. **Preserve the prototype** with \`Object.create(Object.getPrototypeOf(value))\`, otherwise a class instance degrades into a plain object and loses its methods.
7. **Complexity:** \`O(n)\` time in the number of nodes, \`O(n)\` space for the clone plus the WeakMap.

## Example

\`\`\`ts
const a: any = { name: 'root' };
a.self = a;                       // cycle
const shared = { id: 1 };
a.x = shared; a.y = shared;       // one reference used twice

const c = deepClone(a);
c.self === c;                     // true — cycle preserved, no hang
c.x === c.y;                      // true — shared stayed shared
c.x === shared;                   // false — and it's genuinely a copy
\`\`\`

Why this matters: \`JSON.parse(JSON.stringify(a))\` simply throws on this object. Remove the cycle and it still loses \`undefined\`, functions and symbols, turns \`Date\` into a string and \`Map\`/\`Set\` into \`{}\`, and makes \`c.x\` and \`c.y\` two separate objects.

## What to say in the interview

> The task is to duplicate a structure recursively without sharing references, while not looping forever on cyclic references, preserving shared references — the same object appearing twice must remain one object in the clone — and correctly copying Date, Map, Set and arrays. \`JSON.parse(JSON.stringify())\` doesn't cut it: it loses undefined, functions and symbols, turns Date into a string and Map and Set into empty objects, throws on cycles, and preserves neither prototypes nor shared references. The key is a WeakMap from original to clone: before cloning, check the cache and return the existing clone if it's there, which handles cycles and shared references at once in O(1). Crucially you must insert the clone into the WeakMap before recursing into its contents, otherwise cycles still hang the function. Complexity is O(n) in time and space. In production I'd use the native \`structuredClone\`, which handles cycles, Map, Set and Date; the manual version is asked to check understanding. The limitation of both is that functions aren't cloneable, and for class instances you must restore the prototype explicitly via \`Object.create\`.

## Gotchas

- **Registering the clone in the WeakMap after the traversal** — the cycle guard then does nothing. The most common live-coding slip.
- **Answering "just \`JSON.parse(JSON.stringify())\`"** — show you know all five of its failures, or the question ends there.
- **A lost prototype:** the class instance becomes a plain object and its methods vanish.
- **Not cloning \`Map\` keys** — if a key is an object, the clone keeps sharing it with the original.
- **\`Object.keys\` instead of \`Reflect.ownKeys\`** drops symbol and non-enumerable keys.
- **Follow-ups:** why a \`WeakMap\` rather than a \`Map\` (weak references don't block garbage collection), what \`structuredClone\` does with functions and DOM nodes (throws \`DataCloneError\`), and how to avoid deep recursion on heavily nested structures (an iterative traversal with an explicit stack).`,
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
    category: 'live-coding',
    level: 'Medium',
    tags: ['memoize', 'algorithm', 'caching'],
    question: {
      ru: 'Реализуйте memoize с настраиваемым ключом кэша. Какие риски у мемоизации?',
      en: 'Implement memoize with a configurable cache key. What are the risks of memoization?',
    },
    answer: {
      ru: `## Коротко

Мемоизация — это **кэш результатов чистой функции по её аргументам**. Вызвали с теми же аргументами — вернули готовый ответ, не считая заново. Работает только для **детерминированных функций без побочных эффектов**.

Аналогия: калькулятор с блокнотом. Посчитали 17 × 43 — записали ответ. Спросили то же самое второй раз — читаем из блокнота. Но два условия: пример должен быть записан **точно так же** (это проблема ключа кэша), и блокнот нельзя вести бесконечно (это проблема памяти).

## Как это работает по шагам

1. Из аргументов вызова строим **ключ** — строку или объект-идентификатор.
2. Смотрим в \`Map\`: ключ есть — сразу возвращаем сохранённое значение.
3. Ключа нет — вызываем исходную функцию, кладём результат в кэш под этим ключом, возвращаем.
4. **Ключ — главная тонкость.** \`JSON.stringify(args)\` прост, но дорог и ломается на циклах, функциях и разном порядке ключей объекта. Кастомный \`resolver\` гибче: часто достаточно взять \`id\`. Если аргумент один и это объект — берите \`WeakMap\`, тогда сборщик мусора чистит кэш сам.
5. **Обязательно предусмотрите \`clear()\`** — иначе кэш нечем сбросить при смене внешних условий.
6. **Сложность:** поиск и вставка \`O(1)\` с \`Map\`, память \`O(k)\` по числу уникальных ключей.
7. **В Angular** сигналы и \`computed\` дают мемоизацию из коробки, а пайпы стоит держать \`pure\`. Ручной memoize нужен для тяжёлых чистых вычислений вне реактивного контекста.

## Пример

\`\`\`ts
// хорошо: тяжёлый чистый расчёт, ключ по id
const priceFor = memoize((p: Product) => heavyPricing(p), (p) => p.id);

// плохо: функция зависит от внешнего изменяемого состояния
const rate = memoize(() => currentExchangeRate); // навсегда застрянет на первом курсе
\`\`\`

Почему так: в первом случае функция детерминирована — при том же \`id\` результат тот же. Во втором она читает изменяемое состояние, и кэш превращается в источник устаревших данных.

## Что сказать на собеседовании

> Мемоизация кэширует результат чистой функции по её аргументам: повторный вызов с теми же аргументами возвращает сохранённое значение вместо пересчёта. Работает это только для детерминированных функций без побочных эффектов — это главное ограничение. Основная тонкость реализации — как из аргументов построить ключ: \`JSON.stringify\` прост, но дорог и ломается на циклах, функциях и разном порядке ключей; кастомный резолвер гибче, например по id; а для одного объекта-аргумента лучше \`WeakMap\`, потому что сборщик мусора чистит его сам. Сложность — O(1) на поиск и вставку, память O(k) по числу уникальных ключей. Риски конкретные: неограниченный кэш при бесконечном потоке аргументов — это утечка, лечится LRU или WeakMap; устаревшие результаты, если функция зависит от внешнего изменяемого состояния; неверный резолвер, схлопывающий разные аргументы в один ключ и дающий неправильный ответ; и накладные расходы — для дешёвой функции кэш медленнее прямого вычисления. В Angular сигналы и computed мемоизируют из коробки, ручной memoize нужен для тяжёлых чистых расчётов вне реактивного контекста.

## Ловушки

- **Неограниченный кэш.** Мемоизация функции от произвольной строки — это утечка памяти с гарантией. Нужен LRU или \`WeakMap\`.
- **Мемоизация нечистой функции.** Зависит от даты, случайности или внешнего стейта — кэш будет уверенно врать.
- **Коллизии ключей.** Резолвер, возвращающий \`String(a) + String(b)\`, склеит \`('ab','c')\` и \`('a','bc')\` в один ключ.
- **\`JSON.stringify\` на объектах с разным порядком полей** даёт разные ключи для одинаковых по смыслу аргументов — кэш не срабатывает вообще.
- **Мемоизация дешёвых функций** — накладные расходы на построение ключа больше самой работы.
- **Спросят следом:** как мемоизировать асинхронную функцию (кэшировать промис, а не результат, и удалять его при ошибке) и почему \`computed\` в Angular безопаснее ручного memoize (он сам знает свои зависимости и пересчитывается при их изменении).`,
      en: `## In short

Memoization is a **cache of a pure function's results, keyed by its arguments**. Call it with the same arguments and you get the stored answer instead of recomputing. It only works for **deterministic, side-effect-free functions**.

Analogy: a calculator with a notepad. You worked out 17 × 43 and wrote the answer down. Asked the same thing again, you read it off the pad. But two conditions apply: the question must be written **exactly the same way** (the cache-key problem), and you can't keep the pad forever (the memory problem).

## How it works, step by step

1. Build a **key** from the call arguments — a string or an identifying object.
2. Look it up in a \`Map\`: if present, return the stored value immediately.
3. If absent, call the original function, store the result under that key, and return it.
4. **The key is the subtle part.** \`JSON.stringify(args)\` is simple but costly and breaks on cycles, functions and differing object key order. A custom \`resolver\` is more flexible — often the \`id\` is enough. If there's a single object argument, use a \`WeakMap\` so the garbage collector prunes the cache for you.
5. **Always provide \`clear()\`** — otherwise there's no way to reset when external conditions change.
6. **Complexity:** lookup and insert are \`O(1)\` with a \`Map\`; space is \`O(k)\` in the number of unique keys.
7. **In Angular**, signals and \`computed\` memoize out of the box, and pipes should stay \`pure\`. A manual memoize is for heavy pure computations outside the reactive context.

## Example

\`\`\`ts
// good: a heavy pure computation, keyed by id
const priceFor = memoize((p: Product) => heavyPricing(p), (p) => p.id);

// bad: the function reads external mutable state
const rate = memoize(() => currentExchangeRate); // frozen on the first rate forever
\`\`\`

Why this matters: the first function is deterministic — the same \`id\` always yields the same result. The second reads mutable state, turning the cache into a source of stale data.

## What to say in the interview

> Memoization caches a pure function's result by its arguments: a repeat call with the same arguments returns the stored value instead of recomputing. It only works for deterministic, side-effect-free functions — that's the core constraint. The main implementation subtlety is deriving the key: \`JSON.stringify\` is simple but expensive and breaks on cycles, functions and differing key order; a custom resolver is more flexible, say by id; and for a single object argument a \`WeakMap\` is better because the garbage collector prunes it for you. Complexity is O(1) for lookup and insert, O(k) space in unique keys. The risks are concrete: an unbounded cache over an unbounded argument stream is a memory leak, fixed with an LRU bound or a WeakMap; stale results when the function depends on external mutable state; a bad resolver collapsing distinct arguments into one key and returning the wrong answer; and overhead — for a cheap function the cache is slower than just computing. In Angular, signals and computed memoize natively, so a manual memoize is reserved for heavy pure computation outside the reactive context.

## Gotchas

- **An unbounded cache.** Memoizing a function of arbitrary strings is a guaranteed leak. Use an LRU or a \`WeakMap\`.
- **Memoizing an impure function.** If it depends on the date, randomness or external state, the cache will confidently lie.
- **Key collisions.** A resolver returning \`String(a) + String(b)\` maps \`('ab','c')\` and \`('a','bc')\` to the same key.
- **\`JSON.stringify\` over objects with different field order** produces different keys for semantically identical arguments — the cache never hits.
- **Memoizing cheap functions** — building the key costs more than the work itself.
- **Follow-ups:** how you memoize an async function (cache the promise, not the result, and evict it on rejection), and why Angular's \`computed\` is safer than a manual memoize (it tracks its own dependencies and recomputes when they change).`,
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
    category: 'live-coding',
    level: 'Hard',
    tags: ['curry', 'algorithm', 'functional'],
    question: {
      ru: 'Реализуйте функцию curry, поддерживающую частичное применение по нескольку аргументов.',
      en: 'Implement a curry function supporting partial application of several arguments at a time.',
    },
    answer: {
      ru: `## Коротко

Каррирование превращает функцию \`f(a, b, c)\` в **цепочку вызовов**, которую можно кормить аргументами по частям: \`f(a)(b)(c)\`, \`f(a, b)(c)\`, \`f(a)(b, c)\` — всё одно и то же. Оригинал сработает только тогда, когда наберётся достаточно аргументов.

Аналогия: автомат с газировкой, которому нужны три монеты. Кинул одну — ждёт. Кинул ещё две — наливает. Не важно, кидал по одной или сразу парой: важно, что накопилось три.

## Как это работает по шагам

1. У функции есть свойство \`fn.length\` — **арность**, число объявленных параметров. Это и есть «сколько монет нужно».
2. Оборачиваем оригинал в функцию \`curried\`. При каждом вызове смотрим: накопленных аргументов уже \`>= fn.length\`?
3. Хватает — вызываем оригинал через \`fn.apply(this, args)\`. \`apply\` тут не для красоты: он **сохраняет \`this\`**, иначе каррированный метод объекта потеряет контекст.
4. Не хватает — возвращаем новую функцию, которая **держит уже собранные аргументы в замыкании** и ждёт остальные.
5. Пришли новые — склеиваем \`[...args, ...rest]\` и снова идём на шаг 2. Так работают и \`c(1)(2)(3)\`, и \`c(1, 2)(3)\`: разница только в том, сколько аргументов пришло за один заход.
6. **Сложность:** каждый шаг \`O(1)\` плюс копирование массива аргументов; память \`O(n)\` на накопленное.

## Зачем это нужно

- **Частичное применение:** зафиксировал первые аргументы — получил специализированную функцию, \`const add5 = add(5)\`.
- **Композиция:** \`pipe\`/\`compose\` собираются из унарных функций, а каррирование как раз превращает многоаргументные в унарные.
- **Переиспользование конфигурации** без классов и объектов настроек.

## Пример

\`\`\`ts
const sum = (a: number, b: number, c: number) => a + b + c;
const c = curry(sum);
c(1)(2)(3);   // 6
c(1, 2)(3);   // 6
c(1)(2, 3);   // 6

// а вот здесь всё ломается:
const weird = (a: number, b = 1, ...rest: number[]) => a + b;
weird.length; // 1 — ни b, ни rest не посчитаны
\`\`\`

Почему так: \`fn.length\` считает только параметры **до** первого значения по умолчанию и не учитывает rest. Каррирование такой функции «выстрелит» после первого же аргумента.

## Что сказать на собеседовании

> Каррирование превращает функцию от нескольких аргументов в цепочку, которую можно вызывать по частям: \`f(a)(b)(c)\`, \`f(a, b)(c)\` и \`f(a)(b, c)\` эквивалентны. Реализация опирается на арность \`fn.length\`: аргументов хватает — вызываем оригинал через \`apply\`, чтобы сохранить \`this\`; не хватает — возвращаем функцию, которая держит собранные аргументы в замыкании. Каждый шаг O(1), память O(n). Польза — частичное применение и композиция: \`pipe\` и \`compose\` работают с унарными функциями. Главное ограничение: \`fn.length\` не отражает реальную арность у rest-параметров и параметров со значением по умолчанию, поэтому такие и вариадические функции каррировать нельзя. И злоупотреблять не стоит: глубокое каррирование ухудшает читаемость стека и отладку, в проде хватает \`bind\` или стрелочной обёртки.

## Ловушки

- **\`fn.length\` врёт.** Rest-параметры и значения по умолчанию в неё не входят — каррирование сработает раньше срока.
- **Вариадические функции** каррировать нельзя в принципе: непонятно, когда останавливаться.
- **Потеря \`this\`.** Без \`apply\` (или стрелки, замыкающей \`this\`) каррированный метод объекта отваливается.
- **Вызов без аргументов.** \`c()\` не двигает счётчик и просто возвращает новую функцию — легко получить бесконечное «ожидание».
- **Отладка.** Стек превращается в цепочку одинаковых \`curried\` — трейс читать тяжело.
- **Спросят следом:** чем каррирование отличается от частичного применения через \`bind\` — карри даёт цепочку шагов и знает свою арность, \`bind\` фиксирует часть аргументов один раз и ничего не ждёт.`,
      en: `## In short

Currying turns \`f(a, b, c)\` into a **chain of calls** you can feed arguments to in pieces: \`f(a)(b)(c)\`, \`f(a, b)(c)\`, \`f(a)(b, c)\` — all the same thing. The original only runs once enough arguments have piled up.

Analogy: a vending machine that needs three coins. Drop one — it waits. Drop two more — it pours. It doesn't care whether you fed them one at a time or in pairs; it cares that three arrived.

## How it works, step by step

1. A function has a \`fn.length\` property — its **arity**, the number of declared parameters. That's the "how many coins" number.
2. Wrap the original in a \`curried\` function. On every call, check: are the accumulated arguments already \`>= fn.length\`?
3. Enough — call the original via \`fn.apply(this, args)\`. \`apply\` isn't decoration: it **preserves \`this\`**, otherwise a curried object method loses its context.
4. Not enough — return a new function that **holds the collected arguments in its closure** and waits for the rest.
5. When new ones arrive, concatenate \`[...args, ...rest]\` and go back to step 2. That's why \`c(1)(2)(3)\` and \`c(1, 2)(3)\` both work: the only difference is how many arguments arrived per hop.
6. **Complexity:** each step is \`O(1)\` plus copying the argument array; space is \`O(n)\` for what's accumulated.

## Why you'd want it

- **Partial application:** fix the leading arguments and get a specialized function, \`const add5 = add(5)\`.
- **Composition:** \`pipe\`/\`compose\` are built from unary functions, and currying is exactly what turns multi-argument functions into unary ones.
- **Reusing configuration** without classes or options objects.

## Example

\`\`\`ts
const sum = (a: number, b: number, c: number) => a + b + c;
const c = curry(sum);
c(1)(2)(3);   // 6
c(1, 2)(3);   // 6
c(1)(2, 3);   // 6

// and here it all falls apart:
const weird = (a: number, b = 1, ...rest: number[]) => a + b;
weird.length; // 1 — neither b nor rest counted
\`\`\`

Why this matters: \`fn.length\` only counts parameters **before** the first default value and ignores rest params. Currying such a function fires after the very first argument.

## What to say in the interview

> Currying turns a multi-argument function into a chain you can call in pieces: \`f(a)(b)(c)\`, \`f(a, b)(c)\` and \`f(a)(b, c)\` are equivalent. The implementation leans on \`fn.length\`, the arity: if the accumulated arguments are enough, call the original through \`apply\` so \`this\` is preserved; if not, return a function that keeps the collected arguments in its closure and waits for more. Each step is O(1) plus an array copy, with O(n) space for the accumulated arguments. The payoff is partial application and composition, since \`pipe\` and \`compose\` operate on unary functions. The key limitation is that \`fn.length\` doesn't reflect real arity for rest parameters or parameters with default values, so those and variadic functions can't be curried. And I wouldn't overdo it: deep currying hurts stack readability and debugging, and in production \`bind\` or an arrow wrapper is usually enough.

## Gotchas

- **\`fn.length\` lies.** Rest params and defaults aren't counted — currying fires too early.
- **Variadic functions** can't be curried at all: there's no way to know when to stop.
- **Losing \`this\`.** Without \`apply\` (or an arrow that closes over \`this\`), a curried object method breaks.
- **Calling with no arguments.** \`c()\` doesn't move the counter and just returns another function — an easy way to wait forever.
- **Debugging.** The stack becomes a chain of identical \`curried\` frames; traces are painful to read.
- **Follow-up:** how currying differs from partial application via \`bind\` — currying yields a chain of steps and knows its own arity, while \`bind\` fixes some arguments once and waits for nothing.`,
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
    category: 'live-coding',
    level: 'Medium',
    tags: ['event-emitter', 'algorithm', 'observer'],
    question: {
      ru: 'Реализуйте типобезопасный EventEmitter с on/off/once/emit. Где такой паттерн применяется?',
      en: 'Implement a type-safe EventEmitter with on/off/once/emit. Where is this pattern used?',
    },
    answer: {
      ru: `## Коротко

EventEmitter — это **доска объявлений**. Одна часть системы вешает объявление («заказ оплачен»), другие на него реагируют, и при этом друг о друге они ничего не знают. Это паттерн **Observer/PubSub**, а его смысл — **слабая связанность**.

Аналогия: подъездный чат. Кто-то пишет «привезли воду» — реагируют подписанные. Отправитель не знает поимённо, кто читает; читатель может выйти в любой момент. А если при переезде из чата не выйти — уведомления продолжат приходить вечно: это ровно утечка памяти в эмиттере.

## Как это работает по шагам

1. Внутри — \`Map\`: **имя события → набор обработчиков**. \`Set\` вместо массива, чтобы не было дублей и удаление было \`O(1)\`.
2. **\`on(event, handler)\`** — кладём обработчик в набор и **возвращаем функцию отписки**. Это важнее, чем кажется: вызывающему больше не нужно хранить ссылку на сам handler.
3. **\`off(event, handler)\`** — убираем из набора. Забыли — обработчик и всё его замыкание (компонент, DOM-узел, стор) живут вечно.
4. **\`once(event, handler)\`** — оборачиваем handler в обёртку, которая **сначала снимает саму себя**, а потом вызывает оригинал.
5. **\`emit(event, payload)\`** — синхронно проходим по подписчикам. Перед итерацией **копируем набор**: подписчик может подписать или отписать кого-то прямо во время рассылки, и итератор оригинала поедет.
6. Каждый вызов — в \`try/catch\`: падение одного подписчика не должно останавливать остальных.
7. **Сложность:** \`on\`/\`off\` — \`O(1)\`, \`emit\` — \`O(k)\` по числу подписчиков события; память — \`O(n)\` подписок.
8. **Где встречается:** \`EventEmitter\` в Node.js, DOM-события, шина событий между модулями и микрофронтендами. В Angular \`@Output()\` — это EventEmitter поверх RxJS Subject. Везде смысл один: коммуникация без прямых ссылок, вместо тесной связки через DI.

## Типобезопасность

Дженерик \`Events extends Record<string, any>\` — это карта «событие → тип payload». Тогда \`emit('order:paid', ...)\` проверяется на компиляции: и имя события, и форма данных. Опечатка в имени становится ошибкой типа, а не тихо потерянным событием, которое никто никогда не поймает.

## Пример

\`\`\`ts
const bus = new EventEmitter<{ 'order:paid': { id: string } }>();

const off = bus.on('order:paid', (p) => console.log(p.id)); // p типизирован
bus.emit('order:paid', { id: '42' });
off(); // отписались — утечки нет
\`\`\`

Почему так: \`on\` сразу возвращает отписку, поэтому очистка не требует хранить handler отдельно — закрыт самый частый источник утечек.

## Что сказать на собеседовании

> EventEmitter — это реализация Observer, он же PubSub: издатель эмитит именованные события, подписчики реагируют, друг о друге не зная, отсюда слабая связанность. Внутри — карта «событие → набор обработчиков»: \`on\` добавляет и возвращает отписку, \`off\` удаляет, \`once\` оборачивает handler обёрткой, снимающей себя, \`emit\` синхронно обходит подписчиков. Сложность: \`on\` и \`off\` — O(1), \`emit\` — O(k) по подписчикам, память O(n). Главная беда ручных эмиттеров — утечки: забытый \`off\` держит handler со всем замыканием, поэтому \`on\` обязан возвращать unsubscribe. Ещё: перед обходом набор надо копировать, потому что подписчик может отписаться во время \`emit\`, и каждый вызов оборачивать в try/catch. Типобезопасность даёт дженерик-карта «событие → payload», а в Angular это \`@Output()\` поверх Subject.

## Ловушки

- **Забытый \`off\` — утечка памяти.** Handler держит замыкание, а через него компонент и DOM. Главный минус ручных эмиттеров.
- **Мутация списка во время \`emit\`.** Обработчик, который подписывает или отписывает кого-то, ломает итерацию — копируйте набор перед обходом.
- **Одно исключение рвёт рассылку.** Без \`try/catch\` подписчики после упавшего просто не получат событие.
- **\`once\` нельзя снять по оригинальному handler** — в наборе лежит обёртка. Поэтому \`once\` тоже обязан возвращать unsubscribe.
- **\`emit\` синхронный.** Тяжёлый подписчик блокирует и остальных, и вызывающий код; асинхронность придётся вводить руками.
- **Спросят следом:** чем это отличается от RxJS Subject — Subject даёт поток с операторами, завершением и каналом ошибок, а эмиттер это просто рассылка; и почему шина событий между модулями легко превращается в неотлаживаемую «магию» — по коду не видно, кто на что реагирует.`,
      en: `## In short

An EventEmitter is a **notice board**. One part of the system pins up a notice ("order paid"), others react to it, and neither side knows anything about the other. That's the **Observer/PubSub** pattern, and its whole point is **loose coupling**.

Analogy: a building's group chat. Someone posts "water delivery is here" and whoever subscribed reacts. The sender doesn't know who's reading by name; a reader can leave any time. But if you move out and never leave the chat, the notifications keep coming forever — that's exactly a memory leak in an emitter.

## How it works, step by step

1. Inside there's a \`Map\`: **event name → set of handlers**. A \`Set\` rather than an array, so there are no duplicates and removal is \`O(1)\`.
2. **\`on(event, handler)\`** — add the handler to the set and **return an unsubscribe function**. That matters more than it looks: the caller no longer has to keep a reference to the handler itself.
3. **\`off(event, handler)\`** — remove it from the set. Forget it and the handler plus its whole closure (component, DOM node, store) lives forever.
4. **\`once(event, handler)\`** — wrap the handler in a wrapper that **removes itself first** and then calls the original.
5. **\`emit(event, payload)\`** — walk the subscribers synchronously. **Copy the set before iterating**: a subscriber may subscribe or unsubscribe someone mid-broadcast, which would break the live iterator.
6. Wrap each call in \`try/catch\`: one subscriber blowing up must not stop the rest.
7. **Complexity:** \`on\`/\`off\` are \`O(1)\`, \`emit\` is \`O(k)\` in the number of subscribers; space is \`O(n)\` subscriptions.
8. **Where you meet it:** Node.js \`EventEmitter\`, DOM events, an event bus between modules and micro-frontends. In Angular, \`@Output()\` is an EventEmitter over an RxJS Subject. The idea is always the same: communication without direct references, instead of tight coupling through DI.

## Type safety

The generic \`Events extends Record<string, any>\` is a map of "event → payload type". Then \`emit('order:paid', ...)\` is checked at compile time — both the event name and the data shape. A typo in the name becomes a type error rather than a silently lost event nobody will ever catch.

## Example

\`\`\`ts
const bus = new EventEmitter<{ 'order:paid': { id: string } }>();

const off = bus.on('order:paid', (p) => console.log(p.id)); // p is typed
bus.emit('order:paid', { id: '42' });
off(); // unsubscribed — no leak
\`\`\`

Why this matters: \`on\` hands back the unsubscribe immediately, so cleanup doesn't require storing the handler separately — the most common source of leaks is closed off.

## What to say in the interview

> An EventEmitter implements Observer, also known as PubSub: a publisher emits named events and subscribers react without either side referencing the other, which is where the loose coupling comes from. Inside it's a map of "event → set of handlers": \`on\` adds and returns an unsubscribe function, \`off\` removes, \`once\` wraps the handler in a wrapper that removes itself, and \`emit\` walks the subscribers synchronously. Complexity is O(1) for \`on\` and \`off\`, O(k) for \`emit\` in the number of subscribers, and O(n) space for subscriptions. The main problem with hand-rolled emitters is leaks: a forgotten \`off\` retains the handler and its entire closure, which is why \`on\` must return an unsubscribe. Two more details: copy the set before iterating, because a subscriber can subscribe or unsubscribe during \`emit\`, and wrap each call in try/catch so one error doesn't abort the broadcast. Type safety comes from a generic "event → payload" map. In Angular this is \`@Output()\` over a Subject.

## Gotchas

- **A forgotten \`off\` is a memory leak.** The handler retains its closure, and through it the component and DOM. The main downside of manual emitters.
- **Mutating the list during \`emit\`.** A handler that subscribes or unsubscribes someone breaks the iteration — copy the set before walking it.
- **One exception aborts the broadcast.** Without \`try/catch\`, subscribers after the failing one never receive the event.
- **\`once\` can't be removed by the original handler** — the set holds the wrapper. So \`once\` must return an unsubscribe too.
- **\`emit\` is synchronous.** A heavy subscriber blocks both the other subscribers and the calling code; asynchrony has to be introduced by hand.
- **Follow-ups:** how this differs from an RxJS Subject — a Subject is a stream with operators, completion and an error channel, while an emitter is just a broadcast; and why an event bus between modules easily becomes undebuggable magic, since nothing in the code shows who reacts to what.`,
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
    category: 'live-coding',
    level: 'Hard',
    tags: ['lru-cache', 'algorithm', 'data-structures'],
    question: {
      ru: 'Реализуйте LRU-кэш с O(1) get и put. Где он применяется во фронтенде?',
      en: 'Implement an LRU cache with O(1) get and put. Where is it used on the frontend?',
    },
    answer: {
      ru: `## Коротко

LRU-кэш (Least Recently Used) — это кэш **с потолком по размеру**, который при переполнении выбрасывает элемент, к которому дольше всего не обращались. И \`get\`, и \`put\` обязаны быть \`O(1)\`.

Аналогия: книжная полка на десять книг. Взял книгу почитать — ставишь обратно к себе поближе, с краю. Принёс новую, а места нет — выбрасываешь ту, что оказалась на дальнем конце: её дольше всех не трогали.

## Как это работает по шагам

1. Классика из учебника — **хеш-таблица плюс двусвязный список**. Map даёт \`ключ → узел\` за \`O(1)\`, список хранит порядок использования: голова — самый свежий, хвост — кандидат на вылет.
2. **\`get\`:** нашли узел через map, **вырезали из списка и переставили в голову**. Вырезание \`O(1)\` именно потому, что список двусвязный — у узла есть ссылки на обоих соседей, искать их не нужно.
3. **\`put\`:** ключ уже есть — обновили значение и в голову. Ключа нет, а размер на пределе — **удалили хвост** и его ключ из map, потом вставили новый узел в голову.
4. **Трюк в JS:** \`Map\` сам **сохраняет порядок вставки**, поэтому список не нужен. На \`get\` делаем \`delete\` и сразу \`set\` — ключ переезжает в конец и становится самым свежим.
5. При переполнении удаляем \`map.keys().next().value\` — это первый ключ итератора, то есть самый старый. Получается компактнее двусвязного списка и так же \`O(1)\` (амортизированно).
6. **Сложность:** \`get\`/\`put\` — \`O(1)\`, память — \`O(capacity)\`, то есть **ограниченная по определению**. Это и есть главное отличие от обычного кэша.

## Где это нужно во фронтенде

- Кэш ответов API и загруженных изображений с потолком по памяти.
- **Мемоизация с границей** — вместо неограниченного кэша, который гарантированно течёт.
- Кэш вычисленных значений в дашбордах, кэш данных роутов и подгруженных чанков.

## Пример

\`\`\`ts
const cache = new LRUCache<string, User>(2);
cache.put('a', userA);
cache.put('b', userB);
cache.get('a');        // 'a' стал свежим => самый старый теперь 'b'
cache.put('c', userC); // вытеснится 'b', а не 'a'
\`\`\`

Почему так: вытеснение идёт **по последнему обращению**, а не по времени добавления. \`a\` добавили раньше, но трогали позже — значит, он ценнее.

## Что сказать на собеседовании

> LRU-кэш хранит не больше \`capacity\` элементов и при переполнении вытесняет тот, к которому дольше всего не обращались, причём и \`get\`, и \`put\` должны быть O(1). Классика — двусвязный список плюс хеш-таблица: map даёт доступ к узлу за O(1), список хранит порядок использования, голова — самый свежий, хвост — кандидат на вытеснение, а перемещение узла и удаление хвоста стоят O(1). В JS проще: \`Map\` сохраняет порядок вставки, поэтому на \`get\` делаем \`delete\` и \`set\`, чтобы ключ уехал в конец, а на переполнении удаляем первый ключ итератора — амортизированно O(1). Память O(capacity). На фронте это кэш ответов API и картинок, мемоизация с границей, кэш роутов и чанков. Важный нюанс: LRU вытесняет по использованию, но не по протуханию, поэтому за свежесть отвечает отдельный TTL.

## Ловушки

- **LRU — это не про свежесть.** Он вытесняет по обращениям, а не по возрасту данных. Нужна актуальность — добавляйте TTL поверх, это отдельный механизм.
- **\`set\` без \`delete\` не двигает ключ.** В \`Map\` порядок задаётся **первой** вставкой, поэтому обновление существующего ключа обязано идти через \`delete\` + \`set\`, иначе LRU молча превратится в FIFO.
- **Без границы кэш = утечка.** Именно это LRU и лечит детерминированно, в отличие от «почистим когда-нибудь».
- **\`map.keys().next().value\`** типизируется как \`K | undefined\` — нужна проверка или приведение, иначе TS не пропустит.
- **\`capacity\` меньше единицы** — вырожденный случай, проверяйте в конструкторе.
- **Кэш держит объекты живыми**, GC их не заберёт. \`WeakMap\` тут не замена: он не даёт ни порядка, ни размера.
- **Спросят следом:** чем LRU отличается от LFU (там вытесняется самый редко используемый, а не самый давний) и что делать с конкурентным доступом из Web Worker — нужна синхронизация.`,
      en: `## In short

An LRU (Least Recently Used) cache is a cache **with a size ceiling** that, on overflow, throws out the item nobody has touched for the longest time. Both \`get\` and \`put\` must be \`O(1)\`.

Analogy: a shelf that fits ten books. You take one down to read and put it back at the near end, within reach. You bring a new one home and there's no room — you toss whatever ended up at the far end, because that's what you haven't touched the longest.

## How it works, step by step

1. The textbook structure is a **hash map plus a doubly linked list**. The map gives \`key → node\` in \`O(1)\`; the list holds usage order — head is the most recent, tail is the eviction candidate.
2. **\`get\`:** find the node through the map, then **splice it out of the list and move it to the head**. Splicing is \`O(1)\` precisely because the list is doubly linked — the node already points at both neighbours, so nothing has to be searched.
3. **\`put\`:** if the key exists, update the value and move to head. If it doesn't and the cache is full, **drop the tail** (and its key from the map), then insert the new node at the head.
4. **The JS trick:** \`Map\` already **preserves insertion order**, so the list isn't needed. On \`get\`, do a \`delete\` immediately followed by a \`set\` — the key moves to the end and becomes the most recent.
5. On overflow, delete \`map.keys().next().value\` — the first key from the iterator, i.e. the oldest. That's more compact than a linked list and still \`O(1)\` amortized.
6. **Complexity:** \`get\`/\`put\` are \`O(1)\`, space is \`O(capacity)\` — **bounded by definition**. That bound is the whole difference from a plain cache.

## Where the frontend needs it

- Caching API responses and loaded images with a memory ceiling.
- **Bounded memoization** — instead of an unbounded cache that is guaranteed to leak.
- Caching computed dashboard values, route data and loaded chunks.

## Example

\`\`\`ts
const cache = new LRUCache<string, User>(2);
cache.put('a', userA);
cache.put('b', userB);
cache.get('a');        // 'a' is now fresh => the oldest is 'b'
cache.put('c', userC); // evicts 'b', not 'a'
\`\`\`

Why this matters: eviction follows **last access**, not insertion time. \`a\` was added earlier but touched later, so it's the more valuable one.

## What to say in the interview

> An LRU cache holds at most \`capacity\` items and, on overflow, evicts the least recently used one, with both \`get\` and \`put\` required to be O(1). The classic implementation is a doubly linked list plus a hash map: the map gives O(1) access to a node, the list keeps usage order with the head as the most recent item and the tail as the eviction candidate, and in a doubly linked list moving a node or dropping the tail both cost O(1). JS offers a shortcut: \`Map\` preserves insertion order, so on \`get\` a \`delete\` followed by a \`set\` moves the key to the end, and on overflow you delete the iterator's first key — amortized O(1) and much simpler than a list. Space is O(capacity). On the frontend this backs API and image caches, bounded memoization instead of a leaking unbounded cache, and caches for routes and chunks. One important nuance: LRU evicts by usage, never by staleness, so data freshness needs a separate TTL.

## Gotchas

- **LRU is not about freshness.** It evicts by access, not by data age. If you need current data, layer a TTL on top — that's a separate mechanism.
- **\`set\` without \`delete\` doesn't move the key.** In a \`Map\`, order is fixed by the **first** insertion, so updating an existing key must go through \`delete\` + \`set\`, otherwise your LRU silently degrades into FIFO.
- **An unbounded cache is a leak.** That's exactly what LRU fixes deterministically, unlike "we'll clean it up eventually".
- **\`map.keys().next().value\`** is typed \`K | undefined\` — you need a check or a cast, or TS won't accept it.
- **\`capacity\` below one** is a degenerate case; validate it in the constructor.
- **The cache keeps objects alive**, so the GC won't collect them. A \`WeakMap\` is no substitute here: it gives you neither order nor size.
- **Follow-ups:** how LRU differs from LFU (which evicts the least frequently used rather than the least recent), and what to do about concurrent access from a Web Worker — that needs synchronization.`,
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
    category: 'live-coding',
    level: 'Hard',
    tags: ['concurrency', 'promise-pool', 'algorithm'],
    question: {
      ru: 'Реализуйте promise pool (ограничитель конкурентности). Зачем он нужен?',
      en: 'Implement a promise pool (concurrency limiter). Why is it needed?',
    },
    answer: {
      ru: `## Коротко

\`Promise.all(tasks)\` запускает **все** задачи разом. Promise pool — это ограничитель: одновременно выполняется не больше \`limit\` задач, остальные ждут своей очереди.

Аналогия: автомойка на три бокса. Машин сто, но моются ровно три. Освободился бокс — заезжает следующая. Общая пропускная способность та же, зато никто не сносит ворота и не глохнет во дворе.

## Как это работает по шагам

1. Почему нельзя просто \`Promise.all\` на тысяче запросов: сервер начинает отвечать **429** (rate limit), браузер всё равно упирается в лимит одновременных соединений к домену, а память и дескрипторы кончаются.
2. Заводим массив результатов **нужной длины сразу** и общий указатель \`nextIndex\`.
3. Запускаем ровно \`limit\` «воркеров» — обычных async-функций. Каждый в цикле: забирает себе текущий индекс, тут же увеличивает указатель, ждёт свою задачу.
4. Освободился — сам берёт следующий индекс. Отдельная очередь и таймеры не нужны: указатель общий, а JS однопоточный, поэтому \`nextIndex++\` не разъезжается между воркерами.
5. Результат кладём **по индексу**, а не \`push\` — тогда порядок результатов совпадает с порядком задач, независимо от того, кто финишировал первым.
6. Ждём \`Promise.all(workers)\` — воркеров всего \`limit\` штук, это дёшево. Цикл внутри каждого сам разгребёт все \`n\` задач.
7. **Сложность:** время \`O(n)\` задач, но пропускная способность ограничена \`limit\`; память \`O(n)\` под результаты.

## Где это нужно во фронтенде

- Массовая загрузка файлов и изображений батчами.
- Префетч множества ресурсов без штурма сети.
- Параллельная обработка с контролем нагрузки на API.

## Пример

\`\`\`ts
// задачи — ФУНКЦИИ, а не готовые промисы
const tasks = urls.map((u) => () => fetch(u).then((r) => r.json()));
await promisePool(tasks, 5); // одновременно не больше пяти запросов
\`\`\`

Почему так: промис стартует **в момент создания**. Передадите массив готовых промисов — все сто запросов уже ушли в сеть, и ограничивать будет нечего. Пул умеет тормозить только фабрики.

## Что сказать на собеседовании

> \`Promise.all\` запускает все промисы сразу, и на тысяче запросов это перегружает сервер до 429 и упирается в браузерный лимит соединений, поэтому нужен ограничитель конкурентности. Реализация простая: массив результатов нужной длины плюс общий указатель, запускаем ровно \`limit\` воркеров, каждый в цикле забирает следующий индекс, инкрементит указатель и ждёт свою задачу. Результаты пишем по индексу, поэтому порядок совпадает с порядком задач, а не завершения. Время O(n) задач при пропускной способности \`limit\`, память O(n). Ключевая деталь: на вход идут функции-фабрики, а не готовые промисы, иначе всё уже стартовало и ограничивать нечего. Дальше стратегия ошибок: fail-fast как \`Promise.all\` или сбор всех исходов как \`allSettled\` — второе чаще нужнее. В проде я бы взял \`p-limit\` или \`p-map\`.

## Ловушки

- **Передали промисы вместо фабрик** — они уже запущены, пул бесполезен. Самая частая ошибка на собеседовании.
- **Стратегия ошибок не выбрана.** В базовой версии первая ошибка отклоняет весь \`Promise.all(workers)\`, а остальные воркеры продолжают крутиться вхолостую. Чаще нужен сбор всех исходов, как в \`allSettled\`.
- **\`push\` вместо записи по индексу** — порядок результатов станет порядком завершения, и сопоставить их с входом уже не получится.
- **Отмена.** Пул не отменяет уже запущенные задачи; для этого нужен \`AbortController\`.
- **Backpressure.** Если источник задач бесконечный (стрим, пагинация), очередь надо ограничивать, иначе память вырастет на весь массив.
- **\`limit\` больше числа задач** — лишние воркеры создавать незачем, отсюда \`Math.min\`.
- **Спросят следом:** зачем изобретать, если есть \`p-limit\` и \`p-map\` — в проде брать их, а руками писать имеет смысл ради понимания и отсутствия зависимости.`,
      en: `## In short

\`Promise.all(tasks)\` fires **every** task at once. A promise pool is the limiter: at most \`limit\` tasks run concurrently and the rest wait their turn.

Analogy: a car wash with three bays. A hundred cars show up, exactly three get washed. A bay frees up, the next car pulls in. Total throughput is the same, but nobody tears the gate off its hinges.

## How it works, step by step

1. Why plain \`Promise.all\` fails on a thousand requests: the server starts returning **429** (rate limit), the browser hits its per-domain concurrent-connection cap anyway, and memory and handles run out.
2. Allocate a results array **at full length up front** plus a shared \`nextIndex\` pointer.
3. Launch exactly \`limit\` "workers" — plain async functions. Each loops: claim the current index, immediately bump the pointer, await its task.
4. When a worker finishes, it grabs the next index itself. No separate queue or timers are needed: the pointer is shared and JS is single-threaded, so \`nextIndex++\` never gets torn between workers.
5. Write each result **by index** rather than pushing — then result order matches task order regardless of who finished first.
6. Await \`Promise.all(workers)\` — there are only \`limit\` workers, which is cheap. The loop inside each one chews through all \`n\` tasks.
7. **Complexity:** time is \`O(n)\` tasks, but throughput is capped by \`limit\`; space is \`O(n)\` for the results.

## Where the frontend needs it

- Bulk uploading files and images in batches.
- Prefetching many resources without flooding the network.
- Parallel processing with controlled API load.

## Example

\`\`\`ts
// tasks are FUNCTIONS, not ready-made promises
const tasks = urls.map((u) => () => fetch(u).then((r) => r.json()));
await promisePool(tasks, 5); // never more than five requests at a time
\`\`\`

Why this matters: a promise starts **the moment it's created**. Pass an array of ready promises and all hundred requests are already on the wire, leaving nothing to limit. A pool can only throttle factories.

## What to say in the interview

> \`Promise.all\` starts every promise at once, and across a thousand requests that overloads the server into 429s, hits the browser's connection cap and burns memory, so you need a concurrency limiter. The implementation is simple: allocate a results array at full length plus a shared pointer, launch exactly \`limit\` workers, and have each one loop — claim the next index, bump the pointer, await its task, then take another when it's free. Results are written by index, so their order matches the task order rather than the completion order. Time is O(n) tasks at \`limit\` throughput, space O(n). The crucial detail is that the input must be factory functions, not ready promises, otherwise everything has already started and there's nothing left to throttle. Then you pick an error strategy: fail-fast like \`Promise.all\`, or collect every outcome like \`allSettled\`, which is usually what you actually want. In production I'd reach for \`p-limit\` or \`p-map\`.

## Gotchas

- **Passing promises instead of factories** — they're already running and the pool does nothing. The single most common interview mistake here.
- **No chosen error strategy.** In the basic version the first rejection rejects the whole \`Promise.all(workers)\` while the remaining workers keep spinning pointlessly. Usually you want all outcomes collected, \`allSettled\`-style.
- **\`push\` instead of writing by index** — result order becomes completion order, and you can no longer match results to inputs.
- **Cancellation.** The pool doesn't cancel already-started tasks; that needs an \`AbortController\`.
- **Backpressure.** If the task source is unbounded (a stream, pagination), the queue must be bounded or memory grows with the whole array.
- **\`limit\` larger than the task count** — there's no point creating idle workers, hence the \`Math.min\`.
- **Follow-up:** why write it at all when \`p-limit\` and \`p-map\` exist — take them in production; hand-rolling is for understanding it and avoiding a dependency.`,
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
    category: 'live-coding',
    level: 'Hard',
    tags: ['retry', 'backoff', 'algorithm'],
    question: {
      ru: 'Реализуйте retry с экспоненциальной задержкой и jitter. Когда retry опасен?',
      en: 'Implement retry with exponential backoff and jitter. When is retry dangerous?',
    },
    answer: {
      ru: `## Коротко

\`retry\` повторяет асинхронную операцию при сбое — но не сразу и не бесконечно. **Экспоненциальный backoff** удлиняет паузу с каждой попыткой (\`base * 2^attempt\`), а **jitter** добавляет к паузе случайность.

Аналогия: дозвон в занятую поддержку. Ты перезваниваешь через минуту, потом через две, потом через четыре — это backoff, ты даёшь линии разгрузиться. А jitter — это чтобы тысяча таких же звонящих не набирала номер ровно в одну и ту же секунду и не клала линию заново.

## Как это работает по шагам

1. Пробуем вызвать \`fn()\`. Успех — сразу возвращаем результат, дальше ничего не происходит.
2. Ошибка — первым делом спрашиваем \`shouldRetry(err)\`: эта ошибка вообще **лечится повтором**? Если нет — пробрасываем сразу, без пауз.
3. Проверяем счётчик попыток. Исчерпан — пробрасываем последнюю ошибку наружу.
4. Считаем задержку: \`baseDelay * factor ** attempt\` — 300, 600, 1200, 2400 мс. Обрезаем потолком \`maxDelay\`, иначе на десятой попытке будем ждать часами.
5. Добавляем **jitter**: в варианте full jitter реальная пауза — случайное число от нуля до расчётной. Клиенты «размазываются» по времени.
6. Ждём, увеличиваем счётчик, идём на новый круг.
7. **Зачем backoff:** перегруженному сервису нужно время подняться. Мгновенный повтор — это добивание лежачего.
8. **Зачем jitter:** без него все клиенты, упавшие в одну секунду, синхронно ретраят в одну секунду и снова валят сервис — это **thundering herd**, эффект стада, и он идёт волнами.
9. **Сложность:** до \`O(maxRetries)\` попыток, память \`O(1)\`.

## Когда retry ОПАСЕН

- **Не идемпотентные операции.** Повтор \`POST /payment\` может **списать деньги дважды**: запрос дошёл, а ответ потерялся. Безопасно ретраить только идемпотентное — GET, PUT, либо POST с idempotency-key.
- **Ошибки 4xx, кроме 429 и 408.** \`400\`, \`401\`, \`403\`, \`404\` от повтора не исправятся: это не «не повезло», это «вы неправы». Ретраить стоит сетевые сбои, 5xx, 429 и 408.
- **Retry storm.** При системном сбое массовые ретраи усиливают перегрузку и мешают сервису встать. Нужен **circuit breaker**: после череды ошибок он вообще отключает попытки на время.
- **Нет верхней границы** — получается бесконечный цикл, который сам себя не остановит.

## Пример

\`\`\`ts
await retry(() => fetch('/api/report').then((r) => r.json()), {
  retries: 3,
  shouldRetry: (e) => isNetworkError(e) || is5xx(e) || is429(e),
});

// а это ретраить нельзя без idempotency-key:
// await retry(() => post('/api/payment', body));
\`\`\`

Почему так: \`shouldRetry\` — не украшение, а предохранитель. Без него ретраятся и \`401\`, и \`404\`, то есть мы просто утраиваем бесполезную нагрузку.

## Что сказать на собеседовании

> \`retry\` повторяет операцию при сбое ограниченное число раз, с экспоненциальным backoff: пауза растёт как база на два в степени попытки и обрезается потолком. Backoff даёт перегруженному сервису время восстановиться, а jitter — случайная добавка к паузе — лечит thundering herd: без него клиенты, упавшие в одну секунду, ретраят синхронно и кладут сервис повторно. Сложность — до O(maxRetries) попыток, память O(1). Но ретрай опасен: не идемпотентные операции — повтор \`POST /payment\` может списать деньги дважды, поэтому ретраим только GET, PUT или POST с idempotency-key; 4xx кроме 429 и 408 повтором не лечатся; retry storm при системном сбое, от него спасает circuit breaker. Ограничивать надо не только число попыток, но и общее время через \`AbortController\`. В RxJS есть \`retry\` с count и delay.

## Ловушки

- **Ретрай не идемпотентного запроса.** Классика провала: платёж, отправка письма, создание заказа. Ответ потерялся ≠ операция не выполнилась.
- **Ретрай любых ошибок подряд.** \`401\` и \`404\` повтор не исправит, зато нагрузка утроится. Всегда разделяйте retryable и non-retryable.
- **Backoff без потолка.** \`2 ** 10\` — это уже минуты ожидания; нужен \`maxDelay\`.
- **Backoff без jitter.** Стадо клиентов ретраит синхронными волнами и не даёт сервису подняться.
- **Ограничен только счётчик, но не время.** Три попытки по 30 секунд — это полторы минуты, пока пользователь смотрит на спиннер. Ограничивайте общее время через \`AbortController\` или таймаут.
- **Ретрай поверх ретрая.** Клиент, gateway и сервис ретраят каждый по три раза — на бэкенде это двадцать семь запросов. Решайте, на каком слое ретрай живёт.
- **Спросят следом:** что такое circuit breaker и как он сочетается с retry (открывается после череды ошибок и режет попытки на уровне сервиса), и как это делается в RxJS — \`retry({ count, delay })\` или \`retryWhen\` с \`timer\` и jitter.`,
      en: `## In short

\`retry\` repeats an async operation after a failure — but not immediately and not forever. **Exponential backoff** stretches the pause with each attempt (\`base * 2^attempt\`), and **jitter** sprinkles randomness on top of that pause.

Analogy: calling a support line that's busy. You call back after a minute, then two, then four — that's backoff, giving the line room to clear. Jitter is what stops a thousand other callers from redialing at the exact same second and jamming the line all over again.

## How it works, step by step

1. Call \`fn()\`. On success, return the result immediately — nothing else happens.
2. On failure, first ask \`shouldRetry(err)\`: is this error **fixable by repeating at all**? If not, rethrow right away, no waiting.
3. Check the attempt counter. Exhausted — rethrow the last error to the caller.
4. Compute the delay: \`baseDelay * factor ** attempt\` — 300, 600, 1200, 2400 ms. Clamp it with \`maxDelay\`, or by the tenth attempt you'd be waiting for hours.
5. Add **jitter**: with full jitter the actual pause is a random value between zero and the computed delay. Clients smear out across time.
6. Wait, increment the counter, go round again.
7. **Why backoff:** an overloaded service needs time to get back up. An instant retry is kicking it while it's down.
8. **Why jitter:** without it, every client that failed in the same second retries in the same second and takes the service down again — that's the **thundering herd**, and it arrives in waves.
9. **Complexity:** up to \`O(maxRetries)\` attempts, \`O(1)\` space.

## When retry is DANGEROUS

- **Non-idempotent operations.** Retrying \`POST /payment\` can **charge the card twice**: the request landed, the response got lost. Only idempotent things are safe — GET, PUT, or POST with an idempotency key.
- **4xx errors except 429 and 408.** \`400\`, \`401\`, \`403\`, \`404\` won't heal on repetition: that's not bad luck, that's "you're wrong". Retry network failures, 5xx, 429 and 408.
- **Retry storms.** During a systemic failure, mass retries amplify the overload and keep the service from recovering. You need a **circuit breaker** that stops attempts entirely for a while after a streak of errors.
- **No upper bound** — you've written an infinite loop that will never stop itself.

## Example

\`\`\`ts
await retry(() => fetch('/api/report').then((r) => r.json()), {
  retries: 3,
  shouldRetry: (e) => isNetworkError(e) || is5xx(e) || is429(e),
});

// and this must not be retried without an idempotency key:
// await retry(() => post('/api/payment', body));
\`\`\`

Why this matters: \`shouldRetry\` isn't decoration, it's the safety catch. Without it you retry \`401\`s and \`404\`s too, which just triples useless load.

## What to say in the interview

> \`retry\` repeats an operation on failure a bounded number of times using exponential backoff: the pause grows as base times two to the power of the attempt number and is clamped by a ceiling. Backoff gives an overloaded service time to recover, and jitter — a random component added to the pause — cures the thundering herd, because without it every client that failed in the same second retries in lockstep and knocks the service over again. Complexity is up to O(maxRetries) attempts with O(1) space. But retry is dangerous in three situations. First, non-idempotent operations: retrying \`POST /payment\` can charge twice, so only GET, PUT, or POST with an idempotency key. Second, 4xx other than 429 and 408 can't be fixed by repeating — pure wasted load. Third, retry storms during a systemic outage, which is what a circuit breaker is for. And you should bound total elapsed time with a timeout or \`AbortController\`, not just the attempt count. In RxJS this is \`retry\` with count and delay.

## Gotchas

- **Retrying a non-idempotent request.** The classic failure: payments, sending mail, creating orders. A lost response is not the same as an operation that didn't run.
- **Retrying every error indiscriminately.** \`401\` and \`404\` won't be fixed by repeating, but the load triples. Always split retryable from non-retryable.
- **Backoff with no ceiling.** \`2 ** 10\` already means minutes of waiting; you need \`maxDelay\`.
- **Backoff without jitter.** The herd retries in synchronized waves and never lets the service back up.
- **Bounding attempts but not time.** Three attempts at 30 seconds each is a minute and a half of the user watching a spinner. Cap total time with an \`AbortController\` or timeout.
- **Retries stacked on retries.** Client, gateway and service each retrying three times means twenty-seven requests hitting the backend. Decide which layer owns the retry.
- **Follow-ups:** what a circuit breaker is and how it pairs with retry (it trips after a streak of errors and cuts attempts at the service level), and how you'd do this in RxJS — \`retry({ count, delay })\` or \`retryWhen\` with \`timer\` and jitter.`,
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
    category: 'live-coding',
    level: 'Medium',
    tags: ['flatten', 'algorithm', 'recursion'],
    question: {
      ru: 'Реализуйте flatten вложенного массива до заданной глубины (и итеративно для глубоких массивов).',
      en: 'Implement flatten of a nested array to a given depth (and iteratively for deep arrays).',
    },
    answer: {
      ru: `## Коротко

Задача — превратить \`[1, [2, [3, [4]]]]\` в плоский список. Параметр \`depth\` говорит, **на сколько уровней вскрывать**, ровно как нативный \`Array.prototype.flat(depth)\`.

Аналогия: коробки внутри коробок. \`depth = 1\` — вскрыл только внешние коробки и выложил содержимое на стол; что внутри вложенных коробок — так и осталось в коробках. \`Infinity\` — вскрываем, пока есть что вскрывать.

## Как это работает по шагам

1. **Рекурсивный вариант.** Идём по элементам массива. Элемент — не массив? Кладём в результат как есть.
2. Элемент — массив **и \`depth > 0\`**? Вызываем себя же для него с \`depth - 1\` и подмешиваем результат. Уменьшение глубины — единственное, что мешает разворачивать бесконечно.
3. \`depth\` дошла до нуля — вложенный массив кладётся **целиком, как значение**. Это не баг, это и есть смысл параметра.
4. **Сложность:** время \`O(n)\`, где n — общее число элементов вместе с вложенными; память \`O(n)\` под результат плюс \`O(d)\` на стек вызовов, где d — глубина вложенности.
5. **Проблема глубоких структур.** Каждый уровень вложенности — это кадр в call stack. На тысячах уровней получаем **stack overflow**, и обычный try/catch тут не спасёт.
6. **Итеративный вариант** обходит это: заводим собственный массив-стек. В цикле \`pop\` последний элемент; массив — \`push\` его содержимое обратно в стек; не массив — в результат.
7. Стек живёт в куче, а не в call stack, поэтому глубина ограничена только памятью. В конце \`reverse()\` — из-за \`pop\` элементы собрались в обратном порядке.
8. **Почему \`push\` + \`reverse\`, а не \`unshift\`:** \`unshift\` сдвигает весь массив, это \`O(n)\` на каждый элемент, итого \`O(n²)\`. \`push\` — \`O(1)\`, а один \`reverse\` в конце — \`O(n)\`.

## Пример

\`\`\`ts
flatten([1, [2, [3, [4]]]]);           // [1, 2, [3, [4]]]  — depth = 1 по умолчанию
flatten([1, [2, [3, [4]]]], Infinity); // [1, 2, 3, 4]

// в проде обычно достаточно нативного:
[1, [2, [3, [4]]]].flat(Infinity);     // [1, 2, 3, 4]
\`\`\`

Почему так: при \`depth = 1\` вскрывается только первый уровень, остальное остаётся вложенным массивом. Ручная реализация нужна для собеседования или старого окружения — в реальном коде берите \`flat\`.

## Что сказать на собеседовании

> Рекурсивный \`flatten\` идёт по элементам: если элемент массив и оставшаяся глубина больше нуля, разворачиваем его рекурсивно с \`depth - 1\`, иначе кладём как есть. Время O(n) по общему числу элементов, память O(n) под результат плюс O(d) на стек рекурсии. Проблема именно в этом O(d): каждый уровень вложенности — кадр стека, и на тысячах уровней ловим stack overflow. Поэтому для произвольной глубины делаю итеративный вариант с собственным стеком-массивом: снимаем элемент, массив — заталкиваем содержимое обратно в стек, иначе в результат, в конце \`reverse\`. Стек лежит в куче, call stack не растёт. Важная деталь: собирать через \`push\` и один \`reverse\`, а не через \`unshift\`, потому что \`unshift\` это O(n) на элемент и суммарно O(n²). В проде я бы взял нативный \`flat\`.

## Ловушки

- **Рекурсия падает на глубоких массивах.** Переполнение стека — главный ответ, которого ждут; итеративный вариант с явным стеком его снимает.
- **\`unshift\` в цикле** превращает \`O(n)\` в \`O(n²)\`. \`push\` + \`reverse\` — правильный вариант.
- **\`reduce\` + \`concat\`** выглядит элегантно, но \`concat\` каждый раз создаёт новый промежуточный массив — в худшем случае снова \`O(n²)\`.
- **Забыть \`reverse\`** в итеративной версии — порядок элементов молча перевернётся.
- **\`push(...next)\`** на очень большом вложенном массиве может упереться в лимит числа аргументов функции; на гигантских данных безопаснее цикл.
- **\`depth\` по умолчанию равен 1**, а не бесконечности — как и у нативного \`flat\`. На этом ловят регулярно.
- **Спросят следом:** чем \`flat\` отличается от \`flatMap\` (второй разворачивает ровно один уровень и делает это за один проход с \`map\`) и что \`flat\` попутно **выбрасывает дырки** в разреженных массивах.`,
      en: `## In short

The task is turning \`[1, [2, [3, [4]]]]\` into a flat list. The \`depth\` parameter says **how many levels to open up**, exactly like native \`Array.prototype.flat(depth)\`.

Analogy: boxes inside boxes. \`depth = 1\` means you opened only the outer boxes and tipped their contents onto the table; whatever sat inside the inner boxes is still boxed. \`Infinity\` means you keep opening while there's anything left to open.

## How it works, step by step

1. **The recursive version.** Walk the elements. Not an array? Push it into the result as-is.
2. An array **and \`depth > 0\`**? Call yourself on it with \`depth - 1\` and splice the result in. Decrementing the depth is the only thing stopping infinite unwrapping.
3. Once \`depth\` reaches zero, a nested array is pushed **whole, as a value**. That's not a bug — that's the entire point of the parameter.
4. **Complexity:** time \`O(n)\` where n is the total element count including nested ones; space \`O(n)\` for the result plus \`O(d)\` of call stack, where d is the nesting depth.
5. **The deep-structure problem.** Every nesting level is a call-stack frame. At thousands of levels you get a **stack overflow**, and a plain try/catch won't save you.
6. **The iterative version** sidesteps that: keep your own array as a stack. In a loop, \`pop\` the last item; if it's an array, \`push\` its contents back onto the stack; if not, push it into the result.
7. That stack lives on the heap, not the call stack, so depth is limited only by memory. Finish with \`reverse()\` — because of \`pop\`, the items came out backwards.
8. **Why \`push\` + \`reverse\` and not \`unshift\`:** \`unshift\` shifts the whole array, \`O(n)\` per element, \`O(n²)\` overall. \`push\` is \`O(1)\` and a single trailing \`reverse\` is \`O(n)\`.

## Example

\`\`\`ts
flatten([1, [2, [3, [4]]]]);           // [1, 2, [3, [4]]]  — depth defaults to 1
flatten([1, [2, [3, [4]]]], Infinity); // [1, 2, 3, 4]

// in production the native one is usually enough:
[1, [2, [3, [4]]]].flat(Infinity);     // [1, 2, 3, 4]
\`\`\`

Why this matters: at \`depth = 1\` only the first level is opened and the rest stays a nested array. The manual implementation is for interviews or legacy environments — real code should use \`flat\`.

## What to say in the interview

> A recursive \`flatten\` walks the elements: if an element is an array and the remaining depth is above zero, unwrap it recursively with \`depth - 1\`, otherwise push it as-is. Time is O(n) in the total element count, space is O(n) for the result plus O(d) of recursion stack, where d is the nesting depth. That O(d) is exactly the problem: every nesting level is a stack frame, so thousands of levels give you a stack overflow. For arbitrary depth I therefore write the iterative version with an explicit array stack: pop an item, and if it's an array push its contents back onto the stack, otherwise push it into the result, then reverse the result at the end. The stack lives on the heap and the call stack never grows. One performance detail matters: collect with \`push\` plus a single \`reverse\` rather than \`unshift\`, because \`unshift\` is O(n) per element and O(n²) in total. In production I'd just use the native \`flat\`.

## Gotchas

- **Recursion dies on deep arrays.** Stack overflow is the answer they're fishing for; the iterative version with an explicit stack removes it.
- **\`unshift\` inside the loop** turns \`O(n)\` into \`O(n²)\`. \`push\` + \`reverse\` is the right shape.
- **\`reduce\` + \`concat\`** looks elegant, but \`concat\` builds a fresh intermediate array every time — worst case \`O(n²)\` again.
- **Forgetting \`reverse\`** in the iterative version silently flips the element order.
- **\`push(...next)\`** on a very large nested array can hit the engine's argument-count limit; on huge data a loop is safer.
- **\`depth\` defaults to 1**, not infinity — same as native \`flat\`. People trip on this constantly.
- **Follow-ups:** how \`flat\` differs from \`flatMap\` (which unwraps exactly one level while mapping in a single pass), and the fact that \`flat\` also **drops holes** in sparse arrays.`,
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
    category: 'live-coding',
    level: 'Medium',
    tags: ['group-by', 'algorithm', 'data-transform'],
    question: {
      ru: 'Реализуйте groupBy с настраиваемой функцией ключа. Объясните типизацию.',
      en: 'Implement groupBy with a configurable key function. Explain the typing.',
    },
    answer: {
      ru: `## Коротко

\`groupBy\` раскладывает массив на группы по ключу, который вычисляется **из самого элемента**. На выходе — объект или \`Map\` вида \`ключ → массив элементов\`.

Аналогия: почтальон с пачкой писем и ячейками в подъезде. Ключ — номер квартиры на конверте. Ячейки нет — завёл новую; есть — просто дописал письмо в неё. Один проход по пачке, каждое письмо трогаем ровно один раз.

## Как это работает по шагам

1. Один проход \`reduce\` (или обычный \`for..of\`) по массиву — больше ничего не нужно.
2. Для каждого элемента вызываем \`keyFn(item)\` и получаем ключ. Функция ключа снаружи — это и есть вся настраиваемость: группировать можно по чему угодно, хоть по \`user.role\`, хоть по первой букве имени.
3. Кладём элемент в соответствующий бакет, создавая массив при **первом появлении** ключа. Идиома \`(acc[key] ??= []).push(item)\` делает ровно это одной строкой.
4. **Сложность:** время \`O(n)\`, память \`O(n)\` — каждый элемент попадает ровно в одну группу.
5. **Порядок внутри группы сохраняется** — элементы лежат в том же порядке, что и во входном массиве. Для UI это важно: список не «прыгает» после группировки.
6. \`groupBy\` обязан быть **чистым**: входной массив не мутируем, отсюда \`readonly T[]\` в сигнатуре.

## Типизация и выбор контейнера

\`\`\`ts
function groupBy<T, K extends PropertyKey>(
  items: readonly T[], keyFn: (item: T) => K
): Record<K, T[]>
\`\`\`

- \`K extends PropertyKey\` ограничивает ключ типом \`string | number | symbol\` — только такое объект и умеет держать.
- \`Record<K, T[]>\` точно описывает форму результата, и TS подскажет имена групп, если \`K\` — union литералов.
- **Объект** удобен, но ключи приводятся к строке: \`1\` и \`'1'\` схлопнутся в одну группу, а объект в роли ключа превратится в \`[object Object]\`.
- **\`Map\`** сохраняет тип ключа и не конфликтует с прототипом — \`__proto__\` и \`constructor\` в нём обычные ключи. Для нетривиальных ключей берите \`Map<K, T[]>\`, там ограничение \`PropertyKey\` не нужно вовсе.

## Пример

\`\`\`ts
const byRole = groupBy(users, (u) => u.role);        // Record<Role, User[]>
const byDept = groupByMap(users, (u) => u.department); // ключ — объект, тип сохранён

// в современных рантаймах то же самое есть из коробки:
Object.groupBy(users, (u) => u.role);
\`\`\`

Почему так: \`Object.groupBy\` и \`Map.groupBy\` уже нативные — если рантайм позволяет, ручная реализация не нужна.

## Что сказать на собеседовании

> \`groupBy\` разбивает массив на группы по ключу, вычисляемому из элемента функцией \`keyFn\`, и возвращает объект или \`Map\` вида ключ — массив элементов. Реализация — один проход \`reduce\`: считаем ключ, при первом появлении заводим массив и пушим элемент, отсюда O(n) по времени и памяти. Порядок внутри группы совпадает с исходным, что важно для UI, а функция должна быть чистой. По типизации: \`K extends PropertyKey\` ограничивает ключ типами \`string\`, \`number\` и \`symbol\`, а \`Record<K, T[]>\` описывает форму результата — правда, формально обещает все ключи, честнее \`Partial\`. Объект приводит ключи к строке, из-за чего \`1\` и \`'1'\` схлопываются, и конфликтует с именами вроде \`__proto__\`; \`Map\` сохраняет тип ключа. В рантаймах есть нативные \`Object.groupBy\` и \`Map.groupBy\`.

## Ловушки

- **Ключи объекта — всегда строки.** \`1\` и \`'1'\` попадут в одну группу, а объект в качестве ключа даст \`[object Object]\` для всех элементов сразу.
- **\`__proto__\` как значение ключа.** На обычном \`{}\` присваивание в этот ключ ведёт себя не как обычное свойство. Спасает \`Object.create(null)\` или \`Map\`.
- **\`Record<K, T[]>\` слегка врёт:** TS считает, что есть все ключи из \`K\`, а реально там только встреченные. Строже — \`Partial<Record<K, T[]>>\`, иначе обращение к пустой группе даст \`undefined\` вопреки типу.
- **Мутация входа.** \`groupBy\` должен быть чистым; \`readonly T[]\` в сигнатуре это фиксирует.
- **Тяжёлая \`keyFn\`.** Она вызывается на каждый элемент — форматирование даты или \`JSON.stringify\` внутри неё легко превращают \`O(n)\` в заметную задержку.
- **Спросят следом:** чем это отличается от нативного \`Object.groupBy\` (тот всегда возвращает объект с \`null\`-прототипом и приводит ключи к строке) и как сгруппировать по нескольким полям — составной строковый ключ с разделителем, но тогда следите за коллизиями.`,
      en: `## In short

\`groupBy\` sorts an array into groups by a key computed **from the element itself**. The output is an object or a \`Map\` shaped \`key → array of elements\`.

Analogy: a postman with a bundle of letters and a wall of mailboxes. The key is the flat number on the envelope. No box yet? Start one. Box exists? Drop the letter in. One pass through the bundle, each letter handled exactly once.

## How it works, step by step

1. A single \`reduce\` pass (or a plain \`for..of\`) over the array — nothing more is needed.
2. For each element call \`keyFn(item)\` to get its key. Taking the key function from outside is the whole configurability story: you can group by \`user.role\`, by the first letter of a name, by anything.
3. Push the element into the matching bucket, creating the array on the key's **first appearance**. The idiom \`(acc[key] ??= []).push(item)\` does exactly that in one line.
4. **Complexity:** \`O(n)\` time, \`O(n)\` space — every element lands in exactly one group.
5. **Order within a group is preserved** — elements keep their input order. That matters for UI: the list doesn't jump around after grouping.
6. \`groupBy\` must be **pure**: never mutate the input array, which is what \`readonly T[]\` in the signature pins down.

## Typing and choosing the container

\`\`\`ts
function groupBy<T, K extends PropertyKey>(
  items: readonly T[], keyFn: (item: T) => K
): Record<K, T[]>
\`\`\`

- \`K extends PropertyKey\` constrains the key to \`string | number | symbol\` — the only things an object can actually hold as keys.
- \`Record<K, T[]>\` describes the result shape precisely, and TS will even autocomplete group names when \`K\` is a union of literals.
- **An object** is convenient, but keys are coerced to strings: \`1\` and \`'1'\` collapse into one group, and an object used as a key becomes \`[object Object]\`.
- **A \`Map\`** preserves the key type and never collides with the prototype — \`__proto__\` and \`constructor\` are ordinary keys in it. For non-trivial keys use \`Map<K, T[]>\`, where the \`PropertyKey\` constraint isn't needed at all.

## Example

\`\`\`ts
const byRole = groupBy(users, (u) => u.role);          // Record<Role, User[]>
const byDept = groupByMap(users, (u) => u.department); // object key, type preserved

// modern runtimes ship the same thing:
Object.groupBy(users, (u) => u.role);
\`\`\`

Why this matters: \`Object.groupBy\` and \`Map.groupBy\` are already native — if the runtime allows it, the hand-rolled version is unnecessary.

## What to say in the interview

> \`groupBy\` splits an array into groups by a key computed from each element via a \`keyFn\`, returning an object or a \`Map\` of key to array of elements. The implementation is a single \`reduce\` pass: compute the key, create an empty array on its first appearance, push the element — hence O(n) time and O(n) space. Element order inside a group matches the input order, which matters for UI, and the function itself must be pure and never touch the input. On typing: \`K extends PropertyKey\` constrains the key to \`string\`, \`number\` and \`symbol\`, and \`Record<K, T[]>\` describes the result shape — though strictly it promises every key exists, so \`Partial<Record<K, T[]>>\` is the honest type. An object is convenient but coerces keys to strings, so \`1\` and the string \`'1'\` collapse, and it collides with prototype names like \`__proto__\`; a \`Map\` keeps the key type and has neither problem. Modern runtimes provide native \`Object.groupBy\` and \`Map.groupBy\`.

## Gotchas

- **Object keys are always strings.** \`1\` and \`'1'\` land in the same group, and an object key produces \`[object Object]\` for every element at once.
- **\`__proto__\` as a key value.** On a plain \`{}\`, assigning to that key doesn't behave like an ordinary property. \`Object.create(null)\` or a \`Map\` fixes it.
- **\`Record<K, T[]>\` slightly lies:** TS believes every key in \`K\` is present, while only the encountered ones are. \`Partial<Record<K, T[]>>\` is stricter; otherwise reading an empty group yields \`undefined\` against the type.
- **Mutating the input.** \`groupBy\` must be pure; \`readonly T[]\` in the signature enforces it.
- **An expensive \`keyFn\`.** It runs per element, so date formatting or a \`JSON.stringify\` inside it easily turns \`O(n)\` into a noticeable stall.
- **Follow-ups:** how this differs from native \`Object.groupBy\` (which always returns a null-prototype object and stringifies keys), and how to group by several fields — a composite string key with a separator, watching out for collisions.`,
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
    category: 'live-coding',
    level: 'Hard',
    tags: ['deep-equality', 'algorithm', 'comparison'],
    question: {
      ru: 'Реализуйте deep equality для объектов, массивов, Map, Set, Date и NaN.',
      en: 'Implement deep equality for objects, arrays, Map, Set, Date, and NaN.',
    },
    answer: {
      ru: `## Коротко

Глубокое равенство — это сравнение **по содержимому, а не по ссылке**: два значения равны, если рекурсивно совпадает всё, что внутри. \`{a: 1} === {a: 1}\` даёт \`false\`, потому что это разные объекты, а \`deepEqual\` должен сказать \`true\`.

Аналогия: две квартиры. Ссылочное равенство спрашивает «это одна и та же квартира?». Глубокое — «обстановка одинаковая?»: обходим комнату за комнатой и сверяем каждый предмет.

## Как это работает по шагам

1. Начинаем с \`Object.is(a, b)\` — он закрывает сразу три случая: одинаковая ссылка, равные примитивы и, главное, **\`NaN\`**. Обычное \`NaN === NaN\` даёт \`false\`, а \`Object.is(NaN, NaN)\` — \`true\`, чего мы и хотим.
2. Если хоть одно из значений не объект или \`null\` — дальше сравнивать нечего, возвращаем \`false\`.
3. Сверяем конструкторы. Разные конструкторы — разные сущности: массив не равен объекту, \`Date\` не равна строке.
4. **\`Date\`** сравниваем по \`getTime()\`, **\`RegExp\`** — по \`toString()\`. Без этого две одинаковые даты будут «разными», ведь свойств у них нет.
5. **\`Map\`:** сначала размеры, потом для каждой пары проверяем, что ключ есть у второго, и рекурсивно сравниваем значения. Порядок вставки не важен.
6. **\`Set\`:** размеры плюс \`has\` для каждого элемента.
7. **Массивы:** длины, потом поэлементная рекурсия.
8. **Обычные объекты:** берём \`Reflect.ownKeys\` — он видит и символы, не только строки. Сравниваем количество ключей, затем для каждого проверяем наличие у второго через \`hasOwnProperty\` и рекурсивно сравниваем значения.
9. **Сложность:** время \`O(n)\` по числу узлов дерева, память \`O(d)\` на стек рекурсии.
10. **Циклы.** Объект, ссылающийся сам на себя, отправит рекурсию в бесконечность. Лечится \`WeakMap\` посещённых пар: перед спуском записали пару, встретили её снова — считаем равными. В базовой версии опущено ради ясности, в проде нужно.

## Где применять, а где нет

Глубокое сравнение стоит \`O(n)\` **на каждый вызов**. В горячем пути — в change detection, в \`OnPush\`, в мемоизации — это дорого: дешёвая поверхностная проверка почти всегда лучше, а по-настоящему правильный ответ — **иммутабельность плюс сравнение ссылок**: новый объект создаётся только при реальном изменении, и тогда \`===\` достаточно. Глубокое равенство уместно в тестовых ассертах, инвалидации кэша и дедупликации. Готовые реализации: lodash \`isEqual\`, \`fast-deep-equal\`.

## Пример

\`\`\`ts
deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }); // true
deepEqual(NaN, NaN);                                   // true — через Object.is
deepEqual(new Date(0), new Date(0));                   // true — по getTime()
deepEqual(0, -0);                                      // false — Object.is различает
\`\`\`

Почему так: \`Object.is\` — это одновременно и решение проблемы \`NaN\`, и источник нюанса с \`+0\`/\`-0\`. Нужно ли вам считать нули равными — решение доменное, и его стоит проговорить вслух.

## Что сказать на собеседовании

> Глубокое равенство сравнивает значения по содержимому, а не по ссылке. Начинаю с \`Object.is\`: он закрывает одинаковые ссылки, примитивы и \`NaN\`, потому что обычное \`NaN === NaN\` даёт false. Дальше отсекаю не-объекты и \`null\`, сверяю конструкторы, обрабатываю \`Date\` через \`getTime\` и \`RegExp\` через \`toString\`. Для \`Map\` и \`Set\` сравниваю размер и содержимое без оглядки на порядок вставки, для массивов — длину и элементы рекурсивно, для объектов беру \`Reflect.ownKeys\`, чтобы не потерять символы. Сложность O(n) по узлам, O(d) памяти на стек. Отдельно нужен \`WeakMap\` посещённых пар, иначе циклические ссылки дают бесконечную рекурсию. И главное: в горячем пути change detection это слишком дорого — там правильнее иммутабельность и сравнение ссылок, а deepEqual оставить тестам и инвалидации кэша.

## Ловушки

- **\`NaN\`.** \`NaN === NaN\` — \`false\`; без \`Object.is\` два одинаковых объекта с \`NaN\` внутри окажутся неравными.
- **\`+0\` и \`-0\`.** \`Object.is(+0, -0)\` — \`false\`. Формально верно, но для денег или координат обычно не то, что нужно. Решение доменное.
- **Циклические ссылки** без набора посещённых пар — переполнение стека. Первый вопрос, который задают следом.
- **\`Set\` с объектами внутри.** \`b.has(v)\` ищет по ссылке, поэтому вложенные объекты в \`Set\` глубоко не сравниваются. Честное сравнение потребует перебора \`O(n²)\`.
- **Символьные ключи.** \`Object.keys\` их не видит — отсюда \`Reflect.ownKeys\`.
- **Разные прототипы.** \`{}\` и \`Object.create(null)\` с одинаковыми полями: проверка конструктора объявит их разными. Это выбор строгости, и его нужно озвучить.
- **Очень глубокие деревья** переполнят стек рекурсии так же, как и в \`flatten\`.
- **Спросят следом:** почему в \`OnPush\` не стоит гонять \`deepEqual\` на каждый цикл проверки (это \`O(n)\` на каждое обнаружение изменений) и чем поверхностное сравнение отличается от глубокого по цене и по риску ложных срабатываний.`,
      en: `## In short

Deep equality compares values **by content, not by reference**: two values are equal if everything inside matches recursively. \`{a: 1} === {a: 1}\` is \`false\` because they're two different objects, while \`deepEqual\` should say \`true\`.

Analogy: two apartments. Reference equality asks "is this the same apartment?". Deep equality asks "is the furnishing identical?" — you walk room by room and check every item.

## How it works, step by step

1. Start with \`Object.is(a, b)\`. It covers three cases at once: identical references, equal primitives and, crucially, **\`NaN\`**. Plain \`NaN === NaN\` is \`false\`, while \`Object.is(NaN, NaN)\` is \`true\`, which is what we want.
2. If either value isn't an object, or is \`null\`, there's nothing left to compare — return \`false\`.
3. Compare constructors. Different constructors mean different kinds of thing: an array isn't an object literal, a \`Date\` isn't a string.
4. **\`Date\`** compares by \`getTime()\`, **\`RegExp\`** by \`toString()\`. Without that, two identical dates would come out "different", since they expose no own properties.
5. **\`Map\`:** sizes first, then for each pair check the key exists in the other map and recursively compare the values. Insertion order is irrelevant.
6. **\`Set\`:** sizes plus a \`has\` check for every element.
7. **Arrays:** lengths, then element-by-element recursion.
8. **Plain objects:** take \`Reflect.ownKeys\` — it sees symbols too, not just strings. Compare key counts, then for each key check presence via \`hasOwnProperty\` and recurse into the values.
9. **Complexity:** \`O(n)\` time in the number of nodes, \`O(d)\` space for the recursion stack.
10. **Cycles.** An object referencing itself sends the recursion off to infinity. The fix is a \`WeakMap\` of visited pairs: record the pair before descending, and if you meet it again treat it as equal. Omitted from the base version for clarity; required in production.

## Where to use it, and where not to

Deep comparison costs \`O(n)\` **per call**. On a hot path — change detection, \`OnPush\`, memoization — that's expensive: a cheap shallow check is nearly always better, and the genuinely right answer is **immutability plus reference comparison**, where a new object is created only on a real change so \`===\` is enough. Deep equality belongs in test assertions, cache invalidation and deduplication. Off-the-shelf: lodash \`isEqual\`, \`fast-deep-equal\`.

## Example

\`\`\`ts
deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }); // true
deepEqual(NaN, NaN);                                   // true — thanks to Object.is
deepEqual(new Date(0), new Date(0));                   // true — via getTime()
deepEqual(0, -0);                                      // false — Object.is separates them
\`\`\`

Why this matters: \`Object.is\` is simultaneously the fix for \`NaN\` and the source of the \`+0\`/\`-0\` subtlety. Whether the two zeros should count as equal is a domain decision, and worth saying out loud.

## What to say in the interview

> Deep equality compares values structurally, by content rather than reference. I start with \`Object.is\`, which handles identical references, primitives and \`NaN\`, since plain \`NaN === NaN\` is false. Then I reject non-objects and \`null\`, compare constructors, and special-case \`Date\` via \`getTime\` and \`RegExp\` via \`toString\`. For \`Map\` and \`Set\` I compare size and contents regardless of insertion order, for arrays the length and then elements recursively, and for plain objects I use \`Reflect.ownKeys\` so symbol keys aren't lost, compare key counts and recurse into values. Complexity is O(n) in the number of nodes with O(d) stack space. Separately you need a \`WeakMap\` of visited pairs, otherwise cyclic references cause infinite recursion. And the main point: on a hot path like change detection deep comparison is far too expensive — there immutability plus reference comparison is right, and deepEqual belongs in tests and cache invalidation.

## Gotchas

- **\`NaN\`.** \`NaN === NaN\` is \`false\`; without \`Object.is\`, two identical objects containing \`NaN\` come out unequal.
- **\`+0\` and \`-0\`.** \`Object.is(+0, -0)\` is \`false\`. Formally correct, but rarely what you want for money or coordinates. A domain decision.
- **Cyclic references** with no visited-pair set mean a stack overflow. This is the first follow-up they ask.
- **A \`Set\` of objects.** \`b.has(v)\` looks up by reference, so nested objects inside a \`Set\` are never deeply compared. A truthful comparison would need an \`O(n²)\` scan.
- **Symbol keys.** \`Object.keys\` doesn't see them — hence \`Reflect.ownKeys\`.
- **Different prototypes.** \`{}\` versus \`Object.create(null)\` with identical fields: the constructor check declares them different. That's a strictness choice you should state explicitly.
- **Very deep trees** blow the recursion stack, exactly as in \`flatten\`.
- **Follow-ups:** why you shouldn't run \`deepEqual\` on every \`OnPush\` cycle (it's \`O(n)\` per change-detection run), and how shallow comparison differs from deep in both cost and false-positive risk.`,
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
    category: 'live-coding',
    level: 'Hard',
    tags: ['promise-polyfill', 'algorithm', 'async'],
    question: {
      ru: 'Реализуйте полифилы Promise.all и Promise.allSettled. В чём их семантическое различие?',
      en: 'Implement polyfills for Promise.all and Promise.allSettled. What is their semantic difference?',
    },
    answer: {
      ru: `## Коротко

Оба ждут группу промисов, но по-разному реагируют на провал. **\`Promise.all\`** — «всё или ничего»: первая же ошибка реджектит общий промис. **\`Promise.allSettled\`** — «доложить по каждому»: дожидается всех и никогда не реджектится.

Аналогия: \`all\` — это заказ на всю компанию в ресторане: не принесли одно блюдо — отменяем весь заказ. \`allSettled\` — перекличка в походе: отмечаем, кто пришёл, а кто нет, и в любом случае идём дальше со списком на руках.

## Как это работает по шагам

1. Общий каркас у обоих одинаковый: массив результатов **сразу нужной длины** и счётчик завершённых.
2. Каждый элемент оборачиваем в \`Promise.resolve(item)\` — на вход могут прийти не только промисы, но и обычные значения, и они обязаны работать.
3. Подписываемся на каждый и **пишем результат по индексу \`i\`**, который замкнулся в колбэке \`forEach\`. Поэтому порядок результатов равен порядку входа, хотя завершаются промисы вразнобой.
4. Увеличиваем счётчик. Дошёл до длины массива — резолвим внешний промис.
5. **Вся разница — во втором колбэке \`then\`.** У \`all\` там \`reject(err)\`: первая же ошибка немедленно отклоняет результат, остальные значения теряются — это **fail-fast**. У \`allSettled\` там запись \`{ status: 'rejected', reason }\`, и счётчик крутится дальше; отклониться он не может в принципе.
6. \`allSettled\` возвращает массив объектов: \`{ status: 'fulfilled', value }\` либо \`{ status: 'rejected', reason }\`.
7. **Граничный случай:** пустой массив. \`Promise.all([])\` резолвится немедленно с \`[]\` — если не обработать явно, счётчик никогда не сдвинется и промис зависнет навсегда.
8. **Сложность:** \`O(n)\` на постановку плюс параллельное ожидание; память \`O(n)\` под результаты.

## Пример

\`\`\`ts
// нужны оба — без любого из них рендерить нечего
const [user, settings] = await Promise.all([getUser(), getSettings()]);

// дашборд: одна упавшая панель не должна ронять остальные
const panels = await Promise.allSettled(ids.map(loadPanel));
panels.forEach((p) => p.status === 'fulfilled' ? render(p.value) : renderError(p.reason));
\`\`\`

Почему так: \`all\` — когда частичный результат бесполезен. \`allSettled\` — когда операции независимы и частичный успех лучше полного отказа.

## Что сказать на собеседовании

> Разница семантическая. \`Promise.all\` — fail-fast: резолвится массивом результатов, когда выполнятся все, но реджектится сразу при первом отклонении, и остальные результаты теряются, это «всё или ничего». \`Promise.allSettled\` дожидается всех независимо от исхода, никогда не реджектится и возвращает массив со статусом fulfilled и значением либо rejected и причиной — для независимых операций, где частичный успех лучше полного отказа. В реализации три момента: пишем результаты по индексу, чтобы сохранить порядок входа; считаем отдельным счётчиком, а не длиной массива, которая на разреженном массиве врёт; и отдельно обрабатываем пустой массив, иначе промис зависнет навсегда. Нюанс: \`all\` при реджекте не отменяет уже запущенные промисы — для отмены нужен \`AbortController\`.

## Ловушки

- **\`all\` ничего не отменяет.** При реджекте остальные запросы продолжают выполняться до конца, а их ошибки могут всплыть как unhandled rejection. Отмена — только через \`AbortController\`.
- **Пустой массив.** Без явной проверки промис зависает навсегда — самый частый провал этой задачи.
- **Считать по \`results.length\`, а не счётчиком.** Массив может быть разреженным, и длина соврёт. Нужен локальный счётчик.
- **\`push\` вместо записи по индексу** — порядок станет порядком завершения.
- **\`allSettled\` никогда не реджектится**, поэтому забытая проверка \`status\` означает тихо проглоченные ошибки: в \`try/catch\` вы не попадёте никогда.
- **Не-промисы на входе** — без \`Promise.resolve\` вызов \`.then\` на обычном значении упадёт.
- **Спросят следом:** чем от них отличаются \`Promise.race\` и \`Promise.any\` — \`race\` отдаёт первый **завершившийся** любым исходом, включая ошибку, а \`any\` — первый **успешный** и реджектится с \`AggregateError\`, только если упали все.`,
      en: `## In short

Both wait for a group of promises, but they react to failure differently. **\`Promise.all\`** is all-or-nothing: the first rejection rejects the combined promise. **\`Promise.allSettled\`** reports on every one: it waits for all of them and never rejects.

Analogy: \`all\` is a restaurant order for the whole table — one dish doesn't arrive, the entire order is cancelled. \`allSettled\` is roll call on a hike: you mark down who showed up and who didn't, and either way you set off with the list in hand.

## How it works, step by step

1. Both share the same skeleton: a results array **allocated at full length up front** plus a completed counter.
2. Wrap each item in \`Promise.resolve(item)\` — the input may contain plain values, not just promises, and those must work.
3. Subscribe to each one and **write the result at index \`i\`**, captured in the \`forEach\` callback. That's why the result order matches the input order even though the promises finish out of sequence.
4. Increment the counter. When it reaches the array length, resolve the outer promise.
5. **The entire difference lives in the second \`then\` callback.** For \`all\` it's \`reject(err)\`: the first failure rejects immediately and the other values are discarded — that's **fail-fast**. For \`allSettled\` it records \`{ status: 'rejected', reason }\` and the counter keeps ticking; it cannot reject at all.
6. \`allSettled\` returns an array of objects: \`{ status: 'fulfilled', value }\` or \`{ status: 'rejected', reason }\`.
7. **Edge case:** the empty array. \`Promise.all([])\` resolves immediately with \`[]\` — without an explicit check the counter never moves and the promise hangs forever.
8. **Complexity:** \`O(n)\` to schedule plus parallel waiting; \`O(n)\` space for the results.

## Example

\`\`\`ts
// both are required — without either one there's nothing to render
const [user, settings] = await Promise.all([getUser(), getSettings()]);

// dashboard: one failed panel shouldn't take down the rest
const panels = await Promise.allSettled(ids.map(loadPanel));
panels.forEach((p) => p.status === 'fulfilled' ? render(p.value) : renderError(p.reason));
\`\`\`

Why this matters: \`all\` is for when a partial result is useless. \`allSettled\` is for independent operations where partial success beats total failure.

## What to say in the interview

> The difference is semantic. \`Promise.all\` is fail-fast: it resolves with an array of results once all complete, but rejects immediately on the first rejection and the remaining results are lost — that's the all-or-nothing option. \`Promise.allSettled\` waits for every promise regardless of outcome, never rejects, and returns an array of objects carrying either fulfilled with a value or rejected with a reason — that's the option for independent operations where partial success beats total failure. Implementing either comes down to three points: write results by index rather than completion order so the input order is preserved; use a dedicated completed counter instead of the array length, since a sparse array reports misleadingly; and handle the empty array explicitly, or the counter never arrives and the promise hangs forever. One important nuance: on rejection \`all\` does not cancel the promises already in flight — they keep running, and cancellation needs an \`AbortController\`.

## Gotchas

- **\`all\` cancels nothing.** After a rejection the other requests run to completion, and their errors can surface as unhandled rejections. Cancellation only comes from an \`AbortController\`.
- **The empty array.** Without an explicit check the promise hangs forever — the most common way this task is failed.
- **Counting via \`results.length\` instead of a counter.** The array may be sparse and the length will lie. Use a local counter.
- **\`push\` instead of writing by index** — the order becomes completion order.
- **\`allSettled\` never rejects**, so a forgotten \`status\` check means silently swallowed errors: your \`try/catch\` will never fire.
- **Non-promises in the input** — without \`Promise.resolve\`, calling \`.then\` on a plain value throws.
- **Follow-ups:** how \`Promise.race\` and \`Promise.any\` differ — \`race\` yields the first promise to **settle** either way, including a rejection, while \`any\` yields the first to **succeed** and rejects with an \`AggregateError\` only if every one fails.`,
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
