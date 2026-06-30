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
      ru: `## Модель цикла событий

JavaScript-движок выполняет код в **одном потоке**. Параллелизм обеспечивает host-окружение (браузер) через очереди задач.

- **Macrotask queue** (task queue): \`setTimeout\`, \`setInterval\`, события DOM, I/O, \`MessageChannel\`. За один «тик» цикла берётся **ровно одна** macrotask.
- **Microtask queue**: \`Promise.then/catch/finally\`, \`queueMicrotask\`, \`MutationObserver\`. После каждой macrotask и после каждого callback микроочередь **полностью опустошается** — включая микрозадачи, добавленные во время её обработки.

## Порядок одного тика

1. Взять одну macrotask, выполнить её.
2. Опустошить **всю** microtask-очередь.
3. При необходимости выполнить шаги рендеринга (\`requestAnimationFrame\` → recalc style → layout → paint), обычно ~60 раз/сек.
4. Повторить.

## Подводные камни

- Бесконечное добавление микрозадач **блокирует рендеринг и macrotask** — браузер «зависает».
- \`requestAnimationFrame\` выполняется **до** paint, но **после** микрозадач.
- \`setTimeout(fn, 0)\` не гарантирует 0 мс: минимум ~4 мс при вложенности и троттлинг в фоне.

\`\`\`js
console.log('1');
setTimeout(() => console.log('2'));      // macrotask
Promise.resolve().then(() => console.log('3')); // microtask
console.log('4');
// 1, 4, 3, 2
\`\`\`

Понимание этого критично для производительности: тяжёлые цепочки промисов могут отложить paint, ухудшая отзывчивость.`,
      en: `## The event loop model

The JS engine runs code on a **single thread**. Concurrency is provided by the host (browser) through task queues.

- **Macrotask queue**: \`setTimeout\`, \`setInterval\`, DOM events, I/O, \`MessageChannel\`. Each loop "tick" pulls **exactly one** macrotask.
- **Microtask queue**: \`Promise.then/catch/finally\`, \`queueMicrotask\`, \`MutationObserver\`. After every macrotask and every callback the microtask queue is **fully drained** — including microtasks queued while draining.

## One tick order

1. Take one macrotask and run it.
2. Drain the **entire** microtask queue.
3. Optionally run rendering steps (\`requestAnimationFrame\` → recalc style → layout → paint), usually ~60×/sec.
4. Repeat.

## Gotchas

- Endlessly queuing microtasks **starves rendering and macrotasks** — the page appears frozen.
- \`requestAnimationFrame\` runs **before** paint but **after** microtasks.
- \`setTimeout(fn, 0)\` is not truly 0 ms: a ~4 ms floor for nested timers, plus background throttling.

\`\`\`js
console.log('1');
setTimeout(() => console.log('2'));      // macrotask
Promise.resolve().then(() => console.log('3')); // microtask
console.log('4');
// 1, 4, 3, 2
\`\`\`

This matters for performance: heavy promise chains can delay paint and hurt responsiveness.`
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
      ru: `## Call stack

**Стек вызовов** — это LIFO-структура, в которую движок помещает **frame** (кадр) на каждый вызов функции. Кадр хранит аргументы, локальные переменные и адрес возврата. При \`return\` кадр снимается со стека.

## Переполнение

Размер стека ограничен (зависит от движка и платформы, обычно ~10–15k кадров). Глубокая или бесконечная рекурсия исчерпывает его → \`RangeError: Maximum call stack size exceeded\`.

## Как избегать

- **Итеративный алгоритм** вместо рекурсии (явный стек на массиве).
- **Trampolining** — возвращать функцию-продолжение и вызывать её в цикле.
- **Разбиение на macrotask** через \`setTimeout\`/\`queueMicrotask\`, чтобы стек разматывался между порциями.

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

Заметьте: **proper tail calls** (TCO) есть в спецификации ES2015, но реально реализованы только в JavaScriptCore (Safari). В V8 на них полагаться нельзя, поэтому используют trampoline или итерацию.`,
      en: `## Call stack

The **call stack** is a LIFO structure where the engine pushes a **frame** per function call. A frame holds arguments, locals and the return address. On \`return\` the frame is popped.

## Overflow

Stack size is bounded (engine/platform dependent, often ~10–15k frames). Deep or infinite recursion exhausts it → \`RangeError: Maximum call stack size exceeded\`.

## How to avoid

- **Iterative algorithm** instead of recursion (explicit stack in an array).
- **Trampolining** — return a continuation function and call it in a loop.
- **Splitting into macrotasks** via \`setTimeout\`/\`queueMicrotask\` so the stack unwinds between chunks.

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

Note: **proper tail calls** (TCO) are in the ES2015 spec but are only really implemented in JavaScriptCore (Safari). You cannot rely on them in V8, so trampolines or iteration are the practical solution.`
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
      ru: `## Что это под капотом

При создании функции движок сохраняет ссылку на **Lexical Environment** места, где функция была **объявлена** (а не вызвана). Эта связь и есть [[Environment]] во внутреннем слоте функции. **Замыкание** — функция вместе с захваченным окружением.

## Цепочка областей видимости

Окружение — это таблица (Environment Record) + ссылка на родителя (\`outer\`). Поиск идентификатора идёт по цепочке вверх до глобального. Каждое окружение существует, пока на него есть достижимая ссылка.

## Память

Замыкание удерживает **всё окружение**, а не отдельную переменную (в большинстве движков; V8 умеет оптимизировать и захватывать только используемые переменные через анализ). Это источник утечек:

- Колбэк, висящий в подписке, держит большие объекты из родительской области.
- Переменные, нужные только в момент создания, остаются живыми, пока жив колбэк.

\`\`\`js
function counter() {
  let count = 0;           // живёт, пока жива возвращённая функция
  return () => ++count;
}
const inc = counter();
inc(); // 1
inc(); // 2 — состояние сохраняется в замыкании
\`\`\`

## Практика

- Не захватывайте крупные структуры, если они не нужны: вынесите нужные поля в локальные переменные.
- Обнуляйте ссылки (\`bigData = null\`) перед созданием долгоживущего колбэка.
- В циклах используйте \`let\` (своё биндинг на итерацию), иначе классический баг с общей переменной \`var\`.`,
      en: `## What it is under the hood

When a function is created, the engine stores a reference to the **Lexical Environment** of the place where the function was **declared** (not called). That link is the internal [[Environment]] slot. A **closure** is the function together with its captured environment.

## Scope chain

An environment is a table (Environment Record) plus a reference to its parent (\`outer\`). Identifier lookup walks up the chain to global. Each environment lives as long as a reachable reference to it exists.

## Memory

A closure keeps the **whole environment**, not a single variable (in most engines; V8 can optimize and capture only used variables via analysis). This causes leaks:

- A callback held by a subscription keeps large objects from the parent scope alive.
- Variables only needed at creation time stay alive as long as the callback does.

\`\`\`js
function counter() {
  let count = 0;           // lives as long as the returned fn lives
  return () => ++count;
}
const inc = counter();
inc(); // 1
inc(); // 2 — state preserved in the closure
\`\`\`

## Practice

- Don't capture large structures you don't need: pull required fields into locals.
- Null out references (\`bigData = null\`) before creating a long-lived callback.
- In loops use \`let\` (per-iteration binding), otherwise the classic shared-\`var\` bug appears.`,
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
      ru: `## Как определяется this

\`this\` определяется **в момент вызова** (кроме стрелочных функций). Приоритет правил:

1. **new** — \`this\` = новый объект.
2. **Явная привязка** — \`call\`/\`apply\`/\`bind\` задают \`this\`.
3. **Неявная привязка** — \`obj.method()\` → \`this = obj\`.
4. **Дефолт** — \`undefined\` в strict mode, иначе глобальный объект.

## call / apply / bind

- \`fn.call(ctx, a, b)\` — вызывает сразу, аргументы по списку.
- \`fn.apply(ctx, [a, b])\` — то же, аргументы массивом.
- \`fn.bind(ctx, a)\` — возвращает **новую** функцию с зафиксированным \`this\` (и частично применёнными аргументами). Повторный \`bind\` не переопределяет \`this\`.

## Стрелочные функции

У стрелок **нет собственного** \`this\`, \`arguments\`, \`super\`, \`new.target\`. Они берут \`this\` **лексически** из окружения объявления. Поэтому их нельзя «перепривязать» через \`call/bind\` — \`this\` игнорируется. Идеальны для колбэков внутри методов.

\`\`\`js
const obj = {
  val: 42,
  regular() { return this.val; },
  arrow: () => this?.val, // this — из внешнего скоупа, не obj
};
const f = obj.regular;
f();              // undefined (потерян контекст)
f.call(obj);      // 42
obj.regular();    // 42
\`\`\`

Типичная ошибка — передать \`obj.method\` как колбэк и потерять \`this\`. Решения: стрелка-обёртка, \`bind\`, или поле-стрелка в классе.`,
      en: `## How this is determined

\`this\` is determined **at call time** (except arrow functions). Rule priority:

1. **new** — \`this\` = the new object.
2. **Explicit binding** — \`call\`/\`apply\`/\`bind\` set \`this\`.
3. **Implicit binding** — \`obj.method()\` → \`this = obj\`.
4. **Default** — \`undefined\` in strict mode, else the global object.

## call / apply / bind

- \`fn.call(ctx, a, b)\` — invokes immediately, args as a list.
- \`fn.apply(ctx, [a, b])\` — same, args as an array.
- \`fn.bind(ctx, a)\` — returns a **new** function with \`this\` fixed (and partially applied args). A second \`bind\` cannot re-set \`this\`.

## Arrow functions

Arrows have **no own** \`this\`, \`arguments\`, \`super\`, \`new.target\`. They take \`this\` **lexically** from the declaration scope. So they cannot be "rebound" via \`call/bind\` — \`this\` is ignored. Ideal for callbacks inside methods.

\`\`\`js
const obj = {
  val: 42,
  regular() { return this.val; },
  arrow: () => this?.val, // this — from outer scope, not obj
};
const f = obj.regular;
f();              // undefined (lost context)
f.call(obj);      // 42
obj.regular();    // 42
\`\`\`

A common mistake is passing \`obj.method\` as a callback and losing \`this\`. Fixes: an arrow wrapper, \`bind\`, or a class arrow field.`
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
      ru: `## Цепочка прототипов

Каждый объект имеет внутренний слот **[[Prototype]]** — ссылку на другой объект. При чтении свойства движок ищет его на самом объекте, затем по цепочке [[Prototype]] вверх до \`Object.prototype\` → \`null\`. Если не найдено — \`undefined\`.

## Три понятия

- **\`prototype\`** — свойство **функций-конструкторов**. Это объект, который станет [[Prototype]] всех экземпляров, созданных через \`new\`.
- **\`__proto__\`** — устаревший аксессор (геттер/сеттер на \`Object.prototype\`) к [[Prototype]] **конкретного объекта**.
- **\`Object.getPrototypeOf(obj)\` / \`setPrototypeOf\`** — современный, стандартный способ доступа к [[Prototype]].

## Важные детали

- Запись свойства всегда создаётся **на самом объекте** (shadowing), не меняет прототип — кроме случая сеттера в цепочке.
- \`setPrototypeOf\` и \`__proto__=\` **деоптимизируют** объект в V8 (ломают hidden class) — дорого.
- \`class extends\` под капотом выстраивает две цепочки: прототипов экземпляров и статических членов.

\`\`\`js
function Animal(name) { this.name = name; }
Animal.prototype.speak = function () { return this.name + ' makes a sound'; };

const dog = new Animal('Rex');
Object.getPrototypeOf(dog) === Animal.prototype; // true
dog.speak();                                     // 'Rex makes a sound'
dog.hasOwnProperty('speak');                     // false — взято из прототипа
\`\`\`

Понимание цепочки объясняет, почему методы класса разделяются между экземплярами (экономия памяти), а поля инстанса — нет.`,
      en: `## The prototype chain

Every object has an internal **[[Prototype]]** slot — a reference to another object. On property read the engine looks on the object itself, then walks up the [[Prototype]] chain to \`Object.prototype\` → \`null\`. If not found — \`undefined\`.

## Three concepts

- **\`prototype\`** — a property of **constructor functions**. It is the object that becomes the [[Prototype]] of all instances created via \`new\`.
- **\`__proto__\`** — a legacy accessor (getter/setter on \`Object.prototype\`) to the [[Prototype]] of a **specific object**.
- **\`Object.getPrototypeOf(obj)\` / \`setPrototypeOf\`** — the modern, standard way to access [[Prototype]].

## Key details

- A property write always creates the property **on the object itself** (shadowing); it doesn't mutate the prototype — except when a setter exists in the chain.
- \`setPrototypeOf\` and \`__proto__=\` **deoptimize** the object in V8 (break the hidden class) — expensive.
- \`class extends\` builds two chains under the hood: instance prototypes and static members.

\`\`\`js
function Animal(name) { this.name = name; }
Animal.prototype.speak = function () { return this.name + ' makes a sound'; };

const dog = new Animal('Rex');
Object.getPrototypeOf(dog) === Animal.prototype; // true
dog.speak();                                     // 'Rex makes a sound'
dog.hasOwnProperty('speak');                     // false — comes from prototype
\`\`\`

Understanding the chain explains why class methods are shared across instances (memory saving) while instance fields are not.`
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
      ru: `## Достижимость

GC освобождает память объектов, **недостижимых** из набора **корней** (roots): глобальный объект, стек вызовов, активные замыкания. Объект жив, если из корня есть цепочка ссылок к нему. Reference counting не используется как основной алгоритм — он не ловит **циклы**.

## Mark-and-sweep

1. **Mark**: обход графа от корней, пометка достижимых объектов.
2. **Sweep**: освобождение непомеченных.
3. **Compact** (опц.): дефрагментация кучи.

## Generational GC (V8 Orinoco)

Куча делится на:

- **Young generation** (Scavenger, semi-space copying) — большинство объектов умирают молодыми; быстрые частые сборки.
- **Old generation** — объекты, пережившие пару сборок; редкие, но дорогие mark-sweep-compact, выполняемые **инкрементально**, **конкурентно** и **параллельно**, чтобы не блокировать поток («stop-the-world» минимизирован).

## Утечки в реальности

- Забытые таймеры/подписки/слушатели событий.
- Глобальные переменные и кэши без вытеснения.
- Детачнутые DOM-узлы, удерживаемые JS-ссылкой.
- Замыкания, держащие крупные структуры.

\`\`\`js
let cache = new Map();
function leak(key, bigObj) { cache.set(key, bigObj); } // живёт вечно
// fix: WeakMap или политика вытеснения (LRU)
\`\`\`

Профилируют через DevTools → Memory: heap snapshots, allocation timeline, поиск растущего retained size. Важно: вызвать GC вручную из JS нельзя (только \`--expose-gc\` для отладки).`,
      en: `## Reachability

GC frees memory of objects **unreachable** from a set of **roots**: the global object, the call stack, active closures. An object is alive if a chain of references from a root reaches it. Reference counting isn't used as the primary algorithm — it misses **cycles**.

## Mark-and-sweep

1. **Mark**: traverse the graph from roots, marking reachable objects.
2. **Sweep**: free the unmarked ones.
3. **Compact** (optional): defragment the heap.

## Generational GC (V8 Orinoco)

The heap is split into:

- **Young generation** (Scavenger, semi-space copying) — most objects die young; fast, frequent collections.
- **Old generation** — objects that survived a couple of collections; rare but expensive mark-sweep-compact, run **incrementally**, **concurrently** and **in parallel** to avoid blocking the thread (stop-the-world is minimized).

## Real-world leaks

- Forgotten timers / subscriptions / event listeners.
- Global variables and caches without eviction.
- Detached DOM nodes held by a JS reference.
- Closures keeping large structures.

\`\`\`js
let cache = new Map();
function leak(key, bigObj) { cache.set(key, bigObj); } // lives forever
// fix: WeakMap or an eviction policy (LRU)
\`\`\`

Profile via DevTools → Memory: heap snapshots, allocation timeline, look for growing retained size. Note: you cannot force GC from JS (only \`--expose-gc\` for debugging).`
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
      ru: `## WeakMap / WeakSet

Ключи — **только объекты**, удерживаемые **слабо**: если на ключ больше нет сильных ссылок, пара удаляется GC. Поэтому WeakMap **не итерируем** и не имеет \`size\` (содержимое недетерминировано относительно GC). Идеален для приватных данных и метаданных, привязанных к объектам, без утечек.

## WeakRef

Оборачивает объект слабой ссылкой; \`ref.deref()\` возвращает объект **или \`undefined\`**, если он уже собран. Полезно для кэшей: держим значение, пока его кто-то использует, и позволяем GC забрать его при нехватке памяти.

## FinalizationRegistry

Позволяет зарегистрировать **callback-уборщик**, вызываемый **после** сборки объекта (для освобождения внешних ресурсов). Вызов **не гарантирован** и **не детерминирован** по времени.

\`\`\`js
const cache = new Map();
const registry = new FinalizationRegistry((key) => cache.delete(key));

function cacheValue(key, obj) {
  cache.set(key, new WeakRef(obj));
  registry.register(obj, key);
}
\`\`\`

## Риски

- **Недетерминизм**: нельзя строить логику на том, что финализатор сработает (или сработает «скоро»).
- Не использовать для критичной очистки (соединения, файлы) — только как «страховку».
- \`WeakRef\` усложняет рассуждения о времени жизни; спецификация даже разрешает движку **не** собирать объект.

Общий принцип: слабые ссылки — инструмент против утечек, а не замена явному управлению ресурсами.`,
      en: `## WeakMap / WeakSet

Keys must be **objects**, held **weakly**: if no strong reference to the key remains, the entry is removed by GC. Hence WeakMap is **not iterable** and has no \`size\` (contents are non-deterministic relative to GC). Ideal for private data and metadata attached to objects without leaks.

## WeakRef

Wraps an object in a weak reference; \`ref.deref()\` returns the object **or \`undefined\`** if already collected. Useful for caches: keep a value while someone uses it, and let GC reclaim it under memory pressure.

## FinalizationRegistry

Lets you register a **cleanup callback** invoked **after** an object is collected (to release external resources). The call is **not guaranteed** and **not deterministic** in timing.

\`\`\`js
const cache = new Map();
const registry = new FinalizationRegistry((key) => cache.delete(key));

function cacheValue(key, obj) {
  cache.set(key, new WeakRef(obj));
  registry.register(obj, key);
}
\`\`\`

## Risks

- **Non-determinism**: never rely on a finalizer running (or running "soon").
- Don't use it for critical cleanup (connections, files) — only as a safety net.
- \`WeakRef\` complicates reasoning about lifetimes; the spec even allows the engine to **not** collect an object.

General principle: weak references are a tool against leaks, not a replacement for explicit resource management.`
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
      ru: `## Hoisting

На этапе **создания** окружения движок регистрирует все объявления до выполнения кода:

- **\`var\`** — поднимается и инициализируется \`undefined\`. Доступ до присваивания → \`undefined\`.
- **function declaration** — поднимается **целиком** (можно вызвать выше объявления).
- **\`let\`/\`const\`/\`class\`** — поднимаются, но **не инициализируются**. До строки объявления они в **TDZ**.

## Temporal Dead Zone

TDZ — промежуток от входа в блок до фактического объявления, где обращение к \`let\`/\`const\` бросает \`ReferenceError\`. Это сделано намеренно, чтобы ловить использование до инициализации. \`const\` дополнительно требует инициализатор и запрещает переприсваивание (но не глубокую иммутабельность).

\`\`\`js
console.log(a); // undefined (var hoisted)
var a = 1;

console.log(b); // ReferenceError — TDZ
let b = 2;

foo();          // 'ok' — function declaration hoisted
function foo() { return 'ok'; }

typeof c;       // 'undefined' для необъявленной
typeof d;       // ReferenceError если d в TDZ — typeof не спасает
let d;
\`\`\`

## Практика

- \`var\` имеет **функциональную** область видимости, \`let/const\` — **блочную**.
- В цикле \`let\` создаёт новый биндинг на итерацию — важно для замыканий.
- Function expression (\`const f = () => {}\`) не поднимается как тело — поднимается только переменная.`,
      en: `## Hoisting

During the **creation** phase the engine registers all declarations before running code:

- **\`var\`** — hoisted and initialized to \`undefined\`. Access before assignment → \`undefined\`.
- **function declaration** — hoisted **entirely** (callable above its declaration).
- **\`let\`/\`const\`/\`class\`** — hoisted but **not initialized**. Until their line they sit in the **TDZ**.

## Temporal Dead Zone

The TDZ is the span from entering the block to the actual declaration, where touching a \`let\`/\`const\` throws \`ReferenceError\`. It's intentional, to catch use-before-init. \`const\` additionally requires an initializer and forbids reassignment (but not deep immutability).

\`\`\`js
console.log(a); // undefined (var hoisted)
var a = 1;

console.log(b); // ReferenceError — TDZ
let b = 2;

foo();          // 'ok' — function declaration hoisted
function foo() { return 'ok'; }

typeof c;       // 'undefined' for an undeclared name
typeof d;       // ReferenceError if d is in TDZ — typeof won't save you
let d;
\`\`\`

## Practice

- \`var\` has **function** scope, \`let/const\` have **block** scope.
- In a loop \`let\` creates a fresh binding per iteration — crucial for closures.
- A function expression (\`const f = () => {}\`) isn't hoisted as a body — only the variable is.`
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
      ru: `## Приведение типов

JS приводит значения через абстрактные операции:

- **ToPrimitive** (\`hint\`: number/string/default) → вызывает \`Symbol.toPrimitive\`, затем \`valueOf\`/\`toString\`.
- **ToNumber**, **ToString**, **ToBoolean**.

Операторы решают, какое приведение применить: \`+\` с любой строкой → конкатенация; остальные арифметические → числа.

## Алгоритм ==

\`==\` сравнивает после приведения по правилам:

- \`null == undefined\` → \`true\`, но ни с чем иным.
- число vs строка → строка → число.
- boolean → число, затем повтор.
- объект vs примитив → объект через ToPrimitive.
- \`NaN\` не равен ничему, даже себе.

## Коварные примеры

\`\`\`js
[] == ![]        // true: ![] -> false -> 0; [] -> '' -> 0
[] == ''         // true: [] -> ''
[] == 0          // true: '' -> 0
null == 0        // false (спец-правило: null только == undefined)
'' == 0          // true
'0' == false     // true
NaN === NaN      // false
Object.is(NaN, NaN) // true
0 === -0         // true, но Object.is(0,-0) === false
\`\`\`

## Рекомендации

- Используйте \`===\` (строгое равенство без приведения).
- Для \`NaN\`/\`-0\` — \`Object.is\`.
- Единственное оправданное применение \`==\`: \`x == null\` для проверки на \`null\` **и** \`undefined\` сразу.`,
      en: `## Type coercion

JS coerces values via abstract operations:

- **ToPrimitive** (\`hint\`: number/string/default) → calls \`Symbol.toPrimitive\`, then \`valueOf\`/\`toString\`.
- **ToNumber**, **ToString**, **ToBoolean**.

Operators decide which coercion applies: \`+\` with any string → concatenation; other arithmetic → numbers.

## The == algorithm

\`==\` compares after coercion by rules:

- \`null == undefined\` → \`true\`, but nothing else.
- number vs string → string → number.
- boolean → number, then retry.
- object vs primitive → object via ToPrimitive.
- \`NaN\` equals nothing, even itself.

## Tricky examples

\`\`\`js
[] == ![]        // true: ![] -> false -> 0; [] -> '' -> 0
[] == ''         // true: [] -> ''
[] == 0          // true: '' -> 0
null == 0        // false (special rule: null only == undefined)
'' == 0          // true
'0' == false     // true
NaN === NaN      // false
Object.is(NaN, NaN) // true
0 === -0         // true, but Object.is(0,-0) === false
\`\`\`

## Recommendations

- Use \`===\` (strict equality, no coercion).
- For \`NaN\`/\`-0\` — \`Object.is\`.
- The only justified \`==\` use: \`x == null\` to check for \`null\` **and** \`undefined\` at once.`
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
      ru: `## CommonJS (CJS)

- Загрузка **синхронная**, \`require\` выполняется в момент вызова.
- Экспорт — **значение** (\`module.exports\` — обычный объект); копируется по присваиванию.
- Структура **динамическая**: \`require\` можно вызвать условно.
- Каждый модуль оборачивается в функцию (\`module\`, \`exports\`, \`require\`, \`__dirname\`).

## ES Modules (ESM)

- **Статичная** структура: \`import\`/\`export\` на верхнем уровне, разбираются **до** выполнения. Это и даёт tree-shaking.
- **Live bindings**: импорт — это **ссылка** на экспортируемую переменную, а не копия. Изменение в модуле видно у импортёра.
- Загрузка асинхронная и многофазная: construction → instantiation (связывание биндингов) → evaluation.
- \`import\` поднимается; есть **top-level await**.

\`\`\`js
// counter.mjs
export let count = 0;
export const inc = () => count++;

// main.mjs
import { count, inc } from './counter.mjs';
inc();
console.log(count); // 1 — live binding, не копия
\`\`\`

## Tree-shaking

Бандлеры удаляют неиспользуемые экспорты, **только** для ESM (статичный анализ). CJS обычно «непроходим». Помогают \`"sideEffects": false\` в package.json и чистые модули без побочных эффектов на верхнем уровне.

## Взаимодействие

CJS не может \`require\` ESM напрямую (ESM асинхронен) — нужен \`import()\`. ESM может импортировать CJS, но named exports из CJS определяются эвристикой. \`__esModule\`-флаг — артефакт транспиляции.`,
      en: `## CommonJS (CJS)

- Loading is **synchronous**; \`require\` runs when called.
- Exports are a **value** (\`module.exports\` is a plain object); copied on assignment.
- Structure is **dynamic**: \`require\` can be conditional.
- Each module is wrapped in a function (\`module\`, \`exports\`, \`require\`, \`__dirname\`).

## ES Modules (ESM)

- **Static** structure: top-level \`import\`/\`export\`, parsed **before** execution. This is what enables tree-shaking.
- **Live bindings**: an import is a **reference** to the exported variable, not a copy. A change in the module is visible to importers.
- Loading is asynchronous and multi-phase: construction → instantiation (binding wiring) → evaluation.
- \`import\` is hoisted; there is **top-level await**.

\`\`\`js
// counter.mjs
export let count = 0;
export const inc = () => count++;

// main.mjs
import { count, inc } from './counter.mjs';
inc();
console.log(count); // 1 — live binding, not a copy
\`\`\`

## Tree-shaking

Bundlers drop unused exports, **only** for ESM (static analysis). CJS is usually opaque. \`"sideEffects": false\` in package.json and pure modules without top-level side effects help.

## Interop

CJS cannot \`require\` ESM directly (ESM is async) — use \`import()\`. ESM can import CJS, but named exports from CJS are detected heuristically. The \`__esModule\` flag is a transpilation artifact.`
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
      ru: `## Динамический import()

\`import()\` — **выражение**, возвращающее Promise с пространством имён модуля. В отличие от статического \`import\`:

- Можно вызывать **условно**, внутри функций, с **вычисляемым** путём.
- Загружает модуль **лениво**, во время выполнения.
- Создаёт точку **разбиения кода** (code splitting) в бандлере → отдельный chunk.

## Зачем

- **Lazy loading** маршрутов и тяжёлых фич (графики, редакторы).
- Уменьшение начального бандла → быстрее First Load.
- Подгрузка по условию (полифилл, A/B-фича).

\`\`\`js
button.addEventListener('click', async () => {
  const { renderChart } = await import('./chart.js'); // отдельный chunk
  renderChart(data);
});
\`\`\`

## Нюансы

- Результат — объект namespace; default — в \`.default\`.
- Ошибку загрузки нужно ловить (\`try/catch\` или \`.catch\`) — сеть может упасть.
- Бандлеры используют «magic comments» (\`/* webpackChunkName */\`) для имени и стратегии префетча.
- В Angular лениво грузятся standalone-компоненты/роуты через \`loadComponent\`/\`loadChildren\`, которые под капотом используют \`import()\`.

Статический импорт лучше для tree-shaking и предсказуемости; динамический — для производительности и опциональности. Их сочетают: ядро статично, тяжёлое — динамически.`,
      en: `## Dynamic import()

\`import()\` is an **expression** returning a Promise of the module namespace. Unlike static \`import\`:

- Can be called **conditionally**, inside functions, with a **computed** path.
- Loads the module **lazily**, at runtime.
- Creates a **code-splitting** point in the bundler → a separate chunk.

## Why

- **Lazy loading** routes and heavy features (charts, editors).
- Smaller initial bundle → faster first load.
- Conditional loading (polyfills, A/B features).

\`\`\`js
button.addEventListener('click', async () => {
  const { renderChart } = await import('./chart.js'); // separate chunk
  renderChart(data);
});
\`\`\`

## Nuances

- The result is a namespace object; default is under \`.default\`.
- Catch load errors (\`try/catch\` or \`.catch\`) — the network can fail.
- Bundlers use "magic comments" (\`/* webpackChunkName */\`) for naming and prefetch strategy.
- In Angular, standalone components/routes load lazily via \`loadComponent\`/\`loadChildren\`, which use \`import()\` under the hood.

Static imports are better for tree-shaking and predictability; dynamic for performance and optionality. Combine them: core static, heavy parts dynamic.`
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
      ru: `## Протокол итерации

- **Iterable** — объект с методом \`[Symbol.iterator]()\`, возвращающим **iterator**.
- **Iterator** — объект с методом \`next()\`, возвращающим \`{ value, done }\`.

\`for...of\`, spread, деструктуризация, \`Array.from\` используют этот протокол. Поэтому свои структуры можно делать «итерируемыми».

## Генераторы

\`function*\` создаёт функцию, возвращающую генератор — **одновременно** iterator и iterable. \`yield\` **приостанавливает** выполнение, сохраняя весь кадр (локальные переменные, позицию). \`next(v)\` возобновляет, передавая \`v\` как результат \`yield\`. Это кооперативная многозадачность на уровне языка.

\`\`\`js
function* range(start, end) {
  for (let i = start; i < end; i++) yield i;
}
[...range(0, 3)]; // [0, 1, 2]

function* gen() {
  const x = yield 'ask';    // приостанов; x придёт из next(value)
  return x * 2;
}
const g = gen();
g.next();    // { value: 'ask', done: false }
g.next(10);  // { value: 20, done: true }
\`\`\`

## Под капотом

Генератор хранит **состояние выполнения** в куче, а не на стеке вызовов — поэтому переживает приостановки. \`yield*\` делегирует другому итерируемому. \`return()\`/\`throw()\` позволяют завершить или бросить ошибку внутрь.

## Применение

- Ленивые/бесконечные последовательности.
- Async-итерация (\`for await...of\` + \`async function*\`).
- Исторически — корутины для асинхронности (до async/await, напр. redux-saga).`,
      en: `## The iteration protocol

- **Iterable** — an object with a \`[Symbol.iterator]()\` method returning an **iterator**.
- **Iterator** — an object with a \`next()\` method returning \`{ value, done }\`.

\`for...of\`, spread, destructuring, \`Array.from\` use this protocol. So you can make your own structures iterable.

## Generators

\`function*\` creates a function returning a generator — **both** an iterator and iterable. \`yield\` **suspends** execution, preserving the whole frame (locals, position). \`next(v)\` resumes, passing \`v\` as the result of \`yield\`. This is language-level cooperative multitasking.

\`\`\`js
function* range(start, end) {
  for (let i = start; i < end; i++) yield i;
}
[...range(0, 3)]; // [0, 1, 2]

function* gen() {
  const x = yield 'ask';    // suspends; x comes from next(value)
  return x * 2;
}
const g = gen();
g.next();    // { value: 'ask', done: false }
g.next(10);  // { value: 20, done: true }
\`\`\`

## Under the hood

A generator stores its **execution state** on the heap, not the call stack — so it survives suspensions. \`yield*\` delegates to another iterable. \`return()\`/\`throw()\` let you finish or inject an error.

## Uses

- Lazy/infinite sequences.
- Async iteration (\`for await...of\` + \`async function*\`).
- Historically — coroutines for async (pre-async/await, e.g. redux-saga).`
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
      ru: `## Symbol

\`Symbol()\` создаёт **уникальный неизменяемый** примитив. Каждый вызов даёт новое значение, даже с одинаковым описанием. Применяется как **неконфликтующий ключ свойства**: символьные ключи не пересекаются со строковыми и не попадают в \`for...in\`/\`Object.keys\`/\`JSON.stringify\` (но видны через \`Object.getOwnPropertySymbols\` и \`Reflect.ownKeys\`).

## Symbol vs Symbol.for

- \`Symbol('x')\` — всегда новый, локальный.
- \`Symbol.for('x')\` — берёт символ из **глобального реестра** по ключу; повторный вызов вернёт **тот же** символ (даже между realm/iframe). \`Symbol.keyFor(sym)\` возвращает ключ для реестровых символов.

\`\`\`js
Symbol('a') === Symbol('a');         // false
Symbol.for('a') === Symbol.for('a'); // true
\`\`\`

## Well-known symbols

Это символы, которыми движок **настраивает поведение объекта** (точки расширения протоколов):

- \`Symbol.iterator\` — итерируемость (\`for...of\`).
- \`Symbol.asyncIterator\` — \`for await...of\`.
- \`Symbol.hasInstance\` — кастомизация \`instanceof\`.
- \`Symbol.toPrimitive\` — управление приведением.
- \`Symbol.toStringTag\` — тег в \`Object.prototype.toString\`.

\`\`\`js
class Temp {
  constructor(c) { this.c = c; }
  [Symbol.toPrimitive](hint) {
    return hint === 'string' ? this.c + '°C' : this.c;
  }
}
\`+\${new Temp(20)}\`; // '20' (number hint)
\`\`\`

Symbol — основа метапрограммирования и «скрытых» протоколов в JS.`,
      en: `## Symbol

\`Symbol()\` creates a **unique, immutable** primitive. Each call yields a new value, even with the same description. Used as a **collision-free property key**: symbol keys don't clash with string keys and don't appear in \`for...in\`/\`Object.keys\`/\`JSON.stringify\` (but are visible via \`Object.getOwnPropertySymbols\` and \`Reflect.ownKeys\`).

## Symbol vs Symbol.for

- \`Symbol('x')\` — always new, local.
- \`Symbol.for('x')\` — fetches a symbol from the **global registry** by key; calling again returns the **same** symbol (even across realms/iframes). \`Symbol.keyFor(sym)\` returns the key for registry symbols.

\`\`\`js
Symbol('a') === Symbol('a');         // false
Symbol.for('a') === Symbol.for('a'); // true
\`\`\`

## Well-known symbols

Symbols the engine uses to **configure object behavior** (protocol extension points):

- \`Symbol.iterator\` — iterability (\`for...of\`).
- \`Symbol.asyncIterator\` — \`for await...of\`.
- \`Symbol.hasInstance\` — customize \`instanceof\`.
- \`Symbol.toPrimitive\` — control coercion.
- \`Symbol.toStringTag\` — tag in \`Object.prototype.toString\`.

\`\`\`js
class Temp {
  constructor(c) { this.c = c; }
  [Symbol.toPrimitive](hint) {
    return hint === 'string' ? this.c + '°C' : this.c;
  }
}
\`+\${new Temp(20)}\`; // '20' (number hint)
\`\`\`

Symbol underpins metaprogramming and the "hidden" protocols in JS.`
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
      ru: `## Proxy

\`new Proxy(target, handler)\` создаёт обёртку, перехватывающую **фундаментальные операции** над объектом через **traps** в \`handler\`:

- \`get\`, \`set\`, \`has\`, \`deleteProperty\`
- \`apply\` (вызов функции), \`construct\` (\`new\`)
- \`ownKeys\`, \`getOwnPropertyDescriptor\`, \`defineProperty\`
- \`getPrototypeOf\`, \`setPrototypeOf\`

Если trap не задан — операция идёт к \`target\` напрямую.

## Reflect

\`Reflect\` — объект со **статическими методами**, дублирующими внутренние операции (\`Reflect.get\`, \`set\`, \`has\`, \`apply\`, \`construct\`...). Зачем он внутри trap:

1. Удобно **переадресовать** операцию к target дефолтным образом.
2. Корректно прокидывает **receiver** (важно для геттеров/сеттеров в цепочке прототипов).
3. Возвращает **значимый результат** (например, \`Reflect.set\` → boolean) вместо бросания исключений, как старые \`Object.defineProperty\`.

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

## Инварианты и цена

Proxy обязан соблюдать **инварианты** target (нельзя «соврать» о non-configurable свойстве — будет \`TypeError\`). Прокси **не оптимизируется** движком так же, как обычные объекты — горячие пути могут замедлиться. Применение: реактивность (Vue 3, signals), валидация, логирование, виртуальные/observable объекты, защита (read-only).`,
      en: `## Proxy

\`new Proxy(target, handler)\` creates a wrapper intercepting **fundamental operations** on an object via **traps** in \`handler\`:

- \`get\`, \`set\`, \`has\`, \`deleteProperty\`
- \`apply\` (function call), \`construct\` (\`new\`)
- \`ownKeys\`, \`getOwnPropertyDescriptor\`, \`defineProperty\`
- \`getPrototypeOf\`, \`setPrototypeOf\`

If a trap is absent, the operation goes to \`target\` directly.

## Reflect

\`Reflect\` is an object of **static methods** mirroring internal operations (\`Reflect.get\`, \`set\`, \`has\`, \`apply\`, \`construct\`...). Why use it inside traps:

1. Convenient way to **forward** the operation to target with default behavior.
2. Correctly threads the **receiver** (important for getters/setters along the prototype chain).
3. Returns a **meaningful result** (e.g. \`Reflect.set\` → boolean) instead of throwing like the older \`Object.defineProperty\`.

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

## Invariants and cost

A Proxy must respect target **invariants** (it can't "lie" about a non-configurable property — \`TypeError\`). Proxies are **not optimized** by the engine like plain objects — hot paths may slow down. Uses: reactivity (Vue 3, signals), validation, logging, virtual/observable objects, protection (read-only).`
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
      ru: `## structuredClone

\`structuredClone(value)\` — встроенный **глубокий клон** по алгоритму **structured clone** (тому же, что у \`postMessage\`, IndexedDB, Web Workers). Он рекурсивно копирует граф объекта.

## Преимущества над JSON

\`JSON.parse(JSON.stringify(x))\` теряет/ломает:

- \`undefined\`, функции, \`Symbol\` — выпадают.
- \`Date\` → строка, \`NaN\`/\`Infinity\` → \`null\`.
- **Циклические ссылки** → исключение.
- \`Map\`, \`Set\`, \`ArrayBuffer\`, \`TypedArray\`, \`RegExp\`, \`Blob\` — не поддержаны.

\`structuredClone\` корректно клонирует \`Date\`, \`Map\`, \`Set\`, \`RegExp\`, \`ArrayBuffer\`, типизированные массивы и **сохраняет циклы**.

## Ограничения

- **Функции**, **DOM-узлы** (кроме некоторых), объекты с прототипом класса → \`DataCloneError\` или потеря прототипа (клон получает \`Object.prototype\`).
- Геттеры/сеттеры и дескрипторы не копируются как поведение — только значения.
- Symbol-ключи не клонируются.

\`\`\`js
const orig = { d: new Date(), set: new Set([1, 2]), nested: {} };
orig.self = orig;                 // цикл
const copy = structuredClone(orig);
copy.self === copy;               // true — цикл сохранён
copy.set instanceof Set;          // true
copy.d !== orig.d;                // true — глубокая копия
\`\`\`

## Spread

\`{...obj}\` и \`Object.assign\` — **поверхностные** (shallow): вложенные объекты разделяются по ссылке. Для глубокого клонирования сложных структур \`structuredClone\` — лучший встроенный выбор.`,
      en: `## structuredClone

\`structuredClone(value)\` is a built-in **deep clone** using the **structured clone** algorithm (the same one \`postMessage\`, IndexedDB, and Web Workers use). It recursively copies the object graph.

## Advantages over JSON

\`JSON.parse(JSON.stringify(x))\` loses/breaks:

- \`undefined\`, functions, \`Symbol\` — dropped.
- \`Date\` → string, \`NaN\`/\`Infinity\` → \`null\`.
- **Circular references** → throws.
- \`Map\`, \`Set\`, \`ArrayBuffer\`, \`TypedArray\`, \`RegExp\`, \`Blob\` — unsupported.

\`structuredClone\` correctly clones \`Date\`, \`Map\`, \`Set\`, \`RegExp\`, \`ArrayBuffer\`, typed arrays and **preserves cycles**.

## Limitations

- **Functions**, **DOM nodes** (most), class-prototyped objects → \`DataCloneError\` or prototype loss (the clone gets \`Object.prototype\`).
- Getters/setters and descriptors aren't copied as behavior — values only.
- Symbol keys aren't cloned.

\`\`\`js
const orig = { d: new Date(), set: new Set([1, 2]), nested: {} };
orig.self = orig;                 // cycle
const copy = structuredClone(orig);
copy.self === copy;               // true — cycle preserved
copy.set instanceof Set;          // true
copy.d !== orig.d;                // true — deep copy
\`\`\`

## Spread

\`{...obj}\` and \`Object.assign\` are **shallow**: nested objects are shared by reference. For deep-cloning complex structures \`structuredClone\` is the best built-in choice.`
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
      ru: `## Дженерики

Дженерик — **параметризация по типу**: функция/класс/тип работает с произвольным \`T\`, сохраняя связь между входом и выходом. Это даёт типобезопасность без потери гибкости (в отличие от \`any\`).

## Ограничения (constraints)

\`<T extends U>\` требует, чтобы \`T\` был **подтипом** \`U\` — внутри можно безопасно обращаться к гарантированным членам. Частый паттерн — \`keyof\` для безопасного доступа по ключу.

\`\`\`ts
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { id: 1, name: 'Ann' };
pluck(user, 'name'); // string
pluck(user, 'age');  // ошибка: 'age' не keyof
\`\`\`

## Вывод типов (inference)

TS выводит \`T\` из аргументов вызова — обычно явно указывать не нужно. При выводе он **расширяет** литералы (\`'a'\` → \`string\`), если нет \`as const\` или \`const\`-параметра. Несколько кандидатов на \`T\` объединяются (best common type).

## Значения по умолчанию

\`<T = string>\` задаёт дефолт, если \`T\` нельзя вывести/не указан. Полезно для гибких API.

## Тонкости

- **Не вводите параметр типа, используемый один раз** — это «маскировка \`any\`».
- Constraints включают условные/маппинг-типы для сложной валидации формы.
- \`const T\`-параметры (TS 5.0) сохраняют узкие литеральные типы при выводе — об этом отдельный вопрос.

Дженерики — фундамент переиспользуемых, строго типизированных утилит и библиотек.`,
      en: `## Generics

A generic is **parameterization by type**: a function/class/type works with an arbitrary \`T\` while preserving the relation between input and output. This gives type safety without losing flexibility (unlike \`any\`).

## Constraints

\`<T extends U>\` requires \`T\` to be a **subtype** of \`U\` — inside you can safely access guaranteed members. A common pattern is \`keyof\` for safe key access.

\`\`\`ts
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { id: 1, name: 'Ann' };
pluck(user, 'name'); // string
pluck(user, 'age');  // error: 'age' is not keyof
\`\`\`

## Inference

TS infers \`T\` from call arguments — usually you don't annotate explicitly. During inference it **widens** literals (\`'a'\` → \`string\`) unless \`as const\` or a \`const\` type parameter is used. Multiple \`T\` candidates are unified (best common type).

## Defaults

\`<T = string>\` sets a default when \`T\` can't be inferred / isn't given. Handy for flexible APIs.

## Subtleties

- **Don't add a type parameter used only once** — that's "any in disguise".
- Constraints can include conditional/mapped types for complex shape validation.
- \`const T\` params (TS 5.0) preserve narrow literal types on inference — covered separately.

Generics are the foundation of reusable, strongly typed utilities and libraries.`
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
      ru: `## Условные типы

\`T extends U ? X : Y\` — тип-«тернарник» на уровне типов. Проверяет присваиваемость \`T\` к \`U\`. Используется для извлечения, фильтрации и трансформации типов.

## infer

\`infer R\` объявляет **переменную типа внутри условия** и «захватывает» часть структуры. Это механизм паттерн-матчинга на типах.

\`\`\`ts
type ElementType<T> = T extends (infer E)[] ? E : T;
type A = ElementType<number[]>; // number
type B = ElementType<string>;   // string

type MyReturn<F> = F extends (...args: any[]) => infer R ? R : never;
type R = MyReturn<() => Promise<number>>; // Promise<number>
\`\`\`

## Дистрибутивность

Если проверяемый тип — **«голый» type parameter** и в него подставлен **union**, условный тип **распределяется** по членам union:

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;
type X = ToArray<string | number>; // string[] | number[]  (не (string|number)[])
\`\`\`

Чтобы **отключить** дистрибутивность — обернуть в кортеж: \`[T] extends [U] ? ...\`. Это классический приём для \`IsNever\`, строгих сравнений и т.п.

\`\`\`ts
type IsNever<T> = [T] extends [never] ? true : false;
type N = IsNever<never>; // true (без скобок было бы never)
\`\`\`

## Практика

- Несколько \`infer\` в одной позиции union → объединение; в контравариантной позиции → пересечение (трюк для UnionToIntersection).
- Условные типы — основа большинства utility-типов в \`lib.es5.d.ts\`.
- Берегитесь рекурсии: глубина ограничена (защита от бесконечности).`,
      en: `## Conditional types

\`T extends U ? X : Y\` — a type-level "ternary". It checks assignability of \`T\` to \`U\`. Used to extract, filter and transform types.

## infer

\`infer R\` declares a **type variable inside the condition** and "captures" part of the structure. It's pattern matching on types.

\`\`\`ts
type ElementType<T> = T extends (infer E)[] ? E : T;
type A = ElementType<number[]>; // number
type B = ElementType<string>;   // string

type MyReturn<F> = F extends (...args: any[]) => infer R ? R : never;
type R = MyReturn<() => Promise<number>>; // Promise<number>
\`\`\`

## Distributivity

If the checked type is a **naked type parameter** and a **union** is substituted, the conditional type **distributes** over the union members:

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;
type X = ToArray<string | number>; // string[] | number[]  (not (string|number)[])
\`\`\`

To **disable** distributivity — wrap in a tuple: \`[T] extends [U] ? ...\`. A classic trick for \`IsNever\`, strict comparisons, etc.

\`\`\`ts
type IsNever<T> = [T] extends [never] ? true : false;
type N = IsNever<never>; // true (without brackets it would be never)
\`\`\`

## Practice

- Multiple \`infer\` in a union position → a union; in a contravariant position → an intersection (the UnionToIntersection trick).
- Conditional types underpin most utility types in \`lib.es5.d.ts\`.
- Beware recursion: depth is limited (an anti-infinity guard).`
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
      ru: `## Mapped types

Маппинг-тип перебирает ключи существующего типа и строит новый: \`{ [K in Keys]: Type }\`. Обычно \`Keys = keyof T\`, а значение зависит от \`T[K]\`.

\`\`\`ts
type Stringify<T> = { [K in keyof T]: string };
\`\`\`

## Модификаторы

Можно **добавлять/убирать** \`readonly\` и \`?\` через префиксы \`+\`/\`-\`:

\`\`\`ts
type Mutable<T> = { -readonly [K in keyof T]: T[K] };  // снять readonly
type Required2<T> = { [K in keyof T]-?: T[K] };        // снять опциональность
type Partial2<T> = { [K in keyof T]+?: T[K] };         // добавить ?
\`\`\`

Именно так реализованы \`Partial\`, \`Required\`, \`Readonly\`.

## Key remapping (as)

С TS 4.1 можно **переименовывать** ключи через \`as\`, в т.ч. фильтровать, возвращая \`never\`:

\`\`\`ts
type Getters<T> = {
  [K in keyof T as \\\`get\\\${Capitalize<string & K>}\\\`]: () => T[K];
};
type G = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

type RemoveKind<T> = { [K in keyof T as Exclude<K, 'kind'>]: T[K] };
\`\`\`

## Нюансы

- Маппинг по \`keyof T\` сохраняет «homomorphic» поведение: модификаторы и тип исходных ключей наследуются, а маппинг по массивам/кортежам сохраняет их «массивность».
- В сочетании с условными и template literal типами даёт мощные трансформации.
- Чрезмерно сложные маппинги бьют по скорости компиляции и читаемости — соблюдайте баланс.`,
      en: `## Mapped types

A mapped type iterates over the keys of an existing type and builds a new one: \`{ [K in Keys]: Type }\`. Usually \`Keys = keyof T\`, and the value depends on \`T[K]\`.

\`\`\`ts
type Stringify<T> = { [K in keyof T]: string };
\`\`\`

## Modifiers

You can **add/remove** \`readonly\` and \`?\` via the \`+\`/\`-\` prefixes:

\`\`\`ts
type Mutable<T> = { -readonly [K in keyof T]: T[K] };  // strip readonly
type Required2<T> = { [K in keyof T]-?: T[K] };        // strip optionality
type Partial2<T> = { [K in keyof T]+?: T[K] };         // add ?
\`\`\`

This is exactly how \`Partial\`, \`Required\`, \`Readonly\` are implemented.

## Key remapping (as)

Since TS 4.1 you can **rename** keys via \`as\`, including filtering by returning \`never\`:

\`\`\`ts
type Getters<T> = {
  [K in keyof T as \\\`get\\\${Capitalize<string & K>}\\\`]: () => T[K];
};
type G = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

type RemoveKind<T> = { [K in keyof T as Exclude<K, 'kind'>]: T[K] };
\`\`\`

## Nuances

- A mapping over \`keyof T\` keeps "homomorphic" behavior: modifiers and source key types are inherited, and mapping arrays/tuples preserves their array-ness.
- Combined with conditional and template literal types it enables powerful transforms.
- Overly complex mappings hurt compile speed and readability — keep balance.`
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
      ru: `## Template literal types

Это типы вида \\\`prefix-\\\${T}\\\`, позволяющие **конструировать** и **сопоставлять** строковые литеральные типы на уровне типов. При подстановке union они **дистрибутивно** перемножаются.

\`\`\`ts
type Event = 'click' | 'hover';
type Handler = \\\`on\\\${Capitalize<Event>}\\\`; // 'onClick' | 'onHover'
\`\`\`

## Встроенные intrinsic-типы

\`Uppercase\`, \`Lowercase\`, \`Capitalize\`, \`Uncapitalize\` — манипуляция регистром на уровне типов.

## Парсинг через infer

В сочетании с условными типами и \`infer\` можно **разбирать** строки:

\`\`\`ts
type Split<S extends string, D extends string> =
  S extends \\\`\\\${infer H}\\\${D}\\\${infer T}\\\`
    ? [H, ...Split<T, D>]
    : [S];
type P = Split<'a.b.c', '.'>; // ['a', 'b', 'c']

type ParamNames<S extends string> =
  S extends \\\`\\\${string}:\\\${infer P}/\\\${infer Rest}\\\`
    ? P | ParamNames<\\\`/\\\${Rest}\\\`>
    : S extends \\\`\\\${string}:\\\${infer P}\\\` ? P : never;
type R = ParamNames<'/users/:id/posts/:postId'>; // 'id' | 'postId'
\`\`\`

## Применение

- Типобезопасные пути роутов, имена событий, CSS-классы.
- Генерация имён в маппинг-типах (\`getName\`, \`onChange\`).
- Парсеры query-строк, форматов даты.

## Ограничения

- Только **конечные** union — комбинаторный взрыв при больших union (\`a|b\` × \`c|d\` = 4, растёт мультипликативно).
- Рекурсия ограничена по глубине.
- Это исключительно **типовый** уровень — в рантайме строки обычные.`,
      en: `## Template literal types

These are types like \\\`prefix-\\\${T}\\\` that let you **construct** and **match** string literal types at the type level. When a union is substituted, they **distribute** (cross-multiply).

\`\`\`ts
type Event = 'click' | 'hover';
type Handler = \\\`on\\\${Capitalize<Event>}\\\`; // 'onClick' | 'onHover'
\`\`\`

## Built-in intrinsics

\`Uppercase\`, \`Lowercase\`, \`Capitalize\`, \`Uncapitalize\` — type-level case manipulation.

## Parsing with infer

Combined with conditional types and \`infer\`, you can **parse** strings:

\`\`\`ts
type Split<S extends string, D extends string> =
  S extends \\\`\\\${infer H}\\\${D}\\\${infer T}\\\`
    ? [H, ...Split<T, D>]
    : [S];
type P = Split<'a.b.c', '.'>; // ['a', 'b', 'c']

type ParamNames<S extends string> =
  S extends \\\`\\\${string}:\\\${infer P}/\\\${infer Rest}\\\`
    ? P | ParamNames<\\\`/\\\${Rest}\\\`>
    : S extends \\\`\\\${string}:\\\${infer P}\\\` ? P : never;
type R = ParamNames<'/users/:id/posts/:postId'>; // 'id' | 'postId'
\`\`\`

## Uses

- Type-safe route paths, event names, CSS classes.
- Name generation in mapped types (\`getName\`, \`onChange\`).
- Parsers for query strings, date formats.

## Limitations

- Only **finite** unions — combinatorial blow-up with large unions (\`a|b\` × \`c|d\` = 4, grows multiplicatively).
- Recursion is depth-limited.
- It's purely the **type** level — at runtime strings are ordinary.`
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
      ru: `## Реализации (из lib.*.d.ts)

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

## Разбор

- **Partial/Required/Readonly** — маппинг-типы с модификаторами \`?\`/\`-?\`/\`readonly\`.
- **Pick** — маппинг по подмножеству ключей \`K\`.
- **Record<K, T>** — конструирует объект с ключами \`K\` и значениями \`T\`.
- **Exclude/Extract** — **дистрибутивные** условные типы, фильтрующие union.
- **Omit** — комбинация \`Pick\` + \`Exclude\` (не гомоморфен, не сохраняет модификаторы напрямую).
- **ReturnType/Parameters** — условные типы с \`infer\`.

## Прочие важные

- \`NonNullable<T> = T & {}\` (убирает \`null\`/\`undefined\`).
- \`Awaited<T>\` — рекурсивно разворачивает \`Promise\` (с TS 4.5), учитывает thenable-цепочки.
- \`InstanceType\`, \`ConstructorParameters\`, \`ThisParameterType\`.

## Практика

Понимание реализаций позволяет писать **свои** утилиты (\`DeepPartial\`, \`PickByValue\`) и отлаживать сложные ошибки типов. Например, почему \`Omit\` иногда «теряет» дискриминируемость union — потому что он не дистрибутивен по умолчанию.`,
      en: `## Implementations (from lib.*.d.ts)

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

## Walkthrough

- **Partial/Required/Readonly** — mapped types with the \`?\`/\`-?\`/\`readonly\` modifiers.
- **Pick** — maps over a key subset \`K\`.
- **Record<K, T>** — constructs an object with keys \`K\` and values \`T\`.
- **Exclude/Extract** — **distributive** conditional types filtering a union.
- **Omit** — a combination of \`Pick\` + \`Exclude\` (not homomorphic, doesn't preserve modifiers directly).
- **ReturnType/Parameters** — conditional types with \`infer\`.

## Other important ones

- \`NonNullable<T> = T & {}\` (removes \`null\`/\`undefined\`).
- \`Awaited<T>\` — recursively unwraps \`Promise\` (since TS 4.5), handling thenable chains.
- \`InstanceType\`, \`ConstructorParameters\`, \`ThisParameterType\`.

## Practice

Understanding the implementations lets you write **your own** utilities (\`DeepPartial\`, \`PickByValue\`) and debug tricky type errors. For example, why \`Omit\` sometimes "loses" union discriminability — because it isn't distributive by default.`
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
      ru: `## Вариантность

Вариантность описывает, как **отношение подтипов** переносится на обёртки/обобщённые типы.

- **Ковариантность**: если \`Dog <: Animal\`, то \`Box<Dog> <: Box<Animal>\`. Сохраняет направление. Так ведут себя **позиции результата** (возвращаемые значения, читаемые поля).
- **Контравариантность**: направление **инвертируется** — \`Box<Animal> <: Box<Dog>\`. Так ведут себя **параметры функций**.
- **Инвариантность**: ни в ту, ни в другую сторону (изменяемые контейнеры в строгой системе).
- **Бивариантность**: в обе стороны (небезопасно).

## В TypeScript

Аргументы функций **контравариантны** при \`strictFunctionTypes\`:

\`\`\`ts
type Fn<A> = (a: A) => void;
declare let fa: Fn<Animal>;
declare let fd: Fn<Dog>;
fd = fa; // ok: Fn<Animal> присваивается Fn<Dog> (контравариантно)
fa = fd; // ошибка при strictFunctionTypes
\`\`\`

## Исключения и нюансы

- **Методы** (синтаксис \`m(a): void\`) остаются **бивариантными** ради удобства (например, обработчики событий, массивы). Это намеренная «дырка» в системе.
- Возвращаемые типы — ковариантны.
- \`readonly\`-массивы ковариантны; изменяемые массивы в TS бивариантны (опять же прагматизм).
- С TS 4.7 можно **явно** указывать вариантность через \`in\`/\`out\`/\`in out\` аннотации параметров типа для производительности и точности.

\`\`\`ts
interface State<in out T> { get(): T; set(v: T): void; } // инвариант
\`\`\`

Понимание вариантности объясняет «странные» ошибки присваивания функций и помогает проектировать безопасные API.`,
      en: `## Variance

Variance describes how the **subtype relation** transfers to wrappers/generic types.

- **Covariance**: if \`Dog <: Animal\` then \`Box<Dog> <: Box<Animal>\`. Preserves direction. This is how **output positions** behave (return values, readable fields).
- **Contravariance**: direction is **inverted** — \`Box<Animal> <: Box<Dog>\`. This is how **function parameters** behave.
- **Invariance**: neither direction (mutable containers in a strict system).
- **Bivariance**: both directions (unsafe).

## In TypeScript

Function arguments are **contravariant** under \`strictFunctionTypes\`:

\`\`\`ts
type Fn<A> = (a: A) => void;
declare let fa: Fn<Animal>;
declare let fd: Fn<Dog>;
fd = fa; // ok: Fn<Animal> assignable to Fn<Dog> (contravariant)
fa = fd; // error under strictFunctionTypes
\`\`\`

## Exceptions and nuances

- **Methods** (the \`m(a): void\` syntax) stay **bivariant** for convenience (e.g. event handlers, arrays). A deliberate "hole" in the system.
- Return types are covariant.
- \`readonly\` arrays are covariant; mutable arrays in TS are bivariant (again pragmatism).
- Since TS 4.7 you can **explicitly** annotate variance via \`in\`/\`out\`/\`in out\` on type parameters for speed and precision.

\`\`\`ts
interface State<in out T> { get(): T; set(v: T): void; } // invariant
\`\`\`

Understanding variance explains "weird" function-assignment errors and helps design safe APIs.`
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
      ru: `## any

\`any\` **отключает** проверку типов: любое значение присваивается и любой доступ разрешён. Это «escape hatch», который **заражает** код — ошибки протекают в рантайм. Используйте максимально редко (миграция, сторонние untyped-библиотеки).

## unknown

\`unknown\` — **типобезопасный** верхний тип. Любое значение можно **присвоить** в \`unknown\`, но **ничего нельзя сделать** с ним без **сужения** (type guard, \`typeof\`, \`instanceof\`, проверка). Это правильный тип для «неизвестного входа»: JSON, \`catch (e)\`, данные из сети.

\`\`\`ts
function parse(json: string): unknown {
  return JSON.parse(json);
}
const data = parse('{"n":1}');
// data.n;            // ошибка — сначала сузить
if (typeof data === 'object' && data && 'n' in data) {
  // здесь data сужен
}
\`\`\`

## never

\`never\` — **нижний** тип, не имеющий ни одного значения. Возникает:

- у функций, которые **не возвращают** (бросают/бесконечный цикл);
- в **недостижимых** ветках;
- как результат **невозможного** пересечения (\`string & number\`).

\`never\` присваивается **любому** типу, но в \`never\` ничего (кроме \`never\`) присвоить нельзя. Используется для **проверки полноты** (exhaustiveness):

\`\`\`ts
function assertNever(x: never): never { throw new Error('unexpected: ' + x); }
\`\`\`

## Сводка

- \`any\` — «знаю лучше компилятора» (опасно).
- \`unknown\` — «не знаю, заставь меня проверить» (безопасно).
- \`never\` — «такого не бывает» (логическая невозможность).`,
      en: `## any

\`any\` **disables** type checking: any value is assignable and any access is allowed. It's an escape hatch that **infects** code — errors leak to runtime. Use it as rarely as possible (migration, untyped third-party libs).

## unknown

\`unknown\` is the **type-safe** top type. Any value can be **assigned** to \`unknown\`, but you can **do nothing** with it without **narrowing** (type guard, \`typeof\`, \`instanceof\`, checks). It's the correct type for "unknown input": JSON, \`catch (e)\`, network data.

\`\`\`ts
function parse(json: string): unknown {
  return JSON.parse(json);
}
const data = parse('{"n":1}');
// data.n;            // error — narrow first
if (typeof data === 'object' && data && 'n' in data) {
  // here data is narrowed
}
\`\`\`

## never

\`never\` is the **bottom** type with no values at all. It arises:

- in functions that **don't return** (throw/infinite loop);
- in **unreachable** branches;
- as the result of an **impossible** intersection (\`string & number\`).

\`never\` is assignable to **any** type, but nothing (except \`never\`) is assignable to \`never\`. Used for **exhaustiveness** checks:

\`\`\`ts
function assertNever(x: never): never { throw new Error('unexpected: ' + x); }
\`\`\`

## Summary

- \`any\` — "I know better than the compiler" (dangerous).
- \`unknown\` — "I don't know, force me to check" (safe).
- \`never\` — "this cannot happen" (logical impossibility).`
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
      ru: `## Control-flow analysis

TS отслеживает тип переменной **по ветвям кода**. После проверки тип в этой ветке **сужается**. Источники сужения:

- \`typeof x === 'string'\`
- \`x instanceof Cls\`
- \`'prop' in obj\`
- проверки на \`null\`/\`undefined\`, truthiness
- сравнение с литералом (для дискриминируемых union)
- присваивание (тип уточняется по значению)

\`\`\`ts
function f(x: string | number | null) {
  if (x == null) return;        // здесь x: null | undefined исключён
  if (typeof x === 'string') {
    x.toUpperCase();            // x: string
  } else {
    x.toFixed(2);               // x: number
  }
}
\`\`\`

## Пользовательские type guards

Функция с возвращаемым типом \`arg is T\` — **предикат типа**. Если возвращает \`true\`, TS сужает аргумент до \`T\` в вызывающем коде. Ответственность за корректность — на разработчике.

\`\`\`ts
interface Cat { meow(): void }
function isCat(a: unknown): a is Cat {
  return typeof a === 'object' && a !== null && 'meow' in a;
}
\`\`\`

## assertion-функции

\`asserts x is T\` (или \`asserts cond\`) — бросает, если условие ложно, и **сужает** после вызова без \`if\`:

\`\`\`ts
function assert(c: unknown): asserts c { if (!c) throw new Error(); }
\`\`\`

## Нюансы

- Сужение **теряется** после await/колбэков (переменная могла измениться) — переприсвойте в \`const\`.
- \`as const\` и дискриминанты делают union легко сужаемыми.
- TS 5.5 умеет **выводить** предикаты для простых фильтрующих функций автоматически.`,
      en: `## Control-flow analysis

TS tracks a variable's type **per code branch**. After a check the type in that branch is **narrowed**. Sources of narrowing:

- \`typeof x === 'string'\`
- \`x instanceof Cls\`
- \`'prop' in obj\`
- \`null\`/\`undefined\` and truthiness checks
- literal comparison (for discriminated unions)
- assignment (type refined by value)

\`\`\`ts
function f(x: string | number | null) {
  if (x == null) return;        // null | undefined excluded here
  if (typeof x === 'string') {
    x.toUpperCase();            // x: string
  } else {
    x.toFixed(2);               // x: number
  }
}
\`\`\`

## Custom type guards

A function with return type \`arg is T\` is a **type predicate**. If it returns \`true\`, TS narrows the argument to \`T\` at the call site. Correctness is the developer's responsibility.

\`\`\`ts
interface Cat { meow(): void }
function isCat(a: unknown): a is Cat {
  return typeof a === 'object' && a !== null && 'meow' in a;
}
\`\`\`

## Assertion functions

\`asserts x is T\` (or \`asserts cond\`) throws if the condition is false and **narrows** afterwards without an \`if\`:

\`\`\`ts
function assert(c: unknown): asserts c { if (!c) throw new Error(); }
\`\`\`

## Nuances

- Narrowing is **lost** after await/callbacks (the variable might have changed) — reassign to a \`const\`.
- \`as const\` and discriminants make unions easy to narrow.
- TS 5.5 can **infer** predicates for simple filtering functions automatically.`
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
      ru: `## Discriminated (tagged) unions

Это union из объектных типов с **общим литеральным полем-дискриминантом** (\`kind\`, \`type\`, \`status\`). По значению дискриминанта TS **автоматически сужает** до конкретного члена.

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

## Exhaustiveness

Чтобы компилятор **гарантировал** обработку всех вариантов, добавьте \`default\`, присваивающий значение в \`never\`. Если позже добавить новый член union без ветки — будет **ошибка компиляции**:

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

## Почему это сильно

- Модель «делает невалидные состояния непредставимыми».
- Рефакторинг безопасен: добавление варианта подсвечивает все места обработки.
- Лучше иерархий классов: данные плоские, легко сериализуются, нет лишнего ООП.

Это краеугольный паттерн для моделирования состояний UI (loading/success/error), действий Redux/NgRx и доменных событий.`,
      en: `## Discriminated (tagged) unions

A union of object types with a **shared literal discriminant field** (\`kind\`, \`type\`, \`status\`). By the discriminant's value TS **automatically narrows** to the specific member.

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

## Exhaustiveness

To make the compiler **guarantee** every variant is handled, add a \`default\` that assigns to \`never\`. If a new union member is later added without a branch — you get a **compile error**:

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

## Why it's powerful

- The "make invalid states unrepresentable" model.
- Refactoring is safe: adding a variant flags every handling site.
- Better than class hierarchies: data is flat, easily serialized, no extra OOP.

It's a cornerstone pattern for modeling UI state (loading/success/error), Redux/NgRx actions, and domain events.`
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
      ru: `## Проблема

Аннотация типа (\`const x: T = ...\`) **расширяет** выводимый тип до \`T\`, теряя точную информацию о литералах. \`as T\` — небезопасное **утверждение** без проверки совместимости (в обе стороны, кроме сильно несвязанных). Хочется: **проверить** соответствие, но **сохранить** узкий выведенный тип.

## satisfies

\`expr satisfies T\` (TS 4.9) проверяет, что \`expr\` **присваиваем** к \`T\`, но **не меняет** выводимый тип выражения — остаётся самый узкий.

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

## Сравнение

- **\`: T\`** — проверяет + расширяет до \`T\` (теряет точность).
- **\`as T\`** — навязывает тип без полноценной проверки (опасно).
- **\`satisfies T\`** — проверяет + сохраняет выведенный (узкий) тип.

## Применение

- Конфиги/словари, где нужны и проверка формы, и точные ключи/значения.
- Тематические палитры, маршруты, маппинги действий.
- Часто в паре с \`as const\` для максимально узких литералов.

\`\`\`ts
const routes = {
  home: '/',
  user: '/user/:id',
} as const satisfies Record<string, \\\`/\\\${string}\\\`>;
\`\`\`

\`satisfies\` — «проверь, но не порти мой тип».`,
      en: `## The problem

A type annotation (\`const x: T = ...\`) **widens** the inferred type to \`T\`, losing precise literal info. \`as T\` is an unsafe **assertion** without a compatibility check (both directions, except wildly unrelated ones). You want to **verify** conformance but **keep** the narrow inferred type.

## satisfies

\`expr satisfies T\` (TS 4.9) checks that \`expr\` is **assignable** to \`T\` but does **not change** the inferred type — the narrowest one stays.

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

## Comparison

- **\`: T\`** — checks + widens to \`T\` (loses precision).
- **\`as T\`** — forces a type without a real check (dangerous).
- **\`satisfies T\`** — checks + keeps the inferred (narrow) type.

## Uses

- Configs/dictionaries needing both shape validation and exact keys/values.
- Theme palettes, routes, action maps.
- Often paired with \`as const\` for the narrowest literals.

\`\`\`ts
const routes = {
  home: '/',
  user: '/user/:id',
} as const satisfies Record<string, \\\`/\\\${string}\\\`>;
\`\`\`

\`satisfies\` — "check it, but don't ruin my type".`
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
      ru: `## Declaration merging

TS позволяет **объединять** несколько объявлений с одним именем в одну сущность. Что сливается:

- **interface + interface** — поля объединяются (нельзя конфликтовать по типам).
- **namespace + namespace** — члены объединяются.
- **namespace + function/class/enum** — добавление статики/вложенных типов.
- \`enum + enum\`.

\`type\`-алиасы **не** сливаются (будет ошибка дубликата).

\`\`\`ts
interface User { id: number; }
interface User { name: string; }
const u: User = { id: 1, name: 'Ann' }; // оба поля
\`\`\`

## Module augmentation

Расширение **существующего модуля** извне через \`declare module\`. Классический случай — добавить свойство в типы сторонней библиотеки.

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

## Где применяется

- Плагины, расширяющие типы библиотек (Vue \`ComponentCustomProperties\`, Express \`Request\`).
- Глобальные типы (\`Window\`, \`globalThis\`, \`ProcessEnv\`).
- Декларация ambient-модулей для нетипизированных пакетов.

## Подводные камни

- Аугментация должна быть в **модульном** файле (с \`import\`/\`export\`), иначе \`declare module\` трактуется как ambient-объявление нового модуля.
- Глобальное «загрязнение» типов осложняет рассуждения — используйте сдержанно.
- Конфликтующие поля при merge интерфейсов → ошибка компиляции (это и защита).`,
      en: `## Declaration merging

TS lets you **merge** multiple declarations of the same name into one entity. What merges:

- **interface + interface** — fields combine (no type conflicts allowed).
- **namespace + namespace** — members combine.
- **namespace + function/class/enum** — adds statics/nested types.
- \`enum + enum\`.

\`type\` aliases do **not** merge (duplicate error).

\`\`\`ts
interface User { id: number; }
interface User { name: string; }
const u: User = { id: 1, name: 'Ann' }; // both fields
\`\`\`

## Module augmentation

Extending an **existing module** from outside via \`declare module\`. The classic case is adding a property to a third-party library's types.

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

## Where it's used

- Plugins extending library types (Vue \`ComponentCustomProperties\`, Express \`Request\`).
- Global types (\`Window\`, \`globalThis\`, \`ProcessEnv\`).
- Ambient module declarations for untyped packages.

## Pitfalls

- Augmentation must live in a **module** file (with \`import\`/\`export\`); otherwise \`declare module\` is treated as an ambient declaration of a new module.
- Global type "pollution" complicates reasoning — use sparingly.
- Conflicting fields when merging interfaces → compile error (which is also a safeguard).`
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
      ru: `## Две системы декораторов

Сейчас сосуществуют два несовместимых дизайна.

### Legacy (experimentalDecorators: true)

- Основаны на **раннем** proposal; используются в Angular, NestJS, TypeORM.
- Сигнатура для метода: \`(target, propertyKey, descriptor)\`.
- Поддерживают **декораторы параметров**.
- Совместно с \`emitDecoratorMetadata\` и \`reflect-metadata\` дают **типовые метаданные** в рантайме (\`design:type\`, \`design:paramtypes\`) — основа DI в Angular.

\`\`\`ts
function Log(target: any, key: string, desc: PropertyDescriptor) {
  const orig = desc.value;
  desc.value = function (...a: any[]) {
    console.log(key, a);
    return orig.apply(this, a);
  };
}
\`\`\`

### TC39 Stage 3 (TS 5.0, по умолчанию без флага)

- Стандартный дизайн, ближе к попаданию в ECMAScript.
- Декоратор получает \`(value, context)\`, где \`context\` содержит \`kind\`, \`name\`, \`addInitializer\`, \`static\`, \`private\`.
- **Нет** декораторов параметров (пока).
- Нет встроенной эмиссии метаданных типов (есть отдельный proposal \`Symbol.metadata\`).

\`\`\`ts
function log<T>(orig: any, ctx: ClassMethodDecoratorContext) {
  return function (this: T, ...args: any[]) {
    console.log(ctx.name, args);
    return orig.call(this, ...args);
  };
}
\`\`\`

## Практический выбор

- **Angular на данный момент** требует legacy-декораторы (\`experimentalDecorators\`), потому что зависит от \`emitDecoratorMetadata\`.
- Новые проекты вне таких фреймворков — стандартные декораторы.
- Смешивать в одном проекте нельзя: флаг переключает всю семантику. Перенос кода между системами требует переписывания сигнатур.`,
      en: `## Two decorator systems

Two incompatible designs currently coexist.

### Legacy (experimentalDecorators: true)

- Based on the **early** proposal; used by Angular, NestJS, TypeORM.
- Method signature: \`(target, propertyKey, descriptor)\`.
- Support **parameter decorators**.
- Together with \`emitDecoratorMetadata\` and \`reflect-metadata\` they emit **type metadata** at runtime (\`design:type\`, \`design:paramtypes\`) — the basis of Angular DI.

\`\`\`ts
function Log(target: any, key: string, desc: PropertyDescriptor) {
  const orig = desc.value;
  desc.value = function (...a: any[]) {
    console.log(key, a);
    return orig.apply(this, a);
  };
}
\`\`\`

### TC39 Stage 3 (TS 5.0, default without the flag)

- The standard design, close to landing in ECMAScript.
- A decorator receives \`(value, context)\`, where \`context\` has \`kind\`, \`name\`, \`addInitializer\`, \`static\`, \`private\`.
- **No** parameter decorators (yet).
- No built-in type-metadata emission (a separate \`Symbol.metadata\` proposal exists).

\`\`\`ts
function log<T>(orig: any, ctx: ClassMethodDecoratorContext) {
  return function (this: T, ...args: any[]) {
    console.log(ctx.name, args);
    return orig.call(this, ...args);
  };
}
\`\`\`

## Practical choice

- **Angular currently** requires legacy decorators (\`experimentalDecorators\`) because it depends on \`emitDecoratorMetadata\`.
- New projects outside such frameworks — standard decorators.
- You cannot mix them in one project: the flag switches the whole semantics. Porting code between systems requires rewriting signatures.`
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
      ru: `## Проблема расширения литералов

По умолчанию при выводе дженерика TS **расширяет** литералы: \`'a'\` → \`string\`, \`[1, 2]\` → \`number[]\`. Чтобы сохранить узкие типы, раньше приходилось добавлять \`as const\` **на стороне вызова**, что неудобно для пользователей API.

\`\`\`ts
function id<T>(x: T): T { return x; }
const r = id(['a', 'b']); // T = string[]
\`\`\`

## const type parameters

\`<const T>\` (TS 5.0) говорит компилятору выводить \`T\` так, **как будто** аргумент помечен \`as const\` — без участия вызывающего.

\`\`\`ts
function asTuple<const T>(x: T): T { return x; }
const a = asTuple(['a', 'b']);     // readonly ['a', 'b']
const o = asTuple({ k: 1 });       // { readonly k: 1 }

function route<const T extends readonly string[]>(parts: T): T { return parts; }
const r = route(['users', 'list']); // readonly ['users', 'list']
\`\`\`

## Что именно меняется

- Литералы **не расширяются** (\`'a'\` остаётся \`'a'\`).
- Массивы становятся **readonly tuple**.
- Объекты получают \`readonly\` свойства с литеральными типами значений.

## Ограничения

- Действует только на **вывод**; если тип задан явно, эффекта нет.
- Не делает значение реально иммутабельным в рантайме — это **только типы**.
- Не «проникает» сквозь места, где значение уже расширено (например, переменная без \`as const\`, переданная как аргумент, уже может быть \`string[]\`).

## Применение

Типобезопасные DSL, билдеры роутов, схемы валидации, \`createStore\`-подобные API — везде, где важна точная литеральная форма входа без бойлерплейта \`as const\` у потребителя.`,
      en: `## The literal widening problem

By default, when inferring a generic, TS **widens** literals: \`'a'\` → \`string\`, \`[1, 2]\` → \`number[]\`. To keep narrow types you previously had to add \`as const\` **at the call site**, which is awkward for API consumers.

\`\`\`ts
function id<T>(x: T): T { return x; }
const r = id(['a', 'b']); // T = string[]
\`\`\`

## const type parameters

\`<const T>\` (TS 5.0) tells the compiler to infer \`T\` **as if** the argument were marked \`as const\` — without the caller doing anything.

\`\`\`ts
function asTuple<const T>(x: T): T { return x; }
const a = asTuple(['a', 'b']);     // readonly ['a', 'b']
const o = asTuple({ k: 1 });       // { readonly k: 1 }

function route<const T extends readonly string[]>(parts: T): T { return parts; }
const r = route(['users', 'list']); // readonly ['users', 'list']
\`\`\`

## What changes exactly

- Literals are **not widened** (\`'a'\` stays \`'a'\`).
- Arrays become **readonly tuples**.
- Objects get \`readonly\` properties with literal value types.

## Limitations

- Only affects **inference**; if the type is given explicitly, no effect.
- Doesn't make the value truly immutable at runtime — **types only**.
- Doesn't "reach through" already-widened values (e.g. a variable without \`as const\` passed as an argument may already be \`string[]\`).

## Uses

Type-safe DSLs, route builders, validation schemas, \`createStore\`-like APIs — anywhere exact literal input shape matters without \`as const\` boilerplate on the consumer side.`
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
      ru: `## Структурная типизация

TS использует **структурную** (duck) типизацию: совместимость определяется **формой** (набором свойств), а не именем типа. Если объект имеет все требуемые члены — он подходит, даже если это другой класс/интерфейс.

\`\`\`ts
interface Point { x: number; y: number; }
class Vec { constructor(public x: number, public y: number) {} }
const p: Point = new Vec(1, 2); // ok — структура совпадает
\`\`\`

## Плюсы и риск

Гибко и удобно для интеропа, но **теряет** различимость семантически разных типов с одинаковой формой: \`UserId\` и \`OrderId\`, оба \`string\`, взаимозаменяемы — источник багов.

## Branding (номинальная эмуляция)

Добавляют **фантомное** поле-маркер, недостижимое в рантайме, чтобы сделать тип «именованным»:

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

## Нюансы

- Бренд существует **только в типах**, рантайм-значение — обычная строка/число.
- Создание branded-значения требует контролируемого «конструктора» с \`as\`.
- \`unique symbol\`-ключ предотвращает случайное совпадение брендов.

## Excess property checks

Отдельная деталь структурной системы: при присваивании **литерала объекта** TS дополнительно проверяет «лишние» свойства — это поверх обычной структурной совместимости. Через промежуточную переменную проверка обходится. Понимание этого объясняет «почему литерал ругается, а переменная нет».`,
      en: `## Structural typing

TS uses **structural** (duck) typing: compatibility is decided by **shape** (the set of members), not by type name. If an object has all required members, it fits — even if it's a different class/interface.

\`\`\`ts
interface Point { x: number; y: number; }
class Vec { constructor(public x: number, public y: number) {} }
const p: Point = new Vec(1, 2); // ok — shapes match
\`\`\`

## Pros and risk

Flexible and great for interop, but it **loses** the distinction between semantically different types with the same shape: \`UserId\` and \`OrderId\`, both \`string\`, are interchangeable — a bug source.

## Branding (nominal emulation)

Add a **phantom** marker field, unreachable at runtime, to make a type "named":

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

## Nuances

- The brand exists **only in types**; the runtime value is a plain string/number.
- Creating a branded value requires a controlled "constructor" with \`as\`.
- A \`unique symbol\` key prevents accidental brand collisions.

## Excess property checks

A separate detail of the structural system: assigning an **object literal**, TS additionally checks for "excess" properties — on top of normal structural compatibility. Going through an intermediate variable bypasses the check. This explains "why the literal complains but the variable doesn't".`
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
      ru: `## async/await поверх промисов

\`async\`-функция всегда возвращает Promise. \`await expr\` — синтаксический сахар: приостанавливает функцию до резолва \`expr\` и **планирует продолжение как микрозадачу**. Под капотом это эквивалентно \`.then()\` с продолжением в коллбэке (исторически — генератор + раннер).

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

## Важные детали

- \`await x\` оборачивает \`x\` в \`Promise.resolve(x)\`; продолжение — **микрозадача**, поэтому код после \`await\` выполняется **после** синхронного кода текущего тика.
- Ошибки в \`async\` превращаются в **rejected** Promise; \`try/catch\` ловит \`await\`-ошибки как синхронные.
- Несколько последовательных \`await\` сериализуют операции; для параллельности — \`Promise.all\`.

## Параллельность

\`\`\`js
// последовательно (медленно)
const a = await fetchA();
const b = await fetchB();

// параллельно (быстро)
const [a2, b2] = await Promise.all([fetchA(), fetchB()]);
\`\`\`

## Гочи

- \`forEach\` **не ждёт** async-коллбэки — используйте \`for...of\` с \`await\` или \`Promise.all(map)\`.
- Необработанный rejection → \`unhandledrejection\`.
- \`await\` в цикле создаёт «водопад» запросов; осознанно выбирайте между порядком и скоростью.
- \`Promise.allSettled\`/\`race\`/\`any\` покрывают разные стратегии ожидания.`,
      en: `## async/await on top of promises

An \`async\` function always returns a Promise. \`await expr\` is syntactic sugar: it suspends the function until \`expr\` resolves and **schedules the continuation as a microtask**. Under the hood it's equivalent to \`.then()\` with the continuation in the callback (historically a generator + runner).

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

## Key details

- \`await x\` wraps \`x\` in \`Promise.resolve(x)\`; the continuation is a **microtask**, so code after \`await\` runs **after** the current tick's synchronous code.
- Errors in \`async\` become a **rejected** Promise; \`try/catch\` catches \`await\` errors as if synchronous.
- Several sequential \`await\`s serialize operations; for parallelism use \`Promise.all\`.

## Parallelism

\`\`\`js
// sequential (slow)
const a = await fetchA();
const b = await fetchB();

// parallel (fast)
const [a2, b2] = await Promise.all([fetchA(), fetchB()]);
\`\`\`

## Gotchas

- \`forEach\` does **not** await async callbacks — use \`for...of\` with \`await\` or \`Promise.all(map)\`.
- An unhandled rejection → \`unhandledrejection\`.
- \`await\` in a loop creates a request "waterfall"; choose deliberately between order and speed.
- \`Promise.allSettled\`/\`race\`/\`any\` cover different waiting strategies.`
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
      ru: `## const ≠ иммутабельность

\`const\` запрещает **переприсваивание биндинга**, но **не** мутацию содержимого объекта/массива. Ссылка фиксирована — данные нет.

\`\`\`js
const arr = [1, 2];
arr.push(3);      // ok — мутация разрешена
// arr = [];      // ошибка — переприсваивание запрещено
\`\`\`

## Object.freeze

\`Object.freeze(obj)\` делает объект **неизменяемым на поверхностном уровне**:

- нельзя добавлять/удалять свойства;
- нельзя менять значения существующих;
- нельзя менять дескрипторы и прототип.

В strict mode попытка мутации бросает \`TypeError\`; в нестрогом — **молча игнорируется**. \`Object.isFrozen\` проверяет состояние.

\`\`\`js
'use strict';
const cfg = Object.freeze({ a: 1, nested: { b: 2 } });
// cfg.a = 5;        // TypeError
cfg.nested.b = 99;   // ok! freeze поверхностный
\`\`\`

## Ограничения и deep freeze

\`freeze\` **не рекурсивен** — вложенные объекты остаются мутабельными. Для глубокой заморозки обходят граф рекурсивно (с осторожностью к циклам):

\`\`\`js
function deepFreeze(o) {
  Object.getOwnPropertyNames(o).forEach((k) => {
    const v = o[k];
    if (v && typeof v === 'object') deepFreeze(v);
  });
  return Object.freeze(o);
}
\`\`\`

## Прочее

- \`Object.seal\` — запрещает добавление/удаление, но **разрешает** менять значения.
- \`Object.preventExtensions\` — запрещает только добавление.
- В TS есть \`readonly\` и \`Readonly<T>\`, но это **только compile-time** — рантайм-защиты не даёт. Для настоящей иммутабельности данных используют freeze или библиотеки (Immer, Immutable.js).`,
      en: `## const ≠ immutability

\`const\` forbids **rebinding the binding** but **not** mutating the object/array contents. The reference is fixed — the data isn't.

\`\`\`js
const arr = [1, 2];
arr.push(3);      // ok — mutation allowed
// arr = [];      // error — rebinding forbidden
\`\`\`

## Object.freeze

\`Object.freeze(obj)\` makes an object **shallowly immutable**:

- can't add/remove properties;
- can't change existing values;
- can't change descriptors or the prototype.

In strict mode a mutation attempt throws \`TypeError\`; in sloppy mode it's **silently ignored**. \`Object.isFrozen\` checks the state.

\`\`\`js
'use strict';
const cfg = Object.freeze({ a: 1, nested: { b: 2 } });
// cfg.a = 5;        // TypeError
cfg.nested.b = 99;   // ok! freeze is shallow
\`\`\`

## Limits and deep freeze

\`freeze\` is **not recursive** — nested objects stay mutable. For deep freezing, traverse the graph recursively (mind cycles):

\`\`\`js
function deepFreeze(o) {
  Object.getOwnPropertyNames(o).forEach((k) => {
    const v = o[k];
    if (v && typeof v === 'object') deepFreeze(v);
  });
  return Object.freeze(o);
}
\`\`\`

## Related

- \`Object.seal\` — forbids add/remove but **allows** value changes.
- \`Object.preventExtensions\` — forbids only adding.
- TS has \`readonly\` and \`Readonly<T>\`, but it's **compile-time only** — no runtime protection. For real data immutability use freeze or libraries (Immer, Immutable.js).`
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
      ru: `## Hidden classes (shapes / maps)

JS-объекты динамичны, но V8 для скорости создаёт под капотом **hidden class** — описание «формы» объекта (какие свойства, в каком порядке, по каким смещениям). Объекты с одинаковой структурой делят один hidden class.

Добавление свойств порождает **переходы** (transition tree). Поэтому **порядок и набор** инициализации полей важны:

\`\`\`js
function A() { this.x = 1; this.y = 2; } // одна форма для всех A
const a1 = new A(), a2 = new A();         // делят hidden class

const p1 = { x: 1 }; p1.y = 2;
const p2 = { y: 2 }; p2.x = 1;            // другой порядок → другая форма
\`\`\`

## Inline caches (IC)

При доступе к свойству (\`obj.x\`) V8 кэширует на месте вызова, где лежит \`x\` для встреченной формы. Виды:

- **monomorphic** — встречается одна форма (быстро).
- **polymorphic** — несколько форм (медленнее, до ~4).
- **megamorphic** — много форм (IC отключается, медленный путь).

## Что замедляет

- Разные «формы» объектов в горячем коде → полиморфизм.
- Удаление свойств (\`delete\`), смена прототипа, \`__proto__=\`.
- Смешанные типы в «упакованных» массивах (\`SMI\` → double → object).
- Разреженные массивы (holes) переводят в «dictionary mode».

## Практика

- Инициализируйте все поля в конструкторе в **одинаковом порядке**.
- Избегайте \`delete\` — присваивайте \`undefined\` или используйте \`Map\`.
- Держите массивы однотипными и плотными.
- Не полагайтесь слепо на микрооптимизации: профилируйте; современные движки умны, но согласованные формы стабильно помогают на горячих путях.`,
      en: `## Hidden classes (shapes / maps)

JS objects are dynamic, but for speed V8 builds an internal **hidden class** under the hood — a description of the object's "shape" (which properties, in which order, at which offsets). Objects with the same structure share one hidden class.

Adding properties creates **transitions** (a transition tree). So the **order and set** of field initialization matters:

\`\`\`js
function A() { this.x = 1; this.y = 2; } // one shape for all A
const a1 = new A(), a2 = new A();         // share a hidden class

const p1 = { x: 1 }; p1.y = 2;
const p2 = { y: 2 }; p2.x = 1;            // different order → different shape
\`\`\`

## Inline caches (IC)

On property access (\`obj.x\`) V8 caches, at the call site, where \`x\` lives for the seen shape. Kinds:

- **monomorphic** — one shape seen (fast).
- **polymorphic** — several shapes (slower, up to ~4).
- **megamorphic** — many shapes (IC disabled, slow path).

## What slows it down

- Different object "shapes" in hot code → polymorphism.
- Deleting properties (\`delete\`), changing the prototype, \`__proto__=\`.
- Mixed types in "packed" arrays (\`SMI\` → double → object).
- Sparse arrays (holes) drop to "dictionary mode".

## Practice

- Initialize all fields in the constructor in the **same order**.
- Avoid \`delete\` — assign \`undefined\` or use a \`Map\`.
- Keep arrays uniform and dense.
- Don't blindly micro-optimize: profile; modern engines are smart, but consistent shapes reliably help on hot paths.`
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
      ru: `## Перегрузки

Перегрузка — несколько **сигнатур объявления** над одной реализацией. Вызывающий «видит» только сигнатуры; тело принимает самый широкий тип и должно вручную их сопоставить.

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

## Зачем, а не union

Union-параметр (\`x: string | T[]\`) не связывает **вход с выходом**: результат был бы \`string | T[]\` для любого вызова. Перегрузки задают **зависимость**: строка → строка, массив → массив. Это точнее для потребителя.

## Порядок имеет значение

TS выбирает **первую** подходящую сигнатуру сверху вниз — более специфичные ставят выше. Сигнатура реализации **не видна** снаружи и не участвует в разрешении.

## Типизация this

Можно объявить тип \`this\` **первым «фантомным» параметром**:

\`\`\`ts
interface Btn { label: string; }
function render(this: Btn): string { return this.label; }
// render();          // ошибка — нет подходящего this
\`\`\`

\`this: void\` запрещает использование \`this\`. \`ThisParameterType\`/\`OmitThisParameter\` извлекают/убирают этот тип.

## Современная альтернатива

Часто перегрузки заменяют **дженериком с условным возвращаемым типом** — он масштабируемее и не страдает от «дыр» в выборе сигнатуры. Но для существенно разного числа/смысла аргументов перегрузки читаемее. Помните: перегрузки — **только типы**, рантайм-логику пишете сами.`,
      en: `## Overloads

An overload is several **declaration signatures** over one implementation. Callers "see" only the signatures; the body takes the widest type and must manually reconcile them.

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

## Why not a union

A union parameter (\`x: string | T[]\`) doesn't tie **input to output**: the result would be \`string | T[]\` for any call. Overloads express the **dependency**: string → string, array → array. More precise for the consumer.

## Order matters

TS picks the **first** matching signature top-to-bottom — put more specific ones higher. The implementation signature is **not visible** externally and doesn't participate in resolution.

## this typing

You can declare the \`this\` type as a **first "phantom" parameter**:

\`\`\`ts
interface Btn { label: string; }
function render(this: Btn): string { return this.label; }
// render();          // error — no suitable this
\`\`\`

\`this: void\` forbids using \`this\`. \`ThisParameterType\`/\`OmitThisParameter\` extract/strip this type.

## A modern alternative

Overloads are often replaced by a **generic with a conditional return type** — more scalable, no signature-selection "holes". But for genuinely different argument counts/meanings, overloads read better. Remember: overloads are **types only**; you write the runtime logic yourself.`
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
      ru: `## Обычный enum

Генерирует **реальный объект** в JS-выводе (с обратным маппингом для числовых enum). Существует в рантайме, занимает место в бандле, но позволяет итерацию и доступ по значению.

\`\`\`ts
enum Dir { Up, Down }      // Up=0, Down=1
Dir.Up;     // 0
Dir[0];     // 'Up' (reverse mapping, только числовые)
\`\`\`

## const enum

**Инлайнится** компилятором — обращения заменяются на литералы, объект **не** эмитится. Меньше бандл, но:

- не работает при \`isolatedModules\` без \`preserveConstEnums\`;
- проблемен для библиотек (потребитель не получит значения);
- Babel/esbuild по умолчанию его не понимают как TS-инлайн.

\`\`\`ts
const enum Color { Red, Green }
const c = Color.Red; // компилируется в: const c = 0;
\`\`\`

## Union литеральных типов

\`type Dir = 'up' | 'down'\` — **нет рантайм-следа** вовсе, отличное сужение, сериализуемость, хорошо дружит с дискриминируемыми union.

\`\`\`ts
type Status = 'idle' | 'loading' | 'done';
const s: Status = 'idle';
\`\`\`

## Что предпочесть

- **Union строковых литералов** — рекомендуемый дефолт: ноль рантайма, отличная типизация, JSON-совместимость.
- При нужде в **итерации/обратном маппинге** в рантайме — обычный enum или объект \`as const\` + \`keyof typeof\`.
- \`const enum\` — только в приложениях (не библиотеках) и при понимании ограничений тулчейна.

\`\`\`ts
const Roles = { Admin: 'admin', User: 'user' } as const;
type Role = typeof Roles[keyof typeof Roles]; // 'admin' | 'user'
\`\`\`

Паттерн \`as const\` + \`typeof\` часто лучший компромисс: и значения в рантайме, и точные типы.`,
      en: `## Regular enum

Emits a **real object** in JS output (with reverse mapping for numeric enums). Exists at runtime, takes bundle space, but allows iteration and value access.

\`\`\`ts
enum Dir { Up, Down }      // Up=0, Down=1
Dir.Up;     // 0
Dir[0];     // 'Up' (reverse mapping, numeric only)
\`\`\`

## const enum

**Inlined** by the compiler — accesses are replaced with literals, no object is emitted. Smaller bundle, but:

- breaks under \`isolatedModules\` without \`preserveConstEnums\`;
- problematic for libraries (consumers won't get values);
- Babel/esbuild don't inline it like TS by default.

\`\`\`ts
const enum Color { Red, Green }
const c = Color.Red; // compiles to: const c = 0;
\`\`\`

## Unions of literal types

\`type Dir = 'up' | 'down'\` — **no runtime footprint** at all, great narrowing, serializable, plays well with discriminated unions.

\`\`\`ts
type Status = 'idle' | 'loading' | 'done';
const s: Status = 'idle';
\`\`\`

## What to prefer

- **Union of string literals** — the recommended default: zero runtime, excellent typing, JSON-friendly.
- When you need runtime **iteration/reverse mapping** — a regular enum or an \`as const\` object + \`keyof typeof\`.
- \`const enum\` — only in apps (not libraries) and when you understand the toolchain limits.

\`\`\`ts
const Roles = { Admin: 'admin', User: 'user' } as const;
type Role = typeof Roles[keyof typeof Roles]; // 'admin' | 'user'
\`\`\`

The \`as const\` + \`typeof\` pattern is often the best compromise: runtime values and precise types.`
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
      ru: `## Рекурсивные типы

Тип может **ссылаться на себя**, что позволяет моделировать вложенные структуры и выполнять вычисления на уровне типов.

\`\`\`ts
type Json =
  | string | number | boolean | null
  | Json[]
  | { [k: string]: Json };

type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
\`\`\`

## Рекурсивные условные типы

С TS 4.1 условные типы могут рекурсивно вызывать себя — основа парсеров, \`Length\`, \`Reverse\`, арифметики на кортежах.

\`\`\`ts
type Length<T extends readonly unknown[]> = T['length'];

type BuildTuple<N extends number, R extends unknown[] = []> =
  R['length'] extends N ? R : BuildTuple<N, [...R, unknown]>;
type Five = Length<BuildTuple<5>>; // 5
\`\`\`

## Tail-recursion elimination

С TS 4.5 компилятор оптимизирует **хвостовую рекурсию** в условных типах: когда рекурсивный вызов — это **весь** результат ветки (аккумулятор-паттерн), глубина растёт без переполнения внутреннего стека инстанцирования. Это сильно поднимает практичный лимит (с ~50 до ~10 000 шагов).

\`\`\`ts
// хвостовая: accumulator растёт, вызов в позиции результата
type Join<T extends string[], D extends string, Acc extends string = ''> =
  T extends [infer H extends string, ...infer R extends string[]]
    ? Join<R, D, Acc extends '' ? H : \\\`\\\${Acc}\\\${D}\\\${H}\\\`>
    : Acc;
\`\`\`

## Пределы

- Не хвостовые рекурсии быстро упираются в «Type instantiation is excessively deep».
- Глубокая типовая рекурсия **замедляет** компиляцию и IDE.
- Это академически интересно, но в проде используйте умеренно — поддерживаемость важнее «типового кунг-фу».`,
      en: `## Recursive types

A type can **reference itself**, which lets you model nested structures and perform type-level computation.

\`\`\`ts
type Json =
  | string | number | boolean | null
  | Json[]
  | { [k: string]: Json };

type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
\`\`\`

## Recursive conditional types

Since TS 4.1 conditional types can call themselves recursively — the basis of parsers, \`Length\`, \`Reverse\`, tuple arithmetic.

\`\`\`ts
type Length<T extends readonly unknown[]> = T['length'];

type BuildTuple<N extends number, R extends unknown[] = []> =
  R['length'] extends N ? R : BuildTuple<N, [...R, unknown]>;
type Five = Length<BuildTuple<5>>; // 5
\`\`\`

## Tail-recursion elimination

Since TS 4.5 the compiler optimizes **tail recursion** in conditional types: when the recursive call is the **entire** result of the branch (accumulator pattern), depth grows without overflowing the internal instantiation stack. This greatly raises the practical limit (from ~50 to ~10,000 steps).

\`\`\`ts
// tail-recursive: accumulator grows, call is in result position
type Join<T extends string[], D extends string, Acc extends string = ''> =
  T extends [infer H extends string, ...infer R extends string[]]
    ? Join<R, D, Acc extends '' ? H : \\\`\\\${Acc}\\\${D}\\\${H}\\\`>
    : Acc;
\`\`\`

## Limits

- Non-tail recursions quickly hit "Type instantiation is excessively deep".
- Deep type recursion **slows** compilation and the IDE.
- It's academically fun, but use sparingly in production — maintainability beats "type kung-fu".`
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
      ru: `## Index signatures

\`{ [key: string]: V }\` описывает объект с **произвольными** строковыми ключами и значениями \`V\`. Ключи могут быть \`string\`, \`number\` или \`symbol\`. Все явные свойства обязаны быть совместимы с типом сигнатуры.

\`\`\`ts
interface Dict { [key: string]: number; }
const d: Dict = { a: 1 };
d.b;   // number — но в рантайме undefined!
\`\`\`

## keyof и indexed access

\`keyof T\` даёт union ключей. \`T[K]\` — тип значения по ключу. Вместе они дают типобезопасный доступ.

\`\`\`ts
type Obj = { id: number; name: string };
type Keys = keyof Obj;        // 'id' | 'name'
type V = Obj['name'];         // string
\`\`\`

## Небезопасность доступа

По умолчанию TS считает, что индексный доступ **всегда** возвращает заявленный тип, **игнорируя** возможность отсутствия ключа. Это оптимистичное (но неверное) допущение — частый источник \`undefined\`-багов:

\`\`\`ts
const map: Record<string, number> = {};
const x = map['missing']; // тип number, реально undefined
x.toFixed();              // рантайм-ошибка
\`\`\`

## noUncheckedIndexedAccess

Этот флаг \`tsconfig\` делает индексный доступ безопасным: результат становится \`V | undefined\`, заставляя проверять наличие.

\`\`\`ts
// с флагом
const x2 = map['missing']; // number | undefined
x2?.toFixed();             // обязаны проверить
\`\`\`

## Практика

- Включайте \`noUncheckedIndexedAccess\` в строгих проектах.
- Не распространяется на доступ по **известным** литеральным ключам объекта без index signature.
- Для словарей предпочитайте \`Map\` (явный \`.get(): V | undefined\`) или \`Record\` + флаг.
- \`in\`-проверка сужает и устраняет \`undefined\` в ветке.`,
      en: `## Index signatures

\`{ [key: string]: V }\` describes an object with **arbitrary** string keys and \`V\` values. Keys can be \`string\`, \`number\` or \`symbol\`. All explicit properties must be compatible with the signature type.

\`\`\`ts
interface Dict { [key: string]: number; }
const d: Dict = { a: 1 };
d.b;   // number — but undefined at runtime!
\`\`\`

## keyof and indexed access

\`keyof T\` yields the union of keys. \`T[K]\` is the value type at a key. Together they give type-safe access.

\`\`\`ts
type Obj = { id: number; name: string };
type Keys = keyof Obj;        // 'id' | 'name'
type V = Obj['name'];         // string
\`\`\`

## Unsafe access

By default TS assumes indexed access **always** returns the declared type, **ignoring** the possibility of a missing key. This optimistic (but wrong) assumption is a common source of \`undefined\` bugs:

\`\`\`ts
const map: Record<string, number> = {};
const x = map['missing']; // typed number, actually undefined
x.toFixed();              // runtime error
\`\`\`

## noUncheckedIndexedAccess

This \`tsconfig\` flag makes indexed access safe: the result becomes \`V | undefined\`, forcing a presence check.

\`\`\`ts
// with the flag
const x2 = map['missing']; // number | undefined
x2?.toFixed();             // must check
\`\`\`

## Practice

- Enable \`noUncheckedIndexedAccess\` in strict projects.
- It doesn't apply to access by **known** literal keys of an object without an index signature.
- For dictionaries prefer \`Map\` (explicit \`.get(): V | undefined\`) or \`Record\` + the flag.
- An \`in\` check narrows and removes \`undefined\` in the branch.`
    }
  }
];
