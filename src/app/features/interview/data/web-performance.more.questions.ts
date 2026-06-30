import { InterviewQuestion } from '../interfaces/question.interface';

export const WEB_PERFORMANCE_QUESTIONS_MORE: InterviewQuestion[] = [
  {
    id: 'web-039',
    category: 'web-performance',
    level: 'Hard',
    tags: ['container-queries', 'modern-css', 'responsive'],
    question: {
      ru: 'Что такое container queries? Чем они отличаются от media queries и какие есть нюансы с `container-type` и производительностью?',
      en: 'What are container queries? How do they differ from media queries, and what are the nuances around `container-type` and performance?'
    },
    answer: {
      ru: `## Container Queries

Media queries реагируют на **viewport**, container queries — на **размер ближайшего контейнера-предка**. Это делает компоненты по-настоящему переиспользуемыми: один и тот же \`Card\` адаптируется в сайдбаре и в основной колонке без знания о глобальном брейкпоинте.

\`\`\`css
.sidebar { container-type: inline-size; container-name: panel; }

@container panel (min-width: 400px) {
  .card { grid-template-columns: 1fr 2fr; }
}
\`\`\`

### Ключевые моменты

- **\`container-type\`**: \`inline-size\` отслеживает только ширину (дёшево); \`size\` — обе оси, но требует явной высоты, иначе контент схлопнется. \`normal\` отключает size-queries, но оставляет style-queries.
- **Containment**: объявление контейнера включает layout/style/inline-size containment. Элемент становится изолированным для layout — браузер не пересчитывает предков при изменении внутри. Это плюс к производительности, но **нельзя** задать container-query себе же: запрашивается всегда предок.
- **Единицы \`cqw/cqh/cqi/cqb\`**: проценты от размера query-контейнера. Удобно для fluid-типографики внутри компонента.

### Производительность

Containment ограничивает зону пересчёта layout, что снижает стоимость reflow. Но избыточные контейнеры на каждом узле создают много sub-layout-roots; измеряйте через **Performance panel** (Layout/Recalc Style). Style queries (\`@container style(--theme: dark)\`) поддержаны частично — проверяйте baseline. Container queries — это Baseline 2023, безопасны в современных браузерах.`,
      en: `## Container Queries

Media queries react to the **viewport**; container queries react to the **size of the nearest container ancestor**. This makes components truly reusable: the same \`Card\` adapts in a sidebar and in the main column without knowing any global breakpoint.

\`\`\`css
.sidebar { container-type: inline-size; container-name: panel; }

@container panel (min-width: 400px) {
  .card { grid-template-columns: 1fr 2fr; }
}
\`\`\`

### Key points

- **\`container-type\`**: \`inline-size\` tracks width only (cheap); \`size\` tracks both axes but requires an explicit height or content collapses. \`normal\` disables size queries but keeps style queries.
- **Containment**: declaring a container turns on layout/style/inline-size containment. The element becomes a layout boundary — the browser does not re-layout ancestors when its insides change. That helps performance, but you **cannot** query an element against itself: you always query an ancestor.
- **\`cqw/cqh/cqi/cqb\` units**: percentages of the query container's size — handy for fluid typography scoped to a component.

### Performance

Containment limits the layout recalc region, lowering reflow cost. But putting a container on every node creates many sub-layout roots; measure via the **Performance panel** (Layout/Recalc Style). Style queries (\`@container style(--theme: dark)\`) are partially supported — check Baseline. Container queries are Baseline 2023 and safe in modern browsers.`
    },
    codeSnippet: `/* A card that lays itself out based on its container, not the screen */
.card-host {
  container-type: inline-size;
  container-name: card;
}

.card { display: grid; gap: 0.5rem; }

@container card (min-width: 30rem) {
  .card {
    grid-template-columns: 8rem 1fr;
    /* cqi = 1% of the query container's inline size */
    font-size: clamp(0.9rem, 2cqi, 1.2rem);
  }
}`
  },
  {
    id: 'web-040',
    category: 'web-performance',
    level: 'Hard',
    tags: ['has-selector', 'modern-css', 'selectors'],
    question: {
      ru: 'Как работает `:has()` («родительский селектор»)? Какие паттерны он открывает и есть ли стоимость по производительности?',
      en: 'How does the `:has()` selector (the "parent selector") work? What patterns does it unlock and is there a performance cost?'
    },
    answer: {
      ru: `## \`:has()\` — реляционный селектор

\`:has()\` выбирает элемент, **если он содержит** (или соотносится с) элементом, описанным аргументом. Это первый способ стилизовать предка на основе потомка без JS.

\`\`\`css
/* Карточка с изображением выглядит иначе */
.card:has(img) { padding: 0; }

/* Лейбл обязательного поля */
label:has(+ input:required)::after { content: ' *'; color: red; }

/* Форма с невалидным полем */
form:has(:invalid) .submit { opacity: 0.5; }
\`\`\`

### Что открывает

- **Стилизация предка**: подсветить \`<tr>\`, содержащий \`:checked\` чекбокс.
- **Сиблинг-логика**: \`h2:has(+ p)\` — заголовок, за которым идёт параграф.
- **Quantity queries** в связке с \`:nth-child\`.
- **Заменяет JS-классы**: меньше ручного toggling классов.

### Производительность

Исторически "родительский селектор" считали невозможным из-за стоимости. Современные движки (Blink/WebKit) реализуют его с **инвалидацией поддеревьев**: при изменении потомка браузер помечает кандидатов \`:has()\` для пересчёта стиля. Дорогими бывают широкие селекторы вроде \`*:has(.x)\` или \`:has()\` с динамическими состояниями в больших деревьях — это может расширить зону Style Recalc.

**Практика**: квалифицируйте левую часть (\`.card:has(...)\`, не \`*:has(...)\`), избегайте \`:has()\` на часто меняющихся состояниях в огромных списках. Baseline 2023 (Firefox добавил позже). Измеряйте «Recalculate Style» в Performance.`,
      en: `## \`:has()\` — the relational selector

\`:has()\` matches an element **if it contains** (or relates to) the element described by its argument. It is the first way to style an ancestor based on a descendant without JS.

\`\`\`css
/* A card containing an image looks different */
.card:has(img) { padding: 0; }

/* Marker on a required field's label */
label:has(+ input:required)::after { content: ' *'; color: red; }

/* A form with an invalid field */
form:has(:invalid) .submit { opacity: 0.5; }
\`\`\`

### What it unlocks

- **Ancestor styling**: highlight a \`<tr>\` that contains a \`:checked\` checkbox.
- **Sibling logic**: \`h2:has(+ p)\` — a heading followed by a paragraph.
- **Quantity queries** combined with \`:nth-child\`.
- **Replaces JS classes**: less manual class toggling.

### Performance

The "parent selector" was historically deemed infeasible because of cost. Modern engines (Blink/WebKit) implement it with **subtree invalidation**: when a descendant changes, the browser marks \`:has()\` candidates for style recalc. The expensive cases are broad selectors like \`*:has(.x)\` or \`:has()\` over dynamic states in large trees, which can widen the Style Recalc region.

**Practice**: qualify the left side (\`.card:has(...)\`, not \`*:has(...)\`), and avoid \`:has()\` on frequently changing states inside huge lists. Baseline 2023 (Firefox shipped it later). Measure "Recalculate Style" in the Performance panel.`
    },
    codeSnippet: `/* Toggle a whole layout from a checkbox state — no JS */
.layout:has(#nav-toggle:checked) {
  grid-template-columns: 16rem 1fr;
}

/* Style a row that contains a selected checkbox */
tr:has(input[type="checkbox"]:checked) {
  background: var(--row-selected, #eef);
}

/* Avoid: unqualified left side scans the whole document */
/* *:has(.error) { ... }  -> prefer .field:has(.error) */`
  },
  {
    id: 'web-041',
    category: 'web-performance',
    level: 'Expert',
    tags: ['cascade-layers', 'layer', 'specificity'],
    question: {
      ru: 'Что такое cascade layers (`@layer`)? Как они меняют каскад и зачем нужны при больших кодовых базах?',
      en: 'What are cascade layers (`@layer`)? How do they change the cascade and why do they matter in large codebases?'
    },
    answer: {
      ru: `## Cascade Layers (\`@layer\`)

\`@layer\` вводит **новое измерение каскада** *между* origin и specificity. Порядок объявления слоёв определяет приоритет: правило из более позднего слоя побеждает правило из раннего слоя **независимо от специфичности**.

\`\`\`css
@layer reset, base, components, utilities;

@layer base {
  a { color: blue; }           /* проигрывает */
}
@layer utilities {
  .link { color: rebeccapurple; } /* побеждает, даже с меньшей специфичностью */
}
\`\`\`

### Алгоритм каскада (упрощённо, по убыванию приоритета)

1. Origin + importance (user-agent, user, author; \`!important\` инвертирует порядок).
2. **Слои**: внутри author-origin — порядок объявления слоёв.
3. Специфичность.
4. Порядок появления.

Ключевой нюанс: **\`!important\` инвертирует порядок слоёв** — important-правило в *раннем* слое побеждает important в позднем. Это даёт «слой защиты» для критичных переопределений.

### Зачем

- **Контроль над сторонним CSS**: оборачиваете библиотеку в \`@layer framework\`, а свои стили — в более поздний слой, и они побеждают **без гонки специфичности и без \`!important\`**.
- **Предсказуемость**: явный порядок вместо войны селекторов (\`.a .b .c\` против \`#id\`).
- **Незалейеренные стили** имеют **высший** приоритет среди author-стилей (идут после всех именованных слоёв) — помните об этом при миграции.

Baseline 2022. Совмещается с \`@import url(...) layer(name)\` для подключения вендорного CSS прямо в слой.`,
      en: `## Cascade Layers (\`@layer\`)

\`@layer\` adds a **new cascade dimension** *between* origin and specificity. Layer declaration order sets priority: a rule from a later layer beats a rule from an earlier layer **regardless of specificity**.

\`\`\`css
@layer reset, base, components, utilities;

@layer base {
  a { color: blue; }           /* loses */
}
@layer utilities {
  .link { color: rebeccapurple; } /* wins, even at lower specificity */
}
\`\`\`

### Cascade algorithm (simplified, highest first)

1. Origin + importance (user-agent, user, author; \`!important\` flips the order).
2. **Layers**: within the author origin, layer declaration order.
3. Specificity.
4. Order of appearance.

A key subtlety: **\`!important\` reverses layer order** — an important rule in an *earlier* layer beats an important one in a later layer. That gives a protected "override layer" for critical rules.

### Why it matters

- **Taming third-party CSS**: wrap a library in \`@layer framework\` and put your styles in a later layer; yours win **without a specificity war and without \`!important\`**.
- **Predictability**: explicit ordering instead of selector escalation (\`.a .b .c\` vs \`#id\`).
- **Unlayered styles** have the **highest** priority among author styles (they come after all named layers) — remember this during migration.

Baseline 2022. Pairs with \`@import url(...) layer(name)\` to pull vendor CSS straight into a layer.`
    },
    codeSnippet: `/* Establish the order once, up top */
@layer reset, vendor, components, app, utilities;

/* Pull a third-party stylesheet into a low-priority layer */
@import url("bootstrap.css") layer(vendor);

@layer app {
  .btn { padding: 0.5rem 1rem; }     /* beats vendor without !important */
}

@layer utilities {
  .p-0 { padding: 0; }               /* late layer wins even at .class specificity */
}

/* Unlayered rules outrank ALL the above named layers */
.debug { outline: 1px solid red; }`
  },
  {
    id: 'web-042',
    category: 'web-performance',
    level: 'Medium',
    tags: ['logical-properties', 'i18n', 'modern-css'],
    question: {
      ru: 'Что такое CSS logical properties и почему они важны для интернационализации и поддерживаемости?',
      en: 'What are CSS logical properties and why do they matter for internationalization and maintainability?'
    },
    answer: {
      ru: `## Логические свойства

Физические свойства (\`left\`, \`right\`, \`top\`, \`bottom\`, \`width\`) привязаны к экрану. **Логические** привязаны к **потоку текста**: \`inline\` (направление письма) и \`block\` (направление строк).

| Физическое | Логическое |
|---|---|
| \`margin-left\` | \`margin-inline-start\` |
| \`padding-right\` | \`padding-inline-end\` |
| \`width\` | \`inline-size\` |
| \`height\` | \`block-size\` |
| \`top\`/\`bottom\` | \`inset-block-start\`/\`-end\` |

\`\`\`css
.card {
  padding-inline: 1rem;        /* лево+право в LTR, авто-зеркалит в RTL */
  margin-block: 0.5rem;        /* верх+низ */
  border-inline-start: 2px solid; /* «начало» строки */
}
\`\`\`

### Почему важно

- **RTL без дублирования**: при \`dir="rtl"\` (арабский, иврит) \`margin-inline-start\` автоматически становится правым отступом. Не нужны отдельные \`.rtl\`-таблицы.
- **Vertical writing modes**: в \`writing-mode: vertical-rl\` (CJK) inline-ось становится вертикальной — логические свойства «просто работают».
- **Меньше кода и багов**: один набор правил вместо физического + зеркального.

### Нюансы

- Shorthand \`inset: 0\` физический; логический аналог — \`inset-block\`/\`inset-inline\`.
- \`text-align: start/end\` вместо \`left/right\`.
- Поддержка: Baseline, безопасно в продакшене. Логические свойства — стандарт для новых проектов; физические оставляйте лишь там, где намеренно нужна экранная привязка (например, фиксированный декор).`,
      en: `## Logical properties

Physical properties (\`left\`, \`right\`, \`top\`, \`bottom\`, \`width\`) are tied to the screen. **Logical** properties are tied to the **text flow**: \`inline\` (writing direction) and \`block\` (line stacking direction).

| Physical | Logical |
|---|---|
| \`margin-left\` | \`margin-inline-start\` |
| \`padding-right\` | \`padding-inline-end\` |
| \`width\` | \`inline-size\` |
| \`height\` | \`block-size\` |
| \`top\`/\`bottom\` | \`inset-block-start\`/\`-end\` |

\`\`\`css
.card {
  padding-inline: 1rem;        /* left+right in LTR, auto-mirrors in RTL */
  margin-block: 0.5rem;        /* top+bottom */
  border-inline-start: 2px solid; /* the "start" of the line */
}
\`\`\`

### Why it matters

- **RTL with no duplication**: under \`dir="rtl"\` (Arabic, Hebrew), \`margin-inline-start\` automatically becomes a right margin. No separate \`.rtl\` stylesheet.
- **Vertical writing modes**: under \`writing-mode: vertical-rl\` (CJK), the inline axis becomes vertical — logical properties "just work".
- **Less code and fewer bugs**: one rule set instead of physical + mirrored.

### Nuances

- The \`inset: 0\` shorthand is physical; logical equivalents are \`inset-block\`/\`inset-inline\`.
- Use \`text-align: start/end\` instead of \`left/right\`.
- Support: Baseline, safe in production. Logical properties are the default for new work; keep physical ones only where you intentionally need screen anchoring (e.g., a fixed decoration).`
    },
    codeSnippet: `/* Same component, correct in LTR and RTL with no overrides */
.alert {
  padding-block: 0.75rem;
  padding-inline: 1rem;
  border-inline-start: 4px solid currentColor; /* accent on the reading-start edge */
  text-align: start;
}

.alert__close {
  position: absolute;
  inset-block-start: 0.5rem;
  inset-inline-end: 0.5rem; /* top-right in LTR, top-left in RTL */
}`
  },
  {
    id: 'web-043',
    category: 'web-performance',
    level: 'Hard',
    tags: ['subgrid', 'css-grid', 'layout'],
    question: {
      ru: 'Что такое `subgrid` в CSS Grid? Какую проблему он решает и чем отличается от обычного вложенного грида?',
      en: 'What is CSS Grid `subgrid`? What problem does it solve and how does it differ from a regular nested grid?'
    },
    answer: {
      ru: `## Subgrid

Обычный вложенный grid создаёт **собственные** треки, не зная о треках родителя. Из-за этого нельзя выровнять содержимое разных карточек по общим линиям. \`subgrid\` позволяет ребёнку **унаследовать треки родителя** по одной или обеим осям.

\`\`\`css
.cards { display: grid; grid-template-columns: repeat(3, 1fr); }

.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid;   /* строки берутся у родителя */
}
\`\`\`

### Проблема, которую решает

Классический кейс — **выравнивание заголовков, текста и кнопок** в ряду карточек разной высоты. Без subgrid каждая карточка распределяет строки сама, и кнопки «пляшут». С \`grid-template-rows: subgrid\` все карточки делят общие строки родителя, и внутренние элементы выравниваются по единым линиям.

### Отличия от nested grid

- **Линии и имена** треков родителя видны ребёнку; можно ссылаться на именованные линии родителя.
- **Gaps** наследуются (можно переопределить).
- Ребёнок должен **охватить** диапазон треков (\`grid-column: span N\` / явные линии), чтобы было что наследовать.

### Нюансы

- subgrid задаётся **по осям независимо**: можно \`subgrid\` для строк и обычные треки для колонок.
- Глубокая вложенность subgrid возможна, но усложняет отладку — используйте DevTools Grid overlay.
- Поддержка: Baseline 2023 (Chrome подключился позже Firefox/Safari). Это устраняет один из последних «костылей» grid-вёрстки.`,
      en: `## Subgrid

A normal nested grid creates its **own** tracks, unaware of the parent's. So you cannot align the contents of separate cards to shared lines. \`subgrid\` lets a child **inherit the parent's tracks** along one or both axes.

\`\`\`css
.cards { display: grid; grid-template-columns: repeat(3, 1fr); }

.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid;   /* rows come from the parent */
}
\`\`\`

### The problem it solves

The classic case is **aligning titles, body, and buttons** across a row of unequal-height cards. Without subgrid, each card distributes its rows independently and the buttons "dance". With \`grid-template-rows: subgrid\`, all cards share the parent's rows and their inner items align to common lines.

### Differences from a nested grid

- The parent's track **lines and names** are visible to the child; you can reference the parent's named lines.
- **Gaps** are inherited (overridable).
- The child must **span** a track range (\`grid-column: span N\` / explicit lines) so there is something to inherit.

### Nuances

- subgrid is set **per axis independently**: you can subgrid rows and use normal tracks for columns.
- Deep subgrid nesting is possible but harder to debug — use the DevTools Grid overlay.
- Support: Baseline 2023 (Chrome shipped it after Firefox/Safari). It removes one of the last layout hacks in grid work.`
    },
    codeSnippet: `.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
}

/* Each card spans 3 parent rows and reuses them via subgrid,
   so titles/body/footer line up across the whole row. */
.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid;
  gap: 0.5rem;
}
.card__title  { grid-row: 1; }
.card__body   { grid-row: 2; }
.card__footer { grid-row: 3; align-self: end; }`
  },
  {
    id: 'web-044',
    category: 'web-performance',
    level: 'Medium',
    tags: ['clamp', 'fluid-typography', 'math-functions'],
    question: {
      ru: 'Как работают CSS-функции `clamp()`, `min()` и `max()`? Покажите fluid typography и адаптивные размеры без media queries.',
      en: 'How do the CSS functions `clamp()`, `min()` and `max()` work? Show fluid typography and adaptive sizing without media queries.'
    },
    answer: {
      ru: `## \`min()\`, \`max()\`, \`clamp()\`

Это математические функции, вычисляемые **во время layout** и принимающие смешанные единицы (\`px\`, \`%\`, \`rem\`, \`vw\`).

- \`min(a, b)\` — берёт **меньшее**: верхняя граница. \`width: min(100%, 60ch)\` — не шире 60ch и не шире контейнера.
- \`max(a, b)\` — берёт **большее**: нижняя граница. \`max(1rem, 2vw)\` — не меньше 1rem.
- \`clamp(MIN, PREF, MAX)\` = \`max(MIN, min(PREF, MAX))\` — зажимает «предпочтительное» значение между границами.

### Fluid typography без media queries

\`\`\`css
h1 { font-size: clamp(1.75rem, 1rem + 3vw, 3rem); }
\`\`\`

Шрифт плавно растёт с шириной экрана, но никогда не меньше 1.75rem и не больше 3rem. Линейная часть (\`1rem + 3vw\`) даёт наклон кривой.

### Важные нюансы

- **A11y**: чистый \`vw\` ломает zoom — пользователь не может увеличить текст. Поэтому в \`clamp\` всегда добавляйте \`rem\`-компоненту (\`1rem + 3vw\`), чтобы текст реагировал на масштаб браузера. Это требование WCAG 1.4.4 (Resize Text).
- **Спейсинги и сетки**: \`padding: clamp(1rem, 5vw, 4rem)\`, \`grid-template-columns: minmax(min(100%, 20rem), 1fr)\` против переполнения.
- **Внутри \`calc\`** можно вкладывать функции. Деление/умножение допустимы.

Это убирает «скачки» на брейкпоинтах: вместо ступенчатой адаптации — непрерывная. Baseline, безопасно везде.`,
      en: `## \`min()\`, \`max()\`, \`clamp()\`

These are math functions evaluated **at layout time** that accept mixed units (\`px\`, \`%\`, \`rem\`, \`vw\`).

- \`min(a, b)\` — picks the **smaller**: an upper bound. \`width: min(100%, 60ch)\` — never wider than 60ch nor wider than the container.
- \`max(a, b)\` — picks the **larger**: a lower bound. \`max(1rem, 2vw)\` — never below 1rem.
- \`clamp(MIN, PREF, MAX)\` = \`max(MIN, min(PREF, MAX))\` — clamps the preferred value between bounds.

### Fluid typography without media queries

\`\`\`css
h1 { font-size: clamp(1.75rem, 1rem + 3vw, 3rem); }
\`\`\`

The font scales smoothly with viewport width but never below 1.75rem nor above 3rem. The linear term (\`1rem + 3vw\`) sets the slope.

### Important nuances

- **A11y**: a pure \`vw\` font size breaks zoom — the user cannot enlarge text. So always include a \`rem\` term in \`clamp\` (\`1rem + 3vw\`) so text still responds to browser zoom. This is WCAG 1.4.4 (Resize Text).
- **Spacing and grids**: \`padding: clamp(1rem, 5vw, 4rem)\`, \`grid-template-columns: minmax(min(100%, 20rem), 1fr)\` to prevent overflow.
- **Inside \`calc\`** you can nest these functions. Division/multiplication are allowed.

This removes the "jumps" at breakpoints: continuous adaptation instead of stepwise. Baseline, safe everywhere.`
    },
    codeSnippet: `:root {
  /* Fluid scale: floor + slope*viewport, capped */
  --step-0: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);
  --step-2: clamp(1.5rem, 1rem + 2.5vw, 2.5rem);
  --gutter: clamp(1rem, 5vw, 3rem);
}

body { font-size: var(--step-0); }
h1   { font-size: var(--step-2); }

.container {
  /* Never exceed the viewport, cap reading width at 70ch */
  inline-size: min(100% - 2 * var(--gutter), 70ch);
  margin-inline: auto;
}`
  },
  {
    id: 'web-045',
    category: 'web-performance',
    level: 'Expert',
    tags: ['custom-properties', 'at-property', 'color-mix'],
    question: {
      ru: 'Как работает скоупинг CSS custom properties, что даёт `@property` и зачем нужен `color-mix()`?',
      en: 'How does CSS custom property scoping work, what does `@property` add, and why is `color-mix()` useful?'
    },
    answer: {
      ru: `## Скоупинг custom properties

CSS-переменные **наследуются** и **каскадируются**. Объявленные на \`:root\` доступны всюду; объявленные на узле — переопределяют значение для поддерева. Это локальный скоуп через дерево, а не лексический.

\`\`\`css
.theme-dark { --bg: #111; }   /* переопределяет только в поддереве */
.card { background: var(--bg, white); } /* fallback white */
\`\`\`

### \`@property\` — типизированные переменные

Обычная \`--x\` для браузера всегда «строка»: её **нельзя анимировать** плавно и нельзя гарантировать тип. \`@property\` регистрирует переменную с типом, начальным значением и наследованием:

\`\`\`css
@property --angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}
.spinner { background: conic-gradient(from var(--angle), ...); transition: --angle 1s; }
\`\`\`

Теперь \`--angle\` **интерполируется** (анимация градиента!), валидируется (невалидное значение откатывается к initial), и не «протекает» при \`inherits: false\`. Это открывает анимации, недоступные иначе.

### \`color-mix()\`

Смешивает два цвета в указанном color-space:

\`\`\`css
--accent: #3b82f6;
color: color-mix(in oklch, var(--accent) 80%, white); /* осветление */
border-color: color-mix(in srgb, var(--accent), transparent 60%);
\`\`\`

Заменяет препроцессорные \`lighten/darken\` **в рантайме** и с учётом перцептивных пространств (\`oklch\`, \`lab\`) для равномерных оттенков. Идеально для генерации hover/disabled-состояний из одной переменной-акцента. Baseline 2023 (\`@property\`/\`color-mix\`). Комбинация даёт мощные, анимируемые, тематизируемые токены без JS.`,
      en: `## Custom property scoping

CSS variables **inherit** and **cascade**. Declared on \`:root\` they are available everywhere; declared on a node they override the value for that subtree. That is tree-scoped, not lexically scoped.

\`\`\`css
.theme-dark { --bg: #111; }   /* overrides only within the subtree */
.card { background: var(--bg, white); } /* fallback white */
\`\`\`

### \`@property\` — typed variables

A plain \`--x\` is always a "string" to the browser: it **cannot be smoothly animated** and has no guaranteed type. \`@property\` registers a variable with a type, initial value, and inheritance flag:

\`\`\`css
@property --angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}
.spinner { background: conic-gradient(from var(--angle), ...); transition: --angle 1s; }
\`\`\`

Now \`--angle\` **interpolates** (animatable gradients!), is validated (an invalid value falls back to initial), and does not "leak" when \`inherits: false\`. This unlocks animations otherwise impossible.

### \`color-mix()\`

Mixes two colors in a chosen color space:

\`\`\`css
--accent: #3b82f6;
color: color-mix(in oklch, var(--accent) 80%, white); /* lighten */
border-color: color-mix(in srgb, var(--accent), transparent 60%);
\`\`\`

It replaces preprocessor \`lighten/darken\` **at runtime** and supports perceptual spaces (\`oklch\`, \`lab\`) for even shades. Perfect for deriving hover/disabled states from a single accent variable. Baseline 2023 (\`@property\`/\`color-mix\`). Together they give powerful, animatable, themeable tokens with no JS.`
    },
    codeSnippet: `/* Typed, animatable custom property */
@property --p {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 0%;
}

.progress {
  background: linear-gradient(90deg, var(--accent) var(--p), #eee var(--p));
  transition: --p 600ms ease;   /* impossible without @property */
}
.progress.done { --p: 100%; }

/* Derive states from a single accent token */
.btn        { background: var(--accent); }
.btn:hover  { background: color-mix(in oklch, var(--accent) 85%, black); }
.btn:disabled { background: color-mix(in srgb, var(--accent), white 50%); }`
  },
  {
    id: 'web-046',
    category: 'web-performance',
    level: 'Hard',
    tags: ['css-grid', 'auto-fit', 'minmax'],
    question: {
      ru: 'В чём разница между `auto-fit` и `auto-fill` в `repeat()`? Как `minmax()` и template-areas строят адаптивные сетки?',
      en: 'What is the difference between `auto-fit` and `auto-fill` in `repeat()`? How do `minmax()` and template-areas build responsive grids?'
    },
    answer: {
      ru: `## \`auto-fit\` vs \`auto-fill\`

Оба используются как \`repeat(auto-fit | auto-fill, minmax(MIN, 1fr))\` и создают столько колонок, сколько влезает. Разница — в поведении **пустых треков**:

- **\`auto-fill\`**: создаёт максимум треков, **сохраняя пустые** колонки, даже если элементов мало. Элементы не растягиваются на пустоту.
- **\`auto-fit\`**: создаёт треки, затем **схлопывает пустые** до 0 и распределяет освободившееся место между реальными элементами (через \`1fr\`).

\`\`\`css
.grid { display: grid; gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
}
\`\`\`

При двух элементах: \`auto-fit\` растянет их на всю ширину; \`auto-fill\` оставит «дырки» справа. Для карточных галерей обычно нужен **\`auto-fit\`**.

### \`minmax()\`

\`minmax(15rem, 1fr)\` — трек **не уже** 15rem (минимум) и растягивается до равной доли (\`1fr\`). Это даёт «RAM-паттерн» (Repeat, Auto, Minmax) — адаптивная сетка без единого media query. Защита от переполнения: \`minmax(min(100%, 15rem), 1fr)\` — на узких экранах трек не выйдет за контейнер.

### Template-areas

\`\`\`css
.page {
  display: grid;
  grid-template-columns: 12rem 1fr;
  grid-template-areas: 'nav header' 'nav main';
}
.header { grid-area: header; }
\`\`\`

Семантичная, читаемая раскладка; в media query достаточно переопределить \`grid-template-areas\`, чтобы полностью перестроить макет — например, выстроить области в один столбец на мобильном. Baseline, поддержка повсеместная.`,
      en: `## \`auto-fit\` vs \`auto-fill\`

Both are used as \`repeat(auto-fit | auto-fill, minmax(MIN, 1fr))\` and create as many columns as fit. The difference is in **empty track** behavior:

- **\`auto-fill\`**: creates the maximum number of tracks, **keeping empty** columns even when items are few. Items do not stretch into the empty space.
- **\`auto-fit\`**: creates the tracks, then **collapses empty** ones to 0 and distributes the freed space among real items (via \`1fr\`).

\`\`\`css
.grid { display: grid; gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
}
\`\`\`

With two items: \`auto-fit\` stretches them to full width; \`auto-fill\` leaves gaps on the right. Card galleries usually want **\`auto-fit\`**.

### \`minmax()\`

\`minmax(15rem, 1fr)\` means a track is **no narrower** than 15rem (the min) and grows to an equal share (\`1fr\`). This is the "RAM pattern" (Repeat, Auto, Minmax) — a responsive grid with no media query. Overflow guard: \`minmax(min(100%, 15rem), 1fr)\` keeps the track inside the container on narrow screens.

### Template-areas

\`\`\`css
.page {
  display: grid;
  grid-template-columns: 12rem 1fr;
  grid-template-areas: 'nav header' 'nav main';
}
.header { grid-area: header; }
\`\`\`

Semantic, readable layout; in a media query you only redefine \`grid-template-areas\` to fully restructure — e.g., stack the areas into one column on mobile. Baseline, universally supported.`
    },
    codeSnippet: `/* RAM pattern: responsive gallery, no media queries.
   auto-fit collapses empty tracks so 1-2 items fill the row. */
.gallery {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
}

/* Template-areas: restructure the whole page in one rule */
.app {
  display: grid;
  grid-template: 'nav header' auto 'nav main' 1fr / 12rem 1fr;
}
@media (max-width: 40rem) {
  .app { grid-template: 'header' 'nav' 'main' / 1fr; }
}`
  },
  {
    id: 'web-047',
    category: 'web-performance',
    level: 'Expert',
    tags: ['specificity', 'important', 'all-unset'],
    question: {
      ru: 'Разберите краевые случаи специфичности: `!important`, `all: unset`, наследование vs специфичность, инлайн-стили и `:where()`.',
      en: 'Walk through specificity edge cases: `!important`, `all: unset`, inheritance vs specificity, inline styles and `:where()`.'
    },
    answer: {
      ru: `## Краевые случаи специфичности

Специфичность — кортеж (a,b,c): id, классы/атрибуты/псевдоклассы, элементы/псевдоэлементы. Но есть нюансы, на которых ловят на собеседовании.

### \`!important\` и каскад
\`!important\` поднимает объявление в **отдельный слой важности** выше обычных правил. Конфликт двух important решается обычной специфичностью между ними. Порядок origin при important **инвертируется** (user important > author important). Инлайн-стиль (\`style=""\`) бьёт любой селектор, но **не** бьёт \`!important\` из стайлшита.

### \`:where()\` vs \`:is()\`
\`:where(...)\` имеет специфичность **ровно 0** — мощный инструмент для «обнуляемых» базовых стилей, которые легко переопределить. \`:is(...)\` берёт специфичность **самого тяжёлого** аргумента.

\`\`\`css
:where(.a, #id) p { color: gray; } /* специфичность 0,0,1 (только p) */
:is(.a, #id) p { color: gray; }     /* специфичность 1,0,1 (берёт #id) */
\`\`\`

### Наследование vs специфичность
Наследуемое значение (например, \`color\` с предка) **проигрывает любому** прямому объявлению на элементе, даже с нулевой специфичностью (\`* { color: red }\` перебьёт унаследованный). Наследование — это «последний резерв», вне конкурса специфичности.

### \`all: unset\` / \`revert\`
\`all: unset\` сбрасывает **все** свойства: наследуемые → \`inherit\`, ненаследуемые → \`initial\`. \`all: revert\` откатывает к стилям user-agent (полезно для «де-стилизации» внутри виджета). \`all: revert-layer\` откатывает к предыдущему cascade layer. Это эффективный способ изолировать компонент от внешнего CSS без \`!important\`-войн.`,
      en: `## Specificity edge cases

Specificity is a tuple (a,b,c): ids, classes/attrs/pseudo-classes, elements/pseudo-elements. But there are subtleties interviewers probe.

### \`!important\` and the cascade
\`!important\` lifts a declaration into a **separate importance band** above normal rules. A clash between two important declarations is resolved by normal specificity between them. The origin order under important is **reversed** (user important > author important). An inline style (\`style=""\`) beats any selector, but does **not** beat \`!important\` from a stylesheet.

### \`:where()\` vs \`:is()\`
\`:where(...)\` has specificity **exactly 0** — a powerful tool for "resettable" base styles that are easy to override. \`:is(...)\` takes the specificity of its **heaviest** argument.

\`\`\`css
:where(.a, #id) p { color: gray; } /* specificity 0,0,1 (only p) */
:is(.a, #id) p { color: gray; }     /* specificity 1,0,1 (takes #id) */
\`\`\`

### Inheritance vs specificity
An inherited value (e.g., \`color\` from an ancestor) **loses to any** direct declaration on the element, even a zero-specificity one (\`* { color: red }\` beats the inherited value). Inheritance is a "last resort", outside the specificity contest.

### \`all: unset\` / \`revert\`
\`all: unset\` resets **every** property: inherited ones to \`inherit\`, non-inherited ones to \`initial\`. \`all: revert\` rolls back to user-agent styles (useful to "de-style" inside a widget). \`all: revert-layer\` rolls back to the previous cascade layer. This is an effective way to isolate a component from outside CSS without \`!important\` wars.`
    },
    codeSnippet: `/* Zero-specificity base styles: trivially overridable downstream */
:where(button, .btn) {
  font: inherit;
  cursor: pointer;
}

/* A later, plain .class selector wins because :where() contributes 0 */
.btn-primary { background: rebeccapurple; }

/* Reset a third-party widget back to UA defaults, scoped */
.unstyled-host * { all: revert; }

/* Inherited color loses to a direct universal rule */
:root { color: navy; }
* { color: black; }   /* every element is black, navy never inherited */`
  },
  {
    id: 'web-048',
    category: 'web-performance',
    level: 'Hard',
    tags: ['position-sticky', 'stacking-context', 'layout'],
    question: {
      ru: 'Как именно работает `position: sticky`? Почему он иногда «не липнет» и как связан со стекинг-контекстом и скролл-контейнером?',
      en: 'How exactly does `position: sticky` work? Why does it sometimes "not stick", and how does it relate to stacking context and the scroll container?'
    },
    answer: {
      ru: `## Механика \`position: sticky\`

Sticky-элемент ведёт себя как \`relative\`, пока его **порог** (\`top\`/\`bottom\`/\`left\`/\`right\`) не достигнут при скролле; затем «прилипает» к этой границе, оставаясь в потоке, **но не покидая своего контейнера-предка**. Когда нижний край контейнера уходит вверх, элемент уезжает вместе с ним.

### Почему «не липнет» — частые причины

1. **Не задан порог**: без \`top\` (или другой стороны) sticky не активируется. Это самая частая ошибка.
2. **Overflow у предка**: любой предок с \`overflow: hidden/auto/scroll\` становится **скролл-контейнером** sticky-элемента. Если этот контейнер не скроллится, прилипание визуально пропадает. \`overflow: clip\` имеет особое поведение.
3. **Высота контейнера**: sticky работает только в пределах высоты родителя. Если родитель ровно по высоте элемента — «липнуть» некуда.
4. **\`display\` родителя**: в \`flex\`/\`grid\` контейнере поведение зависит от align — растянутый ребёнок может не оставлять места.

### Стекинг и z-index

Sticky-элемент создаёт собственный позиционный контекст; при наложении на соседний контент дайте ему \`z-index\`, иначе следующий контент может перекрыть «прилипшую» шапку. Если предок создаёт **stacking context** (через \`transform\`, \`filter\`, \`will-change\`, \`opacity < 1\`), z-index sticky ограничен этим контекстом.

### Производительность

Sticky обрабатывается на **compositor thread** в современных браузерах — скролл остаётся плавным без layout на каждый кадр. Не злоупотребляйте множеством sticky-элементов с тяжёлым paint. Проверяйте в DevTools (Layers / Rendering → Scrolling performance).`,
      en: `## How \`position: sticky\` works

A sticky element behaves like \`relative\` until its **threshold** (\`top\`/\`bottom\`/\`left\`/\`right\`) is reached during scroll; then it "sticks" to that edge, staying in flow, **but never leaving its containing ancestor**. When the container's bottom edge scrolls up, the element rides away with it.

### Why it "won't stick" — common causes

1. **No threshold set**: without \`top\` (or another side) sticky never activates. This is the most common mistake.
2. **Ancestor overflow**: any ancestor with \`overflow: hidden/auto/scroll\` becomes the sticky element's **scroll container**. If that container does not scroll, the sticking visually disappears. \`overflow: clip\` has special behavior.
3. **Container height**: sticky only works within the parent's height. If the parent is exactly as tall as the element, there is nowhere to stick.
4. **Parent \`display\`**: in a \`flex\`/\`grid\` container the behavior depends on alignment — a stretched child may leave no room.

### Stacking and z-index

A sticky element creates a positioned context; when it overlaps neighboring content, give it a \`z-index\` or following content may cover the "stuck" header. If an ancestor creates a **stacking context** (via \`transform\`, \`filter\`, \`will-change\`, \`opacity < 1\`), the sticky's z-index is confined to that context.

### Performance

Sticky is handled on the **compositor thread** in modern browsers — scrolling stays smooth without per-frame layout. Avoid many sticky elements with heavy paint. Check in DevTools (Layers / Rendering → Scrolling performance).`
    },
    codeSnippet: `/* Sticky table header that actually sticks */
.table-wrap {
  /* NOTE: overflow here makes THIS the scroll container.
     Sticky thresholds are measured against it. */
  max-block-size: 24rem;
  overflow: auto;
}

thead th {
  position: sticky;
  top: 0;            /* required threshold — without it, no sticking */
  z-index: 1;        /* keep header above scrolling rows */
  background: white; /* opaque so rows don't show through */
}

/* Pitfall: an ancestor transform creates a stacking context
   that traps the sticky z-index. */
.parent { /* transform: translateZ(0);  <- would confine z-index */ }`
  },
  {
    id: 'web-049',
    category: 'web-performance',
    level: 'Hard',
    tags: ['variable-fonts', 'font-subsetting', 'cls'],
    question: {
      ru: 'Как оптимизировать веб-шрифты: вариативные шрифты, сабсеттинг, `font-display`, `size-adjust` и предотвращение CLS?',
      en: 'How do you optimize web fonts: variable fonts, subsetting, `font-display`, `size-adjust`, and preventing CLS?'
    },
    answer: {
      ru: `## Оптимизация веб-шрифтов

Шрифты — частый источник медленного FCP и скачков (CLS). Стратегия — меньше байт, ранняя загрузка, отсутствие сдвигов.

### Уменьшение веса
- **Сабсеттинг**: вырезать неиспользуемые глифы (например, оставить latin). \`unicode-range\` в \`@font-face\` заставляет браузер качать сабсет **только при наличии нужных символов**.
- **Вариативные шрифты**: один файл вместо 4-8 начертаний; ось \`wght\`/\`slnt\` управляется через \`font-variation-settings\` или \`font-weight\`. Экономит запросы и байты, если используете >2 начертаний.
- **WOFF2**: brotli-сжатый формат, ~30% меньше WOFF. Всегда первый в \`src\`.

### Ранняя загрузка
\`\`\`html
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
\`\`\`
\`crossorigin\` обязателен (шрифты грузятся в anonymous-режиме). \`preconnect\` к хосту шрифтов сокращает RTT.

### \`font-display\` и борьба с CLS
- \`font-display: swap\` — мгновенный текст системным шрифтом, затем подмена. Минус — **FOUT** и сдвиг, если метрики не совпадают.
- \`font-display: optional\` — без сдвигов на медленных сетях (браузер может вовсе не применить шрифт). Лучший выбор по CLS.
- **\`size-adjust\`, \`ascent-override\`, \`descent-override\`** в \`@font-face\` для **fallback-шрифта** выравнивают метрики системного и кастомного шрифта, делая swap **бесшовным** (нулевой layout shift). Это современный рецепт: объявите fallback \`@font-face\` с подогнанными метриками.

Измеряйте CLS в Lighthouse/PerformanceObserver; цель — < 0.1.`,
      en: `## Web font optimization

Fonts are a common cause of slow FCP and layout shifts (CLS). The strategy: fewer bytes, early loading, no shifts.

### Reducing weight
- **Subsetting**: strip unused glyphs (e.g., keep latin only). \`unicode-range\` in \`@font-face\` makes the browser download a subset **only when matching characters appear**.
- **Variable fonts**: one file instead of 4-8 weights; the \`wght\`/\`slnt\` axis is driven via \`font-variation-settings\` or \`font-weight\`. Saves requests and bytes if you use >2 weights.
- **WOFF2**: a brotli-compressed format, ~30% smaller than WOFF. Always list it first in \`src\`.

### Early loading
\`\`\`html
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
\`\`\`
\`crossorigin\` is mandatory (fonts fetch in anonymous mode). \`preconnect\` to the font host cuts RTT.

### \`font-display\` and fighting CLS
- \`font-display: swap\` — instant text in a system font, then swap. Downside — **FOUT** and a shift if metrics differ.
- \`font-display: optional\` — no shifts on slow networks (the browser may skip the font entirely). Best for CLS.
- **\`size-adjust\`, \`ascent-override\`, \`descent-override\`** in a fallback \`@font-face\` align the system and custom font metrics, making the swap **seamless** (zero layout shift). This is the modern recipe: declare a fallback \`@font-face\` with tuned metrics.

Measure CLS in Lighthouse/PerformanceObserver; target < 0.1.`
    },
    codeSnippet: `/* Variable font + subset by unicode-range */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2-variations');
  font-weight: 100 900;           /* one file covers the whole range */
  font-display: optional;          /* best for CLS */
  unicode-range: U+0000-00FF;      /* latin subset only */
}

/* Metric-matched fallback => seamless swap, no layout shift */
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  ascent-override: 90%;
  descent-override: 22%;
  size-adjust: 107%;
}

body { font-family: 'Inter', 'Inter Fallback', sans-serif; }`
  },
  {
    id: 'web-050',
    category: 'web-performance',
    level: 'Expert',
    tags: ['http3', 'multiplexing', 'compression'],
    question: {
      ru: 'Сравните HTTP/2 и HTTP/3: мультиплексирование, head-of-line blocking, приоритезация. Чем gzip отличается от brotli?',
      en: 'Compare HTTP/2 and HTTP/3: multiplexing, head-of-line blocking, prioritization. How does gzip differ from brotli?'
    },
    answer: {
      ru: `## HTTP/2 vs HTTP/3

### HTTP/2
- **Мультиплексирование**: множество запросов в одном TCP-соединении через независимые **streams** (бинарный фрейминг). Убирает домен-шардинг и спрайты HTTP/1.1.
- **HPACK**: сжатие заголовков.
- **Server Push** (фактически устарел/удалён — плохо взаимодействовал с кэшем).
- **Проблема**: HTTP/2-streams логически независимы, но идут поверх **одного TCP**. Потеря одного пакета останавливает **все** streams — это **TCP head-of-line blocking** на транспортном уровне.

### HTTP/3
- Работает поверх **QUIC** (на UDP), а не TCP. Каждый stream имеет **собственный контроль потерь**: потеря пакета в одном stream **не блокирует** остальные — HOL blocking устранён на транспорте.
- **0-RTT / 1-RTT** установка: TLS 1.3 встроен в QUIC, рукопожатие быстрее, особенно при возобновлении.
- **Connection migration**: соединение переживает смену сети (Wi-Fi → LTE) по Connection ID, без нового хендшейка.

### Приоритезация
HTTP/2 имел сложное дерево зависимостей (часто реализовано плохо). HTTP/3 использует более простую схему **Extensible Priorities** (\`urgency\` + \`incremental\`) через заголовок/фрейм — браузер сигналит важность LCP-ресурсов.

## gzip vs brotli
- **gzip** (DEFLATE): универсален, быстрый, но хуже сжимает.
- **brotli** (\`Content-Encoding: br\`): статический словарь, заточенный под веб-текст; на высоких уровнях даёт **15-25% меньше** размера для HTML/CSS/JS. Для статики используйте **максимальный уровень (11) при сборке** (стоимость один раз), для динамики — уровень 4-5 (баланс CPU/латентность). Всегда отдавайте brotli с фолбэком на gzip по \`Accept-Encoding\`.`,
      en: `## HTTP/2 vs HTTP/3

### HTTP/2
- **Multiplexing**: many requests over one TCP connection via independent **streams** (binary framing). Removes domain sharding and sprites of HTTP/1.1.
- **HPACK**: header compression.
- **Server Push** (effectively deprecated/removed — interacted poorly with caching).
- **Problem**: HTTP/2 streams are logically independent but ride over **a single TCP** connection. One lost packet stalls **all** streams — **TCP head-of-line blocking** at the transport layer.

### HTTP/3
- Runs over **QUIC** (on UDP), not TCP. Each stream has its **own loss recovery**: a lost packet in one stream **does not block** others — transport HOL blocking is eliminated.
- **0-RTT / 1-RTT** setup: TLS 1.3 is built into QUIC, so the handshake is faster, especially on resumption.
- **Connection migration**: the connection survives a network change (Wi-Fi → LTE) via the Connection ID, with no new handshake.

### Prioritization
HTTP/2 had a complex dependency tree (often poorly implemented). HTTP/3 uses the simpler **Extensible Priorities** scheme (\`urgency\` + \`incremental\`) via a header/frame — the browser signals the importance of LCP resources.

## gzip vs brotli
- **gzip** (DEFLATE): universal, fast, but compresses worse.
- **brotli** (\`Content-Encoding: br\`): a static dictionary tuned for web text; at high levels it yields **15-25% smaller** HTML/CSS/JS than gzip. For static assets use the **maximum level (11) at build time** (paid once); for dynamic responses use level 4-5 (CPU/latency balance). Always serve brotli with a gzip fallback based on \`Accept-Encoding\`.`
    },
    codeSnippet: `# Nginx: serve precompressed brotli/gzip, negotiate via Accept-Encoding
brotli_static on;          # serve file.br built at deploy time (level 11)
gzip_static  on;           # gzip fallback

# Mark immutable, content-hashed assets so HTTP/3 + cache skip revalidation
location ~* \\.[0-9a-f]{8}\\.(js|css|woff2)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# Check the negotiated protocol/encoding from the client:
# curl -I --http3 https://example.com/app.js
#   HTTP/3 200
#   content-encoding: br`
  },
  {
    id: 'web-051',
    category: 'web-performance',
    level: 'Hard',
    tags: ['inp', 'scheduler', 'long-tasks'],
    question: {
      ru: 'Глубже про INP: что такое long tasks и TBT, как уступать main thread через `scheduler.postTask`, `isInputPending` и yielding?',
      en: 'INP deep dive: what are long tasks and TBT, and how do you yield the main thread via `scheduler.postTask`, `isInputPending`, and yielding?'
    },
    answer: {
      ru: `## INP и main thread

**INP (Interaction to Next Paint)** измеряет задержку от взаимодействия до **следующего отрисованного кадра** по всем интеракциям страницы (берётся ~худшая). Цель — **< 200 мс**. INP складывается из: input delay (ожидание свободного потока) + processing time (ваши обработчики) + presentation delay (layout/paint).

### Long tasks и TBT
**Long task** — любая работа в main thread дольше **50 мс**. Пока она идёт, поток не может обработать клик — растёт input delay. **TBT (Total Blocking Time)** суммирует «блокирующую» часть (всё сверх 50 мс) длинных задач между FCP и TTI; это лабораторный прокси для INP.

### Yielding — разбиение работы
Главный приём: **разбивать длинные задачи** и уступать поток, чтобы браузер успел обработать ввод и отрисовать кадр.

\`\`\`ts
async function yieldToMain() {
  // Современно: даёт планировщику вставить пользовательский ввод
  if ('scheduler' in window && 'yield' in (window as any).scheduler) {
    return (window as any).scheduler.yield();
  }
  return new Promise(r => setTimeout(r, 0));
}
\`\`\`

### \`isInputPending\`
\`navigator.scheduling.isInputPending()\` позволяет уступать **только когда есть ожидающий ввод** — обрабатываете чанк за чанком, но прерываетесь лишь при необходимости, минимизируя оверхед от частых yield.

### \`scheduler.postTask\`
Планирует задачи с **приоритетами** (\`user-blocking\` / \`user-visible\` / \`background\`) и поддерживает отмену через \`TaskController\`. Это замена ad-hoc \`setTimeout\`-очередям: критичное реагирует быстрее, фоновое не крадёт поток.

**Практика**: дробите гидрацию/парсинг/рендер списков, выносите чистые вычисления в Web Worker, дебаунсите тяжёлые обработчики, и измеряйте реальный INP через web-vitals в проде (RUM).`,
      en: `## INP and the main thread

**INP (Interaction to Next Paint)** measures the delay from an interaction to the **next painted frame** across all page interactions (roughly the worst is reported). Target **< 200 ms**. INP is: input delay (waiting for a free thread) + processing time (your handlers) + presentation delay (layout/paint).

### Long tasks and TBT
A **long task** is any main-thread work over **50 ms**. While it runs, the thread cannot process a click — input delay grows. **TBT (Total Blocking Time)** sums the "blocking" part (everything over 50 ms) of long tasks between FCP and TTI; it is a lab proxy for INP.

### Yielding — splitting work
The core technique: **break up long tasks** and yield the thread so the browser can process input and paint a frame.

\`\`\`ts
async function yieldToMain() {
  // Modern: lets the scheduler interleave user input
  if ('scheduler' in window && 'yield' in (window as any).scheduler) {
    return (window as any).scheduler.yield();
  }
  return new Promise(r => setTimeout(r, 0));
}
\`\`\`

### \`isInputPending\`
\`navigator.scheduling.isInputPending()\` lets you yield **only when input is pending** — you process chunk by chunk but interrupt only when needed, minimizing the overhead of frequent yields.

### \`scheduler.postTask\`
Schedules tasks with **priorities** (\`user-blocking\` / \`user-visible\` / \`background\`) and supports cancellation via \`TaskController\`. It replaces ad-hoc \`setTimeout\` queues: critical work reacts faster, background work does not steal the thread.

**Practice**: chunk hydration/parsing/list rendering, move pure computation to a Web Worker, debounce heavy handlers, and measure real INP via web-vitals in production (RUM).`
    },
    codeSnippet: `// Process a big array without blocking input; yield only when needed.
async function processChunked<T>(items: T[], work: (x: T) => void) {
  for (let i = 0; i < items.length; i++) {
    work(items[i]);
    // Yield only if there is pending user input -> low overhead
    if (navigator.scheduling?.isInputPending?.()) {
      await (window as any).scheduler?.yield?.()
        ?? new Promise(r => setTimeout(r));
    }
  }
}

// Prioritized scheduling with cancellation
const controller = new TaskController({ priority: 'background' });
scheduler.postTask(() => buildSearchIndex(), { signal: controller.signal });
// User navigates away -> drop the background work
controller.abort();`
  },
  {
    id: 'web-052',
    category: 'web-performance',
    level: 'Hard',
    tags: ['accessibility', 'focus-management', 'aria-live'],
    question: {
      ru: 'Разберите глубокую a11y: focus trap, roving tabindex, live regions, skip links и вычисление accessible name.',
      en: 'Cover deep a11y: focus trap, roving tabindex, live regions, skip links, and accessible name computation.'
    },
    answer: {
      ru: `## Глубокая доступность

### Focus trap (модалки)
В открытом диалоге фокус **не должен** уходить за его пределы. Реализация: при открытии запомнить активный элемент, перевести фокус внутрь, перехватывать \`Tab\`/\`Shift+Tab\` на границах (зацикливать), по \`Escape\` закрывать и **вернуть фокус** на триггер. Нативный \`<dialog showModal()>\` делает trap и inert-фон автоматически — предпочитайте его.

### Roving tabindex
Для составных виджетов (тулбар, табы, меню, грид) в Tab-порядке должен быть **только один** элемент (\`tabindex="0"\`), остальные — \`tabindex="-1"\`. Стрелками перемещаем «активный» tabindex, не плодя десятки tab-стопов. Это паттерн **APG** — соответствует ожиданиям скринридеров.

### Live regions
\`aria-live="polite"\` (ждёт паузы) и \`"assertive"\` (прерывает) озвучивают **динамические** изменения без перемещения фокуса — для тостов, статусов загрузки, результатов поиска. Регион должен существовать в DOM **заранее**, иначе первое обновление не объявится. \`role="status"\` = polite, \`role="alert"\` = assertive.

### Skip links
Первая фокусируемая ссылка «Skip to content», визуально скрытая до фокуса — позволяет клавиатурным пользователям перепрыгнуть навигацию. Требование WCAG 2.4.1.

### Accessible name computation
Имя элемента для AT вычисляется по приоритету: \`aria-labelledby\` → \`aria-label\` → нативная подпись (\`<label>\`, \`alt\`, содержимое кнопки) → \`title\`. Понимание порядка спасает от багов вроде «кнопка без имени». Проверяйте через Accessibility tree в DevTools и axe.

WCAG уровни: **A** (минимум), **AA** (целевой, юридический стандарт), **AAA** (строгий). Контраст текста по AA — **4.5:1** (крупный — 3:1).`,
      en: `## Deep accessibility

### Focus trap (modals)
While a dialog is open, focus **must not** escape it. Implementation: on open, remember the active element, move focus inside, intercept \`Tab\`/\`Shift+Tab\` at the boundaries (wrap around), and on \`Escape\` close and **restore focus** to the trigger. Native \`<dialog showModal()>\` provides the trap and an inert background automatically — prefer it.

### Roving tabindex
For composite widgets (toolbar, tabs, menu, grid), **only one** element is in the Tab order (\`tabindex="0"\`); the rest are \`tabindex="-1"\`. Arrow keys move the "active" tabindex instead of creating dozens of tab stops. This is the **APG** pattern — it matches screen-reader expectations.

### Live regions
\`aria-live="polite"\` (waits for a pause) and \`"assertive"\` (interrupts) announce **dynamic** changes without moving focus — for toasts, loading status, search results. The region must exist in the DOM **beforehand**, or the first update is not announced. \`role="status"\` = polite, \`role="alert"\` = assertive.

### Skip links
A first focusable "Skip to content" link, visually hidden until focused, lets keyboard users jump past navigation. WCAG 2.4.1.

### Accessible name computation
An element's name for assistive tech is computed by priority: \`aria-labelledby\` → \`aria-label\` → the native label (\`<label>\`, \`alt\`, button text) → \`title\`. Knowing the order prevents bugs like a "button with no name". Verify via the Accessibility tree in DevTools and axe.

WCAG levels: **A** (minimum), **AA** (target, the legal standard), **AAA** (strict). AA text contrast is **4.5:1** (large text 3:1).`
    },
    codeSnippet: `<!-- Skip link: hidden until focused -->
<a href="#main" class="skip-link">Skip to content</a>

<!-- Tabs with roving tabindex (only the active tab is tabbable) -->
<div role="tablist">
  <button role="tab" aria-selected="true"  tabindex="0">Overview</button>
  <button role="tab" aria-selected="false" tabindex="-1">Details</button>
</div>

<!-- Pre-existing live region announces async results politely -->
<div role="status" aria-live="polite" id="search-status"></div>

<!-- Native modal: focus trap + inert backdrop for free -->
<dialog id="dlg">
  <h2 id="dlg-title">Settings</h2>
  <button aria-labelledby="dlg-title">Save</button>
</dialog>
<style>.skip-link{position:absolute;left:-999px}.skip-link:focus{left:1rem}</style>`
  },
  {
    id: 'web-053',
    category: 'web-performance',
    level: 'Expert',
    tags: ['web-workers', 'offscreen-canvas', 'partial-hydration'],
    question: {
      ru: 'Как выносить тяжёлую работу с main thread (Web Workers, OffscreenCanvas) и что такое islands / partial hydration / resumability?',
      en: 'How do you offload heavy work from the main thread (Web Workers, OffscreenCanvas) and what are islands / partial hydration / resumability?'
    },
    answer: {
      ru: `## Разгрузка main thread

### Web Workers
Worker исполняет JS в **отдельном потоке**, не блокируя UI. Подходит для парсинга больших JSON, шифрования, обработки изображений, диффов. Связь — через \`postMessage\` (структурное клонирование) или **Transferable** объекты (\`ArrayBuffer\`), которые **передаются без копирования** (zero-copy) — критично для больших буферов. Библиотеки вроде Comlink скрывают месседжинг за прокси/async.

\`\`\`ts
const buf = new ArrayBuffer(1e7);
worker.postMessage(buf, [buf]); // передача владения, без копии
\`\`\`

### OffscreenCanvas
Позволяет рисовать на канвасе **из воркера**: вся отрисовка (WebGL/2D) уходит с main thread, скролл и ввод остаются плавными. Канвас переносится через \`transferControlToOffscreen()\`. Идеально для тяжёлых дашбордов/графиков/визуализаций.

## Стратегии гидрации

- **Hydration (классика SSR)**: сервер шлёт HTML, затем клиент **повторно** строит дерево и навешивает обработчики на **всё** — дорого, блокирует поток (плохой INP/TBT).
- **Partial / progressive hydration**: гидрируют только нужные части, по приоритету/видимости.
- **Islands (Astro)**: страница в основном статичный HTML, интерактивные «острова» гидрируются изолированно и лениво (\`client:visible\`, \`client:idle\`). Резко снижает объём клиентского JS.
- **Resumability (Qwik)**: вместо повторного исполнения для навешивания слушателей фреймворк **сериализует состояние и обработчики** в HTML и **возобновляет** работу по событию — гидрация почти нулевая, JS подгружается лениво при взаимодействии. Минимизирует TBT до близкого к нулю.

**Вывод**: тяжёлые вычисления → Worker/OffscreenCanvas; интерактивность → дробить и откладывать гидрацию (islands/resumability), измеряя INP/TBT в RUM.`,
      en: `## Offloading the main thread

### Web Workers
A worker runs JS on a **separate thread**, not blocking the UI. Good for parsing large JSON, crypto, image processing, diffing. Communication is via \`postMessage\` (structured clone) or **Transferable** objects (\`ArrayBuffer\`), which are **moved without copying** (zero-copy) — critical for large buffers. Libraries like Comlink hide the messaging behind a proxy/async API.

\`\`\`ts
const buf = new ArrayBuffer(1e7);
worker.postMessage(buf, [buf]); // transfers ownership, no copy
\`\`\`

### OffscreenCanvas
Lets you draw to a canvas **from a worker**: all rendering (WebGL/2D) leaves the main thread, keeping scroll and input smooth. The canvas is moved via \`transferControlToOffscreen()\`. Ideal for heavy dashboards/charts/visualizations.

## Hydration strategies

- **Hydration (classic SSR)**: the server sends HTML, then the client **re-builds** the tree and attaches handlers to **everything** — expensive, blocks the thread (bad INP/TBT).
- **Partial / progressive hydration**: hydrate only the needed parts, by priority/visibility.
- **Islands (Astro)**: the page is mostly static HTML, and interactive "islands" hydrate in isolation and lazily (\`client:visible\`, \`client:idle\`). Sharply reduces client JS.
- **Resumability (Qwik)**: instead of re-executing to attach listeners, the framework **serializes state and handlers** into the HTML and **resumes** on an event — hydration is nearly zero, JS is fetched lazily on interaction. It minimizes TBT to near zero.

**Takeaway**: heavy computation → Worker/OffscreenCanvas; interactivity → split and defer hydration (islands/resumability), measuring INP/TBT in RUM.`
    },
    codeSnippet: `// main.ts — move rendering AND a heavy buffer to a worker, zero-copy
const canvas = document.querySelector('canvas')!;
const offscreen = canvas.transferControlToOffscreen();
const worker = new Worker(new URL('./render.worker.ts', import.meta.url), {
  type: 'module',
});

const pixels = new ArrayBuffer(4 * 1920 * 1080);
worker.postMessage(
  { canvas: offscreen, pixels },
  [offscreen, pixels], // Transferables: ownership moves, no structured-clone copy
);

// render.worker.ts
self.onmessage = (e: MessageEvent) => {
  const ctx = e.data.canvas.getContext('2d');
  // ...draw frames off the main thread; UI stays responsive
};`
  }
];
