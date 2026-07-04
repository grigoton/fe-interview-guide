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
      ru: `## 🧩 Простыми словами

Представьте, что вы складываете числа в столбик. \`scan\` — это как показывать промежуточную сумму после **каждого** нового числа. \`reduce\` — это дождаться конца и назвать только **итог**. А \`mergeScan\` — то же накопление, но каждый шаг требует **похода в интернет** (асинхронной операции), поэтому шаг возвращает не готовое число, а «обещание» его посчитать.

Все три оператора «накапливают состояние» из потока значений — просто эмитят результат в разные моменты.

### scan — накопление с показом каждого шага

\`scan(accumulator, seed)\` — это «\`reduce\` с промежуточными результатами». Здесь _аккумулятор_ — это функция, которая берёт накопленное значение и новое значение и возвращает новое накопленное. _seed_ — стартовое значение. На **каждое** значение источника \`scan\` вызывает аккумулятор и **сразу эмитит** новый результат.

\`\`\`
source:  --1--2--3--|
scan(+): --1--3--6--|
\`\`\`

Идеален для накопления состояния во времени: счётчики, мини-сторы, агрегация прогресса. Источник может быть бесконечным — \`scan\` всё равно работает, эмитя обновления по мере поступления.

### reduce — накопление с показом только итога

\`reduce\` накапливает точно так же, но **эмитит один раз** — финальный результат **при complete** (когда поток завершится). Если источник не завершается, \`reduce\` **никогда** не эмитит.

\`\`\`
source:  --1--2--3--|
reduce:  -----------6|
\`\`\`

То есть \`reduce\` = \`scan\` + \`last()\` (взять только последнее значение). Применяйте, когда нужен только итог завершённого конечного потока.

### mergeScan — накопление, где каждый шаг асинхронный

\`mergeScan(accumulator, seed, concurrent?)\` отличается тем, что аккумулятор **возвращает Observable** (поток), а не готовое значение. Каждое значение, которое эмитит этот внутренний поток, становится новым аккумулятором и тоже эмитится наружу. Это «\`scan\`, где шаг асинхронный».

\`\`\`ts
actions$.pipe(
  mergeScan((acc, action) =>
    api.apply(acc, action), // -> Observable<State>
  initialState)
);
\`\`\`

Здесь на каждое \`action\` мы отправляем предыдущее состояние \`acc\` на сервер, а новое состояние приходит асинхронно как \`Observable<State>\`.

### Где нужен mergeScan

- Когда следующее состояние зависит от **асинхронной** операции — например, запрос к серверу на основе предыдущего состояния.
- Пагинация с накоплением: \`acc\` — уже загруженные элементы, шаг — догрузка следующей страницы.
- Параметр \`concurrent\` ограничивает, сколько внутренних потоков работает параллельно. При \`1\` получается строго последовательная аккумуляция (аналог \`concatMap\` + \`scan\`), что важно, чтобы страницы не перемешались.

\`\`\`ts
// Накопительная пагинация через mergeScan (concurrent = 1 = последовательно)
const loadMore$ = new Subject<void>();

const items$ = loadMore$.pipe(
  mergeScan(
    (acc: Item[], _: void) =>
      api.page(acc.length).pipe(map((next) => [...acc, ...next])),
    [] as Item[],
    1 // один запрос в полёте одновременно
  ),
  shareReplay({ bufferSize: 1, refCount: true })
);
\`\`\`

Здесь каждый клик «загрузить ещё» берёт уже накопленные элементы \`acc\`, грузит следующую страницу начиная с \`acc.length\` и дописывает новые элементы в конец.

## ⚠️ Подводные камни

- \`scan\` хранит состояние **на подписку**: при повторной подписке seed сбрасывается с нуля. Для разделяемого между подписчиками состояния добавляйте \`shareReplay\`.
- \`reduce\` на бесконечном потоке молчит вечно — используйте его только для конечных потоков.
- Забыть \`concurrent = 1\` в \`mergeScan\` при пагинации — страницы могут прийти в перепутанном порядке.

## 🎯 Запомни

- \`scan\` эмитит **каждый** промежуточный результат; \`reduce\` — только **итог при complete**.
- \`reduce\` = \`scan\` + \`last()\`; на бесконечном потоке \`reduce\` не эмитит.
- \`mergeScan\` — это \`scan\`, где шаг возвращает **Observable** (асинхронный); нужен, когда следующее состояние зависит от async-операции.`,
      en: `## 🧩 In plain words

Imagine adding up a column of numbers. \`scan\` is like calling out the running total after **each** new number. \`reduce\` is waiting until the end and announcing only the **final** sum. And \`mergeScan\` is the same running total, but each step requires a **trip to the internet** (an async operation), so the step returns not a finished number but a "promise" to compute it.

All three operators "accumulate state" from a stream of values — they just emit the result at different moments.

### scan — accumulate and show every step

\`scan(accumulator, seed)\` is "\`reduce\` with intermediate results". The _accumulator_ is a function that takes the accumulated value plus a new value and returns the new accumulated value. The _seed_ is the starting value. For **every** source value, \`scan\` runs the accumulator and **immediately emits** the new result.

\`\`\`
source:  --1--2--3--|
scan(+): --1--3--6--|
\`\`\`

Ideal for accumulating state over time: counters, mini-stores, progress aggregation. The source may be infinite — \`scan\` still works, emitting updates as values arrive.

### reduce — accumulate but show only the total

\`reduce\` accumulates in exactly the same way but **emits once** — the final result **on complete** (when the stream finishes). If the source never completes, \`reduce\` **never** emits.

\`\`\`
source:  --1--2--3--|
reduce:  -----------6|
\`\`\`

So \`reduce\` = \`scan\` + \`last()\` (take only the last value). Use it when you only need the total of a finished, finite stream.

### mergeScan — accumulate where each step is async

\`mergeScan(accumulator, seed, concurrent?)\` differs in that the accumulator **returns an Observable** (a stream), not a finished value. Each value that inner stream emits becomes the new accumulator and is emitted outward too. It is "\`scan\` whose step is async".

\`\`\`ts
actions$.pipe(
  mergeScan((acc, action) =>
    api.apply(acc, action), // -> Observable<State>
  initialState)
);
\`\`\`

Here for each \`action\` we send the previous state \`acc\` to the server, and the new state arrives asynchronously as an \`Observable<State>\`.

### Where mergeScan is needed

- When the next state depends on an **async** operation — for example, a server request based on the previous state.
- Accumulating pagination: \`acc\` is the items loaded so far, the step fetches the next page.
- The \`concurrent\` parameter caps how many inner streams run in parallel. With \`1\` you get strictly sequential accumulation (like \`concatMap\` + \`scan\`), which matters so pages do not interleave.

\`\`\`ts
// Accumulating pagination with mergeScan (concurrent = 1 = sequential)
const loadMore$ = new Subject<void>();

const items$ = loadMore$.pipe(
  mergeScan(
    (acc: Item[], _: void) =>
      api.page(acc.length).pipe(map((next) => [...acc, ...next])),
    [] as Item[],
    1 // one in-flight request at a time
  ),
  shareReplay({ bufferSize: 1, refCount: true })
);
\`\`\`

Here each "load more" click takes the already-accumulated items \`acc\`, fetches the next page starting from \`acc.length\`, and appends the new items.

## ⚠️ Common pitfalls

- \`scan\` keeps state **per subscription**: on resubscription the seed resets to zero. For state shared across subscribers, add \`shareReplay\`.
- \`reduce\` on an infinite stream stays silent forever — use it only for finite streams.
- Forgetting \`concurrent = 1\` in \`mergeScan\` for pagination — pages may arrive out of order.

## 🎯 Key takeaways

- \`scan\` emits **every** intermediate result; \`reduce\` emits only the **total on complete**.
- \`reduce\` = \`scan\` + \`last()\`; on an infinite stream \`reduce\` never emits.
- \`mergeScan\` is \`scan\` whose step returns an **Observable** (async); needed when the next state depends on an async operation.`
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
      ru: `## 🧩 Простыми словами

Представьте матрёшку: вы открываете куклу, внутри — ещё кукла, внутри неё — ещё, пока не дойдёте до самой маленькой. \`expand\` работает так же: он берёт результат, «раскрывает» его в следующий результат, тот — в следующий, и так по кругу, пока не встретит пустоту. Идеально, когда каждая страница данных знает лишь адрес **следующей** страницы, а вы хотите пройти их все.

По сути \`expand\` — это \`mergeMap\`, который скармливает сам себе свои же выходные значения.

### Что делает expand

\`expand(project)\` — это рекурсивный \`mergeMap\` (оператор, который на каждое значение запускает новый Observable). Разница в том, что каждое **выходное** значение снова подаётся в функцию \`project\`, и так далее, пока проекция не вернёт \`EMPTY\` — специальный поток, который сразу завершается без значений (или пока поток не остановят). Эмитятся **все** промежуточные значения, включая исходное (seed).

\`\`\`
seed -> project -> v1 -> project -> v2 -> project -> EMPTY
emit:  seed, v1, v2
\`\`\`

### Обход пагинации

\`expand\` идеален, когда адрес следующей страницы известен только **после** загрузки текущей — это так называемые cursor-based API (когда в ответе лежит «курсор»/ссылка на следующую страницу):

\`\`\`ts
api.getPage(1).pipe(
  expand((res) => res.next ? api.getPage(res.next) : EMPTY),
  takeWhile((res) => !!res.next, true), // включительно (второй аргумент true)
  concatMap((res) => res.items),        // развернуть страницы в отдельные элементы
  toArray()
);
\`\`\`

Здесь пока в ответе есть \`res.next\`, мы грузим следующую страницу; как только \`next\` пропал — возвращаем \`EMPTY\`, и рекурсия останавливается. \`takeWhile(..., true)\` пропускает и последнюю страницу тоже.

### Внутренности и подводные камни

- По умолчанию \`expand\` работает как \`mergeMap\` — **параллельно** (\`concurrent = Infinity\`). Если нужен строгий порядок страниц, задайте \`concurrent = 1\` — тогда поведение как у \`concatMap\` (по очереди).
- \`expand\` эмитит и **seed** (исходное значение), и все производные — не забудьте отфильтровать или трансформировать первое значение, если оно вам не нужно.
- Оператор полезен и для обхода деревьев (обход в ширину/глубину): каждый узел «расширяется» в своих детей.

### Marble-диаграмма

\`\`\`
expand: a---b--c---|   (a->b->c->EMPTY)
\`\`\`

Ключевая мысль: \`expand\` — это «генератор», которым управляет **предыдущий результат**, тогда как \`scan\`/\`reduce\` управляются входным потоком.

## ⚠️ Подводные камни

- **Бесконечная рекурсия**: если \`project\` никогда не вернёт \`EMPTY\`, поток не завершится. Всегда нужно условие выхода.
- Забыть про эмиссию seed — первое значение прилетит наружу, даже если это была «нулевая» страница.
- Параллельное поведение по умолчанию может перемешать порядок страниц; ставьте \`concurrent = 1\`, если порядок важен.

## 🎯 Запомни

- \`expand\` = рекурсивный \`mergeMap\`: выход снова подаётся в \`project\`, пока не вернётся \`EMPTY\`.
- Эмитятся **все** значения, включая seed; всегда предусматривайте условие выхода, иначе бесконечная рекурсия.
- Незаменим для cursor-based пагинации и обхода деревьев; \`concurrent = 1\` даёт строгий порядок.`,
      en: `## 🧩 In plain words

Picture a nesting doll: you open a doll, inside is another doll, inside that another, until you reach the smallest one. \`expand\` works the same way: it takes a result, "unfolds" it into the next result, that into the next, round and round, until it hits emptiness. Perfect when each page of data only knows the address of the **next** page and you want to walk through them all.

At heart, \`expand\` is a \`mergeMap\` that feeds its own output values back into itself.

### What expand does

\`expand(project)\` is a recursive \`mergeMap\` (an operator that starts a new Observable for each value). The difference is that each **output** value is fed back into the \`project\` function, and so on, until the projection returns \`EMPTY\` — a special stream that completes immediately with no values (or until the stream is stopped). It emits **all** intermediate values, including the initial one (the seed).

\`\`\`
seed -> project -> v1 -> project -> v2 -> project -> EMPTY
emit:  seed, v1, v2
\`\`\`

### Traversing pagination

\`expand\` is ideal when the next page's address is known only **after** loading the current one — these are cursor-based APIs (the response contains a "cursor"/link to the next page):

\`\`\`ts
api.getPage(1).pipe(
  expand((res) => res.next ? api.getPage(res.next) : EMPTY),
  takeWhile((res) => !!res.next, true), // inclusive (the second arg true)
  concatMap((res) => res.items),        // unwrap pages into individual items
  toArray()
);
\`\`\`

Here, as long as the response has \`res.next\`, we load the next page; once \`next\` is gone we return \`EMPTY\` and the recursion stops. \`takeWhile(..., true)\` lets the last page through too.

### Internals and gotchas

- By default \`expand\` behaves like \`mergeMap\` — **parallel** (\`concurrent = Infinity\`). If you need strict page order, set \`concurrent = 1\` — then it behaves like \`concatMap\` (one at a time).
- \`expand\` emits both the **seed** (initial value) and every derivative — remember to filter or transform the first value if you do not need it.
- The operator is also useful for tree traversal (breadth-first/depth-first): each node "expands" into its children.

### Marble diagram

\`\`\`
expand: a---b--c---|   (a->b->c->EMPTY)
\`\`\`

Key idea: \`expand\` is a "generator" driven by the **previous result**, whereas \`scan\`/\`reduce\` are driven by the input stream.

## ⚠️ Common pitfalls

- **Infinite recursion**: if \`project\` never returns \`EMPTY\`, the stream never completes. Always need an exit condition.
- Forgetting about the seed emission — the first value goes out too, even if it was the "page zero".
- The default parallel behavior can interleave page order; set \`concurrent = 1\` if order matters.

## 🎯 Key takeaways

- \`expand\` = recursive \`mergeMap\`: output is fed back into \`project\` until it returns \`EMPTY\`.
- It emits **all** values, including the seed; always provide an exit condition or you get infinite recursion.
- Indispensable for cursor-based pagination and tree traversal; \`concurrent = 1\` gives strict order.`
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
      ru: `## 🧩 Простыми словами

Представьте почтовую сортировку. \`partition\` — это две корзины: «подходит»/«не подходит». Каждое письмо летит либо в одну, либо в другую — корзин всегда ровно две. \`groupBy\` — это когда вы заводите **новую** корзину под каждого нового получателя: сколько уникальных адресов, столько и корзин.

Оба оператора разбивают один поток на несколько по какому-то признаку — просто \`partition\` даёт фиксированные две ветки, а \`groupBy\` — сколько угодно.

### partition — фиксированные две ветки

\`partition(source, predicate)\` разбивает поток на **два** по булеву _предикату_ (функции, возвращающей true/false) и возвращает кортеж \`[passed$, failed$]\` — поток «прошедших» и поток «не прошедших».

\`\`\`ts
const [even$, odd$] = partition(nums$, (n) => n % 2 === 0);
\`\`\`

Количество выходов фиксировано — всегда два. По сути это пара \`filter\`: один пропускает то, что подходит, другой — остальное. Удобно, когда нужно разнести «успех/ошибка» или «активные/архивные».

### groupBy — динамическое число веток

\`groupBy(keySelector)\` создаёт **динамическое** число подпотоков — по одному на каждый уникальный ключ (значение, которое возвращает \`keySelector\`). Он эмитит \`GroupedObservable\` — обычный поток, но с дополнительным полем \`.key\`, чтобы знать, к какой группе он относится. Обычно за \`groupBy\` идёт higher-order оператор (оператор, работающий с потоком потоков), например \`mergeMap\`:

\`\`\`ts
events$.pipe(
  groupBy((e) => e.userId),
  mergeMap((group$) => group$.pipe(
    throttleTime(1000),               // у каждого пользователя свой throttle
    map((e) => ({ user: group$.key, e }))
  ))
);
\`\`\`

Здесь события каждого пользователя попадают в свою группу, и \`throttleTime\` применяется к каждому пользователю независимо.

### Опасность в долгоживущих потоках

- Каждая группа — это внутренний \`Subject\` (управляемый поток), который **живёт до complete источника**. На бесконечном потоке с **постоянно растущим числом ключей** (например, ключ — это uuid, каждый раз новый) группы **накапливаются** и никогда не закрываются → утечка памяти.
- Решение — \`duration\` селектор: он говорит, когда закрыть группу. Группа закрывается по таймеру неактивности и пересоздаётся при новом значении ключа.

\`\`\`ts
groupBy(keyFn, { duration: (g) => g.pipe(debounceTime(30000)) })
\`\`\`

- Нужно **подписаться** на каждую группу (через \`mergeMap\`/\`merge\`), иначе значения буферизуются в неподписанном \`GroupedObservable\` и копятся в памяти.

## ⚠️ Подводные камни

- Не подписаться на группу = буферизация значений внутри неё = утечка.
- \`groupBy\` без \`duration\` на бесконечном потоке с растущими ключами гарантированно течёт по памяти.
- \`partition\` возвращает **кортеж**, а не один Observable — деструктурируйте \`[a$, b$]\`.

## 🎯 Запомни

- \`partition\` — всегда **две** ветки по предикату (пара \`filter\`).
- \`groupBy\` — **динамические N** веток по ключу; каждая группа несёт \`.key\`.
- В долгоживущих потоках следите за временем жизни групп: используйте \`duration\` и обязательно подписывайтесь на каждую группу.`,
      en: `## 🧩 In plain words

Picture sorting mail. \`partition\` is two bins: "matches"/"doesn't match". Each letter goes into one or the other — there are always exactly two bins. \`groupBy\` is when you spin up a **new** bin for every new recipient: as many unique addresses, that many bins.

Both operators split one stream into several by some criterion — \`partition\` just gives fixed two branches, while \`groupBy\` gives as many as needed.

### partition — fixed two branches

\`partition(source, predicate)\` splits a stream into **two** by a boolean _predicate_ (a function returning true/false) and returns a tuple \`[passed$, failed$]\` — a stream of "passed" and a stream of "failed".

\`\`\`ts
const [even$, odd$] = partition(nums$, (n) => n % 2 === 0);
\`\`\`

The number of outputs is fixed — always two. It is essentially a pair of \`filter\`: one lets through what matches, the other lets through the rest. Handy to separate "success/failure" or "active/archived".

### groupBy — dynamic number of branches

\`groupBy(keySelector)\` creates a **dynamic** number of substreams — one per distinct key (the value \`keySelector\` returns). It emits \`GroupedObservable\`s — ordinary streams but with an extra \`.key\` field so you know which group they belong to. \`groupBy\` is usually followed by a higher-order operator (one that works on a stream of streams), such as \`mergeMap\`:

\`\`\`ts
events$.pipe(
  groupBy((e) => e.userId),
  mergeMap((group$) => group$.pipe(
    throttleTime(1000),               // a per-user throttle
    map((e) => ({ user: group$.key, e }))
  ))
);
\`\`\`

Here each user's events land in their own group, and \`throttleTime\` applies to each user independently.

### Danger in long-lived streams

- Each group is an inner \`Subject\` (a managed stream) that **lives until the source completes**. On an infinite stream with a **constantly growing set of keys** (e.g. the key is a uuid, new every time), groups **accumulate** and never close → memory leak.
- The fix is a \`duration\` selector: it tells RxJS when to close the group. The group closes after an idle timeout and is recreated on a new value of that key.

\`\`\`ts
groupBy(keyFn, { duration: (g) => g.pipe(debounceTime(30000)) })
\`\`\`

- You must **subscribe** to each group (via \`mergeMap\`/\`merge\`), otherwise values buffer in the unsubscribed \`GroupedObservable\` and pile up in memory.

## ⚠️ Common pitfalls

- Not subscribing to a group = its values buffer = leak.
- \`groupBy\` without \`duration\` on an infinite stream with growing keys is guaranteed to leak memory.
- \`partition\` returns a **tuple**, not a single Observable — destructure \`[a$, b$]\`.

## 🎯 Key takeaways

- \`partition\` — always **two** branches by predicate (a pair of \`filter\`).
- \`groupBy\` — **dynamic N** branches by key; each group carries \`.key\`.
- In long-lived streams, watch group lifetimes: use \`duration\` and always subscribe to each group.`
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
      ru: `## 🧩 Простыми словами

Представьте конвейер, по которому едут детали, а рядом стоит человек с коробкой. Каждые несколько секунд (или каждые N деталей) он закрывает коробку и отдаёт её дальше. Семейство \`buffer\` — это ровно про это: копить значения и выдавать их пачкой. Разница между \`buffer\` и \`window\` только в упаковке: \`buffer\` отдаёт готовый **массив** (закрытую коробку), а \`window\` — **живой поток** (коробку, в которую ещё можно на лету что-то доложить и обработать).

### Идея семейства

Эти операторы **группируют** значения по времени, количеству или внешнему сигналу. Принципиальная разница:

- **buffer\\*** эмитит **массив** накопленных значений: тип \`Observable<T[]>\`.
- **window\\*** эмитит **вложенный Observable** значений: тип \`Observable<Observable<T>>\` (это higher-order оператор — поток потоков).

\`window\` мощнее — к каждому окну можно применить операторы (например, посчитать значения), но требует подписки на внутренние потоки.

### Варианты buffer

- \`bufferCount(n, every?)\` — эмитит массив каждые \`n\` значений. Аргумент \`every\` создаёт **скользящие** (перекрывающиеся) окна.
- \`bufferTime(ms)\` — эмитит массив каждые \`ms\` миллисекунд (по таймеру).
- \`bufferWhen(closingSelector)\` — окно закрывается, когда эмитит Observable, возвращённый из селектора.
- \`buffer(closing$)\` — закрывает буфер на каждую эмиссию потока \`closing$\`.
- \`bufferToggle(open$, closeFn)\` — окна открываются и закрываются по внешним сигналам.

\`\`\`
bufferCount(2): a-b-c-d-e|
                ---[a,b]---[c,d]--([e])|
\`\`\`

### Варианты window

Те же стратегии (\`windowCount\`, \`windowTime\`, \`windowWhen\`, \`windowToggle\`), но вместо массивов вы получаете потоки. Типичный паттерн — агрегировать каждое окно:

\`\`\`ts
clicks$.pipe(
  windowTime(1000),
  mergeMap((win$) => win$.pipe(count())) // сколько кликов в секунду
);
\`\`\`

Здесь \`windowTime(1000)\` каждую секунду открывает новое окно-поток, а \`count()\` внутри \`mergeMap\` считает, сколько кликов в него попало.

### Практика

- «Сколько событий за окно» или батчинг сетевых запросов → \`bufferTime\`/\`bufferCount\`.
- \`bufferToggle\`/\`windowToggle\` — для «записи между start/stop», например drag между \`mousedown\` и \`mouseup\`.

\`\`\`ts
// Определяем "двойной клик", буферизуя клики в окне 250мс
const doubleClick$ = clicks$.pipe(
  buffer(clicks$.pipe(debounceTime(250))),
  filter((group) => group.length === 2)
);

// Батчим исходящие аналитические события: сброс каждые 5с ИЛИ каждые 20 событий
const batch$ = events$.pipe(
  bufferTime(5000, null, 20),
  filter((batch) => batch.length > 0)
);
\`\`\`

Здесь \`buffer\` закрывает коробку, когда клики затихли на 250мс, а \`bufferTime(5000, null, 20)\` сбрасывает пачку либо раз в 5 секунд, либо как только накопилось 20 событий.

## ⚠️ Подводные камни

- Незакрытое окно перед завершением потока эмитит **частичный** буфер (то, что успело накопиться).
- \`bufferTime\` может эмитить **пустые** массивы, если за интервал ничего не пришло — часто нужен \`filter(b => b.length > 0)\`.
- \`window*\` требует **подписки** на внутренние потоки, иначе значения теряются/буферизуются; забыть про \`mergeMap\`/\`concatMap\` — типичная ошибка.

## 🎯 Запомни

- \`buffer*\` даёт **массив** (\`T[]\`), \`window*\` — **вложенный Observable** (поток потоков).
- Стратегия закрытия задаётся суффиксом: \`Count\`, \`Time\`, \`When\`, \`Toggle\` (и просто \`buffer(closing$)\`).
- \`window\` мощнее, но требует подписки на каждое окно; фильтруйте пустые буферы у \`bufferTime\`.`,
      en: `## 🧩 In plain words

Picture a conveyor belt carrying parts, with a person standing beside it holding a box. Every few seconds (or every N parts) they close the box and pass it along. The \`buffer\` family is exactly this: collect values and hand them over in a batch. The difference between \`buffer\` and \`window\` is just the packaging: \`buffer\` hands you a finished **array** (a sealed box), while \`window\` hands you a **live stream** (a box you can still drop things into and process on the fly).

### The family idea

These operators **group** values by time, count, or an external signal. The key difference:

- **buffer\\*** emits an **array** of collected values: type \`Observable<T[]>\`.
- **window\\*** emits a **nested Observable** of values: type \`Observable<Observable<T>>\` (a higher-order operator — a stream of streams).

\`window\` is more powerful — you can apply operators to each window (e.g. count its values), but it requires subscribing to the inner streams.

### buffer variants

- \`bufferCount(n, every?)\` — emits an array every \`n\` values. The \`every\` argument creates **sliding** (overlapping) windows.
- \`bufferTime(ms)\` — emits an array every \`ms\` milliseconds (timer-driven).
- \`bufferWhen(closingSelector)\` — the window closes when the Observable returned by the selector emits.
- \`buffer(closing$)\` — closes the buffer on each emission of the \`closing$\` stream.
- \`bufferToggle(open$, closeFn)\` — windows open and close on external signals.

\`\`\`
bufferCount(2): a-b-c-d-e|
                ---[a,b]---[c,d]--([e])|
\`\`\`

### window variants

Same strategies (\`windowCount\`, \`windowTime\`, \`windowWhen\`, \`windowToggle\`), but instead of arrays you get streams. The typical pattern is to aggregate each window:

\`\`\`ts
clicks$.pipe(
  windowTime(1000),
  mergeMap((win$) => win$.pipe(count())) // clicks per second
);
\`\`\`

Here \`windowTime(1000)\` opens a new window-stream every second, and \`count()\` inside \`mergeMap\` tallies how many clicks landed in it.

### In practice

- "How many events per window" or batching network requests → \`bufferTime\`/\`bufferCount\`.
- \`bufferToggle\`/\`windowToggle\` — for "recording between start/stop", e.g. a drag between \`mousedown\` and \`mouseup\`.

\`\`\`ts
// Detect a "double click" by buffering clicks within a 250ms window
const doubleClick$ = clicks$.pipe(
  buffer(clicks$.pipe(debounceTime(250))),
  filter((group) => group.length === 2)
);

// Batch outgoing analytics events: flush every 5s OR every 20 events
const batch$ = events$.pipe(
  bufferTime(5000, null, 20),
  filter((batch) => batch.length > 0)
);
\`\`\`

Here \`buffer\` closes the box once clicks have gone quiet for 250ms, and \`bufferTime(5000, null, 20)\` flushes a batch either every 5 seconds or as soon as 20 events accumulate.

## ⚠️ Common pitfalls

- An unclosed window before the stream completes emits a **partial** buffer (whatever accumulated so far).
- \`bufferTime\` can emit **empty** arrays if nothing arrived in the interval — you often need \`filter(b => b.length > 0)\`.
- \`window*\` requires **subscribing** to the inner streams, otherwise values are lost/buffered; forgetting \`mergeMap\`/\`concatMap\` is a classic mistake.

## 🎯 Key takeaways

- \`buffer*\` gives an **array** (\`T[]\`), \`window*\` gives a **nested Observable** (stream of streams).
- The closing strategy is set by the suffix: \`Count\`, \`Time\`, \`When\`, \`Toggle\` (plus plain \`buffer(closing$)\`).
- \`window\` is more powerful but requires subscribing to each window; filter out empty buffers with \`bufferTime\`.`
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
      ru: `## 🧩 Простыми словами

Представь, что поток значений — это лента данных, которая едет мимо тебя по одному значению. \`pairwise\` — это как смотреть сразу на два соседних вагона: «что было раньше» и «что стало сейчас». А \`startWith\` — это подсунуть в начало ленты своё значение, чтобы оно проехало первым, ещё до того, как приедут настоящие данные. Вместе они помогают отвечать на вопросы «стало больше или меньше?» и «а что показывать, пока данных ещё нет?».

### pairwise: сравниваем «было» и «стало»

Оператор \`pairwise()\` берёт два последних значения и эмитит их **парой** — массивом \`[previous, current]\` (\`previous\` — предыдущее, \`current\` — текущее). Важная деталь: самое первое значение источника **не** выходит отдельно — оно просто становится «предыдущим» для второго. Поэтому пар всегда на одну меньше, чем значений.

\`\`\`
source:   a--b--c--d|
pairwise: ---[a,b]-[b,c]-[c,d]|
\`\`\`

Где это нужно:

- **Дельта или направление**: сравнить новое и старое значение. Например, узнать, скроллит пользователь вверх или вниз, растёт число или падает.
- **Анимация перехода**: когда нужно плавно анимировать от прошлого состояния к текущему, а значит знать оба.

\`\`\`ts
scrollY$.pipe(
  pairwise(),
  map(([prev, curr]) => curr > prev ? 'down' : 'up'),
  distinctUntilChanged()
);
\`\`\`

Здесь мы на каждый шаг скролла сравниваем новую позицию с прошлой и говорим «вниз» или «вверх». \`distinctUntilChanged()\` убирает повторы, чтобы не дёргать логику, пока направление не сменилось.

### startWith: подкладываем начальное значение

\`startWith(...values)\` **синхронно** (то есть сразу, в тот же миг подписки) эмитит указанные значения **до** того, как источник выдаст своё первое. По типам результат расширяется до объединения (union) — то есть тип стартового значения добавляется к типу потока.

Где это нужно:

- **Начальное состояние UI**, пока данные ещё грузятся: флаг загрузки, значения формы по умолчанию.
- **«Подкормить» pairwise или scan** первым значением, чтобы пара или накопление появились уже на первой реальной эмиссии.
- **Заставить \`combineLatest\` эмитить сразу**: этот оператор ждёт, пока каждый источник выдаст хотя бы одно значение; дав каждому стартовое, мы получаем результат немедленно.

\`\`\`ts
filters$.pipe(
  startWith(DEFAULT_FILTERS), // combineLatest стартует немедленно
);
\`\`\`

### Комбинация startWith + pairwise

Это частый дуэт. Проблема \`pairwise\` в том, что для самого первого настоящего значения ещё нет «предыдущего». Ставим перед ним \`startWith\`, и стартовое значение играет роль этого «предыдущего»:

\`\`\`ts
value$.pipe(
  startWith(0),
  pairwise(),
  map(([prev, curr]) => curr - prev) // дельта, включая первую
);
\`\`\`

Теперь дельта считается даже для самого первого значения (относительно нуля), а не теряется.

## ⚠️ Подводные камни

- \`startWith\` эмитит **синхронно** на подписку. Если рядом стоит \`take(1)\` или это тест, легко случайно «съесть» именно стартовое значение вместо ожидаемого реального.

## 🎯 Запомни

- \`pairwise\` → пара \`[предыдущее, текущее]\`; первое значение источника само по себе не выходит, пар всегда на одну меньше.
- \`startWith\` → синхронно подкладывает значение в начало потока: дефолты, мгновенный старт \`combineLatest\`.
- \`startWith\` + \`pairwise\` дают корректную дельту уже с первого значения.`,
      en: `## 🧩 In plain words

Picture a stream of values as a conveyor belt that carries data past you one item at a time. \`pairwise\` is like looking at two neighbouring boxes at once: "what came before" and "what's here now". And \`startWith\` is slipping your own value onto the front of the belt so it rides through first, before any real data arrives. Together they answer questions like "did it go up or down?" and "what do I show while there's no data yet?".

### pairwise: comparing "before" and "after"

The \`pairwise()\` operator takes the two most recent values and emits them as a **pair** — an array \`[previous, current]\`. One key detail: the source's very first value does **not** come out on its own — it just becomes the "previous" for the second one. So there is always one fewer pair than there are values.

\`\`\`
source:   a--b--c--d|
pairwise: ---[a,b]-[b,c]-[c,d]|
\`\`\`

Where you need it:

- **Delta or direction**: compare the new value with the old one. For example, tell whether the user is scrolling up or down, whether a number is rising or falling.
- **Transition animation**: when you need to smoothly animate from the previous state to the current one, which means knowing both.

\`\`\`ts
scrollY$.pipe(
  pairwise(),
  map(([prev, curr]) => curr > prev ? 'down' : 'up'),
  distinctUntilChanged()
);
\`\`\`

Here, on each scroll step we compare the new position with the previous one and say "down" or "up". \`distinctUntilChanged()\` drops repeats so the logic isn't triggered until the direction actually changes.

### startWith: seeding an initial value

\`startWith(...values)\` **synchronously** (that is, immediately, at the moment of subscription) emits the given values **before** the source produces its first. In terms of types, the result widens to a union — the type of the starting value is added to the stream's type.

Where you need it:

- **Initial UI state** while data is still loading: a loading flag, default form values.
- **"Prime" pairwise or scan** with a first value so the pair or accumulation appears on the very first real emission.
- **Make \`combineLatest\` emit right away**: that operator waits until every source has emitted at least once; giving each a starting value gets you a result immediately.

\`\`\`ts
filters$.pipe(
  startWith(DEFAULT_FILTERS), // combineLatest starts immediately
);
\`\`\`

### The startWith + pairwise combination

This is a common duo. The catch with \`pairwise\` is that the very first real value has no "previous" yet. Put a \`startWith\` in front and the starting value plays the role of that "previous":

\`\`\`ts
value$.pipe(
  startWith(0),
  pairwise(),
  map(([prev, curr]) => curr - prev) // delta, including the first
);
\`\`\`

Now the delta is computed even for the very first value (relative to zero) instead of being lost.

## ⚠️ Common pitfalls

- \`startWith\` emits **synchronously** on subscribe. If there's a \`take(1)\` nearby, or in tests, it's easy to accidentally "consume" the starting value instead of the real one you expected.

## 🎯 Key takeaways

- \`pairwise\` → a pair \`[previous, current]\`; the source's first value never comes out alone, so there's always one fewer pair.
- \`startWith\` → synchronously seeds a value at the front of the stream: defaults, instant \`combineLatest\` startup.
- \`startWith\` + \`pairwise\` give a correct delta starting from the very first value.`
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
      ru: `## 🧩 Простыми словами

Оба оператора нужны, чтобы **придержать** значения потока и отдать их позже. \`delay\` — это как поставить всем одинаковую паузу: каждое значение выходит на N миллисекунд позже, ровно как есть. \`delayWhen\` умнее: он спрашивает «а сколько ждать именно для этого значения?» и позволяет задержку **разную** — зависящую от самого значения или от какого-то внешнего сигнала.

### delay: одинаковая пауза для всех

\`delay(ms | Date)\` сдвигает **все** уведомления (точно \`next\` и \`error\`) на **фиксированное** время. Представь, что берёшь всю временную шкалу потока и двигаешь её вправо на N миллисекунд — расстояния между значениями сохраняются, просто всё приезжает позже.

\`\`\`
source: a-b--c|
delay:  --a-b--c|   (каждое на +N)
\`\`\`

Где применяют: имитация задержки сети в тестах и демо, искусственная пауза перед показом чего-либо.

### delayWhen: своя пауза для каждого значения

\`delayWhen(durationSelector)\` задерживает каждое значение на **индивидуальное** время. Ты передаёшь функцию-селектор, которая для каждого значения возвращает **свой Observable**. Значение выйдет наружу в тот момент, когда этот Observable **впервые что-то эмитит**.

\`\`\`ts
source$.pipe(
  delayWhen((value) => timer(value.priority * 100))
);
\`\`\`

Здесь \`timer(N)\` — это Observable, который «пикает» один раз через N мс. Чем выше \`priority\`, тем дольше ждём. То есть задержка **зависит от самого значения** — так \`delay\` не умеет.

### Переменная задержка и сигналы

- **Задержка до внешнего события**: \`delayWhen(() => ready$)\` — придержать значения, пока \`ready$\` не эмитит хоть что-нибудь. Удобно, когда данные готовы, но показать их можно только после какого-то другого сигнала.
- **Ступенчатая (нарастающая) задержка по индексу**: комбинируй с \`scan\` или индексом значения.

\`\`\`ts
emails$.pipe(
  concatMap((email, i) =>
    of(email).pipe(delay(i * 200)) // ступенчатая рассылка
  )
);
\`\`\`

Тут каждое следующее письмо (\`i\` — его номер) задерживается всё сильнее, получается плавная «лесенка» отправок вместо залпа.

## ⚠️ Подводные камни

- \`delay\` работает через \`asyncScheduler\` — это **макротаски** (задачи, которые браузер выполняет после текущего кода и микротасков). Поэтому в синхронных marble-тестах наличие задержки принципиально влияет на результат.
- \`delay\` **буферизует** значения на время паузы: на быстром бесконечном источнике буфер в памяти может расти неограниченно.
- \`delayWhen\` с Observable, который **никогда не эмитит**, задержит значение **навсегда** — обязательно нужен таймаут или завершение.
- \`delay\` сдвигает только **доставку** значений, а не момент подписки. Если нужно отложить саму подписку, используй \`subscribeOn\` или \`timer + switchMap\`.

## 🎯 Запомни

- \`delay\` → одинаковая фиксированная пауза для каждого значения.
- \`delayWhen\` → у каждого значения своя пауза, заданная возвращаемым Observable; так делается переменная задержка и ожидание внешнего сигнала.
- Осторожно с бесконечными источниками: буфер \`delay\` растёт, а \`delayWhen\` на «немом» сигнале ждёт вечно.`,
      en: `## 🧩 In plain words

Both operators exist to **hold back** the values of a stream and release them later. \`delay\` is like giving everyone the same pause: each value comes out N milliseconds later, exactly as it was. \`delayWhen\` is smarter: it asks "how long should I wait for *this particular* value?" and lets the delay be **different** — depending on the value itself or on some external signal.

### delay: the same pause for everyone

\`delay(ms | Date)\` shifts **all** notifications (\`next\` and \`error\` for sure) by a **fixed** time. Imagine taking the whole time axis of the stream and sliding it to the right by N milliseconds — the gaps between values stay the same, everything just arrives later.

\`\`\`
source: a-b--c|
delay:  --a-b--c|   (each by +N)
\`\`\`

Where it's used: simulating network latency in tests and demos, an artificial pause before showing something.

### delayWhen: a custom pause per value

\`delayWhen(durationSelector)\` delays each value by an **individual** amount. You pass a selector function that returns **its own Observable** for each value. The value is released the moment that Observable **first emits** anything.

\`\`\`ts
source$.pipe(
  delayWhen((value) => timer(value.priority * 100))
);
\`\`\`

Here \`timer(N)\` is an Observable that "pings" once after N ms. The higher the \`priority\`, the longer we wait. So the delay **depends on the value itself** — something \`delay\` cannot do.

### Variable delay and signals

- **Delay until an external event**: \`delayWhen(() => ready$)\` — hold values until \`ready$\` emits anything. Handy when the data is ready but you may only show it after some other signal.
- **Staggered (increasing) delay by index**: combine with \`scan\` or the value's index.

\`\`\`ts
emails$.pipe(
  concatMap((email, i) =>
    of(email).pipe(delay(i * 200)) // staggered sending
  )
);
\`\`\`

Here each following email (\`i\` is its number) is delayed more and more, producing a smooth "staircase" of sends instead of one burst.

## ⚠️ Common pitfalls

- \`delay\` runs on the \`asyncScheduler\` — these are **macrotasks** (tasks the browser runs after the current code and microtasks). So in synchronous marble tests the presence of a delay materially changes the result.
- \`delay\` **buffers** values during the pause: on a fast infinite source the in-memory buffer can grow without bound.
- \`delayWhen\` with an Observable that **never emits** will delay the value **forever** — you must add a timeout or a completion.
- \`delay\` shifts only the **delivery** of values, not the moment of subscription. To defer the subscription itself, use \`subscribeOn\` or \`timer + switchMap\`.

## 🎯 Key takeaways

- \`delay\` → the same fixed pause for every value.
- \`delayWhen\` → each value gets its own pause defined by a returned Observable; that's how you do a variable delay and wait for an external signal.
- Be careful with infinite sources: \`delay\`'s buffer grows, and \`delayWhen\` on a silent signal waits forever.`
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
      ru: `## 🧩 Простыми словами

И \`repeat\`, и \`retry\` делают одно и то же по механике: когда поток заканчивается, они **заново подписываются** на него и запускают с начала. Разница — по какому событию они это делают. \`retry\` перезапускает поток, когда тот **упал с ошибкой** (пытаемся ещё раз после сбоя). \`repeat\` перезапускает поток, когда тот **успешно завершился** (гоняем удачный поток по кругу). Именно на \`repeat\` удобно строить polling — периодический опрос сервера.

### repeat против retry

Оба **переподписываются** на источник, но по разному триггеру:

- \`retry\` переподписывается на **error** — восстановление после сбоя.
- \`repeat\` переподписывается на **complete** — повтор успешно завершившегося потока.

\`\`\`
source: --a--b--|   (complete)
repeat(2): --a--b----a--b--|
\`\`\`

### repeat

\`repeat(count?)\` повторяет источник \`count\` раз после каждого \`complete\`. Без аргумента повторяет **бесконечно**. Начиная с RxJS 7.3 есть форма с паузой между повторами — \`repeat({ count, delay })\`:

\`\`\`ts
api.poll().pipe(
  repeat({ delay: 5000 }) // polling каждые 5с после ответа
);
\`\`\`

Здесь после каждого успешного ответа ждём 5 секунд и запрашиваем снова — простой опрос.

### repeatWhen (устаревает)

\`repeatWhen(notifier => ...)\` даёт полный контроль: тебе передают поток сигналов «источник завершился», а ты возвращаешь Observable, эмиссии которого командуют «повторить сейчас». Оператор довольно мудрёный и вытесняется более простым \`repeat({ delay })\`. Раньше он был полезен, чтобы повторять **по внешнему сигналу**:

\`\`\`ts
data$.pipe(
  repeatWhen((completes$) => refreshClicks$) // повтор по кнопке
);
\`\`\`

Здесь поток перезапускается каждый раз, когда пользователь жмёт кнопку обновления.

### Polling: два подхода

\`\`\`ts
// 1. timer + switchMap (всегда фиксированный интервал)
timer(0, 5000).pipe(switchMap(() => api.load()));

// 2. repeat с delay (интервал ОТ момента ответа, без наложения)
defer(() => api.load()).pipe(repeat({ delay: 5000 }));
\`\`\`

Разница важная:

- Вариант **1** тикает по абсолютному времени, ровно каждые 5 секунд. Если запрос идёт дольше интервала, новый тик наступит раньше, чем пришёл прошлый ответ — но \`switchMap\` **отменит** предыдущий незавершённый запрос.
- Вариант **2** сначала ждёт **завершения** запроса, потом делает паузу 5 секунд, и только тогда шлёт следующий. Наложений быть не может. \`defer\` нужен, чтобы на каждой переподписке создавался **свежий** запрос, а не повторялся один и тот же старый.

## ⚠️ Подводные камни

- \`repeat\` повторяет **побочные эффекты** источника целиком: каждый повтор — это новый реальный запрос к серверу.
- Чтобы остановить polling, добавь \`takeUntil(stop$)\` или \`takeWhile(...)\`.
- \`repeat\` на источнике, который **никогда не завершается**, бессмыслен: повтор наступает по \`complete\`, а его не будет.

## 🎯 Запомни

- \`retry\` = переподписка на **ошибку**; \`repeat\` = переподписка на **успешное завершение**.
- Polling чаще всего: \`repeat({ delay })\` (пауза после ответа, без наложений) или \`timer + switchMap\` (жёсткий интервал).
- \`repeat\` перезапускает все побочные эффекты и бесполезен на потоке без \`complete\`.`,
      en: `## 🧩 In plain words

Both \`repeat\` and \`retry\` do the same thing mechanically: when a stream ends, they **resubscribe** to it and start it over from the beginning. The difference is *which* event triggers that. \`retry\` restarts the stream when it **fails with an error** (try again after a failure). \`repeat\` restarts the stream when it **completes successfully** (run a good stream in a loop). \`repeat\` is exactly what you build polling on — periodically asking the server for fresh data.

### repeat versus retry

Both **resubscribe** to the source, but on different triggers:

- \`retry\` resubscribes on **error** — recovery from failure.
- \`repeat\` resubscribes on **complete** — repeating a successfully finished stream.

\`\`\`
source: --a--b--|   (complete)
repeat(2): --a--b----a--b--|
\`\`\`

### repeat

\`repeat(count?)\` repeats the source \`count\` times after each \`complete\`. Without an argument it repeats **infinitely**. Since RxJS 7.3 there's a form with a pause between repeats — \`repeat({ count, delay })\`:

\`\`\`ts
api.poll().pipe(
  repeat({ delay: 5000 }) // poll every 5s after the response
);
\`\`\`

Here, after each successful response we wait 5 seconds and request again — simple polling.

### repeatWhen (being deprecated)

\`repeatWhen(notifier => ...)\` gives full control: you're handed a stream of "the source completed" signals, and you return an Observable whose emissions command "repeat now". The operator is fairly convoluted and is being superseded by the simpler \`repeat({ delay })\`. It used to be useful for repeating **on an external signal**:

\`\`\`ts
data$.pipe(
  repeatWhen((completes$) => refreshClicks$) // repeat on a button
);
\`\`\`

Here the stream restarts each time the user clicks the refresh button.

### Polling: two approaches

\`\`\`ts
// 1. timer + switchMap (always a fixed interval)
timer(0, 5000).pipe(switchMap(() => api.load()));

// 2. repeat with delay (interval FROM the response, no overlap)
defer(() => api.load()).pipe(repeat({ delay: 5000 }));
\`\`\`

An important difference:

- Option **1** ticks on absolute time, exactly every 5 seconds. If a request takes longer than the interval, the next tick fires before the previous response arrives — but \`switchMap\` **cancels** the previous, unfinished request.
- Option **2** first waits for the request to **complete**, then pauses 5 seconds, and only then sends the next one. No overlap is possible. \`defer\` is needed so that each resubscription creates a **fresh** request rather than replaying the same old one.

## ⚠️ Common pitfalls

- \`repeat\` replays the source's **side effects** entirely: each repeat is a brand-new real request to the server.
- To stop polling, add \`takeUntil(stop$)\` or \`takeWhile(...)\`.
- \`repeat\` on a source that **never completes** is pointless: the repeat is triggered by \`complete\`, which never comes.

## 🎯 Key takeaways

- \`retry\` = resubscribe on **error**; \`repeat\` = resubscribe on **successful completion**.
- Polling is most often: \`repeat({ delay })\` (pause after the response, no overlap) or \`timer + switchMap\` (a strict interval).
- \`repeat\` replays all side effects and is useless on a stream without \`complete\`.`
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
      ru: `## 🧩 Простыми словами

Эти три оператора — про «а что если поток ведёт себя не так, как надо». \`timeout\` следит за временем: «слишком долго молчишь — считаю это ошибкой». \`defaultIfEmpty\` подстраховывает на случай, когда поток закончился, **не выдав ни одного значения** — подставляет запасное. \`throwIfEmpty\` реагирует на ту же ситуацию наоборот: пусто — значит что-то пошло не так, кидаем ошибку.

### timeout: ограничиваем ожидание

\`timeout({ each, first, with })\` бросает \`TimeoutError\` (или переключается на запасной поток), если источник **не эмитит** значение в отведённое время.

- \`first\` — дедлайн на **первое** значение (сколько ждём вообще первый ответ).
- \`each\` — дедлайн между **соседними** значениями (максимальная пауза внутри потока).
- \`with\` — фабрика запасного Observable вместо выбрасывания ошибки.

\`\`\`ts
api.load().pipe(
  timeout({ first: 5000, with: () => of(CACHED) })
);
\`\`\`

Здесь: если сервер не ответил за 5 секунд, вместо ошибки отдаём закэшированные данные \`CACHED\`. Применение: ограничить ожидание ответа, откат на кэш, защита от «зависших» потоков.

### defaultIfEmpty: значение по умолчанию для пустого потока

\`defaultIfEmpty(value)\` эмитит \`value\`, если источник **завершился, не выдав ни одного** \`next\`. Это защищает код ниже по цепочке (downstream), которому нужно хотя бы одно значение.

\`\`\`ts
filteredItems$.pipe(
  filter((x) => x.active),
  defaultIfEmpty([] as Item[]) // пустой результат вместо «ничего»
);
\`\`\`

Если \`filter\` отсеял всё и поток завершился пустым, вниз всё равно уйдёт пустой массив, а не «тишина».

### throwIfEmpty: пусто — это ошибка

\`throwIfEmpty(errorFactory?)\` — противоположность: **бросает** ошибку, если источник завершился без значений. Полезно, когда пустой результат — это ошибочная ситуация.

\`\`\`ts
findUser(id).pipe(
  throwIfEmpty(() => new NotFoundError(id))
);
\`\`\`

Если пользователь не найден и поток пуст, получаем осмысленную ошибку \`NotFoundError\` вместо тихого завершения.

### Сравнение и нюансы

- \`defaultIfEmpty\` и \`throwIfEmpty\` срабатывают **только при завершении без единого next** (complete-without-next). На **бесконечном** источнике они не выстрелят никогда.
- \`timeout\` отсчитывает время по \`asyncScheduler\`. На бесконечном медленном потоке именно параметр \`each\` ловит «зависания» между значениями.
- Частый паттерн: оператор \`first()\` сам бросает \`EmptyError\` на пустом потоке — по сути это встроенный \`throwIfEmpty\`. Если пустота допустима, используй \`first(predicate, defaultValue)\` или \`take(1)\`.
- \`timeout\` с параметром \`with\` отлично сочетается с \`retry\` — получается устойчивый сетевой слой.

## ⚠️ Подводные камни

- \`defaultIfEmpty\` / \`throwIfEmpty\` бесполезны на бесконечных потоках — им нужен \`complete\`.
- Не забывай, что \`first()\` уже бросает \`EmptyError\` сам; если это нежелательно — задай значение по умолчанию.

## 🎯 Запомни

- \`timeout\` → «молчишь слишком долго» = ошибка или откат на \`with\`; \`first\` для первого значения, \`each\` для пауз между значениями.
- \`defaultIfEmpty(v)\` → подставить \`v\`, если поток завершился пустым.
- \`throwIfEmpty()\` → наоборот, кинуть ошибку, если поток завершился пустым. Оба реагируют только на complete без next.`,
      en: `## 🧩 In plain words

These three operators are about "what if the stream behaves not the way it should". \`timeout\` watches the clock: "you've been silent too long — I'll treat that as an error". \`defaultIfEmpty\` covers the case where a stream finishes **without emitting a single value** — it substitutes a fallback. \`throwIfEmpty\` reacts to that same situation the opposite way: empty means something went wrong, so throw an error.

### timeout: capping how long you wait

\`timeout({ each, first, with })\` throws a \`TimeoutError\` (or switches to a fallback stream) if the source does **not emit** a value within the allotted time.

- \`first\` — deadline for the **first** value (how long you wait for any response at all).
- \`each\` — deadline between **consecutive** values (the maximum pause inside the stream).
- \`with\` — a factory for a fallback Observable instead of throwing an error.

\`\`\`ts
api.load().pipe(
  timeout({ first: 5000, with: () => of(CACHED) })
);
\`\`\`

Here: if the server hasn't responded within 5 seconds, we hand back cached data \`CACHED\` instead of an error. Use: cap how long you wait for a response, fall back to cache, guard against "stuck" streams.

### defaultIfEmpty: a default value for an empty stream

\`defaultIfEmpty(value)\` emits \`value\` if the source **completes without emitting any** \`next\`. This protects the downstream code that needs at least one value.

\`\`\`ts
filteredItems$.pipe(
  filter((x) => x.active),
  defaultIfEmpty([] as Item[]) // empty result instead of "nothing"
);
\`\`\`

If \`filter\` weeds everything out and the stream completes empty, an empty array still flows downstream instead of silence.

### throwIfEmpty: empty means an error

\`throwIfEmpty(errorFactory?)\` is the opposite: it **throws** if the source completes with no values. Useful when an empty result is an error condition.

\`\`\`ts
findUser(id).pipe(
  throwIfEmpty(() => new NotFoundError(id))
);
\`\`\`

If the user isn't found and the stream is empty, you get a meaningful \`NotFoundError\` instead of a silent completion.

### Comparison and nuances

- \`defaultIfEmpty\` and \`throwIfEmpty\` fire **only on complete-without-next**. On an **infinite** source they never fire.
- \`timeout\` counts time on the \`asyncScheduler\`. On an infinite slow stream it is the \`each\` parameter that catches "hangs" between values.
- Common pattern: the \`first()\` operator itself throws an \`EmptyError\` on an empty stream — that's essentially a built-in \`throwIfEmpty\`. If emptiness is acceptable, use \`first(predicate, defaultValue)\` or \`take(1)\`.
- \`timeout\` with the \`with\` parameter pairs nicely with \`retry\` — you get a resilient network layer.

## ⚠️ Common pitfalls

- \`defaultIfEmpty\` / \`throwIfEmpty\` are useless on infinite streams — they need a \`complete\`.
- Remember that \`first()\` already throws an \`EmptyError\` on its own; if that's undesirable, provide a default value.

## 🎯 Key takeaways

- \`timeout\` → "silent too long" = an error or a fallback via \`with\`; \`first\` for the first value, \`each\` for pauses between values.
- \`defaultIfEmpty(v)\` → substitute \`v\` if the stream completes empty.
- \`throwIfEmpty()\` → conversely, throw an error if the stream completes empty. Both react only to complete-without-next.`
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
      ru: `## 🧩 Простыми словами

Представь, что Observable — это рецепт, а не готовое блюдо. Обычно, если в рецепт зашить «текущее время», оно «застынет» в момент, когда рецепт написали. \`defer\` откладывает готовку: рецепт заново готовится **в тот момент, когда кто-то садится за стол** (подписывается), а не когда его придумали. А \`iif\` — это простой развилочный рецепт: «если гость залогинен — подай одно блюдо, иначе — другое», причём выбор делается в момент, когда гость пришёл.

### defer: ленивая фабрика на каждого подписчика

\`defer(factory)\` откладывает создание Observable до момента **подписки** и вызывает функцию \`factory\` заново **для каждого** подписчика. Это превращает «жадно вычисленный» источник в по-настоящему **cold** (холодный — то есть такой, где вычисление стартует с нуля на каждую подписку).

\`\`\`ts
// БЕЗ defer: Date.now() вычислится один раз, при создании
const bad$ = of(Date.now());
// С defer: вычисляется на каждую подписку
const good$ = defer(() => of(Date.now()));
\`\`\`

В первом случае \`Date.now()\` вызывается сразу, когда мы пишем строку, и значение «замерзает». Во втором \`factory\` вызовется только при подписке, и каждый подписчик получит актуальное время.

### Зачем это нужно

- **Свежесть**: значение или запрос формируется в момент подписки — актуальный токен, текущее время, свежий стейт.
- **Лень**: побочный эффект (например, чтение из \`localStorage\`) не выполнится, пока кто-то не подпишется. Побочный эффект — это действие, которое меняет что-то вне потока или зависит от внешнего мира.
- **Промисы**: \`defer(() => fetch(...))\` создаёт новый промис на каждую подписку. Поэтому \`retry\` реально повторяет запрос — промис становится «холодным». Обычный промис выполняется один раз и запомнить его повтор нельзя, а \`defer\` даёт свежий на каждую попытку.

### iif: выбор источника при подписке

\`iif(condition, trueSource, falseSource)\` выбирает один из двух источников по предикату (функции, возвращающей true/false), который вычисляется **при подписке**. По сути это синтаксический сахар над \`defer\`:

\`\`\`ts
iif(() => isLoggedIn(), userData$, of(GUEST));
// эквивалентно
defer(() => isLoggedIn() ? userData$ : of(GUEST));
\`\`\`

Обе записи делают одно и то же: в момент подписки проверяют условие и подсовывают нужный поток.

## ⚠️ Подводные камни

- Условие в \`iif\` вычисляется **один раз на подписку**, не реактивно — оно не «следит» за тем, как меняется \`isLoggedIn()\`. Для реактивного выбора используйте \`switchMap\` от потока-условия.
- Оба источника в \`iif\` **уже существуют** как Observable (и сами по себе ленивы), но если их **создание** имеет побочный эффект, оберните их в \`defer\`.
- \`defer\` — ключевой приём для тестируемости и корректных \`retry\`/\`repeat\`: каждая переподписка получает свежую фабрику.

## 🎯 Запомни

- \`defer\` откладывает создание потока до подписки и делает это заново для каждого подписчика — гарантия свежести и cold-поведения.
- \`defer(() => fetch(...))\` даёт свежий промис на каждый \`retry\`; голый промис так не умеет.
- \`iif\` — это \`defer\` с готовым if/else: условие проверяется один раз при подписке, не реактивно.`,
      en: `## 🧩 In plain words

Think of an Observable as a recipe, not a finished dish. Normally, if you bake "the current time" into a recipe, it freezes at the moment the recipe was written. \`defer\` postpones the cooking: the recipe is prepared fresh **the moment someone sits down at the table** (subscribes), not when it was invented. And \`iif\` is a simple forked recipe: "if the guest is logged in, serve one dish, otherwise another" — and the choice is made when the guest actually arrives.

### defer: a lazy factory per subscriber

\`defer(factory)\` postpones creating the Observable until **subscription** and calls the \`factory\` function anew **for each** subscriber. This turns an "eagerly computed" source into a truly **cold** one (cold means the work starts from scratch on each subscription).

\`\`\`ts
// WITHOUT defer: Date.now() is computed once, at creation
const bad$ = of(Date.now());
// WITH defer: computed on each subscription
const good$ = defer(() => of(Date.now()));
\`\`\`

In the first case \`Date.now()\` runs immediately when we write the line, and the value "freezes". In the second, \`factory\` runs only at subscription, so every subscriber gets the current time.

### Why you want this

- **Freshness**: the value or request is formed at subscription time — a current token, current time, fresh state.
- **Laziness**: a side effect (e.g. reading \`localStorage\`) does not run until someone subscribes. A side effect is an action that changes something outside the stream or depends on the outside world.
- **Promises**: \`defer(() => fetch(...))\` creates a new promise per subscription. So \`retry\` actually repeats the request — the promise becomes "cold". A plain promise runs once and cannot be re-run, but \`defer\` hands you a fresh one on every attempt.

### iif: choosing a source at subscription

\`iif(condition, trueSource, falseSource)\` picks one of two sources by a predicate (a function returning true/false) evaluated **at subscription**. It is essentially sugar over \`defer\`:

\`\`\`ts
iif(() => isLoggedIn(), userData$, of(GUEST));
// equivalent to
defer(() => isLoggedIn() ? userData$ : of(GUEST));
\`\`\`

Both forms do the same thing: at subscription they check the condition and hand you the right stream.

## ⚠️ Common pitfalls

- The condition in \`iif\` is evaluated **once per subscription**, not reactively — it does not "watch" \`isLoggedIn()\` changing. For a reactive choice use \`switchMap\` over a condition stream.
- Both source arguments in \`iif\` **already exist** as Observables (lazy themselves), but if their **creation** has a side effect, wrap them in \`defer\`.
- \`defer\` is a key trick for testability and correct \`retry\`/\`repeat\`: each resubscription gets a fresh factory.

## 🎯 Key takeaways

- \`defer\` postpones creating the stream until subscription and does so fresh for each subscriber — a guarantee of freshness and cold behavior.
- \`defer(() => fetch(...))\` yields a fresh promise on each \`retry\`; a bare promise cannot.
- \`iif\` is \`defer\` with a ready-made if/else: the condition is checked once at subscription, not reactively.`
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
      ru: `## 🧩 Простыми словами

Представь гонку: несколько бегунов стартуют одновременно, но нам важен только тот, кто первым пересечёт линию — остальных отпускаем. Это \`race\`. А \`fromEvent\` и \`fromFetch\` — это готовые «переходники», которые аккуратно подключают привычные вещи (клики мыши, сетевые запросы) к миру RxJS и, что важно, сами за собой убирают: снимают слушатель события или отменяют запрос, когда он больше не нужен.

### race: кто первый эмитнул — тот и победил

\`race(...sources)\` подписывается на все источники сразу и оставляет **только тот, что эмитнул первым**, отписываясь от остальных. «Эмитнул» — значит выдал первое значение.

\`\`\`ts
race(
  api.fromCache(),           // быстрый кэш
  api.fromNetwork()          // медленная сеть
).subscribe(render);         // отрисуем самый быстрый источник
\`\`\`

Применение: взять первый ответ из нескольких реплик; сделать таймаут через \`race(work$, timer(5000).pipe(map(() => throwError(...))))\` — если работа не успела за 5 секунд, побеждает таймер.

### fromEvent: обёртка над событиями

\`fromEvent(target, name)\` оборачивает DOM- или EventEmitter-API в Observable. Под капотом он сам вызывает \`addEventListener\` при подписке и \`removeEventListener\` при teardown (очистке подписки). Это и есть его преимущество над ручным \`new Observable\`: корректная установка и снятие слушателя, поддержка опций (\`{ passive, capture }\`) и hot-семантика самого DOM-события (событие уже «горячее» — оно происходит независимо от подписчиков, и все подписчики видят один и тот же поток).

\`\`\`ts
fromEvent<MouseEvent>(window, 'resize').pipe(
  debounceTime(100)
);
\`\`\`

### fromFetch: обёртка над fetch с отменой

\`fromFetch(url, init)\` (из \`rxjs/fetch\`) оборачивает \`fetch\` так, что при **отписке** запрос **отменяется** через \`AbortController\` — чего «голый» \`from(fetch(...))\` не делает. Возвращает \`Response\`; тело ответа вы читаете сами (\`switchMap(r => r.json())\`).

\`\`\`ts
fromFetch('/api/data').pipe(
  switchMap((res) => res.ok ? res.json() : throwError(() => res)),
);
\`\`\`

### Чем это лучше ручных обёрток

- \`fromEvent\` и \`fromFetch\` **управляют ресурсом**: сами ставят и снимают слушатель, сами отменяют запрос.
- \`from(promise)\` **нельзя отменить** — промис невозможно отозвать; \`fromFetch\` решает это через abort.
- \`race\` сам чистит проигравшие подписки — не нужно вручную отписываться.

## ⚠️ Подводные камни

- \`race\` решает по **первой эмиссии**, а не по завершению: источник, эмитнувший раньше, побеждает, даже если сразу после этого выдаст ошибку.
- \`fromFetch\` возвращает \`Response\` даже при HTTP-ошибке (404, 500) — это не throw. Проверяйте \`res.ok\` сами.

## 🎯 Запомни

- \`race\` — «первый эмит побеждает», проигравшие подписки закрываются автоматически.
- \`fromEvent\` сам добавляет и снимает слушатель события и знает про опции addEventListener.
- \`fromFetch\` отменяет запрос при отписке через AbortController; \`from(fetch())\` — нет.`,
      en: `## 🧩 In plain words

Picture a race: several runners start at once, but we only care about whoever crosses the line first — we let the rest go. That is \`race\`. And \`fromEvent\` and \`fromFetch\` are ready-made adapters that neatly plug familiar things (mouse clicks, network requests) into the RxJS world and, crucially, clean up after themselves: they remove the event listener or cancel the request once it is no longer needed.

### race: first to emit wins

\`race(...sources)\` subscribes to all sources at once and keeps **only the one that emits first**, unsubscribing from the rest. "Emit" means produce its first value.

\`\`\`ts
race(
  api.fromCache(),           // fast cache
  api.fromNetwork()          // slow network
).subscribe(render);         // render the fastest source
\`\`\`

Use: take the first response among replicas; build a timeout via \`race(work$, timer(5000).pipe(map(() => throwError(...))))\` — if the work does not finish within 5 seconds, the timer wins.

### fromEvent: a wrapper over events

\`fromEvent(target, name)\` wraps a DOM or EventEmitter API into an Observable. Under the hood it calls \`addEventListener\` on subscribe and \`removeEventListener\` on teardown (subscription cleanup). That is its edge over a manual \`new Observable\`: correct listener setup and removal, support for options (\`{ passive, capture }\`), and the hot semantics of the DOM event itself (the event is already "hot" — it happens regardless of subscribers, and all subscribers see the same stream).

\`\`\`ts
fromEvent<MouseEvent>(window, 'resize').pipe(
  debounceTime(100)
);
\`\`\`

### fromFetch: a wrapper over fetch with cancellation

\`fromFetch(url, init)\` (from \`rxjs/fetch\`) wraps \`fetch\` so that on **unsubscribe** the request is **aborted** via \`AbortController\` — something a bare \`from(fetch(...))\` does not do. It yields a \`Response\`; you read the body yourself (\`switchMap(r => r.json())\`).

\`\`\`ts
fromFetch('/api/data').pipe(
  switchMap((res) => res.ok ? res.json() : throwError(() => res)),
);
\`\`\`

### Why this beats manual wrappers

- \`fromEvent\` and \`fromFetch\` **manage the resource**: they add and remove the listener, cancel the request themselves.
- \`from(promise)\` **cannot be cancelled** — a promise cannot be revoked; \`fromFetch\` solves this via abort.
- \`race\` cleans up the losing subscriptions itself — no manual unsubscription needed.

## ⚠️ Common pitfalls

- \`race\` decides by the **first emission**, not by completion: the source that emits first wins even if it then errors immediately after.
- \`fromFetch\` returns a \`Response\` even on an HTTP error (404, 500) — that is not a throw. Check \`res.ok\` yourself.

## 🎯 Key takeaways

- \`race\` — "first emit wins", losing subscriptions close automatically.
- \`fromEvent\` adds and removes the event listener itself and knows about addEventListener options.
- \`fromFetch\` aborts the request on unsubscribe via AbortController; \`from(fetch())\` does not.`
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
      ru: `## 🧩 Простыми словами

Представь пульт с одной большой красной кнопкой «выключить всё». Ты подключаешь к нему разные устройства, а потом одним нажатием гасишь их разом. \`Subscription\` в RxJS — это такой пульт: он не только «то, что вернул subscribe», но и **контейнер**, куда можно складывать другие подписки и функции очистки, чтобы закрыть их все одним вызовом \`unsubscribe()\`.

### Subscription как контейнер

У \`Subscription\` три ключевых метода:

- \`add(teardown)\` — добавить дочернюю подписку или функцию очистки (teardown — это «уборка» после потока).
- \`remove(sub)\` — открепить дочернюю подписку (без вызова её очистки).
- \`unsubscribe()\` — закрыть **эту** подписку и **рекурсивно** всё, что в неё добавлено.

\`\`\`ts
const sub = new Subscription();
sub.add(stream1$.subscribe());
sub.add(stream2$.subscribe());
sub.add(() => console.log('custom cleanup'));
// одним вызовом снимаем всё
sub.unsubscribe();
\`\`\`

### Под капотом pipe

Оператор внутри строит дерево подписок: внешний subscriber делает \`add\` для внутреннего. Поэтому \`unsubscribe\` у родителя каскадно закрывает всю цепочку операторов сверху вниз — это и есть механизм распространения teardown по потоку.

## ⚠️ Подводные камни

- **add после unsubscribe**: если контейнер уже закрыт, \`add(child)\` **немедленно** вызовет очистку ребёнка. Это защита от утечек, но может удивить — подписка «умрёт» сразу.
- **флаг closed**: у \`Subscription\` есть свойство \`closed\`; повторный \`unsubscribe()\` идемпотентен (второй раз ничего плохого не сделает).
- **remove не отписывает**: \`remove\` лишь убирает подписку из списка, сам ресурс надо закрыть вручную. Полезно для «переезда» подписки в другой контейнер.
- **ошибки в teardown**: если несколько финализаторов бросают исключения, RxJS собирает их в один \`UnsubscriptionError\` (агрегат), не теряя остальные очистки.

## 🎯 Запомни

- \`Subscription\` — это контейнер: \`add\` складывает дочерние подписки и функции очистки, \`unsubscribe\` рекурсивно гасит всё.
- \`remove\` только откручивает подписку от списка, но не закрывает её — закрывать надо самому.
- Современная альтернатива ручной композиции — \`takeUntilDestroyed\`/\`DestroyRef\`, но \`Subscription.add\` удобен, когда подписок много и они создаются императивно (например, в директивах).`,
      en: `## 🧩 In plain words

Picture a remote with one big red "turn everything off" button. You plug different devices into it, then kill them all with a single press. A \`Subscription\` in RxJS is that remote: it is not just "what subscribe returned" but also a **container** where you can stack other subscriptions and cleanup functions, so you can close them all with one \`unsubscribe()\` call.

### Subscription as a container

A \`Subscription\` has three key methods:

- \`add(teardown)\` — add a child subscription or a cleanup function (teardown is the "cleanup" after a stream).
- \`remove(sub)\` — detach a child subscription (without running its cleanup).
- \`unsubscribe()\` — close **this** subscription and **recursively** everything added to it.

\`\`\`ts
const sub = new Subscription();
sub.add(stream1$.subscribe());
sub.add(stream2$.subscribe());
sub.add(() => console.log('custom cleanup'));
// tear down everything in one call
sub.unsubscribe();
\`\`\`

### Under the hood of pipe

An operator builds a tree of subscriptions internally: the outer subscriber \`add\`s the inner one. So \`unsubscribe\` on the parent cascades to close the whole operator chain top to bottom — that is the teardown-propagation mechanism along the stream.

## ⚠️ Common pitfalls

- **add after unsubscribe**: if the container is already closed, \`add(child)\` **immediately** runs the child's cleanup. It is a leak safeguard but can surprise you — the subscription "dies" at once.
- **closed flag**: \`Subscription\` has a \`closed\` property; a repeated \`unsubscribe()\` is idempotent (a second call does no harm).
- **remove does not unsubscribe**: \`remove\` only takes the subscription off the list; you must close the resource yourself. Useful for "moving" a subscription to another container.
- **errors in teardown**: if several finalizers throw, RxJS collects them into a single \`UnsubscriptionError\` (aggregate), not losing the other cleanups.

## 🎯 Key takeaways

- \`Subscription\` is a container: \`add\` stacks child subscriptions and cleanup functions, \`unsubscribe\` recursively tears everything down.
- \`remove\` only detaches a subscription from the list but does not close it — you close it yourself.
- The modern alternative to manual composition is \`takeUntilDestroyed\`/\`DestroyRef\`, but \`Subscription.add\` stays handy when there are many subscriptions created imperatively (e.g. in directives).`
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
      ru: `## 🧩 Простыми словами

Представь один водопроводный кран (источник данных), от которого нужно провести несколько труб в разные комнаты. Плохой вариант — открыть кран заново для каждой трубы: вода потечёт несколько раз, а это дорого (лишние запросы, лишние вычисления). Хочется открыть кран **один раз** и разветвить поток на всех. Именно эту задачу решают \`connectable\`, метод \`connect()\` и оператор \`connect\`.

### Проблема, которую они решают

Иногда нужно **разветвить** один источник на несколько веток обработки, но так, чтобы источник выполнился **ровно один раз**. Наивный \`combineLatest(a$.pipe(...), a$.pipe(...))\` подпишется на \`a$\` дважды — то есть дважды дёрнет источник.

### Устаревшее: publish / multicast / refCount

Старый API (\`multicast(subjectFactory)\`, \`publish()\`, \`publishReplay()\`, \`refCount()\`, \`ConnectableObservable\`) был мощным, но запутанным. «Мультикаст» — это раздача одного потока многим подписчикам через общий \`Subject\` (объект, который одновременно и Observable, и Observer). Проблема была в том, что разделение «подключения» и «подписки» через \`.connect()\` легко вело к ошибкам жизненного цикла. В RxJS 7 этот API помечен deprecated (устаревшим).

### connectable()

\`connectable(source, { connector, resetOnDisconnect })\` создаёт \`Connectable\` — Observable, который мультикастит источник через переданный \`Subject\`, но **не запускает** его, пока вы явно не вызовете \`.connect()\`.

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

Смысл: сначала подписываем всех, кому нужны данные, и только потом одним \`connect()\` открываем кран — источник срабатывает один раз для всех.

### Оператор connect()

\`connect(selector)\` — для **локального** разветвления внутри одного pipe. Источник мультикастится, а \`selector\` получает shared-поток (общий поток) и строит из него несколько веток:

\`\`\`ts
source$.pipe(
  connect((shared$) => merge(
    shared$.pipe(filter(isA), map(toA)),
    shared$.pipe(filter(isB), map(toB))
  ))
);
\`\`\`

Источник выполнится один раз, а обе ветки получат его значения.

## ⚠️ Подводные камни

- \`multicast\`, \`publish\`, \`publishReplay\`, \`refCount\`, \`ConnectableObservable\` — legacy. В новом коде не используйте, они помечены deprecated.
- \`connectable()\` не запускается сам: забудете вызвать \`.connect()\` — данные никогда не потекут.

## 🎯 Запомни

- Просто «поделить hot-поток» → \`share()\` / \`shareReplay()\`.
- Ручной контроль старта источника → \`connectable()\` + \`.connect()\`.
- Локальный fan-out (разветвление) внутри одного pipe → оператор \`connect()\`.`,
      en: `## 🧩 In plain words

Picture a single water tap (a data source) from which you need to run several pipes into different rooms. The bad option is to reopen the tap for each pipe: the water flows several times, which is expensive (extra requests, extra computation). You want to open the tap **once** and split the flow to everyone. That is exactly what \`connectable\`, the \`connect()\` method, and the \`connect\` operator solve.

### The problem they solve

Sometimes you need to **fan out** one source into several processing branches while the source runs **exactly once**. A naive \`combineLatest(a$.pipe(...), a$.pipe(...))\` subscribes to \`a$\` twice — that is, it hits the source twice.

### Deprecated: publish / multicast / refCount

The old API (\`multicast(subjectFactory)\`, \`publish()\`, \`publishReplay()\`, \`refCount()\`, \`ConnectableObservable\`) was powerful but confusing. "Multicast" means handing one stream to many subscribers through a shared \`Subject\` (an object that is both an Observable and an Observer). The trouble was that separating "connection" from "subscription" via \`.connect()\` easily led to lifecycle bugs. In RxJS 7 this API is deprecated.

### connectable()

\`connectable(source, { connector, resetOnDisconnect })\` creates a \`Connectable\` — an Observable that multicasts the source through the given \`Subject\` but **does not start** it until you explicitly call \`.connect()\`.

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

The idea: first subscribe everyone who needs the data, and only then open the tap with a single \`connect()\` — the source runs once for all of them.

### The connect() operator

\`connect(selector)\` is for **local** fan-out within a single pipe. The source is multicast, and the \`selector\` receives the shared stream and builds several branches from it:

\`\`\`ts
source$.pipe(
  connect((shared$) => merge(
    shared$.pipe(filter(isA), map(toA)),
    shared$.pipe(filter(isB), map(toB))
  ))
);
\`\`\`

The source runs once, and both branches get its values.

## ⚠️ Common pitfalls

- \`multicast\`, \`publish\`, \`publishReplay\`, \`refCount\`, \`ConnectableObservable\` are legacy. Do not use them in new code; they are deprecated.
- \`connectable()\` does not start on its own: forget to call \`.connect()\` and the data never flows.

## 🎯 Key takeaways

- Just "share a hot stream" → \`share()\` / \`shareReplay()\`.
- Manual control of when the source starts → \`connectable()\` + \`.connect()\`.
- Local fan-out within a single pipe → the \`connect()\` operator.`
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
      ru: `## 🧩 Простыми словами

Представь, что в NgRx каждое действие (action) проходит по конвейеру и превращается в новое состояние. **Meta-reducer** — это как контролёр, который стоит у входа на конвейер и может подсмотреть или изменить каждую посылку, которая проходит мимо. А **runtime checks** — это встроенные контролёры-инспекторы, которые в режиме разработки бьют по рукам, если ты случайно нарушаешь правила (например, портишь состояние напрямую).

### Что такое reducer (напоминание)

Прежде чем идти дальше — короткое напоминание. **Reducer** в NgRx — это чистая функция \`(state, action) => newState\`: она берёт текущее состояние и action (описание того, что произошло) и возвращает **новое** состояние. Она ничего не мутирует, а создаёт новый объект.

### Meta-reducer — reducer более высокого порядка

**Meta-reducer** — это функция вида \`(reducer) => reducer\`. То есть она принимает обычный reducer и возвращает новый, «обёрнутый». По сути это _middleware_ (промежуточный слой) для цикла Redux: она перехватывает **каждый** action и видит состояние **до** и **после** обычной редукции.

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

Здесь \`logger\` оборачивает исходный reducer. Внутри мы сначала вызываем настоящий reducer, получаем следующее состояние \`next\`, логируем разницу и возвращаем его дальше. Состояние не меняется — мы просто «подглядываем».

### Зачем нужны meta-reducers

- **Логирование** action и разницы состояния (diff) — удобно для отладки.
- **Hydration** (гидратация): при старте приложения восстановить состояние из \`localStorage\`, а при каждом изменении — сохранить обратно. Так состояние переживает перезагрузку страницы.
- **Reset state** при \`logout\` — обнулить всё дерево состояния одним махом.
- Undo/redo (отмена/повтор), перехват действий для аналитики.

### Runtime checks — встроенные проверки целостности

В режиме разработки NgRx включает набор проверок \`runtimeChecks\`. Технически они реализованы как встроенные meta-reducers. Каждая ловит свой класс ошибок:

- \`strictStateImmutability\` — **замораживает** состояние (Object.freeze) и ловит мутации, то есть попытки изменить state напрямую вместо возврата нового объекта.
- \`strictActionImmutability\` — то же самое, но замораживает объект action.
- \`strictStateSerializability\` — состояние должно быть сериализуемым: без \`Date\`, \`Map\`, функций и прочего, что не переживёт \`JSON.stringify\`.
- \`strictActionSerializability\` — то же требование для action.
- \`strictActionWithinNgZone\` — action должен диспатчиться внутри Angular zone (иначе UI может не обновиться).
- \`strictActionTypeUniqueness\` — типы (\`type\`) у action не должны дублироваться.

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

Эти флаги включают проверки при инициализации корневого store. Если что-то нарушишь — получишь понятную ошибку прямо в консоли.

## ⚠️ Подводные камни

- Сериализуемость иногда отключают осознанно (если в state лежат непримитивы вроде \`Map\`), но это идёт против духа Redux — лучше хранить только простые данные.
- Проверки активны только в dev-режиме: заморозка объектов дорогая, поэтому в проде их выключают ради производительности.
- Meta-reducers выполняются в порядке массива и оборачивают reducer «снаружи внутрь» — первый в массиве оказывается самым внешним слоем.

## 🎯 Запомни

- Meta-reducer — это \`(reducer) => reducer\`, middleware для Redux-цикла: видит каждый action до и после редукции.
- Типичные применения: логирование, hydration из localStorage, сброс состояния на logout.
- Runtime checks — это встроенные meta-reducers, которые в dev ловят мутации, несериализуемость и другие нарушения правил.
- В проде проверки отключают ради скорости.`,
      en: `## 🧩 In plain words

Picture NgRx as a conveyor belt: every action travels along it and gets turned into a new state. A **meta-reducer** is like an inspector standing at the entrance of that belt who can peek at — or tweak — every parcel passing by. And **runtime checks** are built-in inspectors that, in development mode, slap your hand when you accidentally break the rules (like mutating state directly).

### What a reducer is (a quick reminder)

Before we go further — a short reminder. A **reducer** in NgRx is a pure function \`(state, action) => newState\`: it takes the current state and an action (a description of what happened) and returns a **new** state. It never mutates anything; it builds a fresh object.

### Meta-reducer — a higher-order reducer

A **meta-reducer** is a function of the shape \`(reducer) => reducer\`. That is, it takes an ordinary reducer and returns a new, "wrapped" one. Essentially it is _middleware_ (a layer in between) for the Redux cycle: it intercepts **every** action and sees the state **before** and **after** the normal reduction.

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

Here \`logger\` wraps the original reducer. Inside, we first call the real reducer, get the next state \`next\`, log the difference, and pass it along. The state is not changed — we are just "peeking".

### What meta-reducers are for

- **Logging** actions and the state diff — handy for debugging.
- **Hydration**: at app start, restore state from \`localStorage\`, and on every change save it back. That way state survives a page reload.
- **Reset state** on \`logout\` — clear the whole state tree in one shot.
- Undo/redo, intercepting actions for analytics.

### Runtime checks — built-in integrity checks

In development mode NgRx enables a set of \`runtimeChecks\`. Technically they are implemented as built-in meta-reducers. Each catches its own class of mistakes:

- \`strictStateImmutability\` — **freezes** the state (Object.freeze) and catches mutations, i.e. attempts to change state directly instead of returning a new object.
- \`strictActionImmutability\` — the same, but freezes the action object.
- \`strictStateSerializability\` — state must be serializable: no \`Date\`, \`Map\`, functions, or anything else that would not survive \`JSON.stringify\`.
- \`strictActionSerializability\` — the same requirement for actions.
- \`strictActionWithinNgZone\` — actions must be dispatched inside the Angular zone (otherwise the UI may not update).
- \`strictActionTypeUniqueness\` — action \`type\` strings must not be duplicated.

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

These flags turn on the checks when the root store is initialized. Break a rule and you get a clear error right in the console.

## ⚠️ Common pitfalls

- Serializability is sometimes disabled deliberately (if state holds non-primitives like a \`Map\`), but it goes against the Redux spirit — better to store only plain data.
- Checks are active only in dev mode: freezing objects is expensive, so in production they are turned off for performance.
- Meta-reducers run in array order and wrap the reducer "outside-in" — the first one in the array becomes the outermost layer.

## 🎯 Key takeaways

- A meta-reducer is \`(reducer) => reducer\`, middleware for the Redux cycle: it sees every action before and after reduction.
- Typical uses: logging, hydration from localStorage, resetting state on logout.
- Runtime checks are built-in meta-reducers that, in dev, catch mutations, non-serializability, and other rule violations.
- In production the checks are disabled for speed.`
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
      ru: `## 🧩 Простыми словами

Глобальный NgRx Store — это как общий склад на всё приложение: удобно, когда данные нужны везде, но ради него приходится писать много «церемоний» (actions, reducers, effects). **ComponentStore** — это маленький личный ящик, привязанный к одному компоненту. Он живёт, пока живёт компонент, и умирает вместе с ним. Меньше бюрократии, но всё ещё аккуратная реактивная структура.

### Идея ComponentStore

\`@ngrx/component-store\` — это **локальный** реактивный store, привязанный к жизненному циклу компонента, без Redux-церемоний: нет actions, reducers, effects и глобального dispatch. Ты наследуешь класс от \`ComponentStore<State>\` и получаешь три примитива:

- **updater** — синхронное обновление состояния (аналог reducer): функция \`(state, value) => newState\`.
- **selector** — производный поток данных через \`this.select(...)\`. Он мемоизирован (кэширует результат) и выдаёт значение только когда оно реально изменилось (distinct).
- **effect** — принимает **Observable** входных данных и запускает side-effect (обычно \`switchMap\` к API). Он безопасно подписан на жизнь компонента: когда компонент уничтожается, подписка сама отписывается.

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

Разберём: \`super({...})\` задаёт начальное состояние. \`todos$\` — селектор, выдающий список дел. \`addTodo\` — updater, иммутабельно добавляющий элемент (\`...s\` копирует старое состояние). \`load\` — effect, который ставит флаг загрузки, идёт в API и по ответу обновляет состояние через \`patchState\`. \`patchState\` — это удобный способ обновить часть состояния, не описывая отдельный updater.

### Когда ComponentStore, а когда глобальный Store

Выбирай **ComponentStore**, когда:

- Состояние **локально** для фичи или компонента и не нужно другим частям приложения.
- Не нужен time-travel или Redux DevTools на этот срез данных.
- Хочется меньше шаблонного кода (boilerplate), но больше структуры, чем у голого \`BehaviorSubject\`.
- Состояние должно умирать вместе с компонентом (store предоставляется в \`providers\` компонента).

Выбирай **глобальный Store**, когда:

- Состояние **разделяется** многими фичами и нужен единый источник истины.
- Нужны DevTools, meta-reducers, эффекты на уровне всего приложения.

## ⚠️ Подводные камни

- \`ComponentStore\` обычно регистрируют в \`providers\` **компонента** — тогда он уничтожается вместе с ним. Если зарегистрировать его в корне, он станет синглтоном (одним на всё приложение) и потеряет смысл «локального».
- \`tapResponse\` важен: ошибка внутри effect **не должна** убить внутренний поток. Это специальный оператор NgRx, который ловит ошибку и не даёт ей оборвать подписку (тот же принцип, что и с \`catchError\` в глобальных effects).
- \`effect\` возвращает функцию: её можно вызвать без аргумента (\`this.load()\`) или передать \`Observable\` входных данных — тогда каждое новое значение перезапустит пайплайн.

## 🎯 Запомни

- ComponentStore — локальный реактивный store без Redux-церемоний: три примитива \`updater\`, \`selector\`, \`effect\`.
- Живёт и умирает вместе с компонентом, если объявлен в его \`providers\`.
- Бери его для локального состояния фичи; глобальный Store — для общих данных, DevTools и app-level эффектов.
- Используй \`tapResponse\`, чтобы ошибка не убила поток effect.`,
      en: `## 🧩 In plain words

The global NgRx Store is like a shared warehouse for the whole app: great when data is needed everywhere, but it costs a lot of "ceremony" (actions, reducers, effects). A **ComponentStore** is a small personal drawer bound to a single component. It lives as long as the component lives and dies with it. Less bureaucracy, but still a tidy reactive structure.

### The ComponentStore idea

\`@ngrx/component-store\` is a **local** reactive store bound to a component's lifecycle, without Redux ceremony: no actions, reducers, effects, or global dispatch. You extend the \`ComponentStore<State>\` class and get three primitives:

- **updater** — a synchronous state update (reducer-like): a function \`(state, value) => newState\`.
- **selector** — a derived data stream via \`this.select(...)\`. It is memoized (caches its result) and emits only when the value actually changed (distinct).
- **effect** — takes an **Observable** of inputs and runs a side-effect (usually \`switchMap\` to an API). It is safely subscribed to the component's life: when the component is destroyed, the subscription cleans itself up.

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

Let's read it: \`super({...})\` sets the initial state. \`todos$\` is a selector emitting the todo list. \`addTodo\` is an updater that immutably adds an item (\`...s\` copies the old state). \`load\` is an effect that sets a loading flag, calls the API, and on response updates the state via \`patchState\`. \`patchState\` is a convenient way to update part of the state without writing a separate updater.

### When ComponentStore vs the global Store

Choose **ComponentStore** when:

- State is **local** to a feature or component and not needed elsewhere.
- You do not need time-travel or Redux DevTools on this slice of data.
- You want less boilerplate but more structure than a bare \`BehaviorSubject\`.
- State should die with the component (the store is provided in the component's \`providers\`).

Choose the **global Store** when:

- State is **shared** across many features and needs a single source of truth.
- You need DevTools, meta-reducers, or app-level effects.

## ⚠️ Common pitfalls

- Register \`ComponentStore\` in the **component's** \`providers\` — then it is destroyed with it. If you register it at the root, it becomes a singleton (one for the whole app) and loses the point of being "local".
- \`tapResponse\` matters: an error inside an effect must **not** kill the inner stream. It is a special NgRx operator that catches the error and stops it from tearing down the subscription (same principle as \`catchError\` in global effects).
- \`effect\` returns a function: call it with no argument (\`this.load()\`) or pass an \`Observable\` of inputs — then each new value restarts the pipeline.

## 🎯 Key takeaways

- ComponentStore is a local reactive store without Redux ceremony: three primitives \`updater\`, \`selector\`, \`effect\`.
- It lives and dies with the component when declared in its \`providers\`.
- Reach for it for local feature state; use the global Store for shared data, DevTools, and app-level effects.
- Use \`tapResponse\` so an error does not kill the effect's stream.`
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
      ru: `## 🧩 Простыми словами

Представь effect как рабочего у конвейера, который слушает поток событий (actions) и на каждое реагирует — например, идёт в API. Проблема: в RxJS ошибка — это «финальное» событие. Если она долетит до главного потока, поток закроется навсегда, и рабочий больше никогда не проснётся. Один упавший запрос может «оглушить» целую фичу. Задача — ловить ошибку в укромном месте, чтобы главный поток жил вечно.

### Почему поток умирает

Effect — это **долгоживущий** Observable вида \`actions$.pipe(ofType(...), switchMap(...))\`. Здесь \`actions$\` — глобальный поток всех действий, \`ofType(...)\` фильтрует нужные, а \`switchMap\` запускает на каждое действие внутренний поток (запрос к API).

В RxJS у потока есть три исхода: \`next\` (значение), \`complete\` (успешное завершение) и \`error\` (ошибка). И \`complete\`, и \`error\` — **терминальные**: после них поток мёртв. Если ошибка дойдёт до **внешнего** потока (\`actions$\`), он получит \`error\`, закроется, и effect **перестанет реагировать** на будущие actions навсегда.

### Правило: ловить ошибку ВНУТРИ

\`catchError\` — оператор, который перехватывает ошибку и подменяет её новым потоком. Ключевое правило: он должен стоять **внутри** higher-order оператора (то есть на внутреннем потоке запроса), а не снаружи. И он должен **вернуть action** (например, failure-действие):

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

Здесь \`catchError\` живёт внутри \`switchMap\`, то есть внутри временного потока запроса. Если запрос упадёт, \`catchError\` поймает ошибку и вернёт \`of(loadUsersFailure(...))\` — новый мини-поток с одним action. Внешний \`actions$\` этого даже не заметит и продолжит слушать будущие действия. \`of(...)\` — это оператор, создающий поток из одного значения.

Если поставить \`catchError\` **снаружи** \`switchMap\`, ошибка поднимется до внешнего потока и убьёт сам effect.

### NgRx как страховочная сетка

Даже если ты забыл \`catchError\`, NgRx **автоматически переподпишется** на упавший effect и залогирует ошибку. Но это лишь страховка на крайний случай: ты потеряешь контекст ошибки, а пользователь не увидит корректного failure-action (значит, ни сообщения об ошибке, ни отката загрузки). Полагаться на это нельзя — всегда ставь свой \`catchError\`.

### Гигиена actions

«Гигиена» — это набор правил, которые делают actions предсказуемыми и отлаживаемыми:

- **Actions — это события, а не команды.** Называй их по источнику: \`[Users Page] Opened\`, а не \`loadUsers\`. Один источник события → один action. Не переиспользуй один action для несвязанных источников — иначе трудно понять, кто его вызвал.
- **Пары Success/Failure.** У каждого асинхронного action есть явные \`...Success\` и \`...Failure\`, которые обрабатывает reducer. Так состояние всегда знает и об успехе, и о провале.
- Не диспатчь action из самого reducer (reducer должен быть чистым). Не клади в action несериализуемые данные.
- \`createEffect(..., { dispatch: false })\` — для эффектов, которые не порождают новый action (навигация, показ тоста). Без этого флага effect попытается диспатчить то, что вернул, и можно зациклить store.

## ⚠️ Подводные камни

- При использовании \`exhaustMap\`, \`concatMap\` или \`mergeMap\` правило то же: оборачивай \`catchError\` **внутри** оператора. Стратегия flattening (как именно объединяются потоки) не влияет на необходимость защищать внешний поток.
- Забытый \`catchError\` не «сломает» приложение сразу благодаря авто-переподписке NgRx — из-за этого баг легко не заметить. Проверяй каждый effect.

## 🎯 Запомни

- Effect — долгоживущий поток; ошибка на внешнем потоке = терминальное событие = effect мёртв навсегда.
- Ставь \`catchError\` **внутри** \`switchMap\`/\`concatMap\`/\`exhaustMap\` и **возвращай failure-action**.
- Авто-переподписка NgRx — сетка безопасности, а не замена своему \`catchError\`.
- Гигиена actions: события, а не команды; пары Success/Failure; \`{ dispatch: false }\` для эффектов без результата.`,
      en: `## 🧩 In plain words

Picture an effect as a worker at a conveyor belt who listens to a stream of events (actions) and reacts to each — for example, by calling an API. The catch: in RxJS an error is a "final" event. If it reaches the main stream, that stream closes forever, and the worker never wakes up again. One failed request can "mute" an entire feature. The trick is to catch the error in a safe corner so the main stream lives forever.

### Why the stream dies

An effect is a **long-lived** Observable of the shape \`actions$.pipe(ofType(...), switchMap(...))\`. Here \`actions$\` is the global stream of all actions, \`ofType(...)\` filters the ones you want, and \`switchMap\` starts an inner stream (the API request) for each action.

In RxJS a stream has three outcomes: \`next\` (a value), \`complete\` (successful finish), and \`error\` (a failure). Both \`complete\` and \`error\` are **terminal**: after them the stream is dead. If an error reaches the **outer** stream (\`actions$\`), it receives \`error\`, closes, and the effect **stops reacting** to future actions forever.

### Rule: catch the error INSIDE

\`catchError\` is an operator that intercepts an error and replaces it with a new stream. The key rule: it must sit **inside** the higher-order operator (i.e. on the inner request stream), not outside. And it must **return an action** (e.g. a failure action):

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

Here \`catchError\` lives inside \`switchMap\`, i.e. inside the temporary request stream. If the request fails, \`catchError\` catches the error and returns \`of(loadUsersFailure(...))\` — a new mini-stream with a single action. The outer \`actions$\` never even notices and keeps listening to future actions. \`of(...)\` is an operator that creates a stream from a single value.

If you put \`catchError\` **outside** \`switchMap\`, the error bubbles up to the outer stream and kills the effect itself.

### NgRx as a safety net

Even if you forget \`catchError\`, NgRx **automatically resubscribes** to a failed effect and logs the error. But that is only a last-resort safety net: you lose the error context, and the user sees no proper failure action (so no error message, no undoing the loading spinner). Do not rely on it — always add your own \`catchError\`.

### Action hygiene

"Hygiene" is a set of rules that keep actions predictable and debuggable:

- **Actions are events, not commands.** Name them by their source: \`[Users Page] Opened\`, not \`loadUsers\`. One event source → one action. Do not reuse a single action for unrelated sources — otherwise it is hard to tell who fired it.
- **Success/Failure pairs.** Each async action has explicit \`...Success\` and \`...Failure\` that the reducer handles. That way the state always knows about both success and failure.
- Do not dispatch an action from a reducer (a reducer must stay pure). Do not put non-serializable data into actions.
- \`createEffect(..., { dispatch: false })\` — for effects that produce no new action (navigation, showing a toast). Without this flag the effect tries to dispatch whatever it returns, which can loop the store.

## ⚠️ Common pitfalls

- With \`exhaustMap\`, \`concatMap\`, or \`mergeMap\` the rule is the same: wrap \`catchError\` **inside** the operator. The flattening strategy (how streams are combined) does not change the need to protect the outer stream.
- A forgotten \`catchError\` will not "break" the app immediately thanks to NgRx's auto-resubscribe — which makes the bug easy to miss. Check every effect.

## 🎯 Key takeaways

- An effect is a long-lived stream; an error on the outer stream = a terminal event = the effect is dead forever.
- Put \`catchError\` **inside** \`switchMap\`/\`concatMap\`/\`exhaustMap\` and **return a failure action**.
- NgRx auto-resubscribe is a safety net, not a replacement for your own \`catchError\`.
- Action hygiene: events, not commands; Success/Failure pairs; \`{ dispatch: false }\` for effects with no result.`
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
      ru: `## 🧩 Простыми словами

SignalStore из NgRx собирается как конструктор LEGO: ты не наследуешь один большой класс, а составляешь store из маленьких кубиков-«фич». Каждый кубик добавляет свой кусочек: состояние, вычисляемые значения, методы, работу с коллекциями. А если нужен свой кубик — ты пишешь его сам и переиспользуешь в любом store. Это идея **композиции вместо наследования**.

### Композиция через features

\`signalStore(...features)\` собирает store из **функций-фич**, и каждая добавляет к стору срез возможностей. Базовые кубики:

- \`withState(initial)\` — описывает реактивное состояние; каждое поле становится \`Signal\` (реактивной ячейкой значения). Причём это **deep signals** — вложенные объекты тоже становятся сигналами.
- \`withComputed(...)\` — производные \`computed\`-сигналы: они пересчитываются автоматически и мемоизируются (кэшируют результат, пока источники не изменились). Например: \`withComputed(({ x }) => ({ doubled: computed(() => x() * 2) }))\`.
- \`withMethods\` — методы, которые обновляют состояние через \`patchState\` или запускают side-effects. У них есть доступ к store и к \`inject\` (получению зависимостей).
- \`withHooks\` — лайфхуки \`onInit\` / \`onDestroy\` (запуск кода при создании/уничтожении store).

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

Разберём: \`withState\` задаёт \`filter\` и \`loading\`. \`withEntities<User>()\` добавляет коллекцию пользователей. \`withComputed\` выдаёт \`count\` — число пользователей. \`withMethods\` описывает \`setFilter\` (меняет фильтр) и \`load\` (загружает пользователей). \`patchState(store, ...)\` — иммутабельно обновляет состояние; можно передать несколько апдейтов сразу.

### withEntities

\`withEntities<T>()\` добавляет **нормализованную** коллекцию: внутри она хранит \`entityMap\` (словарь id → объект) и массив \`ids\`, а наружу отдаёт сигнал \`entities()\` — готовый массив. «Нормализованная» значит, что элементы лежат в словаре по ключу, а не просто в массиве — так их быстрее искать и обновлять.

Обновляют коллекцию хелперами-апдейтерами, которые передаются в \`patchState\`: \`setAllEntities\` (заменить все), \`addEntity\` (добавить), \`updateEntity\` (изменить), \`removeEntity\` (удалить). Можно держать несколько коллекций сразу через \`entityConfig\` и именованные коллекции.

### rxMethod

\`rxMethod<T>(pipeline)\` — это мост между **императивным вызовом** и **миром RxJS**. Он возвращает функцию, которую можно вызвать со значением, с сигналом или с Observable. Что бы ты ни передал, вход прогоняется через заданный pipeline, а подпиской rxMethod управляет сам (он живёт в DI-контексте store). Идеален для сценариев вроде debounce-загрузки, реагирующей на сигнал-фильтр: передаёшь сигнал — и при каждом его изменении пайплайн перезапускается.

### Кастомные features

Любую переиспользуемую логику можно вынести в **свою** feature через \`signalStoreFeature(...)\` — например, \`withLoadingState()\`, \`withPagination()\`, \`withUndoRedo()\`. Такая фича типобезопасно объявляет, какие входные сигналы и методы она ожидает от store и что добавляет к нему. Это и есть ключевое отличие SignalStore от классического Store: **композиция вместо наследования** — ты собираешь поведение из кубиков, а не тянешь всё из базового класса.

## ⚠️ Подводные камни

- Deep signals означают, что для обновления нужно использовать \`patchState\` с иммутабельными обновлениями — прямой мутации объекта нет.
- \`rxMethod\` без ручного управления сам отпишется при уничтожении store — не нужно вручную добавлять \`takeUntilDestroyed\`.

## 🎯 Запомни

- SignalStore собирается из фич-функций: \`withState\`, \`withComputed\`, \`withMethods\`, \`withHooks\` — композиция вместо наследования.
- \`withEntities\` даёт нормализованную коллекцию и сигнал \`entities()\`; обновляешь через \`setAllEntities\`, \`addEntity\`, \`updateEntity\`, \`removeEntity\`.
- \`rxMethod\` — мост между императивным вызовом и RxJS-пайплайном, сам управляет подпиской.
- Свои переиспользуемые фичи создаёшь через \`signalStoreFeature(...)\`.`,
      en: `## 🧩 In plain words

NgRx's SignalStore is assembled like LEGO: you do not inherit one big class, you compose the store out of small "feature" bricks. Each brick adds its own piece: state, computed values, methods, collection handling. And if you need a custom brick, you write it yourself and reuse it in any store. This is the idea of **composition over inheritance**.

### Composition via features

\`signalStore(...features)\` assembles a store from **feature functions**, and each one adds a slice of capability. The basic bricks:

- \`withState(initial)\` — declares reactive state; each field becomes a \`Signal\` (a reactive value cell). And these are **deep signals** — nested objects become signals too.
- \`withComputed(...)\` — derived \`computed\` signals: they recompute automatically and are memoized (cache the result until their sources change). For example: \`withComputed(({ x }) => ({ doubled: computed(() => x() * 2) }))\`.
- \`withMethods\` — methods that update state via \`patchState\` or run side-effects. They have access to the store and to \`inject\` (for pulling in dependencies).
- \`withHooks\` — \`onInit\` / \`onDestroy\` lifecycle hooks (run code when the store is created/destroyed).

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

Let's read it: \`withState\` sets \`filter\` and \`loading\`. \`withEntities<User>()\` adds a users collection. \`withComputed\` exposes \`count\` — the number of users. \`withMethods\` defines \`setFilter\` (changes the filter) and \`load\` (loads users). \`patchState(store, ...)\` immutably updates the state; you can pass several updates at once.

### withEntities

\`withEntities<T>()\` adds a **normalized** collection: internally it stores an \`entityMap\` (a dictionary id → object) plus an \`ids\` array, and exposes an \`entities()\` signal — a ready-made array. "Normalized" means items live in a dictionary keyed by id, not just in a plain array — which makes them faster to look up and update.

You update the collection with updater helpers passed into \`patchState\`: \`setAllEntities\` (replace all), \`addEntity\` (add), \`updateEntity\` (change), \`removeEntity\` (delete). You can hold several collections at once via \`entityConfig\` and named collections.

### rxMethod

\`rxMethod<T>(pipeline)\` is the bridge between an **imperative call** and the **RxJS world**. It returns a function you can call with a value, a signal, or an Observable. Whatever you pass, the input is run through the given pipeline, and rxMethod manages the subscription itself (it lives in the store's DI context). It is ideal for things like a debounced load reacting to a filter signal: pass the signal, and every time it changes the pipeline reruns.

### Custom features

Any reusable logic can be extracted into your **own** feature via \`signalStoreFeature(...)\` — e.g. \`withLoadingState()\`, \`withPagination()\`, \`withUndoRedo()\`. Such a feature type-safely declares which input signals and methods it expects from the store and what it adds to it. This is the key difference between SignalStore and the classic Store: **composition over inheritance** — you assemble behavior from bricks instead of pulling everything from a base class.

## ⚠️ Common pitfalls

- Deep signals mean you must use \`patchState\` with immutable updates — there is no direct object mutation.
- \`rxMethod\` without any manual management unsubscribes on its own when the store is destroyed — you do not need to add \`takeUntilDestroyed\` by hand.

## 🎯 Key takeaways

- SignalStore is assembled from feature functions: \`withState\`, \`withComputed\`, \`withMethods\`, \`withHooks\` — composition over inheritance.
- \`withEntities\` gives a normalized collection and an \`entities()\` signal; you update it via \`setAllEntities\`, \`addEntity\`, \`updateEntity\`, \`removeEntity\`.
- \`rxMethod\` bridges an imperative call and an RxJS pipeline, and manages its own subscription.
- Build your own reusable features with \`signalStoreFeature(...)\`.`
    }
  }
];
