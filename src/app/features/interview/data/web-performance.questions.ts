import { InterviewQuestion } from '../interfaces/question.interface';

export const WEB_PERFORMANCE_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'web-001',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['critical-rendering-path', 'dom', 'cssom'],
    question: {
      ru: 'Опишите Critical Rendering Path. Какие шаги проходит браузер от получения HTML до первого пикселя на экране?',
      en: 'Describe the Critical Rendering Path. What steps does the browser take from receiving HTML to the first pixel on screen?'
    },
    answer: {
      ru: `## Коротко

Critical Rendering Path — это **конвейер из шести станций**, по которому браузер превращает скачанные байты в пиксели: HTML → DOM, CSS → CSSOM, склейка в render tree, layout, paint, composite.

Аналогия: заводской конвейер. Пока одна станция стоит, стоит вся линия, даже если остальные свободны. Синхронный \`<script>\` и незагруженный CSS — это и есть застрявшие станции.

## Как это работает по шагам

1. **Парсинг HTML → DOM.** Токенизатор читает разметку по кускам и строит дерево узлов. Разбор инкрементальный: что успели прочитать — то уже в DOM. Но встретил обычный \`<script>\` без \`async\`/\`defer\` — парсер замирает, качает файл и выполняет его.
2. **Парсинг CSS → CSSOM.** CSS — **render-blocking**: браузер не покажет ничего, пока не скачает и не разберёт весь критический CSS. Здесь же вычисляется специфичность, дерево строится сверху вниз.
3. **Render tree.** DOM и CSSOM склеиваются в дерево того, что реально видно. Узлы с \`display: none\` выкидываются, а \`visibility: hidden\` остаётся в дереве (место занимает).
4. **Layout (reflow).** Считается геометрия: где и какого размера каждый узел в пикселях. Зависит от размера viewport.
5. **Paint.** Заливка пикселей по слоям: текст, цвета, тени, границы.
6. **Composite.** Слои собираются в итоговую картинку, часто силами GPU.

## Пример

\`\`\`html
<head>
  <!-- критический CSS инлайном: не ждём сети -->
  <style>/* стили первого экрана */</style>

  <!-- остальной CSS не блокирует первую отрисовку -->
  <link rel="stylesheet" href="rest.css" media="print" onload="this.media='all'" />

  <!-- JS качается параллельно, выполняется после парсинга DOM -->
  <script defer src="app.js"></script>
</head>
\`\`\`

Почему так: \`media="print"\` делает файл некритическим — браузер качает его в фоне и включает уже по \`onload\`. А \`defer\` снимает блокировку парсера скриптом.

## Что сказать на собеседовании

> Критический путь рендеринга — это шесть шагов от байтов до пикселей: парсинг HTML в DOM, парсинг CSS в CSSOM, объединение их в render tree, layout, paint и composite. CSS по умолчанию render-blocking: render tree не строится, пока не разобран весь критический CSS. Синхронный \`<script>\` блокирует парсер, а если перед ним есть незагруженный CSS, скрипт ещё и ждёт CSSOM, потому что может читать стили. Отсюда рецепты: инлайнить критический CSS первого экрана, остальное грузить неблокирующе, скрипты вешать на \`defer\`/\`async\`, сокращать число и вес render-blocking ресурсов. Цель — как можно более ранний First Contentful Paint. Измеряю в Lighthouse и на вкладке Performance в DevTools, а в проде — по field-данным.

## Ловушки

- **\`display: none\` vs \`visibility: hidden\`** — первый выкидывается из render tree, второй остаётся и продолжает занимать место в layout.
- **\`async\` ≠ \`defer\`**: \`async\` выполняется сразу как скачался и может прервать парсинг в любой момент, порядок не гарантирован; \`defer\` ждёт конца парсинга и сохраняет порядок тегов.
- **CSS тормозит не только рендер, но и JS**: скрипт, стоящий после \`<link rel="stylesheet">\`, ждёт CSSOM.
- **Preload scanner** сканирует HTML вперёд и качает ресурсы, даже когда парсер стоит на скрипте — но ресурсы, добавленные из JS, он не увидит.
- Спросят следом: чем FCP отличается от LCP и что именно класть в критический CSS (только первый экран — иначе раздуется сам HTML).`,
      en: `## In short

The Critical Rendering Path is a **six-station assembly line** that turns downloaded bytes into pixels: HTML → DOM, CSS → CSSOM, merge into the render tree, layout, paint, composite.

Analogy: a factory conveyor belt. While one station is stalled the whole line is stalled, even if every other station is free. A synchronous \`<script>\` and unloaded CSS are exactly those stalled stations.

## How it works, step by step

1. **Parse HTML → DOM.** The tokenizer reads the markup in chunks and builds a tree of nodes. Parsing is incremental — whatever has been read is already in the DOM. But hit a plain \`<script>\` with no \`async\`/\`defer\` and the parser freezes, downloads the file and runs it.
2. **Parse CSS → CSSOM.** CSS is **render-blocking**: the browser shows nothing until all critical CSS is downloaded and parsed. Specificity is resolved here; the tree is built top-down.
3. **Render tree.** DOM and CSSOM are merged into a tree of what is actually visible. Nodes with \`display: none\` are dropped, while \`visibility: hidden\` stays in the tree and still takes up space.
4. **Layout (reflow).** Geometry is computed: where each node sits and how big it is, in pixels. Depends on viewport size.
5. **Paint.** Pixels are filled into layers: text, colors, shadows, borders.
6. **Composite.** Layers are assembled into the final image, usually with GPU help.

## Example

\`\`\`html
<head>
  <!-- critical CSS inlined: no network round-trip -->
  <style>/* above-the-fold styles */</style>

  <!-- the rest of the CSS does not block the first paint -->
  <link rel="stylesheet" href="rest.css" media="print" onload="this.media='all'" />

  <!-- JS downloads in parallel, executes after DOM parsing -->
  <script defer src="app.js"></script>
</head>
\`\`\`

Why this works: \`media="print"\` marks the file as non-critical, so the browser fetches it in the background and switches it on in \`onload\`. And \`defer\` stops the script from blocking the parser.

## What to say in the interview

> The critical rendering path is six steps from bytes to pixels: parse HTML into the DOM, parse CSS into the CSSOM, merge them into the render tree, then layout, paint and composite. CSS is render-blocking by default — the render tree is not built until all critical CSS is parsed. A synchronous \`<script>\` blocks the parser, and if there is unloaded CSS before it, the script also waits for the CSSOM because it may read computed styles. Hence the fixes: inline the above-the-fold CSS, load the rest non-blocking, mark scripts \`defer\`/\`async\`, and cut the number and weight of render-blocking resources. The goal is the earliest possible First Contentful Paint. I measure it in Lighthouse and the DevTools Performance panel, and in production from field data.

## Gotchas

- **\`display: none\` vs \`visibility: hidden\`** — the first is dropped from the render tree, the second stays and still occupies space in layout.
- **\`async\` ≠ \`defer\`**: \`async\` runs as soon as it downloads and can interrupt parsing at any point, with no order guarantee; \`defer\` waits for parsing to finish and preserves tag order.
- **CSS delays JS too, not just rendering**: a script placed after a \`<link rel="stylesheet">\` waits for the CSSOM.
- **The preload scanner** looks ahead in the HTML and fetches resources even while the parser is stuck on a script — but it cannot see resources injected from JS.
- Expect the follow-up: how FCP differs from LCP, and what exactly belongs in critical CSS (above-the-fold only — otherwise the HTML itself bloats).`
    },
    codeSnippet: `<!-- Minimize the critical rendering path -->
<head>
  <!-- Critical, render-blocking CSS kept small and inlined -->
  <style>/* above-the-fold styles */</style>

  <!-- Non-critical CSS loaded without blocking the first paint -->
  <link rel="stylesheet" href="rest.css" media="print" onload="this.media='all'" />

  <!-- App JS parsed in parallel, executed after the DOM is ready -->
  <script defer src="app.js"></script>
</head>`
  },
  {
    id: 'web-002',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['reflow', 'repaint', 'rendering'],
    question: {
      ru: 'В чём разница между reflow (layout) и repaint? Какие операции вызывают каждый из них и почему это критично для производительности?',
      en: 'What is the difference between reflow (layout) and repaint? Which operations trigger each, and why does it matter for performance?'
    },
    answer: {
      ru: `## Коротко

**Reflow (layout)** — браузер заново считает, **где и какого размера** элементы. **Repaint** — заново закрашивает пиксели, но геометрию не трогает. Reflow всегда тянет за собой repaint, наоборот — нет.

Аналогия: ремонт в квартире. Repaint — перекрасить стену: мебель стоит на месте, работа локальная. Reflow — передвинуть стену: пересчитывать приходится расположение всей мебели, а иногда и соседних комнат.

## Как это работает по шагам

1. Вы меняете стиль или DOM — браузер помечает layout «грязным», но пересчёт откладывает до конца кадра.
2. Если поменялось что-то геометрическое (\`width\`, \`height\`, \`margin\`, \`padding\`, \`top\`, \`left\`, \`font-size\`, добавили/убрали узел, поменяли текст) — будет **reflow**. Он дорогой, потому что изменение одного элемента каскадом задевает потомков, предков и соседей.
3. Если поменялось только «цветное» (\`color\`, \`background-color\`, \`box-shadow\`, \`outline\`, \`visibility\`) — будет только **repaint**. Дешевле, но CPU всё равно грузит.
4. Если поменялись \`transform\` или \`opacity\` — не будет ни того, ни другого: это **compositor-only**, работу делает GPU.
5. Опасность: чтение «layout-провоцирующих» свойств — \`offsetTop\`, \`offsetWidth\`, \`scrollHeight\`, \`getBoundingClientRect()\`, \`getComputedStyle()\` — заставляет браузер посчитать layout **прямо сейчас**, если есть незакоммиченные изменения. Это forced synchronous layout.

## Пример

\`\`\`ts
el.style.width = '200px';        // reflow: layout -> paint -> composite
el.style.background = 'crimson'; // repaint: paint -> composite
el.style.transform = 'scale(2)'; // только composite, на GPU

const w = el.offsetWidth;        // чтение флашит отложенный layout -> forced reflow
\`\`\`

Почему так: три строки выглядят одинаково «дёшево», но проходят разное количество станций конвейера. Четвёртая строка вообще не меняет ничего — и всё равно стоит дорого.

## Что сказать на собеседовании

> Reflow, он же layout, — это пересчёт геометрии: размеров, позиций, переносов текста. Repaint — перерисовка пикселей без изменения геометрии. Reflow дороже, потому что изменение одного элемента каскадно затрагивает потомков, предков и соседей, и он всегда влечёт за собой repaint. Reflow вызывают \`width\`, \`height\`, отступы, \`font-size\`, вставка и удаление узлов, изменение текста. Только repaint — \`color\`, \`background-color\`, \`box-shadow\`, \`visibility\`. А \`transform\` и \`opacity\` идут мимо обоих этапов, их обрабатывает композитор на GPU, поэтому анимировать надо именно их. Отдельно важно, что чтение \`offsetWidth\` или \`getBoundingClientRect()\` форсирует синхронный layout, поэтому чтения и записи DOM надо группировать. Смотрю всё это в Performance-панели DevTools по блокам Layout и Paint.

## Ловушки

- **Reflow всегда влечёт repaint и composite**, обратное неверно — частая путаница на собеседовании.
- **\`visibility: hidden\` — только repaint, \`display: none\` — reflow**: первый оставляет элемент в layout, второй выкидывает.
- **Чтение геометрии — тоже «дорогая операция»**, хотя выглядит как безобидное чтение переменной.
- **\`transform\` бесплатен только для уже поднятого в слой элемента**; создание слоя стоит памяти, и слой всё равно надо было один раз отрисовать.
- **Анимация \`width\`/\`top\`/\`left\`** — классическая причина проседания fps: каждый кадр это полный reflow.
- Спросят следом: что такое layout thrashing и как его чинить (батчинг чтений/записей, \`requestAnimationFrame\`).`,
      en: `## In short

**Reflow (layout)** is the browser recomputing **where things are and how big they are**. **Repaint** is recolouring pixels without touching geometry. A reflow always drags a repaint along with it; the reverse is not true.

Analogy: renovating a flat. Repaint is repainting a wall — the furniture stays put, the work is local. Reflow is moving a wall — now you have to re-plan every piece of furniture, sometimes in the neighbouring rooms too.

## How it works, step by step

1. You change a style or the DOM — the browser marks layout "dirty" but postpones the recompute until the end of the frame.
2. If something geometric changed (\`width\`, \`height\`, \`margin\`, \`padding\`, \`top\`, \`left\`, \`font-size\`, adding/removing a node, changing text) you get a **reflow**. It is expensive because one element cascades into its descendants, ancestors and siblings.
3. If only "colour-ish" things changed (\`color\`, \`background-color\`, \`box-shadow\`, \`outline\`, \`visibility\`) you get a **repaint** only. Cheaper, but still CPU work.
4. If \`transform\` or \`opacity\` changed, you get neither: those are **compositor-only** and the GPU does the job.
5. The trap: reading "layout-provoking" properties — \`offsetTop\`, \`offsetWidth\`, \`scrollHeight\`, \`getBoundingClientRect()\`, \`getComputedStyle()\` — forces the browser to compute layout **right now** if there are uncommitted changes. That is a forced synchronous layout.

## Example

\`\`\`ts
el.style.width = '200px';        // reflow: layout -> paint -> composite
el.style.background = 'crimson'; // repaint: paint -> composite
el.style.transform = 'scale(2)'; // composite only, on the GPU

const w = el.offsetWidth;        // the read flushes pending layout -> forced reflow
\`\`\`

Why this matters: the three assignments look equally cheap, yet they travel through a different number of pipeline stations. The fourth line changes nothing at all — and still costs a lot.

## What to say in the interview

> Reflow, also called layout, is recomputing geometry: sizes, positions, text wrapping. Repaint is redrawing pixels without changing geometry. Reflow is the expensive one because changing a single element cascades to its descendants, ancestors and siblings, and it always implies a repaint afterwards. Reflow is triggered by \`width\`, \`height\`, paddings and margins, \`font-size\`, inserting or removing nodes, changing text. Repaint only by \`color\`, \`background-color\`, \`box-shadow\`, \`visibility\`. And \`transform\` and \`opacity\` skip both stages — the compositor handles them on the GPU, which is why animations should use exactly those. One more key point: reading \`offsetWidth\` or \`getBoundingClientRect()\` forces a synchronous layout, so DOM reads and writes must be batched. I inspect all of this in the DevTools Performance panel by the Layout and Paint blocks.

## Gotchas

- **Reflow always implies repaint and composite**, never the other way round — a classic mix-up in interviews.
- **\`visibility: hidden\` is repaint-only, \`display: none\` is a reflow**: the first keeps the element in layout, the second removes it.
- **Reading geometry is an expensive operation too**, even though it looks like an innocent variable read.
- **\`transform\` is free only for an element already promoted to a layer**; creating the layer costs memory, and the layer still had to be painted once.
- **Animating \`width\`/\`top\`/\`left\`** is the classic cause of dropped frames: every frame is a full reflow.
- Expect the follow-up: what layout thrashing is and how to fix it (batch reads and writes, \`requestAnimationFrame\`).`
    },
    codeSnippet: `// reflow (geometry) vs repaint (pixels) vs composite (GPU)
el.style.width = '200px';        // reflow: layout -> paint -> composite
el.style.background = 'crimson'; // repaint: paint -> composite
el.style.transform = 'scale(2)'; // composite only (cheap, on GPU)

// Reading geometry forces a synchronous reflow:
const w = el.offsetWidth;        // flushes pending layout`
  },
  {
    id: 'web-003',
    category: 'html-css-performance',
    level: 'Expert',
    tags: ['layout-thrashing', 'batching', 'requestanimationframe'],
    question: {
      ru: 'Что такое layout thrashing (forced synchronous layout)? Как его обнаружить и устранить?',
      en: 'What is layout thrashing (forced synchronous layout)? How do you detect and fix it?'
    },
    answer: {
      ru: `## Коротко

Layout thrashing — это когда в цикле **чередуются запись в DOM и чтение геометрии**. Каждое чтение после записи заставляет браузер посчитать layout немедленно, и вместо одного reflow за кадр вы получаете сотни.

Аналогия: вы кладёте вещь в чемодан и тут же взвешиваете чемодан, потом кладёте следующую — и снова взвешиваете. Весы правильные, но вы сходили к ним 100 раз вместо одного.

## Как это работает по шагам

1. Браузер держит внутренний флаг «layout грязный». Любая запись в стили или DOM ставит этот флаг.
2. Пересчёт браузер откладывает: он хочет собрать все изменения и сделать **один** reflow в конце кадра.
3. Но вы читаете \`offsetWidth\` / \`getBoundingClientRect()\` — браузер обязан вернуть **актуальное** число, а значит, посчитать layout прямо здесь и сейчас. Это **forced synchronous layout**.
4. Следующая запись снова пачкает флаг, следующее чтение снова форсирует пересчёт. N итераций = N reflow.
5. Лечится разделением фаз: **сначала все чтения, потом все записи**. Тогда браузер делает ровно один reflow.

## Пример

\`\`\`ts
// ПЛОХО: read-write-read-write -> N reflow
for (const el of boxes) {
  const w = el.offsetWidth;       // read — форсирует layout
  el.style.width = w + 10 + 'px'; // write — снова пачкает layout
}

// ХОРОШО: сначала все чтения, потом все записи -> один reflow
const widths = boxes.map((el) => el.offsetWidth); // фаза чтения
boxes.forEach((el, i) => {
  el.style.width = widths[i] + 10 + 'px';         // фаза записи
});
\`\`\`

Почему так: во втором варианте между чтениями нет ни одной записи, поэтому layout остаётся «чистым» и пересчитывается один раз — в конце кадра.

## Что сказать на собеседовании

> Layout thrashing, он же forced synchronous layout, — это когда в цикле чередуются запись в DOM и чтение геометрических свойств вроде \`offsetWidth\` или \`getBoundingClientRect()\`. Браузер обычно откладывает пересчёт layout до конца кадра, но чтение обязано вернуть актуальное значение, поэтому форсирует reflow немедленно. В итоге вместо одного reflow за кадр получаем N. Лечится батчингом: сначала фаза чтений, потом фаза записей — можно вручную, можно через FastDOM, который разносит их по фазам \`requestAnimationFrame\`. Ловлю это в Performance-панели DevTools: фиолетовые блоки Layout с предупреждением Forced reflow и длинные задачи. Ещё помогает \`ResizeObserver\` вместо опроса размеров в цикле.

## Ловушки

- **Не только \`offsetWidth\`**: \`scrollTop\`, \`clientHeight\`, \`getComputedStyle()\`, \`getBoundingClientRect()\`, \`focus()\`, \`scrollIntoView()\` — все форсируют layout.
- **Чтение само по себе безопасно**, дорогим его делает предшествующая запись в том же кадре.
- **\`requestAnimationFrame\` не волшебная палочка**: если внутри rAF снова чередовать чтение и запись, thrashing никуда не денется.
- **Виноват может быть чужой код**: сторонняя библиотека или Angular-директива в цикле измеряет элементы.
- **DevTools подсказывает цену**: в предупреждении Forced reflow пишется, сколько миллисекунд это стоило.
- Спросят следом: чем reflow отличается от repaint и почему \`transform\` дешевле изменения \`top\`.`,
      en: `## In short

Layout thrashing is when a loop **alternates writing to the DOM and reading geometry**. Every read after a write forces the browser to compute layout immediately, so instead of one reflow per frame you get hundreds.

Analogy: you put one item in the suitcase, walk to the scales and weigh it, put in the next item, walk to the scales again. The scales are accurate — you just visited them 100 times instead of once.

## How it works, step by step

1. The browser keeps an internal "layout is dirty" flag. Any style or DOM write sets it.
2. The browser postpones the recompute on purpose: it wants to collect all changes and do **one** reflow at the end of the frame.
3. But then you read \`offsetWidth\` / \`getBoundingClientRect()\` — the browser must return an **up-to-date** number, so it computes layout right there. That is a **forced synchronous layout**.
4. The next write dirties the flag again, the next read forces another recompute. N iterations = N reflows.
5. The cure is phase separation: **all reads first, then all writes**. Then the browser does exactly one reflow.

## Example

\`\`\`ts
// BAD: read-write-read-write -> N reflows
for (const el of boxes) {
  const w = el.offsetWidth;       // read — forces layout
  el.style.width = w + 10 + 'px'; // write — dirties layout again
}

// GOOD: all reads first, then all writes -> a single reflow
const widths = boxes.map((el) => el.offsetWidth); // read phase
boxes.forEach((el, i) => {
  el.style.width = widths[i] + 10 + 'px';         // write phase
});
\`\`\`

Why this works: in the second version there is no write between the reads, so layout stays "clean" and is recomputed once, at the end of the frame.

## What to say in the interview

> Layout thrashing, or forced synchronous layout, is when a loop alternates DOM writes with reads of geometric properties like \`offsetWidth\` or \`getBoundingClientRect()\`. The browser normally defers layout until the end of the frame, but a read must return an up-to-date value, so it forces a reflow immediately. The result is N reflows per frame instead of one. The fix is batching: a read phase and then a write phase — by hand, or with FastDOM, which schedules them into separate \`requestAnimationFrame\` phases. I catch it in the DevTools Performance panel: purple Layout blocks with a Forced reflow warning, plus long tasks. \`ResizeObserver\` also helps, instead of polling element sizes in a loop.

## Gotchas

- **It is not just \`offsetWidth\`**: \`scrollTop\`, \`clientHeight\`, \`getComputedStyle()\`, \`getBoundingClientRect()\`, \`focus()\`, \`scrollIntoView()\` all force layout.
- **A read on its own is harmless** — what makes it expensive is a write earlier in the same frame.
- **\`requestAnimationFrame\` is not a magic wand**: alternate reads and writes inside rAF and the thrashing is still there.
- **The culprit is often third-party code**: a library or a directive measuring elements in a loop.
- **DevTools tells you the price**: the Forced reflow warning reports how many milliseconds it cost.
- Expect the follow-up: how reflow differs from repaint, and why \`transform\` is cheaper than changing \`top\`.`
    },
    codeSnippet: `// Forced synchronous layout demo
function thrash(boxes) {
  // Interleaved read/write — slow
  boxes.forEach((el) => {
    el.style.height = el.offsetHeight * 2 + 'px';
  });
}

function batched(boxes) {
  const heights = boxes.map((el) => el.offsetHeight); // reads
  boxes.forEach((el, i) => {                           // writes
    el.style.height = heights[i] * 2 + 'px';
  });
}`
  },
  {
    id: 'web-004',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['compositor', 'transform', 'gpu'],
    question: {
      ru: 'Почему transform и opacity называют compositor-only свойствами? Как это влияет на плавность анимаций?',
      en: 'Why are transform and opacity called compositor-only properties? How does that affect animation smoothness?'
    },
    answer: {
      ru: `## Коротко

\`transform\` и \`opacity\` называют compositor-only, потому что их анимация **пропускает Layout и Paint** — картинка элемента уже нарисована и лежит отдельным слоем, композитору остаётся только сдвинуть её или сделать полупрозрачной. Делает он это на своём потоке и на GPU.

Аналогия: слои — как прозрачные плёнки в мультипликации. Чтобы персонаж «прошёл» по фону, не перерисовывают фон — просто двигают плёнку.

## Как это работает по шагам

1. Элемент, который анимируют через \`transform\`/\`opacity\`, браузер поднимает в **отдельный композиторный слой** и один раз растрирует (рисует) его в текстуру.
2. Дальше каждый кадр меняется только матрица трансформации или альфа этого слоя — ни layout, ни paint не запускаются.
3. Работу делает **compositor thread**, отдельный от main thread. Поэтому анимация продолжает идти плавно, даже когда main thread занят тяжёлым JavaScript.
4. Сравните с конвейером других свойств: \`width\`/\`top\` → **Layout → Paint → Composite** (дорого, всё в main thread); \`background-color\` → **Paint → Composite** (средне); \`transform\`/\`opacity\` → **Composite only** (дёшево, GPU).
5. Бюджет кадра жёсткий: при 60 fps на всё про всё **16.7 мс**, при 120 fps — **8.3 мс**. Не уложились — кадр пропущен, пользователь видит рывок.

## Пример

\`\`\`css
.card {
  transition: transform 200ms ease-out;
}
.card:hover {
  transform: translateY(-4px) scale(1.02);
}
\`\`\`

Почему так: \`translateY\` + \`scale\` не меняют разметку соседей, поэтому весь эффект «подъёма» карточки стоит одну композицию слоя вместо reflow всей сетки.

## Как элемент попадает в отдельный слой

- \`will-change: transform\` — явный, стандартный способ;
- \`transform: translateZ(0)\` / \`backface-visibility: hidden\` — старый хак promotion;
- 3D-трансформации, \`<video>\`, \`<canvas>\`, элементы с анимируемой \`opacity\`, \`position: fixed\` в некоторых случаях.

## Что сказать на собеседовании

> \`transform\` и \`opacity\` называют compositor-only, потому что их изменение не требует ни Layout, ни Paint: элемент уже растрирован в отдельный слой, и композитору достаточно применить к готовой текстуре матрицу или альфу. Делается это на compositor thread и на GPU, поэтому анимация остаётся плавной, даже когда main thread занят JavaScript. Для сравнения, анимация \`width\` или \`top\` каждый кадр гоняет полный конвейер layout → paint → composite в main thread. Бюджет кадра при 60 fps — 16.7 мс, при 120 fps — 8.3 мс. Слой создаётся через \`will-change: transform\` или старый хак \`translateZ(0)\`, но слоями нельзя злоупотреблять: каждый ест видеопамять, и layer explosion сам по себе тормозит композитинг.

## Ловушки

- **Слои стоят видеопамяти**: сотни слоёв (layer explosion) замедляют композитинг сильнее, чем экономят на paint.
- **\`will-change\` ставят перед анимацией и снимают после** — постоянно включённый держит ресурсы зря.
- **\`transform\` не двигает соседей**: элемент визуально сдвинут, но в layout занимает старое место — легко получить неожиданные перекрытия и попадания мыши.
- **\`opacity: 0\` не убирает элемент**: он всё ещё кликабелен и доступен скринридеру.
- **Не любой \`transform\` дёшев**: анимация с одновременным изменением \`box-shadow\` или фильтров снова тянет paint.
- Спросят следом: как проверить, что анимация идёт на композиторе (DevTools → Rendering → Layer borders, Paint flashing, вкладка Layers, Performance).`,
      en: `## In short

\`transform\` and \`opacity\` are called compositor-only because animating them **skips Layout and Paint** — the element is already drawn and sitting in its own layer, so the compositor merely moves that picture or fades it. It does that on its own thread and on the GPU.

Analogy: layers are the transparent cels of classic animation. To walk a character across the background you do not repaint the background — you just slide the cel.

## How it works, step by step

1. An element animated with \`transform\`/\`opacity\` gets promoted to its **own compositor layer** and is rasterized into a texture once.
2. From then on each frame only changes that layer's transform matrix or alpha — neither layout nor paint runs.
3. The work happens on the **compositor thread**, separate from the main thread. That is why the animation keeps running smoothly even while the main thread is busy with heavy JavaScript.
4. Compare the pipelines: \`width\`/\`top\` → **Layout → Paint → Composite** (expensive, all on the main thread); \`background-color\` → **Paint → Composite** (medium); \`transform\`/\`opacity\` → **Composite only** (cheap, GPU).
5. The frame budget is hard: at 60 fps you have **16.7 ms** for everything, at 120 fps **8.3 ms**. Miss it and the frame is dropped — the user sees a stutter.

## Example

\`\`\`css
.card {
  transition: transform 200ms ease-out;
}
.card:hover {
  transform: translateY(-4px) scale(1.02);
}
\`\`\`

Why this works: \`translateY\` + \`scale\` do not change the neighbours' box model, so the whole "lift" effect costs one layer composite instead of reflowing the entire grid.

## How an element gets its own layer

- \`will-change: transform\` — the explicit, standardized way;
- \`transform: translateZ(0)\` / \`backface-visibility: hidden\` — the old promotion hack;
- 3D transforms, \`<video>\`, \`<canvas>\`, elements with animated \`opacity\`, sometimes \`position: fixed\`.

## What to say in the interview

> \`transform\` and \`opacity\` are compositor-only because changing them needs neither Layout nor Paint: the element is already rasterized into its own layer, so the compositor just applies a matrix or an alpha value to the ready-made texture. That runs on the compositor thread and the GPU, so the animation stays smooth even while the main thread is blocked by JavaScript. By contrast, animating \`width\` or \`top\` runs the full layout → paint → composite pipeline on the main thread every frame. The frame budget is 16.7 ms at 60 fps and 8.3 ms at 120 fps. A layer is created via \`will-change: transform\` or the old \`translateZ(0)\` hack, but you must not overuse layers: each one costs video memory, and a layer explosion slows compositing by itself.

## Gotchas

- **Layers cost video memory**: hundreds of them (layer explosion) slow compositing more than they save on paint.
- **Set \`will-change\` right before the animation and remove it afterwards** — leaving it on permanently reserves resources for nothing.
- **\`transform\` does not move neighbours**: visually the element has shifted, but in layout it still occupies its old box — easy to get surprising overlaps and hit-testing.
- **\`opacity: 0\` does not remove the element**: it is still clickable and still read by screen readers.
- **Not every \`transform\` is cheap**: animate it together with \`box-shadow\` or filters and paint is back in the pipeline.
- Expect the follow-up: how to verify an animation actually runs on the compositor (DevTools → Rendering → Layer borders, Paint flashing, the Layers tab, Performance).`
    }
  },
  {
    id: 'web-005',
    category: 'html-css-performance',
    level: 'Medium',
    tags: ['will-change', 'gpu-layers', 'optimization'],
    question: {
      ru: 'Как работает will-change? Когда его стоит использовать, а когда он вредит производительности?',
      en: 'How does will-change work? When should you use it, and when does it hurt performance?'
    },
    answer: {
      ru: `## Коротко

\`will-change\` — это **предупреждение браузеру**: «вот это свойство сейчас начнёт меняться, подготовься заранее». Обычно подготовка = вынести элемент в отдельный композиторный слой заранее, а не в момент старта анимации.

Аналогия: сказать официанту «мы будем заказывать десерт» — он заранее подойдёт с меню. Но если каждый гость в зале скажет это одновременно, официанты просто встанут: ресурс не бесконечный.

## Как это работает по шагам

1. Без \`will-change\` браузер создаёт слой в момент, когда анимация уже началась. Создание слоя — это растрирование картинки, оно занимает время и даёт «джанк» на первых кадрах.
2. С \`will-change: transform\` браузер поднимает элемент в слой **заранее**, поэтому первый кадр анимации выходит сразу плавным.
3. Пока \`will-change\` активен, браузер держит под элемент зарезервированную видеопамять и слой.
4. Поэтому правильный цикл: **поставить незадолго до анимации → анимировать → снять**. Снятие возвращает память.
5. Указывать нужно конкретные свойства (\`will-change: transform, opacity\`), а не \`all\`: иначе браузер не понимает, к чему готовиться, и готовится к худшему.

## Пример

\`\`\`ts
el.addEventListener('mouseenter', () => {
  el.style.willChange = 'transform'; // готовим слой заранее
});
el.addEventListener('animationend', () => {
  el.style.willChange = 'auto';      // отдаём слой обратно
});
\`\`\`

Почему так: \`mouseenter\` наступает за десятки миллисекунд до клика или hover-анимации — этого хватает браузеру, чтобы создать слой без рывка. А \`auto\` после анимации освобождает видеопамять.

## Что сказать на собеседовании

> \`will-change\` — это подсказка браузеру, что свойство скоро изменится, чтобы он подготовил оптимизацию заранее, обычно вынес элемент в отдельный композиторный слой. Смысл в том, чтобы слой создался до старта анимации, а не в первом её кадре, где это даёт джанк. Ставить надо незадолго до анимации, например по \`mouseenter\`, и обязательно снимать в \`auto\` после — иначе браузер бесконечно держит зарезервированную видеопамять. Указываю конкретные свойства, \`transform\` и \`opacity\`, не \`all\`. Главная ошибка — вешать \`will-change\` глобально на селектор вроде звёздочки: каждый элемент получает слой, случается layer explosion, и композитинг становится медленнее, чем был. Старый аналог — хак \`translateZ(0)\`, но \`will-change\` это стандартный явный способ.

## Ловушки

- **\`will-change: all\`** или глобальный селектор — почти гарантированное падение производительности.
- **Забыли снять** — память держится всё время жизни страницы.
- **Слишком рано поставили** — браузер имеет право снять оптимизацию, если анимация так и не началась.
- **\`will-change\` создаёт новый stacking context** и containing block для \`position: fixed\` потомков — иногда ломает вёрстку и \`z-index\`.
- **Это не ускоритель**: если анимируется \`width\`, \`will-change: width\` не сделает её compositor-only.
- Спросят следом: чем отличается от \`translateZ(0)\` и как посмотреть слои (DevTools → Layers, Rendering → Layer borders).`,
      en: `## In short

\`will-change\` is a **heads-up to the browser**: "this property is about to change, get ready". Getting ready usually means promoting the element to its own compositor layer up front, instead of at the moment the animation starts.

Analogy: telling the waiter "we'll be ordering dessert" — they come over with the menu in advance. But if every guest in the room says it at once, the waiters seize up: the resource is finite.

## How it works, step by step

1. Without \`will-change\` the browser creates the layer when the animation has already begun. Creating a layer means rasterizing the element into a texture — it costs time and shows up as jank in the first frames.
2. With \`will-change: transform\` the browser promotes the element to a layer **ahead of time**, so the very first animation frame is already smooth.
3. While \`will-change\` is active the browser keeps video memory and a layer reserved for that element.
4. Hence the correct cycle: **set it shortly before the animation → animate → remove it**. Removing it gives the memory back.
5. Name concrete properties (\`will-change: transform, opacity\`), never \`all\`: otherwise the browser has no idea what to prepare for and prepares for the worst.

## Example

\`\`\`ts
el.addEventListener('mouseenter', () => {
  el.style.willChange = 'transform'; // prepare the layer in advance
});
el.addEventListener('animationend', () => {
  el.style.willChange = 'auto';      // hand the layer back
});
\`\`\`

Why this works: \`mouseenter\` fires tens of milliseconds before the click or hover animation — enough for the browser to build the layer without a stutter. And \`auto\` afterwards releases the video memory.

## What to say in the interview

> \`will-change\` is a hint that a property is about to change so the browser can prepare an optimization in advance, typically promoting the element to its own compositor layer. The point is that the layer is created before the animation starts rather than in its first frame, where it causes jank. Set it shortly before the animation — on \`mouseenter\`, for example — and always reset it to \`auto\` afterwards, otherwise the browser holds reserved video memory forever. I name concrete properties, \`transform\` and \`opacity\`, never \`all\`. The classic mistake is putting \`will-change\` on a global selector: every element gets a layer, you hit a layer explosion, and compositing ends up slower than before. The old equivalent is the \`translateZ(0)\` hack, but \`will-change\` is the explicit standard way.

## Gotchas

- **\`will-change: all\`** or a global selector is a near-guaranteed performance regression.
- **Forgetting to remove it** keeps the memory reserved for the whole page lifetime.
- **Setting it too early**: the browser is allowed to drop the optimization if the animation never starts.
- **\`will-change\` creates a new stacking context** and a containing block for \`position: fixed\` descendants — it can break layout and \`z-index\`.
- **It is not a speed-up switch**: if you animate \`width\`, \`will-change: width\` will not make it compositor-only.
- Expect the follow-up: how it differs from \`translateZ(0)\`, and how to inspect layers (DevTools → Layers, Rendering → Layer borders).`
    }
  },
  {
    id: 'web-006',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['core-web-vitals', 'lcp', 'metrics'],
    question: {
      ru: 'Что такое LCP (Largest Contentful Paint)? Какие пороги «хорошо/плохо» и как его оптимизировать?',
      en: 'What is LCP (Largest Contentful Paint)? What are the good/poor thresholds and how do you optimize it?'
    },
    answer: {
      ru: `## Коротко

LCP — время, за которое отрисовался **самый крупный видимый элемент первого экрана**: обычно hero-картинка, большой заголовок или постер видео. Это заменитель вопроса «когда пользователю показалось, что страница загрузилась».

Аналогия: вы оцениваете, что блюдо подали, не по салфетке и не по вилке, а по тому моменту, когда на стол поставили главную тарелку. LCP — про эту тарелку.

## Как это работает по шагам

1. Пока страница грузится, браузер следит, какой отрисованный элемент занимает **наибольшую площадь в viewport**, и записывает кандидата.
2. Появился элемент крупнее — кандидат перезаписывается. То есть LCP-элемент **меняется по ходу загрузки**.
3. Финальное значение фиксируется при **первом взаимодействии пользователя** (клик, тап, нажатие клавиши) или при уходе со страницы.
4. Оценка идёт по **75-му перцентилю реальных пользователей** — это field-данные, CrUX. Lighthouse даёт лабораторную оценку, она может расходиться с полем.
5. Пороги Core Web Vitals: **хорошо ≤ 2.5 с**, **требует улучшения 2.5 – 4.0 с**, **плохо > 4.0 с**.

## Из чего складывается LCP

1. **TTFB** — медленный сервер или отсутствие CDN задерживает вообще всё.
2. **Render-blocking CSS/JS** — браузер не рисует, пока не разобрал критический CSS.
3. **Время загрузки самого LCP-ресурса** — большая несжатая картинка.
4. **Client-side рендеринг** — элемент появляется только после гидрации и запроса к API.

## Пример

\`\`\`html
<link rel="preload" as="image" href="hero.avif" fetchpriority="high" />
<img src="hero.avif" fetchpriority="high" width="1200" height="600" alt="Hero" />
\`\`\`

Почему так: \`preload\` начинает качать hero ещё до того, как парсер дошёл до \`<img>\`, а \`fetchpriority="high"\` поднимает картинку в очереди приоритетов выше остальных изображений. \`width\`/\`height\` заодно резервируют место и спасают CLS.

## Что сказать на собеседовании

> LCP измеряет, когда отрисовался самый крупный видимый элемент в области просмотра — обычно hero-картинка или большой блок текста. Это прокси воспринимаемой скорости загрузки. Порог «хорошо» — 2.5 секунды, «плохо» — больше 4, и считается это по 75-му перцентилю реальных пользователей из CrUX, то есть по field-данным, а Lighthouse даёт только лабораторную оценку. Складывается LCP из TTFB, render-blocking CSS и JS, времени загрузки самого LCP-ресурса и задержки клиентского рендеринга. Лечу так: preload и \`fetchpriority="high"\` для hero-картинки, современные форматы AVIF или WebP с \`srcset\`, инлайн критического CSS, SSR или SSG, CDN и кэш ради TTFB. Важный нюанс — LCP-элемент меняется по ходу загрузки, а финальное значение фиксируется на первом взаимодействии пользователя.

## Ловушки

- **Не вешайте \`loading="lazy"\` на hero-картинку** — это самая частая причина плохого LCP.
- **Lighthouse (lab) ≠ CrUX (field)**: локально может быть 1.2 с, а у реальных пользователей 4 с на 4G и слабом телефоне.
- **LCP-элемент может оказаться не тем, что вы думаете** — проверяйте через PerformanceObserver или в Lighthouse (он показывает конкретный элемент).
- **Фоновая картинка через \`background-image\` в CSS грузится позже**, чем \`<img>\`: препроцессор HTML её не видит.
- **Preload всего подряд бесполезен**: приоритет — вещь относительная, если высокий у всего, значит ни у чего.
- **Анимации появления (fade-in) откладывают LCP**: элемент считается отрисованным только когда стал видимым.`,
      en: `## In short

LCP is the time it takes to render the **largest visible element in the viewport**: usually the hero image, a big headline, or a video poster. It stands in for the question "when did the page feel loaded to the user?"

Analogy: you judge that dinner has been served not by the napkin or the fork, but by the moment the main plate lands on the table. LCP is about that plate.

## How it works, step by step

1. While the page loads, the browser tracks which painted element covers the **largest area of the viewport** and records it as the candidate.
2. A bigger element shows up — the candidate is overwritten. In other words the LCP element **changes during load**.
3. The final value is locked in at the **user's first interaction** (click, tap, keypress) or when they leave the page.
4. Scoring uses the **75th percentile of real users** — field data from CrUX. Lighthouse gives a lab number, which can disagree with the field.
5. Core Web Vitals thresholds: **good ≤ 2.5 s**, **needs improvement 2.5 – 4.0 s**, **poor > 4.0 s**.

## What LCP is made of

1. **TTFB** — a slow server or no CDN delays everything downstream.
2. **Render-blocking CSS/JS** — nothing paints until the critical CSS is parsed.
3. **Load time of the LCP resource itself** — a big, uncompressed image.
4. **Client-side rendering** — the element only shows up after hydration and an API call.

## Example

\`\`\`html
<link rel="preload" as="image" href="hero.avif" fetchpriority="high" />
<img src="hero.avif" fetchpriority="high" width="1200" height="600" alt="Hero" />
\`\`\`

Why this works: \`preload\` starts fetching the hero before the parser even reaches the \`<img>\`, and \`fetchpriority="high"\` lifts it above other images in the priority queue. \`width\`/\`height\` also reserve the space, which saves your CLS.

## What to say in the interview

> LCP measures when the largest visible element in the viewport is rendered — typically a hero image or a large block of text. It is a proxy for perceived load speed. The "good" threshold is 2.5 seconds and "poor" is above 4, measured at the 75th percentile of real users from CrUX, so it is field data; Lighthouse only gives you the lab equivalent. LCP is composed of TTFB, render-blocking CSS and JS, the load time of the LCP resource itself, and any client-rendering delay. My fixes: preload plus \`fetchpriority="high"\` for the hero image, modern formats like AVIF or WebP with \`srcset\`, inlined critical CSS, SSR or SSG, and a CDN with caching for TTFB. One key nuance — the LCP element changes as the page loads, and the final value is locked in at the user's first interaction.

## Gotchas

- **Never put \`loading="lazy"\` on the hero image** — it is the single most common cause of a bad LCP.
- **Lighthouse (lab) ≠ CrUX (field)**: 1.2 s on your laptop can be 4 s for real users on 4G and a mid-range phone.
- **The LCP element may not be what you assume** — verify it with a PerformanceObserver, or in Lighthouse, which names the element.
- **A CSS \`background-image\` loads later than an \`<img>\`**: the preload scanner cannot see it in the HTML.
- **Preloading everything is pointless**: priority is relative — if everything is high priority, nothing is.
- **Fade-in entrance animations delay LCP**: the element only counts as painted once it is actually visible.`
    },
    codeSnippet: `// Observe the LCP candidate in the field (RUM)
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lcp = entries[entries.length - 1]; // last candidate wins
  console.log('LCP', Math.round(lcp.startTime), 'ms', lcp.element);
}).observe({ type: 'largest-contentful-paint', buffered: true });`
  },
  {
    id: 'web-007',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['core-web-vitals', 'cls', 'layout-shift'],
    question: {
      ru: 'Что такое CLS (Cumulative Layout Shift)? Как он вычисляется и какие частые причины сдвигов макета?',
      en: 'What is CLS (Cumulative Layout Shift)? How is it computed and what are common causes of layout shifts?'
    },
    answer: {
      ru: `## Коротко

CLS измеряет **визуальную стабильность**: насколько неожиданно у пользователя «прыгает» контент под пальцем. Это не время, а безразмерная оценка — сумма сдвигов.

Аналогия: вы тянетесь нажать кнопку лифта, а панель в этот момент сама уезжает вниз — и вы жмёте не тот этаж. Ровно это чувствует пользователь, когда над кнопкой догрузился баннер.

## Как это работает по шагам

1. Каждый раз, когда уже отрисованный элемент меняет своё положение между кадрами, браузер фиксирует **layout shift**.
2. Оценка одного сдвига = **impact fraction × distance fraction**. Impact — какая доля viewport затронута, distance — на какую долю viewport максимально уехал элемент.
3. Итоговый CLS — это сумма сдвигов в **наихудшем окне сессии** (session window): окно длится максимум 5 с, разрыв между сдвигами не больше 1 с.
4. Считаются только **неожиданные** сдвиги. Сдвиг в течение **500 мс после пользовательского ввода** помечается \`hadRecentInput\` и не штрафуется — раскрывшийся по клику аккордеон это нормально.
5. Пороги: **хорошо ≤ 0.1**, **требует улучшения 0.1 – 0.25**, **плохо > 0.25**. Оценка — по 75-му перцентилю реальных пользователей.

## Частые причины

- Изображения и видео **без указанных размеров** — контент прыгает в момент загрузки.
- Реклама, эмбеды, iframes без зарезервированного места.
- Динамически вставляемые баннеры и уведомления **над** существующим контентом.
- Веб-шрифты: FOIT/FOUT меняет метрики текста, высота блоков пересчитывается.

## Пример

\`\`\`css
img,
video {
  aspect-ratio: 16 / 9; /* резервируем место до загрузки файла */
  width: 100%;
  height: auto;
}
\`\`\`

Почему так: браузер узнаёт пропорции ещё до того, как скачал файл, и сразу отводит под него правильную высоту — догрузившаяся картинка ничего не сдвигает. Ровно тот же эффект дают атрибуты \`width\` и \`height\` на \`<img>\`.

## Что сказать на собеседовании

> CLS — метрика визуальной стабильности: насколько неожиданно прыгает контент. Каждый сдвиг оценивается как impact fraction, умноженная на distance fraction, а итоговый CLS — это сумма сдвигов в худшем окне сессии длиной до пяти секунд. Порог «хорошо» — 0.1, «плохо» — больше 0.25, по 75-му перцентилю реальных пользователей. Важно, что считаются только неожиданные сдвиги: всё, что произошло в течение 500 мс после пользовательского ввода, помечается \`hadRecentInput\` и не штрафуется. Основные причины — картинки и iframes без размеров, реклама без зарезервированного места, баннеры, вставленные над контентом, и подмена шрифтов. Чиню через \`width\`/\`height\` или \`aspect-ratio\`, скелетоны с \`min-height\`, \`font-display: optional\` с \`size-adjust\`, и анимирую \`transform\`, а не геометрию.

## Ловушки

- **CLS накапливается всю жизнь страницы**, а не только при загрузке — в SPA сдвиги после навигации тоже считаются.
- **\`transform\` не создаёт layout shift**, а изменение \`top\`/\`height\` создаёт — отсюда правило анимировать трансформы.
- **Скрытый элемент, ставший видимым, сдвигает соседей**: резервируйте место скелетоном или \`min-height\`.
- **500 мс после ввода — не индульгенция**: если ваш обработчик сдвигает контент через секунду, сдвиг уже штрафной.
- **Лабораторный CLS почти всегда ниже полевого**: Lighthouse не кликает, не скроллит и не ждёт ленивую рекламу.
- Спросят следом: как измерить самому — \`PerformanceObserver\` по \`layout-shift\` с фильтром \`hadRecentInput\`, плюс библиотека web-vitals для RUM.`,
      en: `## In short

CLS measures **visual stability**: how unexpectedly content jumps around under the user's finger. It is not a time — it is a unitless score, the sum of shifts.

Analogy: you reach for a lift button and the panel slides down just as you press, so you pick the wrong floor. That is exactly what a user feels when a banner loads in above the button.

## How it works, step by step

1. Every time an already-painted element changes position between frames, the browser records a **layout shift**.
2. One shift scores **impact fraction × distance fraction**. Impact is how much of the viewport was affected; distance is how far, as a fraction of the viewport, the element travelled.
3. The final CLS is the sum of shifts in the **worst session window**: a window lasts at most 5 s, with gaps between shifts no longer than 1 s.
4. Only **unexpected** shifts count. A shift within **500 ms of user input** is flagged \`hadRecentInput\` and is not penalized — an accordion expanding on click is fine.
5. Thresholds: **good ≤ 0.1**, **needs improvement 0.1 – 0.25**, **poor > 0.25**, scored at the 75th percentile of real users.

## Common causes

- Images and videos **with no dimensions** — content jumps the moment they load.
- Ads, embeds and iframes with no reserved space.
- Banners and notifications injected **above** existing content.
- Web fonts: FOIT/FOUT changes text metrics and block heights are recomputed.

## Example

\`\`\`css
img,
video {
  aspect-ratio: 16 / 9; /* reserve the box before the file arrives */
  width: 100%;
  height: auto;
}
\`\`\`

Why this works: the browser knows the aspect ratio before it has downloaded the file, so it allocates the right height immediately and the arriving image shifts nothing. The \`width\` and \`height\` attributes on \`<img>\` achieve the same thing.

## What to say in the interview

> CLS is the visual-stability metric: how unexpectedly content jumps. Each shift scores impact fraction times distance fraction, and the reported CLS is the sum of shifts inside the worst session window, which lasts up to five seconds. The "good" threshold is 0.1 and "poor" is above 0.25, at the 75th percentile of real users. Crucially, only unexpected shifts count: anything within 500 ms of a user input is flagged \`hadRecentInput\` and is not penalized. The usual causes are images and iframes without dimensions, ads with no reserved space, banners injected above content, and font swapping. I fix it with \`width\`/\`height\` or \`aspect-ratio\`, skeletons with \`min-height\`, \`font-display: optional\` plus \`size-adjust\`, and by animating \`transform\` instead of geometry.

## Gotchas

- **CLS accumulates over the whole page lifetime**, not just during load — in an SPA, shifts after navigation count too.
- **\`transform\` produces no layout shift** while changing \`top\`/\`height\` does — hence the rule to animate transforms.
- **A hidden element becoming visible pushes its neighbours**: reserve the space with a skeleton or \`min-height\`.
- **The 500 ms input window is not a blanket excuse**: if your handler shifts content a second later, it counts against you.
- **Lab CLS is almost always lower than field CLS**: Lighthouse does not click, scroll, or wait for lazily loaded ads.
- Expect the follow-up: how to measure it yourself — a \`PerformanceObserver\` on \`layout-shift\` filtering \`hadRecentInput\`, plus the web-vitals library for RUM.`
    },
    codeSnippet: `// Measure CLS yourself, ignoring shifts right after user input
let cls = 0;
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      cls += entry.value;
    }
  }
  console.log('CLS so far', cls.toFixed(3));
}).observe({ type: 'layout-shift', buffered: true });`
  },
  {
    id: 'web-008',
    category: 'html-css-performance',
    level: 'Expert',
    tags: ['core-web-vitals', 'inp', 'fid', 'interactivity'],
    question: {
      ru: 'Что такое INP (Interaction to Next Paint) и почему он заменил FID? Как его улучшить?',
      en: 'What is INP (Interaction to Next Paint) and why did it replace FID? How do you improve it?'
    },
    answer: {
      ru: `## Коротко

INP измеряет, **сколько проходит от действия пользователя до следующей отрисовки** — то есть насколько быстро интерфейс «отвечает». С марта 2024 года он заменил FID в Core Web Vitals.

Аналогия: FID мерил только «через сколько официант повернул к вам голову». INP мерит «через сколько на столе появилась еда» — и не один раз за вечер, а по худшему случаю за весь визит.

## Как это работает по шагам

1. Пользователь кликает, тапает или жмёт клавишу. Пока main thread занят, событие ждёт в очереди — это **input delay**.
2. Запускается ваш обработчик — это **processing time**.
3. Браузер должен отрисовать результат — до этого момента считается **presentation delay (next paint)**.
4. Сумма этих трёх кусков и есть длительность одного взаимодействия. INP берёт (примерно) **худшее взаимодействие за визит** — при большом количестве взаимодействий отбрасывается небольшой хвост выбросов.
5. Пороги: **хорошо ≤ 200 мс**, **требует улучшения 200 – 500 мс**, **плохо > 500 мс**.

## Почему INP лучше FID

- **FID** мерил только *задержку* до начала обработки **первого** ввода и игнорировал время самого обработчика и рендеринга. Страница могла показывать 10 мс FID и при этом дико тормозить после первого клика.
- **INP** учитывает полный путь и всю сессию, поэтому его невозможно «обмануть» быстрой первой реакцией.

## Пример

\`\`\`ts
async function handleClick() {
  doUrgentUiUpdate();      // мгновенный отклик: спиннер, disabled-состояние
  await scheduler.yield(); // отдаём кадр браузеру, он успевает отрисовать
  doHeavyWork();           // тяжёлое — уже после отрисовки
}
\`\`\`

Почему так: INP закрывается на моменте next paint. Если сначала отрисовать отклик и только потом считать, метрика фиксирует короткое взаимодействие, хотя общая работа не уменьшилась.

## Что сказать на собеседовании

> INP — Interaction to Next Paint — с марта 2024 заменил FID в Core Web Vitals. Он измеряет полный путь: input delay, пока событие ждёт освобождения main thread, время работы самого обработчика и presentation delay до следующей отрисовки. И берёт примерно худшее взаимодействие за весь визит, а не только первое. Порог «хорошо» — 200 мс, «плохо» — больше 500. FID был слабее, потому что мерил только задержку до начала обработки первого ввода и игнорировал и работу обработчика, и рендеринг. Улучшаю так: дроблю длинные задачи больше 50 мс через \`scheduler.yield()\`, некритичное откладываю в \`requestIdleCallback\`, тяжёлые вычисления выношу в Web Worker, а в Angular использую OnPush, signals и \`runOutsideAngular\`, чтобы сократить циклы change detection.

## Ловушки

- **Long task — это задача дольше 50 мс**; именно они съедают INP, потому что событие ждёт в очереди.
- **INP — полевая метрика**: в Lighthouse её честно не измерить, там показывают лабораторный суррогат (например, Total Blocking Time).
- **\`setTimeout(0)\` уступает \`scheduler.yield()\`**: yield возвращает управление и продолжает выполнение с приоритетом, а таймаут уходит в конец очереди.
- **Дебаунс обработчика не помогает**, если сам обработчик тяжёлый: рвать надо саму работу.
- **Виноват может быть не JS, а рендеринг**: гигантский DOM или дорогой CSS раздувают presentation delay.
- Спросят следом: как измерить INP у себя — библиотека web-vitals, \`PerformanceObserver\` по \`event\`/\`long-animation-frame\`, RUM в проде.`,
      en: `## In short

INP measures **how long it takes from a user action to the next paint** — in other words, how quickly the UI answers back. Since March 2024 it has replaced FID in Core Web Vitals.

Analogy: FID only measured how long before the waiter turned their head towards you. INP measures how long before food actually reached the table — and not once, but at the worst case across the whole visit.

## How it works, step by step

1. The user clicks, taps or presses a key. While the main thread is busy the event waits in the queue — that is **input delay**.
2. Your handler runs — that is **processing time**.
3. The browser then has to paint the result — everything up to that point is **presentation delay (next paint)**.
4. The sum of those three parts is the duration of one interaction. INP reports (roughly) the **worst interaction of the visit**; with many interactions a small tail of outliers is discarded.
5. Thresholds: **good ≤ 200 ms**, **needs improvement 200 – 500 ms**, **poor > 500 ms**.

## Why INP beats FID

- **FID** measured only the *delay* before the **first** input started processing, ignoring the handler's own time and the rendering. A page could report 10 ms FID and still feel awful right after that first click.
- **INP** covers the full path and the entire session, so a snappy first reaction cannot game it.

## Example

\`\`\`ts
async function handleClick() {
  doUrgentUiUpdate();      // instant feedback: spinner, disabled state
  await scheduler.yield(); // hand a frame back so the browser can paint
  doHeavyWork();           // heavy work — after the paint
}
\`\`\`

Why this works: INP stops counting at the next paint. Paint the feedback first and compute afterwards, and the metric records a short interaction — even though the total work is unchanged.

## What to say in the interview

> INP, Interaction to Next Paint, replaced FID in Core Web Vitals in March 2024. It measures the full path: input delay while the event waits for a free main thread, the processing time of the handler itself, and the presentation delay until the next paint. And it reports roughly the worst interaction across the whole visit, not just the first one. The "good" threshold is 200 ms, "poor" is above 500. FID was weaker because it only measured the delay before the first input started processing, ignoring both handler work and rendering. To improve INP I break long tasks above 50 ms with \`scheduler.yield()\`, defer non-critical work to \`requestIdleCallback\`, move heavy computation into a Web Worker, and in Angular use OnPush, signals and \`runOutsideAngular\` to cut change-detection cycles.

## Gotchas

- **A long task is anything over 50 ms**; those are what eat INP, because the event sits in the queue behind them.
- **INP is a field metric**: Lighthouse cannot truly measure it and shows a lab proxy instead (Total Blocking Time, for example).
- **\`setTimeout(0)\` is worse than \`scheduler.yield()\`**: yield resumes with priority, while a timeout goes to the back of the queue.
- **Debouncing the handler does not help** if the handler itself is heavy: the work is what needs chunking.
- **The culprit may be rendering, not JS**: a huge DOM or expensive CSS inflates the presentation delay.
- Expect the follow-up: how to measure INP yourself — the web-vitals library, a \`PerformanceObserver\` on \`event\`/\`long-animation-frame\`, or RUM in production.`
    },
    codeSnippet: `// Break a long handler so the next paint is not blocked -> better INP
button.addEventListener('click', async () => {
  applyImmediateUiState();           // cheap, paints fast

  // Yield to the browser so it can paint the feedback
  await (scheduler?.yield?.() ?? new Promise((r) => setTimeout(r, 0)));

  await processLargeDataset();        // heavy work happens after paint
});`
  },
  {
    id: 'web-009',
    category: 'html-css-performance',
    level: 'Medium',
    tags: ['core-web-vitals', 'ttfb', 'fcp', 'metrics'],
    question: {
      ru: 'Что такое TTFB и FCP? Как они соотносятся с другими метриками и как их улучшить?',
      en: 'What are TTFB and FCP? How do they relate to other metrics and how do you improve them?'
    },
    answer: {
      ru: `## Коротко

**TTFB** — сколько ждали **первый байт** ответа сервера. **FCP** — когда на экране появился **первый кусочек контента**: текст или картинка, а не просто фон. Обе метрики диагностические: они объясняют, почему у вас плохой LCP.

Аналогия: TTFB — сколько кухня думала, прежде чем начать готовить. FCP — когда на стол поставили хотя бы хлеб, чтобы вы поняли, что заказ приняли.

## Три метрики — что каждая значит

- **TTFB** — от старта навигации до первого байта. Внутри: DNS, TCP, TLS-хендшейк, редиректы и время работы самого сервера. Это фундамент: высокий TTFB отодвигает вообще всё. Порог **хорошо ≤ 800 мс**, но на практике целятся в **≤ 200 мс**.
- **FCP** — до отрисовки первого контента. Порог **хорошо ≤ 1.8 с**, **требует улучшения 1.8 – 3.0 с**, **плохо > 3.0 с**.
- **Связь**: \`TTFB → FCP → LCP\`. FCP физически не может наступить раньше, чем придёт первый байт и распарсится критический CSS. LCP обычно **≥ FCP**.

## Что делать по порядку

1. **TTFB**: CDN ближе к пользователю и кэш на edge; серверный кэш и оптимизация запросов к БД; HTTP/2 или HTTP/3 с keep-alive; \`103 Early Hints\`, чтобы браузер начал качать ресурсы, пока сервер ещё думает.
2. **FCP**: сократить render-blocking CSS и JS, инлайнить критический CSS; \`preconnect\` к критичным доменам и \`preload\` шрифтов; \`font-display: swap\`, чтобы текст рисовался сразу системным шрифтом.

## Пример

\`\`\`ts
// TTFB и FCP из Navigation/Paint Timing
const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
console.log('TTFB', Math.round(nav.responseStart), 'ms');

const fcp = performance.getEntriesByName('first-contentful-paint')[0];
console.log('FCP', Math.round(fcp.startTime), 'ms');
\`\`\`

Почему так: \`responseStart\` — это и есть момент первого байта, отсчитанный от начала навигации. А FCP лежит в записях типа \`paint\` под именем \`first-contentful-paint\`.

## Что сказать на собеседовании

> TTFB — время от начала навигации до первого байта ответа: сюда входят DNS, TCP, TLS, редиректы и работа сервера. Хорошим считается 800 мс и меньше, но обычно целятся в 200. FCP — время до отрисовки первого контента, текста или картинки; хорошо — 1.8 секунды и меньше, плохо — больше трёх. Цепочка простая: TTFB, потом FCP, потом LCP. FCP не может наступить раньше первого байта и разбора критического CSS, а LCP всегда не меньше FCP. TTFB улучшаю через CDN, edge- и серверный кэш, HTTP/2 или HTTP/3 и Early Hints. FCP — сокращением render-blocking ресурсов, инлайном критического CSS, \`preconnect\` и \`font-display: swap\`. Обе метрики не входят в Core Web Vitals, но они диагностические: если они плохи, LCP тоже будет плохим.

## Ловушки

- **TTFB и FCP не входят в Core Web Vitals** — их роль диагностическая, ранжирование считается по LCP, INP и CLS.
- **TTFB — это не только сервер**: редиректы, медленный DNS и TLS-хендшейк дают сотни миллисекунд на ровном месте.
- **Нулевой TTFB из кэша** обманчив: измеряйте с холодным кэшем и на throttling.
- **\`font-display: swap\` спасает FCP, но портит CLS**, если у fallback-шрифта другие метрики — лечится \`size-adjust\` и \`ascent-override\`.
- **Быстрый FCP при пустом скелетоне** — самообман: пользователь видит спиннер, а LCP всё ещё далеко.
- Спросят следом: чем FCP отличается от LCP и от FMP/TTI, и что такое lab-данные против field-данных.`,
      en: `## In short

**TTFB** is how long you waited for the **first byte** of the server's response. **FCP** is when the **first piece of content** appeared — text or an image, not just a background. Both are diagnostic: they explain *why* your LCP is bad.

Analogy: TTFB is how long the kitchen thought before it started cooking. FCP is when they put at least the bread on the table so you know the order was taken.

## The two metrics — what each one means

- **TTFB** — from navigation start to the first byte. Inside it: DNS, TCP, the TLS handshake, redirects, and the server's own processing time. It is the foundation: a high TTFB pushes everything else back. Threshold: **good ≤ 800 ms**, though teams usually aim for **≤ 200 ms**.
- **FCP** — until the first content is painted. **Good ≤ 1.8 s**, **needs improvement 1.8 – 3.0 s**, **poor > 3.0 s**.
- **The chain**: \`TTFB → FCP → LCP\`. FCP physically cannot happen before the first byte arrives and the critical CSS is parsed. LCP is always **≥ FCP**.

## What to do, in order

1. **TTFB**: a CDN closer to the user plus edge caching; server-side caching and optimized DB queries; HTTP/2 or HTTP/3 with keep-alive; \`103 Early Hints\` so the browser starts fetching while the server is still thinking.
2. **FCP**: cut render-blocking CSS and JS, inline the critical CSS; \`preconnect\` to critical origins and \`preload\` fonts; \`font-display: swap\` so text paints immediately in the fallback font.

## Example

\`\`\`ts
// TTFB and FCP from Navigation/Paint Timing
const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
console.log('TTFB', Math.round(nav.responseStart), 'ms');

const fcp = performance.getEntriesByName('first-contentful-paint')[0];
console.log('FCP', Math.round(fcp.startTime), 'ms');
\`\`\`

Why this works: \`responseStart\` *is* the first-byte moment, measured from navigation start. FCP lives in the \`paint\` entries under the name \`first-contentful-paint\`.

## What to say in the interview

> TTFB is the time from navigation start to the first byte of the response — DNS, TCP, TLS, redirects and server work all live inside it. Good is 800 ms or less, though teams usually target 200. FCP is the time until the first content is painted, text or an image; good is 1.8 seconds or less, poor is over three. The chain is simple: TTFB, then FCP, then LCP. FCP cannot happen before the first byte and the critical CSS parse, and LCP is always at least FCP. I improve TTFB with a CDN, edge and server caching, HTTP/2 or HTTP/3 and Early Hints. FCP by cutting render-blocking resources, inlining critical CSS, \`preconnect\`, and \`font-display: swap\`. Neither is a Core Web Vital, but they are diagnostic: if they are bad, LCP will be bad too.

## Gotchas

- **TTFB and FCP are not Core Web Vitals** — they are diagnostic; ranking uses LCP, INP and CLS.
- **TTFB is not just the server**: redirects, slow DNS and the TLS handshake add hundreds of milliseconds for free.
- **A near-zero TTFB from cache is misleading**: measure with a cold cache and network throttling.
- **\`font-display: swap\` helps FCP but can hurt CLS** if the fallback has different metrics — fix with \`size-adjust\` and \`ascent-override\`.
- **A fast FCP on an empty skeleton fools you**: the user sees a spinner while LCP is still far away.
- Expect the follow-up: how FCP differs from LCP and from FMP/TTI, and what lab data versus field data means.`
    }
  },
  {
    id: 'web-010',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['performance-observer', 'web-vitals', 'measurement'],
    question: {
      ru: 'Как измерять Core Web Vitals в реальных условиях (RUM) с помощью PerformanceObserver?',
      en: 'How do you measure Core Web Vitals in the field (RUM) using PerformanceObserver?'
    },
    answer: {
      ru: `## Коротко

RUM — это измерение метрик **у живых пользователей**, прямо в проде. Инструмент — \`PerformanceObserver\`: браузер сам присылает вам записи о LCP, сдвигах и взаимодействиях, а вы шлёте их в аналитику.

Аналогия: Lighthouse — это тест-драйв на идеальном полигоне. RUM — телеметрия с машин реальных владельцев: пробки, зима, изношенные шины. Ранжирование в Google считается по второму.

## Как это работает по шагам

1. **Lab (Lighthouse)** — синтетика в контролируемых условиях, хороша для отладки и для CI. **Field / RUM** — реальные пользователи, реальные телефоны и сети; именно это попадает в CrUX и влияет на ранжирование.
2. Создаёте \`PerformanceObserver\` с колбэком — он вызывается **асинхронно**, не блокируя main thread.
3. Подписываетесь на нужный тип записи: \`largest-contentful-paint\`, \`layout-shift\`, \`event\` (для INP), \`paint\` (FCP), \`navigation\` (TTFB), \`longtask\`.
4. Флаг \`buffered: true\` подтягивает записи, случившиеся **до** регистрации observer, — иначе вы пропустите ранний LCP.
5. Финальные значения отправляете при уходе со страницы: событие \`visibilitychange\` → \`hidden\` плюс \`navigator.sendBeacon\`, потому что обычный \`fetch\` браузер может убить при выгрузке.

## Пример

\`\`\`ts
// LCP — побеждает последняя запись
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const last = entries[entries.length - 1];
  console.log('LCP', last.startTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });

// CLS — суммируем только неожиданные сдвиги
let cls = 0;
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) cls += entry.value;
  }
}).observe({ type: 'layout-shift', buffered: true });
\`\`\`

Почему так: у LCP кандидат перезаписывается по ходу загрузки, поэтому берём последний. У CLS фильтр \`hadRecentInput\` отсекает сдвиги, вызванные самим пользователем.

## Готовое решение — библиотека web-vitals

\`\`\`ts
import { onLCP, onCLS, onINP } from 'web-vitals';
onLCP(sendToAnalytics);
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
\`\`\`

Google рекомендует именно её: она корректно закрывает edge-кейсы — session windows у CLS, отбрасывание выбросов и attribution у INP, back/forward cache.

## Что сказать на собеседовании

> Core Web Vitals бывают лабораторные и полевые. Lighthouse даёт lab-данные — синтетику в фиксированных условиях, удобно для отладки и CI. Полевые данные, RUM, снимаются у реальных пользователей, попадают в CrUX и именно они влияют на ранжирование. Собираю их через \`PerformanceObserver\`: подписываюсь на \`largest-contentful-paint\`, \`layout-shift\`, \`event\` для INP, \`paint\` для FCP и \`navigation\` для TTFB. Обязательно с \`buffered: true\`, иначе пропущу записи, случившиеся до регистрации обсервера. Для LCP беру последнюю запись, для CLS суммирую только сдвиги без \`hadRecentInput\`. Отправляю на \`visibilitychange\` в состоянии hidden через \`sendBeacon\`. В проде вместо ручного кода беру библиотеку web-vitals — она правильно обрабатывает session windows и bfcache.

## Ловушки

- **Забыли \`buffered: true\`** — потеряли ранние записи и получили заниженные метрики.
- **Отправка на \`unload\`/\`beforeunload\` ненадёжна** на мобильных: используйте \`visibilitychange\` → \`hidden\`.
- **\`sendBeacon\`, а не \`fetch\`**: обычный запрос браузер вправе отменить при выгрузке страницы.
- **Средние значения врут** — CWV считаются по **75-му перцентилю**, храните распределение, а не avg.
- **SPA-навигации не создают новую запись navigation**: LCP и CLS для маршрутов внутри SPA придётся считать самому.
- **bfcache-возвраты** выглядят как мгновенная загрузка и искажают статистику, если их не учитывать.`,
      en: `## In short

RUM means measuring metrics **on live users**, in production. The tool is \`PerformanceObserver\`: the browser hands you entries about LCP, layout shifts and interactions, and you ship them to analytics.

Analogy: Lighthouse is a test drive on a perfect track. RUM is telemetry from real owners' cars — traffic, winter, worn tyres. Google ranks you on the second one.

## How it works, step by step

1. **Lab (Lighthouse)** — synthetic runs in controlled conditions, great for debugging and CI. **Field / RUM** — real users on real phones and networks; this is what lands in CrUX and affects ranking.
2. You create a \`PerformanceObserver\` with a callback — it fires **asynchronously** and does not block the main thread.
3. You subscribe to the entry type you need: \`largest-contentful-paint\`, \`layout-shift\`, \`event\` (for INP), \`paint\` (FCP), \`navigation\` (TTFB), \`longtask\`.
4. The \`buffered: true\` flag pulls in entries that happened **before** the observer was registered — without it you miss an early LCP.
5. You send final values as the user leaves: the \`visibilitychange\` → \`hidden\` event plus \`navigator.sendBeacon\`, because a plain \`fetch\` can be killed during unload.

## Example

\`\`\`ts
// LCP — the last entry wins
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const last = entries[entries.length - 1];
  console.log('LCP', last.startTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });

// CLS — sum only the unexpected shifts
let cls = 0;
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) cls += entry.value;
  }
}).observe({ type: 'layout-shift', buffered: true });
\`\`\`

Why this works: the LCP candidate is overwritten as the page loads, so you take the last one. For CLS the \`hadRecentInput\` filter drops shifts the user caused themselves.

## The ready-made option — the web-vitals library

\`\`\`ts
import { onLCP, onCLS, onINP } from 'web-vitals';
onLCP(sendToAnalytics);
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
\`\`\`

Google recommends exactly this: it handles the edge cases correctly — CLS session windows, INP outlier trimming and attribution, and the back/forward cache.

## What to say in the interview

> Core Web Vitals come in lab and field flavours. Lighthouse gives lab data — synthetic runs in fixed conditions, useful for debugging and CI. Field data, or RUM, comes from real users, lands in CrUX, and is what actually affects ranking. I collect it with \`PerformanceObserver\`, subscribing to \`largest-contentful-paint\`, \`layout-shift\`, \`event\` for INP, \`paint\` for FCP and \`navigation\` for TTFB. Always with \`buffered: true\`, otherwise I lose entries that fired before the observer existed. For LCP I take the last entry; for CLS I sum only shifts without \`hadRecentInput\`. I report on \`visibilitychange\` when the page goes hidden, via \`sendBeacon\`. In production I use the web-vitals library rather than hand-rolled code — it gets session windows and bfcache right.

## Gotchas

- **Forgetting \`buffered: true\`** loses early entries and understates your metrics.
- **Reporting on \`unload\`/\`beforeunload\` is unreliable** on mobile: use \`visibilitychange\` → \`hidden\`.
- **\`sendBeacon\`, not \`fetch\`**: a normal request can be cancelled while the page unloads.
- **Averages lie** — CWV are scored at the **75th percentile**, so store the distribution, not the mean.
- **SPA navigations do not create a new navigation entry**: LCP and CLS for in-app routes need your own bookkeeping.
- **bfcache restores** look like instant loads and skew the stats unless you account for them.`
    }
  },
  {
    id: 'web-011',
    category: 'network-browser',
    level: 'Hard',
    tags: ['resource-hints', 'preload', 'preconnect'],
    question: {
      ru: 'Объясните разницу между preload, prefetch, preconnect и dns-prefetch. Когда применять каждый?',
      en: 'Explain the difference between preload, prefetch, preconnect, and dns-prefetch. When do you use each?'
    },
    answer: {
      ru: `## Коротко

Все четыре — это **подсказки браузеру, что подготовить заранее**. Два из них качают файлы (\`preload\` — для этой страницы, \`prefetch\` — для следующей), два готовят соединение (\`preconnect\` — целиком, \`dns-prefetch\` — только адрес).

Аналогия: \`preload\` — достать из холодильника продукты, которые точно нужны сегодня. \`prefetch\` — купить впрок на завтра. \`preconnect\` — заранее дозвониться поставщику и удержать линию. \`dns-prefetch\` — просто найти его номер в справочнике.

## Четыре подсказки — что каждая делает

1. **\`preload\`** — высокоприоритетная загрузка ресурса, **нужного на текущей странице**, но обнаруживаемого поздно: шрифт, зашитый в CSS, hero-картинка, критичный модуль. Браузер скачивает рано, но **не исполняет**. Обязателен атрибут \`as\`, иначе ресурс может скачаться дважды.
2. **\`prefetch\`** — низкоприоритетная загрузка ресурса для **будущей навигации**. Кладётся в кэш и используется позже. Идеален для чанка маршрута, на который пользователь скорее всего перейдёт.
3. **\`preconnect\`** — заранее поднимает соединение с **критичным сторонним origin**: DNS + TCP + TLS. Экономит **100–300 мс** на handshake.
4. **\`dns-prefetch\`** — только резолв DNS. Дешёвый и более совместимый fallback к \`preconnect\` для менее критичных доменов.

## Пример

\`\`\`html
<head>
  <!-- прогреваем критичный сторонний origin: DNS + TCP + TLS -->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="dns-prefetch" href="https://analytics.example.com" />

  <!-- шрифт обнаруживается поздно (он внутри CSS) — тянем сразу -->
  <link rel="preload" as="font" type="font/woff2" href="/inter.woff2" crossorigin />

  <!-- чанк вероятного следующего маршрута, лениво -->
  <link rel="prefetch" href="/dashboard.chunk.js" />
</head>
\`\`\`

Почему так: у шрифта \`crossorigin\` обязателен даже для своего домена — шрифты всегда качаются в анонимном CORS-режиме, и без атрибута preload не совпадёт с настоящим запросом, файл скачается два раза.

## Что сказать на собеседовании

> \`preload\` — высокоприоритетная загрузка ресурса, который нужен на текущей странице, но обнаруживается поздно: шрифт внутри CSS, hero-картинка, критичный чанк. Браузер качает его рано, но не выполняет; атрибут \`as\` обязателен, иначе будет двойная загрузка. \`prefetch\` — наоборот, низкий приоритет и ресурс для будущей навигации, кладётся в кэш до следующего перехода. \`preconnect\` не качает ничего, он заранее делает DNS, TCP и TLS к стороннему origin и экономит порядка 100–300 миллисекунд на хендшейке. \`dns-prefetch\` — его облегчённая версия, только резолв DNS, для менее важных доменов. Главное ограничение — этим нельзя злоупотреблять: больше четырёх-шести preconnect уже конкурируют за пропускную способность, а preload на всё подряд обесценивает приоритеты.

## Ловушки

- **\`preload\` без \`as\`** — браузер не знает приоритет и тип, скачивает ресурс дважды.
- **Шрифты требуют \`crossorigin\`** даже со своего домена, иначе preload не переиспользуется.
- **Больше 4–6 \`preconnect\`** конкурируют за канал и делают хуже; для остального — \`dns-prefetch\`.
- **\`preload\` не исполняет** скрипт и не применяет стиль: сам тег \`<script>\`/\`<link>\` всё равно нужен.
- **Неиспользованный preload** даёт предупреждение в консоли и просто тратит трафик пользователя.
- **\`prefetch\` на мобильном трафике** — спорная идея: вы платите за пользователя байтами, которые могут не понадобиться.
- Спросят следом: чем это отличается от \`fetchpriority\`, от \`103 Early Hints\` и от \`modulepreload\`.`,
      en: `## In short

All four are **hints telling the browser what to get ready**. Two of them fetch files (\`preload\` for this page, \`prefetch\` for the next one), two prepare a connection (\`preconnect\` fully, \`dns-prefetch\` just the address lookup).

Analogy: \`preload\` is taking out of the fridge what you definitely need today. \`prefetch\` is shopping ahead for tomorrow. \`preconnect\` is calling the supplier in advance and holding the line. \`dns-prefetch\` is merely looking their number up.

## The four hints — what each one does

1. **\`preload\`** — a high-priority fetch of a resource **needed on the current page** but discovered late: a font buried in CSS, the hero image, a critical module. The browser downloads it early but does **not execute** it. The \`as\` attribute is mandatory, otherwise the resource can be fetched twice.
2. **\`prefetch\`** — a low-priority fetch for a **future navigation**. It lands in the cache and is used later. Perfect for the chunk of a route the user will probably visit next.
3. **\`preconnect\`** — opens a connection to a **critical third-party origin** ahead of time: DNS + TCP + TLS. Saves **100–300 ms** of handshake.
4. **\`dns-prefetch\`** — DNS resolution only. A cheaper, more widely supported fallback to \`preconnect\` for less critical domains.

## Example

\`\`\`html
<head>
  <!-- warm up a critical third-party origin: DNS + TCP + TLS -->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="dns-prefetch" href="https://analytics.example.com" />

  <!-- the font is discovered late (it lives inside CSS) — fetch it now -->
  <link rel="preload" as="font" type="font/woff2" href="/inter.woff2" crossorigin />

  <!-- the likely next route's chunk, lazily -->
  <link rel="prefetch" href="/dashboard.chunk.js" />
</head>
\`\`\`

Why this works: fonts need \`crossorigin\` even on your own origin — they are always fetched in anonymous CORS mode, and without the attribute the preload will not match the real request, so the file downloads twice.

## What to say in the interview

> \`preload\` is a high-priority fetch for a resource the current page needs but discovers late: a font inside CSS, the hero image, a critical chunk. The browser downloads it early but does not execute it, and the \`as\` attribute is mandatory or you get a double download. \`prefetch\` is the opposite: low priority, for a future navigation, cached until the next page. \`preconnect\` fetches nothing — it performs DNS, TCP and TLS to a third-party origin up front and saves roughly 100 to 300 milliseconds of handshake. \`dns-prefetch\` is its lightweight version, DNS only, for less important domains. The key constraint is not to overuse them: more than four to six preconnects compete for bandwidth, and preloading everything just dilutes priorities.

## Gotchas

- **\`preload\` without \`as\`** — the browser cannot tell type or priority and fetches the resource twice.
- **Fonts require \`crossorigin\`** even from your own origin, otherwise the preload is never reused.
- **More than 4–6 \`preconnect\` hints** compete for bandwidth and make things worse; use \`dns-prefetch\` for the rest.
- **\`preload\` does not execute** a script or apply a stylesheet: you still need the actual \`<script>\`/\`<link>\`.
- **An unused preload** logs a console warning and simply wastes the user's data.
- **\`prefetch\` on mobile data** is debatable: you are spending someone else's bytes on something they may never need.
- Expect the follow-up: how this differs from \`fetchpriority\`, from \`103 Early Hints\`, and from \`modulepreload\`.`
    },
    codeSnippet: `<head>
  <!-- Warm up a critical third-party origin (DNS + TCP + TLS) -->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="dns-prefetch" href="https://analytics.example.com" />

  <!-- Fetch a late-discovered critical font early -->
  <link rel="preload" as="font" type="font/woff2" href="/inter.woff2" crossorigin />

  <!-- Lazily fetch the likely next route's chunk -->
  <link rel="prefetch" href="/dashboard.chunk.js" />
</head>`
  },
  {
    id: 'web-012',
    category: 'html-css-performance',
    level: 'Medium',
    tags: ['scripts', 'async', 'defer'],
    question: {
      ru: 'В чём разница между обычным <script>, async и defer? Как они влияют на парсинг HTML?',
      en: 'What is the difference between a plain <script>, async, and defer? How do they affect HTML parsing?'
    },
    answer: {
      ru: `## Коротко

Разница только в двух вещах: **блокирует ли скрипт парсинг HTML** и **когда он выполнится**. Обычный \`<script>\` тормозит парсер, \`async\` выполняется как только скачался, \`defer\` ждёт готового DOM и держит порядок.

Аналогия: конвейер сборки. Обычный скрипт — мастер, который остановил линию и чинит деталь при всех. \`async\` — мастер, который врывается на линию ровно тогда, когда приехал его ящик с инструментами. \`defer\` — мастера, которые ждут конца смены и заходят строго по очереди.

## Три режима — что каждый делает

- **Обычный \`<script>\`**: парсинг HTML **останавливается**, файл качается и **синхронно** выполняется, потом парсинг продолжается. Порядок сохраняется, но DOM строится с паузами — главный антипаттерн в \`<head>\`.
- **\`async\`**: качается **параллельно** с парсингом, выполняется **сразу после загрузки**, прерывая парсер в произвольный момент. **Порядок не гарантирован**: кто раньше скачался, тот раньше выполнился.
- **\`defer\`**: качается **параллельно**, но выполняется **после** полного построения DOM и **до** события \`DOMContentLoaded\`. **Порядок между defer-скриптами сохраняется**.

## Пример

\`\`\`html
<!-- аналитика: ни от кого не зависит, порядок неважен -->
<script async src="analytics.js"></script>

<!-- код приложения: нужен DOM и строгий порядок -->
<script defer src="vendor.js"></script>
<script defer src="app.js"></script>
\`\`\`

Почему так: \`app.js\` рассчитывает, что \`vendor.js\` уже выполнен. С \`async\` это лотерея — vendor может оказаться больше и приехать вторым. С \`defer\` порядок гарантирован спецификацией.

## Что сказать на собеседовании

> Обычный \`<script>\` останавливает парсинг HTML: браузер качает файл, синхронно его выполняет и только потом продолжает строить DOM. \`async\` качается параллельно с парсингом и выполняется сразу, как скачался, прерывая парсер в произвольный момент, поэтому порядок между несколькими async-скриптами не гарантирован. \`defer\` тоже качается параллельно, но выполняется после полного построения DOM и до события \`DOMContentLoaded\`, причём порядок тегов сохраняется. Отсюда правило: \`defer\` для кода приложения, которому нужен DOM и порядок, \`async\` для независимых сторонних скриптов вроде аналитики. Модули с \`type="module"\` ведут себя как defer по умолчанию. Блокирующий скрипт в \`<head>\` без причины оставлять нельзя.

## Ловушки

- **\`async\`/\`defer\` не работают на инлайновых скриптах** — только на внешних, с \`src\`.
- **\`type="module"\` = defer по умолчанию**; чтобы сделать модуль async, нужен явный \`async\`.
- **\`defer\` откладывает \`DOMContentLoaded\`**: событие ждёт выполнения всех defer-скриптов.
- **\`async\` может выполниться до готовности DOM** — обращение к элементам упадёт.
- **Скрипт перед \`</body>\` — не то же самое, что \`defer\`**: качаться он начнёт позже, потому что парсер дойдёт до него в конце (хотя preload scanner частично спасает).
- **Синхронный скрипт после \`<link rel="stylesheet">\`** дополнительно ждёт CSSOM.`,
      en: `## In short

Only two things differ: **whether the script blocks HTML parsing** and **when it executes**. A plain \`<script>\` stalls the parser, \`async\` runs the moment it lands, \`defer\` waits for a finished DOM and keeps the order.

Analogy: an assembly line. A plain script is the technician who halts the line and fixes a part in front of everyone. \`async\` is the technician who barges in exactly when their toolbox arrives. \`defer\` is the crew that waits for the end of the shift and walks in strictly in order.

## The three modes — what each does

- **Plain \`<script>\`**: HTML parsing **stops**, the file is downloaded and executed **synchronously**, then parsing resumes. Order is preserved, but the DOM is built with pauses — the main anti-pattern in \`<head>\`.
- **\`async\`**: downloads **in parallel** with parsing, executes **as soon as it loads**, interrupting the parser at an arbitrary point. **Order is not guaranteed**: whoever downloads first runs first.
- **\`defer\`**: downloads **in parallel** but executes **after** the DOM is fully built and **before** \`DOMContentLoaded\`. **Order between defer scripts is preserved.**

## Example

\`\`\`html
<!-- analytics: depends on nothing, order irrelevant -->
<script async src="analytics.js"></script>

<!-- app code: needs the DOM and a strict order -->
<script defer src="vendor.js"></script>
<script defer src="app.js"></script>
\`\`\`

Why this works: \`app.js\` assumes \`vendor.js\` has already run. With \`async\` that is a lottery — vendor is usually bigger and may arrive second. With \`defer\` the order is guaranteed by the spec.

## What to say in the interview

> A plain \`<script>\` halts HTML parsing: the browser downloads the file, executes it synchronously, and only then continues building the DOM. \`async\` downloads in parallel with parsing and runs as soon as it lands, interrupting the parser at an arbitrary point, so the order between multiple async scripts is not guaranteed. \`defer\` also downloads in parallel but runs after the DOM is fully built and before \`DOMContentLoaded\`, preserving tag order. Hence the rule: \`defer\` for application code that needs the DOM and ordering, \`async\` for independent third-party scripts like analytics. Modules with \`type="module"\` behave like defer by default. And you should never leave a blocking script in \`<head>\` without a reason.

## Gotchas

- **\`async\`/\`defer\` do nothing on inline scripts** — only on external ones with \`src\`.
- **\`type="module"\` is defer by default**; making a module async requires an explicit \`async\`.
- **\`defer\` delays \`DOMContentLoaded\`**: the event waits for all defer scripts to run.
- **\`async\` can run before the DOM is ready** — touching elements will throw.
- **A script before \`</body>\` is not the same as \`defer\`**: it starts downloading later, because the parser only reaches it at the end (the preload scanner mitigates this only partly).
- **A synchronous script after a \`<link rel="stylesheet">\`** additionally waits for the CSSOM.`
    }
  },
  {
    id: 'web-013',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['render-blocking', 'critical-css', 'optimization'],
    question: {
      ru: 'Что значит «render-blocking CSS/JS»? Как уменьшить блокировку рендеринга?',
      en: 'What does "render-blocking CSS/JS" mean? How do you reduce render blocking?'
    },
    answer: {
      ru: `## Коротко

Render-blocking — это ресурсы, без обработки которых браузер **не покажет ни одного пикселя**. Классика: \`<link rel="stylesheet">\` в \`<head>\` и синхронный \`<script>\`.

Аналогия: дверь в комнату держат закрытой, пока не высохнет краска. Пока CSS не скачан и не разобран, браузер боится показать «вспышку нестилизованного контента» и держит экран пустым.

## Как это работает по шагам

1. Парсер встречает \`<link rel="stylesheet">\` — HTML продолжает разбираться, но **render tree не строится**, пока стиль не скачан и не распарсен. Экран остаётся белым.
2. Парсер встречает синхронный \`<script>\` — **останавливается вообще**: качает и выполняет файл.
3. Если этот скрипт стоит **после ещё не загруженного CSS**, он дополнительно ждёт CSSOM: браузер обязан дать скрипту актуальные вычисленные стили.
4. Итог: время до первого кадра = время самого медленного render-blocking ресурса в цепочке.
5. Значит, задача — сократить и число, и вес того, что стоит на этом пути.

## Что делать по порядку

1. **Критический CSS инлайнить** в \`<head>\`, остальное грузить асинхронно (пример ниже).
2. **Разделять CSS по media**: \`media="(min-width: 1024px)"\` делает файл неблокирующим на узких экранах.
3. **\`defer\`/\`async\`** для скриптов — убирает блокировку парсера.
4. **Tree-shaking и удаление неиспользуемого CSS** (PurgeCSS) — меньше байтов на критическом пути.
5. **Избегать \`@import\` внутри CSS** — он создаёт цепочку последовательных запросов: браузер узнаёт об импорте только после загрузки родительского файла.

## Пример

\`\`\`html
<style>/* критический CSS первого экрана */</style>
<link
  rel="stylesheet"
  href="rest.css"
  media="print"
  onload="this.media='all'"
/>
\`\`\`

Почему так: с \`media="print"\` браузер считает файл ненужным для экрана и не блокирует им рендер, но всё равно качает в фоне. По \`onload\` мы переключаем \`media\` на \`all\`, и стили применяются.

## Что сказать на собеседовании

> Render-blocking — это ресурсы, до обработки которых браузер не рисует ни одного пикселя. CSS блокирует построение render tree: любой \`<link rel="stylesheet">\` в \`<head>\` держит экран пустым, пока не загрузится и не распарсится, чтобы не показать вспышку нестилизованного контента. Синхронный \`<script>\` блокирует сам парсер, а если он стоит после незагруженного CSS, то ещё и ждёт CSSOM, потому что может читать вычисленные стили. Уменьшаю блокировку так: инлайню критический CSS первого экрана, остальное подключаю неблокирующе через трюк с \`media="print"\` и \`onload\`, разделяю стили по media-запросам, вешаю на скрипты \`defer\`, выкидываю неиспользуемый CSS и не использую \`@import\`. Проверяю в Lighthouse по пункту про render-blocking resources и во вкладке Coverage в DevTools.

## Ловушки

- **\`@import\` — тихий убийца**: последовательные запросы вместо параллельных, плюс блокировка рендера.
- **Инлайнить весь CSS вредно**: HTML раздувается, не кэшируется отдельно, TTFB и объём растут. Инлайн — только первый экран.
- **\`media="print"\` трюк требует \`<noscript>\`-фолбэка**, иначе при отключённом JS стили не применятся.
- **Шрифты тоже задерживают текст**, хотя формально render-blocking не считаются — смотрите \`font-display\`.
- **Lighthouse считает render-blocking только для начальной навигации**, в SPA после гидрации это уже не видно.
- Спросят следом: что показывает вкладка Coverage и чем измеряется экономия (миллисекунды в Lighthouse, waterfall в WebPageTest).`,
      en: `## In short

Render-blocking resources are the ones the browser must process before it will paint **a single pixel**. The classics: a \`<link rel="stylesheet">\` in \`<head>\` and a synchronous \`<script>\`.

Analogy: a door held shut until the paint dries. Until the CSS is downloaded and parsed, the browser refuses to show a "flash of unstyled content" and keeps the screen blank.

## How it works, step by step

1. The parser hits a \`<link rel="stylesheet">\` — HTML parsing continues, but the **render tree is not built** until that sheet is downloaded and parsed. The screen stays white.
2. The parser hits a synchronous \`<script>\` — it **stops entirely**: download, then execute.
3. If that script sits **after CSS that has not loaded yet**, it additionally waits for the CSSOM: the browser must hand it up-to-date computed styles.
4. Net result: time to first frame = the slowest render-blocking resource in the chain.
5. So the job is to cut both the count and the weight of whatever stands in that path.

## What to do, in order

1. **Inline the critical CSS** in \`<head>\` and load the rest asynchronously (example below).
2. **Split CSS by media**: \`media="(min-width: 1024px)"\` makes a sheet non-blocking on narrow screens.
3. **\`defer\`/\`async\`** on scripts removes the parser block.
4. **Tree-shaking and removing unused CSS** (PurgeCSS) — fewer bytes on the critical path.
5. **Avoid \`@import\` inside CSS** — it creates a chain of sequential requests: the browser only learns about the import after the parent file arrives.

## Example

\`\`\`html
<style>/* critical above-the-fold CSS */</style>
<link
  rel="stylesheet"
  href="rest.css"
  media="print"
  onload="this.media='all'"
/>
\`\`\`

Why this works: with \`media="print"\` the browser considers the sheet irrelevant to the screen and does not block rendering on it, yet still fetches it in the background. On \`onload\` we flip \`media\` to \`all\` and the styles apply.

## What to say in the interview

> Render-blocking resources are the ones the browser must process before painting anything. CSS blocks render-tree construction: any \`<link rel="stylesheet">\` in \`<head>\` keeps the screen empty until it loads and parses, so the user never sees a flash of unstyled content. A synchronous \`<script>\` blocks the parser itself, and if it comes after unloaded CSS it also waits for the CSSOM, because it may read computed styles. I reduce blocking by inlining the above-the-fold CSS, loading the rest non-blocking with the \`media="print"\` plus \`onload\` trick, splitting stylesheets by media query, marking scripts \`defer\`, stripping unused CSS, and never using \`@import\`. I verify it in the Lighthouse render-blocking-resources audit and in the DevTools Coverage tab.

## Gotchas

- **\`@import\` is a silent killer**: sequential requests instead of parallel ones, on top of blocking rendering.
- **Inlining all your CSS backfires**: the HTML bloats, cannot be cached separately, and TTFB grows. Inline the first screen only.
- **The \`media="print"\` trick needs a \`<noscript>\` fallback**, otherwise styles never apply with JS disabled.
- **Fonts also delay text** even though they are not formally render-blocking — see \`font-display\`.
- **Lighthouse only reports render-blocking for the initial navigation**; in an SPA after hydration you will not see it.
- Expect the follow-up: what the Coverage tab shows and how savings are measured (milliseconds in Lighthouse, the waterfall in WebPageTest).`
    }
  },
  {
    id: 'web-014',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['fonts', 'font-display', 'foit-fout'],
    question: {
      ru: 'Объясните FOIT и FOUT. Как font-display и preload помогают управлять загрузкой шрифтов?',
      en: 'Explain FOIT and FOUT. How do font-display and preload help control font loading?'
    },
    answer: {
      ru: `## Коротко

Пока кастомный шрифт качается, браузер должен что-то решить с текстом. Спрятать его — это **FOIT** (текст невидим). Показать системным и потом подменить — это **FOUT** (текст «прыгает»). Управляет выбором свойство \`font-display\`.

Аналогия: гости уже пришли, а фирменные тарелки ещё в пути. FOIT — держать всех голодными до их приезда. FOUT — накормить на обычных тарелках и потом переложить.

## Как это работает по шагам

1. Браузер встречает текст, которому назначен ещё не загруженный \`@font-face\`, и запускает **block period** — короткий отрезок, в течение которого текст невидим.
2. Дальше идёт **swap period** — текст рисуется fallback-шрифтом и будет подменён, если кастомный приедет вовремя.
3. Длину этих периодов задаёт \`font-display\`: \`auto\` — на усмотрение браузера (обычно FOIT); \`block\` — короткая невидимость, потом подмена; \`swap\` — сразу fallback, потом подмена (FOUT), хорошо для FCP, но даёт CLS; \`fallback\` — компромисс: очень короткий block и ограниченный swap; \`optional\` — браузер вправе вообще не применять медленный шрифт, **лучший вариант для CLS**.
4. Подмена шрифта меняет метрики текста (высоту строки, ширину глифов) — соседние блоки съезжают, это и есть вклад шрифтов в CLS.
5. Лечится подгонкой fallback под метрики финального шрифта: \`size-adjust\`, \`ascent-override\`, \`descent-override\`.

## Пример

\`\`\`css
@font-face {
  font-family: 'Inter';
  src: url('inter.woff2') format('woff2');
  font-display: swap;
}

@font-face {
  font-family: 'InterFallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 90%;
}
\`\`\`

Почему так: \`swap\` даёт читаемый текст сразу, а подогнанный fallback делает подмену почти незаметной — размеры строк совпадают, сдвига нет. Ключевой шрифт при этом стоит \`preload\`-ить: \`<link rel="preload" as="font" crossorigin>\`.

## Что ещё уменьшает цену шрифтов

- **WOFF2** — лучшее сжатие из поддерживаемых форматов.
- **Subsetting** — оставить только нужные глифы (например, latin + cyrillic), файл падает в разы.
- **Self-hosting** вместо стороннего CDN убирает лишний \`preconnect\` и один сетевой хоп.

## Что сказать на собеседовании

> Пока кастомный шрифт грузится, браузер либо прячет текст — это FOIT, flash of invisible text, — либо рисует его системным шрифтом и потом подменяет, это FOUT. Управляется через \`font-display\` в \`@font-face\`: \`block\` даёт короткий FOIT, \`swap\` сразу показывает fallback и потом меняет, что хорошо для FCP, но добавляет CLS, \`fallback\` — компромисс с очень коротким блоком, а \`optional\` разрешает браузеру вообще не применять медленный шрифт и лучше всех для CLS. Моя рабочая стратегия: \`preload\` ключевого шрифта с \`crossorigin\`, \`font-display: swap\`, WOFF2 с сабсеттингом только нужных глифов и self-hosting. И обязательно подгоняю метрики fallback через \`size-adjust\` и \`ascent-override\`, тогда подмена почти не двигает layout.

## Ловушки

- **\`preload\` шрифта без \`crossorigin\`** — файл скачается дважды: шрифты всегда идут в анонимном CORS-режиме.
- **\`font-display: swap\` улучшает FCP, но ухудшает CLS**, если метрики fallback далеки от финальных.
- **\`optional\` может вообще не показать ваш шрифт** первому посетителю — сознательный размен ради стабильности.
- **Preload всех начертаний** (bold, italic, light) съедает канал — тяните только то, что реально на первом экране.
- **Шрифты из стороннего CDN** — это лишние DNS + TLS; либо \`preconnect\`, либо self-host.
- Спросят следом: как это связано с LCP (если LCP-элемент — текст, FOIT прямо откладывает LCP).`,
      en: `## In short

While a custom font downloads, the browser has to decide what to do with the text. Hide it — that is **FOIT** (invisible text). Show it in a system font and swap later — that is **FOUT** (the text jumps). The \`font-display\` property decides which.

Analogy: the guests have arrived but the branded plates are still in transit. FOIT is keeping everyone hungry until they land. FOUT is feeding them on ordinary plates and re-plating later.

## How it works, step by step

1. The browser encounters text styled with an \`@font-face\` that has not loaded yet and starts the **block period** — a short window in which the text is invisible.
2. Then comes the **swap period** — the text is painted with the fallback font and will be replaced if the custom font arrives in time.
3. \`font-display\` sets the length of those periods: \`auto\` — browser's choice (usually FOIT); \`block\` — brief invisibility, then swap; \`swap\` — fallback immediately, then swap (FOUT), great for FCP but costs CLS; \`fallback\` — a compromise with a very short block and a limited swap window; \`optional\` — the browser may skip a slow font entirely, **the best option for CLS**.
4. Swapping fonts changes text metrics (line height, glyph widths), so neighbouring blocks move — that is how fonts contribute to CLS.
5. The fix is matching the fallback to the final font's metrics: \`size-adjust\`, \`ascent-override\`, \`descent-override\`.

## Example

\`\`\`css
@font-face {
  font-family: 'Inter';
  src: url('inter.woff2') format('woff2');
  font-display: swap;
}

@font-face {
  font-family: 'InterFallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 90%;
}
\`\`\`

Why this works: \`swap\` gives readable text immediately, and the tuned fallback makes the swap almost invisible — the line boxes match, so nothing shifts. The key font should also be preloaded: \`<link rel="preload" as="font" crossorigin>\`.

## What else lowers the cost of fonts

- **WOFF2** — the best compression among supported formats.
- **Subsetting** — keep only the glyphs you need (latin + cyrillic, say); the file often shrinks several times over.
- **Self-hosting** instead of a third-party CDN removes an extra \`preconnect\` and one network hop.

## What to say in the interview

> While a custom font loads, the browser either hides the text — that is FOIT, flash of invisible text — or paints it in a system font and swaps later, which is FOUT. It is controlled by \`font-display\` in \`@font-face\`: \`block\` gives a short FOIT, \`swap\` shows the fallback immediately and then swaps, which helps FCP but adds CLS, \`fallback\` is a compromise with a very short block period, and \`optional\` lets the browser skip a slow font entirely, which is best for CLS. My working strategy is: preload the key font with \`crossorigin\`, \`font-display: swap\`, WOFF2 subsetted to the glyphs I actually use, and self-hosting. And I always tune the fallback metrics with \`size-adjust\` and \`ascent-override\`, so the swap barely moves the layout.

## Gotchas

- **Preloading a font without \`crossorigin\`** downloads it twice: fonts always use anonymous CORS mode.
- **\`font-display: swap\` improves FCP but worsens CLS** when the fallback metrics are far from the final font.
- **\`optional\` may never show your font** to a first-time visitor — a deliberate trade for stability.
- **Preloading every weight** (bold, italic, light) saturates the connection — fetch only what the first screen uses.
- **Fonts on a third-party CDN** mean extra DNS + TLS; either \`preconnect\` or self-host.
- Expect the follow-up: how this ties into LCP (if the LCP element is text, FOIT delays LCP directly).`
    }
  },
  {
    id: 'web-015',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['images', 'srcset', 'responsive-images'],
    question: {
      ru: 'Как работают srcset и sizes для адаптивных изображений? В чём разница между дескрипторами w и x?',
      en: 'How do srcset and sizes work for responsive images? What is the difference between the w and x descriptors?'
    },
    answer: {
      ru: `## Коротко

\`srcset\` — это **список вариантов одной картинки**, из которых браузер сам выбирает подходящий. \`sizes\` — подсказка, **какой ширины будет место** под картинку в вёрстке. Смысл: не слать мегабайты на телефон.

Аналогия: чемодан на регистрации. Вы не тащите весь гардероб — берёте комплект под конкретную поездку. \`sizes\` говорит, на сколько дней едем, \`srcset\` — какие комплекты вообще есть.

## Как это работает по шагам

1. **Дескриптор \`x\` (плотность)** — для картинки фиксированного отображаемого размера, вроде логотипа: \`srcset="logo.png 1x, logo@2x.png 2x, logo@3x.png 3x"\`. Браузер смотрит только на DPR экрана.
2. **Дескриптор \`w\` (ширина файла)** — для картинок, тянущихся по вёрстке. Вы объявляете реальные ширины файлов в пикселях, а \`sizes\` описывает ширину слота при разных условиях.
3. Браузер берёт первое подходящее условие из \`sizes\` и получает **ширину слота в px**.
4. Умножает её на **DPR устройства** — получает нужное разрешение.
5. Выбирает **наименьшего кандидата из \`srcset\`, чья \`w\` ≥ этого значения**. Выбор делается **до загрузки CSS**, поэтому \`sizes\` обязан описать layout явно.

## Пример

\`\`\`html
<img
  srcset="img-400.jpg 400w, img-800.jpg 800w, img-1200.jpg 1200w"
  sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 800px"
  src="img-800.jpg"
  alt="Photo"
  width="800"
  height="600"
/>
\`\`\`

Почему так: на телефоне шириной 400 CSS-px с DPR 2 браузеру нужно 800 физических пикселей — он возьмёт \`img-800.jpg\`, а не полуторамегабайтный \`img-1200.jpg\`. Атрибут \`src\` остаётся фолбэком для старых браузеров, а \`width\`/\`height\` резервируют место и спасают CLS.

## Что сказать на собеседовании

> \`srcset\` перечисляет варианты одного изображения, а \`sizes\` говорит браузеру, какой ширины будет слот под картинку в вёрстке. Дескриптор \`x\` используется для фиксированного размера и разных плотностей экрана — типичный случай логотип. Дескриптор \`w\` указывает реальную ширину файла в пикселях и работает в паре с \`sizes\`. Алгоритм выбора такой: браузер вычисляет ширину слота из \`sizes\`, умножает её на DPR устройства и берёт наименьшего кандидата, чья \`w\` не меньше результата. Важно, что выбор происходит до применения CSS, поэтому \`sizes\` обязан описывать раскладку явно, а без него браузер считает, что слот занимает \`100vw\`. Если нужны разные кропы под разные экраны, это уже арт-дирекшен — там \`<picture>\` с \`<source media>\`. И всегда ставлю \`width\`/\`height\` ради CLS.

## Ловушки

- **Забыли \`sizes\` при \`w\`-дескрипторах** — браузер считает \`100vw\` и качает самый большой файл.
- **\`sizes\` врёт про layout** — самая частая ошибка: вёрстку поменяли, \`sizes\` забыли.
- **\`srcset\` — это не арт-дирекшен**: для разных кропов и пропорций нужен \`<picture>\` с \`<source media>\`.
- **Браузер имеет право взять файл больше нужного** (например, если он уже в кэше) — и меньше, если включён Data Saver.
- **Смешивать \`w\` и \`x\` в одном \`srcset\` нельзя** — дескрипторы должны быть одного типа.
- **Без \`width\`/\`height\` или \`aspect-ratio\`** любая адаптивная картинка портит CLS.`,
      en: `## In short

\`srcset\` is a **menu of variants of the same image** that the browser picks from. \`sizes\` is a hint about **how wide the slot for that image will be** in your layout. The point: stop shipping megabytes to a phone.

Analogy: packing for a flight. You do not take the whole wardrobe — you take an outfit sized to the trip. \`sizes\` says how long the trip is; \`srcset\` lists which outfits exist.

## How it works, step by step

1. **The \`x\` (density) descriptor** — for images rendered at a fixed size, like a logo: \`srcset="logo.png 1x, logo@2x.png 2x, logo@3x.png 3x"\`. The browser only looks at the screen's DPR.
2. **The \`w\` (file width) descriptor** — for images that stretch with the layout. You declare each file's real pixel width, and \`sizes\` describes the slot width under different conditions.
3. The browser evaluates the first matching condition in \`sizes\` and gets the **slot width in px**.
4. It multiplies that by the **device DPR** to get the resolution actually needed.
5. It picks the **smallest \`srcset\` candidate whose \`w\` ≥ that value**. The decision is made **before CSS loads**, so \`sizes\` must describe the layout explicitly.

## Example

\`\`\`html
<img
  srcset="img-400.jpg 400w, img-800.jpg 800w, img-1200.jpg 1200w"
  sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 800px"
  src="img-800.jpg"
  alt="Photo"
  width="800"
  height="600"
/>
\`\`\`

Why this works: on a 400 CSS-px phone with DPR 2 the browser needs 800 physical pixels, so it fetches \`img-800.jpg\` instead of the much heavier \`img-1200.jpg\`. \`src\` remains the fallback for old browsers, and \`width\`/\`height\` reserve the box and save your CLS.

## What to say in the interview

> \`srcset\` lists variants of one image, and \`sizes\` tells the browser how wide the slot for that image will be in the layout. The \`x\` descriptor is for a fixed rendered size across different screen densities — a logo is the typical case. The \`w\` descriptor states the file's real pixel width and works together with \`sizes\`. The selection algorithm is: the browser computes the slot width from \`sizes\`, multiplies it by the device DPR, and takes the smallest candidate whose \`w\` is at least that. Crucially the decision happens before CSS is applied, so \`sizes\` must describe the layout explicitly; without it the browser assumes the slot is \`100vw\`. If different screens need different crops, that is art direction, and then you need \`<picture>\` with \`<source media>\`. And I always set \`width\`/\`height\` for CLS.

## Gotchas

- **Omitting \`sizes\` with \`w\` descriptors** makes the browser assume \`100vw\` and fetch the largest file.
- **\`sizes\` lying about the layout** is the most common bug: the CSS changed, \`sizes\` did not.
- **\`srcset\` is not art direction**: different crops or aspect ratios need \`<picture>\` with \`<source media>\`.
- **The browser may pick a larger file than needed** (if it is already cached) — or a smaller one when Data Saver is on.
- **You cannot mix \`w\` and \`x\` in one \`srcset\`** — the descriptors must be of a single type.
- **Without \`width\`/\`height\` or \`aspect-ratio\`** any responsive image damages CLS.`
    }
  },
  {
    id: 'web-016',
    category: 'html-css-performance',
    level: 'Medium',
    tags: ['images', 'lazy-loading', 'fetchpriority'],
    question: {
      ru: 'Как работают нативный lazy loading изображений и атрибут fetchpriority? Как избежать ошибок?',
      en: 'How do native image lazy loading and the fetchpriority attribute work? How do you avoid mistakes?'
    },
    answer: {
      ru: `## Коротко

\`loading="lazy"\` говорит браузеру: **не качай эту картинку, пока пользователь до неё не доскроллит**. \`fetchpriority\` — про другое: не «когда качать», а **насколько срочно** это делать относительно других ресурсов.

Аналогия: чемодан. Lazy loading — распаковывать только тот отсек, который сейчас нужен. \`fetchpriority\` — сказать носильщику, какую сумку нести первой.

## Как это работает по шагам

1. Браузер видит \`loading="lazy"\` и откладывает запрос, пока картинка не **приблизится к viewport**. Порог расстояния определяет сам браузер и зависит от скорости сети — на медленной он больше, чтобы успеть.
2. \`loading="eager"\` (значение по умолчанию) означает «качай сразу, как нашёл в разметке».
3. Отдельно от этого браузер выставляет каждому ресурсу **приоритет в очереди загрузки**. Изображения по умолчанию получают средне-низкий приоритет — ниже CSS и скриптов.
4. \`fetchpriority="high"\` поднимает картинку выше менее важных ресурсов, ускоряя доставку **без отдельного \`preload\`**. \`low\` — наоборот, задвигает в конец.
5. Комбинируются они осмысленно: hero сверху — \`eager\` + \`high\`; декоративная картинка внизу — \`lazy\` + \`low\`.

## Пример

\`\`\`html
<!-- LCP-картинка: грузим как можно раньше -->
<img src="hero.avif" fetchpriority="high" width="1200" height="600" alt="Hero"
     decoding="async" />

<!-- ниже первого экрана: откладываем и понижаем приоритет -->
<img src="aside.jpg" fetchpriority="low" loading="lazy"
     width="600" height="400" alt="" />
\`\`\`

Почему так: hero — почти всегда LCP-элемент, и его нельзя ни откладывать, ни держать в общей очереди. У нижней картинки нет срочности вообще. \`decoding="async"\` дополнительно снимает декодирование с main thread.

## Что сказать на собеседовании

> \`loading="lazy"\` откладывает загрузку картинки или iframe до момента, когда она приближается к вьюпорту; расстояние выбирает сам браузер и оно зависит от скорости сети. \`fetchpriority\` — это подсказка приоритета: \`high\`, \`low\` или \`auto\`. Изображения по умолчанию имеют средне-низкий приоритет, поэтому \`fetchpriority="high"\` позволяет ускорить hero-картинку без отдельного preload. Главная ошибка — вешать \`loading="lazy"\` на LCP-изображение выше сгиба: это прямо откладывает его загрузку и портит LCP, там нужен \`eager\` плюс \`fetchpriority="high"\`. Для картинок ниже первого экрана — наоборот, \`lazy\` и при желании \`low\`. И всегда ставлю \`width\` с \`height\` ради CLS и \`decoding="async"\`, чтобы декодирование не блокировало main thread.

## Ловушки

- **\`loading="lazy"\` на hero** — самый частый регресс LCP, встречается почти в каждом аудите.
- **Lazy без \`width\`/\`height\`** — двойной удар: и LCP хуже, и CLS прыгает.
- **Lazy на всё подряд** тоже вредит: картинки чуть ниже сгиба грузятся уже во время скролла и видны пустыми.
- **\`fetchpriority\` — подсказка, а не приказ**: браузер вправе её проигнорировать.
- **\`high\` на нескольких картинках** обесценивает приоритет — high должно быть одно.
- **Lazy-loading через JS и IntersectionObserver** всё ещё нужен для фоновых картинок в CSS: нативный атрибут на них не действует.`,
      en: `## In short

\`loading="lazy"\` tells the browser: **do not fetch this image until the user scrolls near it**. \`fetchpriority\` answers a different question — not *when* to fetch, but **how urgently** compared with everything else.

Analogy: a suitcase. Lazy loading is unpacking only the compartment you need right now. \`fetchpriority\` is telling the porter which bag to carry first.

## How it works, step by step

1. The browser sees \`loading="lazy"\` and defers the request until the image **approaches the viewport**. The distance threshold is browser-defined and depends on connection speed — larger on a slow network so it still arrives in time.
2. \`loading="eager"\` (the default) means "fetch as soon as you find it in the markup".
3. Independently of that, the browser assigns every resource a **priority in the load queue**. Images default to medium-low — below CSS and scripts.
4. \`fetchpriority="high"\` lifts an image above less important resources, speeding up delivery **without a separate \`preload\`**. \`low\` pushes it to the back.
5. The two combine sensibly: a hero at the top gets \`eager\` + \`high\`; a decorative image far down gets \`lazy\` + \`low\`.

## Example

\`\`\`html
<!-- LCP image: fetch it as early as possible -->
<img src="hero.avif" fetchpriority="high" width="1200" height="600" alt="Hero"
     decoding="async" />

<!-- below the fold: defer it and lower the priority -->
<img src="aside.jpg" fetchpriority="low" loading="lazy"
     width="600" height="400" alt="" />
\`\`\`

Why this works: the hero is almost always the LCP element, so it must be neither deferred nor left in the generic queue. The lower image has no urgency at all. \`decoding="async"\` additionally moves decoding off the main thread.

## What to say in the interview

> \`loading="lazy"\` defers an image or iframe until it approaches the viewport; the browser chooses the distance and it scales with connection speed. \`fetchpriority\` is a priority hint — \`high\`, \`low\` or \`auto\`. Images default to a medium-low priority, so \`fetchpriority="high"\` can speed up the hero image without a separate preload. The classic mistake is putting \`loading="lazy"\` on the LCP image above the fold: it directly delays the fetch and wrecks LCP, where you want \`eager\` plus \`fetchpriority="high"\` instead. Below-the-fold images get the opposite treatment, \`lazy\` and optionally \`low\`. And I always set \`width\` and \`height\` for CLS, plus \`decoding="async"\` so decoding does not block the main thread.

## Gotchas

- **\`loading="lazy"\` on the hero** is the single most common LCP regression in audits.
- **Lazy without \`width\`/\`height\`** is a double hit: worse LCP *and* jumping CLS.
- **Lazy-loading everything hurts too**: images just below the fold then load during the scroll and appear blank.
- **\`fetchpriority\` is a hint, not an order**: the browser may ignore it.
- **\`high\` on several images** dilutes the signal — there should be exactly one.
- **JS lazy-loading with IntersectionObserver is still needed** for CSS background images: the native attribute does not apply to them.`
    }
  },
  {
    id: 'web-017',
    category: 'html-css-performance',
    level: 'Medium',
    tags: ['images', 'webp', 'avif', 'formats'],
    question: {
      ru: 'Какие современные форматы изображений вы используете и почему? Как обеспечить fallback?',
      en: 'Which modern image formats do you use and why? How do you provide a fallback?'
    },
    answer: {
      ru: `## Коротко

Смена формата — обычно **самая дешёвая экономия байтов** на сайте: тот же снимок в AVIF весит вдвое меньше JPEG без видимой разницы. Fallback делается через \`<picture>\`: браузер сам берёт первый формат, который умеет.

Аналогия: одна и та же книга в твёрдом переплёте, в мягком и в электронке. Содержание не меняется — меняется вес в сумке.

## Форматы — что каждый значит

- **WebP** — на **25–35% меньше JPEG** при том же качестве, умеет прозрачность и анимацию. Поддержка около **96%** браузеров.
- **AVIF** — на базе кодека AV1, сжимает ещё сильнее (**на 50% меньше JPEG**), отличный HDR и широкий цветовой охват. Кодируется медленнее, поддержка около **93%**.
- **JPEG XL** — перспективный, но поддержка пока ограничена.
- **SVG** — для иконок, логотипов и иллюстраций: вектор, масштабируется без потерь.
- **PNG** — только там, где реально нужна точная безпотерьная растровая графика.

## Пример

\`\`\`html
<picture>
  <source srcset="photo.avif" type="image/avif" />
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="Photo" width="800" height="600" loading="lazy" />
</picture>
\`\`\`

Почему так: браузер идёт по \`<source>\` сверху вниз и берёт **первый, который умеет декодировать**, поэтому порядок «от лучшего сжатия к худшему» обязателен. \`<img>\` внизу — и фолбэк, и носитель \`alt\`, \`width\`/\`height\`, \`loading\`.

## Что сказать на собеседовании

> Я использую AVIF и WebP вместо JPEG и PNG. WebP примерно на 25–35 процентов легче JPEG при том же качестве, поддержка около 96 процентов браузеров. AVIF основан на кодеке AV1 и даёт примерно вдвое меньший вес относительно JPEG, плюс HDR и широкий цветовой охват, поддержка около 93 процентов, но кодируется медленнее — это проблема сборки, а не рантайма. Для иконок и логотипов — SVG, PNG оставляю только для по-настоящему безпотерьной графики. Fallback делаю через \`<picture>\`: браузер берёт первый \`<source>\`, который умеет декодировать, поэтому порядок от AVIF к WebP и потом обычный \`<img>\`. На практике это часто отдаёт CDN автоматически по заголовку \`Accept\`. И форматы спокойно комбинируются с \`srcset\` и \`sizes\`.

## Ловушки

- **Порядок \`<source>\` важен**: браузер не сравнивает варианты, он берёт первый декодируемый.
- **\`<picture>\` без \`<img>\` внутри ничего не покажет** — именно \`<img>\` рисует картинку и хранит \`alt\`.
- **AVIF долго кодируется**: делайте это на сборке или отдайте CDN, не в рантайме.
- **AVIF на мелких иконках** может оказаться тяжелее PNG или SVG — проверяйте на реальных файлах.
- **Формат не отменяет размер**: AVIF на 4000 px в слоте 400 px всё равно расточительство, нужен \`srcset\`.
- **Не забывайте про качество**: AVIF q=50 визуально сопоставим с JPEG q=75, слепое «максимальное качество» съедает всю выгоду.`,
      en: `## In short

Switching format is usually the **cheapest byte saving** on a site: the same photo in AVIF weighs half of the JPEG with no visible difference. The fallback is \`<picture>\`: the browser takes the first format it can decode.

Analogy: the same book in hardback, paperback and as an e-book. The content is identical — only the weight in your bag changes.

## The formats — what each one means

- **WebP** — **25–35% smaller than JPEG** at the same quality, supports transparency and animation. Around **96%** browser support.
- **AVIF** — built on the AV1 codec, compresses even harder (**50% smaller than JPEG**), with excellent HDR and a wide colour gamut. Slower to encode; around **93%** support.
- **JPEG XL** — promising, but support is still limited.
- **SVG** — for icons, logos and illustrations: vector, scales losslessly.
- **PNG** — only where you genuinely need exact lossless raster graphics.

## Example

\`\`\`html
<picture>
  <source srcset="photo.avif" type="image/avif" />
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="Photo" width="800" height="600" loading="lazy" />
</picture>
\`\`\`

Why this works: the browser walks the \`<source>\` list top to bottom and takes the **first one it can decode**, so ordering from best compression to worst is mandatory. The trailing \`<img>\` is both the fallback and the carrier of \`alt\`, \`width\`/\`height\` and \`loading\`.

## What to say in the interview

> I use AVIF and WebP instead of JPEG and PNG. WebP is roughly 25 to 35 percent lighter than JPEG at equal quality, with about 96 percent browser support. AVIF is built on the AV1 codec and gives roughly half the weight of JPEG, plus HDR and a wide colour gamut; support is around 93 percent, and it encodes slowly — which is a build-time concern, not a runtime one. For icons and logos I use SVG, and I keep PNG only for truly lossless graphics. The fallback is \`<picture>\`: the browser takes the first \`<source>\` it can decode, so the order runs AVIF, then WebP, then a plain \`<img>\`. In practice a CDN often does this automatically based on the \`Accept\` header. And formats combine happily with \`srcset\` and \`sizes\`.

## Gotchas

- **\`<source>\` order matters**: the browser does not compare options, it takes the first decodable one.
- **A \`<picture>\` with no \`<img>\` inside renders nothing** — the \`<img>\` is what paints and carries \`alt\`.
- **AVIF is slow to encode**: do it at build time or let a CDN handle it, never at runtime.
- **AVIF on tiny icons** can end up heavier than PNG or SVG — check against the real files.
- **Format does not replace sizing**: a 4000 px AVIF in a 400 px slot is still waste; you need \`srcset\`.
- **Do not forget quality settings**: AVIF at q=50 looks comparable to JPEG at q=75, and blindly cranking quality erases the whole gain.`
    }
  },
  {
    id: 'web-018',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['css-grid', 'flexbox', 'layout'],
    question: {
      ru: 'Когда выбирать CSS Grid, а когда Flexbox? Объясните на примере intrinsic sizing.',
      en: 'When do you choose CSS Grid versus Flexbox? Explain with intrinsic sizing in mind.'
    },
    answer: {
      ru: `## Коротко

Разница в **измерности**. Flexbox — одномерный: раскладывает элементы в ряд **или** в столбец, и размер диктует контент. Grid — двумерный: строки **и** столбцы сразу, и структуру диктует контейнер.

Аналогия: Flexbox — полка, на которую вы ставите книги подряд, и они сами распределяют место. Grid — шкаф с заранее размеченными ячейками: вы решили, где что стоит, ещё до того, как принесли вещи.

## Как это работает по шагам

1. **Flexbox — content-out**: сначала берутся собственные размеры элементов, потом свободное место распределяется по \`flex-grow\`/\`flex-shrink\`. Идеален для компонентов: тулбары, навигация, карточки в строку.
2. **Grid — layout-in**: сначала объявляется сетка (\`grid-template-columns\`, \`areas\`), потом в неё раскладываются элементы. Идеален для макетов страниц, галерей, сложных сеток и перекрытий.
3. **Intrinsic sizing во Flexbox**: \`flex: 1 1 auto\` распределяет свободное место; \`min-width: 0\` часто нужен, чтобы элемент мог сжаться **меньше своего контента** — иначе длинный текст даст overflow.
4. **Intrinsic sizing в Grid**: функции \`min-content\`, \`max-content\`, \`fit-content()\`, \`minmax()\` дают точный контроль над тем, как ведёт себя колонка.
5. Их **вкладывают**: Grid для макета страницы, Flexbox внутри ячеек.

## Пример

\`\`\`css
/* адаптивная сетка карточек без единого media-запроса */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr));
  gap: 16px;
}
\`\`\`

Почему так: \`minmax(250px, 1fr)\` означает «колонка не уже 250px, а излишек делим поровну», \`auto-fill\` создаёт столько колонок, сколько влезает. Обёртка \`min(100%, 250px)\` спасает на узких экранах, где 250px уже шире контейнера.

## Что сказать на собеседовании

> Ключевое различие — измерность. Flexbox одномерный: элементы выстраиваются в ряд или в столбец, и размеры идут от контента наружу, content-out. Grid двумерный: строки и столбцы задаются одновременно, структуру диктует контейнер, layout-in. Поэтому Flexbox я беру для компонентов — тулбары, навигация, ряд карточек, — а Grid для макета страницы, галерей и всего, где нужно выравнивание по двум осям, named areas или перекрытия. По intrinsic sizing: во Flexbox распределение идёт через \`flex: 1 1 auto\`, и очень часто нужен \`min-width: 0\`, иначе элемент не сожмётся меньше контента и вылезет за границы. В Grid для этого есть \`minmax()\`, \`min-content\`, \`max-content\` и \`fit-content()\`. По производительности разницы почти нет — движок раскладки один и тот же, выбор делается по семантике задачи.

## Ловушки

- **\`min-width: 0\` во Flexbox** — классика: без него длинный текст или \`<pre>\` ломает раскладку, потому что \`min-width\` по умолчанию равен \`auto\`.
- **\`auto-fill\` vs \`auto-fit\`**: \`auto-fill\` оставляет пустые колонки, \`auto-fit\` схлопывает их, и элементы растягиваются.
- **\`gap\` работает и во Flexbox**, не только в Grid — старый хак с отрицательными margin больше не нужен.
- **Grid не заменяет Flexbox**: одномерную задачу решать сеткой обычно многословнее.
- **Производительность — не аргумент выбора**: оба используют один layout-движок; тормозит не выбор технологии, а глубина дерева и количество перерасчётов.
- Спросят следом: что такое \`fr\`, чем \`1fr\` отличается от \`auto\`, и как \`content-visibility\` помогает длинным сеткам.`,
      en: `## In short

The difference is **dimensionality**. Flexbox is one-dimensional: items go in a row **or** a column, and the content drives the sizes. Grid is two-dimensional: rows **and** columns at once, and the container drives the structure.

Analogy: Flexbox is a shelf where you stand books side by side and they share the space themselves. Grid is a cabinet with pre-marked compartments: you decided where everything goes before anything arrived.

## How it works, step by step

1. **Flexbox is content-out**: item sizes come first, then free space is distributed via \`flex-grow\`/\`flex-shrink\`. Perfect for components: toolbars, navigation, a row of cards.
2. **Grid is layout-in**: you declare the grid first (\`grid-template-columns\`, \`areas\`) and place items into it. Perfect for page layouts, galleries, complex grids and overlaps.
3. **Intrinsic sizing in Flexbox**: \`flex: 1 1 auto\` distributes free space; \`min-width: 0\` is very often required so an item can shrink **below its own content** — otherwise long text overflows.
4. **Intrinsic sizing in Grid**: \`min-content\`, \`max-content\`, \`fit-content()\` and \`minmax()\` give precise control over how a track behaves.
5. They **nest**: Grid for the page layout, Flexbox inside the cells.

## Example

\`\`\`css
/* a responsive card grid with zero media queries */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr));
  gap: 16px;
}
\`\`\`

Why this works: \`minmax(250px, 1fr)\` means "a column is never narrower than 250px, and the leftover is split evenly", while \`auto-fill\` creates as many columns as fit. Wrapping in \`min(100%, 250px)\` saves narrow screens where 250px is already wider than the container.

## What to say in the interview

> The key difference is dimensionality. Flexbox is one-dimensional: items line up in a row or a column and sizing goes content-out. Grid is two-dimensional: rows and columns are declared together and the container drives the structure, layout-in. So I reach for Flexbox for components — toolbars, navigation, a row of cards — and for Grid for page layouts, galleries, and anything needing two-axis alignment, named areas or overlaps. On intrinsic sizing: in Flexbox distribution goes through \`flex: 1 1 auto\`, and you very often need \`min-width: 0\`, otherwise an item cannot shrink below its content and overflows. Grid has \`minmax()\`, \`min-content\`, \`max-content\` and \`fit-content()\` for the same job. Performance-wise there is essentially no difference — it is the same layout engine, so the choice is about the semantics of the task.

## Gotchas

- **\`min-width: 0\` in Flexbox** is the classic trap: without it long text or a \`<pre>\` breaks the layout, because \`min-width\` defaults to \`auto\`.
- **\`auto-fill\` vs \`auto-fit\`**: \`auto-fill\` keeps empty tracks, \`auto-fit\` collapses them so items stretch.
- **\`gap\` works in Flexbox too**, not just Grid — the old negative-margin hack is obsolete.
- **Grid does not replace Flexbox**: solving a one-dimensional problem with a grid is usually more verbose.
- **Performance is not a selection criterion**: both share one layout engine; what actually costs is tree depth and the number of recalculations.
- Expect the follow-up: what \`fr\` is, how \`1fr\` differs from \`auto\`, and how \`content-visibility\` helps long grids.`
    },
    codeSnippet: `/* Flexbox: 1D toolbar — content-driven, single axis */
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar .spacer { flex: 1 1 auto; } /* push trailing items to the right */

/* Grid: 2D page layout — container-driven, named areas */
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    'header header'
    'nav    main'
    'footer footer';
  min-height: 100dvh;
}`
  },
  {
    id: 'web-019',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['cascade', 'specificity', 'inheritance'],
    question: {
      ru: 'Объясните каскад, специфичность и наследование в CSS. Как разрешается конфликт стилей?',
      en: 'Explain the cascade, specificity, and inheritance in CSS. How are style conflicts resolved?'
    },
    answer: {
      ru: `## Коротко

На один элемент может претендовать десяток правил. **Каскад** — это регламент, по которому браузер выбирает победителя. **Специфичность** — один из критериев в этом регламенте. **Наследование** — про то, что часть свойств спускается от родителя к детям сама.

Аналогия: суд. Сначала смотрят, кто вообще имеет право голоса (origin и \`!important\`), потом инстанцию (слои \`@layer\`), потом весомость аргумента (специфичность), а при полном равенстве — кто высказался последним.

## Как это работает по шагам

1. **Origin и важность**: user-agent < user < author < author \`!important\` < user \`!important\`. Заметьте — важные пользовательские стили бьют важные авторские, это сделано ради доступности.
2. **Cascade layers (\`@layer\`)** — слои упорядочены явно, и стиль из более позднего слоя выигрывает независимо от специфичности.
3. **Специфичность** селектора — кортеж **(a, b, c)**: \`a\` — inline-стиль или количество ID, \`b\` — классы, атрибуты, псевдоклассы вроде \`:hover\`, \`c\` — теги и псевдоэлементы вроде \`::before\`. Сравнивают слева направо.
4. **Порядок появления** — при полном равенстве выигрывает последний объявленный.
5. **Наследование** работает отдельно от каскада: если у элемента нет ни одного подходящего правила, часть свойств берётся у родителя.

## Пример

\`\`\`css
#main .card a      /* (1,1,1) — побеждает */
.card a:hover      /* (0,2,1) */
a                  /* (0,0,1) */
\`\`\`

Почему так: сравнение идёт разряд за разрядом, и единственный ID перевешивает любое количество классов. \`:where()\` имеет специфичность **ноль** — идеально для базовых стилей, которые должны легко переопределяться; \`:is()\` наоборот берёт специфичность самого «тяжёлого» аргумента.

## Что наследуется, а что нет

- **Наследуются**: \`color\`, \`font\` и его составляющие, \`line-height\`, \`visibility\`, \`letter-spacing\`.
- **Не наследуются**: \`margin\`, \`padding\`, \`border\`, \`background\`, \`display\`, \`width\`.
- **Управляется явно**: \`inherit\` (взять у родителя), \`initial\` (значение по спецификации), \`unset\` (наследуемое → inherit, ненаследуемое → initial), \`revert\` (откатить к стилю браузера или предыдущего origin).

## Что сказать на собеседовании

> Каскад разрешает конфликт правил по порядку: сначала origin и важность — user-agent, потом пользователь, потом автор, потом авторский \`!important\` и выше всех пользовательский \`!important\`; затем каскадные слои \`@layer\`, где более поздний слой выигрывает независимо от специфичности; затем специфичность селектора; и при полном равенстве — порядок объявления, последний побеждает. Специфичность — это кортеж из трёх чисел: ID, потом классы, атрибуты и псевдоклассы, потом теги и псевдоэлементы; сравнивается разряд за разрядом. \`:where()\` даёт нулевую специфичность, а \`:is()\` берёт специфичность самого тяжёлого аргумента. Наследование — отдельный механизм: \`color\` и \`font\` наследуются, а \`margin\` и \`background\` нет, и управлять этим можно через \`inherit\`, \`initial\`, \`unset\` и \`revert\`. На практике держу специфичность низкой и плоской.

## Ловушки

- **Специфичность — не сумма, а кортеж**: один ID сильнее одиннадцати классов, «переполнения разряда» не бывает.
- **\`!important\` в user-стилях сильнее авторского \`!important\`** — частый вопрос с подвохом.
- **\`@layer\` бьёт специфичность**: правило с одним классом из позднего слоя победит правило с ID из раннего.
- **\`:is()\` поднимает специфичность** до самого тяжёлого аргумента — легко получить сюрприз, написав \`:is(#a, .b)\`.
- **Инлайн-стиль перебивается только \`!important\`** — ещё одна причина не писать стили в атрибуте.
- **«Стиль не применился»** почти всегда сводится к специфичности или порядку; смотрите вкладку Styles в DevTools — перечёркнутые правила показывают проигравших.`,
      en: `## In short

A dozen rules can claim the same element. The **cascade** is the rulebook the browser uses to pick a winner. **Specificity** is one criterion inside that rulebook. **Inheritance** is separate: some properties flow from parent to children by themselves.

Analogy: a courtroom. First, who is even allowed to speak (origin and \`!important\`), then which court (\`@layer\`), then how weighty the argument is (specificity), and on an exact tie, whoever spoke last.

## How it works, step by step

1. **Origin and importance**: user-agent < user < author < author \`!important\` < user \`!important\`. Note that important *user* styles beat important author styles — deliberately, for accessibility.
2. **Cascade layers (\`@layer\`)** — layers are explicitly ordered, and a later layer wins regardless of specificity.
3. **Selector specificity** — a tuple **(a, b, c)**: \`a\` is inline style or the number of IDs, \`b\` is classes, attributes and pseudo-classes like \`:hover\`, \`c\` is elements and pseudo-elements like \`::before\`. Compared left to right.
4. **Order of appearance** — on an exact tie, the last declaration wins.
5. **Inheritance** runs beside the cascade: if no rule matches an element at all, certain properties are taken from the parent.

## Example

\`\`\`css
#main .card a      /* (1,1,1) — wins */
.card a:hover      /* (0,2,1) */
a                  /* (0,0,1) */
\`\`\`

Why this works: comparison happens digit by digit, so a single ID outweighs any number of classes. \`:where()\` has specificity **zero** — perfect for base styles meant to be overridden easily; \`:is()\`, by contrast, takes the specificity of its heaviest argument.

## What inherits and what does not

- **Inherited**: \`color\`, \`font\` and its parts, \`line-height\`, \`visibility\`, \`letter-spacing\`.
- **Not inherited**: \`margin\`, \`padding\`, \`border\`, \`background\`, \`display\`, \`width\`.
- **Controlled explicitly**: \`inherit\` (take the parent's), \`initial\` (the spec default), \`unset\` (inherit if inheritable, otherwise initial), \`revert\` (roll back to the browser or previous origin).

## What to say in the interview

> The cascade resolves conflicts in order: first origin and importance — user-agent, then user, then author, then author \`!important\`, and above everything user \`!important\`; then cascade layers, where a later \`@layer\` wins regardless of specificity; then selector specificity; and on an exact tie, declaration order, with the last one winning. Specificity is a three-part tuple: IDs, then classes, attributes and pseudo-classes, then elements and pseudo-elements, compared digit by digit. \`:where()\` contributes zero specificity, while \`:is()\` takes the specificity of its heaviest argument. Inheritance is a separate mechanism: \`color\` and \`font\` inherit, \`margin\` and \`background\` do not, and you steer it with \`inherit\`, \`initial\`, \`unset\` and \`revert\`. In practice I keep specificity low and flat.

## Gotchas

- **Specificity is a tuple, not a sum**: one ID beats eleven classes, and digits never "carry over".
- **A user \`!important\` beats an author \`!important\`** — a favourite trick question.
- **\`@layer\` outranks specificity**: a single-class rule in a later layer beats an ID rule in an earlier one.
- **\`:is()\` raises specificity** to its heaviest argument — \`:is(#a, .b)\` surprises people constantly.
- **Inline styles can only be beaten by \`!important\`** — another reason not to write styles in the attribute.
- **"My style is not applied"** almost always reduces to specificity or order; the DevTools Styles pane shows the losers struck through.`
    },
    codeSnippet: `/* Cascade layers + :where() keep specificity low and predictable */
@layer reset, base, components, utilities;

@layer base {
  /* :where() has specificity 0,0,0 — trivially overridable later */
  :where(a) { color: blue; }
}

@layer utilities {
  .text-red { color: red; } /* wins over base by layer order, not weight */
}

/* Specificity tuple (a,b,c):
   #id .class el  -> (1,1,1)
   .class:hover   -> (0,2,0)
   el::before     -> (0,0,2) */`
  },
  {
    id: 'web-020',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['stacking-context', 'z-index', 'css'],
    question: {
      ru: 'Что такое stacking context? Почему z-index иногда «не работает»?',
      en: 'What is a stacking context? Why does z-index sometimes "not work"?'
    },
    answer: {
      ru: `## Коротко

Stacking context — это **отдельная «стопка» слоёв по оси Z**. Внутри одной стопки элементы сравниваются по \`z-index\` друг с другом, но вся дочерняя стопка целиком встаёт туда, куда её поставил **родитель**.

Аналогия: этажи здания. Внутри своего этажа вы можете забраться хоть на шкаф, но выше человека с четвёртого этажа всё равно не окажетесь. \`z-index: 9999\` — это высокий шкаф, а не лифт.

## Как это работает по шагам

1. Браузер строит дерево stacking contexts. Корневой контекст — это \`<html>\`.
2. Некоторые свойства заставляют элемент создать **свой** контекст. Тогда все его потомки живут внутри и наружу не выбираются.
3. При отрисовке браузер сначала расставляет контексты верхнего уровня по их \`z-index\`, потом рекурсивно раскладывает содержимое каждого.
4. Поэтому потомок с \`z-index: 9999\` физически не может обогнать соседа, если контекст его родителя стоит ниже.
5. **Что создаёт новый контекст**: \`position: relative/absolute\` вместе с \`z-index\` ≠ \`auto\`; \`position: fixed\` или \`sticky\`; \`opacity\` < 1; \`transform\`, \`filter\`, \`perspective\`, \`clip-path\`, \`mask\` ≠ \`none\`; \`will-change\` с таким значением; \`isolation: isolate\`; flex- или grid-элемент с \`z-index\` ≠ \`auto\`.

## Пример

\`\`\`css
.modal-parent {
  opacity: 0.99;      /* нечаянно создали stacking context! */
}
.modal {
  z-index: 9999;      /* всё равно под .sibling, если родитель ниже */
}

.overlay-root {
  isolation: isolate; /* осознанный контекст без побочных эффектов отрисовки */
}
\`\`\`

Почему так: \`opacity: 0.99\` визуально ничего не меняет, но создаёт контекст — и запирает модалку внутри. \`isolation: isolate\` делает то же самое, но **намеренно** и без побочных эффектов вроде размытия или прозрачности.

## Что сказать на собеседовании

> Stacking context — это изолированная область наложения по оси Z. Внутри неё элементы сортируются по \`z-index\` относительно друг друга, но сам контекст целиком позиционируется значением \`z-index\` своего родителя, поэтому потомок не может выпрыгнуть наружу — отсюда классический баг, когда \`z-index: 9999\` не работает. Новый контекст создают позиционирование с \`z-index\` не \`auto\`, \`position: fixed\` и \`sticky\`, \`opacity\` меньше единицы, \`transform\`, \`filter\`, \`clip-path\`, \`will-change\` и \`isolation: isolate\`. Чаще всего виноват родитель, который случайно создал контекст трансформом или прозрачностью. Лечу двумя способами: либо ставлю \`isolation: isolate\` осознанно и контролирую иерархию, либо рендерю оверлеи через portal в конец \`<body>\`, чтобы они были в корневом контексте. Иерархию удобно смотреть в панели Layers в DevTools.

## Ловушки

- **\`opacity: 0.999\`, \`transform: translateZ(0)\`, \`filter: blur(0)\`** — все создают контекст, хотя выглядят как no-op.
- **\`will-change\` создаёт контекст заранее** — оптимизация производительности внезапно ломает \`z-index\`.
- **\`position: fixed\` внутри трансформированного родителя** перестаёт быть фиксированным относительно viewport — та же природа проблемы.
- **Гонка \`z-index\`** («поставлю 99999») не лечит причину, а маскирует её и создаёт неподдерживаемый код.
- **Отрицательный \`z-index\`** уводит элемент за фон родителя — иногда именно это и ломает вёрстку.
- Спросят следом: чем stacking context отличается от containing block и от composited layer (это три разные вещи).`,
      en: `## In short

A stacking context is a **separate "stack" of layers on the Z axis**. Inside one stack elements are compared by \`z-index\` against each other, but a child stack as a whole sits wherever its **parent** put it.

Analogy: floors of a building. Within your floor you can climb on top of the wardrobe, but you still will not end up above someone on the fourth floor. \`z-index: 9999\` is a tall wardrobe, not a lift.

## How it works, step by step

1. The browser builds a tree of stacking contexts. The root context is \`<html>\`.
2. Certain properties make an element create **its own** context. From then on all its descendants live inside it and cannot get out.
3. When painting, the browser first orders the top-level contexts by their \`z-index\`, then recursively lays out the contents of each.
4. That is why a descendant with \`z-index: 9999\` physically cannot beat a sibling whose parent context sits higher.
5. **What creates a new context**: \`position: relative/absolute\` together with \`z-index\` ≠ \`auto\`; \`position: fixed\` or \`sticky\`; \`opacity\` < 1; \`transform\`, \`filter\`, \`perspective\`, \`clip-path\`, \`mask\` ≠ \`none\`; a context-creating \`will-change\`; \`isolation: isolate\`; a flex or grid item with \`z-index\` ≠ \`auto\`.

## Example

\`\`\`css
.modal-parent {
  opacity: 0.99;      /* accidentally creates a stacking context! */
}
.modal {
  z-index: 9999;      /* still below .sibling if the parent sits lower */
}

.overlay-root {
  isolation: isolate; /* a deliberate context with no paint side effects */
}
\`\`\`

Why this matters: \`opacity: 0.99\` changes nothing visually but creates a context — and traps the modal inside it. \`isolation: isolate\` does the same thing **on purpose**, without side effects like blur or transparency.

## What to say in the interview

> A stacking context is an isolated painting region on the Z axis. Inside it, elements sort by \`z-index\` relative to each other, but the context as a whole is positioned by its parent's \`z-index\`, so a descendant can never escape it — that is the classic bug where \`z-index: 9999\` does nothing. A new context is created by positioning with a non-\`auto\` \`z-index\`, by \`position: fixed\` and \`sticky\`, by \`opacity\` below 1, by \`transform\`, \`filter\`, \`clip-path\`, \`will-change\`, and by \`isolation: isolate\`. Usually the culprit is a parent that accidentally created a context with a transform or an opacity. I fix it in one of two ways: either set \`isolation: isolate\` deliberately and own the hierarchy, or portal overlays to the end of \`<body>\` so they live in the root context. The DevTools Layers panel is handy for inspecting the hierarchy.

## Gotchas

- **\`opacity: 0.999\`, \`transform: translateZ(0)\`, \`filter: blur(0)\`** all create a context despite looking like no-ops.
- **\`will-change\` creates the context up front** — a performance tweak suddenly breaks \`z-index\`.
- **\`position: fixed\` inside a transformed parent** stops being fixed to the viewport — same root cause.
- **The \`z-index\` arms race** ("I'll just use 99999") hides the cause instead of fixing it and leaves unmaintainable code.
- **A negative \`z-index\`** pushes the element behind its parent's background — sometimes that is exactly what broke the layout.
- Expect the follow-up: how a stacking context differs from a containing block and from a composited layer (three different things).`
    },
    codeSnippet: `/* Trap: the parent silently creates a stacking context,
   so the child's huge z-index cannot escape it. */
.dropdown-parent {
  transform: translateZ(0); /* creates a stacking context! */
}
.dropdown {
  position: absolute;
  z-index: 9999; /* still trapped below a sibling subtree */
}

/* Fix: isolate deliberately, or portal the overlay to <body>. */
.overlay-root {
  isolation: isolate; /* new context without paint side effects */
}`
  },
  {
    id: 'web-021',
    category: 'html-css-performance',
    level: 'Expert',
    tags: ['bfc', 'layout', 'css'],
    question: {
      ru: 'Что такое Block Formatting Context (BFC)? Какие задачи он решает?',
      en: 'What is a Block Formatting Context (BFC)? What problems does it solve?'
    },
    answer: {
      ru: `## Коротко

BFC — это **изолированная область раскладки**: внутри неё блоки живут по своим правилам и не взаимодействуют с внешним миром. Margin-ы не протекают наружу, floats считаются в высоту, соседние floats не заезжают внутрь.

Аналогия: отдельная комната с закрытой дверью. Внутри можно двигать мебель как угодно — в коридоре ничего не сдвинется, и коридорная мебель внутрь не заедет.

## Как это работает по шагам

1. Обычные блоки живут в общем потоке: их вертикальные margin-ы схлопываются с соседями и с родителем, а floated-потомки выпадают из расчёта высоты контейнера.
2. Как только элемент становится BFC, его внутренняя раскладка **изолируется** от внешней.
3. **Задача 1 — containing floats (clearfix)**: BFC включает floated-потомков в расчёт высоты, поэтому контейнер не схлопывается в ноль.
4. **Задача 2 — margin collapsing**: вертикальные margin-ы больше не схлопываются через границу BFC, барьер создан.
5. **Задача 3 — обтекание float**: контент BFC не обтекает соседний float, а образует собственную колонку.
6. **Что создаёт BFC**: \`display: flow-root\` (самый чистый способ), \`overflow\` ≠ \`visible\` (\`hidden\`, \`auto\`, \`clip\`), \`display: inline-block\`, \`table-cell\`, \`flex\`, \`grid\`, \`position: absolute/fixed\`, любой \`float\` ≠ \`none\`.

## Пример

\`\`\`css
.container {
  display: flow-root;  /* современный clearfix без псевдоэлементов */
}

.sidebar { float: left; width: 200px; }
.content { display: flow-root; } /* BFC: не заезжает под sidebar */
\`\`\`

Почему так: \`flow-root\` создаёт BFC **и больше ничего не делает**. Раньше для этого использовали \`overflow: hidden\`, но он режет выходящий за границы контент — теряются тени, тултипы и выпадающие меню.

## Что сказать на собеседовании

> BFC, block formatting context, — это независимая область раскладки, внутри которой блочные элементы располагаются по своим правилам, изолированно от внешнего контекста. Он решает три классические задачи. Первая — контейнер с floated-потомками не схлопывается, потому что внутри BFC floats участвуют в расчёте высоты; это современный clearfix. Вторая — вертикальные margin-ы не схлопываются через границу BFC. Третья — содержимое BFC не обтекает соседний float, а образует отдельную колонку, что даёт двухколоночную раскладку на float без хаков. Создать BFC можно через \`overflow\` не \`visible\`, \`display: inline-block\`, \`table-cell\`, \`flex\`, \`grid\`, абсолютное позиционирование или сам float. Но предпочтительный способ — \`display: flow-root\`: он создаёт BFC без побочных эффектов, в отличие от \`overflow: hidden\`, который обрезает контент.

## Ловушки

- **\`overflow: hidden\` как clearfix** режет тени, тултипы и дропдауны — используйте \`flow-root\`.
- **Flex- и grid-контейнеры создают не BFC, а свои контексты форматирования**, но margin collapsing внутри них тоже не работает.
- **Margin collapsing — не баг**: схлопывание соседних и родительско-детских вертикальных margin-ов заложено в спецификацию.
- **Горизонтальные margin-ы не схлопываются никогда** — только вертикальные.
- **BFC ≠ stacking context**: разные механизмы, хотя многие свойства создают оба сразу.
- Спросят следом: чем \`flow-root\` лучше старого \`::after { content: ''; clear: both }\` (короче, без лишнего псевдоэлемента и без побочных эффектов).`,
      en: `## In short

A BFC is an **isolated layout region**: inside it blocks follow their own rules and do not interact with the outside world. Margins do not leak out, floats count towards the height, and neighbouring floats do not slide in.

Analogy: a room with the door closed. Inside you can rearrange the furniture freely — nothing in the corridor moves, and the corridor's furniture stays out.

## How it works, step by step

1. Ordinary blocks live in the shared flow: their vertical margins collapse with siblings and with the parent, and floated children fall out of the container's height calculation.
2. The moment an element becomes a BFC, its inner layout is **isolated** from the outer one.
3. **Job 1 — containing floats (clearfix)**: a BFC includes floated descendants in its height, so the container no longer collapses to zero.
4. **Job 2 — margin collapsing**: vertical margins no longer collapse across the BFC boundary; the barrier is in place.
5. **Job 3 — float wrapping**: a BFC's content does not wrap around an adjacent float; it forms its own column instead.
6. **What creates a BFC**: \`display: flow-root\` (the cleanest), \`overflow\` ≠ \`visible\` (\`hidden\`, \`auto\`, \`clip\`), \`display: inline-block\`, \`table-cell\`, \`flex\`, \`grid\`, \`position: absolute/fixed\`, and any \`float\` ≠ \`none\`.

## Example

\`\`\`css
.container {
  display: flow-root;  /* modern clearfix without pseudo-elements */
}

.sidebar { float: left; width: 200px; }
.content { display: flow-root; } /* BFC: does not slide under the sidebar */
\`\`\`

Why this works: \`flow-root\` creates a BFC **and does nothing else**. The old trick was \`overflow: hidden\`, but that clips anything crossing the boundary — you lose shadows, tooltips and dropdowns.

## What to say in the interview

> A BFC, block formatting context, is an independent layout region where block elements lay out by their own rules, isolated from the outer context. It solves three classic problems. First, a container with floated children no longer collapses, because inside a BFC floats participate in height calculation — that is the modern clearfix. Second, vertical margins do not collapse across the BFC boundary. Third, a BFC's content does not wrap around an adjacent float but forms its own column, which gives you a two-column float layout with no hacks. You can create a BFC with a non-\`visible\` \`overflow\`, \`display: inline-block\`, \`table-cell\`, \`flex\`, \`grid\`, absolute positioning, or a float itself. But the preferred way is \`display: flow-root\`: it creates a BFC with no side effects, unlike \`overflow: hidden\`, which clips content.

## Gotchas

- **\`overflow: hidden\` as a clearfix** clips shadows, tooltips and dropdowns — use \`flow-root\`.
- **Flex and grid containers create their own formatting contexts, not BFCs**, though margin collapsing does not happen inside them either.
- **Margin collapsing is not a bug**: collapsing adjacent and parent-child vertical margins is specified behaviour.
- **Horizontal margins never collapse** — only vertical ones do.
- **A BFC is not a stacking context**: different mechanisms, even though many properties create both at once.
- Expect the follow-up: why \`flow-root\` beats the old \`::after { content: ''; clear: both }\` (shorter, no extra pseudo-element, no side effects).`
    }
  },
  {
    id: 'web-022',
    category: 'html-css-performance',
    level: 'Expert',
    tags: ['contain', 'content-visibility', 'rendering'],
    question: {
      ru: 'Как свойства contain и content-visibility ускоряют рендеринг? Какие есть подводные камни?',
      en: 'How do the contain and content-visibility properties speed up rendering? What are the pitfalls?'
    },
    answer: {
      ru: `## Коротко

\`contain\` — это ваше обещание браузеру: «внутри этого блока всё замкнуто, наружу не влияет». \`content-visibility: auto\` идёт дальше и разрешает **вообще не рендерить** блок, пока он за пределами экрана.

Аналогия: чемодан. Вы распаковываете только тот отсек, который нужен сейчас; остальные лежат закрытыми, и их содержимое не участвует ни в раскладке, ни в отрисовке.

## Как это работает по шагам

1. Обычно любое изменение внутри блока может теоретически повлиять на всю страницу, поэтому браузер вынужден пересчитывать шире, чем хотелось бы.
2. \`contain\` снимает это ограничение: **\`layout\`** — изменения раскладки внутри не выходят наружу; **\`paint\`** — потомки не рисуются за границами элемента, и если элемент за экраном, отрисовку можно пропустить; **\`size\`** — размер элемента не зависит от потомков (нужны явные размеры); **\`style\`** — изоляция некоторых стилевых эффектов вроде счётчиков.
3. Короткие записи: \`strict\` = \`size layout paint style\`, \`content\` = \`layout paint style\`.
4. \`content-visibility: auto\` использует всё это и **пропускает layout и paint** поддерева, пока оно вне viewport. На длинных страницах рендерится только видимое — иногда это кратное ускорение первичного рендера.
5. Чтобы страница не «складывалась», нужен \`contain-intrinsic-size\` — заявленный размер-заглушка для нерендеренного блока.

## Пример

\`\`\`css
.article-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px; /* высота-заглушка */
}

.widget {
  contain: layout paint; /* изменения внутри не реflow-ят страницу */
}
\`\`\`

Почему так: без \`contain-intrinsic-size\` невидимые секции имеют высоту 0, скроллбар прыгает, якоря и \`Ctrl+F\` ведут не туда. Значение \`auto 600px\` означает «считай 600px, но запомни реальную высоту после первого рендера».

## Что сказать на собеседовании

> \`contain\` говорит браузеру, что поддерево изолировано, и позволяет ограничить область пересчёта. Значение \`layout\` изолирует раскладку, \`paint\` запрещает потомкам рисоваться за границами элемента и позволяет пропустить их отрисовку за экраном, \`size\` делает размер независимым от содержимого, \`style\` изолирует стилевые эффекты; есть шорткаты \`content\` и \`strict\`. \`content-visibility: auto\` идёт дальше — браузер полностью пропускает layout и paint поддерева, пока оно вне вьюпорта, и на длинных списках и статьях это даёт кратное ускорение первого рендера. Обязательное дополнение — \`contain-intrinsic-size\`, иначе скрытые блоки имеют нулевую высоту, скроллбар скачет, ломаются якоря и поиск по странице. Со значением \`auto\` браузер запоминает реальный размер после первого рендера, что заодно снижает CLS.

## Ловушки

- **Забыли \`contain-intrinsic-size\`** — высота 0, прыгающий скроллбар, сломанные якоря и \`Ctrl+F\`.
- **CLS при появлении контента**: заглушка сменяется реальной высотой; спасает \`contain-intrinsic-size: auto\`.
- **Не то же самое, что \`display: none\`**: контент вне экрана всё ещё доступен скринридерам и поиску по странице, но измерить его геометрию до рендера нельзя.
- **\`contain: size\` требует явных размеров** — иначе элемент схлопнется в ноль.
- **Не применяйте к элементам, чьи размеры нужны постоянно** — например, к участникам sticky-расчётов или к тому, что вы измеряете из JS.
- Спросят следом: чем это отличается от виртуализации списков (тут DOM остаётся, экономится только рендеринг).`,
      en: `## In short

\`contain\` is your promise to the browser: "everything inside this box is self-contained, it does not affect the outside." \`content-visibility: auto\` goes further and lets the browser **skip rendering the box entirely** while it is off-screen.

Analogy: a suitcase. You unpack only the compartment you need right now; the rest stay closed, and their contents take part in neither layout nor painting.

## How it works, step by step

1. Normally any change inside a box could in theory affect the whole page, so the browser must recalculate more broadly than you would like.
2. \`contain\` lifts that constraint: **\`layout\`** — layout changes inside stay inside; **\`paint\`** — descendants never paint outside the element's bounds, so painting can be skipped when it is off-screen; **\`size\`** — the element's size does not depend on its descendants (explicit sizes required); **\`style\`** — isolates certain style effects such as counters.
3. Shorthands: \`strict\` = \`size layout paint style\`, \`content\` = \`layout paint style\`.
4. \`content-visibility: auto\` builds on all of this and **skips layout and paint** for a subtree while it is outside the viewport. On long pages only the visible part is rendered — sometimes a multiple-fold speedup of the initial render.
5. To stop the page from collapsing you need \`contain-intrinsic-size\` — a declared placeholder size for the un-rendered block.

## Example

\`\`\`css
.article-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px; /* placeholder height */
}

.widget {
  contain: layout paint; /* changes inside will not reflow the page */
}
\`\`\`

Why this matters: without \`contain-intrinsic-size\` the skipped sections have height 0, the scrollbar jumps, and anchors and \`Ctrl+F\` land in the wrong place. The value \`auto 600px\` means "assume 600px, but remember the real height after the first render".

## What to say in the interview

> \`contain\` tells the browser a subtree is isolated so it can limit the scope of recalculation. \`layout\` isolates layout, \`paint\` stops descendants painting outside the element's bounds and allows skipping paint when off-screen, \`size\` makes the size independent of the content, and \`style\` isolates style effects; there are also the \`content\` and \`strict\` shorthands. \`content-visibility: auto\` goes further — the browser skips layout and paint for the subtree entirely while it is outside the viewport, which on long lists and articles gives a multiple-fold faster first render. The mandatory companion is \`contain-intrinsic-size\`, otherwise the skipped blocks have zero height and you get a jumping scrollbar plus broken anchors and in-page search. With the \`auto\` keyword the browser remembers the real size after the first render, which also reduces CLS.

## Gotchas

- **Forgetting \`contain-intrinsic-size\`** gives height 0, a jumping scrollbar, and broken anchors and \`Ctrl+F\`.
- **CLS as content appears**: the placeholder is replaced by the real height; \`contain-intrinsic-size: auto\` mitigates this.
- **This is not \`display: none\`**: off-screen content is still exposed to screen readers and in-page search, but you cannot measure its geometry before it renders.
- **\`contain: size\` requires explicit dimensions** — otherwise the element collapses to zero.
- **Do not apply it to elements whose size is needed constantly** — sticky calculations, or anything you measure from JS.
- Expect the follow-up: how this differs from list virtualization (here the DOM stays; only rendering work is saved).`
    },
    codeSnippet: `/* Skip rendering work for off-screen sections of a long page.
   contain-intrinsic-size reserves a placeholder size to avoid
   scrollbar jumps and broken anchors. */
.article-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px;
}

/* Scope reflow/repaint to an isolated widget subtree */
.widget {
  contain: layout paint; /* changes inside won't reflow the page */
}`
  },
  {
    id: 'web-023',
    category: 'html-css-performance',
    level: 'Medium',
    tags: ['semantic-html', 'accessibility', 'seo'],
    question: {
      ru: 'Почему важна семантическая вёрстка? Как она связана с доступностью, SEO и производительностью?',
      en: 'Why does semantic HTML matter? How does it relate to accessibility, SEO, and performance?'
    },
    answer: {
      ru: `## Коротко

Семантические теги (\`<header>\`, \`<nav>\`, \`<main>\`, \`<article>\`, \`<section>\`, \`<aside>\`, \`<footer>\`, \`<button>\`, \`<time>\`) описывают **смысл** контента, а не только его вид. Взамен вы бесплатно получаете доступность, SEO и часть поведения.

Аналогия: подписанные коробки при переезде. Визуально коробки одинаковые, но по надписи и грузчик, и вы сами мгновенно понимаете, что внутри и куда нести. \`<div>\` — коробка без надписи.

## Из чего складывается выгода

1. **Доступность.** Скринридеры строят дерево доступности из семантики: \`<nav>\` объявляется как навигация, \`<button>\` сам получает фокус и активируется по Enter и Space. Заголовки \`<h1>–<h6>\` дают структуру для быстрой навигации по landmark-ам.
2. **Меньше кода.** \`<div onclick>\` вместо \`<button>\` требует руками добавить \`role\`, \`tabindex\`, обработку клавиатуры, состояние \`disabled\` — четыре шанса ошибиться там, где нативный элемент работает из коробки.
3. **SEO.** Поисковики понимают структуру: \`<article>\`, \`<main>\` и микроразметка повышают релевантность и дают rich snippets, а также помогают выделить основной контент страницы.
4. **Производительность.** Меньше «div-супа» → меньше DOM-узлов → дешевле layout и дешевле change detection во фреймворке. Плюс бесплатное поведение форм, \`<details>\`, \`<dialog>\` — это буквально минус килобайты JS.

## Пример

\`\`\`html
<article>
  <header><h2>Заголовок</h2></header>
  <p>Текст...</p>
  <footer><time datetime="2026-06-29">29 июня 2026</time></footer>
</article>
\`\`\`

Почему так: \`<time datetime>\` даёт машиночитаемую дату при человекочитаемом тексте, а \`<article>\` с \`<header>\`/\`<footer>\` образует самодостаточный блок, который скринридер и поисковик разбирают без дополнительных подсказок.

## Что сказать на собеседовании

> Семантическая вёрстка — это выбор тегов по смыслу контента, а не по внешнему виду. Главная выгода — доступность: скринридеры строят дерево доступности именно из семантики, \`<nav>\` объявляется как навигация, а \`<button>\` бесплатно получает фокус, активацию по Enter и Space и состояние disabled. Если писать \`<div onclick>\`, всё это приходится добавлять вручную через \`role\`, \`tabindex\` и обработчики клавиатуры, и там легко ошибиться. Для SEO семантика даёт понимание структуры страницы, \`<article>\` и \`<main>\` плюс микроразметка улучшают релевантность и rich snippets. Для производительности — меньше div-супа, меньше DOM-узлов, дешевле layout и change detection, и меньше JS, потому что часть поведения даёт сам браузер. Правило простое: сначала нативный элемент, ARIA — только когда нативного решения нет.

## Ловушки

- **Первое правило ARIA — не использовать ARIA**, если есть подходящий нативный элемент.
- **\`role="button"\` на \`<div>\` не даёт клавиатуру**: нужен \`tabindex="0"\` и ручная обработка Enter/Space.
- **\`<section>\` без заголовка** не создаёт landmark и для скринридера бесполезен.
- **\`<b>\`/\`<i>\` — про вид, \`<strong>\`/\`<em>\` — про смысл**; для семантики нужны вторые.
- **Несколько \`<h1>\`** и «дыры» в уровнях заголовков ломают навигацию по структуре.
- **Семантика — не микроразметка**: Schema.org/JSON-LD решает другую задачу и добавляется отдельно.`,
      en: `## In short

Semantic tags (\`<header>\`, \`<nav>\`, \`<main>\`, \`<article>\`, \`<section>\`, \`<aside>\`, \`<footer>\`, \`<button>\`, \`<time>\`) describe the **meaning** of content, not just its appearance. In return you get accessibility, SEO and some behaviour for free.

Analogy: labelled boxes on moving day. The boxes look identical, but the label tells both the mover and you instantly what is inside and where it goes. A \`<div>\` is an unlabelled box.

## What the payoff is made of

1. **Accessibility.** Screen readers build the accessibility tree from semantics: \`<nav>\` is announced as navigation, and a \`<button>\` is focusable and activates on Enter and Space by itself. Headings \`<h1>–<h6>\` give the structure used for landmark navigation.
2. **Less code.** A \`<div onclick>\` instead of a \`<button>\` means hand-adding \`role\`, \`tabindex\`, keyboard handling and a disabled state — four chances to get wrong what the native element does out of the box.
3. **SEO.** Search engines understand the structure: \`<article>\`, \`<main>\` and microdata raise relevance, enable rich snippets, and help identify the page's main content.
4. **Performance.** Less "div soup" → fewer DOM nodes → cheaper layout and cheaper framework change detection. Plus free behaviour from forms, \`<details>\` and \`<dialog>\` — literally kilobytes of JS you never ship.

## Example

\`\`\`html
<article>
  <header><h2>Title</h2></header>
  <p>Text...</p>
  <footer><time datetime="2026-06-29">June 29, 2026</time></footer>
</article>
\`\`\`

Why this works: \`<time datetime>\` gives a machine-readable date alongside human-readable text, and an \`<article>\` with its own \`<header>\`/\`<footer>\` forms a self-contained block that screen readers and crawlers parse without extra hints.

## What to say in the interview

> Semantic HTML means choosing tags by the meaning of the content, not by how it looks. The main payoff is accessibility: screen readers build the accessibility tree from semantics, \`<nav>\` is announced as navigation, and a \`<button>\` gets focus, Enter and Space activation and a disabled state for free. Write \`<div onclick>\` instead and you have to add all of that by hand with \`role\`, \`tabindex\` and keyboard handlers, which is easy to get wrong. For SEO, semantics conveys page structure; \`<article>\` and \`<main>\` plus microdata improve relevance and rich snippets. For performance it means less div soup, fewer DOM nodes, cheaper layout and change detection, and less JavaScript because the browser supplies the behaviour. The rule is simple: native element first, ARIA only when there is no native solution.

## Gotchas

- **The first rule of ARIA is don't use ARIA** when a suitable native element exists.
- **\`role="button"\` on a \`<div>\` does not give you keyboard support**: you still need \`tabindex="0"\` and manual Enter/Space handling.
- **A \`<section>\` without a heading** creates no landmark and is useless to a screen reader.
- **\`<b>\`/\`<i>\` are visual, \`<strong>\`/\`<em>\` are semantic** — use the latter when meaning matters.
- **Multiple \`<h1>\`s** and skipped heading levels break structural navigation.
- **Semantics is not microdata**: Schema.org/JSON-LD solves a different problem and is added separately.`
    }
  },
  {
    id: 'web-024',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['accessibility', 'aria', 'wcag'],
    question: {
      ru: 'Объясните ключевые принципы доступности: ARIA-роли, управление фокусом, навигация с клавиатуры, WCAG.',
      en: 'Explain the key accessibility principles: ARIA roles, focus management, keyboard navigation, WCAG.'
    },
    answer: {
      ru: `## Коротко

Доступность держится на четырёх принципах WCAG (**POUR**), на трёх практиках — **ARIA**, **фокус**, **клавиатура** — и на одном правиле: сначала нативный элемент, ARIA только когда нативного нет.

Аналогия: пандус у здания. Он нужен человеку в коляске, но пользуются им и курьеры, и родители с колясками. Доступность — это не «режим для инвалидов», а более широкая дверь для всех.

## Четыре принципа WCAG (POUR)

- **Perceivable** (воспринимаемо) — альт-тексты, контраст текста **≥ 4.5:1**, субтитры.
- **Operable** (управляемо) — всё делается с клавиатуры, нет ловушек фокуса, хватает времени на действие.
- **Understandable** (понятно) — предсказуемое поведение, внятные ошибки форм.
- **Robust** (надёжно) — корректно работает с ассистивными технологиями.

Уровни соответствия: **A**, **AA** (целевой для большинства проектов), **AAA**.

## Три практики

1. **ARIA-роли.** ARIA добавляет семантику там, где её нет нативно. \`aria-label\` и \`aria-labelledby\` дают доступное имя; \`aria-expanded\`, \`aria-selected\`, \`aria-current\` описывают состояние; \`aria-live="polite"\` или \`"assertive"\` анонсирует динамические изменения.
2. **Управление фокусом.** Видимый индикатор через \`:focus-visible\` — outline нельзя убирать без замены. В модалках нужен **focus trap** внутри, \`aria-modal="true"\` и возврат фокуса на кнопку-триггер при закрытии. При навигации в SPA фокус переводится на новый заголовок или \`<main>\`, иначе скринридер не заметит смену страницы.
3. **Клавиатурная навигация.** Всё интерактивное достижимо по \`Tab\`, порядок логичный, положительных \`tabindex\` быть не должно. Паттерны WAI-ARIA: стрелки внутри меню и табов, \`Esc\` для закрытия, \`Enter\`/\`Space\` для активации.

## Пример

\`\`\`html
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Вкладка</button>
</div>
<div role="tabpanel" id="panel-1">...</div>
\`\`\`

Почему так: \`role="tablist"\` и \`role="tab"\` объясняют скринридеру, что это группа вкладок, \`aria-selected\` — какая активна, \`aria-controls\` связывает вкладку с панелью. Сам элемент при этом остаётся \`<button>\`, чтобы бесплатно получить фокус и активацию с клавиатуры.

## Что сказать на собеседовании

> WCAG стоит на четырёх принципах POUR: perceivable — альт-тексты, контраст текста не ниже 4.5 к 1, субтитры; operable — полное управление с клавиатуры без ловушек фокуса; understandable — предсказуемое поведение и понятные ошибки форм; robust — совместимость с ассистивными технологиями. Целевой уровень для большинства проектов — AA. ARIA добавляет семантику там, где нет нативной, но первое правило ARIA — не использовать ARIA, если подходит нативный элемент; ключевые атрибуты это \`aria-label\` для имени, \`aria-expanded\` и \`aria-selected\` для состояния и \`aria-live\` для анонса динамики. По фокусу: видимый \`:focus-visible\`, focus trap в модалках с возвратом фокуса на триггер и перевод фокуса при SPA-навигации. Проверяю через axe DevTools и Lighthouse, но обязательно вручную — с клавиатуры и в NVDA или VoiceOver.

## Ловушки

- **\`outline: none\` без замены** — самый частый и самый грубый провал по доступности.
- **Положительный \`tabindex\`** ломает естественный порядок обхода; допустимы только \`0\` и \`-1\`.
- **SPA-навигация без перевода фокуса** — скринридер продолжает читать старую страницу.
- **\`aria-live="assertive"\` на всё подряд** превращает интерфейс в непрерывный поток перебивающих анонсов.
- **ARIA не добавляет поведение**: \`role="button"\` не делает \`<div>\` фокусируемым и не обрабатывает Enter.
- **Автоматические проверки ловят лишь часть проблем** — axe и Lighthouse находят порядка трети; остальное только ручное тестирование без мыши.`,
      en: `## In short

Accessibility rests on four WCAG principles (**POUR**), three practices — **ARIA**, **focus**, **keyboard** — and one rule: native element first, ARIA only when there is no native option.

Analogy: a ramp at a building entrance. It exists for wheelchair users, yet couriers and parents with prams use it too. Accessibility is not a "disability mode" — it is a wider door for everyone.

## The four WCAG principles (POUR)

- **Perceivable** — alt text, text contrast **≥ 4.5:1**, captions.
- **Operable** — everything works from the keyboard, no focus traps, enough time to act.
- **Understandable** — predictable behaviour, clear form errors.
- **Robust** — works correctly with assistive technologies.

Conformance levels: **A**, **AA** (the target for most projects), **AAA**.

## The three practices

1. **ARIA roles.** ARIA adds semantics where none exists natively. \`aria-label\` and \`aria-labelledby\` give an accessible name; \`aria-expanded\`, \`aria-selected\`, \`aria-current\` describe state; \`aria-live="polite"\` or \`"assertive"\` announces dynamic changes.
2. **Focus management.** A visible indicator via \`:focus-visible\` — never remove the outline without a replacement. Modals need a **focus trap** inside, \`aria-modal="true"\`, and focus returned to the trigger on close. On SPA navigation move focus to the new heading or \`<main>\`, otherwise a screen reader never notices the page changed.
3. **Keyboard navigation.** Everything interactive is reachable with \`Tab\`, in a logical order, with no positive \`tabindex\`. WAI-ARIA patterns: arrow keys inside menus and tabs, \`Esc\` to close, \`Enter\`/\`Space\` to activate.

## Example

\`\`\`html
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Tab</button>
</div>
<div role="tabpanel" id="panel-1">...</div>
\`\`\`

Why this works: \`role="tablist"\` and \`role="tab"\` tell the screen reader this is a tab group, \`aria-selected\` says which one is active, and \`aria-controls\` ties the tab to its panel. The element itself stays a \`<button>\` so it gets focus and keyboard activation for free.

## What to say in the interview

> WCAG rests on the four POUR principles: perceivable — alt text, text contrast of at least 4.5 to 1, captions; operable — full keyboard control with no focus traps; understandable — predictable behaviour and clear form errors; robust — compatible with assistive technology. The target level for most projects is AA. ARIA adds semantics where there is no native equivalent, but the first rule of ARIA is not to use ARIA when a native element fits; the key attributes are \`aria-label\` for the name, \`aria-expanded\` and \`aria-selected\` for state, and \`aria-live\` for announcing dynamic changes. On focus: a visible \`:focus-visible\` ring, a focus trap in modals with focus returned to the trigger, and moving focus on SPA navigation. I check with axe DevTools and Lighthouse, but always also manually — keyboard-only and in NVDA or VoiceOver.

## Gotchas

- **\`outline: none\` with no replacement** is the most common and most blatant accessibility failure.
- **Positive \`tabindex\`** breaks the natural tab order; only \`0\` and \`-1\` are acceptable.
- **SPA navigation without moving focus** leaves the screen reader reading the old page.
- **\`aria-live="assertive"\` everywhere** turns the UI into a stream of interrupting announcements.
- **ARIA adds no behaviour**: \`role="button"\` does not make a \`<div>\` focusable or handle Enter.
- **Automated checks catch only part of the problem** — axe and Lighthouse find roughly a third; the rest needs manual mouse-free testing.`
    }
  },
  {
    id: 'web-025',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['rendering-strategies', 'ssr', 'ssg', 'csr'],
    question: {
      ru: 'Сравните CSR, SSR, SSG и ISR. Как выбрать стратегию рендеринга?',
      en: 'Compare CSR, SSR, SSG, and ISR. How do you choose a rendering strategy?'
    },
    answer: {
      ru: `## Коротко

Все четыре стратегии отвечают на один вопрос: **где и когда собирается HTML**. В браузере (CSR), на сервере на каждый запрос (SSR), на сборке заранее (SSG) или заранее, но с фоновым обновлением (ISR).

Аналогия: еда. CSR — готовите сами из полуфабрикатов дома. SSR — ресторан готовит блюдо под ваш заказ. SSG — готовая выпечка с витрины, взял и пошёл. ISR — витрина, которую пекарь регулярно обновляет свежими партиями.

## Четыре стратегии — что каждая значит

- **CSR (Client-Side Rendering).** Сервер отдаёт пустой \`<div id="app">\` и бандл JS, рендер идёт в браузере. **Плюсы**: дёшево хостить, богатая интерактивность. **Минусы**: долгий путь до контента, слабый SEO, медленный LCP на слабых устройствах.
- **SSR (Server-Side Rendering).** Сервер рендерит HTML на каждый запрос. **Плюсы**: быстрый FCP и LCP, хороший SEO, всегда актуальные данные. **Минусы**: нагрузка на сервер, выше TTFB при сложном рендере, нужна гидрация.
- **SSG (Static Site Generation).** HTML генерируется на этапе сборки. **Плюсы**: максимальная скорость (отдаётся прямо с CDN), дёшево, безопасно. **Минусы**: данные застывают на момент билда, пересборка большого сайта долгая.
- **ISR (Incremental Static Regeneration).** SSG плюс фоновое обновление страниц по таймеру или запросу, по сути stale-while-revalidate. **Плюсы**: скорость статики при обновляемых данных. **Минусы**: до регенерации пользователь может получить устаревшую версию.

## Как выбирать

- **Маркетинг, блог, документация** → SSG (или ISR, если обновляется часто).
- **E-commerce и листинги с персонализацией** → SSR или ISR.
- **Дашборды за авторизацией** → CSR (SEO не нужен) или SSR-shell.
- **Контент-сайт на тысячи страниц с периодическим обновлением** → ISR.

## Пример

\`\`\`ts
// Angular: SSR для корня, но тяжёлый блок — только при появлении в viewport
@defer (on viewport) {
  <app-heavy-chart />
} @placeholder {
  <div class="skeleton"></div>
}
\`\`\`

Почему так: стратегия выбирается не на всё приложение, а по маршруту и даже по блоку. Быстрый серверный HTML сверху, тяжёлая интерактивность — лениво.

## Что сказать на собеседовании

> CSR отдаёт пустой div и бандл, всё рисуется в браузере: дёшево хостить и удобно для интерактивных приложений, но плохой SEO и медленный LCP на слабых устройствах. SSR рендерит HTML на каждый запрос: быстрый FCP и LCP, рабочий SEO и свежие данные, но нагрузка на сервер, выше TTFB и нужна гидрация. SSG генерирует HTML на сборке: максимально быстро с CDN и дёшево, но данные застывают на момент билда. ISR — это SSG с фоновой регенерацией по таймеру, то есть stale-while-revalidate: скорость статики при обновляемых данных, ценой того, что до регенерации может отдаться устаревшая версия. Выбираю по маршруту, а не на всё приложение: маркетинг и документация — SSG или ISR, e-commerce — SSR или ISR, дашборды за логином — CSR. Современный подход гибридный: статичный shell, SSR для динамики и частичная гидрация.

## Ловушки

- **SSR не бесплатен**: тяжёлый серверный рендер поднимает TTFB, и суммарно может выйти медленнее CSR с хорошим кэшем.
- **Гидрация — отдельная стоимость**: HTML пришёл быстро, но до конца гидрации страница не отвечает, и страдает INP.
- **SSG на десятки тысяч страниц** превращает сборку в многочасовую — тут и нужен ISR.
- **Персонализация ломает кэш**: страницу с именем пользователя нельзя раздать с CDN целиком.
- **ISR отдаёт устаревшее** — для цен и остатков это может быть неприемлемо.
- Спросят следом: что такое островная архитектура, partial/incremental hydration и streaming SSR.`,
      en: `## In short

All four strategies answer one question: **where and when the HTML is assembled**. In the browser (CSR), on the server per request (SSR), at build time (SSG), or at build time with background refresh (ISR).

Analogy: food. CSR is cooking at home from raw ingredients. SSR is a restaurant cooking your dish to order. SSG is a ready-made pastry on the counter — grab and go. ISR is that same counter, restocked with fresh batches on a schedule.

## The four strategies — what each one means

- **CSR (Client-Side Rendering).** The server sends an empty \`<div id="app">\` plus a JS bundle; rendering happens in the browser. **Pros**: cheap hosting, rich interactivity. **Cons**: slow time-to-content, weak SEO, slow LCP on low-end devices.
- **SSR (Server-Side Rendering).** The server renders HTML on every request. **Pros**: fast FCP and LCP, working SEO, always-fresh data. **Cons**: server load, higher TTFB for complex renders, hydration required.
- **SSG (Static Site Generation).** HTML is generated at build time. **Pros**: maximum speed (served straight from a CDN), cheap, secure. **Cons**: data is frozen at build time, and rebuilding a large site takes forever.
- **ISR (Incremental Static Regeneration).** SSG plus background regeneration on a timer or on request — essentially stale-while-revalidate. **Pros**: static-level speed with refreshable data. **Cons**: until regeneration completes a user may get the stale version.

## How to choose

- **Marketing, blog, docs** → SSG (or ISR if it updates often).
- **E-commerce and listings with personalization** → SSR or ISR.
- **Dashboards behind auth** → CSR (no SEO needed) or an SSR shell.
- **A content site with thousands of pages updated periodically** → ISR.

## Example

\`\`\`ts
// Angular: SSR for the shell, but the heavy block only when it scrolls into view
@defer (on viewport) {
  <app-heavy-chart />
} @placeholder {
  <div class="skeleton"></div>
}
\`\`\`

Why this works: the strategy is chosen per route — and even per block — not for the whole app. Fast server HTML up top, heavy interactivity lazily.

## What to say in the interview

> CSR ships an empty div and a bundle and renders in the browser: cheap to host and good for interactive apps, but weak SEO and slow LCP on low-end devices. SSR renders HTML per request: fast FCP and LCP, working SEO and fresh data, at the cost of server load, higher TTFB and hydration. SSG generates HTML at build time: fastest possible from a CDN and cheap, but the data is frozen at build. ISR is SSG with background regeneration on a timer — stale-while-revalidate — giving static speed with refreshable data, at the price of possibly serving a stale version until regeneration. I choose per route rather than for the whole app: marketing and docs get SSG or ISR, e-commerce gets SSR or ISR, dashboards behind login get CSR. The modern answer is hybrid: a static shell, SSR for dynamic parts, and partial hydration.

## Gotchas

- **SSR is not free**: a heavy server render raises TTFB, and the total can end up slower than well-cached CSR.
- **Hydration is its own cost**: the HTML arrives fast, but the page does not respond until hydration finishes, which hurts INP.
- **SSG across tens of thousands of pages** turns builds into multi-hour jobs — that is exactly what ISR is for.
- **Personalization breaks caching**: a page containing the user's name cannot be served wholesale from a CDN.
- **ISR serves stale content** — unacceptable for prices and stock levels.
- Expect the follow-up: what islands architecture, partial/incremental hydration and streaming SSR are.`
    }
  },
  {
    id: 'web-026',
    category: 'html-css-performance',
    level: 'Expert',
    tags: ['angular', 'hydration', 'ssr'],
    question: {
      ru: 'Как работает гидрация в Angular Universal? Что такое non-destructive hydration?',
      en: 'How does hydration work in Angular Universal? What is non-destructive hydration?'
    },
    answer: {
      ru: `## Коротко

SSR отдаёт готовый HTML, но он «мёртвый»: кнопки не нажимаются. **Гидрация** — это когда Angular на клиенте подхватывает уже существующий серверный DOM и оживляет его, навешивая обработчики и состояние.

Аналогия: манекен в витрине уже одет и стоит в нужной позе. Гидрация не переодевает его заново — она просто «вставляет батарейки», чтобы он начал двигаться.

## Как это работает по шагам

1. Сервер рендерит HTML и отдаёт его браузеру — пользователь сразу видит контент, FCP и LCP хорошие.
2. Приезжает JS-бандл, Angular стартует и должен связать своё дерево компонентов с уже отрисованным DOM.
3. **Destructive (старый подход до v16)**: Angular **удалял** серверный DOM и рендерил всё заново. Отсюда мерцание, лишний пересчёт layout и испорченные CLS и LCP.
4. **Non-destructive hydration (v16+, \`provideClientHydration()\`)**: Angular **переиспользует** существующие узлы, сопоставляя их со своим деревом, и только доцепляет слушатели событий и состояние. Ни повторного рендера, ни мерцания.
5. Условие работы: серверный и клиентский рендер должны дать **идентичный** DOM. Иначе hydration mismatch — ошибка \`NG0500\`. Типичные причины: прямые манипуляции с DOM, \`Date.now()\`, случайные значения, невалидный HTML.

## Пример

\`\`\`ts
bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration(
      withEventReplay(),         // буферизуем события до гидрации и воспроизводим
      withIncrementalHydration() // гидрируем @defer-блоки по требованию
    ),
  ],
});
\`\`\`

Почему так: \`withEventReplay()\` ловит клики, случившиеся до того, как блок ожил, и проигрывает их после — пользователь не теряет действие. \`withIncrementalHydration()\` откладывает гидрацию блоков до реальной необходимости.

## Deferrable views и частичная гидрация

- **\`@defer\` (v17+)** откладывает загрузку и рендер блока до триггера: \`on viewport\`, \`on interaction\`, \`on idle\`. Фактически это code splitting прямо в шаблоне.
- **Incremental / event-replay hydration (v18+)** — гидрация по требованию: блок становится интерактивным только при взаимодействии, а события до этого буферизуются и воспроизводятся. Меньше JS исполняется на старте, лучше INP и TBT.
- **\`ngSkipHydration\`** — пометить компонент, который гидрировать нельзя: например, сторонний виджет, который сам мутирует DOM.

## Что сказать на собеседовании

> SSR отдаёт готовый HTML, но без JS он неинтерактивен, и гидрация — это процесс, в котором Angular на клиенте подхватывает серверный DOM и восстанавливает интерактивность. До шестнадцатой версии гидрация была destructive: Angular сносил серверный DOM и рендерил заново, отсюда мерцание и плохие CLS и LCP. С v16 появился \`provideClientHydration()\` и non-destructive hydration — Angular переиспользует существующие узлы и только навешивает слушатели и состояние. Обязательное условие: серверный и клиентский рендер дают идентичный DOM, иначе mismatch с ошибкой NG0500; причины обычно в прямых манипуляциях с DOM, \`Date.now()\` или случайных значениях, а проблемный компонент можно пометить \`ngSkipHydration\`. Дальше идут \`@defer\` в v17 и incremental hydration с event replay в v18 — они гидрируют блок только при взаимодействии, уменьшая стартовый JS и улучшая INP.

## Ловушки

- **NG0500 hydration mismatch** — почти всегда это \`Date.now()\`, \`Math.random()\`, обращение к \`window\` или невалидная вложенность тегов.
- **Невалидный HTML** (например, \`<div>\` внутри \`<p>\`) браузер молча исправляет — и DOM перестаёт совпадать с серверным.
- **Сторонние библиотеки, мутирующие DOM**, ломают гидрацию: им нужен \`ngSkipHydration\`.
- **Быстрый LCP не означает быстрый INP**: до конца гидрации страница выглядит готовой, но не отвечает — именно это лечит event replay.
- **\`@defer\` с триггером \`on viewport\` требует placeholder**, иначе поедет layout и вырастет CLS.
- Спросят следом: чем гидрация отличается от resumability (подход Qwik) и что такое streaming SSR.`,
      en: `## In short

SSR delivers ready HTML, but it is "dead": buttons do nothing. **Hydration** is Angular on the client picking up that existing server DOM and bringing it to life by attaching handlers and state.

Analogy: a shop-window mannequin is already dressed and posed. Hydration does not re-dress it — it just puts the batteries in so it starts moving.

## How it works, step by step

1. The server renders HTML and ships it — the user sees content immediately, so FCP and LCP are good.
2. The JS bundle arrives, Angular boots, and it must bind its component tree to the already-painted DOM.
3. **Destructive (the pre-v16 approach)**: Angular **threw away** the server DOM and re-rendered everything. Hence flicker, extra layout work, and damaged CLS and LCP.
4. **Non-destructive hydration (v16+, \`provideClientHydration()\`)**: Angular **reuses** the existing nodes, matching them against its own tree, and only attaches event listeners and state. No re-render, no flicker.
5. The precondition: server and client render must produce **identical** DOM. Otherwise you get a hydration mismatch — error \`NG0500\`. Typical causes: direct DOM manipulation, \`Date.now()\`, random values, invalid HTML.

## Example

\`\`\`ts
bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration(
      withEventReplay(),         // buffer events fired before hydration, then replay
      withIncrementalHydration() // hydrate @defer blocks on demand
    ),
  ],
});
\`\`\`

Why this works: \`withEventReplay()\` captures clicks that happen before a block comes alive and replays them afterwards, so the user never loses an action. \`withIncrementalHydration()\` postpones hydrating blocks until they are actually needed.

## Deferrable views and partial hydration

- **\`@defer\` (v17+)** defers loading and rendering a block until a trigger: \`on viewport\`, \`on interaction\`, \`on idle\`. Effectively code splitting right in the template.
- **Incremental / event-replay hydration (v18+)** — on-demand hydration: a block becomes interactive only on interaction, and events until then are buffered and replayed. Less JS executed at startup, better INP and TBT.
- **\`ngSkipHydration\`** marks a component that must not be hydrated — a third-party widget that mutates the DOM itself, for example.

## What to say in the interview

> SSR ships ready HTML, but without JS it is not interactive, and hydration is the process where Angular on the client picks up that server DOM and restores interactivity. Before v16 hydration was destructive: Angular tore down the server DOM and re-rendered, causing flicker and bad CLS and LCP. Version 16 introduced \`provideClientHydration()\` and non-destructive hydration — Angular reuses the existing nodes and only attaches listeners and state. The requirement is that server and client render produce identical DOM, otherwise you hit a mismatch with error NG0500; the usual causes are direct DOM manipulation, \`Date.now()\` or random values, and a problematic component can be marked \`ngSkipHydration\`. On top of that, v17 added \`@defer\` and v18 added incremental hydration with event replay — a block hydrates only on interaction, cutting startup JS and improving INP.

## Gotchas

- **NG0500 hydration mismatch** is almost always \`Date.now()\`, \`Math.random()\`, touching \`window\`, or invalid tag nesting.
- **Invalid HTML** (a \`<div>\` inside a \`<p>\`, say) is silently corrected by the browser — and then the DOM no longer matches the server's.
- **Third-party libraries that mutate the DOM** break hydration: they need \`ngSkipHydration\`.
- **A fast LCP does not mean a fast INP**: until hydration completes the page looks ready but does not respond — exactly what event replay addresses.
- **\`@defer\` with an \`on viewport\` trigger needs a placeholder**, otherwise the layout shifts and CLS grows.
- Expect the follow-up: how hydration differs from resumability (the Qwik approach) and what streaming SSR is.`
    },
    codeSnippet: `// main.ts — enable non-destructive + incremental hydration
bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration(
      withEventReplay(),        // buffer & replay events before hydration
      withIncrementalHydration() // hydrate @defer blocks on demand
    ),
  ],
});`
  },
  {
    id: 'web-027',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['bundle', 'code-splitting', 'tree-shaking'],
    question: {
      ru: 'Объясните code splitting, tree shaking и ленивую загрузку маршрутов. Как уменьшить размер бандла?',
      en: 'Explain code splitting, tree shaking, and lazy route loading. How do you reduce bundle size?'
    },
    answer: {
      ru: `## Коротко

**Code splitting** режет один огромный бандл на чанки, которые качаются по требованию. **Tree shaking** выбрасывает из чанков код, который вообще нигде не используется. **Ленивая загрузка маршрутов** — самый простой способ применить и то, и другое.

Аналогия: багаж на регистрации. Code splitting — не тащить весь гардероб в ручной клади, а сдать часть и получить позже. Tree shaking — выложить дома вещи, которые точно не наденете.

## Как это работает по шагам

1. **Ленивая загрузка маршрутов.** Код страницы попадает в отдельный чанк, и пользователь скачивает его только при переходе. Меньше initial bundle → быстрее TTI и LCP.
2. **Tree shaking.** Сборщик (esbuild, Rollup, webpack) анализирует **статические** ES-модули и выбрасывает всё, на что нет ссылок. Работает при трёх условиях: используется ESM, а не CommonJS; у пакета нет побочных эффектов (\`"sideEffects": false\` в package.json); импортируются конкретные символы, а не модуль целиком.
3. **Динамический \`import()\`** — для тяжёлых, редко нужных библиотек: график, редактор, PDF-генератор.
4. **\`@defer\`** в Angular — то же самое, но на уровне шаблона: блок и его код грузятся по триггеру.
5. **Анализ**: source-map-explorer или webpack-bundle-analyzer покажут, кто именно «толстый».

## Пример

\`\`\`ts
export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component')
      .then((m) => m.AdminComponent),
  },
];
\`\`\`

Почему так: \`import()\` внутри стрелки — это точка разрыва бандла. Сборщик видит динамический импорт и выносит всё поддерево админки в отдельный чанк, который не попадёт в стартовую загрузку.

## Что ещё убирает килобайты

- **Замена тяжёлых библиотек на лёгкие**: moment → date-fns или dayjs.
- **Точечные импорты**: \`import { debounce } from 'lodash-es'\` вместо всего lodash.
- **Минификация и сжатие** gzip или brotli на сервере/CDN.
- **Удаление полифилов** для браузеров, которые вы больше не поддерживаете.

## Что сказать на собеседовании

> Code splitting — это разбиение кода на чанки, загружаемые по требованию; базовый приём в Angular это ленивая загрузка маршрутов через \`loadComponent\` с динамическим \`import()\`, тогда код страницы качается только при переходе на неё и начальный бандл меньше. Tree shaking — удаление неиспользуемого кода сборщиком; он работает только на статических ES-модулях, поэтому нужен ESM вместо CommonJS, флаг \`sideEffects: false\` в package.json и точечные импорты конкретных символов, а не всей библиотеки. Дополнительно использую динамический импорт для тяжёлых редких зависимостей, \`@defer\` для отложенного рендера, замену тяжёлых библиотек лёгкими и brotli на CDN. Слежу за размером JS и за TBT: килобайт JavaScript дороже килобайта картинки, потому что его нужно ещё распарсить и исполнить. Смотрю состав бандла через source-map-explorer.

## Ловушки

- **CommonJS-зависимость убивает tree shaking** — Angular CLI даже предупреждает об этом при сборке.
- **\`import * as _ from 'lodash'\`** тянет всю библиотеку; нужен \`lodash-es\` и именованные импорты.
- **Побочные эффекты в модуле** (код на верхнем уровне) запрещают сборщику его выкинуть.
- **Слишком мелкое дробление** плодит десятки запросов и водопад — на HTTP/2 терпимо, но не бесплатно.
- **Экономия байтов ≠ экономия времени**: 100 КБ JS парсится и исполняется дольше, чем скачивается 100 КБ картинки.
- **Prefetch чанков** может съесть мобильный трафик — включайте осознанно.`,
      en: `## In short

**Code splitting** cuts one giant bundle into chunks fetched on demand. **Tree shaking** strips out code that is never referenced anywhere. **Lazy route loading** is the simplest way to get both at once.

Analogy: luggage at check-in. Code splitting is not dragging your whole wardrobe as hand baggage — you check part of it and collect it later. Tree shaking is leaving at home the clothes you will definitely never wear.

## How it works, step by step

1. **Lazy route loading.** A page's code goes into its own chunk and is downloaded only when the user navigates there. Smaller initial bundle → faster TTI and LCP.
2. **Tree shaking.** The bundler (esbuild, Rollup, webpack) analyses **static** ES modules and drops anything unreferenced. It needs three conditions: ESM rather than CommonJS; no side effects (\`"sideEffects": false\` in package.json); and importing specific symbols rather than whole modules.
3. **Dynamic \`import()\`** — for heavy, rarely needed libraries: a chart, an editor, a PDF generator.
4. **\`@defer\`** in Angular does the same at template level: the block and its code load on a trigger.
5. **Analysis**: source-map-explorer or webpack-bundle-analyzer show you exactly who is fat.

## Example

\`\`\`ts
export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component')
      .then((m) => m.AdminComponent),
  },
];
\`\`\`

Why this works: the \`import()\` inside the arrow function is a bundle split point. The bundler sees the dynamic import and moves the whole admin subtree into a separate chunk that never enters the initial download.

## What else removes kilobytes

- **Swapping heavy libraries for light ones**: moment → date-fns or dayjs.
- **Targeted imports**: \`import { debounce } from 'lodash-es'\` instead of all of lodash.
- **Minification plus gzip or brotli** on the server/CDN.
- **Dropping polyfills** for browsers you no longer support.

## What to say in the interview

> Code splitting means breaking the code into chunks loaded on demand; in Angular the basic technique is lazy route loading via \`loadComponent\` with a dynamic \`import()\`, so a page's code is only fetched when the user navigates there and the initial bundle shrinks. Tree shaking is the bundler removing unused code; it only works on static ES modules, so you need ESM rather than CommonJS, the \`sideEffects: false\` flag in package.json, and targeted imports of specific symbols instead of whole libraries. On top of that I use dynamic imports for heavy rare dependencies, \`@defer\` for deferred rendering, lighter library replacements, and brotli on the CDN. I track JS size and Total Blocking Time, because a kilobyte of JavaScript costs more than a kilobyte of image — it still has to be parsed and executed. I inspect the composition with source-map-explorer.

## Gotchas

- **A CommonJS dependency kills tree shaking** — the Angular CLI even warns about it at build time.
- **\`import * as _ from 'lodash'\`** pulls in the entire library; use \`lodash-es\` and named imports.
- **Side effects at module top level** forbid the bundler from dropping the module.
- **Over-splitting** creates dozens of requests and a waterfall — tolerable on HTTP/2, but not free.
- **Fewer bytes ≠ less time**: 100 KB of JS takes longer to parse and execute than 100 KB of image takes to download.
- **Prefetching chunks** can eat a user's mobile data — enable it deliberately.`
    }
  },
  {
    id: 'web-028',
    category: 'network-browser',
    level: 'Hard',
    tags: ['caching', 'http-headers', 'etag'],
    question: {
      ru: 'Как работают HTTP-заголовки кэширования (Cache-Control, ETag)? Опишите стратегию для статики и API.',
      en: 'How do HTTP caching headers (Cache-Control, ETag) work? Describe a strategy for static assets and APIs.'
    },
    answer: {
      ru: `## Коротко

HTTP-кэш решает две задачи: **как долго ответ считается свежим** (это \`Cache-Control\`) и **как дёшево проверить, не устарел ли он** (это \`ETag\`). Свежее берём из кэша бесплатно, устаревшее подтверждаем ответом \`304\` без тела.

Аналогия: холодильник, магазин у дома, склад. Холодильник — кэш браузера, бежать никуда не надо. Магазин — CDN edge, близко. Склад — origin, далеко и дорого. Задача — как можно чаще обходиться холодильником.

## Как это работает по шагам

1. Сервер отдаёт ресурс с \`Cache-Control\`. Ключевые директивы: \`max-age=31536000\` — сколько секунд ответ свежий; \`immutable\` — не перепроверять до истечения (для версионированных файлов); \`no-cache\` — кэшировать можно, но перед использованием **обязательно ревалидировать**; \`no-store\` — не кэшировать вообще (чувствительные данные); \`private\`/\`public\` — можно ли класть в кэш CDN и прокси; \`stale-while-revalidate\` — отдать устаревшее сразу, обновить в фоне.
2. Пока ресурс свежий, браузер берёт его из кэша **без единого запроса**.
3. Когда свежесть истекла, включается валидация. \`ETag\` — это хэш или версия ресурса; браузер шлёт \`If-None-Match: <etag>\`.
4. Если ничего не изменилось, сервер отвечает **\`304 Not Modified\`** без тела — заплатили только за заголовки. Так же работает пара \`Last-Modified\` + \`If-Modified-Since\`.
5. Слои кэша выстраиваются цепочкой: **browser cache → Service Worker → CDN edge → origin**. Правильно настроенный CDN снимает основную нагрузку и режет TTFB.

## Пример

\`\`\`
# статика с хэшем в имени — кэшируем навечно, инвалидируем именем файла
GET /app.4f3a1c.js
Cache-Control: public, max-age=31536000, immutable

# HTML-точка входа — не кэшируем, всегда подтягиваем свежие ссылки
GET /index.html
Cache-Control: no-cache

# API — дешёвая ревалидация через ETag
GET /api/profile
Cache-Control: private, no-cache
ETag: "v3-9af2"
# следующий запрос: If-None-Match: "v3-9af2" -> 304 Not Modified
\`\`\`

Почему так: это и есть **cache busting**. При деплое меняется хэш в имени файла, значит меняется URL, значит браузер обязан скачать заново. А \`index.html\` с \`no-cache\` гарантирует, что пользователь увидит новые ссылки сразу.

## Стратегия для API

- **Часто меняющиеся данные**: \`no-cache\` + \`ETag\` — дешёвая ревалидация без передачи тела.
- **Редко меняющиеся справочники**: небольшой \`max-age\` + \`stale-while-revalidate\`.
- **Приватные данные**: \`private, no-store\`.

## Что сказать на собеседовании

> \`Cache-Control\` задаёт свежесть: \`max-age\` в секундах, \`immutable\` чтобы не перепроверять версионированные файлы, \`no-cache\` — кэшировать можно, но обязательно ревалидировать перед использованием, \`no-store\` — не кэшировать вовсе, \`private\` и \`public\` определяют, можно ли класть в CDN, а \`stale-while-revalidate\` разрешает отдать устаревшее и обновить в фоне. Когда свежесть истекла, включается валидация по \`ETag\`: браузер шлёт \`If-None-Match\`, и если ничего не изменилось, сервер отвечает \`304 Not Modified\` без тела. Стратегия стандартная: статика с хэшем в имени получает \`max-age=31536000, immutable\`, а \`index.html\` — \`no-cache\`, чтобы всегда подтянуть новые ссылки; для API — \`no-cache\` с ETag для изменчивых данных и \`private, no-store\` для приватных. И помню про слои: браузер, Service Worker, CDN edge, origin.

## Ловушки

- **\`no-cache\` ≠ \`no-store\`** — самая частая путаница: первый кэширует и ревалидирует, второй не кэширует вообще.
- **\`immutable\` без хэша в имени файла** — гарантированный способ раздать пользователям старую версию на год.
- **ETag на кластере** может отличаться между инстансами и ломать 304 — генерируйте его детерминированно.
- **\`private\` обязателен для персонализированных ответов**, иначе CDN раздаст чужие данные.
- **Инвалидация CDN — отдельная операция**: заголовки не действуют задним числом на уже закэшированное.
- **Service Worker перебивает HTTP-кэш** — можно застрять на старой версии, несмотря на правильные заголовки.`,
      en: `## In short

HTTP caching answers two questions: **how long a response stays fresh** (that is \`Cache-Control\`) and **how cheaply we can check whether it went stale** (that is \`ETag\`). Fresh comes from cache for free; stale is confirmed with a bodyless \`304\`.

Analogy: fridge, corner shop, warehouse. The fridge is the browser cache — no trip at all. The shop is the CDN edge — nearby. The warehouse is the origin — far and expensive. The goal is to get by with the fridge as often as possible.

## How it works, step by step

1. The server sends the resource with \`Cache-Control\`. Key directives: \`max-age=31536000\` — how many seconds the response is fresh; \`immutable\` — do not revalidate before expiry (for versioned files); \`no-cache\` — caching is allowed but you **must revalidate** before use; \`no-store\` — do not cache at all (sensitive data); \`private\`/\`public\` — whether CDNs and proxies may cache it; \`stale-while-revalidate\` — serve the stale copy immediately and refresh in the background.
2. While the resource is fresh the browser serves it from cache with **no request at all**.
3. Once freshness expires, validation kicks in. The \`ETag\` is a hash or version of the resource; the browser sends \`If-None-Match: <etag>\`.
4. If nothing changed the server replies **\`304 Not Modified\`** with no body — you paid only for headers. \`Last-Modified\` + \`If-Modified-Since\` works the same way.
5. The cache layers form a chain: **browser cache → Service Worker → CDN edge → origin**. A well-configured CDN absorbs most of the load and cuts TTFB.

## Example

\`\`\`
# hashed static assets — cache forever, bust via the filename
GET /app.4f3a1c.js
Cache-Control: public, max-age=31536000, immutable

# the HTML entry point — never cache, always pull fresh references
GET /index.html
Cache-Control: no-cache

# API — cheap revalidation with an ETag
GET /api/profile
Cache-Control: private, no-cache
ETag: "v3-9af2"
# next request: If-None-Match: "v3-9af2" -> 304 Not Modified
\`\`\`

Why this works: that is **cache busting**. Each deploy changes the hash in the filename, so the URL changes, so the browser must re-download. And \`index.html\` with \`no-cache\` guarantees the user sees the new references straight away.

## Strategy for APIs

- **Frequently changing data**: \`no-cache\` + \`ETag\` — cheap revalidation with no body transfer.
- **Rarely changing reference data**: a small \`max-age\` + \`stale-while-revalidate\`.
- **Private data**: \`private, no-store\`.

## What to say in the interview

> \`Cache-Control\` defines freshness: \`max-age\` in seconds, \`immutable\` to skip revalidating versioned files, \`no-cache\` meaning cache but always revalidate before use, \`no-store\` meaning do not cache at all, \`private\` versus \`public\` deciding whether a CDN may store it, and \`stale-while-revalidate\` allowing a stale response while refreshing in the background. Once freshness expires, validation runs via the \`ETag\`: the browser sends \`If-None-Match\`, and if nothing changed the server answers \`304 Not Modified\` with no body. The standard strategy is hashed static assets with \`max-age=31536000, immutable\` and \`index.html\` with \`no-cache\` so new references are picked up immediately; for APIs, \`no-cache\` with an ETag for volatile data and \`private, no-store\` for private data. And I keep the layers in mind: browser, Service Worker, CDN edge, origin.

## Gotchas

- **\`no-cache\` ≠ \`no-store\`** — the classic confusion: the first caches and revalidates, the second never caches.
- **\`immutable\` without a hash in the filename** is a guaranteed way to serve a year-old version.
- **ETags across a cluster** can differ between instances and break 304s — generate them deterministically.
- **\`private\` is mandatory for personalized responses**, otherwise a CDN serves one user's data to another.
- **CDN invalidation is a separate operation**: headers do not retroactively affect what is already cached.
- **A Service Worker overrides the HTTP cache** — you can be stuck on an old version despite perfect headers.`
    },
    codeSnippet: `# Hashed static assets — cache forever, bust via filename
GET /app.4f3a1c.js
Cache-Control: public, max-age=31536000, immutable

# HTML entry — never cache, always revalidate links
GET /index.html
Cache-Control: no-cache

# API response — cheap revalidation with ETag
GET /api/profile
Cache-Control: private, no-cache
ETag: "v3-9af2"
# Next request: If-None-Match: "v3-9af2" -> 304 Not Modified`
  },
  {
    id: 'web-029',
    category: 'network-browser',
    level: 'Hard',
    tags: ['service-worker', 'pwa', 'caching'],
    question: {
      ru: 'Что такое Service Worker и PWA? Какие стратегии кэширования вы знаете?',
      en: 'What is a Service Worker and a PWA? Which caching strategies do you know?'
    },
    answer: {
      ru: `## Коротко

Service Worker — это **скрипт-посредник между приложением и сетью**, живущий в отдельном потоке. Он перехватывает каждый \`fetch\` и решает: отдать из кэша, сходить в сеть или скомбинировать. PWA — это веб-приложение, которое благодаря SW и манифесту устанавливается и работает как нативное.

Аналогия: консьерж на входе. Каждый запрос идёт через него: за чем-то он сбегает на склад (сеть), а что-то у него уже лежит в подсобке (кэш) и выдаётся мгновенно.

## Как это работает по шагам

1. Страница регистрирует воркер. Жизненный цикл: **\`install\`** (кладём в кэш стартовые ресурсы) → **\`activate\`** (чистим старые кэши) → **\`fetch\`** (перехватываем запросы).
2. В обработчике \`fetch\` вы вызываете \`event.respondWith(...)\` и сами решаете, откуда взять ответ. Работает Cache API — постоянное хранилище запросов и ответов.
3. **PWA** = Service Worker (офлайн и кэш) + \`manifest.json\` (иконки, имя, тема, режим отображения) + HTTPS. Это даёт установку на домашний экран, офлайн-режим, фоновую синхронизацию и push.
4. **App Shell**: кэшируем «скелет» приложения — оболочку из HTML, CSS и JS, — чтобы повторный визит открывался мгновенно, а контент догружаем динамически.
5. Обновление воркера: новая версия ставится, но **ждёт**, пока закроются все вкладки со старой.

## Стратегии кэширования

- **Cache First** — сначала кэш, сеть только как fallback. Для статики, шрифтов, иконок.
- **Network First** — сначала сеть, кэш при офлайне. Для часто меняющихся данных.
- **Stale-While-Revalidate** — мгновенно отдать из кэша и обновить в фоне. Лучший баланс скорости и свежести.
- **Cache Only / Network Only** — крайние случаи.

## Пример

\`\`\`ts
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});
\`\`\`

Почему так: это Cache First в четыре строки — нашли в кэше, отдали не касаясь сети; не нашли, сходили. Для API это плохая стратегия (данные застынут), а для шрифтов и иконок — идеальная.

## Что сказать на собеседовании

> Service Worker — это прокси-скрипт между приложением и сетью, работающий в отдельном потоке. Он перехватывает событие \`fetch\`, управляет Cache API и обеспечивает офлайн и push. Жизненный цикл: install, где кэшируются стартовые ресурсы, activate, где чистятся старые кэши, и fetch. PWA — это веб-приложение, устанавливаемое как нативное: нужны Service Worker, \`manifest.json\` с иконками и темой, и HTTPS. Стратегий кэширования четыре основных: Cache First для статики и шрифтов, Network First для часто меняющихся данных, Stale-While-Revalidate как лучший баланс — отдаём из кэша мгновенно и обновляем в фоне, — плюс крайние Cache Only и Network Only. Главная ловушка — обновление воркера: новый ждёт закрытия всех вкладок, а \`skipWaiting\` с \`clients.claim\` нужно применять осторожно, чтобы не сломать активную сессию. В Angular всё это настраивается декларативно через \`@angular/pwa\` и \`ngsw-config.json\`.

## Ловушки

- **Новый воркер ждёт закрытия всех вкладок** — пользователь может неделями сидеть на старой версии.
- **\`skipWaiting()\` + \`clients.claim()\` небезопасны вслепую**: новый код встречается со старым DOM и старыми чанками.
- **Не почистили кэш в \`activate\`** — застряли на старых ассетах и получили труднообъяснимые баги.
- **Cache First для API** замораживает данные; для них нужен Network First или SWR.
- **SW работает только по HTTPS** (кроме \`localhost\`) и только в своей области видимости (scope).
- **Отладка**: DevTools → Application → Service Workers, галочки Update on reload и Bypass for network.`,
      en: `## In short

A Service Worker is a **middleman script between the app and the network**, living on its own thread. It intercepts every \`fetch\` and decides: serve from cache, go to the network, or combine both. A PWA is a web app that, thanks to a SW and a manifest, installs and behaves like a native one.

Analogy: a concierge at the entrance. Every request goes through them: some things they fetch from the warehouse (the network), others are already in the back room (the cache) and handed over instantly.

## How it works, step by step

1. The page registers the worker. Lifecycle: **\`install\`** (cache the startup assets) → **\`activate\`** (purge old caches) → **\`fetch\`** (intercept requests).
2. In the \`fetch\` handler you call \`event.respondWith(...)\` and decide where the response comes from. The Cache API backs this — persistent storage of request/response pairs.
3. **PWA** = Service Worker (offline and caching) + \`manifest.json\` (icons, name, theme, display mode) + HTTPS. That unlocks install-to-home-screen, offline mode, background sync and push.
4. **App Shell**: cache the app's skeleton — the shell HTML, CSS and JS — so a repeat visit opens instantly, and load content dynamically on top.
5. Worker updates: the new version installs but **waits** until every tab running the old one is closed.

## Caching strategies

- **Cache First** — cache first, network only as fallback. For static assets, fonts, icons.
- **Network First** — network first, cache when offline. For frequently changing data.
- **Stale-While-Revalidate** — serve from cache instantly, refresh in the background. The best speed/freshness balance.
- **Cache Only / Network Only** — edge cases.

## Example

\`\`\`ts
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});
\`\`\`

Why this works: that is Cache First in four lines — found in cache, served without touching the network; not found, fetched. A terrible strategy for APIs (data freezes) and a perfect one for fonts and icons.

## What to say in the interview

> A Service Worker is a proxy script between the app and the network, running on a separate thread. It intercepts the \`fetch\` event, drives the Cache API, and enables offline and push. Its lifecycle is install, where startup assets are cached, activate, where old caches are purged, and fetch. A PWA is a web app installable like a native one: it needs a Service Worker, a \`manifest.json\` with icons and theme, and HTTPS. There are four main caching strategies: Cache First for static assets and fonts, Network First for frequently changing data, Stale-While-Revalidate as the best balance — serve from cache immediately and refresh in the background — plus the edge cases Cache Only and Network Only. The main trap is worker updates: a new one waits for all tabs to close, and \`skipWaiting\` with \`clients.claim\` must be used carefully so you do not break an active session. In Angular this is all configured declaratively via \`@angular/pwa\` and \`ngsw-config.json\`.

## Gotchas

- **A new worker waits for every tab to close** — a user can sit on an old version for weeks.
- **\`skipWaiting()\` + \`clients.claim()\` are not safe by default**: new code meets an old DOM and old chunks.
- **Not purging caches in \`activate\`** strands users on stale assets and produces baffling bugs.
- **Cache First for APIs** freezes your data; use Network First or SWR there.
- **SWs only work over HTTPS** (except \`localhost\`) and only within their registered scope.
- **Debugging**: DevTools → Application → Service Workers, with the Update on reload and Bypass for network checkboxes.`
    }
  },
  {
    id: 'web-030',
    category: 'html-css-performance',
    level: 'Medium',
    tags: ['debounce', 'throttle', 'events'],
    question: {
      ru: 'В чём разница между debounce и throttle? Когда применять каждый для событий scroll/resize/input?',
      en: 'What is the difference between debounce and throttle? When do you use each for scroll/resize/input events?'
    },
    answer: {
      ru: `## Коротко

Оба приёма ограничивают частоту вызова дорогого обработчика на «шумных» событиях. **Debounce** ждёт, пока события **прекратятся**, и вызывает функцию один раз. **Throttle** вызывает её регулярно, но **не чаще раза в N мс**.

Аналогия: лифт. Debounce — двери закрываются через 3 секунды после того, как перестали заходить люди; зашёл ещё один — отсчёт начался заново. Throttle — лифт уезжает строго раз в минуту, сколько бы народу ни толпилось.

## Как это работает по шагам

1. **Debounce**: на каждое событие сбрасываем таймер и ставим новый. Функция выполнится **один раз после** паузы нужной длины. Если события идут без остановки — она не выполнится вообще.
2. **Применение debounce**: поиск по вводу (ждём, пока пользователь допишет), автосохранение, валидация формы, пересчёт после окончания resize.
3. **Throttle**: запоминаем время последнего вызова и пропускаем всё, что пришло раньше чем через N мс. Функция выполняется **регулярно, в процессе** потока событий.
4. **Применение throttle**: обработчики скролла (бесконечная лента, параллакс, sticky-header), отслеживание позиции мыши, аналитика прокрутки.
5. **Правило выбора**: нужен результат **после окончания** — debounce; нужны обновления **по ходу** — throttle.

## Пример

\`\`\`ts
// debounce: результат нужен после паузы
search$.pipe(
  debounceTime(300),
  distinctUntilChanged()
).subscribe(runQuery);

// throttle: обновления нужны в процессе прокрутки
scroll$.pipe(
  throttleTime(100, asyncScheduler, { leading: true, trailing: true })
).subscribe(updateStickyHeader);
\`\`\`

Почему так: у поиска ценен только последний ввод, поэтому промежуточные запросы бессмысленны и дороги. У sticky-заголовка, наоборот, нужен отклик **во время** скролла, иначе он будет «догонять» пользователя.

## Что сказать на собеседовании

> Оба ограничивают частоту вызова дорогого обработчика на шумных событиях, но по-разному. Debounce откладывает вызов, пока события не прекратятся на заданное время, и выполняет функцию один раз после паузы; типичные случаи — поиск по вводу, автосохранение, валидация формы, пересчёт после окончания resize. Throttle гарантирует вызов не чаще раза в N миллисекунд и выполняется регулярно во время потока событий; это скролл-обработчики, параллакс, sticky-header, аналитика прокрутки. Правило простое: нужен результат после окончания ввода — debounce, нужны регулярные обновления в процессе — throttle. В RxJS это \`debounceTime\`, \`throttleTime\`, а также \`auditTime\` и \`sampleTime\`. Для визуальных обновлений вместо фиксированного интервала лучше синхронизироваться с кадром через \`requestAnimationFrame\`, а слушатели скролла вешать с \`{ passive: true }\`.

## Ловушки

- **Debounce на скролле** даёт эффект «залипания»: пока пользователь скроллит, ничего не происходит.
- **Забыли очистить таймер или отписаться** при уничтожении компонента — утечка и вызов в разрушенном контексте.
- **\`{ passive: true }\` обязателен** для scroll и touch: иначе браузер ждёт, вызовете ли вы \`preventDefault\`, и тормозит прокрутку.
- **Для анимаций лучше \`requestAnimationFrame\`**, чем \`throttleTime(16)\`: кадр и таймер не синхронизированы.
- **\`leading\` и \`trailing\`** решают, сработает ли функция в начале, в конце или дважды — источник тонких багов.
- **Debounce не отменяет уже улетевший запрос**: нужен \`switchMap\`, иначе получите гонку ответов.`,
      en: `## In short

Both techniques limit how often an expensive handler runs on noisy events. **Debounce** waits for the events to **stop** and then calls the function once. **Throttle** calls it regularly, but **at most once per N ms**.

Analogy: a lift. Debounce is the doors closing three seconds after people stop entering — one more person and the countdown restarts. Throttle is a lift that departs strictly once a minute no matter how big the crowd.

## How it works, step by step

1. **Debounce**: every event clears the timer and sets a new one. The function runs **once after** a pause of the required length. If events never stop, it never runs at all.
2. **Use debounce for**: search-as-you-type (wait until the user finishes), autosave, form validation, recomputing after a resize ends.
3. **Throttle**: remember when the function last ran and skip anything arriving sooner than N ms later. The function runs **regularly, during** the event stream.
4. **Use throttle for**: scroll handlers (infinite scroll, parallax, sticky header), mouse-position tracking, scroll analytics.
5. **The rule**: need a result **after it ends** → debounce; need updates **while it happens** → throttle.

## Example

\`\`\`ts
// debounce: the result is only needed after a pause
search$.pipe(
  debounceTime(300),
  distinctUntilChanged()
).subscribe(runQuery);

// throttle: updates are needed during the scroll
scroll$.pipe(
  throttleTime(100, asyncScheduler, { leading: true, trailing: true })
).subscribe(updateStickyHeader);
\`\`\`

Why this works: for search only the final input matters, so intermediate requests are both pointless and expensive. A sticky header is the opposite — it needs to respond **during** the scroll, otherwise it visibly lags behind the user.

## What to say in the interview

> Both limit how often an expensive handler runs on noisy events, but differently. Debounce delays the call until events stop for a given period and then runs the function once; typical cases are search-as-you-type, autosave, form validation, and recomputing after a resize finishes. Throttle guarantees at most one call per N milliseconds and runs regularly during the event stream; that fits scroll handlers, parallax, sticky headers and scroll analytics. The rule is simple: need the result after input ends, use debounce; need regular updates while it happens, use throttle. In RxJS those are \`debounceTime\` and \`throttleTime\`, plus \`auditTime\` and \`sampleTime\`. For visual updates I prefer syncing to the frame with \`requestAnimationFrame\` over a fixed interval, and I always attach scroll listeners with \`{ passive: true }\`.

## Gotchas

- **Debounce on scroll** feels stuck: nothing happens at all while the user keeps scrolling.
- **Forgetting to clear the timer or unsubscribe** on destroy leaks and fires into a torn-down context.
- **\`{ passive: true }\` is mandatory** for scroll and touch: otherwise the browser waits to see whether you call \`preventDefault\` and scrolling stutters.
- **For animation prefer \`requestAnimationFrame\`** over \`throttleTime(16)\`: frames and timers are not in sync.
- **\`leading\` and \`trailing\`** decide whether the function fires at the start, at the end, or twice — a rich source of subtle bugs.
- **Debounce does not cancel an in-flight request**: you need \`switchMap\`, otherwise responses race each other.`
    },
    codeSnippet: `// RxJS: debounce search input, throttle scroll-driven work
search$.pipe(
  debounceTime(300),         // wait until typing pauses
  distinctUntilChanged()
).subscribe(runQuery);

scroll$.pipe(
  throttleTime(100, asyncScheduler, { leading: true, trailing: true })
).subscribe(updateStickyHeader);

// Generic throttle (max one call per window)
function throttle<T extends (...a: any[]) => void>(fn: T, ms: number) {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}`
  },
  {
    id: 'web-031',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['virtual-scrolling', 'lists', 'rendering'],
    question: {
      ru: 'Как работает виртуальный скроллинг? Когда он необходим и какие у него ограничения?',
      en: 'How does virtual scrolling work? When is it necessary and what are its limitations?'
    },
    answer: {
      ru: `## Коротко

Виртуальный скроллинг рендерит в DOM **только видимые строки** плюс небольшой буфер, а не все десять тысяч. По мере прокрутки узлы переиспользуются, а полная высота имитируется распоркой-spacer-ом, чтобы скроллбар был честным.

Аналогия: окно поезда. Мир снаружи огромен, но вы видите только тот кусок, что в раме. Виртуализация «показывает раму» и не строит остальной пейзаж.

## Как это работает по шагам

1. Компонент знает **общее количество** элементов и **высоту одной строки**, поэтому может посчитать полную высоту списка.
2. Эта высота создаётся распоркой — скроллбар выглядит так, будто отрисованы все элементы.
3. По позиции скролла вычисляется диапазон видимых индексов, и рендерятся только они плюс буфер сверху и снизу.
4. При прокрутке узлы не пересоздаются, а **переиспользуются** (recycling): меняются только данные внутри.
5. Итог: 10 000 строк — это 10 000+ DOM-узлов, дорогой layout, paint, память и медленный change detection. С виртуализацией в DOM всегда **~20–40 узлов** независимо от объёма данных, и initial render, память и реактивность остаются постоянными.

## Пример

\`\`\`html
<cdk-virtual-scroll-viewport itemSize="48" class="viewport">
  <div *cdkVirtualFor="let item of items" class="row">
    {{ item.name }}
  </div>
</cdk-virtual-scroll-viewport>
\`\`\`

Почему так: \`itemSize="48"\` — заявленная высота строки, из неё viewport вычисляет и полную высоту, и то, сколько элементов помещается на экран. Если реальная высота не совпадёт с заявленной, скролл поедет.

## Ограничения

- **Переменная высота строк** — главная боль: фиксированный \`itemSize\` не подходит, нужна autosize-стратегия, а она дороже и менее точна.
- **\`Ctrl+F\` и поиск по странице** не находят невидимые элементы — их просто нет в DOM.
- **SEO**: контента вне DOM для краулера не существует; для публичных страниц без SSR не годится.
- **Доступность**: скринридер и \`Tab\` видят только отрисованные узлы, поэтому нужно проставлять \`aria-rowcount\` и \`aria-setsize\`.
- **Скролл-якоря и восстановление позиции** требуют аккуратной ручной обработки.

## Что сказать на собеседовании

> Идея виртуального скроллинга — держать в DOM только видимые элементы плюс небольшой буфер, а не все тысячи. Общая высота имитируется распоркой, чтобы скроллбар был корректным, а при прокрутке узлы переиспользуются, меняются только данные. Выигрыш в том, что десять тысяч строк — это десять тысяч DOM-узлов, дорогой layout, память и медленный change detection, а с виртуализацией в DOM всегда порядка двадцати-сорока узлов независимо от объёма данных. В Angular это \`cdk-virtual-scroll-viewport\` с \`itemSize\` и директивой \`cdkVirtualFor\`. Ограничения серьёзные: переменная высота строк требует autosize-стратегии, поиск по странице и \`Ctrl+F\` не находят невидимое, SEO страдает, а для доступности нужно вручную проставлять \`aria-rowcount\` и \`aria-setsize\`. Для умеренных списков часто достаточно \`content-visibility: auto\` или обычной пагинации.

## Ловушки

- **Неверный \`itemSize\`** ломает и позицию скролла, и высоту полосы прокрутки.
- **Виртуализация ради пары сотен строк** — преждевременная оптимизация; сначала \`content-visibility: auto\` или пагинация.
- **Тяжёлые строки всё равно тормозят**: 30 сложных компонентов на экране могут стоить дороже 1000 простых div.
- **Вложенный скролл и sticky-заголовки** плохо дружат с viewport-ом CDK.
- **Потеря состояния при переиспользовании узла** — раскрытая строка «переезжает» на другую при скролле, если не следить за \`trackBy\`.
- Спросят следом: чем виртуализация отличается от бесконечной прокрутки и от \`content-visibility\` (тут DOM реально маленький, там он полный).`,
      en: `## In short

Virtual scrolling renders **only the visible rows** in the DOM plus a small buffer, instead of all ten thousand. As you scroll, nodes are recycled, and the full height is faked with a spacer so the scrollbar stays honest.

Analogy: a train window. The world outside is vast, but you only see the slice inside the frame. Virtualization "shows the frame" and never builds the rest of the landscape.

## How it works, step by step

1. The component knows the **total item count** and the **height of one row**, so it can compute the full list height.
2. That height is produced by a spacer — the scrollbar looks exactly as if everything were rendered.
3. From the scroll position it derives the range of visible indices and renders only those, plus a buffer above and below.
4. While scrolling, nodes are not recreated but **recycled**: only the data inside them changes.
5. The payoff: 10,000 rows means 10,000+ DOM nodes, expensive layout and paint, memory pressure and slow change detection. With virtualization the DOM always holds **~20–40 nodes** regardless of data size, so initial render, memory and reactivity stay constant.

## Example

\`\`\`html
<cdk-virtual-scroll-viewport itemSize="48" class="viewport">
  <div *cdkVirtualFor="let item of items" class="row">
    {{ item.name }}
  </div>
</cdk-virtual-scroll-viewport>
\`\`\`

Why this works: \`itemSize="48"\` is the declared row height, from which the viewport derives both the total height and how many items fit on screen. If the real height differs from the declared one, the scroll drifts.

## Limitations

- **Variable row heights** are the big pain: a fixed \`itemSize\` no longer fits and you need an autosize strategy, which is costlier and less accurate.
- **\`Ctrl+F\` and in-page search** cannot find off-screen items — they are simply not in the DOM.
- **SEO**: content outside the DOM does not exist for a crawler; unsuitable for public pages without SSR.
- **Accessibility**: screen readers and \`Tab\` only see rendered nodes, so you must set \`aria-rowcount\` and \`aria-setsize\` yourself.
- **Scroll anchoring and position restoration** need careful manual handling.

## What to say in the interview

> The idea of virtual scrolling is to keep only the visible items in the DOM plus a small buffer, instead of all thousands. The total height is faked with a spacer so the scrollbar is correct, and while scrolling the nodes are recycled with only their data swapped. The win is that ten thousand rows means ten thousand DOM nodes, expensive layout, memory pressure and slow change detection, whereas with virtualization the DOM always holds around twenty to forty nodes regardless of data size. In Angular that is \`cdk-virtual-scroll-viewport\` with \`itemSize\` and the \`cdkVirtualFor\` directive. The limitations are real: variable row heights need an autosize strategy, in-page search and \`Ctrl+F\` cannot find hidden rows, SEO suffers, and for accessibility you must set \`aria-rowcount\` and \`aria-setsize\` manually. For moderate lists \`content-visibility: auto\` or plain pagination is often enough.

## Gotchas

- **A wrong \`itemSize\`** breaks both the scroll position and the scrollbar length.
- **Virtualizing a couple of hundred rows** is premature optimization; try \`content-visibility: auto\` or pagination first.
- **Heavy rows still hurt**: 30 complex components on screen can cost more than 1000 plain divs.
- **Nested scrolling and sticky headers** interact badly with the CDK viewport.
- **State lost on node recycling**: an expanded row can "jump" to a different item during scroll if \`trackBy\` is wrong.
- Expect the follow-up: how virtualization differs from infinite scroll and from \`content-visibility\` (here the DOM really is small; there it is complete).`
    }
  },
  {
    id: 'web-032',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['requestanimationframe', 'requestidlecallback', 'scheduling'],
    question: {
      ru: 'В чём разница между requestAnimationFrame и requestIdleCallback? Когда использовать каждый?',
      en: 'What is the difference between requestAnimationFrame and requestIdleCallback? When do you use each?'
    },
    answer: {
      ru: `## Коротко

Оба API откладывают работу, но на **разные моменты кадра**. \`requestAnimationFrame\` — «сделай это прямо перед следующей отрисовкой». \`requestIdleCallback\` — «сделай это, когда браузеру нечем заняться».

Аналогия: rAF — успеть накрыть на стол ровно к приходу гостей, ни раньше ни позже. rIC — помыть окна, когда выдастся свободная минута, а если её не будет — не помыть вовсе.

## Как это работает по шагам

1. **rAF**: колбэк вызывается **прямо перед следующей перерисовкой**, синхронно с частотой обновления экрана — обычно 60 Гц, то есть **~16.7 мс** на кадр. Идеален для визуальных обновлений: анимаций, чтения и записи DOM в правильной фазе кадра.
2. Бонус rAF: в **фоновых вкладках он не выполняется** — экономит батарею; и он всегда совпадает с кадром, поэтому анимация не «рваная».
3. **rIC**: колбэк выполняется, когда браузер **простаивает** в конце кадра. В колбэк приходит \`deadline\`, у которого можно спросить \`timeRemaining()\` — сколько миллисекунд ещё можно занять.
4. rIC предназначен для **некритичной фоновой** работы: отправка аналитики, предзагрузка, дедупликация кэша, ленивая инициализация.
5. **Выбор инструмента**: анимация, скролл-эффекты и покадровые чтения DOM — \`requestAnimationFrame\`; фоновая некритичная работа и предзагрузка — \`requestIdleCallback\`; дробление длинной задачи ради INP — \`scheduler.postTask()\` или \`scheduler.yield()\`.

## Пример

\`\`\`ts
// rAF: анимация синхронно с кадром
function animate(time: number) {
  el.style.transform = 'translateX(' + ((time / 10) % 200) + 'px)';
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// rIC: разгребаем очередь, пока есть свободное время в кадре
requestIdleCallback((deadline) => {
  while (deadline.timeRemaining() > 0 && tasks.length) {
    runTask(tasks.shift());
  }
}, { timeout: 2000 });
\`\`\`

Почему так: в rAF мы двигаем \`transform\` — compositor-only свойство, значит анимация укладывается в бюджет кадра. В rIC мы работаем **только пока \`timeRemaining()\` больше нуля**, поэтому не залезаем в следующий кадр и не портим INP.

## Что сказать на собеседовании

> \`requestAnimationFrame\` вызывает колбэк прямо перед следующей перерисовкой, синхронно с частотой обновления экрана — при 60 Гц это примерно 16.7 миллисекунды на кадр. Он нужен для визуальных обновлений: анимаций и чтения-записи DOM в правильной фазе кадра. Дополнительный плюс — в фоновых вкладках он не выполняется, что экономит батарею. \`requestIdleCallback\` наоборот вызывается, когда браузер простаивает в конце кадра, и передаёт дедлайн с методом \`timeRemaining()\`; он для некритичной фоновой работы — аналитики, предзагрузки, ленивой инициализации. Главная ловушка rIC в том, что на занятой странице он может долго не вызываться, поэтому задаю \`timeout\` как страховку; поддержка в Safari исторически была слабая. Тяжёлые вычисления в rAF класть нельзя — они съедают бюджет кадра и дают дропы; для дробления длинных задач есть \`scheduler.postTask\` и \`scheduler.yield\`.

## Ловушки

- **Тяжёлые вычисления в rAF** съедают бюджет кадра и приводят к пропущенным кадрам — ровно то, от чего вы бежали.
- **rIC может не вызваться вовсе**, если страница постоянно занята: всегда задавайте \`{ timeout }\`.
- **Слабая поддержка rIC в Safari** — нужен фолбэк на \`setTimeout\`.
- **rAF не выполняется в фоновой вкладке**: таймер на нём «замерзает», и логика, привязанная ко времени, разъезжается.
- **Забыли \`cancelAnimationFrame\`** при уничтожении компонента — цикл продолжает крутиться вечно.
- **rIC — не для DOM-записи**: изменение стилей в idle-фазе вызовет лишний кадр; для визуального используйте rAF.`,
      en: `## In short

Both APIs defer work, but to **different moments in the frame**. \`requestAnimationFrame\` means "do this right before the next repaint". \`requestIdleCallback\` means "do this when the browser has nothing better to do".

Analogy: rAF is laying the table exactly as the guests arrive — not earlier, not later. rIC is cleaning the windows whenever a spare moment appears, and if none appears, not at all.

## How it works, step by step

1. **rAF**: the callback runs **right before the next repaint**, in sync with the screen refresh rate — usually 60 Hz, so about **16.7 ms** per frame. Ideal for visual updates: animations, and reading or writing the DOM in the correct frame phase.
2. Bonus: rAF **does not run in background tabs**, which saves battery, and it always aligns with the frame, so animation never tears.
3. **rIC**: the callback runs when the browser is **idle** at the end of a frame. It receives a \`deadline\` object whose \`timeRemaining()\` tells you how many milliseconds you may still use.
4. rIC is for **non-critical background** work: sending analytics, prefetching, cache dedup, lazy initialization.
5. **Choosing**: animation, scroll effects and per-frame DOM reads → \`requestAnimationFrame\`; background non-critical work and prefetching → \`requestIdleCallback\`; splitting a long task for INP → \`scheduler.postTask()\` or \`scheduler.yield()\`.

## Example

\`\`\`ts
// rAF: animation in sync with the frame
function animate(time: number) {
  el.style.transform = 'translateX(' + ((time / 10) % 200) + 'px)';
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// rIC: drain a queue while there is spare time in the frame
requestIdleCallback((deadline) => {
  while (deadline.timeRemaining() > 0 && tasks.length) {
    runTask(tasks.shift());
  }
}, { timeout: 2000 });
\`\`\`

Why this works: inside rAF we move \`transform\`, a compositor-only property, so the animation fits the frame budget. Inside rIC we work **only while \`timeRemaining()\` is above zero**, so we never spill into the next frame and never damage INP.

## What to say in the interview

> \`requestAnimationFrame\` fires the callback right before the next repaint, in sync with the screen refresh rate — at 60 Hz that is about 16.7 milliseconds per frame. It is for visual updates: animations and DOM reads and writes in the correct frame phase. A bonus is that it does not run in background tabs, which saves battery. \`requestIdleCallback\`, by contrast, fires when the browser is idle at the end of a frame and passes a deadline object with \`timeRemaining()\`; it is for non-critical background work like analytics, prefetching and lazy initialization. Its main trap is that on a busy page it may not fire for a long time, so I always set a \`timeout\` as a safeguard; Safari support was historically weak. And heavy computation must never go inside rAF — it eats the frame budget and drops frames; for chunking long tasks there are \`scheduler.postTask\` and \`scheduler.yield\`.

## Gotchas

- **Heavy computation inside rAF** eats the frame budget and drops frames — exactly what you were trying to avoid.
- **rIC may never fire** if the page stays busy: always pass \`{ timeout }\`.
- **Weak rIC support in Safari** — you need a \`setTimeout\` fallback.
- **rAF does not run in a background tab**: timers built on it freeze, and time-based logic drifts.
- **Forgetting \`cancelAnimationFrame\`** on destroy leaves the loop spinning forever.
- **rIC is not for DOM writes**: changing styles in the idle phase triggers an extra frame; use rAF for anything visual.`
    }
  },
  {
    id: 'web-033',
    category: 'html-css-performance',
    level: 'Medium',
    tags: ['intersection-observer', 'lazy-loading', 'api'],
    question: {
      ru: 'Как работает IntersectionObserver и почему он лучше слушателей scroll для отслеживания видимости?',
      en: 'How does IntersectionObserver work and why is it better than scroll listeners for visibility tracking?'
    },
    answer: {
      ru: `## Коротко

IntersectionObserver **сам сообщает**, когда элемент появился в области видимости или ушёл из неё. Вы не опрашиваете позицию — браузер считает пересечения нативно и зовёт колбэк только при смене состояния.

Аналогия: датчик движения вместо охранника, который каждые полсекунды выглядывает в окно. Датчик дешевле, точнее и не устаёт.

## Как это работает по шагам

1. Создаёте наблюдателя с колбэком и опциями, затем говорите \`observer.observe(el)\` для каждого элемента.
2. Браузер вычисляет пересечения **вне main thread**, без опроса и без forced reflow.
3. Как только элемент пересёк заданный порог, колбэк получает массив \`entries\`; у каждой есть флаг \`isIntersecting\` и доля видимости \`intersectionRatio\`.
4. **Опции**: \`root\` — контейнер отсчёта (по умолчанию viewport); \`rootMargin\` — расширяет или сужает зону, например \`'200px'\`, чтобы начать подгрузку заранее; \`threshold\` — доля видимости от 0 до 1 или массив порогов.
5. Если наблюдение больше не нужно — \`unobserve(target)\` для одного элемента или \`disconnect()\` для всех.

## Почему это лучше слушателя scroll

- **scroll** срабатывает десятки раз в секунду, и внутри обработчика обычно вызывают \`getBoundingClientRect()\` — это **forced reflow каждый кадр**, дёрганье и нагрузка на CPU.
- **IntersectionObserver** считает пересечения нативно, батчит результаты и зовёт колбэк только при **изменении** состояния — дёшево и плавно.

## Пример

\`\`\`ts
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        loadImage(entry.target as HTMLImageElement);
        observer.unobserve(entry.target); // одноразово
      }
    }
  },
  { rootMargin: '200px', threshold: 0.1 }
);
elements.forEach((el) => observer.observe(el));
\`\`\`

Почему так: \`rootMargin: '200px'\` начинает загрузку **за 200 пикселей до** появления картинки на экране, поэтому к моменту прокрутки она уже готова. \`unobserve\` после срабатывания превращает наблюдение в одноразовое и снимает лишнюю работу.

## Что сказать на собеседовании

> IntersectionObserver асинхронно сообщает, когда целевой элемент пересекает вьюпорт или заданный root-контейнер на нужный порог. Ключевое преимущество перед слушателем scroll в том, что scroll срабатывает десятки раз в секунду и внутри обычно вызывают \`getBoundingClientRect()\`, а это forced reflow на каждый кадр; обсервер же считает пересечения нативно, вне main thread, батчит их и зовёт колбэк только при изменении состояния. Настраивается тремя опциями: \`root\` — контейнер отсчёта, \`rootMargin\` — расширение зоны, например 200 пикселей для предзагрузки заранее, и \`threshold\` — доля видимости или массив порогов. Использую для ленивой загрузки картинок и компонентов, бесконечной прокрутки через sentinel-элемент, аналитики показов и анимаций появления. Обязательно вызываю \`unobserve\` или \`disconnect\` при уничтожении компонента, иначе утечка.

## Ловушки

- **Забыли \`disconnect()\`** при уничтожении компонента — утечка памяти и колбэки в мёртвый контекст.
- **Колбэк асинхронный**: не рассчитывайте на мгновенную реакцию сразу после изменения DOM.
- **Первый вызов происходит сразу после \`observe\`** — с \`isIntersecting: false\`, если элемент вне экрана; это нередко удивляет.
- **\`rootMargin\` в процентах** считается от размеров root, а не элемента; и он не работает, если root — кросс-доменный iframe.
- **Для процента видимости нужен массив \`threshold\`** вроде \`[0, 0.25, 0.5, 0.75, 1]\`, одно число даст только одну точку.
- **Не заменяет \`ResizeObserver\`**: изменение размера самого элемента IntersectionObserver не отслеживает.`,
      en: `## In short

IntersectionObserver **tells you itself** when an element enters or leaves the visible area. You never poll positions — the browser computes intersections natively and calls back only when the state changes.

Analogy: a motion sensor instead of a guard who looks out of the window every half second. The sensor is cheaper, more accurate, and never gets tired.

## How it works, step by step

1. You create an observer with a callback and options, then call \`observer.observe(el)\` for each target.
2. The browser computes intersections **off the main thread**, with no polling and no forced reflow.
3. As soon as an element crosses the configured threshold, the callback receives an array of \`entries\`; each has an \`isIntersecting\` flag and an \`intersectionRatio\`.
4. **Options**: \`root\` — the reference container (viewport by default); \`rootMargin\` — grows or shrinks the zone, e.g. \`'200px'\` to start loading early; \`threshold\` — the visibility fraction from 0 to 1, or an array of thresholds.
5. When you no longer need it, call \`unobserve(target)\` for one element or \`disconnect()\` for all.

## Why it beats a scroll listener

- **scroll** fires dozens of times per second, and handlers typically call \`getBoundingClientRect()\` — a **forced reflow every frame**, plus jank and CPU load.
- **IntersectionObserver** computes intersections natively, batches the results, and calls back only when the state **changes** — cheap and smooth.

## Example

\`\`\`ts
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        loadImage(entry.target as HTMLImageElement);
        observer.unobserve(entry.target); // one-shot
      }
    }
  },
  { rootMargin: '200px', threshold: 0.1 }
);
elements.forEach((el) => observer.observe(el));
\`\`\`

Why this works: \`rootMargin: '200px'\` starts loading **200 pixels before** the image reaches the screen, so it is ready by the time the user scrolls to it. The \`unobserve\` call after a hit makes the observation one-shot and removes needless work.

## What to say in the interview

> IntersectionObserver asynchronously reports when a target element intersects the viewport, or a given root container, at a chosen threshold. Its key advantage over a scroll listener is that scroll fires dozens of times per second and handlers usually call \`getBoundingClientRect()\`, which forces a reflow every frame; the observer instead computes intersections natively, off the main thread, batches them, and calls back only on state change. It takes three options: \`root\` for the reference container, \`rootMargin\` to grow the zone — 200 pixels for prefetching, for instance — and \`threshold\` as a visibility fraction or an array of them. I use it for lazy-loading images and components, infinite scroll via a sentinel element, impression analytics, and reveal animations. And I always call \`unobserve\` or \`disconnect\` on destroy, otherwise it leaks.

## Gotchas

- **Forgetting \`disconnect()\`** on destroy leaks memory and fires callbacks into a dead context.
- **The callback is asynchronous**: do not expect an instant reaction right after a DOM change.
- **The first callback fires immediately after \`observe\`** — with \`isIntersecting: false\` if the element is off-screen; this surprises people regularly.
- **A percentage \`rootMargin\`** is relative to the root, not the element, and it does not work when the root is a cross-origin iframe.
- **A visibility percentage needs a \`threshold\` array** such as \`[0, 0.25, 0.5, 0.75, 1]\`; a single number gives you one point only.
- **It does not replace \`ResizeObserver\`**: IntersectionObserver does not track the element's own size changes.`
    }
  },
  {
    id: 'web-034',
    category: 'html-css-performance',
    level: 'Expert',
    tags: ['memory-leaks', 'detached-dom', 'spa'],
    question: {
      ru: 'Какие типичные причины утечек памяти в SPA? Как их обнаружить и предотвратить?',
      en: 'What are common causes of memory leaks in SPAs? How do you detect and prevent them?'
    },
    answer: {
      ru: `## Коротко

Утечка в SPA — это когда компонент уничтожен, а **ссылки на него живы**, поэтому сборщик мусора не может его убрать. Страница не перезагружается часами, и такие «мёртвые души» копятся.

Аналогия: съехали из квартиры, но забыли сдать ключ и отписаться от рассылок. Формально вас там нет, а место за вами всё ещё числится — и так с каждым переездом.

## Пять источников утечек

1. **Неотписанные подписки и слушатели.** RxJS-подписки, \`addEventListener\`, \`setInterval\` переживают компонент и держат ссылку на него, а через неё — на весь его DOM и данные.
2. **Detached DOM.** Узел удалён из дерева, но JS-переменная или замыкание всё ещё на него ссылается — ни узел, ни его поддерево не соберутся сборщиком.
3. **Замыкания и глобальные ссылки.** Долгоживущие объекты — синглтон-сервисы, кэши, статические \`Map\` — накапливают записи и удерживают старые компоненты.
4. **Таймеры и observers.** \`setInterval\`, \`IntersectionObserver\`, \`ResizeObserver\`, \`MutationObserver\` без \`clearInterval\` или \`disconnect()\`.
5. **Сторонние библиотеки.** Чарты, карты, редакторы почти всегда требуют ручного \`destroy()\` — иначе они держат и DOM, и слушатели.

## Пример

\`\`\`ts
@Component({ /* ... */ })
export class WidgetComponent implements OnDestroy {
  private readonly ac = new AbortController();
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    window.addEventListener('resize', this.onResize, { signal: this.ac.signal });
    fetch('/api/data', { signal: this.ac.signal });
    this.stream$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  ngOnDestroy() {
    this.ac.abort(); // снимает слушатель и отменяет fetch одним вызовом
  }
}
\`\`\`

Почему так: \`AbortController\` — единая «рубильник-ручка» для слушателей и запросов, а \`takeUntilDestroyed\` привязывает подписку к жизненному циклу компонента, так что забыть отписаться невозможно.

## Как обнаружить

- **DevTools → Memory → Heap snapshot**: фильтр \`Detached\` показывает detached DOM-узлы.
- **Allocation timeline / Performance Monitor**: растущие «JS heap size» и «DOM Nodes» при повторяющихся навигациях — верный признак утечки.
- **Метод сравнения**: снимок → выполнить сценарий N раз → снимок → comparison view. Объекты, чьё количество растёт линейно с N, и есть подозреваемые.

## Что сказать на собеседовании

> Утечка в SPA — это живая ссылка на уже уничтоженный компонент, из-за которой сборщик мусора не может освободить память. Основных источников пять: неотписанные RxJS-подписки и \`addEventListener\`, detached DOM — когда узел удалён из дерева, но на него ссылается замыкание, — глобальные кэши и статические \`Map\`, не остановленные таймеры и обсерверы, и сторонние библиотеки, которым нужен ручной \`destroy()\`. Ищу через Chrome DevTools: делаю heap snapshot, фильтрую по Detached, прогоняю сценарий несколько раз и сравниваю снимки — то, что растёт линейно, и есть утечка; плюс смотрю на рост JS heap и числа DOM-узлов в Performance Monitor. Предотвращаю через \`takeUntilDestroyed\` и \`DestroyRef\` в Angular, \`AbortController\` с \`signal\` для fetch и слушателей, и \`WeakMap\` для кэшей по DOM-узлам.

## Ловушки

- **\`setInterval\` без \`clearInterval\`** — классика: интервал держит замыкание, замыкание держит компонент.
- **Стрелочная функция в \`removeEventListener\`** не сработает: нужна та же ссылка на функцию, что была при добавлении.
- **\`WeakMap\` спасает только от ключей-объектов**: значения удерживаются, пока жив ключ.
- **Кэш без ограничения размера** — это утечка by design; нужен LRU или TTL.
- **Утечка проявляется не сразу**: симптом — постепенное замедление и разрастание памяти за долгую сессию, а не мгновенный сбой.
- **Профилирование в режиме разработки врёт**: dev-сборка сама удерживает объекты, замеряйте на production-сборке.`,
      en: `## In short

A leak in an SPA is a destroyed component whose **references are still alive**, so the garbage collector cannot reclaim it. The page never reloads for hours, and these "ghosts" pile up.

Analogy: you moved out of a flat but never returned the key or cancelled the subscriptions. Officially you are gone, yet the space is still counted against you — and it repeats with every move.

## The five sources of leaks

1. **Un-unsubscribed subscriptions and listeners.** RxJS subscriptions, \`addEventListener\`, \`setInterval\` outlive the component and hold a reference to it — and through it, to its whole DOM and data.
2. **Detached DOM.** The node is removed from the tree, but a variable or closure still points at it — neither the node nor its subtree can be collected.
3. **Closures and global references.** Long-lived objects — singleton services, caches, static \`Map\`s — accumulate entries and pin old components.
4. **Timers and observers.** \`setInterval\`, \`IntersectionObserver\`, \`ResizeObserver\`, \`MutationObserver\` without \`clearInterval\` or \`disconnect()\`.
5. **Third-party libraries.** Charts, maps and editors nearly always need a manual \`destroy()\`, otherwise they retain DOM and listeners.

## Example

\`\`\`ts
@Component({ /* ... */ })
export class WidgetComponent implements OnDestroy {
  private readonly ac = new AbortController();
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    window.addEventListener('resize', this.onResize, { signal: this.ac.signal });
    fetch('/api/data', { signal: this.ac.signal });
    this.stream$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  ngOnDestroy() {
    this.ac.abort(); // removes the listener and cancels the fetch in one call
  }
}
\`\`\`

Why this works: \`AbortController\` is a single kill switch for both listeners and requests, while \`takeUntilDestroyed\` ties the subscription to the component lifecycle so forgetting to unsubscribe becomes impossible.

## How to detect them

- **DevTools → Memory → Heap snapshot**: the \`Detached\` filter reveals detached DOM nodes.
- **Allocation timeline / Performance Monitor**: a rising "JS heap size" and "DOM Nodes" across repeated navigations is a reliable leak signal.
- **The comparison method**: snapshot → run the scenario N times → snapshot → comparison view. Objects whose count grows linearly with N are your suspects.

## What to say in the interview

> A leak in an SPA is a live reference to an already-destroyed component, which prevents the garbage collector from freeing memory. There are five main sources: un-unsubscribed RxJS subscriptions and \`addEventListener\`, detached DOM where a node is removed from the tree but still referenced by a closure, global caches and static \`Map\`s, timers and observers that were never stopped, and third-party libraries needing a manual \`destroy()\`. I hunt them in Chrome DevTools: take a heap snapshot, filter by Detached, run the scenario several times and compare snapshots — whatever grows linearly is the leak; I also watch JS heap and DOM node counts in the Performance Monitor. I prevent them with \`takeUntilDestroyed\` and \`DestroyRef\` in Angular, \`AbortController\` with a \`signal\` for fetches and listeners, and \`WeakMap\` for caches keyed by DOM nodes.

## Gotchas

- **\`setInterval\` without \`clearInterval\`** is the classic: the interval holds the closure, the closure holds the component.
- **An arrow function passed to \`removeEventListener\`** does nothing: you need the exact same function reference you added.
- **\`WeakMap\` only helps with object keys**: values are retained for as long as the key lives.
- **An unbounded cache is a leak by design**; use LRU or a TTL.
- **Leaks do not show up immediately**: the symptom is gradual slowdown and memory growth over a long session, not an instant crash.
- **Profiling a dev build lies**: development mode retains objects itself, so measure against a production build.`
    },
    codeSnippet: `// Tie listeners, timers and fetches to component lifetime
@Component({ /* ... */ })
export class WidgetComponent implements OnDestroy {
  private readonly ac = new AbortController();

  ngOnInit() {
    window.addEventListener('resize', this.onResize, { signal: this.ac.signal });
    fetch('/api/data', { signal: this.ac.signal });
  }

  ngOnDestroy() {
    this.ac.abort(); // removes listener + cancels fetch in one shot
  }

  private onResize = () => { /* ... */ };
}`
  },
  {
    id: 'web-035',
    category: 'network-browser',
    level: 'Hard',
    tags: ['cdn', 'http2', 'network'],
    question: {
      ru: 'Как CDN, HTTP/2 и HTTP/3 влияют на производительность загрузки? Что такое connection multiplexing?',
      en: 'How do CDN, HTTP/2, and HTTP/3 affect loading performance? What is connection multiplexing?'
    },
    answer: {
      ru: `## Коротко

**CDN** сокращает физическое расстояние до контента. **HTTP/2 и HTTP/3** сокращают число «походов» по сети благодаря мультиплексированию — множеству параллельных потоков по одному соединению.

Аналогия: HTTP/1.1 — однополосная дорога, где грузовик впереди держит всю колонну. HTTP/2 — многополосное шоссе, но одна авария (потеря TCP-пакета) всё ещё тормозит все полосы. HTTP/3 — полосы физически независимы, авария на одной остальных не касается.

## Как это работает по шагам

1. **CDN** — географически распределённые edge-серверы, кэширующие контент рядом с пользователем. Снижает **RTT** и **TTFB**, разгружает origin, поглощает пиковый трафик и DDoS. Современные CDN ещё и сжимают, оптимизируют изображения и умеют edge-вычисления.
2. **Проблема HTTP/1.1** — head-of-line blocking: на одном соединении запросы идут последовательно. Браузер открывает лишь **около 6 соединений на домен**, отсюда старые хаки — domain sharding и CSS-спрайты.
3. **HTTP/2** вводит **мультиплексирование**: множество запросов и ответов идут параллельно по **одному** TCP-соединению, разбитые на фреймы и потоки. Плюс сжатие заголовков **HPACK**, приоритизация потоков и server push (сейчас практически не используется). Sharding и конкатенация стали не нужны.
4. **Ограничение HTTP/2**: head-of-line blocking остаётся на уровне **TCP** — потеря одного пакета останавливает все потоки сразу.
5. **HTTP/3** работает поверх **UDP** через QUIC и решает эту проблему: потери в одном потоке не блокируют остальные. Плюс быстрее установка соединения (0-RTT / 1-RTT, TLS встроен), лучше поведение в нестабильных мобильных сетях и бесшовная миграция соединения при смене сети (Wi-Fi → LTE).

## Что такое connection multiplexing

Это передача множества независимых логических потоков по **одному физическому соединению**. Смысл в том, чтобы не платить за установку соединения каждый раз и не упираться в лимит параллельных соединений браузера.

## Пример

\`\`\`
# HTTP/1.1: ~6 соединений на домен, очередь внутри каждого
# отсюда хаки: domain sharding, спрайты, конкатенация бандлов

# HTTP/2+: один коннект, десятки параллельных потоков
GET /main.a1b2.js    stream 1
GET /vendor.c3d4.js  stream 3
GET /hero.avif       stream 5   fetchpriority: high
\`\`\`

Почему так: на HTTP/2 и HTTP/3 нет штрафа за количество запросов, поэтому **мелкая нарезка бандла выгоднее** — при обновлении одного чанка остальные остаются в кэше.

## Что сказать на собеседовании

> CDN — это распределённые edge-серверы, которые кэшируют контент ближе к пользователю, снижая RTT и TTFB и разгружая origin. По протоколам: у HTTP/1.1 head-of-line blocking, запросы в соединении идут последовательно, а браузер открывает всего около шести соединений на домен — отсюда старые хаки вроде domain sharding и спрайтов. HTTP/2 вводит мультиплексирование: много запросов и ответов параллельно по одному TCP-соединению через фреймы и потоки, плюс сжатие заголовков HPACK и приоритизация; sharding стал вреден. Но head-of-line blocking остаётся на уровне TCP — потеря пакета тормозит все потоки. HTTP/3 работает поверх UDP через QUIC, потоки независимы, соединение устанавливается за 0-RTT или 1-RTT со встроенным TLS, и есть миграция соединения при смене сети. Практический вывод: на HTTP/2 и 3 мелкая нарезка чанков дешевле и лучше кэшируется.

## Ловушки

- **Domain sharding на HTTP/2 вредит**: каждый домен — это лишние DNS, TCP и TLS вместо переиспользования одного коннекта.
- **Мультиплексирование не отменяет приоритеты**: браузер всё равно ранжирует ресурсы, и \`fetchpriority\` продолжает работать.
- **HTTP/2 не ускорит медленный сервер**: если TTFB упирается в бэкенд, протокол не поможет.
- **Server push фактически мёртв** — вытеснен \`103 Early Hints\`.
- **HTTP/3 на UDP** иногда режется корпоративными фаерволами, поэтому фолбэк на HTTP/2 обязателен.
- **CDN без правильных заголовков бесполезен**: без \`Cache-Control\` edge всё равно пойдёт в origin.`,
      en: `## In short

A **CDN** shortens the physical distance to your content. **HTTP/2 and HTTP/3** shorten the number of network round trips through multiplexing — many parallel streams over a single connection.

Analogy: HTTP/1.1 is a single-lane road where one lorry holds up the whole queue. HTTP/2 is a motorway, but one crash (a lost TCP packet) still stops every lane. HTTP/3 makes the lanes physically independent — a crash in one does not touch the others.

## How it works, step by step

1. **CDN** — geographically distributed edge servers caching content near the user. It lowers **RTT** and **TTFB**, offloads the origin, and absorbs traffic spikes and DDoS. Modern CDNs also compress, optimize images, and run edge compute.
2. **The HTTP/1.1 problem** is head-of-line blocking: requests on one connection are processed sequentially. The browser opens only **about 6 connections per domain**, hence the old hacks — domain sharding and CSS sprites.
3. **HTTP/2** introduces **multiplexing**: many requests and responses travel in parallel over **one** TCP connection, split into frames and streams. Plus **HPACK** header compression, stream prioritization, and server push (now essentially unused). Sharding and concatenation became unnecessary.
4. **HTTP/2's limitation**: head-of-line blocking remains at the **TCP** level — a single lost packet stalls every stream at once.
5. **HTTP/3** runs over **UDP** via QUIC and fixes exactly that: loss in one stream does not block the others. It also sets up faster (0-RTT / 1-RTT with TLS built in), behaves better on flaky mobile networks, and supports seamless connection migration when the network changes (Wi-Fi → LTE).

## What connection multiplexing is

Carrying many independent logical streams over **one physical connection**. The point is to avoid paying for connection setup every time and to stop hitting the browser's parallel-connection limit.

## Example

\`\`\`
# HTTP/1.1: ~6 connections per domain, a queue inside each
# hence the hacks: domain sharding, sprites, bundle concatenation

# HTTP/2+: one connection, dozens of parallel streams
GET /main.a1b2.js    stream 1
GET /vendor.c3d4.js  stream 3
GET /hero.avif       stream 5   fetchpriority: high
\`\`\`

Why this matters: on HTTP/2 and HTTP/3 there is no per-request penalty, so **finer chunk splitting pays off** — when one chunk changes the rest stay cached.

## What to say in the interview

> A CDN is a set of distributed edge servers caching content closer to the user, which lowers RTT and TTFB and offloads the origin. On protocols: HTTP/1.1 suffers head-of-line blocking, requests inside a connection are sequential, and the browser opens only around six connections per domain — hence old hacks like domain sharding and sprites. HTTP/2 introduces multiplexing: many requests and responses in parallel over one TCP connection using frames and streams, plus HPACK header compression and prioritization, which makes sharding actively harmful. But head-of-line blocking remains at the TCP level, so one lost packet stalls all streams. HTTP/3 runs over UDP via QUIC with independent streams, 0-RTT or 1-RTT setup with TLS built in, and connection migration across networks. The practical takeaway is that on HTTP/2 and 3 finer chunk splitting is cheaper and caches better.

## Gotchas

- **Domain sharding hurts on HTTP/2**: each extra domain means extra DNS, TCP and TLS instead of reusing one connection.
- **Multiplexing does not remove priorities**: the browser still ranks resources, and \`fetchpriority\` still matters.
- **HTTP/2 will not fix a slow server**: if TTFB is bound by the backend, the protocol changes nothing.
- **Server push is effectively dead** — superseded by \`103 Early Hints\`.
- **HTTP/3 over UDP** is sometimes blocked by corporate firewalls, so an HTTP/2 fallback is mandatory.
- **A CDN without correct headers is pointless**: with no \`Cache-Control\` the edge goes back to the origin anyway.`
    }
  },
  {
    id: 'web-036',
    category: 'html-css-performance',
    level: 'Expert',
    tags: ['change-detection', 'angular', 'performance'],
    question: {
      ru: 'Как стратегия OnPush, zoneless и signals в Angular влияют на производительность рендеринга?',
      en: 'How do OnPush, zoneless, and signals in Angular affect rendering performance?'
    },
    answer: {
      ru: `## Коротко

Все три вещи решают одну задачу — **делать меньше проверок при обновлении UI**. OnPush отсекает целые поддеревья, signals точно знают, что именно изменилось, zoneless убирает автоматические «слепые» проходы.

Аналогия: обход дома после переезда. По умолчанию Angular заглядывает в **каждую комнату** после любого шороха. OnPush закрывает двери в комнаты, где точно ничего не менялось. Signals вешают датчик прямо на нужную полку. Zoneless убирает саму привычку обходить дом на каждый шорох.

## Как это работает по шагам

1. **По умолчанию** Angular использует **Zone.js**: он перехватывает все асинхронные операции — события, таймеры, XHR — и запускает change detection по **всему** дереву компонентов. На больших приложениях это дорого.
2. **OnPush** говорит проверять компонент только когда: изменилась **ссылка** на \`@Input\`; сработало событие из шаблона компонента; эмитнул Observable, подписанный через \`async\`-pipe; вручную вызван \`markForCheck()\`. Это отсекает целые поддеревья от проверки — меньше работы за цикл, лучше INP и TBT. Плата: входные данные должны быть **иммутабельными**.
3. **Signals (v16+)** дают гранулярную реактивность: Angular точно знает, какие представления читают какой сигнал, и обновляет **только** их, вообще не обходя дерево.
4. **Zoneless** (\`provideZonelessChangeDetection()\`) убирает Zone.js. Change detection триггерится **явно** — сигналами, событиями, \`async\`-pipe. Бандл меньше (Zone.js это ~**13 КБ** gzip), нет слепых полных проходов, поведение предсказуемо, INP лучше.
5. **Дополнительно**: \`trackBy\` или \`@for\` с \`track\` переиспользуют DOM-узлы вместо пересоздания; \`runOutsideAngular\` выводит частые события (\`mousemove\`, \`scroll\`) из-под CD; чистые pipe вместо вызовов методов в шаблоне.

## Пример

\`\`\`ts
bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '{{ doubled() }}',
})
export class CounterComponent {
  count = signal(0);
  doubled = computed(() => this.count() * 2); // пересчитывается лениво
  inc() { this.count.update((n) => n + 1); }  // планирует точечное обновление
}
\`\`\`

Почему так: \`computed\` пересчитывается **только** при чтении и только если изменился источник, а \`update\` помечает к обновлению именно то представление, которое читает \`doubled()\` — а не всё дерево.

## Что сказать на собеседовании

> По умолчанию Angular работает через Zone.js: тот перехватывает все асинхронные операции и запускает change detection по всему дереву компонентов, что дорого на больших приложениях. OnPush меняет правило: компонент проверяется только при изменении ссылки на инпут, событии из его шаблона, эмите через \`async\`-pipe или явном \`markForCheck\`. Это отсекает поддеревья и требует иммутабельности данных. Signals с шестнадцатой версии дают гранулярную реактивность — Angular знает, какие представления зависят от конкретного сигнала, и обновляет только их, не обходя дерево. Zoneless-режим убирает Zone.js совсем, минус тринадцать килобайт из бандла, и change detection триггерится явно. Дополнительно использую \`track\` в \`@for\`, \`runOutsideAngular\` для mousemove и scroll и чистые пайпы вместо методов в шаблоне. Связка OnPush плюс signals плюс zoneless — это и есть направление Angular.

## Ловушки

- **OnPush + мутация массива на месте** — компонент не обновится: ссылка та же, нужен новый массив.
- **Метод в шаблоне** вызывается на каждом цикле CD — заменяйте на \`computed\` или чистый pipe.
- **\`runOutsideAngular\` без \`ngZone.run()\`** для обновления UI: обработчик отработал, а экран не перерисовался.
- **Zoneless ломает код, полагавшийся на автоматические проходы**: сторонние библиотеки без сигналов могут перестать обновлять вид.
- **\`@for\` без \`track\`** пересоздаёт DOM целиком и теряет состояние и фокус внутри строк.
- Спросят следом: как измерить выигрыш (Angular DevTools → Profiler, счётчик циклов CD, Performance-панель).`,
      en: `## In short

All three solve one problem — **doing fewer checks when the UI updates**. OnPush prunes whole subtrees, signals know exactly what changed, and zoneless removes the automatic "blind" passes altogether.

Analogy: walking the house after a noise. By default Angular looks into **every room** after any rustle. OnPush shuts the doors to rooms where nothing could have changed. Signals put a sensor on the exact shelf. Zoneless drops the habit of touring the house on every rustle.

## How it works, step by step

1. **By default** Angular runs on **Zone.js**: it intercepts every async operation — events, timers, XHR — and runs change detection over the **entire** component tree. On large apps that is expensive.
2. **OnPush** says to check a component only when: an \`@Input\` **reference** changed; an event fired from the component's own template; an Observable subscribed via the \`async\` pipe emitted; or \`markForCheck()\` was called manually. That prunes entire subtrees from the pass — less work per cycle, better INP and TBT. The price: input data must be **immutable**.
3. **Signals (v16+)** give granular reactivity: Angular knows exactly which views read which signal and refreshes **only** those, with no tree traversal at all.
4. **Zoneless** (\`provideZonelessChangeDetection()\`) removes Zone.js. Change detection is triggered **explicitly** — by signals, events, the \`async\` pipe. The bundle shrinks (Zone.js is roughly **13 KB** gzipped), there are no blind full passes, behaviour is predictable, and INP improves.
5. **On top of that**: \`trackBy\` or \`@for\` with \`track\` reuses DOM nodes instead of recreating them; \`runOutsideAngular\` keeps frequent events (\`mousemove\`, \`scroll\`) out of change detection; pure pipes replace method calls in templates.

## Example

\`\`\`ts
bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '{{ doubled() }}',
})
export class CounterComponent {
  count = signal(0);
  doubled = computed(() => this.count() * 2); // recomputes lazily
  inc() { this.count.update((n) => n + 1); }  // schedules a targeted refresh
}
\`\`\`

Why this works: \`computed\` recomputes **only** when read and only if its source changed, and \`update\` marks precisely the view that reads \`doubled()\` — not the whole tree.

## What to say in the interview

> By default Angular runs on Zone.js, which intercepts every async operation and triggers change detection across the whole component tree — expensive on large apps. OnPush changes the rule: a component is checked only when an input reference changes, an event fires from its own template, an \`async\` pipe emits, or \`markForCheck\` is called explicitly. That prunes subtrees and requires immutable data. Signals, from version 16, give granular reactivity — Angular knows which views depend on a given signal and refreshes only those, without traversing the tree. Zoneless mode removes Zone.js entirely, saving about thirteen kilobytes, and change detection becomes explicit. On top of that I use \`track\` in \`@for\`, \`runOutsideAngular\` for mousemove and scroll, and pure pipes instead of template methods. OnPush plus signals plus zoneless is the direction Angular is heading.

## Gotchas

- **OnPush plus mutating an array in place** does not update: the reference is unchanged, you need a new array.
- **A method call in a template** runs on every CD cycle — replace it with a \`computed\` or a pure pipe.
- **\`runOutsideAngular\` without \`ngZone.run()\`** for the UI update: the handler runs but nothing repaints.
- **Zoneless breaks code relying on automatic passes**: third-party libraries without signals may stop refreshing the view.
- **\`@for\` without \`track\`** recreates the whole DOM and loses state and focus inside rows.
- Expect the follow-up: how you measure the gain (Angular DevTools Profiler, CD cycle counts, the Performance panel).`
    },
    codeSnippet: `// Zoneless + signals: change detection runs only where a signal is read
bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`{{ doubled() }}\`,
})
export class CounterComponent {
  count = signal(0);
  doubled = computed(() => this.count() * 2); // recomputes lazily
  inc() { this.count.update((n) => n + 1); }  // schedules a targeted refresh
}`
  },
  {
    id: 'web-037',
    category: 'html-css-performance',
    level: 'Medium',
    tags: ['aspect-ratio', 'cls', 'layout'],
    question: {
      ru: 'Как свойство aspect-ratio помогает избежать CLS? Чем оно лучше padding-hack?',
      en: 'How does the aspect-ratio property help avoid CLS? Why is it better than the padding hack?'
    },
    answer: {
      ru: `## Коротко

\`aspect-ratio\` заранее сообщает браузеру **пропорции блока**, поэтому место под картинку или видео резервируется ещё до того, как файл скачан. Загрузился — ничего не прыгнуло, CLS остался нулевым.

Аналогия: забронированное место в театре. Вы ещё не пришли, но кресло уже ваше, и соседям не придётся сдвигаться, когда вы наконец сядете.

## Как это работает по шагам

1. Без указанных пропорций браузер отводит под \`<img>\` нулевую высоту, а после загрузки внезапно раздвигает её до реальной — весь контент ниже уезжает вниз, растёт CLS.
2. **Старый способ — padding-hack**: обёртка с \`padding-top: 56.25%\` (это 9/16) и абсолютно позиционированный контент внутри. Работает, но требует лишней обёртки, абсолютного позиционирования, магических чисел и выбивает элемент из потока.
3. **Современный способ — \`aspect-ratio\`**: одно свойство, никаких обёрток. Браузер сразу знает, какую высоту отвести при известной ширине.
4. **Для \`<img>\` самый надёжный вариант — атрибуты \`width\` и \`height\`**: современные браузеры сами выводят из них \`aspect-ratio\` и резервируют место, даже если CSS ещё не применился.
5. Свойство сочетается с \`object-fit\` для кадрирования, работает внутри Grid и Flexbox и переопределяется медиа-запросами.

## Пример

\`\`\`css
.media {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
}
\`\`\`

\`\`\`html
<img src="photo.jpg" width="1600" height="900" alt="..." />
\`\`\`

Почему так: в CSS-варианте высота выводится из ширины по заданной пропорции. В HTML-варианте браузер делит 1600 на 900 и получает те же 16:9 — и делает это **до** загрузки CSS, потому что атрибуты видны сразу в разметке.

## Что сказать на собеседовании

> Когда изображение или iframe грузится без зарезервированной высоты, весь контент под ним прыгает в момент загрузки, и это прямой вклад в CLS. Браузеру нужно знать соотношение сторон до того, как файл приехал. Раньше для этого использовали padding-hack: обёртка с \`padding-top\` в 56.25 процента для 16 на 9 и абсолютное позиционирование внутри — работает, но это лишняя обёртка, магические числа и выпадение из потока. Сейчас есть свойство \`aspect-ratio\`: одна строка, без обёрток, браузер сразу отводит правильную высоту. А для тегов \`img\` надёжнее всего просто задать атрибуты \`width\` и \`height\` — современные браузеры выводят из них \`aspect-ratio\` автоматически, причём ещё до применения CSS. Дополнительно \`aspect-ratio\` хорошо сочетается с \`object-fit\` и переопределяется медиа-запросами.

## Ловушки

- **\`aspect-ratio\` уступает явным размерам**: если заданы и \`width\`, и \`height\`, пропорция игнорируется.
- **Контент больше расчётной высоты растянет блок** — при необходимости добавьте \`min-height: 0\` или \`overflow\`.
- **Атрибуты \`width\`/\`height\` на \`<img>\` не отменяют CSS**: с \`width: 100%\` нужен \`height: auto\`, иначе картинка исказится.
- **Padding-hack всё ещё встречается в легаси** — при рефакторинге не забудьте убрать абсолютное позиционирование вместе с ним.
- **Для фоновых картинок в CSS \`aspect-ratio\` не спасает**: у \`background-image\` нет своих размеров, место надо резервировать вручную.
- Спросят следом: какие ещё бывают источники CLS (шрифты, вставленные баннеры, реклама) и как их мерить.`,
      en: `## In short

\`aspect-ratio\` tells the browser a box's **proportions up front**, so the space for an image or video is reserved before the file has even downloaded. When it arrives, nothing jumps and CLS stays at zero.

Analogy: a reserved seat at the theatre. You have not arrived yet, but the seat is already yours — nobody has to shuffle along when you finally sit down.

## How it works, step by step

1. With no declared proportions, the browser gives an \`<img>\` zero height and then suddenly expands it once the file loads — everything below slides down and CLS grows.
2. **The old way — the padding hack**: a wrapper with \`padding-top: 56.25%\` (that is 9/16) and absolutely positioned content inside. It works, but it needs an extra wrapper, absolute positioning, magic numbers, and it pulls the element out of the flow.
3. **The modern way — \`aspect-ratio\`**: one property, no wrappers. The browser immediately knows what height to allocate for a given width.
4. **For \`<img>\` the most reliable option is the \`width\` and \`height\` attributes**: modern browsers derive \`aspect-ratio\` from them and reserve the space even before CSS has been applied.
5. The property composes with \`object-fit\` for cropping, works inside Grid and Flexbox, and can be overridden per media query.

## Example

\`\`\`css
.media {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
}
\`\`\`

\`\`\`html
<img src="photo.jpg" width="1600" height="900" alt="..." />
\`\`\`

Why this works: in the CSS version the height is derived from the width by the declared ratio. In the HTML version the browser divides 1600 by 900 and gets the same 16:9 — and it does so **before** CSS loads, because the attributes are right there in the markup.

## What to say in the interview

> When an image or iframe loads without reserved height, everything below it jumps at load time, which feeds straight into CLS. The browser needs the aspect ratio before the file arrives. The old solution was the padding hack: a wrapper with \`padding-top\` of 56.25 percent for 16 by 9 and absolute positioning inside — it works, but it means an extra wrapper, magic numbers and falling out of the flow. Today there is the \`aspect-ratio\` property: one line, no wrappers, and the browser allocates the correct height immediately. For \`img\` tags the most reliable approach is simply setting the \`width\` and \`height\` attributes — modern browsers derive \`aspect-ratio\` from them automatically, and do it before CSS is even applied. On top of that, \`aspect-ratio\` pairs well with \`object-fit\` and can be overridden per media query.

## Gotchas

- **\`aspect-ratio\` yields to explicit dimensions**: set both \`width\` and \`height\` and the ratio is ignored.
- **Content taller than the computed height stretches the box** — add \`min-height: 0\` or \`overflow\` if needed.
- **\`width\`/\`height\` attributes do not override CSS**: with \`width: 100%\` you still need \`height: auto\`, or the image distorts.
- **The padding hack still lurks in legacy code** — when refactoring, remove the absolute positioning along with it.
- **It does not help CSS background images**: a \`background-image\` has no intrinsic size, so you must reserve the space by hand.
- Expect the follow-up: what else causes CLS (fonts, injected banners, ads) and how you measure it.`
    }
  },
  {
    id: 'web-038',
    category: 'html-css-performance',
    level: 'Hard',
    tags: ['gpu-layers', 'paint', 'devtools'],
    question: {
      ru: 'Как использовать Chrome DevTools для диагностики проблем рендеринга (paint, layers, FPS)?',
      en: 'How do you use Chrome DevTools to diagnose rendering problems (paint, layers, FPS)?'
    },
    answer: {
      ru: `## Коротко

DevTools отвечают на три вопроса: **куда ушёл бюджет кадра** (Performance), **что именно перерисовывается** (Rendering) и **сколько у нас слоёв и памяти** (Layers, Performance Monitor).

Аналогия: диагностика машины. Performance — это лог поездки, где видно, на чём тряхнуло. Paint flashing — краска-индикатор, показывающая, какие детали реально двигаются. Layers — разборка на узлы.

## Пять инструментов — что каждый даёт

- **Performance panel.** Запись профиля даёт покадровый разбор по цветам: **Scripting** — жёлтый, **Rendering/Layout** — фиолетовый, **Painting** — зелёный, плюс Compositing. Красные маркеры — пропущенные кадры и long tasks (**> 50 мс**). Здесь же видны предупреждения \`Forced reflow\`.
- **Rendering tab** (Cmd/Ctrl+Shift+P → «Show Rendering»): **Paint flashing** подсвечивает перерисовываемые области зелёным — много мигает при скролле, значит лишний repaint; **Layout Shift Regions** даёт синие вспышки в местах сдвигов (диагностика CLS); **Frame Rendering Stats / FPS meter** показывает реальный FPS, память GPU и число слоёв; **Layer borders** рисует границы композиторных слоёв.
- **Layers panel.** 3D-визуализация слоёв: сколько их, почему элемент промоутнут, сколько памяти занимает. Здесь ловится **layer explosion** от \`will-change\` и \`translateZ\`.
- **Coverage tab.** Показывает неиспользуемый CSS и JS — кандидаты на удаление и code splitting.
- **Performance Monitor.** Живые графики: CPU, JS heap, DOM Nodes, layouts в секунду, style recalcs в секунду. Растущее число DOM-узлов при навигациях — утечка.

## Что делать по порядку

1. Записать профиль **типового сценария**: скролл ленты, открытие модалки, ввод в поле.
2. Найти long tasks и фиолетовые блоки Layout с предупреждением \`Forced reflow\` — там сидит layout thrashing.
3. Включить **Paint flashing** и убедиться, что перерисовывается только то, что должно.
4. Проверить число слоёв в **Layers** — нет ли взрывного роста.
5. Подтвердить улучшение по **FPS meter** и повторному профилю.

## Пример

\`\`\`
Performance → запись 5 с скролла
  Long task 320 ms
    Recalculate Style   40 ms
    Layout             210 ms  ⚠ Forced reflow
    Paint               45 ms
\`\`\`

Почему так: предупреждение \`Forced reflow\` вместе с непропорционально большим Layout — почти всегда чтение \`offsetHeight\` или \`getBoundingClientRect()\` в цикле. Лечится батчингом чтений и записей.

## Что сказать на собеседовании

> Начинаю с Performance-панели: записываю профиль типового сценария и смотрю покадровый разбор — жёлтое это скриптинг, фиолетовое layout, зелёное paint, красные маркеры это пропущенные кадры и long tasks дольше 50 миллисекунд. Предупреждение Forced reflow прямо указывает на layout thrashing. Дальше вкладка Rendering: Paint flashing подсвечивает зелёным то, что реально перерисовывается, Layout Shift Regions синим показывает сдвиги и помогает диагностировать CLS, а FPS meter даёт живой кадровый счётчик и число слоёв. Панель Layers показывает композиторные слои и позволяет поймать layer explosion от \`will-change\`. Coverage находит неиспользуемый CSS и JS, а Performance Monitor — рост JS heap и DOM-узлов, то есть утечки. Главный принцип — всегда измерять до и после, объективные числа важнее ощущений.

## Ловушки

- **Профилировать dev-сборку бессмысленно**: source maps, dev-режим фреймворка и расширения искажают картину.
- **Отключайте расширения браузера** или используйте инкогнито — они дают собственные long tasks.
- **Ваш ноутбук — не телефон пользователя**: включайте CPU throttling 4x-6x и Slow 4G.
- **Paint flashing на анимации показывает мигание всего экрана** — верный признак, что анимируется не compositor-only свойство.
- **Lab-профиль ≠ поле**: DevTools это лаборатория, реальные проблемы ищите в RUM и CrUX.
- **Не оптимизируйте по одному прогону** — записывайте несколько, разброс бывает кратным.`,
      en: `## In short

DevTools answer three questions: **where the frame budget went** (Performance), **what is actually being repainted** (Rendering) and **how many layers and how much memory we have** (Layers, Performance Monitor).

The analogy: diagnosing a car. Performance is the trip log showing where it lurched. Paint flashing is indicator paint revealing which parts really move. Layers is stripping it down to components.

## Five tools — what each one gives you

- **Performance panel.** Recording a profile gives a per-frame breakdown by colour: **Scripting** is yellow, **Rendering/Layout** purple, **Painting** green, plus Compositing. Red markers are dropped frames and long tasks (**> 50 ms**). This is also where \`Forced reflow\` warnings show up.
- **Rendering tab** (Cmd/Ctrl+Shift+P → "Show Rendering"): **Paint flashing** highlights repainted areas in green — lots of flashing while scrolling means excess repaint; **Layout Shift Regions** gives blue flashes where shifts occur (CLS diagnosis); **Frame Rendering Stats / FPS meter** shows real FPS, GPU memory and layer count; **Layer borders** outlines compositor layers.
- **Layers panel.** A 3D visualisation of layers: how many, why an element got promoted, how much memory it takes. This is where you catch **layer explosion** from \`will-change\` and \`translateZ\`.
- **Coverage tab.** Shows unused CSS and JS — candidates for removal and code splitting.
- **Performance Monitor.** Live charts: CPU, JS heap, DOM Nodes, layouts per second, style recalcs per second. A DOM node count that grows across navigations is a leak.

## What to do, in order

1. Record a profile of a **typical scenario**: scrolling a feed, opening a modal, typing into a field.
2. Find long tasks and purple Layout blocks carrying a \`Forced reflow\` warning — that's where layout thrashing lives.
3. Turn on **Paint flashing** and confirm only what should repaint does.
4. Check the layer count in **Layers** — look for explosive growth.
5. Confirm the improvement with the **FPS meter** and a second profile.

## Example

\`\`\`
Performance → 5 s recording of a scroll
  Long task 320 ms
    Recalculate Style   40 ms
    Layout             210 ms  ⚠ Forced reflow
    Paint               45 ms
\`\`\`

Why it looks like this: a \`Forced reflow\` warning together with a disproportionately large Layout is almost always \`offsetHeight\` or \`getBoundingClientRect()\` being read inside a loop. The cure is batching reads and writes.

## What to say in the interview

> I start with the Performance panel: record a profile of a typical scenario and read the per-frame breakdown — yellow is scripting, purple layout, green paint, and red markers are dropped frames and long tasks over 50 milliseconds. A Forced reflow warning points straight at layout thrashing. Then the Rendering tab: Paint flashing highlights in green what actually repaints, Layout Shift Regions shows shifts in blue and helps diagnose CLS, and the FPS meter gives a live frame counter and layer count. The Layers panel shows compositor layers and catches layer explosion from \`will-change\`. Coverage finds unused CSS and JS, and Performance Monitor reveals a growing JS heap and DOM node count, meaning leaks. The guiding principle is to always measure before and after — objective numbers beat feelings.

## Gotchas

- **Profiling a dev build is pointless**: source maps, framework dev mode and extensions all distort the picture.
- **Disable browser extensions** or use incognito — they contribute long tasks of their own.
- **Your laptop is not your user's phone**: turn on 4x–6x CPU throttling and Slow 4G.
- **Paint flashing lighting up the whole screen during an animation** is a sure sign you're animating something other than a compositor-only property.
- **A lab profile is not the field**: DevTools is the laboratory; real problems are found in RUM and CrUX.
- **Don't optimise from a single run** — record several; the spread can be severalfold.`
    }
  }
];
