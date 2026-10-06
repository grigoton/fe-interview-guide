import { InterviewQuestion } from '../interfaces/question.interface';

export const RXJS_STATE_QUESTIONS_MORE: InterviewQuestion[] = [
  {
    id: 'rxjs-037',
    category: 'rxjs',
    level: 'Hard',
    tags: ['scan', 'reduce', 'mergescan'],
    question: {
      ru: 'Сравните scan, reduce и mergeScan. В чём разница в эмиссии и где нужен mergeScan?',
      en: 'Compare scan, reduce, and mergeScan. How do their emissions differ and where is mergeScan needed?'
    },
    answer: {
      ru: `## В чём суть

Все три оператора — про **накопление**: берём предыдущий результат, добавляем новое значение, получаем новый результат. \`scan\` отдаёт промежуточный итог после каждого значения, \`reduce\` — один финальный итог при завершении потока, а \`mergeScan\` умеет делать шаг накопления **асинхронным**: следующий итог вычисляется запросом или другим Observable.

Аналогия — копилка. \`scan\` после каждой монетки вслух называет текущую сумму. \`reduce\` молчит до конца и называет итог **один раз**, когда копилку разбили. \`mergeScan\` каждую монетку сначала отправляет в банк на проверку, и **ответ банка** становится новой суммой.

**Какую проблему решает.** Реактивному коду постоянно нужно состояние, которое «помнит прошлое»: счётчик кликов, корзина, список подгруженных страниц, прогресс загрузки. Хранить его во внешней переменной и мутировать в \`subscribe\` — значит потерять реактивность и получить гонки. \`scan\` держит состояние прямо внутри потока, \`reduce\` сворачивает конечную последовательность в один ответ, а \`mergeScan\` закрывает случай, когда следующее состояние нельзя посчитать синхронно — нужно сходить на сервер, зная, что уже накоплено.

## Словарик терминов

- **Аккумулятор (accumulator, \`acc\`)** — накопленный результат, который передаётся от шага к шагу; также так называют саму функцию \`(acc, value) => newAcc\`.
- **Seed (начальное значение)** — с чего начинается накопление: \`0\` для суммы, \`[]\` для списка. Необязательный аргумент.
- **\`scan(fn, seed)\`** — на каждое значение вызывает \`fn\` и сразу отдаёт новый аккумулятор.
- **\`reduce(fn, seed)\`** — считает так же, но отдаёт только финальный аккумулятор при \`complete\`.
- **\`complete\`** — сигнал «поток успешно закончился, значений больше не будет». У \`interval\`, \`fromEvent\`, \`Subject\` его может не быть никогда.
- **\`mergeScan(fn, seed, concurrent)\`** — \`scan\`, у которого \`fn\` возвращает Observable; каждое его значение становится новым аккумулятором.
- **\`switchScan(fn, seed)\`** — то же, но новое значение источника отменяет предыдущий незавершённый шаг.
- **Concurrent (конкурентность)** — сколько асинхронных шагов может выполняться одновременно.
- **Reducer (редьюсер)** — чистая функция \`(state, action) => newState\`, сердце Redux и NgRx; в RxJS её естественно запускать через \`scan\`.
- **Иммутабельность** — не менять существующий объект, а возвращать новый (\`[...acc, x]\`, \`{ ...state }\`).
- **\`shareReplay\`** — делает поток общим для всех подписчиков и отдаёт новым подписчикам последнее значение.
- **\`distinctUntilChanged\`** — пропускает значение, только если оно не равно предыдущему (по умолчанию сравнение по ссылке \`===\`).

## Как это работает под капотом

В RxJS 7 \`scan\` и \`reduce\` — это **одна и та же внутренняя функция** с двумя флагами: «эмитить на каждом шаге» и «эмитить при завершении». Упрощённо:

\`\`\`ts
function scanInternals(fn, seed, hasSeed, emitOnNext, emitOnComplete) {
  return (source) => new Observable((subscriber) => {
    let hasState = hasSeed;
    let state = seed;
    let index = 0;
    source.subscribe({
      next: (value) => {
        const i = index++;
        // без seed первое значение просто становится аккумулятором
        state = hasState ? fn(state, value, i) : ((hasState = true), value);
        if (emitOnNext) subscriber.next(state);       // так работает scan
      },
      complete: () => {
        if (emitOnComplete && hasState) subscriber.next(state); // так работает reduce
        subscriber.complete();
      },
    });
  });
}
// scan   = scanInternals(fn, seed, hasSeed, true,  false)
// reduce = scanInternals(fn, seed, hasSeed, false, true)
\`\`\`

Что происходит по шагам:

1. При подписке создаются **свои** переменные \`state\` и \`index\`, поэтому каждая подписка копит своё состояние с нуля.
2. Приходит значение, и аккумулятор-функция получает \`(state, value, index)\`; результат записывается в \`state\`.
3. \`scan\` сразу отдаёт новый \`state\` наружу, поэтому подписчик видит каждый промежуточный итог.
4. \`reduce\` ничего не отдаёт, пока источник не пришлёт \`complete\`, и только тогда выдаёт последний \`state\`. Нет \`complete\` — нет и результата.
5. \`mergeScan\` устроен иначе: это \`mergeMap\`, в котором ваша функция получает **текущий** аккумулятор и возвращает Observable. Каждое значение этого Observable записывается в аккумулятор и уходит наружу.
6. Параметр \`concurrent\` у \`mergeScan\` работает как у \`mergeMap\`: при \`1\` следующий шаг ждёт в очереди, пока закончится предыдущий, и поэтому видит уже обновлённый аккумулятор.

\`\`\`text
source:  --1--2--3--|
scan(+): --1--3--6--|
reduce:  -----------(6|)
\`\`\`

### Пример 1. \`scan\` и \`reduce\` на одном потоке

\`\`\`ts
import { of, scan, reduce } from 'rxjs';

of(1, 2, 3).pipe(scan((acc, x) => acc + x, 0)).subscribe((v) => console.log('scan', v));
// scan 1
// scan 3
// scan 6

of(1, 2, 3).pipe(reduce((acc, x) => acc + x, 0)).subscribe((v) => console.log('reduce', v));
// reduce 6
\`\`\`

Одна и та же функция, один и тот же источник — разница только в том, **когда** результат выходит наружу. Можно запомнить: \`reduce\` — это \`scan\`, от которого оставили только последнее значение.

### Пример 2. \`reduce\` на бесконечном потоке молчит

\`\`\`ts
import { interval, take, reduce } from 'rxjs';

interval(100).pipe(reduce((acc, x) => acc + x, 0)).subscribe(console.log);
// ничего — никогда: interval не завершается

interval(100).pipe(take(3), reduce((acc, x) => acc + x, 0)).subscribe(console.log);
// 3   (0 + 1 + 2, через ~300 мс)
\`\`\`

\`take(3)\` (взять три значения и завершиться) дал потоку \`complete\`, и \`reduce\` смог выдать итог. На \`fromEvent\`, \`Subject\` или потоке из стора без \`take\`/\`takeUntil\` \`reduce\` будет молчать вечно — классическая ловушка на собеседовании.

### Пример 3. Без seed

\`\`\`ts
import { of, EMPTY, scan, reduce } from 'rxjs';

of(10, 20, 30).pipe(
  scan((acc, x, i) => {
    console.log(\`  acc=\${acc} x=\${x} i=\${i}\`);
    return acc + x;
  })
).subscribe((v) => console.log('next', v));
// next 10          ← первое значение стало аккумулятором, функция не вызывалась
//   acc=10 x=20 i=1
// next 30
//   acc=30 x=30 i=2
// next 60

EMPTY.pipe(reduce((acc, x) => acc + x)).subscribe({
  next: (v) => console.log('next', v),
  complete: () => console.log('complete'),
});
// complete         ← без seed на пустом потоке: просто завершение, без значения и без ошибки

EMPTY.pipe(reduce((acc, x) => acc + x, 0)).subscribe((v) => console.log('next', v));
// next 0           ← с seed на пустом потоке выдаётся сам seed
\`\`\`

Без seed первое значение без изменений становится аккумулятором, а индекс в функции начинается с 1. Это удобно для однотипных данных (сумма чисел), но опасно, когда тип аккумулятора отличается от типа значений — например, копите объект из чисел. Обратите внимание: в отличие от \`[].reduce(fn)\` в обычном JS, который на пустом массиве бросает \`TypeError\`, RxJS-овский \`reduce\` без seed на пустом потоке **не падает**, а просто завершается.

### Пример 4. \`scan\` как мини-стор

\`\`\`ts
import { Subject, scan } from 'rxjs';

type Action =
  | { type: 'add'; item: string }
  | { type: 'remove'; item: string }
  | { type: 'clear' };

function cartReducer(state: { items: string[] }, action: Action) {
  switch (action.type) {
    case 'add':    return { ...state, items: [...state.items, action.item] };
    case 'remove': return { ...state, items: state.items.filter((i) => i !== action.item) };
    case 'clear':  return { ...state, items: [] };
  }
}

const actions$ = new Subject<Action>();
const cart$ = actions$.pipe(scan(cartReducer, { items: [] as string[] }));

cart$.subscribe((s) => console.log(JSON.stringify(s.items)));
actions$.next({ type: 'add', item: 'book' });
actions$.next({ type: 'add', item: 'pen' });
actions$.next({ type: 'remove', item: 'book' });
actions$.next({ type: 'clear' });
// ["book"]
// ["book","pen"]
// ["pen"]
// []
\`\`\`

Это и есть идея Redux/NgRx в одну строку: поток действий + чистый reducer + \`scan\`. В NgRx состояние стора внутри вычисляется именно так — сворачиванием потока действий.

### \`mergeScan\` — асинхронный шаг накопления

\`\`\`ts
import { of, mergeScan } from 'rxjs';

of(1, 2).pipe(
  mergeScan((acc, x) => of(acc + x, acc + x * 10), 0)
).subscribe(console.log);
// 1    ← шаг для x=1 видит acc=0: выдаёт 0+1...
// 10   ← ...и 0+10; последнее (10) становится аккумулятором
// 12   ← шаг для x=2 видит acc=10: 10+2...
// 30   ← ...и 10+20
\`\`\`

Каждое значение внутреннего Observable — это одновременно эмиссия наружу и новый аккумулятор. Внутренний поток может быть HTTP-запросом, таймером, чем угодно — \`scan\` так не умеет, его шаг обязан вернуть готовое значение.

### Пример 5. Накопительная пагинация: почему \`concurrent = 1\`

Кнопка «Загрузить ещё»: следующая страница запрашивается со смещением, равным числу уже загруженных элементов.

\`\`\`ts
import { Subject, timer, map, mergeScan } from 'rxjs';

const api = {
  page: (offset: number) => {
    console.log(\`  GET offset=\${offset}\`);
    return timer(100).pipe(map(() => [offset + 1, offset + 2]));
  },
};

const loadMore$ = new Subject<void>();
loadMore$.pipe(
  mergeScan((acc: number[], _: void) => api.page(acc.length).pipe(map((next) => [...acc, ...next])), [] as number[], 1)
).subscribe((items) => console.log(JSON.stringify(items)));

loadMore$.next(); // два быстрых клика
loadMore$.next();
// с concurrent = 1:
//   GET offset=0
// [1,2]
//   GET offset=2     ← второй шаг ждал и увидел обновлённый аккумулятор
// [1,2,3,4]

// тот же код с concurrent = Infinity (значение по умолчанию):
//   GET offset=0
//   GET offset=0     ← оба шага стартовали с пустым аккумулятором
// [1,2]
// [1,2]              ← дубликат запроса, вторая страница так и не загружена
\`\`\`

С \`concurrent = 1\` шаги выстраиваются в очередь, как в \`concatMap\`, но каждый видит **текущий** аккумулятор — обычной связкой \`concatMap\` + \`scan\` такое не выразить без внешней переменной. Без лимита \`mergeScan\` ведёт себя как \`mergeMap\`: шаги идут параллельно, видят одинаковое состояние, а результаты могут прийти вперемешку.

### \`switchScan\` — накопление с отменой

\`\`\`ts
import { switchScan } from 'rxjs';

loadMore$.pipe(
  switchScan((acc: number[], _: void) => api.page(acc.length).pipe(map((next) => [...acc, ...next])), [] as number[])
).subscribe((items) => console.log(JSON.stringify(items)));

loadMore$.next();
loadMore$.next();
//   GET offset=0
//   GET offset=0     ← второй клик отменил первый запрос
// [1,2]
\`\`\`

\`switchScan\` (появился в RxJS 7) отменяет незавершённый шаг при новом значении, как \`switchMap\`. Для пагинации это плохой выбор, а вот для «пересчитать состояние по последнему фильтру, начиная от текущего» — подходящий.

### \`shareReplay\` — одно состояние на всех подписчиков

Состояние \`scan\` живёт в подписке, поэтому второй подписчик начинает с seed заново:

\`\`\`ts
import { Subject, scan, shareReplay } from 'rxjs';

const clicks$ = new Subject<void>();
const count$ = clicks$.pipe(scan((n) => n + 1, 0));

count$.subscribe((n) => console.log('A', n));
clicks$.next();
clicks$.next();
count$.subscribe((n) => console.log('B', n));
clicks$.next();
// A 1
// A 2
// A 3
// B 1    ← у B свой счётчик, и два прошлых клика он не видел

// с shareReplay({ bufferSize: 1, refCount: true }) после scan:
// A 1
// A 2
// B 2    ← B сразу получил текущее состояние
// A 3
// B 3
\`\`\`

\`shareReplay({ bufferSize: 1, refCount: true })\` создаёт **одну** общую подписку на \`scan\` и раздаёт последнее состояние новым подписчикам. \`refCount: true\` значит: когда отписался последний подписчик, общая подписка закрывается и не течёт. Ровно поэтому в \`codeSnippet\` к этому вопросу после \`mergeScan\` стоит \`shareReplay\`.

### Как выбрать

- Нужно состояние, которое меняется во времени и показывается сразу (счётчик, корзина, мини-стор, прогресс) → \`scan\`.
- Нужен один итог **конечного** потока (сумма, максимум, свёртка в массив или объект) → \`reduce\`.
- Следующее состояние вычисляется асинхронно и зависит от текущего (пагинация, применение действия на сервере) → \`mergeScan\` с \`concurrent = 1\`.
- То же, но устаревший шаг нужно отменять → \`switchScan\`.
- Состояние нужно нескольким подписчикам → любой из них + \`shareReplay({ bufferSize: 1, refCount: true })\`.

### Где это применяется на практике

- **Локальные сторы в сервисах**: \`actions$.pipe(scan(reducer, initialState), shareReplay(...))\` — лёгкая замена NgRx для одной фичи.
- **Бесконечная лента и «Загрузить ещё»** в таблицах и каталогах: \`mergeScan\` с \`concurrent = 1\` накапливает страницы.
- **Прогресс загрузки нескольких файлов**: \`scan\` суммирует загруженные байты из событий \`HttpClient\` с \`reportProgress\`.
- **Undo/redo**: \`scan\` хранит историю состояний и указатель на текущее.
- **Агрегация в отчётах**: \`reduce\` сворачивает конечный поток строк (например, после \`from(rows)\`) в итоговую сумму или словарь.
- **Метрики и логи**: \`scan\` считает скользящие показатели (число ошибок, средняя задержка) для дашборда.

## Важные нюансы и подводные камни

- **Состояние — на подписку.** Второй подписчик начинает с seed заново, при переподписке (например, после \`retry\` или повторного рендера с \`async\` pipe) seed тоже сбрасывается. Для общего состояния — \`shareReplay({ bufferSize: 1, refCount: true })\`.
- **\`reduce\` на бесконечном потоке** (\`interval\`, \`fromEvent\`, \`Subject\`) молчит вечно. Нужен \`take\`, \`takeUntil\` или другой источник \`complete\`.
- **«\`reduce\` = \`scan\` + \`last()\`» — неточно.** На пустом потоке \`last()\` бросает \`EmptyError\`, а \`reduce\` просто завершается (без seed) или выдаёт seed. Точнее говорить «\`scan\` + \`takeLast(1)\`».
- **Мутация аккумулятора** (\`acc.push(x); return acc\`) возвращает ту же ссылку: \`distinctUntilChanged\` пропустит только первое значение, OnPush-компоненты не обновятся, Redux DevTools покажет одну и ту же запись. Всегда возвращайте новый объект или массив.
- **Seed необязателен, но лучше его указывать.** Без него первое значение становится аккумулятором как есть, тип «съезжает», а индекс начинается с 1. На пустом потоке \`reduce\` без seed не выдаст ничего — ни значения, ни ошибки.
- **\`mergeScan\` без \`concurrent\`** ведёт себя как \`mergeMap\`: шаги параллельны, видят одинаковый аккумулятор, страницы дублируются или приходят вперемешку. Для порядка ставьте \`1\`.
- **Ошибка внутри \`mergeScan\` убивает весь поток.** Как и в \`mergeMap\`, ошибка внутреннего Observable уходит наружу, и накопленное состояние теряется. Ставьте \`catchError\` внутри шага и возвращайте, например, \`of(acc)\`.
- **Не делайте побочных эффектов в аккумуляторе \`scan\`.** Функция может вызываться заново для каждой подписки; запросы и логирование выносите в \`tap\` или в \`mergeScan\`.
- **\`mergeScan\` и \`switchScan\` отличаются отменой.** \`switchScan\` отменяет предыдущий внутренний поток при новом значении, \`mergeScan\` — нет.

**Плюсы:** состояние живёт внутри потока, без внешних переменных и гонок; reducer легко тестировать как чистую функцию; \`mergeScan\` закрывает асинхронные шаги, которые иначе требуют ручной синхронизации.
**Минусы:** состояние на подписку легко забыть расшарить; \`reduce\` бесполезен на бесконечных потоках; \`mergeScan\` требует аккуратного выбора \`concurrent\` и обработки ошибок, а читать его сложнее, чем обычный \`scan\`.

## Как это спрашивают на собеседовании

**Главный вывод:** \`scan\` выдаёт аккумулятор на каждом шаге, \`reduce\` — один раз при \`complete\`, а \`mergeScan\` — это \`scan\` с асинхронным шагом, где функция возвращает Observable. Для накопительной пагинации нужен \`mergeScan\` с \`concurrent = 1\`, а для общего состояния — \`shareReplay\` сверху.

Типичные формулировки: «Чем \`scan\` отличается от \`reduce\`?», «Почему \`reduce\` ничего не выдаёт?», «Как сделать “Загрузить ещё” на RxJS?».

Что могут спросить следом:

- *Как сделать простой стор без NgRx?* — \`actions$.pipe(scan(reducer, initial), shareReplay({ bufferSize: 1, refCount: true }))\`.
- *Чем \`mergeScan\` отличается от \`switchScan\`?* — \`switchScan\` отменяет незавершённый шаг при новом значении, \`mergeScan\` нет.
- *Что будет с \`reduce\` без seed на пустом потоке?* — Поток просто завершится без значения; ошибку бросает только \`Array.prototype.reduce\`.
- *Почему нельзя мутировать аккумулятор?* — Возвращается та же ссылка, и \`distinctUntilChanged\`, OnPush и DevTools не видят изменений.

### Ответ на 1 минуту

> \`scan\` — это \`reduce\` с промежуточными результатами: он вызывает аккумулятор на каждое значение и сразу отдаёт новое состояние, поэтому подходит для состояния во времени — счётчиков, корзины, мини-стора с reducer. \`reduce\` копит так же, но выдаёт одно значение при \`complete\`, по сути \`scan\` плюс \`takeLast(1)\`, и на бесконечном потоке молчит вечно. \`mergeScan\` — это \`scan\`, у которого шаг асинхронный: функция получает текущий аккумулятор и возвращает Observable, и каждое его значение становится новым аккумулятором. Классический кейс — «Загрузить ещё», где следующая страница запрашивается со смещением по уже загруженному. Там я ставлю \`concurrent = 1\`, иначе два быстрых клика увидят одинаковое состояние и загрузят одну страницу дважды. Важные нюансы: состояние живёт на подписку, поэтому для общего стора сверху нужен \`shareReplay\`, и аккумулятор нельзя мутировать.`,
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
    category: 'rxjs',
    level: 'Expert',
    tags: ['expand', 'recursion', 'pagination'],
    question: {
      ru: 'Как работает оператор expand и как с его помощью рекурсивно обойти пагинацию?',
      en: 'How does the expand operator work and how do you recursively traverse pagination with it?'
    },
    answer: {
      ru: `## В чём суть

\`expand\` — это **рекурсия внутри потока**. Каждое значение, которое выходит наружу, тут же **подаётся обратно** в вашу функцию \`project\`; та возвращает новый Observable, его значения тоже выходят наружу и снова возвращаются на вход. Остановка — когда \`project\` вернёт \`EMPTY\` (пустой поток, который сразу завершается).

Аналогия: клубок ниток. Тянете за конец — получаете кусок нитки и **новый конец**. Тянете за него — ещё кусок и ещё конец. Пока конец есть — тянете; кончился — стоп. Все вытянутые куски, включая самый первый, идут в поток.

**Какую проблему решает.** Многие API отдают данные порциями, и адрес следующей порции становится известен **только после** получения текущей: cursor-пагинация (\`next: "abc123"\`), ссылка \`next\` в ответе, дерево папок, где детей узла узнаёшь, только загрузив сам узел. Обычный \`mergeMap\` или \`switchMap\` умеет сделать **один** следующий шаг, а сколько шагов понадобится — заранее неизвестно. Без \`expand\` приходится писать рекурсивную функцию или цикл с \`await\`, теряя отмену и композицию операторов. \`expand\` выражает «повторяй шаг, пока есть продолжение» одним оператором.

## Словарик терминов

- **Observable (поток)** — объект, который со временем выдаёт значения; ничего не делает до подписки.
- **\`project\` (функция проекции)** — ваша функция \`(value, index) => Observable\`, которая по текущему значению строит следующий шаг.
- **\`EMPTY\`** — встроенный поток RxJS, который не выдаёт значений и сразу завершается. В \`expand\` это сигнал «у этой ветки продолжения нет».
- **Рекурсия** — когда шаг вызывает сам себя для следующих данных, пока не сработает условие выхода.
- **Ветка рекурсии** — цепочка шагов от одного значения: если шаг выдал два значения, дальше идут две независимые ветки.
- **Cursor-пагинация (cursor-based pagination)** — API отдаёт страницу и «курсор» (токен) следующей; номер страницы заранее неизвестен.
- **\`concurrent\`** — второй аргумент \`expand\`: сколько веток может работать одновременно. По умолчанию \`Infinity\`.
- **DFS / BFS (обход в глубину / в ширину)** — два порядка обхода дерева: сначала до самого низа одной ветки или сначала все узлы одного уровня.
- **\`concatMap\`** — превращает каждое значение в поток и обрабатывает их строго по очереди; массив тоже годится как поток.
- **\`toArray\`** — копит все значения и при завершении выдаёт их одним массивом.
- **\`take\` / \`takeWhile\`** — завершают поток после N значений или когда условие стало ложным.
- **\`repeat\`** — переподписывается на тот же самый источник после его завершения.

## Как это работает под капотом

\`expand\` в RxJS 7 построен на том же движке, что и \`mergeMap\`, с одним отличием: значения внутреннего потока не только уходят наружу, но и **снова попадают на вход**. Упрощённо:

\`\`\`ts
function expand(project, concurrent = Infinity) {
  return (source) => new Observable((subscriber) => {
    let index = 0;
    const handle = (value) => {
      subscriber.next(value);                  // 1. значение сразу уходит наружу
      project(value, index++).subscribe({      // 2. и подаётся в project
        next: (inner) => handle(inner),        // 3. результат снова идёт в handle — рекурсия
      });
    };
    source.subscribe({ next: handle });
    // поток завершается, когда источник и ВСЕ ветки завершились
  });
}
\`\`\`

По шагам:

1. Источник выдаёт первое значение (его часто называют seed — «зерно»). Оно **сразу уходит наружу** без изменений.
2. Это же значение передаётся в \`project(value, index)\`, где \`index\` — порядковый номер вызова, начиная с 0.
3. \`project\` возвращает Observable, и \`expand\` на него подписывается. Каждое его значение **тоже уходит наружу** и снова передаётся в шаг 2.
4. Как только \`project\` вернул \`EMPTY\`, эта ветка закрывается. Поэтому условие выхода — это просто тернарный оператор \`res.next ? запрос : EMPTY\`.
5. Поток завершается, когда завершились источник и **все** ветки, — только тогда сработают \`toArray\`, \`reduce\` и прочие операторы «на завершение».
6. Если \`project\` выдаёт несколько значений, появляется несколько веток. При \`concurrent = Infinity\` они идут параллельно, лишние при меньшем лимите ждут в очереди — как в \`mergeMap\`.

\`\`\`text
seed ──► project ──► v1 ──► project ──► v2 ──► project ──► EMPTY
наружу:  seed, v1, v2
\`\`\`

### Пример 1. Самая простая рекурсия

\`\`\`ts
import { of, EMPTY, expand } from 'rxjs';

of(1).pipe(
  expand((x) => (x < 8 ? of(x * 2) : EMPTY))
).subscribe({ next: console.log, complete: () => console.log('complete') });
// 1      ← seed тоже выходит наружу
// 2
// 4
// 8      ← 8 < 8 ложно, project вернул EMPTY
// complete
\`\`\`

Источник дал одно значение, а наружу вышли четыре: каждое значение породило следующее. Если источник выдаст несколько значений, у каждого будет своя рекурсия: \`of(1, 100)\` с правилом «+1, пока последняя цифра меньше 2» выдаст \`1, 2, 100, 101, 102\`.

### Пример 2. Cursor-пагинация

\`\`\`ts
import { EMPTY, expand, concatMap, toArray, defer, timer, map } from 'rxjs';

const DB = {
  start: { items: ['a', 'b'], next: 'c2' },
  c2:    { items: ['c', 'd'], next: 'c3' },
  c3:    { items: ['e'],      next: null },
};
const api = {
  getPage: (cursor: string) => defer(() => {
    console.log('GET', cursor);
    return timer(100).pipe(map(() => DB[cursor as keyof typeof DB]));
  }),
};

api.getPage('start').pipe(
  expand((res) => (res.next ? api.getPage(res.next) : EMPTY)),
  concatMap((res) => res.items), // развернуть страницы в отдельные элементы
  toArray()                      // собрать всё в один массив
).subscribe((all) => console.log('all', JSON.stringify(all)));
// GET start
// GET c2      ← запрос ушёл только после ответа на первую страницу
// GET c3
// all ["a","b","c","d","e"]
\`\`\`

\`defer\` (создаёт Observable в момент подписки) здесь имитирует \`HttpClient\`: запрос уходит при подписке, а не при вызове функции. Обратите внимание: в линейной пагинации у каждой страницы ровно одна следующая, значит ветка всегда одна, и порядок страниц гарантирован сам собой — никаких гонок.

### Пример 3. Тот же приём в Angular-сервисе

\`\`\`ts
interface Page<T> { items: T[]; next: string | null; }

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private http = inject(HttpClient);

  private page(cursor?: string) {
    const params: Record<string, string> = cursor ? { cursor } : {};
    return this.http.get<Page<Order>>('/api/orders', { params });
  }

  loadAll(maxPages = 50): Observable<Order[]> {
    return this.page().pipe(
      expand((res, i) => (res.next && i < maxPages - 1 ? this.page(res.next) : EMPTY)),
      concatMap((res) => res.items),
      toArray()
    );
  }
}

// в компоненте
this.ordersApi.loadAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((orders) => this.orders.set(orders));
\`\`\`

Здесь сразу две страховки: лимит страниц через \`index\` и отмена через \`takeUntilDestroyed\` (оператор Angular, который отписывается при уничтожении компонента). Отписка останавливает рекурсию и отменяет текущий HTTP-запрос.

### Лимит страниц: \`index\` надёжнее, чем \`take\`

\`\`\`ts
const MAX_PAGES = 2;

// вариант A: take после expand
api.getPage('start').pipe(
  expand((res) => (res.next ? api.getPage(res.next) : EMPTY)),
  take(MAX_PAGES), concatMap((res) => res.items), toArray()
).subscribe((all) => console.log('all', JSON.stringify(all)));
// GET start
// GET c2
// all ["a","b","c","d"]
// GET c3      ← лишний запрос успел стартовать и тут же был отменён

// вариант B: условие в project через index
api.getPage('start').pipe(
  expand((res, i) => (res.next && i < MAX_PAGES - 1 ? api.getPage(res.next) : EMPTY)),
  concatMap((res) => res.items), toArray()
).subscribe((all) => console.log('all', JSON.stringify(all)));
// GET start
// GET c2
// all ["a","b","c","d"]
\`\`\`

\`expand\` сначала отдаёт значение наружу, а потом вызывает \`project\`. Когда \`take\` получил вторую страницу и завершился, \`expand\` всё равно успевает подписаться на третий запрос — с \`HttpClient\` это означает отправку и немедленную отмену. Проверка \`index\` внутри \`project\` просто не начинает лишний шаг.

### \`takeWhile\` с флагом \`inclusive\`

Если условие выхода удобнее проверять снаружи, используют \`takeWhile\`. Его второй аргумент \`inclusive: true\` пропускает и то значение, на котором условие стало ложным:

\`\`\`ts
api.getPage('start').pipe(
  expand((res) => (res.next ? api.getPage(res.next) : EMPTY)),
  takeWhile((res) => res.next !== null),       // без флага
  concatMap((res) => res.items), toArray()
).subscribe((all) => console.log(JSON.stringify(all)));
// ["a","b","c","d"]        ← последняя страница (next: null) отрезана

// takeWhile((res) => res.next !== null, true) — с флагом:
// ["a","b","c","d","e"]
\`\`\`

Без флага последняя страница — та, у которой \`next: null\`, — проваливает условие и **не попадает** в результат. Это частый баг.

### Обход дерева: порядок зависит от \`concurrent\` и асинхронности

Каждый узел «раскрывается» в своих детей — \`expand\` обходит дерево целиком:

\`\`\`ts
import { of, from, expand, toArray, delay } from 'rxjs';

const tree: Record<string, string[]> = {
  root: ['A', 'B'], A: ['A1', 'A2'], B: ['B1'], A1: [], A2: [], B1: [],
};
const children = (id: string) => from(tree[id]);

of('root').pipe(expand(children), toArray()).subscribe((v) => console.log(v.join(' ')));
// root A A1 A2 B B1    ← синхронный project: обход в глубину (DFS)

of('root').pipe(expand(children, 1), toArray()).subscribe((v) => console.log(v.join(' ')));
// root A B A1 A2 B1    ← concurrent = 1: очередь, обход в ширину (BFS)

of('root').pipe(expand((id) => children(id).pipe(delay(50))), toArray()).subscribe((v) => console.log(v.join(' ')));
// root A B A1 A2 B1    ← асинхронные шаги с равной задержкой: уровень за уровнем
\`\`\`

С синхронным \`project\` рекурсия уходит вглубь сразу, как обычный рекурсивный вызов. С \`concurrent = 1\` дети ждут в очереди и обрабатываются в порядке поступления — это BFS. С реальным HTTP порядок определяется скоростью ответов, поэтому, если он важен, ставьте \`concurrent = 1\` или сортируйте результат.

### Синхронная бесконечная рекурсия переполняет стек

\`\`\`ts
of(1).pipe(expand((x) => of(x + 1))).subscribe({
  error: (e) => console.log(e.constructor.name, e.message),
});
// RangeError Maximum call stack size exceeded   ← после нескольких сотен значений, число зависит от движка

of(1).pipe(expand((x) => of(x + 1)), take(5)).subscribe(console.log);
// 1, 2, 3, 4, 5 (по одному на строку) ← take остановил рекурсию вовремя
\`\`\`

Синхронные шаги вкладывают вызовы друг в друга, и стек JS кончается. С HTTP-запросами этого не бывает: каждый шаг начинается в новом тике событийного цикла. Для глубокой синхронной рекурсии шаг можно сделать асинхронным: \`of(x + 1).pipe(subscribeOn(asapScheduler))\` — так 100 000 шагов проходят без ошибки.

### Альтернатива: рекурсивная функция

Тот же обход можно написать без \`expand\`:

\`\`\`ts
function loadFrom(cursor: string): Observable<PageRes> {
  return getPage(cursor).pipe(
    mergeMap((res) => (res.next ? concat(of(res), loadFrom(res.next)) : of(res)))
  );
}
loadFrom('start').pipe(concatMap((r) => r.items), toArray()).subscribe((v) => console.log(JSON.stringify(v)));
// ["a","b","c","d","e"]
\`\`\`

Работает, но условие выхода, лимит и параллелизм размазаны по функции. \`expand\` выражает то же самое одним оператором и даёт \`concurrent\` и \`index\` из коробки.

### Где это применяется на практике

- **Выгрузка всех записей из cursor-API** для экспорта в CSV или Excel из data grid: «скачать всё», хотя сервер отдаёт по 100 строк.
- **Ленивые деревья**: файловые менеджеры, оргструктуры, категории каталога, где дети узла приходят отдельным запросом.
- **Обход связанных ресурсов**: ссылки \`next\` в HATEOAS-API или в заголовке \`Link\`, цепочки зависимостей.
- **Polling до готовности**: запросить статус задачи, и пока он \`pending\` — запросить снова через \`timer\`: \`expand((s) => s.status === 'pending' ? timer(1000).pipe(switchMap(() => getStatus())) : EMPTY)\`.
- **Генерация последовательностей** в тестах и демо: степени двойки, Фибоначчи, ретраи с растущей задержкой.

## Важные нюансы и подводные камни

- **Нет условия выхода — бесконечная рекурсия.** \`project\` обязан когда-то вернуть \`EMPTY\`; страховка — лимит через \`index\`, \`take(n)\` или \`takeWhile\`.
- **Возвращать нужно Observable, а не \`undefined\`.** Если в ветке «стоп» забыть \`EMPTY\` и вернуть \`undefined\`, поток упадёт с ошибкой «You provided 'undefined' where a stream was expected».
- **Seed тоже эмитится.** Первое значение уходит наружу как есть; если оно не нужно, уберите его через \`skip(1)\` или преобразуйте.
- **\`takeWhile\` без \`true\`-флага отрежет последнюю страницу.** Второй аргумент \`inclusive\` включает значение, на котором условие стало ложным.
- **Порядок важен только при ветвлении.** В линейной пагинации ветка одна и страницы идут строго по очереди. А вот при обходе дерева или нескольких ссылок \`concurrent = Infinity\` даёт параллельные ветки, и порядок зависит от скорости ответов; нужен строгий порядок — \`expand(fn, 1)\`.
- **«\`expand\` всегда даёт BFS» — неверно.** С синхронным \`project\` обход идёт в глубину, с \`concurrent = 1\` — в ширину, с HTTP — как придут ответы.
- **Каждый шаг — новый сетевой запрос.** На больших коллекциях это лавина: ограничивайте число страниц и обеспечьте отмену (\`takeUntilDestroyed\`, \`switchMap\` сверху при смене фильтра).
- **Ошибка на любой странице убивает весь поток.** Уже загруженное в \`toArray\` пропадёт. Ставьте \`retry\` на отдельный запрос внутри \`project\` или \`catchError\`, который вернёт \`EMPTY\` и завершит обход тем, что успели загрузить.
- **\`toArray\` ждёт завершения.** Пользователь ничего не увидит, пока не придёт последняя страница; для прогрессивной отрисовки используйте \`scan\` вместо \`toArray\`.
- **\`expand\` против \`repeat\`.** \`repeat\` переподписывается на **тот же** источник после завершения, \`expand\` строит **новый** Observable из предыдущего результата — поэтому только он умеет передать курсор дальше.
- **Третий аргумент \`scheduler\` устарел.** В RxJS 7 он помечен как deprecated; вместо него ставят \`subscribeOn\` внутри \`project\`.

**Плюсы:** рекурсия с неизвестной глубиной одним оператором; отмена, лимиты и параллелизм из коробки; хорошо сочетается с \`concatMap\`, \`toArray\`, \`scan\`.
**Минусы:** легко получить бесконечную рекурсию или лавину запросов; порядок при ветвлении неочевиден; ошибка в любом шаге рушит весь обход; синхронная глубокая рекурсия переполняет стек.

## Как это спрашивают на собеседовании

**Главный вывод:** \`expand\` — это рекурсивный \`mergeMap\`: каждое значение уходит наружу и снова подаётся в \`project\`, пока тот не вернёт \`EMPTY\`. Классический кейс — cursor-пагинация \`expand(res => res.next ? getPage(res.next) : EMPTY)\` + \`concatMap(res => res.items)\` + \`toArray()\`.

Типичные формулировки: «Как загрузить все страницы, если ссылка на следующую приходит в ответе?», «Как рекурсивно обойти дерево в RxJS?», «Что делает \`expand\`?».

Что могут спросить следом:

- *Чем \`expand\` отличается от \`repeat\`?* — \`repeat\` переподписывается на тот же источник, \`expand\` строит новый поток из предыдущего результата.
- *Как ограничить число страниц?* — Условием с \`index\` внутри \`project\`; \`take(n)\` после \`expand\` тоже работает, но может успеть стартовать лишний запрос.
- *Гарантирован ли порядок?* — В линейной пагинации да, ветка одна; при ветвлении — только с \`concurrent = 1\`.
- *Почему пропала последняя страница?* — \`takeWhile\` без \`inclusive: true\` отрезает значение, на котором условие стало ложным.
- *Чем \`expand\` отличается от \`scan\` и \`reduce\`?* — Те управляются входным потоком, а \`expand\` сам генерирует следующие шаги из предыдущего результата.

### Ответ на 1 минуту

> \`expand\` — это рекурсивный \`mergeMap\`: результат проекции не просто уходит подписчику, а снова подаётся в ту же проекцию, и так по кругу, пока она не вернёт \`EMPTY\`. Наружу выходят все значения, включая исходное. Классический кейс — cursor-пагинация, где ссылка на следующую страницу приходит только вместе с текущей: \`expand(res => res.next ? getPage(res.next) : EMPTY)\`, затем \`concatMap\` разворачивает элементы и \`toArray\` собирает всё. В линейной пагинации ветка одна, поэтому порядок страниц сохраняется; при обходе дерева \`concurrent\` по умолчанию \`Infinity\`, и для строгого порядка я ставлю единицу. Главные риски — забыть условие выхода и устроить лавину запросов, поэтому я ограничиваю число страниц через \`index\` в проекции и привязываю подписку к \`takeUntilDestroyed\`. И помню, что \`takeWhile\` без \`inclusive\` отрежет последнюю страницу.`,
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
    category: 'rxjs',
    level: 'Hard',
    tags: ['groupby', 'partition', 'higher-order'],
    question: {
      ru: 'Как работают groupBy и partition? В чём опасность groupBy в долгоживущих потоках?',
      en: 'How do groupBy and partition work? What is the danger of groupBy in long-lived streams?'
    },
    answer: {
      ru: `## В чём суть

Оба оператора **разводят один поток по нескольким дорожкам**. \`partition\` делает ровно **две** дорожки по вопросу «да/нет». \`groupBy\` делает **сколько угодно** дорожек — по одной на каждый новый ключ, и на каждую можно повесить свою обработку. Опасность \`groupBy\` в том, что дорожки создаются автоматически, а закрываются только при завершении источника — на бесконечном потоке с растущим числом ключей это утечка памяти.

Аналогия: сортировка почты. \`partition\` — два лотка: «срочное» и «остальное». \`groupBy\` — стеллаж, где для **каждого нового адресата** заводится своя ячейка. Ячейки появляются сами, а убирать их за собой RxJS не будет: стеллаж растёт, пока почтовое отделение не закроется (источник не завершится). Если адресаты всё время новые (номера заказов, uuid), стеллаж растёт бесконечно.

**Какую проблему решает.** Часто нужно обрабатывать события **по отдельности для каждой сущности**: свой \`throttleTime\` на каждого пользователя, своя очередь сохранения на каждый документ, своя агрегация на каждый тикер биржи. Если повесить один оператор на весь поток, события разных сущностей начнут мешать друг другу: общий throttle «заглушит» соседей, общий \`switchMap\` отменит чужой запрос. \`groupBy\` даёт каждой сущности изолированный подпоток, а \`partition\` — простой и явный способ разделить поток на «успех/ошибку», «чётное/нечётное», «валидное/невалидное».

## Словарик терминов

- **Предикат (predicate)** — функция, которая отвечает «да» или «нет»: \`(x) => x % 2 === 0\`.
- **\`partition(source, predicate)\`** — функция создания: возвращает массив из двух потоков \`[прошедшие, не прошедшие]\`.
- **Кортеж (tuple)** — массив фиксированной длины с известным смыслом каждой позиции; его удобно деструктурировать: \`const [ok$, failed$] = ...\`.
- **\`groupBy(keyFn, options)\`** — оператор, который по ключу раскладывает значения в отдельные подпотоки-группы.
- **Ключ (key)** — то, по чему группируем: \`userId\`, тикер, id документа.
- **\`GroupedObservable\`** — поток одной группы; у него есть поле \`.key\`.
- **Higher-order Observable (поток потоков)** — поток, значения которого сами являются потоками; \`groupBy\` выдаёт именно такой.
- **\`Subject\`** — объект, который одновременно и Observable, и «пульт» с методом \`next\`; раздаёт значения всем текущим подписчикам и **не хранит** их для будущих.
- **\`ReplaySubject\`** — Subject, который запоминает значения и отдаёт их новым подписчикам.
- **\`duration\`** — опция \`groupBy\`: функция, которая получает группу и возвращает Observable; его первое значение закрывает группу.
- **\`connector\`** — опция \`groupBy\`: фабрика Subject-а для группы (по умолчанию обычный \`Subject\`).
- **\`mergeMap\`** — подписывается на каждый внутренний поток и сливает их результаты; после \`groupBy\` нужен почти всегда.
- **Холодный (cold) поток** — выполняет работу заново для каждого подписчика (например, HTTP-запрос из \`HttpClient\`).
- **\`share\`** — делает поток общим: одна подписка на источник на всех подписчиков.

## Как это работает под капотом

\`partition\` в RxJS 7 устроен буквально так:

\`\`\`ts
function partition(source, predicate) {
  return [
    source.pipe(filter(predicate)),
    source.pipe(filter((v, i) => !predicate(v, i))),
  ];
}
\`\`\`

А \`groupBy\` упрощённо выглядит так:

\`\`\`ts
function groupBy(keyFn, { duration, connector } = {}) {
  return (source) => new Observable((subscriber) => {
    const groups = new Map();                       // ключ → Subject группы
    source.subscribe({
      next: (value) => {
        const key = keyFn(value);
        let group = groups.get(key);
        if (!group) {
          group = connector ? connector() : new Subject();
          groups.set(key, group);
          const grouped$ = group.asObservable();    // упрощение: GroupedObservable
          grouped$.key = key;
          subscriber.next(grouped$);                // наружу уходит НОВЫЙ ПОТОК
          if (duration) {
            duration(grouped$).pipe(take(1)).subscribe(() => {
              group.complete();
              groups.delete(key);                   // группа закрыта и забыта
            });
          }
        }
        group.next(value);                          // значение — в свою группу
      },
      complete: () => {
        groups.forEach((g) => g.complete());        // группы живут до конца источника
        subscriber.complete();
      },
    });
  });
}
\`\`\`

Что происходит по шагам:

1. \`partition\` ничего не подписывает сам: он возвращает два потока, каждый из которых при подписке **отдельно** подписывается на источник и фильтрует его. Поэтому две подписки на ветки — это две подписки на источник.
2. \`groupBy\` на каждое значение считает ключ. Если ключ новый, создаётся \`Subject\` группы, и наружу **синхронно** уходит новый поток-группа с полем \`.key\`.
3. Сразу после этого значение кладётся в \`Subject\` своей группы. Поскольку \`mergeMap\` подписывается на группу синхронно, первое значение не теряется.
4. Если ключ уже есть, значение просто уходит в существующую группу; наружу ничего нового не выходит.
5. Группа хранится в \`Map\` до тех пор, пока не завершится источник или не сработает \`duration\`. Поэтому на бесконечном потоке с новыми ключами \`Map\` и \`Subject\`-ы только растут.
6. \`Subject\` группы **не буферизует** значения: если на группу в момент \`next\` никто не подписан, значение пропадает. Поэтому важно подписываться на группы сразу.

### Пример 1. \`partition\` — два лотка

\`\`\`ts
import { of, partition } from 'rxjs';

const [evens$, odds$] = partition(of(1, 2, 3, 4, 5, 6), (x) => x % 2 === 0);

evens$.subscribe((v) => console.log('even', v));
odds$.subscribe((v) => console.log('odd', v));
// even 2
// even 4
// even 6
// odd 1    ← вторая ветка заново подписалась на of(...) и прошла его целиком
// odd 3
// odd 5
\`\`\`

Обратите внимание на порядок: сначала все чётные, потом все нечётные. Это видимый признак того, что источник прошёл **дважды** — по разу на каждую ветку. В RxJS 7 \`partition\` — функция создания из \`'rxjs'\`; одноимённый оператор для \`pipe\` устарел и будет удалён в v8.

### Пример 2. Холодный источник и \`share\`

\`\`\`ts
import { defer, timer, from, mergeMap, partition, share } from 'rxjs';

const responses$ = defer(() => {
  console.log('HTTP GET /api/results');
  return timer(100).pipe(mergeMap(() => from([{ id: 1, ok: true }, { id: 2, ok: false }, { id: 3, ok: true }])));
});

const [ok$, failed$] = partition(responses$, (r) => r.ok);
ok$.subscribe((r) => console.log('ok', r.id));
failed$.subscribe((r) => console.log('failed', r.id));
// HTTP GET /api/results
// HTTP GET /api/results   ← два запроса вместо одного!
// ok 1
// ok 3
// failed 2

const [ok2$, failed2$] = partition(responses$.pipe(share()), (r) => r.ok);
// с share(): один HTTP GET, затем ok 1, failed 2, ok 3
\`\`\`

\`share\` создаёт одну общую подписку на источник, и обе ветки получают значения из неё. Важная тонкость: это работает, потому что источник **асинхронный** — обе ветки успевают подписаться до первого значения. С синхронным источником (\`of\`) первая ветка получит всё и завершит общий поток раньше, чем подпишется вторая, и \`share\` переподпишется на источник заново.

### Пример 3. \`groupBy\` — агрегация по ключу

\`\`\`ts
import { of, groupBy, mergeMap, reduce, map } from 'rxjs';

of(
  { user: 'ann', sum: 10 },
  { user: 'bob', sum: 5 },
  { user: 'ann', sum: 7 },
  { user: 'kim', sum: 1 },
  { user: 'bob', sum: 3 },
).pipe(
  groupBy((o) => o.user),
  mergeMap((group$) => group$.pipe(
    reduce((total, o) => total + o.sum, 0),
    map((total) => \`\${group$.key}: \${total}\`)
  ))
).subscribe(console.log);
// ann: 17
// bob: 8
// kim: 1
\`\`\`

Каждая группа — отдельный поток со своим \`reduce\`. Итоги выходят при завершении источника, потому что именно тогда завершаются группы. Этот пример безопасен: источник конечен, и все группы закроются.

### Пример 4. Свой throttle на каждого пользователя и \`duration\`

\`\`\`ts
import { Subject, groupBy, mergeMap, throttleTime, debounceTime, map, finalize } from 'rxjs';

const events$ = new Subject<{ user: string; action: string }>();

events$.pipe(
  groupBy((e) => e.user, {
    duration: (group$) => group$.pipe(debounceTime(300)), // закрыть после 300 мс тишины
  }),
  mergeMap((group$) => {
    console.log(\`группа \${group$.key} открыта\`);
    return group$.pipe(
      throttleTime(100),                                   // свой throttle у каждого
      map((e, i) => \`\${group$.key}: \${e.action} (#\${i + 1} в группе)\`),
      finalize(() => console.log(\`группа \${group$.key} закрыта\`))
    );
  })
).subscribe(console.log);

// события: 0 мс ann click1, 10 мс ann click2, 20 мс bob click1, 150 мс ann click3, 600 мс ann click4
// группа ann открыта
// ann: click1 (#1 в группе)
// группа bob открыта
// bob: click1 (#1 в группе)   ← ann-овский throttle не помешал bob
// ann: click3 (#2 в группе)   ← click2 съел throttle, click3 пришёл после окна
// группа bob закрыта          ← ~320 мс: 300 мс тишины
// группа ann закрыта          ← ~450 мс
// группа ann открыта          ← ~600 мс: новое событие пересоздало группу
// ann: click4 (#1 в группе)   ← счётчик начался заново: состояние группы сброшено
// группа ann закрыта
\`\`\`

Без \`groupBy\` \`throttleTime\` был бы **один на всех** и глушил бы события чужих пользователей. \`duration\` получает саму группу, поэтому \`debounceTime(300)\` на ней означает «закрыть после 300 мс без событий». Когда группа закрыта, новое событие с тем же ключом создаёт её заново — со свежим состоянием.

### Утечка на бесконечном потоке: цифры

\`\`\`ts
import { Subject, groupBy, mergeMap, finalize, timer, ignoreElements } from 'rxjs';

let open = 0;
const events$ = new Subject<{ orderId: string }>();
events$.pipe(
  groupBy((e) => e.orderId),          // для второго прогона: groupBy(..., { duration: () => timer(500) })
  mergeMap((group$) => { open++; return group$.pipe(ignoreElements(), finalize(() => open--)); })
).subscribe();

for (let i = 0; i < 10000; i++) events$.next({ orderId: \`order-\${i}\` });
// без duration:          сразу 10000 открытых групп, через 1 с — всё ещё 10000
// с duration timer(500): сразу 10000, через 1 с — 0
\`\`\`

Каждый уникальный id заказа — это запись в \`Map\`, \`Subject\` и вся внутренняя цепочка операторов (с их таймерами и буферами). Пока источник жив, ничего не освобождается. \`duration\` с фиксированным временем жизни или таймером неактивности возвращает память.

### Группа не буферизует значения

В старых статьях встречается утверждение, что \`GroupedObservable\` копит значения, пока на него не подписались. В RxJS 7 это не так: по умолчанию группа — обычный \`Subject\`, и значения без подписчика **теряются**.

\`\`\`ts
import { of, groupBy, concatMap, toArray, ReplaySubject } from 'rxjs';

of('a1', 'b1', 'a2', 'b2').pipe(
  groupBy((v) => v[0]),
  concatMap((g) => g.pipe(toArray()))   // concatMap подпишется на группу b только после a
).subscribe((v) => console.log(JSON.stringify(v)));
// ["a1","a2"]
// []              ← b1 и b2 ушли в группу, на которую ещё никто не подписан

of('a1', 'b1', 'a2', 'b2').pipe(
  groupBy((v) => v[0], { connector: () => new ReplaySubject() }),
  concatMap((g) => g.pipe(toArray()))
).subscribe((v) => console.log(JSON.stringify(v)));
// ["a1","a2"]
// ["b1","b2"]     ← ReplaySubject запомнил значения до подписки
\`\`\`

Отсюда правило: после \`groupBy\` используйте \`mergeMap\`, который подписывается на каждую группу сразу. Если подписка откладывается (\`concatMap\`, \`delay\`), задайте \`connector: () => new ReplaySubject()\` — но помните, что тогда буфер растёт.

### \`switchMap\` после \`groupBy\` — тихая потеря событий

\`\`\`ts
import { Subject, groupBy, switchMap, map } from 'rxjs';

const events$ = new Subject<{ user: string; text: string }>();
events$.pipe(
  groupBy((e) => e.user),
  switchMap((g) => g.pipe(map((e) => \`\${g.key}:\${e.text}\`)))
).subscribe(console.log);

events$.next({ user: 'ann', text: 'a' });
events$.next({ user: 'bob', text: 'b' });
events$.next({ user: 'ann', text: 'c' });
events$.next({ user: 'bob', text: 'd' });
// ann:a
// bob:b
// bob:d      ← ann:c пропал навсегда
\`\`\`

Появление группы \`bob\` заставило \`switchMap\` отписаться от группы \`ann\`. Но сама группа \`ann\` осталась в \`Map\`, поэтому новое событие \`ann\` не создаёт новую группу и уходит в \`Subject\` без подписчиков. Почти всегда это баг.

### Где это применяется на практике

- **Rate limiting по пользователю или сущности**: свой \`throttleTime\` на каждого автора в чате, на каждую строку таблицы при быстрых правках.
- **Последовательное сохранение по документу**: \`groupBy(docId)\` + внутри \`concatMap(save)\` — правки одного документа идут строго по очереди, а разные документы сохраняются параллельно.
- **Биржевые и IoT-потоки**: группировка тиков по тикеру или датчику, своя агрегация и свой \`auditTime\` для каждого.
- **WebSocket-мультиплексирование**: одно соединение, сообщения раскладываются по каналу или комнате.
- **\`partition\` для HTTP-результатов пакетных операций**: успешные строки — в таблицу, ошибочные — в панель ошибок; события формы — валидные на сервер, невалидные — в подсказки.

## Важные нюансы и подводные камни

- **Утечка на бесконечном потоке.** Растущее множество ключей (uuid, id заказов, id сессий) — это растущее число \`Subject\`-ов и внутренних цепочек. Всегда думайте про \`duration\`.
- **Группа не буферизует.** Значения, пришедшие в группу до подписки, теряются (по умолчанию группа — \`Subject\`). Подписывайтесь сразу через \`mergeMap\` или задайте \`connector: () => new ReplaySubject()\`.
- **\`switchMap\` вместо \`mergeMap\` после \`groupBy\`** отписывается от всех предыдущих групп; их последующие события молча теряются, потому что группа с этим ключом всё ещё существует и не создаётся заново.
- **Группа после закрытия по \`duration\` пересоздаётся с нуля.** Состояние внутри неё (\`scan\`, \`distinctUntilChanged\`, индекс в \`map\`) сбрасывается, а подписчик получает **новый** \`GroupedObservable\` с тем же ключом.
- **\`partition\` — это две подписки на источник.** Если он холодный, работа выполнится дважды; ставьте \`share()\` перед \`partition\`. С синхронным источником \`share\` не поможет — первая ветка вычерпает его до подписки второй.
- **Ошибка роняет все группы сразу.** Ошибка источника или исключение в \`keyFn\` уходит во все группы и наружу, а ошибка в цепочке одной группы внутри \`mergeMap\` обрывает весь результат. Ключ вычисляйте безопасно, а ошибки ловите \`catchError\` внутри группы.
- **Опции вместо позиционных аргументов.** Старая форма \`groupBy(key, element, duration)\` устарела; в RxJS 7 используйте \`groupBy(key, { element, duration, connector })\`.
- **Зачем \`partition\`, если есть \`filter\`.** Читаемость и невозможность «потерять» вторую ветку — она возвращается явно. С предикатом-type guard (\`(x): x is A => ...\`) TypeScript ещё и сузит типы обеих веток.

**Плюсы:** \`groupBy\` даёт изоляцию по сущности (свои таймеры, очереди и состояние) без ручных словарей подписок; \`partition\` делает разделение на две ветки явным и типобезопасным.
**Минусы:** \`groupBy\` на бесконечном потоке без \`duration\` — утечка; поток потоков сложнее читать и отлаживать; значения в неподписанной группе теряются; \`partition\` удваивает подписки на источник.

## Как это спрашивают на собеседовании

**Главный вывод:** \`partition\` — сахар над двумя \`filter\`, две подписки на источник; \`groupBy\` создаёт по подпотоку на каждый ключ, и эти группы живут до завершения источника. На бесконечном потоке с растущим числом ключей нужен \`duration\`, иначе группы копятся, а после \`groupBy\` нужен \`mergeMap\`, не \`switchMap\`.

Типичные формулировки: «Как сделать throttle отдельно для каждого пользователя?», «Где в \`groupBy\` может быть утечка памяти?», «Чем \`partition\` отличается от двух \`filter\`?».

Что могут спросить следом:

- *Что будет, если не подписаться на группу?* — В RxJS 7 значения пропадут: группа — обычный \`Subject\`, буфера нет (если не задать \`connector\` с \`ReplaySubject\`).
- *Почему \`switchMap\` после \`groupBy\` — баг?* — Он отписывается от старых групп, а их новые события уходят в группу без подписчиков.
- *Как закрыть группу по неактивности?* — \`duration: (g) => g.pipe(debounceTime(30000))\`.
- *Почему \`partition\` делает два запроса?* — Каждая ветка отдельно подписывается на холодный источник; нужен \`share()\`.

### Ответ на 1 минуту

> \`partition\` разбивает поток на две ветки по предикату и возвращает их кортежем — по сути это два \`filter\`, поэтому каждая ветка отдельно подписывается на источник, и для холодного HTTP-потока нужен \`share\`. \`groupBy\` создаёт динамическое число подпотоков, по одному на ключ, и выдаёт \`GroupedObservable\` с полем \`key\`; дальше обычно \`mergeMap\`, который подписывается на каждую группу и применяет к ней свои операторы — например, отдельный \`throttleTime\` на каждого пользователя. Главная опасность: группа — это \`Subject\` в словаре, и живёт она до завершения источника. На бесконечном потоке с растущими ключами, вроде id заказов, группы копятся — это утечка. Лечу опцией \`duration\`, которая закрывает группу по таймеру неактивности. Ещё два нюанса: группа не буферизует значения, так что подписываться нужно сразу, а \`switchMap\` вместо \`mergeMap\` молча теряет события старых групп.`,
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
    category: 'rxjs',
    level: 'Hard',
    tags: ['buffer', 'window', 'bufferpattern'],
    question: {
      ru: 'Объясните семейство buffer и window (bufferCount, bufferTime, windowToggle). В чём разница buffer vs window?',
      en: 'Explain the buffer and window families (bufferCount, bufferTime, windowToggle). What is the difference between buffer and window?'
    },
    answer: {
      ru: `## В чём суть

Всё семейство делает одно: **копит значения порциями** и отдаёт порцию, когда «окно» закрылось. Различаются операторы двумя вещами: **чем закрывается окно** (счётчиком, таймером, внешним сигналом) и **в каком виде отдаётся порция**. \`buffer*\` отдаёт готовый массив (\`Observable<T[]>\`), а \`window*\` — вложенный поток (\`Observable<Observable<T>>\`), в который значения падают по одному прямо сейчас.

Аналогия: конвейер и коробки. \`buffer\` — коробку заклеили и отдали целиком: содержимое видно, только когда её откроешь. \`window\` — коробка открытая, вещи падают в неё **по одной в реальном времени**, и над ней можно поставить свой мини-конвейер (\`count()\`, \`reduce()\`, \`debounceTime\`). Window мощнее, но на каждую коробку нужно **подписаться**, иначе вещи упадут мимо.

**Какую проблему решает.** Много задач в UI — это «обработать пачкой»: отправлять аналитику не по одному событию, а раз в 5 секунд; сохранять правки в таблице пакетом; распознать двойной клик как «два клика подряд»; посчитать события в секунду для графика; записать траекторию мыши между нажатием и отпусканием. Без этих операторов приходится вручную держать массив, таймер и флаги, следить за очисткой и не забыть «хвост» при завершении. Семейство \`buffer\`/\`window\` упаковывает это в один оператор с понятной стратегией закрытия.

## Словарик терминов

- **Буфер (buffer)** — массив, в который копятся значения до закрытия окна; наружу уходит целиком.
- **Окно (window)** — отрезок потока между открытием и закрытием; в \`window*\` это отдельный Observable.
- **Higher-order Observable (поток потоков)** — поток, значения которого сами являются потоками; так работают все \`window*\`.
- **Сигнал закрытия (closing notifier)** — Observable, эмиссия которого закрывает текущий буфер или окно.
- **\`bufferCount(n, every)\` / \`windowCount(n, every)\`** — окно по количеству значений; \`every\` — как часто открывать новое окно.
- **Скользящее окно (sliding window)** — окна перекрываются: при \`every < n\` одно значение попадает в несколько окон.
- **\`bufferTime(ms)\` / \`windowTime(ms)\`** — окно по таймеру.
- **\`buffer(closing$)\` / \`window(closing$)\`** — окно закрывается на каждую эмиссию внешнего потока.
- **\`bufferWhen(fn)\` / \`windowWhen(fn)\`** — после каждого окна вызывается \`fn\`, которая создаёт **новый** сигнал закрытия; длина окна может меняться.
- **\`bufferToggle(open$, closeFn)\` / \`windowToggle(open$, closeFn)\`** — окна открываются по одному сигналу и закрываются по другому; могут перекрываться.
- **\`count()\`** — ждёт завершения потока и выдаёт число его значений.
- **\`toArray()\`** — ждёт завершения потока и выдаёт все значения одним массивом.
- **\`mergeMap\`** — подписывается на каждый внутренний поток и сливает результаты; нужен после \`window*\`.
- **\`debounceTime(ms)\`** — выдаёт значение после паузы \`ms\` без новых значений.

## Как это работает под капотом

Упрощённая реализация двух «близнецов» показывает разницу лучше любой схемы:

\`\`\`ts
// bufferCount: копим в массив, отдаём массив
function bufferCount(size) {
  return (source) => new Observable((subscriber) => {
    let buf = [];
    source.subscribe({
      next: (v) => {
        buf.push(v);
        if (buf.length === size) { subscriber.next(buf); buf = []; }
      },
      complete: () => {
        if (buf.length) subscriber.next(buf);   // недозаполненный хвост
        subscriber.complete();
      },
    });
  });
}

// windowCount: каждое окно — Subject, значения пролетают сквозь него
function windowCount(size) {
  return (source) => new Observable((subscriber) => {
    let win = new Subject();
    let n = 0;
    subscriber.next(win.asObservable());        // окно отдаётся СРАЗУ, ещё пустым
    source.subscribe({
      next: (v) => {
        win.next(v);                            // значение не хранится — передаётся подписчикам окна
        if (++n === size) {
          win.complete();
          win = new Subject(); n = 0;
          subscriber.next(win.asObservable());
        }
      },
      complete: () => { win.complete(); subscriber.complete(); },
    });
  });
}
\`\`\`

Что происходит по шагам:

1. \`buffer*\` при подписке заводит пустой массив и складывает в него каждое значение источника.
2. Когда срабатывает правило закрытия (набралось \`n\`, тикнул таймер, пришёл сигнал), массив уходит наружу, а вместо него заводится новый.
3. \`window*\` вместо массива заводит \`Subject\` и отдаёт его наружу **сразу при открытии** окна, ещё пустым. Значения передаются подписчикам окна в момент прихода и нигде не хранятся.
4. При закрытии окна его \`Subject\` получает \`complete\`, поэтому операторы «на завершение» внутри окна (\`count\`, \`toArray\`, \`reduce\`) выдают результат именно в этот момент.
5. Когда завершается источник, \`buffer*\` отдаёт недозаполненный хвост, а \`window*\` завершает текущее окно. У \`bufferTime\`, \`bufferWhen\` и \`buffer\` этот хвост может быть **пустым массивом**.
6. Отсюда главное различие: \`buffer\` держит значения в памяти до закрытия окна, \`window\` — нет, но требует подписки на каждое окно.

У \`window*\` ровно те же пять стратегий закрытия, что у \`buffer*\`: \`windowCount\`, \`windowTime\`, \`window\`, \`windowWhen\`, \`windowToggle\`.

\`\`\`text
source:          a-b-c-d-e|
bufferCount(2):  ---[a,b]---[c,d]--([e]|)
\`\`\`

### Пример 1. \`bufferCount\`: обычные, скользящие и с пропусками

\`\`\`ts
import { of, bufferCount } from 'rxjs';

of('a', 'b', 'c', 'd', 'e').pipe(bufferCount(2)).subscribe((b) => console.log(JSON.stringify(b)));
// ["a","b"]
// ["c","d"]
// ["e"]        ← хвост при завершении

of(1, 2, 3, 4, 5).pipe(bufferCount(3, 1)).subscribe((b) => console.log(JSON.stringify(b)));
// [1,2,3]      ← новое окно открывается на каждом значении
// [2,3,4]
// [3,4,5]
// [4,5]        ← недозаполненные окна тоже выходят при завершении
// [5]

of(1, 2, 3, 4, 5, 6, 7).pipe(bufferCount(2, 3)).subscribe((b) => console.log(JSON.stringify(b)));
// [1,2]        ← every > size: каждое третье значение не попадает никуда
// [4,5]
// [7]
\`\`\`

Скользящее окно \`bufferCount(3, 1)\` — простой способ получить «последние три значения» для скользящего среднего. Но значения дублируются: каждое попадает в три окна, нагрузка на дальнейшую обработку растёт втрое.

### Пример 2. \`bufferTime\` тикает и без данных

\`\`\`ts
import { Subject, bufferTime } from 'rxjs';

const clicks$ = new Subject<string>();
clicks$.pipe(bufferTime(1000)).subscribe((b) => console.log(JSON.stringify(b)));

// клики на 100, 200, 300 мс и на 2300, 2400 мс, завершение на 3500 мс
// ["click","click","click"]   ← ~1000 мс
// []                          ← ~2000 мс: кликов не было, а таймер тикнул
// ["click","click"]           ← ~3000 мс
// []                          ← ~3500 мс: хвост при завершении
\`\`\`

\`bufferTime\` работает по собственному таймеру и не смотрит, были ли данные. Поэтому почти всегда за ним стоит \`filter((b) => b.length > 0)\`, иначе вы отправите на сервер пустые пачки.

### \`bufferTime(ms, null, maxSize)\` — время ИЛИ размер

\`\`\`ts
// батчим аналитику: раз в 5 секунд ИЛИ по 20 событий — что наступит раньше
const batch$ = events$.pipe(
  bufferTime(5000, null, 20),
  filter((batch) => batch.length > 0),
  concatMap((batch) => api.send(batch))  // пачки уходят строго по очереди
);
\`\`\`

Второй аргумент — интервал создания новых буферов (\`null\` означает «новый буфер сразу после закрытия предыдущего»), третий — максимальный размер. Когда буфер закрылся по размеру, таймер для следующего начинается заново с этого момента. Без \`maxSize\` при всплеске событий в одну пачку попадёт всё подряд.

### Пример 3. \`buffer(closing$)\`: детект двойного клика

\`\`\`ts
import { Subject, buffer, debounceTime, filter } from 'rxjs';

const clicks$ = new Subject<string>();
const doubleClick$ = clicks$.pipe(
  buffer(clicks$.pipe(debounceTime(250))),   // закрыть пачку после 250 мс тишины
  filter((group) => group.length === 2)
);
doubleClick$.subscribe(() => console.log('DOUBLE CLICK'));

// одиночный клик на 0 мс, двойной на 1000 и 1100 мс, тройной на 2000, 2100, 2200 мс
// DOUBLE CLICK   ← ~1350 мс, только для пары; одиночный и тройной отфильтрованы
\`\`\`

Сам поток кликов, пропущенный через \`debounceTime(250)\`, служит сигналом закрытия: он эмитит, когда серия кликов закончилась. \`buffer\` в этот момент отдаёт всё, что накопилось, — группу кликов серии. Цена — решение принимается с задержкой 250 мс после последнего клика. В RxJS 7 \`buffer\` при завершении источника отдаёт и последний накопленный массив, даже пустой.

### \`bufferWhen\` — окно, длина которого меняется

\`\`\`ts
import { Subject, bufferWhen, timer } from 'rxjs';

let n = 0;
const src$ = new Subject<number>();
src$.pipe(
  bufferWhen(() => timer(++n * 100))   // каждое следующее окно на 100 мс длиннее
).subscribe((b) => console.log(JSON.stringify(b)));

// значения 0..5 на 50, 150, 250, 350, 450, 550 мс, завершение на 620 мс
// [0]        ← окно 100 мс
// [1,2]      ← окно 200 мс (до 300 мс)
// [3,4,5]    ← окно 300 мс (до 600 мс)
// []         ← четвёртое окно прервано завершением
\`\`\`

В отличие от \`buffer(closing$)\`, где сигнал один на всё время, \`bufferWhen\` после каждого окна вызывает фабрику и получает **новый** сигнал. Так делают адаптивные пачки: при высокой нагрузке окно короче, при низкой — длиннее.

### \`bufferToggle\` — окна по двум сигналам

\`\`\`ts
import { Subject, bufferToggle } from 'rxjs';

const src$ = new Subject<string>();
const open$ = new Subject<string>();
const close$ = new Subject<void>();

src$.pipe(bufferToggle(open$, () => close$)).subscribe((b) => console.log(JSON.stringify(b)));

src$.next('x0');      // окно ещё не открыто — значение никуда не попадает
open$.next('A'); src$.next('x1');
open$.next('B'); src$.next('x2');   // открыты два окна: x2 попадает в оба
close$.next();        // каждое окно ждёт свой close$, здесь он общий — закрываются оба
// ["x1","x2"]
// ["x2"]
\`\`\`

Каждая эмиссия \`open$\` открывает **отдельный** буфер со своим сигналом закрытия (его возвращает функция, которая получает значение открытия). Окна могут перекрываться, а значения вне окон теряются. Классика — «записать всё между \`mousedown\` и \`mouseup\`».

### \`windowTime\` + \`count\` — события в секунду

\`\`\`ts
import { windowTime, mergeMap, count } from 'rxjs';

clicks$.pipe(
  windowTime(1000),
  mergeMap((win$) => win$.pipe(count()))
).subscribe((n) => console.log('кликов за секунду:', n));

// те же клики: 100, 200, 300 мс и 2300, 2400 мс, завершение на 3500 мс
// кликов за секунду: 3
// кликов за секунду: 0   ← пустое окно даёт честный ноль
// кликов за секунду: 2
// кликов за секунду: 0
\`\`\`

Здесь нам не нужны сами клики — только их число. \`window\` пропускает значения сквозь окно, \`count()\` считает их на лету, и в памяти ничего не копится. С \`bufferTime\` пришлось бы держать массив кликов только ради \`.length\`. Для графиков нагрузки ноль за пустую секунду — это как раз то, что нужно.

### \`windowToggle\` — запись перетаскивания

\`\`\`ts
import { Subject, windowToggle, mergeMap, toArray } from 'rxjs';

const down$ = new Subject<void>();
const up$ = new Subject<void>();
const move$ = new Subject<{ x: number }>();

move$.pipe(
  windowToggle(down$, () => up$),
  mergeMap((drag$) => drag$.pipe(toArray()))
).subscribe((path) => console.log('drag path', JSON.stringify(path)));

move$.next({ x: 0 });                    // до mousedown — не попадает
down$.next();
move$.next({ x: 1 }); move$.next({ x: 2 });
up$.next();
move$.next({ x: 3 });                    // после mouseup — не попадает
down$.next(); move$.next({ x: 10 }); up$.next();
// drag path [{"x":1},{"x":2}]
// drag path [{"x":10}]
\`\`\`

С \`toArray\` результат такой же, как у \`bufferToggle\`. Но вместо \`toArray\` внутрь окна можно поставить \`map\` и рисовать линию **во время** перетаскивания, а не после — это и есть преимущество \`window\`.

### Окно нужно подписать сразу

Окно — это \`Subject\`: значения, пришедшие до подписки, теряются. Особенно легко на это наступить со скользящими окнами и \`concatMap\`:

\`\`\`ts
import { of, windowCount, concatMap, mergeMap, toArray } from 'rxjs';

of(1, 2, 3).pipe(windowCount(2, 1), concatMap((w) => w.pipe(toArray())))
  .subscribe((b) => console.log(JSON.stringify(b)));
// [1,2]
// [3]     ← второе окно ждало в очереди concatMap и пропустило 2
// []
// []

of(1, 2, 3).pipe(windowCount(2, 1), mergeMap((w) => w.pipe(toArray())))
  .subscribe((b) => console.log(JSON.stringify(b)));
// [1,2]
// [2,3]   ← mergeMap подписался на окно сразу
// [3]
// []
\`\`\`

Заодно видно ещё одно отличие: \`windowCount\` при завершении отдаёт пустое последнее окно (оно открывается сразу после закрытия предыдущего), а \`bufferCount\` пустых массивов не выдаёт.

### Как выбрать

- Нужен **весь набор значений разом** (отправить одним запросом, сохранить пачкой) → \`buffer*\`.
- Нужна **агрегация на лету** (сумма, количество, максимум) или обработка значений окна по мере прихода → \`window*\` + \`mergeMap\`.
- Окно по числу значений, скользящие окна → \`bufferCount\` / \`windowCount\`.
- Окно по времени, «раз в N секунд» → \`bufferTime\` / \`windowTime\`, с \`maxSize\` и фильтром пустых.
- Окно закрывается внешним событием (серия кликов кончилась, нажата кнопка «Отправить») → \`buffer\` / \`window\`.
- Длина окна меняется от раза к разу → \`bufferWhen\` / \`windowWhen\`.
- Окно ограничено парой событий «начало — конец» (drag, запись) → \`bufferToggle\` / \`windowToggle\`.

### Где это применяется на практике

- **Аналитика и логирование**: \`bufferTime(5000, null, 20)\` + \`filter\` + \`concatMap(send)\` — меньше HTTP-запросов, ничего не теряется.
- **Пакетное сохранение в data grid**: правки ячеек копятся и уходят одним PATCH по кнопке «Сохранить» (\`buffer(saveClick$)\`) или раз в несколько секунд.
- **Двойной клик и жесты**: \`buffer(clicks$.pipe(debounceTime(250)))\` для двойного и тройного клика, \`bufferToggle\`/\`windowToggle\` для перетаскивания и рисования.
- **Дашборды нагрузки**: \`windowTime(1000)\` + \`count()\` — запросы, ошибки или сообщения WebSocket в секунду.
- **Скользящие метрики**: \`bufferCount(5, 1)\` для скользящего среднего задержки или курса.
- **Вставка в DOM пачками**: тысячи строк из WebSocket собираются в пачки и рендерятся раз в кадр или раз в 100 мс, а не по одной.

## Важные нюансы и подводные камни

- **Пустые массивы.** \`bufferTime\` тикает по таймеру независимо от данных, а \`buffer\`, \`bufferWhen\` и \`bufferTime\` при завершении могут отдать пустой хвост — почти всегда нужен \`filter((b) => b.length > 0)\`.
- **Частичный буфер на complete.** Когда источник завершается, недозаполненное окно всё равно выходит: \`[e]\` у \`bufferCount(2)\`, хвосты \`[4,5]\`, \`[5]\` у скользящих окон. Учитывайте это в тестах и в логике «ровно N».
- **Забыли подписаться на окно.** У \`window*\` окно — это \`Subject\`, и значения без подписчика просто теряются; без \`mergeMap\` (или с запоздалой подпиской через \`concatMap\`) оператор бесполезен.
- **Буфер растёт бесконечно**, если закрывающий сигнал не приходит (\`buffer(NEVER)\` или пользователь так и не нажал «Сохранить») — на быстром источнике это утечка памяти. Страхуйтесь лимитом размера или таймером.
- **Скользящие окна дублируют значения.** \`bufferCount(3, 1)\` кладёт каждое значение в три окна — нагрузка на дальнейшую обработку растёт втрое.
- **\`bufferCount(n, every)\` с \`every > n\` теряет значения.** Это осознанное прореживание, а не группировка.
- **Двойной клик через \`debounceTime\` реагирует с задержкой.** Решение «двойной или нет» принимается только после паузы; для мгновенного отклика на первый клик нужна другая логика.
- **\`bufferTime\` после закрытия по размеру перезапускает таймер.** Пачки по времени перестают идти по ровной сетке «каждые 5 секунд».
- **Чем \`bufferTime\` отличается от \`throttleTime\`/\`debounceTime\`.** Те **выбрасывают** лишние значения, а buffer/window **сохраняют все** и лишь меняют упаковку.

**Плюсы:** одна понятная стратегия закрытия вместо ручных массивов, таймеров и флагов; хвост при завершении не теряется; \`window*\` позволяет агрегировать на лету без хранения значений.
**Минусы:** легко отправить пустые пачки или забыть про частичный хвост; \`buffer*\` держит значения в памяти и может расти без предела; \`window*\` — поток потоков, его сложнее читать, и окна нужно подписывать сразу.

## Как это спрашивают на собеседовании

**Главный вывод:** \`buffer*\` и \`window*\` — одно семейство с одинаковыми стратегиями закрытия (Count, Time, сигнал, When, Toggle); \`buffer*\` отдаёт массив \`Observable<T[]>\`, а \`window*\` — вложенный поток \`Observable<Observable<T>>\`, на который нужно подписаться через \`mergeMap\`. Батчинг — \`buffer\`, «событий в секунду» — \`window\` + \`count\`.

Типичные формулировки: «Как отправлять аналитику пачками?», «Как распознать двойной клик на RxJS?», «В чём разница между \`bufferTime\` и \`windowTime\`?».

Что могут спросить следом:

- *Почему \`bufferTime\` присылает пустые массивы?* — Он тикает по таймеру независимо от данных; фильтруйте \`b.length > 0\`.
- *Чем \`bufferToggle\` отличается от \`bufferWhen\`?* — \`bufferToggle\` открывает окна по внешнему сигналу и они могут перекрываться; \`bufferWhen\` открывает следующее окно сразу после закрытия предыдущего.
- *Что будет, если не подписаться на окно?* — Значения окна потеряются: это \`Subject\` без буфера.
- *Чем buffer отличается от throttle/debounce?* — Те выбрасывают значения, buffer/window сохраняют все.

### Ответ на 1 минуту

> Это одно семейство: группировка значений по количеству, по времени или по внешнему сигналу. Разница принципиальная: \`buffer*\` копит значения в массив и отдаёт его при закрытии окна, это \`Observable<T[]>\`, а \`window*\` отдаёт вложенный Observable, то есть higher-order оператор, на окна которого я подписываюсь через \`mergeMap\`. Window мощнее: внутри окна можно поставить свой конвейер и агрегировать на лету, не держа значения в памяти. Стратегии закрытия одинаковые: \`Count\` — по числу, \`Time\` — по таймеру, \`buffer\` и \`window\` — по внешнему сигналу, \`When\` — по сигналу, который создаётся заново, \`Toggle\` — по паре «открыть — закрыть», например между \`mousedown\` и \`mouseup\`. На практике батчинг аналитики и двойной клик — это \`buffer\`, события в секунду — \`window\` плюс \`count\`. Нюансы: \`bufferTime\` отдаёт пустые массивы, хвост выходит при завершении, а окна нужно подписывать сразу.`,
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
    category: 'rxjs',
    level: 'Medium',
    tags: ['pairwise', 'startwith', 'state'],
    question: {
      ru: 'Зачем нужны pairwise и startWith? Покажите типичные сценарии (дельта, начальное значение).',
      en: 'What are pairwise and startWith for? Show typical scenarios (delta, initial value).'
    },
    answer: {
      ru: `## В чём суть

\`pairwise()\` позволяет **сравнить новое со старым**: вместо одного значения он отдаёт пару \`[предыдущее, текущее]\`. \`startWith(v)\` **подкладывает значение в начало** потока: подписчик получает его сразу, ещё до того, как источник что-то выдаст. Вместе они дают классический приём: стартовое значение становится «предыдущим» для первого настоящего, и дельта считается с самого начала.

Аналогия: \`pairwise\` — зеркало заднего вида: вы видите не только где вы сейчас, но и где были секунду назад. \`startWith\` — «нулевой километр» на дороге: пока машина не поехала, счётчик уже показывает старт, а не пустоту.

**Какую проблему решает.** Поток по своей природе «без памяти»: каждое значение приходит само по себе, и чтобы узнать, **как** оно изменилось, нужно помнить прошлое. Без \`pairwise\` это делают внешней переменной \`let prev\` в \`subscribe\` — некрасиво, нереактивно и легко сломать. Вторая беда — «пустота в начале»: шаблон показывает пустое место, пока не пришёл ответ сервера; \`combineLatest\` молчит, пока каждый вход не выдаст хоть что-то; \`valueChanges\` формы не отдаёт текущее значение. \`startWith\` даёт потоку осмысленное начальное состояние.

## Словарик терминов

- **Observable (поток)** — объект, который со временем выдаёт значения; ничего не делает до подписки.
- **\`pairwise()\`** — оператор, который запоминает последнее значение и на каждое новое выдаёт пару \`[prev, curr]\`.
- **Кортеж (tuple)** — массив фиксированной длины с известным смыслом позиций: \`[prev, curr]\`. Удобно деструктурировать: \`([prev, curr]) => ...\`.
- **Дельта** — разница между текущим и предыдущим значением: \`curr - prev\`.
- **\`startWith(...values)\`** — оператор, который при подписке синхронно выдаёт заданные значения, а затем значения источника.
- **Синхронно** — сразу, в том же вызове \`subscribe\`, без ожидания таймеров и ответов.
- **Объединение типов (union type)** — тип «одно из»: \`number | null\`. \`startWith\` расширяет тип потока до такого объединения.
- **\`combineLatest\`** — объединяет последние значения нескольких потоков, но молчит, пока **каждый** вход не выдаст хотя бы одно значение.
- **\`BehaviorSubject\`** — Subject, который хранит **последнее** значение и сразу отдаёт его новому подписчику.
- **Холодный и горячий поток (cold / hot)** — холодный начинает работу заново для каждого подписчика, горячий выдаёт значения независимо от подписчиков.
- **\`distinctUntilChanged\`** — пропускает значение, только если оно отличается от предыдущего.

## Как это работает под капотом

Оба оператора очень маленькие. Упрощённо:

\`\`\`ts
function pairwise() {
  return (source) => new Observable((subscriber) => {
    let prev;
    let hasPrev = false;
    source.subscribe((value) => {
      if (hasPrev) subscriber.next([prev, value]); // пара появляется только со второго значения
      prev = value;
      hasPrev = true;
    });
  });
}

function startWith(...values) {
  // по сути: сначала значения, потом источник
  return (source) => concat(of(...values), source);
}
\`\`\`

Что происходит по шагам:

1. \`pairwise\` получает первое значение, запоминает его и **ничего не выдаёт** — паре пока не с чем сравниваться.
2. Приходит второе значение, и наружу уходит \`[первое, второе]\`. Третье даёт \`[второе, третье]\`, и так далее: каждое значение побывает и «текущим», и «предыдущим».
3. \`startWith(v)\` при подписке **синхронно** выдаёт \`v\`, и только потом подписывается на источник. Поэтому стартовое значение приходит раньше всего остального, даже если источник синхронный.
4. Тип результата расширяется до объединения: \`of(1, 2).pipe(startWith(null))\` имеет тип \`Observable<number | null>\`.
5. Отсюда дуэт: \`startWith\` поставляет \`pairwise\` недостающее «предыдущее», поэтому пара появляется **уже на первом** настоящем значении.
6. Оба оператора хранят состояние **в подписке**: у каждого подписчика свой \`prev\` и своё стартовое значение.

\`\`\`text
source:            ---a---b---c---d|
pairwise:          -------[a,b]-[b,c]-[c,d]|
startWith(0):      0--a---b---c---d|
+ pairwise:        ---[0,a]-[a,b]-[b,c]-[c,d]|
\`\`\`

### Пример 1. \`pairwise\` и потерянное первое значение

\`\`\`ts
import { of, pairwise } from 'rxjs';

of(1, 2, 3, 4).pipe(pairwise()).subscribe((p) => console.log(JSON.stringify(p)));
// [1,2]
// [2,3]
// [3,4]

of(42).pipe(pairwise()).subscribe({
  next: (p) => console.log(p),
  complete: () => console.log('complete'),
});
// complete      ← из одного значения пару не составить: не выдано ничего
\`\`\`

Четыре значения дали три пары — первое значение само по себе наружу не выходит. На потоке из одного значения (например, HTTP-ответ) \`pairwise\` не выдаст **ничего**.

### Пример 2. Дельта с самого первого значения

\`\`\`ts
import { of, startWith, pairwise, map } from 'rxjs';

of(5, 8, 6).pipe(
  startWith(0),
  pairwise(),
  map(([prev, curr]) => curr - prev)
).subscribe(console.log);
// 5    ← 5 - 0: стартовое значение сыграло роль «предыдущего»
// 3    ← 8 - 5
// -2   ← 6 - 8
\`\`\`

Без \`startWith(0)\` первая дельта потерялась бы: пары начались бы только с \`[5, 8]\`. Стартовое значение должно иметь смысл для задачи: для счётчика — 0, для «выбранного элемента» — \`null\`.

### Пример 3. Направление скролла

\`\`\`ts
import { fromEvent, map, pairwise, distinctUntilChanged } from 'rxjs';

const scrollY$ = fromEvent(window, 'scroll').pipe(map(() => window.scrollY));

scrollY$.pipe(
  pairwise(),
  map(([prev, curr]) => (curr > prev ? 'down' : 'up')),
  distinctUntilChanged()
).subscribe((dir) => console.log(dir));

// позиции: 0, 100, 250, 200, 150, 300
// down
// up      ← 250 → 200; следующее 200 → 150 тоже up, но distinctUntilChanged его убрал
// down
\`\`\`

Классика «спрятать шапку при скролле вниз, показать при скролле вверх». \`distinctUntilChanged\` нужен, чтобы не дёргать UI на каждом пикселе — только при смене направления.

### Пример 4. \`startWith\` синхронен

\`\`\`ts
import { defer, timer, map, startWith } from 'rxjs';

const data$ = defer(() => {
  console.log('подписка на источник');
  return timer(10).pipe(map(() => 'data'));
});

data$.pipe(startWith('loading...')).subscribe((v) => console.log(v));
console.log('после subscribe');
// loading...           ← пришло ещё внутри subscribe
// подписка на источник ← только потом startWith подписался на источник
// после subscribe
// data
\`\`\`

Это удобно для состояния загрузки: шаблон с \`async\` pipe сразу получает «загрузка…», а не пустоту. Типичная форма: \`http.get(...).pipe(map((data) => ({ loading: false, data })), startWith({ loading: true, data: [] }))\`.

### Пример 5. Снять блокировку \`combineLatest\`

\`\`\`ts
import { Subject, combineLatest, startWith } from 'rxjs';

const filter$ = new Subject<string>();
const page$ = new Subject<number>();

combineLatest([filter$, page$]).subscribe((v) => console.log('без startWith', v));
combineLatest([filter$.pipe(startWith('all')), page$.pipe(startWith(1))])
  .subscribe((v) => console.log('со startWith', JSON.stringify(v)));

filter$.next('active');
// со startWith ["all",1]       ← сразу при подписке
// со startWith ["active",1]
// (без startWith — тишина: page$ ещё ни разу не выдал значение)
\`\`\`

\`combineLatest\` ждёт хотя бы одно значение от **каждого** входа. Если один из входов — поток событий, который может долго молчать (страница не менялась, кнопку не нажимали), вся комбинация молчит. \`startWith(DEFAULT)\` на таком входе решает проблему.

### Пример 6. Форма: что изменилось

\`\`\`ts
const country = new FormControl('BY');

country.valueChanges.pipe(
  startWith(country.value),   // valueChanges сам текущее значение не отдаёт
  pairwise()
).subscribe(([prev, curr]) => console.log(\`страна: \${prev} → \${curr}\`));

country.setValue('PL');
country.setValue('LT');
// страна: BY → PL
// страна: PL → LT
\`\`\`

\`valueChanges\` в Angular выдаёт только **изменения** — текущее значение при подписке он не присылает. \`startWith(control.value)\` добавляет его, а \`pairwise\` даёт «было → стало»: можно сбросить зависимые поля, только когда страна действительно поменялась, или записать изменение в журнал аудита.

### \`startWith\` против \`BehaviorSubject\`

\`\`\`ts
import { Subject, BehaviorSubject, startWith } from 'rxjs';

const prices$ = new Subject<number>();
const withStart$ = prices$.pipe(startWith(0));
withStart$.subscribe((v) => console.log('A', v));
prices$.next(100);
withStart$.subscribe((v) => console.log('B', v));
// A 0
// A 100
// B 0      ← B получил фиксированный 0, хотя текущая цена уже 100

const price$ = new BehaviorSubject(0);
price$.subscribe((v) => console.log('A', v));
price$.next(100);
price$.subscribe((v) => console.log('B', v));
// A 0
// A 100
// B 100    ← BehaviorSubject хранит последнее значение
\`\`\`

\`startWith\` работает на **каждую подписку** и всегда подставляет одно и то же значение. \`BehaviorSubject\` — это хранилище: новый подписчик получает **актуальное** состояние. Если нужно «текущее значение для опоздавших», нужен \`BehaviorSubject\` или \`shareReplay(1)\`, а не \`startWith\`.

### \`endWith\` — зеркальный оператор

\`\`\`ts
import { of, startWith, endWith } from 'rxjs';

of(1, 2).pipe(startWith(0), endWith(99)).subscribe(console.log);
// 0
// 1
// 2
// 99   ← выдано после complete источника
\`\`\`

\`startWith\` принимает и несколько значений: \`startWith('a', 'b')\` выдаст оба по порядку. \`endWith\` добавляет значения в конец — например, финальное «готово» после конечного потока.

### Где это применяется на практике

- **Состояние загрузки**: \`startWith({ loading: true })\` перед HTTP-ответом — шаблон не мигает пустотой, спиннер виден сразу.
- **Фильтры таблиц и дашбордов**: \`startWith(DEFAULT_FILTER)\` на каждом входе \`combineLatest\`, чтобы данные загрузились при открытии страницы, а не после первого клика.
- **Формы**: \`valueChanges.pipe(startWith(control.value), pairwise())\` — реагировать на «было → стало», сбрасывать зависимые поля, вести аудит изменений.
- **UI-эффекты скролла**: направление и скорость скролла для прячущейся шапки или «кнопки наверх».
- **Анимации и индикаторы**: подсветить ячейку грида зелёным или красным, если цена выросла или упала (\`pairwise\` + сравнение).
- **Переходы состояний**: «соединение восстановлено» — \`online$.pipe(startWith(true), pairwise(), filter(([prev, curr]) => !prev && curr))\`.

## Важные нюансы и подводные камни

- **\`pairwise\` съедает первое значение.** На потоке из одного значения он не выдаёт **ничего**. Лечится \`startWith\`.
- **\`take(1)\` после \`startWith\` вернёт стартовое значение**, а не данные: \`startWith\` срабатывает синхронно и первым. Эта же ловушка часто бьёт в юнит-тестах, где проверяют «первое значение».
- **\`startWith\` работает на каждую подписку.** Каждый подписчик — и на холодном, и на горячем потоке — получит своё стартовое значение, даже если реальное состояние давно другое.
- **Пара — это ссылки на объекты.** Если источник мутирует один и тот же объект вместо создания нового, \`prev\` и \`curr\` — один объект, и сравнение всегда даст «не изменилось»: \`prev === curr\` будет \`true\`, а \`prev.name\` уже покажет новое имя.
- **\`startWith\` не то же самое, что \`BehaviorSubject\`.** \`BehaviorSubject\` хранит **последнее** значение, \`startWith\` всегда подставляет **фиксированное**.
- **Тип расширяется.** \`startWith(null)\` даёт \`T | null\`, и все операторы ниже обязаны это учитывать; в паре после \`pairwise\` будут \`[T | null, T | null]\`.
- **Порядок операторов важен.** \`startWith\` после \`map\` подставит значение уже преобразованного типа, а до \`map\` — пропустит его через \`map\`. Для \`pairwise\` стартовое значение должно стоять **перед** ним.
- **Аргумент \`scheduler\` у \`startWith\` устарел.** Последний аргумент-планировщик в RxJS 7 помечен deprecated.
- **Окно из N последних значений вместо пары** — это \`scan((acc, x) => [...acc, x].slice(-n), [])\` или \`bufferCount(n, 1)\`; у второго при завершении выходят ещё и укороченные «хвосты».

**Плюсы:** декларативно решают две частые задачи — «сравнить с прошлым» и «дать начальное состояние»; маленькие, предсказуемые, без внешних переменных.
**Минусы:** \`pairwise\` теряет первое значение, \`startWith\` легко путают с хранилищем состояния; синхронность \`startWith\` неожиданно влияет на \`take(1)\` и тесты; мутирующие источники ломают сравнение пар.

## Как это спрашивают на собеседовании

**Главный вывод:** \`pairwise\` выдаёт \`[prev, curr]\` начиная со второго значения, \`startWith\` синхронно подкладывает значение в начало потока. Дуэт \`startWith\` + \`pairwise\` даёт дельту с первого значения, а \`startWith\` на входах \`combineLatest\` снимает его «ожидание всех».

Типичные формулировки: «Как посчитать разницу между текущим и предыдущим значением?», «Почему \`combineLatest\` ничего не выдаёт?», «Как показать состояние загрузки до ответа сервера?».

Что могут спросить следом:

- *Как получить окно из N последних значений?* — \`scan\` с хвостом массива или \`bufferCount(n, 1)\`.
- *Чем \`startWith\` отличается от \`BehaviorSubject\`?* — \`startWith\` всегда даёт фиксированное значение каждой подписке, \`BehaviorSubject\` хранит последнее.
- *Почему тест получил не те данные после \`take(1)\`?* — \`startWith\` выдал стартовое значение синхронно и первым.
- *Почему \`valueChanges\` не даёт начальное значение?* — Он сообщает только изменения; добавьте \`startWith(control.value)\`.

### Ответ на 1 минуту

> \`pairwise\` запоминает последнее значение и выдаёт кортеж «предыдущее и текущее», поэтому первое значение источника наружу само не выходит, а становится \`prev\` для второго. Это стандартный способ посчитать дельту или направление изменения: скролл вверх или вниз, рост или падение цены, «было → стало» в форме. \`startWith\` синхронно выдаёт заданные значения при подписке, до первого значения источника, и расширяет тип до объединения. Применяю его для начального состояния UI, например флага загрузки до ответа сервера, для снятия блокировки \`combineLatest\`, который молчит, пока каждый вход не выдаст значение, и для \`valueChanges\`, который текущее значение не отдаёт. Отсюда дуэт \`startWith\` плюс \`pairwise\`: стартовое значение играет роль \`prev\`, и первая дельта не теряется. Нюанс: \`take(1)\` ниже по цепочке заберёт стартовое значение, а не данные.`,
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
    category: 'rxjs',
    level: 'Medium',
    tags: ['delay', 'delaywhen', 'timing'],
    question: {
      ru: 'Чем delay отличается от delayWhen? Как реализовать переменную задержку?',
      en: 'How does delay differ from delayWhen? How do you implement a variable delay?'
    },
    answer: {
      ru: `## В чём суть

Оба оператора **придерживают значения** и отдают их позже. \`delay\` держит **всех одинаково** — фиксированное число миллисекунд (или до заданной даты). \`delayWhen\` держит **каждое значение столько, сколько скажет отдельный Observable**, свой для каждого значения: так строится переменная задержка, зависящая от самого значения или от внешнего события.

Аналогия: гардероб. \`delay\` — правило «вещь выдаём ровно через 5 минут после сдачи», одинаковое для всех. \`delayWhen\` — «вещь выдаём, когда прозвенит именно ваш звоночек»: у одного он звенит сразу, у другого через минуту, у третьего — когда закончится спектакль (внешний сигнал).

**Какую проблему решает.** Иногда значение нужно показать или отправить не сразу: дать анимации закончиться, не мигать спиннером на быстрых ответах, придержать события, пока приложение не инициализировалось, разнести запросы во времени, чтобы не упереться в лимит API, повторить запрос с растущей паузой. Писать это на \`setTimeout\` внутри \`subscribe\` — значит потерять отмену, композицию и тестируемость. \`delay\` и \`delayWhen\` делают задержку частью потока: отписались — все отложенные значения отменены.

## Словарик терминов

- **Observable (поток)** — объект, который со временем выдаёт значения; ничего не делает до подписки.
- **Уведомления \`next\` / \`error\` / \`complete\`** — очередное значение, падение потока, успешное завершение.
- **\`delay(ms | Date)\`** — сдвигает каждое значение на одно и то же время или до указанного момента.
- **\`delayWhen(fn)\`** — для каждого значения вызывает \`fn(value, index)\` и выпускает значение, когда полученный Observable впервые выдаст что-нибудь.
- **Notifier («звоночек»)** — Observable, возвращённый из \`fn\`; важен только момент его первого \`next\`, а не содержимое.
- **\`timer(ms)\`** — поток, который через \`ms\` выдаёт одно значение и завершается; самый частый звоночек.
- **Планировщик (scheduler)** — объект RxJS, который решает, когда выполнить отложенную работу. \`asyncScheduler\` работает через таймеры (\`setTimeout\`/\`setInterval\`), то есть в макрозадачах.
- **Макрозадача / микрозадача** — очереди событийного цикла: микрозадачи (\`Promise.then\`) выполняются сразу после текущего кода, макрозадачи (таймеры) — позже.
- **\`EMPTY\` / \`NEVER\`** — поток, который сразу завершается без значений, и поток, который не делает вообще ничего, никогда.
- **\`subscribeOn(scheduler, delay)\`** — откладывает сам момент подписки на источник.
- **Backoff (экспоненциальная задержка)** — повтор с растущей паузой: 200, 400, 800 мс…
- **\`debounceTime\`** — в отличие от \`delay\`, не сдвигает, а выбрасывает промежуточные значения и выдаёт последнее после паузы.

## Как это работает под капотом

В RxJS 7 \`delay\` — это частный случай \`delayWhen\`, а \`delayWhen\` — это \`mergeMap\`. Код почти дословно такой:

\`\`\`ts
function delay(due, scheduler = asyncScheduler) {
  const duration = timer(due, scheduler);
  return delayWhen(() => duration);           // у всех значений один и тот же «звоночек»
}

function delayWhen(durationSelector) {
  return mergeMap((value, index) =>
    innerFrom(durationSelector(value, index)).pipe(
      take(1),                                // ждём ПЕРВОЕ значение звоночка
      map(() => value)                        // и вместо него выпускаем исходное значение
    )
  );
}
\`\`\`

Что происходит по шагам:

1. Приходит значение, и \`delayWhen\` вызывает ваш селектор \`fn(value, index)\`, поэтому у каждого значения появляется свой звоночек.
2. На звоночек делается **отдельная** внутренняя подписка (как в \`mergeMap\`), а значение ждёт в памяти.
3. Когда звоночек впервые выдаёт что угодно, \`take(1)\` отписывается от него, а \`map\` подменяет его значение исходным — оно уходит наружу.
4. Звоночки разных значений тикают **параллельно и независимо**, поэтому значение с коротким звоночком может обогнать предыдущее с длинным.
5. Если звоночек завершился, не выдав ни одного значения, \`take(1)\` ничего не пропустит — исходное значение **пропадёт** (так ведёт себя RxJS 7).
6. \`complete\` источника ждёт, пока выйдут все отложенные значения, а \`error\` источника, как и в любом \`mergeMap\`, уходит **сразу** и отменяет всё, что ещё ждёт.
7. \`delay(ms)\` — это тот же механизм с одинаковым \`timer(ms)\` для всех, поэтому порядок сохраняется, а интервалы между значениями остаются прежними.

\`\`\`text
source:      a-b---c-|
delay(N):    ---a-b---c|     (каждое на +N, форма та же; complete — сразу после последнего)
\`\`\`

### Пример 1. \`delay\` сохраняет форму потока

\`\`\`ts
import { Subject, delay } from 'rxjs';

const src$ = new Subject<string>();
src$.pipe(delay(1000)).subscribe({
  next: (v) => console.log(v),
  complete: () => console.log('complete'),
});
// значения на 0, 100 и 400 мс, complete на 500 мс
// a          ← ~1000 мс
// b          ← ~1100 мс
// c          ← ~1400 мс
// complete   ← ~1400 мс: не через 1000 мс после complete, а сразу после последнего значения
\`\`\`

Все значения сдвинуты на одну секунду, промежутки 100 и 300 мс сохранились. На каждое значение заводится свой таймер, поэтому \`delay(1000)\` на потоке из 100 событий в секунду держит в памяти около сотни ожидающих значений и таймеров.

### Пример 2. \`error\` не задерживается

\`\`\`ts
import { Subject, delay } from 'rxjs';

const src$ = new Subject<number>();
src$.pipe(delay(1000)).subscribe({
  next: (v) => console.log('next', v),
  error: (e) => console.log('error', e.message),
});
src$.next(1);
setTimeout(() => src$.error(new Error('boom')), 100);
// error boom   ← ~100 мс; значение 1 (должно было выйти на 1000 мс) потеряно
\`\`\`

Это частая ошибка в объяснениях: \`delay\` **не** сдвигает ошибку. Она проходит сразу, а все значения, которые ещё ждали своего таймера, отбрасываются. Если отложенные значения важны, ловите ошибку \`catchError\` **до** \`delay\`.

### Пример 3. \`delay(Date)\` — до конкретного момента

\`\`\`ts
import { of, delay } from 'rxjs';

const at = new Date(Date.now() + 500);
of('напоминание').pipe(delay(at)).subscribe(console.log);
// напоминание   ← ~500 мс
\`\`\`

Если передать дату, задержка считается как «до этого момента». Удобно для напоминаний и отложенных уведомлений; если дата уже в прошлом, значение выйдет почти сразу.

### Пример 4. Задержка зависит от значения

\`\`\`ts
import { of, timer, delayWhen } from 'rxjs';

of(
  { id: 'a', priority: 3 },
  { id: 'b', priority: 1 },
  { id: 'c', priority: 2 },
).pipe(
  delayWhen((task) => timer(task.priority * 100))   // меньше priority — раньше выйдет
).subscribe((t) => console.log(t.id));
// b   ← ~100 мс
// c   ← ~200 мс
// a   ← ~300 мс: пришло первым, а вышло последним
\`\`\`

\`delay\` так не умеет: у него одно число на всех. \`delayWhen\` получает значение в селектор, поэтому задержкой можно выразить приоритет, вес, размер файла — что угодно. Обратная сторона видна сразу: порядок на выходе изменился.

### Пример 5. Придержать события до готовности приложения

\`\`\`ts
import { BehaviorSubject, Subject, delayWhen, filter } from 'rxjs';

const ready$ = new BehaviorSubject(false);
const events$ = new Subject<string>();

events$.pipe(
  delayWhen(() => ready$.pipe(filter(Boolean)))   // ждать, пока ready$ не станет true
).subscribe((v) => console.log(v));

events$.next('early');
setTimeout(() => ready$.next(true), 100);
setTimeout(() => events$.next('late'), 200);
// early   ← ~100 мс: дождалось готовности
// late    ← ~200 мс: ready$ уже true, задержки нет
\`\`\`

Здесь важны обе детали. Без \`filter(Boolean)\` \`BehaviorSubject(false)\` сразу выдаст \`false\`, и задержки не будет вовсе. А если взять обычный \`Subject\` вместо \`BehaviorSubject\`, то \`'early'\` дождётся готовности, но \`'late'\`, пришедшее **после** сигнала, будет ждать следующего сигнала — возможно, вечно: \`Subject\` не помнит, что готовность уже наступила.

### Пример 6. Ступенчатая рассылка: осторожно с \`concatMap\`

Задача: отправлять письма с интервалом 200 мс.

\`\`\`ts
import { from, of, delay, concatMap, mergeMap } from 'rxjs';

const emails = ['e1', 'e2', 'e3', 'e4'];
// у каждого варианта указано, когда он выдаёт письма (варианты запускались по отдельности)

// ❌ интервалы растут
from(emails).pipe(concatMap((email, i) => of(email).pipe(delay(i * 200))));
// e1 ~0 мс, e2 ~200, e3 ~600, e4 ~1200   ← задержки складываются: 0, +200, +400, +600

// ✅ одинаковый интервал через очередь
from(emails).pipe(concatMap((email) => of(email).pipe(delay(200))));
// e1 ~200 мс, e2 ~400, e3 ~600, e4 ~800

// ✅ одинаковый интервал через расписание по индексу
from(emails).pipe(mergeMap((email, i) => of(email).pipe(delay(i * 200))));
// e1 ~0 мс, e2 ~200, e3 ~400, e4 ~600
\`\`\`

\`concatMap\` запускает следующий шаг только после окончания предыдущего, поэтому задержка \`i * 200\` прибавляется к уже прошедшему времени. Нужна очередь — делайте одинаковую задержку на шаг; нужна сетка по времени — считайте задержку от индекса и запускайте параллельно через \`mergeMap\`.

### Пример 7. \`delay\` не откладывает подписку

\`\`\`ts
import { defer, timer, map, delay, switchMap, subscribeOn, asyncScheduler } from 'rxjs';

const request$ = defer(() => {
  console.log('запрос отправлен');
  return timer(100).pipe(map(() => 'ответ'));
});

// каждый из трёх вариантов запускался отдельно
request$.pipe(delay(1000)).subscribe(console.log);
// запрос отправлен   ← ~0 мс: запрос ушёл сразу
// ответ              ← ~1100 мс: задержан только ответ

timer(1000).pipe(switchMap(() => request$)).subscribe(console.log);
// запрос отправлен   ← ~1000 мс
// ответ              ← ~1100 мс

request$.pipe(subscribeOn(asyncScheduler, 1000)).subscribe(console.log);
// запрос отправлен   ← ~1000 мс: отложена сама подписка
// ответ              ← ~1100 мс
\`\`\`

\`defer\` создаёт поток в момент подписки — так же ведёт себя \`HttpClient\`. \`delay\` стоит **после** источника и видит только его значения, поэтому на момент отправки запроса никак не влияет. Чтобы отложить сам запрос, нужен \`timer\` + \`switchMap\` или \`subscribeOn\` со вторым аргументом.

### Пример 8. Экспоненциальный backoff через \`retry({ delay })\`

\`\`\`ts
import { defer, throwError, of, timer, retry } from 'rxjs';

let attempt = 0;
const flaky$ = defer(() => {
  attempt++;
  console.log(\`попытка \${attempt}\`);
  return attempt < 4 ? throwError(() => new Error('503')) : of('ok');
});

flaky$.pipe(
  retry({
    count: 5,
    delay: (err, retryCount) => timer(2 ** retryCount * 100),  // 200, 400, 800 мс...
  })
).subscribe(console.log);
// попытка 1   ← ~0 мс: ошибка, пауза 200 мс
// попытка 2   ← ~200 мс: ошибка, пауза 400 мс
// попытка 3   ← ~600 мс: ошибка, пауза 800 мс
// попытка 4   ← ~1400 мс
// ok
\`\`\`

Это та же идея, что у \`delayWhen\`: задержку определяет Observable, который вы возвращаете, и он может зависеть от данных — здесь от номера попытки. В RxJS 7.3+ это современная замена устаревшему \`retryWhen\`.

### Где это применяется на практике

- **Анти-мигание спиннера**: показать индикатор загрузки, только если запрос длится дольше 300 мс (задержанный поток «показать» + отмена при ответе).
- **Тосты и уведомления**: \`delay(3000)\` перед скрытием сообщения, \`delay(Date)\` для напоминаний.
- **Ожидание инициализации**: события аналитики и запросы придерживаются через \`delayWhen\`, пока не загружены конфиг, токен или feature flags.
- **Rate limiting**: ступенчатая отправка писем, пачек данных или запросов к API с лимитом «N в секунду».
- **Повторы HTTP-запросов**: \`retry({ delay })\` с экспоненциальной паузой в интерсепторе или сервисе.
- **Отложенный старт тяжёлой работы**: \`timer(ms).pipe(switchMap(...))\`, чтобы не нагружать первую отрисовку дашборда.
- **\`delay(0)\`** — сдвиг значения в следующую макрозадачу; иногда используют, чтобы обойти \`ExpressionChangedAfterItHasBeenCheckedError\`, но это скорее признак проблемы в потоке данных.

## Важные нюансы и подводные камни

- **\`delay\` не откладывает подписку.** Запрос уйдёт сразу, задержится только ответ. Нужен отложенный старт — \`timer(ms).pipe(switchMap(...))\` или \`subscribeOn(asyncScheduler, ms)\`.
- **\`error\` не задерживается.** Ошибка проходит сразу, а значения, ещё ждавшие таймера, теряются. \`complete\` же задерживается до выхода последнего значения.
- **Буфер растёт.** Значения ждут в памяти, на каждое — свой таймер; на быстром бесконечном источнике с большой задержкой \`delay\` — это скрытая утечка.
- **\`delayWhen\` может перепутать порядок.** Звоночки независимы: значение с коротким таймером обгонит предыдущее с длинным. Нужен порядок — \`concatMap\` с задержкой внутри, но тогда задержки складываются.
- **Звоночек, который не эмитит, — вечная задержка.** \`delayWhen(() => NEVER)\` тихо держит значения и не даёт потоку завершиться; страхуйтесь \`timeout\` или \`race\` с таймером.
- **Звоночку нужен именно \`next\`.** В RxJS 7 звоночек, который завершился, не выдав значения (\`EMPTY\`), не выпускает исходное значение вовсе — оно просто пропадает.
- **Звоночек-\`Subject\` не помнит прошлое.** \`delayWhen(() => ready$)\` с обычным \`Subject\` подвесит значения, пришедшие после сигнала; с \`BehaviorSubject\` нужен \`filter\`, иначе начальное \`false\` сразу отпустит значение.
- **\`delay\` и \`delayWhen\` по-разному работают со временем.** \`delay\` по умолчанию использует \`asyncScheduler\` (макрозадачи), а у \`delayWhen\` время целиком определяется звоночком. В тестах это учитывают через \`fakeAsync\` или \`TestScheduler\`.
- **Второй аргумент \`delayWhen\` устарел.** \`subscriptionDelay\` помечен deprecated и будет удалён в v8; для отложенной подписки используйте \`timer\` + \`switchMap\` или \`subscribeOn\`.
- **Чем \`delay\` отличается от \`debounceTime\`.** \`delay\` **сдвигает все** значения, \`debounceTime\` **выбрасывает** промежуточные и отдаёт только последнее после паузы.

**Плюсы:** задержка становится частью потока — отменяется отпиской, комбинируется с другими операторами и тестируется виртуальным временем; \`delayWhen\` выражает любую динамическую задержку: по значению, по внешнему событию, по номеру попытки.
**Минусы:** значения и таймеры копятся в памяти; \`delayWhen\` меняет порядок и может подвесить значения навсегда; неочевидное поведение с ошибками, с \`EMPTY\`-звоночком и с \`concatMap\`-рассылкой.

## Как это спрашивают на собеседовании

**Главный вывод:** \`delay\` сдвигает каждое значение на одно и то же время, сохраняя порядок и интервалы; \`delayWhen\` даёт каждому значению свой Observable-звоночек и выпускает значение по его первому \`next\` — так делается переменная задержка. Оба не откладывают подписку и не задерживают ошибку.

Типичные формулировки: «Как сделать задержку, зависящую от значения?», «Почему с \`delay\` запрос всё равно уходит сразу?», «Как придержать события до инициализации приложения?».

Что могут спросить следом:

- *Как отложить сам HTTP-запрос?* — \`timer(ms).pipe(switchMap(() => http.get(...)))\` или \`subscribeOn(asyncScheduler, ms)\`.
- *Что будет, если звоночек завершится без значения?* — В RxJS 7 значение не выйдет никогда.
- *Как сделать экспоненциальный backoff?* — \`retry({ count, delay: (err, n) => timer(2 ** n * 100) })\`.
- *Сохраняет ли \`delayWhen\` порядок?* — Нет, звоночки независимы; \`delay\` сохраняет, потому что задержка у всех одинаковая.
- *Задерживает ли \`delay\` ошибку?* — Нет, ошибка проходит сразу и отменяет ожидающие значения.

### Ответ на 1 минуту

> \`delay\` сдвигает каждое значение на фиксированное время или до заданной даты: порядок и интервалы между значениями сохраняются, вся кривая просто едет вправо. \`delayWhen\` даёт индивидуальную задержку: селектор получает значение и возвращает Observable-звоночек, и значение выходит, когда тот впервые выдаст \`next\`. Так я строю задержку, зависящую от самого значения, например от приоритета, или от внешнего сигнала, например придержать события, пока приложение не готово. Внутри в RxJS 7 это \`mergeMap\` с \`take(1)\`, а \`delay\` — частный случай \`delayWhen\` с \`timer\`. Нюансы, которые проверяю: ни один из них не откладывает подписку, поэтому для отложенного запроса нужен \`timer\` плюс \`switchMap\`; ошибка не задерживается; звоночек без \`next\` теряет значение навсегда; а \`delayWhen\` может поменять порядок.`,
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
    category: 'rxjs',
    level: 'Hard',
    tags: ['repeat', 'repeatwhen', 'polling'],
    question: {
      ru: 'Как работают repeat и repeatWhen? Как реализовать polling и чем repeat отличается от retry?',
      en: 'How do repeat and repeatWhen work? How do you implement polling, and how does repeat differ from retry?'
    },
    answer: {
      ru: `## В чём суть

\`repeat\` и \`retry\` делают одно и то же действие — **заново подписываются на источник**, то есть запускают его работу с нуля. Разница только в поводе: \`repeat\` срабатывает на \`complete\` («всё прошло хорошо — давай ещё раз»), \`retry\` — на \`error\` («упало — попробуй снова»). \`repeatWhen\` — устаревший вариант \`repeat\`, где момент повтора задаёт отдельный поток-сигнал. А polling — это просто «повторять запрос с паузой», и в RxJS его собирают либо из \`repeat\`, либо из \`timer\` + \`switchMap\`.

Аналогия: сериал по телевизору. \`repeat\` — серия досмотрена до конца, канал ставит её повтор. \`retry\` — плёнку зажевало на середине, её отматывают и включают заново. Polling — вы каждые пять минут заглядываете в почтовый ящик: ничего не сломалось, просто письмо может прийти в любой момент.

**Какую проблему решает.** В реальном приложении постоянно нужно «спросить ещё раз»: обновлять дашборд раз в 30 секунд, следить за статусом долгого экспорта, подтягивать новые уведомления. Вручную это \`setInterval\`, флаг «запрос уже идёт», \`clearInterval\` в \`ngOnDestroy\` и типовые баги: запросы накладываются друг на друга, ответы приходят не по порядку, таймер живёт после ухода со страницы. \`repeat\` и его родственники превращают это в одну декларативную цепочку, которая сама останавливается при отписке.

## Словарик терминов

- **Observable (поток)** — объект, который со временем выдаёт значения и в конце может завершиться или упасть. Ничего не делает, пока на него не подписались.
- **Подписка и переподписка (subscribe / resubscribe)** — подписка запускает работу потока; переподписка — новая подписка на тот же поток после окончания старой, то есть ещё один запуск с нуля.
- **\`complete\` / \`error\`** — два финальных уведомления: поток закончился успешно или с ошибкой. После любого из них поток молчит.
- **Холодный поток (cold Observable)** — поток, который на каждую подписку заново выполняет свою работу. \`HttpClient.get()\` холодный: каждая подписка отправляет новый HTTP-запрос.
- **Побочный эффект (side effect)** — действие «наружу»: HTTP-запрос, запись в лог, событие аналитики. При переподписке он выполняется снова.
- **Polling (опрос)** — периодический запрос к серверу «есть что-то новое?» вместо того, чтобы сервер сам присылал изменения (как в WebSocket).
- **Поток-сигнал (notifier)** — вспомогательный Observable, каждое значение которого означает «пора действовать», например «пора повторить».
- **\`defer\`** — создание потока по требованию: функция-фабрика вызывается заново при каждой подписке.
- **\`timer\`** — поток-таймер: \`timer(1000)\` выдаёт \`0\` через секунду и завершается, \`timer(0, 5000)\` выдаёт \`0, 1, 2…\` сразу и затем каждые 5 секунд.
- **\`switchMap\` / \`exhaustMap\`** — операторы, которые превращают каждое значение во внутренний поток (здесь — в запрос). \`switchMap\` отменяет предыдущий запрос при новом значении, \`exhaustMap\` игнорирует новые значения, пока текущий запрос не закончился.
- **\`takeUntil\` / \`takeUntilDestroyed\` / \`takeWhile\`** — операторы остановки: до сигнала, до уничтожения компонента Angular, пока условие истинно.
- **Backoff (нарастающая пауза)** — увеличение паузы между повторами: 1 с, 2 с, 4 с…, чтобы не добивать перегруженный сервер.

## Как это работает под капотом

\`repeat\` устроен проще, чем кажется. Упрощённая реализация для числового \`delay\` (настоящая ещё умеет \`delay\`-функцию и защищена от бесконечной рекурсии на синхронных источниках):

\`\`\`ts
function repeat({ count = Infinity, delay } = {}) {
  return (source) => new Observable((subscriber) => {
    let runs = 0;
    let current;
    const run = () => {
      current = source.subscribe({
        next: (v) => subscriber.next(v),        // значения пропускаем как есть
        error: (e) => subscriber.error(e),      // ошибку НЕ ловим
        complete: () => {
          runs++;
          if (runs >= count) return subscriber.complete();  // лимит исчерпан
          if (delay == null) return run();                    // сразу заново
          current = timer(delay).subscribe(() => run());      // заново после паузы
        },
      });
    };
    run();
    return () => current?.unsubscribe();  // отписка гасит и запрос, и паузу
  });
}
\`\`\`

По шагам:

1. Вы подписываетесь, \`repeat\` подписывается на источник — для HTTP это значит, что запрос ушёл.
2. Значения источника проходят наружу без изменений.
3. Источник присылает \`complete\`. \`repeat\` **проглатывает** его — ваш подписчик ничего не узнаёт — и увеличивает счётчик запусков.
4. Если счётчик меньше \`count\`, \`repeat\` подписывается на источник **заново**. Для холодного источника это новый запрос и новые побочные эффекты.
5. Если задан \`delay\`, перед новой подпиской он ждёт таймер или поток-сигнал. Поэтому пауза отсчитывается **от момента завершения**, а не по часам.
6. Когда счётчик дошёл до \`count\`, \`complete\` наконец проходит наружу. Без \`count\` повтор бесконечный.
7. \`error\` проходит насквозь сразу: \`repeat\` ошибку не обрабатывает, повтора не будет. \`retry\` устроен зеркально — ловит \`error\` и пропускает \`complete\`.
8. Отписка снаружи закрывает текущую подписку на источник или текущую паузу — polling останавливается.

\`\`\`text
source:     --a--b--|           (| — это complete)
repeat(2):  --a--b----a--b--|   (источник отработал 2 раза)
\`\`\`

### \`repeat(count)\` — повтор после успешного завершения

\`\`\`ts
import { defer, of, repeat } from 'rxjs';

let runs = 0;
defer(() => {
  runs++;
  console.log('подписка №' + runs);
  return of('a', 'b');
})
  .pipe(repeat(3))
  .subscribe({ next: (v) => console.log('next', v), complete: () => console.log('complete') });
// подписка №1
// next a
// next b
// подписка №2
// next a
// next b
// подписка №3
// next a
// next b
// complete
\`\`\`

\`count\` — это **общее число запусков**, а не число дополнительных повторов: \`repeat(3)\` выполнил источник три раза. \`repeat(0)\` и отрицательные значения дают пустой поток, который сразу завершается, не подписавшись на источник ни разу.

### \`repeat({ count, delay })\` — повтор с паузой

Объектная форма появилась в RxJS 7.5. \`delay\` бывает числом (миллисекунды) или функцией, которая получает номер завершения и возвращает поток-сигнал: первое его значение запускает повтор.

\`\`\`ts
import { defer, of, delay, repeat, timer, EMPTY } from 'rxjs';

// «Запрос» идёт 300 мс, пауза между запросами — 500 мс
let n = 0;
const load = () => defer(() => {
  n++;
  console.log('запрос', n);
  return of('данные ' + n).pipe(delay(300));
});

load().pipe(repeat({ count: 3, delay: 500 })).subscribe({
  next: (v) => console.log('ответ:', v),
  complete: () => console.log('complete'),
});
// 0ms    запрос 1
// 300ms  ответ: данные 1
// 800ms  запрос 2      ← 300 мс ответ + 500 мс пауза
// 1100ms ответ: данные 2
// 1600ms запрос 3
// 1900ms ответ: данные 3
// 1900ms complete
\`\`\`

Функция в \`delay\` даёт полный контроль: можно сделать нарастающую паузу (backoff) или остановиться. Если поток-сигнал завершится, ничего не выдав (например, \`EMPTY\`), \`repeat\` завершит весь результат:

\`\`\`ts
of('tick').pipe(
  repeat({
    delay: (count) => {                      // count — сколько раз источник уже завершился
      console.log('завершений:', count);
      return count < 3 ? timer(count * 200) : EMPTY;
    },
  })
).subscribe({ next: (v) => console.log(v), complete: () => console.log('complete') });
// 0ms   tick
// 0ms   завершений: 1
// 200ms tick
// 200ms завершений: 2
// 600ms tick            ← пауза выросла до 400 мс
// 600ms завершений: 3
// 600ms complete        ← EMPTY остановил повторы
\`\`\`

### \`retry\` — повтор после ошибки, и чем он отличается

\`retry\` — зеркальный близнец: переподписывается на \`error\`, а \`complete\` пропускает. Сравните поведение на одних и тех же данных:

\`\`\`ts
import { defer, of, throwError, repeat, retry } from 'rxjs';

// repeat не спасает от ошибки
let a = 0;
defer(() => (++a === 1 ? of('ok') : throwError(() => new Error('boom'))))
  .pipe(repeat(5))
  .subscribe({ next: (v) => console.log('next', v), error: (e) => console.log('error', e.message) });
// next ok
// error boom        ← второй запуск упал, повторов больше нет

// retry(2): одна попытка + две повторных
let b = 0;
defer(() => { console.log('попытка', ++b); return throwError(() => new Error('500')); })
  .pipe(retry(2))
  .subscribe({ error: (e) => console.log('error', e.message) });
// попытка 1
// попытка 2
// попытка 3
// error 500

// retry на успешном потоке ничего не повторяет
of('data').pipe(retry(3)).subscribe({ next: console.log, complete: () => console.log('complete') });
// data
// complete
\`\`\`

Обратите внимание на асимметрию счёта: у \`repeat(n)\` \`n\` — сколько раз выполнить всего, у \`retry(n)\` — сколько раз повторить **после** первой неудачи. Отсюда же главное правило: \`repeat\` не восстанавливает после ошибки, \`retry\` не повторяет успешный поток. У \`retry\` тоже есть объектная форма \`retry({ count, delay })\` — она появилась раньше, в RxJS 7.3.

### \`repeatWhen\` — устаревший повтор по сигналу

\`repeatWhen(notifier)\` получает поток сигналов «источник завершился» и возвращает Observable, каждое значение которого запускает повтор. В RxJS 7 он помечен deprecated («будет удалён в v9 или v10») с рекомендацией перейти на \`repeat({ delay })\`. Классическое применение — «обновить по кнопке Refresh». Сравним его с современной заменой:

\`\`\`ts
import { defer, of, delay, Subject, repeat, repeatWhen } from 'rxjs';

const refresh$ = new Subject<void>();
let n = 0;
const load$ = defer(() => { n++; console.log('запрос', n); return of('ответ ' + n).pipe(delay(300)); });

load$.pipe(repeatWhen(() => refresh$)).subscribe(console.log);
// клики Refresh: на 500 мс (после ответа 1) и на 600 мс (пока идёт запрос 2)
// 0ms   запрос 1
// 300ms ответ 1
// 500ms запрос 2
// 600ms запрос 3     ← второй клик запустил ПАРАЛЛЕЛЬНЫЙ запрос
// 800ms ответ 2
// 900ms ответ 3

// Та же логика на repeat({ delay }) (счётчик n начат заново):
load$.pipe(repeat({ delay: () => refresh$ })).subscribe(console.log);
// 0ms   запрос 1
// 300ms ответ 1
// 500ms запрос 2
// 800ms ответ 2      ← клик на 600 мс проигнорирован: запрос ещё шёл
\`\`\`

Почему так: \`repeatWhen\` подписывается на сигнальный поток один раз (при первом завершении) и дальше реагирует на **каждый** сигнал, даже если источник ещё работает. \`repeat({ delay })\` вызывает функцию заново после каждого завершения и ждёт только **первый** сигнал — повторы никогда не накладываются.

### \`defer\` — зачем он рядом с \`repeat\`

\`repeat\` переподписывается на **тот же объект** Observable. Если этот объект при создании уже «запомнил» результат или параметры, повтор их не обновит:

\`\`\`ts
import { defer, from, of, repeat, tap } from 'rxjs';

let calls = 0;
const fakeFetch = () => { calls++; return Promise.resolve('данные ' + calls); };

from(fakeFetch()).pipe(repeat(3)).subscribe((v) => console.log('from:', v));
// from: данные 1
// from: данные 1
// from: данные 1     ← промис выполнился один раз, повторы отдают тот же результат

defer(() => fakeFetch()).pipe(repeat(3)).subscribe((v) => console.log('defer:', v));
// defer: данные 2
// defer: данные 3
// defer: данные 4    ← фабрика вызывается на каждую переподписку

// Параметры тоже «замерзают» без defer
let page = 1;
const getPage = (p: number) => of('страница ' + p);
getPage(page).pipe(tap(() => page++), repeat(2)).subscribe(console.log);
// страница 1
// страница 1         ← аргумент вычислен один раз, при создании потока
\`\`\`

С \`HttpClient\` и неизменными параметрами \`repeat\` работает и без \`defer\`: его Observable холодный, каждая подписка — новый запрос. Но если параметры (фильтр, токен, «с какой даты») вычисляются в момент вызова, нужен \`defer(() => this.api.load(this.filter()))\`.

### \`timer\` — источник тиков для polling

\`\`\`ts
import { timer, take } from 'rxjs';

timer(0, 1000).pipe(take(3)).subscribe({ next: console.log, complete: () => console.log('complete') });
// 0      (сразу)
// 1      (через 1 с)
// 2      (через 2 с)
// complete — благодаря take(3), сам timer(0, 1000) бесконечен
\`\`\`

Сам по себе \`timer\` ничего не запрашивает — это метроном. Запрос к каждому тику привязывают \`switchMap\` или \`exhaustMap\`. Дальше три стратегии polling на одной имитации API: второй запрос «тормозит» 500 мс, остальные отвечают за 100 мс, период — 300 мс.

\`\`\`ts
let n = 0;
const load = () => defer(() => {
  const id = ++n;
  console.log(\`запрос \${id}\`);
  return of(\`ответ \${id}\`).pipe(
    delay(id === 2 ? 500 : 100),
    tap({ unsubscribe: () => console.log(\`запрос \${id} отменён\`) }),
  );
});
\`\`\`

### \`switchMap\` — polling по часам с отменой

\`\`\`ts
timer(0, 300).pipe(switchMap(() => load())).subscribe(console.log);
// 0ms    запрос 1
// 100ms  ответ 1
// 300ms  запрос 2
// 600ms  запрос 2 отменён   ← пришёл новый тик, медленный запрос выброшен
// 600ms  запрос 3
// 700ms  ответ 3
// 900ms  запрос 4
// 1000ms ответ 4
\`\`\`

Тики идут строго по расписанию. Если ответ не успел до следующего тика, \`switchMap\` отписывается от него (\`HttpClient\` при этом реально обрывает запрос) и стартует новый. Плюс — данные всегда свежие. Минус — если сервер стабильно отвечает дольше периода, вы **никогда не получите ответа**: каждый запрос будет отменён следующим.

### \`exhaustMap\` — polling по часам без наложений

\`\`\`ts
timer(0, 300).pipe(exhaustMap(() => load())).subscribe(console.log);
// 0ms    запрос 1
// 100ms  ответ 1
// 300ms  запрос 2
// 800ms  ответ 2      ← тик на 600 мс проигнорирован: запрос ещё шёл
// 900ms  запрос 3
// 1000ms ответ 3
\`\`\`

\`exhaustMap\` пропускает тики, пока текущий запрос не закончился. Запросы не накладываются и не отменяются, но ритм остаётся привязан к часам: после медленного ответа следующий запрос может уйти почти сразу.

### \`defer\` + \`repeat({ delay })\` — пауза от момента ответа

\`\`\`ts
load().pipe(repeat({ delay: 300 })).subscribe(console.log);
// 0ms   запрос 1
// 100ms ответ 1
// 400ms запрос 2      ← 100 мс ответ + 300 мс пауза
// 900ms ответ 2
// (следующий запрос — в 1200ms)
\`\`\`

Здесь интервал — это «тишина между ответом и следующим запросом». Наложений нет в принципе, а медленный сервер автоматически получает меньше нагрузки. Для большинства задач опроса это самый бережный вариант.

### Остановка polling: \`takeUntilDestroyed\`, \`takeUntil\`, \`takeWhile\`

Бесконечный \`repeat\` или \`timer\` надо обязательно останавливать. В компоненте Angular это \`takeUntilDestroyed()\` (вызванный в контексте внедрения — в конструкторе или инициализаторе поля), в сервисе — \`takeUntil(stop$)\`. А для «опрашивай, пока задача не готова» идеален \`takeWhile\` с флагом \`inclusive = true\`, который пропускает и последнее, финальное значение:

\`\`\`ts
import { defer, of, delay, repeat, takeWhile } from 'rxjs';

const statuses = ['queued', 'running', 'running', 'done'];
let i = 0;
const getStatus = () => defer(() => of(statuses[i++]).pipe(delay(100)));

getStatus().pipe(
  repeat({ delay: 200 }),
  takeWhile((s) => s !== 'done', true),
).subscribe({ next: console.log, complete: () => console.log('complete') });
// 100ms  queued
// 400ms  running
// 700ms  running
// 1000ms done
// 1000ms complete   ← takeWhile отписался, повторов больше нет
\`\`\`

Реалистичный сервис для экспорта отчёта:

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class ExportService {
  private http = inject(HttpClient);

  watch(jobId: string) {
    // HttpClient холодный, а jobId не меняется — defer здесь не нужен
    return this.http.get<ExportJob>(\`/api/exports/\${jobId}\`).pipe(
      repeat({ delay: 2000 }),
      takeWhile((job) => job.state !== 'done', true),
    );
  }
}
// В компоненте: exportService.watch(id) через async pipe или toSignal — они отпишутся сами
\`\`\`

### Ошибки внутри polling

\`repeat\` не ловит ошибки, поэтому один упавший запрос убивает весь опрос. Если сбой одного цикла не критичен, ошибку гасят **внутри**, до \`repeat\`:

\`\`\`ts
import { defer, of, throwError, catchError, EMPTY, repeat } from 'rxjs';

let n = 0;
const load = () => defer(() => (++n === 2 ? throwError(() => new Error('502')) : of('ответ ' + n)));

load().pipe(
  catchError((e) => { console.log('ошибка', e.message, '— пропускаем цикл'); return EMPTY; }),
  repeat({ delay: 200 }),
).subscribe(console.log);
// 0ms   ответ 1
// 200ms ошибка 502 — пропускаем цикл
// 400ms ответ 3
// 600ms ответ 4
\`\`\`

\`catchError\` заменил ошибку пустым потоком, тот завершился — и для \`repeat\` это обычный \`complete\`. Можно добавить и \`retry({ count: 2, delay: 1000 })\` перед \`catchError\`: сначала несколько быстрых попыток, и только потом «пропустить цикл». Без \`catchError\` вывод был бы \`ответ 1\`, затем \`error 502\` — и тишина навсегда.

### Пауза polling на скрытой вкладке

Частый вопрос следом. \`fromEvent\` превращает DOM-событие в поток, \`startWith\` подставляет начальное значение, \`distinctUntilChanged\` пропускает только реальные изменения, а \`switchMap\` переключается между опросом и пустым потоком \`EMPTY\`:

\`\`\`ts
const visible$ = fromEvent(document, 'visibilitychange').pipe(
  map(() => document.visibilityState === 'visible'),
  startWith(document.visibilityState === 'visible'),
  distinctUntilChanged(),
);

const poll$ = defer(() => this.api.load()).pipe(repeat({ delay: 30_000 }));

visible$.pipe(
  switchMap((visible) => (visible ? poll$ : EMPTY)),
  takeUntilDestroyed(),
).subscribe((data) => this.data.set(data));
\`\`\`

Когда вкладка скрывается, \`switchMap\` отписывается от \`poll$\` — текущий запрос и пауза отменяются. Когда вкладка снова видна, \`switchMap\` подписывается заново, и первый запрос уходит **сразу**, так что пользователь видит свежие данные.

### Где это применяется на практике

- **Дашборды и мониторинг**: виджеты метрик, очереди задач, статусы серверов — \`defer\` + \`repeat({ delay })\` с паузой на скрытой вкладке.
- **Долгие операции**: экспорт отчёта в Excel, генерация PDF, импорт большого файла — опрос статуса задачи с \`takeWhile(..., true)\` до \`done\`.
- **Уведомления и счётчики** («3 новых сообщения»), когда WebSocket нет или он избыточен.
- **Кнопка «Обновить» в большой таблице**: \`repeat({ delay: () => refresh$ })\` вместо устаревшего \`repeatWhen\`, без наложенных запросов.
- **Сетевой слой**: \`retry({ count, delay })\` для временных сбоев внутри каждого цикла опроса, \`catchError\` — чтобы один сбой не убил весь polling.

## Важные нюансы и подводные камни

- **\`repeat\` на бесконечном потоке бесполезен.** \`complete\` не наступит, повтора не будет. \`interval(1000).pipe(repeat())\` ничем не отличается от \`interval(1000)\`.
- **Перепутать \`repeat\` и \`retry\`** — самая частая ошибка: \`repeat\` не восстанавливает после ошибки, \`retry\` не повторяет успешный поток. И считают они по-разному: \`repeat(3)\` — три запуска всего, \`retry(3)\` — до четырёх.
- **Побочные эффекты повторяются.** Каждый цикл — новый запрос, новая строка лога, новое событие аналитики. Логирование «пользователь открыл отчёт» внутри опрашиваемого потока превратится в спам.
- **Забыли \`defer\`.** Для промиса повтор вернёт тот же старый результат, для параметров, вычисленных при вызове, — те же старые параметры. С холодным \`HttpClient\` и неизменными аргументами работает и без \`defer\`.
- **Не остановили polling** — запросы идут весь срок жизни приложения, даже после ухода со страницы. Нужен \`takeUntilDestroyed()\`, \`takeUntil(stop$)\` или \`async\` pipe.
- **\`timer\` + \`switchMap\` при медленном сервере** может не дать ни одного ответа: каждый запрос отменяется следующим тиком.
- **\`repeatWhen\` с внешним сигналом допускает наложение запросов**: сигнал во время работы источника запускает параллельную подписку.
- **Одна ошибка убивает весь опрос**, если не погасить её \`catchError\` внутри цикла, до \`repeat\`.
- **Версии.** \`retry({ count, delay })\` — с RxJS 7.3, \`repeat({ count, delay })\` — с RxJS 7.5. На RxJS 6 остаются \`repeatWhen\`/\`retryWhen\` или \`timer\` + \`switchMap\`.
- **Синхронный источник с бесконечным \`repeat()\`** без \`delay\` повесит вкладку: повтор идёт синхронно в цикле, и браузер не получит управление.

**Плюсы:** декларативный polling в одну цепочку, пауза от момента ответа без наложений, гибкий backoff через функцию \`delay\`, остановка простой отпиской.
**Минусы:** легко перепутать \`repeat\` и \`retry\` и их счёт, побочные эффекты повторяются, бесконечный опрос требует дисциплины с отпиской, а на старом RxJS 6 удобной формы \`repeat({ delay })\` нет.

## Как это спрашивают на собеседовании

**Главный вывод:** \`repeat\` и \`retry\` — один механизм переподписки с разным поводом: \`repeat\` — после \`complete\`, \`retry\` — после \`error\`. Polling с паузой от момента ответа — это \`defer(() => api.load()).pipe(repeat({ delay }))\`, по часам — \`timer(0, N)\` + \`switchMap\`/\`exhaustMap\`, и его всегда нужно останавливать.

Типичные формулировки: «Как сделать polling в RxJS?», «Чем \`repeat\` отличается от \`retry\`?», «Как опрашивать статус задачи, пока она не завершится?», «Почему у вас запросы опроса накладываются друг на друга?».

Что могут спросить следом:

- *Чем \`timer\` + \`switchMap\` хуже \`repeat({ delay })\`?* — Тики по часам: медленный запрос отменяется следующим тиком, а при стабильно медленном сервере ответа не будет вовсе. \`repeat({ delay })\` отсчитывает паузу от ответа.
- *Как остановить опрос, когда задача готова?* — \`takeWhile((s) => s !== 'done', true)\`: второй аргумент пропускает и финальный статус.
- *Как поставить опрос на паузу на неактивной вкладке?* — Поток видимости из \`visibilitychange\` и \`switchMap\` между \`poll$\` и \`EMPTY\`.
- *Что делать с ошибкой одного цикла?* — \`retry\` и \`catchError(() => EMPTY)\` внутри, до \`repeat\`, иначе одна ошибка убьёт весь опрос.
- *Зачем \`defer\`?* — Чтобы параметры и промисы создавались заново на каждый цикл, а не один раз.

### Ответ на 1 минуту

> \`repeat\` и \`retry\` используют один и тот же механизм — переподписку на источник, только \`repeat\` срабатывает на \`complete\`, а \`retry\` на \`error\`, поэтому \`repeat\` не спасает от ошибки, а \`retry\` не повторяет успешный поток. \`repeat(3)\` выполняет источник три раза всего, а с RxJS 7.5 есть форма \`repeat({ count, delay })\`, где пауза отсчитывается от завершения, а \`delay\`-функция позволяет сделать backoff или остановиться. \`repeatWhen\` устарел: его заменяет \`repeat({ delay: () => signal$ })\`. Polling я делаю двумя способами: \`timer(0, N)\` со \`switchMap\` или \`exhaustMap\` даёт ритм по часам, а \`defer\` плюс \`repeat({ delay })\` ждёт ответ и только потом паузу, поэтому запросы никогда не накладываются. На практике добавляю \`catchError\` внутри цикла, чтобы один сбой не убил опрос, \`takeWhile\` для статуса задачи и обязательно \`takeUntilDestroyed\`.`,
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
    category: 'rxjs',
    level: 'Medium',
    tags: ['timeout', 'defaultifempty', 'throwifempty'],
    question: {
      ru: 'Для чего нужны timeout, throwIfEmpty и defaultIfEmpty? Покажите их применение.',
      en: 'What are timeout, throwIfEmpty, and defaultIfEmpty for? Show their usage.'
    },
    answer: {
      ru: `## В чём суть

Три оператора закрывают **два неприятных сценария**: «поток молчит слишком долго» и «поток завершился, так ничего и не сказав». \`timeout\` — сторож с секундомером: не дождался значения за N мс — ошибка \`TimeoutError\` или переключение на запасной поток. \`defaultIfEmpty\` говорит «раз никто не ответил, отвечу за него» и подставляет значение по умолчанию. \`throwIfEmpty\` — наоборот: «молчание здесь недопустимо» — и превращает пустоту в ошибку.

Аналогия: вы звоните в поддержку. \`timeout\` — «жду 30 секунд и кладу трубку» (или перезваниваю на запасной номер). \`defaultIfEmpty\` — «никто не ответил, значит считаем, что заявок нет». \`throwIfEmpty\` — «никто не ответил — это ЧП, поднимаем тревогу».

**Какую проблему решает.** Без \`timeout\` зависший запрос держит спиннер бесконечно: браузер может ждать ответа очень долго, а пользователь видит вечную загрузку. Без \`defaultIfEmpty\`/\`throwIfEmpty\` поток, который завершился пустым (фильтр всё отсеял, кэш промахнулся, \`catchError\` вернул \`EMPTY\`), молча «проглатывает» сценарий: \`subscribe\` не получает ни одного \`next\`, экран не обновляется, и никто не понимает почему. Эти операторы делают оба случая явными: либо осмысленное значение, либо честная ошибка, которую поймает \`catchError\`.

## Словарик терминов

- **Observable (поток)** — объект, который со временем выдаёт значения (\`next\`) и в конце завершается (\`complete\`) или падает (\`error\`).
- **Пустой поток** — поток, который завершился, не выдав ни одного \`next\`. Эталонный пример — константа \`EMPTY\`.
- **Бесконечный поток** — поток, который никогда не присылает \`complete\`: \`interval\`, клики, \`NEVER\` (поток, который вообще ничего не делает).
- **\`TimeoutError\`** — класс ошибки из RxJS, которую бросает \`timeout\`. У неё есть поле \`info\` с подробностями.
- **\`EmptyError\`** — ошибка RxJS «no elements in sequence»: её бросают \`first()\`, \`last()\`, \`throwIfEmpty()\` без аргумента и \`firstValueFrom\` на пустом потоке.
- **Фабрика (factory)** — функция, которая создаёт объект по требованию: \`() => new Error(...)\` или \`() => of(cache)\`. Вызывается только когда реально нужна.
- **Запасной поток (fallback)** — Observable, на который переключаются вместо ошибки: кэш, заглушка, повторный запрос.
- **Дедлайн** — крайний срок. Бывает на первое значение, между значениями и на весь поток — это три разные вещи.
- **\`catchError\`** — оператор, который перехватывает \`error\` и заменяет его другим потоком.
- **Планировщик (scheduler)** — объект RxJS, который решает, когда выполнить отложенное действие. \`timeout\` по умолчанию использует \`asyncScheduler\` (под капотом обычный таймер браузера).
- **Marble-тест и \`TestScheduler\`** — тест потоков в «виртуальном времени», где таймеры не ждут реальные секунды.

## Как это работает под капотом

\`defaultIfEmpty\` и \`throwIfEmpty\` устроены почти одинаково — флажок «было ли хоть одно значение» и проверка в момент \`complete\`:

\`\`\`ts
function defaultIfEmpty(defaultValue) {
  return (source) => new Observable((subscriber) => {
    let hasValue = false;                 // своя переменная на каждую подписку
    return source.subscribe({
      next: (v) => { hasValue = true; subscriber.next(v); },
      error: (e) => subscriber.error(e),
      complete: () => {
        if (!hasValue) subscriber.next(defaultValue); // throwIfEmpty: subscriber.error(factory())
        subscriber.complete();
      },
    });
  });
}
\`\`\`

\`timeout\` — это таймер, который перезаводится на каждом значении:

\`\`\`ts
function timeout({ first, each, with: fallback }) {
  return (source) => new Observable((subscriber) => {
    let seen = 0;
    let timerId;
    const start = (ms) => {
      timerId = setTimeout(() => {
        sourceSub.unsubscribe();                         // бросаем медленный источник
        if (fallback) fallback({ seen }).subscribe(subscriber); // на запасной поток
        else subscriber.error(new TimeoutError());
      }, ms);
    };
    const sourceSub = source.subscribe({
      next: (v) => {
        clearTimeout(timerId);
        seen++;
        subscriber.next(v);
        if (each) start(each);                // новый отсчёт — от этого значения
      },
      error: (e) => { clearTimeout(timerId); subscriber.error(e); },
      complete: () => { clearTimeout(timerId); subscriber.complete(); },
    });
    if (!seen) start(first ?? each);          // дедлайн на первое значение
    return () => { clearTimeout(timerId); sourceSub.unsubscribe(); };
  });
}
\`\`\`

По шагам:

1. При подписке \`timeout\` подписывается на источник и заводит первый таймер: на \`first\` мс, а если \`first\` не задан — на \`each\` мс.
2. Пришло значение — таймер сбрасывается, значение уходит дальше, и если задан \`each\`, заводится новый таймер уже от этого значения.
3. Если задан только \`first\`, после первого значения ограничений больше нет: дальше поток может молчать сколько угодно.
4. Таймер дожил до конца — \`timeout\` **отписывается от источника** (HTTP-запрос при этом обрывается) и либо бросает \`TimeoutError\`, либо подписывает вас на поток из фабрики \`with\`.
5. \`defaultIfEmpty(v)\` и \`throwIfEmpty(fn)\` ничего не делают с проходящими значениями — они ждут \`complete\`. Если до него не было ни одного \`next\`, первый выдаёт \`v\` и завершается, второй бросает ошибку из фабрики.
6. Отсюда главное ограничение: эти два оператора работают **только на завершающихся** потоках. На бесконечном \`complete\` не наступит, и они не сработают никогда.

### \`timeout(ms)\` — простая форма

\`\`\`ts
import { of, delay, timeout } from 'rxjs';

of('ответ').pipe(delay(500), timeout(300)).subscribe({
  next: console.log,
  error: (e) => console.log(e.name, e.message),
});
// (через 300 мс) TimeoutError Timeout has occurred

of('ответ').pipe(delay(100), timeout(300)).subscribe(console.log);
// (через 100 мс) ответ
\`\`\`

Число в \`timeout(300)\` означает \`{ each: 300 }\`: дедлайн 300 мс и на первое значение, и между любыми соседними значениями. Если передать объект \`Date\`, это будет \`{ first: date }\` — абсолютный срок для первого значения.

### \`first\` и \`each\` — дедлайн на первое значение и между значениями

\`\`\`ts
import { concat, of, delay, timeout } from 'rxjs';

// each: 300 — пауза между значениями не больше 300 мс
concat(of(1), of(2).pipe(delay(100)), of(3).pipe(delay(500)))
  .pipe(timeout({ each: 300 }))
  .subscribe({ next: console.log, error: (e) => console.log(e.name, 'seen:', e.info.seen) });
// 0ms   1
// 100ms 2
// 400ms TimeoutError seen: 2   ← после «2» прошло 300 мс тишины

// first: 300 — ограничено только ожидание первого значения
concat(of(1).pipe(delay(100)), of(2).pipe(delay(1000)))
  .pipe(timeout({ first: 300 }))
  .subscribe({ next: console.log, complete: () => console.log('complete') });
// 100ms  1
// 1100ms 2          ← секунда тишины после первого значения — это нормально
// 1100ms complete

// first: 500, each: 200 — щедро ждём старта, потом жёстче
concat(of(1).pipe(delay(400)), of(2).pipe(delay(100)), of(3).pipe(delay(300)))
  .pipe(timeout({ first: 500, each: 200 }))
  .subscribe({ next: console.log, error: (e) => console.log(e.name) });
// 400ms 1
// 500ms 2
// 700ms TimeoutError
\`\`\`

Комбинация \`first\` + \`each\` идеальна для стриминга и WebSocket: первое сообщение может прийти не сразу (рукопожатие, прогрев), а потом «пульс» должен быть регулярным.

### \`timeout({ with })\` — запасной поток вместо ошибки

\`\`\`ts
import { of, delay, timeout } from 'rxjs';

of('свежие данные').pipe(
  delay(500),
  timeout({ first: 300, with: () => of('данные из кэша') }),
).subscribe(console.log);
// (через 300 мс) данные из кэша
\`\`\`

Фабрика \`with\` получает объект \`info\` с полями \`meta\` (любые ваши данные из опции \`meta\`, например URL для лога), \`seen\` (сколько значений успело прийти) и \`lastValue\`. Внимание: в RxJS 7.8 \`lastValue\` в \`info\` приходит как \`null\` даже после полученных значений — источник обнуляет его при отписке до вызова фабрики, проверено запуском. Опирайтесь на \`seen\` и \`meta\`. Те же поля есть у \`error.info\`, если \`with\` не задан. Старый оператор \`timeoutWith\` устарел — его заменяет именно эта опция.

### Перехват \`TimeoutError\` и связка с \`retry\`

\`timeout\` без \`with\` роняет поток целиком, поэтому ошибку перехватывают через \`catchError\` и проверку \`instanceof TimeoutError\`:

\`\`\`ts
import { defer, of, delay, timeout, retry } from 'rxjs';

let n = 0;
defer(() => {
  n++;
  console.log('попытка', n);
  return of('ответ ' + n).pipe(delay(n < 3 ? 500 : 100)); // первые две попытки «висят»
}).pipe(
  timeout(300),   // своя секундомерка на КАЖДУЮ попытку
  retry(2),
).subscribe(console.log);
// 0ms   попытка 1
// 300ms попытка 2
// 600ms попытка 3
// 700ms ответ 3
\`\`\`

Порядок важен: \`timeout\` **перед** \`retry\` ограничивает каждую попытку отдельно. Поставьте \`timeout\` **после** \`retry\` — и он станет ограничением на всю серию попыток целиком.

Реалистичный сервис:

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private http = inject(HttpClient);

  load(id: string) {
    return this.http.get<Report>(\`/api/reports/\${id}\`).pipe(
      timeout({ first: 10_000, meta: { url: \`/api/reports/\${id}\` } }),
      retry({ count: 2, delay: 1000 }),
      catchError((e) =>
        e instanceof TimeoutError
          ? throwError(() => new Error('Сервер отчётов не отвечает'))
          : throwError(() => e),
      ),
    );
  }
}
\`\`\`

В Angular 21 у самого \`HttpClient\` есть опция \`timeout\` в миллисекундах (\`http.get(url, { timeout: 10_000 })\`): запрос обрывается, а наружу приходит \`HttpErrorResponse\`. RxJS-\`timeout\` при этом остаётся универсальным: работает с любым потоком и умеет \`with\`, \`first\`/\`each\`.

### Общий дедлайн на весь поток: \`takeUntil(timer(...))\`

\`each\` перезаводится на каждом значении, поэтому медленный, но «капающий» поток он не остановит никогда. Не поможет и \`first\` — он ограничивает только первое значение. Для срока на **весь** поток нужен \`takeUntil\` — оператор, который обрывает поток по сигналу:

\`\`\`ts
import { interval, timer, takeUntil, switchMap, throwError, timeout } from 'rxjs';

// значения каждые 200 мс — each: 300 не сработает никогда
interval(200).pipe(timeout({ each: 300 }));

// тихо завершить через 700 мс
interval(200).pipe(takeUntil(timer(700))).subscribe({ next: console.log, complete: () => console.log('complete') });
// 0, 1, 2, затем complete на 700 мс

// или завершить ошибкой
interval(200).pipe(
  takeUntil(timer(700).pipe(switchMap(() => throwError(() => new Error('дедлайн 700 мс'))))),
).subscribe({ next: console.log, error: (e) => console.log(e.message) });
// 0, 1, 2, затем «дедлайн 700 мс»
\`\`\`

Ошибка сигнального потока в \`takeUntil\` проходит наружу как ошибка результата. А вот \`race(source$, timer(700)...)\` общим дедлайном **не** является: \`race\` выбирает того, кто выдал значение первым, и если источник успел раньше таймера, таймер просто отбрасывается — проверено, поток спокойно идёт дальше 700 мс.

### \`defaultIfEmpty\` — значение по умолчанию для пустого потока

\`\`\`ts
import { EMPTY, of, from, filter, defaultIfEmpty } from 'rxjs';

EMPTY.pipe(defaultIfEmpty('нет данных')).subscribe(console.log);
// нет данных

of('данные').pipe(defaultIfEmpty('нет данных')).subscribe(console.log);
// данные             ← значения были — оператор ничего не добавил

from([1, 2, 3]).pipe(filter((x) => x > 5), defaultIfEmpty(0)).subscribe(console.log);
// 0                  ← фильтр отсеял всё, поток завершился пустым

of([]).pipe(defaultIfEmpty(['заглушка'])).subscribe(console.log);
// []                 ← пустой МАССИВ — это одно значение, поток не пустой
\`\`\`

Последний пример — ловушка с собеседований: \`defaultIfEmpty\` реагирует на **отсутствие эмиссии**, а не на пустой массив внутри неё. \`HttpClient\` всегда выдаёт ровно одно значение (или ошибку), поэтому для «сервер вернул \`[]\`» нужна обычная проверка \`items.length === 0\`.

### \`throwIfEmpty\` — пустота как ошибка

\`\`\`ts
import { EMPTY, of, throwIfEmpty } from 'rxjs';

class NotFoundError extends Error {
  constructor(id: number) { super(\`Пользователь \${id} не найден\`); this.name = 'NotFoundError'; }
}

EMPTY.pipe(throwIfEmpty()).subscribe({ error: (e) => console.log(e.name, e.message) });
// EmptyError no elements in sequence     ← фабрика по умолчанию

EMPTY.pipe(throwIfEmpty(() => new NotFoundError(42))).subscribe({ error: (e) => console.log(e.message) });
// Пользователь 42 не найден

of({ id: 42 }).pipe(throwIfEmpty(() => new NotFoundError(42))).subscribe(console.log);
// { id: 42 }
\`\`\`

Ошибка создаётся фабрикой лениво — только если поток реально оказался пустым. Типичный случай: поиск в кэше или сторе, который при промахе отдаёт \`EMPTY\`, а вызывающему коду нужна понятная доменная ошибка вместо тишины.

### Встроенные проверки: \`first()\`, \`take(1)\`, \`find\`, \`firstValueFrom\`

Часть операторов уже содержит «throwIfEmpty» внутри — и это частый источник сюрпризов:

\`\`\`ts
import { EMPTY, from, first, take, find, last, firstValueFrom } from 'rxjs';

EMPTY.pipe(first()).subscribe({ error: (e) => console.log('first:', e.name) });
// first: EmptyError

EMPTY.pipe(take(1)).subscribe({ complete: () => console.log('take(1): complete') });
// take(1): complete           ← молча, без ошибки

from([1, 2, 3]).pipe(first((x) => x > 5, -1)).subscribe(console.log);
// -1                          ← значение по умолчанию вместо EmptyError

from([1, 2, 3]).pipe(find((x) => x > 5)).subscribe(console.log);
// undefined                   ← find НЕ пустой: он выдаёт undefined

EMPTY.pipe(last()).subscribe({ error: (e) => console.log('last:', e.name) });
// last: EmptyError

firstValueFrom(EMPTY).catch((e) => console.log('firstValueFrom:', e.name));
// firstValueFrom: EmptyError
firstValueFrom(EMPTY, { defaultValue: 'по умолчанию' }).then(console.log);
// по умолчанию
\`\`\`

Итог: \`first()\` — это «первое значение, а пустота — ошибка», \`take(1)\` — «первое значение, если есть». А связка \`find(...)\` + \`throwIfEmpty()\` не сработает: \`find\` при промахе выдаёт \`undefined\`, и поток не пустой. Сам Angular Router, кстати, берёт у резолвера \`first()\` и превращает \`EmptyError\` в отмену навигации («At least one route resolver didn't emit any value»).

### Бесконечный поток: почему \`defaultIfEmpty\` молчит

\`\`\`ts
import { interval, filter, defaultIfEmpty, takeUntil, timer } from 'rxjs';

interval(100).pipe(filter(() => false), defaultIfEmpty('никогда'));
// тишина навсегда: complete не наступает

interval(100).pipe(filter(() => false), takeUntil(timer(300)), defaultIfEmpty('пусто за 300 мс'))
  .subscribe(console.log);
// (через 300 мс) пусто за 300 мс
\`\`\`

Чтобы «пусто» стало осмысленным для бесконечного потока, сначала ограничьте его (\`takeUntil\`, \`take\`), а уже потом ставьте \`defaultIfEmpty\`. А зависание бесконечного потока ловит именно \`timeout({ each })\`.

### \`timeout\` в тестах

Внутри \`TestScheduler.run()\` RxJS автоматически переводит \`asyncScheduler\` в виртуальное время, поэтому \`timeout(5000)\` проверяется мгновенно:

\`\`\`ts
testScheduler.run(({ cold, expectObservable }) => {
  const slow$ = cold('- 10s a|');
  expectObservable(slow$.pipe(timeout(5000), catchError((e) => of(e.name))))
    .toBe('5s (n|)', { n: 'TimeoutError' });
}); // проходит за пару миллисекунд реального времени
\`\`\`

Вне \`run()\` (старый стиль marble-тестов или обычный тест) \`timeout\` идёт в реальном времени: тест ждёт настоящие секунды и может упасть по лимиту времени тест-раннера. Тогда планировщик передают явно опцией \`scheduler\`, а в Angular-тестах с zone.js можно использовать \`fakeAsync\` с \`tick()\`.

### Где это применяется на практике

- **HTTP-слой enterprise-приложения**: \`timeout\` + \`retry\` + \`catchError\` в сервисах или интерсепторе, чтобы ни один запрос не держал спиннер дольше 10–30 секунд.
- **Деградация в кэш**: дашборд с тяжёлыми агрегатами — \`timeout({ first: 3000, with: () => cachedReport$ })\`, пользователь сразу видит вчерашние цифры с пометкой «устарело».
- **WebSocket и стриминг цен**: \`timeout({ first: 10_000, each: 30_000 })\` — нет «пульса» 30 секунд, значит соединение умерло, переподключаемся.
- **Резолверы и guards**: \`first()\` или \`throwIfEmpty(() => new NotFoundError(id))\` и редирект на страницу 404.
- **Поиск и фильтры**: \`defaultIfEmpty\` подставляет «ничего не найдено» после цепочки \`filter\`, которая могла отсеять всё.
- **Начальное значение из стора**: \`select(...).pipe(take(1))\` вместо \`first()\`, если стор законно может быть пуст.

## Важные нюансы и подводные камни

- **\`first()\` против \`take(1)\`.** \`first()\` на пустом потоке кинет \`EmptyError\`, \`take(1)\` просто завершится молча. Разница всплывает ровно в проде — например, когда \`takeUntil(destroy$)\`, стоящий **перед** \`first()\`, оборвал поток до первого значения: \`first()\` получит пустой \`complete\` и бросит \`EmptyError\`.
- **\`defaultIfEmpty\`/\`throwIfEmpty\` на бесконечном потоке — мёртвый код.** Нет \`complete\` — нет срабатывания.
- **\`timeout\` без \`with\` роняет поток целиком** — ловите \`TimeoutError\` через \`catchError\`, иначе упадёт и подписка в компоненте.
- **\`each\` сбрасывается на каждом значении.** Медленный, но «капающий» поток такой таймаут не поймает. \`first\` и \`race\` с \`timer\` тоже ограничивают только первое значение; общий дедлайн — это \`takeUntil(timer(N))\`.
- **Без \`first\` правило \`each\` действует и на первое значение**, а при одном \`first\` после первого значения ограничений нет.
- **Позиция относительно \`retry\`.** До \`retry\` — секундомер на каждую попытку, после — на всю серию.
- **\`timeout\` отписывается от источника.** Для \`HttpClient\` это значит, что запрос реально обрывается, а не продолжает висеть в фоне.
- **\`info.lastValue\` в RxJS 7.8 всегда \`null\`** — для логов используйте \`seen\` и \`meta\`.
- **\`timeout({})\` без \`first\` и \`each\`** сразу бросает \`TypeError: No timeout provided.\`
- **Тесты.** Внутри \`TestScheduler.run()\` время виртуальное автоматически; вне \`run()\` передайте \`scheduler\` явно, иначе тест ждёт реальные секунды.
- **«Сервер долго молчит» и «сервер вернул пустой массив» — разные вещи.** Первое — \`timeout\`, второе — проверка длины; \`defaultIfEmpty\` про **отсутствие эмиссии**, а не про пустой массив внутри неё.
- **\`find\` + \`throwIfEmpty\` не работает**: \`find\` при промахе выдаёт \`undefined\`. Нужен \`first(predicate)\` или \`filter\` + \`throwIfEmpty\`.

**Плюсы:** явная обработка зависаний и пустоты вместо «тихих» багов, ленивые фабрики ошибок и запасных потоков, гибкие дедлайны (\`first\`, \`each\`, \`with\`, \`meta\`), хорошо сочетаются с \`retry\` и \`catchError\`.
**Минусы:** легко перепутать виды дедлайнов, \`defaultIfEmpty\`/\`throwIfEmpty\` бесполезны на бесконечных потоках, \`timeout\` без обработки роняет весь поток, а встроенный \`EmptyError\` у \`first()\` ловит неподготовленных.

## Как это спрашивают на собеседовании

**Главный вывод:** \`timeout\` — про **время** (нет значения за N мс — ошибка или запасной поток), \`defaultIfEmpty\` и \`throwIfEmpty\` — про **пустоту** (поток завершился без единого \`next\` — значение по умолчанию или ошибка). Последние два работают только на завершающихся потоках.

Типичные формулировки: «Как ограничить время ожидания HTTP-запроса?», «Что будет, если поток завершится без значений?», «Чем \`first()\` отличается от \`take(1)\`?», «Как показать кэш, если сервер не ответил за 3 секунды?».

Что могут спросить следом:

- *Чем \`first\` отличается от \`each\` в \`timeout\`?* — \`first\` — срок на первое значение, \`each\` — на паузу между соседними; число в \`timeout(N)\` означает \`each\`.
- *Как поставить срок на весь поток?* — \`takeUntil(timer(N))\`: \`each\` перезаводится на каждом значении, а \`race\` с \`timer\` решает только судьбу первого значения.
- *Сработает ли \`defaultIfEmpty\`, если \`HttpClient\` вернул \`[]\`?* — Нет, пустой массив — это одно значение; нужна проверка длины.
- *Где \`timeout\` относительно \`retry\`?* — До \`retry\` — на каждую попытку, после — на всю серию.
- *Как тестировать \`timeout\`?* — В \`TestScheduler.run()\`, где время виртуальное и пятисекундный таймаут проверяется мгновенно.

### Ответ на 1 минуту

> \`timeout\` бросает \`TimeoutError\`, если источник не выдал значение в отведённое время, и при этом отписывается от источника, так что HTTP-запрос реально обрывается. В объектной форме \`first\` — срок на первое значение, \`each\` — на паузу между соседними, а \`with\` вместо ошибки переключает на запасной поток, например на кэш. Важно, что \`each\` перезаводится на каждом значении, поэтому общий срок на весь поток делают через \`takeUntil(timer(N))\`. \`defaultIfEmpty\` выдаёт значение по умолчанию, если поток завершился без единого \`next\`, а \`throwIfEmpty\` в той же ситуации бросает ошибку из фабрики. Оба срабатывают только на \`complete\`, поэтому на бесконечном потоке бесполезны, и пустой массив от сервера — это не пустой поток. Ещё помню, что \`first()\` сам бросает \`EmptyError\` на пустом потоке, а \`take(1)\` просто завершается, и в тестах \`timeout\` проверяю в \`TestScheduler.run()\`.`,
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
    category: 'rxjs',
    level: 'Hard',
    tags: ['defer', 'iif', 'cold'],
    question: {
      ru: 'Зачем нужны defer и iif? Как defer гарантирует «свежесть» и cold-поведение на каждого подписчика?',
      en: 'What are defer and iif for? How does defer guarantee "freshness" and per-subscriber cold behavior?'
    },
    answer: {
      ru: `## В чём суть

\`defer\` — это **«не готовь заранее, готовь по заказу»**. Он не создаёт Observable сразу, а хранит **рецепт** — функцию-фабрику — и выполняет её заново **на каждую подписку**. Поэтому всё, что фабрика читает (время, токен, текущий фильтр), всегда свежее, а у каждого подписчика свой отдельный запуск. \`iif\` — это \`defer\` со встроенным \`if\`: в момент подписки выбирает один из двух источников.

Аналогия: \`of(Date.now())\` — бутерброд, приготовленный утром. Кто бы ни пришёл в течение дня, получит **один и тот же чёрствый** бутерброд. \`defer(() => of(Date.now()))\` — повар на раздаче: каждому гостю он готовит **свежий**, прямо сейчас. \`iif\` — тот же повар, который спрашивает «вам мясное или вегетарианское?» в момент заказа, а не утром.

**Какую проблему решает.** В JavaScript аргументы функции вычисляются сразу. \`http.get(url, { headers: { Authorization: token } })\` читает токен в момент **вызова**, а не подписки; \`from(fetch(url))\` отправляет запрос в момент **создания** промиса. В итоге \`retry\` повторяет запрос с протухшим токеном, \`repeat\` отдаёт один и тот же старый результат, а «ленивый» поток на самом деле уже что-то сделал до подписки. \`defer\` откладывает всё это до момента подписки и повторяет на каждую новую.

## Словарик терминов

- **Observable (поток)** — объект, который выдаёт значения со временем. Сам по себе ленив: работа начинается при подписке.
- **Подписка (subscribe)** — команда «начинай работать». Каждый вызов \`subscribe\` — отдельная подписка.
- **Фабрика (factory)** — функция, которая создаёт и возвращает объект. В \`defer(factory)\` она возвращает поток.
- **\`ObservableInput\`** — всё, что RxJS умеет превратить в поток: Observable, промис, массив, итерируемый объект. Фабрика \`defer\` может вернуть любое из этого.
- **Холодный поток (cold)** — поток, который запускает свою работу отдельно для каждого подписчика: два подписчика — два запроса.
- **Горячий источник (hot)** — источник, который работает независимо от подписок. Промис «горячий»: он стартует при создании и запоминает один результат навсегда.
- **Жадное (eager) и ленивое (lazy) вычисление** — жадное происходит сразу при написании выражения, ленивое — только когда результат реально нужен.
- **Переподписка (resubscribe)** — новая подписка на тот же поток, которую делают \`retry\` и \`repeat\` после ошибки или завершения.
- **Предикат (predicate)** — функция, возвращающая \`true\`/\`false\`. В \`iif\` это условие выбора источника.
- **\`switchMap\`** — оператор, который на каждое значение потока-условия переключается на новый внутренний поток, отписываясь от старого.
- **\`shareReplay\`** — оператор, который делает поток общим для всех подписчиков и раздаёт последнее значение опоздавшим.
- **Интерсептор (interceptor)** — функция в Angular \`HttpClient\`, которая перехватывает каждый запрос, например чтобы добавить заголовок авторизации.

## Как это работает под капотом

Реальный код \`defer\` в RxJS 7 — буквально три строки:

\`\`\`ts
function defer(factory) {
  return new Observable((subscriber) => {
    innerFrom(factory()).subscribe(subscriber); // фабрика вызывается ВНУТРИ подписки
  });
}

function iif(condition, trueResult, falseResult) {
  return defer(() => (condition() ? trueResult : falseResult));
}
\`\`\`

\`innerFrom\` — внутренняя функция, которая превращает любой \`ObservableInput\` (промис, массив) в Observable. По шагам:

1. Вы пишете \`defer(factory)\` — в этот момент **ничего не происходит**: фабрика лежит без дела, никакой код внутри неё не выполнен.
2. Кто-то подписался — функция подписки \`new Observable\` запускается, и только **сейчас** вызывается \`factory()\`.
3. Фабрика возвращает поток (или промис, или массив), и подписчик подписывается уже на этот свежесозданный поток.
4. Подписался второй — функция подписки запускается снова, фабрика вызывается **заново**, получается **отдельный** поток со своими данными. Так \`defer\` гарантирует cold-поведение на каждого подписчика.
5. Переподписка от \`retry\`/\`repeat\` — это тоже новая подписка, значит и новый вызов фабрики. Именно поэтому \`retry\` над \`defer\` реально **повторяет запрос с новыми параметрами**.
6. Если фабрика бросила исключение, оно случилось внутри функции подписки, а RxJS превращает такие исключения в уведомление \`error\`. Синхронного \`throw\` наружу не будет.
7. \`iif(cond, a$, b$)\` равен \`defer(() => cond() ? a$ : b$)\`: предикат вычисляется **один раз на подписку**. А вот сами \`a$\` и \`b$\` — обычные аргументы функции, они созданы заранее.

### Пример 1. Чёрствый и свежий бутерброд

\`\`\`ts
import { of, defer } from 'rxjs';

let clock = 1000;
const now = () => clock;

const stale$ = of(now());               // now() вызван СЕЙЧАС
const fresh$ = defer(() => of(now()));  // now() будет вызван при подписке

stale$.subscribe((v) => console.log('stale A', v));
fresh$.subscribe((v) => console.log('fresh A', v));
clock = 5000;
stale$.subscribe((v) => console.log('stale B', v));
fresh$.subscribe((v) => console.log('fresh B', v));
// stale A 1000
// fresh A 1000
// stale B 1000   ← значение вычислено один раз, при создании
// fresh B 5000   ← фабрика вызвана заново для второго подписчика
\`\`\`

\`of(now())\` — это сначала вызов \`now()\`, а потом \`of\` с готовым числом: аргумент вычисляется жадно. \`defer\` прячет вычисление внутрь функции, которую RxJS вызовет позже.

### Пример 2. Ленивость и ошибки фабрики

\`\`\`ts
const lazy$ = defer(() => { console.log('фабрика вызвана'); return of(42); });
console.log('поток создан');
lazy$.subscribe((v) => console.log('значение', v));
lazy$.subscribe((v) => console.log('значение', v));
// поток создан          ← пока нет подписки, фабрика молчит
// фабрика вызвана
// значение 42
// фабрика вызвана       ← второй подписчик — второй вызов
// значение 42

const bad$ = defer(() => { throw new Error('нет токена'); });
bad$.subscribe({ next: console.log, error: (e) => console.log('error:', e.message) });
console.log('код продолжает работать');
// error: нет токена
// код продолжает работать
\`\`\`

Ленивость полезна для дорогих или опасных побочных эффектов: чтение \`localStorage\`, доступ к \`window\`, динамический \`import()\`. Пока никто не подписался — ничего не выполнено. А ошибка фабрики приходит как обычный \`error\`, который ловит \`catchError\`. Это удобно, но при отладке об этом забывают: стек ошибки указывает внутрь подписки, а не на место создания потока.

### Пример 3. Свежий токен на каждый \`retry\`

Сравним «без \`defer\`» и «с \`defer\`». \`fakeHttpGet\` ведёт себя как холодный \`HttpClient\`: каждая подписка — новый запрос, но токен попадает в запрос в момент **вызова** функции. Сервер принимает только третий токен:

\`\`\`ts
import { defer, of, throwError, retry } from 'rxjs';

let version = 0;
const tokenStore = { getCurrent: () => 'token-v' + ++version }; // каждый вызов — «обновлённый» токен
const fakeHttpGet = (token: string) => defer(() => {
  console.log('запрос с', token);
  return token === 'token-v3' ? of('200 OK') : throwError(() => new Error('401'));
});

fakeHttpGet(tokenStore.getCurrent()).pipe(retry(2)).subscribe({
  next: (v) => console.log('без defer:', v),
  error: (e) => console.log('без defer: error', e.message),
});
// запрос с token-v1
// запрос с token-v1
// запрос с token-v1      ← запрос повторяется, но токен «замёрз»
// без defer: error 401

version = 0;
defer(() => fakeHttpGet(tokenStore.getCurrent())).pipe(retry(2)).subscribe({
  next: (v) => console.log('с defer:', v),
});
// запрос с token-v1
// запрос с token-v2
// запрос с token-v3      ← каждая попытка заново читает токен
// с defer: 200 OK
\`\`\`

Ровно это показывает пример кода к вопросу: \`defer(() => { const token = tokenStore.getCurrent(); return http.get(...) })\` плюс \`retry({ count: 2, delay: 1000 })\` — каждая повторная попытка заново читает токен. Без \`defer\` второй retry ушёл бы с уже протухшим.

Важная деталь Angular: \`HttpClient\` и так холодный, а его цепочка интерсепторов запускается заново на каждую подписку. Поэтому если токен добавляет **интерсептор**, \`retry\` тоже получит свежий токен. Проблема возникает, только когда заголовок или параметры вычисляются в месте вызова \`http.get(...)\`.

### Пример 4. Промис: горячий и одноразовый

\`\`\`ts
import { from, defer, retry } from 'rxjs';

let calls = 0;
const fakeFetch = () => {
  calls++;
  console.log('fetch стартовал, №' + calls);
  return calls < 3 ? Promise.reject(new Error('503')) : Promise.resolve('ok');
};

const p$ = from(fakeFetch());
console.log('from создан, подписок ещё нет');
p$.pipe(retry(2)).subscribe({ next: console.log, error: (e) => console.log('from: error', e.message) });
// fetch стартовал, №1          ← запрос ушёл ДО подписки
// from создан, подписок ещё нет
// from: error 503              ← retry дважды переподписался на тот же отклонённый промис

calls = 0;
const d$ = defer(() => fakeFetch());
console.log('defer создан, подписок ещё нет');
d$.pipe(retry(2)).subscribe((v) => console.log('defer:', v));
// defer создан, подписок ещё нет
// fetch стартовал, №1
// fetch стартовал, №2
// fetch стартовал, №3
// defer: ok
\`\`\`

Промис выполняется один раз и навсегда запоминает результат, поэтому \`retry\` над \`from(promise)\` бессмыслен. \`defer(() => fetch(...))\` создаёт **новый** промис на каждую подписку и тем самым делает промис по-настоящему холодным.

### \`iif\` — выбор источника в момент подписки

\`\`\`ts
import { iif, of, defer } from 'rxjs';

let loggedIn = false;
const user$ = iif(() => loggedIn, of('данные пользователя'), of('гость'));
user$.subscribe((v) => console.log('подписка 1:', v));
loggedIn = true;
user$.subscribe((v) => console.log('подписка 2:', v));
// подписка 1: гость
// подписка 2: данные пользователя   ← условие проверено заново для новой подписки

// Ловушка: аргументы iif создаются сразу
const load = (name: string) => { console.log('создаём', name); return of(name); };
iif(() => true, load('A'), load('B'));
// создаём A
// создаём B      ← оба вызваны ещё до подписки, хотя нужен только A

iif(() => true, defer(() => load('A')), defer(() => load('B'))).subscribe();
// создаём A      ← при подписке и только нужная ветка
\`\`\`

Если создание источника имеет побочный эффект (например, \`fakeFetch()\` или построение запроса с текущими параметрами), оборачивайте каждую ветку в \`defer\` — или сразу пишите \`defer(() => cond ? a() : b())\`, это короче и честнее. В RxJS 7 оба источника у \`iif\` обязательны; в RxJS 6 недостающий заменялся на \`EMPTY\`.

### \`iif\` не реактивен — для меняющегося условия нужен \`switchMap\`

\`\`\`ts
import { BehaviorSubject, iif, of, switchMap } from 'rxjs';

const isLoggedIn$ = new BehaviorSubject(false);

iif(() => isLoggedIn$.value, of('профиль'), of('гость'))
  .subscribe((v) => console.log('iif:', v));
isLoggedIn$.pipe(switchMap((ok) => (ok ? of('профиль') : of('гость'))))
  .subscribe((v) => console.log('switchMap:', v));

isLoggedIn$.next(true);
// iif: гость
// switchMap: гость
// switchMap: профиль   ← switchMap пересобрал источник при смене условия, iif — нет
\`\`\`

\`iif\` проверяет условие **один раз** — когда на него подписались — и дальше не следит за ним. Если выбор должен меняться со временем (вход и выход пользователя, переключение режима), источником должно быть само условие, а выбор — внутри \`switchMap\`.

### Ловушка с \`async\`-фабрикой

\`\`\`ts
defer(async () => of('данные')).subscribe((v) => console.log(v));
// Observable {...}   ← промис вернул ПОТОК как значение, он не «развернулся»

defer(async () => {
  await new Promise((r) => setTimeout(r, 10)); // какой-то асинхронный шаг
  return 'данные';
}).subscribe(console.log);
// данные             ← async-фабрика, возвращающая обычное значение, — нормально
\`\`\`

\`async\`-функция всегда возвращает промис, а \`defer\` разворачивает только один уровень: промис с Observable внутри даст сам Observable в качестве значения. Если нужен асинхронный шаг перед запросом, пишите \`defer(() => from(getToken())).pipe(switchMap((t) => http.get(url, ...)))\`.

### \`defer\` + \`shareReplay\` — свежесть против единственности

\`defer\` даёт каждому подписчику свой запуск. Если подписчиков несколько, а запрос должен быть один (конфиг приложения, справочник валют), сверху ставят \`shareReplay\`:

\`\`\`ts
let requests = 0;
const config$ = defer(() => { requests++; return http.get('/api/config'); }).pipe(shareReplay(1));

config$.subscribe(); config$.subscribe(); config$.subscribe();
// requests === 1   ← без shareReplay было бы 3
\`\`\`

\`defer\` отвечает за **ленивость и свежесть** (запрос сформирован в момент первой подписки), \`shareReplay\` — за **единственность** (дальше все получают один результат).

### Где это применяется на практике

- **HTTP-слой с авторизацией**: \`defer\` вокруг запроса, если токен, язык или tenant-id читаются в месте вызова; а лучше — интерсептор, который и так выполняется на каждую попытку.
- **Обёртка над промис-API** (Firebase, IndexedDB, сторонние SDK): \`defer(() => sdk.load())\` делает вызов ленивым, отменяемым по смыслу и совместимым с \`retry\`/\`repeat\`.
- **Polling** через \`defer(() => api.load(this.filter())).pipe(repeat({ delay }))\` — каждый цикл с актуальным фильтром.
- **Ленивая загрузка тяжёлых библиотек**: \`defer(() => import('xlsx'))\` — модуль экспорта в Excel грузится только когда пользователь нажал «Экспорт».
- **Init-эффекты в NgRx**: классический приём \`defer(() => of(loadSettings()))\` откладывает действие до подписки эффекта (сегодня чаще используют \`ofType(ROOT_EFFECTS_INIT)\`).
- **Кэш или сеть**: \`defer(() => cache.has(id) ? of(cache.get(id)) : http.get(...))\` — проверка кэша в момент подписки, а не при создании потока.

## Важные нюансы и подводные камни

- **\`iif\` не реактивен.** Условие проверяется один раз при подписке. Нужна реактивность — \`condition$.pipe(switchMap(...))\`.
- **Оба аргумента \`iif\` уже созданы.** Если само создание источника имеет побочный эффект — оборачивайте каждый в \`defer\`.
- **\`from(promise)\` нельзя перезапустить.** Промис выполняется один раз; \`retry\` будет просто отдавать тот же результат. Спасает только \`defer\`.
- **\`from(fetch(...))\` стартует до подписки.** Запрос уходит при создании промиса, даже если на поток так никто и не подпишется.
- **\`defer\` = новый поток на каждого подписчика.** Если подписчиков несколько, а запрос должен быть один — сверху нужен \`shareReplay\` (или \`share\`).
- **Ошибка внутри фабрики** превращается в \`error\` потока, а не в синхронное исключение, — это плюс, но об этом забывают при отладке.
- **\`async\`-фабрика, возвращающая Observable,** выдаст сам Observable как значение.
- **Зачем \`defer\`, если \`HttpClient\` и так холодный?** Холодный сам запрос, но **аргументы** (токен, дата, текущий фильтр) вычисляются на этапе вызова \`http.get(...)\` — \`defer\` откладывает и их. Интерсепторы при этом и так выполняются на каждую подписку.
- **\`defer\` не делает горячий источник холодным, если фабрика возвращает один и тот же объект.** \`defer(() => this.sharedSubject)\` по-прежнему отдаёт общий горячий поток — «свежесть» появляется, только если фабрика **создаёт** новое.

**Плюсы:** ленивость и свежесть параметров, корректная работа \`retry\`/\`repeat\`, превращение промисов в холодные потоки, ошибки фабрики попадают в обычный канал \`error\`, минимальный и понятный API.
**Минусы:** на каждого подписчика свой запуск (нужен \`share\`/\`shareReplay\` для дедупликации), \`iif\` вводит в заблуждение своей «нереактивностью» и жадными аргументами, ошибки фабрики сложнее отлаживать по стеку.

## Как это спрашивают на собеседовании

**Главный вывод:** \`defer\` вызывает фабрику в момент **каждой** подписки, поэтому параметры свежие, побочные эффекты ленивые, а \`retry\`/\`repeat\` действительно перезапускают работу. \`iif\` — это \`defer\` с условием, которое проверяется один раз на подписку и не следит за изменениями.

Типичные формулировки: «Зачем нужен \`defer\`?», «Почему \`retry\` над \`from(fetch())\` не работает?», «Как сделать промис холодным?», «Чем \`iif\` отличается от \`switchMap\` по условию?».

Что могут спросить следом:

- *Зачем \`defer\`, если \`HttpClient\` холодный?* — Запрос холодный, но токен, дата и фильтр в аргументах вычислены при вызове; \`defer\` откладывает и их.
- *Как сделать запрос один на всех подписчиков?* — \`defer(...).pipe(shareReplay(1))\`: ленивость от \`defer\`, единственность от \`shareReplay\`.
- *Почему \`iif\` не обновляется при логине?* — Условие проверено при подписке; для реактивного выбора — \`switchMap\` от потока-условия.
- *Что будет, если фабрика бросит исключение?* — Подписчик получит \`error\`, синхронного \`throw\` не будет.
- *Чем \`defer(() => of(x))\` отличается от \`of(x)\`?* — \`of(x)\` вычисляет \`x\` сразу и навсегда, \`defer\` — при каждой подписке.

### Ответ на 1 минуту

> \`defer\` откладывает создание Observable до подписки: он хранит фабрику и вызывает её заново для каждого подписчика и каждой переподписки, поэтому поток становится по-настоящему холодным. Это даёт свежесть — токен, текущее время или фильтр читаются в момент подписки; ленивость — побочный эффект вроде чтения \`localStorage\` не выполнится, пока никто не подписался; и корректный \`retry\` или \`repeat\`, ведь каждая попытка заново вызывает фабрику. Особенно это важно для промисов: \`from(fetch())\` стартует при создании и запоминает результат, а \`defer(() => fetch())\` создаёт новый промис на каждую подписку. \`iif\` — сахар над \`defer\`, выбирающий один из двух источников по условию. Нюансы: условие \`iif\` проверяется один раз и не реактивно, для этого нужен \`switchMap\`, а оба его аргумента создаются сразу. Если же подписчиков много, а запрос нужен один, поверх \`defer\` ставлю \`shareReplay\`.`,
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
    category: 'rxjs',
    level: 'Medium',
    tags: ['race', 'fromevent', 'fromfetch'],
    question: {
      ru: 'Что делает race? Как работают fromEvent и fromFetch и в чём их отличия от ручных оберток?',
      en: 'What does race do? How do fromEvent and fromFetch work and how do they differ from manual wrappers?'
    },
    answer: {
      ru: `## В чём суть

Все три — про **аккуратную работу с ресурсами**. \`race\` устраивает забег между потоками: кто первым выдал значение, тот и победил, а остальных сразу отключают. \`fromEvent\` превращает событие DOM (или Node.js \`EventEmitter\`) в поток: при подписке вешает слушатель, при отписке сам его снимает. \`fromFetch\` превращает \`fetch\` в ленивый поток, который при отписке **по-настоящему отменяет** HTTP-запрос через \`AbortController\`.

Аналогия для \`race\`: забег на 100 метров. Кто первым пересёк линию (эмитнул), тот победил, остальных **снимают с дистанции** — они больше не бегут и ресурсы не жгут. Судья смотрит только на первый шаг за линию, а не на то, кто красивее финишировал. Аналогия для \`fromEvent\` и \`fromFetch\` — гостиничный номер с карточкой-ключом: вставили карточку (подписались) — включился свет и кондиционер, вынули (отписались) — всё выключилось само, забыть невозможно.

**Какую проблему решает.** Ручная работа с событиями и запросами постоянно течёт: \`addEventListener\` без парного \`removeEventListener\` оставляет слушатель на \`window\` после ухода со страницы, \`fetch\` без \`AbortController\` продолжает качать устаревший ответ поиска, а «взять самый быстрый из нескольких источников» вручную требует флагов и ручных отмен. Эти три функции упаковывают «включить» и «выключить» в одну подписку, и отписка гарантированно освобождает всё.

## Словарик терминов

- **Observable (поток)** — объект, который выдаёт значения со временем. Работа начинается при подписке и заканчивается при отписке.
- **Teardown (функция очистки)** — функция, которую поток запускает при отписке: снять слушатель, отменить запрос, остановить таймер.
- **Эмиссия (emit)** — момент, когда поток выдаёт значение через \`next\`.
- **\`addEventListener\` / \`removeEventListener\`** — методы DOM для подписки на событие и отписки. Чтобы снять слушатель, нужно передать ту же функцию и тот же флаг \`capture\`.
- **Опции слушателя \`capture\` / \`passive\`** — \`capture\` ловит событие на фазе погружения (сверху вниз по DOM), \`passive\` обещает браузеру не вызывать \`preventDefault()\`, что ускоряет прокрутку.
- **Горячий источник (hot)** — источник, который работает независимо от подписчиков. Клики происходят, даже если их никто не слушает; пропущенное до подписки — потеряно.
- **\`fetch\` и \`Response\`** — встроенный в браузер API для HTTP-запросов. Промис \`fetch\` разрешается объектом \`Response\`, как только пришли заголовки; тело читают отдельно через \`res.json()\` или \`res.text()\`.
- **\`AbortController\`** — встроенный объект для отмены: его \`signal\` передают в \`fetch\`, а вызов \`abort()\` обрывает запрос.
- **\`res.ok\`** — флаг \`Response\`: \`true\` для статусов 200–299. \`fetch\` не считает 404 или 500 ошибкой.
- **\`switchMap\`** — оператор, который на каждое новое значение переключается на новый внутренний поток и отписывается от предыдущего.
- **\`debounceTime\`** — оператор, который ждёт паузу в событиях и пропускает только последнее значение после неё.
- **\`takeUntilDestroyed\`** — оператор Angular, который отписывается при уничтожении компонента или сервиса.

## Как это работает под капотом

Все три — тонкие обёртки над \`new Observable\` с правильным teardown. Упрощённо:

\`\`\`ts
function race(...sources) {
  return new Observable((subscriber) => {
    let subs = [];
    sources.forEach((src, i) => {
      if (!subs) return;                       // победитель уже определился синхронно
      subs.push(src.subscribe({
        next: (v) => {
          if (subs) {                          // первая эмиссия — объявляем победителя
            subs.forEach((s, j) => j !== i && s.unsubscribe());
            subs = null;
          }
          subscriber.next(v);
        },
        error: (e) => subscriber.error(e),     // ошибка ЛЮБОГО участника — сразу наружу
        complete: () => subscriber.complete(), // и завершение тоже
      }));
    });
  });
}

function fromEvent(target, eventName, options) {
  return new Observable((subscriber) => {
    const handler = (e) => subscriber.next(e);
    target.addEventListener(eventName, handler, options);
    return () => target.removeEventListener(eventName, handler, options); // те же опции
  });
}

function fromFetch(url, { selector, ...init } = {}) {
  return new Observable((subscriber) => {
    const controller = new AbortController();
    let abortable = true;
    fetch(url, { ...init, signal: controller.signal })
      .then((res) => {
        if (selector) {
          from(selector(res)).subscribe({                 // например, res.json()
            next: (v) => subscriber.next(v),
            complete: () => { abortable = false; subscriber.complete(); },
            error: (e) => { abortable = false; subscriber.error(e); },
          });
        } else {
          abortable = false;                             // заголовки пришли — отменять уже нечего
          subscriber.next(res);
          subscriber.complete();
        }
      })
      .catch((e) => { abortable = false; subscriber.error(e); });
    return () => { if (abortable) controller.abort(); };
  });
}
\`\`\`

Что происходит по шагам:

1. \`race(a$, b$, c$)\` при подписке подписывается **на все** источники по очереди.
2. Первый, кто выдал \`next\`, становится победителем: от **всех остальных** \`race\` немедленно отписывается (их teardown отменяет запросы и таймеры), и только потом отдаёт значение наружу.
3. Дальше \`race\` прозрачно транслирует победителя: его значения, его \`error\`, его \`complete\`.
4. Важная деталь: до определения победителя \`error\` или \`complete\` **любого** участника сразу уходит наружу и заканчивает весь забег. А если кто-то выдал значение синхронно прямо при подписке, оставшиеся источники даже не подписываются.
5. \`fromEvent(target, name, options)\` при подписке вызывает \`addEventListener\`, а в teardown — \`removeEventListener\` **с теми же опциями**. Каждая подписка — свой отдельный слушатель.
6. \`fromFetch(url, init)\` при подписке вызывает \`fetch\` со своим \`AbortController\`. Отписка, пока ответ не пришёл, вызывает \`abort()\`, и запрос реально обрывается в сети.
7. Без \`selector\` поток выдаёт \`Response\`, как только пришли заголовки, и сразу завершается — после этого отменять уже нечего. С \`selector\` (например, \`res => res.json()\`) отменяемым остаётся и чтение тела.

### \`race\` — забег потоков

\`\`\`ts
import { race, defer, timer, map, tap } from 'rxjs';

const runner = (name: string, ms: number) =>
  defer(() => { console.log('старт', name); return timer(ms).pipe(map(() => name)); })
    .pipe(tap({ unsubscribe: () => console.log('снят с дистанции:', name) }));

race(runner('медленный сервер', 300), runner('быстрый сервер', 100), runner('средний сервер', 200))
  .subscribe({ next: (v) => console.log('победитель:', v), complete: () => console.log('complete') });
// старт медленный сервер
// старт быстрый сервер
// старт средний сервер
// снят с дистанции: медленный сервер
// снят с дистанции: средний сервер
// победитель: быстрый сервер
// complete
\`\`\`

Все трое стартовали — значит, все запросы реально ушли; экономится только дальнейшая работа проигравших. Проигравших снимают **до** того, как значение победителя дойдёт до подписчика.

### \`race\`: ошибка, пустое завершение и синхронный победитель

\`\`\`ts
import { race, timer, map, switchMap, throwError, EMPTY, of, defer } from 'rxjs';

// Ошибка до победителя убивает весь забег
race(
  timer(100).pipe(map(() => 'данные')),
  timer(50).pipe(switchMap(() => throwError(() => new Error('503')))),
).subscribe({ next: console.log, error: (e) => console.log('error', e.message) });
// error 503            ← «данные» могли бы прийти через 50 мс, но забег уже окончен

// Пустое завершение до победителя — тоже конец
race(EMPTY, timer(100).pipe(map(() => 'сеть'))).subscribe({
  next: console.log,
  complete: () => console.log('complete'),
});
// complete             ← ни одного значения!

// Синхронный победитель: остальные даже не подписываются
race(of('кэш'), defer(() => { console.log('сетевой запрос отправлен'); return timer(100); }))
  .subscribe(console.log);
// кэш                  ← «сетевой запрос отправлен» не напечатано
\`\`\`

Отсюда ловушка популярного шаблона \`race(cache$, network$)\`: если при промахе кэш возвращает \`EMPTY\`, забег завершится пустым и сетевые данные не придут никогда. И наоборот, источник, который выдал значение первым, побеждает, даже если через миг упадёт с ошибкой — эта ошибка уйдёт подписчику.

### \`race\` как таймаут на первое значение и оператор \`raceWith\`

\`\`\`ts
import { race, raceWith, timer, map, switchMap, throwError } from 'rxjs';

race(
  timer(300).pipe(map(() => 'ответ')),
  timer(100).pipe(switchMap(() => throwError(() => new Error('timeout 100ms')))),
).subscribe({ next: console.log, error: (e) => console.log('error', e.message) });
// error timeout 100ms

timer(200).pipe(
  map(() => 'данные'),
  raceWith(timer(100).pipe(map(() => 'заглушка: сервер думает'))),
).subscribe(console.log);
// заглушка: сервер думает
\`\`\`

\`raceWith\` — операторная форма для \`pipe\`: «текущий поток против перечисленных». Оператор \`race\` внутри \`pipe\` в RxJS 7 устарел в его пользу. Помните, что такой «таймаут» ограничивает только **первое** значение: если основной поток успел первым, таймер выбывает, и дальше поток может молчать сколько угодно.

### \`race\` против \`merge\` и \`combineLatest\`

\`\`\`ts
const a$ = interval(100).pipe(take(2), map((i) => 'a' + i));
const b$ = interval(150).pipe(take(2), map((i) => 'b' + i));

merge(a$, b$)           // a0, b0, a1, b1          — слушает всех до конца
combineLatest([a$, b$]) // a0+b0, a1+b0, a1+b1     — ждёт по значению от каждого, потом комбинирует
race(a$, b$)            // a0, a1                  — оставляет ровно одного
\`\`\`

### \`fromEvent\` — событие как поток

Посмотрим, что именно он делает с целью события. В этом примере \`button\` и \`window\` — подставные \`EventTarget\`, которые логируют вызовы своих методов:

\`\`\`ts
import { fromEvent, map } from 'rxjs';

const clicks$ = fromEvent(button, 'click');
console.log('поток создан');               // слушателя ещё нет — поток ленивый

const sub = clicks$.pipe(map((e) => e.type)).subscribe((v) => console.log('событие:', v));
button.dispatchEvent(new Event('click'));
sub.unsubscribe();
// поток создан
// button.addEventListener('click', fn, undefined)
// событие: click
// button.removeEventListener('click', fn, undefined)

fromEvent(window, 'scroll', { passive: true, capture: true }).subscribe().unsubscribe();
// window.addEventListener('scroll', fn, {"passive":true,"capture":true})
// window.removeEventListener('scroll', fn, {"passive":true,"capture":true})
\`\`\`

Ещё три свойства, проверенные запуском: два подписчика — **два** отдельных слушателя; клик до подписки потерян навсегда (событие горячее); \`fromEvent(listOfElements, 'click')\` для массива или \`NodeList\` вешает слушатель на каждый элемент и снимает со всех. С Node.js \`EventEmitter\` он работает через \`addListener\`/\`removeListener\`. Тип события уточняют дженериком: \`fromEvent<KeyboardEvent>(input, 'keydown')\`.

### Ручная обёртка против \`fromEvent\`

\`\`\`ts
const manual$ = new Observable((subscriber) => {
  const handler = (e) => { console.log('handler вызван'); subscriber.next(e); };
  win.addEventListener('scroll', handler, { capture: true });
  return () => win.removeEventListener('scroll', handler); // capture забыли!
});

const sub = manual$.subscribe();
sub.unsubscribe();
win.dispatchEvent(new Event('scroll'));
// handler вызван       ← слушатель остался висеть: утечка
\`\`\`

\`removeEventListener\` снимает слушатель, только если совпадают функция **и** флаг \`capture\`. В ручной обёртке это легко забыть — и утечка тихая: подписчик уже закрыт, значения никуда не идут, но обработчик и всё, что он держит в замыкании, живут вечно. \`fromEvent\` передаёт одни и те же опции в обе стороны, поддерживает массивы и \`NodeList\`, \`EventEmitter\` и jQuery-подобные объекты.

### \`fromEvent\` в Angular

\`\`\`ts
@Component({ /* ... */ })
export class GridComponent {
  private zone = inject(NgZone);
  width = signal(window.innerWidth);

  constructor() {
    this.zone.runOutsideAngular(() =>
      fromEvent(window, 'resize').pipe(
        debounceTime(100),
        map(() => window.innerWidth),
        takeUntilDestroyed(),                 // снимет слушатель при уничтожении компонента
      ).subscribe((w) => this.width.set(w)),
    );
  }
}
\`\`\`

Слушатель на \`window\` или \`document\` переживает компонент, если не отписаться, — поэтому \`takeUntilDestroyed()\` или \`async\` pipe обязательны. В приложениях с zone.js частые события (\`scroll\`, \`mousemove\`, \`resize\`) подписывают внутри \`runOutsideAngular\`, чтобы каждое событие не запускало проверку изменений; запись в сигнал сама уведомит Angular. Для простых случаев у Angular есть свои средства — \`host: { '(window:resize)': 'onResize()' }\` или \`Renderer2.listen\`, — а \`fromEvent\` выигрывает, когда нужны операторы.

### \`fromFetch\` — отменяемый \`fetch\`

Проверено на локальном сервере, который логирует запросы:

\`\`\`ts
import { fromFetch } from 'rxjs/fetch';
import { switchMap, throwError } from 'rxjs';

const req$ = fromFetch('/api/slow');
// запроса ещё нет — поток ленивый

const sub = req$.subscribe((res) => console.log(res.status));
setTimeout(() => sub.unsubscribe(), 100);
// [сервер] получил /api/slow
// [сервер] клиент оборвал соединение     ← abort() сработал

fromFetch('/api/missing').subscribe({
  next: (res) => console.log('Response', res.status, 'ok =', res.ok),
  complete: () => console.log('complete'),
});
// Response 404 ok = false      ← это НЕ ошибка потока
// complete

fromFetch('/api/missing').pipe(
  switchMap((res) => (res.ok ? res.json() : throwError(() => new Error('HTTP ' + res.status)))),
).subscribe({ error: (e) => console.log('error', e.message) });
// error HTTP 404
\`\`\`

Ошибкой потока \`fromFetch\` становится только сетевой сбой (сервер недоступен, CORS, обрыв) — это \`TypeError\`, текст которого зависит от браузера. Статусы 4xx/5xx — успешный \`Response\`, проверять \`res.ok\` нужно самим.

### \`selector\`: отмена чтения тела

\`\`\`ts
// Без selector: тело читается после того, как fromFetch уже завершился
const s1 = fromFetch('/api/big-report').pipe(switchMap((res) => res.json())).subscribe();
// отписка во время скачивания тела: соединение НЕ оборвано, отчёт докачивается впустую

// С selector: чтение тела — часть отменяемой работы
const s2 = fromFetch('/api/big-report', { selector: (res) => res.json() }).subscribe();
// отписка во время скачивания тела: [сервер] клиент оборвал соединение
\`\`\`

Без \`selector\` \`fromFetch\` выдаёт \`Response\` и завершается, как только пришли **заголовки** — после этого его teardown уже не вызывает \`abort()\`. Для больших ответов это важно: используйте \`selector\`, тогда отмена покрывает и скачивание тела.

### \`from(fetch())\` против \`fromFetch\`

\`\`\`ts
const sub = from(fetch('/api/slow')).subscribe();   // запрос ушёл ещё до subscribe
sub.unsubscribe();
// сервер спокойно доотвечает: промис нельзя отозвать, соединение не оборвано
\`\`\`

\`from(fetch(...))\` — горячий и неотменяемый: запрос стартует при создании промиса, отписка лишь перестаёт слушать результат, а \`retry\` будет переподписываться на тот же промис. \`fromFetch\` ленивый (запрос на каждую подписку) и отменяемый.

### Живой поиск: \`switchMap\` + \`fromFetch\`

\`\`\`ts
query$.pipe(
  debounceTime(300),
  switchMap((q) => fromFetch(\`/api/search?q=\${encodeURIComponent(q)}\`, { selector: (res) => res.json() })),
).subscribe((r) => console.log('результат для', r.q));
// ввод: «a», через 50 мс «an», через 400 мс «ang», ещё через 400 мс «angular»;
// сервер отвечает за 1 секунду
// [сервер] получил ?q=an                        ← «a» поглотил debounceTime
// [сервер] клиент оборвал соединение: ?q=an     ← switchMap отписался, abort()
// [сервер] получил ?q=ang
// [сервер] получил ?q=angular
// [сервер] клиент оборвал соединение: ?q=ang
// результат для angular
\`\`\`

\`switchMap\` отписывается от устаревшего запроса, а \`fromFetch\` превращает эту отписку в настоящий \`abort()\`. С \`from(fetch(...))\` старые запросы продолжали бы занимать сеть. В Angular ту же отмену даёт \`HttpClient\`: при отписке он сам обрывает XHR или \`fetch\` (с \`withFetch()\`), поэтому \`fromFetch\` нужен в основном вне \`HttpClient\` — в библиотеках, веб-воркерах, микрофронтендах без DI.

### Где это применяется на практике

- **Самый быстрый из источников**: \`race\` между репликами API или CDN-зеркалами — но только если ни один участник не завершается пустым и не падает мгновенно.
- **Заглушка «сервер думает»** через \`raceWith\`, если основной ответ не пришёл за 200–300 мс.
- **Отмена по действию пользователя**: \`race(save$, cancelClick$.pipe(map(() => 'cancelled')))\` — что случится раньше.
- **Глобальные события в больших приложениях**: \`resize\` для пересчёта колонок data grid, \`scroll\` для бесконечной ленты, \`keydown\` для горячих клавиш — \`fromEvent\` + \`debounceTime\`/\`throttleTime\` + \`takeUntilDestroyed\`.
- **Drag-and-drop**: \`mousedown\` → \`switchMap\` на \`mousemove\` до \`mouseup\`, все слушатели снимаются автоматически.
- **Живой поиск и автодополнение** без \`HttpClient\`: \`switchMap\` + \`fromFetch\` с \`selector\`.

## Важные нюансы и подводные камни

- **\`race\` судит по первой эмиссии, а не по успеху.** Источник, который выдал значение первым и тут же упал, победил — и его ошибка уйдёт наружу.
- **\`error\` или \`complete\` любого участника до победы заканчивает весь \`race\`.** \`race(EMPTY, network$)\` завершится пустым, мгновенная ошибка одного источника убьёт забег.
- **Побочные эффекты запускаются у всех, кто успел подписаться.** Все запросы уходят; экономится только обработка ответов. Исключение — синхронный победитель: тогда следующие источники вообще не подписываются.
- **\`race\` как таймаут ограничивает только первое значение.**
- **\`fromEvent\` без отписки — утечка.** Слушатель на \`window\`/\`document\` переживёт компонент; нужен \`takeUntilDestroyed()\` или \`async\` pipe.
- **Каждая подписка на \`fromEvent\` — отдельный слушатель.** Десять подписчиков на \`scroll\` — десять обработчиков; если нужен один, добавьте \`share()\`.
- **События до подписки потеряны** — \`fromEvent\` горячий по природе события и ничего не буферизует.
- **\`fromFetch\` не бросает на HTTP-ошибке.** \`404\` и \`500\` — это успешный \`Response\`; статус надо проверять руками через \`res.ok\`.
- **Без \`selector\` отмена покрывает только ожидание заголовков.** Чтение тела в следующем \`switchMap\` уже не отменяется.
- **\`from(fetch(...))\` неотменяем и «горячий».** Запрос стартует в момент создания промиса, а не подписки; для отмены и повторов — \`fromFetch\` или \`defer\`.
- **\`fromFetch\` импортируется из \`rxjs/fetch\`**, а не из \`rxjs\`, и требует глобального \`fetch\` (в Node.js — с 18-й версии).

**Плюсы:** гарантированная очистка ресурсов при отписке, настоящая отмена HTTP-запросов, симметричные опции слушателей, композиция с любыми операторами (\`debounceTime\`, \`switchMap\`, \`takeUntilDestroyed\`).
**Минусы:** у \`race\` неочевидная семантика ошибок и пустых завершений, каждый подписчик \`fromEvent\` — отдельный слушатель, \`fromFetch\` не превращает HTTP-статусы в ошибки и без \`selector\` не отменяет чтение тела, а в Angular его почти всегда заменяет \`HttpClient\`.

## Как это спрашивают на собеседовании

**Главный вывод:** \`race\` подписывается на всех и оставляет того, кто первым выдал значение, отписываясь от остальных; \`fromEvent\` и \`fromFetch\` — обёртки, где подписка включает ресурс (слушатель, запрос), а отписка гарантированно его освобождает, чего ручные обёртки и \`from(fetch())\` не гарантируют.

Типичные формулировки: «Что делает \`race\`?», «Чем \`fromFetch\` лучше \`from(fetch())\`?», «Как не допустить утечки слушателя на \`window\`?», «Чем \`race\` отличается от \`merge\`?».

Что могут спросить следом:

- *Что будет, если один из участников \`race\` упадёт до первой эмиссии?* — Упадёт весь \`race\`; так же пустое завершение участника завершит его без значений.
- *Чем \`race\` отличается от \`merge\` и \`combineLatest\`?* — \`merge\` слушает всех до конца, \`combineLatest\` ждёт по значению от каждого, \`race\` оставляет ровно одного.
- *Почему \`fromFetch\` не падает на 404?* — Так устроен \`fetch\`: ошибка — только сетевой сбой, статус проверяют через \`res.ok\`.
- *Отменит ли \`fromFetch\` скачивание тела?* — Только с опцией \`selector\`; без неё отмена работает до прихода заголовков.
- *Зачем \`fromFetch\` в Angular?* — Почти не нужен: \`HttpClient\` и так отменяет запрос при отписке.

### Ответ на 1 минуту

> \`race\` подписывается на все переданные источники и оставляет тот, который первым выдал значение, а от остальных сразу отписывается — так берут самый быстрый ответ или делают таймаут на первое значение гонкой с \`timer\`. Нюанс: решает первая эмиссия, а не успех, а ошибка или пустое завершение любого участника до победы заканчивает весь \`race\`. \`fromEvent\` при подписке вызывает \`addEventListener\`, а при отписке \`removeEventListener\` с теми же опциями, поэтому, в отличие от ручной обёртки, не забудет \`capture\` и не оставит слушатель на \`window\`; каждая подписка — отдельный слушатель. \`fromFetch\` из \`rxjs/fetch\` лениво вызывает \`fetch\` с \`AbortController\`, и отписка реально обрывает запрос, чего не умеет \`from(fetch())\`. Он не считает 404 ошибкой, поэтому проверяю \`res.ok\`, а тело читаю через \`selector\`, чтобы отмена покрывала и его.`,
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
    category: 'rxjs',
    level: 'Hard',
    tags: ['subscription', 'teardown', 'composition'],
    question: {
      ru: 'Как устроена композиция Subscription (add/remove/unsubscribe)? Какие есть gotchas?',
      en: 'How does Subscription composition (add/remove/unsubscribe) work? What are the gotchas?'
    },
    answer: {
      ru: `## В чём суть

\`Subscription\` — это не просто «то, что вернул \`subscribe\`». Это **контейнер**, в который можно складывать другие подписки и любые функции уборки. Закрыли контейнер — закрылось **всё, что внутри**, рекурсивно, по всему дереву. Методов всего три: \`add\` — положить, \`remove\` — вынуть, не выключая, \`unsubscribe\` — закрыть всё.

Аналогия: сетевой удлинитель. В него воткнуты лампа, ноутбук и ещё один удлинитель с чайником. Выдернули **один** штепсель из розетки — обесточилось всё дерево разом. \`add\` — воткнуть прибор, \`remove\` — вынуть его из удлинителя (прибор при этом **не выключается**, просто больше не зависит от этого удлинителя), \`unsubscribe\` — выдернуть удлинитель из розетки. А воткнуть прибор в уже выдернутый удлинитель — значит, что он тут же окажется обесточен.

**Какую проблему решает.** В компоненте или директиве легко набирается десяток подписок: поток цен, изменения фильтров, ресайз окна, таймер автосохранения, плюс не-RxJS ресурсы вроде графика или WebSocket. Хранить каждую в отдельном поле и не забыть закрыть все в \`ngOnDestroy\` — верный путь к утечкам памяти и «призрачным» обработчикам, которые продолжают работать после ухода со страницы. Контейнер \`Subscription\` даёт **одну точку** закрытия. И на этом же механизме RxJS построил всю цепочку операторов: одна отписка снизу гасит всё до самого источника.

## Словарик терминов

- **\`Subscription\` (подписка)** — объект с методом \`unsubscribe()\`, который освобождает ресурсы. Одновременно — контейнер для других подписок и функций уборки.
- **\`Subscriber\` (подписчик)** — внутренний объект RxJS, который получает \`next\`/\`error\`/\`complete\` и при этом сам является \`Subscription\` (наследует от него).
- **Teardown / финализатор (finalizer)** — функция очистки: остановить таймер, снять слушатель, закрыть соединение. Запускается при закрытии подписки.
- **\`TeardownLogic\`** — тип того, что принимает \`add\`: другая \`Subscription\`, функция или любой объект с методом \`unsubscribe\`.
- **\`closed\`** — флаг подписки: \`true\` после закрытия. Закрытая подписка никогда не «открывается» обратно.
- **Идемпотентность** — свойство операции давать тот же результат при повторе. Второй \`unsubscribe()\` ничего не делает.
- **\`UnsubscriptionError\`** — ошибка RxJS, в которую собираются все исключения, брошенные финализаторами при одном \`unsubscribe()\`. Поле \`errors\` — массив исходных ошибок.
- **\`takeUntil\` / \`takeUntilDestroyed\`** — операторы, которые **завершают** поток по сигналу (по уничтожению компонента в случае Angular).
- **\`DestroyRef\`** — сервис Angular: \`onDestroy(callback)\` регистрирует колбэк на уничтожение компонента, сервиса или инжектора и возвращает функцию для отмены регистрации.
- **\`async\` pipe и \`toSignal\`** — способы Angular подписаться на поток из шаблона или в сигнал, при которых отписка происходит автоматически.

## Как это работает под капотом

Упрощённая, но близкая к исходникам RxJS 7 реализация:

\`\`\`ts
class Subscription {
  closed = false;
  private finalizers = [];
  private parents = [];
  constructor(private initialTeardown?: () => void) {}

  add(teardown) {
    if (!teardown || teardown === this) return;              // себя в себя не кладём
    if (this.closed) { exec(teardown); return; }              // контейнер закрыт — выполнить сразу
    if (teardown instanceof Subscription) {
      if (teardown.closed || teardown.parents.includes(this)) return; // закрытую и повторную — игнор
      teardown.parents.push(this);                           // ребёнок помнит родителя
    }
    this.finalizers.push(teardown);
  }

  remove(teardown) {
    arrRemove(this.finalizers, teardown);                    // только вынуть из списка
    if (teardown instanceof Subscription) arrRemove(teardown.parents, this);
  }

  unsubscribe() {
    if (this.closed) return;                                 // идемпотентность
    this.closed = true;
    this.parents.forEach((p) => p.remove(this));             // выписаться из всех родителей
    const errors = [];
    for (const f of [this.initialTeardown, ...this.finalizers]) {
      try { if (f) exec(f); } catch (e) { errors.push(e); } // ошибки копим, не прерываемся
    }
    this.finalizers = [];
    if (errors.length) throw new UnsubscriptionError(errors);
  }
}
const exec = (f) => (typeof f === 'function' ? f() : f.unsubscribe());
\`\`\`

Что происходит по шагам:

1. \`sub.add(child)\` кладёт в контейнер дочернюю подписку, функцию очистки или объект с \`unsubscribe\` — принимается всё это. Ребёнок-подписка запоминает, кто его родитель.
2. \`sub.unsubscribe()\` ставит \`closed = true\`, выписывает себя из родителей, затем вызывает функцию из конструктора (\`initialTeardown\`) и всех детей **в порядке добавления**. Ребёнок-подписка в свою очередь закрывает своих детей — так рекурсивно гаснет всё дерево.
3. Если какой-то финализатор бросил исключение, остальные **всё равно** выполняются, а в конце все ошибки собираются в одну \`UnsubscriptionError\`.
4. \`sub.remove(child)\` только **вынимает ребёнка из списка**; его teardown **не вызывается** — ресурс продолжает работать, и закрывать его теперь ваша задача.
5. Повторный \`unsubscribe()\` ничего не делает благодаря флагу \`closed\`. А \`add\` в уже закрытый контейнер **немедленно** выполняет добавляемое — подписка умирает сразу.
6. Когда ребёнок закрывается сам (поток завершился или его отписали отдельно), он выписывается из родителя. Поэтому долгоживущий контейнер не копит мёртвые подписки.
7. На этом же механизме работает \`pipe\`: каждый оператор создаёт свой внутренний \`Subscriber\` и добавляет его в подписку следующего по цепочке. Отписка в самом низу каскадом поднимается до источника — это и есть механизм распространения teardown.

### Пример 1. Контейнер: одна отписка на всё

\`\`\`ts
import { Observable, Subscription } from 'rxjs';

const stream = (name: string) => new Observable(() => () => console.log('teardown:', name));

const page = new Subscription(() => console.log('initialTeardown'));
page.add(stream('поток 1').subscribe());
page.add(stream('поток 2').subscribe());
page.add(() => console.log('функция уборки'));
page.add({ unsubscribe: () => console.log('объект с unsubscribe') });
console.log('add вернул:', page.add(() => {}));

page.unsubscribe();
console.log('closed:', page.closed);
page.unsubscribe();                     // второй вызов — тишина
// add вернул: undefined
// initialTeardown
// teardown: поток 1
// teardown: поток 2
// функция уборки
// объект с unsubscribe
// closed: true
\`\`\`

Финализаторы выполняются в порядке добавления, а функция из конструктора — первой. Обратите внимание: в RxJS 7 \`add\` возвращает \`undefined\` (в RxJS 6 он возвращал подписку, и старый код вида \`const child = parent.add(...)\` после миграции сломается).

### Пример 2. Дерево подписок

\`\`\`ts
const root = new Subscription();
const branch = new Subscription();
branch.add(() => console.log('лист в ветке'));
root.add(branch);
root.add(() => console.log('лист в корне'));

root.unsubscribe();
console.log('branch.closed:', branch.closed);
// лист в ветке
// лист в корне
// branch.closed: true
\`\`\`

Контейнер внутри контейнера — обычное дело: у страницы свой контейнер, у каждого виджета свой, а виджеты лежат в контейнере страницы. Закрыли страницу — закрылись все виджеты.

### Пример 3. \`remove\` — вынуть, но не выключить

\`\`\`ts
const box = new Subscription();
const child = new Observable(() => () => console.log('teardown ребёнка')).subscribe();

box.add(child);
box.remove(child);
box.unsubscribe();
console.log('child.closed:', child.closed);
child.unsubscribe();
// child.closed: false      ← box закрыт, а ребёнок жив
// teardown ребёнка          ← только после явного unsubscribe
\`\`\`

\`remove\` нужен, чтобы «переселить» подписку в другой контейнер с другим сроком жизни или чтобы закрыть её отдельно и не держать ссылку в списке. Забыли закрыть вынутую подписку — получили утечку.

### Пример 4. \`add\` в закрытый контейнер

\`\`\`ts
import { interval, Subscription } from 'rxjs';

const closedBox = new Subscription();
closedBox.unsubscribe();

const late = interval(1000).subscribe((v) => console.log('никогда', v));
closedBox.add(late);
console.log('late.closed:', late.closed);
closedBox.add(() => console.log('функция выполнена сразу'));
// late.closed: true                 ← подписка умерла в момент add
// функция выполнена сразу
\`\`\`

Классический баг: подписка создаётся асинхронно (после ответа сервера, в \`setTimeout\`), когда компонент уже уничтожен и контейнер закрыт, — и разработчик удивляется, что ничего не приходит. Зато утечки нет: закрытый контейнер гарантирует, что ничего «опоздавшего» не выживет. \`takeUntilDestroyed\` в Angular ведёт себя так же: если \`DestroyRef\` уже уничтожен, поток завершается сразу.

### Пример 5. Дети сами выписываются из родителя

\`\`\`ts
const parent = new Subscription();
const kids = [new Subscription(), new Subscription(), new Subscription()];
kids.forEach((k) => parent.add(k));
// в parent 3 финализатора

kids[0].unsubscribe();
kids[1].unsubscribe();
// в parent остался 1 финализатор
\`\`\`

Это защищает от утечки в долгоживущих контейнерах: если сервис годами складывает в один контейнер подписки на короткие запросы, завершившиеся запросы не копятся в памяти. Подписку можно положить и в **два** контейнера: закрытие любого из них закроет её, и она тут же выпишется из второго.

Есть и асимметрия при повторном добавлении: одна и та же подписка, добавленная дважды, хранится один раз, а одна и та же **функция** — дважды и будет вызвана дважды. \`remove(fn)\` при этом удалит только первое вхождение.

### Пример 6. Ошибки в teardown: \`UnsubscriptionError\`

\`\`\`ts
import { Subscription, UnsubscriptionError } from 'rxjs';

const box = new Subscription();
box.add(() => { throw new Error('A сломался'); });
box.add(() => console.log('B всё равно выполнен'));
box.add(() => { throw new Error('C сломался'); });

try {
  box.unsubscribe();
} catch (e) {
  console.log(e instanceof UnsubscriptionError);
  console.log(e.errors.map((x) => x.message));
}
// B всё равно выполнен
// true
// [ 'A сломался', 'C сломался' ]
\`\`\`

Одна сломанная очистка не мешает остальным: RxJS доводит обход до конца и только потом бросает сводную ошибку. Сообщение у неё вида «2 errors occurred during unsubscription», а детали лежат в массиве \`errors\` — читайте его, а не только \`message\`.

### Пример 7. Как на этом построен \`pipe\`

\`\`\`ts
import { Observable, map, filter, finalize, Subscriber } from 'rxjs';

const source$ = new Observable((s) => {
  console.log('источник запущен');
  const id = setInterval(() => s.next(1), 1000);
  return () => { clearInterval(id); console.log('источник: таймер остановлен'); };
});

const sub = source$.pipe(
  map((x) => x * 2),
  finalize(() => console.log('finalize после map')),
  filter(Boolean),
  finalize(() => console.log('finalize после filter')),
).subscribe();

console.log(sub instanceof Subscriber);
sub.unsubscribe();
// источник запущен
// true                           ← вам вернули Subscriber, он же Subscription
// источник: таймер остановлен    ← отписка снизу дошла до самого источника
// finalize после map
// finalize после filter
\`\`\`

\`subscribe\` возвращает последний \`Subscriber\` цепочки. Каждый оператор при подписке создаёт свой \`Subscriber\` и кладёт его в подписку следующего по цепочке, а teardown источника кладётся в самый верхний. Получается то же дерево, что в примере 2, и один \`unsubscribe()\` гасит его целиком. Так же устроены операторы высшего порядка: внутренняя подписка \`switchMap\` лежит в его подписке, поэтому отписка от результата закрывает и внутренний запрос.

### Пример 8. \`unsubscribe\` против \`takeUntil\`: тишина против \`complete\`

\`\`\`ts
import { Subject, takeUntil, toArray } from 'rxjs';

const destroy$ = new Subject<void>();
const a$ = new Subject<number>();
a$.pipe(takeUntil(destroy$), toArray()).subscribe({
  next: (arr) => console.log('takeUntil: toArray выдал', arr),
  complete: () => console.log('takeUntil: complete'),
});

const b$ = new Subject<number>();
const sub = b$.pipe(toArray()).subscribe({
  next: (arr) => console.log('unsubscribe: toArray выдал', arr),
  complete: () => console.log('unsubscribe: complete'),
});

a$.next(1); a$.next(2); b$.next(1); b$.next(2);
destroy$.next();
sub.unsubscribe();
// takeUntil: toArray выдал [ 1, 2 ]
// takeUntil: complete
//                       ← после unsubscribe — ни next, ни complete
\`\`\`

\`unsubscribe\` молча обрывает подписку: операторы, которые ждут завершения (\`toArray\`, \`last\`, \`reduce\`), ничего не выдадут, колбэк \`complete\` не вызовется. \`takeUntil\` и \`takeUntilDestroyed\` **завершают** поток — всё, что стоит после них в \`pipe\`, получит честный \`complete\`.

### Пример 9. Angular: от контейнера к \`takeUntilDestroyed\`

\`\`\`ts
// Классический подход: один контейнер на компонент
export class LegacyDashboardComponent implements OnInit, OnDestroy {
  private subs = new Subscription();

  ngOnInit() {
    this.subs.add(this.prices.stream$.subscribe((p) => this.updateGrid(p)));
    this.subs.add(this.filters.changes$.subscribe((f) => this.reload(f)));
    this.subs.add(() => this.chart.destroy());     // и не-RxJS ресурс тоже
  }

  ngOnDestroy() {
    this.subs.unsubscribe();                       // одним вызовом всё дерево
  }
}

// Современный подход: время жизни берётся из DestroyRef
export class DashboardComponent {
  private prices = inject(PricesService);
  private filters = inject(FiltersService);

  constructor() {
    this.prices.stream$.pipe(takeUntilDestroyed()).subscribe((p) => this.updateGrid(p));
    this.filters.changes$.pipe(takeUntilDestroyed()).subscribe((f) => this.reload(f));
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }
}
\`\`\`

Ещё лучше — не подписываться вручную вовсе: \`async\` pipe в шаблоне или \`toSignal()\` сами отпишутся при уничтожении. Но контейнер \`Subscription\` остаётся удобным там, где подписки создаются императивно и в большом количестве: директивы, динамически создаваемые виджеты, сервисы с ручным \`start()\`/\`stop()\`.

### Где это применяется на практике

- **Компоненты и директивы со множеством ручных подписок** — один контейнер вместо массива полей и цикла в \`ngOnDestroy\`.
- **Виджеты дашборда**: у каждого виджета свой контейнер, все они лежат в контейнере страницы; закрыли виджет — закрыли только его ветку.
- **Сервисы со \`start()\`/\`stop()\`**: WebSocket-подключение, polling, запись видео. На каждый \`start()\` — **новый** контейнер, потому что закрытый оживить нельзя.
- **Обёртки над не-RxJS ресурсами**: в \`add\` кладут \`() => chart.destroy()\`, \`() => socket.close()\`, \`() => observer.disconnect()\` для \`ResizeObserver\` — и они закрываются вместе с подписками.
- **Собственные операторы и \`new Observable\`**: возвращённый teardown и \`subscriber.add(...)\` — тот же механизм, благодаря которому отписка гасит внутренние ресурсы.

## Важные нюансы и подводные камни

- **\`add\` в уже закрытый контейнер** мгновенно убивает добавляемую подписку. Классический баг: подписались после \`ngOnDestroy\` и удивляетесь, что ничего не приходит.
- **\`remove\` не отписывает.** Он только вынимает из списка — если забыть закрыть ресурс, получите утечку.
- **Ошибки в teardown не теряются**, а склеиваются в \`UnsubscriptionError\`; читайте поле \`errors\` с массивом ошибок, а не только сообщение. Остальные финализаторы при этом выполняются.
- **Переиспользовать закрытый \`Subscription\` нельзя** — он навсегда \`closed\`. Для нового цикла (\`stop()\` → \`start()\`) создавайте новый контейнер; у компонента это обычно поле \`private subs = new Subscription()\`, которое и так новое у каждого экземпляра.
- **\`add\` в RxJS 7 возвращает \`undefined\`**, а не подписку, как в RxJS 6, — цепочки \`parent.add(a).add(b)\` больше не работают.
- **Функцию можно добавить дважды — и она выполнится дважды**; подписка же добавляется один раз.
- **\`unsubscribe\` не равен \`complete\`.** Подписчик не получает \`complete\`, \`toArray\`/\`last\`/\`reduce\` молчат, а \`finalize\` срабатывает.
- **Ручные подписки — источник утечек.** Если можно, вообще не подписывайтесь: \`async\` pipe, \`toSignal()\` или \`takeUntilDestroyed()\` делают это за вас.
- **Чем \`takeUntilDestroyed\` лучше \`Subscription.add\`?** Он **завершает поток** — подписчик получает \`complete\`, срабатывают операторы вроде \`last()\`/\`toArray()\`, если стоят после него, — а \`unsubscribe\` просто молча обрывает подписку. И его не нужно помнить в \`ngOnDestroy\`.

**Плюсы:** одна точка очистки для любого числа подписок и не-RxJS ресурсов, рекурсивное закрытие дерева, защита от «опоздавших» подписок, сбор всех ошибок очистки без потерь, автоматическая выписка закрытых детей из родителей.
**Минусы:** ручное управление легко забыть, \`remove\` выглядит как отписка, но ею не является, закрытый контейнер нельзя переиспользовать, а \`unsubscribe\` не даёт \`complete\`, в отличие от \`takeUntil\`.

## Как это спрашивают на собеседовании

**Главный вывод:** \`Subscription\` — это дерево ресурсов: \`add\` вешает ребёнка, \`unsubscribe\` рекурсивно закрывает всё и идемпотентен, \`remove\` лишь открепляет без закрытия, а \`add\` в закрытый контейнер выполняет teardown сразу. На этом же дереве построена цепочка операторов.

Типичные формулировки: «Как отписаться от нескольких подписок разом?», «Что делает \`Subscription.add\`?», «Чем \`remove\` отличается от \`unsubscribe\`?», «Как отписка распространяется по цепочке операторов?».

Что могут спросить следом:

- *Что будет, если добавить подписку в уже закрытый контейнер?* — Она будет закрыта немедленно, прямо внутри \`add\`.
- *Что будет, если один финализатор бросит исключение?* — Остальные выполнятся, а в конце бросится \`UnsubscriptionError\` с массивом \`errors\`.
- *Почему долгоживущий контейнер не течёт?* — Закрывшаяся дочерняя подписка сама выписывается из родителей.
- *Чем \`takeUntilDestroyed\` лучше контейнера?* — Он завершает поток (\`complete\` доходит до подписчика) и не требует кода в \`ngOnDestroy\`.
- *Что возвращает \`subscribe\`?* — \`Subscriber\` — последний в цепочке, который одновременно является \`Subscription\` и корнем дерева.

### Ответ на 1 минуту

> \`Subscription\` — это не только результат \`subscribe\`, но и контейнер, по сути дерево ресурсов. \`add\` кладёт в него дочернюю подписку, функцию очистки или любой объект с \`unsubscribe\`, а сам \`unsubscribe\` идемпотентен: ставит флаг \`closed\` и рекурсивно вызывает всех детей в порядке добавления. \`remove\` только открепляет ребёнка, не вызывая его teardown, так что закрывать его нужно самому. На этом же механизме построен \`pipe\`: каждый оператор добавляет свой подписчик в подписку следующего, и одна отписка внизу каскадом доходит до источника. Нюансы: \`add\` в уже закрытый контейнер сразу выполняет teardown, ошибки финализаторов собираются в \`UnsubscriptionError\`, не мешая остальным, а закрытые дети сами выписываются из родителя. И \`unsubscribe\` не даёт \`complete\`, поэтому в Angular я предпочитаю \`takeUntilDestroyed\`, \`async\` pipe или \`toSignal\`.`,
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
    category: 'rxjs',
    level: 'Expert',
    tags: ['connectable', 'connect', 'multicasting'],
    question: {
      ru: 'Как работают connectable, connect() и оператор connect? Чем они заменили publish/multicast?',
      en: 'How do connectable, connect(), and the connect operator work? What did they replace from publish/multicast?'
    },
    answer: {
      ru: `## В чём суть

Задача одна: **разветвить** источник на несколько веток обработки, но выполнить его **ровно один раз**. Для этого источник «мультикастят» — пропускают через \`Subject\`, который раздаёт одно и то же всем подписчикам. В RxJS 7 для этого три инструмента: \`share\`/\`shareReplay\` — мультикаст «на автомате», \`connectable(source)\` — мультикаст с ручным тумблером \`.connect()\`, и оператор \`connect(selector)\` — локальное ветвление внутри одного \`pipe\`. Они заменили старое семейство \`multicast\`, \`publish\` (с вариантами \`publishReplay\`, \`publishBehavior\`, \`publishLast\`), \`refCount\` и класс \`ConnectableObservable\`, которое в RxJS 7 помечено deprecated и будет удалено в v8.

Аналогия: радиостанция. Холодный Observable — это как если бы для каждого слушателя ведущий заново приходил в студию и повторял эфир. Мультикаст — ведущий говорит **один раз в микрофон**, а слушателей сколько угодно. \`share\` — эфир включается сам, когда пришёл первый слушатель, и выключается, когда ушёл последний. \`connectable\` добавляет **тумблер эфира**: слушатели уже настроили приёмники, но звук пойдёт только когда вы нажмёте \`connect()\`, и выключить его тоже нужно вручную. Оператор \`connect\` — это запись в студии: сначала рассаживают всех музыкантов, потом нажимают «запись».

**Какую проблему решает.** Наивный \`combineLatest([a$.pipe(...), a$.pipe(...)])\` подпишется на \`a$\` **дважды** и отправит два одинаковых HTTP-запроса; три \`async\` pipe на одном потоке в шаблоне — три запроса. А «очевидное» \`share()\` на синхронном источнике тоже не спасает: первая ветка успевает получить всё и завершить источник ещё до подписки второй. Эти инструменты дают контроль над тем, **когда** источник стартует и **кто** успел подписаться к этому моменту.

## Словарик терминов

- **Холодный поток (cold)** — запускает свою работу отдельно на каждую подписку: две подписки — два запроса.
- **Горячий поток (hot)** — работа идёт одна на всех, подписчики лишь «подключаются к эфиру».
- **Мультикаст (multicasting)** — превращение холодного источника в горячий: одна подписка на источник, значения раздаются многим через \`Subject\`.
- **\`Subject\`** — объект, который одновременно Observable и подписчик: в него можно «лить» значения, и он раздаёт их всем своим подписчикам. Опоздавшие пропущенное не получат.
- **\`ReplaySubject(n)\` / \`BehaviorSubject\` / \`AsyncSubject\`** — разновидности \`Subject\`: повторяет опоздавшим последние \`n\` значений; хранит текущее значение и имеет начальное; отдаёт только последнее значение после завершения.
- **\`connector\`** — фабрика, которая создаёт \`Subject\` для мультикаста: \`() => new ReplaySubject(1)\`. Опция есть у \`share\`, \`connectable\` и \`connect\`.
- **Подключение (connection)** — подписка \`Subject\` на источник. В \`connectable\` её создаёт вызов \`.connect()\` и возвращает как \`Subscription\`.
- **RefCount (счётчик ссылок)** — подсчёт активных подписчиков: первый пришёл — источник запущен, последний ушёл — остановлен. Так работает \`share\`.
- **Сброс (reset)** — замена \`Subject\` на новый после отключения, ошибки или завершения, чтобы следующий запуск начался «с чистого листа».
- **Fan-out (ветвление)** — один поток расходится на несколько веток с разной обработкой.
- **Селектор (selector)** — функция, которой оператор \`connect\` передаёт общий поток; она строит ветки и возвращает итоговый поток.
- **\`merge\`** — объединяет несколько потоков в один, пропуская значения всех по мере поступления.

## Как это работает под капотом

Реальные реализации в RxJS 7 маленькие. Упрощённо:

\`\`\`ts
function connectable(source, { connector = () => new Subject(), resetOnDisconnect = true } = {}) {
  let subject = connector();
  let connection = null;
  const result = new Observable((subscriber) => subject.subscribe(subscriber)); // подписка = на Subject
  result.connect = () => {
    if (!connection || connection.closed) {               // повторный connect() вернёт то же подключение
      connection = defer(() => source).subscribe(subject); // источник льёт в Subject
      if (resetOnDisconnect) connection.add(() => (subject = connector()));
    }
    return connection;
  };
  return result;
}

function connect(selector, { connector = () => new Subject() } = {}) {
  return (source) => new Observable((subscriber) => {
    const subject = connector();
    from(selector(subject.asObservable())).subscribe(subscriber); // 1. сначала подписываем все ветки
    subscriber.add(source.subscribe(subject));                     // 2. и только потом запускаем источник
  });
}
\`\`\`

Что происходит по шагам:

1. **\`connectable(source)\`** создаёт \`Subject\` через \`connector\`, но на источник **не подписывается**. Подписчики \`connectable\` на самом деле подписываются на этот \`Subject\` и ждут.
2. Вызов **\`.connect()\`** подписывает \`Subject\` на источник. Источник запускается **один раз**, а \`Subject\` раздаёт каждое значение всем, кто уже подписан.
3. \`.connect()\` возвращает \`Subscription\` подключения. Источник работает, **пока вы её не закроете** или пока он сам не завершится, — количество подписчиков на это не влияет.
4. При \`resetOnDisconnect: true\` (по умолчанию) после закрытия подключения \`Subject\` заменяется новым. Подписчики старого \`Subject\` к нему уже не перейдут.
5. **Оператор \`connect(selector)\`** при подписке создаёт \`Subject\`, передаёт его селектору и **сначала** подписывается на то, что вернул селектор, — то есть все ветки уже на месте. Только **потом** он подписывает \`Subject\` на источник. Поэтому даже синхронный источник отработает один раз и попадёт во все ветки.
6. Наружу уходит **только** то, что вернул селектор. Ветки, которые не вошли в результат (например, в \`merge\`), не подписаны и не работают.
7. **\`share()\`** устроен как \`connectable\`, у которого \`.connect()\` вызывается автоматически при первом подписчике и закрывается при уходе последнего (refCount).

### Проблема: каждая ветка — отдельный запуск

\`\`\`ts
import { defer, of, combineLatest, map } from 'rxjs';

let runs = 0;
const order$ = defer(() => {
  runs++;
  console.log('запрос заказа №' + runs);
  return of({ total: 100, items: 3 });
});

combineLatest([order$.pipe(map((o) => o.total)), order$.pipe(map((o) => o.items))])
  .subscribe(([total, items]) => console.log('итого', total, 'позиций', items));
// запрос заказа №1
// запрос заказа №2      ← каждая ветка подписалась на холодный источник отдельно
// итого 100 позиций 3
\`\`\`

### \`share()\` и синхронный источник: почему не спасает

\`\`\`ts
import { share, merge, map } from 'rxjs';

const shared$ = order$.pipe(share());
merge(
  shared$.pipe(map((o) => 'total=' + o.total)),
  shared$.pipe(map((o) => 'items=' + o.items)),
).subscribe(console.log);
// запрос заказа №1
// total=100
// запрос заказа №2      ← источник успел завершиться до второй ветки, share перезапустил его
// items=3
\`\`\`

\`merge\` подписывается на ветки по очереди. Первая ветка запустила \`share\`, синхронный \`of\` тут же выдал значение и завершился, \`share\` по умолчанию сбросился — и вторая ветка запустила источник заново. С асинхронным HTTP-запросом этот код случайно сработал бы, а с кэшем, \`of\` или \`BehaviorSubject\` — нет. Это и есть дыра, которую закрывает оператор \`connect\`.

### Оператор \`connect\` — локальное ветвление

\`\`\`ts
import { connect, merge, map } from 'rxjs';

order$.pipe(
  connect((shared$) => merge(
    shared$.pipe(map((o) => 'total=' + o.total)),
    shared$.pipe(map((o) => 'items=' + o.items)),
  )),
).subscribe(console.log);
// запрос заказа №1
// total=100
// items=3              ← один запуск, обе ветки получили значение
\`\`\`

Типичный реальный случай — разобрать поток сообщений WebSocket по типам в одной подписке:

\`\`\`ts
messages$.pipe(
  connect((m$) => merge(
    m$.pipe(filter((m) => m.type === 'price'), map((m) => 'цена: ' + m.v)),
    m$.pipe(filter((m) => m.type === 'news'), map((m) => 'новость: ' + m.v)),
  )),
).subscribe(console.log);
// для сообщений price 101, news IPO, price 102:
// цена: 101
// новость: IPO
// цена: 102
\`\`\`

У оператора тоже есть опция \`connector\`: \`connect(selector, { connector: () => new ReplaySubject(1) })\`, если ветки подписываются не сразу и им нужно последнее значение.

### \`connect\`: наружу уходит только результат селектора

\`\`\`ts
order$.pipe(
  connect((s$) => {
    const a$ = s$.pipe(tap(() => console.log('ветка A работает')));
    const b$ = s$.pipe(tap(() => console.log('ветка B работает')));
    return a$;                       // b$ создан, но не возвращён
  }),
).subscribe();
// запрос заказа №1
// ветка A работает                 ← B молчит: на неё никто не подписался
\`\`\`

Ветки нужно собрать в результат — через \`merge\`, \`combineLatest\`, \`zip\` или любой другой комбинирующий оператор.

### \`connect\` на практике: первое значение сразу, остальные с debounce

\`\`\`ts
import { Subject, connect, merge, take, skip, debounceTime } from 'rxjs';

const input$ = new Subject<string>();
input$.pipe(
  connect((s$) => merge(
    s$.pipe(take(1)),                          // первый ввод — мгновенно
    s$.pipe(skip(1), debounceTime(300)),       // остальные — после паузы 300 мс
  )),
).subscribe((v) => console.log('поиск:', v));

// ввод: «a» в 0 мс, «an» в 100 мс, «ang» в 200 мс, «angu» в 700 мс
// 0ms    поиск: a
// 500ms  поиск: ang      ← «an» поглотил debounce
// 1000ms поиск: angu
\`\`\`

Без \`connect\` пришлось бы дважды подписываться на один и тот же источник или заводить вспомогательный \`Subject\` вручную.

### \`connectable\` — мультикаст с ручным тумблером

\`\`\`ts
import { defer, of, connectable } from 'rxjs';

let runs = 0;
const source$ = defer(() => { runs++; console.log('источник запущен, №' + runs); return of(1, 2, 3); });

const shared = connectable(source$);
shared.subscribe((v) => console.log('A', v));
shared.subscribe((v) => console.log('B', v));
console.log('подписчики готовы, источник молчит');

const conn = shared.connect();
// подписчики готовы, источник молчит
// источник запущен, №1
// A 1
// B 1
// A 2
// B 2
// A 3
// B 3

shared.subscribe({ next: (v) => console.log('C', v), complete: () => console.log('C complete') });
// (тишина: C опоздал — источник уже завершился, Subject пересоздан, C ждёт вечно)
\`\`\`

\`connectable\` нужен, когда момент старта контролирует **код**, а не первый подписчик: сначала подписать всех потребителей, потом запустить. Обратите внимание на опоздавшего C — он не получил даже \`complete\`.

### \`connect()\` возвращает подключение: остановка только вручную

\`\`\`ts
const ticks = connectable(interval(100).pipe(finalize(() => console.log('источник остановлен'))));
const sub = ticks.subscribe((v) => console.log('тик', v));
const c1 = ticks.connect();
const c2 = ticks.connect();
console.log(c1 === c2);              // true — повторный connect() вернул то же подключение

setTimeout(() => sub.unsubscribe(), 250);   // единственный подписчик ушёл
setTimeout(() => c1.unsubscribe(), 450);    // а источник остановится только здесь
// true
// 100ms тик 0
// 200ms тик 1
// (с 250 по 450 мс источник тикает вхолостую — слушателей нет)
// 450ms источник остановлен
\`\`\`

Никакого refCount: источник живёт, пока вы не закроете подключение. Забыли — утечка на весь срок жизни приложения. В Angular подключение закрывают через \`DestroyRef.onDestroy(() => conn.unsubscribe())\`.

### \`connector\` и \`resetOnDisconnect\`

\`\`\`ts
import { of, connectable, ReplaySubject } from 'rxjs';

// По умолчанию resetOnDisconnect: true — после завершения Subject пересоздаётся
const cfg1 = connectable(of('конфиг v1'), { connector: () => new ReplaySubject(1) });
cfg1.connect();
cfg1.subscribe((v) => console.log('reset=true:', v));
// (тишина — буфер ReplaySubject выброшен вместе со старым Subject)

const cfg2 = connectable(of('конфиг v1'), {
  connector: () => new ReplaySubject(1),
  resetOnDisconnect: false,
});
cfg2.connect();
cfg2.subscribe({ next: (v) => console.log('reset=false:', v), complete: () => console.log('complete') });
// reset=false: конфиг v1
// complete
\`\`\`

Тот же сброс влияет и на переподключение: при \`resetOnDisconnect: true\` старые подписчики остаются на старом \`Subject\`, и после повторного \`connect()\` новые значения получат **только** те, кто подписался после отключения. При \`false\` старые подписчики продолжат получать значения. Выбор \`connector\` меняет поведение для опоздавших: \`Subject\` — не получат ничего, \`ReplaySubject(1)\` — последнее значение, \`BehaviorSubject(init)\` — текущее значение или начальное.

### \`share\` и \`shareReplay\` — мультикаст на автомате

\`share\` запускает источник при первом подписчике и по умолчанию сбрасывается при уходе последнего, при ошибке и при завершении. У него есть опции \`connector\`, \`resetOnError\`, \`resetOnComplete\`, \`resetOnRefCountZero\`. \`shareReplay(n)\` — это \`share\` с \`ReplaySubject(n)\`, который **не** сбрасывается по завершении.

\`\`\`ts
import { defer, interval, finalize, share } from 'rxjs';

let runs = 0;
const src$ = defer(() => { console.log('источник запущен №' + ++runs); return interval(100); })
  .pipe(finalize(() => console.log('источник остановлен')));
const s$ = src$.pipe(share());

const a = s$.subscribe();
const b = s$.subscribe();
setTimeout(() => { a.unsubscribe(); b.unsubscribe(); s$.subscribe(); }, 150);
// 0ms   источник запущен №1     ← один запуск на двоих
// 150ms источник остановлен     ← ушёл последний подписчик
// 150ms источник запущен №2     ← новый подписчик — новый запуск

// Для сравнения, проверено тем же сценарием:
// shareReplay(1) (refCount: false по умолчанию) — при нуле подписчиков источник продолжает
//   работать, новый подписчик сразу получает последнее значение из буфера.
// shareReplay({ bufferSize: 1, refCount: true }) — при нуле подписчиков источник остановлен
//   и буфер выброшен, новый подписчик запускает источник заново и ждёт первого значения.
\`\`\`

Здесь частая путаница: \`refCount: true\` у \`shareReplay\` означает именно «сбрасываться, когда подписчиков ноль». Если нужно, чтобы источник и кэш пережили момент без подписчиков, это \`shareReplay(1)\` (то есть \`refCount: false\`) или \`share({ resetOnRefCountZero: false })\`. А если нужно, чтобы бесконечный источник **не** продолжал работать без подписчиков — \`shareReplay({ bufferSize: 1, refCount: true })\`.

### Чем заменили \`multicast\`, \`publish\` и \`refCount\`

Старый API строился вокруг класса \`ConnectableObservable\` с методами \`connect()\` и \`refCount()\`. Операторы семейства \`publish\` возвращали этот класс вместо обычного Observable, поэтому их приходилось ставить последними в \`pipe\`, чтобы не потерять метод \`connect()\`, а поведение зависело от мелочей: \`multicast(subject)\` с готовым экземпляром переиспользовал один \`Subject\` навсегда: после завершения повторный \`connect()\` снова запускал источник, но новый подписчик получал только \`complete\` без значений, а \`multicast(() => new Subject())\` с фабрикой создавал новый \`Subject\` на каждое подключение. Разделение «подключения» и «подписки» постоянно приводило к ошибкам жизненного цикла. Официальные замены из документации RxJS 7:

- \`source.pipe(publish())\` → \`connectable(source, { connector: () => new Subject(), resetOnDisconnect: false })\`.
- \`publishReplay(n)\` → \`connectable(source, { connector: () => new ReplaySubject(n), resetOnDisconnect: false })\`; \`publishBehavior(v)\` и \`publishLast()\` — то же с \`BehaviorSubject(v)\` и \`AsyncSubject\`.
- \`publish(), refCount()\` → \`share({ resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false })\`.
- \`publishReplay(n), refCount()\` → \`share({ connector: () => new ReplaySubject(n), resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false })\`.
- \`multicast(() => new Subject()), refCount()\` → \`share()\` (с нужным \`connector\`).
- \`publish(selector)\` и \`multicast(factory, selector)\` → оператор \`connect(selector)\`.

Обратите внимание: старые операторы семейства \`publish\` **не** сбрасывались, поэтому при миграции почти везде стоят \`resetOnDisconnect: false\` и все опции \`resetOn…\` в значении \`false\`.

### Как выбрать

- **Несколько подписчиков в разное время, нужен один запуск** (кэш HTTP, конфиг, справочник) — \`shareReplay(1)\` или \`share\` с настройками сброса. Это 95% случаев.
- **Бесконечный поток (WebSocket, тикер), который не должен работать без слушателей** — \`share()\` или \`shareReplay({ bufferSize: 1, refCount: true })\`.
- **Несколько веток обработки одного источника внутри одной цепочки** — оператор \`connect\`. Особенно если источник может быть синхронным.
- **Нужно сначала подписать всех потребителей и явно управлять стартом и остановкой** — \`connectable\` + \`connect()\` + обязательное закрытие подключения.
- **Встретили \`publish\`/\`multicast\`/\`refCount\` в старом коде** — мигрировать по списку замен выше, помня, что старые операторы не сбрасывались.

### Где это применяется на практике

- **Один HTTP-запрос на несколько \`async\` pipe в шаблоне** — \`shareReplay(1)\` или, лучше, один \`async\`/\`toSignal\` на всю модель представления.
- **Разбор WebSocket-потока торговой платформы**: цены, сделки и новости — ветки одного \`connect\`, одна подписка на сокет.
- **Поиск с мгновенным первым запросом и debounce на остальные** — \`connect\` с \`take(1)\` и \`skip(1)\` + \`debounceTime\`.
- **Потоки уровня приложения** (события сервера, лицензия, фича-флаги), которые стартуют при инициализации и живут до её конца — \`connectable\` с \`ReplaySubject(1)\` и \`resetOnDisconnect: false\`, \`connect()\` в инициализаторе, закрытие через \`DestroyRef\`.
- **Миграция легаси-кода с RxJS 6**: замена \`publishReplay(1), refCount()\` на \`shareReplay\` или \`share\` с явными опциями.

## Важные нюансы и подводные камни

- **\`connectable\` без \`connect()\` не эмитит вообще.** Подписчики висят молча — самый частый источник недоумения.
- **Не отписались от \`connect()\`** — источник живёт вечно, независимо от подписчиков. \`refCount\`-семантики здесь нет.
- **Выбор \`connector\` меняет поведение.** \`Subject\` — опоздавшие не получат ничего; \`ReplaySubject(1)\` — получат последнее значение.
- **\`resetOnDisconnect: true\` (по умолчанию) выбрасывает \`Subject\` после завершения источника** — опоздавшие не получат даже буфер \`ReplaySubject\` и \`complete\`, а после переподключения старые подписчики «осиротеют».
- **Оператор \`connect\` без \`merge\`** внутри селектора теряет ветки: наружу уходит только то, что вернул селектор.
- **\`share()\` на синхронном источнике не гарантирует один запуск**: первая ветка может получить всё и завершить источник до подписки второй. Для локального ветвления — оператор \`connect\`.
- **\`share()\` по умолчанию сбрасывается** при уходе последнего подписчика и перезапустит источник при следующем. Если это не нужно — \`share({ resetOnRefCountZero: false })\` или \`shareReplay(1)\`. А \`shareReplay({ bufferSize: 1, refCount: true })\` как раз **сбрасывается** на нуле подписчиков — это не способ «сохранить» источник.
- **\`shareReplay(1)\` без \`refCount\` на бесконечном потоке** — источник работает вечно даже без подписчиков.
- **Легаси-операторы семейства \`publish\` не сбрасывались** — при механической миграции на \`share()\` с настройками по умолчанию поведение изменится.
- **Зачем вообще \`connectable\`, если есть \`share\`?** Когда нужно **гарантированно** подписать всех потребителей до старта источника и явно управлять его остановкой.

**Плюсы:** источник выполняется один раз на любое число потребителей, \`connect\` надёжно ветвит даже синхронные источники, \`connectable\` даёт полный контроль над стартом и остановкой, единый механизм \`connector\` вместо зоопарка \`publish\`-операторов, нормальная типизация в \`pipe\`.
**Минусы:** легко ошибиться с настройками сброса и \`refCount\`, \`connectable\` требует ручного управления подключением (утечки), опоздавшие подписчики ведут себя по-разному в зависимости от \`connector\`, а миграция с легаси-API меняет поведение, если не выставить опции \`resetOn…\` в \`false\`.

## Как это спрашивают на собеседовании

**Главный вывод:** все эти инструменты — про мультикаст: один запуск источника на N потребителей через \`Subject\`. \`share\`/\`shareReplay\` запускают источник с первым подписчиком, \`connectable\` — по ручному \`connect()\`, оператор \`connect\` — после того, как подписаны все ветки селектора. Они заменили \`multicast\`, семейство \`publish\`, \`refCount\` и \`ConnectableObservable\`, удаляемые в RxJS 8.

Типичные формулировки: «Как сделать так, чтобы запрос выполнился один раз для нескольких подписчиков?», «Что такое \`connectable\` и зачем он, если есть \`share\`?», «Чем заменить \`publishReplay(1), refCount()\`?», «Как разветвить поток на несколько обработчиков без двойного запроса?».

Что могут спросить следом:

- *Почему \`share()\` не помог с двумя ветками в \`merge\`?* — Синхронный источник завершился до подписки второй ветки, \`share\` сбросился и запустил его заново; оператор \`connect\` подписывает ветки до старта.
- *Когда источник \`connectable\` остановится?* — Только при закрытии подписки, которую вернул \`connect()\`, или при собственном завершении; подписчики на это не влияют.
- *Что получит опоздавший подписчик \`connectable\`?* — Зависит от \`connector\` и \`resetOnDisconnect\`: с \`Subject\` — ничего, с \`ReplaySubject(1)\` и \`resetOnDisconnect: false\` — последнее значение.
- *Что означает \`refCount: true\` у \`shareReplay\`?* — Остановить источник и выбросить буфер, когда подписчиков ноль.
- *Чем заменить \`publish(selector)\`?* — Оператором \`connect(selector)\`.

### Ответ на 1 минуту

> Всё это про мультикаст: превратить холодный источник в один общий поток через \`Subject\`, чтобы работа выполнилась один раз на N подписчиков. В большинстве случаев хватает \`share\` или \`shareReplay\`, где источник стартует с первым подписчиком. \`connectable\` нужен, когда старт контролирует код: он создаёт \`Subject\` из опции \`connector\`, но подписывается на источник только по \`connect()\`, а останавливается, только когда закроешь возвращённую подписку, — refCount там нет, и по умолчанию после отключения \`Subject\` пересоздаётся. Оператор \`connect\` — про локальное ветвление: селектор получает общий поток, строит ветки, и все они подписаны до старта источника, поэтому даже синхронный источник выполнится один раз, в отличие от \`share\`. Всё это заменило \`multicast\`, \`publish\`, \`publishReplay\`, \`refCount\` и \`ConnectableObservable\`, которые устарели в RxJS 7 из-за запутанного жизненного цикла.`,
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
    category: 'ngrx',
    level: 'Expert',
    tags: ['ngrx', 'meta-reducers', 'runtime-checks'],
    question: {
      ru: 'Что такое meta-reducers и runtime checks в NgRx? Для чего они нужны?',
      en: 'What are meta-reducers and runtime checks in NgRx? What are they for?'
    },
    answer: {
      ru: `## В чём суть

Meta-reducer — это **обёртка вокруг reducer'а**: функция вида \`(reducer) => reducer\`. Она видит **каждый** action и состояние **до и после** редукции, поэтому работает как промежуточный слой (middleware) Redux-цикла. Runtime checks — это набор **готовых** meta-reducer'ов от NgRx, которые в dev-режиме следят, чтобы вы не нарушали правила Redux: не мутировали состояние, не клали в него несериализуемое и так далее.

Аналогия: обычный reducer — сотрудник, который обрабатывает заявки. Meta-reducer — начальник, через стол которого проходит **каждая** заявка до и после сотрудника: он ведёт журнал (логирование), кладёт копию в архив (hydration в \`localStorage\`) или очищает картотеку при увольнении (сброс на logout). Runtime checks — служба контроля, которая в тестовом офисе бьёт по рукам за «поправил документ карандашом вместо того, чтобы сделать новую копию». В боевом офисе её нет — она дорогая.

**Какую проблему решает.** Есть задачи, которые касаются **всего** состояния сразу: залогировать каждое изменение, восстановить store после перезагрузки, стереть данные пользователя при выходе. Если делать это в каждом reducer'е, придётся править десятки файлов и не забыть новые. Meta-reducer решает это в одном месте. А runtime checks ловят ошибки, которые иначе проявляются странно и поздно: мутация состояния не падает, а просто «не перерисовывает» OnPush-компонент через неделю после релиза.

## Словарик терминов

- **Reducer (\`ActionReducer\`)** — чистая функция \`(state, action) => newState\`, считающая новое состояние.
- **Meta-reducer (\`MetaReducer\`)** — функция, которая принимает reducer и возвращает новый reducer с дополнительным поведением вокруг него.
- **Функция высшего порядка (higher-order function)** — функция, которая принимает или возвращает другую функцию; meta-reducer — как раз такая.
- **Корневой reducer (root reducer)** — один reducer, который NgRx собирает из всех фич через \`combineReducers\`; его и оборачивают meta-reducer'ы.
- **\`compose\`** — склейка функций в цепочку: \`compose(a, b, c)(x)\` = \`a(b(c(x)))\`; так NgRx применяет массив meta-reducer'ов.
- **Hydration (гидрация)** — восстановление состояния из хранилища (\`localStorage\`, \`sessionStorage\`) при старте приложения.
- **Runtime checks (проверки во время выполнения)** — встроенные проверки NgRx, работающие только в dev-режиме.
- **\`Object.freeze\` (заморозка)** — делает объект неизменяемым: попытка записать в него свойство в строгом режиме бросает \`TypeError\`.
- **Сериализуемость (serializability)** — возможность без потерь превратить объект в JSON и обратно; \`Date\`, \`Map\`, \`Set\`, функции и экземпляры классов этого не переживают.
- **\`NgZone\` и zoneless** — механизм \`zone.js\`, через который Angular узнаёт об асинхронных событиях; zoneless-приложение работает без него.
- **Dev mode / \`isDevMode()\`** — режим разработки Angular; в production-сборке он выключен.
- **\`META_REDUCERS\`** — DI-токен NgRx, через который meta-reducer можно создать фабрикой с зависимостями (\`inject\`).
- **Effect (эффект)** — асинхронный обработчик actions для побочных действий; работает **после** reducer'а и не меняет состояние напрямую.

## Как это работает под капотом

Последовательность, проверенная по исходникам \`@ngrx/store\` 21:

1. NgRx собирает корневой reducer из ваших фич через \`combineReducers\`.
2. Собирается массив meta-reducer'ов: сначала встроенные проверки и всё, что зарегистрировано через токен \`META_REDUCERS\`, затем — массив \`metaReducers\` из конфигурации \`provideStore\`.
3. Массив склеивается через \`compose(...metaReducers, combineReducers)\`. Поэтому **первый в массиве оказывается самым внешним**: он первым видит action и последним — новое состояние.
4. На каждый \`dispatch\` вызов идёт «матрёшкой»: внешняя обёртка «до» → внутренняя «до» → настоящий reducer → внутренняя «после» → внешняя «после».
5. Встроенные runtime checks — это те же meta-reducer'ы: проверка иммутабельности замораживает action до reducer'а и новое состояние после; проверка сериализуемости обходит объекты; проверка зоны смотрит на \`NgZone.isInAngularZone()\`.
6. Набор активных проверок вычисляется при старте: если \`isDevMode()\` ложно, **все проверки выключаются**, даже если в конфигурации стоит \`true\`. В dev по умолчанию включены только \`strictStateImmutability\` и \`strictActionImmutability\`.

Упрощённо meta-reducer и проверка иммутабельности выглядят так:

\`\`\`ts
function compose(...fns) {
  return (arg) => fns.reduceRight((acc, fn) => fn(acc), arg);
}

function immutabilityCheck(reducer) {
  return (state, action) => {
    const nextState = reducer(state, deepFreeze(action)); // action заморожен
    return deepFreeze(nextState);                          // новое состояние тоже
  };
}
\`\`\`

### Пример 1. Логгер — самый простой meta-reducer

\`\`\`ts
import { ActionReducer, MetaReducer } from '@ngrx/store';

export function logger(reducer: ActionReducer<AppState>): ActionReducer<AppState> {
  return (state, action) => {
    const next = reducer(state, action);
    console.log(action.type, { prev: state, next });
    return next;
  };
}

export const metaReducers: MetaReducer<AppState>[] = isDevMode() ? [logger] : [];

bootstrapApplication(App, {
  providers: [provideStore(reducers, { metaReducers })],
});
\`\`\`

Логгер не трогает ни один фич-reducer — он оборачивает их все разом. Тем же приёмом делают hydration, сброс на logout, undo/redo и перехват для аналитики. В старом модульном стиле то же самое передают в \`StoreModule.forRoot(reducers, { metaReducers })\`.

### Пример 2. Порядок: кто снаружи, кто внутри

\`\`\`ts
const named = (name) => (reducer) => (state, action) => {
  console.log(\`\${name}: before \${action.type}\`);
  const next = reducer(state, action);
  console.log(\`\${name}: after\`);
  return next;
};

provideStore({ todos: todosReducer }, { metaReducers: [named('A'), named('B')] });
store.dispatch(add({ title: 'x' }));
// A: before [Todos Page] Add
// B: before [Todos Page] Add
// B: after
// A: after
\`\`\`

\`A\` первый в массиве — значит, самый внешний: первым видит action и последним отдаёт результат. Это важно, когда обёртки зависят друг от друга: логгер, стоящий снаружи hydration, увидит уже восстановленное состояние, а стоящий внутри — исходное.

### Пример 3. Сброс всего состояния на logout

\`\`\`ts
export function resetOnLogout(reducer: ActionReducer<AppState>): ActionReducer<AppState> {
  return (state, action) =>
    reducer(action.type === AuthActions.logout.type ? undefined : state, action);
}

store.dispatch(add({ title: 'secret' }));
store.dispatch(AuthActions.logout());
// items []
// items ["secret"]
// items []   ← каждый reducer получил undefined и вернул своё initialState
\`\`\`

Трюк в том, что reducer'ы на \`undefined\` возвращают начальное состояние. Одна строка — и данные прошлого пользователя гарантированно стёрты во всех фичах, включая те, что добавят через год.

### Пример 4. Hydration: восстановление из \`localStorage\`

\`\`\`ts
export function hydration(reducer: ActionReducer<AppState>): ActionReducer<AppState> {
  return (state, action) => {
    if (action.type === '@ngrx/store/init') {
      const saved = localStorage.getItem('app-state');
      if (saved) state = { ...state, ...JSON.parse(saved) };
    }
    const next = reducer(state, action);
    localStorage.setItem('app-state', JSON.stringify(next));
    return next;
  };
}
// в хранилище: {"todos":{"items":["from storage"]}}
// items ["from storage"]
// после add('new'): items ["from storage","new"], в хранилище обновлённая копия
\`\`\`

\`@ngrx/store/init\` — служебный action, который NgRx отправляет при создании store; в этот момент удобно подмешать сохранённое. Запись в \`localStorage\` на каждый action — побочный эффект, поэтому многие выносят сохранение в effect (часто с \`debounceTime\`), а в meta-reducer оставляют только чтение. Для ленивых фич гидрацию обычно повторяют и на \`@ngrx/store/update-reducers\` — его NgRx отправляет при регистрации новой фичи. При SSR \`localStorage\` на сервере нет — проверяйте платформу.

### \`META_REDUCERS\` — meta-reducer с зависимостями

\`\`\`ts
providers: [
  provideStore({ todos: todosReducer }),
  {
    provide: META_REDUCERS,
    multi: true,
    useFactory: () => {
      const analytics = inject(Analytics);
      return (reducer) => (state, action) => { analytics.track(action.type); return reducer(state, action); };
    },
  },
];
// analytics: @ngrx/store/init
// analytics: [Todos Page] Add
\`\`\`

Массив \`metaReducers\` — это просто функции, они не умеют \`inject\`. Если meta-reducer'у нужен сервис (аналитика, конфиг, хранилище), его регистрируют через токен \`META_REDUCERS\` с \`multi: true\` и фабрикой.

### Meta-reducer только для одной фичи

\`\`\`ts
provideStore({}),
provideState('todos', todosReducer, { metaReducers: [named('todos-only')] }),
// todos-only: before [Todos Page] Add
// todos-only: after
\`\`\`

\`provideState\` (или \`StoreModule.forFeature\`) принимает свои \`metaReducers\` — они оборачивают только reducer этой фичи. Удобно для undo/redo, который нужен одному редактору, а не всему приложению.

### Runtime checks: что проверяет каждая

- \`strictStateImmutability\` — замораживает состояние и ловит его мутации. В dev включена по умолчанию.
- \`strictActionImmutability\` — замораживает action и ловит его изменение после отправки. В dev включена по умолчанию.
- \`strictStateSerializability\` — в состоянии не должно быть \`Date\`, \`Map\`, функций и экземпляров классов. По умолчанию выключена.
- \`strictActionSerializability\` — то же для action'ов. По умолчанию выключена.
- \`strictActionWithinNgZone\` — action должен отправляться внутри Angular-зоны. По умолчанию выключена.
- \`strictActionTypeUniqueness\` — два \`createAction\` с одинаковым типом запрещены. По умолчанию выключена.

\`\`\`ts
provideStore(reducers, {
  metaReducers,
  runtimeChecks: {
    strictStateImmutability: true,
    strictActionImmutability: true,
    strictStateSerializability: true,
    strictActionSerializability: true,
    strictActionTypeUniqueness: true,
  },
});
\`\`\`

### \`strictStateImmutability\` и \`strictActionImmutability\` в действии

\`\`\`ts
// reducer, который мутирует
on(mutate, (s) => { s.items.push('bad'); return s; })

store.dispatch(add({ title: 'a' }));   // items ["a"]
store.dispatch(mutate());              // dispatch вернулся без исключения...
store.dispatch(add({ title: 'b' }));
// ...а позже в консоли: Cannot add property 1, object is not extensible
// и состояние больше не меняется: 'b' не применился

const action = add({ title: 'x' });
store.dispatch(action);
action.title = 'changed';
// Cannot assign to read only property 'title' of object '#<Object>'
\`\`\`

Обратите внимание: ошибка не бросается из \`dispatch\` синхронно, а всплывает как необработанная ошибка RxJS. И она **роняет внутренний поток состояния** — store перестаёт обновляться до перезагрузки. Поэтому проверка так полезна в dev: баг виден сразу и громко. В production-сборке те же два вызова проходят молча, мутация «работает».

### Сериализуемость, зона и уникальность типов

\`\`\`ts
// strictStateSerializability: true
on(add, (s) => ({ ...s, loadedAt: new Date() }))
// Detected unserializable state at "todos.loadedAt". https://ngrx.io/guide/store/configuration/runtime-checks#strictstateserializability

// strictActionWithinNgZone: true, приложение без zone.js
// Action '[Todos Page] Add' running outside NgZone. https://ngrx.io/guide/store/configuration/runtime-checks#strictactionwithinngzone

// strictActionTypeUniqueness: true, два createAction('[Todos Page] Add')
// Action types are registered more than once, "[Todos Page] Add". https://ngrx.io/guide/store/configuration/runtime-checks#strictactiontypeuniqueness
\`\`\`

Сериализуемость нужна, чтобы состояние можно было сохранить, передать в DevTools и «перемотать». \`Date\` храните строкой ISO или числом. Проверка зоны полезна в приложениях на \`zone.js\`: dispatch из колбэка сторонней библиотеки вне зоны не запустит обнаружение изменений; лечится \`ngZone.run(() => store.dispatch(...))\`. В zoneless-приложении (а это вариант по умолчанию для новых проектов на Angular 21) \`NgZone.isInAngularZone()\` всегда ложно, и эта проверка будет падать на каждом action — её там не включают.

### Meta-reducer против effect

- **Meta-reducer** — синхронный, стоит прямо в цепочке редукции, видит состояние до и после и может его изменить. Должен быть быстрым и по возможности чистым.
- **Effect** — асинхронный, живёт сбоку и срабатывает после reducer'а. Не меняет состояние напрямую, а отправляет новые actions; для HTTP, навигации, таймеров.
- Правило: если задача — «преобразовать состояние на каждый action» (сброс, восстановление, undo), это meta-reducer. Если «сходить куда-то и сообщить результат» — effect.

### Где это применяется на практике

- **Сброс на logout** в любом приложении с авторизацией — чтобы следующий пользователь не увидел чужие данные.
- **Сохранение черновиков и настроек**: hydration фильтров грида, раскладки дашборда, недописанной формы (готовая библиотека — \`ngrx-store-localstorage\`).
- **Undo/redo в редакторах**: meta-reducer фичи хранит стек прошлых состояний и на \`undo\` возвращает предыдущее.
- **Аудит и аналитика**: через \`META_REDUCERS\` каждый action отправляется в сервис телеметрии.
- **Dev-логирование** с диффом состояния — подключается только при \`isDevMode()\`.
- **Строгий режим в CI**: в e2e и unit-тестах включают все runtime checks, чтобы мутации и \`Date\` в состоянии ловились до код-ревью.

## Важные нюансы и подводные камни

- **Проверки работают только в dev.** В production NgRx выключает их сам, даже если в конфигурации \`true\`. Мутирующий код в проде «работает», а баг проявится как OnPush-компонент, который не перерисовался.
- **Ошибка проверки роняет store.** Исключение внутри reducer'а (в том числе от заморозки) завершает поток состояния — дальнейшие actions не применяются. В dev это заметно сразу; именно поэтому мутации нельзя «игнорировать до лучших времён».
- **Порядок в массиве важен.** Первый — самый внешний. Логгер снаружи hydration видит восстановленное состояние, внутри — исходное; reset-on-logout должен стоять так, чтобы следующая за ним hydration не вернула стёртое.
- **Сериализуемость отключают осознанно**, когда в состоянии лежат \`Date\` или классы. Но это против духа Redux: ломаются сохранение в хранилище и time-travel в DevTools.
- **Meta-reducer — не место для тяжёлых побочных эффектов.** Он выполняется на каждый action синхронно; запись в \`localStorage\` на каждый клик бьёт по производительности. Сохранение часто выносят в effect с \`debounceTime\`.
- **Не забывайте служебные actions.** Meta-reducer видит и \`@ngrx/store/init\`, и \`@ngrx/store/update-reducers\`; логика вида «на всё, кроме…» должна их пропускать или осознанно обрабатывать.
- **\`strictActionWithinNgZone\` и сторонние колбэки.** WebSocket, SDK карт и платёжных систем могут вызывать код вне зоны — лечится \`ngZone.run()\`; в zoneless-приложениях проверку не включают.
- **Массив \`metaReducers\` не умеет DI.** Для зависимостей — токен \`META_REDUCERS\` с фабрикой.

**Плюсы:** одна точка для сквозной логики над всем состоянием, не нужно трогать фич-reducer'ы, runtime checks бесплатно ловят мутации и несериализуемые данные в dev и не стоят ничего в проде.
**Минусы:** легко ошибиться с порядком, синхронная работа на каждый action влияет на производительность, побочные эффекты внутри размывают чистоту Redux, а проверки могут мешать при осознанном хранении \`Date\` или работе без \`zone.js\`.

## Как это спрашивают на собеседовании

**Главный вывод:** meta-reducer — функция из reducer'а в reducer, которая оборачивает корневой reducer и видит каждый action с состоянием до и после; первый в массиве — самый внешний. Runtime checks — встроенные meta-reducer'ы, которые только в dev замораживают состояние и actions и проверяют сериализуемость, зону и уникальность типов.

Типичные формулировки: «Что такое meta-reducer?», «Как сбросить всё состояние при logout?», «Зачем нужны runtime checks в NgRx?», «Чем meta-reducer отличается от effect?».

Что могут спросить следом:

- *В каком порядке применяются meta-reducer'ы?* — Через \`compose\`: первый в массиве самый внешний, видит action первым, а новое состояние последним.
- *Какие проверки включены по умолчанию?* — В dev только \`strictStateImmutability\` и \`strictActionImmutability\`; в production все выключены.
- *Как сделать meta-reducer с сервисом внутри?* — Зарегистрировать через токен \`META_REDUCERS\` с \`multi: true\` и фабрикой, где доступен \`inject\`.
- *Почему \`Date\` в состоянии — проблема?* — Он не сериализуется в JSON без потерь, ломает сохранение и time-travel; храните строку ISO или число.
- *Что будет, если reducer мутирует состояние при включённой проверке?* — Заморозка вызовет \`TypeError\`, поток состояния завершится, и store перестанет обновляться.

### Ответ на 1 минуту

> Meta-reducer — это reducer высшего порядка, функция из reducer'а в reducer: он оборачивает корневой reducer и перехватывает каждый action вместе с состоянием до и после редукции, то есть работает как middleware Redux-цикла. Типичные применения — логирование, hydration из \`localStorage\` на \`@ngrx/store/init\`, сброс всего дерева при logout через передачу \`undefined\` и undo-redo. NgRx применяет их через \`compose\`, поэтому первый в массиве самый внешний. Runtime checks — встроенные meta-reducer'ы: две проверки иммутабельности замораживают state и action, проверки сериализуемости запрещают \`Date\`, \`Map\` и функции, ещё есть проверки зоны и уникальности типов. Работают они только в dev: по умолчанию включена иммутабельность, а в production NgRx выключает всё сам. Нюанс: ошибка проверки роняет поток состояния, а в zoneless-приложении проверку зоны не включают.`,
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
    category: 'ngrx',
    level: 'Hard',
    tags: ['ngrx', 'component-store', 'local-state'],
    question: {
      ru: 'Что такое NgRx ComponentStore и когда выбирать его вместо глобального Store?',
      en: 'What is NgRx ComponentStore and when do you choose it over the global Store?'
    },
    answer: {
      ru: `## В чём суть

\`ComponentStore\` из пакета \`@ngrx/component-store\` — это **маленький реактивный store, который живёт и умирает вместе с компонентом**. В нём нет actions, reducers, глобального \`dispatch\` и DevTools — только состояние, производные потоки и эффекты, всё внутри одного класса.

Аналогия: глобальный \`Store\` — это городской архив: туда ходят все отделы, каждая операция записывается в журнал, есть строгий регламент. \`ComponentStore\` — папка на столе конкретного сотрудника: удобно, быстро, без бюрократии. Но когда сотрудник уходит, папка уходит вместе с ним — и это не баг, а задумка.

**Какую проблему решает.** У сложного компонента — таблицы с пагинацией, сортировкой, загрузкой и выбором строк — состояния слишком много для пары полей: появляются гонки запросов, ручные подписки, забытые отписки. Тащить это в глобальный store тоже плохо: состояние нужно одному экрану, а в NgRx оно переживёт уход со страницы, и его придётся чистить вручную. ComponentStore даёт структуру Redux-уровня (иммутабельные обновления, селекторы, эффекты с автоматической отпиской) в масштабе одного компонента.

## Словарик терминов

- **\`ComponentStore<T>\`** — базовый класс, от которого наследуется ваш store; \`T\` — тип состояния.
- **\`updater\`** — синхронное обновление состояния, аналог reducer'а: \`(state, value) => newState\`; возвращает функцию, которую вызывают как метод.
- **\`patchState\` / \`setState\`** — быстрые способы обновить состояние: слить часть полей или заменить его целиком.
- **\`select\`** — производный Observable из состояния; повторы отсекает, подписку делит между всеми потребителями.
- **\`selectSignal\` / \`state\`** — сигнальные аналоги: производный сигнал и сигнал всего состояния.
- **\`effect\`** — обёртка для побочных действий: принимает поток входных значений и возвращает функцию-триггер; подпиской управляет сам.
- **\`tapResponse\`** — оператор из \`@ngrx/operators\`: обрабатывает успех и ошибку внутреннего запроса так, чтобы ошибка не убила внешний поток.
- **\`switchMap\`** — оператор RxJS: на каждое новое значение отменяет предыдущий внутренний поток (запрос) и запускает новый.
- **\`providers\` компонента** — список сервисов в декораторе \`@Component\`; каждый экземпляр компонента получает свой экземпляр сервиса, и он уничтожается вместе с компонентом.
- **\`ngOnDestroy\` / \`destroy$\`** — хук уничтожения; ComponentStore реализует его сам и через поток \`destroy$\` закрывает все свои подписки.
- **\`provideComponentStore\`, \`OnStoreInit\`, \`OnStateInit\`** — функция регистрации и хуки «store создан» и «состояние задано».
- **Debounce (склейка)** — отложить реакцию, чтобы несколько быстрых изменений дали одно событие.
- **SignalStore** — более новый store из \`@ngrx/signals\` на сигналах и функциях-фичах вместо наследования.

## Как это работает под капотом

Механика (по исходникам \`@ngrx/component-store\` 21):

1. Состояние хранится в \`ReplaySubject(1)\` — потоке, который помнит последнее значение. \`super(initialState)\` в конструкторе кладёт туда начальное состояние.
2. \`updater(fn)\` возвращает функцию. Когда вы её вызываете со значением, она берёт текущее состояние, вызывает \`fn(state, value)\` и кладёт результат обратно. Обновления ставятся в очередь (\`queueScheduler\`), поэтому вложенные вызовы не перемешиваются.
3. \`select(projector)\` — это поток состояния, пропущенный через \`map(projector)\`, \`distinctUntilChanged()\` и \`shareReplay({ refCount: true, bufferSize: 1 })\`. Проектор пересчитывается на **каждое** изменение состояния, но подписчики получают значение, только если оно действительно изменилось.
4. \`effect(generator)\` создаёт внутренний \`Subject\`, один раз подписывается на \`generator(subject$)\` и держит подписку до уничтожения store. Возвращённая функция просто толкает значения в этот Subject.
5. При уничтожении (компонент, в \`providers\` которого лежит store, удалён) вызывается \`ngOnDestroy\`: поток состояния завершается, \`destroy$\` выдаёт сигнал, и все \`select\` и \`effect\` отписываются — летящие запросы отменяются.

Упрощённо \`effect\` выглядит так:

\`\`\`ts
effect(generator) {
  const origin$ = new Subject();
  generator(origin$).pipe(takeUntil(this.destroy$)).subscribe(); // одна подписка на всё время жизни
  return (valueOrObservable) => {
    const value$ = isObservable(valueOrObservable) ? valueOrObservable : of(valueOrObservable);
    return value$.pipe(takeUntil(this.destroy$)).subscribe(v => origin$.next(v));
  };
}
\`\`\`

### Пример 1. Store списка задач целиком

\`\`\`ts
import { ComponentStore } from '@ngrx/component-store';
import { tapResponse } from '@ngrx/operators';

interface TodoState { todos: Todo[]; loading: boolean; filter: string }

@Injectable()
export class TodosStore extends ComponentStore<TodoState> {
  private api = inject(TodosApi);
  constructor() { super({ todos: [], loading: false, filter: '' }); }

  readonly todos$ = this.select(s => s.todos);
  readonly count$ = this.select(this.todos$, todos => todos.length);

  readonly addTodo = this.updater((s, todo: Todo) => ({ ...s, todos: [...s.todos, todo] }));
  readonly setFilter = this.updater((s, filter: string) => ({ ...s, filter }));

  readonly load = this.effect<void>(trigger$ => trigger$.pipe(
    tap(() => this.patchState({ loading: true })),
    switchMap(() => this.api.list().pipe(
      tapResponse({
        next: todos => this.patchState({ todos, loading: false }),
        error: () => this.patchState({ loading: false }),
      })
    ))
  ));
}
\`\`\`

\`load\` — это effect, а не метод с ручным \`subscribe\`, поэтому запрос сам отменится при уничтожении компонента, а повторный вызов отменит предыдущий запрос благодаря \`switchMap\`.

### \`updater\`, \`patchState\`, \`setState\`

- \`updater((s, v) => newState)\` — именованный переход состояния, удобно тестировать и переиспользовать. Вызывается со значением или с Observable значений.
- \`patchState({ loading: true })\` — слить поля, остальные не трогать. Также принимает функцию \`s => partial\` или Observable.
- \`setState(newState)\` — заменить целиком; так же задают начальное состояние, если его нет в конструкторе.

\`\`\`ts
class LazyStore extends ComponentStore<{ x: number }> {
  constructor() { super(); }               // без начального состояния
  setX = this.updater((s, x: number) => ({ ...s, x }));
}
lazy.setX(1);
// LazyStore has not been initialized yet. Please make sure it is initialized before updating/getting.
lazy.setState({ x: 0 });
lazy.setX(5);                              // state() → { x: 5 }
\`\`\`

### \`select\`: производные потоки

\`\`\`ts
store.count$.subscribe(n => console.log('count$', n));
store.addTodo({ id: 9, title: 'x' });
store.setFilter('abc');                    // todos не изменились
// projector todos$ ran
// count$ 0
// projector todos$ ran
// count$ 1
// projector todos$ ran   ← проектор отработал на setFilter...
//                        ← ...но count$ промолчал: значение то же
\`\`\`

\`select\` — не мемоизация в стиле \`createSelector\`, а «пересчитать и отсечь повторы». Поэтому проекторы держат дешёвыми, а тяжёлые вычисления строят цепочкой из других \`select\`. Можно передать свою функцию сравнения: \`this.select(s => s.items, { equal: (a, b) => a.length === b.length })\`.

### \`select\` с \`{ debounce: true }\` — склейка view model

\`\`\`ts
readonly vm$ = this.select(
  { todos: this.todos$, loading: this.select(s => s.loading) },
  { debounce: true }
);
store.vm$.subscribe(vm => console.log('vm$', vm.todos.length, vm.loading));
store.addTodo({ id: 1 }); store.addTodo({ id: 2 }); store.patchState({ loading: true });
// vm$ 2 true   ← три синхронных изменения — одна эмиссия
\`\`\`

Объект из нескольких \`select\` собирается в один поток. Без \`debounce\` каждое из трёх синхронных изменений дало бы отдельный \`vm$\` и лишнюю перерисовку.

### \`selectSignal\` и \`state\` — сигнальный API

\`\`\`ts
readonly todos = this.selectSignal(s => s.todos);
readonly count = this.selectSignal(this.todos, todos => todos.length);
// снаружи: store.state() — сигнал всего состояния
console.log(store.state().todos.length, store.state().filter); // 1 'abc'
\`\`\`

В шаблонах на сигналах можно обойтись без \`async\`: \`{{ store.count() }}\`. Синхронно прочитать состояние внутри store позволяет защищённый метод \`get()\`; снаружи для этого есть \`state()\`.

### \`effect\`: три способа вызвать

\`\`\`ts
readonly refresh = this.effect<void>(trigger$ => trigger$.pipe(tap(() => console.log('refresh'))));
readonly logFilter = this.effect<string>(filter$ => filter$.pipe(
  tap(f => console.log('effect got filter:', f))
));
store.refresh();                 // refresh
store.logFilter('a');            // effect got filter: a
store.logFilter(of('b', 'c'));   // effect got filter: b
                                 // effect got filter: c
// в компоненте: store.logFilter(this.filterControl.valueChanges)
\`\`\`

Эффект с типом \`void\` вызывают без аргумента (просто триггер), остальные — со значением или с целым Observable. Во втором случае ComponentStore сам подпишется на него и отпишется при уничтожении. Это удобно для \`valueChanges\` формы: подключили один раз, отписываться не нужно.

### \`tapResponse\` — ошибка не должна убить эффект

\`\`\`ts
// api.list(): вызов #2 падает с 500
store.load(); // api.list() #1 → todos: [1]
store.load(); // api.list() #2 → tapResponse error: 500, loading: false
store.load(); // api.list() #3 → todos: [3]   ← эффект жив
\`\`\`

\`tapResponse({ next, error, complete?, finalize? })\` — это \`tap\` плюс \`catchError\`, который после вызова \`error\` возвращает \`EMPTY\`. Ошибка гасится **внутри** \`switchMap\`, на внутреннем потоке запроса, и внешний поток эффекта продолжает жить. В актуальных версиях (проверено на 21) он импортируется из \`@ngrx/operators\`, а форма с позиционными колбэками \`tapResponse(next, error)\` помечена устаревшей — передавайте объект.

### Что будет без \`tapResponse\`

\`\`\`ts
readonly loadUnsafe = this.effect<void>(trigger$ => trigger$.pipe(
  switchMap(() => this.api.list()),
  tap(todos => this.patchState({ todos }))
));
store.loadUnsafe(); // api.list() #1 → todos: [1]
store.loadUnsafe(); // api.list() #2 → необработанная ошибка 500
store.loadUnsafe(); // ничего: api calls = 2
\`\`\`

Ошибка в RxJS терминальна: она дошла до внешнего потока эффекта, и тот завершился. Функция \`loadUnsafe\` продолжает толкать значения во внутренний Subject, но слушать их уже некому — кнопка «Обновить» мертва до перезагрузки страницы. Ставить \`catchError\` **снаружи** \`switchMap\` — та же ошибка: он поймает её уже после смерти эффекта.

### Жизненный цикл: \`providers\` компонента

\`\`\`ts
@Component({
  selector: 'app-todos',
  providers: [TodosStore],           // свой экземпляр на каждый <app-todos>
  template: \`
    @if (store.state().loading) { <app-spinner /> }
    @for (t of store.todos(); track t.id) { <app-todo [todo]="t" /> }
  \`,
})
export class TodosComponent {
  protected store = inject(TodosStore);
  constructor() { this.store.load(); }
}

// уничтожение компонента (в эксперименте — уничтожение инжектора сразу после load()):
// api.list() #1
// state$ completed
// todos after destroy: 0   ← летящий запрос отменён, ответ не применился
\`\`\`

Store в \`providers\` компонента создаётся вместе с ним и уничтожается вместе с ним: все подписки закрываются, состояние исчезает. Два экземпляра компонента на странице получают два независимых store.

### \`provideComponentStore\` и хуки инициализации

\`\`\`ts
@Injectable()
export class TodosStore extends ComponentStore<TodoState> implements OnStoreInit, OnStateInit {
  ngrxOnStoreInit() { /* store создан: можно запускать эффекты */ }
  ngrxOnStateInit() { /* состояние задано: можно читать */ }
}
@Component({ providers: [provideComponentStore(TodosStore)] })
// constructor → ngrxOnStoreInit → ngrxOnStateInit
\`\`\`

Хуки вызываются только при регистрации через \`provideComponentStore\`. Если зарегистрировать класс напрямую, в dev-режиме будет предупреждение \`...lifecycle hook(s) implemented without being provided using the provideComponentStore(TodosStore) function\`, а хуки не сработают.

### Как выбрать

- **ComponentStore** — состояние локально для компонента или фичи, должно умирать вместе с экраном, команда любит RxJS, DevTools для этого среза не нужны.
- **Глобальный \`Store\`** — состояние разделяется многими фичами, нужен единый источник истины, журнал actions, DevTools, meta-reducers и эффекты уровня приложения.
- **SignalStore** — та же ниша «локальный или фичевой store», но на сигналах и с композицией через функции-фичи вместо наследования; в новых проектах его выбирают чаще. ComponentStore поддерживается и остаётся рабочим выбором для кода, построенного на RxJS.
- **Голые поля или сигналы** — если состояние умещается в два-три значения без асинхронности.

### Где это применяется на практике

- **Таблицы данных** с серверной пагинацией, сортировкой и фильтрами: каждый экземпляр грида — свой store.
- **Диалоги и мастера** («создать заказ»): состояние живёт, пока открыт диалог, и исчезает при закрытии.
- **Переиспользуемые виджеты** (автокомплит, выбор пользователя) в библиотеке компонентов: без зависимости от глобального store приложения.
- **Формы с асинхронной валидацией**: \`effect\` принимает \`valueChanges\`, делает \`debounceTime\` + \`switchMap\` к API.
- **Постепенное внедрение NgRx**: один сложный экран переводят на ComponentStore, не трогая остальное приложение.

## Важные нюансы и подводные камни

- **Зарегистрировали в \`root\` вместо \`providers\` компонента** — store становится синглтоном, состояние «переезжает» между экземплярами компонента и переживает уход со страницы.
- **Забыли \`tapResponse\`** (или \`catchError\` внутри) — первая же ошибка API убивает эффект, кнопка перестаёт работать до перезагрузки.
- **\`catchError\` снаружи \`switchMap\`** — та же ошибка, что в NgRx-эффектах: ловить нужно на внутреннем потоке запроса.
- **Мутация в \`updater\`.** Возвращайте новый объект: \`distinctUntilChanged\` в \`select\` сравнивает ссылки и не увидит изменения.
- **Проекторы \`select\` выполняются на каждое изменение состояния.** Держите их лёгкими, тяжёлые расчёты стройте цепочкой из других \`select\`.
- **Обновление до инициализации** бросает ошибку \`has not been initialized yet\` — задайте состояние в \`super()\` или через \`setState\`.
- **Хуки без \`provideComponentStore\`** не вызываются, в dev — предупреждение в консоли.
- **\`tapResponse\` переехал.** В свежих версиях импорт только из \`@ngrx/operators\`, позиционная форма устарела.
- **DevTools недоступны** — отлаживают логами и тестами; это осознанная плата за отсутствие церемоний.

**Плюсы:** структура Redux-уровня в масштабе компонента, автоматическая отписка и отмена запросов при уничтожении, эффекты принимают значения и Observable, \`select\` с \`debounce\` для view model, сигнальный API, лёгкое тестирование (обычный класс).
**Минусы:** нет журнала actions и DevTools, наследование вместо композиции, проекторы не мемоизированы, легко забыть \`tapResponse\`, а в новых проектах эту нишу всё чаще занимает SignalStore.

## Как это спрашивают на собеседовании

**Главный вывод:** ComponentStore — локальный store без Redux-церемоний: состояние, \`updater\`, \`select\` и \`effect\` в одном классе, привязанном к жизни компонента через его \`providers\`. Берут его для состояния одного экрана, глобальный Store — для общего состояния многих фич.

Типичные формулировки: «Что такое ComponentStore?», «Когда ComponentStore, а когда глобальный Store?», «Чем ComponentStore отличается от SignalStore?».

Что могут спросить следом:

- *Почему store кладут в \`providers\` компонента?* — Чтобы у каждого экземпляра было своё состояние и всё уничтожалось вместе с компонентом.
- *Зачем \`tapResponse\` в эффекте?* — Он гасит ошибку на внутреннем потоке запроса, и внешний поток эффекта остаётся жив.
- *Как вызвать effect?* — Без аргумента, со значением или с Observable — ComponentStore сам подпишется и отпишется.
- *Чем \`select\` отличается от \`createSelector\`?* — Проектор пересчитывается на каждое изменение, но повторы отсекаются \`distinctUntilChanged\`; это не мемоизация по входам.
- *Чем ComponentStore отличается от SignalStore?* — Тот же подход к локальному состоянию, но SignalStore построен на сигналах и собирается из функций-фич вместо наследования.

### Ответ на 1 минуту

> \`ComponentStore\` — локальный реактивный store из \`@ngrx/component-store\`, привязанный к жизненному циклу компонента и работающий без Redux-церемоний: нет actions, reducers, глобального dispatch и DevTools. Основных примитивов три: \`updater\` — синхронное обновление вроде reducer'а, \`select\` — производный поток с отсечением повторов и общей подпиской, и \`effect\`, который принимает Observable входных значений, запускает побочное действие вроде \`switchMap\` к API и сам управляет подпиской. Беру его, когда состояние нужно одному экрану: меньше кода, чем в глобальном Store, но больше структуры, чем набор \`BehaviorSubject\`. Глобальный Store — когда состояние делят многие фичи и нужны DevTools. Нюансы: регистрирую его в \`providers\` компонента, чтобы он уничтожался вместе с ним, а внутри эффектов ставлю \`tapResponse\` из \`@ngrx/operators\`, иначе первая ошибка убьёт эффект.`,
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
    category: 'ngrx',
    level: 'Expert',
    tags: ['ngrx', 'effects', 'error-handling'],
    question: {
      ru: 'Почему ошибка в NgRx effect «убивает» поток и как этого избежать? Объясните гигиену actions.',
      en: 'Why does an error in an NgRx effect "kill" the stream and how do you avoid it? Explain action hygiene.'
    },
    answer: {
      ru: `## В чём суть

Effect в NgRx — это **один долгоживущий поток**: через него всё время жизни приложения течёт \`actions$\`. А \`error\` в RxJS — событие **терминальное**: дошло до потока — поток мёртв навсегда. Поэтому один упавший запрос, если ошибку не поймать в правильном месте, выключает фичу целиком: кнопка нажимается, action отправляется, но effect на него больше **не реагирует**.

Аналогия: \`actions$\` — это конвейер, а \`switchMap\` — станок сбоку от него, который на каждую деталь запускает отдельную операцию (запрос). Если деталь взорвалась **в станке**, чинят станок, а конвейер едет дальше. Если позволить взрыву дойти **до конвейера**, встанет весь цех. \`catchError\` внутри \`switchMap\` — защитный кожух на станке.

**Какую проблему решает.** Правильная обработка ошибок отличает «сервер один раз ответил 500 — пользователь увидел сообщение и нажал ещё раз» от «после первой ошибки раздел не работает до перезагрузки, а в логах тишина». А гигиена actions — набор правил именования и использования actions — делает журнал в Redux DevTools читаемым: по нему видно, что произошло, где и в каком порядке.

## Словарик терминов

- **Effect (эффект)** — обработчик побочных действий в NgRx: слушает actions, ходит в API, на навигацию, в \`localStorage\` и отправляет новые actions с результатом.
- **\`createEffect\`** — функция, которая объявляет эффект; с \`{ functional: true }\` эффект пишется как функция с \`inject()\` вместо класса.
- **\`Actions\` (\`actions$\`)** — бесконечный поток всех actions приложения; приходит в эффект через DI.
- **\`ofType\`** — оператор-фильтр: пропускает только actions нужных типов.
- **Внешний и внутренний поток** — внешний — это \`actions$\` после \`ofType\`, внутренний — то, что запускает \`switchMap\` на каждый action (обычно HTTP-запрос).
- **Higher-order операторы (\`switchMap\`, \`concatMap\`, \`exhaustMap\`, \`mergeMap\`)** — операторы, которые на каждое значение запускают внутренний поток; отличаются тем, что делают с предыдущим, ещё не завершённым.
- **Терминальное событие** — \`error\` или \`complete\`: после них поток больше ничего не выдаёт, а подписка закрывается.
- **\`catchError\`** — оператор, который ловит ошибку и **заменяет** упавший поток другим (например, \`of(failureAction)\`).
- **\`of\` / \`EMPTY\`** — поток, выдающий заданные значения и завершающийся, и поток, который сразу завершается без значений.
- **\`mapResponse\` / \`tapResponse\`** — операторы из \`@ngrx/operators\`: обработка успеха и ошибки одним объектом \`{ next, error }\` с гарантией, что ошибка не уйдёт наружу.
- **\`ErrorHandler\`** — глобальный обработчик ошибок Angular; NgRx отправляет в него непойманные ошибки эффектов.
- **\`dispatch: false\`** — опция \`createEffect\`: эффект только делает побочное действие и ничего не отправляет в store.
- **Гигиена actions (action hygiene)** — правила: action — это уникальное событие с источником, \`[Источник] Событие\`, без переиспользования из разных мест.
- **Событие против команды** — «\`[Users Page] Opened\`» (что случилось) против «\`loadUsers\`» (что сделать); Redux строится на событиях.

## Как это работает под капотом

Что происходит с эффектом от старта до ошибки (проверено на \`@ngrx/effects\` 21):

1. При старте \`provideEffects(...)\` NgRx **один раз** подписывается на каждый эффект и всё, что тот выдаёт, отправляет в store через \`dispatch\`.
2. \`ofType(loadUsers)\` пропускает нужные actions, \`switchMap\` на каждый запускает **внутренний** поток — HTTP-запрос.
3. Запрос упал → внутренний поток выдаёт \`error\`. Если его не поймать внутри, ошибка проходит через \`switchMap\` во **внешний** поток.
4. Внешний поток получает \`error\` → завершается терминально → эффект отписан от \`actions$\`. Следующие клики до него не доходят.
5. У NgRx есть страховка: по умолчанию непойманную ошибку перехватывает \`defaultEffectsErrorHandler\`, отправляет её в Angular \`ErrorHandler\` и **переподписывает** эффект. Но не более 10 раз: после десятой переподписки следующая ошибка убивает эффект окончательно и уже без сообщения.
6. Если же \`catchError\` стоит **снаружи** \`switchMap\`, он ловит ошибку уже на внешнем потоке и заменяет весь эффект на \`of(failure)\`. Этот поток выдаёт один action и **завершается** — для NgRx это не ошибка, а нормальное завершение, поэтому страховка даже не срабатывает: эффект тихо умирает.
7. Правильно: \`catchError\` стоит **на внутреннем потоке** и превращает ошибку в обычное значение — failure-action. Внутренний поток завершается, внешний живёт дальше.

Страховка NgRx устроена так (почти дословно из исходников):

\`\`\`ts
const MAX_NUMBER_OF_RETRY_ATTEMPTS = 10;
function defaultEffectsErrorHandler(observable$, errorHandler, retryAttemptLeft = MAX_NUMBER_OF_RETRY_ATTEMPTS) {
  return observable$.pipe(catchError((error) => {
    errorHandler?.handleError(error);           // в консоль / Sentry
    if (retryAttemptLeft <= 1) return observable$; // последняя попытка — уже без catchError
    return defaultEffectsErrorHandler(observable$, errorHandler, retryAttemptLeft - 1);
  }));
}
\`\`\`

### Пример 1. Правильный эффект: \`catchError\` внутри

\`\`\`ts
export const loadUsers = createEffect(
  (actions$ = inject(Actions), api = inject(UsersApi)) => actions$.pipe(
    ofType(UsersPageActions.opened),
    switchMap(() => api.load().pipe(
      map(users => UsersApiActions.loadSuccess({ users })),
      catchError(err => of(UsersApiActions.loadFailure({ error: err.message })))
      //  ^ ВНУТРИ switchMap — внешний поток жив
    ))
  ),
  { functional: true }
);

// api.load(): первый вызов падает, остальные успешны; трижды dispatch(opened())
// action: [Users Page] Opened
// action: [Users API] Load Failure
// action: [Users Page] Opened
// action: [Users API] Load Success
// action: [Users Page] Opened
// action: [Users API] Load Success
\`\`\`

Ошибка гасится до того, как покинет внутренний поток, и превращается в обычный action. Reducer по \`Load Failure\` снимает \`loading\` и показывает сообщение, а эффект готов к следующему клику. Правило не зависит от оператора: с \`exhaustMap\`, \`concatMap\` и \`mergeMap\` ровно так же.

### Пример 2. \`catchError\` снаружи — эффект умирает молча

\`\`\`ts
actions$.pipe(
  ofType(UsersPageActions.opened),
  switchMap(() => api.load().pipe(map(users => UsersApiActions.loadSuccess({ users })))),
  catchError(err => of(UsersApiActions.loadFailure({ error: err.message })))   // ❌ снаружи
)
// action: [Users Page] Opened
// action: [Users API] Load Failure
// action: [Users Page] Opened     ← ответа нет
// action: [Users Page] Opened     ← и больше никогда не будет
\`\`\`

Первый раз всё выглядит правильно: failure-action пришёл. Но \`catchError\` заменил **весь** эффект на \`of(failure)\`, тот выдал одно значение и завершился. Ни ошибки в консоли, ни переподписки — это и есть эталонная ошибка на собеседовании.

### Пример 3. Без \`catchError\` — страховка NgRx и её предел

\`\`\`ts
switchMap(() => api.load().pipe(map(users => UsersApiActions.loadSuccess({ users }))))

// api всегда падает, 13 раз dispatch(opened())
// ErrorHandler: 500 #1
// ...
// ErrorHandler: 500 #10
// api calls: 11       ← 11-я ошибка убила эффект без сообщения, 12-й и 13-й клики не дошли до API

// api падает только в первый раз
// ErrorHandler: 500 #1
// action: [Users API] Load Success   ← дальше всё работает: эффект переподписан
\`\`\`

Страховка спасает от одиночных сбоев, но маскирует баг: фича «иногда работает», в консоли ошибки, а failure-action не отправляется никогда — \`loading\` в состоянии так и остаётся \`true\`. Полагаться на неё нельзя.

### \`useEffectsErrorHandler\` и \`EFFECTS_ERROR_HANDLER\`

\`\`\`ts
createEffect(() => ..., { useEffectsErrorHandler: false });
// api падает один раз → api calls: 1, эффект мёртв сразу и без сообщения

providers: [{ provide: EFFECTS_ERROR_HANDLER, useValue: myEffectsErrorHandler }]
\`\`\`

Опция \`useEffectsErrorHandler: false\` отключает страховку для конкретного эффекта — обычно когда вы сами полностью управляете ошибками. Токен \`EFFECTS_ERROR_HANDLER\` позволяет подменить стратегию для всех эффектов, например с повтором через задержку и отправкой в мониторинг.

### \`of(failure)\` против \`EMPTY\`

\`\`\`ts
catchError(() => EMPTY)
// state: loading: true  → [Users Page] Opened
// state: loading: true  → ошибку проглотили, failure нет, спиннер крутится вечно
// state: list ["Ann"], loading: false → помог только следующий клик
\`\`\`

\`EMPTY\` спасает поток, но оставляет UI в состоянии «загружается». Состояние надо **закрывать** failure-action'ом: reducer по нему ставит \`loading: false\` и \`error\`.

### \`mapResponse\` и \`tapResponse\` из \`@ngrx/operators\`

\`\`\`ts
switchMap(() => api.load().pipe(
  mapResponse({
    next: users => UsersApiActions.loadSuccess({ users }),
    error: (e: HttpErrorResponse) => UsersApiActions.loadFailure({ error: e.message }),
  })
))
// state: loading: true → Load Failure: error "500", loading: false
// state: loading: true → Load Success: list ["Ann"], loading: false
\`\`\`

\`mapResponse\` — это \`map\` + \`catchError\` в одном объекте: невозможно забыть failure-ветку. \`tapResponse\` — то же для побочных действий без возврата action (в ComponentStore, \`rxMethod\`, эффектах с \`dispatch: false\`). Оба ставятся **внутрь** \`switchMap\`.

### Какой higher-order оператор выбрать

- **\`switchMap\`** — поиск, загрузка по фильтру, переходы между страницами: нужен только последний ответ, старый запрос отменяется.
- **\`concatMap\`** — команды записи, где важен порядок: «добавить», затем «переименовать».
- **\`exhaustMap\`** — логин, оплата, submit формы: пока запрос идёт, повторные клики игнорируются (защита от двойного клика).
- **\`mergeMap\`** — независимые параллельные операции: удалить пять разных строк одновременно.
- Во всех четырёх правило одно: \`catchError\` — на внутреннем потоке.

### \`dispatch: false\` — эффекты без результата

\`\`\`ts
// ❌ забыли dispatch: false — tap возвращает исходный action, NgRx отправляет его снова
createEffect(() => actions$.pipe(ofType(saved), tap(() => toast.show('Сохранено'))));
// toast #1, toast #2, toast #3 ... и так бесконечно

// ✅
createEffect(() => actions$.pipe(ofType(saved), tap(() => toast.show('Сохранено'))), { dispatch: false });
// toast #1

// ❌ эффект выдал не action (например, результат router.navigate)
export const nav = createEffect((actions$ = inject(Actions)) =>
  actions$.pipe(ofType(saved), map(() => true)), { functional: true });
// ErrorHandler: Effect "nav()" dispatched an invalid action: true
// TypeError: Actions must have a type property
\`\`\`

Эффекты навигации, тостов, логирования, записи в \`localStorage\` объявляют с \`{ dispatch: false }\`. Иначе NgRx попытается отправить то, что выдал поток: либо тот же action (бесконечный цикл), либо не-action (ошибка).

### Гигиена actions

\`\`\`ts
// ✅ события с источником, через createActionGroup
export const UsersPageActions = createActionGroup({
  source: 'Users Page',
  events: { 'Opened': emptyProps(), 'Refresh Clicked': emptyProps() },
});
export const UsersApiActions = createActionGroup({
  source: 'Users API',
  events: { 'Load Success': props<{ users: User[] }>(), 'Load Failure': props<{ error: string }>() },
});
// типы: '[Users Page] Opened', '[Users Page] Refresh Clicked', '[Users API] Load Success'
\`\`\`

- **Action — это событие, а не команда.** \`[Users Page] Opened\`, а не \`loadUsers\`. Что делать по событию, решают reducer'ы и эффекты.
- **Один источник события — один action.** Не переиспользуйте \`loadUsers\` со страницы, из диалога и по таймеру: в DevTools не понять, кто его вызвал. Один эффект может слушать несколько: \`ofType(UsersPageActions.opened, UsersPageActions.refreshClicked)\`.
- **Пары Success/Failure.** У каждой асинхронной операции есть явные \`Load Success\` и \`Load Failure\`, и обе обрабатывает reducer.
- **Не отправляйте несколько actions подряд на одно событие** (\`setLoading\`, \`clearError\`, \`load\`) — это одно событие \`Opened\`, на которое реагируют несколько reducer'ов.
- **Не отправляйте actions из reducer'а** — он должен быть чистой функцией.
- **Только сериализуемые данные в payload**: никаких функций, \`Date\`, экземпляров классов — иначе ломаются DevTools и runtime checks.

### Где это применяется на практике

- **Загрузка списков и карточек** в любом NgRx-приложении: \`switchMap\` + \`catchError\` внутри + пара Success/Failure.
- **Платёжные и учётные операции**: \`exhaustMap\` для «Оплатить», \`concatMap\` для последовательных проводок, failure-action с кодом ошибки для понятного сообщения.
- **Глобальная обработка ошибок**: свой \`EFFECTS_ERROR_HANDLER\` или \`ErrorHandler\` отправляет непойманные ошибки в Sentry, чтобы «тихие» смерти эффектов не прятались.
- **Эффекты уведомлений и навигации** с \`dispatch: false\`: тост по \`Save Success\`, переход на страницу по \`Login Success\`.
- **Аудит действий пользователя** в финтехе и админках: журнал событий с источниками читается как история работы пользователя.

## Важные нюансы и подводные камни

- **\`catchError\` снаружи \`switchMap\`** — эталонная ошибка. Эффект выдаёт один failure-action и тихо завершается; страховка NgRx не срабатывает, потому что ошибки формально нет.
- **\`catchError\`, возвращающий \`EMPTY\`**, спасает поток, но оставляет UI в вечном \`loading: true\` — закрывайте состояние failure-action'ом.
- **Страховка NgRx маскирует баг.** Без \`catchError\` эффект переподписывается до 10 раз, в консоли ошибки, фича «иногда работает». После лимита эффект умирает без сообщения.
- **\`catchError\` должен быть последним во внутреннем \`pipe\`.** Если после него стоит \`map\`, исключение в этом \`map\` уже никто не поймает.
- **Рискованный код во внешнем потоке.** \`tap\` или \`map\` до \`switchMap\`, бросающий исключение, тоже убивает эффект; всё, что может упасть, переносите во внутренний поток.
- **Забыли \`{ dispatch: false }\`** у эффекта навигации или тоста — бесконечный цикл (если поток возвращает исходный action) или \`dispatched an invalid action\` (если возвращает не-action).
- **Один action на несколько источников** — по DevTools невозможно понять, кто его вызвал; называйте actions по источнику события.
- **Повторы делайте внутри.** \`retry({ count: 2, delay: 1000 })\` ставится во внутренний поток перед \`catchError\`, тогда повторяется только запрос, а не подписка на \`actions$\`.

**Плюсы:** при правильной структуре эффект переживает любые сбои, ошибки превращаются в явные failure-actions, которые видны в DevTools и обрабатываются reducer'ом; гигиена actions делает журнал читаемой историей событий.
**Минусы:** правило «ловить внутри» легко нарушить, а последствия неочевидны (тихая смерть, «плавающий» баг); дисциплина actions добавляет кода — по action'у на каждый источник и пару на каждую операцию.

## Как это спрашивают на собеседовании

**Главный вывод:** effect — один долгоживущий поток, а \`error\` терминален. Поэтому \`catchError\` ставится **внутри** \`switchMap\` (на внутреннем потоке запроса) и возвращает failure-action, а не \`EMPTY\`. Actions — это события с источником (\`[Users Page] Opened\`), с парами Success/Failure, а эффекты без результата объявляются с \`dispatch: false\`.

Типичные формулировки: «Почему эффект перестал реагировать после ошибки?», «Где ставить \`catchError\` в эффекте?», «Что такое good action hygiene?».

Что могут спросить следом:

- *Что делает NgRx с непойманной ошибкой эффекта?* — Отправляет её в \`ErrorHandler\` и переподписывает эффект, но не более 10 раз; отключается \`useEffectsErrorHandler: false\`.
- *Почему \`catchError\` снаружи хуже, чем отсутствие \`catchError\`?* — Он заменяет эффект завершающимся потоком: эффект умирает без ошибки, и страховка даже не включается.
- *Какой оператор выбрать для эффекта?* — \`switchMap\` для загрузок и поиска, \`concatMap\` для упорядоченной записи, \`exhaustMap\` для логина и submit, \`mergeMap\` для независимых операций.
- *Что будет без \`dispatch: false\` у эффекта с \`tap\`?* — Он отправит исходный action ещё раз и уйдёт в бесконечный цикл.
- *Почему action должен быть событием, а не командой?* — Тогда журнал показывает, что произошло и где, а реакции на событие можно добавлять, не трогая источник.

### Ответ на 1 минуту

> Effect — это долгоживущий Observable вида \`actions$.pipe(ofType(...), switchMap(...))\`, а ошибка в RxJS терминальна: если она дойдёт до внешнего потока, эффект отпишется от \`actions$\` и перестанет реагировать — один упавший запрос глушит фичу. Поэтому \`catchError\` ставлю внутри \`switchMap\`, на потоке запроса, и возвращаю failure-action, а не \`EMPTY\`, иначе \`loading\` зависнет; удобно делать это через \`mapResponse\`. Если \`catchError\` стоит снаружи, он заменит весь эффект на \`of(failure)\`, тот завершится, и эффект умрёт молча. У NgRx есть страховка — непойманную ошибку он отправляет в \`ErrorHandler\` и переподписывает эффект, но максимум 10 раз, так что полагаться на неё нельзя. Гигиена actions: action — это событие с источником вроде \`[Users Page] Opened\`, по одному на источник, с парами Success и Failure, а эффекты без результата — с \`dispatch: false\`, иначе возможен бесконечный цикл.`,
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
    category: 'ngrx',
    level: 'Expert',
    tags: ['ngrx', 'signal-store', 'rxmethod'],
    question: {
      ru: 'Разберите SignalStore глубже: withComputed, withMethods, withEntities, rxMethod и кастомные features.',
      en: 'Dive deeper into SignalStore: withComputed, withMethods, withEntities, rxMethod, and custom features.'
    },
    answer: {
      ru: `## В чём суть

\`SignalStore\` из \`@ngrx/signals\` собирается **не наследованием, а из кубиков**. \`signalStore(...features)\` принимает список функций-фич, и каждая **докладывает** в store свой кусок: состояние, вычисляемые значения, методы, коллекцию сущностей, хуки жизненного цикла. Всё построено на сигналах Angular, а для сложной асинхронности есть мост в RxJS — \`rxMethod\`.

Аналогия: конструктор LEGO. Классический store на классах — это отлитая деталь, которую можно только расширять наследованием. SignalStore — набор кубиков: взяли \`withState\`, сверху \`withEntities\`, сверху свой \`withRequestStatus\` — и получили ровно тот store, который нужен. Причём TypeScript на каждом шаге знает, что уже лежит в коробке: следующий кубик видит всё, что поставили до него.

**Какую проблему решает.** Сервисы с сигналами хороши, пока их мало. Когда их десятки, каждый написан по-своему: где-то публичный \`WritableSignal\`, где-то ручные подписки без отписки, где-то копипаста «загрузка + ошибка + список». SignalStore даёт единые правила (состояние меняется только через \`patchState\`, производное — через \`withComputed\`, асинхронность — через \`rxMethod\`), готовую нормализованную коллекцию и механизм переиспользования логики между store'ами — кастомные фичи.

## Словарик терминов

- **\`signalStore(...)\`** — функция, которая из списка фич создаёт класс store'а; его внедряют через DI как обычный сервис.
- **Фича (feature, \`SignalStoreFeature\`)** — функция «store до → store после», которая добавляет свои члены; \`withState\`, \`withMethods\` и ваши собственные — всё это фичи.
- **\`withState\`** — объявляет состояние; каждое поле верхнего уровня становится сигналом только для чтения.
- **Deep signal (глубокий сигнал)** — сигнал, у которого вложенные поля объекта тоже читаются как сигналы: \`store.settings.sort.by()\`.
- **\`patchState\`** — единственный способ изменить состояние: принимает частичные объекты или функции \`state => partial\`.
- **\`getState\` / \`watchState\`** — получить снимок всего состояния и подписаться на каждое его изменение.
- **\`protectedState\`** — настройка store'а (по умолчанию \`true\`): менять состояние можно только изнутри store'а.
- **\`withComputed\`** — производные сигналы через \`computed\`; пересчитываются только при изменении зависимостей.
- **\`withProps\`** — произвольные свойства store'а: внедрённые сервисы, Observable, константы; члены с префиксом \`_\` скрыты из публичного типа.
- **\`withMethods\`** — методы store'а; внутри доступны store и \`inject()\`.
- **\`withHooks\`** — хуки \`onInit\` и \`onDestroy\`.
- **\`withEntities\`** — нормализованная коллекция: \`entityMap\` (объект «id → сущность»), \`ids\` (порядок) и вычисляемый \`entities()\` (массив).
- **Entity updaters** — функции \`setAllEntities\`, \`addEntity\`, \`updateEntity\`, \`removeEntity\`, \`upsertEntity\`, которые передают в \`patchState\`.
- **\`entityConfig\` / именованная коллекция** — конфиг коллекции с типом, именем (\`collection: 'tag'\`) и функцией \`selectId\`.
- **\`rxMethod\`** — метод, внутри которого RxJS-конвейер; вызывается значением, сигналом или Observable и сам управляет подпиской.
- **\`signalMethod\`** — то же без RxJS: простая функция-обработчик, принимающая значение или сигнал.
- **\`signalStoreFeature\` и \`type<T>()\`** — создание своей фичи и описание требований к store'у, в который её подключают.

## Как это работает под капотом

Механика по исходникам \`@ngrx/signals\` 21:

1. \`signalStore(config?, ...features)\` возвращает класс с \`@Injectable\`. Пока DI не создал экземпляр, ничего не происходит.
2. В конструкторе берётся пустой «внутренний store» — \`{ stateSource, stateSignals, props, methods, hooks }\` — и последовательно пропускается через фичи: \`features.reduce((store, f) => f(store), empty)\`. Каждая фича получает всё, что накопили предыдущие, и возвращает расширенную версию. Поэтому **порядок фич важен**: \`withComputed\` видит только состояние, объявленное выше.
3. \`withState\` на каждое поле верхнего уровня создаёт отдельный записываемый сигнал, а наружу отдаёт его версию только для чтения, обёрнутую в deep signal (Proxy, который по обращению к \`store.settings.sort\` лениво создаёт \`computed(() => settings().sort)\`).
4. \`withComputed\`, \`withProps\`, \`withMethods\` вызывают вашу фабрику с накопленным store и добавляют результат. Функции в \`withComputed\` автоматически оборачиваются в \`computed\`.
5. Все члены копируются на экземпляр класса, затем вызывается \`onInit\`, а \`onDestroy\` регистрируется в \`DestroyRef\` инжектора — он сработает, когда инжектор (компонент или приложение) будет уничтожен.
6. \`patchState(store, ...updaters)\` берёт текущее состояние, по очереди применяет updater'ы и вызывает \`set\` только у тех сигналов верхнего уровня, чьё значение **сменило ссылку**. Затем уведомляет \`watchState\`-наблюдателей.

Упрощённо ядро выглядит так:

\`\`\`ts
function signalStore(...features) {
  return class SignalStore {
    constructor() {
      const inner = features.reduce((store, feature) => feature(store), emptyInnerStore());
      Object.assign(this, inner.stateSignals, inner.props, inner.methods);
      inner.hooks.onInit?.();
      if (inner.hooks.onDestroy) inject(DestroyRef).onDestroy(inner.hooks.onDestroy);
    }
  };
}
\`\`\`

### Пример 1. Store пользователей целиком (проверено на NgRx 21)

\`\`\`ts
export const UsersStore = signalStore(
  withState({ query: '', loading: false, settings: { pageSize: 20, sort: { by: 'name', dir: 'asc' } } }),
  withEntities<User>(),
  withProps(() => ({ _api: inject(UsersApi) })),
  withComputed((store) => ({
    total: computed(() => store.entities().length),
    activeCount: () => store.entities().filter(u => u.active).length, // функция → computed
  })),
  withMethods((store) => ({
    toggle(id: number) { patchState(store, updateEntity({ id, changes: u => ({ active: !u.active }) })); },
    add(user: User) { patchState(store, addEntity(user)); },
    remove(id: number) { patchState(store, removeEntity(id)); },
    load: rxMethod<string>(pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => patchState(store, { loading: true })),
      switchMap((q) => store._api.list(q).pipe(
        tapResponse({
          next: (users) => patchState(store, setAllEntities(users), { loading: false }),
          error: (e: Error) => patchState(store, { loading: false }),
        })
      ))
    )),
  })),
  withHooks({
    onInit(store) { console.log('onInit, query =', JSON.stringify(store.query())); },
    onDestroy() { console.log('onDestroy'); },
  })
);
\`\`\`

Состояние, коллекция, производные значения и методы объявлены в одном месте и по одному правилу — каждая фича лишь дописывает свой слой. Ниже разберём каждый кубик отдельно.

### \`withState\` и deep signals

\`\`\`ts
console.log(store.settings.sort.by(), store.settings.pageSize()); // name 20
console.log(store.query());                                        // ''
\`\`\`

Каждое поле верхнего уровня — сигнал, а вложенные поля объекта доступны как сигналы через точку. Компонент, читающий \`store.settings.pageSize()\`, перерисуется, только если изменилось именно это значение. Массивы, \`Date\`, \`Map\` deep-сигналами не становятся — это «листья».

### \`patchState\`, \`getState\` и защищённое состояние

\`\`\`ts
patchState(store, { query: 'ann' });                         // частичный объект
patchState(store, (s) => ({ query: s.query.trim() }));        // функция от состояния
patchState(store, setAllEntities(users), { loading: false }); // несколько updater'ов за раз
console.log(getState(store)); // {"query":"ann","loading":false,"settings":{...},"entityMap":{...},"ids":[...]}

// снаружи store'а (в компоненте):
patchState(usersStore, { query: 'x' });
// TS error: ... is not assignable to parameter of type 'WritableStateSource<...>'
\`\`\`

По умолчанию состояние **защищено**: изменить его можно только из \`withMethods\` и других фич внутри store'а, снаружи — только через методы. Это осознанный барьер, как приватное поле в сервисе. Отключается \`signalStore({ protectedState: false }, ...)\`, но обычно не нужно. Ключ, которого нет в начальном состоянии, \`patchState\` проигнорирует и в dev-режиме предупредит в консоли.

### Почему мутация не работает

\`\`\`ts
const pageSize = computed(() => store.settings.pageSize());
console.log(pageSize());                                     // 20
patchState(store, (s) => { s.settings.pageSize = 50; return s; }); // мутация
console.log(pageSize(), store.settings().pageSize);          // 20 50
\`\`\`

\`patchState\` вызывает \`set\` только для тех полей, у которых **сменилась ссылка**. Здесь объект \`settings\` тот же, поэтому сигнал не обновился: сырой объект уже 50, а все \`computed\` и шаблоны по-прежнему видят 20. Обновлять нужно иммутабельно: \`patchState(store, s => ({ settings: { ...s.settings, pageSize: 50 } }))\`.

### \`withComputed\` — производные сигналы

\`\`\`ts
withComputed((store) => ({
  total: computed(() => store.entities().length),
  activeCount: () => store.entities().filter(u => u.active).length,
}))
// entities: Ann (active), Bob → total() = 2, activeCount() = 1
\`\`\`

Фабрика получает state-сигналы и всё объявленное выше. В свежих версиях можно вернуть просто функцию — она будет обёрнута в \`computed\`. Внутри только чистые вычисления: никаких \`patchState\`, HTTP и логов — \`computed\` может вызываться когда угодно и сколько угодно раз.

### \`withProps\` и приватные члены

\`\`\`ts
withProps(() => ({ _api: inject(UsersApi) }))   // store из примера 1

console.log(Object.keys(store));
// query, loading, settings, entityMap, ids, entities, _api, total, activeCount, toggle, add, remove, load
usersStore._api; // TS error: Property '_api' does not exist on type ...
\`\`\`

\`withProps\` добавляет любые свойства: сервисы, Observable, ссылки на ресурсы. Префикс \`_\` скрывает член из публичного типа store'а, но внутри фич он доступен (\`store._api\`). Это скрытие на уровне типов: во время выполнения свойство на объекте есть.

### \`withMethods\` и \`withHooks\`

\`\`\`ts
withMethods((store, router = inject(Router)) => ({
  open(id: number) { router.navigate(['/users', id]); },
  setQuery(query: string) { patchState(store, { query }); },
})),
withHooks({
  onInit(store) { store.load(store.query); },  // подключить загрузку к сигналу
  onDestroy() { console.log('onDestroy'); },
})
// при создании: onInit, query = ""
// при уничтожении инжектора: onDestroy
\`\`\`

В \`withMethods\` фабрика выполняется в контексте внедрения, поэтому \`inject()\` работает прямо в параметрах. \`withHooks\` принимает объект с \`onInit(store)\` и \`onDestroy(store)\` или фабрику, внутри которой тоже можно делать \`inject()\`. \`onInit\` — правильное место, чтобы запустить первичную загрузку или связать \`rxMethod\` с сигналом.

### \`withEntities\` и хелперы коллекций

\`\`\`ts
store.load('');
// entities: ['Ann', 'Bob']  ids: [1, 2]  total: 2  active: 1
store.toggle(2);
store.add({ id: 3, name: 'Cid', active: false });
store.remove(1);
// entities: ['Bob:true', 'Cid:false'], entityMap()[2].name === 'Bob'
\`\`\`

\`withEntities<User>()\` добавляет в состояние \`entityMap\` и \`ids\`, а в свойства — вычисляемый \`entities()\`. Нормализация (объект по id) делает поиск и обновление одной записи дешёвыми даже в коллекции на десятки тысяч строк. Хелперы — это updater'ы для \`patchState\`: \`setAllEntities\`, \`setEntities\`, \`addEntity\`, \`upsertEntity\`, \`updateEntity\`, \`updateEntities\`, \`removeEntity\`, \`removeEntities\`, \`removeAllEntities\`. По умолчанию id берётся из поля \`id\`.

### Именованные коллекции и \`entityConfig\`

\`\`\`ts
const tagConfig = entityConfig({ entity: type<Tag>(), collection: 'tag', selectId: (t) => t.key });

const TodosStore = signalStore(
  withEntities<Todo>(),        // entityMap, ids, entities
  withEntities(tagConfig),     // tagEntityMap, tagIds, tagEntities
  withMethods((store) => ({
    addTag(tag: Tag) { patchState(store, addEntity(tag, tagConfig)); },
  }))
);
store.addTag({ key: 'urgent', label: 'Срочно' });
// tagIds: ['urgent'], tagEntities: ['Срочно'], todo ids: [1, 2]
\`\`\`

Несколько коллекций в одном store'е различаются именем: поля получают префикс (\`tagIds\`, \`tagEntities\`). \`entityConfig\` собирает тип, имя и \`selectId\` в один объект, который передают и в \`withEntities\`, и в каждый хелпер, — так не разойдутся.

### \`rxMethod\` — мост в RxJS

\`\`\`ts
logEach: rxMethod<string>(tap((v) => console.log('rxMethod got', v))),

store.logEach('a');          // rxMethod got a
store.logEach('b');          // rxMethod got b
const q = signal('x');
store.logEach(q);            // вызов в конструкторе компонента (в контексте внедрения)
q.set('y'); q.set('z');
// после ближайшего цикла обнаружения изменений:
// rxMethod got z            ← 'x' и 'y' пропущены: сигнал отдаёт актуальное значение
\`\`\`

\`rxMethod<T>(pipeline)\` создаёт внутренний Subject и **один раз** подписывает на него ваш конвейер. Вызов со значением толкает его в Subject. Вызов с сигналом создаёт Angular \`effect\`, который отправляет текущее значение при каждом изменении — асинхронно и без промежуточных значений. Вызов с Observable подписывается на него. Подписка конвейера живёт, пока жив store, а подписка на переданный сигнал или Observable привязывается к инжектору того места, откуда вызвали (например, компонента). Вызов с сигналом или Observable вне контекста внедрения в v21 выдаёт предупреждение, что это устарело и в будущем станет ошибкой, — передавайте \`{ injector }\`.

### Ошибка внутри \`rxMethod\`

\`\`\`ts
unsafe: rxMethod<string>(pipe(
  switchMap((v) => (v === 'boom' ? throwError(() => new Error('boom')) : of(v))),
  tap((v) => console.log('unsafe got', v))
)),
store.unsafe('1');     // unsafe got 1
store.unsafe('boom');  // необработанная ошибка: boom
store.unsafe('2');     // тишина — конвейер мёртв
\`\`\`

Это тот же механизм, что в NgRx-эффектах: ошибка дошла до внешнего потока и завершила его. В примере 1 \`tapResponse\` стоит внутри \`switchMap\`: ошибка \`500\` обработана, \`loading\` снят, а следующий вызов (\`'ann'\`) снова идёт в API.

### \`signalMethod\` — когда RxJS не нужен

\`\`\`ts
logSignal: signalMethod<string>((v) => console.log('signalMethod got', v)),

store.logSignal('static');   // signalMethod got static
store.logSignal(q);          // signalMethod got z (после цикла обнаружения изменений)
\`\`\`

Тот же интерфейс вызова (значение или сигнал), но без конвейера операторов. Подходит для синхронных реакций: сохранить в \`localStorage\`, отправить аналитику, синхронизировать с URL. Если нужны \`debounceTime\`, \`switchMap\` и отмена запросов — берите \`rxMethod\`.

### Кастомная фича: \`signalStoreFeature\`

\`\`\`ts
type RequestStatus = 'idle' | 'pending' | 'fulfilled' | { error: string };

export function withRequestStatus() {
  return signalStoreFeature(
    withState<{ requestStatus: RequestStatus }>({ requestStatus: 'idle' }),
    withComputed(({ requestStatus }) => ({
      isPending: computed(() => requestStatus() === 'pending'),
      error: computed(() => { const s = requestStatus(); return typeof s === 'object' ? s.error : null; }),
    }))
  );
}
export const setPending = () => ({ requestStatus: 'pending' as const });
export const setFulfilled = () => ({ requestStatus: 'fulfilled' as const });
export const setError = (error: string) => ({ requestStatus: { error } });

// в любом store'е:
patchState(store, setAllEntities(todos), setFulfilled());
// requestStatus: "fulfilled", isPending: false
patchState(store, setError('500'));
// error(): '500'
\`\`\`

Фича — это просто функция, собирающая другие фичи. Логика «загрузка/ошибка», пагинация, undo/redo, синхронизация с \`localStorage\` пишется один раз и подключается в любой store одной строкой.

### Фича с требованиями: \`type<T>()\`

\`\`\`ts
export function withSelectedEntity<E>() {
  return signalStoreFeature(
    { state: type<{ entityMap: Record<EntityId, E> }>() },   // требование ко входу
    withState<{ selectedId: EntityId | null }>({ selectedId: null }),
    withComputed(({ entityMap, selectedId }) => ({
      selected: computed(() => { const id = selectedId(); return id === null ? null : entityMap()[id] ?? null; }),
    })),
    withMethods((store) => ({ select(id: EntityId | null) { patchState(store, { selectedId: id }); } }))
  );
}

signalStore(withEntities<Todo>(), withSelectedEntity<Todo>()); // ✅ select(2) → selected().title === 'B'
signalStore(withSelectedEntity<Todo>());
// TS error: Property 'entityMap' is missing in type '{}' but required in type '{ entityMap: Signal<...> }'
\`\`\`

Первый аргумент \`signalStoreFeature\` описывает, что должно уже лежать в store'е: \`state\`, \`props\`, \`methods\`. \`type<T>()\` — пустышка, которая существует только ради типа. Подключили фичу не туда или не в том порядке — ошибка компиляции, а не падение в рантайме.

### Где это применяется на практике

- **Списки и гриды** с серверной фильтрацией: \`withEntities\` + \`rxMethod\` с \`debounceTime\`/\`switchMap\`, связанный с сигналом фильтра в \`onInit\`.
- **Общие фичи компании**: \`withRequestStatus\`, \`withPagination\`, \`withSelectedEntity\`, \`withStorageSync\` — пишутся один раз в shared-библиотеке и подключаются в десятки store'ов.
- **Store экрана в \`providers\` компонента**: мастер, редактор, диалог — состояние умирает вместе с компонентом, подписки \`rxMethod\` закрываются сами.
- **Глобальные store'ы** с \`providedIn: 'root'\`: текущий пользователь, корзина, настройки.
- **Миграция с ComponentStore и сервисов на \`BehaviorSubject\`**: те же роли (\`updater\` → методы с \`patchState\`, \`select\` → \`withComputed\`, \`effect\` → \`rxMethod\`), но на сигналах.

## Важные нюансы и подводные камни

- **Прямая мутация не работает.** \`patchState\` сравнивает ссылки полей верхнего уровня; изменённый «на месте» объект сигнал не обновит, \`computed\` и шаблоны увидят старое значение.
- **Порядок фич важен.** Фича видит только то, что объявлено выше; \`withComputed\` над \`withState\` не скомпилируется.
- **\`rxMethod\` не нужно оборачивать в \`takeUntilDestroyed\`.** Конвейер отписывается при уничтожении store'а, а подписка на переданный сигнал — при уничтожении вызвавшего компонента.
- **\`rxMethod\` с сигналом вне контекста внедрения** — в v21 предупреждение «deprecated, в будущем станет ошибкой». Вызывайте в конструкторе, \`onInit\` или передавайте \`{ injector }\`.
- **Сигнал в \`rxMethod\` — не поток событий.** Значения приходят асинхронно и только актуальные; если важно каждое значение (клики, сообщения), вызывайте метод со значениями или передавайте Observable.
- **Ошибка внутри \`rxMethod\` убивает его конвейер** — \`tapResponse\` или \`catchError\` ставятся **внутри** \`switchMap\`.
- **\`withComputed\` не для побочных эффектов.** Внутри \`computed\` нельзя вызывать \`patchState\` или API — только чистые вычисления.
- **\`providedIn: 'root'\` делает store синглтоном** на всё приложение; для локального состояния кладите его в \`providers\` компонента.
- **Приватность через \`_\` — только типовая.** Свойство есть на объекте во время выполнения; от злого умысла это не защищает, только от случайного использования.
- **Когда всё-таки глобальный NgRx Store?** Когда нужны DevTools с time-travel, meta-reducers, строгий аудит через actions и общее состояние для многих фич и команд. Для Redux-стиля внутри мира сигналов в свежих версиях есть плагин \`@ngrx/signals/events\`.

**Плюсы:** композиция вместо наследования, строгая типизация на каждом шаге, мало кода, сигналы без ручных подписок, готовая нормализованная коллекция, \`rxMethod\` для сложной асинхронности, переиспользуемые фичи, защищённое состояние по умолчанию.
**Минусы:** нет журнала actions и time-travel из коробки, легко ошибиться с иммутабельностью и порядком фич, сигнальный вход \`rxMethod\` пропускает промежуточные значения, а сложные дженерики фич трудно читать в сообщениях об ошибках.

## Как это спрашивают на собеседовании

**Главный вывод:** \`signalStore\` собирает store из функций-фич: \`withState\` (deep signals), \`withComputed\`, \`withProps\`, \`withMethods\` (\`patchState\`), \`withHooks\`, \`withEntities\` (\`entityMap\` + \`ids\` + \`entities()\`). \`rxMethod\` — мост в RxJS со своей подпиской, а \`signalStoreFeature\` с \`type<T>()\` выносит логику в типобезопасные переиспользуемые фичи.

Типичные формулировки: «Как устроен SignalStore?», «Что такое \`rxMethod\` и чем он отличается от \`effect\`?», «Как сделать свою фичу для SignalStore?», «Как хранить коллекции в SignalStore?».

Что могут спросить следом:

- *Почему порядок фич важен?* — Каждая фича получает store, накопленный предыдущими, и видит только объявленное выше.
- *Что будет, если вызвать \`patchState\` из компонента?* — Ошибка компиляции: состояние защищено по умолчанию; меняйте его через методы store'а.
- *Как \`rxMethod\` ведёт себя с сигналом?* — Через Angular \`effect\` отправляет актуальное значение после изменения, асинхронно и без промежуточных значений.
- *Зачем \`withEntities\` хранит \`entityMap\` и \`ids\`, а не массив?* — Нормализация: поиск и обновление по id без перебора, порядок отдельно; массив \`entities()\` вычисляется.
- *Как фича требует наличия других членов store'а?* — Первым аргументом \`signalStoreFeature({ state: type<...>() }, ...)\`; несоответствие ловится при компиляции.

### Ответ на 1 минуту

> \`signalStore\` собирает store из функций-фич — композиция вместо наследования: каждая фича получает накопленный store и добавляет свой кусок, поэтому порядок важен, а типы на каждом шаге знают, что уже есть. \`withState\` делает каждое поле сигналом, причём вложенные объекты читаются как deep signals; менять состояние можно только через \`patchState\`, по умолчанию лишь изнутри store'а, и только иммутабельно. \`withComputed\` добавляет производные сигналы, \`withMethods\` — методы с доступом к \`inject\`, \`withHooks\` — \`onInit\` и \`onDestroy\`. \`withEntities\` даёт нормализованную коллекцию \`entityMap\` плюс \`ids\` и вычисляемый \`entities()\` с хелперами вроде \`setAllEntities\` и \`updateEntity\`. \`rxMethod\` — мост к RxJS: принимает значение, сигнал или Observable и сам управляет подпиской, а ошибки ловлю \`tapResponse\` внутри \`switchMap\`. Общую логику выношу в фичи через \`signalStoreFeature\`.`,
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
