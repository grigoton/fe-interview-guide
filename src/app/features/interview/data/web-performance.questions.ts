import { InterviewQuestion } from '../interfaces/question.interface';

export const WEB_PERFORMANCE_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'web-001',
    category: 'web-performance',
    level: 'Hard',
    tags: ['critical-rendering-path', 'dom', 'cssom'],
    question: {
      ru: 'Опишите Critical Rendering Path. Какие шаги проходит браузер от получения HTML до первого пикселя на экране?',
      en: 'Describe the Critical Rendering Path. What steps does the browser take from receiving HTML to the first pixel on screen?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Браузер получает от сервера просто текст — HTML, CSS, JS. Но на экране должны появиться картинки, кнопки и цвета. Critical Rendering Path (критический путь отрисовки) — это конвейер, по которому браузер превращает этот текст в живые пиксели, шаг за шагом, как на заводе. Чем короче конвейер и чем меньше на нём «пробок», тем быстрее пользователь увидит страницу.

### Шесть шагов конвейера

Браузер проходит шесть этапов, чтобы превратить байты в пиксели:

1. **Parse HTML → DOM** — браузер читает HTML и строит **DOM** (Document Object Model — дерево из всех элементов страницы). Он читает по кусочкам, но любой обычный \`<script>\` (без атрибутов \`async\` или \`defer\`) останавливает эту стройку, пока скрипт не скачается и не выполнится.
2. **Parse CSS → CSSOM** — из CSS строится **CSSOM** (дерево стилей, аналог DOM, но про оформление). CSS считается **render-blocking** ресурсом: браузер не начнёт рисовать, пока не скачает и не разберёт весь критический CSS. Здесь же вычисляется специфичность (кто из правил «сильнее»).
3. **Render Tree** — DOM и CSSOM склеиваются в дерево отрисовки. Узлы с \`display: none\` в него не попадают, а вот \`visibility: hidden\` остаётся (элемент есть, но невидим).
4. **Layout (Reflow)** — браузер считает геометрию: где именно и какого размера каждый элемент в пикселях. Зависит от размера окна (viewport).
5. **Paint** — заливка пикселей по слоям: текст, цвета, тени, границы.
6. **Composite** — слои собираются в финальную картинку, часто силами GPU (видеокарты).

### Почему это важно

- **JS блокирует парсер.** Встретив обычный \`<script>\`, браузер ставит построение DOM на паузу, качает и выполняет скрипт. Хуже того: если перед скриптом есть ещё не загруженный CSS, скрипт ждёт готовности CSSOM — ведь он может прочитать стили элементов.
- **Минимизируйте критические ресурсы.** Встраивайте критический CSS прямо в страницу (inline), а остальное откладывайте.

\`\`\`html
<link rel="stylesheet" href="critical.css" />
<script defer src="app.js"></script>
\`\`\`

Атрибут \`defer\` говорит: «скачай скрипт параллельно, но выполни только после того, как DOM готов» — так он не блокирует парсинг.

### Как оптимизировать на практике

\`\`\`html
<head>
  <!-- Критический CSS маленький и встроен прямо в HTML -->
  <style>/* стили для видимой части экрана */</style>

  <!-- Некритический CSS грузится, не блокируя первую отрисовку -->
  <link rel="stylesheet" href="rest.css" media="print" onload="this.media='all'" />

  <!-- JS парсится параллельно, выполняется после готовности DOM -->
  <script defer src="app.js"></script>
</head>
\`\`\`

Трюк с \`media="print"\` заставляет браузер считать этот CSS ненужным для экрана (он «для печати»), поэтому он не блокирует отрисовку; а \`onload\` переключает его на \`all\`, когда файл загрузился.

## ⚠️ Подводные камни

- Обычный \`<script>\` без \`defer\`/\`async\` в середине \`<head>\` — классический тормоз: он останавливает построение DOM.
- Один большой CSS-файл блокирует всю первую отрисовку, даже если 90% стилей нужны только внизу страницы.
- \`display: none\` убирает узел из render tree, а \`visibility: hidden\` — нет; путать их — частая ошибка.

## 🎯 Запомни

- CRP — это конвейер: DOM → CSSOM → Render Tree → Layout → Paint → Composite.
- CSS и синхронный JS — render-blocking; они задерживают первый пиксель.
- Цель оптимизации — сократить число и размер render-blocking ресурсов, чтобы First Contentful Paint (первая видимая отрисовка) наступил как можно раньше.`,
      en: `## 🧩 In plain words

The browser receives plain text from the server — HTML, CSS, JS. But the screen has to show images, buttons and colors. The Critical Rendering Path is the assembly line the browser uses to turn that text into real pixels, step by step, like a factory. The shorter the line and the fewer "traffic jams" on it, the sooner the user sees the page.

### The six-step pipeline

The browser runs six stages to turn bytes into pixels:

1. **Parse HTML → DOM** — the browser reads the HTML and builds the **DOM** (Document Object Model — a tree of all the elements on the page). It reads incrementally, but any plain \`<script>\` (without \`async\` or \`defer\`) halts this construction until the script downloads and runs.
2. **Parse CSS → CSSOM** — from CSS the browser builds the **CSSOM** (a tree like the DOM, but about styling). CSS is a **render-blocking** resource: the browser won't start drawing until all critical CSS is downloaded and parsed. Specificity (which rule "wins") is computed here.
3. **Render Tree** — DOM and CSSOM are combined into the render tree. Nodes with \`display: none\` are left out, whereas \`visibility: hidden\` stays in (the element exists but is invisible).
4. **Layout (Reflow)** — the browser computes geometry: exactly where and how big each element is, in pixels. Depends on the viewport size.
5. **Paint** — pixels are filled in across layers: text, colors, shadows, borders.
6. **Composite** — layers are assembled into the final image, often by the GPU (graphics card).

### Why it matters

- **JS blocks the parser.** When the browser hits a plain \`<script>\`, it pauses DOM construction, downloads and executes the script. Worse: if there is still-unloaded CSS before the script, the script waits for the CSSOM to be ready — because it might read element styles.
- **Minimize critical resources.** Inline critical CSS directly into the page and defer the rest.

\`\`\`html
<link rel="stylesheet" href="critical.css" />
<script defer src="app.js"></script>
\`\`\`

The \`defer\` attribute says: "download the script in parallel, but run it only after the DOM is ready" — so it doesn't block parsing.

### How to optimize in practice

\`\`\`html
<head>
  <!-- Critical CSS kept small and inlined right into the HTML -->
  <style>/* above-the-fold styles */</style>

  <!-- Non-critical CSS loaded without blocking the first paint -->
  <link rel="stylesheet" href="rest.css" media="print" onload="this.media='all'" />

  <!-- App JS parsed in parallel, executed after the DOM is ready -->
  <script defer src="app.js"></script>
</head>
\`\`\`

The \`media="print"\` trick makes the browser treat this CSS as unneeded for the screen (it's "for print"), so it doesn't block rendering; then \`onload\` switches it to \`all\` once the file has loaded.

## ⚠️ Common pitfalls

- A plain \`<script>\` without \`defer\`/\`async\` in the middle of \`<head>\` is a classic bottleneck: it halts DOM construction.
- One big CSS file blocks the entire first paint, even if 90% of the styles are only needed at the bottom of the page.
- \`display: none\` removes a node from the render tree, but \`visibility: hidden\` does not — confusing the two is a common mistake.

## 🎯 Key takeaways

- The CRP is a pipeline: DOM → CSSOM → Render Tree → Layout → Paint → Composite.
- CSS and synchronous JS are render-blocking; they delay the first pixel.
- The optimization goal is to reduce the number and size of render-blocking resources so First Contentful Paint (the first visible paint) happens as early as possible.`
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
    category: 'web-performance',
    level: 'Hard',
    tags: ['reflow', 'repaint', 'rendering'],
    question: {
      ru: 'В чём разница между reflow (layout) и repaint? Какие операции вызывают каждый из них и почему это критично для производительности?',
      en: 'What is the difference between reflow (layout) and repaint? Which operations trigger each, and why does it matter for performance?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что страница — это витрина магазина. **Reflow** — это когда ты переставляешь мебель: сдвинул один стол, и приходится заново расставлять всё вокруг. **Repaint** — это когда мебель стоит на месте, но ты просто перекрашиваешь стену: расстановка та же, меняется только цвет. Первое дороже, потому что тянет за собой пересчёт всего окружения; второе дешевле. Понимание разницы помогает делать анимации плавными, а не дёргаными.

### Reflow против Repaint

- **Reflow (Layout)** — пересчёт геометрии: размеров, позиций, переносов текста. Самая дорогая операция, потому что изменение одного элемента может каскадом задеть его потомков, предков и соседей (сиблингов).
- **Repaint** — перерисовка пикселей без изменения геометрии (например, смена \`color\`, \`background\`, \`visibility\`). Дешевле reflow, но всё равно нагружает процессор (CPU).

### Что вызывает reflow

- Изменение \`width\`, \`height\`, \`margin\`, \`padding\`, \`top\`, \`left\`, \`font-size\` — всё, что меняет размер или положение.
- Добавление или удаление узлов DOM.
- Изменение текстового содержимого.
- Чтение «layout-провоцирующих» свойств: \`offsetTop\`, \`offsetWidth\`, \`scrollHeight\`, \`getBoundingClientRect()\`, \`getComputedStyle()\`. Они форсируют **синхронный reflow**, если у браузера есть незакоммиченные изменения — ведь чтобы вернуть точное число, ему надо сначала всё пересчитать.

### Что вызывает только repaint

- \`color\`, \`background-color\`, \`box-shadow\`, \`outline\`, \`visibility\` — свойства, меняющие внешний вид, но не геометрию.

### Что не вызывает ни reflow, ни repaint (только composite)

- \`transform\` и \`opacity\` — их обрабатывает композитор на GPU, минуя пересчёт геометрии и перерисовку. Это самый дешёвый путь.

### Как это выглядит в коде

\`\`\`js
el.style.width = '200px';        // reflow: layout -> paint -> composite
el.style.background = 'crimson'; // repaint: paint -> composite
el.style.transform = 'scale(2)'; // только composite (дёшево, на GPU)

// Чтение геометрии форсирует синхронный reflow:
const w = el.offsetWidth;        // сбрасывает отложенный layout
\`\`\`

### Практический вывод

Анимируй через \`transform\`/\`opacity\` и избегай анимаций \`top\`/\`left\`/\`width\`. Группируй чтения и записи DOM, чтобы не вызывать **forced synchronous layout** (принудительный синхронный пересчёт), известный как layout thrashing. Браузер старается собрать все изменения в один кадр, но синхронное чтение размеров ломает эту оптимизацию — он вынужден пересчитывать немедленно.

## ⚠️ Подводные камни

- Reflow почти всегда влечёт за собой repaint (после пересчёта геометрии нужно перерисовать), а вот repaint без reflow — возможен.
- Чтение \`offsetWidth\` или \`getBoundingClientRect()\` сразу после записи в стиль — скрытая ловушка: оно тайно запускает reflow.
- Анимация \`width\`/\`left\` в цикле кажется безобидной, но убивает частоту кадров на слабых устройствах.

## 🎯 Запомни

- Reflow = пересчёт геометрии (дорого); Repaint = перекраска пикселей (дешевле); \`transform\`/\`opacity\` = только composite (дешевле всего).
- Чтение геометрических свойств форсирует синхронный reflow.
- Для плавных анимаций используй \`transform\` и \`opacity\`, а чтения и записи DOM разноси по фазам.`,
      en: `## 🧩 In plain words

Think of a page as a shop window. **Reflow** is when you rearrange the furniture: move one table and everything around it has to be repositioned. **Repaint** is when the furniture stays put but you just repaint a wall: same layout, only the color changes. The first is more expensive because it drags a recomputation of everything around it; the second is cheaper. Knowing the difference is how you make animations smooth instead of janky.

### Reflow vs Repaint

- **Reflow (Layout)** — recomputing geometry: sizes, positions, text wrapping. The most expensive operation, because changing one element can cascade to its descendants, ancestors and siblings.
- **Repaint** — repainting pixels without changing geometry (e.g. changing \`color\`, \`background\`, \`visibility\`). Cheaper than reflow but still loads the CPU.

### What triggers a reflow

- Changing \`width\`, \`height\`, \`margin\`, \`padding\`, \`top\`, \`left\`, \`font-size\` — anything that changes size or position.
- Adding or removing DOM nodes.
- Changing text content.
- Reading "layout-provoking" properties: \`offsetTop\`, \`offsetWidth\`, \`scrollHeight\`, \`getBoundingClientRect()\`, \`getComputedStyle()\`. They force a **synchronous reflow** if the browser has uncommitted changes — to return an exact number it must recompute everything first.

### What triggers only a repaint

- \`color\`, \`background-color\`, \`box-shadow\`, \`outline\`, \`visibility\` — properties that change appearance but not geometry.

### What triggers neither (composite only)

- \`transform\` and \`opacity\` — handled by the compositor on the GPU, skipping geometry recompute and repaint. This is the cheapest path.

### What it looks like in code

\`\`\`js
el.style.width = '200px';        // reflow: layout -> paint -> composite
el.style.background = 'crimson'; // repaint: paint -> composite
el.style.transform = 'scale(2)'; // composite only (cheap, on GPU)

// Reading geometry forces a synchronous reflow:
const w = el.offsetWidth;        // flushes pending layout
\`\`\`

### Practical takeaway

Animate via \`transform\`/\`opacity\` and avoid animating \`top\`/\`left\`/\`width\`. Batch DOM reads and writes to avoid **forced synchronous layout** (a.k.a. layout thrashing). The browser tries to collect all changes into one frame, but a synchronous size read breaks that optimization — it is forced to recompute immediately.

## ⚠️ Common pitfalls

- A reflow almost always drags a repaint with it (after geometry changes, pixels must be redrawn), whereas a repaint without reflow is possible.
- Reading \`offsetWidth\` or \`getBoundingClientRect()\` right after writing a style is a hidden trap: it silently triggers a reflow.
- Animating \`width\`/\`left\` in a loop looks harmless but kills the frame rate on weaker devices.

## 🎯 Key takeaways

- Reflow = geometry recompute (expensive); Repaint = repaint pixels (cheaper); \`transform\`/\`opacity\` = composite only (cheapest).
- Reading geometric properties forces a synchronous reflow.
- For smooth animations use \`transform\` and \`opacity\`, and separate DOM reads from writes into phases.`
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
    category: 'web-performance',
    level: 'Expert',
    tags: ['layout-thrashing', 'batching', 'requestanimationframe'],
    question: {
      ru: 'Что такое layout thrashing (forced synchronous layout)? Как его обнаружить и устранить?',
      en: 'What is layout thrashing (forced synchronous layout)? How do you detect and fix it?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что ты меряешь длину стола, потом двигаешь его, снова меряешь, снова двигаешь — и так сто раз подряд. Каждый раз после сдвига измерение заставляет тебя перепроверять всю комнату. **Layout thrashing** — это ровно то же самое в браузере: код в цикле то меняет DOM, то читает размеры, и браузер вынужден пересчитывать геометрию снова и снова. Вместо одного пересчёта за кадр их получаются сотни, и страница тормозит.

### Что такое layout thrashing

Это паттерн, когда в цикле чередуются **запись** в DOM и **чтение** геометрических свойств (\`offsetWidth\`, \`offsetHeight\` и т.п.). Каждое чтение после записи форсирует **синхронный reflow** (немедленный пересчёт геометрии), потому что браузер обязан вернуть актуальное значение. Второе название — **forced synchronous layout** (принудительный синхронный layout).

### Антипаттерн

\`\`\`ts
// ПЛОХО: read-write-read-write вызывает N reflows
for (const el of boxes) {
  const w = el.offsetWidth;       // read — форсирует layout
  el.style.width = w + 10 + 'px'; // write — инвалидирует layout
}
\`\`\`

Здесь на каждой итерации мы сначала читаем размер (браузер пересчитывает layout), потом пишем (layout снова «грязный»). Для N элементов — N дорогих пересчётов.

### Решение — батчинг read/write

\`\`\`ts
// ХОРОШО: сначала все чтения, потом все записи
const widths = boxes.map((el) => el.offsetWidth); // batch reads
boxes.forEach((el, i) => {
  el.style.width = widths[i] + 10 + 'px';         // batch writes
});
\`\`\`

Сначала собираем все размеры одним проходом (браузер пересчитывает layout максимум один раз), потом одним проходом всё записываем. Итог — ровно один reflow вместо N.

### Как обнаружить

- В Chrome DevTools → вкладка **Performance** видны фиолетовые блоки **«Layout»** с предупреждением *Forced reflow*.
- Обрати внимание на дорожку *Recalculate Style* и на длинные задачи (long tasks) — блоки, которые заняли больше ~50 мс.

### Инструменты и приёмы

- Библиотека **FastDOM** автоматически разносит чтения и записи по разным фазам \`requestAnimationFrame\`.
- \`requestAnimationFrame\` — планирует запись прямо перед следующим кадром отрисовки.
- \`ResizeObserver\` — сообщает об изменении размеров через колбэк вместо того, чтобы опрашивать их в цикле.

\`\`\`ts
function thrash(boxes) {
  // Чередование read/write — медленно
  boxes.forEach((el) => {
    el.style.height = el.offsetHeight * 2 + 'px';
  });
}

function batched(boxes) {
  const heights = boxes.map((el) => el.offsetHeight); // сначала чтения
  boxes.forEach((el, i) => {                           // потом записи
    el.style.height = heights[i] * 2 + 'px';
  });
}
\`\`\`

Ключевая идея: браузер держит «грязный» флаг layout. Любая запись помечает layout грязным, а любое чтение геометрии заставляет пересчитать его немедленно. Разделив фазы чтения и записи, ты позволяешь браузеру выполнить ровно один reflow.

## ⚠️ Подводные камни

- Проблема часто прячется внутри геттера или вспомогательной функции — чтение \`getBoundingClientRect()\` может быть неочевидным.
- \`getComputedStyle()\`, \`scrollTop\`, \`clientHeight\` — тоже провоцируют synchronous layout, не только \`offsetWidth\`.
- Батчинг помогает, только если записи идут после всех чтений; одна забытая запись между чтениями возвращает проблему.

## 🎯 Запомни

- Layout thrashing — это чередование записей и чтений геометрии в цикле, дающее N reflows вместо одного.
- Лечится батчингом: сначала все чтения, потом все записи.
- Ищи в DevTools Performance предупреждения *Forced reflow*; используй FastDOM, \`requestAnimationFrame\` и \`ResizeObserver\`.`,
      en: `## 🧩 In plain words

Imagine measuring the length of a table, then moving it, measuring again, moving again — a hundred times in a row. Every time you move it, the measurement forces you to re-check the whole room. **Layout thrashing** is exactly that in the browser: code in a loop keeps changing the DOM and then reading sizes, forcing the browser to recompute geometry over and over. Instead of one recompute per frame you get hundreds, and the page stutters.

### What layout thrashing is

It's a pattern where a loop alternates **writes** to the DOM and **reads** of geometric properties (\`offsetWidth\`, \`offsetHeight\`, etc.). Each read after a write forces a **synchronous reflow** (an immediate geometry recompute) because the browser must return an up-to-date value. Its other name is **forced synchronous layout**.

### Anti-pattern

\`\`\`ts
// BAD: read-write-read-write causes N reflows
for (const el of boxes) {
  const w = el.offsetWidth;       // read — forces layout
  el.style.width = w + 10 + 'px'; // write — invalidates layout
}
\`\`\`

On each iteration we first read a size (the browser recomputes layout), then write (layout is "dirty" again). For N elements — N expensive recomputes.

### Fix — batch reads/writes

\`\`\`ts
// GOOD: all reads first, then all writes
const widths = boxes.map((el) => el.offsetWidth); // batch reads
boxes.forEach((el, i) => {
  el.style.width = widths[i] + 10 + 'px';         // batch writes
});
\`\`\`

First gather all sizes in one pass (the browser recomputes layout at most once), then write everything in one pass. Result — exactly one reflow instead of N.

### How to detect it

- In Chrome DevTools → the **Performance** tab shows purple **"Layout"** blocks with a *Forced reflow* warning.
- Watch the *Recalculate Style* lane and long tasks — blocks that took more than ~50 ms.

### Tooling and techniques

- The **FastDOM** library automatically schedules reads and writes into separate \`requestAnimationFrame\` phases.
- \`requestAnimationFrame\` — schedules writes right before the next paint frame.
- \`ResizeObserver\` — reports size changes via a callback instead of polling them in a loop.

\`\`\`ts
function thrash(boxes) {
  // Interleaved read/write — slow
  boxes.forEach((el) => {
    el.style.height = el.offsetHeight * 2 + 'px';
  });
}

function batched(boxes) {
  const heights = boxes.map((el) => el.offsetHeight); // reads first
  boxes.forEach((el, i) => {                           // writes after
    el.style.height = heights[i] * 2 + 'px';
  });
}
\`\`\`

Key idea: the browser keeps a "dirty" layout flag. Any write marks layout dirty, and any geometry read forces an immediate recompute. By separating the read and write phases, you let the browser do exactly one reflow.

## ⚠️ Common pitfalls

- The problem often hides inside a getter or helper function — a \`getBoundingClientRect()\` read can be non-obvious.
- \`getComputedStyle()\`, \`scrollTop\`, \`clientHeight\` also provoke synchronous layout, not just \`offsetWidth\`.
- Batching only helps if writes come after all reads; one forgotten write between reads brings the problem back.

## 🎯 Key takeaways

- Layout thrashing is interleaving geometry writes and reads in a loop, giving N reflows instead of one.
- The fix is batching: all reads first, then all writes.
- Look for *Forced reflow* warnings in DevTools Performance; use FastDOM, \`requestAnimationFrame\` and \`ResizeObserver\`.`
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
    category: 'web-performance',
    level: 'Hard',
    tags: ['compositor', 'transform', 'gpu'],
    question: {
      ru: 'Почему transform и opacity называют compositor-only свойствами? Как это влияет на плавность анимаций?',
      en: 'Why are transform and opacity called compositor-only properties? How does that affect animation smoothness?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Вспомни мультфильмы: фон рисуют один раз, а поверх него двигают отдельный прозрачный слой с персонажем. Не нужно перерисовывать всю сцену — достаточно сдвинуть верхний лист. Свойства \`transform\` и \`opacity\` работают так же: браузер может двигать и делать элемент прозрачнее, не пересчитывая и не перерисовывая всю страницу. Поэтому их и называют **compositor-only** — они меняются только на финальном этапе «сборки слоёв», а этот этап очень быстрый.

### Что такое compositor-only свойства

\`transform\` (сдвиг, поворот, масштаб) и \`opacity\` (прозрачность) можно анимировать, минуя этапы **Layout** (пересчёт геометрии) и **Paint** (перерисовка пикселей). Их изменения обрабатываются только на этапе **Composite** — сборки готовых слоёв, часто на отдельном потоке композитора и на GPU (видеокарте).

### Конвейер для разных свойств

- \`width\`/\`top\` → **Layout → Paint → Composite** (дорого, в главном потоке).
- \`background-color\` → **Paint → Composite** (средне).
- \`transform\`/\`opacity\` → **только Composite** (дёшево, на GPU / потоке композитора).

### Почему это важно для 60 fps

Браузер использует отдельный **compositor thread** (поток композитора), не тот, где крутится твой JavaScript. Если анимация идёт только через \`transform\`/\`opacity\`, она может продолжаться плавно, даже когда главный поток (main thread) занят тяжёлым JavaScript — отсюда и плавность. Бюджет одного кадра при 60 fps — примерно **16.7 мс**; при 120 fps — **8.3 мс**. Не уложился в бюджет — кадр пропущен, глаз видит рывок.

### Как создаётся слой (layer)

Элемент получает собственный композиторный слой, когда есть:

- \`will-change: transform\` — подсказка браузеру «этот элемент скоро будет анимироваться»;
- \`transform: translateZ(0)\` — старый хак принудительного выноса на слой (promotion);
- 3D-трансформации, \`<video>\`, \`<canvas>\`, анимируемый \`opacity\`.

### Пример

\`\`\`css
.card {
  transition: transform 200ms ease-out;
}
.card:hover {
  transform: translateY(-4px) scale(1.02);
}
\`\`\`

Тут карточка при наведении слегка приподнимается и увеличивается через \`transform\` — анимация идёт на композиторе, плавно и без нагрузки на главный поток.

## ⚠️ Подводные камни

- Слои потребляют **видеопамять**; слишком много слоёв (layer explosion — «взрыв слоёв») наоборот тормозит композитинг.
- \`will-change\` нужно ставить заранее (чтобы браузер успел подготовить слой), но убирать после анимации, иначе память тратится впустую.
- \`translateZ(0)\` — устаревший хак; современный и более честный способ — \`will-change\`.

## 🎯 Запомни

- \`transform\` и \`opacity\` пропускают Layout и Paint, меняясь только на этапе Composite — это самый дешёвый путь.
- Композитор работает в отдельном потоке, поэтому такие анимации остаются плавными даже при загруженном main thread.
- Анимируй через \`transform\`/\`opacity\`, ставь \`will-change\` с умом и не плоди лишние слои.`,
      en: `## 🧩 In plain words

Remember old cartoons: the background is drawn once, and a separate transparent sheet with the character slides over it. You don't repaint the whole scene — you just move the top sheet. The \`transform\` and \`opacity\` properties work the same way: the browser can move an element or fade it without recomputing or repainting the whole page. That's why they're called **compositor-only** — they change only at the final "assemble the layers" stage, and that stage is very fast.

### What compositor-only properties are

\`transform\` (move, rotate, scale) and \`opacity\` (transparency) can be animated while skipping the **Layout** stage (geometry recompute) and the **Paint** stage (pixel repaint). Their changes are handled only at the **Composite** stage — assembling the finished layers, often on a separate compositor thread and on the GPU (graphics card).

### The pipeline per property

- \`width\`/\`top\` → **Layout → Paint → Composite** (expensive, main thread).
- \`background-color\` → **Paint → Composite** (medium).
- \`transform\`/\`opacity\` → **Composite only** (cheap, GPU / compositor thread).

### Why it matters for 60 fps

The browser uses a separate **compositor thread**, not the one your JavaScript runs on. If an animation runs only via \`transform\`/\`opacity\`, it can keep going smoothly even while the main thread is busy with heavy JavaScript — hence the smoothness. The budget for one frame at 60 fps is about **16.7 ms**; at 120 fps it is **8.3 ms**. Miss the budget and the frame is dropped, which the eye sees as a stutter.

### How a layer is created

An element gets its own compositor layer when there is:

- \`will-change: transform\` — a hint to the browser "this element is about to animate";
- \`transform: translateZ(0)\` — an old hack that forces promotion onto its own layer;
- 3D transforms, \`<video>\`, \`<canvas>\`, animated \`opacity\`.

### Example

\`\`\`css
.card {
  transition: transform 200ms ease-out;
}
.card:hover {
  transform: translateY(-4px) scale(1.02);
}
\`\`\`

Here the card lifts and grows slightly on hover via \`transform\` — the animation runs on the compositor, smoothly and without loading the main thread.

## ⚠️ Common pitfalls

- Layers consume **video memory**; too many layers (layer explosion) actually slows compositing down.
- \`will-change\` must be set ahead of time (so the browser can prepare the layer) but removed after the animation, otherwise memory is wasted.
- \`translateZ(0)\` is a legacy hack; the modern, more honest way is \`will-change\`.

## 🎯 Key takeaways

- \`transform\` and \`opacity\` skip Layout and Paint, changing only at the Composite stage — the cheapest path.
- The compositor runs on a separate thread, so these animations stay smooth even when the main thread is busy.
- Animate via \`transform\`/\`opacity\`, use \`will-change\` wisely, and don't spawn unnecessary layers.`
    }
  },
  {
    id: 'web-005',
    category: 'web-performance',
    level: 'Medium',
    tags: ['will-change', 'gpu-layers', 'optimization'],
    question: {
      ru: 'Как работает will-change? Когда его стоит использовать, а когда он вредит производительности?',
      en: 'How does will-change work? When should you use it, and when does it hurt performance?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что перед началом спектакля рабочие сцены заранее выкатывают декорации, чтобы во время представления ничего не тормозило. \`will-change\` — это ровно такая подсказка браузеру: «эй, вот этот элемент скоро начнёт двигаться, подготовься заранее». Браузер заранее выделяет для элемента отдельный слой, и анимация стартует плавно, без рывка в первый момент.

### Что делает will-change

\`will-change\` — это CSS-свойство, которым вы сообщаете браузеру, какое свойство элемента скоро изменится (например \`transform\` или \`opacity\`). Получив подсказку, браузер обычно **выносит элемент на отдельный композиторный слой** — то есть рисует его как отдельную «наклейку», которую видеокарта может двигать независимо от остальной страницы.

Зачем это нужно: без подсказки браузер создаёт такой слой прямо в момент начала анимации, «на лету». Это создаёт короткий рывок — то, что называют **джанк** (jank), заметное подтормаживание. \`will-change\` убирает этот рывок, потому что подготовка сделана заранее.

### Как использовать правильно

Главное правило: включать \`will-change\` **незадолго до** анимации и **снимать сразу после**. Не держите его постоянно.

- Ставьте подсказку прямо перед стартом — например, по событию \`mouseenter\` (наведение мыши).
- Снимайте её после окончания — по событию \`animationend\`.
- Всегда указывайте конкретные свойства: \`will-change: transform, opacity\`, а не что-то абстрактное.

\`\`\`ts
el.addEventListener('mouseenter', () => {
  el.style.willChange = 'transform';
});
el.addEventListener('animationend', () => {
  el.style.willChange = 'auto'; // освобождаем слой
});
\`\`\`

Здесь мы «предупреждаем» браузер о будущей трансформации при наведении, а когда анимация закончилась — возвращаем значение \`auto\`, освобождая выделенную под слой память.

### Когда will-change вредит

Отдельный слой стоит ресурсов: он занимает видеопамять (память видеокарты). Если слоёв слишком много, память заканчивается и композитинг (сборка страницы из слоёв) наоборот замедляется.

- **Глобально на всём подряд** — правило вроде \`* { will-change: transform }\` даёт слой каждому элементу. Видеопамять быстро заканчивается, всё тормозит.
- **Постоянно включённый** — браузер держит ресурсы зарезервированными всё время, даже когда анимации нет.
- **Преждевременная оптимизация** — если элемент вообще не анимируется, пользы ноль, а память тратится впустую.

### Альтернатива

Раньше тот же эффект получали хаком \`transform: translateZ(0)\` или \`backface-visibility: hidden\` — они тоже заставляют браузер создать слой. \`will-change\` — это честный, стандартизированный способ сделать то же самое явно.

## ⚠️ Подводные камни

- Не вешайте \`will-change\` глобально или на десятки элементов сразу.
- Не оставляйте его включённым навсегда — обязательно снимайте после анимации.
- Не указывайте \`auto\` как «включатель» — \`auto\` это как раз выключенное состояние.
- Больше слоёв не значит быстрее: избыток слоёв замедляет композитинг.

## 🎯 Запомни

- \`will-change\` заранее готовит элемент к анимации, обычно вынося его на отдельный GPU-слой, и убирает начальный рывок (джанк).
- Включайте его **незадолго до** анимации и **снимайте после** — не держите постоянно.
- Указывайте конкретные свойства (\`transform\`, \`opacity\`), а не всё подряд.
- Это «острый инструмент», а не глобальный переключатель производительности: злоупотребление съедает видеопамять и вредит.`,
      en: `## 🧩 In plain words

Imagine that before a play starts, the stage crew rolls the scenery out ahead of time so nothing lags during the performance. \`will-change\` is exactly that kind of hint to the browser: "hey, this element is about to move, get ready in advance." The browser sets up a separate layer for the element beforehand, so the animation starts smoothly, without a stutter in the first moment.

### What will-change does

\`will-change\` is a CSS property with which you tell the browser which property of an element is about to change (for example \`transform\` or \`opacity\`). Given the hint, the browser usually **promotes the element to its own compositor layer** — meaning it draws the element as a separate "sticker" that the graphics card can move independently from the rest of the page.

Why this matters: without the hint, the browser creates that layer at the very moment the animation begins, "on the fly." That causes a brief stutter — what's called **jank**, a noticeable hiccup. \`will-change\` removes that stutter because the preparation was done ahead of time.

### How to use it correctly

The golden rule: turn \`will-change\` on **shortly before** the animation and turn it off **right after**. Don't keep it on permanently.

- Set the hint just before the start — for example on \`mouseenter\` (mouse hover).
- Remove it after it's done — on \`animationend\`.
- Always name concrete properties: \`will-change: transform, opacity\`, not something vague.

\`\`\`ts
el.addEventListener('mouseenter', () => {
  el.style.willChange = 'transform';
});
el.addEventListener('animationend', () => {
  el.style.willChange = 'auto'; // release the layer
});
\`\`\`

Here we "warn" the browser about an upcoming transform on hover, and when the animation ends we set the value back to \`auto\`, releasing the memory reserved for the layer.

### When will-change hurts

A separate layer costs resources: it takes up video memory (the graphics card's memory). If there are too many layers, memory runs out and compositing (assembling the page from layers) actually slows down.

- **Globally on everything** — a rule like \`* { will-change: transform }\` gives every element a layer. Video memory runs out fast and everything slows down.
- **Permanently on** — the browser keeps resources reserved the whole time, even when there's no animation.
- **Premature optimization** — if the element never animates, there's zero benefit and memory is wasted.

### Alternative

People used to get the same effect with the hack \`transform: translateZ(0)\` or \`backface-visibility: hidden\` — those also force the browser to create a layer. \`will-change\` is the honest, standardized way to do the same thing explicitly.

## ⚠️ Common pitfalls

- Don't apply \`will-change\` globally or to dozens of elements at once.
- Don't leave it on forever — always remove it after the animation.
- Don't treat \`auto\` as an "on" switch — \`auto\` is the off state.
- More layers is not faster: an excess of layers slows compositing down.

## 🎯 Key takeaways

- \`will-change\` prepares an element for animation ahead of time, usually by promoting it to its own GPU layer, and removes the initial stutter (jank).
- Turn it on **shortly before** the animation and turn it off **after** — don't keep it on permanently.
- Name concrete properties (\`transform\`, \`opacity\`), not everything.
- It's a "sharp tool," not a global performance switch: overusing it eats video memory and backfires.`
    }
  },
  {
    id: 'web-006',
    category: 'web-performance',
    level: 'Hard',
    tags: ['core-web-vitals', 'lcp', 'metrics'],
    question: {
      ru: 'Что такое LCP (Largest Contentful Paint)? Какие пороги «хорошо/плохо» и как его оптимизировать?',
      en: 'What is LCP (Largest Contentful Paint)? What are the good/poor thresholds and how do you optimize it?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Когда вы открываете страницу, вам важно быстро увидеть **главное** — большую картинку или заголовок, ради которых вы пришли. LCP — это секундомер, который засекает, за сколько на экране появился самый крупный видимый кусок контента. Чем быстрее — тем «быстрее» ощущается сайт для человека.

### Что такое LCP

**LCP (Largest Contentful Paint)** — «отрисовка самого крупного контента». Метрика измеряет время до момента, когда браузер нарисовал **самый большой видимый элемент** в области просмотра (viewport — то, что помещается на экране без прокрутки). Обычно это hero-изображение (большая картинка вверху), крупный блок текста или постер видео.

Почему это важно: LCP — это **прокси** (косвенный показатель) для воспринимаемой скорости загрузки. Не «когда пришёл первый байт», а «когда пользователь увидел главное».

### Пороги Core Web Vitals

Core Web Vitals — это набор ключевых метрик от Google. Для LCP пороги такие:

- **Хорошо**: ≤ **2.5 секунды**
- **Требует улучшения**: 2.5 – 4.0 секунды
- **Плохо**: > **4.0 секунды**

Оценка берётся по **75-му перцентилю** реальных пользователей — то есть 75% визитов должны укладываться в порог (это field data, «полевые данные» из отчёта CrUX — Chrome User Experience Report).

### Что влияет на LCP

1. **TTFB (Time To First Byte)** — время до первого байта ответа сервера. Медленный сервер или отсутствие CDN затягивают старт.
2. **Render-blocking CSS/JS** — ресурсы, блокирующие отрисовку: пока они не загрузятся, браузер не рисует страницу.
3. **Время загрузки самого LCP-ресурса** — например, тяжёлое изображение долго качается.
4. **Client-side рендеринг** — если контент рисуется скриптом в браузере, главный элемент появляется поздно.

### Как оптимизировать

- Дайте браузеру фору: \`<link rel="preload">\` (предзагрузка) и \`fetchpriority="high"\` (высокий приоритет) для LCP-изображения.
- Оптимизируйте картинки: современные форматы AVIF/WebP (весят меньше), \`srcset\` (разные размеры под разные экраны), правильный физический размер.
- Сократите render-blocking ресурсы и инлайньте критический CSS (вставляйте важные стили прямо в HTML).
- Используйте SSR/SSG (рендеринг на сервере / генерацию статики), чтобы контент пришёл готовым и появился раньше.
- Подключите CDN и кэширование, чтобы снизить TTFB.

\`\`\`html
<link rel="preload" as="image" href="hero.avif" fetchpriority="high" />
<img src="hero.avif" fetchpriority="high" width="1200" height="600" alt="Hero" />
\`\`\`

Здесь мы заранее просим браузер скачать hero-картинку с высоким приоритетом, а также задаём её \`width\`/\`height\`, чтобы место под неё было известно сразу.

### Как измерить в реальности

Можно наблюдать за кандидатом на LCP прямо в браузере пользователя (RUM — Real User Monitoring, мониторинг реальных пользователей) через \`PerformanceObserver\`:

\`\`\`ts
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lcp = entries[entries.length - 1]; // побеждает последний кандидат
  console.log('LCP', Math.round(lcp.startTime), 'ms', lcp.element);
}).observe({ type: 'largest-contentful-paint', buffered: true });
\`\`\`

\`PerformanceObserver\` — это встроенный API, который сообщает о событиях производительности. По мере загрузки браузер может несколько раз пересматривать, какой элемент «самый крупный», поэтому мы берём **последнего** кандидата в списке.

## ⚠️ Подводные камни

- LCP-элемент может меняться по мере загрузки страницы; финальное значение **фиксируется при первом взаимодействии** пользователя (клик, тап, прокрутка).
- Изображение без указанных \`width\`/\`height\` не только вредит LCP, но и вызывает сдвиги макета (CLS).
- \`preload\` без \`fetchpriority\` не всегда даёт нужный приоритет — используйте их вместе для LCP-картинки.
- Лабораторные тесты (Lighthouse) и полевые данные (CrUX) могут расходиться — ориентируйтесь на реальных пользователей.

## 🎯 Запомни

- LCP = время до отрисовки **самого крупного видимого элемента** (обычно hero-картинка или крупный текст).
- Пороги: **≤ 2.5 с — хорошо**, > 4.0 с — плохо; по 75-му перцентилю реальных пользователей.
- Главные рычаги: снизить TTFB, ускорить загрузку LCP-ресурса (preload + fetchpriority + современные форматы), убрать render-blocking, отдавать контент через SSR/SSG.`,
      en: `## 🧩 In plain words

When you open a page, what you care about is quickly seeing the **main thing** — the big image or headline you came for. LCP is a stopwatch that measures how long it took for the largest visible chunk of content to appear on screen. The faster it shows up, the "faster" the site feels to a human.

### What LCP is

**LCP (Largest Contentful Paint)** measures the time until the browser has painted the **largest visible element** in the viewport (the part of the page visible on screen without scrolling). Usually that's a hero image (the big picture at the top), a large text block, or a video poster.

Why it matters: LCP is a **proxy** (an indirect indicator) for perceived load speed. Not "when the first byte arrived," but "when the user saw the main thing."

### Core Web Vitals thresholds

Core Web Vitals is a set of key metrics from Google. For LCP the thresholds are:

- **Good**: ≤ **2.5 seconds**
- **Needs improvement**: 2.5 – 4.0 seconds
- **Poor**: > **4.0 seconds**

The score is taken at the **75th percentile** of real users — meaning 75% of visits should come in under the threshold (this is field data, from the CrUX report — Chrome User Experience Report).

### What affects LCP

1. **TTFB (Time To First Byte)** — the time until the server's first byte of response. A slow server or no CDN drags out the start.
2. **Render-blocking CSS/JS** — resources that block rendering: until they load, the browser won't paint the page.
3. **Load time of the LCP resource itself** — for example, a heavy image takes a long time to download.
4. **Client-side rendering** — if content is drawn by script in the browser, the main element appears late.

### How to optimize

- Give the browser a head start: \`<link rel="preload">\` (preloading) and \`fetchpriority="high"\` for the LCP image.
- Optimize images: modern formats AVIF/WebP (smaller size), \`srcset\` (different sizes for different screens), correct physical dimensions.
- Reduce render-blocking resources and inline critical CSS (put important styles right in the HTML).
- Use SSR/SSG (server-side rendering / static generation) so content arrives ready and shows up sooner.
- Add a CDN and caching to lower TTFB.

\`\`\`html
<link rel="preload" as="image" href="hero.avif" fetchpriority="high" />
<img src="hero.avif" fetchpriority="high" width="1200" height="600" alt="Hero" />
\`\`\`

Here we ask the browser to download the hero image early with high priority, and we set its \`width\`/\`height\` so its space is known right away.

### How to measure it in the wild

You can observe the LCP candidate right in the user's browser (RUM — Real User Monitoring) via \`PerformanceObserver\`:

\`\`\`ts
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lcp = entries[entries.length - 1]; // last candidate wins
  console.log('LCP', Math.round(lcp.startTime), 'ms', lcp.element);
}).observe({ type: 'largest-contentful-paint', buffered: true });
\`\`\`

\`PerformanceObserver\` is a built-in API that reports performance events. As the page loads, the browser may revise which element is "largest" several times, so we take the **last** candidate in the list.

## ⚠️ Common pitfalls

- The LCP element can change as the page loads; the final value is **locked in at the user's first interaction** (click, tap, scroll).
- An image without \`width\`/\`height\` not only hurts LCP but also causes layout shifts (CLS).
- \`preload\` without \`fetchpriority\` doesn't always give the priority you want — use them together for the LCP image.
- Lab tests (Lighthouse) and field data (CrUX) can diverge — trust real-user data.

## 🎯 Key takeaways

- LCP = time to paint the **largest visible element** (usually a hero image or large text).
- Thresholds: **≤ 2.5 s is good**, > 4.0 s is poor; measured at the 75th percentile of real users.
- Main levers: lower TTFB, speed up the LCP resource (preload + fetchpriority + modern formats), cut render-blocking, serve content via SSR/SSG.`
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
    category: 'web-performance',
    level: 'Hard',
    tags: ['core-web-vitals', 'cls', 'layout-shift'],
    question: {
      ru: 'Что такое CLS (Cumulative Layout Shift)? Как он вычисляется и какие частые причины сдвигов макета?',
      en: 'What is CLS (Cumulative Layout Shift)? How is it computed and what are common causes of layout shifts?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Знакомо чувство: читаешь текст на странице, и вдруг всё «прыгает» вниз, потому что сверху подгрузилась картинка или баннер — и ты промахиваешься мимо кнопки. CLS — это оценка того, насколько сильно и часто контент вот так неожиданно скачет. Чем меньше CLS, тем стабильнее и приятнее страница.

### Что такое CLS

**CLS (Cumulative Layout Shift)** — «накопленный сдвиг макета». Это метрика **визуальной стабильности**: показывает, насколько неожиданно контент двигается, пока страница уже видна пользователю.

Каждый отдельный сдвиг оценивается как произведение двух долей:

- **impact fraction** — какая часть экрана была затронута сдвигом.
- **distance fraction** — как далеко (относительно экрана) уехал элемент.

CLS — это не сумма всех сдвигов подряд, а сумма самого «плохого» **окна сессии** (session window): группы сдвигов, случившихся близко по времени. Берётся наихудшая такая группа за визит.

### Пороги

- **Хорошо**: ≤ **0.1**
- **Требует улучшения**: 0.1 – 0.25
- **Плохо**: > **0.25**

Важный нюанс: считаются только **неожиданные** сдвиги. Если контент сдвинулся в течение **500 мс после действия пользователя** (клик, тап), это считается «ожидаемым» (пользователь сам вызвал изменение) и штраф не начисляется.

### Частые причины сдвигов

- **Изображения и видео без указанных размеров** — браузер не знает, сколько места занять, поэтому текст прыгает, когда картинка догрузилась.
- **Реклама, эмбеды, iframes без зарезервированного места** — приходят позже и распихивают контент.
- **Динамически вставляемый контент** (баннеры, уведомления), появляющийся **над** уже существующим — толкает всё вниз.
- **Веб-шрифты**, вызывающие FOIT/FOUT — вспышку невидимого или нестилизованного текста (Flash Of Invisible/Unstyled Text): при смене шрифта пересчитывается высота текста, и макет дёргается.

### Как избежать

Резервируйте место заранее. Свойство \`aspect-ratio\` (соотношение сторон) держит место под медиа ещё до его загрузки:

\`\`\`css
img,
video {
  aspect-ratio: 16 / 9; /* резервируем место заранее */
  width: 100%;
  height: auto;
}
\`\`\`

- Всегда задавайте \`width\`/\`height\` или \`aspect-ratio\` для картинок и видео.
- Резервируйте место под динамические блоки: скелетоны (skeleton — серые заглушки) или \`min-height\`.
- Для шрифтов используйте \`font-display: optional\` и \`size-adjust\`, чтобы смена шрифта не дёргала высоту.
- Вставляйте новый контент **под** видимой областью (below the fold) или по действию пользователя.
- Анимируйте через \`transform\` (сдвиг/масштаб на GPU), а не через изменение геометрии (\`top\`, \`height\`), которое двигает соседей.

### Как измерить самому

\`\`\`ts
let cls = 0;
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      cls += entry.value;
    }
  }
  console.log('CLS so far', cls.toFixed(3));
}).observe({ type: 'layout-shift', buffered: true });
\`\`\`

Здесь \`PerformanceObserver\` слушает события \`layout-shift\`. Флаг \`hadRecentInput\` говорит, что сдвиг случился сразу после ввода пользователя — такие мы **пропускаем**, чтобы не штрафовать ожидаемые изменения, и суммируем только \`value\` неожиданных сдвигов.

## ⚠️ Подводные камни

- CLS считает только **неожиданные** сдвиги — сдвиг в течение 500 мс после ввода не штрафуется.
- CLS — это худшее **окно сессии**, а не простая сумма всех сдвигов за всё время.
- \`min-height\` на контейнере не спасёт, если внутри всё равно вставляется контент над видимым — резервируйте место именно там, где он появится.
- Ленивая загрузка (lazy-load) без заданных размеров — частый источник сдвигов.

## 🎯 Запомни

- CLS = визуальная стабильность: насколько неожиданно «прыгает» контент. Каждый сдвиг = impact × distance.
- Пороги: **≤ 0.1 — хорошо**, > 0.25 — плохо.
- Главное лекарство — **резервировать место заранее**: \`width\`/\`height\` или \`aspect-ratio\`, скелетоны, аккуратные шрифты.
- Анимируйте через \`transform\`, а не через изменение размеров и позиции.`,
      en: `## 🧩 In plain words

You know the feeling: you're reading text on a page, and suddenly everything "jumps" down because an image or banner loaded above it — and you miss the button you were aiming for. CLS is a score for how strongly and how often content jumps around like that unexpectedly. The lower the CLS, the more stable and pleasant the page feels.

### What CLS is

**CLS (Cumulative Layout Shift)** is a metric of **visual stability**: it shows how unexpectedly content moves while the page is already visible to the user.

Each individual shift is scored as the product of two fractions:

- **impact fraction** — how much of the screen the shift affected.
- **distance fraction** — how far (relative to the screen) the element moved.

CLS is not the sum of every shift in a row, but the sum of the worst **session window**: a group of shifts that happened close together in time. The single worst such group per visit is taken.

### Thresholds

- **Good**: ≤ **0.1**
- **Needs improvement**: 0.1 – 0.25
- **Poor**: > **0.25**

An important nuance: only **unexpected** shifts count. If content shifted within **500 ms of a user action** (click, tap), it's treated as "expected" (the user caused the change themselves) and isn't penalized.

### Common causes of shifts

- **Images and videos without dimensions** — the browser doesn't know how much space to hold, so text jumps once the image finishes loading.
- **Ads, embeds, iframes without reserved space** — they arrive later and shove content around.
- **Dynamically injected content** (banners, notifications) appearing **above** existing content — it pushes everything down.
- **Web fonts** causing FOIT/FOUT — a Flash Of Invisible/Unstyled Text: when the font swaps in, text height is recomputed and the layout jerks.

### How to avoid it

Reserve space up front. The \`aspect-ratio\` property holds space for media even before it loads:

\`\`\`css
img,
video {
  aspect-ratio: 16 / 9; /* reserve space up front */
  width: 100%;
  height: auto;
}
\`\`\`

- Always set \`width\`/\`height\` or \`aspect-ratio\` on images and videos.
- Reserve space for dynamic blocks: skeletons (gray placeholders) or \`min-height\`.
- For fonts, use \`font-display: optional\` and \`size-adjust\` so a font swap doesn't jerk the height.
- Inject new content **below the fold** or on a user action.
- Animate with \`transform\` (GPU-based move/scale), not by changing geometry (\`top\`, \`height\`), which moves neighbors.

### How to measure it yourself

\`\`\`ts
let cls = 0;
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      cls += entry.value;
    }
  }
  console.log('CLS so far', cls.toFixed(3));
}).observe({ type: 'layout-shift', buffered: true });
\`\`\`

Here \`PerformanceObserver\` listens for \`layout-shift\` events. The \`hadRecentInput\` flag says the shift happened right after user input — those we **skip**, so we don't penalize expected changes, and we sum only the \`value\` of the unexpected shifts.

## ⚠️ Common pitfalls

- CLS counts only **unexpected** shifts — a shift within 500 ms of input isn't penalized.
- CLS is the worst **session window**, not a plain sum of every shift over all time.
- A \`min-height\` on a container won't help if content is still injected above the visible area — reserve space exactly where it will appear.
- Lazy-loading without set dimensions is a frequent source of shifts.

## 🎯 Key takeaways

- CLS = visual stability: how unexpectedly content jumps. Each shift = impact × distance.
- Thresholds: **≤ 0.1 is good**, > 0.25 is poor.
- The main cure is to **reserve space up front**: \`width\`/\`height\` or \`aspect-ratio\`, skeletons, careful fonts.
- Animate with \`transform\`, not by changing size and position.`
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
    category: 'web-performance',
    level: 'Expert',
    tags: ['core-web-vitals', 'inp', 'fid', 'interactivity'],
    question: {
      ru: 'Что такое INP (Interaction to Next Paint) и почему он заменил FID? Как его улучшить?',
      en: 'What is INP (Interaction to Next Paint) and why did it replace FID? How do you improve it?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что ты нажимаешь кнопку, а сайт «задумывается» на секунду, прежде чем хоть как-то отреагировать. INP — это метрика, которая измеряет, насколько быстро страница отвечает на **каждое** твоё действие в течение всего визита: клик, тап, набор текста. Раньше похожая метрика (FID) смотрела только на **первое** нажатие — а INP следит за всеми и берёт худшее.

### Что такое INP

**INP (Interaction to Next Paint)** — «от взаимодействия до следующей отрисовки». С марта 2024 года INP заменил старую метрику **FID (First Input Delay)** в Core Web Vitals (наборе ключевых метрик от Google).

INP измеряет отзывчивость на протяжении **всей** сессии, а не только первого взаимодействия. Для каждого действия он засекает полный путь и в конце берёт (примерно) самое худшее взаимодействие за визит.

### Почему INP лучше FID

- **FID** мерил только *задержку* до того, как браузер **начал** обрабатывать **первое** нажатие. Он игнорировал, сколько работал сам обработчик и сколько заняла отрисовка. То есть измерял лишь «как быстро мы взялись за дело», но не «когда пользователь увидел результат».
- **INP** учитывает весь путь взаимодействия целиком, из трёх частей:
- **input delay** — задержка перед началом обработки (браузер занят другим).
- **processing time** — время работы самого обработчика события.
- **presentation delay** — задержка до следующей отрисовки (next paint), когда пользователь наконец видит изменение.

Именно потому INP честнее: он отражает то, что реально чувствует человек, — «когда я увидел отклик».

### Пороги

- **Хорошо**: ≤ **200 мс**
- **Требует улучшения**: 200 – 500 мс
- **Плохо**: > **500 мс**

### Как улучшить

Главная причина плохого INP — **длинные задачи** (long tasks), блоки JS дольше 50 мс, во время которых браузер не может ни на что реагировать. Значит, работу нужно дробить и уступать браузеру кадры.

1. **Дробите длинные задачи** — \`scheduler.yield()\` (уступить управление браузеру), \`setTimeout\`, ручное разбиение работы на куски.
2. Откладывайте некритичную работу через \`requestIdleCallback\` (выполнить, когда браузер свободен).
3. Минимизируйте работу обработчиков событий; тяжёлые вычисления выносите в **Web Worker** (фоновый поток, не блокирующий интерфейс).
4. Избегайте больших синхронных ре-рендеров; используйте \`transition\` / concurrent-режимы (в React — «неблокирующие» обновления).
5. В Angular — \`OnPush\`, \`runOutsideAngular\`, signals, чтобы сократить циклы change detection (проверки изменений).

\`\`\`ts
async function handleClick() {
  doUrgentUiUpdate();           // мгновенный отклик
  await scheduler.yield();      // отдаём кадр браузеру
  doHeavyWork();                // тяжёлое — после отрисовки
}
\`\`\`

Идея кода: сначала делаем дешёвое видимое изменение, чтобы пользователь **сразу** увидел реакцию, затем \`scheduler.yield()\` уступает браузеру возможность отрисовать этот отклик, и только потом запускается тяжёлая работа.

### Как измерить/починить на практике

\`\`\`ts
button.addEventListener('click', async () => {
  applyImmediateUiState();           // дёшево, рисуется быстро

  // Уступаем браузеру, чтобы он отрисовал отклик
  await (scheduler?.yield?.() ?? new Promise((r) => setTimeout(r, 0)));

  await processLargeDataset();        // тяжёлая работа — после отрисовки
});
\`\`\`

Здесь \`scheduler?.yield?.()\` используется, если он поддерживается, иначе есть запасной вариант через \`setTimeout(r, 0)\`. Смысл тот же: разбить длинный обработчик так, чтобы следующая отрисовка не была заблокирована — и INP улучшается.

## ⚠️ Подводные камни

- INP берёт (примерно) **худшее** взаимодействие за визит, а не среднее — один тяжёлый клик испортит метрику.
- Считаются и клики, и тапы, и ввод с клавиатуры — не только «первое» действие, как было у FID.
- \`scheduler.yield()\` пока поддерживается не везде — держите фолбэк на \`setTimeout\`.
- Быстро «взяться» за задачу мало: пока пользователь не увидел **следующий кадр** с откликом, INP не остановился.

## 🎯 Запомни

- INP заменил FID; он мерит отзывчивость на **всех** взаимодействиях за визит, а не только на первом.
- INP = **input delay + processing time + presentation delay** — весь путь до следующей отрисовки.
- Пороги: **≤ 200 мс — хорошо**, > 500 мс — плохо.
- Лечение: дробить длинные задачи, уступать кадры браузеру (\`scheduler.yield()\`), выносить тяжёлое в Web Worker — чтобы пользователь видел **визуальный отклик в следующем кадре**.`,
      en: `## 🧩 In plain words

Imagine you press a button and the site "thinks" for a second before reacting at all. INP is a metric that measures how quickly the page responds to **every** action during your whole visit: click, tap, typing. An older, similar metric (FID) looked only at your **first** press — but INP watches all of them and takes the worst one.

### What INP is

**INP (Interaction to Next Paint)** measures the time from an interaction to the next paint. Since March 2024, INP replaced the older metric **FID (First Input Delay)** in Core Web Vitals (Google's set of key metrics).

INP measures responsiveness across the **entire** session, not just the first interaction. For each action it times the full path, and at the end it takes (roughly) the worst interaction of the visit.

### Why INP is better than FID

- **FID** measured only the *delay* before the browser **started** processing the **first** press. It ignored how long the handler itself ran and how long rendering took. In other words, it measured only "how quickly we got started," not "when the user saw the result."
- **INP** captures the whole interaction path, made of three parts:
- **input delay** — the delay before processing begins (the browser is busy with something else).
- **processing time** — how long the event handler itself runs.
- **presentation delay** — the delay until the next paint, when the user finally sees the change.

That's why INP is more honest: it reflects what a person actually feels — "when I saw the response."

### Thresholds

- **Good**: ≤ **200 ms**
- **Needs improvement**: 200 – 500 ms
- **Poor**: > **500 ms**

### How to improve it

The main cause of poor INP is **long tasks**, blocks of JS longer than 50 ms during which the browser can't respond to anything. So the work needs to be broken up, yielding frames back to the browser.

1. **Break up long tasks** — \`scheduler.yield()\` (hand control back to the browser), \`setTimeout\`, manual chunking of work.
2. Defer non-critical work via \`requestIdleCallback\` (run it when the browser is idle).
3. Minimize event-handler work; move heavy computation to a **Web Worker** (a background thread that doesn't block the UI).
4. Avoid large synchronous re-renders; use \`transition\` / concurrent modes (in React, "non-blocking" updates).
5. In Angular — \`OnPush\`, \`runOutsideAngular\`, signals to reduce change-detection cycles.

\`\`\`ts
async function handleClick() {
  doUrgentUiUpdate();      // instant feedback
  await scheduler.yield(); // hand a frame back to the browser
  doHeavyWork();           // heavy work — after paint
}
\`\`\`

The idea of the code: first make a cheap visible change so the user sees a reaction **immediately**, then \`scheduler.yield()\` gives the browser a chance to paint that feedback, and only after that does the heavy work start.

### How to measure/fix it in practice

\`\`\`ts
button.addEventListener('click', async () => {
  applyImmediateUiState();           // cheap, paints fast

  // Yield to the browser so it can paint the feedback
  await (scheduler?.yield?.() ?? new Promise((r) => setTimeout(r, 0)));

  await processLargeDataset();        // heavy work happens after paint
});
\`\`\`

Here \`scheduler?.yield?.()\` is used if it's supported, otherwise there's a fallback via \`setTimeout(r, 0)\`. The point is the same: split a long handler so the next paint isn't blocked — and INP improves.

## ⚠️ Common pitfalls

- INP takes (roughly) the **worst** interaction of the visit, not the average — one heavy click ruins the metric.
- Clicks, taps, and keyboard input all count — not only the "first" action like with FID.
- \`scheduler.yield()\` isn't supported everywhere yet — keep a \`setTimeout\` fallback.
- Getting started fast isn't enough: until the user sees the **next frame** with the response, INP hasn't stopped.

## 🎯 Key takeaways

- INP replaced FID; it measures responsiveness across **all** interactions in a visit, not just the first.
- INP = **input delay + processing time + presentation delay** — the whole path to the next paint.
- Thresholds: **≤ 200 ms is good**, > 500 ms is poor.
- The cure: break up long tasks, yield frames to the browser (\`scheduler.yield()\`), move heavy work to a Web Worker — so the user sees **visual feedback in the next frame**.`
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
    category: 'web-performance',
    level: 'Medium',
    tags: ['core-web-vitals', 'ttfb', 'fcp', 'metrics'],
    question: {
      ru: 'Что такое TTFB и FCP? Как они соотносятся с другими метриками и как их улучшить?',
      en: 'What are TTFB and FCP? How do they relate to other metrics and how do you improve them?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что ты заказал еду в ресторане. **TTFB** — это сколько ты ждёшь, пока официант принесёт хоть что-то (первый кусочек хлеба) после того, как сделал заказ. **FCP** — это момент, когда на столе появилось первое реальное блюдо, и ты понял, что ужин пошёл. Обе метрики про ощущение «загрузка началась»: чем раньше — тем меньше кажется, что сайт завис.

### TTFB — Time To First Byte (время до первого байта)

Это время от начала перехода на страницу до получения **первого байта** ответа сервера. В него входит всё, что происходит до того, как сервер начал отдавать данные: поиск адреса сервера (DNS), установка соединения (TCP), шифрование (TLS) и время самой обработки запроса на сервере.

TTFB — это «фундамент дома». Если он большой, задерживается вообще всё, что идёт следом, включая FCP и LCP.

- **Хорошо**: ≤ **800 мс** (сильные команды целятся в ≤ 200 мс).

### FCP — First Contentful Paint (первая отрисовка контента)

Это время до появления **первого** видимого контента: текста, картинки — чего угодно, кроме пустого фона. FCP говорит пользователю: «страница ожила, что-то грузится».

- **Хорошо**: ≤ **1.8 с**
- **Требует улучшения**: 1.8 – 3.0 с
- **Плохо**: > 3.0 с

### Как метрики связаны между собой

Порядок всегда такой: \`TTFB → FCP → LCP\`. FCP физически не может случиться раньше, чем придёт первый байт и браузер распарсит критический CSS (стили, без которых нельзя рисовать). А **LCP** (Largest Contentful Paint — отрисовка самого крупного элемента) обычно наступает не раньше FCP, то есть LCP ≥ FCP.

### Как улучшить TTFB

- **CDN** (сеть серверов ближе к пользователю) и кэш на edge — чтобы ответ шёл из ближайшей точки, а не через полмира.
- Серверный кэш и оптимизация запросов к базе данных — чтобы сервер думал быстрее.
- Современные протоколы **HTTP/2** или **HTTP/3**, keep-alive (переиспользование соединения), ранний ответ \`103 Early Hints\` (сервер заранее подсказывает браузеру, что грузить).

### Как улучшить FCP

- Сократить **render-blocking** CSS/JS (ресурсы, которые блокируют отрисовку) и инлайнить критический CSS прямо в HTML.
- \`preconnect\` к критичным доменам (заранее установить соединение) и \`preload\` шрифтов (загрузить пораньше).
- \`font-display: swap\` — чтобы текст рисовался сразу системным шрифтом, не дожидаясь загрузки кастомного.

## ⚠️ Подводные камни

- TTFB и FCP формально **не входят** в тройку Core Web Vitals (LCP, INP, CLS), но это диагностические метрики: если они плохи, LCP почти наверняка тоже пострадает.
- Высокий TTFB нельзя «победить» оптимизацией фронтенда — копай в сторону сервера, сети и CDN.

## 🎯 Запомни

- **TTFB** = скорость сервера и сети (первый байт), **FCP** = первый видимый пиксель контента.
- Порядок: \`TTFB → FCP → LCP\`; ранний TTFB ускоряет вообще всё.
- TTFB лечат на бэкенде/сети (CDN, кэш, HTTP/3), FCP — на фронте (критический CSS, preload, \`font-display: swap\`).`,
      en: `## 🧩 In plain words

Imagine you ordered food at a restaurant. **TTFB** is how long you wait for the waiter to bring you *anything* (the first piece of bread) after you place your order. **FCP** is the moment the first real dish lands on the table and you know dinner is happening. Both metrics are about the feeling that "loading has started" — the sooner, the less it seems like the site froze.

### TTFB — Time To First Byte

The time from the start of navigation to receiving the **first byte** of the server's response. It includes everything that happens before the server starts sending data: looking up the server address (DNS), opening the connection (TCP), encryption (TLS), and the server's own processing time.

TTFB is the "foundation of the house". If it's high, everything downstream is delayed — including FCP and LCP.

- **Good**: ≤ **800 ms** (strong teams target ≤ 200 ms).

### FCP — First Contentful Paint

The time until the **first** visible content appears: text, an image — anything but a blank background. FCP tells the user: "the page is alive, something is loading."

- **Good**: ≤ **1.8 s**
- **Needs improvement**: 1.8 – 3.0 s
- **Poor**: > 3.0 s

### How the metrics relate

The order is always \`TTFB → FCP → LCP\`. FCP physically cannot happen before the first byte arrives and the browser parses the critical CSS (the styles it needs before it can paint). And **LCP** (Largest Contentful Paint — when the biggest element renders) usually comes no earlier than FCP, so LCP ≥ FCP.

### How to improve TTFB

- A **CDN** (a network of servers closer to the user) and edge caching — so the response comes from the nearest point, not from halfway around the world.
- Server-side caching and optimized database queries — so the server thinks faster.
- Modern protocols **HTTP/2** or **HTTP/3**, keep-alive (reusing the connection), and an early \`103 Early Hints\` response (the server hints early what to fetch).

### How to improve FCP

- Reduce **render-blocking** CSS/JS (resources that block painting) and inline critical CSS directly in the HTML.
- \`preconnect\` to critical origins (open the connection ahead of time) and \`preload\` fonts (fetch them early).
- \`font-display: swap\` — so text paints immediately with a system font instead of waiting for the custom one.

## ⚠️ Common pitfalls

- TTFB and FCP are **not** part of the Core Web Vitals trio (LCP, INP, CLS), but they are diagnostic: if they are poor, LCP will almost certainly suffer too.
- A high TTFB cannot be "fixed" with front-end optimization — look at the server, network, and CDN.

## 🎯 Key takeaways

- **TTFB** = server + network speed (first byte); **FCP** = first visible pixel of content.
- Order: \`TTFB → FCP → LCP\`; an early TTFB speeds up everything.
- Fix TTFB on the backend/network (CDN, cache, HTTP/3); fix FCP on the front end (critical CSS, preload, \`font-display: swap\`).`
    }
  },
  {
    id: 'web-010',
    category: 'web-performance',
    level: 'Hard',
    tags: ['performance-observer', 'web-vitals', 'measurement'],
    question: {
      ru: 'Как измерять Core Web Vitals в реальных условиях (RUM) с помощью PerformanceObserver?',
      en: 'How do you measure Core Web Vitals in the field (RUM) using PerformanceObserver?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Есть два способа узнать, как быстро грузится твой сайт. Первый — прогнать его в «лаборатории» на своём компьютере (как краш-тест машины на полигоне). Второй — измерять скорость у **настоящих пользователей**, пока они реально ходят по сайту (как собирать данные с датчиков в машинах, которые ездят по дорогам). Второй способ называется RUM, и именно его учитывает Google при ранжировании. \`PerformanceObserver\` — это встроенный в браузер «диктофон», который тихо записывает эти замеры прямо у пользователя.

### RUM против Lab

- **Lab data** (лабораторные данные, например Lighthouse) — синтетический замер в контролируемых условиях. Хорош для отладки, потому что стабилен и повторяем.
- **Field data / RUM** (Real User Monitoring — мониторинг реальных пользователей) — замеры у живых людей на их реальных устройствах и сетях. Именно эти данные влияют на ранжирование в поиске.

### PerformanceObserver

Это браузерный API, который позволяет **подписаться** на записи о производительности асинхронно — то есть не блокируя главный поток (main thread), где работает вся логика страницы. Ты даёшь функцию-обработчик, и браузер вызывает её, когда появляется новый замер.

\`\`\`ts
// LCP — берём последнюю запись
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const last = entries[entries.length - 1];
  console.log('LCP', last.startTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });

// CLS — суммируем неожиданные сдвиги
let cls = 0;
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) cls += entry.value;
  }
}).observe({ type: 'layout-shift', buffered: true });
\`\`\`

Что тут происходит. Для **LCP** (Largest Contentful Paint — отрисовка крупнейшего элемента) браузер может присылать несколько кандидатов по мере загрузки, поэтому берём **последнюю** запись — она финальная. Для **CLS** (Cumulative Layout Shift — суммарный сдвиг вёрстки) мы складываем значения всех неожиданных сдвигов, но пропускаем те, что случились сразу после ввода пользователя (\`hadRecentInput\` — значит сдвиг был вызван действием юзера, это «честный» сдвиг, его не считаем).

Поддерживаемые типы записей: \`largest-contentful-paint\`, \`layout-shift\`, \`event\` (для INP), \`paint\` (для FCP), \`navigation\` (для TTFB), \`longtask\` (долгие задачи).

### Библиотека web-vitals

Писать всё вручную сложно: в метриках куча тонкостей (окна сессий для CLS, атрибуция для INP). Google выпустил официальную библиотеку \`web-vitals\`, которая уже правильно обрабатывает эти крайние случаи:

\`\`\`ts
import { onLCP, onCLS, onINP } from 'web-vitals';
onLCP(sendToAnalytics);
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
\`\`\`

Ты просто передаёшь свою функцию отправки, и библиотека сама вызывает её с готовыми значениями. Для продакшена это рекомендуемый путь.

### Как правильно отправлять данные

Ключевой момент: \`buffered: true\` в \`observe()\` подтягивает записи, которые случились **ещё до** того, как ты зарегистрировал observer. Без него ты пропустишь ранние события вроде FCP.

А финальные значения нужно отправлять на аналитику в момент, когда пользователь уходит со страницы — по событию \`visibilitychange\` → \`hidden\` (вкладка стала невидимой), используя \`navigator.sendBeacon\`. Beacon гарантированно доставит данные, даже если страница уже закрывается.

## ⚠️ Подводные камни

- Забыл \`buffered: true\` — потерял ранние замеры (особенно FCP и LCP).
- Не считай CLS-сдвиги с \`hadRecentInput\` — это реакция на действие пользователя, а не «дёрганье» вёрстки.
- Не отправляй данные обычным \`fetch\` в момент выгрузки страницы — запрос могут отменить; используй \`sendBeacon\`.

## 🎯 Запомни

- Для ранжирования важен **RUM** (реальные пользователи), а не лабораторные прогоны.
- \`PerformanceObserver\` с \`buffered: true\` ловит замеры асинхронно, включая случившиеся до подписки.
- В продакшене бери библиотеку \`web-vitals\` и отправляй финальные значения через \`sendBeacon\` на \`visibilitychange → hidden\`.`,
      en: `## 🧩 In plain words

There are two ways to learn how fast your site loads. The first is to run it in a "lab" on your own machine (like crash-testing a car on a track). The second is to measure speed on **real users** while they actually browse the site (like collecting sensor data from cars driving on real roads). The second way is called RUM, and it's what Google uses for ranking. \`PerformanceObserver\` is a browser built-in "recorder" that quietly captures these measurements right on the user's device.

### RUM vs Lab

- **Lab data** (e.g. Lighthouse) — a synthetic measurement in controlled conditions. Great for debugging because it's stable and repeatable.
- **Field data / RUM** (Real User Monitoring) — measurements from real people on their real devices and networks. This is the data that affects search ranking.

### PerformanceObserver

This is a browser API that lets you **subscribe** to performance entries asynchronously — without blocking the main thread (where all the page logic runs). You provide a callback, and the browser calls it whenever a new measurement appears.

\`\`\`ts
// LCP — take the last entry
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const last = entries[entries.length - 1];
  console.log('LCP', last.startTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });

// CLS — sum unexpected shifts
let cls = 0;
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) cls += entry.value;
  }
}).observe({ type: 'layout-shift', buffered: true });
\`\`\`

Here's what's happening. For **LCP** (Largest Contentful Paint — when the biggest element renders) the browser may report several candidates as the page loads, so we take the **last** entry — it's the final one. For **CLS** (Cumulative Layout Shift — total layout movement) we sum all unexpected shifts, but skip the ones that happened right after user input (\`hadRecentInput\` means the shift was caused by the user's action, which is a "legit" shift we don't count).

Supported entry types: \`largest-contentful-paint\`, \`layout-shift\`, \`event\` (for INP), \`paint\` (for FCP), \`navigation\` (for TTFB), \`longtask\`.

### The web-vitals library

Doing all this by hand is tricky: the metrics have many subtleties (session windows for CLS, attribution for INP). Google ships an official \`web-vitals\` library that already handles these edge cases correctly:

\`\`\`ts
import { onLCP, onCLS, onINP } from 'web-vitals';
onLCP(sendToAnalytics);
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
\`\`\`

You just pass your send function, and the library calls it with ready-made values. For production, this is the recommended path.

### How to send the data correctly

Key point: \`buffered: true\` in \`observe()\` pulls in entries that happened **before** you registered the observer. Without it you'll miss early events like FCP.

And you should send the final values to analytics at the moment the user leaves the page — on the \`visibilitychange\` → \`hidden\` event (the tab became invisible), using \`navigator.sendBeacon\`. Beacon reliably delivers the data even while the page is unloading.

## ⚠️ Common pitfalls

- Forgetting \`buffered: true\` loses early measurements (especially FCP and LCP).
- Don't count CLS shifts with \`hadRecentInput\` — those are reactions to user actions, not "janky" layout jumps.
- Don't send data with a plain \`fetch\` during page unload — the request may be cancelled; use \`sendBeacon\`.

## 🎯 Key takeaways

- **RUM** (real users) is what matters for ranking, not lab runs.
- \`PerformanceObserver\` with \`buffered: true\` catches measurements asynchronously, including ones from before you subscribed.
- In production, use the \`web-vitals\` library and send final values via \`sendBeacon\` on \`visibilitychange → hidden\`.`
    }
  },
  {
    id: 'web-011',
    category: 'web-performance',
    level: 'Hard',
    tags: ['resource-hints', 'preload', 'preconnect'],
    question: {
      ru: 'Объясните разницу между preload, prefetch, preconnect и dns-prefetch. Когда применять каждый?',
      en: 'Explain the difference between preload, prefetch, preconnect, and dns-prefetch. When do you use each?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Resource hints (подсказки о ресурсах) — это способ шепнуть браузеру: «эй, тебе скоро понадобится вот это, начни готовиться заранее». Представь официанта, который видит, что ты почти доел, и заранее готовит десерт и счёт, чтобы не заставлять тебя ждать. Разные подсказки готовят разные вещи: одна качает файл прямо сейчас, другая — на будущее, третья лишь заранее «пожимает руку» чужому серверу.

### preload — «скачай этот файл сейчас, он точно нужен»

Высокоприоритетная загрузка ресурса, который **нужен на текущей странице**, но который браузер обнаружит поздно (например, шрифт, спрятанный внутри CSS, hero-картинка или критичный JS-модуль). \`preload\` скачивает файл рано, но **не исполняет** его — просто кладёт наготове.

\`\`\`html
<link rel="preload" as="font" href="inter.woff2" type="font/woff2" crossorigin />
\`\`\`

Обязательно указывай атрибут \`as\` (тип ресурса), иначе браузер может не понять приоритет и скачать файл дважды.

### prefetch — «скачай на будущее, когда будет время»

Низкоприоритетная загрузка ресурса для **следующей навигации** — страницы, куда пользователь, скорее всего, перейдёт. Файл тихо кладётся в кэш и достаётся оттуда позже. Идеально для предзагрузки чанка вероятного следующего маршрута.

\`\`\`html
<link rel="prefetch" href="/dashboard-chunk.js" />
\`\`\`

### preconnect — «заранее пожми руку чужому серверу»

Заранее устанавливает **соединение** (DNS + TCP + TLS) с **критичным сторонним origin** (доменом): CDN, сервер шрифтов, API. Само рукопожатие занимает 100–300 мс, и \`preconnect\` делает его заранее, чтобы в нужный момент осталось только скачать данные.

\`\`\`html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
\`\`\`

### dns-prefetch — «хотя бы узнай адрес заранее»

Делает только **DNS-резолвинг** (превращение имени домена в IP-адрес). Это более дешёвый и лучше поддерживаемый «младший брат» \`preconnect\` для менее критичных доменов.

### Краткая сводка

- **preload** — грузит ресурс текущей страницы рано; когда: критичный ресурс, обнаруживаемый поздно.
- **prefetch** — лениво грузит ресурс на будущее; когда: вероятная следующая навигация.
- **preconnect** — делает DNS+TCP+TLS заранее; когда: критичный сторонний origin.
- **dns-prefetch** — делает только DNS; когда: менее критичный домен.

## ⚠️ Подводные камни

- Не злоупотребляй \`preconnect\`: больше 4–6 открытых соединений начинают конкурировать за пропускную способность и могут навредить.
- \`preload\` без атрибута \`as\` может привести к двойной загрузке файла.
- \`preload\` тоже нельзя лить на всё подряд — он высокоприоритетный и отбирает ресурсы у действительно важного.

## 🎯 Запомни

- **preload** = текущая страница, сейчас; **prefetch** = следующая страница, потом.
- **preconnect** = полное рукопожатие (DNS+TCP+TLS) заранее; **dns-prefetch** = только DNS, дешевле.
- Каждая подсказка — это trade-off: используй точечно, а не «на всякий случай».`,
      en: `## 🧩 In plain words

Resource hints are a way to whisper to the browser: "hey, you'll need this soon, start getting ready now." Picture a waiter who sees you're almost done eating and prepares the dessert and the bill in advance so you don't have to wait. Different hints prepare different things: one downloads a file right now, another for later, and another just "shakes hands" with a third-party server ahead of time.

### preload — "download this file now, it's definitely needed"

A high-priority fetch of a resource that is **needed on the current page** but which the browser discovers late (for example, a font hidden inside CSS, the hero image, or a critical JS module). \`preload\` downloads the file early but does **not execute** it — it just keeps it ready.

\`\`\`html
<link rel="preload" as="font" href="inter.woff2" type="font/woff2" crossorigin />
\`\`\`

Always set the \`as\` attribute (the resource type), otherwise the browser may misjudge priority and download the file twice.

### prefetch — "download for later, when there's spare time"

A low-priority fetch of a resource for a **future navigation** — a page the user will probably visit next. The file is quietly placed in cache and pulled from there later. Ideal for preloading the chunk of a likely next route.

\`\`\`html
<link rel="prefetch" href="/dashboard-chunk.js" />
\`\`\`

### preconnect — "shake hands with a third-party server ahead of time"

Establishes a **connection** (DNS + TCP + TLS) ahead of time with a **critical third-party origin** (domain): a CDN, a font server, an API. The handshake itself takes 100–300 ms, and \`preconnect\` does it in advance so that when the moment comes only the data download remains.

\`\`\`html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
\`\`\`

### dns-prefetch — "at least look up the address early"

Does only the **DNS resolution** (turning a domain name into an IP address). It's a cheaper, more widely supported "little brother" of \`preconnect\` for less critical domains.

### Quick summary

- **preload** — fetches a current-page resource early; when: a critical resource discovered late.
- **prefetch** — lazily fetches a future resource; when: a likely next navigation.
- **preconnect** — does DNS+TCP+TLS ahead of time; when: a critical third-party origin.
- **dns-prefetch** — does DNS only; when: a less critical domain.

## ⚠️ Common pitfalls

- Don't overuse \`preconnect\`: more than 4–6 open connections start competing for bandwidth and can hurt.
- A \`preload\` without the \`as\` attribute can cause the file to be downloaded twice.
- Don't \`preload\` everything either — it's high priority and steals resources from what truly matters.

## 🎯 Key takeaways

- **preload** = current page, now; **prefetch** = next page, later.
- **preconnect** = full handshake (DNS+TCP+TLS) ahead of time; **dns-prefetch** = DNS only, cheaper.
- Every hint is a trade-off: use it surgically, not "just in case."`
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
    category: 'web-performance',
    level: 'Medium',
    tags: ['scripts', 'async', 'defer'],
    question: {
      ru: 'В чём разница между обычным <script>, async и defer? Как они влияют на парсинг HTML?',
      en: 'What is the difference between a plain <script>, async, and defer? How do they affect HTML parsing?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Когда браузер читает HTML сверху вниз и строит из него страницу, встреченный \`<script>\` может либо **остановить чтение**, либо дать читать дальше. Представь, что ты читаешь книгу, и вдруг попадается сноска. Обычный скрипт — это когда ты обязан бросить книгу, сбегать за справочником и прочитать его целиком, прежде чем продолжить. \`defer\` и \`async\` — два способа сказать «продолжай читать книгу, справочник я изучу позже (или когда его принесут)».

### Обычный \`<script>\` — блокирует всё

Парсинг HTML (разбор кода в структуру DOM) **останавливается**, скрипт скачивается и **синхронно** исполняется, и только потом чтение продолжается. Это блокирует построение DOM. Главный антипаттерн — ставить такой скрипт в \`<head>\`: пользователь видит белый экран, пока скрипт грузится и работает.

### defer — «качай параллельно, выполни в конце по порядку»

Скрипт скачивается **параллельно** с парсингом HTML (не тормозя его), но **исполняется** только после того, как весь DOM построен, и прямо **перед** событием \`DOMContentLoaded\` (DCL — сигнал «DOM готов»). Важно: несколько \`defer\`-скриптов сохраняют **порядок** — выполнятся в том порядке, в каком написаны.

### async — «качай параллельно, выполни сразу как скачался»

Скрипт тоже качается параллельно, но **исполняется сразу**, как только загрузился, прервав парсинг в произвольный момент. **Порядок не гарантируется**: какой скрипт скачался первым — тот и выполнится первым, независимо от порядка в HTML.

### Сводная таблица

- **Обычный**: качается сразу и блокирует; исполняется сразу и блокирует; порядок сохраняется.
- **async**: качается параллельно; исполняется как только скачан; порядок НЕ гарантирован.
- **defer**: качается параллельно; исполняется после построения DOM, перед DCL; порядок сохраняется.

### Практика

\`\`\`html
<!-- Аналитика, независимый сторонний скрипт -->
<script async src="analytics.js"></script>

<!-- Код приложения, зависящий от DOM и порядка -->
<script defer src="vendor.js"></script>
<script defer src="app.js"></script>
\`\`\`

Здесь аналитика ни от чего не зависит, поэтому \`async\` — пусть выполнится когда угодно. А \`vendor.js\` и \`app.js\` — код приложения: \`app.js\` рассчитывает, что \`vendor.js\` уже выполнился, поэтому нужен \`defer\`, сохраняющий порядок.

### Правило выбора

- **defer** — для кода приложения, которому важен готовый DOM и порядок исполнения.
- **async** — для независимых скриптов (аналитика, реклама, виджеты).
- **modules** (\`type="module"\`) — ведут себя как \`defer\` по умолчанию.

## ⚠️ Подводные камни

- Блокирующий \`<script>\` в \`<head>\` без причины — прямой удар по FCP и LCP; убирай или переводи на \`defer\`.
- \`async\` для скриптов, зависящих друг от друга, — источник плавающих багов: порядок непредсказуем.
- \`defer\` работает только для внешних скриптов (с \`src\`); на инлайновый \`<script>\` он не действует.

## 🎯 Запомни

- Обычный \`<script>\` **блокирует** парсинг; \`async\` и \`defer\` качаются параллельно и не блокируют.
- \`async\` = выполнить как можно раньше, **порядок неважен**; \`defer\` = выполнить после DOM, **порядок сохранён**.
- App-код → \`defer\`; независимые скрипты → \`async\`; \`type="module"\` — уже defer по умолчанию.`,
      en: `## 🧩 In plain words

When the browser reads HTML top to bottom and builds the page from it, a \`<script>\` it meets can either **stop the reading** or let it continue. Imagine you're reading a book and hit a footnote. A plain script is when you *must* drop the book, run for a reference manual, and read it fully before continuing. \`defer\` and \`async\` are two ways to say "keep reading the book — I'll study the manual later (or whenever it arrives)."

### Plain \`<script>\` — blocks everything

HTML parsing (turning the code into the DOM structure) **stops**, the script is downloaded and executed **synchronously**, and only then does reading resume. This blocks DOM construction. The main anti-pattern is putting such a script in \`<head>\`: the user stares at a blank screen while it downloads and runs.

### defer — "download in parallel, run at the end, in order"

The script downloads **in parallel** with HTML parsing (without slowing it), but **executes** only after the whole DOM is built, right **before** the \`DOMContentLoaded\` event (DCL — the "DOM is ready" signal). Importantly, multiple \`defer\` scripts preserve **order** — they run in the order they're written.

### async — "download in parallel, run as soon as it lands"

The script also downloads in parallel, but **executes immediately** once loaded, interrupting parsing at an arbitrary moment. **Order is not guaranteed**: whichever script downloads first runs first, regardless of its order in the HTML.

### Summary

- **Plain**: downloads immediately and blocks; executes immediately and blocks; order preserved.
- **async**: downloads in parallel; executes as soon as loaded; order NOT guaranteed.
- **defer**: downloads in parallel; executes after the DOM is built, before DCL; order preserved.

### Practice

\`\`\`html
<!-- Analytics, independent third-party script -->
<script async src="analytics.js"></script>

<!-- App code that depends on DOM and order -->
<script defer src="vendor.js"></script>
<script defer src="app.js"></script>
\`\`\`

Here analytics depends on nothing, so \`async\` — let it run whenever. But \`vendor.js\` and \`app.js\` are app code: \`app.js\` assumes \`vendor.js\` has already run, so you need \`defer\`, which preserves order.

### Choosing rule

- **defer** — for app code that needs a ready DOM and a guaranteed execution order.
- **async** — for independent scripts (analytics, ads, widgets).
- **modules** (\`type="module"\`) — behave like \`defer\` by default.

## ⚠️ Common pitfalls

- A blocking \`<script>\` in \`<head>\` with no reason directly harms FCP and LCP; remove it or switch to \`defer\`.
- \`async\` for scripts that depend on each other is a source of flaky bugs: the order is unpredictable.
- \`defer\` only works for external scripts (with \`src\`); it has no effect on an inline \`<script>\`.

## 🎯 Key takeaways

- A plain \`<script>\` **blocks** parsing; \`async\` and \`defer\` download in parallel and don't block.
- \`async\` = run as early as possible, **order doesn't matter**; \`defer\` = run after the DOM, **order preserved**.
- App code → \`defer\`; independent scripts → \`async\`; \`type="module"\` is already defer by default.`
    }
  },
  {
    id: 'web-013',
    category: 'web-performance',
    level: 'Hard',
    tags: ['render-blocking', 'critical-css', 'optimization'],
    question: {
      ru: 'Что значит «render-blocking CSS/JS»? Как уменьшить блокировку рендеринга?',
      en: 'What does "render-blocking CSS/JS" mean? How do you reduce render blocking?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что браузер — это официант, который не вынесет тебе ни одной тарелки, пока не соберёт весь заказ целиком. «Render-blocking» ресурсы — это как раз те блюда из заказа, без которых он отказывается что-либо показывать на экране. Пока такой ресурс (обычно CSS или синхронный JavaScript) не загрузится и не обработается, пользователь видит **белый экран**. Наша задача — сделать этот обязательный список как можно короче, чтобы первый кадр появился быстрее.

### Что значит «блокирует рендеринг»

Рендеринг — это процесс превращения кода страницы в видимые пиксели. Некоторые ресурсы браузер считает настолько важными, что не рисует **ни одного пикселя** контента, пока их не обработает. Такие ресурсы и называют render-blocking (блокирующими отрисовку).

### Почему CSS блокирует

Любой \`<link rel="stylesheet">\` в \`<head>\` блокирует построение render tree (дерева отрисовки — внутренней модели того, как всё выглядит) до тех пор, пока стиль полностью не загрузится и не распарсится. Браузер делает так специально: он боится показать «вспышку нестилизованного контента» (FOUC) — то есть голый текст без оформления, который через миг перерисуется. Лучше секунду подождать, чем мигнуть уродливой версией.

### Почему JS блокирует

Синхронный \`<script>\` (обычный, без атрибутов) останавливает парсер HTML: браузер должен скачать и выполнить скрипт, прежде чем читать страницу дальше. А если такой скрипт стоит после ещё не загруженного CSS, он вдобавок ждёт построения CSSOM (объектной модели стилей), потому что скрипт может захотеть прочитать стили элемента.

### Как уменьшить блокировку

1. **Критический CSS инлайнить** прямо в \`<head>\` (вставить внутрь тега \`<style>\`), а остальное грузить асинхронно. «Критический» — это стили для того, что видно на первом экране без прокрутки (above-the-fold):

\`\`\`html
<style>/* critical above-the-fold CSS */</style>
<link
  rel="stylesheet"
  href="rest.css"
  media="print"
  onload="this.media='all'"
/>
\`\`\`

Трюк здесь такой: \`media="print"\` говорит браузеру «этот стиль только для печати», поэтому он не блокирует отрисовку экрана. Когда файл загрузился, \`onload\` переключает \`media\` обратно на \`all\`, и стиль применяется.

2. **Разделять CSS по media**: \`media="(min-width: 1024px)"\` делает стиль не-блокирующим на узких экранах — браузер видит, что на телефоне он не нужен, и не ждёт его.
3. **defer/async** для скриптов — эти атрибуты снимают блокировку парсера (\`defer\` выполняет скрипт после парсинга в порядке подключения, \`async\` — как только загрузится).
4. **Tree-shaking и удаление неиспользуемого CSS** (например, инструментом PurgeCSS) — меньше байтов, быстрее обработка.
5. **Избегать \`@import\` внутри CSS** — он заставляет браузер сначала скачать один файл, найти в нём импорт, потом скачать следующий. Получается цепочка последовательных запросов вместо параллельных.

### Как измерить

Lighthouse (встроенный аудит в Chrome DevTools) в разделе «Eliminate render-blocking resources» показывает, сколько миллисекунд можно сэкономить. А вкладка DevTools → Coverage показывает, какой процент CSS/JS реально используется, а какой грузится зря.

## ⚠️ Подводные камни

- Инлайнить весь CSS в \`<head>\` — плохо: страница раздувается, и кэширование внешнего файла теряется. Инлайнь только критический минимум.
- Забыть переключить \`media='all'\` в \`onload\` — тогда остальные стили так и не применятся на экране.
- Синхронный скрипт в \`<head>\` без \`defer\`/\`async\` тормозит всё, даже если он не срочный.

## 🎯 Запомни

- Render-blocking ресурс = браузер не рисует ничего, пока его не обработает; главные виновники — CSS в \`<head>\` и синхронный JS.
- Инлайнь критический CSS, остальное грузи асинхронно; на скрипты вешай \`defer\`/\`async\`.
- Цель — минимальный критический путь: чем меньше байтов до первого кадра, тем раньше наступают FCP (первая отрисовка контента) и LCP (отрисовка главного элемента).`,
      en: `## 🧩 In plain words

Think of the browser as a waiter who refuses to bring you any dish until the whole order is ready. "Render-blocking" resources are exactly those items in the order without which it won't show anything on screen. Until such a resource (usually CSS or synchronous JavaScript) has loaded and been processed, the user stares at a **blank white page**. Our job is to keep that mandatory list as short as possible so the first frame shows up sooner.

### What "blocks rendering" means

Rendering is the process of turning page code into visible pixels. The browser treats some resources as so important that it won't paint **a single pixel** of content until it has processed them. These are called render-blocking resources.

### Why CSS blocks

Any \`<link rel="stylesheet">\` in the \`<head>\` blocks construction of the render tree (the browser's internal model of how everything looks) until that stylesheet is fully loaded and parsed. The browser does this on purpose: it fears a "flash of unstyled content" (FOUC) — bare text with no styling that would repaint a moment later. Better to wait a beat than to flash an ugly version.

### Why JS blocks

A synchronous \`<script>\` (a plain one, with no special attributes) stops the HTML parser: the browser must download and run the script before reading the rest of the page. And if that script sits after not-yet-loaded CSS, it additionally waits for the CSSOM (the CSS Object Model — the browser's model of the styles) to be built, because the script might want to read an element's styles.

### How to reduce it

1. **Inline critical CSS** right in the \`<head>\` (put it inside a \`<style>\` tag), and load the rest asynchronously. "Critical" means the styles for what's visible on the first screen without scrolling (above-the-fold):

\`\`\`html
<style>/* critical above-the-fold CSS */</style>
<link
  rel="stylesheet"
  href="rest.css"
  media="print"
  onload="this.media='all'"
/>
\`\`\`

The trick: \`media="print"\` tells the browser "this stylesheet is only for printing," so it does not block the on-screen render. Once the file loads, \`onload\` flips \`media\` back to \`all\`, and the styles apply.

2. **Split CSS by media**: \`media="(min-width: 1024px)"\` makes a stylesheet non-blocking on narrow screens — the browser sees it isn't needed on a phone and doesn't wait for it.
3. **defer/async** for scripts — these attributes unblock the parser (\`defer\` runs the script after parsing, in order; \`async\` runs it as soon as it downloads).
4. **Tree-shaking and removing unused CSS** (e.g. with PurgeCSS) — fewer bytes, faster processing.
5. **Avoid \`@import\` inside CSS** — it forces the browser to download one file, find the import inside it, then download the next. That produces a chain of sequential requests instead of parallel ones.

### How to measure

Lighthouse (the built-in audit in Chrome DevTools) has an "Eliminate render-blocking resources" section that shows how many milliseconds you could save. And the DevTools → Coverage tab shows what percentage of your CSS/JS is actually used versus loaded for nothing.

## ⚠️ Common pitfalls

- Inlining all your CSS in \`<head>\` is bad: the page bloats and you lose caching of the external file. Inline only the critical minimum.
- Forgetting to flip \`media='all'\` in \`onload\` — then the rest of the styles never apply on screen.
- A synchronous script in \`<head>\` without \`defer\`/\`async\` slows everything down, even if it isn't urgent.

## 🎯 Key takeaways

- A render-blocking resource = the browser paints nothing until it's processed; the main culprits are CSS in \`<head>\` and synchronous JS.
- Inline critical CSS, load the rest asynchronously; put \`defer\`/\`async\` on scripts.
- The goal is a minimal critical path: the fewer bytes before the first frame, the earlier FCP (First Contentful Paint) and LCP (Largest Contentful Paint) happen.`
    }
  },
  {
    id: 'web-014',
    category: 'web-performance',
    level: 'Hard',
    tags: ['fonts', 'font-display', 'foit-fout'],
    question: {
      ru: 'Объясните FOIT и FOUT. Как font-display и preload помогают управлять загрузкой шрифтов?',
      en: 'Explain FOIT and FOUT. How do font-display and preload help control font loading?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Когда сайт использует красивый нестандартный шрифт, этот шрифт нужно скачать — а это занимает время. Вопрос: что показывать пользователю, пока шрифт грузится? Есть два подхода. Либо спрятать текст и ждать («ты ничего не увидишь, потерпи») — это FOIT. Либо сразу показать текст обычным системным шрифтом, а потом подменить на красивый («читай пока так, дизайн подтянется») — это FOUT. У каждого свои минусы, и свойство \`font-display\` позволяет выбрать, какой из них тебе больше подходит.

### FOIT против FOUT

- **FOIT (Flash of Invisible Text — вспышка невидимого текста)**: пока кастомный шрифт грузится, текст **невидим**, на его месте пустота. Это плохо для воспринимаемой скорости, и особенно бьёт по LCP (Largest Contentful Paint — метрика отрисовки самого крупного элемента), если этот крупный элемент — текст.
- **FOUT (Flash of Unstyled Text — вспышка нестилизованного текста)**: текст сразу рисуется системным (запасным) шрифтом, а когда кастомный догрузится — подменяется. Виден лёгкий «прыжок» букв, но зато контент читаем с первой секунды.

### font-display

Это свойство внутри правила \`@font-face\` (блок, где ты объявляешь свой шрифт), которое управляет тем, как ведёт себя текст во время загрузки шрифта:

\`\`\`css
@font-face {
  font-family: 'Inter';
  src: url('inter.woff2') format('woff2');
  font-display: swap;
}
\`\`\`

Возможные значения:

- \`auto\` — на усмотрение браузера (обычно ведёт себя как FOIT).
- \`block\` — короткий период невидимости (FOIT), потом подмена на кастомный шрифт.
- \`swap\` — сразу показать запасной шрифт, потом подменить (FOUT). Хорош для FCP (первой отрисовки), но даёт CLS — сдвиг макета из-за смены шрифта.
- \`fallback\` — компромисс: очень короткий блок невидимости, затем ограниченный по времени период подмены. Если шрифт опоздал — остаётся запасной.
- \`optional\` — браузер может вообще не применить кастомный шрифт, если сеть медленная. **Лучший вариант для CLS**, потому что подмены (а значит и сдвига) может не случиться вовсе.

### Как уменьшить CLS от шрифтов

CLS (Cumulative Layout Shift) — метрика внезапных сдвигов контента. Смена шрифта двигает текст, потому что у разных шрифтов разная ширина и высота букв. Что помогает:

- **\`preload\` ключевого шрифта** — \`<link rel="preload" as="font" crossorigin>\`. Это говорит браузеру «начни качать этот шрифт как можно раньше, он точно понадобится». Атрибут \`crossorigin\` для шрифтов обязателен, иначе файл скачается дважды.
- **Подгонка метрик запасного шрифта** через \`size-adjust\`, \`ascent-override\` и подобные свойства — ты растягиваешь/сжимаешь системный шрифт так, чтобы он занимал почти столько же места, сколько кастомный. Тогда при подмене сдвиг почти нулевой.
- **Формат WOFF2** (самый сжатый) и **subsetting** — вырезать из шрифта только нужные символы (например, только латиницу и кириллицу), чтобы файл был меньше.
- **Self-hosting** (хранить шрифт на своём сервере) вместо стороннего CDN убирает лишний \`preconnect\` — соединение с чужим доменом, которое тоже стоит времени.

\`\`\`css
@font-face {
  font-family: 'InterFallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 90%;
}
\`\`\`

Здесь мы берём локальный Arial как запасной шрифт и подгоняем его размеры под Inter: \`size-adjust: 107%\` слегка увеличивает буквы, \`ascent-override: 90%\` правит высоту над базовой линией. Итог — при подмене на настоящий Inter текст почти не прыгнет.

## ⚠️ Подводные камни

- Забыть \`crossorigin\` на \`<link rel="preload" as="font">\` — шрифт скачается дважды.
- \`font-display: swap\` без подгонки метрик fallback даёт заметный «прыжок» текста и портит CLS.
- \`preload\` слишком многих шрифтов конкурирует за пропускную способность и вредит остальным критическим ресурсам — предзагружай только реально нужные для первого экрана.

## 🎯 Запомни

- FOIT = текст сначала невидим (ждём шрифт); FOUT = текст сразу виден запасным шрифтом, потом подменяется.
- \`font-display: swap\` даёт быстрый читаемый текст, \`optional\` лучше всего защищает от сдвигов (CLS).
- Идеальная стратегия: \`preload\` ключевого шрифта + \`font-display: swap\` + метрики запасного шрифта, близкие к финальному.`,
      en: `## 🧩 In plain words

When a site uses a nice custom font, that font has to be downloaded — and that takes time. The question is: what do you show the user while the font is loading? There are two approaches. Either hide the text and wait ("you'll see nothing, hang on") — that's FOIT. Or immediately show the text in a plain system font and swap it for the nice one later ("read this for now, the styling will catch up") — that's FOUT. Each has its downside, and the \`font-display\` property lets you choose which one fits you better.

### FOIT vs FOUT

- **FOIT (Flash of Invisible Text)**: while the custom font loads, the text is **invisible** — empty space where it should be. This is bad for perceived speed, and it especially hurts LCP (Largest Contentful Paint — the metric for painting the biggest element) if that big element is text.
- **FOUT (Flash of Unstyled Text)**: text is painted immediately in a system (fallback) font, and once the custom font arrives it gets swapped in. You see a slight "jump" of the letters, but the content is readable from the first second.

### font-display

This is a property inside the \`@font-face\` rule (the block where you declare your font) that controls how text behaves while the font is loading:

\`\`\`css
@font-face {
  font-family: 'Inter';
  src: url('inter.woff2') format('woff2');
  font-display: swap;
}
\`\`\`

Possible values:

- \`auto\` — up to the browser (usually behaves like FOIT).
- \`block\` — a short invisibility period (FOIT), then swap to the custom font.
- \`swap\` — show the fallback immediately, then swap (FOUT). Good for FCP (first paint) but causes CLS — layout shift from the font change.
- \`fallback\` — a compromise: a very short invisibility block, then a time-limited swap period. If the font arrives too late, the fallback stays.
- \`optional\` — the browser may skip the custom font entirely if the network is slow. **Best for CLS**, because a swap (and therefore a shift) may never happen at all.

### Minimizing font CLS

CLS (Cumulative Layout Shift) is the metric for sudden content shifts. A font change moves text because different fonts have different letter widths and heights. What helps:

- **\`preload\` the key font** — \`<link rel="preload" as="font" crossorigin>\`. This tells the browser "start downloading this font as early as possible, it'll definitely be needed." The \`crossorigin\` attribute is mandatory for fonts, otherwise the file downloads twice.
- **Match the fallback font's metrics** via \`size-adjust\`, \`ascent-override\` and similar properties — you stretch/shrink the system font so it takes up almost the same space as the custom one. Then the swap causes a nearly zero shift.
- **WOFF2 format** (the most compressed) and **subsetting** — strip the font down to only the characters you need (e.g. only Latin and Cyrillic) so the file is smaller.
- **Self-hosting** (keeping the font on your own server) instead of a third-party CDN removes an extra \`preconnect\` — the connection to another domain, which also costs time.

\`\`\`css
@font-face {
  font-family: 'InterFallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 90%;
}
\`\`\`

Here we take the local Arial as a fallback and tune its dimensions to match Inter: \`size-adjust: 107%\` slightly enlarges the letters, \`ascent-override: 90%\` adjusts the height above the baseline. The result — when the real Inter swaps in, the text barely jumps.

## ⚠️ Common pitfalls

- Forgetting \`crossorigin\` on \`<link rel="preload" as="font">\` — the font downloads twice.
- \`font-display: swap\` without matched fallback metrics gives a noticeable text "jump" and hurts CLS.
- Preloading too many fonts competes for bandwidth and hurts other critical resources — only preload the ones truly needed for the first screen.

## 🎯 Key takeaways

- FOIT = text is invisible at first (waiting for the font); FOUT = text is visible immediately in a fallback font, then swapped.
- \`font-display: swap\` gives fast readable text; \`optional\` best protects against layout shift (CLS).
- Ideal strategy: \`preload\` the key font + \`font-display: swap\` + fallback metrics close to the final font.`
    }
  },
  {
    id: 'web-015',
    category: 'web-performance',
    level: 'Hard',
    tags: ['images', 'srcset', 'responsive-images'],
    question: {
      ru: 'Как работают srcset и sizes для адаптивных изображений? В чём разница между дескрипторами w и x?',
      en: 'How do srcset and sizes work for responsive images? What is the difference between the w and x descriptors?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Одна и та же картинка не должна одинаково грузиться на крошечный телефон и на огромный 4K-монитор — телефону хватит маленькой версии, а слать ему мегабайты просто расточительство. Атрибуты \`srcset\` и \`sizes\` позволяют дать браузеру **несколько версий одной картинки** разного размера и правила, как выбрать подходящую. Браузер сам подберёт оптимальную под конкретный экран. А дескрипторы \`w\` и \`x\` — это два разных способа объяснить браузеру, чем версии отличаются: по ширине файла (\`w\`) или по плотности пикселей экрана (\`x\`).

### Дескриптор x (плотность пикселей)

Подходит, когда картинка всегда отображается **одного и того же размера** на странице (например, логотип 100×100), но экраны бывают с разной плотностью пикселей. На обычном экране 1 CSS-пиксель = 1 физический пиксель (плотность 1x), на Retina — 2 или 3 физических пикселя на один CSS-пиксель (2x, 3x). Чтобы на плотном экране логотип был чётким, ему нужна картинка с большим числом пикселей:

\`\`\`html
<img
  src="logo.png"
  srcset="logo.png 1x, logo@2x.png 2x, logo@3x.png 3x"
  alt="Logo"
/>
\`\`\`

Браузер на обычном экране возьмёт \`logo.png\`, на Retina — \`logo@2x.png\`, и так далее.

### Дескриптор w (ширина файла) + sizes

Подходит для картинок, которые **меняют размер** в зависимости от ширины экрана (например, фото на всю ширину колонки). Здесь ты в \`srcset\` перечисляешь реальные ширины файлов в пикселях (\`400w\` значит «этот файл шириной 400 пикселей»), а в \`sizes\` объясняешь, какую ширину картинка займёт на странице при разных условиях:

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

Читается \`sizes\` так: «если ширина экрана до 600px — картинка займёт 100vw (всю ширину viewport); если до 1024px — 50vw (половину); иначе — фиксированные 800px». \`src\` здесь запасной вариант для очень старых браузеров.

### Как браузер выбирает файл

1. Смотрит в \`sizes\`, находит первое подходящее под текущий viewport условие → получает ширину слота (места под картинку) в пикселях.
2. Умножает эту ширину на DPR устройства (device pixel ratio — та самая плотность пикселей).
3. Выбирает **наименьшего** кандидата из \`srcset\`, чья ширина \`w\` не меньше нужного значения. Так экономятся байты: берётся минимально достаточная версия.

### Важные нюансы

- \`sizes\` **обязателен** при \`w\`-дескрипторах. Если его нет, браузер считает, что картинка занимает \`100vw\`, и может скачать версию крупнее нужной.
- Выбор делается **до** загрузки CSS, поэтому \`sizes\` должен описывать раскладку явно — браузер не может «подсмотреть» размеры из ещё не загруженных стилей.
- Для арт-дирекшена (когда на телефоне нужен другой **кроп** картинки, а не просто размер) используй тег \`<picture>\` с \`<source media>\`.
- Всегда задавай \`width\`/\`height\` (или \`aspect-ratio\`), чтобы браузер заранее зарезервировал место и не было CLS — сдвига макета, когда картинка внезапно догружается.

## ⚠️ Подводные камни

- Смешивать \`w\` и \`x\` дескрипторы в одном \`srcset\` нельзя — выбери что-то одно.
- Забыть \`sizes\` при \`w\`-дескрипторах → браузер грузит слишком большую картинку.
- Указывать в \`sizes\` неверные ширины (не совпадающие с реальной раскладкой) → браузер выберет не тот файл.

## 🎯 Запомни

- \`x\` — для картинок фиксированного размера на экранах разной плотности; \`w\` + \`sizes\` — для картинок, меняющих размер с шириной экрана.
- \`w\` говорит браузеру реальную ширину файлов, \`sizes\` — сколько места картинка займёт; вместе они дают браузеру выбрать минимально достаточную версию.
- Всегда ставь \`width\`/\`height\`, чтобы избежать CLS.`,
      en: `## 🧩 In plain words

The same image shouldn't load identically on a tiny phone and on a huge 4K monitor — the phone only needs a small version, and shipping it megabytes is just wasteful. The \`srcset\` and \`sizes\` attributes let you hand the browser **several versions of one image** at different sizes, plus rules for picking the right one. The browser then chooses the optimal version for that specific screen. The \`w\` and \`x\` descriptors are two different ways of telling the browser how the versions differ: by file width (\`w\`) or by the screen's pixel density (\`x\`).

### x (density) descriptor

Good for an image that always displays at **the same size** on the page (say, a 100×100 logo), while screens vary in pixel density. On a regular screen 1 CSS pixel = 1 physical pixel (density 1x); on Retina it's 2 or 3 physical pixels per CSS pixel (2x, 3x). To keep the logo crisp on a dense screen, it needs an image with more pixels:

\`\`\`html
<img
  src="logo.png"
  srcset="logo.png 1x, logo@2x.png 2x, logo@3x.png 3x"
  alt="Logo"
/>
\`\`\`

On a regular screen the browser picks \`logo.png\`, on Retina \`logo@2x.png\`, and so on.

### w (width) descriptor + sizes

Good for images that **change size** with the screen width (e.g. a photo spanning a column). Here, in \`srcset\` you list the real file widths in pixels (\`400w\` means "this file is 400 pixels wide"), and in \`sizes\` you explain how wide the image will render on the page under various conditions:

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

Read \`sizes\` like this: "if the screen is up to 600px wide, the image takes 100vw (the full viewport width); if up to 1024px, 50vw (half); otherwise a fixed 800px." The \`src\` here is a fallback for very old browsers.

### How the browser chooses a file

1. It looks at \`sizes\`, finds the first condition matching the current viewport → gets the slot width (the space for the image) in pixels.
2. Multiplies that width by the device DPR (device pixel ratio — that same pixel density).
3. Picks the **smallest** \`srcset\` candidate whose \`w\` width is at least the required value. That saves bytes: it takes the minimally sufficient version.

### Important nuances

- \`sizes\` is **required** with \`w\` descriptors. Without it, the browser assumes the image takes \`100vw\` and may download a version bigger than needed.
- The choice is made **before** CSS loads, so \`sizes\` must describe the layout explicitly — the browser can't "peek" at sizes from stylesheets that haven't loaded yet.
- For art direction (when the phone needs a different **crop**, not just a different size) use the \`<picture>\` tag with \`<source media>\`.
- Always set \`width\`/\`height\` (or \`aspect-ratio\`) so the browser reserves space ahead of time and there's no CLS — the layout shift when an image suddenly finishes loading.

## ⚠️ Common pitfalls

- You can't mix \`w\` and \`x\` descriptors in one \`srcset\` — pick one.
- Forgetting \`sizes\` with \`w\` descriptors → the browser loads too large an image.
- Wrong widths in \`sizes\` (not matching the real layout) → the browser picks the wrong file.

## 🎯 Key takeaways

- \`x\` is for fixed-size images across screens of different density; \`w\` + \`sizes\` is for images that resize with screen width.
- \`w\` tells the browser the real file widths, \`sizes\` tells how much space the image will take; together they let the browser pick the minimally sufficient version.
- Always set \`width\`/\`height\` to avoid CLS.`
    }
  },
  {
    id: 'web-016',
    category: 'web-performance',
    level: 'Medium',
    tags: ['images', 'lazy-loading', 'fetchpriority'],
    question: {
      ru: 'Как работают нативный lazy loading изображений и атрибут fetchpriority? Как избежать ошибок?',
      en: 'How do native image lazy loading and the fetchpriority attribute work? How do you avoid mistakes?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь длинную страницу с сотней картинок. Зачем грузить все сразу, если пользователь видит только первый экран? Lazy loading («ленивая загрузка») откладывает загрузку картинок, которые ещё далеко внизу, — они подгрузятся, только когда ты почти доскроллишь до них. А \`fetchpriority\` — это возможность сказать браузеру «вот эту картинку тащи первым делом, она важная, а вон ту можешь и попозже». Оба атрибута помогают браузеру тратить сеть с умом: сначала важное, потом остальное.

### Нативный lazy loading

\`loading="lazy"\` — это встроенный в браузер (нативный, без всякого JavaScript) способ отложить загрузку изображения или iframe, пока оно не приблизится к viewport (видимой области экрана). Насколько заранее начнётся загрузка — решает браузер, и зависит это от скорости сети (на медленной сети — раньше, чтобы успеть).

\`\`\`html
<img src="below-the-fold.jpg" loading="lazy" width="600" height="400" alt="..." />
\`\`\`

### Главная ошибка

**Никогда не ставь \`loading="lazy"\` на LCP-картинку** — то есть на главное большое изображение в самом верху, которое видно сразу (hero-баннер выше «линии сгиба», above-the-fold). LCP (Largest Contentful Paint) — метрика скорости отрисовки самого крупного элемента. Если повесить на такую картинку ленивую загрузку, браузер отложит её, и метрика ухудшится. Для того, что видно сразу, используй \`loading="eager"\` (это и есть значение по умолчанию — «грузить немедленно») плюс \`fetchpriority="high"\`.

### fetchpriority

Это подсказка браузеру о приоритете загрузки ресурса. Значения: \`high\` (высокий), \`low\` (низкий), \`auto\` (браузер решит сам).

\`\`\`html
<!-- LCP-картинка: грузим как можно раньше -->
<img src="hero.avif" fetchpriority="high" width="1200" height="600" alt="Hero" />

<!-- Декоративная картинка вне зоны внимания -->
<img src="aside.jpg" fetchpriority="low" loading="lazy" alt="" />
\`\`\`

### Как браузер расставляет приоритеты

Изначально браузер даёт всем изображениям средне-низкий приоритет (текст и стили ему важнее). \`fetchpriority="high"\` поднимает твою LCP-картинку над менее важными ресурсами, ускоряя её доставку — и всё это без \`preload\` (более тяжёлого способа предзагрузки через \`<link>\`).

### Чек-лист

- Главная картинка выше «линии сгиба» (hero): \`eager\` + \`fetchpriority="high"\`.
- Всё, что ниже и не видно сразу: \`loading="lazy"\`.
- Всегда указывай \`width\`/\`height\` — браузер зарезервирует место, и не будет CLS (сдвига макета, когда картинка догрузилась и раздвинула контент).
- \`decoding="async"\` — чтобы браузер декодировал (распаковывал) картинку в фоне и это не блокировало main thread (главный поток, где выполняется весь JS и происходит отрисовка).

## ⚠️ Подводные камни

- \`loading="lazy"\` на hero-картинке — классический анти-паттерн, роняющий LCP.
- Пометить \`fetchpriority="high"\` слишком много ресурсов — приоритеты «размываются», и смысл теряется. Высокий приоритет должен быть у немногих ключевых элементов.
- Отсутствие \`width\`/\`height\` при ленивой загрузке даёт особенно заметный CLS: картинка приезжает поздно и толкает контент.

## 🎯 Запомни

- \`loading="lazy"\` откладывает загрузку картинок ниже экрана — но НИКОГДА не ставь его на LCP-картинку.
- \`fetchpriority="high"\` поднимает приоритет главной картинки без тяжёлого \`preload\`; \`low\` — понижает для второстепенных.
- Всегда задавай \`width\`/\`height\` и подумай про \`decoding="async"\`.`,
      en: `## 🧩 In plain words

Picture a long page with a hundred images. Why load them all at once if the user only sees the first screen? Lazy loading defers loading images that are still far down the page — they load only when you've nearly scrolled to them. And \`fetchpriority\` lets you tell the browser "fetch this image first, it's important, and that one can wait." Both attributes help the browser spend the network wisely: important stuff first, the rest later.

### Native lazy loading

\`loading="lazy"\` is a browser built-in (native, no JavaScript needed) way to defer loading an image or iframe until it approaches the viewport (the visible area of the screen). How far ahead loading starts is decided by the browser and depends on connection speed (on a slow connection it starts earlier, to have time).

\`\`\`html
<img src="below-the-fold.jpg" loading="lazy" width="600" height="400" alt="..." />
\`\`\`

### The main mistake

**Never put \`loading="lazy"\` on the LCP image** — the main large image at the very top that's visible immediately (a hero banner above the fold). LCP (Largest Contentful Paint) is the metric for how fast the biggest element paints. If you lazy-load such an image, the browser defers it and the metric gets worse. For content that's visible right away, use \`loading="eager"\` (which is the default — "load immediately") plus \`fetchpriority="high"\`.

### fetchpriority

This is a hint to the browser about a resource's loading priority. Values: \`high\`, \`low\`, \`auto\` (let the browser decide).

\`\`\`html
<!-- LCP image: load as early as possible -->
<img src="hero.avif" fetchpriority="high" width="1200" height="600" alt="Hero" />

<!-- Decorative image outside the focus area -->
<img src="aside.jpg" fetchpriority="low" loading="lazy" alt="" />
\`\`\`

### How the browser prioritizes

Initially the browser gives all images a medium-low priority (text and styles matter more to it). \`fetchpriority="high"\` raises your LCP image above less important resources, speeding up its delivery — all without \`preload\` (the heavier preloading method via \`<link>\`).

### Checklist

- Main above-the-fold image (hero): \`eager\` + \`fetchpriority="high"\`.
- Anything lower and not immediately visible: \`loading="lazy"\`.
- Always set \`width\`/\`height\` — the browser reserves space and there's no CLS (the layout shift when an image finishes loading and pushes content around).
- \`decoding="async"\` — so the browser decodes (unpacks) the image in the background and it doesn't block the main thread (the single thread where all JS runs and rendering happens).

## ⚠️ Common pitfalls

- \`loading="lazy"\` on a hero image is a classic anti-pattern that tanks LCP.
- Marking too many resources \`fetchpriority="high"\` "dilutes" priority and defeats the purpose. High priority should go to a few key elements only.
- Missing \`width\`/\`height\` with lazy loading gives an especially noticeable CLS: the image arrives late and shoves content aside.

## 🎯 Key takeaways

- \`loading="lazy"\` defers off-screen images — but NEVER put it on the LCP image.
- \`fetchpriority="high"\` raises the main image's priority without the heavier \`preload\`; \`low\` lowers it for secondary images.
- Always set \`width\`/\`height\` and consider \`decoding="async"\`.`
    }
  },
  {
    id: 'web-017',
    category: 'web-performance',
    level: 'Medium',
    tags: ['images', 'webp', 'avif', 'formats'],
    question: {
      ru: 'Какие современные форматы изображений вы используете и почему? Как обеспечить fallback?',
      en: 'Which modern image formats do you use and why? How do you provide a fallback?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Картинки — самая «тяжёлая» часть большинства сайтов. Современные форматы (WebP, AVIF) — это как более умные способы упаковать ту же картинку: она выглядит так же, но весит заметно меньше, поэтому страница грузится быстрее. Проблема одна: не каждый браузер умеет их «распаковывать». Поэтому мы даём несколько вариантов одной картинки, а браузер сам берёт первый, который понимает.

### Современные форматы и их плюсы

_Формат_ — это способ закодировать (сжать) картинку в файл. Чем умнее сжатие, тем меньше байтов при том же качестве.

- **WebP** — весит на 25–35% меньше JPEG при том же качестве, умеет прозрачность и анимацию. Понимают его примерно 96% браузеров.
- **AVIF** — построен на видеокодеке AV1, сжимает ещё сильнее (до 50% меньше JPEG), отлично показывает HDR и широкую палитру цветов. Минус — дольше кодируется. Поддержка ~93%.
- **JPEG XL** — многообещающий формат, но браузеры его пока почти не поддерживают.

_HDR_ — расширенный диапазон яркости (насыщенные света и тени). _Кодирование_ — процесс превращения исходной картинки в сжатый файл.

### Когда какой формат брать

- **AVIF** — для фотографий, где важнее всего маленький размер: у него лучший коэффициент сжатия.
- **WebP** — универсальный компромисс: почти везде работает и хорошо жмёт.
- **SVG** — для иконок, логотипов, иллюстраций. Это векторный формат (описание линий и фигур, а не пикселей), поэтому масштабируется без потери чёткости.
- **PNG** — только когда нужна точная графика без потерь (например, скриншоты с чётким текстом).

### Fallback через \`<picture>\`

_Fallback_ — запасной вариант на случай, если основной не сработал. Тег \`<picture>\` позволяет перечислить несколько источников; браузер берёт **первый \`<source>\`, который умеет декодировать**, а если ни один не подошёл — обычный \`<img>\`.

\`\`\`html
<picture>
  <source srcset="photo.avif" type="image/avif" />
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="Photo" width="800" height="600" loading="lazy" />
</picture>
\`\`\`

Здесь браузер сначала пробует AVIF, потом WebP, и в самом конце падает на JPEG, который понимают вообще все. Атрибуты \`width\`/\`height\` резервируют место заранее (чтобы страницу не «дёргало»), а \`loading="lazy"\` откладывает загрузку картинок, пока пользователь до них не долистает.

### На практике

- Многие CDN (Cloudinary, imgix) сами отдают оптимальный формат, глядя на заголовок \`Accept\`, который браузер присылает с запросом. _CDN_ — сеть серверов, раздающих ваши файлы; _заголовок \`Accept\`_ — строка, где браузер говорит, какие форматы он понимает.
- Комбинируйте форматы с \`srcset\`/\`sizes\` — это способ отдать разные размеры картинки под разные экраны (адаптивность).
- AVIF кодируется медленно, но это забота этапа сборки или CDN, а не браузера пользователя — на скорость сайта это не влияет.

## ⚠️ Подводные камни

- Не забывайте \`<img>\` в конце \`<picture>\` — без него старые браузеры не покажут ничего.
- \`alt\`, \`width\`, \`height\` ставятся на \`<img>\`, а не на \`<source>\`.
- AVIF даёт лучшее сжатие, но кодирование долгое — учитывайте это в пайплайне сборки.

## 🎯 Запомни

- **AVIF → WebP → JPEG/PNG** — порядок от лучшего сжатия к самой широкой совместимости.
- \`<picture>\` с несколькими \`<source>\` — стандартный способ дать fallback: браузер берёт первый понятный формат.
- Правильный выбор формата часто экономит больше байтов, чем любая другая оптимизация картинок.`,
      en: `## 🧩 In plain words

Images are the heaviest part of most websites. Modern formats (WebP, AVIF) are smarter ways to pack the same picture: it looks the same but weighs noticeably less, so the page loads faster. There is one catch: not every browser knows how to "unpack" them. So we offer several versions of one image, and the browser picks the first one it understands.

### Modern formats and their benefits

A _format_ is a way of encoding (compressing) an image into a file. The smarter the compression, the fewer bytes for the same quality.

- **WebP** — 25–35% smaller than JPEG at the same quality, supports transparency and animation. Understood by about 96% of browsers.
- **AVIF** — built on the AV1 video codec, compresses even harder (up to 50% smaller than JPEG), and shows HDR and a wide color range beautifully. The downside: slower to encode. Support ~93%.
- **JPEG XL** — a promising format, but browsers barely support it yet.

_HDR_ means an extended brightness range (rich highlights and shadows). _Encoding_ is the process of turning the source image into a compressed file.

### When to use which

- **AVIF** — for photos where small size matters most: it has the best compression ratio.
- **WebP** — a universal compromise: works almost everywhere and compresses well.
- **SVG** — for icons, logos, illustrations. It is a vector format (a description of lines and shapes, not pixels), so it scales without losing sharpness.
- **PNG** — only when you need exact lossless graphics (for example, screenshots with crisp text).

### Fallback via \`<picture>\`

A _fallback_ is a backup option in case the main one does not work. The \`<picture>\` tag lets you list several sources; the browser takes the **first \`<source>\` it can decode**, and if none fit, the plain \`<img>\`.

\`\`\`html
<picture>
  <source srcset="photo.avif" type="image/avif" />
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="Photo" width="800" height="600" loading="lazy" />
</picture>
\`\`\`

Here the browser tries AVIF first, then WebP, and finally falls back to JPEG, which everyone understands. The \`width\`/\`height\` attributes reserve space in advance (so the page does not "jump"), and \`loading="lazy"\` delays loading images until the user scrolls near them.

### In practice

- Many CDNs (Cloudinary, imgix) serve the optimal format automatically by looking at the \`Accept\` header the browser sends with each request. A _CDN_ is a network of servers that deliver your files; the _\`Accept\` header_ is a line where the browser states which formats it supports.
- Combine formats with \`srcset\`/\`sizes\` — a way to serve different image sizes for different screens (responsiveness).
- AVIF encodes slowly, but that is a build-time or CDN concern, not the user's browser — it does not affect site speed.

## ⚠️ Common pitfalls

- Do not forget the \`<img>\` at the end of \`<picture>\` — without it, old browsers show nothing.
- \`alt\`, \`width\`, \`height\` go on the \`<img>\`, not on the \`<source>\`.
- AVIF gives the best compression but encodes slowly — account for that in your build pipeline.

## 🎯 Key takeaways

- **AVIF → WebP → JPEG/PNG** — order from best compression to widest compatibility.
- \`<picture>\` with several \`<source>\` tags is the standard way to provide a fallback: the browser takes the first format it understands.
- Choosing the right format often saves more bytes than any other image optimization.`
    }
  },
  {
    id: 'web-018',
    category: 'web-performance',
    level: 'Hard',
    tags: ['css-grid', 'flexbox', 'layout'],
    question: {
      ru: 'Когда выбирать CSS Grid, а когда Flexbox? Объясните на примере intrinsic sizing.',
      en: 'When do you choose CSS Grid versus Flexbox? Explain with intrinsic sizing in mind.'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Flexbox и Grid — два способа расставлять элементы на странице средствами CSS. Простое правило: **Flexbox думает об одной линии** (либо ряд, либо столбец), а **Grid думает о таблице** — строках и столбцах сразу. Если вам нужно выстроить кнопки в один ряд — это Flexbox. Если нужен полноценный макет страницы с колонками и зонами — это Grid.

### Ключевое различие: одна ось или две

_Ось_ — направление, вдоль которого выстраиваются элементы (горизонталь или вертикаль).

- **Flexbox** — **одномерная** раскладка: элементы идут в ряд **или** в столбец, но не одновременно. Размер диктует содержимое (подход «content-out» — от контента наружу). Идеален для компонентов: тулбары, навигация, ряд карточек.
- **Grid** — **двумерная** раскладка: строки **и** столбцы одновременно. Структуру задаёт контейнер (подход «layout-in» — сетка задана заранее, контент раскладывается в неё). Идеален для макетов страниц, галерей, сложных сеток.

### Intrinsic sizing (размер по содержимому)

_Intrinsic sizing_ — это когда размер элемента определяется его собственным содержимым, а не задан жёстко в пикселях.

- Во **Flexbox**: запись \`flex: 1 1 auto\` означает «расти и сжиматься, отталкиваясь от авто-размера», распределяя свободное место. Важная деталь: часто нужен \`min-width: 0\`, иначе flex-элемент по умолчанию не сожмётся меньше своего контента и вылезет за границы (overflow — содержимое торчит наружу).
- В **Grid**: есть точные функции — \`min-content\` (минимальная ширина, при которой контент ещё помещается), \`max-content\` (ширина, при которой контент не переносится), \`fit-content()\` и \`minmax()\` (задать нижнюю и верхнюю границу).

\`\`\`css
/* Адаптивная сетка карточек без media-запросов */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr));
  gap: 16px;
}
\`\`\`

Разберём: \`minmax(250px, 1fr)\` — каждая колонка **минимум 250px**, а остаток свободного места делится поровну (\`1fr\` — «одна доля»). \`auto-fill\` создаёт столько колонок, сколько влезает по ширине. \`min(100%, 250px)\` подстраховывает узкие экраны: на очень тесном экране колонка не будет требовать 250px и не вызовет горизонтальную прокрутку. Итог — сетка сама перестраивается под ширину, без единого media-запроса.

### Пример: Flexbox и Grid бок о бок

\`\`\`css
/* Flexbox: 1D тулбар — по контенту, одна ось */
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar .spacer { flex: 1 1 auto; } /* распорка толкает крайние элементы вправо */

/* Grid: 2D макет страницы — по контейнеру, именованные зоны */
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    'header header'
    'nav    main'
    'footer footer';
  min-height: 100dvh;
}
\`\`\`

В тулбаре \`.spacer\` с \`flex: 1 1 auto\` съедает всё свободное место и отжимает последние элементы к правому краю. В макете \`grid-template-areas\` рисует структуру буквально «текстом»: две колонки, три ряда, зоны header/nav/main/footer.

### Практическое правило

- Один ряд или столбец, выравнивание по контенту → **Flexbox**.
- Сетка с выравниванием по двум осям, перекрытия, именованные зоны → **Grid**.
- Их можно и нужно **вкладывать**: Grid для макета страницы, Flexbox внутри отдельных ячеек.

## ⚠️ Подводные камни

- Забытый \`min-width: 0\` во Flexbox — самая частая причина того, что длинный текст или картинка ломают раскладку и вылезают за края.
- «Grid быстрее Flexbox» — миф. Обе технологии используют один и тот же движок раскладки, разница в производительности минимальна. Выбирайте по смыслу задачи, а не по мнимой скорости.

## 🎯 Запомни

- **Flexbox = одна ось** (ряд ИЛИ столбец), **Grid = две оси** (строки И столбцы).
- Flexbox — от контента наружу; Grid — контейнер задаёт структуру заранее.
- \`minmax()\` + \`auto-fill\`/\`auto-fit\` дают адаптивную сетку без media-запросов.`,
      en: `## 🧩 In plain words

Flexbox and Grid are two ways to place elements on a page with CSS. Simple rule: **Flexbox thinks in one line** (either a row or a column), while **Grid thinks in a table** — rows and columns at once. If you need to line up buttons in a single row, that is Flexbox. If you need a full page layout with columns and zones, that is Grid.

### The key difference: one axis or two

An _axis_ is the direction along which elements line up (horizontal or vertical).

- **Flexbox** — **one-dimensional** layout: items go in a row **or** a column, but not both at once. Content drives the size (the "content-out" approach — from the content outward). Ideal for components: toolbars, navigation, a row of cards.
- **Grid** — **two-dimensional** layout: rows **and** columns at once. The container defines the structure (the "layout-in" approach — the grid is set up first, content falls into it). Ideal for page layouts, galleries, complex grids.

### Intrinsic sizing

_Intrinsic sizing_ is when an element's size is determined by its own content rather than hard-coded in pixels.

- In **Flexbox**: \`flex: 1 1 auto\` means "grow and shrink, starting from the auto size," distributing free space. Important detail: you often need \`min-width: 0\`, otherwise a flex item will not shrink below its content by default and will overflow (overflow — content sticking out past the edges).
- In **Grid**: there are precise functions — \`min-content\` (the smallest width where the content still fits), \`max-content\` (the width where the content does not wrap), \`fit-content()\`, and \`minmax()\` (set a lower and upper bound).

\`\`\`css
/* Responsive card grid with no media queries */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr));
  gap: 16px;
}
\`\`\`

Let's unpack it: \`minmax(250px, 1fr)\` — each column is **at least 250px**, and the leftover free space is split evenly (\`1fr\` means "one fraction"). \`auto-fill\` creates as many columns as fit across the width. \`min(100%, 250px)\` protects narrow screens: on a very tight screen the column will not demand 250px and won't trigger horizontal scrolling. The result is a grid that reflows itself to the available width without a single media query.

### Example: Flexbox and Grid side by side

\`\`\`css
/* Flexbox: 1D toolbar — content-driven, single axis */
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
}
\`\`\`

In the toolbar, \`.spacer\` with \`flex: 1 1 auto\` eats all the free space and pushes the last items to the right edge. In the layout, \`grid-template-areas\` draws the structure literally "as text": two columns, three rows, and header/nav/main/footer zones.

### Practical rule

- A single row or column, content-based alignment → **Flexbox**.
- A grid aligned on two axes, overlaps, named areas → **Grid**.
- They can and should **nest**: Grid for the page layout, Flexbox inside individual cells.

## ⚠️ Common pitfalls

- A forgotten \`min-width: 0\` in Flexbox is the most common reason long text or an image breaks the layout and overflows the edges.
- "Grid is faster than Flexbox" is a myth. Both use the same layout engine, and the performance difference is minimal. Choose by the meaning of the task, not by imagined speed.

## 🎯 Key takeaways

- **Flexbox = one axis** (row OR column), **Grid = two axes** (rows AND columns).
- Flexbox works content-out; Grid lets the container define the structure up front.
- \`minmax()\` + \`auto-fill\`/\`auto-fit\` give a responsive grid with no media queries.`
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
    category: 'web-performance',
    level: 'Hard',
    tags: ['cascade', 'specificity', 'inheritance'],
    question: {
      ru: 'Объясните каскад, специфичность и наследование в CSS. Как разрешается конфликт стилей?',
      en: 'Explain the cascade, specificity, and inheritance in CSS. How are style conflicts resolved?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

К одному элементу могут применяться десятки CSS-правил, и часто они спорят друг с другом: одно говорит «текст красный», другое — «синий». Браузеру нужен способ решить, кто победит. Этот способ и называется **каскад** (отсюда буква C в слове CSS — Cascading Style Sheets). Внутри каскада главный судья — **специфичность** (насколько «точно» селектор указывает на элемент). А **наследование** — отдельная тема: часть свойств дети автоматически перенимают у родителя.

### Каскад — порядок разрешения конфликта

Когда два правила задают одно свойство, браузер выбирает победителя по этим приоритетам, сверху вниз:

1. **Origin и важность** (кто автор правила и есть ли \`!important\`): user-agent (стили браузера) < user (стили пользователя) < author (ваши стили) < author \`!important\` < user \`!important\`.
2. **Cascade layers** (\`@layer\`) — слои, которые вы упорядочили явно.
3. **Специфичность** селектора.
4. **Порядок появления** — при полном равенстве выигрывает тот, кто написан **последним**.

_Origin_ — источник стиля (браузер, пользователь или вы, автор сайта).

### Специфичность — «вес» селектора

Специфичность считается как кортеж из трёх чисел **(a, b, c)**. Сравнивают слева направо: сначала \`a\`, при равенстве — \`b\`, затем \`c\`.

- **a** — inline-стиль (атрибут \`style=""\`), а при сравнении селекторов — количество **ID** (\`#id\`).
- **b** — классы, атрибуты, псевдоклассы (\`:hover\`, \`[type="text"]\`).
- **c** — теги и псевдоэлементы (\`div\`, \`::before\`).

\`\`\`css
#main .card a      /* (1,1,1) */
.card a:hover      /* (0,2,1) */
a                  /* (0,0,1) */
\`\`\`

Здесь \`#main .card a\` победит остальных, потому что у него есть ID — а это старший разряд. Отдельные тонкости:

- \`!important\` **обходит** обычную специфичность целиком (используйте редко — это «чит-код», ломающий предсказуемость).
- \`:where()\` имеет специфичность ровно **0** — удобно для базовых стилей, которые потом легко перекрыть чем угодно.
- \`:is()\` берёт специфичность самого «тяжёлого» из своих аргументов.

### Наследование

_Наследование_ — когда дочерний элемент автоматически получает значение свойства от родителя. Наследуются в основном «текстовые» свойства: \`color\`, \`font\`, \`line-height\`, \`visibility\`. НЕ наследуются «коробочные»: \`margin\`, \`padding\`, \`border\`, \`background\`. Управлять наследованием можно ключевыми словами: \`inherit\` (взять у родителя), \`initial\` (значение по умолчанию для свойства), \`unset\` (наследовать, если свойство наследуемое, иначе \`initial\`), \`revert\` (откатить к стилю браузера/уровня).

### Пример: слои и \`:where()\` держат специфичность низкой

\`\`\`css
/* Cascade layers + :where() держат специфичность низкой и предсказуемой */
@layer reset, base, components, utilities;

@layer base {
  /* :where() имеет специфичность 0,0,0 — легко перекрыть позже */
  :where(a) { color: blue; }
}

@layer utilities {
  .text-red { color: red; } /* побеждает base по порядку слоёв, а не по весу */
}

/* Кортеж специфичности (a,b,c):
   #id .class el  -> (1,1,1)
   .class:hover   -> (0,2,0)
   el::before     -> (0,0,2) */
\`\`\`

Здесь \`.text-red\` побеждает \`:where(a)\` не из-за большего веса, а потому что слой \`utilities\` объявлен **позже** слоя \`base\` — порядок слоёв сильнее специфичности.

### Практика

- Держите специфичность **низкой и плоской** — так стили легко перекрывать. Помогают методология BEM и utility-классы.
- Избегайте ID в селекторах и \`!important\` — они резко задирают специфичность и ломают предсказуемость.
- В крупных проектах используйте \`@layer\` для управляемой архитектуры стилей.

## ⚠️ Подводные камни

- «Почему мой стиль не применился?» почти всегда сводится к специфичности или порядку. Откройте DevTools — перечёркнутое свойство означает, что его перебило более специфичное правило.
- \`!important\` кажется быстрым решением, но порождает гонку \`!important\` против \`!important\` — потом невозможно ничего перекрыть.
- Легко забыть, что \`:is()\` поднимает специфичность до самого тяжёлого аргумента, а \`:where()\` — нет. Для сбрасываемых стилей берите \`:where()\`.

## 🎯 Запомни

- Порядок каскада: **важность/origin → слои → специфичность → порядок в коде**.
- Специфичность — кортеж **(ID, классы, теги)**, сравнивается слева направо.
- Наследуются «текстовые» свойства (\`color\`, \`font\`), не наследуются «коробочные» (\`margin\`, \`border\`).
- Держите специфичность низкой; \`!important\` и ID — крайняя мера.`,
      en: `## 🧩 In plain words

Dozens of CSS rules can apply to a single element, and they often disagree: one says "text is red," another says "blue." The browser needs a way to decide who wins. That way is called the **cascade** (hence the C in CSS — Cascading Style Sheets). Inside the cascade, the main judge is **specificity** (how "precisely" a selector points at an element). And **inheritance** is a separate topic: some properties are automatically passed down from parent to child.

### The cascade — how conflicts are resolved

When two rules set the same property, the browser picks the winner by these priorities, top to bottom:

1. **Origin and importance** (who wrote the rule and is there an \`!important\`): user-agent (browser styles) < user (user styles) < author (your styles) < author \`!important\` < user \`!important\`.
2. **Cascade layers** (\`@layer\`) — layers that you ordered explicitly.
3. **Specificity** of the selector.
4. **Order of appearance** — on a full tie, the one written **last** wins.

_Origin_ is the source of a style (the browser, the user, or you, the site author).

### Specificity — the "weight" of a selector

Specificity is computed as a tuple of three numbers **(a, b, c)**. They are compared left to right: first \`a\`, on a tie \`b\`, then \`c\`.

- **a** — inline style (the \`style=""\` attribute), and when comparing selectors, the number of **IDs** (\`#id\`).
- **b** — classes, attributes, pseudo-classes (\`:hover\`, \`[type="text"]\`).
- **c** — elements and pseudo-elements (\`div\`, \`::before\`).

\`\`\`css
#main .card a      /* (1,1,1) */
.card a:hover      /* (0,2,1) */
a                  /* (0,0,1) */
\`\`\`

Here \`#main .card a\` beats the rest because it has an ID — that is the highest-order digit. A few finer points:

- \`!important\` **bypasses** ordinary specificity entirely (use rarely — it's a "cheat code" that breaks predictability).
- \`:where()\` has specificity of exactly **0** — handy for base styles you want to override easily with anything later.
- \`:is()\` takes the specificity of its "heaviest" argument.

### Inheritance

_Inheritance_ is when a child element automatically receives a property value from its parent. Mostly "text" properties inherit: \`color\`, \`font\`, \`line-height\`, \`visibility\`. "Box" properties do NOT: \`margin\`, \`padding\`, \`border\`, \`background\`. You control inheritance with keywords: \`inherit\` (take the parent's value), \`initial\` (the property's default value), \`unset\` (inherit if the property is inheritable, otherwise \`initial\`), \`revert\` (roll back to the browser/level style).

### Example: layers and \`:where()\` keep specificity low

\`\`\`css
/* Cascade layers + :where() keep specificity low and predictable */
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
   el::before     -> (0,0,2) */
\`\`\`

Here \`.text-red\` beats \`:where(a)\` not because of greater weight, but because the \`utilities\` layer is declared **after** the \`base\` layer — layer order outranks specificity.

### Practice

- Keep specificity **low and flat** — that way styles are easy to override. The BEM methodology and utility classes help.
- Avoid IDs in selectors and \`!important\` — they spike specificity and break predictability.
- In large projects, use \`@layer\` for a managed style architecture.

## ⚠️ Common pitfalls

- "Why isn't my style applied?" almost always comes down to specificity or order. Open DevTools — a struck-through property means a more specific rule overrode it.
- \`!important\` seems like a quick fix, but it spawns an \`!important\`-versus-\`!important\` arms race — then nothing can be overridden.
- It's easy to forget that \`:is()\` raises specificity to its heaviest argument, while \`:where()\` does not. For overridable styles, use \`:where()\`.

## 🎯 Key takeaways

- Cascade order: **importance/origin → layers → specificity → source order**.
- Specificity is a tuple **(IDs, classes, elements)**, compared left to right.
- "Text" properties inherit (\`color\`, \`font\`); "box" properties don't (\`margin\`, \`border\`).
- Keep specificity low; \`!important\` and IDs are a last resort.`
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
    category: 'web-performance',
    level: 'Hard',
    tags: ['stacking-context', 'z-index', 'css'],
    question: {
      ru: 'Что такое stacking context? Почему z-index иногда «не работает»?',
      en: 'What is a stacking context? Why does z-index sometimes "not work"?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представьте страницу как стопку прозрачных плёнок, наложенных друг на друга. \`z-index\` говорит, какая плёнка выше. Но есть подвох: плёнки бывают вложенными — целая маленькая стопка лежит внутри одной плёнки большой стопки. И вот тут ломается интуиция: элемент с \`z-index: 9999\` внутри «нижней» вложенной стопки всё равно окажется под соседней стопкой, потому что **вся его стопка целиком** лежит ниже. Такая вложенная стопка и называется **stacking context** (контекст наложения).

### Что такое stacking context

_Stacking context_ — это самостоятельный «слой» на оси Z (глубины). Внутри одного контекста элементы сравниваются по \`z-index\` между собой. Но **дочерний** контекст позиционируется как единое целое — по \`z-index\` своего родителя, независимо от того, насколько огромные \`z-index\` у элементов внутри него. Ребёнок не может «выпрыгнуть» выше соседей своего родителя, даже с \`z-index: 999999\`.

Аналогия: этажи в здании. Внутри этажа можно расставить мебель по высоте как угодно, но диван на первом этаже всё равно ниже табуретки на втором — этаж важнее.

### Что создаёт новый stacking context

Контекст возникает не только от \`z-index\`. Вот основные триггеры:

- \`position: relative/absolute\` вместе с \`z-index\`, отличным от \`auto\`.
- \`position: fixed\` или \`sticky\`.
- \`opacity\` меньше 1.
- \`transform\`, \`filter\`, \`perspective\`, \`clip-path\`, \`mask\`, отличные от \`none\`.
- \`will-change\` со значением, которое создаёт контекст.
- \`isolation: isolate\`.
- Flex- или grid-элемент с \`z-index\`, отличным от \`auto\`.

Обратите внимание: \`opacity: 0.99\` и \`transform\` создают контекст **молча**, без всякого \`z-index\` — это и есть источник большинства сюрпризов.

### Почему z-index «не работает»

Классическая ловушка: вы ставите элементу \`z-index: 9999\`, а он всё равно оказывается под другим. Причина — его **родитель** образует stacking context, и этот контекст целиком лежит ниже соседнего поддерева. Ребёнок заперт внутри родителя и не может подняться выше него.

\`\`\`css
.modal-parent {
  opacity: 0.99;      /* нечаянно создаёт stacking context! */
}
.modal {
  z-index: 9999;      /* всё равно под .sibling, если родитель ниже */
}
\`\`\`

Здесь безобидная \`opacity: 0.99\` на родителе запирает \`.modal\` внутри нового контекста, и \`9999\` уже не помогает.

### Как чинить

\`\`\`css
/* Ловушка: родитель молча создаёт stacking context,
   и огромный z-index ребёнка не может из него выбраться. */
.dropdown-parent {
  transform: translateZ(0); /* создаёт stacking context! */
}
.dropdown {
  position: absolute;
  z-index: 9999; /* всё равно заперт под соседним поддеревом */
}

/* Решение: изолируйте осознанно или вынесите оверлей в <body>. */
.overlay-root {
  isolation: isolate; /* новый контекст без побочных эффектов отрисовки */
}
\`\`\`

Рабочие приёмы:

- Используйте \`isolation: isolate\` **осознанно**, когда сами хотите создать контекст (в отличие от \`transform\`/\`opacity\`, у него нет визуальных побочных эффектов).
- Рендерите оверлеи и модалки через **portal** в конец \`<body>\`, чтобы они попадали в контекст верхнего уровня и были поверх всего. _Portal_ — приём (например, в React), когда элемент физически рендерится в другом месте DOM.
- Проверяйте, не создал ли родитель контекст случайно (\`transform\`, \`opacity\`, \`filter\`).

## ⚠️ Подводные камни

- \`opacity\`, \`transform\`, \`filter\` создают контекст без \`z-index\` — самая частая скрытая причина «z-index не работает».
- Наращивать \`z-index\` до 99999 бесполезно, если проблема во вложенности контекстов: цифра не поможет вырваться из родителя.
- В DevTools панель **Layers** визуализирует иерархию наложения — используйте её для отладки.

## 🎯 Запомни

- \`z-index\` сравнивается **только внутри одного** stacking context.
- Ребёнок не может подняться выше контекста своего родителя, даже с гигантским \`z-index\`.
- Многие свойства (\`opacity < 1\`, \`transform\`, \`filter\`) создают контекст **молча** — это источник большинства багов.
- Лечение: \`isolation: isolate\` осознанно или portal модалки в \`<body>\`.`,
      en: `## 🧩 In plain words

Picture a page as a stack of transparent sheets laid on top of one another. \`z-index\` says which sheet sits higher. But there's a catch: sheets can be nested — a whole little stack lives inside one sheet of the big stack. And that's where intuition breaks: an element with \`z-index: 9999\` inside a "lower" nested stack still ends up beneath a neighboring stack, because **its entire stack** sits lower. That nested stack is called a **stacking context**.

### What a stacking context is

A _stacking context_ is a self-contained "layer" on the Z axis (depth). Within one context, elements are compared by \`z-index\` among themselves. But a **child** context is positioned as a single whole — by its parent's \`z-index\`, no matter how huge the \`z-index\` values of the elements inside it are. A child cannot "jump" above its parent's neighbors, even with \`z-index: 999999\`.

Analogy: floors in a building. Within a floor you can arrange furniture by height however you like, but a sofa on the first floor is still lower than a stool on the second — the floor wins.

### What creates a new stacking context

A context arises not only from \`z-index\`. Here are the main triggers:

- \`position: relative/absolute\` together with a \`z-index\` other than \`auto\`.
- \`position: fixed\` or \`sticky\`.
- \`opacity\` less than 1.
- \`transform\`, \`filter\`, \`perspective\`, \`clip-path\`, \`mask\` other than \`none\`.
- \`will-change\` with a context-creating value.
- \`isolation: isolate\`.
- A flex or grid item with a \`z-index\` other than \`auto\`.

Note: \`opacity: 0.99\` and \`transform\` create a context **silently**, without any \`z-index\` — that's the source of most surprises.

### Why z-index "doesn't work"

The classic trap: you set \`z-index: 9999\` on an element, yet it still lands below another. The reason is its **parent** forms a stacking context, and that context as a whole sits below the neighboring subtree. The child is locked inside its parent and cannot rise above it.

\`\`\`css
.modal-parent {
  opacity: 0.99;      /* accidentally creates a stacking context! */
}
.modal {
  z-index: 9999;      /* still below .sibling if the parent is lower */
}
\`\`\`

Here a harmless \`opacity: 0.99\` on the parent locks \`.modal\` inside a new context, and \`9999\` no longer helps.

### How to fix it

\`\`\`css
/* Trap: the parent silently creates a stacking context,
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
}
\`\`\`

Practical techniques:

- Use \`isolation: isolate\` **deliberately** when you actually want to create a context (unlike \`transform\`/\`opacity\`, it has no visual side effects).
- Render overlays and modals via a **portal** at the end of \`<body>\` so they land in the top-level context and sit above everything. A _portal_ is a technique (for example, in React) where an element is physically rendered elsewhere in the DOM.
- Check whether a parent created a context accidentally (\`transform\`, \`opacity\`, \`filter\`).

## ⚠️ Common pitfalls

- \`opacity\`, \`transform\`, \`filter\` create a context without any \`z-index\` — the most common hidden cause of "z-index doesn't work."
- Cranking \`z-index\` up to 99999 is useless if the problem is nested contexts: the number can't break the child out of its parent.
- In DevTools, the **Layers** panel visualizes the stacking hierarchy — use it for debugging.

## 🎯 Key takeaways

- \`z-index\` is compared **only within one** stacking context.
- A child can't rise above its parent's context, even with a gigantic \`z-index\`.
- Many properties (\`opacity < 1\`, \`transform\`, \`filter\`) create a context **silently** — the source of most bugs.
- Remedy: \`isolation: isolate\` deliberately, or portal the modal to \`<body>\`.`
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
    category: 'web-performance',
    level: 'Expert',
    tags: ['bfc', 'layout', 'css'],
    question: {
      ru: 'Что такое Block Formatting Context (BFC)? Какие задачи он решает?',
      en: 'What is a Block Formatting Context (BFC)? What problems does it solve?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что страница — это большая комната, а некоторые блоки — это отдельные комнаты со звукоизоляцией. Внутри такой «комнаты» всё живёт по своим правилам и не мешает соседям снаружи. Вот это и есть **Block Formatting Context (BFC)** — изолированная зона раскладки, где блоки, отступы и «плавающие» элементы ведут себя предсказуемо и не «протекают» наружу.

### Что такое BFC

**BFC (контекст блочного форматирования)** — это независимая область раскладки на странице. Внутри неё блочные элементы (те, что занимают всю ширину строки, как \`<div>\` или \`<p>\`) выстраиваются по своим правилам, отгороженным от внешнего мира. Внутри BFC действуют три ключевых правила:

- Блоки идут строго сверху вниз, один под другим.
- **Плавающие элементы** (\`float\`) учитываются при расчёте высоты контейнера, а не «вываливаются» из него.
- **Внешние отступы** (\`margin\`) потомков не «протекают» за пределы контейнера.

### Что создаёт BFC

BFC включается автоматически, когда у элемента есть одно из этих свойств:

- \`overflow\` не равно \`visible\` — то есть \`hidden\`, \`auto\` или \`clip\`.
- \`display: flow-root\` — самый чистый способ, специально придуманный для этого, без побочных эффектов.
- \`display: inline-block\`, \`table-cell\`, \`flex\`, \`grid\`.
- \`position: absolute\` или \`fixed\`.
- Любой \`float\` кроме \`none\`.

### Задача 1: удержать плавающие элементы (clearfix)

Когда все дети контейнера «плавают» (\`float\`), контейнер думает, что он пустой, и его высота схлопывается в ноль. BFC заставляет контейнер учитывать плавающих детей в своей высоте.

\`\`\`css
.container {
  display: flow-root; /* современный clearfix без псевдоэлементов */
}
\`\`\`

### Задача 2: остановить схлопывание отступов

**Схлопывание отступов (margin collapsing)** — это когда вертикальные \`margin\` двух соседних или вложенных блоков сливаются в один (побеждает больший), вместо того чтобы складываться. BFC ставит барьер и не даёт отступам схлопнуться.

### Задача 3: убрать обтекание float

Обычно текст обтекает плавающий элемент сбоку. Если сделать соседний блок отдельным BFC, он не залезет под float, а встанет ровной колонкой рядом:

\`\`\`css
.sidebar { float: left; width: 200px; }
.content { overflow: hidden; } /* BFC: не заходит под sidebar */
\`\`\`

## ⚠️ Подводные камни

- \`overflow: hidden\` тоже создаёт BFC, но у него есть побочные эффекты: он обрезает контент, вылезающий за границы, и ломает тени/подсказки, которые должны выходить наружу.
- Поэтому для «чистого» BFC предпочитай \`display: flow-root\` — он делает только то, что нужно, и ничего лишнего.

## 🎯 Запомни

- BFC — это изолированная зона раскладки: floats учитываются в высоте, margin-ы не протекают наружу.
- \`display: flow-root\` — лучший способ создать BFC без побочных эффектов.
- Понимание BFC объясняет «магические» баги с отступами и обтеканием, которые иначе кажутся необъяснимыми.`,
      en: `## 🧩 In plain words

Imagine the page is one big room, and some blocks are separate soundproofed rooms inside it. Inside such a "room" everything lives by its own rules and doesn't disturb the neighbors outside. That's what a **Block Formatting Context (BFC)** is — an isolated layout zone where blocks, margins, and floating elements behave predictably and don't "leak" out.

### What a BFC is

A **BFC (block formatting context)** is an independent layout region on the page. Inside it, block-level elements (the ones that take up a whole line, like \`<div>\` or \`<p>\`) lay out by their own rules, walled off from the outside world. Three key rules apply inside a BFC:

- Blocks stack strictly top to bottom, one under another.
- **Floated elements** (\`float\`) count toward the container's height instead of "spilling out" of it.
- **Margins** of descendants do not "leak" beyond the container.

### What creates a BFC

A BFC turns on automatically when an element has one of these properties:

- \`overflow\` is not \`visible\` — i.e. \`hidden\`, \`auto\`, or \`clip\`.
- \`display: flow-root\` — the cleanest way, invented specifically for this, with no side effects.
- \`display: inline-block\`, \`table-cell\`, \`flex\`, \`grid\`.
- \`position: absolute\` or \`fixed\`.
- Any \`float\` other than \`none\`.

### Job 1: contain the floats (clearfix)

When all of a container's children "float" (\`float\`), the container thinks it's empty and its height collapses to zero. A BFC makes the container count its floated children in its height.

\`\`\`css
.container {
  display: flow-root; /* modern clearfix without pseudo-elements */
}
\`\`\`

### Job 2: stop margin collapsing

**Margin collapsing** is when the vertical \`margin\`s of two adjacent or nested blocks merge into one (the bigger one wins) instead of adding up. A BFC creates a barrier and prevents the margins from collapsing.

### Job 3: prevent float wrapping

Normally text wraps around a floated element on its side. If you make the neighboring block its own BFC, it won't slide under the float — it forms a neat column beside it instead:

\`\`\`css
.sidebar { float: left; width: 200px; }
.content { overflow: hidden; } /* BFC: does not slide under the sidebar */
\`\`\`

## ⚠️ Common pitfalls

- \`overflow: hidden\` also creates a BFC, but it has side effects: it clips content that overflows the bounds and breaks shadows/tooltips that are meant to spill outside.
- So for a "clean" BFC, prefer \`display: flow-root\` — it does only what's needed and nothing extra.

## 🎯 Key takeaways

- A BFC is an isolated layout zone: floats count toward height and margins don't leak out.
- \`display: flow-root\` is the best way to create a BFC with no side effects.
- Understanding BFC explains "magic" margin and float bugs that otherwise seem inexplicable.`
    }
  },
  {
    id: 'web-022',
    category: 'web-performance',
    level: 'Expert',
    tags: ['contain', 'content-visibility', 'rendering'],
    question: {
      ru: 'Как свойства contain и content-visibility ускоряют рендеринг? Какие есть подводные камни?',
      en: 'How do the contain and content-visibility properties speed up rendering? What are the pitfalls?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Браузеру дорого пересчитывать раскладку и перерисовывать всю страницу при каждом изменении. Свойства \`contain\` и \`content-visibility\` — это способ сказать браузеру: «этот кусок независим, не трогай из-за него всё остальное» и «этот кусок пока за экраном — вообще не рисуй его». Представь длинную статью: зачем считать и рисовать 100 экранов, если человек видит только один? Эти свойства позволяют браузеру лениво заниматься только видимым.

### CSS Containment (\`contain\`)

\`contain\` сообщает браузеру, что поддерево (элемент со всеми его детьми) **изолировано** — его внутренние изменения не влияют на остальную страницу. Благодаря этому браузер может ограничить область **reflow** (пересчёт раскладки) и **repaint** (перерисовки) только этим элементом.

Значения:

- \`layout\` — изменения раскладки внутри не затрагивают то, что снаружи.
- \`paint\` — потомки не рисуются за границами элемента; если элемент за экраном, его отрисовку можно вообще пропустить.
- \`size\` — размер элемента не зависит от потомков (тогда нужны явные размеры, иначе он схлопнется).
- \`style\` — изоляция некоторых стилевых эффектов, которые могли бы «вытекать» наружу.
- Сокращения: \`strict\` = \`size layout paint style\`; \`content\` = \`layout paint style\`.

### content-visibility

\`content-visibility: auto\` говорит браузеру **полностью пропускать рендеринг** (и раскладку, и отрисовку) поддерева, пока оно за пределами видимой области (**viewport** — то, что реально видно на экране). Это огромный выигрыш для длинных страниц: браузер занимается только видимым, а остальное «просыпается» по мере прокрутки.

\`\`\`css
.section {
  content-visibility: auto;
  contain-intrinsic-size: auto 500px; /* placeholder-высота */
}
\`\`\`

\`contain-intrinsic-size\` — это «резервная» высота, которую браузер закладывает под ещё не отрисованный блок, чтобы страница не думала, что блок нулевой высоты.

## ⚠️ Подводные камни

- **Без \`contain-intrinsic-size\`** скрытые блоки имеют высоту 0. Из-за этого прыгает скроллбар, а поиск по странице \`Ctrl+F\` и переходы по якорям ломаются. Всегда указывай оценочный размер.
- **CLS (Cumulative Layout Shift, накопительный сдвиг макета)**: когда блок реально отрисовывается, его высота меняется с placeholder на настоящую, и контент дёргается. Значение \`contain-intrinsic-size: auto\` запоминает фактический размер после первого рендера и уменьшает дёрганье.
- **Поиск и доступность**: контент за экраном всё равно индексируется и доступен скринридерам (в отличие от \`display: none\`, который прячет полностью). Но измерить геометрию элемента до его отрисовки нельзя.
- Не применяй к элементам, чьи размеры нужны постоянно — например, к тем, что участвуют в расчётах \`sticky\`-позиционирования.

## 🎯 Запомни

- \`contain\` изолирует поддерево и ограничивает reflow/repaint только им.
- \`content-visibility: auto\` вообще пропускает рендер того, что за экраном — одна из самых мощных оптимизаций для длинных списков и статей.
- Всегда добавляй \`contain-intrinsic-size\`, иначе получишь прыгающий скролл и сломанные якоря.`,
      en: `## 🧩 In plain words

Recomputing layout and repainting the whole page on every change is expensive for the browser. The \`contain\` and \`content-visibility\` properties are ways to tell the browser: "this chunk is independent, don't touch everything else because of it" and "this chunk is off-screen for now — don't render it at all." Picture a long article: why compute and paint 100 screens when the person only sees one? These properties let the browser lazily deal only with what's visible.

### CSS Containment (\`contain\`)

\`contain\` tells the browser that a subtree (an element with all its children) is **isolated** — its internal changes don't affect the rest of the page. Thanks to that, the browser can limit the scope of **reflow** (layout recalculation) and **repaint** (redrawing) to just that element.

Values:

- \`layout\` — layout changes inside do not affect the outside.
- \`paint\` — descendants are not painted beyond the element's bounds; if the element is off-screen, its painting can be skipped entirely.
- \`size\` — the element's size does not depend on its descendants (then you need explicit sizes, or it collapses).
- \`style\` — isolation of certain style effects that could otherwise "leak" outward.
- Shorthands: \`strict\` = \`size layout paint style\`; \`content\` = \`layout paint style\`.

### content-visibility

\`content-visibility: auto\` tells the browser to **skip rendering entirely** (both layout and paint) for a subtree while it is outside the visible area (**viewport** — what's actually on screen). This is a huge win for long pages: the browser handles only the visible part, and the rest "wakes up" as you scroll.

\`\`\`css
.section {
  content-visibility: auto;
  contain-intrinsic-size: auto 500px; /* placeholder height */
}
\`\`\`

\`contain-intrinsic-size\` is a "reserved" height the browser sets aside for the not-yet-rendered block, so the page doesn't think the block has zero height.

## ⚠️ Common pitfalls

- **Without \`contain-intrinsic-size\`** hidden blocks have height 0. Because of that the scrollbar jumps, and in-page search \`Ctrl+F\` and anchor links break. Always provide an estimated size.
- **CLS (Cumulative Layout Shift)**: when a block actually renders, its height changes from the placeholder to the real one, and content jumps. The value \`contain-intrinsic-size: auto\` remembers the actual size after the first render and reduces the jumping.
- **Search and accessibility**: off-screen content is still indexed and exposed to screen readers (unlike \`display: none\`, which hides it completely). But you can't measure an element's geometry before it renders.
- Don't apply it to elements whose sizes are needed constantly — for example, those involved in \`sticky\` positioning calculations.

## 🎯 Key takeaways

- \`contain\` isolates a subtree and limits reflow/repaint to just it.
- \`content-visibility: auto\` skips rendering of off-screen content entirely — one of the most powerful optimizations for long lists and articles.
- Always add \`contain-intrinsic-size\`, or you'll get a jumping scrollbar and broken anchors.`
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
    category: 'web-performance',
    level: 'Medium',
    tags: ['semantic-html', 'accessibility', 'seo'],
    question: {
      ru: 'Почему важна семантическая вёрстка? Как она связана с доступностью, SEO и производительностью?',
      en: 'Why does semantic HTML matter? How does it relate to accessibility, SEO, and performance?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Семантическая вёрстка — это когда ты называешь вещи своими именами. Вместо безликого \`<div>\` для кнопки берёшь \`<button>\`, для навигации — \`<nav>\`, для основного контента — \`<main>\`. Это как подписать коробки при переезде: и грузчикам (браузеру), и роботам-каталогизаторам (поисковикам), и человеку с завязанными глазами (скринридеру) сразу понятно, что где лежит. Тег несёт **смысл**, а не только внешний вид.

### Что такое семантический HTML

Семантические теги (\`<header>\`, \`<nav>\`, \`<main>\`, \`<article>\`, \`<section>\`, \`<aside>\`, \`<footer>\`, \`<button>\`, \`<time>\`) описывают **смысл** содержимого, а не просто как оно выглядит. \`<button>\` — это «кнопка», а не «прямоугольник с текстом»; \`<nav>\` — это «блок навигации».

### Доступность (a11y)

**a11y (accessibility, доступность)** — это то, насколько сайтом можно пользоваться без мыши и зрения. **Скринридер** (программа, озвучивающая экран) строит из семантики «дерево доступности»:

- \`<nav>\` объявляется как навигация, а \`<button>\` автоматически получает фокус и срабатывает по Enter/Space.
- Если вместо \`<button>\` взять \`<div onclick>\`, придётся вручную добавлять \`role\`, \`tabindex\` и обработку клавиатуры — и легко что-то забыть.
- Заголовки \`<h1>\`–\`<h6>\` дают структуру, по которой удобно перепрыгивать между разделами.

### SEO

**SEO (search engine optimization)** — оптимизация под поисковики. Семантика помогает им понять структуру страницы: \`<article>\`, \`<main>\` и микроразметка повышают релевантность и дают «расширенные сниппеты» (rich snippets) в выдаче. Поисковик легче определяет, где на странице основной контент.

### Производительность и поддержка

- Меньше «div-супа» (нагромождения вложенных \`<div>\`) → меньше DOM-узлов → браузеру дешевле считать раскладку.
- Браузер даёт готовое поведение бесплатно: кнопки, формы, раскрывающийся \`<details>\`. Не нужно писать это на JavaScript вручную → кода меньше.

### Пример

\`\`\`html
<article>
  <header><h2>Заголовок</h2></header>
  <p>Текст...</p>
  <footer><time datetime="2026-06-29">29 июня 2026</time></footer>
</article>
\`\`\`

## ⚠️ Подводные камни

- \`<div>\` с \`onclick\` выглядит как кнопка, но не фокусируется, не реагирует на клавиатуру и не озвучивается как кнопка — недоступен для части пользователей.
- \`<section>\` без заголовка внутри почти не даёт пользы для навигации — добавляй заголовок.
- ARIA — не замена семантике: сначала правильный нативный тег, ARIA только когда нативного решения нет.

## 🎯 Запомни

- Семантика — это «фундамент бесплатной доступности»: правильный тег сразу даёт a11y, SEO и поведение.
- Начинай с нативных элементов, ARIA добавляй только при отсутствии нативной альтернативы.
- Меньше div-супа → меньше DOM и меньше JS.`,
      en: `## 🧩 In plain words

Semantic HTML is calling things by their real names. Instead of a faceless \`<div>\` for a button you use \`<button>\`, for navigation \`<nav>\`, for the main content \`<main>\`. It's like labeling the boxes when you move: the movers (the browser), the cataloguing robots (search engines), and the blindfolded person (a screen reader) all instantly know what's where. The tag carries **meaning**, not just appearance.

### What semantic HTML is

Semantic tags (\`<header>\`, \`<nav>\`, \`<main>\`, \`<article>\`, \`<section>\`, \`<aside>\`, \`<footer>\`, \`<button>\`, \`<time>\`) describe the **meaning** of content, not just how it looks. A \`<button>\` is "a button," not "a rectangle with text"; a \`<nav>\` is "a navigation block."

### Accessibility (a11y)

**a11y (accessibility)** is how usable a site is without a mouse or sight. A **screen reader** (software that reads the screen aloud) builds an "accessibility tree" from the semantics:

- \`<nav>\` is announced as navigation, and \`<button>\` automatically gets focus and activates on Enter/Space.
- If you use a \`<div onclick>\` instead of a \`<button>\`, you have to manually add \`role\`, \`tabindex\`, and keyboard handling — and it's easy to forget something.
- Headings \`<h1>\`–\`<h6>\` provide a structure that lets users jump between sections easily.

### SEO

**SEO (search engine optimization)** is optimizing for search engines. Semantics helps them understand the page structure: \`<article>\`, \`<main>\`, and microdata raise relevance and produce "rich snippets" in results. The search engine can more easily tell where the page's main content is.

### Performance and maintenance

- Less "div soup" (a pile-up of nested \`<div>\`s) → fewer DOM nodes → cheaper layout for the browser.
- The browser gives ready-made behavior for free: buttons, forms, the expandable \`<details>\`. You don't have to write it by hand in JavaScript → less code.

### Example

\`\`\`html
<article>
  <header><h2>Title</h2></header>
  <p>Text...</p>
  <footer><time datetime="2026-06-29">June 29, 2026</time></footer>
</article>
\`\`\`

## ⚠️ Common pitfalls

- A \`<div>\` with \`onclick\` looks like a button, but it can't be focused, doesn't respond to the keyboard, and isn't announced as a button — inaccessible to some users.
- A \`<section>\` with no heading inside gives almost no navigation value — add a heading.
- ARIA is not a substitute for semantics: use the right native tag first, ARIA only when there's no native solution.

## 🎯 Key takeaways

- Semantics is the "foundation of free accessibility": the right tag gives you a11y, SEO, and behavior for free.
- Start with native elements; add ARIA only when there's no native alternative.
- Less div soup → less DOM and less JS.`
    }
  },
  {
    id: 'web-024',
    category: 'web-performance',
    level: 'Hard',
    tags: ['accessibility', 'aria', 'wcag'],
    question: {
      ru: 'Объясните ключевые принципы доступности: ARIA-роли, управление фокусом, навигация с клавиатуры, WCAG.',
      en: 'Explain the key accessibility principles: ARIA roles, focus management, keyboard navigation, WCAG.'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Доступность (a11y) — это про то, чтобы сайтом мог пользоваться каждый: и человек с мышкой, и тот, кто ходит только по клавиатуре, и незрячий со скринридером. Есть свод правил **WCAG**, который держится на четырёх опорах (perceivable, operable, understandable, robust). А **ARIA**, управление фокусом и клавиатурная навигация — это инструменты, которыми ты воплощаешь эти правила в жизнь. Главное правило простое: сначала бери нативные элементы, а костыли добавляй только когда без них никак.

### WCAG — четыре принципа (POUR)

**WCAG (Web Content Accessibility Guidelines)** — международный стандарт доступности. Его четыре принципа складываются в аббревиатуру **POUR**:

- **Perceivable (воспринимаемо)** — контент можно воспринять: альт-тексты у картинок, контраст текста не ниже 4.5:1, субтитры у видео.
- **Operable (управляемо)** — всё работает с клавиатуры, нет «ловушек фокуса», времени на действия достаточно.
- **Understandable (понятно)** — поведение предсказуемо, ошибки форм объяснены понятно.
- **Robust (надёжно)** — работает с ассистивными технологиями (скринридерами и т.п.).

Уровни соответствия: A (минимум), AA (целевой для большинства сайтов), AAA (максимум).

### ARIA-роли

**ARIA (Accessible Rich Internet Applications)** — набор атрибутов, добавляющих смысл там, где нативной семантики нет. **Первое правило ARIA: не используй ARIA, если существует нативный элемент** (нативный \`<button>\` лучше, чем \`<div role="button">\`).

\`\`\`html
<!-- Кастомный таб -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Вкладка</button>
</div>
<div role="tabpanel" id="panel-1">...</div>
\`\`\`

- \`aria-label\`, \`aria-labelledby\` — задают доступное имя (как элемент назовёт скринридер).
- \`aria-expanded\`, \`aria-selected\`, \`aria-current\` — сообщают состояние (раскрыто, выбрано, текущее).
- \`aria-live="polite"\` / \`assertive\` — просят скринридер озвучить динамические изменения (polite — вежливо, дождавшись паузы; assertive — сразу).

### Управление фокусом

**Фокус** — это то, на каком элементе сейчас «стоит» клавиатура.

- Держи видимый индикатор фокуса через \`:focus-visible\` — не убирай \`outline\`, не дав замену.
- В модальных окнах делай **focus trap** (ловушку фокуса) — Tab крутится только внутри окна; при закрытии верни фокус на кнопку, которая его открыла; ставь \`aria-modal="true"\`.
- В SPA (одностраничных приложениях) при переходе на новый «экран» переводи фокус на новый заголовок или \`<main>\`, иначе пользователь клавиатуры «потеряется».

### Клавиатурная навигация

- Всё интерактивное должно быть достижимо по \`Tab\`. Порядок задаётся \`tabindex\`; избегай положительных значений (\`tabindex="1"\` и выше ломают естественный порядок).
- Следуй паттернам WAI-ARIA: стрелки для перемещения по меню и табам, \`Esc\` для закрытия, \`Enter\`/\`Space\` для активации.

### Инструменты

axe DevTools и вкладка a11y в Lighthouse ловят часть проблем автоматически. Но обязательно проверяй вживую: реальным скринридером (NVDA на Windows, VoiceOver на Mac) и навигацией только с клавиатуры, без мыши.

## ⚠️ Подводные камни

- Убрать \`outline: none\` и не дать замену — классический способ сделать сайт непроходимым с клавиатуры.
- Положительный \`tabindex\` ломает логичный порядок обхода — используй \`0\` или \`-1\`.
- ARIA не добавляет поведения: \`role="button"\` не сделает элемент кликабельным по Enter — клавиатуру надо обработать самому.
- Автопроверки ловят лишь часть проблем; без ручного теста скринридером легко пропустить главное.

## 🎯 Запомни

- WCAG = POUR: Perceivable, Operable, Understandable, Robust; целевой уровень — AA.
- Первое правило ARIA: сначала нативный элемент, ARIA — только при отсутствии альтернативы.
- Управляй фокусом (focus-visible, focus trap в модалках, возврат фокуса) и обеспечь полную навигацию с клавиатуры.`,
      en: `## 🧩 In plain words

Accessibility (a11y) is about making a site usable by everyone: the person with a mouse, the one who only uses the keyboard, and the blind user with a screen reader. There's a rulebook called **WCAG** that rests on four pillars (perceivable, operable, understandable, robust). And **ARIA**, focus management, and keyboard navigation are the tools you use to put those rules into practice. The core rule is simple: reach for native elements first, and add workarounds only when there's truly no other way.

### WCAG — four principles (POUR)

**WCAG (Web Content Accessibility Guidelines)** is the international accessibility standard. Its four principles spell out the acronym **POUR**:

- **Perceivable** — content can be perceived: alt text on images, text contrast at least 4.5:1, captions on videos.
- **Operable** — everything works from the keyboard, no "focus traps," enough time to act.
- **Understandable** — behavior is predictable, form errors are explained clearly.
- **Robust** — works with assistive technologies (screen readers and the like).

Conformance levels: A (minimum), AA (the target for most sites), AAA (maximum).

### ARIA roles

**ARIA (Accessible Rich Internet Applications)** is a set of attributes that add meaning where native semantics is missing. **The first rule of ARIA: do not use ARIA if a native element exists** (a native \`<button>\` beats \`<div role="button">\`).

\`\`\`html
<!-- Custom tabs -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Tab</button>
</div>
<div role="tabpanel" id="panel-1">...</div>
\`\`\`

- \`aria-label\`, \`aria-labelledby\` — set the accessible name (what the screen reader calls the element).
- \`aria-expanded\`, \`aria-selected\`, \`aria-current\` — report state (expanded, selected, current).
- \`aria-live="polite"\` / \`assertive\` — ask the screen reader to announce dynamic changes (polite — waits for a pause; assertive — immediately).

### Focus management

**Focus** is the element the keyboard is currently "sitting" on.

- Keep a visible focus indicator via \`:focus-visible\` — don't remove the \`outline\` without a replacement.
- In modal dialogs use a **focus trap** — Tab cycles only inside the dialog; on close, return focus to the button that opened it; set \`aria-modal="true"\`.
- In SPAs (single-page apps), on navigating to a new "screen" move focus to the new heading or \`<main>\`, or the keyboard user gets "lost."

### Keyboard navigation

- Everything interactive must be reachable via \`Tab\`. Order is set by \`tabindex\`; avoid positive values (\`tabindex="1"\` and up break the natural order).
- Follow WAI-ARIA patterns: arrow keys to move through menus and tabs, \`Esc\` to close, \`Enter\`/\`Space\` to activate.

### Tools

axe DevTools and the a11y tab in Lighthouse catch some issues automatically. But always test for real: with an actual screen reader (NVDA on Windows, VoiceOver on Mac) and by navigating with the keyboard only, no mouse.

## ⚠️ Common pitfalls

- Removing \`outline: none\` without a replacement is the classic way to make a site impassable by keyboard.
- A positive \`tabindex\` breaks the logical traversal order — use \`0\` or \`-1\`.
- ARIA adds no behavior: \`role="button"\` won't make an element activate on Enter — you have to handle the keyboard yourself.
- Automated checks catch only some issues; without a manual screen-reader test it's easy to miss the important ones.

## 🎯 Key takeaways

- WCAG = POUR: Perceivable, Operable, Understandable, Robust; the target level is AA.
- First rule of ARIA: native element first, ARIA only when there's no alternative.
- Manage focus (focus-visible, focus trap in modals, focus return) and ensure full keyboard navigation.`
    }
  },
  {
    id: 'web-025',
    category: 'web-performance',
    level: 'Hard',
    tags: ['rendering-strategies', 'ssr', 'ssg', 'csr'],
    question: {
      ru: 'Сравните CSR, SSR, SSG и ISR. Как выбрать стратегию рендеринга?',
      en: 'Compare CSR, SSR, SSG, and ISR. How do you choose a rendering strategy?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что ты заказываешь торт. Можно получить готовый торт из витрины (быстро, но испечён вчера), можно попросить испечь свежий прямо сейчас (дольше, зато тёплый), а можно получить полуфабрикат и собрать самому дома. Стратегии рендеринга — это ровно про то, **где и когда «печётся» HTML-страница**: заранее на сборке, на сервере в момент запроса или прямо в браузере пользователя. От этого выбора зависит скорость, свежесть данных и то, увидит ли Google твой контент.

Сначала пара терминов, которые дальше встретятся часто. **Рендеринг** — превращение кода в готовый HTML, который видит пользователь. **Гидрация** — «оживление» готового HTML: браузер навешивает на него JavaScript-обработчики, чтобы кнопки заработали. **SEO** — насколько хорошо поисковики видят и индексируют контент.

### CSR — Client-Side Rendering (рендер в браузере)

Сервер отдаёт почти пустую страницу — по сути один \`<div id="app">\` плюс большой файл JavaScript. Всю страницу собирает уже сам браузер.

**Плюсы:** дёшево хостить (нужна просто отдача статики), богатая интерактивность после загрузки.
**Минусы:** пользователь долго видит пустой экран, пока грузится и исполняется JS; слабый SEO (поисковик получает пустой div); медленный **LCP** (Largest Contentful Paint — момент, когда виден основной контент) на слабых телефонах.

### SSR — Server-Side Rendering (рендер на сервере при каждом запросе)

Сервер собирает полный HTML на **каждый** запрос и отдаёт его готовым, а браузер потом гидрирует.

**Плюсы:** быстрый **FCP/LCP** (контент виден сразу), хороший SEO, всегда свежие данные.
**Минусы:** нагрузка на сервер; выше **TTFB** (Time To First Byte — время до первого байта ответа), если рендер сложный; обязательна гидрация.

### SSG — Static Site Generation (генерация на сборке)

HTML генерируется один раз — на этапе сборки проекта. Готовые файлы лежат и раздаются с **CDN** (сеть серверов по всему миру, отдающая файлы из ближайшей к пользователю точки).

**Плюсы:** максимально быстро, дёшево, безопасно (нечего ломать — это просто файлы).
**Минусы:** данные «застывают» на момент сборки; для сайта с тысячами страниц пересборка долгая.

### ISR — Incremental Static Regeneration (SSG с фоновым обновлением)

Это SSG, но страницы умеют обновляться в фоне — по таймеру или по запросу. Работает по принципу **stale-while-revalidate**: отдать «слегка устаревшую» версию сразу, а свежую пересобрать в фоне.

**Плюсы:** скорость статики, но с обновляемыми данными.
**Минусы:** до момента регенерации пользователь может увидеть устаревшую версию.

### Как выбрать стратегию

Выбор диктуют два вопроса: **нужен ли SEO** и **насколько свежими должны быть данные**.

- **Маркетинг, блог, документация** → SSG (или ISR, если контент часто меняется).
- **E-commerce, листинги с персонализацией** → SSR или ISR.
- **Дашборды за авторизацией** → CSR (SEO не нужен) или SSR-каркас (shell).
- **Контент-сайт с тысячами страниц и периодическим обновлением** → ISR.

### Гибридный подход

На практике современные фреймворки не выбирают что-то одно, а **комбинируют**: статичный каркас + SSR для динамических кусков + островная (частичная) гидрация. Ключевая мысль: решение принимается **для каждой страницы или маршрута отдельно**, а не для всего приложения сразу.

## ⚠️ Подводные камни

- CSR почти всегда проигрывает по SEO и по скорости первого показа — не выбирай его для публичного контента, который должен индексироваться.
- SSR не бесплатен: сложный рендер на сервере увеличивает TTFB, а под нагрузкой сервер надо масштабировать.
- SSG кажется идеальным, пока данные не устарели или пока пересборка тысяч страниц не стала занимать десятки минут.
- ISR может показать устаревшую версию — это компромисс, а не магия.

## 🎯 Запомни

- Разница между CSR/SSR/SSG/ISR — это **где и когда** собирается HTML: в браузере / на сервере при запросе / на сборке / на сборке с фоновым обновлением.
- Выбор диктуют требования к **SEO** и **свежести данных**, а не мода.
- Решай **по странице/маршруту**, а не для всего приложения — гибрид это норма.
- Сверяйся с метриками: **LCP, TTFB, INP**.`,
      en: `## 🧩 In plain words

Imagine ordering a cake. You can grab a ready-made one from the display case (fast, but baked yesterday), ask them to bake a fresh one right now (slower, but warm), or take a pre-made base and finish it yourself at home. Rendering strategies are exactly this: **where and when the HTML page gets "baked"** — ahead of time at build, on the server at request time, or right in the user's browser. That choice drives speed, data freshness, and whether Google can even see your content.

First, a few terms you'll meet below. **Rendering** — turning code into the finished HTML the user sees. **Hydration** — "bringing HTML to life": the browser attaches JavaScript handlers so buttons actually work. **SEO** — how well search engines can see and index your content.

### CSR — Client-Side Rendering (rendered in the browser)

The server returns an almost-empty page — essentially one \`<div id="app">\` plus a big JavaScript file. The browser itself assembles the whole page.

**Pros:** cheap to host (just serve static files), rich interactivity once loaded.
**Cons:** the user stares at a blank screen while JS downloads and runs; weak SEO (the crawler gets an empty div); slow **LCP** (Largest Contentful Paint — the moment the main content is visible) on low-end phones.

### SSR — Server-Side Rendering (rendered on the server on every request)

The server builds the full HTML on **every** request and sends it ready-made; the browser then hydrates it.

**Pros:** fast **FCP/LCP** (content visible immediately), good SEO, always-fresh data.
**Cons:** server load; higher **TTFB** (Time To First Byte — the time until the first byte of the response) for complex renders; hydration is mandatory.

### SSG — Static Site Generation (generated at build)

HTML is generated once — at build time. The finished files sit and are served from a **CDN** (a network of servers worldwide that delivers files from the point nearest the user).

**Pros:** maximally fast, cheap, secure (nothing to break — they're just files).
**Cons:** data is "frozen" at build time; for a site with thousands of pages, rebuilds are slow.

### ISR — Incremental Static Regeneration (SSG with background refresh)

It's SSG, but pages can refresh in the background — on a timer or on request. It works on the **stale-while-revalidate** principle: serve a "slightly stale" version instantly, and regenerate the fresh one in the background.

**Pros:** static-level speed but with refreshable data.
**Cons:** until regeneration happens, a user may see a stale version.

### How to choose a strategy

The choice comes down to two questions: **do you need SEO** and **how fresh must the data be**.

- **Marketing, blog, docs** → SSG (or ISR if content changes often).
- **E-commerce, listings with personalization** → SSR or ISR.
- **Dashboards behind auth** → CSR (no SEO needed) or an SSR shell.
- **Content site with thousands of pages and periodic updates** → ISR.

### The hybrid approach

In practice, modern frameworks don't pick just one — they **combine**: a static shell + SSR for dynamic parts + island (partial) hydration. The key idea: the decision is made **per page or route**, not for the whole app at once.

## ⚠️ Common pitfalls

- CSR almost always loses on SEO and first-paint speed — don't pick it for public content that must be indexed.
- SSR isn't free: a complex server render raises TTFB, and under load the server must be scaled.
- SSG feels perfect until data goes stale or until rebuilding thousands of pages starts taking tens of minutes.
- ISR may serve a stale version — that's a trade-off, not magic.

## 🎯 Key takeaways

- The difference between CSR/SSR/SSG/ISR is **where and when** the HTML is built: in the browser / on the server at request / at build / at build with background refresh.
- The choice is driven by **SEO** and **data-freshness** requirements, not by trends.
- Decide **per page/route**, not for the whole app — hybrid is the norm.
- Check yourself against the metrics: **LCP, TTFB, INP**.`
    }
  },
  {
    id: 'web-026',
    category: 'web-performance',
    level: 'Expert',
    tags: ['angular', 'hydration', 'ssr'],
    question: {
      ru: 'Как работает гидрация в Angular Universal? Что такое non-destructive hydration?',
      en: 'How does hydration work in Angular Universal? What is non-destructive hydration?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь манекен в витрине: выглядит как живой человек, но не двигается. **SSR** (Server-Side Rendering — сборка HTML на сервере) присылает браузеру именно такой «манекен»: страница видна сразу, но кнопки ещё мёртвые. **Гидрация** — это момент, когда приходит JavaScript и «оживляет» манекен: навешивает обработчики кликов, восстанавливает состояние, и страница становится интерактивной. А **non-destructive hydration** — это когда Angular оживляет уже стоящий манекен, а не сносит его и не лепит заново.

### Что такое гидрация в Angular

Angular Universal рендерит готовый HTML на сервере, чтобы пользователь и поисковик увидели контент мгновенно. Но без JavaScript этот HTML — просто картинка: клики не работают. **Гидрация** — процесс, когда Angular на клиенте «подхватывает» серверный DOM (уже нарисованное дерево элементов) и навешивает на него обработчики событий и состояние, возвращая интерактивность.

### Destructive против Non-destructive

- **Destructive (старый подход до v16):** Angular на клиенте **удалял** весь серверный DOM и рендерил страницу заново с нуля. Итог — мерцание, лишний пересчёт вёрстки (layout) и плохие метрики **CLS** (сдвиги вёрстки) и **LCP** (момент показа основного контента). По сути браузер делал двойную работу.
- **Non-destructive hydration (v16+):** Angular **переиспользует** уже существующий DOM — сопоставляет серверное дерево со своим и только присоединяет обработчики событий и состояние. Ничего не перерисовывается, мерцания нет. Включается одной строкой:

\`\`\`ts
bootstrapApplication(AppComponent, {
  providers: [provideClientHydration()],
});
\`\`\`

Здесь \`provideClientHydration()\` — провайдер, который говорит Angular: «не сноси серверный DOM, а бережно его оживи».

### Что важно знать про совпадение DOM

Чтобы переиспользование сработало, серверный и клиентский рендер должны дать **идентичный** DOM. Если деревья не совпадут — будет ошибка **hydration mismatch** (\`NG0500\`). Типичные причины расхождения:

- прямые манипуляции с DOM в обход Angular;
- недетерминированные значения: \`Date.now()\`, случайные числа — на сервере и клиенте они разные;
- невалидный HTML, который браузер «чинит» по-своему.

Если какой-то компонент в принципе нельзя гидрировать (например, сторонняя библиотека сама мутирует DOM), его помечают атрибутом \`ngSkipHydration\` — Angular пропустит его при гидрации.

### Deferrable views и частичная гидрация

Angular пошёл дальше и добавил инструменты, чтобы грузить и оживлять не всё сразу:

- **\`@defer\` (v17+)** откладывает загрузку и рендер блока шаблона до триггера — попадания в область видимости (viewport), взаимодействия (interaction) или простоя (idle). По сути это code splitting (разбиение кода на части) прямо на уровне шаблона.
- **Incremental / event-replay hydration (v18+)** — гидрация по требованию. Блок становится интерактивным только когда пользователь с ним взаимодействует; а события, случившиеся до гидрации, буферизуются и потом воспроизводятся, чтобы клик не «потерялся». Включается функциями \`withEventReplay()\` и \`withIncrementalHydration()\`:

\`\`\`ts
bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration(
      withEventReplay(),        // буферизовать и воспроизвести события
      withIncrementalHydration() // гидрировать @defer-блоки по требованию
    ),
  ],
});
\`\`\`

Это уменьшает объём JavaScript, исполняемого на старте, и улучшает **INP** (отзывчивость на действия пользователя) и **TBT** (Total Blocking Time — время, когда главный поток заблокирован и не реагирует).

## ⚠️ Подводные камни

- Разный вывод на сервере и клиенте = hydration mismatch (\`NG0500\`). Остерегайся \`Date.now()\`, \`Math.random()\` и прямых обращений к DOM в шаблонах.
- Невалидный HTML (например, \`<div>\` внутри \`<p>\`) браузер молча исправит — и деревья разойдутся.
- Сторонние виджеты, мутирующие DOM, гидрировать нельзя — помечай их \`ngSkipHydration\`.

## 🎯 Запомни

- Гидрация — это «оживление» серверного HTML: навешивание обработчиков поверх готового DOM.
- **Non-destructive** (v16+, \`provideClientHydration()\`) переиспользует DOM вместо сноса → нет мерцания, лучше CLS/LCP.
- Серверный и клиентский DOM обязаны совпадать, иначе \`NG0500\`.
- \`@defer\` + incremental hydration грузят и оживляют по требованию → меньше стартового JS, лучше INP/TBT.`,
      en: `## 🧩 In plain words

Picture a mannequin in a shop window: it looks like a real person but doesn't move. **SSR** (Server-Side Rendering — building HTML on the server) sends the browser exactly that kind of "mannequin": the page is visible instantly, but the buttons are still dead. **Hydration** is the moment JavaScript arrives and "brings the mannequin to life": it attaches click handlers, restores state, and the page becomes interactive. And **non-destructive hydration** is when Angular revives the mannequin that's already standing there, instead of knocking it down and rebuilding it.

### What hydration means in Angular

Angular Universal renders finished HTML on the server so users and crawlers see content instantly. But without JavaScript that HTML is just a picture — clicks don't work. **Hydration** is the process where Angular on the client "picks up" the server DOM (the element tree already drawn) and attaches event handlers and state to it, restoring interactivity.

### Destructive vs Non-destructive

- **Destructive (the old pre-v16 approach):** Angular on the client **destroyed** the entire server DOM and re-rendered the page from scratch. The result — flicker, extra layout recompute, and poor **CLS** (layout shift) and **LCP** (when the main content appears). Essentially the browser did the work twice.
- **Non-destructive hydration (v16+):** Angular **reuses** the existing DOM — it matches the server tree against its own and only attaches event handlers and state. Nothing is repainted, no flicker. Turned on with one line:

\`\`\`ts
bootstrapApplication(AppComponent, {
  providers: [provideClientHydration()],
});
\`\`\`

Here \`provideClientHydration()\` is the provider that tells Angular: "don't tear down the server DOM, gently revive it."

### What you must know about DOM matching

For reuse to work, the server and client render must produce an **identical** DOM. If the trees don't match, you get a **hydration mismatch** (\`NG0500\`). Typical causes of divergence:

- direct DOM manipulation bypassing Angular;
- non-deterministic values: \`Date.now()\`, random numbers — different on server and client;
- invalid HTML that the browser "fixes" in its own way.

If a component simply can't be hydrated (e.g. a third-party library mutating the DOM itself), mark it with the \`ngSkipHydration\` attribute — Angular will skip it during hydration.

### Deferrable views and partial hydration

Angular went further and added tools to load and revive not everything at once:

- **\`@defer\` (v17+)** defers loading and rendering a template block until a trigger — entering the viewport, an interaction, or idle time. It's essentially code splitting (breaking code into parts) right at the template level.
- **Incremental / event-replay hydration (v18+)** — on-demand hydration. A block becomes interactive only when the user interacts with it; and events that happened before hydration are buffered and then replayed, so a click isn't "lost". Enabled via \`withEventReplay()\` and \`withIncrementalHydration()\`:

\`\`\`ts
bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration(
      withEventReplay(),        // buffer & replay events before hydration
      withIncrementalHydration() // hydrate @defer blocks on demand
    ),
  ],
});
\`\`\`

This reduces the JavaScript executed at startup and improves **INP** (responsiveness to user actions) and **TBT** (Total Blocking Time — how long the main thread is blocked and unresponsive).

## ⚠️ Common pitfalls

- Different output on server and client = hydration mismatch (\`NG0500\`). Beware \`Date.now()\`, \`Math.random()\`, and direct DOM access in templates.
- Invalid HTML (e.g. a \`<div>\` inside a \`<p>\`) gets silently corrected by the browser — and the trees diverge.
- Third-party widgets that mutate the DOM can't be hydrated — mark them \`ngSkipHydration\`.

## 🎯 Key takeaways

- Hydration is "reviving" server HTML: attaching handlers on top of the ready DOM.
- **Non-destructive** (v16+, \`provideClientHydration()\`) reuses the DOM instead of tearing it down → no flicker, better CLS/LCP.
- Server and client DOM must match, otherwise \`NG0500\`.
- \`@defer\` + incremental hydration load and revive on demand → less startup JS, better INP/TBT.`
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
    category: 'web-performance',
    level: 'Hard',
    tags: ['bundle', 'code-splitting', 'tree-shaking'],
    question: {
      ru: 'Объясните code splitting, tree shaking и ленивую загрузку маршрутов. Как уменьшить размер бандла?',
      en: 'Explain code splitting, tree shaking, and lazy route loading. How do you reduce bundle size?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что при первом заходе на сайт браузеру приходится скачать весь твой код — как если бы в ресторане тебе принесли всё меню на тарелке, хотя ты заказал один салат. **Code splitting** режет этот огромный «обед» на порции, которые подаются только по мере надобности. **Tree shaking** — это когда сборщик выкидывает код, которым ты вообще не пользуешься (как убрать со стола блюда, которые никто не заказал). А **ленивая загрузка маршрутов** — приём, при котором код страницы качается только тогда, когда пользователь на эту страницу переходит.

Пара терминов на входе. **Бандл (bundle)** — собранный файл(ы) с кодом приложения. **Сборщик (bundler)** — инструмент вроде esbuild, Rollup или webpack, который склеивает исходники в бандл. **Чанк (chunk)** — отдельный кусок бандла, который можно загрузить независимо.

### Code splitting (разбиение кода)

Вместо одного гигантского бандла код делят на чанки, загружаемые по требованию. Самый частый приём — **ленивая загрузка маршрутов**:

\`\`\`ts
export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component')
      .then((m) => m.AdminComponent),
  },
];
\`\`\`

Здесь \`import('./admin/admin.component')\` — это **динамический импорт**: код страницы admin оформляется в отдельный чанк и скачивается только когда пользователь реально зайдёт на \`/admin\`. Итог: меньше **initial bundle** (то, что грузится при первом заходе) → быстрее **TTI** (Time To Interactive, момент, когда со страницей можно взаимодействовать) и **LCP**.

### Tree shaking (удаление мёртвого кода)

Сборщик удаляет неиспользуемый код, опираясь на то, что ES-модули (\`import\`/\`export\`) **статичны** — их зависимости видны без запуска программы, ещё на этапе сборки. Работает только при трёх условиях:

- используется **ESM** (ES-модули), а не старый CommonJS (\`require\`);
- у модулей нет побочных эффектов — это подсказывают полем \`"sideEffects": false\` в \`package.json\`;
- импортируются конкретные символы, а не весь модуль целиком. Например \`import { debounce } from 'lodash-es'\`, а не весь lodash — иначе в бандл утянется всё.

### Дополнительные техники

- **Динамический \`import()\`** для тяжёлых и редко используемых библиотек — грузи их только в момент использования.
- **\`@defer\`** в Angular — отложить рендер компонента до триггера.
- **Анализ бандла** инструментами source-map-explorer или webpack-bundle-analyzer, чтобы найти «толстые» зависимости.
- **Замена тяжёлых библиотек** на лёгкие: moment → date-fns или dayjs.
- **Минификация и сжатие** (gzip/brotli) на сервере или CDN.
- **Удаление полифилов** для устаревших браузеров, которые ты не поддерживаешь.

### На какие метрики смотреть

Следи за **TBT (Total Blocking Time — суммарное время, когда главный поток заблокирован)** и за **размером JS-бандла**. Важная интуиция: каждый лишний килобайт JavaScript дороже килобайта картинки, потому что JS нужно не просто скачать, а ещё распарсить и исполнить — а это грузит процессор. Цель — отдать минимум критического JS сразу, а остальное догружать лениво.

## ⚠️ Подводные камни

- Импорт всей библиотеки (\`import _ from 'lodash'\`) ломает tree shaking — тянется весь пакет. Импортируй точечно.
- CommonJS-зависимости плохо поддаются tree shaking — предпочитай ESM-версии пакетов.
- Слишком мелкое дробление на чанки тоже вредит: множество мелких запросов создают накладные расходы. Нужен баланс.
- \`"sideEffects"\` выставлен неверно — сборщик побоится удалить код, у которого якобы есть побочные эффекты (например, глобальные CSS-импорты).

## 🎯 Запомни

- **Code splitting** — грузить код по требованию (в первую очередь через ленивые маршруты и динамический \`import()\`).
- **Tree shaking** выкидывает неиспользуемый код, но только при ESM + \`sideEffects: false\` + точечных импортах.
- Меньше стартового JS = быстрее TTI/LCP и меньше TBT.
- Килобайт JS дороже килобайта картинки: его надо распарсить и исполнить.`,
      en: `## 🧩 In plain words

Imagine that on your first visit the browser has to download your entire codebase — as if at a restaurant they brought you the whole menu on a plate when you ordered one salad. **Code splitting** cuts that giant "meal" into portions served only as needed. **Tree shaking** is when the bundler throws out code you never use (like clearing dishes nobody ordered off the table). And **lazy route loading** is a technique where a page's code downloads only when the user actually navigates to that page.

A couple of terms up front. **Bundle** — the assembled file(s) of your app's code. **Bundler** — a tool like esbuild, Rollup, or webpack that stitches sources into a bundle. **Chunk** — a separate piece of the bundle that can be loaded independently.

### Code splitting

Instead of one giant bundle, code is split into chunks loaded on demand. The most common technique is **lazy route loading**:

\`\`\`ts
export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component')
      .then((m) => m.AdminComponent),
  },
];
\`\`\`

Here \`import('./admin/admin.component')\` is a **dynamic import**: the admin page's code is packaged into a separate chunk and downloaded only when the user actually visits \`/admin\`. Result: a smaller **initial bundle** (what loads on first visit) → faster **TTI** (Time To Interactive, when you can interact with the page) and **LCP**.

### Tree shaking (dead-code elimination)

The bundler removes unused code by relying on the fact that ES modules (\`import\`/\`export\`) are **static** — their dependencies are visible without running the program, at build time. It only works under three conditions:

- **ESM** (ES modules) is used, not the old CommonJS (\`require\`);
- modules have no side effects — signaled by \`"sideEffects": false\` in \`package.json\`;
- specific symbols are imported, not the whole module. For example \`import { debounce } from 'lodash-es'\`, not all of lodash — otherwise everything gets dragged into the bundle.

### Additional techniques

- **Dynamic \`import()\`** for heavy, rarely used libraries — load them only at the moment of use.
- **\`@defer\`** in Angular — defer rendering a component until a trigger.
- **Bundle analysis** with source-map-explorer or webpack-bundle-analyzer to find "fat" dependencies.
- **Replacing heavy libraries** with light ones: moment → date-fns or dayjs.
- **Minification and compression** (gzip/brotli) on the server or CDN.
- **Dropping polyfills** for legacy browsers you don't support.

### Which metrics to watch

Watch **TBT (Total Blocking Time — the total time the main thread is blocked)** and the **JS bundle size**. Key intuition: every extra kilobyte of JavaScript is costlier than a kilobyte of image, because JS must not just be downloaded but also parsed and executed — and that taxes the CPU. The goal is to ship the minimum critical JS up front and lazy-load the rest.

## ⚠️ Common pitfalls

- Importing a whole library (\`import _ from 'lodash'\`) breaks tree shaking — the entire package comes along. Import selectively.
- CommonJS dependencies tree-shake poorly — prefer the ESM versions of packages.
- Over-splitting into tiny chunks also hurts: many small requests add overhead. You need balance.
- A wrong \`"sideEffects"\` setting makes the bundler afraid to remove code it thinks has side effects (e.g. global CSS imports).

## 🎯 Key takeaways

- **Code splitting** — load code on demand (primarily via lazy routes and dynamic \`import()\`).
- **Tree shaking** drops unused code, but only with ESM + \`sideEffects: false\` + selective imports.
- Less startup JS = faster TTI/LCP and lower TBT.
- A kilobyte of JS costs more than a kilobyte of image: it must be parsed and executed.`
    }
  },
  {
    id: 'web-028',
    category: 'web-performance',
    level: 'Hard',
    tags: ['caching', 'http-headers', 'etag'],
    question: {
      ru: 'Как работают HTTP-заголовки кэширования (Cache-Control, ETag)? Опишите стратегию для статики и API.',
      en: 'How do HTTP caching headers (Cache-Control, ETag) work? Describe a strategy for static assets and APIs.'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Кэширование — это как держать копию нужной вещи под рукой, чтобы не бегать за ней в магазин каждый раз. Браузер умеет сохранять скачанные файлы у себя, чтобы при повторном визите не качать их заново. Но у него встаёт вопрос: «а копия ещё свежая, или в магазине уже новая версия?» Именно на этот вопрос отвечают HTTP-заголовки кэширования: \`Cache-Control\` говорит **как долго** копию можно считать свежей, а \`ETag\` помогает **дёшево проверить**, не изменился ли оригинал.

Термин на входе: **HTTP-заголовки** — это строчки метаданных, которые сервер прикрепляет к ответу вместе с самим файлом; браузер их читает и решает, что делать.

### Cache-Control — главный заголовок кэша

Он задаёт правила хранения копии:

- \`max-age=31536000\` — сколько **секунд** ресурс считается «свежим» (тут ровно год).
- \`immutable\` — «этот файл никогда не изменится, не перепроверяй его до истечения» (для версионированных файлов).
- \`no-cache\` — кэшировать **можно**, но перед каждым использованием нужно **ревалидировать** (переспросить у сервера, актуальна ли копия). Название обманчивое: это не «не кэшировать».
- \`no-store\` — не кэшировать вообще, ни на диск, ни в память (для чувствительных данных).
- \`private\` / \`public\` — можно ли хранить копию только в браузере пользователя (\`private\`) или ещё и на общих CDN/прокси (\`public\`).
- \`stale-while-revalidate\` — отдать устаревшую копию сразу, а свежую подтянуть в фоне.

### ETag и валидация

**ETag** (Entity Tag) — это метка версии ресурса, обычно хэш содержимого, например \`"v3-9af2"\`. Когда срок свежести истёк, браузер не качает файл вслепую, а спрашивает: шлёт заголовок \`If-None-Match: <etag>\` — «у меня версия такая-то, она ещё актуальна?». Если на сервере ничего не поменялось, он отвечает \`304 Not Modified\` **без тела** — то есть без самого файла. Браузер понимает: моя копия годится, и переиспользует её. Экономится трафик и время. Точно так же работает пара \`Last-Modified\` + \`If-Modified-Since\`, только сравнивается дата изменения, а не хэш.

### Стратегия для статики (cache busting)

Приём называется **cache busting** — «сброс кэша через смену имени». Файлам добавляют хэш содержимого в имя, например \`app.4f3a1c.js\`, и кэшируют их фактически навечно:

\`\`\`
Cache-Control: public, max-age=31536000, immutable
\`\`\`

Хитрость в том, что при новом деплое содержимое меняется → меняется хэш → меняется **имя файла** → это новый URL, который браузер обязан скачать заново. Старую версию можно спокойно держать в кэше вечно — на неё уже никто не ссылается. А вот сам \`index.html\` помечают \`no-cache\`, чтобы браузер всегда переспрашивал его и подтягивал актуальные ссылки на новые хэшированные файлы.

### Стратегия для API

- **Часто меняющиеся данные:** \`no-cache\` + ETag — храним копию, но каждый раз дёшево проверяем актуальность через \`304\`.
- **Редко меняющиеся справочники:** небольшой \`max-age\` + \`stale-while-revalidate\` — быстро отдаём, тихо обновляем.
- **Приватные данные:** \`private, no-store\` — не кэшировать нигде.

### Уровни кэша

Запрос проходит несколько слоёв кэша по пути: **браузер → Service Worker → CDN edge (ближайший к пользователю сервер сети доставки) → origin (твой основной сервер)**. Чем ближе к пользователю удаётся отдать ответ, тем меньше нагрузка на origin и тем ниже **TTFB** (время до первого байта). Цель — отдавать неизменный контент из кэша и платить за сеть только тогда, когда данные реально обновились.

## ⚠️ Подводные камни

- \`no-cache\` НЕ значит «не кэшировать» — это «кэшируй, но всегда ревалидируй». «Не кэшировать вообще» — это \`no-store\`.
- Кэшировать \`index.html\` с длинным \`max-age\` — классическая ошибка: пользователи застревают на старой версии и не видят новых файлов.
- Хэш в имени файла обязателен для стратегии \`immutable\`: без смены имени пользователь никогда не получит обновление.
- \`public\` на приватных данных откроет их для кэширования на общих прокси/CDN — утечка. Для персональных ответов используй \`private\`.

## 🎯 Запомни

- \`Cache-Control\` задаёт срок свежести (\`max-age\`, \`immutable\`) и правила (\`no-cache\`, \`no-store\`, \`private/public\`).
- \`ETag\` + \`If-None-Match\` дают дешёвую ревалидацию: ответ \`304\` без тела экономит трафик.
- Статика с хэшем в имени → \`immutable\` навечно; \`index.html\` → \`no-cache\`.
- Многослойный кэш (браузер → SW → CDN → origin) снижает нагрузку и TTFB.`,
      en: `## 🧩 In plain words

Caching is like keeping a copy of something you need close at hand so you don't run to the store for it every time. The browser can save downloaded files locally so it doesn't re-download them on your next visit. But then it faces a question: "is my copy still fresh, or is there a newer version at the store?" HTTP caching headers answer exactly that: \`Cache-Control\` says **how long** a copy can be considered fresh, and \`ETag\` helps **cheaply check** whether the original has changed.

A term up front: **HTTP headers** are lines of metadata the server attaches to a response alongside the file itself; the browser reads them and decides what to do.

### Cache-Control — the main cache header

It sets the rules for storing a copy:

- \`max-age=31536000\` — how many **seconds** the resource counts as "fresh" (here, exactly one year).
- \`immutable\` — "this file will never change, don't recheck it before expiry" (for versioned files).
- \`no-cache\` — caching **is** allowed, but before each use you must **revalidate** (re-ask the server whether the copy is still current). The name is misleading: it does not mean "don't cache".
- \`no-store\` — don't cache at all, neither to disk nor memory (for sensitive data).
- \`private\` / \`public\` — whether a copy may live only in the user's browser (\`private\`) or also on shared CDNs/proxies (\`public\`).
- \`stale-while-revalidate\` — serve the stale copy instantly, and fetch the fresh one in the background.

### ETag and validation

An **ETag** (Entity Tag) is a version marker for a resource, usually a hash of its contents, e.g. \`"v3-9af2"\`. When freshness has expired, the browser doesn't blindly re-download the file — it asks: it sends the header \`If-None-Match: <etag>\` — "I have version so-and-so, is it still current?". If nothing changed on the server, it replies \`304 Not Modified\` **with no body** — that is, without the file itself. The browser understands its copy is good and reuses it. Bandwidth and time are saved. The \`Last-Modified\` + \`If-Modified-Since\` pair works the same way, only comparing the modification date instead of a hash.

### Strategy for static assets (cache busting)

The technique is called **cache busting** — "resetting the cache by changing the name". A content hash is added to file names, e.g. \`app.4f3a1c.js\`, and they're cached essentially forever:

\`\`\`
Cache-Control: public, max-age=31536000, immutable
\`\`\`

The trick: on a new deploy the contents change → the hash changes → the **filename** changes → it's a new URL the browser is obligated to re-download. The old version can safely sit in the cache forever — nothing references it anymore. Meanwhile \`index.html\` itself is marked \`no-cache\` so the browser always re-asks for it and pulls the current references to the new hashed files.

### Strategy for APIs

- **Frequently changing data:** \`no-cache\` + ETag — keep a copy, but cheaply check its currency each time via \`304\`.
- **Rarely changing reference data:** a small \`max-age\` + \`stale-while-revalidate\` — serve fast, refresh quietly.
- **Private data:** \`private, no-store\` — cache nowhere.

### Cache layers

A request passes through several cache layers on its way: **browser → Service Worker → CDN edge (the delivery-network server nearest the user) → origin (your main server)**. The closer to the user a response can be served, the lighter the load on the origin and the lower the **TTFB** (time to first byte). The goal is to serve unchanged content from cache and pay the network cost only when data actually changes.

## ⚠️ Common pitfalls

- \`no-cache\` does NOT mean "don't cache" — it means "cache, but always revalidate". "Don't cache at all" is \`no-store\`.
- Caching \`index.html\` with a long \`max-age\` is a classic mistake: users get stuck on the old version and never see the new files.
- A hash in the filename is mandatory for the \`immutable\` strategy: without a name change, the user never receives an update.
- \`public\` on private data exposes it to caching on shared proxies/CDNs — a leak. For per-user responses use \`private\`.

## 🎯 Key takeaways

- \`Cache-Control\` sets the freshness lifetime (\`max-age\`, \`immutable\`) and the rules (\`no-cache\`, \`no-store\`, \`private/public\`).
- \`ETag\` + \`If-None-Match\` give cheap revalidation: a \`304\` with no body saves bandwidth.
- Hashed static assets → \`immutable\` forever; \`index.html\` → \`no-cache\`.
- A layered cache (browser → SW → CDN → origin) lowers load and TTFB.`
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
    category: 'web-performance',
    level: 'Hard',
    tags: ['service-worker', 'pwa', 'caching'],
    question: {
      ru: 'Что такое Service Worker и PWA? Какие стратегии кэширования вы знаете?',
      en: 'What is a Service Worker and a PWA? Which caching strategies do you know?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что между твоим сайтом и интернетом сидит маленький помощник-охранник. Каждый раз, когда страница просит что-то из сети, запрос сначала проходит через него. Он может отдать сохранённую копию из своего «шкафчика» (кэша) — мгновенно и даже без интернета. Этот помощник и есть **Service Worker**, а сайт, который умеет им пользоваться и устанавливаться как настоящее приложение, называется **PWA**.

### Что такое Service Worker

Service Worker — это специальный скрипт-прокси (посредник) между приложением и сетью. Он работает в отдельном потоке (в фоне, не мешая интерфейсу), перехватывает сетевые запросы через событие \`fetch\`, управляет хранилищем **Cache API** (браузерное хранилище готовых ответов), обеспечивает работу офлайн и push-уведомления.

У него есть жизненный цикл из трёх стадий: \`install\` (установка — момент скачать и сложить файлы в кэш) → \`activate\` (активация — момент почистить старьё) → \`fetch\` (перехват каждого запроса).

\`\`\`ts
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});
\`\`\`

Здесь на каждый запрос воркер сначала ищет ответ в кэше (\`caches.match\`). Если копия нашлась — отдаёт её, если нет (\`??\`) — идёт в сеть (\`fetch\`).

### Что такое PWA

PWA (Progressive Web App, «прогрессивное веб-приложение») — это обычный сайт, который ведёт себя как нативное приложение: его можно установить на телефон или рабочий стол, у него есть иконка, он открывается на весь экран и работает офлайн.

Чтобы сайт стал PWA, нужны три вещи:

- **manifest.json** — файл-паспорт: иконки, название, цвет темы, как запускать.
- **Service Worker** — тот самый помощник для офлайна и кэша.
- **HTTPS** — защищённое соединение (обязательное требование безопасности).

Взамен получаешь installability (возможность установки), работу офлайн и фоновую синхронизацию.

### Стратегии кэширования

Стратегия — это правило, которое решает: брать ответ из кэша или из сети, и в каком порядке.

- **Cache First** («сначала кэш») — сначала смотрим в кэш, сеть только как запасной вариант. Идеально для статики: шрифтов, иконок, картинок, которые почти не меняются.
- **Network First** («сначала сеть») — сначала идём в сеть, а кэш достаём, только если офлайн. Для данных, которые часто меняются и должны быть свежими.
- **Stale-While-Revalidate** («отдай старое, пока обновляешь») — мгновенно отдаём копию из кэша, а в фоне тихонько скачиваем свежую версию на будущее. Лучший баланс скорости и свежести.
- **Cache Only / Network Only** — крайние случаи: только кэш или только сеть, без запасного плана.

### App Shell (оболочка приложения)

App Shell — это приём, когда мы кэшируем «скелет» приложения (пустую оболочку из HTML/CSS/JS: шапку, меню, каркас), чтобы она открывалась мгновенно даже офлайн. А сам контент (данные, статьи, товары) уже догружаем динамически поверх этого скелета.

## ⚠️ Подводные камни

- **Обновление воркера**: новый Service Worker не включается сразу — он ждёт, пока закроются все вкладки со старой версией. Методы \`skipWaiting()\` (перескочить ожидание) и \`clients.claim()\` (сразу взять управление) ускоряют это, но применяй их осторожно: можно сломать активную сессию пользователя, который в этот момент работает.
- **Версионирование кэша**: обязательно чисти старые кэши в стадии \`activate\`, иначе пользователи застрянут на устаревшей версии и не увидят обновлений.
- В Angular всё это настраивается декларативно через пакет \`@angular/pwa\` и файл \`ngsw-config.json\` — не нужно писать воркер руками.

## 🎯 Запомни

- Service Worker — фоновый посредник между приложением и сетью: перехватывает \`fetch\`, управляет кэшем, даёт офлайн и push. Цикл: \`install\` → \`activate\` → \`fetch\`.
- PWA = manifest.json + Service Worker + HTTPS. Даёт установку как приложение, офлайн и фоновую синхронизацию.
- Главные стратегии: Cache First (статика), Network First (свежие данные), Stale-While-Revalidate (лучший баланс).
- PWA сильно ускоряют повторные визиты (мгновенная загрузка из кэша) и делают сайт устойчивым к потере сети.`,
      en: `## 🧩 In plain words

Imagine a little security guard sitting between your website and the internet. Every time the page asks for something from the network, the request goes through him first. He can hand back a saved copy from his "locker" (the cache) — instantly, even with no internet. That guard is the **Service Worker**, and a site that knows how to use one and can install itself like a real app is called a **PWA**.

### What a Service Worker is

A Service Worker is a special proxy script (a middleman) between the app and the network. It runs on a separate thread (in the background, without blocking the UI), intercepts network requests through the \`fetch\` event, manages the **Cache API** (the browser's store of ready-made responses), and enables offline support and push notifications.

It has a three-stage lifecycle: \`install\` (download files and stash them in the cache) → \`activate\` (clean out old stuff) → \`fetch\` (intercept every request).

\`\`\`ts
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});
\`\`\`

For each request the worker first looks in the cache (\`caches.match\`). If a copy is found it returns it; if not (\`??\`) it goes to the network (\`fetch\`).

### What a PWA is

A PWA (Progressive Web App) is an ordinary website that behaves like a native app: you can install it on a phone or desktop, it has an icon, it opens full-screen, and it works offline.

To become a PWA a site needs three things:

- **manifest.json** — an ID card file: icons, name, theme color, how to launch it.
- **Service Worker** — that middleman for offline and caching.
- **HTTPS** — a secure connection (a mandatory security requirement).

In return you get installability, offline support, and background sync.

### Caching strategies

A strategy is a rule that decides whether to take the response from the cache or the network, and in what order.

- **Cache First** — check the cache first, use the network only as a fallback. Perfect for static assets: fonts, icons, images that barely change.
- **Network First** — go to the network first, and reach for the cache only when offline. For data that changes often and must be fresh.
- **Stale-While-Revalidate** — serve the cached copy instantly, then quietly fetch a fresh version in the background for next time. The best balance of speed and freshness.
- **Cache Only / Network Only** — edge cases: cache only or network only, with no fallback.

### App Shell

App Shell is a technique where we cache the app's "skeleton" (the empty shell of HTML/CSS/JS: header, menu, frame) so it opens instantly even offline. The actual content (data, articles, products) is then fetched dynamically on top of that skeleton.

## ⚠️ Common pitfalls

- **Worker updates**: a new Service Worker does not switch on immediately — it waits until all tabs with the old version close. The \`skipWaiting()\` (skip the wait) and \`clients.claim()\` (take control right away) methods speed this up, but use them carefully: you can break the session of a user working right at that moment.
- **Cache versioning**: always purge old caches in the \`activate\` stage, otherwise users get stuck on a stale version and never see updates.
- In Angular all of this is configured declaratively via the \`@angular/pwa\` package and the \`ngsw-config.json\` file — no need to hand-write the worker.

## 🎯 Key takeaways

- A Service Worker is a background middleman between app and network: it intercepts \`fetch\`, manages the cache, and provides offline and push. Lifecycle: \`install\` → \`activate\` → \`fetch\`.
- PWA = manifest.json + Service Worker + HTTPS. It gives app-like install, offline, and background sync.
- Core strategies: Cache First (static), Network First (fresh data), Stale-While-Revalidate (best balance).
- PWAs greatly speed up repeat visits (instant load from cache) and make the site resilient to losing the network.`
    }
  },
  {
    id: 'web-030',
    category: 'web-performance',
    level: 'Medium',
    tags: ['debounce', 'throttle', 'events'],
    question: {
      ru: 'В чём разница между debounce и throttle? Когда применять каждый для событий scroll/resize/input?',
      en: 'What is the difference between debounce and throttle? When do you use each for scroll/resize/input events?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Некоторые события в браузере срабатывают как пулемётная очередь: пока пользователь печатает, прокручивает или тянет окно, обработчик может вызываться сотни раз в секунду. Если на каждый вызов делать что-то тяжёлое — страница начнёт тормозить. **Debounce** и **throttle** — два способа «притормозить» эту очередь. Debounce ждёт, пока всё утихнет, и делает одно действие в конце. Throttle пропускает вызовы по расписанию — не чаще раза в N миллисекунд.

### Debounce — «дождись тишины»

Debounce откладывает вызов до тех пор, пока события не **прекратятся** на заданное время. То есть он выполняется **один раз, после** паузы. Аналогия: лифт ждёт, пока люди перестанут заходить, и только потом закрывает двери.

\`\`\`ts
function debounce<T extends (...a: any[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
\`\`\`

Каждый новый вызов сбрасывает предыдущий таймер (\`clearTimeout\`) и заводит новый. Функция сработает, только когда между событиями пройдёт \`ms\` миллисекунд тишины.

**Где применять**: поиск по мере ввода (ждём, пока пользователь допишет слово, и только тогда шлём запрос), автосохранение, валидация формы, пересчёт при \`resize\` после того, как окно перестали тянуть.

### Throttle — «не чаще, чем раз в N мс»

Throttle гарантирует, что функция вызовется **не чаще** одного раза за N миллисекунд, при этом срабатывая регулярно **во время** потока событий. Аналогия: турникет пропускает по одному человеку раз в секунду, сколько бы народу ни толпилось.

\`\`\`ts
function throttle<T extends (...a: any[]) => void>(fn: T, ms: number) {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}
\`\`\`

Функция запоминает время последнего вызова (\`last\`) и пропускает новый, только если прошло достаточно времени.

**Где применять**: обработчики скролла (бесконечная лента, параллакс, «липкая» шапка), отслеживание позиции мыши, аналитика прокрутки.

### Как выбрать

- Нужен результат **после окончания** ввода → **debounce**.
- Нужны регулярные обновления **в процессе** → **throttle**.

### В RxJS и с requestAnimationFrame

В RxJS это готовые операторы: \`debounceTime\`, \`throttleTime\`, а также \`auditTime\` и \`sampleTime\` (варианты выборки по времени).

\`\`\`ts
// RxJS: debounce на поиске, throttle на работе по скроллу
search$.pipe(
  debounceTime(300),         // ждём паузу в наборе текста
  distinctUntilChanged()     // игнорируем повтор того же значения
).subscribe(runQuery);

scroll$.pipe(
  throttleTime(100, asyncScheduler, { leading: true, trailing: true })
).subscribe(updateStickyHeader);
\`\`\`

## ⚠️ Подводные камни

- Для визуальных обновлений лучше синхронизировать работу с кадром экрана через \`requestAnimationFrame\`, а не через фиксированный интервал — так анимация не будет «рваной».
- Добавляй \`{ passive: true }\` к слушателям \`scroll\`/\`touch\`, чтобы браузер не ждал твой обработчик и не блокировал прокрутку.
- Не забывай отписываться от потоков и очищать таймеры при уничтожении компонента — иначе утечка памяти.

## 🎯 Запомни

- **Debounce** — один вызов ПОСЛЕ паузы. Для ввода: поиск, автосохранение, валидация.
- **Throttle** — регулярные вызовы, но не чаще раза в N мс. Для потока: скролл, движение мыши.
- Правило: «после окончания» → debounce; «в процессе» → throttle.
- Для картинки на экране используй \`requestAnimationFrame\`, для скролл-слушателей ставь \`{ passive: true }\` и чисти таймеры при destroy.`,
      en: `## 🧩 In plain words

Some browser events fire like a machine gun: while the user types, scrolls, or drags the window, the handler can run hundreds of times per second. If you do something heavy on every single call, the page starts to lag. **Debounce** and **throttle** are two ways to slow that stream down. Debounce waits until everything goes quiet and does one action at the end. Throttle lets calls through on a schedule — no more than once every N milliseconds.

### Debounce — "wait for silence"

Debounce delays the call until events **stop** for a given time. So it runs **once, after** the pause. Analogy: an elevator waits until people stop stepping in, and only then closes the doors.

\`\`\`ts
function debounce<T extends (...a: any[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
\`\`\`

Each new call cancels the previous timer (\`clearTimeout\`) and starts a fresh one. The function only fires once \`ms\` milliseconds of silence pass between events.

**Use for**: search-as-you-type (wait until the user finishes the word, then send the query), autosave, form validation, \`resize\` recompute after the window stops being dragged.

### Throttle — "at most once per N ms"

Throttle guarantees the function runs **at most** once per N milliseconds, while still firing regularly **during** the event stream. Analogy: a turnstile lets one person through per second, no matter how big the crowd.

\`\`\`ts
function throttle<T extends (...a: any[]) => void>(fn: T, ms: number) {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}
\`\`\`

The function remembers the time of the last call (\`last\`) and lets a new one through only if enough time has passed.

**Use for**: scroll handlers (infinite feed, parallax, sticky header), mouse-position tracking, scroll analytics.

### How to choose

- You need a result **after input ends** → **debounce**.
- You need regular updates **during** the stream → **throttle**.

### In RxJS and with requestAnimationFrame

In RxJS these are ready-made operators: \`debounceTime\`, \`throttleTime\`, plus \`auditTime\` and \`sampleTime\` (time-based sampling variants).

\`\`\`ts
// RxJS: debounce the search, throttle scroll-driven work
search$.pipe(
  debounceTime(300),         // wait for a pause in typing
  distinctUntilChanged()     // ignore a repeat of the same value
).subscribe(runQuery);

scroll$.pipe(
  throttleTime(100, asyncScheduler, { leading: true, trailing: true })
).subscribe(updateStickyHeader);
\`\`\`

## ⚠️ Common pitfalls

- For visual updates, sync the work to the screen frame via \`requestAnimationFrame\` instead of a fixed interval — that keeps animation from looking torn.
- Add \`{ passive: true }\` to \`scroll\`/\`touch\` listeners so the browser does not wait for your handler and does not block scrolling.
- Remember to unsubscribe from streams and clear timers on component destroy — otherwise a memory leak.

## 🎯 Key takeaways

- **Debounce** — one call AFTER a pause. For input: search, autosave, validation.
- **Throttle** — regular calls, but no more than once per N ms. For a stream: scroll, mouse movement.
- Rule of thumb: "after it ends" → debounce; "during" → throttle.
- For on-screen visuals use \`requestAnimationFrame\`; for scroll listeners set \`{ passive: true }\` and clear timers on destroy.`
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
    category: 'web-performance',
    level: 'Hard',
    tags: ['virtual-scrolling', 'lists', 'rendering'],
    question: {
      ru: 'Как работает виртуальный скроллинг? Когда он необходим и какие у него ограничения?',
      en: 'How does virtual scrolling work? When is it necessary and what are its limitations?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь список на 10 000 строк. Даже если на экране помещается только 20 из них, браузер честно создаёт все 10 000 — и начинает задыхаться. Виртуальный скроллинг — это фокус: в реальности отрисовываются только те строки, что сейчас видны, а всё остальное — иллюзия. Пользователю кажется, что список огромный, а браузер держит в памяти лишь горстку элементов.

### Как это работает

Идея простая: рендерить в DOM (структуру страницы, которую браузер реально отрисовывает) только **видимые** элементы плюс небольшой буфер сверху и снизу. Когда ты прокручиваешь, элементы **переиспользуются** (recycling): строка, ушедшая вверх за край экрана, не удаляется, а наполняется новыми данными и появляется снизу.

Чтобы полоса прокрутки (скроллбар) выглядела правильно — как для полного списка — общую высоту имитируют невидимой распоркой-заглушкой (spacer). Она «раздувает» контейнер до нужного размера, хотя настоящих элементов внутри всего два-три десятка.

### Зачем это нужно

- 10 000 строк = 10 000+ узлов в DOM → дорогой layout (расчёт расположения), paint (отрисовка), большой расход памяти и медленный change detection (проверка изменений во фреймворке).
- С виртуализацией в DOM всегда живёт всего ~20–40 узлов, **независимо** от размера данных. Первичный рендер, память и реактивность остаются постоянными, сколько бы тысяч элементов ни было.

### Реализация в Angular (CDK)

Angular CDK (Component Dev Kit — набор готовых инструментов) даёт компонент из коробки:

\`\`\`html
<cdk-virtual-scroll-viewport itemSize="48" class="viewport">
  <div *cdkVirtualFor="let item of items" class="row">
    {{ item.name }}
  </div>
</cdk-virtual-scroll-viewport>
\`\`\`

Здесь \`itemSize="48"\` — высота одной строки в пикселях. Зная её, viewport (видимая область) сам вычисляет, сколько строк помещается на экране и какие именно нужно отрисовать. Директива \`*cdkVirtualFor\` работает как обычный \`*ngFor\`, но рисует только видимую часть.

## ⚠️ Подводные камни

- **Переменная высота строк** — сложно. Фиксированный \`itemSize\` не подходит, если строки разной высоты; нужна autosize-стратегия (авторасчёт высоты), а она дороже и менее точна.
- **Ctrl+F / поиск по странице** не находит невидимые элементы — их просто нет в DOM.
- **SEO**: контент вне DOM не индексируется поисковиками. Не годится для публичных страниц без SSR (серверного рендеринга).
- **Доступность (accessibility)**: скринридеры и навигация по \`Tab\` видят только отрисованные узлы. Нужно вручную проставлять атрибуты \`aria-rowcount\` (общее число строк) и \`aria-setsize\` (размер набора), чтобы вспомогательные технологии понимали реальный размер списка.
- **Сохранение позиции скролла** и скролл-якоря требуют аккуратной обработки, иначе список «прыгает».

### Альтернативы

Не всегда нужна тяжёлая виртуализация. Для умеренных списков часто хватает CSS-свойства \`content-visibility: auto\` (браузер сам пропускает отрисовку того, что за экраном) или обычной пагинации (разбивки на страницы). Виртуализация оправдана, когда набор действительно большой — тысячи и более элементов — и строки тяжёлые.

## 🎯 Запомни

- Виртуальный скроллинг рисует только видимые строки (+буфер), переиспользует их при прокрутке, а полную высоту имитирует распоркой.
- Главный выигрыш: в DOM всегда ~20–40 узлов вместо тысяч → постоянная память и скорость рендера.
- Цена: сложность с переменной высотой, поломка Ctrl+F, проблемы с SEO и доступностью.
- Нужна при действительно больших списках; для маленьких хватит \`content-visibility: auto\` или пагинации.`,
      en: `## 🧩 In plain words

Picture a list of 10,000 rows. Even if only 20 fit on screen, the browser dutifully creates all 10,000 — and starts to choke. Virtual scrolling is a trick: in reality only the rows currently visible are rendered, and everything else is an illusion. The user thinks the list is huge, while the browser keeps only a handful of elements in memory.

### How it works

The idea is simple: render only the **visible** items in the DOM (the page structure the browser actually paints) plus a small buffer above and below. As you scroll, items are **recycled**: a row that slides off the top isn't deleted — it's refilled with new data and reappears at the bottom.

To make the scrollbar look correct — as if for the full list — the total height is simulated with an invisible spacer. It "inflates" the container to the right size, even though there are only two or three dozen real elements inside.

### Why it's needed

- 10,000 rows = 10,000+ DOM nodes → expensive layout (position calculation), paint (drawing), heavy memory use, and slow change detection (the framework's check for changes).
- With virtualization the DOM always holds only ~20–40 nodes, **regardless** of data size. Initial render, memory, and reactivity stay constant no matter how many thousands of items there are.

### Implementation in Angular (CDK)

The Angular CDK (Component Dev Kit — a toolkit of ready-made building blocks) provides a component out of the box:

\`\`\`html
<cdk-virtual-scroll-viewport itemSize="48" class="viewport">
  <div *cdkVirtualFor="let item of items" class="row">
    {{ item.name }}
  </div>
</cdk-virtual-scroll-viewport>
\`\`\`

Here \`itemSize="48"\` is the height of one row in pixels. Knowing it, the viewport (visible area) computes how many rows fit on screen and exactly which ones to render. The \`*cdkVirtualFor\` directive works like a normal \`*ngFor\`, but only draws the visible slice.

## ⚠️ Common pitfalls

- **Variable row height** is hard. A fixed \`itemSize\` doesn't fit when rows differ in height; you need an autosize strategy (auto-measured height), which is costlier and less accurate.
- **Ctrl+F / in-page search** doesn't find off-screen items — they simply aren't in the DOM.
- **SEO**: content outside the DOM isn't indexed by search engines. Unsuitable for public pages without SSR (server-side rendering).
- **Accessibility**: screen readers and \`Tab\` navigation see only rendered nodes. You must set \`aria-rowcount\` (total number of rows) and \`aria-setsize\` (set size) attributes manually so assistive tech understands the real list size.
- **Scroll position restoration** and scroll anchoring need careful handling, or the list "jumps."

### Alternatives

You don't always need heavy virtualization. For moderate lists, the CSS property \`content-visibility: auto\` (the browser itself skips painting what's off-screen) or plain pagination (splitting into pages) often suffices. Virtualization pays off when the set is truly large — thousands or more items — and the rows are heavy.

## 🎯 Key takeaways

- Virtual scrolling renders only the visible rows (+buffer), recycles them while scrolling, and fakes the full height with a spacer.
- The main win: the DOM always holds ~20–40 nodes instead of thousands → constant memory and render speed.
- The cost: trouble with variable height, broken Ctrl+F, and SEO and accessibility issues.
- Use it for truly large lists; for small ones \`content-visibility: auto\` or pagination is enough.`
    }
  },
  {
    id: 'web-032',
    category: 'web-performance',
    level: 'Hard',
    tags: ['requestanimationframe', 'requestidlecallback', 'scheduling'],
    question: {
      ru: 'В чём разница между requestAnimationFrame и requestIdleCallback? Когда использовать каждый?',
      en: 'What is the difference between requestAnimationFrame and requestIdleCallback? When do you use each?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

У браузера есть два способа сказать «сделай это позже». Первый — \`requestAnimationFrame\`: «сделай прямо перед тем, как перерисуешь картинку на экране». Он для анимаций и всего визуального. Второй — \`requestIdleCallback\`: «сделай, когда будешь свободен и тебе нечем заняться». Он для фоновой мелочи, которую не жалко отложить. Первый привязан к кадрам экрана, второй — к моментам простоя.

### requestAnimationFrame (rAF)

Колбэк (переданная функция) вызывается **прямо перед следующей перерисовкой** экрана, синхронно с частотой обновления монитора — обычно 60 Гц, то есть каждые ~16.7 мс. Это идеальный момент для **визуальных** обновлений: анимаций, чтения и записи DOM в правильной фазе кадра.

\`\`\`ts
function animate(time: number) {
  el.style.transform = \`translateX(\${(time / 10) % 200}px)\`;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
\`\`\`

Функция двигает элемент и тут же просит браузер вызвать себя перед следующим кадром — получается плавный цикл анимации.

**Плюсы**: в фоновых вкладках не выполняется (экономит батарею), всегда совпадает с кадром → нет «рваной», дёрганой анимации.

### requestIdleCallback (rIC)

Колбэк выполняется, когда браузер **простаивает** — в конце кадра, если осталось свободное время. У него есть объект \`deadline\` с методом \`timeRemaining()\`, который говорит, сколько миллисекунд ещё можно спокойно поработать. Подходит для **некритичной фоновой** работы: аналитики, предзагрузки, чистки кэша, ленивой инициализации.

\`\`\`ts
requestIdleCallback((deadline) => {
  while (deadline.timeRemaining() > 0 && tasks.length) {
    runTask(tasks.shift());
  }
});
\`\`\`

Пока есть свободное время в кадре и остались задачи — выполняем их по одной, не мешая браузеру.

### Когда что использовать

- **Анимация, скролл-эффекты, чтение DOM по кадрам** → \`requestAnimationFrame\`.
- **Фоновая некритичная работа, предзагрузка** → \`requestIdleCallback\`.
- **Дробление одной длинной задачи ради INP** → \`scheduler.postTask\` или \`scheduler.yield\` (более новые API планировщика).

### Связь с производительностью

\`rAF\` удерживает анимации в бюджете кадра (~16.7 мс), поэтому картинка не «дёргается». \`rIC\` выносит лишнюю работу из критического пути, улучшая метрики INP (Interaction to Next Paint — отзывчивость на действия) и TBT (Total Blocking Time — суммарное время блокировки).

## ⚠️ Подводные камни

- \`requestIdleCallback\` может долго не вызываться, если страница постоянно занята. Задавай ему параметр \`{ timeout }\` как страховку — тогда он сработает не позже указанного срока, даже если простоя не было.
- Safari исторически плохо поддерживал \`rIC\` — проверяй доступность или используй полифилл/\`setTimeout\` как запасной вариант.
- Не делай тяжёлых вычислений внутри \`rAF\` — они съедят бюджет кадра и вызовут пропуски кадров (дропы), анимация начнёт тормозить.

## 🎯 Запомни

- \`rAF\` — «прямо перед перерисовкой», для визуального: анимации, DOM по кадрам. Синхронизирован с частотой экрана.
- \`rIC\` — «когда браузер свободен», для фоновой мелочи: аналитика, предзагрузка. Обязательно ставь \`{ timeout }\`.
- Не грузи тяжёлым \`rAF\`; выноси некритичное в \`rIC\`, а длинные задачи дроби через \`scheduler.postTask\`/\`yield\`.`,
      en: `## 🧩 In plain words

The browser has two ways to say "do this later." The first is \`requestAnimationFrame\`: "do it right before you repaint the screen." That one is for animations and anything visual. The second is \`requestIdleCallback\`: "do it when you're free and have nothing else on." That one is for background odds and ends you're happy to postpone. The first is tied to screen frames, the second to moments of idleness.

### requestAnimationFrame (rAF)

The callback (the function you pass in) runs **right before the next repaint** of the screen, in sync with the monitor's refresh rate — usually 60 Hz, i.e. every ~16.7 ms. This is the ideal moment for **visual** updates: animations, reading and writing the DOM in the right frame phase.

\`\`\`ts
function animate(time: number) {
  el.style.transform = \`translateX(\${(time / 10) % 200}px)\`;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
\`\`\`

The function moves the element and immediately asks the browser to call it again before the next frame — a smooth animation loop.

**Pros**: it doesn't run in background tabs (saves battery), and it always aligns with the frame → no torn, jittery animation.

### requestIdleCallback (rIC)

The callback runs when the browser is **idle** — at the end of a frame, if there's spare time left. It gets a \`deadline\` object with a \`timeRemaining()\` method that tells you how many milliseconds you can safely keep working. It suits **non-critical background** work: analytics, prefetching, cache cleanup, lazy initialization.

\`\`\`ts
requestIdleCallback((deadline) => {
  while (deadline.timeRemaining() > 0 && tasks.length) {
    runTask(tasks.shift());
  }
});
\`\`\`

While there's spare time in the frame and tasks remain, we run them one by one without getting in the browser's way.

### When to use which

- **Animation, scroll effects, per-frame DOM reads** → \`requestAnimationFrame\`.
- **Background non-critical work, prefetching** → \`requestIdleCallback\`.
- **Splitting one long task for INP** → \`scheduler.postTask\` or \`scheduler.yield\` (newer scheduler APIs).

### Performance link

\`rAF\` keeps animations within the frame budget (~16.7 ms), so the picture doesn't stutter. \`rIC\` moves extra work off the critical path, improving INP (Interaction to Next Paint — responsiveness to actions) and TBT (Total Blocking Time).

## ⚠️ Common pitfalls

- \`requestIdleCallback\` may not fire for a long time if the page stays busy. Pass it a \`{ timeout }\` option as a safeguard — then it runs no later than the given deadline, even with no idle time.
- Safari historically had weak support for \`rIC\` — check availability or use a polyfill/\`setTimeout\` fallback.
- Don't run heavy computation inside \`rAF\` — it eats the frame budget and causes dropped frames, making the animation lag.

## 🎯 Key takeaways

- \`rAF\` — "right before repaint," for visuals: animations, per-frame DOM. Synced to the screen refresh rate.
- \`rIC\` — "when the browser is free," for background odds and ends: analytics, prefetching. Always set \`{ timeout }\`.
- Don't load \`rAF\` with heavy work; push non-critical work to \`rIC\`, and split long tasks via \`scheduler.postTask\`/\`yield\`.`
    }
  },
  {
    id: 'web-033',
    category: 'web-performance',
    level: 'Medium',
    tags: ['intersection-observer', 'lazy-loading', 'api'],
    question: {
      ru: 'Как работает IntersectionObserver и почему он лучше слушателей scroll для отслеживания видимости?',
      en: 'How does IntersectionObserver work and why is it better than scroll listeners for visibility tracking?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь охранника, который стоит у витрины и сам говорит тебе: «Вот этот товар только что появился в поле зрения покупателя». Тебе не нужно каждую секунду самому подбегать к окну и проверять. \`IntersectionObserver\` — это такой встроенный в браузер «охранник»: ты просишь его следить за элементом, и он сам сообщает, когда элемент въехал в видимую область экрана. Раньше для этого приходилось слушать событие прокрутки (scroll) и вручную считать координаты — это дорого и дёргано.

### Что это за API

\`IntersectionObserver\` — это встроенный браузерный инструмент, который **асинхронно** (то есть не мгновенно, а когда браузеру удобно) сообщает, когда наблюдаемый элемент пересекает **viewport** (видимую область окна) или заданный контейнер-\`root\`, достигая нужного **порога** видимости. Ключевая деталь: браузер делает эти вычисления **вне главного потока** (main thread — там, где крутится весь твой JS и отрисовка), поэтому это не тормозит страницу и не требует постоянного «опроса» в цикле.

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

Что здесь происходит: мы создаём наблюдателя и передаём ему **колбэк** — функцию, которую браузер вызовет при изменении видимости. Внутри мы перебираем \`entries\` (записи о каждом отслеживаемом элементе). Свойство \`isIntersecting\` = \`true\` означает «элемент попал в зону видимости» — тогда мы грузим картинку и вызываем \`unobserve\`, чтобы перестать следить (нам нужно загрузить один раз). В конце \`observe(el)\` подключает наблюдение к каждому элементу.

### Почему он лучше слушателей scroll

- **scroll-событие** срабатывает десятки раз в секунду. Внутри обработчика обычно вызывают \`getBoundingClientRect()\` (метод, который спрашивает у браузера точные координаты элемента). Каждый такой вызов заставляет браузер пересчитать раскладку страницы — это называется **forced reflow** (принудительный пересчёт геометрии). На каждом кадре это грузит процессор и вызывает подтормаживания.
- **IntersectionObserver** считает пересечения нативно (силами самого браузера), группирует их (**батчит**) и вызывает колбэк только когда состояние реально изменилось. Итог — дёшево и плавно.

### Параметры настройки

- \`root\` — контейнер, относительно которого считается видимость. По умолчанию это viewport (всё окно).
- \`rootMargin\` — расширяет или сужает зону срабатывания, как поля вокруг области. Например, \`'200px'\` заставит сработать за 200 пикселей **до** того, как элемент реально появится — удобно для предзагрузки заранее.
- \`threshold\` — доля видимости от 0 до 1, при которой сработает колбэк (0.1 = «видно хотя бы 10% элемента»). Можно передать массив порогов, чтобы получать уведомления на нескольких уровнях.

### Где применяют

- Ленивая загрузка (**lazy loading**) картинок и компонентов — грузим только то, что вот-вот увидят.
- Бесконечная прокрутка (**infinite scroll**) — ставим невидимый элемент-«маячок» (sentinel) в конце списка и подгружаем данные, когда он появляется.
- Аналитика показов (**impression tracking**) — считаем, что баннер реально увидели.
- Анимации появления, подсветка активной секции в оглавлении.

## ⚠️ Подводные камни

- Колбэк асинхронный — не рассчитывай, что он сработает мгновенно в тот же миг.
- Не забывай вызывать \`unobserve\` (для одного элемента) или \`disconnect\` (для всего наблюдателя) при уничтожении компонента — иначе получишь утечку памяти.
- Для непрерывного отслеживания процента видимости передавай массив значений в \`threshold\`.

## 🎯 Запомни

- \`IntersectionObserver\` сам сообщает о попадании элемента в видимую зону — не нужно опрашивать в цикле.
- Он работает вне главного потока и не вызывает forced reflow, поэтому дешевле и плавнее scroll-слушателей.
- Настраивается тремя параметрами: \`root\`, \`rootMargin\` (предзагрузка заранее) и \`threshold\` (порог видимости).
- Всегда отключай наблюдение (\`unobserve\`/\`disconnect\`), чтобы не текла память.`,
      en: `## 🧩 In plain words

Imagine a guard standing by a shop window who tells you on his own: "This item just came into the customer's view." You don't have to run to the window every second to check yourself. \`IntersectionObserver\` is exactly that kind of built-in browser "guard": you ask it to watch an element, and it tells you when that element scrolls into the visible part of the screen. Previously you had to listen to the scroll event and calculate coordinates by hand — which is expensive and janky.

### What this API is

\`IntersectionObserver\` is a built-in browser tool that **asynchronously** (not instantly, but when the browser finds it convenient) reports when a watched element intersects the **viewport** (the visible area of the window) or a given \`root\` container, reaching a set **threshold** of visibility. The key detail: the browser does these calculations **off the main thread** (the thread where all your JS and rendering run), so it doesn't slow the page down and doesn't need constant polling in a loop.

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

What happens here: we create an observer and hand it a **callback** — a function the browser calls when visibility changes. Inside, we loop over \`entries\` (records about each watched element). The \`isIntersecting\` property being \`true\` means "the element entered the visible zone" — so we load the image and call \`unobserve\` to stop watching (we only need to load once). Finally, \`observe(el)\` attaches the observer to each element.

### Why it beats scroll listeners

- **The scroll event** fires dozens of times per second. Inside the handler you typically call \`getBoundingClientRect()\` (a method that asks the browser for the element's exact coordinates). Each such call forces the browser to recompute the page layout — this is called a **forced reflow**. On every frame this loads the CPU and causes jank.
- **IntersectionObserver** computes intersections natively (by the browser itself), groups them (**batches** them), and calls back only when the state actually changed. The result: cheap and smooth.

### Configuration options

- \`root\` — the container against which visibility is measured. Defaults to the viewport (the whole window).
- \`rootMargin\` — expands or shrinks the trigger zone, like a margin around the area. For example, \`'200px'\` makes it fire 200 pixels **before** the element actually appears — handy for prefetching early.
- \`threshold\` — the visibility fraction from 0 to 1 at which the callback fires (0.1 = "at least 10% of the element is visible"). You can pass an array of thresholds to get notified at several levels.

### Where it's used

- **Lazy loading** images and components — load only what's about to be seen.
- **Infinite scroll** — place an invisible "sentinel" element at the end of the list and load more data when it appears.
- **Impression tracking** — count that a banner was actually seen.
- Reveal animations, highlighting the active section in a table of contents.

## ⚠️ Common pitfalls

- The callback is asynchronous — don't rely on it firing instantly at the same moment.
- Don't forget to call \`unobserve\` (for one element) or \`disconnect\` (for the whole observer) when a component is destroyed — otherwise you get a memory leak.
- To continuously track the visibility percentage, pass an array of values in \`threshold\`.

## 🎯 Key takeaways

- \`IntersectionObserver\` tells you on its own when an element enters the visible zone — no need to poll in a loop.
- It runs off the main thread and causes no forced reflow, so it's cheaper and smoother than scroll listeners.
- It's tuned with three options: \`root\`, \`rootMargin\` (prefetch early), and \`threshold\` (visibility level).
- Always stop observing (\`unobserve\`/\`disconnect\`) to avoid memory leaks.`
    }
  },
  {
    id: 'web-034',
    category: 'web-performance',
    level: 'Expert',
    tags: ['memory-leaks', 'detached-dom', 'spa'],
    question: {
      ru: 'Какие типичные причины утечек памяти в SPA? Как их обнаружить и предотвратить?',
      en: 'What are common causes of memory leaks in SPAs? How do you detect and prevent them?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Утечка памяти — это как если ты закончил пользоваться комнатой и вышел, но забыл выключить свет и оставил дверь на цепочке, так что уборщик не может её убрать. В браузере «уборщик» — это **сборщик мусора** (garbage collector, GC): он освобождает память под объекты, на которые больше никто не ссылается. Утечка происходит, когда какая-то забытая ссылка держит объект живым, хотя он уже не нужен. В **SPA** (Single Page Application — приложение, которое не перезагружает страницу целиком, а перерисовывает куски) это особенно опасно: страница живёт часами, и мусор накапливается.

### 1. Неотписанные подписки и слушатели

Подписки RxJS, обработчики через \`addEventListener\`, интервалы \`setInterval\` продолжают жить после того, как компонент уничтожен, и держат ссылку на него. Компонента «нет», но память под него не освобождается.

\`\`\`ts
// Angular: автоотписка
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.stream$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(/* ... */);
}
\`\`\`

Здесь \`takeUntilDestroyed(this.destroyRef)\` автоматически завершает подписку, когда компонент уничтожается — ручной отписки не требуется.

### 2. Detached DOM (оторванные узлы)

Ты удалил элемент из дерева страницы, но JS-переменная или **замыкание** (closure — функция, которая «запомнила» ссылку на переменную) всё ещё на него ссылается. Из-за этой ссылки узел и всё его поддерево не собираются сборщиком мусора и висят в памяти невидимо.

### 3. Замыкания и глобальные ссылки

Долгоживущие объекты — синглтон-сервисы (существующие в одном экземпляре на всё приложение), кэши, статические \`Map\` — накапливают записи и через них держат старые компоненты, которые давно пора удалить.

### 4. Таймеры и observers

\`setInterval\`, а также \`IntersectionObserver\`, \`ResizeObserver\`, \`MutationObserver\` (наблюдатели за видимостью, размером и изменениями DOM), если их не остановить через \`clearInterval\`/\`disconnect\`, продолжают работать и держать ссылки.

### 5. Сторонние библиотеки

Чарты, карты, редакторы часто создают много внутренних объектов и требуют ручного вызова \`destroy()\` при удалении — иначе всё это остаётся в памяти.

### Как обнаружить

- **Chrome DevTools → Memory → Heap snapshot** (снимок кучи): фильтр \`Detached\` покажет оторванные DOM-узлы, которые не должны были остаться.
- **Allocation timeline / Performance Monitor**: если при повторяющихся навигациях растут «JS heap size» (размер памяти под JS) и «DOM Nodes» (число узлов) — это утечка.
- Сделай снимок, выполни один и тот же сценарий N раз, потом сравни снимки (comparison view). Объекты, число которых растёт с каждым повтором, — главные подозреваемые.

### Как предотвратить

- Всегда очищай подписки, таймеры и слушателей в \`ngOnDestroy\` или через \`destroyRef\`.
- Используй \`WeakMap\`/\`WeakRef\` для кэшей, привязанных к DOM-узлам — «слабые» ссылки не мешают сборщику мусора удалить узел.
- Применяй \`AbortController\` для \`fetch\` и \`addEventListener\` (передав \`{ signal }\`) — один вызов \`abort()\` отменяет всё разом.
- В Angular стратегия OnPush вместе с signals уменьшает число висящих ссылок.

\`\`\`ts
// Привязываем слушателей, таймеры и запросы к времени жизни компонента
@Component({ /* ... */ })
export class WidgetComponent implements OnDestroy {
  private readonly ac = new AbortController();

  ngOnInit() {
    window.addEventListener('resize', this.onResize, { signal: this.ac.signal });
    fetch('/api/data', { signal: this.ac.signal });
  }

  ngOnDestroy() {
    this.ac.abort(); // убирает слушателя + отменяет fetch одним махом
  }

  private onResize = () => { /* ... */ };
}
\`\`\`

Идея кода: мы создаём один \`AbortController\` и передаём его \`signal\` и слушателю, и запросу \`fetch\`. Когда компонент уничтожается, один вызов \`this.ac.abort()\` в \`ngOnDestroy\` отписывает слушателя и отменяет запрос — не нужно чистить каждый по отдельности.

## ⚠️ Подводные камни

- Отсутствие отписки — причина №1: подписка «переживает» компонент и тащит его за собой.
- Обычные \`Map\`/массивы-кэши растут бесконечно, если из них не удалять старые записи.
- Забытый \`destroy()\` у сторонней библиотеки не виден в коде, но течёт в памяти.

## 🎯 Запомни

- Утечка = забытая ссылка не даёт сборщику мусора освободить объект.
- Топ-источники в SPA: неотписанные подписки/слушатели, detached DOM, растущие кэши, таймеры и observers, сторонние библиотеки.
- Ищи снимками кучи в DevTools: сравни снимки до и после повторов сценария — растущее число объектов выдаёт утечку.
- Профилактика дешевле отладки: чисти всё в \`ngOnDestroy\` и связывай ресурсы с \`AbortController\`.`,
      en: `## 🧩 In plain words

A memory leak is like finishing with a room and walking out, but forgetting to turn off the light and leaving the door on the chain, so the cleaner can't tidy it. In the browser the "cleaner" is the **garbage collector** (GC): it frees the memory of objects nothing references anymore. A leak happens when some forgotten reference keeps an object alive even though it's no longer needed. In an **SPA** (Single Page Application — an app that doesn't reload the whole page but re-renders pieces), this is especially dangerous: the page lives for hours and garbage piles up.

### 1. Un-unsubscribed subscriptions and listeners

RxJS subscriptions, handlers added via \`addEventListener\`, and \`setInterval\` timers keep living after a component is destroyed and hold a reference to it. The component is "gone," but its memory isn't freed.

\`\`\`ts
// Angular: auto-unsubscribe
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.stream$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(/* ... */);
}
\`\`\`

Here \`takeUntilDestroyed(this.destroyRef)\` automatically ends the subscription when the component is destroyed — no manual unsubscribe needed.

### 2. Detached DOM

You removed an element from the page tree, but a JS variable or a **closure** (a function that "remembered" a reference to a variable) still references it. Because of that reference, the node and its whole subtree are not garbage-collected and sit in memory invisibly.

### 3. Closures and global references

Long-lived objects — singleton services (a single instance for the whole app), caches, static \`Map\`s — accumulate entries and through them hold onto old components that should have been removed long ago.

### 4. Timers and observers

\`setInterval\`, as well as \`IntersectionObserver\`, \`ResizeObserver\`, \`MutationObserver\` (observers of visibility, size, and DOM changes), if not stopped via \`clearInterval\`/\`disconnect\`, keep running and holding references.

### 5. Third-party libraries

Charts, maps, and editors often create many internal objects and require a manual \`destroy()\` call on removal — otherwise all of it stays in memory.

### How to detect

- **Chrome DevTools → Memory → Heap snapshot**: the \`Detached\` filter shows detached DOM nodes that shouldn't have remained.
- **Allocation timeline / Performance Monitor**: if "JS heap size" (JS memory) and "DOM Nodes" (node count) grow over repeated navigations — that's a leak.
- Take a snapshot, run the same scenario N times, then compare snapshots (comparison view). Objects whose count grows with each repeat are the prime suspects.

### How to prevent

- Always clean up subscriptions, timers, and listeners in \`ngOnDestroy\` or via \`destroyRef\`.
- Use \`WeakMap\`/\`WeakRef\` for caches keyed by DOM nodes — "weak" references don't stop the GC from removing a node.
- Use \`AbortController\` for \`fetch\` and \`addEventListener\` (passing \`{ signal }\`) — one \`abort()\` call cancels everything at once.
- In Angular, the OnPush strategy together with signals reduces the number of dangling references.

\`\`\`ts
// Tie listeners, timers and fetches to component lifetime
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
}
\`\`\`

The idea: we create one \`AbortController\` and pass its \`signal\` to both the listener and the \`fetch\`. When the component is destroyed, a single \`this.ac.abort()\` in \`ngOnDestroy\` unsubscribes the listener and cancels the request — no need to clean each one separately.

## ⚠️ Common pitfalls

- Missing unsubscribe is cause #1: the subscription "outlives" the component and drags it along.
- Plain \`Map\`/array caches grow forever if you never remove stale entries.
- A forgotten \`destroy()\` on a third-party library isn't visible in code but leaks in memory.

## 🎯 Key takeaways

- A leak = a forgotten reference stops the GC from freeing an object.
- Top SPA sources: un-unsubscribed subscriptions/listeners, detached DOM, growing caches, timers and observers, third-party libraries.
- Hunt with heap snapshots in DevTools: compare snapshots before and after repeating a scenario — a growing object count reveals the leak.
- Prevention is cheaper than debugging: clean up in \`ngOnDestroy\` and tie resources to an \`AbortController\`.`
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
    category: 'web-performance',
    level: 'Hard',
    tags: ['cdn', 'http2', 'network'],
    question: {
      ru: 'Как CDN, HTTP/2 и HTTP/3 влияют на производительность загрузки? Что такое connection multiplexing?',
      en: 'How do CDN, HTTP/2, and HTTP/3 affect loading performance? What is connection multiplexing?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что ты заказываешь пиццу. **CDN** — это когда у сети открыли филиал в твоём районе, и пицца едет пару минут, а не через полстраны. **HTTP/2 и HTTP/3** — это про то, как курьер везёт заказы: раньше он мог везти только по одной коробке за раз и ждать возврата, а теперь загружает в машину сразу много коробок и едет параллельно. **Мультиплексирование** (connection multiplexing) — это как раз «много коробок в одной машине»: много запросов по одному соединению одновременно.

### CDN — что это и зачем

**CDN** (Content Delivery Network — сеть доставки контента) — это географически распределённые **edge-серверы** (пограничные серверы, стоящие близко к пользователям), которые кэшируют контент рядом с человеком. За счёт близости снижается **RTT** (Round-Trip Time — время «туда-обратно» до сервера) и **TTFB** (Time To First Byte — время до первого байта ответа). Заодно CDN разгружает **origin** (твой основной сервер), поглощает всплески трафика и атаки DDoS. Современные CDN ещё и сжимают файлы, оптимизируют картинки и умеют edge-вычисления (запуск кода прямо на пограничных серверах).

### HTTP/1.1 — в чём проблема

- **Head-of-line blocking** (блокировка начала очереди): на одном соединении запросы идут строго по очереди — пока не ответили на первый, следующие ждут.
- Браузер открывает всего около 6 соединений на один домен. Отсюда старые хаки: **domain sharding** (раскидать ресурсы по нескольким поддоменам, чтобы обойти лимит) и **спрайты** (склеить много иконок в одну картинку).

### HTTP/2

- **Мультиплексирование**: множество запросов и ответов идут параллельно по **одному** TCP-соединению, разбитые на **frames** (кадры) и **потоки** (streams). Domain sharding и склейка файлов больше не нужны.
- **Сжатие заголовков (HPACK)**, **server push** (сервер сам шлёт ресурсы наперёд — сейчас почти не используется), приоритизация потоков.
- Ограничение: блокировка начала очереди остаётся на уровне **TCP** — если потерялся один пакет, TCP тормозит **все** потоки, пока его не переотправят.

### HTTP/3 (QUIC)

- Работает поверх **UDP** плюс протокол **QUIC** и решает TCP-level блокировку: потеря пакета в одном потоке не блокирует другие.
- Быстрее устанавливает соединение (**0-RTT/1-RTT** — почти или совсем без лишних кругов на рукопожатие, TLS-шифрование встроено), лучше держится на нестабильных мобильных сетях и умеет бесшовно **мигрировать** соединение при смене сети (например, Wi-Fi → мобильный интернет) без обрыва.

### Что такое connection multiplexing

Это передача множества независимых логических потоков по **одному** физическому соединению. Смысл — не платить заново за установку соединения на каждый запрос и не упираться в лимит параллельных соединений. Одно соединение, много «разговоров» одновременно.

### Практический эффект

- На HTTP/2 и HTTP/3 мелкая разбивка бандла на много чанков становится **дешевле** — нет штрафа за количество запросов, зато лучше кэширование каждого чанка по отдельности (обновил один — остальные остались в кэше).
- Связка CDN + HTTP/3 заметно улучшает TTFB и **LCP** (Largest Contentful Paint — момент отрисовки самого крупного элемента), особенно на мобильных и в удалённых регионах.

## ⚠️ Подводные камни

- Мультиплексирование HTTP/2 не спасает от TCP-блокировки при потере пакетов — это лечит только HTTP/3.
- Старые хаки под HTTP/1.1 (domain sharding, спрайты, конкатенация всего в один файл) на HTTP/2+ уже вредят, а не помогают.
- Server push из HTTP/2 практически мёртв — не закладывайся на него.

## 🎯 Запомни

- CDN приближает контент к пользователю и режет RTT/TTFB.
- Мультиплексирование = много параллельных запросов по одному соединению; убирает лимит ~6 соединений и HoL-blocking уровня HTTP.
- HTTP/2 всё ещё страдает от TCP-блокировки при потере пакетов; HTTP/3 (QUIC поверх UDP) это чинит и быстрее коннектится.
- На HTTP/2/3 много мелких чанков — это нормально и даже полезно для кэша.`,
      en: `## 🧩 In plain words

Imagine ordering pizza. A **CDN** is like the chain opening a branch in your neighborhood, so the pizza travels a couple of minutes instead of across the country. **HTTP/2 and HTTP/3** are about how the courier carries orders: before, they could carry only one box at a time and had to wait for it to come back; now they load many boxes into the car at once and drive in parallel. **Connection multiplexing** is exactly that "many boxes in one car": many requests over one connection at the same time.

### CDN — what it is and why

A **CDN** (Content Delivery Network) is a set of geographically distributed **edge servers** (border servers placed close to users) that cache content near the person. Thanks to proximity, it lowers **RTT** (Round-Trip Time — the time to go to the server and back) and **TTFB** (Time To First Byte — the time until the first byte of the response). It also offloads the **origin** (your main server), absorbs traffic spikes, and mitigates DDoS attacks. Modern CDNs additionally compress files, optimize images, and can do edge computing (running code right on the border servers).

### HTTP/1.1 — the problem

- **Head-of-line blocking**: on a single connection, requests go strictly in order — until the first is answered, the rest wait.
- The browser opens only about 6 connections per domain. Hence the old hacks: **domain sharding** (spreading resources across several subdomains to dodge the limit) and **sprites** (gluing many icons into one image).

### HTTP/2

- **Multiplexing**: many requests and responses go in parallel over **one** TCP connection, split into **frames** and **streams**. Domain sharding and file concatenation are no longer needed.
- **Header compression (HPACK)**, **server push** (the server sends resources ahead on its own — now rarely used), stream prioritization.
- Limitation: head-of-line blocking remains at the **TCP** level — if a single packet is lost, TCP stalls **all** streams until it's retransmitted.

### HTTP/3 (QUIC)

- Runs over **UDP** plus the **QUIC** protocol and solves the TCP-level blocking: a packet loss in one stream does not block the others.
- Sets up connections faster (**0-RTT/1-RTT** — almost or entirely without extra round trips for the handshake, TLS encryption built in), holds up better on unstable mobile networks, and can seamlessly **migrate** a connection when the network changes (e.g. Wi-Fi → mobile data) without dropping.

### What connection multiplexing is

It's carrying many independent logical streams over **one** physical connection. The point is not to pay for connection setup again on every request and not to hit the parallel-connection limit. One connection, many "conversations" at once.

### Practical effect

- On HTTP/2 and HTTP/3, splitting a bundle into many fine-grained chunks becomes **cheaper** — there's no penalty per request, and caching each chunk separately gets better (update one, the rest stay cached).
- The combo CDN + HTTP/3 noticeably improves TTFB and **LCP** (Largest Contentful Paint — the moment the largest element is painted), especially on mobile and in remote regions.

## ⚠️ Common pitfalls

- HTTP/2 multiplexing doesn't save you from TCP blocking on packet loss — only HTTP/3 fixes that.
- Old HTTP/1.1 hacks (domain sharding, sprites, concatenating everything into one file) actually hurt on HTTP/2+ rather than help.
- HTTP/2 server push is practically dead — don't rely on it.

## 🎯 Key takeaways

- A CDN brings content closer to the user and cuts RTT/TTFB.
- Multiplexing = many parallel requests over one connection; it removes the ~6-connection limit and HTTP-level HoL blocking.
- HTTP/2 still suffers from TCP blocking on packet loss; HTTP/3 (QUIC over UDP) fixes that and connects faster.
- On HTTP/2/3, many small chunks are fine and even good for caching.`
    }
  },
  {
    id: 'web-036',
    category: 'web-performance',
    level: 'Expert',
    tags: ['change-detection', 'angular', 'performance'],
    question: {
      ru: 'Как стратегия OnPush, zoneless и signals в Angular влияют на производительность рендеринга?',
      en: 'How do OnPush, zoneless, and signals in Angular affect rendering performance?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь учителя, который после каждого шороха в классе идёт и проверяет тетрадь у **каждого** ученика — вдруг кто-то что-то изменил. Это Angular по умолчанию: любое событие (клик, таймер, ответ сервера) заставляет его перепроверить весь класс. **OnPush** — это правило «проверяй только тех, у кого точно что-то поменялось». **Signals** — это когда ученик сам поднимает руку и говорит «у меня изменилось», и учитель идёт только к нему. **Zoneless** — это увольнение того самого «сторожа», который дёргал учителя на каждый шорох.

### Change Detection в Angular

**Change Detection (CD)** — это процесс, которым Angular сверяет данные с тем, что показано на экране, и обновляет разметку. По умолчанию Angular использует **Zone.js** — библиотеку, которая перехватывает все асинхронные операции (события, таймеры, XHR-запросы) и после каждой запускает CD по **всему** дереву компонентов. На больших приложениях это дорого: перепроверяется куча компонентов, которые не менялись.

### OnPush

Стратегия \`ChangeDetectionStrategy.OnPush\` говорит Angular проверять компонент только когда:
- изменилась **ссылка** на \`@Input\` (не содержимое, а именно сама ссылка на объект);
- сработало событие из шаблона этого компонента;
- эмитнул Observable, подписанный через \`async\`-pipe;
- вручную вызван \`markForCheck()\`.

Это **отсекает** целые поддеревья от проверки → меньше работы за один цикл CD, лучше метрики **INP** (Interaction to Next Paint — отзывчивость на действия) и **TBT** (Total Blocking Time — сколько главный поток был занят). Важное условие: данные во входах должны быть **иммутабельными** (неизменяемыми) — новый объект вместо мутации старого, иначе Angular не заметит изменение по ссылке.

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {}
\`\`\`

### Signals

**Сигналы** (с Angular v16+) — это реактивные значения-контейнеры, дающие **гранулярную** (точечную) реактивность. Angular точно знает, какое представление зависит от какого сигнала, и обновляет **только** его, не обходя всё дерево. Это путь к минимальному, точному рендеру.

\`\`\`ts
count = signal(0);
doubled = computed(() => this.count() * 2);
\`\`\`

Здесь \`signal(0)\` — значение, которое можно читать как \`count()\`. А \`computed(...)\` — производное значение, которое само пересчитывается, когда меняется \`count\`, причём **лениво** (только когда его реально читают).

### Zoneless

В **zoneless**-режиме (\`provideZonelessChangeDetection()\`, экспериментальный/стабилизируется) Zone.js убирается совсем. Теперь CD запускается **явно** — сигналами, событиями, \`async\`-pipe. Плюсы: меньше размер бандла (нет Zone.js, а это примерно 13 КБ в gzip), нет «слепых» полных проходов по всему дереву, поведение предсказуемее, лучше INP.

\`\`\`ts
// Zoneless + signals: change detection срабатывает только там, где читается сигнал
bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`{{ doubled() }}\`,
})
export class CounterComponent {
  count = signal(0);
  doubled = computed(() => this.count() * 2); // пересчитывается лениво
  inc() { this.count.update((n) => n + 1); }  // планирует точечное обновление
}
\`\`\`

В этом примере при вызове \`inc()\` меняется только \`count\`, и Angular обновляет ровно то место в шаблоне, где читается \`doubled()\` — без прохода по всему дереву.

### Что ещё помогает

- \`trackBy\` / новый \`@for\` с \`track\` — переиспользуют DOM-узлы вместо пересоздания при изменении списка.
- \`runOutsideAngular\` для частых событий (\`mousemove\`, \`scroll\`), чтобы они не запускали CD зря.
- Чистые (**pure**) pipe-ы вместо вызова методов прямо в шаблоне — они кэшируют результат.

## ⚠️ Подводные камни

- OnPush ломается при мутации входных объектов: меняй ссылку (новый объект), а не поле старого.
- Zoneless пока экспериментальный — проверяй, что все обновления идут через сигналы/события/\`async\`, иначе UI не обновится.
- Вызов методов в шаблоне вместо computed/сигналов сводит на нет выигрыш — метод дёргается на каждый CD.

## 🎯 Запомни

- По умолчанию Zone.js гоняет CD по всему дереву на каждый асинхрон — дорого.
- OnPush отсекает неизменившиеся поддеревья (требует иммутабельности входов).
- Signals дают точечные обновления: перерисовывается только зависимое представление.
- Zoneless убирает Zone.js (~13 КБ) и слепые полные проходы; связка OnPush + signals + zoneless = минимальный, точечный рендер и хорошие Core Web Vitals.`,
      en: `## 🧩 In plain words

Imagine a teacher who, after every rustle in the classroom, goes and checks **every** student's notebook — just in case someone changed something. That's Angular by default: any event (a click, a timer, a server response) makes it recheck the whole class. **OnPush** is the rule "check only those who definitely changed something." **Signals** are when a student raises their hand and says "I changed," and the teacher goes only to them. **Zoneless** is firing that very "watchman" who nudged the teacher at every rustle.

### Change Detection in Angular

**Change Detection (CD)** is the process by which Angular reconciles data with what's shown on screen and updates the markup. By default Angular uses **Zone.js** — a library that intercepts all async operations (events, timers, XHR requests) and after each one runs CD over the **entire** component tree. On large apps this is expensive: it rechecks tons of components that didn't change.

### OnPush

The \`ChangeDetectionStrategy.OnPush\` strategy tells Angular to check a component only when:
- an \`@Input\` **reference** changed (not the contents, but the object reference itself);
- an event fired from this component's template;
- an Observable subscribed via the \`async\` pipe emitted;
- \`markForCheck()\` was called manually.

This **prunes** whole subtrees from checking → less work per CD cycle, better **INP** (Interaction to Next Paint — responsiveness to actions) and **TBT** (Total Blocking Time — how long the main thread was busy). Key condition: input data must be **immutable** — a new object instead of mutating the old one, otherwise Angular won't notice the change by reference.

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {}
\`\`\`

### Signals

**Signals** (Angular v16+) are reactive value-containers that provide **granular** (targeted) reactivity. Angular knows exactly which view depends on which signal and updates **only** that one, without traversing the whole tree. This is the path to minimal, targeted rendering.

\`\`\`ts
count = signal(0);
doubled = computed(() => this.count() * 2);
\`\`\`

Here \`signal(0)\` is a value you read as \`count()\`. And \`computed(...)\` is a derived value that recomputes itself when \`count\` changes — and does so **lazily** (only when it's actually read).

### Zoneless

In **zoneless** mode (\`provideZonelessChangeDetection()\`, experimental/stabilizing) Zone.js is removed entirely. Now CD is triggered **explicitly** — by signals, events, the \`async\` pipe. Pros: smaller bundle (no Zone.js, about 13 KB gzipped), no "blind" full passes over the whole tree, more predictable behavior, better INP.

\`\`\`ts
// Zoneless + signals: change detection runs only where a signal is read
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
}
\`\`\`

In this example, calling \`inc()\` changes only \`count\`, and Angular updates exactly the spot in the template where \`doubled()\` is read — with no whole-tree traversal.

### What else helps

- \`trackBy\` / the new \`@for\` with \`track\` — reuse DOM nodes instead of recreating them when a list changes.
- \`runOutsideAngular\` for frequent events (\`mousemove\`, \`scroll\`) so they don't trigger CD needlessly.
- Pure pipes instead of calling methods right in the template — they cache the result.

## ⚠️ Common pitfalls

- OnPush breaks when you mutate input objects: change the reference (a new object), not a field of the old one.
- Zoneless is still experimental — make sure all updates go through signals/events/\`async\`, otherwise the UI won't refresh.
- Calling methods in the template instead of computed/signals cancels the gains — the method runs on every CD.

## 🎯 Key takeaways

- By default Zone.js runs CD over the whole tree on every async — expensive.
- OnPush prunes unchanged subtrees (requires immutable inputs).
- Signals give targeted updates: only the dependent view re-renders.
- Zoneless removes Zone.js (~13 KB) and blind full passes; OnPush + signals + zoneless = minimal, targeted rendering and good Core Web Vitals.`
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
    category: 'web-performance',
    level: 'Medium',
    tags: ['aspect-ratio', 'cls', 'layout'],
    question: {
      ru: 'Как свойство aspect-ratio помогает избежать CLS? Чем оно лучше padding-hack?',
      en: 'How does the aspect-ratio property help avoid CLS? Why is it better than the padding hack?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что ты накрываешь стол и заранее ставишь тарелку под будущее блюдо. Даже если суп ещё варится, место под тарелку уже занято — соседние приборы не сдвинутся. \`aspect-ratio\` делает то же самое для картинок и видео: браузер заранее «занимает» правильный по высоте прямоугольник, пока файл ещё грузится. Ничего не прыгает — а именно прыжки контента и есть CLS.

### Что такое CLS и почему контент прыгает

**CLS (Cumulative Layout Shift)** — это метрика «насколько сильно контент дёргается» во время загрузки страницы. Чем больше внезапных сдвигов, тем хуже. Классическая причина: картинка, видео или \`<iframe>\` вставлены без заданной высоты. Пока файл не загрузился, браузер думает, что элемент нулевой высоты, и рисует всё, что ниже, вплотную. Файл догрузился — браузер узнал реальный размер, раздвинул место, и весь текст под картинкой прыгнул вниз. Чтобы этого не было, браузеру нужно знать **соотношение сторон до загрузки** ресурса.

### Старый способ — padding-hack

Раньше высоту резервировали трюком с \`padding\`. Идея: у отступа в процентах база — это **ширина** элемента, поэтому \`padding-top: 56.25%\` даёт высоту в 56.25% от ширины (это как раз 9/16 для формата 16:9).

\`\`\`css
.wrapper {
  position: relative;
  padding-top: 56.25%; /* 9/16 = 0.5625 */
}
.wrapper > * {
  position: absolute;
  inset: 0;
}
\`\`\`

Работает, но цена высокая: нужна лишняя обёртка (\`.wrapper\`), абсолютное позиционирование, «магическое число» 56.25%, которое надо пересчитывать под каждый формат, и содержимое вырывается из обычного потока документа.

### Современный способ — aspect-ratio

Свойство \`aspect-ratio\` задаёт соотношение ширины к высоте одной строкой. Браузер сам держит нужную высоту.

\`\`\`css
.media {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
}
\`\`\`

Никаких обёрток и хаков. Браузер резервирует место под правильную высоту сразу, ещё до загрузки ресурса — сдвиг нулевой.

### Для картинок — просто задай width и height

Если у \`<img>\` прописаны атрибуты \`width\` и \`height\`, современные браузеры **сами** вычисляют из них \`aspect-ratio\` и заранее резервируют место. Это самый надёжный и простой способ:

\`\`\`html
<img src="photo.jpg" width="1600" height="900" alt="..." />
\`\`\`

Обрати внимание: это не жёстко фиксированный размер в пикселях. Через CSS (\`width: 100%; height: auto\`) картинка остаётся резиновой, но пропорция берётся из атрибутов, поэтому место бронируется заранее.

### Почему aspect-ratio лучше

- Чисто и декларативно, без лишних узлов в DOM.
- Дружит с \`object-fit\` (обрезка/масштаб картинки внутри своего бокса).
- Сочетается с intrinsic sizing (когда размер зависит от содержимого) и с Grid/Flexbox.
- Можно менять адаптивно через media-запросы — например, другое соотношение на мобильном.

## ⚠️ Подводные камни

- Если явно заданы **и** \`width\`, **и** \`height\`, которые противоречат соотношению, \`aspect-ratio\` уступает явным размерам.
- Если содержимое внутри выше расчётной высоты, бокс может растянуться. При необходимости добавь \`min-height: 0\` или \`overflow\`.
- \`aspect-ratio\` — не панацея от CLS в целом; он решает именно проблему медиа. Шрифты, поздние баннеры и вставки нужно резервировать отдельно.

## 🎯 Запомни

- CLS растёт, когда медиа грузится без зарезервированной высоты и контент прыгает.
- \`aspect-ratio: 16 / 9\` бронирует место заранее одной строкой — без обёрток и магии.
- Для \`<img>\` достаточно указать атрибуты \`width\` и \`height\` — браузер сам всё посчитает.`,
      en: `## 🧩 In plain words

Imagine setting a table and placing an empty plate for a dish that is still cooking. Even though the soup is not ready, the plate's spot is already claimed — the surrounding cutlery will not shift. \`aspect-ratio\` does the same for images and video: the browser reserves a correctly-sized rectangle up front while the file is still loading. Nothing jumps around — and that jumping is exactly what CLS measures.

### What CLS is and why content jumps

**CLS (Cumulative Layout Shift)** is a metric for "how much the content jerks around" while a page loads. The more sudden shifts, the worse the score. The classic cause: an image, video, or \`<iframe>\` inserted without a set height. Until the file loads, the browser assumes the element has zero height and draws everything below it tightly packed. Once the file arrives, the browser learns the real size, pushes things apart, and all the text below jumps down. To prevent this, the browser needs to know the **aspect ratio before the resource loads**.

### The old way — the padding hack

We used to reserve height with a \`padding\` trick. The idea: a percentage padding is based on the element's **width**, so \`padding-top: 56.25%\` gives a height that is 56.25% of the width (which is exactly 9/16, the 16:9 format).

\`\`\`css
.wrapper {
  position: relative;
  padding-top: 56.25%; /* 9/16 = 0.5625 */
}
.wrapper > * {
  position: absolute;
  inset: 0;
}
\`\`\`

It works, but the cost is high: you need an extra wrapper (\`.wrapper\`), absolute positioning, the "magic number" 56.25% that must be recomputed for every format, and the content is pulled out of the normal document flow.

### The modern way — aspect-ratio

The \`aspect-ratio\` property sets the width-to-height ratio in one line. The browser keeps the right height for you.

\`\`\`css
.media {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
}
\`\`\`

No wrappers or hacks. The browser reserves space for the correct height immediately, before the resource loads — zero shift.

### For images — just set width and height

If an \`<img>\` has \`width\` and \`height\` attributes, modern browsers **automatically** compute \`aspect-ratio\` from them and reserve space ahead of time. This is the most reliable and simplest approach:

\`\`\`html
<img src="photo.jpg" width="1600" height="900" alt="..." />
\`\`\`

Note: this is not a hard pixel-locked size. With CSS (\`width: 100%; height: auto\`) the image stays fluid, but the ratio comes from the attributes, so the space is booked in advance.

### Why aspect-ratio is better

- Clean and declarative, no extra DOM nodes.
- Works with \`object-fit\` (cropping/scaling the image inside its box).
- Composes with intrinsic sizing (size driven by content) and with Grid/Flexbox.
- Can be changed responsively via media queries — e.g. a different ratio on mobile.

## ⚠️ Common pitfalls

- If both \`width\` **and** \`height\` are set explicitly and conflict with the ratio, \`aspect-ratio\` yields to the explicit sizes.
- If the inner content is taller than the computed height, the box may stretch. Add \`min-height: 0\` or \`overflow\` if needed.
- \`aspect-ratio\` is not a cure-all for CLS in general; it solves the media case specifically. Fonts, late banners, and injected content must be reserved separately.

## 🎯 Key takeaways

- CLS rises when media loads without reserved height and content jumps.
- \`aspect-ratio: 16 / 9\` books the space up front in one line — no wrappers, no magic.
- For \`<img>\`, just set the \`width\` and \`height\` attributes — the browser computes the rest.`
    }
  },
  {
    id: 'web-038',
    category: 'web-performance',
    level: 'Hard',
    tags: ['gpu-layers', 'paint', 'devtools'],
    question: {
      ru: 'Как использовать Chrome DevTools для диагностики проблем рендеринга (paint, layers, FPS)?',
      en: 'How do you use Chrome DevTools to diagnose rendering problems (paint, layers, FPS)?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что браузер рисует страницу как мультик: 60 картинок-кадров в секунду. Если на один кадр он тратит слишком много времени, кадр «выпадает» и появляется дёрганье. Chrome DevTools — это как замедленная съёмка: она показывает, на что именно ушло время в каждом кадре и почему картинка тормозит. Ниже — набор инструментов и понятный порядок действий.

### Немного контекста: что происходит в кадре

Чтобы показать пиксели, браузер проходит этапы: **JavaScript** (логика), **Style** (пересчёт стилей), **Layout / reflow** (вычисление размеров и позиций — «где что стоит»), **Paint** (закраска пикселей) и **Composite** (склейка слоёв в итоговую картинку). Бюджет одного кадра при 60 FPS — примерно 16 мс. Задача диагностики — найти, какой этап его превышает.

### Performance panel — запись профиля

Запись профиля показывает покадровый разбор по цветам: **Scripting** (жёлтый), **Rendering/Layout** (фиолетовый), **Painting** (зелёный), **Compositing**. Красные маркеры — выпавшие кадры и **long tasks** (задачи дольше 50 мс, которые блокируют главный поток). Здесь же видно **forced reflow** — это когда JS читает размер элемента сразу после его изменения и заставляет браузер срочно пересчитать layout, что тормозит.

### Rendering tab

Открывается через \`Cmd/Ctrl+Shift+P\` → «Show Rendering». Полезные переключатели:

- **Paint flashing** — подсвечивает зелёным области, которые перерисовываются. Если при скролле или анимации мигает пол-экрана — лишний repaint, который можно убрать.
- **Layout Shift Regions** — синие вспышки там, где происходят сдвиги; прямая диагностика CLS.
- **Frame Rendering Stats / FPS meter** — реальный FPS, объём GPU-памяти и число слоёв в реальном времени.
- **Layer borders** — рисует границы композиторных слоёв.

### Layers panel

Показывает **композиторные слои** в 3D. Слой — это отдельная «плёнка», которую GPU может двигать и смешивать независимо от остальных (например, ускоренная анимация). Панель говорит, сколько слоёв, почему конкретный элемент вынесен в отдельный слой (промоутнут) и сколько памяти он ест. Так ловят **layer explosion** — когда из-за неаккуратного \`will-change\` или \`translateZ(0)\` слоёв становится слишком много и память/производительность падают.

### Coverage tab

Показывает, какой CSS и JS реально не используется на странице. Это кандидаты на удаление и на **code splitting** (разбиение бандла, чтобы грузить код по мере надобности).

### Performance Monitor

Живые графики в реальном времени: загрузка CPU, размер JS heap (памяти), число DOM Nodes, layouts в секунду, пересчёты стилей в секунду. Если число DOM Nodes стабильно растёт при переходах между экранами и не падает — это признак **утечки памяти**.

### Порядок действий (методика)

1. Записать профиль типового сценария — скролл ленты, открытие модалки.
2. Найти long tasks и фиолетовые блоки Layout с предупреждением \`Forced reflow\`.
3. Включить Paint flashing и убедиться, что перерисовывается только нужная область.
4. Проверить число слоёв в Layers — нет ли layer explosion.
5. Подтвердить улучшение по FPS meter и повторной записи профиля.

## ⚠️ Подводные камни

- \`will-change\` и \`translateZ(0)\` ускоряют анимацию, но при неаккуратном применении плодят лишние слои и съедают GPU-память — используй точечно.
- Forced reflow часто прячется в цикле: чтение геометрии (\`offsetHeight\`, \`getBoundingClientRect\`) вперемешку с записью стилей. Разделяй чтение и запись.
- Ощущения обманчивы: «стало плавнее» — не доказательство. Всегда меряй числа до и после.

## 🎯 Запомни

- Performance panel даёт покадровый разбор по цветам и ловит long tasks и forced reflow.
- Rendering tab (Paint flashing, FPS meter, Layout Shift Regions) быстро показывает лишние перерисовки и сдвиги.
- Layers panel ловит layer explosion; всегда измеряй до и после — числа важнее ощущений.`,
      en: `## 🧩 In plain words

Think of the browser drawing a page like a cartoon: 60 picture-frames per second. If it spends too long on a single frame, that frame is "dropped" and you see jank. Chrome DevTools is like slow-motion footage: it shows exactly where the time went in each frame and why the picture stutters. Below is the toolset plus a clear order of operations.

### A bit of context: what happens in a frame

To put pixels on screen, the browser runs through stages: **JavaScript** (logic), **Style** (recompute styles), **Layout / reflow** (compute sizes and positions — "what goes where"), **Paint** (fill in pixels), and **Composite** (stitch layers into the final image). The budget for one frame at 60 FPS is about 16 ms. The goal of diagnosis is to find which stage blows that budget.

### Performance panel — recording a profile

Recording a profile gives a per-frame breakdown by color: **Scripting** (yellow), **Rendering/Layout** (purple), **Painting** (green), **Compositing**. Red markers are dropped frames and **long tasks** (tasks longer than 50 ms that block the main thread). This is also where you spot a **forced reflow** — when JS reads an element's size right after changing it, forcing the browser to recompute layout immediately, which stalls things.

### Rendering tab

Open it via \`Cmd/Ctrl+Shift+P\` → "Show Rendering". Useful toggles:

- **Paint flashing** — highlights repainted areas in green. If half the screen flashes during scroll or animation, there is excess repaint you can remove.
- **Layout Shift Regions** — blue flashes where shifts occur; a direct CLS diagnosis.
- **Frame Rendering Stats / FPS meter** — real FPS, GPU memory, and layer count in real time.
- **Layer borders** — draws the outlines of compositor layers.

### Layers panel

Shows the **compositor layers** in 3D. A layer is a separate "film" the GPU can move and blend independently of the rest (e.g. an accelerated animation). The panel tells you how many layers there are, why a given element was pulled into its own layer (promoted), and how much memory it uses. This is how you catch a **layer explosion** — when sloppy \`will-change\` or \`translateZ(0)\` creates too many layers and memory/performance suffers.

### Coverage tab

Shows which CSS and JS is actually unused on the page. These are candidates for removal and for **code splitting** (breaking the bundle so code loads only when needed).

### Performance Monitor

Live real-time charts: CPU load, JS heap size (memory), DOM Nodes count, layouts per second, style recalcs per second. If the DOM Nodes count keeps climbing as you navigate between screens and never drops, that is a sign of a **memory leak**.

### Order of operations (methodology)

1. Record a profile of a typical scenario — scrolling a feed, opening a modal.
2. Find long tasks and purple Layout blocks with a \`Forced reflow\` warning.
3. Enable Paint flashing and confirm only the needed area repaints.
4. Check the layer count in Layers — watch for a layer explosion.
5. Confirm the improvement via the FPS meter and a re-recorded profile.

## ⚠️ Common pitfalls

- \`will-change\` and \`translateZ(0)\` speed up animation, but applied carelessly they spawn extra layers and eat GPU memory — use them surgically.
- Forced reflow often hides in a loop: reading geometry (\`offsetHeight\`, \`getBoundingClientRect\`) interleaved with writing styles. Separate reads from writes.
- Feelings deceive: "it feels smoother" is not proof. Always measure the numbers before and after.

## 🎯 Key takeaways

- The Performance panel gives a per-frame breakdown by color and catches long tasks and forced reflows.
- The Rendering tab (Paint flashing, FPS meter, Layout Shift Regions) quickly reveals excess repaints and shifts.
- The Layers panel catches layer explosion; always measure before and after — numbers beat feelings.`
    }
  }
];
