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
      ru: `## 🧩 Простыми словами

Представь, что у тебя есть карточка товара. Обычно мы решаем, как её показывать, глядя на размер **всего окна браузера** — это media queries. Но карточка может стоять и в узком сайдбаре, и в широкой основной колонке. Окно одно, а места вокруг карточки — разное. Container queries позволяют карточке смотреть не на окно, а на **размер своего собственного контейнера-родителя** и подстраиваться под него. Это как если бы мебель сама меняла форму под размер комнаты, а не под размер всего дома.

### В чём разница с media queries

Media query спрашивает: «какой ширины **экран** (viewport, видимая область браузера)?». Container query спрашивает: «какой ширины **ближайший контейнер-предок**?». Благодаря этому один и тот же компонент становится по-настоящему переиспользуемым: он адаптируется где угодно, ничего не зная про глобальные брейкпоинты сайта.

Чтобы элемент стал «контейнером, за которым можно следить», ему задают \`container-type\`. После этого потомки могут писать правила через \`@container\`.

\`\`\`css
.sidebar { container-type: inline-size; container-name: panel; }

@container panel (min-width: 400px) {
  .card { grid-template-columns: 1fr 2fr; }
}
\`\`\`

Здесь \`.sidebar\` объявлен контейнером с именем \`panel\`. Правило \`@container panel (min-width: 400px)\` срабатывает, когда сам \`.sidebar\` шире 400px, и меняет раскладку карточки внутри него.

### \`container-type\` — что выбрать

- \`inline-size\` — следим только за шириной (точнее, за inline-осью, вдоль которой идёт текст). Это дёшево и нужно в 95% случаев.
- \`size\` — следим за обеими осями (и шириной, и высотой). Но требует явной высоты контейнера, иначе контент «схлопнется» в ноль, ведь высота обычно зависит от содержимого, а мы просим браузер зафиксировать её заранее.
- \`normal\` — отключает size-запросы, но оставляет style-запросы (о них ниже).

### Containment — почему это ещё и про скорость

Когда элемент объявлен контейнером, браузер включает для него **containment** (изоляцию): layout, style и inline-size. Простыми словами — элемент становится «границей»: если что-то меняется внутри него, браузер не пересчитывает раскладку у предков. Это ускоряет reflow (перерасчёт геометрии страницы).

Важный нюанс: **нельзя задать container-query самому себе**. Запрос всегда адресован предку. Контейнер описывает размер, а реагируют на него потомки внутри.

### Единицы cqw / cqh / cqi / cqb

Это проценты от размера query-контейнера: \`cqi\` — 1% от inline-размера (ширины в обычном тексте), \`cqb\` — от block-размера, \`cqw\`/\`cqh\` — от ширины/высоты. Удобно для «плавной» типографики, привязанной к размеру компонента, а не экрана.

\`\`\`css
.card-host {
  container-type: inline-size;
  container-name: card;
}

.card { display: grid; gap: 0.5rem; }

@container card (min-width: 30rem) {
  .card {
    grid-template-columns: 8rem 1fr;
    /* cqi = 1% от inline-размера query-контейнера */
    font-size: clamp(0.9rem, 2cqi, 1.2rem);
  }
}
\`\`\`

Когда контейнер \`card\` шире 30rem, карточка перестраивается в две колонки, а размер шрифта плавно растёт вместе с шириной контейнера (но зажат между 0.9rem и 1.2rem через \`clamp\`).

### Производительность

Containment ограничивает зону пересчёта layout, снижая стоимость reflow — это плюс. Но если навесить контейнер на **каждый** узел дерева, получится много отдельных «корней раскладки», и это уже может стоить дорого. Мерь результат в **Performance panel** DevTools (смотри Layout и Recalc Style), а не угадывай.

### ⚠️ Подводные камни

- \`container-type: size\` без явной высоты часто ломает вёрстку — контент схлопывается. По умолчанию бери \`inline-size\`.
- Нельзя стилизовать сам контейнер его же container-query — только его потомков.
- Style queries (\`@container style(--theme: dark)\`) поддержаны лишь частично — проверяй актуальный Baseline перед использованием.
- Не вешай контейнеры бездумно на всё подряд: много sub-layout-корней могут навредить.

## 🎯 Запомни

- Media queries смотрят на окно, container queries — на размер контейнера-предка. Это делает компоненты переиспользуемыми.
- \`inline-size\` — дёшево и безопасно; \`size\` требует явной высоты.
- Container queries — Baseline 2023, безопасны в современных браузерах; измеряй производительность в Performance panel.`,
      en: `## 🧩 In plain words

Imagine you have a product card. Normally we decide how to display it by looking at the size of the **whole browser window** — that is what media queries do. But the card might sit in a narrow sidebar or in a wide main column. The window is the same, yet the space around the card is different. Container queries let the card look not at the window but at the **size of its own parent container** and adapt to that. It is as if furniture reshaped itself to fit the room rather than the size of the whole house.

### How they differ from media queries

A media query asks: "how wide is the **viewport** (the visible browser area)?". A container query asks: "how wide is the **nearest container ancestor**?". Because of this, the same component becomes truly reusable: it adapts anywhere, knowing nothing about the site's global breakpoints.

For an element to become a "container you can watch", you give it a \`container-type\`. After that, its descendants can write rules using \`@container\`.

\`\`\`css
.sidebar { container-type: inline-size; container-name: panel; }

@container panel (min-width: 400px) {
  .card { grid-template-columns: 1fr 2fr; }
}
\`\`\`

Here \`.sidebar\` is declared a container named \`panel\`. The rule \`@container panel (min-width: 400px)\` fires when \`.sidebar\` itself is wider than 400px and changes the card layout inside it.

### \`container-type\` — what to pick

- \`inline-size\` — watch width only (more precisely, the inline axis, the direction text runs). Cheap, and what you want 95% of the time.
- \`size\` — watch both axes (width and height). But it needs an explicit container height, otherwise content collapses to zero, because height usually depends on content and we are asking the browser to fix it up front.
- \`normal\` — disables size queries but keeps style queries (see below).

### Containment — why this is also about speed

When an element is declared a container, the browser turns on **containment** (isolation): layout, style, and inline-size. In plain words, the element becomes a boundary: if something changes inside it, the browser does not re-layout the ancestors. This speeds up reflow (recomputing the page geometry).

Key subtlety: **you cannot query an element against itself**. The query always targets an ancestor. The container describes the size; the descendants inside react to it.

### The cqw / cqh / cqi / cqb units

These are percentages of the query container's size: \`cqi\` is 1% of the inline size (width in normal text), \`cqb\` of the block size, \`cqw\`/\`cqh\` of width/height. Handy for fluid typography scoped to a component rather than the screen.

\`\`\`css
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
}
\`\`\`

When the \`card\` container is wider than 30rem, the card switches to two columns and the font size grows smoothly with the container width (clamped between 0.9rem and 1.2rem via \`clamp\`).

### Performance

Containment limits the layout recalc region, lowering reflow cost — a win. But if you put a container on **every** node in the tree, you get many separate "layout roots", and that can get expensive. Measure it in the DevTools **Performance panel** (watch Layout and Recalc Style) instead of guessing.

### ⚠️ Common pitfalls

- \`container-type: size\` without an explicit height often breaks the layout — content collapses. Default to \`inline-size\`.
- You cannot style a container with its own container query — only its descendants.
- Style queries (\`@container style(--theme: dark)\`) are only partially supported — check current Baseline before using.
- Do not slap containers on everything: many sub-layout roots can hurt.

## 🎯 Key takeaways

- Media queries look at the window; container queries look at the parent container's size. That makes components reusable.
- \`inline-size\` is cheap and safe; \`size\` requires an explicit height.
- Container queries are Baseline 2023 and safe in modern browsers; measure performance in the Performance panel.`
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
      ru: `## 🧩 Простыми словами

Раньше в CSS можно было стилизовать только «вниз»: родитель влиял на детей. Нельзя было сказать «покрась контейнер, если внутри него есть картинка». Селектор \`:has()\` переворачивает это: он выбирает элемент, **если внутри него (или рядом с ним) есть** что-то нужное. Его так и прозвали «родительский селектор» — впервые можно менять предка, глядя на потомка, и всё это без единой строчки JavaScript.

### Как это работает

\`:has()\` матчит элемент, если он **содержит** (или соотносится по сиблингу) с тем, что описано в скобках.

\`\`\`css
/* Карточка, внутри которой есть картинка, выглядит иначе */
.card:has(img) { padding: 0; }

/* Звёздочка у лейбла обязательного поля */
label:has(+ input:required)::after { content: ' *'; color: red; }

/* Форма, где есть хоть одно невалидное поле */
form:has(:invalid) .submit { opacity: 0.5; }
\`\`\`

Читается так: «выбери \`.card\`, **у которой** внутри есть \`img\`». Обрати внимание на второй пример: \`+ input\` — это соседний следующий элемент, то есть \`:has()\` умеет смотреть не только внутрь, но и на сиблингов.

### Что открывает

- **Стилизация предка**: подсветить строку \`<tr>\`, в которой стоит отмеченный чекбокс \`:checked\`.
- **Сиблинг-логика**: \`h2:has(+ p)\` — заголовок, за которым сразу идёт параграф.
- **Quantity queries** (правила «если элементов столько-то») в связке с \`:nth-child\`.
- **Замена JS-классов**: раньше многие состояния приходилось руками добавлять классом через JS — теперь часто хватает чистого CSS.

\`\`\`css
/* Переключаем всю раскладку от состояния чекбокса — без JS */
.layout:has(#nav-toggle:checked) {
  grid-template-columns: 16rem 1fr;
}

/* Стилизуем строку, содержащую отмеченный чекбокс */
tr:has(input[type="checkbox"]:checked) {
  background: var(--row-selected, #eef);
}
\`\`\`

### Производительность

Долгое время «родительский селектор» считали в принципе невозможным — казалось, он будет слишком дорого стоить. Современные движки (Blink в Chrome, WebKit в Safari) реализуют его через **инвалидацию поддеревьев**: когда потомок меняется, браузер помечает кандидатов на \`:has()\` для пересчёта стиля (Style Recalc), а не переоценивает вообще всё.

Дорого становится, когда селектор слишком широкий, например \`*:has(.x)\` (звёздочка = «любой элемент», браузеру приходится проверять весь документ), или когда \`:has()\` завязан на часто меняющиеся состояния в очень больших деревьях — это расширяет зону пересчёта стилей.

### ⚠️ Подводные камни

- Квалифицируй левую часть: пиши \`.card:has(...)\`, а не \`*:has(...)\` — иначе браузер сканирует весь документ.
- Избегай \`:has()\` на быстро меняющихся состояниях внутри огромных списков — это бьёт по Style Recalc.
- Firefox добавил поддержку позже остальных — если целишься в старые версии, проверь Baseline.
- Не угадывай стоимость: измеряй «Recalculate Style» в панели Performance.

## 🎯 Запомни

- \`:has()\` — первый способ стилизовать предка по потомку (или по сиблингу) без JS.
- Всегда квалифицируй левую часть (\`.card:has(...)\`, не \`*:has(...)\`).
- Baseline 2023; движки используют инвалидацию поддеревьев, но широкие селекторы на динамических состояниях всё равно могут стоить дорого — измеряй.`,
      en: `## 🧩 In plain words

CSS used to style only "downward": a parent affected its children. You could not say "color this container if it contains an image." The \`:has()\` selector flips that: it selects an element **if it contains (or sits next to)** something you care about. That is why people call it the "parent selector" — for the first time you can change an ancestor based on a descendant, all without a single line of JavaScript.

### How it works

\`:has()\` matches an element if it **contains** (or relates by sibling) whatever is described in the parentheses.

\`\`\`css
/* A card that contains an image looks different */
.card:has(img) { padding: 0; }

/* A marker on a required field's label */
label:has(+ input:required)::after { content: ' *'; color: red; }

/* A form that has any invalid field */
form:has(:invalid) .submit { opacity: 0.5; }
\`\`\`

Read it as: "select \`.card\` **that has** an \`img\` inside it." Note the second example: \`+ input\` is the next sibling element, so \`:has()\` can look not only inside but also at siblings.

### What it unlocks

- **Ancestor styling**: highlight a \`<tr>\` that contains a \`:checked\` checkbox.
- **Sibling logic**: \`h2:has(+ p)\` — a heading immediately followed by a paragraph.
- **Quantity queries** (rules like "if there are N of something") combined with \`:nth-child\`.
- **Replacing JS classes**: many states used to require manually adding a class via JS — now plain CSS often does the job.

\`\`\`css
/* Toggle a whole layout from a checkbox state — no JS */
.layout:has(#nav-toggle:checked) {
  grid-template-columns: 16rem 1fr;
}

/* Style a row that contains a selected checkbox */
tr:has(input[type="checkbox"]:checked) {
  background: var(--row-selected, #eef);
}
\`\`\`

### Performance

For a long time the "parent selector" was deemed fundamentally infeasible — it seemed it would cost too much. Modern engines (Blink in Chrome, WebKit in Safari) implement it with **subtree invalidation**: when a descendant changes, the browser marks the \`:has()\` candidates for style recalc rather than re-evaluating everything.

It gets expensive when the selector is too broad, e.g. \`*:has(.x)\` (\`*\` means "any element", so the browser must check the whole document), or when \`:has()\` is tied to frequently changing states in very large trees — that widens the Style Recalc region.

### ⚠️ Common pitfalls

- Qualify the left side: write \`.card:has(...)\`, not \`*:has(...)\` — otherwise the browser scans the whole document.
- Avoid \`:has()\` on fast-changing states inside huge lists — it hits Style Recalc.
- Firefox shipped support later than the others — if you target old versions, check Baseline.
- Do not guess the cost: measure "Recalculate Style" in the Performance panel.

## 🎯 Key takeaways

- \`:has()\` is the first way to style an ancestor based on a descendant (or sibling) without JS.
- Always qualify the left side (\`.card:has(...)\`, not \`*:has(...)\`).
- Baseline 2023; engines use subtree invalidation, but broad selectors on dynamic states can still be costly — measure.`
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
      ru: `## 🧩 Простыми словами

Обычно в CSS, когда два правила спорят за один элемент, побеждает то, у которого выше **специфичность** (грубо: чем «весомее» селектор — \`#id\` весомее \`.class\`, тот и выигрывает). Это приводит к «войнам специфичности»: чтобы переопределить чужой стиль, разработчики пишут всё более длинные селекторы или лепят \`!important\`. Cascade layers (\`@layer\`) добавляют новый, более крупный «уровень принятия решений» **над** специфичностью: ты заранее объявляешь порядок слоёв, и слой-победитель выигрывает **независимо от того, насколько специфичны селекторы внутри**. Это как расставить приоритеты отделов в компании: решение отдела с более высоким приоритетом важнее, кто бы что ни говорил внутри.

### Как это меняет каскад

\`@layer\` вводит новое измерение каскада **между** origin (чьи это стили: браузера, пользователя или автора) и специфичностью. Порядок объявления слоёв задаёт приоритет: правило из **более позднего** слоя побеждает правило из раннего слоя, даже если у него меньше специфичность.

\`\`\`css
@layer reset, base, components, utilities;

@layer base {
  a { color: blue; }              /* проигрывает */
}
@layer utilities {
  .link { color: rebeccapurple; } /* побеждает, хотя специфичность ниже */
}
\`\`\`

Первая строка объявляет порядок слоёв один раз, сверху. \`utilities\` объявлен позже \`base\`, значит он приоритетнее. Поэтому \`.link\` (специфичность класса) обыгрывает \`a\` (специфичность тега) — не по весу селектора, а по порядку слоёв.

### Упрощённый алгоритм каскада (от высшего приоритета к низшему)

1. Origin + важность (стили браузера, пользователя, автора; \`!important\` меняет порядок).
2. **Слои**: внутри author-origin решает порядок объявления слоёв.
3. Специфичность (\`#id\` > \`.class\` > тег).
4. Порядок появления (кто написан ниже в файле).

### Ключевой нюанс: \`!important\` инвертирует порядок слоёв

Для обычных правил поздний слой сильнее. Но \`!important\`-правила подчиняются **обратному** порядку: important в **раннем** слое побеждает important в позднем. Звучит странно, но это специально: ранние слои становятся «слоем защиты» для критичных переопределений, которые никто не должен случайно перебить.

### Зачем это в больших проектах

- **Приручение чужого CSS**: заворачиваешь библиотеку в \`@layer framework\` (ранний слой), а свои стили кладёшь в поздний слой — и они выигрывают **без гонки специфичности и без \`!important\`**.
- **Предсказуемость**: явный порядок вместо эскалации селекторов (\`.a .b .c\` против \`#id\`).
- **Осторожно с «незалейеренными» стилями**: правила вне всяких слоёв имеют **высший** приоритет среди author-стилей (они идут после всех именованных слоёв). Это частая ловушка при миграции: кусок старого CSS без слоя внезапно перебивает всё.

\`\`\`css
/* Задаём порядок один раз, наверху */
@layer reset, vendor, components, app, utilities;

/* Затягиваем стороннюю таблицу стилей в низкоприоритетный слой */
@import url("bootstrap.css") layer(vendor);

@layer app {
  .btn { padding: 0.5rem 1rem; }  /* бьёт vendor без !important */
}

@layer utilities {
  .p-0 { padding: 0; }            /* поздний слой выигрывает даже на специфичности класса */
}

/* Незалейеренное правило перебивает ВСЕ именованные слои выше */
.debug { outline: 1px solid red; }
\`\`\`

Строка \`@import url(...) layer(vendor)\` — удобный приём: она подключает вендорный CSS сразу в нужный слой, так что он гарантированно окажется ниже твоих стилей по приоритету.

### ⚠️ Подводные камни

- Незалейеренные стили сильнее любого именованного слоя — не забывай про это при постепенной миграции.
- \`!important\` инвертирует порядок слоёв — не полагайся на «поздний слой всегда сильнее» для important-правил.
- Объявляй порядок слоёв **один раз в начале**: первое упоминание слоя фиксирует его позицию.

## 🎯 Запомни

- \`@layer\` добавляет измерение каскада над специфичностью: поздний слой бьёт ранний независимо от селекторов.
- Главная польза — приручить сторонний CSS без \`!important\` и войн специфичности.
- Незалейеренные стили — высший приоритет среди автора; \`!important\` переворачивает порядок слоёв. Baseline 2022.`,
      en: `## 🧩 In plain words

Normally in CSS, when two rules fight over the same element, the one with higher **specificity** wins (roughly: the "heavier" the selector — \`#id\` outweighs \`.class\` — the stronger it is). This leads to "specificity wars": to override someone else's style, developers write longer and longer selectors or slap on \`!important\`. Cascade layers (\`@layer\`) add a new, larger "decision level" **above** specificity: you declare the order of layers up front, and the winning layer wins **no matter how specific the selectors inside it are**. It is like ranking departments in a company: the higher-priority department's decision matters more, whatever anyone says internally.

### How it changes the cascade

\`@layer\` introduces a new cascade dimension **between** origin (whose styles they are: browser, user, or author) and specificity. Layer declaration order sets priority: a rule from a **later** layer beats one from an earlier layer, even if it has lower specificity.

\`\`\`css
@layer reset, base, components, utilities;

@layer base {
  a { color: blue; }              /* loses */
}
@layer utilities {
  .link { color: rebeccapurple; } /* wins, even at lower specificity */
}
\`\`\`

The first line declares the layer order once, up top. \`utilities\` is declared after \`base\`, so it has higher priority. That is why \`.link\` (class specificity) beats \`a\` (tag specificity) — not by selector weight but by layer order.

### Simplified cascade algorithm (highest priority first)

1. Origin + importance (browser, user, author styles; \`!important\` flips the order).
2. **Layers**: within the author origin, layer declaration order decides.
3. Specificity (\`#id\` > \`.class\` > tag).
4. Order of appearance (whichever is written later in the file).

### Key subtlety: \`!important\` reverses layer order

For normal rules, a later layer is stronger. But \`!important\` rules follow the **reverse** order: an important rule in an **earlier** layer beats an important one in a later layer. It sounds odd, but it is deliberate: early layers become a "protection layer" for critical overrides that nobody should accidentally beat.

### Why it matters in large codebases

- **Taming third-party CSS**: wrap a library in \`@layer framework\` (an early layer) and put your styles in a later layer — yours win **without a specificity war and without \`!important\`**.
- **Predictability**: explicit ordering instead of selector escalation (\`.a .b .c\` vs \`#id\`).
- **Watch out for "unlayered" styles**: rules outside any layer have the **highest** priority among author styles (they come after all named layers). This is a common migration trap: a bit of old, unlayered CSS suddenly overrides everything.

\`\`\`css
/* Establish the order once, up top */
@layer reset, vendor, components, app, utilities;

/* Pull a third-party stylesheet into a low-priority layer */
@import url("bootstrap.css") layer(vendor);

@layer app {
  .btn { padding: 0.5rem 1rem; }  /* beats vendor without !important */
}

@layer utilities {
  .p-0 { padding: 0; }            /* late layer wins even at class specificity */
}

/* An unlayered rule outranks ALL the named layers above */
.debug { outline: 1px solid red; }
\`\`\`

The line \`@import url(...) layer(vendor)\` is a handy trick: it pulls vendor CSS straight into the desired layer, so it is guaranteed to rank below your styles.

### ⚠️ Common pitfalls

- Unlayered styles are stronger than any named layer — remember this during a gradual migration.
- \`!important\` reverses layer order — do not rely on "the later layer always wins" for important rules.
- Declare the layer order **once at the start**: a layer's first mention fixes its position.

## 🎯 Key takeaways

- \`@layer\` adds a cascade dimension above specificity: a later layer beats an earlier one regardless of selectors.
- The main win is taming third-party CSS without \`!important\` or specificity wars.
- Unlayered styles have the highest author priority; \`!important\` reverses layer order. Baseline 2022.`
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
      ru: `## 🧩 Простыми словами

Свойства вроде \`margin-left\` или \`width\` привязаны к **экрану**: «лево» — это всегда физически левый край. Но текст не везде идёт слева направо: арабский и иврит читаются справа налево, а японский или китайский иногда пишут вертикально. Логические свойства описывают отступы и размеры не через «лево/право/верх/низ», а через **направление текста**: «начало строки», «конец строки», «вдоль строки», «поперёк строк». Тогда одна и та же вёрстка сама «зеркалится» под нужный язык, и не нужно писать отдельные правила для каждого направления.

### Две оси: inline и block

Логические свойства мыслят в двух осях, привязанных к потоку текста:

- **inline** — ось, вдоль которой идут буквы (в русском/английском это горизонталь, слева направо).
- **block** — ось, вдоль которой строки складываются одна под другую (в русском/английском это вертикаль, сверху вниз).

У каждой оси есть **start** (начало) и **end** (конец). В обычном LTR-тексте \`inline-start\` = левый край, \`inline-end\` = правый, \`block-start\` = верх, \`block-end\` = низ.

### Соответствие физических и логических свойств

- \`margin-left\` → \`margin-inline-start\`
- \`padding-right\` → \`padding-inline-end\`
- \`width\` → \`inline-size\`
- \`height\` → \`block-size\`
- \`top\` / \`bottom\` → \`inset-block-start\` / \`inset-block-end\`

\`\`\`css
.card {
  padding-inline: 1rem;           /* лево+право в LTR, авто-зеркалит в RTL */
  margin-block: 0.5rem;           /* верх+низ */
  border-inline-start: 2px solid; /* граница у «начала» строки */
}
\`\`\`

\`padding-inline\` — это сокращение сразу для обоих краёв inline-оси. В LTR это левый и правый padding; в RTL браузер сам поменяет их местами — код тот же.

### Почему это важно

- **RTL без дублирования**: при \`dir="rtl"\` (арабский, иврит) \`margin-inline-start\` автоматически становится правым отступом. Больше не нужны отдельные \`.rtl\`-таблицы стилей.
- **Вертикальные режимы письма**: при \`writing-mode: vertical-rl\` (CJK) inline-ось становится вертикальной — логические свойства «просто работают» и там.
- **Меньше кода и багов**: один набор правил вместо физического плюс его зеркальной копии.

\`\`\`css
/* Один компонент, корректный и в LTR, и в RTL без переопределений */
.alert {
  padding-block: 0.75rem;
  padding-inline: 1rem;
  border-inline-start: 4px solid currentColor; /* акцент на «начальном» крае чтения */
  text-align: start;
}

.alert__close {
  position: absolute;
  inset-block-start: 0.5rem;
  inset-inline-end: 0.5rem; /* верх-право в LTR, верх-лево в RTL */
}
\`\`\`

### ⚠️ Подводные камни

- Сокращение \`inset: 0\` — **физическое**. Логические аналоги — \`inset-block\` и \`inset-inline\`.
- Для выравнивания текста используй \`text-align: start / end\`, а не \`left / right\`.
- Физические свойства оставляй лишь там, где привязка к экрану нужна намеренно (например, фиксированный декоративный элемент, который не должен зеркалиться).

## 🎯 Запомни

- Логические свойства привязаны к потоку текста (inline/block, start/end), а не к экрану.
- Они дают бесплатную поддержку RTL и вертикального письма без дублирования CSS.
- Это стандарт по умолчанию для новых проектов (Baseline, безопасно в продакшене); \`inset\` без осей — физический, будь внимателен.`,
      en: `## 🧩 In plain words

Properties like \`margin-left\` or \`width\` are tied to the **screen**: "left" is always the physical left edge. But text does not run left-to-right everywhere: Arabic and Hebrew read right-to-left, and Japanese or Chinese are sometimes written vertically. Logical properties describe spacing and size not through "left/right/top/bottom" but through the **direction of text**: "start of the line", "end of the line", "along the line", "across the lines". Then the same layout "mirrors" itself for the target language, and you do not need separate rules per direction.

### Two axes: inline and block

Logical properties think in two axes tied to the text flow:

- **inline** — the axis the letters run along (in English/Russian this is horizontal, left to right).
- **block** — the axis lines stack along, one under another (in English/Russian this is vertical, top to bottom).

Each axis has a **start** and an **end**. In normal LTR text, \`inline-start\` = left edge, \`inline-end\` = right, \`block-start\` = top, \`block-end\` = bottom.

### Physical-to-logical mapping

- \`margin-left\` → \`margin-inline-start\`
- \`padding-right\` → \`padding-inline-end\`
- \`width\` → \`inline-size\`
- \`height\` → \`block-size\`
- \`top\` / \`bottom\` → \`inset-block-start\` / \`inset-block-end\`

\`\`\`css
.card {
  padding-inline: 1rem;           /* left+right in LTR, auto-mirrors in RTL */
  margin-block: 0.5rem;           /* top+bottom */
  border-inline-start: 2px solid; /* border at the "start" of the line */
}
\`\`\`

\`padding-inline\` is shorthand for both edges of the inline axis at once. In LTR that is left and right padding; in RTL the browser swaps them for you — same code.

### Why it matters

- **RTL with no duplication**: under \`dir="rtl"\` (Arabic, Hebrew), \`margin-inline-start\` automatically becomes a right margin. No more separate \`.rtl\` stylesheet.
- **Vertical writing modes**: under \`writing-mode: vertical-rl\` (CJK), the inline axis becomes vertical — logical properties "just work" there too.
- **Less code and fewer bugs**: one rule set instead of a physical one plus its mirrored copy.

\`\`\`css
/* One component, correct in both LTR and RTL with no overrides */
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
}
\`\`\`

### ⚠️ Common pitfalls

- The \`inset: 0\` shorthand is **physical**. The logical equivalents are \`inset-block\` and \`inset-inline\`.
- For text alignment use \`text-align: start / end\`, not \`left / right\`.
- Keep physical properties only where screen anchoring is intentional (e.g., a fixed decorative element that must not mirror).

## 🎯 Key takeaways

- Logical properties are tied to the text flow (inline/block, start/end), not the screen.
- They give free RTL and vertical-writing support without duplicating CSS.
- They are the default for new work (Baseline, safe in production); note that \`inset\` without an axis is physical.`
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
      ru: `## 🧩 Простыми словами

Представь ряд карточек: у одной длинный заголовок, у другой короткий. Кнопки внизу «пляшут» на разной высоте, потому что каждая карточка расставляет свои внутренние строки сама по себе. \`subgrid\` — это способ сказать вложенной карточке: «не выдумывай свои строки, возьми готовые линии у родителя». Тогда заголовки, тексты и кнопки всех карточек встают ровно на общие линии, как по линейке.

### Что такое трек и почему обычный вложенный грид не помогает

**Грид (grid)** — это раскладка по строкам и колонкам. **Трек (track)** — это одна колонка или одна строка сетки, а **линии (grid lines)** — границы между треками.

Когда ты кладёшь \`display: grid\` на карточку внутри другого грида, карточка становится **отдельной, независимой** сеткой. Она ничего не знает о треках родителя и создаёт **свои собственные**. Из-за этого выровнять внутренности разных карточек по общим линиям невозможно — каждая живёт в своём мире.

### Как subgrid это решает

\`subgrid\` говорит: «мои треки по этой оси — это треки родителя». Ребёнок наследует линии родителя вместо того, чтобы создавать свои.

\`\`\`css
.cards { display: grid; grid-template-columns: repeat(3, 1fr); }

.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid;   /* строки берутся у родителя */
}
\`\`\`

Здесь \`grid-row: span 3\` означает, что карточка занимает 3 строки родителя, а \`grid-template-rows: subgrid\` — что эти строки берутся у родителя, а не выдумываются заново. Теперь все карточки делят общие строки, и внутренние элементы (заголовок, текст, кнопка) выстраиваются по единым линиям.

### Проблема, которую решает

Классический кейс — **выравнивание заголовков, текста и кнопок** в ряду карточек разной высоты. Без subgrid каждая карточка распределяет строки сама, и кнопки оказываются на разной высоте. С \`grid-template-rows: subgrid\` все карточки используют общие строки родителя, и элементы выравниваются идеально.

### Чем отличается от обычного вложенного грида

- **Линии и их имена** у родителя видны ребёнку — можно ссылаться на именованные линии родителя.
- **Gaps (промежутки между треками)** наследуются от родителя, но их можно переопределить.
- Ребёнок обязан **охватить** диапазон треков (\`grid-column: span N\` или явные линии), иначе наследовать нечего.

### Нюансы

- subgrid задаётся **по каждой оси независимо**: можно взять \`subgrid\` для строк и обычные треки для колонок (или наоборот).
- Глубокая вложенность subgrid работает, но её тяжелее отлаживать — включай Grid overlay в DevTools.

## ⚠️ Подводные камни

- Забыть \`grid-row: span N\` (или span по колонкам) — без охвата диапазона наследовать нечего, и subgrid не сработает.
- Думать, что \`subgrid\` действует сразу на обе оси — нет, его пишут отдельно для строк и для колонок.
- Поддержка: Baseline 2023 (Chrome добавил позже Firefox и Safari) — на очень старых браузерах нужен запасной вариант.

## 🎯 Запомни

- Обычный вложенный грид создаёт **свои** треки; \`subgrid\` **наследует треки родителя**.
- Главная польза — выровнять внутренности карточек ряда по **общим линиям** (заголовки/тексты/кнопки в ряд).
- Ребёнок должен **span-ить** нужные треки, а subgrid задаётся **по осям отдельно**.`,
      en: `## 🧩 In plain words

Picture a row of cards: one has a long title, another a short one. The buttons at the bottom "dance" at different heights because each card lays out its own inner rows independently. \`subgrid\` is a way to tell a nested card: "don't invent your own rows, borrow the ready-made lines from your parent." Then titles, bodies, and buttons across all cards line up neatly on shared lines, as if against a ruler.

### What a track is, and why a normal nested grid fails

A **grid** is a layout of rows and columns. A **track** is a single column or a single row of the grid, and **grid lines** are the borders between tracks.

When you put \`display: grid\` on a card inside another grid, that card becomes a **separate, independent** grid. It knows nothing about the parent's tracks and creates **its own**. Because of that, aligning the insides of separate cards to shared lines is impossible — each one lives in its own world.

### How subgrid solves it

\`subgrid\` says: "my tracks along this axis are the parent's tracks." The child inherits the parent's lines instead of creating its own.

\`\`\`css
.cards { display: grid; grid-template-columns: repeat(3, 1fr); }

.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid;   /* rows come from the parent */
}
\`\`\`

Here \`grid-row: span 3\` means the card occupies 3 of the parent's rows, and \`grid-template-rows: subgrid\` means those rows come from the parent instead of being invented anew. Now all cards share the same rows, and their inner items (title, body, button) line up on common lines.

### The problem it solves

The classic case is **aligning titles, body, and buttons** across a row of unequal-height cards. Without subgrid, each card distributes its rows independently and the buttons end up at different heights. With \`grid-template-rows: subgrid\`, all cards use the parent's shared rows and the items align perfectly.

### How it differs from a normal nested grid

- The parent's **lines and their names** are visible to the child — you can reference the parent's named lines.
- **Gaps (spaces between tracks)** are inherited from the parent, but you can override them.
- The child must **span** a track range (\`grid-column: span N\` or explicit lines), otherwise there is nothing to inherit.

### Nuances

- subgrid is set **per axis independently**: you can take \`subgrid\` for rows and use normal tracks for columns (or vice versa).
- Deep subgrid nesting works but is harder to debug — turn on the Grid overlay in DevTools.

## ⚠️ Common pitfalls

- Forgetting \`grid-row: span N\` (or a span across columns) — without spanning a range there is nothing to inherit, and subgrid won't work.
- Assuming \`subgrid\` applies to both axes at once — it doesn't; you write it separately for rows and columns.
- Support: Baseline 2023 (Chrome shipped it after Firefox and Safari) — very old browsers need a fallback.

## 🎯 Key takeaways

- A normal nested grid creates **its own** tracks; \`subgrid\` **inherits the parent's tracks**.
- The main win is aligning card insides across a row to **shared lines** (titles/bodies/buttons line up).
- The child must **span** the tracks it needs, and subgrid is set **per axis separately**.`
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
      ru: `## 🧩 Простыми словами

\`min()\`, \`max()\` и \`clamp()\` — это маленькие калькуляторы прямо внутри CSS. Ты пишешь несколько значений, а браузер сам выбирает нужное в зависимости от размера экрана. Самое полезное — \`clamp()\`: он держит значение в коридоре «не меньше вот этого, не больше вот того», а между ними даёт плавно расти. Благодаря этому шрифты и отступы плавно подстраиваются под ширину экрана без единого media query.

### Что делает каждая функция

Все три вычисляются **во время раскладки страницы** и умеют смешивать разные единицы: \`px\`, \`%\`, \`rem\`, \`vw\` (\`vw\` — 1% ширины окна браузера).

- \`min(a, b)\` берёт **меньшее** значение — то есть работает как **верхняя граница**. \`width: min(100%, 60ch)\` — блок не шире 60 символов и не шире контейнера, что наступит раньше.
- \`max(a, b)\` берёт **большее** — то есть **нижняя граница**. \`max(1rem, 2vw)\` — никогда не меньше 1rem.
- \`clamp(MIN, PREF, MAX)\` зажимает «предпочтительное» значение \`PREF\` между \`MIN\` и \`MAX\`. Формально это \`max(MIN, min(PREF, MAX))\`.

### Fluid typography без media queries

«Fluid typography» — это шрифт, который **плавно** меняет размер вместе с шириной экрана, а не скачками на брейкпоинтах.

\`\`\`css
h1 { font-size: clamp(1.75rem, 1rem + 3vw, 3rem); }
\`\`\`

Здесь шрифт никогда не меньше 1.75rem и не больше 3rem, а между ними плавно растёт. Средний член \`1rem + 3vw\` задаёт **наклон** этого роста: \`1rem\` — базовый размер, \`3vw\` — добавка, зависящая от ширины экрана.

### Адаптивные размеры вне текста

Те же функции отлично работают для отступов и сеток:

\`\`\`css
.container { padding: clamp(1rem, 5vw, 4rem); }
.grid { grid-template-columns: minmax(min(100%, 20rem), 1fr); }
\`\`\`

\`min(100%, 20rem)\` защищает от переполнения: на узких экранах трек не станет шире контейнера. Функции можно вкладывать друг в друга и внутрь \`calc()\`, а также использовать умножение и деление.

## ⚠️ Подводные камни

- **Доступность (a11y)**: чистый \`vw\` в размере шрифта ломает zoom — пользователь не может увеличить текст. Всегда добавляй \`rem\`-компоненту (\`1rem + 3vw\`), чтобы текст реагировал на масштаб браузера. Это требование WCAG 1.4.4 (Resize Text).
- Не путай \`min()\` и \`max()\`: \`min()\` задаёт потолок, \`max()\` — пол. Название интуитивно кажется наоборот.
- Слишком большой \`vw\`-коэффициент делает рост шрифта агрессивным — проверяй крайние ширины экрана.

## 🎯 Запомни

- \`min()\` — верхняя граница, \`max()\` — нижняя, \`clamp(MIN, PREF, MAX)\` — коридор между ними.
- \`clamp()\` даёт **непрерывную** адаптацию вместо ступенек на брейкпоинтах — media queries часто не нужны.
- В шрифтах всегда держи \`rem\`-часть внутри \`clamp\`, иначе сломаешь zoom (WCAG 1.4.4).`,
      en: `## 🧩 In plain words

\`min()\`, \`max()\` and \`clamp()\` are tiny calculators living inside CSS. You write a few values, and the browser picks the right one based on the screen size. The most useful is \`clamp()\`: it keeps a value in a corridor of "no smaller than this, no bigger than that," and lets it grow smoothly in between. Thanks to this, fonts and spacing adapt fluidly to screen width without a single media query.

### What each function does

All three are evaluated **at layout time** and can mix different units: \`px\`, \`%\`, \`rem\`, \`vw\` (\`vw\` is 1% of the browser window's width).

- \`min(a, b)\` picks the **smaller** value — so it acts as an **upper bound**. \`width: min(100%, 60ch)\` — the box is never wider than 60 characters nor wider than the container, whichever comes first.
- \`max(a, b)\` picks the **larger** — so it's a **lower bound**. \`max(1rem, 2vw)\` — never below 1rem.
- \`clamp(MIN, PREF, MAX)\` clamps the "preferred" value \`PREF\` between \`MIN\` and \`MAX\`. Formally it's \`max(MIN, min(PREF, MAX))\`.

### Fluid typography without media queries

"Fluid typography" is text that changes size **smoothly** with the screen width, instead of jumping at breakpoints.

\`\`\`css
h1 { font-size: clamp(1.75rem, 1rem + 3vw, 3rem); }
\`\`\`

Here the font is never below 1.75rem nor above 3rem, and grows smoothly in between. The middle term \`1rem + 3vw\` sets the **slope** of that growth: \`1rem\` is the base size, \`3vw\` is a bonus that depends on the screen width.

### Adaptive sizing beyond text

The same functions work great for spacing and grids:

\`\`\`css
.container { padding: clamp(1rem, 5vw, 4rem); }
.grid { grid-template-columns: minmax(min(100%, 20rem), 1fr); }
\`\`\`

\`min(100%, 20rem)\` guards against overflow: on narrow screens the track won't grow wider than the container. You can nest these functions inside each other and inside \`calc()\`, and use multiplication and division too.

## ⚠️ Common pitfalls

- **Accessibility (a11y)**: a pure \`vw\` font size breaks zoom — the user cannot enlarge the text. Always add a \`rem\` term (\`1rem + 3vw\`) so text still responds to browser zoom. This is WCAG 1.4.4 (Resize Text).
- Don't confuse \`min()\` and \`max()\`: \`min()\` sets the ceiling, \`max()\` sets the floor. The naming feels backwards at first.
- Too large a \`vw\` coefficient makes font growth aggressive — check the extreme screen widths.

## 🎯 Key takeaways

- \`min()\` is an upper bound, \`max()\` is a lower bound, \`clamp(MIN, PREF, MAX)\` is the corridor between them.
- \`clamp()\` gives **continuous** adaptation instead of steps at breakpoints — media queries are often unnecessary.
- In fonts always keep a \`rem\` term inside \`clamp\`, or you'll break zoom (WCAG 1.4.4).`
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
      ru: `## 🧩 Простыми словами

CSS-переменные (их называют custom properties) — это именованные ячейки, куда можно положить значение и переиспользовать его по всему стилю. Но у обычной переменной есть два ограничения: браузер считает её просто «текстом» и не умеет её плавно анимировать. \`@property\` снимает эти ограничения — он объявляет переменной тип, как будто ты подписываешь коробку «здесь угол в градусах». А \`color-mix()\` — это блендер для цветов: смешал акцентный цвет с белым и получил цвет посветлее, прямо в браузере, без препроцессоров.

### Скоупинг: как переменные видны в дереве

CSS-переменные **наследуются** и подчиняются **каскаду**. Объявленная на \`:root\` (корень документа) переменная доступна везде. Объявленная на конкретном узле — переопределяет значение только для его поддерева. Это скоуп **через дерево элементов**, а не лексический как в JS.

\`\`\`css
.theme-dark { --bg: #111; }            /* работает только внутри .theme-dark */
.card { background: var(--bg, white); } /* white — запасное значение */
\`\`\`

Второй аргумент \`var()\` — это fallback: если переменная не задана, возьмётся \`white\`.

### \`@property\` — типизированные переменные

Обычная \`--x\` для браузера всегда просто строка. Из-за этого её **нельзя плавно анимировать** (браузер не знает, что «между» двумя значениями) и нельзя гарантировать корректность значения. \`@property\` регистрирует переменную с типом, начальным значением и флагом наследования:

\`\`\`css
@property --angle {
  syntax: '<angle>';      /* тип: угол */
  inherits: false;        /* не протекает в потомков */
  initial-value: 0deg;    /* значение по умолчанию */
}
.spinner {
  background: conic-gradient(from var(--angle), red, blue);
  transition: --angle 1s;
}
\`\`\`

Теперь \`--angle\` умеет **интерполироваться** — то есть плавно проходить промежуточные значения, что даёт анимацию градиента, невозможную с обычной переменной. Плюс значение **валидируется**: если подсунуть что-то не-угловое, браузер откатится к \`initial-value\`. А \`inherits: false\` не даёт переменной «протекать» в дочерние элементы.

### \`color-mix()\` — смешивание цветов

\`color-mix()\` смешивает два цвета в указанном цветовом пространстве:

\`\`\`css
--accent: #3b82f6;
color: color-mix(in oklch, var(--accent) 80%, white);   /* осветлить */
border-color: color-mix(in srgb, var(--accent), transparent 60%); /* прозрачнее */
\`\`\`

\`in oklch\` — это цветовое пространство. \`oklch\` и \`lab\` **перцептивные**: смешивание в них даёт визуально равномерные оттенки без грязных серых переходов. \`color-mix()\` заменяет функции препроцессоров \`lighten\`/\`darken\`, но работает **в рантайме**. Идеально, чтобы из одной переменной-акцента вывести цвета для hover и disabled состояний.

## ⚠️ Подводные камни

- Обычную (незарегистрированную) переменную нельзя анимировать через \`transition\` — нужен именно \`@property\`.
- \`syntax\` в \`@property\` должен точно совпадать с типом значения, иначе значение откатится к \`initial-value\` без ошибки — легко не заметить.
- Смешивание в \`srgb\` для сильно разных цветов даёт тусклый серый в середине; для ровных оттенков бери \`oklch\` или \`lab\`.

## 🎯 Запомни

- Скоуп переменных — **через дерево**: \`:root\` виден всем, объявление на узле переопределяет поддерево.
- \`@property\` даёт переменной **тип**, что открывает **анимацию** и валидацию (главное — \`transition\` для custom properties).
- \`color-mix()\` смешивает цвета **в рантайме**; используй перцептивный \`oklch\`/\`lab\` для ровных оттенков и вывода hover/disabled из одного акцента.`,
      en: `## 🧩 In plain words

CSS variables (called custom properties) are named cells where you store a value and reuse it across your styles. But a plain variable has two limits: the browser treats it as just "text," and it can't smoothly animate it. \`@property\` removes those limits — it declares a type for the variable, as if you labeled a box "angle in degrees here." And \`color-mix()\` is a blender for colors: mix your accent color with white and get a lighter shade, right in the browser, no preprocessor needed.

### Scoping: how variables are visible through the tree

CSS variables **inherit** and obey the **cascade**. A variable declared on \`:root\` (the document root) is available everywhere. Declared on a specific node, it overrides the value only for that node's subtree. This is scoping **through the element tree**, not lexical scoping like in JS.

\`\`\`css
.theme-dark { --bg: #111; }            /* only applies inside .theme-dark */
.card { background: var(--bg, white); } /* white is the fallback */
\`\`\`

The second argument of \`var()\` is a fallback: if the variable isn't set, \`white\` is used.

### \`@property\` — typed variables

To the browser, a plain \`--x\` is always just a string. Because of that it **cannot be smoothly animated** (the browser doesn't know what lies "between" two values) and its value can't be guaranteed valid. \`@property\` registers a variable with a type, an initial value, and an inheritance flag:

\`\`\`css
@property --angle {
  syntax: '<angle>';      /* type: an angle */
  inherits: false;        /* doesn't leak into descendants */
  initial-value: 0deg;    /* default value */
}
.spinner {
  background: conic-gradient(from var(--angle), red, blue);
  transition: --angle 1s;
}
\`\`\`

Now \`--angle\` can **interpolate** — smoothly pass through intermediate values, which gives an animated gradient impossible with a plain variable. Its value is also **validated**: feed it something non-angular and the browser falls back to \`initial-value\`. And \`inherits: false\` stops the variable from "leaking" into child elements.

### \`color-mix()\` — blending colors

\`color-mix()\` mixes two colors in a chosen color space:

\`\`\`css
--accent: #3b82f6;
color: color-mix(in oklch, var(--accent) 80%, white);   /* lighten */
border-color: color-mix(in srgb, var(--accent), transparent 60%); /* more transparent */
\`\`\`

\`in oklch\` is the color space. \`oklch\` and \`lab\` are **perceptual**: mixing in them gives visually even shades without muddy gray transitions. \`color-mix()\` replaces preprocessor \`lighten\`/\`darken\` functions, but works **at runtime**. Perfect for deriving hover and disabled state colors from a single accent variable.

## ⚠️ Common pitfalls

- A plain (unregistered) variable can't be animated via \`transition\` — you specifically need \`@property\`.
- The \`syntax\` in \`@property\` must exactly match the value's type, otherwise the value silently falls back to \`initial-value\` — easy to miss.
- Mixing very different colors in \`srgb\` produces a dull gray in the middle; for even shades use \`oklch\` or \`lab\`.

## 🎯 Key takeaways

- Variable scope is **through the tree**: \`:root\` is visible everywhere, a declaration on a node overrides its subtree.
- \`@property\` gives a variable a **type**, unlocking **animation** and validation (above all, \`transition\` for custom properties).
- \`color-mix()\` blends colors **at runtime**; use perceptual \`oklch\`/\`lab\` for even shades and to derive hover/disabled from one accent.`
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
      ru: `## 🧩 Простыми словами

Представь, что ты расставляешь коробки на полке фиксированной ширины. \`auto-fill\` и \`auto-fit\` — два способа сказать браузеру «наделай столько колонок, сколько влезет». Разница проявляется, когда коробок мало: \`auto-fill\` держит пустые места «про запас» (полка размечена под будущие коробки), а \`auto-fit\` схлопывает пустоту и растягивает имеющиеся коробки на всю ширину. Всё это позволяет строить адаптивные сетки без media query.

### \`auto-fit\` против \`auto-fill\`

Оба пишутся как \`repeat(auto-fit | auto-fill, minmax(MIN, 1fr))\` и создают столько колонок (треков), сколько помещается. Разница — в **пустых треках**:

- **\`auto-fill\`** создаёт максимум треков и **сохраняет пустые** колонки, даже если элементов мало. Реальные элементы не растягиваются на пустое место.
- **\`auto-fit\`** создаёт треки, затем **схлопывает пустые** до нуля и раздаёт освободившееся место реальным элементам (через \`1fr\`).

\`\`\`css
.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
}
\`\`\`

Если элементов всего два: \`auto-fit\` растянет их на всю ширину, а \`auto-fill\` оставит пустые «дырки» справа. Для галерей карточек обычно нужен именно **\`auto-fit\`**.

### \`minmax()\` и RAM-паттерн

\`minmax(MIN, MAX)\` задаёт трек, который **не уже** \`MIN\` и **не шире** \`MAX\`. В \`minmax(15rem, 1fr)\` трек не меньше 15rem, но растягивается до равной доли (\`1fr\` — это «одна доля свободного места»).

Связка \`repeat(auto-fit, minmax(15rem, 1fr))\` — это **RAM-паттерн** (Repeat, Auto, Minmax): адаптивная сетка вообще без media query. Защита от переполнения: \`minmax(min(100%, 15rem), 1fr)\` — на узких экранах трек не станет шире контейнера (иначе горизонтальный скролл).

### Template-areas — раскладка по именам

\`grid-template-areas\` позволяет рисовать макет **буквально по клеточкам с именами**:

\`\`\`css
.page {
  display: grid;
  grid-template-columns: 12rem 1fr;
  grid-template-areas:
    'nav header'
    'nav main';
}
.header { grid-area: header; }
\`\`\`

Каждое имя (\`nav\`, \`header\`, \`main\`) — это область, которую занимает элемент. Читается почти как ASCII-картинка макета. Внутри media query достаточно **переопределить \`grid-template-areas\`**, чтобы полностью перестроить макет — например, выстроить все области в один столбец на мобильном.

## ⚠️ Подводные камни

- Путаница \`auto-fit\`/\`auto-fill\`: если при двух карточках они растягиваются на всю ширину — это \`auto-fit\`; если остаются узкими с пустотой справа — \`auto-fill\`.
- Без \`min(100%, MIN)\` внутри \`minmax\` на очень узких экранах трек шире экрана даёт горизонтальный скролл.
- В \`grid-template-areas\` каждая строка должна описывать прямоугольные области и совпадать по числу колонок, иначе правило игнорируется.

## 🎯 Запомни

- \`auto-fill\` **хранит пустые** треки; \`auto-fit\` **схлопывает** их и растягивает реальные элементы (для галерей чаще нужен \`auto-fit\`).
- RAM-паттерн \`repeat(auto-fit, minmax(min(100%, MIN), 1fr))\` даёт адаптивную сетку **без media query** и без переполнения.
- \`grid-template-areas\` — читаемая раскладка по именам; для мобильного достаточно переопределить areas в media query.`,
      en: `## 🧩 In plain words

Imagine arranging boxes on a shelf of fixed width. \`auto-fill\` and \`auto-fit\` are two ways to tell the browser "make as many columns as fit." The difference shows when you have few boxes: \`auto-fill\` keeps empty slots "in reserve" (the shelf is marked out for future boxes), while \`auto-fit\` collapses the emptiness and stretches the existing boxes to full width. All of this lets you build responsive grids without media queries.

### \`auto-fit\` versus \`auto-fill\`

Both are written as \`repeat(auto-fit | auto-fill, minmax(MIN, 1fr))\` and create as many columns (tracks) as fit. The difference is in the **empty tracks**:

- **\`auto-fill\`** creates the maximum number of tracks and **keeps empty** columns even when items are few. Real items do not stretch into the empty space.
- **\`auto-fit\`** creates the tracks, then **collapses empty** ones to zero and hands the freed space to real items (via \`1fr\`).

\`\`\`css
.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
}
\`\`\`

With just two items: \`auto-fit\` stretches them to full width, while \`auto-fill\` leaves empty gaps on the right. Card galleries usually want **\`auto-fit\`**.

### \`minmax()\` and the RAM pattern

\`minmax(MIN, MAX)\` defines a track that is **no narrower** than \`MIN\` and **no wider** than \`MAX\`. In \`minmax(15rem, 1fr)\` the track is at least 15rem but grows to an equal share (\`1fr\` means "one share of the free space").

The combo \`repeat(auto-fit, minmax(15rem, 1fr))\` is the **RAM pattern** (Repeat, Auto, Minmax): a responsive grid with no media query at all. Overflow guard: \`minmax(min(100%, 15rem), 1fr)\` — on narrow screens the track won't grow wider than the container (which would cause horizontal scroll).

### Template-areas — layout by name

\`grid-template-areas\` lets you draw the layout **literally as named cells**:

\`\`\`css
.page {
  display: grid;
  grid-template-columns: 12rem 1fr;
  grid-template-areas:
    'nav header'
    'nav main';
}
.header { grid-area: header; }
\`\`\`

Each name (\`nav\`, \`header\`, \`main\`) is an area an element occupies. It reads almost like an ASCII picture of the layout. Inside a media query you only **redefine \`grid-template-areas\`** to fully restructure the layout — e.g., stack all areas into a single column on mobile.

## ⚠️ Common pitfalls

- Mixing up \`auto-fit\`/\`auto-fill\`: if two cards stretch to full width, that's \`auto-fit\`; if they stay narrow with empty space on the right, that's \`auto-fill\`.
- Without \`min(100%, MIN)\` inside \`minmax\`, on very narrow screens a track wider than the screen causes horizontal scroll.
- In \`grid-template-areas\`, every row must describe rectangular areas and match on column count, or the rule is ignored.

## 🎯 Key takeaways

- \`auto-fill\` **keeps empty** tracks; \`auto-fit\` **collapses** them and stretches real items (galleries usually want \`auto-fit\`).
- The RAM pattern \`repeat(auto-fit, minmax(min(100%, MIN), 1fr))\` gives a responsive grid **without media queries** and without overflow.
- \`grid-template-areas\` is a readable, name-based layout; for mobile just redefine the areas in a media query.`
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
      ru: `## 🧩 Простыми словами

Представь, что у каждого CSS-правила есть «вес», и когда два правила спорят за один и тот же элемент, побеждает тот, что тяжелее. Этот вес называется **специфичностью**. В большинстве случаев всё понятно, но есть несколько хитрых мест, где интуиция подводит — и именно про них любят спрашивать на собеседовании. Давай разберём эти «ловушки» по очереди.

### Как вообще считается специфичность

Специфичность — это тройка чисел \`(a, b, c)\`:
- \`a\` — количество **id-селекторов** (\`#header\`),
- \`b\` — количество **классов, атрибутов и псевдоклассов** (\`.btn\`, \`[type]\`, \`:hover\`),
- \`c\` — количество **тегов и псевдоэлементов** (\`div\`, \`::before\`).

Сравнивают слева направо, как версии: \`(1,0,0)\` всегда тяжелее любого \`(0,9,9)\`. Это фундамент, на который накладываются исключения ниже.

### \`!important\` и каскад

\`!important\` — это не «чуть больше веса», а **отдельный, более высокий уровень важности**. Обычные правила соревнуются между собой, а important-правила — в своей отдельной лиге поверх них.

Важные детали:
- Если спорят **два** important-объявления, между ними побеждает обычная специфичность.
- Порядок «источников» (origin) при important **переворачивается**: правило важности пользователя (\`user\`) бьёт правило автора (\`author\`). Без important — наоборот.
- **Инлайн-стиль** (\`style="..."\` прямо на элементе) бьёт любой селектор из стайлшита, **но не бьёт** \`!important\`, заданный в стайлшите.

### \`:where()\` против \`:is()\`

Оба псевдокласса позволяют коротко записать список селекторов, но по весу они противоположны:
- \`:where(...)\` имеет специфичность **ровно 0** — как будто его нет. Идеально для базовых стилей, которые потом легко переопределить.
- \`:is(...)\` берёт специфичность **самого «тяжёлого»** аргумента из списка.

\`\`\`css
:where(.a, #id) p { color: gray; } /* специфичность 0,0,1 — считается только p */
:is(.a, #id) p { color: gray; }     /* специфичность 1,0,1 — берёт #id */
\`\`\`

Поэтому \`:where()\` — мощный инструмент для «обнуляемых» базовых стилей: их перебьёт даже одиночный класс.

### Наследование против специфичности

Тут ключевая мысль: **наследование стоит вне конкурса специфичности**. Унаследованное значение (например, \`color\`, доставшийся от предка) проигрывает **любому** прямому объявлению на самом элементе — даже правилу с нулевой специфичностью.

\`\`\`css
:root { color: navy; }
* { color: black; } /* каждый элемент чёрный; navy никогда не наследуется */
\`\`\`

Правило \`*\` имеет специфичность \`(0,0,0)\`, но оно **прямое**, а наследование — это «последний резерв», который включается, только когда прямого значения нет вообще.

### \`all: unset\`, \`revert\`, \`revert-layer\`

\`all\` — сокращение, которое разом трогает **все** свойства:
- \`all: unset\` — наследуемые свойства ставит в \`inherit\`, ненаследуемые в \`initial\` (то есть возвращает «по умолчанию»).
- \`all: revert\` — откатывает к стилям браузера (**user-agent**). Удобно, чтобы «раздеть» сторонний виджет.
- \`all: revert-layer\` — откатывает к предыдущему cascade layer (слою каскада).

Это чистый способ изолировать компонент от чужого CSS **без войн \`!important\`**.

## ⚠️ Подводные камни

- Инлайн-стиль сильнее селекторов, но \`!important\` из стайлшита всё равно его перебьёт.
- \`:is()\` легко «утяжелить» одним \`#id\` в списке — тогда весь селектор станет тяжёлым; \`:where()\` от этого защищён.
- Не путай: \`* { color: red }\` перебьёт унаследованный цвет, хотя у него нулевая специфичность — потому что это прямое объявление.
- \`all: unset\` сбрасывает вообще всё, включая \`display\` и \`direction\` — легко случайно сломать раскладку.

## 🎯 Запомни

- Специфичность — тройка \`(id, класс/атрибут/псевдокласс, тег/псевдоэлемент)\`, но у неё есть исключения.
- \`!important\` живёт в отдельной лиге поверх обычных правил; инлайн-стиль бьёт селекторы, но не бьёт important из стайлшита.
- \`:where()\` = вес 0, \`:is()\` = вес самого тяжёлого аргумента.
- Наследование всегда проигрывает любому прямому правилу; \`all: unset/revert\` — чистый способ изолировать компонент без \`!important\`.`,
      en: `## 🧩 In plain words

Imagine every CSS rule carries a "weight", and when two rules fight over the same element, the heavier one wins. That weight is called **specificity**. Most of the time it's straightforward, but there are a few tricky spots where intuition fails — and those are exactly what interviewers love to probe. Let's walk through these "traps" one by one.

### How specificity is counted in the first place

Specificity is a triple of numbers \`(a, b, c)\`:
- \`a\` — number of **id selectors** (\`#header\`),
- \`b\` — number of **classes, attributes and pseudo-classes** (\`.btn\`, \`[type]\`, \`:hover\`),
- \`c\` — number of **elements and pseudo-elements** (\`div\`, \`::before\`).

You compare left to right, like version numbers: \`(1,0,0)\` always beats any \`(0,9,9)\`. This is the foundation on which the exceptions below are layered.

### \`!important\` and the cascade

\`!important\` is not "a bit more weight" — it's a **separate, higher importance band**. Normal rules compete with each other, and important rules compete in their own separate league on top of them.

Key details:
- If **two** important declarations clash, normal specificity decides between them.
- The order of "origins" under important is **reversed**: a \`user\` important rule beats an \`author\` important rule. Without important it's the other way around.
- An **inline style** (\`style="..."\` right on the element) beats any selector from a stylesheet, **but does not beat** an \`!important\` declared in a stylesheet.

### \`:where()\` vs \`:is()\`

Both pseudo-classes let you write a list of selectors compactly, but their weight is opposite:
- \`:where(...)\` has specificity **exactly 0** — as if it weren't there. Perfect for base styles you'll easily override later.
- \`:is(...)\` takes the specificity of its **heaviest** argument in the list.

\`\`\`css
:where(.a, #id) p { color: gray; } /* specificity 0,0,1 — only p counts */
:is(.a, #id) p { color: gray; }     /* specificity 1,0,1 — takes #id */
\`\`\`

That's why \`:where()\` is a powerful tool for "resettable" base styles: even a single class will override them.

### Inheritance vs specificity

Here's the key idea: **inheritance sits outside the specificity contest entirely**. An inherited value (e.g. a \`color\` handed down from an ancestor) loses to **any** direct declaration on the element itself — even a zero-specificity one.

\`\`\`css
:root { color: navy; }
* { color: black; } /* every element is black; navy is never inherited */
\`\`\`

The \`*\` rule has specificity \`(0,0,0)\`, but it's a **direct** declaration, whereas inheritance is a "last resort" that only kicks in when there's no direct value at all.

### \`all: unset\`, \`revert\`, \`revert-layer\`

\`all\` is a shorthand that touches **every** property at once:
- \`all: unset\` — sets inherited properties to \`inherit\`, non-inherited ones to \`initial\` (i.e. back to defaults).
- \`all: revert\` — rolls back to the browser's (**user-agent**) styles. Handy to "de-style" a third-party widget.
- \`all: revert-layer\` — rolls back to the previous cascade layer.

This is a clean way to isolate a component from outside CSS **without \`!important\` wars**.

## ⚠️ Common pitfalls

- Inline styles beat selectors, but a stylesheet \`!important\` still beats the inline style.
- \`:is()\` is easily made "heavy" by a single \`#id\` in the list — then the whole selector becomes heavy; \`:where()\` is immune to this.
- Don't confuse: \`* { color: red }\` overrides an inherited color despite zero specificity — because it's a direct declaration.
- \`all: unset\` resets literally everything, including \`display\` and \`direction\` — easy to accidentally break layout.

## 🎯 Key takeaways

- Specificity is a triple \`(id, class/attr/pseudo-class, element/pseudo-element)\`, but it has exceptions.
- \`!important\` lives in a separate league above normal rules; inline styles beat selectors but not a stylesheet \`!important\`.
- \`:where()\` = weight 0, \`:is()\` = weight of its heaviest argument.
- Inheritance always loses to any direct rule; \`all: unset/revert\` is a clean way to isolate a component without \`!important\`.`
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
      ru: `## 🧩 Простыми словами

\`position: sticky\` — это гибрид: элемент ведёт себя как обычный (стоит на своём месте в потоке), пока ты не докрутишь до определённой точки, а потом «прилипает» к краю экрана и едет вместе со скроллом. Классический пример — шапка таблицы, которая остаётся сверху, пока ты листаешь строки. Звучит просто, но sticky часто «не липнет» из-за неочевидных причин — разберём механику и типичные грабли.

### Как именно работает sticky

Sticky-элемент ведёт себя как \`position: relative\` — стоит на своём месте — **до тех пор, пока не достигнут его порог**. Порог — это \`top\`, \`bottom\`, \`left\` или \`right\`, например \`top: 0\`. Когда при скролле элемент доезжает до этой границы, он «прилипает» к ней и остаётся на виду.

Ключевая деталь: элемент **не покидает своего контейнера-предка**. Пока контейнер на экране — шапка приклеена. Как только нижний край контейнера уезжает вверх, элемент уезжает вместе с ним. То есть sticky «живёт» только внутри границ своего родителя.

### Почему «не липнет» — частые причины

1. **Не задан порог.** Без \`top\` (или другой стороны) sticky вообще не активируется. Это самая частая ошибка — просто забыли \`top: 0\`.
2. **Overflow у предка.** Любой предок со свойством \`overflow: hidden\`, \`auto\` или \`scroll\` становится **скролл-контейнером** для sticky-элемента, и порог отсчитывается от него. Если этот контейнер сам не прокручивается, прилипание визуально пропадает. У \`overflow: clip\` — особое поведение.
3. **Высота контейнера.** Sticky работает только в пределах высоты родителя. Если родитель ровно такой же высоты, как сам элемент, то «липнуть» просто некуда — нет запаса для движения.
4. **\`display\` родителя.** Во \`flex\`- или \`grid\`-контейнере поведение зависит от выравнивания: растянутый по высоте ребёнок может не оставить себе места для прилипания.

### Стекинг и z-index

Sticky-элемент создаёт собственный **позиционный контекст**. Когда он наезжает на соседний контент, задай ему \`z-index\`, иначе следующий контент может перекрыть «прилипшую» шапку сверху.

Важная тонкость: если какой-то предок создаёт **stacking context** (контекст наложения) — а это делают свойства \`transform\`, \`filter\`, \`will-change\`, \`opacity < 1\` — то \`z-index\` sticky-элемента ограничен рамками этого контекста и не сможет «вылезти» выше него.

### Производительность

Хорошая новость: в современных браузерах sticky обрабатывается на **compositor thread** (потоке композитора, отдельно от основного). Это значит, что скролл остаётся плавным — браузеру не нужно пересчитывать раскладку (layout) на каждый кадр. Но не злоупотребляй: много sticky-элементов с тяжёлой отрисовкой (paint) всё равно могут тормозить. Проверяй в DevTools (вкладки Layers или Rendering → Scrolling performance).

## ⚠️ Подводные камни

- Забыть порог (\`top\`/\`bottom\`/...) — sticky молча ничего не делает.
- Не заметить, что предок с \`overflow\` перехватил роль скролл-контейнера.
- Родитель по высоте равен элементу — двигаться некуда, эффекта нет.
- \`transform\` на предке ломает не только z-index, но иногда и само прилипание.
- Прозрачный фон у «прилипшей» шапки — строки будут просвечивать сквозь неё; сделай фон непрозрачным.

## 🎯 Запомни

- Sticky = \`relative\` до порога, потом «приклеен» к краю, но только внутри своего контейнера-предка.
- Нет порога (\`top\`/\`bottom\`/...) — нет прилипания; это ошибка №1.
- Любой предок с \`overflow\` становится скролл-контейнером и меняет точку отсчёта.
- Давай sticky \`z-index\` и непрозрачный фон; помни, что \`transform\`/\`filter\` у предка запирают z-index в своём stacking context.`,
      en: `## 🧩 In plain words

\`position: sticky\` is a hybrid: the element behaves like a normal one (sitting in its place in the flow) until you scroll to a certain point, and then it "sticks" to an edge of the screen and rides along with the scroll. The classic example is a table header that stays on top while you scroll through rows. It sounds simple, but sticky often "won't stick" for non-obvious reasons — let's unpack the mechanics and the common traps.

### How sticky actually works

A sticky element behaves like \`position: relative\` — it stays in its place — **until its threshold is reached**. The threshold is \`top\`, \`bottom\`, \`left\` or \`right\`, e.g. \`top: 0\`. When the element scrolls up to that edge, it "sticks" to it and stays in view.

The key detail: the element **never leaves its containing ancestor**. As long as the container is on screen, the header stays glued. As soon as the container's bottom edge scrolls up, the element rides away with it. In other words, sticky "lives" only within the bounds of its parent.

### Why it "won't stick" — common causes

1. **No threshold set.** Without \`top\` (or another side) sticky never activates at all. This is the most common mistake — you simply forgot \`top: 0\`.
2. **Ancestor overflow.** Any ancestor with \`overflow: hidden\`, \`auto\` or \`scroll\` becomes the **scroll container** for the sticky element, and the threshold is measured against it. If that container doesn't itself scroll, the sticking visually disappears. \`overflow: clip\` has special behavior.
3. **Container height.** Sticky only works within the parent's height. If the parent is exactly as tall as the element, there's simply nowhere to stick — no room to move.
4. **Parent \`display\`.** In a \`flex\` or \`grid\` container the behavior depends on alignment: a child stretched to full height may leave no room to stick.

### Stacking and z-index

A sticky element creates its own **positioned context**. When it overlaps neighboring content, give it a \`z-index\`, or following content may cover the "stuck" header from above.

An important subtlety: if some ancestor creates a **stacking context** — and \`transform\`, \`filter\`, \`will-change\`, \`opacity < 1\` all do — then the sticky element's \`z-index\` is confined within that context and cannot "climb" above it.

### Performance

Good news: in modern browsers sticky is handled on the **compositor thread** (separate from the main thread). That means scrolling stays smooth — the browser doesn't need to recompute layout on every frame. But don't overdo it: many sticky elements with heavy paint can still stutter. Check in DevTools (the Layers tab or Rendering → Scrolling performance).

## ⚠️ Common pitfalls

- Forgetting the threshold (\`top\`/\`bottom\`/...) — sticky silently does nothing.
- Not noticing that an ancestor with \`overflow\` hijacked the scroll-container role.
- Parent is the same height as the element — nowhere to move, no effect.
- A \`transform\` on an ancestor breaks not only z-index but sometimes the sticking itself.
- A transparent background on the "stuck" header — rows will show through it; make the background opaque.

## 🎯 Key takeaways

- Sticky = \`relative\` until the threshold, then "glued" to an edge, but only within its containing ancestor.
- No threshold (\`top\`/\`bottom\`/...) means no sticking; that's mistake #1.
- Any ancestor with \`overflow\` becomes the scroll container and changes the reference point.
- Give sticky a \`z-index\` and an opaque background; remember that \`transform\`/\`filter\` on an ancestor trap the z-index inside their stacking context.`
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
      ru: `## 🧩 Простыми словами

Веб-шрифт — это отдельный файл, который браузер должен скачать, прежде чем показать текст «красивым». Пока он грузится, у нас два зла: либо текст не виден вовсе, либо он вдруг «прыгает», когда системный шрифт подменяется на кастомный (это и есть скачок раскладки, CLS). Задача — сделать шрифт лёгким, загрузить его рано и подменить без единого прыжка. Разберём все рычаги по порядку.

### Немного терминов

- **FCP** (First Contentful Paint) — момент, когда пользователь впервые видит хоть какой-то текст/контент. Тяжёлые шрифты его задерживают.
- **CLS** (Cumulative Layout Shift) — суммарная «дёрганость» раскладки. Цель — меньше 0.1.
- **Глиф** — начертание одного символа в шрифте.

### Как уменьшить вес шрифта

- **Сабсеттинг** — вырезать неиспользуемые глифы. Например, оставить только латиницу и выбросить кириллицу, иероглифы, редкие символы. Свойство \`unicode-range\` в правиле \`@font-face\` говорит браузеру качать сабсет (подмножество) **только если на странице реально встречаются нужные символы**.
- **Вариативные шрифты** (variable fonts) — один файл вместо 4–8 отдельных начертаний. Внутри есть «оси» вроде \`wght\` (жирность) или \`slnt\` (наклон), которыми управляют через \`font-weight\` или \`font-variation-settings\`. Экономят и запросы, и байты, если вы используете больше двух начертаний.
- **WOFF2** — формат со сжатием brotli, примерно на 30% меньше старого WOFF. Всегда указывайте его первым в \`src\`.

### Ранняя загрузка

\`\`\`html
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
\`\`\`

\`preload\` просит браузер начать качать шрифт как можно раньше, не дожидаясь, пока до него дойдёт CSS. Атрибут \`crossorigin\` здесь **обязателен** — шрифты всегда грузятся в анонимном режиме, и без него браузер скачает файл дважды. Ещё \`preconnect\` к хосту шрифтов заранее устанавливает соединение и сокращает RTT (время туда-обратно до сервера).

### \`font-display\` и борьба с CLS

Свойство \`font-display\` управляет тем, что показывать, пока шрифт грузится:
- \`font-display: swap\` — сразу показать текст системным шрифтом, потом подменить на кастомный. Минус — **FOUT** (Flash Of Unstyled Text, вспышка нестилизованного текста) и скачок, если метрики шрифтов не совпадают.
- \`font-display: optional\` — без скачков на медленных сетях: браузер вправе вообще не применять кастомный шрифт, если тот не успел. Лучший выбор именно по CLS.

Самый современный рецепт «бесшовной» подмены — подогнать метрики запасного шрифта под кастомный. В отдельном \`@font-face\` для **fallback-шрифта** (запасного) задают:
- \`size-adjust\` — масштаб глифов,
- \`ascent-override\` / \`descent-override\` — высоту над и под базовой линией.

Когда метрики системного и кастомного шрифтов совпадают, подмена происходит **без единого сдвига пикселей** (нулевой layout shift).

Измеряйте CLS через Lighthouse или \`PerformanceObserver\`; цель — меньше 0.1.

### Как это выглядит вместе

\`\`\`css
/* Вариативный шрифт + сабсет по unicode-range */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2-variations');
  font-weight: 100 900;           /* один файл покрывает весь диапазон жирности */
  font-display: optional;         /* лучший вариант по CLS */
  unicode-range: U+0000-00FF;     /* только латиница */
}

/* Fallback с подогнанными метриками => бесшовная подмена, без сдвига */
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  ascent-override: 90%;
  descent-override: 22%;
  size-adjust: 107%;
}

body { font-family: 'Inter', 'Inter Fallback', sans-serif; }
\`\`\`

Здесь \`Inter\` грузится с диска, а пока его нет — рисуется \`Inter Fallback\` (по сути Arial, но с точно подогнанными пропорциями), поэтому в момент подмены текст не прыгает.

## ⚠️ Подводные камни

- Забыть \`crossorigin\` в \`preload\` шрифта — файл скачается дважды.
- \`font-display: swap\` без подогнанных метрик fallback даёт заметный скачок текста.
- Прелоадить слишком много начертаний — конкурируют за пропускную способность и тормозят более важные ресурсы.
- Вариативный шрифт выгоден не всегда: если вы используете 1–2 начертания, отдельные статические файлы могут быть легче.

## 🎯 Запомни

- Меньше байт: сабсеттинг + \`unicode-range\`, вариативные шрифты, WOFF2 первым в \`src\`.
- Раньше грузить: \`preload\` с обязательным \`crossorigin\` и \`preconnect\` к хосту.
- \`font-display: optional\` — лучший выбор по CLS; \`swap\` требует подгонки метрик.
- Бесшовная подмена = fallback \`@font-face\` с \`size-adjust\`/\`ascent-override\`/\`descent-override\`; цель CLS < 0.1.`,
      en: `## 🧩 In plain words

A web font is a separate file the browser must download before it can show text "the pretty way". While it loads, we face two evils: either the text isn't visible at all, or it suddenly "jumps" when the system font is swapped for the custom one (that jump is layout shift, CLS). The goal is to make the font light, load it early, and swap it in without a single jump. Let's go through all the levers in order.

### A few terms

- **FCP** (First Contentful Paint) — the moment the user first sees any text/content. Heavy fonts delay it.
- **CLS** (Cumulative Layout Shift) — the total "jerkiness" of the layout. Target: below 0.1.
- **Glyph** — the drawn shape of a single character in a font.

### How to reduce font weight

- **Subsetting** — strip unused glyphs. For example, keep only Latin and drop Cyrillic, CJK, rare symbols. The \`unicode-range\` property in a \`@font-face\` rule tells the browser to download a subset **only if the page actually contains the matching characters**.
- **Variable fonts** — one file instead of 4–8 separate weights. Inside there are "axes" like \`wght\` (weight) or \`slnt\` (slant), controlled via \`font-weight\` or \`font-variation-settings\`. They save both requests and bytes if you use more than two weights.
- **WOFF2** — a brotli-compressed format, about 30% smaller than the older WOFF. Always list it first in \`src\`.

### Early loading

\`\`\`html
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
\`\`\`

\`preload\` asks the browser to start downloading the font as early as possible, without waiting for the CSS to reference it. The \`crossorigin\` attribute here is **mandatory** — fonts always fetch in anonymous mode, and without it the browser downloads the file twice. Also, \`preconnect\` to the font host opens the connection ahead of time and cuts RTT (round-trip time to the server).

### \`font-display\` and fighting CLS

The \`font-display\` property controls what to show while the font loads:
- \`font-display: swap\` — show text immediately in a system font, then swap to the custom one. Downside — **FOUT** (Flash Of Unstyled Text) and a jump if the fonts' metrics differ.
- \`font-display: optional\` — no jumps on slow networks: the browser is allowed to skip the custom font entirely if it didn't arrive in time. The best choice specifically for CLS.

The most modern recipe for a "seamless" swap is to tune the fallback font's metrics to match the custom one. In a separate \`@font-face\` for the **fallback font** you set:
- \`size-adjust\` — glyph scale,
- \`ascent-override\` / \`descent-override\` — the height above and below the baseline.

When the system and custom fonts' metrics match, the swap happens **without a single pixel of shift** (zero layout shift).

Measure CLS with Lighthouse or \`PerformanceObserver\`; target below 0.1.

### How it looks together

\`\`\`css
/* Variable font + subset by unicode-range */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2-variations');
  font-weight: 100 900;           /* one file covers the whole weight range */
  font-display: optional;         /* best for CLS */
  unicode-range: U+0000-00FF;     /* Latin only */
}

/* Metric-matched fallback => seamless swap, no shift */
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  ascent-override: 90%;
  descent-override: 22%;
  size-adjust: 107%;
}

body { font-family: 'Inter', 'Inter Fallback', sans-serif; }
\`\`\`

Here \`Inter\` loads from disk, and while it's missing, \`Inter Fallback\` is drawn (basically Arial, but with precisely tuned proportions), so at the moment of the swap the text doesn't jump.

## ⚠️ Common pitfalls

- Forgetting \`crossorigin\` on a font \`preload\` — the file downloads twice.
- \`font-display: swap\` without tuned fallback metrics gives a noticeable text jump.
- Preloading too many weights — they compete for bandwidth and slow down more important resources.
- A variable font isn't always a win: if you use 1–2 weights, separate static files may be lighter.

## 🎯 Key takeaways

- Fewer bytes: subsetting + \`unicode-range\`, variable fonts, WOFF2 first in \`src\`.
- Load earlier: \`preload\` with mandatory \`crossorigin\`, plus \`preconnect\` to the host.
- \`font-display: optional\` is the best choice for CLS; \`swap\` needs metric tuning.
- Seamless swap = a fallback \`@font-face\` with \`size-adjust\`/\`ascent-override\`/\`descent-override\`; target CLS < 0.1.`
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
      ru: `## 🧩 Простыми словами

Представь трубу, по которой браузер и сервер обмениваются данными. HTTP/2 научился гнать по одной трубе много запросов сразу, но у него осталась ахиллесова пята: если в трубе застрял один пакет, ждут все. HTTP/3 меняет саму трубу (переходит с TCP на QUIC), и одна «пробка» больше не тормозит остальных. А gzip и brotli — это два способа сжать данные перед отправкой, чтобы по трубе ехало меньше байт. Разберём по порядку.

### HTTP/2: что умеет

- **Мультиплексирование** — много запросов внутри **одного** TCP-соединения через независимые **потоки (streams)**. Данные режутся на бинарные фреймы. Это убрало костыли HTTP/1.1 вроде домен-шардинга и спрайтов (склейки картинок в одну).
- **HPACK** — сжатие HTTP-заголовков.
- **Server Push** — сервер мог сам «подтолкнуть» ресурс, не дожидаясь запроса. На практике устарел и удалён — плохо дружил с кэшем.

**Главная проблема HTTP/2:** потоки логически независимы, но едут поверх **одного TCP-соединения**. TCP гарантирует строгий порядок пакетов, поэтому потеря **одного** пакета останавливает **все** потоки сразу. Это называется **head-of-line blocking (HOL)** — «блокировка головы очереди» — на транспортном уровне.

### HTTP/3: чем лучше

- Работает поверх **QUIC** (протокол на базе UDP), а не TCP. У каждого потока **собственный контроль потерь**: потеря пакета в одном потоке **не блокирует** остальные. Транспортный HOL blocking устранён — это главный выигрыш.
- **Быстрое рукопожатие (0-RTT / 1-RTT).** TLS 1.3 встроен прямо в QUIC, поэтому установка соединения быстрее, особенно при возобновлении ранее открытого соединения.
- **Connection migration** — соединение переживает смену сети (Wi-Fi → LTE) благодаря Connection ID, без нового рукопожатия. Удобно на мобильных.

### Приоритизация

Приоритизация — это способ сказать серверу, что важнее отдать первым. В HTTP/2 было сложное «дерево зависимостей», которое часто реализовывали криво. HTTP/3 использует более простую схему **Extensible Priorities**: два параметра — \`urgency\` (срочность) и \`incremental\` — передаются через заголовок/фрейм. Так браузер сигналит, какие ресурсы важны для LCP (Largest Contentful Paint, отрисовка главного элемента).

### gzip против brotli

И gzip, и brotli — алгоритмы сжатия текста (HTML, CSS, JS) перед отправкой по сети:
- **gzip** (на базе DEFLATE) — универсальный, быстрый, но сжимает слабее.
- **brotli** (заголовок \`Content-Encoding: br\`) — использует встроенный статический словарь, заточенный под веб-текст. На высоких уровнях даёт файлы на **15–25% меньше**, чем gzip.

Практика:
- Для **статики** сжимайте заранее, на этапе сборки, **максимальным уровнем (11)** — цену платите один раз.
- Для **динамики** (ответы, генерируемые на лету) берите уровень 4–5 — баланс между нагрузкой на CPU и задержкой.
- Всегда отдавайте brotli с откатом на gzip, ориентируясь на заголовок запроса \`Accept-Encoding\` (в нём клиент перечисляет, что понимает).

### Как это настраивается (Nginx)

\`\`\`nginx
# Отдаём заранее сжатые файлы, договариваясь через Accept-Encoding
brotli_static on;          # отдать file.br, собранный при деплое (уровень 11)
gzip_static  on;           # откат на gzip

# Помечаем неизменяемые ассеты с хэшем в имени — кэш пропускает ревалидацию
location ~* \\.[0-9a-f]{8}\\.(js|css|woff2)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# Проверить согласованный протокол/сжатие со стороны клиента:
# curl -I --http3 https://example.com/app.js
#   HTTP/3 200
#   content-encoding: br
\`\`\`

## ⚠️ Подводные камни

- Не рассчитывайте на Server Push — он фактически мёртв; используйте \`preload\`/\`103 Early Hints\`.
- HTTP/3 работает по UDP, который иногда режут корпоративные фаерволы — нужен откат на HTTP/2.
- Сжимать динамику уровнем 11 — дорого по CPU и добавляет задержку; это только для статики.
- Не сжимайте уже сжатое (картинки JPEG/PNG, видео) — выигрыша нет, только трата CPU.

## 🎯 Запомни

- HTTP/2 мультиплексирует поверх одного TCP → одна потеря пакета блокирует все потоки (транспортный HOL blocking).
- HTTP/3 поверх QUIC/UDP: у каждого потока свой контроль потерь, быстрое рукопожатие и переживание смены сети.
- brotli сжимает веб-текст на 15–25% лучше gzip; статику жмите уровнем 11 заранее, динамику — 4–5.
- Всегда отдавайте brotli с фолбэком на gzip через \`Accept-Encoding\`.`,
      en: `## 🧩 In plain words

Picture a pipe through which the browser and server exchange data. HTTP/2 learned to push many requests through one pipe at once, but it kept an Achilles' heel: if one packet gets stuck in the pipe, everyone waits. HTTP/3 changes the pipe itself (moving from TCP to QUIC), so one "traffic jam" no longer stalls the others. And gzip and brotli are two ways to compress data before sending, so fewer bytes travel through the pipe. Let's go through it in order.

### HTTP/2: what it can do

- **Multiplexing** — many requests inside **one** TCP connection via independent **streams**. Data is cut into binary frames. This removed HTTP/1.1 hacks like domain sharding and sprites (gluing images into one).
- **HPACK** — HTTP header compression.
- **Server Push** — the server could "push" a resource without waiting for a request. In practice it's deprecated and removed — it interacted poorly with caching.

**HTTP/2's main problem:** streams are logically independent, but they ride over **a single TCP connection**. TCP guarantees strict packet order, so losing **one** packet stalls **all** streams at once. This is called **head-of-line blocking (HOL)** at the transport layer.

### HTTP/3: what's better

- Runs over **QUIC** (a protocol built on UDP), not TCP. Each stream has its **own loss recovery**: a lost packet in one stream **does not block** the others. Transport HOL blocking is eliminated — that's the main win.
- **Fast handshake (0-RTT / 1-RTT).** TLS 1.3 is built right into QUIC, so connection setup is faster, especially when resuming a previously opened connection.
- **Connection migration** — the connection survives a network change (Wi-Fi → LTE) thanks to the Connection ID, with no new handshake. Handy on mobile.

### Prioritization

Prioritization is a way to tell the server what to send first. HTTP/2 had a complex "dependency tree" that was often implemented poorly. HTTP/3 uses the simpler **Extensible Priorities** scheme: two parameters — \`urgency\` and \`incremental\` — passed via a header/frame. This lets the browser signal which resources matter for LCP (Largest Contentful Paint, the main element's render).

### gzip vs brotli

Both gzip and brotli are algorithms for compressing text (HTML, CSS, JS) before sending it over the network:
- **gzip** (based on DEFLATE) — universal, fast, but compresses less.
- **brotli** (header \`Content-Encoding: br\`) — uses a built-in static dictionary tuned for web text. At high levels it produces files **15–25% smaller** than gzip.

Practice:
- For **static assets**, compress ahead of time, at build stage, at the **maximum level (11)** — you pay the cost once.
- For **dynamic responses** (generated on the fly), use level 4–5 — a balance between CPU load and latency.
- Always serve brotli with a gzip fallback, based on the request's \`Accept-Encoding\` header (where the client lists what it understands).

### How it's configured (Nginx)

\`\`\`nginx
# Serve precompressed files, negotiating via Accept-Encoding
brotli_static on;          # serve file.br built at deploy time (level 11)
gzip_static  on;           # gzip fallback

# Mark immutable, content-hashed assets — cache skips revalidation
location ~* \\.[0-9a-f]{8}\\.(js|css|woff2)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# Check the negotiated protocol/encoding from the client side:
# curl -I --http3 https://example.com/app.js
#   HTTP/3 200
#   content-encoding: br
\`\`\`

## ⚠️ Common pitfalls

- Don't rely on Server Push — it's effectively dead; use \`preload\`/\`103 Early Hints\`.
- HTTP/3 runs over UDP, which corporate firewalls sometimes block — you need a fallback to HTTP/2.
- Compressing dynamic responses at level 11 is expensive on CPU and adds latency; that's for static only.
- Don't compress already-compressed data (JPEG/PNG images, video) — no gain, just wasted CPU.

## 🎯 Key takeaways

- HTTP/2 multiplexes over one TCP → one lost packet blocks all streams (transport HOL blocking).
- HTTP/3 over QUIC/UDP: each stream has its own loss recovery, a fast handshake, and survives network changes.
- brotli compresses web text 15–25% better than gzip; compress static at level 11 ahead of time, dynamic at 4–5.
- Always serve brotli with a gzip fallback via \`Accept-Encoding\`.`
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
      ru: `## 🧩 Простыми словами

Представь, что главный поток браузера (main thread) — это единственный кассир в магазине. Он обслуживает один запрос за раз: и рисует страницу, и реагирует на твои клики. Если ты дашь ему одну огромную задачу, он «зависнет» на ней и не заметит, что рядом стоит покупатель с кликом. **INP** — это как раз замер того, насколько долго покупатель ждёт реакции. Секрет плавности — не грузить кассира одной гигантской задачей, а разбивать работу на маленькие кусочки и время от времени спрашивать: «Есть кто в очереди?»

### Что такое INP

**INP (Interaction to Next Paint)** — «взаимодействие до следующей отрисовки». Это метрика, которая измеряет задержку от твоего действия (клик, тап, нажатие клавиши) до момента, когда браузер **отрисует следующий кадр** в ответ. Браузер смотрит на все взаимодействия за время жизни страницы и берёт примерно **самое худшее**. Цель — **меньше 200 мс**.

INP складывается из трёх частей:
- **input delay** — сколько ввод ждал, пока поток освободится;
- **processing time** — сколько работали твои обработчики событий;
- **presentation delay** — сколько ушло на пересчёт разметки (layout) и отрисовку (paint).

### Long tasks и TBT

**Long task (длинная задача)** — это любая работа в главном потоке дольше **50 мс**. Пока она выполняется, поток занят и физически не может обработать клик — из-за этого растёт input delay.

**TBT (Total Blocking Time)** — «суммарное время блокировки». Он складывает только «блокирующую» часть длинных задач, то есть всё, что сверх 50 мс, между FCP (первая отрисовка контента) и TTI (момент, когда страница стала интерактивной). TBT удобно мерить в лаборатории (на тесте), и он служит хорошим прогнозом для реального INP.

### Yielding — уступаем поток

Главный приём: **разбивать длинные задачи на кусочки** и «уступать» поток между ними, чтобы браузер успел вклиниться, обработать ввод и нарисовать кадр. «Уступить» (to yield) — значит на мгновение остановить свою работу и вернуть управление браузеру.

\`\`\`ts
async function yieldToMain() {
  // Современно: даёт планировщику вставить пользовательский ввод
  if ('scheduler' in window && 'yield' in (window as any).scheduler) {
    return (window as any).scheduler.yield();
  }
  return new Promise(r => setTimeout(r, 0));
}
\`\`\`

Здесь мы проверяем: есть ли у браузера современный \`scheduler.yield()\`? Если да — используем его (он умно возобновит нашу работу после того, как обработает ввод). Если нет — откатываемся на старый трюк \`setTimeout(0)\`, который тоже отпускает поток, но менее умно.

### \`isInputPending\`

\`navigator.scheduling.isInputPending()\` — это вопрос браузеру: «А есть сейчас необработанный пользовательский ввод в очереди?». Он позволяет уступать поток **только когда это реально нужно**. Ты обрабатываешь данные кусок за куском, но прерываешься лишь если кто-то кликнул. Так ты не тратишь время на бессмысленные частые остановки, когда очереди нет.

### \`scheduler.postTask\`

\`scheduler.postTask\` планирует задачи с **приоритетами**:
- \`user-blocking\` — критичное, что пользователь ждёт прямо сейчас;
- \`user-visible\` — важное, но не мгновенное;
- \`background\` — фоновое, можно и подождать.

Ещё он умеет **отменять** задачи через \`TaskController\`. Это цивилизованная замена самодельным очередям на \`setTimeout\`: критичное реагирует быстро, а фоновое не крадёт поток и его можно выкинуть, если оно больше не нужно.

\`\`\`ts
// Обрабатываем большой массив, не блокируя ввод; уступаем только при необходимости.
async function processChunked<T>(items: T[], work: (x: T) => void) {
  for (let i = 0; i < items.length; i++) {
    work(items[i]);
    // Уступаем, только если есть ожидающий ввод -> низкий оверхед
    if (navigator.scheduling?.isInputPending?.()) {
      await (window as any).scheduler?.yield?.()
        ?? new Promise(r => setTimeout(r));
    }
  }
}

// Приоритетное планирование с отменой
const controller = new TaskController({ priority: 'background' });
scheduler.postTask(() => buildSearchIndex(), { signal: controller.signal });
// Пользователь ушёл со страницы -> отбрасываем фоновую работу
controller.abort();
\`\`\`

## ⚠️ Подводные камни

- \`scheduler.yield\`, \`postTask\` и \`isInputPending\` пока поддержаны не везде — всегда пиши фолбэк (\`setTimeout\`).
- Слишком частый yield сам по себе тоже стоит времени; поэтому связка с \`isInputPending\` (уступать только при вводе) экономнее «слепого» yield на каждой итерации.
- TBT — лабораторная метрика, INP — полевая (реальные пользователи). Они коррелируют, но не равны: измеряй настоящий INP в проде через RUM.

## 🎯 Запомни

- **INP** — задержка от действия до следующего кадра, цель **< 200 мс**; **long task** — работа в потоке дольше **50 мс**, **TBT** — их «блокирующая» часть (лабораторный прокси INP).
- Лечение — **дробить длинные задачи и уступать поток** (\`scheduler.yield\` / \`setTimeout\`), уступая умно через \`isInputPending\`.
- \`scheduler.postTask\` даёт **приоритеты** и **отмену** — используй вместо ручных \`setTimeout\`-очередей.
- Тяжёлые чистые вычисления выноси в **Web Worker**, а реальный INP меряй в проде через web-vitals (RUM).`,
      en: `## 🧩 In plain words

Picture the browser's main thread as the only cashier in a shop. It handles one thing at a time: painting the page AND reacting to your clicks. If you hand it one giant task, it "freezes" on it and never notices the customer standing there with a click. **INP** measures exactly how long that customer waits for a response. The trick to smoothness is not to hand the cashier one huge task, but to slice the work into small pieces and, now and then, ask: "Anyone waiting in line?"

### What INP is

**INP (Interaction to Next Paint)** measures the delay from your action (click, tap, keypress) to the moment the browser **paints the next frame** in response. The browser looks at every interaction across the page's lifetime and reports roughly the **worst** one. Target: **under 200 ms**.

INP is made of three parts:
- **input delay** — how long the input waited for a free thread;
- **processing time** — how long your event handlers ran;
- **presentation delay** — how long layout and paint took.

### Long tasks and TBT

A **long task** is any main-thread work over **50 ms**. While it runs, the thread is busy and physically cannot handle a click — so input delay grows.

**TBT (Total Blocking Time)** sums only the "blocking" part of long tasks — everything over 50 ms — between FCP (first contentful paint) and TTI (time to interactive). TBT is easy to measure in the lab (on a test run) and is a good predictor of real-world INP.

### Yielding — giving the thread back

The core technique: **break long tasks into pieces** and "yield" the thread between them, so the browser can slip in, process input, and paint a frame. To "yield" means to briefly stop your own work and hand control back to the browser.

\`\`\`ts
async function yieldToMain() {
  // Modern: lets the scheduler interleave user input
  if ('scheduler' in window && 'yield' in (window as any).scheduler) {
    return (window as any).scheduler.yield();
  }
  return new Promise(r => setTimeout(r, 0));
}
\`\`\`

Here we check: does the browser have the modern \`scheduler.yield()\`? If so, use it (it smartly resumes our work after handling input). If not, fall back to the old \`setTimeout(0)\` trick, which also releases the thread but less cleverly.

### \`isInputPending\`

\`navigator.scheduling.isInputPending()\` is a question to the browser: "Is there any unhandled user input queued right now?" It lets you yield **only when it's actually needed**. You process data chunk by chunk, but you interrupt only if someone clicked. That way you don't waste time on pointless frequent stops when nothing is waiting.

### \`scheduler.postTask\`

\`scheduler.postTask\` schedules tasks with **priorities**:
- \`user-blocking\` — critical, something the user is waiting on right now;
- \`user-visible\` — important but not instant;
- \`background\` — can wait.

It can also **cancel** tasks via \`TaskController\`. It's a civilized replacement for homemade \`setTimeout\` queues: critical work reacts fast, background work doesn't steal the thread, and you can drop it if it's no longer needed.

\`\`\`ts
// Process a big array without blocking input; yield only when needed.
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
controller.abort();
\`\`\`

## ⚠️ Common pitfalls

- \`scheduler.yield\`, \`postTask\`, and \`isInputPending\` aren't supported everywhere yet — always write a fallback (\`setTimeout\`).
- Yielding too often costs time itself; pairing it with \`isInputPending\` (yield only when there's input) is cheaper than blindly yielding every iteration.
- TBT is a lab metric, INP is a field metric (real users). They correlate but aren't equal: measure real INP in production via RUM.

## 🎯 Key takeaways

- **INP** — delay from action to next frame, target **< 200 ms**; a **long task** is thread work over **50 ms**, and **TBT** is their "blocking" part (a lab proxy for INP).
- The cure is **breaking up long tasks and yielding the thread** (\`scheduler.yield\` / \`setTimeout\`), yielding smartly via \`isInputPending\`.
- \`scheduler.postTask\` gives you **priorities** and **cancellation** — use it instead of hand-rolled \`setTimeout\` queues.
- Move heavy pure computation to a **Web Worker**, and measure real INP in production via web-vitals (RUM).`
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
      ru: `## 🧩 Простыми словами

Доступность (a11y) — это когда сайтом можно пользоваться не только мышкой и глазами, но и клавиатурой и скринридером (программой, которая озвучивает содержимое слепым пользователям). Представь, что кто-то ходит по странице только клавишей Tab и слушает голос. Если фокус (та рамка, что прыгает по кнопкам при Tab) убегает не туда или элемент «немой» — человек застревает. Ниже — набор приёмов, которые делают клавиатуру и голос такими же удобными, как мышь.

### Focus trap (ловушка фокуса в модалках)

Когда открыт диалог (модальное окно), фокус **не должен** уходить за его пределы — иначе пользователь клавиатуры «провалится» на фон под окном и потеряется.

Как сделать вручную:
- при открытии запомнить, какой элемент был активен;
- перевести фокус внутрь окна;
- перехватывать \`Tab\` и \`Shift+Tab\` на краях и зацикливать (с последнего элемента — на первый и наоборот);
- по \`Escape\` закрыть окно и **вернуть фокус** на кнопку, которая его открыла.

Хорошая новость: нативный \`<dialog>\` с методом \`showModal()\` делает и ловушку фокуса, и «замораживание» (inert) фона автоматически. По возможности предпочитай его.

### Roving tabindex («кочующий» tabindex)

\`tabindex\` — атрибут, управляющий порядком обхода по Tab. Для составных виджетов (тулбар, вкладки, меню, грид) неудобно, если каждая кнопка — отдельная остановка Tab. Паттерн **roving tabindex**: в Tab-порядке находится **только один** элемент (\`tabindex="0"\`), все остальные — \`tabindex="-1"\` (недостижимы по Tab, но фокусируемы кодом). Внутри виджета перемещаемся **стрелками**, «перенося» активный \`tabindex="0"\` на текущий элемент.

Это рекомендация **APG (ARIA Authoring Practices Guide)** — она совпадает с тем, чего ждут скринридеры.

### Live regions (живые области)

**Live region** — область, изменения в которой скринридер озвучивает автоматически, **не перемещая фокус**. Управляется атрибутом \`aria-live\`:
- \`aria-live="polite"\` — «вежливо», объявит, дождавшись паузы в речи;
- \`aria-live="assertive"\` — «настойчиво», прервёт текущую речь.

Это для тостов, статусов загрузки, результатов поиска. Важно: область должна существовать в DOM **заранее** — если создать её и сразу наполнить, первое обновление может не объявиться. Короткие роли: \`role="status"\` = polite, \`role="alert"\` = assertive.

### Skip links (ссылки-пропуски)

**Skip link** — первая фокусируемая ссылка «Skip to content» («Перейти к содержимому»), визуально скрытая, пока на неё не встал фокус. Она позволяет клавиатурным пользователям одним нажатием перепрыгнуть длинное меню и попасть сразу к контенту. Это требование WCAG 2.4.1.

### Вычисление accessible name (доступного имени)

**Accessible name** — то «имя», которым скринридер называет элемент. Браузер вычисляет его по приоритету (первое найденное побеждает):
1. \`aria-labelledby\` (ссылка на id другого элемента с текстом);
2. \`aria-label\` (текст прямо в атрибуте);
3. нативная подпись — \`<label>\` для поля, \`alt\` у картинки, текст внутри кнопки;
4. \`title\`.

Понимание этого порядка спасает от классических багов вроде «кнопка без имени». Проверяй результат во вкладке Accessibility (дерево доступности) в DevTools и линтером axe.

\`\`\`html
<!-- Skip link: скрыт, пока не в фокусе -->
<a href="#main" class="skip-link">Skip to content</a>

<!-- Вкладки с roving tabindex (по Tab доступна только активная) -->
<div role="tablist">
  <button role="tab" aria-selected="true"  tabindex="0">Overview</button>
  <button role="tab" aria-selected="false" tabindex="-1">Details</button>
</div>

<!-- Заранее созданная live region озвучивает асинхронные результаты вежливо -->
<div role="status" aria-live="polite" id="search-status"></div>

<!-- Нативная модалка: ловушка фокуса + inert-фон бесплатно -->
<dialog id="dlg">
  <h2 id="dlg-title">Settings</h2>
  <button aria-labelledby="dlg-title">Save</button>
</dialog>
<style>.skip-link{position:absolute;left:-999px}.skip-link:focus{left:1rem}</style>
\`\`\`

В коде видно всё вместе: skip-ссылка прячется за экран через \`left:-999px\` и «выезжает» при \`:focus\`; у вкладок только одна имеет \`tabindex="0"\`; live region заранее лежит в DOM пустой; нативный \`<dialog>\` берёт на себя ловушку фокуса.

### Уровни WCAG

WCAG (стандарт доступности) имеет уровни: **A** (минимум), **AA** (целевой, юридический стандарт во многих странах), **AAA** (самый строгий). Контраст обычного текста по AA — **4.5:1**, для крупного текста — **3:1**.

## ⚠️ Подводные камни

- Live region, созданная и наполненная в один момент, часто не объявляет первое сообщение — держи её в DOM пустой заранее.
- Забыли вернуть фокус на триггер после закрытия модалки — пользователь клавиатуры теряет место.
- \`assertive\` прерывает речь — используй его только для важного (ошибки), для остального \`polite\`.
- Кнопка-иконка без текста и без \`aria-label\` получается «немой» — всегда задавай доступное имя.

## 🎯 Запомни

- **Focus trap**: держи фокус внутри модалки и возвращай на триггер; нативный \`<dialog showModal()>\` делает это сам.
- **Roving tabindex**: один \`tabindex="0"\`, остальные \`-1\`, навигация стрелками — паттерн APG для составных виджетов.
- **Live regions**: \`polite\`/\`assertive\` озвучивают изменения без сдвига фокуса; область должна быть в DOM заранее.
- **Accessible name** вычисляется по приоритету \`aria-labelledby\` → \`aria-label\` → нативная подпись → \`title\`; проверяй в DevTools и axe.`,
      en: `## 🧩 In plain words

Accessibility (a11y) means a site works not only with a mouse and eyes, but also with a keyboard and a screen reader (software that reads content aloud to blind users). Picture someone moving through the page using only the Tab key while listening to a voice. If focus (the outline that jumps between buttons on Tab) runs off to the wrong place, or an element is "mute," that person gets stuck. Below are the techniques that make the keyboard and the voice as convenient as the mouse.

### Focus trap (in modals)

While a dialog (modal window) is open, focus **must not** escape it — otherwise a keyboard user "falls through" onto the background behind the window and gets lost.

How to do it by hand:
- on open, remember which element was active;
- move focus inside the window;
- intercept \`Tab\` and \`Shift+Tab\` at the edges and wrap around (from the last element back to the first, and vice versa);
- on \`Escape\`, close the window and **restore focus** to the button that opened it.

Good news: the native \`<dialog>\` with \`showModal()\` provides both the focus trap and an inert (frozen) background automatically. Prefer it when you can.

### Roving tabindex

\`tabindex\` is an attribute that controls Tab order. For composite widgets (toolbar, tabs, menu, grid) it's awkward if every button is its own Tab stop. The **roving tabindex** pattern: only **one** element is in the Tab order (\`tabindex="0"\`); all the rest are \`tabindex="-1"\` (unreachable by Tab, but focusable via code). Inside the widget you move with the **arrow keys**, "carrying" the active \`tabindex="0"\` onto the current element.

This is the **APG (ARIA Authoring Practices Guide)** pattern — it matches what screen readers expect.

### Live regions

A **live region** is an area whose changes a screen reader announces automatically, **without moving focus**. It's controlled by the \`aria-live\` attribute:
- \`aria-live="polite"\` — announces after waiting for a pause in speech;
- \`aria-live="assertive"\` — interrupts the current speech.

Use it for toasts, loading status, search results. Important: the region must exist in the DOM **beforehand** — if you create it and fill it at the same instant, the first update may not be announced. Shorthand roles: \`role="status"\` = polite, \`role="alert"\` = assertive.

### Skip links

A **skip link** is a first focusable "Skip to content" link, visually hidden until it receives focus. It lets keyboard users jump past a long menu in one keystroke and land straight on the content. This is WCAG requirement 2.4.1.

### Accessible name computation

An **accessible name** is the "name" a screen reader uses to announce an element. The browser computes it by priority (first match wins):
1. \`aria-labelledby\` (references the id of another element with text);
2. \`aria-label\` (text right in the attribute);
3. the native label — \`<label>\` for a field, \`alt\` on an image, text inside a button;
4. \`title\`.

Knowing this order saves you from the classic "button with no name" bug. Verify the result in the Accessibility tab (accessibility tree) in DevTools and with the axe linter.

\`\`\`html
<!-- Skip link: hidden until focused -->
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
<style>.skip-link{position:absolute;left:-999px}.skip-link:focus{left:1rem}</style>
\`\`\`

The code shows it all together: the skip link hides off-screen via \`left:-999px\` and slides in on \`:focus\`; only one tab has \`tabindex="0"\`; the live region sits empty in the DOM ahead of time; the native \`<dialog>\` handles the focus trap for you.

### WCAG levels

WCAG (the accessibility standard) has levels: **A** (minimum), **AA** (target, the legal standard in many countries), **AAA** (strictest). AA contrast for normal text is **4.5:1**, and for large text **3:1**.

## ⚠️ Common pitfalls

- A live region created and filled in the same moment often fails to announce the first message — keep it empty in the DOM beforehand.
- Forgetting to restore focus to the trigger after closing a modal leaves the keyboard user stranded.
- \`assertive\` interrupts speech — use it only for important things (errors); use \`polite\` for everything else.
- An icon button with no text and no \`aria-label\` ends up "mute" — always give it an accessible name.

## 🎯 Key takeaways

- **Focus trap**: keep focus inside the modal and restore it to the trigger; native \`<dialog showModal()>\` does this for you.
- **Roving tabindex**: one \`tabindex="0"\`, the rest \`-1\`, arrow-key navigation — the APG pattern for composite widgets.
- **Live regions**: \`polite\`/\`assertive\` announce changes without moving focus; the region must be in the DOM beforehand.
- **Accessible name** is computed by priority \`aria-labelledby\` → \`aria-label\` → native label → \`title\`; verify in DevTools and axe.`
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
      ru: `## 🧩 Простыми словами

У браузера есть один главный поток (main thread), который делает почти всё: считает, рисует, реагирует на клики. Если нагрузить его тяжёлой работой, интерфейс «замирает». Решение как в жизни: часть работы отдать **помощнику в соседней комнате** (Web Worker), чтобы главный поток остался свободным для реакции на пользователя. А ещё — не заставлять браузер повторно «оживлять» всю страницу сразу, а оживлять только те кусочки, что реально интерактивны.

## Разгрузка main thread

### Web Workers

**Web Worker** — это скрипт, который исполняется в **отдельном потоке**, параллельно главному, и потому не блокирует UI. Отлично подходит для парсинга больших JSON, шифрования, обработки изображений, вычисления диффов.

Общение с воркером идёт через \`postMessage\`. По умолчанию данные **копируются** (структурное клонирование). Но есть **Transferable-объекты** (например, \`ArrayBuffer\` — сырой блок байтов): их можно **передать без копирования** (zero-copy) — владение просто переходит воркеру. Для больших буферов это критично: копировать десятки мегабайт дорого. Библиотеки вроде Comlink прячут ручной месседжинг за удобным async-прокси.

\`\`\`ts
const buf = new ArrayBuffer(1e7);
worker.postMessage(buf, [buf]); // передача владения, без копии
\`\`\`

Второй аргумент \`[buf]\` — список передаваемых объектов. После этой строки \`buf\` в главном потоке становится «пустым» (владение ушло воркеру), зато копирования 10 МБ не произошло.

### OffscreenCanvas

**OffscreenCanvas** позволяет рисовать на канвасе **прямо из воркера**. Вся отрисовка (WebGL или 2D) уходит с главного потока — скролл и ввод остаются плавными, даже если рендер тяжёлый. Канвас «отдаётся» воркеру методом \`transferControlToOffscreen()\`. Идеально для тяжёлых дашбордов, графиков и визуализаций.

\`\`\`ts
// main.ts — переносим отрисовку И тяжёлый буфер в воркер, zero-copy
const canvas = document.querySelector('canvas')!;
const offscreen = canvas.transferControlToOffscreen();
const worker = new Worker(new URL('./render.worker.ts', import.meta.url), {
  type: 'module',
});

const pixels = new ArrayBuffer(4 * 1920 * 1080);
worker.postMessage(
  { canvas: offscreen, pixels },
  [offscreen, pixels], // Transferables: владение переходит, без копии structured-clone
);

// render.worker.ts
self.onmessage = (e: MessageEvent) => {
  const ctx = e.data.canvas.getContext('2d');
  // ...рисуем кадры вне главного потока; UI остаётся отзывчивым
};
\`\`\`

## Стратегии гидрации

Сначала термин. **SSR (server-side rendering)** — сервер присылает готовый HTML, чтобы страница показалась быстро. **Гидрация (hydration)** — процесс, когда клиентский JS «оживляет» этот HTML: строит своё дерево компонентов и навешивает обработчики событий, чтобы кнопки заработали.

- **Классическая гидрация**: клиент **заново** строит всё дерево и вешает обработчики на **всё подряд** — дорого и блокирует поток (плохие INP/TBT).
- **Partial / progressive hydration (частичная/поэтапная)**: оживляют только нужные части, по приоритету или по мере появления в зоне видимости.
- **Islands (острова, подход Astro)**: страница — в основном статичный HTML, а интерактивные «острова» оживляются изолированно и лениво (\`client:visible\` — когда видим, \`client:idle\` — когда браузер свободен). Резко снижает объём клиентского JS.
- **Resumability (возобновляемость, подход Qwik)**: вместо повторного исполнения кода ради навешивания слушателей фреймворк **сериализует состояние и обработчики прямо в HTML** и **возобновляет** работу по первому событию. Гидрация почти нулевая, JS подгружается лениво в момент взаимодействия. Это сжимает TBT почти до нуля.

**Вывод**: тяжёлые вычисления → Web Worker / OffscreenCanvas; интерактивность → дробить и откладывать гидрацию (islands / resumability), измеряя INP и TBT в проде через RUM.

## ⚠️ Подводные камни

- После \`postMessage(buf, [buf])\` буфер в отправителе становится недоступным (detached) — не пытайся читать его дальше в главном потоке.
- В воркере нет доступа к DOM и \`window\` — только к тому, что дают воркеру (\`self\`, сеть, вычисления).
- \`transferControlToOffscreen()\` можно вызвать у канваса лишь один раз — дальше главный поток им уже не управляет.
- Излишняя частая пересылка мелких сообщений в воркер съедает выигрыш — передавай крупными пачками.

## 🎯 Запомни

- **Web Worker** уносит тяжёлые вычисления в отдельный поток; **Transferable** (\`ArrayBuffer\`) передаётся zero-copy через второй аргумент \`postMessage\`.
- **OffscreenCanvas** переносит саму отрисовку в воркер — UI остаётся плавным при тяжёлом рендере.
- **Islands** оживляют только интерактивные части лениво; **resumability** (Qwik) сериализует состояние в HTML и сводит гидрацию/TBT почти к нулю.
- Правило: **вычисления → в воркер, интерактивность → дробить и откладывать**, а результат мерить по INP/TBT в проде.`,
      en: `## 🧩 In plain words

The browser has one main thread that does almost everything: it computes, paints, and reacts to clicks. Load it with heavy work and the UI "freezes." The fix is like in real life: hand part of the work to a **helper in the next room** (a Web Worker) so the main thread stays free to respond to the user. And separately: don't force the browser to "revive" the whole page at once — revive only the pieces that are actually interactive.

## Offloading the main thread

### Web Workers

A **Web Worker** is a script that runs on a **separate thread**, in parallel with the main one, so it doesn't block the UI. Great for parsing large JSON, crypto, image processing, and computing diffs.

You talk to a worker through \`postMessage\`. By default the data is **copied** (structured clone). But there are **Transferable** objects (e.g. \`ArrayBuffer\` — a raw block of bytes): they can be **moved without copying** (zero-copy) — ownership simply passes to the worker. For large buffers this is critical: copying tens of megabytes is expensive. Libraries like Comlink hide the manual messaging behind a convenient async proxy.

\`\`\`ts
const buf = new ArrayBuffer(1e7);
worker.postMessage(buf, [buf]); // transfers ownership, no copy
\`\`\`

The second argument \`[buf]\` is the list of objects to transfer. After this line \`buf\` in the main thread becomes "empty" (ownership moved to the worker), but no 10 MB copy happened.

### OffscreenCanvas

**OffscreenCanvas** lets you draw to a canvas **directly from a worker**. All rendering (WebGL or 2D) leaves the main thread — scroll and input stay smooth even when rendering is heavy. The canvas is "handed over" to the worker via \`transferControlToOffscreen()\`. Ideal for heavy dashboards, charts, and visualizations.

\`\`\`ts
// main.ts — move rendering AND a heavy buffer to a worker, zero-copy
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
};
\`\`\`

## Hydration strategies

First, a term. **SSR (server-side rendering)** means the server sends ready HTML so the page appears fast. **Hydration** is the process where the client JS "revives" that HTML: it builds its own component tree and attaches event handlers so the buttons actually work.

- **Classic hydration**: the client **re-builds** the entire tree and attaches handlers to **everything** — expensive and blocks the thread (bad INP/TBT).
- **Partial / progressive hydration**: hydrate only the needed parts, by priority or as they come into view.
- **Islands (Astro's approach)**: the page is mostly static HTML, and interactive "islands" hydrate in isolation and lazily (\`client:visible\` — when visible, \`client:idle\` — when the browser is free). Sharply reduces client JS.
- **Resumability (Qwik's approach)**: instead of re-running code to attach listeners, the framework **serializes state and handlers straight into the HTML** and **resumes** on the first event. Hydration is nearly zero, and JS is fetched lazily at the moment of interaction. This shrinks TBT to near zero.

**Takeaway**: heavy computation → Web Worker / OffscreenCanvas; interactivity → split and defer hydration (islands / resumability), measuring INP and TBT in production via RUM.

## ⚠️ Common pitfalls

- After \`postMessage(buf, [buf])\` the buffer becomes unusable (detached) in the sender — don't try to read it in the main thread afterward.
- A worker has no access to the DOM or \`window\` — only what's given to a worker (\`self\`, network, computation).
- \`transferControlToOffscreen()\` can be called on a canvas only once — after that the main thread no longer controls it.
- Sending many tiny messages to a worker eats the gains — transfer in large batches.

## 🎯 Key takeaways

- A **Web Worker** moves heavy computation to a separate thread; a **Transferable** (\`ArrayBuffer\`) is passed zero-copy via \`postMessage\`'s second argument.
- **OffscreenCanvas** moves the rendering itself into a worker — the UI stays smooth under heavy rendering.
- **Islands** hydrate only the interactive parts lazily; **resumability** (Qwik) serializes state into the HTML and brings hydration/TBT to near zero.
- Rule of thumb: **computation → to a worker, interactivity → split and defer**, and measure the result by INP/TBT in production.`
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
