import { InterviewQuestion } from '../interfaces/question.interface';

export const JS_TS_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'jsts-001',
    category: 'js-state',
    level: 'Hard',
    tags: ['event-loop', 'microtasks', 'rendering'],
    question: {
      ru: 'Как устроен Event Loop в браузере? Объясните разницу между macrotask и microtask и когда происходит рендеринг.',
      en: 'How does the browser Event Loop work? Explain the difference between macrotasks and microtasks and when rendering happens.'
    },
    answer: {
      ru: `## Коротко

JavaScript умеет делать только **одно дело за раз** — у него один поток. Event Loop («цикл событий») — это диспетчер, который решает, какой кусок кода запустить следующим.

Представь одну кассу в магазине: касса одна, к ней стоит очередь. Кассир обслуживает по одному человеку и никогда двоих сразу.

## Очередей на самом деле две

- **Макрозадачи (macrotask)** — обычная очередь: \`setTimeout\`, \`setInterval\`, клики и другие события DOM, загрузка данных. За один круг берётся **ровно одна** задача отсюда.
- **Микрозадачи (microtask)** — VIP-очередь: \`.then()\` у промисов, \`await\`, \`queueMicrotask\`, \`MutationObserver\`. Их разгребают **целиком, все до последней**, и только потом идут дальше.

Аналогия: макрозадачи — обычные покупатели, микрозадачи — те, кто «только спросить». Кассир обслужил одного покупателя → пропустил **всех** «спросить» → взял следующего покупателя.

## Полный список макрозадач (task)

Всё, что браузер кладёт в обычную очередь и берёт **по одной** за тик:

- **Таймеры:** \`setTimeout\`, \`setInterval\`.
- **События от пользователя:** \`click\`, \`dblclick\`, \`keydown\`/\`keyup\`, \`input\`, \`change\`, \`submit\`, \`focus\`/\`blur\`, \`pointermove\`, \`wheel\`, \`touchstart\`, \`drop\`.
- **События жизненного цикла и ресурсов:** \`DOMContentLoaded\`, \`load\`/\`error\` у \`window\`, \`<img>\`, \`<script>\`, \`<link>\`, \`<iframe>\`, \`pageshow\`, \`visibilitychange\`, \`beforeunload\`.
- **Навигация и хранилище:** \`hashchange\`, \`popstate\`, \`storage\` (событие из другой вкладки).
- **Сообщения:** \`window.postMessage\`, \`MessageChannel\`/\`MessagePort\`, \`BroadcastChannel\`, \`onmessage\` от Web Worker и Service Worker, \`EventSource\` (SSE), \`WebSocket\` (\`onopen\`/\`onmessage\`/\`onclose\`).
- **Сеть и I/O:** колбэки \`XMLHttpRequest\` (\`onload\`, \`onreadystatechange\`, \`onprogress\`), \`FileReader\`, \`navigator.geolocation\`, \`IndexedDB\` (\`onsuccess\`/\`onerror\`).
- **Выполнение самого скрипта:** каждый \`<script>\`, который разобрал парсер, — это отдельная задача.
- **Планирование с приоритетом:** \`scheduler.postTask()\` — та же очередь задач, но с явными приоритетами (\`user-blocking\`, \`user-visible\`, \`background\`) и \`scheduler.yield()\` для «отдать управление браузеру и продолжить».
- **\`requestIdleCallback\`** — задача самого низкого приоритета: выполняется, если у браузера остаётся свободное время в конце кадра.
- Node.js: \`setImmediate\` — отдельная фаза *check*; в браузере такого API нет.

Важный нюанс про \`fetch\`: ответ по сети приходит **задачей**, но ваш \`.then()\` на этом ответе — уже **микрозадача**.

## Полный список микрозадач (microtask)

- **Промисы:** колбэки \`.then()\`, \`.catch()\`, \`.finally()\` и разрешение \`Promise.all\`, \`allSettled\`, \`race\`, \`any\`.
- **\`await\`** — весь код после него.
- **\`queueMicrotask()\`** — прямой способ положить колбэк в эту очередь.
- **\`MutationObserver\`** — колбэк об изменениях DOM.
- **Реакции кастомных элементов** — \`connectedCallback\`, \`attributeChangedCallback\` и прочие, когда их не вызывает напрямую парсер.
- **Стримы:** промисы \`ReadableStream\`/\`WritableStream\` — \`reader.read()\`, \`writer.write()\`.
- **Динамический \`import()\`** — разрешение промиса (сама загрузка файла, разумеется, задача).
- **Любой промисный API платформы:** \`fetch().then\`, \`response.json()\`, \`caches.match\`, \`navigator.locks.request\`, \`crypto.subtle.digest\`, \`el.requestFullscreen()\`, \`Atomics.waitAsync\`.
- Node.js: \`process.nextTick\` — **отдельная очередь с приоритетом выше промисов**, она опустошается перед микрозадачами.

## Ни то, ни другое

Часть колбэков живёт в **фазе рендеринга** и не попадает ни в одну из двух очередей:

- **\`requestAnimationFrame\`** — перед отрисовкой кадра, уже после микрозадач.
- **\`ResizeObserver\`** — внутри той же фазы, после rAF и до paint, поэтому реакция на изменение размера успевает в тот же кадр.
- **\`IntersectionObserver\`** — пересечения считаются в фазе рендеринга, а колбэк доставляется задачей после неё.
- **Событие \`scroll\`** — не отдельная задача, а шаг фазы рендеринга.
- **CSS-анимации и transition** — считаются вне JS, но их события (\`transitionend\`, \`animationend\`) прилетают задачами.
- **\`el.dispatchEvent(...)\` и \`el.click()\`** — вообще **синхронный** вызов: слушатели выполняются здесь и сейчас, никакой очереди нет.

## Порядок одного круга (тика)

1. Выполнить синхронный код — то, что написано прямо сейчас, сверху вниз.
2. Выполнить **все** микрозадачи (и те, что появились во время выполнения микрозадач, — тоже).
3. Если пора рисовать кадр — отрисовать: \`requestAnimationFrame\` → пересчёт стилей → layout → paint. Обычно ~60 раз в секунду.
4. Взять **одну** макрозадачу и вернуться к пункту 2.

## Пример

\`\`\`js
console.log('1');
setTimeout(() => console.log('2'));              // макрозадача
Promise.resolve().then(() => console.log('3'));  // микрозадача
console.log('4');
// Выведет: 1, 4, 3, 2
\`\`\`

Почему так: \`1\` и \`4\` — синхронный код, он всегда первый. Потом VIP-очередь — \`3\`. И только в самом конце обычная очередь — \`2\`.

## Почему \`queueMicrotask\` вклинивается в середину цепочки

Пример ниже удивляет чаще всего: между \`promise 1\` и \`promise 2\` успевает влезть \`queueMicrotask\`, хотя цепочка написана выше.

\`\`\`js
Promise.resolve()
  .then(() => console.log('promise 1'))
  .then(() => console.log('promise 2'));
queueMicrotask(() => console.log('queueMicrotask'));
// promise 1, queueMicrotask, promise 2
\`\`\`

Работают два правила: очередь микрозадач — **строгая FIFO**, а звено \`.then()\` попадает в очередь только в тот момент, когда предыдущее звено **завершилось**. Цепочка не планируется целиком заранее — она планируется по одному звену за тик.

Что происходит в синхронной фазе:

1. \`Promise.resolve()\` — промис **уже разрешён**.
2. \`.then(promise 1)\` цепляется к разрешённому промису, поэтому его колбэк ставится в очередь немедленно.
3. \`.then(promise 2)\` цепляется к промису, который вернул первый \`.then\`, — а он ещё **pending**. Планировать нечего, колбэк просто запоминается как реакция на будущее разрешение.
4. \`queueMicrotask\` встаёт в очередь вторым.

Очередь на конец синхронного кода: \`[promise 1, queueMicrotask]\` — \`promise 2\` в ней **отсутствует**.

Дальше разгребание:

- достаём \`promise 1\` → печатает; колбэк вернул \`undefined\`, и это разрешает промис второго звена → только **сейчас** \`promise 2\` встаёт в очередь, и встаёт **в конец**, за \`queueMicrotask\`;
- достаём \`queueMicrotask\` → печатает;
- достаём \`promise 2\` → печатает.

То есть \`promise 2\` проигрывает не потому, что \`queueMicrotask\` приоритетнее, а потому что в момент его постановки в очередь \`queueMicrotask\` там уже стоял. Проверьте себя: перенесите \`queueMicrotask\` **выше** цепочки — станет \`queueMicrotask → promise 1 → promise 2\`; добавьте третье звено — оно уедет ещё на тик дальше: \`promise 1 → queueMicrotask → promise 2 → promise 3\`.

Мнемоника: **\`.then\` — это не «запланировать всю цепочку», а «подписаться на один шаг»**. Длина цепочки равна количеству тиков.

## Что сказать на собеседовании

> В JS один поток, поэтому браузер использует Event Loop: он по очереди достаёт задачи и отдаёт их движку. Очередей две — макрозадачи (setTimeout, события DOM) и микрозадачи (промисы, queueMicrotask). За один тик выполняется одна макрозадача, после неё **полностью** опустошается очередь микрозадач, и только потом браузер может отрисовать кадр. Поэтому промисы всегда срабатывают раньше setTimeout, а бесконечный поток микрозадач способен подвесить страницу — до рендера очередь просто не доходит.

## Ловушки, на которых ловят

- \`setTimeout(fn, 0)\` **не значит «сразу»**: у вложенных таймеров минимум ~4 мс, а во вкладке в фоне браузер их сильно тормозит.
- Микрозадачи могут **заморозить страницу**: если \`.then()\` бесконечно добавляет новый \`.then()\`, до рендеринга и до \`setTimeout\` очередь не дойдёт никогда.
- \`requestAnimationFrame\` — это **не** макро- и не микрозадача: он выполняется прямо перед отрисовкой кадра, то есть уже после микрозадач.
- \`await\` — это сахар над \`.then()\`, поэтому весь код **после** \`await\` — это микрозадача.
- Очередь микрозадач опустошается **после каждой** макрозадачи, а не один раз за круг: два \`setTimeout\`, каждый со своим \`.then()\`, дадут \`t1 → p1 → t2 → p2\`, а не \`t1 → t2 → p1 → p2\`.
- На **настоящем** клике микрозадачи разгребаются между слушателями, а при \`el.click()\` из кода — нет: стек не пуст, поэтому сначала отработают все слушатели.`,
      en: `## In short

JavaScript can only do **one thing at a time** — it has a single thread. The Event Loop is the dispatcher that decides which piece of code runs next.

Picture a shop with one till: there's one cashier and a queue. They serve one person at a time, never two at once.

## There are actually two queues

- **Macrotasks** — the regular queue: \`setTimeout\`, \`setInterval\`, clicks and other DOM events, I/O. Each loop pulls **exactly one** task from here.
- **Microtasks** — the VIP queue: \`.then()\` on promises, \`await\`, \`queueMicrotask\`, \`MutationObserver\`. These are drained **completely, down to the last one**, before moving on.

The analogy: macrotasks are regular customers, microtasks are people who "just have a quick question". The cashier serves one customer → lets **all** the quick questions through → takes the next customer.

## The full list of macrotasks (tasks)

Everything the browser puts in the regular queue and pulls **one at a time** per tick:

- **Timers:** \`setTimeout\`, \`setInterval\`.
- **User events:** \`click\`, \`dblclick\`, \`keydown\`/\`keyup\`, \`input\`, \`change\`, \`submit\`, \`focus\`/\`blur\`, \`pointermove\`, \`wheel\`, \`touchstart\`, \`drop\`.
- **Lifecycle and resource events:** \`DOMContentLoaded\`, \`load\`/\`error\` on \`window\`, \`<img>\`, \`<script>\`, \`<link>\`, \`<iframe>\`, \`pageshow\`, \`visibilitychange\`, \`beforeunload\`.
- **Navigation and storage:** \`hashchange\`, \`popstate\`, \`storage\` (fired from another tab).
- **Messaging:** \`window.postMessage\`, \`MessageChannel\`/\`MessagePort\`, \`BroadcastChannel\`, \`onmessage\` from a Web Worker or Service Worker, \`EventSource\` (SSE), \`WebSocket\` (\`onopen\`/\`onmessage\`/\`onclose\`).
- **Network and I/O:** \`XMLHttpRequest\` callbacks (\`onload\`, \`onreadystatechange\`, \`onprogress\`), \`FileReader\`, \`navigator.geolocation\`, \`IndexedDB\` (\`onsuccess\`/\`onerror\`).
- **Script evaluation itself:** every \`<script>\` the parser reaches is its own task.
- **Prioritised scheduling:** \`scheduler.postTask()\` — the same task queue but with explicit priorities (\`user-blocking\`, \`user-visible\`, \`background\`), plus \`scheduler.yield()\` for "hand control back to the browser and resume".
- **\`requestIdleCallback\`** — the lowest-priority task: it runs only if the browser has spare time at the end of a frame.
- Node.js: \`setImmediate\` — its own *check* phase; there's no such API in the browser.

One important nuance about \`fetch\`: the network response arrives as a **task**, but your \`.then()\` on that response is already a **microtask**.

## The full list of microtasks

- **Promises:** \`.then()\`, \`.catch()\`, \`.finally()\` callbacks and the settling of \`Promise.all\`, \`allSettled\`, \`race\`, \`any\`.
- **\`await\`** — all the code after it.
- **\`queueMicrotask()\`** — the direct way to put a callback in this queue.
- **\`MutationObserver\`** — the DOM-mutation callback.
- **Custom element reactions** — \`connectedCallback\`, \`attributeChangedCallback\` and friends, when the parser isn't the one invoking them.
- **Streams:** \`ReadableStream\`/\`WritableStream\` promises — \`reader.read()\`, \`writer.write()\`.
- **Dynamic \`import()\`** — the promise settling (fetching the file is, of course, a task).
- **Any promise-based platform API:** \`fetch().then\`, \`response.json()\`, \`caches.match\`, \`navigator.locks.request\`, \`crypto.subtle.digest\`, \`el.requestFullscreen()\`, \`Atomics.waitAsync\`.
- Node.js: \`process.nextTick\` — **a separate queue with higher priority than promises**; it drains before microtasks.

## Neither one nor the other

Some callbacks live in the **rendering phase** and land in neither queue:

- **\`requestAnimationFrame\`** — before the frame is painted, after microtasks.
- **\`ResizeObserver\`** — inside the same phase, after rAF and before paint, so a size reaction still makes it into the same frame.
- **\`IntersectionObserver\`** — intersections are computed in the rendering phase, but the callback is delivered by a task afterwards.
- **The \`scroll\` event** — not a separate task but a step of the rendering phase.
- **CSS animations and transitions** — computed outside JS, though their events (\`transitionend\`, \`animationend\`) arrive as tasks.
- **\`el.dispatchEvent(...)\` and \`el.click()\`** — fully **synchronous**: the listeners run here and now, no queue involved.

## The order of one tick

1. Run the synchronous code — whatever is written right now, top to bottom.
2. Run **all** microtasks (including ones queued while draining microtasks).
3. If it's time to paint a frame, do it: \`requestAnimationFrame\` → recalc style → layout → paint. Usually ~60 times per second.
4. Take **one** macrotask and go back to step 2.

## Example

\`\`\`js
console.log('1');
setTimeout(() => console.log('2'));              // macrotask
Promise.resolve().then(() => console.log('3'));  // microtask
console.log('4');
// Prints: 1, 4, 3, 2
\`\`\`

Why: \`1\` and \`4\` are synchronous code, always first. Then the VIP queue — \`3\`. And only at the very end the regular queue — \`2\`.

## Why \`queueMicrotask\` cuts into the middle of a chain

The snippet below surprises people most often: \`queueMicrotask\` slips in between \`promise 1\` and \`promise 2\`, even though the chain is written above it.

\`\`\`js
Promise.resolve()
  .then(() => console.log('promise 1'))
  .then(() => console.log('promise 2'));
queueMicrotask(() => console.log('queueMicrotask'));
// promise 1, queueMicrotask, promise 2
\`\`\`

Two rules are at work: the microtask queue is **strictly FIFO**, and a \`.then()\` link is only queued at the moment the previous link **finishes**. A chain isn't scheduled all at once up front — it's scheduled one link per tick.

What happens during the synchronous phase:

1. \`Promise.resolve()\` — the promise is **already resolved**.
2. \`.then(promise 1)\` attaches to a resolved promise, so its callback is queued immediately.
3. \`.then(promise 2)\` attaches to the promise returned by the first \`.then\` — which is still **pending**. There's nothing to schedule; the callback is merely recorded as a reaction for a future resolution.
4. \`queueMicrotask\` joins the queue second.

The queue at the end of the synchronous code: \`[promise 1, queueMicrotask]\` — \`promise 2\` is **not in it**.

Then the draining:

- pull \`promise 1\` → it prints; the callback returned \`undefined\`, which resolves the second link's promise → only **now** does \`promise 2\` join the queue, and it joins the **back**, behind \`queueMicrotask\`;
- pull \`queueMicrotask\` → it prints;
- pull \`promise 2\` → it prints.

So \`promise 2\` loses not because \`queueMicrotask\` outranks it, but because \`queueMicrotask\` was already sitting in the queue when it got there. Check yourself: move \`queueMicrotask\` **above** the chain and you get \`queueMicrotask → promise 1 → promise 2\`; add a third link and it slides one more tick out: \`promise 1 → queueMicrotask → promise 2 → promise 3\`.

The mnemonic: **\`.then\` doesn't "schedule the chain", it "subscribes to one step"**. The length of the chain equals the number of ticks.

## What to say in the interview

> JS is single-threaded, so the browser uses an Event Loop: it pulls tasks one at a time and hands them to the engine. There are two queues — macrotasks (setTimeout, DOM events) and microtasks (promises, queueMicrotask). One macrotask runs per tick, after which the microtask queue is drained **completely**, and only then can the browser paint a frame. That's why promises always fire before setTimeout, and why an endless stream of microtasks can freeze the page — rendering never gets a turn.

## Gotchas they'll test you on

- \`setTimeout(fn, 0)\` does **not** mean "immediately": nested timers have a ~4 ms floor, and background tabs are throttled hard.
- Microtasks can **freeze the page**: if a \`.then()\` endlessly queues another \`.then()\`, neither rendering nor \`setTimeout\` will ever get a turn.
- \`requestAnimationFrame\` is **neither** a macro- nor a microtask: it runs right before the paint, i.e. after microtasks.
- \`await\` is sugar over \`.then()\`, so all code **after** an \`await\` is a microtask.
- The microtask queue drains **after every** macrotask, not once per loop: two \`setTimeout\`s, each with its own \`.then()\`, print \`t1 → p1 → t2 → p2\`, not \`t1 → t2 → p1 → p2\`.
- On a **real** click, microtasks drain between listeners; with \`el.click()\` from code they don't — the stack isn't empty, so every listener runs first.`
    },
    codeSnippet: `console.log('script start');
setTimeout(() => console.log('setTimeout'), 0);     // macrotask
Promise.resolve()
  .then(() => console.log('promise 1'))             // microtask
  .then(() => console.log('promise 2'));            // microtask
queueMicrotask(() => console.log('queueMicrotask'));
console.log('script end');
// script start, script end, promise 1, queueMicrotask, promise 2, setTimeout`
  },
  {
    id: 'jsts-002',
    category: 'js-state',
    level: 'Medium',
    tags: ['call-stack', 'recursion', 'stack-overflow'],
    question: {
      ru: 'Что такое call stack? Почему возникает «Maximum call stack size exceeded» и как этого избегать?',
      en: 'What is the call stack? Why does "Maximum call stack size exceeded" happen and how do you avoid it?'
    },
    answer: {
      ru: `## Коротко

Call stack (стек вызовов) — это **стопка тарелок из вызовов функций**. Вызвали функцию — положили тарелку сверху. Функция закончилась (\`return\`) — сняли верхнюю. Движок всегда работает только с самой верхней тарелкой.

Именно эту стопку ты видишь в консоли как stack trace.

## Как это работает по шагам

1. Вызываем функцию → движок кладёт на стек **кадр** (frame): аргументы, локальные переменные и адрес «куда вернуться».
2. Если внутри вызывается ещё функция — сверху ложится ещё один кадр.
3. Функция завершилась → её кадр снимается, управление возвращается на кадр ниже.
4. Стек опустел → движок берёт следующую задачу из Event Loop.

## Что именно лежит в кадре

\`\`\`js
function a(x) {
  const y = x * 2;
  return b(y);        // строка 3
}
function b(z) {
  return z + 1;       // строка 6
}
a(5);                 // строка 8
\`\`\`

Пока исполняется \`b\`, стек выглядит так:

\`\`\`text
| кадр b:  z = 10        | вернуться в строку 3 |  <- вершина
| кадр a:  x = 5, y = 10 | вернуться в строку 8 |
| глобальный кадр                               |
\`\`\`

- **Аргументы — вызываемой функции (callee)**, а не вызывающей. Значения вычисляет вызывающий код, но лежат они в кадре той функции, которую вызвали: в кадре \`b\` это \`z = 10\`, а не \`x = 5\`.
- **Локальные переменные — тоже самой вызываемой функции**: её параметры и объявленные в её теле \`var\`/\`let\`/\`const\`. Переменные внешнего окружения в кадр **не копируются** — функция достаёт их по ссылке на своё лексическое окружение (scope chain, внутреннее \`[[Environment]]\`, которое привязывается к функции в момент создания, а не вызова).
- Если переменную захватило **замыкание**, движок не может держать её на стеке (стек размотается, а переменная должна жить дальше) — он выносит её в кучу, в объект контекста, а в кадре остаётся только указатель. Отсюда и расход памяти у замыканий.

**Адрес возврата — это не \`this\`.** Это указатель на инструкцию в коде вызывающей функции: «куда продолжить, когда я закончусь». Из JS он недоступен, но ты видишь его каждый день — каждая строка stack trace **ниже верхней** и есть сохранённый адрес возврата:

\`\`\`text
Error
    at b (app.js:6:10)   <- где мы сейчас
    at a (app.js:3:10)   <- адрес возврата кадра b
    at app.js:8:1        <- адрес возврата кадра a
\`\`\`

- **\`this\` — отдельная сущность**: передаётся скрытым аргументом (в спецификации — receiver) и тоже лежит в кадре, но адресом возврата не является.
- Что там ещё: указатель на предыдущий кадр (по нему стек разматывается), ссылка на саму функцию/замыкание, сохранённые регистры, место под промежуточные значения выражений.
- Следствие: **размер кадра не фиксирован**. Функция с двумя десятками локальных переменных съедает стека больше, чем функция с двумя, поэтому предельная глубина рекурсии — не константа.

## Почему возникает «Maximum call stack size exceeded»

Стопка не бесконечная: обычно ~10–15 тысяч кадров (зависит от браузера и от размера кадра). Если функция вызывает сама себя и не останавливается — тарелки заканчиваются → \`RangeError: Maximum call stack size exceeded\`.

### Базовый случай — что это

Рекурсия состоит из двух частей:

\`\`\`js
function fact(n) {
  if (n <= 1) return 1;      // БАЗОВЫЙ СЛУЧАЙ: ответ известен, себя не вызываем
  return n * fact(n - 1);    // рекурсивный шаг: сводим задачу к меньшей
}
\`\`\`

Базовый случай (base case) — это условие, при котором функция возвращает ответ напрямую, **не вызывая себя**. Это «дно», об которое рекурсия останавливается и начинает разматываться обратно. Убери его — и \`n\` будет уходить в минус бесконечность, пока не кончится стек.

### База есть, но недостижима

Вариант коварнее, и на собеседовании любят именно его:

\`\`\`js
function fact(n) {
  if (n === 1) return 1;     // строгое равенство с единственным значением
  return n * fact(n - 1);
}

fact(5);    // 120 — ок
fact(0);    // 0 -> -1 -> -2 -> ... RangeError
fact(2.5);  // 2.5 -> 1.5 -> 0.5 -> -0.5 -> ... никогда не === 1 -> RangeError
\`\`\`

Правило: база должна быть не точкой, а интервалом — \`if (n <= 1) return 1\`. Условие обязано сработать при любом способе проскочить точку остановки.

### Другие формы той же ошибки

\`\`\`js
// две функции по кругу — базы нет вообще
function validate(v) { return check(v); }
function check(v)    { return validate(v); }

// геттер, который обращается сам к себе — самая частая реальная ошибка
class User {
  get name() {
    return this.name;   // this.name снова вызывает этот же геттер
  }
  set name(v) {
    this.name = v;      // то же самое в сеттере
  }
}
new User().name;        // RangeError
\`\`\`

Лечится приватным полем: \`#name\` внутри, \`name\` — снаружи.

## Как чинить

Идея у всех четырёх приёмов одна: **перестать хранить состояние обхода в кадрах стека**. Стек вызовов — это порядка мегабайта, куча — гигабайты. Значит состояние надо либо перенести в кучу, либо обнулять стек между шагами.

### 1. Переписать на обычный цикл

Подходит, когда рекурсия линейная — один рекурсивный вызов на шаг.

\`\`\`js
// было — глубина стека равна n
function sum(n) { return n === 0 ? 0 : n + sum(n - 1); }
sum(100_000);              // RangeError

// стало — глубина стека всегда 1
function sum(n) {
  let acc = 0;
  for (let i = n; i > 0; i--) acc += i;
  return acc;
}
sum(100_000);              // 5000050000
\`\`\`

Стек не растёт, потому что вызова просто нет: одна функция и одна переменная в её единственном кадре.

### 2. Свой стек в массиве

Нужен, когда обход ветвится (дерево, граф, вложенный объект) — циклом «в лоб» такое не переписать. Мы вручную делаем то, что делал движок: заводим массив «что ещё обойти».

\`\`\`js
// было: рекурсивный обход — на глубоком дереве упадёт
function countNodes(node) {
  let n = 1;
  for (const child of node.children) n += countNodes(child);
  return n;
}

// стало: стек живёт в куче, предел — только память
function countNodes(root) {
  let n = 0;
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();                       // сняли «кадр» вручную
    n++;
    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push(node.children[i]);                 // положили «кадры» детей
    }
  }
  return n;
}
\`\`\`

- \`pop()\` даёт LIFO → обход в глубину, тот же порядок, что и у рекурсии. Замени на \`shift()\` — получишь обход в ширину, которого рекурсией не сделать вообще.
- Детей кладём в обратном порядке, чтобы \`pop()\` доставал их слева направо.
- Массив лежит в куче, поэтому реальный предел здесь — миллионы узлов, а не десять тысяч.

### 3. Разбить работу на порции

Работает не за счёт устранения рекурсии, а за счёт того, что между порциями стек разматывается в ноль.

\`\`\`js
function processAll(items) {
  return new Promise((resolve) => {
    let i = 0;
    function chunk() {
      const end = Math.min(i + 500, items.length);
      for (; i < end; i++) process(items[i]);

      if (i < items.length) setTimeout(chunk, 0);  // не вызов, а планирование
      else resolve();
    }
    chunk();
  });
}
\`\`\`

\`setTimeout(chunk, 0)\` не вызывает \`chunk\`, а ставит её в очередь макрозадач и сразу возвращается. Текущий \`chunk\` завершается, кадр снимается, стек пустеет — и только потом Event Loop запускает следующую порцию, снова с глубиной 1. Хоть миллион порций: стек всегда высотой в один кадр.

Побочные эффекты, о которых стоит сказать самому: функция становится асинхронной (сигнатура меняется на \`Promise\`), зато между порциями браузер успевает отрисовать кадр и обработать клики.

\`queueMicrotask\` стек тоже разматывает и от \`RangeError\` спасает, но микрозадачи выполняются до рендера и до следующей макрозадачи — бесконечная цепочка микрозадач намертво вешает поток. Чтобы не морозить UI, нужен именно \`setTimeout\` / \`MessageChannel\` / \`scheduler.yield()\`.

### 4. Trampoline

Функция не вызывает себя (это растит стек), а возвращает наверх инструкцию «вот функция, вызови её». Цикл в батуте вызывает её уже с прежнего уровня стека.

\`\`\`js
// trampoline: «рекурсия» на миллион шагов, а стек не растёт
const trampoline = (fn) => (...args) => {
  let r = fn(...args);                     // первый вызов
  while (typeof r === 'function') r = r(); // пока возвращают функцию — крутим
  return r;                                // вернули не функцию -> это ответ
};

const sum = trampoline(function rec(n, acc = 0) {
  return n === 0
    ? acc                                  // база -> настоящий результат
    : () => rec(n - 1, acc + n);           // шаг -> thunk, а не вызов
});

sum(1_000_000); // работает
\`\`\`

Что происходит на \`sum(3)\`:

\`\`\`text
r = rec(3, 0)  -> вернул () => rec(2, 3)   кадр rec снят, глубина 2
r = r()        -> вернул () => rec(1, 5)   кадр rec снят, глубина 2
r = r()        -> вернул () => rec(0, 6)   кадр rec снят, глубина 2
r = r()        -> вернул 6 (не функция)    цикл выходит
\`\`\`

Глубина стека всегда 2, независимо от \`n\`: каждый \`rec\` успевает завершиться и освободить кадр до того, как будет вызван следующий.

Обязательное условие — рекурсия должна быть **хвостовой**: результат рекурсивного вызова возвращается как есть. Поэтому \`return n + rec(n - 1)\` не подходит (после возврата надо ещё сложить, значит кадр обязан дожить) — нужен аккумулятор в аргументе: \`rec(n - 1, acc + n)\`.

### Чего делать не надо

Поднимать лимит (\`node --stack-size=10000\`): это маскирует проблему, роняет процесс непредсказуемо и в браузере недоступно. Упоминать стоит только как «знаю, но так не делаю».

## Что сказать на собеседовании

> Call stack — это LIFO-структура, куда движок кладёт кадр на каждый вызов функции: аргументы, локальные переменные, адрес возврата. Размер стека ограничен, поэтому слишком глубокая или бесконечная рекурсия даёт RangeError «Maximum call stack size exceeded». Лечится переписыванием на итерацию, собственным стеком в массиве, разбиением работы на асинхронные порции или trampoline. На оптимизацию хвостовых вызовов полагаться нельзя: она есть в спецификации ES2015, но реально работает только в Safari.

## Ловушки

Это не подвох от собеседующего, а подводные камни самой темы — места, где интуиция подводит. Обычно ими «добивают» после базового ответа.

### Асинхронный код стек не переполняет

\`\`\`js
// синхронная рекурсия — упадёт
function loop(n) { if (n === 0) return; loop(n - 1); }
loop(1_000_000);                                   // RangeError

// та же логика через setTimeout — не упадёт никогда
function loop(n) { if (n === 0) return; setTimeout(() => loop(n - 1)); }
loop(1_000_000);                                   // работает, просто долго
\`\`\`

Каждый колбэк — отдельная задача Event Loop, он стартует с пустого стека: предыдущего кадра к этому моменту уже не существует. Отсюда же два следствия — в stack trace не видно, кто поставил таймер (DevTools склеивает цепочку искусственно, опция «Async stack traces»), и \`try/catch\` вокруг \`setTimeout\` не ловит ошибку из колбэка.

Обратная сторона той же ловушки: \`async\` не спасает автоматически.

\`\`\`js
async function f(n) {
  if (n === 0) return;
  await f(n - 1);
}
f(100_000);   // RangeError!
\`\`\`

Тело async-функции выполняется синхронно до первого \`await\`. Здесь \`f(n - 1)\` вызывается синхронно, внутри неё сразу синхронно \`f(n - 2)\` — вся цепочка успевает лечь на стек до того, как первый \`await\` кого-то приостановит.

### TCO работает только в Safari

Хвостовой вызов — это когда рекурсивный вызов является последним действием: \`return rec(n - 1, acc + n)\`. Движок мог бы не создавать новый кадр, а переиспользовать текущий — возвращаться-то всё равно некуда. Это и есть TCO: он описан в спецификации ES2015, но реализован только в JavaScriptCore (Safari). В V8 (Chrome, Node) и SpiderMonkey (Firefox) его нет — пробовали под флагом \`--harmony-tailcalls\` и убрали, потому что ломаются stack trace и отладка. Поэтому trampoline — это ровно TCO, сделанный руками.

### RangeError без всякой рекурсии

\`\`\`js
const arr = new Array(200_000).fill(1);

Math.max(...arr);            // RangeError: Maximum call stack size exceeded
Math.max.apply(null, arr);   // то же самое
target.push(...arr);         // и это тоже
\`\`\`

Каждый аргумент занимает в кадре отдельный слот, и 200 тысяч аргументов туда физически не влезают (порог зависит от движка, примерно 65–125 тысяч). Это реальный продакшн-баг: код работает на тестовых ста элементах и падает на настоящих данных. Лечится сведением без spread — \`arr.reduce((max, v) => (v > max ? v : max), -Infinity)\` или обработкой чанками.

### Мелочи, на которых сыпятся

- **Глубина — не константа.** Кадр функции с двумя десятками локальных переменных больше, чем у функции с двумя, значит и предельная глубина меньше. Ответ «десять тысяч» на вопрос «сколько выдержит стек» — уже ошибка; правильный: «зависит от размера кадра и движка».
- **\`try { recurse() } catch {}\` — обманчивая защита.** Поймать \`RangeError\` можно, но в момент \`catch\` стек всё ещё почти полон, и любой вызов в обработчике может упасть повторно.
- **Тихие источники глубокой рекурсии:** \`JSON.parse\`/\`JSON.stringify\` на глубоко вложенных структурах, \`structuredClone\`, самописные \`deepClone\`/\`deepMerge\`, рекурсивные компоненты, \`toString\`/\`valueOf\`, который трогает сам себя, Proxy-хендлер, обращающийся к цели через тот же прокси.`,
      en: `## In short

The call stack is a **stack of plates made of function calls**. Call a function — put a plate on top. The function finishes (\`return\`) — take the top plate off. The engine only ever works with the topmost plate.

That stack is exactly what you see in the console as a stack trace.

## How it works, step by step

1. We call a function → the engine pushes a **frame**: arguments, local variables and the return address.
2. If another function is called inside, another frame goes on top.
3. The function finishes → its frame is popped and control returns to the frame below.
4. The stack empties → the engine takes the next task from the Event Loop.

## What exactly is inside a frame

\`\`\`js
function a(x) {
  const y = x * 2;
  return b(y);        // line 3
}
function b(z) {
  return z + 1;       // line 6
}
a(5);                 // line 8
\`\`\`

While \`b\` runs, the stack looks like this:

\`\`\`text
| frame b:  z = 10        | return to line 3 |  <- top
| frame a:  x = 5, y = 10 | return to line 8 |
| global frame                               |
\`\`\`

- **Arguments belong to the called function (the callee)**, not the caller. The caller computes the values, but they live in the frame of the function being called: frame \`b\` holds \`z = 10\`, not \`x = 5\`.
- **Locals belong to the callee too**: its parameters and the \`var\`/\`let\`/\`const\` declared in its body. Variables from the outer scope are **not copied** into the frame — the function reaches them through its lexical environment (the scope chain, the internal \`[[Environment]]\` bound to the function when it was created, not when it is called).
- If a variable is captured by a **closure**, the engine can't keep it on the stack (the stack unwinds while the variable must outlive it), so it moves it to the heap into a context object and the frame keeps only a pointer. That's where the memory cost of closures comes from.

**The return address is not \`this\`.** It's a pointer to an instruction in the caller's code: "where to resume once I'm done". It isn't reachable from JS, but you see it every day — every stack trace line **below the top one** is a stored return address:

\`\`\`text
Error
    at b (app.js:6:10)   <- where we are now
    at a (app.js:3:10)   <- return address of frame b
    at app.js:8:1        <- return address of frame a
\`\`\`

- **\`this\` is a separate thing**: it's passed as a hidden argument (the *receiver* in spec terms) and lives in the frame as well, but it is not the return address.
- What else is in there: a pointer to the previous frame (that's how the stack unwinds), a reference to the function/closure itself, saved registers, and room for intermediate values.
- Consequence: **frame size is not fixed**. A function with twenty locals eats more stack than one with two, so the maximum recursion depth is not a constant.

## Why "Maximum call stack size exceeded" happens

The stack isn't infinite: usually ~10–15 thousand frames (depends on the browser and on frame size). If a function calls itself and never stops, the plates run out → \`RangeError: Maximum call stack size exceeded\`.

### The base case — what it is

A recursion has two parts:

\`\`\`js
function fact(n) {
  if (n <= 1) return 1;      // BASE CASE: the answer is known, no self-call
  return n * fact(n - 1);    // recursive step: reduce to a smaller problem
}
\`\`\`

The base case is the condition under which the function returns an answer directly, **without calling itself**. It's the floor the recursion stops on and starts unwinding back from. Remove it and \`n\` keeps going to minus infinity until the stack runs out.

### The base case exists but is unreachable

The nastier variant, and the one interviewers actually like:

\`\`\`js
function fact(n) {
  if (n === 1) return 1;     // strict equality against a single value
  return n * fact(n - 1);
}

fact(5);    // 120 — fine
fact(0);    // 0 -> -1 -> -2 -> ... RangeError
fact(2.5);  // 2.5 -> 1.5 -> 0.5 -> -0.5 -> ... never === 1 -> RangeError
\`\`\`

Rule of thumb: the base case must be an interval, not a point — \`if (n <= 1) return 1\`. It has to fire no matter how the stopping point is overshot.

### Other shapes of the same bug

\`\`\`js
// two functions in a circle — no base case at all
function validate(v) { return check(v); }
function check(v)    { return validate(v); }

// a getter that reads itself — the most common real-world version
class User {
  get name() {
    return this.name;   // this.name calls this very getter again
  }
  set name(v) {
    this.name = v;      // same story in the setter
  }
}
new User().name;        // RangeError
\`\`\`

Fixed with a private field: \`#name\` inside, \`name\` outside.

## How to fix it

All four techniques share one idea: **stop storing the traversal state in stack frames**. The call stack is about a megabyte; the heap is gigabytes. So either move the state to the heap, or reset the stack between steps.

### 1. Rewrite it as a plain loop

Works when the recursion is linear — one recursive call per step.

\`\`\`js
// before — stack depth equals n
function sum(n) { return n === 0 ? 0 : n + sum(n - 1); }
sum(100_000);              // RangeError

// after — stack depth is always 1
function sum(n) {
  let acc = 0;
  for (let i = n; i > 0; i--) acc += i;
  return acc;
}
sum(100_000);              // 5000050000
\`\`\`

The stack doesn't grow because there is no call at all: one function and one variable in its single frame.

### 2. Your own stack in an array

Needed when the traversal branches (a tree, a graph, a nested object) — you can't turn that into a plain loop directly. Instead you do by hand what the engine was doing: keep an array of "what's left to visit".

\`\`\`js
// before: recursive traversal — blows up on a deep tree
function countNodes(node) {
  let n = 1;
  for (const child of node.children) n += countNodes(child);
  return n;
}

// after: the stack lives in the heap, the limit is memory only
function countNodes(root) {
  let n = 0;
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();                       // pop a "frame" by hand
    n++;
    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push(node.children[i]);                 // push the children's "frames"
    }
  }
  return n;
}
\`\`\`

- \`pop()\` is LIFO → depth-first, the same order recursion gives you. Swap it for \`shift()\` and you get breadth-first, which recursion can't do at all.
- Children go in reverse so that \`pop()\` returns them left to right.
- The array lives in the heap, so the practical limit here is millions of nodes, not ten thousand.

### 3. Split the work into chunks

This doesn't remove the recursion — it works because the stack fully unwinds between chunks.

\`\`\`js
function processAll(items) {
  return new Promise((resolve) => {
    let i = 0;
    function chunk() {
      const end = Math.min(i + 500, items.length);
      for (; i < end; i++) process(items[i]);

      if (i < items.length) setTimeout(chunk, 0);  // scheduling, not calling
      else resolve();
    }
    chunk();
  });
}
\`\`\`

\`setTimeout(chunk, 0)\` does not call \`chunk\` — it queues it as a macrotask and returns immediately. The current \`chunk\` finishes, its frame is popped, the stack empties, and only then does the Event Loop start the next chunk, again at depth 1. A million chunks: the stack is always one frame tall.

Trade-offs worth mentioning yourself: the function becomes asynchronous (the signature changes to a \`Promise\`), but between chunks the browser gets to paint a frame and handle clicks.

\`queueMicrotask\` unwinds the stack too and does prevent the \`RangeError\`, but microtasks run before rendering and before the next macrotask — an endless microtask chain locks the thread completely. To keep the UI alive you need \`setTimeout\` / \`MessageChannel\` / \`scheduler.yield()\`.

### 4. Trampoline

The function doesn't call itself (that's what grows the stack) — it returns an instruction upwards: "here's a function, call it". The loop inside the trampoline calls it from the original stack level.

\`\`\`js
// trampoline: a million-step "recursion" without growing the stack
const trampoline = (fn) => (...args) => {
  let r = fn(...args);                     // first call
  while (typeof r === 'function') r = r(); // keep spinning while thunks come back
  return r;                                // not a function -> that's the answer
};

const sum = trampoline(function rec(n, acc = 0) {
  return n === 0
    ? acc                                  // base case -> the real result
    : () => rec(n - 1, acc + n);           // step -> a thunk, not a call
});

sum(1_000_000); // works
\`\`\`

What happens for \`sum(3)\`:

\`\`\`text
r = rec(3, 0)  -> returned () => rec(2, 3)   rec's frame popped, depth 2
r = r()        -> returned () => rec(1, 5)   rec's frame popped, depth 2
r = r()        -> returned () => rec(0, 6)   rec's frame popped, depth 2
r = r()        -> returned 6 (not a function) loop exits
\`\`\`

Stack depth is always 2 regardless of \`n\`: every \`rec\` finishes and frees its frame before the next one is called.

One requirement: the recursion has to be **tail recursive** — the result of the recursive call is returned as is. So \`return n + rec(n - 1)\` doesn't qualify (something still has to be added afterwards, so the frame must survive) — you need an accumulator argument: \`rec(n - 1, acc + n)\`.

### What not to do

Raising the limit (\`node --stack-size=10000\`) hides the problem, crashes the process unpredictably and isn't available in the browser. Worth mentioning only as "I know about it and I don't do it".

## What to say in the interview

> The call stack is a LIFO structure where the engine pushes a frame per function call: arguments, locals and the return address. Stack size is bounded, so recursion that's too deep or infinite produces a RangeError, "Maximum call stack size exceeded". The fixes are rewriting to iteration, using an explicit stack in an array, splitting the work into asynchronous chunks, or trampolining. You can't rely on tail-call optimisation: it's in the ES2015 spec but is only really implemented in Safari.

## Gotchas

These aren't tricks played by the interviewer — they're the sharp edges of the topic, the places where intuition is wrong. They're usually what you get asked after the basic answer lands.

### Async code doesn't overflow the stack

\`\`\`js
// synchronous recursion — blows up
function loop(n) { if (n === 0) return; loop(n - 1); }
loop(1_000_000);                                   // RangeError

// same logic through setTimeout — never blows up
function loop(n) { if (n === 0) return; setTimeout(() => loop(n - 1)); }
loop(1_000_000);                                   // works, just slowly
\`\`\`

Every callback is a separate Event Loop task and starts from an empty stack — the previous frame no longer exists by then. Two consequences follow: the stack trace doesn't show who scheduled the timer (DevTools stitches the chain artificially with "Async stack traces"), and a \`try/catch\` around \`setTimeout\` doesn't catch anything thrown inside the callback.

The flip side of the same gotcha: \`async\` doesn't save you automatically.

\`\`\`js
async function f(n) {
  if (n === 0) return;
  await f(n - 1);
}
f(100_000);   // RangeError!
\`\`\`

An async function body runs synchronously up to the first \`await\`. Here \`f(n - 1)\` is called synchronously, and inside it \`f(n - 2)\` immediately is too — the whole chain lands on the stack before the first \`await\` suspends anything.

### TCO only works in Safari

A tail call is a recursive call that is the last thing the function does: \`return rec(n - 1, acc + n)\`. The engine could reuse the current frame instead of pushing a new one — there's nothing to come back to anyway. That's TCO: it's in the ES2015 spec, but only JavaScriptCore (Safari) implements it. V8 (Chrome, Node) and SpiderMonkey (Firefox) don't — it was tried behind \`--harmony-tailcalls\` and dropped because it breaks stack traces and debugging. That's exactly why a trampoline exists: it's TCO done by hand.

### RangeError with no recursion at all

\`\`\`js
const arr = new Array(200_000).fill(1);

Math.max(...arr);            // RangeError: Maximum call stack size exceeded
Math.max.apply(null, arr);   // same thing
target.push(...arr);         // this too
\`\`\`

Each argument takes its own slot in the frame, and 200 thousand of them simply don't fit (the threshold is engine-dependent, roughly 65–125 thousand). This is a real production bug: the code works on a hundred test items and dies on real data. Fix it by folding without spread — \`arr.reduce((max, v) => (v > max ? v : max), -Infinity)\` — or by chunking.

### Small things people trip on

- **Depth is not a constant.** A frame of a function with twenty locals is bigger than one with two, so the maximum depth is lower. Answering "ten thousand" to "how deep can the stack go" is already a mistake; the right answer is "depends on frame size and engine".
- **\`try { recurse() } catch {}\` is deceptive protection.** You can catch the \`RangeError\`, but at \`catch\` time the stack is still nearly full, and any call in the handler can blow up again.
- **Quiet sources of deep recursion:** \`JSON.parse\`/\`JSON.stringify\` over deeply nested structures, \`structuredClone\`, hand-written \`deepClone\`/\`deepMerge\`, recursive components, a \`toString\`/\`valueOf\` that touches itself, a Proxy handler that reaches the target through the same proxy.`
    },
    codeSnippet: `// Deep recursion overflows the stack...
function deep(n) { return n === 0 ? 0 : deep(n - 1) + 1; }
// deep(100000); // RangeError: Maximum call stack size exceeded

// ...iterative version keeps the stack flat
function deepIter(n) { let acc = 0; while (n-- > 0) acc++; return acc; }
deepIter(100000); // 100000`
  },
  {
    id: 'jsts-003',
    category: 'js-state',
    level: 'Hard',
    tags: ['closures', 'lexical-scope', 'memory'],
    question: {
      ru: 'Что такое замыкание с точки зрения движка? Как замыкания связаны с лексическим окружением и расходом памяти?',
      en: 'What is a closure from the engine\'s point of view? How do closures relate to lexical environments and memory cost?'
    },
    answer: {
      ru: `## Коротко

**Замыкание — это функция, которая помнит, где она родилась.** Даже когда внешняя функция давно закончилась, вложенная функция продолжает видеть её переменные.

Аналогия: функция уходит из дома с **рюкзаком**. В рюкзаке — переменные того места, где её объявили. Куда бы её потом ни передали (в колбэк, в setTimeout, в другой модуль), рюкзак всегда при ней.

Ключевое слово — **объявили**, а не «вызвали». Замыкание определяется местом в коде, а не местом вызова.

## Как это работает по шагам

1. Движок выполняет внешнюю функцию и создаёт для неё **Lexical Environment** — табличку «имя → значение» плюс ссылку на родительскую табличку.
2. Когда внутри объявляется функция, движок кладёт ей во внутренний слот \`[[Environment]]\` ссылку на эту табличку. Это и есть рюкзак.
3. Внешняя функция завершилась, но табличка **не удаляется**, потому что на неё ссылается живая вложенная функция.
4. Когда во вложенной функции читают переменную, движок ищет её сначала у себя, потом в табличке-рюкзаке, потом выше по цепочке — до глобальной. Не нашёл → \`ReferenceError\`.

## Пример

\`\`\`js
function counter() {
  let count = 0;           // живёт, пока жива возвращённая функция
  return () => ++count;
}
const inc = counter();
inc(); // 1
inc(); // 2 — состояние сохранилось в замыкании
\`\`\`

Функция \`counter\` завершилась ещё на первой строке, но \`count\` жив: на него ссылается стрелочная функция.

## Причём тут память

Замыкание держит **всё окружение целиком**, а не одну переменную (V8 умеет оптимизировать и захватывать только используемые, но полагаться на это нельзя). Отсюда утечки:

- колбэк в подписке живёт вечно — и вместе с ним живёт весь большой объект из внешней функции;
- переменная нужна была одну секунду при создании, а лежит в памяти часами.

Что делать: вытащить из большого объекта только нужные поля в локальные переменные, а ссылку на сам объект обнулить (\`bigData = null\`) перед созданием долгоживущего колбэка. И, конечно, отписываться.

## Что сказать на собеседовании

> Замыкание — это функция вместе с лексическим окружением места, где она была объявлена. При создании функции движок сохраняет во внутреннем слоте \`[[Environment]]\` ссылку на Lexical Environment, поэтому окружение не собирается сборщиком мусора, пока жива функция. Поиск переменной идёт по цепочке окружений вверх до глобального. Практическое следствие — замыкания дают приватное состояние (счётчики, мемоизация, каррирование), но они же частая причина утечек: долгоживущий колбэк держит в памяти всё окружение, включая большие объекты.

## Ловушки

- **Классический баг с \`var\` в цикле**: \`var\` создаёт одну переменную на весь цикл, поэтому все колбэки видят последнее значение. \`let\` создаёт **новую привязку на каждую итерацию** — и всё работает как ожидается.
- Замыкание захватывает **переменную, а не её значение на момент создания**. Изменили переменную позже — замыкание увидит новое значение.
- Каждый вызов внешней функции создаёт **новое, независимое** замыкание: два счётчика от \`counter()\` не мешают друг другу.
- В цикле создавать функции внутри — это N замыканий и N окружений. На больших списках это заметно по памяти.`,
      en: `## In short

**A closure is a function that remembers where it was born.** Long after the outer function has finished, the inner function can still see its variables.

The analogy: the function leaves home carrying a **backpack**. Inside the backpack are the variables of the place where it was declared. Wherever it's passed later — a callback, a setTimeout, another module — the backpack comes along.

The key word is **declared**, not "called". A closure is determined by the place in the code, not the place of the call.

## How it works, step by step

1. The engine runs the outer function and creates a **Lexical Environment** for it — a "name → value" table plus a link to the parent table.
2. When a function is declared inside, the engine stores a reference to that table in the internal \`[[Environment]]\` slot. That's the backpack.
3. The outer function finishes, but the table is **not destroyed**, because a live inner function still references it.
4. When the inner function reads a variable, the engine looks in itself first, then in the backpack table, then further up the chain — to global. Not found → \`ReferenceError\`.

## Example

\`\`\`js
function counter() {
  let count = 0;           // lives as long as the returned function lives
  return () => ++count;
}
const inc = counter();
inc(); // 1
inc(); // 2 — state preserved in the closure
\`\`\`

\`counter\` finished on the very first line, yet \`count\` is alive: the arrow function references it.

## What this has to do with memory

A closure keeps the **entire environment**, not a single variable (V8 can optimise and capture only what's used, but you shouldn't rely on that). Hence leaks:

- a callback in a subscription lives forever — and with it the whole large object from the outer function;
- a variable needed for one second at creation time sits in memory for hours.

What to do: pull only the fields you need into locals and null out the reference to the big object (\`bigData = null\`) before creating a long-lived callback. And, of course, unsubscribe.

## What to say in the interview

> A closure is a function together with the lexical environment of the place where it was declared. When a function is created, the engine stores a reference to that Lexical Environment in the internal \`[[Environment]]\` slot, so the environment isn't collected while the function is alive. Variable lookup walks up the chain of environments to global. Practically, closures give private state — counters, memoisation, currying — but they're also a common source of leaks: a long-lived callback keeps the whole environment alive, including large objects.

## Gotchas

- **The classic \`var\`-in-a-loop bug**: \`var\` creates one variable for the entire loop, so every callback sees the last value. \`let\` creates a **fresh binding per iteration** and everything works as expected.
- A closure captures **the variable, not its value at creation time**. Change the variable later and the closure sees the new value.
- Every call of the outer function creates a **new, independent** closure: two counters from \`counter()\` don't interfere.
- Creating functions inside a loop means N closures and N environments. On large lists that's visible in memory.`
    },
    codeSnippet: `// Classic loop bug and its fix
const fns = [];
for (var i = 0; i < 3; i++) fns.push(() => i);
console.log(fns.map(f => f())); // [3, 3, 3] — shared 'i'

const fns2 = [];
for (let j = 0; j < 3; j++) fns2.push(() => j);
console.log(fns2.map(f => f())); // [0, 1, 2] — per-iteration binding`
  },
  {
    id: 'jsts-004',
    category: 'js-state',
    level: 'Hard',
    tags: ['this', 'binding', 'call-apply-bind'],
    question: {
      ru: 'Объясните правила привязки `this`. Чем отличаются call/apply/bind и почему стрелочные функции «не имеют» своего this?',
      en: 'Explain the rules for `this` binding. How do call/apply/bind differ and why do arrow functions "have no" this?'
    },
    answer: {
      ru: `## Коротко

Главное правило: **\`this\` — это не то, где функция объявлена, а то, как её вызвали.** Одна и та же функция при разных вызовах даст разный \`this\`.

Простой способ определить: посмотри, **что стоит слева от точки** в момент вызова. \`user.getName()\` → \`this\` это \`user\`. Просто \`getName()\` → слева ничего нет → \`this\` потерян.

## Четыре правила по приоритету

Проверяй сверху вниз, первое подошедшее и выигрывает:

1. **\`new Foo()\`** → \`this\` = новый созданный объект.
2. **Явно указали** — \`fn.call(ctx)\`, \`fn.apply(ctx)\`, \`fn.bind(ctx)\` → \`this\` = \`ctx\`.
3. **Вызов через точку** — \`obj.method()\` → \`this\` = \`obj\`.
4. **Ничего из перечисленного** → \`undefined\` в strict mode / в модулях и классах, иначе (в старом нестрогом коде) — глобальный объект \`window\`.

## call / apply / bind — в чём разница

- \`fn.call(ctx, a, b)\` — **вызвать прямо сейчас**, аргументы через запятую. Запомнить: **C** — Comma.
- \`fn.apply(ctx, [a, b])\` — **вызвать прямо сейчас**, аргументы массивом. Запомнить: **A** — Array.
- \`fn.bind(ctx, a)\` — **не вызывает**, а возвращает **новую функцию** с намертво прибитым \`this\`. Заодно можно заранее подставить первые аргументы (частичное применение).

Важно: \`bind\` — окончательный. Второй \`bind\` поверх первого \`this\` уже не поменяет.

## Стрелочные функции

У стрелки **нет своего \`this\` вообще**. Она не участвует в этих четырёх правилах — просто берёт \`this\` из того места, где её написали (лексически, как обычную переменную).

Следствия:

- стрелку **нельзя перепривязать**: \`arrow.call(obj)\` молча проигнорирует \`obj\`;
- стрелка **идеальна для колбэков внутри методов** — \`this\` не теряется;
- стрелка **не годится как метод объекта** — \`this\` будет из внешнего скоупа, а не из объекта;
- у стрелки также нет своих \`arguments\`, \`super\`, \`new.target\`, и её нельзя вызвать через \`new\`.

## Пример

\`\`\`js
const obj = {
  val: 42,
  regular() { return this.val; },
  arrow: () => this?.val,   // this — из внешнего скоупа, не obj
};

obj.regular();    // 42 — слева от точки obj
const f = obj.regular;
f();              // undefined — контекст потерян
f.call(obj);      // 42 — вернули контекст руками
obj.arrow();      // undefined — у стрелки свой лексический this
\`\`\`

## Что сказать на собеседовании

> \`this\` определяется в момент вызова, а не в момент объявления. Приоритет правил: \`new\` → явная привязка через call/apply/bind → вызов через точку → дефолт (\`undefined\` в strict mode). \`call\` и \`apply\` вызывают функцию сразу и отличаются только формой передачи аргументов, а \`bind\` возвращает новую функцию с зафиксированным \`this\` и повторно не перепривязывается. У стрелочных функций собственного \`this\` нет — они берут его лексически из места объявления, поэтому их нельзя перепривязать, зато они удобны в колбэках, где обычная функция теряет контекст.

## Ловушки

- **Потеря контекста при передаче метода как колбэка**: \`setTimeout(obj.method, 0)\` или \`arr.map(obj.method)\` → \`this\` потерян. Лечение: \`obj.method.bind(obj)\`, стрелка-обёртка \`() => obj.method()\` или поле-стрелка в классе.
- **В классах всегда strict mode**, поэтому потерянный \`this\` — это \`undefined\`, и вы сразу получите «Cannot read properties of undefined».
- \`this\` во **вложенной обычной функции** внутри метода — уже не объект, а \`undefined\`. Поэтому старый код писал \`const self = this\`, а современный использует стрелки.
- В обычной функции, вызванной из **обработчика события**, \`this\` — это DOM-элемент. У стрелки — нет.`,
      en: `## In short

The main rule: **\`this\` isn't about where the function was declared, it's about how it was called.** The same function gives a different \`this\` on different calls.

A quick way to work it out: look at **what's to the left of the dot** at call time. \`user.getName()\` → \`this\` is \`user\`. Plain \`getName()\` → nothing to the left → \`this\` is lost.

## Four rules, by priority

Check top to bottom; the first match wins:

1. **\`new Foo()\`** → \`this\` = the newly created object.
2. **Set explicitly** — \`fn.call(ctx)\`, \`fn.apply(ctx)\`, \`fn.bind(ctx)\` → \`this\` = \`ctx\`.
3. **Called through a dot** — \`obj.method()\` → \`this\` = \`obj\`.
4. **None of the above** → \`undefined\` in strict mode, modules and classes; otherwise (old sloppy code) the global object \`window\`.

## call / apply / bind — the difference

- \`fn.call(ctx, a, b)\` — **invoke right now**, arguments comma-separated. Mnemonic: **C** for Comma.
- \`fn.apply(ctx, [a, b])\` — **invoke right now**, arguments as an array. Mnemonic: **A** for Array.
- \`fn.bind(ctx, a)\` — **doesn't invoke**; returns a **new function** with \`this\` nailed down. It can also pre-fill leading arguments (partial application).

Important: \`bind\` is final. A second \`bind\` on top of the first cannot change \`this\`.

## Arrow functions

An arrow has **no \`this\` of its own at all**. It doesn't take part in those four rules — it simply takes \`this\` from wherever it was written (lexically, like any variable).

Consequences:

- an arrow **can't be rebound**: \`arrow.call(obj)\` silently ignores \`obj\`;
- an arrow is **perfect for callbacks inside methods** — \`this\` isn't lost;
- an arrow is **wrong as an object method** — \`this\` comes from the outer scope, not the object;
- arrows also have no own \`arguments\`, \`super\`, \`new.target\`, and can't be called with \`new\`.

## Example

\`\`\`js
const obj = {
  val: 42,
  regular() { return this.val; },
  arrow: () => this?.val,   // this — from the outer scope, not obj
};

obj.regular();    // 42 — obj is to the left of the dot
const f = obj.regular;
f();              // undefined — context lost
f.call(obj);      // 42 — context restored by hand
obj.arrow();      // undefined — the arrow has its own lexical this
\`\`\`

## What to say in the interview

> \`this\` is determined at call time, not at declaration time. The rule priority is: \`new\` → explicit binding via call/apply/bind → a call through a dot → the default (\`undefined\` in strict mode). \`call\` and \`apply\` invoke immediately and differ only in how arguments are passed, while \`bind\` returns a new function with \`this\` fixed, and it can't be rebound afterwards. Arrow functions have no own \`this\` — they take it lexically from where they were declared, so they can't be rebound, but they're convenient in callbacks where a regular function would lose context.

## Gotchas

- **Losing context when passing a method as a callback**: \`setTimeout(obj.method, 0)\` or \`arr.map(obj.method)\` → \`this\` is lost. Fixes: \`obj.method.bind(obj)\`, an arrow wrapper \`() => obj.method()\`, or an arrow class field.
- **Classes are always strict mode**, so a lost \`this\` is \`undefined\` and you immediately get "Cannot read properties of undefined".
- \`this\` inside a **nested regular function** within a method is \`undefined\`, not the object. That's why old code wrote \`const self = this\` and modern code uses arrows.
- In a regular function used as an **event handler**, \`this\` is the DOM element. With an arrow, it isn't.`
    },
    codeSnippet: `function greet(greeting, punct) {
  return \`\${greeting}, \${this.name}\${punct}\`;
}
const ctx = { name: 'Ann' };

greet.call(ctx, 'Hi', '!');            // 'Hi, Ann!'
greet.apply(ctx, ['Hello', '.']);     // 'Hello, Ann.'
const bound = greet.bind(ctx, 'Hey');
bound('?');                            // 'Hey, Ann?'
bound.bind({ name: 'Bob' })('?');      // still 'Hey, Ann?' — bind is final`
  },
  {
    id: 'jsts-005',
    category: 'js-state',
    level: 'Hard',
    tags: ['prototypes', 'prototype-chain', 'inheritance'],
    question: {
      ru: 'Как работает цепочка прототипов? Чем отличаются `__proto__`, `prototype` и `Object.getPrototypeOf`?',
      en: 'How does the prototype chain work? How do `__proto__`, `prototype`, and `Object.getPrototypeOf` differ?'
    },
    answer: {
      ru: `## Коротко

У каждого объекта в JS есть **скрытая ссылка на «объект-родитель»** — это и есть прототип. Если у объекта нет нужного свойства, движок идёт по этой ссылке к родителю, потом к родителю родителя — и так до \`null\`.

Аналогия: ищешь отвёртку. Нет у себя → спрашиваешь у соседа → сосед спрашивает у своего соседа → в конце концов либо нашли, либо \`undefined\`.

## Как это работает по шагам

1. Пишем \`obj.speak\`.
2. Движок смотрит **собственные** свойства \`obj\`. Нашёл — вернул.
3. Не нашёл — идёт по внутренней ссылке \`[[Prototype]]\` к следующему объекту и повторяет.
4. Дошли до \`Object.prototype\`, потом до \`null\` — вернулось \`undefined\`.

## Три похожих слова — не путать

- **\`prototype\`** — свойство **функции-конструктора**, а не обычного объекта. Это «шаблон», который станет прототипом для всех объектов, созданных через \`new\`. У обычного объекта \`{}\` никакого \`prototype\` нет.
- **\`__proto__\`** — устаревший способ **посмотреть/поменять прототип конкретного объекта**. Это геттер/сеттер на \`Object.prototype\`.
- **\`Object.getPrototypeOf(obj)\`** — современный и правильный способ сделать то же самое. Для записи — \`Object.setPrototypeOf\`.

Формула для запоминания: \`dog.__proto__ === Animal.prototype\`. Слева — «мой родитель», справа — «шаблон конструктора».

## Пример

\`\`\`js
function Animal(name) { this.name = name; }
Animal.prototype.speak = function () { return this.name + ' makes a sound'; };

const dog = new Animal('Rex');
Object.getPrototypeOf(dog) === Animal.prototype; // true
dog.speak();                                     // 'Rex makes a sound'
dog.hasOwnProperty('speak');                     // false — метод лежит в прототипе
\`\`\`

Здесь метод \`speak\` **один на всех** собак: он лежит в прототипе, а не копируется в каждый объект. Так классы экономят память.

## Что сказать на собеседовании

> Каждый объект имеет внутренний слот \`[[Prototype]]\` — ссылку на другой объект. При чтении свойства движок ищет его на самом объекте, потом поднимается по цепочке прототипов до \`Object.prototype\` и \`null\`; не нашёл — вернёт \`undefined\`. \`prototype\` — это свойство функции-конструктора, тот объект, который станет прототипом для экземпляров, созданных через \`new\`, а \`Object.getPrototypeOf\` — современная замена устаревшему \`__proto__\`. Классы в ES6 — синтаксический сахар над этим же механизмом: методы класса лежат в прототипе и разделяются между всеми экземплярами, а поля создаются у каждого свои.

## Ловушки

- **Чтение идёт по цепочке, запись — нет.** \`obj.x = 1\` всегда создаёт свойство **на самом объекте**, прототип не меняется (исключение — если в цепочке есть сеттер).
- \`hasOwnProperty\` отвечает «своё ли это свойство», \`in\` — «есть ли оно хоть где-то в цепочке». Современная замена — \`Object.hasOwn(obj, key)\`.
- **Менять прототип на лету дорого**: \`setPrototypeOf\` и \`__proto__ =\` ломают hidden class в V8 и деоптимизируют объект. Правильнее задать прототип сразу через \`Object.create\` или \`new\`.
- \`Object.create(null)\` создаёт объект **вообще без прототипа** — удобно для словарей: там не будет ни \`toString\`, ни \`constructor\`, и ключ \`"__proto__"\` не сломает объект.
- В \`class Child extends Parent\` строятся **две** цепочки: для экземпляров (\`Child.prototype.__proto__ === Parent.prototype\`) и для статики (\`Child.__proto__ === Parent\`).`,
      en: `## In short

Every object in JS has a **hidden link to a "parent object"** — that's the prototype. If the object doesn't have the property you asked for, the engine follows that link to the parent, then to the parent's parent, and so on until \`null\`.

The analogy: you need a screwdriver. Don't have one → ask your neighbour → they ask their neighbour → eventually you either find it or get \`undefined\`.

## How it works, step by step

1. We write \`obj.speak\`.
2. The engine checks \`obj\`'s **own** properties. Found — return it.
3. Not found — follow the internal \`[[Prototype]]\` link to the next object and repeat.
4. Reached \`Object.prototype\`, then \`null\` — the result is \`undefined\`.

## Three similar words — don't mix them up

- **\`prototype\`** — a property of a **constructor function**, not of a regular object. It's the "template" that becomes the prototype of everything created with \`new\`. A plain object \`{}\` has no \`prototype\` at all.
- **\`__proto__\`** — the legacy way to **read/change the prototype of a specific object**. It's a getter/setter on \`Object.prototype\`.
- **\`Object.getPrototypeOf(obj)\`** — the modern, correct way to do the same. For writing — \`Object.setPrototypeOf\`.

The formula to memorise: \`dog.__proto__ === Animal.prototype\`. On the left, "my parent"; on the right, "the constructor's template".

## Example

\`\`\`js
function Animal(name) { this.name = name; }
Animal.prototype.speak = function () { return this.name + ' makes a sound'; };

const dog = new Animal('Rex');
Object.getPrototypeOf(dog) === Animal.prototype; // true
dog.speak();                                     // 'Rex makes a sound'
dog.hasOwnProperty('speak');                     // false — the method lives on the prototype
\`\`\`

Here \`speak\` is **shared by all** dogs: it lives on the prototype rather than being copied into every object. That's how classes save memory.

## What to say in the interview

> Every object has an internal \`[[Prototype]]\` slot — a reference to another object. On a property read the engine looks at the object itself first, then walks up the prototype chain to \`Object.prototype\` and \`null\`; if nothing is found it returns \`undefined\`. \`prototype\` is a property of a constructor function — the object that becomes the prototype of instances created with \`new\`. \`__proto__\` is a legacy accessor to a specific object's prototype; the modern equivalent is \`Object.getPrototypeOf\`. ES6 classes are syntactic sugar over the same mechanism: class methods live on the prototype and are shared by all instances, while fields are created per instance.

## Gotchas

- **Reads walk the chain, writes don't.** \`obj.x = 1\` always creates the property **on the object itself**; the prototype is untouched (unless there's a setter in the chain).
- \`hasOwnProperty\` answers "is this the object's own property", \`in\` answers "does it exist anywhere in the chain". The modern replacement is \`Object.hasOwn(obj, key)\`.
- **Changing a prototype at runtime is expensive**: \`setPrototypeOf\` and \`__proto__ =\` break the hidden class in V8 and deoptimise the object. Set the prototype up front via \`Object.create\` or \`new\`.
- \`Object.create(null)\` creates an object with **no prototype at all** — handy for dictionaries: no \`toString\`, no \`constructor\`, and a \`"__proto__"\` key won't break anything.
- \`class Child extends Parent\` builds **two** chains: one for instances (\`Child.prototype.__proto__ === Parent.prototype\`) and one for statics (\`Child.__proto__ === Parent\`).`
    },
    codeSnippet: `const base = { greet() { return 'hi ' + this.name; } };
const obj = Object.create(base);   // obj.[[Prototype]] === base
obj.name = 'Ann';

obj.greet();                       // 'hi Ann' — found on prototype
obj.hasOwnProperty('greet');       // false
Object.getPrototypeOf(obj) === base; // true

// shadowing: write lands on obj, not the prototype
obj.greet = () => 'override';
base.greet === obj.greet;          // false`
  },
  {
    id: 'jsts-006',
    category: 'js-state',
    level: 'Expert',
    tags: ['memory', 'garbage-collection', 'mark-and-sweep'],
    question: {
      ru: 'Как работает сборка мусора в V8 (mark-and-sweep, generational GC)? Что значит «достижимость»?',
      en: 'How does garbage collection work in V8 (mark-and-sweep, generational GC)? What does "reachability" mean?'
    },
    answer: {
      ru: `## Коротко

Сборщик мусора удаляет объекты, до которых **больше нельзя добраться из живого кода**. Не «на которые никто не ссылается», а именно «до которых не дотянуться».

Аналогия: воздушные шарики. Есть несколько столбов (**корни**): глобальный объект, стек вызовов, живые замыкания. Шарик привязан ниточкой к столбу или к другому привязанному шарику — он жив. Ниточку перерезали — вся связка улетает, даже если шарики связаны между собой.

Именно поэтому GC не считает ссылки: два объекта, которые ссылаются друг на друга, но не привязаны ни к какому корню, **всё равно будут удалены**. Подсчёт ссылок такие циклы не ловит.

## Как это работает по шагам (mark-and-sweep)

1. **Mark** — движок идёт от корней по всем ссылкам и **помечает** всё, до чего дошёл.
2. **Sweep** — всё непомеченное считается мусором и освобождается.
3. **Compact** — при необходимости куча дефрагментируется, живые объекты сдвигаются вплотную.

## Почему GC «поколенческий»

Наблюдение: **большинство объектов умирают молодыми** (временный объект в функции живёт миллисекунды). Поэтому V8 делит кучу на две зоны:

- **Young generation** (новая память, алгоритм Scavenger) — сборки **частые и очень быстрые**. Выжившие пару раз объекты «переезжают» в старую зону.
- **Old generation** (долгожители) — сборки **редкие, но дорогие**: полноценный mark-sweep-compact. Чтобы не морозить страницу, V8 выполняет его инкрементально, параллельно и конкурентно с основным потоком — пауз «stop-the-world» почти не остаётся.

## Откуда берутся утечки на практике

- Забытые таймеры, подписки и слушатели событий — они и есть корни.
- Глобальные переменные и кэши без ограничения размера.
- **Detached DOM**: узел удалили из документа, но JS-переменная его держит — вместе со всем поддеревом.
- Замыкания, захватившие большие структуры.

\`\`\`js
let cache = new Map();
function remember(key, bigObj) { cache.set(key, bigObj); } // будет жить вечно
// как чинить: WeakMap или лимит + вытеснение (LRU)
\`\`\`

## Что сказать на собеседовании

> Сборщик мусора освобождает объекты, недостижимые из корней — глобального объекта, стека вызовов и активных замыканий. Основной алгоритм — mark-and-sweep: обход графа от корней с пометкой достижимых и освобождением остальных; подсчёт ссылок не используется, потому что не ловит циклы. V8 применяет поколенческий GC: молодое поколение собирается часто копирующим Scavenger, старое — редкими mark-sweep-compact, которые идут инкрементально и конкурентно, чтобы не блокировать основной поток. Типичные утечки — забытые подписки и таймеры, detached DOM; ищут их в DevTools → Memory по heap snapshot и retained size.

## Ловушки

- **Вызвать GC из JS нельзя.** \`global.gc()\` доступен только с флагом \`--expose-gc\` для отладки. Присваивание \`null\` не «удаляет объект», а лишь убирает одну ссылку.
- **Retained size ≠ shallow size.** В снапшоте важен именно retained: сколько памяти освободится, если убить этот объект.
- Утечку ищут не по одному снапшоту, а по **сравнению двух-трёх** после повторения одного и того же сценария.
- \`delete obj.prop\` — это не про память, а про свойство; ещё и деоптимизирует объект в V8.`,
      en: `## In short

The garbage collector removes objects that **can no longer be reached from live code**. Not "objects nobody references" — specifically "objects you can't get to".

The analogy: balloons. There are a few posts (**roots**): the global object, the call stack, live closures. A balloon tied by a string to a post, or to another tied balloon, stays. Cut the string and the whole bunch floats away, even if the balloons are tied to each other.

That's exactly why GC doesn't count references: two objects referencing each other but not attached to any root **still get collected**. Reference counting can't catch those cycles.

## How it works, step by step (mark-and-sweep)

1. **Mark** — the engine walks from the roots along every reference and **marks** everything it reaches.
2. **Sweep** — anything unmarked is garbage and gets freed.
3. **Compact** — if needed, the heap is defragmented and live objects are packed together.

## Why the GC is "generational"

The observation: **most objects die young** (a temporary object inside a function lives for milliseconds). So V8 splits the heap in two:

- **Young generation** (new memory, the Scavenger algorithm) — collections are **frequent and very fast**. Objects that survive a couple of rounds are "promoted" to the old space.
- **Old generation** (survivors) — collections are **rare but expensive**: a full mark-sweep-compact. To avoid freezing the page, V8 runs it incrementally, in parallel and concurrently with the main thread, so stop-the-world pauses are almost gone.

## Where leaks actually come from

- Forgotten timers, subscriptions and event listeners — they are roots.
- Global variables and caches with no size limit.
- **Detached DOM**: the node was removed from the document but a JS variable still holds it — along with its entire subtree.
- Closures that captured large structures.

\`\`\`js
let cache = new Map();
function remember(key, bigObj) { cache.set(key, bigObj); } // lives forever
// how to fix: WeakMap, or a size limit with eviction (LRU)
\`\`\`

## What to say in the interview

> The garbage collector frees objects that are unreachable from the roots — the global object, the call stack and active closures. The primary algorithm is mark-and-sweep: traverse the graph from the roots, mark what's reachable and free the rest; reference counting isn't used as the primary algorithm because it misses cycles. V8 uses a generational GC: the young generation is collected often and quickly by the copying Scavenger, the old generation by rare mark-sweep-compact runs that go incrementally and concurrently so the main thread isn't blocked. Typical leaks are forgotten subscriptions and timers, global caches, detached DOM and closures over large objects; you find them in DevTools → Memory via heap snapshots and a growing retained size.

## Gotchas

- **You can't force GC from JS.** \`global.gc()\` only exists with the \`--expose-gc\` flag for debugging. Assigning \`null\` doesn't "delete the object", it just removes one reference.
- **Retained size ≠ shallow size.** In a snapshot what matters is retained: how much memory would be freed if this object died.
- You don't find a leak from one snapshot — you **compare two or three** after repeating the same scenario.
- \`delete obj.prop\` isn't about memory, it's about the property — and it also deoptimises the object in V8.`
    },
    codeSnippet: `// A classic detached-DOM leak
let detached;
function build() {
  const ul = document.createElement('ul');
  for (let i = 0; i < 1000; i++) ul.appendChild(document.createElement('li'));
  detached = ul; // JS keeps the whole subtree alive even after removal
}
build();
// document never references 'ul', but 'detached' is a GC root -> leak
detached = null; // now unreachable -> eligible for collection`
  },
  {
    id: 'jsts-007',
    category: 'js-state',
    level: 'Expert',
    tags: ['weakmap', 'weakref', 'finalization-registry'],
    question: {
      ru: 'Зачем нужны WeakMap, WeakRef и FinalizationRegistry? В чём их семантика «слабых» ссылок и риски?',
      en: 'What are WeakMap, WeakRef and FinalizationRegistry for? What are their "weak" reference semantics and risks?'
    },
    answer: {
      ru: `## Коротко

Обычная ссылка **держит** объект в памяти. Слабая ссылка — **не держит**: она говорит сборщику мусора «если больше никому не нужен — забирай, я не в счёт».

Аналогия: обычная ссылка — это когда ты держишь человека за руку. Слабая — ты просто знаешь его телефон. Ушёл — ушёл, номер стал бесполезным.

## WeakMap и WeakSet — «заметки на полях объекта»

- **Ключом может быть только объект** (и символ), и держится он слабо.
- Как только на ключ не осталось **обычных** ссылок — вся пара «ключ-значение» исчезает сама.
- Поэтому WeakMap **нельзя обойти циклом**, у него нет \`size\` и нет \`clear()\`: содержимое зависит от того, когда отработал GC, а это недетерминированно.

Для чего: приватные данные объекта, метаданные, кэш «по объекту» — всё это без риска утечки.

\`\`\`js
const privates = new WeakMap();
class Account {
  constructor(balance) { privates.set(this, { balance }); }
  get balance() { return privates.get(this).balance; }
}
let acc = new Account(100);
acc = null; // запись в WeakMap исчезнет сама, чистить руками не нужно
\`\`\`

## WeakRef — слабая ссылка на один объект

\`new WeakRef(obj)\` заворачивает объект. Достать его обратно — \`ref.deref()\`, и вернётся либо объект, либо \`undefined\`, если его уже собрали.

Применение: кэш «пока кто-то ещё пользуется — держим, кончилась память — пусть заберёт GC».

## FinalizationRegistry — колбэк «после похорон»

Позволяет зарегистрировать функцию, которую **может быть** вызовут после того, как объект собрали. Используется как страховка, чтобы подчистить внешний ресурс.

\`\`\`js
const cache = new Map();
const registry = new FinalizationRegistry((key) => cache.delete(key));

function cacheValue(key, obj) {
  cache.set(key, new WeakRef(obj));
  registry.register(obj, key);   // подчистим ключ, когда объект умрёт
}
\`\`\`

## Что сказать на собеседовании

> WeakMap и WeakSet держат ключи-объекты слабо: как только на ключ не остаётся сильных ссылок, запись удаляется сборщиком мусора. Поэтому они неитерируемы и не имеют size — содержимое недетерминированно. Это инструмент для метаданных и приватного состояния, привязанных к объекту, без ручной очистки. WeakRef даёт слабую ссылку на конкретный объект: \`deref()\` вернёт объект или undefined, если он уже собран. FinalizationRegistry регистрирует колбэк, вызываемый после сборки объекта, но его вызов не гарантирован, поэтому на нём нельзя строить критичную очистку — только страховку поверх явного \`dispose\`.

## Ловушки

- **Строкой ключ быть не может**: \`weakMap.set('a', 1)\` → TypeError. Только объекты (и с недавних пор — незарегистрированные символы).
- **Значение может утечь через себя же**: если значение в WeakMap ссылается на свой ключ, связка живёт вечно.
- **Финализатор может не вызваться никогда** — например, если страницу закрыли. Никакой критичной логики (закрыть соединение, дописать файл) туда класть нельзя.
- **WeakRef усложняет код и рассуждения**: между двумя \`deref()\` объект может исчезнуть. Спецификация разрешает движку и вовсе не собирать объект.
- Всё это — **инструменты против утечек, а не замена явному управлению ресурсами**. Отписка в \`ngOnDestroy\` не отменяется.`,
      en: `## In short

A normal reference **holds** an object in memory. A weak reference **doesn't**: it tells the garbage collector "if nobody else needs it, take it — I don't count".

The analogy: a normal reference is holding someone by the hand. A weak one is just knowing their phone number. They leave — they leave, and the number becomes useless.

## WeakMap and WeakSet — "notes in an object's margin"

- **Only objects** (and symbols) can be keys, and they're held weakly.
- As soon as no **normal** references to the key remain, the whole key-value pair disappears on its own.
- That's why a WeakMap **can't be iterated**, has no \`size\` and no \`clear()\`: its contents depend on when the GC ran, which is non-deterministic.

What it's for: an object's private data, metadata, a per-object cache — all without leak risk.

\`\`\`js
const privates = new WeakMap();
class Account {
  constructor(balance) { privates.set(this, { balance }); }
  get balance() { return privates.get(this).balance; }
}
let acc = new Account(100);
acc = null; // the WeakMap entry disappears by itself, no manual cleanup
\`\`\`

## WeakRef — a weak reference to a single object

\`new WeakRef(obj)\` wraps an object. To get it back, call \`ref.deref()\`, which returns either the object or \`undefined\` if it has already been collected.

Use case: a cache that says "keep it while someone is still using it; under memory pressure, let the GC take it".

## FinalizationRegistry — a callback "after the funeral"

Lets you register a function that **may** be called after an object has been collected. Used as a safety net to clean up an external resource.

\`\`\`js
const cache = new Map();
const registry = new FinalizationRegistry((key) => cache.delete(key));

function cacheValue(key, obj) {
  cache.set(key, new WeakRef(obj));
  registry.register(obj, key);   // clean up the key when the object dies
}
\`\`\`

## What to say in the interview

> WeakMap and WeakSet hold object keys weakly: as soon as no strong references to the key remain, the entry is removed by the garbage collector. That's why they're not iterable and have no size — their contents are non-deterministic. They're the ideal tool for private state and metadata attached to an object without manual cleanup. WeakRef gives a weak reference to a specific object: \`deref()\` returns the object or undefined if it's already collected. FinalizationRegistry lets you register a callback invoked after an object is collected, but the call is neither guaranteed nor deterministic in timing, so you can't build critical cleanup on it — only a safety net on top of an explicit \`dispose\` or \`unsubscribe\`.

## Gotchas

- **A string can't be a key**: \`weakMap.set('a', 1)\` → TypeError. Only objects (and, recently, unregistered symbols).
- **A value can leak through itself**: if a WeakMap value references its own key, the pair lives forever.
- **The finaliser may never run** — for example if the page is closed. Nothing critical (closing a connection, flushing a file) belongs there.
- **WeakRef complicates the code and your reasoning**: between two \`deref()\` calls the object can vanish. The spec even allows an engine never to collect an object.
- These are all **tools against leaks, not a replacement for explicit resource management**. You still unsubscribe in \`ngOnDestroy\`.`
    },
    codeSnippet: `// Per-object private metadata that cannot leak
const privates = new WeakMap();
class Account {
  constructor(balance) { privates.set(this, { balance }); }
  get balance() { return privates.get(this).balance; }
}
let acc = new Account(100);
acc.balance;        // 100
acc = null;         // the WeakMap entry becomes collectable automatically`
  },
  {
    id: 'jsts-008',
    category: 'js-state',
    level: 'Medium',
    tags: ['hoisting', 'tdz', 'let-const-var'],
    question: {
      ru: 'Объясните hoisting и Temporal Dead Zone. Чем отличается поведение var, let, const и объявлений функций?',
      en: 'Explain hoisting and the Temporal Dead Zone. How do var, let, const and function declarations differ?'
    },
    answer: {
      ru: `## Коротко

Перед тем как выполнять код, движок **сначала пробегает его глазами** и записывает в блокнот все объявления. Это и есть **hoisting** («всплытие»): имена как будто поднимаются наверх своего блока.

Но записываются они **по-разному**, и в этом весь вопрос.

## Три вида поведения

Что происходит, если обратиться к имени **до** строки объявления:

- **\`var\`** — имя уже есть, значение \`undefined\`. Код не падает, и это плохо: ошибка проявится позже и не там.
- **\`function foo() {}\`** — функция есть **целиком**, её можно спокойно вызвать выше объявления.
- **\`let\` / \`const\` / \`class\`** — имя есть, но трогать нельзя → **ReferenceError**.

Именно последняя зона — от начала блока до строки объявления — называется **TDZ (Temporal Dead Zone, «временная мёртвая зона»)**.

## Зачем нужна TDZ

Чтобы **ошибка была громкой**. С \`var\` опечатка тихо давала \`undefined\` и падала где-то далеко. С \`let\` вы получите точную ошибку ровно в той строке, где обратились раньше времени.

## Пример

\`\`\`js
console.log(a); // undefined — var поднялся со значением undefined
var a = 1;

console.log(b); // ReferenceError — b в TDZ
let b = 2;

foo();          // 'ok' — function declaration поднялась целиком
function foo() { return 'ok'; }

typeof c;       // 'undefined' — для вообще необъявленной переменной
typeof d;       // ReferenceError — typeof от TDZ не спасает!
let d;
\`\`\`

## Ещё три отличия var от let/const

1. **Область видимости.** \`var\` живёт во всей функции (даже если объявлен внутри \`if\` или цикла), \`let/const\` — только в своих фигурных скобках.
2. **В цикле.** \`let\` создаёт **новую переменную на каждую итерацию** — поэтому колбэки внутри цикла видят каждый своё значение, а с \`var\` все увидят последнее.
3. **Глобальный объект.** \`var x\` на верхнем уровне скрипта создаёт \`window.x\`, а \`let x\` — нет.

## Что сказать на собеседовании

> На этапе создания лексического окружения движок регистрирует все объявления до выполнения кода — это и есть hoisting. \`var\` поднимается и сразу инициализируется в \`undefined\`, function declaration поднимается целиком с телом, а \`let\`, \`const\` и \`class\` поднимаются, но остаются неинициализированными: обращение к ним до строки объявления даёт ReferenceError. Этот промежуток и называется Temporal Dead Zone, он введён намеренно, чтобы ловить использование до инициализации. Дополнительно \`var\` имеет функциональную область видимости, а \`let/const\` — блочную, и в цикле \`let\` создаёт новую привязку на каждую итерацию.

## Ловушки

- \`typeof\` **не защищает от TDZ**: для необъявленной переменной вернётся \`'undefined'\`, а для переменной в TDZ будет ReferenceError.
- **Function expression не поднимается**: у \`const f = () => {}\` поднимается только имя \`f\`, и оно в TDZ. Вызов выше — ошибка.
- \`const\` запрещает **переприсваивание**, но не запрещает менять содержимое: \`const arr = []; arr.push(1)\` — законно.
- Объявление внутри блока \`{}\` перекрывает внешнюю переменную с самого начала блока: обращение к имени до \`let x\` в блоке даст ошибку, а не внешнее значение.`,
      en: `## In short

Before running any code, the engine **skims through it first** and writes every declaration into a notebook. That's **hoisting**: names appear to float to the top of their block.

But they're recorded **differently**, and that's the whole question.

## Three kinds of behaviour

What happens if you touch a name **before** its declaration line:

- **\`var\`** — the name already exists with the value \`undefined\`. The code doesn't crash, and that's bad: the error shows up later and elsewhere.
- **\`function foo() {}\`** — the function exists **in full** and can be called safely above its declaration.
- **\`let\` / \`const\` / \`class\`** — the name exists but must not be touched → **ReferenceError**.

That last zone — from the start of the block to the declaration line — is called the **TDZ (Temporal Dead Zone)**.

## Why the TDZ exists

To make **errors loud**. With \`var\`, a typo quietly produced \`undefined\` and crashed somewhere far away. With \`let\` you get a precise error on exactly the line where you touched it too early.

## Example

\`\`\`js
console.log(a); // undefined — var was hoisted with the value undefined
var a = 1;

console.log(b); // ReferenceError — b is in the TDZ
let b = 2;

foo();          // 'ok' — the function declaration was hoisted in full
function foo() { return 'ok'; }

typeof c;       // 'undefined' — for a name that was never declared
typeof d;       // ReferenceError — typeof does NOT save you from the TDZ!
let d;
\`\`\`

## Three more differences between var and let/const

1. **Scope.** \`var\` lives in the whole function (even if declared inside an \`if\` or a loop); \`let/const\` live only inside their braces.
2. **In a loop.** \`let\` creates a **fresh variable per iteration**, so callbacks inside the loop each see their own value; with \`var\` they all see the last one.
3. **The global object.** \`var x\` at the top level of a script creates \`window.x\`; \`let x\` doesn't.

## What to say in the interview

> During the creation phase of a lexical environment the engine registers all declarations before executing code — that's hoisting. \`var\` is hoisted and immediately initialised to \`undefined\`, a function declaration is hoisted together with its body, while \`let\`, \`const\` and \`class\` are hoisted but left uninitialised: touching them before their declaration line throws a ReferenceError. That span is the Temporal Dead Zone, introduced deliberately to catch use-before-initialisation. On top of that, \`var\` has function scope and lands on the global object, whereas \`let/const\` are block-scoped, and in a loop \`let\` creates a fresh binding per iteration.

## Gotchas

- \`typeof\` **doesn't protect you from the TDZ**: for an undeclared name it returns \`'undefined'\`, but for a name in the TDZ it throws a ReferenceError.
- **Function expressions aren't hoisted**: with \`const f = () => {}\` only the name \`f\` is hoisted, and it sits in the TDZ. Calling it above is an error.
- \`const\` forbids **reassignment**, not mutation: \`const arr = []; arr.push(1)\` is perfectly legal.
- A declaration inside a block \`{}\` shadows the outer variable from the very top of the block: touching the name before \`let x\` inside the block throws instead of reading the outer value.`
    },
    codeSnippet: `let x = 'outer';
{
  // TDZ for the inner 'x' starts at the block top
  // console.log(x); // ReferenceError, NOT 'outer'
  let x = 'inner';
  console.log(x);    // 'inner'
}

function f() {
  console.log(v);    // undefined (var hoisted, not TDZ)
  var v = 1;
}
f();`
  },
  {
    id: 'jsts-009',
    category: 'js-state',
    level: 'Hard',
    tags: ['coercion', 'equality', 'type-conversion'],
    question: {
      ru: 'Как работает приведение типов и алгоритм абстрактного равенства `==`? Приведите коварные примеры.',
      en: 'How does type coercion and the abstract equality `==` algorithm work? Give tricky examples.'
    },
    answer: {
      ru: `## Коротко

Разница простая:

- **\`===\`** — «одинаковый тип И одинаковое значение». Ничего не преобразует.
- **\`==\`** — «а давай я сначала приведу их к общему виду, а потом сравню». Вот из этого «приведу» и растут все странности JS.

Правило жизни: **всегда \`===\`**. Единственное исключение — \`x == null\`, которое одной проверкой ловит и \`null\`, и \`undefined\`.

## Как \`==\` приводит типы (по шагам)

1. Типы совпадают → работает как \`===\`.
2. \`null == undefined\` → \`true\`. И **больше ни с чем** ни \`null\`, ни \`undefined\` не равны.
3. Число и строка → **строка превращается в число**.
4. Есть \`boolean\` → он превращается в число (\`true\` → 1, \`false\` → 0), и сравнение начинается заново.
5. Объект и примитив → **объект превращается в примитив** (через \`Symbol.toPrimitive\`, потом \`valueOf\`, потом \`toString\`) и сравнение начинается заново.

Отдельно про объекты: \`[] \` через \`toString()\` становится пустой строкой \`''\`, а \`[5]\` становится \`'5'\`. Отсюда почти вся «магия».

## Коварные примеры с разбором

\`\`\`js
[] == ![]           // true: ![] -> false -> 0; [] -> '' -> 0; 0 == 0
[] == ''            // true: [] -> ''
[] == 0             // true: [] -> '' -> 0
'' == 0             // true: '' -> 0
'0' == false        // true: false -> 0, '0' -> 0
null == 0           // false! null сравнивается только с undefined
NaN === NaN         // false — NaN не равен ничему, даже себе
Object.is(NaN, NaN) // true
0 === -0            // true, а Object.is(0, -0) — false
\`\`\`

## Про \`+\` отдельно

\`+\` — единственный оператор, который **любит строки**: если хотя бы один операнд строка, будет склейка. Все остальные арифметические операторы приводят к числу.

\`\`\`js
1 + '2'   // '12'  (склейка)
1 - '2'   // -1    (число)
[] + {}   // '[object Object]'
\`\`\`

## Что сказать на собеседовании

> \`===\` сравнивает без приведения типов: разные типы — сразу false. \`==\` перед сравнением приводит операнды по алгоритму абстрактного равенства: \`null\` равен только \`undefined\`, строка с числом приводится к числу, boolean приводится к числу, а объект приводится к примитиву через ToPrimitive — \`Symbol.toPrimitive\`, \`valueOf\`, \`toString\`. Из-за этого получаются известные казусы вроде \`[] == ![]\`. На практике всегда используем \`===\`, единственное оправданное применение \`==\` — это \`x == null\` как компактная проверка сразу на null и undefined. Для особых случаев есть \`Object.is\`: он отличает \`NaN\` от всего остального и \`0\` от \`-0\`.

## Ловушки

- \`NaN\` **не равен сам себе**. Проверять надо через \`Number.isNaN(x)\` (не глобальный \`isNaN\` — тот сначала приводит к числу).
- **Объекты сравниваются по ссылке**: \`{a:1} === {a:1}\` → false. Даже \`==\` тут не поможет.
- \`typeof null === 'object'\` — историческая ошибка языка, её не исправят из-за обратной совместимости.
- **Falsy-значения**, которые надо помнить наизусть: \`false\`, \`0\`, \`-0\`, \`0n\`, \`''\`, \`null\`, \`undefined\`, \`NaN\`. Всё остальное truthy — включая \`[]\`, \`{}\` и строку \`'0'\`.
- \`'' == 0\` → true, но \`if ('')\` и \`if (0)\` — оба false. Не путайте приведение при сравнении и приведение к boolean.`,
      en: `## In short

The difference is simple:

- **\`===\`** — "same type AND same value". Converts nothing.
- **\`==\`** — "let me convert them to a common form first, then compare". That "convert" is where all of JS's weirdness comes from.

Rule for life: **always \`===\`**. The one exception is \`x == null\`, which catches both \`null\` and \`undefined\` in a single check.

## How \`==\` coerces, step by step

1. Same types → behaves exactly like \`===\`.
2. \`null == undefined\` → \`true\`. And neither is equal to **anything else**.
3. Number and string → **the string becomes a number**.
4. A \`boolean\` is involved → it becomes a number (\`true\` → 1, \`false\` → 0) and the comparison restarts.
5. Object and primitive → **the object becomes a primitive** (via \`Symbol.toPrimitive\`, then \`valueOf\`, then \`toString\`) and the comparison restarts.

About objects specifically: \`[]\` becomes the empty string \`''\` via \`toString()\`, and \`[5]\` becomes \`'5'\`. That's the source of almost all the "magic".

## Tricky examples, explained

\`\`\`js
[] == ![]           // true: ![] -> false -> 0; [] -> '' -> 0; 0 == 0
[] == ''            // true: [] -> ''
[] == 0             // true: [] -> '' -> 0
'' == 0             // true: '' -> 0
'0' == false        // true: false -> 0, '0' -> 0
null == 0           // false! null only compares equal to undefined
NaN === NaN         // false — NaN equals nothing, not even itself
Object.is(NaN, NaN) // true
0 === -0            // true, but Object.is(0, -0) is false
\`\`\`

## A note on \`+\`

\`+\` is the one operator that **loves strings**: if either operand is a string, you get concatenation. Every other arithmetic operator coerces to a number.

\`\`\`js
1 + '2'   // '12'  (concatenation)
1 - '2'   // -1    (number)
[] + {}   // '[object Object]'
\`\`\`

## What to say in the interview

> \`===\` compares without coercion: different types are immediately false. \`==\` coerces the operands first, following the abstract equality algorithm: \`null\` is only equal to \`undefined\`, a string compared with a number is converted to a number, a boolean is converted to a number, and an object is converted to a primitive via ToPrimitive — \`Symbol.toPrimitive\`, \`valueOf\`, \`toString\`. That's where the famous oddities like \`[] == ![]\` come from. In practice we always use \`===\`; the only justified use of \`==\` is \`x == null\` as a compact check for both null and undefined. For special cases there's \`Object.is\`, which distinguishes \`NaN\` from everything else and \`0\` from \`-0\`.

## Gotchas

- \`NaN\` **is not equal to itself**. Check with \`Number.isNaN(x)\` — not the global \`isNaN\`, which coerces to a number first.
- **Objects compare by reference**: \`{a:1} === {a:1}\` is false. \`==\` won't help either.
- \`typeof null === 'object'\` — a historical bug in the language, kept for backward compatibility.
- **Falsy values worth memorising**: \`false\`, \`0\`, \`-0\`, \`0n\`, \`''\`, \`null\`, \`undefined\`, \`NaN\`. Everything else is truthy — including \`[]\`, \`{}\` and the string \`'0'\`.
- \`'' == 0\` is true, yet \`if ('')\` and \`if (0)\` are both false. Don't confuse coercion in comparison with coercion to boolean.`
    },
    codeSnippet: `// Custom coercion via valueOf / Symbol.toPrimitive
const money = {
  amount: 10,
  [Symbol.toPrimitive](hint) {
    return hint === 'string' ? \`$\${this.amount}\` : this.amount;
  }
};
money + 5;          // 15   (number/default hint)
\`Price: \${money}\`;  // 'Price: $10' (string hint)
money == 10;        // true (object -> primitive 10)`
  },
  {
    id: 'jsts-010',
    category: 'js-state',
    level: 'Hard',
    tags: ['modules', 'esm', 'commonjs'],
    question: {
      ru: 'Чем ESM отличается от CommonJS? Объясните статичность импортов, live bindings и tree-shaking.',
      en: 'How does ESM differ from CommonJS? Explain static imports, live bindings, and tree-shaking.'
    },
    answer: {
      ru: `## Коротко

Главное отличие в **одном слове: когда**.

- **CommonJS (\`require\`)** — модули подключаются **во время выполнения**. Строчка \`require('x')\` — это обычный вызов функции: её можно засунуть в \`if\`, в цикл, склеить путь из переменной.
- **ESM (\`import\`)** — модули разбираются **до выполнения**, на этапе парсинга. Поэтому \`import\` можно писать только на верхнем уровне файла, и путь обязан быть строкой-константой.

Аналогия: CJS — «сбегаю в магазин, когда понадобится». ESM — «список покупок составлен заранее, ещё до выхода из дома».

## Почему это важно: tree-shaking

Раз структура известна заранее, бандлер может **прочитать все импорты, не выполняя код**, и выкинуть всё, что не используется. Это и есть tree-shaking, и он работает **только с ESM**. С \`require\` бандлер не знает, что именно понадобится, и тащит модуль целиком.

Помогает ещё \`"sideEffects": false\` в \`package.json\` — обещание бандлеру, что импорт модуля ничего не ломает, если его выкинуть.

## Live bindings — вторая ключевая разница

- В CJS \`module.exports\` — это **объект со значениями**. При импорте вы получаете **копию ссылки** на момент выполнения.
- В ESM импорт — это **живая привязка** к переменной в модуле. Поменялась там — вы сразу видите новое значение.

\`\`\`js
// counter.mjs
export let count = 0;
export const inc = () => count++;

// main.mjs
import { count, inc } from './counter.mjs';
inc();
console.log(count); // 1 — live binding, а не копия
\`\`\`

С CommonJS такой же код напечатал бы \`0\`.

## Что ещё отличается

- **Импортированные значения только для чтения**: присвоить \`count = 5\` в импортирующем модуле нельзя, будет ошибка.
- **ESM всегда strict mode**, у CJS — как написали.
- В ESM нет \`__dirname\`, \`__filename\`, \`require\` — вместо них \`import.meta.url\`.
- В ESM есть **top-level await** — можно писать \`await\` прямо в теле модуля.
- \`import\` **поднимается** (hoisting): импорты выполняются раньше остального кода файла.

## Что сказать на собеседовании

> CommonJS загружает модули синхронно и динамически: \`require\` — это вызов функции во время выполнения, поэтому его можно поставить под условие. ESM разбирается статически, до выполнения кода: сначала фаза construction, потом instantiation со связыванием биндингов, потом evaluation. Именно статичность даёт tree-shaking — бандлер видит граф зависимостей без запуска кода. Вторая важная разница — live bindings: в ESM импорт это ссылка на переменную модуля, а не копия значения, и импортированные имена доступны только для чтения. Плюс ESM всегда в strict mode, поддерживает top-level await и не имеет \`__dirname\`/\`require\`.

## Ловушки

- **CJS не может напрямую \`require\` ESM** — ESM асинхронен. Нужен динамический \`import()\`, который вернёт промис.
- **ESM может импортировать CJS**, но named exports вычисляются эвристикой; надёжнее брать default-экспорт.
- **Циклические зависимости** ведут себя по-разному: в CJS вы получите частично заполненный \`exports\`, в ESM — переменную в TDZ (ReferenceError).
- Флаг \`__esModule\` в собранном коде — это артефакт транспиляции TypeScript/Babel, а не часть стандарта.
- Побочные эффекты на верхнем уровне модуля **ломают tree-shaking**: бандлер не рискнёт выкинуть такой модуль.`,
      en: `## In short

The whole difference comes down to **one word: when**.

- **CommonJS (\`require\`)** — modules are wired up **at runtime**. The line \`require('x')\` is an ordinary function call: you can put it in an \`if\`, in a loop, build the path from a variable.
- **ESM (\`import\`)** — modules are resolved **before execution**, at parse time. That's why \`import\` can only appear at the top level of a file and the path must be a string literal.

The analogy: CJS is "I'll pop to the shop when I need it". ESM is "the shopping list was written before leaving the house".

## Why it matters: tree-shaking

Because the structure is known ahead of time, a bundler can **read every import without executing any code** and drop everything unused. That's tree-shaking, and it works **only with ESM**. With \`require\` the bundler can't know what will be needed, so it pulls the whole module in.

\`"sideEffects": false\` in \`package.json\` helps too — it's a promise to the bundler that dropping the module breaks nothing.

## Live bindings — the second key difference

- In CJS, \`module.exports\` is **an object of values**. Importing gives you a **copy of the reference** as of execution time.
- In ESM, an import is a **live binding** to the variable inside the module. Change it there and you immediately see the new value.

\`\`\`js
// counter.mjs
export let count = 0;
export const inc = () => count++;

// main.mjs
import { count, inc } from './counter.mjs';
inc();
console.log(count); // 1 — a live binding, not a copy
\`\`\`

With CommonJS the same code would print \`0\`.

## What else differs

- **Imported values are read-only**: assigning \`count = 5\` in the importing module is an error.
- **ESM is always strict mode**; CJS is whatever you wrote.
- ESM has no \`__dirname\`, \`__filename\` or \`require\` — you get \`import.meta.url\` instead.
- ESM supports **top-level await** — you can write \`await\` directly in the module body.
- \`import\` is **hoisted**: imports run before the rest of the file.

## What to say in the interview

> CommonJS loads modules synchronously and dynamically: \`require\` is a function call at runtime, so it can be placed under a condition. ESM is resolved statically, before execution: first construction, then instantiation where bindings are linked, then evaluation. That static structure is what enables tree-shaking — the bundler sees the dependency graph without running any code. The second important difference is live bindings: in ESM an import is a reference to the module's variable rather than a copy of the value, and imported names are read-only. On top of that, ESM is always in strict mode, supports top-level await and has no \`__dirname\` or \`require\`.

## Gotchas

- **CJS can't \`require\` ESM directly** — ESM is asynchronous. You need a dynamic \`import()\`, which returns a promise.
- **ESM can import CJS**, but named exports are worked out heuristically; taking the default export is more reliable.
- **Circular dependencies behave differently**: in CJS you get a partially filled \`exports\`, in ESM a variable in the TDZ (ReferenceError).
- The \`__esModule\` flag in bundled code is an artefact of TypeScript/Babel transpilation, not part of the standard.
- Top-level side effects **break tree-shaking**: the bundler won't risk dropping such a module.`
    },
    codeSnippet: `// CommonJS — value copy, dynamic, synchronous
// lib.cjs
let count = 0;
module.exports = { count, inc: () => ++count };
// main.cjs
const { count, inc } = require('./lib.cjs');
inc();
console.log(count); // 0 — a COPY, not a live binding (contrast with ESM)`
  },
  {
    id: 'jsts-011',
    category: 'js-state',
    level: 'Medium',
    tags: ['modules', 'dynamic-import', 'code-splitting'],
    question: {
      ru: 'Что такое динамический `import()` и для чего он нужен? Чем отличается от статического импорта?',
      en: 'What is dynamic `import()` and what is it for? How does it differ from a static import?'
    },
    answer: {
      ru: `## Коротко

Обычный \`import\` — это «загрузи сразу при старте, всегда». Динамический \`import()\` — это **функция, которая грузит модуль тогда, когда он реально понадобился**, и возвращает промис.

Аналогия: обычный импорт — взять с собой в поездку весь гардероб. Динамический — заказать куртку, только когда похолодало.

## Три отличия от статического импорта

1. **Это выражение, а не объявление.** Его можно писать внутри функции, под \`if\`, в обработчике клика.
2. **Путь может быть вычисляемым**: \`import('./locales/' + lang + '.js')\`. У статического импорта путь обязан быть строковым литералом.
3. **Возвращает Promise** с объектом-namespace модуля. Default-экспорт лежит в поле \`.default\`.

## Зачем это нужно на практике

Бандлер видит \`import()\` и **режет код на куски (chunks)**: то, что за динамическим импортом, не попадает в стартовый бандл и грузится отдельным файлом по требованию.

- Ленивая загрузка маршрутов и тяжёлых фич — графиков, редакторов, PDF-вьюеров.
- Меньше стартовый бандл → быстрее первая загрузка страницы.
- Подгрузка по условию: полифилл только старым браузерам, фича только части пользователей.

\`\`\`js
button.addEventListener('click', async () => {
  const { renderChart } = await import('./chart.js'); // отдельный chunk
  renderChart(data);
});
\`\`\`

В Angular это ровно то, что стоит за \`loadComponent\` и \`loadChildren\` в роутере.

## Что сказать на собеседовании

> Динамический \`import()\` — это выражение, которое возвращает промис с пространством имён модуля и загружает модуль лениво, во время выполнения. В отличие от статического импорта его можно вызывать условно, внутри функций и с вычисляемым путём. Для бандлера это точка code splitting: содержимое уходит в отдельный chunk и не попадает в начальный бандл, что уменьшает время первой загрузки. Используем для ленивых маршрутов, тяжёлых библиотек и условных полифиллов; в Angular на нём построены \`loadComponent\` и \`loadChildren\`. Важно обрабатывать ошибку загрузки — chunk может не скачаться, особенно после нового деплоя.

## Ловушки

- **Ошибку загрузки надо ловить.** Сеть падает, а после деплоя старый chunk может исчезнуть с сервера — типичная ошибка «Loading chunk failed». Нужен \`try/catch\` и понятный fallback.
- **Слишком мелкое дробление вредит**: десятки крошечных chunk'ов — это десятки запросов. Разумно резать по маршрутам и крупным фичам.
- **Динамический импорт с полностью переменным путём мешает бандлеру**: он не знает, какие файлы включить, и либо соберёт всю папку, либо не соберёт ничего. Лучше, чтобы часть пути была статичной.
- Загрузку можно **подготовить заранее** — начать \`import()\` на \`mouseover\` или в момент простоя, чтобы к клику chunk уже был в кэше.`,
      en: `## In short

A regular \`import\` means "load this at startup, always". A dynamic \`import()\` is **a function that loads a module when it's actually needed**, and returns a promise.

The analogy: a static import is packing your entire wardrobe for a trip. A dynamic one is ordering a coat only once it gets cold.

## Three differences from a static import

1. **It's an expression, not a declaration.** You can write it inside a function, under an \`if\`, in a click handler.
2. **The path can be computed**: \`import('./locales/' + lang + '.js')\`. A static import requires a string literal.
3. **It returns a Promise** of the module namespace object. The default export lives under \`.default\`.

## Why it matters in practice

The bundler sees \`import()\` and **splits the code into chunks**: whatever is behind the dynamic import doesn't go into the initial bundle and is fetched as a separate file on demand.

- Lazy loading of routes and heavy features — charts, editors, PDF viewers.
- A smaller initial bundle → a faster first page load.
- Conditional loading: a polyfill only for old browsers, a feature only for some users.

\`\`\`js
button.addEventListener('click', async () => {
  const { renderChart } = await import('./chart.js'); // a separate chunk
  renderChart(data);
});
\`\`\`

In Angular this is exactly what sits behind \`loadComponent\` and \`loadChildren\` in the router.

## What to say in the interview

> A dynamic \`import()\` is an expression that returns a promise of the module namespace and loads the module lazily at runtime. Unlike a static import it can be called conditionally, inside functions, and with a computed path. For the bundler it's a code-splitting point: the contents go into a separate chunk and stay out of the initial bundle, which reduces first-load time. We use it for lazy routes, heavy libraries and conditional polyfills; in Angular \`loadComponent\` and \`loadChildren\` are built on it. It's important to handle load failures — a chunk may fail to download, especially after a new deployment.

## Gotchas

- **You must catch load errors.** Networks fail, and after a deployment an old chunk may no longer exist on the server — the classic "Loading chunk failed". You need a \`try/catch\` and a sensible fallback.
- **Splitting too finely hurts**: dozens of tiny chunks mean dozens of requests. Split by routes and large features.
- **A fully variable path confuses the bundler**: it can't tell which files to include, so it either bundles the whole folder or nothing. Keep part of the path static.
- The load can be **warmed up in advance** — start the \`import()\` on \`mouseover\` or during idle time so the chunk is cached by the time of the click.`
    },
    codeSnippet: `async function loadLocale(lang) {
  try {
    // computed path -> only possible with dynamic import()
    const mod = await import(\`./locales/\${lang}.js\`);
    return mod.default;
  } catch (e) {
    const fallback = await import('./locales/en.js');
    return fallback.default;
  }
}`
  },
  {
    id: 'jsts-012',
    category: 'js-state',
    level: 'Hard',
    tags: ['iterators', 'generators', 'protocols'],
    question: {
      ru: 'Как работают итераторы и генераторы? Что такое протокол итерации и как генератор сохраняет состояние?',
      en: 'How do iterators and generators work? What is the iteration protocol and how does a generator preserve state?'
    },
    answer: {
      ru: `## Коротко

**Итератор — это объект, который умеет отвечать на вопрос «а дальше что?».** У него есть метод \`next()\`, и каждый вызов возвращает \`{ value, done }\`: значение и флаг «всё, закончилось».

**Генератор — это функция, которая умеет ставить себя на паузу.** Пишется как \`function*\`, ставит паузу словом \`yield\`. Генератор — самый простой способ создать итератор, не описывая его руками.

Аналогия: обычная функция — это лифт, который едет с 1-го на 10-й без остановок. Генератор — лифт, который останавливается на каждом этаже, открывает двери (\`yield\`), ждёт, пока вы нажмёте «дальше» (\`next()\`), и едет дальше **с того же места**.

## Протокол итерации — договорённость из двух пунктов

- **Iterable (перебираемый)** — у объекта есть метод \`[Symbol.iterator]()\`, который возвращает итератор.
- **Iterator (итератор)** — у объекта есть метод \`next()\`, возвращающий \`{ value, done }\`.

Всё, что «умеет перебирать» — \`for...of\`, spread \`[...x]\`, деструктуризация, \`Array.from\`, \`Promise.all\` — работает **только** через этот протокол. Поэтому свою структуру данных достаточно научить отдавать итератор, и она сразу заработает со всем синтаксисом языка.

## Как генератор сохраняет состояние

1. Вызов \`gen()\` **не выполняет тело** — он лишь создаёт объект-генератор.
2. Первый \`next()\` выполняет тело до первого \`yield\` и возвращает его значение.
3. На \`yield\` функция замирает. Её локальные переменные и позиция сохраняются **в куче**, а не на стеке вызовов — поэтому пауза может длиться сколько угодно.
4. Следующий \`next(v)\` продолжает ровно с того места, причём \`v\` становится результатом того самого \`yield\`. Так данные передаются **внутрь** генератора.

\`\`\`js
function* range(start, end) {
  for (let i = start; i < end; i++) yield i;
}
[...range(0, 3)]; // [0, 1, 2]

function* gen() {
  const x = yield 'ask';   // пауза; x придёт из next(value)
  return x * 2;
}
const g = gen();
g.next();    // { value: 'ask', done: false }
g.next(10);  // { value: 20, done: true }
\`\`\`

## Где применяют

- **Ленивые и бесконечные последовательности**: генератор натуральных чисел не занимает памяти, значения вычисляются по требованию.
- Свои коллекции — дерево, связный список — делаем перебираемыми через \`*[Symbol.iterator]()\`.
- **Асинхронная итерация**: \`async function*\` + \`for await...of\` — например, постраничная выкачка API.
- Исторически — корутины для асинхронного кода до появления async/await (redux-saga).

## Что сказать на собеседовании

> Протокол итерации состоит из двух частей: iterable — объект с методом \`[Symbol.iterator]()\`, возвращающим итератор, и iterator — объект с методом \`next()\`, возвращающим \`{ value, done }\`. На нём построены \`for...of\`, spread и деструктуризация, поэтому любую структуру можно сделать перебираемой. Генератор — функция \`function*\`, возвращающая объект, который сразу и итератор, и iterable. \`yield\` приостанавливает выполнение, сохраняя кадр — локальные переменные и позицию — в куче, а \`next(value)\` возобновляет его и передаёт значение внутрь как результат \`yield\`. Это даёт ленивые и бесконечные последовательности.

## Ловушки

- **Генератор одноразовый**: дошли до \`done: true\` — всё, заново перебрать нельзя, нужно создавать новый. Массив тем и отличается — его можно перебирать сколько угодно.
- \`return\` внутри генератора попадает в \`{ value, done: true }\`, и **\`for...of\` это значение не увидит** — он останавливается на \`done\`.
- Внутри стрелочной функции \`yield\` **невозможен** — генератором может быть только \`function*\`.
- \`yield*\` — не «ещё один yield», а **делегирование**: передаёт управление другому генератору или iterable целиком.
- У генератора есть ещё \`return()\` и \`throw()\` — досрочно завершить или бросить ошибку внутрь. \`for...of\` при \`break\` сам вызывает \`return()\`, поэтому \`try/finally\` внутри генератора отработает.`,
      en: `## In short

**An iterator is an object that can answer the question "what's next?".** It has a \`next()\` method, and every call returns \`{ value, done }\`: a value and a "that's it, we're finished" flag.

**A generator is a function that can pause itself.** It's written as \`function*\` and pauses with the word \`yield\`. A generator is the simplest way to produce an iterator without writing one by hand.

The analogy: a regular function is a lift going from floor 1 to floor 10 without stopping. A generator is a lift that stops at every floor, opens the doors (\`yield\`), waits for you to press "continue" (\`next()\`), and carries on **from the same place**.

## The iteration protocol — a two-part agreement

- **Iterable** — the object has a \`[Symbol.iterator]()\` method that returns an iterator.
- **Iterator** — the object has a \`next()\` method returning \`{ value, done }\`.

Everything that "can iterate" — \`for...of\`, spread \`[...x]\`, destructuring, \`Array.from\`, \`Promise.all\` — works **only** through this protocol. So teaching your own data structure to hand out an iterator makes it work with all of the language's syntax at once.

## How a generator preserves state

1. Calling \`gen()\` **doesn't run the body** — it just creates a generator object.
2. The first \`next()\` runs the body up to the first \`yield\` and returns its value.
3. At the \`yield\` the function freezes. Its locals and position are saved **on the heap**, not the call stack — so the pause can last as long as you like.
4. The next \`next(v)\` resumes exactly where it stopped, and \`v\` becomes the result of that very \`yield\`. That's how data is passed **into** a generator.

\`\`\`js
function* range(start, end) {
  for (let i = start; i < end; i++) yield i;
}
[...range(0, 3)]; // [0, 1, 2]

function* gen() {
  const x = yield 'ask';   // pause; x comes from next(value)
  return x * 2;
}
const g = gen();
g.next();    // { value: 'ask', done: false }
g.next(10);  // { value: 20, done: true }
\`\`\`

## Where they're used

- **Lazy and infinite sequences**: a generator of natural numbers takes no memory, values are computed on demand.
- Custom collections — a tree, a linked list — become iterable via \`*[Symbol.iterator]()\`.
- **Async iteration**: \`async function*\` + \`for await...of\` — for example paginated API fetching.
- Historically — coroutines for async code before async/await (redux-saga).

## What to say in the interview

> The iteration protocol has two parts: an iterable is an object with a \`[Symbol.iterator]()\` method returning an iterator, and an iterator is an object with a \`next()\` method returning \`{ value, done }\`. \`for...of\`, spread, destructuring and \`Array.from\` are all built on that protocol, so any custom structure can be made iterable. A generator is a \`function*\` that returns an object which is both an iterator and an iterable. \`yield\` suspends execution, saving the frame — locals and position — on the heap, and \`next(value)\` resumes it, passing the value in as the result of the \`yield\`. This gives lazy evaluation, infinite sequences and language-level cooperative multitasking.

## Gotchas

- **A generator is single-use**: once it reaches \`done: true\` you can't iterate it again, you need a new one. An array is different — you can iterate it as often as you like.
- \`return\` inside a generator ends up in \`{ value, done: true }\`, and **\`for...of\` never sees that value** — it stops at \`done\`.
- \`yield\` is **impossible inside an arrow function** — only a \`function*\` can be a generator.
- \`yield*\` isn't "another yield", it's **delegation**: it hands control to another generator or iterable entirely.
- A generator also has \`return()\` and \`throw()\` — to finish early or inject an error. \`for...of\` calls \`return()\` on \`break\`, so a \`try/finally\` inside the generator does run.`
    },
    codeSnippet: `// Make a custom data structure iterable
class LinkedList {
  constructor() { this.head = null; }
  prepend(v) { this.head = { v, next: this.head }; return this; }
  *[Symbol.iterator]() {
    for (let n = this.head; n; n = n.next) yield n.v;
  }
}
const list = new LinkedList().prepend(3).prepend(2).prepend(1);
[...list];            // [1, 2, 3]
for (const v of list) { /* 1, 2, 3 */ }`
  },
  {
    id: 'jsts-013',
    category: 'js-state',
    level: 'Medium',
    tags: ['symbol', 'well-known-symbols', 'metaprogramming'],
    question: {
      ru: 'Что такое Symbol и для чего нужны well-known symbols? Чем отличается Symbol от Symbol.for?',
      en: 'What is a Symbol and what are well-known symbols for? How does Symbol differ from Symbol.for?'
    },
    answer: {
      ru: `## Коротко

**Symbol — это гарантированно уникальный ключ.** Вызвали \`Symbol('id')\` — получили значение, которое не совпадёт ни с одним другим, даже если создать второй \`Symbol('id')\`.

Зачем: чтобы добавить свойство в чужой объект и **точно ни с кем не столкнуться**. Строковый ключ \`'id'\` может уже быть занят или перезаписан кем-то ещё, символьный — никогда.

Аналогия: строковый ключ — имя «Саша», Symbol — номер паспорта. Саш много, паспорт один.

## Чем символьное свойство отличается от обычного

Оно как бы «полускрытое»:

- **не попадает** в \`Object.keys\`, \`for...in\`, \`JSON.stringify\`;
- **но не приватное** — его видно через \`Object.getOwnPropertySymbols(obj)\` и \`Reflect.ownKeys(obj)\`.

То есть это защита от случайных коллизий, а не от злоумышленника.

## Symbol() против Symbol.for()

- \`Symbol('x')\` — **каждый раз новый**, живёт только в вашем модуле.
- \`Symbol.for('x')\` — берёт символ из **глобального реестра** по строковому ключу. Второй вызов вернёт **тот же самый** символ, даже из другого скрипта или iframe.

\`\`\`js
Symbol('a') === Symbol('a');         // false — два разных символа
Symbol.for('a') === Symbol.for('a'); // true  — один из реестра
Symbol.keyFor(Symbol.for('a'));      // 'a' — только для реестровых
\`\`\`

Правило: свой внутренний ключ → \`Symbol()\`. Нужно, чтобы несколько независимых библиотек договорились об одном ключе → \`Symbol.for()\`.

## Well-known symbols — «розетки» языка

Это заранее определённые символы, которыми движок спрашивает у объекта, как себя вести. Положили метод под таким ключом — изменили поведение синтаксиса языка:

- \`Symbol.iterator\` — как перебирать объект в \`for...of\` и spread.
- \`Symbol.asyncIterator\` — то же для \`for await...of\`.
- \`Symbol.toPrimitive\` — во что превращать объект при приведении к числу или строке.
- \`Symbol.toStringTag\` — что покажет \`Object.prototype.toString.call(obj)\`.
- \`Symbol.hasInstance\` — как отвечать на \`instanceof\`.

\`\`\`js
class Temp {
  constructor(c) { this.c = c; }
  [Symbol.toPrimitive](hint) {
    return hint === 'string' ? this.c + '°C' : this.c;
  }
}
new Temp(20) + 5;         // 25   — числовой hint
String(new Temp(20));     // '20°C' — строковый hint
\`\`\`

## Что сказать на собеседовании

> Symbol — уникальный неизменяемый примитив; каждый вызов \`Symbol()\` создаёт новое значение даже при одинаковом описании. Основное применение — неконфликтующие ключи свойств: символьные ключи не попадают в \`Object.keys\`, \`for...in\` и \`JSON.stringify\`, но доступны через \`Object.getOwnPropertySymbols\`, так что это не приватность, а защита от коллизий. \`Symbol.for\` работает через глобальный реестр и возвращает один и тот же символ по строковому ключу, в том числе между разными realm. Well-known symbols — точки расширения протоколов языка: \`Symbol.iterator\` делает объект перебираемым, \`Symbol.toPrimitive\` управляет приведением типов.

## Ловушки

- Symbol **нельзя привести к строке неявно**: \`'id: ' + sym\` бросит TypeError. Нужно явно — \`String(sym)\` или \`sym.description\`.
- Описание внутри \`Symbol('id')\` — **только для отладки**, на уникальность оно не влияет никак.
- \`typeof sym\` → \`'symbol'\`. Это полноценный седьмой примитив, а не объект.
- В \`JSON.stringify\` символьные свойства **молча теряются** — если храните в них важные данные, сериализуйте вручную.
- Начиная с недавнего времени символы можно использовать как ключи **WeakMap**, но только несистемные (не из \`Symbol.for\`).`,
      en: `## In short

**A Symbol is a guaranteed-unique key.** Call \`Symbol('id')\` and you get a value that will never equal any other — not even a second \`Symbol('id')\`.

What for: to add a property to someone else's object and be **certain there's no collision**. The string key \`'id'\` might already be taken or overwritten by someone else; a symbol key never is.

The analogy: a string key is the name "Alex", a Symbol is a passport number. There are many Alexes; there's one passport.

## How a symbol property differs from a normal one

It's "semi-hidden":

- it **doesn't appear** in \`Object.keys\`, \`for...in\` or \`JSON.stringify\`;
- **but it isn't private** — it's visible via \`Object.getOwnPropertySymbols(obj)\` and \`Reflect.ownKeys(obj)\`.

So it's protection from accidental collisions, not from an attacker.

## Symbol() vs Symbol.for()

- \`Symbol('x')\` — **a brand-new one every time**, local to your module.
- \`Symbol.for('x')\` — pulls a symbol from the **global registry** by string key. A second call returns the **same** symbol, even from a different script or iframe.

\`\`\`js
Symbol('a') === Symbol('a');         // false — two different symbols
Symbol.for('a') === Symbol.for('a'); // true  — one from the registry
Symbol.keyFor(Symbol.for('a'));      // 'a' — registry symbols only
\`\`\`

The rule: your own internal key → \`Symbol()\`. Several independent libraries need to agree on one key → \`Symbol.for()\`.

## Well-known symbols — the language's sockets

These are predefined symbols the engine uses to ask an object how it should behave. Put a method under such a key and you change how the language's syntax treats your object:

- \`Symbol.iterator\` — how to iterate the object in \`for...of\` and spread.
- \`Symbol.asyncIterator\` — the same for \`for await...of\`.
- \`Symbol.toPrimitive\` — what the object becomes when coerced to a number or string.
- \`Symbol.toStringTag\` — what \`Object.prototype.toString.call(obj)\` shows.
- \`Symbol.hasInstance\` — how to answer \`instanceof\`.

\`\`\`js
class Temp {
  constructor(c) { this.c = c; }
  [Symbol.toPrimitive](hint) {
    return hint === 'string' ? this.c + '°C' : this.c;
  }
}
new Temp(20) + 5;         // 25   — number hint
String(new Temp(20));     // '20°C' — string hint
\`\`\`

## What to say in the interview

> A Symbol is a unique immutable primitive; every \`Symbol()\` call creates a new value even with the same description. Its main use is collision-free property keys: symbol keys don't clash with string keys and don't appear in \`Object.keys\`, \`for...in\` or \`JSON.stringify\`, but they remain accessible through \`Object.getOwnPropertySymbols\` and \`Reflect.ownKeys\` — so it's not privacy, it's collision protection. Unlike \`Symbol()\`, \`Symbol.for\` works through a global registry and returns the same symbol for a given string key, including across realms. Well-known symbols are the extension points of the language's protocols: \`Symbol.iterator\` makes an object iterable, \`Symbol.toPrimitive\` controls coercion and \`Symbol.toStringTag\` controls \`Object.prototype.toString\`.

## Gotchas

- A Symbol **can't be implicitly converted to a string**: \`'id: ' + sym\` throws a TypeError. You need \`String(sym)\` or \`sym.description\`.
- The description in \`Symbol('id')\` is **for debugging only** — it has no effect on uniqueness whatsoever.
- \`typeof sym\` is \`'symbol'\`. It's a full seventh primitive, not an object.
- **\`JSON.stringify\` silently drops symbol properties** — if you keep important data there, serialise it manually.
- Symbols can now be used as **WeakMap** keys, but only non-registered ones (not from \`Symbol.for\`).`
    },
    codeSnippet: `const id = Symbol('id');
const user = { name: 'Ann', [id]: 42 };

Object.keys(user);                    // ['name'] — symbol hidden
JSON.stringify(user);                 // '{"name":"Ann"}'
Object.getOwnPropertySymbols(user);   // [Symbol(id)]
user[id];                             // 42

Symbol('x') === Symbol('x');          // false (unique)
Symbol.for('x') === Symbol.for('x');  // true  (global registry)`
  },
  {
    id: 'jsts-014',
    category: 'js-state',
    level: 'Expert',
    tags: ['proxy', 'reflect', 'metaprogramming'],
    question: {
      ru: 'Как работают Proxy и Reflect? Какие ловушки (traps) бывают и почему Reflect важен внутри них?',
      en: 'How do Proxy and Reflect work? What traps exist and why is Reflect important inside them?'
    },
    answer: {
      ru: `## Коротко

**Proxy — это объект-посредник.** Вы даёте ему настоящий объект (\`target\`) и набор перехватчиков (\`handler\`). Дальше все обращаются к прокси, а он решает, что делать: подменить значение, проверить, залогировать или просто передать дальше.

Аналогия: секретарь перед начальником. Звонят секретарю — он либо отвечает сам, либо пропускает звонок, либо кладёт трубку.

**Reflect — это «обычное поведение», вынесенное в отдельный объект.** \`Reflect.get(target, prop)\` делает ровно то, что сделал бы движок без прокси. Именно поэтому Reflect почти всегда используется внутри Proxy — чтобы сказать «а тут делай как обычно».

## Какие операции можно перехватить (traps)

- **Чтение и запись**: \`get\`, \`set\`, \`has\` (оператор \`in\`), \`deleteProperty\`.
- **Вызовы**: \`apply\` (вызов функции), \`construct\` (оператор \`new\`).
- **Перечисление и дескрипторы**: \`ownKeys\`, \`getOwnPropertyDescriptor\`, \`defineProperty\`.
- **Прототип**: \`getPrototypeOf\`, \`setPrototypeOf\`.

Если ловушку не написали — операция просто уходит к \`target\` напрямую.

\`\`\`js
const user = { firstName: 'Ann', lastName: 'Lee' };
const proxy = new Proxy(user, {
  get(target, prop, receiver) {
    if (prop === 'fullName') {
      return target.firstName + ' ' + target.lastName;
    }
    return Reflect.get(target, prop, receiver); // всё остальное — как обычно
  }
});
proxy.fullName; // 'Ann Lee'
\`\`\`

## Почему внутри trap нужен именно Reflect, а не target[prop]

Три причины:

1. **Короче и честнее**: \`Reflect.get\` — это ровно та же внутренняя операция, которую перехватили.
2. **Правильно передаётся \`receiver\`** — то есть кто «настоящий получатель». Для геттеров и сеттеров в цепочке прототипов \`target[prop]\` даст неверный \`this\`, а \`Reflect.get(target, prop, receiver)\` — верный.
3. **Возвращает результат вместо исключения**: \`Reflect.set\` вернёт \`false\`, а \`Reflect.defineProperty\` — булево, тогда как старые \`Object.*\` бросали ошибку.

## Где это применяют

- **Реактивность**: Vue 3 отслеживает чтение и запись свойств именно через Proxy.
- **Валидация**: не пустить в объект отрицательное число или неизвестное поле.
- **Логирование и отладка**: печатать каждое обращение к свойству.
- **Read-only и защита**: молча игнорировать или запрещать запись.
- **Ленивые/виртуальные объекты**: свойства вычисляются в момент чтения.

## Что сказать на собеседовании

> \`new Proxy(target, handler)\` создаёт обёртку, перехватывающую фундаментальные операции над объектом через ловушки: get, set, has, deleteProperty и другие. Без ловушки операция уходит к target напрямую. \`Reflect\` — набор статических методов, повторяющих те же внутренние операции; внутри ловушек его используют, чтобы вернуть поведение по умолчанию и корректно передать receiver для геттеров из цепочки прототипов. Proxy обязан соблюдать инварианты target: нельзя соврать про non-configurable свойство, иначе TypeError. И есть цена: проксированные объекты движок оптимизирует хуже обычных, что заметно в горячих путях.

## Ловушки

- **Производительность.** Proxy ломает inline caches: каждое обращение к свойству идёт через ловушку. В горячем цикле это может быть в разы дороже.
- **Инварианты нельзя нарушать.** Если у target есть non-configurable non-writable свойство, ловушка \`get\` обязана вернуть именно его значение — иначе TypeError.
- **Proxy не перехватывает всё.** Приватные поля класса (\`#field\`) и внутренние слоты (\`Map\`, \`Date\`, \`Promise\`) через прокси не работают — методам нужен настоящий \`this\`, поэтому их приходится привязывать вручную.
- **\`proxy !== target\`.** Сравнение по ссылке, \`WeakMap\`-ключи, \`===\` — везде это два разных объекта.
- \`Reflect\` **не имеет ничего общего** с декораторами и \`reflect-metadata\` — это разные вещи с похожим названием.`,
      en: `## In short

**A Proxy is a middleman object.** You give it the real object (\`target\`) and a set of interceptors (\`handler\`). From then on everyone talks to the proxy, and it decides what to do: substitute a value, validate, log, or just pass the call through.

The analogy: a secretary in front of a boss. People call the secretary, who either answers themselves, puts the call through, or hangs up.

**Reflect is "the default behaviour", extracted into an object.** \`Reflect.get(target, prop)\` does exactly what the engine would have done without the proxy. That's why Reflect is almost always used inside a Proxy — to say "here, behave normally".

## Which operations you can intercept (traps)

- **Reads and writes**: \`get\`, \`set\`, \`has\` (the \`in\` operator), \`deleteProperty\`.
- **Calls**: \`apply\` (calling a function), \`construct\` (the \`new\` operator).
- **Enumeration and descriptors**: \`ownKeys\`, \`getOwnPropertyDescriptor\`, \`defineProperty\`.
- **Prototype**: \`getPrototypeOf\`, \`setPrototypeOf\`.

If you don't write a trap, the operation simply goes straight to \`target\`.

\`\`\`js
const user = { firstName: 'Ann', lastName: 'Lee' };
const proxy = new Proxy(user, {
  get(target, prop, receiver) {
    if (prop === 'fullName') {
      return target.firstName + ' ' + target.lastName;
    }
    return Reflect.get(target, prop, receiver); // everything else — as usual
  }
});
proxy.fullName; // 'Ann Lee'
\`\`\`

## Why traps need Reflect rather than target[prop]

Three reasons:

1. **Shorter and more honest**: \`Reflect.get\` is precisely the internal operation you intercepted.
2. **The \`receiver\` is threaded correctly** — i.e. who the "real recipient" is. For getters and setters along the prototype chain, \`target[prop]\` gives the wrong \`this\`, while \`Reflect.get(target, prop, receiver)\` gives the right one.
3. **It returns a result instead of throwing**: \`Reflect.set\` returns \`false\` and \`Reflect.defineProperty\` returns a boolean, whereas the old \`Object.*\` methods threw.

## Where it's used

- **Reactivity**: Vue 3 tracks property reads and writes precisely via Proxy.
- **Validation**: refusing a negative number or an unknown field.
- **Logging and debugging**: printing every property access.
- **Read-only and protection**: silently ignoring or forbidding writes.
- **Lazy/virtual objects**: properties computed at read time.

## What to say in the interview

> \`new Proxy(target, handler)\` creates a wrapper that intercepts fundamental operations on an object through traps: get, set, has, deleteProperty, apply, construct, ownKeys and others. If a trap isn't defined, the operation goes straight to the target. \`Reflect\` is a set of static methods mirroring those same internal operations; inside traps it's used to restore the default behaviour, to thread the receiver correctly for getters from the prototype chain, and to get a boolean result instead of an exception. A Proxy must respect the target's invariants: you can't lie about a non-configurable property, or you get a TypeError. And there's a cost — the engine optimises proxied objects far worse than plain ones, which is noticeable on hot paths.

## Gotchas

- **Performance.** A Proxy breaks inline caches: every property access goes through a trap. In a hot loop that can be several times more expensive.
- **Invariants can't be violated.** If the target has a non-configurable, non-writable property, the \`get\` trap must return exactly that value — otherwise TypeError.
- **A Proxy doesn't intercept everything.** Private class fields (\`#field\`) and internal slots (\`Map\`, \`Date\`, \`Promise\`) don't work through a proxy — their methods need the real \`this\`, so you have to bind them manually.
- **\`proxy !== target\`.** For reference comparison, \`WeakMap\` keys and \`===\`, these are two different objects.
- \`Reflect\` **has nothing to do** with decorators or \`reflect-metadata\` — different things with similar names.`
    },
    codeSnippet: `// Validation proxy that enforces an invariant on write
function positive(target) {
  return new Proxy(target, {
    set(t, key, value, receiver) {
      if (typeof value === 'number' && value < 0) {
        throw new RangeError(\`\${String(key)} must be >= 0\`);
      }
      return Reflect.set(t, key, value, receiver);
    }
  });
}
const stock = positive({ apples: 5 });
stock.apples = 3;     // ok
// stock.apples = -1; // RangeError: apples must be >= 0`
  },
  {
    id: 'jsts-015',
    category: 'js-state',
    level: 'Medium',
    tags: ['structured-clone', 'deep-copy', 'serialization'],
    question: {
      ru: 'Что такое structuredClone и как он работает? Чем отличается от JSON-копии и spread?',
      en: 'What is structuredClone and how does it work? How does it differ from JSON copy and spread?'
    },
    answer: {
      ru: `## Коротко

Есть три способа скопировать объект, и они очень разные:

- **\`{...obj}\` и \`Object.assign\`** — **поверхностная** копия. Копируется только верхний уровень; вложенные объекты остаются **общими по ссылке**. Поменяли \`copy.address.city\` — изменился и оригинал.
- **\`JSON.parse(JSON.stringify(obj))\`** — глубокая копия «на коленке». Работает, но **портит данные**.
- **\`structuredClone(obj)\`** — встроенная **честная глубокая копия**. Тот же алгоритм, которым браузер передаёт данные в Web Worker и кладёт в IndexedDB.

## Что ломает JSON-копия

- \`undefined\`, функции и символы **просто исчезают** из результата.
- \`Date\` превращается в **строку** (и обратно уже не станет датой).
- \`NaN\` и \`Infinity\` становятся \`null\`.
- \`Map\`, \`Set\`, \`RegExp\`, \`ArrayBuffer\`, \`Blob\` превращаются в **пустые объекты**.
- **Циклическая ссылка** — сразу исключение \`Converting circular structure to JSON\`.

\`structuredClone\` всё перечисленное копирует правильно и **сохраняет циклы**.

\`\`\`js
const orig = { d: new Date(), set: new Set([1, 2]) };
orig.self = orig;                 // цикл

const copy = structuredClone(orig);
copy.self === copy;               // true — цикл сохранён
copy.set instanceof Set;          // true — остался Set
copy.d !== orig.d;                // true — это новая дата, не та же ссылка
\`\`\`

## Чего structuredClone не умеет

- **Функции и методы** — бросит \`DataCloneError\`.
- **DOM-узлы** (кроме некоторых специальных) — тоже ошибка.
- **Экземпляр класса потеряет прототип**: поля скопируются, но \`copy instanceof User\` будет \`false\`, методы пропадут.
- **Геттеры и сеттеры** копируются как обычные значения — поведение теряется.
- **Symbol-ключи** не переносятся.

## Что сказать на собеседовании

> Spread и \`Object.assign\` делают поверхностную копию: вложенные объекты остаются общими по ссылке. \`JSON.parse(JSON.stringify(x))\` даёт глубокую копию, но теряет \`undefined\`, функции и символы, превращает \`Date\` в строку, не поддерживает \`Map\`, \`Set\`, \`RegExp\` и падает на циклических ссылках. \`structuredClone\` — встроенный глубокий клон по тому же алгоритму, что используют postMessage и IndexedDB: он корректно копирует \`Date\`, \`Map\`, \`Set\`, \`RegExp\`, типизированные массивы и сохраняет циклы. Ограничения — функции и DOM-узлы бросают DataCloneError, а экземпляры классов теряют прототип; если нужны методы, применяют библиотечный deep clone.

## Ловушки

- **Самая частая ошибка на практике**: думают, что \`{...state}\` защитил от мутации, а меняют вложенное поле — и ловят баг в change detection.
- \`structuredClone\` **синхронный** и на больших графах данных **блокирует поток**. Для мегабайтных структур это заметно.
- \`structuredClone\` — **функция окружения (браузер/Node 17+)**, а не часть языка. В очень старых средах её нет.
- Для копии массива примитивов достаточно \`[...arr]\` или \`arr.slice()\` — тащить \`structuredClone\` не нужно.
- Если внутри есть класс, и нужны его методы, единственный надёжный путь — свой \`clone()\`/конструктор из объекта.`,
      en: `## In short

There are three ways to copy an object, and they're very different:

- **\`{...obj}\` and \`Object.assign\`** — a **shallow** copy. Only the top level is copied; nested objects stay **shared by reference**. Change \`copy.address.city\` and the original changes too.
- **\`JSON.parse(JSON.stringify(obj))\`** — a homemade deep copy. It works, but **it corrupts data**.
- **\`structuredClone(obj)\`** — the built-in, **proper deep copy**. The same algorithm the browser uses to send data to a Web Worker and to store it in IndexedDB.

## What the JSON copy breaks

- \`undefined\`, functions and symbols simply **vanish** from the result.
- \`Date\` becomes a **string** (and never turns back into a date).
- \`NaN\` and \`Infinity\` become \`null\`.
- \`Map\`, \`Set\`, \`RegExp\`, \`ArrayBuffer\`, \`Blob\` become **empty objects**.
- A **circular reference** throws immediately: "Converting circular structure to JSON".

\`structuredClone\` copies all of the above correctly and **preserves cycles**.

\`\`\`js
const orig = { d: new Date(), set: new Set([1, 2]) };
orig.self = orig;                 // a cycle

const copy = structuredClone(orig);
copy.self === copy;               // true — cycle preserved
copy.set instanceof Set;          // true — still a Set
copy.d !== orig.d;                // true — a new Date, not the same reference
\`\`\`

## What structuredClone can't do

- **Functions and methods** — it throws a \`DataCloneError\`.
- **DOM nodes** (apart from a few special ones) — also an error.
- **A class instance loses its prototype**: fields are copied, but \`copy instanceof User\` is \`false\` and the methods are gone.
- **Getters and setters** are copied as plain values — the behaviour is lost.
- **Symbol keys** aren't carried over.

## What to say in the interview

> Spread and \`Object.assign\` do a shallow copy: nested objects stay shared by reference. \`JSON.parse(JSON.stringify(x))\` gives a deep copy but loses \`undefined\`, functions and symbols, turns \`Date\` into a string and \`NaN\`/\`Infinity\` into \`null\`, doesn't support \`Map\`, \`Set\` or \`RegExp\`, and throws on circular references. \`structuredClone\` is the built-in deep clone using the structured clone algorithm — the same one postMessage, Web Workers and IndexedDB use: it correctly copies \`Date\`, \`Map\`, \`Set\`, \`RegExp\` and typed arrays, and preserves cycles. Its limits are that functions and DOM nodes throw a DataCloneError and class instances lose their prototype. If you need methods and prototypes, you use a library deep clone or your own implementation.

## Gotchas

- **The most common real-world mistake**: assuming \`{...state}\` protects you from mutation, then changing a nested field — and hitting a change-detection bug.
- \`structuredClone\` is **synchronous** and **blocks the thread** on large graphs. For megabyte-sized structures that's noticeable.
- \`structuredClone\` is a **host function (browser / Node 17+)**, not part of the language. Very old environments don't have it.
- For copying an array of primitives, \`[...arr]\` or \`arr.slice()\` is enough — no need to reach for \`structuredClone\`.
- If a class is involved and you need its methods, the only reliable path is your own \`clone()\` or a constructor that takes a plain object.`
    }
  },
  {
    id: 'jsts-016',
    category: 'typescript',
    level: 'Hard',
    tags: ['generics', 'constraints', 'type-inference'],
    question: {
      ru: 'Как работают дженерики и ограничения (`extends`) в TypeScript? Объясните вывод типов и значения по умолчанию.',
      en: 'How do generics and constraints (`extends`) work in TypeScript? Explain type inference and defaults.'
    },
    answer: {
      ru: `## Коротко

**Дженерик — это переменная, только для типа.** Вы пишете функцию, не зная заранее, с каким типом её вызовут, но обещаете сохранить связь: «что положили — то и достанете».

Сравните:

- \`function first(arr: any[]): any\` — работает со всем, но на выходе \`any\`, типы потеряны.
- \`function first<T>(arr: T[]): T\` — работает со всем, но если положили \`string[]\`, то и вернётся \`string\`.

Аналогия: \`T\` — это пустое поле в бланке. Заполняется в момент вызова, а весь остальной бланк подстраивается автоматически.

## Ограничение — \`extends\`

По умолчанию про \`T\` не известно ничего, поэтому внутри функции с ним ничего нельзя делать. \`extends\` — способ сказать «\`T\` — это что угодно, **но обязательно с такими свойствами**»:

\`\`\`ts
function len<T extends { length: number }>(x: T): number {
  return x.length;   // теперь length точно есть
}
len('abc');   // ок
len([1, 2]);  // ок
len(42);      // ошибка: у number нет length
\`\`\`

Самый частый рабочий паттерн — \`K extends keyof T\`, безопасный доступ по ключу:

\`\`\`ts
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { id: 1, name: 'Ann' };
pluck(user, 'name'); // тип string
pluck(user, 'age');  // ошибка: 'age' нет в keyof T
\`\`\`

## Вывод типов (inference)

Обычно \`T\` **писать не нужно** — TypeScript догадывается сам по аргументам вызова. \`first([1,2,3])\` → \`T\` это \`number\`.

Две детали, о которых спрашивают:

- При выводе TS **расширяет литералы**: из \`'a'\` получится \`string\`, а не \`'a'\`. Чтобы сохранить узкий тип, нужен \`as const\` или \`const\`-параметр типа (TS 5.0).
- Если кандидатов на \`T\` несколько, TS ищет **общий тип** для всех — при несовместимости будет ошибка.

## Значения по умолчанию

\`<T = string>\` — дефолт, который подставится, если тип не указали и вывести его неоткуда. Удобно для гибких API: \`interface Response<T = unknown>\`.

## Что сказать на собеседовании

> Дженерики — это параметризация по типу: функция, класс или тип работают с произвольным \`T\`, сохраняя связь между входом и выходом. В отличие от \`any\` типобезопасность не теряется. Ограничение \`T extends U\` требует, чтобы \`T\` был подтипом \`U\`, и внутри можно безопасно обращаться к гарантированным членам; классический пример — \`K extends keyof T\` с возвращаемым типом \`T[K]\` для типобезопасного доступа по ключу. Обычно \`T\` явно не указывают — TypeScript выводит его из аргументов, при этом расширяя литеральные типы, если не использован \`as const\` или \`const\`-параметр.

## Ловушки

- **Параметр типа, использованный ровно один раз, — это замаскированный \`any\`.** Если \`T\` встречается только в позиции аргумента и нигде больше, он не связывает вход с выходом, и его надо просто убрать.
- \`T extends U\` — это **не наследование классов**, а «присваиваемость». Структурная типизация: подходит любой объект нужной формы.
- Не путайте **параметр типа и аргумент типа**: \`<T>\` в объявлении — это дырка, \`foo<string>()\` — заполнение дырки.
- В стрелочной функции в \`.tsx\`-файле \`<T>\` парсится как JSX. Пишут \`<T,>\` или \`<T extends unknown>\`.
- Слишком много параметров типа делает сигнатуру нечитаемой. Если их больше двух-трёх, обычно проще принять один объект-параметр.`,
      en: `## In short

**A generic is a variable, but for a type.** You write a function without knowing which type it will be called with, yet you promise to preserve the connection: "what you put in is what you get out".

Compare:

- \`function first(arr: any[]): any\` — works with anything, but the result is \`any\` and the types are gone.
- \`function first<T>(arr: T[]): T\` — works with anything, but pass a \`string[]\` and you get a \`string\` back.

The analogy: \`T\` is a blank field on a form. It's filled in at call time, and the rest of the form adjusts automatically.

## Constraints — \`extends\`

By default nothing is known about \`T\`, so you can't do anything with it inside the function. \`extends\` is how you say "\`T\` can be anything, **as long as it has these members**":

\`\`\`ts
function len<T extends { length: number }>(x: T): number {
  return x.length;   // length is guaranteed now
}
len('abc');   // ok
len([1, 2]);  // ok
len(42);      // error: number has no length
\`\`\`

The most common real-world pattern is \`K extends keyof T\` for safe key access:

\`\`\`ts
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { id: 1, name: 'Ann' };
pluck(user, 'name'); // type string
pluck(user, 'age');  // error: 'age' is not in keyof T
\`\`\`

## Inference

Usually you **don't write \`T\`** — TypeScript figures it out from the call arguments. \`first([1,2,3])\` → \`T\` is \`number\`.

Two details they ask about:

- During inference TypeScript **widens literals**: \`'a'\` becomes \`string\`, not \`'a'\`. To keep the narrow type you need \`as const\` or a \`const\` type parameter (TS 5.0).
- With several candidates for \`T\`, TypeScript looks for a **common type**; if they're incompatible it's an error.

## Defaults

\`<T = string>\` is the fallback used when the type isn't given and can't be inferred. Handy for flexible APIs: \`interface Response<T = unknown>\`.

## What to say in the interview

> Generics are parameterisation by type: a function, class or type works with an arbitrary \`T\` while preserving the relation between input and output, so unlike \`any\` you don't lose type safety. The constraint \`T extends U\` requires \`T\` to be a subtype of \`U\`, letting you safely access guaranteed members inside; the classic example is \`K extends keyof T\` returning \`T[K]\` for type-safe key access. You usually don't specify \`T\` explicitly — TypeScript infers it from the arguments, widening literal types unless \`as const\` or a \`const\` type parameter is used. A default like \`<T = string>\` kicks in when the type isn't provided and can't be inferred.

## Gotchas

- **A type parameter used exactly once is \`any\` in disguise.** If \`T\` appears only in an argument position and nowhere else, it doesn't tie input to output and should just be removed.
- \`T extends U\` is **not class inheritance**, it's assignability. Structural typing: any object of the right shape qualifies.
- Don't confuse **type parameter and type argument**: \`<T>\` in a declaration is the hole, \`foo<string>()\` fills it.
- In a \`.tsx\` file, \`<T>\` on an arrow function parses as JSX. Write \`<T,>\` or \`<T extends unknown>\`.
- Too many type parameters makes a signature unreadable. Beyond two or three, taking a single options object is usually simpler.`
    },
    codeSnippet: `// Constrained generic with a default, preserving the input/output relation
function merge<T extends object, U extends object = {}>(a: T, b: U): T & U {
  return { ...a, ...b };
}
const r = merge({ id: 1 }, { name: 'Ann' });
// r: { id: number } & { name: string }
r.id;   // number
r.name; // string`
  },
  {
    id: 'jsts-017',
    category: 'typescript',
    level: 'Expert',
    tags: ['conditional-types', 'infer', 'distributive'],
    question: {
      ru: 'Как работают условные типы и `infer`? Что такое дистрибутивность над union-типами?',
      en: 'How do conditional types and `infer` work? What is distributivity over union types?'
    },
    answer: {
      ru: `## Коротко

**Условный тип — это обычный тернарник, только для типов.**

\`T extends U ? X : Y\` читается как: «если тип \`T\` подходит под \`U\` — возьми \`X\`, иначе \`Y\`». Слово \`extends\` здесь значит не «наследуется», а «присваиваемо, подходит по форме».

**\`infer\` — это «запомни вот эту часть типа в переменную».** Что-то вроде захватывающей группы в регулярном выражении, только по типам.

## infer на примере

\`\`\`ts
// «Если T — это массив чего-то, дай мне это что-то»
type ElementType<T> = T extends (infer E)[] ? E : T;
type A = ElementType<number[]>; // number
type B = ElementType<string>;   // string — не массив, вернулся сам

// «Если F — функция, дай мне её возвращаемый тип»
type MyReturn<F> = F extends (...args: any[]) => infer R ? R : never;
type R = MyReturn<() => Promise<number>>; // Promise<number>
\`\`\`

Читается так: «\`T\` похож на массив? Тогда назови его элемент \`E\` и верни \`E\`».

## Дистрибутивность — самое неочевидное

Если слева от \`extends\` стоит **голый параметр типа** \`T\`, и в него подставили **union**, TypeScript применяет условие **к каждому члену union по отдельности**, а результаты складывает обратно в union.

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;
type X = ToArray<string | number>;
// Получится string[] | number[]
// А НЕ (string | number)[]  — вот это и удивляет на собеседовании
\`\`\`

Пошагово: \`ToArray<string | number>\` → \`ToArray<string> | ToArray<number>\` → \`string[] | number[]\`.

## Как выключить дистрибутивность

Обернуть обе стороны в кортеж — тогда \`T\` уже не «голый»:

\`\`\`ts
type IsNever<T> = [T] extends [never] ? true : false;
type N = IsNever<never>; // true

// без скобок: never — это пустой union, распределять не по чему,
// поэтому результат тоже never, а не false
\`\`\`

Это стандартный приём для \`IsNever\`, строгих сравнений типов и всего, где union надо рассматривать целиком.

## Что сказать на собеседовании

> Условный тип \`T extends U ? X : Y\` — это тернарный оператор на уровне типов, проверяющий присваиваемость \`T\` к \`U\`. \`infer\` объявляет переменную типа прямо внутри условия и захватывает часть структуры — это паттерн-матчинг по типам, на нём построены \`ReturnType\`, \`Parameters\`, \`Awaited\`. Дистрибутивность означает, что если проверяемый тип — голый параметр и в него подставлен union, условие применяется к каждому члену отдельно, а результаты объединяются: \`ToArray<string | number>\` даёт \`string[] | number[]\`, а не \`(string | number)[]\`. Отключается оборачиванием в кортеж — \`[T] extends [U]\`, классический пример — \`IsNever\`.

## Ловушки

- **\`never\` внутри условного типа исчезает.** \`never\` — это пустой union, поэтому дистрибутивный условный тип на нём возвращает \`never\`, а не ветку \`false\`.
- \`any\` **уходит в обе ветки сразу**: \`any extends string ? 'y' : 'n'\` даёт \`'y' | 'n'\`.
- **Несколько \`infer\` с одним именем** ведут себя по-разному: в ковариантной позиции результаты объединяются в union, в контравариантной (например, в параметрах функции) — в intersection. На этом построен трюк UnionToIntersection.
- **Глубина рекурсии ограничена** — при слишком сложных типах компилятор скажет «Type instantiation is excessively deep».
- Сложные условные типы **заметно замедляют компиляцию** и IDE. Если тип стал нечитаемым, обычно правильнее упростить модель данных.`,
      en: `## In short

**A conditional type is an ordinary ternary, but for types.**

\`T extends U ? X : Y\` reads as: "if type \`T\` fits \`U\`, take \`X\`, otherwise \`Y\`". Here \`extends\` doesn't mean "inherits" — it means "is assignable to, matches the shape".

**\`infer\` means "remember this part of the type in a variable".** Think of a capture group in a regular expression, but for types.

## infer by example

\`\`\`ts
// "If T is an array of something, give me that something"
type ElementType<T> = T extends (infer E)[] ? E : T;
type A = ElementType<number[]>; // number
type B = ElementType<string>;   // string — not an array, returned as-is

// "If F is a function, give me its return type"
type MyReturn<F> = F extends (...args: any[]) => infer R ? R : never;
type R = MyReturn<() => Promise<number>>; // Promise<number>
\`\`\`

Read it as: "does \`T\` look like an array? Then call its element \`E\` and return \`E\`".

## Distributivity — the least obvious part

If the left side of \`extends\` is a **naked type parameter** \`T\` and a **union** is substituted into it, TypeScript applies the condition **to each member separately** and unions the results back together.

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;
type X = ToArray<string | number>;
// You get string[] | number[]
// NOT (string | number)[] — this is what surprises people in interviews
\`\`\`

Step by step: \`ToArray<string | number>\` → \`ToArray<string> | ToArray<number>\` → \`string[] | number[]\`.

## How to switch distributivity off

Wrap both sides in a tuple — then \`T\` is no longer naked:

\`\`\`ts
type IsNever<T> = [T] extends [never] ? true : false;
type N = IsNever<never>; // true

// without brackets: never is the empty union, there's nothing to distribute over,
// so the result is never rather than false
\`\`\`

This is the standard trick for \`IsNever\`, strict type comparisons and anything where the union must be examined as a whole.

## What to say in the interview

> A conditional type \`T extends U ? X : Y\` is a ternary operator at the type level that checks assignability of \`T\` to \`U\`. \`infer\` declares a type variable inside the condition and captures part of the structure — it's pattern matching over types, and it's what \`ReturnType\`, \`Parameters\` and \`Awaited\` are built on. Distributivity means that if the checked type is a naked parameter with a union substituted, the condition is applied to each member separately and the results are unioned: \`ToArray<string | number>\` gives \`string[] | number[]\`, not \`(string | number)[]\`. You disable it by wrapping in a tuple — \`[T] extends [U]\` — with \`IsNever\` as the classic example. Conditional types underpin most of the utility types in lib.es5.d.ts.

## Gotchas

- **\`never\` disappears inside a conditional type.** \`never\` is the empty union, so a distributive conditional over it returns \`never\` rather than the false branch.
- \`any\` **goes down both branches at once**: \`any extends string ? 'y' : 'n'\` gives \`'y' | 'n'\`.
- **Several \`infer\`s with the same name** behave differently: in a covariant position the results are unioned, in a contravariant one (e.g. function parameters) they're intersected. That's the basis of the UnionToIntersection trick.
- **Recursion depth is limited** — for overly complex types the compiler says "Type instantiation is excessively deep".
- Complex conditional types **noticeably slow down compilation** and the IDE. If a type has become unreadable, simplifying the data model is usually the right fix.`
    },
    codeSnippet: `// infer captures parts of a structure; distributivity splits unions
type Unpromise<T> = T extends Promise<infer U> ? U : T;
type A = Unpromise<Promise<string>>;        // string

type Flatten<T> = T extends Array<infer E> ? E : T;
type B = Flatten<number[]>;                 // number

type Boxed<T> = T extends any ? { v: T } : never;  // distributive
type C = Boxed<string | number>;            // { v: string } | { v: number }`
  },
  {
    id: 'jsts-018',
    category: 'typescript',
    level: 'Hard',
    tags: ['mapped-types', 'key-remapping', 'modifiers'],
    question: {
      ru: 'Как работают mapped types? Объясните модификаторы (`readonly`, `?`, `+`, `-`) и `as`-ремаппинг ключей.',
      en: 'How do mapped types work? Explain modifiers (`readonly`, `?`, `+`, `-`) and key remapping with `as`.'
    },
    answer: {
      ru: `## Коротко

**Mapped type — это \`for...of\` по ключам типа.** Берём существующий тип, проходим по всем его ключам и строим новый тип по правилу.

Синтаксис: \`{ [K in keyof T]: ЧтоТоОт T[K] }\`. Читается: «для каждого ключа \`K\` из \`T\` — сделай такое-то поле».

\`\`\`ts
// все поля превратить в string
type Stringify<T> = { [K in keyof T]: string };

// все поля обернуть в промис
type Async<T> = { [K in keyof T]: Promise<T[K]> };
\`\`\`

## Модификаторы: \`readonly\` и \`?\`

Прямо в маппинге можно **добавить** или **убрать** модификатор. Плюс добавляет, минус убирает:

\`\`\`ts
type Partial2<T>  = { [K in keyof T]+?: T[K] };        // добавить ?
type Required2<T> = { [K in keyof T]-?: T[K] };        // убрать ?
type Mutable<T>   = { -readonly [K in keyof T]: T[K] }; // убрать readonly
\`\`\`

Именно так в стандартной библиотеке написаны \`Partial\`, \`Required\` и \`Readonly\` — это буквально три строчки.

## Переименование ключей через \`as\`

С TS 4.1 можно менять **сами ключи**, а не только значения. Плюс — если вернуть \`never\`, ключ **выкинется** из результата. Так делают фильтрацию:

\`\`\`ts
// сгенерировать геттеры
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};
type G = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

// выкинуть ключ 'kind'
type RemoveKind<T> = { [K in keyof T as Exclude<K, 'kind'>]: T[K] };
\`\`\`

## Что сказать на собеседовании

> Mapped type перебирает ключи существующего типа и строит новый: \`{ [K in keyof T]: ... }\`. Значение обычно выражается через \`T[K]\`, поэтому связь с исходным типом не теряется. Модификаторы \`readonly\` и \`?\` можно добавлять и снимать префиксами \`+\` и \`-\` — ровно так реализованы \`Partial\`, \`Required\` и \`Readonly\`. С TS 4.1 появилось переименование ключей через \`as\`: новые имена строятся шаблонными литеральными типами. Важная деталь — гомоморфный маппинг, то есть маппинг напрямую по \`keyof T\`: он наследует исходные модификаторы и сохраняет «массивность» для массивов и кортежей.

## Ловушки

- **Гомоморфность легко потерять.** \`{ [K in keyof T]: ... }\` наследует \`readonly\` и \`?\` из \`T\`. Но стоит написать \`{ [K in Exclude<keyof T, 'a'>]: ... }\` — и модификаторы пропадут.
- **Массивы и кортежи**: гомоморфный маппинг сохраняет их природу — \`Partial<string[]>\` остаётся массивом. Неоднородный превратит их в обычный объект с ключами \`'0'\`, \`'1'\`, \`'length'\`.
- \`as\` **не убирает свойство из исходного типа**, а строит новый ключ. Чтобы убрать — верните \`never\` именно в позиции ключа, а не в позиции значения.
- \`Capitalize<string & K>\` — пересечение с \`string\` нужно потому, что ключ может быть \`number\` или \`symbol\`, а шаблонные типы работают со строками.
- **Сложные маппинги замедляют компиляцию.** Тип, который нельзя прочитать за минуту, обычно сигнал упростить модель данных.`,
      en: `## In short

**A mapped type is a \`for...of\` over a type's keys.** Take an existing type, walk over all its keys and build a new type by a rule.

The syntax: \`{ [K in keyof T]: somethingFrom T[K] }\`. It reads as "for every key \`K\` in \`T\`, produce this field".

\`\`\`ts
// turn every field into a string
type Stringify<T> = { [K in keyof T]: string };

// wrap every field in a promise
type Async<T> = { [K in keyof T]: Promise<T[K]> };
\`\`\`

## Modifiers: \`readonly\` and \`?\`

Right inside the mapping you can **add** or **remove** a modifier. Plus adds, minus removes:

\`\`\`ts
type Partial2<T>  = { [K in keyof T]+?: T[K] };        // add ?
type Required2<T> = { [K in keyof T]-?: T[K] };        // remove ?
type Mutable<T>   = { -readonly [K in keyof T]: T[K] }; // remove readonly
\`\`\`

This is literally how \`Partial\`, \`Required\` and \`Readonly\` are written in the standard library — three one-liners.

## Renaming keys with \`as\`

Since TS 4.1 you can change **the keys themselves**, not just the values. And if you return \`never\`, the key is **dropped** from the result — that's how filtering is done:

\`\`\`ts
// generate getters
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};
type G = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

// drop the 'kind' key
type RemoveKind<T> = { [K in keyof T as Exclude<K, 'kind'>]: T[K] };
\`\`\`

## What to say in the interview

> A mapped type iterates the keys of an existing type and builds a new one: \`{ [K in keyof T]: ... }\`. The value is usually expressed through \`T[K]\`, so the link to the source type isn't lost. The \`readonly\` and \`?\` modifiers can be added or removed with the \`+\` and \`-\` prefixes — that's exactly how \`Partial\`, \`Required\` and \`Readonly\` are implemented. TS 4.1 added key remapping via \`as\`: you can build new names with template literal types, for example generating getters, and returning \`never\` in key position filters a property out. An important detail is homomorphic mapping — mapping directly over \`keyof T\` — which inherits the original modifiers and preserves array-ness for arrays and tuples.

## Gotchas

- **Homomorphism is easy to lose.** \`{ [K in keyof T]: ... }\` inherits \`readonly\` and \`?\` from \`T\`. Write \`{ [K in Exclude<keyof T, 'a'>]: ... }\` and the modifiers disappear.
- **Arrays and tuples**: a homomorphic mapping preserves their nature — \`Partial<string[]>\` stays an array. A non-homomorphic one turns them into a plain object with keys \`'0'\`, \`'1'\`, \`'length'\`.
- \`as\` **doesn't remove a property from the source type**, it builds a new key. To remove one, return \`never\` in the key position, not the value position.
- \`Capitalize<string & K>\` — the intersection with \`string\` is needed because a key can be a \`number\` or \`symbol\`, while template literal types work on strings.
- **Complex mappings slow compilation.** A type you can't read in a minute is usually a sign to simplify the data model.`
    }
  },
  {
    id: 'jsts-019',
    category: 'typescript',
    level: 'Hard',
    tags: ['template-literal-types', 'string-types', 'inference'],
    question: {
      ru: 'Что такое template literal types? Как с их помощью разбирать и строить строковые типы?',
      en: 'What are template literal types? How do you use them to parse and build string types?'
    },
    answer: {
      ru: `## Коротко

**Template literal types — это шаблонные строки, но для типов.** Пишутся так же, через обратные кавычки и \`\${}\`, только внутри стоят не значения, а типы.

Зачем: описать не «просто строка», а строку **определённой формы** — \`'12px'\`, \`'onClick'\`, \`'/users/:id'\`.

\`\`\`ts
type Event = 'click' | 'hover';
type Handler = \`on\${Capitalize<Event>}\`;  // 'onClick' | 'onHover'
\`\`\`

## Главное свойство: union перемножается

Если внутрь шаблона подставить union, TypeScript переберёт **все комбинации**:

\`\`\`ts
type Color = 'red' | 'blue';
type Shade = 'light' | 'dark';
type Theme = \`\${Shade}-\${Color}\`;
// 'light-red' | 'light-blue' | 'dark-red' | 'dark-blue'
\`\`\`

## Четыре встроенных помощника

\`Uppercase\`, \`Lowercase\`, \`Capitalize\`, \`Uncapitalize\` — меняют регистр прямо на уровне типов. Именно \`Capitalize\` превращает \`'click'\` в \`'Click'\` в примере выше.

## Не только строить, но и разбирать

В связке с \`infer\` шаблон работает как регулярное выражение по типам — можно **вытащить** кусок строки:

\`\`\`ts
// разбить строку по разделителю
type Split<S extends string, D extends string> =
  S extends \`\${infer H}\${D}\${infer T}\`
    ? [H, ...Split<T, D>]
    : [S];
type P = Split<'a.b.c', '.'>; // ['a', 'b', 'c']
\`\`\`

Так делают типобезопасные роуты: из строки \`'/users/:id'\` тип сам достаёт имя параметра \`'id'\`.

## Где применяют

- **Роуты**: параметры пути выводятся из строки автоматически.
- **Имена событий и обработчиков**: \`on\` + имя события.
- **CSS-значения**: \`\${number}px\`, темы, названия классов.
- **Ключи в mapped types**: генерация \`getName\`, \`setName\` из \`name\`.

## Что сказать на собеседовании

> Template literal types позволяют конструировать и сопоставлять строковые литеральные типы: синтаксис как у шаблонных строк, но внутри подставляются типы. Ключевое свойство — дистрибутивность: если в шаблон подставить union, результатом будет union всех комбинаций. Есть четыре встроенных intrinsic-типа для регистра: \`Uppercase\`, \`Lowercase\`, \`Capitalize\`, \`Uncapitalize\`. В связке с условными типами и \`infer\` шаблоны умеют разбирать строки — так делают типобезопасные роуты с выводом имён параметров из строки пути. Ограничение — комбинаторный взрыв на больших union и лимит глубины рекурсии.

## Ловушки

- **Комбинаторный взрыв.** Два union по 50 элементов дают 2500 вариантов, три — уже 125 000, и компилятор упрётся в лимит. Шаблоны хороши для небольших конечных множеств.
- **\`\${string}\` — это не «любая строка внутри»**, а «любая подстрока», и такой тип быстро становится бесполезно широким.
- \`\${number}\` разрешает и \`'1e5'\`, и \`'-0'\`, и \`'Infinity'\` — это не «целое положительное число».
- **Рекурсивный парсинг ограничен по глубине.** Разобрать длинную строку по символу не выйдет.
- Это **только типы**. В рантайме никакой проверки нет — если строка пришла с сервера, её всё равно надо валидировать.`,
      en: `## In short

**Template literal types are template strings, but for types.** Same syntax — backticks and \`\${}\` — except what goes inside are types, not values.

What for: to describe not "just a string" but a string of a **specific shape** — \`'12px'\`, \`'onClick'\`, \`'/users/:id'\`.

\`\`\`ts
type Event = 'click' | 'hover';
type Handler = \`on\${Capitalize<Event>}\`;  // 'onClick' | 'onHover'
\`\`\`

## The key property: unions cross-multiply

Substitute a union into a template and TypeScript enumerates **every combination**:

\`\`\`ts
type Color = 'red' | 'blue';
type Shade = 'light' | 'dark';
type Theme = \`\${Shade}-\${Color}\`;
// 'light-red' | 'light-blue' | 'dark-red' | 'dark-blue'
\`\`\`

## Four built-in helpers

\`Uppercase\`, \`Lowercase\`, \`Capitalize\`, \`Uncapitalize\` change case at the type level. It's \`Capitalize\` that turns \`'click'\` into \`'Click'\` in the example above.

## Not only building — parsing too

Together with \`infer\`, a template works like a regular expression over types — you can **extract** part of a string:

\`\`\`ts
// split a string by a delimiter
type Split<S extends string, D extends string> =
  S extends \`\${infer H}\${D}\${infer T}\`
    ? [H, ...Split<T, D>]
    : [S];
type P = Split<'a.b.c', '.'>; // ['a', 'b', 'c']
\`\`\`

This is how type-safe routes work: from the string \`'/users/:id'\` the type extracts the parameter name \`'id'\` by itself.

## Where they're used

- **Routes**: path parameters inferred from the string automatically.
- **Event and handler names**: \`on\` plus the event name.
- **CSS values**: \`\${number}px\`, themes, class names.
- **Keys in mapped types**: generating \`getName\`, \`setName\` from \`name\`.

## What to say in the interview

> Template literal types let you construct and match string literal types: the syntax matches template strings, but types are substituted inside. The key property is distributivity — substituting a union produces a union of every combination. There are four built-in intrinsics for case: \`Uppercase\`, \`Lowercase\`, \`Capitalize\` and \`Uncapitalize\`. Combined with conditional types and \`infer\`, templates can not only build strings but also parse them — that's how type-safe routes derive parameter names straight from the path string. The limitations are combinatorial blow-up on large unions and a recursion depth limit; and it's all type-level only, at runtime the strings are ordinary.

## Gotchas

- **Combinatorial blow-up.** Two 50-member unions give 2500 combinations, three give 125,000 and the compiler gives up. Templates are for small finite sets.
- **\`\${string}\` isn't "any string inside"** — it's "any substring", and such a type quickly becomes uselessly wide.
- \`\${number}\` also allows \`'1e5'\`, \`'-0'\` and \`'Infinity'\` — it is not "a positive integer".
- **Recursive parsing is depth-limited.** You won't parse a long string character by character.
- These are **types only**. There's no runtime check — a string from the server still has to be validated.`
    },
    codeSnippet: `type CSSUnit = 'px' | 'rem' | '%';
type Size = \`\${number}\${CSSUnit}\`;
const a: Size = '12px';   // ok
const b: Size = '1.5rem'; // ok
// const c: Size = '12';  // error — missing unit

type EventName<T extends string> = \`on\${Capitalize<T>}\`;
type Names = EventName<'click' | 'focus'>; // 'onClick' | 'onFocus'`
  },
  {
    id: 'jsts-020',
    category: 'typescript',
    level: 'Medium',
    tags: ['utility-types', 'pick-omit', 'partial-record'],
    question: {
      ru: 'Объясните, как реализованы встроенные utility-типы Partial, Pick, Omit, Record, Exclude, ReturnType.',
      en: 'Explain how the built-in utility types Partial, Pick, Omit, Record, Exclude, ReturnType are implemented.'
    },
    answer: {
      ru: `## Коротко

Хорошая новость: **все эти «магические» типы — по одной строчке кода**, и их можно написать самому. Они собраны всего из двух кирпичей: mapped types (перебор ключей) и conditional types (тернарник с \`infer\`).

\`\`\`ts
type Partial<T>  = { [K in keyof T]?: T[K] };          // всё стало необязательным
type Required<T> = { [K in keyof T]-?: T[K] };         // сняли ?
type Readonly<T> = { readonly [K in keyof T]: T[K] };  // добавили readonly

type Pick<T, K extends keyof T> = { [P in K]: T[P] };  // оставить только K
type Record<K extends keyof any, T> = { [P in K]: T }; // построить объект K -> T

type Exclude<T, U> = T extends U ? never : T;          // выкинуть из union
type Extract<T, U> = T extends U ? T : never;          // оставить в union

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

type ReturnType<F> = F extends (...a: any[]) => infer R ? R : never;
type Parameters<F> = F extends (...a: infer P) => any ? P : never;
\`\`\`

## Разбор по группам

**Первая группа — модификаторы.** \`Partial\`, \`Required\`, \`Readonly\` просто идут по всем ключам и добавляют или снимают \`?\`/\`readonly\`. Ничего больше.

**Вторая группа — про ключи.** \`Pick\` перебирает не все ключи, а только переданные. \`Record\` строит объект с нуля: ключи \`K\`, у всех значение \`T\`.

**Третья группа — фильтры union.** \`Exclude\` и \`Extract\` — дистрибутивные условные типы: TypeScript применяет условие к каждому члену union и склеивает результат. \`never\` в результате «исчезает», это и есть удаление.

**\`Omit\` — комбинация двух**: возьми ключи \`T\`, выкинь из них \`K\` (\`Exclude\`), и по оставшимся сделай \`Pick\`.

**Четвёртая группа — \`infer\`.** \`ReturnType\` и \`Parameters\` матчат тип функции и захватывают нужную часть.

## Ещё полезные из коробки

- \`NonNullable<T>\` — убирает \`null\` и \`undefined\`.
- \`Awaited<T>\` — рекурсивно разворачивает \`Promise\`, в том числе вложенные.
- \`InstanceType<C>\` — тип экземпляра по типу класса, \`ConstructorParameters<C>\` — аргументы конструктора.

## Что сказать на собеседовании

> Все встроенные utility-типы собраны из двух механизмов. \`Partial\`, \`Required\` и \`Readonly\` — это гомоморфные mapped types с модификаторами \`?\`, \`-?\` и \`readonly\`. \`Pick\` — маппинг по подмножеству ключей, \`Record<K, T>\` конструирует объект с ключами \`K\` и значениями \`T\`. \`Exclude\` и \`Extract\` — дистрибутивные условные типы, фильтрующие union через \`never\`. \`Omit\` собран из них: \`Pick<T, Exclude<keyof T, K>>\`, и именно поэтому он не гомоморфен и разрушает дискриминируемые union. \`ReturnType\` и \`Parameters\` — условные типы с \`infer\`, захватывающим возвращаемое значение или кортеж параметров.

## Ловушки

- **\`Omit\` ломает дискриминируемые union.** \`Omit<A | B, 'x'>\` схлопнет их в один объект, и \`switch\` по полю \`kind\` перестанет сужать тип. Нужен свой дистрибутивный вариант: \`type DistributiveOmit<T, K> = T extends any ? Omit<T, K> : never\`.
- **\`Omit\` не проверяет ключи**: \`Omit<User, 'nmae'>\` с опечаткой скомпилируется молча, потому что второй параметр — \`keyof any\`, а не \`keyof T\`. У \`Pick\` такой проблемы нет.
- **\`Partial\` поверхностный.** Вложенные объекты остаются обязательными — для глубины нужен свой рекурсивный \`DeepPartial\`.
- **\`Required\` снимает \`?\`, но не убирает \`undefined\` из типа значения** — если поле объявлено как \`x?: string | undefined\`, останется \`string | undefined\`.
- \`ReturnType\` **работает с типом функции, а не с самой функцией**: нужно писать \`ReturnType<typeof fn>\`.`,
      en: `## In short

Good news: **all these "magic" types are one-liners**, and you could write them yourself. They're built from just two bricks: mapped types (walking keys) and conditional types (a ternary with \`infer\`).

\`\`\`ts
type Partial<T>  = { [K in keyof T]?: T[K] };          // everything optional
type Required<T> = { [K in keyof T]-?: T[K] };         // strip ?
type Readonly<T> = { readonly [K in keyof T]: T[K] };  // add readonly

type Pick<T, K extends keyof T> = { [P in K]: T[P] };  // keep only K
type Record<K extends keyof any, T> = { [P in K]: T }; // build K -> T

type Exclude<T, U> = T extends U ? never : T;          // drop from a union
type Extract<T, U> = T extends U ? T : never;          // keep in a union

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

type ReturnType<F> = F extends (...a: any[]) => infer R ? R : never;
type Parameters<F> = F extends (...a: infer P) => any ? P : never;
\`\`\`

## Group by group

**Group one — modifiers.** \`Partial\`, \`Required\` and \`Readonly\` simply walk every key and add or remove \`?\`/\`readonly\`. Nothing more.

**Group two — about keys.** \`Pick\` iterates only the keys you passed, not all of them. \`Record\` builds an object from scratch: keys \`K\`, every value \`T\`.

**Group three — union filters.** \`Exclude\` and \`Extract\` are distributive conditional types: TypeScript applies the condition to each union member and glues the results back. \`never\` "vanishes" from the result — and that's the deletion.

**\`Omit\` is a combination of the two**: take \`T\`'s keys, drop \`K\` from them (\`Exclude\`) and \`Pick\` the rest.

**Group four — \`infer\`.** \`ReturnType\` and \`Parameters\` match a function type and capture the part they need.

## Other useful built-ins

- \`NonNullable<T>\` — removes \`null\` and \`undefined\`.
- \`Awaited<T>\` — recursively unwraps a \`Promise\`, including nested ones.
- \`InstanceType<C>\` — the instance type of a class type; \`ConstructorParameters<C>\` — its constructor arguments.

## What to say in the interview

> All the built-in utility types are assembled from two mechanisms. \`Partial\`, \`Required\` and \`Readonly\` are homomorphic mapped types with the \`?\`, \`-?\` and \`readonly\` modifiers. \`Pick\` maps over a subset of keys, \`Record<K, T>\` constructs an object with keys \`K\` and values \`T\`. \`Exclude\` and \`Extract\` are distributive conditional types that filter a union through \`never\`. \`Omit\` is built from them as \`Pick<T, Exclude<keyof T, K>>\`, which is exactly why it isn't homomorphic and breaks discriminated unions — those need a distributive helper of your own. \`ReturnType\` and \`Parameters\` are conditional types with \`infer\` capturing the return value or the tuple of parameters. Understanding these implementations lets you write your own utilities like \`DeepPartial\` or \`PickByValue\`.

## Gotchas

- **\`Omit\` breaks discriminated unions.** \`Omit<A | B, 'x'>\` collapses them into one object and a \`switch\` on \`kind\` stops narrowing. You need your own distributive version: \`type DistributiveOmit<T, K> = T extends any ? Omit<T, K> : never\`.
- **\`Omit\` doesn't check keys**: \`Omit<User, 'nmae'>\` with a typo compiles silently, because the second parameter is \`keyof any\`, not \`keyof T\`. \`Pick\` doesn't have that problem.
- **\`Partial\` is shallow.** Nested objects stay required — for depth you need your own recursive \`DeepPartial\`.
- **\`Required\` removes \`?\` but doesn't remove \`undefined\` from the value type** — if a field is declared \`x?: string | undefined\`, you're left with \`string | undefined\`.
- \`ReturnType\` **works on a function type, not on a function**: you have to write \`ReturnType<typeof fn>\`.`
    },
    codeSnippet: `interface User { id: number; name: string; password: string; }

type PublicUser = Omit<User, 'password'>;          // { id; name }
type Draft = Partial<Pick<User, 'name'>>;          // { name?: string }
type ById = Record<number, User>;                  // dictionary
type Save = (u: User) => Promise<number>;
type SavedId = Awaited<ReturnType<Save>>;          // number`
  },
  {
    id: 'jsts-021',
    category: 'typescript',
    level: 'Expert',
    tags: ['variance', 'covariance', 'contravariance'],
    question: {
      ru: 'Что такое вариантность (ковариантность/контравариантность) в TypeScript? Где она проявляется?',
      en: 'What is variance (covariance/contravariance) in TypeScript? Where does it show up?'
    },
    answer: {
      ru: `## Коротко

Пусть \`Dog\` — подтип \`Animal\` (собака это животное). Вопрос вариантности: **а \`Box<Dog>\` — подтип \`Box<Animal>\`?** Ответ зависит от того, что делает обёртка со значением.

Правило на пальцах: **отдаёт наружу — ковариантно, принимает внутрь — контравариантно.**

- **Ковариантность** — направление сохраняется: \`Dog\` → \`Animal\`, значит и \`Box<Dog>\` → \`Box<Animal>\`. Так работают **возвращаемые значения** и поля на чтение.
- **Контравариантность** — направление **переворачивается**: \`Box<Animal>\` → \`Box<Dog>\`. Так работают **параметры функций**.
- **Инвариантность** — никак. Контейнер, который и читают, и пишут.
- **Бивариантность** — и туда, и туда. Удобно, но небезопасно.

## Почему параметры переворачиваются — на пальцах

Нужна функция, которая умеет обработать **собаку**. Подойдёт ли функция, которая умеет обработать **любое животное**?

Да — она справится и с собакой. То есть «обработчик животного» годится там, где просят «обработчик собаки». Направление перевернулось.

А наоборот? Функция, умеющая только собак, не справится с котом. Значит, не подходит.

\`\`\`ts
type Fn<A> = (a: A) => void;
declare let fa: Fn<Animal>;
declare let fd: Fn<Dog>;

fd = fa; // ок — обработчик Animal справится и с Dog
fa = fd; // ошибка при strictFunctionTypes — обработчик Dog не осилит кота
\`\`\`

## Где это выстреливает в реальном коде

- Присваивание колбэков и обработчиков — самая частая «странная» ошибка про несовместимые функции.
- \`readonly T[]\` **ковариантен** — его можно только читать. Обычный изменяемый \`T[]\` в TS сделан бивариантным ради удобства, хотя строго это небезопасно.
- **Методы, объявленные через сокращённый синтаксис \`m(a): void\`, остаются бивариантными** — это намеренная дыра в системе типов ради совместимости со старым кодом и DOM API. А поле-функция \`m: (a: A) => void\` уже проверяется строго.

## Что сказать на собеседовании

> Вариантность описывает, как отношение подтипов переносится на обобщённые типы. Возвращаемые значения и поля на чтение ковариантны: направление сохраняется. Параметры функций контравариантны: направление инвертируется, потому что функция с более широким параметром безопасно подставляется туда, где ждут более узкий. Строгая проверка параметров включается флагом \`strictFunctionTypes\`, но методы, объявленные сокращённым синтаксисом, намеренно остаются бивариантными ради совместимости. С TS 4.7 вариантность параметра типа можно указать явно аннотациями \`in\`, \`out\` и \`in out\`.

## Ловушки

- **\`strictFunctionTypes\` не действует на методы.** \`interface A { on(e: Event): void }\` проверяется бивариантно, а \`interface A { on: (e: Event) => void }\` — строго. Разница только в синтаксисе объявления.
- **Изменяемый массив небезопасен по вариантности**: \`Dog[]\` присваивается в \`Animal[]\`, после чего в него можно положить кота. TypeScript это разрешает сознательно.
- **Возврат \`void\` особенный**: функцию, возвращающую что угодно, можно подставить туда, где ждут \`() => void\`. Поэтому \`arr.forEach(x => arr2.push(x))\` компилируется без ошибок.
- Аннотации \`in\`/\`out\` — **не про рантайм**, а подсказка компилятору. Ошибочная аннотация даст ошибку, а не тихую поломку.`,
      en: `## In short

Say \`Dog\` is a subtype of \`Animal\` (a dog is an animal). The variance question is: **is \`Box<Dog>\` a subtype of \`Box<Animal>\`?** The answer depends on what the wrapper does with the value.

The rule of thumb: **hands it out — covariant; takes it in — contravariant.**

- **Covariance** — direction is preserved: \`Dog\` → \`Animal\`, therefore \`Box<Dog>\` → \`Box<Animal>\`. This is how **return values** and read-only fields behave.
- **Contravariance** — direction is **flipped**: \`Box<Animal>\` → \`Box<Dog>\`. This is how **function parameters** behave.
- **Invariance** — neither way. A container that's both read and written.
- **Bivariance** — both ways. Convenient but unsafe.

## Why parameters flip — in plain terms

You need a function that can handle a **dog**. Would a function that can handle **any animal** do?

Yes — it copes with a dog too. So an "animal handler" is acceptable where a "dog handler" is asked for. The direction flipped.

And the other way round? A function that only handles dogs can't handle a cat. So it doesn't fit.

\`\`\`ts
type Fn<A> = (a: A) => void;
declare let fa: Fn<Animal>;
declare let fd: Fn<Dog>;

fd = fa; // ok — an Animal handler copes with a Dog too
fa = fd; // error under strictFunctionTypes — a Dog handler can't take a cat
\`\`\`

## Where this bites in real code

- Assigning callbacks and handlers — the most common "weird" error about incompatible functions.
- \`readonly T[]\` is **covariant** — it can only be read. A regular mutable \`T[]\` is bivariant in TypeScript for convenience, even though that's strictly unsafe.
- **Methods declared with the shorthand syntax \`m(a): void\` stay bivariant** — a deliberate hole in the type system for compatibility with legacy code and DOM APIs. A function-typed property \`m: (a: A) => void\` is checked strictly.

## What to say in the interview

> Variance describes how the subtype relation carries over to generic types. Output positions — return values and readable fields — are covariant: the direction is preserved. Function parameters are contravariant: the direction is inverted, because a function accepting a wider type can safely be substituted where a function with a narrower parameter is expected. In TypeScript strict parameter checking is enabled by \`strictFunctionTypes\`, but methods declared with shorthand syntax deliberately stay bivariant for compatibility. \`readonly\` arrays are covariant while mutable arrays are pragmatically bivariant. Since TS 4.7 the variance of a type parameter can be stated explicitly with the \`in\`, \`out\` and \`in out\` annotations, which speeds up checking and makes the intent explicit.

## Gotchas

- **\`strictFunctionTypes\` doesn't apply to methods.** \`interface A { on(e: Event): void }\` is checked bivariantly, while \`interface A { on: (e: Event) => void }\` is checked strictly. The only difference is the declaration syntax.
- **Mutable arrays are unsound by variance**: \`Dog[]\` is assignable to \`Animal[]\`, after which you can push a cat into it. TypeScript allows this knowingly.
- **A \`void\` return is special**: a function returning anything can be substituted where \`() => void\` is expected. That's why \`arr.forEach(x => arr2.push(x))\` compiles fine.
- The \`in\`/\`out\` annotations are **not about runtime** — they're a hint to the compiler. A wrong annotation is an error, not a silent breakage.`
    }
  },
  {
    id: 'jsts-022',
    category: 'typescript',
    level: 'Hard',
    tags: ['unknown', 'any', 'never'],
    question: {
      ru: 'В чём разница между `unknown`, `any` и `never`? Когда использовать каждый?',
      en: 'What is the difference between `unknown`, `any`, and `never`? When to use each?'
    },
    answer: {
      ru: `## Коротко, одной фразой каждый

- **\`any\`** — «отстань, компилятор». Проверки выключены полностью.
- **\`unknown\`** — «я не знаю, что это. Заставь меня проверить перед использованием».
- **\`never\`** — «сюда попасть невозможно». Тип, у которого нет ни одного значения.

Аналогия: \`any\` — коробка без этикетки, которую разрешено открывать и есть содержимое вслепую. \`unknown\` — та же коробка, но её сначала обязаны вскрыть и проверить. \`never\` — коробки вообще нет.

## any — почему это опасно

\`any\` не просто «любой тип» — он **заражает** соседний код. Достали поле из \`any\` — получили \`any\`. Передали дальше — и вся цепочка потеряла типы, а ошибка вылезет уже в рантайме.

Оправданные случаи ровно два: постепенная миграция старого кода и работа с нетипизированной библиотекой. И то, лучше локально, а не в сигнатуре публичной функции.

## unknown — правильная замена any

В \`unknown\` можно **положить** что угодно, но **достать и использовать** — только после проверки. Компилятор буквально заставит написать \`typeof\`, \`instanceof\` или type guard.

\`\`\`ts
function parse(json: string): unknown {
  return JSON.parse(json);
}
const data = parse('{"n":1}');

// data.n;  // ошибка: сначала докажи, что это объект с полем n
if (typeof data === 'object' && data !== null && 'n' in data) {
  // здесь data уже сужен, работать можно
}
\`\`\`

Правильные места для \`unknown\`: результат \`JSON.parse\`, данные из сети, \`catch (e: unknown)\`, аргументы generic-утилит.

## never — «такого не бывает»

\`never\` появляется сам:

- у функции, которая **никогда не возвращает** — бросает исключение или крутит бесконечный цикл;
- в **недостижимой ветке** кода;
- как результат **невозможного пересечения**: \`string & number\`.

Главное практическое применение — **проверка полноты \`switch\`**. Если в union добавят новый вариант, а обработку забудут, код перестанет компилироваться:

\`\`\`ts
type Cmd = { t: 'a' } | { t: 'b' };

function run(c: Cmd) {
  switch (c.t) {
    case 'a': return 1;
    case 'b': return 2;
    default: {
      const _exhaustive: never = c;  // ошибка, если добавили новый вариант
      return _exhaustive;
    }
  }
}
\`\`\`

## Что сказать на собеседовании

> \`any\` полностью отключает проверку типов и заражает соседний код, поэтому это escape hatch для миграции, а не рабочий инструмент. \`unknown\` — типобезопасный верхний тип: принять можно любое значение, но использовать без сужения нельзя — компилятор потребует type guard. Это правильный тип для данных из внешнего мира — JSON, сети, \`catch\`. \`never\` — нижний тип, не имеющий значений: он возникает у функций, которые не возвращают управление, и в недостижимых ветках. \`never\` присваивается любому типу, но в него — ничего, и на этом строится проверка полноты \`switch\` в ветке \`default\`.

## Ловушки

- \`unknown\` **поглощает union**: \`unknown | string\` — это просто \`unknown\`. А \`never\` наоборот исчезает: \`never | string\` — это \`string\`.
- **В \`catch\` по умолчанию \`any\`.** Флаг \`useUnknownInCatchVariables\` (входит в \`strict\`) делает его \`unknown\`, и это правильно — брошено может быть что угодно, не только \`Error\`.
- **\`any\` тихо проходит проверки**: \`const x: any = ...; x.foo.bar.baz\` компилируется и падает в рантайме. Именно поэтому в линтерах есть правило \`no-explicit-any\`.
- **Массив \`never[]\`** — частый признак ошибки вывода: обычно это пустой массив без аннотации, в который потом ничего нельзя положить.
- Функция с типом возврата \`void\` и функция с \`never\` — **разные вещи**: \`void\` возвращает управление, \`never\` — нет.`,
      en: `## In short, one line each

- **\`any\`** — "leave me alone, compiler". Checking is switched off entirely.
- **\`unknown\`** — "I don't know what this is. Force me to check before I use it."
- **\`never\`** — "getting here is impossible". A type with no values at all.

The analogy: \`any\` is an unlabelled box you're allowed to open and eat from blindly. \`unknown\` is the same box, but you're required to open and inspect it first. \`never\` is a box that doesn't exist.

## any — why it's dangerous

\`any\` isn't just "any type" — it **infects** the surrounding code. Read a field off an \`any\` and you get \`any\`. Pass it along and the whole chain loses its types, with the error surfacing at runtime.

There are exactly two justified cases: gradually migrating legacy code, and working with an untyped library. Even then, keep it local rather than in the signature of a public function.

## unknown — the correct replacement for any

You can **put** anything into an \`unknown\`, but you can only **take it out and use it** after a check. The compiler literally forces you to write \`typeof\`, \`instanceof\` or a type guard.

\`\`\`ts
function parse(json: string): unknown {
  return JSON.parse(json);
}
const data = parse('{"n":1}');

// data.n;  // error: prove it's an object with an n field first
if (typeof data === 'object' && data !== null && 'n' in data) {
  // data is narrowed here and can be used
}
\`\`\`

The right places for \`unknown\`: the result of \`JSON.parse\`, network data, \`catch (e: unknown)\`, arguments of generic utilities.

## never — "this can't happen"

\`never\` appears on its own:

- for a function that **never returns** — it throws or loops forever;
- in an **unreachable branch**;
- as the result of an **impossible intersection**: \`string & number\`.

Its main practical use is **exhaustiveness checking on a \`switch\`**. If someone adds a new union member and forgets to handle it, the code stops compiling:

\`\`\`ts
type Cmd = { t: 'a' } | { t: 'b' };

function run(c: Cmd) {
  switch (c.t) {
    case 'a': return 1;
    case 'b': return 2;
    default: {
      const _exhaustive: never = c;  // errors if a new variant is added
      return _exhaustive;
    }
  }
}
\`\`\`

## What to say in the interview

> \`any\` switches type checking off completely and infects the surrounding code, so it's an escape hatch for migrations and untyped libraries rather than a working tool. \`unknown\` is the type-safe top type: any value can be assigned to it, but it can't be used without narrowing — the compiler demands a type guard. That makes it the right type for data from the outside world: JSON, the network, \`catch\`. \`never\` is the bottom type with no values: it arises for functions that never return, in unreachable branches and from impossible intersections. \`never\` is assignable to any type but nothing is assignable to it, and that's what exhaustiveness checking of a \`switch\` is built on via a \`never\`-typed variable in the default branch.

## Gotchas

- \`unknown\` **absorbs a union**: \`unknown | string\` is just \`unknown\`. \`never\` does the opposite and disappears: \`never | string\` is \`string\`.
- **\`catch\` gives \`any\` by default.** The \`useUnknownInCatchVariables\` flag (part of \`strict\`) makes it \`unknown\`, which is correct — anything can be thrown, not just an \`Error\`.
- **\`any\` sails through checks**: \`const x: any = ...; x.foo.bar.baz\` compiles and blows up at runtime. That's exactly why linters have \`no-explicit-any\`.
- **A \`never[]\` array** is a common sign of a bad inference: usually an empty array without an annotation, into which nothing can then be pushed.
- A function returning \`void\` and one returning \`never\` are **different things**: \`void\` returns control, \`never\` doesn't.`
    },
    codeSnippet: `function safe(input: unknown) {
  // unknown forces a check before use
  if (typeof input === 'string') return input.trim();
  if (Array.isArray(input)) return input.length;
  return 0;
}

// never as an exhaustiveness guard
type Cmd = { t: 'a' } | { t: 'b' };
function run(c: Cmd) {
  switch (c.t) {
    case 'a': return 1;
    case 'b': return 2;
    default: { const _: never = c; return _; } // errors if a case is added
  }
}`
  },
  {
    id: 'jsts-023',
    category: 'typescript',
    level: 'Hard',
    tags: ['type-narrowing', 'type-guards', 'control-flow'],
    question: {
      ru: 'Как работает сужение типов (narrowing) и пользовательские type guards? Что такое анализ потока управления?',
      en: 'How does type narrowing and custom type guards work? What is control-flow analysis?'
    },
    answer: {
      ru: `## Коротко

**Сужение (narrowing) — это когда компилятор следит за вашими проверками и уточняет тип внутри ветки.**

Было \`x: string | number\`. Написали \`if (typeof x === 'string')\` — и **внутри этого if** компилятор уже считает, что \`x\` это \`string\`, а в \`else\` — \`number\`. Никаких приведений писать не надо.

Механизм, который это делает, называется **анализ потока управления (control-flow analysis)**: TypeScript мысленно проходит по всем веткам кода и ведёт для каждой свой «текущий тип» переменной.

## Из чего компилятор понимает сужение

- \`typeof x === 'string'\` — для примитивов.
- \`x instanceof Date\` — для классов.
- \`'prop' in obj\` — по наличию свойства.
- Проверки на \`null\`/\`undefined\` и на truthy: \`if (!x) return;\`.
- Сравнение с литералом: \`if (s.kind === 'circle')\` — для дискриминируемых union.
- \`Array.isArray(x)\`.
- Просто присваивание: после \`x = 'abc'\` тип уточняется по значению.

\`\`\`ts
function f(x: string | number | null) {
  if (x == null) return;         // отсекли null и undefined одной проверкой
  if (typeof x === 'string') {
    x.toUpperCase();             // здесь x: string
  } else {
    x.toFixed(2);                // здесь x: number
  }
}
\`\`\`

## Свой type guard — когда встроенных не хватает

Если проверка сложная, её выносят в функцию с особым типом возврата — \`arg is T\`. Это называется **предикат типа**. Вернула \`true\` — компилятор сузит аргумент в вызывающем коде.

\`\`\`ts
interface Cat { meow(): void }

function isCat(a: unknown): a is Cat {
  return typeof a === 'object' && a !== null && 'meow' in a;
}

if (isCat(pet)) pet.meow();   // здесь pet: Cat
\`\`\`

Важно: **за правильность отвечаете вы**. Компилятор верит предикату на слово и не проверяет тело функции.

## Assertion-функции — сужение без \`if\`

\`asserts x is T\` бросает исключение, если условие не выполнено, и **сужает тип после вызова**:

\`\`\`ts
function assertIsString(v: unknown): asserts v is string {
  if (typeof v !== 'string') throw new Error('not a string');
}

assertIsString(input);
input.toUpperCase();   // дальше по коду input уже string
\`\`\`

## Что сказать на собеседовании

> TypeScript выполняет анализ потока управления: он отслеживает тип переменной по ветвям и сужает его после проверок — \`typeof\`, \`instanceof\`, оператор \`in\`, проверки на null, сравнение с литералом дискриминанта. Когда встроенных проверок не хватает, пишут пользовательский type guard — функцию с возвращаемым типом \`arg is T\`; компилятор доверяет предикату и сужает аргумент на месте вызова, поэтому корректность на разработчике. Важная практическая деталь — сужение теряется после \`await\` и внутри колбэков, потому что переменная могла измениться; лечится копированием в \`const\`.

## Ловушки

- **Сужение теряется в колбэках и после \`await\`.** Компилятор не может доказать, что \`this.user\` не изменился. Лечение: \`const user = this.user; if (!user) return;\` — дальше работать с локальной константой.
- **Только \`let\`/\`var\` теряют сужение при присваивании.** Для \`const\` тип фиксируется навсегда.
- **Опциональное поле и \`in\`**: \`'prop' in obj\` сужает, но если свойство объявлено необязательным, значением всё ещё может быть \`undefined\`.
- **Предикат можно написать неверно**, и компилятор промолчит: \`function isCat(a: unknown): a is Cat { return true; }\` — законно и опасно.
- В TS 5.5 простые предикаты **выводятся автоматически**: \`arr.filter(x => x !== null)\` теперь правильно убирает \`null\` из типа, раньше приходилось писать guard руками.`,
      en: `## In short

**Narrowing is when the compiler watches your checks and refines the type inside a branch.**

You had \`x: string | number\`. You wrote \`if (typeof x === 'string')\` — and **inside that if** the compiler already treats \`x\` as a \`string\`, and as a \`number\` in the \`else\`. No casts required.

The machinery behind it is **control-flow analysis**: TypeScript mentally walks every branch of the code and keeps a "current type" for the variable in each one.

## What the compiler recognises as narrowing

- \`typeof x === 'string'\` — for primitives.
- \`x instanceof Date\` — for classes.
- \`'prop' in obj\` — by property presence.
- \`null\`/\`undefined\` and truthiness checks: \`if (!x) return;\`.
- Comparison with a literal: \`if (s.kind === 'circle')\` — for discriminated unions.
- \`Array.isArray(x)\`.
- Plain assignment: after \`x = 'abc'\` the type is refined by the value.

\`\`\`ts
function f(x: string | number | null) {
  if (x == null) return;         // both null and undefined ruled out in one check
  if (typeof x === 'string') {
    x.toUpperCase();             // x is string here
  } else {
    x.toFixed(2);                // x is number here
  }
}
\`\`\`

## A custom type guard — when the built-ins aren't enough

If the check is complex, you move it into a function with a special return type — \`arg is T\`. That's a **type predicate**. Return \`true\` and the compiler narrows the argument at the call site.

\`\`\`ts
interface Cat { meow(): void }

function isCat(a: unknown): a is Cat {
  return typeof a === 'object' && a !== null && 'meow' in a;
}

if (isCat(pet)) pet.meow();   // pet is Cat here
\`\`\`

Important: **you are responsible for correctness.** The compiler takes the predicate at its word and never checks the body.

## Assertion functions — narrowing without an \`if\`

\`asserts x is T\` throws if the condition doesn't hold and **narrows the type from then on**:

\`\`\`ts
function assertIsString(v: unknown): asserts v is string {
  if (typeof v !== 'string') throw new Error('not a string');
}

assertIsString(input);
input.toUpperCase();   // input is a string for the rest of the code
\`\`\`

## What to say in the interview

> TypeScript performs control-flow analysis: it tracks a variable's type per branch and narrows it after checks — \`typeof\`, \`instanceof\`, the \`in\` operator, null and truthiness checks, comparison with a discriminant literal, and assignment. When the built-in checks aren't enough you write a custom type guard — a function with the return type \`arg is T\`; the compiler trusts the predicate and narrows the argument at the call site, so correctness is on the developer. There are also assertion functions with the signature \`asserts x is T\`: they throw on a mismatch and narrow the type for all subsequent code without a nested \`if\`. An important practical detail is that narrowing is lost after \`await\` and inside callbacks, because the variable could have changed; the fix is to copy it into a \`const\`.

## Gotchas

- **Narrowing is lost in callbacks and after \`await\`.** The compiler can't prove \`this.user\` hasn't changed. The fix: \`const user = this.user; if (!user) return;\` and work with the local constant.
- **Only \`let\`/\`var\` lose narrowing on assignment.** For a \`const\` the type is fixed for good.
- **Optional properties and \`in\`**: \`'prop' in obj\` narrows, but if the property is optional the value can still be \`undefined\`.
- **A predicate can simply be wrong** and the compiler stays quiet: \`function isCat(a: unknown): a is Cat { return true; }\` is legal and dangerous.
- In TS 5.5 simple predicates are **inferred automatically**: \`arr.filter(x => x !== null)\` now correctly removes \`null\` from the type, which previously needed a hand-written guard.`
    }
  },
  {
    id: 'jsts-024',
    category: 'typescript',
    level: 'Medium',
    tags: ['discriminated-unions', 'tagged-unions', 'exhaustiveness'],
    question: {
      ru: 'Что такое discriminated unions и как обеспечить проверку полноты (exhaustiveness) обработки?',
      en: 'What are discriminated unions and how do you ensure exhaustiveness of handling?'
    },
    answer: {
      ru: `## Коротко

**Discriminated union — это union объектов, у которых есть одно общее поле-метка** (\`kind\`, \`type\`, \`status\`) с литеральным значением. Проверили метку — компилятор сам понял, с каким именно вариантом вы работаете.

Аналогия: посылки на складе. У каждой наклейка «хрупкое», «продукты», «документы». Прочитали наклейку — знаете, что внутри и что с этим делать.

\`\`\`ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rect'; w: number; h: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2; // здесь есть radius
    case 'square': return s.side ** 2;             // здесь есть side
    case 'rect':   return s.w * s.h;
  }
}
\`\`\`

Обратите внимание: **никаких \`as\` и проверок на \`undefined\`**. Компилятор сам знает, какие поля доступны в каждой ветке.

## Проверка полноты (exhaustiveness)

Проблема: через полгода в union добавят \`{ kind: 'triangle' }\`, а обработку забудут. Хочется, чтобы **код перестал компилироваться**, а не тихо возвращал \`undefined\`.

Приём: в \`default\` присвоить значение в переменную типа \`never\`.

\`\`\`ts
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.side ** 2;
    case 'rect':   return s.w * s.h;
    default: {
      const _exhaustive: never = s;  // ошибка компиляции, если забыли вариант
      return _exhaustive;
    }
  }
}
\`\`\`

Почему работает: если все варианты разобраны, до \`default\` доходит только \`never\` — и присваивание законно. Забыли вариант — в \`default\` приходит реальный объект, а его в \`never\` присвоить нельзя.

## Почему это сильный приём

- **Невалидные состояния становятся невыразимыми.** Нельзя случайно создать «загрузка завершена, но данных нет, и ошибка тоже есть».
- **Рефакторинг безопасен**: добавили вариант — компилятор подсветил все места, где его надо обработать.
- **Проще, чем иерархия классов**: данные плоские, сериализуются в JSON, работают через границу сети.

Классическое применение — состояние UI: \`{ status: 'loading' } | { status: 'success', data } | { status: 'error', error }\`. И, конечно, экшены в Redux/NgRx.

## Что сказать на собеседовании

> Discriminated union — это объединение объектных типов с общим литеральным полем-дискриминантом. По значению этого поля TypeScript автоматически сужает тип до конкретного члена union, поэтому внутри ветки доступны именно его поля и никаких приведений не нужно. Чтобы гарантировать обработку всех вариантов, в ветку \`default\` добавляют присваивание в переменную типа \`never\`: если все случаи разобраны, туда приходит \`never\` и код компилируется, а если в union добавили новый вариант — получаем ошибку компиляции. Это делает рефакторинг безопасным: невалидные состояния становятся невыразимы.

## Ловушки

- **Дискриминант должен быть литеральным типом.** Если написать \`kind: string\`, сужение не заработает. В объектах-литералах помогает \`as const\`.
- **\`Omit\` разрушает дискриминируемость** — union схлопнется в один объект. Нужен дистрибутивный вариант через \`T extends any ? Omit<T, K> : never\`.
- **Возвращать значение из \`default\` обязательно** — иначе при включённом \`noImplicitReturns\` будет другая ошибка, маскирующая настоящую.
- **Опциональные поля вместо union — антипаттерн**: \`{ loading?: boolean; data?: T; error?: E }\` допускает бессмысленные комбинации, и компилятор их не поймает.
- Тот же приём с \`never\` работает не только в \`switch\`, но и в цепочке \`if/else if\`.`,
      en: `## In short

**A discriminated union is a union of objects that share one tag field** (\`kind\`, \`type\`, \`status\`) with a literal value. Check the tag and the compiler knows exactly which variant you're holding.

The analogy: parcels in a warehouse. Each has a label — "fragile", "food", "documents". Read the label and you know what's inside and what to do with it.

\`\`\`ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rect'; w: number; h: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2; // radius exists here
    case 'square': return s.side ** 2;             // side exists here
    case 'rect':   return s.w * s.h;
  }
}
\`\`\`

Note: **no \`as\` casts and no undefined checks**. The compiler knows which fields are available in each branch.

## Exhaustiveness checking

The problem: six months later someone adds \`{ kind: 'triangle' }\` and forgets the handler. You want the code to **stop compiling** rather than quietly return \`undefined\`.

The trick: in the \`default\` branch, assign the value to a variable typed \`never\`.

\`\`\`ts
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.side ** 2;
    case 'rect':   return s.w * s.h;
    default: {
      const _exhaustive: never = s;  // compile error if a variant is missed
      return _exhaustive;
    }
  }
}
\`\`\`

Why it works: if every variant is handled, only \`never\` can reach \`default\`, and the assignment is legal. Miss one and a real object arrives, which can't be assigned to \`never\`.

## Why the pattern is powerful

- **Invalid states become unrepresentable.** You can't accidentally build "loading finished, but there's no data and also an error".
- **Refactoring is safe**: add a variant and the compiler flags every place that must handle it.
- **Simpler than a class hierarchy**: the data is flat, serialises to JSON and travels across the network.

The classic use is UI state: \`{ status: 'loading' } | { status: 'success', data } | { status: 'error', error }\`. And, of course, Redux/NgRx actions.

## What to say in the interview

> A discriminated union is a union of object types sharing a common literal discriminant field. By the value of that field TypeScript automatically narrows to the specific member, so inside a branch exactly its fields are available and no casts are needed. To guarantee every variant is handled, the \`default\` branch assigns the value to a \`never\`-typed variable: if all cases are covered, only \`never\` reaches it and the code compiles, but adding a new variant produces a compile error. That makes refactoring safe and lets you model states so that invalid combinations are simply inexpressible — the canonical example being data loading: loading, success with data, error with a reason.

## Gotchas

- **The discriminant must be a literal type.** Write \`kind: string\` and narrowing stops working. For object literals, \`as const\` helps.
- **\`Omit\` destroys discriminability** — the union collapses into a single object. You need the distributive variant, \`T extends any ? Omit<T, K> : never\`.
- **You must return from \`default\`** — otherwise \`noImplicitReturns\` produces a different error that masks the real one.
- **Optional fields instead of a union are an anti-pattern**: \`{ loading?: boolean; data?: T; error?: E }\` permits nonsensical combinations that the compiler can't catch.
- The same \`never\` trick works in an \`if/else if\` chain, not just in a \`switch\`.`
    },
    codeSnippet: `type Remote<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

function render(s: Remote<string[]>): string {
  switch (s.status) {
    case 'idle':    return 'Press load';
    case 'loading': return 'Spinner...';
    case 'success': return s.data.join(', '); // s.data is available here
    case 'error':   return s.message;          // s.message is available here
  }
}`
  },
  {
    id: 'jsts-025',
    category: 'typescript',
    level: 'Hard',
    tags: ['satisfies', 'type-inference', 'const-assertion'],
    question: {
      ru: 'Что делает оператор `satisfies` и чем он отличается от аннотации типа и `as`?',
      en: 'What does the `satisfies` operator do and how does it differ from a type annotation and `as`?'
    },
    answer: {
      ru: `## Коротко

Три способа связать значение с типом — и все три делают разное:

- **\`const x: T = {...}\`** — проверит **и заменит** выведенный тип на \`T\`. Точность теряется.
- **\`{...} as T\`** — ничего толком не проверит, просто **навяжет** тип. Опасно.
- **\`{...} satisfies T\`** — **проверит и оставит** ваш точный выведенный тип. То, что нужно почти всегда.

Формула: **\`satisfies\` = «проверь, но не порти мой тип».**

## Пример, где разница видна сразу

\`\`\`ts
type Color = 'red' | 'green' | 'blue';

// 1. Аннотация — потеряли конкретику
const a: Record<string, Color> = { primary: 'red', accent: 'green' };
a.primary;        // тип Color, а не 'red'
a.whatever;       // ошибки нет — ключ-то string!

// 2. satisfies — и проверка, и точность
const b = {
  primary: 'red',
  accent: 'green',
} satisfies Record<string, Color>;

b.primary;        // тип 'red' — литерал сохранён
b.whatever;       // ошибка: такого ключа нет
\`\`\`

Разница в двух местах: значение осталось литералом \`'red'\`, и набор ключей известен точно.

## Когда что использовать

- **\`satisfies\`** — конфиги, словари, палитры тем, карты роутов, маппинги экшенов. Везде, где нужны и валидация формы, и точные ключи/значения.
- **\`as const satisfies T\`** — самая сильная связка: \`as const\` делает всё максимально узким и \`readonly\`, а \`satisfies\` проверяет форму.
- **Аннотация \`: T\`** — когда точность не нужна и хочется, чтобы тип переменной был именно \`T\` (например, публичное API).
- **\`as T\`** — только в крайних случаях, когда вы действительно знаете больше компилятора и это невозможно доказать.

## Что сказать на собеседовании

> \`satisfies\` появился в TypeScript 4.9 и решает конфликт между проверкой и точностью вывода. Аннотация типа проверяет значение, но расширяет его тип до объявленного, из-за чего теряются литеральные типы и точный набор ключей. \`as\` — утверждение, а не проверка. \`satisfies\` проверяет, что выражение присваиваемо к типу, но оставляет самый узкий выведенный тип. Практически это идеально для конфигов: форма валидируется, но сохраняются литеральные значения и конкретные ключи, а опечатка в ключе становится ошибкой компиляции. Часто используется в связке \`as const satisfies T\`.

## Ловушки

- **Порядок важен**: \`as const satisfies T\`, а не наоборот. Сначала фиксируем литералы, потом проверяем форму.
- \`satisfies\` **не меняет тип переменной**, поэтому если вам нужно именно \`T\` в сигнатуре — используйте аннотацию.
- **\`as\` умеет проверять только «родственные» типы.** Между совсем несвязанными он потребует \`as unknown as T\` — и это отличный сигнал, что вы делаете что-то не то.
- \`as const\` даёт \`readonly\`-свойства. Если объект потом мутируют, будет ошибка — и обычно это правильно.
- В старых версиях TypeScript (до 4.9) \`satisfies\` нет — на проекте с древней версией придётся обходиться дженерик-функцией-хелпером.`,
      en: `## In short

Three ways to tie a value to a type — and all three do something different:

- **\`const x: T = {...}\`** — checks **and replaces** the inferred type with \`T\`. Precision is lost.
- **\`{...} as T\`** — checks almost nothing, just **forces** the type. Dangerous.
- **\`{...} satisfies T\`** — **checks and keeps** your precise inferred type. What you want almost every time.

The formula: **\`satisfies\` = "check it, but don't ruin my type".**

## An example where the difference is immediately visible

\`\`\`ts
type Color = 'red' | 'green' | 'blue';

// 1. Annotation — precision lost
const a: Record<string, Color> = { primary: 'red', accent: 'green' };
a.primary;        // type Color, not 'red'
a.whatever;       // no error — the key is just a string!

// 2. satisfies — checked and precise
const b = {
  primary: 'red',
  accent: 'green',
} satisfies Record<string, Color>;

b.primary;        // type 'red' — the literal is preserved
b.whatever;       // error: no such key
\`\`\`

The difference shows in two places: the value stays the literal \`'red'\`, and the exact set of keys is known.

## When to use what

- **\`satisfies\`** — configs, dictionaries, theme palettes, route maps, action maps. Anywhere you need both shape validation and exact keys and values.
- **\`as const satisfies T\`** — the strongest combination: \`as const\` makes everything as narrow and \`readonly\` as possible, \`satisfies\` validates the shape.
- **The annotation \`: T\`** — when precision doesn't matter and you want the variable's type to actually be \`T\` (a public API, for instance).
- **\`as T\`** — only as a last resort, when you genuinely know more than the compiler and can't prove it.

## What to say in the interview

> \`satisfies\` arrived in TypeScript 4.9 and resolves the conflict between checking and inference precision. A type annotation checks the value but widens its type to the declared one, so literal types and the exact set of keys are lost. \`as\` does the opposite and checks almost nothing — it's an assertion, not a check. \`satisfies\` verifies that the expression is assignable to the type while keeping the narrowest inferred type. In practice that's ideal for configs and dictionaries: the shape is validated, but literal values and concrete keys are preserved, and an extra or misspelled key becomes a compile error. It's often used in the combination \`as const satisfies T\`.

## Gotchas

- **Order matters**: \`as const satisfies T\`, not the other way round. Freeze the literals first, then validate the shape.
- \`satisfies\` **doesn't change the variable's type**, so if you need the variable to actually be \`T\`, use an annotation.
- **\`as\` can only cast between "related" types.** For entirely unrelated ones it demands \`as unknown as T\` — an excellent signal that you're doing something wrong.
- \`as const\` produces \`readonly\` properties. If the object is mutated later you get an error — and usually that's correct.
- In older TypeScript (before 4.9) there's no \`satisfies\`; on an ancient project you have to fake it with a generic helper function.`
    }
  },
  {
    id: 'jsts-026',
    category: 'typescript',
    level: 'Hard',
    tags: ['declaration-merging', 'module-augmentation', 'interfaces'],
    question: {
      ru: 'Что такое declaration merging и module augmentation в TypeScript? Где это применяется?',
      en: 'What is declaration merging and module augmentation in TypeScript? Where is it used?'
    },
    answer: {
      ru: `## Коротко

**Declaration merging — это когда два объявления с одинаковым именем склеиваются в одно.**

Объявили \`interface User\` дважды — TypeScript не ругается, а просто складывает поля вместе. Это не баг, а специально сделанная возможность.

\`\`\`ts
interface User { id: number; }
interface User { name: string; }

const u: User = { id: 1, name: 'Ann' };  // нужны оба поля
\`\`\`

**Module augmentation — это то же самое, но применённое к чужому модулю.** Способ добавить свойство в типы сторонней библиотеки, не трогая её исходники.

## Что сливается, а что нет

Сливается:

- **interface + interface** — поля объединяются.
- **namespace + namespace** — члены объединяются.
- **namespace + функция / класс / enum** — так добавляют статические свойства и вложенные типы.
- **enum + enum**.

**Не сливается**: \`type\`-алиасы. Второй \`type User = ...\` — сразу ошибка «Duplicate identifier». Это, кстати, главный практический ответ на вопрос «чем \`interface\` отличается от \`type\`».

## Как расширить чужие типы

\`\`\`ts
// Глобальный объект
declare global {
  interface Window { __APP_VERSION__: string; }
}

// Модуль сторонней библиотеки
import 'express';
declare module 'express' {
  interface Request { userId?: string; }
}

export {};   // важно: файл должен быть модулем
\`\`\`

Типичные места, где это встречается:

- добавить поле в \`Request\` у Express или в \`ComponentCustomProperties\` у Vue;
- расширить \`Window\`, \`globalThis\`, \`ProcessEnv\` под переменные окружения;
- описать типы для пакета, у которого их нет вообще (ambient-объявление).

## Что сказать на собеседовании

> Declaration merging — способность TypeScript объединять несколько объявлений с одним именем в одну сущность. Сливаются интерфейсы, namespace между собой и с функциями, классами и enum; type-алиасы не сливаются, и это ключевое практическое различие между \`interface\` и \`type\`. Module augmentation — применение того же механизма к внешнему модулю через \`declare module\`: так добавляют поля в типы сторонних библиотек, например \`userId\` в \`Request\` Express. Важное требование — файл с аугментацией должен быть модулем, то есть содержать импорт или экспорт, иначе \`declare module\` объявит новый ambient-модуль.

## Ловушки

- **Забыли \`export {}\`** — и вместо расширения существующего модуля вы объявили новый пустой модуль с тем же именем. Ошибка, на которой теряют часы.
- **Конфликтующие поля дают ошибку компиляции**: нельзя объявить \`id: number\` в одном интерфейсе и \`id: string\` в другом. Это защита, а не ограничение.
- **Порядок объявления влияет на перегрузки**: при слиянии интерфейсов более поздние объявления идут раньше в списке перегрузок.
- **Расширение глобальных типов — это на весь проект.** Добавили \`Window.foo\` — компилятор перестанет ловить опечатки в других местах.
- \`namespace\` в современном коде почти не используют — модули заменили его. Знать про слияние стоит для чтения старого кода и \`.d.ts\`-файлов.`,
      en: `## In short

**Declaration merging is when two declarations with the same name are glued into one.**

Declare \`interface User\` twice and TypeScript doesn't complain — it simply combines the fields. That's not a bug, it's a deliberate feature.

\`\`\`ts
interface User { id: number; }
interface User { name: string; }

const u: User = { id: 1, name: 'Ann' };  // both fields required
\`\`\`

**Module augmentation is the same thing applied to somebody else's module.** It's how you add a property to a third-party library's types without touching its source.

## What merges and what doesn't

Merges:

- **interface + interface** — fields are combined.
- **namespace + namespace** — members are combined.
- **namespace + function / class / enum** — this is how static properties and nested types are added.
- **enum + enum**.

**Doesn't merge**: \`type\` aliases. A second \`type User = ...\` is an immediate "Duplicate identifier" error. This, incidentally, is the main practical answer to "what's the difference between \`interface\` and \`type\`".

## How to extend someone else's types

\`\`\`ts
// The global object
declare global {
  interface Window { __APP_VERSION__: string; }
}

// A third-party library module
import 'express';
declare module 'express' {
  interface Request { userId?: string; }
}

export {};   // important: the file must be a module
\`\`\`

Typical places you meet this:

- adding a field to Express's \`Request\` or Vue's \`ComponentCustomProperties\`;
- extending \`Window\`, \`globalThis\` or \`ProcessEnv\` for environment variables;
- declaring types for a package that ships none (an ambient declaration).

## What to say in the interview

> Declaration merging is TypeScript's ability to combine several declarations of the same name into one entity. Interfaces merge, namespaces merge with each other and with functions, classes and enums; type aliases don't merge, and that's the key practical difference between \`interface\` and \`type\`. Module augmentation applies the same mechanism to an external module via \`declare module\`: that's how fields are added to third-party types, for example \`userId\` on Express's \`Request\`, or how the global \`Window\` is extended. An important requirement is that the augmenting file must be a module — it needs an import or export — otherwise \`declare module\` is treated as declaring a new ambient module. It should be used sparingly: extending global types makes code harder to reason about.

## Gotchas

- **Forgetting \`export {}\`** means that instead of augmenting an existing module you declared a brand-new empty one with the same name. An error that costs hours.
- **Conflicting fields are a compile error**: you can't declare \`id: number\` in one interface and \`id: string\` in another. That's protection, not a limitation.
- **Declaration order affects overloads**: when interfaces merge, later declarations come earlier in the overload list.
- **Extending global types affects the whole project.** Add \`Window.foo\` and the compiler stops catching typos elsewhere.
- \`namespace\` is barely used in modern code — modules replaced it. Merging is worth knowing for reading legacy code and \`.d.ts\` files.`
    },
    codeSnippet: `// namespace + function merging: add static-like members and nested types
function api(path: string) { return fetch(path); }
namespace api {
  export const base = '/v1';
  export interface Options { retries: number; }
}
api('/users');
api.base;             // '/v1'
const o: api.Options = { retries: 3 };`
  },
  {
    id: 'jsts-027',
    category: 'typescript',
    level: 'Expert',
    tags: ['decorators', 'tc39-decorators', 'metadata'],
    question: {
      ru: 'Чем отличаются «старые» декораторы TS (experimentalDecorators) от стандарта TC39 Stage 3?',
      en: 'How do the "legacy" TS decorators (experimentalDecorators) differ from the TC39 Stage 3 standard?'
    },
    answer: {
      ru: `## Коротко

Декоратор — это функция-обёртка, которую вешают на класс, метод или поле, чтобы что-то к ним добавить.

Проблема в том, что **сейчас существуют две несовместимые версии декораторов**:

- **Legacy** — старый черновик, включается флагом \`experimentalDecorators\`. На нём живут Angular, NestJS, TypeORM.
- **TC39 Stage 3** — новый стандарт, работает в TS 5.0+ **без флага**, скоро войдёт в сам JavaScript.

Различаются они прежде всего **сигнатурой**: что именно приходит в декоратор аргументами.

## Legacy: три позиционных аргумента

\`\`\`ts
function Log(target: any, key: string, desc: PropertyDescriptor) {
  const orig = desc.value;
  desc.value = function (...a: any[]) {
    console.log(key, a);
    return orig.apply(this, a);
  };
}
\`\`\`

Две вещи, которые есть только здесь и очень важны:

1. **Декораторы параметров** — \`constructor(@Inject(TOKEN) dep)\`. В новом стандарте их пока нет.
2. **Эмиссия метаданных типов**: с \`emitDecoratorMetadata\` и \`reflect-metadata\` компилятор записывает в рантайм типы параметров конструктора (\`design:paramtypes\`). **На этом построен DI в Angular и Nest** — иначе фреймворк не знал бы, какой сервис подставить.

## TC39: значение + контекст

\`\`\`ts
function log(orig: any, ctx: ClassMethodDecoratorContext) {
  return function (this: any, ...args: any[]) {
    console.log(ctx.name, args);
    return orig.call(this, ...args);
  };
}
\`\`\`

Здесь всего два аргумента: **декорируемое значение** и **контекст**. В контексте лежат \`kind\` (метод, поле, геттер...), \`name\`, флаги \`static\`/\`private\` и метод \`addInitializer\` для кода, выполняемого при создании экземпляра.

Чего пока нет: декораторов параметров и встроенных метаданных о типах (для этого идёт отдельный proposal \`Symbol.metadata\`).

## Что сказать на собеседовании

> Сейчас сосуществуют два несовместимых дизайна декораторов. Legacy включается флагом \`experimentalDecorators\` и основан на раннем черновике: декоратор метода получает \`target\`, \`propertyKey\` и дескриптор, поддерживаются декораторы параметров, а вместе с \`emitDecoratorMetadata\` и \`reflect-metadata\` в рантайм эмитятся типы. Именно на этом построен DI в Angular и NestJS. Стандартные декораторы TC39 Stage 3 доступны с TypeScript 5.0 без флага: декоратор получает значение и объект контекста с \`kind\`, \`name\` и \`addInitializer\`. Смешивать две системы в одном проекте нельзя — флаг переключает семантику целиком.

## Ловушки

- **Смешать нельзя.** Флаг \`experimentalDecorators\` переключает семантику для всего проекта. Миграция — это переписывание всех сигнатур декораторов.
- **Angular исторически завязан на legacy** из-за \`emitDecoratorMetadata\`; в новых версиях фреймворк уходит от декораторов в сторону функций вроде \`inject()\`, \`input()\`, \`signal()\`.
- **\`reflect-metadata\` — это не часть языка**, а полифилл-библиотека. Забыли импортировать в точке входа — DI ломается с невнятной ошибкой.
- **Декораторы полей в двух системах ведут себя по-разному** относительно момента инициализации — код почти никогда не переносится копипастой.
- Декоратор **выполняется один раз при объявлении класса**, а не при каждом вызове метода. Частая ошибка — положить туда логику «на каждый вызов».`,
      en: `## In short

A decorator is a wrapper function you attach to a class, method or field to add something to it.

The problem is that **two incompatible versions of decorators currently exist**:

- **Legacy** — the old draft, enabled by the \`experimentalDecorators\` flag. Angular, NestJS and TypeORM live on it.
- **TC39 Stage 3** — the new standard, available in TS 5.0+ **without any flag**, and soon part of JavaScript itself.

They differ primarily in **the signature**: what exactly arrives as arguments.

## Legacy: three positional arguments

\`\`\`ts
function Log(target: any, key: string, desc: PropertyDescriptor) {
  const orig = desc.value;
  desc.value = function (...a: any[]) {
    console.log(key, a);
    return orig.apply(this, a);
  };
}
\`\`\`

Two things exist only here, and they matter a lot:

1. **Parameter decorators** — \`constructor(@Inject(TOKEN) dep)\`. The new standard doesn't have them yet.
2. **Type metadata emission**: with \`emitDecoratorMetadata\` and \`reflect-metadata\`, the compiler writes constructor parameter types into the runtime (\`design:paramtypes\`). **That's what DI in Angular and Nest is built on** — otherwise the framework wouldn't know which service to inject.

## TC39: value plus context

\`\`\`ts
function log(orig: any, ctx: ClassMethodDecoratorContext) {
  return function (this: any, ...args: any[]) {
    console.log(ctx.name, args);
    return orig.call(this, ...args);
  };
}
\`\`\`

Only two arguments here: **the decorated value** and **the context**. The context holds \`kind\` (method, field, getter…), \`name\`, the \`static\`/\`private\` flags and an \`addInitializer\` method for code that runs on instance creation.

What's missing so far: parameter decorators and built-in type metadata (a separate \`Symbol.metadata\` proposal covers that).

## What to say in the interview

> Two incompatible decorator designs coexist today. The legacy one is enabled by \`experimentalDecorators\` and is based on the early draft: a method decorator receives \`target\`, \`propertyKey\` and a descriptor, parameter decorators are supported, and together with \`emitDecoratorMetadata\` and \`reflect-metadata\` the types are emitted into the runtime as \`design:type\` and \`design:paramtypes\`. That's exactly what DI in Angular and NestJS relies on. The standard TC39 Stage 3 decorators are available from TypeScript 5.0 without a flag: a decorator receives the decorated value and a context object with \`kind\`, \`name\`, \`addInitializer\` and access flags. They don't yet have parameter decorators or type-metadata emission. The two systems can't be mixed in one project — the flag switches the semantics wholesale.

## Gotchas

- **They can't be mixed.** \`experimentalDecorators\` switches semantics for the entire project. Migrating means rewriting every decorator signature.
- **Angular has historically depended on legacy** because of \`emitDecoratorMetadata\`; newer versions move away from decorators towards functions like \`inject()\`, \`input()\` and \`signal()\`.
- **\`reflect-metadata\` isn't part of the language**, it's a polyfill library. Forget to import it at the entry point and DI breaks with a cryptic error.
- **Field decorators behave differently** in the two systems with respect to initialisation timing — the code almost never ports by copy-paste.
- A decorator **runs once when the class is declared**, not on every method call. A common mistake is putting per-call logic in there.`
    }
  },
  {
    id: 'jsts-028',
    category: 'typescript',
    level: 'Hard',
    tags: ['const-type-parameters', 'inference', 'literals'],
    question: {
      ru: 'Что такое `const`-параметры типа (TS 5.0)? Какую проблему вывода они решают?',
      en: 'What are `const` type parameters (TS 5.0)? Which inference problem do they solve?'
    },
    answer: {
      ru: `## Коротко

Проблема: TypeScript при выводе дженерика **расширяет** литералы. Передали \`['a', 'b']\` — получили \`string[]\`, а не \`['a', 'b']\`. Конкретика потеряна.

\`\`\`ts
function id<T>(x: T): T { return x; }
const r = id(['a', 'b']);   // T = string[], а хотелось ['a', 'b']
\`\`\`

Раньше это чинилось только на **стороне вызова**: \`id(['a', 'b'] as const)\`. Неудобно — про \`as const\` должен помнить каждый пользователь вашей функции.

**\`const\`-параметр типа (TS 5.0) переносит эту заботу в объявление функции.** Пишете \`<const T>\` — и компилятор выводит \`T\` так, будто аргумент помечен \`as const\`.

\`\`\`ts
function asTuple<const T>(x: T): T { return x; }

const a = asTuple(['a', 'b']);   // readonly ['a', 'b']
const o = asTuple({ k: 1 });     // { readonly k: 1 }
\`\`\`

## Что конкретно меняется

- Строковые и числовые литералы **остаются литералами**: \`'a'\` не превращается в \`string\`.
- Массив становится **readonly-кортежем**, а не просто массивом.
- У объектов свойства получают \`readonly\` и литеральные типы значений.

## Где это нужно на практике

Везде, где библиотека хочет **вывести типы из того, что ей передали**:

- билдеры роутов: из \`['users', ':id']\` вывести тип параметра;
- схемы валидации и формы: точный список полей;
- \`createStore\`-подобные API, где ключи конфига становятся типами;
- любые типобезопасные DSL.

Смысл — **убрать \`as const\` из кода потребителя**, оставив ему обычный литерал.

## Что сказать на собеседовании

> По умолчанию при выводе дженерика TypeScript расширяет литеральные типы: \`'a'\` становится \`string\`, а массив литералов — обычным массивом. Раньше это лечили \`as const\` на стороне вызова, что перекладывало бойлерплейт на пользователя API. \`const\`-параметры типа из TypeScript 5.0 позволяют объявить \`<const T>\` в сигнатуре, и тогда компилятор выводит тип так, как будто аргумент помечен \`as const\`: литералы не расширяются, массивы становятся readonly-кортежами, объекты — readonly-объектами. Работает это только на выводе — при явно указанном типе эффекта нет, и на рантайм не влияет.

## Ловушки

- **Влияет только на вывод.** Если вызвать \`asTuple<string[]>(['a'])\` с явным типом, \`const\` ничего не даст.
- **Не делает объект иммутабельным в рантайме.** \`readonly\` — это только про типы, \`Object.freeze\` не вызывается.
- **Не «достаёт» уже расширенное значение.** Если сначала записать \`const arr = ['a', 'b']\` (тип уже \`string[]\`), а потом передать \`arr\`, то \`const T\` не поможет — расширение случилось раньше.
- **\`readonly\`-результат может не подойти** там, где ожидается изменяемый массив: понадобится \`[...result]\`.
- Не путайте \`<const T>\` (параметр типа) и \`as const\` (assertion в значении) — они решают одну задачу с разных сторон.`,
      en: `## In short

The problem: when inferring a generic, TypeScript **widens** literals. Pass \`['a', 'b']\` and you get \`string[]\`, not \`['a', 'b']\`. The precision is gone.

\`\`\`ts
function id<T>(x: T): T { return x; }
const r = id(['a', 'b']);   // T = string[], but we wanted ['a', 'b']
\`\`\`

Previously this could only be fixed **at the call site**: \`id(['a', 'b'] as const)\`. That's awkward — every consumer of your function has to remember \`as const\`.

**A \`const\` type parameter (TS 5.0) moves that burden into the declaration.** Write \`<const T>\` and the compiler infers \`T\` as if the argument were marked \`as const\`.

\`\`\`ts
function asTuple<const T>(x: T): T { return x; }

const a = asTuple(['a', 'b']);   // readonly ['a', 'b']
const o = asTuple({ k: 1 });     // { readonly k: 1 }
\`\`\`

## What exactly changes

- String and number literals **stay literals**: \`'a'\` doesn't become \`string\`.
- An array becomes a **readonly tuple**, not just an array.
- Object properties get \`readonly\` and literal value types.

## Where you need it in practice

Anywhere a library wants to **derive types from what it was given**:

- route builders: infer the parameter type from \`['users', ':id']\`;
- validation schemas and forms: the exact list of fields;
- \`createStore\`-style APIs where config keys become types;
- any type-safe DSL.

The point is to **remove \`as const\` from the consumer's code** and let them pass a plain literal.

## What to say in the interview

> By default, when inferring a generic TypeScript widens literal types: \`'a'\` becomes \`string\` and an array of literals becomes a plain array. Avoiding that used to require \`as const\` at the call site, pushing boilerplate onto the API's users. \`const\` type parameters, added in TypeScript 5.0, let you declare \`<const T>\` in the signature so the compiler infers the type as if the argument were marked \`as const\`: literals aren't widened, arrays become readonly tuples and objects get readonly properties with literal value types. It only affects inference — with an explicit type argument it has no effect — and it has no runtime impact, the value remains an ordinary mutable object.

## Gotchas

- **It only affects inference.** Calling \`asTuple<string[]>(['a'])\` with an explicit type argument makes \`const\` irrelevant.
- **It doesn't make the object immutable at runtime.** \`readonly\` is types-only; no \`Object.freeze\` happens.
- **It can't "reach into" an already-widened value.** If you first write \`const arr = ['a', 'b']\` (already \`string[]\`) and then pass \`arr\`, \`const T\` won't help — the widening happened earlier.
- **A \`readonly\` result may not fit** where a mutable array is expected: you'll need \`[...result]\`.
- Don't confuse \`<const T>\` (a type parameter) with \`as const\` (an assertion on a value) — they solve the same problem from opposite ends.`
    }
  },
  {
    id: 'jsts-029',
    category: 'typescript',
    level: 'Hard',
    tags: ['structural-typing', 'nominal-typing', 'branding'],
    question: {
      ru: 'Что такое структурная типизация в TypeScript? Как сэмулировать номинальную типизацию (branding)?',
      en: 'What is structural typing in TypeScript? How do you emulate nominal typing (branding)?'
    },
    answer: {
      ru: `## Коротко

**TypeScript смотрит не на название типа, а на его форму.** Если у объекта есть все нужные поля — он подходит, даже если объявлен совсем другим классом или интерфейсом.

Это называется структурной («утиной») типизацией: «если крякает как утка — значит утка».

\`\`\`ts
interface Point { x: number; y: number; }
class Vec { constructor(public x: number, public y: number) {} }

const p: Point = new Vec(1, 2);  // ок — форма совпадает
\`\`\`

Противоположность — **номинальная** типизация (Java, C#), где важно именно имя типа. В TypeScript её нет.

## В чём риск

Разные по смыслу вещи с одинаковой формой становятся **взаимозаменяемыми**:

\`\`\`ts
type UserId = string;
type OrderId = string;

function loadUser(id: UserId) {}
loadUser(orderId);   // компилируется! Оба ведь просто string
\`\`\`

Так уезжают в прод баги «передали не тот идентификатор».

## Branding — как подделать номинальную типизацию

Идея: добавить в тип **фантомное поле-метку**, которого в рантайме не существует. Тогда две строки перестанут быть взаимозаменяемыми для компилятора.

\`\`\`ts
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

type UserId  = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

// единственная контролируемая точка создания
const makeUserId = (s: string) => s as UserId;

function load(id: UserId) { /* ... */ }

load(makeUserId('u1'));   // ок
load('u1');               // ошибка — просто строка не подойдёт
\`\`\`

В рантайме это обычная строка — никакого оверхеда. Вся защита живёт только на этапе компиляции.

## Бонус: excess property checks

Отдельная особенность, которая часто удивляет. Форму проверяют структурно, **но литерал объекта** дополнительно проверяется на «лишние» свойства:

\`\`\`ts
interface Opts { a: number }

const x: Opts = { a: 1, b: 2 };      // ошибка: лишнее свойство b
const tmp = { a: 1, b: 2 };
const y: Opts = tmp;                 // а так — ок!
\`\`\`

Это специальная защита от опечаток именно в литералах, поверх обычной структурной совместимости.

## Что сказать на собеседовании

> TypeScript использует структурную типизацию: совместимость определяется формой типа, а не его именем. Поэтому объект другого класса подходит там, где ждут интерфейс той же формы. Это удобно, но не различает семантически разные типы одной формы — \`UserId\` и \`OrderId\`, если оба просто \`string\`. Номинальную типизацию эмулируют брендированием: к типу добавляют фантомное поле-маркер с ключом \`unique symbol\`, а значения создают только через контролируемый конструктор с \`as\`. В рантайме это остаётся обычной строкой, вся проверка происходит на этапе компиляции.

## Ловушки

- **Классы тоже структурны.** \`private\`-поля — единственное, что делает класс «номинальным»: класс с приватным полем несовместим с любым другим.
- **Лишние свойства проверяются только у литералов.** Именно поэтому «в объекте ругается, а в переменной нет» — и это не баг.
- **Бренд требует дисциплины**: если разрешить \`value as UserId\` где попало, защита теряет смысл. Конструктор должен быть один и с валидацией.
- **Опциональные поля ослабляют проверку**: тип с одними опциональными полями совместим почти со всем.
- Пустой интерфейс \`{}\` совместим **почти с любым значением**, кроме \`null\` и \`undefined\`. Использовать его как «объект» — ошибка, для этого есть \`Record<string, unknown>\`.`,
      en: `## In short

**TypeScript looks at a type's shape, not its name.** If an object has all the required fields, it fits — even if it was declared as a completely different class or interface.

This is called structural ("duck") typing: "if it quacks like a duck, it's a duck".

\`\`\`ts
interface Point { x: number; y: number; }
class Vec { constructor(public x: number, public y: number) {} }

const p: Point = new Vec(1, 2);  // ok — the shape matches
\`\`\`

The opposite is **nominal** typing (Java, C#), where the type's name is what counts. TypeScript doesn't have it.

## Where the risk is

Semantically different things with the same shape become **interchangeable**:

\`\`\`ts
type UserId = string;
type OrderId = string;

function loadUser(id: UserId) {}
loadUser(orderId);   // compiles! both are just strings
\`\`\`

That's how "passed the wrong identifier" bugs reach production.

## Branding — faking nominal typing

The idea: add a **phantom marker field** to the type that doesn't exist at runtime. Then two strings stop being interchangeable as far as the compiler is concerned.

\`\`\`ts
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

type UserId  = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

// the single controlled point of creation
const makeUserId = (s: string) => s as UserId;

function load(id: UserId) { /* ... */ }

load(makeUserId('u1'));   // ok
load('u1');               // error — a plain string won't do
\`\`\`

At runtime it's an ordinary string — zero overhead. All the protection lives at compile time.

## Bonus: excess property checks

A separate quirk that often surprises people. The shape is checked structurally, **but an object literal** additionally gets checked for "excess" properties:

\`\`\`ts
interface Opts { a: number }

const x: Opts = { a: 1, b: 2 };      // error: excess property b
const tmp = { a: 1, b: 2 };
const y: Opts = tmp;                 // this is fine!
\`\`\`

It's a special guard against typos in literals, layered on top of normal structural compatibility.

## What to say in the interview

> TypeScript uses structural typing: compatibility is determined by the type's shape — its set of members and their types — not by its name. So an object of a different class fits where an interface is expected, as long as the structure matches. That's convenient for interop but it loses the distinction between semantically different types with the same shape, such as \`UserId\` and \`OrderId\` when both are just \`string\`. Nominal typing is emulated by branding: you add a phantom marker field, usually with a \`unique symbol\` key, and only create values through a controlled constructor with \`as\`. At runtime it stays a plain string; all checking happens at compile time. A separate detail of the structural system is excess property checks: assigning an object literal, TypeScript also complains about extra properties, though going through an intermediate variable bypasses that check.

## Gotchas

- **Classes are structural too.** A \`private\` field is the only thing that makes a class "nominal": a class with a private field is incompatible with any other.
- **Excess properties are only checked on literals.** That's why "the object literal errors but the variable doesn't" — and it isn't a bug.
- **Branding requires discipline**: if \`value as UserId\` is allowed everywhere, the protection is meaningless. There should be one constructor, with validation.
- **Optional fields weaken checking**: a type made only of optional fields is compatible with almost anything.
- An empty interface \`{}\` is compatible with **almost any value** except \`null\` and \`undefined\`. Using it to mean "an object" is a mistake — that's what \`Record<string, unknown>\` is for.`
    }
  },
  {
    id: 'jsts-030',
    category: 'js-state',
    level: 'Medium',
    tags: ['promises', 'async-await', 'microtasks'],
    question: {
      ru: 'Как async/await транслируется в промисы и как взаимодействует с очередью микрозадач?',
      en: 'How does async/await translate to promises and interact with the microtask queue?'
    },
    answer: {
      ru: `## Коротко

**async/await — это не новый механизм, а красивая обёртка над промисами.**

Два правила, из которых следует всё остальное:

1. **\`async\`-функция всегда возвращает промис.** Даже если внутри \`return 5\` — наружу выйдет \`Promise<number>\`.
2. **\`await\` — это \`.then()\`.** Он ставит функцию на паузу, а весь код после него превращается в **микрозадачу**.

Аналогия: \`await\` — это закладка в книге. Дошли до неё — отложили книгу, занялись другими делами, потом вернулись ровно на то же место.

## Почему код после await всегда «опаздывает»

\`\`\`js
async function f() {
  console.log('A');
  await null;          // даже await от НЕ промиса откладывает продолжение
  console.log('B');
}

console.log('1');
f();
console.log('2');
// Выведет: 1, A, 2, B
\`\`\`

Разбор: \`1\` синхронно → вызвали \`f()\`, она синхронно печатает \`A\` → дошли до \`await\`, функция замерла, управление вернулось наружу → \`2\` синхронно → синхронный код кончился, разгребаем микрозадачи → \`B\`.

Ключевой момент: **\`await null\` тоже откладывает**. Значение оборачивается в \`Promise.resolve()\`, а продолжение всегда уходит в очередь микрозадач.

## Ошибки

Всё, что бросается внутри \`async\`-функции, превращается в **отклонённый промис**. И наоборот — \`await\` от отклонённого промиса бросает исключение, которое ловится обычным \`try/catch\`:

\`\`\`js
try {
  const data = await fetchUser();
} catch (e) {
  // сюда попадёт и сетевая ошибка, и throw внутри
}
\`\`\`

## Последовательно или параллельно — самая частая ошибка

\`\`\`js
// Последовательно: 2 секунды, если каждый запрос по секунде
const a = await fetchA();
const b = await fetchB();

// Параллельно: 1 секунда
const [a2, b2] = await Promise.all([fetchA(), fetchB()]);
\`\`\`

Правило: **\`await\` подряд нужен, только если второй запрос зависит от результата первого.** Иначе — \`Promise.all\`.

## Что сказать на собеседовании

> \`async\`-функция всегда возвращает промис, а \`await\` — синтаксический сахар над \`.then()\`: он приостанавливает функцию и планирует продолжение как микрозадачу. Поэтому код после \`await\` выполняется позже всего синхронного кода текущего тика — даже не-промис оборачивается в \`Promise.resolve\`. Исключения внутри async-функции превращаются в отклонённый промис, а \`await\` от него бросает ошибку, которую ловит обычный \`try/catch\`. Главная практическая ошибка — последовательные \`await\` там, где запросы независимы: это сериализует операции, и вместо этого нужен \`Promise.all\`.

## Ловушки

- **\`forEach\` не ждёт.** \`arr.forEach(async x => await save(x))\` завершится мгновенно, ничего не дождавшись. Нужен \`for...of\` (по очереди) или \`Promise.all(arr.map(...))\` (параллельно).
- **\`await\` в цикле — это «водопад» запросов.** Иногда это осознанный выбор (нужен порядок или щадящая нагрузка), но чаще — случайное замедление в N раз.
- **Необработанный rejection** не проходит бесследно: в браузере это событие \`unhandledrejection\`, в Node — падение процесса.
- **\`Promise.all\` падает целиком от одной ошибки.** Если нужны все результаты вместе с ошибками — \`Promise.allSettled\`.
- **Промис запускается в момент создания**, а не в момент \`await\`. \`const p = fetchA(); await other(); await p;\` — запрос ушёл сразу, и это часто именно то, что нужно.
- Оборачивать \`return await x\` обычно излишне, но **внутри \`try/catch\` — обязательно**: без \`await\` ошибка улетит мимо \`catch\`.`,
      en: `## In short

**async/await isn't a new mechanism, it's a nicer wrapper over promises.**

Two rules, from which everything else follows:

1. **An \`async\` function always returns a promise.** Even with \`return 5\` inside, what comes out is a \`Promise<number>\`.
2. **\`await\` is \`.then()\`.** It pauses the function, and all the code after it becomes a **microtask**.

The analogy: \`await\` is a bookmark. You reach it, put the book down, do other things, then come back to exactly the same place.

## Why code after await is always "late"

\`\`\`js
async function f() {
  console.log('A');
  await null;          // awaiting a NON-promise still defers the rest
  console.log('B');
}

console.log('1');
f();
console.log('2');
// Prints: 1, A, 2, B
\`\`\`

The walkthrough: \`1\` synchronously → we call \`f()\`, which synchronously prints \`A\` → we hit the \`await\`, the function freezes and control returns to the outside → \`2\` synchronously → synchronous code is done, drain microtasks → \`B\`.

The key point: **\`await null\` defers too.** The value is wrapped in \`Promise.resolve()\` and the continuation always goes to the microtask queue.

## Errors

Anything thrown inside an \`async\` function turns into a **rejected promise**. And the other way round — awaiting a rejected promise throws an exception you catch with a plain \`try/catch\`:

\`\`\`js
try {
  const data = await fetchUser();
} catch (e) {
  // both a network failure and an internal throw land here
}
\`\`\`

## Sequential or parallel — the most common mistake

\`\`\`js
// Sequential: 2 seconds if each request takes one
const a = await fetchA();
const b = await fetchB();

// Parallel: 1 second
const [a2, b2] = await Promise.all([fetchA(), fetchB()]);
\`\`\`

The rule: **back-to-back \`await\`s are only justified when the second request depends on the first one's result.** Otherwise use \`Promise.all\`.

## What to say in the interview

> An \`async\` function always returns a promise, and \`await\` is syntactic sugar over \`.then()\`: it suspends the function and schedules the continuation as a microtask. That's why code after an \`await\` is guaranteed to run after all the synchronous code of the current tick — even awaiting a non-promise still wraps the value in \`Promise.resolve\`. Exceptions inside an async function become a rejected promise, and awaiting a rejected promise throws an error caught by an ordinary \`try/catch\`. The main practical mistake is sequential \`await\`s on independent requests: that serialises them, and \`Promise.all\` is what's needed. Another common one is \`forEach\` with an async callback — it doesn't wait for the promises, so you need \`for...of\` with \`await\` or \`Promise.all(map(...))\`.

## Gotchas

- **\`forEach\` doesn't wait.** \`arr.forEach(async x => await save(x))\` finishes instantly without awaiting anything. Use \`for...of\` (one at a time) or \`Promise.all(arr.map(...))\` (in parallel).
- **\`await\` in a loop is a request waterfall.** Sometimes that's deliberate (you need ordering, or you're being gentle on the server), but more often it's an accidental N-times slowdown.
- **An unhandled rejection doesn't pass unnoticed**: in the browser it's the \`unhandledrejection\` event, in Node it crashes the process.
- **\`Promise.all\` fails entirely on a single error.** If you need all results plus the failures, use \`Promise.allSettled\`.
- **A promise starts when it's created**, not when it's awaited. \`const p = fetchA(); await other(); await p;\` fires the request immediately — and that's often exactly what you want.
- \`return await x\` is usually redundant, but **inside a \`try/catch\` it's mandatory**: without the \`await\` the error flies straight past the \`catch\`.`
    },
    codeSnippet: `// forEach does NOT await — items log out of order / "done" comes first
async function badLoop(urls) {
  urls.forEach(async (u) => { await fetch(u); });
  console.log('done'); // prints before any fetch finishes
}

// correct sequential
async function seq(urls) {
  for (const u of urls) await fetch(u);
  console.log('done');
}
// correct parallel
async function par(urls) {
  await Promise.all(urls.map((u) => fetch(u)));
  console.log('done');
}`
  },
  {
    id: 'jsts-031',
    category: 'js-state',
    level: 'Medium',
    tags: ['immutability', 'object-freeze', 'const'],
    question: {
      ru: 'Чем `const` отличается от иммутабельности? Как работает `Object.freeze` и его ограничения?',
      en: 'How does `const` differ from immutability? How does `Object.freeze` work and its limits?'
    },
    answer: {
      ru: `## Коротко

\`const\` защищает **не объект, а имя**. Он говорит: «эта переменная больше никогда не будет указывать на что-то другое». А что происходит **внутри** объекта — ему всё равно.

Аналогия: \`const\` — это привязанный к столбу поводок. Собака никуда не убежит, но грызть тапки внутри радиуса ей никто не мешает.

\`\`\`js
const arr = [1, 2];
arr.push(3);      // ок — содержимое менять можно
arr = [];         // ошибка — переприсваивать нельзя
\`\`\`

## Object.freeze — вот это уже про содержимое

\`Object.freeze(obj)\` реально запрещает менять объект:

- нельзя добавить новое свойство;
- нельзя удалить существующее;
- нельзя изменить значение;
- нельзя поменять прототип и дескрипторы.

Но есть два подвоха.

**Подвох 1: заморозка поверхностная.** Вложенные объекты остаются полностью изменяемыми.

\`\`\`js
'use strict';
const cfg = Object.freeze({ a: 1, nested: { b: 2 } });

cfg.a = 5;          // TypeError — верхний уровень защищён
cfg.nested.b = 99;  // ок! вложенный объект не заморожен
\`\`\`

**Подвох 2: в нестрогом режиме мутация проваливается молча.** Никакой ошибки — просто ничего не произошло. В strict mode (а модули и классы всегда strict) будет \`TypeError\`.

## Глубокая заморозка

\`\`\`js
function deepFreeze(o) {
  Object.getOwnPropertyNames(o).forEach((k) => {
    const v = o[k];
    if (v && typeof v === 'object') deepFreeze(v);
  });
  return Object.freeze(o);
}
\`\`\`

## Соседние методы

- **\`Object.seal\`** — запрещает добавлять и удалять свойства, но **менять значения разрешает**.
- **\`Object.preventExtensions\`** — запрещает только добавлять новые.
- **\`readonly\` и \`Readonly<T>\` в TypeScript** — это **только компиляция**. В рантайме никакой защиты нет: если объект пришёл из \`JSON.parse\`, его прекрасно можно мутировать.

## Что сказать на собеседовании

> \`const\` фиксирует привязку имени, но не запрещает мутацию содержимого — у объекта и массива можно менять поля и элементы. Настоящую защиту на уровне рантайма даёт \`Object.freeze\`: он запрещает добавление, удаление и изменение свойств. У него два ограничения: заморозка поверхностная, а в нестрогом режиме мутация проваливается молча, а не бросает TypeError. В TypeScript \`readonly\` и \`Readonly<T>\` работают только на этапе компиляции и рантайм-гарантий не дают, поэтому для реальной иммутабельности используют freeze или библиотеки вроде Immer.

## Ловушки

- **Заморозка «на всякий случай» стоит производительности**: замороженные объекты V8 обрабатывает иначе. Обычно её включают только в dev-режиме, как делает Angular с \`ngDevMode\`.
- **\`Object.freeze\` не защищает от \`Map\`, \`Set\` и \`Date\` внутри**: их методы всё равно изменят состояние.
- **Массив после freeze ломает \`push\`/\`sort\`** — в strict mode это TypeError прямо в рантайме.
- **\`Readonly<T>\` поверхностный**, как и \`freeze\`. Для глубины нужен свой \`DeepReadonly\`.
- **Иммутабельность в стейт-менеджерах — про новый объект, а не про freeze**: правильный путь — \`{ ...state, field: value }\`, а не мутация замороженного.`,
      en: `## In short

\`const\` protects **the name, not the object**. It says "this variable will never point at anything else". What happens **inside** the object is none of its business.

The analogy: \`const\` is a lead tied to a post. The dog can't run away, but nothing stops it chewing the slippers within reach.

\`\`\`js
const arr = [1, 2];
arr.push(3);      // ok — the contents can change
arr = [];         // error — rebinding is forbidden
\`\`\`

## Object.freeze — this one is about the contents

\`Object.freeze(obj)\` genuinely forbids changing the object:

- no adding new properties;
- no deleting existing ones;
- no changing values;
- no changing the prototype or descriptors.

But there are two catches.

**Catch 1: the freeze is shallow.** Nested objects stay fully mutable.

\`\`\`js
'use strict';
const cfg = Object.freeze({ a: 1, nested: { b: 2 } });

cfg.a = 5;          // TypeError — the top level is protected
cfg.nested.b = 99;  // ok! the nested object isn't frozen
\`\`\`

**Catch 2: in sloppy mode a mutation fails silently.** No error — nothing simply happens. In strict mode (and modules and classes are always strict) you get a \`TypeError\`.

## Deep freeze

\`\`\`js
function deepFreeze(o) {
  Object.getOwnPropertyNames(o).forEach((k) => {
    const v = o[k];
    if (v && typeof v === 'object') deepFreeze(v);
  });
  return Object.freeze(o);
}
\`\`\`

## Neighbouring methods

- **\`Object.seal\`** — forbids adding and deleting properties but **allows changing values**.
- **\`Object.preventExtensions\`** — only forbids adding new ones.
- **\`readonly\` and \`Readonly<T>\` in TypeScript** are **compile-time only**. There's no runtime protection at all: an object from \`JSON.parse\` can be mutated freely.

## What to say in the interview

> \`const\` fixes the binding of a name to a value but doesn't forbid mutating the contents — an object's fields and an array's elements can still change. Real runtime protection comes from \`Object.freeze\`: it forbids adding, deleting and changing properties as well as replacing the prototype. It has two important limits — the freeze is shallow, so nested objects stay mutable, and in sloppy mode a mutation attempt fails silently instead of throwing a TypeError. For a deep freeze you traverse the graph recursively. Next to it sit \`Object.seal\`, which forbids changing the set of properties but allows changing values, and \`Object.preventExtensions\`. In TypeScript \`readonly\` and \`Readonly<T>\` work at compile time only and give no runtime guarantees, so real data immutability comes from freeze or from libraries like Immer.

## Gotchas

- **Freezing "just in case" costs performance**: V8 treats frozen objects differently. It's usually enabled only in dev mode, the way Angular does with \`ngDevMode\`.
- **\`Object.freeze\` doesn't protect a \`Map\`, \`Set\` or \`Date\` inside**: their methods will still change the state.
- **A frozen array breaks \`push\`/\`sort\`** — a runtime TypeError in strict mode.
- **\`Readonly<T>\` is shallow**, just like \`freeze\`. For depth you need your own \`DeepReadonly\`.
- **Immutability in state managers is about new objects, not about freeze**: the right approach is \`{ ...state, field: value }\`, not mutating a frozen one.`
    }
  },
  {
    id: 'jsts-032',
    category: 'js-state',
    level: 'Expert',
    tags: ['v8-internals', 'hidden-classes', 'optimization'],
    question: {
      ru: 'Что такое hidden classes (shapes) и inline caches в V8? Как они влияют на производительность?',
      en: 'What are hidden classes (shapes) and inline caches in V8? How do they affect performance?'
    },
    answer: {
      ru: `## Коротко

Объекты в JS динамические — свойства можно добавлять когда угодно. Если бы движок каждый раз искал свойство по имени в хеш-таблице, это было бы очень медленно.

Поэтому V8 хитрит: он **втихаря присваивает каждому объекту «форму» (hidden class)** — описание «какие свойства есть, в каком порядке, по каким смещениям в памяти». Объекты одинаковой формы делят одно описание.

Аналогия: анкета. Если у всех бланков поля идут в одном порядке, можно не читать подписи, а сразу смотреть «имя — вторая строка сверху».

## Почему порядок инициализации важен

Каждое добавление свойства создаёт **новую форму** — переход в дереве переходов. Значит два объекта с теми же полями, но добавленными в разном порядке, имеют **разные формы**:

\`\`\`js
function A() { this.x = 1; this.y = 2; }
const a1 = new A(), a2 = new A();    // одна форма — быстро

const p1 = { x: 1 }; p1.y = 2;       // форма: {} -> {x} -> {x,y}
const p2 = { y: 2 }; p2.x = 1;       // форма: {} -> {y} -> {y,x}
// p1 и p2 для движка — РАЗНЫЕ формы, хотя поля одинаковые
\`\`\`

## Inline caches — вторая половина механизма

Когда движок в каком-то месте кода выполняет \`obj.x\`, он **запоминает прямо в этом месте**: «в прошлый раз здесь была форма F, и \`x\` лежал по смещению 8». В следующий раз проверка сводится к сравнению формы — и сразу чтение по адресу.

Три состояния такого кэша:

- **Мономорфный** — здесь всегда встречается одна форма. Самый быстрый путь.
- **Полиморфный** — 2–4 разные формы. Уже медленнее, идёт перебор.
- **Мегаморфный** — форм много, кэш сдаётся и уходит в общий медленный поиск.

## Что портит производительность

- **Разные формы объектов в одном горячем месте** — код становится полиморфным.
- **\`delete obj.prop\`** — переводит объект в «словарный режим», это очень дорого.
- **Смена прототипа** через \`__proto__ =\` или \`setPrototypeOf\`.
- **Массивы со смешанными типами**: массив маленьких целых быстрее массива чисел с плавающей точкой, а тот быстрее массива объектов. Переход только в одну сторону — назад не откатывается.
- **Дырки в массивах** (\`arr[100] = 1\` на пустом массиве) — тоже словарный режим.

## Что сказать на собеседовании

> V8 компенсирует динамичность объектов скрытыми классами: для каждого объекта хранится описание его формы — набор свойств и их смещения. Объекты с одинаковой структурой разделяют один hidden class, а добавление свойства создаёт переход к новой форме, поэтому важен порядок инициализации полей. Поверх этого работают inline caches: движок запоминает форму и смещение в месте доступа. Кэш бывает мономорфным — одна форма, самый быстрый путь, полиморфным — до четырёх форм, и мегаморфным, когда оптимизация отключается. Но это микрооптимизации: сначала профилирование, потом выводы.

## Ловушки

- **Это не повод писать нечитаемый код.** Разница видна только в горячих циклах на десятках тысяч итераций. Сначала профилируйте.
- **\`delete\` — редкая по вредности операция.** Вместо неё присваивайте \`undefined\` или используйте \`Map\`, если ключи действительно добавляются и удаляются.
- **Опциональные поля создают разные формы.** Если половина объектов имеет поле \`error\`, а половина нет — в горячем коде это полиморфизм. Лучше всегда инициализировать поле, пусть и в \`null\`.
- **Массив нельзя «понизить» обратно**: положили в массив чисел одну строку — он навсегда стал массивом объектов, даже если строку убрать.
- Классы (\`class\`) сами по себе быстрее объектных литералов не делают — важна именно консистентность формы.`,
      en: `## In short

Objects in JS are dynamic — properties can be added at any time. If the engine had to look every property up by name in a hash table, that would be very slow.

So V8 cheats: it **quietly assigns every object a "shape" (hidden class)** — a description of "which properties exist, in what order, at which memory offsets". Objects with the same shape share one description.

The analogy: a form. If every form has its fields in the same order, you don't need to read the labels — you just look at "name — second line from the top".

## Why initialisation order matters

Every property addition creates a **new shape** — a transition in a transition tree. So two objects with the same fields added in a different order have **different shapes**:

\`\`\`js
function A() { this.x = 1; this.y = 2; }
const a1 = new A(), a2 = new A();    // one shape — fast

const p1 = { x: 1 }; p1.y = 2;       // shape: {} -> {x} -> {x,y}
const p2 = { y: 2 }; p2.x = 1;       // shape: {} -> {y} -> {y,x}
// to the engine p1 and p2 have DIFFERENT shapes, despite identical fields
\`\`\`

## Inline caches — the other half of the mechanism

When the engine executes \`obj.x\` at some place in the code, it **remembers right there**: "last time the shape here was F and \`x\` lived at offset 8". Next time the check reduces to comparing the shape, then reading straight from the address.

Three states of that cache:

- **Monomorphic** — always one shape here. The fastest path.
- **Polymorphic** — 2–4 different shapes. Slower, it has to scan.
- **Megamorphic** — too many shapes, the cache gives up and falls back to the general slow lookup.

## What hurts performance

- **Different object shapes in the same hot site** — the code becomes polymorphic.
- **\`delete obj.prop\`** — moves the object into "dictionary mode", which is very expensive.
- **Changing the prototype** via \`__proto__ =\` or \`setPrototypeOf\`.
- **Arrays with mixed types**: an array of small integers is faster than an array of doubles, which is faster than an array of objects. The transition is one-way — it never goes back.
- **Holes in arrays** (\`arr[100] = 1\` on an empty array) — dictionary mode again.

## What to say in the interview

> V8 compensates for the dynamic nature of objects with hidden classes: for every object it stores a description of its shape — the set of properties, their order and offsets. Objects with the same structure share a hidden class, and adding a property creates a transition to a new shape, which is why the order of field initialisation determines whether objects share a shape. On top of that sit inline caches: at every property access site the engine remembers the shape and the offset. The cache can be monomorphic — one shape, the fastest path — polymorphic with up to four shapes, or megamorphic, where the optimisation is disabled. \`delete\`, prototype changes and mixed or sparse arrays all slow things down. The practical takeaways are to initialise all fields in the constructor in the same order, avoid \`delete\`, and keep arrays dense and uniform. But these are micro-optimisations: profile first, conclude second.

## Gotchas

- **This is no excuse for unreadable code.** The difference only shows in hot loops over tens of thousands of iterations. Profile first.
- **\`delete\` is unusually harmful.** Assign \`undefined\` instead, or use a \`Map\` if keys really are added and removed.
- **Optional fields create different shapes.** If half your objects have an \`error\` field and half don't, that's polymorphism in hot code. Better to always initialise the field, even to \`null\`.
- **An array can't be "downgraded" back**: put one string into an array of numbers and it becomes an array of objects forever, even if you remove the string.
- Using \`class\` doesn't make things faster by itself — what matters is shape consistency.`
    }
  },
  {
    id: 'jsts-033',
    category: 'typescript',
    level: 'Hard',
    tags: ['overloads', 'function-types', 'this-typing'],
    question: {
      ru: 'Как работают перегрузки функций в TypeScript и типизация `this`? В чём отличие от union-сигнатуры?',
      en: 'How do function overloads and `this` typing work in TypeScript? How do they differ from a union signature?'
    },
    answer: {
      ru: `## Коротко

**Перегрузка — это когда у одной функции несколько «лиц».** Вы объявляете несколько сигнатур, а реализация одна, и она сама разбирается, что пришло.

Смысл: **связать конкретный вход с конкретным выходом**. Передали строку — вернётся строка. Передали массив — вернётся массив.

\`\`\`ts
function reverse(x: string): string;      // сигнатура 1
function reverse<T>(x: T[]): T[];         // сигнатура 2
function reverse(x: string | unknown[]) { // реализация — снаружи не видна
  return typeof x === 'string'
    ? [...x].reverse().join('')
    : [...x].reverse();
}

reverse('abc');      // тип string
reverse([1, 2, 3]);  // тип number[]
\`\`\`

## Почему не просто union

Если написать \`function reverse(x: string | T[]): string | T[]\`, то **на любой вызов** тип результата будет \`string | T[]\` — и потребителю придётся каждый раз проверять, что ему вернули. Перегрузки убирают эту неопределённость.

## Два правила, которые надо помнить

1. **Порядок сверху вниз.** TypeScript берёт **первую подходящую** сигнатуру, поэтому более конкретные ставят выше более общих.
2. **Сигнатура реализации снаружи невидима.** Она не участвует в выборе — её нельзя вызвать напрямую, даже если формально она шире.

## Типизация \`this\`

В TypeScript тип \`this\` объявляется как **первый фантомный параметр** — он существует только в типах и в вызов не передаётся:

\`\`\`ts
interface Btn { label: string; }

function render(this: Btn): string { return this.label; }

render.call({ label: 'ok' });  // ок
render();                      // ошибка — нет подходящего this
\`\`\`

Отдельно: \`this: void\` означает «эта функция не должна использовать \`this\`» — полезно для колбэков. Есть и утилиты \`ThisParameterType\` и \`OmitThisParameter\`.

## Что сказать на собеседовании

> Перегрузки — это несколько сигнатур объявления над одной реализацией: снаружи видны только сигнатуры, вызвать реализацию напрямую нельзя. Нужны они, чтобы связать вход с выходом: union-параметр дал бы union и в результате, а перегрузка выражает зависимость — строка возвращает строку, массив возвращает массив. TypeScript выбирает первую подходящую сигнатуру сверху вниз, поэтому более специфичные ставят выше. Тип \`this\` объявляется первым фантомным параметром, существующим только на уровне типов. Современная альтернатива — дженерик с условным возвращаемым типом.

## Ловушки

- **Перегрузки — это только типы.** В рантайме функция одна, и разбор аргументов вы пишете руками. Компилятор не проверит, что реализация действительно покрывает все сигнатуры.
- **Тело функции не сужается по перегрузке.** Внутри вы работаете с самым широким типом, и \`typeof\`-проверки обязательны.
- **Неправильный порядок ломает вывод**: если общая сигнатура стоит первой, конкретная никогда не выберется.
- **Слишком много перегрузок — плохая читаемость.** Больше трёх-четырёх — сигнал, что нужен дженерик с условным типом или разные функции с разными именами.
- \`this: void\` в колбэке — **хороший тон в API**: он не даёт потребителю случайно понадеяться на контекст.`,
      en: `## In short

**An overload is one function with several "faces".** You declare several signatures over a single implementation, and the implementation works out what it received.

The point is to **tie a specific input to a specific output**. Pass a string, get a string back. Pass an array, get an array.

\`\`\`ts
function reverse(x: string): string;      // signature 1
function reverse<T>(x: T[]): T[];         // signature 2
function reverse(x: string | unknown[]) { // implementation — invisible outside
  return typeof x === 'string'
    ? [...x].reverse().join('')
    : [...x].reverse();
}

reverse('abc');      // type string
reverse([1, 2, 3]);  // type number[]
\`\`\`

## Why not just a union

If you write \`function reverse(x: string | T[]): string | T[]\`, then **every call** returns \`string | T[]\` and the consumer has to check what came back every single time. Overloads remove that uncertainty.

## Two rules to remember

1. **Top to bottom.** TypeScript picks the **first matching** signature, so more specific ones go above more general ones.
2. **The implementation signature is invisible from outside.** It takes no part in resolution and can't be called directly, even if it's formally wider.

## Typing \`this\`

In TypeScript the type of \`this\` is declared as a **first phantom parameter** — it exists only in the types and isn't passed at the call site:

\`\`\`ts
interface Btn { label: string; }

function render(this: Btn): string { return this.label; }

render.call({ label: 'ok' });  // ok
render();                      // error — no suitable this
\`\`\`

Separately: \`this: void\` means "this function must not use \`this\`" — useful for callbacks. There are also the \`ThisParameterType\` and \`OmitThisParameter\` utilities.

## What to say in the interview

> Overloads are several declaration signatures over one implementation. Only the signatures are visible from outside; the implementation signature doesn't take part in resolution and can't be called directly. They exist to tie input to output: a union parameter would give a union in the return type as well, whereas an overload expresses the dependency — a string returns a string, an array returns an array. TypeScript picks the first matching signature top to bottom, so more specific ones go higher. The type of \`this\` is declared as a first phantom parameter that exists only at the type level; \`this: void\` forbids using \`this\` inside. The modern alternative to overloads is a generic with a conditional return type — it scales better, though with genuinely different argument counts and meanings overloads read more clearly.

## Gotchas

- **Overloads are types only.** At runtime there's one function and you write the argument dispatch by hand. The compiler doesn't verify that the implementation really covers every signature.
- **The body isn't narrowed by the overload.** Inside you work with the widest type and \`typeof\` checks are mandatory.
- **A wrong order breaks inference**: if the general signature comes first, the specific one is never chosen.
- **Too many overloads hurt readability.** More than three or four is a sign you need a generic with a conditional type, or separate functions with separate names.
- \`this: void\` on a callback is **good API manners**: it stops consumers accidentally relying on context.`
    }
  },
  {
    id: 'jsts-034',
    category: 'typescript',
    level: 'Medium',
    tags: ['enums', 'const-enum', 'union-types'],
    question: {
      ru: 'Чем отличаются обычные `enum`, `const enum` и union литеральных типов? Что предпочесть?',
      en: 'How do regular `enum`, `const enum`, and unions of literal types differ? What should you prefer?'
    },
    answer: {
      ru: `## Коротко

Три способа описать «одно из нескольких значений», и главный вопрос — **что остаётся в собранном JS**.

- **\`enum\`** — превращается в **настоящий объект** в бандле. Занимает место, зато существует в рантайме.
- **\`const enum\`** — компилятор **подставляет значения прямо в код**, объекта в бандле нет. Быстро и мало, но с оговорками по инструментам.
- **Union литеральных типов** (\`'a' | 'b'\`) — **вообще ничего** не остаётся в рантайме. Только типы.

## Обычный enum

\`\`\`ts
enum Dir { Up, Down }   // Up = 0, Down = 1

Dir.Up;    // 0
Dir[0];    // 'Up' — обратный маппинг, только у числовых enum
\`\`\`

В JS это скомпилируется в объект с двусторонним маппингом. Плюс — можно перебрать все значения в рантайме. Минус — код в бандле и странности вроде того, что \`Dir[0]\` вообще работает.

## const enum

\`\`\`ts
const enum Color { Red, Green }
const c = Color.Red;     // скомпилируется в: const c = 0;
\`\`\`

Никакого объекта, чистая подстановка. Но:

- ломается при \`isolatedModules\` (а это дефолт в современных сборках);
- **нельзя отдавать из библиотеки** — у потребителя не будет значений;
- Babel и esbuild по умолчанию его не инлайнят.

## Union литеральных типов — рекомендуемый вариант

\`\`\`ts
type Status = 'idle' | 'loading' | 'done';
const s: Status = 'idle';
\`\`\`

Ноль байт в бандле, отличное сужение типов, значения читаемы в логах и напрямую сериализуются в JSON. Идеально дружит с дискриминируемыми union.

## А если нужны значения в рантайме?

Есть компромисс лучше enum — объект с \`as const\` плюс вывод типа из него:

\`\`\`ts
const Roles = { Admin: 'admin', User: 'user' } as const;

type Role = typeof Roles[keyof typeof Roles];  // 'admin' | 'user'

Object.values(Roles);   // ['admin', 'user'] — можно перебирать
\`\`\`

Получаем и рантайм-значения для итерации, и точные литеральные типы, и обычный JS без магии компилятора.

## Что сказать на собеседовании

> Обычный \`enum\` эмитит в JS настоящий объект, а у числовых enum ещё и обратный маппинг, поэтому он занимает место в бандле, но доступен в рантайме для итерации. \`const enum\` инлайнится компилятором в литералы и в бандл не попадает, но он несовместим с \`isolatedModules\` и не поддерживается Babel и esbuild из коробки. Union строковых литералов — рекомендуемый дефолт: нулевой рантайм-след, отличное сужение и совместимость с JSON. Когда значения нужны в рантайме для перебора, вместо enum берут объект с \`as const\` и выводят тип через \`typeof Obj[keyof typeof Obj]\`.

## Ловушки

- **Числовые enum небезопасны**: до TypeScript 5.0 в переменную типа числового enum можно было присвоить любое число. Строковые enum такой дыры не имеют.
- **Обратный маппинг только у числовых.** \`Dir[0]\` работает, а у строкового enum — нет.
- **enum — это одновременно тип и значение.** Отсюда путаница: \`Dir\` можно использовать и в аннотации, и как объект.
- **\`const enum\` в библиотеке — почти всегда ошибка.** Потребитель получит ошибку сборки или пустоту.
- В Angular-проектах enum ещё встречается в шаблонах — но там его всё равно приходится пробрасывать через поле компонента, что лишний раз показывает: объект с \`as const\` удобнее.`,
      en: `## In short

Three ways to describe "one of several values", and the key question is **what ends up in the compiled JS**.

- **\`enum\`** — becomes a **real object** in the bundle. It takes space, but it exists at runtime.
- **\`const enum\`** — the compiler **inlines the values into the code**, no object in the bundle. Fast and small, with toolchain caveats.
- **A union of literal types** (\`'a' | 'b'\`) — **nothing at all** remains at runtime. Types only.

## Regular enum

\`\`\`ts
enum Dir { Up, Down }   // Up = 0, Down = 1

Dir.Up;    // 0
Dir[0];    // 'Up' — reverse mapping, numeric enums only
\`\`\`

It compiles to an object with a two-way mapping. The upside is that you can enumerate the values at runtime. The downsides are the code in the bundle and oddities like \`Dir[0]\` working at all.

## const enum

\`\`\`ts
const enum Color { Red, Green }
const c = Color.Red;     // compiles to: const c = 0;
\`\`\`

No object, pure substitution. But:

- it breaks under \`isolatedModules\` (the default in modern builds);
- **you can't ship it from a library** — consumers won't get the values;
- Babel and esbuild don't inline it out of the box.

## A union of literal types — the recommended option

\`\`\`ts
type Status = 'idle' | 'loading' | 'done';
const s: Status = 'idle';
\`\`\`

Zero bytes in the bundle, excellent narrowing, values readable in logs and serialisable straight to JSON. Works perfectly with discriminated unions.

## But what if you need the values at runtime?

There's a better compromise than an enum — an object with \`as const\` plus a type derived from it:

\`\`\`ts
const Roles = { Admin: 'admin', User: 'user' } as const;

type Role = typeof Roles[keyof typeof Roles];  // 'admin' | 'user'

Object.values(Roles);   // ['admin', 'user'] — enumerable
\`\`\`

You get runtime values for iteration, precise literal types, and plain JavaScript with no compiler magic.

## What to say in the interview

> A regular \`enum\` emits a real object into the JS output, and numeric enums also get a reverse mapping, so it takes bundle space but is available at runtime for iteration. \`const enum\` is inlined into literals by the compiler and doesn't reach the bundle, but it's incompatible with \`isolatedModules\`, unsuitable for published libraries and unsupported by Babel and esbuild out of the box. A union of string literals is the recommended default: zero runtime footprint, excellent narrowing and JSON compatibility. When the values are needed at runtime for enumeration, instead of an enum you usually take an object with \`as const\` and derive the type via \`typeof Obj[keyof typeof Obj]\` — that gives both values and precise literal types without any special compiler semantics.

## Gotchas

- **Numeric enums are unsafe**: before TypeScript 5.0 you could assign any number to a numeric-enum-typed variable. String enums don't have that hole.
- **Reverse mapping exists only for numeric enums.** \`Dir[0]\` works; for a string enum it doesn't.
- **An enum is both a type and a value.** Hence the confusion: \`Dir\` can be used in an annotation and as an object.
- **A \`const enum\` in a library is almost always a mistake.** Consumers get a build error or nothing at all.
- Enums still appear in Angular templates, but you have to expose them through a component field anyway — which is one more sign that an \`as const\` object is more convenient.`
    }
  },
  {
    id: 'jsts-035',
    category: 'typescript',
    level: 'Expert',
    tags: ['recursive-types', 'tail-recursion', 'type-level'],
    question: {
      ru: 'Как работают рекурсивные типы и tail-recursive условные типы в TypeScript? Каковы пределы?',
      en: 'How do recursive types and tail-recursive conditional types work in TypeScript? What are the limits?'
    },
    answer: {
      ru: `## Коротко

**Рекурсивный тип — это тип, который ссылается сам на себя.** Ровно как рекурсивная функция, только на уровне типов.

Самый понятный пример — описать JSON. Внутри JSON может лежать JSON:

\`\`\`ts
type Json =
  | string | number | boolean | null
  | Json[]
  | { [k: string]: Json };
\`\`\`

Или сделать объект глубоко неизменяемым — на каждом уровне вызываем себя же:

\`\`\`ts
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
\`\`\`

## Рекурсивные условные типы — вычисления в типах

С TS 4.1 условный тип может вызывать сам себя, и это превращает систему типов в маленький язык программирования. Так делают подсчёт длины, разворот кортежа, разбор строк, даже арифметику:

\`\`\`ts
type BuildTuple<N extends number, R extends unknown[] = []> =
  R['length'] extends N ? R : BuildTuple<N, [...R, unknown]>;

type Five = BuildTuple<5>['length'];  // 5
\`\`\`

Читается как обычный цикл: «пока длина не равна N — добавляй элемент и вызывай себя снова».

## Хвостовая рекурсия — почему она важна

У компилятора есть внутренний лимит вложенности. Обычная рекурсия упирается в него быстро — примерно на 50 шагах, и вы видите **«Type instantiation is excessively deep and possibly infinite»**.

Но с TS 4.5 есть оптимизация: если рекурсивный вызов — это **весь результат ветки целиком** (то есть после него ничего не делается), компилятор разворачивает рекурсию в цикл. Лимит подскакивает примерно до **10 000** шагов.

Приём для этого — **аккумулятор**: несём промежуточный результат дополнительным параметром типа, вместо того чтобы собирать его после возврата.

\`\`\`ts
// хвостовая: вызов стоит в позиции результата, накопитель растёт
type Join<T extends string[], D extends string, Acc extends string = ''> =
  T extends [infer H extends string, ...infer R extends string[]]
    ? Join<R, D, Acc extends '' ? H : \`\${Acc}\${D}\${H}\`>
    : Acc;
\`\`\`

## Что сказать на собеседовании

> Рекурсивные типы ссылаются сами на себя — так описывают JSON и пишут \`DeepReadonly\`. С TypeScript 4.1 условные типы тоже могут быть рекурсивными, что позволяет считать на уровне типов. Лимит глубины инстанцирования при обычной рекурсии достигается примерно на пятидесяти шагах — «Type instantiation is excessively deep». С TypeScript 4.5 появилась оптимизация хвостовой рекурсии: если рекурсивный вызов — весь результат ветки, компилятор разворачивает его в цикл, и предел поднимается примерно до десяти тысяч шагов. Применять стоит умеренно: глубокая рекурсия замедляет компиляцию и подсказки в IDE.

## Ловушки

- **«Type instantiation is excessively deep»** — это почти всегда сигнал, что рекурсия не хвостовая. Перепишите с аккумулятором.
- **Хвостовой считается только рекурсия в позиции результата.** \`[...Rec<T>]\` или \`Rec<T> | null\` — уже не хвостовая, оптимизация не сработает.
- **Компиляция и IDE тормозят** от сложных рекурсивных типов сильнее, чем кажется. На большом проекте это заметно по времени отклика подсказок.
- **\`DeepReadonly\` и \`DeepPartial\` из интернета часто зацикливаются** на типах вроде \`Date\`, \`Map\` и функций — нужны явные ветки для них.
- Помните, зачем всё это. Читаемость важнее «типового кунг-фу»: если тип нельзя объяснить коллеге за минуту, скорее всего нужна другая модель данных.`,
      en: `## In short

**A recursive type is a type that refers to itself.** Exactly like a recursive function, but at the type level.

The clearest example is describing JSON. A JSON value can contain JSON:

\`\`\`ts
type Json =
  | string | number | boolean | null
  | Json[]
  | { [k: string]: Json };
\`\`\`

Or making an object deeply immutable — at every level we call ourselves again:

\`\`\`ts
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
\`\`\`

## Recursive conditional types — computation in types

Since TS 4.1 a conditional type can call itself, which turns the type system into a small programming language. That's how people count lengths, reverse tuples, parse strings and even do arithmetic:

\`\`\`ts
type BuildTuple<N extends number, R extends unknown[] = []> =
  R['length'] extends N ? R : BuildTuple<N, [...R, unknown]>;

type Five = BuildTuple<5>['length'];  // 5
\`\`\`

It reads like an ordinary loop: "while the length isn't N, add an element and call yourself again".

## Tail recursion — why it matters

The compiler has an internal nesting limit. Ordinary recursion hits it quickly — at around 50 steps — and you see **"Type instantiation is excessively deep and possibly infinite"**.

But since TS 4.5 there's an optimisation: if the recursive call is **the entire result of the branch** (nothing happens after it), the compiler unrolls the recursion into a loop. The limit jumps to roughly **10,000** steps.

The technique is an **accumulator**: carry the intermediate result in an extra type parameter instead of assembling it after the return.

\`\`\`ts
// tail-recursive: the call is in result position, the accumulator grows
type Join<T extends string[], D extends string, Acc extends string = ''> =
  T extends [infer H extends string, ...infer R extends string[]]
    ? Join<R, D, Acc extends '' ? H : \`\${Acc}\${D}\${H}\`>
    : Acc;
\`\`\`

## What to say in the interview

> Recursive types refer to themselves — that's how nested structures like JSON are described and how utilities such as \`DeepReadonly\` and \`DeepPartial\` are written. Since TypeScript 4.1 conditional types can be recursive too, which allows type-level computation: tuple lengths, string parsing, arithmetic. The catch is the instantiation depth limit — ordinary recursion reaches it at around fifty steps and produces "Type instantiation is excessively deep". TypeScript 4.5 added tail-recursion elimination: if the recursive call is the whole result of the branch, the compiler unrolls it into a loop and the practical limit rises to roughly ten thousand steps. You write it with an accumulator in an extra type parameter. In practice all of this should be used sparingly: deep type recursion noticeably slows compilation and IDE hints.

## Gotchas

- **"Type instantiation is excessively deep"** is almost always a sign the recursion isn't tail-recursive. Rewrite it with an accumulator.
- **Only a call in result position counts as tail recursion.** \`[...Rec<T>]\` or \`Rec<T> | null\` isn't tail-recursive and the optimisation won't kick in.
- **Compilation and the IDE slow down** from complex recursive types more than you'd expect. On a large project you feel it in hint latency.
- **\`DeepReadonly\` and \`DeepPartial\` copied from the internet often loop** on types like \`Date\`, \`Map\` and functions — they need explicit branches for those.
- Remember why you're doing this. Readability beats "type kung-fu": if a type can't be explained to a colleague in a minute, you probably need a different data model.`
    }
  },
  {
    id: 'jsts-036',
    category: 'typescript',
    level: 'Hard',
    tags: ['index-signatures', 'keyof', 'record-access'],
    question: {
      ru: 'Как работают index signatures и `keyof`? Почему доступ по индексу бывает небезопасным и что такое noUncheckedIndexedAccess?',
      en: 'How do index signatures and `keyof` work? Why is indexed access sometimes unsafe and what is noUncheckedIndexedAccess?'
    },
    answer: {
      ru: `## Коротко

**Index signature — это способ сказать «ключи заранее неизвестны».** Пишем \`{ [key: string]: number }\` — то есть «любая строка в качестве ключа, значение всегда число».

**\`keyof T\`** — противоположность: «дай мне union всех ключей этого типа». А **\`T[K]\`** — «дай тип значения по такому ключу».

\`\`\`ts
type Obj = { id: number; name: string };

type Keys = keyof Obj;   // 'id' | 'name'
type V = Obj['name'];    // string
\`\`\`

Вместе они дают типобезопасный доступ по ключу — тот самый паттерн \`<T, K extends keyof T>(obj: T, key: K): T[K]\`.

## Главная опасность: TypeScript слишком оптимистичен

По умолчанию компилятор считает, что **любой ключ в словаре существует**. Это неправда, и отсюда растут \`undefined\`-баги:

\`\`\`ts
const map: Record<string, number> = {};

const x = map['missing'];  // TypeScript говорит: number
x.toFixed();               // а в рантайме — TypeError, x это undefined
\`\`\`

То же самое с массивами: \`arr[999]\` имеет тип элемента, хотя реально там \`undefined\`.

## Лечение: noUncheckedIndexedAccess

Флаг в \`tsconfig.json\`, который делает доступ по индексу честным — результат становится \`V | undefined\`:

\`\`\`ts
// с флагом
const x2 = map['missing'];  // number | undefined
x2?.toFixed();              // компилятор требует проверку
\`\`\`

Важно: флаг **не трогает доступ по известным ключам**. У обычного \`{ id: number }\` обращение \`obj.id\` остаётся просто \`number\` — там сомнений нет.

## Что сказать на собеседовании

> Index signature описывает объект с заранее неизвестным набором ключей — \`{ [key: string]: V }\`; ключи могут быть \`string\`, \`number\` или \`symbol\`, и все явные свойства обязаны быть совместимы с типом значения. \`keyof T\` даёт union ключей типа, а \`T[K]\` — тип значения по ключу; вместе они дают типобезопасный доступ вида \`K extends keyof T\` с возвратом \`T[K]\`. По умолчанию TypeScript считает индексный доступ успешным и возвращает заявленный тип, игнорируя отсутствие ключа, — отсюда ошибки с undefined, в том числе на элементах массива. Флаг \`noUncheckedIndexedAccess\` делает результат \`V | undefined\` и заставляет проверять наличие.

## Ловушки

- **\`Record<string, T>\` — та же ловушка, что и index signature.** Это она и есть, просто в обёртке.
- **Массивы тоже небезопасны**: \`arr[0]\` при пустом массиве даст \`undefined\`, а тип скажет обратное. Флаг покрывает и этот случай.
- **Включение флага на существующем проекте даёт лавину ошибок** — обычно это правильные ошибки, но внедрять надо постепенно.
- **\`keyof\` у типа с index signature даёт \`string | number\`**, а не список конкретных ключей — иногда это неожиданно ломает mapped types.
- **Проверка через \`in\` сужает тип** и убирает \`undefined\` в ветке — удобная альтернатива \`?.\` там, где значение точно используется.
- Числовые ключи в JS всё равно строки: \`obj[1]\` и \`obj['1']\` — одно и то же свойство, хотя TypeScript различает \`[key: number]\` и \`[key: string]\`.`,
      en: `## In short

**An index signature is how you say "the keys aren't known in advance".** You write \`{ [key: string]: number }\`, meaning "any string as a key, the value is always a number".

**\`keyof T\`** is the opposite: "give me the union of all this type's keys". And **\`T[K]\`** is "give me the value type at that key".

\`\`\`ts
type Obj = { id: number; name: string };

type Keys = keyof Obj;   // 'id' | 'name'
type V = Obj['name'];    // string
\`\`\`

Together they give type-safe key access — the familiar \`<T, K extends keyof T>(obj: T, key: K): T[K]\` pattern.

## The main danger: TypeScript is too optimistic

By default the compiler assumes **every key in a dictionary exists**. That isn't true, and \`undefined\` bugs grow from it:

\`\`\`ts
const map: Record<string, number> = {};

const x = map['missing'];  // TypeScript says: number
x.toFixed();               // at runtime: TypeError, x is undefined
\`\`\`

The same goes for arrays: \`arr[999]\` has the element type even though it's really \`undefined\`.

## The cure: noUncheckedIndexedAccess

A \`tsconfig.json\` flag that makes indexed access honest — the result becomes \`V | undefined\`:

\`\`\`ts
// with the flag
const x2 = map['missing'];  // number | undefined
x2?.toFixed();              // the compiler demands a check
\`\`\`

Important: the flag **doesn't touch access by known keys**. On a plain \`{ id: number }\`, \`obj.id\` is still just \`number\` — there's no doubt there.

## What to say in the interview

> An index signature describes an object with an unknown set of keys — \`{ [key: string]: V }\`; keys can be \`string\`, \`number\` or \`symbol\`, and every explicit property must be compatible with the signature's value type. \`keyof T\` gives the union of a type's keys and \`T[K]\` the value type at a key; together they enable type-safe access via \`K extends keyof T\` returning \`T[K]\`. The problem is that by default TypeScript assumes indexed access always succeeds and returns the declared type, ignoring a missing key — an optimistic and incorrect assumption that produces undefined bugs, including when indexing into an array. The \`noUncheckedIndexedAccess\` flag makes the result \`V | undefined\` and forces a presence check; it doesn't affect access by known literal keys. For dictionaries a \`Map\` is often a better fit, since its \`get\` honestly returns \`V | undefined\` without any flags.

## Gotchas

- **\`Record<string, T>\` has exactly the same trap** — it *is* an index signature, just wrapped.
- **Arrays are unsafe too**: \`arr[0]\` on an empty array is \`undefined\` while the type claims otherwise. The flag covers this case as well.
- **Turning the flag on in an existing project produces an avalanche of errors** — usually correct ones, but roll it out gradually.
- **\`keyof\` on a type with an index signature gives \`string | number\`**, not a list of concrete keys — which sometimes breaks mapped types unexpectedly.
- **An \`in\` check narrows the type** and removes \`undefined\` in that branch — a handy alternative to \`?.\` when the value is definitely used.
- Numeric keys are still strings in JS: \`obj[1]\` and \`obj['1']\` are the same property, even though TypeScript distinguishes \`[key: number]\` from \`[key: string]\`.`
    }
  }
];
