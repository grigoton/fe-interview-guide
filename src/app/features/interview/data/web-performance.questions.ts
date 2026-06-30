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
      ru: `## Этапы Critical Rendering Path (CRP)

Браузер выполняет конвейер из шести шагов, чтобы превратить байты в пиксели:

1. **Parse HTML → DOM** — токенизатор строит дерево DOM. Парсинг инкрементальный, но любой синхронный \`<script>\` без \`async\`/\`defer\` блокирует построение DOM.
2. **Parse CSS → CSSOM** — CSS считается **render-blocking** ресурсом: браузер не строит render tree, пока не загрузит и не распарсит весь критический CSS. CSSOM строится сверху вниз, специфичность вычисляется здесь.
3. **Render Tree** — DOM и CSSOM объединяются. Узлы с \`display: none\` исключаются (а \`visibility: hidden\` остаётся в дереве).
4. **Layout (Reflow)** — вычисляются геометрия и позиция каждого узла в пикселях. Зависит от viewport.
5. **Paint** — заполнение пикселей в слоях (текст, цвета, тени, границы).
6. **Composite** — слои собираются в финальное изображение, часто на GPU.

## Почему это важно

- **JS блокирует парсер**: при встрече \`<script>\` без атрибутов браузер останавливает построение DOM, скачивает и исполняет скрипт. Хуже того, если перед скриптом есть незагруженный CSS, скрипт ждёт CSSOM, потому что может читать стили.
- **Минимизируйте критические ресурсы**: инлайните критический CSS, откладывайте остальное.

\`\`\`html
<link rel="stylesheet" href="critical.css" />
<script defer src="app.js"></script>
\`\`\`

Цель — сократить число и размер render-blocking ресурсов, чтобы First Contentful Paint наступил как можно раньше.`,
      en: `## Critical Rendering Path (CRP) stages

The browser runs a six-step pipeline to turn bytes into pixels:

1. **Parse HTML → DOM** — the tokenizer builds the DOM tree. Parsing is incremental, but any synchronous \`<script>\` without \`async\`/\`defer\` blocks DOM construction.
2. **Parse CSS → CSSOM** — CSS is a **render-blocking** resource: the browser will not build the render tree until all critical CSS is downloaded and parsed. The CSSOM is built top-down; specificity is computed here.
3. **Render Tree** — DOM and CSSOM are combined. Nodes with \`display: none\` are excluded (whereas \`visibility: hidden\` stays in the tree).
4. **Layout (Reflow)** — geometry and position of every node are computed in pixels. Depends on viewport size.
5. **Paint** — pixels are filled into layers (text, colors, shadows, borders).
6. **Composite** — layers are combined into the final image, often on the GPU.

## Why it matters

- **JS blocks the parser**: when the browser hits a plain \`<script>\`, it pauses DOM construction, downloads and executes the script. Worse, if there is unloaded CSS before the script, the script waits for the CSSOM because it might read styles.
- **Minimize critical resources**: inline critical CSS and defer the rest.

\`\`\`html
<link rel="stylesheet" href="critical.css" />
<script defer src="app.js"></script>
\`\`\`

The goal is to reduce the number and size of render-blocking resources so First Contentful Paint happens as early as possible.`
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
      ru: `## Reflow vs Repaint

- **Reflow (Layout)** — пересчёт геометрии: размеров, позиций, переноса. Самая дорогая операция, потому что изменение одного элемента может каскадно затронуть его потомков, предков и сиблингов.
- **Repaint** — перерисовка пикселей без изменения геометрии (например, смена \`color\`, \`background\`, \`visibility\`). Дешевле reflow, но всё равно нагружает CPU.

## Что вызывает reflow

- Изменение \`width\`, \`height\`, \`margin\`, \`padding\`, \`top\`, \`left\`, \`font-size\`.
- Добавление/удаление узлов DOM.
- Изменение содержимого текста.
- Чтение «layout-провоцирующих» свойств: \`offsetTop\`, \`offsetWidth\`, \`scrollHeight\`, \`getBoundingClientRect()\`, \`getComputedStyle()\` — они форсируют синхронный reflow, если есть незакоммиченные изменения.

## Что вызывает только repaint

- \`color\`, \`background-color\`, \`box-shadow\`, \`outline\`, \`visibility\`.

## Что не вызывает ни reflow, ни repaint (только composite)

- \`transform\` и \`opacity\` — обрабатываются композитором на GPU.

## Практический вывод

Анимируйте через \`transform\`/\`opacity\`, избегайте анимаций \`top\`/\`left\`/\`width\`. Группируйте чтения и записи DOM, чтобы не вызывать forced synchronous layout (layout thrashing). Браузер пытается батчить изменения в один кадр, но синхронное чтение размеров ломает эту оптимизацию.`,
      en: `## Reflow vs Repaint

- **Reflow (Layout)** — recomputing geometry: sizes, positions, wrapping. The most expensive operation because changing one element can cascade to its descendants, ancestors and siblings.
- **Repaint** — repainting pixels without changing geometry (e.g. changing \`color\`, \`background\`, \`visibility\`). Cheaper than reflow but still loads the CPU.

## What triggers a reflow

- Changing \`width\`, \`height\`, \`margin\`, \`padding\`, \`top\`, \`left\`, \`font-size\`.
- Adding/removing DOM nodes.
- Changing text content.
- Reading "layout-provoking" properties: \`offsetTop\`, \`offsetWidth\`, \`scrollHeight\`, \`getBoundingClientRect()\`, \`getComputedStyle()\` — they force a synchronous reflow if there are uncommitted changes.

## What triggers only a repaint

- \`color\`, \`background-color\`, \`box-shadow\`, \`outline\`, \`visibility\`.

## What triggers neither (composite only)

- \`transform\` and \`opacity\` — handled by the compositor on the GPU.

## Practical takeaway

Animate via \`transform\`/\`opacity\`; avoid animating \`top\`/\`left\`/\`width\`. Batch DOM reads and writes to avoid forced synchronous layout (layout thrashing). The browser tries to batch changes into one frame, but a synchronous size read breaks that optimization.`
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
      ru: `## Layout thrashing

Это паттерн, когда в цикле чередуются **запись** в DOM и **чтение** геометрических свойств. Каждое чтение после записи форсирует синхронный reflow, потому что браузер обязан вернуть актуальное значение. Вместо одного reflow за кадр получаем сотни.

## Антипаттерн

\`\`\`ts
// ПЛОХО: read-write-read-write вызывает N reflows
for (const el of boxes) {
  const w = el.offsetWidth;   // read — форсирует layout
  el.style.width = w + 10 + 'px'; // write — инвалидирует layout
}
\`\`\`

## Решение — батчинг read/write

\`\`\`ts
// ХОРОШО: сначала все чтения, потом все записи
const widths = boxes.map((el) => el.offsetWidth); // batch reads
boxes.forEach((el, i) => {
  el.style.width = widths[i] + 10 + 'px';         // batch writes
});
\`\`\`

## Обнаружение

- В Chrome DevTools → Performance видны фиолетовые блоки **«Layout»** с предупреждением *Forced reflow*.
- Колонка *Recalculate Style* и длинные задачи (long tasks).

## Инструменты

- Библиотека **FastDOM** автоматически разносит чтения и записи по фазам \`requestAnimationFrame\`.
- \`requestAnimationFrame\` для записи перед следующим кадром; \`ResizeObserver\` вместо опроса размеров.

Ключевая идея: браузер держит «грязный» флаг layout. Любая запись делает его грязным, а любое чтение геометрии заставляет его пересчитаться немедленно. Разделение фаз позволяет браузеру выполнить ровно один reflow.`,
      en: `## Layout thrashing

This is a pattern where a loop alternates **writes** to the DOM and **reads** of geometric properties. Each read after a write forces a synchronous reflow because the browser must return an up-to-date value. Instead of one reflow per frame you get hundreds.

## Anti-pattern

\`\`\`ts
// BAD: read-write-read-write causes N reflows
for (const el of boxes) {
  const w = el.offsetWidth;       // read — forces layout
  el.style.width = w + 10 + 'px'; // write — invalidates layout
}
\`\`\`

## Fix — batch reads/writes

\`\`\`ts
// GOOD: all reads first, then all writes
const widths = boxes.map((el) => el.offsetWidth); // batch reads
boxes.forEach((el, i) => {
  el.style.width = widths[i] + 10 + 'px';         // batch writes
});
\`\`\`

## Detection

- In Chrome DevTools → Performance you see purple **"Layout"** blocks with a *Forced reflow* warning.
- The *Recalculate Style* lane and long tasks.

## Tooling

- The **FastDOM** library automatically schedules reads and writes into separate \`requestAnimationFrame\` phases.
- Use \`requestAnimationFrame\` to write before the next frame; use \`ResizeObserver\` instead of polling sizes.

Key idea: the browser keeps a "dirty" layout flag. Any write marks it dirty, and any geometry read forces an immediate recompute. Separating the phases lets the browser do exactly one reflow.`
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
      ru: `## Compositor-only свойства

\`transform\` и \`opacity\` можно анимировать, минуя **Layout** и **Paint** — изменения обрабатываются только на этапе **Composite**, часто на отдельном потоке композитора и GPU.

## Конвейер при анимации

- \`width\`/\`top\` → **Layout → Paint → Composite** (дорого, в main thread).
- \`background-color\` → **Paint → Composite** (средне).
- \`transform\`/\`opacity\` → **Composite only** (дёшево, на GPU/compositor thread).

## Почему это важно для 60 fps

Браузер использует отдельный **compositor thread**. Если анимация идёт только через \`transform\`/\`opacity\`, она может продолжаться даже когда main thread занят JavaScript — отсюда плавность. Бюджет одного кадра при 60 fps — **16.7 мс**; при 120 fps — **8.3 мс**.

## Как создать слой (layer)

Элемент получает собственный композиторный слой при:

- \`will-change: transform\`;
- \`transform: translateZ(0)\` (хак promotion);
- 3D-трансформациях, \`<video>\`, \`<canvas>\`, анимированных \`opacity\`.

## Готчи

- Слои потребляют **видеопамять**; избыток слоёв (layer explosion) тормозит композитинг.
- \`will-change\` нужно ставить заранее, но убирать после анимации, иначе память расходуется впустую.

\`\`\`css
.card {
  transition: transform 200ms ease-out;
}
.card:hover {
  transform: translateY(-4px) scale(1.02);
}
\`\`\``,
      en: `## Compositor-only properties

\`transform\` and \`opacity\` can be animated while skipping **Layout** and **Paint** — changes are handled only at the **Composite** stage, often on a separate compositor thread and the GPU.

## Pipeline per animated property

- \`width\`/\`top\` → **Layout → Paint → Composite** (expensive, main thread).
- \`background-color\` → **Paint → Composite** (medium).
- \`transform\`/\`opacity\` → **Composite only** (cheap, GPU/compositor thread).

## Why it matters for 60 fps

The browser uses a separate **compositor thread**. If an animation runs only via \`transform\`/\`opacity\`, it can continue even while the main thread is busy with JavaScript — hence the smoothness. The budget for one frame at 60 fps is **16.7 ms**; at 120 fps it is **8.3 ms**.

## How a layer is created

An element gets its own compositor layer when:

- \`will-change: transform\`;
- \`transform: translateZ(0)\` (promotion hack);
- 3D transforms, \`<video>\`, \`<canvas>\`, animated \`opacity\`.

## Gotchas

- Layers consume **video memory**; too many layers (layer explosion) slows compositing.
- \`will-change\` must be set ahead of time but removed after the animation, otherwise memory is wasted.

\`\`\`css
.card {
  transition: transform 200ms ease-out;
}
.card:hover {
  transform: translateY(-4px) scale(1.02);
}
\`\`\``
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
      ru: `## Назначение will-change

\`will-change\` сообщает браузеру, что свойство скоро изменится, чтобы тот заранее подготовил оптимизацию — обычно вынес элемент на отдельный композиторный слой. Это убирает «джанк» в начале анимации, когда слой создаётся на лету.

## Правильное использование

- Ставьте \`will-change\` **незадолго до** анимации (например, по \`mouseenter\`) и **снимайте** после неё.
- Указывайте конкретные свойства: \`will-change: transform, opacity\`.

\`\`\`ts
el.addEventListener('mouseenter', () => {
  el.style.willChange = 'transform';
});
el.addEventListener('animationend', () => {
  el.style.willChange = 'auto'; // освобождаем слой
});
\`\`\`

## Когда вредит

- **Глобально на множестве элементов** (\`* { will-change: transform }\`) — каждый получает слой, видеопамять заканчивается, композитинг замедляется.
- **Постоянно включённый** — браузер держит ресурсы зарезервированными.
- **Преждевременная оптимизация** — если анимации нет, эффекта нет, только трата памяти.

## Альтернатива

Старый хак \`transform: translateZ(0)\` / \`backface-visibility: hidden\` тоже создаёт слой, но \`will-change\` — это явный, поддерживаемый стандартом способ. Не злоупотребляйте: это «острый инструмент», а не глобальный переключатель производительности.`,
      en: `## Purpose of will-change

\`will-change\` tells the browser that a property is about to change so it can prepare an optimization ahead of time — usually by promoting the element to its own compositor layer. This removes the "jank" at the start of an animation when the layer is created on the fly.

## Correct usage

- Set \`will-change\` **shortly before** the animation (e.g. on \`mouseenter\`) and **remove** it afterwards.
- Specify concrete properties: \`will-change: transform, opacity\`.

\`\`\`ts
el.addEventListener('mouseenter', () => {
  el.style.willChange = 'transform';
});
el.addEventListener('animationend', () => {
  el.style.willChange = 'auto'; // release the layer
});
\`\`\`

## When it hurts

- **Globally on many elements** (\`* { will-change: transform }\`) — each gets a layer, video memory runs out, compositing slows down.
- **Permanently on** — the browser keeps resources reserved.
- **Premature optimization** — if there is no animation there is no benefit, only memory waste.

## Alternative

The old hack \`transform: translateZ(0)\` / \`backface-visibility: hidden\` also creates a layer, but \`will-change\` is the explicit, standardized way. Do not overuse it: it is a "sharp tool", not a global performance switch.`
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
      ru: `## LCP — Largest Contentful Paint

Метрика измеряет время до отрисовки **самого крупного видимого элемента** в области просмотра (обычно hero-изображение, большой блок текста или \`<video>\` постер). Это прокси для воспринимаемой скорости загрузки.

## Пороги (Core Web Vitals)

- **Хорошо**: ≤ **2.5 с**
- **Требует улучшения**: 2.5 – 4.0 с
- **Плохо**: > **4.0 с**

Оценивается по 75-му перцентилю реальных пользователей (field data, CrUX).

## Что влияет на LCP

1. **TTFB** (медленный сервер/нет CDN).
2. **Render-blocking CSS/JS**.
3. **Время загрузки самого LCP-ресурса** (большое изображение).
4. **Client-side рендеринг** — элемент появляется поздно.

## Оптимизация

- \`<link rel="preload">\` и \`fetchpriority="high"\` для LCP-изображения.
- Оптимизируйте картинки: современные форматы (AVIF/WebP), \`srcset\`, правильный размер.
- Сократите render-blocking ресурсы, инлайньте критический CSS.
- Используйте SSR/SSG для раннего появления контента.
- CDN и кэширование для снижения TTFB.

\`\`\`html
<link rel="preload" as="image" href="hero.avif" fetchpriority="high" />
<img src="hero.avif" fetchpriority="high" width="1200" height="600" alt="Hero" />
\`\`\`

Важно: LCP-элемент может меняться по мере загрузки; финальное значение фиксируется при первом взаимодействии пользователя.`,
      en: `## LCP — Largest Contentful Paint

The metric measures the time to render the **largest visible element** in the viewport (usually a hero image, a large text block, or a \`<video>\` poster). It is a proxy for perceived load speed.

## Thresholds (Core Web Vitals)

- **Good**: ≤ **2.5 s**
- **Needs improvement**: 2.5 – 4.0 s
- **Poor**: > **4.0 s**

Evaluated at the 75th percentile of real users (field data, CrUX).

## What affects LCP

1. **TTFB** (slow server / no CDN).
2. **Render-blocking CSS/JS**.
3. **Load time of the LCP resource itself** (large image).
4. **Client-side rendering** — the element appears late.

## Optimization

- \`<link rel="preload">\` and \`fetchpriority="high"\` for the LCP image.
- Optimize images: modern formats (AVIF/WebP), \`srcset\`, correct sizing.
- Reduce render-blocking resources, inline critical CSS.
- Use SSR/SSG so content appears early.
- CDN and caching to lower TTFB.

\`\`\`html
<link rel="preload" as="image" href="hero.avif" fetchpriority="high" />
<img src="hero.avif" fetchpriority="high" width="1200" height="600" alt="Hero" />
\`\`\`

Note: the LCP element can change as the page loads; the final value is locked in at the user's first interaction.`
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
      ru: `## CLS — Cumulative Layout Shift

Метрика визуальной стабильности: насколько неожиданно «прыгает» контент. Каждый сдвиг = **impact fraction × distance fraction**. CLS — это сумма наихудшего **окна сессии** (session window) из таких сдвигов.

## Пороги

- **Хорошо**: ≤ **0.1**
- **Требует улучшения**: 0.1 – 0.25
- **Плохо**: > **0.25**

Важно: учитываются только **неожиданные** сдвиги. Сдвиг в течение 500 мс после пользовательского ввода считается «ожидаемым» и не штрафуется.

## Частые причины

- Изображения/видео **без размеров** → контент прыгает после загрузки.
- Реклама, эмбеды, iframes без зарезервированного места.
- Динамически вставляемый контент (баннеры, уведомления) над существующим.
- Веб-шрифты, вызывающие FOIT/FOUT и пересчёт высоты текста.

## Как избежать

\`\`\`css
img,
video {
  aspect-ratio: 16 / 9; /* резервируем место заранее */
  width: 100%;
  height: auto;
}
\`\`\`

- Всегда указывайте \`width\`/\`height\` или \`aspect-ratio\`.
- Резервируйте место под динамические блоки (skeleton, min-height).
- \`font-display: optional\` и \`size-adjust\` для шрифтов.
- Вставляйте контент **под** видимой областью или по действию пользователя.
- Используйте \`transform\` для анимаций вместо изменения геометрии.`,
      en: `## CLS — Cumulative Layout Shift

A visual-stability metric: how unexpectedly content "jumps". Each shift = **impact fraction × distance fraction**. CLS is the sum of the worst **session window** of such shifts.

## Thresholds

- **Good**: ≤ **0.1**
- **Needs improvement**: 0.1 – 0.25
- **Poor**: > **0.25**

Note: only **unexpected** shifts count. A shift within 500 ms of user input is treated as "expected" and is not penalized.

## Common causes

- Images/videos **without dimensions** → content jumps after loading.
- Ads, embeds, iframes without reserved space.
- Dynamically injected content (banners, notifications) above existing content.
- Web fonts causing FOIT/FOUT and text-height recomputation.

## How to avoid

\`\`\`css
img,
video {
  aspect-ratio: 16 / 9; /* reserve space up front */
  width: 100%;
  height: auto;
}
\`\`\`

- Always set \`width\`/\`height\` or \`aspect-ratio\`.
- Reserve space for dynamic blocks (skeleton, min-height).
- Use \`font-display: optional\` and \`size-adjust\` for fonts.
- Inject content **below** the fold or on user action.
- Use \`transform\` for animations instead of changing geometry.`
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
      ru: `## INP — Interaction to Next Paint

С марта 2024 года INP заменил **FID (First Input Delay)** в Core Web Vitals. INP измеряет отзывчивость на протяжении **всей** сессии, а не только первого взаимодействия.

## Почему INP лучше FID

- **FID** мерил только *задержку* до начала обработки **первого** ввода — игнорировал время самого обработчика и рендеринга.
- **INP** учитывает полный путь: **input delay → processing time → presentation delay (next paint)** и берёт (примерно) худшее взаимодействие за визит.

## Пороги

- **Хорошо**: ≤ **200 мс**
- **Требует улучшения**: 200 – 500 мс
- **Плохо**: > **500 мс**

## Как улучшить

1. **Дробите длинные задачи** (long tasks > 50 мс) — \`scheduler.yield()\`, \`setTimeout\`, разбиение работы.
2. Откладывайте некритичную работу через \`requestIdleCallback\`.
3. Минимизируйте работу обработчиков событий; тяжёлые вычисления — в Web Worker.
4. Избегайте больших синхронных ре-рендеров; используйте \`transition\`/concurrent-режимы.
5. В Angular — OnPush, \`runOutsideAngular\`, signals, чтобы сократить циклы change detection.

\`\`\`ts
async function handleClick() {
  doUrgentUiUpdate();           // мгновенный отклик
  await scheduler.yield();      // отдаём кадр браузеру
  doHeavyWork();                // тяжёлое — после отрисовки
}
\`\`\`

Ключ: пользователь должен видеть **визуальный отклик** в течение следующего кадра, даже если фоновая работа продолжается.`,
      en: `## INP — Interaction to Next Paint

Since March 2024 INP replaced **FID (First Input Delay)** in Core Web Vitals. INP measures responsiveness across the **entire** session, not just the first interaction.

## Why INP is better than FID

- **FID** measured only the *delay* before the **first** input started processing — it ignored the handler's own time and rendering.
- **INP** captures the full path: **input delay → processing time → presentation delay (next paint)** and takes (roughly) the worst interaction per visit.

## Thresholds

- **Good**: ≤ **200 ms**
- **Needs improvement**: 200 – 500 ms
- **Poor**: > **500 ms**

## How to improve

1. **Break up long tasks** (> 50 ms) — \`scheduler.yield()\`, \`setTimeout\`, work chunking.
2. Defer non-critical work via \`requestIdleCallback\`.
3. Minimize event-handler work; move heavy computation to a Web Worker.
4. Avoid large synchronous re-renders; use \`transition\`/concurrent modes.
5. In Angular — OnPush, \`runOutsideAngular\`, signals to reduce change-detection cycles.

\`\`\`ts
async function handleClick() {
  doUrgentUiUpdate();      // instant feedback
  await scheduler.yield(); // hand a frame back to the browser
  doHeavyWork();           // heavy work — after paint
}
\`\`\`

Key: the user must see **visual feedback** within the next frame, even if background work continues.`
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
      ru: `## TTFB — Time To First Byte

Время от начала навигации до получения **первого байта** ответа сервера. Включает DNS, TCP, TLS, обработку на сервере. Это «фундамент»: высокий TTFB задерживает всё последующее, включая FCP и LCP.

- **Хорошо**: ≤ **800 мс** (часто целятся в ≤ 200 мс).

## FCP — First Contentful Paint

Время до отрисовки **первого** контента (текст, изображение, не пустой фон). Показывает, что страница начала загружаться.

- **Хорошо**: ≤ **1.8 с**
- **Требует улучшения**: 1.8 – 3.0 с
- **Плохо**: > 3.0 с

## Связь метрик

\`TTFB → FCP → LCP\`. FCP не может наступить раньше, чем придёт первый байт и распарсится критический CSS. LCP обычно ≥ FCP.

## Как улучшить TTFB

- CDN ближе к пользователю, кэш на edge.
- Серверный кэш, оптимизация БД-запросов.
- HTTP/2 или HTTP/3, keep-alive, ранний \`103 Early Hints\`.

## Как улучшить FCP

- Сократить render-blocking CSS/JS, инлайнить критический CSS.
- \`preconnect\` к критичным доменам, \`preload\` шрифтов.
- \`font-display: swap\` чтобы текст рисовался сразу.

Эти две метрики не входят в «тройку» Core Web Vitals напрямую, но являются диагностическими: если они плохи, LCP почти наверняка тоже пострадает.`,
      en: `## TTFB — Time To First Byte

Time from navigation start to receiving the **first byte** of the server response. Includes DNS, TCP, TLS, and server processing. It is the "foundation": a high TTFB delays everything downstream, including FCP and LCP.

- **Good**: ≤ **800 ms** (often teams target ≤ 200 ms).

## FCP — First Contentful Paint

Time to render the **first** piece of content (text, image, anything but a blank background). Signals that the page has started loading.

- **Good**: ≤ **1.8 s**
- **Needs improvement**: 1.8 – 3.0 s
- **Poor**: > 3.0 s

## Relationship between metrics

\`TTFB → FCP → LCP\`. FCP cannot happen before the first byte arrives and the critical CSS is parsed. LCP is usually ≥ FCP.

## How to improve TTFB

- A CDN closer to the user, edge caching.
- Server-side caching, optimized DB queries.
- HTTP/2 or HTTP/3, keep-alive, early \`103 Early Hints\`.

## How to improve FCP

- Reduce render-blocking CSS/JS, inline critical CSS.
- \`preconnect\` to critical origins, \`preload\` fonts.
- \`font-display: swap\` so text paints immediately.

These two metrics are not directly part of the Core Web Vitals "trio" but are diagnostic: if they are poor, LCP will almost certainly suffer too.`
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
      ru: `## RUM vs Lab

- **Lab data** (Lighthouse) — синтетика в контролируемых условиях, хороша для отладки.
- **Field data / RUM** (Real User Monitoring) — реальные пользователи; именно это влияет на ранжирование.

## PerformanceObserver

API позволяет подписаться на performance-записи асинхронно, не блокируя main thread.

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

Поддерживаемые типы: \`largest-contentful-paint\`, \`layout-shift\`, \`event\` (для INP), \`paint\` (FCP), \`navigation\` (TTFB), \`longtask\`.

## Библиотека web-vitals

Google рекомендует официальную библиотеку \`web-vitals\`, которая корректно обрабатывает edge-кейсы (session windows для CLS, attribution для INP):

\`\`\`ts
import { onLCP, onCLS, onINP } from 'web-vitals';
onLCP(sendToAnalytics);
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
\`\`\`

## Важно

\`buffered: true\` забирает записи, произошедшие **до** регистрации observer. Финальные значения отправляйте на \`visibilitychange\` → \`hidden\`, используя \`navigator.sendBeacon\`.`,
      en: `## RUM vs Lab

- **Lab data** (Lighthouse) — synthetic, controlled conditions, good for debugging.
- **Field data / RUM** (Real User Monitoring) — real users; this is what affects ranking.

## PerformanceObserver

The API lets you subscribe to performance entries asynchronously without blocking the main thread.

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

Supported types: \`largest-contentful-paint\`, \`layout-shift\`, \`event\` (for INP), \`paint\` (FCP), \`navigation\` (TTFB), \`longtask\`.

## The web-vitals library

Google recommends the official \`web-vitals\` library, which correctly handles edge cases (session windows for CLS, attribution for INP):

\`\`\`ts
import { onLCP, onCLS, onINP } from 'web-vitals';
onLCP(sendToAnalytics);
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
\`\`\`

## Important

\`buffered: true\` retrieves entries that occurred **before** the observer was registered. Send final values on \`visibilitychange\` → \`hidden\` using \`navigator.sendBeacon\`.`
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
      ru: `## Resource hints

### preload
Высокоприоритетная загрузка ресурса, **нужного на текущей странице**, но обнаруживаемого поздно (шрифт в CSS, hero-картинка, критичный модуль). Браузер скачивает его рано, но не исполняет.

\`\`\`html
<link rel="preload" as="font" href="inter.woff2" type="font/woff2" crossorigin />
\`\`\`

Обязательно указывайте \`as\`, иначе ресурс может скачаться дважды.

### prefetch
Низкоприоритетная загрузка ресурса для **будущей навигации** (следующая страница). Кладётся в кэш и используется позже. Идеально для предзагрузки маршрута, на который пользователь, вероятно, перейдёт.

\`\`\`html
<link rel="prefetch" href="/dashboard-chunk.js" />
\`\`\`

### preconnect
Заранее устанавливает соединение (DNS + TCP + TLS) с **критичным сторонним origin** (CDN, шрифты, API). Экономит 100–300 мс на handshake.

\`\`\`html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
\`\`\`

### dns-prefetch
Только DNS-резолвинг — более дешёвый и совместимый fallback к \`preconnect\` для менее критичных доменов.

## Сводка

| Hint | Что делает | Когда |
| --- | --- | --- |
| preload | грузит текущий ресурс рано | критичный ресурс, обнаруживаемый поздно |
| prefetch | грузит будущий ресурс лениво | вероятная следующая навигация |
| preconnect | DNS+TCP+TLS заранее | критичный сторонний origin |
| dns-prefetch | только DNS | менее критичный домен |

## Готча
Не злоупотребляйте \`preconnect\` — больше 4–6 соединений конкурируют за пропускную способность и могут навредить.`,
      en: `## Resource hints

### preload
High-priority fetch of a resource **needed on the current page** but discovered late (a font in CSS, the hero image, a critical module). The browser downloads it early but does not execute it.

\`\`\`html
<link rel="preload" as="font" href="inter.woff2" type="font/woff2" crossorigin />
\`\`\`

Always set \`as\`, otherwise the resource may be downloaded twice.

### prefetch
Low-priority fetch of a resource for a **future navigation** (the next page). It is cached and used later. Ideal for preloading a route the user will probably visit.

\`\`\`html
<link rel="prefetch" href="/dashboard-chunk.js" />
\`\`\`

### preconnect
Establishes a connection (DNS + TCP + TLS) ahead of time with a **critical third-party origin** (CDN, fonts, API). Saves 100–300 ms of handshake.

\`\`\`html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
\`\`\`

### dns-prefetch
DNS resolution only — a cheaper, more compatible fallback to \`preconnect\` for less critical domains.

## Summary

| Hint | What it does | When |
| --- | --- | --- |
| preload | fetch current resource early | critical resource discovered late |
| prefetch | fetch future resource lazily | likely next navigation |
| preconnect | DNS+TCP+TLS ahead of time | critical third-party origin |
| dns-prefetch | DNS only | less critical domain |

## Gotcha
Do not overuse \`preconnect\` — more than 4–6 connections compete for bandwidth and can hurt.`
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
      ru: `## Три режима загрузки скриптов

### Обычный <script>
Парсинг HTML **останавливается**, скрипт скачивается и **синхронно** исполняется, потом парсинг продолжается. Блокирует построение DOM — главный антипаттерн в \`<head>\`.

### defer
Скрипт скачивается **параллельно** с парсингом, но исполняется **после** полного построения DOM, **перед** \`DOMContentLoaded\`. Сохраняет **порядок** между несколькими defer-скриптами.

### async
Скрипт скачивается параллельно и исполняется **сразу после загрузки**, прерывая парсинг в произвольный момент. **Порядок не гарантируется** — кто раньше скачался, тот раньше исполнился.

## Таблица

| Режим | Качается | Исполняется | Порядок |
| --- | --- | --- | --- |
| (plain) | сразу, блокирует | сразу, блокирует | да |
| async | параллельно | как только скачан | нет |
| defer | параллельно | после DOM, до DCL | да |

## Практика

\`\`\`html
<!-- Аналитика, независимый сторонний скрипт -->
<script async src="analytics.js"></script>

<!-- Код приложения, зависящий от DOM и порядка -->
<script defer src="vendor.js"></script>
<script defer src="app.js"></script>
\`\`\`

## Правило выбора

- **defer** — для кода приложения, которому важен DOM и порядок.
- **async** — для независимых скриптов (аналитика, реклама).
- **modules** (\`type="module"\`) — defer по умолчанию.

Никогда не оставляйте блокирующий \`<script>\` в \`<head>\` без причины.`,
      en: `## Three script-loading modes

### Plain <script>
HTML parsing **stops**, the script is downloaded and executed **synchronously**, then parsing resumes. It blocks DOM construction — the main anti-pattern in \`<head>\`.

### defer
The script is downloaded **in parallel** with parsing but executes **after** the DOM is fully built, **before** \`DOMContentLoaded\`. It preserves **order** among multiple defer scripts.

### async
The script downloads in parallel and executes **as soon as it loads**, interrupting parsing at an arbitrary moment. **Order is not guaranteed** — whichever loads first runs first.

## Table

| Mode | Downloads | Executes | Order |
| --- | --- | --- | --- |
| (plain) | immediately, blocks | immediately, blocks | yes |
| async | in parallel | as soon as loaded | no |
| defer | in parallel | after DOM, before DCL | yes |

## Practice

\`\`\`html
<!-- Analytics, independent third-party script -->
<script async src="analytics.js"></script>

<!-- App code that depends on DOM and order -->
<script defer src="vendor.js"></script>
<script defer src="app.js"></script>
\`\`\`

## Choosing rule

- **defer** — for app code that needs the DOM and ordering.
- **async** — for independent scripts (analytics, ads).
- **modules** (\`type="module"\`) — defer by default.

Never leave a blocking \`<script>\` in \`<head>\` without a reason.`
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
      ru: `## Render-blocking ресурсы

Браузер не отрисует **ни одного пикселя** контента, пока не обработает render-blocking ресурсы.

### CSS блокирует рендеринг
Любой \`<link rel="stylesheet">\` в \`<head>\` блокирует построение render tree до полной загрузки и парсинга. Браузер боится «вспышки нестилизованного контента».

### JS блокирует парсинг
Синхронный \`<script>\` останавливает парсер; а если он стоит после неподгруженного CSS, то ещё и ждёт CSSOM.

## Как уменьшить

1. **Критический CSS инлайнить** в \`<head>\`, остальное грузить асинхронно:

\`\`\`html
<style>/* critical above-the-fold CSS */</style>
<link
  rel="stylesheet"
  href="rest.css"
  media="print"
  onload="this.media='all'"
/>
\`\`\`

2. **Разделять CSS по media**: \`media="(min-width: 1024px)"\` делает стиль не-блокирующим на узких экранах.
3. **defer/async** для скриптов.
4. **Tree-shaking и удаление неиспользуемого CSS** (PurgeCSS).
5. \`@import\` в CSS избегать — он создаёт цепочку последовательных запросов.

## Измерение

Lighthouse → "Eliminate render-blocking resources" показывает экономию в миллисекундах. В DevTools → Coverage видно, сколько CSS/JS реально используется.

Цель — минимальный критический путь: чем меньше байтов нужно обработать до первого кадра, тем раньше FCP и LCP.`,
      en: `## Render-blocking resources

The browser will not paint **a single pixel** of content until it has processed render-blocking resources.

### CSS blocks rendering
Any \`<link rel="stylesheet">\` in \`<head>\` blocks render-tree construction until it is fully loaded and parsed. The browser fears a "flash of unstyled content".

### JS blocks parsing
A synchronous \`<script>\` stops the parser; and if it comes after unloaded CSS, it also waits for the CSSOM.

## How to reduce it

1. **Inline critical CSS** in \`<head>\`, load the rest asynchronously:

\`\`\`html
<style>/* critical above-the-fold CSS */</style>
<link
  rel="stylesheet"
  href="rest.css"
  media="print"
  onload="this.media='all'"
/>
\`\`\`

2. **Split CSS by media**: \`media="(min-width: 1024px)"\` makes a stylesheet non-blocking on narrow screens.
3. **defer/async** for scripts.
4. **Tree-shaking and removing unused CSS** (PurgeCSS).
5. Avoid \`@import\` in CSS — it creates a chain of sequential requests.

## Measurement

Lighthouse → "Eliminate render-blocking resources" shows savings in milliseconds. DevTools → Coverage shows how much CSS/JS is actually used.

The goal is a minimal critical path: the fewer bytes to process before the first frame, the earlier FCP and LCP.`
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
      ru: `## FOIT vs FOUT

- **FOIT (Flash of Invisible Text)** — пока кастомный шрифт грузится, текст **невидим**. Плохо для воспринимаемой скорости и LCP, если LCP-элемент — текст.
- **FOUT (Flash of Unstyled Text)** — текст рисуется системным шрифтом, потом подменяется кастомным. Виден «прыжок», но контент читаем сразу.

## font-display

Свойство \`@font-face\` управляет поведением во время загрузки:

\`\`\`css
@font-face {
  font-family: 'Inter';
  src: url('inter.woff2') format('woff2');
  font-display: swap;
}
\`\`\`

- \`auto\` — на усмотрение браузера (обычно FOIT).
- \`block\` — короткий период невидимости (FOIT), затем swap.
- \`swap\` — сразу fallback, потом подмена (FOUT). Хорош для FCP, но даёт CLS.
- \`fallback\` — компромисс: очень короткий блок, ограниченный swap-период.
- \`optional\` — браузер может вообще не применять шрифт, если он медленный. **Лучший для CLS**.

## Минимизация CLS от шрифтов

- \`preload\` ключевого шрифта: \`<link rel="preload" as="font" crossorigin>\`.
- \`size-adjust\`, \`ascent-override\` для подгонки метрик fallback под кастомный шрифт → сдвиг почти нулевой.
- WOFF2 формат, subsetting (только нужные глифы).
- Self-hosting вместо стороннего CDN убирает лишний \`preconnect\`.

\`\`\`css
@font-face {
  font-family: 'InterFallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 90%;
}
\`\`\`

Идеальная стратегия: \`preload\` + \`font-display: swap\` + метрики fallback близкие к финальным.`,
      en: `## FOIT vs FOUT

- **FOIT (Flash of Invisible Text)** — while the custom font loads, the text is **invisible**. Bad for perceived speed and for LCP if the LCP element is text.
- **FOUT (Flash of Unstyled Text)** — text is painted with a system font, then swapped for the custom one. A "jump" is visible, but content is readable immediately.

## font-display

This \`@font-face\` property controls loading behavior:

\`\`\`css
@font-face {
  font-family: 'Inter';
  src: url('inter.woff2') format('woff2');
  font-display: swap;
}
\`\`\`

- \`auto\` — up to the browser (usually FOIT).
- \`block\` — a short invisibility period (FOIT), then swap.
- \`swap\` — fallback immediately, then swap (FOUT). Good for FCP but causes CLS.
- \`fallback\` — a compromise: very short block, limited swap period.
- \`optional\` — the browser may skip the font entirely if it is slow. **Best for CLS**.

## Minimizing font CLS

- \`preload\` the key font: \`<link rel="preload" as="font" crossorigin>\`.
- \`size-adjust\`, \`ascent-override\` to match the fallback metrics to the custom font → shift is nearly zero.
- WOFF2 format, subsetting (only the glyphs you need).
- Self-hosting instead of a third-party CDN removes an extra \`preconnect\`.

\`\`\`css
@font-face {
  font-family: 'InterFallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 90%;
}
\`\`\`

Ideal strategy: \`preload\` + \`font-display: swap\` + fallback metrics close to the final font.`
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
      ru: `## Адаптивные изображения

Цель — отдать каждому устройству изображение нужного разрешения, не пересылая мегабайты на мобильный экран.

### Дескриптор x (density)
Для фиксированного отображаемого размера, разные плотности пикселей:

\`\`\`html
<img
  src="logo.png"
  srcset="logo.png 1x, logo@2x.png 2x, logo@3x.png 3x"
  alt="Logo"
/>
\`\`\`

### Дескриптор w (width) + sizes
Браузер сам выбирает кандидата на основе реальной ширины слота. \`srcset\` объявляет ширины файлов, \`sizes\` сообщает, какую ширину займёт картинка при разных условиях:

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

## Как браузер выбирает

1. Берёт условие из \`sizes\`, подходящее под текущий viewport → получает ширину слота в px.
2. Умножает на DPR устройства.
3. Выбирает наименьшего кандидата из \`srcset\`, чья \`w\` ≥ нужного значения.

## Важные нюансы

- \`sizes\` обязателен при \`w\`-дескрипторах, иначе браузер считает \`100vw\`.
- Выбор делается **до** загрузки CSS, поэтому \`sizes\` должен описывать layout явно.
- Для арт-дирекшена (разные кропы) используйте \`<picture>\` с \`<source media>\`.
- Всегда задавайте \`width\`/\`height\` или \`aspect-ratio\`, чтобы избежать CLS.`,
      en: `## Responsive images

The goal is to serve each device an appropriately sized image without shipping megabytes to a mobile screen.

### x (density) descriptor
For a fixed display size with different pixel densities:

\`\`\`html
<img
  src="logo.png"
  srcset="logo.png 1x, logo@2x.png 2x, logo@3x.png 3x"
  alt="Logo"
/>
\`\`\`

### w (width) descriptor + sizes
The browser picks a candidate based on the real slot width. \`srcset\` declares file widths, \`sizes\` tells how wide the image will render under various conditions:

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

## How the browser chooses

1. It evaluates the \`sizes\` condition matching the current viewport → gets the slot width in px.
2. Multiplies by the device DPR.
3. Picks the smallest \`srcset\` candidate whose \`w\` ≥ the required value.

## Important nuances

- \`sizes\` is required with \`w\` descriptors, otherwise the browser assumes \`100vw\`.
- The choice is made **before** CSS loads, so \`sizes\` must describe the layout explicitly.
- For art direction (different crops) use \`<picture>\` with \`<source media>\`.
- Always set \`width\`/\`height\` or \`aspect-ratio\` to avoid CLS.`
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
      ru: `## Нативный lazy loading

\`loading="lazy"\` откладывает загрузку изображения/iframe, пока оно не приблизится к viewport (расстояние определяется браузером и зависит от скорости сети).

\`\`\`html
<img src="below-the-fold.jpg" loading="lazy" width="600" height="400" alt="..." />
\`\`\`

## Главная ошибка

**Никогда не делайте \`loading="lazy"\` для LCP-изображения** (hero выше fold). Это откладывает его загрузку и ухудшает LCP. Для above-the-fold используйте \`loading="eager"\` (по умолчанию) + \`fetchpriority="high"\`.

## fetchpriority

Подсказка приоритета загрузки ресурса: \`high\`, \`low\`, \`auto\`.

\`\`\`html
<!-- LCP-картинка: грузим как можно раньше -->
<img src="hero.avif" fetchpriority="high" width="1200" height="600" alt="Hero" />

<!-- Декоративная картинка вне зоны внимания -->
<img src="aside.jpg" fetchpriority="low" loading="lazy" alt="" />
\`\`\`

## Как браузер расставляет приоритеты

Изначально все изображения имеют средне-низкий приоритет. \`fetchpriority="high"\` поднимает LCP-картинку над менее важными ресурсами, ускоряя её доставку без \`preload\`.

## Чек-лист

- Above-the-fold hero: \`eager\` + \`fetchpriority="high"\`.
- Below-the-fold: \`loading="lazy"\`.
- Всегда \`width/height\` для резервирования места (CLS).
- \`decoding="async"\` чтобы декодирование не блокировало main thread.`,
      en: `## Native lazy loading

\`loading="lazy"\` defers loading an image/iframe until it approaches the viewport (the distance is browser-defined and depends on connection speed).

\`\`\`html
<img src="below-the-fold.jpg" loading="lazy" width="600" height="400" alt="..." />
\`\`\`

## The main mistake

**Never use \`loading="lazy"\` on the LCP image** (a hero above the fold). It delays its load and worsens LCP. For above-the-fold content use \`loading="eager"\` (the default) + \`fetchpriority="high"\`.

## fetchpriority

A loading-priority hint for a resource: \`high\`, \`low\`, \`auto\`.

\`\`\`html
<!-- LCP image: load as early as possible -->
<img src="hero.avif" fetchpriority="high" width="1200" height="600" alt="Hero" />

<!-- Decorative image outside the focus area -->
<img src="aside.jpg" fetchpriority="low" loading="lazy" alt="" />
\`\`\`

## How the browser prioritizes

Initially all images get a medium-low priority. \`fetchpriority="high"\` raises the LCP image above less important resources, speeding up its delivery without \`preload\`.

## Checklist

- Above-the-fold hero: \`eager\` + \`fetchpriority="high"\`.
- Below-the-fold: \`loading="lazy"\`.
- Always \`width/height\` to reserve space (CLS).
- \`decoding="async"\` so decoding does not block the main thread.`
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
      ru: `## Современные форматы

- **WebP** — на 25–35% меньше JPEG при том же качестве, поддерживает прозрачность и анимацию. Поддержка ~96% браузеров.
- **AVIF** — на основе AV1, ещё лучше сжатие (на 50% меньше JPEG), отличный HDR и широкий цветовой охват. Чуть медленнее кодируется, поддержка ~93%.
- **JPEG XL** — перспективный, но поддержка пока ограничена.

## Когда какой

- **AVIF** — для фотографий, где важен размер; лучший коэффициент сжатия.
- **WebP** — универсальный компромисс с широкой поддержкой.
- **SVG** — для иконок, логотипов, иллюстраций (векторный, масштабируемый).
- **PNG** — только когда нужна точная безпотерьная графика.

## Fallback через <picture>

Браузер берёт первый \`<source>\`, который умеет декодировать:

\`\`\`html
<picture>
  <source srcset="photo.avif" type="image/avif" />
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="Photo" width="800" height="600" loading="lazy" />
</picture>
\`\`\`

## На практике

- Многие CDN (Cloudinary, imgix) отдают оптимальный формат по \`Accept\`-заголовку автоматически.
- Комбинируйте форматы с \`srcset\`/\`sizes\` для адаптивности.
- AVIF медленно кодируется — это вопрос сборки/CDN, не рантайма.

Правильный выбор формата часто экономит больше байтов, чем любая другая оптимизация изображений.`,
      en: `## Modern image formats

- **WebP** — 25–35% smaller than JPEG at the same quality, supports transparency and animation. ~96% browser support.
- **AVIF** — based on AV1, even better compression (50% smaller than JPEG), excellent HDR and wide color gamut. Slightly slower to encode, ~93% support.
- **JPEG XL** — promising, but support is still limited.

## When to use which

- **AVIF** — for photos where size matters most; best compression ratio.
- **WebP** — a universal compromise with wide support.
- **SVG** — for icons, logos, illustrations (vector, scalable).
- **PNG** — only when exact lossless graphics are required.

## Fallback via <picture>

The browser takes the first \`<source>\` it can decode:

\`\`\`html
<picture>
  <source srcset="photo.avif" type="image/avif" />
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="Photo" width="800" height="600" loading="lazy" />
</picture>
\`\`\`

## In practice

- Many CDNs (Cloudinary, imgix) serve the optimal format based on the \`Accept\` header automatically.
- Combine formats with \`srcset\`/\`sizes\` for responsiveness.
- AVIF encodes slowly — that is a build/CDN concern, not runtime.

Choosing the right format often saves more bytes than any other image optimization.`
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
      ru: `## Grid vs Flexbox

Ключевое различие в измерности:

- **Flexbox** — **одномерная** раскладка: элементы в ряд **или** в столбец. Контент диктует размер (content-out). Идеален для компонентов: тулбары, навигация, карточки в строку.
- **Grid** — **двумерная** раскладка: строки **и** столбцы одновременно. Контейнер диктует структуру (layout-in). Идеален для макетов страниц, галерей, сложных сеток.

## Intrinsic sizing

- Во Flexbox: \`flex: 1 1 auto\` распределяет свободное место; \`min-width: 0\` часто нужен, чтобы элемент мог сжаться меньше своего контента (иначе overflow).
- В Grid: функции \`min-content\`, \`max-content\`, \`fit-content()\`, \`minmax()\` дают точный контроль.

\`\`\`css
/* Адаптивная сетка карточек без media-запросов */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr));
  gap: 16px;
}
\`\`\`

\`minmax(250px, 1fr)\` — каждая колонка минимум 250px, делит остаток поровну; \`auto-fill\` создаёт столько колонок, сколько влезает.

## Практическое правило

- Один ряд/колонка, выравнивание по контенту → **Flexbox**.
- Сетка с выравниванием по двум осям, перекрытия, named areas → **Grid**.
- Их можно вкладывать: Grid для макета страницы, Flexbox внутри ячеек.

## Производительность
Обе технологии используют один и тот же layout-движок; разница в производительности минимальна. Выбор делается по семантике задачи, а не по скорости.`,
      en: `## Grid vs Flexbox

The key difference is dimensionality:

- **Flexbox** — **one-dimensional** layout: items in a row **or** a column. Content drives the size (content-out). Ideal for components: toolbars, navigation, a row of cards.
- **Grid** — **two-dimensional** layout: rows **and** columns at once. The container drives the structure (layout-in). Ideal for page layouts, galleries, complex grids.

## Intrinsic sizing

- In Flexbox: \`flex: 1 1 auto\` distributes free space; \`min-width: 0\` is often needed so an item can shrink below its content (otherwise overflow).
- In Grid: the functions \`min-content\`, \`max-content\`, \`fit-content()\`, \`minmax()\` give precise control.

\`\`\`css
/* Responsive card grid with no media queries */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr));
  gap: 16px;
}
\`\`\`

\`minmax(250px, 1fr)\` — each column is at least 250px and splits the remainder evenly; \`auto-fill\` creates as many columns as fit.

## Practical rule

- A single row/column, content-based alignment → **Flexbox**.
- A grid aligned on two axes, overlaps, named areas → **Grid**.
- They nest: Grid for the page layout, Flexbox inside cells.

## Performance
Both use the same layout engine; the performance difference is minimal. Choose by the semantics of the task, not by speed.`
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
      ru: `## Каскад — порядок разрешения

Браузер выбирает значение свойства по приоритетам:

1. **Origin и важность**: user-agent < user < author < author \`!important\` < user \`!important\`.
2. **Cascade layers** (\`@layer\`) — слои упорядочены явно.
3. **Специфичность** селектора.
4. **Порядок появления** — последний выигрывает при равной специфичности.

## Специфичность

Считается как кортеж **(a, b, c)**:

- **a** — inline-стиль (или количество ID при сравнении селекторов).
- **b** — классы, атрибуты, псевдоклассы (\`:hover\`).
- **c** — теги и псевдоэлементы (\`::before\`).

\`\`\`css
#main .card a      /* (1,1,1) */
.card a:hover      /* (0,2,1) */
a                  /* (0,0,1) */
\`\`\`

\`!important\` обходит специфичность (используйте редко). \`:where()\` имеет специфичность **0**, что удобно для сбрасываемых базовых стилей. \`:is()\` берёт специфичность самого «тяжёлого» аргумента.

## Наследование

Некоторые свойства наследуются автоматически (\`color\`, \`font\`, \`line-height\`, \`visibility\`), другие — нет (\`margin\`, \`padding\`, \`border\`, \`background\`). Управление: \`inherit\`, \`initial\`, \`unset\`, \`revert\`.

## Практика

- Держите специфичность **низкой и плоской** (методологии BEM, utility-классы).
- Избегайте ID в селекторах и \`!important\`.
- Используйте \`@layer\` для управляемой архитектуры стилей в крупных проектах.

Понимание каскада критично для отладки: «почему мой стиль не применился» почти всегда сводится к специфичности или порядку.`,
      en: `## The cascade — resolution order

The browser picks a property value by priority:

1. **Origin and importance**: user-agent < user < author < author \`!important\` < user \`!important\`.
2. **Cascade layers** (\`@layer\`) — layers are explicitly ordered.
3. **Specificity** of the selector.
4. **Order of appearance** — the last one wins when specificity is equal.

## Specificity

Computed as a tuple **(a, b, c)**:

- **a** — inline style (or the number of IDs when comparing selectors).
- **b** — classes, attributes, pseudo-classes (\`:hover\`).
- **c** — elements and pseudo-elements (\`::before\`).

\`\`\`css
#main .card a      /* (1,1,1) */
.card a:hover      /* (0,2,1) */
a                  /* (0,0,1) */
\`\`\`

\`!important\` bypasses specificity (use rarely). \`:where()\` has specificity **0**, handy for easily-overridable base styles. \`:is()\` takes the specificity of its heaviest argument.

## Inheritance

Some properties inherit automatically (\`color\`, \`font\`, \`line-height\`, \`visibility\`), others do not (\`margin\`, \`padding\`, \`border\`, \`background\`). Control with \`inherit\`, \`initial\`, \`unset\`, \`revert\`.

## Practice

- Keep specificity **low and flat** (BEM methodology, utility classes).
- Avoid IDs in selectors and \`!important\`.
- Use \`@layer\` for a managed style architecture in large projects.

Understanding the cascade is critical for debugging: "why isn't my style applied" almost always comes down to specificity or order.`
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
      ru: `## Stacking context

Это концептуальный «слой» на оси Z. Элементы внутри одного контекста сравниваются по \`z-index\` между собой, но **дочерний** контекст целиком позиционируется по \`z-index\` своего родителя — независимо от того, насколько большие z-index у его внутренних элементов.

## Что создаёт новый stacking context

- \`position: relative/absolute\` + \`z-index\` ≠ \`auto\`.
- \`position: fixed\` или \`sticky\`.
- \`opacity\` < 1.
- \`transform\`, \`filter\`, \`perspective\`, \`clip-path\`, \`mask\` ≠ \`none\`.
- \`will-change\` со значением, создающим контекст.
- \`isolation: isolate\`.
- Flex/grid-элемент с \`z-index\` ≠ \`auto\`.

## Почему z-index «не работает»

Классическая ловушка: вы ставите \`z-index: 9999\` элементу, но он всё равно под другим. Причина — его **родитель** образует stacking context с меньшим z-index, чем у соседнего поддерева. Дочерний элемент не может «выпрыгнуть» из контекста родителя.

\`\`\`css
.modal-parent {
  opacity: 0.99;      /* нечаянно создаёт stacking context! */
}
.modal {
  z-index: 9999;      /* всё равно под .sibling, если родитель ниже */
}
\`\`\`

## Решение

- Используйте \`isolation: isolate\` осознанно, чтобы контролировать контексты.
- Рендерите оверлеи/модалки через portal в конец \`<body>\`, чтобы они были на верхнем уровне контекста.
- Проверяйте, не создал ли родитель контекст случайно (\`transform\`, \`opacity\`, \`filter\`).

В DevTools панель Layers помогает визуализировать иерархию стекинга.`,
      en: `## Stacking context

It is a conceptual "layer" on the Z axis. Elements within one context are compared by \`z-index\` among themselves, but a **child** context is positioned as a whole by its parent's \`z-index\` — regardless of how large the z-indexes of its inner elements are.

## What creates a new stacking context

- \`position: relative/absolute\` + \`z-index\` ≠ \`auto\`.
- \`position: fixed\` or \`sticky\`.
- \`opacity\` < 1.
- \`transform\`, \`filter\`, \`perspective\`, \`clip-path\`, \`mask\` ≠ \`none\`.
- \`will-change\` with a context-creating value.
- \`isolation: isolate\`.
- A flex/grid item with \`z-index\` ≠ \`auto\`.

## Why z-index "does not work"

The classic trap: you set \`z-index: 9999\` on an element, yet it stays below another. The reason is its **parent** forms a stacking context with a lower z-index than the neighboring subtree. A child cannot "escape" its parent's context.

\`\`\`css
.modal-parent {
  opacity: 0.99;      /* accidentally creates a stacking context! */
}
.modal {
  z-index: 9999;      /* still below .sibling if the parent is lower */
}
\`\`\`

## Fix

- Use \`isolation: isolate\` deliberately to control contexts.
- Render overlays/modals via a portal at the end of \`<body>\` so they sit at the top-level context.
- Check whether a parent created a context accidentally (\`transform\`, \`opacity\`, \`filter\`).

In DevTools, the Layers panel helps visualize the stacking hierarchy.`
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
      ru: `## Block Formatting Context (BFC)

BFC — это независимая область раскладки, внутри которой блочные элементы располагаются по своим правилам, изолированно от внешнего контекста. Внутри BFC: блоки идут вертикально, плавающие элементы участвуют в расчёте высоты, margin-ы потомков не «протекают» наружу.

## Что создаёт BFC

- \`overflow\` ≠ \`visible\` (\`hidden\`, \`auto\`, \`clip\`).
- \`display: flow-root\` (самый чистый способ, без побочных эффектов).
- \`display: inline-block\`, \`table-cell\`, \`flex\`, \`grid\`.
- \`position: absolute/fixed\`.
- Float (\`float\` ≠ \`none\`).

## Какие задачи решает

### 1. Containing floats (clearfix)
BFC включает floated-потомков в расчёт высоты, так что контейнер не «схлопывается».

\`\`\`css
.container {
  display: flow-root; /* современный clearfix без псевдоэлементов */
}
\`\`\`

### 2. Предотвращение margin collapsing
Вертикальные margin-ы соседних/родительских блоков обычно «схлопываются». BFC создаёт барьер.

### 3. Предотвращение обтекания float
Контент BFC не обтекает соседний float, а образует отдельную колонку:

\`\`\`css
.sidebar { float: left; width: 200px; }
.content { overflow: hidden; } /* BFC: не заходит под sidebar */
\`\`\`

## На практике

\`display: flow-root\` — предпочтительный способ создать BFC, потому что не имеет побочных эффектов \`overflow: hidden\` (обрезка контента, потеря скролл-теней). Понимание BFC помогает объяснить «магические» баги с margin и float, которые иначе кажутся необъяснимыми.`,
      en: `## Block Formatting Context (BFC)

A BFC is an independent layout region where block elements lay out by their own rules, isolated from the outer context. Inside a BFC: blocks stack vertically, floats participate in height calculation, and descendants' margins do not "leak" out.

## What creates a BFC

- \`overflow\` ≠ \`visible\` (\`hidden\`, \`auto\`, \`clip\`).
- \`display: flow-root\` (the cleanest way, no side effects).
- \`display: inline-block\`, \`table-cell\`, \`flex\`, \`grid\`.
- \`position: absolute/fixed\`.
- A float (\`float\` ≠ \`none\`).

## What it solves

### 1. Containing floats (clearfix)
A BFC includes floated descendants in its height calculation so the container does not "collapse".

\`\`\`css
.container {
  display: flow-root; /* modern clearfix without pseudo-elements */
}
\`\`\`

### 2. Preventing margin collapsing
Vertical margins of adjacent/parent blocks normally "collapse". A BFC creates a barrier.

### 3. Preventing float wrapping
A BFC's content does not wrap around an adjacent float but forms a separate column:

\`\`\`css
.sidebar { float: left; width: 200px; }
.content { overflow: hidden; } /* BFC: does not slide under the sidebar */
\`\`\`

## In practice

\`display: flow-root\` is the preferred way to create a BFC because it lacks the side effects of \`overflow: hidden\` (content clipping, lost scroll shadows). Understanding BFC explains "magic" margin and float bugs that otherwise seem inexplicable.`
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
      ru: `## CSS Containment

\`contain\` сообщает браузеру, что поддерево **изолировано**, поэтому его изменения не влияют на остальную страницу. Это позволяет ограничить область reflow/repaint.

Значения:
- \`layout\` — изменения раскладки внутри не затрагивают снаружи.
- \`paint\` — потомки не рисуются за границами элемента (можно пропустить их отрисовку, если элемент вне экрана).
- \`size\` — размер элемента не зависит от потомков (нужны явные размеры).
- \`style\` — изоляция некоторых стилевых эффектов.
- \`strict\` = \`size layout paint style\`; \`content\` = \`layout paint style\`.

## content-visibility

\`content-visibility: auto\` — браузер **пропускает рендеринг** (layout, paint) поддерева, пока оно за пределами viewport. Огромный выигрыш для длинных страниц: рендерится только видимое.

\`\`\`css
.section {
  content-visibility: auto;
  contain-intrinsic-size: auto 500px; /* placeholder-высота */
}
\`\`\`

## Подводные камни

- **Без \`contain-intrinsic-size\`** скрытые блоки имеют высоту 0 → скачет скроллбар и ломается \`Ctrl+F\`/якоря. Указывайте оценочный размер.
- **CLS**: при появлении контента высота меняется с placeholder на реальную; \`contain-intrinsic-size: auto\` запоминает фактический размер после первого рендера.
- **Поиск по странице и доступность**: контент за пределами viewport всё равно индексируется и доступен скринридерам (в отличие от \`display: none\`), но измерения геометрии до рендера недоступны.
- Не применяйте к элементам, размеры которых нужны постоянно (например, в sticky-расчётах).

Это одна из самых мощных оптимизаций для длинных списков и статей, дающая иногда кратное ускорение первичного рендера.`,
      en: `## CSS Containment

\`contain\` tells the browser a subtree is **isolated**, so its changes do not affect the rest of the page. This lets the browser limit the scope of reflow/repaint.

Values:
- \`layout\` — layout changes inside do not affect the outside.
- \`paint\` — descendants are not painted beyond the element's bounds (their painting can be skipped when off-screen).
- \`size\` — the element's size does not depend on its descendants (explicit sizes needed).
- \`style\` — isolation of certain style effects.
- \`strict\` = \`size layout paint style\`; \`content\` = \`layout paint style\`.

## content-visibility

\`content-visibility: auto\` makes the browser **skip rendering** (layout, paint) of a subtree while it is outside the viewport. A huge win for long pages: only visible content is rendered.

\`\`\`css
.section {
  content-visibility: auto;
  contain-intrinsic-size: auto 500px; /* placeholder height */
}
\`\`\`

## Pitfalls

- **Without \`contain-intrinsic-size\`** hidden blocks have height 0 → the scrollbar jumps and \`Ctrl+F\`/anchors break. Provide an estimated size.
- **CLS**: when content appears, its height changes from the placeholder to the real one; \`contain-intrinsic-size: auto\` remembers the actual size after the first render.
- **In-page search and accessibility**: off-screen content is still indexed and exposed to screen readers (unlike \`display: none\`), but geometry measurements before render are unavailable.
- Do not apply it to elements whose sizes are needed constantly (e.g. in sticky calculations).

This is one of the most powerful optimizations for long lists and articles, sometimes giving a multiple-fold speedup of the initial render.`
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
      ru: `## Семантический HTML

Семантические теги (\`<header>\`, \`<nav>\`, \`<main>\`, \`<article>\`, \`<section>\`, \`<aside>\`, \`<footer>\`, \`<button>\`, \`<time>\`) описывают **смысл** контента, а не только его вид.

## Доступность (a11y)

- Скринридеры строят дерево доступности из семантики: \`<nav>\` объявляется как навигация, \`<button>\` фокусируется и активируется по Enter/Space автоматически.
- \`<div onclick>\` вместо \`<button>\` требует ручного добавления \`role\`, \`tabindex\`, обработки клавиатуры — легко ошибиться.
- Заголовки \`<h1>–<h6>\` дают структуру для навигации по landmark-ам.

## SEO

- Поисковики понимают структуру: \`<article>\`, \`<main>\`, микроразметка повышают релевантность и rich snippets.
- Семантика помогает определять основной контент страницы.

## Производительность и поддержка

- Меньше «div-супа» → меньше DOM-узлов → дешевле layout и change detection.
- Браузер даёт бесплатное поведение (кнопки, формы, \`<details>\`), не нужно реализовывать вручную → меньше JS.

## Пример

\`\`\`html
<article>
  <header><h2>Заголовок</h2></header>
  <p>Текст...</p>
  <footer><time datetime="2026-06-29">29 июня 2026</time></footer>
</article>
\`\`\`

## Вывод

Семантика — это «фундамент бесплатной доступности». Начинайте с правильных нативных элементов, добавляйте ARIA только когда нативного решения нет. Это улучшает a11y, SEO и снижает количество JS-кода.`,
      en: `## Semantic HTML

Semantic tags (\`<header>\`, \`<nav>\`, \`<main>\`, \`<article>\`, \`<section>\`, \`<aside>\`, \`<footer>\`, \`<button>\`, \`<time>\`) describe the **meaning** of content, not just its appearance.

## Accessibility (a11y)

- Screen readers build the accessibility tree from semantics: \`<nav>\` is announced as navigation, \`<button>\` is focusable and activates on Enter/Space automatically.
- A \`<div onclick>\` instead of a \`<button>\` requires manually adding \`role\`, \`tabindex\`, and keyboard handling — easy to get wrong.
- Headings \`<h1>–<h6>\` provide structure for landmark navigation.

## SEO

- Search engines understand structure: \`<article>\`, \`<main>\`, and microdata raise relevance and rich snippets.
- Semantics help identify the page's main content.

## Performance and maintenance

- Less "div soup" → fewer DOM nodes → cheaper layout and change detection.
- The browser gives free behavior (buttons, forms, \`<details>\`) you would otherwise implement by hand → less JS.

## Example

\`\`\`html
<article>
  <header><h2>Title</h2></header>
  <p>Text...</p>
  <footer><time datetime="2026-06-29">June 29, 2026</time></footer>
</article>
\`\`\`

## Takeaway

Semantics is the "foundation of free accessibility". Start with the correct native elements and add ARIA only when no native solution exists. This improves a11y and SEO and reduces the amount of JS code.`
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
      ru: `## WCAG — четыре принципа (POUR)

- **Perceivable** — контент воспринимаем (альт-тексты, контраст ≥ 4.5:1 для текста, субтитры).
- **Operable** — управляем с клавиатуры, нет ловушек фокуса, достаточно времени.
- **Understandable** — предсказуемое поведение, понятные ошибки форм.
- **Robust** — работает с ассистивными технологиями.

Уровни: A, AA (целевой для большинства), AAA.

## ARIA-роли

ARIA добавляет семантику там, где нет нативной. **Первое правило ARIA: не используйте ARIA, если есть нативный элемент.**

\`\`\`html
<!-- Кастомный таб -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Вкладка</button>
</div>
<div role="tabpanel" id="panel-1">...</div>
\`\`\`

- \`aria-label\`, \`aria-labelledby\` — доступное имя.
- \`aria-expanded\`, \`aria-selected\`, \`aria-current\` — состояние.
- \`aria-live="polite/assertive"\` — анонс динамических изменений.

## Управление фокусом

- Видимый \`:focus-visible\` индикатор — не убирайте outline без замены.
- В модалках: **focus trap** внутри, возврат фокуса на триггер при закрытии, \`aria-modal="true"\`.
- При навигации в SPA переводите фокус на новый заголовок/\`<main>\`.

## Клавиатурная навигация

- Всё интерактивное достижимо по \`Tab\`; логичный \`tabindex\` (избегайте положительных значений).
- Паттерны WAI-ARIA: стрелки для меню/табов, \`Esc\` для закрытия, \`Enter/Space\` для активации.

## Инструменты

axe DevTools, Lighthouse a11y, реальное тестирование скринридерами (NVDA, VoiceOver) и навигация без мыши.`,
      en: `## WCAG — four principles (POUR)

- **Perceivable** — content is perceivable (alt text, contrast ≥ 4.5:1 for text, captions).
- **Operable** — keyboard-operable, no focus traps, enough time.
- **Understandable** — predictable behavior, clear form errors.
- **Robust** — works with assistive technologies.

Levels: A, AA (the target for most), AAA.

## ARIA roles

ARIA adds semantics where there is no native one. **The first rule of ARIA: do not use ARIA if a native element exists.**

\`\`\`html
<!-- Custom tabs -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Tab</button>
</div>
<div role="tabpanel" id="panel-1">...</div>
\`\`\`

- \`aria-label\`, \`aria-labelledby\` — accessible name.
- \`aria-expanded\`, \`aria-selected\`, \`aria-current\` — state.
- \`aria-live="polite/assertive"\` — announce dynamic changes.

## Focus management

- A visible \`:focus-visible\` indicator — do not remove the outline without a replacement.
- In modals: a **focus trap** inside, return focus to the trigger on close, \`aria-modal="true"\`.
- On SPA navigation, move focus to the new heading/\`<main>\`.

## Keyboard navigation

- Everything interactive reachable via \`Tab\`; a logical \`tabindex\` (avoid positive values).
- WAI-ARIA patterns: arrows for menus/tabs, \`Esc\` to close, \`Enter/Space\` to activate.

## Tools

axe DevTools, Lighthouse a11y, real testing with screen readers (NVDA, VoiceOver) and mouse-free navigation.`
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
      ru: `## Стратегии рендеринга

### CSR (Client-Side Rendering)
Сервер отдаёт пустой \`<div id="app">\` + бандл JS; рендер происходит в браузере. **Плюсы**: дёшево хостить, богатая интерактивность. **Минусы**: плохой TTFB-to-content, слабый SEO, медленный LCP на слабых устройствах.

### SSR (Server-Side Rendering)
Сервер рендерит HTML на каждый запрос. **Плюсы**: быстрый FCP/LCP, SEO, актуальные данные. **Минусы**: нагрузка на сервер, выше TTFB при сложном рендере, нужна гидрация.

### SSG (Static Site Generation)
HTML генерируется на этапе сборки. **Плюсы**: максимально быстро (отдаётся с CDN), дёшево, безопасно. **Минусы**: данные «застывают» на момент билда, долгая пересборка для больших сайтов.

### ISR (Incremental Static Regeneration)
SSG + фоновое обновление страниц по таймеру/запросу (stale-while-revalidate). **Плюсы**: статика по скорости, но с обновляемыми данными. **Минусы**: возможна отдача устаревшей версии до регенерации.

## Как выбирать

- **Маркетинг/блог/документация** → SSG (или ISR при частых обновлениях).
- **E-commerce, листинги с персонализацией** → SSR или ISR.
- **Дашборды за авторизацией** → CSR (SEO не нужен) или SSR shell.
- **Контент-сайт с тысячами страниц и периодическим обновлением** → ISR.

## Гибрид

Современные фреймворки комбинируют: статичный shell + SSR для динамики + островная/частичная гидрация. Решение принимается **по странице/маршруту**, а не для всего приложения сразу. Метрики (LCP, TTFB, INP) и требования к SEO/свежести данных диктуют выбор.`,
      en: `## Rendering strategies

### CSR (Client-Side Rendering)
The server returns an empty \`<div id="app">\` + a JS bundle; rendering happens in the browser. **Pros**: cheap to host, rich interactivity. **Cons**: poor time-to-content, weak SEO, slow LCP on low-end devices.

### SSR (Server-Side Rendering)
The server renders HTML on every request. **Pros**: fast FCP/LCP, SEO, fresh data. **Cons**: server load, higher TTFB for complex renders, needs hydration.

### SSG (Static Site Generation)
HTML is generated at build time. **Pros**: maximally fast (served from a CDN), cheap, secure. **Cons**: data is "frozen" at build time, long rebuilds for large sites.

### ISR (Incremental Static Regeneration)
SSG + background page regeneration on a timer/request (stale-while-revalidate). **Pros**: static-level speed with refreshable data. **Cons**: a stale version may be served until regeneration.

## How to choose

- **Marketing/blog/docs** → SSG (or ISR for frequent updates).
- **E-commerce, listings with personalization** → SSR or ISR.
- **Dashboards behind auth** → CSR (no SEO needed) or an SSR shell.
- **Content site with thousands of pages and periodic updates** → ISR.

## Hybrid

Modern frameworks combine: a static shell + SSR for dynamics + islands/partial hydration. The decision is made **per page/route**, not for the whole app at once. Metrics (LCP, TTFB, INP) and SEO/data-freshness requirements drive the choice.`
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
      ru: `## Гидрация в Angular

SSR отдаёт готовый HTML, но без JS он не интерактивен. **Гидрация** — процесс, когда Angular на клиенте «подхватывает» серверный DOM и навешивает обработчики, восстанавливая интерактивность.

## Destructive vs Non-destructive

- **Destructive (старый подход до v16)**: Angular на клиенте **удалял** серверный DOM и рендерил заново. Это вызывало мерцание, лишний пересчёт layout и плохой CLS/LCP.
- **Non-destructive hydration (v16+, \`provideClientHydration()\`)**: Angular **переиспользует** существующий DOM, сопоставляя его со своим деревом, и только присоединяет event listeners и состояние. Нет повторного рендера, нет мерцания.

\`\`\`ts
bootstrapApplication(AppComponent, {
  providers: [provideClientHydration()],
});
\`\`\`

## Что важно знать

- Серверный и клиентский рендер должны давать **идентичный** DOM, иначе hydration mismatch (ошибка \`NG0500\`). Причины: прямые манипуляции с DOM, \`Date.now()\`, случайные значения, невалидный HTML.
- \`ngSkipHydration\` — пометить компонент, который нельзя гидрировать (например, сторонний, мутирующий DOM).

## Deferrable views и партиальная гидрация

- \`@defer\` (v17+) откладывает загрузку и рендер блока до триггера (viewport, interaction, idle) — code splitting на уровне шаблона.
- **Incremental / event-replay hydration** (v18+, \`withEventReplay()\`, \`withIncrementalHydration()\`) — гидрация по требованию: блок становится интерактивным только при взаимодействии, события буферизуются и воспроизводятся. Это уменьшает объём JS, исполняемого на старте, и улучшает INP/TBT.

Итог: non-destructive hydration + deferrable views дают быстрый SSR-контент без «двойного рендера» и с меньшим bundle на старте.`,
      en: `## Hydration in Angular

SSR ships ready HTML, but without JS it is not interactive. **Hydration** is the process where Angular on the client "picks up" the server DOM and attaches handlers, restoring interactivity.

## Destructive vs Non-destructive

- **Destructive (the old pre-v16 approach)**: Angular on the client **destroyed** the server DOM and re-rendered from scratch. This caused flicker, extra layout recompute, and poor CLS/LCP.
- **Non-destructive hydration (v16+, \`provideClientHydration()\`)**: Angular **reuses** the existing DOM, matching it against its own tree, and only attaches event listeners and state. No re-render, no flicker.

\`\`\`ts
bootstrapApplication(AppComponent, {
  providers: [provideClientHydration()],
});
\`\`\`

## What to know

- Server and client render must produce **identical** DOM, otherwise a hydration mismatch (error \`NG0500\`). Causes: direct DOM manipulation, \`Date.now()\`, random values, invalid HTML.
- \`ngSkipHydration\` — mark a component that cannot be hydrated (e.g. a third-party one mutating the DOM).

## Deferrable views and partial hydration

- \`@defer\` (v17+) defers loading and rendering a block until a trigger (viewport, interaction, idle) — code splitting at the template level.
- **Incremental / event-replay hydration** (v18+, \`withEventReplay()\`, \`withIncrementalHydration()\`) — on-demand hydration: a block becomes interactive only on interaction, events are buffered and replayed. This reduces the JS executed at startup and improves INP/TBT.

Bottom line: non-destructive hydration + deferrable views deliver fast SSR content without a "double render" and with a smaller startup bundle.`
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
      ru: `## Уменьшение размера бандла

### Code splitting
Разбиение кода на чанки, загружаемые по требованию, вместо одного гигантского бандла. Базовый приём — **ленивая загрузка маршрутов**:

\`\`\`ts
export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component')
      .then((m) => m.AdminComponent),
  },
];
\`\`\`

Пользователь скачивает код страницы только при переходе на неё → меньше initial bundle → быстрее TTI/LCP.

### Tree shaking
Сборщик (esbuild/Rollup/webpack) удаляет неиспользуемый код, опираясь на **статические** ES-модули (\`import\`/\`export\`). Работает только если:
- используется ESM, а не CommonJS;
- нет побочных эффектов (\`"sideEffects": false\` в package.json);
- импортируются конкретные символы, а не весь модуль (\`import { debounce } from ...\`, не весь lodash).

### Дополнительные техники
- **Dynamic \`import()\`** для тяжёлых редко используемых библиотек.
- **\`@defer\`** в Angular для отложенного рендера компонентов.
- **Анализ бандла**: source-map-explorer, webpack-bundle-analyzer — находить «толстые» зависимости.
- **Замена тяжёлых библиотек** на лёгкие (moment → date-fns/dayjs).
- **Минификация, gzip/brotli** на сервере/CDN.
- **Удаление полифилов** для устаревших браузеров.

## Метрики
Следите за **TBT (Total Blocking Time)** и **JS bundle size**: каждый лишний килобайт JS дороже килобайта картинки, потому что его надо распарсить и исполнить. Цель — отдать минимум критического JS и догружать остальное лениво.`,
      en: `## Reducing bundle size

### Code splitting
Splitting code into chunks loaded on demand instead of one giant bundle. The basic technique is **lazy route loading**:

\`\`\`ts
export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component')
      .then((m) => m.AdminComponent),
  },
];
\`\`\`

The user downloads a page's code only when navigating to it → smaller initial bundle → faster TTI/LCP.

### Tree shaking
The bundler (esbuild/Rollup/webpack) removes unused code based on **static** ES modules (\`import\`/\`export\`). It only works if:
- ESM is used, not CommonJS;
- there are no side effects (\`"sideEffects": false\` in package.json);
- specific symbols are imported, not the whole module (\`import { debounce } from ...\`, not all of lodash).

### Additional techniques
- **Dynamic \`import()\`** for heavy, rarely used libraries.
- **\`@defer\`** in Angular for deferred component rendering.
- **Bundle analysis**: source-map-explorer, webpack-bundle-analyzer — to find "fat" dependencies.
- **Replacing heavy libraries** with light ones (moment → date-fns/dayjs).
- **Minification, gzip/brotli** on the server/CDN.
- **Dropping polyfills** for legacy browsers.

## Metrics
Watch **TBT (Total Blocking Time)** and **JS bundle size**: every extra kilobyte of JS is costlier than a kilobyte of image because it must be parsed and executed. The goal is to ship the minimum critical JS and lazy-load the rest.`
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
      ru: `## HTTP-кэширование

### Cache-Control
Главный заголовок управления кэшем:
- \`max-age=31536000\` — сколько секунд ресурс «свежий».
- \`immutable\` — не перепроверять до истечения (для версионированных файлов).
- \`no-cache\` — кэшировать можно, но перед использованием **ревалидировать**.
- \`no-store\` — не кэшировать вообще (чувствительные данные).
- \`private\` / \`public\` — можно ли кэшировать на CDN/прокси.
- \`stale-while-revalidate\` — отдать устаревшее, обновить в фоне.

### ETag и валидация
ETag — хэш/версия ресурса. При истечении свежести браузер шлёт \`If-None-Match: <etag>\`. Сервер отвечает \`304 Not Modified\` без тела, если ничего не изменилось → экономия трафика. Аналогично работает \`Last-Modified\` + \`If-Modified-Since\`.

## Стратегия для статики (cache busting)
Файлы с хэшем в имени (\`app.4f3a1.js\`) кэшируются «навечно»:

\`\`\`
Cache-Control: public, max-age=31536000, immutable
\`\`\`

При деплое меняется имя файла → новый URL → браузер качает заново. \`index.html\` при этом — \`no-cache\`, чтобы всегда подтягивать актуальные ссылки.

## Стратегия для API
- Часто меняющиеся данные: \`no-cache\` + ETag для дешёвой ревалидации.
- Редко меняющиеся справочники: \`max-age\` небольшой + \`stale-while-revalidate\`.
- Приватные данные: \`private, no-store\`.

## Уровни кэша
Browser cache → Service Worker → CDN edge → origin. Правильно настроенный CDN снимает большую часть нагрузки и снижает TTFB. Цель — отдавать неизменный контент из кэша и платить за сеть только когда данные реально обновились.`,
      en: `## HTTP caching

### Cache-Control
The main cache-control header:
- \`max-age=31536000\` — how many seconds the resource is "fresh".
- \`immutable\` — do not revalidate before expiry (for versioned files).
- \`no-cache\` — caching is allowed, but **revalidate** before use.
- \`no-store\` — do not cache at all (sensitive data).
- \`private\` / \`public\` — whether a CDN/proxy may cache.
- \`stale-while-revalidate\` — serve stale, refresh in the background.

### ETag and validation
An ETag is a hash/version of a resource. After freshness expires, the browser sends \`If-None-Match: <etag>\`. The server replies \`304 Not Modified\` with no body if nothing changed → bandwidth savings. \`Last-Modified\` + \`If-Modified-Since\` works similarly.

## Strategy for static assets (cache busting)
Files with a hash in the name (\`app.4f3a1.js\`) are cached "forever":

\`\`\`
Cache-Control: public, max-age=31536000, immutable
\`\`\`

On deploy the filename changes → new URL → the browser re-downloads. Meanwhile \`index.html\` is \`no-cache\` so it always pulls fresh references.

## Strategy for APIs
- Frequently changing data: \`no-cache\` + ETag for cheap revalidation.
- Rarely changing reference data: a small \`max-age\` + \`stale-while-revalidate\`.
- Private data: \`private, no-store\`.

## Cache layers
Browser cache → Service Worker → CDN edge → origin. A well-configured CDN absorbs most of the load and lowers TTFB. The goal is to serve unchanged content from cache and pay the network cost only when data actually changes.`
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
      ru: `## Service Worker

Это скрипт-прокси между приложением и сетью, работающий в отдельном потоке. Он перехватывает \`fetch\`, управляет Cache API, обеспечивает офлайн-работу и push-уведомления. Жизненный цикл: \`install\` → \`activate\` → \`fetch\`.

\`\`\`ts
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});
\`\`\`

## PWA

Progressive Web App = web-приложение, устанавливаемое как нативное: manifest.json (иконки, тема), Service Worker (офлайн, кэш), HTTPS. Даёт installability, офлайн, фоновую синхронизацию.

## Стратегии кэширования

- **Cache First** — сначала кэш, сеть как fallback. Для статики, шрифтов, иконок.
- **Network First** — сначала сеть, кэш при офлайне. Для часто меняющихся данных.
- **Stale-While-Revalidate** — отдать из кэша мгновенно, обновить в фоне. Лучший баланс скорости и свежести.
- **Cache Only / Network Only** — крайние случаи.

## App Shell

Кэшируем «скелет» (HTML/CSS/JS оболочки) для мгновенной загрузки, контент догружаем динамически.

## Готчи

- **Обновление SW**: новый воркер ждёт, пока закроются все вкладки; используйте \`skipWaiting()\` + \`clients.claim()\` осторожно (можно сломать активные сессии).
- **Версионирование кэша**: чистите старые кэши в \`activate\`, иначе пользователи застрянут на старой версии.
- В Angular используется \`@angular/pwa\` и \`ngsw-config.json\` для декларативной настройки.

PWA сильно улучшают повторные визиты (мгновенная загрузка из кэша) и offline-устойчивость.`,
      en: `## Service Worker

It is a proxy script between the app and the network, running on a separate thread. It intercepts \`fetch\`, manages the Cache API, enables offline support and push notifications. Lifecycle: \`install\` → \`activate\` → \`fetch\`.

\`\`\`ts
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});
\`\`\`

## PWA

A Progressive Web App = a web app installable like a native one: manifest.json (icons, theme), a Service Worker (offline, cache), HTTPS. It provides installability, offline, and background sync.

## Caching strategies

- **Cache First** — cache first, network as a fallback. For static assets, fonts, icons.
- **Network First** — network first, cache when offline. For frequently changing data.
- **Stale-While-Revalidate** — serve from cache instantly, refresh in the background. The best balance of speed and freshness.
- **Cache Only / Network Only** — edge cases.

## App Shell

Cache the "skeleton" (the shell HTML/CSS/JS) for instant load, then fetch content dynamically.

## Gotchas

- **SW updates**: a new worker waits until all tabs close; use \`skipWaiting()\` + \`clients.claim()\` carefully (it can break active sessions).
- **Cache versioning**: purge old caches in \`activate\`, otherwise users are stuck on an old version.
- Angular uses \`@angular/pwa\` and \`ngsw-config.json\` for declarative configuration.

PWAs greatly improve repeat visits (instant load from cache) and offline resilience.`
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
      ru: `## Debounce vs Throttle

Оба ограничивают частоту вызова дорогого обработчика для «шумных» событий.

### Debounce
Откладывает вызов до тех пор, пока события не **прекратятся** на заданное время. Выполняется **один раз после** паузы.

\`\`\`ts
function debounce<T extends (...a: any[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
\`\`\`

**Применение**: поиск по вводу (ждём, пока пользователь допишет), autosave, валидация формы, resize-перерасчёт после остановки.

### Throttle
Гарантирует вызов **не чаще** раза в N мс, выполняясь регулярно **во время** потока событий.

**Применение**: scroll-обработчики (infinite scroll, параллакс, sticky-header), отслеживание позиции мыши, аналитика прокрутки.

## Выбор

- Нужен результат **после окончания** ввода → **debounce**.
- Нужны регулярные обновления **в процессе** → **throttle**.

## Важные нюансы

- Для scroll/resize в RxJS: \`debounceTime\`, \`throttleTime\`, \`auditTime\`, \`sampleTime\`.
- Для визуальных обновлений лучше синхронизировать с кадром через \`requestAnimationFrame\` вместо фиксированного интервала.
- Добавьте \`{ passive: true }\` к scroll/touch-слушателям, чтобы не блокировать прокрутку.
- Не забывайте отписываться/очищать таймеры при уничтожении компонента — иначе утечка.`,
      en: `## Debounce vs Throttle

Both limit how often an expensive handler runs for "noisy" events.

### Debounce
Delays the call until events **stop** for a given time. It runs **once after** the pause.

\`\`\`ts
function debounce<T extends (...a: any[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
\`\`\`

**Use for**: search-as-you-type (wait until the user finishes), autosave, form validation, resize recompute after it stops.

### Throttle
Guarantees a call **at most** once per N ms, running regularly **during** the event stream.

**Use for**: scroll handlers (infinite scroll, parallax, sticky header), mouse-position tracking, scroll analytics.

## Choosing

- You need a result **after input ends** → **debounce**.
- You need regular updates **during** the stream → **throttle**.

## Important nuances

- For scroll/resize in RxJS: \`debounceTime\`, \`throttleTime\`, \`auditTime\`, \`sampleTime\`.
- For visual updates, sync with the frame via \`requestAnimationFrame\` instead of a fixed interval.
- Add \`{ passive: true }\` to scroll/touch listeners so you do not block scrolling.
- Remember to unsubscribe/clear timers on component destroy — otherwise a leak.`
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
      ru: `## Виртуальный скроллинг

Идея: рендерить в DOM только **видимые** элементы (плюс небольшой буфер), а не все тысячи. По мере прокрутки элементы переиспользуются (recycling), а общая высота имитируется spacer-ом, чтобы скроллбар был корректным.

## Зачем

- 10 000 строк = 10 000+ DOM-узлов → дорогой layout, paint, память, медленный change detection.
- С виртуализацией в DOM всегда ~20–40 узлов независимо от размера данных. Initial render, память и реактивность остаются постоянными.

## Реализация в Angular (CDK)

\`\`\`html
<cdk-virtual-scroll-viewport itemSize="48" class="viewport">
  <div *cdkVirtualFor="let item of items" class="row">
    {{ item.name }}
  </div>
</cdk-virtual-scroll-viewport>
\`\`\`

\`itemSize\` — высота строки; viewport вычисляет, сколько элементов видно.

## Ограничения и подводные камни

- **Переменная высота** строк сложна: фиксированный \`itemSize\` не подходит, нужна autosize-стратегия, что дороже и менее точно.
- **Ctrl+F / поиск по странице** не находит невидимые элементы (их нет в DOM).
- **SEO**: контент вне DOM не индексируется — не годится для публичных страниц без SSR.
- **Доступность**: скринридеры и навигация по \`Tab\` видят только отрисованные узлы; нужно корректно проставлять \`aria-rowcount\`, \`aria-setsize\`.
- **Скролл-якоря и сохранение позиции** требуют аккуратной обработки.

## Альтернативы

Для умеренных списков иногда достаточно \`content-visibility: auto\` или пагинации. Виртуализация оправдана при действительно больших наборах (тысячи+ элементов) и тяжёлых строках.`,
      en: `## Virtual scrolling

The idea: render only the **visible** items in the DOM (plus a small buffer) instead of all thousands. As you scroll, items are recycled, and the total height is simulated with a spacer so the scrollbar is correct.

## Why

- 10,000 rows = 10,000+ DOM nodes → expensive layout, paint, memory, slow change detection.
- With virtualization the DOM always holds ~20–40 nodes regardless of data size. Initial render, memory, and reactivity stay constant.

## Implementation in Angular (CDK)

\`\`\`html
<cdk-virtual-scroll-viewport itemSize="48" class="viewport">
  <div *cdkVirtualFor="let item of items" class="row">
    {{ item.name }}
  </div>
</cdk-virtual-scroll-viewport>
\`\`\`

\`itemSize\` is the row height; the viewport computes how many items are visible.

## Limitations and pitfalls

- **Variable row height** is hard: a fixed \`itemSize\` does not fit, an autosize strategy is needed, which is costlier and less accurate.
- **Ctrl+F / in-page search** does not find off-screen items (they are not in the DOM).
- **SEO**: content outside the DOM is not indexed — unsuitable for public pages without SSR.
- **Accessibility**: screen readers and \`Tab\` navigation see only rendered nodes; you must set \`aria-rowcount\`, \`aria-setsize\` correctly.
- **Scroll anchoring and position restoration** need careful handling.

## Alternatives

For moderate lists, \`content-visibility: auto\` or pagination can suffice. Virtualization is justified for truly large sets (thousands+ items) and heavy rows.`
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
      ru: `## requestAnimationFrame (rAF)

Колбэк вызывается **прямо перед следующей перерисовкой**, синхронизированно с частотой обновления экрана (обычно 60 Гц = ~16.7 мс). Идеален для **визуальных** обновлений: анимаций, чтения/записи DOM в нужной фазе кадра.

\`\`\`ts
function animate(time: number) {
  el.style.transform = \`translateX(\${(time / 10) % 200}px)\`;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
\`\`\`

**Плюсы**: не выполняется в фоновых вкладках (экономия батареи), всегда совпадает с кадром → нет «рваной» анимации.

## requestIdleCallback (rIC)

Колбэк выполняется, когда браузер **простаивает** в конце кадра, с дедлайном \`deadline.timeRemaining()\`. Для **некритичной фоновой** работы: аналитика, предзагрузка, дедупликация кэша, ленивая инициализация.

\`\`\`ts
requestIdleCallback((deadline) => {
  while (deadline.timeRemaining() > 0 && tasks.length) {
    runTask(tasks.shift());
  }
});
\`\`\`

**Готча**: может долго не вызываться, если страница занята; задайте \`{ timeout }\` как страховку. Safari исторически имел слабую поддержку.

## Когда что

| Задача | Инструмент |
| --- | --- |
| Анимация, скролл-эффекты, DOM-чтения по кадру | rAF |
| Фоновая некритичная работа, предзагрузка | rIC |
| Дробление длинной задачи для INP | \`scheduler.postTask\`/\`scheduler.yield\` |

## Связь с производительностью

Использование rAF удерживает анимации в бюджете кадра, а rIC выносит «лишнюю» работу из критического пути, улучшая INP/TBT. Не делайте тяжёлые вычисления в rAF — это съест бюджет кадра и вызовет дропы.`,
      en: `## requestAnimationFrame (rAF)

The callback runs **right before the next repaint**, synchronized with the screen refresh rate (usually 60 Hz = ~16.7 ms). Ideal for **visual** updates: animations, reading/writing the DOM in the right frame phase.

\`\`\`ts
function animate(time: number) {
  el.style.transform = \`translateX(\${(time / 10) % 200}px)\`;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
\`\`\`

**Pros**: does not run in background tabs (saves battery), always aligns with the frame → no torn animation.

## requestIdleCallback (rIC)

The callback runs when the browser is **idle** at the end of a frame, with a \`deadline.timeRemaining()\`. For **non-critical background** work: analytics, prefetching, cache dedup, lazy initialization.

\`\`\`ts
requestIdleCallback((deadline) => {
  while (deadline.timeRemaining() > 0 && tasks.length) {
    runTask(tasks.shift());
  }
});
\`\`\`

**Gotcha**: it may not fire for a while if the page is busy; set a \`{ timeout }\` as a safeguard. Safari historically had weak support.

## When to use which

| Task | Tool |
| --- | --- |
| Animation, scroll effects, per-frame DOM reads | rAF |
| Background non-critical work, prefetching | rIC |
| Splitting a long task for INP | \`scheduler.postTask\`/\`scheduler.yield\` |

## Performance link

Using rAF keeps animations within the frame budget, and rIC moves "extra" work off the critical path, improving INP/TBT. Do not run heavy computation in rAF — it eats the frame budget and causes drops.`
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
      ru: `## IntersectionObserver

API асинхронно сообщает, когда целевой элемент пересекает viewport (или заданный \`root\`-контейнер) на заданный порог. Браузер делает наблюдение **вне main thread**, без опроса.

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

## Почему лучше scroll-слушателей

- **scroll** срабатывает десятки раз в секунду; внутри обычно вызывают \`getBoundingClientRect()\` → **forced reflow** на каждый кадр, дёрганье и нагрузка на CPU.
- **IntersectionObserver** считает пересечения нативно, батчит и отдаёт колбэк только при изменении состояния → дёшево и плавно.

## Параметры

- \`root\` — контейнер отсчёта (по умолчанию viewport).
- \`rootMargin\` — расширяет/сужает зону (например, \`'200px'\` для предзагрузки заранее).
- \`threshold\` — доля видимости (0…1 или массив порогов).

## Применения

- Lazy loading изображений/компонентов.
- Infinite scroll (sentinel-элемент в конце списка).
- Аналитика видимости (impression tracking).
- Анимации появления, sticky/active-секции в оглавлении.

## Готчи

- Колбэк асинхронный — не полагайтесь на мгновенность.
- Не забывайте \`unobserve\`/\`disconnect\` при уничтожении компонента (утечка).
- Для непрерывного процента видимости используйте массив \`threshold\`.`,
      en: `## IntersectionObserver

The API asynchronously reports when a target element intersects the viewport (or a given \`root\` container) at a set threshold. The browser observes **off the main thread**, without polling.

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

## Why it beats scroll listeners

- **scroll** fires dozens of times per second; handlers typically call \`getBoundingClientRect()\` → a **forced reflow** every frame, jank, and CPU load.
- **IntersectionObserver** computes intersections natively, batches them, and calls back only on state change → cheap and smooth.

## Options

- \`root\` — the reference container (viewport by default).
- \`rootMargin\` — expands/shrinks the zone (e.g. \`'200px'\` to prefetch early).
- \`threshold\` — the visibility fraction (0…1 or an array of thresholds).

## Use cases

- Lazy loading images/components.
- Infinite scroll (a sentinel element at the end of the list).
- Visibility analytics (impression tracking).
- Reveal animations, sticky/active sections in a table of contents.

## Gotchas

- The callback is asynchronous — do not rely on instant timing.
- Remember \`unobserve\`/\`disconnect\` on component destroy (leak).
- For a continuous visibility percentage use a \`threshold\` array.`
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
      ru: `## Источники утечек в SPA

### 1. Неотписанные подписки и слушатели
RxJS-подписки, \`addEventListener\`, \`setInterval\` живут после уничтожения компонента и держат ссылки на него.

\`\`\`ts
// Angular: автоотписка
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.stream$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(/* ... */);
}
\`\`\`

### 2. Detached DOM
Удалили узел из дерева, но JS-переменная/замыкание всё ещё на него ссылается → узел и его поддерево не собираются GC.

### 3. Замыкания и глобальные ссылки
Долгоживущие объекты (синглтон-сервисы, кэши, статические \`Map\`) накапливают записи и держат старые компоненты.

### 4. Таймеры и observers
\`setInterval\`, \`IntersectionObserver\`, \`ResizeObserver\`, \`MutationObserver\` без \`clear\`/\`disconnect\`.

### 5. Сторонние библиотеки
Чарты, карты, редакторы часто требуют ручного \`destroy()\`.

## Обнаружение

- **Chrome DevTools → Memory → Heap snapshot**: фильтр \`Detached\` показывает detached DOM-узлы.
- **Allocation timeline / Performance Monitor**: растущая «JS heap size» и «DOM Nodes» при повторяющихся навигациях = утечка.
- Сделайте snapshot, выполните сценарий N раз, сравните snapshots (comparison view) — растущие объекты = подозрительны.

## Предотвращение

- Всегда очищайте подписки/таймеры/слушателей в \`ngOnDestroy\`/\`destroyRef\`.
- Используйте \`WeakMap\`/\`WeakRef\` для кэшей по DOM-узлам.
- \`AbortController\` для \`fetch\` и \`addEventListener\` (\`{ signal }\`).
- В Angular OnPush + signals снижают число висящих ссылок.

Профилактика дешевле отладки: утечки в долгоживущих SPA проявляются как постепенное замедление и рост памяти за сессию.`,
      en: `## Sources of leaks in SPAs

### 1. Un-unsubscribed subscriptions and listeners
RxJS subscriptions, \`addEventListener\`, \`setInterval\` outlive a destroyed component and keep references to it.

\`\`\`ts
// Angular: auto-unsubscribe
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.stream$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(/* ... */);
}
\`\`\`

### 2. Detached DOM
You removed a node from the tree, but a JS variable/closure still references it → the node and its subtree are not garbage-collected.

### 3. Closures and global references
Long-lived objects (singleton services, caches, static \`Map\`s) accumulate entries and hold old components.

### 4. Timers and observers
\`setInterval\`, \`IntersectionObserver\`, \`ResizeObserver\`, \`MutationObserver\` without \`clear\`/\`disconnect\`.

### 5. Third-party libraries
Charts, maps, editors often require a manual \`destroy()\`.

## Detection

- **Chrome DevTools → Memory → Heap snapshot**: the \`Detached\` filter shows detached DOM nodes.
- **Allocation timeline / Performance Monitor**: a growing "JS heap size" and "DOM Nodes" over repeated navigations = a leak.
- Take a snapshot, run the scenario N times, compare snapshots (comparison view) — growing objects are suspicious.

## Prevention

- Always clean up subscriptions/timers/listeners in \`ngOnDestroy\`/\`destroyRef\`.
- Use \`WeakMap\`/\`WeakRef\` for caches keyed by DOM nodes.
- \`AbortController\` for \`fetch\` and \`addEventListener\` (\`{ signal }\`).
- In Angular, OnPush + signals reduce the number of dangling references.

Prevention is cheaper than debugging: leaks in long-lived SPAs show up as gradual slowdown and memory growth over a session.`
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
      ru: `## CDN

Content Delivery Network — географически распределённые edge-серверы, кэширующие контент ближе к пользователю. Снижает **RTT** и **TTFB**, разгружает origin, поглощает трафик и DDoS. Современные CDN также делают сжатие, оптимизацию изображений и edge-вычисления.

## HTTP/1.1 — проблема

- **Head-of-line blocking**: на одном соединении запросы обрабатываются последовательно.
- Браузер открывает лишь ~6 соединений на домен → отсюда старые хаки domain sharding и спрайты.

## HTTP/2

- **Multiplexing**: множество запросов/ответов параллельно по **одному** TCP-соединению, разбитые на frames и потоки. Domain sharding и конкатенация больше не нужны.
- **Header compression (HPACK)**, **server push** (сейчас почти не используется), приоритизация потоков.
- Ограничение: HoL-blocking остаётся на уровне **TCP** — потеря одного пакета тормозит все потоки.

## HTTP/3 (QUIC)

- Работает поверх **UDP** + QUIC, решает TCP-level HoL-blocking: потери в одном потоке не блокируют другие.
- Быстрее установка соединения (0-RTT/1-RTT, TLS встроен), лучше на нестабильных мобильных сетях, бесшовная миграция соединения при смене сети.

## Connection multiplexing

Это передача множества независимых логических потоков по одному физическому соединению, чтобы не платить за установку соединения каждый раз и не упираться в лимит параллельных соединений.

## Практический эффект

- На HTTP/2/3 мелкая разбивка на чанки **дешевле** (нет штрафа за число запросов) → лучше кэширование per-chunk.
- CDN + HTTP/3 значительно улучшают TTFB и LCP, особенно на мобильных и в удалённых регионах.`,
      en: `## CDN

A Content Delivery Network — geographically distributed edge servers caching content closer to the user. It lowers **RTT** and **TTFB**, offloads the origin, and absorbs traffic and DDoS. Modern CDNs also do compression, image optimization, and edge computing.

## HTTP/1.1 — the problem

- **Head-of-line blocking**: on a single connection, requests are processed sequentially.
- The browser opens only ~6 connections per domain → hence the old hacks of domain sharding and sprites.

## HTTP/2

- **Multiplexing**: many requests/responses in parallel over **one** TCP connection, split into frames and streams. Domain sharding and concatenation are no longer needed.
- **Header compression (HPACK)**, **server push** (now rarely used), stream prioritization.
- Limitation: HoL blocking remains at the **TCP** level — a single lost packet stalls all streams.

## HTTP/3 (QUIC)

- Runs over **UDP** + QUIC, solving TCP-level HoL blocking: loss in one stream does not block others.
- Faster connection setup (0-RTT/1-RTT, TLS built in), better on unstable mobile networks, seamless connection migration when the network changes.

## Connection multiplexing

This is carrying many independent logical streams over a single physical connection, so you do not pay for connection setup each time or hit the parallel-connection limit.

## Practical effect

- On HTTP/2/3, fine-grained chunk splitting is **cheaper** (no penalty per request) → better per-chunk caching.
- CDN + HTTP/3 significantly improve TTFB and LCP, especially on mobile and in remote regions.`
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
      ru: `## Change Detection в Angular

По умолчанию Angular использует **Zone.js**, который перехватывает все асинхронные операции (события, таймеры, XHR) и запускает change detection по **всему** дереву компонентов. На больших приложениях это дорого.

## OnPush

\`ChangeDetectionStrategy.OnPush\` говорит Angular проверять компонент только когда:
- изменилась ссылка на \`@Input\`;
- сработало событие из шаблона компонента;
- эмитнул подписанный через \`async\`-pipe Observable;
- вручную вызван \`markForCheck()\`.

Это **отсекает** поддеревья от проверки → меньше работы за цикл CD, лучше INP/TBT. Требует **иммутабельности** входных данных.

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {}
\`\`\`

## Signals

Сигналы (v16+) дают **гранулярную** реактивность: Angular точно знает, какие представления зависят от какого сигнала, и обновляет **только** их, минуя обход всего дерева. Это путь к точечному, эффективному рендеру.

\`\`\`ts
count = signal(0);
doubled = computed(() => this.count() * 2);
\`\`\`

## Zoneless

В zoneless-режиме (\`provideZonelessChangeDetection()\`, экспериментально/стабилизируется) убирается Zone.js. Change detection триггерится **явно** — сигналами, событиями, \`async\`-pipe. Плюсы: меньше bundle (нет Zone.js ~13 КБ gzip), нет «слепых» полных проходов, предсказуемость, лучше INP.

## Дополнительно

- \`trackBy\` / \`@for\` с \`track\` — переиспользование DOM-узлов вместо пересоздания.
- \`runOutsideAngular\` для частых событий (mousemove, scroll), чтобы не дёргать CD.
- Чистые pipe-ы вместо методов в шаблоне.

Связка **OnPush + signals + zoneless** — это направление Angular к минимальной, точечной работе рендеринга и хорошим Core Web Vitals.`,
      en: `## Change Detection in Angular

By default Angular uses **Zone.js**, which intercepts all async operations (events, timers, XHR) and runs change detection over the **entire** component tree. On large apps this is expensive.

## OnPush

\`ChangeDetectionStrategy.OnPush\` tells Angular to check a component only when:
- an \`@Input\` reference changed;
- an event fired from the component's template;
- an Observable subscribed via the \`async\` pipe emitted;
- \`markForCheck()\` was called manually.

This **prunes** subtrees from checking → less work per CD cycle, better INP/TBT. It requires **immutable** input data.

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {}
\`\`\`

## Signals

Signals (v16+) provide **granular** reactivity: Angular knows exactly which views depend on which signal and updates **only** those, skipping the whole-tree traversal. This is the path to targeted, efficient rendering.

\`\`\`ts
count = signal(0);
doubled = computed(() => this.count() * 2);
\`\`\`

## Zoneless

In zoneless mode (\`provideZonelessChangeDetection()\`, experimental/stabilizing) Zone.js is removed. Change detection is triggered **explicitly** — by signals, events, the \`async\` pipe. Pros: smaller bundle (no Zone.js, ~13 KB gzip), no "blind" full passes, predictability, better INP.

## Additionally

- \`trackBy\` / \`@for\` with \`track\` — reuse DOM nodes instead of recreating them.
- \`runOutsideAngular\` for frequent events (mousemove, scroll) so they do not trigger CD.
- Pure pipes instead of template methods.

The combination **OnPush + signals + zoneless** is Angular's direction toward minimal, targeted rendering work and good Core Web Vitals.`
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
      ru: `## Проблема

Когда изображение/видео/iframe загружается без зарезервированной высоты, контент «прыгает» → растёт CLS. Браузеру нужно знать соотношение сторон **до** загрузки ресурса.

## Старый способ — padding-hack

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

Работает, но требует обёртки, абсолютного позиционирования, магических чисел и ломает поток.

## Современный способ — aspect-ratio

\`\`\`css
.media {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
}
\`\`\`

Никаких обёрток и хаков. Браузер резервирует место под нужную высоту сразу, ещё до загрузки ресурса → нулевой сдвиг.

## Для <img>

Если у \`<img>\` заданы атрибуты \`width\` и \`height\`, современные браузеры **сами** вычисляют \`aspect-ratio\` из них и резервируют место — это самый надёжный способ:

\`\`\`html
<img src="photo.jpg" width="1600" height="900" alt="..." />
\`\`\`

## Преимущества aspect-ratio

- Чистый, декларативный, без лишнего DOM.
- Работает с \`object-fit\` для кадрирования.
- Сочетается с intrinsic sizing и Grid/Flexbox.
- Можно переопределять адаптивно по media-запросам.

## Готча
\`aspect-ratio\` отступает, если заданы и \`width\`, и \`height\` явно конфликтующие; и если контент внутри больше расчётной высоты, блок может растянуться (используйте \`min-height: 0\`/\`overflow\` при необходимости). Для медиа это лучший инструмент против CLS.`,
      en: `## The problem

When an image/video/iframe loads without reserved height, content "jumps" → CLS rises. The browser needs to know the aspect ratio **before** the resource loads.

## The old way — the padding hack

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

It works but requires a wrapper, absolute positioning, magic numbers, and it breaks the flow.

## The modern way — aspect-ratio

\`\`\`css
.media {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
}
\`\`\`

No wrappers or hacks. The browser reserves space for the right height immediately, before the resource loads → zero shift.

## For <img>

If an \`<img>\` has \`width\` and \`height\` attributes, modern browsers **automatically** compute \`aspect-ratio\` from them and reserve space — the most reliable approach:

\`\`\`html
<img src="photo.jpg" width="1600" height="900" alt="..." />
\`\`\`

## Advantages of aspect-ratio

- Clean, declarative, no extra DOM.
- Works with \`object-fit\` for cropping.
- Composes with intrinsic sizing and Grid/Flexbox.
- Can be overridden responsively via media queries.

## Gotcha
\`aspect-ratio\` yields when both \`width\` and \`height\` are explicitly conflicting; and if inner content exceeds the computed height, the box may stretch (use \`min-height: 0\`/\`overflow\` if needed). For media it is the best tool against CLS.`
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
      ru: `## Инструменты диагностики рендеринга

### Performance panel
Запись профиля показывает покадровый разбор: **Scripting** (жёлтый), **Rendering/Layout** (фиолетовый), **Painting** (зелёный), **Compositing**. Красные маркеры — dropped frames и long tasks (> 50 мс). Здесь видно forced reflow и где тратится бюджет кадра.

### Rendering tab (Cmd/Ctrl+Shift+P → "Show Rendering")
- **Paint flashing** — подсвечивает перерисовываемые области зелёным. Если при скролле/анимации мигает много — лишний repaint.
- **Layout Shift Regions** — синие вспышки в местах сдвигов (диагностика CLS).
- **Frame Rendering Stats / FPS meter** — реальный FPS, GPU memory, число слоёв.
- **Layer borders** — границы композиторных слоёв.

### Layers panel
3D-визуализация композиторных слоёв: сколько их, почему элемент промоутнут, сколько памяти занимает. Помогает найти **layer explosion** (слишком много слоёв из-за \`will-change\`/\`translateZ\`).

### Coverage tab
Показывает неиспользуемый CSS/JS — кандидаты на удаление и code splitting.

### Performance Monitor
Живые графики: CPU, JS heap, DOM Nodes, layouts/sec, style recalcs/sec. Рост DOM Nodes при навигациях = утечка.

## Методика

1. Записать профиль типового сценария (скролл, открытие модалки).
2. Найти long tasks и фиолетовые Layout-блоки с warning \`Forced reflow\`.
3. Включить Paint flashing — убедиться, что перерисовывается только нужное.
4. Проверить число слоёв в Layers.
5. Подтвердить улучшение по FPS meter и повторному профилю.

Объективные числа важнее ощущений: всегда измеряйте до и после оптимизации.`,
      en: `## Rendering-diagnostics tools

### Performance panel
Recording a profile shows a per-frame breakdown: **Scripting** (yellow), **Rendering/Layout** (purple), **Painting** (green), **Compositing**. Red markers are dropped frames and long tasks (> 50 ms). Here you see forced reflows and where the frame budget goes.

### Rendering tab (Cmd/Ctrl+Shift+P → "Show Rendering")
- **Paint flashing** — highlights repainted areas in green. If much flashes during scroll/animation, there is excess repaint.
- **Layout Shift Regions** — blue flashes where shifts happen (CLS diagnosis).
- **Frame Rendering Stats / FPS meter** — real FPS, GPU memory, layer count.
- **Layer borders** — compositor layer outlines.

### Layers panel
A 3D visualization of compositor layers: how many there are, why an element was promoted, how much memory it uses. Helps find a **layer explosion** (too many layers from \`will-change\`/\`translateZ\`).

### Coverage tab
Shows unused CSS/JS — candidates for removal and code splitting.

### Performance Monitor
Live charts: CPU, JS heap, DOM Nodes, layouts/sec, style recalcs/sec. Growing DOM Nodes across navigations = a leak.

## Methodology

1. Record a profile of a typical scenario (scroll, opening a modal).
2. Find long tasks and purple Layout blocks with a \`Forced reflow\` warning.
3. Enable Paint flashing — confirm only the needed area repaints.
4. Check the layer count in Layers.
5. Confirm improvement via the FPS meter and a re-profile.

Objective numbers beat feelings: always measure before and after an optimization.`
    }
  }
];
