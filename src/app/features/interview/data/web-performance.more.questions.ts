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
      ru: `## В чём суть

Media query спрашивает «какой ширины **экран**?». Container query спрашивает «какой ширины **коробка, в которой я лежу**?». Поэтому одна и та же карточка сама перестраивается и в узком сайдбаре, и в широкой основной колонке — ей не нужно знать ни одного глобального брейкпоинта.

Аналогия: диван, который меряет не размер квартиры, а размер комнаты, куда его вносят. В кладовке складывается, в гостиной раскладывается — решение принимает сам диван, а не планировка квартиры.

**Какую проблему решает.** Компонент живёт в разных местах: карточка товара в сетке на 4 колонки, в сайдбаре на 300px, в модалке. Экран во всех случаях один и тот же — 1440px, и media query для всех трёх мест скажет одно: «широко». В итоге карточку в сайдбаре ломает «широкая» раскладка. Раньше это решали JavaScript-ом: \`ResizeObserver\` мерил обёртку и вешал классы \`.is-narrow\`/\`.is-wide\`. Container queries делают то же самое средствами CSS, без скрипта и без мигания после загрузки.

## Словарик терминов

- **Viewport** — видимая область окна браузера; от неё считаются media queries и единицы \`vw\`/\`vh\`.
- **Media query (\`@media\`)** — условие на свойства устройства и окна: ширина viewport, ориентация, тёмная тема.
- **Container query (\`@container\`)** — условие на размер или стиль ближайшего предка-контейнера.
- **Контейнер запроса (query container)** — предок, которого пометили \`container-type\`; именно его меряют правила \`@container\`.
- **\`container-type\`** — делает элемент контейнером: \`inline-size\` (только ширина), \`size\` (ширина и высота), \`normal\` (только style-запросы).
- **\`container-name\` и шорткат \`container\`** — имя контейнера, чтобы обращаться к конкретному предку: \`container: card / inline-size\`.
- **Inline и block оси** — inline-ось идёт вдоль строки текста (в русском и английском это ширина), block-ось — поперёк, по направлению строк (высота).
- **Containment (\`contain\`)** — обещание браузеру изолировать часть дерева: например, «размер этого блока не зависит от его содержимого» (size containment).
- **Единицы \`cqw\`, \`cqh\`, \`cqi\`, \`cqb\`, \`cqmin\`, \`cqmax\`** — проценты от размера контейнера: \`1cqi\` = 1% его inline-размера.
- **Style query** — \`@container style(--theme: dark)\`: условие на значение custom property контейнера, а не на размер.
- **\`ResizeObserver\`** — JS API, которое сообщает об изменении размеров элемента; старый способ делать «контейнерную» адаптивность.
- **Baseline** — отметка веб-платформы «работает во всех основных браузерах»; Baseline 2023 значит «везде с 2023 года».

## Как это работает под капотом

Главная сложность — избежать цикла. Размер блока обычно зависит от его содержимого, а стили содержимого теперь зависят от размера блока. Если бы это никак не ограничили, получилась бы петля: «контейнер стал шире → правило сработало → контент вырос → контейнер стал ещё шире...». Механизм устроен так:

1. Вы помечаете **предка** \`container-type: inline-size\`, поэтому браузер включает для него **inline-size containment**: ширина контейнера считается так, будто содержимого нет, — только из внешних условий (ширина родителя, \`width\`, flex/grid).
2. Плюс включаются style containment и независимый контекст форматирования, поэтому изменения внутри не утекают наружу через счётчики и обтекание.
3. Раз ширина контейнера от детей не зависит, браузер сначала считает её, а уже потом вычисляет стили детей — цикл разорван.
4. Для каждого элемента с правилом \`@container\` браузер ищет **ближайшего предка-контейнера**, который подходит по имени и умеет ответить на запрос (для \`min-height\` нужен \`size\`, \`inline-size\` высоту не знает).
5. Условие проверяется по размеру этого предка, подходящие правила применяются, затем раскладывается содержимое.
6. Когда контейнер меняет ширину (ресайз окна, свернули сайдбар), браузер перепроверяет условия только для элементов внутри него.
7. Себя элемент запросить не может: его собственный размер зависел бы от его же правил. Поэтому всегда нужен отдельный элемент-обёртка или хост компонента.

Важное уточнение к старым статьям: в ранних версиях спецификации \`container-type\` включал ещё и **layout containment**. По актуальной спецификации его нет, и проверка это подтверждает: в Chromium 151 \`position: fixed\`- и \`position: absolute\`-потомки контейнера позиционируются не относительно контейнера (в Firefox 150 для fixed-потомка — так же).

### Пример 1. Одна карточка, разные места

\`\`\`css
/* Хост объявляет себя контейнером */
.card-host { container-type: inline-size; container-name: card; }

.card { display: grid; gap: 0.5rem; }

@container card (min-width: 30rem) {
  .card {
    grid-template-columns: 8rem 1fr;
    font-size: clamp(0.9rem, 2cqi, 1.2rem); /* 1cqi = 1% ширины контейнера */
  }
}

/* Результат (Chromium 151):
   хост 300px  → одна колонка, font-size 16px (правило не сработало)
   хост 480px  → колонки 128px 344px, 2cqi = 9.6px → clamp → 14.4px
   хост 800px  → колонки 128px 664px, 2cqi = 16px  → 16px
   хост 1000px → колонки 128px 864px, 2cqi = 20px  → clamp → 19.2px */
\`\`\`

Правило висит на \`.card\`, а меряется \`.card-host\`. Экран во всех четырёх случаях одинаковый — 1280px, а результаты разные: каждая карточка смотрит только на свою коробку. \`30rem\` — это 480px при базовом шрифте 16px, поэтому хост 480px уже попадает в условие.

### \`container-type\`: какое значение выбрать

\`\`\`css
.sidebar  { container-type: inline-size; } /* следим за шириной — 95% случаев */
.panel    { container-type: size; height: 400px; } /* ширина и высота */
.sizebox  { container-type: size; }        /* без высоты → высота 0, контент вываливается */
\`\`\`

- **\`inline-size\`** — следим только за шириной. Высота по-прежнему растёт по контенту, поэтому это безопасный выбор по умолчанию.
- **\`size\`** — следим за обеими осями, но тогда и высота считается без учёта содержимого. Блок без явной высоты схлопывается в 0 (проверено в Chromium 151). Используйте только для блоков с заданной высотой: панели дашборда, полноэкранные секции.
- **\`normal\`** — значение по умолчанию у всех элементов: размерные запросы выключены, но элемент остаётся контейнером для style-запросов.

### \`container-name\` и выбор ближайшего контейнера

\`\`\`css
.layout { container: page / inline-size; }   /* шорткат: имя / тип */
.widget { container: widget / inline-size; }

@container (min-width: 400px) { .title { font-weight: 700; } }        /* ближайший подходящий */
@container page (min-width: 1000px) { .title { color: crimson; } }   /* именно .layout */
\`\`\`

Без имени правило берёт ближайшего предка-контейнера, способного ответить на запрос. При вложенных контейнерах это источник сюрпризов: вы думали о странице, а мерится виджет. Проверка в Chromium 151: внутри внешнего контейнера \`size\` (высота 300px) и внутреннего \`inline-size\` запрос \`(min-height: 100px)\` пропустил внутренний (он высоту не знает) и сработал по внешнему. Имя делает выбор явным.

### Единицы \`cqi\`, \`cqw\` и компания

\`\`\`css
.card-host { container-type: inline-size; width: 500px; }
.badge { width: 10cqi; }      /* 50px: 10% ширины контейнера */

.orphan { width: 10cqi; }     /* контейнера нет → считается от viewport: 128px при окне 1280px */
\`\`\`

\`cqw\`/\`cqh\` — проценты ширины и высоты контейнера, \`cqi\`/\`cqb\` — то же по inline и block осям (с учётом направления письма), \`cqmin\`/\`cqmax\` — от меньшей и большей стороны. Если подходящего контейнера нет, единицы считаются от «малого» viewport — поэтому они не ломаются, но и не делают того, что вы ждали. Идеальное применение — типографика внутри компонента: \`font-size: clamp(1rem, 4cqi, 2rem)\` растёт вместе с карточкой, а не с экраном.

### Style queries: запрос по значению custom property

\`\`\`css
.panel { --theme: dark; }

@container style(--theme: dark) {
  .panel__button { background: #222; color: #fff; }
}
\`\`\`

Здесь контейнером может быть любой элемент, даже без \`container-type\` (у всех по умолчанию \`normal\`). Поддержка неодинаковая: в Chromium 151 пример работает, в Firefox 150 — нет (проверено). Перед продом сверяйтесь с caniuse и держите запасной вариант без style-запросов.

### Media query против container query

- **\`@media\`** — для решений уровня страницы: сколько колонок у общего макета, показывать ли бургер-меню, печать, \`prefers-reduced-motion\`, \`prefers-color-scheme\`.
- **\`@container\`** — для решений уровня компонента: как карточке, таблице или форме разложиться в той ширине, которую ей дали.
- Они не конкурируют: страница решает раскладку media queries, компоненты внутри адаптируются container queries.

### Angular: хост компонента как контейнер

\`\`\`scss
// product-card.component.scss
:host {
  display: block;               // обязательно! хост по умолчанию inline
  container-type: inline-size;
}

@container (min-width: 30rem) {
  .card { grid-template-columns: 8rem 1fr; }
}
\`\`\`

Удобный приём: компонент сам объявляет свой хост контейнером, и снаружи ничего настраивать не нужно. Ловушка: хост-элемент Angular (\`<app-product-card>\`) — неизвестный браузеру тег, у него \`display: inline\`. Containment не применяется к inline-боксам, поэтому без \`display: block\` контейнер не создаётся, и \`@container\` молча не срабатывает (проверено в Chromium 151). Правила \`@container\` в стилях компонента с эмулированной инкапсуляцией работают как обычно.

### Как было раньше: \`ResizeObserver\`

\`\`\`ts
const ro = new ResizeObserver(([entry]) => {
  const width = entry.contentRect.width;
  host.classList.toggle('is-wide', width >= 480);   // переключаем класс по ширине
});
ro.observe(host);
// не забыть ro.disconnect() при уничтожении компонента
\`\`\`

Работает, но: код в каждом компоненте, не забыть отписку, колбэк срабатывает уже после раскладки, и браузеру приходится считать layout повторно. А при SSR сервер вообще не знает ширину, HTML приходит без класса, и после загрузки скрипта карточка перестраивается на глазах. \`ResizeObserver\` по-прежнему нужен, когда от размера зависит логика, а не стили: сколько колонок отрисовать в виртуальной таблице, перерисовать canvas-график.

### Что с производительностью

Containment сам по себе помогает: браузер знает, что изменения внутри контейнера не меняют его ширину, и может не пересчитывать раскладку снаружи. Но у каждого контейнера есть цена: дополнительная точка, где нужно считать размер до стилей детей, и перепроверка условий при каждом изменении размера. Десяток контейнеров на странице — незаметно. Контейнер на каждом \`div\` «на всякий случай» в длинном списке — лишняя работа в Recalculate Style и Layout. Мерьте в DevTools: Performance panel → длительность Recalculate Style и Layout до и после.

### Где это применяется на практике

- **Дизайн-системы и библиотеки компонентов**: карточка, таблица, форма адаптируются к своему слоту и не знают про брейкпоинты конкретного приложения.
- **Дашборды с изменяемыми виджетами**: пользователь растягивает панель — график и легенда перестраиваются по ширине панели, а не окна.
- **Сворачиваемый сайдбар**: при сворачивании меню основная область стала шире — карточки в ней сами перешли на «широкую» раскладку.
- **Data grid в разных местах**: таблица в модалке прячет второстепенные колонки, на полной странице показывает все.
- **Микрофронтенды и виджеты**, встраиваемые в чужие страницы, где размер экрана ничего не говорит о доступном месте.

## Важные нюансы и подводные камни

- **Забыли \`container-type\` на предке** — \`@container\` просто молча не срабатывает, ошибки в консоли нет.
- **Пытаются запросить сам элемент.** Нельзя: нужен отдельный элемент-обёртка или хост компонента, который станет контейнером.
- **\`container-type: size\` без явной высоты** — блок схлопывается в 0, потому что высота больше не зависит от контента.
- **Контейнер, чья ширина зависит от контента, схлопывается.** \`inline-block\`, flex-элемент без растяжения, \`float\`, \`width: fit-content\`, абсолютно позиционированный блок с \`container-type: inline-size\` получают ширину 0 (проверено в Chromium 151). Контейнеру нужна ширина «снаружи»: блочный элемент, \`flex: 1\`, явный \`width\`.
- **Хост Angular-компонента по умолчанию inline.** Без \`display: block\` он не станет контейнером.
- **Контейнер не становится containing block.** Это не \`contain: layout\`: fixed- и absolute-потомки позиционируются как раньше. Старые статьи, где \`container-type\` включает layout containment, устарели.
- **Без имени берётся ближайший подходящий контейнер.** При вложенности легко мерить не того предка — давайте имена.
- **\`cqi\` путают с \`vw\`**: \`cq\`-единицы считаются от контейнера, \`v\`-единицы — от viewport; без контейнера \`cqi\` молча падает на viewport.
- **Контейнер на каждом div «на всякий случай»** — лишняя работа в Recalculate Style и Layout на больших страницах.
- **Поддержка.** Размерные запросы — Baseline 2023 (Chrome 105, Safari 16, Firefox 110). Style-запросы по custom properties работают не везде: в Firefox 150 — нет.

**Плюсы:** компоненты по-настоящему переиспользуемы; меньше JS и нет мигания первого кадра, как с \`ResizeObserver\`; контейнерные единицы для типографики внутри компонента; containment изолирует пересчёты.
**Минусы:** нужен отдельный элемент-контейнер; ловушки с \`size\`, inline-хостами и shrink-to-fit-контейнерами; style-запросы поддерживаются не везде; лишние контейнеры добавляют работы.

## Как это спрашивают на собеседовании

**Главный вывод:** container queries меряют ближайшего предка-контейнера, а не экран, поэтому компонент адаптируется к месту, куда его положили. Работает это благодаря containment: \`container-type: inline-size\` делает ширину контейнера независимой от содержимого, и цикл «размер ↔ стили» разрывается.

Типичные формулировки: «Чем container queries отличаются от media queries?», «Зачем нужен \`container-type\`?», «Как сделать карточку, которая по-разному выглядит в сайдбаре и в основной колонке?».

Что могут спросить следом:

- *Почему раньше этого не было?* — Размер блока зависит от контента, а стили контента зависели бы от размера блока — цикл. Size containment делает размер контейнера независимым от детей и разрывает его.
- *Чем \`inline-size\` отличается от \`size\`?* — \`inline-size\` следит только за шириной, высота растёт по контенту; \`size\` следит за обеими осями и требует явной высоты, иначе блок схлопнется.
- *Можно ли использовать хост Angular-компонента как контейнер?* — Да, \`:host { display: block; container-type: inline-size; }\`; без \`display: block\` не сработает.
- *Когда всё-таки нужен \`ResizeObserver\`?* — Когда от размера зависит логика: число колонок в виртуальной таблице, перерисовка canvas.
- *Что такое \`cqi\`?* — 1% inline-размера контейнера; без контейнера считается от viewport.

### Ответ на 1 минуту

> Container queries позволяют компоненту реагировать не на viewport, а на размер ближайшего предка-контейнера, поэтому одна и та же карточка корректно раскладывается и в сайдбаре, и в основной колонке без глобальных брейкпоинтов. Предок объявляется через \`container-type\`: \`inline-size\` следит только за шириной и подходит почти всегда, \`size\` следит за обеими осями, но требует явной высоты, иначе блок схлопнется. Работает это за счёт containment: ширина контейнера считается без учёта содержимого, и цикл «размер зависит от стилей, стили от размера» разрывается. Поэтому сам себя элемент запросить не может, нужна обёртка — в Angular удобно сделать контейнером \`:host\`, не забыв \`display: block\`. Внутри работают единицы \`cqi\`. Media queries я оставляю для раскладки страницы, container queries — для компонентов, а лишние контейнеры не пложу и проверяю Recalculate Style в DevTools.`,
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
      ru: `## В чём суть

Обычные селекторы читаются сверху вниз: «найди \`img\` внутри \`.card\` и покрась **картинку**». \`:has()\` переворачивает направление: **«покрась меня, если внутри меня (или рядом со мной) есть вот такое»**. Это первый настоящий «родительский селектор»: стилизуем предка по его содержимому, без единой строчки JavaScript.

Аналогия: раньше ярлык можно было наклеить только на предмет внутри коробки. Теперь можно наклеить ярлык **на саму коробку** — «внутри стекло». Коробку не открывают, но обращаются с ней иначе.

**Какую проблему решает.** Сколько раз вы писали код «если в карточке есть картинка — добавь родителю класс \`has-image\`», «если поле невалидно — повесь на форму \`is-invalid\`», «если чекбокс в строке отмечен — подсвети строку»? Это слушатели событий, ручное переключение классов и постоянный риск рассинхрона: класс остался, а состояние уже другое. \`:has()\` позволяет описать это одним CSS-правилом: состояние DOM само двигает стили, и забыть снять класс невозможно — класса нет.

## Словарик терминов

- **Селектор и субъект селектора** — субъект — это элемент, к которому применяются стили. В \`.card img\` субъект — \`img\`, в \`.card:has(img)\` — \`.card\`.
- **Псевдокласс** — условие на состояние элемента после двоеточия: \`:hover\`, \`:checked\`, \`:invalid\`, \`:has()\`.
- **Реляционный псевдокласс (relational pseudo-class)** — так спецификация называет \`:has()\`: он проверяет отношения элемента с другими элементами.
- **Относительный селектор (relative selector)** — аргумент \`:has()\`, который начинается с комбинатора, связывающего его с субъектом: \`> img\`, \`+ p\`, \`~ .hint\`; без комбинатора подразумевается «любой потомок».
- **Комбинаторы** — связки в селекторе: пробел (потомок на любой глубине), \`>\` (прямой ребёнок), \`+\` (следующий сосед), \`~\` (любой следующий сосед).
- **Специфичность (specificity)** — «вес» селектора из трёх чисел (id, классы и псевдоклассы, теги); при конфликте побеждает больший вес.
- **\`:is()\` и \`:where()\`** — псевдоклассы-группировщики: \`:is()\` берёт специфичность самого тяжёлого аргумента, \`:where()\` всегда даёт нулевую.
- **Инвалидация стилей (style invalidation)** — шаг, на котором браузер решает, у каких элементов стили могли поменяться после изменения DOM.
- **Recalculate Style** — пересчёт стилей; так этот этап называется в профиле DevTools.
- **Unforgiving selector list (неснисходительный список)** — если хотя бы один селектор в списке невалиден, отбрасывается всё правило.
- **Baseline** — отметка «работает во всех основных браузерах»; \`:has()\` — Baseline 2023 (Safari 15.4, Chrome 105, Firefox 121).

## Как это работает под капотом

Чтобы понять, почему \`:has()\` ждали двадцать лет, нужно знать, как браузер вообще проверяет селекторы:

1. Браузер сопоставляет селекторы **справа налево**: для \`.card img\` он берёт каждый \`img\` и идёт вверх по предкам, ища \`.card\`. Путь вверх короткий (глубина дерева), поэтому это дёшево.
2. \`.card:has(img)\` требует обратного: взять \`.card\` и посмотреть **вниз**, во всё поддерево. Поддерево может содержать тысячи узлов, поэтому долго считалось, что такой селектор убьёт производительность.
3. Сама проверка простая: «есть ли среди потомков (или соседей — зависит от комбинатора) элемент, подходящий под аргумент». Движки кешируют результаты в пределах одного пересчёта стилей, чтобы не обходить одно поддерево много раз.
4. Настоящая сложность — **инвалидация**. Когда чекбокс стал \`:checked\`, браузер должен понять, у каких **предков** результат \`:has()\` мог поменяться. Поэтому движок заранее собирает из таблиц стилей, какие классы, теги и состояния встречаются внутри аргументов \`:has()\`.
5. Когда меняется элемент с такой «интересной» чертой, браузер идёт от него вверх по предкам (для \`+\` и \`~\` — по соседям) и помечает субъектов \`:has()\` на пересчёт стилей. Изменения, не затрагивающие аргументы \`:has()\`, этой работы не вызывают.
6. Дальше — обычный Recalculate Style для помеченных элементов и, если поменялась геометрия, Layout.
7. Отсюда цена: чем шире левая часть (\`*:has(...)\`), чем глубже поиск (любой потомок против \`> \` прямого ребёнка) и чем чаще меняется состояние внутри (\`:hover\`, \`:checked\` в тысяче строк), тем больше работы на каждое изменение.

Упрощённо логику проверки можно записать на JS (это модель, а не реализация движка):

\`\`\`js
// .card:has(img)    ≈ card.querySelector(':scope img') !== null
// .card:has(> img)  ≈ card.querySelector(':scope > img') !== null
function hasDescendant(el, selector) {
  return el.querySelector(':scope ' + selector) !== null;
}
\`\`\`

### Пример 1. Базовые паттерны

\`\`\`css
/* Карточка с картинкой выглядит иначе */
.card { padding: 16px; }
.card:has(img) { padding: 0; }

/* Звёздочка у лейбла обязательного поля: label, за которым сразу идёт required-input */
label:has(+ input:required)::after { content: ' *'; color: red; }

/* Форма с невалидным полем гасит кнопку */
form:has(:invalid) .submit { opacity: 0.5; }

/* Подсветить строку таблицы с отмеченным чекбоксом */
tr:has(input[type="checkbox"]:checked) { background: #eef; }
\`\`\`

\`\`\`text
Результат (Chromium 151):
.card с img → padding 0px;  .card без img → padding 16px
label перед required-полем → ::after " *";  перед обычным полем → ::after нет
пустое required-поле → у .submit opacity 0.5;  ввели значение → opacity 1
чекбокс не отмечен → фон строки прозрачный;  checked = true → rgb(238, 238, 255)
\`\`\`

Во всех четырёх случаях раньше понадобились бы слушатель и ручной класс на родителе. Обратите внимание на динамику: строка перекрасилась сразу после \`checkbox.checked = true\` — браузер сам инвалидировал \`tr\` при смене состояния чекбокса.

### Относительный селектор: потомок, ребёнок, сосед

\`\`\`css
.card:has(img)    { }  /* img на любой глубине внутри .card */
.card:has(> img)  { }  /* img — прямой ребёнок .card */
h2:has(+ p)       { margin-bottom: 0; }  /* h2, за которым СРАЗУ идёт p */
.field:has(~ .hint) { }  /* .field, у которого где-то дальше есть сосед .hint */
\`\`\`

\`\`\`text
h2, за которым идёт p      → margin-bottom 0px
h2, за которым идёт div    → margin-bottom 19.92px (стандартный отступ)
\`\`\`

Комбинатор в начале аргумента отсчитывается от субъекта. С \`+\` и \`~\` \`:has()\` перестаёт быть «родительским» и становится «селектором предыдущего соседа» — тоже то, чего раньше в CSS не было. Прямой ребёнок (\`> img\`) дешевле любого потомка: браузеру не нужно обходить всё поддерево.

### Пример 2. Переключатель всего макета без JS

\`\`\`css
.layout { display: grid; grid-template-columns: 1fr; }
.layout:has(#nav-toggle:checked) { grid-template-columns: 16rem 1fr; }
\`\`\`

\`\`\`text
.layout шириной 800px:
чекбокс снят   → grid-template-columns: 800px
чекбокс отмечен → grid-template-columns: 256px 544px
\`\`\`

Один чекбокс где-то внутри управляет сеткой всей страницы. Раньше для этого чекбокс ставили строго перед макетом и писали \`#nav-toggle:checked ~ .layout\`, а теперь он может лежать где угодно внутри.

### Quantity queries: стили по количеству элементов

\`\`\`css
ul:has(> li:nth-child(6)) { columns: 2; }  /* 6+ пунктов → две колонки */
\`\`\`

\`\`\`text
ul с 5 пунктами → column-count: auto
ul с 6 пунктами → column-count: 2
\`\`\`

Логика: «есть ли у списка шестой ребёнок». Если есть — пунктов шесть или больше. Так же делают «если в сетке одна карточка — растянуть её на всю ширину»: \`.grid:has(> :only-child)\`.

### Специфичность \`:has()\` и обнуление через \`:where()\`

\`\`\`css
.a.b.c      { color: green; }  /* (0,3,0) */
.a:has(#x)  { color: red; }    /* (1,1,0) — id из аргумента делает правило тяжёлым → победил red */

.p.q.r            { color: green; }  /* (0,3,0) → победил green */
.p:where(:has(#y)) { color: red; }   /* (0,1,0) — :where обнуляет вес аргумента */
\`\`\`

\`:has()\` сам по себе веса не добавляет: он берёт специфичность **самого тяжёлого** селектора из аргумента, как \`:is()\`. Поэтому \`.a:has(#id)\` неожиданно перебивает три класса. Если нужно, чтобы условие не влияло на вес, оберните его в \`:where()\`. Оба результата проверены в Chromium 151.

### \`:has()\` в JavaScript

\`\`\`js
document.querySelectorAll('tr:has(:checked)').length; // 1 — сколько строк выбрано
button.closest('form:has(:invalid)');                 // null, если в форме всё валидно
el.matches('.card:has(img)');                         // true / false
\`\`\`

Тот же синтаксис работает во всех DOM-API, принимающих селекторы. Удобно в тестах и e2e: «найти строку таблицы, в которой есть ячейка с текстом» — частая задача, которая раньше требовала обхода руками.

### Проверка поддержки: \`@supports selector()\`

\`\`\`css
.card.has-image { padding: 0; }              /* запасной вариант: класс ставит JS */

@supports selector(:has(a)) {
  .card:has(img) { padding: 0; }
}
\`\`\`

\`\`\`js
CSS.supports('selector(:has(a))');        // true в браузерах с поддержкой
CSS.supports('selector(:has(::before))'); // false — псевдоэлемент в аргументе запрещён
\`\`\`

\`@supports selector(...)\` проверяет, понимает ли браузер селектор. Нужно, если вы поддерживаете браузеры старше Baseline 2023.

### Ограничения синтаксиса

\`\`\`css
.n:has(:has(span)) { }        /* ❌ вложенный :has — правило отбрасывается целиком */
.n:has(:is(:has(span))) { }   /* ❌ через :is тоже нельзя */
.c:has(::before) { }          /* ❌ псевдоэлемент внутри аргумента */
.c:has(img)::after { }        /* ✅ псевдоэлемент ПОСЛЕ :has — можно */
.u:has(span, :unknown-thing) { } /* ❌ один невалидный селектор убивает весь список */
\`\`\`

Все пять строк проверены в Chromium 151. Последний пункт — следствие того, что аргумент \`:has()\` стал «неснисходительным» (unforgiving) списком: в ранних реализациях невалидные части просто пропускались, потом спецификацию ужесточили.

### Angular: \`:has()\` в стилях компонента

\`\`\`text
Исходные стили компонента:      После эмулированной инкапсуляции (Angular 21):
.card:has(img) { }              .card[_ngcontent-c123]:has(img) { }
:host:has(.err) { }             [_nghost-c123]:has(.err) { }
\`\`\`

Angular добавляет атрибут-метку к левой части селектора, но **не** к аргументу \`:has()\` (проверено компилятором Angular 21.1.4). Значит, \`:host:has(.err)\` сработает и от \`.err\` во вложенном дочернем компоненте. Иногда это ровно то, что нужно («подсветить секцию, если в любом поле внутри ошибка»), но об этом стоит помнить.

### Где это применяется на практике

- **Формы**: подсветка поля-обёртки с невалидным инпутом (\`.field:has(:invalid:not(:placeholder-shown))\`), звёздочки обязательных полей, блокировка кнопки отправки визуально.
- **Таблицы и data grid**: подсветка выбранных строк, строки с ошибкой валидации, раскрытой строки.
- **Карточки и списки**: другая раскладка, если есть картинка, бейдж или видео; режим «одна карточка на всю ширину».
- **Макет страницы**: открытое меню, модалка (\`body:has(dialog[open]) { overflow: hidden; }\` — запрет прокрутки фона без JS), свернутый сайдбар.
- **Дизайн-системы**: меньше служебных классов вроде \`has-icon\`, \`is-invalid\`, которые раньше расставлял скрипт.

## Важные нюансы и подводные камни

- **\`*:has(.x)\` или \`:has(.x)\` без левой части.** Субъектом может быть любой элемент, поэтому при каждом изменении \`.x\` браузер перепроверяет всех предков до \`html\`. Всегда сужайте: \`.field:has(.error)\`.
- **\`:has()\` нельзя вкладывать.** Ни напрямую, ни через \`:is()\`/\`:where()\` — правило отбрасывается целиком.
- **Псевдоэлементы внутри аргумента запрещены.** \`:has(::before)\` невалиден, а \`.card:has(img)::after\` работает: псевдоэлемент стоит после \`:has()\`.
- **Невалидный селектор в списке убивает всё правило.** \`:has(.a, :foo)\` не сработает и для \`.a\`.
- **Специфичность берётся по самому тяжёлому аргументу.** \`.a:has(#id)\` весит как id; обнулить — \`:where(:has(...))\`.
- **Динамика в огромных списках.** \`:has(:hover)\` или \`:has(:checked)\` на тысяче строк с широкой левой частью расширяет Style Recalc на каждое движение мыши; держите субъект близко к изменяемому элементу.
- **Прямой ребёнок дешевле потомка.** \`:has(> img)\` не требует обхода всего поддерева, используйте его, когда структура известна.
- **Angular не скоупит аргумент \`:has()\`.** Условие видит элементы дочерних компонентов.
- **Как измерить цену.** DevTools → Performance → длительность Recalculate Style до и после на реальном объёме DOM; в свежих версиях Chrome есть опция статистики селекторов (selector stats), показывающая самые дорогие селекторы.
- **Поддержка.** Baseline с декабря 2023 (последним был Firefox 121); для старых браузеров — \`@supports selector(:has(a))\` и запасной класс.

**Плюсы:** стилизация предка и предыдущего соседа без JS; нет рассинхрона классов и состояния; работает с любыми псевдоклассами состояния (\`:checked\`, \`:invalid\`, \`:focus-within\`); тот же синтаксис в \`querySelector\`.
**Минусы:** при широких селекторах и частых изменениях дорогая инвалидация; специфичность аргумента может удивить; нельзя вкладывать; в Angular аргумент не изолирован инкапсуляцией.

## Как это спрашивают на собеседовании

**Главный вывод:** \`:has()\` выбирает элемент, если относительно него (среди потомков или следующих соседей) находится то, что описано в аргументе. Это родительский селектор и селектор предыдущего соседа одновременно; цена — инвалидация, поэтому левую часть всегда сужают.

Типичные формулировки: «Есть ли в CSS родительский селектор?», «Как подсветить строку таблицы с отмеченным чекбоксом без JS?», «Почему \`:has()\` так долго не появлялся?».

Что могут спросить следом:

- *Почему его долго не было?* — Браузер сопоставляет селекторы справа налево, а \`:has()\` требует смотреть вниз и при каждом изменении перепроверять предков; движкам понадобились оптимизации инвалидации.
- *Какая у \`:has()\` специфичность?* — Как у самого тяжёлого аргумента, по правилам \`:is()\`; обнулить можно через \`:where()\`.
- *Можно ли выбрать предыдущего соседа?* — Да: \`h2:has(+ p)\` — это \`h2\`, за которым идёт \`p\`.
- *Что нельзя писать внутри?* — Вложенный \`:has()\` и псевдоэлементы; и один невалидный селектор ломает весь список.
- *Как проверить поддержку?* — \`@supports selector(:has(a))\` или \`CSS.supports('selector(:has(a))')\`.

### Ответ на 1 минуту

> \`:has()\` — реляционный псевдокласс: он выбирает элемент, если внутри него или после него есть то, что описано в аргументе. Это первый способ стилизовать предка по потомку без JS: \`.card:has(img)\`, \`form:has(:invalid) .submit\`, \`tr:has(:checked)\`, а через \`+\` — ещё и предыдущего соседа. Специфичность берётся по самому тяжёлому аргументу, как у \`:is()\`, обнулить можно через \`:where()\`. Его долго считали нереализуемым: селекторы проверяются справа налево, а тут нужно смотреть вниз и при каждом изменении перепроверять предков. Сейчас движки заранее знают, какие классы и состояния встречаются в аргументах, и при их изменении помечают на пересчёт только кандидатов. Дорогими остаются широкие селекторы вроде \`*:has(.x)\` и часто меняющиеся состояния в больших списках, поэтому я сужаю левую часть и смотрю Recalculate Style в Performance. Вкладывать \`:has()\` нельзя, Baseline 2023.`,
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
      ru: `## В чём суть

\`@layer\` добавляет в каскад **новую ступень — приоритет слоя**, и она проверяется раньше специфичности. Правило из более позднего слоя побеждает правило из раннего, **даже если его селектор проще**. Это способ перестать воевать за специфичность и \`!important\`.

Аналогия: приказы в компании. Сначала смотрят, из какого отдела пришёл приказ (слой), и только внутри одного отдела — кто громче кричит (специфичность). Стажёр из отдела с высшим приоритетом перебьёт директора из низшего. А порядок отделов утверждается один раз, в уставе, — строкой \`@layer reset, base, components, utilities;\`.

**Какую проблему решает.** В большом проекте CSS приходит из многих источников: reset, сторонняя библиотека (Bootstrap, Kendo UI, Angular Material), дизайн-система, стили фич, утилиты. Библиотека пишет \`.navbar .btn.btn-primary\`, и чтобы её перебить, вы пишете селектор ещё длиннее или ставите \`!important\`. Через год у вас гонка вооружений: каждый новый стиль тяжелее предыдущего, а \`!important\` перебивается только другим \`!important\`. Слои позволяют один раз договориться «вендор слабее наших компонентов, утилиты сильнее всех» — и после этого вес селекторов между слоями перестаёт иметь значение.

## Словарик терминов

- **Каскад (cascade)** — алгоритм, который решает, какое из нескольких конфликтующих объявлений одного свойства применится к элементу.
- **Источник (origin)** — откуда пришёл стиль: user-agent (встроенные стили браузера), user (настройки пользователя), author (стили сайта).
- **Специфичность (specificity)** — «вес» селектора из трёх чисел: id, классы/атрибуты/псевдоклассы, теги. \`#hero .title\` = (1,1,0).
- **Порядок появления (order of appearance)** — при прочих равных побеждает объявление, которое стоит позже в коде.
- **\`!important\`** — пометка «важное объявление»; важные объявления сравниваются отдельно и сильнее обычных.
- **Каскадный слой (cascade layer, \`@layer\`)** — именованная группа правил с общим приоритетом.
- **Объявление порядка (layer statement)** — строка \`@layer a, b, c;\` без тела: фиксирует порядок слоёв, ничего не стилизуя.
- **Неслоёные стили (unlayered styles)** — правила вне любого \`@layer\`; браузер считает их неявным последним слоем.
- **Вложенный слой (nested layer)** — слой внутри слоя: \`@layer components { @layer card { } }\` или короче \`@layer components.card { }\`.
- **Анонимный слой** — \`@layer { ... }\` без имени; к нему нельзя дописать правила позже.
- **\`revert-layer\`** — ключевое слово значения: «откатить свойство к тому, что дали предыдущие слои».
- **\`@import ... layer()\`** — импорт целого файла сразу в слой: \`@import url(lib.css) layer(vendor);\`.
- **Inline-стиль** — атрибут \`style="..."\` прямо на элементе.

## Как это работает под капотом

Когда к одному свойству элемента применяются несколько объявлений, браузер сравнивает их по шагам и останавливается на первом, где они различаются:

1. **Источник и важность.** Обычные стили браузера слабее обычных стилей сайта, а важные (\`!important\`) — наоборот, в обратном порядке источников. Поэтому \`!important\` сайта бьёт любое обычное объявление.
2. **Контекст.** Стили из разных деревьев Shadow DOM сравниваются по своим правилам инкапсуляции; в обычной странице этот шаг ничего не решает.
3. **Inline-стиль.** Атрибут \`style\` сильнее любых правил из таблиц стилей того же источника и важности — и слоёных, и неслоёных.
4. **Слой.** Теперь сравниваются слои: более поздний в объявленном порядке побеждает. Неслоёные стили — неявный последний слой, то есть самый сильный. Для \`!important\` порядок слоёв **переворачивается**.
5. **Специфичность** — только если оба объявления в **одном** слое.
6. **Порядок появления** — последний аргумент.

Ключевая мысль: слой стоит в этой лестнице **выше** специфичности. Поэтому \`.btn\` в слое \`app\` побеждает \`.navbar .btn.btn-primary\` в слое \`vendor\`: до сравнения селекторов дело просто не доходит.

Упрощённая модель того же алгоритма на JS (одно свойство, только стили сайта):

\`\`\`js
const ORDER = ['reset', 'vendor', 'components', 'app', 'utilities'];

function layerRank(d) {
  const i = d.layer === null ? ORDER.length : ORDER.indexOf(d.layer); // без слоя = после всех
  return d.important ? -i : i;           // !important переворачивает порядок слоёв
}

function compare(a, b) {                  // > 0 — побеждает a
  if (a.important !== b.important) return a.important ? 1 : -1;
  if (layerRank(a) !== layerRank(b)) return layerRank(a) - layerRank(b);
  for (let k = 0; k < 3; k++) {          // специфичность (id, классы, теги)
    if (a.spec[k] !== b.spec[k]) return a.spec[k] - b.spec[k];
  }
  return a.order - b.order;              // кто позже в коде
}

const winner = (...decls) => decls.reduce((w, d) => (compare(d, w) > 0 ? d : w)).value;

console.log(winner(
  { value: '20px', layer: 'vendor', important: false, spec: [0, 3, 0], order: 1 }, // .navbar .btn.btn-primary
  { value: '8px',  layer: 'app',    important: false, spec: [0, 1, 0], order: 2 }, // .btn
)); // 8px
console.log(winner(
  { value: 'blue', layer: 'components', important: false, spec: [1, 2, 0], order: 1 }, // #hero .title.big
  { value: 'red',  layer: null,         important: false, spec: [0, 1, 0], order: 2 }, // .title без слоя
)); // red
console.log(winner(
  { value: 'reset!',     layer: 'reset',     important: true, spec: [0, 1, 0], order: 1 },
  { value: 'utilities!', layer: 'utilities', important: true, spec: [0, 1, 0], order: 2 },
  { value: 'unlayered!', layer: null,        important: true, spec: [0, 1, 0], order: 3 },
)); // reset!
\`\`\`

Модель запущена в Node, а те же три ситуации проверены настоящим CSS в Chromium 151 — результаты совпадают.

### Пример 1. Слои против специфичности

\`\`\`css
/* Порядок задан один раз */
@layer reset, vendor, components, app, utilities;

/* Сторонний CSS сразу кладём в слабый слой */
@import url("bootstrap.css") layer(vendor);   /* внутри: .navbar .btn.btn-primary { padding: 20px } */

@layer app {
  .btn { padding: 0.5rem 1rem; }   /* бьёт bootstrap без !important */
}

@layer utilities {
  .p-0 { padding: 0; }             /* поздний слой побеждает, хотя это просто класс */
}

.debug { outline: 1px solid red; } /* без слоя — сильнее ВСЕХ слоёв выше */
\`\`\`

\`\`\`text
<button class="btn btn-primary">       → padding из app (8px), цвет из vendor остаётся
<button class="btn btn-primary p-0">   → padding 0 (utilities)
\`\`\`

\`app\` объявлен позже \`vendor\`, поэтому его \`.btn\` побеждает, хотя селектор Bootstrap весит (0,3,0) против (0,1,0). Свойства, которые \`app\` не трогает (цвет), по-прежнему приходят из вендора — слой не «отключает» библиотеку, а только решает конфликты.

### Неслоёные стили сильнее всех слоёв

\`\`\`css
@layer components {
  #hero .title.big { color: blue; }   /* (1,2,0), но в слое */
}
.title { color: red; }                /* (0,1,0), без слоя → победил red */
\`\`\`

Правила вне \`@layer\` — неявный последний слой. Это главный сюрприз при постепенной миграции: вы переложили половину кода в слои, и эта половина внезапно стала слабее оставшейся. Обычная стратегия: сначала завернуть **весь** старый CSS в слой \`legacy\`, потом переносить по частям.

### \`!important\` переворачивает порядок слоёв

\`\`\`css
@layer reset, utilities;

@layer reset     { .imp { color: rgb(1, 1, 1) !important; } }
@layer utilities { .imp { color: rgb(2, 2, 2) !important; } }
/* → rgb(1, 1, 1): важное из РАННЕГО слоя сильнее */

.imp2 { color: rgb(3, 3, 3) !important; }                    /* без слоя */
@layer utilities { .imp2 { color: rgb(4, 4, 4) !important; } }
/* → rgb(4, 4, 4): важное без слоя — самое слабое среди важных */
\`\`\`

Логика переворота: ранние слои — это фундамент (reset, базовые стили). Если фундамент сказал «это важно», например \`[hidden] { display: none !important; }\`, ни один поздний слой не должен это сломать. Интуиция «поздний всегда сильнее» здесь не работает.

### Inline-стиль и слои

\`\`\`html
<p class="inl" style="color: rgb(30, 30, 30)">…</p>   <!-- слой utilities: .inl { color: rgb(5,5,5) } -->
<!-- → rgb(30, 30, 30): inline сильнее обычных правил любых слоёв -->

<p class="inl2" style="color: rgb(31, 31, 31)">…</p>  <!-- слой utilities: .inl2 { color: rgb(6,6,6) !important } -->
<!-- → rgb(6, 6, 6): важное из слоя бьёт обычный inline -->
\`\`\`

Inline-стили проверяются на шаге раньше слоёв, поэтому слои их не перебивают — только \`!important\`.

### \`@import ... layer()\`: сторонний CSS в слой

\`\`\`css
@layer reset, vendor, app;                     /* объявление порядка МОЖНО до @import */
@import url("vendor.css") layer(vendor);       /* ✅ */

.some-rule { color: green; }
@import url("late.css");                       /* ❌ после обычного правила — игнорируется */
\`\`\`

\`@import\` должен стоять в самом начале таблицы стилей; перед ним допускаются только \`@charset\` и объявления порядка \`@layer a, b;\`. Проверено в Chromium 151: импорт после обычного правила молча не применился.

В Sass (а значит, в Angular-проектах на SCSS) тот же эффект даёт \`meta.load-css\` внутри слоя:

\`\`\`scss
@use 'sass:meta';
@layer reset, vendor, components, app, utilities;

@layer vendor {
  @include meta.load-css('vendor');   // весь _vendor.scss окажется внутри @layer vendor
}
\`\`\`

Проверено с Sass 1.97: на выходе правила вендора лежат внутри \`@layer vendor { ... }\`.

### Порядок без объявления: кто первым появился

\`\`\`css
@layer beta  { .order { color: rgb(20, 20, 20); } }
@layer alpha { .order { color: rgb(21, 21, 21); } }
/* → rgb(21, 21, 21): beta появился первым, значит он слабее alpha */
\`\`\`

Если не объявить порядок заранее, слои выстраиваются в порядке **первого упоминания**. Поменяли порядок импортов — поменялся приоритет. Поэтому строка \`@layer ...;\` должна быть первой в глобальных стилях.

### Вложенные слои

\`\`\`css
@layer components {
  @layer card { .nest { color: rgb(7, 7, 7); } }
  .nest { color: rgb(8, 8, 8); }   /* прямое правило родительского слоя */
}
/* → rgb(8, 8, 8): внутри слоя «неслоёные» правила сильнее его подслоёв */

@layer components.card { }          /* короткая запись того же подслоя */
\`\`\`

Вложенные слои сортируются внутри родителя, а сам родитель стоит на своём месте во внешнем порядке. Правило «без слоя сильнее слоёв» повторяется на каждом уровне: прямые правила \`components\` бьют его подслой \`card\`.

### Анонимные слои и \`revert-layer\`

\`\`\`css
@layer { .an { color: rgb(5, 5, 5); } }
@layer { .an { color: rgb(6, 6, 6); } }   /* → rgb(6, 6, 6): каждый анонимный слой — новый, последний сильнее */

@layer base  { .rl { color: rgb(12, 12, 12); } }
@layer theme { .rl { color: revert-layer; } }  /* → rgb(12, 12, 12): «как будто этого слоя нет» */
\`\`\`

Анонимный слой полезен, чтобы понизить приоритет куска кода, не давая ему имени, но дописать в него потом ничего нельзя. \`revert-layer\` откатывает свойство к значению из предыдущих слоёв — удобно, чтобы в теме «отменить» одно свойство, не зная, что было в базе.

### Angular и Tailwind на слоях

\`\`\`text
Компонент:    @layer app { .btn { padding: 8px; } }
После эмулированной инкапсуляции (Angular 21):
              @layer app { .btn[_ngcontent-c123] { padding: 8px; } }
\`\`\`

Angular сохраняет \`@layer\` в стилях компонента и скоупит селекторы внутри (проверено компилятором Angular 21.1.4). Слои с одинаковым именем из разных \`<style>\` сливаются в один. Отсюда схема для проекта: в глобальном \`styles.scss\` первой строкой объявить порядок, а компоненты кладут стили в \`@layer components\` или \`@layer app\`. Ловушка: стили компонента вставляются в документ позже глобальных, и **новое** имя слоя, которого нет в глобальном объявлении, окажется в самом конце — сильнее утилит (проверено в Chromium 151).

Tailwind v4 построен на слоях: его \`index.css\` начинается с \`@layer theme, base, components, utilities;\`. Значит, любой ваш неслоёный CSS, включая обычные стили Angular-компонентов, сильнее любой утилиты Tailwind независимо от специфичности. Если \`class="p-0"\` «не работает» — проверьте, нет ли неслоёного \`padding\` в стилях компонента.

### Где это применяется на практике

- **Сторонние UI-библиотеки** (Bootstrap, Kendo UI, Angular Material): их CSS в слой \`vendor\`, свои переопределения в более позднем слое — без \`!important\` и без копирования длинных селекторов библиотеки.
- **Дизайн-системы**: стабильная иерархия reset → tokens → base → components → utilities, где утилиты гарантированно побеждают компоненты.
- **Постепенная миграция легаси**: весь старый CSS в слой \`legacy\`, новый код в поздние слои — новый код побеждает, не трогая старые селекторы.
- **Микрофронтенды**: каждая команда в своём подслое (\`@layer features.billing\`), приоритеты между командами описаны явно.
- **Темы и white-label**: тема клиента в позднем слое \`theme\`, а \`revert-layer\` отменяет отдельные переопределения.

## Важные нюансы и подводные камни

- **Не объявили порядок заранее** — приоритет определяется первым появлением слоя и ломается при смене порядка импортов.
- **Неслоёные стили сильнее всех слоёв.** При миграции «половины в слои» эта половина становится слабее остатка.
- **\`!important\` инвертирует слои.** Важное из раннего слоя бьёт важное из позднего, а важное без слоя — самое слабое среди важных.
- **Специфичность внутри слоя никуда не делась.** Два правила в одном слое сравниваются как раньше.
- **Inline-стиль сильнее слоёв.** Перебить его можно только \`!important\`, и тогда работает перевёрнутый порядок.
- **Вложенные слои сортируются внутри родителя**; позиция родителя главнее, а прямые правила родителя сильнее его подслоёв.
- **\`@import ... layer()\` должен идти в начале файла.** Перед ним допустимы только \`@charset\` и объявления \`@layer a, b;\`, иначе импорт игнорируется молча.
- **Новое имя слоя в стилях компонента** окажется в конце порядка и станет сильнее утилит — все имена объявляйте в глобальном файле.
- **Tailwind v4 целиком в слоях**, поэтому неслоёный CSS компонентов перебивает его утилиты.
- **Слои работают внутри одного источника.** Встроенные стили браузера и пользовательские настройки они не переупорядочивают.
- **Отладка.** Панель Styles в DevTools показывает, в каком слое лежит правило; если правило «не применяется», сначала проверьте слой, а не специфичность.
- **Поддержка.** Baseline 2022 (Chrome 99, Firefox 97, Safari 15.4).

**Плюсы:** явная и читаемая иерархия источников стилей; конец гонки специфичности и \`!important\`; сторонний CSS приручается одной строкой; удобная постепенная миграция.
**Минусы:** перевёрнутая логика \`!important\` и «неслоёное сильнее всех» сбивают с толку; порядок легко сломать без явного объявления; нужна договорённость на уровне всего проекта; старые инструменты и библиотеки об этом не знают.

## Как это спрашивают на собеседовании

**Главный вывод:** слой проверяется в каскаде раньше специфичности: правило из более позднего слоя побеждает независимо от веса селектора. Неслоёные стили — неявный последний, самый сильный слой, а \`!important\` переворачивает порядок слоёв.

Типичные формулировки: «Что такое \`@layer\` и зачем он нужен?», «Как перебить стили сторонней библиотеки без \`!important\`?», «В каком порядке браузер разрешает конфликты стилей?».

Что могут спросить следом:

- *Чем слои лучше \`!important\`?* — \`!important\` бинарен и не масштабируется; слои дают явную многоуровневую иерархию источников.
- *Почему мой стиль без слоя перебил слоёный с более тяжёлым селектором?* — Неслоёные стили — неявный последний слой, слой важнее специфичности.
- *Как \`!important\` взаимодействует со слоями?* — Порядок переворачивается: важное из раннего слоя побеждает, важное без слоя — слабейшее.
- *Как подключить библиотеку в слой?* — \`@import url(lib.css) layer(vendor);\` в начале файла или в Sass \`@layer vendor { @include meta.load-css('lib'); }\`.
- *Что сильнее: inline-стиль или поздний слой?* — Inline-стиль; его перебивает только \`!important\`.

### Ответ на 1 минуту

> Cascade layers добавляют в каскад отдельную ступень между источником и специфичностью. Порядок задаётся один раз строкой \`@layer reset, vendor, components, app, utilities;\`, и правило из более позднего слоя побеждает правило из раннего независимо от веса селектора; специфичность работает только внутри одного слоя. Полный порядок такой: источник и важность, inline-стиль, слой, специфичность, порядок появления. Два нюанса, на которых ловят: стили без слоя сильнее всех именованных слоёв, а \`!important\` переворачивает порядок — важное из раннего слоя бьёт важное из позднего. Практически я кладу сторонний CSS вроде Bootstrap или Kendo в слой \`vendor\` через \`@import ... layer()\` или \`meta.load-css\` в Sass, свои стили — в поздний слой, и они побеждают без \`!important\`. В Angular объявляю порядок первой строкой глобальных стилей и помню, что Tailwind v4 целиком в слоях. Baseline 2022.`,
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
      ru: `## В чём суть

Физические свойства (\`margin-left\`, \`right\`, \`top\`, \`width\`) привязаны к **экрану**. Логические (\`margin-inline-start\`, \`inset-block-end\`, \`inline-size\`) привязаны к **потоку текста**: ось \`inline\` — куда идут буквы в строке, ось \`block\` — куда добавляются новые строки. Сменили язык на арабский — оси развернулись сами, CSS переписывать не нужно.

Аналогия: вместо «положи вилку слева» говорим «положи вилку со стороны рабочей руки». Для правши и для левши инструкция одна и та же, а результат правильный в обоих случаях.

**Какую проблему решает.** Арабский, иврит, персидский и урду пишутся справа налево (RTL), и для них интерфейс должен быть зеркальным: меню справа, иконка «назад» указывает вправо, отступ у текста с правой стороны. С физическими свойствами для этого держат вторую таблицу стилей \`.rtl\` с зеркальными правилами — и она вечно отстаёт от основной: добавили \`padding-left\` в компонент, забыли \`padding-right\` в RTL-версии, и вёрстка поехала. С логическими свойствами набор правил один, а браузер сам решает, где «начало» строки. Заодно код становится честнее: \`padding-inline-start\` говорит «отступ перед текстом», а не «отступ слева, потому что у нас так исторически сложилось».

## Словарик терминов

- **Физические свойства** — привязаны к сторонам экрана: \`left\`/\`right\`/\`top\`/\`bottom\`, \`width\`/\`height\`, \`margin-left\` и т.п.
- **Логические свойства (CSS logical properties)** — привязаны к направлению текста: \`inline\`/\`block\`, \`start\`/\`end\`.
- **Inline-ось** — направление, в котором идут символы в строке: в русском слева направо, в арабском справа налево, в вертикальном японском сверху вниз.
- **Block-ось** — направление, в котором добавляются строки и блоки: обычно сверху вниз.
- **\`start\` и \`end\`** — начало и конец оси: \`inline-start\` — откуда начинается чтение строки.
- **LTR / RTL (left-to-right / right-to-left)** — направление письма слева направо или справа налево.
- **\`direction\`** — CSS-свойство направления inline-оси: \`ltr\` или \`rtl\`.
- **Атрибут \`dir\`** — HTML-атрибут (\`dir="rtl"\`, \`dir="auto"\`), который задаёт направление элемента и его потомков; правильный способ указывать направление.
- **\`writing-mode\`** — ориентация текста: \`horizontal-tb\` (обычный горизонтальный), \`vertical-rl\` (вертикальный, колонки справа налево — японский, китайский).
- **\`:dir()\`** — псевдокласс, который выбирает элементы по направлению: \`:dir(rtl)\`.
- **i18n (internationalization)** — подготовка продукта к работе с разными языками и регионами.
- **Шорткат (shorthand)** — свойство, задающее сразу несколько: \`padding-inline\` = \`padding-inline-start\` + \`padding-inline-end\`.

## Как это работает под капотом

Как браузер превращает логическое свойство в отступ с конкретной стороны:

1. Для каждого элемента браузер определяет \`writing-mode\` и \`direction\`. Они наследуются, поэтому обычно приходят от \`<html dir="rtl" lang="ar">\`.
2. Из этих двух значений вычисляются оси: куда идёт **inline** (строка) и куда **block** (строки друг за другом), и где у каждой оси начало и конец.
3. Затем каждое логическое свойство сопоставляется с физическим: при \`horizontal-tb\` + \`ltr\` \`inline-start\` — это left, при \`rtl\` — right, а при \`vertical-rl\` inline-ось становится вертикальной, и \`inline-start\` — это top.
4. Логическое и физическое свойство одной стороны — это **одна ячейка** значения. Если на элементе есть и \`margin-left\`, и \`margin-inline-start\`, и они указывают на одну сторону, побеждает то, что позже по каскаду.
5. После сопоставления это обычные свойства: каскад, наследование, специфичность, layout работают как всегда.

Шпаргалка «физическое → логическое» (для горизонтального письма):

- \`margin-left\` → \`margin-inline-start\`, \`margin-right\` → \`margin-inline-end\`
- \`padding-top\` → \`padding-block-start\`, \`padding-bottom\` → \`padding-block-end\`
- \`width\` → \`inline-size\`, \`height\` → \`block-size\`, \`min-width\` → \`min-inline-size\`
- \`top\` / \`bottom\` → \`inset-block-start\` / \`inset-block-end\`, \`left\` → \`inset-inline-start\`
- \`border-left\` → \`border-inline-start\`, \`border-top-left-radius\` → \`border-start-start-radius\`
- \`text-align: left/right\` → \`text-align: start/end\`, \`float: left\` → \`float: inline-start\`
- Шорткаты на обе стороны сразу: \`padding-inline\` (лево+право в LTR), \`margin-block\` (верх+низ), \`inset-inline\`, \`inset-block\`

### Пример 1. Один компонент для LTR и RTL

\`\`\`css
.alert {
  padding-block: 0.75rem;
  padding-inline: 1rem;
  border-inline-start: 4px solid currentColor; /* акцент со стороны начала чтения */
  text-align: start;
  position: relative;
}

.alert__close {
  position: absolute;
  inset-block-start: 0.5rem;
  inset-inline-end: 0.5rem;  /* справа вверху в LTR, слева вверху в RTL */
}
\`\`\`

\`\`\`text
Результат (Chromium 151, .alert шириной 400px):
dir="ltr": border-left 4px, border-right 0;  крестик: 8px от правого края, 8px от верха
dir="rtl": border-left 0, border-right 4px;  крестик: 8px от левого края, 8px от верха
padding сверху 12px и по бокам 16px — в обоих случаях
\`\`\`

При \`dir="rtl"\` полоса-акцент и крестик сами переехали на другую сторону. Физический вариант потребовал бы отдельной \`.rtl\`-таблицы с зеркальными правилами для каждого компонента.

### \`text-align: start\` — значение по умолчанию

\`\`\`css
.plain { }                      /* text-align не задан */
.left  { text-align: left; }    /* жёстко задан физический left */
\`\`\`

\`\`\`text
dir="rtl", .plain → computed text-align: start, текст прижат к ПРАВОМУ краю
dir="rtl", .left  → текст прижат к левому краю (баг)
\`\`\`

Начальное значение \`text-align\` и так \`start\`, поэтому RTL-текст без всяких стилей встаёт вправо. Ломает вёрстку не «забытый \`start\`», а явный \`text-align: left\` — его часто оставляют в reset-стилях, таблицах и ячейках data grid. Писать \`start\` явно полезно там, где нужно перебить чужой \`left\`.

### Шорткат \`inset\` и другие физические шорткаты

\`\`\`js
const el = document.createElement('div');
el.style.inset = '0';
console.log(el.style.top, el.style.right, el.style.bottom, el.style.left); // 0px 0px 0px 0px
\`\`\`

\`inset\` — шорткат для **физических** \`top\`/\`right\`/\`bottom\`/\`left\`, несмотря на «новое» имя. Для \`inset: 0\` это неважно: все стороны одинаковые. Но \`inset: 0 auto auto 1rem\` в RTL оставит элемент слева. Логические аналоги — \`inset-inline\` и \`inset-block\` или отдельные \`inset-inline-start\` и т.д. То же с четырёхзначными \`margin\` и \`padding\`: \`margin: 0 10px 0 20px\` физический, а логической версии четырёхзначной записи браузеры пока не поддерживают — используйте пары \`margin-block\` + \`margin-inline\`.

### Смешивание физического и логического

\`\`\`css
.mix1 { margin-inline-start: 10px; margin-left: 20px; }
.mix2 { margin-left: 20px; margin-inline-start: 10px; }
\`\`\`

\`\`\`text
dir="ltr": .mix1 → margin-left 20px (последний победил), .mix2 → margin-left 10px
dir="rtl": .mix1 → margin-left 20px И margin-right 10px (это уже разные стороны)
\`\`\`

В LTR оба свойства указывают на левую сторону и конкурируют по обычному каскаду — побеждает последнее. В RTL они указывают на разные стороны, и применяются оба. Поведение компонента начинает зависеть от направления непредсказуемо — источник трудноуловимых багов. Правило: на одном элементе выбирайте что-то одно.

### Вертикальное письмо: \`writing-mode\`

\`\`\`css
.vertical {
  writing-mode: vertical-rl;
  inline-size: 200px;   /* вдоль строки — теперь это ВЫСОТА */
  block-size: 50px;     /* поперёк строк — теперь это ШИРИНА */
}
/* Результат: блок 50×200 (ширина × высота) */
\`\`\`

В вертикальном режиме inline-ось вертикальная, и \`inline-size\` становится высотой. С физическими \`width\`/\`height\` такой компонент пришлось бы переписывать; с логическими он просто работает. В интерфейсах это встречается редко (японские и китайские тексты, вертикальные подписи), но хорошо показывает, что «логическое» — это не только про RTL.

### Атрибут \`dir\`, свойство \`direction\` и \`:dir()\`

\`\`\`html
<html lang="ar" dir="rtl">                 <!-- направление всей страницы -->
<p dir="auto">{{ userComment }}</p>        <!-- направление по первому сильному символу текста -->
\`\`\`

\`\`\`css
p:dir(rtl) { font-family: 'Noto Naskh Arabic', serif; }
\`\`\`

\`\`\`text
<div dir="rtl"><p>        → p:dir(rtl) срабатывает
<div style="direction: rtl"><p> → p:dir(rtl) НЕ срабатывает, хотя логические свойства развернулись
\`\`\`

Направление задают HTML-атрибутом \`dir\`, а не CSS-свойством \`direction\`. Направление — это смысл контента (на каком языке текст), а не оформление: оно должно работать без CSS, его видят скринридеры и \`:dir()\`. \`dir="auto"\` нужен для пользовательского контента: комментарий на иврите внутри русского интерфейса получит правильное направление сам.

### Что не зеркалится автоматически

\`\`\`css
.icon-back { transform: none; }
.icon-back:dir(rtl) { transform: scaleX(-1); } /* стрелка «назад» смотрит вправо в RTL */

.card { box-shadow: 4px 0 8px rgb(0 0 0 / 0.2); } /* тень справа — и в RTL тоже */
\`\`\`

\`transform: translateX(10px)\`, \`box-shadow\`, \`background-position\`, градиенты \`to right\` и направленные иконки (стрелки, «назад», прогресс) остаются физическими. Их разворачивают вручную через \`:dir(rtl)\`. А вот flexbox и grid уже логические: \`flex-direction: row\` в RTL раскладывает элементы справа налево (проверено: первый элемент оказывается справа).

### Angular: направление из локали

\`\`\`ts
import { Component, DOCUMENT, LOCALE_ID, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

type Dir = 'ltr' | 'rtl';

export function textDirection(locale: string): Dir {
  const loc = new Intl.Locale(locale) as Intl.Locale & {
    getTextInfo?: () => { direction: Dir };   // новое API (Chromium)
    textInfo?: { direction: Dir };            // старое API (Node 20, старый V8)
  };
  const info = loc.getTextInfo?.() ?? loc.textInfo;
  if (info) return info.direction;
  return ['ar', 'he', 'fa', 'ur'].includes(loc.language) ? 'rtl' : 'ltr'; // запасной вариант
}

// textDirection('ar-EG') → 'rtl', textDirection('he') → 'rtl', textDirection('ru') → 'ltr'

@Component({ selector: 'app-root', imports: [RouterOutlet], template: \`<router-outlet />\` })
export class App {
  constructor() {
    const locale = inject(LOCALE_ID);
    const html = inject(DOCUMENT).documentElement;
    html.lang = locale;
    html.dir = textDirection(locale);
  }
}
\`\`\`

Функция \`getLocaleDirection\` из \`@angular/common\` в Angular 21 помечена устаревшей с советом использовать \`Intl\`. Но у \`Intl.Locale\` поддержка неровная: в Chromium 151 есть метод \`getTextInfo()\`, в Node 20 — только старое свойство \`textInfo\`, в Firefox 150 нет ни того, ни другого (проверено). Поэтому запасной список RTL-языков обязателен. Когда \`dir\` стоит на \`<html>\`, все логические свойства в компонентах переключаются сами.

### Где это применяется на практике

- **Продукты для Ближнего Востока и Израиля**: банковские и государственные порталы, где RTL — требование, а не пожелание.
- **Дизайн-системы и библиотеки компонентов**: компоненты пишутся на логических свойствах один раз и работают в любом приложении-потребителе.
- **Data grid и таблицы**: выравнивание \`start\`/\`end\` в ячейках, закреплённые колонки с \`inset-inline-start\`, горизонтальный скролл в RTL.
- **Пользовательский контент**: \`dir="auto"\` для комментариев, чатов и полей ввода с текстом на разных языках.
- **Многоязычные Angular-приложения** с \`@angular/localize\`: отдельная сборка на локаль, \`dir\` выставляется по \`LOCALE_ID\`.
- **Даже «только английский» продукт**: дешёвая страховка на будущую локализацию и более честные имена свойств.

## Важные нюансы и подводные камни

- **\`inset\` — физический шорткат**, несмотря на новое имя. Для \`inset: 0\` разницы нет, но несимметричные значения в RTL не зеркалятся; логика — в \`inset-block\` / \`inset-inline\`.
- **Смешивание физического и логического** на одном элементе: в LTR побеждает последнее объявление, в RTL применяются оба на разные стороны.
- **Явный \`text-align: left\` ломает RTL.** По умолчанию \`text-align\` уже \`start\`; опасен именно жёстко прописанный \`left\` в reset-стилях и таблицах.
- **Трансформы, тени, фоны и иконки не зеркалятся** — разворачивайте через \`:dir(rtl)\`.
- **Логическое ≠ автоматический RTL.** Без \`dir="rtl"\` на \`<html>\` или другом предке ничего не поменяется.
- **Направление — через атрибут \`dir\`, а не CSS \`direction\`.** \`:dir()\` и вспомогательные технологии ориентируются на атрибут.
- **Четырёхзначные \`margin\`/\`padding\` физические.** Логической записи «в одну строку» браузеры пока не поддерживают — используйте \`margin-block\` + \`margin-inline\`.
- **\`scrollLeft\` в RTL отрицательный.** В Chromium 151 начальная позиция RTL-контейнера — 0, прокрутка идёт в отрицательные значения (−100 работает, +100 обрезается до 0); код виртуального скролла должен это учитывать.
- **Flexbox и grid уже логические**: порядок элементов в строке разворачивается сам, физические свойства нужно проверять только у отступов, позиционирования и декора.
- **Поддержка**: базовые логические свойства и шорткаты поддерживаются всеми современными браузерами; новые значения вроде \`float: inline-start\` — тоже, но в старых версиях может не быть.

**Плюсы:** один набор правил для LTR, RTL и вертикального письма; нет отстающей RTL-копии стилей; код описывает смысл («начало строки»), а не случайную сторону экрана; хорошая поддержка браузерами.
**Минусы:** длиннее писать и непривычно читать; нет логической четырёхзначной записи; трансформы, тени и иконки всё равно разворачивать вручную; смешивание с физическими свойствами даёт трудноуловимые баги.

## Как это спрашивают на собеседовании

**Главный вывод:** логические свойства описывают геометрию через оси текста (\`inline\`/\`block\`, \`start\`/\`end\`), а браузер сам сопоставляет их с физическими сторонами по \`direction\` и \`writing-mode\`. Поэтому \`dir="rtl"\` на \`<html>\` зеркалит вёрстку без отдельной RTL-таблицы стилей.

Типичные формулировки: «Что такое логические свойства CSS?», «Как сверстать компонент, чтобы он работал в RTL?», «Чем \`margin-inline-start\` отличается от \`margin-left\`?».

Что могут спросить следом:

- *Где задавать направление?* — HTML-атрибутом \`dir\` на \`<html>\` (или на блоке); для пользовательского текста — \`dir="auto"\`.
- *Что не зеркалится само?* — \`transform\`, \`box-shadow\`, \`background-position\`, градиенты и направленные иконки; их разворачивают через \`:dir(rtl)\`.
- *\`inset: 0\` — логическое свойство?* — Нет, физический шорткат; логические — \`inset-inline\` и \`inset-block\`.
- *Зачем это продукту только на английском?* — Дешёвая страховка на будущую локализацию и один набор правил вместо двух.
- *Что будет, если смешать \`margin-left\` и \`margin-inline-start\`?* — В LTR они конкурируют по каскаду, в RTL применяются оба на разные стороны.

### Ответ на 1 минуту

> Логические свойства описывают геометрию не в терминах экрана, а в терминах потока текста: ось \`inline\` — направление строки, ось \`block\` — направление, в котором идут строки. Вместо \`margin-left\` пишу \`margin-inline-start\`, вместо \`width\` — \`inline-size\`, вместо \`top\` — \`inset-block-start\`, вместо \`text-align: left\` — \`start\`. Браузер сам сопоставляет \`start\` и \`end\` с физическими сторонами по \`direction\` и \`writing-mode\`, поэтому при \`dir="rtl"\` на \`<html>\` вёрстка зеркалится без отдельной RTL-таблицы, а в вертикальном письме \`inline-size\` становится высотой. Направление задаю атрибутом \`dir\`, в Angular — по \`LOCALE_ID\`. Ловушки: \`inset\` — физический шорткат, смешивать \`margin-left\` и \`margin-inline-start\` нельзя, а трансформы, тени и иконки-стрелки нужно разворачивать вручную через \`:dir(rtl)\`. Физические свойства оставляю только там, где привязка к экрану осознанная.`,
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
      ru: `## В чём суть

Обычный вложенный grid рисует **свои собственные** линии и ничего не знает о линиях родителя. \`subgrid\` говорит ребёнку: «не рисуй свои — **возьми линии родителя**». Благодаря этому содержимое разных карточек выравнивается между собой: заголовки на одной высоте, описания начинаются с одной линии, кнопки стоят в ряд.

Аналогия: тетрадь в линейку. Обычный вложенный грид — когда каждый ученик расчерчивает свой листок сам, и строчки у всех на разной высоте. Subgrid — общая разлиновка на весь разворот: все пишут по одним и тем же линиям, и текст сходится по горизонтали.

**Какую проблему решает.** Классика: ряд карточек товаров. У одной заголовок в одну строку, у другой в три. Каждая карточка раскладывает свои части сама, поэтому описания начинаются на разной высоте, а кнопки «Купить» скачут. Дизайнер просит «выровнять», и раньше выбор был плохой: выравнивать высоты JavaScript-ом (мерить, пересчитывать при ресайзе), задавать заголовкам фиксированную высоту (обрезается текст) или выкидывать обёртку карточки и класть её части прямо в общую сетку (ломается семантика и доступность). \`subgrid\` решает это чистым CSS: части карточки встают на общие строки родительской сетки, а карточка остаётся цельным элементом.

## Словарик терминов

- **Grid-контейнер** — элемент с \`display: grid\`; его прямые дети становятся grid-элементами и раскладываются по сетке.
- **Трек (track)** — одна строка или одна колонка сетки.
- **Линия (grid line)** — граница между треками; линии нумеруются с 1, им можно дать имена: \`[title-start]\`.
- **Неявные треки (implicit tracks)** — строки или колонки, которые сетка создаёт сама, когда элементам не хватило объявленных (\`grid-auto-rows\`).
- **\`span\`** — «занять N треков»: \`grid-row: span 3\` — элемент растягивается на три строки родителя.
- **Вложенный grid (nested grid)** — grid-элемент, который сам объявил \`display: grid\` со своими треками; сетки родителя и ребёнка независимы.
- **\`subgrid\`** — значение \`grid-template-rows\` и/или \`grid-template-columns\`: вместо своих треков взять треки родителя на занятом диапазоне.
- **\`gap\`** — расстояние между треками; у subgrid по умолчанию наследуется от родителя.
- **Именованные области (\`grid-template-areas\`)** — способ нарисовать сетку «картинкой» из имён: \`"head head" "side main"\`.
- **\`display: contents\`** — элемент «исчезает» как бокс, а его дети становятся детьми его родителя при раскладке.
- **Grid overlay** — режим DevTools, который рисует линии сетки, номера и имена поверх страницы.

## Как это работает под капотом

1. Родитель объявляет сетку: колонки явно, строки — явно или неявно (\`grid-auto-rows\`), поэтому у него есть набор линий.
2. Ребёнок **занимает диапазон** треков родителя — например, \`grid-row: span 3\`. Это обязательный шаг: subgrid получает ровно столько треков, сколько занял.
3. Ребёнок пишет \`display: grid\` и \`grid-template-rows: subgrid\`, поэтому своих строк он не создаёт, а «одалживает» три строки родителя.
4. Затем браузер раскладывает **внуков** (заголовок, текст, кнопку) так, как будто они лежат прямо в родительской сетке: высота общей строки считается по самому высокому содержимому **всех** карточек в этом ряду.
5. Поэтому строка «заголовок» в ряду одна на всех — её задаёт самый длинный заголовок, и все описания начинаются с одной линии.
6. Имена линий родителя видны внутри subgrid; можно добавить и свои: \`grid-template-rows: subgrid [title] [body] [footer]\`.
7. \`gap\` по умолчанию наследуется от родителя, но subgrid может задать свой — тогда линии внутри чуть сдвигаются, а размеры треков остаются общими.
8. Оси независимы: можно взять subgrid по строкам, а колонки оставить своими (или наоборот, или обе оси сразу).
9. У subgrid **нет неявных треков** в «одолженной» оси: элемент, поставленный за пределы диапазона, прижимается к последнему треку.

### Пример 1. Ряд карточек: flex, вложенный grid и subgrid

\`\`\`html
<div class="cards">
  <article class="card">
    <h3 class="card__title">Ноутбук</h3>
    <p class="card__body">Лёгкий, 14 дюймов.</p>
    <button class="card__footer">Купить</button>
  </article>
  <!-- ещё две карточки: заголовок в 3 строки и в 1 строку с длинным описанием -->
</div>
\`\`\`

\`\`\`css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
}

/* Вариант A: flex-колонка */
.card { display: flex; flex-direction: column; gap: 0.5rem; }

/* Вариант B: вложенный grid */
.card { display: grid; grid-template-rows: auto 1fr auto; gap: 0.5rem; }

/* Вариант C: subgrid */
.card { display: grid; grid-row: span 3; grid-template-rows: subgrid; gap: 0.5rem; }
.card__title  { grid-row: 1; }
.card__body   { grid-row: 2; }
.card__footer { grid-row: 3; align-self: end; }
\`\`\`

\`\`\`text
Отступ сверху от начала карточки: заголовок / описание / кнопка (px), три карточки
(Chromium 151, контейнер 800px, строка текста 20px)
A flex:     0/28/56  |  0/68/96  |  0/28/96   ← кнопки скачут
B grid:     0/28/96  |  0/68/96  |  0/28/96   ← кнопки ровно, описания скачут
C subgrid:  0/68/136 |  0/68/136 |  0/68/136  ← всё на общих линиях
\`\`\`

В варианте A каждая карточка — отдельный поток, кнопка стоит сразу после текста. В варианте B карточки растянуты на высоту ряда, и трек \`1fr\` прижимает кнопку вниз — кнопки выровнялись, но граница «заголовок/описание» у каждой своя. В варианте C строки общие: строка заголовка высотой 60px задана самым длинным заголовком, и описания всех карточек начинаются с 68px.

### Пример 2. Обязательный \`span\`: что будет без него

\`\`\`css
.card { display: grid; grid-template-rows: subgrid; } /* забыли grid-row: span 3 */
.card__title  { grid-row: 1; }
.card__body   { grid-row: 2; }
.card__footer { grid-row: 3; }
\`\`\`

\`\`\`text
Chromium 151: все три части в одной строке, друг на друге (top 0/0/0, left 0/0/0)
Firefox 150:  все три части в одной строке, рядом по горизонтали
\`\`\`

Карточка по умолчанию занимает **одну** строку родителя, значит её subgrid состоит из одного трека. Неявных строк у subgrid нет, поэтому \`grid-row: 2\` и \`grid-row: 3\` прижимаются к единственной строке. Дальнейшее поведение разное в браузерах, но сломано оно в обоих. Это не «обычный грид»: обычный создал бы недостающие строки.

### Пример 3. Когда \`subgrid\` превращается в обычный grid

\`\`\`css
.wrapper { display: block; }                 /* родитель НЕ grid */
.wrapper .card { display: grid; grid-template-rows: subgrid; }
/* → заголовок / описание / кнопка: 0/28/56 — обычные неявные строки по контенту */
\`\`\`

Если родитель не grid-контейнер (или ребёнок абсолютно позиционирован), \`subgrid\` ведёт себя как \`none\`: ребёнок становится обычным гридом со своими неявными треками. Это удобно для переиспользования: та же карточка вне сетки просто работает как самостоятельная.

### Имена линий и области родителя

\`\`\`css
.page {
  display: grid;
  grid-template-columns: 100px 300px;
  grid-template-rows: 30px 100px;
  grid-template-areas: "head head" "side main";
}
.page > .inner {
  display: grid;
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  grid-template-columns: subgrid;
  grid-template-rows: subgrid;
}
.inner .content { grid-area: main; }
/* → .content: left 100px, top 30px, 300×100 — ровно область main родителя */
\`\`\`

Сам \`grid-template-areas\` subgrid не наследует, но области родителя создают неявные линии \`main-start\`/\`main-end\`, а линии subgrid получает вместе с треками. Поэтому \`grid-area: main\` внутри subgrid работает (проверено в Chromium 151 и Firefox 150). Свои имена тоже можно добавить: \`grid-template-rows: subgrid [title] [body] [footer] [end]\`, после чего \`grid-row: body\` ставит элемент во вторую строку.

### \`gap\` в subgrid

\`\`\`css
.cards { gap: 1rem; }                 /* 16px между всеми строками родителя */
.card  { grid-template-rows: subgrid; } /* без своего gap: заголовок→описание 16px */
.card  { grid-template-rows: subgrid; gap: 0.5rem; } /* свой gap: заголовок→описание 8px */
\`\`\`

Без собственного \`gap\` subgrid берёт родительский. Свой \`gap\` уменьшает расстояние внутри карточки, но не меняет размеры общих треков: браузер сдвигает линии subgrid на половину разницы. Расстояние **между** карточками в разных рядах по-прежнему задаёт родитель.

### \`subgrid\` против \`display: contents\`

\`\`\`css
.card { display: contents; background: #fff; border: 1px solid #ddd; }
/* бокс карточки 0×0: фон и рамка не рисуются, h3 и p стали отдельными элементами родительской сетки */
\`\`\`

До subgrid выравнивания добивались через \`display: contents\`: обёртка карточки исчезает, и её части раскладываются прямо в общей сетке. Но у карточки пропадают фон, рамка, тень, отступы и hover-эффекты, а в части браузеров и версий элементы с \`display: contents\` теряли семантику в дереве доступности (кнопки, списки, таблицы). \`subgrid\` сохраняет бокс карточки целиком и при этом даёт общие линии.

### Как выбрать

- **Части разных элементов должны стоять на общих линиях** (карточки, строки формы с подписями разной длины) — \`subgrid\`.
- **Компонент раскладывает себя сам, соседи ему не важны** — обычный вложенный grid или flex.
- **Нужно только прижать кнопку к низу** — хватит вложенного grid с \`1fr\` или flex с \`margin-top: auto\` у кнопки.
- **Обёртка не нужна ни визуально, ни семантически** — можно \`display: contents\`, но с оглядкой на доступность.

### Где это применяется на практике

- **Каталоги и витрины**: заголовки, цены, описания и кнопки всех карточек в ряду на одних линиях.
- **Формы**: \`<label>\` и поле в колонках родительской сетки — подписи разной длины, а поля начинаются с одной вертикали, при этом каждая строка формы остаётся отдельным компонентом.
- **Дашборды**: виджеты с шапкой, телом и футером выравниваются по общим строкам ряда.
- **Тарифные планы и таблицы сравнения**: пункты разных колонок на одной высоте без JS-подгонки.
- **Angular-компоненты в сетке**: хост \`<app-product-card>\` получает \`display: grid; grid-row: span 3; grid-template-rows: subgrid\` через \`:host\`, и шаблон компонента встаёт на линии родителя.

## Важные нюансы и подводные камни

- **Ребёнок не охватывает треки.** Без \`grid-row: span 3\` subgrid получает один трек; неявных треков нет, и части карточки сваливаются в одну строку (в Chromium — друг на друга, в Firefox — в ряд).
- **Родитель не grid — subgrid работает как обычный grid.** Это единственный случай, когда «тихо ведёт себя как обычный».
- **\`subgrid\` — значение \`grid-template-rows\`/\`grid-template-columns\`**, а не отдельное свойство и не значение \`display\`. \`display: grid\` у ребёнка по-прежнему нужен.
- **\`grid-template-areas\` не наследуется, но области родителя доступны**: \`grid-area: main\` внутри subgrid попадает в область родителя через неявные линии \`main-start\`/\`main-end\`.
- **Высота общей строки определяется всеми карточками ряда.** Одна карточка с очень длинным заголовком раздувает строку у всех; ограничивайте число строк (\`-webkit-line-clamp\`) там, где это важно.
- **Свой \`gap\` у subgrid** меняет расстояния внутри, но не размеры общих треков.
- **Глубокая вложенность** subgrid в subgrid работает, но отлаживается тяжело; включайте Grid overlay в DevTools (значок \`grid\` рядом с элементом в Elements).
- **Не путать с \`display: contents\`**: тот выкидывает бокс (фон, рамку, отступы) и в части браузеров ломал доступность; subgrid бокс сохраняет.
- **Поддержка**: Baseline 2023 — Firefox 71 (2019), Safari 16 (2022), Chrome 117 (2023), Chrome подключился последним.

**Плюсы:** выравнивание частей разных компонентов без JS и фиксированных высот; карточка остаётся цельным семантичным элементом; наследуются линии, имена и \`gap\`; оси настраиваются независимо.
**Минусы:** нужно знать заранее, сколько треков занимает ребёнок; одна «большая» карточка раздувает строку всему ряду; поведение при ошибках различается между браузерами; отладка вложенных subgrid сложнее.

## Как это спрашивают на собеседовании

**Главный вывод:** вложенный grid создаёт свои независимые треки, а \`subgrid\` заставляет ребёнка использовать треки родителя на занятом диапазоне. Поэтому части разных карточек встают на общие линии, а высота общей строки определяется самым большим содержимым в ряду.

Типичные формулировки: «Что такое \`subgrid\` и зачем он нужен?», «Как выровнять заголовки и кнопки в ряду карточек разной высоты?», «Чем \`subgrid\` отличается от вложенного grid?».

Что могут спросить следом:

- *Что обязательно для работы subgrid?* — Родитель — grid, ребёнок занимает диапазон треков (\`grid-row: span 3\`) и сам \`display: grid\` с \`grid-template-rows: subgrid\`.
- *Что наследуется?* — Размеры треков, имена линий (включая неявные от областей родителя) и по умолчанию \`gap\`; сам \`grid-template-areas\` — нет.
- *Как делали до subgrid?* — JS-выравнивание высот, фиксированные высоты или \`display: contents\` с потерей бокса карточки.
- *Можно ли subgrid только по одной оси?* — Да, оси независимы: строки — subgrid, колонки — свои.
- *Что будет, если забыть \`span\`?* — Subgrid получит один трек, неявных треков у него нет, части карточки сожмутся в одну строку.

### Ответ на 1 минуту

> Обычный вложенный grid создаёт собственные треки и ничего не знает о родительских, поэтому содержимое соседних карточек невозможно выровнять по общим линиям. \`subgrid\` — это значение \`grid-template-rows\` или \`grid-template-columns\`: ребёнок не создаёт свои треки, а берёт треки родителя на том диапазоне, который занимает, вместе с именами линий и \`gap\`, который можно переопределить. Обязательное условие — ребёнок должен охватывать диапазон, например \`grid-row: span 3\`: неявных треков у subgrid нет, и без \`span\` части карточки сожмутся в одну строку. Классический кейс — ряд карточек: высоту строки заголовка задаёт самый длинный заголовок ряда, и описания и кнопки всех карточек встают на одни линии без JS и без \`display: contents\`, который выкидывает бокс карточки. Оси независимы. Отлаживаю через Grid overlay в DevTools. Baseline 2023, Chrome поддержал последним.`,
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
      ru: `## В чём суть

\`min()\`, \`max()\` и \`clamp()\` — три математические функции CSS, которые умеют смешивать единицы (\`px\`, \`%\`, \`rem\`, \`vw\`, \`ch\`) в одном выражении и выбирать значение на лету. \`min()\` ставит **потолок**, \`max()\` — **пол**, \`clamp()\` — сразу и пол, и потолок вокруг «желаемого» значения. С ними размеры меняются плавно вместе с экраном или контейнером, без медиа-запросов.

Аналогия: термостат. Вы говорите «держи примерно 22 градуса, но не ниже 18 и не выше 26». Внутри коридора температура плавает свободно, а за границы не выходит никогда. \`clamp(18, 22, 26)\` — ровно это.

**Какую проблему решает.** Классическая адаптивность ступенчатая: до 768px заголовок 24px, после — 32px, после 1200px — 40px. На ширине 767px и 769px заголовки отличаются на треть, а между брейкпоинтами размер не меняется вовсе. Чтобы было плавнее, брейкпоинтов становится пять, шесть, десять — и каждый нужно поддерживать в каждом компоненте. Математические функции описывают правило один раз: «расти вместе с экраном, но не меньше и не больше вот этого». Попутно они решают бытовые задачи: «контейнер не шире 70 символов и не шире экрана», «колонка не уже 20rem, но и не вылезает за экран».

## Словарик терминов

- **Математические функции CSS** — \`calc()\`, \`min()\`, \`max()\`, \`clamp()\`: считают значение свойства из выражения.
- **\`rem\`** — размер шрифта корневого элемента \`<html>\`; по умолчанию 16px, и он растёт, если пользователь увеличил шрифт в браузере.
- **\`vw\` (viewport width)** — 1% ширины видимой области окна: при окне 1280px \`1vw\` = 12.8px.
- **\`ch\`** — ширина символа «0» текущего шрифта; удобная мера длины строки (\`70ch\` ≈ 70 символов).
- **\`%\`** — процент от чего-то «снаружи»: для \`width\` — от ширины содержащего блока, для \`font-size\` — от шрифта родителя.
- **Fluid typography (плавная типографика)** — размер шрифта, который плавно растёт с шириной экрана между минимумом и максимумом.
- **Наклон и база (slope и intercept)** — в выражении \`1rem + 2.5vw\` часть \`1rem\` — база, \`2.5vw\` — наклон: насколько быстро значение растёт с шириной экрана.
- **Вычисленное и используемое значение (computed / used value)** — computed браузер знает на этапе стилей, used — только после раскладки (например, когда в выражении есть \`%\`).
- **Custom property (\`--step-0\`) и \`var()\`** — CSS-переменная и её подстановка в свойство.
- **\`@property\`** — регистрация CSS-переменной с типом, например \`<length>\`; такая переменная вычисляется в пиксели.
- **\`minmax()\`** — функция grid: «трек не меньше A и не больше B».
- **WCAG 1.4.4 Resize Text** — критерий доступности: текст должен увеличиваться до 200% без потери содержимого.

## Как это работает под капотом

1. Браузер разбирает выражение и проверяет типы: длину можно складывать с длиной, умножать на число; \`+\` и \`-\` обязательно окружать пробелами, иначе \`-2rem\` читается как отрицательное число.
2. Затем он подставляет единицы: \`rem\` превращается в пиксели по шрифту \`<html>\`, \`vw\` — по ширине окна. Если в выражении только такие единицы, итоговое число известно уже на этапе стилей — \`getComputedStyle\` вернёт готовые \`px\`.
3. Если внутри есть \`%\` для ширины, значение зависит от размера родителя, поэтому оно хранится как выражение и досчитывается во время раскладки.
4. \`min(a, b)\` берёт **меньшее** — поэтому работает как верхняя граница; \`max(a, b)\` берёт **большее** — нижняя граница.
5. \`clamp(MIN, PREF, MAX)\` — это ровно \`max(MIN, min(PREF, MAX))\`: сначала PREF обрезается сверху, потом подпирается снизу.
6. При изменении окна меняется \`vw\`, поэтому браузер пересчитывает стили и раскладку — размер меняется непрерывно, без ступенек.

Вся логика \`clamp\` в одной строке JS:

\`\`\`js
const clamp = (min, pref, max) => Math.max(min, Math.min(pref, max));

clamp(18, 22, 26); // 22 — внутри коридора
clamp(18, 30, 26); // 26 — упёрлись в потолок
clamp(18, 10, 26); // 18 — упёрлись в пол
clamp(48, 13, 32); // 48 — MIN > MAX: побеждает MIN
\`\`\`

### \`min()\` — потолок

\`\`\`css
.article { width: min(100%, 60ch); }
/* родитель 250px  → 250px  (100% меньше)
   родитель 1000px → 533.9px (60ch меньше; Arial 16px, ch зависит от шрифта) */
\`\`\`

Читается как «возьми меньшее из двух», а на практике значит «не шире 60 символов, но и не шире родителя». Раньше это писали парой свойств \`width: 100%; max-width: 60ch\`; \`min()\` делает то же одной строкой и работает в любом свойстве, где нет своего \`max-*\`: в \`padding\`, \`gap\`, \`font-size\`.

### \`max()\` — пол

\`\`\`css
.note { font-size: max(1rem, 2vw); }
/* окно 1280px: 2vw = 25.6px → 25.6px
   окно 320px:  2vw = 6.4px  → 16px (не опускаемся ниже 1rem) */

.page { padding-inline: max(1rem, env(safe-area-inset-left)); } /* не меньше 1rem и не меньше «чёлки» iPhone */
\`\`\`

\`max()\` берёт большее, поэтому задаёт нижнюю границу. Мнемоника: функция называется по тому, **что она выбирает**, а не по тому, что ограничивает. \`min()\` выбирает меньшее и потому ограничивает сверху, \`max()\` — наоборот.

### \`clamp()\` и плавная типографика

\`\`\`css
:root {
  --step-0: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);
  --step-2: clamp(1.5rem, 1rem + 2.5vw, 2.5rem);
  --gutter: clamp(1rem, 5vw, 3rem);
}

body { font-size: var(--step-0); }
h1   { font-size: var(--step-2); }

.container {
  inline-size: min(100% - 2 * var(--gutter), 70ch); /* не шире экрана с полями и не длиннее строки чтения */
  margin-inline: auto;
}
\`\`\`

\`\`\`text
Chromium 151, шрифт Arial:
окно 320px:  body 16px,    h1 24px,   gutter 16px,   container 288px
окно 768px:  body 18.24px, h1 35.2px, gutter 38.4px, container 691.2px
окно 1000px: body 19.4px,  h1 40px,   gutter 48px,   container 755.3px (упёрся в 70ch)
окно 1280px: body 20px,    h1 40px,   gutter 48px,   container 778.6px (70ch при шрифте 20px)
\`\`\`

\`h1\` растёт от 24px до 40px. На 320px предпочтительное значение \`16 + 8 = 24px\` ровно равно минимуму, на 960px \`16 + 24 = 40px\` упирается в максимум, а между ними размер меняется линейно. Внутри \`min()\` арифметику можно писать без \`calc()\`: \`100% - 2 * var(--gutter)\` — законное выражение. Обратите внимание на \`70ch\`: он считается от шрифта самого \`.container\`, а шрифт растёт вместе с \`--step-0\`, поэтому и предел строки чтения в пикселях растёт.

### Как вывести формулу для \`clamp()\`

Обычно дизайнер даёт две точки: «на 320px заголовок 24px, на 960px — 40px». Между ними нужна прямая линия:

\`\`\`js
// Строит clamp() для плавного роста от minPx (на экране minVw) до maxPx (на экране maxVw)
function fluid(minPx, maxPx, minVw, maxVw, root = 16) {
  const slope = (maxPx - minPx) / (maxVw - minVw);   // px шрифта на 1px ширины экрана
  const base = minPx - slope * minVw;                // значение «при нулевой ширине»
  const r = (n) => +n.toFixed(4);
  return \`clamp(\${r(minPx / root)}rem, \${r(base / root)}rem + \${r(slope * 100)}vw, \${r(maxPx / root)}rem)\`;
}

console.log(fluid(24, 40, 320, 960));   // clamp(1.5rem, 1rem + 2.5vw, 2.5rem)
console.log(fluid(16, 20, 320, 1120));  // clamp(1rem, 0.9rem + 0.5vw, 1.25rem)
\`\`\`

Наклон — на сколько пикселей растёт шрифт на каждый пиксель ширины: (40 − 24) / (960 − 320) = 0.025, то есть \`2.5vw\`. База — где прямая пересекает ноль: 24 − 0.025 × 320 = 16px = \`1rem\`. Именно так получены значения \`--step-2\` и \`--step-0\` выше; на практике это считают генераторами вроде Utopia, но формулу полезно понимать.

### \`calc()\` и правила арифметики

\`\`\`js
CSS.supports('width', 'calc(100% -2rem)');   // false: "-2rem" — отрицательное число, оператора нет
CSS.supports('width', 'calc(100% - 2rem)');  // true
CSS.supports('width', 'calc(2*3px)');        // true: вокруг * и / пробелы не нужны
CSS.supports('width', 'calc(2px * 3px)');    // false: px × px — это не длина
CSS.supports('width', 'min(100% - 2rem, 70ch)'); // true: внутри min() арифметика без calc()
\`\`\`

\`calc()\` — базовая функция «посчитай выражение». Классические правила: при умножении хотя бы один множитель — число без единиц, делить — только на число без единиц. Новая спецификация разрешает и деление единиц друг на друга (\`calc(10px / 20px)\` = 0.5): в Chromium 151 \`opacity: calc(10px / 20px)\` даёт 0.5, а в Firefox 150 такое объявление отбрасывается (проверено) — пока не используйте это в продакшене без проверки поддержки. Функции можно вкладывать друг в друга: \`clamp(1rem, calc(...), max(...))\`.

### \`minmax(min(100%, 20rem), 1fr)\` — сетка без переполнения

\`\`\`css
.g1 { display: grid; grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr)); }
.g2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr)); }
/* контейнер 250px:  .g1 → колонка 320px, горизонтальный скролл;  .g2 → колонка 250px
   контейнер 1000px: .g2 → три колонки по ~333px */
\`\`\`

\`minmax(20rem, 1fr)\` обещает колонке минимум 320px — даже если контейнер уже. \`min(100%, 20rem)\` говорит «минимум 20rem, но не больше ширины контейнера». Это самый частый рецепт адаптивной сетки карточек без медиа-запросов.

### CSS-переменные: что хранится в \`--step-0\`

\`\`\`css
@property --gutter-reg { syntax: '<length>'; inherits: true; initial-value: 0px; }
:root {
  --gutter: clamp(1rem, 5vw, 3rem);
  --gutter-reg: clamp(1rem, 5vw, 3rem);
}
\`\`\`

\`\`\`js
getComputedStyle(document.documentElement).getPropertyValue('--gutter');     // "clamp(1rem, 5vw, 3rem)"
getComputedStyle(document.documentElement).getPropertyValue('--gutter-reg'); // "48px" (окно 1280px)
\`\`\`

Обычная переменная хранит текст выражения, а вычисляется оно там, где подставлено через \`var()\`, — с \`vw\` и \`rem\` того места. Если JS-код читает переменную и ждёт пиксели, зарегистрируйте её через \`@property\` с типом \`<length>\`. Кстати, процент внутри функций считается от «своей» базы свойства: \`font-size: min(150%, 2rem)\` при шрифте родителя 20px даёт 30px.

### Доступность: почему в PREF нужен \`rem\`

\`\`\`text
Модель зума 200% на окне 1280 физических px (CSS-ширина окна становится 640px):
font-size: 4vw            → 51.2px на 100%, 51.2px на 200% (не вырос вообще)
clamp(1rem, 0.9rem + 0.5vw, 1.25rem) → 20px → 35.2px (×1.76)
clamp(1.5rem, 1rem + 2.5vw, 2.5rem)  → 40px → 64px   (×1.6)
\`\`\`

При зуме браузер уменьшает ширину окна в CSS-пикселях, поэтому \`vw\`-часть в физических пикселях не растёт, а \`rem\`-часть растёт. Чистый \`vw\` в \`font-size\` не реагирует ни на зум, ни на увеличенный шрифт в настройках браузера — пользователь не может увеличить текст, а это нарушение WCAG 1.4.4. Поэтому \`rem\`-слагаемое в PREF обязательно, а итог стоит проверить на зуме 200%: чем больше доля \`vw\`, тем меньше текст реально вырастет.

### Где это применяется на практике

- **Шкала типографики дизайн-системы**: \`--step--1\`…\`--step-5\` на \`clamp()\`, компоненты используют только переменные.
- **Отступы и поля страниц**: \`padding-inline: clamp(1rem, 5vw, 3rem)\` — на телефоне компактно, на десктопе просторно.
- **Ширина контента**: \`min(100% - 2rem, 70ch)\` для статей, документации, форм.
- **Адаптивные сетки карточек и виджетов дашборда**: \`repeat(auto-fit, minmax(min(100%, 20rem), 1fr))\`.
- **Компоненты в контейнерах**: вместе с container queries — \`font-size: clamp(1rem, 4cqi, 2rem)\`, где \`cqi\` — 1% ширины контейнера, а не экрана.
- **Безопасные зоны мобильных**: \`max(1rem, env(safe-area-inset-left))\`.

## Важные нюансы и подводные камни

- **Чистый \`vw\` в \`font-size\`** не масштабируется зумом и валит WCAG 1.4.4. Всегда \`база в rem + наклон в vw\`, а не просто \`4vw\`.
- **Путают \`min\` и \`max\` местами.** \`min()\` ограничивает **сверху**, \`max()\` — **снизу**, потому что выбирают меньшее и большее значение.
- **MIN > MAX в \`clamp\`** — побеждает MIN: \`clamp(3rem, 1vw, 2rem)\` всегда 48px, и вёрстка молча ведёт себя не так, как задумано.
- **Пробелы обязательны только вокруг \`+\` и \`-\`.** \`calc(100% -2rem)\` невалидно, а \`calc(2*3px)\` работает.
- **Типы в арифметике.** px × px недопустимо; деление единиц на единицы поддерживается не везде (Chromium 151 — да, Firefox 150 — нет).
- **\`100vw\` может давать горизонтальный скролл.** На системах с классическими (не накладными) полосами прокрутки, например в Windows, \`vw\` считается вместе с вертикальным скроллбаром; для «на всю ширину» используйте \`100%\`.
- **Когда считается значение.** Выражения из \`px\`, \`rem\`, \`vw\` превращаются в пиксели ещё на этапе стилей; с \`%\` для ширины — только при раскладке. Поэтому \`getComputedStyle(el).width\` вернёт px, а \`el.style.width\` — исходный текст \`min(50%, 300px)\`.
- **CSS-переменная хранит текст, а не число.** Без \`@property\` \`getPropertyValue('--gutter')\` вернёт строку выражения.
- **\`ch\` зависит от шрифта.** \`70ch\` у Arial 16px — около 623px, у другого шрифта будет иначе.
- **Проверка.** Прогоните ширину в DevTools от 320px до 2560px и зум до 200%: нет переполнения, текст не «слипается» на краях диапазона.

**Плюсы:** плавная адаптивность без брейкпоинтов; одна строка вместо пары \`width\` + \`max-width\` или набора медиа-запросов; смешивание единиц; поддержка всеми современными браузерами (Baseline).
**Минусы:** формулы с наклоном неочевидны без генератора; легко сломать доступность чистым \`vw\`; ошибки (MIN > MAX, пропущенный пробел) не дают ошибок в консоли; результат зависит от шрифта и полос прокрутки.

## Как это спрашивают на собеседовании

**Главный вывод:** \`min()\` — потолок, \`max()\` — пол, \`clamp(MIN, PREF, MAX)\` = \`max(MIN, min(PREF, MAX))\`. Fluid typography — это PREF вида \`rem + vw\`: \`rem\` даёт базу и уважение к зуму, \`vw\` — плавный рост между двумя границами.

Типичные формулировки: «Как сделать плавно растущий заголовок без медиа-запросов?», «Чем \`min()\` отличается от \`max()\`?», «Как работает \`clamp()\`?».

Что могут спросить следом:

- *Почему нельзя просто \`font-size: 4vw\`?* — Не масштабируется зумом и пользовательским шрифтом, нарушает WCAG 1.4.4; нужна \`rem\`-база.
- *Как посчитать наклон для \`clamp()\`?* — (maxPx − minPx) / (maxVw − minVw), умножить на 100 — это \`vw\`; база = minPx − наклон × minVw.
- *Что будет, если MIN больше MAX?* — Побеждает MIN.
- *Как сделать сетку карточек без медиа-запросов?* — \`repeat(auto-fit, minmax(min(100%, 20rem), 1fr))\`.
- *Когда браузер вычисляет эти функции?* — Как можно раньше: с абсолютными единицами и \`vw\` — на этапе стилей, с \`%\` — во время раскладки; при ресайзе пересчитывает.

### Ответ на 1 минуту

> \`min()\`, \`max()\` и \`clamp()\` — математические функции CSS, которые принимают смешанные единицы и выбирают значение на лету. \`min()\` берёт меньшее и поэтому работает как потолок: \`width: min(100%, 60ch)\` — не шире родителя и не длиннее 60 символов. \`max()\` берёт большее — это пол. \`clamp(MIN, PREF, MAX)\` раскрывается ровно в \`max(MIN, min(PREF, MAX))\`. Типичное применение — плавная типографика: \`clamp(1.5rem, 1rem + 2.5vw, 2.5rem)\` растёт от 24 до 40 пикселей между экранами 320 и 960, без медиа-запросов и без ступенек; наклон считаю по двум точкам из макета. Важный нюанс доступности: чистый \`vw\` в \`font-size\` не реагирует на зум и нарушает WCAG 1.4.4, поэтому \`rem\`-часть в PREF обязательна. Ещё частый приём — \`minmax(min(100%, 20rem), 1fr)\` против переполнения на узких экранах. Из ловушек: пробелы вокруг плюса и минуса и MIN больше MAX.`,
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
      ru: `## В чём суть

CSS-переменная (\`--accent\`) — это не переменная из JS и не переменная SCSS, а **обычное CSS-свойство**, которое наследуется вниз по дереву DOM и хранит значение как кусок текста. \`@property\` даёт этому свойству **тип** — и браузер начинает понимать, что внутри: число, длина, цвет. А \`color-mix()\` смешивает цвета прямо в браузере, поэтому оттенки можно выводить из одного токена на лету.

Аналогия: правила дома. Повесили объявление на входе (\`:root\`) — «во всём доме тихий час». Повесили на дверь детской (\`.theme-dark\`) — «а здесь свои порядки». Правило действует на комнату и всё, что внутри неё, а соседняя комната его не видит. Никакой «области видимости по месту написания», как у \`let\` в JS, нет — есть только дерево комнат.

**Какую проблему решает.** Переменные SCSS живут только во время сборки: после компиляции от \`$accent\` остаётся готовое \`#0064c8\`, и поменять его в рантайме, для одного поддерева или по выбору пользователя нельзя. Custom properties живут в браузере: темы, плотность таблицы, акцентный цвет клиента в white-label-приложении переключаются сменой одного значения, без пересборки CSS. \`@property\` закрывает две дыры обычных переменных — их нельзя плавно анимировать и нельзя проверить на корректность. \`color-mix()\` заменяет препроцессорные \`lighten()\` и \`darken()\`, которые не работают со значением, известным только в рантайме.

## Словарик терминов

- **Custom property (кастомное свойство, CSS-переменная)** — свойство с именем на \`--\`, например \`--accent: #0064c8\`. Браузер хранит его значение как последовательность токенов, не вникая в смысл.
- **\`var()\`** — функция подстановки: \`var(--accent, blue)\` берёт значение переменной, а если её нет — фолбэк (второй аргумент).
- **Каскад (cascade)** — алгоритм, который выбирает одно победившее объявление свойства для элемента: важность, слои, специфичность, порядок.
- **Наследование (inheritance)** — если у элемента нет своего объявления свойства, он берёт значение родителя. Незарегистрированные CSS-переменные наследуются всегда.
- **Вычисленное значение (computed value)** — значение после каскада, наследования и подстановки \`var()\`; его возвращает \`getComputedStyle()\`.
- **IACVT (invalid at computed-value time)** — «невалидно на этапе вычисления»: после подстановки \`var()\` значение оказалось бессмысленным для свойства, и свойство ведёт себя как \`unset\`.
- **\`unset\`** — ключевое слово: для наследуемых свойств работает как \`inherit\` (значение родителя), для ненаследуемых — как \`initial\` (значение по умолчанию).
- **\`@property\` (зарегистрированное свойство)** — CSS-правило, которое объявляет для переменной тип (\`syntax\`), наследование (\`inherits\`) и начальное значение (\`initial-value\`).
- **\`CSS.registerProperty()\`** — то же самое, что \`@property\`, только из JavaScript.
- **Интерполяция (interpolation)** — вычисление промежуточных значений между «было» и «стало» во время анимации или перехода.
- **Цветовое пространство (color space)** — способ описать цвет числами: \`srgb\` (красный, зелёный, синий), \`oklab\` и \`oklch\` (светлота, насыщенность, оттенок, подобранные под человеческое восприятие).
- **\`color-mix()\`** — функция, которая смешивает два цвета в указанном пространстве в заданной пропорции.
- **Дизайн-токен (design token)** — именованное значение дизайн-системы: \`--accent\`, \`--radius-m\`, \`--space-2\`.
- **Baseline** — отметка web.dev о том, что фича работает во всех основных браузерах (Chrome, Edge, Firefox, Safari); год — когда это произошло.

## Как это работает под капотом

Что делает браузер с CSS-переменной, по шагам:

1. **Разбор CSS.** Встретив \`--x: что угодно\`, парсер почти ничего не проверяет (только парность скобок) и сохраняет значение как строку токенов. Поэтому \`--x: 10px+{a:1}\` — валидное объявление.
2. **Каскад.** Для каждого элемента из всех объявлений \`--x\` выбирается победитель — по тем же правилам, что для \`color\` или \`margin\`. Поэтому переменную можно переопределить классом, медиазапросом, \`:hover\`.
3. **Наследование.** Если на элементе своего объявления нет, значение берётся у родителя. Так значение с \`:root\` «доезжает» до каждого элемента, а переопределение на \`.card\` действует только на поддерево карточки.
4. **Подстановка.** Когда браузер вычисляет обычное свойство, например \`background: var(--bg)\`, он подставляет вместо \`var()\` токены переменной и только **потом** разбирает получившееся значение как \`background\`.
5. **Проверка результата.** Если после подстановки значение не подходит свойству (\`color: 20px\`), объявление считается IACVT и свойство становится \`unset\`. Откатиться к предыдущему объявлению браузер уже не может — каскад к этому моменту закончен.
6. **Регистрация меняет правила.** Если переменная объявлена через \`@property\`, браузер разбирает её значение по указанному типу, приводит к вычисленному виду (\`2em\` → \`32px\`), наследует или нет по флагу \`inherits\` и умеет её интерполировать.

### Пример 1. Скоуп по дереву: тема для поддерева

\`\`\`css
:root        { --bg: #111; }
.theme-light { --bg: white; }
.box         { background: var(--bg); }
\`\`\`

\`\`\`html
<div class="box" id="a"></div>
<div class="theme-light">
  <div class="box" id="b"><span id="b2">x</span></div>
</div>
\`\`\`

\`\`\`js
getComputedStyle(a).getPropertyValue('--bg');   // "#111"
getComputedStyle(a).backgroundColor;            // "rgb(17, 17, 17)"
getComputedStyle(b).getPropertyValue('--bg');   // "white"
getComputedStyle(b2).getPropertyValue('--bg');  // "white" — унаследовано от .theme-light
\`\`\`

Обратите внимание: \`getPropertyValue('--bg')\` вернул строку \`"#111"\` ровно в том виде, как она написана, — для браузера это просто текст. Цветом он становится только в момент подстановки в \`background\`.

### Пример 2. \`var()\` и фолбэк

\`\`\`css
.a { width: var(--missing, 123px); }   /* переменной нет → 123px */
.b { color: var(--brand, var(--accent, black)); } /* фолбэки можно вкладывать */
\`\`\`

Фолбэк срабатывает, только когда переменная **не определена** (или ей явно присвоено \`--x: initial\` — это «гарантированно-невалидное» значение). Если переменная определена, но её значение не подходит свойству, фолбэк **не** спасёт — это следующий пример.

### Пример 3. IACVT: «невалидное значение» не откатывается назад

\`\`\`css
.parent { color: green; }
.box {
  --c: 20px;
  color: red;
  color: var(--c);   /* после подстановки получилось color: 20px */
}
\`\`\`

\`\`\`js
getComputedStyle(box).color; // "rgb(0, 128, 0)" — зелёный от родителя, а не red
\`\`\`

Почему так: каскад выбрал последнее объявление \`color: var(--c)\` ещё до подстановки — на этом этапе браузер не знает, что внутри. Когда подстановка дала \`20px\`, менять победителя поздно, и свойство становится \`unset\`. \`color\` наследуемый, поэтому взялся цвет родителя. Для ненаследуемого свойства (\`background\`, \`width\`) получилось бы начальное значение — прозрачный фон или \`auto\`.

### \`@property\`: регистрируем тип

\`@property\` — правило, которое превращает «строку токенов» в типизированное свойство. Три дескриптора:

- \`syntax\` — тип: \`'<length>'\`, \`'<percentage>'\`, \`'<color>'\`, \`'<angle>'\`, \`'<number>'\`, перечисления вроде \`'small | large'\`, списки \`'<length>+'\` или \`'*'\` (что угодно, как у обычной переменной).
- \`inherits\` — \`true\` или \`false\`: наследуется ли значение потомкам.
- \`initial-value\` — значение по умолчанию; обязательно для любого \`syntax\`, кроме \`'*'\`.

\`\`\`css
@property --p {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 0%;
}
\`\`\`

Что это даёт: браузер теперь знает, что \`--p\` — процент, а значит, умеет считать промежуточные значения между \`0%\` и \`100%\`, отбрасывает мусор вроде \`--p: red\` и не протаскивает значение в потомков.

### Пример 4. Анимация: без регистрации и с ней

\`\`\`css
@property --p { syntax: '<percentage>'; inherits: false; initial-value: 0%; }

.progress {
  --q: 0%;                                         /* --q не зарегистрирована */
  transition: --p 1000ms linear, --q 1000ms linear;
}
.progress.done { --p: 100%; --q: 100%; }
\`\`\`

\`\`\`js
el.classList.add('done');
// через 300 мс:
getComputedStyle(el).getPropertyValue('--p'); // "≈30%" (в моём прогоне Chrome — "28.34%")
getComputedStyle(el).getPropertyValue('--q'); // "100%" — сразу, перехода не было
\`\`\`

Почему так: для незарегистрированной переменной \`0%\` и \`100%\` — две несвязанные строки, «середины» между ними не существует. Такие значения анимируются **дискретно**, и поведение зависит от механизма:

- \`transition\` по умолчанию дискретные свойства вообще не анимирует — значение меняется мгновенно (это и видно выше);
- с \`transition-behavior: allow-discrete\` (или ключевым словом \`allow-discrete\` в \`transition\`) значение перещёлкивается на середине длительности;
- в \`@keyframes\`-анимации переключение тоже происходит на 50%: при \`animation: kq 1000ms\` в моменте 250 мс \`--k\` равна \`0%\`, в моменте 600 мс — \`100%\`.

С \`@property\` браузер интерполирует честно, и градиент \`linear-gradient(90deg, var(--accent) var(--p), #eee var(--p))\` из \`codeSnippet\` плавно заполняется. Так же делают анимацию угла \`conic-gradient\` (тип \`<angle>\`) или цвета внутри градиента (тип \`<color>\`). Сам \`background-image\` с градиентом Chrome не интерполирует (проверено: переход между двумя градиентами срабатывает мгновенно), а зарегистрированные переменные внутри градиента — да.

### Пример 5. Зарегистрированная переменная вычисляется раньше

\`\`\`css
@property --size { syntax: '<length>'; inherits: true; initial-value: 10px; }

.host  { font-size: 16px; --size: 2em; --raw: 2em; } /* --raw не зарегистрирована */
.child { font-size: 30px; }
\`\`\`

\`\`\`js
getComputedStyle(host).getPropertyValue('--size');  // "32px"
getComputedStyle(child).getPropertyValue('--size'); // "32px" — унаследованы готовые пиксели
getComputedStyle(child).getPropertyValue('--raw');  // "2em" — строка, пересчитается там, где её подставят
\`\`\`

Почему так: зарегистрированное свойство приводится к вычисленному значению на том элементе, где объявлено, и детям наследуется уже \`32px\`. Незарегистрированное наследуется как текст \`2em\` и превратится в \`60px\`, если подставить его в \`.child\`. Это частый сюрприз при переводе дизайн-системы на \`@property\`.

### Пример 6. Невалидное значение у зарегистрированной переменной

\`\`\`css
@property --size  { syntax: '<length>'; inherits: true;  initial-value: 10px; }
@property --nsize { syntax: '<length>'; inherits: false; initial-value: 10px; }

.parent { --size: 40px; --nsize: 40px; }
.bad    { --size: red;  --nsize: red; }  /* .bad лежит внутри .parent */
\`\`\`

\`\`\`js
getComputedStyle(parentEl).getPropertyValue('--nsize'); // "40px"
getComputedStyle(bad).getPropertyValue('--size');       // "40px" — inherits: true → значение родителя
getComputedStyle(bad).getPropertyValue('--nsize');      // "10px" — inherits: false → initial-value
\`\`\`

Невалидное значение у зарегистрированной переменной ведёт себя как \`unset\`: при \`inherits: true\` берётся значение родителя, при \`inherits: false\` — \`initial-value\`. А у дочернего элемента без своего объявления при \`inherits: false\` будет \`initial-value\` (\`10px\`), а не \`40px\` родителя — это и есть «защита от протечки».

### Пример 7. Фолбэк в \`var()\` у зарегистрированной переменной не срабатывает

\`\`\`css
@property --nsize { syntax: '<length>'; inherits: false; initial-value: 10px; }
.w { width: var(--nsize, 999px); }
\`\`\`

\`\`\`js
getComputedStyle(w).width; // "10px" — у зарегистрированной переменной всегда есть значение
\`\`\`

### \`CSS.registerProperty()\`: то же из JavaScript

\`\`\`js
CSS.registerProperty({ name: '--angle', syntax: '<angle>', inherits: false, initialValue: '0deg' });
// ок

CSS.registerProperty({ name: '--angle', syntax: '<angle>', inherits: false, initialValue: '0deg' });
// InvalidModificationError — повторно регистрировать нельзя

CSS.registerProperty({ name: '--len', syntax: '<length>', inherits: false });
// SyntaxError — для типа, отличного от '*', нужен initialValue

CSS.registerProperty({ name: '--len', syntax: '<length>', inherits: false, initialValue: '2em' });
// SyntaxError — initialValue должен быть «вычислительно независимым»: px можно, em и var() нельзя
\`\`\`

В JS-версии \`inherits\` обязателен, \`syntax\` по умолчанию \`'*'\`. В CSS-версии обязательны и \`syntax\`, и \`inherits\`: правило \`@property\` без \`inherits\` браузер целиком игнорирует (проверено в Chrome: переменная остаётся незарегистрированной и пустой). JS-вариант удобен, когда тип нужен библиотеке, которая подключается динамически.

### \`color-mix()\`: смешиваем цвета в браузере

Синтаксис: \`color-mix(in <пространство>, цвет1 [процент], цвет2 [процент])\`. Браузер переводит оба цвета в указанное пространство, смешивает их покомпонентно в заданной пропорции и возвращает результат.

\`\`\`css
color-mix(in srgb, blue, white)                    /* 50/50 → color(srgb 0.5 0.5 1) */
color-mix(in oklch, rgb(0 100 200) 85%, black)     /* → oklch(0.437 0.148 255.8), т.е. rgb(0 79 161) */
color-mix(in srgb, red 20%, blue 20%)              /* сумма 40% → color(srgb 0.5 0 0.5 / 0.4) */
color-mix(in oklch, rgb(0 100 200) 50%, transparent) /* полупрозрачный акцент */
\`\`\`

Правила процентов: если процент указан у одного цвета, второй получает остаток до 100%; если не указан ни у одного — по 50%; если сумма меньше 100%, пропорции нормализуются, а недостающее уходит в прозрачность (третья строка: альфа \`0.4\`).

### Пример 8. Почему для оттенков берут \`oklch\`, а не \`srgb\`

\`\`\`css
color-mix(in srgb,  blue, yellow)   /* → rgb(128 128 128) — серый */
color-mix(in oklab, blue, yellow)   /* → rgb(108 171 199) — приглушённый голубой */
color-mix(in oklch, blue, yellow)   /* → rgb(0 207 189) — бирюзовый, оттенок идёт по кругу */

color-mix(in oklch, rgb(0 100 200) 85%, black) /* → rgb(0 79 161): оттенок 255.8 сохранён */
\`\`\`

Почему так: \`srgb\` — пространство «для экрана», а не для глаза: в нём синий и жёлтый в сумме дают ровно серую середину. В \`oklch\` светлота, насыщенность и оттенок разделены и подобраны под восприятие: при смешивании с чёрным оттенок (\`255.8\`) остаётся прежним, а светлота и насыщенность уменьшаются на 15%. Поэтому затемнение и осветление в \`oklch\` выглядят равномерно для любого акцента. Для смеси двух разных хроматических цветов \`oklch\` может «проехать» по кругу оттенков через неожиданный цвет — тогда спокойнее \`oklab\`.

### Пример 9. Состояния кнопки из одного токена

Это \`codeSnippet\` из карточки:

\`\`\`css
.btn          { background: var(--accent); }
.btn:hover    { background: color-mix(in oklch, var(--accent) 85%, black); }
.btn:disabled { background: color-mix(in srgb, var(--accent), white 50%); }
\`\`\`

Смена одного \`--accent\` (например, \`.tenant-acme { --accent: #e4572e; }\`) автоматически пересчитывает hover и disabled. В SCSS для этого понадобились бы отдельные переменные на каждую тему и пересборка.

### Angular: прокидываем значения в переменные из компонента

\`\`\`ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-progress',
  host: { '[style.--p]': 'percent() + "%"' },
  template: \`<div class="bar"></div>\`,
  styles: \`
    @property --p { syntax: '<percentage>'; inherits: true; initial-value: 0%; }
    :host { display: block; transition: --p 600ms ease; }
    .bar { block-size: 4px; background: linear-gradient(90deg, var(--accent) var(--p), #eee var(--p)); }
  \`,
})
export class ProgressComponent {
  percent = input(0);
}
\`\`\`

Привязка \`[style.--p]\` работает: рендерер Angular для имён со знаком \`-\` вызывает \`el.style.setProperty('--p', value)\`. Значение лежит инлайн на хосте, анимируется благодаря \`@property\`, а \`.bar\` получает его по наследованию (поэтому здесь \`inherits: true\`). Учтите: \`@property\` не скоупится инкапсуляцией стилей Angular — регистрация глобальна на весь документ, поэтому имя должно быть уникальным.

### Где это применяется на практике

- **Темизация и white-label**: светлая/тёмная тема, бренд клиента в enterprise-портале — набор токенов на \`:root\` и переопределение на \`[data-theme]\` или классе.
- **Плотность интерфейса**: \`--row-height\` и \`--cell-padding\` для большого грида — переключатель «компактно / просторно» меняет две переменные, без перерисовки компонентов.
- **Производные цвета**: hover, focus-ring, фон выделенной строки, бордеры — через \`color-mix()\` из одного \`--accent\`.
- **Анимации**: прогресс-бары, кольцевые индикаторы на \`conic-gradient\` с \`--angle: <angle>\`, плавная смена цвета градиента в дашбордах.
- **Связка JS → CSS**: позиция курсора, процент загрузки, ширина колонки при ресайзе пишутся в переменную на ближайшем элементе, а вся геометрия считается в CSS.
- **Дизайн-системы**: \`@property\` с \`inherits: false\` для «приватных» параметров компонента, которые не должны протекать во вложенные компоненты.

## Важные нюансы и подводные камни

- **Ждут лексического скоупа, как в SCSS.** Его нет: переменная живёт на элементе и наследуется по DOM. Неважно, в каком файле она объявлена, важно, на каком элементе.
- **\`var()\` работает только в значениях свойств.** В имени свойства, в селекторе и в условии медиазапроса (\`@media (min-width: var(--bp))\`) подстановка не работает — для брейкпоинтов остаются переменные препроцессора.
- **IACVT вместо отката.** Невалидная подстановка делает свойство \`unset\`, а не возвращает предыдущее объявление того же правила. Фолбэк \`var(--x, ...)\` от этого не спасает, он нужен только для неопределённой переменной.
- **Невалидное значение у зарегистрированной переменной — тоже \`unset\`.** При \`inherits: false\` получится \`initial-value\`, при \`inherits: true\` — значение родителя. В старой версии ответа было «всегда \`initial-value\`» — это верно только для \`inherits: false\`.
- **Анимация без \`@property\`.** В \`transition\` значение меняется мгновенно; с \`allow-discrete\` и в \`@keyframes\` — перещёлкивается на середине. Плавно не будет никогда.
- **\`@property\` требует \`syntax\` и \`inherits\`.** Без любого из них правило молча игнорируется. \`initial-value\` обязателен для всех типов, кроме \`'*'\`, и не может содержать \`em\`, \`%\` от чего-то или \`var()\`.
- **Зарегистрированная \`<length>\` наследуется готовыми пикселями.** \`2em\` вычисляется на элементе объявления, а не там, где переменную используют.
- **Фолбэк у зарегистрированной переменной мёртв**: у неё всегда есть хотя бы \`initial-value\`.
- **Частая запись в переменную на \`:root\` дорогая.** Смена наследуемой переменной на корне заставляет браузер пересчитать стили всего документа. Значения, которые меняются на каждый \`mousemove\` или кадр, пишите на ближайший нужный элемент; насколько это заметно, зависит от размера DOM и движка.
- **Проценты в \`color-mix()\`.** Сумма меньше 100% даёт прозрачность (\`red 20%, blue 20%\` → альфа 0.4), это легко получить случайно.
- **\`srgb\` даёт грязные смеси.** Синий плюс жёлтый — серый. Для осветления и затемнения берите \`oklch\`, для смеси двух разных цветов — \`oklab\`.
- **Пространство в \`color-mix()\` пишите явно.** Свежие версии спецификации и браузеров разрешают его опускать (Chrome 154 по умолчанию берёт \`oklab\`), но в браузерах, вышедших раньше этого изменения, такая запись невалидна — проверьте поддержку под свою матрицу.
- **Поддержка.** \`color-mix()\` — Baseline 2023 (Firefox 113, Safari 16.2, Chrome 111). \`@property\` — Baseline только с июля 2024: Chrome поддерживал его с 2020 года, Safari с 16.4, а Firefox добавил в версии 128. В старой версии ответа «оба Baseline 2023» — для \`@property\` это неверно.
- **Отладка.** В DevTools во вкладке Computed видно итоговое значение переменной, а в Styles для зарегистрированных переменных можно перейти к их правилу \`@property\`. Без регистрации значение показывается как текст.

**Плюсы:** темы и токены меняются в рантайме и по поддереву, без пересборки; \`@property\` даёт анимацию, валидацию и контроль наследования; \`color-mix()\` выводит все состояния из одного цвета.
**Минусы:** нет лексического скоупа и статической проверки — опечатка в имени тихо даёт фолбэк или \`unset\`; не работает в медиазапросах и селекторах; \`@property\` регистрируется глобально и вычисляет значения раньше, чем ожидаешь.

## Как это спрашивают на собеседовании

**Главный вывод:** CSS-переменная — наследуемое свойство со значением-строкой, видимое по дереву DOM. \`@property\` даёт ей тип, а с ним интерполяцию, валидацию и контроль наследования. \`color-mix()\` смешивает цвета в рантайме, и для оттенков берут \`oklch\`.

Типичные формулировки: «Чем CSS-переменные отличаются от переменных SCSS?», «Как сделать тёмную тему без пересборки?», «Почему переход \`--x\` не анимируется?», «Как получить цвет hover из одного акцента?».

Что могут спросить следом:

- *Что будет, если подставить \`20px\` в \`color\` через \`var()\`?* — IACVT: свойство станет \`unset\`, то есть цвет унаследуется от родителя; предыдущее объявление не вернётся.
- *Можно ли использовать \`var()\` в медиазапросе?* — Нет, только в значениях свойств.
- *Что выбрать для темы: SCSS или custom properties?* — Custom properties для того, что меняется в рантайме (темы, бренд, плотность); SCSS — для брейкпоинтов, миксинов и того, что нужно на этапе сборки.
- *Зачем \`inherits: false\`?* — Чтобы параметр компонента не протекал во вложенные компоненты: у потомков будет \`initial-value\`.
- *Чем \`oklch\` лучше \`srgb\` для оттенков?* — Оно перцептивное: затемнение сохраняет оттенок и выглядит равномерно, а в \`srgb\` смеси уходят в серый.

### Ответ на 1 минуту

> CSS-переменная — это обычное наследуемое свойство, а не переменная из JS или SCSS: её видимость определяется деревом DOM, а не местом в коде. Объявил на \`:root\` — видно везде, переопределил на \`.theme-dark\` — изменилось только для этого поддерева, на этом строятся темы без пересборки. Для браузера её значение — просто текст, который подставляется через \`var()\` в момент вычисления; если результат невалиден, свойство становится \`unset\`, а не откатывается к прошлому объявлению. \`@property\` регистрирует тип, наследование и \`initial-value\`: появляется интерполяция, поэтому прогресс в градиенте или угол \`conic-gradient\` анимируются плавно, мусорные значения отбрасываются, а \`inherits: false\` не даёт параметру протечь в потомков. \`color-mix()\` смешивает цвета в рантайме — hover и disabled я вывожу из одного акцента, обычно в \`oklch\`, потому что в \`srgb\` смеси грязнеют. \`color-mix()\` — Baseline 2023, \`@property\` — 2024.`,
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
      ru: `## В чём суть

\`repeat(auto-fill, …)\` и \`repeat(auto-fit, …)\` просят браузер самому посчитать, сколько колонок влезет в контейнер. Считают они **одинаково**, разница одна — что делать с колонками, в которые не попал ни один элемент: \`auto-fill\` оставляет их пустыми, а \`auto-fit\` схлопывает до нуля и отдаёт место реальным элементам. \`minmax()\` задаёт колонке «не уже и не шире», а \`grid-template-areas\` позволяет нарисовать раскладку страницы словами и перестроить её одним правилом.

Аналогия: стол на шесть стульев, а гостей пришло двое. \`auto-fill\` оставляет четыре пустых стула стоять — гости сидят с краю, дальше пустота. \`auto-fit\` уносит лишние стулья, и двое рассаживаются по всему столу. Стульев при этом поставили одинаково — разница только в том, что сделали с пустыми.

**Какую проблему решает.** Раньше галерея карточек требовала пачку медиазапросов: до 600px — одна колонка, до 900px — две, дальше три. Брейкпоинты привязаны к ширине экрана, а не к месту, где стоит компонент: та же галерея в узкой боковой панели ломалась. Связка \`repeat(auto-fit, minmax(…, 1fr))\` даёт сетку, которая сама подстраивается под ширину **своего контейнера**, без единого медиазапроса. А \`grid-template-areas\` убирает хрупкие расчёты номеров линий: раскладка «шапка, меню, контент» описывается картинкой из слов.

## Словарик терминов

- **Грид-контейнер (grid container)** — элемент с \`display: grid\`; его прямые дети становятся грид-элементами.
- **Трек (track)** — колонка или строка сетки. \`grid-template-columns\` описывает треки-колонки.
- **\`fr\` (fraction)** — «доля свободного места»: \`1fr 2fr\` делят остаток в пропорции 1:2.
- **\`repeat(N, трек)\`** — повторить трек N раз: \`repeat(3, 1fr)\` = \`1fr 1fr 1fr\`. Вместо N можно написать \`auto-fill\` или \`auto-fit\`.
- **\`auto-fill\`** — «создай столько треков, сколько влезет», пустые треки оставь.
- **\`auto-fit\`** — то же, но пустые треки схлопни до 0.
- **\`minmax(min, max)\`** — трек не уже \`min\` и не шире \`max\`.
- **\`min()\`** — CSS-функция, берущая меньшее из значений: \`min(100%, 14rem)\`.
- **\`gap\`** — промежуток между треками; участвует в расчёте, сколько треков влезет.
- **Неявная сетка (implicit grid)** — строки (или колонки), которые браузер создаёт сам, когда элементов больше, чем ячеек в явно описанной сетке.
- **\`grid-template-areas\` / \`grid-area\`** — карта областей из строк-названий и привязка элемента к области по имени.
- **\`grid-template\`** — сокращённая запись, задающая области, строки и колонки одним свойством.
- **RAM-паттерн (Repeat, Auto, Minmax)** — \`repeat(auto-fit, minmax(X, 1fr))\`, адаптивная сетка без медиазапросов.
- **\`justify-content\`** — как распределить треки по горизонтали, если они не занимают всю ширину контейнера.

## Как это работает под капотом

Что делает браузер с \`grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))\` и \`gap: 16px\` в контейнере шириной 1000px:

1. **Выбирает размер трека для подсчёта.** Берётся максимум из \`minmax()\`, если он фиксированный, иначе минимум. Здесь максимум \`1fr\` — гибкий, поэтому считаем по \`200px\`.
2. **Считает количество.** Максимальное N, при котором N треков и N−1 промежутков не вылезают за контейнер: \`200·N + 16·(N−1) ≤ 1000\` → N = 4. Если не влезает даже один трек, всё равно создаётся **один**.
3. **Раскладывает элементы** по ячейкам. Если элементов больше, чем треков, создаются новые строки неявной сетки.
4. **Только для \`auto-fit\`:** треки, в которые не попал ни один элемент, схлопываются до 0, и промежутки вокруг них тоже исчезают.
5. **Распределяет ширину.** Каждый трек получает минимум 200px, а остаток делится между несхлопнутыми треками по \`1fr\`.

Упрощённо подсчёт количества выглядит так:

\`\`\`js
function autoRepeatCount(containerWidth, trackSize, gap) {
  // trackSize — max из minmax(), если он фиксированный, иначе min
  const n = Math.floor((containerWidth + gap) / (trackSize + gap));
  return Math.max(1, n); // хотя бы один трек, даже если он не влезает
}

autoRepeatCount(1000, 200, 16); // 4
autoRepeatCount(1000, 250, 16); // 3  — gap отнял четвёртую колонку
autoRepeatCount(1000, 250, 0);  // 4
autoRepeatCount(150, 224, 16);  // 1  — не влезает, но один трек будет
\`\`\`

Все результаты ниже получены в Chrome через \`getComputedStyle(grid).gridTemplateColumns\` — DevTools показывает те же числа в Grid overlay.

### \`auto-fill\`: пустые треки остаются

\`\`\`css
.g {
  display: grid;
  width: 1000px;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}
/* 2 карточки внутри */
\`\`\`

\`\`\`text
grid-template-columns: 238px 238px 238px 238px
карточки: x=0 (238px), x=254 (238px) — справа два пустых трека
\`\`\`

Почему так: треков четыре, \`1fr\` поделил остаток поровну между всеми четырьмя — \`(1000 − 3·16) / 4 = 238\`. Пустые треки тоже получили свою долю, поэтому карточки стоят слева, а справа «пустые стулья». Когда брать: пустые места осмысленны — календарь, где неделя всегда из семи колонок, планировка мест, витрина, где карточки не должны раздуваться при фильтрации до двух штук.

### \`auto-fit\`: пустые треки схлопываются

\`\`\`css
.g { /* то же самое, но */ grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
/* 2 карточки внутри */
\`\`\`

\`\`\`text
grid-template-columns: 492px 492px 0px 0px
карточки: x=0 (492px), x=508 (492px) — растянулись на всю ширину
\`\`\`

Почему так: треков по-прежнему четыре (видно в \`0px 0px\`), но два пустых схлопнулись вместе со своими промежутками, и \`1fr\` разделил всю ширину между двумя заполненными: \`(1000 − 16) / 2 = 492\`. Без элементов вообще все треки будут \`0px 0px 0px 0px\`. Когда брать: галереи, списки карточек, дашборды — почти всегда, когда хочется «заполнить ряд».

### Пример 3. Когда разницы нет

\`\`\`text
6 карточек, auto-fill: 238px 238px 238px 238px
6 карточек, auto-fit:  238px 238px 238px 238px
\`\`\`

Если элементов больше, чем треков в ряду, пустых треков нет — схлопывать нечего, и результат одинаковый. Пятая и шестая карточки ушли во вторую строку неявной сетки. Поэтому разницу видно только на «неполном» первом ряду: при фильтрации, поиске, на широком мониторе.

### Пример 4. Без \`1fr\` разница видна только с \`justify-content\`

\`\`\`css
.a { grid-template-columns: repeat(auto-fill, 200px); }
.b { grid-template-columns: repeat(auto-fit, 200px); }
/* по 2 карточки, контейнер 1000px, gap 16px */
\`\`\`

\`\`\`text
.a  треки: 200px 200px 200px 200px   карточки: x=0, x=216
.b  треки: 200px 200px 0px 0px       карточки: x=0, x=216   — выглядит одинаково

c justify-content: center:
.a  карточки: x=76,  x=292  — по центру стоит вся четвёрка треков, включая пустые
.b  карточки: x=292, x=508  — по центру стоят только две карточки
\`\`\`

Почему так: без гибкого \`1fr\` освободившееся место некому забрать, и при выравнивании по умолчанию (к началу) картинка совпадает. Но треки реально разные, и \`justify-content: center\` или \`space-between\` это проявляют. В старой версии ответа было «без \`1fr\` \`auto-fit\` внешне неотличим от \`auto-fill\`» — это верно только без \`justify-content\`.

### \`repeat()\`: что можно и что нельзя

\`\`\`css
grid-template-columns: repeat(3, 1fr);                              /* ок: фиксированное число */
grid-template-columns: 12rem repeat(auto-fill, minmax(10rem, 1fr)); /* ок: фиксированная колонка + авто */
grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr)); /* ок */

grid-template-columns: repeat(auto-fit, 1fr);                 /* невалидно */
grid-template-columns: repeat(auto-fill, minmax(auto, 1fr));  /* невалидно */
grid-template-columns: repeat(auto-fill, 100px) repeat(auto-fill, 100px); /* невалидно */
\`\`\`

Правило: при \`auto-fill\`/\`auto-fit\` браузеру нужен хотя бы один **фиксированный** размер (длина или процент), иначе ему не по чему считать количество. Автоповтор в списке треков может быть только один. Невалидное объявление молча отбрасывается целиком: в проверке \`repeat(auto-fit, 1fr)\` сетка осталась одной колонкой на всю ширину, и все элементы встали друг под друга.

### \`minmax()\`: какой размер участвует в подсчёте

\`\`\`css
.g { grid-template-columns: repeat(auto-fill, minmax(100px, 200px)); } /* 1000px, gap 16px */
\`\`\`

\`\`\`text
200px 200px 200px 200px   — 4 трека, а не 8
\`\`\`

Почему так: максимум \`200px\` фиксированный, поэтому подсчёт идёт по нему: \`floor(1016 / 216) = 4\`. Если бы считали по минимуму 100px, влезло бы восемь. Для \`minmax(15rem, 1fr)\` максимум гибкий, поэтому считают по \`15rem\`, а \`1fr\` потом растягивает треки. Отсюда «чтение» записи: трек **не уже 15rem**, но тянется до равной доли свободного места.

### \`gap\` участвует в расчёте

\`\`\`text
minmax(250px, 1fr), контейнер 1000px, gap 0     → 250px 250px 250px 250px   (4 колонки)
minmax(250px, 1fr), контейнер 1000px, gap 16px  → 322.656px 322.672px 322.672px  (3 колонки)
\`\`\`

Четыре колонки по 250px — ровно 1000px, но три промежутка по 16px уже не помещаются. Про \`gap\` часто забывают, а потом удивляются, почему при «правильной» ширине контейнера колонок на одну меньше.

### \`min()\` против переполнения на узком экране

\`\`\`css
.plain { width: 150px; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }
.safe  { width: 150px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr)); }
\`\`\`

\`\`\`text
.plain  224px   scrollWidth 224 > 150 → горизонтальный скролл
.safe   150px   ничего не вылезает
\`\`\`

Почему так: если не влезает ни одного трека, браузер всё равно создаёт один — шириной в свой минимум 14rem (224px), и он торчит за контейнер. \`min(100%, 14rem)\` на узком контейнере становится шириной контейнера, а на широком — обычными 14rem. Это та самая защита из \`codeSnippet\`.

### \`grid-template-areas\`: раскладка картинкой

\`\`\`css
.app {
  display: grid;
  grid-template-areas:
    'nav header'
    'nav main';
  grid-template-columns: 12rem 1fr;
  grid-template-rows: auto 1fr;
}
.app > nav    { grid-area: nav; }
.app > header { grid-area: header; }
.app > main   { grid-area: main; }
\`\`\`

\`\`\`text
контейнер 1000×600:
nav    x=0,   y=0   192×600   — занимает обе строки слева
header x=192, y=0   808×50
main   x=192, y=50  808×550
\`\`\`

Каждая строка в кавычках — ряд сетки, каждое слово — ячейка, одинаковые слова сливаются в одну область. Точка (\`.\`) означает пустую ячейку. Элемент встаёт в область по имени через \`grid-area\`, и порядок элементов в HTML на раскладку не влияет. Бонус: каждая область создаёт именованные линии \`main-start\` и \`main-end\`, к которым можно привязываться через \`grid-column\`.

Правила валидности (проверено через \`CSS.supports\`): все строки должны содержать одинаковое число ячеек (\`'a b' 'c'\` — невалидно), а каждая область должна быть сплошным прямоугольником (\`'a b' 'b a'\` — невалидно). Невалидное значение отбрасывается целиком, и раскладка молча разваливается.

### \`grid-template\`: всё одной строкой и перестройка под мобильный

\`codeSnippet\` использует сокращённую запись: области, после каждой — высота строки, после \`/\` — колонки.

\`\`\`css
.app { display: grid; grid-template: 'nav header' auto 'nav main' 1fr / 12rem 1fr; }

@media (max-width: 40rem) {
  .app { grid-template: 'header' 'nav' 'main' / 1fr; }
}
\`\`\`

\`\`\`text
desktop: areas "nav header" "nav main", columns 192px 808px
mobile:  areas "header" "nav" "main",   columns 1000px (одна колонка)
\`\`\`

HTML и \`grid-area\` у детей не меняются — перестраивается только карта. Именно для такой перестройки структуры медиазапрос (или контейнерный запрос) всё ещё нужен: RAM-паттерн меняет количество колонок, но не порядок и не форму областей.

### Контейнерные запросы, когда нужна смена структуры

\`\`\`css
.widget { container-type: inline-size; }

@container (max-width: 30rem) {
  .widget-body { grid-template: 'title' 'chart' 'legend' / 1fr; }
}
\`\`\`

\`container-type: inline-size\` делает элемент контейнером запросов, а \`@container\` реагирует на **его** ширину, а не на ширину окна. Это правильный инструмент для виджетов дашборда, которые бывают и на всю ширину, и в узкой колонке. Container queries — Baseline 2023.

### Как выбрать

- Нужно, чтобы неполный ряд растягивался на всю ширину (галерея, карточки, дашборд) — \`auto-fit\` с \`minmax(…, 1fr)\`.
- Нужно, чтобы элементы сохраняли размер, а пустые места оставались (календарь, витрина при фильтрации, слоты) — \`auto-fill\`.
- Элементов заведомо больше, чем помещается в ряд, — разницы нет, берите любой.
- Фиксированные треки без \`fr\` и выравнивание по центру — помните, что \`auto-fit\` центрирует только реальные элементы.
- Раскладка страницы или крупного виджета с перестройкой под ширину — \`grid-template-areas\` плюс медиа- или контейнерный запрос.

### Где это применяется на практике

- **Списки карточек в enterprise-портале**: каталоги, результаты поиска, плитки отчётов — \`@for\` в шаблоне Angular выводит карточки, а CSS сам решает, сколько их в ряду.
- **Дашборды**: виджеты в \`repeat(auto-fit, minmax(20rem, 1fr))\`, внутри каждого — \`grid-template-areas\` и \`@container\` для перестройки заголовка, графика и легенды.
- **Каркас приложения**: шапка, боковое меню, контент, футер через \`grid-template\` с переключением на одну колонку на мобильных.
- **Формы**: поля в \`repeat(auto-fill, minmax(16rem, 1fr))\` — на широком экране три в ряд, на узком по одному, и поля одной ширины даже в неполном ряду.
- **Отладка**: Grid overlay в DevTools показывает номера линий, имена областей и схлопнутые треки нулевой ширины.

## Важные нюансы и подводные камни

- **Считают, что \`auto-fit\` создаёт меньше треков.** Треков столько же (\`492px 492px 0px 0px\`), пустые просто схлопнуты до нуля.
- **\`minmax(15rem, 1fr)\` на экране уже 15rem** даёт переполнение и горизонтальный скролл — один трек создаётся всегда. Лечится \`minmax(min(100%, 15rem), 1fr)\`.
- **Без \`1fr\` в максимуме** \`auto-fit\` выглядит как \`auto-fill\`, пока вы не включите \`justify-content: center\` или \`space-between\` — тогда видно, что пустые треки исчезли.
- **\`gap\` участвует в расчёте количества.** Четыре колонки по 250px в контейнер 1000px с \`gap: 16px\` не влезут — будет три.
- **Подсчёт идёт по максимуму \`minmax()\`, если он фиксированный.** \`minmax(100px, 200px)\` в 1000px даст 4 трека, а не 8.
- **\`repeat(auto-fit, 1fr)\` невалиден** — нужен фиксированный размер; невалидное значение отбрасывается целиком без ошибки в консоли.
- **Автоповтор работает только при известной ширине контейнера.** Если ширина зависит от содержимого (грид внутри \`inline-grid\`, флекс-элемента без заданной ширины или \`float\`), браузер создаёт всего один трек. В проверке в Chrome \`inline-grid\`, грид внутри флекс-строки и грид с \`float\` дали по одному треку \`100px\` при \`minmax(100px, 1fr)\`, а тот же \`inline-grid\` с \`max-width: 500px\` — пять. Задайте контейнеру ширину или \`max-width\`.
- **Области в \`grid-template-areas\` должны быть прямоугольниками**, а строки — одинаковой длины. Иначе всё объявление невалидно и молча игнорируется.
- **Визуальный порядок ≠ порядок в DOM.** Перестановка через области не меняет порядок фокуса и чтения скринридером — для доступности логический порядок в HTML должен оставаться осмысленным.
- **RAM-паттерн не заменяет медиа- и контейнерные запросы**, когда меняется структура (что и в каком порядке), а не только число колонок.

**Плюсы:** адаптивная сетка одной строкой, реагирует на ширину контейнера, а не окна; меньше медиазапросов; области делают раскладку читаемой и легко перестраиваемой.
**Минусы:** подсчёт треков неочевиден (максимум vs минимум \`minmax()\`, \`gap\`, «один трек всегда»); невалидные значения молча игнорируются; визуальная перестановка расходится с порядком DOM.

## Как это спрашивают на собеседовании

**Главный вывод:** \`auto-fill\` и \`auto-fit\` создают одинаковое количество треков; \`auto-fill\` оставляет пустые треки, \`auto-fit\` схлопывает их до нуля, и \`1fr\` растягивает реальные элементы. \`minmax(min(100%, X), 1fr)\` — адаптивная сетка без медиазапросов и без переполнения.

Типичные формулировки: «Чем \`auto-fit\` отличается от \`auto-fill\`?», «Как сделать адаптивную галерею без медиазапросов?», «Почему в узкой колонке появился горизонтальный скролл?», «Как перестроить раскладку страницы под мобильный?».

Что могут спросить следом:

- *Сколько треков создаст \`repeat(auto-fill, minmax(100px, 200px))\` в 1000px?* — Четыре: при фиксированном максимуме подсчёт идёт по нему, а не по минимуму.
- *Почему \`repeat(auto-fit, 1fr)\` не работает?* — Для автоповтора нужен фиксированный размер, иначе нечем считать; объявление невалидно.
- *Когда разница между \`auto-fit\` и \`auto-fill\` пропадает?* — Когда элементов не меньше, чем треков в ряду: пустых треков нет.
- *Как в DevTools увидеть схлопнутые треки?* — Включить Grid overlay: треки нулевой ширины видны как совпадающие линии.
- *Чем \`grid-template-areas\` лучше номеров линий?* — Читаемостью и тем, что перестройка под мобильный — это одно переопределение карты без правок у детей.

### Ответ на 1 минуту

> \`auto-fill\` и \`auto-fit\` в \`repeat()\` считают одинаково: сколько треков минимальной ширины с учётом \`gap\` влезает в контейнер, причём если в \`minmax()\` максимум фиксированный, считают по нему. Разница только в пустых треках: \`auto-fill\` их оставляет, и две карточки стоят слева с пустотой справа, а \`auto-fit\` схлопывает их в ноль, и \`1fr\` растягивает реальные элементы на всю ширину. Для галерей и дашбордов беру \`auto-fit\`, для календаря или витрины, где элементы не должны раздуваться, — \`auto-fill\`. \`minmax(15rem, 1fr)\` значит «не уже 15rem, но тянись до равной доли»; вместе это RAM-паттерн, сетка без медиазапросов. Один трек создаётся всегда, поэтому от переполнения на узком экране защищаюсь через \`min(100%, 15rem)\`. Для раскладки страницы использую \`grid-template-areas\`: под мобильный перестраиваю одну карту областей в медиа- или контейнерном запросе.`,
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
      ru: `## В чём суть

Когда на один элемент претендуют несколько CSS-правил, победителя выбирает **каскад** — алгоритм из нескольких ступеней. Специфичность — только одна из них, причём не первая: выше стоят \`!important\`, источник стилей, инлайн-стиль и cascade layers. А наследование вообще не участвует в споре — оно срабатывает, только когда спорить некому.

Аналогия: воинские звания. Сначала сравнивают звание (важность и источник стилей), потом — служит ли человек в штабе (инлайн-стиль), потом род войск (слой), и только потом выслугу лет (специфичность). Спорить «у меня три класса против одного id» — это спор о выслуге, когда у собеседника выше звание. А наследование — это совет старшего брата: ему следуют, только если начальство вообще ничего не приказало.

**Какую проблему решает.** В большом приложении стили приходят отовсюду: браузерные дефолты, сторонние библиотеки (Kendo UI, Angular Material), дизайн-система, стили компонентов, утилиты, хотфиксы. Без понимания каскада переопределения превращаются в гонку вооружений: \`.page .card .title\`, потом \`#app .card .title\`, потом \`!important\`, потом \`!important\` с id. Знание того, что сильнее чего, позволяет переопределять чисто: обнулить вес базовых стилей через \`:where()\`, разложить источники по слоям \`@layer\`, а \`!important\` оставить для редких утилит.

## Словарик терминов

- **Каскад (cascade)** — алгоритм выбора одного победившего объявления свойства для элемента из всех подходящих.
- **Источник стилей (origin)** — откуда пришло правило: браузерные дефолты (user-agent), пользовательские настройки (user), стили сайта (author).
- **User-agent stylesheet (UA-стили)** — встроенные стили браузера: отступы у абзацев, вид \`<button>\`, маркеры списков.
- **\`!important\`** — пометка объявления, переносящая его в отдельную, более сильную «полосу важности».
- **Специфичность (specificity)** — «вес» селектора в виде тройки (a, b, c): число id / число классов, атрибутов и псевдоклассов / число тегов и псевдоэлементов.
- **Инлайн-стиль** — стиль из атрибута \`style="..."\` прямо на элементе.
- **Cascade layers (\`@layer\`)** — именованные слои стилей; порядок слоёв важнее специфичности.
- **Наследование (inheritance)** — элемент берёт значение свойства у родителя, если у него нет своего объявления. Наследуются в основном текстовые свойства: \`color\`, \`font\`, \`line-height\`.
- **\`:is()\` / \`:where()\`** — псевдоклассы-списки: «подходит любой из селекторов». \`:is()\` весит как самый тяжёлый аргумент, \`:where()\` весит ноль.
- **\`:not()\` / \`:has()\`** — «не подходит» и «содержит внутри»; по весу считаются как \`:is()\` — по самому тяжёлому аргументу.
- **\`all\`** — свойство-сокращение, которое разом задаёт значение почти всем CSS-свойствам элемента.
- **\`initial\` / \`inherit\` / \`unset\`** — сбросить к значению по умолчанию из спецификации / взять у родителя / «по ситуации»: \`inherit\` для наследуемых свойств и \`initial\` для остальных.
- **\`revert\` / \`revert-layer\`** — откатить значение к предыдущему источнику стилей (обычно к UA-стилям) / к предыдущему слою.
- **Animation и transition origin** — значения, которые выставляют работающие CSS-анимации и переходы; у них свои места в каскаде.
- **\`ViewEncapsulation.Emulated\`** — режим Angular по умолчанию: компилятор дописывает к селекторам компонента атрибуты вида \`[_ngcontent-abc]\`.

## Как это работает под капотом

Для каждого свойства каждого элемента браузер делает следующее:

1. **Собирает кандидатов** — все объявления этого свойства из всех правил, чьи селекторы подходят к элементу.
2. **Сравнивает источник и важность.** От слабого к сильному: обычные UA → обычные user → обычные author → CSS-анимации → important author → important user → important UA → CSS-переходы. Среди \`!important\` порядок источников **переворачивается**, поэтому важное пользовательское правило бьёт важное правило сайта.
3. **Сравнивает контекст.** Это про Shadow DOM: для обычных объявлений стили снаружи компонента сильнее стилей внутри, для \`!important\` — наоборот.
4. **Инлайн-стиль.** При равных источнике и важности объявление из атрибута \`style\` бьёт любое объявление из таблиц стилей.
5. **Слои.** Обычные объявления: стили вне слоёв сильнее любых слоёв, а из слоёв сильнее объявленный позже. Для \`!important\` порядок слоёв снова **переворачивается**.
6. **Специфичность** — сравнивается тройка (a, b, c) поразрядно.
7. **Порядок в коде** — при равенстве всего остального побеждает объявление, стоящее позже.
8. **Если кандидатов нет вообще**, наследуемое свойство берёт значение родителя, а ненаследуемое — начальное значение. Наследование — не участник спора, а запасной план.

Упрощённо это сортировка с цепочкой сравнений:

\`\`\`js
const RANK = ['ua', 'user', 'author', 'animation', 'author!', 'user!', 'ua!', 'transition'];

function cascade(candidates, parentValue, initialValue, inherited) {
  if (candidates.length === 0) return inherited ? parentValue : initialValue; // шаг 8
  const winner = candidates.toSorted((x, y) =>
    RANK.indexOf(x.originRank) - RANK.indexOf(y.originRank) ||  // шаг 2
    Number(x.inline) - Number(y.inline) ||                       // шаг 4
    compareLayers(x, y) ||                                       // шаг 5
    compareSpecificity(x.specificity, y.specificity) ||          // шаг 6
    x.order - y.order                                            // шаг 7
  ).at(-1);
  return winner.value;
}

function compareSpecificity([a1, b1, c1], [a2, b2, c2]) {
  return a1 - a2 || b1 - b2 || c1 - c2; // разряды не переносятся
}
compareSpecificity([0, 300, 0], [1, 0, 0]); // -299 → id сильнее
\`\`\`

Все результаты ниже проверены в Chrome через \`getComputedStyle()\`.

### Как считается специфичность

- \`*\` и комбинаторы (пробел, \`>\`, \`+\`, \`~\`) — (0,0,0).
- \`p\`, \`::before\` — (0,0,1).
- \`.btn\`, \`[type="text"]\`, \`:hover\` — (0,1,0).
- \`#main\` — (1,0,0).
- \`ul li.active a:hover\` — (0,2,3): класс и псевдокласс, три тега.
- \`:is(.a, #id) p\` — (1,0,1): берётся самый тяжёлый аргумент.
- \`:where(.a, #id) p\` — (0,0,1): всё внутри \`:where()\` весит ноль.
- \`li:nth-child(2 of .item)\` — (0,2,1): сам псевдокласс плюс самый тяжёлый селектор после \`of\`.

### Пример 1. 300 классов против одного id

\`\`\`css
.c.c.c /* … и так 300 раз */ { color: red; }  /* (0,300,0) */
#one { color: blue; }                          /* (1,0,0) */
\`\`\`

\`\`\`js
getComputedStyle(one).color; // "rgb(0, 0, 255)" — id победил
\`\`\`

Разряды не переполняются и не переносятся: любое количество классов меньше одного id. (В очень старых движках счётчик был 8-битным, и 256 классов «перетекали» в разряд id — сейчас такого нет.)

### \`!important\`: отдельная полоса важности

\`\`\`css
.imp { color: red !important; }
p.i1 { color: red !important; }
#i1  { color: blue !important; }
\`\`\`

\`\`\`html
<p class="imp" style="color: blue">…</p>  <!-- red: important из таблицы бьёт обычный инлайн -->
<p class="i1" id="i1">…</p>              <!-- blue: среди двух important решает специфичность -->
\`\`\`

\`!important\` не «добавляет веса» селектору — он переносит объявление на другую ступень каскада. Внутри этой ступени снова работают слои, специфичность и порядок. Внутри \`@keyframes\` \`!important\` вообще игнорируется.

### Инлайн-стили: сильнее селекторов, но не всего

\`\`\`html
<p class="imp2" style="color: blue !important">…</p>
<!-- .imp2 { color: red !important; } → blue: инлайн-important бьёт important из таблицы -->

<p class="anim" style="color: blue">…</p>
<!-- .anim { animation: paint 10s infinite } с color: rgb(1, 2, 3) → rgb(1, 2, 3) -->

<p class="anim" style="color: blue !important">…</p>
<!-- → blue: важные объявления сильнее анимаций -->
\`\`\`

Почему так: инлайн-стиль — это «прикреплённые к элементу» объявления, они выигрывают у селекторов при **равных** источнике и важности. Но работающая CSS-анимация стоит в каскаде выше всех обычных объявлений сайта, поэтому перекрашивает элемент даже поверх \`style="color: blue"\`. Так что «перебить инлайн можно только \`!important\`» — неправда: анимация тоже может (пока она идёт).

### Перевёрнутый порядок источников

Пользователь может подключить свою таблицу стилей (расширение браузера, настройки доступности). Обычные её правила слабее стилей сайта, а \`!important\` — сильнее любого \`!important\` сайта. Смысл: человек со слабым зрением должен иметь возможность принудительно задать крупный шрифт и контраст, и сайт не может ему помешать. Тот же принцип «важное — у того, кто слабее в обычном режиме» повторяется у слоёв и у Shadow DOM.

### \`:is()\` и \`:where()\`: управление весом селектора

\`\`\`css
p.x { color: red; }
:where(.a, #id) p { color: gray; }  /* (0,0,1) — проиграет */

p.y { color: red; }
:is(.b, #idb) p { color: green; }   /* (1,0,1) — выиграет */
\`\`\`

\`\`\`html
<div class="a"><p class="x">…</p></div>   <!-- red -->
<div class="b"><p class="y">…</p></div>   <!-- green, хотя сработал .b, а #idb на странице нет -->
\`\`\`

Главная ловушка: \`:is()\` берёт вес самого тяжёлого аргумента **независимо от того, какой из них совпал**. Элемент подошёл по \`.b\`, а вес получил как будто от \`#idb\`. Так же считаются \`:not()\` и \`:has()\`: \`div:has(> #hz)\` весит (1,0,1) и в проверке выиграл у \`div.hzc.hzc\` с весом (0,2,1). \`:where()\` обнуляет только своё содержимое: \`.w :where(p)\` весит (0,1,0) за счёт \`.w\`.

### Пример 2. Базовые стили дизайн-системы с нулевым весом

Это \`codeSnippet\` из карточки:

\`\`\`css
:where(button, .btn) { font: inherit; cursor: pointer; }
.btn-primary { background: rebeccapurple; }
\`\`\`

\`\`\`js
getComputedStyle(btnPrimary).backgroundColor; // "rgb(102, 51, 153)"
\`\`\`

База весит (0,0,0), поэтому продуктовая команда переопределяет её одним простым классом — без \`!important\`, без \`#app .btn\` и без знания внутренних селекторов дизайн-системы.

### Наследование против специфичности

\`\`\`css
:root { color: navy; }
* { color: black; }
\`\`\`

\`\`\`js
getComputedStyle(p).color;    // "rgb(0, 0, 0)" — navy не доехал ни до кого
// без правила * :
getComputedStyle(p).color;    // "rgb(0, 0, 128)" — унаследовано от :root
getComputedStyle(span).color; // "rgb(0, 0, 128)"
\`\`\`

Почему так: \`*\` с весом (0,0,0) — это прямое объявление на элементе, а унаследованное значение в каскаде вообще не участвует. Тот же эффект у UA-стилей: ссылка не наследует цвет текста родителя, потому что у \`<a>\` есть свой цвет в браузерных стилях, а \`<button>\` не наследует шрифт — отсюда \`font: inherit\` в базовых стилях выше.

### \`all\` и ключевые слова сброса

\`\`\`css
.wrap  * { all: unset; }
.wrap2 * { all: revert; }
\`\`\`

\`\`\`text
<button> без сброса:   display inline-block | фон rgb(239, 239, 239) | рамка outset | padding 6px
<button> all: unset:   display inline       | фон rgba(0, 0, 0, 0)  | рамка none   | padding 0px
<button> all: revert:  display inline-block | фон rgb(239, 239, 239) | рамка outset | padding 6px
<ul> all: unset:       display inline, padding 0px — список перестал быть блоком
\`\`\`

- \`initial\` — значение по умолчанию **из спецификации**, а не браузера: для \`display\` это \`inline\` даже у блочного \`div\` (проверено в Chrome).
- \`inherit\` — значение родителя, даже для ненаследуемого свойства.
- \`unset\` — \`inherit\` для наследуемых свойств, \`initial\` для остальных. Поэтому \`all: unset\` превращает кнопку в «голый» инлайн-текст.
- \`revert\` — откатывает каскад к предыдущему источнику: из стилей сайта — к пользовательским, а если их нет — к UA-стилям. Кнопка снова выглядит кнопкой.
- \`revert-layer\` — откатывает к значению из предыдущих (более слабых) слоёв; если слоёв нет — работает как \`revert\`.

\`all\` не трогает custom properties и свойства \`direction\` и \`unicode-bidi\` (проверено: после \`all: unset\` у элемента остались \`--x: 5\` и \`direction: rtl\`).

### Cascade layers: порядок слоёв важнее специфичности

\`\`\`css
@layer base, theme;

@layer base { #lay1 { color: red; } }   /* id, но в слое */
.lay1 { color: blue; }                   /* класс вне слоёв */
/* → blue: стили вне слоёв сильнее любых слоёв */

@layer base  { #lay2 { color: red !important; } }
@layer theme { #lay2 { color: green !important; } }
#lay2.lay2   { color: blue !important; }
/* → red: для !important порядок перевёрнут — самый ранний слой сильнее всех */

@layer base  { p.rl { color: green; } }
@layer theme { p.rl { color: red; } p.rl.x2 { color: revert-layer; } }
/* → green: revert-layer откатил к слою base */
\`\`\`

Первая строка \`@layer base, theme;\` фиксирует порядок слоёв: позже — сильнее. Сторонние стили можно загнать в слой при импорте: \`@import url('vendor.css') layer(vendor);\` — и любой ваш стиль вне слоёв их перебьёт, даже с меньшей специфичностью.

### Angular: инкапсуляция добавляет вес

\`\`\`css
/* стили компонента */                 /* что выдаёт компилятор Angular */
.btn { color: red; }                    .btn[_ngcontent-abc] { color: red; }
:host { display: block; }               [_nghost-abc] { display: block; }
:where(.btn) { color: blue; }           :where(.btn[_ngcontent-abc]) { color: blue; }
.list li.active { color: green; }       .list[_ngcontent-abc] li.active[_ngcontent-abc] { … }
\`\`\`

Это реальный вывод \`encapsulateStyle\` из \`@angular/compiler\`. Каждый составной селектор получает атрибут, то есть +1 к разряду классов: \`.btn\` в компоненте весит (0,2,0), а не (0,1,0). Поэтому глобальный \`.btn { … }\` из \`styles.scss\` проигрывает стилям компонента, а \`:where()\` внутри компонента остаётся невесомым — атрибут попадает внутрь скобок.

### Где это применяется на практике

- **Переопределение сторонних тем** (Kendo UI, Angular Material): импорт библиотеки в слой \`vendor\`, свои правила вне слоёв — без \`::ng-deep\` и \`!important\`-войн.
- **Дизайн-система**: базовые стили в \`:where()\`, чтобы продуктовые команды переопределяли их одним классом.
- **Утилиты** вроде \`.hidden\` или \`.sr-only\`: здесь \`!important\` уместен — утилита должна работать всегда.
- **Изоляция вставленного виджета** или HTML из CMS: \`all: revert\` на контейнере возвращает браузерные дефолты, не убивая вид кнопок и списков.
- **Миграция легаси-CSS**: старые стили целиком в нижний слой, новые — выше, и конфликты решаются порядком слоёв, а не наращиванием селекторов.
- **Отладка**: вкладка Styles в DevTools показывает зачёркнутые проигравшие объявления, слой и источник каждого правила; Computed показывает, откуда пришло итоговое значение, включая унаследованные.

## Важные нюансы и подводные камни

- **«Инлайн бьёт всё»** — нет: \`!important\` из таблицы бьёт обычный инлайн-стиль, а инлайн с \`!important\` бьёт \`!important\` из таблицы.
- **«Инлайн перебивается только \`!important\`»** — тоже неточно: работающая CSS-анимация стоит выше всех обычных стилей сайта и перекрашивает элемент поверх \`style="..."\`.
- **\`:is()\` считают лёгким, как \`:where()\`.** \`:is(.a, #id)\` тянет вес \`#id\`, даже если совпал \`.a\`, а элемента с \`#id\` на странице нет. То же у \`:not()\` и \`:has()\`.
- **Ждут, что унаследованный цвет переспорит \`*\`.** Не переспорит: наследование работает только при полном отсутствии объявлений, включая UA-стили.
- **\`all: unset\` путают с \`revert\`.** \`unset\` уносит в \`initial\`/\`inherit\` и убивает UA-стили — кнопка становится текстом, список строкой. \`revert\` возвращает браузерные дефолты.
- **\`revert\` — это не «строго UA-стили»**, а предыдущий источник: если у пользователя есть свои стили, откат придёт к ним. Внутри UA-стилей \`revert\` работает как \`unset\`.
- **\`initial\` ≠ «как в браузере».** \`display: initial\` у элемента \`div\` даёт \`inline\` — значение из спецификации, а не из UA-стилей.
- **Количество классов не догоняет id**: 300 классов — это (0,300,0), всё равно меньше (1,0,0).
- **Порядок слоёв переворачивается для \`!important\`**: важное правило из самого первого слоя сильнее важного правила вне слоёв. Это сделано специально, чтобы базовый слой мог защитить свои инварианты.
- **\`!important\` в \`@keyframes\` игнорируется**, а значения работающих CSS-переходов по спецификации стоят выше даже \`!important\`.
- **Angular-инкапсуляция** добавляет к селекторам компонента атрибут и +1 к разряду классов; глобальные стили из-за этого часто проигрывают, и тянет написать \`::ng-deep\` — лучше решать это слоями или CSS-переменными, которые компонент сам читает.
- **Shadow DOM**: для обычных объявлений стили страницы сильнее стилей \`:host\` внутри компонента, для \`!important\` — наоборот.

**Плюсы:** понимание всех ступеней каскада даёт чистые переопределения через слои и \`:where()\` вместо гонки селекторов; \`all: revert\` позволяет изолировать чужую разметку одной строкой.
**Минусы:** много неочевидных инверсий (\`!important\` переворачивает и источники, и слои); \`:is()\` и инкапсуляция Angular незаметно меняют вес; \`!important\` и инлайн-стили, раз попав в кодовую базу, плодят новые \`!important\`.

## Как это спрашивают на собеседовании

**Главный вывод:** специфичность — лишь шестая ступень каскада: раньше неё решают источник и \`!important\`, инлайн-стиль и слои. \`:where()\` весит ноль, \`:is()\` — как самый тяжёлый аргумент, а наследование проигрывает любому прямому объявлению, даже \`*\`.

Типичные формулировки: «Как считается специфичность?», «Что сильнее: инлайн-стиль или \`!important\`?», «Почему \`* { color: black }\` перебивает цвет родителя?», «Чем \`all: unset\` отличается от \`all: revert\`?», «Как переопределить стили библиотеки без \`!important\`?».

Что могут спросить следом:

- *Сколько классов нужно, чтобы перебить id?* — Никакое количество: разряды сравниваются по очереди и не переносятся.
- *Как переопределить инлайн-стиль из CSS?* — \`!important\` в таблице стилей; на время работы её может перекрыть и CSS-анимация.
- *Зачем \`@layer\`, если есть специфичность?* — Слой важнее специфичности: сторонние стили в нижнем слое проигрывают любому вашему правилу вне слоёв.
- *Что произойдёт с \`!important\` в слоях?* — Порядок переворачивается: важное правило самого раннего слоя сильнее всех.
- *Почему стиль из \`styles.scss\` не применяется к компоненту Angular?* — Инкапсуляция добавила к селекторам компонента атрибут, их вес выше; решают слоями, CSS-переменными или классом-модификатором на хосте.

### Ответ на 1 минуту

> Победителя среди правил выбирает каскад, и специфичность в нём далеко не первая. Сначала сравниваются источник и важность: \`!important\` переносит объявление в отдельную полосу, а среди важных порядок источников переворачивается, поэтому пользовательский \`!important\` бьёт сайт. Дальше инлайн-стиль: он сильнее любого селектора, но слабее \`!important\` из таблицы; обычный инлайн может перекрыть и работающая CSS-анимация. Потом слои: стили вне \`@layer\` сильнее слоёв, для \`!important\` наоборот. И только потом специфичность (id, классы, теги), где сколько угодно классов не догонят один id, а затем порядок в коде. \`:where()\` весит ноль, \`:is()\` — как самый тяжёлый аргумент, даже если совпал лёгкий. Наследование не участвует в споре и проигрывает даже \`*\`. Для изоляции беру \`all: revert\`, а не \`unset\`, который превращает кнопку в текст; базу дизайн-системы пишу в \`:where()\`, чужие темы кладу в нижний слой.`,
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
      ru: `## В чём суть

\`position: sticky\` — гибрид: элемент ведёт себя как обычный, пока при прокрутке не дойдёт до заданного порога (\`top\`, \`bottom\`, \`left\` или \`right\`), а дальше «прилипает» к этой границе **ближайшего скролл-контейнера**. Он всё время остаётся в потоке — место под ним не схлопывается — и никогда не выходит за пределы своего родителя.

Аналогия: магнитик на дверце холодильника. Пока двигаешь его по дверце — он едет свободно; упёрся в край — стоит на месте. Но если увезти сам холодильник, магнит уедет вместе с ним. Родитель — это холодильник, и за его границу sticky не выйдет. А скролл-контейнер — это кухня: магнит прилипает к краю той кухни, в которой стоит холодильник, а не к краю всего дома.

**Какую проблему решает.** Шапка таблицы, заголовки секций, панель фильтров, боковое оглавление — всё это должно оставаться видимым при прокрутке. Раньше это делали на JS: слушали \`scroll\`, на каждом событии читали координаты и переключали \`position: fixed\`. Это дёргалось (обработчик не успевал за прокруткой), вызывало перерасчёт раскладки и требовало «распорку» на месте ушедшего из потока элемента. \`sticky\` делает то же самое силами браузера: без JS, без прыжков соседей, синхронно с прокруткой.

## Словарик терминов

- **\`position\`** — способ позиционирования: \`static\` (обычный поток), \`relative\` (сдвиг от своего места), \`absolute\` (от позиционированного предка), \`fixed\` (от окна), \`sticky\` (гибрид).
- **Позиционированный элемент** — элемент с \`position\`, отличным от \`static\`. Для него работает \`z-index\`, и он служит точкой отсчёта для \`absolute\`-потомков.
- **Порог (inset: \`top\`, \`bottom\`, \`left\`, \`right\`)** — расстояние от края скролл-контейнера, на котором элемент прилипает. Без порога sticky не прилипает.
- **Скролл-контейнер (scroll container)** — элемент, содержимое которого можно прокручивать: предок с \`overflow: auto\`, \`scroll\` или \`hidden\`; если такого нет — окно (вьюпорт).
- **Scrollport** — видимая «рамка» скролл-контейнера, относительно краёв которой считается порог.
- **Содержащий блок (containing block)** — для sticky это обычно бокс родителя; за его пределы элемент не уезжает.
- **\`overflow: clip\`** — обрезает содержимое, как \`hidden\`, но **не** делает элемент скролл-контейнером.
- **Stacking context (контекст наложения)** — изолированная «пачка слоёв»: \`z-index\` потомков сравнивается только внутри неё. Создаётся, например, \`transform\`, \`opacity\` меньше 1, \`filter\`, \`will-change\`, а также самим sticky.
- **\`z-index\`** — порядок наложения позиционированных элементов внутри одного stacking context.
- **Композитор (compositor thread)** — отдельный поток браузера, который собирает готовые слои в кадр и умеет прокручивать их без участия основного потока.
- **\`align-self\`** — выравнивание одного флекс- или грид-элемента по поперечной оси; по умолчанию элементы растягиваются (\`stretch\`).
- **\`IntersectionObserver\`** — API, которое сообщает, насколько элемент виден внутри корня (окна или контейнера).

## Как это работает под капотом

Что делает браузер с \`position: sticky; top: 0\`:

1. **Раскладывает элемент как обычный.** Сначала sticky стоит на своём месте в потоке, как \`relative\` без сдвига. Соседи раскладываются вокруг этого места, и оно никогда не освобождается.
2. **Ищет скролл-контейнер.** Это ближайший предок, у которого \`overflow\` не \`visible\` и не \`clip\`, — даже если он на самом деле не прокручивается. Не нашёл — берёт окно.
3. **Считает линию прилипания.** \`top: 0\` означает «верх элемента не должен уходить выше верхнего края scrollport».
4. **Ограничивает ход родителем.** Элемент не может сдвинуться ниже того места, где его низ совпадёт с низом содержащего блока.
5. **Применяет визуальный сдвиг.** Итоговая позиция — «обычная позиция, но не выше линии прилипания и не ниже края родителя». Сдвиг только визуальный, раскладка соседей не меняется.
6. **Пересчитывает при прокрутке.** В Chromium и Firefox прокрутка обычно идёт на композиторе, и сдвиг sticky-слоя обновляется там же, без перерасчёта раскладки на каждый кадр. Детали зависят от движка, поэтому тяжёлую отрисовку внутри sticky всё равно стоит проверять.

Упрощённо для вертикали:

\`\`\`js
function stickyTop({ normalTop, height, top, scrollTop, cbBottom }) {
  const stickLine = scrollTop + top;                   // линия прилипания в координатах контента
  const notAbove = Math.max(normalTop, stickLine);      // не выше своей линии
  const pos = Math.min(notAbove, cbBottom - height);    // не ниже края родителя
  return pos - scrollTop;                               // где элемент виден в контейнере
}

stickyTop({ normalTop: 0,   height: 40, top: 0, scrollTop: 200, cbBottom: 400 });  // 0   — прилип
stickyTop({ normalTop: 0,   height: 40, top: 0, scrollTop: 380, cbBottom: 400 });  // -20 — родитель выталкивает
stickyTop({ normalTop: 100, height: 40, top: 0, scrollTop: 50,  cbBottom: 2000 }); // 50  — ещё не доехал
\`\`\`

Все числа ниже получены в Chrome через \`getBoundingClientRect()\` после изменения \`scrollTop\`: это позиция элемента относительно верха скролл-контейнера.

### Пример 1. Базовый случай: прилипание и роль порога

\`\`\`html
<div class="scroller" style="height: 200px; overflow: auto">
  <div style="height: 100px"></div>
  <div class="head" style="position: sticky; top: 0">sticky</div>
  <div class="no-top" style="position: sticky">без порога</div>
  <div style="height: 2000px"></div>
</div>
\`\`\`

\`\`\`text
scroller.scrollTop = 300
.head   → 0     — держится у верхнего края
.no-top → -160  — уехал вместе с контентом
\`\`\`

Почему так: без \`top\` браузеру не от чего считать линию прилипания, и элемент едет как обычный. При этом он **остаётся позиционированным**: \`getComputedStyle\` возвращает \`sticky\`, а \`absolute\`-ребёнок внутри отсчитывается от него (проверено: \`offsetParent\` ребёнка — сам sticky-элемент). Поэтому точнее говорить не «ведёт себя как \`static\`», а «как \`relative\` без сдвига».

### Пример 2. Родитель ограничивает ход

\`\`\`html
<div class="scroller" style="height: 200px; overflow: auto">
  <section style="height: 400px">
    <h2 style="position: sticky; top: 0; height: 40px">Раздел</h2>
  </section>
  <div style="height: 2000px"></div>
</div>
\`\`\`

\`\`\`text
scrollTop = 200 → h2 на 0    — прилип
scrollTop = 380 → h2 на -20  — низ секции (400) минус высота (40) = 360, дальше не пускает
\`\`\`

Так работают заголовки разделов в длинных списках: каждый держится, пока видна его секция, а следующий заголовок «выталкивает» предыдущий вместе с концом секции.

### Почему «не липнет» №1: \`overflow\` у предка

\`\`\`text
Предок высотой 600px, внутри sticky с top: 0, прокручиваем окно:
без overflow                → 0     прилип к окну
overflow: hidden            → -100  не липнет
overflow: clip              → 0     прилип
overflow-x: hidden          → -100  не липнет (computed overflow-y стал auto)
overflow-x: clip            → 0     прилип (overflow-y остался visible)
transform: translateZ(0)    → 0     прилип — transform прилипанию не мешает
contain: paint              → 0     прилип
\`\`\`

Почему так: \`overflow: hidden\` делает предка скролл-контейнером — его можно прокрутить программно, — и sticky теперь прилипает к **его** краю. Но сам этот предок не прокручивается, он едет вместе с окном, поэтому элемент относительно него никогда не сдвигается. Самая коварная версия — \`overflow-x: hidden\` «чтобы убрать горизонтальный скролл»: по правилам CSS, если одна ось не \`visible\`, вторая из \`visible\` превращается в \`auto\`, и предок становится скролл-контейнером по обеим осям. Лечение — \`overflow: clip\` или \`overflow-x: clip\`: обрезка та же, а скролл-контейнер не создаётся.

### Почему «не липнет» №2: растянутый флекс- или грид-элемент

\`\`\`html
<div class="scroller" style="height: 200px; overflow: auto">
  <div style="display: flex">
    <aside style="position: sticky; top: 0">меню</aside>
    <main style="height: 1500px; flex: 1">контент</main>
  </div>
</div>
\`\`\`

\`\`\`text
scrollTop = 300:
aside без align-self       → -300, высота aside 1500px — растянулся на всю строку и не липнет
aside с align-self: start  → 0 — прилип
\`\`\`

Почему так: по умолчанию флекс-элементы растягиваются по поперечной оси (\`align-items: stretch\`). Боковое меню стало высотой с контент, а sticky не может выйти за родителя — ходу ноль. \`align-self: start\` возвращает меню его естественную высоту, и появляется место, по которому оно может «ехать».

### Почему «не липнет» №3: родитель ровно по высоте элемента (классика Angular)

\`\`\`html
<div class="scroller" style="height: 200px; overflow: auto">
  <app-header>                                   <!-- хост компонента -->
    <div style="position: sticky; top: 0">шапка</div>
  </app-header>
  <div style="height: 1000px"></div>
</div>
\`\`\`

\`\`\`text
scrollTop = 300:
app-header по умолчанию (display: inline)  → 0     прилип
app-header с :host { display: block }      → -300  не липнет
app-header с :host { display: contents }   → 0     прилип
\`\`\`

Почему так: блочный хост становится содержащим блоком, а он ровно по высоте шапки — ходу ноль. Хост-элемент Angular по умолчанию строчный и содержащим блоком для блочного ребёнка не служит, поэтому без стилей всё работает, а привычное \`:host { display: block }\` ломает прилипание. Решения: вешать \`position: sticky\` на сам хост (\`:host { position: sticky; top: 0; display: block }\`) или делать хост \`display: contents\`. Общее правило: sticky должен быть ребёнком того блока, вдоль которого ему нужно «ехать».

### Stacking context и \`z-index\`: кто кого перекроет

\`\`\`text
Sticky-шапка без z-index, контент прокручен под неё (что видно в точке шапки):
обычные строки                        → шапка
строки с position: relative           → строка
строки с opacity: 0.99                → строка
строки с transform: translateZ(0)     → строка
шапка с z-index: 1, строки relative   → шапка
\`\`\`

Почему так: sticky — позиционированный элемент, и обычный непозиционированный контент он перекрывает и без \`z-index\`. Но позиционированные элементы и элементы со своим stacking context (\`opacity\`, \`transform\`) рисуются на том же уровне, что и шапка, — в порядке DOM, а строки идут после шапки. В гридах в ячейках почти всегда есть что-то позиционированное (иконки сортировки, чекбоксы, бейджи), поэтому \`z-index: 1\` и непрозрачный фон — обязательная пара.

Ещё одна деталь: sticky **всегда создаёт свой stacking context**. Проверка: внутри sticky-блока ребёнок с \`z-index: 100\`, следом сосед с \`position: relative; z-index: 1\`, который их перекрывает. Наверху оказывается сосед — \`z-index: 100\` заперт внутри sticky. С \`position: relative\` вместо sticky наверху оказывается ребёнок с \`z-index: 100\`.

### Ловушка: stacking context у предка запирает \`z-index\`

\`\`\`html
<div class="parent" style="transform: translateZ(0)">
  <div class="head" style="position: sticky; top: 0; z-index: 10">шапка</div>
</div>
<div class="toolbar" style="position: relative; z-index: 1; margin-top: -80px">тулбар</div>
\`\`\`

\`\`\`text
.parent без transform         → сверху шапка (z-index 10 > 1)
.parent с transform           → сверху тулбар
.parent с opacity: 0.99       → сверху тулбар
.parent с will-change: transform → сверху тулбар
\`\`\`

\`z-index: 10\` сравнивается только внутри stacking context, созданного \`.parent\`, а снаружи весь \`.parent\` — это один слой с уровнем 0, и тулбар с \`z-index: 1\` его перекрывает. Само прилипание при этом работает — ломается только наложение. Это и есть ловушка из \`codeSnippet\`.

### \`position: fixed\` против sticky

\`\`\`text
fixed-элемент с top: 0 внутри предка с transform, предок на 1500px от верха окна
→ fixed.getBoundingClientRect().top = 1500 — отсчитывается от предка, а не от окна
\`\`\`

\`fixed\` выпадает из потока (соседи занимают его место) и позиционируется от окна — **кроме** случая, когда у предка есть \`transform\`, \`filter\`, \`perspective\` или \`contain: paint\`: тогда предок становится его содержащим блоком. Sticky остаётся в потоке, привязан к ближайшему скролл-контейнеру и ограничен родителем. Отсюда выбор: «всегда на экране, поверх всего» (тост, плавающая кнопка) — \`fixed\`; «держится, пока виден свой раздел» — sticky.

### Шапка таблицы и закреплённые колонки

Это \`codeSnippet\` из карточки:

\`\`\`css
.table-wrap { max-block-size: 24rem; overflow: auto; } /* скролл-контейнер — обёртка */
thead th {
  position: sticky;
  top: 0;            /* порог */
  z-index: 1;        /* поверх позиционированных ячеек */
  background: white; /* непрозрачный фон */
}
td:first-child, th:first-child { position: sticky; left: 0; background: white; }
thead th:first-child { z-index: 2; } /* угловая ячейка — поверх и шапки, и колонки */
\`\`\`

\`overflow: auto\` на обёртке здесь нужен сознательно: шапка прилипает к верху таблицы, а не окна. В текущем Chrome sticky работает и на самом \`thead\` (проверено: после прокрутки на 300px \`thead\` стоит на 0); в старых версиях Chrome он работал только на ячейках, поэтому вешать на \`th\` — самый совместимый вариант. С \`border-collapse: collapse\` рамки прилипших ячеек в ряде браузеров не едут вместе с ячейкой — обычно переходят на \`border-collapse: separate; border-spacing: 0\`.

### Как узнать, что элемент «прилип»: \`IntersectionObserver\`

Нужно, например, добавить тень шапке только в прилипшем состоянии. CSS-свойства «я прилип» долго не было, поэтому используют трюк с \`top: -1px\`:

\`\`\`ts
// .hdr { position: sticky; top: -1px; height: 40px }
const io = new IntersectionObserver(
  ([entry]) => header.classList.toggle('is-stuck', entry.intersectionRatio < 1),
  { root: scroller, threshold: [1] },
);
io.observe(header);
// в начале:        ratio=1.000 stuck=false
// scrollTop = 300: ratio=0.975 stuck=true   — 1px из 40 спрятан за краем
// scrollTop = 0:   ratio=1.000 stuck=false
\`\`\`

Прилипнув к \`-1px\`, шапка на один пиксель уходит за край контейнера, видимая доля падает ниже 1, и наблюдатель срабатывает — без единого обработчика \`scroll\`. В Angular такой наблюдатель создают в \`afterNextRender\` и отключают через \`DestroyRef.onDestroy(() => io.disconnect())\`.

### Новый способ: контейнерный запрос \`scroll-state\`

\`\`\`css
.hdr { container-type: scroll-state; position: sticky; top: 0; }
@container scroll-state(stuck: top) {
  .hdr > .inner { box-shadow: 0 2px 4px rgb(0 0 0 / 0.2); }
}
\`\`\`

В Chrome 154 это работает (проверено: стиль применился после прокрутки). Это Chromium-фича последних версий; поддержку в Firefox и Safari проверяйте на caniuse и держите \`IntersectionObserver\` как запасной вариант.

### Где это применяется на практике

- **Большие гриды**: прилипающая шапка и первая колонка в таблицах отчётов; \`mat-table\` из Angular Material включает это через \`sticky: true\` в \`matHeaderRowDef\` и \`sticky\` у колонки — внутри тот же \`position: sticky\`.
- **Виртуальный скролл**: в CDK \`cdk-virtual-scroll-viewport\` контент сдвигается через \`transform\`, поэтому sticky-шапку обычно выносят из обёртки контента или компенсируют сдвиг — иначе она ведёт себя неожиданно.
- **Длинные формы и настройки**: заголовки секций и панель «Сохранить / Отмена» с \`bottom: 0\`.
- **Дашборды**: панель фильтров, прилипающая под шапкой приложения (\`top: var(--header-height)\`).
- **Документация и оглавления**: боковое меню с \`align-self: start\` в грид-раскладке.
- **Отладка**: в DevTools пройдитесь по предкам sticky-элемента и найдите первый, у которого в Computed \`overflow\` не \`visible\` и не \`clip\`, — это и есть его скролл-контейнер; панель Layers показывает, вынесен ли элемент в отдельный слой.

## Важные нюансы и подводные камни

- **Забыли порог (\`top: 0\`)** — sticky тихо едет вместе с контентом, ошибок нет. При этом элемент остаётся позиционированным: создаёт stacking context и служит точкой отсчёта для \`absolute\`-детей.
- **\`overflow: hidden\` на любом предке** — самый частый убийца sticky: предок становится скролл-контейнером, который сам не прокручивается.
- **\`overflow-x: hidden\` ломает вертикальное прилипание**, потому что \`overflow-y\` вычисляется в \`auto\`. Замена — \`overflow-x: clip\`.
- **Растянутый флекс- или грид-элемент** не липнет: он высотой с родителя. Нужен \`align-self: start\`.
- **Родитель ровно по высоте элемента** — ходу нет. В Angular это часто \`:host { display: block }\` у компонента-обёртки: sticky надо вешать на сам хост.
- **«Без \`z-index\` строки проедут поверх шапки»** — только позиционированные строки или строки со своим stacking context (\`opacity\`, \`transform\`). Обычный контент sticky перекрывает и так, но в реальных таблицах позиционированные элементы почти всегда есть — ставьте \`z-index\`.
- **Прозрачный фон** — контент просвечивает сквозь прилипшую шапку.
- **\`transform\`, \`opacity\` меньше 1, \`filter\`, \`will-change\` у предка** запирают \`z-index\` шапки внутри его stacking context: шапка оказывается под тулбаром или выпадающим меню соседнего блока. Само прилипание при этом работает.
- **Шапка закрывает цели якорей и фокус.** При переходе по \`#section\` или по Tab элемент прячется под sticky-шапкой; если фокус скрыт полностью, это нарушение WCAG 2.4.11 (Focus Not Obscured). Лечение: \`scroll-padding-top\` на скролл-контейнере (проверено: со \`scroll-padding-top: 48px\` \`scrollIntoView()\` ставит цель на 48px ниже края вместо 0) или \`scroll-margin-top\` на целях.
- **Десятки sticky-элементов с тяжёлой отрисовкой** (тени, \`backdrop-filter\`) — композитор уже не спасает, прокрутка начинает дёргаться. Проверяйте в Performance на слабом устройстве.
- **\`border-collapse: collapse\` в таблицах** — рамки прилипших ячеек могут не ехать вместе с ними; поведение зависит от браузера.

**Плюсы:** ноль JS, остаётся в потоке (соседи не прыгают), ограничен родителем «из коробки», прокрутка обычно обрабатывается на композиторе.
**Минусы:** молча не работает при \`overflow\` у предка, растянутом элементе или отсутствии порога; привязан к ближайшему скролл-контейнеру, а не к окну; легко попасть в ловушку чужого stacking context.

## Как это спрашивают на собеседовании

**Главный вывод:** sticky — это \`relative\` до порога и прилипание к краю **ближайшего скролл-контейнера** после него, в пределах родителя. Не липнет чаще всего из-за \`overflow\` у предка (включая \`overflow-x: hidden\`), отсутствия \`top\` или растянутого флекс-элемента; для наложения нужен \`z-index\`, который запирается stacking context предка.

Типичные формулировки: «Почему не работает \`position: sticky\`?», «Чем sticky отличается от fixed?», «Как сделать прилипающую шапку таблицы?», «Почему шапка уходит под выпадающее меню?».

Что могут спросить следом:

- *Почему \`overflow-x: hidden\` на обёртке ломает вертикальный sticky?* — Вторая ось из \`visible\` вычисляется в \`auto\`, обёртка становится скролл-контейнером; замена — \`overflow-x: clip\`.
- *Мешает ли \`transform\` у предка прилипанию?* — Самому прилипанию нет, он запирает \`z-index\`; а вот \`fixed\`-потомку меняет точку отсчёта на этого предка.
- *Как узнать, что элемент прилип?* — Трюк \`top: -1px\` плюс \`IntersectionObserver\` с \`threshold: [1]\`; в свежем Chromium — \`@container scroll-state(stuck: top)\`.
- *Как не дать шапке закрыть цель якоря или фокус?* — \`scroll-padding-top\` на скролл-контейнере.
- *Почему сайдбар во флексе не липнет?* — Он растянут на высоту контента; \`align-self: start\`.

### Ответ на 1 минуту

> \`position: sticky\` — это гибрид: до порога элемент ведёт себя как \`relative\`, а после прилипает к заданной границе ближайшего скролл-контейнера, оставаясь в потоке и не выходя за пределы родителя — поэтому заголовок секции уезжает вместе с её концом. Порог обязателен: без \`top\` элемент просто едет с контентом. Скролл-контейнер — ближайший предок с \`overflow\` не \`visible\` и не \`clip\`, даже если он сам не прокручивается; отсюда главный баг «не липнет», особенно с \`overflow-x: hidden\`, который делает и вертикаль \`auto\`, — лечу \`overflow: clip\`. Ещё одна причина — растянутый флекс-элемент, тут помогает \`align-self: start\`. Sticky создаёт свой stacking context; позиционированные строки грида перекроют шапку, поэтому ставлю \`z-index\` и непрозрачный фон, а \`transform\` или \`opacity\` у предка запирают этот \`z-index\`. Для якорей и фокуса добавляю \`scroll-padding-top\`.`,
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
      ru: `## В чём суть

Веб-шрифт — это файл, без которого браузер не может нарисовать текст так, как задумал дизайнер. Пока файл едет, браузер либо прячет текст, либо рисует его системным шрифтом, а потом подменяет — и строки меняют длину, абзацы высоту, всё ниже прыгает. Отсюда три задачи оптимизации: **меньше байт**, **раньше начать загрузку**, **не сдвинуть вёрстку при подмене**.

Аналогия: багаж на регистрации. Сабсеттинг — выкладываем из чемодана всё, что не понадобится в поездке (кириллицу, если сайт только на латинице). Вариативный шрифт — вместо восьми комплектов одежды один костюм-трансформер. WOFF2 — вакуумный пакет. \`preload\` — сдать багаж заранее, а не в последний момент. А \`size-adjust\` — когда запасной комплект занимает ровно тот же объём, что основной, поэтому при подмене чемодан не меняет форму.

**Какую проблему решает.** Шрифты — «поздно обнаруживаемый» ресурс: браузер узнаёт, что шрифт нужен, только после загрузки CSS и расчёта стилей, когда видит текст с этим \`font-family\`. Это сотни миллисекунд задержки на первой отрисовке текста. Если шрифт тяжёлый, пользователь либо смотрит на пустые места (FOIT), либо видит прыжок текста (FOUT), который попадает в метрику CLS. Плохой CLS — это и плохой пользовательский опыт (промахи по кнопкам), и минус в Core Web Vitals, которые учитывает поиск Google. Правильная настройка шрифтов убирает и задержку, и сдвиг.

## Словарик терминов

- **\`@font-face\`** — CSS-правило, объявляющее шрифт: имя семейства, откуда качать файл, какие начертания и символы он покрывает.
- **WOFF2** — формат веб-шрифтов со сжатием Brotli; по данным Google в среднем примерно на 30% меньше WOFF.
- **Сабсеттинг (subsetting)** — вырезание из файла неиспользуемых глифов: например, оставить только латиницу.
- **Глиф (glyph)** — изображение одного символа в шрифте.
- **\`unicode-range\`** — дескриптор \`@font-face\`: какие символы покрывает этот файл. Браузер скачает файл, только если такие символы есть на странице.
- **Вариативный шрифт (variable font)** — один файл, в котором начертания задаются непрерывными осями: толщина \`wght\`, ширина \`wdth\`, наклон \`slnt\`.
- **\`font-display\`** — стратегия показа текста, пока шрифт грузится: \`auto\`, \`block\`, \`swap\`, \`fallback\`, \`optional\`.
- **FOIT (Flash of Invisible Text)** — текст невидим, пока шрифт грузится.
- **FOUT (Flash of Unstyled Text)** — текст сначала показан запасным шрифтом, потом подменяется.
- **Запасной шрифт (fallback)** — следующий шрифт в списке \`font-family\`, которым рисуют текст до загрузки основного.
- **Метрики шрифта** — ascent (высота над базовой линией), descent (глубина под ней), line gap (межстрочный зазор), ширина символов.
- **\`size-adjust\`, \`ascent-override\`, \`descent-override\`, \`line-gap-override\`** — дескрипторы \`@font-face\`, которые масштабируют шрифт и переопределяют его вертикальные метрики.
- **\`preload\`** — \`<link rel="preload">\`: подсказка «скачай этот файл немедленно, он скоро понадобится».
- **\`preconnect\`** — \`<link rel="preconnect">\`: заранее открыть соединение (DNS, TCP, TLS) с чужим сервером.
- **CORS-режим (anonymous)** — шрифты всегда запрашиваются как кросс-доменный ресурс без cookie; отсюда требование \`crossorigin\` у \`preload\`.
- **CLS (Cumulative Layout Shift)** — метрика стабильности вёрстки: суммарный «вес» неожиданных сдвигов. Хорошо — меньше 0.1, плохо — больше 0.25, по 75-му перцентилю пользователей.
- **Lab и field (RUM)** — лабораторные замеры (Lighthouse на вашей машине) и полевые данные реальных пользователей.

## Как это работает под капотом

Как браузер загружает и применяет веб-шрифт:

1. **Загружает HTML и CSS.** \`@font-face\` в CSS — только объявление: сам файл шрифта пока никто не качает.
2. **Строит стили и раскладку.** Только теперь браузер видит, что какой-то текст использует семейство \`Inter\` и символы из определённого \`unicode-range\`. Поэтому шрифт — поздно обнаруживаемый ресурс.
3. **Начинает загрузку** нужных файлов — только тех, что реально понадобились: неиспользуемые начертания и диапазоны не качаются.
4. **Включает таймеры \`font-display\`.** Пока идёт период блокировки (block period), текст раскладывается по метрикам запасного шрифта, но рисуется невидимым. Потом начинается период подмены (swap period): текст виден запасным шрифтом, и если шрифт успел прийти — его подменяют.
5. **Подменяет шрифт.** Меняется ширина символов и высота строк, браузер заново раскладывает текст. Если блок изменил размер, всё ниже сдвигается — это и есть layout shift, который попадает в CLS.
6. **Отсюда три рычага:** меньше байт (WOFF2, сабсет, вариативный шрифт) — шрифт приходит быстрее; раньше начать (\`preload\`, \`preconnect\`) — шрифт успевает к первой отрисовке; одинаковые метрики запасного шрифта — подмена не меняет размеры, сдвига нет.

Все числа ниже получены в Chrome на тестовой странице с локальным сервером, который отдаёт шрифт с искусственной задержкой.

### \`font-display\`: пять стратегий

- \`auto\` — на усмотрение браузера; в Chrome и Firefox ведёт себя как \`block\`.
- \`block\` — блокировка «короткая» (спецификация рекомендует 3 секунды), подмена — без ограничения. Это FOIT.
- \`swap\` — блокировка минимальная (до ~100 мс), подмена — без ограничения. Это FOUT.
- \`fallback\` — блокировка ~100 мс, подмена ~3 секунды; не успел — остаётся запасной шрифт.
- \`optional\` — блокировка ~100 мс, подмены нет вовсе: не успел к первой отрисовке — до конца жизни страницы остаётся запасной шрифт, а скачанный файл пригодится на следующей странице из кеша.

Точные длительности — рекомендации спецификации; браузеры вправе их менять.

### Пример 1. Что происходит со сдвигом при разных \`font-display\`

\`\`\`css
@font-face {
  font-family: W;
  src: url(/font/verdana.ttf?delay=600); /* сервер отвечает через 600 мс */
  font-display: swap; /* меняли на optional, fallback, block */
}
p { font-family: W, 'Times New Roman'; font-size: 20px; width: 320px; }
/* под абзацем — блок 1000×500px */
\`\`\`

\`\`\`text
swap:      высота абзаца 69px до прихода шрифта (~600 мс), затем 96px, CLS 0.0139
fallback:  69px → 96px, CLS 0.0139
block:     69px → 96px, CLS 0.0139 — пока текст невидим, место считается по запасному шрифту
optional:  69px всё время, CLS 0 — файл скачался (status "loaded"), но так и не применился
\`\`\`

Почему так: запасной Times New Roman уже и ниже Verdana, поэтому абзац при подмене вырос на 27px и столкнул блок ниже. \`block\` от этого не спасает — он прячет текст, но раскладывает его всё равно по запасному шрифту. Сдвига нет только у \`optional\`, ценой того, что на медленной сети пользователь увидит системный шрифт. Абсолютное значение CLS маленькое из-за геометрии тестовой страницы; на реальной странице с текстом над сгибом оно больше.

### Пример 2. Метрики запасного шрифта: подмена без сдвига

Идея: объявить «фальшивый» шрифт поверх локального системного и подогнать его размеры под веб-шрифт.

\`\`\`js
// как считают генераторы (Capsize, fontaine, next/font) — здесь через canvas в браузере
const ctx = document.createElement('canvas').getContext('2d');
const measure = (font) => {
  ctx.font = \`100px \${font}\`;
  const m = ctx.measureText(sampleText);
  return { w: m.width, asc: m.fontBoundingBoxAscent, desc: m.fontBoundingBoxDescent };
};
const web = measure('Verdana');            // { w: 5600.59, asc: 101, desc: 21 }
const fb  = measure("'Times New Roman'");  // { w: 4406.93, asc: 89,  desc: 22 }

const sizeAdjust = web.w / fb.w;                 // 1.2709 — выровнять ширину строки
const ascent  = web.asc  / (100 * sizeAdjust);   // 0.7947
const descent = web.desc / (100 * sizeAdjust);   // 0.1652
\`\`\`

\`\`\`css
@font-face {
  font-family: 'W Fallback';
  src: local('Times New Roman');
  size-adjust: 127.09%;
  ascent-override: 79.47%;
  descent-override: 16.52%;
  line-gap-override: 0%;
}
p { font-family: W, 'W Fallback'; }
\`\`\`

\`\`\`text
swap с подогнанным fallback: высота 96px с первого кадра и после загрузки, CLS 0
\`\`\`

Почему так: \`size-adjust\` масштабирует символы так, что строка запасного шрифта той же длины, что у веб-шрифта, — переносы строк совпадают. \`ascent-override\` и \`descent-override\` задают ту же высоту строки. Обратите внимание на деление на \`sizeAdjust\`: переопределённые метрики тоже масштабируются на \`size-adjust\`, и без деления строки получились бы выше. Подгонка точна для конкретной пары шрифтов и конкретного текста в среднем, поэтому числа из чужой статьи не подходят.

### \`size-adjust\` и \`*-override\` в \`codeSnippet\`

\`\`\`css
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  ascent-override: 90%;
  descent-override: 22%;
  size-adjust: 107%;
}
body { font-family: 'Inter', 'Inter Fallback', sans-serif; }
\`\`\`

Без второго \`@font-face\` Arial и Inter дают разную ширину и высоту строк, и в момент подмены текст ниже уезжает. С ним блок текста занимает почти ту же площадь до и после загрузки. Числа в примере правдоподобны для пары Inter → Arial, но пересчитайте их под свою версию шрифта. \`size-adjust\` поддерживают все основные браузеры (Safari с 17-й версии), а \`ascent-override\`, \`descent-override\` и \`line-gap-override\` Safari долго не поддерживал — проверьте caniuse для своей матрицы.

### \`preload\` и обязательный \`crossorigin\`

\`\`\`html
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
\`\`\`

Проверка без \`crossorigin\` (сервер видит два запроса одного файла):

\`\`\`text
/font/verdana.ttf  sec-fetch-mode=no-cors   ← preload
/font/verdana.ttf  sec-fetch-mode=cors      ← настоящий запрос шрифта из @font-face
Chrome: A preload for '…/verdana.ttf' is found, but is not used because the request
credentials mode does not match. Consider taking a look at crossorigin attribute.
\`\`\`

С \`crossorigin\` — один запрос в режиме \`cors\`. Почему так: шрифты по спецификации всегда загружаются в CORS-режиме без cookie, даже со своего домена. \`preload\` без атрибута делает запрос в другом режиме, браузер не может переиспользовать ответ и качает файл второй раз. \`type="font/woff2"\` позволяет браузеру пропустить preload, если формат не поддерживается.

Прелоадят только 1–2 файла, реально нужных для первого экрана (основной текст, заголовки). Каждый preload конкурирует за канал с картинкой LCP и критическим CSS.

### \`preconnect\` для чужого хоста

\`\`\`html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
\`\`\`

Если шрифты лежат на другом домене (Google Fonts, CDN), браузер узнает о нём поздно и потратит на DNS, TCP и TLS несколько сетевых кругов (RTT). \`preconnect\` открывает соединение заранее. \`crossorigin\` здесь тоже нужен: анонимные запросы шрифтов идут по отдельному соединению, и \`preconnect\` без атрибута прогреет «не то».

### \`unicode-range\`: сабсеты, которые качаются по требованию

\`\`\`css
@font-face { font-family: S; src: url(/fonts/s-latin.woff2);    unicode-range: U+0000-00FF; }
@font-face { font-family: S; src: url(/fonts/s-cyrillic.woff2); unicode-range: U+0400-045F; }
@font-face { font-family: Unused; src: url(/fonts/unused.woff2); }
body { font-family: S; }
\`\`\`

\`\`\`text
Страница с текстом "Hello world":
  S U+0-FF     loaded
  S U+400-45F  unloaded   ← кириллический файл не запрошен
  Unused       unloaded   ← неиспользуемое семейство не качается вообще
После добавления текста "Привет":
  S U+400-45F  loaded     ← докачался по требованию
\`\`\`

Без \`unicode-range\` всё хуже, чем «скачается лишнее». В проверке два \`@font-face\` одного семейства без диапазонов: браузер считает, что каждый покрывает все символы, и берёт **последний** объявленный — скачался только «кириллический» файл, и им рисовалась латиница. Если в нём нет латинских глифов, текст молча уходит в системный шрифт.

### Вариативный шрифт: один файл на весь диапазон

\`\`\`css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2-variations');
  font-weight: 100 900;   /* диапазон: один файл на все толщины */
}
h1 { font-weight: 650; }  /* промежуточные значения тоже работают */
\`\`\`

В проверке с \`font-weight: 100 900\` три текста с толщиной 300, 650 и 900 дали **один** запрос файла. Запись \`format('woff2-variations')\` из \`codeSnippet\` — старая, но Chrome 154 её понимает; современный вариант — \`format('woff2') tech(variations)\` или просто \`format('woff2')\`. Вариативный шрифт выгоден, когда начертаний больше двух-трёх; если нужны только regular и bold, два статических файла могут весить меньше одного вариативного.

### \`font-variation-settings\` не наследуется по осям

\`\`\`css
.card       { font-variation-settings: 'wght' 700; }
.card .note { font-variation-settings: 'slnt' -10; }
\`\`\`

\`\`\`js
getComputedStyle(note).fontVariationSettings; // "\\"slnt\\" -10" — wght потерялся
\`\`\`

Это одно свойство-строка: новое значение полностью заменяет старое, а не дополняет его. Поэтому для стандартных осей используйте высокоуровневые свойства — \`font-weight\`, \`font-stretch\`, \`font-style: oblique 10deg\`, — а \`font-variation-settings\` оставьте для нестандартных осей.

### Font Loading API: \`document.fonts\`

\`\`\`js
await document.fonts.ready;                       // все шрифты, нужные сейчас, догрузились
document.fonts.forEach(f => console.log(f.family, f.unicodeRange, f.status));
// S U+0-FF loaded
// S U+400-45F unloaded

await document.fonts.load('650 1em Inter');       // загрузить заранее, например перед открытием модалки
document.fonts.check('650 1em Inter');            // true, если можно рисовать без ожидания
\`\`\`

Пригождается в тестах (дождаться шрифтов перед скриншотом), в canvas-графиках (рисовать текст после загрузки) и для ручного управления подменой.

### Как измерять: lab и field

\`\`\`js
let cls = 0;
new PerformanceObserver((list) => {
  for (const e of list.getEntries()) {
    if (!e.hadRecentInput) cls += e.value; // сдвиги сразу после ввода не считаются
  }
}).observe({ type: 'layout-shift', buffered: true });
\`\`\`

Упрощение: настоящий CLS группирует сдвиги в «окна» (сессии до 5 секунд) и берёт худшее окно — библиотека \`web-vitals\` (\`onCLS\`) делает это правильно и умеет атрибуцию (какой элемент сдвинулся). В лаборатории — Lighthouse (CLS и аудит про \`font-display\`, исторически «Ensure text remains visible during webfont load») и вкладка Network с фильтром Font. На быстрой машине шрифт успевает к первой отрисовке, и сдвиг не виден, поэтому включайте троттлинг сети и обязательно смотрите полевые данные.

### Angular: что делает сборка

В \`angular.json\` у сборщика \`@angular/build:application\` есть \`optimization.fonts.inline\` (по умолчанию включено в production): CSS Google Fonts и Adobe Fonts встраивается прямо в \`index.html\`, и браузер не ждёт ещё один блокирующий CSS-запрос. Для самостоятельного хостинга шрифты кладут в \`public/fonts\`, \`@font-face\` — в глобальный \`styles.scss\` (не в стили компонента), а \`preload\` — в \`index.html\`.

### Где это применяется на практике

- **Корпоративный портал с брендовым шрифтом**: самостоятельный хостинг WOFF2, сабсеты латиница и кириллица через \`unicode-range\`, preload основного начертания, метрически подогнанный fallback.
- **Двуязычный интерфейс**: русская и английская версии качают только свои диапазоны глифов.
- **Дашборды и гриды**: цифры в ячейках должны быть одинаковой ширины (\`font-variant-numeric: tabular-nums\`), а подмена шрифта не должна перестраивать колонки — \`optional\` или подогнанный fallback.
- **Иконочные шрифты** — кандидат на замену SVG-иконками: тяжёлый файл, FOIT и проблемы доступности; если остаются, их сабсетят до реально используемых иконок.
- **Лендинги и маркетинг**: \`optional\` для декоративных шрифтов — лучше системный шрифт, чем прыжок.
- **Отказ от Google Fonts CDN**: браузеры разделяют HTTP-кеш по сайтам (Safari давно, Chrome с 86-й версии, Firefox с 85-й), поэтому «общего кеша» с другими сайтами больше нет, а свой хостинг экономит соединение с чужим доменом.

## Важные нюансы и подводные камни

- **\`preload\` без \`crossorigin\`** — файл качается дважды, Chrome пишет предупреждение о несовпадении credentials mode, и preload только вредит.
- **Preload всех начертаний** — забиваем канал и отодвигаем картинку LCP. Прелоадим один-два файла для первого экрана.
- **\`font-display: block\` и \`auto\`** — невидимый текст до ~3 секунд (FOIT) и поздний FCP. И сдвиг всё равно будет: пока текст невидим, место под него считается по запасному шрифту.
- **\`swap\` — не «лучший для CLS»**: текст виден сразу, но при подмене будет сдвиг, если метрики не подогнаны.
- **\`optional\` — лучший для CLS**, но на медленной сети пользователь может так и не увидеть фирменный шрифт на первой странице.
- **Забыли \`unicode-range\`** — браузер считает, что каждый файл покрывает все символы, берёт последний объявленный и качает его на любой странице; при раздельных сабсетах латиница может отрисоваться не тем файлом или системным шрифтом.
- **\`@font-face\` внутри стилей Angular-компонента** — объявление попадает в документ только вместе с компонентом; шрифты объявляют глобально.
- **Вариативный шрифт «за компанию»** — при двух начертаниях может весить больше двух статических файлов.
- **\`font-variation-settings\` перетирает все оси** — используйте \`font-weight\`, \`font-stretch\`, \`font-style\`.
- **Метрики fallback скопированы из чужой статьи** — они зависят от конкретной пары шрифтов и версии файла; считайте под свою пару (Capsize, fontaine, генератор next/font) и помните, что \`*-override\` масштабируются на \`size-adjust\`.
- **\`ascent-override\` и соседи поддерживаются не везде** (Safari долго без них) — подгонка там будет частичной.
- **Лаборатория против поля**: Lighthouse на быстрой машине может вообще не поймать сдвиг, полевой CLS покажет реальную картину на медленной сети.

**Плюсы:** быстрый первый текст и стабильная вёрстка; меньше трафика за счёт WOFF2, сабсетов и вариативных шрифтов; всё делается декларативно в CSS и HTML.
**Минусы:** много мелких настроек, которые легко сломать (\`crossorigin\`, \`unicode-range\`, порядок \`@font-face\`); подгонка метрик — ручная работа под конкретную пару шрифтов; \`optional\` жертвует фирменным шрифтом на медленной сети.

## Как это спрашивают на собеседовании

**Главный вывод:** стратегия по шрифтам — меньше байт (WOFF2, сабсеты через \`unicode-range\`, вариативный шрифт), раньше загрузка (\`preload\` с \`crossorigin\`, \`preconnect\`) и ноль сдвигов (\`optional\` или запасной шрифт с \`size-adjust\` и \`*-override\`). Проверка — CLS в поле, цель меньше 0.1.

Типичные формулировки: «Почему при загрузке страницы прыгает текст?», «Что такое FOIT и FOUT?», «Какое значение \`font-display\` выбрать?», «Как ускорить загрузку шрифтов?».

Что могут спросить следом:

- *Зачем \`crossorigin\` у preload шрифта со своего домена?* — Шрифты всегда грузятся в CORS-режиме; без атрибута режимы не совпадут, и файл скачается дважды.
- *Спасает ли \`font-display: block\` от CLS?* — Нет: текст невидим, но раскладывается по запасному шрифту, и после подмены всё равно сдвигается.
- *Как работает \`unicode-range\`?* — Файл скачивается, только если на странице есть символы из его диапазона; без диапазона файл считается покрывающим всё.
- *Как подобрать \`size-adjust\`?* — Отношение средней ширины символов веб-шрифта к запасному; \`ascent-override\` и \`descent-override\` — метрики веб-шрифта, делённые на этот коэффициент.
- *Почему Lighthouse не видит проблему, а пользователи видят?* — В лаборатории быстрая сеть, шрифт успевает к первой отрисовке; смотрите полевой CLS и троттлинг.

### Ответ на 1 минуту

> Шрифт — поздно обнаруживаемый ресурс: браузер узнаёт о нём только после расчёта стилей, и пока файл едет, текст либо невидим, либо нарисован запасным шрифтом, а при подмене прыгает и портит CLS. Поэтому моя стратегия — меньше байт, раньше загрузка, ноль сдвигов. Байты: только WOFF2, сабсеты по \`unicode-range\`, чтобы кириллица качалась лишь при наличии русского текста, и вариативный шрифт, если начертаний больше двух. Раньше: \`preload\` одного-двух критичных файлов обязательно с \`crossorigin\` — шрифты грузятся в CORS-режиме, без него файл скачается дважды, — плюс \`preconnect\` к чужому хосту. Сдвиги: \`swap\` и даже \`block\` всё равно сдвигают вёрстку, \`optional\` не сдвигает, но может не показать фирменный шрифт. Лучший вариант — запасной \`@font-face\` поверх системного шрифта с \`size-adjust\`, \`ascent-override\` и \`descent-override\`. Проверяю полевым CLS, цель меньше 0.1.`,
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
