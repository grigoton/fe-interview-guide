import { InterviewQuestion } from '../interfaces/question.interface';

export const JS_TS_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'jsts-001',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['event-loop', 'microtasks', 'rendering'],
    question: {
      ru: 'Как устроен Event Loop в браузере? Объясните разницу между macrotask и microtask и когда происходит рендеринг.',
      en: 'How does the browser Event Loop work? Explain the difference between macrotasks and microtasks and when rendering happens.'
    },
    answer: {
      ru: `## 🧩 Простыми словами

JavaScript в браузере — это один-единственный работник (один поток). Он не умеет делать два дела одновременно, поэтому у него есть список задач, которые он выполняет строго по очереди, одну за другой. Этот бесконечный процесс «взял задачу — сделал — взял следующую» и называется **Event Loop** (цикл событий). Представьте кассира в магазине: он один, обслуживает по одному покупателю, но у него есть две очереди с разным приоритетом.

### Один поток и очереди задач

Сам движок JavaScript (например, V8 в Chrome) выполняет код **в одном потоке** — то есть в один момент времени работает только одна строчка кода. Откуда же берётся «многозадачность»? Её обеспечивает **окружение-хост** (browser) — браузер сам ведёт таймеры, слушает клики, качает данные по сети, а готовые результаты складывает в очереди, из которых движок потом их разбирает.

Очередей две, и это ключевая идея:

- **Macrotask queue** (очередь макрозадач, она же task queue) — сюда попадают колбэки от \`setTimeout\`, \`setInterval\`, события DOM (клик, скролл), операции ввода-вывода (I/O), \`MessageChannel\`. Правило: за один оборот цикла движок берёт из неё **ровно одну** задачу.
- **Microtask queue** (очередь микрозадач) — сюда попадают колбэки промисов (\`Promise.then/catch/finally\`), \`queueMicrotask\`, \`MutationObserver\`. Правило другое: микроочередь **опустошается целиком** после каждой макрозадачи. Причём если во время разгребания микроочереди в неё добавились новые микрозадачи — они тоже выполнятся прямо сейчас, до выхода из этого этапа.

Проще говоря: макрозадачи — по одной за раз, микрозадачи — все скопом и в первую очередь.

### Порядок одного «тика» цикла

Один оборот Event Loop выглядит так:

1. Взять **одну** macrotask из очереди и выполнить её до конца.
2. Опустошить **всю** microtask-очередь (включая те микрозадачи, что добавились по ходу).
3. При необходимости выполнить шаги рендеринга: \`requestAnimationFrame\` → пересчёт стилей (recalc style) → расчёт расположения элементов (layout) → отрисовка пикселей (paint). Обычно браузер делает это примерно 60 раз в секунду (под частоту монитора).
4. Повторить сначала.

То есть рендеринг — это не «когда попало», а отдельный запланированный этап между тиками. И происходит он только **после** того, как опустела вся микроочередь.

### Разбор примера

\`\`\`js
console.log('1');
setTimeout(() => console.log('2'));      // macrotask
Promise.resolve().then(() => console.log('3')); // microtask
console.log('4');
// 1, 4, 3, 2
\`\`\`

Что происходит по шагам. Сначала выполняется синхронный код сверху вниз: печатается \`1\`, затем \`4\`. Колбэк \`setTimeout\` уходит в macrotask-очередь, колбэк \`.then\` — в microtask-очередь. Синхронный код закончился — движок опустошает микроочередь и печатает \`3\`. И только теперь берётся макрозадача — печатается \`2\`. Итог: \`1, 4, 3, 2\`. Запомните: **микрозадачи всегда обгоняют макрозадачи**.

## ⚠️ Подводные камни

- Если бесконечно подкидывать микрозадачи (микрозадача добавляет новую микрозадачу и так по кругу), то очередь никогда не опустеет — это **заблокирует и рендеринг, и макрозадачи**, страница «зависнет», хотя формально код работает.
- \`requestAnimationFrame\` выполняется **до** paint, но **после** микрозадач — это правильное место, чтобы поменять что-то на экране прямо перед отрисовкой кадра.
- \`setTimeout(fn, 0)\` не значит «через 0 мс»: у вложенных таймеров минимальная задержка около 4 мс, а во вкладках в фоне таймеры дополнительно тормозятся (throttling).

## 🎯 Запомни

- JS однопоточный; параллелизм даёт браузер через две очереди задач, а Event Loop разбирает их по кругу.
- Порядок в одном тике: одна макрозадача → полностью вся микроочередь → возможный рендеринг.
- Микрозадачи (промисы, \`queueMicrotask\`) всегда выполняются раньше макрозадач (\`setTimeout\`).
- Тяжёлые цепочки промисов могут отодвинуть paint и сделать интерфейс не отзывчивым.`,
      en: `## 🧩 In plain words

JavaScript in the browser is a single worker (one thread). It cannot do two things at once, so it keeps a list of tasks and works through them strictly one at a time. This never-ending "grab a task, do it, grab the next" process is called the **Event Loop**. Picture a single cashier in a shop: one person, serving one customer at a time — but with two lines that have different priority.

### One thread and the task queues

The JavaScript engine itself (for example V8 in Chrome) runs your code **on a single thread** — only one line of code executes at any given instant. So where does "multitasking" come from? The **host environment** (the browser) provides it: the browser runs the timers, listens for clicks, fetches data over the network, and drops the finished results into queues that the engine later picks up.

There are two queues, and this is the key idea:

- **Macrotask queue** (also called the task queue) — callbacks from \`setTimeout\`, \`setInterval\`, DOM events (click, scroll), I/O, \`MessageChannel\`. The rule: each turn of the loop the engine pulls **exactly one** task from it.
- **Microtask queue** — callbacks from promises (\`Promise.then/catch/finally\`), \`queueMicrotask\`, \`MutationObserver\`. The rule is different: the microtask queue is **drained completely** after each macrotask. And if new microtasks get added while draining, they run right now too, before this stage ends.

Put simply: macrotasks come one at a time; microtasks come all at once and go first.

### The order of one loop "tick"

One turn of the Event Loop looks like this:

1. Take **one** macrotask from the queue and run it to completion.
2. Drain the **entire** microtask queue (including microtasks added along the way).
3. Optionally run the rendering steps: \`requestAnimationFrame\` → recalc style → layout → paint. The browser typically does this about 60 times per second (matching the display).
4. Repeat from the top.

So rendering is not "whenever" — it is a distinct, scheduled stage between ticks. And it happens only **after** the whole microtask queue is empty.

### Walking through the example

\`\`\`js
console.log('1');
setTimeout(() => console.log('2'));      // macrotask
Promise.resolve().then(() => console.log('3')); // microtask
console.log('4');
// 1, 4, 3, 2
\`\`\`

Step by step. First the synchronous code runs top to bottom: it prints \`1\`, then \`4\`. The \`setTimeout\` callback goes into the macrotask queue; the \`.then\` callback goes into the microtask queue. The synchronous code is done — the engine drains the microtask queue and prints \`3\`. Only now is a macrotask taken — it prints \`2\`. Result: \`1, 4, 3, 2\`. Remember: **microtasks always jump ahead of macrotasks**.

## ⚠️ Common pitfalls

- If you endlessly queue microtasks (a microtask that schedules another microtask, forever), the queue never empties — this **starves both rendering and macrotasks**, and the page appears frozen even though code is technically running.
- \`requestAnimationFrame\` runs **before** paint but **after** microtasks — it's the right place to change something on screen just before the frame is drawn.
- \`setTimeout(fn, 0)\` does not mean "in 0 ms": nested timers have a floor of about 4 ms, and timers in background tabs are throttled further.

## 🎯 Key takeaways

- JS is single-threaded; concurrency comes from the browser via two task queues that the Event Loop cycles through.
- Order within one tick: one macrotask → the entire microtask queue → optional rendering.
- Microtasks (promises, \`queueMicrotask\`) always run before macrotasks (\`setTimeout\`).
- Heavy promise chains can delay paint and hurt responsiveness.`
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
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['call-stack', 'recursion', 'stack-overflow'],
    question: {
      ru: 'Что такое call stack? Почему возникает «Maximum call stack size exceeded» и как этого избегать?',
      en: 'What is the call stack? Why does "Maximum call stack size exceeded" happen and how do you avoid it?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Когда одна функция вызывает другую, движку нужно помнить, куда вернуться и какие у него были локальные переменные. Он складывает эту память стопкой: каждый новый вызов кладётся сверху, а по завершении снимается. Эта стопка и есть **call stack** (стек вызовов). Как стопка тарелок: последнюю положил — первую взял. Но стопка не бесконечна: если класть тарелки слишком высоко (например, функция бесконечно вызывает сама себя), она падает — это и есть ошибка «Maximum call stack size exceeded».

### Что такое call stack

**Стек вызовов** — это структура типа LIFO (Last In, First Out — «последним вошёл, первым вышел»). На каждый вызов функции движок кладёт наверх **frame** (кадр стека). Кадр хранит аргументы функции, её локальные переменные и адрес возврата — то место в коде, куда надо вернуться, когда функция закончит. Когда функция делает \`return\`, её кадр снимается со стека, и управление возвращается туда, откуда её позвали.

### Почему возникает переполнение

Размер стека **ограничен** — сколько именно кадров влезет, зависит от движка и платформы, но обычно это порядка 10–15 тысяч. Если функция вызывает сама себя слишком глубоко (глубокая рекурсия) или бесконечно (рекурсия без условия выхода), кадры не успевают сниматься и стопка переполняется. Движок бросает \`RangeError: Maximum call stack size exceeded\`.

\`\`\`js
// Глубокая рекурсия переполняет стек...
function deep(n) { return n === 0 ? 0 : deep(n - 1) + 1; }
// deep(100000); // RangeError: Maximum call stack size exceeded

// ...итеративная версия держит стек плоским
function deepIter(n) { let acc = 0; while (n-- > 0) acc++; return acc; }
deepIter(100000); // 100000
\`\`\`

Разница в том, что \`deep\` держит одновременно 100000 незавершённых вызовов (каждый ждёт результата вложенного), а \`deepIter\` использует один кадр и обычный цикл — стек не растёт.

### Как этого избегать

- **Итеративный алгоритм** вместо рекурсии. Если нужен именно стек данных — заведите массив и толкайте элементы в него вручную, вместо того чтобы полагаться на стек вызовов движка.
- **Trampolining** (трамплин) — приём, при котором функция вместо прямого рекурсивного вызова **возвращает другую функцию-продолжение**, а внешний цикл вызывает эти функции по очереди. Так каждый «шаг рекурсии» завершается полностью, кадр снимается, и стек не растёт.
- **Разбиение на macrotask** через \`setTimeout\`/\`queueMicrotask\`: откладывая следующую порцию работы в очередь задач, вы даёте стеку размотаться между порциями.

\`\`\`js
// trampoline: глубокая «рекурсия» без роста стека
const trampoline = (fn) => (...args) => {
  let r = fn(...args);
  while (typeof r === 'function') r = r();
  return r;
};
const sum = trampoline(function rec(n, acc = 0) {
  return n === 0 ? acc : () => rec(n - 1, acc + n);
});
sum(1_000_000); // ok
\`\`\`

Здесь \`rec\` не вызывает себя напрямую, а возвращает стрелку \`() => rec(...)\`. Функция \`trampoline\` в цикле \`while\` раскручивает эту цепочку: получила функцию — вызвала, получила следующую — вызвала, и так пока не придёт не-функция (конечный результат). Стек всё время остаётся мелким.

## ⚠️ Подводные камни

- **Proper tail calls** (TCO — оптимизация хвостовых вызовов) прописаны в спецификации ES2015, но реально реализованы только в JavaScriptCore (движок Safari). В V8 (Chrome, Node) на них полагаться **нельзя**. Поэтому «хвостовая рекурсия» сама по себе стек не спасёт — используйте trampoline или итерацию.
- Даже без явной рекурсии стек могут переполнить взаимно вызывающие друг друга функции (A зовёт B, B зовёт A).

## 🎯 Запомни

- Call stack — LIFO-стопка кадров; каждый вызов кладёт кадр, каждый \`return\` его снимает.
- Стек конечен (~10–15k кадров); глубокая/бесконечная рекурсия его переполняет → \`Maximum call stack size exceeded\`.
- Лечится итерацией, трамплином или разбиением работы на задачи через таймеры.
- На TCO в V8 полагаться нельзя — оно работает только в Safari.`,
      en: `## 🧩 In plain words

When one function calls another, the engine needs to remember where to return and what its local variables were. It keeps this memory in a pile: each new call is placed on top, and removed when it finishes. That pile is the **call stack**. Like a stack of plates: last one placed is the first one taken. But the pile isn't infinite: if you stack plates too high (say, a function calls itself forever), it topples — and that is the "Maximum call stack size exceeded" error.

### What the call stack is

The **call stack** is a LIFO structure (Last In, First Out). For each function call the engine pushes a **frame** onto the top. A frame holds the function's arguments, its local variables, and the return address — the spot in the code to jump back to when the function finishes. When a function hits \`return\`, its frame is popped off the stack and control returns to whoever called it.

### Why overflow happens

Stack size is **bounded** — exactly how many frames fit depends on the engine and platform, but it's often around 10–15 thousand. If a function calls itself too deeply (deep recursion) or forever (recursion with no exit condition), frames can't be popped fast enough and the pile overflows. The engine throws \`RangeError: Maximum call stack size exceeded\`.

\`\`\`js
// Deep recursion overflows the stack...
function deep(n) { return n === 0 ? 0 : deep(n - 1) + 1; }
// deep(100000); // RangeError: Maximum call stack size exceeded

// ...iterative version keeps the stack flat
function deepIter(n) { let acc = 0; while (n-- > 0) acc++; return acc; }
deepIter(100000); // 100000
\`\`\`

The difference: \`deep\` holds 100000 unfinished calls at once (each waiting on the nested one), while \`deepIter\` uses a single frame and an ordinary loop — the stack never grows.

### How to avoid it

- **Iterative algorithm** instead of recursion. If you genuinely need a stack of data, keep an array and push items into it yourself instead of relying on the engine's call stack.
- **Trampolining** — a technique where, instead of calling itself directly, a function **returns a continuation function**, and an outer loop calls those functions one after another. This way each "recursion step" completes fully, its frame is popped, and the stack doesn't grow.
- **Splitting into macrotasks** via \`setTimeout\`/\`queueMicrotask\`: by deferring the next chunk of work into a task queue, you let the stack unwind between chunks.

\`\`\`js
// trampoline: deep "recursion" without growing the stack
const trampoline = (fn) => (...args) => {
  let r = fn(...args);
  while (typeof r === 'function') r = r();
  return r;
};
const sum = trampoline(function rec(n, acc = 0) {
  return n === 0 ? acc : () => rec(n - 1, acc + n);
});
sum(1_000_000); // ok
\`\`\`

Here \`rec\` never calls itself directly — it returns an arrow \`() => rec(...)\`. The \`trampoline\` function's \`while\` loop unwinds that chain: got a function, call it; got the next, call it; and so on until a non-function (the final result) arrives. The stack stays shallow the whole time.

## ⚠️ Common pitfalls

- **Proper tail calls** (TCO — tail-call optimization) are in the ES2015 spec but are only really implemented in JavaScriptCore (Safari's engine). You **cannot** rely on them in V8 (Chrome, Node). So "tail recursion" alone won't save the stack — use a trampoline or iteration.
- Even without explicit recursion, mutually recursive functions can overflow the stack (A calls B, B calls A).

## 🎯 Key takeaways

- The call stack is a LIFO pile of frames; each call pushes a frame, each \`return\` pops it.
- The stack is finite (~10–15k frames); deep/infinite recursion overflows it → \`Maximum call stack size exceeded\`.
- Fix it with iteration, a trampoline, or by splitting work across tasks via timers.
- Don't rely on TCO in V8 — it only works in Safari.`
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
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['closures', 'lexical-scope', 'memory'],
    question: {
      ru: 'Что такое замыкание с точки зрения движка? Как замыкания связаны с лексическим окружением и расходом памяти?',
      en: 'What is a closure from the engine\'s point of view? How do closures relate to lexical environments and memory cost?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Когда функция объявлена внутри другой, она «запоминает» переменные вокруг себя — то место, где она родилась. Даже если внешняя функция уже завершилась, вложенная продолжает видеть её переменные. Такая функция вместе со своей «памятью об окружении» и называется **замыканием** (closure). Представьте, что функция уносит с собой рюкзак с переменными из своего родного места — куда бы её потом ни передали, рюкзак всегда при ней.

### Что это под капотом

Когда движок создаёт функцию, он сохраняет ссылку на **Lexical Environment** (лексическое окружение) того места, где функция была **объявлена** — не там, где её вызовут, а именно где написали. Эта ссылка живёт во внутреннем слоте функции, который в спецификации называется \`[[Environment]]\`. **Замыкание** — это и есть функция вместе с захваченным окружением. Слово «лексическое» здесь значит «определяемое по тексту кода», то есть по тому, где физически написана функция.

### Цепочка областей видимости

Окружение устроено как таблица (**Environment Record** — запись окружения, где лежат переменные) плюс ссылка на родительское окружение (\`outer\`). Когда в коде встречается имя переменной, движок ищет её сначала в текущем окружении, потом идёт по ссылке \`outer\` вверх — к родителю, к его родителю, и так до глобального. Это и есть **цепочка областей видимости** (scope chain). Важное следствие: каждое окружение живёт ровно до тех пор, пока на него есть хоть одна достижимая ссылка.

### Память

Замыкание удерживает в памяти **всё окружение**, а не одну конкретную переменную (так в большинстве движков; V8 умеет оптимизировать и через анализ кода захватывать только реально используемые переменные). Именно поэтому замыкания — частый источник **утечек памяти**:

- Колбэк, который висит в подписке (например, обработчик события), держит живыми большие объекты из родительской области.
- Переменные, которые нужны были только в момент создания функции, остаются в памяти столько же, сколько живёт сам колбэк.

\`\`\`js
function counter() {
  let count = 0;           // живёт, пока жива возвращённая функция
  return () => ++count;
}
const inc = counter();
inc(); // 1
inc(); // 2 — состояние сохраняется в замыкании
\`\`\`

Здесь \`counter\` уже завершилась, но переменная \`count\` не исчезла: возвращённая стрелка захватила окружение \`counter\` и продолжает менять \`count\` от вызова к вызову. Это замыкание как «приватное состояние».

### Классический баг с циклом

\`\`\`js
// Классический баг цикла и его исправление
const fns = [];
for (var i = 0; i < 3; i++) fns.push(() => i);
console.log(fns.map(f => f())); // [3, 3, 3] — общий 'i'

const fns2 = [];
for (let j = 0; j < 3; j++) fns2.push(() => j);
console.log(fns2.map(f => f())); // [0, 1, 2] — своё биндинг на итерацию
\`\`\`

С \`var\` переменная одна на весь цикл — все три стрелки захватили одно и то же окружение с одним \`i\`, который к концу цикла стал \`3\`. С \`let\` на **каждую итерацию** создаётся своё отдельное окружение с собственным \`j\`, поэтому стрелки видят \`0\`, \`1\`, \`2\`.

## ⚠️ Подводные камни

- Не захватывайте крупные структуры данных, если они не нужны колбэку: вытащите нужные поля в отдельные локальные переменные, а остальное оставьте за бортом.
- Обнуляйте ссылки (\`bigData = null\`) перед созданием долгоживущего колбэка, чтобы большой объект не удерживался замыканием.
- В циклах используйте \`let\`, а не \`var\`, иначе получите классический баг с общей переменной.

## 🎯 Запомни

- Замыкание = функция + окружение места, где она была объявлена (слот \`[[Environment]]\`).
- Поиск переменных идёт вверх по цепочке областей видимости до глобальной.
- Окружение живёт, пока на него есть достижимая ссылка → замыкания могут держать память и течь.
- \`let\` в цикле даёт своё биндинг на каждую итерацию; \`var\` — одну общую переменную на всех.`,
      en: `## 🧩 In plain words

When a function is declared inside another, it "remembers" the variables around it — the place where it was born. Even after the outer function has finished, the inner one can still see its variables. Such a function together with its "memory of the environment" is called a **closure**. Imagine the function carries a backpack of variables from its home spot — wherever you pass it later, the backpack goes with it.

### What it is under the hood

When the engine creates a function, it stores a reference to the **Lexical Environment** of the place where the function was **declared** — not where it will be called, but where it was written. That reference lives in an internal slot of the function that the spec calls \`[[Environment]]\`. A **closure** is precisely the function together with its captured environment. "Lexical" here means "determined by the text of the code" — that is, by where the function physically sits.

### Scope chain

An environment is a table (**Environment Record** — where the variables live) plus a reference to its parent environment (\`outer\`). When a variable name appears in code, the engine looks it up first in the current environment, then follows the \`outer\` link upward — to the parent, its parent, and so on up to global. This is the **scope chain**. A key consequence: each environment lives exactly as long as at least one reachable reference to it exists.

### Memory

A closure keeps the **whole environment** in memory, not one specific variable (that's how most engines behave; V8 can optimize and, via code analysis, capture only the variables actually used). This is exactly why closures are a common source of **memory leaks**:

- A callback held by a subscription (for example an event handler) keeps large objects from the parent scope alive.
- Variables that were only needed at creation time stay in memory as long as the callback itself lives.

\`\`\`js
function counter() {
  let count = 0;           // lives as long as the returned fn lives
  return () => ++count;
}
const inc = counter();
inc(); // 1
inc(); // 2 — state preserved in the closure
\`\`\`

Here \`counter\` has already finished, but the variable \`count\` did not disappear: the returned arrow captured \`counter\`'s environment and keeps mutating \`count\` across calls. This is a closure acting as "private state."

### The classic loop bug

\`\`\`js
// Classic loop bug and its fix
const fns = [];
for (var i = 0; i < 3; i++) fns.push(() => i);
console.log(fns.map(f => f())); // [3, 3, 3] — shared 'i'

const fns2 = [];
for (let j = 0; j < 3; j++) fns2.push(() => j);
console.log(fns2.map(f => f())); // [0, 1, 2] — per-iteration binding
\`\`\`

With \`var\` there is one variable for the whole loop — all three arrows captured the same environment with a single \`i\`, which became \`3\` by the loop's end. With \`let\`, a fresh separate environment with its own \`j\` is created **per iteration**, so the arrows see \`0\`, \`1\`, \`2\`.

## ⚠️ Common pitfalls

- Don't capture large data structures the callback doesn't need: pull the required fields into separate locals and leave the rest out.
- Null out references (\`bigData = null\`) before creating a long-lived callback, so the big object isn't held by the closure.
- In loops use \`let\`, not \`var\`, or you'll hit the classic shared-variable bug.

## 🎯 Key takeaways

- A closure = a function + the environment of where it was declared (the \`[[Environment]]\` slot).
- Variable lookup walks up the scope chain to global.
- An environment lives while a reachable reference to it exists → closures can retain memory and leak.
- \`let\` in a loop gives a per-iteration binding; \`var\` gives one shared variable for all.`,
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
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['this', 'binding', 'call-apply-bind'],
    question: {
      ru: 'Объясните правила привязки `this`. Чем отличаются call/apply/bind и почему стрелочные функции «не имеют» своего this?',
      en: 'Explain the rules for `this` binding. How do call/apply/bind differ and why do arrow functions "have no" this?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

\`this\` — это слово внутри функции, означающее «объект, в контексте которого меня сейчас вызвали». Хитрость в том, что его значение решается **не когда функцию написали, а когда её вызвали** — одна и та же функция может получить разный \`this\` в зависимости от способа вызова. Представьте фразу «передай мне соль»: кто такой «мне» — зависит от того, кто её произнёс. Со стрелочными функциями всё иначе: у них \`this\` намертво берётся из места, где их написали.

### Как определяется this

Для обычных функций \`this\` вычисляется **в момент вызова**. Есть чёткий приоритет правил, сверху вниз:

1. **new** — при вызове \`new Fn()\` создаётся новый объект, и \`this\` указывает на него.
2. **Явная привязка** — \`call\`, \`apply\` или \`bind\` прямо задают, чем будет \`this\`.
3. **Неявная привязка** — вызов вида \`obj.method()\`: \`this\` становится объектом слева от точки, то есть \`obj\`.
4. **Дефолт** — если ничего из выше, то \`this\` равен \`undefined\` в строгом режиме (strict mode) или глобальному объекту (\`window\`) в нестрогом.

Ключевая ловушка: важен **способ вызова**, а не место объявления. Оторвите метод от объекта — и неявная привязка потеряется.

### call / apply / bind

Эти три метода позволяют вручную задать \`this\`:

- \`fn.call(ctx, a, b)\` — вызывает функцию **сразу**, \`this\` = \`ctx\`, аргументы передаются списком через запятую.
- \`fn.apply(ctx, [a, b])\` — то же самое, но аргументы передаются **одним массивом**. (Мнемоника: **a**pply — **a**rray.)
- \`fn.bind(ctx, a)\` — ничего не вызывает, а **возвращает новую функцию** с навсегда зафиксированным \`this\` (и, при желании, заранее подставленными аргументами — это частичное применение). Важно: повторный \`bind\` уже **не переопределит** \`this\` — первая привязка окончательна.

\`\`\`js
function greet(greeting, punct) {
  return \`\${greeting}, \${this.name}\${punct}\`;
}
const ctx = { name: 'Ann' };

greet.call(ctx, 'Hi', '!');            // 'Hi, Ann!'
greet.apply(ctx, ['Hello', '.']);     // 'Hello, Ann.'
const bound = greet.bind(ctx, 'Hey');
bound('?');                            // 'Hey, Ann?'
bound.bind({ name: 'Bob' })('?');      // всё ещё 'Hey, Ann?' — bind окончателен
\`\`\`

Обратите внимание на последнюю строку: попытка «перепривязать» уже связанную функцию игнорируется — \`this\` остался \`ctx\` с именем \`Ann\`.

### Стрелочные функции

У стрелочных функций **нет собственного** \`this\` — а заодно нет своих \`arguments\`, \`super\`, \`new.target\`. Вместо этого они берут \`this\` **лексически**, то есть из окружения, где были объявлены (как обычная переменная по цепочке областей видимости). Из этого следуют два важных факта: их \`this\` нельзя «перепривязать» через \`call\`/\`apply\`/\`bind\` (переданный контекст просто игнорируется), и они идеально подходят как колбэки внутри методов, потому что сохраняют \`this\` внешнего метода.

\`\`\`js
const obj = {
  val: 42,
  regular() { return this.val; },
  arrow: () => this?.val, // this — из внешнего скоупа, не obj
};
const f = obj.regular;
f();              // undefined (контекст потерян)
f.call(obj);      // 42
obj.regular();    // 42
\`\`\`

Строка \`f()\` показывает ту самую ловушку: мы оторвали метод от \`obj\`, вызвали «голым», и неявная привязка исчезла → \`this\` стал \`undefined\`. А \`f.call(obj)\` и \`obj.regular()\` возвращают контекст на место.

## ⚠️ Подводные камни

- Типичная ошибка — передать \`obj.method\` как колбэк (например, в \`addEventListener\` или \`setTimeout\`) и потерять \`this\`. Решения: обернуть в стрелку (\`() => obj.method()\`), заранее сделать \`obj.method.bind(obj)\`, или объявить метод как поле-стрелку в классе.
- Стрелку бесполезно \`bind\`-ить или звать через \`call\` с новым \`this\` — контекст не поменяется.
- В нестрогом режиме потерянный \`this\` тихо становится \`window\`, а не \`undefined\` — баг может пройти незамеченным.

## 🎯 Запомни

- У обычных функций \`this\` решается в момент вызова; приоритет: \`new\` → \`call/apply/bind\` → \`obj.method()\` → дефолт.
- \`call\` и \`apply\` вызывают сразу (списком / массивом), \`bind\` возвращает новую функцию и привязывает \`this\` навсегда.
- У стрелок нет своего \`this\` — он берётся лексически и не перепривязывается.
- Оторванный от объекта метод теряет \`this\`; для колбэков используйте стрелку или \`bind\`.`,
      en: `## 🧩 In plain words

\`this\` is a word inside a function meaning "the object I'm currently being called on." The trick is that its value is decided **not when the function was written, but when it was called** — the same function can get a different \`this\` depending on how you call it. Think of the phrase "pass me the salt": who "me" is depends on who said it. Arrow functions are different: their \`this\` is locked in from the place where they were written.

### How this is determined

For ordinary functions, \`this\` is computed **at call time**. There's a clear rule priority, top to bottom:

1. **new** — calling \`new Fn()\` creates a new object, and \`this\` points to it.
2. **Explicit binding** — \`call\`, \`apply\`, or \`bind\` directly set what \`this\` will be.
3. **Implicit binding** — a call like \`obj.method()\`: \`this\` becomes the object to the left of the dot, i.e. \`obj\`.
4. **Default** — if none of the above, \`this\` is \`undefined\` in strict mode, or the global object (\`window\`) in non-strict mode.

The key trap: what matters is **how you call it**, not where it was declared. Detach a method from its object and the implicit binding is lost.

### call / apply / bind

These three methods let you set \`this\` manually:

- \`fn.call(ctx, a, b)\` — invokes the function **immediately**, \`this\` = \`ctx\`, arguments passed as a comma-separated list.
- \`fn.apply(ctx, [a, b])\` — same thing, but arguments are passed as **a single array**. (Mnemonic: **a**pply — **a**rray.)
- \`fn.bind(ctx, a)\` — invokes nothing; instead it **returns a new function** with \`this\` permanently fixed (and, optionally, arguments pre-filled — that's partial application). Important: a second \`bind\` **cannot re-set** \`this\` — the first binding is final.

\`\`\`js
function greet(greeting, punct) {
  return \`\${greeting}, \${this.name}\${punct}\`;
}
const ctx = { name: 'Ann' };

greet.call(ctx, 'Hi', '!');            // 'Hi, Ann!'
greet.apply(ctx, ['Hello', '.']);     // 'Hello, Ann.'
const bound = greet.bind(ctx, 'Hey');
bound('?');                            // 'Hey, Ann?'
bound.bind({ name: 'Bob' })('?');      // still 'Hey, Ann?' — bind is final
\`\`\`

Note the last line: trying to "rebind" an already-bound function is ignored — \`this\` stayed as \`ctx\` with the name \`Ann\`.

### Arrow functions

Arrow functions have **no own** \`this\` — and likewise no own \`arguments\`, \`super\`, or \`new.target\`. Instead they take \`this\` **lexically**, that is from the environment where they were declared (like an ordinary variable found up the scope chain). Two important consequences follow: their \`this\` cannot be "rebound" via \`call\`/\`apply\`/\`bind\` (the passed context is simply ignored), and they are ideal as callbacks inside methods because they preserve the outer method's \`this\`.

\`\`\`js
const obj = {
  val: 42,
  regular() { return this.val; },
  arrow: () => this?.val, // this — from outer scope, not obj
};
const f = obj.regular;
f();              // undefined (context lost)
f.call(obj);      // 42
obj.regular();    // 42
\`\`\`

The \`f()\` line shows exactly that trap: we detached the method from \`obj\`, called it "bare," and the implicit binding vanished → \`this\` became \`undefined\`. Meanwhile \`f.call(obj)\` and \`obj.regular()\` put the context back.

## ⚠️ Common pitfalls

- A classic mistake is passing \`obj.method\` as a callback (e.g. to \`addEventListener\` or \`setTimeout\`) and losing \`this\`. Fixes: wrap it in an arrow (\`() => obj.method()\`), pre-make \`obj.method.bind(obj)\`, or declare the method as a class arrow field.
- There's no point in \`bind\`-ing an arrow or calling it via \`call\` with a new \`this\` — the context won't change.
- In non-strict mode a lost \`this\` silently becomes \`window\` instead of \`undefined\` — the bug can go unnoticed.

## 🎯 Key takeaways

- For ordinary functions \`this\` is decided at call time; priority: \`new\` → \`call/apply/bind\` → \`obj.method()\` → default.
- \`call\` and \`apply\` invoke immediately (list / array); \`bind\` returns a new function and fixes \`this\` forever.
- Arrows have no own \`this\` — it's taken lexically and cannot be rebound.
- A method detached from its object loses \`this\`; for callbacks use an arrow or \`bind\`.`
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
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['prototypes', 'prototype-chain', 'inheritance'],
    question: {
      ru: 'Как работает цепочка прототипов? Чем отличаются `__proto__`, `prototype` и `Object.getPrototypeOf`?',
      en: 'How does the prototype chain work? How do `__proto__`, `prototype`, and `Object.getPrototypeOf` differ?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что каждый объект в JavaScript — это человек, у которого есть «родитель». Если ты просишь у объекта что-то, чего у него нет, он спрашивает у родителя, тот — у своего родителя, и так до самого верха. Эта лесенка «родителей» и называется **цепочкой прототипов**. Так объекты делятся общими методами, не копируя их каждый себе.

### Что такое цепочка прототипов

У каждого объекта есть скрытая внутренняя ссылка — слот **[[Prototype]]**. Это указатель на другой объект, его «родителя». Когда ты читаешь свойство (\`obj.foo\`), движок сначала ищет его на самом объекте. Если не нашёл — идёт по ссылке [[Prototype]] к родителю, потом к родителю родителя, и так вверх до \`Object.prototype\`, а за ним — \`null\` (конец цепочки). Если нигде не нашлось — результат \`undefined\`.

### Три похожих термина, которые все путают

- **\`prototype\`** — это свойство **функций-конструкторов** (функций, которые вызывают через \`new\`). Это тот самый объект, который станет [[Prototype]] у всех созданных экземпляров. То есть \`prototype\` — это «заготовка родителя» на будущее.
- **\`__proto__\`** — устаревший аксессор (геттер/сеттер, живущий на \`Object.prototype\`), дающий доступ к [[Prototype]] **конкретного, уже существующего объекта**. Это «показать мне моего родителя прямо сейчас».
- **\`Object.getPrototypeOf(obj)\`** и **\`Object.setPrototypeOf(obj, proto)\`** — современный, стандартный способ прочитать или задать [[Prototype]]. Предпочитай его вместо \`__proto__\`.

Короче: \`prototype\` — на конструкторе, \`__proto__\` / \`getPrototypeOf\` — на самом объекте.

### Важные детали

- **Запись всегда создаёт свойство на самом объекте** (это называют _shadowing_, «затенение»). Ты не меняешь прототип — просто новое свойство на объекте перекрывает то, что видно из прототипа. Исключение — если в цепочке есть сеттер с таким именем: тогда сработает он.
- \`Object.setPrototypeOf(...)\` и присваивание \`obj.__proto__ = ...\` **деоптимизируют** объект в движке V8: они ломают внутреннюю оптимизацию, называемую _hidden class_ (скрытый класс, которым V8 ускоряет доступ к свойствам). Это дорого — меняй прототип при создании, а не потом.
- \`class ... extends ...\` под капотом строит **две** цепочки: одну для методов экземпляров, другую — для статических членов (методов самого класса).

### Пример

\`\`\`js
function Animal(name) { this.name = name; }
Animal.prototype.speak = function () { return this.name + ' makes a sound'; };

const dog = new Animal('Rex');
Object.getPrototypeOf(dog) === Animal.prototype; // true
dog.speak();                                     // 'Rex makes a sound'
dog.hasOwnProperty('speak');                     // false — взято из прототипа
\`\`\`

Здесь \`speak\` лежит не на самом \`dog\`, а на \`Animal.prototype\`. Поэтому \`hasOwnProperty('speak')\` возвращает \`false\` — метод найден в прототипе, а не «свой». Именно поэтому методы класса **разделяются** между всеми экземплярами (экономия памяти), а поля вроде \`name\` — у каждого свои.

\`\`\`js
const base = { greet() { return 'hi ' + this.name; } };
const obj = Object.create(base);   // obj.[[Prototype]] === base
obj.name = 'Ann';

obj.greet();                       // 'hi Ann' — метод найден в прототипе
obj.hasOwnProperty('greet');       // false
Object.getPrototypeOf(obj) === base; // true

// shadowing: запись попадает на obj, а не в прототип
obj.greet = () => 'override';
base.greet === obj.greet;          // false
\`\`\`

## ⚠️ Подводные камни

- Путать \`prototype\` (у функции-конструктора) и \`__proto__\` (у экземпляра) — это разные вещи.
- Менять прототип после создания объекта (\`setPrototypeOf\`) ради «удобства» — бьёт по производительности.
- Ожидать, что запись свойства изменит прототип — нет, она создаёт свойство на самом объекте.

## 🎯 Запомни

- Чтение свойства идёт вверх по цепочке [[Prototype]] до \`null\`; запись — всегда на сам объект (shadowing).
- \`prototype\` — свойство конструктора; \`__proto__\` / \`Object.getPrototypeOf\` — доступ к прототипу конкретного объекта.
- Методы через прототип общие для всех экземпляров (экономят память); поля экземпляра — у каждого свои.`,
      en: `## 🧩 In plain words

Picture every JavaScript object as a person who has a "parent." If you ask an object for something it doesn't have, it asks its parent, who asks its own parent, all the way to the top. That ladder of "parents" is the **prototype chain**. It's how objects share common methods without each copying them individually.

### What the prototype chain is

Every object has a hidden internal link — the **[[Prototype]]** slot. It points to another object, its "parent." When you read a property (\`obj.foo\`), the engine first looks on the object itself. If it's not there, it follows the [[Prototype]] link up to the parent, then the parent's parent, and so on up to \`Object.prototype\`, and beyond that \`null\` (the end of the chain). If nothing is found anywhere, the result is \`undefined\`.

### Three similar terms everyone confuses

- **\`prototype\`** — a property of **constructor functions** (functions you call with \`new\`). It's the very object that becomes the [[Prototype]] of every instance created. Think of it as the "parent template" set up for the future.
- **\`__proto__\`** — a legacy accessor (a getter/setter living on \`Object.prototype\`) that reaches the [[Prototype]] of a **specific, already-existing object**. It's "show me my parent right now."
- **\`Object.getPrototypeOf(obj)\`** and **\`Object.setPrototypeOf(obj, proto)\`** — the modern, standard way to read or set [[Prototype]]. Prefer these over \`__proto__\`.

In short: \`prototype\` lives on the constructor; \`__proto__\` / \`getPrototypeOf\` act on the object itself.

### Key details

- **A write always creates the property on the object itself** (this is called _shadowing_). You don't change the prototype — a new own property just covers up what was visible through the prototype. Exception: if a setter with that name exists in the chain, the setter runs instead.
- \`Object.setPrototypeOf(...)\` and assigning \`obj.__proto__ = ...\` **deoptimize** the object in the V8 engine: they break an internal optimization called the _hidden class_ (a structure V8 uses to speed up property access). This is expensive — set the prototype at creation time, not later.
- \`class ... extends ...\` builds **two** chains under the hood: one for instance methods, another for static members (methods of the class itself).

### Example

\`\`\`js
function Animal(name) { this.name = name; }
Animal.prototype.speak = function () { return this.name + ' makes a sound'; };

const dog = new Animal('Rex');
Object.getPrototypeOf(dog) === Animal.prototype; // true
dog.speak();                                     // 'Rex makes a sound'
dog.hasOwnProperty('speak');                     // false — comes from prototype
\`\`\`

Here \`speak\` doesn't live on \`dog\` itself but on \`Animal.prototype\`. That's why \`hasOwnProperty('speak')\` returns \`false\` — the method was found in the prototype, not owned directly. This is exactly why class methods are **shared** across all instances (saving memory), while fields like \`name\` are per-instance.

\`\`\`js
const base = { greet() { return 'hi ' + this.name; } };
const obj = Object.create(base);   // obj.[[Prototype]] === base
obj.name = 'Ann';

obj.greet();                       // 'hi Ann' — found on the prototype
obj.hasOwnProperty('greet');       // false
Object.getPrototypeOf(obj) === base; // true

// shadowing: the write lands on obj, not the prototype
obj.greet = () => 'override';
base.greet === obj.greet;          // false
\`\`\`

## ⚠️ Common pitfalls

- Confusing \`prototype\` (on the constructor function) with \`__proto__\` (on the instance) — they are different things.
- Changing the prototype after creation (\`setPrototypeOf\`) "for convenience" — it hurts performance.
- Expecting a property write to mutate the prototype — no, it creates an own property on the object.

## 🎯 Key takeaways

- Reads walk up the [[Prototype]] chain to \`null\`; writes always land on the object itself (shadowing).
- \`prototype\` is a property of the constructor; \`__proto__\` / \`Object.getPrototypeOf\` access a specific object's prototype.
- Methods on the prototype are shared across instances (saving memory); instance fields are per-object.`
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
    category: 'javascript-typescript',
    level: 'Expert',
    tags: ['memory', 'garbage-collection', 'mark-and-sweep'],
    question: {
      ru: 'Как работает сборка мусора в V8 (mark-and-sweep, generational GC)? Что значит «достижимость»?',
      en: 'How does garbage collection work in V8 (mark-and-sweep, generational GC)? What does "reachability" mean?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Сборка мусора (garbage collection, GC) — это уборщик, который сам находит и выбрасывает объекты, которые твоей программе больше не нужны, чтобы освободить память. Главный вопрос уборщика: «Может ли программа ещё до этого объекта дотянуться?» Если нет — объект выбрасывают. В JavaScript ты не управляешь этим вручную: движок делает всё сам.

### Что такое достижимость (reachability)

Есть набор **корней** (roots) — точек, которые считаются «живыми по определению»: глобальный объект, стек вызовов (то, что сейчас исполняется), активные замыкания. Объект считается **живым**, если от какого-то корня к нему ведёт цепочка ссылок. Если такой цепочки нет — объект **недостижим**, и его память можно освободить.

Кстати, простой подсчёт ссылок (reference counting) как основной алгоритм не используется: он не умеет находить **циклы** (когда два объекта ссылаются друг на друга, но больше на них никто не ссылается — они «держат» друг друга навечно).

### Mark-and-sweep («пометь и подмети»)

Основной алгоритм состоит из шагов:

1. **Mark** (пометка): начиная от корней, движок обходит весь граф ссылок и помечает все достижимые объекты.
2. **Sweep** (уборка): всё, что осталось **непомеченным**, — недостижимо, его память освобождается.
3. **Compact** (уплотнение, опционально): движок дефрагментирует кучу — сдвигает живые объекты вместе, чтобы не оставалось «дырок».

### Generational GC (в V8 это называется Orinoco)

Наблюдение: большинство объектов умирают молодыми (создали, использовали, выбросили). Поэтому куча делится на поколения:

- **Young generation** (молодое поколение) — обрабатывается сборщиком Scavenger по схеме semi-space copying (память делится пополам, живые объекты копируются в свободную половину). Сборки тут **частые и быстрые**.
- **Old generation** (старое поколение) — объекты, пережившие пару молодых сборок, переселяются сюда. Здесь работает mark-sweep-compact — **редко, но дорого**. Чтобы не замораживать поток надолго, V8 делает это **инкрементально** (по кусочкам), **конкурентно** и **параллельно**, минимизируя паузы «stop-the-world» (когда исполнение программы полностью останавливается на время сборки).

### Утечки памяти в реальной жизни

Даже с GC можно «протечь», если случайно удерживать ссылки на ненужное:

- Забытые таймеры, подписки, слушатели событий.
- Глобальные переменные и кэши без вытеснения (ничего не удаляется).
- Отсоединённые (detached) DOM-узлы, которые уже убрали со страницы, но JS всё ещё держит на них ссылку.
- Замыкания, держащие крупные структуры данных.

\`\`\`js
let cache = new Map();
function leak(key, bigObj) { cache.set(key, bigObj); } // живёт вечно
// fix: WeakMap или политика вытеснения (LRU)
\`\`\`

Здесь обычный \`Map\` держит \`bigObj\` сильной ссылкой навсегда — GC его не тронет. Решение: \`WeakMap\` (слабые ссылки) или политика вытеснения вроде LRU (удалять давно не использованное).

\`\`\`js
// Классическая утечка через detached DOM
let detached;
function build() {
  const ul = document.createElement('ul');
  for (let i = 0; i < 1000; i++) ul.appendChild(document.createElement('li'));
  detached = ul; // JS держит всё поддерево живым даже после удаления
}
build();
// document уже не ссылается на 'ul', но 'detached' — корень GC -> утечка
detached = null; // теперь недостижимо -> можно собрать
\`\`\`

### Как искать утечки

Профилируй через DevTools → вкладка Memory: делай heap snapshots (снимки кучи), смотри allocation timeline, ищи растущий **retained size** (сколько памяти удерживает объект). Важно: принудительно вызвать GC из обычного JS нельзя — только с флагом \`--expose-gc\` для отладки.

## ⚠️ Подводные камни

- Думать, что «есть GC — значит утечек не бывает». Утечка = случайно удерживаемая ссылка.
- Кэши на обычном \`Map\`/\`Set\` без ограничений растут бесконечно.
- Detached DOM-узлы, забытые таймеры и слушатели — классические источники утечек.
- Нельзя полагаться на точное время сборки: GC недетерминирован.

## 🎯 Запомни

- Объект жив, пока достижим по цепочке ссылок от корня; иначе его память освободят.
- Mark-and-sweep помечает достижимое и убирает остальное; reference counting не ловит циклы.
- Generational GC: молодые объекты собираются часто и быстро, старые — редко и дорого.
- Утечки в JS — это забытые ссылки (таймеры, кэши, detached DOM), а не «сломанный GC».`,
      en: `## 🧩 In plain words

Garbage collection (GC) is a janitor that automatically finds and throws away objects your program no longer needs, freeing up memory. The janitor's core question is: "Can the program still reach this object?" If not, the object gets tossed. In JavaScript you don't do this by hand — the engine handles it all.

### What reachability means

There's a set of **roots** — points considered "alive by definition": the global object, the call stack (whatever is executing right now), and active closures. An object is **alive** if a chain of references from some root leads to it. If no such chain exists, the object is **unreachable** and its memory can be freed.

By the way, plain reference counting isn't used as the primary algorithm: it can't detect **cycles** (when two objects reference each other but nothing else references them — they keep each other alive forever).

### Mark-and-sweep

The core algorithm has these steps:

1. **Mark**: starting from the roots, the engine walks the whole reference graph and marks every reachable object.
2. **Sweep**: everything left **unmarked** is unreachable, and its memory is freed.
3. **Compact** (optional): the engine defragments the heap — it slides live objects together so no "holes" remain.

### Generational GC (called Orinoco in V8)

Observation: most objects die young (created, used, discarded). So the heap is split into generations:

- **Young generation** — handled by the Scavenger using semi-space copying (memory is split in half, live objects are copied into the free half). Collections here are **frequent and fast**.
- **Old generation** — objects that survived a couple of young collections are promoted here. This uses mark-sweep-compact — **rare but expensive**. To avoid freezing the thread for long, V8 runs it **incrementally** (in chunks), **concurrently**, and **in parallel**, minimizing "stop-the-world" pauses (when program execution halts entirely during collection).

### Real-world memory leaks

Even with GC you can "leak" if you accidentally keep references to things you no longer need:

- Forgotten timers, subscriptions, event listeners.
- Global variables and caches without eviction (nothing ever gets removed).
- Detached DOM nodes — removed from the page, but JS still holds a reference to them.
- Closures keeping large data structures alive.

\`\`\`js
let cache = new Map();
function leak(key, bigObj) { cache.set(key, bigObj); } // lives forever
// fix: WeakMap or an eviction policy (LRU)
\`\`\`

Here a plain \`Map\` holds \`bigObj\` with a strong reference forever — GC won't touch it. The fix: a \`WeakMap\` (weak references) or an eviction policy like LRU (drop the least-recently-used entries).

\`\`\`js
// A classic detached-DOM leak
let detached;
function build() {
  const ul = document.createElement('ul');
  for (let i = 0; i < 1000; i++) ul.appendChild(document.createElement('li'));
  detached = ul; // JS keeps the whole subtree alive even after removal
}
build();
// document never references 'ul', but 'detached' is a GC root -> leak
detached = null; // now unreachable -> eligible for collection
\`\`\`

### How to hunt leaks

Profile via DevTools → Memory tab: take heap snapshots, watch the allocation timeline, look for growing **retained size** (how much memory an object keeps alive). Note: you cannot force GC from ordinary JS — only with the \`--expose-gc\` flag for debugging.

## ⚠️ Common pitfalls

- Assuming "we have GC, so leaks can't happen." A leak = an accidentally retained reference.
- Caches built on plain \`Map\`/\`Set\` without limits grow unboundedly.
- Detached DOM nodes, forgotten timers and listeners are classic leak sources.
- Don't rely on exact collection timing: GC is non-deterministic.

## 🎯 Key takeaways

- An object is alive while reachable via a reference chain from a root; otherwise its memory is freed.
- Mark-and-sweep marks reachable objects and sweeps the rest; reference counting misses cycles.
- Generational GC: young objects are collected often and fast, old ones rarely and expensively.
- JS leaks are retained references (timers, caches, detached DOM), not a "broken GC."`
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
    category: 'javascript-typescript',
    level: 'Expert',
    tags: ['weakmap', 'weakref', 'finalization-registry'],
    question: {
      ru: 'Зачем нужны WeakMap, WeakRef и FinalizationRegistry? В чём их семантика «слабых» ссылок и риски?',
      en: 'What are WeakMap, WeakRef and FinalizationRegistry for? What are their "weak" reference semantics and risks?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Обычная ссылка на объект — как крепкая верёвка: пока держишь, сборщик мусора его не выбросит. **Слабая** ссылка — как тонкая ниточка: она указывает на объект, но не мешает уборщику его забрать, если больше никто крепко его не держит. \`WeakMap\`, \`WeakRef\` и \`FinalizationRegistry\` — инструменты, использующие такие «ниточки», чтобы не создавать утечек памяти.

### WeakMap / WeakSet

Это коллекции, где ключами могут быть **только объекты**, и держатся они **слабо**. Как только на объект-ключ не остаётся ни одной крепкой (сильной) ссылки, пара удаляется сборщиком мусора автоматически.

Именно поэтому WeakMap **нельзя перебрать** (нет итерации) и у неё нет \`size\`: её содержимое непредсказуемо во времени — оно зависит от того, когда отработает GC. Идеально подходит для приватных данных и метаданных, привязанных к объекту, без риска утечки.

\`\`\`js
// Приватные метаданные на объект, которые не текут
const privates = new WeakMap();
class Account {
  constructor(balance) { privates.set(this, { balance }); }
  get balance() { return privates.get(this).balance; }
}
let acc = new Account(100);
acc.balance;        // 100
acc = null;         // запись в WeakMap становится собираемой автоматически
\`\`\`

Когда \`acc\` обнуляется, на объект больше нет сильных ссылок — и связанная запись в \`privates\` тоже уходит. С обычным \`Map\` она осталась бы навсегда.

### WeakRef

\`WeakRef\` оборачивает объект в слабую ссылку. Чтобы достать сам объект, вызываешь \`ref.deref()\` — он вернёт объект **или \`undefined\`**, если объект уже собран сборщиком. Полезно для кэшей: держим значение, пока им кто-то реально пользуется, но позволяем GC забрать его при нехватке памяти.

### FinalizationRegistry

Позволяет зарегистрировать **callback-уборщик**, который движок вызовет **после** того, как объект будет собран (чтобы освободить внешние ресурсы, связанные с ним). Но: вызов **не гарантирован** и **не детерминирован** по времени — может случиться поздно или не случиться вовсе.

\`\`\`js
const cache = new Map();
const registry = new FinalizationRegistry((key) => cache.delete(key));

function cacheValue(key, obj) {
  cache.set(key, new WeakRef(obj));
  registry.register(obj, key);
}
\`\`\`

Здесь мы храним значения через \`WeakRef\`, а когда объект собран — регистр вызывает колбэк и чистит «мёртвую» запись из \`cache\`.

## ⚠️ Подводные камни

- **Недетерминизм**: нельзя строить логику на том, что финализатор сработает — или сработает «скоро».
- Не используй \`FinalizationRegistry\` для критичной очистки (закрытие соединений, файлов) — только как «страховку». Для важного — явный \`close()\`/\`dispose()\`.
- \`WeakRef\` усложняет рассуждения о времени жизни объекта; спецификация даже разрешает движку **не** собирать объект вовсе.
- Ключом WeakMap может быть только объект, не примитив.

## 🎯 Запомни

- Слабая ссылка указывает на объект, но не мешает GC его собрать.
- WeakMap/WeakSet: ключи-объекты, держатся слабо; нет итерации и \`size\`; идеальны для приватных данных без утечек.
- \`WeakRef.deref()\` вернёт объект или \`undefined\`; \`FinalizationRegistry\` — колбэк после сборки, но без гарантий времени.
- Слабые ссылки — защита от утечек, а не замена явному управлению ресурсами.`,
      en: `## 🧩 In plain words

A normal reference to an object is like a strong rope: as long as you hold it, the garbage collector won't throw the object away. A **weak** reference is like a thin thread: it points at the object but doesn't stop the collector from reclaiming it if nobody else is holding it strongly. \`WeakMap\`, \`WeakRef\`, and \`FinalizationRegistry\` are tools that use these "threads" so you don't create memory leaks.

### WeakMap / WeakSet

These are collections where the keys must be **objects**, and they're held **weakly**. As soon as no strong reference to a key object remains, the entry is removed by the garbage collector automatically.

That's exactly why a WeakMap is **not iterable** (no iteration) and has no \`size\`: its contents are unpredictable over time — they depend on when GC runs. It's perfect for private data and metadata attached to an object, with no risk of leaking.

\`\`\`js
// Per-object private metadata that cannot leak
const privates = new WeakMap();
class Account {
  constructor(balance) { privates.set(this, { balance }); }
  get balance() { return privates.get(this).balance; }
}
let acc = new Account(100);
acc.balance;        // 100
acc = null;         // the WeakMap entry becomes collectable automatically
\`\`\`

When \`acc\` is set to null, no strong reference to the object remains — and the associated entry in \`privates\` goes away too. With a plain \`Map\` it would stay forever.

### WeakRef

\`WeakRef\` wraps an object in a weak reference. To get the object back, you call \`ref.deref()\`, which returns the object **or \`undefined\`** if it has already been collected. Useful for caches: keep a value while someone actually uses it, but let GC reclaim it under memory pressure.

### FinalizationRegistry

Lets you register a **cleanup callback** that the engine will invoke **after** an object has been collected (to release external resources tied to it). But: the call is **not guaranteed** and **not deterministic** in timing — it may happen late or not at all.

\`\`\`js
const cache = new Map();
const registry = new FinalizationRegistry((key) => cache.delete(key));

function cacheValue(key, obj) {
  cache.set(key, new WeakRef(obj));
  registry.register(obj, key);
}
\`\`\`

Here we store values via \`WeakRef\`, and when an object is collected the registry runs the callback to clean the "dead" entry out of \`cache\`.

## ⚠️ Common pitfalls

- **Non-determinism**: never build logic on a finalizer running — or running "soon."
- Don't use \`FinalizationRegistry\` for critical cleanup (closing connections, files) — only as a safety net. For anything important, use an explicit \`close()\`/\`dispose()\`.
- \`WeakRef\` complicates reasoning about an object's lifetime; the spec even allows the engine to **not** collect an object at all.
- A WeakMap key must be an object, not a primitive.

## 🎯 Key takeaways

- A weak reference points at an object but doesn't stop GC from collecting it.
- WeakMap/WeakSet: object keys, held weakly; no iteration and no \`size\`; ideal for private data without leaks.
- \`WeakRef.deref()\` returns the object or \`undefined\`; \`FinalizationRegistry\` gives a post-collection callback, but with no timing guarantees.
- Weak references are a defense against leaks, not a replacement for explicit resource management.`
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
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['hoisting', 'tdz', 'let-const-var'],
    question: {
      ru: 'Объясните hoisting и Temporal Dead Zone. Чем отличается поведение var, let, const и объявлений функций?',
      en: 'Explain hoisting and the Temporal Dead Zone. How do var, let, const and function declarations differ?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Перед тем как выполнять код, JavaScript «пробегает глазами» по блоку и заранее записывает, какие переменные и функции в нём объявлены. Этот предварительный учёт называют **hoisting** (подъём). Но записать имя и дать к нему доступ — не одно и то же: у \`let\` и \`const\` есть период, когда имя уже известно, но трогать его ещё нельзя — это и есть **Temporal Dead Zone (TDZ)**.

### Hoisting (подъём объявлений)

На этапе **создания** окружения (до выполнения кода) движок регистрирует все объявления. Но ведут они себя по-разному:

- **\`var\`** — поднимается и сразу инициализируется значением \`undefined\`. Поэтому обращение до строки присваивания даёт \`undefined\`, а не ошибку.
- **function declaration** (объявление функции \`function foo() {}\`) — поднимается **целиком, вместе с телом**. Её можно вызвать выше строки объявления.
- **\`let\` / \`const\` / \`class\`** — поднимаются, но **не инициализируются**. От начала блока до строки объявления они находятся в **TDZ**.

### Temporal Dead Zone (временная мёртвая зона)

TDZ — это промежуток от входа в блок до строки, где переменная фактически объявлена. Любое обращение к \`let\`/\`const\` в этом промежутке бросает \`ReferenceError\`. Это сделано **намеренно** — чтобы ловить ошибочное использование переменной до её инициализации.

Дополнительно \`const\` требует инициализатор при объявлении и запрещает переприсваивание. Важно: это запрет на переприсваивание самой переменной, а не глубокая неизменяемость — содержимое объекта под \`const\` менять можно.

\`\`\`js
console.log(a); // undefined (var поднят)
var a = 1;

console.log(b); // ReferenceError — TDZ
let b = 2;

foo();          // 'ok' — function declaration поднята целиком
function foo() { return 'ok'; }

typeof c;       // 'undefined' для необъявленного имени
typeof d;       // ReferenceError, если d в TDZ — typeof не спасает
let d;
\`\`\`

Обрати внимание: обычно \`typeof\` для несуществующего имени безопасно возвращает \`'undefined'\`. Но для переменной в TDZ даже \`typeof\` бросает \`ReferenceError\`.

### Практика

- \`var\` имеет **функциональную** область видимости (виден во всей функции), а \`let\`/\`const\` — **блочную** (видны только в своём \`{ }\`).
- В цикле \`let\` создаёт **новый биндинг на каждую итерацию** — критично для замыканий (каждая функция «запоминает» своё значение, а не общее последнее).
- Function expression (\`const f = () => {}\`) не поднимается как тело: поднимается только **переменная** \`f\`, а сама функция станет доступна лишь после присваивания.

\`\`\`js
let x = 'outer';
{
  // TDZ для внутреннего 'x' начинается с верха блока
  // console.log(x); // ReferenceError, а НЕ 'outer'
  let x = 'inner';
  console.log(x);    // 'inner'
}

function f() {
  console.log(v);    // undefined (var поднят, не TDZ)
  var v = 1;
}
f();
\`\`\`

Во втором примере видно разницу: \`var v\` внутри функции поднимается и равен \`undefined\` до присваивания, ошибки нет. А внутренний \`let x\` в блоке создаёт TDZ, из-за которой обращение к нему сверху блока упало бы с ошибкой, хотя снаружи есть \`x = 'outer'\`.

## ⚠️ Подводные камни

- Думать, что \`typeof\` всегда безопасен: для переменной в TDZ он тоже бросает \`ReferenceError\`.
- Ожидать, что function expression можно вызвать до строки присваивания — нет, поднимается только имя переменной.
- Внутренний \`let\`/\`const\` затеняет внешнюю переменную с того же имени уже с верха блока (TDZ), а не только со строки объявления.

## 🎯 Запомни

- Hoisting поднимает объявления; \`var\` инициализируется \`undefined\`, объявления функций — целиком, \`let\`/\`const\`/\`class\` — остаются в TDZ.
- TDZ: обращение к \`let\`/\`const\` до объявления → \`ReferenceError\` (даже через \`typeof\`).
- \`var\` — функциональная область видимости; \`let\`/\`const\` — блочная; в цикле \`let\` даёт свежий биндинг на итерацию.`,
      en: `## 🧩 In plain words

Before running your code, JavaScript "scans" a block and notes in advance which variables and functions are declared in it. This upfront bookkeeping is called **hoisting**. But noting a name and letting you touch it are two different things: \`let\` and \`const\` have a window where the name is already known but you're not allowed to touch it yet — that's the **Temporal Dead Zone (TDZ)**.

### Hoisting

During the **creation** phase (before the code runs) the engine registers all declarations. But they behave differently:

- **\`var\`** — hoisted and immediately initialized to \`undefined\`. So accessing it before the assignment line gives \`undefined\`, not an error.
- **function declaration** (a \`function foo() {}\` statement) — hoisted **entirely, body and all**. You can call it above its declaration line.
- **\`let\` / \`const\` / \`class\`** — hoisted but **not initialized**. From the top of the block to the declaration line they sit in the **TDZ**.

### Temporal Dead Zone

The TDZ is the span from entering the block to the line where the variable is actually declared. Any access to a \`let\`/\`const\` in that span throws \`ReferenceError\`. It's **intentional** — designed to catch accidental use of a variable before it's initialized.

Additionally, \`const\` requires an initializer at declaration and forbids reassignment. Note: this bans reassigning the variable itself, not deep immutability — you can still mutate the contents of an object held by a \`const\`.

\`\`\`js
console.log(a); // undefined (var hoisted)
var a = 1;

console.log(b); // ReferenceError — TDZ
let b = 2;

foo();          // 'ok' — function declaration hoisted entirely
function foo() { return 'ok'; }

typeof c;       // 'undefined' for an undeclared name
typeof d;       // ReferenceError if d is in TDZ — typeof won't save you
let d;
\`\`\`

Notice: normally \`typeof\` on a non-existent name safely returns \`'undefined'\`. But for a variable in the TDZ, even \`typeof\` throws \`ReferenceError\`.

### Practice

- \`var\` has **function** scope (visible throughout the function), while \`let\`/\`const\` have **block** scope (visible only within their \`{ }\`).
- In a loop, \`let\` creates a **fresh binding per iteration** — crucial for closures (each function "remembers" its own value, not one shared final value).
- A function expression (\`const f = () => {}\`) isn't hoisted as a body: only the **variable** \`f\` is hoisted, and the function itself becomes available only after the assignment runs.

\`\`\`js
let x = 'outer';
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
f();
\`\`\`

The second example shows the difference: \`var v\` inside the function is hoisted and equals \`undefined\` before assignment, no error. But the inner \`let x\` in the block creates a TDZ, so accessing it from the block top would throw — even though there's an outer \`x = 'outer'\`.

## ⚠️ Common pitfalls

- Assuming \`typeof\` is always safe: for a variable in the TDZ it also throws \`ReferenceError\`.
- Expecting to call a function expression before its assignment line — no, only the variable name is hoisted.
- An inner \`let\`/\`const\` shadows an outer same-named variable starting from the block top (TDZ), not just from the declaration line.

## 🎯 Key takeaways

- Hoisting lifts declarations; \`var\` initializes to \`undefined\`, function declarations lift entirely, \`let\`/\`const\`/\`class\` stay in the TDZ.
- TDZ: accessing a \`let\`/\`const\` before its declaration → \`ReferenceError\` (even via \`typeof\`).
- \`var\` is function-scoped; \`let\`/\`const\` are block-scoped; in a loop \`let\` gives a fresh binding per iteration.`
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
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['coercion', 'equality', 'type-conversion'],
    question: {
      ru: 'Как работает приведение типов и алгоритм абстрактного равенства `==`? Приведите коварные примеры.',
      en: 'How does type coercion and the abstract equality `==` algorithm work? Give tricky examples.'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что JavaScript — переводчик, который очень не любит говорить «стоп, у нас разные типы». Когда ты сравниваешь строку с числом или складываешь массив с булевым значением, он молча «переводит» одно значение в тип другого, чтобы операция всё-таки прошла. Этот автоматический перевод называется **приведением типов (coercion)**, и именно из-за него оператор \`==\` даёт неожиданные результаты. Разберёмся, по каким правилам идёт этот перевод, чтобы странные примеры перестали быть магией.

### Что такое приведение типов

Приведение типов — это автоматическое превращение значения из одного типа в другой (число ↔ строка ↔ булево). JS делает это через несколько внутренних операций:

- **ToPrimitive** — превращает объект в примитив (число или строку). У операции есть «подсказка» (\`hint\`): \`number\`, \`string\` или \`default\`. Сначала JS ищет метод \`Symbol.toPrimitive\`, если его нет — по очереди пробует \`valueOf()\` и \`toString()\`.
- **ToNumber** — превращает значение в число (\`"5"\` → \`5\`, \`true\` → \`1\`, \`""\` → \`0\`).
- **ToString** — превращает значение в строку.
- **ToBoolean** — превращает значение в \`true\`/\`false\` (например, в условии \`if\`).

Какое именно приведение применить, решает оператор. Ключевое правило: \`+\` рядом с любой строкой означает **склейку строк** (конкатенацию), а все остальные арифметические операторы (\`-\`, \`*\`, \`/\`) превращают операнды в **числа**.

### Как работает алгоритм \`==\` (абстрактное равенство)

Оператор \`==\` сравнивает значения **после** приведения. Его правила по шагам:

- \`null == undefined\` → \`true\`. Но \`null\` и \`undefined\` не равны **ничему другому** (это специальное правило).
- Число сравнивается со строкой → строка переводится в число.
- Булево сравнивается с чем угодно → булево переводится в число (\`true\` → \`1\`, \`false\` → \`0\`), затем сравнение повторяется.
- Объект сравнивается с примитивом → объект переводится в примитив через ToPrimitive.
- \`NaN\` (Not a Number, «не число») не равен ничему, даже самому себе.

### Коварные примеры

\`\`\`js
[] == ![]        // true: ![] -> false -> 0; [] -> '' -> 0
[] == ''         // true: [] -> ''
[] == 0          // true: '' -> 0
null == 0        // false (спец-правило: null равен только undefined)
'' == 0          // true
'0' == false     // true
NaN === NaN      // false
Object.is(NaN, NaN) // true
0 === -0         // true, но Object.is(0,-0) === false
\`\`\`

Разберём самый жуткий: \`[] == ![]\` даёт \`true\`. Сначала считается \`![]\` — пустой массив «истинный», поэтому \`![]\` это \`false\`, а \`false\` превращается в \`0\`. Слева пустой массив приводится к примитиву: \`[]\` → пустая строка \`''\` → число \`0\`. Итог: \`0 == 0\` → \`true\`.

### Своё приведение через Symbol.toPrimitive

Можно самому задать, как объект превращается в примитив:

\`\`\`js
const money = {
  amount: 10,
  [Symbol.toPrimitive](hint) {
    return hint === 'string' ? \`$\${this.amount}\` : this.amount;
  }
};
money + 5;          // 15   (хинт number/default -> число)
\`Price: \${money}\`;  // 'Price: $10' (хинт string -> строка)
money == 10;        // true (объект -> примитив 10)
\`\`\`

Здесь объект сам решает: в числовом контексте отдаёт число \`10\`, а в строковом — красивую строку \`$10\`.

## ⚠️ Подводные камни

- \`NaN === NaN\` даёт \`false\` — сравнивать на «не число» через \`==\`/\`===\` нельзя, используй \`Number.isNaN(x)\`.
- \`0 === -0\` даёт \`true\`, хотя это разные значения на уровне битов; отличить их поможет \`Object.is\`.
- \`null == 0\` — это \`false\`, а вот \`'' == 0\` и \`'0' == false\` — \`true\`. Логики тут мало, лучше не полагаться на неё.

## 🎯 Запомни

- По умолчанию всегда используй \`===\` (строгое равенство, без приведения) — это убирает почти все сюрпризы.
- Для проверки на \`NaN\` и \`-0\` бери \`Object.is\` (или \`Number.isNaN\`).
- Единственное оправданное применение \`==\`: \`x == null\` — короткая проверка сразу на \`null\` **и** \`undefined\`.`,
      en: `## 🧩 In plain words

Think of JavaScript as a translator that really hates saying "stop, these are different types." When you compare a string with a number, or add an array to a boolean, it silently "translates" one value into the other's type so the operation can go through. This automatic translation is called **type coercion**, and it is exactly why the \`==\` operator produces surprising results. Let's learn the rules of that translation so the weird examples stop feeling like magic.

### What type coercion is

Type coercion is the automatic conversion of a value from one type to another (number ↔ string ↔ boolean). JS does it through several internal operations:

- **ToPrimitive** — turns an object into a primitive (number or string). It takes a \`hint\`: \`number\`, \`string\`, or \`default\`. JS first looks for a \`Symbol.toPrimitive\` method; if absent, it tries \`valueOf()\` and then \`toString()\`.
- **ToNumber** — turns a value into a number (\`"5"\` → \`5\`, \`true\` → \`1\`, \`""\` → \`0\`).
- **ToString** — turns a value into a string.
- **ToBoolean** — turns a value into \`true\`/\`false\` (e.g. inside an \`if\`).

The operator decides which coercion to apply. Key rule: \`+\` next to any string means **string concatenation** (gluing strings), while all other arithmetic operators (\`-\`, \`*\`, \`/\`) convert their operands to **numbers**.

### How the \`==\` algorithm (abstract equality) works

The \`==\` operator compares values **after** coercion. Its rules, step by step:

- \`null == undefined\` → \`true\`. But \`null\` and \`undefined\` equal **nothing else** (a special rule).
- Number vs string → the string is converted to a number.
- Boolean vs anything → the boolean is converted to a number (\`true\` → \`1\`, \`false\` → \`0\`), then the comparison retries.
- Object vs primitive → the object is converted to a primitive via ToPrimitive.
- \`NaN\` (Not a Number) equals nothing, not even itself.

### Tricky examples

\`\`\`js
[] == ![]        // true: ![] -> false -> 0; [] -> '' -> 0
[] == ''         // true: [] -> ''
[] == 0          // true: '' -> 0
null == 0        // false (special rule: null only equals undefined)
'' == 0          // true
'0' == false     // true
NaN === NaN      // false
Object.is(NaN, NaN) // true
0 === -0         // true, but Object.is(0,-0) === false
\`\`\`

Let's unpack the scariest one: \`[] == ![]\` gives \`true\`. First \`![]\` is computed — an empty array is "truthy," so \`![]\` is \`false\`, and \`false\` becomes \`0\`. On the left, the empty array is coerced to a primitive: \`[]\` → empty string \`''\` → number \`0\`. Result: \`0 == 0\` → \`true\`.

### Custom coercion via Symbol.toPrimitive

You can define how your own object turns into a primitive:

\`\`\`js
const money = {
  amount: 10,
  [Symbol.toPrimitive](hint) {
    return hint === 'string' ? \`$\${this.amount}\` : this.amount;
  }
};
money + 5;          // 15   (number/default hint -> a number)
\`Price: \${money}\`;  // 'Price: $10' (string hint -> a string)
money == 10;        // true (object -> primitive 10)
\`\`\`

Here the object decides for itself: in a numeric context it returns the number \`10\`, in a string context a nicely formatted \`$10\`.

## ⚠️ Common pitfalls

- \`NaN === NaN\` is \`false\` — you cannot test for "not a number" with \`==\`/\`===\`; use \`Number.isNaN(x)\`.
- \`0 === -0\` is \`true\`, even though they are different at the bit level; \`Object.is\` can tell them apart.
- \`null == 0\` is \`false\`, yet \`'' == 0\` and \`'0' == false\` are \`true\`. There is little logic here — better not to rely on it.

## 🎯 Key takeaways

- By default always use \`===\` (strict equality, no coercion) — it removes almost all surprises.
- To check for \`NaN\` or \`-0\`, use \`Object.is\` (or \`Number.isNaN\`).
- The only justified use of \`==\`: \`x == null\` — a short check for both \`null\` **and** \`undefined\` at once.`
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
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['modules', 'esm', 'commonjs'],
    question: {
      ru: 'Чем ESM отличается от CommonJS? Объясните статичность импортов, live bindings и tree-shaking.',
      en: 'How does ESM differ from CommonJS? Explain static imports, live bindings, and tree-shaking.'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Модуль — это отдельный файл с кодом, который делится своими функциями и переменными с другими файлами. В JS есть две системы модулей: старая **CommonJS** (родилась в Node.js) и современная стандартная **ESM** (ES Modules). Главное отличие простое: CommonJS решает «что откуда взять» прямо во время работы программы, а ESM разбирает все связи **заранее**, ещё до запуска. Именно эта «заранее известная схема» позволяет инструментам сборки выкидывать неиспользуемый код.

### CommonJS (CJS)

- Загрузка **синхронная**: \`require('./file')\` останавливает выполнение, грузит модуль прямо сейчас и возвращает его.
- Экспорт — это **значение**. \`module.exports\` — обычный объект; при импорте ты получаешь его копию по присваиванию.
- Структура **динамическая**: \`require\` можно вызвать где угодно, даже внутри \`if\`, с путём, вычисленным в рантайме.
- Каждый модуль оборачивается в функцию с локальными \`module\`, \`exports\`, \`require\`, \`__dirname\`.

### ES Modules (ESM)

- **Статичная** структура: \`import\`/\`export\` пишутся на верхнем уровне и разбираются **до** выполнения кода. Именно это даёт tree-shaking.
- **Live bindings** («живые связки»): импорт — это не копия значения, а **ссылка** на переменную в исходном модуле. Изменилась переменная там — импортёр сразу видит новое значение.
- Загрузка асинхронная и идёт в несколько фаз: construction (найти и разобрать файлы) → instantiation (связать импорты с экспортами) → evaluation (выполнить код).
- Объявления \`import\` поднимаются наверх (hoisting); поддерживается **top-level await** — можно писать \`await\` прямо в теле модуля.

\`\`\`js
// counter.mjs
export let count = 0;
export const inc = () => count++;

// main.mjs
import { count, inc } from './counter.mjs';
inc();
console.log(count); // 1 — live binding, не копия
\`\`\`

Здесь \`count\` в \`main.mjs\` показал \`1\`, хотя менялся он внутри другого файла — потому что импорт это живая ссылка. В CommonJS так бы не вышло:

\`\`\`js
// lib.cjs
let count = 0;
module.exports = { count, inc: () => ++count };
// main.cjs
const { count, inc } = require('./lib.cjs');
inc();
console.log(count); // 0 — это КОПИЯ, а не живая связка
\`\`\`

### Tree-shaking

Tree-shaking — это когда сборщик (bundler) выкидывает из финального бандла экспорты, которые нигде не используются. Работает это **только** для ESM, потому что статичную структуру можно проанализировать, не запуская код. CJS обычно «непрозрачен» для такого анализа. Помогают флаг \`"sideEffects": false\` в package.json (обещание, что модули не делают ничего лишнего при импорте) и чистые модули без побочных эффектов на верхнем уровне.

### Взаимодействие (interop)

- CJS не может напрямую \`require\` ESM-модуль, потому что ESM асинхронен — нужен динамический \`import()\`.
- ESM может импортировать CJS, но именованные экспорты из CJS определяются эвристикой (движок «угадывает» их).
- Флаг \`__esModule\` — это артефакт транспиляции (Babel/TypeScript помечают им сгенерированные CJS-модули).

## ⚠️ Подводные камни

- Ждать «живого» значения от CommonJS-импорта бессмысленно — там всегда копия на момент require.
- Смешивать \`.mjs\`/\`.cjs\` и поле \`"type": "module"\` в package.json нужно аккуратно, иначе получишь ошибки вроде «require of ES Module is not supported».
- \`"sideEffects": false\` — это обещание; если модуль всё-таки что-то делает при импорте (например, регистрирует полифилл), tree-shaking может это вырезать и сломать приложение.

## 🎯 Запомни

- CommonJS: синхронный, копии значений, динамический — исторический формат Node.js.
- ESM: статичный, live bindings (живые ссылки), асинхронный — современный стандарт, и только он даёт tree-shaking.
- CJS и ESM совместимы, но с оговорками: CJS тянет ESM только через \`import()\`.`,
      en: `## 🧩 In plain words

A module is a separate file of code that shares its functions and variables with other files. JS has two module systems: the older **CommonJS** (born in Node.js) and the modern standard **ESM** (ES Modules). The key difference is simple: CommonJS figures out "what to grab from where" while the program is running, whereas ESM resolves all the connections **ahead of time**, before anything runs. That "known-in-advance map" is exactly what lets build tools throw away unused code.

### CommonJS (CJS)

- Loading is **synchronous**: \`require('./file')\` pauses execution, loads the module right now, and returns it.
- Exports are a **value**. \`module.exports\` is a plain object; on import you get a copy of it via assignment.
- Structure is **dynamic**: \`require\` can be called anywhere, even inside an \`if\`, with a path computed at runtime.
- Each module is wrapped in a function with local \`module\`, \`exports\`, \`require\`, \`__dirname\`.

### ES Modules (ESM)

- **Static** structure: \`import\`/\`export\` live at the top level and are parsed **before** the code runs. This is what enables tree-shaking.
- **Live bindings**: an import is not a copy of a value but a **reference** to the variable in the source module. If that variable changes there, the importer immediately sees the new value.
- Loading is asynchronous and happens in phases: construction (find and parse files) → instantiation (wire imports to exports) → evaluation (run the code).
- \`import\` declarations are hoisted; **top-level await** is supported — you can write \`await\` right in the module body.

\`\`\`js
// counter.mjs
export let count = 0;
export const inc = () => count++;

// main.mjs
import { count, inc } from './counter.mjs';
inc();
console.log(count); // 1 — live binding, not a copy
\`\`\`

Here \`count\` in \`main.mjs\` shows \`1\` even though it was changed inside another file — because the import is a live reference. In CommonJS this would not work:

\`\`\`js
// lib.cjs
let count = 0;
module.exports = { count, inc: () => ++count };
// main.cjs
const { count, inc } = require('./lib.cjs');
inc();
console.log(count); // 0 — a COPY, not a live binding
\`\`\`

### Tree-shaking

Tree-shaking is when the bundler drops exports that are used nowhere from the final bundle. It works **only** for ESM, because the static structure can be analyzed without running the code. CJS is usually opaque to such analysis. The \`"sideEffects": false\` flag in package.json (a promise that modules do nothing extra when imported) and pure modules without top-level side effects both help.

### Interop

- CJS cannot \`require\` an ESM module directly, because ESM is asynchronous — you need dynamic \`import()\`.
- ESM can import CJS, but named exports from CJS are detected heuristically (the engine "guesses" them).
- The \`__esModule\` flag is a transpilation artifact (Babel/TypeScript mark generated CJS modules with it).

## ⚠️ Common pitfalls

- Expecting a "live" value from a CommonJS import is pointless — it's always a copy taken at require time.
- Mixing \`.mjs\`/\`.cjs\` and the \`"type": "module"\` field in package.json needs care, or you get errors like "require of ES Module is not supported."
- \`"sideEffects": false\` is a promise; if a module actually does something on import (e.g. registers a polyfill), tree-shaking may cut it out and break the app.

## 🎯 Key takeaways

- CommonJS: synchronous, value copies, dynamic — the historical Node.js format.
- ESM: static, live bindings, asynchronous — the modern standard, and only it enables tree-shaking.
- CJS and ESM interoperate, but with caveats: CJS can pull in ESM only via \`import()\`.`
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
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['modules', 'dynamic-import', 'code-splitting'],
    question: {
      ru: 'Что такое динамический `import()` и для чего он нужен? Чем отличается от статического импорта?',
      en: 'What is dynamic `import()` and what is it for? How does it differ from a static import?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Обычный \`import\` наверху файла — как список покупок, который надо купить всё и сразу, ещё до входа в магазин. Динамический \`import()\` — это «схожу за этим товаром, только когда он реально понадобится». Он позволяет загрузить кусок кода **лениво**, во время работы программы, а не при старте. Благодаря этому начальная загрузка страницы становится легче и быстрее: тяжёлые части подтягиваются по требованию.

### Что такое динамический import()

Динамический \`import()\` — это **выражение**, которое возвращает Promise с пространством имён модуля (объектом со всеми его экспортами). В отличие от статического \`import\`:

- Его можно вызывать **условно** — внутри функций, обработчиков событий, веток \`if\`.
- Путь к модулю может быть **вычисляемым** (собранным из переменной).
- Модуль грузится **лениво**, в момент выполнения, а не заранее.
- Он создаёт точку **разбиения кода** (code splitting): сборщик выделяет модуль в отдельный файл-chunk, который скачивается отдельно.

### Зачем это нужно

- **Ленивая загрузка** (lazy loading) маршрутов и тяжёлых фич — графиков, редакторов, картографии.
- Уменьшение начального бандла → страница быстрее становится интерактивной (быстрее First Load).
- Загрузка по условию — полифилл только для старых браузеров, фича только для части пользователей в A/B-тесте.

\`\`\`js
button.addEventListener('click', async () => {
  const { renderChart } = await import('./chart.js'); // отдельный chunk
  renderChart(data);
});
\`\`\`

Здесь код графика скачается только после клика по кнопке — до этого он вообще не загружается.

### Нюансы

- Результат \`import()\` — это объект namespace; экспорт по умолчанию лежит в свойстве \`.default\`.
- Ошибку загрузки обязательно надо ловить (\`try/catch\` или \`.catch\`), потому что сеть может отвалиться.
- Сборщики понимают «магические комментарии» (\`/* webpackChunkName: "chart" */\`) — ими задают имя chunk-а и стратегию предзагрузки (prefetch/preload).
- В Angular ленивые standalone-компоненты и роуты подключаются через \`loadComponent\`/\`loadChildren\`, которые под капотом используют тот же \`import()\`.

\`\`\`js
async function loadLocale(lang) {
  try {
    // вычисляемый путь — возможен только с динамическим import()
    const mod = await import(\`./locales/\${lang}.js\`);
    return mod.default;
  } catch (e) {
    const fallback = await import('./locales/en.js');
    return fallback.default;
  }
}
\`\`\`

### Статический vs динамический

Статический импорт лучше для tree-shaking (сборщик видит всё заранее) и предсказуемости. Динамический — для производительности и опциональности. На практике их сочетают: ядро приложения грузят статично, а тяжёлое и редко нужное — динамически.

## ⚠️ Подводные камни

- Забыть про обработку ошибки: если chunk не скачался (плохая сеть, старая версия после деплоя), приложение упадёт без \`try/catch\`.
- Слишком мелкое дробление на chunk-и порождает много сетевых запросов и может замедлить, а не ускорить.
- Полностью вычисляемый путь (\`import(userInput)\`) сборщик не сможет заранее разложить на chunk-и — нужен хотя бы статичный «каркас» пути, как \`./locales/\${lang}.js\`.

## 🎯 Запомни

- \`import()\` — выражение, возвращает Promise; грузит модуль лениво и создаёт отдельный chunk.
- Главные сценарии: lazy loading маршрутов/фич, уменьшение начального бандла, условная загрузка.
- Всегда оборачивай в обработку ошибок и держи разумный размер chunk-ов.`,
      en: `## 🧩 In plain words

A regular \`import\` at the top of a file is like a shopping list you must buy in full before you even enter the store. A dynamic \`import()\` is more like "I'll grab that item only when I actually need it." It lets you load a chunk of code **lazily**, while the program is running, instead of at startup. Because of that, the initial page load becomes lighter and faster: heavy parts are pulled in on demand.

### What dynamic import() is

Dynamic \`import()\` is an **expression** that returns a Promise of the module namespace (an object with all its exports). Unlike a static \`import\`:

- It can be called **conditionally** — inside functions, event handlers, \`if\` branches.
- The module path can be **computed** (built from a variable).
- The module loads **lazily**, at runtime, not ahead of time.
- It creates a **code-splitting** point: the bundler puts the module into a separate chunk file that is downloaded on its own.

### Why it's useful

- **Lazy loading** of routes and heavy features — charts, editors, maps.
- Smaller initial bundle → the page becomes interactive faster (faster first load).
- Conditional loading — a polyfill only for old browsers, a feature only for part of your users in an A/B test.

\`\`\`js
button.addEventListener('click', async () => {
  const { renderChart } = await import('./chart.js'); // separate chunk
  renderChart(data);
});
\`\`\`

Here the chart code is downloaded only after the button is clicked — before that it isn't loaded at all.

### Nuances

- The result of \`import()\` is a namespace object; the default export sits under the \`.default\` property.
- Always catch load errors (\`try/catch\` or \`.catch\`), because the network can fail.
- Bundlers understand "magic comments" (\`/* webpackChunkName: "chart" */\`) — they set the chunk name and prefetch/preload strategy.
- In Angular, lazy standalone components and routes are wired via \`loadComponent\`/\`loadChildren\`, which use the same \`import()\` under the hood.

\`\`\`js
async function loadLocale(lang) {
  try {
    // computed path — only possible with dynamic import()
    const mod = await import(\`./locales/\${lang}.js\`);
    return mod.default;
  } catch (e) {
    const fallback = await import('./locales/en.js');
    return fallback.default;
  }
}
\`\`\`

### Static vs dynamic

Static imports are better for tree-shaking (the bundler sees everything ahead of time) and predictability. Dynamic imports are for performance and optionality. In practice you combine them: load the app core statically, and heavy, rarely needed parts dynamically.

## ⚠️ Common pitfalls

- Forgetting error handling: if a chunk fails to download (bad network, stale version after a deploy), the app crashes without a \`try/catch\`.
- Splitting into too many tiny chunks creates lots of network requests and can slow things down instead of speeding them up.
- A fully computed path (\`import(userInput)\`) can't be pre-split into chunks by the bundler — you need at least a static "skeleton" path, like \`./locales/\${lang}.js\`.

## 🎯 Key takeaways

- \`import()\` is an expression, returns a Promise; it loads a module lazily and creates a separate chunk.
- Main use cases: lazy loading routes/features, shrinking the initial bundle, conditional loading.
- Always wrap it in error handling and keep chunk sizes reasonable.`
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
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['iterators', 'generators', 'protocols'],
    question: {
      ru: 'Как работают итераторы и генераторы? Что такое протокол итерации и как генератор сохраняет состояние?',
      en: 'How do iterators and generators work? What is the iteration protocol and how does a generator preserve state?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Итератор — это как курсор, который умеет отдавать элементы коллекции по одному: «дай следующий... дай следующий... всё, элементы кончились». В JS есть договорённость (протокол), по которой любой объект может стать «перебираемым» этим курсором, и тогда его можно крутить в \`for...of\` или разложить через \`...\`. Генератор — это удобный способ написать такой курсор в виде функции, которая умеет **ставить себя на паузу** прямо посреди выполнения и продолжать с того же места позже.

### Протокол итерации

Протокол — это набор правил, которым должен следовать объект, чтобы его можно было перебирать. Он состоит из двух частей:

- **Iterable** (итерируемый) — объект, у которого есть метод \`[Symbol.iterator]()\`, возвращающий iterator.
- **Iterator** (итератор) — объект с методом \`next()\`, который при каждом вызове возвращает \`{ value, done }\`, где \`value\` — очередной элемент, а \`done\` — флаг «перебор закончен».

Этот протокол используют \`for...of\`, spread (\`...\`), деструктуризация и \`Array.from\`. Поэтому свои структуры данных можно сделать «итерируемыми», и они начнут работать во всех этих конструкциях.

### Генераторы

\`function*\` (со звёздочкой) создаёт особую функцию: при вызове она не выполняет тело сразу, а возвращает **генератор** — объект, который одновременно и iterator, и iterable.

Ключевое слово \`yield\` **приостанавливает** выполнение и «выдаёт» значение наружу, сохраняя весь кадр функции (локальные переменные и текущую позицию). Метод \`next(v)\` возобновляет работу, причём переданное \`v\` становится результатом того \`yield\`, на котором стояли. По сути это кооперативная многозадачность прямо в языке: функция сама решает, где «уступить управление».

\`\`\`js
function* range(start, end) {
  for (let i = start; i < end; i++) yield i;
}
[...range(0, 3)]; // [0, 1, 2]

function* gen() {
  const x = yield 'ask';    // пауза; x придёт из next(value)
  return x * 2;
}
const g = gen();
g.next();    // { value: 'ask', done: false }
g.next(10);  // { value: 20, done: true }
\`\`\`

Во втором генераторе первый \`next()\` доводит выполнение до \`yield 'ask'\` и замирает. Второй \`next(10)\` возобновляет: \`10\` подставляется вместо \`yield\`, и \`x\` становится \`10\`, а функция возвращает \`20\`.

### Под капотом: как хранится состояние

Обычная функция живёт на стеке вызовов и исчезает, как только вернула результат. Генератор же хранит своё **состояние выполнения** в куче (heap), а не на стеке — поэтому он переживает паузы и продолжается позже.

- \`yield*\` делегирует перебор другому итерируемому (как бы «вставляет» его элементы).
- Методы \`return()\` и \`throw()\` позволяют досрочно завершить генератор или бросить в него ошибку изнутри.

### Как сделать свою структуру итерируемой

\`\`\`js
class LinkedList {
  constructor() { this.head = null; }
  prepend(v) { this.head = { v, next: this.head }; return this; }
  *[Symbol.iterator]() {
    for (let n = this.head; n; n = n.next) yield n.v;
  }
}
const list = new LinkedList().prepend(3).prepend(2).prepend(1);
[...list];            // [1, 2, 3]
for (const v of list) { /* 1, 2, 3 */ }
\`\`\`

Мы объявили \`[Symbol.iterator]\` как генератор-метод — и связный список сразу заработал в \`for...of\` и spread.

### Где применяют

- Ленивые и даже бесконечные последовательности (значения считаются по требованию).
- Асинхронная итерация — \`for await...of\` вместе с \`async function*\`.
- Исторически — корутины для управления асинхронностью до появления async/await (например, redux-saga).

## ⚠️ Подводные камни

- Итератор одноразовый: после того как \`done: true\`, он исчерпан — перебрать заново нельзя, нужен новый.
- Не путай iterable и iterator: массив — iterable, но сам \`next()\` у него не вызовешь, пока не возьмёшь итератор через \`[Symbol.iterator]()\`.
- Бесконечный генератор в \`[...gen()]\` или \`for...of\` без выхода из цикла подвесит программу.

## 🎯 Запомни

- Iterable = есть \`[Symbol.iterator]()\`; iterator = есть \`next()\`, возвращающий \`{ value, done }\`.
- Генератор (\`function*\` + \`yield\`) — это функция-курсор, которая ставит себя на паузу и хранит состояние в куче.
- Протокол связывает всё воедино: реализуй \`[Symbol.iterator]\` — и \`for...of\`, spread, деструктуризация заработают на твоём объекте.`,
      en: `## 🧩 In plain words

An iterator is like a cursor that hands you a collection's elements one at a time: "give me the next... give me the next... okay, we're out of elements." JS has an agreement (a protocol) by which any object can become "iterable" by such a cursor, and then you can run it through \`for...of\` or spread it with \`...\`. A generator is a convenient way to write such a cursor as a function that can **pause itself** right in the middle of execution and resume from the same spot later.

### The iteration protocol

The protocol is a set of rules an object must follow to be iterable. It has two parts:

- **Iterable** — an object with a \`[Symbol.iterator]()\` method that returns an iterator.
- **Iterator** — an object with a \`next()\` method that, on each call, returns \`{ value, done }\`, where \`value\` is the next element and \`done\` is a "we're finished" flag.

This protocol is used by \`for...of\`, spread (\`...\`), destructuring, and \`Array.from\`. So you can make your own data structures iterable, and they'll start working in all of these constructs.

### Generators

\`function*\` (with an asterisk) creates a special function: when called, it doesn't run the body immediately but returns a **generator** — an object that is both an iterator and an iterable.

The \`yield\` keyword **suspends** execution and "hands out" a value, preserving the whole function frame (locals and current position). The \`next(v)\` method resumes, and the passed \`v\` becomes the result of the \`yield\` you were paused on. This is essentially cooperative multitasking built into the language: the function itself decides where to "yield control."

\`\`\`js
function* range(start, end) {
  for (let i = start; i < end; i++) yield i;
}
[...range(0, 3)]; // [0, 1, 2]

function* gen() {
  const x = yield 'ask';    // pauses; x comes from next(value)
  return x * 2;
}
const g = gen();
g.next();    // { value: 'ask', done: false }
g.next(10);  // { value: 20, done: true }
\`\`\`

In the second generator, the first \`next()\` runs up to \`yield 'ask'\` and freezes. The second \`next(10)\` resumes: \`10\` is substituted for the \`yield\`, so \`x\` becomes \`10\`, and the function returns \`20\`.

### Under the hood: how state is preserved

An ordinary function lives on the call stack and vanishes as soon as it returns. A generator, however, stores its **execution state** on the heap, not the stack — which is why it survives suspensions and can continue later.

- \`yield*\` delegates iteration to another iterable (it "splices in" that iterable's elements).
- The \`return()\` and \`throw()\` methods let you finish a generator early or inject an error from the outside.

### Making your own structure iterable

\`\`\`js
class LinkedList {
  constructor() { this.head = null; }
  prepend(v) { this.head = { v, next: this.head }; return this; }
  *[Symbol.iterator]() {
    for (let n = this.head; n; n = n.next) yield n.v;
  }
}
const list = new LinkedList().prepend(3).prepend(2).prepend(1);
[...list];            // [1, 2, 3]
for (const v of list) { /* 1, 2, 3 */ }
\`\`\`

We declared \`[Symbol.iterator]\` as a generator method — and the linked list immediately works in \`for...of\` and spread.

### Where they're used

- Lazy and even infinite sequences (values are computed on demand).
- Async iteration — \`for await...of\` together with \`async function*\`.
- Historically — coroutines for managing async before async/await existed (e.g. redux-saga).

## ⚠️ Common pitfalls

- An iterator is single-use: once \`done: true\`, it's exhausted — you can't re-iterate it, you need a fresh one.
- Don't confuse iterable and iterator: an array is iterable, but you can't call \`next()\` on it directly until you get its iterator via \`[Symbol.iterator]()\`.
- An infinite generator in \`[...gen()]\` or a \`for...of\` without an exit will hang the program.

## 🎯 Key takeaways

- Iterable = has \`[Symbol.iterator]()\`; iterator = has \`next()\` returning \`{ value, done }\`.
- A generator (\`function*\` + \`yield\`) is a cursor-function that pauses itself and stores its state on the heap.
- The protocol ties it all together: implement \`[Symbol.iterator]\` and \`for...of\`, spread, and destructuring start working on your object.`
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
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['symbol', 'well-known-symbols', 'metaprogramming'],
    question: {
      ru: 'Что такое Symbol и для чего нужны well-known symbols? Чем отличается Symbol от Symbol.for?',
      en: 'What is a Symbol and what are well-known symbols for? How does Symbol differ from Symbol.for?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что тебе нужен ключ от ящика, который **точно ни с чьим другим не совпадёт**, даже если кто-то сделает ключ с такой же надписью. Вот это и есть \`Symbol\` — гарантированно уникальная «метка». Её удобно использовать как имя свойства объекта, когда ты боишься случайно затереть чужое поле.

А ещё в JavaScript есть набор специальных «служебных» символов, которыми движок спрашивает у объекта: «а как тебя перебирать в цикле?», «а как тебя превратить в число?». Отвечая на эти вопросы, ты настраиваешь поведение объекта изнутри.

### Что такое Symbol

\`Symbol()\` создаёт **уникальный неизменяемый** примитив (примитив — простое значение вроде числа или строки, не объект). Каждый вызов даёт новое значение, даже если описание одинаковое:

\`\`\`js
Symbol('a') === Symbol('a'); // false — это два разных символа
\`\`\`

Главное применение — **неконфликтующий ключ свойства**. Символьные ключи не пересекаются со строковыми и «прячутся» от обычного перебора: их не видно в \`for...in\`, \`Object.keys\` и \`JSON.stringify\`. Но они не совсем невидимы — их можно достать через \`Object.getOwnPropertySymbols\` и \`Reflect.ownKeys\`.

\`\`\`js
const id = Symbol('id');
const user = { name: 'Ann', [id]: 42 };

Object.keys(user);                    // ['name'] — символ скрыт
JSON.stringify(user);                 // '{"name":"Ann"}'
Object.getOwnPropertySymbols(user);   // [Symbol(id)]
user[id];                             // 42
\`\`\`

### Symbol против Symbol.for

Это два разных способа получить символ:

- \`Symbol('x')\` — **всегда новый**, локальный. Никто, кроме тебя, до него не доберётся, если ты сам не передашь ссылку.
- \`Symbol.for('x')\` — берёт символ из **глобального реестра** по строковому ключу. Реестр — общий «журнал» символов на всю программу. Повторный вызов с тем же ключом вернёт **тот же самый** символ, даже между разными realm/iframe (изолированными средами выполнения). Обратная функция \`Symbol.keyFor(sym)\` возвращает ключ для реестрового символа.

\`\`\`js
Symbol('a') === Symbol('a');         // false — каждый уникален
Symbol.for('a') === Symbol.for('a'); // true  — один из реестра
\`\`\`

### Well-known symbols (общеизвестные символы)

Это встроенные символы, которыми движок **настраивает поведение объекта** — точки расширения внутренних протоколов. Кладёшь метод под таким ключом — и меняешь то, как объект ведёт себя в базовых операциях:

- \`Symbol.iterator\` — делает объект итерируемым (работает \`for...of\`).
- \`Symbol.asyncIterator\` — то же для \`for await...of\`.
- \`Symbol.hasInstance\` — кастомизация проверки \`instanceof\`.
- \`Symbol.toPrimitive\` — управляет приведением объекта к примитиву (к числу или строке).
- \`Symbol.toStringTag\` — задаёт тег, который показывает \`Object.prototype.toString\`.

\`\`\`js
class Temp {
  constructor(c) { this.c = c; }
  [Symbol.toPrimitive](hint) {
    // hint говорит, какой тип нужен: 'string', 'number' или 'default'
    return hint === 'string' ? this.c + '°C' : this.c;
  }
}
\`\${+new Temp(20)}\`; // '20' — здесь нужен number, вернулось число
\`\`\`

## ⚠️ Подводные камни

- Символьные ключи не «полностью приватны»: \`Object.getOwnPropertySymbols\` и \`Reflect.ownKeys\` их находят.
- \`Symbol('a') === Symbol('a')\` — это \`false\`; если нужен общий символ, используй \`Symbol.for\`.
- \`Symbol.keyFor\` работает только с реестровыми символами (из \`Symbol.for\`); для обычного \`Symbol()\` вернёт \`undefined\`.

## 🎯 Запомни

- \`Symbol()\` — гарантированно уникальная метка, удобная как неконфликтующий скрытый ключ свойства.
- \`Symbol('x')\` всегда новый и локальный; \`Symbol.for('x')\` — общий из глобального реестра (один и тот же при каждом вызове).
- Well-known symbols (\`Symbol.iterator\`, \`Symbol.toPrimitive\` и др.) — рычаги, которыми ты настраиваешь встроенное поведение объекта.`,
      en: `## 🧩 In plain words

Imagine you need a key for a locker that is **guaranteed not to match anyone else's** — even if someone cuts a key with the exact same label on it. That is what a \`Symbol\` is: a guaranteed-unique tag. It is handy as a property name when you are afraid of accidentally overwriting someone else's field.

JavaScript also ships a set of special "service" symbols the engine uses to ask an object questions like "how should I loop over you?" or "how do I turn you into a number?". By answering those questions you configure the object's behavior from the inside.

### What a Symbol is

\`Symbol()\` creates a **unique, immutable** primitive (a primitive is a simple value like a number or string, not an object). Every call yields a new value, even with the same description:

\`\`\`js
Symbol('a') === Symbol('a'); // false — two different symbols
\`\`\`

Its main use is as a **collision-free property key**. Symbol keys don't clash with string keys and "hide" from ordinary enumeration: they don't show up in \`for...in\`, \`Object.keys\`, or \`JSON.stringify\`. But they aren't fully invisible — you can retrieve them via \`Object.getOwnPropertySymbols\` and \`Reflect.ownKeys\`.

\`\`\`js
const id = Symbol('id');
const user = { name: 'Ann', [id]: 42 };

Object.keys(user);                    // ['name'] — symbol hidden
JSON.stringify(user);                 // '{"name":"Ann"}'
Object.getOwnPropertySymbols(user);   // [Symbol(id)]
user[id];                             // 42
\`\`\`

### Symbol vs Symbol.for

These are two different ways to get a symbol:

- \`Symbol('x')\` — **always new**, local. Nobody but you can reach it unless you hand over the reference.
- \`Symbol.for('x')\` — fetches a symbol from the **global registry** by a string key. The registry is a shared "log" of symbols across the whole program. Calling it again with the same key returns the **same** symbol, even across realms/iframes (isolated execution environments). The reverse function \`Symbol.keyFor(sym)\` returns the key for a registry symbol.

\`\`\`js
Symbol('a') === Symbol('a');         // false — each is unique
Symbol.for('a') === Symbol.for('a'); // true  — one from the registry
\`\`\`

### Well-known symbols

These are built-in symbols the engine uses to **configure object behavior** — extension points for internal protocols. Put a method under such a key and you change how the object behaves in fundamental operations:

- \`Symbol.iterator\` — makes the object iterable (\`for...of\` works).
- \`Symbol.asyncIterator\` — the same for \`for await...of\`.
- \`Symbol.hasInstance\` — customize the \`instanceof\` check.
- \`Symbol.toPrimitive\` — control how the object is coerced to a primitive (a number or a string).
- \`Symbol.toStringTag\` — set the tag that \`Object.prototype.toString\` shows.

\`\`\`js
class Temp {
  constructor(c) { this.c = c; }
  [Symbol.toPrimitive](hint) {
    // hint tells which type is wanted: 'string', 'number', or 'default'
    return hint === 'string' ? this.c + '°C' : this.c;
  }
}
\`\${+new Temp(20)}\`; // '20' — number hint here, a number was returned
\`\`\`

## ⚠️ Common pitfalls

- Symbol keys aren't "fully private": \`Object.getOwnPropertySymbols\` and \`Reflect.ownKeys\` find them.
- \`Symbol('a') === Symbol('a')\` is \`false\`; if you need a shared symbol, use \`Symbol.for\`.
- \`Symbol.keyFor\` only works with registry symbols (from \`Symbol.for\`); for a plain \`Symbol()\` it returns \`undefined\`.

## 🎯 Key takeaways

- \`Symbol()\` is a guaranteed-unique tag, handy as a collision-free hidden property key.
- \`Symbol('x')\` is always new and local; \`Symbol.for('x')\` is shared from the global registry (identical every call).
- Well-known symbols (\`Symbol.iterator\`, \`Symbol.toPrimitive\`, etc.) are the levers you use to configure an object's built-in behavior.`
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
    category: 'javascript-typescript',
    level: 'Expert',
    tags: ['proxy', 'reflect', 'metaprogramming'],
    question: {
      ru: 'Как работают Proxy и Reflect? Какие ловушки (traps) бывают и почему Reflect важен внутри них?',
      en: 'How do Proxy and Reflect work? What traps exist and why is Reflect important inside them?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь секретаря, который сидит перед дверью в кабинет (объект). Любой, кто хочет что-то взять со стола, положить на стол или спросить «есть ли тут такое?», сначала говорит с секретарём. Секретарь может пропустить запрос как есть, а может вмешаться: проверить, залогировать, подменить ответ. Вот этот секретарь — и есть \`Proxy\`.

А \`Reflect\` — это «инструкция по умолчанию»: набор готовых методов, которыми секретарь выполняет запрос ровно так, как это сделал бы объект сам, без секретаря. Внутри перехватчиков это спасает от ошибок.

### Proxy и ловушки (traps)

\`new Proxy(target, handler)\` создаёт обёртку вокруг \`target\` (исходного объекта). В \`handler\` ты описываешь **traps** — функции-перехватчики для **фундаментальных операций** над объектом:

- \`get\`, \`set\`, \`has\`, \`deleteProperty\` — чтение, запись, проверка \`in\`, удаление.
- \`apply\` (вызов функции), \`construct\` (вызов через \`new\`).
- \`ownKeys\`, \`getOwnPropertyDescriptor\`, \`defineProperty\` — работа со списком и описанием свойств.
- \`getPrototypeOf\`, \`setPrototypeOf\` — работа с прототипом.

Если trap не задан — операция идёт к \`target\` напрямую, как обычно.

### Reflect и зачем он внутри trap

\`Reflect\` — объект со **статическими методами**, повторяющими внутренние операции: \`Reflect.get\`, \`Reflect.set\`, \`Reflect.has\`, \`Reflect.apply\`, \`Reflect.construct\` и т.д. Внутри trap он нужен по трём причинам:

1. Удобно **переадресовать** операцию к \`target\` поведением по умолчанию — не переписывая логику вручную.
2. Правильно прокидывает **receiver** — объект, на котором операция была реально вызвана. Это критично для геттеров/сеттеров в цепочке прототипов: без верного receiver \`this\` внутри геттера укажет не туда.
3. Возвращает **осмысленный результат** (например, \`Reflect.set\` возвращает \`boolean\` — удалось ли), вместо того чтобы бросать исключение, как это делает старый \`Object.defineProperty\`.

\`\`\`js
const user = { firstName: 'Ann', lastName: 'Lee' };
const proxy = new Proxy(user, {
  get(target, prop, receiver) {
    if (prop === 'fullName') {
      return target.firstName + ' ' + target.lastName;
    }
    return Reflect.get(target, prop, receiver); // правильный receiver
  }
});
proxy.fullName; // 'Ann Lee'
\`\`\`

Trap \`set\` — типичный пример валидации на запись:

\`\`\`js
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
// stock.apples = -1; // RangeError: apples must be >= 0
\`\`\`

### Инварианты и цена

Proxy обязан соблюдать **инварианты** target — правила, которые движок гарантирует для любого объекта. Нельзя «соврать» о non-configurable свойстве (свойстве, помеченном как неудаляемое/ненастраиваемое): попытка вернуть из trap противоречивый ответ даст \`TypeError\`.

Ещё Proxy **не оптимизируется** движком так же хорошо, как обычные объекты — на «горячих» путях (в коде, который выполняется очень часто) это может замедлить работу.

Где применяют: реактивность (Vue 3, signals — автоматическое отслеживание чтений/записей), валидация, логирование, виртуальные и observable-объекты, защита (read-only обёртки).

## ⚠️ Подводные камни

- Забыть \`Reflect.get(target, prop, receiver)\` и написать \`target[prop]\` — потеряешь правильный receiver, геттеры в цепочке прототипов сломаются.
- Попытка нарушить инвариант non-configurable свойства → \`TypeError\` в рантайме.
- Proxy оборачивает конкретный объект; ссылки на исходный \`target\` в обход прокси не перехватываются.
- На критичных по скорости участках прокси может ощутимо просесть по производительности.

## 🎯 Запомни

- \`Proxy\` перехватывает фундаментальные операции над объектом через traps (\`get\`, \`set\`, \`apply\`, \`construct\` и др.).
- \`Reflect\` внутри trap делает поведение по умолчанию корректным: передаёт receiver и возвращает осмысленный результат.
- Плата за гибкость — обязательное соблюдение инвариантов и возможная потеря производительности на горячих путях.`,
      en: `## 🧩 In plain words

Picture a secretary sitting in front of an office door (the object). Anyone who wants to take something off the desk, put something on it, or ask "is this here?" talks to the secretary first. The secretary can pass the request through unchanged — or step in: validate, log, swap the answer. That secretary is a \`Proxy\`.

And \`Reflect\` is the "default instruction manual": a set of ready-made methods the secretary uses to carry out the request exactly as the object would have on its own, with no secretary in the way. Inside the interceptors this saves you from subtle bugs.

### Proxy and traps

\`new Proxy(target, handler)\` creates a wrapper around \`target\` (the original object). In \`handler\` you define **traps** — interceptor functions for **fundamental operations** on the object:

- \`get\`, \`set\`, \`has\`, \`deleteProperty\` — read, write, the \`in\` check, delete.
- \`apply\` (function call), \`construct\` (call via \`new\`).
- \`ownKeys\`, \`getOwnPropertyDescriptor\`, \`defineProperty\` — working with the list and description of properties.
- \`getPrototypeOf\`, \`setPrototypeOf\` — working with the prototype.

If a trap is absent, the operation goes to \`target\` directly, as usual.

### Reflect and why it belongs inside traps

\`Reflect\` is an object of **static methods** mirroring internal operations: \`Reflect.get\`, \`Reflect.set\`, \`Reflect.has\`, \`Reflect.apply\`, \`Reflect.construct\`, and so on. Inside a trap you want it for three reasons:

1. It's a convenient way to **forward** the operation to \`target\` with default behavior — without hand-rewriting the logic.
2. It correctly threads the **receiver** — the object the operation was actually invoked on. This is critical for getters/setters along the prototype chain: without the right receiver, \`this\` inside a getter points to the wrong place.
3. It returns a **meaningful result** (e.g. \`Reflect.set\` returns a \`boolean\` — did it succeed) instead of throwing like the older \`Object.defineProperty\`.

\`\`\`js
const user = { firstName: 'Ann', lastName: 'Lee' };
const proxy = new Proxy(user, {
  get(target, prop, receiver) {
    if (prop === 'fullName') {
      return target.firstName + ' ' + target.lastName;
    }
    return Reflect.get(target, prop, receiver); // correct receiver
  }
});
proxy.fullName; // 'Ann Lee'
\`\`\`

A \`set\` trap is the classic write-validation example:

\`\`\`js
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
// stock.apples = -1; // RangeError: apples must be >= 0
\`\`\`

### Invariants and cost

A Proxy must respect target **invariants** — rules the engine guarantees for any object. It can't "lie" about a non-configurable property (a property marked as non-deletable / non-reconfigurable): returning a contradictory answer from a trap throws a \`TypeError\`.

Proxies are also **not optimized** by the engine as well as plain objects — on hot paths (code that runs very frequently) this may slow things down.

Where it's used: reactivity (Vue 3, signals — automatic tracking of reads/writes), validation, logging, virtual and observable objects, protection (read-only wrappers).

## ⚠️ Common pitfalls

- Forgetting \`Reflect.get(target, prop, receiver)\` and writing \`target[prop]\` loses the correct receiver — getters along the prototype chain break.
- Trying to violate a non-configurable property's invariant → a runtime \`TypeError\`.
- A Proxy wraps one specific object; references to the original \`target\` that bypass the proxy aren't intercepted.
- On speed-critical sections a proxy can noticeably hurt performance.

## 🎯 Key takeaways

- \`Proxy\` intercepts fundamental operations on an object via traps (\`get\`, \`set\`, \`apply\`, \`construct\`, etc.).
- \`Reflect\` inside a trap makes the default behavior correct: it threads the receiver and returns a meaningful result.
- The price of the flexibility is mandatory invariant compliance and possible performance loss on hot paths.`
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
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['structured-clone', 'deep-copy', 'serialization'],
    question: {
      ru: 'Что такое structuredClone и как он работает? Чем отличается от JSON-копии и spread?',
      en: 'What is structuredClone and how does it work? How does it differ from JSON copy and spread?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Копировать объект — это как копировать документ. Можно сделать «ссылку на папку» (изменил копию — изменился оригинал), а можно настоящую ксерокопию, где всё скопировано насквозь и живёт отдельно. \`structuredClone\` — это встроенная «настоящая ксерокопия» для JavaScript-объектов: глубокая копия, которая честно копирует даже сложные вещи вроде \`Date\`, \`Map\`, \`Set\` и даже объекты, которые ссылаются сами на себя.

Раньше для этого хитрили через \`JSON.parse(JSON.stringify(x))\`, но этот способ по дороге теряет и ломает половину типов.

### Что такое structuredClone

\`structuredClone(value)\` — встроенная функция **глубокого клонирования** по алгоритму **structured clone**. Это тот же алгоритм, которым пользуются \`postMessage\`, IndexedDB и Web Workers, когда передают данные. Он рекурсивно обходит весь **граф объекта** (объект и всё, на что он ссылается) и копирует каждый узел.

### Чем лучше JSON-копии

Приём \`JSON.parse(JSON.stringify(x))\` многое теряет или портит:

- \`undefined\`, функции и \`Symbol\` — просто выпадают.
- \`Date\` превращается в строку, а \`NaN\` и \`Infinity\` — в \`null\`.
- **Циклические ссылки** (когда объект ссылается сам на себя) — сразу исключение.
- \`Map\`, \`Set\`, \`ArrayBuffer\`, \`TypedArray\`, \`RegExp\`, \`Blob\` — не поддерживаются.

\`structuredClone\` всё это делает правильно: корректно клонирует \`Date\`, \`Map\`, \`Set\`, \`RegExp\`, \`ArrayBuffer\`, типизированные массивы и **сохраняет циклы**.

\`\`\`js
const orig = { d: new Date(), set: new Set([1, 2]), nested: {} };
orig.self = orig;                 // цикл: объект ссылается на себя
const copy = structuredClone(orig);
copy.self === copy;               // true — цикл сохранён
copy.set instanceof Set;          // true — это по-прежнему Set
copy.d !== orig.d;                // true — новый объект Date, глубокая копия
\`\`\`

### Ограничения

\`structuredClone\` не всесилен:

- **Функции**, **DOM-узлы** (большинство), объекты с прототипом класса → либо ошибка \`DataCloneError\`, либо потеря прототипа: клон получит обычный \`Object.prototype\`, то есть перестанет быть экземпляром твоего класса.
- Геттеры/сеттеры и дескрипторы свойств не переносятся как поведение — копируются только текущие значения.
- Symbol-ключи не клонируются.

### Чем отличается от spread

\`{...obj}\` и \`Object.assign\` — **поверхностные** (shallow) копии: они копируют только верхний уровень, а вложенные объекты остаются общими по ссылке. Меняешь вложенный объект в копии — меняется и в оригинале. Для глубокого клонирования сложных структур \`structuredClone\` — лучший встроенный выбор.

## ⚠️ Подводные камни

- Клон объекта класса теряет прототип и перестаёт быть \`instanceof\` этого класса.
- Функции и большинство DOM-узлов вызовут \`DataCloneError\`.
- Геттеры превращаются в обычные значения; методы, заданные на прототипе, не переносятся.
- Для простого плоского объекта \`structuredClone\` избыточен — spread быстрее.

## 🎯 Запомни

- \`structuredClone\` — встроенное глубокое клонирование, которое понимает \`Date\`, \`Map\`, \`Set\`, \`RegExp\`, типизированные массивы и циклы.
- Оно надёжнее JSON-трюка, который теряет \`undefined\`, функции, \`Symbol\` и падает на циклах.
- Spread и \`Object.assign\` копируют только поверхностно — вложенные объекты остаются общими.`,
      en: `## 🧩 In plain words

Copying an object is like copying a document. You can make a "shortcut to the folder" (change the copy and the original changes too), or you can make a real photocopy where everything is copied all the way through and lives separately. \`structuredClone\` is JavaScript's built-in "real photocopy": a deep copy that faithfully clones even tricky things like \`Date\`, \`Map\`, \`Set\`, and even objects that point back to themselves.

People used to fake this with \`JSON.parse(JSON.stringify(x))\`, but that trick loses and mangles half the types along the way.

### What structuredClone is

\`structuredClone(value)\` is a built-in **deep clone** using the **structured clone** algorithm. It's the same algorithm \`postMessage\`, IndexedDB, and Web Workers use when they move data around. It recursively walks the whole **object graph** (the object plus everything it references) and copies each node.

### Why it beats the JSON copy

The \`JSON.parse(JSON.stringify(x))\` trick loses or breaks a lot:

- \`undefined\`, functions, and \`Symbol\` — simply dropped.
- \`Date\` turns into a string, and \`NaN\`/\`Infinity\` turn into \`null\`.
- **Circular references** (an object referencing itself) — instant throw.
- \`Map\`, \`Set\`, \`ArrayBuffer\`, \`TypedArray\`, \`RegExp\`, \`Blob\` — unsupported.

\`structuredClone\` handles all of this correctly: it clones \`Date\`, \`Map\`, \`Set\`, \`RegExp\`, \`ArrayBuffer\`, typed arrays, and **preserves cycles**.

\`\`\`js
const orig = { d: new Date(), set: new Set([1, 2]), nested: {} };
orig.self = orig;                 // cycle: object references itself
const copy = structuredClone(orig);
copy.self === copy;               // true — cycle preserved
copy.set instanceof Set;          // true — still a Set
copy.d !== orig.d;                // true — a new Date object, deep copy
\`\`\`

### Limitations

\`structuredClone\` isn't all-powerful:

- **Functions**, **DOM nodes** (most), class-prototyped objects → either a \`DataCloneError\` or prototype loss: the clone gets a plain \`Object.prototype\`, so it stops being an instance of your class.
- Getters/setters and property descriptors aren't carried over as behavior — only the current values are copied.
- Symbol keys aren't cloned.

### How it differs from spread

\`{...obj}\` and \`Object.assign\` are **shallow** copies: they copy only the top level, and nested objects stay shared by reference. Change a nested object in the copy and it changes in the original too. For deep-cloning complex structures, \`structuredClone\` is the best built-in choice.

## ⚠️ Common pitfalls

- A cloned class instance loses its prototype and is no longer \`instanceof\` that class.
- Functions and most DOM nodes throw \`DataCloneError\`.
- Getters collapse into plain values; methods defined on the prototype aren't carried over.
- For a simple flat object \`structuredClone\` is overkill — spread is faster.

## 🎯 Key takeaways

- \`structuredClone\` is a built-in deep clone that understands \`Date\`, \`Map\`, \`Set\`, \`RegExp\`, typed arrays, and cycles.
- It's more reliable than the JSON trick, which drops \`undefined\`, functions, \`Symbol\`, and throws on cycles.
- Spread and \`Object.assign\` copy only shallowly — nested objects remain shared.`
    }
  },
  {
    id: 'jsts-016',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['generics', 'constraints', 'type-inference'],
    question: {
      ru: 'Как работают дженерики и ограничения (`extends`) в TypeScript? Объясните вывод типов и значения по умолчанию.',
      en: 'How do generics and constraints (`extends`) work in TypeScript? Explain type inference and defaults.'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Дженерик — это как форма для выпечки, в которую можно залить что угодно: тесто, желе, шоколад. Форма одна, а результат повторяет то, что ты в неё положил. В TypeScript дженерик — это функция или тип с «дыркой под тип» \`T\`: ты пишешь код один раз, а он работает с любым типом, сохраняя связь «что положили — то и получим».

Это лучше, чем \`any\` (тип «что угодно, проверок нет»): с \`any\` TypeScript перестаёт тебя защищать, а с дженериком — помнит конкретный тип и ловит ошибки.

### Что такое дженерики

Дженерик — это **параметризация по типу**. Функция, класс или тип работает с произвольным \`T\`, но сохраняет связь между входом и выходом: если на вход пришёл \`string\`, на выходе тоже будет \`string\`, а не «что-то неизвестное». Это даёт типобезопасность без потери гибкости.

### Ограничения (constraints) через extends

\`<T extends U>\` требует, чтобы \`T\` был **подтипом** \`U\` (то есть \`T\` обязан иметь всё, что есть у \`U\`). Благодаря этому внутри функции можно безопасно обращаться к гарантированным членам \`U\`. Частый паттерн — \`keyof\` (тип «все ключи объекта») для безопасного доступа по ключу:

\`\`\`ts
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { id: 1, name: 'Ann' };
pluck(user, 'name'); // string
pluck(user, 'age');  // ошибка: 'age' не является keyof user
\`\`\`

Здесь \`K extends keyof T\` не даёт передать несуществующий ключ, а \`T[K]\` (тип значения по этому ключу) точно описывает, что вернётся.

### Вывод типов (inference)

TypeScript сам **выводит** \`T\` из аргументов вызова — обычно явно указывать тип не нужно. При выводе он **расширяет** литералы: конкретное \`'a'\` становится общим \`string\`, если ты не попросил обратного через \`as const\` или \`const\`-параметр типа. Если кандидатов на \`T\` несколько, TS объединяет их в наиболее общий подходящий тип (best common type).

### Значения по умолчанию

\`<T = string>\` задаёт тип по умолчанию — он подставится, если \`T\` нельзя вывести или его не указали явно. Это удобно для гибких API. Пример дженерика с ограничением и дефолтом сразу:

\`\`\`ts
function merge<T extends object, U extends object = {}>(a: T, b: U): T & U {
  return { ...a, ...b };
}
const r = merge({ id: 1 }, { name: 'Ann' });
// r: { id: number } & { name: string }
r.id;   // number
r.name; // string
\`\`\`

\`T & U\` — тип пересечения: объект, у которого есть поля и из \`T\`, и из \`U\`.

### Тонкости

- **Не вводи параметр типа, который используется всего один раз** — толку от него нет, это «замаскированный \`any\`».
- Constraints могут включать условные и маппинг-типы для сложной проверки формы данных.
- \`const\`-параметры типа (TS 5.0) сохраняют узкие литеральные типы при выводе (не расширяют \`'a'\` до \`string\`) — это отдельная тема.

## ⚠️ Подводные камни

- При выводе литералы расширяются: без \`as const\` \`'red'\` станет \`string\`, и узкий тип потеряется.
- Параметр типа, встречающийся один раз в сигнатуре, ничего не связывает — обычно его стоит убрать.
- \`<T = ...>\` (дефолт) и \`<T extends ...>\` (ограничение) — разные вещи; можно совмещать: \`<T extends U = D>\`.

## 🎯 Запомни

- Дженерик \`T\` сохраняет связь вход-выход и даёт типобезопасность там, где \`any\` её теряет.
- \`T extends U\` ограничивает \`T\` подтипами \`U\`; частый приём — \`K extends keyof T\` для безопасного доступа по ключу.
- TS выводит типы сам и расширяет литералы; \`<T = Default>\` задаёт запасной тип, когда вывод невозможен.`,
      en: `## 🧩 In plain words

A generic is like a baking mold you can pour anything into: batter, jelly, chocolate. The mold is one shape, but the result matches whatever you put in. In TypeScript a generic is a function or type with a "type-shaped hole" \`T\`: you write the code once and it works with any type while preserving the relation "what went in is what comes out".

This beats \`any\` (the "anything goes, no checks" type): with \`any\` TypeScript stops protecting you, but with a generic it remembers the concrete type and catches mistakes.

### What generics are

A generic is **parameterization by type**. A function, class, or type works with an arbitrary \`T\` but preserves the relation between input and output: if a \`string\` comes in, a \`string\` comes out — not "something unknown". This gives type safety without losing flexibility.

### Constraints via extends

\`<T extends U>\` requires \`T\` to be a **subtype** of \`U\` (meaning \`T\` must have everything \`U\` has). Because of that, inside the function you can safely access \`U\`'s guaranteed members. A common pattern is \`keyof\` (the type "all keys of an object") for safe key access:

\`\`\`ts
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { id: 1, name: 'Ann' };
pluck(user, 'name'); // string
pluck(user, 'age');  // error: 'age' is not a keyof user
\`\`\`

Here \`K extends keyof T\` blocks passing a non-existent key, and \`T[K]\` (the type of the value at that key) precisely describes what comes back.

### Inference

TypeScript **infers** \`T\` from the call arguments itself — usually you don't annotate the type explicitly. During inference it **widens** literals: a specific \`'a'\` becomes the general \`string\` unless you ask otherwise with \`as const\` or a \`const\` type parameter. If there are several candidates for \`T\`, TS unifies them into the best common type.

### Defaults

\`<T = string>\` sets a default type — it kicks in when \`T\` can't be inferred or isn't given explicitly. Handy for flexible APIs. Here's a generic with a constraint and a default at once:

\`\`\`ts
function merge<T extends object, U extends object = {}>(a: T, b: U): T & U {
  return { ...a, ...b };
}
const r = merge({ id: 1 }, { name: 'Ann' });
// r: { id: number } & { name: string }
r.id;   // number
r.name; // string
\`\`\`

\`T & U\` is an intersection type: an object that has the fields of both \`T\` and \`U\`.

### Subtleties

- **Don't add a type parameter used only once** — it buys you nothing; that's "any in disguise".
- Constraints can include conditional and mapped types for complex shape validation.
- \`const\` type parameters (TS 5.0) preserve narrow literal types on inference (they don't widen \`'a'\` to \`string\`) — that's a separate topic.

## ⚠️ Common pitfalls

- On inference literals widen: without \`as const\`, \`'red'\` becomes \`string\` and the narrow type is lost.
- A type parameter appearing only once in a signature ties nothing together — usually it should be removed.
- \`<T = ...>\` (default) and \`<T extends ...>\` (constraint) are different things; you can combine them: \`<T extends U = D>\`.

## 🎯 Key takeaways

- A generic \`T\` preserves the input/output relation and gives type safety where \`any\` loses it.
- \`T extends U\` constrains \`T\` to subtypes of \`U\`; a common move is \`K extends keyof T\` for safe key access.
- TS infers types itself and widens literals; \`<T = Default>\` provides a fallback type when inference isn't possible.`
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
    category: 'javascript-typescript',
    level: 'Expert',
    tags: ['conditional-types', 'infer', 'distributive'],
    question: {
      ru: 'Как работают условные типы и `infer`? Что такое дистрибутивность над union-типами?',
      en: 'How do conditional types and `infer` work? What is distributivity over union types?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что типы в TypeScript — это тоже маленький язык программирования, только работает он во время компиляции, а не в рантайме. Условный тип — это обычный тернарный оператор (\`условие ? то : иначе\`), но для типов. А \`infer\` — это как поймать рыбу сачком: ты говоришь «где-то тут внутри спрятан тип, вытащи мне его и дай имя». Дистрибутивность же — это когда TypeScript берёт union (набор вариантов вроде \`string | number\`) и прогоняет условие отдельно для каждого варианта, а потом снова собирает результаты вместе.

### Условные типы: тернарник для типов

Запись \`T extends U ? X : Y\` читается так: «если тип \`T\` можно присвоить типу \`U\`, то результат — \`X\`, иначе — \`Y\`». Слово \`extends\` здесь означает не наследование, а проверку присваиваемости («подходит ли \`T\` под \`U\`»). Такие типы нужны, чтобы **извлекать**, **фильтровать** и **преобразовывать** типы.

### infer: захват части структуры

\`infer R\` объявляет **переменную типа прямо внутри условия** и захватывает кусочек структуры — это паттерн-матчинг на типах. Ты как бы говоришь: «если форма выглядит вот так, то в этом месте сидит какой-то тип — назови его \`R\` и верни мне».

\`\`\`ts
type ElementType<T> = T extends (infer E)[] ? E : T;
type A = ElementType<number[]>; // number
type B = ElementType<string>;   // string

type MyReturn<F> = F extends (...args: any[]) => infer R ? R : never;
type R = MyReturn<() => Promise<number>>; // Promise<number>
\`\`\`

В \`ElementType\` мы спрашиваем: «является ли \`T\` массивом чего-то?». Если да — \`infer E\` вытаскивает тип элемента. В \`MyReturn\` мы захватываем тип возвращаемого значения функции. \`never\` — это «невозможный тип», удобная заглушка для ветки «иначе».

### Дистрибутивность над union

Если проверяемый тип — это **«голый» параметр типа** (просто \`T\`, без обёрток) и в него подставлен **union**, то условный тип **распределяется** по каждому члену union по отдельности:

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;
type X = ToArray<string | number>; // string[] | number[]  (а не (string|number)[])
\`\`\`

TypeScript разбил \`string | number\` на \`string\` и \`number\`, применил \`T[]\` к каждому и склеил обратно. Получилось \`string[] | number[]\`, а не \`(string | number)[]\` — почувствуй разницу.

### Как отключить дистрибутивность

Чтобы **выключить** это раздробление, оберни параметр в кортеж (tuple): \`[T] extends [U] ? ...\`. Тогда TypeScript видит не «голый» \`T\`, а \`[T]\`, и сравнивает union целиком, не разбивая его.

\`\`\`ts
type IsNever<T> = [T] extends [never] ? true : false;
type N = IsNever<never>; // true (без скобок было бы never)
\`\`\`

Без скобок случилась бы странность: \`never\` — это «пустой union», распределять нечего, поэтому весь условный тип схлопнулся бы в \`never\` вместо \`true\`. Кортеж спасает.

## ⚠️ Подводные камни

- Несколько \`infer\` в одной union-позиции дают **объединение** (union); те же \`infer\` в **контравариантной** позиции (например, в аргументах функции) дают **пересечение** (intersection) — это база для трюка \`UnionToIntersection\`.
- \`never\` в дистрибутивном условном типе исчезает — потому что распределять нечего. Оборачивай в \`[never]\`, если хочешь честного сравнения.
- У рекурсивных условных типов есть **лимит глубины** — защита от бесконечных вычислений компилятора.

## 🎯 Запомни

- \`T extends U ? X : Y\` — тернарник на уровне типов; \`extends\` = «присваиваемо ли».
- \`infer R\` захватывает тип из структуры, как сачок ловит рыбу.
- Голый \`T\` + union = дистрибутивность (условие бежит по каждому члену). Обёртка \`[T]\` её отключает.
- Условные типы + \`infer\` — фундамент почти всех utility-типов в стандартной библиотеке TS.`,
      en: `## 🧩 In plain words

Think of TypeScript's types as their own little programming language that runs at compile time instead of runtime. A conditional type is just the ternary operator (\`condition ? then : else\`), but for types. And \`infer\` is like catching a fish with a net: you say "there's a type hidden somewhere in here — scoop it out and give it a name". Distributivity is when TypeScript takes a union (a set of options like \`string | number\`), runs the condition separately for each option, and then glues the results back together.

### Conditional types: a ternary for types

The form \`T extends U ? X : Y\` reads as: "if type \`T\` is assignable to type \`U\`, the result is \`X\`, otherwise \`Y\`". Here \`extends\` doesn't mean inheritance — it means an assignability check ("does \`T\` fit into \`U\`?"). These types let you **extract**, **filter**, and **transform** types.

### infer: capturing part of a structure

\`infer R\` declares a **type variable right inside the condition** and captures a piece of the structure — it's pattern matching on types. You're saying: "if the shape looks like this, then some type sits in this slot — call it \`R\` and hand it back to me".

\`\`\`ts
type ElementType<T> = T extends (infer E)[] ? E : T;
type A = ElementType<number[]>; // number
type B = ElementType<string>;   // string

type MyReturn<F> = F extends (...args: any[]) => infer R ? R : never;
type R = MyReturn<() => Promise<number>>; // Promise<number>
\`\`\`

In \`ElementType\` we ask: "is \`T\` an array of something?". If yes, \`infer E\` pulls out the element type. In \`MyReturn\` we capture a function's return type. \`never\` is the "impossible type", a handy placeholder for the "else" branch.

### Distributivity over unions

If the checked type is a **naked type parameter** (just \`T\`, no wrapping) and a **union** is substituted, the conditional type **distributes** over each union member separately:

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;
type X = ToArray<string | number>; // string[] | number[]  (not (string|number)[])
\`\`\`

TypeScript split \`string | number\` into \`string\` and \`number\`, applied \`T[]\` to each, and glued them back. The result is \`string[] | number[]\`, not \`(string | number)[]\` — feel the difference.

### How to disable distributivity

To **turn off** this splitting, wrap the parameter in a tuple: \`[T] extends [U] ? ...\`. Now TypeScript sees \`[T]\` instead of a naked \`T\`, and compares the union as a whole without breaking it apart.

\`\`\`ts
type IsNever<T> = [T] extends [never] ? true : false;
type N = IsNever<never>; // true (without brackets it would be never)
\`\`\`

Without the brackets something odd happens: \`never\` is the "empty union", there's nothing to distribute over, so the whole conditional collapses to \`never\` instead of \`true\`. The tuple saves it.

## ⚠️ Common pitfalls

- Multiple \`infer\` in one union position yield a **union**; the same \`infer\` in a **contravariant** position (e.g. function arguments) yields an **intersection** — this is the basis of the \`UnionToIntersection\` trick.
- \`never\` vanishes inside a distributive conditional type — because there's nothing to distribute. Wrap it in \`[never]\` when you want an honest comparison.
- Recursive conditional types have a **depth limit** — a guard against the compiler running forever.

## 🎯 Key takeaways

- \`T extends U ? X : Y\` is a type-level ternary; \`extends\` means "is it assignable".
- \`infer R\` captures a type from a structure, like a net catching a fish.
- Naked \`T\` + union = distributivity (the condition runs per member). Wrapping as \`[T]\` disables it.
- Conditional types + \`infer\` are the foundation of nearly every utility type in TS's standard library.`
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
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['mapped-types', 'key-remapping', 'modifiers'],
    question: {
      ru: 'Как работают mapped types? Объясните модификаторы (`readonly`, `?`, `+`, `-`) и `as`-ремаппинг ключей.',
      en: 'How do mapped types work? Explain modifiers (`readonly`, `?`, `+`, `-`) and key remapping with `as`.'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Mapped type (маппинг-тип) — это как цикл \`for\` по ключам объекта, только на уровне типов. Ты берёшь готовый тип, проходишь по всем его полям и строишь новый тип, что-то меняя по пути. Модификаторы (\`readonly\`, \`?\`) — это переключатели, которые можно навешивать и снимать с полей: сделать поле «только для чтения» или «необязательным», либо наоборот. А \`as\`-ремаппинг — это возможность на ходу **переименовывать** ключи, например превратить \`name\` в \`getName\`.

### Что такое mapped type

Маппинг-тип перебирает ключи существующего типа и строит новый: \`{ [K in Keys]: Type }\`. Читается как «для каждого ключа \`K\` из набора \`Keys\` создай поле такого-то типа». Обычно \`Keys\` — это \`keyof T\` (все ключи типа \`T\`), а значение зависит от \`T[K]\` (тип поля по этому ключу).

\`\`\`ts
type Stringify<T> = { [K in keyof T]: string };
\`\`\`

Здесь мы прошли по всем полям \`T\` и заменили тип каждого поля на \`string\`, сохранив имена ключей.

### Модификаторы: readonly, ?, +, -

Можно **добавлять** и **убирать** флаги \`readonly\` (только чтение) и \`?\` (необязательное поле) с помощью префиксов \`+\` и \`-\`. Просто \`+\` обычно опускают, потому что добавление — это поведение по умолчанию.

\`\`\`ts
type Mutable<T> = { -readonly [K in keyof T]: T[K] };  // снять readonly
type Required2<T> = { [K in keyof T]-?: T[K] };        // снять опциональность
type Partial2<T> = { [K in keyof T]+?: T[K] };         // добавить ?
\`\`\`

\`-readonly\` делает поля изменяемыми, \`-?\` делает необязательные поля обязательными, \`+?\` наоборот делает все поля необязательными. Именно так под капотом реализованы встроенные \`Partial\`, \`Required\` и \`Readonly\`.

### Key remapping через as

Начиная с TypeScript 4.1 можно **переименовывать** ключи через \`as\` — задать для ключа новое имя. А если вернуть \`never\` вместо имени, ключ **выкинется** из результата — так делают фильтрацию.

\`\`\`ts
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};
type G = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

type RemoveKind<T> = { [K in keyof T as Exclude<K, 'kind'>]: T[K] };
\`\`\`

В \`Getters\` мы для каждого поля строим новое имя вида \`get\` + имя с большой буквы (\`Capitalize\` делает первую букву заглавной, а \`string & K\` нужно, чтобы TypeScript видел ключ как строку). В \`RemoveKind\` мы через \`Exclude\` выбрасываем ключ \`kind\`: для него \`Exclude\` вернёт \`never\`, и поле исчезнет.

### Гомоморфность и другие нюансы

Когда маппинг идёт по \`keyof T\`, он ведёт себя **гомоморфно** (homomorphic — «сохраняющий форму»): существующие модификаторы и типы исходных ключей наследуются, а маппинг по массивам и кортежам сохраняет их «массивную» природу (результат тоже будет массивом/кортежом, а не обычным объектом). В сочетании с условными типами и template literal types это даёт очень мощные преобразования.

## ⚠️ Подводные камни

- \`-?\` снимает опциональность, но не убирает \`undefined\` из типа значения, если оно там было явно — это разные вещи.
- Ремаппинг с \`Capitalize\` требует \`string & K\`: сырой \`K\` может быть \`string | number | symbol\`, а строковые операции работают только со строками.
- Слишком сложные маппинги бьют по скорости компиляции и читаемости — соблюдай баланс.

## 🎯 Запомни

- Mapped type — это \`for\`-цикл по ключам на уровне типов: \`{ [K in keyof T]: ... }\`.
- \`+\`/\`-\` перед \`readonly\` и \`?\` добавляют или снимают эти флаги; так сделаны \`Partial\`, \`Required\`, \`Readonly\`.
- \`as\` переименовывает ключи; вернуть \`never\` в \`as\` = выбросить ключ (фильтрация).
- Маппинг по \`keyof T\` гомоморфен: сохраняет модификаторы и «массивность» источника.`,
      en: `## 🧩 In plain words

A mapped type is like a \`for\` loop over an object's keys, but at the type level. You take an existing type, walk over all its fields, and build a new type, changing something along the way. Modifiers (\`readonly\`, \`?\`) are switches you can add to or remove from fields: make a field "read-only" or "optional", or the opposite. And \`as\` remapping lets you **rename** keys on the fly, for example turning \`name\` into \`getName\`.

### What a mapped type is

A mapped type iterates over the keys of an existing type and builds a new one: \`{ [K in Keys]: Type }\`. Read it as "for each key \`K\` in the set \`Keys\`, create a field of such-and-such type". Usually \`Keys\` is \`keyof T\` (all keys of type \`T\`), and the value depends on \`T[K]\` (the type of the field at that key).

\`\`\`ts
type Stringify<T> = { [K in keyof T]: string };
\`\`\`

Here we walked over every field of \`T\` and replaced each field's type with \`string\`, keeping the key names.

### Modifiers: readonly, ?, +, -

You can **add** and **remove** the \`readonly\` (read-only) and \`?\` (optional) flags using the \`+\` and \`-\` prefixes. Plain \`+\` is usually omitted because adding is the default behavior.

\`\`\`ts
type Mutable<T> = { -readonly [K in keyof T]: T[K] };  // strip readonly
type Required2<T> = { [K in keyof T]-?: T[K] };        // strip optionality
type Partial2<T> = { [K in keyof T]+?: T[K] };         // add ?
\`\`\`

\`-readonly\` makes fields mutable, \`-?\` makes optional fields required, \`+?\` makes all fields optional. This is exactly how the built-in \`Partial\`, \`Required\`, and \`Readonly\` are implemented under the hood.

### Key remapping with as

Since TypeScript 4.1 you can **rename** keys via \`as\` — give a key a new name. And if you return \`never\` instead of a name, the key gets **dropped** from the result — that's how filtering is done.

\`\`\`ts
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};
type G = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

type RemoveKind<T> = { [K in keyof T as Exclude<K, 'kind'>]: T[K] };
\`\`\`

In \`Getters\` we build a new name for each field of the form \`get\` + capitalized name (\`Capitalize\` uppercases the first letter, and \`string & K\` is needed so TypeScript treats the key as a string). In \`RemoveKind\` we use \`Exclude\` to drop the \`kind\` key: for it, \`Exclude\` returns \`never\`, and the field disappears.

### Homomorphism and other nuances

When the mapping goes over \`keyof T\`, it behaves **homomorphically** ("shape-preserving"): existing modifiers and source key types are inherited, and mapping over arrays and tuples preserves their array nature (the result stays an array/tuple rather than a plain object). Combined with conditional types and template literal types, this enables very powerful transforms.

## ⚠️ Common pitfalls

- \`-?\` strips optionality, but it does not remove \`undefined\` from the value type if it was explicitly there — those are different things.
- Remapping with \`Capitalize\` needs \`string & K\`: a raw \`K\` may be \`string | number | symbol\`, and string operations only work on strings.
- Overly complex mappings hurt compile speed and readability — keep the balance.

## 🎯 Key takeaways

- A mapped type is a type-level \`for\` loop over keys: \`{ [K in keyof T]: ... }\`.
- \`+\`/\`-\` before \`readonly\` and \`?\` add or strip those flags; that's how \`Partial\`, \`Required\`, \`Readonly\` are built.
- \`as\` renames keys; returning \`never\` in \`as\` drops the key (filtering).
- Mapping over \`keyof T\` is homomorphic: it preserves modifiers and the source's array-ness.`
    }
  },
  {
    id: 'jsts-019',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['template-literal-types', 'string-types', 'inference'],
    question: {
      ru: 'Что такое template literal types? Как с их помощью разбирать и строить строковые типы?',
      en: 'What are template literal types? How do you use them to parse and build string types?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Template literal types — это шаблонные строки, но для типов. Ты знаешь обычные шаблонные строки в JS: \`\` \`привет, \${имя}\` \`\`. То же самое можно делать на уровне типов: собирать строковые типы из кусочков и, наоборот, **разбирать** строку на части. Работает это только во время компиляции — в готовом коде это просто обычные строки, никакой магии в рантайме.

### Что это такое

Это типы вида \`\` \`prefix-\${T}\` \`\`, которые позволяют **конструировать** (собирать) и **сопоставлять** (разбирать) строковые литеральные типы. Строковый литеральный тип — это тип, значением которого может быть только одна конкретная строка, например \`'click'\`. Если внутрь подставить union, шаблоны **дистрибутивно перемножаются** (каждый вариант комбинируется с каждым).

\`\`\`ts
type Event = 'click' | 'hover';
type Handler = \`on\${Capitalize<Event>}\`; // 'onClick' | 'onHover'
\`\`\`

Мы взяли каждое событие, сделали первую букву заглавной и приклеили спереди \`on\`.

### Встроенные intrinsic-типы

TypeScript даёт четыре встроенных типа для работы с регистром букв: \`Uppercase\` (всё в верхний регистр), \`Lowercase\` (в нижний), \`Capitalize\` (первая буква заглавная), \`Uncapitalize\` (первая буква строчная). Их называют intrinsic — «встроенные», потому что они реализованы прямо в компиляторе, а не на самом языке типов.

### Парсинг строк через infer

Самое мощное — в сочетании с условными типами и \`infer\` (захват части типа) можно **разбирать** строки на составляющие:

\`\`\`ts
type Split<S extends string, D extends string> =
  S extends \`\${infer H}\${D}\${infer T}\`
    ? [H, ...Split<T, D>]
    : [S];
type P = Split<'a.b.c', '.'>; // ['a', 'b', 'c']

type ParamNames<S extends string> =
  S extends \`\${string}:\${infer P}/\${infer Rest}\`
    ? P | ParamNames<\`/\${Rest}\`>
    : S extends \`\${string}:\${infer P}\` ? P : never;
type R = ParamNames<'/users/:id/posts/:postId'>; // 'id' | 'postId'
\`\`\`

\`Split\` работает рекурсивно: он ищет разделитель \`D\`, \`infer H\` захватывает голову (кусок до разделителя), \`infer T\` — хвост, и мы вызываем \`Split\` снова на хвосте, пока разделители не кончатся. \`ParamNames\` тем же приёмом вытаскивает имена параметров роута (те, что после \`:\`) прямо из строки пути.

### Применение

- Типобезопасные пути роутов, имена событий, CSS-классы.
- Генерация имён в маппинг-типах (\`getName\`, \`onChange\`).
- Парсеры query-строк и форматов даты.

## ⚠️ Подводные камни

- Работают только с **конечными** union: \`a|b\` × \`c|d\` = 4 комбинации, и число растёт **мультипликативно** — на больших union это комбинаторный взрыв, который повесит компилятор.
- Рекурсия ограничена по глубине — очень длинные строки разобрать не выйдет.
- Это исключительно **типовый** уровень: в рантайме это обычные строки, никакой проверки во время выполнения не происходит.

## 🎯 Запомни

- Template literal type — это \`\` \`\${...}\` \`\` для типов: собирает и разбирает строковые типы.
- \`Uppercase\` / \`Lowercase\` / \`Capitalize\` / \`Uncapitalize\` — встроенные манипуляции регистром.
- \`infer\` внутри шаблона + рекурсия = парсер строк на уровне типов (\`Split\`, имена роут-параметров).
- Осторожно с большими union — комбинаторный взрыв. Всё это исчезает в рантайме.`,
      en: `## 🧩 In plain words

Template literal types are template strings, but for types. You know the ordinary template strings in JS: \`\` \`hello, \${name}\` \`\`. You can do the same at the type level: build string types from pieces, and — the reverse — **parse** a string into parts. This only works at compile time; in the finished code these are just plain strings, no runtime magic.

### What they are

These are types like \`\` \`prefix-\${T}\` \`\` that let you **construct** (build) and **match** (parse) string literal types. A string literal type is a type whose only possible value is one specific string, e.g. \`'click'\`. If you substitute a union inside, the templates **distribute** (cross-multiply — each option combines with each).

\`\`\`ts
type Event = 'click' | 'hover';
type Handler = \`on\${Capitalize<Event>}\`; // 'onClick' | 'onHover'
\`\`\`

We took each event, uppercased the first letter, and glued \`on\` to the front.

### Built-in intrinsics

TypeScript ships four built-in types for handling letter case: \`Uppercase\` (everything uppercase), \`Lowercase\` (lowercase), \`Capitalize\` (first letter uppercase), \`Uncapitalize\` (first letter lowercase). They're called intrinsics because they're implemented right in the compiler rather than in the type language itself.

### Parsing strings with infer

The most powerful part — combined with conditional types and \`infer\` (capturing a piece of a type), you can **parse** strings into their parts:

\`\`\`ts
type Split<S extends string, D extends string> =
  S extends \`\${infer H}\${D}\${infer T}\`
    ? [H, ...Split<T, D>]
    : [S];
type P = Split<'a.b.c', '.'>; // ['a', 'b', 'c']

type ParamNames<S extends string> =
  S extends \`\${string}:\${infer P}/\${infer Rest}\`
    ? P | ParamNames<\`/\${Rest}\`>
    : S extends \`\${string}:\${infer P}\` ? P : never;
type R = ParamNames<'/users/:id/posts/:postId'>; // 'id' | 'postId'
\`\`\`

\`Split\` works recursively: it looks for the delimiter \`D\`, \`infer H\` captures the head (the piece before the delimiter), \`infer T\` the tail, and we call \`Split\` again on the tail until the delimiters run out. \`ParamNames\` uses the same trick to pull route parameter names (the ones after \`:\`) straight out of a path string.

### Uses

- Type-safe route paths, event names, CSS classes.
- Name generation in mapped types (\`getName\`, \`onChange\`).
- Parsers for query strings and date formats.

## ⚠️ Common pitfalls

- They only work with **finite** unions: \`a|b\` × \`c|d\` = 4 combinations, and the count grows **multiplicatively** — on large unions this is a combinatorial blow-up that will hang the compiler.
- Recursion is depth-limited — you can't parse very long strings.
- It's purely the **type** level: at runtime these are ordinary strings, with no runtime checking happening.

## 🎯 Key takeaways

- A template literal type is \`\` \`\${...}\` \`\` for types: it builds and parses string types.
- \`Uppercase\` / \`Lowercase\` / \`Capitalize\` / \`Uncapitalize\` are built-in case manipulations.
- \`infer\` inside a template + recursion = a type-level string parser (\`Split\`, route param names).
- Watch out for large unions — combinatorial blow-up. All of this disappears at runtime.`
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
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['utility-types', 'pick-omit', 'partial-record'],
    question: {
      ru: 'Объясните, как реализованы встроенные utility-типы Partial, Pick, Omit, Record, Exclude, ReturnType.',
      en: 'Explain how the built-in utility types Partial, Pick, Omit, Record, Exclude, ReturnType are implemented.'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Utility-типы вроде \`Partial\` или \`Pick\` — это не встроенная в компилятор магия, а обычные типы, которые ты и сам мог бы написать в пару строк. Они лежат в стандартных файлах TypeScript (\`lib.*.d.ts\`) и собраны из трёх кирпичиков, которые ты уже знаешь: маппинг-типов (цикл по ключам), условных типов (тернарник для типов) и \`infer\` (захват типа). Если понять, из чего они сделаны, ты перестанешь их бояться и сможешь писать **свои**.

### Реализации из стандартной библиотеки

\`\`\`ts
type Partial<T>  = { [K in keyof T]?: T[K] };
type Required<T> = { [K in keyof T]-?: T[K] };
type Readonly<T> = { readonly [K in keyof T]: T[K] };

type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Record<K extends keyof any, T> = { [P in K]: T };

type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

type ReturnType<F> = F extends (...a: any[]) => infer R ? R : never;
type Parameters<F> = F extends (...a: infer P) => any ? P : never;
\`\`\`

### Разбор по кирпичикам

- **Partial / Required / Readonly** — это маппинг-типы с модификаторами. \`?\` делает поля необязательными, \`-?\` снимает необязательность, \`readonly\` — только чтение.
- **Pick** — маппинг по подмножеству ключей \`K\` (берём только нужные поля). \`K extends keyof T\` гарантирует, что ты выбираешь только существующие ключи.
- **Record<K, T>** — конструирует объект-словарь с ключами \`K\` и значениями \`T\`. \`keyof any\` — это \`string | number | symbol\`, то есть любой допустимый тип ключа.
- **Exclude / Extract** — **дистрибутивные** условные типы, которые фильтруют union. \`Exclude\` выкидывает из \`T\` всё, что подходит под \`U\`; \`Extract\` наоборот оставляет только совпадения.
- **Omit** — комбинация \`Pick\` + \`Exclude\`: берём все ключи \`T\`, вычитаем \`K\`, и делаем \`Pick\` по остатку. Важно: \`Omit\` **не гомоморфен**, то есть напрямую не сохраняет модификаторы исходных полей.
- **ReturnType / Parameters** — условные типы с \`infer\`: захватывают тип возвращаемого значения или кортеж аргументов функции.

### Другие важные утилиты

- \`NonNullable<T> = T & {}\` — убирает \`null\` и \`undefined\` из типа.
- \`Awaited<T>\` (с TS 4.5) — рекурсивно разворачивает \`Promise\`, корректно обрабатывая цепочки thenable (объектов с методом \`.then\`).
- \`InstanceType\`, \`ConstructorParameters\`, \`ThisParameterType\` — извлекают типы из классов и функций.

### Зачем это знать на практике

Понимая реализации, ты можешь писать **свои** утилиты (\`DeepPartial\`, \`PickByValue\`) и отлаживать хитрые ошибки типов. Например, почему \`Omit\` иногда «теряет» дискриминируемость union (возможность различать варианты по общему полю-метке) — как раз потому, что он не дистрибутивен по умолчанию и обрабатывает union как единое целое.

## ⚠️ Подводные камни

- \`Omit\` не дистрибутивен: применённый к union он может «схлопнуть» варианты и сломать discriminated union. Если нужно сохранить дискриминацию, пиши дистрибутивную версию через \`T extends any ? Omit<T, K> : never\`.
- \`Pick\` требует \`K extends keyof T\`, а \`Omit\` — нет (там \`keyof any\`), поэтому \`Omit\` не подсветит опечатку в имени ключа.
- \`Exclude\`/\`Extract\` работают только с union — на не-union типах они просто вернут вход целиком или \`never\`.

## 🎯 Запомни

- Utility-типы — не магия, а обычные типы из \`lib.*.d.ts\`, собранные из маппингов, условных типов и \`infer\`.
- \`Partial\`/\`Required\`/\`Readonly\` — модификаторы; \`Pick\`/\`Record\` — маппинги; \`Exclude\`/\`Extract\` — дистрибутивные условные; \`ReturnType\`/\`Parameters\` — \`infer\`.
- \`Omit = Pick + Exclude\` и он **не** гомоморфен и **не** дистрибутивен — отсюда его сюрпризы с union.
- Понимание реализаций = способность писать свои утилиты и читать непонятные ошибки типов.`,
      en: `## 🧩 In plain words

Utility types like \`Partial\` or \`Pick\` aren't compiler magic — they're ordinary types you could write yourself in a couple of lines. They live in TypeScript's standard files (\`lib.*.d.ts\`) and are assembled from three building blocks you already know: mapped types (a loop over keys), conditional types (a ternary for types), and \`infer\` (capturing a type). Once you understand what they're made of, you'll stop fearing them and be able to write **your own**.

### Implementations from the standard library

\`\`\`ts
type Partial<T>  = { [K in keyof T]?: T[K] };
type Required<T> = { [K in keyof T]-?: T[K] };
type Readonly<T> = { readonly [K in keyof T]: T[K] };

type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Record<K extends keyof any, T> = { [P in K]: T };

type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

type ReturnType<F> = F extends (...a: any[]) => infer R ? R : never;
type Parameters<F> = F extends (...a: infer P) => any ? P : never;
\`\`\`

### Walkthrough by building block

- **Partial / Required / Readonly** — mapped types with modifiers. \`?\` makes fields optional, \`-?\` strips optionality, \`readonly\` makes them read-only.
- **Pick** — maps over a key subset \`K\` (keep only the wanted fields). \`K extends keyof T\` guarantees you only pick existing keys.
- **Record<K, T>** — constructs a dictionary object with keys \`K\` and values \`T\`. \`keyof any\` is \`string | number | symbol\`, i.e. any valid key type.
- **Exclude / Extract** — **distributive** conditional types that filter a union. \`Exclude\` drops from \`T\` everything assignable to \`U\`; \`Extract\` keeps only the matches.
- **Omit** — a combination of \`Pick\` + \`Exclude\`: take all keys of \`T\`, subtract \`K\`, and \`Pick\` the remainder. Important: \`Omit\` is **not homomorphic**, so it doesn't directly preserve the source fields' modifiers.
- **ReturnType / Parameters** — conditional types with \`infer\`: they capture the return type or the argument tuple of a function.

### Other important utilities

- \`NonNullable<T> = T & {}\` — removes \`null\` and \`undefined\` from a type.
- \`Awaited<T>\` (since TS 4.5) — recursively unwraps \`Promise\`, correctly handling thenable chains (objects with a \`.then\` method).
- \`InstanceType\`, \`ConstructorParameters\`, \`ThisParameterType\` — extract types from classes and functions.

### Why this matters in practice

Understanding the implementations lets you write **your own** utilities (\`DeepPartial\`, \`PickByValue\`) and debug tricky type errors. For example, why \`Omit\` sometimes "loses" a union's discriminability (the ability to tell variants apart by a shared tag field) — precisely because it isn't distributive by default and treats the union as a single whole.

## ⚠️ Common pitfalls

- \`Omit\` isn't distributive: applied to a union it can "collapse" the variants and break a discriminated union. If you need to keep discrimination, write a distributive version via \`T extends any ? Omit<T, K> : never\`.
- \`Pick\` requires \`K extends keyof T\`, but \`Omit\` doesn't (it uses \`keyof any\`), so \`Omit\` won't flag a typo in a key name.
- \`Exclude\`/\`Extract\` only work on unions — on non-union types they simply return the whole input or \`never\`.

## 🎯 Key takeaways

- Utility types aren't magic — they're ordinary types from \`lib.*.d.ts\`, built from mapped types, conditional types, and \`infer\`.
- \`Partial\`/\`Required\`/\`Readonly\` = modifiers; \`Pick\`/\`Record\` = mappings; \`Exclude\`/\`Extract\` = distributive conditionals; \`ReturnType\`/\`Parameters\` = \`infer\`.
- \`Omit = Pick + Exclude\`, and it's **not** homomorphic and **not** distributive — hence its surprises with unions.
- Knowing the implementations = the ability to write your own utilities and read cryptic type errors.`
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
    category: 'javascript-typescript',
    level: 'Expert',
    tags: ['variance', 'covariance', 'contravariance'],
    question: {
      ru: 'Что такое вариантность (ковариантность/контравариантность) в TypeScript? Где она проявляется?',
      en: 'What is variance (covariance/contravariance) in TypeScript? Where does it show up?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что у тебя есть коробки с животными. Собака — это вид животного. Логичный вопрос: если «Собака» — подвид «Животного», то является ли «коробка собак» подвидом «коробки животных»? Иногда да, иногда наоборот, а иногда — ни то ни другое. Вот эти правила «как отношение подтипов переносится на обёртки» и называют **вариантностью**. Понимание этого объясняет странные ошибки TypeScript при присваивании функций.

### Что такое подтип

Запись \`Dog <: Animal\` читается как «Dog является подтипом Animal» — то есть собака годится везде, где ждут животное (у неё есть всё, что есть у животного, и даже больше). Вариантность отвечает на вопрос: а как это правило работает, когда мы заворачиваем тип в обёртку вроде \`Box<T>\`, массив или функцию.

### Четыре вида вариантности

- **Ковариантность** — направление сохраняется: если \`Dog <: Animal\`, то и \`Box<Dog> <: Box<Animal>\`. Так ведут себя **позиции результата**: возвращаемые значения функций и поля, которые мы только читаем. Логично: если из коробки можно достать собаку, значит можно достать и «какое-то животное».
- **Контравариантность** — направление **переворачивается**: \`Box<Animal> <: Box<Dog>\`. Так ведут себя **параметры функций** (объясним ниже почему).
- **Инвариантность** — никакое направление не работает. Типично для изменяемых контейнеров в строгой системе типов.
- **Бивариантность** — работают оба направления сразу. Удобно, но небезопасно.

### Почему параметры функций контравариантны

Функция, принимающая \`Animal\`, умеет работать с **любым** животным. Значит её безопасно подставить туда, где ждут функцию для \`Dog\` — собака ведь тоже животное, функция справится. А вот наоборот нельзя: функция, умеющая только с собаками, сломается, если ей передадут кошку. Поэтому направление подтипов у параметров переворачивается. В TypeScript это включается флагом \`strictFunctionTypes\`:

\`\`\`ts
type Fn<A> = (a: A) => void;
declare let fa: Fn<Animal>;
declare let fd: Fn<Dog>;
fd = fa; // ок: Fn<Animal> присваивается Fn<Dog> (контравариантно)
fa = fd; // ошибка при strictFunctionTypes
\`\`\`

### Исключения и нюансы

- **Методы** (синтаксис \`m(a): void\` внутри интерфейса) специально оставлены **бивариантными** ради удобства — например, для обработчиков событий и методов массивов. Это намеренная «дырка» в системе типов, за которую платят безопасностью.
- Возвращаемые типы — **ковариантны**.
- \`readonly\`-массивы ковариантны (их только читают), а обычные изменяемые массивы в TS бивариантны — опять же прагматичное упрощение.
- Начиная с TS 4.7 вариантность параметра типа можно указать **явно** через аннотации \`in\` (контравариантно), \`out\` (ковариантно) и \`in out\` (инвариантно). Это ускоряет проверку типов и делает её точнее:

\`\`\`ts
interface State<in out T> { get(): T; set(v: T): void; } // инвариант
\`\`\`

## ⚠️ Подводные камни

- Бивариантность методов и изменяемых массивов может пропустить реальную ошибку типов — помни, что это компромисс ради удобства.
- Ошибка присваивания функций при \`strictFunctionTypes\` — не баг, а именно контравариантность параметров в действии.

## 🎯 Запомни

- Вариантность — про то, как «подтип» переносится на обёртки и обобщённые типы.
- Результаты (возврат, чтение) — ковариантны; параметры функций — контравариантны.
- Изменяемые контейнеры хотят быть инвариантными; методы TS намеренно бивариантны (небезопасно).
- С TS 4.7 можно управлять вариантностью вручную через \`in\`/\`out\`/\`in out\`.`,
      en: `## 🧩 In plain words

Imagine boxes holding animals. A dog is a kind of animal. Natural question: if "Dog" is a subtype of "Animal", is a "box of dogs" a subtype of a "box of animals"? Sometimes yes, sometimes it's the reverse, and sometimes neither. Those rules — "how the subtype relation carries over to wrappers" — are what we call **variance**. Understanding it explains those weird TypeScript errors when you assign one function to another.

### What "subtype" means

The notation \`Dog <: Animal\` reads "Dog is a subtype of Animal" — a dog works anywhere an animal is expected (it has everything an animal has, and more). Variance answers: how does that rule behave once we wrap the type in something like \`Box<T>\`, an array, or a function.

### The four kinds of variance

- **Covariance** — direction is preserved: if \`Dog <: Animal\` then \`Box<Dog> <: Box<Animal>\`. This is how **output positions** behave: function return values and fields you only read. Makes sense — if you can pull a dog out of the box, you can also pull out "some animal".
- **Contravariance** — direction is **flipped**: \`Box<Animal> <: Box<Dog>\`. This is how **function parameters** behave (why, below).
- **Invariance** — neither direction works. Typical for mutable containers in a strict type system.
- **Bivariance** — both directions work at once. Convenient, but unsafe.

### Why function parameters are contravariant

A function that accepts \`Animal\` can handle **any** animal. So it's safe to drop it in where a function-for-\`Dog\` is expected — a dog is an animal too, the function copes. The reverse fails: a function that only handles dogs breaks if you hand it a cat. So the subtype direction flips for parameters. In TypeScript this is turned on by the \`strictFunctionTypes\` flag:

\`\`\`ts
type Fn<A> = (a: A) => void;
declare let fa: Fn<Animal>;
declare let fd: Fn<Dog>;
fd = fa; // ok: Fn<Animal> assignable to Fn<Dog> (contravariant)
fa = fd; // error under strictFunctionTypes
\`\`\`

### Exceptions and nuances

- **Methods** (the \`m(a): void\` syntax inside an interface) are deliberately kept **bivariant** for convenience — e.g. event handlers and array methods. A deliberate "hole" in the type system, paid for in safety.
- Return types are **covariant**.
- \`readonly\` arrays are covariant (read-only); ordinary mutable arrays in TS are bivariant — again a pragmatic shortcut.
- Since TS 4.7 you can annotate a type parameter's variance **explicitly** with \`in\` (contravariant), \`out\` (covariant), and \`in out\` (invariant). This speeds up type checking and makes it more precise:

\`\`\`ts
interface State<in out T> { get(): T; set(v: T): void; } // invariant
\`\`\`

## ⚠️ Common pitfalls

- Bivariance of methods and mutable arrays can let a real type error slip through — remember it's a convenience trade-off.
- A function-assignment error under \`strictFunctionTypes\` is not a bug — it's parameter contravariance doing its job.

## 🎯 Key takeaways

- Variance is about how "subtype" carries over to wrappers and generic types.
- Outputs (returns, reads) are covariant; function parameters are contravariant.
- Mutable containers want to be invariant; TS methods are deliberately bivariant (unsafe).
- Since TS 4.7 you can control variance by hand with \`in\`/\`out\`/\`in out\`.`
    }
  },
  {
    id: 'jsts-022',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['unknown', 'any', 'never'],
    question: {
      ru: 'В чём разница между `unknown`, `any` и `never`? Когда использовать каждый?',
      en: 'What is the difference between `unknown`, `any`, and `never`? When to use each?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

\`any\`, \`unknown\` и \`never\` — три особых типа в TypeScript, которые легко перепутать. Проще всего запомнить их как три позиции: \`any\` — «делай что хочешь, я отключил проверку» (опасно), \`unknown\` — «я пока не знаю, что это, сначала проверь» (безопасно), а \`never\` — «такого значения вообще не бывает» (логическая невозможность).

### any — выключатель проверки типов

\`any\` полностью **отключает** контроль типов: в переменную типа \`any\` можно положить что угодно, и с ней можно делать что угодно — вызывать любые методы, обращаться к любым полям. Компилятор молчит, а ошибки всплывают уже в рантайме. Хуже того, \`any\` **заражает** соседний код: значение утекает дальше и тоже перестаёт проверяться. Используй его как крайнюю меру: миграция старого кода, сторонние библиотеки без типов.

### unknown — безопасный «верхний» тип

\`unknown\` — тоже «принимает любое значение», но **безопасно**. Присвоить в \`unknown\` можно что угодно, но **сделать** с ним ничего нельзя, пока ты не **сузишь** (narrow) тип проверкой: \`typeof\`, \`instanceof\`, \`in\`, кастомный type guard. Это правильный тип для «неизвестного входа»: результат \`JSON.parse\`, ошибка в \`catch (e)\`, данные из сети.

\`\`\`ts
function parse(json: string): unknown {
  return JSON.parse(json);
}
const data = parse('{"n":1}');
// data.n;            // ошибка — сначала сузить
if (typeof data === 'object' && data && 'n' in data) {
  // здесь data сужен, обращаться безопасно
}
\`\`\`

### never — «нижний» тип без значений

\`never\` — тип, у которого **нет ни одного значения**. Он появляется:

- у функций, которые **никогда не возвращают** управление (бросают исключение или крутят бесконечный цикл);
- в **недостижимых** ветках кода;
- как результат **невозможного** пересечения типов, например \`string & number\` (значение не может быть одновременно строкой и числом).

Правило: \`never\` можно присвоить **любому** типу, но в \`never\` нельзя присвоить ничего, кроме самого \`never\`. Именно это используют для **проверки полноты** (exhaustiveness) — чтобы компилятор ругался, если забыли обработать вариант:

\`\`\`ts
function assertNever(x: never): never { throw new Error('unexpected: ' + x); }
\`\`\`

### Как это работает вместе

Ниже \`unknown\` заставляет проверить вход до использования, а \`never\` ловит забытую ветку \`switch\` на этапе компиляции:

\`\`\`ts
function safe(input: unknown) {
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
    default: { const _: never = c; return _; } // ошибка, если добавили новый вариант
  }
}
\`\`\`

## ⚠️ Подводные камни

- \`any\` беззвучно проглатывает ошибки и «заражает» код — минимизируй его, включи \`noImplicitAny\`.
- Забыл сузить \`unknown\` — получишь ошибку компиляции; это фича, а не помеха.
- Если в ветку \`default\` внезапно «пролезает» значение вместо \`never\`, значит ты не обработал какой-то член union.

## 🎯 Запомни

- \`any\` — «знаю лучше компилятора», проверка выключена (опасно).
- \`unknown\` — «не знаю, заставь меня проверить», безопасный вход для внешних данных.
- \`never\` — «такого не бывает»; главный инструмент для exhaustiveness-проверок.`,
      en: `## 🧩 In plain words

\`any\`, \`unknown\`, and \`never\` are three special TypeScript types that are easy to mix up. The simplest way to remember them: \`any\` means "do whatever you want, I turned checking off" (dangerous), \`unknown\` means "I don't know what this is yet, check first" (safe), and \`never\` means "there is no such value at all" (a logical impossibility).

### any — the type-checking off switch

\`any\` completely **disables** type checking: you can put anything into an \`any\` variable, and do anything with it — call any method, read any field. The compiler stays silent, and the errors surface at runtime instead. Worse, \`any\` **infects** neighboring code: the value flows onward and stops being checked too. Use it as a last resort: migrating old code, untyped third-party libraries.

### unknown — the safe "top" type

\`unknown\` also "accepts any value", but **safely**. You can assign anything to \`unknown\`, but you can **do** nothing with it until you **narrow** the type with a check: \`typeof\`, \`instanceof\`, \`in\`, or a custom type guard. It's the correct type for "unknown input": the result of \`JSON.parse\`, the error in \`catch (e)\`, data from the network.

\`\`\`ts
function parse(json: string): unknown {
  return JSON.parse(json);
}
const data = parse('{"n":1}');
// data.n;            // error — narrow first
if (typeof data === 'object' && data && 'n' in data) {
  // here data is narrowed, safe to access
}
\`\`\`

### never — the "bottom" type with no values

\`never\` is a type that has **no value at all**. It shows up:

- in functions that **never return** control (they throw or loop forever);
- in **unreachable** branches of code;
- as the result of an **impossible** type intersection, e.g. \`string & number\` (a value can't be a string and a number at once).

The rule: \`never\` is assignable to **any** type, but nothing except \`never\` itself is assignable to \`never\`. That's exactly what powers **exhaustiveness** checks — making the compiler complain if you forget to handle a variant:

\`\`\`ts
function assertNever(x: never): never { throw new Error('unexpected: ' + x); }
\`\`\`

### How they work together

Below, \`unknown\` forces a check before use, and \`never\` catches a forgotten \`switch\` branch at compile time:

\`\`\`ts
function safe(input: unknown) {
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
}
\`\`\`

## ⚠️ Common pitfalls

- \`any\` silently swallows errors and "infects" code — minimize it, enable \`noImplicitAny\`.
- Forgetting to narrow \`unknown\` gives a compile error; that's the feature, not an obstacle.
- If a value suddenly slips into the \`default\` branch instead of \`never\`, you've left a union member unhandled.

## 🎯 Key takeaways

- \`any\` — "I know better than the compiler", checking off (dangerous).
- \`unknown\` — "I don't know, force me to check", the safe entry point for external data.
- \`never\` — "this cannot happen"; the key tool for exhaustiveness checks.`
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
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['type-narrowing', 'type-guards', 'control-flow'],
    question: {
      ru: 'Как работает сужение типов (narrowing) и пользовательские type guards? Что такое анализ потока управления?',
      en: 'How does type narrowing and custom type guards work? What is control-flow analysis?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что TypeScript читает твой код как детектив: на каждой строчке он держит в голове, чем **может быть** переменная прямо сейчас. Как только ты что-то проверил (\`if (typeof x === 'string')\`), детектив вычёркивает невозможные варианты и **уточняет** тип внутри этой ветки. Это уточнение и называют **сужением** (narrowing), а слежение по ветвям кода — **анализом потока управления** (control-flow analysis).

### Анализ потока управления

TypeScript отслеживает тип переменной **отдельно для каждой ветки** кода. После проверки тип в этой ветке становится точнее. Что умеет сужать тип:

- \`typeof x === 'string'\` — проверка примитива;
- \`x instanceof Cls\` — проверка на класс;
- \`'prop' in obj\` — есть ли поле в объекте;
- проверки на \`null\`/\`undefined\` и на «истинность» (truthiness);
- сравнение с литералом — ключ к дискриминируемым union (см. отдельный вопрос);
- присваивание — тип уточняется по конкретному значению.

\`\`\`ts
function f(x: string | number | null) {
  if (x == null) return;        // здесь null и undefined уже исключены
  if (typeof x === 'string') {
    x.toUpperCase();            // x: string
  } else {
    x.toFixed(2);               // x: number
  }
}
\`\`\`

### Пользовательские type guards

Иногда встроенных проверок мало — например, нужно определить свой сложный тип. Тогда пишут функцию с особым возвращаемым типом \`arg is T\` — это **предикат типа** (type predicate). Если такая функция вернула \`true\`, TS сужает аргумент до \`T\` в вызывающем коде. Важно: правильность проверки — на совести разработчика, компилятор верит тебе на слово.

\`\`\`ts
interface Cat { meow(): void }
function isCat(a: unknown): a is Cat {
  return typeof a === 'object' && a !== null && 'meow' in a;
}
\`\`\`

### Assertion-функции

Похожий инструмент — функция с типом \`asserts x is T\` (или просто \`asserts cond\`). Она **бросает исключение**, если условие ложно, а если не бросила — TS считает тип суженным **после** вызова, без обёртки в \`if\`:

\`\`\`ts
function assert(c: unknown): asserts c { if (!c) throw new Error(); }
\`\`\`

### Нюансы

- Сужение **теряется** после \`await\` или вызова колбэка: пока код «спал», переменную мог кто-то изменить. Спаси значение в отдельную \`const\` до асинхронной паузы.
- \`as const\` и поля-дискриминанты делают union легко сужаемыми.
- TS 5.5 умеет **сам выводить** предикаты для простых фильтрующих функций (например, \`arr.filter(x => x != null)\` теперь корректно убирает \`null\` из типа).

## ⚠️ Подводные камни

- Кастомный type guard может лгать: если тело проверяет не то, компилятор всё равно поверит и пропустит ошибку.
- После \`await\`/колбэка не рассчитывай на прежнее сужение — переприсвой в \`const\`.
- \`let\`-переменную, изменённую внутри замыкания, TS сужать не станет.

## 🎯 Запомни

- Control-flow analysis отслеживает тип переменной по ветвям; проверки его сужают.
- \`arg is T\` — твой собственный предикат; за его корректность отвечаешь ты.
- \`asserts\` сужает тип после вызова без \`if\`, бросая при ошибке.
- Асинхронность и колбэки сбрасывают сужение — фиксируй значение в \`const\`.`,
      en: `## 🧩 In plain words

Picture TypeScript reading your code like a detective: on every line it keeps in mind what a variable **could be** right now. The moment you check something (\`if (typeof x === 'string')\`), the detective crosses off the impossible options and **refines** the type inside that branch. That refinement is called **narrowing**, and the branch-by-branch tracking is **control-flow analysis**.

### Control-flow analysis

TypeScript tracks a variable's type **separately for each branch** of code. After a check, the type in that branch becomes more precise. What can narrow a type:

- \`typeof x === 'string'\` — a primitive check;
- \`x instanceof Cls\` — a class check;
- \`'prop' in obj\` — whether a field exists on an object;
- \`null\`/\`undefined\` and truthiness checks;
- literal comparison — the key to discriminated unions (see the separate question);
- assignment — the type is refined from the actual value.

\`\`\`ts
function f(x: string | number | null) {
  if (x == null) return;        // null and undefined already excluded here
  if (typeof x === 'string') {
    x.toUpperCase();            // x: string
  } else {
    x.toFixed(2);               // x: number
  }
}
\`\`\`

### Custom type guards

Sometimes the built-in checks aren't enough — say you need to recognize your own complex type. Then you write a function with a special return type \`arg is T\` — a **type predicate**. If that function returns \`true\`, TS narrows the argument to \`T\` at the call site. Important: the check's correctness is on you — the compiler takes your word for it.

\`\`\`ts
interface Cat { meow(): void }
function isCat(a: unknown): a is Cat {
  return typeof a === 'object' && a !== null && 'meow' in a;
}
\`\`\`

### Assertion functions

A related tool is a function typed \`asserts x is T\` (or just \`asserts cond\`). It **throws** if the condition is false; if it didn't throw, TS treats the type as narrowed **after** the call, with no \`if\` wrapper:

\`\`\`ts
function assert(c: unknown): asserts c { if (!c) throw new Error(); }
\`\`\`

### Nuances

- Narrowing is **lost** after \`await\` or a callback: while the code was "asleep", someone could have changed the variable. Save the value into a separate \`const\` before the async pause.
- \`as const\` and discriminant fields make unions easy to narrow.
- TS 5.5 can **infer predicates itself** for simple filtering functions (e.g. \`arr.filter(x => x != null)\` now correctly removes \`null\` from the type).

## ⚠️ Common pitfalls

- A custom type guard can lie: if its body checks the wrong thing, the compiler still believes it and lets the bug through.
- After \`await\`/a callback, don't rely on earlier narrowing — reassign to a \`const\`.
- TS won't narrow a \`let\` variable that gets mutated inside a closure.

## 🎯 Key takeaways

- Control-flow analysis tracks a variable's type per branch; checks narrow it.
- \`arg is T\` is your own predicate; its correctness is your responsibility.
- \`asserts\` narrows the type after the call without an \`if\`, throwing on failure.
- Async and callbacks reset narrowing — pin the value into a \`const\`.`
    }
  },
  {
    id: 'jsts-024',
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['discriminated-unions', 'tagged-unions', 'exhaustiveness'],
    question: {
      ru: 'Что такое discriminated unions и как обеспечить проверку полноты (exhaustiveness) обработки?',
      en: 'What are discriminated unions and how do you ensure exhaustiveness of handling?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь коробки с наклейкой-этикеткой: на одной написано «круг», на другой «квадрат». Ты смотришь на этикетку и сразу знаешь, что внутри именно этой коробки. **Discriminated union** (размеченное объединение) — это ровно такой набор типов: у каждого есть общее поле-«этикетка», и TypeScript по её значению сам понимает, с каким вариантом ты работаешь.

### Что такое discriminated (tagged) union

Это union (объединение) из нескольких объектных типов, у которых есть **общее поле-дискриминант** с литеральным значением — например \`kind\`, \`type\` или \`status\`. Как только ты проверяешь это поле, TS **автоматически сужает** тип до конкретного члена и открывает доступ к его полям.

\`\`\`ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rect'; w: number; h: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2; // s сужен до круга
    case 'square': return s.side ** 2;
    case 'rect':   return s.w * s.h;
  }
}
\`\`\`

### Проверка полноты (exhaustiveness)

Хочется, чтобы компилятор **гарантировал**: обработаны все варианты. Для этого добавляют ветку \`default\`, где значение присваивают в тип \`never\`. Пока обработаны все члены, в \`default\` попадает \`never\` — и всё компилируется. Но если позже добавить в union новый вариант и забыть про него, в \`default\` «просочится» реальный тип, \`never\` его не примет — и будет **ошибка компиляции**:

\`\`\`ts
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.side ** 2;
    case 'rect':   return s.w * s.h;
    default:
      const _exhaustive: never = s; // ошибка, если забыли вариант
      return _exhaustive;
  }
}
\`\`\`

### Почему это мощно

- Реализует принцип «сделать невалидные состояния непредставимыми» — у каждого варианта ровно те поля, что нужны именно ему.
- Рефакторинг безопасен: добавил новый вариант — компилятор подсветит **все** места, где его надо обработать.
- Часто удобнее иерархий классов: данные плоские, легко сериализуются в JSON, без лишнего ООП.

### Где применяют

Это краеугольный паттерн для моделирования состояний UI (загрузка/успех/ошибка), действий в Redux/NgRx и доменных событий. Классический пример — «удалённые данные»:

\`\`\`ts
type Remote<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

function render(s: Remote<string[]>): string {
  switch (s.status) {
    case 'idle':    return 'Press load';
    case 'loading': return 'Spinner...';
    case 'success': return s.data.join(', '); // s.data доступно только здесь
    case 'error':   return s.message;          // s.message доступно только здесь
  }
}
\`\`\`

## ⚠️ Подводные камни

- Дискриминант должен быть **литеральным** типом (\`'circle'\`, а не \`string\`) — иначе сужения не будет. Помогает \`as const\` или явные литеральные типы.
- Без ветки \`never\` в \`default\` забытый вариант молча превратится в баг рантайма.
- Поле-дискриминант должно называться одинаково во всех членах union.

## 🎯 Запомни

- Discriminated union — набор объектов с общим литеральным полем-«этикеткой»; по нему TS сам сужает тип.
- Ветка \`default\` с присваиванием в \`never\` даёт проверку полноты на этапе компиляции.
- Идеален для состояний UI, экшенов и доменных событий; безопаснее и проще иерархий классов.`,
      en: `## 🧩 In plain words

Picture boxes with a label sticker: one says "circle", another says "square". You glance at the label and instantly know what's inside that particular box. A **discriminated union** is exactly such a set of types: each has a shared "label" field, and TypeScript uses its value to figure out which variant you're dealing with.

### What a discriminated (tagged) union is

It's a union of several object types that share a **discriminant field** with a literal value — for example \`kind\`, \`type\`, or \`status\`. As soon as you check that field, TS **automatically narrows** the type to the specific member and unlocks access to its fields.

\`\`\`ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rect'; w: number; h: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2; // s narrowed to circle
    case 'square': return s.side ** 2;
    case 'rect':   return s.w * s.h;
  }
}
\`\`\`

### Exhaustiveness checking

You want the compiler to **guarantee** every variant is handled. To do that, add a \`default\` branch that assigns the value to the \`never\` type. While all members are handled, \`never\` is what reaches \`default\` and everything compiles. But if you later add a new union member and forget it, the real type "leaks" into \`default\`, \`never\` won't accept it — and you get a **compile error**:

\`\`\`ts
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.side ** 2;
    case 'rect':   return s.w * s.h;
    default:
      const _exhaustive: never = s; // error if a variant is missed
      return _exhaustive;
  }
}
\`\`\`

### Why it's powerful

- It realizes the "make invalid states unrepresentable" principle — each variant carries exactly the fields it needs.
- Refactoring is safe: add a new variant and the compiler flags **every** spot where it must be handled.
- Often nicer than class hierarchies: the data is flat, serializes easily to JSON, no extra OOP.

### Where it's used

It's a cornerstone pattern for modeling UI state (loading/success/error), Redux/NgRx actions, and domain events. The classic example is "remote data":

\`\`\`ts
type Remote<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

function render(s: Remote<string[]>): string {
  switch (s.status) {
    case 'idle':    return 'Press load';
    case 'loading': return 'Spinner...';
    case 'success': return s.data.join(', '); // s.data available only here
    case 'error':   return s.message;          // s.message available only here
  }
}
\`\`\`

## ⚠️ Common pitfalls

- The discriminant must be a **literal** type (\`'circle'\`, not \`string\`) — otherwise narrowing won't happen. \`as const\` or explicit literal types help.
- Without the \`never\` branch in \`default\`, a forgotten variant silently becomes a runtime bug.
- The discriminant field must have the same name across all union members.

## 🎯 Key takeaways

- A discriminated union is a set of objects with a shared literal "label" field; TS narrows by it automatically.
- A \`default\` branch assigning to \`never\` gives you compile-time exhaustiveness checking.
- Ideal for UI state, actions, and domain events; safer and simpler than class hierarchies.`
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
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['satisfies', 'type-inference', 'const-assertion'],
    question: {
      ru: 'Что делает оператор `satisfies` и чем он отличается от аннотации типа и `as`?',
      en: 'What does the `satisfies` operator do and how does it differ from a type annotation and `as`?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что ты приносишь коробку с вещами на проверку. Есть три варианта. Аннотация типа (\`: T\`) — контролёр проверяет коробку, но взамен выдаёт тебе _общее_ описание («тут одежда»), забыв, что конкретно лежало внутри. \`as T\` — ты сам вешаешь ярлык «одежда», и никто толком не проверяет, правда ли это. А \`satisfies T\` — контролёр проверяет коробку, но при этом _не трогает_ твою подробную опись: ты по-прежнему знаешь, что там красная футболка, а не просто «одежда».

### В чём проблема

В TypeScript у значения есть **выводимый тип** — тот, что компилятор угадывает сам. Для \`'red'\` он может вывести либо точный литерал \`'red'\`, либо более широкий \`string\`. Часто хочется одновременно двух вещей: **проверить**, что значение подходит под нужную форму, и при этом **сохранить** самую точную (узкую) информацию о нём.

- **Аннотация \`const x: T = ...\`** проверяет значение, но **расширяет** его тип до \`T\`. Точные литералы теряются.
- **\`as T\`** — это **утверждение** (assertion): ты говоришь компилятору «поверь, это \`T\`», и он почти не проверяет совместимость. Это опасно: ошибку легко пропустить.

### Что делает satisfies

Оператор \`satisfies\` появился в TS 4.9. Запись \`expr satisfies T\` проверяет, что \`expr\` **присваиваем** к \`T\` (то есть подходит по форме), но **не меняет** выводимый тип выражения — остаётся самый узкий.

\`\`\`ts
type Color = 'red' | 'green' | 'blue';

// аннотация: теряем конкретику значений
const a: Record<string, Color> = { primary: 'red', accent: 'green' };
// a.primary: Color (не литерал)

// satisfies: и проверка, и узкий тип
const b = {
  primary: 'red',
  accent: 'green',
} satisfies Record<string, Color>;
b.primary;        // 'red' — литерал сохранён!
// b.unknownKey;  // ошибка — не существует ключа
\`\`\`

Заметь: у \`a\` поле \`primary\` имеет тип \`Color\`, а у \`b\` — точный \`'red'\`. При этом \`b\` знает свои реальные ключи, поэтому обращение к несуществующему \`unknownKey\` — ошибка.

### Сравнение трёх подходов

- **\`: T\`** — проверяет + расширяет до \`T\` (теряет точность).
- **\`as T\`** — навязывает тип без полноценной проверки (опасно).
- **\`satisfies T\`** — проверяет + сохраняет выведенный (узкий) тип.

### Где применять

- Конфиги и словари, где нужны и проверка формы, и точные ключи/значения.
- Тематические палитры, таблицы маршрутов, маппинги действий.
- Часто в паре с \`as const\`, чтобы получить максимально узкие литералы.

\`\`\`ts
const routes = {
  home: '/',
  user: '/user/:id',
} as const satisfies Record<string, \`/\${string}\`>;
\`\`\`

Здесь \`as const\` делает значения точными литералами, а \`satisfies\` проверяет, что все они — строки, начинающиеся со \`/\`, не расширяя тип.

## ⚠️ Подводные камни

- \`satisfies\` **не** меняет тип на \`T\` — если тебе нужен именно широкий тип \`T\`, используй аннотацию.
- Не путай с \`as\`: \`as\` ничего не гарантирует и может скрыть ошибку, \`satisfies\` реально проверяет.
- Порядок важен: \`as const satisfies T\` — сначала фиксируем литералы, потом проверяем.

## 🎯 Запомни

- \`satisfies\` = «проверь соответствие, но не порти мой точный тип».
- Аннотация расширяет, \`as\` не проверяет, \`satisfies\` делает и то и другое правильно.
- Идеален для конфигов: точные ключи/значения + гарантия формы.`,
      en: `## 🧩 In plain words

Imagine you bring a box of items to be inspected. You have three options. A type annotation (\`: T\`) — the inspector checks the box, but hands you back only a _generic_ label ("clothing here"), forgetting exactly what was inside. \`as T\` — you slap on a "clothing" label yourself, and nobody really verifies it's true. And \`satisfies T\` — the inspector checks the box but leaves your _detailed_ inventory untouched: you still know there's a red T-shirt inside, not just "clothing".

### The problem

In TypeScript, a value has an **inferred type** — the one the compiler guesses on its own. For \`'red'\` it can infer either the exact literal \`'red'\` or the wider \`string\`. Often you want two things at once: to **verify** the value matches a required shape, and to **keep** the most precise (narrow) info about it.

- **An annotation \`const x: T = ...\`** checks the value but **widens** its type to \`T\`. Exact literals are lost.
- **\`as T\`** is an **assertion**: you tell the compiler "trust me, this is \`T\`", and it barely checks compatibility. That's dangerous — mistakes slip through easily.

### What satisfies does

The \`satisfies\` operator arrived in TS 4.9. Writing \`expr satisfies T\` checks that \`expr\` is **assignable** to \`T\` (i.e. matches the shape) but does **not change** the inferred type — the narrowest one stays.

\`\`\`ts
type Color = 'red' | 'green' | 'blue';

// annotation: lose specific values
const a: Record<string, Color> = { primary: 'red', accent: 'green' };
// a.primary: Color (not a literal)

// satisfies: both checked and narrow
const b = {
  primary: 'red',
  accent: 'green',
} satisfies Record<string, Color>;
b.primary;        // 'red' — literal preserved!
// b.unknownKey;  // error — no such key
\`\`\`

Notice: on \`a\`, the \`primary\` field has type \`Color\`, while on \`b\` it's the exact \`'red'\`. And \`b\` knows its real keys, so touching a non-existent \`unknownKey\` is an error.

### Comparing the three approaches

- **\`: T\`** — checks + widens to \`T\` (loses precision).
- **\`as T\`** — forces a type without a real check (dangerous).
- **\`satisfies T\`** — checks + keeps the inferred (narrow) type.

### Where to use it

- Configs and dictionaries needing both shape validation and exact keys/values.
- Theme palettes, route tables, action maps.
- Often paired with \`as const\` for the narrowest literals.

\`\`\`ts
const routes = {
  home: '/',
  user: '/user/:id',
} as const satisfies Record<string, \`/\${string}\`>;
\`\`\`

Here \`as const\` makes the values exact literals, and \`satisfies\` verifies they're all strings starting with \`/\`, without widening the type.

## ⚠️ Common pitfalls

- \`satisfies\` does **not** change the type to \`T\` — if you actually need the wide type \`T\`, use an annotation.
- Don't confuse it with \`as\`: \`as\` guarantees nothing and can hide errors, while \`satisfies\` really checks.
- Order matters: \`as const satisfies T\` — first lock the literals, then verify.

## 🎯 Key takeaways

- \`satisfies\` = "check conformance, but don't ruin my precise type".
- Annotation widens, \`as\` doesn't check, \`satisfies\` does both correctly.
- Ideal for configs: exact keys/values plus a shape guarantee.`
    }
  },
  {
    id: 'jsts-026',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['declaration-merging', 'module-augmentation', 'interfaces'],
    question: {
      ru: 'Что такое declaration merging и module augmentation в TypeScript? Где это применяется?',
      en: 'What is declaration merging and module augmentation in TypeScript? Where is it used?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Обычно, если ты дважды опишешь что-то с одним именем, будет ошибка «дубликат». Но у TypeScript есть особый приём: некоторые объявления с одинаковым именем он не ругает, а **склеивает** в одну штуку — как будто ты дописал новые страницы в уже существующую тетрадь. Это называется _declaration merging_. А _module augmentation_ — это когда ты этим приёмом дописываешь свойства в **чужую** библиотеку, к которой у тебя нет доступа к исходникам.

### Declaration merging (слияние объявлений)

TS позволяет **объединять** несколько объявлений с одним именем в одну сущность. Что именно сливается:

- **interface + interface** — поля объединяются (типы не должны конфликтовать).
- **namespace + namespace** — члены объединяются. (\`namespace\` — это способ сгруппировать связанные типы и значения под общим именем.)
- **namespace + function/class/enum** — добавляются «статические» члены и вложенные типы.
- **enum + enum**.

А вот \`type\`-алиасы (псевдонимы типов через \`type X = ...\`) **не** сливаются — будет ошибка дубликата.

\`\`\`ts
interface User { id: number; }
interface User { name: string; }
const u: User = { id: 1, name: 'Ann' }; // оба поля объединились
\`\`\`

Два объявления \`User\` слились в один интерфейс с полями \`id\` и \`name\`.

### Module augmentation (расширение модуля)

Это расширение **уже существующего модуля** снаружи через синтаксис \`declare module\`. Классический случай — добавить своё свойство в типы сторонней библиотеки, которую ты не можешь редактировать.

\`\`\`ts
// расширяем глобальный Window
declare global {
  interface Window { __APP_VERSION__: string; }
}

// расширяем модуль
import 'express';
declare module 'express' {
  interface Request { userId?: string; }
}
export {};
\`\`\`

Здесь мы добавили поле \`__APP_VERSION__\` к глобальному объекту \`window\` и поле \`userId\` к типу \`Request\` из библиотеки Express — благодаря merging наши поля просто «дописались» к уже существующим интерфейсам.

### Слияние namespace с функцией

Можно объявить функцию и одноимённый \`namespace\` — тогда у функции появятся «свойства» и вложенные типы, как будто это объект со статикой.

\`\`\`ts
function api(path: string) { return fetch(path); }
namespace api {
  export const base = '/v1';
  export interface Options { retries: number; }
}
api('/users');
api.base;             // '/v1'
const o: api.Options = { retries: 3 };
\`\`\`

\`api\` теперь и вызывается как функция, и хранит \`api.base\`, и даёт тип \`api.Options\`.

### Где применяется

- Плагины, расширяющие типы библиотек (Vue \`ComponentCustomProperties\`, Express \`Request\`).
- Глобальные типы (\`Window\`, \`globalThis\`, \`ProcessEnv\` для переменных окружения).
- Объявление ambient-модулей для нетипизированных пакетов. (Ambient — «окружающее» объявление типов без реализации, только описание формы.)

## ⚠️ Подводные камни

- Аугментация должна быть в **модульном** файле (где есть хоть один \`import\` или \`export\`), иначе \`declare module 'x'\` воспринимается как объявление **нового** ambient-модуля, а не расширение существующего.
- Глобальное «загрязнение» типов усложняет понимание кода — расширяй глобалы сдержанно.
- Конфликт полей при слиянии интерфейсов (одно имя, разные типы) → ошибка компиляции. Это неудобно, но это и защита от случайной несовместимости.

## 🎯 Запомни

- Declaration merging: несколько интерфейсов/namespace с одним именем склеиваются в один.
- Module augmentation: тем же приёмом дописываешь типы в чужие модули и глобалы через \`declare module\` / \`declare global\`.
- Не забывай \`export {}\` в файле-аугментации и помни, что \`type\`-алиасы не сливаются.`,
      en: `## 🧩 In plain words

Normally, if you describe two things with the same name, you get a "duplicate" error. But TypeScript has a special trick: some declarations sharing a name don't clash — instead it **glues** them into one thing, as if you added new pages to an existing notebook. That's called _declaration merging_. And _module augmentation_ is when you use this trick to add properties to **someone else's** library, whose source you can't touch.

### Declaration merging

TS lets you **merge** multiple declarations of the same name into one entity. What merges:

- **interface + interface** — fields combine (no conflicting types allowed).
- **namespace + namespace** — members combine. (A \`namespace\` is a way to group related types and values under one name.)
- **namespace + function/class/enum** — adds "static"-like members and nested types.
- **enum + enum**.

But \`type\` aliases (type nicknames via \`type X = ...\`) do **not** merge — you get a duplicate error.

\`\`\`ts
interface User { id: number; }
interface User { name: string; }
const u: User = { id: 1, name: 'Ann' }; // both fields merged
\`\`\`

The two \`User\` declarations merged into one interface with fields \`id\` and \`name\`.

### Module augmentation

This is extending an **already existing module** from outside via the \`declare module\` syntax. The classic case is adding your own property to a third-party library's types that you can't edit.

\`\`\`ts
// augment global Window
declare global {
  interface Window { __APP_VERSION__: string; }
}

// augment a module
import 'express';
declare module 'express' {
  interface Request { userId?: string; }
}
export {};
\`\`\`

Here we added \`__APP_VERSION__\` to the global \`window\` object and \`userId\` to the \`Request\` type from the Express library — thanks to merging, our fields simply got "appended" to the existing interfaces.

### Merging a namespace with a function

You can declare a function and a same-named \`namespace\` — then the function gains "properties" and nested types, as if it were an object with statics.

\`\`\`ts
function api(path: string) { return fetch(path); }
namespace api {
  export const base = '/v1';
  export interface Options { retries: number; }
}
api('/users');
api.base;             // '/v1'
const o: api.Options = { retries: 3 };
\`\`\`

\`api\` is now callable as a function, holds \`api.base\`, and provides the type \`api.Options\`.

### Where it's used

- Plugins extending library types (Vue \`ComponentCustomProperties\`, Express \`Request\`).
- Global types (\`Window\`, \`globalThis\`, \`ProcessEnv\` for environment variables).
- Ambient module declarations for untyped packages. (Ambient means a type-only declaration with no implementation — just a shape description.)

## ⚠️ Common pitfalls

- Augmentation must live in a **module** file (one with at least one \`import\` or \`export\`); otherwise \`declare module 'x'\` is read as declaring a **new** ambient module rather than extending the existing one.
- Global type "pollution" makes code harder to reason about — augment globals sparingly.
- A field conflict when merging interfaces (same name, different types) → compile error. Inconvenient, but also a safeguard against accidental incompatibility.

## 🎯 Key takeaways

- Declaration merging: multiple interfaces/namespaces with the same name glue into one.
- Module augmentation: the same trick lets you add types to other people's modules and globals via \`declare module\` / \`declare global\`.
- Remember \`export {}\` in an augmentation file, and note that \`type\` aliases don't merge.`
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
    category: 'javascript-typescript',
    level: 'Expert',
    tags: ['decorators', 'tc39-decorators', 'metadata'],
    question: {
      ru: 'Чем отличаются «старые» декораторы TS (experimentalDecorators) от стандарта TC39 Stage 3?',
      en: 'How do the "legacy" TS decorators (experimentalDecorators) differ from the TC39 Stage 3 standard?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Декоратор — это «обёртка» с символом \`@\`, которую вешают над классом, методом или полем, чтобы добавить им поведение (например, логирование или регистрацию в системе). Проблема в том, что за годы придумали **две разные** версии декораторов, и они несовместимы, как розетки разных стран. Старая версия (legacy) живёт в Angular и NestJS, а новая — это официальный стандарт TC39, который вот-вот войдёт в сам JavaScript. Их нельзя смешивать в одном проекте.

### Legacy-декораторы (experimentalDecorators: true)

Это **ранний** вариант из старого предложения. Он включается флагом \`experimentalDecorators\` в конфиге и используется в Angular, NestJS, TypeORM.

- Сигнатура для декоратора метода: \`(target, propertyKey, descriptor)\`. (\`descriptor\` — это объект-описание свойства, через который можно подменить сам метод.)
- Поддерживают **декораторы параметров** (можно декорировать отдельный аргумент функции).
- Вместе с флагом \`emitDecoratorMetadata\` и библиотекой \`reflect-metadata\` умеют «запекать» **типовые метаданные** в рантайм (\`design:type\`, \`design:paramtypes\`) — то есть информацию о типах становится видно во время выполнения. На этом построен DI (dependency injection, внедрение зависимостей) в Angular.

\`\`\`ts
function Log(target: any, key: string, desc: PropertyDescriptor) {
  const orig = desc.value;
  desc.value = function (...a: any[]) {
    console.log(key, a);
    return orig.apply(this, a);
  };
}
\`\`\`

Декоратор берёт исходный метод (\`desc.value\`), оборачивает его функцией, которая сначала логирует, а потом вызывает оригинал.

### TC39 Stage 3 (TS 5.0, работает по умолчанию без флага)

Это **стандартный** дизайн, близкий к попаданию в сам ECMAScript (Stage 3 — предпоследняя стадия готовности предложения).

- Декоратор получает \`(value, context)\`, где \`context\` — объект с полезной информацией: \`kind\` (что декорируем), \`name\`, \`addInitializer\` (добавить код инициализации), \`static\`, \`private\`.
- **Нет** декораторов параметров (пока).
- Нет встроенного экспорта метаданных типов (для этого есть отдельное предложение \`Symbol.metadata\`).

\`\`\`ts
function log<T>(orig: any, ctx: ClassMethodDecoratorContext) {
  return function (this: T, ...args: any[]) {
    console.log(ctx.name, args);
    return orig.call(this, ...args);
  };
}
\`\`\`

Здесь декоратор получает оригинальный метод и контекст, а возвращает новую функцию-замену — имя метода берётся из \`ctx.name\`.

### Практический выбор

- **Angular на данный момент** требует legacy-декораторы (\`experimentalDecorators\`), потому что зависит от \`emitDecoratorMetadata\` для своего DI.
- Новые проекты вне таких фреймворков — бери стандартные декораторы.
- Смешивать в одном проекте нельзя: флаг переключает **всю** семантику сразу. Перенос кода между системами требует переписывания сигнатур декораторов.

## ⚠️ Подводные камни

- Не путай сигнатуры: \`(target, key, descriptor)\` — это legacy, \`(value, context)\` — это стандарт. Скопированный из чужого проекта декоратор может не завестись из-за другого режима.
- Метаданные типов (\`design:paramtypes\`) есть **только** в legacy с \`emitDecoratorMetadata\` + \`reflect-metadata\`. В стандарте их из коробки нет.
- Стандарт пока без декораторов параметров — если они нужны (типичный DI), это аргумент за legacy.

## 🎯 Запомни

- Две несовместимые системы: legacy (\`experimentalDecorators\`) и стандарт TC39 Stage 3 (TS 5.0 по умолчанию).
- Legacy = \`(target, key, descriptor)\`, декораторы параметров, метаданные типов, нужен Angular/NestJS.
- Стандарт = \`(value, context)\`, ближе к ECMAScript; выбирай его для новых проектов вне таких фреймворков.`,
      en: `## 🧩 In plain words

A decorator is a \`@\`-symbol "wrapper" you put above a class, method, or field to add behavior (like logging or registering it in a system). The catch: over the years, **two different** decorator designs were invented, and they're incompatible — like power sockets from different countries. The old (legacy) version lives in Angular and NestJS, while the new one is the official TC39 standard that's about to land in JavaScript itself. You can't mix them in one project.

### Legacy decorators (experimentalDecorators: true)

This is the **early** version from an old proposal. It's turned on by the \`experimentalDecorators\` flag in the config and is used by Angular, NestJS, TypeORM.

- Method decorator signature: \`(target, propertyKey, descriptor)\`. (\`descriptor\` is a property-description object through which you can swap out the method itself.)
- Support **parameter decorators** (you can decorate an individual function argument).
- Together with the \`emitDecoratorMetadata\` flag and the \`reflect-metadata\` library, they "bake" **type metadata** into runtime (\`design:type\`, \`design:paramtypes\`) — meaning type info becomes visible at execution time. Angular's DI (dependency injection) is built on this.

\`\`\`ts
function Log(target: any, key: string, desc: PropertyDescriptor) {
  const orig = desc.value;
  desc.value = function (...a: any[]) {
    console.log(key, a);
    return orig.apply(this, a);
  };
}
\`\`\`

The decorator grabs the original method (\`desc.value\`), wraps it in a function that first logs, then calls the original.

### TC39 Stage 3 (TS 5.0, on by default without the flag)

This is the **standard** design, close to landing in ECMAScript itself (Stage 3 is the second-to-last readiness stage for a proposal).

- A decorator receives \`(value, context)\`, where \`context\` is an object with useful info: \`kind\` (what's being decorated), \`name\`, \`addInitializer\` (add init code), \`static\`, \`private\`.
- **No** parameter decorators (yet).
- No built-in type-metadata emission (there's a separate \`Symbol.metadata\` proposal for that).

\`\`\`ts
function log<T>(orig: any, ctx: ClassMethodDecoratorContext) {
  return function (this: T, ...args: any[]) {
    console.log(ctx.name, args);
    return orig.call(this, ...args);
  };
}
\`\`\`

Here the decorator receives the original method and a context, and returns a new replacement function — the method name comes from \`ctx.name\`.

### Practical choice

- **Angular currently** requires legacy decorators (\`experimentalDecorators\`) because it depends on \`emitDecoratorMetadata\` for its DI.
- New projects outside such frameworks — go with standard decorators.
- You can't mix them in one project: the flag switches the **entire** semantics at once. Porting code between systems requires rewriting decorator signatures.

## ⚠️ Common pitfalls

- Don't confuse the signatures: \`(target, key, descriptor)\` is legacy, \`(value, context)\` is standard. A decorator copied from another project may not work due to a different mode.
- Type metadata (\`design:paramtypes\`) exists **only** in legacy with \`emitDecoratorMetadata\` + \`reflect-metadata\`. The standard has none out of the box.
- The standard still lacks parameter decorators — if you need them (typical for DI), that's an argument for legacy.

## 🎯 Key takeaways

- Two incompatible systems: legacy (\`experimentalDecorators\`) and the TC39 Stage 3 standard (TS 5.0 default).
- Legacy = \`(target, key, descriptor)\`, parameter decorators, type metadata, needed by Angular/NestJS.
- Standard = \`(value, context)\`, closer to ECMAScript; pick it for new projects outside such frameworks.`
    }
  },
  {
    id: 'jsts-028',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['const-type-parameters', 'inference', 'literals'],
    question: {
      ru: 'Что такое `const`-параметры типа (TS 5.0)? Какую проблему вывода они решают?',
      en: 'What are `const` type parameters (TS 5.0)? Which inference problem do they solve?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Когда ты передаёшь значение в дженерик-функцию, TypeScript по привычке **округляет** тип до «общего»: строку \`'a'\` он видит не как именно \`'a'\`, а просто как \`string\`; массив \`[1, 2]\` — как \`number[]\`. Часто это мешает: хочется, чтобы функция запомнила _точные_ значения. Раньше приходилось каждый раз дописывать \`as const\` при вызове. \`const\`-параметры типа (TS 5.0) решают это раз и навсегда: автор функции один раз помечает параметр, и вызывающий получает точные типы бесплатно.

### Проблема расширения литералов

По умолчанию при выводе дженерика (обобщённого типа) TS **расширяет** литералы: \`'a'\` → \`string\`, \`[1, 2]\` → \`number[]\`. «Расширение» (widening) — это когда точное значение заменяется более общим типом.

\`\`\`ts
function id<T>(x: T): T { return x; }
const r = id(['a', 'b']); // T = string[]
\`\`\`

Мы передали конкретный массив \`['a', 'b']\`, но \`T\` вывелся как \`string[]\` — точная форма потеряна.

### const type parameters

Запись \`<const T>\` (TS 5.0) говорит компилятору выводить \`T\` так, **как будто** аргумент помечен \`as const\` — и вызывающему при этом ничего делать не нужно.

\`\`\`ts
function asTuple<const T>(x: T): T { return x; }
const a = asTuple(['a', 'b']);     // readonly ['a', 'b']
const o = asTuple({ k: 1 });       // { readonly k: 1 }

function route<const T extends readonly string[]>(parts: T): T { return parts; }
const r = route(['users', 'list']); // readonly ['users', 'list']
\`\`\`

Теперь \`a\` — не \`string[]\`, а точный \`readonly ['a', 'b']\` (кортеж, tuple — массив фиксированной длины с известными типами на каждой позиции).

### Что именно меняется

- Литералы **не расширяются** (\`'a'\` остаётся \`'a'\`).
- Массивы становятся **readonly-кортежами** (\`readonly [...]\`).
- Объекты получают \`readonly\`-свойства с литеральными типами значений.

### Ограничения

- Действует только на **вывод** типа. Если тип задан явно, эффекта нет.
- Не делает значение реально неизменяемым в рантайме — это **только типы**, во время выполнения массив остаётся обычным изменяемым массивом.
- Не «проникает» сквозь уже расширенное значение. Например, если сначала завести переменную без \`as const\`, её тип уже станет \`string[]\`, и передача в функцию с \`const T\` этого не исправит.

### Применение

Типобезопасные DSL (маленькие предметные языки), билдеры маршрутов, схемы валидации, API вроде \`createStore\` — везде, где важна точная литеральная форма входа, но не хочется заставлять пользователя писать \`as const\` вручную.

## ⚠️ Подводные камни

- \`const T\` помогает только при **выводе из аргумента**. Явно указанный тип (\`asTuple<string[]>(...)\`) отменяет эффект.
- Иммутабельность только на уровне типов: в рантайме \`readonly\` ничего не запрещает, объект по-прежнему можно мутировать.
- Если значение уже «расширилось» раньше (в промежуточной переменной), \`const\`-параметр его назад не сузит.

## 🎯 Запомни

- \`<const T>\` = «выводи так, будто пользователь написал \`as const\`» — точные литералы без бойлерплейта у вызывающего.
- Массивы → readonly-кортежи, объекты → readonly-свойства, литералы не расширяются.
- Работает только на выводе типов и только в системе типов (никакой рантайм-иммутабельности).`,
      en: `## 🧩 In plain words

When you pass a value into a generic function, TypeScript habitually **rounds** the type up to something "general": it sees the string \`'a'\` not as exactly \`'a'\` but just as \`string\`; the array \`[1, 2]\` becomes \`number[]\`. This often gets in the way when you want the function to remember the _exact_ values. Previously you had to add \`as const\` at every call. \`const\` type parameters (TS 5.0) fix this once and for all: the function's author marks the parameter once, and callers get precise types for free.

### The literal widening problem

By default, when inferring a generic (a reusable type), TS **widens** literals: \`'a'\` → \`string\`, \`[1, 2]\` → \`number[]\`. "Widening" is when an exact value is replaced by a more general type.

\`\`\`ts
function id<T>(x: T): T { return x; }
const r = id(['a', 'b']); // T = string[]
\`\`\`

We passed the concrete array \`['a', 'b']\`, but \`T\` was inferred as \`string[]\` — the exact shape is lost.

### const type parameters

Writing \`<const T>\` (TS 5.0) tells the compiler to infer \`T\` **as if** the argument were marked \`as const\` — and the caller does nothing.

\`\`\`ts
function asTuple<const T>(x: T): T { return x; }
const a = asTuple(['a', 'b']);     // readonly ['a', 'b']
const o = asTuple({ k: 1 });       // { readonly k: 1 }

function route<const T extends readonly string[]>(parts: T): T { return parts; }
const r = route(['users', 'list']); // readonly ['users', 'list']
\`\`\`

Now \`a\` isn't \`string[]\` but the exact \`readonly ['a', 'b']\` (a tuple — a fixed-length array with a known type at each position).

### What changes exactly

- Literals are **not widened** (\`'a'\` stays \`'a'\`).
- Arrays become **readonly tuples** (\`readonly [...]\`).
- Objects get \`readonly\` properties with literal value types.

### Limitations

- Only affects type **inference**. If the type is given explicitly, no effect.
- Doesn't make the value truly immutable at runtime — **types only**; at execution time the array is still an ordinary mutable array.
- Doesn't "reach through" an already-widened value. For example, if you first store it in a variable without \`as const\`, its type is already \`string[]\`, and passing it to a function with \`const T\` won't fix that.

### Uses

Type-safe DSLs (small domain-specific languages), route builders, validation schemas, \`createStore\`-like APIs — anywhere the exact literal shape of input matters but you don't want to force users to write \`as const\` by hand.

## ⚠️ Common pitfalls

- \`const T\` only helps when **inferring from the argument**. An explicit type (\`asTuple<string[]>(...)\`) cancels the effect.
- Immutability is type-level only: at runtime \`readonly\` forbids nothing, the object can still be mutated.
- If the value already "widened" earlier (in an intermediate variable), a \`const\` parameter won't narrow it back.

## 🎯 Key takeaways

- \`<const T>\` = "infer as if the user wrote \`as const\`" — precise literals with no boilerplate on the caller's side.
- Arrays → readonly tuples, objects → readonly properties, literals not widened.
- Works only on type inference and only in the type system (no runtime immutability).`
    }
  },
  {
    id: 'jsts-029',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['structural-typing', 'nominal-typing', 'branding'],
    question: {
      ru: 'Что такое структурная типизация в TypeScript? Как сэмулировать номинальную типизацию (branding)?',
      en: 'What is structural typing in TypeScript? How do you emulate nominal typing (branding)?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь клуб, куда пускают не по паспорту с именем, а по внешнему виду: «есть куртка и очки — заходи». Так работает TypeScript: ему важно, какие поля есть у объекта, а не как называется его тип. Это называется **структурная типизация**. Иногда это мешает — например, \`ID пользователя\` и \`ID заказа\` оба строки, и TS их путает. Чтобы TS начал их различать «по имени», используют трюк под названием **branding** (брендирование).

### Структурная типизация: совместимость по форме

**Структурная типизация** (её ещё зовут «утиной» — «если крякает как утка, значит утка») означает: тип совместим с другим, если у него есть все нужные поля. Имя типа неважно.

\`\`\`ts
interface Point { x: number; y: number; }
class Vec { constructor(public x: number, public y: number) {} }
const p: Point = new Vec(1, 2); // ok — структура совпадает
\`\`\`

Здесь \`Vec\` — это не \`Point\`, но у него есть \`x\` и \`y\` тех же типов, поэтому TS считает его подходящим. Форма важнее имени.

### Плюсы и риск

Это гибко и удобно, когда разный код должен «понимать» друг друга без лишней возни. Но есть обратная сторона: два разных по смыслу типа с одинаковой формой становятся взаимозаменяемыми.

\`\`\`ts
type UserId = string;
type OrderId = string;
// оба — просто string, TS их не различает → легко перепутать и получить баг
\`\`\`

### Branding: как заставить TS различать типы по имени

**Номинальная типизация** — это когда важно именно имя типа (как в Java/C#: \`UserId\` и \`OrderId\` — разные типы, даже если внутри одинаковы). В TS её нет, но можно **сэмулировать** через branding.

Идея: добавить к типу невидимое **фантомное** поле-маркер. «Фантомное» значит — оно существует только в системе типов, в реальных данных его нет.

\`\`\`ts
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

const makeUserId = (s: string) => s as UserId;

function load(id: UserId) {/* ... */}
load(makeUserId('u1'));        // ok
// load('u1' as OrderId);      // ошибка — разные бренды
\`\`\`

\`unique symbol\` — это уникальный ключ, который гарантированно не совпадёт ни с каким другим. За счёт разных строк-меток (\`'UserId'\` vs \`'OrderId'\`) типы становятся несовместимыми, хотя оба построены на \`string\`.

### Excess property checks (проверка лишних свойств)

Ещё одна деталь структурной системы. Когда ты присваиваешь **литерал объекта** (объект, написанный прямо на месте), TS дополнительно ругается на «лишние» поля, которых нет в целевом типе — это поверх обычной проверки формы.

\`\`\`ts
interface Cfg { a: number; }
const c1: Cfg = { a: 1, b: 2 };   // ошибка — лишнее свойство b
const tmp = { a: 1, b: 2 };
const c2: Cfg = tmp;               // ok — через переменную проверка не срабатывает
\`\`\`

Именно поэтому «литерал ругается, а через переменную — нет».

## ⚠️ Подводные камни

- Бренд живёт **только в типах**. В рантайме branded-значение — обычная строка или число, никакой защиты во время выполнения нет.
- Создавать branded-значения нужно через контролируемый «конструктор» с \`as\` (как \`makeUserId\`), иначе теряется смысл.
- Не раскидывай \`as SomeBrand\` где попало — это ручное утверждение, TS тебе верит на слово.

## 🎯 Запомни

- TS сравнивает типы **по форме**, а не по имени — это структурная типизация.
- Одинаковая форма = взаимозаменяемость, даже если смысл разный (\`UserId\` vs \`OrderId\`).
- **Branding** добавляет фантомный маркер-поле, чтобы эмулировать номинальную типизацию — только на уровне типов.
- Литерал объекта проходит дополнительную проверку на лишние свойства; через переменную она обходится.`,
      en: `## 🧩 In plain words

Imagine a club that lets you in not by the name on your ID, but by how you look: "got a jacket and glasses? come in." That's how TypeScript works: it cares about which fields an object has, not what its type is called. This is called **structural typing**. Sometimes it backfires — for example, a \`user ID\` and an \`order ID\` are both strings, and TS mixes them up. To make TS tell them apart "by name," people use a trick called **branding**.

### Structural typing: compatibility by shape

**Structural typing** (also called "duck typing" — "if it quacks like a duck, it's a duck") means: a type is compatible with another if it has all the required members. The type's name doesn't matter.

\`\`\`ts
interface Point { x: number; y: number; }
class Vec { constructor(public x: number, public y: number) {} }
const p: Point = new Vec(1, 2); // ok — shapes match
\`\`\`

Here \`Vec\` isn't a \`Point\`, but it has \`x\` and \`y\` of the same types, so TS accepts it. Shape beats name.

### Pros and risk

This is flexible and handy when different pieces of code need to "understand" each other without ceremony. The downside: two types that mean different things but share the same shape become interchangeable.

\`\`\`ts
type UserId = string;
type OrderId = string;
// both are just string — TS can't tell them apart → easy to swap and get a bug
\`\`\`

### Branding: making TS tell types apart by name

**Nominal typing** is when the type's name matters (as in Java/C#: \`UserId\` and \`OrderId\` are different types even if they look the same inside). TS doesn't have it, but you can **emulate** it with branding.

The idea: attach an invisible **phantom** marker field to the type. "Phantom" means it exists only in the type system — it's not in the real data.

\`\`\`ts
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

const makeUserId = (s: string) => s as UserId;

function load(id: UserId) {/* ... */}
load(makeUserId('u1'));        // ok
// load('u1' as OrderId);      // error — different brands
\`\`\`

\`unique symbol\` is a guaranteed-unique key that can't collide with any other. Because the label strings differ (\`'UserId'\` vs \`'OrderId'\`), the types become incompatible even though both are built on \`string\`.

### Excess property checks

Another detail of the structural system. When you assign an **object literal** (an object written inline), TS additionally complains about "excess" fields that aren't in the target type — on top of the normal shape check.

\`\`\`ts
interface Cfg { a: number; }
const c1: Cfg = { a: 1, b: 2 };   // error — excess property b
const tmp = { a: 1, b: 2 };
const c2: Cfg = tmp;               // ok — going through a variable skips the check
\`\`\`

That's exactly why "the literal complains but the variable doesn't."

## ⚠️ Common pitfalls

- The brand lives **only in types**. At runtime a branded value is a plain string or number — there's no runtime protection.
- Create branded values through a controlled "constructor" with \`as\` (like \`makeUserId\`); otherwise the whole point is lost.
- Don't scatter \`as SomeBrand\` everywhere — it's a manual assertion, and TS takes your word for it.

## 🎯 Key takeaways

- TS compares types **by shape**, not by name — that's structural typing.
- Same shape = interchangeable, even if the meaning differs (\`UserId\` vs \`OrderId\`).
- **Branding** adds a phantom marker field to emulate nominal typing — at the type level only.
- Object literals get an extra excess-property check; going through a variable bypasses it.`
    }
  },
  {
    id: 'jsts-030',
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['promises', 'async-await', 'microtasks'],
    question: {
      ru: 'Как async/await транслируется в промисы и как взаимодействует с очередью микрозадач?',
      en: 'How does async/await translate to promises and interact with the microtask queue?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

\`async/await\` — это удобная «обёртка» вокруг промисов, чтобы асинхронный код читался как обычный, сверху вниз. Слово \`await\` работает как пауза: «подожди тут, пока результат не готов, а потом продолжай». Важный момент: даже такая пауза не выполняется мгновенно — продолжение встаёт в специальную **очередь микрозадач** и запускается чуть позже, после текущего синхронного кода.

### async/await — это сахар поверх промисов

**Промис** (Promise) — объект, который обещает «результат будет позже: готово или ошибка». **Микрозадача** — маленькое задание, которое движок выполняет сразу после текущего куска синхронного кода, но раньше таймеров и событий.

\`async\`-функция **всегда** возвращает промис. \`await expr\` приостанавливает функцию, пока \`expr\` не завершится, и **планирует продолжение как микрозадачу**. По сути это то же самое, что \`.then()\` с остатком функции внутри колбэка.

\`\`\`js
async function f() {
  console.log('A');
  await null;            // даже await не-промиса откладывает продолжение
  console.log('B');
}
console.log('1');
f();
console.log('2');
// 1, A, 2, B  — 'B' уходит в микрозадачу
\`\`\`

Смотри порядок: \`1\` и \`A\` — синхронные. На \`await\` функция ставится на паузу, управление возвращается наружу, печатается \`2\`. И только потом, из очереди микрозадач, — \`B\`.

### Важные детали

- \`await x\` внутри оборачивает \`x\` в \`Promise.resolve(x)\`, а продолжение — это **микрозадача**. Поэтому код после \`await\` всегда выполняется **после** синхронного кода текущего «тика».
- Ошибка внутри \`async\`-функции превращается в **отклонённый** (rejected) промис. Обычный \`try/catch\` ловит ошибки из \`await\`, как будто код синхронный.
- Несколько \`await\` подряд выполняются **по очереди** (последовательно). Для параллельного запуска есть \`Promise.all\`.

### Параллельность

\`\`\`js
// последовательно (медленно): ждём A, потом B
const a = await fetchA();
const b = await fetchB();

// параллельно (быстро): запускаем оба сразу, ждём оба
const [a2, b2] = await Promise.all([fetchA(), fetchB()]);
\`\`\`

Если запросы независимы, \`Promise.all\` экономит время: они идут одновременно, а не «в затылок».

### Осторожно с циклами

\`\`\`js
// forEach НЕ ждёт — 'done' печатается раньше, чем закончится хоть один fetch
async function badLoop(urls) {
  urls.forEach(async (u) => { await fetch(u); });
  console.log('done');
}

// правильно последовательно
async function seq(urls) {
  for (const u of urls) await fetch(u);
  console.log('done');
}
// правильно параллельно
async function par(urls) {
  await Promise.all(urls.map((u) => fetch(u)));
  console.log('done');
}
\`\`\`

\`forEach\` не умеет ждать колбэки \`async\` — он просто запускает их и идёт дальше. Нужен \`for...of\` с \`await\` (по очереди) или \`Promise.all(map)\` (параллельно).

## ⚠️ Подводные камни

- \`forEach\` **не дожидается** async-колбэков — берите \`for...of\` + \`await\` или \`Promise.all(map)\`.
- Необработанное отклонение промиса вызывает событие \`unhandledrejection\` — не забывайте про \`try/catch\` или \`.catch\`.
- \`await\` внутри цикла создаёт «водопад» последовательных запросов; осознанно выбирайте между порядком и скоростью.
- \`Promise.allSettled\` (ждёт все, включая ошибки), \`race\` (первый любой), \`any\` (первый успешный) — разные стратегии ожидания.

## 🎯 Запомни

- \`async\`-функция всегда возвращает промис; \`await\` — сахар над \`.then()\`.
- Код после \`await\` уходит в **очередь микрозадач** и выполняется после синхронного кода тика.
- Последовательные \`await\` = медленно; независимые задачи запускай через \`Promise.all\`.
- \`forEach\` не ждёт async — используйте \`for...of\` или \`Promise.all\`.`,
      en: `## 🧩 In plain words

\`async/await\` is a convenient "wrapper" around promises so async code reads like ordinary top-to-bottom code. The word \`await\` acts like a pause: "wait here until the result is ready, then continue." The key subtlety: even that pause isn't instant — the continuation gets queued in a special **microtask queue** and runs a bit later, after the current synchronous code.

### async/await is sugar over promises

A **Promise** is an object that promises "the result will come later: success or error." A **microtask** is a small job the engine runs right after the current chunk of synchronous code, but before timers and events.

An \`async\` function **always** returns a promise. \`await expr\` suspends the function until \`expr\` settles and **schedules the continuation as a microtask**. It's essentially the same as \`.then()\` with the rest of the function inside the callback.

\`\`\`js
async function f() {
  console.log('A');
  await null;            // even awaiting a non-promise defers continuation
  console.log('B');
}
console.log('1');
f();
console.log('2');
// 1, A, 2, B  — 'B' goes to a microtask
\`\`\`

Watch the order: \`1\` and \`A\` are synchronous. At \`await\` the function pauses, control returns to the outside, and \`2\` prints. Only then, from the microtask queue, does \`B\` run.

### Key details

- \`await x\` internally wraps \`x\` in \`Promise.resolve(x)\`, and the continuation is a **microtask**. So code after \`await\` always runs **after** the current tick's synchronous code.
- An error inside an \`async\` function becomes a **rejected** promise. A plain \`try/catch\` catches \`await\` errors as if the code were synchronous.
- Several \`await\`s in a row run **one after another** (sequentially). For parallel execution use \`Promise.all\`.

### Parallelism

\`\`\`js
// sequential (slow): wait for A, then B
const a = await fetchA();
const b = await fetchB();

// parallel (fast): start both at once, wait for both
const [a2, b2] = await Promise.all([fetchA(), fetchB()]);
\`\`\`

If the requests are independent, \`Promise.all\` saves time: they run at the same time instead of back-to-back.

### Careful with loops

\`\`\`js
// forEach does NOT await — 'done' prints before any fetch finishes
async function badLoop(urls) {
  urls.forEach(async (u) => { await fetch(u); });
  console.log('done');
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
}
\`\`\`

\`forEach\` can't await \`async\` callbacks — it just kicks them off and moves on. Use \`for...of\` with \`await\` (sequential) or \`Promise.all(map)\` (parallel).

## ⚠️ Common pitfalls

- \`forEach\` does **not** await async callbacks — use \`for...of\` + \`await\` or \`Promise.all(map)\`.
- An unhandled promise rejection fires an \`unhandledrejection\` event — don't forget \`try/catch\` or \`.catch\`.
- \`await\` inside a loop creates a "waterfall" of sequential requests; choose deliberately between order and speed.
- \`Promise.allSettled\` (waits for all, errors included), \`race\` (first to settle), \`any\` (first success) cover different waiting strategies.

## 🎯 Key takeaways

- An \`async\` function always returns a promise; \`await\` is sugar over \`.then()\`.
- Code after \`await\` goes to the **microtask queue** and runs after the tick's synchronous code.
- Sequential \`await\`s = slow; run independent tasks with \`Promise.all\`.
- \`forEach\` doesn't await async — use \`for...of\` or \`Promise.all\`.`
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
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['immutability', 'object-freeze', 'const'],
    question: {
      ru: 'Чем `const` отличается от иммутабельности? Как работает `Object.freeze` и его ограничения?',
      en: 'How does `const` differ from immutability? How does `Object.freeze` work and its limits?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

\`const\` — это про **имя переменной**, а не про её содержимое. Представь коробку с наклейкой: \`const\` запрещает переклеить наклейку на другую коробку, но то, что лежит внутри коробки, спокойно можно менять. Чтобы «запечатать» само содержимое объекта, нужен отдельный инструмент — \`Object.freeze\`. Но и он замораживает только верхний слой.

### const ≠ иммутабельность

\`const\` запрещает **переприсваивание** (нельзя дать переменной новое значение), но **не** запрещает менять внутренности объекта или массива. Ссылка зафиксирована — данные нет.

\`\`\`js
const arr = [1, 2];
arr.push(3);      // ok — менять содержимое можно
// arr = [];      // ошибка — переприсваивать нельзя
\`\`\`

**Иммутабельность** — это когда сами данные нельзя изменить. \`const\` этого не даёт.

### Object.freeze — поверхностная заморозка

\`Object.freeze(obj)\` делает объект **неизменяемым, но только на верхнем уровне**:

- нельзя добавлять или удалять свойства;
- нельзя менять значения существующих свойств;
- нельзя менять дескрипторы (настройки свойств) и прототип.

В **строгом режиме** (\`'use strict'\`) попытка что-то изменить бросает \`TypeError\`. В нестрогом — изменение **молча игнорируется** (ошибки нет, но и эффекта тоже). Проверить, заморожен ли объект, можно через \`Object.isFrozen\`.

\`\`\`js
'use strict';
const cfg = Object.freeze({ a: 1, nested: { b: 2 } });
// cfg.a = 5;        // TypeError
cfg.nested.b = 99;   // ok! заморозка поверхностная
\`\`\`

### Ограничение: freeze не рекурсивен + deep freeze

Ключевое ограничение: \`freeze\` замораживает только сам объект, а **вложенные** объекты остаются изменяемыми (видно на \`cfg.nested.b\` выше). Чтобы заморозить всё дерево, обходят его рекурсивно:

\`\`\`js
function deepFreeze(o) {
  Object.getOwnPropertyNames(o).forEach((k) => {
    const v = o[k];
    if (v && typeof v === 'object') deepFreeze(v);
  });
  return Object.freeze(o);
}
\`\`\`

Функция спускается по всем вложенным объектам и замораживает каждый. Осторожно с **циклическими ссылками** (объект ссылается сам на себя) — наивная версия может зациклиться.

### Родственные инструменты

- \`Object.seal\` — запрещает добавлять/удалять свойства, но **разрешает** менять их значения.
- \`Object.preventExtensions\` — запрещает только добавление новых свойств.
- В TypeScript есть \`readonly\` и \`Readonly<T>\`, но это защита **только на этапе компиляции** — в рантайме никакой блокировки нет. Для настоящей неизменяемости данных используют \`freeze\` или библиотеки (Immer, Immutable.js).

## ⚠️ Подводные камни

- В нестрогом режиме мутация замороженного объекта **тихо проваливается** — легко не заметить баг.
- \`Object.freeze\` **поверхностный** — не путайте с глубокой заморозкой.
- \`Readonly<T>\` из TS исчезает после компиляции; на него нельзя полагаться в рантайме.

## 🎯 Запомни

- \`const\` фиксирует **ссылку**, а не данные — содержимое объекта можно менять.
- \`Object.freeze\` замораживает только **верхний уровень**; вложенное — нет.
- В строгом режиме мутация замороженного бросает \`TypeError\`, в нестрогом — молчит.
- Для глубокой заморозки нужен рекурсивный \`deepFreeze\`; TS \`readonly\` — только компиляция.`,
      en: `## 🧩 In plain words

\`const\` is about the **variable's name**, not its contents. Picture a box with a label: \`const\` forbids moving the label to a different box, but whatever is inside the box you can freely change. To "seal" the contents of an object, you need a separate tool — \`Object.freeze\`. And even that freezes only the top layer.

### const ≠ immutability

\`const\` forbids **rebinding** (you can't give the variable a new value) but does **not** forbid changing the insides of an object or array. The reference is fixed — the data isn't.

\`\`\`js
const arr = [1, 2];
arr.push(3);      // ok — mutating contents is allowed
// arr = [];      // error — rebinding is forbidden
\`\`\`

**Immutability** means the data itself can't be changed. \`const\` doesn't give you that.

### Object.freeze — shallow freeze

\`Object.freeze(obj)\` makes an object **immutable, but only at the top level**:

- can't add or remove properties;
- can't change the values of existing properties;
- can't change descriptors (property settings) or the prototype.

In **strict mode** (\`'use strict'\`) a mutation attempt throws \`TypeError\`. In sloppy mode it's **silently ignored** (no error, but no effect either). You can check whether an object is frozen with \`Object.isFrozen\`.

\`\`\`js
'use strict';
const cfg = Object.freeze({ a: 1, nested: { b: 2 } });
// cfg.a = 5;        // TypeError
cfg.nested.b = 99;   // ok! the freeze is shallow
\`\`\`

### Limit: freeze isn't recursive + deep freeze

The key limitation: \`freeze\` freezes only the object itself, while **nested** objects stay mutable (see \`cfg.nested.b\` above). To freeze the whole tree, traverse it recursively:

\`\`\`js
function deepFreeze(o) {
  Object.getOwnPropertyNames(o).forEach((k) => {
    const v = o[k];
    if (v && typeof v === 'object') deepFreeze(v);
  });
  return Object.freeze(o);
}
\`\`\`

The function walks into every nested object and freezes each one. Mind **circular references** (an object pointing back to itself) — a naive version can loop forever.

### Related tools

- \`Object.seal\` — forbids adding/removing properties but **allows** changing their values.
- \`Object.preventExtensions\` — forbids only adding new properties.
- TypeScript has \`readonly\` and \`Readonly<T>\`, but that's protection **at compile time only** — there's no runtime block. For real data immutability use \`freeze\` or libraries (Immer, Immutable.js).

## ⚠️ Common pitfalls

- In sloppy mode, mutating a frozen object **fails silently** — easy to miss the bug.
- \`Object.freeze\` is **shallow** — don't confuse it with deep freezing.
- TS's \`Readonly<T>\` disappears after compilation; you can't rely on it at runtime.

## 🎯 Key takeaways

- \`const\` fixes the **reference**, not the data — an object's contents can still change.
- \`Object.freeze\` freezes only the **top level**; nested objects stay mutable.
- In strict mode, mutating a frozen object throws \`TypeError\`; in sloppy mode it's silent.
- Deep freezing needs a recursive \`deepFreeze\`; TS \`readonly\` is compile-time only.`
    }
  },
  {
    id: 'jsts-032',
    category: 'javascript-typescript',
    level: 'Expert',
    tags: ['v8-internals', 'hidden-classes', 'optimization'],
    question: {
      ru: 'Что такое hidden classes (shapes) и inline caches в V8? Как они влияют на производительность?',
      en: 'What are hidden classes (shapes) and inline caches in V8? How do they affect performance?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

JavaScript позволяет добавлять объектам поля в любой момент — это гибко, но для движка медленно. Чтобы ускориться, движок V8 (в Chrome и Node.js) втихую придумывает объектам «чертёж» — **hidden class** (скрытый класс). Объекты с одинаковым набором и порядком полей делят один чертёж, и работать с ними становится быстро. А **inline cache** — это как записка «поле x лежит вот тут», которую V8 клеит рядом с кодом, чтобы не искать заново.

### Hidden classes (shapes / maps)

Хотя JS-объекты динамичны, V8 для скорости строит под капотом **hidden class** — описание «формы» объекта: какие свойства, в каком порядке и по каким смещениям (offset — позиция в памяти) они лежат. Объекты с одинаковой структурой **делят один** hidden class.

Добавление свойств порождает **переходы** между скрытыми классами (это дерево переходов, transition tree). Поэтому важны и **набор**, и **порядок** инициализации полей:

\`\`\`js
function A() { this.x = 1; this.y = 2; } // одна форма для всех A
const a1 = new A(), a2 = new A();         // делят hidden class

const p1 = { x: 1 }; p1.y = 2;
const p2 = { y: 2 }; p2.x = 1;            // другой порядок → другая форма
\`\`\`

\`p1\` и \`p2\` имеют одни и те же поля, но заданные в разном порядке — и V8 присвоит им **разные** скрытые классы.

### Inline caches (IC)

Когда код обращается к свойству (\`obj.x\`), V8 запоминает прямо в месте вызова, где лежит \`x\` для той формы, которую он там встретил. Это и есть **inline cache**. Виды:

- **monomorphic** — в этом месте встречается только одна форма (быстро).
- **polymorphic** — несколько форм (медленнее, движок держит до ~4).
- **megamorphic** — форм много, кэш отключается, идёт медленный общий путь.

### Что замедляет

- Разные «формы» объектов в горячем (часто исполняемом) коде → полиморфизм.
- Удаление свойств (\`delete\`), смена прототипа, присваивание \`__proto__\`.
- Смешанные типы в «упакованных» массивах: переход \`SMI\` (маленькое целое) → double → object заставляет V8 менять внутреннее представление.
- Разреженные массивы с «дырами» (holes) переводят массив в медленный «dictionary mode» (режим словаря).

### Практика

- Инициализируйте все поля в конструкторе в **одном и том же порядке** — так объекты делят форму.
- Избегайте \`delete\` — присваивайте \`undefined\` или используйте \`Map\`, если ключи динамичны.
- Держите массивы однотипными и плотными (без дыр).
- Не оптимизируйте вслепую: **профилируйте**. Современные движки умны, но согласованные формы стабильно помогают на горячих путях.

## ⚠️ Подводные камни

- \`delete obj.prop\` ломает hidden class и роняет производительность — почти всегда лучше \`obj.prop = undefined\`.
- Один и тот же «по смыслу» объект, собранный в разном порядке полей, получает разные формы и делает код полиморфным.
- Микрооптимизации без профилирования часто бесполезны — сначала измерьте.

## 🎯 Запомни

- **Hidden class** — внутренний «чертёж» формы объекта; одинаковая структура = общий класс = скорость.
- **Inline cache** запоминает расположение свойства; monomorphic быстрее polymorphic, а megamorphic — медленный путь.
- Одинаковый порядок полей, отказ от \`delete\`, плотные однотипные массивы — держат код быстрым.
- Всё это микрооптимизации: сначала профилируй, потом чини горячие пути.`,
      en: `## 🧩 In plain words

JavaScript lets you add fields to objects at any time — flexible, but slow for the engine. To speed up, V8 (in Chrome and Node.js) quietly gives objects a "blueprint" called a **hidden class**. Objects with the same set and order of fields share one blueprint, and working with them becomes fast. An **inline cache** is like a sticky note "field x lives right here" that V8 attaches next to the code so it doesn't have to search again.

### Hidden classes (shapes / maps)

Although JS objects are dynamic, for speed V8 builds an internal **hidden class** under the hood — a description of the object's "shape": which properties, in which order, at which offsets (an offset is a position in memory) they sit. Objects with the same structure **share one** hidden class.

Adding properties creates **transitions** between hidden classes (a transition tree). So both the **set** and the **order** of field initialization matter:

\`\`\`js
function A() { this.x = 1; this.y = 2; } // one shape for all A
const a1 = new A(), a2 = new A();         // share a hidden class

const p1 = { x: 1 }; p1.y = 2;
const p2 = { y: 2 }; p2.x = 1;            // different order → different shape
\`\`\`

\`p1\` and \`p2\` have the same fields, but set in a different order — so V8 gives them **different** hidden classes.

### Inline caches (IC)

When code accesses a property (\`obj.x\`), V8 remembers, right at the call site, where \`x\` lives for the shape it saw there. That's the **inline cache**. Kinds:

- **monomorphic** — only one shape seen at this site (fast).
- **polymorphic** — several shapes (slower; the engine keeps up to ~4).
- **megamorphic** — many shapes, the cache is disabled, a slow generic path is used.

### What slows it down

- Different object "shapes" in hot (frequently run) code → polymorphism.
- Deleting properties (\`delete\`), changing the prototype, assigning \`__proto__\`.
- Mixed types in "packed" arrays: a \`SMI\` (small integer) → double → object transition forces V8 to change the internal representation.
- Sparse arrays with "holes" drop the array into slow "dictionary mode."

### Practice

- Initialize all fields in the constructor in the **same order** — so objects share a shape.
- Avoid \`delete\` — assign \`undefined\`, or use a \`Map\` if keys are dynamic.
- Keep arrays uniform and dense (no holes).
- Don't optimize blindly: **profile**. Modern engines are smart, but consistent shapes reliably help on hot paths.

## ⚠️ Common pitfalls

- \`delete obj.prop\` breaks the hidden class and tanks performance — \`obj.prop = undefined\` is almost always better.
- The "same" object built with a different field order gets different shapes and makes code polymorphic.
- Micro-optimizations without profiling are often pointless — measure first.

## 🎯 Key takeaways

- A **hidden class** is an internal "blueprint" of an object's shape; same structure = shared class = speed.
- An **inline cache** remembers a property's location; monomorphic beats polymorphic, and megamorphic is the slow path.
- Consistent field order, avoiding \`delete\`, and dense uniform arrays keep code fast.
- These are micro-optimizations: profile first, then fix the hot paths.`
    }
  },
  {
    id: 'jsts-033',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['overloads', 'function-types', 'this-typing'],
    question: {
      ru: 'Как работают перегрузки функций в TypeScript и типизация `this`? В чём отличие от union-сигнатуры?',
      en: 'How do function overloads and `this` typing work in TypeScript? How do they differ from a union signature?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь администратора справочной, у которого висит несколько табличек: «если спросишь про поезда — вот ответ», «если про автобусы — вот другой». Снаружи ты видишь эти отдельные таблички и точно знаешь, какой ответ получишь на свой вопрос. Но за стойкой сидит один человек, который сам разбирается, кто к нему пришёл. Вот это и есть **перегрузки функций** в TypeScript: несколько «табличек» (сигнатур) над одной живой функцией.

А типизация \`this\` — это способ заранее сказать: «эту функцию можно вызывать только внутри такого-то объекта», чтобы TypeScript ловил ошибки, если её выдернули не туда.

### Что такое перегрузка

**Сигнатура** — это описание функции: какие типы принимает и что возвращает. Перегрузка — это когда ты пишешь **несколько сигнатур-объявлений** над одной **реализацией** (телом функции). Тот, кто вызывает функцию, «видит» только объявления. А тело принимает самый широкий тип аргументов и само разбирается, что делать.

\`\`\`ts
function reverse(x: string): string;
function reverse<T>(x: T[]): T[];
function reverse(x: string | unknown[]): string | unknown[] {
  return typeof x === 'string'
    ? [...x].reverse().join('')
    : [...x].reverse();
}
reverse('abc');     // string
reverse([1, 2, 3]); // number[]
\`\`\`

Здесь две видимые сигнатуры: строка → строка, массив → массив. Третья строка — это реализация: она принимает «строку ИЛИ массив» и внутри через \`typeof\` понимает, что именно пришло. Снаружи разработчик получает точный тип: передал строку — вернётся строка, передал массив чисел — вернётся массив чисел.

### Почему не union-сигнатура

Можно было бы написать один параметр-**union** (объединение типов): \`x: string | T[]\`. Но тогда TypeScript не свяжет **вход с выходом**: результат будет \`string | T[]\` для любого вызова. То есть на строку он вернёт «строку или массив» — и тебе придётся дополнительно проверять, что там.

Перегрузки задают именно **зависимость**: строка → строка, массив → массив. Для того, кто пользуется функцией, это гораздо точнее — никаких лишних проверок.

### Порядок сигнатур важен

TypeScript выбирает **первую** подходящую сигнатуру сверху вниз. Поэтому более специфичные (узкие) ставь выше, а общие — ниже. Сигнатура реализации (последняя, с телом) **не видна** снаружи и в выборе не участвует — она нужна только компилятору, чтобы проверить само тело.

### Типизация this

В обычную функцию можно добавить **первый «фантомный» параметр** с именем \`this\` — он задаёт тип \`this\` и в рантайме не существует (при вызове его не передают).

\`\`\`ts
interface Btn { label: string; }
function render(this: Btn): string { return this.label; }
// render();          // ошибка — нет подходящего this
\`\`\`

Такую \`render\` нельзя вызвать «просто так» — только в контексте объекта типа \`Btn\` (например, как метод). Есть и полезные варианты:

- \`this: void\` — запрещает использовать \`this\` внутри функции вообще (удобно для колбэков).
- \`ThisParameterType<T>\` — утилита, которая **извлекает** тип \`this\` из типа функции.
- \`OmitThisParameter<T>\` — утилита, которая **убирает** параметр \`this\`, давая «обычный» тип функции.

### Современная альтернатива

Часто вместо перегрузок берут **дженерик с условным возвращаемым типом** (тип, который «if-ит» результат в зависимости от аргумента). Он лучше масштабируется и не страдает от «дыр» в выборе сигнатуры. Но когда у функции реально разное число или смысл аргументов, перегрузки читаются понятнее.

## ⚠️ Подводные камни

- Перегрузки — это **только типы**. Рантайм-логику (тот самый \`typeof\`-разбор) ты пишешь руками; TypeScript её не генерирует.
- Если поставить общую сигнатуру выше специфичной — специфичная может никогда не сработать.
- Сигнатуру реализации легко перепутать с видимой: она НЕ доступна вызывающему, даже если её типы шире.
- Забыть про \`this: void\` в колбэках — и внутри случайно используешь чужой \`this\`.

## 🎯 Запомни

- Перегрузка = несколько видимых сигнатур над одним телом; тело само разбирает, что пришло.
- Union-параметр теряет связь «вход → выход», а перегрузки её сохраняют — это главное отличие.
- Сигнатуры проверяются сверху вниз, поэтому узкие ставь выше; реализация снаружи не видна.
- \`this\` можно типизировать первым «фантомным» параметром; \`this: void\` запрещает \`this\`.`,
      en: `## 🧩 In plain words

Picture an information desk with several signs hanging up: "ask about trains — here's that answer," "ask about buses — here's a different one." From the outside you see these separate signs and know exactly what answer your question gets. But behind the desk sits one person who figures out who's asking. That's exactly what **function overloads** are in TypeScript: several "signs" (signatures) over one living function.

And \`this\` typing is a way to say up front: "this function may only be called inside such-and-such object," so TypeScript catches mistakes if it gets pulled out of context.

### What an overload is

A **signature** describes a function: which types it accepts and what it returns. An overload is when you write **several declaration signatures** over one **implementation** (the function body). Callers only "see" the declarations. The body accepts the widest argument type and figures out what to do itself.

\`\`\`ts
function reverse(x: string): string;
function reverse<T>(x: T[]): T[];
function reverse(x: string | unknown[]): string | unknown[] {
  return typeof x === 'string'
    ? [...x].reverse().join('')
    : [...x].reverse();
}
reverse('abc');     // string
reverse([1, 2, 3]); // number[]
\`\`\`

Here there are two visible signatures: string → string, array → array. The third line is the implementation: it accepts "string OR array" and uses \`typeof\` to tell which one arrived. From outside, the developer gets a precise type: pass a string, get a string back; pass a number array, get a number array back.

### Why not a union signature

You could write one **union** parameter (a combination of types): \`x: string | T[]\`. But then TypeScript won't tie **input to output**: the result would be \`string | T[]\` for any call. So passing a string returns "string or array" — and you'd have to do extra checks on the result.

Overloads express exactly the **dependency**: string → string, array → array. For the consumer that's far more precise — no extra checks needed.

### Order of signatures matters

TypeScript picks the **first** matching signature, top to bottom. So put the more specific (narrower) ones higher and general ones lower. The implementation signature (the last one, with the body) is **not visible** externally and doesn't participate in selection — it only helps the compiler type-check the body.

### this typing

You can add a **first "phantom" parameter** named \`this\` to a regular function — it declares the \`this\` type and doesn't exist at runtime (it isn't passed when calling).

\`\`\`ts
interface Btn { label: string; }
function render(this: Btn): string { return this.label; }
// render();          // error — no suitable this
\`\`\`

This \`render\` can't be called "bare" — only in the context of a \`Btn\` object (say, as a method). There are handy variants too:

- \`this: void\` — forbids using \`this\` inside the function at all (great for callbacks).
- \`ThisParameterType<T>\` — a utility that **extracts** the \`this\` type from a function type.
- \`OmitThisParameter<T>\` — a utility that **strips** the \`this\` parameter, giving a "plain" function type.

### A modern alternative

Overloads are often replaced by a **generic with a conditional return type** (a type that "if-s" the result based on the argument). It scales better and has no signature-selection "holes." But when a function genuinely takes a different number or meaning of arguments, overloads read more clearly.

## ⚠️ Common pitfalls

- Overloads are **types only**. You write the runtime logic (that \`typeof\` dispatch) by hand; TypeScript doesn't generate it.
- Put a general signature above a specific one and the specific one may never fire.
- The implementation signature is easy to confuse with a visible one: it is NOT available to callers, even if its types are wider.
- Forget \`this: void\` in callbacks and you might accidentally use someone else's \`this\` inside.

## 🎯 Key takeaways

- An overload = several visible signatures over one body; the body sorts out what arrived.
- A union parameter loses the "input → output" link; overloads keep it — that's the key difference.
- Signatures are checked top to bottom, so put narrow ones higher; the implementation is invisible externally.
- You can type \`this\` via a first "phantom" parameter; \`this: void\` forbids \`this\`.`
    }
  },
  {
    id: 'jsts-034',
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['enums', 'const-enum', 'union-types'],
    question: {
      ru: 'Чем отличаются обычные `enum`, `const enum` и union литеральных типов? Что предпочесть?',
      en: 'How do regular `enum`, `const enum`, and unions of literal types differ? What should you prefer?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что тебе нужно перечислить фиксированный набор вариантов: стороны света, статусы загрузки, роли пользователя. В TypeScript есть три способа это сделать, и они отличаются одним: **сколько следов остаётся в готовом JavaScript-коде**. Обычный \`enum\` оставляет целый объект, \`const enum\` растворяется без следа (значения «вклеиваются» прямо в код), а union строковых литералов вообще ничего не добавляет в рантайм — это чистый тип.

Проще говоря: enum — это «настоящая вещь», которая живёт в собранном коде; union литералов — это «наклейка», которая существует только на этапе проверки типов.

### Обычный enum

Он генерирует **реальный объект** в JS-выводе. Для числовых enum добавляется ещё и «обратный маппинг» — по числу можно узнать имя. Значит, enum существует в рантайме, занимает место в бандле (собранном файле), зато позволяет перебирать значения и обращаться к ним динамически.

\`\`\`ts
enum Dir { Up, Down }      // Up=0, Down=1
Dir.Up;     // 0
Dir[0];     // 'Up' (обратный маппинг, только для числовых)
\`\`\`

### const enum

Слово \`const\` говорит компилятору **вклеить (заинлайнить)** значения прямо в код: каждое обращение \`Color.Red\` заменяется на литерал, а сам объект **не создаётся**. Бандл меньше — но есть подвохи:

- не работает при \`isolatedModules\` без опции \`preserveConstEnums\` (это режим, где каждый файл компилируется отдельно);
- проблемен для библиотек: потребитель твоего пакета не получит значения, потому что вклеивать было нечего;
- Babel и esbuild по умолчанию не умеют так инлайнить, как это делает сам TypeScript.

\`\`\`ts
const enum Color { Red, Green }
const c = Color.Red; // компилируется в: const c = 0;
\`\`\`

### Union литеральных типов

Это запись вида \`type Dir = 'up' | 'down'\` — просто перечисление допустимых значений через \`|\`. У неё **нет рантайм-следа** вообще: в JS не попадает ничего. При этом отличное сужение типов, значения сериализуются в JSON как есть, и она прекрасно дружит с дискриминируемыми union (объединениями, которые различают по общему полю-«метке»).

\`\`\`ts
type Status = 'idle' | 'loading' | 'done';
const s: Status = 'idle';
\`\`\`

### Что предпочесть

- **Union строковых литералов** — рекомендуемый выбор по умолчанию: ноль рантайма, отличная типизация, совместимость с JSON.
- Нужна **итерация или обратный маппинг** в рантайме — бери обычный enum или объект с \`as const\` плюс \`keyof typeof\`.
- \`const enum\` — только в приложениях (не в библиотеках) и когда ты понимаешь ограничения своего сборщика.

Паттерн \`as const\` + \`typeof\` часто лучший компромисс: и настоящие значения в рантайме, и точные типы.

\`\`\`ts
const Roles = { Admin: 'admin', User: 'user' } as const;
type Role = typeof Roles[keyof typeof Roles]; // 'admin' | 'user'
\`\`\`

Здесь \`as const\` замораживает объект (делает значения точными литералами), а \`typeof Roles[keyof typeof Roles]\` вытаскивает из него union всех значений — получаешь \`'admin' | 'user'\` и при этом сам объект доступен в рантайме.

## ⚠️ Подводные камни

- \`const enum\` может «взорваться» при смене сборщика (esbuild/Babel/\`isolatedModules\`) — самый хрупкий вариант.
- Числовые enum молча принимают любое число (\`Dir\` примет \`5\`, даже если такого нет), строковые и union — нет.
- Обычный enum раздувает бандл сильнее, чем кажется, из-за обратного маппинга.
- Union литералов не даёт перебрать варианты в рантайме — если нужен список значений, придётся дублировать его вручную либо использовать \`as const\`.

## 🎯 Запомни

- Разница между тремя вариантами — в рантайм-следе: enum = объект, \`const enum\` = вклеенные литералы, union = ничего.
- По умолчанию бери union строковых литералов: ноль рантайма и отличные типы.
- Нужны значения в рантайме (итерация, список) — \`as const\` + \`keyof typeof\` обычно лучший компромисс.
- \`const enum\` избегай в библиотеках и при нестандартном тулчейне.`,
      en: `## 🧩 In plain words

Suppose you need to list a fixed set of options: compass directions, loading statuses, user roles. TypeScript gives you three ways to do it, and they differ in one thing: **how much trace is left in the final JavaScript**. A regular \`enum\` leaves a whole object behind, a \`const enum\` dissolves without a trace (its values get "pasted" straight into the code), and a union of string literals adds nothing to runtime at all — it's a pure type.

Put simply: an enum is a "real thing" that lives in the compiled code; a literal union is a "sticker" that exists only during type checking.

### Regular enum

It emits a **real object** in the JS output. For numeric enums it also adds a "reverse mapping" — from the number you can get the name back. So an enum exists at runtime, takes up bundle space (in the compiled file), but in return lets you iterate over values and access them dynamically.

\`\`\`ts
enum Dir { Up, Down }      // Up=0, Down=1
Dir.Up;     // 0
Dir[0];     // 'Up' (reverse mapping, numeric only)
\`\`\`

### const enum

The \`const\` keyword tells the compiler to **inline** the values straight into the code: each \`Color.Red\` access is replaced with a literal, and no object is emitted. Smaller bundle — but with catches:

- breaks under \`isolatedModules\` without the \`preserveConstEnums\` option (that's the mode where each file compiles independently);
- problematic for libraries: a consumer of your package won't get the values, because there was nothing to inline;
- Babel and esbuild by default don't inline it the way TypeScript itself does.

\`\`\`ts
const enum Color { Red, Green }
const c = Color.Red; // compiles to: const c = 0;
\`\`\`

### Unions of literal types

This is the form \`type Dir = 'up' | 'down'\` — just a list of allowed values joined by \`|\`. It has **no runtime footprint** at all: nothing lands in the JS. Yet it narrows types beautifully, serializes to JSON as-is, and plays perfectly with discriminated unions (unions distinguished by a shared "tag" field).

\`\`\`ts
type Status = 'idle' | 'loading' | 'done';
const s: Status = 'idle';
\`\`\`

### What to prefer

- **Union of string literals** — the recommended default: zero runtime, excellent typing, JSON-friendly.
- Need runtime **iteration or reverse mapping** — use a regular enum or an object with \`as const\` plus \`keyof typeof\`.
- \`const enum\` — only in apps (not libraries) and when you understand your bundler's limits.

The \`as const\` + \`typeof\` pattern is often the best compromise: real values at runtime AND precise types.

\`\`\`ts
const Roles = { Admin: 'admin', User: 'user' } as const;
type Role = typeof Roles[keyof typeof Roles]; // 'admin' | 'user'
\`\`\`

Here \`as const\` freezes the object (makes the values exact literals), and \`typeof Roles[keyof typeof Roles]\` pulls out a union of all its values — you get \`'admin' | 'user'\` while the object stays available at runtime.

## ⚠️ Common pitfalls

- \`const enum\` can "explode" when you switch bundlers (esbuild/Babel/\`isolatedModules\`) — the most fragile option.
- Numeric enums silently accept any number (\`Dir\` accepts \`5\` even if no such member exists); string and union types don't.
- A regular enum bloats the bundle more than you'd expect because of reverse mapping.
- A literal union can't be iterated at runtime — if you need a list of values, you must duplicate it by hand or use \`as const\`.

## 🎯 Key takeaways

- The difference between the three is the runtime trace: enum = object, \`const enum\` = inlined literals, union = nothing.
- Default to a union of string literals: zero runtime and excellent types.
- Need runtime values (iteration, a list) — \`as const\` + \`keyof typeof\` is usually the best compromise.
- Avoid \`const enum\` in libraries and with non-standard toolchains.`
    }
  },
  {
    id: 'jsts-035',
    category: 'javascript-typescript',
    level: 'Expert',
    tags: ['recursive-types', 'tail-recursion', 'type-level'],
    question: {
      ru: 'Как работают рекурсивные типы и tail-recursive условные типы в TypeScript? Каковы пределы?',
      en: 'How do recursive types and tail-recursive conditional types work in TypeScript? What are the limits?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Рекурсивный тип — это тип, который **ссылается сам на себя**, как две зеркала друг напротив друга дают бесконечную вложенность. Это позволяет описывать вложенные структуры (например, JSON, где внутри объекта может быть ещё объект, а в нём массив, а в массиве снова объект) и даже **вычислять** прямо на уровне типов, ничего не запуская.

Главная тонкость — у такой «типовой рекурсии» есть предел глубины, чтобы компилятор не зациклился. А особый трюк, **хвостовая рекурсия** (когда рекурсивный вызов — это весь результат ветки), позволяет уходить гораздо глубже без переполнения.

### Рекурсивные типы

Тип может ссылаться на себя внутри своего же определения. Так моделируют вложенные структуры и делают вычисления на уровне типов.

\`\`\`ts
type Json =
  | string | number | boolean | null
  | Json[]
  | { [k: string]: Json };

type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
\`\`\`

\`Json\` описывает любое JSON-значение: строка, число и т.д., либо массив таких же \`Json\`, либо объект, где значения снова \`Json\`. \`DeepReadonly\` рекурсивно проходит по всем вложенным полям и делает их \`readonly\` (только для чтения). **Условный тип** здесь — \`T extends object ? ... : ...\`, то есть «если \`T\` объект, то одно, иначе другое».

### Рекурсивные условные типы

Начиная с TS 4.1 условные типы могут **вызывать сами себя**. Это фундамент для парсеров на типах, вычисления длины, разворота кортежей, арифметики.

\`\`\`ts
type Length<T extends readonly unknown[]> = T['length'];

type BuildTuple<N extends number, R extends unknown[] = []> =
  R['length'] extends N ? R : BuildTuple<N, [...R, unknown]>;
type Five = Length<BuildTuple<5>>; // 5
\`\`\`

\`BuildTuple\` строит кортеж (tuple — массив фиксированной длины) из \`N\` элементов: пока длина накопителя \`R\` не равна \`N\`, он добавляет ещё один \`unknown\` и вызывает себя заново. \`Length\` просто читает свойство \`['length']\`. Итог — тип-число \`5\`. Это и есть «вычисление» без запуска кода.

### Устранение хвостовой рекурсии

С TS 4.5 компилятор оптимизирует **хвостовую рекурсию** в условных типах. «Хвостовая» — значит рекурсивный вызов является **всем** результатом ветки (паттерн «накопитель», аккумулятор). В этом случае глубина растёт без переполнения внутреннего стека инстанцирования (внутренней очереди, где TS раскрывает типы). Практический предел резко поднимается — примерно с 50 до 10 000 шагов.

\`\`\`ts
// хвостовая: аккумулятор растёт, вызов стоит на месте результата
type Join<T extends string[], D extends string, Acc extends string = ''> =
  T extends [infer H extends string, ...infer R extends string[]]
    ? Join<R, D, Acc extends '' ? H : \`\${Acc}\${D}\${H}\`>
    : Acc;
\`\`\`

\`Join\` склеивает массив строк через разделитель \`D\`, накапливая результат в \`Acc\`. Ключевое: \`Join<...>\` стоит прямо в позиции результата ветки — никакой обёртки вокруг вызова нет. Именно это позволяет компилятору применить оптимизацию.

### Пределы

- Нехвостовые рекурсии быстро упираются в ошибку «Type instantiation is excessively deep and possibly infinite» (слишком глубокая инстанциация).
- Глубокая типовая рекурсия **замедляет** компиляцию и отзывчивость IDE (подсказки, автодополнение тормозят).
- Это академически увлекательно, но в проде применяй умеренно — поддерживаемость важнее «типового кунг-фу».

## ⚠️ Подводные камни

- Чтобы сработала оптимизация, вызов должен быть именно в хвостовой позиции: обернёшь его во что-то (\`[Join<...>]\`, \`\` \`\${Join<...>}\` \`\`) — оптимизация пропадёт.
- Легко получить бесконечную рекурсию, забыв базовый случай (условие остановки) — компилятор упрётся в лимит.
- «Умные» типы, которые никто в команде не понимает, — это долг, а не актив.

## 🎯 Запомни

- Рекурсивный тип ссылается на себя — так описывают вложенность и считают на уровне типов.
- Хвостовая рекурсия (вызов = весь результат ветки) с TS 4.5 поднимает предел глубины примерно с 50 до 10 000.
- Обёртка вокруг рекурсивного вызова ломает оптимизацию и возвращает низкий лимит.
- Мощно, но дорого для компиляции и читаемости — используй умеренно.`,
      en: `## 🧩 In plain words

A recursive type is a type that **refers to itself**, the way two mirrors facing each other create infinite nesting. This lets you describe nested structures (like JSON, where an object can contain another object, which contains an array, which again contains an object) and even **compute** right at the type level, without running anything.

The main subtlety: this "type recursion" has a depth limit so the compiler doesn't loop forever. And a special trick, **tail recursion** (when the recursive call is the entire result of the branch), lets you go far deeper without overflowing.

### Recursive types

A type can refer to itself inside its own definition. That's how you model nested structures and do type-level computation.

\`\`\`ts
type Json =
  | string | number | boolean | null
  | Json[]
  | { [k: string]: Json };

type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
\`\`\`

\`Json\` describes any JSON value: a string, number, etc., or an array of the same \`Json\`, or an object whose values are again \`Json\`. \`DeepReadonly\` walks recursively through all nested fields and makes them \`readonly\`. The **conditional type** here is \`T extends object ? ... : ...\`, meaning "if \`T\` is an object do one thing, otherwise another."

### Recursive conditional types

Since TS 4.1 conditional types can **call themselves**. This is the foundation for type-level parsers, computing length, reversing tuples, arithmetic.

\`\`\`ts
type Length<T extends readonly unknown[]> = T['length'];

type BuildTuple<N extends number, R extends unknown[] = []> =
  R['length'] extends N ? R : BuildTuple<N, [...R, unknown]>;
type Five = Length<BuildTuple<5>>; // 5
\`\`\`

\`BuildTuple\` builds a tuple (a fixed-length array) of \`N\` elements: while the accumulator \`R\`'s length isn't \`N\`, it adds one more \`unknown\` and calls itself again. \`Length\` just reads the \`['length']\` property. The result is the numeric type \`5\`. That's "computation" with no code running.

### Tail-recursion elimination

Since TS 4.5 the compiler optimizes **tail recursion** in conditional types. "Tail" means the recursive call is the **entire** result of the branch (the "accumulator" pattern). In that case depth grows without overflowing the internal instantiation stack (the internal queue where TS expands types). The practical limit jumps sharply — roughly from 50 to 10,000 steps.

\`\`\`ts
// tail-recursive: accumulator grows, the call sits in result position
type Join<T extends string[], D extends string, Acc extends string = ''> =
  T extends [infer H extends string, ...infer R extends string[]]
    ? Join<R, D, Acc extends '' ? H : \`\${Acc}\${D}\${H}\`>
    : Acc;
\`\`\`

\`Join\` glues an array of strings together with separator \`D\`, accumulating the result in \`Acc\`. The key point: \`Join<...>\` sits directly in the branch's result position — there's no wrapper around the call. That's exactly what lets the compiler apply the optimization.

### Limits

- Non-tail recursions quickly hit the error "Type instantiation is excessively deep and possibly infinite."
- Deep type recursion **slows** compilation and IDE responsiveness (hints and autocomplete lag).
- It's academically fun, but use it sparingly in production — maintainability beats "type kung-fu."

## ⚠️ Common pitfalls

- For the optimization to kick in, the call must be exactly in tail position: wrap it in anything (\`[Join<...>]\`, \`\` \`\${Join<...>}\` \`\`) and the optimization is gone.
- It's easy to create infinite recursion by forgetting the base case (the stop condition) — the compiler hits the limit.
- "Clever" types nobody on the team understands are debt, not an asset.

## 🎯 Key takeaways

- A recursive type refers to itself — that's how you describe nesting and compute at the type level.
- Tail recursion (call = the whole branch result) raises the depth limit from ~50 to ~10,000 since TS 4.5.
- Wrapping the recursive call breaks the optimization and brings back the low limit.
- Powerful but costly for compilation and readability — use in moderation.`
    }
  },
  {
    id: 'jsts-036',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['index-signatures', 'keyof', 'record-access'],
    question: {
      ru: 'Как работают index signatures и `keyof`? Почему доступ по индексу бывает небезопасным и что такое noUncheckedIndexedAccess?',
      en: 'How do index signatures and `keyof` work? Why is indexed access sometimes unsafe and what is noUncheckedIndexedAccess?'
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь ящик с ярлыками: ты обещаешь, что «под любым текстовым ярлыком лежит число». Это и есть **index signature** (индексная сигнатура) — способ сказать TypeScript: «ключи могут быть любые, а значения вот такого типа». Проблема в том, что TypeScript по доброте душевной верит, будто под ЛЮБЫМ ярлыком точно что-то лежит — даже под тем, который ты только что придумал. А в реальности там может быть пусто (\`undefined\`), и код упадёт.

\`keyof\` — это «список всех ярлыков», которые реально есть. А флаг \`noUncheckedIndexedAccess\` — это выключатель наивного оптимизма: он заставляет TypeScript честно признать «а вдруг тут пусто».

### Index signatures

Запись \`{ [key: string]: V }\` описывает объект с **произвольными** ключами и значениями типа \`V\`. Ключи бывают \`string\`, \`number\` или \`symbol\`. Важное правило: все явно объявленные свойства обязаны быть совместимы с типом сигнатуры.

\`\`\`ts
interface Dict { [key: string]: number; }
const d: Dict = { a: 1 };
d.b;   // тип number — но в рантайме undefined!
\`\`\`

Здесь \`d.b\` по типам считается числом, хотя такого ключа мы не клали — в рантайме там \`undefined\`. Вот корень проблемы.

### keyof и indexed access

\`keyof T\` даёт union (объединение) всех ключей типа. \`T[K]\` — это тип значения по конкретному ключу (**indexed access**, доступ по индексу на уровне типов). Вместе они дают типобезопасный доступ.

\`\`\`ts
type Obj = { id: number; name: string };
type Keys = keyof Obj;        // 'id' | 'name'
type V = Obj['name'];         // string
\`\`\`

\`keyof Obj\` — это \`'id' | 'name'\`, а \`Obj['name']\` — \`string\`. Так можно писать функции, которые принимают только реально существующие ключи.

### Почему доступ бывает небезопасным

По умолчанию TypeScript считает, что индексный доступ **всегда** возвращает заявленный тип, и **игнорирует** вероятность, что ключа нет. Это оптимистичное, но неверное допущение — частый источник багов с \`undefined\`.

\`\`\`ts
const map: Record<string, number> = {};
const x = map['missing']; // тип number, реально undefined
x.toFixed();              // рантайм-ошибка
\`\`\`

\`Record<string, number>\` — это встроенный тип для «объекта-словаря» со строковыми ключами и числовыми значениями (по сути та же index signature). TypeScript думает, что \`x\` — число, и разрешает \`.toFixed()\`, а в рантайме \`undefined.toFixed()\` падает.

### noUncheckedIndexedAccess

Этот флаг в \`tsconfig\` делает индексный доступ честным: результат становится \`V | undefined\`, и компилятор заставляет проверять наличие перед использованием.

\`\`\`ts
// с флагом
const x2 = map['missing']; // number | undefined
x2?.toFixed();             // обязаны проверить
\`\`\`

Теперь \`x2\` имеет тип \`number | undefined\`, и без проверки (например, \`?.\` — опциональной цепочки) TypeScript не даст вызвать метод. Баг отлавливается на этапе компиляции.

### Практика

- Включай \`noUncheckedIndexedAccess\` в строгих проектах — он ловит целый класс \`undefined\`-багов.
- Флаг НЕ распространяется на доступ по **известным** литеральным ключам обычного объекта без index signature (там ключ гарантированно есть).
- Для словарей предпочитай \`Map\` — у него метод \`.get()\` честно возвращает \`V | undefined\` сам по себе, или \`Record\` вместе с флагом.
- Проверка через \`in\` (\`if ('key' in obj)\`) сужает тип и убирает \`undefined\` внутри ветки.

## ⚠️ Подводные камни

- Без флага \`map[key]\` врёт: тип говорит «число», а там \`undefined\` — и падение случается далеко от места ошибки.
- Флаг добавляет \`undefined\` и к доступу по числовому индексу массива (\`arr[0]\`), поэтому появится много новых проверок — это цена честности.
- \`noUncheckedIndexedAccess\` не спасает от опечаток в ключах — он лишь заставляет обработать «а вдруг пусто».

## 🎯 Запомни

- Index signature \`{ [k: string]: V }\` описывает произвольные ключи, но по умолчанию TS наивно верит, что ключ всегда есть.
- \`keyof T\` — union ключей, \`T[K]\` — тип значения; вместе дают типобезопасный доступ к известным полям.
- \`noUncheckedIndexedAccess\` делает результат \`V | undefined\` и заставляет проверять — включай в строгих проектах.
- Для словарей \`Map\` (\`.get(): V | undefined\`) часто безопаснее объекта с index signature.`,
      en: `## 🧩 In plain words

Picture a box of labeled slots: you promise that "under any text label there's a number." That's an **index signature** — a way to tell TypeScript "keys can be anything, and values are of this type." The problem is that TypeScript, being generous, believes that under ANY label there's definitely something — even one you just made up. In reality it might be empty (\`undefined\`), and the code crashes.

\`keyof\` is "the list of all labels" that actually exist. And the \`noUncheckedIndexedAccess\` flag is an off-switch for that naive optimism: it forces TypeScript to honestly admit "what if it's empty here."

### Index signatures

The form \`{ [key: string]: V }\` describes an object with **arbitrary** keys and values of type \`V\`. Keys can be \`string\`, \`number\` or \`symbol\`. Important rule: every explicitly declared property must be compatible with the signature's type.

\`\`\`ts
interface Dict { [key: string]: number; }
const d: Dict = { a: 1 };
d.b;   // typed number — but undefined at runtime!
\`\`\`

Here \`d.b\` is considered a number by the types, even though we never put that key in — at runtime it's \`undefined\`. That's the root of the problem.

### keyof and indexed access

\`keyof T\` yields a union of all the type's keys. \`T[K]\` is the value type at a specific key (**indexed access** at the type level). Together they give type-safe access.

\`\`\`ts
type Obj = { id: number; name: string };
type Keys = keyof Obj;        // 'id' | 'name'
type V = Obj['name'];         // string
\`\`\`

\`keyof Obj\` is \`'id' | 'name'\`, and \`Obj['name']\` is \`string\`. This lets you write functions that only accept keys that actually exist.

### Why access is sometimes unsafe

By default TypeScript assumes indexed access **always** returns the declared type, and **ignores** the chance that the key is missing. This optimistic but wrong assumption is a common source of \`undefined\` bugs.

\`\`\`ts
const map: Record<string, number> = {};
const x = map['missing']; // typed number, actually undefined
x.toFixed();              // runtime error
\`\`\`

\`Record<string, number>\` is the built-in type for a "dictionary object" with string keys and number values (essentially the same index signature). TypeScript thinks \`x\` is a number and allows \`.toFixed()\`, but at runtime \`undefined.toFixed()\` crashes.

### noUncheckedIndexedAccess

This \`tsconfig\` flag makes indexed access honest: the result becomes \`V | undefined\`, and the compiler forces a presence check before use.

\`\`\`ts
// with the flag
const x2 = map['missing']; // number | undefined
x2?.toFixed();             // must check
\`\`\`

Now \`x2\` has type \`number | undefined\`, and without a check (say, \`?.\` — optional chaining) TypeScript won't let you call the method. The bug is caught at compile time.

### Practice

- Enable \`noUncheckedIndexedAccess\` in strict projects — it catches a whole class of \`undefined\` bugs.
- The flag does NOT apply to access by **known** literal keys of a plain object without an index signature (there the key is guaranteed present).
- For dictionaries prefer \`Map\` — its \`.get()\` method honestly returns \`V | undefined\` on its own, or use \`Record\` together with the flag.
- An \`in\` check (\`if ('key' in obj)\`) narrows the type and removes \`undefined\` inside the branch.

## ⚠️ Common pitfalls

- Without the flag, \`map[key]\` lies: the type says "number" while it's \`undefined\` — and the crash happens far from the mistake.
- The flag also adds \`undefined\` to numeric array index access (\`arr[0]\`), so lots of new checks appear — that's the price of honesty.
- \`noUncheckedIndexedAccess\` doesn't protect against typos in keys — it only forces you to handle "what if it's empty."

## 🎯 Key takeaways

- An index signature \`{ [k: string]: V }\` describes arbitrary keys, but by default TS naively believes the key is always there.
- \`keyof T\` is the union of keys, \`T[K]\` is the value type; together they give type-safe access to known fields.
- \`noUncheckedIndexedAccess\` makes the result \`V | undefined\` and forces a check — enable it in strict projects.
- For dictionaries, \`Map\` (\`.get(): V | undefined\`) is often safer than an object with an index signature.`
    }
  }
];
