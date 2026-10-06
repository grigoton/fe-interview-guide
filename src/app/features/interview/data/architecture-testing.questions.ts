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
      ru: `## В чём суть

В Nx-монорепозитории код делится на **apps** — тонкие «витрины», которые только собирают фичи вместе и деплоятся, — и **libs**, где живёт весь настоящий код. Каждой библиотеке вешают ярлыки-теги («что это за код» и «чей это домен»), а ESLint-правило \`@nx/enforce-module-boundaries\` проверяет каждый \`import\`: можно ли проекту с такими тегами зависеть от проекта с такими тегами.

Аналогия: большой офис. \`apps\` — это ресепшн: красивый, но там ничего не производят. \`libs\` — отделы. Теги — пропуска: бухгалтерия не ходит в серверную, а склад не заходит в кабинет директора. Охранник (ESLint) проверяет пропуск **на входе**, то есть до merge, а не когда человек уже всё сломал внутри.

**Какую проблему решает.** В большом репозитории любой файл технически может импортировать любой другой. Через год без контроля получается big ball of mud: утилита импортирует компонент страницы, домен «заказы» лезет во внутренности «биллинга», появляются циклы, и библиотеку уже нельзя ни протестировать отдельно, ни вынести, ни отдать другой команде. Договорённости на ревью не спасают — ревьюер устал, пропустил один импорт, и за ним потянулись десять. Nx превращает архитектурные правила в автоматическую проверку, которая падает в CI.

## Словарик терминов

- **Монорепозиторий (monorepo)** — один git-репозиторий, в котором лежат несколько приложений и библиотек с общими настройками и одной версией зависимостей.
- **Nx** — инструмент для монорепо: строит граф проектов, запускает задачи (build, test, lint) только для затронутого кода и кэширует результаты.
- **Проект: app и lib (application / library)** — app можно задеплоить (у него есть точка входа), lib — переиспользуемый кусок кода, который импортируют другие проекты.
- **Граф проектов (project graph)** — карта «кто от кого зависит», которую Nx строит, читая импорты во всех файлах.
- **Тег (tag)** — произвольная строка-ярлык в \`project.json\`, например \`type:ui\` или \`scope:orders\`. Сам по себе ничего не делает, пока на него не написали правило.
- **\`depConstraints\`** — список правил в настройках ESLint вида «проект с тегом X может зависеть только от проектов с тегами Y, Z».
- **\`@nx/enforce-module-boundaries\`** — ESLint-правило Nx, которое проверяет каждый импорт по графу проектов и \`depConstraints\`.
- **Barrel-файл (\`index.ts\`)** — файл, который реэкспортирует публичную часть библиотеки. Всё, что не экспортировано из него, считается внутренностями.
- **Path alias (псевдоним пути в \`tsconfig\` → \`paths\`)** — короткое имя вроде \`@shop/orders/ui\`, которое TypeScript превращает в путь к \`index.ts\` библиотеки.
- **ESLint flat config (\`eslint.config.mjs\`)** — современный формат конфигурации ESLint: массив объектов с правилами.
- **Циклическая зависимость** — A импортирует B, а B (напрямую или через цепочку) импортирует A. Такие проекты нельзя собрать и протестировать по отдельности.
- **CI (continuous integration)** — сервер, который на каждый pull request запускает lint, тесты и сборку и не даёт слить код, если что-то упало.

## Как это работает под капотом

Механизм по шагам:

1. Сначала Nx находит все проекты (по \`project.json\` или \`package.json\`) и читает их теги, поэтому про каждый проект известно, что это за код и чей он.
2. Затем Nx разбирает импорты во всех файлах и строит граф проектов: \`import { x } from '@shop/orders/ui'\` превращается в ребро «этот проект → \`orders-ui\`».
3. Когда запускается lint, правило проходит по каждому \`import\`, \`export ... from\`, динамическому \`import()\` и \`require()\` в файле. По пути файла оно понимает проект-источник, по строке импорта — проект-цель.
4. Дальше идёт цепочка проверок: относительный импорт в чужой проект, цикл в графе, импорт приложения, статический импорт лениво загружаемой библиотеки. Любое срабатывание — ошибка.
5. Только потом проверяются теги. Правило берёт **все** ограничения, чей \`sourceTag\` есть у источника, и цель должна удовлетворить **каждому** из них. Если ни одно ограничение к источнику не подошло, это тоже ошибка.
6. Ошибка ESLint роняет задачу \`lint\`, задача роняет CI, CI блокирует merge. Архитектура охраняется автоматически, а не памятью ревьюера.

Упрощённо проверка тегов выглядит так (настоящий код в \`@nx/eslint-plugin\` устроен именно по этой логике):

\`\`\`ts
const hasTag = (project, tag) => tag === '*' || project.tags.includes(tag);

function checkTags(source, target, depConstraints) {
  if (depConstraints.length === 0) return 'ok';           // правил нет — теги никто не проверяет
  const rules = depConstraints.filter(c => hasTag(source, c.sourceTag));
  if (rules.length === 0) {
    return 'error: проект без подходящих тегов не может зависеть ни от каких библиотек';
  }
  for (const rule of rules) {                             // должны выполниться ВСЕ подходящие правила
    if (!rule.onlyDependOnLibsWithTags.some(tag => hasTag(target, tag))) {
      return \`error: "\${rule.sourceTag}" может зависеть только от \${rule.onlyDependOnLibsWithTags}\`;
    }
  }
  return 'ok';
}
\`\`\`

Обратите внимание: правило работает **на тегах, а не на именах папок**. Переезд библиотеки в другую директорию ничего не ломает, а переименование папки не открывает дыр.

### Пример 1. Раскладка apps и libs

\`\`\`text
apps/
  shop/                 # только роутинг, bootstrap и склейка фич
libs/
  orders/
    feature/            # type:feature     scope:orders
    ui/                 # type:ui          scope:orders
    data-access/        # type:data-access scope:orders
  billing/
    feature/            # type:feature     scope:billing
  shared/
    util/               # type:util        scope:shared
\`\`\`

Всю логику выносим в libs, в \`apps\` оставляем роутинг и склейку. Чем тоньше app, тем точнее работают \`nx affected\` и кэш: правка в \`libs/orders/ui\` затрагивает только тех, кто от неё зависит, а не «всё приложение целиком».

### Пример 2. Теги в \`project.json\`

\`\`\`json
{
  "name": "orders-ui",
  "projectType": "library",
  "sourceRoot": "libs/orders/ui/src",
  "tags": ["type:ui", "scope:orders"]
}
\`\`\`

Теги ставятся по двум независимым осям, и у библиотеки обычно есть по одному тегу каждой оси.

### Ось \`type\`: что это за код

- **\`type:feature\`** — умные компоненты, привязанные к роуту и стейту: страница заказов, мастер оформления.
- **\`type:ui\`** — презентационные переиспользуемые компоненты: таблица, карточка, кнопка. Получают данные через входы, ничего не знают про HTTP.
- **\`type:data-access\`** — сервисы, стейт (NgRx, сигнальные сторы), HTTP-клиенты, модели.
- **\`type:util\`** — чистые функции без Angular: форматирование денег, валидация ИНН, работа с датами.

Направление зависимостей строго сверху вниз: \`feature\` → \`ui\` / \`data-access\` / \`util\`. **Обратно нельзя**: \`util\` не имеет права импортировать \`feature\`, а \`ui\` — ходить в \`data-access\` (иначе «глупый» компонент начинает сам грузить данные).

### Ось \`scope\`: чей это домен

\`scope:orders\`, \`scope:billing\`, \`scope:shared\`. Домены не лезут друг в друга напрямую: \`scope:orders\` не импортирует \`scope:billing\`, общее выносится в \`scope:shared\`. Ось \`scope\` обычно совпадает с границами команд: у каждой команды свой scope и свой код-ревьюер.

### Пример 3. Правила в \`eslint.config.mjs\`

\`\`\`js
import nx from '@nx/eslint-plugin';

export default [
  { plugins: { '@nx': nx } },
  {
    files: ['**/*.ts'],
    rules: {
      '@nx/enforce-module-boundaries': ['error', {
        depConstraints: [
          { sourceTag: 'type:app',         onlyDependOnLibsWithTags: ['type:feature', 'type:ui', 'type:data-access', 'type:util'] },
          { sourceTag: 'type:feature',     onlyDependOnLibsWithTags: ['type:feature', 'type:ui', 'type:data-access', 'type:util'] },
          { sourceTag: 'type:ui',          onlyDependOnLibsWithTags: ['type:ui', 'type:util'] },
          { sourceTag: 'type:data-access', onlyDependOnLibsWithTags: ['type:data-access', 'type:util'] },
          { sourceTag: 'type:util',        onlyDependOnLibsWithTags: ['type:util'], bannedExternalImports: ['@angular/*', 'rxjs'] },
          { sourceTag: 'scope:orders',     onlyDependOnLibsWithTags: ['scope:orders', 'scope:shared'] },
          { sourceTag: 'scope:billing',    onlyDependOnLibsWithTags: ['scope:billing', 'scope:shared'] },
          { sourceTag: 'scope:shared',     onlyDependOnLibsWithTags: ['scope:shared'] },
        ],
      }],
    },
  },
];
\`\`\`

У \`orders-feature\` два тега, поэтому к нему применяются сразу два правила: по \`type:feature\` и по \`scope:orders\`. Импорт пройдёт, только если цель устраивает оба.

### Пример 4. Что говорит линтер при нарушениях

Этот вывод получен на реальном Nx-воркспейсе с конфигом выше:

\`\`\`ts
// libs/orders/ui/src/lib/bad-ui.ts — ui полез в data-access
import { loadOrders } from '@shop/orders/data-access';

// libs/orders/feature/src/lib/cross-domain.ts — заказы полезли в биллинг
import { billingPage } from '@shop/billing/feature';
// и обошли alias относительным путём
import { formatMoney } from '../../../../shared/util/src/lib/format-money';
\`\`\`

\`\`\`text
libs/orders/feature/src/lib/cross-domain.ts
  1:1  error  A project tagged with "scope:orders" can only depend on libs tagged with "scope:orders", "scope:shared"
  2:1  error  Projects cannot be imported by a relative or absolute path, and must begin with a npm scope

libs/orders/ui/src/lib/bad-ui.ts
  1:1  error  A project tagged with "type:ui" can only depend on libs tagged with "type:ui", "type:util"
\`\`\`

Видно, что относительный путь в чужую библиотеку правило ловит отдельной проверкой ещё до тегов: импортировать соседний проект можно только по его alias.

### \`bannedExternalImports\`: держим \`util\` без Angular

Кроме зависимостей между своими проектами, правило умеет запрещать npm-пакеты по тегу. Если в \`libs/shared/util\` написать \`import { Observable } from 'rxjs'\`, линтер ответит:

\`\`\`text
libs/shared/util/src/lib/bad-util.ts
  1:1  error  A project tagged with "type:util" is not allowed to import "rxjs"
\`\`\`

Зачем это нужно: \`util\` без Angular тестируется как обычные функции — без TestBed, без зон, за миллисекунды, — и его можно переиспользовать хоть в Node-скрипте, хоть в веб-воркере.

### Циклы и как их разрывать

Если \`shared-util\` импортирует \`orders-ui\`, а \`orders-ui\` уже импортирует \`shared-util\`, правило покажет цикл вместе с файлами, которые его образуют:

\`\`\`text
libs/shared/util/src/lib/bad-util.ts
  1:1  error  Circular dependency between "shared-util" and "orders-ui" detected: shared-util -> orders-ui -> shared-util

Circular file chain:
- libs/shared/util/src/lib/bad-util.ts
- libs/orders/ui/src/lib/order-row.ts
\`\`\`

Разрывают цикл всегда одинаково: находят кусок, который нужен обоим, и выносят его ниже — в \`util\` или \`shared\`. Цикл между доменами почти всегда означает, что граница домена проведена не там.

### Проекты без тегов и правило \`*\`

Если \`depConstraints\` не пустой, а у проекта нет ни одного тега, под который есть правило, он **не может импортировать ни одну библиотеку**:

\`\`\`text
libs/legacy/src/lib.ts
  1:1  error  A project without tags matching at least one constraint cannot depend on any libraries
\`\`\`

Nx при создании воркспейса добавляет правило-заглушку \`{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }\`. Оно подходит любому проекту и разрешает всё, поэтому с ним проект без тегов проходит lint без ошибок. На старте это удобно, но когда теги расставлены, заглушку стоит убрать: тогда забыть тег у новой библиотеки станет невозможно.

### Глубокие импорты мимо \`index.ts\`

Импорт \`@shop/orders/data-access/src/lib/orders-api\` правило по тегам пропускает: \`feature\` от \`data-access\` зависеть можно, а проверки «только через \`index.ts\`» в нём нет. От глубоких импортов защищает другое: alias в \`tsconfig.base.json\` указывает ровно на \`index.ts\`, и TypeScript просто не найдёт путь глубже. Не добавляйте wildcard-alias вида \`"@shop/*": ["libs/*"]\` — он открывает все внутренности. В новых воркспейсах на npm/pnpm workspaces ту же роль играет поле \`exports\` в \`package.json\` библиотеки.

### \`nx graph\`: посмотреть архитектуру глазами

\`\`\`bash
nx graph                      # интерактивная схема проектов в браузере
nx graph --file=graph.json    # тот же граф в JSON, удобно для скриптов в CI
\`\`\`

Команда показывает проекты и стрелки зависимостей между ними. На ревью архитектуры это быстрее любого текста: сразу видно, кто тянет лишнее и где назревает цикл.

### Где это применяется на практике

- **Несколько команд в одном репо**: у каждой свой \`scope\`, а \`scope:shared\` ревьюит платформенная команда. Импорт в чужой домен падает в CI, не дожидаясь ревью.
- **Enterprise-портал с десятком разделов** (заказы, отчёты, админка): \`type\`-слои не дают презентационным компонентам гридов и форм начать ходить в HTTP.
- **Вынос библиотеки в отдельный пакет или микрофронтенд**: если границы соблюдались, библиотеку можно забрать вместе с её \`index.ts\` без переписывания.
- **Миграция легаси**: старый код получает тег \`scope:legacy\`, новый код не имеет права от него зависеть, и легаси постепенно «усыхает».
- **Ускорение CI**: тонкие apps и аккуратный граф дают \`nx affected\` точный список затронутых проектов.

## Важные нюансы и подводные камни

- **Теги без правил бесполезны.** Проставили \`type:ui\`, но \`depConstraints\` пустой — проверка тегов не выполняется вообще. Остальные проверки (циклы, относительные пути, импорт приложений) при этом работают.
- **Всё в apps.** Логика внутри приложения не становится отдельным проектом в графе, поэтому \`affected\` пересобирает и перетестирует приложение целиком на любую правку.
- **Проект без тегов.** С правилом-заглушкой \`*\` → \`*\` он не ограничен ничем; без неё не может зависеть ни от одной библиотеки. Решите осознанно, какое поведение вам нужно.
- **Относительные пути в чужой проект ловятся.** \`../../other-lib/src/internal\` в соседнюю библиотеку правило запрещает отдельной ошибкой. Опция \`allow\` — это белый список, она **снимает** проверку с указанных импортов, а не закрывает дыры.
- **Глубокие импорты через alias правило не ловит.** Защищайтесь alias-ом, который указывает только на \`index.ts\`, и полем \`exports\`.
- **Запуск \`eslint\` в обход Nx.** Если запустить голый \`eslint\` без закэшированного графа проектов, правило выдаст предупреждение \`No cached ProjectGraph is available. The rule will be skipped.\` и ничего не проверит. В CI запускайте \`nx affected -t lint\` или \`nx run-many -t lint\`.
- **Как разрывать циклы.** Выносите общее в \`util\`/\`shared\`; если цикл между доменами — пересмотрите границу домена.
- **Почему \`util\` не должен зависеть от Angular.** Чтобы его можно было тестировать без TestBed и использовать где угодно; закрепляется через \`bannedExternalImports\`.
- **Слишком мелкое дробление.** Сотни микробиблиотек замедляют построение графа, плодят конфиги и лишают команду скорости. Гранулярность должна соответствовать размеру команд.
- **На маленьком проекте** из одной-двух команд дробная сетка тегов даёт только трение. Начинайте с грубого деления (\`type\` плюс два-три \`scope\`) и уточняйте по мере роста.

**Плюсы:** архитектура защищена автоматикой, а не устными договорённостями; ошибки ловятся до merge; правила привязаны к тегам, а не к папкам; тонкие apps и чистый граф ускоряют \`affected\` и кэш.
**Минусы:** нужно поддерживать теги и правила; есть дыры, которые закрываются другими средствами (глубокие импорты, голый \`eslint\`); избыточная нарезка библиотек замедляет и людей, и инструменты.

## Как это спрашивают на собеседовании

**Главный вывод:** apps — тонкие оболочки, весь код в libs; библиотеки размечаются тегами по осям \`type\` и \`scope\`, а \`@nx/enforce-module-boundaries\` по графу проектов и \`depConstraints\` блокирует запрещённые импорты на этапе lint, то есть до merge.

Типичные формулировки: «Как вы организуете Nx-монорепо?», «Как не дать монорепо превратиться в big ball of mud?», «Что делает enforce-module-boundaries?».

Что могут спросить следом:

- *Как разорвать цикл между библиотеками?* — Вынести общий кусок ниже, в \`util\` или \`shared\`; цикл между доменами — сигнал, что граница проведена неверно.
- *Почему \`util\` не должен зависеть от Angular?* — Чтобы тестироваться без TestBed и переиспользоваться где угодно; закрепляется \`bannedExternalImports\`.
- *Что будет с библиотекой без тегов?* — Без правила \`*\` она не сможет зависеть ни от чего; с правилом \`*\` → \`*\` она не ограничена вовсе.
- *Ловит ли правило относительные импорты?* — Да, импорт соседнего проекта относительным путём — отдельная ошибка; а вот глубокий импорт через alias закрывается настройкой \`paths\`/\`exports\`.

### Ответ на 1 минуту

> В Nx я держу apps тонкими оболочками для деплоя, а всю логику выношу в libs — чем больше кода в libs, тем точнее работают \`affected\` и кэш. Библиотеки размечаю тегами по двум осям: \`type\` — feature, ui, data-access, util — и \`scope\`, то есть домен: orders, billing, shared. ESLint-правило \`@nx/enforce-module-boundaries\` по графу проектов проверяет каждый импорт против \`depConstraints\`: feature может зависеть от ui, data-access и util, но не наоборот, а домен не тянет другой домен напрямую, только через shared. Работает оно на тегах, а не на папках, ловит циклы и относительные пути в чужие проекты, а нарушение роняет lint в CI до merge. Из нюансов: теги без \`depConstraints\` ничего не дают, проект без тегов с дефолтным правилом \`*\` ничем не ограничен, а слишком мелкая нарезка библиотек только тормозит команду — начинаю с грубого деления и уточняю по мере роста.`,
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
      ru: `## В чём суть

Nx знает, **какой проект от какого зависит**, поэтому в CI гоняет тесты и сборку только для того, что реально затронул ваш коммит, — это \`affected\`. А результат каждой задачи он кладёт в кэш под «отпечатком пальца» из всех её входных данных: отпечаток совпал — задачу вообще не запускаем, просто достаём готовый результат.

Аналогия: кухня ресторана. Поменяли рецепт соуса — переделываем только блюда с этим соусом, а не всё меню (\`affected\`). А если заказ в точности такой же, как полчаса назад, повар достаёт готовую порцию из холодильника вместо готовки заново (кэш). Опасность одна: если в рецепте не записан ингредиент, повар не заметит, что он изменился, и выдаст старое блюдо.

**Какую проблему решает.** В монорепо на сотню проектов «прогнать всё» на каждый pull request занимает часы: разработчики ждут, CI-машины стоят в очереди, деньги горят. При этом в типичном PR меняется пара библиотек. \`affected\` отсекает то, что точно не могло сломаться, а кэш не даёт повторять работу, которую уже сделал кто-то другой — вы, коллега или CI-агент на соседней ветке.

## Словарик терминов

- **Граф проектов (project graph)** — карта «кто от кого зависит», которую Nx строит из импортов в коде и явных настроек.
- **Задача (task)** — запуск цели (target) у проекта: \`orders-ui:build\`, \`shop:test\`.
- **\`affected\` (затронутые проекты)** — проекты, файлы которых изменились относительно базового коммита, плюс все, кто от них зависит, напрямую или через цепочку.
- **База и голова (\`--base\`, \`--head\`)** — два коммита, между которыми Nx берёт git-diff. Обычно база — \`main\` или последний зелёный коммит main.
- **Транзитивная зависимость** — зависимость через посредника: \`shop\` → \`orders-feature\` → \`orders-ui\`, значит \`shop\` транзитивно зависит от \`orders-ui\`.
- **Computation caching (кэширование вычислений)** — сохранение результата задачи под хэшем её входов, чтобы не выполнять её повторно.
- **Хэш (hash)** — короткий «отпечаток» данных: любой изменившийся байт на входе даёт другой хэш.
- **\`inputs\` / \`namedInputs\`** — описание того, что входит в хэш задачи: какие файлы, переменные окружения, зависимости. \`namedInputs\` — именованные наборы, которые переиспользуются в разных задачах.
- **\`outputs\`** — пути, куда задача пишет результат. Только их Nx сохраняет в кэш и восстанавливает.
- **Cache hit / cache miss** — хэш нашёлся в кэше (задачу не запускаем) или не нашёлся (запускаем и сохраняем).
- **Remote cache (удалённый кэш)** — общий кэш для всей команды и CI: Nx Cloud или собственное хранилище.
- **\`implicitDependencies\`** — ручное указание зависимости, которую не видно по импортам.

## Как это работает под капотом

Механизм по шагам:

1. Сначала Nx строит граф проектов: разбирает статические импорты и добавляет явно указанные \`implicitDependencies\` (для того, что импортами не выражается: конфиги, JSON, генерируемый код).
2. \`nx affected\` берёт git-diff между \`--base\` и \`--head\`, поэтому знает список изменённых файлов. Каждый файл он относит к проекту.
3. Затем идёт по графу **в обратную сторону** и добавляет всех, кто зависит от изменённых проектов, транзитивно. Задачи запускаются только для этого подмножества.
4. Перед запуском каждой задачи Nx считает хэш её входов: файлы проекта и его зависимостей по правилам \`inputs\`, корневые конфиги, версии внешних пакетов, флаги команды и **только объявленные** переменные окружения.
5. Если хэш есть в локальном или удалённом кэше, задача не выполняется: Nx восстанавливает объявленные \`outputs\` и повторяет в терминале сохранённый лог.
6. Если хэша нет, задача выполняется, а её \`outputs\` и лог кладутся в кэш под этим хэшем.

Упрощённо это выглядит так:

\`\`\`ts
async function runTask(task) {
  const hash = sha256(
    filesMatching(task.inputs),          // исходники проекта и зависимостей по namedInputs
    declaredEnv(task).map(name => process.env[name]),
    externalDependencyVersions(task),
    task.flags,
  );
  const hit = (await localCache.get(hash)) ?? (await remoteCache.get(hash));
  if (hit) {
    restoreFiles(hit.outputs);           // только объявленные outputs
    print(hit.terminalOutput);           // лог «как будто задача отработала»
    return;
  }
  const result = await execute(task);
  await localCache.put(hash, { outputs: collect(task.outputs), terminalOutput: result.log });
}
\`\`\`

Главная мысль: **\`affected\` грубый, кэш точный.** \`affected\` смотрит только на «какие файлы тронули», а кэш — на «изменилось ли то, что задача реально читает».

### Пример 1. \`nx affected\` на живом графе

Воркспейс: \`shop\` → (\`orders-feature\`, \`billing-feature\`); \`orders-feature\` → (\`orders-ui\`, \`orders-data-access\`); \`orders-ui\` → \`shared-util\`; \`billing-feature\` → \`shared-util\`; плюс независимая \`legacy\`. Меняем один файл в \`shared-util\`:

\`\`\`bash
nx show projects --affected --base=main
# ["shared-util","billing-feature","shop","orders-ui","orders-feature"]

nx affected -t lint test build --base=main   # запустит задачи только для этих пяти
\`\`\`

\`orders-data-access\` и \`legacy\` в список не попали: от \`shared-util\` они не зависят, значит, сломаться не могли. На большом монорепо это превращает часы CI в минуты.

### Пример 2. \`affected\` сказал «да», кэш сказал «не нужно»

Добавляем только тестовый файл \`libs/orders/ui/src/lib/order-row.spec.ts\`:

\`\`\`bash
nx show projects --affected --base=main
# ["orders-ui","orders-feature","shop"]

nx affected -t build --base=main
# > nx run orders-ui:build  [local cache]
# > nx run orders-feature:build  [local cache]
# > nx run shop:build  [local cache]
# ...
# Nx read the output from the cache instead of running the command for 6 out of 6 tasks.
\`\`\`

Проекты затронуты (файл внутри них изменился), но спеки исключены из входов \`build\`, поэтому хэши сборки не поменялись — все сборки взяты из кэша. Задач шесть, а не три, потому что \`dependsOn: ["^build"]\` сначала собирает зависимости, и они тоже пришли из кэша.

### \`namedInputs\` и \`inputs\`: что входит в хэш

\`\`\`json
{
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "sharedGlobals": [],
    "production": ["default", "!{projectRoot}/**/*.spec.ts"]
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "outputs": ["{workspaceRoot}/dist/{projectRoot}"],
      "cache": true
    },
    "test": { "inputs": ["default", "^production"], "cache": true }
  }
}
\`\`\`

\`default\` — все файлы проекта. \`production\` — то же самое без спеков: правка теста не должна инвалидировать сборку, это даёт больше cache hit. \`"cache": true\` включает кэширование цели, \`targetDefaults\` задаёт настройки сразу для всех проектов.

### Префикс \`^\` и \`dependsOn\`

\`^production\` означает «и тот же набор файлов у моих зависимостей»: если поменялась \`shared-util\`, хэш сборки \`orders-ui\` тоже изменится. \`dependsOn: ["^build"]\` — про порядок, а не про хэш: «перед моей сборкой собери зависимости». Без \`^\` в \`inputs\` вы получите классический баг: библиотека изменилась, а приложение взяло старую сборку из кэша.

### \`outputs\`: что сохраняется и восстанавливается

\`\`\`bash
rm -rf dist/apps/shop
nx run-many -t build
# > nx run shop:build  [local cache]
# building shop                 ← лог повторён из кэша
# Nx read the output from the cache instead of running the command for 7 out of 7 tasks.
ls dist/apps/shop
# out.txt                       ← файл восстановлен из кэша
\`\`\`

Nx сохраняет ровно те пути, что перечислены в \`outputs\`, плюс вывод в терминал. Всё остальное, что задача записала, в кэш не попадает.

### \`nx show target inputs\`: посмотреть, что реально хэшируется

\`\`\`bash
nx show target inputs orders-ui:build
# "files": [".gitignore", "libs/orders/ui/project.json", "libs/orders/ui/src/index.ts",
#           "libs/orders/ui/src/lib/order-row.ts", "libs/shared/util/project.json", ...,
#           "nx.json", "tsconfig.base.json"],
# "environment": ["NX_CLOUD_ENCRYPTION_KEY"],
# "external": ["AllExternalDependencies"]
\`\`\`

Видно три вещи: в хэш попали файлы зависимости \`shared-util\` (это работа \`^production\`), корневые конфиги и **никаких** ваших переменных окружения. \`AllExternalDependencies\` появляется у \`nx:run-commands\`: Nx не знает, какие пакеты нужны произвольной команде, и хэширует все внешние зависимости из lock-файла — любое обновление пакета, включая сам Nx, сбросит кэш такой задачи.

### Пример 3. Необъявленная переменная окружения — тихий устаревший результат

Сборка читает \`process.env.API_URL\`, но в \`inputs\` её нет:

\`\`\`bash
API_URL=https://staging.api nx build orders-data-access
# built with API_URL=https://staging.api
API_URL=https://prod.api nx build orders-data-access
# > nx run orders-data-access:build  [local cache]
# built with API_URL=https://staging.api      ← в «прод» уехал staging-адрес
\`\`\`

Исправление — объявить переменную во входах:

\`\`\`json
"inputs": ["production", "^production", { "env": "API_URL" }]
\`\`\`

После этого смена \`API_URL\` даёт cache miss и честную пересборку, а возврат к старому значению снова даёт cache hit: в кэше хранятся оба результата. Это самый опасный класс багов: «на CI зелено, в проде сломано».

### Пример 4. Побочный эффект вне \`outputs\`

Та же задача пишет ещё и \`tmp-report.txt\` в корень, который не объявлен в \`outputs\`. Удаляем файл и запускаем снова: задача берётся из кэша, а \`tmp-report.txt\` **не появляется**. Если следующий шаг CI (публикация отчёта, деплой) ждёт этот файл, он упадёт только на cache hit — то есть «иногда», что хуже всего.

### \`implicitDependencies\`: связи, которых не видно в импортах

\`\`\`json
{
  "name": "shop-e2e",
  "implicitDependencies": ["shop", "api-contracts"]
}
\`\`\`

Nx видит только импорты. Если проект зависит от общего JSON со схемой API, от миграций БД или от генератора кода, без \`implicitDependencies\` правка там не сделает зависимый проект затронутым, и он не пересоберётся.

### Remote cache: Nx Cloud и собственное хранилище

Локальный кэш живёт на одной машине. Удалённый кэш делится между всеми: CI собрал \`orders-ui\` на ветке — разработчик, который подтянул ту же ветку, получит cache hit. Вариантов два: Nx Cloud (сервис от авторов Nx, плюс распределённое выполнение задач) или self-hosted кэш в своём S3/GCS/Azure через официальные плагины вроде \`@nx/s3-cache\`. Главное правило безопасности: запись в общий кэш — только с доверенных веток (main), PR-агенты получают read-only доступ.

### \`nx reset\`: первый шаг при странном поведении

\`\`\`bash
nx reset
\`\`\`

Команда очищает локальный кэш и сохранённые данные о воркспейсе (включая граф проектов) и останавливает демон Nx; удалённый кэш она не трогает. Если результаты выглядят «невозможными» (собралось то, что не должно, граф не видит новую библиотеку), начинают с неё, а потом уже ищут необъявленный вход.

### Где это применяется на практике

- **CI на pull request**: \`nx affected -t lint test build\` с базой «последний зелёный коммит main» — в GitHub Actions её обычно вычисляет action \`nrwl/nx-set-shas\`.
- **Локальная разработка**: переключились на ветку коллеги — тесты библиотек, которые он уже прогнал в CI, приходят из remote cache за секунды.
- **Монорепо с десятком Angular-приложений**: правка в \`shared/ui\` пересобирает только приложения, которые её используют.
- **Релизная ветка**: часто честно гоняют всё (\`nx run-many -t test build\`) — для подстраховки от неучтённых связей, но и тут кэш срежет время.
- **Сборки под разные окружения**: переменные вроде \`API_URL\` объявляются во входах, чтобы staging и prod не перепутались в кэше.

## Важные нюансы и подводные камни

- **Неучтённые входы.** Задача читает файл или переменную окружения, которых нет в \`inputs\`, — Nx тихо отдаёт устаревший результат. Переменные окружения по умолчанию в хэш **не** входят, их нужно объявлять через \`{ "env": "..." }\`.
- **Недетерминированная сборка.** Таймстемпы, случайные хэши, зависимость от порядка файлов — кэш формально работает, но результаты невоспроизводимы, и cache hit с одной машины может отличаться от свежей сборки на другой.
- **Побочные эффекты вне \`outputs\`.** Кэш восстанавливает только объявленные пути; всё остальное после cache hit просто исчезнет.
- **Загрязнение remote-кэша (cache poisoning).** Сломанный или скомпрометированный агент записал плохой результат — теперь его получают все. Лечится read-only токенами для PR и правом записи только у доверенных веток.
- **\`affected\` слепа к неявным связям.** Миграции БД, общий JSON, генератор кода — без \`implicitDependencies\` зависимый проект не пересоберётся.
- **Неправильная база.** \`--base=main\` на CI, где \`main\` не подтянут или устарел, даёт неверный diff: либо пропуск затронутых проектов, либо «затронуто всё». Используйте последний успешный коммит main.
- **Правка корневых файлов затрагивает всех.** Изменение \`package.json\`, lock-файла, \`nx.json\` или \`tsconfig.base.json\` делает затронутыми почти все проекты — это нормально, а не баг.
- **\`affected\` против «прогнать всё».** На релизной ветке часто запускают всё целиком, чтобы не зависеть от полноты графа.
- **\`nx reset\`** — первый шаг, когда поведение выглядит странным.

**Плюсы:** CI быстрее в разы; повторная работа не выполняется ни локально, ни в CI; кэш общий для команды; поведение настраивается декларативно через \`inputs\`/\`outputs\`.
**Минусы:** кэш надёжен ровно настолько, насколько честно описаны входы и выходы; ошибки конфигурации проявляются тихо и «иногда»; удалённый кэш требует настройки прав доступа и доверия к агентам.

## Как это спрашивают на собеседовании

**Главный вывод:** \`affected\` выбирает проекты по git-diff и графу зависимостей, а кэш пропускает задачу, если хэш всех её объявленных входов уже встречался. Кэш надёжен ровно настолько, насколько честно описаны \`inputs\` и \`outputs\`.

Типичные формулировки: «Как ускорить CI в монорепо?», «Как Nx понимает, что пересобирать?», «Почему после кэша в проде оказался старый конфиг?».

Что могут спросить следом:

- *Чем \`affected\` отличается от «прогнать всё» на релизной ветке?* — \`affected\` полагается на полноту графа; на релизе часто гоняют всё ради подстраховки.
- *Попадают ли переменные окружения в хэш?* — Только объявленные через \`{ "env": "NAME" }\` во \`inputs\`.
- *Что значит \`^production\`?* — Тот же набор входов, но у зависимостей проекта: изменилась библиотека — изменился хэш потребителя.
- *Как защитить remote cache?* — Писать только с доверенных веток, PR-агентам — read-only токены.
- *Что делать при странном поведении?* — \`nx reset\`, затем \`nx show target inputs\`, чтобы найти необъявленный вход.

### Ответ на 1 минуту

> Nx строит граф зависимостей проектов из статических импортов и \`implicitDependencies\`. \`nx affected\` берёт git-diff ветки с базой, находит изменённые проекты и транзитивно всех, кто от них зависит, и гоняет задачи только для них — на большом монорепо это минуты вместо часов. Поверх этого работает computation caching: перед запуском Nx хэширует входы задачи — файлы проекта и зависимостей по \`namedInputs\`, корневые конфиги, версии пакетов, флаги и объявленные переменные окружения. Хэш совпал — задача не выполняется, из локального кэша или Nx Cloud восстанавливаются объявленные \`outputs\` и лог. Главный подвох: кэш надёжен ровно настолько, насколько честно описаны входы и выходы. Если сборка читает необъявленный env или файл, придёт устаревший результат, а всё, что записано вне \`outputs\`, при cache hit не восстановится. Поэтому я исключаю спеки из входов сборки, объявляю env явно и даю PR-агентам только read-only доступ к remote cache.`,
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
      ru: `## В чём суть

Module Federation — это когда **одно приложение прямо в браузере подгружает куски кода из другого приложения**, собранного отдельно и другой командой. Тот, кто отдаёт код, называется **remote**, тот, кто подтягивает, — **host**. Общие библиотеки (Angular, RxJS) объявляются как \`shared\`, чтобы не тащить их дважды, и вот тут возникает главная сложность — **version skew**: хост и ремоуты собраны под разные версии одной библиотеки.

Аналогия: торговый центр. Host — само здание с эскалаторами, remotes — магазины, каждый со своим ремонтом и своим графиком открытия. \`shared\` — это общая электросеть: подключаться к ней должны все, но если один магазин требует 220 В, а другой 110 В — это и есть version skew, и кто-то сгорит. Настройки \`singleton\`, \`strictVersion\` и \`requiredVersion\` — это правила подключения: одна сеть на всех, проверка напряжения при подключении и допустимый диапазон.

**Какую проблему решает.** Большое приложение, над которым работают пять команд, в монолите релизится как одно целое: одна команда сломала тест — стоят все. Module Federation даёт **независимый деплой**: команда «Заказы» выкатывает свой remote, когда хочет, а host пересобирать не нужно — он просто загрузит новую версию кода при следующем открытии страницы. Цена — связанность переезжает со времени сборки во время выполнения, и согласование версий общих библиотек становится вашей задачей.

## Словарик терминов

- **Микрофронтенд (MFE, micro-frontend)** — часть интерфейса, которую отдельная команда разрабатывает, собирает и деплоит независимо от остальных.
- **Module Federation (MF)** — механизм сборщика (изначально webpack 5), который позволяет одной сборке загружать модули другой сборки во время выполнения.
- **Host и remote** — host загружает чужой код и обычно владеет оболочкой (шапка, роутинг), remote отдаёт свои модули наружу.
- **\`exposes\` / \`remotes\`** — настройки: что remote отдаёт наружу и откуда host это берёт.
- **\`remoteEntry.js\` (контейнер)** — маленький файл-«оглавление» ремоута: знает, какие модули он отдаёт и какие общие библиотеки привёз с собой.
- **\`shared\` и share scope (общая область)** — список общих библиотек и объект в памяти, куда каждая сборка записывает, какие версии этих библиотек у неё есть.
- **Version skew (рассинхрон версий)** — ситуация, когда части системы работают на разных версиях одной библиотеки.
- **Semver и диапазон версий** — \`21.1.4\` = мажор.минор.патч; диапазон \`^21.0.0\` значит «любая 21.x.x, но не 22».
- **\`singleton\`** — «в памяти может быть только одна копия этой библиотеки».
- **\`requiredVersion\`** — диапазон версий, с которым совместим данный бандл.
- **\`strictVersion\`** — бросать ошибку при несовместимости вместо предупреждения или подмены.
- **\`eager\`** — положить общую библиотеку прямо в стартовый бандл, а не загружать асинхронно.
- **Native Federation** — реализация той же идеи на браузерных стандартах (ES-модули и import maps), работает с esbuild-сборщиком Angular CLI.
- **DI (dependency injection) и Zone** — система внедрения зависимостей Angular и механизм zone.js для отслеживания асинхронных операций. Оба хранят глобальное состояние.

## Как это работает под капотом

Механизм по шагам (на примере webpack Module Federation):

1. Сборка ремоута помимо обычных чанков выпускает \`remoteEntry.js\` — контейнер с двумя функциями: \`init(shareScope)\` и \`get('./Routes')\`.
2. При старте host создаёт share scope и записывает туда свои общие библиотеки: «у меня есть \`@angular/core\` 21.1.4».
3. Затем host загружает \`remoteEntry.js\` ремоута и вызывает \`init\` — ремоут **дописывает** в тот же share scope свои версии: «а у меня \`@angular/core\` 21.0.3». Для ремоутов, статически объявленных в \`remotes\`, webpack делает это ещё при инициализации share scope на старте; для динамических (\`loadRemoteModule\`) — при первой загрузке.
4. Затем host вызывает \`get('./Routes')\` и получает фабрику модуля. Код ремоута загружается, и каждый его импорт общей библиотеки идёт не в собственный бандл, а через share scope.
5. В этот момент и происходит согласование версий. Для \`singleton\` выбирается одна версия на всех — уже загруженная или самая высокая из зарегистрированных, — и только потом она сверяется с \`requiredVersion\` каждого потребителя.
6. Если версия не подходит, при \`strictVersion: false\` в консоль пишется предупреждение и код работает на «чужой» версии, а при \`strictVersion: true\` бросается ошибка. Для не-singleton библиотек при настройках по умолчанию бандл при несовпадении просто берёт свою копию — и в памяти оказывается две.

Логика выбора, упрощённо пересказанная по runtime-коду webpack:

\`\`\`js
// shareScope['@angular/core'] = { '21.1.4': { from: 'shell', loaded: 1, get }, '21.0.3': { from: 'orders', get } }
function pickSingletonVersion(versions) {
  // уже загруженная версия побеждает, иначе — самая высокая
  return Object.keys(versions).reduce((a, b) => (!a || (!versions[a].loaded && versionLt(a, b)) ? b : a), 0);
}

function loadSingleton(scope, key, requiredVersion, strictVersion) {
  const version = pickSingletonVersion(scope[key]);
  if (!satisfy(requiredVersion, version)) {
    const msg = \`Unsatisfied version \${version} from \${scope[key][version].from} \` +
                \`of shared singleton module \${key} (required \${requiredVersion})\`;
    if (strictVersion) throw new Error(msg);   // fail fast
    console.warn(msg);                         // работаем дальше на несовместимой версии
  }
  return scope[key][version].get();
}
\`\`\`

Важная деталь: singleton **не ищет «наибольшую совместимую»** версию. Он берёт одну (загруженную или старшую), а совместимость проверяет постфактум.

### Пример 1. Remote: что отдаём наружу

\`\`\`js
// orders/webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  output: { uniqueName: 'orders', publicPath: 'auto' },
  plugins: [
    new ModuleFederationPlugin({
      name: 'orders',
      filename: 'remoteEntry.js',
      exposes: { './Routes': './src/app/orders.routes.ts' },
      shared: {
        '@angular/core':   { singleton: true, strictVersion: true, requiredVersion: '^21.0.0' },
        '@angular/common': { singleton: true, strictVersion: true, requiredVersion: '^21.0.0' },
        '@angular/router': { singleton: true, strictVersion: true, requiredVersion: '^21.0.0' },
        rxjs:              { singleton: true, requiredVersion: '^7.8.0' },
      },
    }),
  ],
};
\`\`\`

Ремоут отдаёт один модуль — свои маршруты — и объявляет, с какими версиями общих библиотек он согласен работать.

### Пример 2. Host: откуда берём и как подключаем

\`\`\`js
// shell/webpack.config.js (фрагмент)
new ModuleFederationPlugin({
  remotes: { orders: 'orders@https://cdn.example.com/orders/remoteEntry.js' },
  shared: { /* те же библиотеки с теми же правилами */ },
});
\`\`\`

\`\`\`ts
// shell/src/app/app.routes.ts
export const routes: Routes = [
  { path: 'orders', loadChildren: () => import('orders/Routes').then(m => m.ORDERS_ROUTES) },
];
\`\`\`

Для TypeScript \`orders/Routes\` — неизвестный модуль, поэтому добавляют объявление \`declare module 'orders/Routes'\` или грузят через хелпер вроде \`loadRemoteModule\`. Загрузка идёт в рантайме, минуя общую сборку: если команда «Заказы» задеплоит новый \`remoteEntry.js\`, host подхватит его без пересборки.

### \`shared\` и share scope: зачем вообще шарить

Без \`shared\` каждый ремоут привезёт свой Angular — это сотни килобайт на каждый микрофронтенд, а главное, несколько независимых копий фреймворка в одной вкладке. \`shared\` говорит сборщику: «не вшивай библиотеку намертво, а сначала спроси share scope, нет ли там подходящей версии». Своя копия при этом всё равно собирается как запасной вариант (fallback) — на случай, если подходящей в scope не окажется.

### \`singleton\`: одна копия на всех

\`singleton: true\` обязателен для всего, что держит глобальное состояние: \`@angular/core\`, \`@angular/common\`, \`@angular/router\`, zone.js, стор (NgRx/NGXS), библиотеки с собственными DI-токенами. Риск в том, что выбранная версия может не подойти части потребителей: если версии реально несовместимы (другой мажор, изменённые внутренние API), ломаются DI, зоны и роутинг — причём ошибка может проявиться далеко от места причины.

### \`requiredVersion\`: контракт по версиям

\`requiredVersion\` сужает допустимый диапазон, чтобы «одна версия на всех» не оказалась чем-то диким. Если его не указать, webpack берёт диапазон из \`package.json\` бандла (\`dependencies\`, \`devDependencies\` или \`peerDependencies\`). Явное значение полезно, когда хочется зафиксировать контракт между командами: «все на \`^21.0.0\`».

### \`strictVersion\`: громко или тихо

\`strictVersion: true\` превращает несовместимость в ошибку на старте (fail fast) вместо тихой поломки через полчаса в проде. Значение по умолчанию зависит от типа: для **singleton** — \`false\` (будет только предупреждение в консоли), для обычных shared-модулей с локальным запасным вариантом — \`true\` (несовпадение молча решается загрузкой своей копии).

### Пример 3. Что происходит при разных версиях

Хост на Angular 21.1.4, ремоут собран под 21.0.3, у обоих \`requiredVersion: '^21.0.0'\`:

- **Оба в диапазоне.** Singleton выбирает одну копию (загруженную или старшую), она подходит обоим — всё работает. Это нормальный, здоровый skew внутри мажора.

Хост перешёл на Angular 22, ремоут остался на \`^21.0.0\`:

- **\`singleton: true\`, \`strictVersion: false\`.** В консоли \`Unsatisfied version 22.0.0 from shell of shared singleton module @angular/core (required ^21.0.0)\`, ремоут работает на чужом мажоре — и может упасть где угодно.
- **\`singleton: true\`, \`strictVersion: true\`.** Ремоут не загрузится, будет ошибка с тем же текстом. Громко, но понятно, и маршрут можно обработать как «раздел временно недоступен».
- **\`singleton: false\`.** Ремоут возьмёт свою копию Angular 21 — в памяти два Angular, и дальше начинаются проблемы из следующего раздела.

### Почему две копии Angular ломают DI

Это легко проверить: загрузим в Node две физические копии \`@angular/core\` — «хоста» и «ремоута» — и вызовем \`inject()\` ремоута внутри контекста инжектора хоста:

\`\`\`js
import * as hostNg from './host/node_modules/@angular/core/fesm2022/core.mjs';
import * as remoteNg from './remote/node_modules/@angular/core/fesm2022/core.mjs';

class AuthService { user = 'Анна'; }
const injector = hostNg.Injector.create({ providers: [{ provide: AuthService, useClass: AuthService, deps: [] }] });

console.log(hostNg.InjectionToken === remoteNg.InjectionToken); // false
hostNg.runInInjectionContext(injector, () => {
  console.log(hostNg.inject(AuthService).user);  // Анна
  remoteNg.inject(AuthService);                  // NG0203: ... inject() function must be called from an injection context ...
});
\`\`\`

У каждой копии свой «текущий инжектор», свои классы токенов и свой реестр. Ремоут не видит сервисов хоста, а проверки \`instanceof\` (например, «это точно наш \`HttpErrorResponse\`?») дают \`false\`. zone.js вообще глобален (\`window.Zone\`), поэтому его загружает только хост. Поэтому singleton для Angular — не опция.

### А две копии RxJS?

\`\`\`js
const hostRx = require('host/node_modules/rxjs');
const remoteRx = require('remote/node_modules/rxjs');
const fromRemote = remoteRx.of(1, 2);

console.log(fromRemote instanceof hostRx.Observable); // false
console.log(hostRx.isObservable(fromRemote));         // true
hostRx.of('a').pipe(hostRx.switchMap(() => fromRemote)).subscribe(v => console.log(v)); // 1, 2
\`\`\`

Операторы RxJS 7 распознают «чужие» Observable по форме объекта и \`Symbol.observable\`, так что потоки между копиями работают. Ломаются проверки \`instanceof\`, глобальные настройки (\`config\` у каждой копии свой), и вы платите двойным объёмом кода. Поэтому RxJS тоже шарят как singleton, но это вопрос эффективности, а не катастрофы.

### \`eager\` и асинхронная граница

Общие библиотеки грузятся асинхронно, поэтому точка входа хоста обычно выглядит так:

\`\`\`ts
// main.ts
import('./bootstrap');   // асинхронная граница: сначала инициализируется share scope

// bootstrap.ts
bootstrapApplication(AppComponent, appConfig);
\`\`\`

Если импортировать Angular в \`main.ts\` синхронно, webpack упадёт с \`Shared module is not available for eager consumption\`. Альтернатива — \`eager: true\`, но тогда библиотека едет в стартовый бандл и согласование версий для неё фактически теряет смысл.

### Native Federation и Module Federation 2.0: что выбрать для Angular сегодня

Angular CLI по умолчанию собирает на esbuild (\`@angular/build:application\`), а классический \`ModuleFederationPlugin\` — это плагин webpack. Варианты:

- **Native Federation** (\`@angular-architects/native-federation\`) — та же модель (\`exposes\`, \`shared\`, \`singleton\`, \`strictVersion\`, \`requiredVersion\`) поверх ES-модулей и import maps, работает с esbuild-сборкой Angular. Remote подключается через \`loadRemoteModule('orders', './Routes')\`, а \`initFederation()\` в \`main.ts\` читает манифест с адресами ремоутов.
- **Webpack-сборка Angular** (\`@angular-architects/module-federation\`, Nx с \`@nx/angular\`) — классический MF, если проект уже живёт на webpack.
- **Module Federation 2.0** (\`@module-federation/enhanced\`) — новое поколение рантайма с плагинами и манифестом, работает с webpack и Rspack.

Вопросы version skew во всех вариантах одинаковые: настройки называются так же и означают то же самое.

### Где это применяется на практике

- **Банковский или страховой портал**: оболочка с авторизацией и навигацией (host), разделы «Платежи», «Кредиты», «Отчёты» — ремоуты разных команд со своими релизными циклами.
- **Постепенная миграция**: новый Angular-раздел подключается к старому приложению как remote, старый код выключается по частям.
- **Плагинная архитектура**: клиенты или партнёры поставляют свои модули в общий кабинет без пересборки платформы.
- **Откат сломанного ремоута**: адреса ремоутов версионируются (\`/orders/1.4.2/remoteEntry.js\`) и берутся из манифеста, а фиче-флаг переключает host на предыдущую версию.

## Важные нюансы и подводные камни

- **Отказ от singleton ради «изоляции»** приводит к двум копиям Angular, zone.js или стора и багам, которые не воспроизводятся локально, где все собраны вместе.
- **\`strictVersion\` по умолчанию** для singleton выключен: несовместимость не роняет приложение, а только пишет предупреждение в консоль, и падает потом в другом месте. Для не-singleton он включён, но несовпадение тихо решается загрузкой второй копии.
- **Singleton берёт старшую или уже загруженную версию, а не «наибольшую совместимую».** Если ремоут зарегистрировал более свежую версию до первой загрузки библиотеки (статические ремоуты регистрируются ещё на старте), победит она — и хост будет работать на Angular ремоута.
- **Версии живут отдельно от кода.** Ремоут задеплоили с новым Angular, а хост об этом не знает. Нужны проверка совместимости в рантайме, интеграционный стенд и общий график обновления мажоров.
- **Отладка через два бандла**: свои source maps у каждого, разные версии одной библиотеки в одном стеке вызовов — закладывайте время.
- **MF и single-spa — разные слои.** MF — шаринг кода на уровне сборки, single-spa — оркестрация жизненного цикла (кто смонтирован). Их часто используют вместе.
- **Не путайте с ленивой загрузкой.** \`loadChildren\` внутри одного приложения — это не микрофронтенд: там одна сборка и нет независимого деплоя.
- **Одной команде MFE не нужны.** При общем релизном цикле монолитный SPA проще; MFE окупаются примерно от трёх-четырёх автономных команд с разной частотой релизов.

**Плюсы:** независимый деплой и владение кодом командами; общие библиотеки грузятся один раз; можно мигрировать по частям.
**Минусы:** связанность переезжает в рантайм; согласование версий shared-библиотек становится постоянной заботой; сложнее отладка, тестирование интеграции и инфраструктура (манифесты, CDN, откаты).

## Как это спрашивают на собеседовании

**Главный вывод:** Module Federation позволяет хосту загружать модули отдельно собранных ремоутов в рантайме, что даёт независимый деплой. Общие библиотеки согласуются через share scope: \`singleton\` оставляет одну копию, \`requiredVersion\` задаёт допустимый диапазон, \`strictVersion\` решает, падать ли при несовпадении.

Типичные формулировки: «Что такое Module Federation?», «Как вы решали конфликт версий Angular между микрофронтендами?», «Зачем \`singleton: true\`?».

Что могут спросить следом:

- *Какая версия победит при singleton?* — Уже загруженная, иначе самая высокая из зарегистрированных; совместимость проверяется после выбора.
- *Чем MF отличается от single-spa?* — MF шарит код на уровне сборки, single-spa оркестрирует жизненный цикл приложений по URL.
- *Как откатить сломанный remote?* — Версионированные URL ремоутов в манифесте плюс фиче-флаг на хосте.
- *Как подружить MF с esbuild-сборкой Angular?* — Native Federation: та же модель на ES-модулях и import maps.
- *Чем грозят две копии Angular?* — Два DI и два реестра токенов: ремоут не видит сервисов хоста, \`inject()\` падает с NG0203.

### Ответ на 1 минуту

> Module Federation позволяет одной сборке — remote — отдавать модули через \`exposes\`, а другой — host — загружать их в рантайме, минуя общую сборку. Главная ценность — независимый деплой: команда выкатывает свой remote, хост пересобирать не нужно. Общие библиотеки объявляются в \`shared\`, и каждая сборка записывает свои версии в общий share scope; отсюда version skew, когда хост и ремоут собраны под разные версии. Три настройки: \`singleton\` оставляет одну копию — для Angular, zone.js и стора это обязательно, иначе два DI, и ремоут не видит сервисов хоста; \`requiredVersion\` задаёт допустимый диапазон, по умолчанию из \`package.json\`; \`strictVersion\` решает, падать ли при несовпадении — для singleton он по умолчанию выключен и даёт лишь warning. Нюанс: singleton берёт уже загруженную или старшую версию, а не «наибольшую совместимую». С esbuild-сборкой Angular сегодня использую Native Federation.`,
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
      ru: `## В чём суть

single-spa и Module Federation — **инструменты про разные вещи, а не конкуренты**. single-spa отвечает на вопрос «кто сейчас на экране»: по URL он включает и выключает микрофронтенды. Module Federation отвечает на вопрос «откуда взялся код»: он загружает модули отдельно собранных бандлов и делит между ними общие библиотеки. Поэтому их часто ставят вместе, а изоляцию между микрофронтендами в любом случае приходится строить отдельно.

Аналогия: концерт. single-spa — конферансье с расписанием: объявляет номер, выводит артиста на сцену и уводит его (\`bootstrap\` / \`mount\` / \`unmount\`). Module Federation — общий бэклайн: барабаны и усилители, которыми пользуются все группы, чтобы каждая не везла свои. Конферансье не заменяет усилитель, а усилитель не объявляет номера. А изоляция — это правила сцены: не трогать чужие инструменты и убрать за собой провода.

**Какую проблему решает.** Когда несколько команд делают одно приложение, нужно две вещи: решить, какая часть интерфейса сейчас активна, и доставить её код в браузер, не загружая один и тот же Angular пять раз. single-spa закрывает первое, MF — второе. Но все микрофронтенды живут в **одном документе**: одном \`window\`, одном DOM, одном CSS-каскаде. Без изоляции стиль одной команды перекрашивает кнопки другой, а забытый таймер одного приложения продолжает дёргать API после ухода со страницы.

## Словарик терминов

- **Микрофронтенд (MFE, micro-frontend)** — часть интерфейса, которую отдельная команда разрабатывает и деплоит независимо.
- **single-spa** — фреймворк-оркестратор: регистрирует микрофронтенды и по URL решает, кого смонтировать, а кого размонтировать.
- **Жизненный цикл (lifecycle): \`bootstrap\`, \`mount\`, \`unmount\`** — три асинхронные функции, которые экспортирует каждый микрофронтенд: один раз подготовиться, отрисоваться, убрать за собой.
- **Root config (корневая конфигурация)** — маленькое приложение-оболочка, в котором вызываются \`registerApplication\` и \`start\`.
- **\`activeWhen\`** — правило активности: префикс пути (\`'/orders'\`) или функция от \`location\`.
- **Module Federation (MF)** — механизм сборщика, позволяющий одной сборке загружать модули другой в рантайме; общие библиотеки описываются в \`shared\`.
- **Import map** — JSON в странице, который говорит браузеру, по какому URL лежит модуль с именем вроде \`@acme/orders\`. Классический способ подключения в single-spa.
- **Shadow DOM** — изолированное поддерево DOM со своими стилями: внешний CSS не проникает внутрь, внутренний не вытекает наружу.
- **\`CustomEvent\`** — браузерное событие с произвольными данными в \`detail\`; удобный «почтовый ящик» между микрофронтендами.
- **Error boundary (граница ошибок)** — механизм, который ловит падение одной части интерфейса, не давая ему уронить всё остальное.
- **Monkey-patching** — подмена глобальной функции (\`window.fetch\`, \`history.pushState\`) своей обёрткой.
- **Контрактный тест (contract test)** — тест, проверяющий, что две стороны соблюдают договорённый интерфейс: формат событий, входные props, версии.

## Как это работает под капотом

Как single-spa управляет приложениями:

1. Сначала root config регистрирует приложения: имя, функцию загрузки кода и правило \`activeWhen\`. Код при этом ещё не загружается.
2. \`start()\` подписывается на изменения URL (\`popstate\`, \`hashchange\` и патченные \`pushState\`/\`replaceState\`), поэтому любая навигация — ссылкой, роутером Angular или кнопкой «назад» — запускает пересчёт.
3. На каждый пересчёт single-spa проверяет \`activeWhen\` у всех приложений и делит их на «должны быть смонтированы» и «должны быть размонтированы».
4. Сначала вызываются \`unmount\` у уходящих приложений, затем для новых — загрузка кода, один раз \`bootstrap\` и \`mount\`. Поэтому два приложения не борются за одну область экрана.
5. Если любой lifecycle выбросил ошибку, приложение получает статус \`SKIP_BECAUSE_BROKEN\` и больше не трогается, а остальные продолжают работать.

Module Federation работает на другом уровне: в момент загрузки кода (шаг 4) функция \`app: () => import('orders/Lifecycles')\` идёт за \`remoteEntry.js\` ремоута, а импорты общих библиотек внутри ремоута разрешаются через общую область \`shared\`, а не через его собственный бандл. single-spa не знает, откуда пришёл код; MF не знает, когда его монтировать.

### single-spa: регистрация и навигация

\`\`\`ts
import { registerApplication, start, navigateToUrl } from 'single-spa';

const lifecycles = (name: string) => ({
  bootstrap: async () => console.log(\`\${name}: bootstrap\`),
  mount: async (props: { domElement: HTMLElement }) => {
    console.log(\`\${name}: mount\`);
    props.domElement.textContent = name;
  },
  unmount: async (props: { domElement: HTMLElement }) => {
    console.log(\`\${name}: unmount\`);
    props.domElement.textContent = '';
  },
});
const el = (id: string) => document.getElementById(id)!;

registerApplication({ name: 'header',  app: async () => lifecycles('header'),  activeWhen: () => true, customProps: { domElement: el('header') } });
registerApplication({ name: 'orders',  app: async () => lifecycles('orders'),  activeWhen: '/orders',  customProps: { domElement: el('orders') } });
registerApplication({ name: 'billing', app: async () => lifecycles('billing'), activeWhen: '/billing', customProps: { domElement: el('billing') } });
start();
// открыли /orders:
// header: bootstrap
// orders: bootstrap
// header: mount
// orders: mount

navigateToUrl('/billing');
// orders: unmount
// billing: bootstrap
// billing: mount
\`\`\`

Этот вывод получен запуском single-spa 6 в jsdom. \`header\` активен всегда и при навигации не трогается; \`orders\` размонтирован, его контейнер пуст. В реальном проекте \`app\` — это \`() => import('@acme/orders')\` через import map или загрузка ремоута через Module Federation.

Обратите внимание на \`domElement\`: для зарегистрированных **приложений** single-spa сам его не передаёт — в props приходят \`name\`, \`singleSpa\`, \`mountParcel\` и ваши \`customProps\`. Контейнер либо передают через \`customProps\`, как здесь, либо его создаёт хелпер фреймворка (у \`single-spa-angular\` есть опция \`domElementGetter\`). \`domElement\` обязателен только у parcel — кусочка интерфейса, который монтируют вручную через \`mountParcel\`.

### Контракт микрофронтенда и почему \`unmount\` важнее всех

\`\`\`ts
export async function bootstrap() { /* один раз: подготовка, загрузка конфига */ }
export async function mount(props: AppProps) { /* отрисоваться в свой контейнер */ }
export async function unmount(props: AppProps) {
  /* убрать DOM, отписаться, снять слушатели window, остановить таймеры, уничтожить приложение */
}
\`\`\`

\`unmount\` — самое важное место. Если микрофронтенд не снимает подписки, слушатели \`window\` и таймеры, каждое переключение маршрутов копит утечки: «призрачные» подписчики продолжают дёргать API размонтированного приложения, и через двадцать минут работы вкладка тормозит.

### \`single-spa-angular\`: Angular-приложение как микрофронтенд

\`\`\`ts
import { singleSpaAngular, provideSingleSpaPlatform } from 'single-spa-angular';
import { platformBrowser, bootstrapApplication } from '@angular/platform-browser';
import { Router, NavigationStart } from '@angular/router';

const lifecycles = singleSpaAngular({
  bootstrapFunction: async () => {
    const platformRef = platformBrowser(provideSingleSpaPlatform());
    return bootstrapApplication(AppComponent, appConfig, { platformRef });
  },
  template: '<app-root />',
  NgZone: 'noop',            // для zoneless-приложения
  Router,
  NavigationStart,
});

export const { bootstrap, mount, unmount } = lifecycles;
\`\`\`

Хелпер превращает \`bootstrapApplication\` в три lifecycle-функции: при \`mount\` создаёт контейнер и запускает приложение, при \`unmount\` уничтожает \`ApplicationRef\` вместе со всеми компонентами и подписками на \`DestroyRef\`.

### Module Federation: шаринг кода на уровне сборки

Remote объявляет \`exposes\` (что отдаёт), host — \`remotes\` (откуда брать), общие библиотеки идут в \`shared\` с правилами \`singleton\`, \`requiredVersion\`, \`strictVersion\`. Оркестрации там нет вообще: MF не знает про URL и монтирование, он только загружает модуль. В чистом Angular-стеке роль «конферансье» выполняет обычный Angular Router хоста: \`loadChildren: () => import('orders/Routes')\`.

### Сильные и слабые стороны

- **single-spa, сильные:** агностичен к сборщику и фреймворку — можно смешивать React, Angular и Vue на одном экране; явный жизненный цикл; хорошо подходит для постепенной миграции с легаси.
- **single-spa, слабые:** много шаблонного кода на каждое приложение; общие зависимости шарятся вручную (import maps, SystemJS); у каждого фреймворка свой адаптер.
- **Module Federation, сильные:** нативный шаринг зависимостей и ленивая загрузка из коробки; для Angular-хоста ремоут выглядит как обычный lazy-маршрут.
- **Module Federation, слабые:** привязка к сборщику (webpack, Rspack, плагин для Vite; для esbuild-сборки Angular — Native Federation) и связанность в рантайме через \`shared\`.

### Как выбрать

- **Однородный Angular-стек, несколько команд** → чистый Module Federation (или Native Federation), роутинг — Angular Router хоста.
- **Зоопарк фреймворков** (Angular + React + легаси на AngularJS) → single-spa, при желании плюс MF для общих зависимостей.
- **Постепенная миграция с легаси** → single-spa: старое и новое приложения живут рядом, маршруты переезжают по одному.
- **Две команды, общий релизный цикл** → ни то ни другое: lazy-маршруты в монорепо проще.

### Изоляция стилей

Все микрофронтенды делят один CSS-каскад. Angular по умолчанию изолирует стили **компонентов** (эмулированная инкапсуляция добавляет атрибуты вроде \`_ngcontent-abc\`), но глобальные стили каждого приложения (\`styles.scss\`, reset, тема) вытекают на всех. Варианты защиты:

- **Shadow DOM** (\`ViewEncapsulation.ShadowDom\` или Web Component): стили не проходят границу ни внутрь, ни наружу — но глобальная тема и оверлеи (модалки, тултипы, которые рендерятся в \`body\`) перестают получать стили.
- **Префиксы и CSS-модули**: все глобальные классы одной команды начинаются с \`orders-\`, reset применяется только внутри своего контейнера.
- **Общая дизайн-система** из shell: тема и reset подключаются один раз оболочкой, микрофронтенды их не дублируют.

### Изоляция JS и состояния: общение через события

\`\`\`ts
// billing: сообщает факт
window.dispatchEvent(new CustomEvent('cart:item-added', { detail: { sku: 'A-1', count: 3 } }));

// header: подписывается и обязательно отписывается в unmount
const onAdded = (e: Event) => console.log('header получил:', (e as CustomEvent).detail);
window.addEventListener('cart:item-added', onAdded);
// header получил: { sku: 'A-1', count: 3 }
\`\`\`

Правила: не мусорить в \`window\` (у каждой команды свой namespace), общаться событиями или через явный общий стор с описанным API, а не через общие мутируемые объекты. Формат событий — это контракт, его версионируют и покрывают контрактными тестами.

### Изоляция падений: error boundary

Если \`mount\` у \`billing\` выбросит ошибку, single-spa всё равно вызовет его \`unmount\` для уборки, переведёт приложение в \`SKIP_BECAUSE_BROKEN\`, а остальные продолжат работать:

\`\`\`ts
import { addErrorHandler, getAppStatus } from 'single-spa';

addErrorHandler(err => console.log(\`error: \${err.appOrParcelName} -> \${getAppStatus(err.appOrParcelName)}\`));
navigateToUrl('/billing');
// billing: bootstrap
// billing: unmount
// error: billing -> SKIP_BECAUSE_BROKEN
// (header по-прежнему смонтирован)
\`\`\`

Без обработчиков single-spa выбрасывает ошибку глобально (\`application 'billing' died in status NOT_MOUNTED: boom\`). Обработчик — место, где показывают заглушку «раздел временно недоступен» и отправляют ошибку в мониторинг. Внутри Angular-приложения роль второй линии обороны играет свой \`ErrorHandler\`.

### Где это применяется на практике

- **Миграция с AngularJS или старого Angular**: single-spa держит старое и новое приложения рядом, маршруты переезжают по одному без «большого переписывания».
- **Корпоративный портал**: shell с авторизацией и меню, разделы разных команд на одном стеке — Module Federation и роутер хоста.
- **Смешанный стек после слияния компаний**: React-раздел и Angular-раздел в одной оболочке через single-spa, общий дизайн через Web Components.
- **Дашборды с виджетами от разных команд**: каждый виджет — parcel или remote-компонент, общение через события, падение одного виджета не роняет страницу.

## Важные нюансы и подводные камни

- **Считать их альтернативами.** Это разные слои: оркестрация против шаринга кода. За такое цепляются сразу.
- **Забытый \`unmount\`** — утечки памяти и «призрачные» подписчики, которые продолжают дёргать API размонтированного микрофронтенда.
- **Глобальный CSS.** Reset или \`* { box-sizing: border-box }\` из одного микрофронтенда ломает вёрстку соседей; Shadow DOM защищает, но мешает глобальным темам и порталам/оверлеям.
- **Monkey-patching \`window.fetch\`/\`history\`** ради своих нужд — классический источник «у соседей всё сломалось после нашего релиза».
- **Общий мутируемый стор** превращает независимые команды обратно в монолит, только без компилятора, который поймает несовместимость.
- **Скрытая глобальная связанность** — главный провал микрофронтендов. Лечится явными контрактами (props, события, версии) и контрактными тестами на границах.
- **Zone/DI в Angular.** При шаринге через MF Angular должен быть singleton, иначе два DI и два набора токенов; zone.js глобален и загружается один раз оболочкой.
- **Как версионировать контракт shell ↔ MFE.** Semver на формат событий и props плюс контрактные тесты, которые запускаются в CI обеих сторон.
- **Два микрофронтенда требуют разные мажоры Angular.** Либо синхронизировать обновление, либо изолировать: iframe даёт настоящую изоляцию, Web Component (Angular Elements) со своим Angular — работает, но это две копии фреймворка на странице со всеми издержками.

**Плюсы:** single-spa даёт независимость от фреймворков и явный жизненный цикл; MF даёт нативный шаринг зависимостей; вместе они покрывают и оркестрацию, и доставку кода.
**Минусы:** много инфраструктуры и шаблонного кода; изоляция не бесплатна — стили, глобалы, состояние и ошибки требуют дисциплины и контрактов; отладка через несколько бандлов сложнее.

## Как это спрашивают на собеседовании

**Главный вывод:** single-spa — оркестратор жизненного цикла по URL, Module Federation — шаринг кода на уровне сборки; это разные слои, и их часто комбинируют. Изоляция в одном документе не бесплатна: стили, глобалы, состояние и ошибки нужно изолировать явно.

Типичные формулировки: «Сравните single-spa и Module Federation», «Как изолировать микрофронтенды друг от друга?», «Что будет, если один микрофронтенд упадёт?».

Что могут спросить следом:

- *Что происходит при ошибке в \`mount\`?* — single-spa вызывает \`unmount\`, ставит статус \`SKIP_BECAUSE_BROKEN\`, зовёт \`addErrorHandler\`; остальные приложения работают.
- *Как микрофронтенды общаются?* — Событиями (\`CustomEvent\`) или через общий стор с явным API; формат — версионируемый контракт.
- *Как версионировать контракт shell ↔ MFE?* — Semver плюс контрактные тесты в CI обеих сторон.
- *Что делать с разными мажорами Angular?* — Синхронизировать обновление или изолировать через iframe/Web Component.

### Ответ на 1 минуту

> single-spa — это оркестратор жизненного цикла: каждый микрофронтенд экспортирует \`bootstrap\`, \`mount\` и \`unmount\`, а root config по \`activeWhen\` решает, кто активен на текущем URL; он не зависит от сборщика и фреймворка, поэтому подходит для зоопарка стеков и миграции с легаси. Module Federation — не оркестрация, а шаринг кода на уровне сборки: remote экспонирует модули, host грузит их в рантайме, общие библиотеки идут в \`shared\`. Их часто комбинируют: single-spa маршрутизирует, MF шарит Angular и RxJS. Изоляция при этом не бесплатна, потому что все живут в одном документе: стили через Shadow DOM или префиксы, никакого мусора в \`window\`, общение событиями, error boundary — в single-spa упавшее приложение уходит в \`SKIP_BECAUSE_BROKEN\`, а остальные работают. Самый частый провал — скрытая глобальная связанность: кто-то патчит \`window.fetch\` или мутирует общий стор; лечу это контрактами и контрактными тестами.`,
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
      ru: `## В чём суть

Компоненты делят на два сорта. **Smart (container)** знает, откуда берутся данные: инжектит сервисы и стейт, дёргает API, обычно висит на маршруте. **Dumb (presentational)** ничего не знает про источник: ему дали данные через входы (\`input()\` или \`@Input\`), он их нарисовал и через выход (\`output()\` или \`@Output\`) сообщил «на меня нажали». Принцип в одну строку: **данные идут вниз, события — вверх**.

Аналогия: ресторан. Официант (smart) ходит на кухню, знает меню, оформляет заказ. Тарелка (dumb) просто показывает то, что на неё положили, и не имеет понятия, откуда взялась еда. Тарелку можно поставить на любой стол — тем она и ценна. Но если между кухней и гостем поставить пятерых официантов, передающих тарелку из рук в руки, обслуживание станет хуже, а не лучше — это и есть момент, когда паттерн начинает мешать.

**Какую проблему решает.** Компонент, который сам грузит данные, сам решает, что делать по клику, и сам рисует, невозможно переиспользовать (он привязан к конкретному API) и трудно тестировать (каждый тест мокает HTTP, роутер и стор). Разделение даёт три выгоды: переиспользуемость (карточку пользователя можно показать в списке, в поиске и в модалке), тестируемость (презентационный компонент проверяется как функция «вход → разметка») и производительность (с \`OnPush\` он перерисовывается только когда действительно изменились входы).

## Словарик терминов

- **Smart / container компонент** — компонент-«дирижёр»: получает данные из сервисов или стора, обрабатывает события, навигирует. Обычно привязан к маршруту.
- **Dumb / presentational компонент** — компонент-«витрина»: только входы, выходы и разметка, никаких \`inject()\` для данных.
- **Вход (\`input()\`, legacy \`@Input\`)** — свойство, через которое родитель передаёт данные ребёнку. \`input()\` — сигнальная версия, появилась в Angular 17.1.
- **Выход (\`output()\`, legacy \`@Output\` + \`EventEmitter\`)** — канал, через который ребёнок сообщает родителю о событии.
- **Сигнал (\`signal\`, \`computed\`)** — реактивное значение Angular; \`computed\` — значение, автоматически пересчитываемое из других сигналов.
- **Change detection (обнаружение изменений)** — процесс, в котором Angular сверяет данные с DOM и обновляет разметку.
- **\`ChangeDetectionStrategy.OnPush\`** — режим, в котором компонент проверяется не всегда, а только по конкретным поводам: новая ссылка во входе, событие в его шаблоне, изменение прочитанного сигнала, \`markForCheck\`.
- **Иммутабельность (immutability)** — не менять объект на месте, а создавать новый: \`{ ...user, name: 'Мария' }\`.
- **Prop drilling** — проброс входов и выходов через много уровней компонентов, которым эти данные не нужны.
- **Фасад (facade)** — сервис, который прячет за простым API работу со стором, HTTP и бизнес-правилами.
- **TestBed** — тестовое окружение Angular: создаёт компоненты, настраивает DI и провайдеры для тестов.

## Как это работает под капотом

Поток данных по шагам:

1. Умный компонент инжектит сервис, стор или фасад и получает данные — например, сигнал со списком пользователей.
2. Он передаёт вниз через входы только то, что нужно для отрисовки: \`[user]="user"\`.
3. Презентационный компонент объявлен с \`OnPush\` и просто рисует полученное. Своих источников данных у него нет, поэтому его состояние полностью определяется входами.
4. Пользователь кликнул — презентационный компонент **не решает**, что делать, а эмитит факт через выход: \`select.emit(user().id)\`.
5. Умный компонент ловит событие и выполняет действие: диспатчит в стор, вызывает API, меняет маршрут.
6. Новые данные снова идут вниз — круг замкнулся. Логика сосредоточена в одном месте, разметка — в другом.

### Пример 1. Презентационный компонент

\`\`\`ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface User { id: string; name: string; role: 'admin' | 'user' }

@Component({
  selector: 'app-user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <h3>{{ user().name }}</h3>
    @if (user().role === 'admin') { <span class="badge">admin</span> }
    <button (click)="select.emit(user().id)">Открыть</button>
  \`,
})
export class UserCard {
  readonly user = input.required<User>();
  readonly select = output<string>();
}
\`\`\`

У компонента нет ни одного \`inject()\`. Всё, что он показывает, пришло через \`user\`, всё, что он умеет, — сообщить о клике.

### \`input()\` и \`input.required()\`

\`input<T>(initial)\` создаёт входной сигнал с значением по умолчанию, \`input.required<T>()\` — обязательный вход: без него шаблон родителя не скомпилируется. В шаблоне вход читается как функция: \`user()\`. Старый вариант — декоратор \`@Input() user!: User\` — по-прежнему работает и часто встречается в существующих проектах; разница в том, что сигнальный вход можно использовать в \`computed\`:

\`\`\`ts
readonly user = input.required<User>();
readonly initials = computed(() => this.user().name.split(' ').map(p => p[0]).join(''));
// user = { name: 'Анна Петрова', ... } → initials() === 'АП'
\`\`\`

### \`output()\`

\`output<T>()\` возвращает объект с методом \`emit(value)\`; родитель подписывается в шаблоне: \`(select)="open($event)"\`. Это замена связке \`@Output() select = new EventEmitter<string>()\`. Выход сообщает **факт** («нажали “Открыть” у пользователя u2»), а не решение («перейди на страницу пользователя»).

### \`OnPush\`: когда презентационный компонент перерисовывается

Компонент с \`OnPush\` проверяется только если: во вход пришла **новая ссылка**; в его шаблоне произошло событие (клик); изменился сигнал, который читает шаблон; кто-то вызвал \`markForCheck\` (это делает, например, \`async\` pipe). Отсюда главная практическая боль — мутация:

\`\`\`ts
@Component({
  selector: 'app-host',
  imports: [UserCard],
  template: \`<app-user-card [user]="user" />\`,
})
class Host {
  user: User = { id: 'u1', name: 'Анна', role: 'admin' };
  renameMutable()   { this.user.name = 'Мария'; }                 // та же ссылка
  renameImmutable() { this.user = { ...this.user, name: 'Ольга' }; } // новая ссылка
}
// старт:            <h3>Анна</h3>
// renameMutable():  <h3>Анна</h3>   ← модель уже 'Мария', а карточка не обновилась
// renameImmutable(): <h3>Ольга</h3>
\`\`\`

Вывод проверен тестом в Angular 21. Angular сравнивает входы по ссылке (\`Object.is\`): мутация не меняет ссылку, значит, для \`OnPush\`-ребёнка «ничего не произошло».

### Пример 2. Умный компонент (контейнер)

\`\`\`ts
@Component({
  selector: 'app-users-page',
  imports: [UserCard],
  template: \`
    @for (user of users(); track user.id) {
      <app-user-card [user]="user" (select)="open($event)" />
    } @empty {
      <p>Пользователей нет</p>
    }
  \`,
})
export class UsersPage {
  private readonly api = inject(UsersApi);
  private readonly router = inject(Router);
  protected readonly users = toSignal(this.api.list(), { initialValue: [] });

  open(id: string) {
    this.router.navigate(['/users', id]);
  }
}
\`\`\`

Контейнер знает про API и роутер, но не знает, как выглядит карточка. \`toSignal\` превращает Observable из HTTP в сигнал для шаблона.

### Пример 3. Тест презентационного компонента

\`\`\`ts
it('renders and emits', async () => {
  const fixture = TestBed.createComponent(UserCard);
  fixture.componentRef.setInput('user', { id: 'u1', name: 'Анна', role: 'admin' });
  await fixture.whenStable();
  const el: HTMLElement = fixture.nativeElement;
  console.log(el.querySelector('h3')?.textContent, el.querySelector('.badge')?.textContent);
  // Анна admin

  const emitted: string[] = [];
  fixture.componentInstance.select.subscribe(id => emitted.push(id));
  el.querySelector('button')!.click();
  console.log(emitted); // [ 'u1' ]
});
\`\`\`

Ни одного провайдера: не нужно мокать HTTP, роутер или стор. Тест — это «дал вход, проверил разметку и выход». \`setInput\` — правильный способ задать вход в тесте, он работает и с \`input()\`, и с \`@Input\`.

### Пример 4. Тест контейнера с фейковым сервисом

\`\`\`ts
TestBed.configureTestingModule({
  providers: [
    provideRouter([]),
    { provide: UsersApi, useValue: { list: () => of([
      { id: 'u1', name: 'Анна', role: 'admin' },
      { id: 'u2', name: 'Борис', role: 'user' },
    ]) } },
  ],
});
const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
const fixture = TestBed.createComponent(UsersPage);
await fixture.whenStable();
// карточек: 2, заголовки: [ 'Анна', 'Борис' ]
fixture.nativeElement.querySelectorAll('button')[1].click();
// navigate вызван с [ '/users', 'u2' ]
\`\`\`

Мокается только то, что инжектит контейнер. Презентационные дети работают настоящие — это заодно проверяет связку входов и выходов.

### Фасад: где живёт логика, если контейнер растёт

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private readonly api = inject(UsersApi);
  private readonly state = signal<User[]>([]);
  readonly users = this.state.asReadonly();
  readonly admins = computed(() => this.state().filter(u => u.role === 'admin'));

  load() { this.api.list().subscribe(list => this.state.set(list)); }
}
\`\`\`

Фасад — это **сервис**, контейнер — это **компонент**, который его использует. Когда контейнер обрастает бизнес-правилами, их выносят в фасад или стор, а контейнер остаётся тонким клеем между фасадом и разметкой.

### Когда паттерн начинает мешать

- **Prop drilling.** Данные нужны компоненту на пятом уровне, и каждый промежуточный уровень объявляет вход и выход только чтобы передать их дальше. Это мучительно и хрупко: переименовали поле — правите пять файлов. Решение — инжектить фасад или стор прямо на нужном уровне.
- **Искусственное дробление.** Одноразовый кусок вёрстки, который больше нигде не используется, не нужно резать на container и presentational — это чистый overhead.
- **Сигналы размывают границу.** Компонент может читать сигнал из инжектированного стора и при этом оставаться «глупым» по логике: он ничего не решает и не ходит в сеть. Это нормально, если правило «нет HTTP и бизнес-решений в презентационном слое» соблюдается.

### Где это применяется на практике

- **Дизайн-система и UI-кит**: кнопки, карточки, таблицы, фильтры — всё презентационное, переиспользуется во всех разделах.
- **Большие гриды**: контейнер грузит страницу данных и держит сортировку/фильтры, презентационная таблица только рисует строки и эмитит \`sortChange\`, \`rowClick\`.
- **Формы**: контейнер отвечает за загрузку и сохранение, презентационная форма получает начальные значения и эмитит \`submit\` с данными.
- **Страницы в Nx-монорепо**: контейнеры живут в библиотеках \`feature\`, презентационные компоненты — в \`ui\`, и линтер не даёт \`ui\` импортировать \`data-access\`.

## Важные нюансы и подводные камни

- **Prop drilling.** Пробрасывать входы и выходы через пять уровней мучительно и хрупко — введите фасад или стор на нужном уровне вместо ритуала.
- **Искусственное дробление.** Одноразовая вёрстка не нуждается в разрезании на два компонента.
- **Dumb с \`inject(HttpClient)\` — уже не dumb.** Первый признак: его тест вдруг требует TestBed с провайдерами и мок HTTP.
- **\`OnPush\` + мутация объекта.** Изменили поле внутри \`user\` без новой ссылки — вид не обновится. Это самая частая практическая боль паттерна; спасают иммутабельные обновления или сигналы.
- **Ложное «обновилось».** Мутация иногда *кажется* рабочей: если перед этим в компоненте был клик, он уже помечен для проверки и подхватит изменение. Баг всплывёт позже, в другом сценарии.
- **\`@Output\`, который эмитит решение** («удалить пользователя») вместо факта («нажали кнопку удаления») — так логика утекает вниз, и компонент перестаёт быть переиспользуемым.
- **Как паттерн меняется с сигналами.** \`input()\`/\`output()\` вместо декораторов, \`computed\` вместо ручных пересчётов в \`ngOnChanges\`; презентационный компонент может читать сигналы стора напрямую.
- **Container против фасада.** Фасад — сервис с логикой, container — компонент, который его использует.

**Плюсы:** переиспользуемые презентационные компоненты; простые тесты без моков; предсказуемая перерисовка с \`OnPush\`; логика сосредоточена в контейнерах и фасадах.
**Минусы:** prop drilling в глубоких деревьях; лишние файлы при искусственном дроблении; требует дисциплины иммутабельности, иначе \`OnPush\` даёт «залипший» интерфейс.

## Как это спрашивают на собеседовании

**Главный вывод:** контейнер знает, откуда данные и что делать с событиями; презентационный компонент получает всё через входы, сообщает факты через выходы и с \`OnPush\` перерисовывается только по новой ссылке. Это эвристика, а не закон: при prop drilling лучше фасад или стор на нужном уровне.

Типичные формулировки: «Что такое smart и dumb компоненты?», «Зачем разделять container и presentational?», «Когда этот паттерн вредит?».

Что могут спросить следом:

- *Почему карточка не обновилась после изменения \`user.name\`?* — \`OnPush\` сравнивает входы по ссылке; мутация ссылку не меняет. Нужен новый объект или сигнал.
- *Чем container отличается от фасада?* — Фасад — сервис с логикой, container — компонент, который его использует.
- *Как паттерн выглядит с сигналами?* — \`input()\`/\`output()\`, \`computed\` для производных данных, стор на сигналах читается напрямую.
- *Как тестировать dumb-компонент?* — \`TestBed.createComponent\`, \`componentRef.setInput\`, проверка разметки и выхода — без провайдеров.

### Ответ на 1 минуту

> Компоненты делятся на smart-контейнеры и dumb-презентационные. Контейнер инжектит сервисы, фасад или стор, оркестрирует данные и обычно привязан к маршруту; презентационный получает всё через \`input()\` или \`@Input\`, сообщает о событиях через \`output()\` и ничего не знает об источнике данных. Данные идут вниз, события вверх. Выгода тройная: переиспользуемость, потому что карточка не привязана к контексту; тестируемость — её тест это \`setInput\` и проверка разметки без единого мока; и производительность — с \`OnPush\` она перерисовывается только при новой ссылке во входе, событии в шаблоне или изменении сигнала. Отсюда главная ловушка: мутировали поле объекта — вид не обновится. И это эвристика, а не закон: на глубокой иерархии начинается prop drilling, и тогда лучше инжектить фасад или стор прямо на нужном уровне. С сигналами граница размывается, и это нормально, пока в презентационном слое нет HTTP и бизнес-решений.`,
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
    category: 'ngrx',
    level: 'Hard',
    tags: ['design-patterns', 'facade', 'state-management'],
    question: {
      ru: 'Что такое Facade-паттерн в Angular-стейте и какие у него плюсы и риски?',
      en: 'What is the Facade pattern in Angular state, and what are its benefits and risks?',
    },
    answer: {
      ru: `## В чём суть

**Facade (фасад)** в Angular-стейте — это обычный инжектируемый сервис, который прячет за собой всю «кухню» стейт-менеджмента: селекторы, \`dispatch\`, сигналы, сабджекты. Компонент вызывает \`facade.loadOrders()\` и читает \`facade.orders()\`, и понятия не имеет, NgRx там внутри, SignalStore или просто сервис с сигналами.

Аналогия: **ресепшн отеля**. Вы говорите «нужен трансфер в аэропорт» — и не звоните в гараж, не оформляете путевой лист, не ищете свободного водителя. Ресепшн — узкая понятная дверь в сложную систему. Но если через ресепшн начать заказывать вообще всё, включая ремонт лифта и закупку продуктов для кухни, он превратится в бутылочное горлышко, где никто не может ничего найти.

**Какую проблему решает.** Без фасада каждый компонент импортирует \`Store\`, селекторы и actions своего домена. В итоге десятки компонентов знают внутреннее устройство state: переименовали action — правите двадцать файлов; решили перевести домен с классического NgRx на сигналы — переписываете все компоненты; пишете тест компонента — настраиваете \`MockStore\` с пятью селекторами. Фасад собирает эту связанность в одном месте: компоненты зависят от **простого контракта** «что можно прочитать и что можно сделать», а реализация за ним может меняться.

## Словарик терминов

- **Паттерн «Фасад» (Facade pattern)** — классический паттерн проектирования: простой интерфейс поверх сложной подсистемы.
- **Домен (domain)** — функциональная область приложения со своими данными и правилами: заказы, биллинг, пользователи.
- **Инкапсуляция (encapsulation)** — сокрытие внутреннего устройства: снаружи видно только то, что нужно для работы.
- **Абстракция (abstraction)** — контракт «что умеет», без «как устроено»; в TypeScript — интерфейс или абстрактный класс.
- **Dependency inversion (принцип инверсии зависимостей, буква D в SOLID)** — модули верхнего уровня (компоненты) зависят от абстракций, а не от конкретных реализаций (NgRx).
- **DI-токен (DI token)** — ключ, по которому Angular находит зависимость; абстрактный класс может быть токеном, а реализация подставляется через \`useClass\`.
- **Smart / presentational компоненты** — «умный» компонент знает, откуда брать данные; «презентационный» только получает \`input\` и отдаёт \`output\`.
- **Команда (command method)** — метод фасада, выражающий намерение пользователя: \`pay(id)\`, \`openOrder(id)\`.
- **God object (божественный объект)** — класс, который знает и делает слишком много; анти-паттерн.
- **Pass-through facade (фасад-прокси)** — фасад, где каждый метод просто пробрасывает вызов дальше без какой-либо собственной ценности.
- **\`selectSignal\`** — метод NgRx Store: превращает селектор в сигнал Angular.
- **\`provideMockStore\`** — тестовый store NgRx, где результаты селекторов подменяются вручную.
- **SignalStore** — store из \`@ngrx/signals\`, который сам по себе выставляет сигналы и методы.

## Как это работает под капотом

Фасад — не библиотека и не магия, а договорённость об архитектуре. Работает она так:

1. Для каждого домена заводится один фасад: \`OrdersFacade\`, \`UsersFacade\`. Граница фасада совпадает с границей домена.
2. Наружу фасад выставляет **два вида вещей**: данные для чтения (сигналы или Observable) и методы-команды с понятными именами.
3. Внутри фасад делает \`store.selectSignal(...)\` и \`store.dispatch(...)\` (или \`patchState\`, или \`subject.next\`). Это **единственное место** домена, которое знает про выбранную библиотеку.
4. Компоненты инжектят фасад и больше нигде не импортируют селекторы, actions и \`Store\`. Поэтому изменение внутренностей домена не расходится волной по компонентам.
5. Если фасад объявлен как **абстрактный класс-токен**, реализацию можно подставить через DI: NgRx в продакшене, сигнальная — в новом модуле, фейк — в тестах.
6. В тесте компонента подменяется **один** провайдер — фасад, а не половина store.
7. Захотели переехать с NgRx на сигналы — переписываете внутренности фасада. Компоненты не трогаете, **пока публичный контракт не протекает** типами NgRx.

Важно понимать, чего фасад **не** делает: он не уменьшает сложность системы, он её **перемещает и концентрирует**. Неоптимальный селектор или лишняя подписка внутри фасада никуда не исчезают — их просто перестают видеть компоненты.

### Пример 1. Компонент без фасада

\`\`\`ts
@Component({ /* ... */ })
export class OrdersPageComponent {
  private store = inject(Store);
  readonly orders = this.store.selectSignal(ordersFeature.selectOrders);
  readonly unpaidCount = this.store.selectSignal(ordersFeature.selectUnpaidCount);

  ngOnInit() { this.store.dispatch(OrdersPageActions.opened()); }
  pay(id: number) { this.store.dispatch(OrdersPageActions.orderPaid({ id })); }
}
\`\`\`

Компонент знает про \`Store\`, \`ordersFeature\`, \`OrdersPageActions\` и их форму. Таких компонентов в домене может быть десять — и все десять придётся менять при любом рефакторинге state.

### Пример 2. Фасад над NgRx

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class OrdersFacade {
  private store = inject(Store);

  // чтение: сигналы, созданные один раз
  readonly orders = this.store.selectSignal(ordersFeature.selectOrders);
  readonly unpaidCount = this.store.selectSignal(ordersFeature.selectUnpaidCount);

  // команды: имена намерений, а не actions
  open() { this.store.dispatch(OrdersPageActions.opened()); }
  pay(id: number) { this.store.dispatch(OrdersPageActions.orderPaid({ id })); }
}

// компонент
readonly facade = inject(OrdersFacade);
this.facade.open();
console.log(this.facade.unpaidCount());   // 1
this.facade.pay(1);
console.log(this.facade.unpaidCount());   // 0
\`\`\`

Это вывод реального запуска с NgRx. Компонент теперь читает \`facade.orders()\` и вызывает \`facade.pay(id)\` — словарь предметной области вместо словаря библиотеки.

### Фасад как абстракция: подмена реализации через DI

Чтобы инверсия зависимостей была настоящей, контракт выносят в абстрактный класс, а реализации подставляют провайдером:

\`\`\`ts
export abstract class OrdersFacade {
  abstract readonly orders: Signal<Order[]>;
  abstract readonly unpaidCount: Signal<number>;
  abstract open(): void;
  abstract pay(id: number): void;
}

@Injectable()
export class NgrxOrdersFacade implements OrdersFacade { /* selectSignal + dispatch, как выше */ }

@Injectable()
export class SignalOrdersFacade implements OrdersFacade {
  private readonly _orders = signal<Order[]>([]);
  readonly orders = this._orders.asReadonly();
  readonly unpaidCount = computed(() => this._orders().filter(o => o.status === 'new').length);
  open() { this._orders.set([{ id: 1, status: 'new' }, { id: 2, status: 'paid' }]); }
  pay(id: number) { this._orders.update(list => list.map(o => (o.id === id ? { ...o, status: 'paid' } : o))); }
}

// providers: [{ provide: OrdersFacade, useClass: NgrxOrdersFacade }]   или SignalOrdersFacade
// Один и тот же компонент, обе реализации (проверено запуском):
// facade.open();  facade.unpaidCount() → 1
// facade.pay(1);  facade.unpaidCount() → 0
\`\`\`

Абстрактный класс в TypeScript — одновременно и тип, и DI-токен (в отличие от интерфейса, который исчезает после компиляции). Компонент инжектит \`OrdersFacade\` и не знает, какая реализация пришла.

### Тест компонента через фейковый фасад

\`\`\`ts
const fakeFacade: OrdersFacade = {
  orders: signal([{ id: 7, status: 'new' }]),
  unpaidCount: signal(1),
  open: vi.fn(),   // vi.fn() — функция-шпион из Vitest: запоминает свои вызовы
  pay: vi.fn(),
};

TestBed.configureTestingModule({
  imports: [OrdersPageComponent],
  providers: [{ provide: OrdersFacade, useValue: fakeFacade }],
});
// проверяем: при клике «Оплатить» вызван fakeFacade.pay(7), счётчик в шаблоне показывает 1
\`\`\`

Один провайдер вместо \`provideMockStore\` с перечнем селекторов и проверок \`dispatch\` с конкретными actions. Сам фасад при этом тестируется отдельно — уже с \`MockStore\` или реальным store.

### Фасад, который действительно что-то инкапсулирует

Ценность фасада видна, когда за одним методом стоит больше одного \`dispatch\`:

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class OrdersFacade {
  private store = inject(Store);

  // модель для экрана, собранная из нескольких срезов
  readonly vm = this.store.selectSignal(selectOrdersPageVm);
  private readonly details = this.store.selectSignal(selectOrderDetailsEntities);

  // оркестрация: выбрать заказ и догрузить, только если его ещё нет в кэше
  openOrder(id: number) {
    this.store.dispatch(OrdersPageActions.orderSelected({ id }));
    if (!this.details()[id]) {
      this.store.dispatch(OrdersPageActions.orderDetailsRequested({ id }));
    }
  }
}
\`\`\`

Сценарий «выбрать и при необходимости загрузить» описан один раз, а не повторён в трёх компонентах. Здесь фасад не прокси, а носитель правила.

### SignalStore как фасад

\`\`\`ts
export const OrdersStore = signalStore(
  { providedIn: 'root' },
  withState({ orders: [] as Order[] }),
  withComputed(({ orders }) => ({
    unpaidCount: computed(() => orders().filter(o => o.status === 'new').length),
  })),
  withMethods(store => ({
    pay(id: number) {
      patchState(store, s => ({ orders: s.orders.map(o => (o.id === id ? { ...o, status: 'paid' as const } : o)) }));
    },
  }))
);
\`\`\`

SignalStore уже выглядит как фасад: наружу — сигналы и методы, состояние по умолчанию защищено от изменения снаружи. Отдельный фасад поверх него обычно лишний слой; он оправдан, только если фасад объединяет несколько store или скрывает переход между технологиями.

### Фасад или smart-компонент

Smart-компонент тоже скрывает store от презентационных детей, но он **привязан к одному экрану**. Фасад — сервис, который **переиспользуют** несколько компонентов, guards, резолверы. Обычно они работают вместе: smart-компонент инжектит фасад и раздаёт данные презентационным компонентам через \`input\`.

### Где это применяется на практике

- **Крупные enterprise-приложения на NgRx** с десятками компонентов на домен: заказы, клиенты, отчёты — по фасаду на каждый.
- **Постепенная миграция** с классического NgRx на SignalStore или сигналы: компоненты переводят на фасад, потом меняют реализацию за ним по одному домену.
- **Монорепозитории (Nx) с библиотеками-доменами**: наружу из библиотеки экспортируется только фасад, а actions и селекторы остаются приватными.
- **Микрофронтенды и общие модули**, где потребителям нужен стабильный контракт, а не доступ к внутреннему state.
- **Тестирование больших экранов**: фейковый фасад на сигналах позволяет проверять компоненты без store.

## Важные нюансы и подводные камни

- **God object.** Фасад на 40 методов — признак, что домен пора делить на поддомены, а не что фасады плохие.
- **Один фасад на несколько доменов** снова связывает то, что вы разделяли: \`OrdersFacade\`, который лезет в биллинг, — уже не фасад, а мост. Межфичевую координацию лучше вынести в отдельный сервис-оркестратор или эффект.
- **Фасад-прокси.** Если каждый метод — ровно один \`dispatch\`, а каждое поле — один селектор, спросите себя, что слой инкапсулирует. Иногда ответ «контракт для миграции» — и это нормально; иногда — ничего.
- **Маскировка неэффективности.** Снаружи не видно, что внутри: подписка без \`distinctUntilChanged\`, селектор без мемоизации или геттер, создающий новый сигнал на каждое обращение. Последнее проверено запуском:

\`\`\`ts
get orders() { return this.store.selectSignal(selectOrders); }   // ❌
// facade.orders === facade.orders → false: каждый вызов из шаблона создаёт новый computed
readonly orders = this.store.selectSignal(selectOrders);          // ✅
// facade.orders === facade.orders → true
\`\`\`

- **То же с параметрами:** метод \`orderById(id)\`, который при каждом вызове создаёт новый селектор, убивает мемоизацию. Создавайте селектор один раз и кэшируйте.
- **Утечка типов NgRx наружу.** Если фасад возвращает \`Action\`, \`MemoizedSelector\`, \`Observable<Action>\` или внутренние типы state, миграция «без правки компонентов» перестаёт быть возможной. Контракт — только доменные типы.
- **Ручные подписки внутри root-фасада** (\`subscribe\` без отписки) живут всё время работы приложения. Отдавайте наружу сигналы или Observable и не подписывайтесь внутри без необходимости.
- **Сокрытие сложности не равно её устранению.** Фасад делает API проще, но код внутри всё равно должен быть хорошим: селекторы мемоизированы, гонки решены в эффектах.
- **Для простого стейта фасад — лишний слой.** Сервис с парой сигналов уже сам себе фасад.

**Плюсы:** компоненты не зависят от библиотеки state, один провайдер для подмены в тестах, словарь предметной области вместо \`dispatch(...)\`, возможность миграции по доменам, место для оркестрации и общих правил.
**Минусы:** ещё один слой и файл на домен, риск god object и фасада-прокси, сокрытие неэффективности от ревьюеров, трассировка «кто отправил action» удлиняется на один переход.

## Как это спрашивают на собеседовании

**Главный вывод:** фасад — это инжектируемый сервис на домен, который прячет селекторы и \`dispatch\` за простым контрактом «сигналы для чтения + методы-команды». Он даёт инкапсуляцию, тестируемость и возможность миграции, но опасен как god object, как бесполезный прокси и как ширма для неэффективного кода.

Типичные формулировки: «Что такое Facade в Angular?», «Зачем прятать NgRx за сервисом?», «Какие риски у фасадов?», «Нужен ли фасад с SignalStore?».

Что могут спросить следом:

- *Чем фасад отличается от smart-компонента?* — Фасад — сервис, переиспользуемый многими компонентами; smart-компонент привязан к одному экрану и обычно сам использует фасад.
- *Нужен ли фасад при SignalStore?* — Часто нет: SignalStore уже выставляет сигналы и методы и защищает state; фасад оправдан, если объединяет несколько store или прикрывает миграцию.
- *Как обеспечить подмену реализации?* — Абстрактный класс как DI-токен и \`{ provide: OrdersFacade, useClass: ... }\`.
- *Как тестировать сам фасад?* — С \`provideMockStore\` или реальным store: проверить, что команды отправляют нужные actions, а поля отдают нужные данные.
- *Что возвращать наружу — сигналы или Observable?* — В современном Angular — сигналы для данных шаблона, Observable — где нужна работа со временем.

### Ответ на 1 минуту

> Фасад — это инжектируемый сервис на домен, который прячет детали стейт-менеджмента — селекторы, dispatch, сигналы, сабджекты — за простым контрактом: сигналы для чтения и методы-команды вроде pay или openOrder. Компоненты зависят от фасада, а не от Store, и это инверсия зависимостей: если сделать фасад абстрактным классом, реализацию можно подменить через DI. Плюсы конкретные: компоненты не знают про NgRx, поэтому домен можно перевести на сигналы или SignalStore, не трогая их; в тесте подменяется один провайдер; и есть место для оркестрации, когда одна команда — это несколько actions. Риски тоже конкретные: фасад легко превращается в god object на сорок методов, бывает бесполезным прокси, и он прячет неэффективность — например, геттер, создающий новый сигнал на каждое чтение. И если фасад отдаёт наружу типы NgRx, миграция без правки компонентов не получится. Моё правило: один фасад на домен в крупном приложении, а с SignalStore он часто не нужен.`,
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
      ru: `## В чём суть

SOLID — это пять правил про то, **как резать код на куски, чтобы завтрашнее изменение не заставляло переписывать полприложения**. В Angular они ложатся почти буквально, потому что во фреймворк уже встроен DI-контейнер: зависимость от абстракции, подмена реализации и расширение через токены здесь — повседневный инструмент, а не теория из книжки.

Аналогия: кухонный гарнитур из модулей. У каждого ящика одно назначение (S), новый ящик добавляется без распиливания старых (O), любой ящик подходит в любую нишу того же размера (L), розетка не заставляет вас покупать всю плиту ради одного разъёма (I), а техника подключается к стандартной розетке, а не припаивается к проводке (D).

**Какую проблему решает.** Без этих правил код быстро превращается в клубок: компонент на 600 строк сам ходит в HTTP, маппит DTO, считает скидки и рисует таблицу. Поменялся формат ответа бэкенда — правите компонент; поменялась скидка — снова компонент; надо написать тест — мокаете всё сразу. SOLID разводит причины изменений по разным местам, и правка остаётся локальной: дизайнер трогает шаблон, бэкенд — маппер, бизнес — правила, и никто не задевает чужое.

## Словарик терминов

- **SOLID** — аббревиатура из пяти принципов: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
- **Ответственность (responsibility)** — причина для изменения кода. Не «одна функция», а «один источник требований».
- **Абстракция** — описание того, *что* умеет зависимость, без того, *как* она это делает: \`abstract class\`, интерфейс, токен.
- **DI (dependency injection, внедрение зависимостей)** — класс не создаёт зависимости сам, а получает их от контейнера: \`inject(PaymentGateway)\`.
- **Провайдер (provider)** — запись для DI «по такому ключу отдавать такой объект»: \`{ provide: X, useClass: Y }\`.
- **\`InjectionToken\`** — ключ для DI, когда нет подходящего класса: для интерфейсов, конфигов, функций.
- **\`useClass\` / \`useExisting\` / \`useValue\` / \`useFactory\`** — способы описать, что отдавать: новый экземпляр класса, алиас на уже существующий провайдер, готовое значение, результат функции.
- **\`multi: true\`** — мульти-провайдер: несколько провайдеров на один токен складываются в массив.
- **Интерсептор (\`HttpInterceptorFn\`)** — функция, которая перехватывает каждый HTTP-запрос и может его изменить или обработать ответ.
- **Стратегия (strategy)** — паттерн, при котором поведение выбирается подстановкой одной из взаимозаменяемых реализаций.
- **Фейк / мок (fake, mock)** — подставная реализация зависимости для тестов.

## Как это работает под капотом

Почему SOLID в Angular «встроен», по шагам:

1. Компонент объявляет, **что** ему нужно: \`inject(PaymentGateway)\`. Ключ — абстрактный класс или токен, а не конкретная реализация.
2. Провайдеры (в \`bootstrapApplication\`, на маршруте или в тесте) решают, **что именно** отдать по этому ключу: \`useClass: StripeGateway\` в проде, \`useClass: FakeGateway\` в тесте.
3. DI-инжектор при создании компонента находит провайдер по ключу и подставляет объект. Компонент ни разу не пишет \`new StripeGateway()\`, поэтому не знает о нём — это и есть Dependency Inversion.
4. Раз зависимость подставляется снаружи, её можно заменить, не трогая компонент. Отсюда тестируемость и смена реализации конфигурацией.
5. Мульти-провайдеры и цепочки интерсепторов позволяют **добавлять** поведение новыми провайдерами, не редактируя существующий код, — это Open/Closed.
6. Но DI не проверяет поведение: если подставленная реализация нарушает контракт (синхронная вместо асинхронной, бросает там, где оригинал не бросал), всё скомпилируется и сломается в рантайме. За Liskov отвечаете вы.

### S — Single Responsibility: одна причина для изменения

\`\`\`ts
// ❌ Компонент отвечает за всё
export class OrdersPage {
  private http = inject(HttpClient);
  orders = signal<Order[]>([]);
  ngOnInit() {
    this.http.get<OrderDto[]>('/api/orders').subscribe(dtos =>
      this.orders.set(dtos.map(d => ({ id: d.order_id, total: d.amount_cents / 100 * (d.vip ? 0.9 : 1) }))));
  }
}

// ✅ Каждая причина изменения в своём месте
@Injectable({ providedIn: 'root' })
export class OrdersApi {                                                     // бэкенд поменял URL
  private readonly http = inject(HttpClient);
  list() { return this.http.get<OrderDto[]>('/api/orders'); }
}
export const toOrder = (d: OrderDto): Order => ({ id: d.order_id, total: applyVipDiscount(d) }); // поменялся формат DTO
export const applyVipDiscount = (d: OrderDto) => d.amount_cents / 100 * (d.vip ? 0.9 : 1);    // поменялась скидка
// компонент только показывает: шаблон меняется, когда меняется дизайн
\`\`\`

Симптом нарушения — компонент на 600 строк с \`HttpClient\` внутри. Критерий не «одна функция на класс», а «один источник требований»: дизайнер, бэкенд и бизнес меняют разные файлы.

### O — Open/Closed: расширять, не редактируя

Канонический пример в Angular — интерсепторы. Новое поведение добавляется новой функцией, \`HttpClient\` никто не трогает:

\`\`\`ts
const authInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ setHeaders: { Authorization: \`Bearer \${inject(AuthStore).token()}\` } }));

const correlationInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ setHeaders: { 'X-Correlation-Id': 'req-42' } }));

provideHttpClient(withInterceptors([authInterceptor, correlationInterceptor]));
// запрос GET /api/orders уходит с заголовками:
// Authorization: Bearer abc123 | X-Correlation-Id: req-42
\`\`\`

Вывод проверен через \`HttpTestingController\`. Классический вариант — класс с \`HttpInterceptor\` и мульти-провайдер \`HTTP_INTERCEPTORS\` — тоже работает (с \`provideHttpClient\` его подключают через \`withInterceptorsFromDi()\`), но функциональные интерсепторы проще и порядок их выполнения виден в одном массиве.

### Мульти-провайдеры: свой «плагинный» OCP

\`\`\`ts
interface Exporter { format: string; run(rows: unknown[]): string }
export const EXPORTERS = new InjectionToken<Exporter[]>('EXPORTERS');

providers: [
  { provide: EXPORTERS, multi: true, useValue: { format: 'csv',  run: rows => rows.join(';') } },
  { provide: EXPORTERS, multi: true, useValue: { format: 'json', run: rows => JSON.stringify(rows) } },
]

// ExportService
const exporters = inject(EXPORTERS);
exporters.map(e => e.format);                                // [ 'csv', 'json' ]
exporters.find(e => e.format === 'csv')!.run([1, 2, 3]);     // 1;2;3
exporters.find(e => e.format === 'json')!.run([1, 2, 3]);    // [1,2,3]
\`\`\`

Нужен экспорт в Excel — добавляете ещё один провайдер. \`ExportService\` не меняется. Это и отличает OCP от простого наследования: расширение без модификации, а не переопределение методов родителя.

### L — Liskov Substitution: замена не должна менять поведение

Любая реализация абстракции должна быть взаимозаменяема с другой. Самый коварный случай — фейк в тестах, который нарушает контракт «данные приходят асинхронно»:

\`\`\`ts
function showGreeting(auth: { currentUser$(): Observable<{ name: string }> }) {
  let user: { name: string } | undefined;
  auth.currentUser$().subscribe(u => (user = u));
  return \`Привет, \${user!.name}\`;      // предполагаем, что значение уже есть
}

const fakeAuth = { currentUser$: () => of({ name: 'Анна' }) };                          // синхронный фейк
const realAuth = { currentUser$: () => timer(50).pipe(map(() => ({ name: 'Анна' }))) }; // как настоящий HTTP

showGreeting(fakeAuth); // "Привет, Анна"   ← тест зелёный
showGreeting(realAuth); // TypeError: Cannot read properties of undefined (reading 'name')  ← прод падает
\`\`\`

\`of()\` выдаёт значение синхронно, HTTP — нет. Фейк нарушил контракт, и тест солгал. Хороший фейк для асинхронного API тоже асинхронный (например, \`of(x).pipe(delay(0))\`) или тест явно ждёт результата.

### I — Interface Segregation: не тянуть лишнего

\`\`\`ts
export interface Logger { log(message: string): void }
export const LOGGER = new InjectionToken<Logger>('Logger');

// компоненту нужен только log — он не зависит от AnalyticsService с двадцатью методами
private readonly logger = inject(LOGGER);

// в конфиге приложения
{ provide: LOGGER, useExisting: AnalyticsService }
\`\`\`

Потребитель зависит от узкого контракта, поэтому в тесте подменяется одной функцией, а изменения в огромном сервисе его не задевают. Тот же принцип работает для входов компонента: если карточке нужно только имя, передавайте \`name\`, а не весь \`User\` с тридцатью полями.

### \`InjectionToken\` и почему интерфейс не может быть токеном

\`\`\`ts
interface Logger { log(msg: string): void }
inject(Logger);
// error TS2693: 'Logger' only refers to a type, but is being used as a value here.
\`\`\`

Интерфейсы TypeScript стираются при компиляции — в рантайме их просто нет, и DI не по чему искать. Ключом может быть класс (в том числе \`abstract class\`) или \`InjectionToken\`.

### D — Dependency Inversion: зависеть от абстракции

\`\`\`ts
export abstract class PaymentGateway {
  abstract charge(sum: number): Observable<Receipt>;
}

// прод
providers: [{ provide: PaymentGateway, useClass: StripeGateway }]
// тест
providers: [{ provide: PaymentGateway, useClass: FakeGateway }]

// компонент
private readonly payments = inject(PaymentGateway);
// в проде payments — экземпляр StripeGateway, в тесте — FakeGateway; код компонента один и тот же
\`\`\`

Компонент не знает слова «Stripe». Замена платёжного провайдера — правка одной строки в провайдерах, а тест не ходит в сеть вообще. \`abstract class\` удобнее \`InjectionToken\` тем, что он одновременно и тип, и ключ DI.

### \`useClass\` против \`useExisting\`

\`\`\`ts
providers: [
  AnalyticsService,
  { provide: LegacyAnalytics, useClass: AnalyticsService },    // ❌ второй, независимый экземпляр
]
inject(AnalyticsService) === inject(LegacyAnalytics); // false

providers: [
  AnalyticsService,
  { provide: LegacyAnalytics, useExisting: AnalyticsService }, // ✅ алиас на тот же экземпляр
]
inject(AnalyticsService) === inject(LegacyAnalytics); // true
\`\`\`

С \`useClass\` вы получите две копии сервиса и два разных состояния: одна часть приложения пишет в один счётчик, другая читает из второго.

### Где это применяется на практике

- **HTTP-слой**: авторизация, ретраи, логирование, глобальный спиннер — отдельные интерсепторы (O), API-сервисы отдельно от компонентов (S).
- **Платёжные и интеграционные шлюзы**: абстрактный \`PaymentGateway\`, разные реализации для стран и тестов (D, L).
- **Экспорт и печать в больших гридах**: мульти-провайдеры форматов CSV/Excel/PDF, новые форматы добавляются без правки грида (O).
- **Логирование и аналитика**: узкий токен \`LOGGER\` вместо зависимости от тяжёлого SDK (I).
- **White-label и мультитенантность**: разные реализации сервисов для разных клиентов подставляются конфигурацией.
- **Тесты**: фейки через провайдеры, при условии что они соблюдают контракт оригинала (L).

## Важные нюансы и подводные камни

- **Абстракция ради абстракции.** Интерфейс с единственной реализацией, которая никогда не поменяется, — это не DIP, а лишний файл и лишние прыжки по коду.
- **SRP как «одна функция на класс».** Ответственность — это причина для изменения, а не количество строк или методов.
- **Нарушение LSP в моках** — самый коварный случай: фейк возвращает данные синхронно, тест зелёный, прод падает на асинхронности.
- **\`useClass\` вместо \`useExisting\`** там, где нужен один и тот же экземпляр: две копии сервиса и разное состояние.
- **Интерфейс TypeScript нельзя использовать как DI-токен** — он стирается при компиляции. Нужен \`InjectionToken\` или \`abstract class\`.
- **OCP — не наследование.** Наследование с переопределением методов как раз модифицирует поведение родителя и хрупко; OCP в Angular — это новые провайдеры, стратегии и интерсепторы.
- **Порядок интерсепторов важен.** Они выполняются в порядке массива на запрос и в обратном на ответ; новый интерсептор может «расширить» систему так, что сломает соседний.
- **Будьте готовы привести нарушение каждого принципа из своего проекта** — это любимый follow-up.

**Плюсы:** изменения локальны; код легко тестировать через подмену провайдеров; новое поведение добавляется без правки старого; реализации меняются конфигурацией.
**Минусы:** избыток абстракций делает код трудным для навигации; DI проверяет типы, но не поведение, поэтому LSP держится только на дисциплине и тестах; для тривиального кода всё это лишняя церемония.

## Как это спрашивают на собеседовании

**Главный вывод:** в Angular SOLID опирается на DI: компоненты зависят от абстракций (\`abstract class\`, \`InjectionToken\`), реализации подставляются провайдерами, поведение расширяется новыми провайдерами и интерсепторами. Цель — локальные изменения и тестируемость, а не максимум интерфейсов.

Типичные формулировки: «Как SOLID применяется в Angular?», «Приведите пример Dependency Inversion в Angular», «Что такое Open/Closed на практике?».

Что могут спросить следом:

- *Чем OCP отличается от наследования?* — Расширение без модификации: новый провайдер или интерсептор вместо переопределения методов родителя.
- *Почему интерфейс нельзя использовать как токен?* — Он стирается при компиляции; нужен \`InjectionToken\` или \`abstract class\`.
- *Как нарушение LSP проявляется в тестах?* — Синхронный фейк для асинхронного API: тест зелёный, прод падает.
- *Когда SOLID вредит?* — Когда абстракции вводятся для кода, у которого одна реализация и нет причин меняться.

### Ответ на 1 минуту

> В Angular SOLID ложится почти буквально, потому что DI встроен во фреймворк. S: компонент отвечает только за представление, HTTP, маппинг и бизнес-правила живут в сервисах и чистых функциях; симптом нарушения — компонент на 600 строк с \`HttpClient\`. O: расширяю через DI — функциональные интерсепторы в \`withInterceptors\` или мульти-провайдеры добавляют поведение, не трогая \`HttpClient\` и существующие сервисы. L: любая реализация абстракции взаимозаменяема; классика нарушения — синхронный фейк для асинхронного API, тест зелёный, прод падает. I: потребитель зависит от узкого \`InjectionToken\`, а не от сервиса с двадцатью методами. D — главное: зависим от \`abstract class\` или токена, конкретику подставляют провайдеры, отсюда фейки в тестах и смена реализации одной строкой. Нюансы: интерфейс не может быть токеном, \`useExisting\` вместо \`useClass\`, если нужен тот же экземпляр, и никакой абстракции ради абстракции.`,
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
      ru: `## В чём суть

Папки группируют **по фиче (домену), а не по типу файла**. Не \`components/\`, \`services/\`, \`pipes/\` на всё приложение, а \`orders/\`, \`billing/\`, \`reports/\`, и уже внутри каждой фичи лежат её компоненты, сервисы и модели. Рядом живут две служебные зоны: \`core/\` для синглтонов приложения и \`shared/\` для того, что реально переиспользуется между доменами.

Аналогия: картотека. Можно разложить документы по типу бумаги — «все договоры в одном ящике, все счета в другом». Тогда, чтобы собрать одно дело, вы бегаете по всем ящикам. А можно по делу: одно дело — один ящик, всё под рукой, и передать дело коллеге можно целиком. Второй вариант и есть feature-first.

**Какую проблему решает.** В маленьком приложении структура «по типам» выглядит аккуратно. Но когда компонентов становится двести, папка \`components/\` превращается в свалку, где всё связано со всем: чтобы поправить фичу «Заказы», вы открываете файлы в пяти разных директориях, а удалить устаревшую фичу невозможно — непонятно, какие из 40 сервисов ей принадлежат. Feature-first делает границы видимыми: фича — это папка, у неё есть публичный API, свой lazy-чанк и, часто, своя команда-владелец.

## Словарик терминов

- **Feature-first (по фичам) и type-first (по типам)** — два способа разложить файлы: по бизнес-доменам или по видам кода (компоненты, сервисы, пайпы).
- **Фича / домен (feature, domain)** — законченная бизнес-область приложения: заказы, биллинг, отчёты.
- **\`core/\`** — синглтоны уровня приложения: аутентификация, интерсепторы, конфигурация, глобальный обработчик ошибок. Подключаются один раз.
- **\`shared/\`** — то, что переиспользуется **несколькими** доменами: UI-кит, утилиты, общие модели.
- **Слои фичи: \`data-access\`, \`feature\`, \`ui\`, \`util\`** — сервисы и стейт; умные компоненты и маршруты; презентационные компоненты; чистые функции.
- **Barrel-файл (\`index.ts\`)** — файл, который реэкспортирует публичную часть папки. Всё, что не экспортировано, считается внутренностями.
- **Публичный API фичи** — набор того, что другим частям приложения разрешено импортировать из фичи.
- **Lazy loading (ленивая загрузка)** — код фичи загружается отдельным файлом (чанком) только когда пользователь переходит на её маршрут.
- **Чанк (chunk)** — отдельный JS-файл, на которые сборщик режет приложение.
- **Циклический импорт** — A импортирует B, а B импортирует A (напрямую или через цепочку).
- **Path alias** — короткий путь вроде \`@app/features/orders\` вместо \`../../../features/orders\`, настраивается в \`tsconfig.json\` → \`paths\`.
- **Feature-Sliced Design (FSD)** — популярная методология структуры фронтенда со строгими слоями \`app\` → \`pages\` → \`widgets\` → \`features\` → \`entities\` → \`shared\`.

## Как это работает под капотом

Как строится структура, по шагам:

1. **Верхний уровень режем по доменам**, а не по типам файлов. Вопрос «где лежит код заказов?» должен иметь ответ из одного слова.
2. Оставляем ровно три зоны: \`core/\` (синглтоны: auth, интерсепторы, конфиг — подключается один раз), \`shared/\` (переиспользуемое между доменами) и \`features/\` (сами домены).
3. **Внутри каждой фичи — слои**: \`data-access/\` (сервисы, стор, модели), \`feature/\` (умные компоненты и маршруты), \`ui/\` (презентационные), \`util/\` (чистые функции). Направление зависимостей — сверху вниз: \`feature\` → \`ui\`/\`data-access\`/\`util\`.
4. **Публичный API фичи задаём barrel-файлом \`index.ts\`**: наружу торчит только то, что экспортировано, остальное — внутренности, которые можно свободно рефакторить.
5. **Домены не импортируют друг друга напрямую**: \`orders\` не тянет внутренности \`billing\`, общее уходит в \`shared\`.
6. **Ленивая загрузка по фичам**: каждый домен — свой route-чанк, поэтому граница папки совпадает с границей бандла. Сборщик сам режет код по \`import()\` в маршрутах.
7. Правила закрепляются линтером: без автоматической проверки границы размываются за пару месяцев.

### Пример 1. Дерево папок

\`\`\`text
src/app/
  core/                       # синглтоны: auth, interceptors, config, error handler
    auth/
    http/
  shared/
    ui/                       # переиспользуемые презентационные компоненты
    util/                     # чистые функции: форматирование, даты
  features/
    orders/
      data-access/            # сервисы, стор, модели
      feature/                # умные компоненты + маршруты
      ui/                     # презентационные компоненты заказов
      util/
      orders.routes.ts
      index.ts                # публичный API фичи
    billing/
      ...
  app.config.ts
  app.routes.ts
\`\`\`

Почему так: границы папок совпадают с границами lazy-чанков и с зонами ответственности команд. Удалить фичу целиком = удалить одну папку и одну строку в \`app.routes.ts\` — это лучший тест на правильность структуры.

### Пример 2. Ленивая загрузка по фичам

\`\`\`ts
// app.routes.ts
export const routes: Routes = [
  { path: 'orders',  loadChildren: () => import('./features/orders/orders.routes').then(m => m.ORDERS_ROUTES) },
  { path: 'billing', loadChildren: () => import('./features/billing/billing.routes').then(m => m.BILLING_ROUTES) },
];
\`\`\`

\`\`\`text
Lazy chunk files    | Names          |  Raw size
chunk-IUXHFIIZ.js   | orders-routes  |   1.37 kB
chunk-RU5TBPYU.js   | billing-page   |   1.28 kB
chunk-3EGHC5BS.js   | billing-routes | 265 bytes
\`\`\`

Это реальный вывод \`ng build\` (Angular 21) для такого конфига. Каждая фича едет отдельным файлом и загружается только при переходе на её маршрут. \`loadChildren\` грузит набор маршрутов фичи, \`loadComponent\` — один компонент.

### Пример 3. Как один «невинный» импорт ломает границу чанка

Добавим в \`main.ts\` статический импорт \`OrdersPage\` из папки заказов и пересоберём:

\`\`\`text
Initial chunk files | Names          |  Raw size
chunk-QUES3G6H.js   | -              |   1.24 kB   ← код заказов переехал в стартовую загрузку
...
Lazy chunk files    | Names          |  Raw size
chunk-QTCAJVPX.js   | orders-routes  | 287 bytes   ← было 1.37 kB
\`\`\`

Сборщик не может оставить код ленивым, если его кто-то импортирует статически. Поэтому правило «домены не импортируют друг друга напрямую» — это не только про чистоту, но и про размер стартового бандла.

### Barrel \`index.ts\`: публичный API фичи

\`\`\`ts
// features/orders/index.ts
export { ORDERS_ROUTES } from './orders.routes';
export { OrdersFacade } from './data-access/orders.facade';
export type { Order } from './data-access/order.model';
// order-mapper.ts, внутренние компоненты и хелперы НЕ экспортируются
\`\`\`

Всё, что не попало в barrel, можно переименовывать и переписывать, не боясь сломать другие фичи. Внутри самой фичи импортируйте соседние файлы напрямую, а не через свой же \`index.ts\` — иначе легко получить циклический импорт.

### \`core/\`: синглтоны в standalone-мире

\`\`\`ts
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
\`\`\`

В эпоху NgModule был \`CoreModule\`, который импортировали только в \`AppModule\`; если его случайно импортировали ещё и в ленивый модуль, у ленивого модуля появлялся свой инжектор и **вторые экземпляры синглтонов**. Защищались проверкой в конструкторе с \`@Optional() @SkipSelf()\`. В standalone-приложениях глобальные провайдеры собраны в \`app.config.ts\`, а сервисы объявляются с \`providedIn: 'root'\` — проблема ушла, но её любят спрашивать.

### Провайдеры на уровне маршрута фичи

\`\`\`ts
export const ORDERS_ROUTES: Routes = [{
  path: '',
  providers: [OrdersStore],      // стор живёт в инжекторе фичи, а не в root
  children: [/* ... */],
}];
\`\`\`

Стор фичи не попадает в корневой инжектор и в стартовый бандл. Нюанс: инжектор маршрута создаётся при первом заходе и по умолчанию **не уничтожается** при уходе с маршрута — состояние сохранится до перезагрузки. Автоматическую очистку в Angular 21.1 включает экспериментальная \`withExperimentalAutoCleanupInjectors()\`.

### Как закрепить границы линтером без Nx

\`\`\`js
// eslint.config.mjs
rules: {
  'no-restricted-imports': ['error', {
    patterns: [{
      group: ['@app/features/*/*'],
      message: 'Импортируйте фичу только через её публичный API: @app/features/<имя>',
    }],
  }],
}
\`\`\`

\`\`\`text
billing-page.ts
  2:1  error  '@app/features/orders/data-access/order-mapper' import is restricted from being used by a pattern. Импортируйте фичу только через её публичный API: @app/features/<имя>  no-restricted-imports
\`\`\`

Импорт \`@app/features/orders\` проходит, глубокий импорт во внутренности — нет. Для более сложных правил («\`ui\` не импортирует \`data-access\`») используют плагины вроде \`eslint-plugin-boundaries\`, а в Nx-монорепо это делает \`@nx/enforce-module-boundaries\` на тегах.

### Где это применяется на практике

- **Enterprise-портал с десятком разделов**: каждый раздел — папка в \`features/\` со своим lazy-чанком и командой-владельцем.
- **Рост до монорепо**: когда фичу начинают использовать два приложения, папка с готовыми слоями переносится в Nx-библиотеку почти без правок.
- **Онбординг**: новый разработчик ищет код заказов в \`features/orders\`, а не в пяти папках по типам.
- **Удаление устаревшей функциональности**: фича под фиче-флагом после эксперимента удаляется одной папкой.
- **Код-ревью и CODEOWNERS**: владельцы назначаются на папку фичи, и ревью приходит нужной команде.

## Важные нюансы и подводные камни

- **\`shared\` как помойка.** Через полгода это самая большая папка проекта, и любая правка в ней задевает всех. Дробите на \`shared/ui\`, \`shared/util\`, \`shared/data-access\` и не бойтесь дублировать мелочь: две похожие функции в двух фичах дешевле, чем общая, которую боятся трогать.
- **Циклические импорты между фичами** — не техническая проблема, а сигнал, что границу домена провели не там.
- **Глубокие импорты мимо \`index.ts\`** (\`orders/feature/internal/helper\`) убивают весь смысл публичного API: внутренности становятся контрактом, и их уже нельзя менять.
- **Статический импорт из ленивой фичи** перетаскивает её код в стартовый бандл — граница чанка ломается молча.
- **\`core\`, импортированный дважды**, в NgModule-мире давал вторые экземпляры синглтонов; в standalone и с \`providedIn: 'root'\` проблема ушла, но её любят спрашивать.
- **Слишком ранняя нарезка.** На старте проекта из трёх экранов десять уровней папок — это трение без выгоды. Начинайте с \`features/<домен>\` и добавляйте слои, когда в фиче становится тесно.
- **Именование файлов.** Начиная с Angular 20 CLI по умолчанию генерирует файлы без суффикса типа (\`user-card.ts\` вместо \`user-card.component.ts\`), а официальный style guide советует организовывать проект по фичам и не заводить папки по типам кода.
- **Чем это отличается от Feature-Sliced Design.** FSD добавляет обязательные слои уровня приложения (\`pages\`, \`widgets\`, \`features\`, \`entities\`, \`shared\`) с правилом «импортировать только из слоёв ниже»; feature-first в Angular обычно проще: домены плюс слои внутри домена.
- **Когда фича «созрела» для отдельной библиотеки:** её импортируют минимум два потребителя и/или она релизится отдельно.

**Плюсы:** границы видны в структуре; фичу легко найти, передать команде и удалить; папки совпадают с lazy-чанками; путь к Nx-библиотекам почти бесплатный.
**Минусы:** нужно поддерживать дисциплину импортов (без линтера она размывается); есть соблазн превратить \`shared\` в свалку; избыточная нарезка на маленьком проекте только мешает.

## Как это спрашивают на собеседовании

**Главный вывод:** группирую по фичам, а не по типам: домены в \`features/\`, синглтоны в \`core/\`, переиспользуемое в \`shared/\`; у каждой фичи слои и публичный API через \`index.ts\`, домены не импортируют друг друга напрямую, а граница папки совпадает с lazy-чанком.

Типичные формулировки: «Как вы организуете структуру большого Angular-приложения?», «Что лежит в \`core\` и \`shared\`?», «Как не дать структуре развалиться через год?».

Что могут спросить следом:

- *Что делать, если \`shared\` разросся?* — Делить на \`shared/ui\`, \`shared/util\`, \`shared/data-access\`, а узкоспецифичное возвращать в фичи.
- *Как понять, что границы проведены неверно?* — Появились циклические импорты между фичами или постоянные глубокие импорты во внутренности.
- *Как закрепить правила?* — \`no-restricted-imports\` или \`eslint-plugin-boundaries\`, в Nx — \`@nx/enforce-module-boundaries\`.
- *Чем это отличается от Feature-Sliced Design?* — FSD вводит строгие слои уровня всего приложения; feature-first проще и ближе к Angular-маршрутам.
- *Когда выносить фичу в библиотеку?* — Когда у неё два и более потребителя или отдельный релизный цикл.

### Ответ на 1 минуту

> Группирую feature-first, а не type-first: папки \`components/\`, \`services/\`, \`pipes/\` на всё приложение не масштабируются, потому что там всё связано со всем. Верхний уровень — домены в \`features/\`, плюс \`core/\` для синглтонов вроде auth, интерсепторов и конфига и \`shared/\` для того, что реально нужно нескольким доменам. Внутри фичи слои: data-access, feature, ui, util. Публичный API фичи описывает barrel \`index.ts\`, внутренности наружу не торчат; домены не импортируют друг друга напрямую, только через \`shared\`; ленивая загрузка идёт по фичам, поэтому граница папки совпадает с границей чанка — и один статический импорт из чужой фичи молча тащит её в стартовый бандл. Сигналы проблем: циклические импорты между фичами и разросшийся \`shared\`. Правила закрепляю линтером — \`no-restricted-imports\`, а в Nx-монорепо это ложится один в один на библиотеки с тегами.`,
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
      ru: `## В чём суть

Feature flag — это **рантайм-выключатель для куска функциональности**. Код уже в проде, но пользователи его не видят, пока флаг не включат. Смысл в том, чтобы разделить **деплой** (код доехал до сервера) и **релиз** (фичу увидели люди) и управлять вторым без нового деплоя.

Аналогия: в новом здании этаж достроен, лифт до него ходит, но кнопка заклеена. Хотите — открыли для десяти сотрудников, посмотрели, потом для всех. Что-то пошло не так — заклеили обратно за секунду, без сноса здания (это и есть kill switch). Беда начинается, когда таких заклеенных кнопок в лифте тридцать, и никто не помнит, что за ними.

**Какую проблему решает.** Без флагов незаконченная фича живёт в долгоживущей ветке, которая неделями расходится с \`main\` и потом мучительно мёрджится. Релиз — это всегда «всё или ничего»: если новая форма оплаты сломалась у 2% пользователей, откатывать приходится весь деплой. Флаги дают trunk-based development (все вливают в \`main\` маленькими порциями), постепенную раскатку, A/B-тесты и мгновенное выключение проблемной фичи. Цена — архитектурные риски: ветвление кода, долг из забытых флагов и соблазн использовать клиентский флаг как защиту.

## Словарик терминов

- **Feature flag / feature toggle** — именованный переключатель (\`newCheckout: true/false\`), от которого зависит, какой код выполняется.
- **Деплой и релиз (deploy / release)** — доставка кода на сервер и момент, когда пользователи начинают им пользоваться. Флаги разводят их во времени.
- **Kill switch** — флаг, который позволяет мгновенно выключить фичу в проде без деплоя.
- **Постепенная раскатка (progressive rollout, canary)** — включение фичи сначала для 1% пользователей, потом 10%, потом всем, с наблюдением за ошибками и метриками.
- **A/B-тест** — показ двух вариантов разным группам пользователей, чтобы сравнить метрики.
- **Trunk-based development** — подход, при котором все вливают код в основную ветку часто и маленькими частями; незаконченное прячут за флагами.
- **Flag debt (долг флагов)** — забытые флаги, которые давно не нужны, но продолжают ветвить код.
- **Провайдер флагов** — сервис, где флаги хранятся и настраиваются: LaunchDarkly, Unleash, собственный конфиг; OpenFeature — стандартный вендор-нейтральный API поверх них.
- **Бакетинг (bucketing)** — стабильное распределение пользователей по «корзинам» 0–99 через хэш, чтобы процент раскатки был честным и пользователь не «прыгал» между вариантами.
- **\`provideAppInitializer\`** — функция Angular, которая выполняется при старте приложения и может задержать bootstrap до загрузки данных. Заменила устаревший с v19 токен \`APP_INITIALIZER\`.
- **\`canMatch\`** — guard маршрута, который решает, подходит ли маршрут вообще; если нет, роутер пробует следующий.
- **\`@defer\`** — блок шаблона Angular, содержимое которого загружается отдельным ленивым чанком.

## Как это работает под капотом

Механизм по шагам:

1. Заводим **сервис флагов** с источником: LaunchDarkly, Unleash или собственный JSON-конфиг. В коде есть **дефолты** для каждого флага — безопасные значения на случай, если провайдер недоступен.
2. Грузим значения на старте через \`provideAppInitializer\` — до первого рендера, поэтому пользователь не увидит «мигание» старого интерфейса. Загрузка ограничена таймаутом, иначе медленный провайдер задержит весь старт.
3. Отдаём флаг наружу как сигнал: шаблоны, \`computed\` и эффекты, которые его читают, автоматически обновятся при изменении флага.
4. Используем флаг в трёх местах: в шаблоне (\`@if\`, \`@defer\`, структурная директива), на маршруте (\`canMatch\`) и в сервисах (выбор стратегии).
5. Решаем, **где вычисляется флаг**: на клиенте — быстро, но флаг и код видны в бандле; на сервере или edge — безопаснее и обязательно для решений о правах доступа.
6. Раскатываем постепенно: 1% → 10% → 100%, с возможностью мгновенно выключить. Пользователи распределяются стабильным хэшем, поэтому один и тот же человек всегда видит один вариант.
7. **Удаляем флаг** сразу после полной раскатки — вместе со старой веткой кода. Это отдельный обязательный шаг, а не «когда-нибудь».

### Пример 1. Сервис флагов на сигналах

\`\`\`ts
export const DEFAULT_FLAGS = { newCheckout: false, exportToExcel: true } as const;
export type FlagName = keyof typeof DEFAULT_FLAGS;
type Flags = Record<FlagName, boolean>;

@Injectable({ providedIn: 'root' })
export class FeatureFlags {
  private readonly http = inject(HttpClient);
  private readonly state = signal<Flags>({ ...DEFAULT_FLAGS });

  isOn(name: FlagName): boolean {
    return this.state()[name];        // чтение сигнала: шаблон и computed подпишутся автоматически
  }

  set(name: FlagName, value: boolean) {
    this.state.update(f => ({ ...f, [name]: value }));
  }

  load(): Promise<void> {
    return firstValueFrom(
      this.http.get<Partial<Flags>>('/api/flags').pipe(
        timeout(1500),                // не держим старт приложения дольше 1,5 с
        catchError(() => of({})),     // провайдер недоступен → остаёмся на дефолтах
      ),
    ).then(remote => this.state.set({ ...DEFAULT_FLAGS, ...remote }));
  }
}
// до загрузки:             newCheckout=false, exportToExcel=true
// сервер ответил { newCheckout: true } → newCheckout=true,  exportToExcel=true
// сервер недоступен:       newCheckout=false, exportToExcel=true
\`\`\`

Значения проверены тестом с \`HttpTestingController\`. \`FlagName\` выводится из дефолтов, поэтому опечатка в имени флага — ошибка компиляции, а не тихий \`undefined\`.

### \`provideAppInitializer\`: загрузить флаги до первого рендера

\`\`\`ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideAppInitializer(() => inject(FeatureFlags).load()),
  ],
};
\`\`\`

Если функция возвращает Promise или Observable, Angular ждёт его перед стартом. Раньше то же самое писали через \`{ provide: APP_INITIALIZER, useFactory: ..., multi: true }\` — этот токен помечен устаревшим с Angular 19, но в существующих проектах встречается постоянно.

### Пример 2. Флаг в шаблоне через \`@if\`

\`\`\`html
@if (flags.isOn('newCheckout')) {
  <app-new-checkout />
} @else {
  <app-legacy-checkout />
}
\`\`\`

Обе ветки живут в одном бандле и обе компилируются — значит, старый код не «протухает» молча, а типы проверяются. Плата за это — размер бандла и то, что оба пути надо держать рабочими.

### \`@defer\`: не тащить новую ветку в стартовый бандл

\`\`\`html
@if (flags.isOn('newCheckout')) {
  @defer {
    <app-new-checkout />
  } @loading {
    <p>Загрузка…</p>
  }
} @else {
  <app-legacy-checkout />
}
\`\`\`

\`\`\`text
Lazy chunk files    | Names          |  Raw size
chunk-ZYVITKA3.js   | new-checkout   |   1.36 kB
\`\`\`

Реальный вывод \`ng build\`: новый checkout уехал в отдельный ленивый чанк и загружается только тем, у кого флаг включён. Условие: компонент должен быть standalone, лежать в отдельном файле и нигде больше не импортироваться статически — если объявить его в том же файле, что и родитель, он останется в основном бандле.

### Структурная директива \`*appIfFlag\`

\`\`\`ts
@Directive({ selector: '[appIfFlag]' })
export class IfFlag {
  private readonly flags = inject(FeatureFlags);
  private readonly tpl = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);
  readonly appIfFlag = input.required<FlagName>();

  constructor() {
    effect(() => {
      const on = this.flags.isOn(this.appIfFlag());
      if (on && this.vcr.length === 0) this.vcr.createEmbeddedView(this.tpl);
      if (!on) this.vcr.clear();
    });
  }
}
\`\`\`

\`\`\`html
<p *appIfFlag="'newCheckout'">NEW</p><span>always</span>
<!-- флаг выключен:  "always"     -->
<!-- включили:       "NEWalways"  -->
<!-- выключили:      "always"     -->
\`\`\`

\`effect\` перечитывает сигнал флага, поэтому директива реагирует на изменение в рантайме без перезагрузки страницы.

### \`canMatch\`: флаг на уровне маршрута

\`\`\`ts
export const routes: Routes = [
  { path: 'checkout', canMatch: [() => inject(FeatureFlags).isOn('newCheckout')],
    loadComponent: () => import('./new-checkout/new-checkout').then(m => m.NewCheckout) },
  { path: 'checkout', component: LegacyCheckout },
];
// флаг выключен → /checkout показывает "legacy checkout"
// флаг включён  → /checkout показывает "new checkout"
\`\`\`

Если \`canMatch\` вернул \`false\`, роутер не блокирует навигацию, а **пробует следующий маршрут с тем же путём**. Один URL, две реализации, и код новой версии даже не загружается, пока флаг выключен. Если вместо \`false\` вернуть \`UrlTree\` (например, \`inject(Router).createUrlTree(['/'])\`), будет редирект.

### Снимок против живого значения

\`\`\`ts
const snapshot = flags.isOn('newCheckout');                 // прочитали один раз
const live = computed(() => flags.isOn('newCheckout'));     // подписались на изменения

flags.set('newCheckout', true);
console.log(snapshot, live());   // false true
\`\`\`

Компонент, который прочитал флаг один раз в конструкторе, останется в старом состоянии, когда флаг изменится посреди сессии (например, провайдер прислал обновление по стриму). Для флагов, которые могут меняться на лету, читайте сигнал в шаблоне или в \`computed\`.

### Постепенная раскатка: стабильный бакетинг

\`\`\`js
function fnv1a(str) {                         // простой стабильный хэш строки
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
const bucket = (userId, flagKey) => fnv1a(\`\${flagKey}:\${userId}\`) % 100;  // 0..99
const isEnabled = (userId, flagKey, percent) => bucket(userId, flagKey) < percent;

bucket('user-42', 'new-checkout');            // 26 — всегда одно и то же число
// из 10 000 пользователей: 1% → 93, 10% → 1002, 50% → 5002, 100% → 10000
// все, кто попал в 10%, остаются включёнными при 50%: true
\`\`\`

Хэш от «флаг + пользователь» делает раскатку честной (процент примерно соблюдается), стабильной (пользователь не прыгает между вариантами при каждой загрузке) и монотонной (расширение с 10% до 50% не выключает фичу тем, у кого она уже была). Провайдеры вроде LaunchDarkly и Unleash делают то же самое у себя.

### Где вычислять флаг: клиент, сервер, edge

- **Клиент** — быстро и просто, но весь код обеих веток и сами правила видны в бандле. Любопытный пользователь включит фичу в devtools. Годится для UI-экспериментов и раскатки, но **не для прав доступа**.
- **Сервер** — бэкенд решает, что отдать, и проверяет права на каждый запрос. Обязательно для всего, что связано с безопасностью и данными.
- **Edge** (CDN-функции) — решение принимается до загрузки страницы, без мигания интерфейса; удобно для A/B-тестов целых страниц.

Даже с \`@defer\` и \`canMatch\` ленивый чанк новой фичи лежит на сервере и скачивается по прямой ссылке — скрытие кода от загрузки это оптимизация, а не защита.

### Типы флагов и их срок жизни

- **Release-флаги** — прячут незаконченную фичу; живут дни или недели и удаляются сразу после раскатки на 100%.
- **Experiment-флаги** — A/B-тесты; живут до получения статистически значимого результата.
- **Operational-флаги (kill switch)** — выключают тяжёлую или рискованную функциональность при нагрузке; могут жить долго.
- **Permission-флаги** — включают функции для тарифов или ролей; долгоживущие и **всегда** продублированы проверкой на сервере.

### Где это применяется на практике

- **Новая форма оплаты в интернет-магазине**: раскатка 1% → 10% → 100% с мониторингом конверсии и ошибок, kill switch на случай проблем у платёжного провайдера.
- **Тяжёлый грид с серверной агрегацией**: operational-флаг отключает дорогую функцию при пиковой нагрузке на бэкенд.
- **Trunk-based разработка в большой команде**: незаконченные экраны вливаются в \`main\` за выключенным флагом, без долгоживущих веток.
- **Миграция на новый API**: флаг переключает сервис между старым и новым эндпоинтом; оба контракта поддерживаются до полного переезда.
- **Enterprise-клиенты**: permission-флаги включают модули по тарифу, сервер проверяет те же права.

## Важные нюансы и подводные камни

- **Клиентский флаг — не безопасность.** Код лежит в бандле; любопытный пользователь включит фичу в devtools. Права — только на сервере.
- **Flag debt.** Через год у вас 80 флагов, половина всегда \`true\`, и никто не рискует их убрать. Лечение: TTL на флаг, автотикет на удаление при создании флага, дашборд использования и логирование обращений к флагам, чтобы находить мёртвые.
- **Комбинаторный взрыв.** N независимых флагов дают \`2^N\` вариантов поведения: 10 флагов — 1024 комбинации. Тестировать все невозможно — фиксируйте набор поддерживаемых комбинаций и тестируйте только их.
- **Блокирующая загрузка.** Ожидание флагов в \`provideAppInitializer\` (или \`APP_INITIALIZER\`) задерживает первый рендер; нужны таймаут и безопасные дефолты на случай недоступности провайдера.
- **Флаг меняет значение посреди сессии** — компонент, который прочитал его один раз в конструкторе, останется в старом состоянии. Читайте сигнал в шаблоне или \`computed\`.
- **Оба пути надо поддерживать.** Пока флаг жив, старая ветка — такой же продакшен-код: её тесты, переводы и стили должны работать.
- **Флаг против ветки в git.** Флаг живёт в проде и обратим мгновенно; ветка — нет, и чем дольше она живёт, тем больнее merge.
- **Флаги и контракты API/миграции БД.** Изменения должны быть обратно совместимыми: если новая версия фронтенда за флагом требует новую схему, а старая ветка — старую, бэкенд обязан поддерживать обе, иначе выключить флаг (откатиться) невозможно.

**Плюсы:** деплой отделён от релиза; постепенная раскатка, A/B-тесты и мгновенный откат без деплоя; trunk-based разработка без долгоживущих веток.
**Минусы:** ветвление кода и комбинаторный рост тестовых сценариев; flag debt без дисциплины удаления; клиентские флаги не защищают ничего; дополнительная зависимость от провайдера флагов на старте приложения.

## Как это спрашивают на собеседовании

**Главный вывод:** флаги разделяют деплой и релиз. В Angular это сервис на сигналах с дефолтами, загрузка через \`provideAppInitializer\` с таймаутом и использование в \`@if\`/\`@defer\`, директиве и \`canMatch\`. Главные риски — flag debt, \`2^N\` комбинаций и иллюзия безопасности на клиенте.

Типичные формулировки: «Как реализовать feature flags во фронтенде?», «Как сделать постепенную раскатку фичи?», «Какие риски несут флаги?».

Что могут спросить следом:

- *Чем флаг отличается от ветки?* — Флаг живёт в проде и обратим мгновенно; ветка расходится с \`main\` и требует merge.
- *Можно ли закрыть флагом админскую функцию?* — Скрыть в UI можно, защитить — нет; права проверяет сервер.
- *Как не держать новый код в стартовом бандле?* — \`@defer\` внутри ветки флага или \`canMatch\` с \`loadComponent\`.
- *Как бороться с flag debt?* — Делить флаги на короткоживущие и долгоживущие, TTL, тикет на удаление, логирование обращений.
- *Что делать, если провайдер флагов упал?* — Таймаут на загрузку и безопасные дефолты в коде.

### Ответ на 1 минуту

> Feature flags разделяют деплой и релиз: код влит в \`main\` и задеплоен, а включается рантайм-флагом. Это даёт постепенную раскатку и canary, A/B-тесты, kill switch и trunk-based development без долгоживущих веток. В Angular это сервис флагов поверх LaunchDarkly, Unleash или своего конфига: значения хранятся в сигнале с безопасными дефолтами, грузятся в \`provideAppInitializer\` с таймаутом, а используются в \`@if\` или \`@defer\`, структурной директиве и guard \`canMatch\`, который при выключенном флаге отдаёт старый маршрут. Ключевое — где флаг вычисляется: клиентская проверка быстрая, но код лежит в бандле, поэтому для прав доступа она не годится, это работа сервера. Главный риск — flag debt: N флагов дают \`2^N\` путей, все не протестируешь. Поэтому разделяю короткоживущие release-флаги, которые удаляю сразу после раскатки, и долгоживущие operational- и permission-флаги, а обращения к флагам логирую.`,
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
    category: 'ngrx',
    level: 'Hard',
    tags: ['state-management', 'decision-making', 'ngrx'],
    question: {
      ru: 'Как выбрать стейт-менеджмент: signals, NgRx, NgRx SignalStore, сервис с RxJS? По каким критериям?',
      en: 'How do you choose state management: signals, NgRx, NgRx SignalStore, an RxJS service? By what criteria?',
    },
    answer: {
      ru: `## В чём суть

Выбор стейт-менеджмента — это не вопрос «что круче», а **выбор уровня церемонии под размер боли**. Есть лесенка из четырёх ступеней: локальные сигналы → сервис с сигналами (или RxJS) → NgRx SignalStore → классический NgRx Store. Подниматься по ней стоит только тогда, когда текущая ступень реально мешает.

Аналогия: хранение вещей. Мелочь в кармане — локальные сигналы компонента. Полка в комнате — сервис с сигналами. Шкаф с подписанными коробками — SignalStore. Складской терминал с журналом «кто, что и когда вынес» — классический NgRx. Строить складской терминал ради трёх носков — не порядок, а бюрократия. Но искать нужный документ по карманам, когда вещей тысяча, тоже невозможно.

**Какую проблему решает.** Ошибиться можно в обе стороны. Слишком тяжёлый инструмент — и простая форма профиля обрастает тремя файлами, пятью actions и эффектом, команда тратит время на церемонию, а новички боятся трогать код. Слишком лёгкий — и общее состояние расползается по компонентам: каждый хранит свою копию, гонки запросов решаются как попало, никто не может ответить, почему таблица показывает старые данные. Осознанный выбор по критериям защищает от обеих крайностей и даёт аргументы на архитектурном ревью и на собеседовании.

## Словарик терминов

- **Состояние (state)** — данные, от которых зависит интерфейс: что введено в поиск, какие товары в корзине, кто залогинен.
- **Клиентское состояние (client state)** — то, что существует только в браузере: открыт ли фильтр, выбранная вкладка, черновик формы.
- **Серверное состояние (server state)** — копия данных с сервера: список заказов, профиль. Может устареть, требует загрузки, кэша и обновления.
- **Сигнал (\`signal\`)** — реактивная переменная Angular: читается вызовом \`count()\`, а шаблоны и \`computed\`, которые её прочитали, узнают об изменении.
- **\`computed\`** — производный сигнал, который пересчитывается только при изменении зависимостей.
- **\`BehaviorSubject\`** — RxJS-поток, который хранит текущее значение и сразу отдаёт его новому подписчику.
- **Сервис-стор (service store)** — обычный \`@Injectable\` сервис с приватным состоянием и публичными методами для его изменения.
- **NgRx SignalStore** — store из \`@ngrx/signals\`, собираемый из фич (\`withState\`, \`withComputed\`, \`withMethods\`); изменения через \`patchState\`.
- **Классический NgRx Store** — Redux для Angular: actions, reducers, selectors, effects, Redux DevTools.
- **\`ComponentStore\`** — store на RxJS из \`@ngrx/component-store\` для локального состояния; исторический предшественник SignalStore.
- **NGXS** — альтернативная библиотека в стиле Redux, где state, actions и обработчики описываются классами с декораторами.
- **Boilerplate / церемония** — обязательный шаблонный код, который не несёт новой логики.
- **Time-travel** — возможность в DevTools «перемотать» приложение к любому прошлому action.
- **\`httpResource\` / \`resource\`** — экспериментальные API Angular, которые превращают загрузку данных в сигналы \`value()\`, \`isLoading()\`, \`error()\`.
- **Zoneless** — режим Angular без \`zone.js\`, где перерисовку запускают сигналы и события; в Angular 21 новые проекты создаются в этом режиме по умолчанию.

## Как это работает под капотом

Выбор — это последовательность вопросов, где каждый ответ либо оставляет вас на текущей ступени, либо поднимает выше:

1. **Чьё это состояние?** Нужно одному компоненту — локальный сигнал, и дальше думать не о чем. Нескольким компонентам или экранам — нужен общий владелец (сервис или store).
2. **Это серверное или клиентское состояние?** Серверные данные лучше отдать слою, который умеет кэшировать и перезапрашивать (сервис с кэшем, \`httpResource\`), а не дублировать в общем store, где они протухают.
3. **Насколько сложна асинхронщина?** Один запрос — хватит сервиса. Гонки, отмены, debounce, координация нескольких запросов — нужен RxJS: \`rxMethod\` в SignalStore или Effects в NgRx.
4. **Нужен ли журнал и отладка по шагам?** Требования аудита, воспроизведение бага по действиям пользователя, time-travel — это сильный аргумент за классический NgRx.
5. **Сколько людей и сколько кода?** Большой команде строгие правила (событие → reducer → селектор) экономят время на ревью; маленькой они чистый оверхед.
6. **Что уже есть в проекте?** Новая фича должна быть похожа на соседние. Переписывать работающий NgRx ради моды — плохая инвестиция.
7. Выбираем **самую низкую ступень**, которая закрывает требования, и поднимаемся, когда боль ручной координации становится дороже церемонии.

Ниже одна и та же задача — корзина с суммой — на каждой ступени. Все выводы проверены запуском.

### Ступень 1. Локальные сигналы компонента

\`\`\`ts
@Component({ /* ... */ })
export class SearchBoxComponent {
  readonly query = signal('');
  readonly isEmpty = computed(() => this.query().trim() === '');
}

// isEmpty() → true
// query.set('  ангуляр ')
// isEmpty() → false
\`\`\`

Состояние, которое не нужно никому за пределами компонента: текст в поле поиска, открыт ли аккордеон, выбранная вкладка. Живёт и умирает вместе с компонентом, никаких сервисов и библиотек.

### Ступень 2. Сервис с сигналами

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items = signal<CartItem[]>([]);
  readonly items = this._items.asReadonly();
  readonly total = computed(() => this._items().reduce((s, i) => s + i.price, 0));
  add(item: CartItem) { this._items.update(list => [...list, item]); }
}

cart.add({ id: 1, price: 100 });
cart.add({ id: 2, price: 50 });
console.log(cart.total());   // 150
\`\`\`

Здесь уже есть всё, за что любят store: единый источник истины, производные значения, иммутабельные обновления, запись только через методы (\`asReadonly()\` не даёт менять сигнал снаружи). Ни одного action и ни одного лишнего файла. По опыту, этой ступени хватает большинству небольших и средних приложений.

### Ступень 2 на RxJS: сервис с \`BehaviorSubject\`

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly items$$ = new BehaviorSubject<CartItem[]>([]);
  readonly items$ = this.items$$.asObservable();
  readonly total$ = this.items$.pipe(
    map(list => list.reduce((s, i) => s + i.price, 0)),
    distinctUntilChanged()
  );
  add(item: CartItem) { this.items$$.next([...this.items$$.value, item]); }
}

cart.total$.subscribe(t => console.log('total$:', t));
cart.add({ id: 1, price: 100 });
cart.add({ id: 2, price: 50 });
// total$: 0
// total$: 100
// total$: 150
\`\`\`

Тот же сервис-стор, но на потоках. Это классика до появления сигналов, и она по-прежнему уместна, когда состояние рождается из событий во времени: WebSocket, debounce поиска, комбинирование нескольких потоков. В шаблоне такие данные читают через \`async\`-pipe или \`toSignal\`. Наружу отдают только \`asObservable()\`, а не сам \`Subject\`.

### Ступень 3. NgRx SignalStore

\`\`\`ts
export const CartStore = signalStore(
  { providedIn: 'root' },
  withState({ items: [] as CartItem[] }),
  withComputed(({ items }) => ({
    total: computed(() => items().reduce((s, i) => s + i.price, 0)),
  })),
  withMethods(store => ({
    add(item: CartItem) { patchState(store, s => ({ items: [...s.items, item] })); },
  }))
);

store.add({ id: 1, price: 100 });
store.add({ id: 2, price: 50 });
console.log(store.total());   // 150
\`\`\`

По объёму почти как сервис, но с правилами: состояние защищено от изменения снаружи, структура одинакова во всех фичах, логика переиспользуется через \`signalStoreFeature\`, коллекции — через \`withEntities\`, асинхронщина с отменой — через \`rxMethod\`. Store можно сделать глобальным (\`providedIn: 'root'\`) или локальным для экрана (\`providers: [CartStore]\` в компоненте).

### Ступень 4. Классический NgRx Store

\`\`\`ts
export const CartActions = createActionGroup({
  source: 'Product Page',
  events: { 'Add To Cart Clicked': props<{ item: CartItem }>() },
});

export const cartFeature = createFeature({
  name: 'cart',
  reducer: createReducer(
    { items: [] as CartItem[] },
    on(CartActions.addToCartClicked, (s, { item }) => ({ items: [...s.items, item] }))
  ),
  extraSelectors: ({ selectItems }) => ({
    selectTotal: createSelector(selectItems, items => items.reduce((s, i) => s + i.price, 0)),
  }),
});

store.dispatch(CartActions.addToCartClicked({ item: { id: 1, price: 100 } }));
store.dispatch(CartActions.addToCartClicked({ item: { id: 2, price: 50 } }));
console.log(store.selectSignal(cartFeature.selectTotal)());   // 150
\`\`\`

Результат тот же, но каждый шаг — именованное событие, которое видно в Redux DevTools, можно залогировать, воспроизвести и «перемотать». Одно событие могут услышать reducers и effects разных фич (например, \`orderPlaced\` очищает корзину и показывает уведомление). Это максимум церемонии и максимум прослеживаемости.

### \`ComponentStore\` — предшественник SignalStore

\`\`\`ts
@Injectable()
export class CartComponentStore extends ComponentStore<{ items: CartItem[] }> {
  constructor() { super({ items: [] }); }
  readonly total$ = this.select(s => s.items.reduce((sum, i) => sum + i.price, 0));
  readonly add = this.updater((s, item: CartItem) => ({ items: [...s.items, item] }));
}
// total$: 0 → 100 → 150
\`\`\`

Локальный store на RxJS: \`select\` для чтения, \`updater\` для изменений, \`effect\` для асинхронщины. Его часто встретишь в проектах 2020–2023 годов. Для нового кода NgRx предлагает SignalStore, который решает ту же задачу на сигналах; переписывать работающий \`ComponentStore\` срочно не нужно.

### NGXS — альтернатива NgRx

\`\`\`ts
export class AddToCart {
  static readonly type = '[Product Page] Add To Cart';
  constructor(public item: CartItem) {}
}

@State<{ items: CartItem[] }>({ name: 'cart', defaults: { items: [] } })
@Injectable()
export class CartState {
  @Selector() static total(state: { items: CartItem[] }) {
    return state.items.reduce((s, i) => s + i.price, 0);
  }
  @Action(AddToCart) add(ctx: StateContext<{ items: CartItem[] }>, { item }: AddToCart) {
    ctx.setState({ items: [...ctx.getState().items, item] });
  }
}

store.dispatch(new AddToCart({ id: 1, price: 100 }));
store.dispatch(new AddToCart({ id: 2, price: 50 }));
console.log(store.selectSignal(CartState.total)());   // 150
\`\`\`

Та же идея Redux (actions, единый store, селекторы), но в объектно-ориентированном стиле: обработчик action — метод класса, асинхронщина пишется прямо в нём, отдельного слоя effects нет. Меньше файлов, чем в классическом NgRx, но сообщество и экосистема меньше. Выбор между NGXS и NgRx — обычно вопрос вкуса команды и того, что уже есть в проекте.

### Серверное состояние: \`httpResource\` и кэширующий слой

\`\`\`ts
@Component({ /* ... */ })
export class UsersPageComponent {
  readonly query = signal('');
  readonly users = httpResource<User[]>(() => \`/api/users?q=\${this.query()}\`);
  // в шаблоне: users.isLoading(), users.error(), users.value(); перезапрос — users.reload()
}
\`\`\`

\`httpResource\` сам перезапрашивает данные при изменении сигнала \`query\`, а \`value()\`, \`isLoading()\` и \`error()\` — сигналы для шаблона. В Angular 21 он и базовый \`resource\` всё ещё помечены \`@experimental\`, поэтому в критичном коде их используют осознанно. Сама идея важнее API: серверные данные держат в слое, который умеет загружать, кэшировать и инвалидировать, а не копируют вручную в глобальный store, где они живут своей жизнью и устаревают.

### Критерии подъёма по лесенке

- **Число потребителей.** Много несвязанных мест читают и меняют одно состояние → пора из компонента в сервис, а дальше — в store.
- **Сложность асинхронщины.** Гонки, отмены, debounce, координация нескольких запросов → \`rxMethod\` в SignalStore или Effects в NgRx.
- **Аудит и отладка.** Нужен журнал действий, воспроизведение бага по шагам, time-travel → классический NgRx.
- **Межфичевые реакции.** Одно событие должно запускать реакции в нескольких независимых фичах → глобальная шина actions NgRx (или плагин событий SignalStore).
- **Размер команды.** Строгий событийный подход дисциплинирует большую команду; маленькой это чистый оверхед.
- **Производительность.** Сигналы сообщают Angular, какие именно шаблоны их прочитали, поэтому перерисовываются только они; в zoneless-приложении это основной механизм обновления. Классический Store тоже даёт сигналы через \`selectSignal\`, так что разница здесь меньше, чем принято думать.
- **Жизненный цикл.** Состояние должно умирать вместе с экраном → локальный SignalStore в \`providers\` компонента, а не глобальный store.

### Как выбрать

- Состояние одного компонента → \`signal\` и \`computed\` прямо в компоненте.
- Общее состояние средней сложности, простая асинхронщина → сервис с сигналами (или с \`BehaviorSubject\`, если данные рождаются из потоков событий).
- Несколько фич с похожей структурой, нужна дисциплина и переиспользуемые блоки, гонки запросов → NgRx SignalStore.
- Состояние экрана, которое должно жить и умирать вместе с ним → SignalStore в \`providers\` компонента.
- Аудит, журнал, time-travel, большая команда, много межфичевых реакций → классический NgRx Store.
- Данные с сервера, которые нужно загружать и кэшировать → кэширующий data-слой (\`httpResource\`, сервис с кэшем), а не копия в общем store.
- Проект уже на NgRx, NGXS или \`ComponentStore\` → продолжайте в том же стиле, новые изолированные фичи можно делать на SignalStore.

### Где это применяется на практике

- **Внутренние админки и CRUD-приложения**: сервисы с сигналами и \`httpResource\` — быстро, понятно, без лишних файлов.
- **Экраны с большой таблицей** (фильтры, сортировка, пагинация, выделение строк): локальный SignalStore на экран, загрузка через \`rxMethod\` с \`switchMap\`.
- **Банковские и трейдинговые платформы**: классический NgRx ради журнала действий, воспроизводимости и строгих правил для больших команд.
- **Дашборды**: общие фильтры дашборда в root-store, у каждого виджета — свой локальный store.
- **Постепенная миграция**: старые фичи на NgRx Store или \`ComponentStore\` остаются как есть, новые пишутся на SignalStore, общие данные прячутся за фасадами.

## Важные нюансы и подводные камни

- **NgRx ради CRUD-формы.** Три файла и пять actions, чтобы сохранить профиль, — церемония без выгоды.
- **Глобальный store для локального UI.** «Открыт ли дропдаун» в глобальном state гарантирует конфликты между экземплярами компонента и мусор в DevTools.
- **Дублирование серверного состояния.** Копия серверных данных в store живёт своей жизнью и устаревает; инвалидацией должен заниматься data-слой.
- **Store как свалка.** Один \`AppState\` на всё вместо срезов по доменам — и вы снова в монолите, где всё связано со всем.
- **«Начнём сразу с NgRx, чтобы потом не переписывать».** Переписывать со временем всё равно придётся, но теперь ещё и с boilerplate на руках. Подниматься по лесенке дешевле, чем спускаться.
- **Публичный \`Subject\` или записываемый сигнал в сервисе.** Если наружу торчит \`items$$\` или \`signal\`, любой компонент может изменить состояние в обход методов. Отдавайте \`asObservable()\` и \`asReadonly()\`.
- **Сигналы против RxJS — не война.** Сигналы хороши для состояния «что есть сейчас», RxJS — для событий во времени (debounce, отмена, комбинирование потоков). В SignalStore они соединяются через \`rxMethod\`, в сервисах — через \`toSignal\`/\`toObservable\`.
- **Смешение подходов без правил.** Один домен в NgRx, соседний в сервисе, третий в SignalStore — нормально, если граница по доменам и записана договорённость. Плохо, когда одно и то же состояние живёт в двух местах.
- **Экспериментальные API.** \`resource\` и \`httpResource\` в Angular 21 помечены \`@experimental\`: их форма может измениться между версиями.
- **Не путайте «глобальный» и «общий».** SignalStore с \`providedIn: 'root'\` — синглтон на всё приложение; тот же store в \`providers\` компонента — новый экземпляр на каждый компонент.

**Плюсы:** осознанный выбор экономит время команды, снижает boilerplate там, где он не нужен, и даёт строгость там, где она окупается; лесенка позволяет начинать просто и усложнять по мере роста.
**Минусы:** в одном проекте могут жить несколько подходов, и нужны договорённости о границах; подъём на ступень выше — это миграция; критерии частично субъективны и требуют опыта.

## Как это спрашивают на собеседовании

**Главный вывод:** начинать с самой простой ступени (сигналы в компоненте → сервис с сигналами), подниматься к SignalStore при росте структуры и асинхронщины, а к классическому NgRx — когда нужны журнал, time-travel, межфичевые события и дисциплина большой команды. Серверное состояние — в кэширующем data-слое.

Типичные формулировки: «Как выбрать стейт-менеджмент?», «Когда нужен NgRx, а когда хватит сервиса?», «Чем SignalStore отличается от классического NgRx?», «Зачем NgRx, если есть сигналы?».

Что могут спросить следом:

- *Чем SignalStore отличается от классического NgRx по модели?* — Методы и \`patchState\` вместо actions и reducers, нет глобальной шины событий, может жить локально в компоненте.
- *Как тестировать каждый вариант?* — Сервис и SignalStore — напрямую через вызовы методов и чтение сигналов; NgRx — reducers как чистые функции, селекторы через \`projector\`, эффекты с подменённым потоком actions или marble-тестами (поток во времени описывается строкой-диаграммой вроде \`-a--b|\`).
- *Где хранить данные с сервера?* — В кэширующем слое (\`httpResource\`, сервис с кэшем), а не дублировать в общем store.
- *А NGXS?* — Та же идея Redux в стиле классов с декораторами; выбор между ним и NgRx — вопрос команды и существующего кода.
- *Когда BehaviorSubject лучше сигнала?* — Когда состояние — это поток событий во времени: WebSocket, debounce, комбинация потоков.

### Ответ на 1 минуту

> Я смотрю на это как на лесенку и выбираю самую низкую ступень, которая закрывает требования. Состояние одного компонента — обычные сигналы и computed. Общее состояние средней сложности — сервис с приватным сигналом или BehaviorSubject и публичными методами; по опыту, этого хватает большинству приложений. Дальше NgRx SignalStore — структурированный store на сигналах с withState, withComputed, методами и rxMethod для асинхронщины с отменой; его удобно делать и глобальным, и локальным для экрана. И классический NgRx с actions, reducers, effects и DevTools — когда реально нужны журнал действий, time-travel, межфичевые события и дисциплина большой команды. Критерии подъёма: много несвязанных потребителей, гонки и отмены, требования аудита, размер команды. Начинать сразу с NgRx «на вырост» не стоит — подниматься дешевле, чем спускаться. И отдельно: серверные данные я держу в кэширующем data-слое, например httpResource, а не дублирую в общем store.`,
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
      ru: `## В чём суть

Дизайн-система — это общий язык интерфейса для всех команд компании, а библиотека компонентов — его кодовая часть. Устроена она как **три этажа**: токены (голые значения — цвета, отступы, шрифты), примитивы (\`Button\`, \`Input\`, \`Dialog\`) и паттерны, собранные из примитивов (формы, таблицы, фильтры). Чем ниже этаж, тем стабильнее должен быть его API, потому что на нём стоит всё остальное.

Аналогия: конструктор Lego. Токены — это пластик и цвета, из которых льют детали. Примитивы — сами кубики: их немного видов, они идеально стыкуются и никогда не меняют размер шипов. Паттерны — готовые модели из инструкции. Если производитель однажды поменяет шаг шипов, все построенные дома по всему миру развалятся — вот почему API примитивов трогать страшнее всего.

**Какую проблему решает.** Пять команд без общей системы рисуют пять разных кнопок «Сохранить»: с разными отступами, разным поведением фокуса и пятью разными багами доступности. Ребрендинг превращается в многомесячный поиск захардкоженных \`#2563eb\` по всем репозиториям, а пользователь в портале и в админке видит два разных продукта. Дизайн-система даёт одну реализацию, которую чинят один раз, и одно место, где меняется внешний вид всего.

## Словарик терминов

- **Дизайн-система (design system)** — токены, компоненты, паттерны, правила их использования и процесс развития; не просто папка с компонентами.
- **Библиотека компонентов (component library)** — кодовая часть системы: npm-пакет или библиотека в монорепо с готовыми Angular-компонентами.
- **Дизайн-токен (design token)** — именованное значение дизайна: \`--ds-color-primary\`, \`--ds-space-2\`. Дизайнер и разработчик говорят одними именами.
- **Базовый и семантический токен (primitive / semantic token)** — базовый хранит значение («синий 600»), семантический хранит смысл («основной цвет», «цвет ошибки») и ссылается на базовый.
- **CSS custom properties (CSS-переменные)** — переменные вида \`--name\`, которые браузер вычисляет во время работы страницы и которые наследуются вниз по DOM.
- **Примитив (primitive)** — базовый компонент без бизнес-логики: кнопка, поле ввода, диалог, чекбокс.
- **Паттерн (pattern)** — типовая сборка из примитивов: форма с валидацией, таблица с фильтрами, пустое состояние.
- **Semver (семантическое версионирование)** — номер версии \`MAJOR.MINOR.PATCH\`: мажор ломает API, минор добавляет возможности, патч чинит баги.
- **Депрекация (deprecation)** — пометка «устарело, будет удалено в следующем мажоре»; старый API ещё работает, но IDE его зачёркивает.
- **Codemod / миграция \`ng update\`** — скрипт, который автоматически переписывает код потребителей под новый API.
- **A11y (accessibility) и ARIA** — доступность для клавиатуры и скринридеров; ARIA — атрибуты вроде \`aria-busy\`, \`role\`, которые описывают элемент для вспомогательных технологий.
- **Angular CDK (Component Dev Kit)** — пакет \`@angular/cdk\` с «поведением без внешнего вида»: ловушка фокуса, оверлеи, навигация стрелками, harness для тестов.
- **Component harness** — тестовый «пульт» компонента: тест вызывает \`click()\` и \`getText()\`, не зная внутренней вёрстки.
- **Визуальная регрессия (visual regression testing)** — сравнение скриншотов компонента до и после изменения, чтобы поймать случайные визуальные поломки.
- **peerDependencies** — зависимости, которые библиотека не тащит с собой, а ожидает от приложения (например, \`@angular/core\`).
- **Content projection (\`ng-content\`)** — способ вставить разметку потребителя внутрь компонента вместо десятка входных параметров.

## Как это работает под капотом

Дизайн-система — это цепочка договорённостей, где каждая опирается на предыдущую:

1. Сначала договариваются о **токенах** — какие цвета, отступы и шрифты существуют и как называются, поэтому дизайнер и разработчик говорят \`--ds-color-danger\`, а не «красный из макета».
2. Токены раскладываются **в слои**: базовые (палитра) → семантические (смысл) → компонентные (\`--ds-button-bg\`); компоненты видят только верхние слои, поэтому тема — это переопределение одного слоя.
3. Поверх токенов пишутся **примитивы** — без бизнес-логики, с доступностью внутри и с маленьким закрытым API, поэтому команды физически не могут собрать «свою primary».
4. Из примитивов собираются **паттерны** (форма, таблица, фильтр) без «своих» кнопок внутри, поэтому фикс в кнопке сам доезжает до всех таблиц.
5. Всё публикуется как **версионированная библиотека** (в монорепо или в npm), поэтому у каждого изменения есть понятная цена: патч — безопасно, мажор — читать changelog.
6. Ломающие изменения идут циклом **депрекация → миграция → мажор**, поэтому команды обновляются в своём темпе, без ручной правки сотен шаблонов.
7. Качество держат **автотесты** (визуальная регрессия, unit, harness), а пользу показывают **метрики принятия** — сколько экранов собрано на системе.

### Пример 1. Токены в три слоя и смена темы одной строкой

\`\`\`css
/* 1. Базовые токены: только значения, компоненты их напрямую не используют */
:root {
  --ds-blue-600: #2563eb;
  --ds-blue-400: #60a5fa;
  --ds-red-600: #dc2626;
  --ds-space-2: 8px;
  --ds-radius-md: 6px;
}

/* 2. Семантические токены: смысл, а не цвет */
:root {
  --ds-color-primary: var(--ds-blue-600);
  --ds-color-danger: var(--ds-red-600);
}
[data-theme='dark'] {
  --ds-color-primary: var(--ds-blue-400); /* тёмная тема переопределяет только смысл */
}

/* 3. Компонентные токены: официальные «ручки» для настройки кнопки */
.ds-button {
  --ds-button-bg: var(--ds-color-primary);
  --ds-button-radius: var(--ds-radius-md);
  background: var(--ds-button-bg);
  border-radius: var(--ds-button-radius);
  padding: var(--ds-space-2) calc(var(--ds-space-2) * 2);
}
.ds-button--danger { --ds-button-bg: var(--ds-color-danger); }

/* Результат в браузере:
   <html>                    → фон кнопки #2563eb
   <html data-theme="dark">  → фон кнопки #60a5fa, компонент не пересобирался */
\`\`\`

Почему так: компонент знает только \`--ds-button-bg\`, а откуда пришло значение — ему всё равно. Тема переключается атрибутом на \`<html>\`, и браузер сам пересчитывает все переменные вниз по дереву. Чтобы перекрасить продукт под другой бренд, достаточно переопределить семантический слой.

### Пример 2. Примитив \`ds-button\` с закрытым API

\`\`\`ts
import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';

export type DsButtonVariant = 'primary' | 'ghost' | 'danger';
export type DsButtonSize = 'sm' | 'md';

@Component({
  // атрибутный селектор: остаётся настоящий <button> со всей его доступностью
  selector: 'button[dsButton], a[dsButton]',
  template: \`<ng-content />\`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ds-button',
    '[class]': 'classes()',
    '[attr.aria-busy]': 'loading() || null',
  },
})
export class DsButton {
  variant = input<DsButtonVariant>('primary');
  size = input<DsButtonSize>('md');
  loading = input(false, { transform: booleanAttribute });
  protected classes = computed(() => \`ds-button--\${this.variant()} ds-button--\${this.size()}\`);
}
\`\`\`

\`\`\`html
<button dsButton (click)="save()">Сохранить</button>
<button dsButton variant="danger" size="sm" loading>Удалить</button>
<a dsButton variant="ghost" href="/help">Справка</a>

<!-- Отрисованный DOM (проверено в TestBed):
<button dsbutton="" class="ds-button ds-button--md ds-button--primary">Сохранить</button>
<button dsbutton="" variant="danger" size="sm" loading="" class="ds-button ds-button--danger ds-button--sm" aria-busy="true">Удалить</button>
<a dsbutton="" variant="ghost" href="/help" class="ds-button ds-button--ghost ds-button--md">Справка</a> -->
\`\`\`

Почему так: вариантов ровно три — вместо двадцати свойств вида \`color\`, \`bg\`, \`borderWidth\`, из которых команды соберут двадцать разных «primary». Атрибутный селектор \`button[dsButton]\` оставляет нативную кнопку: Tab, Enter, Space, \`disabled\` и отправка формы работают бесплатно. Текст и иконки приходят через \`ng-content\`, а не через свойства \`label\`/\`icon\`/\`iconPosition\`. \`OnPush\` перерисовывает компонент только при смене входов. В старом коде пишут \`@Input() variant: DsButtonVariant = 'primary'\` — смысл тот же.

### Пример 3. Закрытый API ловит ошибки ещё на сборке

\`\`\`html
<button dsButton variant="blue">Купить</button>
\`\`\`

\`\`\`text
✘ [ERROR] TS2322: Type '"blue"' is not assignable to type 'DsButtonVariant'.
\`\`\`

Это реальная ошибка компилятора Angular при включённом \`strictTemplates\`. Union-тип вместо \`string\` превращает договорённость «используем только три варианта» в проверку, которую нельзя забыть: неправильный вариант не доедет даже до код-ревью.

### CSS custom properties: почему тема меняется без пересборки

SCSS-переменная \`$primary\` существует только во время сборки: в итоговом CSS остаётся голый \`#2563eb\`, и тему без пересборки не поменять. CSS custom property живёт в браузере: значение вычисляется во время работы страницы и наследуется по DOM, как обычный \`color\`.

\`\`\`css
.admin-panel { --ds-color-primary: #7c3aed; } /* фиолетовый только внутри админ-панели */
\`\`\`

Кнопки внутри \`.admin-panel\` станут фиолетовыми, снаружи останутся синими — без правки компонента. Поэтому токены отдают именно CSS-переменными, а SCSS разве что генерирует их.

### Angular CDK: доступность внутри примитива, а не у потребителя

\`@angular/cdk/a11y\` даёт готовые кирпичи доступности. Пример — ловушка фокуса в диалоге:

\`\`\`ts
import { A11yModule } from '@angular/cdk/a11y';

@Component({
  selector: 'ds-dialog',
  imports: [A11yModule],
  template: \`
    <section role="dialog" aria-modal="true" cdkTrapFocus [cdkTrapFocusAutoCapture]="true">
      <ng-content />
    </section>\`,
})
export class DsDialog {}
\`\`\`

\`cdkTrapFocus\` не даёт Tab увести фокус за пределы открытого диалога, а \`cdkTrapFocusAutoCapture\` переносит фокус внутрь при открытии и возвращает его на место при закрытии. Рядом лежат \`LiveAnnouncer\` (озвучить «Заказ сохранён» скринридеру) и \`FocusKeyManager\` (навигация стрелками по списку). Если это зашито в \`ds-dialog\`, все сорок диалогов компании доступны автоматически; если оставить потребителям — доступными будут три.

### Component harness: контракт для тестов потребителей

Хорошая библиотека поставляет рядом с компонентом его harness — как Angular Material поставляет \`@angular/material/button/testing\`:

\`\`\`ts
import { ComponentHarness, HarnessPredicate, BaseHarnessFilters } from '@angular/cdk/testing';

export class DsButtonHarness extends ComponentHarness {
  static hostSelector = '.ds-button';
  static with(options: BaseHarnessFilters & { text?: string } = {}) {
    return new HarnessPredicate(DsButtonHarness, options)
      .addOption('text', options.text, (h, text) => HarnessPredicate.stringMatches(h.getText(), text));
  }
  async getText() { return (await this.host()).text(); }
  async click() { return (await this.host()).click(); }
}

// тест команды-потребителя
const save = await loader.getHarness(DsButtonHarness.with({ text: 'Сохранить' }));
await save.click();
\`\`\`

Команда дизайн-системы может полностью переписать вёрстку кнопки — тесты в продуктах не заметят, потому что опираются на harness, а не на CSS-классы. Harness меняется в той же библиотеке, в том же PR.

### Semver, депрекация и codemod: как менять API, не ломая всех

Допустим, свойство \`type\` переименовывают в \`variant\`. Делается это в три шага:

\`\`\`ts
export class DsButton {
  variant = input<DsButtonVariant>('primary');

  /** @deprecated Используйте \`variant\`. Будет удалено в v5.0.0. */
  type = input<DsButtonVariant | undefined>(undefined);

  protected effectiveVariant = computed(() => this.type() ?? this.variant());
}
\`\`\`

\`\`\`text
4.3.0  — добавлен variant, type помечен @deprecated: минорная версия, ничего не ломается, IDE зачёркивает старое имя
4.x    — команды переходят в своём темпе, в changelog есть инструкция
5.0.0  — type удалён; миграция для ng update переписывает шаблоны: type="danger" → variant="danger"
\`\`\`

Миграции подключаются через поле \`ng-update\` в \`package.json\` библиотеки, и тогда \`ng update @acme/ui\` сам правит код потребителей — так обновляется Angular Material. Ломать API в минорной версии нельзя: одно такое обновление — и команды начинают фиксировать версию навсегда.

### Поставка: библиотека в монорепо или npm-пакет

\`\`\`json
{
  "name": "@acme/ui",
  "version": "4.3.0",
  "peerDependencies": {
    "@angular/core": "^21.0.0",
    "@angular/cdk": "^21.0.0"
  },
  "ng-update": { "migrations": "./schematics/migration.json" }
}
\`\`\`

- **В монорепо** это \`libs/ui\` с тегом вроде \`type:ui\` и правилом границ (например, \`@nx/enforce-module-boundaries\`): \`ui\` может зависеть только от \`ui\` и \`util\`, но не от фич и не от store. Все приложения всегда на одной версии, ломающее изменение правится во всех потребителях одним PR.
- **В полирепо** это npm-пакет со строгим релизным процессом и changelog. \`@angular/core\` и \`@angular/cdk\` — в \`peerDependencies\`, чтобы в приложении не оказалось двух копий Angular.
- **Вторичные точки входа** (\`@acme/ui/button\`, \`@acme/ui/dialog\`, их умеет собирать ng-packagr) помогают tree-shaking: приложение тянет только то, что импортирует.
- **Минимум зависимостей:** библиотека не тянет NgRx, NGXS или свой \`HttpClient\`-слой — иначе её нельзя будет подключить в приложение с другим стеком.

### Тестирование и метрики принятия

- **Визуальная регрессия:** каждое состояние компонента — «история» в Storybook (витрине компонентов), скриншоты сравниваются автоматически через Chromatic или \`toHaveScreenshot()\` в Playwright.
- **Unit- и harness-тесты:** клавиатура, \`disabled\`, \`aria-*\`, события; тот же harness, что получат потребители, проверяется в самой библиотеке.
- **Метрики принятия:** доля экранов на компонентах системы, число локальных кнопок и \`::ng-deep\`-переопределений, разброс версий между приложениями.

### Где это применяется на практике

- **Несколько enterprise-приложений одной компании** (клиентский портал, админка, back-office): одна библиотека, один внешний вид, общие баг-фиксы.
- **Большие таблицы данных:** сторонний грид (Kendo UI, AG Grid) оборачивают в компонент системы, который задаёт токены, пресеты колонок и единый вид фильтров; при обновлении грида правится одна обёртка, а не все экраны.
- **Формы:** \`ds-form-field\` с единым выводом ошибок валидации, обязательных полей и подсказок — во всех командах формы ведут себя одинаково.
- **White-label и мультибренд:** один код, разные бренды через переопределение семантических токенов.

## Важные нюансы и подводные камни

- **Бизнес-логика внутри примитива.** \`ds-button\`, который сам знает про права пользователя, перестаёт быть переиспользуемым. Права проверяет фича, кнопка получает \`disabled\`.
- **Over-abstraction.** Двадцать свойств «на все случаи» дают двадцать несовместимых кнопок. Ограниченный набор вариантов плюс \`ng-content\` сильнее гибкости.
- **Версионный разброс в полирепо.** Одна команда на v3, другая на v1 — баг-фикс приходится бэкпортировать в обе ветки.
- **Форк компонента ради темы** вместо токена — и вот у вас две реализации диалога, которые медленно расходятся.
- **A11y «потом».** Дописывать ловушку фокуса и ARIA в компонент, который уже разошёлся по продуктам, в разы дороже, чем заложить сразу.
- **\`::ng-deep\` по внутренностям компонента.** Потребитель перекрашивает внутренний класс — и это ломается при первом обновлении вёрстки. Лечится официальными «ручками»: компонентными CSS-переменными вроде \`--ds-button-radius\`.
- **Токены по значению вместо смысла.** Если компоненты используют \`--ds-blue-600\`, тёмную тему и ребрендинг не сделать без правки компонентов. Компоненты должны ссылаться на \`--ds-color-primary\`.
- **\`div\` с обработчиком клика вместо \`button\`.** Он не фокусируется с клавиатуры и не объявляется скринридером как кнопка; атрибутный селектор на нативном элементе решает это бесплатно.
- **Ломающее изменение в минорной версии.** После одного такого случая команды перестают обновляться, и дизайн-система замирает.
- **Переопределение базового токена во вложенном блоке не работает.** \`var()\` подставляется там, где объявлена переменная: \`--ds-color-primary\` уже вычислен на \`:root\`, и \`.admin-panel { --ds-blue-600: purple }\` его не изменит. Переопределяйте семантический слой.
- **Нет владельца.** Библиотека «общая, значит ничья» быстро обрастает дублями — нужна core-команда и понятные правила вкладов.

**Плюсы:** единый UX во всех продуктах, доступность и баг-фиксы делаются один раз, тема и ребрендинг меняются через токены, новые экраны собираются быстрее, тесты потребителей стабильны благодаря harness.
**Минусы:** заметные стартовые вложения и постоянная команда поддержки, медленнее поставка нестандартных решений, риск over-abstraction, координация версий и миграций между командами.

## Как это спрашивают на собеседовании

**Главный вывод:** дизайн-система — это слои токены → примитивы → паттерны плюс процесс развития. Тема меняется через CSS-переменные, а не форки, API примитивов маленький и стабильный, изменения идут по semver с депрекацией и миграциями.

Типичные формулировки: «Как бы вы построили UI-kit для пяти команд?», «Как сделать тёмную тему, не переписывая компоненты?», «Как выпустить ломающее изменение в общей библиотеке?».

Что могут спросить следом:

- *Как провести ломающее изменение?* — Новый API и депрекация старого в минорной версии, миграция для \`ng update\`, удаление только в мажоре и период параллельной поддержки.
- *Как мерить принятие?* — Доля экранов на компонентах системы, число локальных кнопок и \`::ng-deep\`, разброс версий между приложениями.
- *Почему CSS-переменные, а не SCSS?* — SCSS-переменные исчезают при сборке, а CSS-переменные живут в браузере, наследуются и переключаются атрибутом без пересборки.
- *Как тестировать библиотеку?* — Визуальная регрессия через Storybook и Chromatic или скриншоты Playwright, unit-тесты на взаимодействие, harness-тесты на контракт.
- *Монорепо или npm-пакет?* — Монорепо даёт одну версию и атомарные правки всех потребителей, npm-пакет — независимые релизы ценой версионного разброса.

### Ответ на 1 минуту

> Дизайн-систему я строю слоями. Внизу токены — цвета, отступы, типографика — как единый источник истины в CSS custom properties: базовый слой с палитрой и семантический со смыслом, поэтому тёмная тема или ребрендинг — это переопределение переменных, без пересборки и форков компонентов. Выше примитивы: кнопка, поле, диалог — презентационные, без бизнес-логики, с доступностью внутри; фокус, ARIA и клавиатуру я зашиваю в компонент через Angular CDK, а не оставляю потребителю. API делаю маленьким: union-тип из трёх вариантов плюс \`ng-content\` вместо двадцати свойств, и \`strictTemplates\` ловит ошибки на сборке. Сверху паттерны — формы и таблицы из примитивов. Изменения идут по строгому semver: депрекация в минорной версии, миграция через \`ng update\`, удаление в мажоре. В монорепо это отдельная ui-библиотека с правилами границ, в полирепо — npm-пакет с Angular в peerDependencies. Тестирую визуальной регрессией, unit-тестами и harness-тестами, а пользу меряю долей экранов на системе.`,
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
      ru: `## В чём суть

Монорепо (monorepo) — **один репозиторий на много проектов**: несколько приложений и общие библиотеки лежат рядом. Полирепо (polyrepo) — по репозиторию на проект или команду, а общий код ездит между ними npm-пакетами. Выбор сводится к одному вопросу: что вам дороже обходится — **координация или изоляция**.

Аналогия: монорепо — большая общая квартира с общей кухней. Переставить мебель во всех комнатах разом легко, посуда одна на всех, но нужны правила, иначе бардак и шум. Полирепо — отдельные квартиры: тихо, у каждого свой ключ и свой ремонт, но чтобы всем поменять одинаковые розетки, придётся обойти каждую квартиру и договориться с каждым жильцом.

**Какую проблему решает.** Как только у компании больше одного фронтенд-приложения, появляется общий код: дизайн-система, HTTP-клиент, утилиты дат, модели API. Его нужно где-то хранить, менять и доставлять до всех потребителей. Без осознанного выбора получается худшее из двух миров: копипаста одного и того же кода в семь репозиториев или один гигантский репозиторий, где всё импортирует всё и CI идёт сорок минут. Правильно выбранная модель вместе с инструментами делает общий код дешёвым в изменении.

## Словарик терминов

- **Монорепо (monorepo)** — один Git-репозиторий, в котором живут несколько приложений и библиотек со своими границами.
- **Полирепо (polyrepo)** — у каждого проекта свой репозиторий, свои релизы и свои права доступа.
- **Монолит (monolith)** — одно приложение, которое собирается и деплоится целиком. Это ось деплоя, а не хранения кода: монорепо может содержать десять независимо деплоящихся приложений.
- **Атомарное изменение (atomic change)** — правка библиотеки и всех её потребителей в одном коммите или PR: либо всё вместе, либо ничего.
- **Граф проектов (project graph)** — кто от кого зависит: приложение \`shop\` → библиотека \`orders-feature\` → библиотека \`ui\`.
- **Affected (затронутые проекты)** — проекты, которые изменились сами или зависят от изменённых; CI проверяет только их.
- **Кэш вычислений (computation cache)** — сохранённый результат \`build\`/\`test\`/\`lint\` по хэшу входных файлов; при тех же входах задача не запускается, а результат берётся из кэша.
- **Удалённый кэш (remote cache)** — тот же кэш, но общий для CI и всех разработчиков.
- **Nx и Turborepo** — инструменты для монорепо: строят граф, считают affected, кэшируют задачи.
- **Workspaces (npm/pnpm/yarn)** — встроенная в пакетный менеджер поддержка нескольких пакетов в одном репозитории с локальными ссылками друг на друга.
- **Теги и правила границ (module boundaries)** — метки проектов (\`type:ui\`, \`scope:payments\`) и линтер-правило, запрещающее неправильные импорты.
- **CODEOWNERS** — файл, который назначает владельцев путей: PR в \`libs/payments/\` требует ревью команды платежей.
- **Semver** — номер версии \`MAJOR.MINOR.PATCH\`; мажор означает ломающее изменение.
- **Версионный ад (dependency hell)** — разные приложения сидят на разных мажорах общего пакета, и каждое изменение требует цепочки релизов.

## Как это работает под капотом

Монорепо масштабируется не «само», а за счёт инструментов. Механика у Nx и Turborepo похожая:

1. Инструмент читает конфигурации проектов и импорты и строит **граф проектов**. Поэтому он знает, что \`shop\` зависит от \`orders-feature\`, а та — от \`ui\`.
2. При запуске CI он берёт **список изменённых файлов** (\`git diff\` против \`origin/main\`) и сопоставляет файлы проектам.
3. Затем идёт **вверх по графу**: всё, что зависит от изменённого, тоже помечается затронутым. Поэтому правка в \`ui\` проверяет все приложения, а правка в \`admin\` — только \`admin\`.
4. Для каждой задачи (\`build\`, \`test\`, \`lint\`) считается **хэш входов**: исходники проекта, его зависимостей, конфиги, версия инструмента, сама команда.
5. Если такой хэш уже есть в кэше (локальном или удалённом), задача **не выполняется**: результат и логи берутся из кэша. Поэтому повторный прогон CI на том же коде занимает секунды.
6. Отдельно линтер с **правилами границ** проверяет каждый импорт по тегам, поэтому через год «всё не импортирует всё».

В полирепо механика другая: граф «размазан» по реестру пакетов. Связь между репозиториями — это строка версии в \`package.json\`, и совместимость проверяется только тогда, когда потребитель сам обновит пакет.

### Пример 1. Минимальный монорепо на npm workspaces

\`\`\`json
{ "name": "acme", "private": true, "workspaces": ["libs/*", "apps/*"] }
\`\`\`

\`\`\`text
libs/ui/package.json     → { "name": "@acme/ui" }
apps/shop/package.json   → { "dependencies": { "@acme/ui": "*" } }
apps/admin/package.json  → { "dependencies": { "@acme/ui": "*" } }
\`\`\`

\`\`\`bash
npm install
ls -la node_modules/@acme/
# admin -> ../../apps/admin
# shop -> ../../apps/shop
# ui -> ../../libs/ui

npm ls --all
# acme@
# +-- @acme/admin@1.0.0 -> ./apps/admin
# | \`-- @acme/ui@1.0.0 deduped -> ./libs/ui
# +-- @acme/shop@1.0.0 -> ./apps/shop
# | \`-- @acme/ui@1.0.0 deduped -> ./libs/ui
# \`-- @acme/ui@1.0.0 -> ./libs/ui
\`\`\`

Почему так: пакетный менеджер не скачивает \`@acme/ui\` из реестра, а кладёт в \`node_modules\` символическую ссылку на папку \`libs/ui\`. Приложения импортируют библиотеку как обычный пакет, но видят её текущий код — без публикации и без версий.

### Пример 2. Одно изменение API: монорепо против полирепо

\`\`\`bash
# монорепо: библиотека и все потребители — один коммит, один зелёный CI
git show --stat HEAD
# ui: button takes options object; migrate shop and admin
#  apps/admin/users.ts | 2 +-
#  apps/shop/cart.ts   | 2 +-
#  libs/ui/button.ts   | 2 +-
#  3 files changed, 3 insertions(+), 3 deletions(-)

nx affected -t lint test build --base=origin/main

# полирепо: то же изменение
# 1) PR в ui-kit  2) релиз ui-kit@3.0.0  3) PR в app-a  4) PR в app-b  5) молиться
\`\`\`

Почему так: в монорепо компилятор проверяет совместимость **в момент правки** — если вы забыли поправить \`admin\`, сборка упадёт в этом же PR. В полирепо — только после релиза пакета, у каждого потребителя отдельно и в разное время, иногда через месяцы.

### Пример 3. Как считается \`affected\` (упрощённая модель)

\`\`\`js
const projects = {
  'ui':             { root: 'libs/ui',             deps: [] },
  'utils':          { root: 'libs/utils',          deps: [] },
  'orders-feature': { root: 'libs/orders-feature', deps: ['ui', 'utils'] },
  'users-feature':  { root: 'libs/users-feature',  deps: ['ui'] },
  'shop':           { root: 'apps/shop',           deps: ['orders-feature'] },
  'admin':          { root: 'apps/admin',          deps: ['users-feature', 'utils'] },
};

function affected(changedFiles) {
  // 1. файл -> проект
  const touched = Object.entries(projects)
    .filter(([, p]) => changedFiles.some(f => f.startsWith(p.root + '/')))
    .map(([name]) => name);
  // 2. обратный граф: кто от меня зависит
  const dependents = {};
  for (const [name, p] of Object.entries(projects))
    for (const d of p.deps) (dependents[d] ??= []).push(name);
  // 3. обход в ширину вверх по зависимостям
  const result = new Set(touched);
  const queue = [...touched];
  while (queue.length) {
    for (const parent of dependents[queue.shift()] ?? [])
      if (!result.has(parent)) { result.add(parent); queue.push(parent); }
  }
  return [...result];
}

console.log(affected(['apps/admin/src/main.ts']));         // [ 'admin' ]
console.log(affected(['libs/users-feature/src/list.ts'])); // [ 'users-feature', 'admin' ]
console.log(affected(['libs/ui/src/button.ts']));
// [ 'ui', 'orders-feature', 'users-feature', 'shop', 'admin' ]
console.log(affected(['libs/utils/src/date.ts']));
// [ 'utils', 'orders-feature', 'admin', 'shop' ]
\`\`\`

Почему так: правка в листовом приложении проверяет одно приложение, а правка в базовой библиотеке — всех, кто на ней стоит. Отсюда практический вывод: чем мельче и точнее библиотеки, тем меньше «радиус поражения» каждого PR. В реальных инструментах ещё учитываются глобальные файлы: изменение lock-файла или корневого конфига обычно помечает затронутыми многие или все проекты.

### Пример 4. Кэш вычислений: «уже собирали — не собираем»

\`\`\`js
const { createHash } = require('node:crypto');
const cache = new Map();

function runTarget(project, target, files) {
  const hash = createHash('sha256')
    .update(project + ':' + target)
    .update(JSON.stringify(files))
    .digest('hex').slice(0, 8);
  if (cache.has(hash)) return \`cache hit  \${hash}\`;
  cache.set(hash, \`\${target} ok\`); // здесь была бы настоящая сборка или тесты
  return \`executed   \${hash}\`;
}

const v1 = { 'button.ts': 'export const a = 1;' };
console.log(runTarget('ui', 'test', v1));                                 // executed   (хэш A)
console.log(runTarget('ui', 'test', { ...v1 }));                          // cache hit  (тот же хэш A)
console.log(runTarget('ui', 'test', { 'button.ts': 'export const a = 42;' })); // executed (новый хэш B)
console.log(runTarget('ui', 'test', v1));                                 // cache hit  (снова хэш A)
\`\`\`

Почему так: результат задачи — чистая функция от входов. Если входы те же, байт в байт, то и результат тот же, поэтому его можно не пересчитывать. Удалённый кэш делает так, что тесты, прогнанные на машине коллеги или в CI, у вас не запустятся повторно.

### Nx

Nx — самый распространённый инструмент для Angular-монорепо: генераторы приложений и библиотек, граф проектов (\`nx graph\` рисует его в браузере), \`nx affected\`, локальный и удалённый кэш, правила границ. Пример тегов и ограничений:

\`\`\`json
// libs/payments/feature/project.json
{ "tags": ["scope:payments", "type:feature"] }

// правило ESLint
"@nx/enforce-module-boundaries": ["error", {
  "depConstraints": [
    { "sourceTag": "type:app",     "onlyDependOnLibsWithTags": ["type:feature", "type:ui", "type:util"] },
    { "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:feature", "type:ui", "type:util", "type:data-access"] },
    { "sourceTag": "type:ui",      "onlyDependOnLibsWithTags": ["type:ui", "type:util"] },
    { "sourceTag": "scope:payments", "onlyDependOnLibsWithTags": ["scope:payments", "scope:shared"] }
  ]
}]
\`\`\`

Если библиотека \`ui\` попробует импортировать что-то из фичи платежей, линтер упадёт ещё в PR. Это и есть «enforce-границы»: архитектура проверяется автоматически, а не на честном слове.

### Turborepo

Turborepo — более лёгкий инструмент поверх workspaces: описываете задачи и их зависимости в \`turbo.json\`, он строит граф, запускает задачи параллельно и кэширует результаты (есть удалённый кэш). Фильтр по изменениям выглядит, например, так: \`turbo run build --filter=...[origin/main]\` — изменённые пакеты и всё, что от них зависит. Генераторов и правил границ уровня Nx у него нет, поэтому его чаще берут для небольших JS/TS-монорепо.

### CODEOWNERS и права доступа

\`\`\`text
# .github/CODEOWNERS — побеждает последнее подходящее правило
*                    @acme/frontend-core
/libs/ui/            @acme/design-system
/libs/payments/      @acme/payments-team
\`\`\`

При включённой защите ветки PR, который трогает \`libs/payments/\`, нельзя слить без ревью команды платежей. Но это контроль **записи**: читать весь репозиторий может любой, у кого есть доступ. Если подрядчик не должен видеть код платежей, это аргумент за отдельный репозиторий.

### Перенос истории: \`git subtree\` и \`filter-repo\`

\`\`\`bash
git subtree add --prefix=apps/billing ../legacy-billing main
git log --format='%s'
# Add 'apps/billing/' from commit '40536d0...'
# ui: button takes options object; migrate shop and admin
# billing: VAT calculation
# init monorepo
# billing: invoices
\`\`\`

История старого репозитория переезжает вместе с кодом. Нюанс: в старых коммитах файлы лежат по старым путям, поэтому \`git log -- apps/billing\` покажет только коммит слияния. Если важна история по путям, историю переносимого репозитория заранее переписывают в подпапку (\`git filter-repo --to-subdirectory-filter apps/billing\`) и потом сливают. Переносят по одному проекту, а не всё сразу.

### Монорепо

- **Что это:** все приложения и общие библиотеки в одном репозитории, связи — локальные импорты, одна версия каждой библиотеки.
- **Плюсы:** атомарные изменения через несколько пакетов в одном PR; единые тулинг, версии зависимостей и стандарты; простой code-sharing и рефакторинг с глобальной видимостью; с \`affected\` и кэшем CI остаётся быстрым.
- **Минусы:** без инфраструктуры (граф, кэш) CI деградирует; без правил границ появляется жёсткая связанность; контроль доступа грубее; огромная история и медленные Git-операции без оптимизаций вроде \`git clone --filter=blob:none\` и \`git sparse-checkout\`.
- **Когда брать:** одна организация с множеством взаимозависимых фронтенд-проектов, общей дизайн-системой и утилитами, когда нужны атомарные рефакторинги.

### Полирепо

- **Что это:** у каждого проекта свой репозиторий, общий код публикуется пакетами в приватный реестр, связи — версии в \`package.json\`.
- **Плюсы:** сильная изоляция; независимые владение, права доступа и релизы; простая ментальная модель — один репозиторий помещается в голову.
- **Минусы:** версионный ад общих пакетов — смена API требует цепочки релизов; дублирование тулинга и дрейф стандартов; кросс-репо рефакторинг болезненный; локальная отладка библиотеки внутри приложения требует \`npm link\` или аналогов.
- **Когда брать:** продукты слабо связаны, живут в разных организациях или комплаенс-границах, релизятся независимо; помогают Renovate/Dependabot для автообновления версий и changesets для changelog.

### Как выбрать

- Много приложений одной организации, общая дизайн-система, частые сквозные изменения — монорепо с Nx или Turborepo.
- Слабо связанные продукты, разные заказчики, требования изоляции доступа — полирепо.
- Монорепо без бюджета на инфраструктуру (кэш, \`affected\`, правила границ) — хуже полирепо; не начинайте его «голым».
- Полирепо с десятком общих пакетов, которые меняются каждую неделю, — признак, что координация стоит дороже изоляции, пора думать о монорепо.
- Возможен гибрид: монорепо на команду или домен плюс несколько общих пакетов через реестр.

### Где это применяется на практике

- **Enterprise-портал из нескольких Angular-приложений** (клиентский портал, админка, back-office) с общими \`ui\`, \`data-access\` и \`util\` — классический Nx-монорепо.
- **Дизайн-система:** в монорепо меняется вместе со всеми потребителями в одном PR; в полирепо — npm-пакет с семвером и миграциями.
- **Микрофронтенды:** код часто лежит в одном монорепо, а деплоится независимо — хранение и деплой это разные оси.
- **Подрядчики и комплаенс:** код с ограниченным доступом выносят в отдельный репозиторий, потому что права на чтение папки Git не даёт.
- **Слияние компаний:** перенос внешних репозиториев в монорепо по одному с сохранением истории.

## Важные нюансы и подводные камни

- **Монорепо без границ — это не монорепо, а монолит.** Через год всё импортирует всё, и разделить уже нельзя. Теги и правила границ нужны с первого дня.
- **Монорепо без кэша и \`affected\`.** CI на 40 минут для правки одной строки убивает всю выгоду.
- **Путать монорепо с монолитом деплоя.** В монорепо приложения по-прежнему деплоятся независимо — это разные оси.
- **Полирепо и «мы просто быстро зарелизим пакет».** На практике потребители обновляются месяцами, и вы поддерживаете три мажора одновременно.
- **Копипаста вместо общего пакета в полирепо.** Фикс безопасности придётся вносить в семь мест, и в двух про него забудут.
- **Ромбовидные зависимости в полирепо.** Приложение тянет \`ui@3\`, а подключённая фича-библиотека — \`ui@2\`: в бандле две копии компонентов или конфликт \`peerDependencies\`.
- **Глобальные файлы ломают \`affected\`.** Правка lock-файла или корневого \`tsconfig\` делает затронутым почти всё — такие изменения лучше выносить в отдельные PR.
- **Права доступа в монорепо грубее.** CODEOWNERS регулирует ревью, но не чтение; секретный код в монорепо не спрячешь.
- **Единая версия зависимостей — и плюс, и минус.** Обновление Angular делается сразу для всех приложений: меньше разброса, но одно отстающее приложение тормозит всех.

**Плюсы:** монорепо — атомарные изменения, единые стандарты и одна версия общего кода; полирепо — изоляция, независимые релизы и простые права доступа.
**Минусы:** монорепо требует инфраструктуры (граф, кэш, границы) и дисциплины; полирепо платит версионным адом, дублированием тулинга и дорогими сквозными изменениями.

## Как это спрашивают на собеседовании

**Главный вывод:** монорепо переносит сложность в тулинг (граф, \`affected\`, кэш, правила границ), полирепо — в процессы релизов и версионирования. Выбор — это стоимость координации против стоимости изоляции.

Типичные формулировки: «Монорепо или полирепо для пяти Angular-приложений с общей дизайн-системой?», «Какие минусы у монорепо?», «Как держать CI быстрым в большом монорепо?».

Что могут спросить следом:

- *Как дать разные права на разные части монорепо?* — CODEOWNERS плюс защита веток регулируют ревью; чтение так не ограничить, для этого нужен отдельный репозиторий.
- *Как мигрировать из полирепо в монорепо с историей?* — По одному проекту через \`git subtree add\` или \`git filter-repo --to-subdirectory-filter\` и слияние.
- *Чем монорепо отличается от монолита?* — Монорепо — способ хранения кода, монолит — способ деплоя; в монорепо приложения деплоятся независимо.
- *Как ускорить CI?* — \`affected\` вместо прогона всего, локальный и удалённый кэш, параллельный запуск задач.
- *Nx или Turborepo?* — Nx богаче (генераторы, правила границ, плагины для Angular), Turborepo проще и легче для небольших JS-репозиториев.

### Ответ на 1 минуту

> Монорепо — это один репозиторий на много проектов, полирепо — репозиторий на проект. Монорепо даёт атомарные изменения: правлю API библиотеки и всех потребителей в одном PR, и компилятор сразу проверяет совместимость; плюс единые тулинг, версии и стандарты. Цена — инфраструктура: Nx или Turborepo строят граф проектов, считают affected по git diff и кэшируют задачи по хэшу входов, иначе CI деградирует; нужны теги и правила границ, иначе всё связывается со всем; права доступа грубее — CODEOWNERS регулирует ревью, но не чтение. Полирепо даёт изоляцию, независимые релизы и простую ментальную модель, но платит версионным адом общих пакетов, дублированием тулинга и дорогими сквозными рефакторингами. Монорепо переносит сложность в тулинг, полирепо — в процессы релизов. Поэтому одна организация со взаимозависимыми проектами и общей дизайн-системой — монорепо, слабо связанные продукты в разных комплаенс-границах — полирепо.`,
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
      ru: `## В чём суть

Обе модели отвечают на вопрос «каких тестов сколько писать». **Пирамида** (Mike Cohn): широкий фундамент из unit-тестов, поменьше интеграционных, совсем чуть-чуть end-to-end. **Трофей** (Kent C. Dodds, специально про фронтенд): внизу статика — типы и линтер, а самая широкая часть — **интеграционные** тесты; unit и e2e тоньше. Для фронтенда обычно выбирают трофей, потому что ценность интерфейса — в том, как части работают вместе.

Аналогия: дом. Фундамент дешёвый, быстрый и держит всё — это статика и unit. Крыша дорогая, ставится долго и в ветер шатается — это e2e. Дом только из крыши не стоит, дом из одного фундамента бесполезен. Разница между пирамидой и трофеем в том, что во фронтенде «фундамент» — это не микротесты каждой функции, а типы плюс проверка того, что экран целиком работает.

**Какую проблему решает.** Тесты стоят денег: их пишут, поддерживают и ждут в CI. Без стратегии команда скатывается в одну из крайностей. Либо сотни unit-тестов на внутренности компонентов, которые ломаются при каждом рефакторинге и не ловят реальных багов. Либо сотни e2e, которые идут сорок минут, падают через раз, и им перестают верить. Модель помогает распределить усилия так, чтобы получить максимум уверенности за минимум времени.

## Словарик терминов

- **Тестовая стратегия (testing strategy)** — договорённость, какие виды тестов писать, на что и в каких пропорциях.
- **Статический анализ (static analysis)** — проверка кода без запуска: компилятор TypeScript, ESLint.
- **Unit-тест** — проверка одной маленькой единицы (функции, класса) в изоляции от остального.
- **Интеграционный / компонентный тест (integration / component test)** — компонент вместе с шаблоном, дочерними компонентами и сервисами; заменяется только внешний мир (сеть).
- **E2E-тест (end-to-end)** — настоящий браузер кликает по настоящему приложению, как пользователь, обычно против тестового бэкенда.
- **Flaky-тест** — тест, который то проходит, то падает без изменений кода: из-за таймингов, сети, порядка запуска.
- **Детали реализации (implementation details)** — то, чего пользователь не видит: имена приватных методов, внутренние поля, CSS-классы.
- **Граница мока (mocking boundary)** — место, где реальный код заменяется подделкой. Для фронтенда разумная граница — HTTP.
- **\`HttpTestingController\`** — подделка HTTP-бэкенда в Angular-тестах: запрос не уходит в сеть, тест сам решает, что ответить.
- **Покрытие (coverage)** — доля строк или веток, выполненных тестами. Показывает, что код запускался, но не то, что он проверен.
- **Рожок мороженого (ice-cream cone)** — перевёрнутая пирамида: много ручных и e2e-тестов, мало unit. Антипаттерн.
- **Testing Library** — семейство библиотек (\`@testing-library/angular\`), которое ищет элементы так, как пользователь: по роли, подписи и тексту.
- **Vitest, Jasmine/Karma, Jest** — раннеры unit- и компонентных тестов. В Angular 21 CLI раннер по умолчанию — Vitest с jsdom; раньше был Karma с Jasmine.
- **Playwright, Cypress** — инструменты для e2e-тестов в настоящем браузере.

## Как это работает под капотом

Любой тест — это компромисс между двумя величинами: **стоимостью** (время написания, скорость прогона, стабильность, точность сообщения об ошибке) и **уверенностью** (насколько тест похож на то, что делает пользователь). Модели — это способ этот компромисс распределить:

1. Чем ближе тест к пользователю, тем больше уверенности он даёт: e2e доказывает, что логин работает на самом деле.
2. Но чем ближе к пользователю, тем тест дороже: браузер, сервер, данные, сеть — каждый слой добавляет секунды и источники нестабильности, поэтому таких тестов должно быть мало.
3. Чем ниже уровень, тем тест дешевле и точнее указывает на поломку, но тем меньше он говорит о работе системы целиком: зелёные unit-тесты не гарантируют, что компоненты правильно склеены.
4. Пирамида исходит из того, что основная логика сидит в отдельных функциях и классах, поэтому делает ставку на дешёвые unit-тесты.
5. Во фронтенде основная логика сидит **на стыках**: шаблон, привязки, сервисы, роутинг, обработка ошибок HTTP. Поэтому трофей делает ставку на интеграционный уровень — он ещё дешёвый (секунды в jsdom), но уже проверяет склейку.
6. Статика стоит в основании трофея, потому что ловит целый класс ошибок вообще без написания тестов.

### Пирамида тестирования (Mike Cohn)

- **Что это:** широкое основание из unit-тестов, средний слой интеграционных (у Кона — service-тесты), узкая верхушка UI/e2e. Модель популяризирована в книге «Succeeding with Agile» (2009) и статьях Мартина Фаулера.
- **Почему так:** в эпоху Selenium UI-тесты были медленными и хрупкими, а основная логика жила в бэкенд-классах — её выгоднее всего проверять unit-тестами.
- **Когда подходит:** библиотеки утилит, сложные алгоритмы, доменная логика, бэкенд, NgRx-редьюсеры и селекторы.

### Трофей тестирования (Kent C. Dodds)

- **Что это:** четыре слоя снизу вверх — статика, unit, интеграционные (самый толстый), e2e. Лозунг, от которого отталкивается модель, — фраза Гильермо Рауха «Write tests. Not too many. Mostly integration.»
- **Почему так:** UI-юниты обычно проверяют детали реализации, ломаются от любого рефакторинга и мало что говорят о реальной работе. Интеграционный тест с настоящим DOM и замоканной сетью проверяет поведение, а не устройство.
- **Когда подходит:** большинство фронтенд-приложений: формы, таблицы, дашборды, где ценность — в склейке шаблона, сервисов и HTTP.

### Рожок мороженого — антипаттерн

Перевёрнутая пирамида: много e2e и ручных проверок, мало unit и интеграционных. Обычно появляется, когда тесты пишет отдельная QA-команда «снаружи», а разработчики не пишут ничего. Итог — сорокаминутный CI, который падает через раз, и сообщения об ошибке вида «не нашёл кнопку», по которым непонятно, что сломалось.

### Уровень 1. Статика: баги, пойманные без единого теста

\`\`\`ts
export function formatPrice(amount: number, currency: 'USD' | 'EUR' = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

formatPrice('1234');
formatPrice(10, 'RUB');
const user: { name: string } | undefined = loadUser();
console.log(user.name);
\`\`\`

\`\`\`text
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
error TS2345: Argument of type '"RUB"' is not assignable to parameter of type '"USD" | "EUR" | undefined'.
error TS18048: 'user' is possibly 'undefined'.
\`\`\`

Три бага, которые иначе ловили бы тестами или пользователи в проде, отсекает \`tsc --strict\` за секунды. ESLint добавляет то, что не видит компилятор: забытый \`await\` у промиса, неиспользуемые подписки, нарушения архитектурных границ. Поэтому статика — полноценная часть тестовой стратегии.

### Уровень 2. Unit: чистая логика

\`\`\`ts
import { describe, it, expect } from 'vitest';

describe('formatPrice', () => {
  it('formats dollars', () => expect(formatPrice(1234.5)).toBe('$1,234.50'));
  it('formats euros', () => expect(formatPrice(1234.5, 'EUR')).toBe('€1,234.50'));
  it('formats negatives', () => expect(formatPrice(-3)).toBe('-$3.00'));
});
// ✓ formats dollars
// ✓ formats euros
// ✓ formats negatives
\`\`\`

Чистая функция — идеальный кандидат для unit-теста: никаких зависимостей, тест пишется за минуту, работает миллисекунды и при падении точно указывает место. Сюда же — редьюсеры, селекторы, валидаторы, парсеры, расчёт итогов.

### Уровень 3. Интеграционный тест компонента: основной объём

Компонент формы заказа: поле, кнопка, сообщение об ошибке, вызов API через сервис \`OrdersApi\` (он делает \`http.post('/api/orders', order)\`).

\`\`\`ts
@Component({
  selector: 'app-order-form',
  template: \`
    <input id="title" #title />
    <button type="button" (click)="save(title.value)" [disabled]="saving()">Сохранить</button>
    @if (error()) { <p role="alert">{{ error() }}</p> }\`,
})
export class OrderFormComponent {
  private api = inject(OrdersApi);
  saving = signal(false);
  error = signal('');
  save(title: string) {
    this.saving.set(true);
    this.api.save({ title }).subscribe({
      next: () => this.saving.set(false),
      error: () => { this.error.set('Не удалось сохранить заказ'); this.saving.set(false); },
    });
  }
}
\`\`\`

Тест мокает только сеть, всё остальное — настоящее:

\`\`\`ts
it('shows an error when saving fails', async () => {
  TestBed.configureTestingModule({
    imports: [OrderFormComponent],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(OrderFormComponent);
  await fixture.whenStable();
  const el: HTMLElement = fixture.nativeElement;

  el.querySelector<HTMLInputElement>('#title')!.value = 'Ноутбук';
  const button = el.querySelector<HTMLButtonElement>('button')!;
  button.click();
  await fixture.whenStable();
  expect(button.disabled).toBe(true);              // пока идёт запрос, кнопка заблокирована

  const req = http.expectOne('/api/orders');
  expect(req.request.body).toEqual({ title: 'Ноутбук' });
  req.flush(null, { status: 500, statusText: 'Server Error' });
  await fixture.whenStable();

  expect(el.querySelector('[role="alert"]')?.textContent).toBe('Не удалось сохранить заказ');
  expect(button.disabled).toBe(false);             // после ошибки кнопка снова активна
  http.verify();
});
\`\`\`

Почему так: тест не знает ни имён приватных методов, ни как устроены сигналы внутри — он вводит текст, жмёт кнопку и смотрит на экран. Один такой тест проверяет шаблон, привязки, сервис, формирование HTTP-запроса и обработку ошибки. Сеть подменена на уровне HTTP, поэтому собственный код приложения (сервис \`OrdersApi\`) работает по-настоящему. Тот же тест с \`@testing-library/angular\` читается ещё ближе к пользователю:

\`\`\`ts
await render(OrderFormComponent, { providers: [provideHttpClient(), provideHttpClientTesting()] });
await userEvent.click(screen.getByRole('button', { name: /сохранить/i }));
TestBed.inject(HttpTestingController).expectOne('/api/orders').flush(null, { status: 500, statusText: 'Server Error' });
expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить заказ');
\`\`\`

### Уровень 4. E2E: только критичные сценарии

\`\`\`ts
import { test, expect } from '@playwright/test';

test('покупатель оформляет заказ', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('anna@example.com');
  await page.getByLabel('Пароль').fill('secret');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.getByRole('link', { name: 'Каталог' }).click();
  await page.getByRole('button', { name: 'В корзину' }).first().click();
  await page.getByRole('button', { name: 'Оформить' }).click();
  await expect(page.getByRole('status')).toContainText('сохранён');
});
\`\`\`

Этот тест проходит через настоящий браузер, роутинг, авторизацию и бэкенд. Он даёт уверенность, которую не даст никакой другой, но стоит в десятки раз дороже по времени и стабильности. Поэтому e2e пишут на счастливый путь критичных сценариев — вход, оплата, оформление заказа, — а ветки и ошибки проверяют уровнем ниже.

### Почему тесты на детали реализации вредны

\`\`\`ts
class CartV1 {                       // до рефакторинга
  items: number[] = []; total = 0;
  add(price: number) { this.items.push(price); this.recalc(); }
  recalc() { this.total = this.items.reduce((s, p) => s + p, 0); }
}
class CartV2 {                       // после: тот же контракт, другое устройство
  items: number[] = [];
  get total() { return this.items.reduce((s, p) => s + p, 0); }
  add(price: number) { this.items.push(price); }
}

it('implementation detail: calls recalc', () => {
  const cart = new Cart() as any;
  const spy = vi.spyOn(cart, 'recalc');
  cart.add(10);
  expect(spy).toHaveBeenCalledTimes(1);
});
it('behaviour: total is sum', () => {
  const cart = new Cart();
  cart.add(10); cart.add(5);
  expect(cart.total).toBe(15);
});

// CartV1: ✓ implementation detail   ✓ behaviour
// CartV2: × implementation detail — Error: The property "recalc" is not defined on the object.
//         ✓ behaviour
\`\`\`

Пользователь не заметил рефакторинга — сумма считается так же. Тест поведения это подтверждает, а тест деталей краснеет и требует правки, ничего не сообщив о реальных багах. Сотня таких тестов превращает любой рефакторинг в день починки тестов.

### Инструменты по уровням

- **Статика:** TypeScript со \`strict\`, \`strictTemplates\` для шаблонов Angular, ESLint с \`angular-eslint\`.
- **Unit и интеграционные:** Vitest (раннер по умолчанию в Angular 21 CLI, \`ng test\`), Jasmine с Karma (прежний стандарт, много в существующих проектах), Jest (часто через \`jest-preset-angular\`); поверх них \`TestBed\` и, по желанию, Testing Library.
- **Подмена сети:** \`HttpTestingController\` внутри Angular DI или MSW, который перехватывает запросы на сетевом уровне и работает и в тестах, и в браузере.
- **E2E:** Playwright или Cypress против тестового стенда.

### Как выбрать

- Фронтенд-приложение с формами, таблицами и дашбордами — трофей: основной объём в интеграционных тестах компонентов с моком HTTP.
- Библиотека утилит, сложные расчёты, доменная логика, NgRx-редьюсеры — пирамида: много быстрых unit-тестов.
- В любом случае статику включают на максимум: \`strict\`, \`strictTemplates\`, ESLint в CI.
- E2E — только на критичные сценарии; если их больше пары десятков минут прогона, часть переносят уровнем ниже.
- Пропорции — ориентир, а не закон: смотрите, где у вас реально рождаются баги, и усиливайте этот уровень.

### Где это применяется на практике

- **Enterprise-формы:** интеграционные тесты проверяют валидацию, блокировку кнопки и показ ошибок сервера; unit — сложные валидаторы и маппинг DTO.
- **Большие таблицы данных:** unit — сортировка, фильтры, форматирование ячеек; интеграционные — что грид получает данные и реагирует на фильтр; e2e — один сценарий «найти и открыть запись».
- **HTTP-слой:** сервисы и интерсепторы тестируются через \`HttpTestingController\`: формирование запроса, повторы, обработка 401 и 500.
- **Дашборды:** интеграционные тесты на виджеты с замоканными ответами API, визуальная регрессия на графики.
- **CI-пайплайн:** статика и unit на каждый коммит за минуты, интеграционные — на каждый PR, e2e — перед релизом или ночью.

## Важные нюансы и подводные камни

- **Рожок мороженого.** Много e2e и мало unit: сорокаминутный CI, который падает через раз и которому перестают верить.
- **100% покрытия как цель.** Покрытие показывает, что строка выполнилась, а не что результат проверен; можно покрыть всё и не поймать ни одного реального бага.
- **Тесты на детали реализации.** Проверка приватных методов, вызовов конкретных функций, CSS-классов вместо ролей и текста — такие тесты ломает любой рефакторинг.
- **Мок не на той границе.** Мокать свой сервис приложения вместо HTTP означает, что тест перестаёт проверять собственный код приложения.
- **E2E на все ветки** вместо счастливого пути: время прогона растёт линейно, а ценность — нет.
- **Flaky-тесты лечат, а не ретраят.** Карантин и расследование причины, а не \`retries: 3\` навсегда: ретрай прячет настоящие гонки в коде.
- **«Интеграционный» тест, который поднимает всё приложение** с реальным бэкендом, — уже медленный e2e в jsdom со всеми его минусами.
- **Статика — часть стратегии.** Без \`strict\` и \`strictTemplates\` вы вручную пишете тесты на то, что компилятор поймал бы бесплатно.

**Плюсы:** трофей даёт максимум уверенности на единицу времени для UI и тесты, переживающие рефакторинг; пирамида даёт быстрые и точные тесты для логики.
**Минусы:** интеграционный тест при падении указывает место менее точно, чем unit; e2e дорогие и нестабильные; обе модели — эвристики, а не готовые пропорции.

## Как это спрашивают на собеседовании

**Главный вывод:** пирамида — много unit, мало e2e; трофей — статика в основании и интеграционные тесты как основной объём. Для фронтенда я выбираю трофей и тестирую поведение, а не реализацию.

Типичные формулировки: «Какие тесты вы пишете на фронтенде и почему?», «Что такое testing pyramid?», «Почему не стоит писать e2e на всё?».

Что могут спросить следом:

- *Где вы ставите границу мока?* — На HTTP: \`HttpTestingController\` или MSW; свои сервисы работают по-настоящему.
- *Что делать с flaky e2e?* — Карантин плюс расследование причины, а не постоянный \`retry\`.
- *Почему статика — часть тестовой стратегии?* — Типы и линтер ловят целый класс багов без единого теста и почти бесплатно.
- *Какой процент покрытия нужен?* — Покрытие — индикатор пробелов, а не цель; важнее, что тесты проверяют поведение.
- *Чем раннер по умолчанию в Angular 21 отличается от прежнего?* — Теперь это Vitest с jsdom вместо Karma с Jasmine в браузере.

### Ответ на 1 минуту

> Пирамида Кона — это много unit-тестов внизу, меньше интеграционных и минимум e2e; логика в том, что чем выше уровень, тем тест дороже, медленнее и нестабильнее. Трофей Кента Доддса адаптирует это под фронтенд: в основании статика — TypeScript со strict и ESLint, самая широкая часть — интеграционные тесты, а unit и e2e тоньше. Девиз — тестируй поведение, а не реализацию. Для фронтенда я выбираю трофей, потому что UI-юниты обычно проверяют детали реализации и ломаются от любого рефакторинга, а интеграционный тест компонента с настоящим DOM и сетью, замоканной на HTTP-границе через HttpTestingController, проверяет то, что видит пользователь. Раскладка: unit — на чистую логику вроде форматтеров и редьюсеров, интеграционные — основной объём, e2e на Playwright — только критичные сценарии вроде логина и оплаты. Главный антипаттерн — рожок мороженого: много e2e и мало остального, и CI становится медленным и нестабильным.`,
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
      ru: `## В чём суть

Вопрос только в одном: **рендерим ли мы настоящих детей компонента или подменяем их картонными заглушками**. Deep-тест рендерит компонент со всеми реальными дочерними компонентами — всё по-честному. Shallow-тест заменяет детей пустышками с теми же селекторами и тем же контрактом входов и выходов, чтобы проверить только сам компонент.

Аналогия: краш-тест автомобиля. Deep — вы сажаете в машину живого человека: максимально реалистично, но дорого, страшно, и результат зависит от того, как человек себя чувствовал. Shallow — сажаете манекен: быстро, повторяемо, вы проверяете именно конструкцию кузова. Только не забывайте, что манекен не расскажет, удобно ли на самом деле сидеть.

**Какую проблему решает.** У компонента списка пользователей может быть десять уровней детей: карточки, аватары, меню, тултипы, каждый со своими сервисами. Если тестировать всё дерево, тест списка падает из-за бага в тултипе, тянет в TestBed половину приложения и становится медленным. Если заглушить всё, тест быстрый, но не заметит, что родитель передаёт карточке не тот объект. Понимание shallow и deep позволяет осознанно выбрать, что именно проверяет конкретный тест.

## Словарик терминов

- **TestBed** — тестовое окружение Angular: мини-приложение с DI, в котором создаются компоненты и сервисы для теста.
- **Фикстура (\`ComponentFixture\`)** — обёртка вокруг созданного компонента: доступ к экземпляру (\`componentInstance\`), DOM (\`nativeElement\`), запуску обнаружения изменений.
- **Deep-тест (integration test)** — компонент рендерится со всеми настоящими дочерними компонентами.
- **Shallow-тест** — дочерние компоненты заменены заглушками, проверяется только логика и шаблон самого компонента.
- **Заглушка компонента (mock / stub component)** — пустой компонент с тем же селектором и теми же \`input\`/\`output\`, но без шаблона и логики.
- **Контракт компонента** — его публичный интерфейс: селектор, входы (\`input\`, \`@Input\`), выходы (\`output\`, \`@Output\`).
- **\`overrideComponent\`** — метод TestBed, который подменяет метаданные компонента (например, список \`imports\`) только в этом тесте.
- **Схемы \`NO_ERRORS_SCHEMA\` / \`CUSTOM_ELEMENTS_SCHEMA\`** — настройки, которые разрешают в шаблоне неизвестные элементы и свойства вместо ошибки.
- **\`errorOnUnknownElements\` / \`errorOnUnknownProperties\`** — флаги TestBed: бросать ошибку или только писать в консоль, если в шаблоне неизвестный тег (NG0304) или свойство (NG0303).
- **ng-mocks** — сторонняя библиотека, которая автоматически генерирует заглушки компонентов, директив и сервисов (\`MockComponent\`).
- **AOT и JIT** — компиляция шаблонов заранее при сборке (AOT) или во время выполнения (JIT). Переопределённые в тесте компоненты Angular компилирует в JIT.
- **Zoneless** — режим без zone.js, по умолчанию для новых проектов Angular 21: изменения подхватываются через сигналы, а не через перехват всех асинхронных событий.

## Как это работает под капотом

Разница возникает в момент, когда TestBed компилирует шаблон родителя и сопоставляет теги с компонентами:

1. Standalone-компонент перечисляет детей в своём \`imports\`. Когда TestBed создаёт его, Angular для каждого тега в шаблоне ищет совпадение среди селекторов из \`imports\`.
2. В **deep-тесте** \`imports\` не трогаем, поэтому \`<app-user-card>\` превращается в настоящий \`UserCardComponent\` со своим шаблоном, сервисами и детьми.
3. В **shallow-тесте** мы через \`overrideComponent\` подменяем \`imports\` на заглушку с тем же селектором. Angular перекомпилирует родителя (в JIT) и сопоставляет тег уже с заглушкой: шаблон заглушки пустой, логики нет.
4. При этом рантайм всё ещё сверяет привязки: если родитель пишет \`[user]="u"\`, а у заглушки нет входа \`user\`, будет ошибка NG0303. Поэтому заглушка с тем же контрактом сохраняет часть проверки шаблона.
5. Если вместо заглушки просто убрать ребёнка и включить \`NO_ERRORS_SCHEMA\`, Angular перестаёт ругаться на неизвестный тег и неизвестные свойства: тег остаётся пустым элементом, привязки игнорируются, проверка контракта пропадает целиком.
6. Дальше тест работает с фикстурой: находит заглушку через \`By.directive(...)\`, подаёт ей события (\`selected.emit(...)\`) и смотрит, как отреагировал родитель.

### Компоненты для примеров

\`\`\`ts
@Component({
  selector: 'app-user-card',
  template: \`<div class="card">{{ user().name }} <button (click)="selected.emit(user().id)">Выбрать</button></div>\`,
})
export class UserCardComponent {
  user = input.required<{ id: number; name: string }>();
  selected = output<number>();
}

@Component({
  selector: 'app-user-list',
  imports: [UserCardComponent],
  template: \`
    <h2>Пользователи: {{ users.length }}</h2>
    @for (u of users; track u.id) {
      <app-user-card [user]="u" (selected)="onSelect($event)" />
    }
    <p class="chosen">Выбран: {{ chosenId ?? 'никто' }}</p>\`,
})
export class UserListComponent {
  users = [{ id: 1, name: 'Анна' }, { id: 2, name: 'Борис' }];
  chosenId: number | null = null;
  onSelect(id: number) { this.chosenId = id; }
}
\`\`\`

### Deep-тест: настоящие дети, настоящие клики

\`\`\`ts
it('selects a user (deep)', async () => {
  TestBed.configureTestingModule({ imports: [UserListComponent] });
  const fixture = TestBed.createComponent(UserListComponent);
  await fixture.whenStable();
  const el: HTMLElement = fixture.nativeElement;

  console.log(el.textContent!.replace(/\\s+/g, ' ').trim());
  // Пользователи: 2Анна ВыбратьБорис ВыбратьВыбран: никто

  el.querySelectorAll<HTMLButtonElement>('app-user-card button')[1].click();
  await fixture.whenStable();
  console.log(el.querySelector('.chosen')!.textContent);
  // Выбран: 2
});
\`\`\`

Почему так: в DOM видны имена и кнопки из шаблона настоящей карточки, а клик проходит весь путь — кнопка ребёнка → \`output\` → обработчик родителя → перерисовка. Тест ловит реальные баги стыковки, но знает про внутреннюю вёрстку карточки (\`app-user-card button\`) и сломается, если её переделают.

### Shallow-тест: заглушка с тем же контрактом

\`\`\`ts
@Component({ selector: 'app-user-card', template: '' })
class MockUserCardComponent {
  user = input<{ id: number; name: string }>();
  selected = output<number>();
}

it('selects a user (shallow)', async () => {
  TestBed.configureTestingModule({ imports: [UserListComponent] })
    .overrideComponent(UserListComponent, { set: { imports: [MockUserCardComponent] } });
  const fixture = TestBed.createComponent(UserListComponent);
  await fixture.whenStable();
  const el: HTMLElement = fixture.nativeElement;

  console.log(el.textContent!.replace(/\\s+/g, ' ').trim());
  // Пользователи: 2Выбран: никто        ← карточки пустые

  const cards = fixture.debugElement.queryAll(By.directive(MockUserCardComponent));
  console.log(cards.length, cards.map(c => c.componentInstance.user()?.name));
  // 2 [ 'Анна', 'Борис' ]                ← родитель передал правильные данные

  cards[1].componentInstance.selected.emit(2);
  await fixture.whenStable();
  console.log(el.querySelector('.chosen')!.textContent);
  // Выбран: 2                            ← родитель правильно отреагировал на событие
});
\`\`\`

Почему так: тест проверяет ровно ответственность родителя — сколько карточек отрисовано, какие данные им переданы, как обработан \`selected\`. Как карточка выглядит внутри, его не касается, поэтому редизайн карточки этот тест не сломает.

### \`overrideComponent\`: \`set\` против \`remove\`/\`add\`

\`set: { imports: [...] }\` заменяет **весь** массив \`imports\`. Если родитель импортирует ещё \`DatePipe\`, \`RouterLink\` или другие компоненты, они пропадут, и шаблон начнёт падать на неизвестных тегах. Точечная замена надёжнее:

\`\`\`ts
TestBed.overrideComponent(UserListComponent, {
  remove: { imports: [UserCardComponent] },
  add: { imports: [MockUserCardComponent] },
});
\`\`\`

Переопределённый компонент Angular перекомпилирует в рантайме (JIT), даже если в проекте включена AOT-компиляция, поэтому для него работают рантайм-проверки, описанные ниже.

### ng-mocks: заглушки без ручного кода

Писать заглушку для каждого ребёнка вручную скучно, и её контракт легко рассинхронизировать с оригиналом. ng-mocks генерирует заглушку из настоящего класса:

\`\`\`ts
import { MockComponent, ngMocks } from 'ng-mocks';

TestBed.overrideComponent(UserListComponent, {
  remove: { imports: [UserCardComponent] },
  add: { imports: [MockComponent(UserCardComponent)] },
});
const fixture = TestBed.createComponent(UserListComponent);
await fixture.whenStable();

const cards = ngMocks.findAll(fixture, UserCardComponent);
console.log(cards.length, ngMocks.input(cards[0], 'user'));   // 2 { id: 1, name: 'Анна' }
ngMocks.output(cards[0], 'selected').emit(1);
await fixture.whenStable();
// .chosen → "Выбран: 1"
\`\`\`

Заглушка получает ровно те входы и выходы, что у оригинала: добавили в карточку новый \`input\` — заглушка обновилась сама. Это закрывает главный риск ручных моков — расхождение контракта.

### \`NO_ERRORS_SCHEMA\` и \`CUSTOM_ELEMENTS_SCHEMA\`: быстрый, но опасный shallow

Самый ленивый способ «обрезать» детей — убрать их из \`imports\` и разрешить неизвестные теги. Вот что происходит на практике (раннер Vitest из Angular CLI, проверено):

\`\`\`ts
// 1. Ребёнок убран, схемы нет
.overrideComponent(UserListComponent, { set: { imports: [] } });
// ✘ NG0304: 'app-user-card' is not a known element (used in the '_UserListComponent' component template)

// 2. Схема на уровне TestBed — для standalone-компонента НЕ работает
TestBed.configureTestingModule({ schemas: [NO_ERRORS_SCHEMA] })
  .overrideComponent(UserListComponent, { set: { imports: [] } });
// ✘ та же NG0304

// 3. Схема на самом компоненте — тишина
.overrideComponent(UserListComponent, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } });
// ✓ DOM: <h2>Пользователи: 2</h2><app-user-card></app-user-card><app-user-card></app-user-card>
//        <p class="chosen">Выбран: никто</p>  — пустые теги, привязки проигнорированы

// 4. Опечатка в селекторе: <app-usr-card [user]="u" (selected)="onSelect($event)" />
// без схемы:                       ✘ NG0304: 'app-usr-card' is not a known element
// с NO_ERRORS_SCHEMA или CUSTOM_ELEMENTS_SCHEMA:
// ✓ тест зелёный, DOM: <app-usr-card></app-usr-card><app-usr-card></app-usr-card> — карточек нет
\`\`\`

Почему так: схема глушит **все** неизвестные теги и свойства. Она не отличает «я специально не подключил ребёнка» от «я опечатался в селекторе» или «ребёнок больше не принимает этот вход». \`CUSTOM_ELEMENTS_SCHEMA\` мягче (разрешает только теги с дефисом и любые свойства на них), но опечатку \`app-usr-card\` пропускает так же. У standalone-компонента свои \`schemas\`, поэтому схема, переданная в \`configureTestingModule\`, на его шаблон не влияет.

### \`errorOnUnknownElements\` и \`errorOnUnknownProperties\`

По документации TestBed оба флага по умолчанию \`false\`: неизвестный тег или свойство только пишутся в \`console.error\`, а тест остаётся зелёным. Angular CLI в своём Vitest-раннере при инициализации окружения ставит оба в \`true\`, поэтому там неизвестный тег роняет тест. В Jest или старой Karma-конфигурации их стоит включить явно:

\`\`\`ts
// test-setup.ts
getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// с флагами false (проверено): тест зелёный, а в консоли только
// NG0304: 'app-usr-card' is not a known element ...
// NG0303: Can't bind to 'user' since it isn't a known property of 'app-usr-card' ...
\`\`\`

Нюанс: флаги вступают в силу, когда тест вызывает \`TestBed.configureTestingModule(...)\` — в типичном тесте это и так делается в \`beforeEach\`.

### Тест вообще без TestBed: просто \`new\`

Если у компонента много логики и мало шаблона, логику можно проверить как обычный класс. Но с \`inject()\` в полях простой \`new\` упадёт:

\`\`\`ts
new CartSummaryComponent();
// NG0203: The \`_PriceService\` token injection failed. \`inject()\` function must be called
// from an injection context ...

const c = TestBed.runInInjectionContext(() => new CartSummaryComponent());
c.add(100); c.add(50);
console.log(c.total()); // 180  (сумма 150 плюс НДС 20%)
\`\`\`

Это самый быстрый уровень, но он не проверяет шаблон вообще. Хороший знак, что логику пора вынести из компонента в сервис или чистую функцию.

### Как выбрать

- Shallow — для «умных» родителей со сложной логикой: какие данные раздать детям, как реагировать на их события, что показать при пустом списке.
- Deep — для критичных стыков: форма с полями и валидацией, таблица с фильтром, мастер из нескольких шагов, где баг живёт именно между компонентами.
- Deep по умолчанию для небольших деревьев — так проверяет Testing Library: рендер целиком, поиск по ролям и тексту.
- Заглушки — явные (\`MockComponent\` из ng-mocks или ручные с тем же контрактом), а не \`NO_ERRORS_SCHEMA\`.
- Тяжёлые или внешние дети (графики, карты, гриды сторонних библиотек) почти всегда заглушают даже в deep-тестах.
- В обоих режимах проверяйте контракт и поведение — входы, выходы, отрисованный результат, — а не приватные методы.

### Где это применяется на практике

- **Страница с большим гридом:** родитель-контейнер тестируется shallow с заглушкой грида — проверяем, что в грид ушли нужные колонки и данные и что обработан выбор строки.
- **Форма заказа:** deep-тест с настоящими полями и валидаторами, сеть замокана через \`HttpTestingController\`.
- **Дашборд из виджетов:** shallow для раскладки и фильтров, отдельные deep-тесты на каждый виджет.
- **Дизайн-система:** примитивы тестируются deep (они маленькие), а продуктовые экраны используют их harness, а не внутреннюю вёрстку.
- **Миграция на standalone:** старые тесты с \`NO_ERRORS_SCHEMA\` в \`configureTestingModule\` начинают падать, потому что схема на standalone-компоненты не действует, — повод заменить её явными заглушками.

## Важные нюансы и подводные камни

- **\`NO_ERRORS_SCHEMA\` как «заткнуть ошибки».** Тест зелёный при опечатке в селекторе и при удалённом входе ребёнка. В проектах с AOT-сборкой такую опечатку в настоящем шаблоне всё равно поймает компилятор (NG8001), но в JIT-окружениях (Jest, старые Karma-конфигурации) и в переопределённых шаблонах она проходит молча.
- **Схема в \`configureTestingModule\` не действует на standalone-компонент.** Её нужно задавать через \`overrideComponent(X, { set: { schemas: [...] } })\` — иначе по-прежнему NG0304.
- **Мок без нужного \`output\` — тихий баг.** Если у заглушки нет \`selected\`, привязка \`(selected)\` молча превращается в обычный DOM-слушатель, ошибки нет, а тест на реакцию родителя проверить нельзя. Мок без нужного входа, наоборот, даёт NG0303.
- **Типы входов заглушки не проверяются.** Рантайм сверяет только наличие входа; если родитель передаёт строку вместо объекта, shallow-тест этого не заметит — это ловит \`strictTemplates\` при сборке.
- **\`set\` затирает все \`imports\`.** Используйте \`remove\`/\`add\`, чтобы не потерять пайпы и директивы родителя.
- **Deep-тест, который на самом деле e2e.** Подтянули реальные сервисы и HTTP — и получили медленный flaky-тест, который падает по чужой вине. Сеть мокается всегда.
- **Проверка приватных методов и CSS-классов** вместо ролей и текста — любой рефакторинг красит CI в красный.
- **Забытый первый \`detectChanges()\`/\`whenStable()\`.** Сразу после \`createComponent\` DOM пустой: шаблон ещё не отрисован.
- **Zoneless-режим (по умолчанию в Angular 21).** Обычное поле, изменённое из теста, не помечает компонент для обновления: \`await fixture.whenStable()\` DOM не обновит, а \`fixture.detectChanges()\` может упасть с NG0100. Меняйте состояние через сигналы, \`fixture.componentRef.setInput()\` или события.

**Плюсы:** shallow — быстрые, сфокусированные тесты, устойчивые к изменениям детей; deep — реальная проверка стыков и максимальная близость к пользователю.
**Минусы:** shallow не ловит интеграционные баги и требует поддержки заглушек; deep медленнее, хрупче и падает из-за поломок в чужих компонентах.

## Как это спрашивают на собеседовании

**Главный вывод:** deep рендерит настоящих детей и проверяет стыки, shallow подменяет детей заглушками с тем же контрактом и проверяет только родителя. Заглушки делаю явными (ng-mocks), а не через \`NO_ERRORS_SCHEMA\`, которая глушит реальные ошибки шаблона.

Типичные формулировки: «Shallow или deep — что вы пишете и почему?», «Зачем нужен \`NO_ERRORS_SCHEMA\` и чем он плох?», «Как замокать дочерний компонент в standalone-мире?».

Что могут спросить следом:

- *Как подменить ребёнка у standalone-компонента?* — \`overrideComponent\` с \`remove\`/\`add\` в \`imports\` или \`MockComponent\` из ng-mocks.
- *Почему \`NO_ERRORS_SCHEMA\` в TestBed перестал работать после миграции на standalone?* — У standalone-компонента свои \`schemas\`; схема модуля на его шаблон не действует.
- *Чем это отличается от подхода Testing Library?* — Там deep по умолчанию и поиск по ролям и тексту, как у пользователя.
- *Когда можно обойтись без TestBed?* — Когда много логики и нет шаблона: класс создают через \`TestBed.runInInjectionContext(() => new X())\`, а лучше выносят логику в сервис.
- *Что даёт \`errorOnUnknownElements\`?* — Превращает предупреждение о неизвестном теге в падение теста; Angular CLI в Vitest-раннере включает его по умолчанию.

### Ответ на 1 минуту

> Deep-тест рендерит компонент со всеми настоящими дочерними компонентами: клик проходит через кнопку ребёнка, его output и обработчик родителя, поэтому тест ловит реальные баги стыковки, но он медленнее, хрупче и падает из-за поломок в детях. Shallow изолирует компонент: через overrideComponent я подменяю детей в imports заглушками с тем же селектором и тем же контрактом входов и выходов, проверяю, какие данные родитель передал, эмичу событие из заглушки и смотрю реакцию. Заглушки делаю явными, например MockComponent из ng-mocks, а не через NO_ERRORS_SCHEMA: схема глушит все неизвестные теги и свойства, поэтому опечатка в селекторе проходит молча, а у standalone-компонента схема из configureTestingModule вообще не действует. Ещё включаю errorOnUnknownElements и errorOnUnknownProperties — в Vitest-раннере Angular CLI они уже включены. Практика: shallow для сложной логики родителя, deep для критичных стыков вроде форм, и всегда тестирую контракт и поведение, а не приватные детали.`,
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
      ru: `## В чём суть

Dummy, stub, spy, mock и fake — это **пять степеней «поддельности»** зависимости в тесте, от совсем пустышки до почти настоящей реализации. Общее название для всех — test double, «дублёр». Классификация Джерарда Месароша (Gerard Meszaros, книга «xUnit Test Patterns»); на практике важно не заучить названия, а понимать, что вы проверяете: **результат** или **факт вызова**.

Аналогия: съёмки фильма. Dummy — манекен на заднем плане, его никто не касается. Stub — актёр, который произносит одну заранее написанную реплику. Spy — тот же актёр, но с диктофоном: потом можно послушать, что ему сказали. Mock — актёр с требованием в контракте: «мне обязаны сказать три реплики, иначе я срываю съёмку». Fake — настоящий работающий реквизит, только дешёвый: пистолет стреляет холостыми.

**Какую проблему решает.** Код почти никогда не живёт сам по себе: сервис ходит в HTTP, пишет в хранилище, отправляет письма, читает текущее время. В тесте настоящие зависимости мешают: они медленные, нестабильные, стоят денег (реальное письмо клиенту!) и не позволяют воспроизвести редкую ветку вроде «сервер вернул 500». Дублёр заменяет зависимость на управляемую подделку. А понимание видов дублёров помогает не скатиться в тесты, которые проверяют не поведение, а то, как код написан.

## Словарик терминов

- **Test double (дублёр)** — любой объект, который в тесте подменяет настоящую зависимость.
- **Тестируемый объект (SUT, system under test)** — то, что мы проверяем; все остальные участники могут быть дублёрами.
- **Dummy** — объект, который передают только чтобы заполнить параметр; он вообще не используется.
- **Stub (заглушка)** — возвращает заранее заданные ответы, чтобы провести тест по нужной ветке; вызовы не проверяет.
- **Spy (шпион)** — записывает вызовы (аргументы, количество, порядок), чтобы проверить их после действия; может пропускать вызов к настоящей реализации.
- **Mock (мок)** — объект с заранее заданными ожиданиями; если ожидаемый вызов не произошёл, тест падает.
- **Fake (подделка)** — рабочая, но упрощённая реализация: in-memory репозиторий вместо базы данных, фейковый HTTP-бэкенд.
- **Проверка состояния (state verification)** — после действия проверяем результат и состояние: что вернулось, что сохранилось, что видно на экране.
- **Проверка поведения (behaviour verification)** — проверяем, как SUT общался с зависимостями: что вызвал и с какими аргументами.
- **\`vi.fn()\` / \`jest.fn()\`** — функция-дублёр в Vitest/Jest: умеет возвращать заданные значения и записывает свои вызовы.
- **\`vi.spyOn()\` / \`spyOn()\`** — подменяет метод существующего объекта шпионом; в Jasmine это \`spyOn\`, в Vitest и Jest — \`vi.spyOn\`/\`jest.spyOn\`.
- **\`jasmine.createSpyObj\`** — создаёт в Jasmine объект, все методы которого — шпионы.
- **Провайдер DI (\`{ provide, useValue }\`)** — способ Angular подменить зависимость в TestBed на дублёр.
- **Over-mocking** — антипаттерн, когда замокано всё, и тест проверяет только то, что код вызывает сам себя так, как написан.

## Как это работает под капотом

Все дублёры устроены на одной идее — **подмена зависимости через параметр**:

1. Тестируемый класс получает зависимости снаружи (через конструктор или \`inject()\`), а не создаёт их сам. Поэтому тест может подсунуть вместо настоящей зависимости что угодно с тем же интерфейсом.
2. Тест решает, что этому «что угодно» нужно уметь. Если зависимость не будет вызвана — хватит пустышки (dummy). Если нужен ответ — заглушка (stub). Нужна правдоподобная логика — подделка (fake).
3. Если важно, **как** SUT общался с зависимостью, дублёр ещё и записывает вызовы: каждый вызов кладётся в массив (у \`vi.fn()\` — это \`mock.calls\`), и после действия тест его проверяет (spy).
4. Mock делает то же самое, но ожидания объявляются **до** действия и проверяются самим дублёром (\`verify()\`).
5. В Jest, Vitest и Jasmine один объект \`vi.fn()\`/\`spyOn\` совмещает stub и spy, поэтому вид дублёра на практике определяется не классом, а тем, **что вы утверждаете в \`expect\`**.

Упрощённо \`vi.fn()\` устроен так:

\`\`\`ts
function fn(impl = (...args: any[]) => undefined) {
  const calls: any[][] = [];
  const mock = (...args: any[]) => { calls.push(args); return impl(...args); }; // spy: записываем
  mock.mock = { calls };
  mock.mockReturnValue = (v: any) => { impl = () => v; return mock; };          // stub: задаём ответ
  return mock;
}
\`\`\`

### Код для всех примеров

\`\`\`ts
interface RatesApi { getRate(from: string, to: string): Promise<number> }
interface Logger { log(msg: string): void }
interface Mailer { send(to: string, subject: string): Promise<void> }
interface User { id: number; email: string }
interface UserRepo {
  save(u: Omit<User, 'id'>): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
}

class PriceConverter {
  constructor(private rates: RatesApi, private logger: Logger) {}
  async convert(amount: number, from: string, to: string) {
    if (amount === 0) return 0;
    const rate = await this.rates.getRate(from, to);
    return Math.round(amount * rate * 100) / 100;
  }
}

class SignupService {
  constructor(private repo: UserRepo, private mailer: Mailer) {}
  async signup(email: string) {
    if (await this.repo.findByEmail(email)) throw new Error('Email уже занят');
    const user = await this.repo.save({ email });
    await this.mailer.send(email, 'Добро пожаловать!');
    return user;
  }
}
\`\`\`

### Dummy — заполнить параметр

\`\`\`ts
const converter = new PriceConverter({} as RatesApi, {} as Logger);
console.log(await converter.convert(0, 'USD', 'EUR')); // 0
\`\`\`

Для нуля курс не нужен, поэтому ни \`rates\`, ни \`logger\` не вызываются: их передали только потому, что конструктор их требует. Когда использовать: зависимость обязательна по сигнатуре, но в этой ветке не участвует.

### Stub — нужный ответ, чтобы пройти по ветке

\`\`\`ts
const ratesStub: RatesApi = { getRate: async () => 0.92 };
const converter = new PriceConverter(ratesStub, {} as Logger);
console.log(await converter.convert(100, 'USD', 'EUR')); // 92
\`\`\`

Заглушка не знает ничего о валютах — всегда отвечает 0.92. Тест проверяет **результат** конвертации, а не то, как был получен курс. Когда использовать: нужно управлять входными данными SUT — ответ сервера, текущий пользователь, фича-флаг, ошибка.

### Spy — записать вызовы и проверить их потом

\`\`\`ts
const getRate = vi.fn().mockResolvedValue(0.92);         // stub-часть: ответ
const converter = new PriceConverter({ getRate }, {} as Logger);
await converter.convert(100, 'USD', 'EUR');
await converter.convert(50, 'USD', 'EUR');

console.log(JSON.stringify(getRate.mock.calls));          // [["USD","EUR"],["USD","EUR"]]
expect(getRate).toHaveBeenCalledWith('USD', 'EUR');       // spy-часть: проверка вызова
expect(getRate).toHaveBeenCalledTimes(2);
\`\`\`

\`vi.spyOn\` оборачивает метод **существующего** объекта и по умолчанию пропускает вызов к настоящей реализации:

\`\`\`ts
const realRates: RatesApi = { getRate: async (f, t) => (f === t ? 1 : 0.5) };
const spy = vi.spyOn(realRates, 'getRate');
const converter = new PriceConverter(realRates, {} as Logger);

console.log(await converter.convert(10, 'USD', 'GBP'));  // 5 — работает настоящая логика
console.log(JSON.stringify(spy.mock.calls));             // [["USD","GBP"]]
spy.mockResolvedValueOnce(2);
console.log(await converter.convert(10, 'USD', 'GBP'));  // 20 — один раз подменили ответ
console.log(await converter.convert(10, 'USD', 'GBP'));  // 5 — снова настоящая логика
\`\`\`

Когда использовать: вызов зависимости и есть наблюдаемый результат (письмо, аналитика, лог), либо нужно убедиться, что дорогой запрос не ушёл дважды.

### Mock — ожидания объявлены заранее

В Vitest и Jest нет «строгих моков» из коробки, поэтому классический mock проще всего показать вручную:

\`\`\`ts
class MailerMock implements Mailer {
  private expected: string[] = [];
  private actual: string[] = [];
  expectSend(to: string, subject: string) { this.expected.push(\`\${to} | \${subject}\`); return this; }
  async send(to: string, subject: string) { this.actual.push(\`\${to} | \${subject}\`); }
  verify() {
    const exp = JSON.stringify(this.expected), act = JSON.stringify(this.actual);
    if (exp !== act) throw new Error(\`MailerMock: ожидали \${exp}, получили \${act}\`);
  }
}

const mailer = new MailerMock().expectSend('anna@example.com', 'Добро пожаловать!'); // 1. ожидание
await signupWithBug('anna@example.com', mailer);                                     // 2. действие (письмо забыли)
mailer.verify();                                                                     // 3. проверка
// Error: MailerMock: ожидали ["anna@example.com | Добро пожаловать!"], получили []
\`\`\`

Отличие от шпиона — порядок: spy сначала записывает, потом тест решает, что проверить; mock знает ожидания заранее и сам роняет тест. Библиотеки вроде Sinon дают это API готовым (\`expects('send').once()\` плюс \`verify()\`). Когда использовать: протоколы взаимодействия, где важна точная последовательность вызовов.

### Fake — упрощённая, но рабочая реализация

\`\`\`ts
class InMemoryUserRepo implements UserRepo {
  private users = new Map<string, User>();
  private nextId = 1;
  async save(u: Omit<User, 'id'>) { const user = { id: this.nextId++, ...u }; this.users.set(u.email, user); return user; }
  async findByEmail(email: string) { return this.users.get(email) ?? null; }
}

const repo = new InMemoryUserRepo();
const mailer: Mailer = { send: vi.fn().mockResolvedValue(undefined) };
const service = new SignupService(repo, mailer);

console.log(await service.signup('anna@example.com'));   // { id: 1, email: 'anna@example.com' }
console.log(await repo.findByEmail('anna@example.com')); // { id: 1, email: 'anna@example.com' }
await service.signup('anna@example.com').catch(e => console.log(e.message)); // Email уже занят
\`\`\`

Fake по-настоящему хранит данные, поэтому тест проверяет **состояние**: пользователь сохранён, дубликат отклонён. Ветка «Email уже занят» получилась сама, без настройки ответов. В Angular-мире классический fake — \`HttpTestingController\` (подменённый HTTP-бэкенд) или MSW (фейковый сервер на сетевом уровне).

### Jasmine: \`createSpyObj\` и \`spyOn\`

\`\`\`ts
const repo = jasmine.createSpyObj<UserRepo>('UserRepo', ['save', 'findByEmail']);
repo.save.and.returnValue(Promise.resolve({ id: 1, email: 'a@b.c' }));
repo.save({ email: 'a@b.c' });
console.log(repo.save.calls.count(), repo.save.calls.argsFor(0)); // 1 [ { email: 'a@b.c' } ]
expect(repo.save).toHaveBeenCalledOnceWith({ email: 'a@b.c' });

const rates = jasmine.createSpyObj('RatesApi', { getRate: Promise.resolve(0.92) }); // ответ сразу

const api = { load: () => 'real' };
spyOn(api, 'load').and.callThrough();   // шпион поверх настоящего метода: api.load() → 'real'
(api.load as jasmine.Spy).and.returnValue('stub'); // а теперь — заглушка: api.load() → 'stub'
\`\`\`

Важное отличие Jasmine: шпионы, созданные \`spyOn\`, **автоматически снимаются после каждого теста**. В следующем \`it\` метод снова настоящий.

### Сброс дублёров: \`clear\`, \`reset\`, \`restore\`

\`\`\`ts
const fn = vi.fn(() => 'original');
fn.mockReturnValue('stubbed'); fn();
fn.mockClear();   // calls: 0, fn() → 'stubbed'   (стёрта история, ответ остался)
fn.mockReset();   // fn() → 'original'            (Vitest 4: возврат к исходной реализации)

const obj = { hello: () => 'real' };
const spy = vi.spyOn(obj, 'hello').mockReturnValue('fake');
spy.mockRestore(); // obj.hello() → 'real', метод снова настоящий

vi.restoreAllMocks(); // восстанавливает только шпионов из vi.spyOn; vi.fn не трогает
\`\`\`

Результаты выше проверены на Vitest 4. В Jest 30 поведение похожее, но \`mockReset()\` оставляет функцию возвращать \`undefined\`, а не исходную реализацию. Главное: в Vitest и Jest шпион на общем объекте **не снимается сам** — проверено, следующий тест видит подменённый метод. Поэтому включайте \`restoreMocks: true\` в конфиге или вызывайте \`vi.restoreAllMocks()\` в \`afterEach\`.

### Подмена зависимостей в Angular TestBed

\`\`\`ts
// зависимости PriceConverter объявлены как InjectionToken RATES_API и LOGGER
TestBed.configureTestingModule({
  providers: [
    PriceConverter,
    { provide: RATES_API, useValue: { getRate: vi.fn().mockResolvedValue(0.92) } }, // stub + spy
    { provide: LOGGER, useValue: {} },                                               // dummy
    provideHttpClient(), provideHttpClientTesting(),                                 // fake-бэкенд
  ],
});
\`\`\`

DI делает подмену естественной: компонент или сервис через \`inject()\` получает дублёр и даже не знает об этом.

### Как выбрать

- Нужен только аргумент — dummy.
- Нужно провести тест по ветке (ответ, ошибка, пустой список) — stub; проверяйте результат.
- Зависимость со сложным состоянием (хранилище, бэкенд) — fake: тесты пишутся как сценарии и переживают рефакторинг.
- Вызов зависимости и есть эффект (письмо, платёж, аналитика, лог) — spy или mock; проверяйте аргументы.
- По умолчанию — проверка состояния; проверка поведения — только там, где вызов является наблюдаемым результатом.
- Для HTTP в Angular — \`HttpTestingController\` или MSW вместо мока своего сервиса.

### Где это применяется на практике

- **HTTP-слой:** сервис тестируется с fake-бэкендом (\`HttpTestingController\`), компонент — со stub-сервисом через \`useValue\`.
- **Формы и валидаторы:** stub для асинхронного валидатора «логин занят», чтобы проверить отображение ошибки.
- **Аналитика и логирование:** spy проверяет, что событие \`order_created\` ушло ровно один раз с нужными полями.
- **NgRx/NGXS-эффекты:** stub API плюс проверка экшенов на выходе — это проверка состояния, а не вызовов.
- **Время и случайность:** fake-таймеры (\`vi.useFakeTimers()\`) и stub \`Math.random\` делают тесты с debounce и ID детерминированными.
- **Большие таблицы:** fake-источник данных на in-memory массиве проверяет сортировку, фильтры и пагинацию без сервера.

## Важные нюансы и подводные камни

- **Over-mocking.** Если в тесте пять моков, вы тестируете свою же реализацию. Такой тест никогда не поймает баг, зато сломается от любого рефакторинга.
- **Мок, который «умнее» оригинала.** Возвращает синхронно то, что в реальности асинхронно, или никогда не бросает ошибку — тест зелёный, прод падает. Stub должен вести себя как оригинал хотя бы по форме ответа.
- **\`toHaveBeenCalledTimes\` на всё подряд.** Количество вызовов — деталь реализации, если только это не платёж или письмо.
- **Fake без тестов на сам fake.** In-memory репозиторий с багом даёт ложную уверенность во всех тестах сразу. Хорошая практика — гонять один набор контрактных тестов и на fake, и на настоящей реализации.
- **Незачищенные шпионы между тестами.** В Vitest и Jest \`vi.spyOn\`/\`jest.spyOn\` на общем объекте живёт дальше, тесты начинают зависеть от порядка. Нужны \`restoreMocks: true\` или \`vi.restoreAllMocks()\` в \`afterEach\`; в Jasmine \`spyOn\` снимается сам.
- **\`restoreAllMocks\` не сбрасывает \`vi.fn()\`.** В Vitest 4 и Jest 30 (проверено) он восстанавливает только шпионов; историю вызовов \`vi.fn()\` чистят \`mockClear\`/\`clearAllMocks\`.
- **\`spyOn\` на несуществующий метод.** Jasmine падает с \`nope() method does not exist\`; опечатка в имени метода видна сразу, а не превращается в «шпион, который никто не вызвал».
- **Мокать свой код вместо границы.** Подменить свой \`UserService\` в тесте компонента нормально; подменить его в тесте самого \`UserService\` — значит не тестировать ничего.

**Плюсы:** быстрые и детерминированные тесты, воспроизводимые редкие ветки (ошибки, таймауты), изоляция от сети и денег, возможность проверить побочные эффекты.
**Минусы:** дублёр может разойтись с настоящей зависимостью, избыток моков привязывает тесты к реализации, fake-реализации тоже нужно поддерживать и тестировать.

## Как это спрашивают на собеседовании

**Главный вывод:** dummy заполняет параметр, stub даёт ответы, spy записывает вызовы, mock заранее ожидает вызовы и сам роняет тест, fake — упрощённая рабочая реализация. По умолчанию я проверяю результат и состояние (stub, fake), а вызовы — только когда вызов и есть эффект.

Типичные формулировки: «Чем mock отличается от stub?», «Что такое spy в Jasmine/Jest?», «Как вы мокаете зависимости в Angular-тестах?».

Что могут спросить следом:

- *Почему проверка состояния надёжнее проверки поведения?* — Она не зависит от того, как код устроен внутри, и переживает рефакторинг.
- *Что использовать для HTTP?* — Fake-бэкенд: \`HttpTestingController\` внутри Angular DI или MSW на сетевом уровне, а не мок своего сервиса.
- *Чем \`mockClear\`, \`mockReset\` и \`mockRestore\` отличаются?* — Clear стирает историю вызовов, reset ещё и реализацию, restore возвращает оригинальный метод объекта.
- *Почему тесты стали падать в зависимости от порядка?* — Шпион на общем объекте не сняли; нужен \`restoreMocks\` или \`afterEach\` с \`vi.restoreAllMocks()\`.
- *Что такое over-mocking?* — Когда замокано всё и тест повторяет реализацию вместо проверки поведения.

### Ответ на 1 минуту

> По классификации Месароша это пять видов test double. Dummy передаётся только чтобы заполнить параметр и не используется. Stub возвращает заранее заданные ответы и ведёт тест по нужной ветке, но вызовы не проверяет. Spy записывает вызовы — аргументы и количество — для проверки после действия. Mock содержит ожидания, объявленные заранее, и сам роняет тест, если ожидаемый вызов не произошёл. Fake — рабочая, но упрощённая реализация, например in-memory репозиторий или HttpTestingController как фейковый бэкенд. В Vitest, Jest и Jasmine границы размыты: vi.fn и spyOn совмещают stub и spy, поэтому решает то, что я утверждаю в expect. Практически я выбираю проверку состояния через stub или fake — результат и состояние, это переживает рефакторинг; проверку вызовов оставляю для побочных эффектов вроде письма или аналитики. Главный антипаттерн — over-mocking, а частый баг — незачищенные шпионы: в Vitest и Jest они не снимаются сами, в отличие от Jasmine.`,
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
    category: 'rxjs',
    level: 'Expert',
    tags: ['rxjs', 'marble-testing', 'testscheduler'],
    question: {
      ru: 'Что такое marble testing и как тестировать сложные RxJS-потоки через TestScheduler?',
      en: 'What is marble testing and how do you test complex RxJS streams with TestScheduler?',
    },
    answer: {
      ru: `## В чём суть

Marble testing — это способ **нарисовать поток строкой** вроде \`'-a--b--c|'\` и сравнить рисунок с тем, что реально выдал ваш код. \`TestScheduler\` при этом крутит **виртуальное время**: \`debounceTime(300)\` или \`delay(5000)\` отрабатывают мгновенно и всегда одинаково — без настоящего ожидания и без «плавающих» тестов.

Аналогия: нотная запись. Вместо «сыграй и послушай, вроде похоже» вы пишете партитуру: здесь нота, здесь пауза на два такта, здесь конец. Две партитуры можно сравнить символ в символ, не проигрывая музыку в реальном времени. Мраморная диаграмма — это партитура для Observable, а \`TestScheduler\` — дирижёр, который умеет «прокрутить» всю пьесу за долю секунды.

**Какую проблему решает.** Асинхронный RxJS-код трудно тестировать «по-честному»: тест на поиск с \`debounceTime(300)\` и запросом на 2 секунды будет ждать 2,3 секунды, а при нагрузке на CI ещё и падать через раз. Кроме того, обычный \`subscribe\` со складыванием значений в массив видит только **что** пришло, но не **когда** и не **было ли отменено**. Marble-тест одной строкой проверяет значения, их моменты, завершение или ошибку, а отдельной строкой — когда была подписка и отписка. Это самый удобный способ доказать, что \`switchMap\` действительно отменил устаревший запрос.

## Словарик терминов

- **Marble-диаграмма (marble diagram)** — строка, где каждый символ — момент времени или событие потока: \`'-a--b|'\`. «Мраморы» — шарики-значения на линии времени.
- **Кадр (frame)** — одна единица виртуального времени, которую занимает один символ диаграммы. Внутри \`run()\` один кадр равен одной виртуальной миллисекунде.
- **Виртуальное время (virtual time)** — «часы», которые двигает тест, а не реальность. Таймеры не ждут, а выполняются в нужном порядке мгновенно.
- **Планировщик (Scheduler)** — объект RxJS, который решает, **когда** выполнить отложенную работу (таймер, интервал, задержку).
- **\`TestScheduler\`** — планировщик для тестов из \`rxjs/testing\`: подменяет реальные таймеры виртуальными и сравнивает диаграммы.
- **Run-режим (\`testScheduler.run\`)** — режим, в котором все операторы времени автоматически переходят на виртуальные часы; современный способ писать marble-тесты.
- **Cold / hot Observable** — cold начинает работу заново для каждого подписчика (как HTTP-запрос), hot идёт сам по себе, и подписчик видит только то, что случилось после подписки (как клики).
- **\`cold()\` / \`hot()\`** — helper'ы, создающие тестовый cold- или hot-поток по диаграмме.
- **\`expectObservable(...).toBe(...)\`** — ожидание: «этот поток должен выдать вот такую диаграмму».
- **\`expectSubscriptions\`** — ожидание по журналу подписок: когда на поток подписались (\`^\`) и когда отписались (\`!\`).
- **Синтаксис прогресса времени (time progression syntax)** — запись вида \`'a 299ms b'\`, чтобы не рисовать 299 дефисов.
- **Flaky-тест (flaky test)** — «плавающий» тест: то проходит, то падает без изменений в коде, обычно из-за реального времени.
- **\`flush()\`** — команда «прокрути виртуальное время до конца и выполни всё запланированное».
- **\`fakeAsync\` / \`tick()\`** — Angular-утилиты на базе Zone.js, которые подменяют таймеры для всего теста, а не только для RxJS.
- **\`debounceTime(ms)\`** — оператор «дождись паузы»: выдаёт значение, только если после него \`ms\` миллисекунд не было новых.
- **\`switchMap\`** — оператор, который на каждое новое значение запускает внутренний поток (например, запрос) и отменяет предыдущий.

## Как это работает под капотом

Что происходит, когда вы пишете marble-тест:

1. Вы создаёте \`new TestScheduler(assertDeepEqual)\` и передаёте функцию сравнения из своего тест-раннера (Vitest, Jest, Jasmine), потому что сам RxJS про них ничего не знает.
2. Вызов \`run(callback)\` включает run-режим: RxJS временно подменяет свои внутренние «провайдеры» \`setTimeout\`, \`setInterval\`, \`setImmediate\`, \`requestAnimationFrame\` и источники текущего времени на виртуальные и ставит масштаб «1 кадр = 1 мс».
3. Поэтому любой оператор времени внутри колбэка — \`debounceTime\`, \`delay\`, \`interval\`, \`timer\` — ставит задачу не в настоящий таймер браузера, а в очередь виртуального планировщика.
4. Helper'ы \`cold()\` и \`hot()\` разбирают строку в список «кадр → уведомление» и тоже кладут эти уведомления в очередь.
5. \`expectObservable(result$)\` подписывается на результат и записывает каждое \`next\`, \`error\` и \`complete\` вместе с номером кадра.
6. Когда колбэк закончился, \`run\` сам вызывает \`flush()\`: планировщик выполняет задачи по порядку времени, мгновенно перескакивая от одного момента к другому. Ждать нечего — часы просто переставляются.
7. Записанный журнал сравнивается с разобранной ожидаемой диаграммой через ваш \`assertDeepEqual\`. Если не совпало — тест падает, а в сообщении видны два массива объектов \`{ frame, notification }\`.
8. После выхода из \`run\` все подмены откатываются, и остальной код снова работает с настоящим временем.

Как выглядит диаграмма после разбора (это реальный вывод \`TestScheduler.parseMarbles\` в run-режиме):

\`\`\`ts
'-a--b|'
// [{ frame: 1, notification: { kind: 'N', value: 'a' } },
//  { frame: 4, notification: { kind: 'N', value: 'b' } },
//  { frame: 5, notification: { kind: 'C' } }]
// N = next, C = complete, E = error
\`\`\`

Именно эти массивы вы увидите в сообщении об упавшем тесте. Если ожидание \`'-A---B|'\`, а код выдал \`'-A--B|'\`, тест покажет, что \`B\` пришло в кадре 4, а ожидалось в кадре 5 — сдвиг на одну миллисекунду не пройдёт незамеченным.

### Алфавит диаграмм

- \`-\` — один кадр «ничего не происходит».
- \`a\`, \`b\`, \`x\` (любой символ-буква или цифра) — значение \`next\`. Само значение берётся из объекта во втором аргументе: \`{ a: 1 }\`; без объекта значением будет сама буква.
- \`|\` — \`complete\`, поток успешно завершился.
- \`#\` — \`error\`; объект ошибки передаётся третьим аргументом, иначе это строка \`'error'\`.
- \`()\` — группа событий в одном кадре: \`'(abc|)'\` — три значения и завершение одновременно, как у \`of(1, 2, 3)\`.
- \`^\` — точка подписки; используется в \`hot()\` и в диаграммах подписок.
- \`!\` — точка отписки; только в диаграммах подписок.
- пробел — в run-режиме игнорируется, им удобно выравнивать строки друг под другом.
- \`10ms\`, \`2s\`, \`1m\` — прыжок времени на указанное количество виртуальных миллисекунд; число должно стоять в начале строки или после пробела и обязательно заканчиваться пробелом.

Важная деталь: **каждый символ занимает кадр**, включая \`(\`, \`)\`, \`|\` и \`^\`. Группа \`(ab)\` занимает 4 кадра, а значения в ней приходят в кадре открывающей скобки:

\`\`\`ts
'(ab)-c|'
// a и b — кадр 0, c — кадр 5, complete — кадр 6
\`\`\`

### Пример 1. Первый marble-тест: \`map\`

\`\`\`ts
import { TestScheduler } from 'rxjs/testing';
import { map } from 'rxjs';

const testScheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected); // сравнение из вашего тест-раннера
});

it('умножает на 10', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const source$ = cold('-a--b--c|', { a: 1, b: 2, c: 3 });
    const result$ = source$.pipe(map(x => x * 10));
    expectObservable(result$).toBe('-a--b--c|', { a: 10, b: 20, c: 30 });
  });
});
// тест проходит
\`\`\`

Почему диаграммы совпадают по форме: \`map\` не трогает время, он только меняет значения. Поэтому «рисунок» тот же, а словарь значений другой. Если бы вы ошиблись и написали в ожидании \`'-a---b--c|'\`, тест бы упал: \`b\` сдвинулся на кадр.

### \`cold()\` — источник, который стартует на подписку

\`cold(marbles, values?, error?)\` создаёт поток, который **начинает диаграмму заново в момент подписки** — как HTTP-запрос или \`of(...)\`. Если подписаться в кадре 3, первое событие сдвинется на 3 кадра:

\`\`\`ts
testScheduler.run(({ cold, expectObservable }) => {
  const s$ = cold('-a-b|');
  expectObservable(s$, '---^').toBe('----a-b|');
});
// проходит: подписка в кадре 3, поэтому a в кадре 4, b в 6, complete в 7
\`\`\`

Второй аргумент \`expectObservable\` — диаграмма подписки: \`^\` говорит, в каком кадре подписаться. Используйте \`cold()\`, чтобы подменить запросы к API, ответы сервисов и всё, что «запускается заново» для каждого подписчика.

### \`hot()\` — источник, который уже идёт

\`hot()\` создаёт поток, который живёт сам по себе с нулевого кадра, независимо от подписчиков. Символ \`^\` в диаграмме отмечает момент, когда тест подписывается; всё, что левее, уже случилось и подписчику не достанется:

\`\`\`ts
testScheduler.run(({ hot, expectObservable }) => {
  const s$ = hot('--a--^--b--c--|');
  expectObservable(s$).toBe('---b--c--|');
});
// проходит: a случилось до подписки и потеряно
\`\`\`

Используйте \`hot()\` для кликов, ввода пользователя, \`actions$\` в NgRx Effects, сообщений WebSocket — всего, что происходит, «слушаете вы или нет». Перепутаете \`cold\` и \`hot\` — получите тест, который ищет несуществующий баг или прячет настоящий.

### \`expectObservable(...).toBe(...)\` — значения, ошибки и бесконечные потоки

У \`toBe(marbles, values?, errorValue?)\` три аргумента: диаграмма, словарь значений и ожидаемая ошибка для \`#\`. Значения сравниваются глубоко (deep equal), так что объекты и массивы можно описывать литералами:

\`\`\`ts
testScheduler.run(({ cold, expectObservable }) => {
  const s$ = cold('-a-#', { a: { id: 1 } }, new Error('boom'));
  expectObservable(s$).toBe('-a-#', { a: { id: 1 } }, new Error('boom'));
});
// проходит
\`\`\`

Бесконечный поток так просто не проверишь: он никогда не закончится. Поэтому вторым аргументом \`expectObservable\` задают, когда **отписаться** (\`!\`):

\`\`\`ts
import { interval } from 'rxjs';

testScheduler.run(({ expectObservable }) => {
  expectObservable(interval(2), '^------!').toBe('--a-b-c', { a: 0, b: 1, c: 2 });
});
// проходит: подписались в 0, отписались в 7, успели прийти 0, 1, 2
\`\`\`

Обратите внимание, что \`interval(2)\` внутри \`run\` тикает раз в 2 **виртуальные** миллисекунды — без передачи планировщика вручную. Есть и \`toEqual(other$)\`: сравнить два потока между собой, если удобнее описать ожидание не диаграммой, а другим Observable.

### Синтаксис прогресса времени: \`debounceTime\` без сотни дефисов

Рисовать 300 дефисов для \`debounceTime(300)\` невозможно читать. Вместо этого пишут прыжок времени: \`'a 99ms b'\` — \`a\` в кадре 0 (и занимает его), затем 99 кадров пустоты, \`b\` в кадре 100.

\`\`\`ts
import { debounceTime } from 'rxjs';

testScheduler.run(({ cold, expectObservable }) => {
  // ввод: a в 0 мс, b в 100 мс, пауза, c в 600 мс, конец в 1000 мс
  const input$ = cold('a 99ms b 499ms c 399ms |');
  expectObservable(input$.pipe(debounceTime(300)))
    .toBe('400ms b 499ms c 99ms |');
});
// проходит: a вытеснено b; b выдано в 400 (100 + 300); c — в 900; complete в 1000
\`\`\`

Ещё одна деталь, которую тест ловит сразу: если поток завершается, пока \`debounceTime\` ждёт паузу, он **не ждёт до конца**, а отдаёт последнее значение немедленно вместе с завершением:

\`\`\`ts
testScheduler.run(({ cold, expectObservable }) => {
  expectObservable(cold('a 99ms b 50ms |').pipe(debounceTime(300)))
    .toBe('151ms (b|)');
});
// проходит: complete в кадре 151 «выталкивает» b сразу
\`\`\`

### \`expectSubscriptions\` — проверяем подписки и отмену

У каждого потока из \`cold()\`/\`hot()\` есть журнал \`subscriptions\`: в каких кадрах на него подписались и отписались. \`expectSubscriptions(log).toBe(...)\` сравнивает его с диаграммой, где \`^\` — подписка, \`!\` — отписка. Если подписок было несколько — передайте массив строк.

\`\`\`ts
import { retry } from 'rxjs';

testScheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
  const request$ = cold('--#', null, new Error('500'));
  expectObservable(request$.pipe(retry(2))).toBe('------#', null, new Error('500'));
  expectSubscriptions(request$.subscriptions).toBe([
    '^-!',      // первая попытка: 0..2
    '--^-!',    // повтор 1: 2..4
    '----^-!',  // повтор 2: 4..6, после неё ошибка уходит наружу
  ]);
});
// проходит
\`\`\`

Это доказательство поведения, которое никак не видно по значениям: \`retry(2)\` действительно сделал три подписки, и каждая закрылась в момент ошибки. Точно так же проверяют, что \`switchMap\` отписался от старого запроса, а \`takeUntil\` — от источника.

### Пример 2. Реальный поиск: \`debounceTime\` + \`switchMap\` + \`catchError\`

Типичная функция из Angular-сервиса или компонента: ждём паузу в наборе, не повторяем одинаковый запрос, отменяем устаревший, ошибку превращаем в пустой список.

\`\`\`ts
import { Observable, debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';

export function createSearch(query$: Observable<string>, api: { search(q: string): Observable<string[]> }) {
  return query$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => api.search(q).pipe(catchError(() => of([])))),
  );
}
\`\`\`

Тест на отмену: пользователь набрал \`ang\`, запрос медленный (500 мс), через 350 мс он допечатал \`angular\`.

\`\`\`ts
testScheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
  const query$ = hot('a 349ms b', { a: 'ang', b: 'angular' });
  const slow$ = cold('500ms r|', { r: ['slow'] });
  const fast$ = cold('100ms r|', { r: ['fast'] });
  const api = { search: (q: string) => (q === 'ang' ? slow$ : fast$) };

  expectObservable(createSearch(query$, api)).toBe('750ms b', { b: ['fast'] });
  expectSubscriptions(slow$.subscriptions).toBe('300ms ^ 349ms !'); // 300..650
  expectSubscriptions(fast$.subscriptions).toBe('650ms ^ 100ms !'); // 650..751
});
// проходит
\`\`\`

Разбор по времени: \`ang\` пришло в 0 → через 300 мс ушёл медленный запрос; \`angular\` пришло в 350 → через 300 мс, в 650, \`switchMap\` **отписался** от медленного запроса и подписался на быстрый → ответ \`['fast']\` в 750. Ответ \`['slow']\` не пришёл вообще. Весь тест выполняется за миллисекунды реального времени.

Тест на ошибку пишется так же: \`cold('50ms #', null, new Error('500'))\` вместо ответа и ожидание \`e\` со значением \`[]\`. Важно, что \`catchError\` стоит **внутри** \`switchMap\`: если его вынести наружу, ошибка одного запроса убьёт весь поиск — marble-тест покажет \`(e|)\`: пустой список и сразу завершение всего потока, после которого новые запросы уже не уходят.

### \`time()\` и \`flush()\` — вспомогательные инструменты

\`time(marbles)\` переводит диаграмму в число кадров — удобно, чтобы передать в оператор ту же длительность, что нарисована в диаграмме, и не дублировать константы:

\`\`\`ts
testScheduler.run(({ cold, time, expectObservable }) => {
  const t = time('---|');                      // 3 — позиция символа |
  expectObservable(cold('a|').pipe(delay(t))).toBe('---(a|)');
});
// проходит
\`\`\`

Учтите: \`time()\` просто ищет позицию \`|\` и не понимает запись \`20ms\` — \`time('- 20ms |')\` вернёт 7, а не 21.

\`flush()\` прокручивает время до конца прямо посреди теста. Это нужно, когда вы проверяете не диаграмму, а побочный эффект — запись в сигнал, вызов шпиона:

\`\`\`ts
import { tap } from 'rxjs';

testScheduler.run(({ cold, flush }) => {
  const saved: string[] = [];
  cold('-a-b|').pipe(tap(v => saved.push(v))).subscribe();
  console.log(saved); // []          — время ещё не шло
  flush();
  console.log(saved); // ['a', 'b']  — виртуальные 4 мс прокручены
});
\`\`\`

### Старый режим без \`run()\`

До появления \`run()\` в RxJS 6 marble-тесты писали без него, и в старом коде вы это встретите. Там действуют другие правила: один символ — это **10** единиц времени, а операторам времени нужно **явно передавать** планировщик, иначе они уходят в реальное время:

\`\`\`ts
const ts = new TestScheduler(assertDeepEqual);
const src$ = ts.createColdObservable('-a--b|');           // a=10, b=40, complete=50
ts.expectObservable(src$.pipe(debounceTime(20, ts))).toBe('---a-(b|)');
ts.flush();
// проходит: a выдано в 30 (10 + 20), b вытолкнуто завершением в 50

// а вот delay(20) без ts — реальный таймер: к моменту flush() поток не выдал ничего
\`\`\`

Отсюда и путаница «кадры против миллисекунд» в старых статьях. В run-режиме проще: 1 кадр = 1 мс, планировщик передавать не нужно.

### \`TestScheduler\` против \`fakeAsync\` и фейковых таймеров

- **\`TestScheduler\`** — работает в любом тест-раннере и проверяет **форму потока**: значения, моменты, завершение, подписки. Но видит только время RxJS.
- **\`fakeAsync\` + \`tick()\`** — Angular-утилита на Zone.js: подменяет **все** таймеры внутри теста, включая \`setTimeout\` в компоненте. В типах Angular 21 прямо написано, что она требует Zone.js и не работает с Vitest-раннером.
- **\`vi.useFakeTimers()\`** (или \`jest.useFakeTimers()\`) — фейковые таймеры самого тест-раннера: подходят для zoneless-приложений и Vitest, который в новых проектах Angular 21 стоит по умолчанию. Проверка идёт ассертами после \`vi.advanceTimersByTime(300)\`, без диаграмм.

Как выбрать: логика потоков в сервисах, эффектах, store — \`TestScheduler\`; компонент целиком с шаблоном и таймерами вне RxJS — фейковые таймеры раннера или \`fakeAsync\` в проектах на Zone.js.

### Где это применяется на практике

- **Поиск и автокомплит** в больших формах: проверить \`debounceTime\`, \`distinctUntilChanged\` и отмену старого запроса через \`expectSubscriptions\`.
- **NgRx Effects и сервисы состояния**: поток \`actions$\` подменяют \`hot('-a', { a: loadUsers() })\`, ответ API — \`cold('--r|')\`, и проверяют, какие действия эффект выдаст и когда.
- **Повторы и таймауты HTTP-слоя**: \`retry({ count: 3, delay: 1000 })\`, \`timeout(5000)\` — без реального ожидания секунд.
- **Опрос сервера (polling)** на дашбордах: \`interval\` + \`switchMap\`, проверка через диаграмму отписки \`'^ 10s !'\`.
- **Собственные операторы** библиотеки компонентов: marble-тест — это документация поведения, которую видно глазами.

## Важные нюансы и подводные камни

- **Путаница кадров и миллисекунд.** В run-режиме один символ — один кадр — одна виртуальная миллисекунда, поэтому \`debounceTime(20)\` — это 20 дефисов или \`20ms\`. В старом режиме символ — 10 единиц. Смешаете — получите диаграммы, которые «почти сходятся».
- **Каждый символ занимает кадр.** \`(\`, \`)\`, \`|\`, \`^\` и сама буква тоже сдвигают время: \`'(ab)-c'\` ставит \`c\` в кадр 5, а не 2. В \`'a 99ms b'\` значение \`b\` приходит в кадре 100, а не 99.
- **\`cold\` вместо \`hot\` и наоборот.** \`cold()\` запускается заново на каждую подписку, \`hot()\` — общий источник, где события до \`^\` потеряны. Перепутали — тест проверяет не тот сценарий.
- **Промисы не виртуализируются.** \`from(Promise.resolve(1))\` внутри \`run\` к моменту сравнения не выдаёт ничего: промисы живут в очереди микрозадач, а не в планировщике RxJS. Код с \`async/await\` и \`firstValueFrom\` marble-тестом не проверить — тестируйте его отдельно, через \`await\`.
- **Голый \`setTimeout\` тоже не виртуализируется.** Внутри \`run\` подменяются только таймеры, которые RxJS вызывает через свои провайдеры. \`new Observable(s => setTimeout(...))\` будет ждать реальное время, и к сравнению поток окажется пустым. Используйте \`timer()\` вместо ручного \`setTimeout\`.
- **В старом режиме оператор без планировщика уходит в реальное время.** \`delay(20)\` без второго аргумента вне \`run()\` — частая причина «пустых» диаграмм в старых тестах.
- **Ничьи в одном кадре.** Если ввод приходит ровно в тот кадр, когда срабатывает \`debounceTime\`, результат зависит от порядка задач в очереди. Не стройте тесты на совпадениях — разводите события хотя бы на кадр.
- **Забытый \`expectSubscriptions\`.** Значения могут совпасть, а утечка остаться: старый запрос не отменён, но его ответ отфильтрован. Только журнал подписок докажет, что отписка была.
- **Неожиданности операторов видны сразу.** Например, \`cold('a-b|').pipe(delay(5))\` даёт \`'5ms a-(b|)'\`: \`delay\` не сдвигает завершение на 5 мс отдельно, поток завершается сразу после последнего задержанного значения.
- **\`requestAnimationFrame\` не тикает сам.** Для \`animationFrames()\` кадры анимации задают helper'ом \`animate('---x---x')\`, иначе поток молчит.
- **Marble ради marble.** Для \`of(1).pipe(map(...))\` диаграмма только усложняет чтение — хватит \`subscribe\` и ассерта или \`firstValueFrom\`.

**Плюсы:** детерминированные и мгновенные тесты асинхронного кода; одна строка проверяет значения, тайминг и завершение; можно доказать отмену и отсутствие утечек; диаграмма читается как документация.
**Минусы:** свой мини-язык, который команде нужно выучить; легко ошибиться с подсчётом кадров; не покрывает промисы, \`async/await\` и таймеры вне RxJS; для простых синхронных потоков избыточен.

## Как это спрашивают на собеседовании

**Главный вывод:** marble testing описывает поток строкой-диаграммой, а \`TestScheduler.run()\` подменяет время RxJS виртуальным, где 1 кадр = 1 мс. Одна диаграмма проверяет значения, тайминг и завершение, а \`expectSubscriptions\` — подписки и отмену.

Типичные формулировки: «Как протестировать \`debounceTime\` без реального ожидания?», «Что такое marble testing?», «Как доказать тестом, что \`switchMap\` отменил предыдущий запрос?», «Чем \`TestScheduler\` отличается от \`fakeAsync\`?».

Что могут спросить следом:

- *Чем \`hot()\` отличается от \`cold()\`?* — \`cold\` стартует диаграмму на каждую подписку, \`hot\` идёт с нулевого кадра, а \`^\` отмечает момент подписки теста.
- *Как протестировать бесконечный поток?* — Передать во \`expectObservable\` диаграмму отписки, например \`'^------!'\`.
- *Как протестировать отмену в \`switchMap\`?* — Подменить запросы \`cold\`-потоками и проверить их журнал через \`expectSubscriptions\`: \`!\` должен стоять в момент нового значения.
- *Почему тест с промисом внутри \`run\` пустой?* — Промисы выполняются в очереди микрозадач, которую \`TestScheduler\` не контролирует.
- *Нужно ли передавать планировщик в \`debounceTime\`?* — Внутри \`run()\` нет, это делалось только в старом режиме.

### Ответ на 1 минуту

> Marble testing — это способ описать асинхронный поток строкой-диаграммой и сравнить её с тем, что реально выдал код. Дефис — один кадр времени, буква — значение, вертикальная черта — complete, решётка — error, скобки группируют события в одном кадре, крышечка — подписка, восклицательный знак — отписка, а запись вроде \`300ms\` перескакивает время. Внутри \`testScheduler.run()\` RxJS подменяет свои таймеры виртуальными, один кадр равен одной миллисекунде, поэтому \`debounceTime\` и \`delay\` отрабатывают мгновенно и детерминированно. Источники я создаю через \`cold\` для запросов и \`hot\` для событий, а \`expectSubscriptions\` доказывает, что \`switchMap\` действительно отписался от старого запроса. Главные подвохи — каждый символ занимает кадр, а промисы и голый \`setTimeout\` виртуальное время не видят.`,
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
      ru: `## В чём суть

\`fakeAsync\` даёт тесту **пульт от времени**. Внутри него \`setTimeout\`, \`setInterval\` и промисы не выполняются по-настоящему, а встают в очередь; вы сами решаете, когда их «проиграть», вызывая \`tick()\` или \`flush()\`. Тест становится синхронным и детерминированным. \`waitForAsync\` устроен наоборот: пульта нет, время идёт настоящее, а Angular просто ждёт, пока все асинхронные задачи теста закончатся.

Аналогия: запись матча вместо прямого эфира. В прямом эфире вы ждёте 300 реальных миллисекунд и надеетесь, что успели. В записи вы перематываете вперёд ровно на нужный момент — и так каждый раз одинаково. \`waitForAsync\` — это честный прямой эфир: пульта нет, вы просто ждёте, пока всё утихнет.

**Какую проблему решает.** Во фронтенде полно кода, завязанного на время: \`debounceTime(300)\` в поиске, автосохранение раз в 30 секунд, повтор запроса через секунду, тост, который исчезает через 5 секунд. Если тестировать это настоящим ожиданием, тесты становятся медленными (секунды на каждый) и нестабильными (на загруженном CI 300 мс превращаются в 320). \`fakeAsync\` позволяет «промотать» 30 секунд за микросекунду и проверить состояние ровно в нужный момент.

## Словарик терминов

- **Zone.js и зона (zone)** — библиотека, которая подменяет браузерные асинхронные API (\`setTimeout\`, \`Promise.then\`, события, XHR) и благодаря этому знает обо всех асинхронных задачах внутри «зоны» — контекста выполнения.
- **Макрозадача (macrotask)** — колбэк таймера (\`setTimeout\`, \`setInterval\`), события или XHR; выполняется в отдельном витке цикла событий.
- **Микрозадача (microtask)** — колбэк промиса (\`then\`, продолжение после \`await\`); выполняется сразу после текущего синхронного кода, раньше любых таймеров.
- **Виртуальные часы (virtual clock)** — счётчик времени внутри \`fakeAsync\`; двигается только вашими вызовами \`tick\`/\`flush\`. \`Date.now()\` внутри тоже виртуальный.
- **\`fakeAsync(fn)\`** — обёртка теста, которая запускает его в зоне с виртуальными часами.
- **\`tick(ms)\`** — сдвинуть виртуальное время на \`ms\` и выполнить всё, что наступило; \`tick()\` — то же для 0 мс.
- **\`flush()\`** — выполнять таймеры, пока очередь не опустеет; возвращает, сколько виртуального времени прошло.
- **\`flushMicrotasks()\`** — выполнить только готовые микрозадачи (промисы), таймеры не трогать.
- **\`discardPeriodicTasks()\`** — выбросить из очереди оставшиеся \`setInterval\`.
- **Периодический таймер (periodic timer)** — \`setInterval\`; RxJS-операторы времени (\`debounceTime\`, \`delay\`, \`interval\`) внутри тоже используют \`setInterval\`.
- **\`waitForAsync(fn)\`** — обёртка теста, которая ждёт завершения всех асинхронных задач в реальном времени; раньше называлась \`async\`.
- **\`fixture.whenStable()\`** — промис, который выполняется, когда у компонента не осталось ожидающих задач.
- **Zoneless** — режим Angular без zone.js; по умолчанию для новых проектов Angular 21. Без zone.js \`fakeAsync\` и \`waitForAsync\` не работают.
- **Фейковые таймеры Vitest (\`vi.useFakeTimers()\`)** — аналог виртуальных часов на уровне тестового раннера, без zone.js.

## Как это работает под капотом

Всё держится на том, что zone.js перехватывает асинхронные API:

1. При загрузке zone.js подменяет \`setTimeout\`, \`setInterval\`, \`Promise\` и другие API обёртками. Поэтому каждый таймер и промис становится «задачей», о которой знает текущая зона.
2. \`fakeAsync\` запускает тест в специальной зоне (\`FakeAsyncTestZoneSpec\`). Когда код вызывает \`setTimeout(fn, 300)\`, настоящий таймер **не создаётся**: в очередь кладётся запись «выполнить \`fn\` в момент \`now + 300\`». Промисы попадают в очередь микрозадач.
3. \`tick(ms)\` сначала выполняет готовые микрозадачи, потом двигает часы вперёд: находит ближайший таймер, «прыгает» к его времени, выполняет колбэк, снова выполняет микрозадачи — и так, пока не дойдёт до \`now + ms\`. Таймеры, созданные по ходу, тоже выполняются, если успевают.
4. \`flush()\` делает то же самое без верхней границы — пока очередь обычных таймеров не опустеет (не больше 20 «оборотов» по умолчанию) — и возвращает прошедшее виртуальное время.
5. Когда функция теста заканчивается, \`fakeAsync\` проверяет очередь. С zone.js 0.15 по умолчанию оставшиеся таймеры просто досматриваются (\`flush: true\`); с \`fakeAsync(fn, { flush: false })\` или на старых версиях остаток приводит к ошибке «N timer(s) still in the queue».
6. \`waitForAsync\` использует другую зону (\`AsyncTestZoneSpec\`): она ничего не откладывает, а **считает** незавершённые задачи. Время идёт настоящее; когда счётчик падает до нуля, тест объявляется завершённым. Ошибка в любой задаче роняет тест.

Игрушечная модель виртуальных часов, чтобы почувствовать механику:

\`\`\`js
function createFakeClock() {
  let now = 0;
  const timers = [];                       // { runAt, fn }
  const microtasks = [];
  const drainMicrotasks = () => { while (microtasks.length) microtasks.shift()(); };
  return {
    setTimeout: (fn, ms = 0) => timers.push({ runAt: now + ms, fn }),
    queueMicrotask: fn => microtasks.push(fn),
    tick(ms = 0) {
      drainMicrotasks();                   // 1. сначала готовые промисы
      const target = now + ms;
      for (;;) {
        timers.sort((a, b) => a.runAt - b.runAt);
        const next = timers[0];
        if (!next || next.runAt > target) break;
        timers.shift();
        now = next.runAt;                  // 2. прыгаем ко времени таймера
        next.fn();                         // 3. выполняем колбэк
        drainMicrotasks();                 // 4. и промисы, которые он породил
      }
      now = target;
    },
    flush() {
      const start = now;
      while (timers.length) this.tick(Math.min(...timers.map(t => t.runAt)) - now);
      return now - start;
    },
    get now() { return now; },
  };
}

const clock = createFakeClock();
const log = [];
clock.setTimeout(() => log.push('A@100'), 100);
clock.setTimeout(() => { log.push('B@50'); clock.setTimeout(() => log.push('C@80'), 30); }, 50);
clock.queueMicrotask(() => log.push('promise'));
clock.tick(60);  console.log(clock.now, log.join(' '));  // 60 promise B@50
clock.tick(30);  console.log(clock.now, log.join(' '));  // 90 promise B@50 C@80
console.log('flush:', clock.flush(), log.join(' '));    // flush: 10 promise B@50 C@80 A@100
\`\`\`

### Пример 1. \`tick(ms)\`: время двигается только по команде

\`\`\`ts
it('advances virtual time', fakeAsync(() => {
  const log: string[] = [];
  setTimeout(() => log.push('timeout 100'), 100);
  Promise.resolve().then(() => log.push('promise'));
  log.push('sync');

  console.log(log.join(', '));   // sync
  tick(50);
  console.log(log.join(', '));   // sync, promise
  tick(50);
  console.log(log.join(', '));   // sync, promise, timeout 100
}));
\`\`\`

Почему так: синхронный код выполнился сразу, промис ждал, пока кто-то выполнит микрозадачи (это сделал первый \`tick\`), а таймер на 100 мс сработал, только когда виртуальное время дошло до 100. Реального ожидания не было ни миллисекунды.

### Пример 2. \`flushMicrotasks()\`, \`tick()\` и \`flush()\` — в чём разница

\`\`\`ts
it('flush family', fakeAsync(() => {
  const log: string[] = [];
  setTimeout(() => log.push('timeout 0'));
  setTimeout(() => log.push('timeout 10'), 10);
  Promise.resolve().then(() => log.push('promise'));

  flushMicrotasks();
  console.log(log.join(', '));        // promise
  tick();
  console.log(log.join(', '));        // promise, timeout 0
  const elapsed = flush();
  console.log(log.join(', '), elapsed); // promise, timeout 0, timeout 10  10
}));

it('flush returns elapsed time', fakeAsync(() => {
  setTimeout(() => setTimeout(() => {}, 300), 200);
  console.log(flush());               // 500 — вложенный таймер тоже дождались
}));
\`\`\`

Почему так: \`flushMicrotasks()\` трогает только промисы. \`tick()\` — это \`tick(0)\`: он выполняет промисы **и** таймеры с нулевой задержкой, но не будущие. \`flush()\` доигрывает всё и сообщает, сколько времени «прошло», — удобно, когда точная задержка неизвестна или не важна.

### Пример 3. Реальный кейс: поиск с \`debounceTime\` и HTTP

\`\`\`ts
@Component({
  selector: 'app-search',
  template: \`<ul>@for (r of results(); track r) {<li>{{ r }}</li>}</ul>\`,
})
class SearchComponent {
  private svc = inject(SearchService);            // http.get('/api/search', { params: { q } })
  private query$ = new Subject<string>();
  results = signal<string[]>([]);
  constructor() {
    this.query$.pipe(debounceTime(300), distinctUntilChanged(), switchMap(q => this.svc.search(q)))
      .subscribe(r => this.results.set(r));
  }
  onInput(q: string) { this.query$.next(q); }
}

it('debounces the search', fakeAsync(() => {
  TestBed.configureTestingModule({
    imports: [SearchComponent],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(SearchComponent);
  fixture.detectChanges();

  fixture.componentInstance.onInput('an');  tick(100);
  fixture.componentInstance.onInput('ang'); tick(299);
  http.expectNone(() => true);               // через 299 мс после последнего ввода запроса ещё нет
  tick(1);                                   // ровно 300 мс — debounce отпустил значение
  http.expectOne('/api/search?q=ang').flush(['Angular', 'AngularJS']);
  fixture.detectChanges();

  expect(fixture.nativeElement.textContent).toBe('AngularAngularJS');
  http.verify();
}));
\`\`\`

Почему так: \`tick(299)\` и \`tick(1)\` проверяют границу debounce с точностью до миллисекунды — с настоящим временем такое не проверить стабильно. Ввод \`an\` не породил запроса вообще, потому что следующий ввод пришёл раньше 300 мс. Сеть здесь не нужна: \`HttpTestingController\` подменяет бэкенд, а \`fakeAsync\` управляет только временем.

### \`setInterval\`, периодические таймеры и \`discardPeriodicTasks\`

\`\`\`ts
it('counts interval ticks', fakeAsync(() => {
  let n = 0;
  const id = setInterval(() => n++, 1000);
  tick(3500);
  console.log(n);            // 3
  clearInterval(id);
}));

fakeAsync(() => { setInterval(() => {}, 1000); tick(3000); }, { flush: false })();
// Error: 1 periodic timer(s) still in the queue.

fakeAsync(() => { setInterval(() => {}, 1000); tick(3000); discardPeriodicTasks(); }, { flush: false })();
// ок — интервал выброшен из очереди
\`\`\`

Ошибка возникает **в конце** \`fakeAsync\`, а не в \`tick()\`. Частый сюрприз: недождавшийся \`debounceTime\` из RxJS тоже даёт именно «periodic timer(s)», потому что планировщик RxJS ставит таймеры через \`setInterval\`. Лучшее лечение — отписаться (уничтожить компонент, завершить поток) или промотать время; \`discardPeriodicTasks()\` — когда интервал бесконечный по замыслу (поллинг, часы).

### \`waitForAsync\` и \`fixture.whenStable()\`: настоящее время

\`\`\`ts
it('waits for real async work', waitForAsync(() => {
  let done = false;
  setTimeout(() => { done = true; expect(done).toBe(true); }, 100);
  console.log('sync end, done =', done);
}));
// sync end, done = false
// (через ~100 реальных мс) колбэк таймера выполнился, тест завершился
\`\`\`

Классическое применение — компонент, который при инициализации что-то загружает промисом:

\`\`\`ts
it('renders loaded data', waitForAsync(() => {
  fixture.detectChanges();                 // запустили ngOnInit, пошла асинхронная загрузка
  fixture.whenStable().then(() => {        // все задачи завершились
    fixture.detectChanges();
    expect(el.querySelector('li')?.textContent).toBe('Анна');
  });
}));
\`\`\`

Проверено в Jasmine с zone.js: тест ждал настоящие 100 мс таймера. Сейчас вместо \`waitForAsync\` чаще пишут обычный \`async\`-тест с \`await fixture.whenStable()\` — это читается проще и работает и без zone.js. Старое имя \`async\` из \`@angular/core/testing\` переименовали в \`waitForAsync\`, чтобы не путать с ключевым словом, и в Angular 21 его больше нет.

### Angular 21, Vitest и zoneless: фейковые таймеры раннера

В Angular 21 новый проект по умолчанию zoneless, а \`ng test\` запускает Vitest. В типах Angular у \`fakeAsync\`, \`tick\`, \`flush\`, \`flushMicrotasks\` и \`discardPeriodicTasks\` прямо написано: требуют Zone.js и не поддерживаются Vitest-раннером. Без zone.js тест падает с «Expected to be running in 'ProxyZone', but it was not found». Аналог — фейковые таймеры самого Vitest:

\`\`\`ts
it('debounces the search (zoneless + Vitest)', async () => {
  vi.useFakeTimers();
  // ...тот же TestBed, что выше
  fixture.componentInstance.onInput('an');  vi.advanceTimersByTime(100);
  fixture.componentInstance.onInput('ang'); vi.advanceTimersByTime(299);
  console.log(vi.getTimerCount());           // 1 — debounce ещё ждёт
  http.expectNone(() => true);
  vi.advanceTimersByTime(1);
  http.expectOne('/api/search?q=ang').flush(['Angular', 'AngularJS']);
  await vi.runAllTimersAsync();              // даём zoneless-планировщику перерисовать
  expect(fixture.nativeElement.textContent).toBe('AngularAngularJS');
  vi.useRealTimers();
});
\`\`\`

Нюанс: zoneless-планировщик Angular сам использует таймеры, поэтому при включённых фейковых таймерах \`await fixture.whenStable()\` может не завершиться, пока вы не прокрутите время (\`await vi.advanceTimersByTimeAsync(...)\`) — проверено. В zone.js 0.16.2 появился отдельный патч \`zone.js/plugins/vitest-patch\`: с ним (zone.js и патч в \`polyfills\`) \`fakeAsync\` в моём прогоне под Vitest 4 заработал, а \`waitForAsync\` — нет (тест упал по таймауту). Это свежая возможность, официальные типы Angular 21 всё ещё помечают эти API как несовместимые с Vitest.

### Как выбрать

- Есть таймеры, \`debounceTime\`, \`delay\`, повторы с задержкой, поллинг и нужна точность до миллисекунды — \`fakeAsync\` с \`tick\` (проект на zone.js, Karma/Jasmine или Jest).
- Нужно просто дождаться промисов и отрисовки, временем управлять не надо — \`async\`-тест с \`await fixture.whenStable()\`; \`waitForAsync\` — его старый zone-эквивалент.
- Zoneless-проект на Vitest (Angular 21 по умолчанию) — \`vi.useFakeTimers()\`, \`vi.advanceTimersByTime\`, \`await vi.runAllTimersAsync()\`.
- Точная задержка важна для поведения — \`tick(точное значение)\`; не важна — \`flush()\`.
- HTTP — всегда через \`HttpTestingController\`, и в \`fakeAsync\`, и без него.

### Где это применяется на практике

- **Поиск с автодополнением:** \`debounceTime\` плюс \`switchMap\` — проверка, что лишние запросы не уходят и старые отменяются.
- **Автосохранение формы:** «через 30 секунд после последнего изменения ушёл PUT» — \`tick(30_000)\` вместо реальных 30 секунд.
- **Повторы HTTP с задержкой:** \`retry({ count: 3, delay: 1000 })\` — промотать backoff и проверить число попыток через \`HttpTestingController\`.
- **Тосты и уведомления:** сообщение исчезает через 5 секунд.
- **Поллинг статуса** долгой операции (экспорт отчёта, обработка большого файла): интервал плюс \`discardPeriodicTasks()\` в конце.
- **Дашборды с автообновлением** и сессии с таймаутом бездействия: \`Date.now()\` внутри \`fakeAsync\` тоже виртуальный, \`tick(60_000)\` сдвигает его ровно на минуту.

## Важные нюансы и подводные камни

- **\`tick()\` — это не «только промисы».** Без аргумента это \`tick(0)\`: выполняются микрозадачи и таймеры с нулевой задержкой. Только промисы выполняет \`flushMicrotasks()\`.
- **«1 periodic timer(s) still in the queue».** Ошибка бросается в конце \`fakeAsync\`, если остался \`setInterval\` (в том числе внутри RxJS-операторов времени) и включён \`{ flush: false }\` или используется zone.js старше 0.15. Лечится отпиской, прокруткой времени или \`discardPeriodicTasks()\`.
- **С zone.js 0.15 \`fakeAsync\` сам доигрывает таймеры в конце.** Это удобно, но скрывает забытый таймер; строгий режим — \`fakeAsync(fn, { flush: false })\`, тогда остаток даёт «N timer(s) still in the queue».
- **Реальный XHR «тикнуть» нельзя.** Настоящий запрос внутри \`fakeAsync\` падает с «Cannot make XHRs from within a fake async test»; для HTTP нужен \`HttpTestingController\`, который подменяет бэкенд целиком.
- **\`await\` внутри \`fakeAsync\`.** Функция возвращается на первом \`await\`, а продолжение выполнится, только когда кто-то прокрутит время: с \`{ flush: false }\` получите «1 timer(s) still in the queue», с настройками по умолчанию продолжение молча доиграется в финальном flush — уже после ваших проверок. Внутри \`fakeAsync\` пишите синхронный код.
- **\`flush()\` вместо точного \`tick()\` прячет ошибки таймингов.** Тест пройдёт, даже если debounce настроен на 3000 мс вместо 300.
- **Бесконечный поллинг и \`flush()\`.** Цепочка таймеров, которая сама себя перезапускает, даёт «flush failed after reaching the limit of 20 tasks. Does your code use a polling timeout?».
- **Забытый \`fixture.detectChanges()\` после \`tick()\`.** В zone-тестах данные пришли, а DOM ещё старый: автоматической перерисовки в фикстуре по умолчанию нет.
- **Zoneless и фейковые таймеры Vitest.** \`await fixture.whenStable()\` может зависнуть, пока не прокрутите таймеры; используйте \`advanceTimersByTimeAsync\`/\`runAllTimersAsync\`.

**Плюсы:** \`fakeAsync\` — быстрые и детерминированные тесты для кода со временем, точная проверка границ задержек, читаемые синхронные ассерты; \`waitForAsync\`/\`whenStable\` — простой способ дождаться реальной асинхронщины.
**Минусы:** оба требуют zone.js и официально не поддерживаются Vitest-раннером Angular 21; \`fakeAsync\` не управляет сетью и плохо сочетается с \`await\`; \`waitForAsync\` медленнее и не даёт контролировать время.

## Как это спрашивают на собеседовании

**Главный вывод:** \`fakeAsync\` подменяет время виртуальными часами — таймеры и промисы ждут \`tick\`/\`flush\`, тест синхронный и детерминированный. \`waitForAsync\` ничего не подменяет и ждёт реального завершения задач. Оба построены на zone.js, поэтому в zoneless-проекте на Vitest их место занимают \`vi.useFakeTimers()\` и \`await fixture.whenStable()\`.

Типичные формулировки: «Как протестировать \`debounceTime\`?», «Чем \`tick\` отличается от \`flush\`?», «Зачем \`waitForAsync\`, если есть \`fakeAsync\`?».

Что могут спросить следом:

- *Чем \`flush()\` отличается от \`flushMicrotasks()\`?* — \`flush\` доигрывает все таймеры и промисы и возвращает прошедшее время; \`flushMicrotasks\` выполняет только промисы.
- *Что делает \`tick()\` без аргумента?* — Это \`tick(0)\`: промисы и таймеры с нулевой задержкой.
- *Как быть с HTTP внутри \`fakeAsync\`?* — \`HttpTestingController\`: запрос ловится \`expectOne\`, ответ отдаётся \`flush\`, а время двигает \`tick\`.
- *Что меняется в zoneless-приложениях?* — \`fakeAsync\` недоступен без zone.js; используют фейковые таймеры Vitest, сигналы и явные \`await\`.
- *Почему тест падает с «periodic timer(s) still in the queue»?* — Остался \`setInterval\` или RxJS-таймер; нужно отписаться, прокрутить время или вызвать \`discardPeriodicTasks()\`.

### Ответ на 1 минуту

> fakeAsync запускает тест в зоне zone.js с виртуальными часами: setTimeout, setInterval и промисы не выполняются сами, а встают в очередь, и тест становится синхронным и детерминированным. tick(ms) двигает виртуальное время и выполняет наступившие таймеры и промисы; tick() без аргумента — это tick(0), то есть промисы и нулевые таймеры; flush() доигрывает все таймеры и возвращает прошедшее время; flushMicrotasks() — только промисы. Так я проверяю debounce в поиске с точностью до миллисекунды, а HTTP отдаю через HttpTestingController. waitForAsync устроен иначе: времени не подменяет, а ждёт реального завершения всех задач, обычно вместе с fixture.whenStable(). Из нюансов: незавершённый setInterval или RxJS-таймер даёт ошибку «periodic timer(s) still in the queue», await внутри fakeAsync ломает контроль времени, а в zoneless-проектах Angular 21 на Vitest эти API не поддерживаются — там я использую vi.useFakeTimers() и await fixture.whenStable().`,
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
      ru: `## В чём суть

\`HttpTestingController\` — это **поддельный бэкенд внутри теста**. Запросы \`HttpClient\` никуда не уходят: они складываются в очередь, тест достаёт их оттуда, проверяет, правильно ли они собраны, и сам решает, чем ответить — данными, ошибкой 500 или обрывом сети.

Аналогия: почтовое отделение в песочнице. Письмо не улетает адресату, а ложится вам на стол. Вы читаете конверт (адрес, метод, заголовки), убеждаетесь, что всё верно, и сами кладёте в ящик тот ответ, который нужен для сценария. А в конце смены проверяете, что на столе не осталось неразобранных писем.

**Какую проблему решает.** Ходить в unit-тестах в настоящую сеть плохо: нужен работающий сервер, тесты медленные и падают из-за чужих сбоев, а ошибку 500 или обрыв связи по заказу не воспроизвести. Подменить сервис заглушкой \`of([...])\` тоже мало: тогда не проверяется ни URL, ни query-параметры, ни заголовки, которые добавляют интерсепторы. \`HttpTestingController\` оставляет настоящими \`HttpClient\`, интерсепторы и ваш сервис, а подменяет только последнее звено — отправку по сети. Тест получается быстрым, синхронным и предсказуемым.

## Словарик терминов

- **\`HttpClient\`** — сервис Angular для HTTP-запросов; каждый метод (\`get\`, \`post\`…) возвращает Observable.
- **Ленивость Observable** — поток ничего не делает, пока на него не подписались через \`subscribe()\`. Нет подписки — нет запроса.
- **\`HttpBackend\` (бэкенд)** — последнее звено цепочки, которое реально отправляет запрос через XHR или \`fetch\`. Именно его подменяют в тесте.
- **\`provideHttpClient()\` / \`provideHttpClientTesting()\`** — первая функция регистрирует \`HttpClient\` с интерсепторами, вторая подставляет тестовый бэкенд и \`HttpTestingController\`.
- **\`TestBed\`** — тестовое окружение Angular: собирает DI-контейнер (систему внедрения зависимостей) из провайдеров и создаёт компоненты.
- **\`HttpTestingController\`** — пульт тестового бэкенда: найти запрос, проверить, что лишних нет.
- **\`TestRequest\` (\`req\`)** — пойманный запрос: в \`req.request\` лежит \`HttpRequest\`, методы \`flush\`, \`error\`, \`event\` отправляют ответ.
- **\`expectOne\` / \`expectNone\` / \`match\`** — поиск в очереди: «ровно один», «ни одного», «все подходящие».
- **\`flush\` и \`verify()\`** — \`flush\` синхронно отдаёт ответ (тело, статус, заголовки); \`verify()\` проверяет, что неразобранных запросов не осталось.
- **\`urlWithParams\`** — URL вместе с query-строкой (\`/api/users?page=2\`); с ним сравнивается строковый матчер.
- **\`HttpErrorResponse\` и \`ProgressEvent\`** — ошибка, которую получает подписчик при статусе вне 2xx; \`ProgressEvent\` — событие, которым XHR сообщает об обрыве сети (тогда \`status\` равен 0).
- **Интерсептор (\`HttpInterceptorFn\`)** — функция-прослойка для каждого запроса: добавить токен, повторить, залогировать.
- **Фейковые таймеры** — подмена \`setTimeout\`/\`setInterval\`, при которой время двигается по команде: \`vi.useFakeTimers()\` в Vitest, \`fakeAsync\` + \`tick\` в Zone.js-тестах.
- **Zoneless** — режим Angular без Zone.js; в Angular 21 он по умолчанию, а тесты по умолчанию запускает Vitest.

## Как это работает под капотом

1. \`provideHttpClient()\` регистрирует \`HttpClient\`, цепочку интерсепторов и \`HttpBackend\`, который ходит в сеть через XHR (или \`fetch\` при \`withFetch()\`).
2. \`provideHttpClientTesting()\` регистрирует токен \`HttpBackend\` заново — уже тестовым бэкендом, и \`HttpTestingController\` указывает на тот же объект. В DI побеждает последний провайдер, поэтому тестовый ставят **после** \`provideHttpClient()\`.
3. Вы подписываетесь на метод сервиса — \`HttpClient\` собирает \`HttpRequest\`, прогоняет через интерсепторы и отдаёт бэкенду.
4. Тестовый бэкенд ничего не отправляет: заворачивает запрос в \`TestRequest\` и кладёт в очередь \`open\`. Observable висит без ответа.
5. \`expectOne\`, \`match\` и \`expectNone\` ищут в очереди и **забирают** найденное. Строка сравнивается с \`urlWithParams\` целиком, объект \`{ method, url }\` — по методу и URL, предикат — по вашему условию.
6. \`flush()\` синхронно отдаёт подписчику \`HttpResponse\` (2xx) или \`HttpErrorResponse\` (остальное), поэтому проверять результат можно сразу на следующей строке.
7. \`verify()\` проверяет, что очередь пуста. Всё, что не забрали матчерами, — ошибка. Отменённые запросы (отписка, \`switchMap\`) остаются в очереди с флагом \`cancelled\` и тоже роняют \`verify()\`, если не передать \`{ ignoreCancelled: true }\`.

Упрощённо тестовый бэкенд Angular устроен так (это почти дословно исходник):

\`\`\`ts
class HttpClientTestingBackend {
  open: TestRequest[] = [];

  handle(req: HttpRequest<any>) {
    return new Observable(observer => {
      const testReq = new TestRequest(req, observer); // ответит тест через flush
      this.open.push(testReq);                          // запрос ждёт в очереди
      return () => { testReq._cancelled = true; };      // отписка = пометка cancelled
    });
  }

  match(m) {
    const found = typeof m === 'string'
      ? this.open.filter(r => r.request.urlWithParams === m) // строка: точное совпадение
      : this.open.filter(r => m(r.request));                 // предикат (упрощено)
    this.open = this.open.filter(r => !found.includes(r));  // найденные уходят из очереди
    return found;
  }
}
\`\`\`

### Пример 1. Минимальный тест сервиса

\`\`\`ts
@Injectable({ providedIn: 'root' })
class UserService {
  private http = inject(HttpClient);
  getUsers() { return this.http.get<User[]>('/api/users'); }
}

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()], // порядок важен
    });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify()); // ни одного неразобранного запроса

  it('загружает пользователей', () => {
    let result: User[] | undefined;
    service.getUsers().subscribe(users => (result = users));
    console.log('до flush:', result);                    // до flush: undefined

    const req = http.expectOne('/api/users');
    console.log(req.request.method, req.request.url);     // GET /api/users
    req.flush([{ id: 1, name: 'Аня' }, { id: 2, name: 'Борис' }]);

    console.log('после flush:', result?.length);          // после flush: 2
    expect(result?.length).toBe(2);
  });
});
\`\`\`

Результат складывается в переменную и проверяется **после** \`flush\`, а не внутри \`subscribe\`. Причина в ловушке, о которой ниже: \`expect\` внутри колбэка, который ни разу не вызвался, ничего не проверяет.

### Пример 2. Без \`subscribe()\` запроса нет

\`\`\`ts
service.getUsers(); // Observable создан, но никто не подписался
http.expectOne('/api/users');
// Error: Expected one matching request for criteria "Match URL: /api/users", found none.
\`\`\`

\`HttpClient\` возвращает «холодный» Observable: запрос уходит только в момент подписки. Это самая частая причина красного теста у новичков.

### \`expectOne\`, \`expectNone\` и \`match\`: как искать запросы

\`expectOne\` — уже ассерт: он падает, если подходящих запросов ноль **или больше одного**. Поэтому случайный дублирующий вызов API ловится без отдельной проверки:

\`\`\`ts
service.getUsers().subscribe();
service.getUsers().subscribe();
http.expectOne('/api/users');
// Error: Expected one matching request for criteria "Match URL: /api/users", found 2 requests.
\`\`\`

Главная ловушка — query-параметры. Строка сравнивается с \`urlWithParams\` целиком:

\`\`\`ts
search(q: string, page: number) {
  return this.http.get<User[]>('/api/users', { params: new HttpParams().set('q', q).set('page', page) });
}

service.search('ann', 2).subscribe();
http.expectOne('/api/users');
// Error: ... found none. Requests received are: GET /api/users?q=ann&page=2.

const req = http.expectOne(r => r.url === '/api/users');       // предикат: URL без параметров
console.log(req.request.urlWithParams);                         // /api/users?q=ann&page=2
console.log(req.request.params.get('page'));                    // 2
// http.expectOne('/api/users?q=ann&page=2') тоже сработал бы — но порядок параметров должен совпасть
\`\`\`

Объект \`{ method, url }\` полезен для POST/PUT. У пойманного запроса в \`req.request\` есть всё, что собрал сервис: \`method\`, \`params\`, \`headers\`, \`body\`, \`responseType\`, \`withCredentials\`:

\`\`\`ts
service.create('Вера').subscribe(); // post('/api/users', { name }, { headers: { 'X-Request-Id': 'abc' } })
const req = http.expectOne({ method: 'post', url: '/api/users' }); // метод в любом регистре
console.log(JSON.stringify(req.request.body), req.request.headers.get('X-Request-Id'));
// {"name":"Вера"} abc
req.flush({ id: 3, name: 'Вера' }, { status: 201, statusText: 'Created' });
\`\`\`

\`expectNone(m)\` проверяет, что запроса **не было** (например, сработал кэш). Второй аргумент любого матчера — описание для текста ошибки. \`match(m)\` возвращает массив всех подходящих запросов без ассерта — для пагинации и параллельной загрузки виджетов:

\`\`\`ts
service.getUsers().subscribe();
service.search('a', 1).subscribe();
service.search('b', 2).subscribe();
const reqs = http.match(r => r.url === '/api/users');
console.log(reqs.map(r => r.request.urlWithParams));
// [ '/api/users', '/api/users?q=a&page=1', '/api/users?q=b&page=2' ]
reqs.forEach(r => r.flush([]));
\`\`\`

### \`flush\`, \`error\`, \`event\`: как отвечать

\`\`\`ts
// 1) Ошибка сервера: статус не 2xx → подписчик получает HttpErrorResponse
service.getUsers().subscribe({ error: (e: HttpErrorResponse) => console.log(e.status, e.statusText, e.error) });
http.expectOne('/api/users').flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
// 500 Server Error { message: 'boom' }

// 2) Сеть упала: status 0, в e.error лежит сам ProgressEvent
service.getUsers().subscribe({ error: (e: HttpErrorResponse) => console.log(e.status, e.error.type) });
http.expectOne('/api/users').error(new ProgressEvent('error'));
// 0 error

// 3) flush(null, { status: 404 }) без statusText — ошибка самого теста:
//    Error: statusText is required when setting a custom status.
// 4) flush(null) без опций — это 204 No Content: next(null), затем complete
\`\`\`

Метод \`event()\` отправляет промежуточные события. Например, для \`post\` с \`{ reportProgress: true, observe: 'events' }\` вызов \`req.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 })\` даст подписчику событие прогресса «50%», а следующий \`flush\` — финальный \`HttpResponse\`.

### \`verify()\`: что он ловит и чего не ловит

\`verify()\` падает, если в очереди остался запрос, который **никто не нашёл** матчером:

\`\`\`ts
service.getUsers().subscribe();
service.search('x', 1).subscribe();
http.expectOne('/api/users').flush([]);
http.verify();
// Error: Expected no open requests, found 1: GET /api/users?q=x&page=1
\`\`\`

Но запрос, который нашли и **не ответили**, \`verify()\` уже не видит: \`expectOne\` забрал его из очереди. Тест ниже зелёный, хотя ассерт внутри \`subscribe\` так и не выполнился:

\`\`\`ts
let calls = 0;
service.getUsers().subscribe(users => { calls++; expect(users.length).toBe(999); });
http.expectOne('/api/users'); // забыли flush
http.verify();                // проходит
console.log(calls);           // 0 — тест зелёный, хотя ничего не проверил
\`\`\`

Поэтому результат проверяют после \`flush\` — через переменную или через \`firstValueFrom\` (функция RxJS, превращающая первое значение Observable в Promise), а в Vitest/Jest можно добавить \`expect.assertions(n)\`.

### Тест маппинга и обработки ошибок

Самое ценное в HTTP-сервисе — не сам \`get\`, а то, что вокруг: превращение DTO (сырого ответа сервера) в модель и запасной вариант при ошибке.

\`\`\`ts
getUsers() {
  return this.http.get<UserDto[]>('/api/users').pipe(
    map(list => list.map(d => ({ id: d.id, fullName: \`\${d.first_name} \${d.last_name}\` }))),
    catchError(() => of([] as User[])),
  );
}

it('маппит DTO в модель', async () => {
  const promise = firstValueFrom(service.getUsers()); // подписка происходит сразу
  http.expectOne('/api/users').flush([{ id: 1, first_name: 'Анна', last_name: 'Иванова' }]);
  console.log(await promise); // [ { id: 1, fullName: 'Анна Иванова' } ]
});

it('при 500 отдаёт пустой список', async () => {
  const promise = firstValueFrom(service.getUsers());
  http.expectOne('/api/users').flush(null, { status: 500, statusText: 'Server Error' });
  console.log(await promise); // []
});
\`\`\`

### Тестирование интерсептора

Интерсептор тестируется через тот же контроллер: подключаем его в \`provideHttpClient(withInterceptors([...]))\` и смотрим на пойманный запрос — он уже прошёл через всю цепочку.

\`\`\`ts
const authInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ setHeaders: { Authorization: 'Bearer test-token' } }));

TestBed.configureTestingModule({
  providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
});
const client = TestBed.inject(HttpClient);
const http = TestBed.inject(HttpTestingController);

client.get('/api/me').subscribe();
const req = http.expectOne('/api/me');
console.log(req.request.headers.get('Authorization')); // Bearer test-token
req.flush({});
\`\`\`

Классовые интерсепторы (\`HttpInterceptor\` через токен \`HTTP_INTERCEPTORS\`) подключаются так же, только в \`provideHttpClient(withInterceptorsFromDi())\`.

### Retry с задержкой: фейковые таймеры

Если сервис повторяет запрос через \`retry({ delay })\`, второй запрос появится только после таймера. В синхронном тесте время стоит, и \`expectOne\` после первой ошибки скажет \`found none\`. В Vitest (раннер по умолчанию в Angular 21) время двигают фейковыми таймерами:

\`\`\`ts
it('повторяет с экспоненциальной задержкой', () => {
  vi.useFakeTimers();
  client.get<number[]>('/api/report').pipe(
    retry({ count: 2, delay: (_err, attempt) => timer(1000 * 2 ** (attempt - 1)) }), // 1 с, затем 2 с
  ).subscribe(v => console.log('данные', v));

  http.expectOne('/api/report').flush('down', { status: 503, statusText: 'Unavailable' });
  http.expectNone('/api/report');           // сразу после ошибки повтора ещё нет
  vi.advanceTimersByTime(1000);
  http.expectOne('/api/report').flush('down', { status: 503, statusText: 'Unavailable' });
  vi.advanceTimersByTime(1999);
  http.expectNone('/api/report');           // через 1999 мс второго повтора ещё нет
  vi.advanceTimersByTime(1);
  http.expectOne('/api/report').flush([1, 2, 3]); // данные [ 1, 2, 3 ]
  vi.useRealTimers();
});
\`\`\`

В проектах на Zone.js (Karma/Jasmine, Jest) то же самое пишут через \`fakeAsync\` и \`tick\`: \`it('...', fakeAsync(() => { ...; tick(1000); ...; tick(2000); ... }))\`. Под Vitest без Zone.js \`fakeAsync\` не работает: в моём прогоне он падал с \`Expected to be running in 'ProxyZone', but it was not found.\`

### Отмена запросов: \`switchMap\` и \`cancelled\`

\`\`\`ts
query$.pipe(switchMap(q => client.get<string[]>('/api/search', { params: { q } })))
  .subscribe(r => console.log('результат', r));
query$.next('an');
query$.next('ang'); // switchMap отписывается от первого запроса

const [first, second] = http.match(r => r.url === '/api/search');
console.log(first.cancelled, second.cancelled); // true false
// first.flush(['old']) бросил бы Error: Cannot flush a cancelled request.
second.flush(['angular']); // результат [ 'angular' ]
\`\`\`

Так проверяют автокомплит: устаревший ответ не должен попасть на экран. Если отменённый запрос не забрать матчером, \`verify()\` упадёт с \`Expected no open requests, found 1: ...\`. Чтобы игнорировать такие запросы, есть \`http.verify({ ignoreCancelled: true })\`.

### Компонент + HTTP

Компонент можно проверить вместе с реальным сервисом: он запрашивает данные, тест отвечает и смотрит на DOM. Пусть \`UsersComponent\` в \`ngOnInit\` вызывает \`getUsers()\`, показывает «Загрузка…», а потом список \`<li>\`:

\`\`\`ts
const fixture = TestBed.createComponent(UsersComponent);
fixture.detectChanges();                              // ngOnInit → запрос ушёл
console.log(fixture.nativeElement.textContent.trim()); // Загрузка…
http.expectOne('/api/users').flush([{ id: 1, name: 'Аня' }, { id: 2, name: 'Борис' }]);
await fixture.whenStable();                            // дождаться перерисовки
console.log(fixture.nativeElement.querySelectorAll('li').length); // 2
\`\`\`

Деталь: \`provideHttpClientTesting()\` выключает учёт запросов в «стабильности» приложения. Поэтому \`whenStable()\` не ждёт вечно запрос, на который тест ещё не ответил.

### \`httpResource\` (экспериментальный API)

\`httpResource\` — сигнальная обёртка над \`HttpClient\` (в Angular 21.1 ещё \`@experimental\`). Запрос уходит из эффекта, поэтому эффекты в тесте надо «прокрутить»:

\`\`\`ts
const id = signal(1);
const user = TestBed.runInInjectionContext(() => httpResource<{ name: string }>(() => \`/api/users/\${id()}\`));

TestBed.tick();                                       // запустить эффекты → запрос ушёл
http.expectOne('/api/users/1').flush({ name: 'Аня' });
await TestBed.inject(ApplicationRef).whenStable();    // ответ попадает в сигналы асинхронно
console.log(user.status(), user.value());             // resolved { name: 'Аня' }
\`\`\`

Сразу после \`flush\` в моём прогоне статус был ещё \`loading\`: результат доезжает в сигналы через микрозадачу.

### Где это применяется на практике

- **Слой API в enterprise-приложении**: проверка, что сервис шлёт правильные URL, фильтры и пагинацию в query-параметрах, тело POST/PUT и заголовки.
- **Интерсепторы**: токен авторизации, \`X-Request-Id\`, refresh токена при 401, глобальная обработка ошибок, ретраи только для GET и только для 5xx/0.
- **Таблицы и гриды с серверной пагинацией**: при смене страницы или сортировки ушёл ровно один запрос с правильными параметрами, а старый отменён.
- **Автокомплит и поиск**: отмена устаревших запросов через \`switchMap\`, отсутствие запроса для пустой строки (\`expectNone\`).
- **Кэширующие сервисы**: второй вызов не идёт в сеть — \`expectNone\` после первого \`flush\`.
- **Загрузка файлов**: прогресс через \`event()\`, ошибки размера через \`flush\` со статусом 413.

## Важные нюансы и подводные камни

- **Забыли \`subscribe()\`.** Запроса нет, \`expectOne\` падает с \`found none\`. Классика.
- **Забыли \`verify()\`.** Лишние и «висящие» запросы остаются незамеченными, а обычно они и есть баг. \`verify()\` в \`afterEach\` — стандарт.
- **\`verify()\` не видит найденный, но не отвеченный запрос.** Проверяйте результат после \`flush\`, а не внутри \`subscribe\`.
- **Строковый матчер сравнивает \`urlWithParams\` целиком** — и в \`expectOne\`, и в \`match\`. Для запросов с параметрами берите предикат \`r => r.url === '...'\`.
- **Порядок провайдеров.** Если \`provideHttpClientTesting()\` стоит раньше \`provideHttpClient()\`, настоящий бэкенд перезапишет тестовый: в моём прогоне на jsdom запрос ушёл в реальный XHR, \`expectOne\` ничего не нашёл, подписчик получил ошибку со статусом 0. С \`withFetch()\` при правильном порядке тестовый бэкенд тоже побеждает.
- **\`HttpClientTestingModule\` устарел.** В старом коде встречается \`imports: [HttpClientTestingModule]\`; в Angular 21 он \`@deprecated\`, вместо него \`provideHttpClientTesting()\`.
- **Retry с задержкой без фейковых таймеров** — повтор ждёт таймера, который в синхронном тесте никто не проматывает.
- **Мелкие ошибки самого теста.** Свой статус без \`statusText\` бросает \`statusText is required when setting a custom status.\`, а \`flush\` после отписки — \`Cannot flush a cancelled request.\`
- **Проверяют только happy path.** Ошибочные ветки HTTP-сервисов (500, 401, status 0, пустой ответ 204) ломаются чаще успешных.
- **Не путайте уровни.** Для теста компонента часто проще подменить сервис (\`{ provide: UserService, useValue: { getUsers: () => of([...]) } }\`). \`HttpTestingController\` нужен там, где проверяется сам HTTP-слой: сервис, интерсептор, их связка с компонентом.
- **MSW — другой уровень.** Mock Service Worker перехватывает запросы на уровне сети: в браузере через Service Worker, в Node — подменяя модули запросов. Он не зависит от Angular DI и работает и в unit-, и в e2e-тестах, и в dev-режиме. \`HttpTestingController\` живёт только внутри Angular DI, зато даёт синхронный пошаговый контроль над каждым запросом.

**Плюсы:** без сети и сервера, быстро и детерминированно; проверяются настоящие \`HttpClient\`, интерсепторы и сервис; легко воспроизвести 500, обрыв связи, прогресс и отмену; \`expectOne\` и \`verify\` сами ловят лишние и дублирующиеся запросы.
**Минусы:** работает только для запросов через \`HttpClient\` (голый \`fetch\` или сторонний SDK не поймает); тест знает URL и формат запросов, поэтому меняется вместе с API; ловушки со строковым матчингом, порядком провайдеров и таймерами; не заменяет контрактных и e2e-тестов с реальным бэкендом.

## Как это спрашивают на собеседовании

**Главный вывод:** \`provideHttpClientTesting()\` подменяет только сетевое звено \`HttpClient\`. Тест подписывается, ловит запрос через \`expectOne\`/\`match\`, проверяет его и отвечает через \`flush\`/\`error\`, а \`verify()\` в \`afterEach\` гарантирует, что лишних запросов не было.

Типичные формулировки: «Как протестировать сервис, который ходит в API?», «Как проверить интерсептор?», «Как сымитировать ошибку сервера или обрыв сети?», «Зачем нужен \`verify()\`?».

Что могут спросить следом:

- *Почему \`expectOne\` не нашёл запрос?* — Нет подписки, строка без query-параметров или тестовый провайдер стоит раньше \`provideHttpClient()\`.
- *Как протестировать retry с backoff?* — Фейковые таймеры: \`vi.useFakeTimers()\` и \`vi.advanceTimersByTime()\` в Vitest или \`fakeAsync\` и \`tick\` с Zone.js; между шагами \`expectNone\`/\`expectOne\`.
- *Чем это отличается от MSW?* — MSW перехватывает на уровне сети и не зависит от фреймворка; \`HttpTestingController\` работает внутри Angular DI и даёт синхронный контроль.
- *Как сымитировать сетевую ошибку?* — \`req.error(new ProgressEvent('error'))\`: подписчик получит \`HttpErrorResponse\` со \`status\` 0.
- *Что делать с отменёнными запросами?* — Забрать их матчером и проверить \`cancelled\`, либо \`verify({ ignoreCancelled: true })\`.

### Ответ на 1 минуту

> \`HttpTestingController\` из \`provideHttpClientTesting()\` подменяет только последнее звено \`HttpClient\` — бэкенд, который ходит в сеть. Запросы складываются в очередь, а сервис и интерсепторы остаются настоящими, поэтому тест быстрый и детерминированный. Схема такая: вызываю метод сервиса и обязательно подписываюсь, ловлю запрос через \`expectOne\` или \`match\`, проверяю метод, URL, параметры, заголовки и тело, отвечаю через \`flush\`. Ошибки моделирую \`flush\` со статусом 500 или \`error\` с \`ProgressEvent\` для обрыва сети. В \`afterEach\` вызываю \`verify()\`, он падает на неразобранных запросах. Нюансы: строковый матчер сравнивает URL вместе с query-параметрами, поэтому для запросов с параметрами беру предикат. \`verify()\` не видит найденный, но не отвеченный запрос, поэтому результат проверяю после \`flush\`. Тестовый провайдер ставлю после \`provideHttpClient()\`, а ретраи с задержкой проматываю фейковыми таймерами.`,
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
      ru: `## В чём суть

Component harness — это **пульт управления компонентом для тестов**. Это класс из \`@angular/cdk/testing\`, который знает внутреннее устройство компонента и даёт тесту простые асинхронные методы: \`button.click()\`, \`select.clickOptions({ text: 'Выполнен' })\`, \`table.getCellTextByIndex()\`. Тест больше не лезет в чужую вёрстку через \`querySelector\`, а говорит на языке поведения.

Аналогия: пульт от телевизора. Вам не нужно знать, какая микросхема отвечает за громкость, — вы жмёте «+». Производитель может полностью переделать начинку, а кнопка останется на месте. Прямой доступ к DOM — это лезть паяльником внутрь корпуса: работает ровно до следующей модели.

**Какую проблему решает.** Тест через DOM привязан к разметке, которой он не владеет. Классический пример — Angular Material. До v15 текст кнопки лежал во внутреннем элементе с классом \`mat-button-wrapper\`, и многие тесты писали \`querySelector('.mat-button-wrapper')\`. В v15 Material перешёл на компоненты MDC: обёртка стала \`.mdc-button__label\`, и все такие тесты сломались, хотя приложение работало. Вторая боль — служебный код: после каждого клика нужно вызвать \`detectChanges()\`, дождаться \`whenStable()\`, а выпадающие списки и диалоги вообще рендерятся вне компонента. Harness прячет селекторы, стабилизацию и поиск оверлеев за стабильным API. При обновлении библиотеки меняется harness, а не ваши тесты.

## Словарик терминов

- **Component harness (\`ComponentHarness\`)** — базовый класс CDK для тестового «пульта» компонента. Свой harness наследуется от него.
- **\`hostSelector\`** — статическое поле harness: CSS-селектор хост-элемента компонента (обычно совпадает с \`selector\` компонента, например \`'app-counter'\`).
- **\`ComponentFixture\` (фикстура)** — обёртка \`TestBed\` над созданным в тесте компонентом: даёт DOM (\`nativeElement\`), экземпляр и \`detectChanges()\`.
- **\`DebugElement\`** — обёртка Angular над DOM-узлом для тестов (\`fixture.debugElement.query(By.css(...))\`) — «прямой доступ», с которым сравнивают harness.
- **Стабилизация** — «дать Angular доделать работу»: запустить проверку изменений (\`fixture.detectChanges()\`) и дождаться асинхронных задач (\`await fixture.whenStable()\`).
- **\`HarnessEnvironment\`** — адаптер к среде запуска. \`TestbedHarnessEnvironment\` работает с \`TestBed\` и jsdom/браузером, \`SeleniumWebDriverHarnessEnvironment\` — с настоящим браузером через WebDriver.
- **\`HarnessLoader\` (загрузчик)** — объект, который ищет harness внутри корневого элемента: \`getHarness\`, \`getAllHarnesses\`, \`hasHarness\`.
- **\`TestElement\`** — обёртка над DOM-элементом с асинхронными методами \`click\`, \`sendKeys\`, \`text\`, \`getProperty\`. Через неё harness трогает DOM.
- **Локатор (\`locatorFor\`, \`locatorForOptional\`, \`locatorForAll\`)** — функция внутри harness, которая при каждом вызове заново находит элемент или вложенный harness.
- **\`HarnessPredicate\` и \`with()\`** — фильтр для выбора конкретного экземпляра: \`MatButtonHarness.with({ text: 'Save' })\`.
- **Оверлей (overlay)** — слой CDK, куда рендерятся всплывающие элементы: опции \`mat-select\`, диалоги, меню. Он живёт в \`document.body\`, вне фикстуры.
- **Page Object** — паттерн из e2e-тестов: класс, скрывающий селекторы страницы за методами. Harness — тот же принцип на уровне одного компонента.
- **\`parallel\` / \`manualChangeDetection\`** — утилиты CDK: выполнить несколько чтений с одной стабилизацией и временно выключить автостабилизацию.

## Как это работает под капотом

1. \`TestbedHarnessEnvironment.loader(fixture)\` создаёт загрузчик, корень которого — \`fixture.nativeElement\`. Ищет он только **внутри** этого корня.
2. \`loader.getHarness(Query)\` сначала стабилизирует фикстуру, затем ищет все элементы по \`hostSelector\` (плюс \`selector\`/\`ancestor\` из фильтра).
3. На каждый найденный элемент создаётся экземпляр harness со своей «фабрикой локаторов» с корнем в этом элементе. Поэтому \`locatorFor('button')\` внутри harness ищет кнопку только внутри своего компонента.
4. Если передан \`with({...})\`, для каждого кандидата выполняются асинхронные проверки (например, \`getText() === 'Save'\`). Возвращается первый подходящий, иначе — ошибка с описанием фильтра.
5. Методы harness вызывают локаторы **лениво**: каждый вызов заново ищет элемент в текущем DOM и заворачивает его в \`TestElement\`.
6. \`TestElement\` в действиях (\`click\`, \`sendKeys\`, \`setInputValue\`) диспатчит настоящие DOM-события (для клика: \`pointerdown\`, \`mousedown\`, \`pointerup\`, \`mouseup\`, \`click\`; по задизейбленной кнопке \`click\` не отправляется, как и в браузере), а затем стабилизирует фикстуру. Перед чтениями (\`text\`, \`getProperty\`) он тоже стабилизирует. Поэтому ручные \`detectChanges()\` не нужны.
7. Стабилизация в \`TestBed\` — это \`fixture.detectChanges()\` + \`await fixture.whenStable()\`, а внутри \`fakeAsync\` — \`flush()\`.
8. Всё API асинхронное не случайно. В e2e-окружении каждое обращение к DOM — сетевой вызов к браузеру через WebDriver. Promise-интерфейс позволяет одному и тому же harness работать и там, и в unit-тесте.

Упрощённо ядро выглядит так:

\`\`\`ts
class TestbedHarnessEnvironment {
  async getHarness(type, filter?) {
    await this.forceStabilize();                                        // detectChanges + whenStable
    const hosts = this.root.querySelectorAll(type.hostSelector);
    for (const el of hosts) {
      const harness = new type(this.createEnvironment(el));             // корень локаторов = el
      if (!filter || await filter.evaluate(harness)) return harness;    // async-предикаты with()
    }
    throw Error(\`Failed to find element matching ... \${type.hostSelector}\`);
  }
}

class UnitTestElement {
  async click() {
    dispatchMouseSequence(this.element);   // pointerdown → mousedown → pointerup → mouseup → click
    await this.stabilize();                // после действия
  }
  async text() {
    await this.stabilize();                // перед чтением
    return this.element.textContent.trim();
  }
}
\`\`\`

### Пример 1. Хрупкий тест через DOM против теста через harness

\`\`\`ts
// Шаблон: <button matButton="filled" [disabled]="!status" (click)="save()">Save</button>

// ❌ Через DOM: знает внутреннюю разметку Material
const label = fixture.nativeElement.querySelector('button .mat-button-wrapper'); // так было до Material 15
// В Material 21.1 внутри кнопки уже другое:
// <span class="mdc-button__label">Save</span> ← обёртки .mat-button-wrapper нет, label === null
fixture.nativeElement.querySelector('button').click();
fixture.detectChanges();      // не забыть, иначе DOM не обновится
await fixture.whenStable();   // и дождаться асинхронщины

// ✅ Через harness: знает только «кнопка с текстом Save»
const loader = TestbedHarnessEnvironment.loader(fixture);
const save = await loader.getHarness(MatButtonHarness.with({ text: 'Save' }));
console.log(await save.isDisabled(), await save.getAppearance()); // true filled
await save.click();           // стабилизация внутри
\`\`\`

Второй тест переживёт смену разметки: при обновлении Material команда библиотеки обновит \`MatButtonHarness\`, а вызов \`getHarness(...)\` останется тем же.

### \`TestbedHarnessEnvironment\`: три способа получить harness

- **\`loader(fixture)\`** — загрузчик с корнем в фикстуре. Основной вариант: ищет компоненты внутри тестируемого шаблона.
- **\`harnessForFixture(fixture, Harness)\`** — harness для **самого** корневого компонента фикстуры. Хост, который создаёт \`TestBed\`, — это элемент \`div\`, а не \`app-counter\`, поэтому \`loader\` его не найдёт.
- **\`documentRootLoader(fixture)\`** — загрузчик с корнем в \`document.body\`. Нужен для оверлеев: диалогов, меню, снекбаров.

\`\`\`ts
const fixture = TestBed.createComponent(CounterComponent);
const loader = TestbedHarnessEnvironment.loader(fixture);
console.log(await loader.hasHarness(CounterHarness));   // false — корень фикстуры не ищется
const counter = await TestbedHarnessEnvironment.harnessForFixture(fixture, CounterHarness);
await counter.increment();
console.log(await counter.getValue());                  // 1

// Другой тест: страница заказов, кнопка «Удалить» открывает MatDialog в оверлее
const page = TestBed.createComponent(OrdersPageComponent);
const pageLoader = TestbedHarnessEnvironment.loader(page);
await (await pageLoader.getHarness(MatButtonHarness.with({ text: 'Удалить' }))).click();
console.log(await pageLoader.hasHarness(MatDialogHarness)); // false — диалог вне фикстуры
const dialog = await TestbedHarnessEnvironment.documentRootLoader(page).getHarness(MatDialogHarness);
console.log(await dialog.getTitleText());                   // Удалить заказ?
\`\`\`

\`MatDialogHarness\` наследуется от \`ContentContainerComponentHarness\`, поэтому внутри диалога можно искать другие harness: \`await dialog.getHarness(MatButtonHarness.with({ text: 'Да' }))\`.

### \`HarnessLoader\`: поиск одного, всех, по индексу

Пусть на странице бронирования три счётчика: «Взрослые», «Дети», «Младенцы».

\`\`\`ts
const loader = TestbedHarnessEnvironment.loader(fixture);
console.log((await loader.getAllHarnesses(CounterHarness)).length);         // 3
console.log(await loader.countHarnesses(CounterHarness));                   // 3
console.log(await (await loader.getHarness(CounterHarness)).getLabel());    // Взрослые — первый по DOM
console.log(await (await loader.getHarnessAtIndex(CounterHarness, 2)).getLabel()); // Младенцы
console.log(await loader.getHarnessOrNull(CounterHarness.with({ label: 'Пенсионеры' }))); // null
await loader.getHarness(CounterHarness.with({ label: 'Пенсионеры' }));
// Error: Failed to find element matching one of the following queries:
// (CounterHarness with host element matching selector: "app-counter" satisfying the constraints: label = "Пенсионеры")
\`\`\`

\`getHarness\` молча берёт **первый** подходящий экземпляр. Если одинаковых виджетов несколько, используйте фильтр, \`getHarnessAtIndex\` или \`getAllHarnesses\`.

### Фильтры: \`with()\` и \`HarnessPredicate\`

У каждого готового harness есть статический \`with(options)\`, который возвращает \`HarnessPredicate\`. Строка в фильтре сравнивается **точно**, регулярное выражение — частично. Базовые фильтры \`selector\` и \`ancestor\` есть у всех.

\`\`\`ts
// В шаблоне: <button mat-button>Save</button> <button mat-button>Save draft</button>
//            <div class="toolbar"><button mat-button>Save</button></div>
await loader.countHarnesses(MatButtonHarness.with({ text: 'Save' }));                      // 2
await loader.countHarnesses(MatButtonHarness.with({ text: /Save/ }));                      // 3
await loader.countHarnesses(MatButtonHarness.with({ text: 'Save', ancestor: '.toolbar' })); // 1
\`\`\`

### Готовые harness Angular Material

Material поставляет harness почти для каждого компонента в отдельных entry point вида \`@angular/material/<компонент>/testing\`: \`MatButtonHarness\`, \`MatSelectHarness\`, \`MatInputHarness\`, \`MatTableHarness\`, \`MatDialogHarness\` и другие. Самый показательный — select: его опции рендерятся в оверлее.

\`\`\`ts
const select = await loader.getHarness(MatSelectHarness);
await select.open();
console.log(fixture.nativeElement.querySelectorAll('mat-option').length); // 0 — опций нет в фикстуре
console.log(document.querySelectorAll('mat-option').length);              // 2 — они в оверлее
const options = await select.getOptions();
console.log(await Promise.all(options.map(o => o.getText())));            // [ 'Новый', 'Выполнен' ]
await select.clickOptions({ text: 'Выполнен' });
console.log(await select.getValueText(), fixture.componentInstance.status); // Выполнен done
\`\`\`

\`MatSelectHarness\` сам знает, где искать панель, и сам открывает её внутри \`clickOptions\`, так что отдельный \`open()\` перед ним не обязателен. Для таблиц и форм то же самое:

\`\`\`ts
const table = await loader.getHarness(MatTableHarness);
const search = await loader.getHarness(MatInputHarness);
await search.setValue('ан');                    // фильтр по имени
console.log(await table.getCellTextByIndex());  // [ [ '1', 'Аня' ], [ '3', 'Анатолий' ] ]
\`\`\`

### Свой harness: \`ComponentHarness\`, \`hostSelector\`, \`locatorFor\`

\`\`\`ts
@Component({
  selector: 'app-counter',
  template: \`
    <span class="label">{{ label() }}</span>
    <button class="dec" (click)="change(-1)" [disabled]="value() <= 0">−</button>
    <span class="value">{{ value() }}</span>
    <button class="inc" (click)="change(1)">+</button>\`,
})
export class CounterComponent { /* label = input(), value = signal(0), change(d) */ }

export interface CounterHarnessFilters extends BaseHarnessFilters { label?: string | RegExp; }

export class CounterHarness extends ComponentHarness {
  static hostSelector = 'app-counter';

  static with(options: CounterHarnessFilters = {}) {
    return new HarnessPredicate(CounterHarness, options)
      .addOption('label', options.label, (h, label) => HarnessPredicate.stringMatches(h.getLabel(), label));
  }

  private incButton = this.locatorFor('button.inc');   // храним функцию-локатор, а не элемент
  private decButton = this.locatorFor('button.dec');
  private valueEl = this.locatorFor('.value');
  private labelEl = this.locatorFor('.label');

  async increment(times = 1) { for (let i = 0; i < times; i++) await (await this.incButton()).click(); }
  async getValue() { return Number(await (await this.valueEl()).text()); }
  async getLabel() { return (await this.labelEl()).text(); }
  async canDecrement() { return !(await (await this.decButton()).getProperty<boolean>('disabled')); }
}

const kids = await loader.getHarness(CounterHarness.with({ label: 'Дети' }));
console.log(await kids.getValue(), await kids.canDecrement()); // 0 false
await kids.increment(2);
console.log(await kids.getValue(), await kids.canDecrement()); // 2 true
\`\`\`

Публичные методы описывают поведение («увеличить», «можно ли уменьшить»), а все селекторы спрятаны в \`private\`-локаторах. Поменяли вёрстку счётчика — правите один harness, а не сотню тестов. \`locatorForOptional\` возвращает \`null\` вместо ошибки (удобно для \`@if\`), \`locatorForAll\` — массив.

### \`TestElement\`: что умеет элемент внутри harness

Через \`TestElement\` harness кликает (\`click\`, \`rightClick\`), печатает (\`sendKeys\` с \`TestKey.ENTER\`, \`TestKey.ESCAPE\` и другими клавишами, \`clear\`, \`setInputValue\`), читает (\`text\`, \`getAttribute\`, \`getProperty\`, \`hasClass\`, \`isFocused\`) и шлёт произвольные события (\`dispatchEvent\`).

\`\`\`ts
class SearchHarness extends ComponentHarness {
  static hostSelector = 'app-search';
  private input = this.locatorFor('input.q');
  private clearBtn = this.locatorForOptional('button.clear'); // кнопка есть только при непустом поле

  async search(text: string) {
    const input = await this.input();
    await input.clear();
    await input.sendKeys(text, TestKey.ENTER); // keydown/keypress/input/keyup на каждый символ
  }
  async hasClear() { return (await this.clearBtn()) !== null; }
}

console.log(await search.hasClear()); // false
await search.search('angular');       // компонент обработал (keydown.enter)
console.log(await search.hasClear()); // true
\`\`\`

### Автостабилизация, \`parallel\` и \`manualChangeDetection\`

В zoneless-режиме (по умолчанию в Angular 21) изменение сигнала не перерисовывает DOM мгновенно. Тест через DOM это ловит, harness — нет:

\`\`\`ts
counterInstance.value.set(5); // экземпляр CounterComponent, полученный через fixture.debugElement
console.log(fixture.nativeElement.querySelector('.value').textContent); // 0 — DOM ещё старый
console.log(await counter.getValue());                                  // 5 — harness сначала стабилизировал
\`\`\`

Каждое действие и чтение harness — отдельная стабилизация. Для пачки чтений есть \`parallel\`: одна стабилизация до и одна после.

\`\`\`ts
const counters = await loader.getAllHarnesses(CounterHarness); // «Дети» уже увеличены до 2
const [adults, children] = await parallel(() => [counters[0].getValue(), counters[1].getValue()]); // 0 2
\`\`\`

\`manualChangeDetection(async () => {...})\` временно выключает автостабилизацию, если нужно проверить промежуточное состояние:

\`\`\`ts
await manualChangeDetection(async () => {
  await counter.increment();
  console.log(fixture.nativeElement.querySelector('.value').textContent); // 0
  fixture.detectChanges();
  console.log(fixture.nativeElement.querySelector('.value').textContent); // 1
});
\`\`\`

### Переносимость между окружениями

Harness ничего не знает о \`TestBed\`: он работает через абстрактные \`LocatorFactory\` и \`TestElement\`. CDK поставляет два окружения: \`TestbedHarnessEnvironment\` для unit-тестов и \`SeleniumWebDriverHarnessEnvironment\` (\`@angular/cdk/testing/selenium-webdriver\`) для e2e в настоящем браузере. Protractor-вариант остался в прошлом вместе с Protractor; для Cypress и Playwright есть сторонние адаптеры. Один \`CounterHarness\` можно использовать и в компонентном тесте, и в сквозном сценарии.

### Где это применяется на практике

- **Дизайн-система и библиотека компонентов**: harness поставляется рядом с компонентом в secondary entry point \`my-lib/testing\`, как делает Material. Команды-потребители пишут тесты против стабильного контракта.
- **Корпоративные формы** с \`mat-select\`, \`mat-autocomplete\`, datepicker и диалогами подтверждения: оверлеи без harness — главный источник хрупких тестов.
- **Таблицы и гриды**: \`MatTableHarness.getCellTextByIndex()\` или свой \`GridHarness\` с методами \`sortBy('name')\`, \`getCell(row, col)\`, \`goToPage(3)\` вместо обхода сотен \`td\`.
- **Обновления мажорных версий** Material/CDK: тесты на harness переживают смену разметки, правится только harness.
- **Общие сценарии unit и e2e**: один harness-слой для \`TestBed\` и для WebDriver.

## Важные нюансы и подводные камни

- **Забытый \`await\`.** Все методы асинхронные. Без \`await\` тест читает состояние до клика: в моём прогоне сразу после \`counter.increment()\` без \`await\` DOM показывал \`0\`, а если тест успевал закончиться раньше клика, Vitest ловил необработанную ошибку \`Harness is attempting to use a fixture that has already been destroyed.\`
- **Ручной \`detectChanges()\` рядом с harness — лишний, но не опасный.** Harness и так стабилизирует фикстуру перед чтением и после действия; проверка с \`detectChanges()\` до и после клика дала тот же результат. Настоящая гонка — забытый \`await\` или чтение DOM напрямую между асинхронными шагами.
- **Корень фикстуры не находится через \`loader\`.** Для тестируемого компонента-хоста нужен \`harnessForFixture\`, иначе \`getHarness\` упадёт с \`Failed to find element\`.
- **Оверлеи вне фикстуры.** Диалоги, меню и снекбары ищутся через \`documentRootLoader\`. Готовые Material harness для select и autocomplete делают это сами.
- **\`getHarness\` берёт первый экземпляр.** На странице с несколькими одинаковыми виджетами без фильтра вы тихо тестируете «первый попавшийся». Используйте \`with\`, \`getHarnessAtIndex\` или \`getAllHarnesses\`.
- **Строковый фильтр точный.** \`with({ text: 'Save' })\` не найдёт «Save draft». Для частичного совпадения нужен RegExp.
- **Свой harness без \`hostSelector\`.** TypeScript не даст передать такой класс в \`getHarness\` (\`Property 'hostSelector' is missing\`); если обойти типы, поиск упадёт с ошибкой селектора. Чаще встречается другой баг: \`hostSelector\` не совпадает с реальным селектором компонента, и тогда загрузчик ничего не находит.
- **Не храните \`TestElement\` между действиями.** Если элемент перерисовался (\`@if\`, \`@for\`), сохранённая ссылка указывает на отсоединённый узел: в моём прогоне клик по нему прошёл без ошибки и без эффекта. Храните функцию-локатор и вызывайте её заново.
- **Анимации.** В jsdom с включёнными анимациями \`MatDialog\` после клика «Да» в моём прогоне так и не закрылся. Отключайте их провайдером \`{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }\` (или старым \`provideNoopAnimations()\`, он помечен устаревшим с 20.2).
- **Harness там, где хватает \`DebugElement\`.** Для простого компонента из пары элементов с текстом это лишний слой; harness окупается на интерактивных виджетах и в переиспользуемых библиотеках.
- **Скорость.** Каждое действие и чтение — стабилизация и новый поиск в DOM. Сотни последовательных \`await\` в большом гриде заметно медленнее; группируйте чтения через \`parallel\`.
- **API harness тоже версионируется.** При переходе Material на MDC старые harness жили отдельно в \`legacy-*\` entry point, а потом были удалены. Но правки сосредоточены в одном месте, а не размазаны по тестам.

**Плюсы:** тесты не зависят от внутренней разметки и переживают обновления библиотек; читаются как сценарий пользователя; автоматическая стабилизация вместо \`detectChanges\`/\`whenStable\`; оверлеи, фильтры и поиск экземпляров из коробки; один harness для unit и e2e; готовые harness для всего Angular Material.
**Минусы:** ещё один слой кода, который надо писать и поддерживать для своих компонентов; всё асинхронное, и забытый \`await\` даёт моргающие тесты; медленнее прямого DOM на больших объёмах; для простых компонентов избыточен.

## Как это спрашивают на собеседовании

**Главный вывод:** harness — это Page Object для отдельного компонента. Он прячет селекторы и стабилизацию за асинхронным API в терминах поведения, поэтому при смене вёрстки или версии библиотеки меняется harness, а не тесты.

Типичные формулировки: «Что такое component harness?», «Почему тесты на Material ломаются после обновления?», «Как протестировать \`mat-select\` или диалог?», «Как написать harness для своего компонента?».

Что могут спросить следом:

- *Чем harness отличается от Page Object?* — Принцип тот же, но harness привязан к одному компоненту, вкладывается в другие harness и переносим между \`TestBed\` и WebDriver.
- *Как выбрать нужный экземпляр среди многих?* — Фильтры \`with({...})\`, \`ancestor\`/\`selector\`, \`getHarnessAtIndex\`, \`getAllHarnesses\`.
- *Почему все методы асинхронные?* — Чтобы тот же код работал в e2e, где каждое обращение к DOM — вызов к браузеру; заодно внутри каждого метода есть стабилизация.
- *Как найти диалог или опции select?* — Они в оверлее вне фикстуры: \`documentRootLoader\`; Material select ищет опции сам.
- *Как написать свой harness?* — Наследовать \`ComponentHarness\`, задать \`static hostSelector\`, спрятать селекторы в \`locatorFor\`, наружу дать методы поведения и при необходимости \`static with()\` на \`HarnessPredicate\`.

### Ответ на 1 минуту

> Component harness — это класс из CDK, который даёт тестам стабильное API для работы с компонентом и прячет его внутренний DOM. Проблема, которую он решает: тест через \`querySelector\` по внутренним классам Material ломается при любой смене вёрстки — так было при переходе Material на MDC. Работает так: \`TestbedHarnessEnvironment.loader(fixture)\` находит компонент по \`hostSelector\`, фильтр \`with\` выбирает нужный экземпляр, а методы вроде \`click\` или \`getText\` сами вызывают \`detectChanges\` и ждут \`whenStable\`. Material поставляет готовые harness, для своих компонентов я наследую \`ComponentHarness\` и прячу селекторы в \`locatorFor\`. Плюсы: устойчивость к вёрстке, читаемость и переносимость между \`TestBed\` и WebDriver. Нюансы: всё асинхронное, без \`await\` тесты моргают; оверлеи ищутся через \`documentRootLoader\`; для простого компонента хватит \`DebugElement\`.`,
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
      ru: `## В чём суть

Cypress и Playwright — два популярных инструмента для e2e-тестов: робот открывает настоящий браузер, кликает как пользователь и проверяет результат. Главная разница между ними — **где живёт сам тест**: Cypress выполняется **внутри браузера**, рядом с приложением, а Playwright управляет браузером **снаружи**, как пультом. Вторая половина вопроса — как сделать такие тесты надёжными: перестать ждать «на глазок» и подменять ответы сервера.

Аналогия: Cypress — врач, который забрался внутрь пациента. Он видит всё изнутри в мельчайших подробностях (отсюда шикарная отладка с «машиной времени»), но ограничен размерами пациента: вести двух пациентов сразу или переходить между ними неудобно. Playwright — врач с пультом снаружи: может вести несколько пациентов параллельно, причём разных видов (Chromium, Firefox, WebKit), но не видит происходящее так же интимно.

А flaky-тест — это пожарная сигнализация, которая срабатывает, когда вы жарите котлеты. Пару раз все проверили, потом перестали реагировать вообще — и в настоящий пожар никто не побежит.

**Какую проблему решает.** Unit-тесты не ловят поломки на стыках: роутинг, интерсепторы, реальная вёрстка в реальном браузере. E2E ловят, но они медленные и склонны «моргать». Нестабильный набор тестов хуже, чем никакой: команда привыкает перезапускать красный CI и пропускает настоящий баг. Поэтому ответ состоит из двух частей: какой инструмент выбрать и как сделать так, чтобы красному прогону снова верили.

## Словарик терминов

- **E2E-тест (end-to-end)** — тест «от края до края»: запускает всё приложение в браузере и проходит сценарий пользователя целиком.
- **Flaky-тест (моргающий)** — тест, который на одном и том же коде то зелёный, то красный. Почти всегда это гонка: тест не дождался приложения.
- **Раннер (test runner)** — программа, которая находит тесты, запускает их, собирает результаты и отчёты.
- **CDP (Chrome DevTools Protocol)** — протокол, по которому внешняя программа управляет Chromium: кликает, читает DOM, перехватывает сеть.
- **Auto-waiting / actionability** — встроенное ожидание: перед кликом инструмент сам ждёт, пока элемент появится, станет видимым, неподвижным и доступным.
- **Retry-ability / web-first assertions** — проверка, которая повторяется, пока не станет истинной или не истечёт таймаут, вместо одной проверки «прямо сейчас».
- **Локатор / селектор (locator)** — способ найти элемент на странице: по роли, тексту, атрибуту \`data-testid\`.
- **\`data-testid\`** — специальный атрибут в разметке только для тестов; не меняется при редизайне и переводе.
- **Стаб сети (network stubbing)** — подмена ответа сервера: тест сам решает, что «вернул» бэкенд.
- **Фикстура (fixture)** — в Cypress это файл с подготовленными данными (\`users.json\`); в Playwright — объект, который раннер передаёт в тест (\`page\`, \`request\`). Одно слово, два смысла.
- **Browser context** — в Playwright изолированный «профиль» браузера со своими cookie и storage; создаётся за миллисекунды.
- **Шардинг (sharding)** — деление набора тестов на N частей, которые идут на N машинах параллельно.
- **Trace / time-travel** — запись прогона по шагам: снимок DOM, сеть, консоль на каждом действии. Позволяет «отмотать» тест назад.
- **Сидинг (seeding)** — подготовка данных перед тестом: создать пользователя, заказ, настройки.
- **Карантин (quarantine)** — временный вывод нестабильного теста из блокирующего набора с задачей на расследование.
- **Контрактный тест (contract test)** — проверка, что мок и реальный API описывают один и тот же формат данных.

## Как это работает под капотом

Сначала устройство двух инструментов, потому что из него следуют все их плюсы и минусы.

Как устроен Cypress:

1. Команда \`cypress run\` запускает Node-процесс, свой прокси-сервер и браузер, поэтому весь сетевой трафик приложения идёт через Cypress.
2. В одной вкладке открываются два iframe: ваше приложение и код теста, поэтому тест живёт в том же event loop и может напрямую трогать \`window\` приложения.
3. Команды \`cy.get()\`, \`cy.click()\` не выполняются сразу, а встают в очередь, поэтому \`cy.get()\` возвращает не элемент, а «цепочку», и \`await\` к ней неприменим.
4. Запросы (queries) в очереди повторяются, пока следующее за ними утверждение не станет истинным, по умолчанию до 4 секунд, поэтому явные ожидания почти не нужны.
5. Сеть идёт через прокси, поэтому \`cy.intercept\` видит и подменяет и \`fetch\`, и XHR.

Как устроен Playwright:

1. Раннер запускает несколько Node-процессов (воркеров), и каждый выполняет свои тест-файлы, поэтому параллелизм встроен.
2. Воркер управляет браузером по протоколу: CDP для Chromium и собственные доработанные протоколы для Firefox и WebKit, поэтому один тест можно прогнать в трёх движках.
3. Каждый тест получает новый browser context, поэтому тесты не делят cookie и \`localStorage\`, а сценарий «два пользователя в чате» — это просто два контекста.
4. Перед каждым действием идут проверки actionability (элемент в DOM, видим, не анимируется, включён, не перекрыт), поэтому клик не уходит «в пустоту».
5. Утверждения вида \`expect(locator).toHaveText()\` повторяются до 5 секунд по умолчанию, поэтому они дожидаются асинхронного рендера.

### Пример 1. Один и тот же тест в двух инструментах

\`\`\`ts
// Cypress: команды в очереди, без await
it('показывает заказы', () => {
  cy.intercept('GET', '/api/orders', { fixture: 'orders.json' }).as('orders');
  cy.visit('/orders');
  cy.wait('@orders');                                   // ждём конкретный запрос
  cy.get('[data-testid="order-row"]').should('have.length', 3); // повторяется до 4 с
});

// Playwright: обычный async/await, локаторы ленивые
test('показывает заказы', async ({ page }) => {
  await page.route('**/api/orders', route => route.fulfill({ json: orders }));
  await page.goto('/orders');
  await expect(page.getByTestId('order-row')).toHaveCount(3); // повторяется до 5 с
});
// Оба теста проходят, как только в таблице появятся 3 строки, — без единого sleep
\`\`\`

Стиль разный, идея одна: тест ждёт **факт** (запрос завершился, строк стало три), а не время.

### Пример 2. Почему фиксированный \`sleep\` делает тест моргающим

Ниже модель того, что происходит: таблица появляется через разное время в зависимости от загрузки машины. Этот код запускался в Node, вывод настоящий.

\`\`\`js
const sleep = ms => new Promise(r => setTimeout(r, ms));

function startApp(renderMs) {               // «приложение» рисует таблицу через renderMs
  const app = { tableVisible: false };
  setTimeout(() => (app.tableVisible = true), renderMs);
  return app;
}

async function waitFor(check, { timeout = 5000, interval = 50 } = {}) {
  const start = Date.now();                 // так устроено auto-waiting внутри инструментов
  while (Date.now() - start < timeout) {
    if (check()) return;
    await sleep(interval);
  }
  throw new Error(\`не дождались за \${timeout} мс\`);
}

for (const renderMs of [120, 480, 650]) {   // быстрый ноутбук … загруженный CI
  const a = startApp(renderMs);
  await sleep(500);                          // ❌ фиксированное ожидание
  const sleepResult = a.tableVisible ? 'pass' : 'FAIL';
  const b = startApp(renderMs);
  await waitFor(() => b.tableVisible);       // ✅ ждём факт
  console.log(\`рендер \${renderMs} мс: sleep(500) → \${sleepResult}, waitFor → pass\`);
}
// рендер 120 мс: sleep(500) → pass, waitFor → pass
// рендер 480 мс: sleep(500) → pass, waitFor → pass
// рендер 650 мс: sleep(500) → FAIL, waitFor → pass
\`\`\`

\`sleep(500)\` одновременно слишком длинный (на быстром ноутбуке тратит 380 мс впустую) и слишком короткий (на CI падает). Опрос условия заканчивается сразу после появления элемента и падает только при настоящей проблеме.

### Auto-waiting и web-first assertions в Playwright

Что делает: каждое действие (\`click\`, \`fill\`) само ждёт actionability, а \`expect(locator)\` повторяет проверку до таймаута.

\`\`\`ts
// ✅ повторяется, пока строк не станет 3 (или 5 с не пройдёт)
await expect(page.getByRole('row')).toHaveCount(3);

// ❌ ловушка: count() вызывается один раз, сравнение уже не повторяется
expect(await page.getByRole('row').count()).toBe(3);
\`\`\`

Вторая строка выглядит так же, но проверяет состояние в одно мгновение — классический источник моргания. Правило: внутри \`expect(...)\` должен стоять **локатор**, а не уже вычисленное значение.

### Retry-ability в Cypress

Что делает: запросы (\`cy.get\`, \`cy.find\`, \`.its\`) перезапускаются, пока утверждение в \`.should()\` не станет истинным. Действия (\`click\`, \`type\`) повторно не выполняются.

\`\`\`ts
cy.get('[data-testid="total"]').should('have.text', '1 299,90 ₽'); // ✅ повторяется

cy.get('[data-testid="total"]').then($el => {
  expect($el.text()).to.eq('1 299,90 ₽');   // ❌ .then не повторяется: одна проверка
});
\`\`\`

Когда использовать: всё, что можно, выражайте через \`.should()\`, а \`.then()\` оставляйте для действий с уже стабильным значением.

### Стабильные селекторы

Что делает: локатор привязывается к смыслу элемента, а не к его оформлению.

\`\`\`html
<button class="btn btn-primary mt-2" data-testid="save-order">Сохранить</button>
\`\`\`

\`\`\`ts
page.locator('.btn.btn-primary');          // ❌ сломается при редизайне
page.getByText('Сохранить');               // ⚠️ сломается при переводе на английский
page.getByTestId('save-order');            // ✅ меняется только осознанно
page.getByRole('button', { name: /сохранить|save/i }); // ✅ заодно проверяет доступность
\`\`\`

\`getByRole\` ищет элемент так, как его видит скринридер, поэтому заодно ловит потерянные \`aria\`-атрибуты. Для двуязычного приложения \`data-testid\` надёжнее текста.

### Стаб сети в Playwright: \`page.route\`

Что делает: перехватывает запросы, подходящие под шаблон, и позволяет ответить самому (\`fulfill\`), оборвать (\`abort\`), пропустить дальше (\`continue\`) или подправить настоящий ответ (\`fetch\`).

\`\`\`ts
// подмена успешного ответа
await page.route('**/api/users', route => route.fulfill({ json: [{ id: 1, name: 'Анна' }] }));

// проверка обработки ошибки сервера
await page.route('**/api/orders', route => route.fulfill({ status: 500, json: { message: 'down' } }));
await page.goto('/orders');
await expect(page.getByTestId('error-banner')).toBeVisible();

// настоящий ответ, но с подправленным полем
await page.route('**/api/profile', async route => {
  const response = await route.fetch();
  const json = await response.json();
  await route.fulfill({ response, json: { ...json, plan: 'premium' } });
});

// дождаться конкретного запроса
const done = page.waitForResponse('**/api/orders');
await page.getByTestId('reload').click();
await done;
\`\`\`

Когда использовать: сценарии ошибок (500, таймаут, пустой список), которые на настоящем бэкенде воспроизвести трудно, и тесты, которые не должны зависеть от чужого стенда.

### Стаб сети в Cypress: \`cy.intercept\`

Что делает: регистрирует правило в прокси Cypress; можно подменить ответ, задержать его или просто подсмотреть и дождаться.

\`\`\`ts
cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('users');
cy.intercept('POST', '/api/orders', { statusCode: 500, body: { message: 'down' }, delay: 300 }).as('save');

cy.visit('/orders');
cy.wait('@users').its('response.statusCode').should('eq', 200);
cy.get('[data-testid="save-order"]').click();
cy.wait('@save');
cy.get('[data-testid="error-banner"]').should('be.visible');
\`\`\`

\`cy.wait('@users')\` ждёт **конкретное событие сети**, а не абстрактные три секунды. Это и есть главный приём против моргания: ждать факт, а не время.

### Изоляция состояния и сидинг через API

Что делает: каждый тест сам готовит себе данные запросом к API и не зависит от того, что оставил предыдущий.

\`\`\`ts
// Playwright: данные через API, логин один раз на весь прогон
test.beforeEach(async ({ request }) => {
  await request.post('/api/test/seed', { data: { orders: 3 } });
});
// в playwright.config: setup-проект логинится и сохраняет storageState,
// остальные тесты стартуют уже залогиненными

// Cypress: то же самое
beforeEach(() => {
  cy.request('POST', '/api/test/seed', { orders: 3 });
  cy.session('admin', () => { /* логин один раз, cookie кэшируются */ });
});
\`\`\`

Логин кликами в каждом тесте добавляет минуты к прогону и даёт каскадные падения: сломалась форма логина — покраснели все 300 тестов.

### Детерминированные время и анимации

Что делает: убирает из теста всё, что зависит от часов и скорости машины.

\`\`\`ts
// Playwright 1.45+: управляемые часы
await page.clock.setFixedTime(new Date('2026-10-06T10:00:00'));
// Cypress
cy.clock(new Date('2026-10-06T10:00:00').getTime());

// выключить CSS-анимации и переходы (Playwright)
await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
\`\`\`

Сюда же относятся фиксированный seed для генераторов случайных данных и одинаковые часовой пояс и локаль браузера на всех машинах.

### Retries раннера и карантин

Что делает: упавший тест перезапускается; если со второй попытки прошёл, Playwright помечает его в отчёте как flaky.

\`\`\`ts
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: { trace: 'on-first-retry' },        // трейс пишется только для перезапуска
});
// cypress.config.ts
export default defineConfig({ retries: { runMode: 2, openMode: 0 } });
\`\`\`

\`\`\`bash
npx playwright test orders.spec.ts --repeat-each=20   # воспроизвести моргание
\`\`\`

Retries — это обезболивающее, а не лечение. Флейк переводят в карантин (тег и отдельный неблокирующий job), заводят задачу и смотрят трейс.

### Как выбрать

- **Нужны Safari/WebKit и Firefox в одном прогоне** — Playwright: три движка из коробки в одной команде. Cypress за один запуск работает в одном браузере, официально — Chrome-семейство, Firefox и Electron, а WebKit у него экспериментальный.
- **Несколько вкладок, два пользователя, переходы между доменами** — Playwright. В Cypress вкладок нет вовсе, а другой домен требует \`cy.origin()\` (стабилен с версии 12).
- **Большой набор и дешёвый CI** — Playwright: шардинг \`--shard=1/4\` и параллельные воркеры встроены и бесплатны; параллельный режим Cypress (\`--parallel\`) работает через платный Cypress Cloud или сторонние плагины.
- **Команда ценит интерактивную отладку и быстрый старт** — Cypress: живое окно, time-travel по шагам, очень мягкий порог входа.
- **Тесты пишут не только JS-разработчики** — Playwright: есть версии для Python, Java и .NET.
- **Уже есть большой рабочий набор на одном из них** — переписывать без веской причины не стоит: стабильность зависит от дисциплины больше, чем от инструмента.

### Где это применяется на практике

- **Критичные пути enterprise-приложения**: логин, создание заявки, оплата, экспорт — небольшой набор e2e против настоящего стенда, который блокирует релиз.
- **Сценарии ошибок большой формы или грида**: через \`page.route\` отдаём 500, пустой список или 10 000 строк и проверяем баннер, пустое состояние и виртуальный скролл.
- **CI-пайплайн**: e2e идут на уже собранном артефакте, шардируются на 4–8 машин, трейсы и видео упавших тестов сохраняются как артефакты.
- **Мультиязычный интерфейс**: селекторы по \`data-testid\` переживают переключение языка, а отдельный тест проверяет сами переводы.
- **Ролевые сценарии**: два browser context в Playwright — менеджер создаёт заявку, согласующий видит её у себя.

## Важные нюансы и подводные камни

- **\`wait(3000)\` вместо ожидания события.** На быстрой машине зелено, на загруженном CI красно. Ждите элемент или запрос, а не время.
- **\`retries: 3\` навсегда.** Так вы прячете реальный баг гонки и учите команду не верить красному прогону. Retries — временная мера на время расследования.
- **Сидинг через UI.** Логин кликами в каждом тесте — плюс минуты к прогону и главный источник каскадных падений.
- **Только замоканная сеть.** Через полгода моки описывают API, которого уже нет, а тесты зелёные. На критичных путях оставляйте сценарии против настоящего API или контрактные тесты.
- **Селекторы по тексту** ломаются от локализации и правок копирайта.
- **\`expect(await locator.count())\` не повторяется.** Вычисленное значение проверяется один раз; повторяет только \`expect(locator)\`.
- **\`await cy.get()\` не работает.** Команды Cypress — очередь, а не промисы; смешивание с \`async/await\` ломает порядок выполнения.
- **Общие данные при параллельном прогоне.** Два воркера правят одного пользователя — тесты мешают друг другу. Решение — свой набор данных и свой пользователь на каждый воркер (номер воркера есть в \`test.info().parallelIndex\`).
- **PWA и Service Worker.** Если запрос обслуживает Service Worker, \`page.route\` может его не увидеть; для тестов Service Worker блокируют опцией \`serviceWorkers: 'block'\`. Проверьте поведение на своей версии.
- **Как отличить флейк от бага.** Перезапустить тот же коммит много раз (\`--repeat-each\`) и открыть трейс упавшей попытки: флейк виден как гонка, баг падает стабильно.

**Плюсы:** e2e с auto-waiting, стабами сети и изоляцией данных ловят поломки на стыках слоёв и, при дисциплине, работают стабильно; Playwright даёт кросс-браузерность и бесплатный масштаб, Cypress — лучшую интерактивную отладку.
**Минусы:** e2e медленнее и дороже unit-тестов, требуют инфраструктуры для данных; моки расходятся с реальным API без контрактных проверок; у Cypress нет вкладок и бесплатного параллелизма, у Playwright отладка менее наглядна без trace viewer.

## Как это спрашивают на собеседовании

**Главный вывод:** Cypress живёт внутри браузера (отличная отладка, но одна вкладка и ограничения архитектуры), Playwright управляет браузером снаружи (три движка, контексты, встроенный параллелизм). Флейки лечатся ожиданием фактов вместо времени, стабильными селекторами, изоляцией данных и детерминированным временем, а стабы сети обязательно дополняются проверками против настоящего API.

Типичные формулировки: «Чем Cypress отличается от Playwright?», «Почему e2e-тесты моргают и что вы с этим делаете?», «Как замокать бэкенд в e2e?».

Что могут спросить следом:

- *Как отличить флейк от реального бага?* — Прогнать тот же коммит много раз и посмотреть трейс: флейк — гонка, баг воспроизводится стабильно.
- *Что делать с общим состоянием при параллельном прогоне?* — Отдельный набор данных и пользователь на каждый воркер, сидинг через API.
- *Зачем тогда retries?* — Чтобы не блокировать команду, пока флейк в карантине и расследуется; навсегда их не оставляют.
- *Не разойдутся ли моки с API?* — Разойдутся, поэтому нужны контрактные тесты или смоук-набор против настоящего стенда.

### Ответ на 1 минуту

> Архитектурно они разные: Cypress работает внутри браузера, в том же event loop, что приложение, — отсюда отличный DX, time-travel отладка и авто-повтор запросов, но нет нескольких вкладок, а другой домен требует \`cy.origin\`. Playwright управляет браузером снаружи по протоколу: Chromium, Firefox и WebKit, изолированные контексты, встроенный шардинг и auto-waiting. С флейками борюсь системно: жду факт — элемент или запрос — вместо \`sleep\`, селекторы по \`data-testid\` или роли, данные готовлю через API, фиксирую время и отключаю анимации. Retries раннера включаю только как временную меру, а нестабильный тест ставлю в карантин и разбираю по трейсу. Сеть стабаю через \`page.route\` или \`cy.intercept\`, но на критичных путях оставляю проверки против настоящего API. Для кросс-браузерности и масштаба CI выбираю Playwright.`,
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
      ru: `## В чём суть

Code coverage показывает, **какие строки выполнились** во время тестов, но ничего не говорит о том, **проверил ли их хоть один \`expect\`**. Mutation testing заходит с другой стороны: он нарочно **портит ваш код** маленькими правками и смотрит, заметят ли это тесты. Не заметили — значит в этом месте тесты только создают видимость защиты.

Аналогия: проверка охраны на объекте. Coverage — это отчёт «охранник обошёл все коридоры»: обошёл, галочка стоит, но спал он при этом или нет — неизвестно. Mutation testing — это когда вы подсылаете человека без пропуска и смотрите, поднимут ли тревогу. Только второе реально что-то доказывает.

**Какую проблему решает.** Командам ставят цель «90% покрытия», и цифра начинает жить своей жизнью: появляются тесты, которые вызывают функции, но ничего не проверяют. В отчёте зелено, а регрессии проезжают в прод. Mutation testing даёт честную оценку: сколько реальных поломок ваши тесты способны поймать.

## Словарик терминов

- **Code coverage (покрытие кода)** — доля кода, которая выполнилась хотя бы раз во время прогона тестов.
- **Инструментирование (instrumentation)** — подготовка кода к замеру: инструмент вставляет счётчики, которые увеличиваются при выполнении каждой строки и ветки.
- **Istanbul / V8 coverage** — два способа собрать покрытие в JS: Istanbul вставляет счётчики в исходник, V8 считает выполнение прямо в движке.
- **Statement / line / function coverage** — покрытие инструкций, строк и функций: выполнилась ли каждая хотя бы раз.
- **Branch coverage (покрытие веток)** — прошёл ли тест **каждый** вариант условия: и \`if\`, и \`else\`, обе половины тернарника.
- **Assertion (утверждение, \`expect\`)** — проверка результата в тесте. Без неё тест падает только если код бросил исключение.
- **Закон Гудхарта** — когда метрика становится целью, она перестаёт быть хорошей метрикой.
- **Мутант (mutant)** — копия кода с одной маленькой «поломкой», например \`>=\` заменён на \`>\`.
- **Мутатор (mutation operator)** — правило, по которому создаются мутанты: «поменять оператор сравнения», «заменить условие на \`true\`».
- **Killed / Survived** — мутант убит, если хоть один тест упал; выжил, если все тесты остались зелёными на испорченном коде.
- **NoCoverage / Timeout** — мутант в коде, который не выполняет ни один тест; или мутант, из-за которого код завис (считается пойманным).
- **Mutation score** — доля пойманных мутантов от всех проверенных.
- **Эквивалентный мутант (equivalent mutant)** — правка, которая не меняет поведение вообще; убить её невозможно в принципе.
- **Stryker** — основной инструмент mutation testing для JavaScript и TypeScript.
- **Граничное значение (boundary value)** — значение на краю условия (\`18\` для \`age >= 18\`), где живёт большинство реальных багов.
- **Ratchet («храповик»)** — правило порога «не ниже текущего уровня» вместо абсолютной цифры.

## Как это работает под капотом

Сначала о том, как считается покрытие. Istanbul (его используют Karma, Jest и одна из опций Vitest) делает так:

1. Перед запуском тестов он разбирает исходник и вставляет счётчик перед каждой инструкцией и в каждую ветку условия.
2. Тесты вызывают код, поэтому счётчики увеличиваются — неважно, проверяет ли кто-то результат.
3. После прогона инструмент делит «счётчики больше нуля» на «все счётчики» и строит отчёт по строкам, веткам и функциям.
4. Поэтому покрытие отвечает только на вопрос «был ли код запущен», а не «работает ли он правильно».

Упрощённо инструментированный код выглядит так:

\`\`\`js
// было
function finalPrice(price, isVip) {
  const discount = isVip ? 0.2 : 0;
  return price - price * discount;
}

// стало (схематично)
function finalPrice(price, isVip) {
  cov.f[0]++;                                         // функция вызвана
  cov.s[0]++; const discount = isVip ? (cov.b[0][0]++, 0.2) : (cov.b[0][1]++, 0);
  cov.s[1]++; return price - price * discount;
}
\`\`\`

Теперь mutation testing. Stryker работает так:

1. Разбирает код в дерево (AST) и находит все места, к которым применимы мутаторы.
2. Создаёт мутантов — сотни или тысячи маленьких правок.
3. Чтобы не пересобирать проект на каждого мутанта, вшивает их всех в одну сборку сразу, а нужный включает глобальным флагом вида \`__stryker__.activeMutant\` (это называется mutation switching).
4. Делает пробный прогон на исходном коде и запоминает, какой тест какие строки выполняет, поэтому на каждого мутанта потом запускаются только «его» тесты.
5. Для каждого мутанта: хоть один тест упал — Killed; все зелёные — Survived; ни один тест этот код не выполняет — NoCoverage; код завис — Timeout.
6. Считает mutation score = (Killed + Timeout) / (Killed + Timeout + Survived + NoCoverage). Мутанты, которые не скомпилировались или упали при запуске, в формулу не входят.

### Пример 1. Тест без единого \`expect\` даёт 100% строк

\`\`\`js
// price.test.js
test('считает цену', () => {
  finalPrice(100, false);   // ни одной проверки
});
\`\`\`

Отчёт Istanbul для \`finalPrice\` (вывод настоящий, получен через \`istanbul-lib-instrument\`):

\`\`\`text
statements 3/3 100%
branches 1/2 50%
functions 1/1 100%
lines 3/3 100%
\`\`\`

Строки покрыты на 100%, хотя тест не проверил ни одного числа. Если завтра кто-то поменяет \`price - price * discount\` на \`price + price * discount\`, этот тест останется зелёным.

### Пример 2. Line coverage не видит непроверенную ветку

В том же отчёте branches = 50%: строка с тернарником выполнилась, но только её «не VIP» половина. По строкам она считается покрытой полностью. Встроенный в Node замер через V8 (\`node --test --experimental-test-coverage\`) на этом же примере показал \`line % 100.00\` и \`branch % 66.67\` — V8 считает ветки по-своему (вход в функцию тоже блок), но вывод тот же: строки врут, ветки честнее.

Поэтому порог, если он есть, ставят прежде всего на **branch coverage**.

### Пример 3. Мутанты на границе условия

Возьмём функцию из старого ответа и посмотрим, что сделает mutation testing. Ниже игрушечная модель Stryker: те же мутаторы, тот же подсчёт. Код запускался в Node, вывод настоящий.

\`\`\`js
// исходник: export const isAdult = (age) => age >= 18;
const source = 'return age >= 18;';
const mutants = [
  ['>= → >', source.replace('>=', '>')],          // EqualityOperator
  ['>= → <', source.replace('>=', '<')],          // EqualityOperator
  ['условие → true', 'return true;'],             // ConditionalExpression
  ['условие → false', 'return false;'],           // ConditionalExpression
];
function runSuite(code, tests) {
  const isAdult = new Function('age', code);
  return tests.every(([age, expected]) => isAdult(age) === expected); // true = всё зелёное
}
const weak = [[30, true]];                         // it('works', () => expect(isAdult(30)).toBe(true))
const strong = [[30, true], [18, true], [17, false]];

for (const [name, suite] of [['слабый набор', weak], ['сильный набор', strong]]) {
  let killed = 0;
  console.log(name + ':');
  for (const [label, code] of mutants) {
    const green = runSuite(code, suite);
    if (!green) killed++;
    console.log(\`  \${label}: \${green ? 'SURVIVED' : 'killed'}\`);
  }
  console.log(\`  mutation score = \${killed}/\${mutants.length} = \${Math.round(killed / mutants.length * 100)}%\`);
}
// слабый набор:
//   >= → >: SURVIVED
//   >= → <: killed
//   условие → true: SURVIVED
//   условие → false: killed
//   mutation score = 2/4 = 50%
// сильный набор:
//   >= → >: killed
//   >= → <: killed
//   условие → true: killed
//   условие → false: killed
//   mutation score = 4/4 = 100%
\`\`\`

Слабый тест даёт 100% coverage, но пропускает замену \`>=\` на \`>\` — граница 18 не проверена, и это ровно тот баг, который поедет в прод. Выживший \`условие → true\` говорит ещё жёстче: функция, которая всегда отвечает «да», проходит ваши тесты.

### Пример 4. Как убивать выживших: проверки на границах

Выживший мутант — это подсказка, какой тест дописать. Удобнее всего таблицей:

\`\`\`ts
import { describe, it, expect } from 'vitest';

describe('isAdult', () => {
  it.each([
    [17, false],   // прямо перед границей
    [18, true],    // ровно на границе — убивает «>= → >»
    [30, true],    // обычный случай
  ])('isAdult(%i) → %s', (age, expected) => {
    expect(isAdult(age)).toBe(expected);
  });
});
// ✓ isAdult(17) → false
// ✓ isAdult(18) → true
// ✓ isAdult(30) → true
\`\`\`

\`it.each\` прогоняет один и тот же тест на нескольких наборах данных, и каждый набор отображается в отчёте отдельной строкой.

### Stryker: настройка и запуск

Что делает: генерирует мутантов для указанных файлов, гоняет ваш обычный раннер и строит HTML-отчёт, где выжившие мутанты подсвечены прямо в коде.

\`\`\`json
{
  "testRunner": "vitest",
  "mutate": ["src/app/domain/**/*.ts", "!src/**/*.spec.ts"],
  "coverageAnalysis": "perTest",
  "incremental": true,
  "thresholds": { "high": 80, "low": 60, "break": 50 },
  "reporters": ["html", "clear-text", "progress"]
}
\`\`\`

\`\`\`bash
npx stryker run          # читает stryker.config.json
\`\`\`

Что здесь важно: \`mutate\` ограничивает прогон критичной логикой, \`coverageAnalysis: "perTest"\` запускает на мутанта только тесты, которые его выполняют, \`incremental\` переиспользует прошлые результаты для неизменённого кода, а \`break\` роняет сборку, если score ниже порога. Раннеры есть для Jest, Vitest, Karma, Mocha и Jasmine; для Angular с новым билдером \`@angular/build:unit-test\` интеграцию стоит проверить на своей версии.

### Какие мутаторы бывают

- **ArithmeticOperator** — \`+\` ↔ \`-\`, \`*\` ↔ \`/\`.
- **EqualityOperator** — \`>=\` → \`>\`, \`<\`; \`===\` → \`!==\`.
- **ConditionalExpression** — всё условие заменяется на \`true\` или \`false\`.
- **LogicalOperator** — \`&&\` ↔ \`||\`, \`??\` → \`&&\`.
- **BooleanLiteral** — \`true\` ↔ \`false\`, \`!x\` → \`x\`.
- **BlockStatement** — тело функции или \`if\` удаляется целиком: проверяет, что эффект вообще кем-то проверен.
- **StringLiteral / ArrayDeclaration / ObjectLiteral** — строка становится пустой, массив и объект — пустыми.
- **MethodExpression** — \`filter\` убирается, \`some\` ↔ \`every\`, \`startsWith\` ↔ \`endsWith\`.
- **OptionalChaining** — \`a?.b\` → \`a.b\`: проверяет, что тесты знают про \`null\`.

### Как разумно использовать coverage

Coverage полезен как **карта белых пятен**: 0% на модуле — точно повод посмотреть. Плохо он работает как цель.

\`\`\`json
{
  "test": {
    "builder": "@angular/build:unit-test",
    "options": {
      "coverage": true,
      "coverageThresholds": { "branches": 75, "lines": 80 }
    }
  }
}
\`\`\`

В Angular 21 с раннером Vitest такой замер требует пакета \`@vitest/coverage-v8\`. Здоровые практики: порог-«храповик» (нельзя опустить ниже текущего), контроль покрытия **изменённых строк** в PR вместо всего проекта, обязательный branch coverage, а для критичных модулей — mutation score.

### Где это применяется на практике

- **Расчёты в FinTech и биллинге**: комиссии, округления, лимиты — Stryker на \`domain/**\` ночью, выжившие мутанты разбираются как баги тестов.
- **Валидаторы форм**: граничные значения длины, дат и сумм — классическое место для выживших \`>=\` → \`>\`.
- **Утилиты грида**: сортировка, фильтрация, группировка — мутаторы \`MethodExpression\` показывают, проверен ли вообще фильтр.
- **Ревью тестов в PR**: отчёт по выжившим мутантам на изменённых файлах — объективный аргумент «тут тест ничего не проверяет».
- **Аудит унаследованного проекта**: 85% coverage при mutation score 30% — быстрый способ показать, что зелёный отчёт ничего не гарантирует.

## Важные нюансы и подводные камни

- **Coverage-гейт как самоцель.** Команда начинает писать тесты без ассертов и вызывать геттеры, лишь бы цифра прошла.
- **Coverage без branch-метрики** прячет непроверенные ветки условий: строка с тернарником «покрыта», хотя проверена одна половина.
- **Покрытие не равно важности.** 100% на тривиальных геттерах и 0% на критичной логике в среднем дают «хороший» процент.
- **Тест без \`expect\` всё же ловит исключения.** Если код бросит ошибку, тест упадёт, поэтому такие тесты убивают часть мутантов — но только самых грубых.
- **Мутационное тестирование на каждый PR** — полный прогон занимает десятки минут и больше: это ночная задача или запуск по изменённым файлам с \`incremental\`.
- **Mutation score 100% как новая цель** — та же ошибка, что и с coverage, только дороже. Смотрите на выживших мутантов в критичных модулях, а не на процент.
- **Эквивалентные мутанты.** Некоторые правки не меняют поведение вообще, и убить их невозможно в принципе — это не повод писать тест. Такого мутанта отключают точечно комментарием с причиной:

\`\`\`js
function sum(items) {
  // Stryker disable next-line EqualityOperator: для [] reduce с начальным 0 тоже вернёт 0
  if (items.length > 0) return items.reduce((s, x) => s + x, 0);
  return 0;
}
// мутант «> 0 → >= 0»: sum([]) → 0 и в оригинале, и в мутанте — разницы нет
\`\`\`

- **Timeout считается пойманным.** Мутант, из-за которого цикл стал бесконечным, тест не «заметил» ассертом, но поведение изменилось — Stryker засчитывает его как обнаруженный.
- **Формула score.** Это не «убитые / все мутанты», а (Killed + Timeout) / (Killed + Timeout + Survived + NoCoverage); не скомпилировавшиеся мутанты не считаются.
- **Снапшот-тесты** формально убивают много мутантов (любое изменение разметки ломает снимок), но их обновляют не глядя — высокий score тут обманчив так же, как coverage.

**Плюсы:** mutation testing честно измеряет способность тестов ловить регрессии и прямо показывает, какой тест дописать; coverage дёшев и хорошо подсвечивает совсем непротестированные места.
**Минусы:** coverage легко накрутить и он ничего не говорит о проверках; mutation testing дорог по времени и CPU, даёт шум от эквивалентных мутантов и требует настройки под раннер.

## Как это спрашивают на собеседовании

**Главный вывод:** coverage отвечает на вопрос «был ли код запущен», mutation score — «заметят ли тесты поломку». Высокий coverage при низком mutation score означает тесты без настоящих проверок; лечится проверками граничных значений.

Типичные формулировки: «У вас 90% покрытия — значит, всё хорошо?», «Как оценить качество тестов, а не их количество?», «Что такое mutation testing?».

Что могут спросить следом:

- *Какую цифру покрытия вы считаете разумной?* — Не абсолютную: «храповик» на текущий уровень, контроль покрытия изменённых строк и обязательный branch coverage.
- *Какие модули гонять через Stryker?* — Критичную бизнес-логику: платежи, расчёты, валидаторы, права доступа.
- *Почему не на каждый PR?* — Дорого; ночью целиком или инкрементально по изменённым файлам.
- *Что делать с эквивалентным мутантом?* — Отключить точечно с комментарием, а не писать бессмысленный тест.

### Ответ на 1 минуту

> Coverage измеряет, какие строки выполнились во время тестов, но не то, проверены ли они ассертами: тест вообще без \`expect\` даёт сто процентов по строкам. То есть он отвечает на вопрос «был ли код запущен», а не «работает ли он правильно». Отсюда ловушки: метрика как цель по закону Гудхарта, line coverage не видит непроверенную половину тернарника, а сто процентов на геттерах маскируют ноль на важной логике. Mutation testing, в JS это Stryker, вносит в код маленькие поломки — меняет \`>=\` на \`>\`, условие на \`true\`, удаляет блоки — и гоняет тесты. Упал хоть один тест — мутант убит, все зелёные — выжил, и это прямая подсказка, какую границу дописать. Score — доля пойманных мутантов. Это дорого, поэтому я запускаю его ночью или инкрементально на критичных модулях и смотрю на выживших, а не на процент.`,
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
      ru: `## В чём суть

CI/CD-пайплайн — это конвейер, который на каждый пуш автоматически проверяет код, собирает его и выкатывает. Для крупного фронтенда он строится по одному принципу: **сначала дешёвые проверки, потом дорогие**. Линт и типы падают за 30 секунд, e2e идут 20 минут; значит, всё, что можно поймать линтом, должно ловиться до того, как мы потратили эти 20 минут.

Аналогия: контроль в аэропорту. Сначала смотрят посадочный (мгновенно), потом сканируют багаж, и только избранных ведут на личный досмотр. Никто не начинает с досмотра всех подряд — очередь встанет, и люди опоздают на рейсы. Медленный CI — это ровно такая очередь, только опаздывает вся команда.

**Какую проблему решает.** Без пайплайна ветка \`main\` регулярно ломается, «у меня работает» становится аргументом, а релиз — ручным ритуалом с риском. С плохим пайплайном не лучше: если проверка PR идёт 50 минут, разработчики начинают мержить не дожидаясь, и CI превращается в декорацию. Хороший пайплайн быстрый, детерминированный и с понятными «шлагбаумами».

## Словарик терминов

- **CI (Continuous Integration)** — каждое изменение автоматически собирается и проверяется тестами, обычно на каждый PR.
- **CD (Continuous Delivery / Deployment)** — Delivery: каждый зелёный merge готов к выкатке одной кнопкой; Deployment: выкатывается автоматически.
- **Пайплайн, job, step, runner** — пайплайн состоит из jobs (параллельных этапов), job — из steps (команд), а выполняет их runner — временная виртуальная машина.
- **Lockfile (\`package-lock.json\`)** — файл с точными версиями всех зависимостей; \`npm ci\` ставит строго по нему.
- **Fail-fast** — остановить пайплайн при первой ошибке, не тратя время на остальные этапы.
- **Шардинг (sharding)** — деление тестов на N частей, которые идут на N машинах одновременно.
- **Монорепо (monorepo)** — один репозиторий с многими приложениями и библиотеками.
- **Nx / Turborepo** — инструменты для монорепо: знают граф зависимостей проектов, умеют запускать только нужное и кэшировать результаты.
- **Affected** — проекты, которые затронуло изменение: сами изменённые и все, кто от них зависит.
- **Computation cache (кэш вычислений)** — сохранённый результат задачи (сборки, теста) по хэшу её входов; локальный или общий удалённый (remote cache).
- **Артефакт (artifact)** — результат сборки (папка \`dist\`, отчёты), который передаётся между этапами и деплоится.
- **Иммутабельный артефакт** — однажды собранный и больше не меняющийся пакет; один и тот же едет на все окружения.
- **Quality gate / required check** — обязательная проверка, без прохождения которой PR нельзя смержить.
- **Bundle budget** — лимит размера бандла; превышение роняет сборку.
- **Preview-окружение** — временная копия приложения для конкретного PR со своим URL.
- **Canary / постепенная раскатка** — новая версия сначала уходит на малую долю пользователей, потом на всех.
- **Feature flag** — переключатель, который включает функциональность без нового деплоя.
- **Rollback (откат)** — возврат к предыдущей версии.

## Как это работает под капотом

Путь одного PR через пайплайн:

1. Пуш в ветку создаёт событие, поэтому CI-система поднимает чистую виртуальную машину и клонирует репозиторий.
2. Зависимости ставятся строго по lockfile (\`npm ci\`) из кэша, поэтому установка занимает секунды, а не минуты, и одинакова на всех машинах.
3. Сначала идёт статика — линт, проверка типов, формат, поэтому глупые ошибки падают за минуту.
4. Затем параллельно идут unit-тесты (разбитые на шарды) и production-сборка, потому что они не зависят друг от друга.
5. Собранный \`dist\` сохраняется как артефакт, поэтому e2e тестируют ровно то, что поедет в прод, а не отдельную сборку.
6. E2E запускаются на этом артефакте в headless-браузерах, тоже по шардам.
7. Отчёты, трейсы и видео сохраняются всегда, даже при падении, поэтому падение можно разобрать без перезапуска.
8. Для PR артефакт выкатывается на preview-окружение, а после merge в \`main\` — в прод через canary или постепенную раскатку.
9. После деплоя смотрят на смоук-тест и метрики ошибок, и если что-то пошло не так, указатель переключают обратно на прошлый артефакт.

### Пример 1. Рабочий workflow GitHub Actions

\`\`\`yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

concurrency:                       # новый пуш в PR отменяет устаревший прогон
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  static:                          # ~1 мин, падает первым
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }   # история нужна для affected
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx nx affected -t lint typecheck --base=origin/main

  test:
    needs: static
    runs-on: ubuntu-latest
    strategy:
      matrix: { shard: [1, 2, 3, 4] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx vitest run --shard=\${{ matrix.shard }}/4

  build:                           # идёт параллельно с test
    needs: static
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx ng build          # падает при превышении budgets
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist/ }

  e2e:
    needs: build
    runs-on: ubuntu-latest
    strategy:
      matrix: { shard: [1, 2, 3, 4] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist/ }
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --shard=\${{ matrix.shard }}/4
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}    # отчёт нужен именно при падении
        with:
          name: e2e-report-\${{ matrix.shard }}
          path: playwright-report/

  deploy:
    needs: [test, e2e]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist/ }
      - run: ./scripts/deploy.sh dist/   # тот же артефакт, что прошёл e2e
\`\`\`

\`needs\` строит граф: \`test\` и \`build\` ждут только \`static\` и идут параллельно, \`e2e\` ждёт сборку, \`deploy\` — и тесты, и e2e. \`matrix\` размножает job на 4 копии, каждая берёт свою четверть тестов. Синтаксис файла проверен YAML-парсером, но сам прогон зависит от вашего репозитория.

### Пример 2. Как работает affected

Nx и Turborepo знают граф зависимостей проектов. По \`git diff\` они находят изменённые проекты и поднимаются «вверх» — ко всем, кто от них зависит. Код запускался в Node, вывод настоящий:

\`\`\`js
const deps = {                       // кто от кого зависит
  'shared-ui': [],
  'data-access': [],
  'feature-orders': ['data-access', 'shared-ui'],
  'feature-reports': ['data-access'],
  'shell': ['feature-orders', 'feature-reports'],
  'admin': ['shared-ui'],
};

function affected(changedProjects) {
  const result = new Set(changedProjects);
  let grew = true;
  while (grew) {                     // добавляем всех, кто зависит от затронутых
    grew = false;
    for (const [project, uses] of Object.entries(deps)) {
      if (!result.has(project) && uses.some(d => result.has(d))) {
        result.add(project);
        grew = true;
      }
    }
  }
  return [...result];
}

console.log(affected(['feature-reports']));
console.log(affected(['shared-ui']));
// [ 'feature-reports', 'shell' ]
// [ 'shared-ui', 'feature-orders', 'shell', 'admin' ]
\`\`\`

Правка в отчётах проверяет 2 проекта из 6, а не все. В монорепо на 100 библиотек это разница между 5 и 50 минутами.

### Пример 3. Как работает кэш вычислений

Задача (сборка, тест, линт) — чистая функция от входов: исходники, lockfile, переменные окружения, сама команда. Хэш входов становится ключом. Код запускался в Node, вывод настоящий:

\`\`\`js
import { createHash } from 'node:crypto';
const cache = new Map();                       // в реальности — диск или remote cache
const hash = (...parts) => createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 8);

function runTask(name, inputs) {
  const key = hash(name, ...inputs);
  if (cache.has(key)) return \`\${name} [\${key}] cache hit — 0 с\`;
  cache.set(key, 'dist + логи');               // «выполнили» и сохранили результат
  return \`\${name} [\${key}] выполнено — 40 с\`;
}

const lockfile = 'lock-v1', src = 'export const a = 1;';
console.log(runTask('build:shell', [src, lockfile, 'NODE_ENV=production']));
console.log(runTask('build:shell', [src, lockfile, 'NODE_ENV=production']));
console.log(runTask('build:shell', ['export const a = 2;', lockfile, 'NODE_ENV=production']));
// build:shell [77aa7a5a] выполнено — 40 с
// build:shell [77aa7a5a] cache hit — 0 с
// build:shell [f875b445] выполнено — 40 с
\`\`\`

Remote cache (Nx Cloud, кэш Turborepo) делает этот \`Map\` общим для всей команды и CI: если коллега уже собрал этот коммит, ваш прогон просто скачает результат. Отсюда главный риск — **нечестные входы**: если сборка читает переменную окружения, которой нет в хэше, кэш отдаст результат, собранный с другим значением.

### Пример 4. Бюджеты бандла в Angular

Что делает: \`ng build\` сравнивает размер собранных файлов с лимитами и падает при превышении порога ошибки. Это реальная конфигурация из \`angular.json\` этого проекта:

\`\`\`json
"budgets": [
  { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
  { "type": "anyComponentStyle", "maximumWarning": "8kB", "maximumError": "16kB" }
]
\`\`\`

\`initial\` — всё, что грузится до первого экрана; \`anyComponentStyle\` — стили одного компонента. Предупреждение видно в логе, ошибка роняет job. Так случайный импорт всей библиотеки графиков в стартовый чанк ловится в PR, а не жалобами пользователей. Вне Angular ту же роль играет \`size-limit\`.

### Quality gates: что ещё роняет PR

- **Упавшие тесты и превышение бюджетов** — базовый минимум, оформленный как required checks в настройках защиты ветки.
- **Регрессия покрытия** — порог-«храповик»: покрытие не должно опускаться ниже текущего уровня.
- **Регрессия Lighthouse** — Lighthouse CI прогоняет ключевые страницы и проверяет пороги по производительности и доступности.
- **Визуальная регрессия** на ключевых страницах — например, \`await expect(page).toHaveScreenshot()\` в Playwright сравнивает скриншот с эталоном.
- **Артефакты для разбора** — отчёты покрытия, видео и трейсы e2e, а source maps загружаются в систему сбора ошибок: без них разбор падения превращается в гадание.

### Пример 5. Установка зависимостей и кэш

\`\`\`bash
npm ci        # удаляет node_modules и ставит строго по package-lock.json
npm install   # может обновить lockfile — в CI так делать нельзя
\`\`\`

\`actions/setup-node\` с \`cache: npm\` кэширует папку загрузок npm с ключом по хэшу lockfile: lockfile не менялся — пакеты берутся из кэша. \`npm ci\` падает, если \`package.json\` и lockfile расходятся, — это защита от «у меня другие версии».

### Пример 6. Build once, deploy many: конфиг во время выполнения

Чтобы один артефакт ехал на stage и prod, настройки окружения нельзя «запекать» в сборку. В Angular их часто подменяют через \`fileReplacements\` при сборке — это значит одна сборка на окружение. Альтернатива — читать конфиг при старте:

\`\`\`ts
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideAppInitializer(() => {
      const http = inject(HttpClient);            // inject — только синхронно, до любого await
      const store = inject(RuntimeConfigStore);
      return firstValueFrom(http.get<RuntimeConfig>('/config.json'))
        .then(config => store.set(config));       // apiUrl, sentryDsn, флаги
    }),
  ],
};
// /config.json подкладывает уже сервер окружения; dist/ один и тот же
\`\`\`

Приложение не стартует, пока промис не выполнится. Обратите внимание: \`inject()\` работает только синхронно внутри контекста внедрения, поэтому вызов после \`await\` упадёт с ошибкой NG0203 — зависимости берут заранее.

Тогда откат — это переключение указателя на прошлый артефакт за минуту, а не пересборка, которая к тому же может собрать «не совсем то же самое».

### Деплой: preview, canary, feature flags

- **Preview на каждый PR** (Vercel, Netlify или свой Kubernetes): ревьюер и QA открывают ссылку, e2e можно гонять прямо против неё.
- **Canary**: новая версия получает 5% трафика; если error rate и метрики в норме — 25%, 100%; если нет — автоматический откат.
- **Feature flags** отделяют деплой от релиза: код уже в проде, но выключен, и его включают для отдельных пользователей или процента аудитории.
- **Иммутабельные артефакты**: файлы с хэшами в именах (\`main.3f9a1c.js\`) лежат рядом со старыми версиями, а «текущую версию» определяет один \`index.html\`.

### Где это применяется на практике

- **Монорепо на Nx с десятками Angular-библиотек**: \`affected\` плюс remote cache держат проверку PR в пределах 10–15 минут при росте кода.
- **Enterprise-портал с несколькими окружениями**: один артефакт проходит dev, stage и prod, конфиг подкладывается при старте.
- **Крупные гриды и дашборды**: бюджеты бандла ловят случайный импорт тяжёлой библиотеки в стартовый чанк.
- **Регулируемые отрасли (FinTech)**: required checks, обязательное ревью, хранение отчётов как доказательство того, что именно проверялось перед релизом.
- **Частые релизы**: canary и feature flags позволяют деплоить несколько раз в день и откатывать за минуту.

## Важные нюансы и подводные камни

- **Дорогое перед дешёвым.** E2E стартуют раньше линта — и вы платите 20 минут, чтобы узнать про неиспользуемый импорт.
- **Flaky e2e блокируют merge.** Retry как временная мера — можно; карантин плюс расследование — обязательно, иначе команда перестаёт верить красному CI.
- **Отсутствие \`affected\` и кэша** в растущем монорепо: время CI растёт вместе с кодом, и в какой-то момент разработчики начинают мержить не дожидаясь.
- **Сборка отдельно для e2e и отдельно для прода** — вы тестируете не то, что деплоите.
- **Нечестные входы кэша.** Переменная окружения или файл, которые влияют на сборку, но не входят в хэш, приводят к протухшему результату из кэша. Решение — явно описанные \`inputs\` и детерминированная сборка.
- **Секреты в логах сборки.** Печатать \`env\` для отладки нельзя. GitHub маскирует зарегистрированные секреты звёздочками, но не производные значения (тот же секрет в base64); нужны secret scanning и явное маскирование.
- **PR из форков** не получают секретов — деплой preview для них надо проектировать отдельно.
- **\`npm install\` в CI** может тихо обновить зависимости; только \`npm ci\`.
- **Устаревшие прогоны** на каждый пуш в один PR съедают очередь runners — помогает \`concurrency\` с \`cancel-in-progress\`.
- **Артефакты только при успехе.** Отчёт e2e нужен как раз при падении: \`if: \${{ !cancelled() }}\`.

**Плюсы:** быстрый и детерминированный пайплайн держит \`main\` рабочим, ловит ошибки за минуты, позволяет деплоить часто и откатывать за минуту.
**Минусы:** требует вложений в инфраструктуру (runners, remote cache, preview-окружения) и постоянного ухода: флейки, рост времени, стоимость минут CI.

## Как это спрашивают на собеседовании

**Главный вывод:** пайплайн идёт от дешёвого к дорогому с fail-fast; скорость дают параллелизм, шардинг, \`affected\` и кэш; надёжность — один иммутабельный артефакт, который проходит e2e и едет на все окружения; безопасность релиза — preview, canary, feature flags и откат переключением указателя.

Типичные формулировки: «Как бы вы построили CI/CD для большого фронтенда?», «Как ускорить CI в монорепо?», «Как откатить релиз за минуту?».

Что могут спросить следом:

- *Как обеспечить откат за минуту?* — Иммутабельный артефакт плюс переключение указателя на прошлую версию, а не пересборка.
- *Как не дать кэшу отдать протухший результат?* — Честные \`inputs\` (включая переменные окружения) и детерминированная сборка.
- *Где запускать e2e?* — На том же артефакте, который поедет в прод, либо против preview-окружения PR.
- *Чем delivery отличается от deployment?* — Delivery: готово к выкатке по кнопке; deployment: выкатывается автоматически после merge.

### Ответ на 1 минуту

> Я строю пайплайн от дешёвого к дорогому: установка строго по lockfile с кэшем, затем статика — линт, типы, формат — с fail-fast, потом параллельно unit-тесты по шардам и production-сборка с проверкой бандл-бюджетов. Сборку сохраняю как артефакт, и e2e гоняю именно на нём, чтобы тестировать то, что поедет в прод. Скорость держу \`affected\`-графом Nx или Turborepo, локальным и удалённым кэшем и отменой устаревших прогонов. Артефакты — отчёты, трейсы e2e, покрытие — сохраняю всегда, особенно при падении. Деплой: preview на каждый PR, в прод — canary с feature flags, чтобы отделить деплой от релиза, а откат — переключение на прошлый иммутабельный артефакт. Типовые провалы: флейки, которые блокируют merge, секреты в логах и кэш с нечестными входами.`,
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
      ru: `## В чём суть

Это вопрос не про технологии, а про **умение резать большую задачу на оси и по каждой назвать компромисс**. Осей шесть: доставка кода, данные, состояние, рендер, real-time, надёжность. Плюс сквозные вещи — авторизация, наблюдаемость, feature flags и модульность, чтобы масштабировалась не только программа, но и команда.

Аналогия: проектирование дома. Никто не начинает с выбора обоев. Сначала — сколько людей будет жить (нагрузка), потом фундамент и несущие стены (архитектура данных и состояния), потом коммуникации (сеть, real-time), и только потом отделка. Собеседующий проверяет, начнёте вы с фундамента или с перечисления модных обоев.

**Какую проблему решает.** Дашборд аналитики — это десятки виджетов, таблицы на сотни тысяч строк, живые метрики и годы развития несколькими командами. Без осознанных решений он превращается в монолит, который грузится 10 секунд, показывает устаревшие цифры в соседних виджетах, замерзает от потока событий и падает целиком из-за одного сломанного графика. Структурный ответ показывает, что вы видите эти риски заранее.

## Словарик терминов

- **SPA (Single Page Application)** — приложение, которое загружается один раз, а дальше перерисовывает экран в браузере без перезагрузки страниц.
- **Code splitting / ленивая загрузка (lazy loading)** — код делится на чанки (отдельные JS-файлы), и чанк фичи скачивается только когда она нужна.
- **Preloading / prefetch** — заранее скачать чанк, который скорее всего понадобится, пока пользователь ещё не кликнул.
- **SSR / SSG / гидратация (hydration)** — рендер HTML на сервере на каждый запрос / заранее при сборке; гидратация — «оживление» этого HTML в браузере.
- **TTFB / LCP / INP** — время до первого байта ответа; время отрисовки главного элемента; задержка реакции интерфейса на действие пользователя.
- **Server state / client state** — данные, хозяин которых сервер (заказы, метрики), и данные, которые живут только в браузере (открытая вкладка, фильтры).
- **Stale-while-revalidate (SWR)** — показать закэшированное сразу, а в фоне перезапросить свежее и тихо обновить.
- **Дедупликация запросов** — если пять виджетов одновременно просят одно и то же, уходит один HTTP-запрос.
- **Нормализация** — хранить каждую сущность один раз в словаре по id, а в списках держать только id.
- **Виртуальный скролл (virtual scroll)** — в DOM рисуются только видимые строки таблицы, остальные подставляются при прокрутке.
- **\`OnPush\` / сигналы (signals)** — стратегия, при которой компонент перепроверяется только при реальных изменениях; сигналы точно сообщают Angular, что изменилось.
- **Web Worker** — отдельный поток браузера для тяжёлых вычислений, чтобы не блокировать интерфейс.
- **WebSocket / SSE** — постоянное соединение для живых данных: двустороннее / только от сервера к клиенту.
- **Throttle / буферизация** — пропускать обновления не чаще заданного интервала или копить их пачками.
- **Error boundary (граница ошибок)** — зона, внутри которой сбой изолируется и показывается заглушка, а не падает весь экран.
- **Оптимистичное обновление** — показать результат действия сразу, не дожидаясь сервера, и откатить при ошибке.
- **RUM (Real User Monitoring)** — сбор метрик скорости и ошибок с браузеров настоящих пользователей.
- **Nx-библиотеки и module boundaries** — код разбит на библиотеки с тегами, а линтер запрещает «неправильные» импорты между ними.

## Как это работает под капотом

На собеседовании такой вопрос — это мини-system design. Хороший ответ идёт по одному и тому же алгоритму:

1. Сначала уточняете требования и цифры, потому что от них зависят все решения: SSR, real-time, объёмы.
2. Затем рисуете крупные блоки (shell, виджеты, слой данных, real-time-клиент), чтобы у разговора была карта.
3. Потом проходите по осям и по каждой называете решение **и его цену**, потому что решение без цены — это buzzword.
4. Затем добавляете сквозные вещи: авторизацию, наблюдаемость, флаги, структуру кода.
5. В конце говорите, как система деградирует при сбоях и как вы узнаете о проблемах в проде.

### Шаг 0. Вопросы до проектирования

- Сколько пользователей и одновременно активных сессий?
- Сколько виджетов на экране и сколько строк в самой большой таблице?
- Насколько свежими должны быть данные: раз в минуту, раз в секунду, в реальном времени?
- Нужен ли SEO, или всё за логином?
- Какие устройства: только десктоп в офисе или ещё планшеты в поле?
- Нужна ли работа офлайн, мультиязычность, доступность (a11y)?
- Сколько команд будет развивать продукт?

Для типичного внутреннего дашборда ответы такие: всё за логином, десктоп, 20 виджетов, таблицы до 100 тысяч строк, часть метрик обновляется каждую секунду, 3–4 команды. Дальше решения выводятся из этих цифр.

### Ось 1. Доставка кода: ленивые роуты и \`@defer\`

Что делает: стартовый бандл содержит только каркас, а каждая страница и тяжёлый виджет приезжают отдельным чанком.

\`\`\`ts
// app.routes.ts — страница скачивается при первом переходе
export const routes: Routes = [
  { path: 'reports', loadComponent: () => import('./reports/reports-page').then(m => m.ReportsPage) },
];
// app.config.ts — в простое скачать остальные страницы заранее
provideRouter(routes, withPreloading(PreloadAllModules));
\`\`\`

\`\`\`html
<!-- виджет с тяжёлой библиотекой графиков грузится, когда доскроллили до него -->
@defer (on viewport; prefetch on idle) {
  <revenue-chart />
} @placeholder {
  <div class="skeleton"></div>
}
\`\`\`

\`@defer\` выносит компонент и его зависимости в отдельный чанк; \`on viewport\` — когда блок попал в экран, \`prefetch on idle\` — скачать заранее, когда браузер простаивает. Бюджеты в \`angular.json\` не дают стартовому чанку незаметно разрастись, а tree-shaking (удаление неиспользуемого кода при сборке) работает, только если библиотеки импортируются точечно, а не целиком.

SSR для внутреннего дашборда за логином обычно не нужен: SEO нет, а сервер рендеринга — это ещё один сервис в проде и ограничения на код (нет \`window\` на сервере). Его берут, когда важен быстрый первый экран публичных страниц.

### Ось 2. Слой данных: кэш и дедупликация

Что делает: все виджеты ходят за данными не в \`HttpClient\` напрямую, а в слой, который кэширует ответы и склеивает одинаковые запросы. Код запускался в Node с RxJS 7.8, вывод настоящий:

\`\`\`ts
import { defer, timer, map, shareReplay } from 'rxjs';

let requests = 0;
const fetchKpi = (id: string) => defer(() => {
  requests++;
  console.log('HTTP GET /kpi/' + id);
  return timer(100).pipe(map(() => ({ id, value: 42 })));   // имитация HTTP
});

const cache = new Map();
function getKpi(id: string) {
  if (!cache.has(id)) {
    cache.set(id, fetchKpi(id).pipe(shareReplay({ bufferSize: 1, refCount: false })));
  }
  return cache.get(id);
}

getKpi('revenue').subscribe(v => console.log('виджет A', v.value));
getKpi('revenue').subscribe(v => console.log('виджет B', v.value));
setTimeout(() => getKpi('revenue').subscribe(v => {
  console.log('виджет C (позже)', v.value);
  console.log('запросов всего:', requests);
}), 300);
// HTTP GET /kpi/revenue
// виджет A 42
// виджет B 42
// виджет C (позже) 42
// запросов всего: 1
\`\`\`

\`shareReplay\` делит одну подписку на источник между всеми подписчиками и запоминает последнее значение, поэтому три виджета получили данные за один запрос. В реальном слое к этому добавляют время жизни записи, фоновое обновление (SWR) и сброс кэша после изменений. Готовые решения — TanStack Query для Angular или экспериментальные пока \`resource\`/\`httpResource\` в самом Angular 21.

### Ось 2. Нормализация серверных данных

Что делает: одна и та же сущность хранится один раз, поэтому обновление видно во всех виджетах сразу. Код запускался в Node, вывод настоящий:

\`\`\`js
const topClients = [{ id: 7, name: 'ООО Ромашка', status: 'active' }];
const overdue    = [{ id: 7, name: 'ООО Ромашка', status: 'active' }, { id: 9, name: 'ИП Лютик', status: 'active' }];

const state = { entities: {}, topIds: [], overdueIds: [] };
const upsert = list => list.map(c => { state.entities[c.id] = { ...state.entities[c.id], ...c }; return c.id; });
state.topIds = upsert(topClients);
state.overdueIds = upsert(overdue);

upsert([{ id: 7, status: 'blocked' }]);          // пришло обновление по WebSocket

const view = ids => ids.map(id => \`\${state.entities[id].name}: \${state.entities[id].status}\`);
console.log(Object.keys(state.entities).length, 'сущности в хранилище');
console.log(view(state.topIds));
console.log(view(state.overdueIds));
// 2 сущности в хранилище
// [ 'ООО Ромашка: blocked' ]
// [ 'ООО Ромашка: blocked', 'ИП Лютик: active' ]
\`\`\`

Без нормализации клиент 7 жил бы в двух копиях, и после обновления один виджет показывал бы «blocked», а соседний — «active».

### Ось 3. Состояние: server state отдельно от client state

Что делает: серверные данные живут в слое кэша, а то, что знает только браузер (фильтры, выбранный период, раскрытые панели), — в сигналах или сторе. Серверные данные **выводятся** из клиентского состояния, а не копируются в него.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class DashboardFilters {               // client state: хозяин — браузер
  readonly period = signal<'7d' | '30d'>('7d');
  readonly region = signal('all');
}

@Component({ /* ... */ })
export class RevenueWidget {
  private filters = inject(DashboardFilters);
  // server state: перезапрашивается сам при смене фильтров (httpResource — @experimental в Angular 21)
  readonly revenue = httpResource<Revenue>(() =>
    \`/api/revenue?period=\${this.filters.period()}&region=\${this.filters.region()}\`);
}
\`\`\`

Если скопировать ответ сервера в глобальный стор, он начинает протухать с момента записи, и уже непонятно, кто и когда должен его обновить. Разделение снимает этот класс багов. Глобальный стор (NgRx, NGXS) оставляют для действительно общего клиентского состояния: текущий пользователь, выбранная организация, настройки.

### Ось 4. Рендер: \`OnPush\`, сигналы, виртуализация, Web Worker

- **\`OnPush\` и сигналы**: виджет перерисовывается, только когда изменились его входы или прочитанные сигналы, а не на каждый клик где угодно.
- **Мемоизация через \`computed\`**: тяжёлое вычисление (итоги по 100 000 строк) пересчитывается, только когда изменились его входные сигналы, а не при каждой проверке шаблона.
- **\`@for\` с \`track\`**: \`@for (row of rows(); track row.id)\` переиспользует DOM-узлы строк вместо пересоздания.
- **Виртуальный скролл** (\`cdk-virtual-scroll-viewport\` из Angular CDK или виртуализация в коммерческом гриде): из 100 000 строк в DOM живут несколько десятков видимых.
- **Canvas или WebGL для графиков**: SVG создаёт DOM-узел на каждую точку, и на десятках тысяч точек браузер начинает заметно тормозить; canvas рисует пиксели без узлов.

\`\`\`ts
// тяжёлая агрегация — в отдельном потоке (файл создаёт \`ng generate web-worker\`)
const worker = new Worker(new URL('./aggregate.worker', import.meta.url));
worker.postMessage(rawRows);                        // 500 000 строк уходят в другой поток
worker.onmessage = ({ data }) => this.summary.set(data); // интерфейс всё это время отзывчив
\`\`\`

### Ось 5. Real-time: буферизация потока

Что делает: события из сокета копятся пачками и применяются к интерфейсу несколько раз в секунду, а не на каждое сообщение. Чтобы результат не зависел от скорости машины, пример идёт на \`VirtualTimeScheduler\` — «виртуальных часах» RxJS, где секунда проходит мгновенно и точно. Код запускался в Node с RxJS 7.8, вывод настоящий:

\`\`\`ts
import { interval, take, bufferTime, filter, VirtualTimeScheduler } from 'rxjs';

const time = new VirtualTimeScheduler();
let updates = 0, messages = 0;
interval(1, time).pipe(              // имитация сокета: сообщение каждую миллисекунду
  take(1000),                        // 1000 сообщений за секунду
  bufferTime(250, time),             // копим пачку 250 мс
  filter(batch => batch.length > 0),
).subscribe(batch => {
  updates++; messages += batch.length; // одно обновление UI на пачку
  console.log(\`t=\${time.now()} мс: пачка из \${batch.length}\`);
});
time.flush();                        // «прокрутить» виртуальное время до конца
console.log(\`сообщений: \${messages}, обновлений UI: \${updates}\`);
// t=250 мс: пачка из 249
// t=500 мс: пачка из 250
// t=750 мс: пачка из 250
// t=1000 мс: пачка из 250
// t=1000 мс: пачка из 1
// сообщений: 1000, обновлений UI: 5
\`\`\`

Четыре пачки по таймеру и остаток при завершении потока — 5 перерисовок вместо 1000. В приложении scheduler не передают: работают обычные часы, и пачки выходят раз в 250 мс. В реальном коде источник — \`webSocket()\` из \`rxjs/webSocket\` с переподключением через \`retry({ delay })\`, а при долгой недоступности сокета — откат на опрос по таймеру и индикатор «данные обновляются с задержкой».

### Ось 6. Надёжность: изоляция виджетов и оптимистичные обновления

Что делает: каждый виджет сам обрабатывает ошибку своих данных и показывает заглушку с кнопкой «повторить», а не роняет страницу.

\`\`\`html
@switch (revenue.status()) {
  @case ('loading') { <div class="skeleton"></div> }
  @case ('error')   { <widget-error (retry)="revenue.reload()" /> }
  @default          { <revenue-chart [data]="revenue.value()" /> }
}
\`\`\`

Сетевые сбои повторяются с экспоненциальным backoff (300, 600, 1200 мс) — но только для идемпотентных GET-запросов. Встроенных error boundaries в Angular нет. Блок \`@error\` у \`@defer\` срабатывает только если не удалось **скачать** чанк, а не при ошибке внутри компонента, поэтому изоляцию строят на уровне данных: у каждого виджета своё состояние загрузки и ошибки.

\`\`\`ts
// оптимистичное переименование дашборда с откатом
rename(newName: string) {
  const old = this.name();
  this.name.set(newName);                              // UI обновился мгновенно
  this.api.rename(this.id, newName).subscribe({
    error: () => { this.name.set(old); this.toast.error('Не удалось сохранить'); },
  });
}
\`\`\`

### Сквозные решения

- **Авторизация**: токен обновляется в фоне (silent refresh) в интерсепторе, запросы на время обновления встают в очередь, а не сыплют 401.
- **Наблюдаемость**: RUM с метриками LCP и INP по релизам, трекинг ошибок с привязкой к версии, логирование медленных запросов.
- **Feature flags**: новые виджеты включаются сначала для части пользователей.
- **Offline и PWA** — только если этого требуют сценарии (например, выездные сотрудники): Service Worker кэширует оболочку и последние данные, но добавляет сложность с обновлением версий.
- **Модульность**: Nx-библиотеки с тегами и правилом, которое запрещает фичам импортировать друг друга напрямую:

\`\`\`json
{
  "depConstraints": [
    { "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:data-access", "type:ui", "type:util"] },
    { "sourceTag": "type:ui", "onlyDependOnLibsWithTags": ["type:ui", "type:util"] }
  ]
}
\`\`\`

Итоговая структура:

\`\`\`text
dashboard/
  shell/         # роутинг, layout, preloading, авторизация
  data-access/   # кэш-слой: дедупликация, SWR, нормализация
  widgets/       # ленивые виджеты, у каждого своё состояние загрузки и ошибки
  realtime/      # WS-клиент: буфер + throttle + фолбэк на polling
  ui/            # общие компоненты, скелетоны, графики
\`\`\`

Каждый виджет — самостоятельная единица загрузки, ошибки и обновления: упавший показывает свою заглушку, медленный не задерживает остальные.

### Где это применяется на практике

- **Аналитические и торговые дашборды**: живые котировки и метрики через WebSocket с буферизацией, графики на canvas.
- **Enterprise-порталы с большими гридами**: виртуализация, серверная пагинация и фильтрация, пресеты колонок в client state.
- **Админки SaaS-продуктов**: десятки ленивых разделов, feature flags по тарифам, модульная структура под несколько команд.
- **Мониторинг и диспетчерские системы**: часами открытая вкладка, где утечки памяти и лишние перерисовки становятся заметны к концу смены.

## Важные нюансы и подводные камни

- **Перечисление buzzwords без компромиссов.** «Возьмём микрофронтенды, SSR и NgRx» без объяснения цены — самый частый провал на этом вопросе.
- **Смешение server state и UI state.** Ответ сервера, скопированный в глобальный store, немедленно начинает протухать, и никто не знает, кто его инвалидирует.
- **SSR «на всякий случай»** для внутреннего дашборда за логином: сложность есть, SEO не нужно.
- **Real-time без throttle.** Сотни сообщений в секунду, каждое из которых запускает перерисовку, — и интерфейс замерзает.
- **Микрофронтенды раньше времени.** Они решают проблему независимых релизов многих команд, а не проблему размера кода; для одной-двух команд хватит модульного монорепо.
- **Огромный JSON в главном потоке.** Разбор ответа на десятки мегабайт блокирует интерфейс; помогают серверная пагинация, агрегация на бэкенде или разбор в Web Worker.
- **Долгоживущие вкладки.** Дашборд открыт весь день: забытые подписки и неуничтоженные экземпляры графиков дают утечки памяти, которые в коротких тестах не видны.
- **a11y и i18n «на потом»** — переделка через год стоит дороже, чем вся первоначальная разработка этой части.
- **Как деградирует система при падении WebSocket.** Ответ должен быть готов: фолбэк на polling плюс индикатор состояния соединения.

**Плюсы:** структурный подход даёт быстрый старт, свежие и согласованные данные, отзывчивый интерфейс при больших объёмах, изоляцию сбоев и возможность нескольким командам работать независимо.
**Минусы:** больше инфраструктуры и правил (кэш-слой, границы модулей, наблюдаемость), выше порог входа для новичков; часть решений (SSR, микрофронтенды, нормализация) окупается только при реальной нагрузке.

## Как это спрашивают на собеседовании

**Главный вывод:** начните с требований и цифр, затем пройдите по осям — доставка, данные, состояние, рендер, real-time, надёжность — и по каждой назовите решение вместе с ценой. Ключевое решение — разделить server state и client state.

Типичные формулировки: «Спроектируйте дашборд аналитики на 50 виджетов», «Как бы вы построили большое SPA с нуля?», «Какие архитектурные решения вы примете для приложения с живыми данными?».

Что могут спросить следом:

- *Что вы уточните до проектирования?* — Число пользователей, объём данных на экране, требования к свежести, SEO, офлайн, число команд.
- *Как деградирует система при падении сокета?* — Переподключение с backoff, затем polling и индикатор «данные с задержкой».
- *Зачем отдельный кэш-слой, если есть стор?* — У серверных данных свой жизненный цикл: устаревание, перезапрос, дедупликация; стор для этого не создан.
- *Когда вы возьмёте микрофронтенды?* — Когда нескольким командам нужны независимые релизы, а не когда просто много кода.

### Ответ на 1 минуту

> Я начинаю с требований: сколько пользователей, сколько данных на экране, насколько свежими они должны быть, нужен ли SEO. Дальше иду по осям и по каждой называю цену. Доставка: ленивые роуты, \`@defer\` для тяжёлых виджетов, prefetch и бюджеты; SSR для дашборда за логином обычно не беру. Данные: кэш-слой с дедупликацией запросов, stale-while-revalidate и нормализацией, большие таблицы — виртуализация и серверная пагинация. Ключевое решение — разделить server state в кэш-слое и client state в сигналах, иначе данные протухают. Рендер: \`OnPush\`, сигналы, \`track\` в \`@for\`, тяжёлые расчёты в Web Worker, графики на canvas. Real-time: WebSocket с буферизацией и фолбэком на polling. Надёжность: у каждого виджета своё состояние ошибки и повтор. Плюс RUM, feature flags и Nx-библиотеки с границами под масштаб команды.`,
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
      ru: `## В чём суть

Кэш — это сохранённая копия ответа, которую можно отдать, не идя далеко за оригиналом. Во фронтенде кэш многоэтажный: HTTP-кэш браузера, Service Worker, кэш в памяти приложения, CDN и постоянное хранилище вроде IndexedDB. На каждом этаже свои правила, а выбор стратегии сводится к одному вопросу: **насколько плохо, если пользователь увидит устаревшие данные**.

Аналогия: холодильник, морозилка и магазин. Крупу можно держать годами — это файлы сборки с хэшем в имени: положили на дальнюю полку и не трогаем. Молоко хочется свежее, но вчерашнее тоже можно выпить, пока сходите за новым, — это stale-while-revalidate. А курс валют или баланс счёта из холодильника брать нельзя вообще: только из магазина и каждый раз заново.

**Какую проблему решает.** Без кэша каждый переход по SPA заново качает мегабайты JavaScript и повторяет одни и те же запросы к API: страница открывается медленно, сервер платит за лишний трафик, а без сети приложение не открывается совсем. Кэш решает скорость, нагрузку и офлайн, но приносит свою, главную проблему — **инвалидацию**: как вовремя выбросить копию, которая перестала быть правдой. Закэшировать неправильно — значит месяцами показывать пользователям старую версию приложения или чужие данные.

## Словарик терминов

- **Кэш-попадание и промах (cache hit / cache miss)** — нужная копия в кэше нашлась / не нашлась, и пришлось идти в сеть.
- **Свежесть (freshness) и TTL (time to live)** — сколько времени копию можно отдавать без вопросов к серверу. После этого копия становится «несвежей» (stale).
- **\`Cache-Control\`** — HTTP-заголовок ответа, в котором сервер говорит всем кэшам, можно ли хранить ответ, кому и сколько.
- **\`max-age\` и \`s-maxage\`** — срок свежести в секундах: первый для всех кэшей, второй только для общих (CDN, прокси) и для них важнее \`max-age\`.
- **\`no-cache\`** — хранить можно, но перед каждым использованием обязательно спросить сервер, актуальна ли копия.
- **\`no-store\`** — не сохранять ответ вообще нигде.
- **\`private\` / \`public\`** — ответ только для кэша браузера конкретного пользователя / можно хранить и в общих кэшах.
- **\`immutable\`** — обещание «этот файл по этому адресу никогда не изменится, не перепроверяйте его».
- **Валидатор (\`ETag\`, \`Last-Modified\`)** — «отпечаток» версии ответа: строка-идентификатор или дата последнего изменения.
- **Условный запрос (\`If-None-Match\`, \`If-Modified-Since\`)** — запрос «вот моя версия, пришли тело, только если она устарела».
- **\`304 Not Modified\`** — ответ сервера «ваша копия актуальна» без тела: экономит трафик, но не сам запрос.
- **Ревалидация (revalidation)** — проверка несвежей копии у сервера через условный запрос.
- **\`Vary\`** — заголовок, который говорит кэшу, от каких заголовков запроса зависит ответ (язык, сжатие), чтобы не перепутать варианты.
- **Cache busting (хэш в имени файла)** — при каждой сборке меняется имя файла (\`main-HN4KZGPA.js\`), поэтому новый код получает новый адрес, а старый кэш просто перестаёт использоваться.
- **CDN и edge** — сеть серверов по всему миру, которая держит копии ваших файлов близко к пользователю.
- **Service Worker** — скрипт, который браузер запускает отдельно от страницы; он перехватывает её сетевые запросы и может отвечать сам, из своего кэша.
- **Cache Storage (\`caches\`)** — хранилище пар «запрос → ответ», которым программно управляет Service Worker или страница.
- **App shell** — минимальный каркас приложения (HTML, JS, CSS), который нужен, чтобы оно запустилось даже без сети.
- **Cache-first / network-first / stale-while-revalidate (SWR)** — три базовые стратегии: сначала кэш / сначала сеть / сразу кэш, а в фоне обновить.
- **Инвалидация** — удаление или пометка копии как устаревшей, когда исходные данные изменились.
- **Дедупликация запросов** — несколько одновременных потребителей одних данных получают ответ одного общего запроса.
- **IndexedDB** — встроенная в браузер асинхронная база данных для больших объёмов структурированных данных.
- **Квота (quota)** — лимит места, который браузер выделяет сайту под хранилища; размер зависит от браузера и свободного диска.
- **\`BroadcastChannel\`** — API для обмена сообщениями между вкладками и окнами одного сайта.

## Как это работает под капотом

Проследим путь одного \`GET\`-запроса сверху вниз, через все этажи:

1. Сначала запрос видит **кэш в памяти приложения** (сервис, TanStack Query, NgRx-стор). Если там есть свежие данные, HTTP-запроса не будет вовсе — это самый быстрый уровень, но он живёт только до перезагрузки вкладки.
2. Если запрос всё-таки ушёл через \`fetch\`/\`XMLHttpRequest\`, его перехватывает **Service Worker** (если он зарегистрирован и страница в его зоне). SW сам решает, ответить из Cache Storage, пойти в сеть или сделать и то и другое.
3. Запрос, который SW пропустил в сеть, попадает в **HTTP-кэш браузера**. Браузер ищет копию по URL (и по заголовкам из \`Vary\`). Копия свежая (её возраст меньше \`max-age\`) — отдаётся мгновенно, без сети.
4. Копия несвежая, но у неё есть валидатор — браузер шлёт **условный запрос** с \`If-None-Match: "<etag>"\`. Сервер отвечает \`304\` без тела, и браузер берёт тело из своей копии.
5. Запрос, ушедший в сеть, по пути проходит **CDN**: если у CDN есть свежая копия (по \`s-maxage\` или \`max-age\`), до вашего сервера он не дойдёт.
6. Отдельно от этой цепочки живёт **постоянное хранилище** (IndexedDB, localStorage): его читает уже ваш код, например, чтобы при холодном старте сразу нарисовать последние данные, пока идёт свежий запрос.

Ключевое правило: **у каждого этажа своя инвалидация**. Хэш в имени файла инвалидирует HTTP-кэш и CDN автоматически, Service Worker обновляется по своему жизненному циклу, кэш в памяти вы сбрасываете сами после мутаций. Отдельное следствие: если ответ пришёл совсем без \`Cache-Control\` и \`Expires\`, но с \`Last-Modified\`, браузер вправе закэшировать его **эвристически** — обычно на долю времени, прошедшего с момента изменения. Отсутствие заголовков не означает отсутствие кэша.

### Пример 1. HTTP-кэш: правильные заголовки для SPA

Базовая схема доставки Angular-приложения:

\`\`\`text
index.html             →  Cache-Control: no-cache
main-HN4KZGPA.js       →  Cache-Control: public, max-age=31536000, immutable
styles-5INURTSO.css    →  Cache-Control: public, max-age=31536000, immutable
ngsw-worker.js         →  Cache-Control: no-cache
GET /api/countries     →  Cache-Control: private, max-age=3600
GET /api/profile       →  Cache-Control: private, no-cache   + ETag
GET /api/balance       →  Cache-Control: no-store
\`\`\`

Почему так. Файлы с хэшем в имени кэшируются на год (31 536 000 секунд): их содержимое по этому адресу никогда не изменится, а новая сборка получит новые имена. \`index.html\` получает \`no-cache\`: его браузер перепроверяет каждый раз, и именно он приносит ссылки на новые хэшированные файлы. Если закэшировать HTML на сутки, пользователь сутки будет сидеть на старой версии, а после деплоя, удалившего старые чанки, ленивые модули начнут падать с ошибкой загрузки. Справочник почти не меняется — час свежести; профиль меняется — проверяем каждый раз через \`ETag\`; баланс — не храним нигде.

### Пример 2. Ревалидация: \`ETag\` и ответ 304

Посмотрим, как работает условный запрос, на маленьком Node-сервере:

\`\`\`js
import http from 'node:http';
import crypto from 'node:crypto';

const body = JSON.stringify({ name: 'Ada', role: 'admin' });
const etag = '"' + crypto.createHash('sha1').update(body).digest('hex').slice(0, 8) + '"';

const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('ETag', etag);
  if (req.headers['if-none-match'] === etag) {
    res.statusCode = 304;                // версия совпала — тело не отправляем
    return res.end();
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(body);
});

server.listen(0, async () => {
  const url = \`http://localhost:\${server.address().port}/api/profile\`;
  const r1 = await fetch(url);
  console.log(r1.status, r1.headers.get('etag'), (await r1.text()).length + ' байт');
  const r2 = await fetch(url, { headers: { 'If-None-Match': r1.headers.get('etag') } });
  console.log(r2.status, (await r2.text()).length + ' байт');
  server.close();
});
// 200 "6becbeec" 29 байт
// 304 0 байт
\`\`\`

В браузере \`If-None-Match\` руками писать не нужно: он сам запоминает \`ETag\` и сам подставляет его при ревалидации, а вашему коду отдаёт обычный \`200\` с телом из кэша. Важно понимать цену: 304 экономит **трафик**, но не **задержку** — запрос к серверу всё равно происходит. Поэтому для файлов, которые точно не изменятся, лучше длинный \`max-age\`, чем \`no-cache\` + \`ETag\`.

### \`no-cache\`, \`no-store\` и \`max-age=0\` — в чём разница

Самый частый вопрос на собеседовании, потому что названия обманчивы:

- \`no-cache\` — **хранить можно**, но перед каждым использованием копию надо перепроверить у сервера. Подходит для HTML и данных с \`ETag\`.
- \`no-store\` — **хранить нельзя** нигде: ни в браузере, ни в CDN. Для персональных и чувствительных ответов: баланс, медицинские данные, одноразовые ссылки.
- \`max-age=0\` — копия сразу несвежая. На практике ведёт себя похоже на \`no-cache\`, но формально кэш может отдать несвежую копию, если сервер недоступен; \`max-age=0, must-revalidate\` это запрещает. Поэтому для «перепроверяй всегда» пишут явное \`no-cache\`.

### \`immutable\` и хэш в имени файла

В production-конфигурации, которую генерирует Angular CLI, включено \`outputHashing: "all"\`: в имена файлов добавляется хэш их содержимого, поэтому \`main-HN4KZGPA.js\` и \`main-7QX3LM2P.js\` — это разные URL. Изменили одну строку — изменился хэш, изменился адрес, и браузер честно скачает новый файл, хотя старый лежит в кэше «на год». Директива \`immutable\` дополнительно просит браузер не перепроверять такой файл даже при ручной перезагрузке страницы. Поддержка \`immutable\` различается между браузерами, поэтому главную работу всё равно делает хэш в имени, а не эта директива.

### \`stale-while-revalidate\` в заголовке

SWR бывает не только стратегией Service Worker, но и директивой HTTP:

\`\`\`text
Cache-Control: max-age=60, stale-while-revalidate=600
\`\`\`

Первые 60 секунд копия свежая и отдаётся сразу. Следующие 600 секунд браузер (или CDN) **отдаёт несвежую копию мгновенно и одновременно в фоне её обновляет**. Позже — обычная ревалидация. Поддержка директивы различается: Chromium и Firefox её понимают, для Safari проверяйте актуальную таблицу совместимости. CDN тоже понимают её по-разному, поэтому смотрите документацию своего провайдера.

### \`Vary\` и CDN

CDN — это общий кэш для всех пользователей, и тут важны две вещи. Первая: \`s-maxage\` задаёт срок только для CDN, оставляя браузеру свой \`max-age\`. Вторая: заголовок \`Vary\` говорит, по каким заголовкам запроса различать копии.

\`\`\`text
Cache-Control: public, max-age=60, s-maxage=600
Vary: Accept-Encoding, Accept-Language
\`\`\`

Если забыть \`Vary: Accept-Language\`, CDN отдаст русскую версию англоязычным пользователям. Обратная крайность — \`Vary: Cookie\` или \`Vary: Authorization\`: у каждого пользователя свои cookie, поэтому каждая копия уникальна и CDN фактически перестаёт кэшировать. Персональные ответы помечают \`private\`, чтобы общий кэш их не сохранял вовсе. Сбросить копии в CDN досрочно можно через purge (принудительную очистку по URL или тегу) — это делается в CI после деплоя.

### Service Worker и три стратегии

Service Worker перехватывает запросы в обработчике \`fetch\` и отвечает через \`event.respondWith()\`. Сами стратегии — это несколько строк кода над Cache Storage:

\`\`\`js
// sw.js
async function cacheFirst(request) {
  const cache = await caches.open('static-v1');
  const cached = await cache.match(request);
  if (cached) return cached;                     // есть в кэше — сеть не трогаем
  const response = await fetch(request);
  await cache.put(request, response.clone());    // clone: тело ответа читается только один раз
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open('api-v1');
  try {
    const response = await fetch(request);
    await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);   // сети нет — отдаём то, что было
    if (cached) return cached;
    throw new Error('offline and no cache');
  }
}

function staleWhileRevalidate(event) {
  return caches.open('api-v1').then(async (cache) => {
    const cached = await cache.match(event.request);
    const refresh = fetch(event.request)
      .then(async (response) => { await cache.put(event.request, response.clone()); return response; })
      .catch(() => cached);                      // сеть упала — не страшно, есть копия
    event.waitUntil(refresh);                    // не даём браузеру усыпить SW до конца обновления
    return cached ?? refresh;                    // есть копия — отвечаем ею сразу
  });
}

// маршрутизация: какой запрос какой стратегией обслуживать
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;            // мутации не кэшируем
  if (url.pathname.startsWith('/api/rates')) event.respondWith(networkFirst(event.request));
  else if (url.pathname.startsWith('/api/')) event.respondWith(staleWhileRevalidate(event));
  else event.respondWith(cacheFirst(event.request));
});
\`\`\`

Если прогнать эти функции на фальшивой сети, где сервер переключается с версии \`v1\` на \`v2\`, получится:

\`\`\`text
cache-first #1: v1          ← первый раз из сети, ответ положили в кэш
cache-first #2: v1          ← на сервере уже v2, но кэш отдаёт v1 и в сеть не ходит
network-first online: v1    ← сеть доступна — свежий ответ
network-first offline: v1   ← сети нет — последний сохранённый ответ
swr #1: v1                  ← кэша нет — ждём сеть
swr #2: v1                  ← на сервере v2: отдали старое мгновенно, в фоне обновили
swr #3: v2                  ← теперь в кэше уже новая версия
\`\`\`

Отсюда правило выбора: **cache-first** — для того, что не меняется (шрифты, иконки, файлы с хэшем); **network-first** — когда важна свежесть, а кэш нужен только как запасной вариант без сети; **SWR** — когда данные меняются, но отстать на один показ не страшно (аватары, справочники, лента).

### Angular Service Worker: \`ngsw-config.json\`

В Angular эти стратегии не пишут руками: \`@angular/service-worker\` генерирует SW по конфигу.

\`\`\`json
{
  "index": "/index.html",
  "assetGroups": [
    { "name": "app", "installMode": "prefetch", "updateMode": "prefetch",
      "resources": { "files": ["/index.html", "/*.css", "/*.js"] } },
    { "name": "assets", "installMode": "lazy", "updateMode": "prefetch",
      "resources": { "files": ["/assets/**", "/*.(png|svg|woff2)"] } }
  ],
  "dataGroups": [
    { "name": "dictionaries", "urls": ["/api/countries", "/api/currencies"],
      "cacheConfig": { "strategy": "performance", "maxSize": 20, "maxAge": "1d" } },
    { "name": "rates", "urls": ["/api/rates/**"],
      "cacheConfig": { "strategy": "freshness", "maxSize": 50, "maxAge": "1h", "timeout": "3s" } }
  ]
}
\`\`\`

\`assetGroups\` описывают файлы приложения: \`prefetch\` скачивает их все при установке (приложение откроется офлайн), \`lazy\` кэширует по мере запросов. \`dataGroups\` описывают ответы API: стратегия \`performance\` — это cache-first с ограничением \`maxAge\`, \`freshness\` — network-first: ждём сеть не дольше \`timeout\`, потом отдаём кэш. \`maxSize\` и \`maxAge\` обязательны — открытый кэш рано или поздно упрётся в квоту.

Обновления приложения Angular SW проверяет через файл \`ngsw.json\` (он запрашивается с параметром \`ngsw-cache-bust\`, чтобы не застрять в HTTP-кэше). Новую версию он скачивает в фоне, но открытым вкладкам не подменяет: об этом сообщает \`SwUpdate\`.

\`\`\`ts
import { inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

export function listenForUpdates() {
  const updates = inject(SwUpdate);
  if (!updates.isEnabled) return;                         // в dev-режиме SW обычно выключен
  updates.versionUpdates
    .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
    .subscribe(async () => {
      if (confirm('Доступна новая версия. Обновить?')) {
        await updates.activateUpdate();                   // переключить вкладку на новую версию
        document.location.reload();                       // и перезагрузить, чтобы код совпал
      }
    });
}
\`\`\`

Без такого флоу пользователь, который держит вкладку открытой неделями, неделями сидит на старом app shell.

### Кэш в памяти: дедупликация и TTL

Внутри SPA самый полезный кэш — это общий сервис, который помнит ответы и не даёт пяти виджетам сделать пять одинаковых запросов. Пример на RxJS: \`shareReplay\` делит один HTTP-запрос между всеми подписчиками и запоминает ответ, а \`Map\` хранит срок жизни.

\`\`\`ts
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

export class QueryCache {
  private entries = new Map<string, { obs$: Observable<unknown>; expires: number }>();

  get<T>(key: string, load: () => Observable<T>, ttlMs: number): Observable<T> {
    const hit = this.entries.get(key);
    if (hit && hit.expires > Date.now()) return hit.obs$ as Observable<T>; // свежая запись
    const obs$ = load().pipe(
      catchError((err) => { this.entries.delete(key); return throwError(() => err); }), // ошибку не кэшируем
      shareReplay({ bufferSize: 1, refCount: false }), // один запрос на всех + запомнить ответ
    );
    this.entries.set(key, { obs$, expires: Date.now() + ttlMs });
    return obs$;
  }

  invalidate(prefix: string): void {
    for (const key of this.entries.keys()) if (key.startsWith(prefix)) this.entries.delete(key);
  }
}

// TTL = 200 мс, запрос «к серверу» длится 50 мс
const users$ = () => cache.get('users', () => http.get('/api/users'), 200);
users$().subscribe(...);                          // HTTP /api/users
users$().subscribe(...);                          // тот же запрос, второго нет
setTimeout(() => users$().subscribe(...), 100);   // из памяти
setTimeout(() => users$().subscribe(...), 300);   // TTL истёк → HTTP /api/users
// после мутации: cache.invalidate('users')       // следующий вызов → HTTP /api/users
\`\`\`

Итого за полсекунды пять подписок, но только три сетевых запроса: первые две подписки разделили один запрос, третья взяла ответ из памяти, четвёртая пришла после TTL, пятая — после явной инвалидации. Ошибки намеренно не кэшируются: иначе один упавший запрос «залипнет» до конца TTL. Именно это (плюс фоновое обновление, повтор при возврате на вкладку, отмена) дают готовые data-layer библиотеки вроде TanStack Query — со своими ключами запросов и инвалидацией по ключам и тегам: после мутации «заказ изменён» сбрасываются все запросы с тегом \`orders\`.

### HTTP-интерсептор кэша в Angular

Если хочется кэшировать на уровне \`HttpClient\`, удобно включать кэш **явно на конкретном запросе** через \`HttpContextToken\` — типизированный «флажок», который едет вместе с запросом и виден интерсептору.

\`\`\`ts
import { HttpContext, HttpContextToken, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';

export const CACHE_TTL = new HttpContextToken<number>(() => 0); // 0 = не кэшировать
const cache = new Map<string, { response: HttpResponse<unknown>; expires: number }>();

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  const ttl = req.context.get(CACHE_TTL);
  if (req.method !== 'GET' || ttl === 0) return next(req);       // только GET с явным TTL
  const key = req.urlWithParams;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return of(hit.response.clone()); // сеть не трогаем
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) cache.set(key, { response: event, expires: Date.now() + ttl });
    }),
  );
};

// app.config.ts: provideHttpClient(withInterceptors([cacheInterceptor]))
const ctx = new HttpContext().set(CACHE_TTL, 60_000);
http.get('/api/countries', { context: ctx }).subscribe(); // 1-й вызов: запрос в сеть
http.get('/api/countries', { context: ctx }).subscribe(); // 2-й вызов: из кэша, запросов 0
http.get('/api/countries').subscribe();                    // без TTL: снова в сеть
\`\`\`

Проверено с \`HttpTestingController\`: второй вызов не создаёт ни одного запроса. Но у такого интерсептора есть дыра — два **одновременных** вызова до первого ответа уйдут в сеть оба (кэш ещё пуст). Если это важно, храните в \`Map\` не ответ, а общий \`Observable\` с \`shareReplay\`, как в предыдущем примере.

### Постоянное хранилище и синхронизация вкладок

IndexedDB и localStorage переживают перезагрузку, поэтому их используют для быстрого холодного старта (сразу показать последние данные, а свежие догрузить) и для офлайна. localStorage синхронный и маленький (обычно порядка 5 МБ на сайт, только строки), поэтому большие данные кладут в IndexedDB. Объём квоты зависит от браузера и свободного места, узнать его можно через \`navigator.storage.estimate()\`, а попросить браузер не удалять данные при нехватке места — через \`navigator.storage.persist()\`. Safari отдельно известен тем, что может стереть данные сайта, с которым пользователь давно не взаимодействовал; установленные PWA под это правило обычно не попадают, но точное поведение зависит от версии.

У каждой вкладки свой кэш в памяти, поэтому после мутации в одной вкладке соседняя показывает старое. Решение — оповестить остальные:

\`\`\`ts
const channel = new BroadcastChannel('query-cache');

// вкладка, где произошла мутация
channel.postMessage({ type: 'invalidate', key: 'users' });

// все остальные вкладки того же сайта
channel.onmessage = (e) => {
  if (e.data.type === 'invalidate') cache.invalidate(e.data.key);
};
// отправитель своё сообщение не получает — только другие вкладки
\`\`\`

Альтернатива — событие \`storage\`: оно срабатывает в **других** вкладках, когда одна из них меняет localStorage.

### Как выбрать

- **Файлы сборки с хэшем в имени** — \`max-age=31536000, immutable\`, в SW — cache-first или \`prefetch\`. Инвалидация автоматическая через новое имя.
- **\`index.html\`, \`ngsw-worker.js\`, \`ngsw.json\`** — \`no-cache\`. Иначе пользователи застрянут на старой версии.
- **Справочники, которые меняются раз в день** — \`max-age\` на часы, SWR или \`performance\` в SW, кэш в памяти на всё время сессии.
- **Часто читаемые и умеренно меняющиеся данные (профиль, лента, список задач)** — \`no-cache\` + \`ETag\` и SWR в data-layer с инвалидацией по ключам после мутаций.
- **Критично свежие данные (баланс, торги, остатки на складе)** — \`no-store\` или network-first с коротким таймаутом, а для настоящей актуальности — WebSocket или SSE.
- **Офлайн-сценарии** — app shell в SW, данные в IndexedDB, синхронизация отдельным слоем.
- **Персональные ответы** — \`private\`, чтобы CDN их не сохранял; никаких \`public\` для того, что зависит от пользователя.

### Где это применяется на практике

- **Деплой SPA на CDN** (Vercel, CloudFront, Nginx): хэшированные файлы — год и \`immutable\`, \`index.html\` и файлы Service Worker — \`no-cache\`, после деплоя — purge HTML в CDN.
- **Корпоративный дашборд**: справочники (валюты, страны, роли) — в памяти на всю сессию; виджеты дедуплицируют общие запросы; после сохранения формы инвалидируются ключи затронутых сущностей.
- **Большие таблицы с фильтрами**: ответы кэшируются по ключу «URL + параметры», возврат на предыдущую страницу таблицы мгновенный, а данные обновляются в фоне.
- **PWA для работы в поле** (склад, выездные сотрудники): app shell в Angular SW, данные в IndexedDB, \`freshness\` для API с таймаутом 3 секунды на плохой связи.
- **Финтех-интерфейсы**: баланс и котировки — \`no-store\` и real-time, а всё остальное (меню, справочники, переводы) кэшируется агрессивно.

## Важные нюансы и подводные камни

- **Закэшированный \`index.html\`.** Пользователи месяцами сидят на старой версии, а вы слышите «у меня баг не воспроизводится». После удаления старых чанков с сервера их ленивые модули ещё и падают при загрузке.
- **Кэш без плана инвалидации.** Добавить кэш — полдня, вычистить протухшие данные у тысяч пользователей — недели. Сначала ответьте «как и когда эта копия станет неправдой», потом кэшируйте.
- **\`no-cache\` не значит «не кэшировать».** Это «кэшировать, но всегда перепроверять». Запретить хранение может только \`no-store\`.
- **304 экономит трафик, но не задержку.** Запрос до сервера всё равно идёт; для неизменяемых файлов нужен \`max-age\`, а не ревалидация.
- **Нет заголовков — всё равно есть кэш.** При наличии \`Last-Modified\` без \`Cache-Control\` браузер может закэшировать ответ эвристически. Всегда задавайте \`Cache-Control\` явно.
- **\`Vary: Cookie\` убивает CDN**, а забытый \`Vary: Accept-Language\` отдаёт пользователям чужой язык.
- **Персональные данные в общем кэше.** Ответ с данными пользователя без \`private\` может осесть в CDN и уйти другому человеку — это уже инцидент безопасности, а не баг.
- **Рассинхрон между вкладками.** В одной вкладке данные обновились, в другой нет. Лечится \`BroadcastChannel\` или событием \`storage\`.
- **Разрастание IndexedDB и Cache Storage без очистки.** Cache Storage сам ничего не удаляет по времени — рано или поздно вы упираетесь в квоту и получаете странные ошибки записи. Ограничивайте размер (\`maxSize\` в Angular SW) и чистите старые версии кэшей.
- **Service Worker, который не обновляется.** Старый SW продолжает отдавать старый app shell; нужен внятный флоу: обнаружили \`VERSION_READY\` → спросили пользователя → \`activateUpdate()\` → перезагрузка. В самописном SW это \`skipWaiting()\` и \`clients.claim()\`, но включать их без спроса опасно: новый код может встретиться со старой страницей.
- **«Disable cache» в DevTools не отключает Service Worker.** Для этого есть отдельная галочка «Bypass for network» во вкладке Application — иначе отладка кэширования превращается в мистику.
- **Кэширование ошибок.** Если кэш запоминает упавший ответ, ошибка «залипает» до истечения TTL. Ошибочные ответы не кэшируют.
- **Opaque-ответы в SW.** Ответ на \`no-cors\` запрос к чужому домену непрозрачен: SW не видит даже статус и может закэшировать ошибку. Angular по умолчанию не кэширует такие ответы в группах \`performance\`.

**Плюсы:** мгновенная загрузка повторных визитов, меньше нагрузки на сервер и трафика, работа без сети, дедупликация запросов внутри приложения.
**Минусы:** инвалидация сложна и у каждого слоя своя; риск показать устаревшие или чужие данные; отладка многоэтажного кэша трудна; хранилища упираются в квоты, а поддержка части директив зависит от браузера.

## Как это спрашивают на собеседовании

**Главный вывод:** кэш во фронтенде многоуровневый, и стратегию выбирают по цене устаревших данных: неизменяемые файлы с хэшем — на год, HTML — \`no-cache\`, данные — SWR или network-first с инвалидацией по ключам, критично свежее — \`no-store\` и real-time. Самое трудное — не включить кэш, а продумать его инвалидацию.

Типичные формулировки: «Какие виды кэширования вы знаете во фронтенде?», «Чем \`no-cache\` отличается от \`no-store\`?», «Как сделать так, чтобы пользователи сразу получали новую версию приложения после деплоя?», «Что такое stale-while-revalidate?».

Что могут спросить следом:

- *Как работает \`ETag\`?* — Сервер присылает отпечаток версии, браузер при ревалидации шлёт его в \`If-None-Match\`, и при совпадении сервер отвечает \`304\` без тела.
- *Почему пользователи после деплоя видят старую версию?* — Закэширован \`index.html\` или не обновился Service Worker; лечится \`no-cache\` на HTML и флоу обновления через \`SwUpdate\`.
- *Чем \`s-maxage\` отличается от \`max-age\`?* — \`s-maxage\` действует только на общие кэши (CDN, прокси) и для них важнее \`max-age\`.
- *Чем \`performance\` отличается от \`freshness\` в Angular SW?* — Первая стратегия — cache-first с \`maxAge\`, вторая — network-first с \`timeout\` и запасным кэшем.
- *Как синхронизировать кэш между вкладками?* — \`BroadcastChannel\` или событие \`storage\`: вкладка после мутации рассылает «инвалидируй ключ X».

### Ответ на 1 минуту

> Кэш во фронтенде многоуровневый: кэш в памяти приложения, Service Worker, HTTP-кэш браузера, CDN и постоянное хранилище вроде IndexedDB. Стратегию я выбираю по цене устаревших данных. Файлы сборки с хэшем в имени отдаю с \`max-age\` на год и \`immutable\` — новая сборка получает новые имена, поэтому инвалидация автоматическая. \`index.html\` и файлы Service Worker — только \`no-cache\`, иначе пользователи застрянут на старой версии. Для данных есть три стратегии: cache-first для неизменного, network-first там, где важна свежесть, с кэшем как запасом без сети, и stale-while-revalidate — отдать копию сразу и обновить в фоне. Критично свежее вроде баланса — \`no-store\` или real-time. Из нюансов: \`no-cache\` разрешает хранить, но требует ревалидации через \`ETag\` и ответ 304, а \`no-store\` запрещает хранение вообще. И главное — инвалидацию я продумываю до внедрения кэша, а не после.`,
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
      ru: `## В чём суть

Real-time-фронтенд получает данные **в момент их появления**, а не когда пользователь нажал «обновить». Сначала выбирают «трубу»: SSE — односторонний поток от сервера к клиенту поверх обычного HTTP, WebSocket — постоянный двусторонний канал. Но подключиться — самое простое. Вся сложность в трёх вещах: **пережить обрывы, не утопить интерфейс в потоке сообщений и не потерять данные**.

Аналогия: радиостанция против рации. SSE — это радио: станция вещает, вы только слушаете, а приёмник сам ловит волну заново, если вы проехали тоннель. WebSocket — рация: говорить можно в обе стороны, но связь надо держать, батарейку тратить и следить, чтобы канал не забился. И в обоих случаях, если новости сыплются быстрее, чем вы способны слушать, решение не «слушать быстрее», а конспект раз в секунду.

**Какую проблему решает.** Без real-time клиент вынужден опрашивать сервер (polling): «есть новое? а сейчас?» — это либо задержка в секунды, либо тысячи пустых запросов. Биржевой терминал, чат, совместное редактирование, мониторинг заказов, уведомления — всё это требует доставки за миллисекунды. А при высокой нагрузке наивная реализация ломается сразу в трёх местах: после сбоя сервера все клиенты одновременно ломятся обратно и роняют его снова; интерфейс замерзает от сотен перерисовок в секунду; после переподключения пропадают сообщения, пришедшие во время обрыва.

## Словарик терминов

- **Polling и long polling** — клиент регулярно спрашивает сервер о новостях / задаёт вопрос, а сервер держит ответ, пока новость не появится.
- **SSE (Server-Sent Events) и \`EventSource\`** — стандарт однонаправленного потока событий от сервера по одному долгому HTTP-ответу и браузерный API для его чтения.
- **\`text/event-stream\`** — формат SSE: текстовые блоки с полями \`id:\`, \`event:\`, \`data:\`, \`retry:\`, разделённые пустой строкой.
- **\`Last-Event-ID\`** — заголовок, который браузер сам отправляет при переподключении SSE: «последнее, что я получил, — событие с таким \`id\`».
- **WebSocket** — протокол постоянного двустороннего соединения поверх TCP, который начинается как HTTP-запрос и «переключается» на свой формат.
- **Upgrade / handshake (рукопожатие)** — первый HTTP-запрос с \`Upgrade: websocket\`, на который сервер отвечает \`101 Switching Protocols\`.
- **Фрейм (frame)** — единица данных WebSocket: текстовые, бинарные и служебные (\`ping\`, \`pong\`, \`close\`).
- **Close code** — числовой код закрытия: \`1000\` нормальное, \`1001\` «ухожу» (рестарт сервера), \`1006\` обрыв без закрывающего фрейма.
- **Heartbeat (ping/pong)** — регулярное «ты жив?» — «жив», чтобы отличить живое соединение от зависшего.
- **Reconnect с экспоненциальным backoff** — после обрыва переподключаться с растущей паузой: 1 с, 2 с, 4 с, 8 с…
- **Jitter** — случайный разброс паузы, чтобы клиенты не возвращались одновременно.
- **Thundering herd («бегущее стадо»)** — ситуация, когда тысячи клиентов одновременно ломятся на только что поднявшийся сервер и снова его роняют.
- **Snapshot + deltas (снапшот и дельты)** — сначала загрузить полное состояние, затем применять только изменения.
- **Sequence number / курсор** — порядковый номер события, по которому клиент понимает, что пропустил и что уже видел.
- **Идемпотентность** — повторное применение того же события не меняет результат.
- **Backpressure (обратное давление)** — ситуация, когда данные приходят быстрее, чем потребитель успевает их обработать, и способы с этим справиться.
- **Коалесцирование (coalescing)** — схлопывание промежуточных значений: из 200 цен за секунду оставить последнюю.
- **Батчинг** — накопить сообщения и обработать пачкой за один раз.
- **Change detection** — механизм Angular, который проверяет шаблоны и обновляет DOM после изменения данных.
- **Zone.js и zoneless** — библиотека, по которой Angular узнаёт об асинхронных событиях / режим без неё, где обновление запускают сигналы. В Angular 21 новые приложения по умолчанию zoneless.
- **\`webSocket\` из RxJS** — обёртка над браузерным WebSocket в виде \`Subject\`: читать как поток, писать через \`next()\`.
- **Sticky sessions** — балансировщик всегда направляет клиента на тот же сервер.
- **Pub/sub (например, Redis)** — шина «опубликовал — получили все подписчики», чтобы сообщение с одного сервера дошло до клиентов, подключённых к другим.
- **Fan-out** — рассылка одного события множеству подписчиков.

## Как это работает под капотом

Порядок решений при проектировании:

1. **Выбор транспорта.** Если данные идут только от сервера (ленты, уведомления, прогресс задач) — SSE: обычный HTTP, авто-переподключение из коробки, проще инфраструктура. Если клиенту нужно часто и быстро писать (чат, совместное редактирование, торговля) — WebSocket.
2. **Надёжность соединения.** Любое соединение рано или поздно рвётся: Wi-Fi, сон ноутбука, деплой сервера. Поэтому нужен reconnect с экспоненциальным backoff **и jitter**, а также heartbeat: без него «полуоткрытое» соединение может молча висеть минутами.
3. **Не терять сообщения.** Каждое событие получает возрастающий номер. После переподключения клиент сообщает последний полученный номер, и сервер досылает пропущенное (в SSE это \`Last-Event-ID\`).
4. **Согласованность.** Сначала полный снапшот через REST (с его номером версии), затем дельты по сокету. Дубли отбрасываются по номеру, а «дыра» в номерах — сигнал запросить снапшот заново.
5. **Производительность клиента.** Сообщения не применяют к UI по одному: их буферизуют и применяют пачкой — раз в кадр или раз в 100 мс. Промежуточные значения коалесцируют.
6. **Инфраструктура.** Соединения долгие, поэтому их держат отдельные шлюзы (gateway); события между узлами разносит pub/sub; авторизация проверяется в момент рукопожатия.
7. **Деградация.** Сокет недоступен — фолбэк на polling, честный индикатор «нет связи» и очередь исходящих действий, которая отправится при восстановлении.

### SSE: формат потока и \`EventSource\`

SSE — это обычный HTTP-ответ с типом \`text/event-stream\`, который сервер не закрывает и дописывает по мере появления событий. Сервер на Node:

\`\`\`js
import http from 'node:http';

const events = [
  { id: 41, type: 'price', data: { symbol: 'EURUSD', bid: 1.0841 } },
  { id: 42, type: 'price', data: { symbol: 'EURUSD', bid: 1.0843 } },
  { id: 43, type: 'news', data: { title: 'ECB decision' } },
];

http.createServer((req, res) => {
  const lastId = Number(req.headers['last-event-id'] ?? 0);  // с какого места продолжить
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
  res.write('retry: 5000\\n\\n');                               // переподключаться через 5 с
  for (const e of events.filter((e) => e.id > lastId)) {
    res.write(\`id: \${e.id}\\nevent: \${e.type}\\ndata: \${JSON.stringify(e.data)}\\n\\n\`);
  }
  res.write(': heartbeat\\n\\n');                               // строка-комментарий держит соединение
  res.end();                                                  // в демо закрываем, в жизни держим открытым
}).listen(8787);
\`\`\`

Что видно «на проводе» (\`curl\`), а затем — при переподключении с заголовком \`Last-Event-ID: 42\`:

\`\`\`text
retry: 5000

id: 41
event: price
data: {"symbol":"EURUSD","bid":1.0841}

id: 42
event: price
data: {"symbol":"EURUSD","bid":1.0843}

id: 43
event: news
data: {"title":"ECB decision"}

: heartbeat

---- переподключение с Last-Event-ID: 42 ----
retry: 5000

id: 43
event: news
data: {"title":"ECB decision"}

: heartbeat
\`\`\`

Клиент в браузере:

\`\`\`ts
const source = new EventSource('/api/stream', { withCredentials: true });
source.addEventListener('price', (e) => console.log('price', JSON.parse(e.data)));
source.addEventListener('news', (e) => console.log('news', JSON.parse(e.data)));
source.onerror = () => console.log('readyState', source.readyState); // 0 — переподключается, 2 — закрыт
\`\`\`

Почему SSE удобен: это обычный HTTP, поэтому он проходит корпоративные прокси и файрволы, которые иногда режут \`Upgrade\`, а переподключение и \`Last-Event-ID\` браузер делает сам. Когда сервер закрыл ответ, браузер подождёт \`retry\` миллисекунд и откроет поток заново с последним \`id\`. Но есть ограничения. \`EventSource\` **не умеет ставить свои заголовки** — \`Authorization\` не передать, остаются cookie (\`withCredentials\`) или самописный клиент поверх \`fetch\`. Если сервер ответил не \`200\` или не с тем \`Content-Type\`, браузер прекращает попытки навсегда. И в HTTP/1.1 браузер держит не больше шести соединений на один домен, причём лимит общий для всех вкладок: седьмая вкладка с SSE «зависнет». В HTTP/2 все потоки идут внутри одного соединения, и проблема уходит.

### WebSocket: рукопожатие, фреймы и коды закрытия

WebSocket начинается как HTTP-запрос и переключается на свой протокол:

\`\`\`text
GET /prices HTTP/1.1
Host: api.example.com
Upgrade: websocket
Connection: Upgrade
Origin: https://app.example.com
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
\`\`\`

\`Sec-WebSocket-Accept\` — это SHA-1 от ключа клиента, склеенного с фиксированной строкой из спецификации, в base64. Это доказательство, что сервер понимает WebSocket, а не защита:

\`\`\`js
const crypto = require('crypto');
const key = 'dGhlIHNhbXBsZSBub25jZQ==';
console.log(crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64'));
// s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
\`\`\`

Дальше по соединению ходят фреймы в обе стороны, без HTTP-заголовков на каждое сообщение — отсюда низкие накладные расходы. Важные детали браузерного API: он **не даёт отправить \`ping\`** (браузер сам отвечает \`pong\` на \`ping\` сервера, но JavaScript этого не видит), поэтому клиентский heartbeat делают обычными сообщениями. И он **не даёт задать свои заголовки** при рукопожатии.

### Пример 1. Reconnect с экспоненциальным backoff и jitter

\`\`\`ts
function backoffDelay(attempt: number, baseMs = 1000, maxMs = 30000): number {
  const cap = Math.min(maxMs, baseMs * 2 ** (attempt - 1)); // потолок паузы растёт вдвое
  return Math.random() * cap;                               // full jitter: случайно от 0 до потолка
}
// потолки для попыток 1..7:
// 1000, 2000, 4000, 8000, 16000, 30000, 30000
\`\`\`

Почему так. Экспонента даёт серверу время подняться, потолок в 30 секунд не даёт клиенту «уснуть» на часы, а случайность разносит клиентов во времени. Без jitter 50 000 клиентов, отключённых одним деплоем, вернутся ровно через 1 с, потом ровно через 2 с — синхронными волнами, каждая из которых снова кладёт сервер. С jitter те же клиенты размазываются по всему интервалу.

В RxJS это одна строка через \`retry\` с функцией \`delay\`: она получает номер попытки, а возвращённый поток задаёт паузу. \`resetOnSuccess: true\` сбрасывает счётчик после успешного подключения, чтобы следующий обрыв снова начинался с короткой паузы:

\`\`\`ts
import { defer, of, retry, throwError, timer } from 'rxjs';

let attempts = 0;
const connect$ = defer(() => {                 // соединение «падает» три раза, потом успех
  attempts++;
  console.log(\`попытка \${attempts}\`);
  return attempts <= 3 ? throwError(() => new Error('socket closed')) : of('connected');
});

connect$.pipe(
  retry({ count: 10, delay: (_err, n) => timer(backoffDelay(n, 100, 3000)), resetOnSuccess: true }),
).subscribe(console.log);
// попытка 1     (t = 0)
// попытка 2     (t ≈ 0–100 мс)
// попытка 3     (ещё через 0–200 мс)
// попытка 4     (ещё через 0–400 мс)
// connected
\`\`\`

### Пример 2. Сервис на RxJS \`webSocket\`: топики, переподключение, статус

\`webSocket()\` из \`rxjs/webSocket\` превращает сокет в поток. Метод \`multiplex\` позволяет держать несколько логических подписок в одном соединении: при подписке он сам отправляет серверу «подпиши меня», при отписке — «отпиши».

\`\`\`ts
import { Injectable, signal } from '@angular/core';
import { webSocket } from 'rxjs/webSocket';
import { repeat, retry, share, timer } from 'rxjs';

type Tick = { symbol: string; price: number };

@Injectable({ providedIn: 'root' })
export class PriceStream {
  readonly status = signal<'connecting' | 'online' | 'reconnecting'>('connecting');

  private readonly socket$ = webSocket<Tick | object>({
    url: 'wss://api.example.com/prices',
    openObserver: { next: () => this.status.set('online') },
    closeObserver: { next: () => this.status.set('reconnecting') },
  });

  ticks(symbol: string) {
    return this.socket$.multiplex(
      () => ({ subscribe: symbol }),               // уйдёт при подписке и при каждой переподписке
      () => ({ unsubscribe: symbol }),             // уйдёт при отписке
      (m) => (m as Tick).symbol === symbol,        // какие сообщения относятся к топику
    ).pipe(
      retry({ delay: (_e, n) => timer(backoffDelay(n)), resetOnSuccess: true }), // обрыв (1006)
      repeat({ delay: () => timer(backoffDelay(1)) }),                           // чистое закрытие (1000/1001)
      share(),                                     // компоненты, подписанные на этот поток, делят одну подписку
    );
  }
}
\`\`\`

Все топики идут через **одно физическое соединение** \`socket$\`: \`multiplex\` лишь добавляет сообщения подписки и фильтр. Проверено на Node с сервером \`ws\`, который рвёт первое соединение после двух сообщений:

\`\`\`text
клиент: online
сервер [соединение 1] получил {"subscribe":"EURUSD"}
клиент получил 110
клиент получил 111
клиент: закрыто, code 1006
клиент: online
сервер [соединение 2] получил {"subscribe":"EURUSD"}   ← подписка восстановилась сама
клиент получил 120
клиент получил 121
сервер [соединение 2] получил {"unsubscribe":"EURUSD"} ← при отписке
\`\`\`

Зачем и \`retry\`, и \`repeat\`. Обрыв без закрывающего фрейма (\`1006\`) превращается в \`error\`, и его ловит \`retry\`. А **чистое** закрытие сервером — например, \`1001\` при рестарте во время деплоя — превращается в \`complete\`, и \`retry\` на него не реагирует. Проверено: без \`repeat\` поток просто завершается, и клиент молча остаётся без данных.

### Пример 3. Батчинг и коалесцирование: не дёргать UI на каждое сообщение

\`\`\`ts
import { bufferTime, filter, map } from 'rxjs';

ticks$.pipe(
  bufferTime(100),                                  // копим сообщения 100 мс
  filter((batch) => batch.length > 0),              // пустые окна не рендерим
  map((batch) => {
    const latest = new Map<string, number>();
    for (const t of batch) latest.set(t.symbol, t.price); // по каждому инструменту — последняя цена
    return latest;
  }),
).subscribe((latest) => this.prices.update((p) => ({ ...p, ...Object.fromEntries(latest) })));
// 30 сообщений по трём инструментам за 300 мс → 3–4 обновления сигнала вместо 30,
// в каждом не больше трёх цен (точное число окон зависит от того, как сообщения легли на границы)
\`\`\`

Почему так. Сто сообщений в секунду превращаются максимум в десять обновлений состояния, а коалесцирование оставляет только последнюю цену: промежуточные 200 значений за секунду человек всё равно не увидит. Для синхронизации с отрисовкой браузера можно копить до кадра: класть сообщения в \`Map\` и сбрасывать их в состояние в \`requestAnimationFrame\` — одно обновление на кадр.

В приложениях на Zone.js каждое событие \`onmessage\` запускает проверку всего дерева компонентов. Поэтому сокет там создают внутри \`NgZone.runOutsideAngular()\`, парсят и копят сообщения вне зоны, а в зону возвращаются (\`ngZone.run\`) только с готовой пачкой. В zoneless-приложении зону обходить не нужно — проверку планирует изменение сигнала, — но батчинг всё равно нужен: тысяча \`set()\` в секунду — это тысяча лишних вычислений \`computed\` и шаблонов.

### Пример 4. Снапшот + дельты: дубли, дыры и идемпотентность

\`\`\`ts
class OrderBookSync {
  lastSeq = 0;
  state = new Map<string, { id: string; qty: number }>();
  constructor(private onResync: () => void) {}

  applySnapshot(snapshot: { seq: number; items: { id: string; qty: number }[] }) {
    this.state = new Map(snapshot.items.map((i) => [i.id, i]));
    this.lastSeq = snapshot.seq;                       // версия, на которой сделан снапшот
  }

  applyDelta(delta: { seq: number; op: 'upsert' | 'delete'; item?: any; id?: string }) {
    if (delta.seq <= this.lastSeq) return 'дубль, пропускаем';          // уже применяли
    if (delta.seq > this.lastSeq + 1) { this.onResync(); return 'дыра, нужен новый снапшот'; }
    if (delta.op === 'upsert') this.state.set(delta.item.id, delta.item);
    if (delta.op === 'delete') this.state.delete(delta.id!);
    this.lastSeq = delta.seq;
    return 'применено';
  }
}

sync.applySnapshot({ seq: 100, items: [{ id: 'a', qty: 5 }] });
sync.applyDelta({ seq: 99, ... });   // дубль, пропускаем — старше снапшота
sync.applyDelta({ seq: 101, ... });  // применено
sync.applyDelta({ seq: 101, ... });  // дубль, пропускаем — повтор после reconnect
sync.applyDelta({ seq: 103, ... });  // дыра, нужен новый снапшот — 102 потерялось
// состояние: a(5), b(3), lastSeq: 101
\`\`\`

Почему так. Сокет начинает слать дельты с момента подключения, а клиенту нужна картина целиком — её даёт снапшот. Дельты, пришедшие раньше снапшота (номер меньше его версии), отбрасываются. После переподключения сервер может прислать часть событий повторно — проверка номера делает применение идемпотентным, иначе счётчики удвоятся. А пропуск номера честнее всего лечить новым снапшотом, чем гадать.

### Heartbeat: как заметить «мёртвое» соединение

TCP-соединение может оборваться так, что ни одна сторона не узнает об этом сразу: роутер потерял состояние, ноутбук проснулся в другой сети. Браузерный WebSocket в таком состоянии может долго оставаться «открытым». Поэтому клиент шлёт свой \`ping\` сообщением и ждёт ответа:

\`\`\`ts
import { interval, timeout } from 'rxjs';

// сервер отвечает {type:'pong'} на {type:'ping'}
interval(15_000).subscribe(() => socket$.next({ type: 'ping' }));
socket$.pipe(
  timeout(45_000),   // любое сообщение (pong или данные) — признак жизни; 45 с тишины → ошибка → retry
).subscribe();
\`\`\`

Сервер со своей стороны шлёт протокольные \`ping\`-фреймы и закрывает клиентов, которые не ответили, — иначе он годами держит память под «мертвецов». Учтите, что в фоновых вкладках браузеры замедляют таймеры, поэтому таймауты делайте с запасом и перепроверяйте соединение по событию \`visibilitychange\`.

### Авторизация соединения

Браузерный \`WebSocket\` не позволяет задать заголовок \`Authorization\` при рукопожатии. Поэтому на практике есть три варианта:

- **Cookie сессии.** Она уходит с рукопожатием автоматически. Но WebSocket не защищён CORS, поэтому сервер обязан проверять заголовок \`Origin\`, иначе чужой сайт откроет сокет от имени пользователя (Cross-Site WebSocket Hijacking).
- **Одноразовый билет в query-строке.** Клиент обычным авторизованным запросом получает короткий билет (живёт секунды, работает один раз) и подключается к \`wss://.../prices?ticket=...\`. Даже попав в логи, такой билет уже бесполезен. Долгоживущий access-токен в URL класть нельзя: URL оседает в логах прокси и балансировщиков.
- **Первое сообщение.** Соединение открывается без прав, первым сообщением клиент присылает токен, и до проверки сервер ничего не отдаёт.

Токены живут меньше соединений, поэтому сервер должен уметь принять обновлённый токен по открытому сокету или закрыть соединение кодом вроде \`4001\` (коды \`4000\`–\`4999\` отданы приложениям), чтобы клиент переподключился с новым.

### Инфраструктура и масштабирование

Соединение WebSocket «прибито» к конкретному серверу, пока живо. Поэтому события, рождённые на одном узле, надо доставить клиентам, подключённым к другим: узлы шлюза подписываются на общую шину (Redis pub/sub, Kafka, NATS) и рассылают события своим клиентам по топикам (fan-out). Sticky sessions нужны, когда узел хранит состояние клиента в памяти или когда используется фолбэк на long polling (например, в Socket.IO). Отдельная тема — деплой: при перезапуске узла все его клиенты переподключаются одновременно, и без jitter это та самая волна thundering herd. Помните, что Socket.IO — это **свой протокол поверх WebSocket**, обычный клиент \`WebSocket\` к серверу Socket.IO не подключится.

### Где это применяется на практике

- **Торговые и биржевые терминалы**: котировки по WebSocket, подписки на инструменты через \`multiplex\`, коалесцирование до последней цены, обновление большой таблицы раз в кадр.
- **Мониторинг и дашборды** (заказы, логистика, алерты): SSE с \`Last-Event-ID\`, снапшот через REST, индикатор «нет связи».
- **Уведомления и прогресс долгих задач** (импорт, генерация отчётов): SSE — проще и дешевле WebSocket.
- **Чаты и совместное редактирование**: WebSocket, идемпотентные сообщения с клиентским \`id\`, очередь исходящих на время обрыва.
- **Корпоративные приложения за прокси**: SSE на HTTP/2 через тот же домен и те же cookie, что и REST, без отдельной инфраструктуры.

## Важные нюансы и подводные камни

- **Reconnect без jitter.** Все клиенты возвращаются в одну и ту же секунду и укладывают только что поднявшийся сервер.
- **Обновление стейта на каждое сообщение.** При 500 сообщениях в секунду интерфейс замерзает — нужен буфер и коалесцирование.
- **Незакрытые подписки при уходе с роута.** Соединения копятся, память течёт, сервер держит мёртвых клиентов. Используйте \`takeUntilDestroyed\`, \`toSignal\` или \`async\`-пайп, а общий сокет держите в сервисе.
- **Только дельты без снапшота.** Клиент, подключившийся позже, не знает исходного состояния и рисует чепуху.
- **Отсутствие идемпотентности.** После reconnect сервер шлёт события повторно, и счётчики удваиваются. Проверяйте номер события.
- **\`retry\` не ловит чистое закрытие.** RxJS \`webSocket\` при закрытии с \`wasClean\` завершает поток, а не падает с ошибкой; без \`repeat\` клиент после рестарта сервера тихо остаётся без данных.
- **Подписки после переподключения.** Новое соединение ничего не знает о старых топиках; \`multiplex\` переотправляет подписку сам, самописный код должен делать это явно.
- **Токен в query-строке.** Утекает в логи прокси и балансировщиков. Допустим только короткоживущий одноразовый билет.
- **Нет проверки \`Origin\`.** Cookie уходит с рукопожатием автоматически, CORS сокет не защищает — без проверки \`Origin\` возможен перехват сессии чужим сайтом.
- **Лимит соединений SSE в HTTP/1.1.** Шесть соединений на домен на весь браузер: несколько вкладок с SSE блокируют обычные запросы. Лечится HTTP/2 или одним общим соединением на все вкладки (через \`SharedWorker\`, поддержка которого на мобильных ограничена, или «ведущую» вкладку, раздающую данные остальным через \`BroadcastChannel\`).
- **SSE «застревает» в прокси.** Буферизующий прокси (например, nginx с включённой буферизацией) или сжатие копят события и отдают их пачкой. Отключайте буферизацию для потока.
- **\`EventSource\` сдаётся навсегда** при ответе не \`200\` или с неправильным \`Content-Type\` — например, когда истекла сессия и сервер ответил \`401\`. Это надо ловить и переподключаться вручную после обновления сессии.
- **Исходящий поток тоже может захлебнуться.** Если клиент шлёт быстрее, чем сеть успевает отправить, растёт \`socket.bufferedAmount\` (байты в очереди на отправку); при больших объёмах проверяйте его перед отправкой.

**Плюсы:** задержка доставки в миллисекунды вместо секунд, нет тысяч пустых запросов polling, двусторонний обмен для интерактивных сценариев, у SSE — авто-переподключение и простота.
**Минусы:** сложная надёжность (reconnect, heartbeat, resume, идемпотентность), отдельная инфраструктура и масштабирование долгих соединений, сложнее авторизация и отладка, риск заморозить UI потоком сообщений.

## Как это спрашивают на собеседовании

**Главный вывод:** транспорт выбирают по направленности — SSE для потока от сервера, WebSocket для двустороннего обмена. Дальше три группы решений: надёжность (backoff с jitter, heartbeat, resume по номеру события), производительность клиента (батчинг и коалесцирование вместо рендера на каждое сообщение) и согласованность (снапшот + дельты с идемпотентностью).

Типичные формулировки: «WebSocket или SSE — что выберете и почему?», «Как спроектировать биржевой терминал с тысячами обновлений в секунду?», «Что будет, если сервер перезапустится и 100 тысяч клиентов переподключатся одновременно?».

Что могут спросить следом:

- *Как авторизовать WebSocket?* — Браузер не даёт задать заголовки при рукопожатии, поэтому cookie с проверкой \`Origin\`, одноразовый короткий билет в query или токен первым сообщением; долгоживущий токен в URL — нет.
- *Почему SSE упирается в лимит соединений?* — В HTTP/1.1 браузер держит до шести соединений на сайт на все вкладки; в HTTP/2 потоки мультиплексируются в одном соединении.
- *Зачем jitter, если уже есть экспонента?* — Экспонента без случайности возвращает всех клиентов синхронными волнами; jitter размазывает их во времени.
- *Как не потерять сообщения при обрыве?* — Номер у каждого события, resume с последнего полученного (\`Last-Event-ID\` в SSE), а при дыре — новый снапшот.
- *Как не заморозить Angular?* — Буферизовать и коалесцировать, обновлять сигнал пачкой; в приложении на Zone.js держать сокет вне зоны.

### Ответ на 1 минуту

> Транспорт выбираю по направленности: SSE — односторонний поток поверх обычного HTTP с авто-переподключением и \`Last-Event-ID\`, идеален для лент и уведомлений; WebSocket — двусторонний канал для чата, совместного редактирования и торговли, но сложнее в инфраструктуре и авторизации. Дальше три группы решений. Надёжность: reconnect с экспоненциальным backoff и обязательным jitter, чтобы после сбоя не было thundering herd, heartbeat для обнаружения мёртвых соединений и resume по номеру последнего события. Производительность: сообщения не рендерю по одному, а батчу через \`bufferTime\` или раз в кадр и коалесцирую до последнего значения. Согласованность: снапшот через REST плюс дельты с проверкой номера, чтобы отбрасывать дубли и ловить дыры. Из нюансов: браузерный WebSocket не даёт задать заголовки, поэтому cookie с проверкой \`Origin\` или одноразовый билет, а в RxJS \`retry\` не ловит чистое закрытие сервером — нужен ещё \`repeat\`.`,
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
      ru: `## В чём суть

Offline-first — это архитектура, в которой **источником истины для интерфейса становится локальное хранилище, а сеть превращается просто в механизм синхронизации**. UI всегда читает из IndexedDB и всегда пишет в неё, а отправка на сервер — отдельный фоновый процесс. Оптимистичное обновление — это когда изменение показывается сразу, до ответа сервера, а при отказе аккуратно откатывается.

Аналогия: бухгалтерия в командировке. Вы не звоните в головной офис перед каждой записью — вы пишете в свой блокнот (локальное хранилище), а по возвращении переносите всё в общую базу по порядку (очередь синхронизации). Оптимистичное обновление — вы сразу считаете запись сделанной. Откат — в офисе говорят «эта операция не прошла», и вы вычёркиваете **именно эту строку**, а не вырываете из блокнота всю страницу, и сообщаете об этом.

**Какую проблему решает.** Обычное SPA устроено как «спросил сервер — дождался — показал». В метро, на складе с плохим Wi-Fi или в самолёте такое приложение показывает спиннер, а потом ошибку, и всё, что пользователь ввёл, теряется. Даже при хорошей сети каждое действие ждёт 200–500 мс ответа, и интерфейс ощущается вязким. Offline-first даёт мгновенный отклик и работу без сети, но взамен требует решить трудные вопросы: как не потерять изменения, как не отправить их дважды, что делать, если сервер отказал, и как разрешить конфликт, если ту же запись правили на двух устройствах.

## Словарик терминов

- **Offline-first** — подход, при котором приложение по умолчанию работает с локальными данными, а сеть считается приятным, но необязательным бонусом.
- **Источник истины (source of truth)** — место, откуда UI берёт данные. Здесь — локальное хранилище, а не ответ сервера.
- **Service Worker** — скрипт, который браузер запускает отдельно от страницы; перехватывает запросы и может отвечать из кэша, даже без сети.
- **App shell** — каркас приложения (HTML, JS, CSS), без которого оно не запустится; его кэширует Service Worker.
- **IndexedDB** — встроенная в браузер асинхронная база данных: хранилища объектов, индексы, транзакции.
- **Оптимистичное обновление (optimistic update)** — показать результат действия сразу, не дожидаясь подтверждения сервера.
- **Откат (rollback)** — отмена оптимистичного изменения, если сервер его отклонил.
- **Слой ожидающих изменений (pending layer)** — список неподтверждённых правок, который накладывается поверх подтверждённого состояния.
- **Outbox (исходящая очередь)** — локальная очередь изменений, которые ещё не доставлены на сервер.
- **Идемпотентность и ключ идемпотентности** — свойство операции давать тот же результат при повторе; ключ — уникальный \`id\` мутации, по которому сервер узнаёт повтор.
- **Background Sync API** — браузерный API, который будит Service Worker, когда появляется сеть, чтобы дослать очередь. Есть только в браузерах на Chromium.
- **\`navigator.onLine\`** — флаг «есть ли сетевое подключение». \`false\` надёжно означает «нет сети», а \`true\` — лишь «интерфейс подключён», но не «сервер доступен».
- **Конфликт** — одну и ту же запись изменили в двух местах, не видя изменений друг друга.
- **Last-write-wins (LWW)** — правило «побеждает последняя запись»: просто, но молча теряет чужие правки.
- **Оптимистичная блокировка через \`ETag\` / \`If-Match\`** — запись принимается, только если версия на сервере совпадает с той, что клиент видел; иначе \`412 Precondition Failed\`.
- **CRDT (Conflict-free Replicated Data Type)** — структура данных, у которой слияние любых копий в любом порядке даёт одинаковый результат без конфликтов.
- **Квота и вытеснение (eviction)** — лимит места под хранилища сайта и удаление браузером данных при нехватке места.

## Как это работает под капотом

Как устроено offline-first приложение по шагам:

1. **Service Worker кэширует app shell** по стратегии cache-first, поэтому приложение открывается вообще без сети — даже после перезагрузки.
2. **Данные лежат в IndexedDB, и UI читает из неё**, а не из сети напрямую. Это ключевое решение: интерфейс никогда не «ждёт сеть», он показывает то, что есть локально, и обновляется, когда приходят свежие данные.
3. **Любое изменение пользователя делает две вещи атомарно:** применяет правку к локальным данным (пользователь сразу видит результат) и кладёт мутацию в outbox с уникальным \`id\` и статусом \`pending\`.
4. **Отдельный sync-слой разбирает outbox по порядку**, когда есть сеть: при старте приложения, по событию \`online\`, по Background Sync там, где он поддерживается, и по таймеру с backoff (растущей паузой между попытками).
5. **Сервер обрабатывает мутацию идемпотентно** по её \`id\`: если ответ потерялся и клиент прислал её снова, сервер не выполняет её второй раз, а отвечает прежним результатом.
6. **Ответ сервера становится подтверждённым состоянием**, мутация удаляется из outbox. Если сервер отказал (валидация, нет прав, конфликт версий), откатывается **только эта мутация**, и пользователь получает понятное сообщение.
7. **Конфликты разрешаются выбранной стратегией**: LWW, проверка версии с экраном слияния или CRDT — решение принимается заранее, а не когда баг уже в проде.

### Пример 1. Наивный откат через снапшот — и почему он опасен

Классическая реализация из многих статей:

\`\`\`ts
async function optimisticUpdate(patch) {
  const prev = store.snapshot();         // снимок ВСЕГО состояния
  store.apply(patch);                    // мгновенно показать
  try { await api.save(patch); }
  catch { store.restore(prev); toast('Не удалось сохранить'); } // откат
}
\`\`\`

Для одной операции это работает. Но запустим две правки одного документа подряд: первая (переименование) упадёт через 50 мс, вторая (публикация) успеет сохраниться за 10 мс.

\`\`\`ts
// состояние: { title: 'Отчёт', status: 'draft' }
optimisticUpdate({ title: 'Отчёт Q3' });      // сервер ответит 500
optimisticUpdate({ status: 'published' });    // сервер ответит 200
// откат: { title: 'Отчёт Q3' }
// итог: { title: 'Отчёт', status: 'draft' }   ← публикация пропала из UI, хотя на сервере она есть
\`\`\`

Снимок первой операции был сделан **до** второй правки, поэтому его восстановление стёрло и чужое, уже подтверждённое изменение. Интерфейс теперь врёт: на сервере документ опубликован, а пользователь видит черновик. Глобальный снапшот безопасен, только если операции строго последовательны (например, кнопка блокируется до ответа).

### Пример 2. Правильный откат: подтверждённое состояние + слой ожидающих правок

Надёжнее хранить отдельно то, что подтвердил сервер, и список неподтверждённых правок, а то, что видит UI, вычислять. На сигналах Angular это несколько строк:

\`\`\`ts
import { signal, computed } from '@angular/core';

const confirmed = signal({ title: 'Отчёт', status: 'draft' });   // что подтвердил сервер
const pending = signal<{ id: number; patch: object }[]>([]);     // ещё не подтверждённые правки
const view = computed(() =>                                       // что видит UI
  pending().reduce((state, m) => ({ ...state, ...m.patch }), confirmed()));

let seq = 0;
async function optimisticUpdate(patch: object) {
  const m = { id: ++seq, patch };
  pending.update((list) => [...list, m]);                         // показать сразу
  try {
    const saved = await api.save(patch);
    confirmed.update((s) => ({ ...s, ...saved }));                // перенести в подтверждённое
  } catch {
    toast('Не удалось сохранить название');                        // сообщить пользователю
  } finally {
    pending.update((list) => list.filter((x) => x !== m));        // убрать только свою правку
  }
}

optimisticUpdate({ title: 'Отчёт Q3' });      // упадёт
optimisticUpdate({ status: 'published' });    // сохранится
// сразу: { title: 'Отчёт Q3', status: 'published' }
// итог:  { title: 'Отчёт', status: 'published' }   ← откатилось только название
\`\`\`

Почему это работает: откат — это просто удаление одной правки из слоя, и \`computed\` пересчитывает картину поверх актуального подтверждённого состояния. Так же устроены оптимистичные слои в Apollo Client: при ошибке мутации он снимает только её слой. Дополнительный бонус — UI легко показывает статус: если \`pending()\` не пуст, рядом с записью горит «сохраняется…».

### Пример 3. Outbox в IndexedDB с ключом идемпотентности

Очередь исходящих изменений должна пережить перезагрузку вкладки, поэтому она живёт в IndexedDB. Ключ хранилища \`seq\` с автоинкрементом задаёт порядок, а \`id\` из \`crypto.randomUUID()\` служит ключом идемпотентности.

\`\`\`ts
const req2p = (r) => new Promise((ok, fail) => { r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); });

const open = indexedDB.open('app', 1);
open.onupgradeneeded = () => open.result.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
const db = await req2p(open);
const store = (mode) => db.transaction('outbox', mode).objectStore('outbox');

async function enqueue(type, payload) {
  const mutation = { id: crypto.randomUUID(), type, payload, status: 'pending' };
  await req2p(store('readwrite').add(mutation));        // seq проставится сам и задаст порядок
}

let flushing = false;
async function flush() {
  if (flushing) return;                                 // не запускать два прогона параллельно
  flushing = true;
  try {
    const all = await req2p(store('readonly').getAll()); // getAll отдаёт записи в порядке seq
    for (const m of all) {
      try {
        await fetch(\`/api/\${m.type}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': m.id }, // тот же ключ при повторе
          body: JSON.stringify(m.payload),
        }).then((r) => { if (!r.ok) throw new Error(String(r.status)); });
        await req2p(store('readwrite').delete(m.seq));
        console.log('отправлено', m.type);
      } catch {
        console.log('сеть упала на', m.type, '— остановка, порядок сохранён');
        break;                                          // следующие не отправляем, чтобы не нарушить порядок
      }
    }
  } finally { flushing = false; }
}

await enqueue('createOrder', { sku: 'A1', qty: 2 });
await enqueue('addComment', { text: 'Позвоните перед доставкой' });
await flush();   // сервер заказ создал, но ответ потерялся по дороге
await flush();   // повтор с тем же ключом
// сеть упала на createOrder — остановка, порядок сохранён
// отправлено createOrder
// отправлено addComment
// итог: на сервере ровно один заказ, очередь пуста
\`\`\`

Проверено на \`fake-indexeddb\` с сервером, который запоминает обработанные ключи. Самый коварный случай — «запрос дошёл, ответ потерялся»: клиент не знает, создан ли заказ, и обязан повторить. Если бы при повторе генерировался новый \`id\`, сервер создал бы второй заказ. Заголовок \`Idempotency-Key\` — распространённое соглашение (так делает, например, Stripe), но сервер должен его поддерживать: хранить ключи и прежние ответы хотя бы сутки. В реальном коде различайте ошибки: сетевую — повторять с backoff, а бизнес-отказ \`4xx\` — не повторять вечно, а пометить мутацию \`failed\`, откатить её и показать пользователю.

### Пример 4. Порядок и уплотнение очереди

Порядок в очереди важен: «создать, потом удалить» и «удалить, потом создать» дают противоположный результат. Поэтому очередь отправляют строго последовательно, а перед отправкой её можно уплотнить:

\`\`\`ts
function compact(queue) {
  const result = [];
  for (const m of queue) {
    const i = result.findIndex((x) => x.entityId === m.entityId);
    const prev = result[i];
    if (!prev) { result.push(m); continue; }
    if (prev.op === 'create' && m.op === 'update') result[i] = { ...prev, data: { ...prev.data, ...m.data } };
    else if (prev.op === 'update' && m.op === 'update') result[i] = { ...prev, data: { ...prev.data, ...m.data } };
    else if (prev.op === 'create' && m.op === 'delete') result.splice(i, 1); // сервер о записи не знал
    else result.push(m);
  }
  return result;
}

compact([
  { op: 'create', entityId: 't1', data: { text: 'Купить молоко' } },
  { op: 'update', entityId: 't1', data: { done: true } },
  { op: 'create', entityId: 't2', data: { text: 'Позвонить' } },
  { op: 'delete', entityId: 't2' },
  { op: 'update', entityId: 't3', data: { text: 'A' } },
  { op: 'update', entityId: 't3', data: { text: 'B' } },
]);
// [ { op: 'create', entityId: 't1', data: { text: 'Купить молоко', done: true } },
//   { op: 'update', entityId: 't3', data: { text: 'B' } } ]
\`\`\`

Шесть мутаций превратились в две. Отдельная деталь: созданным офлайн записям нужен \`id\` **до** ответа сервера, иначе на них не сослаться из следующих мутаций. Поэтому \`id\` генерирует клиент (UUID), а сервер принимает его как есть.

### Background Sync и запасные триггеры синхронизации

Background Sync позволяет дослать очередь, даже если пользователь уже закрыл вкладку: браузер разбудит Service Worker, когда появится сеть.

\`\`\`ts
// в приложении: попросить синхронизацию, когда будет сеть
const reg = await navigator.serviceWorker.ready;
if ('sync' in reg) {
  await (reg as any).sync.register('flush-outbox');
} else {
  window.addEventListener('online', () => flush());   // запасной вариант для Firefox и Safari
}
\`\`\`

\`\`\`js
// sw.js
self.addEventListener('sync', (event) => {
  if (event.tag === 'flush-outbox') event.waitUntil(flushOutbox()); // браузер повторит, если промис упадёт
});
\`\`\`

Background Sync есть только в браузерах на Chromium (Chrome, Edge и подобные), в Firefox и Safari его нет. Поэтому он не может быть единственным механизмом: синхронизацию запускают ещё при старте приложения, по событию \`online\`, при возврате на вкладку (\`visibilitychange\`) и по таймеру с backoff. А на \`navigator.onLine === true\` не полагаются: это значит только «есть сетевой интерфейс». Подключённый Wi-Fi без интернета или страница авторизации в отеле тоже дают \`true\`. Настоящий признак сети — успешный запрос.

В Angular-приложении Service Worker генерирует \`@angular/service-worker\`, и своих обработчиков в него не добавить напрямую. Обычный приём — свой файл-обёртка, который подключает Angular SW и добавляет обработчик \`sync\`, и регистрация этого файла через \`provideServiceWorker('custom-sw.js')\`:

\`\`\`js
// custom-sw.js (кладётся в assets сборки)
importScripts('./ngsw-worker.js');          // всё кэширование Angular остаётся как было
self.addEventListener('sync', (event) => {
  if (event.tag === 'flush-outbox') event.waitUntil(flushOutbox());
});
\`\`\`

### Пример 5. Конфликты: версия через \`If-Match\` и ответ 412

Два устройства прочитали документ версии \`v3\`, и оба отправляют правку. Сервер принимает запись, только если \`If-Match\` совпадает с текущим \`ETag\`:

\`\`\`js
// сервер (фрагмент)
if (req.headers['if-match'] !== \`"v\${doc.version}"\`) { res.writeHead(412); return res.end(); }
doc = { ...newData, version: doc.version + 1 };
res.writeHead(200, { ETag: \`"v\${doc.version}"\` });

// клиенты: оба отправляют If-Match: "v3"
// ноутбук: 200 "v4"
// телефон: 412          ← версия устарела, правка не принята
\`\`\`

Получив \`412 Precondition Failed\`, клиент не перезаписывает чужие изменения молча. Он загружает актуальную версию и либо сливает правки автоматически (если менялись разные поля), либо показывает экран «ваша версия / версия на сервере». Это и есть ответ на вопрос «два устройства правили одну запись».

### Стратегии разрешения конфликтов

\`\`\`ts
// LWW: побеждает запись с большей меткой времени
const lww = (a, b) => (b.ts > a.ts ? b : a);
lww({ value: 'ноутбук', ts: 1000 }, { value: 'телефон', ts: 1005 }).value; // 'телефон'

// G-Counter (простейший CRDT): у каждого устройства свой счётчик, слияние — максимум по каждому
const merge = (a, b) => { const r = { ...a }; for (const k in b) r[k] = Math.max(r[k] ?? 0, b[k]); return r; };
const total = (c) => Object.values(c).reduce((s, v) => s + v, 0);
const laptop = { laptop: 2 };   // офлайн: +2 лайка на ноутбуке
const phone = { phone: 3 };     // офлайн: +3 на телефоне
total(merge(laptop, phone));    // 5
total(merge(phone, laptop));    // 5 — порядок слияния не важен
\`\`\`

- **LWW** — проще всего, но правка ноутбука просто исчезла. Плюс часы устройств расходятся, поэтому метки времени лучше брать с сервера или использовать номер версии.
- **Проверка версии (\`ETag\`/\`If-Match\`, поле \`version\`)** — ничего не теряется молча, но нужен сценарий слияния и иногда — экран для пользователя.
- **CRDT** — слияние без конфликтов и без потерь в любом порядке (обе правки дали 5). Цена — сложность и объём метаданных; оправдано в совместном редактировании, где обычно берут готовые библиотеки вроде Yjs или Automerge.

### Где это применяется на практике

- **Приложения для полевых сотрудников и складов**: инвентаризация, приёмка товара, акты осмотра — работают в подвалах и на трассе, синхронизируются при появлении связи.
- **Формы и черновики в корпоративных системах**: длинная анкета или отчёт сохраняется в IndexedDB при каждом изменении и не теряется при обрыве или случайном закрытии вкладки.
- **Списки задач, заметки, CRM**: мгновенная отметка «выполнено», лайк, смена статуса через оптимистичное обновление с откатом конкретной правки.
- **Большие таблицы с инлайн-редактированием**: ячейка сразу показывает новое значение с индикатором «сохраняется», а при отказе сервера возвращается только она.
- **Совместное редактирование** (документы, доски): CRDT, синхронизация поверх WebSocket и локальная копия в IndexedDB.

## Важные нюансы и подводные камни

- **Оптимистичный апдейт без отката.** Пользователь видит сохранённые данные, которых на сервере нет. Самая болезненная категория багов доверия.
- **Откат через глобальный снапшот.** При параллельных операциях восстановление старого снимка стирает чужие, уже подтверждённые изменения. Откатывайте конкретную правку, а не всё состояние.
- **Очередь без идемпотентности.** Повтор после таймаута создаёт второй платёж, хотя первый прошёл. Ключ мутации генерируется один раз и не меняется между попытками.
- **Нечестный UX.** Если интерфейс не отличает «сохранено локально» от «подтверждено сервером», пользователь узнает правду в самый неподходящий момент. Нужны статусы «синхронизируется», «не сохранено», «конфликт».
- **Молчаливый откат.** Отменить изменение без уведомления хуже, чем показать ошибку: пользователь уверен, что всё сохранено.
- **Бесконечный повтор бизнес-ошибки.** \`400\` или \`403\` от сервера не исправятся повтором; такая мутация блокирует всю очередь. Помечайте её \`failed\` и идите дальше или просите пользователя решить.
- **Background Sync — не везде.** Только Chromium; без запасных триггеров в Safari и Firefox очередь будет ждать до следующего открытия приложения.
- **\`navigator.onLine\` врёт в сторону оптимизма.** \`true\` не значит, что сервер доступен.
- **Раздувание IndexedDB без чистки.** Квота кончается, запись падает, и приложение внезапно перестаёт работать офлайн. Чистите подтверждённые данные, следите за \`navigator.storage.estimate()\` и просите \`navigator.storage.persist()\`.
- **Браузер может стереть данные.** При нехватке места или, в Safari, у сайта, с которым давно не взаимодействовали, хранилища могут быть очищены. Неотправленный outbox — самое ценное, что есть у клиента; держите его маленьким и синхронизируйте как можно раньше.
- **Две вкладки — два отправителя.** Если каждая вкладка запускает \`flush\`, одна мутация может уйти дважды. Идемпотентность спасает от дублей, а Web Locks API (\`navigator.locks.request\`) позволяет выбрать одного отправителя.
- **Тестирование только happy path.** Сетевые сбои, частичная синхронизация, конфликт версий — именно там живут баги offline-first. Тестируйте с офлайн-режимом DevTools и в e2e (например, \`context.setOffline(true)\` в Playwright).
- **Изменение схемы данных.** Новая версия приложения должна уметь прочитать старые записи и старые мутации из outbox — для этого есть миграции в \`onupgradeneeded\`.

**Плюсы:** мгновенный отклик интерфейса, работа без сети, устойчивость к плохой связи, ввод пользователя не теряется.
**Минусы:** заметно сложнее архитектура (очередь, идемпотентность, конфликты, миграции локальной схемы), нужна поддержка на сервере, сложное тестирование, риск рассинхрона и квоты хранилища.

## Как это спрашивают на собеседовании

**Главный вывод:** в offline-first UI читает и пишет локальное хранилище, а сеть только синхронизирует: изменения идут в outbox в IndexedDB и доставляются по порядку с идемпотентными ключами. Оптимистичное обновление откатывает конкретную правку (слой неподтверждённых изменений), а не восстанавливает глобальный снимок, и всегда сообщает пользователю об откате.

Типичные формулировки: «Как сделать, чтобы приложение работало без интернета?», «Как реализовать оптимистичное обновление с откатом?», «Что будет, если запрос дошёл, а ответ потерялся?», «Как решать конфликты при синхронизации?».

Что могут спросить следом:

- *Как решаете конфликт, если два устройства правили одну запись?* — Версия или \`ETag\` с \`If-Match\`: устаревшая запись получает \`412\`, затем автоматическое слияние по полям или явный экран разрешения; для совместного редактирования — CRDT.
- *Почему важен порядок в очереди?* — «Создать, потом удалить» и «удалить, потом создать» дают разный результат, а следующие мутации ссылаются на результат предыдущих; поэтому отправка последовательная.
- *Что такое ключ идемпотентности?* — Уникальный \`id\` мутации, сгенерированный один раз; по нему сервер распознаёт повтор и не выполняет операцию дважды.
- *Можно ли положиться на Background Sync?* — Нет: он есть только в Chromium, нужны запасные триггеры — старт приложения, \`online\`, \`visibilitychange\`, таймер.
- *Где хранить данные?* — В IndexedDB: она асинхронная, вмещает много и хранит объекты; localStorage синхронный, маленький и только для строк.

### Ответ на 1 минуту

> Принцип offline-first: локальное хранилище — источник истины для UI, а сеть только синхронизирует. Service Worker кэширует app shell по cache-first, чтобы приложение стартовало без сети, данные лежат в IndexedDB, и интерфейс читает оттуда. Каждое изменение я применяю локально и кладу в outbox в IndexedDB с уникальным ключом идемпотентности, а sync-слой отправляет очередь по порядку с backoff — при старте, по событию \`online\` и через Background Sync там, где он есть, то есть только в Chromium. Оптимистичное обновление делаю через подтверждённое состояние плюс слой неподтверждённых правок: при ошибке убираю только свою правку и показываю уведомление — глобальный снапшот при параллельных операциях стёр бы чужие изменения. Конфликты решаю осознанно: LWW прост, но теряет данные, версия через \`If-Match\` и ответ 412 даёт слить правки, CRDT — для совместного редактирования. И обязательно честный статус «сохраняется» или «не сохранено».`,
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
      ru: `## В чём суть

В схеме с обновлением есть **два токена с разными ролями**. Access-токен — короткий пропуск на 5–15 минут: лежит в памяти и уходит в каждом запросе к API. Refresh-токен — долгий: лежит в httpOnly-cookie, недоступной JavaScript, и нужен только чтобы получить новый access. Задача фронтенда — незаметно обновлять access, по возможности **до** того, как пользователь упрётся в 401, и правильно обработать 401, если это всё-таки случилось.

Аналогия: пропуск в бизнес-центре. Access — бумажный талон на 15 минут, его не жалко: украли — через четверть часа он бесполезен. Refresh — ваша именная карта во внутреннем кармане, по ней на ресепшене выдают новый талон. И карту при каждом обмене меняют на новую (ротация): если кто-то пришёл со старой картой, значит, её украли, и охрана блокирует всё.

**Какую проблему решает.** Один долгоживущий токен — это компромисс без хороших вариантов: короткий заставляет пользователя логиниться каждые 15 минут, длинный в случае кражи работает у злоумышленника неделями. Пара токенов разделяет задачи: то, что ходит в каждом запросе и рискует утечь, живёт минуты; то, что живёт долго, спрятано от JavaScript и предъявляется только одному эндпоинту. Но наивная реализация на фронтенде ломается сразу: пять параллельных запросов получают 401 и запускают пять обновлений, с ротацией это мгновенный разлогин, а ошибка в интерсепторе даёт бесконечный цикл.

## Словарик терминов

- **Аутентификация** — проверка, кто вы. **Авторизация** — проверка, что вам можно.
- **Access-токен** — короткоживущий токен, который клиент прикладывает к запросам к API в заголовке \`Authorization: Bearer <token>\`.
- **Refresh-токен** — долгоживущий токен, которым можно получить новый access-токен на специальном эндпоинте.
- **JWT (JSON Web Token)** — формат токена из трёх частей через точку: заголовок, полезная нагрузка (claims) и подпись, всё в base64url.
- **Claim \`exp\`** — поле JWT «истекает в», в секундах от 1 января 1970 года (Unix time).
- **401 Unauthorized** — сервер не принял учётные данные (токен истёк или неверен). Не путать с **403 Forbidden** — «знаю, кто вы, но нельзя».
- **Интерсептор (\`HttpInterceptorFn\`)** — функция Angular, через которую проходит каждый запрос \`HttpClient\`: может изменить запрос, обработать ответ и ошибку.
- **\`HttpContextToken\`** — типизированный флажок, который едет вместе с запросом и виден интерсепторам.
- **httpOnly-cookie** — cookie, которую браузер отправляет сам, но JavaScript прочитать не может; XSS её не украдёт.
- **\`Secure\` и \`SameSite\`** — атрибуты cookie: отправлять только по HTTPS / не отправлять (или ограниченно отправлять) с запросами, пришедшими с чужого сайта.
- **\`withCredentials\`** — флаг запроса «отправь cookie и прими \`Set-Cookie\`», нужен для запросов на другой домен.
- **XSS (межсайтовый скриптинг)** — чужой JavaScript выполняется на вашей странице и может читать всё, что доступно JS: localStorage, переменные, DOM.
- **CSRF (подделка межсайтового запроса)** — чужой сайт заставляет браузер отправить запрос к вам, и браузер сам прикладывает ваши cookie.
- **Single-flight** — приём «один запрос на всех»: первый вызывающий запускает операцию, остальные ждут её результат.
- **\`shareReplay\`** — оператор RxJS, который делит одну подписку на источник между всеми подписчиками и повторяет последнее значение опоздавшим.
- **Silent renewal (тихое обновление)** — обновление access-токена заранее, без участия пользователя.
- **OIDC (OpenID Connect)** — надстройка над OAuth 2.0 для входа пользователей; в ней описан и тихий вход через скрытый iframe с \`prompt=none\`.
- **Ротация refresh-токенов (rotation)** — каждый обмен выдаёт новый refresh-токен, а старый становится недействительным.
- **Обнаружение повторного использования (reuse detection)** — если пришёл уже использованный refresh-токен, сервер считает его украденным и отзывает всю сессию.
- **Ревокация (revocation)** — отзыв токена на сервере, после которого он перестаёт работать досрочно.
- **\`BroadcastChannel\`** — API для сообщений между вкладками одного сайта.
- **Web Locks API (\`navigator.locks\`)** — браузерные блокировки, общие для всех вкладок сайта: «этот код выполняет только одна вкладка за раз».

## Как это работает под капотом

Схема по шагам:

1. **Логин.** Сервер отвечает access-токеном в теле JSON и ставит refresh-токен через \`Set-Cookie\` с атрибутами \`HttpOnly; Secure; SameSite\`. Поэтому JavaScript видит только access, а refresh браузер хранит и отправляет сам.
2. **Access хранится в памяти** — в сигнале или поле сервиса, а не в localStorage: localStorage читается любым XSS-скриптом, а память вкладки исчезает при перезагрузке и недоступна другим сайтам.
3. **Каждый запрос к своему API** проходит через интерсептор, который добавляет \`Authorization: Bearer <access>\`.
4. **Реактивный сценарий:** пришёл \`401\` → интерсептор вызывает \`POST /auth/refresh\` (cookie уходит автоматически) → получает новый access → повторяет исходный запрос **один раз**.
5. **Проблема одновременных 401:** при загрузке дашборда десять запросов получают 401 почти одновременно. Поэтому refresh делается single-flight: первый запускает обновление, остальные подписываются на тот же результат.
6. **Проактивный сценарий (silent renewal):** по \`exp\` access-токена ставится таймер, и обновление происходит за минуту до истечения — пользователь вообще не встречает 401.
7. **Ротация:** каждый refresh выдаёт новый refresh-токен и инвалидирует старый. Украденный одноразовый токен бесполезен, а **повторное предъявление старого — сигнал компрометации**, и сервер убивает всю сессию.
8. **CSRF:** раз refresh лежит в cookie, эндпоинт обновления надо защитить: \`SameSite\`, проверка \`Origin\` и/или CSRF-токен (double-submit).
9. **Перезагрузка страницы:** access из памяти пропал — это нормально; при старте приложение тихо вызывает refresh по cookie и восстанавливает сессию.
10. **Logout** — три шага: ревокация refresh на сервере, очистка cookie (\`Set-Cookie\` с истёкшим сроком) и сброс access из памяти. Плюс оповещение остальных вкладок. Иначе выход только «визуальный».

### Пример 1. Где хранить токены

\`\`\`text
Set-Cookie: refresh_token=8f3c...e1; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh; Max-Age=1209600
\`\`\`

- \`HttpOnly\` — JavaScript cookie не видит, XSS её не прочитает.
- \`Secure\` — только по HTTPS.
- \`SameSite=Strict\` — браузер не приложит cookie к запросу, инициированному чужим сайтом.
- \`Path=/auth/refresh\` — cookie уходит **только** на эндпоинт обновления, а не с каждым запросом к API. Меньше мест, где она может «засветиться».
- \`Max-Age=1209600\` — 14 дней жизни сессии.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly accessToken = signal<string | null>(null);  // только память вкладки
  readonly isLoggedIn = computed(() => this.accessToken() !== null);
}
\`\`\`

Почему не localStorage: любой скрипт на странице — внедрённый через XSS или пришедший с заражённым npm-пакетом — выполнит \`localStorage.getItem('token')\` и отправит токен себе. Память тоже доступна XSS-скрипту, пока он работает на странице, но украсть оттуда **долгоживущий** секрет нельзя: refresh в httpOnly-cookie, а access умрёт через 15 минут. Это снижение ущерба, а не полная защита: от XSS защищают санитизация и CSP.

### Пример 2. Наивный интерсептор: шторм обновлений

\`\`\`ts
// ❌ каждый 401 запускает свой refresh
catchError((err) => err.status === 401
  ? auth.doRefresh().pipe(switchMap((t) => next(withToken(req, t))))
  : throwError(() => err))
\`\`\`

Дашборд с пятью виджетами открылся с истёкшим токеном → пять 401 → пять параллельных \`POST /auth/refresh\` с одной и той же cookie. Без ротации это просто лишняя нагрузка. С ротацией первый refresh выдаёт новый токен и гасит старый, а остальные четыре приходят со **старым** — сервер видит повторное использование, считает токен украденным и отзывает сессию. Пользователь вылетает на логин через секунду после открытия страницы.

### Пример 3. Ловушка: \`shareReplay\` в поле класса

Частый «фикс» — сделать общий поток обновления полем класса:

\`\`\`ts
// ❌ поток создаётся один раз на всю жизнь сервиса
private refresh$ = this.doRefresh().pipe(shareReplay(1));
\`\`\`

Первую волну 401 это действительно решает: один refresh на всех. Но \`shareReplay(1)\` **запоминает ответ навсегда**: источник уже завершился, и все следующие подписчики получают тот же старый токен без нового запроса. Проверено с \`HttpTestingController\`:

\`\`\`text
refresh-запросов в волне 1: 1
/api/a повтор с Bearer new1
/api/b повтор с Bearer new1
/api/c повтор с Bearer new1
--- через 15 минут токен снова истёк ---
refresh-запросов в волне 2: 0
/api/d повтор с Bearer new1      ← протухший токен из кэша shareReplay
/api/d error 401
\`\`\`

Общий поток должен жить ровно столько, сколько идёт одно обновление, и сбрасываться по его окончании. Классическая альтернатива \`shareReplay\` — «мьютекс» на флаге и \`BehaviorSubject\`: первый 401 ставит флаг \`isRefreshing\` и обнуляет Subject, остальные ждут через \`filter(Boolean)\` и \`take(1)\`, пока Subject не выдаст новый токен. Суть та же: одно обновление, все ждут его результат, и состояние сбрасывается после завершения.

### Пример 4. Правильный single-flight интерсептор

\`\`\`ts
import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, shareReplay, switchMap, tap, throwError } from 'rxjs';

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  readonly accessToken = signal<string | null>(null);
  private refreshInFlight$: Observable<string> | null = null;

  refresh(): Observable<string> {
    this.refreshInFlight$ ??= this.http
      .post<{ accessToken: string }>('/auth/refresh', null, {
        withCredentials: true,                            // refresh-cookie уйдёт сама
        context: new HttpContext().set(SKIP_AUTH, true),  // наш интерсептор этот запрос не трогает
      })
      .pipe(
        map((r) => r.accessToken),
        tap((token) => this.accessToken.set(token)),
        finalize(() => (this.refreshInFlight$ = null)),   // обновление закончилось — следующий будет новым
        shareReplay(1),                                   // все ждущие получают один и тот же результат
      );
    return this.refreshInFlight$;
  }

  logout(): void { this.accessToken.set(null); /* + запрос на ревокацию и переход на логин */ }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_AUTH) || !req.url.startsWith('/api/')) return next(req); // чужим доменам токен не шлём
  const auth = inject(AuthService);
  const withToken = (r: typeof req, token: string | null) =>
    token ? r.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } }) : r;

  return next(withToken(req, auth.accessToken())).pipe(
    catchError((err) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) return throwError(() => err);
      return auth.refresh().pipe(
        catchError((refreshErr) => { auth.logout(); return throwError(() => refreshErr); }), // refresh не удался
        switchMap((token) => next(withToken(req, token))),  // повтор ровно один раз
      );
    }),
  );
};
// app.config.ts: provideHttpClient(withInterceptors([authInterceptor]))
\`\`\`

Тот же тест, что и в примере 3:

\`\`\`text
refresh-запросов в волне 1: 1
/api/a повтор с Bearer new1
/api/b повтор с Bearer new1
/api/c повтор с Bearer new1
--- через 15 минут токен снова истёк ---
refresh-запросов в волне 2: 1
/api/d повтор с Bearer new2
--- refresh-cookie истекла, /auth/refresh ответил 401 ---
logout()
/api/e error 401
ещё refresh-запросов после отказа: 0
\`\`\`

Что здесь важно. \`??=\` создаёт поток, только если обновление сейчас не идёт. \`finalize\` стоит **до** \`shareReplay\`, поэтому срабатывает, когда завершился сам HTTP-запрос, и обнуляет поле. Запрос на refresh помечен \`SKIP_AUTH\` через \`HttpContextToken\` — иначе 401 от самого refresh снова запустил бы refresh, и получилась бы рекурсия. Повтор исходного запроса идёт через \`next\`, то есть **мимо** этого интерсептора: если он снова получит 401, второго обновления не будет — бесконечного цикла нет. И токен прикладывается только к своему API: интерсептор, который добавляет \`Authorization\` ко всем запросам подряд, отправит токен и на сторонние домены.

### Пример 5. Silent renewal по таймеру от \`exp\`

Чтобы пользователь не встречал 401 вовсе, access обновляют заранее. Для этого нужно прочитать \`exp\` из JWT. Полезная нагрузка — это base64url, и в ней может быть кириллица, поэтому простого \`atob\` мало:

\`\`\`ts
function decodeJwtPayload(jwt: string) {
  const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); // base64url → base64
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));                    // байты → UTF-8 строка
}

const payload = decodeJwtPayload(token);
console.log(payload);
// { sub: '42', name: 'Ада', exp: 1767225600, iat: 1767224700 }
console.log(payload.exp - payload.iat);
// 900 — токен живёт 15 минут; если прошла минута, обновлять через 13 минут (за минуту до exp)
\`\`\`

С одним \`JSON.parse(atob(...))\` вместо имени «Ада» получатся «кракозябры»: \`atob\` возвращает байты как символы Latin-1. Декодирование нужно только для планирования — **проверять подпись на клиенте бессмысленно**, это делает сервер.

Планировщик на RxJS: каждый новый токен перезапускает таймер благодаря \`switchMap\`.

\`\`\`ts
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, switchMap, timer } from 'rxjs';

// внутри конструктора AuthService (нужен контекст внедрения)

toObservable(this.accessToken).pipe(
  switchMap((token) => {
    if (!token) return EMPTY;
    const { exp } = decodeJwtPayload(token);
    const delay = Math.max(0, exp * 1000 - Date.now() - 60_000); // за минуту до истечения
    return timer(delay).pipe(switchMap(() => this.refresh()));   // тот же single-flight
  }),
  takeUntilDestroyed(),
).subscribe();
\`\`\`

Три тонкости. **Часы клиента врут**: если на компьютере время сдвинуто на 10 минут, расчёт от \`exp\` промахнётся; надёжнее считать от \`expires_in\` из ответа сервера относительно момента получения. **Фоновые вкладки** браузер «усыпляет», и таймер сработает позже — поэтому реактивная обработка 401 остаётся обязательной, а при возврате на вкладку (\`visibilitychange\`) стоит проверить срок. И **\`setTimeout\` не умеет ждать дольше примерно 24,8 суток** (2 147 483 647 мс): большее значение переполняется, и колбэк срабатывает сразу.

### Silent renew в OIDC: скрытый iframe

В классической OIDC-схеме тихое обновление делали так: в скрытом iframe открывали страницу авторизации провайдера с \`prompt=none\`. Если у провайдера жива сессия (его cookie), он сразу возвращает новый код или токен без показа формы. Проблема в том, что cookie провайдера в iframe на вашем сайте — это **сторонние (third-party) cookie**. Safari блокирует их по умолчанию, Firefox по умолчанию изолирует их по сайтам (iframe не видит обычную сессию провайдера), в Chrome это зависит от настроек пользователя и режима инкогнито. Итог: в части браузеров iframe-обновление молча не работает, и пользователя выкидывает на логин. Поэтому современный ответ — refresh-токен с ротацией (через httpOnly-cookie вашего бэкенда или BFF), а не iframe.

### Ротация и гонка между вкладками

Ротация защищает от кражи refresh-токена, но порождает гонку, о которой часто забывают. У каждой вкладки свой access в памяти и свой таймер. Две вкладки одновременно решили обновиться с одной и той же cookie: первая получила новый refresh, вторая пришла со старым — и сервер, увидев повторное использование, отозвал сессию. Решения:

\`\`\`ts
// только одна вкладка обновляет токен; остальные ждут и берут результат
await navigator.locks.request('auth-refresh', async () => {
  if (tokenStillFresh()) return;                 // другая вкладка уже обновила — ничего не делаем
  await firstValueFrom(auth.refresh());
});
\`\`\`

- **Web Locks API** сериализует обновление между вкладками, а новым access вкладка-победитель делится через \`BroadcastChannel\`.
- **Окно терпимости на сервере**: некоторые провайдеры позволяют настроить короткий период, в течение которого только что заменённый refresh-токен ещё принимается и не считается кражей.

### Восстановление сессии после перезагрузки

\`\`\`ts
// app.config.ts
provideAppInitializer(() =>
  inject(AuthService).refresh().pipe(catchError(() => of(null))), // нет cookie — просто гость
),
\`\`\`

При старте приложение один раз вызывает refresh: cookie жива — получаем access и пользователь «внутри», cookie нет — показываем экран входа. Пользователь не замечает, что access хранился только в памяти.

### CSRF и logout

Refresh в cookie означает, что браузер приложит её к любому запросу на \`/auth/refresh\`, в том числе инициированному чужим сайтом. От кражи токена это не страшно (ответ чужой сайт не прочитает из-за CORS), но эндпоинты, которые **меняют состояние** по cookie, надо защитить: \`SameSite=Strict\` или \`Lax\`, проверка заголовка \`Origin\` на сервере и CSRF-токен по схеме double-submit (сервер кладёт токен в обычную cookie, клиент копирует его в заголовок, сервер сверяет). В Angular последнее встроено: \`HttpClient\` читает cookie \`XSRF-TOKEN\` и добавляет заголовок \`X-XSRF-TOKEN\` к изменяющим запросам (не \`GET\` и не \`HEAD\`) на свой же origin; имена настраиваются через \`withXsrfConfiguration\`.

\`\`\`ts
logout(): void {
  this.http.post('/auth/logout', null, { withCredentials: true, context: new HttpContext().set(SKIP_AUTH, true) })
    .subscribe();                                       // сервер отзывает refresh и стирает cookie
  this.accessToken.set(null);                           // сброс из памяти
  new BroadcastChannel('auth').postMessage('logout');   // остальные вкладки тоже выходят
}
\`\`\`

### Где это применяется на практике

- **Корпоративные SPA с SSO** (Keycloak, Azure AD, Okta): access в памяти, refresh через бэкенд или BFF в httpOnly-cookie, интерсептор с single-flight.
- **Дашборды с десятками параллельных запросов**: без single-flight первая же загрузка с истёкшим токеном запускает шторм обновлений.
- **Финтех и банкинг**: короткий access (5 минут), ротация refresh с reuse detection, logout во всех вкладках и на всех устройствах.
- **Долгоживущие вкладки** (мониторинг, трейдинг): проактивное обновление по таймеру плюс проверка при возврате на вкладку.
- **Приложения с WebSocket**: перед истечением access сокет получает новый токен или переподключается с ним.

## Важные нюансы и подводные камни

- **Токены в localStorage.** Любой XSS — и сессия угнана. Классический вопрос-ловушка на собеседовании.
- **Гонки refresh без single-flight.** Шторм запросов, а с ротацией ещё и мгновенный разлогин, потому что второй refresh приходит со старым токеном.
- **\`shareReplay\` в поле класса.** Первую волну 401 решает, а дальше вечно отдаёт старый токен. Общий поток должен сбрасываться после завершения (\`finalize\` + \`??=\`).
- **Бесконечный retry-цикл.** Если сервер стабильно отдаёт 401, интерсептор будет обновлять и повторять вечно. Повторяйте исходный запрос ровно один раз, а при отказе refresh — выход на логин.
- **Refresh-запрос через тот же интерсептор.** 401 на refresh запускает refresh, и получается рекурсия. Исключайте его явно — лучше флагом \`HttpContextToken\`, чем сравнением URL.
- **Токен утекает на чужие домены.** Интерсептор добавляет \`Authorization\` ко всем запросам, включая CDN и сторонние API. Проверяйте адрес назначения.
- **Обновление на 403.** 403 означает «нет прав», новый токен его не исправит; refresh — только на 401.
- **Логаут только в одной вкладке.** Синхронизируйте через \`BroadcastChannel\` или событие \`storage\`, иначе в соседней вкладке пользователь всё ещё «внутри».
- **Гонка вкладок при ротации.** Две вкладки обновляются одновременно — одна из них предъявляет уже погашенный токен и рвёт сессию. Web Locks или окно терпимости на сервере.
- **Таймер от \`exp\` по часам клиента.** Сдвинутые часы, усыплённые фоновые вкладки и переполнение \`setTimeout\` после ~24,8 суток. Реактивная обработка 401 нужна всегда.
- **Silent renew в iframe.** Ломается там, где сторонние cookie блокируются или изолируются (по умолчанию в Safari и Firefox).
- **httpOnly не защищает от CSRF.** Она закрывает чтение токена через XSS, а CSRF закрывают \`SameSite\`, проверка \`Origin\` и CSRF-токен.
- **Logout без ревокации.** Если сервер не отозвал refresh, украденная cookie продолжает работать до истечения срока.

**Плюсы:** короткое окно для украденного access, долгий секрет недоступен JavaScript, пользователь не логинится каждые 15 минут, ротация позволяет обнаружить кражу.
**Минусы:** заметная сложность на клиенте (single-flight, таймеры, вкладки), нужна защита от CSRF для cookie-эндпоинтов, гонки при ротации, зависимость от поведения браузеров с cookie.

## Как это спрашивают на собеседовании

**Главный вывод:** access — короткий и в памяти, refresh — долгий в httpOnly Secure SameSite-cookie с ротацией. Интерсептор на 401 делает одно общее обновление на все упавшие запросы (single-flight, который сбрасывается после завершения) и повторяет каждый запрос один раз, а проактивный таймер от \`exp\` обновляет токен до истечения.

Типичные формулировки: «Как реализовать refresh token в Angular?», «Что будет, если пять запросов одновременно получат 401?», «Где хранить JWT на фронтенде?», «Как сделать, чтобы пользователя не выкидывало каждые 15 минут?».

Что могут спросить следом:

- *Почему access в памяти пропадает при перезагрузке и это нормально?* — При старте приложение тихо вызывает refresh по httpOnly-cookie и восстанавливает access.
- *Чем httpOnly-cookie лучше localStorage, если от CSRF она не защищает?* — Она закрывает кражу токена через XSS, а CSRF закрывается отдельно: \`SameSite\`, проверка \`Origin\`, CSRF-токен.
- *Как избежать рекурсии в интерсепторе?* — Помечать запрос refresh через \`HttpContextToken\` и пропускать его, а исходный запрос повторять через \`next\` один раз.
- *Что такое reuse detection?* — Повторное предъявление уже использованного refresh-токена сервер считает кражей и отзывает всю цепочку сессии.
- *Как синхронизировать вкладки?* — Logout и новые токены через \`BroadcastChannel\`, само обновление — под Web Locks, чтобы его выполняла одна вкладка.

### Ответ на 1 минуту

> Access-токен делаю короткоживущим, на 5–15 минут, и храню в памяти — в localStorage его украдёт любой XSS. Refresh-токен долгоживущий и лежит в httpOnly Secure SameSite-cookie с \`Path\` только на эндпоинт обновления. Реактивная схема: на 401 функциональный интерсептор вызывает refresh и повторяет исходный запрос один раз. Ключевая деталь — одновременные 401: делаю single-flight, общий поток с \`shareReplay\`, который сбрасывается в \`finalize\` после завершения; если положить его в поле класса навсегда, он вечно будет отдавать старый токен. Сам refresh помечаю через \`HttpContextToken\`, чтобы не было рекурсии. Плюс silent renewal — таймер от \`exp\` за минуту до истечения, а при перезагрузке тихий refresh по cookie. По безопасности — ротация refresh с обнаружением повторного использования, Web Locks против гонки вкладок, CSRF-защита cookie-эндпоинтов и logout с ревокацией на сервере и оповещением вкладок через \`BroadcastChannel\`.`,
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
      ru: `## В чём суть

Нужно написать функцию-обёртку \`debounce(fn, wait, options)\`. Она возвращает новую функцию, которую можно дёргать сколько угодно часто, а настоящая \`fn\` выполнится только тогда, когда вызовы **затихнут** на \`wait\` миллисекунд. Плюс два режима — \`trailing\` (вызов в конце серии, по умолчанию) и \`leading\` (вызов в начале серии) — и метод \`cancel()\`, отменяющий отложенный вызов. На деле задача проверяет не знание слова «debounce», а умение работать с замыканиями, таймерами, \`this\` и пограничными случаями.

Аналогия: автоматические двери лифта. Пока люди заходят, двери каждый раз начинают отсчёт заново и закрываются, только когда три секунды никто не входил, — это trailing. Leading — лифт, который трогается с первым же пассажиром, а следующих не замечает, пока поток людей не иссякнет. Throttle, для сравнения, — двери по расписанию: закрываются каждые пять секунд, сколько бы людей ни шло.

**Какую проблему решает.** Многие события в браузере идут пачками: \`input\` срабатывает на каждую букву, \`resize\` и \`scroll\` — десятки раз в секунду. Если на каждое событие отправлять запрос или пересчитывать раскладку, то при наборе слова «angular» уйдёт семь запросов вместо одного, ответы могут прийти не в том порядке, а сервер получит в семь раз больше нагрузки. Debounce превращает пачку событий в один вызов с финальным значением.

## Словарик терминов

- **Debounce («подавление дребезга»)** — приём, при котором функция вызывается один раз после того, как поток вызовов затих на заданное время. Термин из электроники: так гасят «дребезг» контактов кнопки.
- **\`wait\` (интервал тишины)** — сколько миллисекунд без новых вызовов нужно выждать, прежде чем выполнить функцию.
- **Всплеск (burst)** — серия вызовов, идущих чаще, чем раз в \`wait\`: например, буквы, набираемые подряд.
- **Trailing edge (задний фронт)** — вызов в конце всплеска, после паузы. Режим по умолчанию.
- **Leading edge (передний фронт)** — вызов сразу на первом событии всплеска; остальные события этого всплеска игнорируются.
- **\`setTimeout\` / \`clearTimeout\`** — функции таймера: первая планирует вызов через N мс и возвращает идентификатор, вторая отменяет запланированный вызов по этому идентификатору.
- **Замыкание (closure)** — способность функции помнить переменные того места, где она создана. В замыкании живут \`timer\` и \`lastArgs\` между вызовами.
- **\`this\` (контекст вызова)** — объект, «на котором» вызвана функция: в \`panel.save()\` это \`panel\`. Теряется, если функцию вызвать «голой».
- **\`fn.apply(ctx, args)\`** — вызвать \`fn\` с явно заданным \`this\` = \`ctx\` и массивом аргументов \`args\`.
- **\`cancel()\`** — метод, который отменяет запланированный вызов и забывает накопленные аргументы.
- **\`flush()\`** — метод (есть в lodash), который выполняет отложенный вызов немедленно, не дожидаясь паузы.
- **\`maxWait\`** — опция lodash: максимальное время, которое вызов может откладываться, даже если всплеск не кончается.
- **Throttle (троттлинг)** — родственный приём: вызывать не чаще раза в \`wait\`, но регулярно, прямо во время всплеска.
- **\`debounceTime\`** — оператор RxJS, который делает debounce для потока значений (Observable).
- **Big-O, \`O(1)\`** — оценка того, как растут время и память с ростом входа; \`O(1)\` значит «не растут вообще, константа».

## Как это работает под капотом

### Уточняющие вопросы перед кодом

Прежде чем писать, задайте интервьюеру несколько вопросов. Это показывает инженерное мышление и избавляет от переписывания на середине:

- Какие режимы нужны и что по умолчанию? Разумный ответ — как в lodash: \`leading: false\`, \`trailing: true\`.
- Если включены оба режима, а вызов был всего один, — выполнять функцию один раз или два? Правильно — один.
- С какими аргументами вызывать в trailing — с первыми или с последними? С последними: нам нужно финальное значение.
- Нужно ли возвращать результат \`fn\`? Обычно нет: вызов отложен, и в момент обращения результата ещё не существует.
- Нужны ли \`cancel\`, \`flush\`, \`maxWait\`? В этой задаче просят \`cancel\`, остальное можно назвать как расширения.

### Идея алгоритма простыми словами

1. При каждом вызове запоминаем последние аргументы и \`this\`, потому что сработать должен именно последний вызов.
2. Если таймер уже тикает, отменяем его и заводим новый на \`wait\` мс — поэтому каждый новый вызов «отодвигает» срабатывание.
3. Если до конца отсчёта никто не позвонил, таймер срабатывает — значит, наступила пауза, и мы вызываем \`fn\` с сохранёнными аргументами (trailing).
4. Для leading смотрим на таймер: \`timer === null\` означает «это первый вызов нового всплеска», поэтому вызываем \`fn\` сразу.
5. Если всплеск состоял из одного leading-вызова, в конце паузы вызывать \`fn\` нельзя — иначе одна и та же функция сработает дважды.
6. \`cancel()\` останавливает таймер и стирает аргументы, поэтому после него отложенного вызова уже не будет.

Решение удобно строить по шагам: сначала минимальная рабочая версия, потом исправляем её дефекты один за другим. Во всех примерах ниже \`wait = 300\`, а время \`t\` отсчитывается от первого вызова.

### Шаг 1. Наивная версия: только trailing

\`\`\`js
function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);                         // сбросили предыдущий отсчёт
    timer = setTimeout(() => fn(...args), wait); // начали новый
  };
}

const search = debounce(q => console.log(q), 300);
search('a');   // t=0
search('an');  // t=100
search('ang'); // t=200
// t=500: ang
\`\`\`

Каждый вызов убивает таймер предыдущего, поэтому выживает только последний, и через 300 мс тишины печатается \`ang\`. Аргументы при этом последние «бесплатно»: каждый вызов создаёт свой колбэк таймера со своими \`args\`. Но у версии есть дефект — потерянный \`this\`:

\`\`\`js
const panel = {
  items: [],
  add(x) { this.items.push(x); },
};
panel.addLater = debounce(panel.add, 300);
panel.addLater('x');
// через 300 мс: TypeError: Cannot read properties of undefined (reading 'items')
\`\`\`

Внутри таймера \`fn(...args)\` вызывается «голой» функцией, а в строгом режиме (он включён в модулях и классах) у такой функции \`this === undefined\`. К тому же обёртка — стрелочная функция, и своего \`this\` у неё нет вовсе.

### Шаг 2. Сохраняем \`this\` и последние аргументы

\`\`\`js
function debounce(fn, wait) {
  let timer = null;
  return function (...args) {          // обычная функция: получает свой this
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait); // стрелка берёт this снаружи
  };
}

panel.addLater = debounce(panel.add, 300);
panel.addLater('x');
// через 300 мс: panel.items = ['x']
\`\`\`

Обёртка теперь обычная \`function\`, и при вызове \`panel.addLater('x')\` её \`this\` равен \`panel\`. Стрелка внутри \`setTimeout\` своего \`this\` не имеет и берёт его у обёртки, а \`fn.apply(this, args)\` передаёт его в оригинал.

Для контраста — частая ошибка «устаревших аргументов». Её пишут, когда путают debounce с «не запускать, пока ждём»:

\`\`\`js
// ❌ таймер не перезапускается, новые аргументы выбрасываются
return function (...args) {
  if (timer) return;
  timer = setTimeout(() => { timer = null; fn.apply(this, args); }, wait);
};
// вызовы 'a' (t=0), 'an' (t=100), 'ang' (t=200)
// t=300: a   ← первая буква вместо финального слова, и пауза не дождалась
\`\`\`

### Шаг 3. Добавляем leading — и ловим двойной вызов

Первая попытка: если таймера нет, значит, всплеск только начался — вызываем сразу.

\`\`\`js
function debounce(fn, wait, { leading = false, trailing = true } = {}) {
  let timer = null;
  return function (...args) {
    const callNow = leading && timer === null; // первый вызов всплеска?
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (trailing) fn.apply(this, args);       // ❌ не проверяем, был ли leading
    }, wait);
    if (callNow) fn.apply(this, args);
  };
}

const d = debounce(q => console.log(q), 300, { leading: true, trailing: true });
d('a');
// t=0:   a
// t=300: a   ← тот же вызов второй раз
\`\`\`

Одиночный вызов сработал дважды: сначала как leading, потом как trailing. Если бы так отправлялась форма оплаты, пользователь заплатил бы два раза. Исправление — в trailing вызывать \`fn\` только тогда, когда последний вызов **не** был leading-вызовом, то есть добавить условие \`!callNow\`.

### Шаг 4. Финальная версия с \`cancel\`

Это и есть код из сниппета под ответом, с пояснениями:

\`\`\`ts
interface DebounceOptions { leading?: boolean; trailing?: boolean; }

function debounce<T extends (...args: any[]) => void>(
  fn: T,
  wait: number,
  { leading = false, trailing = true }: DebounceOptions = {},
) {
  let timer: ReturnType<typeof setTimeout> | null = null; // идёт ли сейчас всплеск
  let lastArgs: Parameters<T> | null = null;              // аргументы последнего вызова
  let lastThis: unknown;                                  // this последнего вызова

  function debounced(this: unknown, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;
    const callNow = leading && timer === null;            // первый вызов всплеска

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {                            // пауза наступила
      timer = null;
      if (trailing && lastArgs && !callNow) {             // !callNow — защита от дубля
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

Тонкое место — \`callNow\` внутри колбэка таймера. Каждый вызов заводит новый таймер, поэтому выживает таймер **последнего** вызова, и \`callNow\` в нём тоже от последнего вызова. Если последний вызов был leading (а это возможно, только если он был единственным во всплеске), trailing пропускается. Если во всплеске были ещё вызовы, у последнего \`callNow === false\`, и trailing срабатывает с его аргументами. \`lastArgs\` нужен как отдельная переменная, потому что его обнуляет \`cancel()\`: после отмены таймер уже не сработает, а следующий всплеск начнётся с чистого листа.

### Трассировка: набираем «angular»

Режим по умолчанию (только trailing), семь нажатий с интервалом 80 мс:

\`\`\`text
t=0    'a'        timer=null → leading выключен; таймер на t=300
t=80   'an'       clearTimeout; новый таймер на t=380
t=160  'ang'      новый таймер на t=460
t=240  'angu'     новый таймер на t=540
t=320  'angul'    новый таймер на t=620  (таймер на 300 уже отменён в t=240)
t=400  'angula'   новый таймер на t=700
t=480  'angular'  новый таймер на t=780
t=780  таймер сработал: trailing=true, lastArgs=['angular'], callNow=false → fn('angular')
\`\`\`

Итог: один вызов вместо семи, с финальным словом.

Режим \`{ leading: true, trailing: true }\`, вызовы \`'a'\` в t=0, \`'b'\` в t=100, \`'c'\` в t=450:

\`\`\`text
t=0    'a'  timer=null → callNow=true → fn('a') сразу; таймер на t=300 (callNow=true)
t=100  'b'  timer есть → callNow=false; таймер на t=400 (callNow=false), lastArgs=['b']
t=400  таймер: trailing и !callNow → fn('b'); timer=null
t=450  'c'  timer=null → снова начало всплеска → fn('c') сразу; таймер на t=750
t=750  таймер: callNow=true → trailing пропущен
\`\`\`

Итог: \`a\` в 0, \`b\` в 400, \`c\` в 450. Обратите внимание: \`c\` сработал всего через 50 мс после \`b\`. Debounce не гарантирует минимальный интервал между вызовами — это задача throttle.

### Сложность

Каждый вызов делает фиксированный набор действий: записать две переменные, отменить таймер, завести новый. Неважно, вызвали функцию 10 раз или 10 000 — работа на один вызов одинаковая, это \`O(1)\` по времени. Память тоже \`O(1)\`: в любой момент хранится один таймер, одна ссылка на последние аргументы и одна на \`this\`, старые вызовы ничего после себя не оставляют.

### Тест-кейсы

Ожидаемые результаты при \`wait = 300\` (все проверены прогоном):

- Trailing, вызовы \`'a'\`/\`'an'\`/\`'ang'\` в 0/100/200 → один вызов в t=500 с \`'ang'\`.
- Trailing, вызовы в 0 и 400 → два вызова: \`'a'\` в 300 и \`'b'\` в 700, потому что пауза была длиннее \`wait\`.
- \`{ leading: true, trailing: false }\`, вызовы в 0/100/200 и потом в 600 → \`'a'\` в 0 и \`'x'\` в 600.
- \`{ leading: true, trailing: true }\`, один вызов → ровно один вызов в t=0, не два.
- \`{ leading: true, trailing: true }\`, вызовы в 0/100/200 → \`'a'\` в 0 и \`'ang'\` в 500.
- \`{ leading: false, trailing: false }\` → функция не вызывается никогда (вырожденная конфигурация, стоит её запретить или задокументировать).
- Вызовы в 0/100, \`cancel()\` в 150 → ничего не вызвано; новый вызов \`'z'\` в 500 → сработает в 800.
- Метод объекта \`panel.addLater('x')\` → \`this\` внутри оригинала равен \`panel\`.

Так эти случаи выглядят в Vitest (тестовый раннер по умолчанию в новых Angular-проектах) с поддельными таймерами — они позволяют «перематывать» время без реального ожидания:

\`\`\`ts
describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('trailing: один вызов с последними аргументами', () => {
    const spy = vi.fn();
    const d = debounce(spy, 300);
    d('a'); vi.advanceTimersByTime(100);
    d('an'); vi.advanceTimersByTime(100);
    d('ang');
    vi.advanceTimersByTime(299);
    expect(spy).not.toHaveBeenCalled();     // ещё 1 мс до срабатывания
    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('ang');
  });

  it('leading + trailing: одиночный вызов срабатывает один раз', () => {
    const spy = vi.fn();
    const d = debounce(spy, 300, { leading: true, trailing: true });
    d('a');
    expect(spy).toHaveBeenCalledTimes(1);   // leading — сразу
    vi.advanceTimersByTime(1000);
    expect(spy).toHaveBeenCalledTimes(1);   // trailing не продублировал
  });

  it('cancel: отложенный вызов не происходит', () => {
    const spy = vi.fn();
    const d = debounce(spy, 300);
    d('a');
    d.cancel();
    vi.advanceTimersByTime(1000);
    expect(spy).not.toHaveBeenCalled();
  });
});
// ✓ 3 tests passed
\`\`\`

### \`setTimeout\` и \`clearTimeout\`

\`setTimeout(cb, ms)\` кладёт \`cb\` в очередь задач не раньше чем через \`ms\` миллисекунд и возвращает идентификатор: в браузере это число, в Node.js — объект \`Timeout\`. \`clearTimeout(id)\` отменяет вызов, если он ещё не произошёл; вызов с \`null\` или \`undefined\` безопасен и ничего не делает.

\`\`\`js
const id = setTimeout(() => console.log('tick'), 300);
clearTimeout(id);   // ничего не напечатается
clearTimeout(null); // без ошибки
\`\`\`

Именно пара «отменить старый — завести новый» и даёт эффект «сбрасываем отсчёт при каждом вызове». Тип идентификатора различается между средами, поэтому в TypeScript пишут \`ReturnType<typeof setTimeout>\` — «то, что возвращает \`setTimeout\` в текущей среде».

### Замыкание: где живёт состояние

Каждый вызов \`debounce(...)\` создаёт свои переменные \`timer\`, \`lastArgs\`, \`lastThis\`, и возвращённая функция «помнит» именно их.

\`\`\`js
const d1 = debounce(q => console.log('d1', q), 300);
const d2 = debounce(q => console.log('d2', q), 300);
d1('a'); d2('b');
// t=300: d1 a
// t=300: d2 b   ← у каждой обёртки свой таймер, они не гасят друг друга
\`\`\`

Отсюда практическое правило: одна debounced-обёртка — на один независимый источник событий. Если два поля формы делят одну обёртку, ввод во втором поле отменит отложенный вызов первого.

### \`this\` и \`fn.apply\`

\`this\` определяется в момент вызова: \`panel.add()\` — \`this\` равен \`panel\`, \`const f = panel.add; f()\` — \`this\` равен \`undefined\` в строгом режиме. \`fn.apply(ctx, args)\` позволяет вызвать функцию с нужным \`this\` и аргументами из массива.

\`\`\`js
function greet(greeting) { return \`\${greeting}, \${this.name}\`; }
greet.apply({ name: 'Anna' }, ['Hi']); // 'Hi, Anna'
\`\`\`

В debounce \`apply\` нужен потому, что оригинал вызывается позже и из другого места (из таймера), а контекст должен остаться тем, что был у последнего вызова обёртки.

### Debounce против throttle на одном потоке событий

Возьмём 10 событий со значениями 0…9, по одному каждые 100 мс (t=0…900), и интервал 300 мс:

\`\`\`text
debounce (trailing)            → один вызов: t=1200 со значением 9
debounce (leading)             → один вызов: t=0 со значением 0
throttle (leading + trailing)  → t=0: 0, t=300: 3, t=600: 6, t=900: 9
\`\`\`

Debounce ждёт конца всплеска и молчит всё время, пока он идёт. Throttle выдаёт значения равномерно **во время** всплеска. Отсюда выбор: для поиска по мере ввода — debounce (промежуточные «a», «an», «ang» никому не нужны), для скролла и прогресс-бара — throttle (обновлять нужно в процессе). Строка про throttle проверена оператором RxJS \`throttleTime(300, undefined, { leading: true, trailing: true })\`.

### \`debounceTime\` в RxJS — что берут в Angular

Если события уже приходят потоком (\`valueChanges\` у формы, \`fromEvent\`), ручной debounce не нужен — есть оператор:

\`\`\`ts
@Component({ /* ... */ })
export class UserSearchComponent {
  private api = inject(UserApi);
  query = new FormControl('', { nonNullable: true });

  users = toSignal(
    this.query.valueChanges.pipe(
      debounceTime(300),                       // ждём паузу в наборе
      distinctUntilChanged(),                  // 'ang' → 'angu' → 'ang' не шлём повторно
      switchMap(q => this.api.search(q)),      // старый запрос отменяется при новом
    ),
    { initialValue: [] },
  );
}
// набор "angular" за полсекунды → один HTTP-запрос через 300 мс после последней буквы
\`\`\`

\`debounceTime\` только откладывает значения, а отменяет устаревший HTTP-запрос \`switchMap\`: когда приходит новое значение, он отписывается от предыдущего внутреннего Observable. Ручной \`debounce\` такого не умеет: если запрос уже ушёл, а пользователь допечатал слово, ответы могут прийти в обратном порядке. \`toSignal\` сам отписывается при уничтожении компонента, поэтому \`cancel\` здесь не нужен. В экспериментальных Signal Forms (Angular 21, \`@angular/forms/signals\`) есть ещё правило \`debounce(path, ms)\`, которое откладывает запись значения из поля в модель.

### Где это применяется на практике

- **Поиск и автодополнение**: запрос к API после паузы в наборе, а не на каждую букву.
- **Фильтры больших гридов**: ввод в поле фильтра колонки пересчитывает или перезапрашивает данные таблицы один раз, когда пользователь закончил печатать.
- **Автосохранение черновика** формы или документа: сохраняем через 1–2 секунды после последней правки.
- **\`resize\` окна или контейнера** (\`ResizeObserver\`): тяжёлый пересчёт раскладки графиков дашборда — после того, как пользователь отпустил край окна.
- **Валидация поля на сервере** (занят ли логин): проверка после паузы, а не на каждый символ.
- **Защита от двойного клика** по кнопке «Оплатить»: \`leading: true, trailing: false\` — первый клик проходит сразу, остальные клики всплеска игнорируются.

## Важные нюансы и подводные камни

- **Потерянный \`this\`.** Если внутри вызвать \`fn(...args)\` вместо \`fn.apply(lastThis, lastArgs)\` или сделать обёртку стрелочной, метод класса упадёт с \`TypeError\`.
- **Устаревшие аргументы.** В trailing нужно вызывать с **последними** аргументами, а не с теми, что были при заведении первого таймера, — иначе в поиск уйдёт «a» вместо «angular».
- **Двойной вызов при \`leading + trailing\`.** Без проверки \`!callNow\` одиночный вызов срабатывает дважды — для отправки формы или оплаты это реальный баг.
- **Нет \`cancel\` — вызов после уничтожения.** Ушли с роута, а таймер дотикал и дёрнул метод уничтоженного компонента или отправил запрос, который уже никому не нужен. В Angular отменяйте в \`DestroyRef.onDestroy\`: \`inject(DestroyRef).onDestroy(() => this.save.cancel())\`.
- **\`cancel\` против \`flush\` для автосохранения.** При закрытии редактора \`cancel\` молча выбросит последние правки пользователя. Там нужен \`flush\` — «выполни отложенное прямо сейчас». В сниппете его нет; в lodash \`debounce\` есть и \`cancel\`, и \`flush\`.
- **Непрерывный поток никогда не сработает.** Если события идут чаще, чем раз в \`wait\`, без единой паузы, trailing-вызов откладывается бесконечно: поиск не выполнится, пока пользователь печатает без остановки. Lodash решает это опцией \`maxWait\`; кстати, lodash \`throttle\` реализован именно как \`debounce\` с \`maxWait = wait\`.
- **Debounce вместо throttle на скролле.** Прогресс-бар чтения не обновится ни разу, пока пользователь не остановится.
- **Общий debounce на несколько независимых источников.** События одного источника гасят события другого. Особенно коварно, если обёртку создать на уровне модуля: тогда все экземпляры компонента делят один таймер.
- **Debounce не возвращает результат.** Вызов отложен, и вернуть значение \`fn\` в момент обращения невозможно. Если нужен результат, возвращают промис, который разрешается, когда сработает отложенный вызов:

\`\`\`ts
function debounceAsync<A extends unknown[], R>(fn: (...args: A) => R | Promise<R>, wait: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let waiting: Array<{ resolve: (v: R) => void; reject: (e: unknown) => void }> = [];

  return (...args: A): Promise<R> => {
    if (timer) clearTimeout(timer);
    return new Promise<R>((resolve, reject) => {
      waiting.push({ resolve, reject });
      timer = setTimeout(async () => {
        const batch = waiting;              // все, кто ждал в этом всплеске
        waiting = [];
        timer = null;
        try {
          const result = await fn(...args);
          batch.forEach(w => w.resolve(result));
        } catch (e) {
          batch.forEach(w => w.reject(e));
        }
      }, wait);
    });
  };
}

const search = debounceAsync(async (q: string) => \`results for \${q}\`, 300);
Promise.all([search('a'), search('an'), search('ang')]).then(console.log);
// ['results for ang', 'results for ang', 'results for ang']
\`\`\`

- **Отменить уже ушедший запрос debounce не может.** Он управляет только моментом старта. Отмену делает \`switchMap\` в RxJS или \`AbortController\` для \`fetch\`.
- **Таймеры в фоновых вкладках.** Браузеры замедляют таймеры неактивных вкладок, поэтому отложенный вызов может сработать заметно позже \`wait\`; точные цифры зависят от браузера и его политики энергосбережения.
- **\`lastThis\` не обнуляется** ни после срабатывания, ни в \`cancel\`. Обычно это не важно, потому что обёртка живёт в том же компоненте, но формально она удерживает ссылку на последний контекст.

**Плюсы:** \`O(1)\` по времени и памяти, ноль зависимостей, резко снижает число запросов и пересчётов, легко тестируется поддельными таймерами.
**Минусы:** не возвращает результат, не отменяет уже начатую работу, при непрерывном потоке без \`maxWait\` может не сработать вообще, добавляет задержку \`wait\` к реакции интерфейса и требует ручной очистки через \`cancel\`.

## Как это спрашивают на собеседовании

**Главный вывод:** debounce — это «сбрасываемый таймер в замыкании»: каждый вызов отменяет предыдущий отсчёт, и функция срабатывает один раз после паузы с последними аргументами и \`this\`. Leading вызывает на старте всплеска, и при \`leading + trailing\` нельзя вызвать одиночный вызов дважды; \`cancel\` обязателен для очистки при уничтожении.

Типичные формулировки: «Реализуйте debounce», «Чем debounce отличается от throttle?», «Как не слать запрос на каждую букву в поиске?», «Добавьте leading и cancel».

Как вести себя во время кодинга: сначала проговорите уточняющие вопросы и договоритесь о поведении по умолчанию; напишите наивную trailing-версию за минуту и сразу скажите, какие у неё дефекты (\`this\`, leading, отмена); затем добавляйте возможности по одной, каждый раз проговаривая, какой сценарий они чинят; в конце прогоните вслух трассировку на трёх вызовах и назовите сложность.

Что могут спросить следом:

- *Как сделать, чтобы debounce возвращал результат?* — Вернуть промис и разрешить его (и все промисы того же всплеска) результатом отложенного вызова.
- *Зачем \`flush\` и \`maxWait\`?* — \`flush\` выполняет отложенное немедленно (автосохранение при закрытии), \`maxWait\` гарантирует вызов хотя бы раз в N мс при непрерывном потоке.
- *Почему \`debounceTime\` плюс \`switchMap\` в RxJS лучше ручного debounce для поиска?* — \`debounceTime\` только откладывает, а \`switchMap\` ещё и отменяет устаревший запрос, и порядок ответов не перепутается.
- *Когда leading?* — Когда реакция нужна мгновенно, а повторы надо гасить: защита от двойного клика по кнопке отправки.
- *Какая сложность?* — \`O(1)\` на вызов и \`O(1)\` памяти: один таймер и ссылки на последние аргументы.

### Ответ на 1 минуту

> Debounce откладывает вызов функции, пока поток вызовов не затихнет на \`wait\` миллисекунд: каждый новый вызов сбрасывает таймер, и функция срабатывает один раз с последними аргументами. Реализую через замыкание: храню \`timer\`, \`lastArgs\` и \`lastThis\`; на вызове делаю \`clearTimeout\` и завожу новый \`setTimeout\`, а в колбэке вызываю \`fn.apply(lastThis, lastArgs)\`, чтобы не потерять контекст метода. Для leading проверяю \`timer === null\` — это начало всплеска — и вызываю сразу, а в trailing пропускаю вызов, если последний вызов был leading, иначе одиночный клик сработает дважды. \`cancel\` очищает таймер и аргументы, его зову в \`DestroyRef.onDestroy\`. Сложность \`O(1)\` по времени и памяти. Применяю для поиска, фильтров грида, автосохранения и ресайза; для скролла нужен throttle. В Angular для потоков беру \`debounceTime\` со \`switchMap\`, который ещё и отменяет устаревший запрос.`,
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
      ru: `## В чём суть

Нужно написать \`throttle(fn, wait)\` — обёртку, которая пропускает вызовы \`fn\` **не чаще одного раза в \`wait\` миллисекунд**. Первый вызов выполняется сразу (leading), а последний вызов внутри окна не теряется, а выполняется в конце окна (trailing). Вторая часть вопроса — понять, когда throttle лучше debounce: throttle работает **во время** непрерывного потока событий, debounce — только **после** него. Задача проверяет работу с временем, таймерами, замыканиями и умение не потерять последнее событие.

Аналогия: турникет в метро. Люди подходят непрерывно, а он пропускает строго по одному в секунду: поток не останавливается, просто становится равномерным. Trailing — это правило «последнего в очереди всё равно пропустим, когда освободится». Debounce же — охранник, который открывает дверь, только когда очередь полностью рассосалась.

**Какую проблему решает.** Браузер шлёт \`scroll\`, \`mousemove\`, \`pointermove\` примерно раз в кадр — это около 60 событий в секунду на обычном мониторе и больше на 120-герцовом. Если на каждое событие пересчитывать раскладку, обновлять прогресс-бар или слать аналитику, страница начинает подтормаживать (jank). При этом ждать окончания прокрутки, как делает debounce, нельзя: пользователь хочет видеть, как полоска прогресса едет **вместе** с прокруткой. Throttle даёт регулярные обновления с ограниченной частотой.

## Словарик терминов

- **Throttle (троттлинг, «дросселирование»)** — ограничение частоты: функция выполняется не чаще одного раза в заданный интервал, даже если её вызывают постоянно.
- **Окно (window)** — отрезок длиной \`wait\` после фактического вызова, в течение которого новые вызовы не выполняются сразу.
- **Leading edge (передний фронт)** — вызов в начале окна, сразу на первом событии.
- **Trailing edge (задний фронт)** — вызов в конце окна с аргументами последнего события, пришедшего внутри окна.
- **\`lastCall\`** — момент последнего фактического вызова \`fn\`; от него отсчитывается окно.
- **\`remaining\`** — сколько миллисекунд осталось до конца текущего окна: \`wait - (now - lastCall)\`.
- **\`Date.now()\`** — текущее время в миллисекундах с 1 января 1970 года (по системным часам).
- **\`performance.now()\`** — время в миллисекундах с момента загрузки страницы; монотонное, то есть никогда не идёт назад.
- **\`setTimeout\` / \`clearTimeout\`** — запланировать вызов через N мс и отменить запланированный вызов.
- **Замыкание (closure)** — функция помнит переменные места, где создана; в нём живут \`lastCall\`, \`timer\`, \`lastArgs\`.
- **\`fn.apply(ctx, args)\`** — вызвать функцию с заданным \`this\` и массивом аргументов.
- **Debounce** — родственный приём: вызвать один раз после того, как поток событий затих на \`wait\`.
- **\`requestAnimationFrame\` (rAF)** — попросить браузер вызвать функцию перед следующей отрисовкой кадра.
- **\`throttleTime\` / \`auditTime\`** — операторы RxJS для троттлинга потока значений.
- **Jank** — заметные глазу подтормаживания интерфейса, когда кадр не успевает отрисоваться вовремя.
- **Passive listener** — обработчик с \`{ passive: true }\`: обещание не вызывать \`preventDefault()\`, поэтому браузер прокручивает, не дожидаясь JS.

## Как это работает под капотом

### Уточняющие вопросы перед кодом

- Нужен ли вызов сразу на первом событии (leading)? Обычно да: пользователь должен видеть реакцию немедленно.
- Нужен ли trailing? Здесь — да, иначе последнее событие пропадёт.
- С какими аргументами вызывать trailing? С последними пришедшими за окно.
- Нужна ли отмена \`cancel()\` для очистки при уничтожении компонента? Да.
- Должен ли результат \`fn\` возвращаться? Обычно нет; у lodash возвращается результат последнего фактического вызова.

### Идея алгоритма простыми словами

1. Храним время последнего фактического вызова \`lastCall\`; изначально 0, поэтому первое событие всегда попадает «за окно».
2. На каждом событии считаем, сколько осталось до конца окна: \`remaining = wait - (now - lastCall)\`.
3. Если \`remaining <= 0\`, окно истекло — вызываем \`fn\` немедленно (leading), запоминаем \`lastCall = now\` и на всякий случай отменяем висящий trailing-таймер.
4. Если окно ещё идёт, а trailing-таймера нет — заводим его на **остаток** окна \`remaining\`, а не на полный \`wait\`.
5. Если таймер уже есть — ничего не планируем, только обновляем \`lastArgs\` и \`lastThis\`, чтобы trailing выполнился со свежими данными.
6. Когда таймер срабатывает, он сам становится фактическим вызовом: обновляет \`lastCall\` и вызывает \`fn\` с последними аргументами. Поэтому следующее окно отсчитывается уже от него.

Построим решение по шагам. Входные данные для всех шагов: пользователь прокручивает страницу, события приходят каждые 80 мс, \`scrollY\` растёт на 100 px, всего 8 событий; \`wait = 300\`.

\`\`\`text
t=0:0px  t=80:100px  t=160:200px  t=240:300px  t=320:400px  t=400:500px  t=480:600px  t=560:700px
\`\`\`

### Шаг 1. Наивная версия: только leading

\`\`\`js
function throttle(fn, wait) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= wait) {   // окно истекло — пропускаем
      lastCall = now;
      fn.apply(this, args);
    }                               // иначе событие просто выбрасываем
  };
}
// вызовы fn: t=0: 0px, t=320: 400px
\`\`\`

Частота ограничена, но прокрутка остановилась на 700 px, а обработчик последний раз видел 400 px — индикатор застыл на устаревшей позиции. Все события после последнего вызова выброшены. Ровно так ведёт себя \`throttleTime(300)\` в RxJS по умолчанию.

### Шаг 2. Добавляем trailing «в лоб» — и получаем дубль

\`\`\`js
function throttle(fn, wait) {
  let lastCall = 0, timer = null, lastArgs = null;
  return function (...args) {
    const now = Date.now();
    lastArgs = args;
    if (now - lastCall >= wait) {
      lastCall = now;
      fn.apply(this, args);              // ❌ висящий таймер не отменён
    } else if (!timer) {
      timer = setTimeout(() => {         // ❌ ждём полный wait, а не остаток окна
        timer = null;
        lastCall = Date.now();
        fn.apply(this, lastArgs);
      }, wait);
    }
  };
}
// вызовы fn: t=0: 0px, t=320: 400px, t=380: 400px, t=700: 700px
\`\`\`

Последнее значение теперь доходит, но появились две ошибки. Trailing, заведённый в t=80 на полные 300 мс, должен был сработать в конце окна (t=300), а сработал в t=380. За это время в t=320 окно истекло и прошёл leading-вызов, а таймер никто не отменил — и в t=380 он вызвал \`fn\` второй раз с тем же \`400px\`, всего через 60 мс. Ограничение частоты нарушено, а интервалы между вызовами «плывут»: 320, 60, 320 мс.

### Шаг 3. Финальная версия: таймер на остаток окна

Это код из сниппета под ответом:

\`\`\`ts
function throttle<T extends (...args: any[]) => void>(fn: T, wait: number) {
  let lastCall = 0;                                        // время последнего вызова fn
  let timer: ReturnType<typeof setTimeout> | null = null;  // запланированный trailing
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown;

  function throttled(this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - lastCall);             // сколько осталось до конца окна
    lastArgs = args;
    lastThis = this;

    if (remaining <= 0) {                 // leading edge: окно истекло
      if (timer) { clearTimeout(timer); timer = null; }    // trailing больше не нужен
      lastCall = now;
      fn.apply(this, args);
    } else if (!timer) {                  // schedule trailing edge
      timer = setTimeout(() => {
        lastCall = Date.now();            // trailing — тоже фактический вызов
        timer = null;
        if (lastArgs) fn.apply(lastThis, lastArgs);
      }, remaining);
    }
  }

  throttled.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastCall = 0;                         // следующий вызов снова пройдёт сразу
  };
  return throttled;
}
// вызовы fn: t=0: 0px, t=300: 300px, t=600: 700px
\`\`\`

Обе ошибки шага 2 исправлены: таймер заводится на \`remaining\`, поэтому trailing срабатывает ровно в конце окна, а leading-ветка отменяет висящий таймер, поэтому дублей нет. Почему \`lastCall = 0\` работает для первого вызова: \`Date.now()\` — это порядка 1,7 триллиона миллисекунд, так что \`remaining\` получается огромным отрицательным числом, и первый вызов всегда leading.

### Трассировка на входе со скроллом

\`\`\`text
t=0    0px    remaining = 300 - (огромное число) < 0 → leading: fn(0px), lastCall=0
t=80   100px  remaining = 300 - 80 = 220 > 0, таймера нет → таймер на t=300; lastArgs=100px
t=160  200px  remaining = 140, таймер есть → только lastArgs=200px
t=240  300px  remaining = 60, таймер есть → lastArgs=300px
t=300  таймер: lastCall=300, fn(300px)
t=320  400px  remaining = 300 - 20 = 280 → таймер на t=600; lastArgs=400px
t=400  500px  remaining = 200 → lastArgs=500px
t=480  600px  remaining = 120 → lastArgs=600px
t=560  700px  remaining = 40  → lastArgs=700px
t=600  таймер: lastCall=600, fn(700px)
\`\`\`

Итог: три вызова ровно через каждые 300 мс, и последний — с финальной позицией 700 px. Восемь событий превратились в три вызова, а пользователь не потерял ни одного «состояния покоя». Тот же результат даёт RxJS \`throttleTime(300, undefined, { leading: true, trailing: true })\` на этих данных.

### Сложность

На каждый вызов — несколько арифметических операций, сравнение и, возможно, один \`setTimeout\`/\`clearTimeout\`. От числа событий работа на одно событие не зависит, поэтому время \`O(1)\` на вызов. Память \`O(1)\`: всегда одно число \`lastCall\`, максимум один таймер и ссылки на последние аргументы. Сколько бы событий ни пришло — 8 или 8 000, — хранится одно и то же.

### Тест-кейсы

Ожидаемые результаты при \`wait = 300\` (все проверены прогоном):

- Один вызов в t=0 → один вызов \`fn\` сразу, trailing не планируется.
- Вызовы \`a\`(0), \`b\`(100) → \`a\` в 0, \`b\` в 300.
- Вызовы \`a\`(0), \`b\`(100), \`c\`(200) → \`a\` в 0, \`c\` в 300; \`b\` поглощён, потому что за окно пришло более свежее \`c\`.
- Вызовы с интервалом больше окна: 0, 500, 1000 → три leading-вызова сразу же, таймеры не заводятся.
- Вызовы \`a\`(0), \`b\`(100), \`c\`(310) → \`a\` в 0, \`b\` в 300, \`c\` в 600: окно после trailing отсчитывается от trailing.
- Непрерывный поток каждые 16 мс в течение 2 секунд (125 событий) при \`wait = 100\` → 21 вызов, ровно каждые 100 мс.
- \`cancel()\` в t=150 после вызовов в 0 и 100 → trailing отменён; новый вызов в t=200 проходит сразу, потому что \`cancel\` сбросил \`lastCall\`.
- \`wait = 0\` → каждый вызов проходит синхронно, троттлинга нет.
- Метод объекта → \`this\` внутри оригинала сохранён и для leading-, и для trailing-вызова.

Первые два случая в виде теста Vitest; \`vi.useFakeTimers()\` подменяет и таймеры, и \`Date.now\`, поэтому время можно перематывать:

\`\`\`ts
describe('throttle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('первый вызов сразу, последний — в конце окна', () => {
    const spy = vi.fn();
    const t = throttle(spy, 300);
    t('a');
    expect(spy).toHaveBeenLastCalledWith('a');
    vi.advanceTimersByTime(100); t('b');
    vi.advanceTimersByTime(100); t('c');
    expect(spy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);            // t=300: конец окна
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith('c');
  });

  it('cancel отменяет trailing', () => {
    const spy = vi.fn();
    const t = throttle(spy, 300);
    t('a');
    vi.advanceTimersByTime(100); t('b');
    t.cancel();
    vi.advanceTimersByTime(1000);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
// ✓ 2 tests passed
\`\`\`

### \`Date.now()\` против \`performance.now()\`

\`Date.now()\` берёт время из системных часов. Если часы перевести назад (пользователь поменял время, синхронизация по сети), разница \`now - lastCall\` станет отрицательной, и \`remaining\` окажется огромным:

\`\`\`js
// lastCall записан, затем системные часы ушли на час назад, и пришло событие
remaining = 300 - (-3_600_000 + 100); // 3 600 200 мс
// trailing-вызов сработает примерно через час
\`\`\`

Это проверено прогоном с подменённым \`Date.now\`. \`performance.now()\` монотонный — он отсчитывает время от загрузки страницы и назад не идёт, поэтому в собственной реализации его стоит предпочесть. Lodash, к слову, тоже использует \`Date.now()\`, так что проблема не экзотическая, а просто редкая.

### \`setTimeout\` только для trailing

Таймер в этой реализации нужен ровно для одного — «доставить» последнее событие в конце окна. Решение «можно ли вызвать сейчас» принимается по реальному времени, а не по флагу, который сбросит таймер. Это важно, потому что таймер — лишь обещание вызвать «не раньше чем»: при загруженном главном потоке он срабатывает позже, а в фоновых вкладках браузеры дополнительно замедляют таймеры (насколько — зависит от браузера). Сравнение по времени не накапливает эти опоздания.

### \`requestAnimationFrame\`: троттлинг по кадрам

Для чисто визуальных обновлений (двигать элемент за курсором, перерисовать полоску) удобнее привязаться не к миллисекундам, а к кадрам:

\`\`\`ts
function rafThrottle<T extends (...args: any[]) => void>(fn: T) {
  let frame: number | null = null;
  let lastArgs: Parameters<T>;
  return (...args: Parameters<T>) => {
    lastArgs = args;                      // всегда помним самое свежее
    if (frame !== null) return;           // кадр уже заказан
    frame = requestAnimationFrame(() => {
      frame = null;
      fn(...lastArgs);
    });
  };
}
// 13 событий за 50 мс (каждые 4 мс) → 4 вызова, по одному на кадр, каждый с последним значением
\`\`\`

rAF вызывает функцию прямо перед отрисовкой, поэтому обновление никогда не происходит чаще, чем экран способен его показать, и всегда попадает в ближайший кадр. В большинстве браузеров rAF не вызывается в скрытых вкладках, что экономит батарею. Минус: частота зависит от монитора (60, 120, 144 Гц), поэтому для «не чаще раза в 100 мс» (аналитика, запросы) нужен обычный throttle.

### \`throttleTime\` и \`auditTime\` в RxJS

Для потоков в Angular обычно берут операторы. На том же входе со скроллом:

\`\`\`ts
scroll$.pipe(throttleTime(300));
// t=0: 0px, t=320: 400px          — по умолчанию { leading: true, trailing: false }
scroll$.pipe(throttleTime(300, undefined, { leading: true, trailing: true }));
// t=0: 0px, t=300: 300px, t=600: 700px   — совпадает с нашим throttle
scroll$.pipe(auditTime(300));
// t=300: 300px, t=620: 700px      — только trailing: ждёт окно и отдаёт последнее
scroll$.pipe(debounceTime(300));
// t=860: 700px                    — один раз, через 300 мс после последнего события
\`\`\`

Главная ловушка: у \`throttleTime\` по умолчанию trailing выключен, и последнее значение теряется — ровно баг шага 1. В lodash \`throttle\` по умолчанию включены оба фронта.

### Как выбрать между throttle и debounce

- **Нужна реакция во время действия** (скролл, перетаскивание, рисование, ресайз с живым превью) — throttle.
- **Нужен только итог действия** (поиск по мере ввода, автосохранение, валидация логина) — debounce.
- **Нужно равномерно семплировать поток** (координаты мыши для рисования, телеметрия) — throttle: он даёт точки через равные интервалы.
- **Нужно ограничить нагрузку на API при постоянном вводе** — throttle гарантирует потолок частоты; debounce при непрерывном вводе может не выстрелить вообще.
- **Чисто визуальное обновление** — throttle по кадрам через \`requestAnimationFrame\`.

Проверка на автодополнении: с throttle на 300 мс при наборе «angular» уйдёт запрос каждые 300 мс во время набора, а с debounce — один после паузы. Для поиска это лишние запросы, поэтому там debounce.

### Где это применяется на практике

- **Прогресс-бар чтения и «липкая» шапка**, которые зависят от позиции скролла:

\`\`\`ts
@Component({ selector: 'app-reading-progress', template: \`<div class="bar" [style.width.%]="progress()"></div>\` })
export class ReadingProgressComponent {
  progress = signal(0);

  constructor() {
    const update = throttle(() => {
      const el = document.documentElement;
      this.progress.set(Math.round((100 * el.scrollTop) / (el.scrollHeight - el.clientHeight)));
    }, 100);
    window.addEventListener('scroll', update, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('scroll', update);
      update.cancel();                     // иначе trailing выстрелит после уничтожения
    });
  }
}
// прокрутка 2 секунды → около 20 обновлений вместо ~120 событий, последнее — с финальной позицией
\`\`\`

- **Drag-and-drop и ресайз колонок в больших гридах**: пересчитывать ширины и перерисовывать строки не чаще раза в кадр или в 50 мс.
- **Отправка аналитики** (глубина скролла, движения мыши для тепловых карт) — не чаще раза в N мс.
- **Подгрузка данных при скролле** (бесконечная лента): проверять «близко ли к низу» не на каждом событии.
- **Совместное редактирование и курсоры**: рассылать позицию курсора через WebSocket не чаще 10 раз в секунду.
- **Кнопки, которые можно нажимать часто**, но запросы должны идти с ограниченной частотой (например, «обновить данные дашборда»).

## Важные нюансы и подводные камни

- **Throttle без trailing.** Последнее событие теряется: пользователь остановил скролл, а индикатор показывает позицию столетней давности. Это поведение \`throttleTime\` по умолчанию.
- **Trailing на полный \`wait\` вместо остатка окна.** Интервалы «плывут», а без отмены таймера в leading-ветке появляются двойные вызовы через несколько миллисекунд — пример шага 2.
- **Опора только на \`setTimeout\`** без учёта реально прошедшего времени: опоздания таймеров накапливаются, особенно во вкладке в фоне.
- **\`Date.now()\` не монотонный.** Перевод системных часов назад может отложить trailing-вызов на часы; \`performance.now()\` от этого защищён.
- **Потерянные аргументы и \`this\`.** Та же ошибка, что и в debounce: trailing обязан вызываться с последними аргументами через \`fn.apply(lastThis, lastArgs)\`.
- **Throttle там, где нужен debounce.** Автодополнение начнёт слать запрос каждые 300 мс во время набора вместо одного в конце.
- **Забытый \`cancel\` при уничтожении компонента.** Запланированный trailing выстрелит в уничтоженный компонент; заодно снимите сам обработчик через \`removeEventListener\`.
- **\`cancel\` в сниппете сбрасывает \`lastCall\`.** После отмены следующий вызов пройдёт сразу, даже если окно формально не истекло, — обычно это то, что нужно.
- **\`wait = 0\` выключает троттлинг.** \`remaining\` всегда \`<= 0\`, и каждый вызов проходит синхронно.
- **Нет опции \`leading: false\`.** В сниппете первый вызов всегда немедленный; lodash и RxJS позволяют выключить любой из фронтов.
- **Тяжёлый обработчик всё равно тормозит.** Throttle снижает частоту, но если один вызов занимает 50 мс, кадры пропадут. Выносите тяжёлое в Web Worker или упрощайте сам расчёт.
- **Scroll-обработчики в приложении с zone.js.** Каждое событие, пойманное внутри зоны Angular, запускает проверку изменений. Подписывайтесь в \`NgZone.runOutsideAngular\`, а внутрь возвращайтесь только на троттлированном вызове — или обновляйте сигнал, как в примере выше.

**Плюсы:** гарантированный потолок частоты, регулярные обновления во время действия, \`O(1)\` по времени и памяти, trailing не теряет финальное состояние.
**Минусы:** промежуточные события выбрасываются, частота подобрана «на глаз» и не привязана к кадрам, нужен ручной \`cancel\`, \`Date.now()\` уязвим к переводу часов.

## Как это спрашивают на собеседовании

**Главный вывод:** throttle пропускает не больше одного вызова за окно \`wait\`: первый — сразу, последний за окно — в его конце. Ключ реализации — считать остаток окна по реальному времени и заводить trailing-таймер на этот остаток, отменяя его при leading-вызове. Throttle — для реакции во время действия, debounce — для итога действия.

Типичные формулировки: «Реализуйте throttle», «Чем throttle отличается от debounce и когда что выбрать?», «Почему прогресс-бар застревает на неправильной позиции?», «Как ограничить обработку скролла?».

Как вести себя во время кодинга: начните с уточнения, нужны ли leading и trailing; напишите версию с одним \`lastCall\` и сразу покажите на примере, что последнее событие теряется; добавьте trailing и проговорите, почему таймер нужен на остаток окна и почему leading обязан его отменять; в конце прогоните трассировку на четырёх-пяти событиях и назовите сложность.

Что могут спросить следом:

- *Что будет при \`wait = 0\`?* — Троттлинга нет: каждый вызов проходит синхронно.
- *Чем throttle отличается от \`requestAnimationFrame\`-троттлинга?* — rAF привязан к кадру и обычно не вызывается в фоновой вкладке, поэтому для визуальных обновлений он часто лучше; для «не чаще раза в 100 мс» нужен обычный throttle.
- *Что делает \`throttleTime\` по умолчанию?* — Только leading, trailing выключен, поэтому последнее значение теряется; включается конфигом \`{ leading: true, trailing: true }\`.
- *Почему \`performance.now()\`, а не \`Date.now()\`?* — Он монотонный и не прыгает при переводе системных часов.
- *Как связаны throttle и debounce в lodash?* — Lodash \`throttle\` реализован как \`debounce\` с опцией \`maxWait\`, равной \`wait\`.

### Ответ на 1 минуту

> Throttle гарантирует, что функция выполнится не чаще раза в \`wait\` миллисекунд, причём во время непрерывного потока событий, а не после него, как debounce. Реализую так: храню время последнего фактического вызова и на каждом событии считаю остаток окна \`wait - (now - lastCall)\`. Если он не больше нуля — вызываю сразу, это leading, и отменяю висящий таймер. Если окно ещё идёт — завожу trailing-таймер на остаток окна и только обновляю последние аргументы и \`this\`. Trailing обязателен, иначе последнее событие теряется и прогресс-бар застревает на старой позиции. Сложность \`O(1)\`. Throttle беру для скролла, драга, ресайза колонок грида и аналитики, debounce — для поиска и автосохранения. Для чисто визуальных обновлений удобен \`requestAnimationFrame\`, а в RxJS — \`throttleTime\` с \`trailing: true\`, потому что по умолчанию он выключен.`,
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
      ru: `## В чём суть

Нужно написать \`deepClone(value)\` — функцию, которая рекурсивно копирует объект так, чтобы копия **не делила ни одной ссылки** с оригиналом: меняете что угодно в клоне — оригинал не меняется. При этом функция не должна зависать на циклических ссылках, должна сохранять общие ссылки (один объект, встреченный дважды, остаётся одним объектом и в клоне) и правильно копировать \`Date\`, \`Map\`, \`Set\` и массивы. Вся хитрость — в одной структуре данных: **WeakMap «оригинал → клон»**, которая разом решает и циклы, и общие ссылки.

Аналогия: перерисовываете карту метро от руки. Ветки пересекаются, и одна и та же пересадочная станция встречается снова и снова. Если не отмечать «эту станцию я уже нарисовал, вот она», вы будете рисовать её бесконечно (цикл) или нарисуете две разные станции с одним названием (потеря общей ссылки). WeakMap — ваш список уже нарисованных станций.

**Какую проблему решает.** Присваивание \`const copy = obj\` и spread \`{ ...obj }\` копируют только верхний уровень: вложенные объекты остаются общими. Поменяли \`copy.address.city\` в форме редактирования — и тихо испортили исходную сущность в сторе, кэше или списке. А популярный трюк \`JSON.parse(JSON.stringify(obj))\` падает на циклах и молча портит данные: даты становятся строками, \`Map\` и \`Set\` — пустыми объектами. Глубокое копирование нужно, когда вы хотите изменять данные, не задевая оригинал: черновик формы, снимок для undo, изоляция тестовых данных.

## Словарик терминов

- **Поверхностная копия (shallow copy)** — копируется только верхний уровень; вложенные объекты общие. Так работают \`{ ...obj }\`, \`Object.assign\`, \`arr.slice()\`.
- **Глубокая копия (deep copy, deep clone)** — копируются все уровни вложенности; клон не делит с оригиналом ни одного объекта.
- **Ссылка (reference)** — переменная хранит не сам объект, а «адрес» объекта; две переменные могут указывать на один и тот же объект.
- **Циклическая ссылка (cycle)** — объект прямо или через цепочку ссылается сам на себя: \`a.self = a\`, или \`parent.children[0].parent === parent\`.
- **Общая ссылка (shared reference)** — один и тот же объект доступен из нескольких мест: \`a.x === a.y\`.
- **\`WeakMap\`** — словарь, где ключи — только объекты и держатся «слабо»: не мешают сборщику мусора удалить объект, на который больше никто не ссылается.
- **Прототип (prototype)** — объект, из которого экземпляр берёт методы; у \`new User()\` это \`User.prototype\`. Узнать — \`Object.getPrototypeOf\`, создать объект с заданным прототипом — \`Object.create(proto)\`.
- **\`Reflect.ownKeys(obj)\`** — все собственные ключи объекта: строковые и символьные, перечисляемые и нет.
- **\`Object.keys(obj)\`** — только собственные **перечисляемые строковые** ключи.
- **Symbol** — уникальный примитив, который может быть ключом свойства; такие ключи не видны в \`Object.keys\` и \`JSON\`.
- **\`structuredClone\`** — встроенная функция браузера и Node.js (во всех основных браузерах — с 2022 года), делающая глубокую копию по алгоритму structured clone — тому же, что используется в \`postMessage\`.
- **\`DataCloneError\`** — ошибка, которую бросает \`structuredClone\`, если встретил то, что клонировать нельзя (функцию, DOM-узел).
- **Стек вызовов (call stack)** — память под незавершённые вызовы функций; у глубокой рекурсии он кончается с \`RangeError: Maximum call stack size exceeded\`.

## Как это работает под капотом

### Уточняющие вопросы перед кодом

- Какие типы обязаны поддерживаться? В задаче: объекты, массивы, \`Date\`, \`Map\`, \`Set\`, циклы. Стоит спросить про \`RegExp\`, классы, символьные ключи.
- Что делать с функциями? Обычно — оставить ту же ссылку (функцию «скопировать» нельзя) или бросить ошибку, как \`structuredClone\`.
- Нужно ли сохранять прототип, то есть чтобы клон \`new User()\` остался \`User\` с методами?
- Нужно ли сохранять общие ссылки (\`a.x === a.y\` в клоне)? Обычно да.
- Насколько глубокими бывают данные? Если десятки тысяч уровней — рекурсия не подойдёт, нужен обход со своим стеком.
- Можно ли просто использовать \`structuredClone\`? Если да — это правильный ответ для продакшена, и стоит сказать об этом вслух.

### Идея алгоритма простыми словами

1. Примитивы (\`number\`, \`string\`, \`boolean\`, \`undefined\`, \`symbol\`, \`bigint\`) и \`null\` неизменяемы, поэтому их возвращаем как есть — копировать нечего.
2. Особые типы обрабатываем отдельно, потому что их содержимое лежит во внутренних слотах, а не в свойствах: \`Date\` → новый \`Date\` с тем же временем, \`RegExp\` → новый по \`source\` и \`flags\`.
3. Проверяем WeakMap: если этот объект уже клонировали, возвращаем готовый клон. Это и защита от циклов, и сохранение общих ссылок.
4. Создаём пустой клон нужного типа и **сразу** кладём его в WeakMap — до копирования содержимого. Иначе рекурсия, дойдя по циклу до того же объекта, не найдёт его в кэше и пойдёт по кругу.
5. Рекурсивно копируем содержимое: элементы массива, пары \`Map\` (и ключи, и значения), элементы \`Set\`, все собственные ключи объекта через \`Reflect.ownKeys\`.
6. Для обычных объектов создаём клон через \`Object.create(Object.getPrototypeOf(value))\`, поэтому экземпляр класса остаётся экземпляром и сохраняет методы.

Строим решение по шагам: от наивной рекурсии до финальной версии.

### Шаг 1. Наивная рекурсия

\`\`\`js
function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  const copy = Array.isArray(value) ? [] : {};
  for (const key of Object.keys(value)) copy[key] = deepClone(value[key]);
  return copy;
}

const user = { name: 'Ann', tags: ['admin'], address: { city: 'Minsk' } };
const draft = deepClone(user);
draft.address.city = 'Riga';
draft.tags.push('x');
console.log(user.address.city, user.tags); // Minsk ['admin']  ← оригинал не задет
\`\`\`

Для простого дерева данных этого достаточно. Но три проблемы видны сразу:

\`\`\`js
const shared = { id: 1 };
const s = deepClone({ x: shared, y: shared });
console.log(s.x === s.y); // false — общая ссылка распалась на две копии

const a = { name: 'root' };
a.self = a;
deepClone(a); // RangeError: Maximum call stack size exceeded
\`\`\`

Цикл даёт бесконечную рекурсию: \`deepClone(a)\` → \`deepClone(a.self)\`, то есть снова \`deepClone(a)\`, и так до переполнения стека. Третья проблема — \`Date\`, \`Map\`, \`Set\` и экземпляры классов превращаются в пустые \`{}\` без методов.

### Шаг 2. Кэш есть, но заполняется слишком поздно

\`\`\`js
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  const copy = Array.isArray(value) ? [] : {};
  for (const key of Object.keys(value)) copy[key] = deepClone(value[key], seen);
  seen.set(value, copy);   // ❌ клон попадает в кэш только ПОСЛЕ обхода
  return copy;
}

deepClone({ x: shared, y: shared }); // x === y → true, общая ссылка уже сохраняется
deepClone(a);                        // RangeError: Maximum call stack size exceeded
\`\`\`

Самая частая ошибка на живом кодинге. Общие ссылки она чинит: к моменту второй встречи \`shared\` уже полностью скопирован и лежит в кэше. А цикл — нет: пока мы копируем содержимое \`a\`, сам \`a\` ещё не в кэше, и рекурсия по \`a.self\` начинает копировать его заново.

### Шаг 3. Кэш до обхода — циклы побеждены

\`\`\`js
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);   // ✅ сначала «застолбили» клон, потом наполняем
  for (const key of Object.keys(value)) copy[key] = deepClone(value[key], seen);
  return copy;
}

const c = deepClone(a);
console.log(c.self === c, c !== a); // true true
\`\`\`

Пустой клон можно положить в кэш заранее, потому что это объект, и ссылка на него не изменится, когда мы его наполним. Рекурсия, вернувшись к \`a\`, получит эту ссылку — ещё недозаполненную, но к концу работы уже полную. Остаётся проблема типов: \`{ d: new Date(0), m: new Map(), s: new Set() }\` превращается в \`{ d: {}, m: {}, s: {} }\`, а экземпляр класса теряет методы.

### Шаг 4. Финальная версия: особые типы, прототип, символы

Это код из сниппета под ответом:

\`\`\`ts
function deepClone<T>(value: T, seen = new WeakMap<object, any>()): T {
  if (value === null || typeof value !== 'object') return value;               // примитивы, функции
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (value instanceof RegExp) return new RegExp(value.source, value.flags) as T;

  const ref = value as unknown as object;
  if (seen.has(ref)) return seen.get(ref);        // cycle / shared ref

  if (Array.isArray(value)) {
    const arr: any[] = [];
    seen.set(ref, arr);                           // в кэш — до обхода
    for (const item of value) arr.push(deepClone(item, seen));
    return arr as T;
  }
  if (value instanceof Map) {
    const map = new Map();
    seen.set(ref, map);
    value.forEach((v, k) => map.set(deepClone(k, seen), deepClone(v, seen))); // и ключи тоже
    return map as T;
  }
  if (value instanceof Set) {
    const set = new Set();
    seen.set(ref, set);
    value.forEach(v => set.add(deepClone(v, seen)));
    return set as T;
  }
  const clone = Object.create(Object.getPrototypeOf(value));  // тот же прототип → методы на месте
  seen.set(ref, clone);
  for (const key of Reflect.ownKeys(value as object)) {       // строки + символы
    clone[key] = deepClone((value as any)[key], seen);
  }
  return clone;
}
\`\`\`

\`Date\` и \`RegExp\` проверяются до кэша и не попадают в него: у них нет вложенных объектов, поэтому зациклиться через них нельзя. Функции попадают в первую ветку (\`typeof\` даёт \`'function'\`, а не \`'object'\`) и возвращаются той же ссылкой.

### Трассировка на примере с циклом и общей ссылкой

\`\`\`ts
const a: any = { name: 'root' };
a.self = a;                       // цикл
const shared = { id: 1 };
a.x = shared; a.y = shared;       // одна ссылка дважды
const c = deepClone(a);
\`\`\`

Пошагово:

\`\`\`text
deepClone(a)
  объект, не Date/RegExp, в seen нет, не массив/Map/Set
  cloneA = Object.create(Object.prototype); seen = { a → cloneA }
  ключи a: ['name', 'self', 'x', 'y']
  'name' → deepClone('root') → примитив → 'root'
  'self' → deepClone(a) → seen.has(a) → вернуть cloneA      ← цикл замкнулся без рекурсии
  'x'    → deepClone(shared): в seen нет
             cloneS = {}; seen = { a → cloneA, shared → cloneS }
             'id' → 1
           вернуть cloneS
  'y'    → deepClone(shared) → seen.has(shared) → вернуть cloneS  ← общая ссылка сохранена
  вернуть cloneA
\`\`\`

\`\`\`ts
c.self === c;      // true  — цикл сохранён, функция не зависла
c.x === c.y;       // true  — общая ссылка осталась общей
c.x === shared;    // false — и при этом это уже копия
\`\`\`

### Сложность

Пусть \`n\` — общее число объектов и свойств в структуре. Благодаря WeakMap каждый объект клонируется ровно один раз, а каждое свойство просматривается один раз; проверка и запись в WeakMap — \`O(1)\`. Значит, время \`O(n)\`: структура в 10 раз больше — работы в 10 раз больше. Память тоже \`O(n)\`: сам клон того же размера, плюс WeakMap с записью на каждый объект, плюс стек рекурсии глубиной с уровень вложенности.

### Тест-кейсы

Все результаты проверены прогоном финальной версии:

\`\`\`ts
deepClone(42);                                   // 42
deepClone(null);                                 // null

const src = { d: new Date('2024-01-15T10:00:00Z'), m: new Map([['k', 1]]), s: new Set([1, 2]), re: /ab+c/gi };
const r = deepClone(src);
r.d !== src.d && r.d.getTime() === src.d.getTime(); // true — новая дата с тем же временем
r.m.get('k');                                    // 1, и r.m !== src.m
r.re.flags;                                      // 'gi'

class User { constructor(public name: string) {} greet() { return 'hi ' + this.name; } }
const u = deepClone(new User('Ann'));
u instanceof User;                               // true
u.greet();                                       // 'hi Ann'

const sym = Symbol('s');
deepClone({ [sym]: 1 })[sym];                    // 1 — символьный ключ скопирован

const fn = () => 1;
deepClone({ fn }).fn === fn;                     // true — функции не копируются, ссылка та же
\`\`\`

Плюс уже разобранные: цикл (\`c.self === c\`), общая ссылка (\`c.x === c.y\`), изменение вложенного объекта в клоне не задевает оригинал.

### \`JSON.parse(JSON.stringify())\` — почему это не ответ

\`\`\`ts
const shared = { id: 1 };
const data = {
  u: undefined, f() { return 1; }, [Symbol('s')]: 1,
  d: new Date('2024-01-15T10:00:00Z'), m: new Map([['k', 1]]), st: new Set([1, 2]),
  n: NaN, inf: Infinity, re: /ab+c/gi, sh1: shared, sh2: shared,
};
const j = JSON.parse(JSON.stringify(data));
// { d: '2024-01-15T10:00:00.000Z', m: {}, st: {}, n: null, inf: null, re: {}, sh1: { id: 1 }, sh2: { id: 1 } }
// j.sh1 === j.sh2 → false

JSON.stringify(a);         // TypeError: Converting circular structure to JSON
JSON.stringify({ b: 10n }); // TypeError: Do not know how to serialize a BigInt
JSON.parse(JSON.stringify(new User('Ann'))) instanceof User; // false, greet пропал
\`\`\`

Пять главных проблем, которые надо уметь назвать: теряет \`undefined\`, функции и символы; превращает \`Date\` в строку; превращает \`Map\`, \`Set\` и \`RegExp\` в \`{}\`; бросает исключение на циклах (и на \`BigInt\`); не сохраняет ни прототипы, ни общие ссылки. Бонусом \`NaN\` и \`Infinity\` становятся \`null\`. Для данных, которые и так пришли из JSON (ответ API без дат-объектов), трюк работает, но в общем случае — нет.

### \`structuredClone\` — что брать в продакшене

\`\`\`ts
const sc = structuredClone(a);
sc.self === sc;   // true — циклы поддерживаются
sc.x === sc.y;    // true — общие ссылки тоже

structuredClone({ d: new Date(0), m: new Map([['k', 1]]), s: new Set([1]), re: /x/g, u: undefined, n: NaN, big: 10n });
// всё на месте: Date, Map, Set, RegExp, undefined, NaN, 10n

structuredClone({ f() {} });          // DOMException с name 'DataCloneError': функцию клонировать нельзя
structuredClone(new User('Ann'));     // { name: 'Ann' } — instanceof User → false, методов нет
structuredClone({ [Symbol('s')]: 1 }); // {} — символьные ключи отбрасываются
\`\`\`

Встроенный \`structuredClone\` есть во всех современных браузерах и в Node.js с 17-й версии. Он поддерживает циклы, общие ссылки, \`Date\`, \`Map\`, \`Set\`, \`RegExp\`, \`BigInt\`, типизированные массивы, \`Error\`, \`Blob\` и многое другое. Ограничения: функции и DOM-узлы бросают \`DataCloneError\`, прототип не сохраняется (экземпляр класса становится обычным объектом), символьные ключи и неперечисляемые свойства отбрасываются, геттеры превращаются в обычные значения. Ручную реализацию на собеседовании спрашивают, чтобы проверить понимание ссылок, рекурсии и циклов.

### \`WeakMap\` — почему именно он

\`WeakMap\` принимает в качестве ключей только объекты — ровно то, что нам нужно кэшировать, — и держит их слабо: если на объект больше никто не ссылается, сборщик мусора может удалить и запись.

\`\`\`ts
const seen = new WeakMap<object, unknown>();
const key = { id: 1 };
seen.set(key, 'clone');
seen.get(key);   // 'clone'
seen.set('str' as any, 1); // TypeError: Invalid value used as weak map key
\`\`\`

Честная оговорка: в этой функции \`seen\` живёт только во время одного вызова и потом целиком становится мусором, так что обычный \`Map\` сработал бы так же. Слабые ссылки начинают играть роль, если кэш переживает вызов — например, вы переиспользуете его между клонированиями. \`WeakMap\` здесь скорее правильная привычка, чем необходимость.

### \`Reflect.ownKeys\` против \`Object.keys\`

\`\`\`ts
const sym = Symbol('meta');
const obj = { a: 1, [sym]: 2 };
Object.defineProperty(obj, 'hidden', { value: 3, enumerable: false });

Object.keys(obj);       // ['a']
Reflect.ownKeys(obj);   // ['a', 'hidden', Symbol(meta)]
\`\`\`

\`Object.keys\` теряет символьные и неперечисляемые ключи, поэтому финальная версия использует \`Reflect.ownKeys\`. Учтите побочный эффект: в клоне неперечисляемое свойство становится обычным перечисляемым, потому что копируется простым присваиванием.

### \`Object.create(Object.getPrototypeOf(value))\` — сохраняем класс

\`\`\`ts
class Money { constructor(public amount: number) {} format() { return \`\${this.amount} €\`; } }
const m = new Money(10);
const copy = Object.create(Object.getPrototypeOf(m)); // пустой объект с прототипом Money.prototype
copy.amount = m.amount;
copy instanceof Money;  // true
copy.format();          // '10 €'
\`\`\`

\`Object.create(proto)\` создаёт пустой объект, у которого прототип — \`proto\`, **не вызывая конструктор**. Поэтому методы класса доступны, а побочные эффекты конструктора не повторяются. Обратная сторона — если конструктор создаёт внутреннее состояние, которого нет в обычных свойствах, клон получится сломанным (см. нюансы про \`#private\` и типизированные массивы).

### Обход без рекурсии — для очень глубоких структур

В Node.js 20 финальная версия падала с \`RangeError\` примерно на 4 000 уровнях вложенности (например, связный список из 4 000 узлов); точный предел зависит от движка и размера стека. Если такие данные реальны, рекурсию заменяют явным стеком:

\`\`\`ts
function deepCloneIterative(root: any): any {
  if (root === null || typeof root !== 'object') return root;
  const seen = new WeakMap<object, any>();
  const makeEmpty = (v: any) => (Array.isArray(v) ? [] : Object.create(Object.getPrototypeOf(v)));
  const rootCopy = makeEmpty(root);
  seen.set(root, rootCopy);
  const stack: Array<[any, any]> = [[root, rootCopy]];   // пары «оригинал → его копия»
  while (stack.length) {
    const [src, dst] = stack.pop()!;
    for (const key of Reflect.ownKeys(src)) {
      const v = src[key];
      if (v === null || typeof v !== 'object') { dst[key] = v; continue; }
      if (seen.has(v)) { dst[key] = seen.get(v); continue; }
      const copy = makeEmpty(v);
      seen.set(v, copy);
      dst[key] = copy;
      stack.push([v, copy]);                             // содержимое скопируем позже
    }
  }
  return rootCopy;
}
// список глубиной 100 000 → скопирован целиком; циклы и общие ссылки сохраняются
\`\`\`

Вместо стека вызовов используется обычный массив в куче, а он ограничен только памятью. Для краткости здесь только объекты и массивы; \`Date\`, \`Map\`, \`Set\` добавляются так же, как в рекурсивной версии.

### Где это применяется на практике

- **Черновик формы редактирования**: открыли сущность в диалоге — работаем с клоном; «Отмена» просто выбрасывает клон, оригинал в сторе не тронут.
- **Undo/redo в редакторах и конструкторах дашбордов**: перед каждым изменением кладём снимок состояния в историю.
- **Тесты**: каждая спецификация получает свою копию фикстуры, чтобы мутация в одном тесте не ломала другой.
- **Конфигурации по умолчанию**: копируем шаблон настроек грида (колонки, фильтры, сортировка) перед тем, как пользователь его изменит, иначе правка «протечёт» во все гриды.
- **Передача данных в Web Worker**: \`postMessage\` использует тот же алгоритм structured clone, поэтому ограничения у них общие.
- **Где лучше НЕ клонировать глубоко**: обновление состояния в NgRx, NGXS и сигналах. Там используют иммутабельные обновления через spread с переиспользованием неизменённых веток — тогда \`OnPush\`, \`computed\` и мемоизированные селекторы видят, что изменилось, по смене ссылок.

## Важные нюансы и подводные камни

- **Клон кладётся в WeakMap после обхода.** Защита от циклов не работает вообще, хотя общие ссылки сохраняются — коварно, потому что половина тестов проходит.
- **Ответ «просто \`JSON.parse(JSON.stringify())\`».** Покажите, что знаете все пять его проблем, иначе вопрос на этом и закончится.
- **Потерянный прототип.** Без \`Object.create(Object.getPrototypeOf(...))\` экземпляр класса становится обычным объектом, методы исчезают. Так же ведёт себя \`structuredClone\`.
- **Ключи \`Map\` не клонируются** — если ключ объект, клон продолжит делить его с оригиналом. Но у клонирования ключей есть обратная сторона: \`clone.get(originalKey)\` вернёт \`undefined\`, потому что ключ в клоне — уже другой объект. Если ключи — это внешние сущности (DOM-элементы, объекты из другого стора), их осознанно оставляют теми же ссылками.
- **\`Object.keys\` вместо \`Reflect.ownKeys\`** теряет символьные и неперечисляемые ключи.
- **Ключ \`__proto__\` из JSON.** \`JSON.parse('{"__proto__": {"isAdmin": true}}')\` создаёт **собственное** свойство \`__proto__\`. Присваивание \`clone['__proto__'] = ...\` в финальной версии меняет прототип клона: собственного ключа в клоне нет, зато \`clone.isAdmin === true\` (проверено). Это загрязнение прототипа одного объекта; лечится записью через \`Object.defineProperty(clone, key, { value, writable: true, enumerable: true, configurable: true })\`.
- **\`Date\` не попадает в кэш.** \`{ a: d, b: d }\` с одной датой превратится в две разные даты: \`clone.a === clone.b\` → \`false\`. Обычно безвредно, но формально общая ссылка теряется.
- **Разреженные массивы и свойства массива.** \`for...of\` по \`[1, , 3]\` даёт \`undefined\` на месте дырки, и в клоне она становится настоящим элементом; дополнительные свойства массива (\`arr.total = 3\`) не копируются.
- **Геттеры вычисляются один раз.** \`{ get now() {...} }\` в клоне станет обычным свойством со значением на момент клонирования — так же делает и \`structuredClone\`.
- **Внутренние слоты ломают клон.** Типизированные массивы, \`Blob\`, \`URL\`, \`Promise\`, классы с \`#private\`-полями хранят данные не в обычных свойствах. Финальная версия даёт для \`new Uint8Array([1, 2])\` объект, у которого \`.length\` бросает \`TypeError\`, а для класса с \`#balance\` геттер бросает \`TypeError: Cannot read private member\`. \`structuredClone\` типизированные массивы копирует корректно.
- **Замороженность не сохраняется.** Клон \`Object.freeze(obj)\` уже не заморожен — для иммутабельного стора это важно.
- **Функции не клонируются.** В финальной версии остаётся та же ссылка (и замыкание на старые данные), \`structuredClone\` бросает \`DataCloneError\` — ни один подход не «копирует» функцию.
- **Глубокая рекурсия.** На структурах в тысячи уровней — \`RangeError\`; итеративный обход со своим стеком это снимает.
- **Цена.** Глубокая копия большого состояния на каждое изменение — это \`O(n)\` работы и памяти плюс смена всех ссылок, из-за которой перерисовывается всё, что зависит от данных.

**Плюсы:** полная изоляция копии, поддержка циклов и общих ссылок за \`O(1)\` на проверку, сохранение прототипов и символьных ключей, полный контроль над поддерживаемыми типами.
**Минусы:** легко забыть тип или крайний случай (\`__proto__\`, \`#private\`, типизированные массивы), рекурсия ограничена стеком, \`O(n)\` по времени и памяти, а в продакшене почти всегда лучше \`structuredClone\`.

## Как это спрашивают на собеседовании

**Главный вывод:** deep clone — рекурсивный обход с WeakMap «оригинал → клон», куда клон кладётся **до** обхода содержимого: это одним приёмом решает циклы и общие ссылки. Особые типы (\`Date\`, \`RegExp\`, \`Map\`, \`Set\`) требуют своих веток, прототип сохраняется через \`Object.create\`. В продакшене — \`structuredClone\`, но нужно знать, что он теряет прототипы и не клонирует функции.

Типичные формулировки: «Реализуйте глубокое копирование», «Почему \`JSON.parse(JSON.stringify())\` — плохой deep clone?», «Как обработать циклические ссылки?», «Чем \`structuredClone\` отличается от spread?».

Как вести себя во время кодинга: сначала уточните поддерживаемые типы и судьбу функций; напишите наивную рекурсию и сразу назовите её проблемы (циклы, общие ссылки, особые типы); добавьте WeakMap и подчеркните вслух, что клон кладётся в кэш до обхода; затем добавьте ветки типов и прототип; в конце прогоните пример с \`a.self = a\` и \`a.x = a.y = shared\` и назовите сложность.

Что могут спросить следом:

- *Почему \`WeakMap\`, а не \`Map\`?* — Ключи — объекты, слабые ссылки не мешают сборке мусора; правда, в рамках одного вызова и \`Map\` бы справился.
- *Что \`structuredClone\` делает с функциями и DOM-узлами?* — Бросает \`DataCloneError\`; ещё он теряет прототипы и символьные ключи.
- *Как избежать переполнения стека на очень вложенных структурах?* — Итеративный обход с явным стеком пар «оригинал → копия».
- *Почему не копировать всё состояние стора глубоко?* — Дорого и меняет все ссылки, ломая \`OnPush\` и мемоизацию; используют иммутабельные обновления со структурным разделением.
- *Какая сложность?* — \`O(n)\` по времени и памяти, где \`n\` — число объектов и свойств.

### Ответ на 1 минуту

> Задача — рекурсивно скопировать структуру так, чтобы клон не делил ссылок с оригиналом, не зависал на циклах и сохранял общие ссылки. \`JSON.parse(JSON.stringify())\` не годится: теряет \`undefined\`, функции и символы, превращает \`Date\` в строку, а \`Map\` и \`Set\` в пустые объекты, падает на циклах и не сохраняет ни прототипы, ни общие ссылки. Ключ решения — WeakMap «оригинал → клон»: перед копированием проверяю кэш, а новый пустой клон кладу туда до обхода содержимого, иначе цикл всё равно уйдёт в бесконечную рекурсию. Для \`Date\`, \`RegExp\`, \`Map\` и \`Set\` отдельные ветки, прототип сохраняю через \`Object.create\`, ключи беру через \`Reflect.ownKeys\`. Сложность \`O(n)\` по времени и памяти. В проде беру \`structuredClone\`: он поддерживает циклы и эти типы, но теряет прототипы и бросает \`DataCloneError\` на функциях.`,
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
      ru: `## В чём суть

Нужно написать \`memoize(fn, resolver)\` — обёртку, которая запоминает результаты функции по её аргументам. Вызвали с теми же аргументами — получили готовый ответ из кэша, не считая заново. \`resolver\` — настраиваемая функция, которая превращает аргументы в ключ кэша (по умолчанию \`JSON.stringify\`). Вторая половина вопроса важнее первой: мемоизация безопасна только для **детерминированных функций без побочных эффектов**, а неправильный ключ или неограниченный кэш превращают её в источник багов и утечек.

Аналогия: калькулятор с блокнотом. Посчитали 17 × 43 — записали ответ. Спросили то же самое второй раз — читаем из блокнота. Но есть два условия: пример должен быть записан **точно так же** (это проблема ключа кэша), и блокнот нельзя вести бесконечно (это проблема памяти). А если вопрос звучит «сколько сейчас времени», записывать ответ бессмысленно — это проблема нечистых функций.

**Какую проблему решает.** Одни и те же тяжёлые вычисления повторяются снова и снова: рекурсивный расчёт пересчитывает одни и те же подзадачи миллионы раз, ячейки большого грида форматируют одинаковые значения, метод в шаблоне Angular вызывается на каждой проверке изменений. Мемоизация меняет память на время: храним уже посчитанное и отдаём мгновенно.

## Словарик терминов

- **Мемоизация (memoization)** — кэширование результатов функции по её аргументам: повторный вызов с теми же аргументами возвращает сохранённый результат.
- **Чистая функция (pure function)** — функция, результат которой зависит только от аргументов и которая ничего не меняет снаружи.
- **Детерминированность** — одинаковые аргументы всегда дают одинаковый результат. \`Math.random()\` и \`Date.now()\` — недетерминированы.
- **Побочный эффект (side effect)** — любое действие кроме возврата значения: запрос в сеть, запись в переменную снаружи, лог, изменение DOM.
- **Ключ кэша (cache key)** — строка или объект, по которому ищется сохранённый результат. Строится из аргументов.
- **\`resolver\`** — функция, которая строит ключ из аргументов; в lodash так и называется.
- **Попадание / промах (cache hit / miss)** — ключ найден в кэше / не найден, и функцию приходится вызывать.
- **Коллизия ключей** — разные аргументы дали одинаковый ключ, и кэш возвращает чужой результат.
- **\`Map\`** — встроенный словарь с ключами любого типа, методами \`has\`, \`get\`, \`set\`, \`delete\` и порядком вставки.
- **\`WeakMap\`** — словарь с ключами-объектами, который не мешает сборщику мусора удалить объект-ключ.
- **Утечка памяти (memory leak)** — память, которую программа держит, хотя данные больше не нужны; у кэша без границ она растёт бесконечно.
- **LRU (Least Recently Used)** — политика вытеснения: при переполнении выкидывается то, что дольше всего не запрашивали.
- **TTL (time to live)** — срок жизни записи в кэше, после которого она считается устаревшей.
- **\`computed\`** — вычисляемый сигнал Angular: пересчитывается, только когда изменились сигналы, которые он читает, а в остальное время отдаёт сохранённое значение.
- **Чистый пайп (pure pipe)** — пайп Angular, который вызывается заново, только когда изменился входной аргумент (для объектов — ссылка).

## Как это работает под капотом

### Уточняющие вопросы перед кодом

- Функция гарантированно чистая? Если она читает внешнее состояние, мемоизация даст устаревшие ответы.
- Какие бывают аргументы: примитивы, объекты, функции? От этого зависит стратегия ключа.
- Аргументы-объекты сравнивать по содержимому или по ссылке (тот же самый объект)?
- Сколько уникальных аргументов ожидается? Если поток неограничен — нужен лимит (LRU) или \`WeakMap\`.
- Нужен ли способ сбросить кэш (\`clear\`), время жизни записей, поддержка асинхронных функций?

### Идея алгоритма простыми словами

1. Создаём кэш в замыкании, чтобы он жил между вызовами обёртки и был у каждой мемоизированной функции свой.
2. На вызове строим из аргументов ключ — функцией \`resolver\`.
3. Если ключ есть в кэше (\`has\`), сразу возвращаем сохранённое — это попадание.
4. Иначе вызываем оригинал через \`fn.apply(this, args)\`, чтобы сохранить \`this\`, кладём результат под ключом и возвращаем.
5. Отдаём наружу метод \`clear()\`, чтобы кэш можно было сбросить, когда меняются внешние условия.

### Шаг 1. Наивная версия

\`\`\`js
function memoize(fn) {
  const cache = {};
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache[key]) return cache[key];   // ❌ проверка «на истинность»
    return (cache[key] = fn(...args));
  };
}

let calls = 0;
const countChars = memoize(s => { calls++; return s.length; });
countChars(''); countChars(''); countChars('');
console.log(calls); // 3 — результат 0 ни разу не взят из кэша
\`\`\`

Работает для «хороших» результатов, но ломается на ложных: \`0\`, \`''\`, \`false\`, \`null\`, \`undefined\` считаются промахом, и функция пересчитывается каждый раз. Обычный объект как кэш тоже неудобен: у него есть унаследованные ключи вроде \`toString\`, а очистить его можно только заменой.

### Шаг 2. \`Map\` и проверка через \`has\`

\`\`\`js
function memoize(fn) {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key); // ✅ «есть ли ключ», а не «истинно ли значение»
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

let calls = 0;
const findUser = memoize(id => { calls++; return undefined; }); // «не нашли» — тоже результат
findUser(1); findUser(1);
console.log(calls); // 1
\`\`\`

\`Map\` не имеет унаследованных ключей, умеет \`clear()\` и \`size\`, а проверка \`has\` отличает «ключа нет» от «результат равен \`undefined\`». Остаются две проблемы: ключ всегда \`JSON.stringify\` (а он подходит не для всех аргументов) и потерян \`this\`.

### Шаг 3. Финальная версия: настраиваемый ключ, \`this\`, \`clear\`

Это код из сниппета под ответом:

\`\`\`ts
function memoize<T extends (...args: any[]) => any>(
  fn: T,
  resolver: (...args: Parameters<T>) => string = (...a) => JSON.stringify(a), // ключ по умолчанию
): T & { clear: () => void } {
  const cache = new Map<string, ReturnType<T>>();

  const memoized = function (this: unknown, ...args: Parameters<T>) {
    const key = resolver(...args);
    if (cache.has(key)) return cache.get(key)!;   // попадание
    const result = fn.apply(this, args);           // промах: считаем с сохранением this
    cache.set(key, result);
    return result;
  } as T & { clear: () => void };

  memoized.clear = () => cache.clear();
  return memoized;
}
\`\`\`

Тип \`T & { clear: () => void }\` говорит TypeScript: «это та же функция, что \`fn\`, плюс метод \`clear\`», поэтому мемоизированная версия подставляется везде, где ожидался оригинал. \`function\`, а не стрелка — чтобы у обёртки был свой \`this\` и его можно было передать в оригинал.

### Трассировка: числа Фибоначчи

Классический пример, где мемоизация меняет всё. Важно, что рекурсия вызывает **мемоизированную** версию — иначе внутренние вызовы пройдут мимо кэша:

\`\`\`ts
let calls = 0;
const fib: (n: number) => number = memoize((n: number): number => {
  calls++;
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
});
\`\`\`

Вызов \`fib(4)\` по шагам (ключ — \`JSON.stringify([n])\`):

\`\`\`text
fib(4): ключ "[4]" — промах → считаем fib(3) + fib(2)
  fib(3): "[3]" — промах → fib(2) + fib(1)
    fib(2): "[2]" — промах → fib(1) + fib(0)
      fib(1): "[1]" — промах → 1;  кэш: [1]=1
      fib(0): "[0]" — промах → 0;  кэш: [0]=0
    fib(2) = 1;  кэш: [2]=1
    fib(1): "[1]" — ПОПАДАНИЕ → 1
  fib(3) = 2;  кэш: [3]=2
  fib(2): "[2]" — ПОПАДАНИЕ → 1
fib(4) = 3;  кэш: [4]=3
\`\`\`

Оригинал вызван 5 раз (для n = 4, 3, 2, 1, 0) вместо 9 без кэша. На больших числах разница огромна:

\`\`\`ts
fibPlain(30); // 832040, функция вызвана 2 692 537 раз
fib(30);      // 832040, функция вызвана 31 раз
\`\`\`

Без кэша дерево вызовов растёт экспоненциально — каждый вызов порождает два. С кэшем каждое \`n\` считается ровно один раз.

### Сложность

Поиск и вставка в \`Map\` — в среднем \`O(1)\`: время не зависит от того, сколько записей в кэше. Но честная оценка одного вызова включает построение ключа: \`JSON.stringify\` проходит по всем аргументам, поэтому для большого объекта это \`O(размер аргументов)\`. Если аргумент — массив из 10 000 строк грида, сериализация может стоить дороже самого расчёта. Память — \`O(k)\`, где \`k\` — число уникальных ключей: каждый новый набор аргументов добавляет запись навсегда (пока не вызван \`clear\`).

### Тест-кейсы

Все результаты проверены прогоном финальной версии:

\`\`\`ts
let calls = 0, calls2 = 0, calls3 = 0;
const square = memoize((n: number) => { calls++; return n * n; });
square(4); square(4); square(5);
// 16 16 25, calls = 2 — второй square(4) взят из кэша

const findUser = memoize((id: number) => { calls2++; return undefined; });
findUser(1); findUser(1);            // оригинал вызван 1 раз — undefined тоже кэшируется

const g = memoize((x: number) => { calls3++; return x; });
g(1); g(1); g.clear(); g(1);         // calls3 = 2 — после clear считаем заново

let attempt = 0;
const flaky = memoize((x: number) => { attempt++; if (attempt === 1) throw new Error('fail'); return x * 2; });
flaky(1);                            // бросает 'fail' — исключение НЕ кэшируется
flaky(1);                            // 2 — вторая попытка вычисляет заново
\`\`\`

### \`JSON.stringify\` как ключ по умолчанию: где он ломается

\`\`\`ts
const area = memoize((r: { w: number; h: number }) => r.w * r.h);
area({ w: 2, h: 3 }); area({ h: 3, w: 2 });
// два вычисления: ключи '[{"w":2,"h":3}]' и '[{"h":3,"w":2}]' разные

const run = memoize((cb: () => number) => cb());
run(() => 1); // 1
run(() => 2); // 1 ❌ функция сериализуется в null, ключ '[null]' у обоих вызовов

const show = memoize((x: unknown) => String(x));
show(undefined); show(null); show(NaN); // 'undefined' все три раза — у всех ключ '[null]'

const size = memoize((m: Map<string, number>) => m.size);
size(new Map([['a', 1]])); // 1
size(new Map());           // 1 ❌ любой Map сериализуется в {}

const cyclic: any = {}; cyclic.self = cyclic;
area(cyclic);              // TypeError: Converting circular structure to JSON — падает сам resolver
\`\`\`

Итого: разный порядок полей даёт разные ключи для одинаковых по смыслу аргументов (кэш не работает); функции, \`undefined\`, \`NaN\`, \`Map\`, \`Set\` дают одинаковые ключи для разных аргументов (кэш **возвращает неправильный ответ** — это хуже); циклы роняют вызов. Для примитивов и простых объектов из JSON-данных ключ по умолчанию нормален.

### Свой \`resolver\`: ключ по смыслу

\`\`\`ts
// тяжёлый расчёт цены: продукт однозначно определяется id и версией
const priceFor = memoize(
  (p: Product) => heavyPricing(p),
  (p) => \`\${p.id}:\${p.version}\`,
);
\`\`\`

Хороший resolver быстрый и **однозначный**. Классическая ошибка — склейка без разделителя:

\`\`\`ts
const join = memoize((a: string, b: string) => \`\${a}|\${b}\`, (a, b) => String(a) + String(b));
join('ab', 'c'); // 'ab|c'
join('a', 'bc'); // 'ab|c' ❌ оба ключа — 'abc'
\`\`\`

Лечится разделителем, которого не может быть в данных, или \`JSON.stringify([a, b])\`.

### \`WeakMap\`: кэш по ссылке на объект

Если аргумент один и это объект, ключом может быть сам объект:

\`\`\`ts
function memoizeByRef<K extends object, R>(fn: (obj: K) => R) {
  const cache = new WeakMap<K, R>();
  return (obj: K): R => {
    if (cache.has(obj)) return cache.get(obj)!;
    const r = fn(obj);
    cache.set(obj, r);
    return r;
  };
}

const total = memoizeByRef((order: { items: number[] }) => order.items.reduce((s, x) => s + x, 0));
const o1 = { items: [10, 20] };
total(o1); total(o1);            // 30, 30 — второй раз из кэша
total({ items: [10, 20] });      // 30, но вычислено заново: другой объект — другой ключ
o1.items.push(5);
total(o1);                       // 30 ❌ объект мутировали, а ключ (ссылка) тот же
\`\`\`

Плюсы: ключ строится за \`O(1)\` без сериализации, а когда объект становится мусором, запись исчезает сама — утечки нет. Условие: данные должны быть **иммутабельными** (каждое изменение — новый объект), иначе кэш отдаст устаревший результат. В Angular-приложениях со стором и сигналами это условие обычно и так выполняется.

### Ограниченный кэш: мемоизация с LRU

\`\`\`ts
function memoizeLru<A extends unknown[], R>(fn: (...args: A) => R, max = 100) {
  const cache = new Map<string, R>();
  return (...args: A): R => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      const v = cache.get(key)!;
      cache.delete(key); cache.set(key, v);           // «освежили» — ключ переехал в конец
      return v;
    }
    const v = fn(...args);
    cache.set(key, v);
    if (cache.size > max) cache.delete(cache.keys().next().value!); // выкинули самый давний
    return v;
  };
}
// max = 2, вызовы 1, 2, 1, 3, 1, 2 → оригинал вызван 4 раза:
// 3 вытеснил 2 (1 только что использовали), а следующий 2 — промах
\`\`\`

\`Map\` хранит ключи в порядке вставки, поэтому первый ключ итератора — самый давно использованный. Память ограничена \`max\` записями при любом потоке аргументов.

### Мемоизация асинхронных функций

Кэшировать нужно **промис**, а не результат: тогда два одновременных вызова получат один и тот же запрос. Но базовая версия закэширует и отклонённый промис — и ошибка станет вечной:

\`\`\`ts
const badCached = memoize(fetchUser);  // первый вызов падает с 503
await badCached(1);  // Error: 503
await badCached(1);  // Error: 503 — снова, хотя сервер уже ожил; запрос даже не отправлен

function memoizeAsync<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const cache = new Map<string, Promise<R>>();
  return (...args: A): Promise<R> => {
    const key = JSON.stringify(args);
    const hit = cache.get(key);
    if (hit) return hit;
    const p = fn(...args).catch((err) => {
      cache.delete(key);                 // ошибку не кэшируем — следующий вызов попробует снова
      throw err;
    });
    cache.set(key, p);
    return p;
  };
}
const good = memoizeAsync(fetchUser);
good(1) === good(1);  // true — параллельные вызовы делят один запрос
await good(1);        // 503 → запись удалена
await good(1);        // { id: 1, name: 'Ann' } — новая попытка
\`\`\`

### Мемоизация в Angular: \`computed\`, чистые пайпы, селекторы

\`\`\`ts
const items = signal([10, 20, 30]);
let runs = 0;
const total = computed(() => { runs++; return items().reduce((s, x) => s + x, 0); });

total(); total(); total();          // 60 60 60, runs = 1
items.update(list => [...list, 40]);
total(); total();                   // 100 100, runs = 2
\`\`\`

\`computed\` — мемоизация, которая сама знает свои зависимости: он запоминает, какие сигналы прочитал, и пересчитывается только после их изменения. Поэтому он безопаснее ручного memoize — нельзя забыть сбросить кэш при смене данных. Чистый пайп (\`pure: true\`, по умолчанию) вызывает \`transform\` заново только при изменении входа (для объектов — ссылки), то есть помнит один последний результат на каждое место в шаблоне. Селекторы NgRx (\`createSelector\`) тоже мемоизируют результат по последним аргументам. Ручной \`memoize\` нужен для тяжёлых чистых вычислений вне реактивного контекста: утилиты форматирования, расчёты в сервисах, парсинг.

### Где это применяется на практике

- **Форматирование в больших гридах**: одна и та же дата или сумма в тысячах ячеек форматируется один раз через мемоизированный \`Intl.DateTimeFormat\`/\`Intl.NumberFormat\` или готовую функцию форматирования.
- **Вызовы методов в шаблонах**: \`{{ statusLabel(row) }}\` выполняется на каждой проверке изменений; заменяем на чистый пайп, \`computed\` или мемоизированную функцию.
- **Тяжёлые расчёты дашборда**: агрегаты, перцентили, группировки по одним и тем же данным при переключении вкладок.
- **Дедупликация запросов**: одновременные \`getUser(42)\` из разных компонентов получают один промис или Observable.
- **Парсинг и компиляция**: разбор шаблона, регулярного выражения, markdown — по исходной строке.
- **Рекурсивные алгоритмы с перекрывающимися подзадачами** (динамическое программирование): Фибоначчи, редакционное расстояние, раскладка дерева.

## Важные нюансы и подводные камни

- **Неограниченный кэш.** Мемоизация функции от произвольной строки (поисковый запрос, id из ленты) — утечка памяти с гарантией. Нужен LRU, TTL или \`WeakMap\`.
- **Мемоизация нечистой функции.** Если функция зависит от даты, случайности или внешнего стейта, кэш будет уверенно врать: \`memoize(() => currentExchangeRate)\` вернёт \`1.1\` и после того, как курс стал \`1.3\` (проверено).
- **Коллизии ключей.** Resolver \`String(a) + String(b)\` склеит \`('ab','c')\` и \`('a','bc')\`; \`JSON.stringify\` сводит функции, \`undefined\`, \`NaN\`, \`Map\` и \`Set\` к \`null\` или \`{}\`. Коллизия хуже промаха: она возвращает **чужой** результат.
- **\`JSON.stringify\` на объектах с разным порядком полей** даёт разные ключи для одинаковых по смыслу аргументов — кэш не срабатывает вообще.
- **\`this\` не входит в ключ.** Если мемоизировать метод на прототипе, кэш общий для всех экземпляров: \`usd.convert(100)\` при курсе 2 даёт 200, а \`eur.convert(100)\` при курсе 3 — тоже 200 из кэша (проверено). Решение — кэш на экземпляр (мемоизировать в конструкторе) или включать идентификатор экземпляра в ключ.
- **Кэш отдаёт одну и ту же ссылку.** Если вызывающий код мутирует возвращённый объект или массив, следующий вызов получит испорченный результат. Возвращайте иммутабельные данные.
- **Мемоизация дешёвых функций.** Построение ключа и поиск дороже, чем \`a + b\`, — получаем замедление и расход памяти без пользы.
- **Ключ дороже расчёта.** \`JSON.stringify\` большого массива на каждый вызов съедает весь выигрыш; используйте \`id\`, версию или \`WeakMap\` по ссылке.
- **Рекурсия мимо кэша.** Если внутри рекурсивной функции вызывается исходная, а не мемоизированная версия, кэш используется только на верхнем уровне.
- **Исключения не кэшируются** — это правильно: следующая попытка вычислит заново. А вот отклонённые промисы базовая версия кэширует, поэтому для асинхронных функций запись при ошибке надо удалять.
- **\`WeakMap\` и мутации.** Кэш по ссылке работает только с иммутабельными данными: мутированный объект с той же ссылкой получит старый результат.

**Плюсы:** резко ускоряет повторные тяжёлые вычисления (экспоненциальную рекурсию превращает в линейную), простая реализация, дедуплицирует одновременные асинхронные запросы.
**Минусы:** расход памяти и риск утечки, устаревшие данные у нечистых функций, коллизии и промахи из-за неправильного ключа, накладные расходы на построение ключа, ручное управление сбросом кэша.

## Как это спрашивают на собеседовании

**Главный вывод:** memoize — это \`Map\` в замыкании «ключ из аргументов → результат», проверка через \`has\` и вызов через \`apply\`. Вся сложность — в ключе и в границах кэша: функция должна быть чистой, ключ однозначным и дешёвым, а кэш — ограниченным (LRU, TTL или \`WeakMap\`). В Angular реактивную мемоизацию дают \`computed\` и чистые пайпы.

Типичные формулировки: «Реализуйте memoize», «Какие риски у мемоизации?», «Как мемоизировать функцию с объектом в аргументах?», «Чем \`computed\` лучше ручного кэша?».

Как вести себя во время кодинга: уточните, чистая ли функция и какие бывают аргументы; напишите версию с \`Map\` и \`has\`, сразу оговорив, почему не \`if (cache[key])\`; добавьте \`resolver\`, \`apply\` и \`clear\`; прогоните \`fib(4)\` вслух, показав промахи и попадания; закончите списком рисков — память, устаревание, коллизии, накладные расходы — и решениями для каждого.

Что могут спросить следом:

- *Как мемоизировать асинхронную функцию?* — Кэшировать промис, а не результат, и удалять запись при отклонении.
- *Почему \`computed\` безопаснее ручного memoize?* — Он сам отслеживает зависимости и пересчитывается при их изменении; забыть сбросить кэш невозможно.
- *Как ограничить память?* — LRU с \`max\` записей на \`Map\` с порядком вставки, TTL для свежести или \`WeakMap\` для объектных ключей.
- *Чем плох \`JSON.stringify\` как ключ?* — Зависит от порядка полей, сводит функции и \`undefined\` к \`null\` (коллизии), падает на циклах и стоит \`O(размер аргументов)\`.
- *Чем отличается чистый пайп от мемоизации?* — Он помнит только последний вход и результат на каждое место в шаблоне.

### Ответ на 1 минуту

> Мемоизация кэширует результат чистой функции по аргументам: повторный вызов с теми же аргументами отдаёт сохранённое значение. Реализую через \`Map\` в замыкании: \`resolver\` строит ключ, по умолчанию \`JSON.stringify(args)\`; если \`has(key)\` — возвращаю из кэша, иначе вызываю \`fn.apply(this, args)\`, сохраняю и возвращаю; плюс метод \`clear\`. Проверяю именно \`has\`, чтобы кэшировались и \`0\`, и \`undefined\`. Поиск \`O(1)\`, но построение ключа стоит \`O(размер аргументов)\`, память \`O(k)\` по числу ключей. Риски: неограниченный кэш — утечка, лечится LRU или \`WeakMap\`; нечистая функция даёт устаревшие ответы; плохой ключ даёт коллизии — \`JSON.stringify\` сводит функции и \`undefined\` к \`null\`; для дешёвых функций кэш медленнее расчёта. Для асинхронных функций кэширую промис и удаляю его при ошибке. В Angular предпочитаю \`computed\` и чистые пайпы.`,
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
      ru: `## В чём суть

Нужно написать \`curry(fn)\` — функцию, которая превращает \`f(a, b, c)\` в **цепочку вызовов**, которую можно кормить аргументами по частям: \`f(a)(b)(c)\`, \`f(a, b)(c)\`, \`f(a)(b, c)\` и \`f(a, b, c)\` дают один и тот же результат. Оригинал выполняется только тогда, когда накопится достаточно аргументов. Задача проверяет понимание замыканий, свойства \`fn.length\`, \`this\` и неизменяемости накопленных данных.

Аналогия: автомат с газировкой, которому нужны три монеты. Кинул одну — ждёт. Кинул ещё две — наливает. Ему всё равно, кидали вы по одной или сразу парой: важно, что накопилось три. А частичное применение — это когда вы заранее кинули одну монету и отдали автомат коллеге: ему осталось докинуть две.

**Какую проблему решает.** Часто у функции есть «настроечные» аргументы, которые известны заранее, и «рабочие», которые приходят позже: поле и значение для фильтра известны при настройке грида, а строка таблицы — только при фильтрации. Каррирование позволяет зафиксировать первые аргументы и получить специализированную функцию (\`filterBy('status', 'active')\`), которую удобно передать в \`filter\`, \`map\` или собрать в цепочку \`pipe\` — а такие цепочки работают только с функциями от одного аргумента.

## Словарик терминов

- **Каррирование (currying)** — превращение функции от нескольких аргументов в цепочку функций, принимающих их по частям. Названо в честь логика Хаскелла Карри.
- **Частичное применение (partial application)** — фиксация части аргументов функции; результат — новая функция, ждущая остальные.
- **Арность (arity)** — число параметров, которые функция ожидает.
- **\`fn.length\`** — встроенное свойство функции: сколько параметров объявлено **до** первого параметра со значением по умолчанию или rest-параметра.
- **Rest-параметр (\`...args\`)** — параметр, собирающий все оставшиеся аргументы в массив.
- **Вариадическая функция (variadic)** — функция, принимающая любое число аргументов, например \`Math.max\`.
- **Замыкание (closure)** — функция помнит переменные места, где создана; так промежуточная функция помнит уже собранные аргументы.
- **\`this\` (контекст вызова)** — объект, на котором вызвана функция; теряется при вызове «голой» функции.
- **\`fn.apply(ctx, args)\`** — вызвать функцию с заданным \`this\` и массивом аргументов.
- **\`Function.prototype.bind\`** — создаёт копию функции с зафиксированным \`this\` и, при желании, первыми аргументами.
- **Унарная функция (unary)** — функция от одного аргумента.
- **Композиция (\`pipe\` / \`compose\`)** — объединение функций в цепочку, где результат одной становится аргументом следующей.
- **Плейсхолдер (placeholder)** — специальное значение (в lodash — \`_\`), которое позволяет пропустить аргумент и передать его позже.

## Как это работает под капотом

### Уточняющие вопросы перед кодом

- Можно ли передавать несколько аргументов за раз (\`f(1, 2)(3)\`) или строго по одному? В этой задаче — несколько.
- Откуда брать арность: из \`fn.length\` или передавать явно? Для функций с rest и значениями по умолчанию \`fn.length\` не подходит.
- Что делать с лишними аргументами (\`f(1, 2, 3, 4)\` при арности 3)? Обычно передать в оригинал как есть.
- Нужно ли сохранять \`this\`, чтобы каррировать методы объектов?
- Можно ли переиспользовать промежуточную функцию: \`const add1 = c(1)\` и потом \`add1(2)(3)\`, \`add1(10)(20)\`? Должно быть можно.
- Нужны ли плейсхолдеры, как в lodash? Обычно нет.

### Идея алгоритма простыми словами

1. Узнаём, сколько аргументов нужно оригиналу, — это \`fn.length\`.
2. Оборачиваем оригинал в функцию \`curried\`. При каждом вызове смотрим: накопленных аргументов уже не меньше \`fn.length\`?
3. Если хватает — вызываем оригинал через \`fn.apply(this, args)\`: \`apply\` здесь сохраняет \`this\`, иначе каррированный метод объекта потеряет контекст.
4. Если не хватает — возвращаем новую функцию, которая держит уже собранные аргументы в замыкании и ждёт остальные.
5. Когда приходят новые аргументы, склеиваем **новый** массив \`[...args, ...rest]\` и снова идём на шаг 2. Новый, а не изменённый старый — поэтому промежуточную функцию можно вызывать много раз независимо.

### Шаг 1. Наивная версия: аргументы по одному

\`\`\`js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn(...args);
    return (next) => curried(...args, next);    // ❌ принимает ровно один аргумент
  };
}

const sum = (a, b, c) => a + b + c;
const c = curry(sum);
c(1)(2)(3);   // 6
c(1, 2)(3);   // 6
c(1)(2, 3);   // function ❌ тройка молча потерялась, результат так и не вычислен
\`\`\`

Промежуточная функция объявлена как \`(next) => ...\` и забирает только первый аргумент, всё остальное выбрасывает. Ошибки нет — просто вместо числа возвращается функция, и баг всплывает где-то дальше.

### Шаг 2. Типичная ошибка: общий изменяемый массив

\`\`\`js
function curry(fn) {
  const acc = [];                 // ❌ один массив на все цепочки
  return function next(...args) {
    acc.push(...args);
    if (acc.length >= fn.length) return fn(...acc);
    return next;
  };
}

const p = curry(sum)(1);
p(2)(3);     // 6
p(10)(20);   // TypeError: p(...) is not a function
\`\`\`

Вторая цепочка дописала \`10\` в тот же массив \`[1, 2, 3]\`: длина стала 4, оригинал вызвался сразу и вернул число \`6\`, а вызов \`(20)\` на числе упал. Мораль: накопленные аргументы нельзя мутировать, каждая промежуточная функция должна получать свою копию.

### Шаг 3. Финальная версия

Это код из сниппета под ответом:

\`\`\`ts
function curry<T extends (...args: any[]) => any>(fn: T) {
  return function curried(this: unknown, ...args: any[]): any {
    if (args.length >= fn.length) {          // аргументов хватает
      return fn.apply(this, args);           // вызываем оригинал, сохраняя this
    }
    // не хватает: ждём остальные; args — в замыкании, склейка создаёт НОВЫЙ массив
    return (...rest: any[]) => curried.apply(this, [...args, ...rest]);
  };
}

const sum = (a: number, b: number, c: number) => a + b + c;
const c = curry(sum);
c(1)(2)(3);     // 6
c(1, 2)(3);     // 6
c(1)(2, 3);     // 6
c(1, 2, 3);     // 6
\`\`\`

Промежуточная функция — стрелка, поэтому её \`this\` берётся из вызова \`curried\`, который её создал, и передаётся дальше через \`apply\`. А \`(...rest)\` принимает любое число аргументов — это и даёт «по нескольку за раз».

### Трассировка

\`c(1)(2, 3)\`:

\`\`\`text
c(1)        curried: this=undefined, args=[1]; 1 < fn.length (3)
            → вернуть стрелку A1, в замыкании args=[1]
A1(2, 3)    rest=[2, 3] → curried.apply(this, [1, 2, 3])
            curried: args=[1, 2, 3]; 3 >= 3 → fn.apply(this, [1, 2, 3]) → 6
\`\`\`

\`c(1)(2)(3)\`:

\`\`\`text
c(1)   args=[1]       → 1 < 3 → стрелка A1 (помнит [1])
A1(2)  args=[1, 2]    → 2 < 3 → стрелка A2 (помнит [1, 2])
A2(3)  args=[1, 2, 3] → 3 >= 3 → sum(1, 2, 3) = 6
\`\`\`

Переиспользование промежуточной функции:

\`\`\`text
const add1 = c(1);   add1 помнит [1]
add1(2)(3)           [1] + [2] → [1, 2] → [1, 2, 3] → 6
add1(10)(20)         [1] + [10] → [1, 10] → [1, 10, 20] → 31   ← массив add1 не тронут
\`\`\`

### Сложность

Каждый вызов в цепочке делает сравнение и копирует накопленные аргументы в новый массив — это \`O(k)\`, где \`k\` — сколько аргументов уже собрано. Если подавать \`n\` аргументов строго по одному, суммарно копируется \`1 + 2 + … + n\` элементов, то есть \`O(n²)\`. Звучит страшно, но \`n\` здесь — арность функции, обычно 2–5, так что на практике это константа. Память — \`O(n)\` на цепочку: каждая промежуточная функция держит свою копию собранных аргументов.

### Тест-кейсы

Все результаты проверены прогоном финальной версии:

\`\`\`ts
const c = curry((a: number, b: number, c: number) => a + b + c);
c(1)(2)(3);            // 6
c(1, 2)(3);            // 6
c(1)(2, 3);            // 6
c(1, 2, 3);            // 6
c(1)(2)(3, 4);         // 6 — лишний аргумент передан в оригинал и проигнорирован
c()(1)()(2)(3);        // 6 — пустые вызовы ничего не добавляют, просто возвращают новую функцию
typeof c(1)(2);        // 'function' — аргументов ещё не хватает

const add1 = c(1);
add1(2)(3);            // 6
add1(10)(20);          // 31 — промежуточные функции независимы

const obj = { base: 10, add: curry(function (this: any, a: number, b: number) { return this.base + a + b; }) };
obj.add(1)(2);         // 13 — this сохранён по всей цепочке
const f = obj.add(1);
f(2);                  // 13 — даже если промежуточную функцию вызвать отдельно
\`\`\`

### \`fn.length\`: откуда берётся арность и где она врёт

\`\`\`ts
function f(a, b) {}
f.length;                          // 2
((a, b = 2, c) => {}).length;      // 1 — считаются параметры только до первого со значением по умолчанию
((...args) => {}).length;          // 0 — rest не считается
(({ a, b }) => {}).length;         // 1 — деструктуризация — это один параметр

const weird = (a: number, b = 1, ...rest: number[]) => a + b;
curry(weird)(5);                   // 6 — сработало после первого же аргумента: b взят по умолчанию
\`\`\`

\`fn.length\` — единственный способ узнать арность без подсказки, но он отражает **объявление**, а не реальное использование. Поэтому для функций с параметрами по умолчанию и rest арность передают явно.

### Явная арность — каррирование вариадических функций

\`\`\`ts
function curryN<T extends (...args: any[]) => any>(fn: T, arity = fn.length) {
  return function curried(this: unknown, ...args: any[]): any {
    if (args.length >= arity) return fn.apply(this, args);
    return (...rest: any[]) => curried.apply(this, [...args, ...rest]);
  };
}

const total = (...nums: number[]) => nums.reduce((s, x) => s + x, 0);
curry(total)();              // 0 — length 0, оригинал вызывается сразу, без аргументов
curryN(total, 3)(1)(2)(3);   // 6
curryN(weird, 2)(5)(10);     // 15
\`\`\`

Вариадическую функцию нельзя каррировать по \`fn.length\` — непонятно, когда остановиться. Но с явной арностью можно: вы сами говорите «жди трёх аргументов». Так устроен \`_.curry(func, arity)\` в lodash.

### \`this\` и \`fn.apply\`

\`this\` определяется в момент вызова: в \`obj.add(1)\` он равен \`obj\`. В финальной версии первый вызов \`curried\` получает \`this = obj\`, стрелка запоминает его лексически (у стрелок нет своего \`this\`), и \`apply\` передаёт его до самого оригинала. Если бы промежуточная функция была обычной \`function\`, её \`this\` при вызове \`f(2)\` был бы \`undefined\`, и метод упал бы.

\`\`\`ts
function greet(this: { name: string }, greeting: string) { return \`\${greeting}, \${this.name}\`; }
greet.apply({ name: 'Anna' }, ['Hi']); // 'Hi, Anna'
\`\`\`

### Каррирование против \`bind\`

\`\`\`ts
const sum = (a: number, b: number, c: number) => a + b + c;
const add1 = sum.bind(null, 1);
add1(2, 3);   // 6
add1(2);      // NaN — bind ничего не ждёт: 1 + 2 + undefined
\`\`\`

\`bind\` фиксирует \`this\` и часть аргументов **один раз** и возвращает обычную функцию, которая выполнится сразу при следующем вызове, сколько бы аргументов ни пришло. Каррированная функция знает свою арность и ждёт, пока аргументов не станет достаточно. Для простого «зафиксировать первый аргумент» в продакшене часто хватает \`bind\` или стрелки \`(b, c) => sum(1, b, c)\` — они понятнее при чтении и в стектрейсе.

### Композиция: зачем нужны унарные функции

\`\`\`ts
const pipe = (...fns: Array<(x: any) => any>) => (x: any) => fns.reduce((v, fn) => fn(v), x);
const add = curry((a: number, b: number) => a + b);
const mul = curry((a: number, b: number) => a * b);

const calc = pipe(add(1), mul(10));
calc(4);   // 50 — (4 + 1) * 10
\`\`\`

\`pipe\` передаёт по цепочке одно значение, поэтому каждое звено должно быть функцией от одного аргумента. Каррирование превращает \`add(a, b)\` в такое звено: \`add(1)\` — «прибавь единицу». Тот же принцип — в RxJS: \`map(x => x * 2)\` — это частично применённый оператор, функция, которая ждёт исходный Observable:

\`\`\`ts
const double = map((x: number) => x * 2);
typeof double;                              // 'function'
double(of(1, 2, 3)).subscribe(console.log); // 2, 4, 6
\`\`\`

### Где это применяется на практике

- **Фильтры и предикаты в гридах**:

\`\`\`ts
const filterBy = curry((field: string, value: unknown, row: Record<string, unknown>) => row[field] === value);
const rows = [{ id: 1, status: 'active' }, { id: 2, status: 'blocked' }, { id: 3, status: 'active' }];
rows.filter(filterBy('status', 'active')).map(r => r.id); // [1, 3]
\`\`\`

- **Фабрики валидаторов в Angular-формах**: \`Validators.minLength(3)\` — по сути частичное применение: настройка сейчас, контрол — потом. Свои валидаторы пишут так же: \`const maxAmount = (limit: number) => (control: AbstractControl) => ...\`.
- **Операторы RxJS**: все пайпаемые операторы — функции, которые сначала получают настройки, а потом источник; поэтому их можно складывать в \`pipe\` и выносить в переменные.
- **Фабрики селекторов в NgRx**: \`selectOrderById = (id: string) => createSelector(selectOrders, orders => orders[id])\` — параметр фиксируется сейчас, состояние стора придёт потом.
- **Конфигурируемые утилиты**: логгер с зафиксированным уровнем и модулем \`log('error')('auth')(message)\`, форматтер валюты \`formatMoney('EUR')(amount)\`.
- **Функциональные библиотеки**: Ramda каррирует все свои функции, lodash предлагает \`_.curry\` с плейсхолдерами и пакет \`lodash/fp\` с автокаррированием.

## Важные нюансы и подводные камни

- **\`fn.length\` врёт.** Rest-параметры и параметры после первого значения по умолчанию в него не входят — каррирование сработает раньше срока: \`curry(weird)(5)\` вернул \`6\` после первого же аргумента.
- **Вариадические функции** нельзя каррировать по \`fn.length\`: при длине 0 оригинал вызывается сразу. Решение — явная арность вторым параметром, как в \`_.curry(func, arity)\`.
- **Потеря \`this\`.** Без \`apply\` или без стрелки, лексически замыкающей \`this\`, каррированный метод объекта отваливается.
- **Мутация накопленных аргументов.** Общий массив с \`push\` ломает переиспользование промежуточных функций — вторая цепочка видит аргументы первой. Только \`[...args, ...rest]\`.
- **Аргументы «по одному» вместо «по нескольку».** Промежуточная функция вида \`(next) => ...\` молча выбрасывает лишние аргументы: \`c(1)(2, 3)\` возвращает функцию вместо \`6\`.
- **Вызов без аргументов.** \`c()\` не двигает счётчик и просто возвращает новую функцию. Это не бесконечный цикл, но легко получить функцию там, где ждали значение, и не заметить.
- **Передача в \`map\` и \`filter\` без частичного применения.** Эти методы передают в колбэк три аргумента \`(value, index, array)\`. \`[1, 2, 3].map(add)\` при арности 2 вызывает \`add(1, 0)\`, \`add(2, 1)\`, \`add(3, 2)\` и даёт \`[1, 3, 5]\`, а не массив функций. А вот \`[1, 2, 3].map(add(10))\` даёт ожидаемое \`[11, 12, 13]\`.
- **Типы теряются.** В сниппете результат имеет тип \`any\`, и TypeScript не поймает \`c(1)('x')\`. Точная типизация каррирования с «несколькими аргументами за раз» требует сложных рекурсивных типов — их пишут авторы библиотек.
- **Отладка.** Стек превращается в цепочку одинаковых \`curried\` и безымянных стрелок — трейс читать тяжело.
- **Читаемость в команде.** \`format('EUR')(2)(amount)\` понятен автору, но не всем коллегам. Глубокое каррирование в обычном Angular-коде — скорее запах, чем преимущество.

**Плюсы:** удобное частичное применение и переиспользование конфигурации без классов, естественная стыковка с \`pipe\`, \`map\`, \`filter\` и операторами RxJS, промежуточные функции независимы и переиспользуемы.
**Минусы:** зависимость от ненадёжного \`fn.length\`, сложная типизация, тяжёлая отладка, хуже читаемость для команды, небольшие накладные расходы на создание промежуточных функций.

## Как это спрашивают на собеседовании

**Главный вывод:** curry — это рекурсивная обёртка: если накоплено не меньше \`fn.length\` аргументов, вызываем оригинал через \`apply\`, иначе возвращаем функцию, которая склеивает **новый** массив \`[...args, ...rest]\` и вызывает себя снова. Слабое место — \`fn.length\`, который не учитывает rest и параметры по умолчанию; лечится явной арностью.

Типичные формулировки: «Реализуйте curry», «Сделайте так, чтобы \`sum(1)(2)(3)\` и \`sum(1, 2)(3)\` работали одинаково», «Чем каррирование отличается от частичного применения и \`bind\`?».

Как вести себя во время кодинга: уточните, можно ли передавать по нескольку аргументов и как определять арность; напишите условие «хватает — вызываем» и рекурсивный возврат функции; вслух объясните, почему \`apply\` и почему новый массив, а не \`push\`; прогоните \`c(1)(2, 3)\` и переиспользование \`add1\`; в конце назовите ограничение \`fn.length\` и предложите явную арность.

Что могут спросить следом:

- *Чем каррирование отличается от частичного применения через \`bind\`?* — Карри даёт цепочку и знает свою арность, \`bind\` фиксирует часть аргументов один раз и ничего не ждёт.
- *Как каррировать функцию с rest-параметрами?* — Передать арность явно: \`curryN(fn, 3)\`.
- *Почему промежуточная функция — стрелка?* — Она лексически берёт \`this\` из вызова \`curried\` и передаёт его дальше через \`apply\`.
- *Где это встречается в Angular?* — Фабрики валидаторов, пайпаемые операторы RxJS, предикаты фильтров.
- *Какая сложность?* — Каждый шаг копирует накопленные аргументы, \`O(k)\`; при арности 2–5 это константа.

### Ответ на 1 минуту

> Каррирование превращает функцию от нескольких аргументов в цепочку, которую можно вызывать по частям: \`f(1)(2)(3)\`, \`f(1, 2)(3)\` и \`f(1)(2, 3)\` эквивалентны. Реализация опирается на \`fn.length\`: если накопленных аргументов не меньше, вызываю оригинал через \`fn.apply(this, args)\`, чтобы сохранить контекст; если меньше — возвращаю стрелку, которая склеивает новый массив \`[...args, ...rest]\` и рекурсивно вызывает \`curried\`. Именно новый массив, а не \`push\`, иначе промежуточные функции начнут делить состояние. Каждый шаг копирует накопленное, но при арности 2–5 это константа. Польза — частичное применение и композиция: \`pipe\` работает с унарными функциями, так же устроены операторы RxJS и фабрики валидаторов. Главное ограничение: \`fn.length\` не учитывает rest и параметры по умолчанию, поэтому для них передаю арность явно, как в lodash.`,
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
      ru: `## В чём суть

Нужно написать класс \`EventEmitter\` с четырьмя методами: \`on\` (подписаться на событие), \`off\` (отписаться), \`once\` (подписаться на одно срабатывание) и \`emit\` (разослать событие подписчикам). «Типобезопасный» значит, что TypeScript проверяет и имя события, и форму данных: опечатка в имени или не тот тип payload — ошибка компиляции. Задача проверяет знание паттерна Observer, структур \`Map\`/\`Set\`, дженериков и того, где у такого кода прячутся утечки и баги порядка вызовов.

Аналогия: доска объявлений или подъездный чат. Кто-то пишет «привезли воду» — реагируют те, кто подписан. Отправитель не знает поимённо, кто читает; читатель может выйти в любой момент. Но если при переезде из чата не выйти, уведомления продолжат приходить вечно — это ровно утечка памяти в эмиттере.

**Какую проблему решает.** Без эмиттера модуль, который знает о событии, вынужден напрямую вызывать всех, кому оно интересно: сервис корзины импортирует бейдж в шапке, аналитику, рекомендации — и любая новая реакция требует правки отправителя. Эмиттер разрывает эту связь: отправитель говорит «корзина изменилась», а кто и как реагирует — решают сами подписчики. Это и есть **слабая связанность**: части системы можно добавлять и убирать, не трогая друг друга.

## Словарик терминов

- **Observer (Наблюдатель)** — паттерн, где объект-издатель хранит список подписчиков и уведомляет их о событиях.
- **PubSub (publish/subscribe, издатель/подписчик)** — разновидность Observer с именованными каналами-событиями; издатель и подписчики не знают друг о друге.
- **Событие (event)** — именованный сигнал «что-то произошло», например \`'order:paid'\`, с данными-payload.
- **Payload (полезная нагрузка)** — данные, которые передаются вместе с событием: \`{ id: '42' }\`.
- **Обработчик, подписчик (handler, listener)** — функция, которую эмиттер вызывает при событии.
- **Функция отписки (unsubscribe)** — функция, которую возвращает \`on\`; её вызов снимает подписку.
- **Слабая связанность (loose coupling)** — модули взаимодействуют, не имея прямых ссылок друг на друга.
- **\`Map\`** — словарь «ключ → значение» с ключами любого типа; здесь «имя события → набор обработчиков».
- **\`Set\`** — коллекция уникальных значений с добавлением, удалением и проверкой за \`O(1)\`.
- **Дженерик (generic)** — параметр типа: \`EventEmitter<Events>\` — эмиттер для конкретной карты событий.
- **\`keyof Events\`** — тип-объединение всех ключей объекта-типа: имена событий.
- **\`Events[K]\`** — индексированный тип: тип payload для события \`K\`.
- **Утечка памяти (memory leak)** — объект больше не нужен, но на него есть ссылка, и сборщик мусора не может его удалить.
- **Синхронный вызов** — \`emit\` вызывает обработчики прямо сейчас, один за другим, и возвращает управление только после всех.
- **\`Subject\`** — объект RxJS, который одновременно Observable и «эмиттер»: у него есть \`next\`, \`error\`, \`complete\` и все операторы.
- **\`EventTarget\` / \`CustomEvent\`** — встроенный в браузер механизм событий (\`addEventListener\`, \`dispatchEvent\`) и событие с произвольными данными в поле \`detail\`.

## Как это работает под капотом

### Уточняющие вопросы перед кодом

- Что возвращает \`on\`: ничего или функцию отписки? Лучше функцию отписки — это главный способ избежать утечек.
- Может ли один и тот же обработчик подписаться дважды? Если да — вызывать его дважды (как в Node.js) или один раз?
- \`emit\` синхронный или асинхронный?
- Что делать, если обработчик бросил исключение: прервать рассылку или продолжить для остальных?
- Что происходит, если во время \`emit\` обработчик подписывает или отписывает кого-то? Видит ли это текущая рассылка?
- Нужна ли проверка типов payload на этапе компиляции?

### Идея алгоритма простыми словами

1. Внутри храним \`Map\`: имя события → \`Set\` обработчиков. \`Set\`, а не массив, — чтобы не было дублей, а удаление было \`O(1)\`.
2. \`on\` кладёт обработчик в набор и сразу **возвращает функцию отписки**, поэтому вызывающему не нужно отдельно хранить ссылку на обработчик.
3. \`off\` удаляет обработчик из набора. Забыли вызвать — обработчик и всё его замыкание живут вечно.
4. \`once\` оборачивает обработчик в функцию-обёртку, которая **сначала снимает саму себя**, потом вызывает оригинал; в наборе лежит именно обёртка.
5. \`emit\` берёт **копию** набора и синхронно обходит её — так подписки и отписки во время рассылки не ломают обход.
6. Каждый вызов обёрнут в \`try/catch\`, чтобы падение одного подписчика не остановило остальных.

### Шаг 1. Минимальный эмиттер — и сразу утечка

\`\`\`ts
class Emitter {
  private handlers: Record<string, Array<(p: any) => void>> = {};
  on(event: string, fn: (p: any) => void) { (this.handlers[event] ??= []).push(fn); }
  emit(event: string, payload: any) { (this.handlers[event] ?? []).forEach(fn => fn(payload)); }
}

const bus = new Emitter();
class CartBadge {
  count = 0;
  constructor(bus: Emitter, public name: string) {
    bus.on('cart:changed', (n: number) => { this.count = n; console.log(\`\${this.name} updated to \${n}\`); });
  }
}
// пользователь трижды зашёл на страницу и ушёл — компонент создан и «уничтожен» три раза
for (let i = 1; i <= 3; i++) new CartBadge(bus, \`badge#\${i}\`);
bus.emit('cart:changed', 5);
// badge#1 updated to 5
// badge#2 updated to 5
// badge#3 updated to 5
\`\`\`

Рассылка работает, но отписаться нельзя. Каждый «уничтоженный» компонент остаётся в памяти — его держит замыкание обработчика внутри шины — и продолжает реагировать на события. Через час работы в SPA таких зомби-обработчиков могут быть сотни.

### Шаг 2. Добавляем \`off\` и \`once\` на массивах — и теряем обработчики

\`\`\`ts
class Emitter {
  private handlers: Record<string, Array<(p: any) => void>> = {};
  on(event: string, fn: (p: any) => void) { (this.handlers[event] ??= []).push(fn); }
  off(event: string, fn: (p: any) => void) {
    const list = this.handlers[event];
    const i = list?.indexOf(fn) ?? -1;
    if (i >= 0) list!.splice(i, 1);
  }
  once(event: string, fn: (p: any) => void) {
    const wrap = (p: any) => { this.off(event, wrap); fn(p); };
    this.on(event, wrap);
  }
  emit(event: string, payload: any) {
    for (const fn of this.handlers[event] ?? []) fn(payload);   // ❌ обходим живой массив
  }
}

const bus = new Emitter();
bus.once('saved', () => console.log('toast: сохранено'));
bus.once('saved', () => console.log('analytics: save'));
bus.on('saved', () => console.log('refresh list'));

bus.emit('saved', null);
// toast: сохранено
// refresh list                ← analytics пропущен
bus.emit('saved', null);
// analytics: save             ← сработал только сейчас, а refresh list пропущен
\`\`\`

Первая обёртка \`once\` удалила себя через \`splice\`, массив сдвинулся влево, и итератор, перейдя к индексу 1, перепрыгнул через \`analytics\`. Во второй рассылке то же самое случилось с \`refresh list\`. Баг плавающий: зависит от порядка подписок, и в тестах его легко не заметить.

### Шаг 3. Финальная версия

Это код из сниппета под ответом:

\`\`\`ts
type Handler<P> = (payload: P) => void;

class EventEmitter<Events extends Record<string, any>> {
  private listeners = new Map<keyof Events, Set<Handler<any>>>(); // событие → набор обработчиков

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);          // функция отписки
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    this.listeners.get(event)?.delete(handler);
  }

  once<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    const wrap: Handler<Events[K]> = (p) => { this.off(event, wrap); handler(p); }; // сначала снять себя
    return this.on(event, wrap);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    // copy to allow mutation during iteration
    for (const handler of [...(this.listeners.get(event) ?? [])]) {
      try { handler(payload); } catch (e) { console.error(e); }  // один упал — остальные получат
    }
  }
}
\`\`\`

\`[...set]\` делает снимок обработчиков на момент начала рассылки: что бы ни происходило с набором дальше, обход идёт по неизменному массиву. \`once\` возвращает функцию отписки от \`on\` — она снимает именно обёртку, поэтому отменить \`once\` до срабатывания можно.

### Трассировка

\`\`\`ts
type AppEvents = { 'order:paid': { id: string; amount: number }; 'user:logout': void };
const bus = new EventEmitter<AppEvents>();

const off = bus.on('order:paid', p => console.log('A got', p.id));
bus.once('order:paid', p => console.log('once got', p.id));
bus.emit('order:paid', { id: '42', amount: 100 });
bus.emit('order:paid', { id: '43', amount: 50 });
off();
bus.emit('order:paid', { id: '44', amount: 10 });
\`\`\`

\`\`\`text
on(A)          listeners: 'order:paid' → Set{A}; возвращена off = () => off('order:paid', A)
once(B)        создана обёртка W; Set{A, W}
emit(42)       снимок [A, W]
                 A(42)  → "A got 42"
                 W(42)  → off(W): Set{A}; затем B(42) → "once got 42"
emit(43)       снимок [A] → "A got 43"
off()          Set{} — пустой набор остаётся в Map
emit(44)       снимок [] → ничего
\`\`\`

Вывод: \`A got 42\`, \`once got 42\`, \`A got 43\` — ровно это печатает прогон.

### Типобезопасность: \`keyof\` и \`Events[K]\`

Дженерик \`Events\` — это карта «имя события → тип payload». Метод \`emit<K extends keyof Events>(event: K, payload: Events[K])\` связывает два параметра: TypeScript выводит \`K\` из имени события и требует, чтобы payload имел тип \`Events[K]\`.

\`\`\`ts
bus.on('order:paid', (p) => p.amount.toFixed(2));   // p выведен как { id: string; amount: number }
bus.emit('order:payed', { id: '42', amount: 100 });
// error TS2345: Argument of type '"order:payed"' is not assignable to parameter of type 'keyof AppEvents'.
bus.emit('order:paid', { id: 42, amount: 100 });
// error TS2322: Type 'number' is not assignable to type 'string'.
bus.on('order:paid', (p) => p.total);
// error TS2339: Property 'total' does not exist on type '{ id: string; amount: number; }'.
\`\`\`

Опечатка в имени становится ошибкой компиляции, а не тихо потерянным событием, которое никто никогда не поймает. Ограничение \`Record<string, any>\`, а не \`Record<string, unknown>\`, выбрано не случайно: карту событий, описанную через \`interface\`, TypeScript принимает только с \`any\` — у интерфейсов нет неявной индексной сигнатуры (проверено \`tsc\`).

### Сложность

\`on\`, \`off\` — \`O(1)\`: добавление и удаление в \`Set\` и поиск в \`Map\` не зависят от числа подписчиков. \`emit\` — \`O(k)\`, где \`k\` — число подписчиков этого события: копия набора плюс один вызов на каждого. Копирование удваивает константу, но не меняет порядок роста. Память — \`O(n)\`, где \`n\` — общее число активных подписок.

### Тест-кейсы

Все результаты проверены прогоном финальной версии:

- \`on\` + \`emit\` → обработчик получает payload.
- Вызов функции, которую вернул \`on\`, → следующие \`emit\` обработчик не получает.
- \`once\` + два \`emit\` → обработчик сработал ровно один раз.
- Функция отписки от \`once\` до первого \`emit\` → обработчик не сработает никогда.
- \`off(event, исходныйHandler)\` для подписки через \`once\` → **не** снимает её: в наборе лежит обёртка, обработчик всё равно сработает.
- Один и тот же обработчик подписан дважды → вызывается один раз (\`Set\` убирает дубли).
- Первый обработчик бросает исключение → в консоль пишется ошибка, второй обработчик всё равно получает событие.
- \`emit\` события без подписчиков → ничего не происходит, ошибок нет.
- Первый обработчик во время \`emit\` отписывает второго → второй **получает** текущее событие (снимок), но не получит следующее.
- Обработчик события \`a\` вызывает \`emit('b')\` → обработчики \`b\` выполняются **до** оставшихся обработчиков \`a\`: порядок \`a1\`, \`b1\`, \`a2\`.

### Почему копия перед обходом обязательна

С массивом без копии удаление сдвигает элементы, и итератор перепрыгивает через обработчик (шаг 2). С \`Set\` без копии проблема другая: элементы, **добавленные** во время обхода, тоже будут посещены в этом же обходе.

\`\`\`ts
// Set без копии: обработчик, который во время рассылки подписывает новый обработчик
bus.on('tick', function spawn() { calls++; bus.on('tick', () => spawn()); });
bus.emit('tick');
// каждый новый обработчик тут же вызывается в этой же рассылке и добавляет следующий —
// бесконечный цикл (в проверке пришлось остановить его искусственно на 6-м вызове)
\`\`\`

Снимок \`[...set]\` фиксирует, кто получит **это** событие. Такая же семантика у \`EventEmitter\` в Node.js. А в DOM-шном \`EventTarget\` всё наоборот: обработчик, снятый во время рассылки, текущее событие **не** получит — проверено на встроенном \`EventTarget\`. Обе семантики допустимы; важно знать, какую выбрали вы, и сказать об этом на собеседовании.

### \`Map\` и \`Set\` вместо объекта и массива

\`\`\`ts
const handlers = new Set<() => void>();
const h = () => console.log('h');
handlers.add(h); handlers.add(h);
handlers.size;       // 1 — дубль не добавился
handlers.delete(h);  // true, за O(1), без indexOf и splice
\`\`\`

\`Map\` принимает ключи любого типа (в том числе \`symbol\`) и не имеет унаследованных ключей вроде \`toString\`, в отличие от обычного объекта. \`Set\` даёт уникальность и удаление за \`O(1)\` вместо \`indexOf\` + \`splice\` за \`O(k)\`. Обратная сторона: подписать один обработчик дважды «специально» нельзя — в Node.js, где обработчики хранятся в массиве, можно.

### \`EventEmitter\` в Node.js

Встроенный класс \`node:events\` устроен похоже: \`on\`/\`off\`/\`once\`/\`emit\`, синхронная рассылка по снимку массива. Две особенности, о которых любят спрашивать:

\`\`\`ts
import { EventEmitter } from 'node:events';
const ee = new EventEmitter();
for (let i = 0; i < 11; i++) ee.on('data', () => {});
// MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 data listeners added...
ee.emit('error', new Error('no handler'));
// бросает исключение: событие 'error' без подписчика роняет вызывающий код
\`\`\`

По умолчанию больше 10 подписчиков на одно событие считается подозрением на утечку, и Node.js печатает предупреждение (лимит меняется через \`setMaxListeners\`). Событие \`'error'\` без подписчика бросается как исключение.

### \`EventTarget\`, \`CustomEvent\` и \`AbortSignal\` в браузере

\`\`\`ts
const target = new EventTarget();
const ac = new AbortController();
target.addEventListener('cart', (e) => console.log((e as CustomEvent).detail), { signal: ac.signal });
target.dispatchEvent(new CustomEvent('cart', { detail: { count: 3 } })); // { count: 3 }
ac.abort();
target.dispatchEvent(new CustomEvent('cart', { detail: { count: 4 } })); // ничего — подписка снята

target.addEventListener('ready', () => console.log('once'), { once: true });
\`\`\`

Встроенный механизм умеет то же самое: \`once: true\` вместо \`once\`, а \`signal\` от \`AbortController\` снимает сразу много подписок одним \`abort()\`. Через \`window.dispatchEvent(new CustomEvent(...))\` часто общаются микрофронтенды, которые не делят общий JS-код. Минус — нет типизации payload: \`detail\` приходится приводить вручную.

### Angular: \`@Output()\`, \`output()\` и \`Subject\`

\`EventEmitter\` из \`@angular/core\` для \`@Output()\` — это наследник RxJS \`Subject\` (в типах: \`interface EventEmitter<T> extends Subject<T>, OutputRef<T>\`). Современная функция \`output()\` возвращает \`OutputEmitterRef\` — лёгкий эмиттер с \`emit\` и \`subscribe\`, уже **не** Subject; Angular сам снимает подписки при уничтожении компонента.

\`\`\`ts
@Component({ selector: 'app-order-row', template: \`<button (click)="paid.emit(order().id)">Оплатить</button>\` })
export class OrderRowComponent {
  order = input.required<Order>();
  paid = output<string>();                  // родитель: (paid)="onPaid($event)"
}
\`\`\`

Для общения между несвязанными компонентами в Angular обычно делают сервис-шину на \`Subject\`:

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class CartEvents {
  private readonly changed = new Subject<number>();
  readonly changed$ = this.changed.asObservable();   // наружу — только чтение
  notify(count: number) { this.changed.next(count); }
}

// в компоненте
inject(CartEvents).changed$.pipe(takeUntilDestroyed()).subscribe(n => this.count.set(n));
\`\`\`

Отличие \`Subject\` от простого эмиттера: это поток с операторами (\`filter\`, \`debounceTime\`, \`switchMap\`), с каналами \`error\` и \`complete\` и с готовыми средствами отписки (\`takeUntilDestroyed\`, \`async\`-пайп). Если же используете свой эмиттер, функция отписки из \`on\` подходит в \`DestroyRef.onDestroy\` без обёрток — у неё та же сигнатура \`() => void\`:

\`\`\`ts
const off = bus.on('order:paid', p => this.lastPaid.set(p.id));
inject(DestroyRef).onDestroy(off);
\`\`\`

### Где это применяется на практике

- **\`@Output()\` и \`output()\` в Angular** — дочерний компонент сообщает родителю «строку выбрали», «форму отправили».
- **Шина событий между модулями**: «пользователь разлогинился» — очищают кэши, закрывают WebSocket, сбрасывают сторы.
- **Микрофронтенды**: общение через \`CustomEvent\` на \`window\`, когда приложения не делят код.
- **Обёртки над сторонними библиотеками**: графики, карты, редакторы публикуют события (\`zoom\`, \`select\`), а Angular-компонент подписывается.
- **WebSocket-клиент**: входящее сообщение по типу превращается в типизированное событие \`'price:update'\`, \`'order:filled'\`.
- **Node.js**: потоки, HTTP-сервер, процессы — всё построено на \`EventEmitter\`.

## Важные нюансы и подводные камни

- **Забытый \`off\` — утечка памяти.** Обработчик держит замыкание, а через него компонент, DOM и данные. Главный минус ручных эмиттеров; поэтому \`on\` возвращает функцию отписки, а в Angular её вешают на \`DestroyRef.onDestroy\`.
- **Мутация списка во время \`emit\`.** С массивом обработчики пропускаются, с живым \`Set\` новые обработчики вызываются в той же рассылке и могут зациклиться. Копируйте набор перед обходом.
- **Одно исключение рвёт рассылку.** Без \`try/catch\` подписчики после упавшего не получат событие. Но и \`console.error\` — компромисс: ошибка не дойдёт до глобального \`ErrorHandler\` и мониторинга, а в тестах её легко не заметить.
- **\`once\` нельзя снять по оригинальному обработчику** — в наборе лежит обёртка. Поэтому \`once\` тоже обязан возвращать функцию отписки.
- **Анонимный обработчик не снять через \`off\`.** \`off('b', () => ...)\` передаёт новую функцию, которой нет в наборе; подписка останется. Используйте функцию отписки из \`on\`.
- **\`emit\` синхронный.** Тяжёлый подписчик блокирует и остальных, и вызывающий код (обработчик на 200 мс задерживает \`emit\` на 200 мс). Асинхронность вводят руками: \`queueMicrotask\` или \`setTimeout\` внутри обработчика.
- **Вложенный \`emit\` меняет порядок.** Если обработчик \`a\` эмитит \`b\`, обработчики \`b\` выполнятся раньше оставшихся обработчиков \`a\` — порядок «в глубину», который удивляет при отладке.
- **Снимок против DOM-семантики.** В этой реализации отписанный во время рассылки обработчик текущее событие получит, в \`EventTarget\` — нет.
- **Пустые наборы остаются в \`Map\`.** После отписки всех обработчиков ключ события и пустой \`Set\` живут дальше. Для фиксированного списка событий это неважно; для динамических имён (\`'row:123:changed'\`) стоит удалять пустые наборы в \`off\`.
- **События без данных.** Для \`'user:logout': void\` всё равно приходится писать \`emit('user:logout', undefined)\`; улучшается типом-кортежем аргументов, но это усложняет сигнатуру.
- **Шина событий как «магия».** По коду не видно, кто на что реагирует; при десятках событий отладка превращается в поиск по строкам. Для состояния лучше подходят сервисы с сигналами или стор, эмиттер — для действительно разовых уведомлений.

**Плюсы:** слабая связанность модулей, простая реализация, \`O(1)\` подписка и отписка, проверка имён и payload на этапе компиляции, функция отписки удобно встраивается в \`DestroyRef.onDestroy\`.
**Минусы:** легко получить утечку без отписки, неочевидный поток данных и сложная отладка, синхронный \`emit\` блокирует, нет операторов, завершения и канала ошибок, как у RxJS \`Subject\`.

## Как это спрашивают на собеседовании

**Главный вывод:** EventEmitter — это Observer/PubSub на \`Map<событие, Set<обработчик>>\`: \`on\` добавляет и возвращает функцию отписки, \`off\` удаляет, \`once\` подписывает самоснимающуюся обёртку, \`emit\` обходит **копию** набора с \`try/catch\`. Типобезопасность дают дженерик-карта событий, \`keyof\` и \`Events[K]\`. Главный риск — утечки из-за забытой отписки.

Типичные формулировки: «Реализуйте EventEmitter с on/off/once/emit», «Как сделать его типобезопасным?», «Чем EventEmitter отличается от RxJS Subject?», «Где в Angular используется этот паттерн?».

Как вести себя во время кодинга: уточните, что возвращает \`on\` и что делать с ошибками и мутациями во время \`emit\`; начните с \`Map\` и \`Set\` и объясните выбор; напишите \`on\` с функцией отписки, затем \`once\` через обёртку; в \`emit\` сначала сделайте копию и проговорите, какой баг она предотвращает; в конце добавьте дженерики и покажите на примере, как опечатка в имени события ловится компилятором.

Что могут спросить следом:

- *Чем это отличается от RxJS \`Subject\`?* — \`Subject\` — поток с операторами, \`complete\` и каналом \`error\`; эмиттер — просто рассылка по именам.
- *Почему \`@Output()\` в Angular — Subject, а \`output()\` — нет?* — Исторически \`EventEmitter\` наследует \`Subject\`; новый \`output()\` возвращает лёгкий \`OutputEmitterRef\` без RxJS, подписки на него Angular снимает сам.
- *Как сделать \`emit\` асинхронным?* — Откладывать вызовы через \`queueMicrotask\` или \`setTimeout\`, понимая, что порядок и стек ошибок изменятся.
- *Как найти утечку подписок?* — Считать подписчиков на событие (как предупреждение \`MaxListenersExceededWarning\` в Node.js) и смотреть снимки памяти в DevTools.
- *Почему \`Set\`, а не массив?* — Уникальность и удаление за \`O(1)\`; минус — нельзя подписать один обработчик дважды.

### Ответ на 1 минуту

> EventEmitter — это реализация Observer, он же PubSub: издатель эмитит именованные события, подписчики реагируют, друг о друге не зная, отсюда слабая связанность. Внутри у меня \`Map\` «событие → \`Set\` обработчиков»: \`on\` добавляет и возвращает функцию отписки, \`off\` удаляет, \`once\` подписывает обёртку, которая сначала снимает себя, а \`emit\` синхронно обходит копию набора, оборачивая каждый вызов в \`try/catch\`. Копия нужна, потому что подписчик может отписаться или подписать кого-то прямо во время рассылки. Типобезопасность даёт дженерик-карта «событие → payload» с \`keyof\` и \`Events[K]\`: опечатка в имени — ошибка компиляции. \`on\` и \`off\` за \`O(1)\`, \`emit\` — \`O(k)\`. Главный риск — утечки из-за забытой отписки, поэтому функцию из \`on\` я вешаю на \`DestroyRef.onDestroy\`. В Angular этот паттерн — \`output()\` и сервисы-шины на \`Subject\`.`,
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
      ru: `## В чём суть

Нужно написать класс \`LRUCache\` с методами \`get(key)\` и \`put(key, value)\`: кэш хранит не больше \`capacity\` элементов, а при переполнении выбрасывает тот, к которому **дольше всего не обращались** (Least Recently Used). Ключевое требование — и \`get\`, и \`put\` за \`O(1)\`, то есть без перебора всех элементов. Задача проверяет знание структур данных (хеш-таблица, двусвязный список), умение использовать порядок вставки \`Map\` в JavaScript и понимание, зачем кэшу граница.

Аналогия: книжная полка на десять книг. Взяли книгу почитать — ставите её обратно с ближнего края. Принесли новую, а места нет — убираете книгу с дальнего края: её дольше всех не трогали. Обратите внимание: важно не когда книгу купили, а когда её последний раз брали в руки.

**Какую проблему решает.** Кэш без границы в долгоживущем SPA — это утечка памяти с гарантией: пользователь листает сотни карточек, открывает десятки отчётов, и всё это навсегда остаётся в памяти вкладки. Нужна граница, а вместе с ней — правило, что выбрасывать. LRU выбрасывает то, что, скорее всего, больше не понадобится: если к записи давно не обращались, шанс, что обратятся снова, ниже, чем у недавно использованных.

## Словарик терминов

- **Кэш (cache)** — быстрое хранилище уже полученных данных, чтобы не получать их заново.
- **Вытеснение (eviction)** — удаление записи из заполненного кэша, чтобы освободить место для новой.
- **LRU (Least Recently Used)** — политика вытеснения: удаляется запись, к которой дольше всего не было обращений.
- **\`capacity\` (ёмкость)** — максимальное число записей в кэше.
- **Попадание / промах (hit / miss)** — запись нашлась в кэше / не нашлась.
- **Хеш-таблица (hash map)** — структура, которая по ключу находит значение в среднем за \`O(1)\`; в JS это \`Map\`.
- **Двусвязный список (doubly linked list)** — цепочка узлов, где каждый узел знает и следующего, и предыдущего соседа; поэтому узел можно вырезать за \`O(1)\`.
- **Фиктивный узел (sentinel)** — пустой узел-заглушка в начале и конце списка, чтобы не проверять «а вдруг соседа нет».
- **Порядок вставки \`Map\`** — \`Map\` перебирает ключи в том порядке, в каком они были добавлены впервые.
- **Итератор (\`map.keys()\`)** — объект, который выдаёт ключи по одному через \`next()\`; первый вызов \`next()\` даёт самый старый ключ.
- **Амортизированное \`O(1)\`** — отдельная операция иногда может быть дороже, но в среднем на длинной серии каждая стоит константу.
- **FIFO (First In, First Out)** — вытеснение по времени добавления, без учёта обращений.
- **LFU (Least Frequently Used)** — вытеснение самого **редко** используемого (по числу обращений), а не самого давнего.
- **TTL (time to live)** — срок жизни записи, после которого она считается устаревшей независимо от обращений.

## Как это работает под капотом

### Уточняющие вопросы перед кодом

- Что возвращать при промахе: \`undefined\`, \`-1\` (как в задаче LeetCode 146) или бросать ошибку?
- Считается ли \`put\` существующего ключа «обращением» — делает ли он ключ самым свежим? Обычно да.
- Можно ли использовать порядок вставки \`Map\` или нужно реализовать двусвязный список вручную? Многие интервьюеры просят показать оба варианта.
- Какая \`capacity\` допустима: что делать с 0 и отрицательными значениями?
- Нужен ли TTL (срок жизни записей) и колбэк при вытеснении, чтобы освобождать ресурсы?

### Идея алгоритма простыми словами

1. Нам нужны две вещи одновременно: быстро найти запись по ключу и быстро знать, какая запись самая старая по обращениям.
2. Поиск по ключу за \`O(1)\` даёт хеш-таблица. Порядок обращений хранит упорядоченная структура: в начале — самые старые, в конце — самые свежие.
3. При \`get\` находим запись и **переносим её в конец** — она стала самой свежей.
4. При \`put\` существующего ключа обновляем значение и тоже переносим в конец.
5. При \`put\` нового ключа в полный кэш сначала удаляем запись из **начала** (самую старую), потом добавляем новую в конец.
6. В JavaScript \`Map\` совмещает обе роли: это хеш-таблица, которая помнит порядок вставки. «Перенести в конец» — это \`delete\` + \`set\`, «самая старая» — первый ключ итератора.

### Шаг 1. \`Map\` без перестановки — получился FIFO

\`\`\`ts
class FifoCache<K, V> {
  private map = new Map<K, V>();
  constructor(private capacity: number) {}
  get(key: K) { return this.map.get(key); }       // ❌ обращение не меняет порядок
  put(key: K, value: V) {
    if (!this.map.has(key) && this.map.size >= this.capacity) {
      this.map.delete(this.map.keys().next().value as K);
    }
    this.map.set(key, value);
  }
}

const c = new FifoCache<string, string>(2);
c.put('a', 'A'); c.put('b', 'B');
c.get('a');            // обратились к 'a'
c.put('c', 'C');
// ключи: ['b', 'c'] — вытеснен 'a', хотя его только что использовали
\`\`\`

Ограничение размера есть, но вытесняется самый **давно добавленный**, а не самый давно использованный. Популярная запись, которую читают постоянно, вылетит просто потому, что её добавили первой.

### Шаг 2. Финальная версия: \`delete\` + \`set\` переносят ключ в конец

Это код из сниппета под ответом:

\`\`\`ts
class LRUCache<K, V> {
  private map = new Map<K, V>();                  // порядок ключей: от старого к свежему
  constructor(private capacity: number) {}

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;     // промах
    const value = this.map.get(key)!;
    this.map.delete(key);     // remove...
    this.map.set(key, value); // ...and re-insert => most recently used
    return value;
  }

  put(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);  // обновление: убрать, чтобы вставить в конец
    else if (this.map.size >= this.capacity) {
      const oldest = this.map.keys().next().value as K; // least recently used
      this.map.delete(oldest);
    }
    this.map.set(key, value);
  }
}

const cache = new LRUCache<string, string>(2);
cache.put('a', 'A');
cache.put('b', 'B');
cache.get('a');        // 'A'; порядок ['b', 'a'] — самым старым стал 'b'
cache.put('c', 'C');   // вытеснен 'b'; порядок ['a', 'c']
cache.get('b');        // undefined
\`\`\`

Вытеснение идёт по последнему обращению, а не по времени добавления: \`a\` добавили раньше, но трогали позже — значит, он ценнее. При обновлении существующего ключа (\`put('a', ...)\`) вытеснения нет: размер не растёт, ключ просто переезжает в конец.

### Классика из учебника: хеш-таблица + двусвязный список

На собеседовании могут сказать «без трюков с \`Map\`» — тогда нужен вариант, который работает в любом языке:

\`\`\`ts
interface Node<K, V> { key: K; value: V; prev: Node<K, V> | null; next: Node<K, V> | null; }

class LinkedLRU<K, V> {
  private map = new Map<K, Node<K, V>>();   // ключ → узел списка (порядок Map не используем)
  private head: Node<K, V>;                 // фиктивный узел: после него — самый свежий
  private tail: Node<K, V>;                 // фиктивный узел: перед ним — самый старый

  constructor(private capacity: number) {
    this.head = { key: null as any, value: null as any, prev: null, next: null };
    this.tail = { key: null as any, value: null as any, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  private unlink(node: Node<K, V>) {        // вырезать узел: O(1), соседи известны
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  private addToFront(node: Node<K, V>) {    // вставить сразу после head
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this.unlink(node);
    this.addToFront(node);                  // стал самым свежим
    return node.value;
  }

  put(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.unlink(existing);
      this.addToFront(existing);
      return;
    }
    if (this.map.size >= this.capacity) {
      const lru = this.tail.prev!;          // самый старый — прямо перед tail
      this.unlink(lru);
      this.map.delete(lru.key);             // поэтому узел хранит и свой ключ
    }
    const node: Node<K, V> = { key, value, prev: null, next: null };
    this.map.set(key, node);
    this.addToFront(node);
  }
}
\`\`\`

Почему список именно **двусвязный**: чтобы вырезать узел, нужно поправить ссылку у предыдущего соседа. В односвязном списке предыдущего соседа пришлось бы искать проходом от головы — это \`O(n)\`. Здесь у узла есть \`prev\`, поэтому вырезание — четыре присваивания. Фиктивные \`head\` и \`tail\` избавляют от проверок «список пуст» и «узел крайний». Узел хранит свой \`key\`, чтобы при вытеснении хвоста удалить его и из хеш-таблицы. Обе реализации проверены на 200 случайных сериях по 500 операций — результаты \`get\` совпали во всех.

### Трассировка

Последовательность из LeetCode 146 при \`capacity = 2\` (порядок — от самого старого к самому свежему):

\`\`\`text
put(1, 1)   [1]
put(2, 2)   [1, 2]
get(1)  → 1 [2, 1]        1 стал самым свежим
put(3, 3)   размер 2 >= 2 → вытесняем первый ключ 2 → [1, 3]
get(2)  → undefined       2 уже вытеснен
put(4, 4)   вытесняем первый ключ 1 → [3, 4]
get(1)  → undefined
get(3)  → 3 [4, 3]
get(4)  → 4 [3, 4]
\`\`\`

Итог \`get\`: \`1, undefined, undefined, 3, 4\` — так печатают обе реализации.

### Сложность

\`get\` — один \`has\`, один \`get\`, один \`delete\`, один \`set\`: каждая операция \`Map\` в среднем \`O(1)\`, значит, и весь \`get\` — \`O(1)\`. \`put\` — то же плюс, возможно, \`keys().next()\` и ещё один \`delete\`, тоже \`O(1)\`. Спецификация ECMAScript формально требует от \`Map\` лишь доступа «быстрее линейного», но движки реализуют её хеш-таблицей, поэтому на практике это константа (амортизированно: таблица иногда перестраивается). Память — \`O(capacity)\`: кэш **по определению** не может вырасти больше заданной ёмкости, и это главное отличие от обычного кэша.

### Тест-кейсы

Все результаты проверены прогоном финальной версии:

- \`capacity = 2\`: \`put a\`, \`put b\`, \`get a\`, \`put c\` → вытеснен \`b\`, ключи \`['a', 'c']\`.
- Последовательность LeetCode 146 → \`get\` возвращают \`1, undefined, undefined, 3, 4\`.
- Обновление: \`put a=1\`, \`put b=2\`, \`put a=10\` → порядок \`['b', 'a']\`, вытеснения нет; затем \`put c\` вытесняет \`b\`, \`get a\` → \`10\`.
- \`get\` отсутствующего ключа → \`undefined\`, порядок не меняется.
- \`capacity = 0\` → кэш всё равно хранит один элемент: \`map.size >= 0\` всегда истинно, но удаление «первого ключа» пустого \`Map\` ничего не удаляет, и новый ключ добавляется. Это крайний случай, который стоит отсечь в конструкторе.
- Значение \`undefined\`: \`put('x', undefined)\`, \`get('x')\` → \`undefined\` — неотличимо от промаха.

### Порядок вставки \`Map\` и итератор \`keys()\`

\`\`\`ts
const m = new Map([['a', 1], ['b', 2]]);
m.set('a', 10);
[...m.keys()];            // ['a', 'b'] — set существующего ключа НЕ меняет позицию
m.delete('a'); m.set('a', 10);
[...m.keys()];            // ['b', 'a'] — а delete + set переносит в конец
m.keys().next().value;    // 'b' — самый старый
\`\`\`

Позиция ключа задаётся **первой** вставкой. Поэтому одного \`set\` для «освежения» мало — без \`delete\` LRU молча превращается в FIFO. \`keys()\` возвращает итератор, и \`next()\` отдаёт первый ключ, не создавая массив из всех ключей, — именно поэтому вытеснение остаётся \`O(1)\`.

### Почему в сниппете \`as K\`

\`\`\`ts
const oldest = this.map.keys().next().value;
this.map.delete(oldest);
// error TS2345: Argument of type 'K | undefined' is not assignable to parameter of type 'K'.
\`\`\`

Итератор может быть пуст, поэтому TypeScript в строгом режиме типизирует \`.value\` как \`K | undefined\`. В нашем месте \`Map\` гарантированно не пуст (размер не меньше \`capacity\`), и приведение \`as K\` это фиксирует. Аккуратнее — проверить явно: \`if (oldest !== undefined) this.map.delete(oldest)\`; это заодно спасает от сюрпризов при \`capacity = 0\`.

### LRU + TTL: размер и свежесть

LRU отвечает на вопрос «что выбросить, когда места нет», но не на вопрос «не устарели ли данные». Свежесть добавляют сроком жизни:

\`\`\`ts
class TtlLRU<K, V> {
  private map = new Map<K, { value: V; expiresAt: number }>();
  constructor(private capacity: number, private ttlMs: number) {}

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {        // протухло — как будто и не было
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, entry);                  // свежесть по обращению
    return entry.value;
  }

  put(key: K, value: V): void {
    this.map.delete(key);
    if (this.map.size >= this.capacity) this.map.delete(this.map.keys().next().value!);
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

const users = new TtlLRU<string, string>(100, 60_000);
users.put('user:42', 'Ann');
// через 30 с: users.get('user:42') → 'Ann'
// через 61 с: users.get('user:42') → undefined
\`\`\`

### Колбэк вытеснения: освобождаем ресурсы

Иногда выброшенное значение нужно не просто забыть, а освободить: отозвать \`blob:\`-URL превью картинки, закрыть соединение, уничтожить компонент. Для этого в \`put\` добавляют колбэк:

\`\`\`ts
class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private capacity: number, private onEvict?: (key: K, value: V) => void) {}
  // get — как в сниппете
  put(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.capacity) {
      const oldest = this.map.keys().next().value as K;
      const evicted = this.map.get(oldest)!;
      this.map.delete(oldest);
      this.onEvict?.(oldest, evicted);          // дать владельцу освободить ресурс
    }
    this.map.set(key, value);
  }
}

const previews = new LRUCache<string, string>(50, (_, url) => URL.revokeObjectURL(url));
\`\`\`

В Angular так делают в своей \`RouteReuseStrategy\`, которая держит отсоединённые экраны: при вытеснении вызывают \`destroyDetachedRouteHandle(handle)\` из \`@angular/router\`, иначе компонент так и не будет уничтожен.

### Как выбрать политику вытеснения

- **LRU** — когда недавнее использование хорошо предсказывает будущее: карточки, которые пользователь только что смотрел, страницы грида, к которым он возвращается.
- **FIFO** — когда записи одноразовые и порядок важнее популярности; проще, но выбрасывает и горячие данные.
- **LFU** — когда есть стабильно популярные записи (справочники, курсы валют), которые не должны вылететь из-за разовой волны новых запросов; сложнее реализовать за \`O(1)\`.
- **TTL** — когда важна актуальность данных; обычно комбинируют с LRU: размер ограничивает LRU, свежесть — TTL.

### Где это применяется на практике

- **Кэш HTTP-ответов** в функциональном интерсепторе — с потолком по числу записей:

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class HttpLruCache {
  readonly responses = new LRUCache<string, HttpResponse<unknown>>(100);
}

export const lruCacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') return next(req);
  const cache = inject(HttpLruCache).responses;
  const hit = cache.get(req.urlWithParams);
  if (hit) return of(hit.clone());                      // ответ из кэша без запроса
  return next(req).pipe(
    tap(event => { if (event instanceof HttpResponse) cache.put(req.urlWithParams, event); }),
  );
};
// provideHttpClient(withInterceptors([lruCacheInterceptor]))
\`\`\`

- **Мемоизация с границей**: вместо неограниченного кэша, который гарантированно течёт, — LRU на 500 последних аргументов.
- **Страницы большого грида** при серверной пагинации: держим 10–20 последних загруженных страниц, чтобы прокрутка назад не делала запрос.
- **Превью изображений** (\`blob:\`-URL) и миниатюры в галерее — с отзывом URL при вытеснении.
- **Кэш вычислений дашборда**: агрегаты по фильтрам, которые пользователь переключает туда-обратно.
- **Отсоединённые экраны в \`RouteReuseStrategy\`**: сохраняем состояние 5 последних вкладок-роутов, остальные уничтожаем.

## Важные нюансы и подводные камни

- **LRU — это не про свежесть.** Он вытесняет по обращениям, а не по возрасту данных. Нужна актуальность — добавляйте TTL поверх, это отдельный механизм.
- **\`set\` без \`delete\` не двигает ключ.** В \`Map\` порядок задаётся первой вставкой, поэтому обновление и «освежение» обязаны идти через \`delete\` + \`set\`, иначе LRU молча превратится в FIFO.
- **Без границы кэш = утечка.** Именно это LRU и лечит детерминированно, в отличие от «почистим когда-нибудь».
- **\`map.keys().next().value\` типизируется как \`K | undefined\`** — нужна проверка или приведение, иначе строгий TypeScript не пропустит.
- **\`capacity\` меньше единицы** — вырожденный случай: сниппет при \`capacity = 0\` всё равно хранит один элемент. Проверяйте в конструкторе и бросайте ошибку.
- **Кэш держит объекты живыми**, сборщик мусора их не заберёт. \`WeakMap\` тут не замена: он не даёт ни порядка, ни размера, ни перебора ключей.
- **\`undefined\` как значение** неотличим от промаха; если это важно, возвращайте \`{ hit: boolean, value }\` или запрещайте \`undefined\`.
- **Ключи-объекты сравниваются по ссылке.** Два одинаковых по содержимому фильтра \`{ page: 1 }\` — разные ключи. Для таких случаев строят строковый ключ.
- **Конкурентные промахи.** Главный поток JavaScript однопоточный, поэтому сами \`get\` и \`put\` не могут «перемешаться». Реальная гонка другая: три компонента одновременно запросили один ключ, все три получили промах и отправили три запроса. Лечится кэшированием **промиса**: \`get\` → нет → кладём в кэш промис запроса, остальные получают его же (проверено: три вызова — один запрос); при ошибке промис из кэша удаляют.
- **Web Worker не видит ваш кэш.** У воркера своя память, объекты главного потока ему недоступны, поэтому «синхронизировать доступ» не нужно — нужно решить, где кэш живёт. Общий кэш между потоками и вкладками делают через \`postMessage\`, IndexedDB или Cache API.
- **Кэш на уровне модуля при SSR.** Переменная \`const cache = new LRUCache(...)\` вне класса живёт столько же, сколько процесс Node.js, и общая для запросов всех пользователей — данные одного пользователя могут уйти другому. Держите кэш в сервисе из DI.
- **Вытеснение без освобождения ресурса.** Выброшенный \`blob:\`-URL продолжает держать файл в памяти, а отсоединённый компонент роута — подписки. Нужен колбэк \`onEvict\`.
- **Загруженные lazy-чанки так не кэшируются.** Модуль, загруженный через динамический \`import()\`, остаётся в памяти до перезагрузки страницы; выгрузить его LRU-кэшем нельзя. LRU уместен для данных и экранов, а не для кода.

**Плюсы:** память ограничена по определению, \`get\` и \`put\` за \`O(1)\`, на \`Map\` реализация занимает 20 строк, политика хорошо предсказывает реальное поведение пользователей.
**Минусы:** не знает о свежести данных (нужен TTL), не учитывает частоту обращений (разовая волна запросов вымывает популярные записи), держит объекты живыми, требует колбэка для освобождения ресурсов.

## Как это спрашивают на собеседовании

**Главный вывод:** LRU-кэш — это хеш-таблица плюс порядок обращений: при каждом \`get\` и \`put\` запись переносится в «свежий» конец, а при переполнении удаляется запись из «старого» конца. В JS \`Map\` совмещает обе роли: \`delete\` + \`set\` переносят ключ в конец, \`keys().next().value\` даёт самый старый. Классика без \`Map\` — двусвязный список с фиктивными узлами. LRU ограничивает память, но не гарантирует свежесть — для неё нужен TTL.

Типичные формулировки: «Реализуйте LRU-кэш с \`O(1)\` get и put», «Почему список двусвязный?», «Как это сделать на \`Map\`?», «Где во фронтенде нужен кэш с вытеснением?».

Как вести себя во время кодинга: уточните поведение при промахе и считается ли \`put\` обращением; сначала проговорите идею «хеш-таблица для поиска + порядок для вытеснения»; напишите версию на \`Map\` и объясните, почему \`delete\` перед \`set\`; если попросят — перепишите на двусвязном списке с фиктивными узлами; прогоните последовательность из 6–8 операций и назовите сложность по времени и памяти.

Что могут спросить следом:

- *Чем LRU отличается от LFU?* — LRU вытесняет самый давний по обращению, LFU — самый редкий по числу обращений.
- *Почему двусвязный, а не односвязный список?* — Чтобы вырезать узел за \`O(1)\`: нужен указатель на предыдущего соседа.
- *Как добавить срок жизни?* — Хранить \`expiresAt\` рядом со значением и считать протухшую запись промахом в \`get\`.
- *Что делать с одновременными запросами одного ключа?* — Кэшировать промис или Observable, а при ошибке удалять запись.
- *Почему не \`WeakMap\`?* — У него нет ни порядка, ни размера, ни перебора: вытеснять нечем.

### Ответ на 1 минуту

> LRU-кэш хранит не больше \`capacity\` элементов и при переполнении вытесняет тот, к которому дольше всего не обращались, причём \`get\` и \`put\` должны быть \`O(1)\`. Классика — хеш-таблица плюс двусвязный список: таблица находит узел по ключу, список хранит порядок обращений, а двусвязность позволяет вырезать и переставлять узел за \`O(1)\`. В JS проще: \`Map\` помнит порядок вставки, поэтому на \`get\` делаю \`delete\` и \`set\`, чтобы ключ уехал в конец, а при переполнении удаляю \`keys().next().value\` — самый старый. Важно: \`set\` существующего ключа позицию не меняет, без \`delete\` получится FIFO. Память \`O(capacity)\`. На фронте это кэш HTTP-ответов, страниц грида, превью и мемоизация с границей. Нюансы: LRU не про свежесть, для неё нужен TTL, а одновременные промахи по одному ключу лечу кэшированием промиса.`,
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
      ru: `## В чём суть

Нужно написать \`promisePool(tasks, limit)\` — функцию, которая выполняет массив асинхронных задач так, чтобы **одновременно** работало не больше \`limit\` штук, а остальные ждали своей очереди. Результат — массив ответов в том же порядке, что и задачи. \`Promise.all(tasks)\` запускает всё разом; пул — это ограничитель конкурентности. Задача проверяет понимание того, когда промис начинает выполняться, как устроены \`async\`/\`await\` и event loop, и умение выбрать стратегию обработки ошибок.

Аналогия: автомойка на три бокса. Машин сто, а моются одновременно ровно три. Освободился бокс — заезжает следующая из очереди. Общая работа та же, но никто не сносит ворота, и автомойка не глохнет от толпы во дворе. Пачками («ждём, пока помоются все три, и только потом запускаем следующую тройку») было бы медленнее: быстрые боксы простаивали бы, пока моется самая грязная машина.

**Какую проблему решает.** Нужно загрузить 500 файлов, сделать 1 000 запросов за деталями строк или сгенерировать 200 превью. \`Promise.all\` на всём массиве отправит всё одновременно: сервер или API-шлюз начнёт отвечать **429 Too Many Requests** (превышен лимит частоты), ответы и файлы займут память одновременно, а пользователь не сможет работать с остальным приложением, пока сеть забита. Пул даёт предсказуемую нагрузку: не больше N задач в полёте, без простоя между ними.

## Словарик терминов

- **Конкурентность (concurrency)** — сколько задач находится «в процессе» одновременно. В JS это не потоки: задачи ждут сеть или таймер, а код выполняется по очереди в одном потоке.
- **Ограничитель конкурентности (concurrency limiter), пул (pool)** — механизм, который держит в работе не больше \`limit\` задач.
- **Промис (Promise)** — объект-обещание результата асинхронной операции; состояния: ожидание, выполнен (fulfilled), отклонён (rejected).
- **Фабрика задачи (task factory)** — функция \`() => Promise\`, которая **запускает** работу только при вызове. Пулу нужны именно фабрики.
- **Воркер (worker)** — здесь: обычная \`async\`-функция с циклом «взять следующую задачу → дождаться → взять ещё». Не путать с Web Worker.
- **\`async\` / \`await\`** — синтаксис: \`await\` приостанавливает функцию до выполнения промиса, не блокируя остальной код.
- **Event loop (цикл событий)** — механизм, по которому однопоточный JS по очереди выполняет синхронный код, колбэки таймеров и продолжения промисов.
- **\`Promise.all\`** — ждёт все промисы и отдаёт массив результатов; отклоняется при **первой** ошибке.
- **\`Promise.allSettled\`** — ждёт все промисы и отдаёт массив исходов \`{ status, value | reason }\`, никогда не отклоняется.
- **Fail-fast** — стратегия «первая ошибка — сразу сообщаем о провале всего».
- **429 Too Many Requests** — HTTP-статус «вы шлёте запросы слишком часто», ответ на превышение rate limit.
- **Rate limit** — ограничение сервера на число запросов в единицу времени.
- **\`AbortController\` / \`AbortSignal\`** — встроенный механизм отмены: \`controller.abort()\` переводит \`signal\` в отменённое состояние, а \`fetch\` и другие API его слушают.
- **Backpressure (обратное давление)** — ситуация, когда источник задач производит их быстрее, чем потребитель успевает обработать, и нужно притормозить источник.

## Как это работает под капотом

### Уточняющие вопросы перед кодом

- Что приходит на вход: функции-фабрики или уже созданные промисы? Должны быть фабрики — иначе ограничивать нечего.
- Нужен ли порядок результатов как у входа или как у завершения?
- Что делать при ошибке: остановиться сразу (как \`Promise.all\`) или собрать все исходы (как \`allSettled\`)?
- Нужна ли отмена всего пула?
- Что делать с \`limit <= 0\` и пустым массивом задач?
- Задачи известны заранее или поступают потоком (пагинация, загрузка по мере выбора файлов)?

### Идея алгоритма простыми словами

1. Заводим массив результатов сразу нужной длины и общий указатель \`nextIndex\` — номер следующей невзятой задачи.
2. Запускаем ровно \`limit\` «воркеров» — обычных \`async\`-функций. Каждый в цикле забирает текущий индекс, тут же увеличивает указатель и ждёт свою задачу.
3. Освободился — сам берёт следующий индекс. Отдельная очередь и таймеры не нужны: указатель общий, а JS однопоточный, поэтому \`nextIndex++\` не может «разъехаться» между воркерами — между чтением и увеличением никто не вклинится.
4. Результат кладём **по индексу**, а не через \`push\`, поэтому порядок результатов совпадает с порядком задач, кто бы ни финишировал первым.
5. Ждём \`Promise.all(workers)\` — воркеров всего \`limit\` штук; когда все циклы закончились, все задачи выполнены.

### Шаг 0. Почему не \`Promise.all\` и почему фабрики

\`\`\`ts
// задачи A..E длительностью 300, 100, 250, 100 и 30 мс
const started = tasks.map(t => t());     // каждый вызов СРАЗУ запускает работу
await Promise.all(started);
// одновременно работало 5 задач; всё закончилось за 300 мс
\`\`\`

Промис начинает выполняться **в момент создания** — \`fetch(url)\` уже отправил запрос, когда вернул промис. Если передать в пул массив готовых промисов (\`urls.map(u => fetch(u))\`), все запросы уже ушли в сеть, и пул может только подождать их. Поэтому на вход идут фабрики: \`urls.map(u => () => fetch(u))\` — функция, которая отправит запрос, только когда её вызовут.

### Шаг 1. Наивная версия: пачками

\`\`\`ts
async function inBatches<T>(tasks: Array<() => Promise<T>>, size: number): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += size) {
    const batch = tasks.slice(i, i + size).map(t => t());
    results.push(...(await Promise.all(batch)));     // ждём самую медленную в пачке
  }
  return results;
}
// limit 2, задачи 300/100/250/100/30 мс → пачки [A,B] 300 мс, [C,D] 250 мс, [E] 30 мс = 580 мс
\`\`\`

Ограничение соблюдается, но каждая пачка ждёт свою самую медленную задачу: после того как \`B\` закончилась на 100-й миллисекунде, второй «бокс» простаивает 200 мс, пока моется \`A\`. Порядок результатов правильный, но время — 580 мс.

### Шаг 2. Финальная версия: воркеры с общим указателем

Это код из сниппета под ответом:

\`\`\`ts
async function promisePool<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);   // место под каждый результат заранее
  let nextIndex = 0;                              // следующая невзятая задача

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const current = nextIndex++;      // claim a task index
      results[current] = await tasks[current]();  // по индексу — порядок сохранится
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },    // лишние воркеры не нужны
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
// те же задачи, limit 2 → 400 мс, результаты ['A', 'B', 'C', 'D', 'E']
\`\`\`

Свободный воркер сразу берёт следующую задачу, поэтому «боксы» не простаивают: 400 мс вместо 580 у пачек. Важно, что \`const current = nextIndex++\` — синхронная строка: воркер забирает индекс до первого \`await\`, и другой воркер физически не может взять тот же индекс.

### Трассировка

Задачи \`A\`–\`E\` длительностью 300, 100, 250, 100 и 30 мс, \`limit = 2\` (вывод прогона на детерминированных часах):

\`\`\`text
t=0    воркер 1 берёт индекс 0 → start A   (активных: 1)
t=0    воркер 2 берёт индекс 1 → start B   (активных: 2)
t=100  done B → results[1]='B'; воркер 2 берёт индекс 2 → start C   (активных: 2)
t=300  done A → results[0]='A'; воркер 1 берёт индекс 3 → start D   (активных: 2)
t=350  done C → results[2]='C'; воркер 2 берёт индекс 4 → start E   (активных: 2)
t=380  done E → results[4]='E'; nextIndex=5 → воркер 2 выходит из цикла
t=400  done D → results[3]='D'; воркер 1 выходит из цикла
t=400  Promise.all(workers) выполнен → ['A', 'B', 'C', 'D', 'E']
\`\`\`

Задачи завершились в порядке \`B, A, C, E, D\`, а результаты стоят в порядке входа. Одновременно работало максимум две задачи.

### Сложность

Каждая задача берётся ровно один раз, и на её «выдачу» уходит \`O(1)\` — увеличить счётчик и записать результат. Значит, накладные расходы пула — \`O(n)\` по числу задач. Общее время работы определяется не алгоритмом, а длительностью задач: примерно «сумма длительностей, делённая на \`limit\`», если задачи похожи. Память — \`O(n)\` под массив результатов плюс \`O(limit)\` под воркеров.

### Тест-кейсы

Все результаты проверены прогоном финальной версии:

- Задачи 300/100/250/100/30 мс, \`limit = 2\` → 400 мс, результаты по порядку входа, одновременно не больше 2.
- \`limit\` больше числа задач → воркеров ровно столько, сколько задач (\`Math.min\`), все стартуют сразу.
- Пустой массив задач → сразу \`[]\`.
- \`limit = 1\` → задачи идут строго последовательно.
- Задача \`B\` отклоняется → \`promisePool\` отклоняется на 100-й мс с ошибкой \`B\`, **но** второй воркер продолжает выполнять \`C\`, \`D\`, \`E\` до 680-й мс — уже по одной, потому что воркер с \`B\` погиб.
- \`limit = 0\` → ноль воркеров, \`Promise.all([])\` выполняется сразу, и возвращается массив из 5 пустых ячеек; ни одна задача не запущена. Это баг сниппета, который стоит отсечь проверкой.
- Передали готовые промисы вместо фабрик → TypeScript не пропустит, а в JS вызов промиса как функции упадёт с \`TypeError\`; все запросы к этому моменту уже отправлены.

### \`Promise.all\` и \`Promise.allSettled\`

\`\`\`ts
await Promise.all([Promise.resolve(1), Promise.reject(new Error('x')), Promise.resolve(3)]);
// отклонён с Error('x') — результаты 1 и 3 потеряны

await Promise.allSettled([Promise.resolve(1), Promise.reject(new Error('x')), Promise.resolve(3)]);
// [{ status: 'fulfilled', value: 1 }, { status: 'rejected', reason: Error('x') }, { status: 'fulfilled', value: 3 }]
\`\`\`

\`Promise.all\` — fail-fast: первая ошибка отклоняет итоговый промис, но **не останавливает** остальные операции — они продолжают работать в фоне. \`allSettled\` ждёт всех и отдаёт каждый исход. В сниппете \`Promise.all(workers)\` наследует поведение fail-fast.

### Пул со сбором всех исходов

Для массовой загрузки файлов обычно нужно «загрузить всё, что получится, и показать, что не загрузилось»:

\`\`\`ts
async function promisePoolSettled<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const current = nextIndex++;
      try {
        results[current] = { status: 'fulfilled', value: await tasks[current]() };
      } catch (reason) {
        results[current] = { status: 'rejected', reason };   // ошибка не убивает воркер
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, tasks.length)) }, worker));
  return results;
}
// B падает → через 400 мс: ['A', '✗ B failed', 'C', 'D', 'E'], конкурентность всё время 2
\`\`\`

\`try/catch\` внутри цикла сохраняет воркер живым, поэтому после ошибки пул продолжает работать на полной мощности. \`Math.max(1, …)\` заодно чинит случай \`limit = 0\`.

### Отмена через \`AbortController\`

\`\`\`ts
async function promisePoolAbortable<T>(
  tasks: Array<(signal: AbortSignal) => Promise<T>>,
  limit: number,
  signal: AbortSignal,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      signal.throwIfAborted();                          // отменили — новые задачи не берём
      const current = nextIndex++;
      results[current] = await tasks[current](signal); // сигнал — внутрь задачи (например, в fetch)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

const controller = new AbortController();
const files = await promisePoolAbortable(
  urls.map(url => (signal: AbortSignal) => fetch(url, { signal }).then(r => r.blob())),
  3,
  controller.signal,
);
// controller.abort() → новые задачи не стартуют, текущие fetch прерываются, пул отклоняется с AbortError
\`\`\`

Две части отмены: перестать **выдавать** новые задачи (проверка в цикле) и прервать **уже запущенные** (передать \`signal\` внутрь). В проверке с отменой на 150-й мс задачи, которые сигнал игнорировали, доработали до конца, — без передачи \`signal\` в \`fetch\` запрос не прервётся.

### RxJS: \`mergeMap\` с параметром конкурентности

\`\`\`ts
from(jobs).pipe(
  mergeMap(job => this.http.post('/api/process', job), 2),   // не больше 2 запросов одновременно
).subscribe(result => console.log(result));
// на задачах 300/100/250/100/30 мс: значения приходят в порядке B, A, C, E, D — по завершении
\`\`\`

Второй аргумент \`mergeMap\` — тот же пул. Расписание запусков совпадает с нашим, но результаты приходят **в порядке завершения**; если нужен порядок входа, тащите индекс в результат или используйте \`concatMap\` (это \`limit = 1\`). Плюс RxJS-подхода — отмена бесплатно: отписка (\`takeUntilDestroyed\`) отменяет и очередь, и текущие HTTP-запросы.

### Готовые библиотеки: \`p-limit\` и \`p-map\`

\`\`\`ts
import pMap from 'p-map';
const names = await pMap(jobs, job => process(job), { concurrency: 2 });
// результаты в порядке входа, ~400 мс на тех же задачах

import pLimit from 'p-limit';
const limit = pLimit(3);
await Promise.all(urls.map(url => limit(() => fetch(url))));   // каждый вызов обёрнут в «очередь на 3 места»
\`\`\`

\`p-map\` — пул «по массиву» с опциями \`concurrency\` и \`stopOnError\` (при \`false\` все ошибки собираются в \`AggregateError\`). \`p-limit\` — ограничитель «по вызовам»: удобен, когда задачи появляются в разных местах кода. В продакшене берут их; руками пишут ради понимания или чтобы не тянуть зависимость.

### Где это применяется на практике

- **Массовая загрузка файлов** с прогрессом по каждому файлу: 3–4 одновременных загрузки, остальные «в очереди», ошибки собираются в список «не загрузилось».
- **Догрузка деталей для строк грида**: 1 000 строк, у каждой нужен отдельный запрос за статусом — пул на 5 запросов вместо штурма API.
- **Префетч** изображений и данных для следующих экранов без забивания сети, нужной текущему экрану.
- **Пакетные операции** в админке: «применить изменение к 300 записям» — по одному запросу на запись с ограничением, чтобы не упереться в rate limit.
- **Тяжёлые вычисления в Web Workers**: пул из \`navigator.hardwareConcurrency\` воркеров обрабатывает очередь задач.
- **Скрипты миграции и e2e-подготовка данных** в Node.js: создать 10 000 сущностей через API, не положив тестовый стенд.

## Важные нюансы и подводные камни

- **Передали промисы вместо фабрик** — они уже запущены, пул бесполезен. Самая частая ошибка на собеседовании.
- **Стратегия ошибок не выбрана.** В базовой версии первая ошибка отклоняет весь \`Promise.all(workers)\`, а остальные воркеры продолжают крутиться: задачи запускаются и делают побочные эффекты, хотя вызывающий уже получил ошибку. Чаще нужен сбор всех исходов, как в \`allSettled\`.
- **Упавший воркер не возвращается.** После ошибки в базовой версии конкурентность падает на единицу: в проверке после падения \`B\` оставшиеся \`C\`, \`D\`, \`E\` шли строго по одной.
- **\`push\` вместо записи по индексу** — порядок результатов станет порядком завершения, и сопоставить их с входом уже не получится.
- **\`limit <= 0\`** — ноль воркеров, мгновенный «успех» и массив пустых ячеек без единой выполненной задачи. Проверяйте \`limit\` или берите \`Math.max(1, …)\`.
- **Отмена.** Пул сам не отменяет уже запущенные задачи; для этого нужен \`AbortController\` с передачей \`signal\` внутрь задач.
- **Backpressure.** Если источник задач бесконечный (стрим, пагинация), нельзя сначала собрать весь массив фабрик — память вырастет на весь объём. Нужна очередь с ограниченным размером, которая перестаёт принимать новые задачи, пока не освободятся места.
- **\`limit\` больше числа задач** — лишние воркеры создавать незачем, отсюда \`Math.min\`.
- **Браузер и так ставит запросы в очередь.** По HTTP/1.1 браузеры держат около 6 соединений на хост (у Chrome — 6), остальные запросы ждут внутри браузера. По HTTP/2 запросы мультиплексируются в одном соединении, а лимит одновременных потоков задаёт сервер (часто около 100) — узким местом становится уже сам сервер. Пул нужен ради сервера, rate limit, памяти и приоритета текущих запросов, а не ради обхода лимита соединений.
- **Синхронный \`throw\` в фабрике** ведёт себя как отклонение: \`await\` внутри \`async\`-воркера превращает его в отклонённый промис воркера.
- **Нет повторов.** При 429 или 503 полезно повторить задачу с задержкой (exponential backoff), а не сразу записать в ошибки; базовый пул этого не умеет.

**Плюсы:** предсказуемая нагрузка на сервер и сеть, нет простоя между задачами (в отличие от пачек), порядок результатов совпадает с входом, реализация на 15 строк без зависимостей.
**Минусы:** базовая версия — fail-fast с «живыми» воркерами после ошибки, нет отмены, повторов и прогресса из коробки, не подходит для бесконечного потока задач без доработки, легко ошибиться, передав промисы вместо фабрик.

## Как это спрашивают на собеседовании

**Главный вывод:** пул — это \`limit\` воркеров, которые в цикле забирают следующую задачу по общему указателю и пишут результат по индексу. Работает только с фабриками \`() => Promise\`, потому что промис стартует при создании. Главные решения — стратегия ошибок (fail-fast или \`allSettled\`) и отмена через \`AbortController\`.

Типичные формулировки: «Реализуйте promise pool / ограничитель конкурентности», «Как выполнить 1 000 запросов, но не больше 5 одновременно?», «Чем это лучше \`Promise.all\` и выполнения пачками?».

Как вести себя во время кодинга: сначала проговорите, что на вход нужны фабрики, и уточните порядок результатов и стратегию ошибок; можно начать с пачек и сразу показать, где они теряют время; затем напишите воркеров с общим указателем и объясните, почему \`nextIndex++\` безопасен в однопоточном JS; прогоните трассировку на 4–5 задачах разной длительности; в конце назовите поведение при ошибке, \`limit = 0\` и отмену.

Что могут спросить следом:

- *Зачем изобретать, если есть \`p-limit\` и \`p-map\`?* — В проде брать их; руками — ради понимания и чтобы не тянуть зависимость.
- *Как сохранить работу при ошибке одной задачи?* — \`try/catch\` внутри цикла воркера и результаты в формате \`allSettled\`.
- *Как сделать то же в RxJS?* — \`mergeMap(fn, limit)\`; результаты придут в порядке завершения, отмена — отпиской.
- *Почему не пачками?* — Пачка ждёт свою самую медленную задачу, и свободные «слоты» простаивают.
- *Как добавить повторы при 429?* — Обернуть фабрику в функцию с повторами и растущей задержкой, учитывая заголовок \`Retry-After\`, если сервер его прислал.

### Ответ на 1 минуту

> \`Promise.all\` запускает все задачи сразу, и на тысяче запросов это упирается в rate limit сервера с ответами 429, забивает сеть и память, поэтому нужен ограничитель конкурентности. Реализация: массив результатов нужной длины и общий указатель, запускаю ровно \`limit\` воркеров, каждый в цикле забирает следующий индекс, увеличивает указатель и ждёт свою задачу; результат пишу по индексу, поэтому порядок совпадает со входом. \`nextIndex++\` безопасен, потому что JS однопоточный. В отличие от пачек, свободный воркер сразу берёт следующую задачу и не ждёт самую медленную. Ключевая деталь — на вход идут фабрики, а не промисы, иначе всё уже стартовало. Дальше выбираю стратегию ошибок: fail-fast или сбор исходов как в \`allSettled\`, и добавляю отмену через \`AbortController\`. В проде беру \`p-limit\` или \`p-map\`, в RxJS — \`mergeMap\` с параметром конкурентности.`,
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
      ru: `## В чём суть

Нужно написать функцию \`retry(fn, options)\`, которая вызывает асинхронную операцию и при сбое повторяет её — но не сразу и не бесконечно. Пауза между попытками растёт по экспоненте (300 мс, 600, 1200…), упирается в потолок, а **jitter** добавляет к ней случайность. Вторая половина вопроса важнее первой: интервьюер проверяет, понимаете ли вы, **когда повторять нельзя вообще**.

Аналогия: вы дозваниваетесь в занятую поддержку. Перезваниваете через минуту, потом через две, потом через четыре — это backoff, вы даёте линии разгрузиться. А jitter нужен, чтобы тысяча таких же звонящих не набирала номер ровно в одну и ту же секунду и не клала линию заново. И есть звонки, которые повторять опасно: если вы диктовали оператору перевод денег и связь оборвалась, повторный звонок с той же просьбой может отправить деньги второй раз.

**Какую проблему решает.** Сеть ненадёжна: мобильный интернет моргает, балансировщик перезапускает под, сервис на секунду отвечает \`503\`. Если на каждый такой сбой показывать пользователю ошибку, приложение кажется хрупким. Если повторять мгновенно и без счёта, клиенты сами добивают перегруженный сервер. Правильный retry сглаживает временные сбои и при этом не превращается в DDoS собственного бэкенда.

## Словарик терминов

- **Retry (повтор)** — повторный вызов операции после ошибки в надежде, что сбой был временным.
- **Exponential backoff (экспоненциальная задержка)** — пауза перед повтором растёт в геометрической прогрессии: \`baseDelay * factor ** attempt\`, то есть 300, 600, 1200, 2400 мс при базе 300 и множителе 2.
- **Потолок задержки (\`maxDelay\`, cap)** — максимальная пауза; без неё экспонента быстро улетает в минуты.
- **Jitter (дрожание)** — случайная добавка к паузе. В варианте **full jitter** реальная пауза — случайное число от 0 до расчётной.
- **Thundering herd (эффект стада)** — тысячи клиентов, упавших одновременно, одновременно же и ретраят, создавая волны нагрузки.
- **Retry storm (шторм повторов)** — при системном сбое массовые повторы умножают нагрузку и не дают сервису подняться.
- **Идемпотентность (idempotency)** — свойство операции давать тот же результат при повторе: дважды выполненный \`PUT /user/1 {name: 'A'}\` оставляет то же состояние, а дважды выполненный \`POST /payment\` списывает деньги дважды.
- **Idempotency-Key** — уникальный ключ операции в заголовке запроса; сервер по нему узнаёт повтор и не выполняет операцию второй раз.
- **Circuit breaker (автоматический выключатель)** — обёртка, которая после серии ошибок на время перестаёт вызывать сервис и сразу отвечает отказом.
- **\`AbortController\` / \`AbortSignal\`** — стандартный браузерный механизм отмены: контроллер «дёргает рубильник», сигнал сообщает об этом всем подписанным операциям.
- **HTTP 408 / 429 / 5xx** — коды «таймаут запроса», «слишком много запросов» и «ошибка сервера»; именно их обычно имеет смысл повторять.
- **\`Retry-After\`** — заголовок ответа (часто вместе с 429 или 503), в котором сервер сам говорит, через сколько можно повторить.
- **Фабрика (factory)** — функция, которая при каждом вызове создаёт новую операцию: \`() => fetch(url)\`, а не уже созданный промис.
- **O-нотация (Big-O)** — способ сказать, как растёт стоимость алгоритма с ростом входа: \`O(1)\` — не растёт, \`O(n)\` — растёт пропорционально.

## Как это работает под капотом

### Что уточнить у интервьюера до кода

- Что считается «попыткой»: \`retries: 3\` — это 3 вызова всего или 1 вызов плюс 3 повтора? (В эталонном коде — второе, то есть до 4 вызовов.)
- Какие ошибки повторять: все подряд или только сетевые, 5xx, 408 и 429?
- Нужна ли отмена и ограничение по общему времени, а не только по числу попыток?
- Операция идемпотентная? Если это \`POST\` без ключа идемпотентности, правильный ответ — «не ретраить».
- Нужен ли учёт \`Retry-After\` от сервера?

### Идея алгоритма простыми словами

1. Вызываем \`fn()\`. Если промис выполнился успешно — сразу возвращаем результат, больше ничего не происходит.
2. Если упал — сначала спрашиваем \`shouldRetry(err)\`: эта ошибка вообще **лечится повтором**? Если нет, пробрасываем её сразу, без пауз.
3. Проверяем счётчик: если повторы исчерпаны, пробрасываем последнюю ошибку наружу.
4. Считаем паузу \`baseDelay * factor ** attempt\` и обрезаем её \`maxDelay\`, поэтому даже на двадцатой попытке ожидание не превысит потолок.
5. Умножаем паузу на \`Math.random()\` — это full jitter, поэтому клиенты, упавшие в одну и ту же миллисекунду, повторят в разные моменты.
6. Ждём, увеличиваем счётчик и идём на новый круг.

Зачем backoff: перегруженному сервису нужно время подняться, мгновенный повтор — это добивание лежачего. Зачем jitter: без него все клиенты, упавшие в одну секунду, синхронно повторят в одну и ту же секунду и уронят сервис снова.

### Версия 1. Наивный повтор без паузы

\`\`\`js
async function retryNaive(fn, retries = 3) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
    }
  }
}

// fn падает 2 раза, потом отвечает 'ok'
await retryNaive(fn); // 'ok'
// call #1 at ~0 ms
// call #2 at ~0 ms
// call #3 at ~0 ms
\`\`\`

Работает, но все три вызова происходят в одну и ту же миллисекунду. Если сервер лёг от перегрузки, мы просто утроили ему нагрузку в самый неудачный момент.

### Версия 2. Фиксированная пауза

\`\`\`js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryFixed(fn, retries = 3, delay = 300) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      await sleep(delay);
    }
  }
}
// call #1 at ~0 ms
// call #2 at ~300 ms
// call #3 at ~600 ms
\`\`\`

Уже лучше: сервер получает передышку. Но 300 мс может не хватить на перезапуск, а частота повторов не снижается, сколько бы сервис ни лежал.

### Версия 3. Экспонента с потолком

\`\`\`js
async function retryExpo(fn, { retries = 3, baseDelay = 300, factor = 2, maxDelay = 5000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      const delay = Math.min(baseDelay * factor ** attempt, maxDelay);
      await sleep(delay);
    }
  }
}
// fn падает всегда:
// call #1 at ~0 ms
// call #2 at ~300 ms
// call #3 at ~900 ms   (300 + 600)
// call #4 at ~2100 ms  (300 + 600 + 1200)
// → throw 'fail 4'
\`\`\`

Каждая следующая пауза вдвое длиннее, и чем дольше лежит сервис, тем реже мы его беспокоим. Потолок обязателен: без него на попытке с индексом 10 пауза была бы \`300 * 2 ** 10 = 307 200\` мс — больше пяти минут.

### Версия 4. Jitter и \`shouldRetry\` — финальный код

Это и есть эталонное решение (оно же в \`codeSnippet\` под ответом):

\`\`\`ts
// Time: up to O(maxRetries), Space: O(1)
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

Две добавки по сравнению с версией 3. \`shouldRetry\` — предохранитель: ошибки вроде \`404\` пробрасываются мгновенно. \`Math.random() * expo\` размазывает повторы разных клиентов по интервалу от 0 до \`expo\`.

Обратите внимание на \`return await fn()\` внутри \`try\`. Без \`await\` отклонённый промис ушёл бы наружу мимо \`catch\`, и повтора не случилось бы вовсе.

### Трассировка на конкретном входе

Вход: \`fn\` падает два раза, на третий возвращает \`'ok'\`; опции по умолчанию; для воспроизводимости \`Math.random\` подменён на \`() => 0.5\`.

\`\`\`text
attempt = 0: call #1 → Error('fail 1')
  0 >= 3? нет; shouldRetry → true
  expo   = min(300 * 2^0, 5000) = 300
  jitter = 0.5 * 300            = 150 → ждём 150 мс; attempt = 1
attempt = 1: call #2 → Error('fail 2')
  expo   = min(300 * 2^1, 5000) = 600
  jitter = 0.5 * 600            = 300 → ждём 300 мс; attempt = 2
attempt = 2: call #3 → 'ok' → return 'ok'
Итого: 3 вызова, 450 мс ожидания
\`\`\`

Если \`fn\` падает всегда, паузы будут 150, 300, 600 мс, а на четвёртом вызове \`attempt\` равен 3, условие \`attempt >= retries\` срабатывает, и наружу уходит ошибка последнего вызова \`'fail 4'\`.

Без jitter (то есть с верхней границей случайности) паузы при \`retries: 7\` выглядят так: 300, 600, 1200, 2400, 4800, 5000, 5000 — с шестой паузы включается потолок.

### Сложность простыми словами

- **Время:** \`O(retries)\` вызовов \`fn\` — в худшем случае \`retries + 1\`. Плюс суммарное ожидание, которое без потолка росло бы экспоненциально, а с потолком — не больше \`retries * maxDelay\`.
- **Память:** \`O(1)\` — храним только счётчик и текущую паузу, сколько бы попыток ни было. Цикл \`while\` вместо рекурсии не наращивает стек вызовов.

### Тест-кейсы

\`\`\`js
// flaky(n) создаёт fn, которая падает n раз с Error('fail <номер вызова>'), потом отвечает 'ok'
function flaky(failTimes, mkErr = (n) => new Error('fail ' + n)) {
  let calls = 0;
  return async () => { if (++calls <= failTimes) throw mkErr(calls); return 'ok'; };
}
const err404 = Object.assign(new Error('404'), { status: 404 });

Math.random = () => 0.5; // детерминированные паузы
await retry(flaky(0));                        // 'ok', 1 вызов, пауз нет
await retry(flaky(2));                        // 'ok', 3 вызова, паузы [150, 300]
await retry(flaky(Infinity));                 // throw 'fail 4', 4 вызова, паузы [150, 300, 600]
await retry(flaky(Infinity), { retries: 0 }); // throw 'fail 1', 1 вызов, пауз нет
await retry(flaky(Infinity, () => err404), {
  shouldRetry: (e) => e.status >= 500,
});                                           // throw '404', 1 вызов, пауз нет

Math.random = () => 0;
await retry(flaky(2));                        // 'ok', 3 вызова, паузы [0, 0] — full jitter может дать ноль
\`\`\`

### \`setTimeout\` и промис-обёртка \`sleep\`

\`setTimeout(callback, ms)\` ставит колбэк в очередь таймеров и возвращает управление сразу. Чтобы «подождать» внутри \`async\`-функции, его заворачивают в промис: \`new Promise(res => setTimeout(res, ms))\` выполнится через \`ms\` миллисекунд, а \`await\` приостановит функцию до этого момента, не блокируя поток.

\`\`\`js
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
console.log('a'); await sleep(300); console.log('b');
// a
// (через ~300 мс) b
\`\`\`

Дробные значения вроде \`150.37\` допустимы. Таймер — это минимальная, а не точная задержка: если главный поток занят, колбэк выполнится позже.

### \`Math.random\` и разновидности jitter

\`Math.random()\` возвращает число от 0 включительно до 1 не включительно. Умножение на \`expo\` даёт случайную паузу в \`[0, expo)\`, в среднем \`expo / 2\`.

- **Full jitter** — \`random(0, expo)\`; так сделано в эталоне. Лучше всех разносит клиентов, но может дать почти нулевую паузу.
- **Equal jitter** — \`expo / 2 + random(0, expo / 2)\`; гарантирует минимум в половину расчётной паузы.
- **Decorrelated jitter** — следующая пауза случайна между базой и утроенной предыдущей, с потолком: \`min(cap, random(base, prev * 3))\`.

Все три варианта описаны в известной статье AWS Architecture Blog «Exponential Backoff And Jitter»; на собеседовании достаточно назвать full jitter и объяснить, зачем он.

### \`AbortController\`: ограничение по общему времени

Ограничить только число попыток мало: три попытки по 30 секунд таймаута — это полторы минуты спиннера. Сигнал отмены позволяет прервать и текущий запрос, и паузу между попытками. \`AbortSignal.timeout(ms)\` создаёт сигнал, который сработает сам через \`ms\` миллисекунд.

\`\`\`ts
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const id = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
    function onAbort() { clearTimeout(id); reject(signal!.reason); }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function retryAbortable<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
  { retries = 3, baseDelay = 300, factor = 2, maxDelay = 5000,
    shouldRetry = (_err: unknown) => true, signal }: {
    retries?: number; baseDelay?: number; factor?: number; maxDelay?: number;
    shouldRetry?: (err: unknown) => boolean; signal?: AbortSignal;
  } = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();                 // отменили — не начинаем новую попытку
    try {
      return await fn(signal);                // сигнал уходит и в сам fetch
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err) || signal?.aborted) throw err;
      const expo = Math.min(baseDelay * factor ** attempt, maxDelay);
      await sleep(Math.random() * expo, signal);
    }
  }
}

// fn падает всегда, паузы без jitter: 300, 600, 1200…
await retryAbortable(alwaysFails, { retries: 10, signal: AbortSignal.timeout(1000) });
// call #1 at ~0 ms, call #2 at ~300 ms, call #3 at ~900 ms
// на ~1000 мс пауза прерывается → TimeoutError
\`\`\`

Отмена вручную (\`controller.abort()\`, например при уходе со страницы) отклоняет промис ошибкой с именем \`AbortError\`.

### Idempotency-Key: как безопасно повторять \`POST\`

Идемпотентны по стандарту HTTP методы \`GET\`, \`HEAD\`, \`OPTIONS\`, \`PUT\` и \`DELETE\`: повтор не меняет итоговое состояние. \`POST\` и \`PATCH\` — нет. Опасный сценарий: запрос оплаты дошёл, сервер списал деньги, а ответ потерялся по дороге. Клиент видит сетевую ошибку и повторяет — второе списание.

Решение — клиент генерирует уникальный ключ **один раз на логическую операцию** и отправляет его в каждом повторе:

\`\`\`ts
const key = crypto.randomUUID();           // один ключ на одну оплату, не на попытку
await retry(() => fetch('/api/payment', {
  method: 'POST',
  headers: { 'Idempotency-Key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify(payment),
}));
// сервер видит тот же key → возвращает сохранённый результат, не списывая повторно
\`\`\`

Работает это только если сервер поддерживает такой заголовок; без поддержки на бэкенде ключ ничего не даёт.

### Circuit breaker: защита от шторма повторов

Retry решает проблему одного запроса, а circuit breaker — проблему системы. У него три состояния: **closed** (запросы идут), **open** (после N ошибок подряд запросы сразу отклоняются, сеть не трогаем) и **half-open** (после паузы пропускаем пробный запрос: успех — снова closed, ошибка — снова open).

\`\`\`js
function circuitBreaker(fn, { threshold = 3, cooldown = 10_000, now = Date.now } = {}) {
  let failures = 0;
  let openedAt = 0;
  return async (...args) => {
    if (failures >= threshold && now() - openedAt < cooldown) {
      throw new Error('circuit open');       // быстрый отказ
    }
    try {
      const result = await fn(...args);      // closed или half-open
      failures = 0;
      return result;
    } catch (err) {
      failures++;
      if (failures >= threshold) openedAt = now();
      throw err;
    }
  };
}
// сервер лежит, 5 вызовов подряд:
// call 1: 503, call 2: 503, call 3: 503
// call 4: circuit open, call 5: circuit open   ← сервер получил только 3 запроса
// через 10 с сервер поднялся: пробный вызов → 'ok', цепь снова замкнута
\`\`\`

Обычно их комбинируют: retry снаружи, breaker внутри. Когда breaker открыт, \`shouldRetry\` должен считать ошибку «circuit open» неретраемой.

### То же в RxJS: \`retry({ count, delay })\`

В Angular HTTP-запросы — это Observable, и для них есть готовый оператор. \`retry\` переподписывается на источник после ошибки; \`count\` — сколько раз повторять, \`delay\` — функция, которая получает ошибку и номер повтора (\`retryCount\` начинается с 1) и возвращает поток-триггер. Эмиссия триггера означает «повторяй», ошибка в нём — «сдавайся».

\`\`\`ts
import { defer, of, throwError, timer, retry } from 'rxjs';

req$.pipe(
  retry({
    count: 3,
    delay: (err, retryCount) => {
      if (!isRetryable(err)) return throwError(() => err);    // 404 → сразу ошибка
      const expo = Math.min(300 * 2 ** (retryCount - 1), 5000);
      return timer(Math.random() * expo);                     // backoff + jitter
    },
  }),
).subscribe(console.log);
// Math.random = () => 0.5, сервер отвечает 503 дважды:
// request #1 at ~0 ms
// request #2 at ~150 ms
// request #3 at ~450 ms
// data
\`\`\`

\`timer(ms)\` — поток, который выдаёт одно значение через \`ms\` миллисекунд. Старый оператор \`retryWhen\` в RxJS 7 помечен устаревшим: документация предлагает вместо него опцию \`delay\` у \`retry\`.

### Angular: функциональный интерсептор с повторами

\`\`\`ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

const RETRYABLE = new Set([0, 408, 429, 500, 502, 503, 504]); // 0 — сеть недоступна
const IDEMPOTENT = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  const canRetry = IDEMPOTENT.has(req.method) || req.headers.has('Idempotency-Key');
  if (!canRetry) return next(req);

  return next(req).pipe(
    retry({
      count: 3,
      delay: (err: unknown, retryCount: number) => {
        if (!(err instanceof HttpErrorResponse) || !RETRYABLE.has(err.status)) {
          return throwError(() => err);
        }
        return timer(Math.random() * Math.min(300 * 2 ** (retryCount - 1), 5000));
      },
    }),
  );
};
// подключение: provideHttpClient(withInterceptors([retryInterceptor]))
\`\`\`

\`HttpErrorResponse.status === 0\` в Angular означает, что ответа от сервера не было вовсе: сеть, CORS, обрыв соединения.

### Где это применяется на практике

- **HTTP-слой enterprise-приложения**: один интерсептор с повторами для \`GET\`-запросов справочников, грида и дашбордов, чтобы моргание сети не показывало пользователю ошибку.
- **Загрузка больших файлов по частям**: упавший чанк повторяется с backoff, а не вся загрузка заново.
- **Переподключение WebSocket или SSE** после обрыва: экспоненциальная пауза с jitter, чтобы после рестарта сервера тысячи вкладок не подключились в одну секунду.
- **Обработка 429 от внешних API** (карты, платёжные шлюзы): ждём \`Retry-After\` или backoff.
- **Платежи и создание заказов**: retry только с \`Idempotency-Key\`, иначе — честная ошибка и кнопка «Повторить» для пользователя.

## Важные нюансы и подводные камни

- **Повтор неидемпотентного запроса.** Классика провала: оплата, отправка письма, создание заказа. «Ответ потерялся» не значит «операция не выполнилась». Повторяйте только \`GET\`, \`PUT\`, \`DELETE\` или \`POST\` с ключом идемпотентности.
- **Повтор любых ошибок подряд.** \`400\`, \`401\`, \`403\`, \`404\` повтором не лечатся: это не «не повезло», а «вы неправы». Нагрузка утроится, результат тот же. Повторяют сетевые сбои, 5xx, 408 и 429.
- **\`fetch\` не падает на 5xx.** Промис \`fetch\` отклоняется только при сетевой ошибке (\`TypeError\`), а ответ \`503\` приходит как успешный с \`res.ok === false\`. Поэтому \`retry(() => fetch(url).then(r => r.json()))\` вообще не повторит запрос при ошибке сервера — нужно самим бросить ошибку: \`if (!res.ok) throw new HttpError(res.status)\`.
- **Передали промис вместо фабрики.** \`retry(() => p)\`, где \`p\` создан заранее, возвращает один и тот же уже отклонённый промис: операция выполнилась один раз, а \`retry\` честно отсидел все паузы и выдал ту же ошибку. Функция должна **создавать** новый запрос при каждом вызове.
- **\`return fn()\` без \`await\` внутри \`try\`.** Отклонённый промис уйдёт наружу мимо \`catch\`, повторов не будет.
- **Backoff без потолка.** На попытке с индексом 10 пауза уже 307 200 мс, больше пяти минут; к пятнадцатой — почти три часа. Нужен \`maxDelay\`.
- **Backoff без jitter.** Стадо клиентов повторяет синхронными волнами и не даёт сервису подняться.
- **Ограничено число попыток, но не время.** Три попытки по 30 секунд — полторы минуты спиннера. Ограничивайте общее время через \`AbortSignal.timeout\` или \`AbortController\`.
- **Ретрай поверх ретрая.** Если клиент, gateway и сервис делают каждый до 3 попыток, нижний сервис получит до \`3 * 3 * 3 = 27\` запросов на одно действие пользователя; при \`retries: 3\` на каждом слое (до 4 вызовов) — до 64. Решите, на каком слое живёт повтор.
- **Теряются промежуточные ошибки.** Эталон пробрасывает только последнюю. Если для диагностики нужны все, их собирают в массив и бросают \`AggregateError\`.
- **Игнорируется \`Retry-After\`.** Если сервер сказал «повтори через 30 секунд», своя экспонента с паузой 300 мс — это неуважение к лимитам и быстрый бан по 429.
- **Retry storm при системном сбое.** Массовые повторы умножают нагрузку именно тогда, когда сервису хуже всего. От этого спасает circuit breaker.

**Плюсы:** приложение переживает временные сбои сети и сервера без участия пользователя; backoff и jitter бережно относятся к бэкенду; логика вынесена в одну переиспользуемую функцию или интерсептор.
**Минусы:** при неправильной настройке усиливает аварии и дублирует неидемпотентные операции; увеличивает время до показа ошибки; скрывает реальные проблемы, если повторы не логируются.

## Как это спрашивают на собеседовании

**Главный вывод:** retry — это повтор с экспоненциальной паузой, потолком и jitter, но главное — фильтр: повторяем только временные ошибки и только идемпотентные операции, ограничиваем и попытки, и общее время.

Типичные формулировки: «Напишите retry с exponential backoff», «Зачем нужен jitter?», «Можно ли ретраить POST-запрос?», «Как сделать повтор HTTP-запросов в Angular?».

Что могут спросить следом:

- *Что такое circuit breaker и как он сочетается с retry?* — После серии ошибок он на время перестаёт пускать запросы к сервису; retry снаружи, breaker внутри, а «circuit open» не ретраится.
- *Как это сделать в RxJS?* — \`retry({ count, delay: (err, n) => timer(...) })\`; \`retryWhen\` устарел.
- *Почему \`retries: 3\` даёт 4 вызова?* — Первый вызов плюс три повтора; это стоит проговорить при уточнении задачи.
- *Как учесть \`Retry-After\`?* — Если заголовок есть, брать паузу из него вместо экспоненты.
- *Где нельзя ретраить на клиенте?* — Платежи и создание сущностей без \`Idempotency-Key\`, ошибки 4xx кроме 408 и 429.

### Как вести себя во время кодинга

Сначала проговорите уточнения: семантика \`retries\`, какие ошибки повторять, нужна ли отмена. Затем напишите версию с фиксированной паузой и скажите вслух «сейчас добавлю экспоненту и потолок», потом jitter и \`shouldRetry\`. Закончите кодом и сразу переходите ко второй части вопроса — опасностям. Интервьюеры ценят, когда кандидат сам говорит «а этот \`POST\` я бы без ключа идемпотентности не повторял».

### Ответ на 1 минуту

> Я пишу \`retry\` как цикл: вызываю фабрику \`fn\`, при успехе возвращаю результат, при ошибке сначала спрашиваю \`shouldRetry\` — лечится ли эта ошибка повтором, потом проверяю счётчик. Если можно повторять, считаю паузу \`baseDelay * factor ** attempt\`, обрезаю её потолком \`maxDelay\` и умножаю на \`Math.random()\` — это full jitter. Backoff даёт сервису время подняться, а jitter разносит клиентов во времени, иначе все, кто упал в одну секунду, повторят синхронно и снова уронят сервер. Время — до \`retries + 1\` вызовов, память O(1). Опасен retry в трёх случаях: неидемпотентные операции вроде оплаты — повторяю их только с \`Idempotency-Key\`; ошибки 4xx, кроме 408 и 429, повтор не исправит; и шторм повторов при большой аварии, от которого спасает circuit breaker. Ещё ограничиваю общее время через \`AbortSignal\`, а в Angular делаю то же интерсептором с \`retry({ count, delay })\` из RxJS.`,
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
      ru: `## В чём суть

Нужно написать \`flatten(arr, depth)\`, которая превращает \`[1, [2, [3, [4]]]]\` в плоский список, вскрывая ровно \`depth\` уровней вложенности — так же, как нативный \`Array.prototype.flat(depth)\`. Вторая часть задачи — итеративная версия, которая не падает на очень глубоких массивах. Проверяют три вещи: умеете ли вы рекурсию, понимаете ли, где у неё предел (стек вызовов), и умеете ли заменить её явным стеком.

Аналогия: коробки внутри коробок. \`depth = 1\` — вскрыли только внешние коробки и выложили содержимое на стол; то, что лежит во вложенных коробках, так и осталось в коробках. \`depth = Infinity\` — вскрываем, пока есть что вскрывать. Рекурсивная версия — это когда вы, открыв коробку, «ныряете» в неё и запоминаете в голове, где остановились снаружи; у головы есть предел. Итеративная — когда вы складываете неоткрытые коробки в стопку на полу и берёте сверху по одной: стопка может быть сколь угодно высокой.

**Какую проблему решает.** Вложенные данные встречаются постоянно: дерево меню и категорий, ответ API с группами внутри групп, строки грида с дочерними строками, ошибки валидации формы по вложенным \`FormGroup\`. Чтобы отрисовать такой список плоско, посчитать элементы или найти нужный, его разворачивают. Если делать это наивно, получаем либо падение на глубоких данных, либо квадратичное время на больших.

## Словарик терминов

- **Flatten (уплощение)** — превращение вложенного массива в одноуровневый.
- **Глубина (\`depth\`)** — сколько уровней вложенности вскрывать. \`1\` — только первый, \`Infinity\` — все.
- **Рекурсия** — функция вызывает сама себя для вложенной части задачи; нужен базовый случай, на котором вызовы прекращаются.
- **Стек вызовов (call stack)** — внутренняя память движка, где лежит по «кадру» на каждый незавершённый вызов функции. Размер ограничен.
- **Переполнение стека (stack overflow)** — кадров стало больше, чем помещается; в JS это ошибка \`RangeError: Maximum call stack size exceeded\`.
- **Явный стек (explicit stack)** — обычный массив, в который мы сами кладём (\`push\`) и из которого достаём (\`pop\`) ещё не обработанные элементы. Он живёт в куче, а не в стеке вызовов.
- **Куча (heap)** — общая память для объектов и массивов; она намного больше стека вызовов.
- **Spread (\`...\`)** — синтаксис «разложить массив на отдельные аргументы»: \`push(...[1, 2])\` равно \`push(1, 2)\`.
- **Разреженный массив (sparse array)** — массив с «дырками», например \`[1, , 3]\`: индекс 1 вообще не существует.
- **O-нотация (Big-O)** — как растёт стоимость с ростом входа: \`O(n)\` — пропорционально числу элементов, \`O(n²)\` — пропорционально квадрату.

## Как это работает под капотом

### Что уточнить у интервьюера до кода

- Какая глубина по умолчанию? (Как у \`flat\` — 1, а не бесконечность.)
- Что делать с не-массивами, похожими на массив: строками, \`arguments\`, \`NodeList\`? (Обычно — оставлять как есть, как делает \`flat\`.)
- Нужно ли сохранять порядок и что делать с «дырками» в разреженных массивах?
- Насколько глубокими и большими могут быть данные — сотни уровней или сотни тысяч?
- Можно ли просто использовать \`arr.flat(depth)\`? Если да — так и скажите, а потом напишите руками.

### Идея алгоритма простыми словами

1. Идём по элементам массива слева направо.
2. Элемент — не массив? Кладём его в результат как есть.
3. Элемент — массив **и** глубина ещё больше нуля? Разворачиваем его тем же способом, но с глубиной на единицу меньше, и подмешиваем результат на это место. Именно уменьшение глубины останавливает бесконечное разворачивание.
4. Глубина дошла до нуля — вложенный массив кладётся **целиком, как значение**. Это не баг, а смысл параметра.
5. Для произвольной глубины рекурсию заменяем циклом с собственным массивом-стеком: снимаем элемент сверху, массив — раскладываем обратно в стек, не массив — в результат. Стек растёт в куче, поэтому глубина ограничена только памятью.

### Версия 1. Самая короткая: \`reduce\` + \`concat\`, без глубины

\`\`\`js
function flattenAll(arr) {
  return arr.reduce(
    (acc, item) => acc.concat(Array.isArray(item) ? flattenAll(item) : item),
    [],
  );
}

flattenAll([1, [2, [3, [4]]], 5]); // [1, 2, 3, 4, 5]
\`\`\`

Красиво и в одну строку, но с двумя проблемами. Глубину не задать. И \`concat\` на каждом шаге создаёт **новый** массив, копируя весь накопленный \`acc\`: на плоском массиве из 20 000 чисел в нашем прогоне это заняло около секунды против 1 мс у версий ниже — классическое \`O(n²)\`.

### Версия 2. Рекурсия с глубиной — эталонный \`flatten\`

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

flatten([1, [2, [3, [4]]]]);           // [1, 2, [3, [4]]]  — depth = 1 по умолчанию
flatten([1, [2, [3, [4]]]], 2);        // [1, 2, 3, [4]]
flatten([1, [2, [3, [4]]]], Infinity); // [1, 2, 3, 4]
flatten([1, [2, [3, [4]]]], 0);        // [1, [2, [3, [4]]]] — неглубокая копия
\`\`\`

\`Infinity - 1\` остаётся \`Infinity\`, поэтому «бесконечная» глубина работает без отдельной ветки.

Честная оценка времени здесь тоньше, чем \`O(n)\` в комментарии. Каждый вложенный вызов возвращает свой массив, и \`push(...)\` **копирует** его в массив уровнем выше. Элемент на глубине \`k\` копируется \`k\` раз. Для типичных данных глубиной 2–5 уровней это те же \`O(n)\`, а для «цепочки» \`[1000, [999, [ … ]]]\` из 1001 элемента мы насчитали 501 501 копирование — это уже \`O(n * d)\`, вплоть до \`O(n²)\`.

### Версия 3. Рекурсия с общим аккумулятором — честное \`O(n)\`

\`\`\`js
function flattenInto(arr, depth = 1, result = []) {
  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) flattenInto(item, depth - 1, result);
    else result.push(item);
  }
  return result;
}

flattenInto([1, [2, [3, [4]]], 5], 2); // [1, 2, 3, [4], 5]
\`\`\`

Вместо «верни свой кусок, я его скопирую» все уровни пишут в **один** массив \`result\`. Каждый элемент кладётся ровно один раз, промежуточных массивов нет, а заодно исчезает spread с его лимитом на число аргументов.

### Версия 4. Итеративная с явным стеком — эталонный \`flattenDeep\`

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

flattenDeep([1, [2, [3, [4]]]]); // [1, 2, 3, 4]
\`\`\`

Здесь вообще нет вложенных вызовов функции: вся «память о том, что ещё не разобрано» лежит в массиве \`stack\`. \`pop\` берёт элементы **с конца**, поэтому результат собирается задом наперёд, и в конце один \`reverse()\` возвращает исходный порядок.

### Версия 5. Итеративная с глубиной и без spread

Эталонный \`flattenDeep\` умеет только «до конца». Если нужна и глубина, и устойчивость к глубоким данным, в стек кладут пары «элемент + сколько уровней ещё можно вскрыть»:

\`\`\`js
function flattenIterative(arr, depth = 1) {
  const stack = Array.from(arr, (item) => [item, depth]);
  const result = [];
  while (stack.length) {
    const [item, d] = stack.pop();
    if (Array.isArray(item) && d > 0) {
      for (const child of item) stack.push([child, d - 1]);
    } else {
      result.push(item);
    }
  }
  return result.reverse();
}

// цепочка [d, [d-1, [ … [0] … ]]] — строим циклом, чтобы самим не упереться в стек
const chainOfDepth = (d) => { let a = [0]; for (let i = 1; i <= d; i++) a = [i, a]; return a; };

flattenIterative([1, [2, [3, [4]]], 5]);           // [1, 2, [3, [4]], 5]
flattenIterative([1, [2, [3, [4]]], 5], 2);        // [1, 2, 3, [4], 5]
flattenIterative(chainOfDepth(1_000_000), Infinity).length; // 1000001 — без падения
\`\`\`

Цикл \`for…of\` вместо \`push(...item)\` снимает лимит на число аргументов: вложенный массив из миллиона элементов обрабатывается спокойно.

### Трассировка рекурсивной версии

Вход: \`flatten([1, [2, [3, [4]]]], 2)\`.

\`\`\`text
flatten([1, [2,[3,[4]]]], depth=2)
  item 1            → не массив → result = [1]
  item [2,[3,[4]]]  → массив, 2 > 0 → flatten([2,[3,[4]]], depth=1)
      item 2        → result = [2]
      item [3,[4]]  → массив, 1 > 0 → flatten([3,[4]], depth=0)
          item 3    → result = [3]
          item [4]  → массив, но 0 > 0 ложно → кладём целиком → [3, [4]]
      push(...[3,[4]]) → [2, 3, [4]]
  push(...[2,3,[4]])   → [1, 2, 3, [4]]
Ответ: [1, 2, 3, [4]]
\`\`\`

Видно, как работает глубина: на третьем уровне счётчик стал нулём, и \`[4]\` остался коробкой. Видно и копирование: \`3\` сначала попал в самый внутренний \`result\`, потом был скопирован на уровень выше, потом ещё раз.

### Трассировка итеративной версии

Вход: \`flattenDeep([1, [2, [3]], 4])\` — так видно, как работает стек.

\`\`\`text
start      stack [1,[2,[3]],4]   result []
pop 4      stack [1,[2,[3]]]     result [4]
pop [2,[3]] → push 2, [3]
           stack [1,2,[3]]       result [4]
pop [3]    → push 3
           stack [1,2,3]         result [4]
pop 3      stack [1,2]           result [4,3]
pop 2      stack [1]             result [4,3,2]
pop 1      stack []              result [4,3,2,1]
reverse()  → [1,2,3,4]
\`\`\`

Обратите внимание: «раскрытый» массив кладёт свои элементы в стек в исходном порядке, а \`pop\` снимает последний — поэтому обработка идёт справа налево, и \`reverse\` в конце обязателен.

### Сложность простыми словами

- **Версии 3, 4 и 5:** время \`O(n)\`, где \`n\` — общее число элементов вместе с вложенными массивами: каждый элемент кладётся и снимается со стека один раз. Память \`O(n)\` под результат и стек.
- **Версия 2 (эталонный \`flatten\`):** память \`O(n)\` под результат плюс \`O(d)\` кадров стека вызовов, где \`d\` — глубина. Время \`O(n)\` при небольшой глубине, но из-за копирования через spread в худшем случае \`O(n * d)\`.
- **Версия 1 (\`reduce\` + \`concat\`):** \`O(n²)\` из-за копирования аккумулятора на каждом шаге.
- **Почему \`push\` + \`reverse\`, а не \`unshift\`:** \`unshift\` сдвигает все уже лежащие элементы — это \`O(n)\` на каждую вставку и \`O(n²)\` в сумме. \`push\` — \`O(1)\`, а один \`reverse\` в конце — \`O(n)\`.

### Тест-кейсы

\`\`\`js
flatten([1, [2, [3, [4]]]]);              // [1, 2, [3, [4]]]
flatten([1, [2, [3, [4]]]], Infinity);    // [1, 2, 3, 4]
flatten([1, [2, [3, [4]]]], 0);           // [1, [2, [3, [4]]]] — копия, не тот же массив
flatten([1, [2, [3, [4]]]], -1);          // [1, [2, [3, [4]]]] — как и flat(-1)
flatten([]);                              // []
flatten([[], [[]]], Infinity);            // []
flatten(['ab', ['cd']]);                  // ['ab', 'cd'] — строки не разбираются на буквы
flatten([{ a: [1] }], Infinity);          // [{ a: [1] }] — объекты не трогаем
flattenDeep([1, [2, [3]], 4]);            // [1, 2, 3, 4]
flatten([1, , 3]);                        // [1, undefined, 3]
[1, , 3].flat();                          // [1, 3] — нативный flat выбрасывает дырки
\`\`\`

### \`Array.isArray\`: как отличить массив

\`Array.isArray(x)\` возвращает \`true\` только для настоящих массивов. Это надёжнее, чем \`x instanceof Array\` (тот ломается для массивов из другого \`iframe\`) и чем проверка \`x.length\` (она пропустит строки и объекты-«псевдомассивы»).

\`\`\`js
Array.isArray([]);               // true
Array.isArray('ab');             // false
Array.isArray({ length: 0 });    // false
Array.isArray(new Uint8Array(2)); // false — типизированный массив тоже не разворачивается
\`\`\`

### Spread в \`push\` и лимит на число аргументов

\`result.push(...inner)\` передаёт каждый элемент \`inner\` как отдельный аргумент функции. Аргументы временно лежат на стеке вызовов, поэтому их число ограничено. В нашем прогоне на Node 20 \`[].push(...array)\` с 100 000 элементов прошёл, а со 150 000 упал с \`RangeError: Maximum call stack size exceeded\`. Конкретный порог зависит от движка и размера стека.

\`\`\`js
flattenDeep([new Array(1_000_000).fill(1)]); // RangeError — из-за stack.push(...next)
flattenIterative([new Array(1_000_000).fill(1)], Infinity).length; // 1000000
\`\`\`

То есть эталонный \`flattenDeep\` спасает от **глубины**, но не от **ширины**: один огромный вложенный массив роняет его так же, как глубокая рекурсия. Цикл \`for…of\` с \`push(child)\` этой проблемы не имеет.

### Стек вызовов и \`RangeError\`

Каждый рекурсивный вызов оставляет кадр в стеке вызовов до тех пор, пока не вернёт результат. Для массива глубиной \`d\` одновременно живут \`d\` кадров. В нашем прогоне на Node 20 рекурсивный \`flatten\` падал примерно после 4 000 уровней вложенности, а итеративные версии спокойно разобрали цепочку глубиной в миллион.

\`\`\`js
const deep = chainOfDepth(10_000);   // [10000, [9999, [ … [0] … ]]]
flatten(deep, Infinity);             // RangeError: Maximum call stack size exceeded
flattenDeep(deep).length;            // 10001
deep.flat(Infinity);                 // RangeError — нативный flat тоже рекурсивен
\`\`\`

Последняя строка — неожиданный факт: нативный \`flat(Infinity)\` в V8 тоже упал на 10 000 уровней (в нашем прогоне предел был около 5 500). \`try/catch\` вокруг рекурсии помогает лишь поймать ошибку, но не сделать работу.

### \`pop\`, \`push\`, \`reverse\`, \`unshift\`: почему стек — это конец массива

\`push\` и \`pop\` работают с концом массива и не сдвигают остальные элементы — \`O(1)\`. \`unshift\` и \`shift\` работают с началом и вынуждены сдвигать всё остальное — \`O(n)\`. Поэтому стек в JS всегда делают на конце массива, а порядок восстанавливают одним \`reverse()\` (\`O(n)\` один раз).

\`\`\`js
const s = [1, 2];
s.push(3);   // [1, 2, 3]
s.pop();     // 3, s = [1, 2]
[3, 2, 1].reverse(); // [1, 2, 3] — меняет исходный массив и возвращает его
\`\`\`

### Нативные \`flat\` и \`flatMap\`

\`arr.flat(depth = 1)\` — встроенный flatten (ES2019). \`arr.flatMap(fn)\` — это \`map\`, а затем \`flat(1)\` за один проход; глубже одного уровня он не разворачивает.

\`\`\`js
[1, [2, [3, [4]]]].flat();            // [1, 2, [3, [4]]]
[1, [2, [3, [4]]]].flat(Infinity);    // [1, 2, 3, 4]
[1, 2, 3].flatMap((x) => [x, x * 10]); // [1, 10, 2, 20, 3, 30]
[[1], [[2]]].flatMap((x) => x);       // [1, [2]]
\`\`\`

В рабочем коде берите \`flat\` — ручная реализация нужна для собеседования, для очень глубоких данных или для нестандартной логики (например, развернуть только определённые узлы).

### Где это применяется на практике

- **Деревья меню, категорий, оргструктуры**: развернуть дерево в плоский список для поиска, автокомплита или виртуального скролла.
- **Гриды с группировкой и дочерними строками**: плоский список видимых строк строится из вложенных групп, глубина — это уровень раскрытия.
- **Ошибки вложенных форм**: собрать все сообщения валидации из \`FormGroup\` внутри \`FormArray\` внутри \`FormGroup\` в один список.
- **Агрегация ответов API**: \`pages.flatMap((p) => p.items)\` после постраничной загрузки.
- **Обход JSON-деревьев неизвестной глубины** (импорт файлов, конфиги): итеративный обход с явным стеком, чтобы враждебный или кривой файл не уронил вкладку переполнением стека.

## Важные нюансы и подводные камни

- **Рекурсия падает на глубоких массивах.** Переполнение стека — главный ответ, которого ждут; итеративная версия с явным стеком его снимает. И нативный \`flat(Infinity)\` тоже не бесконечен.
- **Итеративная версия со spread падает на широких массивах.** \`stack.push(...next)\` на вложенном массиве из сотен тысяч элементов упирается в лимит аргументов. Используйте цикл.
- **\`unshift\` в цикле** превращает \`O(n)\` в \`O(n²)\`. Правильно — \`push\` и один \`reverse\`.
- **Забыть \`reverse\`** в итеративной версии — порядок элементов молча перевернётся, и тест на \`[1, [2], 3]\` вернёт \`[3, 2, 1]\`.
- **\`reduce\` + \`concat\`** выглядит элегантно, но \`concat\` каждый раз создаёт новый массив и копирует накопленное — \`O(n²)\`.
- **Рекурсия с \`push(...flatten(...))\` копирует элементы на каждом уровне.** Для глубоких данных это \`O(n * d)\`; аккумулятор, передаваемый вниз, даёт честное \`O(n)\`.
- **\`depth\` по умолчанию равен 1**, а не бесконечности — как и у нативного \`flat\`. На этом ловят регулярно.
- **Дырки разреженных массивов.** Нативный \`flat\` их выбрасывает: \`[1, , 3].flat()\` даёт \`[1, 3]\`. Эталонные \`flatten\` и \`flattenDeep\` превращают дырку в \`undefined\`, потому что \`for…of\` и \`[...arr]\` читают её как \`undefined\`. Если нужна точная совместимость, пропускайте отсутствующие индексы через \`i in arr\`.
- **Псевдомассивы не разворачиваются.** \`arguments\`, \`NodeList\`, типизированные массивы и строки — не \`Array.isArray\`, они остаются как есть. Так же ведёт себя и \`flat\`.
- **Мутация входа.** Обе эталонные версии не трогают исходный массив: рекурсивная только читает, итеративная работает с копией \`[...arr]\`. Если делать \`arr.pop()\` прямо на входе, вы испортите данные вызывающего кода.

**Плюсы:** рекурсивная версия коротка и очевидна, поддерживает глубину; итеративная не зависит от размера стека вызовов и работает за честное \`O(n)\`.
**Минусы:** рекурсия ограничена глубиной стека и копирует элементы через spread; итеративная длиннее, требует \`reverse\` и аккуратности со spread; обе расходятся с нативным \`flat\` в обработке дырок.

## Как это спрашивают на собеседовании

**Главный вывод:** рекурсивный \`flatten\` разворачивает вложенный массив, пока глубина больше нуля, но упирается в стек вызовов; для произвольной глубины рекурсию заменяют явным стеком в куче с \`pop\`, \`push\` и одним \`reverse\` в конце.

Типичные формулировки: «Реализуйте \`Array.prototype.flat\`», «Напишите \`flattenDeep\` без рекурсии», «Что будет с вашей рекурсией на массиве глубиной 100 000?».

Что могут спросить следом:

- *Чем \`flat\` отличается от \`flatMap\`?* — \`flatMap\` делает \`map\` и разворачивает ровно один уровень за один проход.
- *Почему не \`unshift\`?* — Он сдвигает весь массив: \`O(n)\` на вставку и \`O(n²)\` в сумме.
- *Какая сложность у вашей рекурсии?* — \`O(n)\` при небольшой глубине; из-за копирования через spread — до \`O(n * d)\`; с общим аккумулятором — честное \`O(n)\`.
- *Как добавить глубину в итеративную версию?* — Хранить в стеке пары «элемент + оставшаяся глубина».
- *Что \`flat\` делает с дырками?* — Выбрасывает их; ручная версия на \`for…of\` превращает их в \`undefined\`.

### Как вести себя во время кодинга

Начните с уточнений про глубину по умолчанию и размер данных, потом скажите: «В проде я бы взял \`flat\`, а сейчас напишу руками». Сначала рекурсивную версию — она пишется за минуту. Затем сами поднимите тему: «на глубине в несколько тысяч уровней это упадёт со stack overflow» — и перепишите на явный стек. Прогоните вслух маленький пример вроде \`[1, [2, [3]], 4]\` через стек: это сразу показывает, зачем нужен \`reverse\`.

### Ответ на 1 минуту

> Рекурсивный \`flatten\` идёт по элементам: если элемент — массив и оставшаяся глубина больше нуля, разворачиваю его тем же способом с \`depth - 1\`, иначе кладу как есть; на нулевой глубине вложенный массив остаётся целым, а \`Infinity - 1\` даёт снова \`Infinity\`. Память — результат плюс по кадру стека на каждый уровень, и в этом проблема: на нескольких тысячах уровней получаем \`RangeError\`, даже нативный \`flat(Infinity)\` падает. Поэтому для произвольной глубины пишу итеративно: собственный массив-стек, снимаю элемент \`pop\`, массив раскладываю обратно в стек, остальное в результат, а в конце один \`reverse\`, потому что \`unshift\` дал бы O(n²). Из нюансов: \`push(...big)\` упирается в лимит аргументов, поэтому лучше цикл; spread в рекурсии копирует элементы на каждом уровне; ручная версия не выбрасывает дырки, как \`flat\`. В проде использую \`flat\`.`,
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
      ru: `## В чём суть

Нужно написать \`groupBy(items, keyFn)\`, которая раскладывает массив на группы по ключу, вычисленному **из самого элемента** функцией \`keyFn\`. На выходе — объект или \`Map\` вида «ключ → массив элементов». Сам алгоритм простой — один проход по массиву; интервьюер на самом деле проверяет **типизацию** (дженерики, \`PropertyKey\`, \`Record\`) и понимание разницы между объектом и \`Map\` как контейнером.

Аналогия: почтальон с пачкой писем и стеной почтовых ячеек в подъезде. Ключ — номер квартиры на конверте. Ячейки ещё нет — завёл новую; есть — просто положил письмо в неё. Один проход по пачке, каждое письмо трогаем ровно один раз. А \`keyFn\` — это инструкция почтальону «по чему сортировать»: сегодня по номеру квартиры, завтра по фамилии.

**Какую проблему решает.** В интерфейсах постоянно нужно группировать: заказы по статусу для канбан-доски, сотрудников по отделам, транзакции по дате для выписки, строки грида по выбранной колонке. Без общей функции каждый раз пишется свой цикл, часто неэффективный (фильтр на каждую группу) или с багами на «странных» ключах вроде \`'constructor'\`. Хорошо типизированный \`groupBy\` один раз решает задачу и подсказывает в IDE, какие группы существуют.

## Словарик терминов

- **Группировка (grouping)** — разбиение коллекции на подмножества с одинаковым ключом.
- **Функция ключа (\`keyFn\`, key selector)** — функция, которая по элементу возвращает ключ группы: \`(u) => u.role\`.
- **Бакет (bucket)** — массив-«ячейка», куда складываются элементы одной группы.
- **Дженерик (generic, \`<T, K>\`)** — параметр типа: функция работает с любым типом элементов \`T\` и ключей \`K\`, а TypeScript подставляет конкретные типы при вызове.
- **\`PropertyKey\`** — встроенный тип TypeScript \`string | number | symbol\`: всё, что может быть ключом свойства объекта.
- **\`Record<K, V>\`** — тип «объект, у которого для **каждого** ключа из \`K\` есть значение типа \`V\`».
- **\`Partial<X>\`** — тот же тип, но все свойства необязательные (могут быть \`undefined\`).
- **\`readonly T[]\`** — массив только для чтения: у него нет \`push\`, \`splice\` и других мутирующих методов.
- **\`Map\`** — встроенная коллекция «ключ → значение», где ключом может быть что угодно, включая объекты, и ключи не приводятся к строке.
- **\`??=\` (nullish assignment)** — «присвой, если сейчас \`null\` или \`undefined\`»: \`a ??= []\` равно \`a ?? (a = [])\`.
- **Прототип (prototype)** — объект, у которого обычный \`{}\` «наследует» свойства вроде \`toString\` и \`constructor\`.
- **O-нотация (Big-O)** — как растёт стоимость с ростом входа: \`O(n)\` — пропорционально числу элементов.

## Как это работает под капотом

### Что уточнить у интервьюера до кода

- Какой контейнер вернуть: обычный объект или \`Map\`? Какие бывают ключи — только строки и числа или объекты тоже?
- Нужен ли порядок групп и порядок элементов внутри группы?
- Что делать с \`null\` и \`undefined\` в качестве ключа?
- Насколько строгая нужна типизация: должен ли тип честно говорить, что группы может не быть?
- Можно ли использовать нативный \`Object.groupBy\` или нужна поддержка старых окружений?

### Идея алгоритма простыми словами

1. Создаём пустой контейнер для групп.
2. Идём по массиву один раз, слева направо.
3. Для каждого элемента вызываем \`keyFn(item)\` и получаем ключ. Поскольку функция приходит снаружи, группировать можно по чему угодно — по роли, по первой букве имени, по году.
4. Если бакета для этого ключа ещё нет, создаём пустой массив, поэтому первый элемент группы не теряется.
5. Кладём элемент в бакет через \`push\` — порядок внутри группы автоматически совпадает с порядком входа.
6. Возвращаем контейнер; входной массив при этом не меняется.

### Версия 1. Наивная: фильтр на каждую группу

\`\`\`js
function groupByNaive(items, keyFn) {
  const keys = [...new Set(items.map(keyFn))];          // все уникальные ключи
  const result = {};
  for (const k of keys) result[k] = items.filter((i) => keyFn(i) === k);
  return result;
}

groupByNaive(users, (u) => u.role);
// { admin: [Ann, Cid], user: [Bob], guest: [Dan] }
// keyFn вызвана 16 раз на 4 элементах
\`\`\`

Результат правильный, но массив пробегается заново для каждой группы: \`O(n * k)\`, где \`k\` — число групп. На 10 000 строк и 500 групп это пять миллионов вызовов \`keyFn\` вместо десяти тысяч.

### Версия 2. Один проход с обычным циклом

\`\`\`js
function groupByLoop(items, keyFn) {
  const result = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}
// keyFn вызвана 4 раза на 4 элементах
\`\`\`

Теперь каждый элемент трогаем один раз — \`O(n)\`. Это уже рабочее решение, которое не стыдно показать.

### Версия 3. Эталон: \`reduce\`, \`??=\` и дженерики

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

const byRole = groupBy(users, (u) => u.role);
// тип: Record<'admin' | 'user' | 'guest', User[]>
// { admin: [Ann, Cid], user: [Bob], guest: [Dan] }
\`\`\`

\`(acc[key] ??= []).push(item)\` делает две вещи за одну строку: если бакета нет — создаёт пустой массив и возвращает его, если есть — возвращает существующий; затем в него кладётся элемент. \`{} as Record<K, T[]>\` — стартовое значение аккумулятора, и \`as\` здесь честно признаёт, что пустой объект пока не соответствует типу.

### Версия 4. \`Map\` — для нестроковых ключей

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

groupByMap([1, '1', 2], (x) => x);
// Map(3) { 1 => [1], '1' => ['1'], 2 => [2] }  — число и строка не склеились
\`\`\`

У \`Map\` нет прототипных ключей и нет приведения к строке, поэтому ограничение \`K extends PropertyKey\` здесь не нужно — ключом может быть даже объект.

### Трассировка на конкретном входе

Вход: \`groupBy(['apple', 'avocado', 'banana', 'cherry', 'blueberry'], (s) => s[0])\`.

\`\`\`text
apple     key=a  новый бакет  acc={"a":["apple"]}
avocado   key=a  уже есть     acc={"a":["apple","avocado"]}
banana    key=b  новый бакет  acc={"a":[…],"b":["banana"]}
cherry    key=c  новый бакет  acc={"a":[…],"b":["banana"],"c":["cherry"]}
blueberry key=b  уже есть     acc={"a":["apple","avocado"],"b":["banana","blueberry"],"c":["cherry"]}
Ответ: { a: ['apple', 'avocado'], b: ['banana', 'blueberry'], c: ['cherry'] }
\`\`\`

Пять элементов — пять вызовов \`keyFn\` и пять \`push\`. \`blueberry\` попал в уже существующую группу \`b\` после \`banana\`, то есть в порядке входа.

### Сложность простыми словами

- **Время \`O(n)\`:** один проход, на каждом элементе — один вызов \`keyFn\`, одно чтение и одна запись в объект или \`Map\` (в среднем за \`O(1)\`). Если \`keyFn\` тяжёлая (форматирует дату, вызывает \`JSON.stringify\`), стоимость умножается на её цену.
- **Память \`O(n)\`:** каждый элемент попадает ровно в один бакет, плюс сами бакеты — их не больше, чем элементов. Элементы не копируются: в группах лежат ссылки на те же объекты.

### Тест-кейсы

\`\`\`js
groupBy(users, (u) => u.role);
// { admin: [Ann, Cid], user: [Bob], guest: [Dan] }

groupBy([], (x) => x);                                   // {}
groupBy([3, 1, 4, 1, 5, 9, 2, 6], (x) => (x % 2 ? 'odd' : 'even'));
// { odd: [3, 1, 1, 5, 9], even: [4, 2, 6] } — порядок внутри группы как на входе

groupBy([1, '1', 2], (x) => x);                          // { '1': [1, '1'], '2': [2] } — склеились!
groupBy([{ id: 1 }, { id: 2 }], (x) => ({ dept: x.id })); // { '[object Object]': [{ id: 1 }, { id: 2 }] }
groupBy([{ r: undefined }, { r: 'undefined' }], (x) => x.r); // { undefined: [ …оба… ] }
groupBy([{ k: 'constructor' }], (x) => x.k);             // TypeError: acc[key].push is not a function

groupByMap([NaN, NaN, 0, -0], (x) => x);                 // Map(2) { NaN => [NaN, NaN], 0 => [0, -0] }
\`\`\`

### Типизация по шагам: \`<T, K extends PropertyKey>\`

\`T\` — тип элементов, \`K\` — тип ключа. TypeScript выводит оба из аргументов: \`T\` из массива, \`K\` из того, что возвращает \`keyFn\`. Если поле \`role\` имеет тип-объединение \`'admin' | 'user' | 'guest'\`, то и \`K\` станет этим объединением, а результат — \`Record<'admin' | 'user' | 'guest', User[]>\`. IDE подскажет имена групп, а опечатка станет ошибкой компиляции.

\`\`\`ts
const byRole = groupBy(users, (u) => u.role);
byRole.admin;   // User[]
byRole.manager; // ошибка: 'manager' не входит в Role

const byName = groupBy(users, (u) => u.name);       // Record<string, User[]>
const parity = groupBy([1, 2, 3], (x) => (x % 2 ? 'odd' : 'even')); // Record<'odd' | 'even', number[]>

groupBy(users, (u) => u.dept); // ошибка: объект не является PropertyKey
\`\`\`

Ограничение \`K extends PropertyKey\` нужно, потому что ключом свойства объекта бывают только строка, число или символ. Последняя строка показывает его пользу: попытка сгруппировать объект по объекту ловится ещё до запуска.

### \`Record\` против \`Partial<Record>\`: где тип немного врёт

\`Record<K, T[]>\` обещает, что для **каждого** ключа из \`K\` есть массив. Но в реальных данных админов может не оказаться вовсе — тогда \`byRole.admin\` будет \`undefined\`, а TypeScript промолчит, и \`byRole.admin.length\` упадёт в рантайме.

\`\`\`ts
function groupByStrict<T, K extends PropertyKey>(
  items: readonly T[], keyFn: (item: T) => K,
): Partial<Record<K, T[]>> {
  const acc: Partial<Record<K, T[]>> = {};
  for (const item of items) (acc[keyFn(item)] ??= []).push(item);
  return acc;
}

const strict = groupByStrict(users, (u) => u.role);
strict.admin.length;              // ошибка: объект, возможно, undefined
const count = strict.admin?.length ?? 0; // так правильно
\`\`\`

Ровно так типизирован и нативный \`Object.groupBy\` в TypeScript: он возвращает \`Partial<Record<K, T[]>>\`.

### \`readonly T[]\`: обещание не мутировать вход

\`readonly T[]\` в параметре значит «функция только читает массив». Внутри нельзя вызвать \`push\`, \`sort\`, \`splice\` — компилятор не пропустит. Снаружи можно передать как обычный, так и readonly-массив.

\`\`\`ts
function mutate<T>(items: readonly T[]) {
  items.push(items[0]); // ошибка: свойства 'push' нет у типа 'readonly T[]'
}
\`\`\`

Для группировки это важно: если \`groupBy\` случайно отсортирует или изменит входной массив, сломается всё, что на него ссылается, например сигнал со списком строк.

### \`reduce\` и оператор \`??=\`

\`reduce(callback, initial)\` проходит массив, передавая из шага в шаг «аккумулятор» — накопленный результат. \`??=\` присваивает только если слева \`null\` или \`undefined\`, и возвращает итоговое значение.

\`\`\`js
[1, 2, 3].reduce((sum, x) => sum + x, 0); // 6

const box = {};
(box.a ??= []).push(1);   // box = { a: [1] }
(box.a ??= []).push(2);   // box = { a: [1, 2] } — второй раз массив не пересоздан
\`\`\`

Здесь \`||=\` сработал бы так же, потому что массив, даже пустой, всегда «истинный». Разница появится в варианте \`countBy\`, где значение группы — число: \`0 || 1\` перезапишет ноль, а \`??\` — нет. Обычный цикл \`for…of\` ничем не хуже \`reduce\` и многим кажется понятнее.

### Объект против \`Map\` как контейнер

\`\`\`js
groupBy([1, '1', 2], (x) => x);      // { '1': [1, '1'], '2': [2] } — ключи объекта всегда строки
groupByMap([1, '1', 2], (x) => x);   // Map { 1 => [1], '1' => ['1'], 2 => [2] }

Object.keys(groupBy([{ y: 2024 }, { y: 2023 }, { y: 2025 }], (x) => x.y));
// ['2023', '2024', '2025'] — «числовые» ключи объект сортирует по возрастанию!
\`\`\`

- **Объект** удобен: его можно отдать в JSON, читать через точку. Но ключи приводятся к строке, «числоподобные» ключи идут по возрастанию, а не в порядке появления, и ключи вроде \`constructor\` конфликтуют с прототипом.
- **\`Map\`** хранит ключи любого типа без приведения, сохраняет порядок вставки и не имеет прототипных ключей. Ключи-объекты сравниваются **по ссылке**: два разных объекта \`{ id: 's' }\` дадут две разные группы.

\`\`\`js
const sales = { id: 's' };
groupByMap(
  [{ n: 'A', dept: sales }, { n: 'C', dept: sales }, { n: 'D', dept: { id: 's' } }],
  (e) => e.dept,
);
// Map(2) { {id:'s'} => [A, C], {id:'s'} => [D] } — D в отдельной группе
\`\`\`

### Прототипные ключи: \`__proto__\`, \`constructor\`, \`toString\`

У обычного \`{}\` уже «есть» унаследованные свойства. Если ключ группы совпал с одним из них, \`acc[key]\` вернёт не \`undefined\`, а функцию или \`Object.prototype\` — \`??=\` ничего не создаст, и \`push\` упадёт:

\`\`\`js
groupBy([{ k: 'constructor' }], (x) => x.k); // TypeError: acc[key].push is not a function
groupBy([{ k: '__proto__' }], (x) => x.k);   // TypeError: acc[key].push is not a function

// Лечение 1: аккумулятор без прототипа
const groupBySafe = (items, keyFn) => items.reduce((acc, item) => {
  (acc[keyFn(item)] ??= []).push(item);
  return acc;
}, Object.create(null));
Object.keys(groupBySafe([{ k: '__proto__' }, { k: 'constructor' }], (x) => x.k));
// ['__proto__', 'constructor'] — обе группы на месте

// Лечение 2: Map
groupByMap([{ k: '__proto__' }], (x) => x.k); // Map(1) { '__proto__' => [ … ] }
\`\`\`

Это реальный риск, когда ключ приходит из пользовательских данных — например, группировка тегов, которые вводит пользователь.

### Нативные \`Object.groupBy\` и \`Map.groupBy\`

Стандарт ES2024 добавил готовые функции. \`Object.groupBy(items, fn)\` возвращает объект **без прототипа** (поэтому проблема \`constructor\` у него отсутствует), но ключи всё так же приводит к строке. \`Map.groupBy(items, fn)\` возвращает \`Map\`. Обе принимают любой iterable, а колбэк получает ещё и индекс элемента.

\`\`\`ts
const byRole = Object.groupBy(users, (u) => u.role); // Partial<Record<Role, User[]>>
const byDept = Map.groupBy(users, (u) => u.dept);    // Map<Dept, User[]>
\`\`\`

Поддержка появилась в браузерах в 2023–2024 годах; в Node — с версии 21 (в Node 20, на котором мы проверяли примеры, их ещё нет). В TypeScript нужен \`lib\` не ниже \`es2024\`. Если целевые браузеры проекта старше — пишите свою функцию или подключайте полифил.

### Angular: группировка в \`computed\`

\`\`\`ts
@Component({
  selector: 'app-users-by-role',
  template: \`
    @for (group of groups(); track group.key) {
      <h3>{{ group.key }} ({{ group.items.length }})</h3>
      @for (user of group.items; track user.id) {
        <p>{{ user.name }}</p>
      }
    }
  \`,
})
export class UsersByRoleComponent {
  readonly users = input.required<User[]>();

  readonly groups = computed(() =>
    [...groupByMap(this.users(), (u) => u.role)].map(([key, items]) => ({ key, items })),
  );
}
\`\`\`

\`computed\` пересчитывает группы только при изменении входного сигнала, а не на каждую проверку изменений. Превращение \`Map\` в массив \`{ key, items }\` нужно, чтобы \`@for\` мог по нему пройти. Альтернатива — пайп \`keyvalue\`, но он по умолчанию **сортирует** ключи; чтобы сохранить исходный порядок, ему передают \`null\` вместо функции сравнения.

### Где это применяется на практике

- **Канбан-доски и списки задач**: заказы или тикеты по статусу, каждая колонка — группа.
- **Гриды с группировкой**: строки по выбранной колонке, с итогами по группе; здесь важен порядок групп, поэтому чаще берут \`Map\`.
- **Финансовые выписки и ленты**: транзакции по дню или месяцу с заголовками-датами.
- **Справочники в формах**: \`<select>\` с \`optgroup\`, где опции сгруппированы по категории.
- **Подготовка данных для графиков**: продажи по региону или продукту перед агрегацией сумм.

## Важные нюансы и подводные камни

- **Ключи объекта — всегда строки.** \`1\` и \`'1'\` попадут в одну группу, \`undefined\` и \`'undefined'\` тоже, а объект в роли ключа даст \`'[object Object]'\` для всех элементов сразу.
- **Прототипные имена ломают объектный \`groupBy\`.** Ключ \`constructor\`, \`toString\` или \`__proto__\` на обычном \`{}\` приводит к \`TypeError: acc[key].push is not a function\`. Лечится \`Object.create(null)\` или \`Map\`.
- **«Числовые» ключи меняют порядок групп.** Объект ставит ключи вида \`'2024'\` по возрастанию перед строковыми, а не в порядке появления. Если порядок групп важен, используйте \`Map\`.
- **\`Record<K, T[]>\` слегка врёт.** TypeScript считает, что есть все ключи из \`K\`, а реально — только встреченные. Строже — \`Partial<Record<K, T[]>>\`, как у нативного \`Object.groupBy\`.
- **\`Map\` сравнивает ключи-объекты по ссылке.** Два одинаковых по содержимому объекта дадут две группы. Группируйте по примитиву (\`dept.id\`), а не по объекту целиком.
- **Составной ключ через разделитель может склеить группы.** \`\` \`\${a}|\${b}\` \`\` для пар \`('x|y', 'z')\` и \`('x', 'y|z')\` даст один и тот же ключ \`'x|y|z'\`. Надёжнее \`JSON.stringify([a, b])\` или вложенная группировка.
- **Мутация входа.** \`groupBy\` должен быть чистым; \`readonly T[]\` в сигнатуре это фиксирует на уровне типов.
- **Тяжёлая \`keyFn\`.** Она вызывается на каждый элемент: форматирование даты или \`JSON.stringify\` внутри легко превращают \`O(n)\` в заметную задержку. Считайте ключ один раз и не вызывайте \`groupBy\` в шаблоне.
- **Группы держат ссылки, а не копии.** Изменив объект в группе, вы измените его и в исходном массиве.

**Плюсы:** один проход \`O(n)\`; функция ключа делает решение универсальным; дженерики дают автодополнение групп и ловят ошибки на этапе компиляции; \`Map\`-версия корректна для любых ключей.
**Минусы:** объектная версия страдает от приведения ключей к строке и прототипных имён; \`Record\` обещает больше, чем гарантирует; \`Map\` неудобнее сериализовать в JSON и выводить в шаблоне.

## Как это спрашивают на собеседовании

**Главный вывод:** \`groupBy\` — один проход с бакетами по ключу из \`keyFn\`, \`O(n)\`; в типах \`K extends PropertyKey\` ограничивает ключ тем, что умеет хранить объект, \`Record<K, T[]>\` описывает форму, а \`Partial\` делает её честной; для произвольных ключей — \`Map\`.

Типичные формулировки: «Напишите \`groupBy\` на TypeScript», «Почему \`K extends PropertyKey\`?», «Чем вернуть результат — объектом или \`Map\`?», «Как сгруппировать по двум полям?».

Что могут спросить следом:

- *Чем ваш код отличается от \`Object.groupBy\`?* — Нативный возвращает объект без прототипа, принимает любой iterable, передаёт индекс в колбэк и типизирован как \`Partial<Record<K, T[]>>\`.
- *Как группировать по нескольким полям?* — Составной ключ через \`JSON.stringify([a, b])\` или вложенный \`groupBy\` по второму полю внутри каждой группы.
- *Почему не \`filter\` на каждую группу?* — Это \`O(n * k)\` вместо \`O(n)\`.
- *Как сделать \`countBy\`?* — Тот же проход, но вместо \`push\` — \`acc[key] = (acc[key] ?? 0) + 1\`.
- *Как не пересчитывать группы на каждый рендер?* — В Angular держать результат в \`computed\` от сигнала со списком.

### Как вести себя во время кодинга

Сначала спросите про тип ключей и про то, нужен ли объект или \`Map\`. Напишите сигнатуру с дженериками первой — это и есть вторая половина вопроса, и интервьюер увидит, что вы думаете о типах. Потом тело в три строки. Затем сами назовите проблемы объекта как контейнера (\`'1'\` против \`1\`, \`constructor\`, порядок «числовых» ключей) и покажите \`Map\`-версию.

### Ответ на 1 минуту

> \`groupBy\` раскладывает массив на группы по ключу, который считает переданная функция \`keyFn\`. Реализация — один проход: для каждого элемента считаю ключ, через \`acc[key] ??= []\` создаю бакет при первом появлении и кладу туда элемент, поэтому время и память O(n), а порядок внутри группы совпадает со входом. По типам: \`T\` — элемент, \`K extends PropertyKey\` ограничивает ключ строкой, числом или символом, потому что только такое умеет хранить объект, и TypeScript выводит \`K\` из \`keyFn\` — для поля с union-типом получаю автодополнение групп. \`Record<K, T[]>\` немного врёт, обещая все ключи, поэтому честнее \`Partial\`, как у нативного \`Object.groupBy\`. Объект приводит ключи к строке, склеивая \`1\` и \`'1'\`, падает на ключах вроде \`constructor\` и сортирует числовые ключи, поэтому для сложных ключей беру \`Map\`. В Angular держу группировку в \`computed\`.`,
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
      ru: `## В чём суть

Нужно написать \`deepEqual(a, b)\`, которая сравнивает два значения **по содержимому, а не по ссылке**: два значения равны, если рекурсивно совпадает всё, что у них внутри. \`{ a: 1 } === { a: 1 }\` даёт \`false\`, потому что это два разных объекта, а \`deepEqual\` должен сказать \`true\`. Интервьюер проверяет не столько рекурсию, сколько знание «углов» JavaScript: \`NaN\`, \`-0\`, \`Date\`, \`Map\`, \`Set\`, символьные ключи и циклические ссылки.

Аналогия: две квартиры. Ссылочное равенство (\`===\`) спрашивает «это одна и та же квартира?». Глубокое — «обстановка одинаковая?»: обходим комнату за комнатой, открываем каждый шкаф и сверяем каждый предмет. Если в шкафу лежит коробка — открываем и её.

**Какую проблему решает.** В приложениях постоянно нужно понять, «изменилось ли что-то на самом деле»: есть ли несохранённые правки в форме, отличаются ли новые фильтры от прежних, нужно ли заново грузить данные. Сравнение по ссылке тут бесполезно — новый объект с теми же полями всё равно «другой». Глубокое сравнение отвечает на вопрос по существу, но стоит дорого, поэтому важно понимать, где его применять, а где нет.

## Словарик терминов

- **Ссылочное равенство (reference equality)** — \`a === b\` для объектов истинно, только если это один и тот же объект в памяти.
- **Глубокое (структурное) равенство (deep equality)** — значения равны, если рекурсивно равны все их части.
- **Поверхностное сравнение (shallow equality)** — сравнить только верхний уровень полей через \`===\`, не спускаясь глубже.
- **\`Object.is(a, b)\`** — сравнение «тот же самый ли это значение»: как \`===\`, но \`Object.is(NaN, NaN)\` — \`true\`, а \`Object.is(0, -0)\` — \`false\`.
- **\`NaN\` (Not a Number)** — «не число», результат вроде \`0 / 0\`; единственное значение в JS, не равное самому себе через \`===\`.
- **\`-0\`** — отрицательный ноль, отдельное значение в IEEE 754; \`0 === -0\` — \`true\`, но \`1 / -0\` — \`-Infinity\`.
- **\`Reflect.ownKeys(obj)\`** — все собственные ключи объекта: строковые и символьные, перечисляемые и нет.
- **Символ (\`Symbol\`)** — уникальный примитив, который можно использовать как ключ свойства; \`Object.keys\` его не видит.
- **Конструктор (\`constructor\`)** — функция, создавшая объект; по ней отличают массив от \`Date\`, \`Map\` от обычного объекта.
- **SameValueZero** — правило сравнения ключей в \`Map\` и \`Set\`: как \`Object.is\`, но \`0\` и \`-0\` считаются одним ключом.
- **Циклическая ссылка (cycle)** — объект, который прямо или через цепочку ссылается сам на себя: \`a.self = a\`.
- **\`WeakMap\` / \`WeakSet\`** — коллекции, где ключами служат объекты, и они не мешают сборщику мусора удалить эти объекты.
- **Иммутабельность (immutability)** — данные не меняют «на месте»; любое изменение создаёт новый объект, поэтому «изменилось ли» проверяется простым \`===\`.

## Как это работает под капотом

### Что уточнить у интервьюера до кода

- Какие типы нужно поддержать: только объекты и массивы или ещё \`Date\`, \`RegExp\`, \`Map\`, \`Set\`?
- Считать ли \`NaN\` равным \`NaN\`? А \`0\` и \`-0\`?
- Важен ли прототип: равны ли \`{}\` и \`Object.create(null)\`, экземпляр класса и объектный литерал с теми же полями?
- Нужно ли учитывать символьные и неперечисляемые ключи?
- Возможны ли циклические ссылки? Это меняет реализацию.

### Идея алгоритма простыми словами

1. Сначала \`Object.is(a, b)\`: он одним махом закрывает одинаковые ссылки, равные примитивы и \`NaN\`, поэтому дальше идут только «разные» значения.
2. Если хотя бы одно из значений не объект или \`null\` — сравнивать внутри нечего, ответ \`false\`.
3. Сверяем конструкторы: разные конструкторы — разные сущности (массив не равен объекту, \`Date\` не равна \`Map\`).
4. Особые типы, у которых содержимое не лежит в собственных свойствах: \`Date\` сравниваем по \`getTime()\`, \`RegExp\` — по \`toString()\`.
5. \`Map\`: размеры, потом каждый ключ должен быть у второй карты, а значения равны рекурсивно. \`Set\`: размеры и \`has\` для каждого элемента. Порядок вставки не важен.
6. Массивы: длины, потом поэлементная рекурсия.
7. Обычные объекты: \`Reflect.ownKeys\` (видит и символы), количество ключей, затем для каждого ключа — есть ли он у второго объекта и равны ли значения рекурсивно.

### Версия 1. Наивная: \`JSON.stringify\`

\`\`\`js
const naiveEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

naiveEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] });          // true
naiveEqual({ a: 1, b: 2 }, { b: 2, a: 1 });                       // false — порядок ключей!
naiveEqual({ x: NaN }, { x: null });                              // true — NaN стал null
naiveEqual({ a: undefined }, {});                                 // true — undefined выброшен
naiveEqual({ d: new Date(0) }, { d: '1970-01-01T00:00:00.000Z' }); // true — дата стала строкой
naiveEqual(new Map([[1, 2]]), new Map());                         // true — обе стали '{}'
const c = { a: 1 }; c.self = c;
naiveEqual(c, c);                       // TypeError: Converting circular structure to JSON
\`\`\`

Это быстрый ответ «на коленке», который сразу стоит раскритиковать: он врёт в обе стороны — считает разными равные объекты и равными разные.

### Версия 2. Рекурсия для объектов и массивов

\`\`\`js
function deepEqualSimple(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a), keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqualSimple(a[k], b[k]));
}

deepEqualSimple({ a: 1, b: 2 }, { b: 2, a: 1 });               // true — порядок не важен
deepEqualSimple(NaN, NaN);                                     // false — NaN !== NaN
deepEqualSimple(new Date(0), new Date(1));                     // true — у Date нет своих ключей!
deepEqualSimple(new Map([[1, 2]]), new Map([[1, 3]]));         // true — у Map тоже
\`\`\`

Структура уже правильная, но \`Date\`, \`Map\` и \`Set\` хранят данные во внутренних слотах, а не в собственных свойствах. Для \`Object.keys\` любые две даты — пустые объекты, поэтому «равны».

### Версия 3. Эталон: все типы из условия

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

Порядок проверок важен: дешёвые отсечения (\`Object.is\`, тип, конструктор, размер) идут раньше дорогой рекурсии. Сравнение количества ключей перед обходом нужно, чтобы \`{ a: 1 }\` не оказался «равен» \`{ a: 1, b: 2 }\`: обход по ключам первого объекта лишний ключ второго не заметил бы.

### Версия 4. Production: циклы и «невалидные» даты

\`\`\`js
function deepEqualSafe(a, b, seen = new WeakMap()) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (a.constructor !== b.constructor) return false;

  // эту пару мы уже сравниваем выше по стеку — считаем равной, иначе зациклимся
  let partners = seen.get(a);
  if (partners?.has(b)) return true;
  if (!partners) seen.set(a, (partners = new WeakSet()));
  partners.add(b);

  if (a instanceof Date) return Object.is(a.getTime(), b.getTime()); // Invalid Date == Invalid Date
  if (a instanceof RegExp) return a.toString() === b.toString();
  if (a instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) if (!b.has(k) || !deepEqualSafe(v, b.get(k), seen)) return false;
    return true;
  }
  if (a instanceof Set) {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqualSafe(v, b[i], seen));
  }
  const keysA = Reflect.ownKeys(a), keysB = Reflect.ownKeys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqualSafe(a[k], b[k], seen));
}

const c1 = { a: 1 }; c1.self = c1;
const c2 = { a: 1 }; c2.self = c2;
const c3 = { a: 2 }; c3.self = c3;
deepEqual(c1, c2);                          // RangeError: Maximum call stack size exceeded
deepEqualSafe(c1, c2);                      // true
deepEqualSafe(c1, c3);                      // false
deepEqual(new Date('x'), new Date('x'));    // false — NaN === NaN
deepEqualSafe(new Date('x'), new Date('x')); // true
\`\`\`

\`seen\` запоминает пары «объект из \`a\` → объекты из \`b\`, с которыми мы его уже сравниваем». Встретив пару второй раз, мы не спускаемся в неё снова: если где-то есть отличие, его найдёт исходная, ещё не завершённая ветка рекурсии.

### Трассировка на конкретном входе

Вход: два одинаковых объекта \`{ id: 1, tags: new Set(['x']), born: new Date(0), scores: [NaN, 2] }\`.

\`\`\`text
deepEqual({…}, {…})            объекты, конструктор Object → ownKeys: id, tags, born, scores
  deepEqual(1, 1)              → true  (Object.is)
  deepEqual(Set(x), Set(x))    размеры 1 = 1, b.has('x') → true
  deepEqual(Date(0), Date(0))  getTime 0 === 0 → true
  deepEqual([NaN,2], [NaN,2])  длины 2 = 2
    deepEqual(NaN, NaN)        → true  (Object.is(NaN, NaN))
    deepEqual(2, 2)            → true
  → true
→ true
\`\`\`

А если \`scores\` различаются (\`[1, 2]\` против \`[1, 3]\`), рекурсия доходит до \`deepEqual(2, 3)\`, получает \`false\`, и \`every\` сразу прекращает обход — оставшиеся ключи даже не проверяются.

### Сложность простыми словами

- **Время \`O(n)\`**, где \`n\` — число узлов (всех значений внутри обоих деревьев): каждый узел сравнивается один раз, а \`Map.has\`, \`Set.has\` и \`hasOwnProperty\` работают в среднем за \`O(1)\`. При первом же различии работа заканчивается раньше.
- **Память \`O(d)\`** под стек рекурсии, где \`d\` — глубина вложенности, плюс временные массивы ключей на каждом уровне. Версия с \`seen\` дополнительно хранит до \`O(n)\` пар.
- **Цена — на каждый вызов.** Если сравнивать большой объект на каждое событие, \`O(n)\` умножается на число событий.

### Тест-кейсы

\`\`\`js
deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] });        // true
deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 });                     // true — порядок ключей не важен
deepEqual(NaN, NaN);                                           // true — через Object.is
deepEqual(0, -0);                                              // false — Object.is различает
deepEqual(new Date(0), new Date(0));                           // true — по getTime()
deepEqual(/a/g, /a/i);                                         // false — разные флаги
deepEqual(new Map([['a', 1], ['b', 2]]), new Map([['b', 2], ['a', 1]])); // true
deepEqual(new Set([1, 2, 3]), new Set([3, 2, 1]));             // true
deepEqual(new Set([{ a: 1 }]), new Set([{ a: 1 }]));           // false — has ищет по ссылке
deepEqual([], {});                                             // false — разные конструкторы
deepEqual({}, Object.create(null));                            // false — у второго нет constructor
deepEqual({ a: undefined }, {});                               // false — разное число ключей
deepEqual({ [Symbol.for('s')]: 1 }, { [Symbol.for('s')]: 1 }); // true — ownKeys видит символы
deepEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3]));     // false — индексы видны в ownKeys
deepEqual(() => 1, () => 1);                                   // false — функции по ссылке
\`\`\`

### \`Object.is\` против \`===\`

\`Object.is\` — это \`===\` с двумя исправлениями: \`NaN\` равен себе, а \`+0\` и \`-0\` различаются. Именно поэтому он стоит первой строкой: одна проверка закрывает одинаковые ссылки, равные примитивы и \`NaN\`.

\`\`\`js
NaN === NaN;            // false
Object.is(NaN, NaN);    // true
0 === -0;               // true
Object.is(0, -0);       // false
\`\`\`

Нужно ли считать \`0\` и \`-0\` равными — решение доменное. Для денег и координат обычно да; тогда добавьте отдельную проверку \`typeof a === 'number' && a === b\`.

### \`constructor\` и \`instanceof\`

\`a.constructor\` — функция, создавшая объект: \`Array\`, \`Date\`, \`Map\`, \`Object\` или ваш класс. Сравнение конструкторов отсекает «массив против объекта» и «\`Date\` против \`Map\`» одной строкой. \`instanceof\` затем подсказывает, какую ветку сравнения выбрать.

\`\`\`js
[].constructor === Array;            // true
({}).constructor === Object;         // true
Object.create(null).constructor;     // undefined — прототипа нет
class P {}; new P().constructor === P; // true
\`\`\`

Побочный эффект строгости: \`{}\` и \`Object.create(null)\` с одинаковыми полями — «разные». Это выбор, его стоит озвучить.

### \`Reflect.ownKeys\` против \`Object.keys\`

\`Object.keys\` возвращает только собственные **перечисляемые строковые** ключи. \`Reflect.ownKeys\` — все собственные ключи: строковые, символьные, перечисляемые и нет.

\`\`\`js
const s = Symbol('id');
const obj = { a: 1, [s]: 2 };
Object.defineProperty(obj, 'hidden', { value: 3, enumerable: false });

Object.keys(obj);        // ['a']
Reflect.ownKeys(obj);    // ['a', 'hidden', Symbol(id)]
\`\`\`

Без \`Reflect.ownKeys\` объекты, отличающиеся только символьным ключом, оказались бы равными.

### \`Map.has\` и \`Set.has\`: SameValueZero и сравнение по ссылке

\`has\` ищет ключ по правилу SameValueZero: \`NaN\` находит \`NaN\`, \`0\` и \`-0\` — один ключ, а объекты — **только по ссылке**. Поэтому \`Set\` и ключи \`Map\` эталон сравнивает «поверхностно».

\`\`\`js
new Set([NaN]).has(NaN);              // true
new Set([{ a: 1 }]).has({ a: 1 });    // false — другой объект
deepEqual(new Map([[{ id: 1 }, 'x']]), new Map([[{ id: 1 }, 'x']])); // false
\`\`\`

Честное глубокое сравнение множеств объектов требует для каждого элемента искать «глубоко равный» среди элементов второго множества — это \`O(n²)\`.

### \`WeakMap\` и \`WeakSet\` для защиты от циклов

\`WeakMap\` хранит пары «объект → значение» и не удерживает объект в памяти: когда на него больше никто не ссылается, сборщик мусора его удалит вместе с записью. Для \`seen\` это идеально — служебная память не утекает, даже если сравнение прервалось.

\`\`\`js
const seen = new WeakMap();
const a = {}, b = {};
seen.set(a, new WeakSet());
seen.get(a).add(b);         // «a уже сравнивается с b»
seen.get(a).has(b);         // true
seen.get(a).has({});        // false — другой объект
\`\`\`

### Angular и RxJS: где подставить \`deepEqual\`

По умолчанию сигналы Angular и привязки шаблона сравнивают значения через \`Object.is\`. Сигналу и \`computed\` можно передать свою функцию равенства \`equal\`, а оператору RxJS \`distinctUntilChanged\` — свой компаратор.

\`\`\`ts
const filters = signal({ status: 'open', tags: ['a'] }, { equal: deepEqual });
const query = computed(() => buildQuery(filters()));

filters.set({ status: 'open', tags: ['a'] }); // новый объект, но deepEqual → true
// query не пересчитывается, зависимые эффекты не срабатывают

of({ page: 1 }, { page: 1 }, { page: 2 })
  .pipe(distinctUntilChanged(deepEqual))
  .subscribe((v) => console.log(v));
// { page: 1 }
// { page: 2 }
\`\`\`

Без \`equal\` сигнал с новым, но одинаковым по содержимому объектом считался бы изменённым, и \`computed\` пересчитался бы. Без компаратора \`distinctUntilChanged()\` пропустил бы оба \`{ page: 1 }\`.

### Где это применяется на практике

- **Охрана несохранённых изменений**: \`canDeactivate\`-guard сравнивает текущее значение формы с исходным и спрашивает «уйти без сохранения?» только при реальной разнице.
- **Фильтры грида и дашборда**: не перезапрашивать данные, если пользователь открыл панель фильтров и закрыл её без изменений.
- **Тесты**: \`expect(actual).toEqual(expected)\` в Jest и Jasmine — это и есть глубокое равенство с похожими правилами.
- **Кэш и дедупликация запросов**: одинаковые параметры — тот же результат из кэша.
- **Готовые реализации в проде**: lodash \`isEqual\`, \`fast-deep-equal\` — проверены на краевых случаях лучше самописной функции.

## Важные нюансы и подводные камни

- **\`NaN\`.** \`NaN === NaN\` — \`false\`; без \`Object.is\` два одинаковых объекта с \`NaN\` внутри окажутся неравными.
- **\`+0\` и \`-0\`.** \`Object.is(+0, -0)\` — \`false\`. Формально верно, но для денег или координат обычно не то, что нужно. Решение доменное.
- **Циклические ссылки** без набора посещённых пар — \`RangeError: Maximum call stack size exceeded\`. Первый вопрос, который задают следом.
- **Невалидные даты в эталоне неравны.** \`new Date('x').getTime()\` — \`NaN\`, а \`NaN === NaN\` ложно, поэтому две «Invalid Date» считаются разными. Сравнивайте через \`Object.is(a.getTime(), b.getTime())\`.
- **\`Set\` с объектами внутри.** \`b.has(v)\` ищет по ссылке, поэтому вложенные объекты в \`Set\` глубоко не сравниваются. Честное сравнение потребует перебора \`O(n²)\`. То же с объектами-ключами \`Map\`.
- **Символьные ключи.** \`Object.keys\` их не видит — отсюда \`Reflect.ownKeys\`. Он же видит неперечисляемые свойства, так что объект со скрытым полем не равен объекту без него.
- **Разные прототипы.** \`{}\` и \`Object.create(null)\` с одинаковыми полями проверка конструктора объявит разными. Это выбор строгости, его нужно озвучить.
- **Приватные поля классов невидимы.** \`#cents\` не попадает в \`Reflect.ownKeys\`, поэтому \`new Money(100)\` и \`new Money(500)\` эталон считает равными. Для таких классов нужен свой метод \`equals\`.
- **Обёртки примитивов.** \`new Number(1)\` и \`new Number(2)\` не имеют собственных ключей — эталон вернёт \`true\`. Редкий случай, лечится сравнением \`valueOf()\`.
- **Дырки в массивах.** \`every\` пропускает отсутствующие индексы, поэтому \`[, 1]\` и \`[undefined, 1]\` эталон считает равными, а лишние свойства массива (\`arr.extra = 'x'\`) вообще не сравниваются.
- **Очень глубокие деревья** переполнят стек рекурсии: в нашем прогоне на Node 20 эталон падал с \`RangeError\` уже на цепочке из 5 000 вложенных объектов (порог зависит от движка и размера стека). Для таких данных нужен итеративный обход с явным стеком.
- **Глубокое сравнение в горячем пути.** \`O(n)\` на **каждый** вызов: в обнаружении изменений, в \`OnPush\`, в мемоизации это дорого. Почти всегда лучше иммутабельность и сравнение ссылок — новый объект создаётся только при реальном изменении, и тогда \`===\` достаточно.

**Плюсы:** отвечает на вопрос «изменилось ли по существу», не зависит от того, как создавались объекты; одна функция покрывает формы, фильтры, кэш и тесты.
**Минусы:** \`O(n)\` на каждый вызов; множество краевых случаев (циклы, \`Set\` объектов, приватные поля, прототипы), в каждом из которых нужно принять решение о строгости; рекурсия ограничена глубиной стека.

## Как это спрашивают на собеседовании

**Главный вывод:** \`deepEqual\` начинается с \`Object.is\` (ссылки, примитивы, \`NaN\`), отсекает не-объекты и разные конструкторы, особо обрабатывает \`Date\`, \`RegExp\`, \`Map\`, \`Set\`, а объекты сравнивает по \`Reflect.ownKeys\` рекурсивно; для циклов нужен \`WeakMap\` посещённых пар, а в горячем пути — иммутабельность вместо глубокого сравнения.

Типичные формулировки: «Напишите \`isEqual\` как в lodash», «Почему \`{a: 1} !== {a: 1}\`?», «Как сравнить два \`Map\`?», «Чем плох \`JSON.stringify\` для сравнения?».

Что могут спросить следом:

- *Как обработать циклические ссылки?* — Хранить в \`WeakMap\` пары, которые уже сравниваются выше по стеку, и при повторной встрече считать их равными.
- *Почему не \`JSON.stringify\`?* — Порядок ключей, \`NaN\` превращается в \`null\`, \`undefined\` теряется, \`Map\` и \`Set\` становятся \`{}\`, на циклах \`TypeError\`.
- *Почему не гонять \`deepEqual\` на каждый цикл \`OnPush\`?* — Это \`O(n)\` на каждую проверку; дешевле обновлять данные иммутабельно и сравнивать ссылки.
- *Чем поверхностное сравнение отличается от глубокого?* — Сравнивает только верхний уровень через \`===\`: дешевле, но вложенный изменённый объект с той же ссылкой не заметит.
- *Как сравнить \`Set\` объектов честно?* — Для каждого элемента искать глубоко равный во втором множестве, \`O(n²)\`.

### Как вести себя во время кодинга

Сначала договоритесь о правилах: \`NaN\`, \`-0\`, прототипы, циклы. Пишите проверки от дешёвых к дорогим и комментируйте каждую: «\`Object.is\` закрывает \`NaN\`», «размер до обхода — иначе лишний ключ не заметим». Закончив, сами пройдитесь по списку типов из условия и назовите, что эталон делает спорно: \`Set\` объектов, циклы, невалидные даты. Это показывает зрелость лучше, чем идеальный код.

### Ответ на 1 минуту

> Глубокое равенство сравнивает значения по содержимому, а не по ссылке. Первой строкой ставлю \`Object.is\`: он закрывает одинаковые ссылки, примитивы и \`NaN\`, ведь \`NaN === NaN\` даёт false. Дальше отсекаю не-объекты и \`null\`, сверяю конструкторы, чтобы массив не совпал с объектом, \`Date\` сравниваю по \`getTime\`, \`RegExp\` по \`toString\`. Для \`Map\` и \`Set\` сравниваю размер и содержимое без учёта порядка, массивы — по длине и поэлементно, объекты — через \`Reflect.ownKeys\`, чтобы не потерять символьные ключи. Время O(n) по узлам, память O(d) на стек. Из нюансов: \`Object.is\` различает \`0\` и \`-0\`, \`Set\` объектов эталон сравнивает по ссылке, две невалидные даты выходят неравными, а циклы без \`WeakMap\` посещённых пар дают переполнение стека. И главное: в горячем пути вроде change detection это дорого — там правильнее иммутабельность и сравнение ссылок, а \`deepEqual\` оставляю тестам, формам и фильтрам.`,
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
      ru: `## В чём суть

Нужно написать две функции: \`promiseAll\` и \`promiseAllSettled\`. Обе принимают массив промисов (или обычных значений), ждут их и возвращают результаты **в порядке входа**. Разница — в реакции на провал. \`Promise.all\` — «всё или ничего»: первая же ошибка отклоняет общий промис (**fail-fast**). \`Promise.allSettled\` — «доложить по каждому»: дожидается всех и **никогда не отклоняется**, возвращая статус каждого.

Аналогия: \`all\` — заказ на всю компанию в ресторане: не принесли одно блюдо — отменяем весь заказ и уходим. \`allSettled\` — перекличка в походе: отмечаем, кто пришёл, а кто нет, и в любом случае идём дальше со списком на руках. Важная деталь аналогии: «уйти из ресторана» не значит «остановить кухню» — повара доготовят остальные блюда, просто их никто не съест.

**Какую проблему решает.** Почти любой экран грузит данные из нескольких источников параллельно: пользователь, настройки, права, справочники. Нужно дождаться всех и при этом не потерять порядок. Если без любого из ответов экран бессмыслен — нужен \`all\`, чтобы сразу показать ошибку. Если части независимы, как виджеты дашборда, — нужен \`allSettled\`, чтобы одна упавшая панель не роняла остальные.

## Словарик терминов

- **Промис (Promise)** — объект-обещание результата асинхронной операции, который появится позже.
- **Состояния промиса** — \`pending\` (ждёт), \`fulfilled\` (выполнен со значением), \`rejected\` (отклонён с причиной). Выполненный или отклонённый промис называют **settled** (завершённым); состояние меняется только один раз.
- **Комбинатор (combinator)** — функция, которая собирает несколько промисов в один: \`all\`, \`allSettled\`, \`race\`, \`any\`.
- **Fail-fast** — стратегия «упасть при первой ошибке, не дожидаясь остальных».
- **\`Promise.resolve(x)\`** — превращает что угодно в промис: обычное значение — в выполненный промис, промис возвращает как есть, thenable «усыновляет».
- **Thenable** — любой объект с методом \`then\`; промисы умеют работать с такими объектами из других библиотек.
- **Микрозадача (microtask)** — очередь, в которой выполняются колбэки \`then\`; они запускаются сразу после текущего синхронного кода, раньше таймеров.
- **Unhandled rejection** — отклонённый промис, на который никто не повесил обработчик ошибки; браузер пишет \`Uncaught (in promise)\`, Node по умолчанию завершает процесс.
- **\`AggregateError\`** — ошибка, которая содержит массив других ошибок в поле \`errors\`; её бросает \`Promise.any\`, когда упали все.
- **\`AbortController\`** — стандартный механизм отмены: \`controller.abort()\` прерывает все \`fetch\`, которым передан его \`signal\`.
- **Разреженный массив (sparse array)** — массив с «дырками», например \`[1, , 3]\`.

## Как это работает под капотом

### Что уточнить у интервьюера до кода

- На входе только массив или любой iterable (\`Set\`, генератор)?
- Могут ли быть не-промисы и «чужие» thenable?
- Что вернуть для пустого входа?
- Нужно ли что-то делать с остальными промисами после первой ошибки в \`all\` (отменять их)?
- Нужна ли типизация, сохраняющая типы элементов кортежа?

### Идея алгоритма простыми словами

1. Возвращаем новый промис — снаружи его будут \`await\`-ить.
2. Заводим массив результатов **сразу нужной длины** и отдельный счётчик завершённых. Это «полки с номерами» и «сколько полок уже занято».
3. Пустой вход сразу резолвим с \`[]\`, потому что иначе счётчик никогда не дойдёт до нуля элементов и промис зависнет.
4. Каждый элемент оборачиваем в \`Promise.resolve(item)\` — поэтому обычные значения и thenable тоже работают.
5. Подписываемся на каждый и пишем результат **по индексу \`i\`**, замкнутому в колбэке. Поэтому порядок результатов совпадает с порядком входа, хотя завершаются промисы вразнобой.
6. Увеличиваем счётчик; когда он равен длине входа — резолвим общий промис.
7. **Вся разница — во втором колбэке \`then\`.** У \`all\` там \`reject(err)\`: первая ошибка сразу отклоняет общий промис. У \`allSettled\` там запись \`{ status: 'rejected', reason }\`, и счётчик крутится дальше — отклониться он не может в принципе.

### Версия 1. Наивная: \`await\` по очереди

\`\`\`js
// помощники для всех примеров ниже
const delay = (value, ms) => new Promise((res) => setTimeout(() => res(value), ms));
const fail = (msg, ms) => new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms));

async function naiveAll(items) {
  const results = [];
  for (const item of items) results.push(await item);
  return results;
}

await naiveAll([delay('A', 30), 'B', delay('C', 10)]); // ['A', 'B', 'C'] через ~30 мс
\`\`\`

Порядок правильный, и время даже не суммируется: промисы уже запущены, когда попали в массив, мы лишь ждём их по очереди. Но есть две беды:

\`\`\`js
naiveAll([delay('slow', 200), fail('boom', 10)]).catch((e) => console.log('caught', e.message));
// через 10 мс 'boom' отклоняется, а на него ещё никто не подписан (мы ждём 'slow')
// Node 20: процесс падает с Error: boom — до 'caught' дело не доходит
// браузер: Uncaught (in promise) Error: boom в консоли
\`\`\`

Fail-fast не работает — об ошибке мы узнаём только через 200 мс. И это та самая ситуация unhandled rejection: на упавший промис обработчик повесили слишком поздно.

### Версия 2. Эталонный \`promiseAll\`

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

await promiseAll([1, Promise.resolve(2), delay(3, 30)]);   // [1, 2, 3]
await promiseAll([delay('slow', 100), delay('fast', 10)]); // ['slow', 'fast'] — порядок входа
await promiseAll([delay(1, 50), fail('boom', 10)]);        // reject: Error('boom') через ~10 мс
\`\`\`

Обработчики вешаются **на все элементы сразу**, синхронно, в \`forEach\`. Поэтому любая ошибка ловится немедленно, и ни один промис не остаётся без обработчика.

### Версия 3. Эталонный \`promiseAllSettled\`

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

await promiseAllSettled([1, fail('nope', 10), delay('ok', 20)]);
// [
//   { status: 'fulfilled', value: 1 },
//   { status: 'rejected',  reason: Error('nope') },
//   { status: 'fulfilled', value: 'ok' }
// ]
\`\`\`

У внешнего промиса нет даже параметра \`reject\` — отклониться он не может. Счётчик увеличивается в \`finally\`, то есть при любом исходе. Тип \`Settled<T>\` — это размеченное объединение: проверив \`status\`, TypeScript знает, есть ли у элемента \`value\` или \`reason\`. Во встроенных типах TS то же самое называется \`PromiseSettledResult<T>\`.

### Версия 4. \`allSettled\` через \`all\` — элегантная альтернатива

\`\`\`js
const allSettledViaAll = (items) =>
  promiseAll(items.map((item) =>
    Promise.resolve(item).then(
      (value) => ({ status: 'fulfilled', value }),
      (reason) => ({ status: 'rejected', reason }),
    ),
  ));

await allSettledViaAll([1, fail('nope', 10)]);
// [{ status: 'fulfilled', value: 1 }, { status: 'rejected', reason: Error('nope') }]
\`\`\`

Каждый элемент заранее «обезврежен»: его ошибка превращается в обычное значение-отчёт. Поэтому \`all\` никогда не видит отказов и всегда ждёт всех. Этот приём показывает, что семантическая разница между комбинаторами — только в обработке ошибки.

### Трассировка \`promiseAll\` на конкретном входе

Вход: \`promiseAll([delay('A', 30), 'B', delay('C', 10)])\`.

\`\`\`text
синхронно: results = [пусто, пусто, пусто], completed = 0
           forEach подписался на все три, ни один ещё не завершён
~0 мс  (микрозадача): i=1 'B' → results = [пусто, 'B', пусто], completed = 1
~10 мс:               i=2 'C' → results = [пусто, 'B', 'C'],   completed = 2
~30 мс:               i=0 'A' → results = ['A', 'B', 'C'],     completed = 3 === 3 → resolve
Ответ: ['A', 'B', 'C']
\`\`\`

Завершились в порядке B, C, A, а результат — в порядке входа, потому что каждый пишет в свою ячейку \`results[i]\`.

Теперь с ошибками: \`promiseAll([delay('A', 30), fail('E1', 10), fail('E2', 20)])\`.

\`\`\`text
~10 мс: i=1 reject E1 → внешний промис отклонён с E1, await бросает E1
~20 мс: i=2 reject E2 → reject() вызван повторно — игнорируется, промис уже settled
~30 мс: i=0 'A'       → results = ['A', пусто, пусто] — записали, но никто не слушает
\`\`\`

Повторные \`resolve\` и \`reject\` безопасны: промис фиксирует только первый вызов, поэтому флаг «уже завершились» не нужен.

### Сложность простыми словами

- **Время на постановку \`O(n)\`:** один проход \`forEach\`, на каждый элемент — одна подписка. Каждое завершение обрабатывается за \`O(1)\` благодаря счётчику.
- **Время ожидания** — время **самого медленного** промиса для \`all\` при успехе (или первого упавшего при ошибке) и самого медленного для \`allSettled\`, а не сумма времён.
- **Память \`O(n)\`:** массив результатов на \`n\` ячеек.
- **Почему счётчик, а не проверка массива:** проверять «все ли ячейки заполнены» перебором — \`O(n)\` на каждое завершение и \`O(n²)\` в сумме.

### Тест-кейсы

\`\`\`js
await promiseAll([]);                                     // [] — сразу
await promiseAll([1, 2]);                                 // [1, 2] — не-промисы работают
await promiseAll([{ then(res) { res(42); } }]);           // [42] — thenable
await promiseAll([delay('slow', 100), delay('fast', 10)]); // ['slow', 'fast']
await promiseAll([delay(1, 50), fail('boom', 10)]);       // reject Error('boom') через ~10 мс
await promiseAll([1, new Promise(() => {})]);             // висит вечно — один «вечный» промис

await promiseAllSettled([]);                              // []
await promiseAllSettled([1, fail('nope', 10)]);
// [{ status: 'fulfilled', value: 1 }, { status: 'rejected', reason: Error('nope') }]

// расхождения полифила с нативным:
await Promise.all([1, , 3]);                              // [1, undefined, 3]
await promiseAll([1, , 3]);                               // висит вечно — forEach пропустил дырку
await Promise.all(new Set([1, 2]));                       // [1, 2]
await promiseAll(new Set([1, 2]));                        // висит вечно — у Set нет length
\`\`\`

### \`Promise.resolve\` и thenable

\`Promise.resolve(x)\` нормализует вход: значение превращает в выполненный промис, настоящий промис возвращает как есть, а у thenable вызывает \`then\` и «усыновляет» его результат. Без этой обёртки \`(5).then\` — это \`undefined\`, и вызов упадёт с \`TypeError\`.

\`\`\`js
Promise.resolve(5).then(console.log);                     // 5
const p = Promise.resolve(1); Promise.resolve(p) === p;   // true
Promise.resolve({ then(res) { res('из чужой библиотеки'); } }).then(console.log);
// из чужой библиотеки
\`\`\`

### Двухаргументный \`then\` и \`finally\`

\`then(onFulfilled, onRejected)\` вешает оба обработчика на **исходный** промис. В отличие от \`.then(ok).catch(fail)\`, ошибка, брошенная внутри \`ok\`, во второй колбэк не попадёт — нам и нужен только провал исходного промиса. \`finally(fn)\` вызывается при любом исходе и не получает значения — поэтому счётчик \`allSettled\` стоит именно там.

\`\`\`js
Promise.reject(new Error('x')).then(
  (v) => console.log('ok', v),
  (e) => console.log('fail', e.message),
); // fail x

Promise.resolve(1).finally(() => console.log('finally')).then(console.log);
// finally
// 1 — finally пропускает значение дальше без изменений
\`\`\`

### \`Promise.race\` и \`Promise.any\` — для полноты картины

- **\`Promise.race\`** — первый **завершившийся** любым исходом, включая ошибку. На пустом массиве висит вечно.
- **\`Promise.any\`** — первый **успешный**; отклоняется с \`AggregateError\`, только если упали все. На пустом массиве сразу отклоняется.

\`\`\`js
await Promise.race([fail('a', 10), delay('b', 20)]); // reject Error('a') — ошибка пришла первой
await Promise.any([fail('a', 10), delay('b', 20)]);  // 'b' — первый успех
await Promise.any([fail('a', 10), fail('b', 20)]);   // reject AggregateError, errors: ['a', 'b']
await Promise.any([]);                               // reject AggregateError: All promises were rejected
\`\`\`

### Отмена остальных через \`AbortController\`

\`Promise.all\` ничего не отменяет: после первой ошибки остальные запросы продолжают выполняться до конца. Если это \`fetch\`, их можно прервать общим сигналом:

\`\`\`js
async function loadAll(urls) {
  const ctrl = new AbortController();
  try {
    return await Promise.all(urls.map((u) =>
      fetch(u, { signal: ctrl.signal }).then((r) => {
        if (!r.ok) throw new Error(\`HTTP \${r.status}\`);
        return r.json();
      }),
    ));
  } catch (e) {
    ctrl.abort();   // прерываем всё, что ещё летит
    throw e;
  }
}
// /fail отвечает 500 сразу, /slow — через секунду:
// client: HTTP 500
// server: slow request aborted by client
\`\`\`

### Angular: \`forkJoin\` как \`Promise.all\` для Observable

В Angular \`HttpClient\` возвращает Observable, и аналог \`Promise.all\` — \`forkJoin\`: ждёт завершения всех потоков и выдаёт их последние значения. Ошибка любого — fail-fast, но, в отличие от промисов, \`forkJoin\` **отписывается** от остальных, а для \`HttpClient\` отписка означает отмену запроса.

\`\`\`ts
forkJoin({ user: this.api.user(), settings: this.api.settings() })
  .subscribe(({ user, settings }) => this.render(user, settings));

// аналог allSettled: каждый поток заранее превращает ошибку в отчёт
const settled = <T>(src$: Observable<T>) => src$.pipe(
  map((value) => ({ status: 'fulfilled' as const, value })),
  catchError((reason) => of({ status: 'rejected' as const, reason })),
);
forkJoin(panelIds.map((id) => settled(this.api.panel(id))))
  .subscribe((results) => this.renderPanels(results));
\`\`\`

Проверено на RxJS 7.8: при ошибке одного источника второй, ещё не завершённый, получает отписку (его \`finalize\` срабатывает). Нюанс: поток, завершившийся без значения, заставит \`forkJoin\` завершиться вообще без \`next\`.

### Где это применяется на практике

- **Загрузка экрана**: пользователь, права и настройки одновременно через \`all\` — без любого из ответов рендерить нечего.
- **Дашборды и виджеты**: каждая панель грузится независимо через \`allSettled\`, упавшие показывают заглушку «не удалось загрузить».
- **Массовые операции**: загрузить 20 файлов или отправить пачку изменений и показать отчёт «18 успешно, 2 с ошибкой» — это \`allSettled\`.
- **Предзагрузка справочников при старте приложения** (\`provideAppInitializer\`): \`all\`, потому что без справочников формы не работают.
- **Резервные источники**: запросить данные с двух зеркал и взять первый успешный ответ — \`any\`.

## Важные нюансы и подводные камни

- **\`all\` ничего не отменяет.** После первой ошибки остальные запросы выполняются до конца, нагружая сеть и сервер. Отмена — только через \`AbortController\` (или \`forkJoin\` с \`HttpClient\`, который отписывается сам).
- **Ошибки остальных промисов не становятся unhandled.** \`all\` повесил обработчики на все элементы сразу, поэтому вторая и последующие ошибки просто молча игнорируются. Unhandled rejection возникает в наивной версии с последовательным \`await\`, где обработчик на упавший промис вешается слишком поздно.
- **Пустой массив.** Без явной проверки счётчик никогда не дойдёт до нуля элементов, и промис зависнет навсегда — самый частый провал этой задачи. Нативный \`Promise.all([])\` резолвится сразу.
- **Счётчик, а не \`results.length\`.** Массив создан через \`new Array(n)\`, и его длина равна \`n\` с самого начала, даже когда все ячейки пустые. Проверка по длине резолвила бы промис после первого же ответа.
- **\`push\` вместо записи по индексу** — порядок станет порядком завершения: быстрый запрос обгонит медленный.
- **\`allSettled\` никогда не отклоняется**, поэтому забытая проверка \`status\` означает тихо проглоченные ошибки: в \`try/catch\` вы не попадёте никогда.
- **Не-промисы на входе** — без \`Promise.resolve\` вызов \`.then\` на обычном значении упадёт с \`TypeError\`.
- **Дырки во входном массиве вешают эталонный полифил.** \`forEach\` пропускает отсутствующие индексы, счётчик не доходит до \`items.length\`, и \`promiseAll([1, , 3])\` не завершится никогда. Нативный вариант обходит вход итератором и даёт \`[1, undefined, 3]\`. Лечение — \`Array.from(items)\` в начале.
- **Только массивы.** Нативные комбинаторы принимают любой iterable. Эталон с \`Set\` зависает (у \`Set\` есть \`forEach\`, но нет \`length\`), с генератором — падает с \`TypeError\`. Тот же \`Array.from\` решает и это.
- **Один «вечный» промис вешает и \`all\`, и \`allSettled\`.** Для запросов без таймаута оборачивайте каждый в \`Promise.race\` с таймером или используйте \`AbortSignal.timeout\`.
- **Типизация эталона теряет кортеж.** \`promiseAll([getUser(), getSettings()])\` без явного параметра типа даже не скомпилируется (TypeScript выведет \`T\` из первого элемента), а с \`<User | Settings>\` вернёт массив объединений. Нативный \`Promise.all\` типизирован через кортеж и знает, что первый элемент — \`User\`, а второй — \`Settings\`.
- **Всё запускается сразу.** К моменту вызова \`all\` промисы уже выполняются; на 500 элементах это 500 одновременных запросов. Нужен лимит параллельности — пул из N «воркеров».

**Плюсы:** \`all\` даёт простую семантику «всё или ничего» и быструю реакцию на ошибку; \`allSettled\` даёт полный отчёт и устойчивость к частичным сбоям; оба сохраняют порядок входа и ждут параллельно.
**Минусы:** \`all\` теряет успешные результаты при одной ошибке и не отменяет остальные операции; \`allSettled\` легко превращается в молчаливое проглатывание ошибок; ни один не ограничивает параллельность и не защищает от вечных промисов.

## Как это спрашивают на собеседовании

**Главный вывод:** оба комбинатора — это массив результатов по индексу плюс счётчик; \`all\` отклоняется при первой ошибке и теряет остальное, \`allSettled\` ждёт всех и возвращает \`{ status, value | reason }\` по каждому. Обязательные детали реализации — \`Promise.resolve\`, запись по индексу, счётчик и пустой вход.

Типичные формулировки: «Напишите полифил \`Promise.all\`», «Чем \`all\` отличается от \`allSettled\`?», «Что будет с остальными запросами, если один упал?», «Когда вы выберете \`allSettled\`?».

Что могут спросить следом:

- *Чем отличаются \`race\` и \`any\`?* — \`race\` отдаёт первый завершившийся любым исходом, \`any\` — первый успешный и отклоняется с \`AggregateError\`, только если упали все.
- *Отменяются ли остальные промисы?* — Нет; для отмены нужен \`AbortController\`, а в RxJS \`forkJoin\` сам отписывается от остальных.
- *Как ограничить параллельность?* — Пул: держим указатель на следующую задачу и запускаем не более N задач; каждая по завершении берёт следующую.
- *Как реализовать \`allSettled\` через \`all\`?* — Заранее превратить каждую ошибку в значение-отчёт через двухаргументный \`then\`.
- *Будут ли unhandled rejection от остальных промисов?* — Нет, \`all\` подписан на все; проблема возникает при последовательном \`await\`.

### Как вести себя во время кодинга

Начните с уточнений про iterable, не-промисы и пустой вход. Пишите \`promiseAll\` и проговаривайте каждую деталь: «оборачиваю в \`Promise.resolve\`, пишу по индексу, считаю отдельным счётчиком». Затем скажите: «\`allSettled\` отличается одной строкой — вместо \`reject\` записываю отчёт», и покажите это. В конце сами назовите ограничения: нет отмены, нет лимита параллельности, дырки и \`Set\` на входе.

### Ответ на 1 минуту

> Разница семантическая. \`Promise.all\` — fail-fast: резолвится массивом результатов, когда выполнятся все, но отклоняется при первой же ошибке, и остальные результаты теряются — это «всё или ничего». \`Promise.allSettled\` ждёт всех независимо от исхода, никогда не отклоняется и возвращает по каждому \`{ status: 'fulfilled', value }\` или \`{ status: 'rejected', reason }\` — для независимых операций вроде виджетов дашборда. Реализация у обоих одна: оборачиваю каждый элемент в \`Promise.resolve\`, пишу результат по индексу, чтобы сохранить порядок входа, считаю завершения отдельным счётчиком, а не длиной массива, и сразу резолвлю пустой вход, иначе промис зависнет. У \`allSettled\` вместо \`reject\` во втором колбэке — запись отчёта. Нюансы: \`all\` не отменяет уже запущенные запросы — для этого \`AbortController\`, а в Angular \`forkJoin\` сам отписывается; и \`allSettled\` легко проглатывает ошибки, если забыть проверить \`status\`.`,
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
