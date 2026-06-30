import { InterviewQuestion } from '../interfaces/question.interface';

export const RXJS_STATE_QUESTIONS_MORE: InterviewQuestion[] = [
  {
    id: 'rxjs-037',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['scan', 'reduce', 'mergescan'],
    question: {
      ru: 'Сравните scan, reduce и mergeScan. В чём разница в эмиссии и где нужен mergeScan?',
      en: 'Compare scan, reduce, and mergeScan. How do their emissions differ and where is mergeScan needed?'
    },
    answer: {
      ru: `## scan

\`scan(accumulator, seed)\` — это «\`reduce\` с промежуточными результатами». На **каждое** значение источника он вызывает аккумулятор и **сразу эмитит** новый аккумулятор.

\`\`\`
source:  --1--2--3--|
scan(+): --1--3--6--|
\`\`\`

Идеален для накопления состояния во времени: счётчики, мини-сторы, агрегация прогресса. Источник может быть бесконечным.

## reduce

\`reduce\` накапливает так же, но **эмитит один раз** — финальный результат **при complete**. Если источник не завершается, \`reduce\` **никогда** не эмитит.

\`\`\`
source:  --1--2--3--|
reduce:  -----------6|
\`\`\`

То есть \`reduce\` = \`scan\` + \`last()\`. Применяйте, когда нужен только итог завершённого конечного потока.

## mergeScan

\`mergeScan(accumulator, seed, concurrent?)\` — аккумулятор **возвращает Observable**, а не значение. Каждый результат внутреннего потока становится новым аккумулятором и эмитится. Это «\`scan\`, где шаг асинхронный».

\`\`\`ts
actions$.pipe(
  mergeScan((acc, action) =>
    api.apply(acc, action), // -> Observable<State>
  initialState)
);
\`\`\`

## Где нужен mergeScan

- Когда следующее состояние зависит от **асинхронной** операции (запрос к серверу на основе предыдущего состояния).
- Пагинация с накоплением: \`acc\` — уже загруженные элементы, шаг — догрузка следующей страницы.
- \`concurrent\` ограничивает параллельность внутренних потоков; при \`1\` получается последовательная аккумуляция (аналог \`concatMap\` + \`scan\`).

**Gotcha**: \`scan\` хранит состояние **на подписку** — при повторной подписке seed сбрасывается, поэтому для разделяемого состояния добавляйте \`shareReplay\`.`,
      en: `## scan

\`scan(accumulator, seed)\` is "\`reduce\` with intermediate results". For **every** source value it runs the accumulator and **immediately emits** the new accumulator.

\`\`\`
source:  --1--2--3--|
scan(+): --1--3--6--|
\`\`\`

Ideal for accumulating state over time: counters, mini-stores, progress aggregation. The source may be infinite.

## reduce

\`reduce\` accumulates the same way but **emits once** — the final result **on complete**. If the source never completes, \`reduce\` **never** emits.

\`\`\`
source:  --1--2--3--|
reduce:  -----------6|
\`\`\`

So \`reduce\` = \`scan\` + \`last()\`. Use it when you only need the total of a finished, finite stream.

## mergeScan

\`mergeScan(accumulator, seed, concurrent?)\` — the accumulator **returns an Observable**, not a value. Each emission of the inner stream becomes the new accumulator and is emitted. It is "\`scan\` whose step is async".

\`\`\`ts
actions$.pipe(
  mergeScan((acc, action) =>
    api.apply(acc, action), // -> Observable<State>
  initialState)
);
\`\`\`

## Where mergeScan is needed

- When the next state depends on an **async** operation (a server request based on the previous state).
- Accumulating pagination: \`acc\` is the items loaded so far, the step fetches the next page.
- \`concurrent\` caps inner-stream parallelism; with \`1\` you get sequential accumulation (like \`concatMap\` + \`scan\`).

**Gotcha**: \`scan\` keeps state **per subscription** — on resubscription the seed resets, so for shared state add \`shareReplay\`.`
    },
    codeSnippet: `// Accumulating pagination with mergeScan (concurrent = 1 = sequential)
const loadMore$ = new Subject<void>();

const items$ = loadMore$.pipe(
  mergeScan(
    (acc: Item[], _: void) =>
      api.page(acc.length).pipe(map((next) => [...acc, ...next])),
    [] as Item[],
    1 // one in-flight request at a time
  ),
  shareReplay({ bufferSize: 1, refCount: true })
);`
  },
  {
    id: 'rxjs-038',
    category: 'rxjs-state',
    level: 'Expert',
    tags: ['expand', 'recursion', 'pagination'],
    question: {
      ru: 'Как работает оператор expand и как с его помощью рекурсивно обойти пагинацию?',
      en: 'How does the expand operator work and how do you recursively traverse pagination with it?'
    },
    answer: {
      ru: `## Что делает expand

\`expand(project)\` — это рекурсивный \`mergeMap\`. Каждое **выходное** значение снова подаётся в \`project\`, и так далее, пока проекция не вернёт \`EMPTY\` (или поток не остановят). Эмитятся **все** промежуточные значения, включая исходное.

\`\`\`
seed -> project -> v1 -> project -> v2 -> project -> EMPTY
emit:  seed, v1, v2
\`\`\`

## Обход пагинации

Идеален, когда URL следующей страницы известен только **после** загрузки текущей (cursor-based API):

\`\`\`ts
api.getPage(1).pipe(
  expand((res) => res.next ? api.getPage(res.next) : EMPTY),
  takeWhile((res) => !!res.next, true), // включительно
  concatMap((res) => res.items),        // развернуть в элементы
  toArray()
);
\`\`\`

## Внутренности и gotchas

- expand по умолчанию работает как \`mergeMap\` (**параллельно**, \`concurrent = Infinity\`). Для строгого порядка страниц задайте \`concurrent = 1\` — тогда поведение как у \`concatMap\`.
- **Бесконечная рекурсия**: если \`project\` никогда не вернёт \`EMPTY\`, поток не завершится. Всегда нужно условие выхода.
- expand эмитит и **seed**, и все производные — не забудьте отфильтровать/трансформировать первое значение, если оно не нужно.
- Полезен также для обхода деревьев (BFS/DFS): каждый узел «расширяется» в детей.

## Marble

\`\`\`
expand: a---b--c---|   (a->b->c->EMPTY)
\`\`\`

expand — это «генератор», управляемый предыдущим результатом, тогда как \`scan\`/\`reduce\` управляются входным потоком.`,
      en: `## What expand does

\`expand(project)\` is a recursive \`mergeMap\`. Each **output** value is fed back into \`project\`, and so on, until the projection returns \`EMPTY\` (or the stream is stopped). It emits **all** intermediate values, including the seed.

\`\`\`
seed -> project -> v1 -> project -> v2 -> project -> EMPTY
emit:  seed, v1, v2
\`\`\`

## Traversing pagination

Ideal when the next page URL is known only **after** loading the current one (cursor-based APIs):

\`\`\`ts
api.getPage(1).pipe(
  expand((res) => res.next ? api.getPage(res.next) : EMPTY),
  takeWhile((res) => !!res.next, true), // inclusive
  concatMap((res) => res.items),        // unwrap into items
  toArray()
);
\`\`\`

## Internals and gotchas

- expand defaults to \`mergeMap\` behavior (**parallel**, \`concurrent = Infinity\`). For strict page order set \`concurrent = 1\` — then it behaves like \`concatMap\`.
- **Infinite recursion**: if \`project\` never returns \`EMPTY\`, the stream never completes. Always need an exit condition.
- expand emits both the **seed** and every derivative — remember to filter/transform the first value if you do not need it.
- Also useful for tree traversal (BFS/DFS): each node "expands" into its children.

## Marble

\`\`\`
expand: a---b--c---|   (a->b->c->EMPTY)
\`\`\`

expand is a "generator" driven by the previous result, whereas \`scan\`/\`reduce\` are driven by the input stream.`
    }
  },
  {
    id: 'rxjs-039',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['groupby', 'partition', 'higher-order'],
    question: {
      ru: 'Как работают groupBy и partition? В чём опасность groupBy в долгоживущих потоках?',
      en: 'How do groupBy and partition work? What is the danger of groupBy in long-lived streams?'
    },
    answer: {
      ru: `## partition

\`partition(source, predicate)\` разбивает поток на **два** по булеву предикату и возвращает кортеж \`[passed$, failed$]\`. Это просто пара \`filter\`:

\`\`\`ts
const [even$, odd$] = partition(nums$, (n) => n % 2 === 0);
\`\`\`

Количество выходов фиксировано — два. Удобно, когда нужно разнести «успех/ошибка» или «активные/архивные».

## groupBy

\`groupBy(keySelector)\` создаёт **динамическое** число подпотоков — по одному на каждый уникальный ключ. Эмитит \`GroupedObservable\`, у которого есть \`.key\`. Обычно за ним идёт higher-order оператор:

\`\`\`ts
events$.pipe(
  groupBy((e) => e.userId),
  mergeMap((group$) => group$.pipe(
    throttleTime(1000),               // на каждого пользователя свой throttle
    map((e) => ({ user: group$.key, e }))
  ))
);
\`\`\`

## Опасность в долгоживущих потоках

- Каждая группа — это внутренний \`Subject\`, **живущий до complete источника**. На бесконечном потоке с **растущим числом ключей** (например, по uuid) группы **накапливаются** → утечка памяти.
- Решение — \`duration\` селектор: \`groupBy(keyFn, { duration: (g) => g.pipe(debounceTime(30000)) })\`. Группа закрывается по таймеру неактивности и пересоздаётся при новом значении ключа.
- Нужно **подписаться** на каждую группу (через \`mergeMap\`/\`merge\`), иначе значения буферизуются в неподписанном \`GroupedObservable\`.

## Кратко

- \`partition\` — фиксированные две ветки по предикату.
- \`groupBy\` — динамические N веток по ключу; следите за временем жизни групп.`,
      en: `## partition

\`partition(source, predicate)\` splits a stream into **two** by a boolean predicate and returns a tuple \`[passed$, failed$]\`. It is just a pair of \`filter\`:

\`\`\`ts
const [even$, odd$] = partition(nums$, (n) => n % 2 === 0);
\`\`\`

The number of outputs is fixed — two. Handy to separate "success/failure" or "active/archived".

## groupBy

\`groupBy(keySelector)\` creates a **dynamic** number of substreams — one per distinct key. It emits \`GroupedObservable\`s that expose \`.key\`. Usually followed by a higher-order operator:

\`\`\`ts
events$.pipe(
  groupBy((e) => e.userId),
  mergeMap((group$) => group$.pipe(
    throttleTime(1000),               // a per-user throttle
    map((e) => ({ user: group$.key, e }))
  ))
);
\`\`\`

## Danger in long-lived streams

- Each group is an inner \`Subject\` that **lives until the source completes**. On an infinite stream with a **growing set of keys** (e.g. uuids), groups **accumulate** → memory leak.
- The fix is a \`duration\` selector: \`groupBy(keyFn, { duration: (g) => g.pipe(debounceTime(30000)) })\`. The group closes after an idle timeout and is recreated on a new value of that key.
- You must **subscribe** to each group (via \`mergeMap\`/\`merge\`), otherwise values buffer in the unsubscribed \`GroupedObservable\`.

## In brief

- \`partition\` — fixed two branches by predicate.
- \`groupBy\` — dynamic N branches by key; watch group lifetimes.`
    }
  },
  {
    id: 'rxjs-040',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['buffer', 'window', 'bufferpattern'],
    question: {
      ru: 'Объясните семейство buffer и window (bufferCount, bufferTime, windowToggle). В чём разница buffer vs window?',
      en: 'Explain the buffer and window families (bufferCount, bufferTime, windowToggle). What is the difference between buffer and window?'
    },
    answer: {
      ru: `## Идея семейства

Эти операторы **группируют** значения по времени/количеству/сигналу. Принципиальная разница:

- **buffer*** эмитит **массив** накопленных значений: \`Observable<T[]>\`.
- **window*** эмитит **вложенный Observable** значений: \`Observable<Observable<T>>\` (higher-order).

Window мощнее (можно применять операторы к каждому окну), но требует подписки на внутренние потоки.

## Варианты buffer

- \`bufferCount(n, every?)\` — эмитит массив каждые \`n\` значений. \`every\` создаёт **скользящие** окна.
- \`bufferTime(ms)\` — эмитит массив каждые \`ms\` (по таймеру).
- \`bufferWhen(closingSelector)\` — окно закрывается, когда эмитит Observable из селектора.
- \`buffer(closing$)\` — закрывает буфер на каждую эмиссию \`closing$\`.
- \`bufferToggle(open$, closeFn)\` — окна открываются/закрываются по сигналам.

\`\`\`
bufferCount(2): a-b-c-d-e|
                ---[a,b]---[c,d]--([e])|
\`\`\`

## Варианты window

Те же стратегии (\`windowCount\`, \`windowTime\`, \`windowWhen\`, \`windowToggle\`), но вместо массивов — потоки. Типичный паттерн — агрегировать каждое окно:

\`\`\`ts
clicks$.pipe(
  windowTime(1000),
  mergeMap((win$) => win$.pipe(count())) // кликов в секунду
);
\`\`\`

## Практика и gotchas

- «Сколько событий за окно» / батчинг сетевых запросов → \`bufferTime\`/\`bufferCount\`.
- \`bufferToggle\`/\`windowToggle\` — для «записи между start/stop» (например, drag между mousedown и mouseup).
- **Gotcha**: незакрытое окно перед completion эмитит частичный буфер; \`bufferTime\` может эмитить **пустые** массивы, если за интервал ничего не пришло.`,
      en: `## The family idea

These operators **group** values by time/count/signal. The key difference:

- **buffer*** emits an **array** of collected values: \`Observable<T[]>\`.
- **window*** emits a **nested Observable** of values: \`Observable<Observable<T>>\` (higher-order).

Window is more powerful (you can apply operators to each window) but requires subscribing to the inner streams.

## buffer variants

- \`bufferCount(n, every?)\` — emits an array every \`n\` values. \`every\` creates **sliding** windows.
- \`bufferTime(ms)\` — emits an array every \`ms\` (timer-driven).
- \`bufferWhen(closingSelector)\` — the window closes when the selector's Observable emits.
- \`buffer(closing$)\` — closes the buffer on each emission of \`closing$\`.
- \`bufferToggle(open$, closeFn)\` — windows open/close on signals.

\`\`\`
bufferCount(2): a-b-c-d-e|
                ---[a,b]---[c,d]--([e])|
\`\`\`

## window variants

Same strategies (\`windowCount\`, \`windowTime\`, \`windowWhen\`, \`windowToggle\`), but instead of arrays you get streams. The typical pattern is to aggregate each window:

\`\`\`ts
clicks$.pipe(
  windowTime(1000),
  mergeMap((win$) => win$.pipe(count())) // clicks per second
);
\`\`\`

## Practice and gotchas

- "How many events per window" / batching network requests → \`bufferTime\`/\`bufferCount\`.
- \`bufferToggle\`/\`windowToggle\` — for "recording between start/stop" (e.g. a drag between mousedown and mouseup).
- **Gotcha**: an unclosed window before completion emits a partial buffer; \`bufferTime\` can emit **empty** arrays if nothing arrived in the interval.`
    },
    codeSnippet: `// Detect a "double click" by buffering clicks within a 250ms window
const doubleClick$ = clicks$.pipe(
  buffer(clicks$.pipe(debounceTime(250))),
  filter((group) => group.length === 2)
);

// Batch outgoing analytics events: flush every 5s OR every 20 events
const batch$ = events$.pipe(
  bufferTime(5000, null, 20),
  filter((batch) => batch.length > 0)
);`
  },
  {
    id: 'rxjs-041',
    category: 'rxjs-state',
    level: 'Medium',
    tags: ['pairwise', 'startwith', 'state'],
    question: {
      ru: 'Зачем нужны pairwise и startWith? Покажите типичные сценарии (дельта, начальное значение).',
      en: 'What are pairwise and startWith for? Show typical scenarios (delta, initial value).'
    },
    answer: {
      ru: `## pairwise

\`pairwise()\` эмитит **пару** \`[previous, current]\` из двух последних значений. Первое значение источника не эмитится отдельно — оно становится «previous» для второго.

\`\`\`
source:   a--b--c--d|
pairwise: ---[a,b]-[b,c]-[c,d]|
\`\`\`

Сценарии:

- **Дельта/направление**: сравнить новое и старое (скролл вверх/вниз, рост/падение значения).
- **Анимация перехода** между предыдущим и текущим состоянием.

\`\`\`ts
scrollY$.pipe(
  pairwise(),
  map(([prev, curr]) => curr > prev ? 'down' : 'up'),
  distinctUntilChanged()
);
\`\`\`

## startWith

\`startWith(...values)\` **синхронно** эмитит заданные значения **до** того, как источник выдаст первое. Тип результата расширяется до объединения.

Сценарии:

- **Начальное состояние** UI до прихода данных (loading-флаг, дефолт формы).
- «Подкормить» pairwise/scan первым значением, чтобы получить пару уже на первой эмиссии.
- Гарантировать, что \`combineLatest\` эмитит сразу (дать каждому источнику стартовое значение).

\`\`\`ts
filters$.pipe(
  startWith(DEFAULT_FILTERS), // combineLatest стартует немедленно
);
\`\`\`

## Комбинация

\`startWith\` + \`pairwise\` — частый дуэт: стартовое значение даёт «previous» для самого первого реального значения.

\`\`\`ts
value$.pipe(
  startWith(0),
  pairwise(),
  map(([prev, curr]) => curr - prev) // дельта, включая первую
);
\`\`\`

**Gotcha**: \`startWith\` эмитит синхронно на подписку — учитывайте при \`take(1)\`/тестах, чтобы не «съесть» именно стартовое значение по ошибке.`,
      en: `## pairwise

\`pairwise()\` emits a **pair** \`[previous, current]\` of the two latest values. The source's first value is not emitted on its own — it becomes the "previous" for the second.

\`\`\`
source:   a--b--c--d|
pairwise: ---[a,b]-[b,c]-[c,d]|
\`\`\`

Scenarios:

- **Delta/direction**: compare new vs old (scroll up/down, value rising/falling).
- **Transition animation** between previous and current state.

\`\`\`ts
scrollY$.pipe(
  pairwise(),
  map(([prev, curr]) => curr > prev ? 'down' : 'up'),
  distinctUntilChanged()
);
\`\`\`

## startWith

\`startWith(...values)\` **synchronously** emits the given values **before** the source produces its first. The result type widens to a union.

Scenarios:

- **Initial state** of the UI before data arrives (loading flag, form default).
- "Prime" pairwise/scan with a first value to get a pair on the very first emission.
- Ensure \`combineLatest\` emits immediately (give each source a starting value).

\`\`\`ts
filters$.pipe(
  startWith(DEFAULT_FILTERS), // combineLatest starts immediately
);
\`\`\`

## Combination

\`startWith\` + \`pairwise\` is a common duo: the starting value provides the "previous" for the very first real value.

\`\`\`ts
value$.pipe(
  startWith(0),
  pairwise(),
  map(([prev, curr]) => curr - prev) // delta, including the first
);
\`\`\`

**Gotcha**: \`startWith\` emits synchronously on subscribe — keep that in mind with \`take(1)\`/tests so you do not accidentally "consume" the starting value.`
    }
  },
  {
    id: 'rxjs-042',
    category: 'rxjs-state',
    level: 'Medium',
    tags: ['delay', 'delaywhen', 'timing'],
    question: {
      ru: 'Чем delay отличается от delayWhen? Как реализовать переменную задержку?',
      en: 'How does delay differ from delayWhen? How do you implement a variable delay?'
    },
    answer: {
      ru: `## delay

\`delay(ms | Date)\` сдвигает **все** уведомления (кроме \`complete\` в некоторых трактовках — \`next\` и \`error\` точно) на фиксированное время. Это «сдвиг по оси времени» с **одинаковой** задержкой для каждого значения.

\`\`\`
source: a-b--c|
delay:  --a-b--c|   (каждое на +N)
\`\`\`

Применение: имитация сети в тестах/демо, искусственная пауза перед показом.

## delayWhen

\`delayWhen(durationSelector)\` задерживает каждое значение на **индивидуальное** время — селектор возвращает Observable, и значение эмитится, когда этот Observable **впервые эмитит**.

\`\`\`ts
source$.pipe(
  delayWhen((value) => timer(value.priority * 100))
);
\`\`\`

Это позволяет задержку, **зависящую от значения** или от внешнего сигнала.

## Переменная задержка и сигналы

- Задержка до внешнего события: \`delayWhen(() => ready$)\` — придержать значения, пока \`ready$\` не эмитит.
- Экспоненциальная задержка по индексу: комбинируйте с \`scan\`/индексом.

\`\`\`ts
emails$.pipe(
  concatMap((email, i) =>
    of(email).pipe(delay(i * 200)) // ступенчатая рассылка
  )
);
\`\`\`

## Gotchas

- \`delay\` использует \`asyncScheduler\` — это **макротаски**, поэтому в синхронных marble-тестах задержка важна.
- \`delay\` буферизует значения во время задержки; на быстром бесконечном источнике буфер может расти.
- \`delayWhen\` с источником, который никогда не эмитит, **навсегда** задержит значение — нужен таймаут/завершение.
- \`delay\` **не** сдвигает момент подписки, только доставку значений; для отложенной подписки используйте \`subscribeOn\`/\`timer + switchMap\`.`,
      en: `## delay

\`delay(ms | Date)\` shifts **all** notifications (\`next\` and \`error\` for sure) by a fixed time. It is a "shift along the time axis" with the **same** delay for every value.

\`\`\`
source: a-b--c|
delay:  --a-b--c|   (each by +N)
\`\`\`

Use: simulating the network in tests/demos, an artificial pause before showing something.

## delayWhen

\`delayWhen(durationSelector)\` delays each value by an **individual** amount — the selector returns an Observable, and the value is emitted when that Observable **first emits**.

\`\`\`ts
source$.pipe(
  delayWhen((value) => timer(value.priority * 100))
);
\`\`\`

This enables a delay that **depends on the value** or on an external signal.

## Variable delay and signals

- Delay until an external event: \`delayWhen(() => ready$)\` — hold values until \`ready$\` emits.
- Exponential delay by index: combine with \`scan\`/index.

\`\`\`ts
emails$.pipe(
  concatMap((email, i) =>
    of(email).pipe(delay(i * 200)) // staggered sending
  )
);
\`\`\`

## Gotchas

- \`delay\` uses the \`asyncScheduler\` — these are **macrotasks**, so the delay matters in synchronous marble tests.
- \`delay\` buffers values during the delay; on a fast infinite source the buffer can grow.
- \`delayWhen\` with a source that never emits will delay the value **forever** — you need a timeout/completion.
- \`delay\` does **not** shift the subscription moment, only delivery; for a deferred subscription use \`subscribeOn\`/\`timer + switchMap\`.`
    }
  },
  {
    id: 'rxjs-043',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['repeat', 'repeatwhen', 'polling'],
    question: {
      ru: 'Как работают repeat и repeatWhen? Как реализовать polling и чем repeat отличается от retry?',
      en: 'How do repeat and repeatWhen work? How do you implement polling, and how does repeat differ from retry?'
    },
    answer: {
      ru: `## repeat vs retry

Оба **переподписываются** на источник, но по разному триггеру:

- \`retry\` переподписывается на **error** (восстановление после сбоя).
- \`repeat\` переподписывается на **complete** (повтор успешного потока).

\`\`\`
source: --a--b--|   (complete)
repeat(2): --a--b----a--b--|
\`\`\`

## repeat

\`repeat(count?)\` повторяет источник \`count\` раз после каждого \`complete\`. Без аргумента — бесконечно. В RxJS 7.3+: \`repeat({ count, delay })\` — с паузой между повторами:

\`\`\`ts
api.poll().pipe(
  repeat({ delay: 5000 }) // polling каждые 5с после ответа
);
\`\`\`

## repeatWhen (устаревает)

\`repeatWhen(notifier => ...)\` принимает поток сигналов «complete» и решает, когда повторить, эмитя в возвращаемый Observable. Сложен; вытесняется \`repeat({ delay })\`. Был полезен для повтора по внешнему сигналу:

\`\`\`ts
data$.pipe(
  repeatWhen((completes$) => refreshClicks$) // повтор по кнопке
);
\`\`\`

## Polling: два подхода

\`\`\`ts
// 1. timer + switchMap (всегда фиксированный интервал)
timer(0, 5000).pipe(switchMap(() => api.load()));

// 2. repeat с delay (интервал ОТ момента ответа, без наложения)
defer(() => api.load()).pipe(repeat({ delay: 5000 }));
\`\`\`

Разница: вариант 1 тикает по абсолютному времени (может наложиться, если запрос дольше интервала — \`switchMap\` отменит прошлый); вариант 2 ждёт завершения и потом паузу — нет наложений.

## Gotchas

- \`repeat\` повторяет **побочные эффекты** источника (новый запрос каждый раз).
- Для остановки polling — \`takeUntil(stop$)\` или \`takeWhile\`.
- \`repeat\` на источнике, который **никогда** не завершается, бессмыслен — повтор не наступит.`,
      en: `## repeat vs retry

Both **resubscribe** to the source, but on different triggers:

- \`retry\` resubscribes on **error** (recovery from failure).
- \`repeat\` resubscribes on **complete** (repeating a successful stream).

\`\`\`
source: --a--b--|   (complete)
repeat(2): --a--b----a--b--|
\`\`\`

## repeat

\`repeat(count?)\` repeats the source \`count\` times after each \`complete\`. Without an argument — infinitely. In RxJS 7.3+: \`repeat({ count, delay })\` — with a pause between repeats:

\`\`\`ts
api.poll().pipe(
  repeat({ delay: 5000 }) // poll every 5s after the response
);
\`\`\`

## repeatWhen (being deprecated)

\`repeatWhen(notifier => ...)\` takes a stream of "complete" signals and decides when to repeat by emitting into the returned Observable. Complex; superseded by \`repeat({ delay })\`. It was useful for repeating on an external signal:

\`\`\`ts
data$.pipe(
  repeatWhen((completes$) => refreshClicks$) // repeat on a button
);
\`\`\`

## Polling: two approaches

\`\`\`ts
// 1. timer + switchMap (always a fixed interval)
timer(0, 5000).pipe(switchMap(() => api.load()));

// 2. repeat with delay (interval FROM the response, no overlap)
defer(() => api.load()).pipe(repeat({ delay: 5000 }));
\`\`\`

The difference: option 1 ticks on absolute time (it can overlap if a request is slower than the interval — \`switchMap\` cancels the previous); option 2 waits for completion then pauses — no overlaps.

## Gotchas

- \`repeat\` repeats the source's **side effects** (a fresh request each time).
- To stop polling — \`takeUntil(stop$)\` or \`takeWhile\`.
- \`repeat\` on a source that **never** completes is pointless — the repeat never happens.`
    }
  },
  {
    id: 'rxjs-044',
    category: 'rxjs-state',
    level: 'Medium',
    tags: ['timeout', 'defaultifempty', 'throwifempty'],
    question: {
      ru: 'Для чего нужны timeout, throwIfEmpty и defaultIfEmpty? Покажите их применение.',
      en: 'What are timeout, throwIfEmpty, and defaultIfEmpty for? Show their usage.'
    },
    answer: {
      ru: `## timeout

\`timeout({ each, first, with })\` бросает \`TimeoutError\` (или переключается на запасной поток), если источник **не эмитит** в отведённое время.

- \`first\` — дедлайн на **первое** значение.
- \`each\` — дедлайн между **соседними** значениями.
- \`with\` — фабрика запасного Observable вместо ошибки.

\`\`\`ts
api.load().pipe(
  timeout({ first: 5000, with: () => of(CACHED) })
);
\`\`\`

Применение: ограничить ожидание ответа, fallback на кэш, защита от «зависших» потоков.

## defaultIfEmpty

\`defaultIfEmpty(value)\` эмитит \`value\`, если источник **завершился без единого** \`next\`. Защищает downstream-логику, которой нужно хотя бы одно значение.

\`\`\`ts
filteredItems$.pipe(
  filter((x) => x.active),
  defaultIfEmpty([] as Item[]) // пустой результат вместо «ничего»
);
\`\`\`

## throwIfEmpty

\`throwIfEmpty(errorFactory?)\` наоборот — **бросает** ошибку, если источник завершился без значений. Полезно, когда «пусто» — это ошибочная ситуация:

\`\`\`ts
findUser(id).pipe(
  throwIfEmpty(() => new NotFoundError(id))
);
\`\`\`

## Сравнение и gotchas

- \`defaultIfEmpty\` и \`throwIfEmpty\` срабатывают **только при complete без next** — на бесконечном источнике никогда не выстрелят.
- \`timeout\` отсчёт ведёт по \`asyncScheduler\`; при бесконечном медленном потоке именно \`each\` ловит «зависания».
- Частый паттерн: \`first()\` бросает \`EmptyError\` на пустом потоке — это поведение по сути встроенный \`throwIfEmpty\`. Если пустота допустима, используйте \`first(predicate, defaultValue)\` или \`take(1)\`.
- \`timeout\` с \`with\` отлично сочетается с \`retry\` для устойчивого сетевого слоя.`,
      en: `## timeout

\`timeout({ each, first, with })\` throws a \`TimeoutError\` (or switches to a fallback stream) if the source does **not emit** within the allotted time.

- \`first\` — deadline for the **first** value.
- \`each\` — deadline between **consecutive** values.
- \`with\` — a factory for a fallback Observable instead of an error.

\`\`\`ts
api.load().pipe(
  timeout({ first: 5000, with: () => of(CACHED) })
);
\`\`\`

Use: cap how long you wait for a response, fall back to cache, guard against "stuck" streams.

## defaultIfEmpty

\`defaultIfEmpty(value)\` emits \`value\` if the source **completes without any** \`next\`. It protects downstream logic that needs at least one value.

\`\`\`ts
filteredItems$.pipe(
  filter((x) => x.active),
  defaultIfEmpty([] as Item[]) // empty result instead of "nothing"
);
\`\`\`

## throwIfEmpty

\`throwIfEmpty(errorFactory?)\` is the opposite — it **throws** if the source completes with no values. Useful when "empty" is an error condition:

\`\`\`ts
findUser(id).pipe(
  throwIfEmpty(() => new NotFoundError(id))
);
\`\`\`

## Comparison and gotchas

- \`defaultIfEmpty\` and \`throwIfEmpty\` fire **only on complete-without-next** — on an infinite source they never fire.
- \`timeout\` counts on the \`asyncScheduler\`; on an infinite slow stream it is \`each\` that catches "hangs".
- Common pattern: \`first()\` throws an \`EmptyError\` on an empty stream — that behavior is essentially a built-in \`throwIfEmpty\`. If emptiness is acceptable, use \`first(predicate, defaultValue)\` or \`take(1)\`.
- \`timeout\` with \`with\` pairs nicely with \`retry\` for a resilient network layer.`
    }
  },
  {
    id: 'rxjs-045',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['defer', 'iif', 'cold'],
    question: {
      ru: 'Зачем нужны defer и iif? Как defer гарантирует «свежесть» и cold-поведение на каждого подписчика?',
      en: 'What are defer and iif for? How does defer guarantee "freshness" and per-subscriber cold behavior?'
    },
    answer: {
      ru: `## defer

\`defer(factory)\` откладывает создание Observable до момента **подписки** и вызывает \`factory\` **на каждого** подписчика заново. Это превращает «жадно вычисленный» источник в по-настоящему **cold**.

\`\`\`ts
// БЕЗ defer: Date.now() вычислится один раз, при создании
const bad$ = of(Date.now());
// С defer: вычисляется на каждую подписку
const good$ = defer(() => of(Date.now()));
\`\`\`

Зачем:

- **Свежесть**: значение/запрос формируется в момент подписки (актуальный токен, текущее время, актуальный стейт).
- **Лень**: побочный эффект (например, чтение из \`localStorage\`) не выполнится, пока не подпишутся.
- Промисы: \`defer(() => fetch(...))\` создаёт новый промис на подписку, поэтому \`retry\` реально повторяет запрос (промис cold-ится).

## iif

\`iif(condition, trueSource, falseSource)\` выбирает один из двух источников по предикату, вычисляемому **при подписке**. По сути сахар над \`defer\`:

\`\`\`ts
iif(() => isLoggedIn(), userData$, of(GUEST));
// эквивалент
defer(() => isLoggedIn() ? userData$ : of(GUEST));
\`\`\`

## Gotchas

- Условие в \`iif\` вычисляется **один раз на подписку**, не реактивно — оно не «следит» за изменением \`isLoggedIn()\`. Для реактивного выбора используйте \`switchMap\` от потока-условия.
- \`iif\` оба аргумента-источника **уже существуют** как Observable (ленивы сами по себе), но если их **создание** имеет побочный эффект, оберните в \`defer\`.
- \`defer\` — ключевой приём для тестируемости и корректного \`retry\`/\`repeat\`: каждая переподписка получает свежую фабрику.`,
      en: `## defer

\`defer(factory)\` postpones creating the Observable until **subscription** and calls \`factory\` **per subscriber** anew. This turns an "eagerly computed" source into a truly **cold** one.

\`\`\`ts
// WITHOUT defer: Date.now() is computed once, at creation
const bad$ = of(Date.now());
// WITH defer: computed on each subscription
const good$ = defer(() => of(Date.now()));
\`\`\`

Why:

- **Freshness**: the value/request is formed at subscription time (a current token, current time, current state).
- **Laziness**: a side effect (e.g. reading \`localStorage\`) does not run until someone subscribes.
- Promises: \`defer(() => fetch(...))\` creates a new promise per subscription, so \`retry\` actually repeats the request (the promise is "cold-ified").

## iif

\`iif(condition, trueSource, falseSource)\` picks one of two sources by a predicate evaluated **at subscription**. It is essentially sugar over \`defer\`:

\`\`\`ts
iif(() => isLoggedIn(), userData$, of(GUEST));
// equivalent to
defer(() => isLoggedIn() ? userData$ : of(GUEST));
\`\`\`

## Gotchas

- The condition in \`iif\` is evaluated **once per subscription**, not reactively — it does not "watch" \`isLoggedIn()\` changing. For a reactive choice use \`switchMap\` over a condition stream.
- \`iif\`'s two source arguments **already exist** as Observables (lazy themselves), but if their **creation** has a side effect, wrap them in \`defer\`.
- \`defer\` is a key trick for testability and correct \`retry\`/\`repeat\`: each resubscription gets a fresh factory.`
    },
    codeSnippet: `// Fresh auth token on every (re)subscription and retry
const authedRequest$ = defer(() => {
  const token = tokenStore.getCurrent(); // read at subscribe time
  return http.get('/api/me', { headers: { Authorization: token } });
}).pipe(
  retry({ count: 2, delay: 1000 }) // each retry re-reads the token
);`
  },
  {
    id: 'rxjs-046',
    category: 'rxjs-state',
    level: 'Medium',
    tags: ['race', 'fromevent', 'fromfetch'],
    question: {
      ru: 'Что делает race? Как работают fromEvent и fromFetch и в чём их отличия от ручных оберток?',
      en: 'What does race do? How do fromEvent and fromFetch work and how do they differ from manual wrappers?'
    },
    answer: {
      ru: `## race

\`race(...sources)\` подписывается на все источники и оставляет **только тот, что эмитнул первым**, отписываясь от остальных. «Кто первый — тот и победил».

\`\`\`ts
race(
  api.fromCache(),           // быстрый кэш
  api.fromNetwork()          // медленная сеть
).subscribe(render);         // отрисуем самый быстрый источник
\`\`\`

Применение: первый ответ из нескольких реплик, таймаут через \`race(work$, timer(5000).pipe(map(() => throwError(...))))\`.

## fromEvent

\`fromEvent(target, name)\` оборачивает DOM/EventEmitter API в Observable. Под капотом он сам вызывает \`addEventListener\` при подписке и \`removeEventListener\` в teardown — это и есть его преимущество над ручным \`new Observable\`: корректная установка/снятие слушателя, поддержка опций (\`{ passive, capture }\`) и multicast-семантика самого DOM-события (hot).

\`\`\`ts
fromEvent<MouseEvent>(window, 'resize').pipe(
  debounceTime(100)
);
\`\`\`

## fromFetch

\`fromFetch(url, init)\` (из \`rxjs/fetch\`) оборачивает \`fetch\` так, что при **unsubscribe** запрос **отменяется** через \`AbortController\` — чего «голый» \`from(fetch(...))\` не делает. Возвращает \`Response\`; тело читаете сами (\`switchMap(r => r.json())\`).

\`\`\`ts
fromFetch('/api/data').pipe(
  switchMap((res) => res.ok ? res.json() : throwError(() => res)),
);
\`\`\`

## Отличия от ручных оберток

- \`fromEvent\`/\`fromFetch\` **управляют ресурсом**: ставят и снимают слушатель/отменяют запрос автоматически.
- \`from(promise)\` **не отменяется** — промис нельзя отозвать; \`fromFetch\` решает это через abort.
- \`race\` чистит проигравшие подписки — не нужно вручную отписываться.

**Gotcha**: \`race\` решает по **первой эмиссии**, а не по завершению — источник, эмитнувший раньше, побеждает, даже если выдаст ошибку.`,
      en: `## race

\`race(...sources)\` subscribes to all sources and keeps **only the one that emits first**, unsubscribing from the rest. "First to emit wins".

\`\`\`ts
race(
  api.fromCache(),           // fast cache
  api.fromNetwork()          // slow network
).subscribe(render);         // render the fastest source
\`\`\`

Use: first response among replicas; a timeout via \`race(work$, timer(5000).pipe(map(() => throwError(...))))\`.

## fromEvent

\`fromEvent(target, name)\` wraps a DOM/EventEmitter API into an Observable. Under the hood it calls \`addEventListener\` on subscribe and \`removeEventListener\` in teardown — that is its edge over a manual \`new Observable\`: correct listener setup/removal, support for options (\`{ passive, capture }\`), and the hot multicast semantics of the DOM event itself.

\`\`\`ts
fromEvent<MouseEvent>(window, 'resize').pipe(
  debounceTime(100)
);
\`\`\`

## fromFetch

\`fromFetch(url, init)\` (from \`rxjs/fetch\`) wraps \`fetch\` so that on **unsubscribe** the request is **aborted** via \`AbortController\` — something a bare \`from(fetch(...))\` does not do. It yields a \`Response\`; you read the body yourself (\`switchMap(r => r.json())\`).

\`\`\`ts
fromFetch('/api/data').pipe(
  switchMap((res) => res.ok ? res.json() : throwError(() => res)),
);
\`\`\`

## Differences from manual wrappers

- \`fromEvent\`/\`fromFetch\` **manage the resource**: add/remove the listener, cancel the request automatically.
- \`from(promise)\` is **not cancellable** — a promise cannot be revoked; \`fromFetch\` solves this via abort.
- \`race\` cleans up the losing subscriptions — no manual unsubscription needed.

**Gotcha**: \`race\` decides by the **first emission**, not by completion — the source that emits first wins even if it then errors.`
    }
  },
  {
    id: 'rxjs-047',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['subscription', 'teardown', 'composition'],
    question: {
      ru: 'Как устроена композиция Subscription (add/remove/unsubscribe)? Какие есть gotchas?',
      en: 'How does Subscription composition (add/remove/unsubscribe) work? What are the gotchas?'
    },
    answer: {
      ru: `## Subscription как контейнер

\`Subscription\` — это не только «то, что возвращает subscribe», но и **контейнер для других подписок и teardown-функций**. Методы:

- \`add(teardown)\` — добавить дочернюю подписку или функцию очистки.
- \`remove(sub)\` — открепить дочернюю (без вызова teardown).
- \`unsubscribe()\` — закрыть **эту** подписку и **рекурсивно** все добавленные.

\`\`\`ts
const sub = new Subscription();
sub.add(stream1$.subscribe());
sub.add(stream2$.subscribe());
sub.add(() => console.log('custom cleanup'));
// одним вызовом снимаем всё
sub.unsubscribe();
\`\`\`

## Под капотом pipe

Оператор внутри строит дерево подписок: внешний subscriber делает \`add\` для внутреннего. Поэтому \`unsubscribe\` родителя каскадно закрывает всю цепочку операторов — это и есть механизм распространения teardown.

## Gotchas

- **add после unsubscribe**: если контейнер уже закрыт, \`add(child)\` **немедленно** вызовет teardown ребёнка. Это защита, но может удивить (подписка «умрёт» сразу).
- **closed-флаг**: у \`Subscription\` есть \`closed\`; повторный \`unsubscribe()\` идемпотентен.
- **remove не отписывает**: \`remove\` лишь убирает из списка, ресурс надо закрыть самому. Полезно для «переезда» подписки в другой контейнер.
- **Ошибки в teardown**: если несколько финализаторов бросают, RxJS собирает их в \`UnsubscriptionError\` (агрегат), не теряя остальные очистки.
- Современная альтернатива ручной композиции — \`takeUntilDestroyed\`/\`DestroyRef\`; но \`Subscription.add\` остаётся удобным, когда подписок много и они создаются императивно (например, в директивах).`,
      en: `## Subscription as a container

A \`Subscription\` is not just "what subscribe returns" but also a **container for other subscriptions and teardown functions**. Methods:

- \`add(teardown)\` — add a child subscription or cleanup function.
- \`remove(sub)\` — detach a child (without running its teardown).
- \`unsubscribe()\` — close **this** subscription and **recursively** everything added.

\`\`\`ts
const sub = new Subscription();
sub.add(stream1$.subscribe());
sub.add(stream2$.subscribe());
sub.add(() => console.log('custom cleanup'));
// tear down everything in one call
sub.unsubscribe();
\`\`\`

## Under the hood of pipe

An operator builds a tree of subscriptions internally: the outer subscriber \`add\`s the inner one. So \`unsubscribe\` on the parent cascades to close the whole operator chain — that is the teardown-propagation mechanism.

## Gotchas

- **add after unsubscribe**: if the container is already closed, \`add(child)\` **immediately** runs the child's teardown. It is a safeguard but can surprise you (the subscription "dies" at once).
- **closed flag**: \`Subscription\` has \`closed\`; a repeated \`unsubscribe()\` is idempotent.
- **remove does not unsubscribe**: \`remove\` only takes it off the list; you must close the resource yourself. Useful for "moving" a subscription to another container.
- **errors in teardown**: if several finalizers throw, RxJS collects them into an \`UnsubscriptionError\` (aggregate), not losing the other cleanups.
- The modern alternative to manual composition is \`takeUntilDestroyed\`/\`DestroyRef\`; but \`Subscription.add\` stays handy when there are many subscriptions created imperatively (e.g. in directives).`
    }
  },
  {
    id: 'rxjs-048',
    category: 'rxjs-state',
    level: 'Expert',
    tags: ['connectable', 'connect', 'multicasting'],
    question: {
      ru: 'Как работают connectable, connect() и оператор connect? Чем они заменили publish/multicast?',
      en: 'How do connectable, connect(), and the connect operator work? What did they replace from publish/multicast?'
    },
    answer: {
      ru: `## Проблема, которую решают

Иногда нужно **разветвить** один источник на несколько веток обработки, но при этом источник должен выполниться **ровно один раз**. Наивный \`combineLatest(a$.pipe(...), a$.pipe(...))\` подпишется на \`a$\` дважды.

## Устаревшее: publish/multicast/refCount

Старый API (\`multicast(subjectFactory)\`, \`publish()\`, \`publishReplay()\`, \`refCount()\`, \`ConnectableObservable\`) был мощным, но запутанным: разделение «подключения» и «подписки» через \`.connect()\` легко вело к ошибкам жизненного цикла. В RxJS 7 он помечен deprecated.

## connectable()

\`connectable(source, { connector, resetOnDisconnect })\` создаёт \`Connectable\` — Observable, который мультикастит источник через переданный \`Subject\`, но **не запускает** его, пока вы не вызовете \`.connect()\`.

\`\`\`ts
const shared = connectable(source$, {
  connector: () => new ReplaySubject(1)
});
shared.subscribe(a); // ещё не запущен
shared.subscribe(b);
const conn = shared.connect(); // теперь источник стартует один раз
// ...
conn.unsubscribe(); // остановить источник
\`\`\`

## Оператор connect()

\`connect(selector)\` — для **локального** разветвления внутри одного pipe: источник мультикастится, а \`selector\` получает shared-поток и строит из него несколько веток:

\`\`\`ts
source$.pipe(
  connect((shared$) => merge(
    shared$.pipe(filter(isA), map(toA)),
    shared$.pipe(filter(isB), map(toB))
  ))
);
\`\`\`

Источник выполнится один раз, обе ветки получат значения.

## Кратко

- Просто «поделить hot» → \`share()\`/\`shareReplay()\`.
- Ручной контроль старта → \`connectable()\` + \`.connect()\`.
- Локальный fan-out внутри pipe → оператор \`connect()\`.
- \`multicast\`/\`publish\`/\`refCount\` — legacy, не используйте в новом коде.`,
      en: `## The problem they solve

Sometimes you need to **fan out** one source into several processing branches while the source runs **exactly once**. A naive \`combineLatest(a$.pipe(...), a$.pipe(...))\` subscribes to \`a$\` twice.

## Deprecated: publish/multicast/refCount

The old API (\`multicast(subjectFactory)\`, \`publish()\`, \`publishReplay()\`, \`refCount()\`, \`ConnectableObservable\`) was powerful but confusing: separating "connection" from "subscription" via \`.connect()\` easily led to lifecycle bugs. In RxJS 7 it is deprecated.

## connectable()

\`connectable(source, { connector, resetOnDisconnect })\` creates a \`Connectable\` — an Observable that multicasts the source through the given \`Subject\` but **does not start** it until you call \`.connect()\`.

\`\`\`ts
const shared = connectable(source$, {
  connector: () => new ReplaySubject(1)
});
shared.subscribe(a); // not started yet
shared.subscribe(b);
const conn = shared.connect(); // now the source starts once
// ...
conn.unsubscribe(); // stop the source
\`\`\`

## The connect() operator

\`connect(selector)\` is for **local** fan-out within a single pipe: the source is multicast and the \`selector\` receives the shared stream to build several branches from it:

\`\`\`ts
source$.pipe(
  connect((shared$) => merge(
    shared$.pipe(filter(isA), map(toA)),
    shared$.pipe(filter(isB), map(toB))
  ))
);
\`\`\`

The source runs once and both branches get values.

## In brief

- Just "share hot" → \`share()\`/\`shareReplay()\`.
- Manual control of the start → \`connectable()\` + \`.connect()\`.
- Local fan-out within a pipe → the \`connect()\` operator.
- \`multicast\`/\`publish\`/\`refCount\` — legacy, avoid in new code.`
    }
  },
  {
    id: 'rxjs-049',
    category: 'rxjs-state',
    level: 'Expert',
    tags: ['ngrx', 'meta-reducers', 'runtime-checks'],
    question: {
      ru: 'Что такое meta-reducers и runtime checks в NgRx? Для чего они нужны?',
      en: 'What are meta-reducers and runtime checks in NgRx? What are they for?'
    },
    answer: {
      ru: `## Meta-reducer

Meta-reducer — это **reducer более высокого порядка**: функция \`(reducer) => reducer\`. Она оборачивает корневой reducer, перехватывая **каждый** action и состояние **до/после** обычной редукции. По сути — middleware для Redux-цикла.

\`\`\`ts
function logger(reducer: ActionReducer<State>): ActionReducer<State> {
  return (state, action) => {
    const next = reducer(state, action);
    console.log(action.type, { prev: state, next });
    return next;
  };
}

export const metaReducers: MetaReducer<State>[] = [logger];
\`\`\`

Типичные применения:

- **Логирование** action/state diff.
- **Hydration**: восстановление состояния из \`localStorage\` при старте и сохранение на каждое изменение.
- **Reset state** на \`logout\` — обнулить всё дерево.
- Undo/redo, перехват для аналитики.

## Runtime checks

NgRx в dev-режиме включает проверки целостности (\`runtimeChecks\`), реализованные как встроенные meta-reducers:

- \`strictStateImmutability\` — **замораживает** state, ловит мутации (изменение state напрямую вместо возврата нового).
- \`strictActionImmutability\` — заморозка action.
- \`strictStateSerializability\` — state должен быть сериализуем (нет \`Date\`/\`Map\`/функций).
- \`strictActionSerializability\` — то же для action.
- \`strictActionWithinNgZone\` — action должен диспатчиться внутри Angular zone.
- \`strictActionTypeUniqueness\` — уникальность типов action.

\`\`\`ts
StoreModule.forRoot(reducers, {
  runtimeChecks: {
    strictStateImmutability: true,
    strictActionImmutability: true,
    strictStateSerializability: true,
    strictActionSerializability: true,
  }
});
\`\`\`

## Gotchas

- Сериализуемость иногда отключают осознанно (если в state лежат непримитивы), но это против духа Redux.
- Проверки активны только в dev (заморозка дорогая) — в prod их отключают для производительности.
- Meta-reducers выполняются в порядке массива и оборачивают reducer «снаружи внутрь».`,
      en: `## Meta-reducer

A meta-reducer is a **higher-order reducer**: a function \`(reducer) => reducer\`. It wraps the root reducer, intercepting **every** action and state **before/after** the normal reduction. Essentially middleware for the Redux cycle.

\`\`\`ts
function logger(reducer: ActionReducer<State>): ActionReducer<State> {
  return (state, action) => {
    const next = reducer(state, action);
    console.log(action.type, { prev: state, next });
    return next;
  };
}

export const metaReducers: MetaReducer<State>[] = [logger];
\`\`\`

Typical uses:

- **Logging** action/state diffs.
- **Hydration**: restore state from \`localStorage\` at start and save on each change.
- **Reset state** on \`logout\` — clear the whole tree.
- Undo/redo, interception for analytics.

## Runtime checks

In dev mode NgRx enables integrity checks (\`runtimeChecks\`), implemented as built-in meta-reducers:

- \`strictStateImmutability\` — **freezes** state, catching mutations (changing state directly instead of returning a new one).
- \`strictActionImmutability\` — freezes actions.
- \`strictStateSerializability\` — state must be serializable (no \`Date\`/\`Map\`/functions).
- \`strictActionSerializability\` — same for actions.
- \`strictActionWithinNgZone\` — actions must be dispatched inside the Angular zone.
- \`strictActionTypeUniqueness\` — uniqueness of action types.

\`\`\`ts
StoreModule.forRoot(reducers, {
  runtimeChecks: {
    strictStateImmutability: true,
    strictActionImmutability: true,
    strictStateSerializability: true,
    strictActionSerializability: true,
  }
});
\`\`\`

## Gotchas

- Serializability is sometimes disabled deliberately (if state holds non-primitives), but it goes against the Redux spirit.
- Checks are active only in dev (freezing is expensive) — in prod they are off for performance.
- Meta-reducers run in array order and wrap the reducer "outside-in".`
    }
  },
  {
    id: 'rxjs-050',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['ngrx', 'component-store', 'local-state'],
    question: {
      ru: 'Что такое NgRx ComponentStore и когда выбирать его вместо глобального Store?',
      en: 'What is NgRx ComponentStore and when do you choose it over the global Store?'
    },
    answer: {
      ru: `## Идея ComponentStore

\`@ngrx/component-store\` — это **локальный**, привязанный к жизненному циклу компонента reactive-store без Redux-церемоний (нет actions/reducers/effects/глобального dispatch). Он расширяет \`ComponentStore<State>\` и предоставляет три примитива:

- **updater** — синхронное обновление состояния (аналог reducer): \`(state, value) => newState\`.
- **selector** — производный поток через \`this.select(...)\` (мемоизированный, distinct).
- **effect** — приём **Observable** входных данных и запуск side-effect (обычно \`switchMap\` к API), безопасно подписанный на жизнь компонента.

\`\`\`ts
@Injectable()
export class TodosStore extends ComponentStore<TodoState> {
  constructor(private api: Api) { super({ todos: [], loading: false }); }

  readonly todos$ = this.select((s) => s.todos);

  readonly addTodo = this.updater((s, t: Todo) => ({
    ...s, todos: [...s.todos, t]
  }));

  readonly load = this.effect((trigger$: Observable<void>) =>
    trigger$.pipe(
      tap(() => this.patchState({ loading: true })),
      switchMap(() => this.api.list().pipe(
        tapResponse(
          (todos) => this.patchState({ todos, loading: false }),
          (err) => this.patchState({ loading: false })
        )
      ))
    )
  );
}
\`\`\`

## Когда ComponentStore vs глобальный Store

**ComponentStore**:

- Состояние **локально** для фичи/компонента, не нужно другим частям приложения.
- Не нужен time-travel/Redux DevTools на этот срез.
- Хочется меньше boilerplate, но больше структуры, чем у голого \`BehaviorSubject\`.
- Состояние умирает вместе с компонентом (предоставляется в \`providers\` компонента).

**Глобальный Store**:

- Состояние **разделяется** многими фичами, нужен единый источник истины.
- Нужны DevTools, meta-reducers, эффекты на уровне приложения.

## Gotchas

- \`ComponentStore\` обычно регистрируют в \`providers\` компонента — тогда он уничтожается с ним; в корне он станет синглтоном.
- \`tapResponse\` важен: ошибка в effect **не должна** убить внутренний поток (см. правило обработки ошибок в effects).
- \`effect\` возвращает функцию: можно вызвать без аргумента (\`this.load()\`) или передать \`Observable\` входов.`,
      en: `## The ComponentStore idea

\`@ngrx/component-store\` is a **local**, component-lifecycle-bound reactive store without Redux ceremony (no actions/reducers/effects/global dispatch). You extend \`ComponentStore<State>\` and get three primitives:

- **updater** — synchronous state update (reducer-like): \`(state, value) => newState\`.
- **selector** — a derived stream via \`this.select(...)\` (memoized, distinct).
- **effect** — takes an **Observable** of inputs and runs a side-effect (usually \`switchMap\` to an API), safely subscribed to the component's life.

\`\`\`ts
@Injectable()
export class TodosStore extends ComponentStore<TodoState> {
  constructor(private api: Api) { super({ todos: [], loading: false }); }

  readonly todos$ = this.select((s) => s.todos);

  readonly addTodo = this.updater((s, t: Todo) => ({
    ...s, todos: [...s.todos, t]
  }));

  readonly load = this.effect((trigger$: Observable<void>) =>
    trigger$.pipe(
      tap(() => this.patchState({ loading: true })),
      switchMap(() => this.api.list().pipe(
        tapResponse(
          (todos) => this.patchState({ todos, loading: false }),
          (err) => this.patchState({ loading: false })
        )
      ))
    )
  );
}
\`\`\`

## When ComponentStore vs global Store

**ComponentStore**:

- State is **local** to a feature/component, not needed elsewhere.
- No need for time-travel/Redux DevTools on this slice.
- You want less boilerplate but more structure than a bare \`BehaviorSubject\`.
- State dies with the component (provided in the component's \`providers\`).

**Global Store**:

- State is **shared** across many features, needs a single source of truth.
- You need DevTools, meta-reducers, app-level effects.

## Gotchas

- Register \`ComponentStore\` in the component's \`providers\` — then it is destroyed with it; at the root it becomes a singleton.
- \`tapResponse\` matters: an error in an effect must **not** kill the inner stream (see the effects error-handling rule).
- \`effect\` returns a function: call it with no argument (\`this.load()\`) or pass an \`Observable\` of inputs.`
    }
  },
  {
    id: 'rxjs-051',
    category: 'rxjs-state',
    level: 'Expert',
    tags: ['ngrx', 'effects', 'error-handling'],
    question: {
      ru: 'Почему ошибка в NgRx effect «убивает» поток и как этого избежать? Объясните гигиену actions.',
      en: 'Why does an error in an NgRx effect "kill" the stream and how do you avoid it? Explain action hygiene.'
    },
    answer: {
      ru: `## Почему поток умирает

Effect — это **долгоживущий** Observable: \`actions$.pipe(ofType(...), switchMap(...))\`. Если ошибка дойдёт до **внешнего** потока (\`actions$\`), он получит \`error\` — терминальное событие, и effect **перестанет реагировать** на будущие actions навсегда. Один упавший запрос «глушит» фичу.

## Правило: ловить ошибку ВНУТРИ

\`catchError\` должен стоять **внутри** higher-order оператора (на внутреннем потоке запроса), а не снаружи, и **возвращать action** (например, failure):

\`\`\`ts
load$ = createEffect(() => this.actions$.pipe(
  ofType(loadUsers),
  switchMap(() => this.api.load().pipe(
    map((users) => loadUsersSuccess({ users })),
    catchError((err) => of(loadUsersFailure({ error: err.message })))
    //          ^ ВНУТРИ switchMap — внешний поток жив
  ))
));
\`\`\`

Если поставить \`catchError\` снаружи \`switchMap\`, ошибка убьёт сам effect.

## NgRx как страховка

Даже если вы забыли \`catchError\`, NgRx **автоматически переподписывается** на упавший effect и логирует ошибку — но это лишь сетка безопасности; вы потеряете контекст и пользователь не увидит корректного failure-action. Полагаться на это нельзя.

## Гигиена actions

- **Actions — это события, а не команды**: \`[Users Page] Opened\`, а не \`loadUsers\`. Один источник события → один action; не переиспользуйте action между несвязанными источниками.
- **Success/Failure пары**: каждый async-action имеет явные \`...Success\`/\`...Failure\`, которые обрабатывает reducer.
- Не диспатчите action из самого reducer; не кладите в action несериализуемое.
- \`createEffect(..., { dispatch: false })\` — для эффектов без результирующего action (навигация, тосты), чтобы не зациклить store.

**Gotcha**: при использовании \`exhaustMap\`/\`concatMap\` тоже оборачивайте \`catchError\` внутри — стратегия flattening не влияет на правило защиты внешнего потока.`,
      en: `## Why the stream dies

An effect is a **long-lived** Observable: \`actions$.pipe(ofType(...), switchMap(...))\`. If an error reaches the **outer** stream (\`actions$\`), it receives \`error\` — a terminal event — and the effect **stops reacting** to future actions forever. One failed request "mutes" the feature.

## Rule: catch the error INSIDE

\`catchError\` must sit **inside** the higher-order operator (on the inner request stream), not outside, and **return an action** (e.g. a failure):

\`\`\`ts
load$ = createEffect(() => this.actions$.pipe(
  ofType(loadUsers),
  switchMap(() => this.api.load().pipe(
    map((users) => loadUsersSuccess({ users })),
    catchError((err) => of(loadUsersFailure({ error: err.message })))
    //          ^ INSIDE switchMap — outer stream stays alive
  ))
));
\`\`\`

If you put \`catchError\` outside \`switchMap\`, the error kills the effect itself.

## NgRx as a safety net

Even if you forget \`catchError\`, NgRx **automatically resubscribes** to a failed effect and logs the error — but that is only a safety net; you lose context and the user sees no proper failure action. Do not rely on it.

## Action hygiene

- **Actions are events, not commands**: \`[Users Page] Opened\`, not \`loadUsers\`. One event source → one action; do not reuse an action across unrelated sources.
- **Success/Failure pairs**: each async action has explicit \`...Success\`/\`...Failure\` that the reducer handles.
- Do not dispatch actions from a reducer; do not put non-serializable data into actions.
- \`createEffect(..., { dispatch: false })\` — for effects with no resulting action (navigation, toasts), to avoid looping the store.

**Gotcha**: with \`exhaustMap\`/\`concatMap\` also wrap \`catchError\` inside — the flattening strategy does not change the rule of protecting the outer stream.`
    }
  },
  {
    id: 'rxjs-052',
    category: 'rxjs-state',
    level: 'Expert',
    tags: ['ngrx', 'signal-store', 'rxmethod'],
    question: {
      ru: 'Разберите SignalStore глубже: withComputed, withMethods, withEntities, rxMethod и кастомные features.',
      en: 'Dive deeper into SignalStore: withComputed, withMethods, withEntities, rxMethod, and custom features.'
    },
    answer: {
      ru: `## Композиция через features

\`signalStore(...features)\` собирает store из **функций-фич**, каждая добавляет к стору срез возможностей. Базовые:

- \`withState(initial)\` — описывает реактивное состояние; каждое поле становится \`Signal\` (с **deep signals** — вложенные объекты тоже сигналы).
- \`withComputed(({ x }) => ({ doubled: computed(() => x() * 2) }))\` — производные \`computed\`-сигналы, мемоизированные.
- \`withMethods\` — методы, обновляющие состояние через \`patchState\` или запускающие side-effects (имеют доступ к store и \`inject\`).
- \`withHooks\` — \`onInit\`/\`onDestroy\` лайфхуки.

\`\`\`ts
export const UsersStore = signalStore(
  { providedIn: 'root' },
  withState({ filter: '', loading: false }),
  withEntities<User>(),
  withComputed((store) => ({
    count: computed(() => store.entities().length),
  })),
  withMethods((store, api = inject(Api)) => ({
    setFilter(filter: string) { patchState(store, { filter }); },
    load: rxMethod<void>(pipe(
      tap(() => patchState(store, { loading: true })),
      switchMap(() => api.list().pipe(
        tapResponse({
          next: (users) => patchState(store, setAllEntities(users), { loading: false }),
          error: () => patchState(store, { loading: false }),
        })
      ))
    )),
  }))
);
\`\`\`

## withEntities

\`withEntities<T>()\` добавляет нормализованную коллекцию (\`entityMap\` + \`ids\`) и сигналы \`entities()\`. Обновляется хелперами-апдейтерами: \`setAllEntities\`, \`addEntity\`, \`updateEntity\`, \`removeEntity\` — передаются в \`patchState\`. Можно держать несколько коллекций через \`entityConfig\`/именованные коллекции.

## rxMethod

\`rxMethod<T>(pipeline)\` — мост между **императивным вызовом** и **RxJS**. Возвращает функцию, которую можно вызвать со значением, сигналом или Observable; она прогоняет вход через переданный pipeline и сама управляет подпиской (живёт в DI-контексте store). Идеален для debounced-загрузок, реагирующих на сигнал-фильтр.

## Кастомные features

Любую переиспользуемую логику можно вынести в **свою** feature через \`signalStoreFeature(...)\` — например, \`withLoadingState()\`, \`withPagination()\`, \`withUndoRedo()\`. Она типобезопасно объявляет, какие input-сигналы/методы ожидает и что добавляет. Это ключевое отличие от классического Store: **композиция вместо наследования**.

**Gotchas**: deep signals означают, что \`patchState\` нужен для иммутабельных обновлений; прямой мутации нет. \`rxMethod\` без явного управления отпишется при уничтожении store — не нужно \`takeUntilDestroyed\`.`,
      en: `## Composition via features

\`signalStore(...features)\` assembles a store from **feature functions**, each adding a slice of capability. The basics:

- \`withState(initial)\` — declares reactive state; each field becomes a \`Signal\` (with **deep signals** — nested objects are signals too).
- \`withComputed(({ x }) => ({ doubled: computed(() => x() * 2) }))\` — derived, memoized \`computed\` signals.
- \`withMethods\` — methods that update state via \`patchState\` or run side-effects (with access to the store and \`inject\`).
- \`withHooks\` — \`onInit\`/\`onDestroy\` hooks.

\`\`\`ts
export const UsersStore = signalStore(
  { providedIn: 'root' },
  withState({ filter: '', loading: false }),
  withEntities<User>(),
  withComputed((store) => ({
    count: computed(() => store.entities().length),
  })),
  withMethods((store, api = inject(Api)) => ({
    setFilter(filter: string) { patchState(store, { filter }); },
    load: rxMethod<void>(pipe(
      tap(() => patchState(store, { loading: true })),
      switchMap(() => api.list().pipe(
        tapResponse({
          next: (users) => patchState(store, setAllEntities(users), { loading: false }),
          error: () => patchState(store, { loading: false }),
        })
      ))
    )),
  }))
);
\`\`\`

## withEntities

\`withEntities<T>()\` adds a normalized collection (\`entityMap\` + \`ids\`) and an \`entities()\` signal. Updates go through updater helpers: \`setAllEntities\`, \`addEntity\`, \`updateEntity\`, \`removeEntity\` — passed to \`patchState\`. You can hold several collections via \`entityConfig\`/named collections.

## rxMethod

\`rxMethod<T>(pipeline)\` is the bridge between an **imperative call** and **RxJS**. It returns a function callable with a value, a signal, or an Observable; it runs the input through the given pipeline and manages the subscription itself (lives in the store's DI context). Ideal for debounced loads reacting to a filter signal.

## Custom features

Any reusable logic can be extracted into your **own** feature via \`signalStoreFeature(...)\` — e.g. \`withLoadingState()\`, \`withPagination()\`, \`withUndoRedo()\`. It type-safely declares what input signals/methods it expects and what it adds. This is the key difference from the classic Store: **composition over inheritance**.

**Gotchas**: deep signals mean you need \`patchState\` for immutable updates; there is no direct mutation. \`rxMethod\` without explicit management unsubscribes when the store is destroyed — no \`takeUntilDestroyed\` needed.`
    }
  }
];
