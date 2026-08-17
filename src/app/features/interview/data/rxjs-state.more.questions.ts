import { InterviewQuestion } from '../interfaces/question.interface';

export const RXJS_STATE_QUESTIONS_MORE: InterviewQuestion[] = [
  {
    id: 'rxjs-037',
    category: 'js-state',
    level: 'Hard',
    tags: ['scan', 'reduce', 'mergescan'],
    question: {
      ru: 'Сравните scan, reduce и mergeScan. В чём разница в эмиссии и где нужен mergeScan?',
      en: 'Compare scan, reduce, and mergeScan. How do their emissions differ and where is mergeScan needed?'
    },
    answer: {
      ru: `## Коротко

Все три — про **накопление**: берём предыдущий результат, добавляем новое значение, получаем новый результат. Отличаются только тем, **когда** отдают результат наружу и **синхронный ли шаг**.

Аналогия — копилка. \`scan\` после каждой монетки вслух называет текущую сумму. \`reduce\` молчит до конца и называет итог **один раз**, когда копилку закрыли. \`mergeScan\` каждую монетку сначала отправляет в банк на проверку, и **ответ банка** становится новой суммой.

## Три оператора — в чём разница

1. \`scan(fn, seed)\` — на **каждое** значение источника вызывает \`fn(acc, value)\` и **сразу эмитит** новый аккумулятор. Источник может быть бесконечным.
2. \`reduce(fn, seed)\` — считает так же, но **молчит** и эмитит **ровно один раз, при complete**. Если источник не завершается — не эмитит **никогда**. Формально \`reduce\` = \`scan\` + \`last()\`.
3. \`mergeScan(fn, seed, concurrent?)\` — \`fn\` возвращает **Observable**, а не готовое значение. Каждое значение внутреннего потока становится новым аккумулятором и эмитится наружу. Это «\`scan\`, у которого шаг асинхронный».

\`\`\`
source:  --1--2--3--|
scan(+): --1--3--6--|
reduce:  -----------6|
\`\`\`

## Когда что использовать

- Состояние во времени: счётчики, мини-стор, накопление прогресса → \`scan\`.
- Итог **конечного** потока: сумма, максимум, свёртка в массив → \`reduce\`.
- Следующее состояние вычисляется **запросом**: накопительная пагинация, применение действия на сервере → \`mergeScan\`.

## Пример

\`\`\`ts
// накопительная пагинация: следующий шаг зависит от того, что уже загружено
loadMore$.pipe(
  mergeScan(
    (acc: Item[], _) => api.page(acc.length).pipe(map((next) => [...acc, ...next])),
    [] as Item[],
    1 // не более одного запроса в полёте
  )
);
\`\`\`

Почему так: шаг накопления здесь — **сетевой запрос**, а обычный \`scan\` умеет только синхронный шаг. \`concurrent = 1\` делает накопление строго последовательным — эквивалент \`concatMap\` + \`scan\`.

## Что сказать на собеседовании

> \`scan\` — это \`reduce\` с промежуточными результатами: он вызывает аккумулятор на каждое значение и сразу эмитит новый аккумулятор, поэтому подходит для накопления состояния во времени. \`reduce\` накапливает так же, но эмитит одно значение при complete — фактически \`scan\` плюс \`last()\`, и на незавершающемся потоке молчит. \`mergeScan\` — это \`scan\`, у которого аккумулятор возвращает Observable: результат внутреннего потока становится новым аккумулятором. Он нужен, когда следующее состояние зависит от асинхронной операции, например в пагинации; параметр \`concurrent\` ограничивает параллельность, а \`concurrent: 1\` даёт последовательную аккумуляцию. Ключевой нюанс: \`scan\` хранит аккумулятор на каждую подписку отдельно, при переподписке seed сбрасывается, поэтому для разделяемого состояния сверху нужен \`shareReplay\`.

## Ловушки

- **Состояние — на подписку.** Второй подписчик начинает с seed заново. Для общего состояния — \`shareReplay({ bufferSize: 1, refCount: true })\`.
- **\`reduce\` на бесконечном потоке** (\`interval\`, \`fromEvent\`, \`Subject\`) молчит вечно. Классическая ошибка на собеседовании.
- **Мутация аккумулятора** (\`acc.push(x); return acc\`) ломает \`distinctUntilChanged\`, OnPush и DevTools — всегда возвращайте новый объект/массив.
- **seed необязателен.** Без него первым аккумулятором становится первое значение источника, и тип «съезжает» — на пустом потоке \`reduce\` без seed выдаст ошибку.
- **\`mergeScan\` без \`concurrent\`** ведёт себя как \`mergeMap\`: страницы могут прийти вперемешку. Для порядка ставьте \`1\`.
- **Спросят следом:** чем \`mergeScan\` отличается от \`switchScan\`. \`switchScan\` отменяет предыдущий внутренний поток при новом значении, \`mergeScan\` — нет.`,
      en: `## In short

All three are about **accumulating**: take the previous result, fold in the new value, get a new result. They differ only in **when** the result comes out and **whether the step is synchronous**.

Think of a piggy bank. \`scan\` announces the running total after every coin. \`reduce\` stays silent and announces the total **once**, when the bank is finally opened. \`mergeScan\` sends each coin to the bank to be verified first, and **the bank's reply** becomes the new total.

## Three operators — the difference

1. \`scan(fn, seed)\` — for **every** source value it calls \`fn(acc, value)\` and **immediately emits** the new accumulator. The source may be infinite.
2. \`reduce(fn, seed)\` — accumulates the same way but **stays silent** and emits **exactly once, on complete**. If the source never completes, it **never** emits. Formally \`reduce\` = \`scan\` + \`last()\`.
3. \`mergeScan(fn, seed, concurrent?)\` — \`fn\` returns an **Observable**, not a plain value. Every emission of that inner stream becomes the new accumulator and is emitted downstream. It is "\`scan\` with an async step".

\`\`\`
source:  --1--2--3--|
scan(+): --1--3--6--|
reduce:  -----------6|
\`\`\`

## When to use which

- State over time: counters, a mini-store, progress accumulation → \`scan\`.
- The total of a **finite** stream: sum, max, folding into an array → \`reduce\`.
- The next state is computed by a **request**: accumulating pagination, applying an action on the server → \`mergeScan\`.

## Example

\`\`\`ts
// accumulating pagination: the next step depends on what is already loaded
loadMore$.pipe(
  mergeScan(
    (acc: Item[], _) => api.page(acc.length).pipe(map((next) => [...acc, ...next])),
    [] as Item[],
    1 // at most one request in flight
  )
);
\`\`\`

Why this way: the accumulation step here is a **network request**, and plain \`scan\` only knows how to do a synchronous step. \`concurrent = 1\` makes accumulation strictly sequential — the equivalent of \`concatMap\` + \`scan\`.

## What to say in the interview

> \`scan\` is \`reduce\` with intermediate results: it runs the accumulator on every source value and emits the new accumulator right away, which makes it right for infinite streams and for accumulating state over time. \`reduce\` accumulates identically but emits a single value on complete — effectively \`scan\` plus \`last()\` — so on a stream that never completes it emits nothing at all. \`mergeScan\` is \`scan\` whose accumulator returns an Observable: the inner stream's emission becomes the new accumulator. You need it when the next state depends on an async operation — accumulating pagination, for instance, where the step is fetching the next page; the \`concurrent\` argument caps inner-stream parallelism, and \`concurrent: 1\` gives strictly sequential accumulation. The key nuance: \`scan\` keeps its accumulator per subscription, the seed resets on resubscription, so shared state needs a \`shareReplay\` on top.

## Gotchas

- **State is per subscription.** A second subscriber starts from the seed again. For shared state use \`shareReplay({ bufferSize: 1, refCount: true })\`.
- **\`reduce\` on an infinite stream** (\`interval\`, \`fromEvent\`, a \`Subject\`) is silent forever. A classic interview trap.
- **Mutating the accumulator** (\`acc.push(x); return acc\`) breaks \`distinctUntilChanged\`, OnPush and DevTools — always return a new object/array.
- **The seed is optional.** Without it the first source value becomes the accumulator and the type drifts — and \`reduce\` with no seed errors on an empty stream.
- **\`mergeScan\` without \`concurrent\`** behaves like \`mergeMap\`: pages may arrive out of order. Pass \`1\` if you need ordering.
- **Follow-up they will ask:** how \`mergeScan\` differs from \`switchScan\`. \`switchScan\` cancels the previous inner stream on a new value; \`mergeScan\` does not.`
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
    category: 'js-state',
    level: 'Expert',
    tags: ['expand', 'recursion', 'pagination'],
    question: {
      ru: 'Как работает оператор expand и как с его помощью рекурсивно обойти пагинацию?',
      en: 'How does the expand operator work and how do you recursively traverse pagination with it?'
    },
    answer: {
      ru: `## Коротко

\`expand\` — это **рекурсия в потоке**. Каждое значение, которое вышло наружу, тут же **подаётся обратно** на вход функции \`project\`, та возвращает новый Observable, его значения снова уходят наружу и снова возвращаются на вход. Останавливается, когда \`project\` вернёт \`EMPTY\`.

Аналогия: клубок ниток. Тянешь за конец — получаешь кусок нитки и **новый конец**. Тянешь за него — ещё кусок и ещё конец. Пока конец есть — тянем; кончился — стоп. Все вытянутые куски (включая самый первый) идут в поток.

## Как это работает по шагам

1. Источник эмитит первое значение (seed). Оно **сразу уходит наружу**.
2. Это же значение передаётся в \`project(value)\`.
3. \`project\` возвращает Observable. Всё, что он эмитит, тоже **уходит наружу** — и **каждое** из этих значений снова попадает в шаг 2.
4. Как только \`project\` вернул \`EMPTY\`, эта ветка рекурсии закрывается. Когда закрылись все ветки — поток завершается.

\`\`\`
seed --> project --> v1 --> project --> v2 --> project --> EMPTY
эмитит:  seed, v1, v2
\`\`\`

## Пример

\`\`\`ts
// cursor-based API: адрес следующей страницы известен только ПОСЛЕ ответа
api.getPage(1).pipe(
  expand((res) => res.next ? api.getPage(res.next) : EMPTY),
  concatMap((res) => res.items), // развернуть страницы в отдельные элементы
  toArray()                      // собрать всё в один массив
);
\`\`\`

Почему так: обычный \`mergeMap\` умеет сходить за следующей страницей **один раз**, а \`expand\` повторяет этот шаг столько раз, сколько нужно, — и условие выхода (\`EMPTY\`) вы задаёте сами. Тот же приём обходит **деревья**: каждый узел «раскрывается» в своих детей — получается BFS.

## Что сказать на собеседовании

> \`expand\` — это рекурсивный \`mergeMap\`: результат проекции не просто уходит подписчику, а снова подаётся в ту же проекцию, и так по кругу, пока она не вернёт \`EMPTY\`. Эмитятся все значения, включая исходное. Классический кейс — обход cursor-based пагинации, когда ссылка на следующую страницу приходит только вместе с текущей: \`expand(res => res.next ? api.getPage(res.next) : EMPTY)\`. По умолчанию \`concurrent\` равен \`Infinity\`, то есть ветки рекурсии идут параллельно как в \`mergeMap\`; если нужен строгий порядок страниц, ставим \`concurrent: 1\` и получаем поведение \`concatMap\`. Главный риск — забыть условие выхода: без \`EMPTY\` поток никогда не завершится. По сути \`expand\` — это генератор, управляемый предыдущим результатом, в отличие от \`scan\` и \`reduce\`, которые управляются входным потоком.

## Ловушки

- **Нет условия выхода — бесконечная рекурсия.** \`project\` обязан когда-то вернуть \`EMPTY\`; страховка сверху — \`take(n)\` или \`takeWhile\`.
- **Порядок не гарантирован.** По умолчанию \`concurrent = Infinity\`: страницы могут прийти вперемешку. Нужен порядок — \`expand(fn, 1)\`.
- **Seed тоже эмитится.** Первое значение уходит наружу как есть — если оно вам не нужно, отфильтруйте (\`skip(1)\`) или преобразуйте.
- **\`takeWhile\` без \`true\`-флага отрежет последнюю страницу.** Второй аргумент \`inclusive\` включает значение, на котором условие стало ложным.
- **Каждый шаг — новый сетевой запрос.** На больших коллекциях это лавина: думайте о лимите страниц и об отмене (\`takeUntilDestroyed\`).
- **Спросят следом:** чем \`expand\` отличается от \`repeat\`. \`repeat\` переподписывается на **тот же** источник, \`expand\` строит **новый** Observable из предыдущего результата.`,
      en: `## In short

\`expand\` is **recursion inside a stream**. Every value that goes out is immediately **fed back** into the \`project\` function, which returns a new Observable whose values also go out — and come straight back in. It stops when \`project\` returns \`EMPTY\`.

Analogy: a ball of yarn. You pull the loose end and get a length of thread plus **a new loose end**. Pull that one — another length, another end. As long as there is an end, keep pulling; when there is none, stop. Every length you pulled (including the very first) goes into the stream.

## How it works, step by step

1. The source emits its first value (the seed). It **goes out immediately**.
2. That same value is passed into \`project(value)\`.
3. \`project\` returns an Observable. Everything it emits **also goes out** — and **each** of those values goes back to step 2.
4. As soon as \`project\` returns \`EMPTY\`, that branch of the recursion closes. When all branches are closed, the stream completes.

\`\`\`
seed --> project --> v1 --> project --> v2 --> project --> EMPTY
emits:   seed, v1, v2
\`\`\`

## Example

\`\`\`ts
// cursor-based API: the next page's address is known only AFTER the response
api.getPage(1).pipe(
  expand((res) => res.next ? api.getPage(res.next) : EMPTY),
  concatMap((res) => res.items), // unwrap pages into individual items
  toArray()                      // collect everything into one array
);
\`\`\`

Why this way: a plain \`mergeMap\` can fetch the next page **once**, whereas \`expand\` repeats that step as many times as needed — and you define the exit condition (\`EMPTY\`) yourself. The same trick traverses **trees**: each node "expands" into its children, giving you a BFS.

## What to say in the interview

> \`expand\` is a recursive \`mergeMap\`: the projection's result is not just handed to the subscriber, it is fed back into the same projection, round and round, until the projection returns \`EMPTY\`. All values are emitted, the seed included. The classic use case is walking cursor-based pagination, where the link to the next page only arrives with the current one: \`expand(res => res.next ? api.getPage(res.next) : EMPTY)\`. \`concurrent\` defaults to \`Infinity\`, so recursion branches run in parallel just like in \`mergeMap\`; if you need strict page ordering, pass \`concurrent: 1\` and you get \`concatMap\` behavior. The main risk is forgetting the exit condition — without \`EMPTY\` the stream never completes. Conceptually \`expand\` is a generator driven by the previous result, unlike \`scan\` and \`reduce\`, which are driven by the input stream.

## Gotchas

- **No exit condition means infinite recursion.** \`project\` must eventually return \`EMPTY\`; a \`take(n)\` or \`takeWhile\` on top is a cheap safety net.
- **Order is not guaranteed.** \`concurrent\` defaults to \`Infinity\`, so pages can interleave. Need order? Use \`expand(fn, 1)\`.
- **The seed is emitted too.** The first value goes out unchanged — filter it (\`skip(1)\`) or transform it if you do not want it.
- **\`takeWhile\` without the \`true\` flag drops the last page.** The second \`inclusive\` argument keeps the value that made the predicate false.
- **Every step is a fresh network request.** On large collections that is an avalanche: think about a page cap and about cancellation (\`takeUntilDestroyed\`).
- **Follow-up they will ask:** how \`expand\` differs from \`repeat\`. \`repeat\` resubscribes to the **same** source; \`expand\` builds a **new** Observable out of the previous result.`
    }
  },
  {
    id: 'rxjs-039',
    category: 'js-state',
    level: 'Hard',
    tags: ['groupby', 'partition', 'higher-order'],
    question: {
      ru: 'Как работают groupBy и partition? В чём опасность groupBy в долгоживущих потоках?',
      en: 'How do groupBy and partition work? What is the danger of groupBy in long-lived streams?'
    },
    answer: {
      ru: `## Коротко

Оба оператора **разводят один поток по нескольким дорожкам**. \`partition\` делает ровно **две** дорожки по вопросу «да/нет». \`groupBy\` делает **сколько угодно** дорожек — по одной на каждый новый ключ.

Аналогия: сортировка почты. \`partition\` — два лотка: «срочное» и «остальное». \`groupBy\` — стеллаж, где для **каждого нового адресата** заводится своя ячейка. И вот тут ловушка: ячейки заводятся сами, а убирать их за собой RxJS не будет — стеллаж растёт, пока источник не завершится.

## Как это работает по шагам

1. \`partition(source$, predicate)\` возвращает **кортеж** \`[passed$, failed$]\` — это буквально два \`filter\` над одним источником.
2. \`groupBy(keyFn)\` на каждое значение считает ключ. Ключ новый — создаётся новый **\`GroupedObservable\`** (внутри это \`Subject\`) и он эмитится наружу. У него есть поле \`.key\`.
3. Ключ уже был — значение просто уходит в **существующую** группу.
4. Наружу идёт поток **потоков**, поэтому дальше почти всегда стоит \`mergeMap\`: он подписывается на каждую группу и обрабатывает её независимо.
5. Группа живёт **до complete источника** — или до срабатывания \`duration\`-селектора, если вы его задали.

## Пример

\`\`\`ts
// свой throttle НА КАЖДОГО пользователя, а не один общий
events$.pipe(
  groupBy((e) => e.userId, {
    duration: (g) => g.pipe(debounceTime(30000)) // группа закрывается после 30с тишины
  }),
  mergeMap((group$) => group$.pipe(
    throttleTime(1000),
    map((e) => ({ user: group$.key, e }))
  ))
);
\`\`\`

Почему так: без \`groupBy\` \`throttleTime\` был бы **один на всех** и глушил бы события чужих пользователей. \`duration\` закрывает простаивающую группу, чтобы \`Subject\`-ы не копились; при новом событии с тем же ключом группа создастся заново.

## Что сказать на собеседовании

> \`partition\` разбивает поток на две ветки по булеву предикату и возвращает кортеж — сахар над парой \`filter\`. \`groupBy\` создаёт динамическое число подпотоков, по одному на уникальный ключ, и эмитит \`GroupedObservable\` с полем \`key\`; дальше обычно идёт \`mergeMap\`, который подписывается на каждую группу и применяет операторы независимо — например свой \`throttleTime\` на каждого пользователя. Главная опасность \`groupBy\` в долгоживущих потоках: каждая группа — внутренний \`Subject\`, живущий до complete источника, поэтому на бесконечном потоке с растущим множеством ключей группы накапливаются — прямая утечка памяти. Лечится \`duration\`-селектором, который закрывает группу по таймеру неактивности; и обязательно нужно подписаться на каждую группу, иначе значения копятся в неподписанном \`GroupedObservable\`.

## Ловушки

- **Утечка на бесконечном потоке.** Растущее множество ключей (uuid, id заказов) = растущее число \`Subject\`-ов. Всегда думайте про \`duration\`.
- **Не подписались на группу — данные копятся.** \`GroupedObservable\` буферизует значения, пока на него никто не подписан; \`mergeMap\`/\`merge\` обязателен.
- **\`switchMap\` вместо \`mergeMap\` после \`groupBy\`** убьёт все предыдущие группы, оставив только последнюю — почти всегда это баг.
- **Группа после закрытия по \`duration\` пересоздаётся с нуля** — состояние внутри неё (\`scan\`, \`distinctUntilChanged\`) сбрасывается.
- **\`partition\` — это две подписки на источник.** Если он холодный, работа выполнится дважды; ставьте \`share()\` перед \`partition\`.
- **Спросят следом:** зачем \`partition\`, если есть \`filter\`. Ответ: читаемость и невозможность «потерять» вторую ветку — она возвращается явно.`,
      en: `## In short

Both operators **fan one stream out into several lanes**. \`partition\` gives you exactly **two** lanes, split by a yes/no question. \`groupBy\` gives you **as many lanes as needed** — one per distinct key.

Analogy: sorting mail. \`partition\` is two trays: "urgent" and "everything else". \`groupBy\` is a shelf where **a new pigeonhole appears for every new recipient**. And that is where the trap lives: pigeonholes appear by themselves, but RxJS will not clear them away — the shelf keeps growing until the source completes.

## How it works, step by step

1. \`partition(source$, predicate)\` returns a **tuple** \`[passed$, failed$]\` — literally two \`filter\`s over the same source.
2. \`groupBy(keyFn)\` computes a key for each value. A new key creates a new **\`GroupedObservable\`** (a \`Subject\` inside) and emits it downstream. It exposes a \`.key\` field.
3. A key that already exists — the value simply goes into the **existing** group.
4. What comes out is a stream **of streams**, so a \`mergeMap\` almost always follows: it subscribes to every group and processes each one independently.
5. A group lives **until the source completes** — or until its \`duration\` selector fires, if you supplied one.

## Example

\`\`\`ts
// a throttle PER USER instead of one shared throttle
events$.pipe(
  groupBy((e) => e.userId, {
    duration: (g) => g.pipe(debounceTime(30000)) // close the group after 30s of silence
  }),
  mergeMap((group$) => group$.pipe(
    throttleTime(1000),
    map((e) => ({ user: group$.key, e }))
  ))
);
\`\`\`

Why this way: without \`groupBy\` the \`throttleTime\` would be **shared by everyone** and would swallow other users' events. The \`duration\` selector closes idle groups so the \`Subject\`s do not pile up; a later event with the same key simply recreates the group.

## What to say in the interview

> \`partition\` splits a stream into a fixed two branches by a boolean predicate and returns them as a tuple — it is sugar over a pair of \`filter\`s. \`groupBy\` creates a dynamic number of substreams, one per distinct key, and emits \`GroupedObservable\`s carrying a \`key\` field; it is normally followed by a \`mergeMap\` that subscribes to each group and applies operators to it independently — a per-user \`throttleTime\`, for example. The main danger of \`groupBy\` in long-lived streams is that each group is an inner \`Subject\` which by default lives until the source completes, so on an infinite stream with an ever-growing key set — uuids, say — groups accumulate and that is a straight memory leak. The fix is the \`duration\` selector, which closes a group after an idle timeout; and you must subscribe to every group, otherwise values just buffer inside an unsubscribed \`GroupedObservable\`.

## Gotchas

- **Leak on an infinite stream.** A growing key set (uuids, order ids) means a growing number of \`Subject\`s. Always think about \`duration\`.
- **An unsubscribed group buffers.** \`GroupedObservable\` piles values up while nobody is subscribed; \`mergeMap\`/\`merge\` is mandatory.
- **\`switchMap\` instead of \`mergeMap\` after \`groupBy\`** kills every previous group and keeps only the latest — almost always a bug.
- **A group recreated after \`duration\` starts from scratch** — any state inside it (\`scan\`, \`distinctUntilChanged\`) resets.
- **\`partition\` means two subscriptions to the source.** If it is cold, the work runs twice; put a \`share()\` before \`partition\`.
- **Follow-up they will ask:** why bother with \`partition\` when \`filter\` exists. Answer: readability, plus you cannot silently "lose" the other branch — it is returned explicitly.`
    }
  },
  {
    id: 'rxjs-040',
    category: 'js-state',
    level: 'Hard',
    tags: ['buffer', 'window', 'bufferpattern'],
    question: {
      ru: 'Объясните семейство buffer и window (bufferCount, bufferTime, windowToggle). В чём разница buffer vs window?',
      en: 'Explain the buffer and window families (bufferCount, bufferTime, windowToggle). What is the difference between buffer and window?'
    },
    answer: {
      ru: `## Коротко

Всё семейство делает одно: **копит значения порциями** и отдаёт порцию, когда «окно» закрылось. Различаются они двумя вещами: **чем закрывается окно** (счёт, время, сигнал) и **в каком виде отдаётся порция**.

- \`buffer*\` отдаёт **готовый массив**: \`Observable<T[]>\`.
- \`window*\` отдаёт **вложенный поток**: \`Observable<Observable<T>>\`.

Аналогия: конвейер и коробки. \`buffer\` — коробку заклеили и отдали целиком, содержимое видно только когда откроешь. \`window\` — коробка открытая, вещи падают в неё **по одной прямо сейчас**, и над ней можно поставить свой мини-конвейер (\`count()\`, \`reduce()\`, \`debounce\`). Window мощнее, но на каждую коробку нужно **подписаться**.

## Чем закрывается окно — пять стратегий

1. \`bufferCount(n, every?)\` — **по количеству**: каждые \`n\` значений. Второй аргумент \`every\` даёт **скользящие** окна (новое окно открывается каждые \`every\` значений).
2. \`bufferTime(ms)\` — **по таймеру**: каждые \`ms\` миллисекунд.
3. \`buffer(closing$)\` — **по чужому сигналу**: буфер закрывается на каждую эмиссию \`closing$\`.
4. \`bufferWhen(fn)\` — то же, но Observable-закрыватель **создаётся заново** после каждого окна (динамическая длина окна).
5. \`bufferToggle(open$, closeFn)\` — окна **открываются и закрываются** по двум разным сигналам, могут перекрываться. Классика: «запись между mousedown и mouseup».

У \`window*\` ровно те же пять стратегий: \`windowCount\`, \`windowTime\`, \`window\`, \`windowWhen\`, \`windowToggle\`.

\`\`\`
source:         a-b-c-d-e|
bufferCount(2): ---[a,b]---[c,d]--([e])|
\`\`\`

## Пример

\`\`\`ts
// buffer: батчим аналитику — раз в 5 секунд ИЛИ по 20 событий
events$.pipe(
  bufferTime(5000, null, 20),
  filter((batch) => batch.length > 0),
  concatMap((batch) => api.send(batch))
);

// window: сколько кликов было в каждой секунде
clicks$.pipe(
  windowTime(1000),
  mergeMap((win$) => win$.pipe(count()))
);
\`\`\`

Почему так: в первом случае нужен **весь массив разом**, чтобы отправить его одним запросом — это работа для \`buffer\`. Во втором мы не хотим держать клики в памяти, нам нужно только число — \`window\` + \`count()\` считает на лету.

## Что сказать на собеседовании

> Это одно семейство: группировка значений по количеству, времени или внешнему сигналу. Разница принципиальная: \`buffer*\` эмитит массив накопленных значений, \`Observable<T[]>\`, а \`window*\` — вложенный Observable, то есть higher-order оператор, на внутренние потоки которого нужно подписываться через \`mergeMap\`. Window мощнее: к каждому окну можно применить свой конвейер и агрегировать на лету, не удерживая значения в памяти. Стратегии закрытия одинаковы: \`Count\` по числу значений, \`Time\` по таймеру, \`When\` по динамическому Observable, \`Toggle\` по паре сигналов открытия и закрытия для записи drag. На практике батчинг и детект двойного клика — \`buffer\`, а «событий в секунду» — \`window\` плюс \`count\`. Нюанс: \`bufferTime\` спокойно эмитит пустые массивы, если за интервал ничего не пришло, — их приходится отфильтровывать.

## Ловушки

- **Пустые массивы.** \`bufferTime\` тикает по таймеру независимо от данных — почти всегда нужен \`filter((b) => b.length > 0)\`.
- **Частичный буфер на complete.** Когда источник завершается, недозаполненное окно всё равно эмитится — учитывайте это в тестах.
- **Забыли подписаться на окно.** У \`window*\` внутренний поток без подписки просто теряет значения; без \`mergeMap\` оператор бесполезен.
- **Буфер растёт бесконечно**, если закрывающий сигнал не приходит (\`buffer(never$)\`) — на быстром источнике это утечка памяти.
- **Скользящие окна дублируют значения.** \`bufferCount(3, 1)\` кладёт каждое значение в три окна — нагрузка на downstream растёт втрое.
- **Спросят следом:** чем \`bufferTime\` отличается от \`throttleTime\`/\`debounceTime\`. Ответ: те **выбрасывают** лишние значения, а buffer/window **сохраняют все** и лишь меняют упаковку.`,
      en: `## In short

The whole family does one thing: **collects values in batches** and releases a batch when its "window" closes. They differ in two ways: **what closes the window** (a count, a timer, a signal) and **what shape the batch comes out in**.

- \`buffer*\` gives you a **ready-made array**: \`Observable<T[]>\`.
- \`window*\` gives you a **nested stream**: \`Observable<Observable<T>>\`.

Analogy: a conveyor and boxes. \`buffer\` hands you a sealed box — you see the contents only after opening it. \`window\` hands you an open box with items dropping in **one at a time, live**, so you can run your own mini-conveyor over it (\`count()\`, \`reduce()\`, \`debounce\`). Window is more powerful, but every box needs to be **subscribed to**.

## What closes a window — five strategies

1. \`bufferCount(n, every?)\` — **by count**: every \`n\` values. The \`every\` argument produces **sliding** windows (a new window opens every \`every\` values).
2. \`bufferTime(ms)\` — **by timer**: every \`ms\` milliseconds.
3. \`buffer(closing$)\` — **by an external signal**: the buffer closes on each emission of \`closing$\`.
4. \`bufferWhen(fn)\` — the same, but the closing Observable is **created anew** after each window (dynamic window length).
5. \`bufferToggle(open$, closeFn)\` — windows **open and close** on two separate signals and may overlap. The classic use: "record between mousedown and mouseup".

\`window*\` has exactly the same five strategies: \`windowCount\`, \`windowTime\`, \`window\`, \`windowWhen\`, \`windowToggle\`.

\`\`\`
source:         a-b-c-d-e|
bufferCount(2): ---[a,b]---[c,d]--([e])|
\`\`\`

## Example

\`\`\`ts
// buffer: batch analytics — every 5 seconds OR every 20 events
events$.pipe(
  bufferTime(5000, null, 20),
  filter((batch) => batch.length > 0),
  concatMap((batch) => api.send(batch))
);

// window: how many clicks happened in each second
clicks$.pipe(
  windowTime(1000),
  mergeMap((win$) => win$.pipe(count()))
);
\`\`\`

Why this way: the first case needs the **whole array at once** to send it in a single request — that is \`buffer\`'s job. The second does not need the clicks in memory at all, only their count — \`window\` plus \`count()\` tallies them on the fly.

## What to say in the interview

> This is one family of operators that groups values by count, by time, or by an external signal. The split between the two branches is fundamental: \`buffer*\` emits an array of collected values, i.e. \`Observable<T[]>\`, while \`window*\` emits a nested Observable, which makes it a higher-order operator whose inner streams must be subscribed to, usually via \`mergeMap\`. Window is more powerful because you can run a whole operator pipeline over each window and aggregate on the fly without holding values in memory. The closing strategies are identical on both sides: \`Count\` by number of values, \`Time\` by timer, \`When\` by a dynamically created Observable, and \`Toggle\` by a pair of open/close signals — perfect for recording a drag between mousedown and mouseup. In practice, batching network requests and double-click detection are \`buffer\` jobs, while "events per second" is \`window\` plus \`count\`. One nuance: \`bufferTime\` happily emits empty arrays when nothing arrived during the interval, so you usually filter those out.

## Gotchas

- **Empty arrays.** \`bufferTime\` ticks on its timer regardless of data — you almost always need \`filter((b) => b.length > 0)\`.
- **Partial buffer on complete.** When the source completes, a half-filled window is emitted anyway — account for it in tests.
- **Forgetting to subscribe to a window.** An unsubscribed inner stream of \`window*\` simply drops its values; without \`mergeMap\` the operator is useless.
- **The buffer grows without bound** if the closing signal never arrives (\`buffer(never$)\`) — on a fast source that is a memory leak.
- **Sliding windows duplicate values.** \`bufferCount(3, 1)\` puts every value into three windows — triple the downstream load.
- **Follow-up they will ask:** how \`bufferTime\` differs from \`throttleTime\`/\`debounceTime\`. Answer: those **discard** surplus values, while buffer/window **keep them all** and only change the packaging.`
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
    category: 'js-state',
    level: 'Medium',
    tags: ['pairwise', 'startwith', 'state'],
    question: {
      ru: 'Зачем нужны pairwise и startWith? Покажите типичные сценарии (дельта, начальное значение).',
      en: 'What are pairwise and startWith for? Show typical scenarios (delta, initial value).'
    },
    answer: {
      ru: `## Коротко

\`pairwise()\` даёт возможность **сравнить новое со старым**: вместо одного значения он отдаёт пару \`[предыдущее, текущее]\`. \`startWith(v)\` **подкладывает значение в начало** потока, до того как источник что-то выдаст.

Аналогия: \`pairwise\` — это зеркало заднего вида: вы всегда видите не только где вы сейчас, но и где были секунду назад. \`startWith\` — это «нулевой километр» на дороге: пока машина не поехала, счётчик уже показывает старт, а не пустоту.

## Как это работает по шагам

1. \`pairwise\` запоминает первое значение и **ничего не эмитит** — паре пока не с чем сравниваться.
2. Приходит второе значение — эмитится \`[a, b]\`. Приходит третье — \`[b, c]\`. И так далее: каждое значение успевает побывать и «текущим», и «предыдущим».
3. \`startWith(v)\` при подписке **синхронно** эмитит \`v\`, и только потом подписывается на источник. Тип результата расширяется до объединения (\`T | typeof v\`).
4. Отсюда их дуэт: \`startWith\` даёт \`pairwise\` то самое недостающее «предыдущее», чтобы пара появилась **уже на первом** реальном значении.

\`\`\`
source:            a--b--c--d|
pairwise:          ---[a,b]-[b,c]-[c,d]|
startWith(0)+pair: -[0,a]-[a,b]-[b,c]-[c,d]|
\`\`\`

## Пример

\`\`\`ts
// направление скролла
scrollY$.pipe(
  pairwise(),
  map(([prev, curr]) => curr > prev ? 'down' : 'up'),
  distinctUntilChanged()
);

// дельта значения, включая самую первую
value$.pipe(
  startWith(0),
  pairwise(),
  map(([prev, curr]) => curr - prev)
);
\`\`\`

Почему так: без \`startWith\` первая дельта **потерялась бы** — \`pairwise\` пропускает самое первое значение источника. Тот же приём нужен, чтобы \`combineLatest\` эмитил сразу: пока каждый его источник не выдаст хотя бы одно значение, комбинация молчит, и \`startWith(DEFAULT)\` эту блокировку снимает.

## Что сказать на собеседовании

> \`pairwise\` буферизует последнее значение и эмитит кортеж «предыдущее и текущее», поэтому первое значение источника наружу не выходит, а становится previous для второго. Это стандартный способ посчитать дельту или направление изменения: скролл вверх или вниз, рост или падение метрики. \`startWith\` синхронно эмитит заданные значения в момент подписки, до первого значения источника, и расширяет тип до объединения. Применения: начальное состояние UI до прихода данных, снятие блокировки \`combineLatest\` и «подкормка» \`pairwise\` или \`scan\` стартовым значением. Отсюда классический дуэт \`startWith\` плюс \`pairwise\`: стартовое значение играет роль previous для первого реального, и первая дельта не теряется. Нюанс: \`take(1)\` выше по конвейеру заберёт именно стартовое значение, а не данные.

## Ловушки

- **\`pairwise\` съедает первое значение.** На потоке из одного значения он не эмитит **ничего**. Лечится \`startWith\`.
- **\`take(1)\` после \`startWith\` вернёт стартовое значение**, а не данные — та же ловушка в юнит-тестах.
- **\`startWith\` работает на каждую подписку.** На cold-потоке с двумя подписчиками стартовое значение придёт дважды.
- **Пара — это ссылки на объекты.** Если вы мутируете объект вместо создания нового, \`prev\` и \`curr\` окажутся одним и тем же объектом, и сравнение всегда даст «не изменилось».
- **\`startWith\` не то же самое, что \`BehaviorSubject\`.** \`BehaviorSubject\` хранит **последнее** значение, \`startWith\` всегда подставляет **фиксированное**.
- **Спросят следом:** как получить не пару, а окно из N последних. Ответ: \`scan\` с накоплением хвоста массива или \`bufferCount(n, 1)\`.`,
      en: `## In short

\`pairwise()\` lets you **compare the new with the old**: instead of one value it emits the tuple \`[previous, current]\`. \`startWith(v)\` **slips a value in at the front** of the stream, before the source produces anything.

Analogy: \`pairwise\` is a rear-view mirror — you always see not just where you are but where you were a second ago. \`startWith\` is the "kilometre zero" marker on a road: before the car moves, the counter already shows a starting point instead of nothing.

## How it works, step by step

1. \`pairwise\` remembers the first value and **emits nothing** — there is nothing yet to pair it with.
2. The second value arrives — it emits \`[a, b]\`. The third — \`[b, c]\`. And so on: every value gets to be both "current" and later "previous".
3. \`startWith(v)\` **synchronously** emits \`v\` on subscribe, and only then subscribes to the source. The result type widens to a union (\`T | typeof v\`).
4. Hence the duo: \`startWith\` supplies \`pairwise\` with the missing "previous", so a pair appears **on the very first** real value.

\`\`\`
source:            a--b--c--d|
pairwise:          ---[a,b]-[b,c]-[c,d]|
startWith(0)+pair: -[0,a]-[a,b]-[b,c]-[c,d]|
\`\`\`

## Example

\`\`\`ts
// scroll direction
scrollY$.pipe(
  pairwise(),
  map(([prev, curr]) => curr > prev ? 'down' : 'up'),
  distinctUntilChanged()
);

// value delta, including the very first one
value$.pipe(
  startWith(0),
  pairwise(),
  map(([prev, curr]) => curr - prev)
);
\`\`\`

Why this way: without \`startWith\` the first delta would be **lost** — \`pairwise\` swallows the source's very first value. The same trick makes \`combineLatest\` emit immediately: it stays silent until every source has produced at least one value, and \`startWith(DEFAULT)\` removes that block.

## What to say in the interview

> \`pairwise\` buffers the last value and emits a "previous and current" tuple, so the source's first value never comes out on its own — it becomes the previous for the second. That is the standard way to compute a delta or a direction of change: scrolling up or down, a metric rising or falling. \`startWith\` synchronously emits the given values at subscription time, before the source's first value, and widens the result type to a union. It has three typical uses: an initial UI state before data arrives, unblocking \`combineLatest\`, which stays silent until every source has emitted at least once, and priming \`pairwise\` or \`scan\` with a starting value. Hence the classic \`startWith\` plus \`pairwise\` duo: the starting value acts as the previous for the very first real value, so the first delta is not lost. The nuance people forget is that \`startWith\` emits synchronously on subscribe, so a \`take(1)\` further down the pipe grabs the starting value rather than real data — a common bug both in code and in tests.

## Gotchas

- **\`pairwise\` swallows the first value.** On a single-value stream it emits **nothing at all**. Fix it with \`startWith\`.
- **\`take(1)\` after \`startWith\` returns the starting value**, not the data — the same trap bites in unit tests.
- **\`startWith\` runs per subscription.** On a cold stream with two subscribers the starting value is delivered twice.
- **The pair holds object references.** If you mutate an object instead of creating a new one, \`prev\` and \`curr\` are the same object and the comparison always says "unchanged".
- **\`startWith\` is not a \`BehaviorSubject\`.** A \`BehaviorSubject\` stores the **latest** value; \`startWith\` always injects a **fixed** one.
- **Follow-up they will ask:** how to get a window of the last N values instead of a pair. Answer: a \`scan\` that keeps the tail of an array, or \`bufferCount(n, 1)\`.`
    }
  },
  {
    id: 'rxjs-042',
    category: 'js-state',
    level: 'Medium',
    tags: ['delay', 'delaywhen', 'timing'],
    question: {
      ru: 'Чем delay отличается от delayWhen? Как реализовать переменную задержку?',
      en: 'How does delay differ from delayWhen? How do you implement a variable delay?'
    },
    answer: {
      ru: `## Коротко

Оба оператора **придерживают значения** и отдают их позже. \`delay\` держит **всех одинаково** — фиксированное число миллисекунд. \`delayWhen\` держит **каждого столько, сколько скажет отдельный Observable**, свой для каждого значения.

Аналогия: гардероб. \`delay\` — правило «вещь выдаём ровно через 5 минут после сдачи», одинаковое для всех. \`delayWhen\` — «вещь выдаём, когда прозвенит именно ваш звоночек»: у одного он звенит сразу, у другого через минуту, у третьего — когда закончится спектакль (внешний сигнал).

## Как это работает по шагам

1. \`delay(ms)\` при каждом \`next\` ставит таймер на \`ms\` и **буферизует** значение. Через \`ms\` значение уходит дальше. Так же сдвигается \`error\`. Форма потока сохраняется — все интервалы между значениями остаются прежними, вся кривая просто едет вправо.
2. \`delayWhen(fn)\` на каждое значение вызывает \`fn(value, index)\` и получает **Observable-звоночек**.
3. Оператор подписывается на этот звоночек и ждёт его **первой эмиссии** (что именно он эмитит — неважно). После неё значение уходит дальше.
4. Звоночки разных значений тикают **параллельно и независимо**, поэтому порядок значений на выходе может поменяться.

\`\`\`
source: a-b--c|
delay:  --a-b--c|   (каждое на +N, форма та же)
\`\`\`

## Пример

\`\`\`ts
// задержка ЗАВИСИТ ОТ значения: чем выше приоритет, тем раньше уйдёт
source$.pipe(
  delayWhen((value) => timer(value.priority * 100))
);

// придержать всё, пока приложение не будет готово
source$.pipe(
  delayWhen(() => ready$)
);

// ступенчатая рассылка: каждое следующее письмо на 200мс позже
emails$.pipe(
  concatMap((email, i) => of(email).pipe(delay(i * 200)))
);
\`\`\`

Почему так: \`delay\` не умеет смотреть на значение — у него одно число на всех. \`delayWhen\` получает значение в селектор, поэтому им выражается и приоритет, и ожидание внешнего события, и экспоненциальный backoff.

## Что сказать на собеседовании

> \`delay\` сдвигает доставку уведомлений на фиксированное время: \`next\` и \`error\` уходят на N миллисекунд позже, форма потока сохраняется — интервалы между значениями прежние. \`delayWhen\` даёт индивидуальную задержку: селектор возвращает Observable, и значение эмитится, когда тот впервые эмитит; так строится задержка, зависящая от самого значения или от внешнего сигнала — \`delayWhen(() => ready$)\` придерживает поток, пока приложение не готово. Оба работают на \`asyncScheduler\` и буферизуют значения на время ожидания, так что на быстром бесконечном источнике буфер может расти. Два нюанса: \`delayWhen\` со звоночком, который никогда не эмитит, задержит значение навсегда; и \`delay\` сдвигает доставку значений, но не момент подписки — чтобы отложить сам запрос, нужен \`timer\` плюс \`switchMap\` или \`subscribeOn\`.

## Ловушки

- **\`delay\` не откладывает подписку.** Запрос уйдёт сразу, задержится только ответ. Нужен отложенный старт — \`timer(ms).pipe(switchMap(...))\`.
- **Буфер растёт.** Значения ждут в памяти; на быстром бесконечном источнике \`delay\` — это скрытая утечка.
- **\`delayWhen\` может перепутать порядок.** Звоночки независимы: значение с коротким таймером обгонит предыдущее с длинным. Нужен порядок — \`concatMap\`.
- **Звоночек, который не эмитит, — вечная задержка.** \`delayWhen(() => never$)\` тихо съедает значения; страхуйтесь \`timeout\`.
- **Звоночку нужен именно \`next\`.** Если он завершится, не эмитнув ни разу, значение наружу так и не выйдет.
- **Спросят следом:** чем \`delay\` отличается от \`debounceTime\`. Ответ: \`delay\` **сдвигает все** значения, \`debounceTime\` **выбрасывает** промежуточные и отдаёт только последнее после паузы.`,
      en: `## In short

Both operators **hold values back** and release them later. \`delay\` holds everyone **the same** — a fixed number of milliseconds. \`delayWhen\` holds each value for **as long as its own Observable says**, a separate one per value.

Analogy: a cloakroom. \`delay\` is the rule "every item is returned exactly five minutes after check-in", the same for everybody. \`delayWhen\` is "your item is returned when your personal buzzer goes off": one buzzes instantly, another after a minute, a third only when the show ends (an external signal).

## How it works, step by step

1. \`delay(ms)\` starts an \`ms\` timer on every \`next\` and **buffers** the value. After \`ms\` the value moves on. \`error\` is shifted the same way. The shape of the stream is preserved — all gaps between values stay identical, the whole curve just slides to the right.
2. \`delayWhen(fn)\` calls \`fn(value, index)\` for each value and gets back a **buzzer Observable**.
3. The operator subscribes to that buzzer and waits for its **first emission** (what it emits is irrelevant). After that, the value moves on.
4. Buzzers for different values tick **in parallel and independently**, so the output order can change.

\`\`\`
source: a-b--c|
delay:  --a-b--c|   (each by +N, same shape)
\`\`\`

## Example

\`\`\`ts
// the delay DEPENDS ON the value: higher priority leaves sooner
source$.pipe(
  delayWhen((value) => timer(value.priority * 100))
);

// hold everything until the app is ready
source$.pipe(
  delayWhen(() => ready$)
);

// staggered sending: every next email goes 200ms later
emails$.pipe(
  concatMap((email, i) => of(email).pipe(delay(i * 200)))
);
\`\`\`

Why this way: \`delay\` cannot look at the value — it has one number for everybody. \`delayWhen\` receives the value in its selector, which is how you express priority, waiting for an external event, or exponential backoff.

## What to say in the interview

> \`delay\` shifts notification delivery by a fixed time: \`next\` and \`error\` come out N milliseconds later while the shape of the stream is preserved — the gaps between values stay the same. \`delayWhen\` gives each value its own delay: the selector returns an Observable and the value is emitted when that Observable first emits. That lets you build a delay that depends on the value itself, on its priority for example, or on an external signal — \`delayWhen(() => ready$)\` holds the stream until the app is ready. Both use the \`asyncScheduler\`, so they run on macrotasks, and both buffer values while waiting, which means on a fast infinite source the buffer can grow. Two nuances worth naming: a \`delayWhen\` buzzer that never emits holds the value forever, so you want a timeout or a completion; and \`delay\` shifts only value delivery, not the moment of subscription — to defer the request itself you need \`timer\` plus \`switchMap\`, or \`subscribeOn\`.

## Gotchas

- **\`delay\` does not defer subscription.** The request fires immediately; only the response is held. For a deferred start use \`timer(ms).pipe(switchMap(...))\`.
- **The buffer grows.** Values wait in memory; on a fast infinite source \`delay\` is a hidden leak.
- **\`delayWhen\` can reorder.** Buzzers are independent: a value with a short timer overtakes an earlier one with a long timer. Need order? Use \`concatMap\`.
- **A buzzer that never emits means a forever delay.** \`delayWhen(() => never$)\` silently swallows values; guard with \`timeout\`.
- **The buzzer must actually \`next\`.** If it completes without emitting, the value never comes out at all.
- **Follow-up they will ask:** how \`delay\` differs from \`debounceTime\`. Answer: \`delay\` **shifts every** value, \`debounceTime\` **discards** the intermediate ones and emits only the last after a quiet period.`
    }
  },
  {
    id: 'rxjs-043',
    category: 'js-state',
    level: 'Hard',
    tags: ['repeat', 'repeatwhen', 'polling'],
    question: {
      ru: 'Как работают repeat и repeatWhen? Как реализовать polling и чем repeat отличается от retry?',
      en: 'How do repeat and repeatWhen work? How do you implement polling, and how does repeat differ from retry?'
    },
    answer: {
      ru: `## Коротко

\`repeat\` и \`retry\` делают **одно и то же** — переподписываются на источник заново. Отличается только повод: \`repeat\` срабатывает на **complete** («всё прошло хорошо, давай ещё раз»), \`retry\` — на **error** («упало, попробуй снова»).

Аналогия: сериал. \`repeat\` — серия досмотрена до конца, включаем следующий показ. \`retry\` — плёнку зажевало на середине, отматываем и включаем заново.

## Как это работает по шагам

1. Источник отработал и прислал \`complete\`.
2. \`repeat\` **проглатывает** этот \`complete\` и **подписывается на источник заново** — то есть запрос выполняется по новой, со всеми побочными эффектами.
3. Если задан \`repeat({ count })\`, так повторяется \`count\` раз, после чего \`complete\` наконец проходит наружу. Без аргумента — бесконечно.
4. \`repeat({ delay })\` (RxJS 7.3+) вставляет паузу **между** повторами: подписка не сразу, а через \`delay\` мс после завершения.
5. \`error\` \`repeat\` **не ловит** — ошибка проходит насквозь и убивает поток.
6. Устаревший \`repeatWhen(notifier => ...)\` делает то же, но момент повтора решаете **вы**: в \`notifier\` приходит поток сигналов «источник завершился», а вы возвращаете Observable, каждая эмиссия которого запускает повтор — например \`repeatWhen(() => refreshClicks$)\` для обновления по кнопке. В новом коде его заменяет \`repeat({ delay })\`.

\`\`\`
source:    --a--b--|   (complete)
repeat(2): --a--b----a--b--|
\`\`\`

## Пример: два способа сделать polling

\`\`\`ts
// 1. фиксированный интервал по абсолютному времени
timer(0, 5000).pipe(switchMap(() => api.load()));

// 2. пауза ОТ МОМЕНТА ответа — наложений нет
defer(() => api.load()).pipe(repeat({ delay: 5000 }));
\`\`\`

Почему так: первый вариант тикает по часам, и если запрос идёт дольше 5 секунд, следующий тик придёт раньше ответа — \`switchMap\` отменит незавершённый запрос. Второй вариант сначала **дожидается ответа**, потом отсчитывает паузу, поэтому наложений не бывает вообще. \`defer\` тут обязателен — без него \`repeat\` переподписался бы на один и тот же уже созданный Observable.

## Что сказать на собеседовании

> \`repeat\` и \`retry\` — родственники: оба переподписываются на источник, но \`repeat\` реагирует на \`complete\`, а \`retry\` на \`error\`. \`repeat(count)\` повторяет источник заданное число раз, без аргумента — бесконечно, а с RxJS 7.3 есть форма \`repeat({ count, delay })\` с паузой между повторами; устаревший \`repeatWhen\` вытесняется \`repeat({ delay })\`, но всё ещё удобен для повтора по кнопке Refresh. Polling: \`timer(0, 5000)\` плюс \`switchMap\` даёт фиксированный интервал и отменяет незавершённый запрос при следующем тике, а \`defer\` плюс \`repeat({ delay: 5000 })\` отсчитывает паузу от момента ответа, поэтому запросы никогда не накладываются. Главное: \`repeat\` заново выполняет все побочные эффекты источника, а останавливают polling через \`takeUntil(stop$)\` или \`takeUntilDestroyed\`.

## Ловушки

- **\`repeat\` на бесконечном потоке бесполезен** — \`complete\` не наступит, повтора не будет.
- **Забыли \`defer\`** — переподписка пойдёт на один и тот же уже созданный Observable; для \`HttpClient\` это работает (он cold), но для промиса — нет, промис не «перевыполнится».
- **Побочные эффекты повторяются.** Каждый цикл — новый запрос, новый лог, новая запись в аналитику.
- **Не остановили polling** — утечка на весь срок жизни приложения. Нужен \`takeUntil(stop$)\` или \`takeUntilDestroyed()\`.
- **Перепутать \`repeat\` и \`retry\`** — самая частая ошибка: \`repeat\` не восстанавливает после ошибки, а \`retry\` не повторяет успешный поток.
- **Спросят следом:** как сделать polling, который сам замирает на неактивной вкладке. Ответ: комбинировать с \`fromEvent(document, 'visibilitychange')\` и \`switchMap\`/\`takeUntil\`.`,
      en: `## In short

\`repeat\` and \`retry\` do **the same thing** — resubscribe to the source from scratch. Only the trigger differs: \`repeat\` fires on **complete** ("that went fine, do it again"), \`retry\` fires on **error** ("it broke, try again").

Analogy: a TV series. \`repeat\` — the episode played to the end, so start the next screening. \`retry\` — the tape jammed halfway, so rewind and play it again.

## How it works, step by step

1. The source finishes its work and sends \`complete\`.
2. \`repeat\` **swallows** that \`complete\` and **resubscribes to the source** — meaning the request runs again, side effects and all.
3. With \`repeat({ count })\` this happens \`count\` times, after which \`complete\` finally passes through. With no argument — forever.
4. \`repeat({ delay })\` (RxJS 7.3+) inserts a pause **between** repeats: it resubscribes \`delay\` ms after the completion instead of instantly.
5. \`repeat\` does **not** catch \`error\` — an error passes straight through and kills the stream.
6. The deprecated \`repeatWhen(notifier => ...)\` does the same, but **you** decide the moment: the \`notifier\` receives a stream of "the source completed" signals and you return an Observable whose every emission triggers a repeat — \`repeatWhen(() => refreshClicks$)\`, for instance, to refresh on a button. In new code \`repeat({ delay })\` replaces it.

\`\`\`
source:    --a--b--|   (complete)
repeat(2): --a--b----a--b--|
\`\`\`

## Example: two ways to poll

\`\`\`ts
// 1. fixed interval on absolute time
timer(0, 5000).pipe(switchMap(() => api.load()));

// 2. pause measured FROM THE RESPONSE — no overlap ever
defer(() => api.load()).pipe(repeat({ delay: 5000 }));
\`\`\`

Why this way: the first option ticks by the clock, so if a request takes longer than 5 seconds the next tick arrives before the answer and \`switchMap\` cancels the unfinished request. The second option **waits for the response first**, then counts the pause, so overlaps simply cannot happen. \`defer\` is mandatory here — without it \`repeat\` would resubscribe to one and the same already-created Observable.

## What to say in the interview

> \`repeat\` and \`retry\` are relatives: both resubscribe to the source, but \`repeat\` reacts to \`complete\` and \`retry\` to \`error\`. \`repeat(count)\` repeats the source a given number of times, or forever with no argument, and since RxJS 7.3 there is the \`repeat({ count, delay })\` form with a pause between repeats. The deprecated \`repeatWhen\` took a notifier and decided when to repeat; it is superseded by \`repeat({ delay })\` but is still handy for repeating on an external signal such as a Refresh button. Polling comes in two flavours: \`timer(0, 5000)\` plus \`switchMap\` gives a fixed interval on absolute time and cancels an unfinished request on the next tick, whereas \`defer\` plus \`repeat({ delay: 5000 })\` measures the pause from the response, so requests never overlap — noticeably gentler on a slow backend. The things to remember: \`repeat\` re-runs all of the source's side effects, it is pointless on a stream that never completes, and you stop polling with \`takeUntil(stop$)\` or \`takeUntilDestroyed\`.

## Gotchas

- **\`repeat\` on an infinite stream is useless** — \`complete\` never arrives, so the repeat never happens.
- **Forgetting \`defer\`** means resubscribing to the same already-created Observable; that works for \`HttpClient\` (it is cold) but not for a promise — a promise does not re-run.
- **Side effects repeat.** Every cycle is a new request, a new log line, a new analytics event.
- **Not stopping the polling** leaks for the whole lifetime of the app. Use \`takeUntil(stop$)\` or \`takeUntilDestroyed()\`.
- **Mixing up \`repeat\` and \`retry\`** is the most common slip: \`repeat\` does not recover from an error, and \`retry\` does not re-run a successful stream.
- **Follow-up they will ask:** how to make polling pause on an inactive tab. Answer: combine it with \`fromEvent(document, 'visibilitychange')\` and \`switchMap\`/\`takeUntil\`.`
    }
  },
  {
    id: 'rxjs-044',
    category: 'js-state',
    level: 'Medium',
    tags: ['timeout', 'defaultifempty', 'throwifempty'],
    question: {
      ru: 'Для чего нужны timeout, throwIfEmpty и defaultIfEmpty? Покажите их применение.',
      en: 'What are timeout, throwIfEmpty, and defaultIfEmpty for? Show their usage.'
    },
    answer: {
      ru: `## Коротко

Три оператора закрывают **два неприятных сценария**: «поток молчит слишком долго» и «поток завершился, так ничего и не сказав».

- \`timeout\` — сторож с секундомером: не дождался значения за N мс → ошибка или запасной поток.
- \`defaultIfEmpty\` — «раз никто не ответил, отвечу за него»: подставит значение по умолчанию.
- \`throwIfEmpty\` — наоборот: «молчание здесь недопустимо» → ошибка.

Аналогия: звоните в поддержку. \`timeout\` — «жду 30 секунд и кладу трубку». \`defaultIfEmpty\` — «никто не ответил, значит считаем, что заявок нет». \`throwIfEmpty\` — «никто не ответил — это ЧП, поднимаем тревогу».

## Как это работает по шагам

1. \`timeout({ first, each, with })\` заводит таймер. \`first\` — дедлайн на **первое** значение, \`each\` — дедлайн **между соседними** значениями.
2. Таймер дожил до конца → оператор бросает \`TimeoutError\`. Если задан \`with\`, вместо ошибки он **переключается** на запасной Observable из фабрики.
3. Пришло значение → таймер \`each\` сбрасывается и отсчёт начинается заново.
4. \`defaultIfEmpty(v)\` и \`throwIfEmpty(fn)\` ждут **complete**. Если до него не было **ни одного** \`next\` — первый эмитит \`v\` и завершается, второй бросает ошибку из фабрики.
5. Отсюда главное ограничение: оба работают **только на завершающихся** потоках. На бесконечном они не выстрелят никогда.

## Пример

\`\`\`ts
api.load().pipe(
  timeout({ first: 5000, with: () => of(CACHED) }) // не дождались — отдаём кэш
);

filteredItems$.pipe(
  filter((x) => x.active),
  defaultIfEmpty([] as Item[]) // пустой список вместо «ничего»
);

findUser(id).pipe(
  throwIfEmpty(() => new NotFoundError(id)) // пусто = 404
);
\`\`\`

Почему так: \`timeout\` с \`with\` не роняет UI, а деградирует в кэш — и отлично сочетается с \`retry\` в устойчивом сетевом слое. \`defaultIfEmpty\` спасает downstream-логику, которой нужно **хотя бы одно** значение, а \`throwIfEmpty\` переводит «пусто» в честную ошибку, которую поймает \`catchError\`.

## Что сказать на собеседовании

> \`timeout\` бросает \`TimeoutError\`, если источник не эмитит в отведённое время; в объектной форме различаются \`first\` — дедлайн на первое значение, и \`each\` — дедлайн между соседними значениями, а \`with\` даёт фабрику запасного Observable вместо ошибки. \`defaultIfEmpty\` эмитит значение по умолчанию, если источник завершился без единого \`next\`, а \`throwIfEmpty\` в той же ситуации бросает ошибку — когда «пусто» является ошибочным состоянием. Оба срабатывают строго при complete без next, поэтому на бесконечном источнике не выстрелят никогда, а зависание бесконечного потока ловит именно \`timeout\` с опцией \`each\`. Полезно знать, что \`first()\` сам бросает \`EmptyError\` на пустом потоке — фактически встроенный \`throwIfEmpty\`; если пустота допустима, берут \`first(predicate, defaultValue)\` или \`take(1)\`.

## Ловушки

- **\`first()\` против \`take(1)\`.** \`first()\` на пустом потоке кинет \`EmptyError\`, \`take(1)\` просто завершится молча. Разница всплывает ровно в проде.
- **\`defaultIfEmpty\`/\`throwIfEmpty\` на бесконечном потоке — мёртвый код.** Нет complete — нет срабатывания.
- **\`timeout\` без \`with\` роняет поток целиком** — ловите \`TimeoutError\` через \`catchError\`, иначе упадёт и подписка в компоненте.
- **\`each\` сбрасывается на каждом значении.** Медленный, но «капающий» поток такой таймаут не поймает — для общего дедлайна нужен \`first\` или \`race\` с \`timer\`.
- **\`timeout\` тикает по \`asyncScheduler\`** — в marble-тестах его нужно задавать через тестовый scheduler, иначе тест «зависнет».
- **Спросят следом:** как отличить «сервер долго молчит» от «сервер вернул пустой массив». Ответ: первое — \`timeout\`, второе — обычная проверка длины; \`defaultIfEmpty\` про **отсутствие эмиссии**, а не про пустой массив внутри неё.`,
      en: `## In short

These three operators cover **two unpleasant scenarios**: "the stream has been silent for too long" and "the stream finished without ever saying anything".

- \`timeout\` — a guard with a stopwatch: no value within N ms → an error or a fallback stream.
- \`defaultIfEmpty\` — "nobody answered, so I will answer for them": substitutes a default value.
- \`throwIfEmpty\` — the opposite: "silence is not acceptable here" → an error.

Analogy: calling support. \`timeout\` is "I wait 30 seconds and hang up". \`defaultIfEmpty\` is "nobody picked up, so let's assume there are no tickets". \`throwIfEmpty\` is "nobody picked up — that is an incident, raise the alarm".

## How it works, step by step

1. \`timeout({ first, each, with })\` starts a timer. \`first\` is the deadline for the **first** value, \`each\` is the deadline **between consecutive** values.
2. The timer runs out → the operator throws a \`TimeoutError\`. If \`with\` is supplied, it **switches** to the fallback Observable from that factory instead of erroring.
3. A value arrives → the \`each\` timer resets and starts counting again.
4. \`defaultIfEmpty(v)\` and \`throwIfEmpty(fn)\` wait for **complete**. If not a single \`next\` came before it, the first emits \`v\` and completes, the second throws the error from the factory.
5. Hence their key limitation: both work **only on completing** streams. On an infinite one they never fire.

## Example

\`\`\`ts
api.load().pipe(
  timeout({ first: 5000, with: () => of(CACHED) }) // too slow — serve cache
);

filteredItems$.pipe(
  filter((x) => x.active),
  defaultIfEmpty([] as Item[]) // an empty list instead of "nothing"
);

findUser(id).pipe(
  throwIfEmpty(() => new NotFoundError(id)) // empty = 404
);
\`\`\`

Why this way: \`timeout\` with \`with\` does not break the UI, it degrades to cache — and it pairs beautifully with \`retry\` in a resilient network layer. \`defaultIfEmpty\` rescues downstream logic that needs **at least one** value, while \`throwIfEmpty\` turns "empty" into an honest error that \`catchError\` can handle.

## What to say in the interview

> \`timeout\` throws a \`TimeoutError\` when the source does not emit within the allotted time; in its object form \`first\` is the deadline for the first value and \`each\` is the deadline between consecutive values, while the \`with\` option provides a fallback Observable factory instead of an error — serving cached data, for example. \`defaultIfEmpty\` emits a default value if the source completed without a single \`next\`, and \`throwIfEmpty\` throws in exactly that situation instead — for cases where "empty" is an error state, such as a user not being found. Both fire strictly on complete-without-next, so on an infinite source they never fire at all, and it is \`timeout\` with the \`each\` option that catches hangs on infinite streams. Worth knowing that \`first()\` by itself throws an \`EmptyError\` on an empty stream — essentially a built-in \`throwIfEmpty\`; if emptiness is acceptable you should reach for \`first(predicate, defaultValue)\` or \`take(1)\`.

## Gotchas

- **\`first()\` vs \`take(1)\`.** \`first()\` throws \`EmptyError\` on an empty stream; \`take(1)\` just completes silently. The difference surfaces precisely in production.
- **\`defaultIfEmpty\`/\`throwIfEmpty\` on an infinite stream is dead code.** No complete, no trigger.
- **\`timeout\` without \`with\` tears the whole stream down** — catch the \`TimeoutError\` with \`catchError\`, or the component's subscription dies too.
- **\`each\` resets on every value.** A slow but steadily dripping stream will never trip it — for an overall deadline you need \`first\` or a \`race\` with \`timer\`.
- **\`timeout\` runs on the \`asyncScheduler\`** — in marble tests you must pass the test scheduler or the test hangs.
- **Follow-up they will ask:** how to distinguish "the server is silent" from "the server returned an empty array". Answer: the former is \`timeout\`, the latter is a plain length check; \`defaultIfEmpty\` is about the **absence of an emission**, not about an empty array inside one.`
    }
  },
  {
    id: 'rxjs-045',
    category: 'js-state',
    level: 'Hard',
    tags: ['defer', 'iif', 'cold'],
    question: {
      ru: 'Зачем нужны defer и iif? Как defer гарантирует «свежесть» и cold-поведение на каждого подписчика?',
      en: 'What are defer and iif for? How does defer guarantee "freshness" and per-subscriber cold behavior?'
    },
    answer: {
      ru: `## Коротко

\`defer\` — это **«не готовь заранее, готовь по заказу»**. Он не создаёт Observable сразу, а хранит **рецепт** (фабрику) и выполняет его заново **на каждую подписку**. \`iif\` — это \`defer\` с готовым \`if\`: выбирает один из двух источников в момент подписки.

Аналогия: \`of(Date.now())\` — это бутерброд, приготовленный утром: кто бы ни пришёл в течение дня, он получит **один и тот же чёрствый** бутерброд. \`defer(() => of(Date.now()))\` — это повар: каждому гостю он готовит **свежий**, прямо сейчас.

## Как это работает по шагам

1. Вы пишете \`defer(factory)\` — в этот момент **ничего не происходит**, фабрика лежит без дела.
2. Кто-то подписался → \`factory()\` **вызывается** и возвращает Observable (или промис, или массив — любой \`ObservableInput\`).
3. Подписка идёт уже на этот свежесозданный поток.
4. Подписался второй → фабрика вызывается **заново**, получается **отдельный** поток со своими данными.
5. Переподписка от \`retry\`/\`repeat\` — это тоже новая подписка, значит тоже новый вызов фабрики. Именно поэтому \`retry\` над \`defer\` реально **повторяет запрос**.
6. \`iif(cond, a$, b$)\` = \`defer(() => cond() ? a$ : b$)\`: предикат вычисляется **один раз на подписку**.

## Пример

\`\`\`ts
// свежий токен на каждую (пере)подписку и на каждый retry
const authedRequest$ = defer(() => {
  const token = tokenStore.getCurrent(); // читается в момент подписки
  return http.get('/api/me', { headers: { Authorization: token } });
}).pipe(
  retry({ count: 2, delay: 1000 })
);

// выбор источника по условию в момент подписки
iif(() => isLoggedIn(), userData$, of(GUEST));
\`\`\`

Почему так: без \`defer\` токен прочитался бы **один раз**, при создании потока, и на втором retry ушёл бы уже протухший. Тот же приём делает cold любой промис: \`defer(() => fetch(...))\` создаёт **новый** промис на каждую подписку, а \`from(fetch(...))\` — всегда один и тот же, и \`retry\` над ним бессмыслен.

## Что сказать на собеседовании

> \`defer\` откладывает создание Observable до подписки и вызывает фабрику заново для каждого подписчика, превращая жадный источник в по-настоящему холодный. Это даёт три вещи: свежесть, потому что значение или запрос формируется в момент подписки — актуальный токен, текущее время; ленивость, потому что побочный эффект вроде чтения \`localStorage\` не выполнится, пока никто не подписался; и корректную работу \`retry\` и \`repeat\`, поскольку каждая переподписка получает новый вызов фабрики — особенно важно для промисов, которые сами по себе горячие и переиспользуют результат. \`iif\` — сахар над \`defer\`: выбирает один из двух источников по предикату, вычисляемому при подписке. Ключевой нюанс: предикат вычисляется один раз на подписку и не реактивен; если выбор должен меняться со временем, нужен \`switchMap\` от потока-условия.

## Ловушки

- **\`iif\` не реактивен.** Условие проверяется один раз при подписке. Нужна реактивность — \`condition$.pipe(switchMap(...))\`.
- **Оба аргумента \`iif\` уже созданы.** Если само создание источника имеет побочный эффект — оборачивайте каждый в \`defer\`.
- **\`from(promise)\` нельзя перезапустить.** Промис выполняется один раз; \`retry\` будет просто отдавать тот же результат. Спасает только \`defer\`.
- **\`defer\` = новый поток на каждого подписчика.** Если подписчиков несколько, а запрос должен быть один — сверху нужен \`shareReplay\`.
- **Ошибка внутри фабрики** превращается в \`error\` потока, а не в синхронное исключение, — это плюс, но об этом забывают при отладке.
- **Спросят следом:** зачем \`defer\`, если \`HttpClient\` и так холодный. Ответ: холодный сам запрос, но **аргументы** (токен, дата, текущий фильтр) вычисляются на этапе создания — \`defer\` откладывает и их.`,
      en: `## In short

\`defer\` means **"do not cook in advance, cook to order"**. It does not create an Observable up front; it keeps a **recipe** (a factory) and runs it again **for every subscription**. \`iif\` is \`defer\` with a built-in \`if\`: it picks one of two sources at subscription time.

Analogy: \`of(Date.now())\` is a sandwich made in the morning — whoever shows up during the day gets **the same stale** sandwich. \`defer(() => of(Date.now()))\` is a cook: every guest gets a **fresh** one, made right now.

## How it works, step by step

1. You write \`defer(factory)\` — at that moment **nothing happens**, the factory just sits there.
2. Someone subscribes → \`factory()\` **is called** and returns an Observable (or a promise, or an array — any \`ObservableInput\`).
3. The subscription goes to that freshly created stream.
4. A second subscriber arrives → the factory runs **again**, producing a **separate** stream with its own data.
5. A resubscription from \`retry\`/\`repeat\` is also a new subscription, hence also a new factory call. That is exactly why \`retry\` over \`defer\` genuinely **repeats the request**.
6. \`iif(cond, a$, b$)\` equals \`defer(() => cond() ? a$ : b$)\`: the predicate is evaluated **once per subscription**.

## Example

\`\`\`ts
// a fresh token on every (re)subscription and every retry
const authedRequest$ = defer(() => {
  const token = tokenStore.getCurrent(); // read at subscribe time
  return http.get('/api/me', { headers: { Authorization: token } });
}).pipe(
  retry({ count: 2, delay: 1000 })
);

// choose a source by a condition at subscription time
iif(() => isLoggedIn(), userData$, of(GUEST));
\`\`\`

Why this way: without \`defer\` the token would be read **once**, when the stream was created, and the second retry would send an already-expired one. The same trick makes any promise cold: \`defer(() => fetch(...))\` creates a **new** promise per subscription, whereas \`from(fetch(...))\` is always the same one and \`retry\` over it is meaningless.

## What to say in the interview

> \`defer\` postpones creating the Observable until subscription and calls the factory anew for each subscriber — it turns an eagerly computed source into a genuinely cold one. That buys you three things: freshness, because the value or request is formed at subscription time — a current token, the current time, the current state; laziness, because a side effect such as reading \`localStorage\` does not run until someone subscribes; and correct \`retry\`/\`repeat\` behavior, because every resubscription gets a fresh factory call rather than the same already-running stream — which matters most for promises, since they are hot by nature and reuse their result. \`iif\` is sugar over \`defer\`: it picks one of two sources by a predicate evaluated at subscription time. The key nuance is that this predicate is evaluated once per subscription and is not reactive — it does not watch the condition change; if the choice has to change over time you need a \`switchMap\` over a condition stream.

## Gotchas

- **\`iif\` is not reactive.** The condition is checked once, at subscribe. For reactivity use \`condition$.pipe(switchMap(...))\`.
- **Both \`iif\` arguments already exist.** If creating a source itself has a side effect, wrap each of them in \`defer\`.
- **\`from(promise)\` cannot be restarted.** A promise runs once; \`retry\` will simply hand back the same result. Only \`defer\` fixes that.
- **\`defer\` means a new stream per subscriber.** If several subscribers should share one request, put a \`shareReplay\` on top.
- **An error thrown inside the factory** becomes a stream \`error\`, not a synchronous throw — a good thing, but easy to forget while debugging.
- **Follow-up they will ask:** why bother with \`defer\` when \`HttpClient\` is already cold. Answer: the request is cold, but its **arguments** — token, date, current filter — are computed at creation time; \`defer\` defers those too.`
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
    category: 'js-state',
    level: 'Medium',
    tags: ['race', 'fromevent', 'fromfetch'],
    question: {
      ru: 'Что делает race? Как работают fromEvent и fromFetch и в чём их отличия от ручных оберток?',
      en: 'What does race do? How do fromEvent and fromFetch work and how do they differ from manual wrappers?'
    },
    answer: {
      ru: `## Коротко

Все три — про **аккуратную работу с ресурсами**. \`race\` устраивает забег между потоками и оставляет только победителя, остальных отключая. \`fromEvent\` превращает DOM-событие в поток и сам снимает слушатель. \`fromFetch\` превращает \`fetch\` в поток и сам **отменяет запрос** при отписке.

Аналогия для \`race\`: забег на 100 метров. Кто первым пересёк линию (эмитнул), тот и победил, остальных **снимают с дистанции** — они больше не бегут и ресурсы не жгут. Причём судья смотрит только на **первый шаг за линию**, а не на то, кто красивее финишировал.

## Как это работает по шагам

1. \`race(a$, b$, c$)\` подписывается **на все** источники сразу.
2. Кто первым выдал \`next\` — тот победитель. На **все остальные** подписки немедленно приходит отписка.
3. Дальше \`race\` просто прозрачно транслирует победителя: его значения, его \`error\`, его \`complete\`.
4. \`fromEvent(target, name)\` при подписке вызывает \`addEventListener\`, а в teardown — \`removeEventListener\`. Поддерживает опции (\`{ passive, capture }\`) и сохраняет hot-природу DOM-события: событие происходит независимо от того, слушаете вы его или нет.
5. \`fromFetch(url, init)\` при подписке дёргает \`fetch\` с внутренним \`AbortController\`; отписка → \`abort()\` → запрос **реально отменяется** в сети. Наружу отдаёт \`Response\`, тело вы читаете сами.

## Пример

\`\`\`ts
// race: отдаём то, что пришло раньше — кэш или сеть
race(api.fromCache(), api.fromNetwork()).subscribe(render);

// fromEvent: слушатель снимается сам при отписке
fromEvent<UIEvent>(window, 'resize').pipe(
  debounceTime(100),
  takeUntilDestroyed()
);

// fromFetch: switchMap отменит незавершённый запрос по-настоящему
query$.pipe(
  switchMap((q) => fromFetch('/api/search?q=' + q)),
  switchMap((res) => res.ok ? res.json() : throwError(() => res))
);
\`\`\`

Почему так: \`from(fetch(...))\` при отписке **не отменяет** ничего — промис нельзя отозвать, запрос продолжает висеть и грузить сеть. \`fromFetch\` закрывает ровно эту дыру, поэтому в паре со \`switchMap\` он даёт настоящую отмену устаревших поисковых запросов.

## Что сказать на собеседовании

> \`race\` подписывается на все источники и оставляет тот, который эмитнул первым, отписываясь от остальных; типичные применения — самый быстрый из реплик или таймаут гонкой с \`timer\`. \`fromEvent\` оборачивает DOM или EventEmitter API: при подписке вызывает \`addEventListener\`, а в teardown \`removeEventListener\`, поддерживает опции вроде \`passive\` и \`capture\` и сохраняет hot-семантику события — преимущество перед ручным \`new Observable\`, где легко забыть снять слушатель. \`fromFetch\` из \`rxjs/fetch\` оборачивает \`fetch\` так, что отписка отменяет запрос через \`AbortController\`, чего голый \`from(fetch(...))\` не умеет, потому что промис не отзывается; возвращает он \`Response\`. Нюанс: \`race\` решает по первой эмиссии, а не по завершению, поэтому эмитнувший раньше побеждает даже если следом упадёт с ошибкой.

## Ловушки

- **\`race\` судит по первой эмиссии, а не по успеху.** Быстрый источник, который тут же выдал \`error\`, всё равно победил, и ошибка уйдёт наружу.
- **Побочные эффекты запускаются у всех.** Все участники забега успевают подписаться, то есть все запросы уходят; экономится только обработка ответов.
- **\`fromEvent\` без отписки — утечка.** Слушатель на \`window\`/\`document\` переживёт компонент; нужен \`takeUntilDestroyed()\` или \`async\` pipe.
- **\`fromFetch\` не бросает на HTTP-ошибке.** \`404\` и \`500\` — это успешный \`Response\`; статус надо проверять руками через \`res.ok\`.
- **\`from(fetch(...))\` неотменяем и «горячий».** Запрос стартует в момент создания промиса, а не подписки; для отмены и повторов — \`fromFetch\` или \`defer\`.
- **Спросят следом:** чем \`race\` отличается от \`merge\` и \`combineLatest\`. Ответ: \`merge\` слушает **всех** до конца, \`combineLatest\` ждёт по значению от каждого, \`race\` оставляет **ровно одного**.`,
      en: `## In short

All three are about **handling resources properly**. \`race\` runs a sprint between streams and keeps only the winner, disconnecting the rest. \`fromEvent\` turns a DOM event into a stream and removes the listener for you. \`fromFetch\` turns \`fetch\` into a stream and **cancels the request** when you unsubscribe.

Analogy for \`race\`: a 100-metre sprint. Whoever crosses the line first (emits first) wins, and everyone else is **pulled off the track** — they stop running and stop burning resources. And the judge only watches the **first step past the line**, not who finished more gracefully.

## How it works, step by step

1. \`race(a$, b$, c$)\` subscribes to **all** sources at once.
2. The first one to emit \`next\` is the winner. **Every other** subscription is torn down immediately.
3. From then on \`race\` simply passes the winner through: its values, its \`error\`, its \`complete\`.
4. \`fromEvent(target, name)\` calls \`addEventListener\` on subscribe and \`removeEventListener\` in teardown. It supports options (\`{ passive, capture }\`) and preserves the hot nature of the DOM event: the event happens whether you are listening or not.
5. \`fromFetch(url, init)\` calls \`fetch\` on subscribe with an internal \`AbortController\`; unsubscribing calls \`abort()\` and the request is **genuinely cancelled** on the wire. It emits a \`Response\`; you read the body yourself.

## Example

\`\`\`ts
// race: render whichever arrives first — cache or network
race(api.fromCache(), api.fromNetwork()).subscribe(render);

// fromEvent: the listener is removed automatically on unsubscribe
fromEvent<UIEvent>(window, 'resize').pipe(
  debounceTime(100),
  takeUntilDestroyed()
);

// fromFetch: switchMap really does cancel the in-flight request
query$.pipe(
  switchMap((q) => fromFetch('/api/search?q=' + q)),
  switchMap((res) => res.ok ? res.json() : throwError(() => res))
);
\`\`\`

Why this way: \`from(fetch(...))\` cancels **nothing** on unsubscribe — a promise cannot be revoked, so the request keeps hanging and consuming bandwidth. \`fromFetch\` plugs exactly that hole, which is why paired with \`switchMap\` it gives you real cancellation of stale search requests.

## What to say in the interview

> \`race\` subscribes to all the sources you give it and keeps only the one that emitted first, unsubscribing from the rest; typical uses are taking the fastest of several replicas, or building a timeout by racing the work stream against a \`timer\`. \`fromEvent\` wraps a DOM or EventEmitter API: it calls \`addEventListener\` on subscribe and \`removeEventListener\` in teardown, supports options like \`passive\` and \`capture\`, and preserves the hot semantics of the event itself — that is its edge over a hand-rolled \`new Observable\`, where forgetting the listener is easy. \`fromFetch\` from the \`rxjs/fetch\` entry point wraps \`fetch\` so that unsubscribing aborts the request through an \`AbortController\`, which a bare \`from(fetch(...))\` cannot do because a promise is fundamentally not revocable; it emits a \`Response\` and you read the body yourself via \`switchMap\`. One nuance about \`race\`: it decides on the first emission, not on completion, so the source that emits earlier wins even if it errors right after.

## Gotchas

- **\`race\` judges by the first emission, not by success.** A fast source that immediately errors still wins, and the error propagates.
- **Side effects fire for everyone.** Every contestant gets subscribed, so every request is actually sent; you only save on processing the responses.
- **\`fromEvent\` without unsubscription leaks.** A listener on \`window\`/\`document\` outlives the component; use \`takeUntilDestroyed()\` or the \`async\` pipe.
- **\`fromFetch\` does not throw on HTTP errors.** A \`404\` or \`500\` is a successful \`Response\`; you must check \`res.ok\` yourself.
- **\`from(fetch(...))\` is uncancellable and hot.** The request starts when the promise is created, not when you subscribe; for cancellation and retries use \`fromFetch\` or \`defer\`.
- **Follow-up they will ask:** how \`race\` differs from \`merge\` and \`combineLatest\`. Answer: \`merge\` listens to **everyone** until the end, \`combineLatest\` waits for one value from each, \`race\` keeps **exactly one**.`
    }
  },
  {
    id: 'rxjs-047',
    category: 'js-state',
    level: 'Hard',
    tags: ['subscription', 'teardown', 'composition'],
    question: {
      ru: 'Как устроена композиция Subscription (add/remove/unsubscribe)? Какие есть gotchas?',
      en: 'How does Subscription composition (add/remove/unsubscribe) work? What are the gotchas?'
    },
    answer: {
      ru: `## Коротко

\`Subscription\` — это не просто «то, что вернул \`subscribe\`». Это **контейнер**, в который можно складывать другие подписки и любые функции уборки. Закрыли контейнер — закрылось **всё, что внутри**, рекурсивно.

Аналогия: сетевой удлинитель. В него воткнуты лампа, ноутбук и ещё один удлинитель с чайником. Выдернули **один** штепсель из розетки — обесточилось всё дерево разом. \`add\` — воткнуть прибор, \`remove\` — вынуть его из удлинителя (прибор при этом **не выключается**), \`unsubscribe\` — выдернуть удлинитель из розетки.

## Как это работает по шагам

1. \`sub.add(child)\` кладёт в контейнер дочернюю подписку **или** просто функцию очистки — принимается и то, и другое.
2. \`sub.unsubscribe()\` закрывает саму подписку и **рекурсивно** обходит всех детей, вызывая их teardown.
3. \`sub.remove(child)\` только **вынимает ребёнка из списка**; его teardown при этом **не вызывается** — ресурс закрываете вы сами. Это способ «переселить» подписку в другой контейнер.
4. У подписки есть флаг \`closed\`, а повторный \`unsubscribe()\` **идемпотентен** — второй вызов ничего не делает.
5. Ровно на этом механизме работает \`pipe\`: каждый оператор делает \`add\` внутренней подписки к внешней, получается дерево. Поэтому \`unsubscribe\` наверху каскадом гасит всю цепочку операторов — это и есть механизм распространения teardown.

## Пример

\`\`\`ts
const sub = new Subscription();
sub.add(stream1$.subscribe());
sub.add(stream2$.subscribe());
sub.add(() => clearInterval(timerId)); // просто функция уборки

sub.unsubscribe(); // одним вызовом снимаем всё дерево
\`\`\`

Почему так: вместо массива подписок и цикла в \`ngOnDestroy\` вы держите **один** объект. В Angular современная альтернатива — \`takeUntilDestroyed()\` и \`DestroyRef\`, а ещё лучше \`async\` pipe, который отписывается сам; но \`Subscription.add\` остаётся удобным там, где подписки создаются императивно и в большом количестве — например в директивах.

## Что сказать на собеседовании

> \`Subscription\` — не только результат \`subscribe\`, но и контейнер для других подписок и teardown-функций. \`add\` добавляет дочернюю подписку или функцию очистки, \`unsubscribe\` закрывает эту подписку и рекурсивно всё добавленное, а \`remove\` лишь открепляет ребёнка, не вызывая его teardown. На этом же механизме построен \`pipe\`: каждый оператор добавляет внутреннюю подписку к внешней, и \`unsubscribe\` наверху каскадно закрывает всю цепочку. Из нюансов: если контейнер уже закрыт, \`add\` немедленно вызовет teardown добавляемого ребёнка; повторный \`unsubscribe\` идемпотентен благодаря флагу \`closed\`; а если несколько финализаторов бросят исключения, RxJS соберёт их в \`UnsubscriptionError\`, не потеряв остальные очистки. В современном Angular это заменяют \`takeUntilDestroyed\` или \`async\` pipe.

## Ловушки

- **\`add\` в уже закрытый контейнер** мгновенно убивает добавляемую подписку. Классический баг: подписались после \`ngOnDestroy\` и удивляетесь, что ничего не приходит.
- **\`remove\` не отписывает.** Он только вынимает из списка — если забыть закрыть ресурс, получите утечку.
- **Ошибки в teardown не теряются**, а склеиваются в \`UnsubscriptionError\`; читайте поле с массивом ошибок, а не только сообщение.
- **Переиспользовать закрытый \`Subscription\` нельзя** — он навсегда \`closed\`; в \`ngOnInit\` нужно создавать новый.
- **Ручные подписки — источник утечек.** Если можно, вообще не подписывайтесь: \`async\` pipe, \`toSignal()\` или \`takeUntilDestroyed()\` делают это за вас.
- **Спросят следом:** чем \`takeUntilDestroyed\` лучше \`Subscription.add\`. Ответ: он **завершает поток** — подписчик получает \`complete\`, срабатывают операторы вроде \`last()\`/\`toArray()\`, — а \`unsubscribe\` просто молча обрывает подписку.`,
      en: `## In short

A \`Subscription\` is not merely "what \`subscribe\` returned". It is a **container** you can drop other subscriptions and arbitrary cleanup functions into. Close the container and **everything inside** closes with it, recursively.

Analogy: a power strip. Plugged into it are a lamp, a laptop, and another power strip with a kettle. Pull **one** plug from the wall and the whole tree goes dark at once. \`add\` plugs a device in, \`remove\` unplugs it from the strip (the device itself stays **on**), \`unsubscribe\` pulls the strip out of the wall.

## How it works, step by step

1. \`sub.add(child)\` puts a child subscription **or** a plain cleanup function into the container — both are accepted.
2. \`sub.unsubscribe()\` closes the subscription itself and walks **recursively** through all children, running their teardown.
3. \`sub.remove(child)\` only **takes the child off the list**; its teardown does **not** run — you close the resource yourself. That is how you "relocate" a subscription into another container.
4. A subscription exposes a \`closed\` flag, and a repeated \`unsubscribe()\` is **idempotent** — the second call does nothing.
5. \`pipe\` runs on exactly this mechanism: every operator \`add\`s its inner subscription to the outer one, forming a tree. So an \`unsubscribe\` at the top cascades down and shuts the entire operator chain — that is the teardown-propagation mechanism.

## Example

\`\`\`ts
const sub = new Subscription();
sub.add(stream1$.subscribe());
sub.add(stream2$.subscribe());
sub.add(() => clearInterval(timerId)); // just a cleanup function

sub.unsubscribe(); // one call tears down the whole tree
\`\`\`

Why this way: instead of an array of subscriptions and a loop in \`ngOnDestroy\` you keep **one** object. In Angular the modern alternative is \`takeUntilDestroyed()\` with \`DestroyRef\`, and better still the \`async\` pipe, which unsubscribes on its own; but \`Subscription.add\` stays handy where subscriptions are created imperatively and in numbers — in directives, for example.

## What to say in the interview

> A \`Subscription\` is not just the result of \`subscribe\` but also a container for other subscriptions and teardown functions. \`add\` attaches a child subscription or a cleanup function, \`unsubscribe\` closes this subscription and recursively everything added to it, and \`remove\` merely detaches a child without running its teardown. \`pipe\` is built on the same mechanism: each operator adds its inner subscription to the outer one, forming a tree, and an \`unsubscribe\` at the top cascades through the whole chain. Some nuances: if the container is already closed, \`add\` runs the new child's teardown immediately, so the subscription dies on the spot; a repeated \`unsubscribe\` is idempotent thanks to the \`closed\` flag; and if several finalizers throw, RxJS aggregates them into an \`UnsubscriptionError\` rather than losing the remaining cleanups. In modern Angular this is usually replaced by \`takeUntilDestroyed\` or the \`async\` pipe, but \`Subscription.add\` is still convenient for imperatively created subscriptions.

## Gotchas

- **\`add\` into an already-closed container** kills the new subscription instantly. A classic bug: subscribing after \`ngOnDestroy\` and wondering why nothing arrives.
- **\`remove\` does not unsubscribe.** It only takes the child off the list — forget to close the resource and you have a leak.
- **Teardown errors are not lost**, they are aggregated into an \`UnsubscriptionError\`; read its array of errors, not just the message.
- **A closed \`Subscription\` cannot be reused** — it is \`closed\` forever; create a new one in \`ngOnInit\`.
- **Manual subscriptions are a leak factory.** Where possible, do not subscribe at all: \`async\` pipe, \`toSignal()\` or \`takeUntilDestroyed()\` do it for you.
- **Follow-up they will ask:** why \`takeUntilDestroyed\` beats \`Subscription.add\`. Answer: it **completes the stream** — the subscriber receives \`complete\` and operators like \`last()\`/\`toArray()\` fire — whereas \`unsubscribe\` just silently severs the subscription.`
    }
  },
  {
    id: 'rxjs-048',
    category: 'js-state',
    level: 'Expert',
    tags: ['connectable', 'connect', 'multicasting'],
    question: {
      ru: 'Как работают connectable, connect() и оператор connect? Чем они заменили publish/multicast?',
      en: 'How do connectable, connect(), and the connect operator work? What did they replace from publish/multicast?'
    },
    answer: {
      ru: `## Коротко

Проблема одна: нужно **разветвить** источник на несколько веток обработки, но выполниться он должен **ровно один раз**. Наивный \`combineLatest(a$.pipe(...), a$.pipe(...))\` подпишется на \`a$\` **дважды** и отправит два запроса.

Аналогия: радиостанция. Cold Observable — это как если бы для каждого слушателя ведущий заново приходил в студию и повторял эфир. Мультикаст — ведущий говорит **один раз в микрофон**, а слушателей может быть сколько угодно. \`connectable\` добавляет к этому **тумблер эфира**: слушатели уже подключили приёмники, но звук пойдёт только когда вы нажмёте \`connect()\`.

## Из чего состоит семейство

1. **\`share()\` / \`shareReplay()\`** — 95% случаев. Подписка и запуск связаны: пришёл первый подписчик — источник стартовал, ушёл последний — остановился (при \`refCount\`).
2. **\`connectable(source, { connector, resetOnDisconnect })\`** — когда нужен **ручной** контроль момента старта. Возвращает \`Connectable\`: он мультикастит источник через переданный \`Subject\`, но **не запускает** его, пока вы не вызовете \`.connect()\`. \`connect()\` возвращает \`Subscription\` — ею же источник и останавливают.
3. **Оператор \`connect(selector)\`** — **локальное** ветвление внутри одного \`pipe\`: источник мультикастится, а \`selector\` получает уже общий поток и строит из него сколько угодно веток.
4. **Legacy: \`multicast\`, \`publish\`, \`publishReplay\`, \`refCount\`, \`ConnectableObservable\`** — мощный, но запутанный старый API: разделение «подключения» и «подписки» через \`.connect()\` легко приводило к ошибкам жизненного цикла. В RxJS 7 помечен deprecated, в новом коде не используем.

## Пример

\`\`\`ts
// оператор connect: один запрос, две ветки обработки
source$.pipe(
  connect((shared$) => merge(
    shared$.pipe(filter(isA), map(toA)),
    shared$.pipe(filter(isB), map(toB))
  ))
);

// connectable: подписчики готовы, но эфир включаем вручную
const shared = connectable(source$, { connector: () => new ReplaySubject(1) });
shared.subscribe(a); // источник ещё НЕ стартовал
shared.subscribe(b);
const conn = shared.connect(); // стартует один раз для обоих
conn.unsubscribe();            // и останавливается
\`\`\`

Почему так: \`connect\` гарантирует, что **все ветки успеют подписаться** на общий поток **до** того, как источник начнёт эмитить. Если бы вы просто написали \`const s$ = source$.pipe(share())\` и подписались двумя ветками по очереди, синхронный источник успел бы выдать значения до появления второй ветки.

## Что сказать на собеседовании

> Все эти инструменты про мультикаст: превратить cold-источник в один общий поток, чтобы работа выполнилась один раз на N подписчиков. В большинстве случаев достаточно \`share\` или \`shareReplay\`, где запуск источника привязан к первому подписчику. \`connectable\` нужен, когда старт контролируется вручную: он оборачивает источник в \`Subject\` из опции \`connector\`, но не подписывается до \`.connect()\`. Оператор \`connect\` — про локальный fan-out внутри одного pipe: селектор получает мультикастнутый поток и строит несколько веток, при этом источник выполняется один раз, а все ветки подписаны до первой эмиссии. Всё это заменило старый API — \`multicast\`, \`publish\`, \`publishReplay\`, \`refCount\` и \`ConnectableObservable\`, — который в RxJS 7 помечен deprecated, потому что ручное разделение подключения и подписки порождало баги.

## Ловушки

- **\`connectable\` без \`connect()\` не эмитит вообще.** Подписчики висят молча — самый частый источник недоумения.
- **Не отписались от \`connect()\`** — источник живёт вечно, независимо от подписчиков. \`refCount\`-семантики здесь нет.
- **Выбор \`connector\` меняет поведение.** \`Subject\` — опоздавшие не получат ничего; \`ReplaySubject(1)\` — получат последнее значение.
- **Оператор \`connect\` без \`merge\`** внутри селектора теряет ветки: наружу уходит только то, что вернул селектор.
- **\`share()\` по умолчанию сбрасывается** при уходе последнего подписчика и перезапустит источник при следующем — если это не нужно, задайте \`resetOnRefCountZero: false\` или используйте \`shareReplay({ bufferSize: 1, refCount: true })\` осознанно.
- **Спросят следом:** зачем вообще \`connectable\`, если есть \`share\`. Ответ: когда нужно **гарантированно** подписать всех потребителей до старта источника и явно управлять его остановкой.`,
      en: `## In short

One problem: you need to **fan a source out** into several processing branches while the source itself runs **exactly once**. A naive \`combineLatest(a$.pipe(...), a$.pipe(...))\` subscribes to \`a$\` **twice** and fires two requests.

Analogy: a radio station. A cold Observable is as if the host walked back into the studio and repeated the whole show for every single listener. Multicasting means the host speaks **once into the microphone** and any number of listeners tune in. \`connectable\` adds an **on-air switch** on top: listeners already have their receivers connected, but sound only starts flowing when you press \`connect()\`.

## What the family consists of

1. **\`share()\` / \`shareReplay()\`** — 95% of cases. Subscription and start are tied together: the first subscriber starts the source, the last one leaving stops it (with \`refCount\`).
2. **\`connectable(source, { connector, resetOnDisconnect })\`** — when you need **manual** control over the start. It returns a \`Connectable\`: it multicasts the source through the given \`Subject\` but **does not start** it until you call \`.connect()\`. That call returns a \`Subscription\`, which is also how you stop the source.
3. **The \`connect(selector)\` operator** — **local** branching inside a single \`pipe\`: the source is multicast and the \`selector\` receives the already-shared stream to build as many branches as you like.
4. **Legacy: \`multicast\`, \`publish\`, \`publishReplay\`, \`refCount\`, \`ConnectableObservable\`** — a powerful but confusing old API: separating "connection" from "subscription" via \`.connect()\` easily bred lifecycle bugs. Deprecated in RxJS 7; do not use it in new code.

## Example

\`\`\`ts
// the connect operator: one request, two processing branches
source$.pipe(
  connect((shared$) => merge(
    shared$.pipe(filter(isA), map(toA)),
    shared$.pipe(filter(isB), map(toB))
  ))
);

// connectable: subscribers are ready, but you go on air manually
const shared = connectable(source$, { connector: () => new ReplaySubject(1) });
shared.subscribe(a); // the source has NOT started yet
shared.subscribe(b);
const conn = shared.connect(); // starts once, for both
conn.unsubscribe();            // and stops
\`\`\`

Why this way: \`connect\` guarantees that **every branch is subscribed** to the shared stream **before** the source starts emitting. Had you simply written \`const s$ = source$.pipe(share())\` and subscribed the branches one after another, a synchronous source would have fired its values before the second branch existed.

## What to say in the interview

> All of these are about multicasting: turning a cold source into one shared stream so the work runs exactly once for N subscribers. In the overwhelming majority of cases \`share\` or \`shareReplay\` is enough, where starting the source is tied to the first subscriber. \`connectable\` is for when the moment of start must be controlled manually: it wraps the source in a \`Subject\` supplied through the \`connector\` option but does not subscribe to the source until you call \`.connect()\`. The \`connect\` operator solves a different problem — local fan-out inside a single pipe: the selector receives the already-multicast stream and builds several branches from it, usually merged back together, while the source runs once and every branch is guaranteed to be subscribed before the first emission. All of this replaced the old API — \`multicast\`, \`publish\`, \`publishReplay\`, \`refCount\` and \`ConnectableObservable\` — which RxJS 7 deprecated, because manually splitting connection from subscription kept producing lifecycle bugs.

## Gotchas

- **A \`connectable\` without \`connect()\` emits nothing at all.** Subscribers just hang there silently — the most common source of confusion.
- **Not unsubscribing from \`connect()\`** keeps the source alive forever, regardless of subscribers. There is no \`refCount\` semantics here.
- **The \`connector\` choice changes behavior.** A plain \`Subject\` gives latecomers nothing; a \`ReplaySubject(1)\` gives them the last value.
- **The \`connect\` operator without a \`merge\`** inside the selector loses branches: only what the selector returns goes downstream.
- **\`share()\` resets by default** when the last subscriber leaves and restarts the source for the next one — if that is not what you want, set \`resetOnRefCountZero: false\` or use \`shareReplay({ bufferSize: 1, refCount: true })\` deliberately.
- **Follow-up they will ask:** why use \`connectable\` at all when \`share\` exists. Answer: when you must **guarantee** that all consumers are subscribed before the source starts, and want explicit control over stopping it.`
    }
  },
  {
    id: 'rxjs-049',
    category: 'js-state',
    level: 'Expert',
    tags: ['ngrx', 'meta-reducers', 'runtime-checks'],
    question: {
      ru: 'Что такое meta-reducers и runtime checks в NgRx? Для чего они нужны?',
      en: 'What are meta-reducers and runtime checks in NgRx? What are they for?'
    },
    answer: {
      ru: `## Коротко

Meta-reducer — это **обёртка вокруг обычного reducer**: функция вида \`(reducer) => reducer\`. Она видит **каждый** action и состояние **до и после** редукции, то есть работает как middleware Redux-цикла. Runtime checks — это набор **готовых** meta-reducer'ов от NgRx, которые в dev-режиме следят, чтобы вы не нарушали правила Redux.

Аналогия: обычный reducer — это сотрудник, который обрабатывает заявки. Meta-reducer — начальник, через стол которого проходит **каждая** заявка до и после: он ведёт журнал (логирование), кладёт копию в архив (hydration в \`localStorage\`) или очищает картотеку при увольнении (reset на logout). Runtime checks — служба контроля, которая в тестовом офисе бьёт по рукам за «поправил бумагу карандашом вместо новой копии».

## Как это работает по шагам

1. NgRx собирает корневой reducer из ваших фич-редьюсеров.
2. Каждый meta-reducer из массива **оборачивает** его, получая на вход reducer и возвращая новый.
3. Обёртки применяются в порядке массива и вкладываются «снаружи внутрь»: первый в списке оказывается **самым внешним** и видит action первым.
4. При каждом \`dispatch\` цепочка проходит сверху вниз: внешняя обёртка → ... → настоящий reducer → обратно наружу с новым состоянием.
5. Проверки \`runtimeChecks\` — это те же meta-reducer'ы, только встроенные: они замораживают объекты через \`Object.freeze\` и валидируют содержимое.

## Из чего состоят runtime checks

- \`strictStateImmutability\` — **замораживает state** и ловит мутации (когда state поменяли напрямую вместо возврата нового объекта).
- \`strictActionImmutability\` — то же самое для action.
- \`strictStateSerializability\` — state должен быть сериализуем: никаких \`Date\`, \`Map\`, функций.
- \`strictActionSerializability\` — то же для action.
- \`strictActionWithinNgZone\` — action должен диспатчиться **внутри** Angular zone.
- \`strictActionTypeUniqueness\` — типы action'ов не должны повторяться.

## Пример

\`\`\`ts
function logger(reducer: ActionReducer<State>): ActionReducer<State> {
  return (state, action) => {
    const next = reducer(state, action);
    console.log(action.type, { prev: state, next });
    return next;
  };
}

export const metaReducers: MetaReducer<State>[] = [logger];

StoreModule.forRoot(reducers, {
  metaReducers,
  runtimeChecks: {
    strictStateImmutability: true,
    strictActionImmutability: true,
    strictStateSerializability: true,
    strictActionSerializability: true,
  }
});
\`\`\`

Почему так: логгер не трогает ни один фич-редьюсер — он просто оборачивает их все сразу. Тем же приёмом делают hydration (восстановить state из \`localStorage\` при старте и сохранять на каждое изменение), сброс всего дерева на \`logout\`, undo/redo и перехват для аналитики.

## Что сказать на собеседовании

> Meta-reducer — reducer более высокого порядка, функция из reducer в reducer: он оборачивает корневой reducer и перехватывает каждый action с состоянием до и после редукции — middleware для Redux-цикла. Применения: логирование, hydration из \`localStorage\`, сброс дерева при logout, undo-redo. Runtime checks — встроенные meta-reducer'ы dev-режима: \`strictStateImmutability\` и \`strictActionImmutability\` замораживают state и action, \`strictStateSerializability\` и \`strictActionSerializability\` запрещают \`Date\`, \`Map\` и функции, \`strictActionWithinNgZone\` требует диспатчить в Angular zone, \`strictActionTypeUniqueness\` ловит дублирующиеся типы. В проде их отключают, потому что заморозка дорогая. Нюанс: они применяются в порядке массива и оборачивают reducer снаружи внутрь, поэтому первый в списке видит action раньше всех.

## Ловушки

- **Заморозка ловит мутации только в dev.** В проде мутирующий код «работает», а баг проявится как непереотрисованный OnPush-компонент.
- **Порядок в массиве важен.** Логгер после hydration увидит уже восстановленное состояние, до — исходное; для reset-on-logout порядок критичен.
- **Сериализуемость отключают осознанно** (когда в state лежат непримитивы), но это против духа Redux и ломает DevTools time-travel.
- **Meta-reducer — не место для side-effect'ов.** Запись в \`localStorage\` внутри него — это уже нечистая функция, поэтому многие выносят hydration в effect.
- **\`strictActionWithinNgZone\` ловит dispatch из колбэков сторонних библиотек** (WebSocket, сторонние SDK) — лечится \`ngZone.run()\`.
- **Спросят следом:** чем meta-reducer отличается от effect. Ответ: meta-reducer **синхронный и чистый**, стоит в цепочке редукции; effect **асинхронный**, живёт сбоку и диспатчит новые action'ы.`,
      en: `## In short

A meta-reducer is a **wrapper around an ordinary reducer**: a function of the shape \`(reducer) => reducer\`. It sees **every** action and the state **before and after** reduction, which makes it middleware for the Redux cycle. Runtime checks are a set of **ready-made** meta-reducers shipped by NgRx that police the Redux rules in dev mode.

Analogy: an ordinary reducer is the clerk who processes requests. A meta-reducer is the manager whose desk **every** request crosses, before and after: they keep a log (logging), file a copy in the archive (hydration into \`localStorage\`), or wipe the cabinet when someone leaves (reset on logout). Runtime checks are the compliance officer who, in the test office, slaps your hand for "editing the form in pencil instead of making a fresh copy".

## How it works, step by step

1. NgRx assembles the root reducer out of your feature reducers.
2. Each meta-reducer in the array **wraps** it, taking a reducer in and returning a new one.
3. The wrappers are applied in array order and nest "outside-in": the first in the list ends up **outermost** and sees the action first.
4. On every \`dispatch\` the chain runs top-down: outer wrapper → ... → the real reducer → and back out with the new state.
5. \`runtimeChecks\` are those same meta-reducers, just built in: they freeze objects with \`Object.freeze\` and validate the contents.

## What runtime checks consist of

- \`strictStateImmutability\` — **freezes state** and catches mutations (changing state directly instead of returning a new object).
- \`strictActionImmutability\` — the same for actions.
- \`strictStateSerializability\` — state must be serializable: no \`Date\`, \`Map\` or functions.
- \`strictActionSerializability\` — the same for actions.
- \`strictActionWithinNgZone\` — actions must be dispatched **inside** the Angular zone.
- \`strictActionTypeUniqueness\` — action types must not be duplicated.

## Example

\`\`\`ts
function logger(reducer: ActionReducer<State>): ActionReducer<State> {
  return (state, action) => {
    const next = reducer(state, action);
    console.log(action.type, { prev: state, next });
    return next;
  };
}

export const metaReducers: MetaReducer<State>[] = [logger];

StoreModule.forRoot(reducers, {
  metaReducers,
  runtimeChecks: {
    strictStateImmutability: true,
    strictActionImmutability: true,
    strictStateSerializability: true,
    strictActionSerializability: true,
  }
});
\`\`\`

Why this way: the logger touches no feature reducer at all — it simply wraps all of them at once. The same trick powers hydration (restore state from \`localStorage\` at startup and save on every change), resetting the whole tree on \`logout\`, undo/redo, and interception for analytics.

## What to say in the interview

> A meta-reducer is a higher-order reducer, a function from reducer to reducer. It wraps the root reducer and intercepts every action along with the state before and after reduction, which makes it middleware for the Redux cycle. Typical uses are logging state diffs, hydration from \`localStorage\`, resetting the entire state tree on logout, and undo/redo. Runtime checks are built-in meta-reducers NgRx enables in dev mode: \`strictStateImmutability\` and \`strictActionImmutability\` freeze state and actions and catch mutations, \`strictStateSerializability\` and \`strictActionSerializability\` require that neither contains \`Date\`, \`Map\` or functions, \`strictActionWithinNgZone\` requires dispatching inside the Angular zone, and \`strictActionTypeUniqueness\` catches duplicated action types. In production the checks are switched off because freezing is expensive. One nuance: meta-reducers are applied in array order and wrap the reducer outside-in, so the first in the list sees the action first.

## Gotchas

- **Freezing only catches mutations in dev.** In production the mutating code "works" and the bug surfaces as an OnPush component that never re-renders.
- **Array order matters.** A logger placed after hydration sees the restored state, before it the original one; for reset-on-logout the order is critical.
- **Serializability is sometimes disabled deliberately** (when state holds non-primitives), but it goes against the Redux spirit and breaks DevTools time-travel.
- **A meta-reducer is not a place for side effects.** Writing to \`localStorage\` inside one already makes it impure, which is why many teams move hydration into an effect.
- **\`strictActionWithinNgZone\` trips on dispatches from third-party callbacks** (WebSockets, external SDKs) — fix it with \`ngZone.run()\`.
- **Follow-up they will ask:** how a meta-reducer differs from an effect. Answer: a meta-reducer is **synchronous and pure** and sits in the reduction chain; an effect is **asynchronous**, lives alongside, and dispatches new actions.`
    }
  },
  {
    id: 'rxjs-050',
    category: 'js-state',
    level: 'Hard',
    tags: ['ngrx', 'component-store', 'local-state'],
    question: {
      ru: 'Что такое NgRx ComponentStore и когда выбирать его вместо глобального Store?',
      en: 'What is NgRx ComponentStore and when do you choose it over the global Store?'
    },
    answer: {
      ru: `## Коротко

\`@ngrx/component-store\` — это **маленький стор, который живёт и умирает вместе с компонентом**. Никаких actions, reducers, глобального dispatch и DevTools — только состояние, производные потоки и эффекты, всё внутри одного класса.

Аналогия: глобальный \`Store\` — это городской архив: туда ходят все отделы, всё документируется, есть журнал операций. \`ComponentStore\` — это папка на столе конкретного сотрудника: удобно, быстро, никакой бюрократии, но когда сотрудник уходит — папка уходит вместе с ним.

## Из чего состоит

1. **Состояние** задаётся в конструкторе через \`super(initialState)\`, а точечно правится через \`patchState\`.
2. **\`updater\`** — синхронное обновление, аналог reducer: \`(state, value) => newState\`. Возвращает функцию, которую вы вызываете как обычный метод.
3. **\`select\`** — производный поток: **мемоизированный** и с \`distinctUntilChanged\` из коробки, то есть лишних перерисовок не будет.
4. **\`effect\`** — принимает **Observable** входных значений и запускает side-effect (обычно \`switchMap\` к API). Подписка живёт ровно столько, сколько живёт store, и снимается автоматически.
5. Возвращённую \`effect\` функцию можно вызвать **и без аргумента** (\`this.load()\`), **и со значением**, **и с Observable** — во всех случаях она сама разберётся с подпиской.

## Пример

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

Почему так: \`load\` — это effect, а не метод с ручной подпиской, поэтому запрос отменится сам при уничтожении компонента. \`tapResponse\` здесь обязателен: он ловит ошибку **внутри** \`switchMap\`, и внешний поток effect'а остаётся живым — иначе одна упавшая загрузка навсегда «выключит» кнопку.

## Когда что использовать

**ComponentStore**, если:

- состояние **локально** для фичи или компонента и другим частям приложения не нужно;
- time-travel и Redux DevTools на этот срез не нужны;
- хочется меньше boilerplate, чем в Redux, но больше структуры, чем у голого \`BehaviorSubject\`;
- состояние должно **умирать вместе с компонентом** — тогда его кладут в \`providers\` компонента.

**Глобальный Store**, если:

- состояние **разделяется** многими фичами и нужен единый источник истины;
- нужны DevTools, meta-reducers, эффекты уровня приложения.

## Что сказать на собеседовании

> \`ComponentStore\` — локальный реактивный стор из \`@ngrx/component-store\`, привязанный к жизненному циклу компонента и работающий без Redux-церемоний: нет actions, reducers и dispatch. Примитивов три: \`updater\` — синхронное обновление, \`select\` — мемоизированный производный поток с distinct из коробки, и \`effect\`, который принимает Observable входа, запускает side-effect вроде \`switchMap\` к API и управляет подпиской. Беру его, когда состояние локально для фичи: меньше boilerplate, чем глобальный Store, но больше структуры, чем набор \`BehaviorSubject\`. Глобальный Store — когда состояние разделяется фичами и нужны DevTools. Нюанс: \`ComponentStore\` регистрируют в \`providers\` компонента, чтобы он уничтожался вместе с ним, а внутри эффектов обязателен \`tapResponse\`, потому что ошибка не должна убить внешний поток.

## Ловушки

- **Зарегистрировали в корне вместо \`providers\` компонента** — стор становится синглтоном, состояние «переезжает» между экземплярами компонента.
- **Забыли \`tapResponse\`** — первая же ошибка API убивает поток effect'а, и кнопка перестаёт работать до перезагрузки страницы.
- **\`catchError\` снаружи \`switchMap\`** — та же ошибка, что и в NgRx-эффектах: ловить надо **внутри** внутреннего потока.
- **Мутация state в \`updater\`.** Возвращайте новый объект, иначе селекторы с \`distinctUntilChanged\` не увидят изменения.
- **DevTools недоступны** — отлаживать придётся логами; это осознанная плата за отсутствие церемоний.
- **Спросят следом:** чем \`ComponentStore\` отличается от \`SignalStore\`. Ответ: тот же подход к локальному состоянию, но на сигналах и с композицией через features вместо наследования от класса.`,
      en: `## In short

\`@ngrx/component-store\` is a **small store that lives and dies with its component**. No actions, no reducers, no global dispatch, no DevTools — just state, derived streams and effects, all inside a single class.

Analogy: the global \`Store\` is the city archive: every department goes there, everything is recorded, there is an audit trail. \`ComponentStore\` is the folder on one employee's desk: convenient, fast, zero bureaucracy — but when the employee leaves, the folder leaves with them.

## What it is made of

1. **State** is set in the constructor via \`super(initialState)\` and patched pointwise with \`patchState\`.
2. **\`updater\`** — a synchronous update, the reducer analogue: \`(state, value) => newState\`. It returns a function you call like an ordinary method.
3. **\`select\`** — a derived stream: **memoized** and \`distinctUntilChanged\` out of the box, so no redundant re-renders.
4. **\`effect\`** — takes an **Observable** of input values and runs a side-effect (usually a \`switchMap\` to an API). Its subscription lives exactly as long as the store and is torn down automatically.
5. The function \`effect\` returns can be called **with no argument** (\`this.load()\`), **with a value**, or **with an Observable** — it sorts out the subscription in all three cases.

## Example

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

Why this way: \`load\` is an effect rather than a method with a manual subscription, so the request cancels itself when the component is destroyed. \`tapResponse\` is mandatory here: it catches the error **inside** the \`switchMap\`, keeping the effect's outer stream alive — otherwise one failed load would switch the button off permanently.

## When to use which

**ComponentStore** when:

- state is **local** to a feature or component and nothing else in the app needs it;
- time-travel and Redux DevTools on this slice are unnecessary;
- you want less boilerplate than Redux but more structure than a bare \`BehaviorSubject\`;
- the state should **die with the component** — then you put it in the component's \`providers\`.

**Global Store** when:

- state is **shared** across many features and you need a single source of truth;
- you need DevTools, meta-reducers, app-level effects.

## What to say in the interview

> \`ComponentStore\` is a local reactive store from \`@ngrx/component-store\`, bound to the component lifecycle and working without Redux ceremony: no actions, no reducers, no global dispatch. It gives you three primitives: \`updater\`, a synchronous state update; \`select\`, a derived stream that is memoized and distinct out of the box; and \`effect\`, which takes an Observable of inputs, runs a side-effect — typically a \`switchMap\` to an API — and manages its own subscription for the store's lifetime. I choose it when state is local to a feature: far less boilerplate than the global Store but more structure than a pile of \`BehaviorSubject\`s. I take the global Store when state is shared across features and I need DevTools, meta-reducers and app-level effects. An important nuance: \`ComponentStore\` is registered in the component's \`providers\` so it is destroyed together with the component, and inside effects \`tapResponse\` is mandatory, because an error must not kill the effect's outer stream.

## Gotchas

- **Registering it at the root instead of the component's \`providers\`** makes it a singleton, and state leaks between component instances.
- **Forgetting \`tapResponse\`** means the first API error kills the effect's stream and the button stops working until the page is reloaded.
- **\`catchError\` outside the \`switchMap\`** is the same mistake as in NgRx effects: catch it **inside** the inner stream.
- **Mutating state in an \`updater\`.** Return a new object, otherwise selectors with \`distinctUntilChanged\` will not see the change.
- **No DevTools** — you debug with logs; that is the deliberate price of skipping the ceremony.
- **Follow-up they will ask:** how \`ComponentStore\` differs from \`SignalStore\`. Answer: the same approach to local state, but built on signals and composed through features instead of extending a class.`
    }
  },
  {
    id: 'rxjs-051',
    category: 'js-state',
    level: 'Expert',
    tags: ['ngrx', 'effects', 'error-handling'],
    question: {
      ru: 'Почему ошибка в NgRx effect «убивает» поток и как этого избежать? Объясните гигиену actions.',
      en: 'Why does an error in an NgRx effect "kill" the stream and how do you avoid it? Explain action hygiene.'
    },
    answer: {
      ru: `## Коротко

Effect — это **один долгоживущий** поток: \`actions$\` течёт через него всё время жизни приложения. А \`error\` в RxJS — событие **терминальное**: дошло до потока — поток мёртв навсегда. Поэтому один упавший запрос выключает фичу целиком: кнопка нажимается, action диспатчится, но effect на него больше **не реагирует**.

Аналогия: \`actions$\` — это конвейер, а \`switchMap\` — станок сбоку от него. Если деталь взорвалась **в станке**, надо чинить станок. А если позволить взрыву дойти **до конвейера** — встанет весь цех. \`catchError\` внутри \`switchMap\` — это защитный кожух на станке.

## Как это работает по шагам

1. \`this.actions$\` — бесконечный поток всех action'ов приложения.
2. \`ofType(loadUsers)\` фильтрует нужные, \`switchMap\` на каждый запускает **внутренний** поток — HTTP-запрос.
3. Запрос упал → ошибка идёт из внутреннего потока во внешний.
4. Если её не поймали внутри, \`actions$\` получает \`error\` → внешний поток завершается терминально → **effect мёртв**.
5. Поэтому \`catchError\` ставится **внутри** higher-order оператора, на внутреннем потоке, и **возвращает action** (обычно failure), а не пробрасывает ошибку дальше.

## Пример

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

Почему так: \`catchError\` внутри «гасит» ошибку до того, как она покинет внутренний поток, и превращает её в обычное значение — failure-action. Поставьте тот же \`catchError\` **снаружи** \`switchMap\` — и он поймает ошибку уже на уровне \`actions$\`, то есть после смерти effect'а. Правило не зависит от стратегии: с \`exhaustMap\` и \`concatMap\` ровно так же.

## Гигиена actions

- **Action — это событие, а не команда**: \`[Users Page] Opened\`, а не \`loadUsers\`. Один источник события → один action; не переиспользуйте один action из несвязанных мест.
- **Пары Success/Failure**: у каждого асинхронного action есть явные \`...Success\` и \`...Failure\`, которые обрабатывает reducer.
- Не диспатчите action **из reducer'а**; не кладите в action несериализуемое.
- \`createEffect(..., { dispatch: false })\` — для эффектов без результирующего action (навигация, тосты), иначе store зациклится.

## Что сказать на собеседовании

> Effect — это долгоживущий Observable вида \`actions$.pipe(ofType(...), switchMap(...))\`, а ошибка в RxJS — терминальное событие. Если она дойдёт до \`actions$\`, поток завершится и effect навсегда перестанет реагировать на action'ы: один упавший запрос глушит всю фичу. Поэтому \`catchError\` обязан стоять внутри higher-order оператора, на внутреннем потоке запроса, и возвращать failure-action, а не пробрасывать ошибку наружу; со \`exhaustMap\` и \`concatMap\` правило то же. NgRx подстраховывает, переподписываясь на упавший effect, но контекст теряется, полагаться на это нельзя. Гигиена action'ов: action — это событие, а не команда, отсюда именование \`[Users Page] Opened\`; у каждой асинхронной операции есть пара Success и Failure; а эффекты без результирующего action объявляют с \`dispatch: false\`, иначе store уйдёт в цикл.

## Ловушки

- **\`catchError\` снаружи \`switchMap\`** — эталонная ошибка на собеседовании. Effect умирает после первой же неудачи.
- **\`catchError\`, возвращающий \`EMPTY\`**, спасает поток, но оставляет UI в вечном \`loading: true\` — состояние надо закрывать failure-action'ом.
- **Автопереподписка NgRx маскирует баг.** В консоли ошибка есть, фича «иногда работает» — и это выглядит как плавающий баг.
- **Забыли \`{ dispatch: false }\`** у эффекта навигации — effect вернёт не-action, и NgRx ругнётся или уйдёт в бесконечный цикл.
- **Один action на несколько источников** — потом невозможно понять по DevTools, кто его вызвал; именуйте по источнику события.
- **Спросят следом:** какой flattening выбрать для эффекта. Ответ: \`switchMap\` для поиска и загрузок (нужен только последний), \`concatMap\` для команд записи (важен порядок), \`exhaustMap\` для логина и submit (защита от двойного клика), \`mergeMap\` когда операции независимы.`,
      en: `## In short

An effect is **one long-lived** stream: \`actions$\` flows through it for the entire life of the app. And in RxJS \`error\` is a **terminal** event: once it reaches a stream, that stream is dead for good. So a single failed request switches the whole feature off — the button still clicks, the action still dispatches, but the effect **no longer reacts** to it.

Analogy: \`actions$\` is the conveyor belt and \`switchMap\` is a machine standing beside it. If a part blows up **inside the machine**, you repair the machine. Let the blast reach **the belt** and the entire shop floor stops. \`catchError\` inside the \`switchMap\` is the machine's safety housing.

## How it works, step by step

1. \`this.actions$\` is an infinite stream of every action in the app.
2. \`ofType(loadUsers)\` filters the ones you want; \`switchMap\` starts an **inner** stream for each — the HTTP request.
3. The request fails → the error travels from the inner stream into the outer one.
4. If nothing caught it inside, \`actions$\` receives \`error\` → the outer stream terminates → **the effect is dead**.
5. That is why \`catchError\` goes **inside** the higher-order operator, on the inner stream, and **returns an action** (usually a failure) instead of rethrowing.

## Example

\`\`\`ts
load$ = createEffect(() => this.actions$.pipe(
  ofType(loadUsers),
  switchMap(() => this.api.load().pipe(
    map((users) => loadUsersSuccess({ users })),
    catchError((err) => of(loadUsersFailure({ error: err.message })))
    //          ^ INSIDE switchMap — the outer stream stays alive
  ))
));
\`\`\`

Why this way: \`catchError\` on the inside absorbs the error before it can leave the inner stream and converts it into an ordinary value — the failure action. Put that same \`catchError\` **outside** the \`switchMap\` and it catches the error at the \`actions$\` level, i.e. after the effect has already died. The rule is independent of the flattening strategy: \`exhaustMap\` and \`concatMap\` behave exactly the same.

## Action hygiene

- **An action is an event, not a command**: \`[Users Page] Opened\`, not \`loadUsers\`. One event source → one action; do not reuse an action from unrelated places.
- **Success/Failure pairs**: every async action has explicit \`...Success\` and \`...Failure\` counterparts handled by the reducer.
- Never dispatch actions **from a reducer**; never put non-serializable data into an action.
- \`createEffect(..., { dispatch: false })\` — for effects with no resulting action (navigation, toasts), or the store loops.

## What to say in the interview

> An effect is a long-lived Observable of the shape \`actions$.pipe(ofType(...), switchMap(...))\`, and an error in RxJS is a terminal event. If it reaches \`actions$\`, the stream terminates with \`error\` and the effect stops reacting to future actions forever: one failed request mutes the entire feature. That is why \`catchError\` must sit inside the higher-order operator, on the inner request stream, and return an action, typically a failure, rather than rethrowing; \`exhaustMap\` and \`concatMap\` follow the same rule. NgRx does provide a safety net — it resubscribes to a failed effect and logs the error — but context is lost and the user never sees a proper failure action, so it cannot be relied upon. As for action hygiene: actions are events rather than commands, hence naming like \`[Users Page] Opened\`; every async operation gets an explicit Success and Failure pair; and effects with no resulting action, such as navigation or toasts, are declared with \`dispatch: false\`, otherwise the store goes into a loop.

## Gotchas

- **\`catchError\` outside the \`switchMap\`** is the textbook interview mistake. The effect dies after the very first failure.
- **A \`catchError\` returning \`EMPTY\`** saves the stream but leaves the UI stuck at \`loading: true\` — close the state with a failure action.
- **NgRx's auto-resubscribe masks the bug.** The console shows an error, the feature "sometimes works", and it reads like a flaky bug.
- **Forgetting \`{ dispatch: false }\`** on a navigation effect makes it return a non-action, so NgRx complains or loops forever.
- **One action shared by several sources** makes it impossible to tell from DevTools who triggered it; name actions after the event source.
- **Follow-up they will ask:** which flattening operator to pick for an effect. Answer: \`switchMap\` for search and loads (only the latest matters), \`concatMap\` for write commands (order matters), \`exhaustMap\` for login and submit (double-click protection), \`mergeMap\` when the operations are independent.`
    }
  },
  {
    id: 'rxjs-052',
    category: 'js-state',
    level: 'Expert',
    tags: ['ngrx', 'signal-store', 'rxmethod'],
    question: {
      ru: 'Разберите SignalStore глубже: withComputed, withMethods, withEntities, rxMethod и кастомные features.',
      en: 'Dive deeper into SignalStore: withComputed, withMethods, withEntities, rxMethod, and custom features.'
    },
    answer: {
      ru: `## Коротко

\`SignalStore\` собирается **не наследованием, а сборкой из кубиков**. \`signalStore(...features)\` принимает список функций-фич, и каждая **докладывает** в стор свой кусок: состояние, вычисляемые значения, методы, коллекцию сущностей, хуки жизненного цикла.

Аналогия: конструктор LEGO. Классический \`Store\` — это «отлитая деталь», которую можно только расширять наследованием. \`SignalStore\` — набор кубиков: взяли \`withState\`, сверху \`withEntities\`, сверху свой \`withPagination\` — и получили ровно тот стор, который нужен, причём типы на каждом шаге знают, что уже лежит в коробке.

## Из чего состоит

1. \`withState(initial)\` — реактивное состояние; **каждое поле становится \`Signal\`**, причём с **deep signals**: вложенные объекты тоже превращаются в сигналы.
2. \`withComputed(({ x }) => ({ doubled: computed(() => x() * 2) }))\` — производные мемоизированные \`computed\`-сигналы.
3. \`withMethods((store, api = inject(Api)) => ({ ... }))\` — методы, которые меняют состояние через \`patchState\` или запускают side-effect'ы; внутри доступен и store, и \`inject\`.
4. \`withEntities<T>()\` — нормализованная коллекция (\`entityMap\` + \`ids\`) и сигнал \`entities()\`. Обновляется хелперами \`setAllEntities\`, \`addEntity\`, \`updateEntity\`, \`removeEntity\`, которые передаются в \`patchState\`. Несколько коллекций в одном сторе — через \`entityConfig\` и именованные коллекции.
5. \`withHooks\` — \`onInit\` и \`onDestroy\`.
6. \`rxMethod<T>(pipeline)\` — **мост между императивным вызовом и RxJS**. Возвращает функцию, которую можно вызвать со значением, с сигналом или с Observable; вход прогоняется через ваш pipeline, а подпиской она управляет сама, живя в DI-контексте стора. Идеален для debounced-загрузок, реагирующих на сигнал-фильтр.
7. \`signalStoreFeature(...)\` — **своя** переиспользуемая фича: \`withLoadingState()\`, \`withPagination()\`, \`withUndoRedo()\`. Она типобезопасно объявляет, какие входные сигналы и методы ожидает и что добавляет.

## Пример

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

Почему так: состояние, коллекция, вычисляемые значения и методы объявлены **в одном месте и по одному правилу** — каждая фича лишь дописывает свой слой. \`load\` объявлен через \`rxMethod\`, поэтому его можно и позвать руками, и «подключить» к сигналу фильтра, а подписка снимется вместе со стором.

## Что сказать на собеседовании

> \`signalStore\` собирает стор из функций-фич — композиция вместо наследования. \`withState\` описывает состояние, где каждое поле — сигнал, причём deep signals означают, что вложенные объекты тоже сигналы; \`withComputed\` добавляет мемоизированные производные, \`withMethods\` — методы, меняющие состояние через \`patchState\`, \`withHooks\` даёт \`onInit\` и \`onDestroy\`. \`withEntities\` подключает коллекцию \`entityMap\` плюс \`ids\` и сигнал \`entities()\`, обновляемую хелперами \`setAllEntities\`, \`addEntity\`, \`updateEntity\` и \`removeEntity\`. \`rxMethod\` — мост к RxJS: возвращает функцию, вызываемую значением, сигналом или Observable, прогоняет вход через pipeline и управляет подпиской в DI-контексте стора, поэтому \`takeUntilDestroyed\` не нужен. А переиспользуемую логику выносят в фичу через \`signalStoreFeature\`.

## Ловушки

- **Прямая мутация состояния не работает.** Deep signals требуют иммутабельных обновлений через \`patchState\` — присваивание в объект просто не заметят.
- **\`rxMethod\` не нужно оборачивать в \`takeUntilDestroyed\`** — он отписывается сам при уничтожении стора; лишняя обёртка только запутает.
- **\`providedIn: 'root'\` делает стор синглтоном** на всё приложение; для локального состояния кладите его в \`providers\` компонента.
- **Ошибка внутри \`rxMethod\` убивает его поток** — точно так же, как в NgRx-эффектах. \`tapResponse\` или \`catchError\` ставится **внутри** \`switchMap\`.
- **\`withComputed\` не для side-effect'ов.** Внутри \`computed\` нельзя дёргать \`patchState\` или API — только чистые вычисления.
- **Спросят следом:** когда всё-таки брать глобальный NgRx Store вместо \`SignalStore\`. Ответ: когда нужны DevTools с time-travel, meta-reducers, строгий аудит через actions и общее состояние на много фич.`,
      en: `## In short

A \`SignalStore\` is built **not by inheritance but by assembly**. \`signalStore(...features)\` takes a list of feature functions, and each one **adds its own piece** to the store: state, computed values, methods, an entity collection, lifecycle hooks.

Analogy: LEGO bricks. The classic \`Store\` is a moulded part you can only extend by inheritance. \`SignalStore\` is a set of bricks: take \`withState\`, click \`withEntities\` on top, then your own \`withPagination\` — and you get exactly the store you need, with the types at every step already knowing what is in the box.

## What it is made of

1. \`withState(initial)\` — reactive state; **every field becomes a \`Signal\`**, and with **deep signals** nested objects become signals too.
2. \`withComputed(({ x }) => ({ doubled: computed(() => x() * 2) }))\` — derived, memoized \`computed\` signals.
3. \`withMethods((store, api = inject(Api)) => ({ ... }))\` — methods that update state via \`patchState\` or run side-effects; both the store and \`inject\` are available inside.
4. \`withEntities<T>()\` — a normalized collection (\`entityMap\` + \`ids\`) plus an \`entities()\` signal. It is updated with helpers \`setAllEntities\`, \`addEntity\`, \`updateEntity\`, \`removeEntity\`, passed into \`patchState\`. Several collections in one store go through \`entityConfig\` and named collections.
5. \`withHooks\` — \`onInit\` and \`onDestroy\`.
6. \`rxMethod<T>(pipeline)\` — the **bridge between an imperative call and RxJS**. It returns a function callable with a value, a signal, or an Observable; the input runs through your pipeline and it manages the subscription itself, living in the store's DI context. Ideal for debounced loads reacting to a filter signal.
7. \`signalStoreFeature(...)\` — **your own** reusable feature: \`withLoadingState()\`, \`withPagination()\`, \`withUndoRedo()\`. It type-safely declares which input signals and methods it expects and what it contributes.

## Example

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

Why this way: state, the collection, computed values and methods are declared **in one place under one rule** — every feature merely adds its layer. \`load\` is declared through \`rxMethod\`, so it can be called by hand or wired to a filter signal, and its subscription dies with the store.

## What to say in the interview

> \`signalStore\` assembles a store out of feature functions — composition over inheritance. \`withState\` declares reactive state where every field becomes a signal, and deep signals mean nested objects are signals too; \`withComputed\` adds memoized derived signals, \`withMethods\` adds methods that update state via \`patchState\` with access to \`inject\`, and \`withHooks\` provides \`onInit\` and \`onDestroy\`. \`withEntities\` plugs in a normalized collection — \`entityMap\` plus \`ids\` — and an \`entities()\` signal, updated through helpers such as \`setAllEntities\`, \`addEntity\`, \`updateEntity\` and \`removeEntity\` passed into \`patchState\`. \`rxMethod\` is the bridge between an imperative call and RxJS: it returns a function you can call with a value, a signal or an Observable, runs the input through the given pipeline and manages the subscription itself inside the store's DI context, so no \`takeUntilDestroyed\` is needed. And any reusable logic can be extracted into a custom feature via \`signalStoreFeature\`.

## Gotchas

- **Mutating state directly does not work.** Deep signals require immutable updates through \`patchState\`; assigning into an object simply goes unnoticed.
- **Do not wrap \`rxMethod\` in \`takeUntilDestroyed\`** — it unsubscribes itself when the store is destroyed; the extra wrapper only confuses readers.
- **\`providedIn: 'root'\` makes the store an app-wide singleton**; for local state provide it in the component's \`providers\`.
- **An error inside \`rxMethod\` kills its stream** — exactly as in NgRx effects. Put \`tapResponse\` or \`catchError\` **inside** the \`switchMap\`.
- **\`withComputed\` is not for side effects.** Never call \`patchState\` or an API inside a \`computed\` — pure calculations only.
- **Follow-up they will ask:** when to still pick the global NgRx Store over \`SignalStore\`. Answer: when you need DevTools with time-travel, meta-reducers, a strict action-based audit trail, and state shared across many features.`
    }
  }
];
