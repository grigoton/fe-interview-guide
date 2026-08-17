import { InterviewQuestion } from '../interfaces/question.interface';

export const WEB_PERFORMANCE_QUESTIONS_MORE: InterviewQuestion[] = [
  {
    id: 'web-039',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['container-queries', 'modern-css', 'responsive'],
    question: {
      ru: 'Что такое container queries? Чем они отличаются от media queries и какие есть нюансы с `container-type` и производительностью?',
      en: 'What are container queries? How do they differ from media queries, and what are the nuances around `container-type` and performance?'
    },
    answer: {
      ru: `## Коротко

Media query спрашивает «какой ширины **экран**?». Container query спрашивает «какой ширины **коробка, в которой я лежу**?». Поэтому одна и та же карточка сама перестраивается и в узком сайдбаре, и в широкой основной колонке — ей не нужно знать ни одного глобального брейкпоинта.

Аналогия: диван, который меряет не размер квартиры, а размер комнаты, куда его вносят. В кладовке складывается, в гостиной раскладывается — решение принимает сам диван, а не планировка квартиры.

## Как это работает по шагам

1. Помечаем **предка** контейнером: \`container-type: inline-size\` — следим только за шириной, это дёшево. Варианты: \`size\` — обе оси, но **требует явной высоты**, иначе контент схлопнется в ноль; \`normal\` — size-запросы выключены, но style-запросы (\`@container style(--theme: dark)\`) остаются.
2. По желанию даём контейнеру имя: \`container-name: panel\`. Без имени правило матчит **ближайший** контейнер — при вложенных контейнерах это источник сюрпризов.
3. Браузер включает для этого предка **containment** (layout + style + inline-size): его внутренности больше не заставляют пересчитывать раскладку предков.
4. Пишем правила: \`@container panel (min-width: 400px) { ... }\`.
5. Браузер меряет ближайший подходящий **предок**-контейнер (не сам элемент!) и применяет правила.
6. Внутри доступны единицы \`cqw / cqh / cqi / cqb\` — проценты от размера query-контейнера. Идеально для fluid-типографики, живущей внутри компонента.

## Пример

\`\`\`css
/* 1. Хост объявляет себя контейнером */
.card-host { container-type: inline-size; container-name: card; }

/* 2. Карточка внутри реагирует на ширину хоста, а не экрана */
@container card (min-width: 30rem) {
  .card {
    grid-template-columns: 8rem 1fr;
    font-size: clamp(0.9rem, 2cqi, 1.2rem); /* 1cqi = 1% ширины контейнера */
  }
}
\`\`\`

Почему так: правило висит на \`.card\`, а меряется \`.card-host\`. Себя самого запросить нельзя — иначе получилась бы петля «стал шире → сработало правило → стал уже → правило отключилось».

## Что с производительностью

Containment — это плюс: браузер знает, что изменения внутри контейнера не влияют на предков, и сужает зону reflow. Минус — если навесить \`container-type\` на каждый узел, вы наплодите десятки sub-layout-roots и добавите работы на каждый кадр. Смотрите **Performance panel → Layout / Recalculate Style** до и после. Size-запросы — Baseline 2023; style-запросы поддержаны частично, проверяйте Baseline перед продом.

## Что сказать на собеседовании

> Container queries позволяют компоненту реагировать не на viewport, а на размер ближайшего предка-контейнера — поэтому одна и та же карточка корректно раскладывается и в сайдбаре, и в основной колонке, не зная глобальных брейкпоинтов. Предок объявляется через \`container-type\`: \`inline-size\` следит только за шириной и дёшев, \`size\` — за обеими осями, но требует явной высоты, иначе контент схлопнется; \`normal\` оставляет только style-запросы. Объявление контейнера включает layout/style/size containment, поэтому изменения внутри не пересчитывают предков — это скорее выигрыш по производительности. Запросить сам себя нельзя, всегда меряется предок, значит нужен wrapper. Внутри работают единицы \`cqi/cqw\`. Риск — контейнер на каждом узле плодит sub-layout-roots, поэтому я сверяю Layout и Recalculate Style в Performance-панели. Это Baseline 2023.

## Ловушки

- **Забыли \`container-type\` на предке** — \`@container\` просто молча не срабатывает, ошибки в консоли нет.
- **Пытаются запросить сам элемент.** Нельзя: нужен отдельный элемент-обёртка, который станет контейнером.
- **\`container-type: size\` без явной высоты** — блок схлопывается, потому что высота теперь не зависит от контента.
- **\`cqi\` путают с \`vw\`**: \`cq*\` считаются от контейнера, \`v*\` — от viewport.
- **Контейнер на каждом div «на всякий случай»** — лишние sub-layout-roots и просадка на Recalculate Style.
- Спросят следом: чем отличается от media queries и почему нельзя было раньше — потому что раньше layout не умел давать элементу его размер до layout; containment как раз и делает это безопасным.`,
      en: `## In short

A media query asks "how wide is the **screen**?". A container query asks "how wide is the **box I am sitting in**?". So the same card rearranges itself correctly in a narrow sidebar and in a wide main column — it never needs to know a single global breakpoint.

Analogy: a sofa that measures the room it is being carried into, not the size of the apartment. In a closet it folds up, in a living room it unfolds — the sofa decides, not the floor plan.

## How it works, step by step

1. Mark an **ancestor** as a container: \`container-type: inline-size\` tracks width only, which is cheap. Alternatives: \`size\` tracks both axes but **requires an explicit height**, otherwise the content collapses to zero; \`normal\` turns size queries off but keeps style queries (\`@container style(--theme: dark)\`).
2. Optionally name it: \`container-name: panel\`. Without a name the rule matches the **nearest** container — a classic surprise once containers nest.
3. The browser turns on **containment** for that ancestor (layout + style + inline-size): what happens inside no longer forces a re-layout of ancestors.
4. Write the rules: \`@container panel (min-width: 400px) { ... }\`.
5. The browser measures the nearest matching **ancestor** container (never the element itself) and applies the rules.
6. Inside you get the \`cqw / cqh / cqi / cqb\` units — percentages of the query container's size. Perfect for fluid typography scoped to a component.

## Example

\`\`\`css
/* 1. The host declares itself a container */
.card-host { container-type: inline-size; container-name: card; }

/* 2. The card inside reacts to the host's width, not the screen's */
@container card (min-width: 30rem) {
  .card {
    grid-template-columns: 8rem 1fr;
    font-size: clamp(0.9rem, 2cqi, 1.2rem); /* 1cqi = 1% of container width */
  }
}
\`\`\`

Why it is written this way: the rule targets \`.card\`, but \`.card-host\` is what gets measured. An element cannot query itself — that would create the loop "got wider → rule fires → got narrower → rule stops".

## Performance

Containment is a win: the browser knows changes inside a container cannot affect ancestors, so it narrows the reflow region. The downside is putting \`container-type\` on every node — that creates dozens of sub-layout roots and adds per-frame work. Compare **Performance panel → Layout / Recalculate Style** before and after. Size queries are Baseline 2023; style queries are only partially supported, so check Baseline before shipping.

## What to say in the interview

> Container queries let a component react to the size of its nearest container ancestor instead of the viewport, so the same card lays out correctly in a sidebar and in the main column without knowing any global breakpoint. You declare the ancestor with \`container-type\`: \`inline-size\` tracks width only and is cheap, \`size\` tracks both axes but needs an explicit height or the content collapses, and \`normal\` keeps style queries only. Declaring a container enables layout/style/size containment, so changes inside never re-layout ancestors — generally a performance win. An element cannot query itself; you always measure an ancestor, so you need a wrapper. Inside, the \`cqi/cqw\` units work off the container. The risk is a container on every node creating sub-layout roots, so I check Layout and Recalculate Style in the Performance panel. Baseline 2023.

## Gotchas

- **Forgetting \`container-type\` on the ancestor** — \`@container\` silently does nothing, with no console error.
- **Trying to query the element itself.** Not possible: you need a separate wrapper element to act as the container.
- **\`container-type: size\` without an explicit height** — the box collapses, because its height no longer depends on content.
- **Confusing \`cqi\` with \`vw\`**: \`cq*\` units are relative to the container, \`v*\` units to the viewport.
- **Containers sprinkled on every div "just in case"** — extra sub-layout roots and a Recalculate Style regression.
- Likely follow-up: why was this impossible before? Because layout could not hand an element its own size before layout ran; containment is exactly what makes it safe.`
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
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['has-selector', 'modern-css', 'selectors'],
    question: {
      ru: 'Как работает `:has()` («родительский селектор»)? Какие паттерны он открывает и есть ли стоимость по производительности?',
      en: 'How does the `:has()` selector (the "parent selector") work? What patterns does it unlock and is there a performance cost?'
    },
    answer: {
      ru: `## Коротко

Обычные селекторы читаются сверху вниз: «покрась потомка». \`:has()\` переворачивает направление — **«покрась меня, если внутри меня есть вот такое»**. Это первый настоящий «родительский селектор»: стилизуем предка по содержимому, без единой строчки JS.

Аналогия: раньше можно было наклеить ярлык только на предмет в коробке. Теперь можно наклеить ярлык **на саму коробку** — «здесь внутри лежит стекло». Коробку не открывают, но обращаются с ней иначе.

## Как это работает по шагам

1. Пишем \`.card:has(img)\`. Слева — кого красим, внутри скобок — условие «что должно найтись».
2. Аргумент — обычный относительный селектор: \`:has(img)\` — потомок, \`:has(> img)\` — прямой ребёнок, \`:has(+ p)\` — следующий сосед.
3. Браузер проверяет условие и применяет правила **к левому элементу**, а не к найденному.
4. Когда потомок меняется (например, чекбокс стал \`:checked\`), движок помечает кандидатов \`:has()\` вверх по дереву и запускает **инвалидацию поддерева** — пересчёт стиля не только у изменившегося узла, но и у возможных «родителей-подписчиков».
5. Дальше — обычный Recalculate Style и, если поменялась геометрия, layout.

## Пример

\`\`\`css
/* Карточка с картинкой выглядит иначе */
.card:has(img) { padding: 0; }

/* Звёздочка у лейбла обязательного поля */
label:has(+ input:required)::after { content: ' *'; color: red; }

/* Форма с невалидным полем гасит кнопку */
form:has(:invalid) .submit { opacity: 0.5; }

/* Подсветить строку таблицы с отмеченным чекбоксом */
tr:has(input[type="checkbox"]:checked) { background: #eef; }
\`\`\`

Почему так: во всех четырёх случаях раньше пришлось бы вешать слушатель и руками дёргать класс на родителе. Теперь состояние DOM само двигает стили — меньше JS и нет рассинхрона класса с реальностью.

## Что ещё это открывает

- **Quantity queries**: \`ul:has(li:nth-child(6))\` — «в списке 6+ элементов, переключись в две колонки».
- **Сиблинг-логика**: \`h2:has(+ p)\` — заголовок, за которым идёт параграф.
- **Глобальные переключатели без JS**: \`.layout:has(#nav-toggle:checked)\` меняет всю сетку страницы от одного чекбокса.
- **Меньше классов-костылей**: исчезают \`has-image\`, \`is-invalid\`, которые раньше расставлял скрипт.

## Что сказать на собеседовании

> \`:has()\` — реляционный псевдокласс: он выбирает элемент, если внутри него (или рядом с ним) находится то, что описано в аргументе. Это первый способ стилизовать предка от потомка без JS: \`.card:has(img)\`, \`form:has(:invalid) .submit\`, \`tr:has(:checked)\`. Специфичность считается по самому тяжёлому аргументу, как у \`:is()\`. Раньше такой селектор считали нереализуемым из-за стоимости; сейчас Blink и WebKit делают это через инвалидацию поддеревьев — при изменении потомка браузер помечает вероятных \`:has()\`-кандидатов на пересчёт стиля. Дорогими остаются широкие селекторы вроде \`*:has(.x)\` и \`:has()\` по часто меняющимся состояниям в больших списках, поэтому я всегда квалифицирую левую часть и смотрю Recalculate Style в Performance-панели. Baseline 2023.

## Ловушки

- **\`*:has(.x)\` или \`:has()\` без левой части** — движок вынужден рассматривать весь документ. Всегда пишите \`.card:has(...)\`.
- **\`:has()\` внутри \`:has()\`** запрещён, как и \`:has()\` в аргументе — вложить нельзя.
- **Динамика в огромных списках**: \`:has(:hover)\` или \`:has(:checked)\` на тысяче строк расширяет зону Style Recalc на каждый чих.
- **Специфичность берётся по самому тяжёлому аргументу** (как \`:is()\`), так что \`.a:has(#id)\` неожиданно тяжёлый; обернуть в \`:where()\`, если нужно обнулить.
- **В \`::before/::after\` аргумент не работает** — псевдоэлементы не «содержатся» в дереве.
- Спросят следом: как измерить цену — Performance panel, метрика «Recalculate Style», и сравнение до/после на реальном объёме DOM.`,
      en: `## In short

Normal selectors read downward: "style this descendant". \`:has()\` flips the direction — **"style me if something like this is inside me"**. It is the first real parent selector: you style an ancestor based on its contents, with zero JS.

Analogy: you used to be able to label only the item inside the box. Now you can put a label **on the box itself** — "glass inside". Nobody opens it, but everyone handles it differently.

## How it works, step by step

1. Write \`.card:has(img)\`. On the left is what gets styled; inside the parentheses is the condition — what must be found.
2. The argument is a relative selector: \`:has(img)\` any descendant, \`:has(> img)\` a direct child, \`:has(+ p)\` the next sibling.
3. The browser checks the condition and applies the rules **to the left-hand element**, not to the thing it found.
4. When a descendant changes (a checkbox becomes \`:checked\`, say), the engine walks up and marks \`:has()\` candidates, running **subtree invalidation** — style recalc for possible "subscriber" ancestors, not just the changed node.
5. From there it is the usual Recalculate Style, plus layout if geometry changed.

## Example

\`\`\`css
/* A card that contains an image looks different */
.card:has(img) { padding: 0; }

/* Asterisk on the label of a required field */
label:has(+ input:required)::after { content: ' *'; color: red; }

/* A form with an invalid field dims its submit button */
form:has(:invalid) .submit { opacity: 0.5; }

/* Highlight a table row whose checkbox is checked */
tr:has(input[type="checkbox"]:checked) { background: #eef; }
\`\`\`

Why it matters: all four used to need an event listener plus manual class toggling on the parent. Now DOM state drives the styles directly — less JS and no chance of the class drifting out of sync with reality.

## What else it unlocks

- **Quantity queries**: \`ul:has(li:nth-child(6))\` — "six or more items, switch to two columns".
- **Sibling logic**: \`h2:has(+ p)\` — a heading followed by a paragraph.
- **Global toggles without JS**: \`.layout:has(#nav-toggle:checked)\` restructures the whole page grid from one checkbox.
- **Fewer crutch classes**: \`has-image\`, \`is-invalid\` and friends, previously sprinkled by script, simply disappear.

## What to say in the interview

> \`:has()\` is the relational pseudo-class: it matches an element when the thing described by its argument exists inside it or next to it. It is the first way to style an ancestor from a descendant with no JS: \`.card:has(img)\`, \`form:has(:invalid) .submit\`, \`tr:has(:checked)\`. Its specificity comes from the heaviest argument, just like \`:is()\`. The parent selector was long considered infeasible on cost grounds; Blink and WebKit now implement it with subtree invalidation — when a descendant changes, the browser marks likely \`:has()\` candidates for style recalc. The expensive cases are broad selectors like \`*:has(.x)\` and \`:has()\` over rapidly changing state in large lists, so I always qualify the left side and watch Recalculate Style in the Performance panel. Baseline 2023.

## Gotchas

- **\`*:has(.x)\`, or \`:has()\` with no left side** — the engine has to consider the whole document. Always write \`.card:has(...)\`.
- **\`:has()\` inside \`:has()\`** is not allowed, and neither is \`:has()\` in the argument — no nesting.
- **Dynamic state in huge lists**: \`:has(:hover)\` or \`:has(:checked)\` over a thousand rows widens the Style Recalc region on every move.
- **Specificity comes from the heaviest argument** (like \`:is()\`), so \`.a:has(#id)\` is unexpectedly heavy; wrap in \`:where()\` to zero it out.
- **It does not work on \`::before/::after\`** — pseudo-elements are not "contained" in the tree.
- Likely follow-up: how do you measure the cost? Performance panel, the "Recalculate Style" metric, compared before and after on a realistic DOM size.`
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
    category: 'html-css-performance',
    level: 'Expert',
    tags: ['cascade-layers', 'layer', 'specificity'],
    question: {
      ru: 'Что такое cascade layers (`@layer`)? Как они меняют каскад и зачем нужны при больших кодовых базах?',
      en: 'What are cascade layers (`@layer`)? How do they change the cascade and why do they matter in large codebases?'
    },
    answer: {
      ru: `## Коротко

\`@layer\` добавляет в каскад **новую ступень — приоритет слоя**, и она сильнее специфичности. Правило из более позднего слоя побеждает правило из раннего, **даже если оно проще по селектору**. Это способ перестать воевать за специфичность и \`!important\`.

Аналогия: очередь по «должности», а не по громкости голоса. Сначала смотрим, из какого отдела пришёл приказ (слой), и только внутри одного отдела — кто громче кричит (специфичность). Стажёр из отдела с высшим приоритетом перебьёт директора из низшего.

## Как это работает по шагам

1. Один раз вверху объявляем порядок: \`@layer reset, base, components, utilities;\`. Именно эта строка задаёт приоритет — не порядок написания правил ниже.
2. Раскладываем правила по слоям: \`@layer base { ... }\`, \`@layer utilities { ... }\`.
3. При конфликте браузер идёт по каскаду сверху вниз: **origin + importance** (user-agent, user, author) → **слой** (порядок объявления внутри author) → **специфичность** → **порядок появления**.
4. Специфичность включается только тогда, когда оба правила в **одном** слое. Иначе слой решает всё.
5. Правила **без слоя** идут после всех именованных слоёв, то есть имеют **высший** приоритет среди author-стилей. Это главный сюрприз при постепенной миграции.
6. \`!important\` **инвертирует порядок слоёв**: important в *раннем* слое побеждает important в позднем. То есть \`reset\` с \`!important\` становится последним рубежом обороны.

## Пример

\`\`\`css
/* Порядок задан один раз */
@layer reset, vendor, components, app, utilities;

/* Вендорный CSS сразу кладём в слабый слой */
@import url("bootstrap.css") layer(vendor);

@layer app {
  .btn { padding: 0.5rem 1rem; }  /* бьёт bootstrap без !important */
}

@layer utilities {
  .p-0 { padding: 0; }            /* поздний слой побеждает, хотя это просто класс */
}

.debug { outline: 1px solid red; } /* без слоя — сильнее ВСЕХ слоёв выше */
\`\`\`

Почему так: \`.btn\` из \`app\` побеждает \`.navbar .btn.btn-primary\` из \`vendor\` не потому, что «специфичнее», а потому что \`app\` объявлен позже. Гонка селекторов заканчивается.

## Что сказать на собеседовании

> Cascade layers добавляют в каскад отдельное измерение между origin и специфичностью. Порядок слоёв задаётся один раз через \`@layer reset, base, components, utilities;\`, и правило из более позднего слоя выигрывает у правила из раннего независимо от специфичности; специфичность работает только внутри одного слоя. Полный порядок разрешения: origin и importance, затем слой, затем специфичность, затем порядок появления. Два нюанса, на которых ловят: стили **без** слоя сильнее всех именованных слоёв, а \`!important\` **инвертирует** порядок слоёв — important в раннем слое бьёт important в позднем. Практическая ценность — сторонний CSS заворачивается в \`@import url(...) layer(vendor)\`, свои стили кладутся в поздний слой и выигрывают без \`!important\` и без наращивания селекторов. Baseline 2022.

## Ловушки

- **Не объявили порядок заранее** — тогда приоритет определяется порядком первого появления слоёв в коде, и он легко ломается при смене порядка импортов.
- **Незалейеренные стили сильнее всех слоёв.** При миграции «переложили половину в слои» — эта половина внезапно стала слабее остатка.
- **\`!important\` инвертирует слои.** Интуиция «поздний всегда сильнее» здесь не работает.
- **Вложенные слои** (\`@layer components.card\`) сортируются внутри родителя; порядок родителя всё равно главнее.
- **\`@import ... layer()\` должен идти в самом верху файла**, как и любой \`@import\`, иначе игнорируется.
- Спросят следом: чем слои лучше \`!important\` — тем, что \`!important\` бинарен и не масштабируется, а слои дают явную, читаемую иерархию источников стилей.`,
      en: `## In short

\`@layer\` adds a **new rung to the cascade — layer priority** — and it outranks specificity. A rule from a later layer beats one from an earlier layer **even if its selector is simpler**. It is how you stop fighting specificity wars and \`!important\`.

Analogy: seniority instead of shouting. First the browser checks which department the order came from (the layer), and only within one department does it check who shouts loudest (specificity). An intern in the top-priority department outranks a director in a lower one.

## How it works, step by step

1. Declare the order once, at the top: \`@layer reset, base, components, utilities;\`. That line sets priority — not the order the rules appear in later.
2. Put rules into layers: \`@layer base { ... }\`, \`@layer utilities { ... }\`.
3. On a conflict the browser walks the cascade top-down: **origin + importance** (user-agent, user, author) → **layer** (declaration order inside the author origin) → **specificity** → **order of appearance**.
4. Specificity only enters the picture when both rules live in the **same** layer. Otherwise the layer decides everything.
5. Rules with **no** layer sort after all named layers, so they hold the **highest** priority among author styles. That is the big surprise during incremental migration.
6. \`!important\` **reverses layer order**: an important rule in an *earlier* layer beats an important one in a later layer. So an important rule in \`reset\` becomes the last line of defense.

## Example

\`\`\`css
/* Order declared once */
@layer reset, vendor, components, app, utilities;

/* Third-party CSS goes straight into a weak layer */
@import url("bootstrap.css") layer(vendor);

@layer app {
  .btn { padding: 0.5rem 1rem; }  /* beats bootstrap without !important */
}

@layer utilities {
  .p-0 { padding: 0; }            /* later layer wins, plain class though it is */
}

.debug { outline: 1px solid red; } /* unlayered — stronger than ALL layers above */
\`\`\`

Why it works: \`.btn\` in \`app\` beats \`.navbar .btn.btn-primary\` from \`vendor\` not because it is more specific, but because \`app\` was declared later. The selector arms race ends.

## What to say in the interview

> Cascade layers add a separate dimension between origin and specificity. You declare the order once with \`@layer reset, base, components, utilities;\`, and a rule from a later layer beats one from an earlier layer regardless of specificity; specificity only breaks ties inside a single layer. The full resolution order is origin and importance, then layer, then specificity, then order of appearance. Two subtleties interviewers probe: unlayered styles outrank every named layer, and \`!important\` reverses layer order, so an important rule in an early layer beats an important one in a late layer. The practical payoff is third-party CSS — pull it in with \`@import url(...) layer(vendor)\`, put your own styles in a later layer, and yours win with no \`!important\` and no selector escalation. Baseline 2022.

## Gotchas

- **Not declaring the order up front** — priority then follows where each layer first appears, which breaks the moment import order changes.
- **Unlayered styles outrank every layer.** Migrating "half the codebase into layers" suddenly makes that half weaker than the leftovers.
- **\`!important\` inverts layers.** The intuition "later always wins" does not hold there.
- **Nested layers** (\`@layer components.card\`) sort within their parent; the parent's position still dominates.
- **\`@import ... layer()\` must sit at the very top** of the file, like any \`@import\`, or it is ignored.
- Likely follow-up: why are layers better than \`!important\`? Because \`!important\` is binary and does not scale, while layers give an explicit, readable hierarchy of style sources.`
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
    category: 'html-css-performance',
    level: 'Medium',
    tags: ['logical-properties', 'i18n', 'modern-css'],
    question: {
      ru: 'Что такое CSS logical properties и почему они важны для интернационализации и поддерживаемости?',
      en: 'What are CSS logical properties and why do they matter for internationalization and maintainability?'
    },
    answer: {
      ru: `## Коротко

Физические свойства (\`left\`, \`right\`, \`top\`, \`width\`) привязаны к **экрану**. Логические (\`inline-start\`, \`block-end\`, \`inline-size\`) привязаны к **потоку текста**: ось \`inline\` — куда идут буквы, ось \`block\` — куда падают строки. Меняется язык — оси разворачиваются сами, CSS переписывать не надо.

Аналогия: вместо «положи вилку слева» говорим «положи вилку со стороны рабочей руки». Для правши и для левши инструкция одна и та же, а результат правильный в обоих случаях.

## Пары «физическое → логическое»

- \`margin-left\` → \`margin-inline-start\`
- \`padding-right\` → \`padding-inline-end\`
- \`width\` → \`inline-size\`
- \`height\` → \`block-size\`
- \`top\` / \`bottom\` → \`inset-block-start\` / \`inset-block-end\`
- \`text-align: left/right\` → \`text-align: start/end\`
- Шорткаты сразу на обе стороны: \`padding-inline\` (лево+право в LTR), \`margin-block\` (верх+низ).

## Как это работает по шагам

1. Браузер смотрит на \`writing-mode\` и \`direction\` элемента (обычно наследуются от \`<html dir="...">\`).
2. Из них вычисляются две оси: **inline** — направление письма, **block** — направление наращивания строк.
3. \`start\` и \`end\` раскладываются в физические стороны: в LTR \`inline-start\` = left, в RTL = right, в \`vertical-rl\` inline-ось вообще становится вертикальной.
4. Дальше это обычные свойства — каскад, наследование, специфичность работают как всегда.

## Пример

\`\`\`css
/* Один компонент, корректный и в LTR, и в RTL — без переопределений */
.alert {
  padding-block: 0.75rem;
  padding-inline: 1rem;
  border-inline-start: 4px solid currentColor; /* акцент со стороны начала чтения */
  text-align: start;
}

.alert__close {
  position: absolute;
  inset-block-start: 0.5rem;
  inset-inline-end: 0.5rem;  /* справа вверху в LTR, слева вверху в RTL */
}
\`\`\`

Почему так: при \`dir="rtl"\` полоса-акцент и крестик сами переезжают на другую сторону. Физический вариант потребовал бы отдельной \`.rtl\`-таблицы с зеркальными правилами — и она бы вечно отставала от основной.

## Что сказать на собеседовании

> Логические свойства описывают геометрию не в терминах экрана, а в терминах потока текста: ось \`inline\` — направление письма, ось \`block\` — направление строк. Вместо \`margin-left\` пишем \`margin-inline-start\`, вместо \`width\` — \`inline-size\`, вместо \`top/bottom\` — \`inset-block-start/end\`, вместо \`text-align: left\` — \`start\`. Браузер разворачивает \`start\` и \`end\` в физические стороны по \`direction\` и \`writing-mode\`, поэтому при \`dir="rtl"\` вёрстка зеркалится сама и отдельная RTL-таблица не нужна; в вертикальных режимах для CJK inline-ось становится вертикальной, и всё продолжает работать. Главная ловушка — \`inset: 0\` физический, логические аналоги это \`inset-block\` и \`inset-inline\`. Поддержка Baseline. Физические свойства оставляю только там, где привязка к экрану осознанная, например для фиксированного декора.

## Ловушки

- **\`inset: 0\` — физический шорткат**, несмотря на «логическое» имя. Логика — в \`inset-block\` / \`inset-inline\`.
- **Смешивание физического и логического** на одном элементе: \`margin-left\` + \`margin-inline-start\` конфликтуют по обычному каскаду, побеждает последний — источник трудноуловимых багов.
- **Забыли \`text-align: start\`** — текст остаётся прижатым влево при RTL.
- **Трансформы и тени не зеркалятся**: \`transform: translateX(10px)\`, \`box-shadow\`, иконки со стрелками нужно разворачивать вручную.
- **Логическое ≠ автоматический RTL**: без \`dir="rtl"\` на \`<html>\` ничего не поменяется.
- Спросят следом: зачем это, если продукт только на английском — затем, что это дешёвая страховка на будущую локализацию и один набор правил вместо двух.`,
      en: `## In short

Physical properties (\`left\`, \`right\`, \`top\`, \`width\`) are anchored to the **screen**. Logical ones (\`inline-start\`, \`block-end\`, \`inline-size\`) are anchored to the **text flow**: the \`inline\` axis is where letters run, the \`block\` axis is where lines stack. Change the language and the axes rotate themselves — no CSS rewrite.

Analogy: instead of "put the fork on the left", you say "put the fork on the writing-hand side". One instruction, correct for right-handers and left-handers alike.

## Physical → logical pairs

- \`margin-left\` → \`margin-inline-start\`
- \`padding-right\` → \`padding-inline-end\`
- \`width\` → \`inline-size\`
- \`height\` → \`block-size\`
- \`top\` / \`bottom\` → \`inset-block-start\` / \`inset-block-end\`
- \`text-align: left/right\` → \`text-align: start/end\`
- Both-sides shorthands: \`padding-inline\` (left+right in LTR), \`margin-block\` (top+bottom).

## How it works, step by step

1. The browser reads the element's \`writing-mode\` and \`direction\` (usually inherited from \`<html dir="...">\`).
2. From those it derives two axes: **inline** — the writing direction, **block** — the direction lines stack.
3. \`start\` and \`end\` resolve to physical sides: in LTR \`inline-start\` is left, in RTL it is right, and in \`vertical-rl\` the inline axis becomes vertical entirely.
4. After that they are ordinary properties — cascade, inheritance and specificity behave exactly as usual.

## Example

\`\`\`css
/* One component, correct in LTR and RTL — no overrides */
.alert {
  padding-block: 0.75rem;
  padding-inline: 1rem;
  border-inline-start: 4px solid currentColor; /* accent on the reading-start edge */
  text-align: start;
}

.alert__close {
  position: absolute;
  inset-block-start: 0.5rem;
  inset-inline-end: 0.5rem;  /* top-right in LTR, top-left in RTL */
}
\`\`\`

Why it matters: under \`dir="rtl"\` the accent bar and the close button move to the other side by themselves. The physical version would need a separate \`.rtl\` stylesheet of mirrored rules — one that would forever drift behind the main one.

## What to say in the interview

> Logical properties describe geometry in terms of text flow rather than the screen: the \`inline\` axis follows the writing direction, the \`block\` axis follows how lines stack. Instead of \`margin-left\` you write \`margin-inline-start\`, instead of \`width\` \`inline-size\`, instead of \`top/bottom\` \`inset-block-start/end\`, instead of \`text-align: left\` just \`start\`. The browser resolves \`start\` and \`end\` into physical sides from \`direction\` and \`writing-mode\`, so under \`dir="rtl"\` the layout mirrors itself and no separate RTL stylesheet is needed; in vertical CJK writing modes the inline axis turns vertical and everything still works. The classic trap is \`inset: 0\`, which is physical — the logical equivalents are \`inset-block\` and \`inset-inline\`. Support is Baseline. I keep physical properties only where screen anchoring is intentional, such as fixed decoration.

## Gotchas

- **\`inset: 0\` is a physical shorthand**, despite the logical-sounding name. The logical ones are \`inset-block\` / \`inset-inline\`.
- **Mixing physical and logical** on one element: \`margin-left\` and \`margin-inline-start\` fight through the normal cascade and the later one wins — a great source of subtle bugs.
- **Forgetting \`text-align: start\`** leaves text pinned to the left under RTL.
- **Transforms and shadows do not mirror**: \`transform: translateX(10px)\`, \`box-shadow\`, and arrow icons must be flipped by hand.
- **Logical does not mean automatic RTL**: nothing changes without \`dir="rtl"\` on \`<html>\`.
- Likely follow-up: why bother on an English-only product? Because it is cheap insurance for future localization and one rule set instead of two.`
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
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['subgrid', 'css-grid', 'layout'],
    question: {
      ru: 'Что такое `subgrid` в CSS Grid? Какую проблему он решает и чем отличается от обычного вложенного грида?',
      en: 'What is CSS Grid `subgrid`? What problem does it solve and how does it differ from a regular nested grid?'
    },
    answer: {
      ru: `## Коротко

Обычный вложенный grid рисует **свои собственные** линии и ничего не знает о линиях родителя. \`subgrid\` говорит ребёнку: «не рисуй свои — **возьми линии родителя**». Благодаря этому внутренности разных карточек выравниваются между собой.

Аналогия: тетрадь в линейку. Обычный вложенный грид — это когда каждый ученик расчерчивает свой листок сам, и строчки у всех на разной высоте. Subgrid — общая разлиновка на весь разворот: все пишут по одним и тем же линиям, и текст сходится по горизонтали.

## Как это работает по шагам

1. Родитель объявляет треки: \`display: grid; grid-template-columns: repeat(3, 1fr);\`.
2. Ребёнок должен **занять диапазон** родительских треков: \`grid-row: span 3\` или явные линии. Если он занимает одну ячейку, наследовать нечего.
3. Ребёнок сам становится гридом и пишет \`grid-template-rows: subgrid\` (или \`grid-template-columns: subgrid\`).
4. Теперь линии родителя — включая **их имена** — видны внутри ребёнка, и внуки раскладываются по ним.
5. \`gap\` тоже наследуется от родителя, но его можно переопределить на ребёнке.
6. Оси независимы: можно взять subgrid для строк и обычные треки для колонок.

## Пример

\`\`\`css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
}

/* Каждая карточка занимает 3 строки родителя и переиспользует их */
.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid;
  gap: 0.5rem;
}
.card__title  { grid-row: 1; }
.card__body   { grid-row: 2; }
.card__footer { grid-row: 3; align-self: end; }
\`\`\`

Почему так: без subgrid каждая карточка распределяет свои три строки по собственному контенту, и кнопки в ряду «пляшут» по высоте. С subgrid высота строки «заголовок» одна на весь ряд — её задаёт самый длинный заголовок, и все футеры выстраиваются в идеальную линию.

## Что сказать на собеседовании

> Обычный вложенный grid создаёт собственные треки и ничего не знает о родительских, поэтому содержимое соседних карточек невозможно выровнять по общим линиям. \`subgrid\` в значении \`grid-template-rows\` или \`grid-template-columns\` заставляет ребёнка унаследовать треки родителя вместе с их именами и \`gap\`; gap при этом можно переопределить. Обязательное условие — ребёнок должен охватывать диапазон треков, например \`grid-row: span 3\`, иначе наследовать нечего. Оси задаются независимо. Классический кейс — ряд карточек разной высоты: заголовки, тексты и кнопки встают по единым линиям без JS-подгонки высот. Отлаживаю через Grid overlay в DevTools. Baseline 2023, Chrome подключился позже Firefox и Safari.

## Ловушки

- **Ребёнок не охватывает треки** — забыли \`grid-row: span 3\`, и \`subgrid\` тихо ведёт себя как обычный грид.
- **\`subgrid\` — это значение \`grid-template-rows/columns\`**, а не отдельное свойство и не значение \`display\`.
- **Ждут, что subgrid унаследует \`grid-template-areas\`** — нет, наследуются только треки и имена линий.
- **Глубокая вложенность** subgrid в subgrid работает, но отлаживается тяжело; включайте Grid overlay.
- **Не путать с \`display: contents\`**: тот вообще выкидывает бокс из дерева отрисовки и ломает доступность у некоторых элементов, а subgrid бокс сохраняет.
- Спросят следом: как решали до subgrid — вытаскивали элементы карточки в общий грид (ломается семантика) или выравнивали высоты через JS.`,
      en: `## In short

A normal nested grid draws its **own** lines and knows nothing about its parent's. \`subgrid\` tells the child: "don't draw your own — **borrow the parent's lines**". That is what lets the insides of separate cards line up with each other.

Analogy: ruled paper. A regular nested grid is every student ruling their own sheet, so nobody's lines sit at the same height. Subgrid is one set of rules printed across the whole spread: everyone writes on the same lines and the text lines up horizontally.

## How it works, step by step

1. The parent declares tracks: \`display: grid; grid-template-columns: repeat(3, 1fr);\`.
2. The child must **span a range** of the parent's tracks: \`grid-row: span 3\` or explicit lines. Sitting in a single cell leaves nothing to inherit.
3. The child becomes a grid itself and sets \`grid-template-rows: subgrid\` (or \`grid-template-columns: subgrid\`).
4. Now the parent's lines — **including their names** — are visible inside the child, and grandchildren place themselves on them.
5. \`gap\` is inherited from the parent too, though the child may override it.
6. The axes are independent: rows can be subgrid while columns use normal tracks.

## Example

\`\`\`css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
}

/* Each card spans 3 parent rows and reuses them */
.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid;
  gap: 0.5rem;
}
.card__title  { grid-row: 1; }
.card__body   { grid-row: 2; }
.card__footer { grid-row: 3; align-self: end; }
\`\`\`

Why it matters: without subgrid each card sizes its three rows from its own content, so the buttons across a row "dance" at different heights. With subgrid the title row has one height for the whole row — set by the longest title — and every footer lands on a perfect line.

## What to say in the interview

> A normal nested grid creates its own tracks and knows nothing about the parent's, so content in neighbouring cards can never align to shared lines. \`subgrid\`, used as the value of \`grid-template-rows\` or \`grid-template-columns\`, makes the child inherit the parent's tracks along with their line names and \`gap\` — the gap can still be overridden. The precondition is that the child spans a track range, for example \`grid-row: span 3\`, or there is nothing to inherit. The axes are set independently. The classic case is a row of unequal-height cards: titles, body text and buttons all land on shared lines with no JS height matching. I debug it with the DevTools Grid overlay. Baseline 2023, with Chrome shipping after Firefox and Safari.

## Gotchas

- **The child does not span any tracks** — forget \`grid-row: span 3\` and \`subgrid\` quietly behaves like an ordinary grid.
- **\`subgrid\` is a value of \`grid-template-rows/columns\`**, not a standalone property and not a \`display\` value.
- **Expecting \`grid-template-areas\` to be inherited** — it is not; only tracks and line names come through.
- **Deep nesting** of subgrid inside subgrid works but is painful to debug; turn on the Grid overlay.
- **Do not confuse it with \`display: contents\`**, which removes the box from the render tree entirely and can break accessibility on some elements; subgrid keeps the box.
- Likely follow-up: how was this done before? By hoisting card parts into one shared grid (breaking semantics) or by equalizing heights in JS.`
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
    category: 'html-css-performance',
    level: 'Medium',
    tags: ['clamp', 'fluid-typography', 'math-functions'],
    question: {
      ru: 'Как работают CSS-функции `clamp()`, `min()` и `max()`? Покажите fluid typography и адаптивные размеры без media queries.',
      en: 'How do the CSS functions `clamp()`, `min()` and `max()` work? Show fluid typography and adaptive sizing without media queries.'
    },
    answer: {
      ru: `## Коротко

Это три математические функции, которые браузер считает **во время layout** и которые умеют смешивать единицы (\`px\`, \`%\`, \`rem\`, \`vw\`) в одном выражении. \`min()\` ставит **потолок**, \`max()\` — **пол**, \`clamp()\` — сразу и пол, и потолок вокруг «желаемого» значения.

Аналогия: термостат. Вы говорите «держи примерно 22, но не ниже 18 и не выше 26». Внутри коридора значение плавает свободно, а за границы не выходит никогда. \`clamp(18, 22, 26)\` — ровно это.

## Как это работает по шагам

1. \`min(a, b)\` берёт **меньшее** из значений — то есть работает как верхняя граница. \`width: min(100%, 60ch)\` — не шире 60ch и не шире контейнера.
2. \`max(a, b)\` берёт **большее** — нижняя граница. \`max(1rem, 2vw)\` никогда не опустится ниже 1rem.
3. \`clamp(MIN, PREF, MAX)\` — это ровно \`max(MIN, min(PREF, MAX))\`. Сначала PREF обрезается сверху, потом подпирается снизу.
4. PREF обычно линейный: \`1rem + 3vw\`. \`rem\`-часть — «база», \`vw\`-часть — наклон, то есть скорость роста при расширении экрана.
5. Значения пересчитываются при каждом ресайзе, поэтому адаптация **непрерывная** — без ступенек на брейкпоинтах.
6. Функции можно вкладывать друг в друга и в \`calc()\`; умножение и деление внутри допустимы.

## Пример

\`\`\`css
:root {
  /* Плавная шкала: база + наклон*viewport, с ограничением сверху */
  --step-0: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);
  --step-2: clamp(1.5rem, 1rem + 2.5vw, 2.5rem);
  --gutter: clamp(1rem, 5vw, 3rem);
}

body { font-size: var(--step-0); }
h1   { font-size: var(--step-2); }

.container {
  inline-size: min(100% - 2 * var(--gutter), 70ch); /* не шире экрана и не длиннее строки чтения */
  margin-inline: auto;
}
\`\`\`

Почему так: \`h1\` плавно растёт вместе с шириной экрана, но никогда не станет меньше 1.5rem и больше 2.5rem. Ноль media queries — и ноль скачков в промежуточных ширинах.

## Что сказать на собеседовании

> \`min()\`, \`max()\` и \`clamp()\` — математические функции CSS, которые вычисляются во время layout и принимают смешанные единицы. \`min()\` даёт верхнюю границу, \`max()\` — нижнюю, а \`clamp(MIN, PREF, MAX)\` разворачивается ровно в \`max(MIN, min(PREF, MAX))\`. Типичное применение — fluid typography: \`font-size: clamp(1.75rem, 1rem + 3vw, 3rem)\`, где \`rem\` задаёт базу, а \`vw\` — наклон; адаптация становится непрерывной вместо ступенчатой, media queries не нужны. Важный нюанс по доступности: чистый \`vw\` без \`rem\`-слагаемого ломает браузерный zoom, пользователь не может увеличить текст, а это нарушение WCAG 1.4.4 Resize Text — поэтому \`rem\`-часть в PREF обязательна. Ещё частый приём — \`minmax(min(100%, 20rem), 1fr)\` против переполнения узких экранов. Baseline, работает везде.

## Ловушки

- **Чистый \`vw\` в \`font-size\`** — ломает zoom и валит WCAG 1.4.4. Всегда \`1rem + 3vw\`, а не просто \`4vw\`.
- **Путают \`min\` и \`max\` местами.** Запомнить просто: \`min()\` ограничивает **сверху**, \`max()\` — **снизу**, потому что берут меньшее и большее значение соответственно.
- **MIN > MAX в \`clamp\`** — тогда побеждает MIN, а вёрстка молча ломается.
- **\`vw\` включает ширину скроллбара** в некоторых браузерах — отсюда горизонтальный скролл на \`width: 100vw\`.
- **Пробелы вокруг операторов обязательны**: \`calc(100% -2rem)\` невалидно, нужно \`100% - 2rem\`.
- Спросят следом: как проверить — прогнать ресайз в DevTools от 320px до 2560px и убедиться, что нет ни переполнения, ни «слипшегося» текста на краях диапазона.`,
      en: `## In short

Three math functions the browser evaluates **at layout time**, and they happily mix units (\`px\`, \`%\`, \`rem\`, \`vw\`) inside one expression. \`min()\` sets a **ceiling**, \`max()\` sets a **floor**, and \`clamp()\` sets both around a preferred value.

Analogy: a thermostat. You say "aim for 22, never below 18, never above 26". Inside that corridor the value floats freely; outside it, never. \`clamp(18, 22, 26)\` is exactly that.

## How it works, step by step

1. \`min(a, b)\` picks the **smaller** value — which makes it an upper bound. \`width: min(100%, 60ch)\` is never wider than 60ch nor wider than the container.
2. \`max(a, b)\` picks the **larger** — a lower bound. \`max(1rem, 2vw)\` never drops under 1rem.
3. \`clamp(MIN, PREF, MAX)\` is literally \`max(MIN, min(PREF, MAX))\`. PREF is capped from above first, then propped up from below.
4. PREF is usually linear: \`1rem + 3vw\`. The \`rem\` term is the base, the \`vw\` term is the slope — how fast it grows as the viewport widens.
5. Values recompute on every resize, so adaptation is **continuous** — no steps at breakpoints.
6. The functions nest inside each other and inside \`calc()\`; multiplication and division are allowed there.

## Example

\`\`\`css
:root {
  /* Fluid scale: base + slope*viewport, capped */
  --step-0: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);
  --step-2: clamp(1.5rem, 1rem + 2.5vw, 2.5rem);
  --gutter: clamp(1rem, 5vw, 3rem);
}

body { font-size: var(--step-0); }
h1   { font-size: var(--step-2); }

.container {
  inline-size: min(100% - 2 * var(--gutter), 70ch); /* never wider than the screen or a readable line */
  margin-inline: auto;
}
\`\`\`

Why it works: the \`h1\` grows smoothly with viewport width but never falls below 1.5rem or exceeds 2.5rem. Zero media queries — and zero jumps at intermediate widths.

## What to say in the interview

> \`min()\`, \`max()\` and \`clamp()\` are CSS math functions evaluated at layout time that accept mixed units. \`min()\` gives an upper bound, \`max()\` a lower one, and \`clamp(MIN, PREF, MAX)\` expands to exactly \`max(MIN, min(PREF, MAX))\`. The canonical use is fluid typography: \`font-size: clamp(1.75rem, 1rem + 3vw, 3rem)\`, where the \`rem\` term is the base and \`vw\` is the slope; adaptation becomes continuous instead of stepwise and media queries disappear. The accessibility nuance matters: a pure \`vw\` size with no \`rem\` term breaks browser zoom so the user cannot enlarge text, which violates WCAG 1.4.4 Resize Text — hence the \`rem\` term in PREF is mandatory. Another everyday trick is \`minmax(min(100%, 20rem), 1fr)\` to stop overflow on narrow screens. Baseline, safe everywhere.

## Gotchas

- **A pure \`vw\` \`font-size\`** breaks zoom and fails WCAG 1.4.4. Always \`1rem + 3vw\`, never bare \`4vw\`.
- **Swapping \`min\` and \`max\` in your head.** Remember: \`min()\` caps from **above**, \`max()\` props up from **below**, because they pick the smaller and larger value respectively.
- **MIN greater than MAX in \`clamp\`** — MIN wins and the layout silently misbehaves.
- **\`vw\` includes the scrollbar width** in some browsers, which is why \`width: 100vw\` can cause horizontal scroll.
- **Spaces around operators are required**: \`calc(100% -2rem)\` is invalid; write \`100% - 2rem\`.
- Likely follow-up: how do you verify it? Sweep the DevTools viewport from 320px to 2560px and confirm there is no overflow and no cramped text at either end of the range.`
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
    category: 'html-css-performance',
    level: 'Expert',
    tags: ['custom-properties', 'at-property', 'color-mix'],
    question: {
      ru: 'Как работает скоупинг CSS custom properties, что даёт `@property` и зачем нужен `color-mix()`?',
      en: 'How does CSS custom property scoping work, what does `@property` add, and why is `color-mix()` useful?'
    },
    answer: {
      ru: `## Коротко

CSS-переменная — это не переменная из JS, а **обычное наследуемое свойство**. Она видна всему поддереву, где объявлена, и переопределяется ниже по дереву. \`@property\` добавляет ей **тип**, а \`color-mix()\` позволяет считать оттенки прямо в браузере, а не в препроцессоре.

Аналогия: правило дома. Объявили на \`:root\` — «во всём доме тихий час», объявили на \`.theme-dark\` — «а в этой комнате свои порядки». Правило действует на комнату и всё, что внутри; лексической области видимости, как в JS, здесь нет вообще — есть только дерево.

## Как это работает по шагам

1. Объявляем \`--bg: #111\` на любом селекторе. Значение попадает на все элементы, которые матчатся, **и наследуется** вглубь.
2. Читаем через \`var(--bg, white)\`. Второй аргумент — фолбэк, если переменная не определена.
3. Переопределение ниже по дереву перекрывает значение только для этого поддерева — так и делаются темы без пересборки CSS.
4. Для браузера нетипизированная \`--x\` — просто **строка токенов**. Отсюда два ограничения: её нельзя плавно анимировать и нельзя проверить на валидность.
5. \`@property\` регистрирует переменную: \`syntax\`, \`initial-value\`, \`inherits\`. Теперь браузер знает тип — значит умеет **интерполировать** её в анимациях и переходах, откатывает невалидное значение к \`initial-value\`, а при \`inherits: false\` не даёт значению «протечь» в потомков.
6. \`color-mix(in oklch, A 80%, B)\` смешивает два цвета в выбранном пространстве **в рантайме** — из одного токена-акцента выводятся hover, disabled, границы.

## Пример

\`\`\`css
/* Типизированная и потому анимируемая переменная */
@property --p {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 0%;
}

.progress {
  background: linear-gradient(90deg, var(--accent) var(--p), #eee var(--p));
  transition: --p 600ms ease;   /* без @property это не сработает */
}
.progress.done { --p: 100%; }

/* Состояния выводятся из одного токена */
.btn          { background: var(--accent); }
.btn:hover    { background: color-mix(in oklch, var(--accent) 85%, black); }
.btn:disabled { background: color-mix(in srgb, var(--accent), white 50%); }
\`\`\`

Почему так: без \`@property\` браузер видит \`0%\` и \`100%\` как две несвязанные строки и переключает их скачком. С типом \`<percentage>\` он умеет считать промежуточные значения — и градиент начинает анимироваться. \`oklch\` берут потому, что это перцептивное пространство: осветление и затемнение выглядят равномерно, без «грязных» переходов через серый, как в sRGB.

## Что сказать на собеседовании

> Custom properties скоупятся по дереву, а не лексически: объявленная на \`:root\` переменная видна везде, объявленная на узле переопределяет значение для его поддерева — на этом строятся темы. Читаются через \`var(--x, fallback)\`. По умолчанию для браузера значение переменной — просто строка, поэтому её нельзя плавно анимировать и нельзя валидировать. \`@property\` регистрирует переменную с \`syntax\`, \`initial-value\` и \`inherits\`: появляется интерполяция, то есть анимируемые градиенты и углы, откат невалидного значения к initial и защита от протечки при \`inherits: false\`. \`color-mix()\` смешивает цвета в рантайме в заданном пространстве, обычно \`oklch\` — это заменяет препроцессорные \`lighten\` и \`darken\` и позволяет вывести hover и disabled из одного токена-акцента. Оба — Baseline 2023.

## Ловушки

- **Ждут лексического скоупа как в SCSS** — его нет. Переменная живёт по дереву и наследуется.
- **\`var()\` нельзя подставить в имя свойства или в имя селектора** — только в значение.
- **Невалидное значение переменной делает свойство \`unset\`, а не «откатывает к предыдущему»** — знаменитый IACVT. С \`@property\` вместо этого берётся \`initial-value\`.
- **Анимация \`--x\` без \`@property\` не работает** — переход происходит скачком в середине.
- **\`inherits: true\` по умолчанию нет**: в \`@property\` поле обязательное, и его легко проставить неверно.
- **Смешивание в \`srgb\` даёт грязные оттенки** — для осветления и затемнения берите \`oklch\`.
- Спросят следом: как это отлаживать — в DevTools вычисленное значение переменной видно в Computed, а зарегистрированные через \`@property\` показываются с типом.`,
      en: `## In short

A CSS variable is not a JS variable — it is **an ordinary inherited property**. It is visible to the whole subtree where it is declared and can be overridden further down. \`@property\` gives it a **type**, and \`color-mix()\` lets the browser compute shades at runtime instead of a preprocessor.

Analogy: house rules. Declare it on \`:root\` and it is "quiet hours everywhere"; declare it on \`.theme-dark\` and "this room has its own rules". The rule applies to the room and everything inside it. There is no lexical scope like in JS — only the tree.

## How it works, step by step

1. Declare \`--bg: #111\` on any selector. The value lands on every matching element **and inherits** downward.
2. Read it with \`var(--bg, white)\`. The second argument is the fallback when the variable is undefined.
3. Redeclaring it lower in the tree overrides the value for that subtree only — that is how themes work without rebuilding CSS.
4. To the browser an unregistered \`--x\` is just **a string of tokens**. Hence two limits: it cannot be smoothly animated and it cannot be validated.
5. \`@property\` registers the variable with \`syntax\`, \`initial-value\` and \`inherits\`. Now the browser knows the type, so it can **interpolate** it in transitions and animations, fall back to \`initial-value\` on an invalid value, and with \`inherits: false\` stop the value leaking into descendants.
6. \`color-mix(in oklch, A 80%, B)\` blends two colors in a chosen space **at runtime** — hover, disabled and border colors all derive from one accent token.

## Example

\`\`\`css
/* Typed, and therefore animatable, custom property */
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

/* States derived from a single token */
.btn          { background: var(--accent); }
.btn:hover    { background: color-mix(in oklch, var(--accent) 85%, black); }
.btn:disabled { background: color-mix(in srgb, var(--accent), white 50%); }
\`\`\`

Why it works: without \`@property\` the browser sees \`0%\` and \`100%\` as two unrelated strings and snaps between them. Typed as \`<percentage>\`, it can compute the values in between — and the gradient animates. \`oklch\` is chosen because it is perceptual: lightening and darkening look even, without the muddy trip through grey that sRGB gives you.

## What to say in the interview

> Custom properties are scoped by the tree, not lexically: declared on \`:root\` a variable is visible everywhere, declared on a node it overrides the value for that subtree — that is what themes are built on. You read them with \`var(--x, fallback)\`. By default the browser treats the value as an opaque string, so it can neither be smoothly animated nor validated. \`@property\` registers the variable with \`syntax\`, \`initial-value\` and \`inherits\`, which unlocks interpolation — animatable gradients and angles — plus fallback to initial on invalid values and no leaking when \`inherits: false\`. \`color-mix()\` blends colors at runtime in a chosen space, usually \`oklch\`; it replaces preprocessor \`lighten\` and \`darken\` and lets hover and disabled states derive from one accent token. Both are Baseline 2023.

## Gotchas

- **Expecting SCSS-style lexical scope** — there is none. The variable lives on the tree and inherits.
- **\`var()\` cannot go in a property name or a selector** — values only.
- **An invalid variable value makes the property \`unset\` rather than falling back to the previous declaration** — the famous IACVT behaviour. With \`@property\` you get \`initial-value\` instead.
- **Animating \`--x\` without \`@property\` does nothing smooth** — it snaps halfway through.
- **\`inherits\` has no default in \`@property\`**: the descriptor is required and easy to get wrong.
- **Mixing in \`srgb\` produces muddy shades** — use \`oklch\` for lightening and darkening.
- Likely follow-up: how do you debug it? DevTools shows the resolved value under Computed, and properties registered via \`@property\` are listed with their type.`
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
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['css-grid', 'auto-fit', 'minmax'],
    question: {
      ru: 'В чём разница между `auto-fit` и `auto-fill` в `repeat()`? Как `minmax()` и template-areas строят адаптивные сетки?',
      en: 'What is the difference between `auto-fit` and `auto-fill` in `repeat()`? How do `minmax()` and template-areas build responsive grids?'
    },
    answer: {
      ru: `## Коротко

Оба пишутся как \`repeat(auto-fit | auto-fill, minmax(15rem, 1fr))\` и создают столько колонок, сколько влезает по ширине. Разница ровно одна — **что делать с пустыми колонками**: \`auto-fill\` их сохраняет, \`auto-fit\` схлопывает в ноль и отдаёт место реальным элементам.

Аналогия: стол на 6 стульев, а гостей пришло двое. \`auto-fill\` оставляет четыре пустых стула стоять — гости сидят с краю, дальше пустота. \`auto-fit\` уносит лишние стулья, и двое рассаживаются по всему столу.

## Как это работает по шагам

1. Браузер считает, сколько треков шириной **не меньше MIN** помещается в контейнер с учётом \`gap\`.
2. Создаёт это количество треков.
3. \`auto-fill\` на этом останавливается: пустые треки остаются и занимают место.
4. \`auto-fit\` дополнительно **схлопывает пустые треки до 0** — и тогда \`1fr\` в \`minmax\` распределяет освободившуюся ширину между заполненными треками.
5. \`minmax(15rem, 1fr)\` читается так: трек **не уже 15rem**, но растягивается до равной доли свободного места.
6. Всё вместе — «RAM-паттерн» (Repeat, Auto, Minmax): адаптивная сетка без единого media query.

## Пример

\`\`\`css
/* RAM-паттерн: галерея без media queries.
   auto-fit схлопывает пустые треки, поэтому 1-2 карточки займут весь ряд. */
.gallery {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
}

/* Template-areas: вся раскладка страницы одной строкой */
.app {
  display: grid;
  grid-template: 'nav header' auto 'nav main' 1fr / 12rem 1fr;
}
@media (max-width: 40rem) {
  .app { grid-template: 'header' 'nav' 'main' / 1fr; }
}
\`\`\`

Почему так: \`min(100%, 14rem)\` внутри \`minmax\` — защита от переполнения. На экране уже 14rem обычный \`minmax(14rem, 1fr)\` вылезет за контейнер и даст горизонтальный скролл, а \`min(100%, 14rem)\` в этот момент схлопнется до ширины контейнера. Для галерей карточек почти всегда нужен \`auto-fit\`; \`auto-fill\` берут, когда сетка должна держать «места» — например, календарь или планировка.

## Что сказать на собеседовании

> \`auto-fill\` и \`auto-fit\` в \`repeat()\` создают столько треков, сколько влезает по ширине контейнера. Разница только в пустых треках: \`auto-fill\` их сохраняет, поэтому при двух карточках справа останется пустое место, а \`auto-fit\` схлопывает пустые треки в ноль, и \`1fr\` растягивает реальные элементы на всю ширину. Обычно для галерей нужен \`auto-fit\`, а \`auto-fill\` — когда пустые слоты осмысленны, например в календаре. \`minmax(15rem, 1fr)\` означает «не уже 15rem, но тянись до равной доли»; связка \`repeat + auto + minmax\` — это RAM-паттерн, адаптивная сетка без media queries. От переполнения на узких экранах защищаюсь через \`minmax(min(100%, 15rem), 1fr)\`. Для крупной раскладки использую \`grid-template-areas\`: перестроить страницу под мобильный можно одним переопределением областей.

## Ловушки

- **Считают, что \`auto-fit\` создаёт меньше треков.** Треков столько же — просто пустые схлопываются до нуля.
- **\`minmax(15rem, 1fr)\` на экране уже 15rem** — переполнение и горизонтальный скролл. Лечится \`min(100%, 15rem)\`.
- **Без \`1fr\` во втором аргументе** \`auto-fit\` внешне неотличим от \`auto-fill\`: схлопнуть треки схлопнет, но растягивать элементы будет нечему.
- **\`gap\` участвует в расчёте**, сколько треков влезет — про него часто забывают в устном ответе.
- **Строки в \`grid-template-areas\` должны образовывать прямоугольник**, иначе всё правило невалидно и молча игнорируется.
- Спросят следом: как это отлаживать — Grid overlay в DevTools показывает номера линий и схлопнутые треки нулевой ширины.`,
      en: `## In short

Both are written as \`repeat(auto-fit | auto-fill, minmax(15rem, 1fr))\` and create as many columns as fit across the container. There is exactly one difference — **what happens to empty columns**: \`auto-fill\` keeps them, \`auto-fit\` collapses them to zero and hands the space to the real items.

Analogy: a table set for six, two guests show up. \`auto-fill\` leaves four empty chairs in place — the guests sit at one end and the rest is void. \`auto-fit\` takes the spare chairs away, and the two spread out across the whole table.

## How it works, step by step

1. The browser computes how many tracks of **at least MIN** width fit in the container, accounting for \`gap\`.
2. It creates that many tracks.
3. \`auto-fill\` stops there: empty tracks remain and take up space.
4. \`auto-fit\` additionally **collapses empty tracks to 0** — and then the \`1fr\` in \`minmax\` distributes the freed width among the filled tracks.
5. \`minmax(15rem, 1fr)\` reads as: this track is **never narrower than 15rem**, but grows to an equal share of the free space.
6. Put together, that is the "RAM pattern" (Repeat, Auto, Minmax): a responsive grid with no media query at all.

## Example

\`\`\`css
/* RAM pattern: gallery with no media queries.
   auto-fit collapses empty tracks, so 1-2 cards fill the whole row. */
.gallery {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
}

/* Template-areas: the whole page layout in one line */
.app {
  display: grid;
  grid-template: 'nav header' auto 'nav main' 1fr / 12rem 1fr;
}
@media (max-width: 40rem) {
  .app { grid-template: 'header' 'nav' 'main' / 1fr; }
}
\`\`\`

Why it is written that way: \`min(100%, 14rem)\` inside \`minmax\` is the overflow guard. On a screen narrower than 14rem, a plain \`minmax(14rem, 1fr)\` bursts out of the container and causes horizontal scroll, while \`min(100%, 14rem)\` shrinks to the container width instead. Galleries almost always want \`auto-fit\`; reach for \`auto-fill\` when the empty slots are meaningful — a calendar or a seating plan.

## What to say in the interview

> \`auto-fill\` and \`auto-fit\` inside \`repeat()\` both create as many tracks as fit the container width. The only difference is empty tracks: \`auto-fill\` keeps them, so two cards leave dead space on the right, while \`auto-fit\` collapses empty tracks to zero and the \`1fr\` stretches the real items across the full width. Galleries normally want \`auto-fit\`; \`auto-fill\` is right when empty slots mean something, like a calendar. \`minmax(15rem, 1fr)\` means "never narrower than 15rem, but grow to an equal share", and \`repeat + auto + minmax\` together are the RAM pattern — a responsive grid with no media queries. I guard against narrow-screen overflow with \`minmax(min(100%, 15rem), 1fr)\`. For page-level layout I use \`grid-template-areas\`, since restructuring for mobile is then a single redefinition of the areas.

## Gotchas

- **Assuming \`auto-fit\` creates fewer tracks.** It creates the same number — the empty ones just collapse to zero.
- **\`minmax(15rem, 1fr)\` on a screen narrower than 15rem** overflows and causes horizontal scroll. Fix it with \`min(100%, 15rem)\`.
- **Without \`1fr\` as the max**, \`auto-fit\` looks identical to \`auto-fill\`: the tracks still collapse, but nothing stretches to fill the space.
- **\`gap\` counts toward the fit calculation** — it is the detail most often dropped from a spoken answer.
- **The strings in \`grid-template-areas\` must form a rectangle**, otherwise the whole declaration is invalid and silently ignored.
- Likely follow-up: how do you debug it? The DevTools Grid overlay shows line numbers and the zero-width collapsed tracks.`
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
    category: 'html-css-performance',
    level: 'Expert',
    tags: ['specificity', 'important', 'all-unset'],
    question: {
      ru: 'Разберите краевые случаи специфичности: `!important`, `all: unset`, наследование vs специфичность, инлайн-стили и `:where()`.',
      en: 'Walk through specificity edge cases: `!important`, `all: unset`, inheritance vs specificity, inline styles and `:where()`.'
    },
    answer: {
      ru: `## Коротко

Специфичность — это кортеж из трёх чисел (a, b, c): **id** / **классы, атрибуты, псевдоклассы** / **элементы и псевдоэлементы**. Сравниваются они как разряды числа: один id бьёт сколько угодно классов. Но поверх этого есть несколько правил, которые важнее специфичности, — на них и ловят.

Аналогия: воинские звания. Сначала сравнивают звание (важность и origin), потом род войск (слой), и только потом — выслугу лет (специфичность). Спорить «у меня три класса против одного id» — это спор о выслуге, когда у собеседника выше звание.

## Разбор по краевым случаям

1. **\`!important\`** поднимает объявление в **отдельную полосу важности** выше всех обычных правил. Между двумя important спор решается обычной специфичностью.
2. **Порядок origin при important инвертируется**: обычно author > user > user-agent, а среди important — наоборот, user important бьёт author important. Так пользователь может продавить свои настройки доступности.
3. **Инлайн-стиль** (\`style="..."\`) сильнее любого селектора, но **слабее** \`!important\` из стайлшита. Перебить инлайн можно только через \`!important\`.
4. **\`:where(...)\` имеет специфичность ровно 0**, а \`:is(...)\` берёт специфичность **самого тяжёлого** аргумента. Это главный современный инструмент управления весом селектора.
5. **Наследование вообще вне конкурса**: унаследованное значение проигрывает **любому** прямому объявлению на элементе, даже \`* { color: red }\`. Наследование — последний резерв, когда прямых объявлений нет.
6. **\`all: unset\` / \`revert\` / \`revert-layer\`** — массовый сброс: \`unset\` = наследуемые в \`inherit\`, ненаследуемые в \`initial\`; \`revert\` откатывает к стилям user-agent; \`revert-layer\` — к предыдущему cascade layer.

## Пример

\`\`\`css
:where(.a, #id) p { color: gray; }  /* специфичность 0,0,1 — считается только p */
:is(.a, #id) p    { color: gray; }  /* специфичность 1,0,1 — берётся #id */

/* Базовые стили с нулевым весом: переопределяются чем угодно */
:where(button, .btn) { font: inherit; cursor: pointer; }
.btn-primary { background: rebeccapurple; }  /* побеждает: у :where() вес 0 */

/* Сброс стороннего виджета до дефолтов браузера, локально */
.unstyled-host * { all: revert; }

/* Унаследованный цвет проигрывает даже универсальному селектору */
:root { color: navy; }
* { color: black; }   /* всё чёрное, navy не доедет ни до кого */
\`\`\`

Почему так: \`:where()\` — способ раздавать дизайн-систему так, чтобы продуктовые команды переопределяли её одним простым классом, без \`!important\` и без наращивания селекторов.

## Что сказать на собеседовании

> Специфичность — кортеж (id, классы и псевдоклассы, элементы), сравниваемый поразрядно. Но выше неё стоят другие правила. \`!important\` выносит объявление в отдельную полосу важности, а порядок origin среди important инвертируется, поэтому user important бьёт author important. Инлайн-стиль сильнее любого селектора, но слабее \`!important\` из стайлшита. \`:where()\` имеет специфичность ровно ноль, а \`:is()\` берёт вес самого тяжёлого аргумента — на этом строят легко переопределяемые базовые стили. Наследование вне конкурса: унаследованное значение проигрывает любому прямому объявлению, даже \`* { color: red }\`. Для изоляции компонента вместо войн \`!important\` использую \`all: revert\` — откат к стилям user-agent, или \`all: revert-layer\` — откат к предыдущему cascade layer.

## Ловушки

- **«Инлайн бьёт всё»** — нет, \`!important\` из стайлшита бьёт инлайн-стиль.
- **\`:is()\` считают лёгким как \`:where()\`** — \`:is(.a, #id)\` тянет за собой вес \`#id\`.
- **Ждут, что унаследованный цвет переспорит \`*\`** — не переспорит, наследование участвует только при отсутствии прямых объявлений.
- **\`all: unset\` путают с \`revert\`**: \`unset\` уносит в initial/inherit и убивает стили браузера, из-за чего \`<button>\` перестаёт выглядеть кнопкой; \`revert\` возвращает именно UA-дефолты.
- **Количество классов не догоняет id**: 100 классов — это 0,100,0, всё равно меньше 1,0,0.
- Спросят следом: как разрулить конфликт правильно — cascade layers плюс \`:where()\` для базы, \`!important\` оставить только для утилит и хотфиксов.`,
      en: `## In short

Specificity is a three-number tuple (a, b, c): **ids** / **classes, attributes, pseudo-classes** / **elements and pseudo-elements**. They compare like digits of a number: one id beats any number of classes. But several rules sit above specificity entirely — and those are what interviewers probe.

Analogy: military rank. First you compare rank (importance and origin), then the branch of service (layer), and only then years of service (specificity). Arguing "three classes against one id" is arguing about seniority with someone who outranks you.

## The edge cases, one by one

1. **\`!important\`** lifts a declaration into a **separate importance band** above all normal rules. Between two important declarations, ordinary specificity breaks the tie.
2. **Origin order reverses under important**: normally author beats user beats user-agent, but among important declarations it flips — user important beats author important. That is how a user can force their accessibility settings through.
3. **Inline styles** (\`style="..."\`) beat any selector, but lose to \`!important\` from a stylesheet. \`!important\` is the only way to override inline.
4. **\`:where(...)\` has specificity exactly 0**, while \`:is(...)\` takes the specificity of its **heaviest** argument. This is the modern way to control a selector's weight.
5. **Inheritance is out of the contest entirely**: an inherited value loses to **any** direct declaration on the element, even \`* { color: red }\`. Inheritance is the last resort when nothing declares the property directly.
6. **\`all: unset\` / \`revert\` / \`revert-layer\`** are the bulk resets: \`unset\` sends inherited properties to \`inherit\` and the rest to \`initial\`; \`revert\` rolls back to user-agent styles; \`revert-layer\` rolls back to the previous cascade layer.

## Example

\`\`\`css
:where(.a, #id) p { color: gray; }  /* specificity 0,0,1 — only p counts */
:is(.a, #id) p    { color: gray; }  /* specificity 1,0,1 — #id counts */

/* Zero-weight base styles: overridable by anything */
:where(button, .btn) { font: inherit; cursor: pointer; }
.btn-primary { background: rebeccapurple; }  /* wins: :where() contributes 0 */

/* Reset a third-party widget back to browser defaults, scoped */
.unstyled-host * { all: revert; }

/* Inherited color loses even to the universal selector */
:root { color: navy; }
* { color: black; }   /* everything black; navy never reaches anyone */
\`\`\`

Why it matters: \`:where()\` is how you ship a design system that product teams can override with one plain class — no \`!important\`, no selector escalation.

## What to say in the interview

> Specificity is a tuple of ids, classes and pseudo-classes, and elements, compared digit by digit. But other rules outrank it. \`!important\` moves a declaration into its own importance band, and origin order inverts among important declarations, so user important beats author important. Inline styles beat any selector but lose to \`!important\` from a stylesheet. \`:where()\` has specificity exactly zero while \`:is()\` inherits the weight of its heaviest argument — that is what easily-overridable base styles are built on. Inheritance sits outside the contest: an inherited value loses to any direct declaration, even \`* { color: red }\`. To isolate a component instead of waging \`!important\` wars I use \`all: revert\` to fall back to user-agent styles, or \`all: revert-layer\` to fall back to the previous cascade layer.

## Gotchas

- **"Inline beats everything"** — it does not; \`!important\` in a stylesheet beats an inline style.
- **Treating \`:is()\` as light like \`:where()\`** — \`:is(.a, #id)\` drags the weight of \`#id\` along.
- **Expecting an inherited color to beat \`*\`** — it never does; inheritance only applies when nothing declares the property.
- **Confusing \`all: unset\` with \`revert\`**: \`unset\` goes to initial/inherit and wipes browser styling, so a \`<button>\` stops looking like a button; \`revert\` restores exactly the UA defaults.
- **Class count never catches an id**: 100 classes is 0,100,0 — still less than 1,0,0.
- Likely follow-up: how should conflicts be resolved properly? Cascade layers plus \`:where()\` for the base, with \`!important\` reserved for utilities and hotfixes.`
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
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['position-sticky', 'stacking-context', 'layout'],
    question: {
      ru: 'Как именно работает `position: sticky`? Почему он иногда «не липнет» и как связан со стекинг-контекстом и скролл-контейнером?',
      en: 'How exactly does `position: sticky` work? Why does it sometimes "not stick", and how does it relate to stacking context and the scroll container?'
    },
    answer: {
      ru: `## Коротко

Sticky — это гибрид: элемент ведёт себя как \`relative\`, пока не доскроллит до заданного **порога** (\`top\`, \`bottom\`, \`left\`, \`right\`), а после этого «прилипает» к этой границе. При этом он **остаётся в потоке** (место под него не схлопывается) и **никогда не выходит за пределы своего родителя**.

Аналогия: магнитик на дверце холодильника. Пока двигаешь его по дверце — он едет свободно; упёрся в край — стоит на месте. Но если увезти сам холодильник, магнит уедет вместе с ним. Родитель — это холодильник, и за его границу sticky не выйдет.

## Как это работает по шагам

1. Браузер находит **скролл-контейнер** элемента: ближайший предок с \`overflow: auto/scroll/hidden\`, а если такого нет — вьюпорт.
2. Считает порог: \`top: 0\` значит «прилипнуть, когда верх элемента дойдёт до верхнего края скролл-контейнера».
3. До порога элемент рисуется на своём обычном месте, как \`relative\`.
4. После порога он визуально смещается, чтобы держаться на границе. В потоке его исходное место сохраняется — соседи не прыгают.
5. Диапазон прилипания ограничен **боксом родителя**: когда нижний край родителя уползает вверх, элемент выталкивается вместе с ним. Это и делает липкие заголовки секций.
6. Всё это считает **compositor thread** — layout на каждый кадр не пересчитывается, скролл остаётся плавным.

## Почему «не липнет» — четыре частые причины

1. **Не задан порог.** Без \`top\` (или другой стороны) sticky вообще не активируется. Самая частая ошибка.
2. **Overflow у предка.** Любой предок с \`overflow: hidden/auto/scroll\` становится скролл-контейнером. Если он сам не скроллится — прилипание визуально исчезает. У \`overflow: clip\` поведение особое: он скролл-контейнер не создаёт.
3. **Высота родителя.** Sticky живёт только внутри высоты родителя. Если родитель ровно по высоте элемента — липнуть просто негде.
4. **\`display\` родителя.** В \`flex\`/\`grid\` растянутый по \`align-items: stretch\` ребёнок занимает всю высоту трека — и снова не остаётся места для хода.

## Пример

\`\`\`css
.table-wrap {
  /* ВНИМАНИЕ: overflow здесь делает скролл-контейнером именно этот блок,
     и порог считается относительно него, а не вьюпорта. */
  max-block-size: 24rem;
  overflow: auto;
}

thead th {
  position: sticky;
  top: 0;            /* обязательный порог — без него прилипания не будет */
  z-index: 1;        /* иначе строки проедут поверх шапки */
  background: white; /* непрозрачный фон, иначе контент просвечивает */
}

/* Ловушка: transform у предка создаёт stacking context
   и запирает z-index прилипшей шапки внутри него. */
.parent { /* transform: translateZ(0);  <- z-index окажется заперт */ }
\`\`\`

Почему так: sticky создаёт позиционный контекст, и без \`z-index\` следующий контент спокойно перекроет прилипшую шапку. А если предок создаёт **stacking context** — через \`transform\`, \`filter\`, \`will-change\`, \`opacity < 1\` — то z-index sticky ограничен этим контекстом и наружу не действует.

## Что сказать на собеседовании

> \`position: sticky\` — это \`relative\` до достижения порога и \`fixed\`-подобное поведение после: элемент остаётся в потоке, но визуально держится у заданной границы скролл-контейнера. Порог обязателен: без \`top\` или другой стороны sticky просто не работает. Скролл-контейнером становится ближайший предок с \`overflow: auto/scroll/hidden\`, а не всегда вьюпорт — отсюда классический баг «не липнет». Диапазон прилипания ограничен боксом родителя: когда родитель уезжает, элемент уезжает с ним. Sticky создаёт позиционный контекст, поэтому ему нужен \`z-index\` и непрозрачный фон; если предок создаёт stacking context через \`transform\` или \`filter\`, z-index запирается внутри него. По производительности sticky обрабатывается на compositor thread, скролл остаётся плавным; проверяю через Layers и Rendering в DevTools.

## Ловушки

- **Забыли \`top: 0\`** — sticky тихо ведёт себя как \`static\`, ошибок нет.
- **\`overflow: hidden\` на любом предке** (часто добавлен ради клиппинга) — самый частый убийца sticky.
- **Родитель ровно по высоте элемента** — прилипать некуда, хода нет.
- **Нет \`z-index\` или прозрачный фон** — контент просвечивает и наезжает на шапку.
- **\`transform\` у предка** запирает z-index в чужом stacking context, и шапка внезапно оказывается под контентом.
- **Десятки sticky-элементов с тяжёлым paint** — compositor перестаёт спасать, скролл начинает дёргаться.
- Спросят следом: чем отличается от \`fixed\` — \`fixed\` уходит из потока и позиционируется от вьюпорта (кроме случая с \`transform\` у предка), а sticky остаётся в потоке и привязан к скролл-контейнеру и границам родителя.`,
      en: `## In short

Sticky is a hybrid: the element behaves like \`relative\` until scrolling reaches its **threshold** (\`top\`, \`bottom\`, \`left\`, \`right\`), then it "sticks" to that edge. It **stays in flow** the whole time (its space is never collapsed) and **never escapes its parent's box**.

Analogy: a magnet on a fridge door. Slide it around and it moves freely; push it into the edge and it stays put. But wheel the fridge away and the magnet goes with it. The parent is the fridge, and sticky never leaves it.

## How it works, step by step

1. The browser finds the element's **scroll container**: the nearest ancestor with \`overflow: auto/scroll/hidden\`, or the viewport if there is none.
2. It resolves the threshold: \`top: 0\` means "stick once the element's top reaches the scroll container's top edge".
3. Before the threshold the element paints in its normal place, exactly like \`relative\`.
4. After the threshold it is visually offset to hold the edge. Its original slot in flow is preserved, so neighbours never jump.
5. The sticking range is bounded by the **parent's box**: when the parent's bottom edge scrolls up, the element is pushed out with it. That is exactly what makes sticky section headers work.
6. All of this runs on the **compositor thread** — no per-frame layout, so scrolling stays smooth.

## Why it "won't stick" — the four usual causes

1. **No threshold.** Without \`top\` (or another side) sticky never activates at all. The most common mistake by far.
2. **Ancestor overflow.** Any ancestor with \`overflow: hidden/auto/scroll\` becomes the scroll container. If that container does not itself scroll, the sticking visually disappears. \`overflow: clip\` behaves differently: it does not create a scroll container.
3. **Parent height.** Sticky only lives inside the parent's height. If the parent is exactly as tall as the element, there is simply nowhere to stick.
4. **Parent \`display\`.** In \`flex\`/\`grid\`, a child stretched by \`align-items: stretch\` fills the whole track — again leaving no travel room.

## Example

\`\`\`css
.table-wrap {
  /* NOTE: overflow here makes THIS box the scroll container,
     so thresholds are measured against it, not the viewport. */
  max-block-size: 24rem;
  overflow: auto;
}

thead th {
  position: sticky;
  top: 0;            /* required threshold — without it there is no sticking */
  z-index: 1;        /* otherwise rows scroll over the header */
  background: white; /* opaque, or content shows through */
}

/* Pitfall: an ancestor transform creates a stacking context
   and traps the stuck header's z-index inside it. */
.parent { /* transform: translateZ(0);  <- z-index would be confined */ }
\`\`\`

Why: sticky creates a positioned context, and without \`z-index\` the following content happily paints over the stuck header. And if an ancestor creates a **stacking context** — via \`transform\`, \`filter\`, \`will-change\`, \`opacity < 1\` — the sticky's z-index is confined to that context and has no effect outside it.

## What to say in the interview

> \`position: sticky\` behaves like \`relative\` until its threshold and fixed-like afterwards: the element stays in flow but visually holds an edge of its scroll container. The threshold is mandatory — with no \`top\` or other side, sticky does nothing. The scroll container is the nearest ancestor with \`overflow: auto/scroll/hidden\`, not always the viewport, which is the classic "it won't stick" bug. The sticking range is bounded by the parent's box: when the parent scrolls away, the element goes with it. Sticky creates a positioned context, so it needs a \`z-index\` and an opaque background; if an ancestor creates a stacking context via \`transform\` or \`filter\`, that z-index is trapped inside it. Performance-wise sticky is handled on the compositor thread, so scrolling stays smooth; I verify with the Layers and Rendering tools in DevTools.

## Gotchas

- **Forgetting \`top: 0\`** — sticky silently behaves like \`static\`, with no error anywhere.
- **\`overflow: hidden\` on any ancestor** (often added just for clipping) — the single most common sticky killer.
- **A parent exactly as tall as the element** — no travel range, so nothing to stick to.
- **No \`z-index\` or a transparent background** — content bleeds through and rides over the header.
- **A \`transform\` on an ancestor** traps the z-index in someone else's stacking context, and the header suddenly sits under the content.
- **Dozens of sticky elements with heavy paint** — the compositor stops saving you and scrolling starts to stutter.
- Likely follow-up: how does it differ from \`fixed\`? \`fixed\` leaves flow and positions against the viewport (except under an ancestor \`transform\`), while sticky stays in flow and is bound to its scroll container and its parent's edges.`
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
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['variable-fonts', 'font-subsetting', 'cls'],
    question: {
      ru: 'Как оптимизировать веб-шрифты: вариативные шрифты, сабсеттинг, `font-display`, `size-adjust` и предотвращение CLS?',
      en: 'How do you optimize web fonts: variable fonts, subsetting, `font-display`, `size-adjust`, and preventing CLS?'
    },
    answer: {
      ru: `## Коротко

Шрифт — это картинка, без которой не показать текст. Пока файл едет, браузер либо ничего не рисует, либо рисует системным шрифтом, а потом подменяет — и текст прыгает. Отсюда три задачи: **меньше байт**, **раньше начать грузить**, **не сдвинуть верстку при подмене**.

Аналогия: багаж на регистрации. Сабсеттинг — выкладываем из чемодана всё, что не понадобится в поездке (кириллицу, если сайт только на латинице). Вариативный шрифт — вместо восьми комплектов одежды берём один трансформер. WOFF2 — вакуумный пакет. А \`size-adjust\` — это когда запасная одежда занимает ровно тот же объём, что и основная, поэтому чемодан не меняет форму при замене.

## Что делать по порядку

1. **Формат.** Только \`woff2\` — это brotli-сжатый формат, примерно на 30% меньше WOFF. Всегда первым в \`src\`.
2. **Сабсеттинг.** Вырезать неиспользуемые глифы, например оставить только latin. \`unicode-range\` в \`@font-face\` заставит браузер качать сабсет **только если на странице есть такие символы** — русский файл не поедет на английской странице.
3. **Вариативный шрифт.** Один файл вместо 4-8 начертаний, ось \`wght\`/\`slnt\` управляется через \`font-weight\` или \`font-variation-settings\`. Выгодно, если реально используете больше двух начертаний.
4. **Ранняя загрузка.** \`<link rel="preload" as="font" type="font/woff2" crossorigin>\` для 1-2 критичных файлов. Атрибут \`crossorigin\` **обязателен**: шрифты грузятся в anonymous-режиме, и без него браузер скачает файл дважды. Для стороннего хоста добавить \`preconnect\` — экономит RTT на DNS и TLS.
5. **\`font-display\`.** \`swap\` — текст виден сразу системным шрифтом, потом подменяется: платим FOUT и сдвигом. \`optional\` — браузер вправе вообще не применить шрифт на медленной сети: сдвигов нет, это лучший выбор по CLS.
6. **Подогнать метрики fallback.** Объявить второй \`@font-face\` поверх локального системного шрифта и подкрутить \`size-adjust\`, \`ascent-override\`, \`descent-override\` так, чтобы он занимал ровно столько же места. Тогда подмена **бесшовная** — нулевой layout shift.

## Пример

\`\`\`css
/* Вариативный шрифт + сабсет по unicode-range */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2-variations');
  font-weight: 100 900;        /* один файл на весь диапазон */
  font-display: optional;      /* лучший выбор по CLS */
  unicode-range: U+0000-00FF;  /* только latin */
}

/* Fallback с подогнанными метриками => подмена без сдвига */
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  ascent-override: 90%;
  descent-override: 22%;
  size-adjust: 107%;
}

body { font-family: 'Inter', 'Inter Fallback', sans-serif; }
\`\`\`

Почему так: без второго \`@font-face\` Arial и Inter дают разную высоту строки, и в момент подмены весь текст ниже уезжает — это и есть CLS. С подогнанными метриками блок текста занимает одинаковую площадь до и после загрузки.

## Как измерять

Лабораторно — Lighthouse (CLS, «Ensure text remains visible during webfont load») и вкладка Network с фильтром по шрифтам. В поле (RUM) — библиотека web-vitals или \`PerformanceObserver\` по типу \`layout-shift\`. Лабораторные цифры покажут проблему на быстрой машине лишь частично: FOUT и сдвиг проявляются на медленной сети, поэтому обязательно троттлинг и обязательно поле. Цель по **CLS — меньше 0.1**.

## Что сказать на собеседовании

> Стратегия по шрифтам — меньше байт, раньше загрузка, ноль сдвигов. Байты: только \`woff2\`, сабсеттинг по \`unicode-range\`, чтобы браузер качал набор глифов только при наличии таких символов, и вариативный шрифт вместо 4-8 файлов начертаний. Раньше: \`preload\` критичного файла обязательно с \`crossorigin\`, иначе будет двойная загрузка, плюс \`preconnect\` к чужому хосту. Сдвиги: \`font-display: swap\` даёт мгновенный текст, но FOUT и скачок, а \`optional\` разрешает браузеру не применять шрифт на медленной сети и потому лучше всего по CLS. Идеальный рецепт — fallback-\`@font-face\` поверх системного шрифта с \`size-adjust\`, \`ascent-override\` и \`descent-override\`, подогнанными под основной: подмена становится бесшовной. Проверяю в Lighthouse и по полевому CLS, цель — меньше 0.1.

## Ловушки

- **\`preload\` без \`crossorigin\`** — файл скачается дважды, и preload только навредит.
- **Preload всех начертаний** — забиваем канал и отодвигаем LCP-картинку. Прелоадим один-два реально критичных файла.
- **\`font-display: block\`** (и дефолтное поведение) — невидимый текст до 3 секунд, FOIT, проваленный FCP.
- **Забыли \`unicode-range\`** — на латинской странице всё равно скачается кириллический сабсет.
- **Вариативный шрифт «за компанию»**: если нужны только regular и bold, один var-файл может весить больше двух статических.
- **Метрики fallback скопированы из чужой статьи** — они зависят от конкретной пары шрифтов; считайте под свою (например, инструментами вроде capsize).
- Спросят следом: лаборатория против поля — Lighthouse на быстрой машине сдвиг может не поймать вовсе, а RUM покажет реальный CLS на 3G.`,
      en: `## In short

A font is an image you cannot show text without. While the file is in flight the browser either paints nothing or paints in a system font and swaps later — and the text jumps. Hence three jobs: **fewer bytes**, **start loading earlier**, **no layout shift on swap**.

Analogy: luggage at check-in. Subsetting is taking out everything you will not need on the trip (Cyrillic, if the site is Latin-only). A variable font is one convertible outfit instead of eight. WOFF2 is a vacuum bag. And \`size-adjust\` is when the spare outfit takes up exactly the same volume as the original, so the suitcase never changes shape when you swap them.

## What to do, in order

1. **Format.** \`woff2\` only — a brotli-compressed format roughly 30% smaller than WOFF. Always first in \`src\`.
2. **Subsetting.** Strip unused glyphs, e.g. keep latin only. \`unicode-range\` in \`@font-face\` makes the browser fetch a subset **only when matching characters appear** — the Cyrillic file never ships on an English page.
3. **Variable font.** One file instead of 4-8 weights; the \`wght\`/\`slnt\` axis is driven by \`font-weight\` or \`font-variation-settings\`. Worth it when you genuinely use more than two weights.
4. **Load early.** \`<link rel="preload" as="font" type="font/woff2" crossorigin>\` for one or two critical files. \`crossorigin\` is **mandatory**: fonts fetch in anonymous mode, and without it the browser downloads the file twice. For a third-party host add \`preconnect\` to save the DNS and TLS round trips.
5. **\`font-display\`.** \`swap\` shows text immediately in a system font and swaps later, paying with FOUT and a shift. \`optional\` allows the browser to skip the font entirely on a slow network: no shift at all, so it is the best choice for CLS.
6. **Match the fallback metrics.** Declare a second \`@font-face\` over a local system font and tune \`size-adjust\`, \`ascent-override\` and \`descent-override\` so it occupies exactly the same space. Then the swap is **seamless** — zero layout shift.

## Example

\`\`\`css
/* Variable font + subset via unicode-range */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2-variations');
  font-weight: 100 900;        /* one file covers the whole range */
  font-display: optional;      /* best choice for CLS */
  unicode-range: U+0000-00FF;  /* latin only */
}

/* Metric-matched fallback => swap with no shift */
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  ascent-override: 90%;
  descent-override: 22%;
  size-adjust: 107%;
}

body { font-family: 'Inter', 'Inter Fallback', sans-serif; }
\`\`\`

Why: without that second \`@font-face\`, Arial and Inter produce different line heights, so at swap time everything below the text slides down — that is CLS. With matched metrics the block of text occupies the same area before and after the font loads.

## How to measure it

In the lab: Lighthouse (CLS, plus "Ensure text remains visible during webfont load") and the Network panel filtered to fonts. In the field (RUM): the web-vitals library or a \`PerformanceObserver\` on \`layout-shift\`. Lab numbers only half tell the story on a fast machine — FOUT and the shift show up on slow networks, so always throttle and always look at field data too. The **CLS target is under 0.1**.

## What to say in the interview

> The font strategy is fewer bytes, earlier load, zero shift. Bytes: \`woff2\` only, subsetting via \`unicode-range\` so the browser fetches a glyph set only when those characters appear, and a variable font instead of 4-8 static weights. Earlier: \`preload\` the critical file, always with \`crossorigin\` or it downloads twice, plus \`preconnect\` for a third-party host. Shift: \`font-display: swap\` gives instant text but FOUT and a jump, while \`optional\` lets the browser skip the font on a slow connection and is therefore best for CLS. The ideal recipe is a fallback \`@font-face\` over a system font with \`size-adjust\`, \`ascent-override\` and \`descent-override\` tuned to the real font, which makes the swap seamless. I verify in Lighthouse and against field CLS, targeting under 0.1.

## Gotchas

- **\`preload\` without \`crossorigin\`** — the file downloads twice and the preload actively hurts.
- **Preloading every weight** — you saturate the connection and push out the LCP image. Preload one or two genuinely critical files.
- **\`font-display: block\`** (and the default behaviour) — invisible text for up to 3 seconds, FOIT, and a wrecked FCP.
- **Forgetting \`unicode-range\`** — the Cyrillic subset still downloads on a Latin-only page.
- **A variable font "because modern"**: if you only need regular and bold, one variable file can weigh more than two static ones.
- **Fallback metrics copied from someone's blog post** — they depend on the specific font pair; compute your own (tools like capsize).
- Likely follow-up: lab vs field — Lighthouse on a fast machine may never catch the shift at all, while RUM shows the real CLS on 3G.`
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
    category: 'network-browser',
    level: 'Expert',
    tags: ['http3', 'multiplexing', 'compression'],
    question: {
      ru: 'Сравните HTTP/2 и HTTP/3: мультиплексирование, head-of-line blocking, приоритезация. Чем gzip отличается от brotli?',
      en: 'Compare HTTP/2 and HTTP/3: multiplexing, head-of-line blocking, prioritization. How does gzip differ from brotli?'
    },
    answer: {
      ru: `## Коротко

HTTP/2 научился гонять много запросов по **одному** соединению параллельно. Но соединение это — TCP, и потеря одного пакета тормозит сразу все запросы. HTTP/3 переехал на **QUIC поверх UDP**, где у каждого потока своя доставка, и эта общая пробка исчезла.

Аналогия: HTTP/1.1 — одна полоса, машины едут гуськом. HTTP/2 — шоссе на много полос, но все они на одном мосту: заглох грузовик в одной полосе (потерялся пакет) — мост встаёт целиком. HTTP/3 — каждая полоса на своей эстакаде: заглохший грузовик мешает только своей полосе.

## Как это работает по шагам

1. **HTTP/2, мультиплексирование.** Одно TCP-соединение, внутри — независимые **streams**, данные режутся на бинарные фреймы. Домен-шардинг, спрайты и конкатенация из HTTP/1.1 больше не нужны.
2. **HPACK** сжимает заголовки, что заметно на сотнях мелких запросов с одинаковыми куками.
3. **Server Push** был, но фактически удалён: он плохо дружил с кэшем и слал то, что у клиента уже есть. Заменён на \`103 Early Hints\` и \`preload\`.
4. **Проблема HTTP/2.** Streams независимы **логически**, но лежат на одном TCP. TCP обязан отдавать байты строго по порядку, поэтому один потерянный пакет останавливает **все** streams — это **TCP head-of-line blocking** на транспортном уровне.
5. **HTTP/3 и QUIC.** Транспорт — UDP, поверх него QUIC со своей нумерацией и контролем потерь **на каждый stream**. Потеря в одном потоке не блокирует остальные — HOL blocking на транспорте устранён.
6. **Рукопожатие.** TLS 1.3 встроен в QUIC: установка за **1-RTT**, при возобновлении сессии — **0-RTT**.
7. **Connection migration.** Соединение опознаётся по Connection ID, а не по паре IP-порт, поэтому переход Wi-Fi → LTE переживается без нового хендшейка.
8. **Приоритезация.** В HTTP/2 было сложное дерево зависимостей, реализованное в серверах плохо. В HTTP/3 — простая схема **Extensible Priorities**: \`urgency\` и \`incremental\` через заголовок или фрейм, браузер прямо сигналит важность LCP-ресурса.

## gzip vs brotli

- **gzip** (DEFLATE) — универсален и быстр, но сжимает слабее.
- **brotli** (\`Content-Encoding: br\`) — со встроенным статическим словарём под веб-текст; на высоких уровнях даёт **на 15-25% меньше** для HTML/CSS/JS.
- **Статика**: жать заранее, на сборке, **максимальным уровнем 11** — цена платится один раз.
- **Динамика**: уровень **4-5**, это баланс CPU и задержки; уровень 11 на лету добавит латентности больше, чем сэкономит байт.
- Всегда отдавать brotli с фолбэком на gzip по заголовку \`Accept-Encoding\`.

## Пример

\`\`\`nginx
# Отдаём заранее сжатые файлы, договариваясь по Accept-Encoding
brotli_static on;          # file.br, собранный на деплое уровнем 11
gzip_static  on;           # фолбэк

# Хешированные ассеты помечаем immutable — ревалидация не нужна вообще
location ~* \\.[0-9a-f]{8}\\.(js|css|woff2)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# Проверить, что реально согласовалось:
#   curl -I --http3 https://example.com/app.js
#   HTTP/3 200
#   content-encoding: br
\`\`\`

Почему так: \`_static\`-директивы отдают уже готовый \`.br\`-файл вместо сжатия на каждый запрос — нулевой CPU в рантайме при максимальной степени сжатия. А в DevTools протокол видно в колонке Protocol на вкладке Network (\`h2\`, \`h3\`), кодировку — в заголовке ответа.

## Что сказать на собеседовании

> HTTP/2 дал мультиплексирование: много запросов в одном TCP-соединении через независимые streams с бинарным фреймингом, плюс HPACK для заголовков; шардинг доменов и спрайты стали не нужны. Но streams независимы только логически — TCP отдаёт байты по порядку, поэтому потеря одного пакета тормозит все потоки, это TCP head-of-line blocking. HTTP/3 работает поверх QUIC на UDP, где контроль потерь свой у каждого потока, и транспортный HOL blocking исчезает; TLS 1.3 встроен, установка за 1-RTT и 0-RTT при возобновлении, а connection migration по Connection ID переживает переключение Wi-Fi на LTE. Приоритезация в HTTP/3 упростилась до Extensible Priorities с \`urgency\` и \`incremental\`. По сжатию: brotli на 15-25% лучше gzip для текста, статику жму уровнем 11 на сборке, динамику — 4-5, с фолбэком на gzip по \`Accept-Encoding\`.

## Ловушки

- **«HTTP/2 полностью убрал head-of-line blocking»** — только на уровне HTTP; на уровне TCP он остался, и его убрал именно QUIC.
- **Домен-шардинг на HTTP/2 и выше вредит**: лишние соединения, лишние TLS-рукопожатия, сломанное сжатие заголовков.
- **Ждут, что HTTP/3 всегда быстрее** — на стабильной проводной сети разница мала, выигрыш заметен при потерях и на мобильных.
- **Brotli уровня 11 на лету** для динамических ответов — CPU и TTFB вырастут сильнее, чем упадёт вес.
- **Сжимать уже сжатое** (\`jpg\`, \`png\`, \`woff2\`) — только трата CPU, файлы уже сжаты.
- **0-RTT небезопасен для неидемпотентных запросов** — данные из 0-RTT можно переиграть (replay), поэтому там только GET.
- Спросят следом: как проверить — колонка Protocol в DevTools Network, \`curl -I --http3\`, и заголовок \`content-encoding\` в ответе.`,
      en: `## In short

HTTP/2 learned to run many requests in parallel over **one** connection. But that connection is TCP, and a single lost packet stalls every request on it. HTTP/3 moved to **QUIC over UDP**, where each stream has its own delivery, and that shared traffic jam disappears.

Analogy: HTTP/1.1 is a single-lane road, cars nose to tail. HTTP/2 is a multi-lane highway — but all lanes cross one bridge: a truck breaks down in one lane (a packet is lost) and the whole bridge stops. HTTP/3 gives each lane its own flyover: the broken-down truck only blocks its own lane.

## How it works, step by step

1. **HTTP/2 multiplexing.** One TCP connection carrying independent **streams**, with data cut into binary frames. Domain sharding, sprites and concatenation from HTTP/1.1 become unnecessary.
2. **HPACK** compresses headers, which matters a lot across hundreds of small requests carrying identical cookies.
3. **Server Push** existed but is effectively removed: it interacted badly with caching and pushed things the client already had. Replaced by \`103 Early Hints\` and \`preload\`.
4. **HTTP/2's flaw.** Streams are independent **logically**, but they sit on one TCP connection, and TCP must deliver bytes strictly in order — so one lost packet stalls **all** streams. That is **TCP head-of-line blocking** at the transport layer.
5. **HTTP/3 and QUIC.** The transport is UDP, with QUIC on top providing its own sequencing and **per-stream** loss recovery. A loss in one stream does not block the others — transport-level HOL blocking is gone.
6. **Handshake.** TLS 1.3 is built into QUIC: **1-RTT** setup, and **0-RTT** on session resumption.
7. **Connection migration.** The connection is identified by a Connection ID rather than the IP-port pair, so switching Wi-Fi to LTE survives with no new handshake.
8. **Prioritization.** HTTP/2 had a complex dependency tree that servers implemented poorly. HTTP/3 uses the simpler **Extensible Priorities** scheme — \`urgency\` and \`incremental\` via a header or frame — so the browser signals LCP resource importance directly.

## gzip vs brotli

- **gzip** (DEFLATE) — universal and fast, but compresses less.
- **brotli** (\`Content-Encoding: br\`) — ships a static dictionary tuned for web text; at high levels it produces **15-25% smaller** HTML/CSS/JS.
- **Static assets**: precompress at build time at the **maximum level, 11** — the cost is paid once.
- **Dynamic responses**: level **4-5**, the CPU/latency balance; level 11 on the fly adds more latency than the bytes it saves.
- Always serve brotli with a gzip fallback negotiated through \`Accept-Encoding\`.

## Example

\`\`\`nginx
# Serve precompressed files, negotiating via Accept-Encoding
brotli_static on;          # file.br built at deploy time at level 11
gzip_static  on;           # fallback

# Content-hashed assets marked immutable — no revalidation at all
location ~* \\.[0-9a-f]{8}\\.(js|css|woff2)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# Check what was actually negotiated:
#   curl -I --http3 https://example.com/app.js
#   HTTP/3 200
#   content-encoding: br
\`\`\`

Why it is written this way: the \`_static\` directives hand over a ready-made \`.br\` file instead of compressing per request — zero runtime CPU at maximum compression. In DevTools the protocol shows up in the Network panel's Protocol column (\`h2\`, \`h3\`), and the encoding in the response headers.

## What to say in the interview

> HTTP/2 brought multiplexing: many requests over one TCP connection through independent streams with binary framing, plus HPACK header compression; domain sharding and sprites became pointless. But the streams are independent only logically — TCP delivers bytes in order, so one lost packet stalls every stream. That is TCP head-of-line blocking. HTTP/3 runs over QUIC on UDP with per-stream loss recovery, which removes transport-level HOL blocking; TLS 1.3 is built in, giving 1-RTT setup and 0-RTT on resumption, and connection migration by Connection ID survives a Wi-Fi to LTE switch. Prioritization simplified to Extensible Priorities with \`urgency\` and \`incremental\`. On compression, brotli beats gzip by 15-25% on text; I precompress static assets at level 11 at build time and use level 4-5 for dynamic responses, with a gzip fallback via \`Accept-Encoding\`.

## Gotchas

- **"HTTP/2 removed head-of-line blocking entirely"** — only at the HTTP layer; at the TCP layer it remained, and QUIC is what actually removed it.
- **Domain sharding hurts on HTTP/2 and up**: extra connections, extra TLS handshakes, broken header compression.
- **Expecting HTTP/3 to always be faster** — on a stable wired network the difference is small; the win shows up under packet loss and on mobile.
- **Brotli level 11 on the fly** for dynamic responses — CPU and TTFB grow more than the payload shrinks.
- **Compressing already-compressed assets** (\`jpg\`, \`png\`, \`woff2\`) — pure CPU waste, they are compressed already.
- **0-RTT is unsafe for non-idempotent requests** — 0-RTT data can be replayed, so restrict it to GET.
- Likely follow-up: how do you check? The Protocol column in DevTools Network, \`curl -I --http3\`, and the \`content-encoding\` response header.`
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
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['inp', 'scheduler', 'long-tasks'],
    question: {
      ru: 'Глубже про INP: что такое long tasks и TBT, как уступать main thread через `scheduler.postTask`, `isInputPending` и yielding?',
      en: 'INP deep dive: what are long tasks and TBT, and how do you yield the main thread via `scheduler.postTask`, `isInputPending`, and yielding?'
    },
    answer: {
      ru: `## Коротко

В браузере один main thread, и он делает всё по очереди: выполняет JS, считает layout, красит. Пока крутится одна длинная функция, клик пользователя просто **лежит в очереди** — интерфейс кажется зависшим. **INP** измеряет именно это: сколько прошло от взаимодействия до следующего **отрисованного** кадра. Цель — **меньше 200 мс**.

Аналогия: касса в магазине, одна на всех. Если кассир взялся пробивать телегу на 200 позиций, все остальные стоят — даже тот, кто пришёл за жвачкой. Yielding — это когда кассир после каждых десяти товаров смотрит, не появился ли кто-то с одной покупкой, и пропускает его вперёд.

## Как это работает по шагам

1. Пользователь кликает. Событие встаёт в очередь main thread.
2. **Input delay** — сколько оно ждёт, пока поток занят чем-то другим.
3. **Processing time** — работа ваших обработчиков.
4. **Presentation delay** — style, layout, paint и вывод кадра на экран. Сумма трёх частей и есть INP одного взаимодействия; по странице берётся практически худшее (при большом числе взаимодействий — 98-й перцентиль).
5. **Long task** — любая работа в main thread дольше **50 мс**. Пока она идёт, обработать клик невозможно, и input delay растёт.
6. **TBT (Total Blocking Time)** суммирует «блокирующие» части длинных задач — всё сверх 50 мс — между FCP и TTI. Это **лабораторный** прокси для INP: в Lighthouse взаимодействий нет, поэтому меряют TBT.
7. Лечение — **дробить работу и уступать поток**: после куска работы отдать управление браузеру, чтобы тот успел обработать ввод и нарисовать кадр.

## Инструменты уступки потока

- **\`scheduler.yield()\`** — современный способ сказать «продолжу после того, как браузер разберётся с вводом». Возвращает промис и, в отличие от \`setTimeout(0)\`, встаёт в очередь **впереди** прочих задач, поэтому продолжение не откладывается в хвост.
- **\`setTimeout(r, 0)\`** — старый фолбэк: работает везде, но ваше продолжение уходит в конец очереди макрозадач.
- **\`navigator.scheduling.isInputPending()\`** — проверка «есть ли ожидающий ввод». Позволяет уступать **только когда это реально нужно**, а не после каждого чанка: меньше оверхеда на переключения.
- **\`scheduler.postTask()\`** — планирование с приоритетами \`user-blocking\`, \`user-visible\`, \`background\` и отменой через \`TaskController\`. Замена самодельным очередям на \`setTimeout\`: критичное выполняется раньше, фоновое не крадёт поток.

## Пример

\`\`\`ts
// Обрабатываем большой массив, не блокируя ввод; уступаем только при необходимости
async function processChunked<T>(items: T[], work: (x: T) => void) {
  for (let i = 0; i < items.length; i++) {
    work(items[i]);
    if (navigator.scheduling?.isInputPending?.()) {
      await (window as any).scheduler?.yield?.()
        ?? new Promise(r => setTimeout(r));
    }
  }
}

// Планирование с приоритетом и отменой
const controller = new TaskController({ priority: 'background' });
scheduler.postTask(() => buildSearchIndex(), { signal: controller.signal });
controller.abort(); // ушли со страницы — фоновая работа больше не нужна
\`\`\`

Почему так: без \`isInputPending\` пришлось бы уступать после каждого элемента, а это тысячи лишних переключений. Здесь мы прерываемся, только когда пользователь реально что-то нажал.

## Что сказать на собеседовании

> INP измеряет время от взаимодействия до следующего отрисованного кадра и складывается из input delay, processing time и presentation delay; цель — меньше 200 мс, по странице берётся практически худшее взаимодействие. Виноват обычно input delay: любая задача в main thread дольше 50 мс — это long task, и клик всё это время ждёт в очереди. В лаборатории это видно как TBT, сумма превышений над 50 мс между FCP и TTI. Лечение — дробить длинные задачи и уступать поток: \`scheduler.yield()\`, с фолбэком на \`setTimeout(0)\`, причём \`navigator.scheduling.isInputPending()\` позволяет уступать только когда ввод реально ждёт. \`scheduler.postTask()\` даёт приоритеты и отмену через \`TaskController\`. Чистые вычисления выношу в Web Worker. TBT — лабораторный прокси, реальный INP смотрю только в поле через web-vitals и RUM.

## Ловушки

- **Путают TBT и INP.** TBT — лабораторный, считается без взаимодействий и только до TTI; INP — полевой и по реальным кликам. Хороший TBT не гарантирует хорошего INP.
- **INP — не среднее и не первое взаимодействие**, а практически худшее по странице; один тяжёлый клик испортит метрику.
- **Забывают про presentation delay**: обработчик отработал за 5 мс, но вызвал перерасчёт layout на весь список — кадр всё равно поедет.
- **\`setTimeout(0)\` не равен \`scheduler.yield()\`**: продолжение уходит в хвост очереди, и другие задачи могут вклиниться перед ним.
- **Debounce не лечит INP сам по себе** — он лишь уменьшает частоту; если сама работа длинная, задержка остаётся.
- **Worker не спасёт от DOM-работы**: в воркере нет DOM, туда выносят чистые вычисления.
- Спросят следом: как измерить в проде — библиотека web-vitals, \`PerformanceObserver\` по \`event\` и \`long-animation-frame\`, плюс атрибуция, чтобы понять, какой именно обработчик тормозит.`,
      en: `## In short

The browser has one main thread and it does everything in sequence: run JS, compute layout, paint. While one long function runs, a user's click simply **sits in the queue** — the UI feels frozen. **INP** measures exactly that: the time from an interaction to the next **painted** frame. Target: **under 200 ms**.

Analogy: a single checkout lane. If the cashier starts on a 200-item cart, everyone else waits — including the person holding one pack of gum. Yielding is the cashier glancing up every ten items to see whether someone with a single item has arrived, and letting them through.

## How it works, step by step

1. The user clicks. The event is queued on the main thread.
2. **Input delay** — how long it waits there while the thread is busy with something else.
3. **Processing time** — your event handlers running.
4. **Presentation delay** — style, layout, paint, and getting the frame on screen. Those three add up to the INP of one interaction; the page reports essentially the worst one (the 98th percentile once there are many).
5. A **long task** is any main-thread work over **50 ms**. While it runs, no click can be processed and input delay grows.
6. **TBT (Total Blocking Time)** sums the blocking part of long tasks — everything above 50 ms — between FCP and TTI. It is the **lab** proxy for INP, since Lighthouse has no real interactions to measure.
7. The cure is to **break work up and yield the thread**: after each chunk, hand control back so the browser can process input and paint.

## Ways to yield the thread

- **\`scheduler.yield()\`** — the modern way to say "resume me once the browser has handled input". It returns a promise and, unlike \`setTimeout(0)\`, queues your continuation **ahead** of other pending tasks, so resuming is not pushed to the back.
- **\`setTimeout(r, 0)\`** — the old fallback: works everywhere, but your continuation lands at the end of the macrotask queue.
- **\`navigator.scheduling.isInputPending()\`** — asks whether input is waiting, so you yield **only when it actually matters** rather than after every chunk, cutting switching overhead.
- **\`scheduler.postTask()\`** — scheduling with \`user-blocking\`, \`user-visible\` and \`background\` priorities plus cancellation via \`TaskController\`. It replaces homegrown \`setTimeout\` queues: critical work runs sooner, background work stops stealing the thread.

## Example

\`\`\`ts
// Process a big array without blocking input; yield only when needed
async function processChunked<T>(items: T[], work: (x: T) => void) {
  for (let i = 0; i < items.length; i++) {
    work(items[i]);
    if (navigator.scheduling?.isInputPending?.()) {
      await (window as any).scheduler?.yield?.()
        ?? new Promise(r => setTimeout(r));
    }
  }
}

// Prioritized scheduling with cancellation
const controller = new TaskController({ priority: 'background' });
scheduler.postTask(() => buildSearchIndex(), { signal: controller.signal });
controller.abort(); // user navigated away — drop the background work
\`\`\`

Why: without \`isInputPending\` you would yield after every single item, which means thousands of pointless context switches. Here you only break off when the user has actually pressed something.

## What to say in the interview

> INP measures the time from an interaction to the next painted frame and breaks down into input delay, processing time and presentation delay; the target is under 200 ms and the page reports essentially its worst interaction. The usual culprit is input delay: any main-thread task over 50 ms is a long task, and the click waits in the queue the whole time. In the lab that shows up as TBT, the sum of everything over 50 ms between FCP and TTI. The fix is to break long tasks up and yield: \`scheduler.yield()\` with a \`setTimeout(0)\` fallback, and \`navigator.scheduling.isInputPending()\` so you only yield when input is actually waiting. \`scheduler.postTask()\` adds priorities and cancellation through \`TaskController\`. Pure computation goes to a Web Worker. TBT is only a lab proxy — I read real INP from the field via web-vitals and RUM.

## Gotchas

- **Confusing TBT with INP.** TBT is lab-only, measured with no interactions and only up to TTI; INP is field data from real clicks. Good TBT does not guarantee good INP.
- **INP is neither an average nor the first interaction** — it is effectively the worst on the page, so one heavy click ruins the metric.
- **Forgetting presentation delay**: a handler can finish in 5 ms and still trigger a full-list layout, so the frame is late anyway.
- **\`setTimeout(0)\` is not \`scheduler.yield()\`**: your continuation goes to the back of the queue and other tasks can cut in front.
- **Debouncing does not fix INP by itself** — it only reduces frequency; if the work is long, the delay remains.
- **A worker will not help with DOM work**: there is no DOM in a worker, so only pure computation moves there.
- Likely follow-up: how do you measure it in production? The web-vitals library, a \`PerformanceObserver\` on \`event\` and \`long-animation-frame\`, plus attribution to find which handler is slow.`
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
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['accessibility', 'focus-management', 'aria-live'],
    question: {
      ru: 'Разберите глубокую a11y: focus trap, roving tabindex, live regions, skip links и вычисление accessible name.',
      en: 'Cover deep a11y: focus trap, roving tabindex, live regions, skip links, and accessible name computation.'
    },
    answer: {
      ru: `## Коротко

Клавиатурный пользователь и скринридер видят страницу как **линейный список остановок**: Tab, Tab, Tab. Вся «глубокая» a11y — это управление этим маршрутом: куда фокус попадает, откуда не может уйти, что произносится вслух и каким именем называется элемент.

Аналогия: экскурсия по музею с закрытыми глазами. Skip link — короткая тропа мимо гардероба сразу в зал. Focus trap — вас завели в комнату с одной дверью, и вы не выпадете в коридор случайно. Roving tabindex — в зале один вход, а между экспонатами внутри вы ходите стрелками, а не выходя каждый раз в коридор. Live region — голос диктора, который сообщает новости, не отрывая вас от текущего экспоната.

## Пять механизмов по порядку

1. **Skip links.** Первая фокусируемая ссылка «Skip to content», визуально скрытая до фокуса. Позволяет перепрыгнуть навигацию из 40 ссылок. Требование **WCAG 2.4.1**.
2. **Focus trap** (модалки). При открытии: запомнить активный элемент, перевести фокус внутрь диалога, перехватывать \`Tab\`/\`Shift+Tab\` на границах и зацикливать, по \`Escape\` закрыть и **вернуть фокус на триггер**. Нативный \`<dialog>\` с \`showModal()\` делает и trap, и inert-фон сам — берите его.
3. **Roving tabindex.** В составном виджете (тулбар, табы, меню, грид) в Tab-порядке должен быть **ровно один** элемент с \`tabindex="0"\`, остальные — \`tabindex="-1"\`. Стрелками перемещаем этот «активный» tabindex. Иначе на табах из 12 вкладок пользователь получает 12 остановок вместо одной. Это паттерн **APG**, ровно то, чего ждут скринридеры.
4. **Live regions.** \`aria-live="polite"\` дожидается паузы, \`"assertive"\` прерывает речь немедленно. Озвучивают динамику **без перемещения фокуса** — тосты, статусы загрузки, «найдено 12 результатов». Сокращения: \`role="status"\` = polite, \`role="alert"\` = assertive. Регион обязан быть в DOM **заранее**: если вставить его вместе с текстом, первое сообщение не прозвучит.
5. **Accessible name computation.** Имя элемента вычисляется по приоритету: \`aria-labelledby\` → \`aria-label\` → нативная подпись (\`<label>\`, \`alt\`, текст внутри кнопки) → \`title\`. Знание порядка спасает от классического «button, кнопка без имени» и от случая, когда \`aria-label\` молча затирает видимый текст.

## Пример

\`\`\`html
<!-- Skip link: скрыт, пока не получил фокус -->
<a href="#main" class="skip-link">Skip to content</a>

<!-- Табы с roving tabindex: в Tab-порядке только активная вкладка -->
<div role="tablist">
  <button role="tab" aria-selected="true"  tabindex="0">Overview</button>
  <button role="tab" aria-selected="false" tabindex="-1">Details</button>
</div>

<!-- Живой регион существует заранее и озвучит асинхронный результат -->
<div role="status" aria-live="polite" id="search-status"></div>

<!-- Нативная модалка: focus trap и inert-фон бесплатно -->
<dialog id="dlg">
  <h2 id="dlg-title">Settings</h2>
  <button aria-labelledby="dlg-title">Save</button>
</dialog>
<style>.skip-link{position:absolute;left:-999px}.skip-link:focus{left:1rem}</style>
\`\`\`

Почему так: \`.skip-link\` уводится за экран через \`left\`, а не через \`display: none\` — скрытый через \`display\` или \`visibility\` элемент вылетает из Tab-порядка и перестаёт работать вообще.

## Что сказать на собеседовании

> Глубокая a11y — это управление фокусом и озвучкой. Skip link, первая фокусируемая ссылка, скрытая до фокуса, позволяет перепрыгнуть навигацию, это WCAG 2.4.1. В модалке нужен focus trap: запомнить триггер, увести фокус внутрь, зациклить Tab на границах, по Escape закрыть и вернуть фокус обратно; нативный \`<dialog showModal()>\` делает это и inert-фон сам. В составных виджетах применяю roving tabindex: только один элемент с \`tabindex="0"\`, остальные \`-1\`, перемещение стрелками — это паттерн APG. Динамику озвучиваю через live regions, \`polite\` ждёт паузы, \`assertive\` прерывает, и регион должен существовать в DOM заранее. Имя элемента считается по цепочке \`aria-labelledby\`, \`aria-label\`, нативная подпись, \`title\`. Целевой уровень — WCAG AA, контраст текста 4.5:1, для крупного 3:1. Проверяю через Accessibility tree в DevTools и axe.

## Ловушки

- **Live region добавляют в DOM вместе с текстом** — первое сообщение не озвучится. Пустой контейнер должен быть отрендерен заранее.
- **\`aria-label\` на элементе с видимым текстом** затирает его: пользователь читает одно, скринридер произносит другое, и голосовое управление ломается.
- **\`assertive\` на всё подряд** — речь постоянно прерывается, пользоваться невозможно. По умолчанию \`polite\`.
- **Забыли вернуть фокус** после закрытия модалки — фокус улетает в \`<body>\`, и навигация начинается сначала.
- **\`tabindex\` больше нуля** ломает естественный порядок обхода. Только \`0\` и \`-1\`.
- **Скрытие skip link через \`display: none\`** делает его нефокусируемым; уводите за экран позиционированием.
- Спросят следом: уровни WCAG — **A** минимум, **AA** целевой и юридический стандарт, **AAA** строгий; и чем автотесты не заменяют ручную проверку — axe ловит примерно треть проблем, остальное только клавиатурой и скринридером.`,
      en: `## In short

A keyboard user and a screen reader see the page as **a linear list of stops**: Tab, Tab, Tab. All of "deep" a11y is managing that route — where focus lands, where it cannot escape from, what gets announced, and what name each element is given.

Analogy: a museum tour with your eyes closed. A skip link is the shortcut past the cloakroom straight into the gallery. A focus trap is being shown into a room with one door, so you cannot wander into the corridor by accident. Roving tabindex means the gallery has one entrance, and inside it you move between exhibits with arrow keys instead of stepping back into the corridor each time. A live region is the announcer telling you the news without pulling you away from the exhibit.

## The five mechanisms, in order

1. **Skip links.** A first focusable "Skip to content" link, visually hidden until focused. It lets you jump past 40 nav links. Required by **WCAG 2.4.1**.
2. **Focus trap** (modals). On open: remember the active element, move focus into the dialog, intercept \`Tab\`/\`Shift+Tab\` at the boundaries and wrap around, and on \`Escape\` close and **restore focus to the trigger**. The native \`<dialog>\` with \`showModal()\` gives you the trap and an inert background for free — prefer it.
3. **Roving tabindex.** In a composite widget (toolbar, tabs, menu, grid) **exactly one** element carries \`tabindex="0"\`; the rest are \`tabindex="-1"\`, and arrow keys move that active tabindex. Otherwise a 12-tab strip gives the user 12 tab stops instead of one. This is the **APG** pattern and exactly what screen readers expect.
4. **Live regions.** \`aria-live="polite"\` waits for a pause, \`"assertive"\` interrupts speech immediately. They announce dynamic changes **without moving focus** — toasts, loading status, "12 results found". Shorthands: \`role="status"\` is polite, \`role="alert"\` is assertive. The region must exist in the DOM **beforehand**: insert it together with its text and the first message is never announced.
5. **Accessible name computation.** The name is resolved by priority: \`aria-labelledby\` → \`aria-label\` → the native label (\`<label>\`, \`alt\`, button text) → \`title\`. Knowing the order saves you from the classic "button, unlabelled" and from \`aria-label\` silently overriding visible text.

## Example

\`\`\`html
<!-- Skip link: hidden until focused -->
<a href="#main" class="skip-link">Skip to content</a>

<!-- Tabs with roving tabindex: only the active tab is tabbable -->
<div role="tablist">
  <button role="tab" aria-selected="true"  tabindex="0">Overview</button>
  <button role="tab" aria-selected="false" tabindex="-1">Details</button>
</div>

<!-- The live region exists up front and will announce the async result -->
<div role="status" aria-live="polite" id="search-status"></div>

<!-- Native modal: focus trap and inert backdrop for free -->
<dialog id="dlg">
  <h2 id="dlg-title">Settings</h2>
  <button aria-labelledby="dlg-title">Save</button>
</dialog>
<style>.skip-link{position:absolute;left:-999px}.skip-link:focus{left:1rem}</style>
\`\`\`

Why it is written this way: \`.skip-link\` is moved off screen with \`left\`, not \`display: none\` — anything hidden with \`display\` or \`visibility\` drops out of the tab order and stops working entirely.

## What to say in the interview

> Deep a11y is about managing focus and announcements. A skip link — the first focusable link, hidden until focused — lets keyboard users bypass navigation, per WCAG 2.4.1. A modal needs a focus trap: remember the trigger, move focus inside, wrap Tab at the boundaries, close on Escape and restore focus; the native \`<dialog showModal()>\` handles that plus the inert background for you. In composite widgets I use roving tabindex: one element at \`tabindex="0"\`, the rest at \`-1\`, arrow keys to move — the APG pattern. Dynamic updates go through live regions, where \`polite\` waits for a pause and \`assertive\` interrupts, and the region must exist in the DOM beforehand. The accessible name resolves through \`aria-labelledby\`, \`aria-label\`, the native label, then \`title\`. The target level is WCAG AA, with 4.5:1 text contrast and 3:1 for large text. I verify with the DevTools Accessibility tree and axe.

## Gotchas

- **Adding the live region together with its text** — the first message is never announced. The empty container must render up front.
- **\`aria-label\` on an element with visible text** overrides it: the user reads one thing, the screen reader says another, and voice control breaks.
- **\`assertive\` everywhere** — speech is constantly interrupted and the page becomes unusable. Default to \`polite\`.
- **Forgetting to restore focus** after closing a modal — focus falls back to \`<body>\` and navigation restarts from the top.
- **\`tabindex\` greater than zero** breaks the natural traversal order. Only \`0\` and \`-1\`.
- **Hiding the skip link with \`display: none\`** makes it unfocusable; move it off screen with positioning instead.
- Likely follow-up: the WCAG levels — **A** minimum, **AA** the target and legal standard, **AAA** strict; and why automated tests are not enough — axe catches roughly a third of issues, the rest requires a keyboard and a screen reader.`
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
    category: 'html-css-performance',
    level: 'Expert',
    tags: ['web-workers', 'offscreen-canvas', 'partial-hydration'],
    question: {
      ru: 'Как выносить тяжёлую работу с main thread (Web Workers, OffscreenCanvas) и что такое islands / partial hydration / resumability?',
      en: 'How do you offload heavy work from the main thread (Web Workers, OffscreenCanvas) and what are islands / partial hydration / resumability?'
    },
    answer: {
      ru: `## Коротко

Главный поток браузера — единственный, кто умеет трогать DOM и рисовать кадры. Значит, всё лишнее с него надо унести: **чистые вычисления — в Web Worker**, **отрисовку канваса — в OffscreenCanvas**, а **работу по «оживлению» SSR-разметки — раздробить или вообще не делать** (islands, resumability).

Аналогия: кухня ресторана с одним поваром у плиты. Пока он чистит два ведра картошки, ни одно блюдо не выходит в зал. Worker — это подсобник в соседнем помещении: чистит картошку параллельно, но к плите и к тарелкам (DOM) не подходит. А гидрация — это когда перед открытием повар зачем-то заново пробует каждое блюдо на витрине, хотя они уже готовы.

## Как это работает по шагам

1. **Web Worker** исполняет JS в **отдельном потоке** и не блокирует UI. Подходит для парсинга больших JSON, шифрования, обработки изображений, диффов, построения индексов.
2. Общение — через \`postMessage\`. По умолчанию данные проходят **структурное клонирование**: копия, и на больших объектах эта копия сама по себе становится долгой задачей.
3. **Transferable-объекты** (\`ArrayBuffer\`, \`MessagePort\`, \`ImageBitmap\`, \`OffscreenCanvas\`) передаются **без копирования** — передаётся владение. После передачи буфер на исходной стороне становится «отсоединённым» и недоступным. Для больших буферов это критично.
4. Ручной месседжинг быстро мутнеет — библиотеки вроде **Comlink** прячут его за прокси и обычными \`await\`-вызовами.
5. **OffscreenCanvas** позволяет рисовать **из воркера**: канвас переносится через \`transferControlToOffscreen()\`, и вся отрисовка 2D/WebGL уходит с main thread. Скролл и ввод остаются плавными даже при тяжёлых графиках и дашбордах.
6. У воркера **нет DOM**: нет \`document\`, нет \`window\`. Туда выносят только чистые вычисления и работу с канвасом.

## Стратегии гидрации

- **Классическая hydration (SSR).** Сервер прислал HTML, клиент заново строит дерево компонентов и навешивает обработчики **на всё**. Дорого, идёт одной длинной задачей — плохие TBT и INP.
- **Partial / progressive hydration.** Гидрируем только нужные части, по приоритету или по видимости.
- **Islands (Astro).** Страница — в основном статичный HTML, а интерактивные «острова» гидрируются изолированно и лениво: \`client:visible\`, \`client:idle\`. Резко режет объём клиентского JS.
- **Resumability (Qwik).** Фреймворк **сериализует состояние и ссылки на обработчики прямо в HTML** и **возобновляет** работу по первому событию, вместо того чтобы переисполнять всё дерево. Гидрация почти нулевая, JS подгружается лениво в момент взаимодействия — TBT близок к нулю.

## Пример

\`\`\`ts
// main.ts — уносим и отрисовку, и тяжёлый буфер в воркер, без копирования
const canvas = document.querySelector('canvas')!;
const offscreen = canvas.transferControlToOffscreen();
const worker = new Worker(new URL('./render.worker.ts', import.meta.url), {
  type: 'module',
});

const pixels = new ArrayBuffer(4 * 1920 * 1080);
worker.postMessage(
  { canvas: offscreen, pixels },
  [offscreen, pixels], // Transferables: владение переходит, копии нет
);

// render.worker.ts
self.onmessage = (e: MessageEvent) => {
  const ctx = e.data.canvas.getContext('2d');
  // ...рисуем кадры вне main thread; интерфейс остаётся отзывчивым
};
\`\`\`

Почему так: буфер на 8 МБ через структурное клонирование копировался бы десятки миллисекунд — то есть сам стал бы long task. Второй аргумент \`postMessage\` превращает копирование в передачу владения: стоимость близка к нулю, но \`pixels\` в main-потоке после этого больше использовать нельзя.

## Что сказать на собеседовании

> Главный поток единственный имеет доступ к DOM и рисует кадры, поэтому с него уносят всё, что можно. Чистые вычисления — парсинг больших JSON, крипту, обработку изображений — выношу в Web Worker; обмен идёт через \`postMessage\` со структурным клонированием, а для больших буферов через Transferable, где передаётся владение без копии, и исходный \`ArrayBuffer\` становится отсоединённым. Отрисовку канваса уношу через \`transferControlToOffscreen()\`, тогда 2D или WebGL рисуются в воркере и скролл остаётся плавным. DOM в воркере недоступен. По части SSR: классическая гидрация переисполняет всё дерево и навешивает обработчики на всё, это одна длинная задача и плохой TBT; partial и progressive hydration гидрируют по видимости, islands в Astro делают страницу статичной с ленивыми островками, а resumability в Qwik сериализует состояние и обработчики в HTML и возобновляет работу по событию, сводя TBT почти к нулю. Проверяю по INP и TBT в RUM.

## Ловушки

- **Ждут ускорения от воркера на мелких данных** — структурное клонирование само стоит денег, и на маленьких задачах пересылка съест выигрыш.
- **Пытаются трогать DOM из воркера** — там нет ни \`document\`, ни \`window\`, только вычисления и канвас.
- **Используют \`ArrayBuffer\` после передачи** — он отсоединён, доступ бросит ошибку. Передали — забыли.
- **OffscreenCanvas переносится один раз**: после \`transferControlToOffscreen()\` тот же канвас в main-потоке уже не порисовать.
- **Путают hydration и rendering**: SSR отдаёт HTML быстро и чинит FCP и LCP, но гидрация именно портит TBT и INP — это разные проблемы.
- **Islands не бесплатны**: много мелких островов дают много отдельных бандлов и запросов.
- Спросят следом: как понять, что упёрлись именно в main thread — вкладка Performance, полоса long tasks, \`long-animation-frame\` в \`PerformanceObserver\` и полевой INP.`,
      en: `## In short

The browser's main thread is the only one that can touch the DOM and paint frames. So everything else has to leave it: **pure computation goes to a Web Worker**, **canvas rendering goes to OffscreenCanvas**, and the work of "bringing SSR markup to life" gets **split up or skipped entirely** (islands, resumability).

Analogy: a restaurant kitchen with one cook at the stove. While he peels two buckets of potatoes, no dish reaches the dining room. A worker is the prep hand in the back room: peeling in parallel, but never allowed near the stove or the plates (the DOM). And hydration is the cook re-tasting every dish already sitting finished on the counter before opening.

## How it works, step by step

1. A **Web Worker** runs JS on a **separate thread** and never blocks the UI. Good for parsing large JSON, crypto, image processing, diffing, building indexes.
2. Communication goes through \`postMessage\`. By default the data goes through **structured cloning**: a copy — and on large objects that copy is itself a long task.
3. **Transferable objects** (\`ArrayBuffer\`, \`MessagePort\`, \`ImageBitmap\`, \`OffscreenCanvas\`) move **without copying** — ownership is handed over. After the transfer the buffer on the sending side is detached and unusable. For large buffers this is essential.
4. Hand-written messaging gets murky fast — libraries like **Comlink** hide it behind a proxy and ordinary \`await\` calls.
5. **OffscreenCanvas** lets you draw **from a worker**: the canvas is moved via \`transferControlToOffscreen()\` and all 2D/WebGL rendering leaves the main thread. Scroll and input stay smooth even with heavy charts and dashboards.
6. A worker has **no DOM**: no \`document\`, no \`window\`. Only pure computation and canvas work belong there.

## Hydration strategies

- **Classic hydration (SSR).** The server sent HTML, the client rebuilds the component tree and attaches handlers to **everything**. Expensive, and it arrives as one long task — bad TBT and INP.
- **Partial / progressive hydration.** Hydrate only what is needed, by priority or visibility.
- **Islands (Astro).** The page is mostly static HTML, with interactive "islands" hydrating in isolation and lazily: \`client:visible\`, \`client:idle\`. Cuts client JS sharply.
- **Resumability (Qwik).** The framework **serializes state and handler references straight into the HTML** and **resumes** on the first event instead of re-executing the whole tree. Hydration is close to zero and JS is fetched lazily on interaction — TBT approaches zero.

## Example

\`\`\`ts
// main.ts — move both the rendering and a heavy buffer to a worker, zero-copy
const canvas = document.querySelector('canvas')!;
const offscreen = canvas.transferControlToOffscreen();
const worker = new Worker(new URL('./render.worker.ts', import.meta.url), {
  type: 'module',
});

const pixels = new ArrayBuffer(4 * 1920 * 1080);
worker.postMessage(
  { canvas: offscreen, pixels },
  [offscreen, pixels], // Transferables: ownership moves, no copy
);

// render.worker.ts
self.onmessage = (e: MessageEvent) => {
  const ctx = e.data.canvas.getContext('2d');
  // ...draw frames off the main thread; the UI stays responsive
};
\`\`\`

Why: structured-cloning an 8 MB buffer would take tens of milliseconds — becoming a long task in its own right. The second argument to \`postMessage\` turns the copy into a transfer of ownership: near-zero cost, but \`pixels\` can no longer be used on the main thread afterwards.

## What to say in the interview

> The main thread is the only one with DOM access and the one that paints frames, so anything that can leave it should. Pure computation — parsing large JSON, crypto, image processing — goes to a Web Worker; messaging is \`postMessage\` with structured cloning, and for large buffers Transferables move ownership with no copy, leaving the original \`ArrayBuffer\` detached. Canvas rendering moves via \`transferControlToOffscreen()\`, so 2D or WebGL draws inside the worker and scrolling stays smooth. There is no DOM in a worker. On the SSR side: classic hydration re-executes the whole tree and attaches handlers everywhere, which is one long task and terrible TBT; partial and progressive hydration hydrate by visibility, Astro's islands keep the page static with lazy interactive spots, and Qwik's resumability serializes state and handlers into the HTML and resumes on an event, driving TBT near zero. I validate it with INP and TBT from RUM.

## Gotchas

- **Expecting a speedup from a worker on small payloads** — structured cloning costs real time, and on small tasks the messaging eats the win.
- **Trying to touch the DOM from a worker** — there is no \`document\` or \`window\` there, only computation and canvas.
- **Using an \`ArrayBuffer\` after transferring it** — it is detached and access throws. Transfer it and forget it.
- **OffscreenCanvas transfers once**: after \`transferControlToOffscreen()\` you can never draw to that canvas from the main thread again.
- **Conflating hydration with rendering**: SSR delivers HTML fast and fixes FCP and LCP, but it is hydration that wrecks TBT and INP — different problems.
- **Islands are not free**: many small islands mean many separate bundles and requests.
- Likely follow-up: how do you know the main thread is the bottleneck? The Performance panel's long-tasks track, \`long-animation-frame\` via \`PerformanceObserver\`, and field INP.`
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
