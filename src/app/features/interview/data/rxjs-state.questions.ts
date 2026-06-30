import { InterviewQuestion } from '../interfaces/question.interface';

export const RXJS_STATE_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'rxjs-001',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['observable', 'internals', 'lazy', 'unicast'],
    question: {
      ru: 'Что такое Observable «под капотом»? Объясните ленивость, unicast-природу и контракт Observer.',
      en: 'What is an Observable "under the hood"? Explain laziness, the unicast nature, and the Observer contract.'
    },
    answer: {
      ru: `## Что такое Observable

\`Observable\` — это, по сути, обёртка над функцией подписки (\`subscribe\` фабрикой). Конструктор принимает функцию \`(subscriber) => teardown\`, которая **не выполняется**, пока кто-то не вызовет \`subscribe()\`.

## Ленивость (lazy)

- Сам по себе Observable — это лишь **рецепт**, описание потока, а не выполняющийся код.
- Логика внутри \`new Observable(fn)\` запускается заново на **каждую** подписку.
- Поэтому HTTP-запрос в Angular не уйдёт, пока вы не подпишетесь (или \`async\` pipe не подпишется).

## Unicast

- Каждая подписка создаёт **отдельное** выполнение цепочки. Два подписчика — два независимых запуска.
- Это противоположность Subject (multicast), где один источник раздаётся многим.

## Контракт Observer

Observer — объект с методами:

- \`next(value)\` — 0..N раз;
- \`error(err)\` — терминальный, максимум 1 раз;
- \`complete()\` — терминальный, максимум 1 раз.

**Грамматика**: \`next* (error | complete)?\`. После \`error\`/\`complete\` значения не приходят, и срабатывает teardown.

\`\`\`ts
const obs = new Observable<number>((subscriber) => {
  subscriber.next(1);
  subscriber.complete();
  subscriber.next(2); // проигнорировано
  return () => console.log('teardown');
});
\`\`\`

\`Subscriber\` — это «безопасная» обёртка над Observer: он гарантирует контракт, ловит исключения и вызывает teardown.`,
      en: `## What an Observable is

An \`Observable\` is essentially a wrapper around a subscribe function. The constructor takes \`(subscriber) => teardown\`, which **does not run** until someone calls \`subscribe()\`.

## Laziness

- An Observable by itself is just a **recipe** — a description of a stream, not running code.
- The logic inside \`new Observable(fn)\` re-runs on **every** subscription.
- That is why an Angular HTTP request is not fired until you subscribe (or the \`async\` pipe subscribes).

## Unicast

- Each subscription creates a **separate** execution of the chain. Two subscribers means two independent runs.
- This is the opposite of a Subject (multicast), where one source is shared among many.

## The Observer contract

An Observer is an object with methods:

- \`next(value)\` — 0..N times;
- \`error(err)\` — terminal, at most once;
- \`complete()\` — terminal, at most once.

**Grammar**: \`next* (error | complete)?\`. After \`error\`/\`complete\` no more values flow and teardown runs.

\`\`\`ts
const obs = new Observable<number>((subscriber) => {
  subscriber.next(1);
  subscriber.complete();
  subscriber.next(2); // ignored
  return () => console.log('teardown');
});
\`\`\`

A \`Subscriber\` is a "safe" wrapper around the Observer: it enforces the contract, catches exceptions, and triggers teardown.`
    }
  },
  {
    id: 'rxjs-002',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['teardown', 'subscription', 'memory-leak'],
    question: {
      ru: 'Как работает teardown-логика и почему так важно её возвращать из функции подписки?',
      en: 'How does teardown logic work and why is it important to return it from the subscribe function?'
    },
    answer: {
      ru: `## Что такое teardown

Функция, которую вы возвращаете из \`new Observable(subscriber => { ... return teardown })\`, вызывается, когда:

- подписчик вызвал \`unsubscribe()\`;
- источник завершился через \`complete()\`;
- источник упал через \`error()\`.

Teardown — это место для **освобождения ресурсов**: \`clearInterval\`, \`removeEventListener\`, закрытия WebSocket, отмены запроса.

## Под капотом

\`Subscription\` хранит список «финализаторов». Оператор \`pipe\` создаёт цепочку подписок: внешняя подписка добавляет внутреннюю как child. При \`unsubscribe()\` родителя рекурсивно отписываются все потомки — так teardown распространяется вниз по всей цепочке операторов.

\`\`\`ts
const timer$ = new Observable<number>((sub) => {
  let i = 0;
  const id = setInterval(() => sub.next(i++), 1000);
  return () => clearInterval(id); // обязательно!
});
const s = timer$.subscribe(console.log);
setTimeout(() => s.unsubscribe(), 3500); // остановит interval
\`\`\`

## Почему это критично

- Без teardown \`setInterval\`/слушатель продолжат работать после отписки → **утечка памяти** и «фантомные» эмиссии.
- Subscriber после отписки игнорирует \`next\`, но **сам источник** (таймер) не остановится сам — его должен остановить ваш teardown.
- Идемпотентность: повторный \`unsubscribe()\` безопасен, teardown выполнится один раз.`,
      en: `## What teardown is

The function you return from \`new Observable(subscriber => { ... return teardown })\` is invoked when:

- the subscriber calls \`unsubscribe()\`;
- the source completes via \`complete()\`;
- the source errors via \`error()\`.

Teardown is where you **release resources**: \`clearInterval\`, \`removeEventListener\`, closing a WebSocket, cancelling a request.

## Under the hood

A \`Subscription\` holds a list of "finalizers". The \`pipe\` operator builds a chain of subscriptions: the outer subscription adds the inner one as a child. On \`unsubscribe()\` of the parent, all children are recursively unsubscribed — so teardown propagates down the whole operator chain.

\`\`\`ts
const timer$ = new Observable<number>((sub) => {
  let i = 0;
  const id = setInterval(() => sub.next(i++), 1000);
  return () => clearInterval(id); // mandatory!
});
const s = timer$.subscribe(console.log);
setTimeout(() => s.unsubscribe(), 3500); // stops the interval
\`\`\`

## Why it matters

- Without teardown the \`setInterval\`/listener keeps running after unsubscription → **memory leak** and "phantom" emissions.
- After unsubscribing, the Subscriber ignores \`next\`, but the **source itself** (the timer) will not stop on its own — your teardown must stop it.
- Idempotency: a repeated \`unsubscribe()\` is safe; teardown runs exactly once.`
    },
    codeSnippet: `// Pattern: a custom Observable that wraps a browser API safely
function fromResize(el: Element): Observable<DOMRectReadOnly> {
  return new Observable((subscriber) => {
    const ro = new ResizeObserver((entries) => {
      subscriber.next(entries[0].contentRect);
    });
    ro.observe(el);
    // teardown: disconnect when the last subscriber leaves
    return () => ro.disconnect();
  });
}`
  },
  {
    id: 'rxjs-003',
    category: 'rxjs-state',
    level: 'Medium',
    tags: ['hot-cold', 'multicasting'],
    question: {
      ru: 'В чём разница между hot и cold Observable? Как сделать cold-поток горячим?',
      en: 'What is the difference between hot and cold Observables? How do you make a cold stream hot?'
    },
    answer: {
      ru: `## Cold Observable

- Источник данных создаётся **внутри** Observable и **заново на каждую подписку**.
- Каждый подписчик получает свою «копию» потока с самого начала.
- Примеры: \`of\`, \`from\`, \`HttpClient.get\`, \`interval\`.

## Hot Observable

- Источник данных существует **вне** Observable и **разделяется** между подписчиками.
- Подписчики получают значения «с того момента, как подключились» (могут пропустить ранние эмиссии).
- Примеры: \`Subject\`, \`fromEvent(document, 'click')\`, WebSocket.

## Аналогия

Cold — это фильм на Netflix: каждый смотрит с начала. Hot — прямой эфир: подключился позже — пропустил начало.

## Как сделать cold горячим

Через **multicasting** — поделить одно выполнение источника между подписчиками:

\`\`\`ts
const cold$ = interval(1000);
const hot$ = cold$.pipe(share()); // refCount-мультикаст

// все подписчики разделяют один interval
hot$.subscribe(x => console.log('A', x));
setTimeout(() => hot$.subscribe(x => console.log('B', x)), 2500);
\`\`\`

Операторы \`share()\`, \`shareReplay()\`, \`connectable()\` и (устаревший) \`multicast()\` подключают \`Subject\` между источником и подписчиками. Источник запускается один раз, а \`Subject\` раздаёт значения всем — это и превращает cold в hot.`,
      en: `## Cold Observable

- The data producer is created **inside** the Observable and **anew on each subscription**.
- Each subscriber gets its own "copy" of the stream from the beginning.
- Examples: \`of\`, \`from\`, \`HttpClient.get\`, \`interval\`.

## Hot Observable

- The data producer lives **outside** the Observable and is **shared** among subscribers.
- Subscribers receive values "from the moment they connect" (they may miss early emissions).
- Examples: \`Subject\`, \`fromEvent(document, 'click')\`, a WebSocket.

## Analogy

Cold is a movie on Netflix: everyone watches from the start. Hot is a live broadcast: connect late and you missed the beginning.

## How to make cold hot

Through **multicasting** — sharing a single execution of the source among subscribers:

\`\`\`ts
const cold$ = interval(1000);
const hot$ = cold$.pipe(share()); // refCount multicast

// all subscribers share one interval
hot$.subscribe(x => console.log('A', x));
setTimeout(() => hot$.subscribe(x => console.log('B', x)), 2500);
\`\`\`

Operators \`share()\`, \`shareReplay()\`, \`connectable()\` and the (deprecated) \`multicast()\` insert a \`Subject\` between source and subscribers. The source runs once and the \`Subject\` fans values out to everyone — that is what turns cold into hot.`
    }
  },
  {
    id: 'rxjs-004',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['subjects', 'behaviorsubject', 'replaysubject'],
    question: {
      ru: 'Сравните Subject, BehaviorSubject, ReplaySubject и AsyncSubject. Когда какой использовать?',
      en: 'Compare Subject, BehaviorSubject, ReplaySubject, and AsyncSubject. When do you use each?'
    },
    answer: {
      ru: `Subject — это одновременно Observable и Observer: он multicast и hot.

## Subject

- Нет начального значения и буфера.
- Новый подписчик видит только эмиссии **после** подписки.
- Применение: шина событий, EventEmitter-подобные сценарии.

## BehaviorSubject

- Требует **начальное значение**, хранит «текущее».
- Новый подписчик сразу получает последнее значение.
- Есть синхронный геттер \`.value\`.
- Применение: **состояние** (текущий пользователь, текущая тема). Основа простого state-сервиса.

## ReplaySubject

- Буферизует последние \`bufferSize\` значений (и опционально \`windowTime\`).
- Новый подписчик получает весь буфер.
- Применение: кэш последних N событий; «догнать» поздних подписчиков.
- **Осторожно**: большой буфер = удержание ссылок = утечка.

## AsyncSubject

- Эмитит **только последнее** значение и **только при complete()**.
- Применение: результат «однократной» операции, аналог промиса.

\`\`\`ts
const b = new BehaviorSubject(0);
b.subscribe(v => console.log('A', v)); // A 0
b.next(1);                              // A 1
b.subscribe(v => console.log('B', v)); // B 1 (последнее)

const a = new AsyncSubject<number>();
a.subscribe(v => console.log('async', v));
a.next(1); a.next(2); a.complete();     // async 2
\`\`\`

**Выбор**: состояние → BehaviorSubject; события → Subject; replay-кэш → ReplaySubject; финальный результат → AsyncSubject.`,
      en: `A Subject is both an Observable and an Observer: it is multicast and hot.

## Subject

- No initial value and no buffer.
- A new subscriber only sees emissions **after** subscribing.
- Use: event bus, EventEmitter-like scenarios.

## BehaviorSubject

- Requires an **initial value**, holds the "current" one.
- A new subscriber immediately receives the latest value.
- Has a synchronous \`.value\` getter.
- Use: **state** (current user, current theme). The basis of a simple state service.

## ReplaySubject

- Buffers the last \`bufferSize\` values (and optionally a \`windowTime\`).
- A new subscriber receives the whole buffer.
- Use: cache of the last N events; let late subscribers "catch up".
- **Caution**: a large buffer = held references = leak.

## AsyncSubject

- Emits **only the last** value and **only on complete()**.
- Use: result of a "one-shot" operation, promise-like.

\`\`\`ts
const b = new BehaviorSubject(0);
b.subscribe(v => console.log('A', v)); // A 0
b.next(1);                              // A 1
b.subscribe(v => console.log('B', v)); // B 1 (latest)

const a = new AsyncSubject<number>();
a.subscribe(v => console.log('async', v));
a.next(1); a.next(2); a.complete();     // async 2
\`\`\`

**Choice**: state → BehaviorSubject; events → Subject; replay cache → ReplaySubject; final result → AsyncSubject.`
    }
  },
  {
    id: 'rxjs-005',
    category: 'rxjs-state',
    level: 'Expert',
    tags: ['sharereplay', 'multicasting', 'memory-leak'],
    question: {
      ru: 'Какие подводные камни у shareReplay? Объясните refCount, буфер и риск утечки.',
      en: 'What are the pitfalls of shareReplay? Explain refCount, the buffer, and the leak risk.'
    },
    answer: {
      ru: `## Что делает shareReplay

\`shareReplay\` мультикастит источник через \`ReplaySubject\` и **повторяет** буфер для новых подписчиков. Удобен для кэширования HTTP-ответа.

## Проблема refCount по умолчанию

В старых версиях \`shareReplay(n)\` имел \`refCount: false\` — это значит, что даже когда **все** отписались, подписка на источник **не закрывалась**. Если источник — это \`interval\` или WebSocket, он продолжал работать вечно → **утечка**.

Решение — явный объект конфигурации:

\`\`\`ts
source$.pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);
\`\`\`

При \`refCount: true\` источник отписывается, когда счётчик подписчиков падает до нуля, и переподписывается заново при появлении нового подписчика.

## Буфер удерживает значения

\`ReplaySubject\` внутри держит \`bufferSize\` значений в памяти **на всё время жизни**. Большой буфер → удержание тяжёлых объектов.

## Тонкость кэширования

- С \`refCount: true\` после ухода всех подписчиков буфер **теряется**, и следующий подписчик заново запустит запрос. Это не «вечный кэш».
- Если нужен вечный кэш одного значения, держите \`refCount: false\`, но осознанно (источник должен завершаться, напр. HTTP — он \`complete\`-ится).

## Правило

- Кэш HTTP (источник завершается): \`shareReplay({ bufferSize: 1, refCount: false })\` приемлем.
- Бесконечный источник (interval/WS): **обязательно** \`refCount: true\`, иначе утечка.`,
      en: `## What shareReplay does

\`shareReplay\` multicasts the source through a \`ReplaySubject\` and **replays** the buffer to new subscribers. Handy for caching an HTTP response.

## The default refCount problem

In older versions \`shareReplay(n)\` had \`refCount: false\` — meaning that even when **everyone** unsubscribed, the source subscription **stayed open**. If the source is an \`interval\` or WebSocket, it kept running forever → **leak**.

The fix is an explicit config object:

\`\`\`ts
source$.pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);
\`\`\`

With \`refCount: true\` the source unsubscribes when the subscriber count drops to zero and resubscribes when a new subscriber appears.

## The buffer holds values

The internal \`ReplaySubject\` keeps \`bufferSize\` values in memory **for its whole lifetime**. A large buffer → retaining heavy objects.

## Caching subtlety

- With \`refCount: true\`, once all subscribers leave the buffer is **lost** and the next subscriber re-runs the request. This is not an "eternal cache".
- If you want an eternal cache of a single value, keep \`refCount: false\` — but deliberately (the source must complete, e.g. HTTP does \`complete\`).

## Rule of thumb

- HTTP cache (source completes): \`shareReplay({ bufferSize: 1, refCount: false })\` is acceptable.
- Infinite source (interval/WS): **always** \`refCount: true\`, otherwise you leak.`
    }
  },
  {
    id: 'rxjs-006',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['switchmap', 'mergemap', 'concatmap', 'exhaustmap'],
    question: {
      ru: 'Сравните switchMap, mergeMap, concatMap и exhaustMap. Когда какой и какова семантика отмены?',
      en: 'Compare switchMap, mergeMap, concatMap, and exhaustMap. When do you use each and what are the cancellation semantics?'
    },
    answer: {
      ru: `Все четыре — **higher-order mapping** операторы: проецируют каждое внешнее значение в внутренний Observable и «уплощают» результат. Разница — в стратегии управления конкурентными внутренними потоками.

## switchMap

- При новом внешнем значении **отменяет** (unsubscribe) предыдущий внутренний поток и подписывается на новый.
- Семантика: «нужен только последний».
- Применение: **typeahead/поиск**, навигация по route-параметрам. Отменяет устаревший запрос.

## mergeMap (flatMap)

- Запускает все внутренние потоки **параллельно**, ничего не отменяет, эмиссии чередуются.
- Можно ограничить конкуррентность: \`mergeMap(fn, concurrency)\`.
- Применение: независимые параллельные операции (загрузка файлов).
- **Риск**: порядок не гарантирован; при быстром источнике — лавина запросов.

## concatMap

- Очередь: следующий внутренний поток стартует **только после complete** предыдущего.
- Гарантирует **порядок**.
- Применение: последовательные записи, где важна очерёдность (логи, транзакции).

## exhaustMap

- Пока активен внутренний поток, новые внешние значения **игнорируются**.
- Применение: кнопка **«Сохранить»/login** — защита от двойного клика.

\`\`\`ts
// typeahead: отменяем устаревший запрос
input$.pipe(
  debounceTime(200),
  switchMap(q => api.search(q))
);
\`\`\`

**Память**: switchMap отменяет, поэтому безопаснее всего против утечек; mergeMap без ограничения — самый рискованный.`,
      en: `All four are **higher-order mapping** operators: they project each outer value into an inner Observable and flatten the result. The difference is the strategy for managing concurrent inner streams.

## switchMap

- On a new outer value it **cancels** (unsubscribes) the previous inner stream and subscribes to the new one.
- Semantics: "only the latest matters".
- Use: **typeahead/search**, route-param navigation. Cancels the stale request.

## mergeMap (flatMap)

- Runs all inner streams **in parallel**, cancels nothing, emissions interleave.
- You can cap concurrency: \`mergeMap(fn, concurrency)\`.
- Use: independent parallel operations (file uploads).
- **Risk**: order is not guaranteed; with a fast source you get a flood of requests.

## concatMap

- A queue: the next inner stream starts **only after the previous completes**.
- Guarantees **order**.
- Use: sequential writes where ordering matters (logs, transactions).

## exhaustMap

- While an inner stream is active, new outer values are **ignored**.
- Use: a **Save/login** button — protection against double clicks.

\`\`\`ts
// typeahead: cancel the stale request
input$.pipe(
  debounceTime(200),
  switchMap(q => api.search(q))
);
\`\`\`

**Memory**: switchMap cancels, so it is the safest against leaks; unbounded mergeMap is the riskiest.`
    }
  },
  {
    id: 'rxjs-007',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['combinelatest', 'forkjoin', 'zip', 'withlatestfrom'],
    question: {
      ru: 'Сравните combineLatest, forkJoin, withLatestFrom и zip. В чём ключевые отличия?',
      en: 'Compare combineLatest, forkJoin, withLatestFrom, and zip. What are the key differences?'
    },
    answer: {
      ru: `## combineLatest

- Эмитит массив **последних** значений каждого источника **при любой** эмиссии любого источника.
- Не эмитит, пока **каждый** источник не выдал хотя бы одно значение.
- Применение: реактивная форма из нескольких потоков (фильтры + сортировка).

## forkJoin

- Ждёт **complete** всех источников и эмитит **последние** значения **один раз**.
- Аналог \`Promise.all\`.
- **Важно**: если источник не завершается — forkJoin никогда не эмитит. Если хоть один упал — общий error.
- Применение: параллельные HTTP-запросы при инициализации.

## withLatestFrom

- Эмитит, когда эмитит **первичный** источник, добавляя последние значения остальных.
- Вторичные источники **не триггерят** эмиссию.
- Применение: «при клике возьми текущее значение формы».

## zip

- Объединяет значения **по индексу**: 1-е с 1-м, 2-е со 2-м.
- Идёт по «самому медленному», буферизует быстрые.
- Применение: строгое попарное сопоставление (редко; буфер может расти).

\`\`\`ts
// withLatestFrom: текущее значение фильтра при сабмите
submit$.pipe(
  withLatestFrom(filters$),
  switchMap(([_, filters]) => api.load(filters))
);
\`\`\`

**Частая ошибка**: использовать forkJoin для бесконечных потоков — он никогда не сработает. Для «снимка последних значений» по триггеру — \`withLatestFrom\`.`,
      en: `## combineLatest

- Emits an array of the **latest** values of every source **on any** emission of any source.
- Does not emit until **each** source has produced at least one value.
- Use: a reactive view assembled from several streams (filters + sort).

## forkJoin

- Waits for **complete** of all sources and emits the **last** values **once**.
- Analogous to \`Promise.all\`.
- **Important**: if a source never completes, forkJoin never emits. If any errors, the whole thing errors.
- Use: parallel HTTP requests at initialization.

## withLatestFrom

- Emits when the **primary** source emits, attaching the latest values of the others.
- Secondary sources do **not trigger** an emission.
- Use: "on click, take the current form value".

## zip

- Combines values **by index**: 1st with 1st, 2nd with 2nd.
- Paces by the "slowest", buffering the faster ones.
- Use: strict pairwise matching (rare; the buffer can grow).

\`\`\`ts
// withLatestFrom: current filter value on submit
submit$.pipe(
  withLatestFrom(filters$),
  switchMap(([_, filters]) => api.load(filters))
);
\`\`\`

**Common mistake**: using forkJoin on infinite streams — it never fires. For a "snapshot of latest values" on a trigger, use \`withLatestFrom\`.`
    }
  },
  {
    id: 'rxjs-008',
    category: 'rxjs-state',
    level: 'Medium',
    tags: ['merge', 'concat', 'combination'],
    question: {
      ru: 'Чем merge отличается от concat? Когда каждый уместен?',
      en: 'How does merge differ from concat? When is each appropriate?'
    },
    answer: {
      ru: `## merge

- Подписывается на **все** источники сразу и эмитит значения по мере поступления (interleaved).
- Завершается, когда завершились **все**.
- Применение: объединить несколько источников событий (клики из разных кнопок, несколько WebSocket-каналов).

## concat

- Подписывается на источники **по очереди**: следующий стартует только после \`complete\` предыдущего.
- Сохраняет **порядок** источников.
- **Важно**: если первый источник бесконечен, до второго очередь **никогда** не дойдёт.
- Применение: сначала закэшированные данные, затем сетевые; последовательные шаги.

\`\`\`ts
// merge: все события в один поток
merge(saveClicks$, autoSave$).subscribe(triggerSave);

// concat: сначала локальный кэш, потом сервер
concat(cache$, network$).subscribe(render);
\`\`\`

## Аналогия

- \`merge\` — несколько труб сливаются в одну, всё течёт одновременно.
- \`concat\` — труба за трубой, строго последовательно.

## Связь с операторами

\`mergeMap\` относится к \`merge\`, как \`concatMap\` — к \`concat\`: те же стратегии конкурентности, но для higher-order проекции.`,
      en: `## merge

- Subscribes to **all** sources at once and emits values as they arrive (interleaved).
- Completes when **all** have completed.
- Use: combine several event sources (clicks from different buttons, multiple WebSocket channels).

## concat

- Subscribes to sources **one at a time**: the next starts only after the previous \`complete\`.
- Preserves the **order** of sources.
- **Important**: if the first source is infinite, the second is **never** reached.
- Use: cached data first, then network; sequential steps.

\`\`\`ts
// merge: all events into one stream
merge(saveClicks$, autoSave$).subscribe(triggerSave);

// concat: local cache first, then server
concat(cache$, network$).subscribe(render);
\`\`\`

## Analogy

- \`merge\` — several pipes feeding one, everything flowing at once.
- \`concat\` — pipe after pipe, strictly sequential.

## Relationship to operators

\`mergeMap\` is to \`merge\` what \`concatMap\` is to \`concat\`: the same concurrency strategies, but for higher-order projection.`
    }
  },
  {
    id: 'rxjs-009',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['error-handling', 'catcherror', 'retry'],
    question: {
      ru: 'Как работает обработка ошибок в RxJS? Объясните catchError, retry и перезапуск потока.',
      en: 'How does error handling work in RxJS? Explain catchError, retry, and restarting a stream.'
    },
    answer: {
      ru: `## Ошибка — терминальное событие

\`error\` завершает поток: после него не будет \`next\`/\`complete\`, и срабатывает teardown. Если ошибку не обработать — она «всплывает» и в Angular попадёт в \`ErrorHandler\`.

## catchError

Перехватывает ошибку и **возвращает новый Observable** (восстановление) или пробрасывает дальше.

\`\`\`ts
api.load().pipe(
  catchError(err => {
    if (err.status === 404) return of(EMPTY_RESULT); // восстановление
    return throwError(() => err);                    // проброс
  })
);
\`\`\`

**Гнездование**: чтобы один упавший внутренний запрос не убил внешний поток, ставьте \`catchError\` **внутри** higher-order оператора:

\`\`\`ts
items$.pipe(
  mergeMap(id => api.get(id).pipe(catchError(() => of(null))))
);
\`\`\`

## retry

\`retry(n)\` переподписывается на источник при ошибке до \`n\` раз. Поскольку источник cold — он **запускается заново** (повтор запроса).

## retry с задержкой

Современный API: \`retry({ count, delay })\`. \`delay\` может быть числом (мс) или функцией, возвращающей Observable (для экспоненциального backoff):

\`\`\`ts
retry({
  count: 3,
  delay: (err, retryCount) => timer(2 ** retryCount * 500)
});
\`\`\`

Это замена устаревшего \`retryWhen\`. Важно: \`retry\` повторяет **весь** источник, поэтому побочные эффекты выполнятся снова.`,
      en: `## Error is a terminal event

\`error\` ends the stream: no \`next\`/\`complete\` follow it, and teardown runs. If unhandled, it "bubbles up" and in Angular lands in the \`ErrorHandler\`.

## catchError

Intercepts the error and **returns a new Observable** (recovery) or rethrows.

\`\`\`ts
api.load().pipe(
  catchError(err => {
    if (err.status === 404) return of(EMPTY_RESULT); // recover
    return throwError(() => err);                    // rethrow
  })
);
\`\`\`

**Nesting**: so a single failing inner request does not kill the outer stream, place \`catchError\` **inside** the higher-order operator:

\`\`\`ts
items$.pipe(
  mergeMap(id => api.get(id).pipe(catchError(() => of(null))))
);
\`\`\`

## retry

\`retry(n)\` resubscribes to the source on error up to \`n\` times. Since the source is cold it is **re-run** (the request repeats).

## retry with delay

Modern API: \`retry({ count, delay })\`. \`delay\` may be a number (ms) or a function returning an Observable (for exponential backoff):

\`\`\`ts
retry({
  count: 3,
  delay: (err, retryCount) => timer(2 ** retryCount * 500)
});
\`\`\`

This replaces the deprecated \`retryWhen\`. Note: \`retry\` repeats the **whole** source, so side effects run again.`
    }
  },
  {
    id: 'rxjs-010',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['retrywhen', 'backoff', 'error-handling'],
    question: {
      ru: 'Как реализовать экспоненциальный backoff и почему retryWhen считается устаревшим?',
      en: 'How do you implement exponential backoff, and why is retryWhen considered deprecated?'
    },
    answer: {
      ru: `## retryWhen и его проблема

\`retryWhen(notifier => ...)\` принимал поток ошибок и решал, когда переподписаться. Проблема: он **сложен и неинтуитивен** — легко создать бесконечный цикл повторов или потерять оригинальную ошибку, забыв пробросить её при исчерпании попыток. Поэтому в RxJS 7.x его пометили как deprecated в пользу \`retry({ delay })\`.

## Современный backoff

\`\`\`ts
import { retry, timer, throwError } from 'rxjs';

api.load().pipe(
  retry({
    count: 4,
    delay: (error, retryCount) => {
      if (error.status >= 500) {
        // экспоненциальный backoff с джиттером
        const base = Math.min(1000 * 2 ** (retryCount - 1), 30_000);
        const jitter = Math.random() * 300;
        return timer(base + jitter);
      }
      // 4xx — не повторяем, пробрасываем ошибку
      return throwError(() => error);
    }
  })
);
\`\`\`

## Ключевые идеи

- **Backoff**: задержка растёт экспоненциально (\`2 ** n\`), чтобы не «забивать» падающий сервер.
- **Jitter**: случайная добавка предотвращает «thundering herd», когда все клиенты ретраят синхронно.
- **Селективность**: повторяем только восстановимые ошибки (5xx, network), 4xx — пробрасываем.
- **Cap**: ограничиваем максимальную задержку.

## Когда всё равно retryWhen

Если нужен повтор, синхронизированный с внешним событием (например, повтор после возврата онлайна — \`fromEvent(window, 'online')\`), функция-\`delay\` всё ещё это покрывает, возвращая нужный Observable-«сигнал».`,
      en: `## retryWhen and its problem

\`retryWhen(notifier => ...)\` took a stream of errors and decided when to resubscribe. The problem: it is **complex and unintuitive** — it is easy to create an infinite retry loop or lose the original error by forgetting to rethrow when attempts are exhausted. So in RxJS 7.x it was deprecated in favor of \`retry({ delay })\`.

## Modern backoff

\`\`\`ts
import { retry, timer, throwError } from 'rxjs';

api.load().pipe(
  retry({
    count: 4,
    delay: (error, retryCount) => {
      if (error.status >= 500) {
        // exponential backoff with jitter
        const base = Math.min(1000 * 2 ** (retryCount - 1), 30_000);
        const jitter = Math.random() * 300;
        return timer(base + jitter);
      }
      // 4xx — do not retry, rethrow
      return throwError(() => error);
    }
  })
);
\`\`\`

## Key ideas

- **Backoff**: the delay grows exponentially (\`2 ** n\`) to avoid hammering a failing server.
- **Jitter**: a random addition prevents a "thundering herd" where all clients retry in sync.
- **Selectivity**: retry only recoverable errors (5xx, network), rethrow 4xx.
- **Cap**: bound the maximum delay.

## When retryWhen-style is still needed

If you need retry synchronized with an external event (e.g. retry after coming back online — \`fromEvent(window, 'online')\`), the \`delay\` function still covers it by returning the appropriate Observable "signal".`
    }
  },
  {
    id: 'rxjs-011',
    category: 'rxjs-state',
    level: 'Medium',
    tags: ['finalize', 'teardown', 'cleanup'],
    question: {
      ru: 'Что делает finalize и чем он отличается от complete-колбэка и tap?',
      en: 'What does finalize do and how does it differ from a complete callback and tap?'
    },
    answer: {
      ru: `## finalize

\`finalize(fn)\` выполняет \`fn\` **один раз** при **любом** завершении подписки:

- \`complete()\`;
- \`error()\`;
- \`unsubscribe()\`.

Это «\`finally\` для потока» — идеален для очистки UI-состояния: скрыть спиннер, разблокировать кнопку.

\`\`\`ts
this.loading = true;
api.load().pipe(
  finalize(() => this.loading = false) // сработает в любом случае
).subscribe({ next: ..., error: ... });
\`\`\`

## Отличие от complete-колбэка

Колбэк \`complete\` в \`subscribe\` вызывается **только** при успешном завершении — не при error и не при отписке. Поэтому спиннер, скрытый только в \`complete\`, «зависнет» при ошибке.

## Отличие от tap

\`tap({ complete })\` тоже не покрывает unsubscribe и требует отдельной ветки error. \`finalize\` — единая точка для всех трёх случаев.

## Тонкости порядка

- \`finalize\` срабатывает **после** доставки финального уведомления (complete/error) подписчику.
- При нескольких \`finalize\` в pipe порядок вызова — снизу вверх (внутренние раньше).
- В сочетании с \`takeUntil\` для отписки \`finalize\` тоже сработает — это удобно для логирования «поток закрыт».`,
      en: `## finalize

\`finalize(fn)\` runs \`fn\` **once** on **any** termination of the subscription:

- \`complete()\`;
- \`error()\`;
- \`unsubscribe()\`.

It is the "\`finally\` for a stream" — ideal for cleaning up UI state: hide a spinner, re-enable a button.

\`\`\`ts
this.loading = true;
api.load().pipe(
  finalize(() => this.loading = false) // runs no matter what
).subscribe({ next: ..., error: ... });
\`\`\`

## Difference from the complete callback

The \`complete\` callback in \`subscribe\` runs **only** on successful completion — not on error and not on unsubscribe. So a spinner hidden only in \`complete\` will "hang" on error.

## Difference from tap

\`tap({ complete })\` also does not cover unsubscribe and needs a separate error branch. \`finalize\` is a single point for all three cases.

## Ordering subtleties

- \`finalize\` runs **after** the final notification (complete/error) is delivered to the subscriber.
- With multiple \`finalize\` in a pipe, the call order is bottom-up (inner ones first).
- Combined with \`takeUntil\` for unsubscription, \`finalize\` still runs — handy for logging "stream closed".`
    }
  },
  {
    id: 'rxjs-012',
    category: 'rxjs-state',
    level: 'Expert',
    tags: ['schedulers', 'subscribeon', 'observeon'],
    question: {
      ru: 'Что такое schedulers в RxJS? Сравните asap, async, queue, animationFrame и subscribeOn vs observeOn.',
      en: 'What are schedulers in RxJS? Compare asap, async, queue, animationFrame and subscribeOn vs observeOn.'
    },
    answer: {
      ru: `## Что такое scheduler

Scheduler контролирует **когда** и **в каком контексте** доставляются уведомления — абстракция над «выполнить работу». Управляет конкурентностью и таймингом.

## Виды

- **queueScheduler** — синхронно, но через очередь (предотвращает переполнение стека при рекурсии). По умолчанию синхронный.
- **asapScheduler** — микротаска (\`Promise.then\`/\`queueMicrotask\`). Выполнится после текущего синхронного кода, до таймеров.
- **asyncScheduler** — макротаска (\`setTimeout\`/\`setInterval\`). Используется \`delay\`, \`interval\`, \`timer\`.
- **animationFrameScheduler** — \`requestAnimationFrame\`. Для плавных анимаций, синхронизированных с repaint.

\`\`\`ts
of(1, 2, 3, queueScheduler).subscribe(...); // синхронно, упорядоченно
of('async').pipe(observeOn(asapScheduler));  // в микротаске
\`\`\`

## subscribeOn vs observeOn

- **subscribeOn(scheduler)** — определяет, в каком контексте произойдёт сама **подписка** (запуск источника). Влияет на «начало» — где выполнится код подписки.
- **observeOn(scheduler)** — определяет, в каком контексте доставляются **уведомления** (\`next\`/\`error\`/\`complete\`) **ниже** по цепочке. Влияет на «после».

\`\`\`ts
source$.pipe(
  subscribeOn(asyncScheduler), // подписка отложена
  map(heavyTransform),
  observeOn(animationFrameScheduler) // эмиссии — в rAF
);
\`\`\`

## Зачем

- Разбить тяжёлую синхронную работу на чанки, не блокируя UI.
- Контролировать порядок выполнения (микро- vs макро-таски).
- В тестах — \`TestScheduler\` для виртуального времени и marble-тестов.`,
      en: `## What a scheduler is

A scheduler controls **when** and **in what context** notifications are delivered — an abstraction over "do this work". It governs concurrency and timing.

## Kinds

- **queueScheduler** — synchronous, but via a queue (prevents stack overflow on recursion). Synchronous by default.
- **asapScheduler** — a microtask (\`Promise.then\`/\`queueMicrotask\`). Runs after the current synchronous code, before timers.
- **asyncScheduler** — a macrotask (\`setTimeout\`/\`setInterval\`). Used by \`delay\`, \`interval\`, \`timer\`.
- **animationFrameScheduler** — \`requestAnimationFrame\`. For smooth animations synced with repaint.

\`\`\`ts
of(1, 2, 3, queueScheduler).subscribe(...); // synchronous, ordered
of('async').pipe(observeOn(asapScheduler));  // in a microtask
\`\`\`

## subscribeOn vs observeOn

- **subscribeOn(scheduler)** — determines the context in which the **subscription** itself (source start) happens. It affects the "beginning" — where the subscribe code runs.
- **observeOn(scheduler)** — determines the context in which **notifications** (\`next\`/\`error\`/\`complete\`) are delivered **downstream**. It affects the "after".

\`\`\`ts
source$.pipe(
  subscribeOn(asyncScheduler), // subscription deferred
  map(heavyTransform),
  observeOn(animationFrameScheduler) // emissions in rAF
);
\`\`\`

## Why

- Break heavy synchronous work into chunks without blocking the UI.
- Control execution order (micro- vs macro-tasks).
- In tests — \`TestScheduler\` for virtual time and marble tests.`
    }
  },
  {
    id: 'rxjs-013',
    category: 'rxjs-state',
    level: 'Expert',
    tags: ['custom-operator', 'operatorfunction', 'pipe'],
    question: {
      ru: 'Как написать собственный оператор RxJS? Объясните OperatorFunction и использование pipe.',
      en: 'How do you write a custom RxJS operator? Explain OperatorFunction and the use of pipe.'
    },
    answer: {
      ru: `## Оператор — это функция

Оператор RxJS — это функция типа \`OperatorFunction<T, R>\`, то есть \`(source: Observable<T>) => Observable<R>\`. Метод \`.pipe()\` просто прогоняет источник через цепочку таких функций.

## Способ 1: композиция существующих операторов

Самый простой и предпочтительный — собрать новый оператор из готовых через \`pipe\`:

\`\`\`ts
function debounceAndDistinct<T>(ms: number): OperatorFunction<T, T> {
  return pipe(
    debounceTime(ms),
    distinctUntilChanged()
  );
}
// использование
input$.pipe(debounceAndDistinct(300));
\`\`\`

## Способ 2: «с нуля» через new Observable

Когда нужна нестандартная логика, возвращаем функцию, создающую новый Observable вручную:

\`\`\`ts
function tapOnce<T>(fn: (v: T) => void): MonoTypeOperatorFunction<T> {
  return (source) => new Observable<T>((subscriber) => {
    let done = false;
    const sub = source.subscribe({
      next: (v) => {
        if (!done) { done = true; fn(v); }
        subscriber.next(v);
      },
      error: (e) => subscriber.error(e),
      complete: () => subscriber.complete()
    });
    return () => sub.unsubscribe(); // teardown!
  });
}
\`\`\`

## Что важно не забыть

- **Проксировать** все три уведомления (\`next\`/\`error\`/\`complete\`).
- **Вернуть teardown**, отписывающий от источника, иначе утечка.
- Сохранять **ленивость**: всё внутри \`new Observable\` запускается на подписку.
- \`MonoTypeOperatorFunction<T>\` — частный случай, когда тип не меняется.

Предпочитайте способ 1; «с нуля» — только когда композиции недостаточно.`,
      en: `## An operator is a function

An RxJS operator is a function of type \`OperatorFunction<T, R>\`, i.e. \`(source: Observable<T>) => Observable<R>\`. The \`.pipe()\` method simply runs the source through a chain of such functions.

## Way 1: composing existing operators

The simplest and preferred way — assemble a new operator from existing ones via \`pipe\`:

\`\`\`ts
function debounceAndDistinct<T>(ms: number): OperatorFunction<T, T> {
  return pipe(
    debounceTime(ms),
    distinctUntilChanged()
  );
}
// usage
input$.pipe(debounceAndDistinct(300));
\`\`\`

## Way 2: "from scratch" via new Observable

When you need non-standard logic, return a function that builds a new Observable manually:

\`\`\`ts
function tapOnce<T>(fn: (v: T) => void): MonoTypeOperatorFunction<T> {
  return (source) => new Observable<T>((subscriber) => {
    let done = false;
    const sub = source.subscribe({
      next: (v) => {
        if (!done) { done = true; fn(v); }
        subscriber.next(v);
      },
      error: (e) => subscriber.error(e),
      complete: () => subscriber.complete()
    });
    return () => sub.unsubscribe(); // teardown!
  });
}
\`\`\`

## What not to forget

- **Proxy** all three notifications (\`next\`/\`error\`/\`complete\`).
- **Return teardown** that unsubscribes from the source, otherwise you leak.
- Preserve **laziness**: everything inside \`new Observable\` runs on subscribe.
- \`MonoTypeOperatorFunction<T>\` is a special case where the type does not change.

Prefer Way 1; go "from scratch" only when composition is not enough.`
    }
  },
  {
    id: 'rxjs-014',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['memory-leak', 'takeuntil', 'unsubscription'],
    question: {
      ru: 'Какие есть стратегии отписки в Angular и как избежать утечек памяти?',
      en: 'What unsubscription strategies exist in Angular and how do you avoid memory leaks?'
    },
    answer: {
      ru: `## Откуда утечки

Если компонент уничтожен, но подписка жива, колбэки продолжают выполняться, удерживая ссылки на компонент → утечка памяти и баги. Особенно опасны **бесконечные** потоки (\`interval\`, \`fromEvent\`, \`BehaviorSubject\`); завершающиеся (HTTP) сами вызовут teardown.

## Стратегии

### 1. async pipe (предпочтительно)

\`\`\`html
<div>{{ data$ | async }}</div>
\`\`\`
Шаблон подписывается и **автоматически** отписывается при уничтожении. Минимум ручного кода.

### 2. takeUntilDestroyed (Angular 16+)

\`\`\`ts
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.stream$.pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(...);
}
\`\`\`
В контексте инъекции \`destroyRef\` можно опустить.

### 3. takeUntil + Subject (классика)

\`\`\`ts
private destroy$ = new Subject<void>();
ngOnInit() { this.s$.pipe(takeUntil(this.destroy$)).subscribe(); }
ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
\`\`\`
**Важно**: \`takeUntil\` должен быть **последним** в pipe, иначе операторы ниже могут пережить отписку.

### 4. Subscription.add / ручной unsubscribe

Собрать подписки в один \`Subscription\` и вызвать \`.unsubscribe()\` в \`ngOnDestroy\`. Многословно, легко забыть.

## Рекомендация

async pipe → takeUntilDestroyed → takeUntil. Ручной unsubscribe — последний выбор. Для Signals — \`toSignal\` сам управляет жизненным циклом.`,
      en: `## Where leaks come from

If a component is destroyed but the subscription is alive, callbacks keep running and hold references to the component → memory leak and bugs. **Infinite** streams are especially dangerous (\`interval\`, \`fromEvent\`, \`BehaviorSubject\`); completing ones (HTTP) trigger teardown themselves.

## Strategies

### 1. async pipe (preferred)

\`\`\`html
<div>{{ data$ | async }}</div>
\`\`\`
The template subscribes and **automatically** unsubscribes on destroy. Minimal manual code.

### 2. takeUntilDestroyed (Angular 16+)

\`\`\`ts
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.stream$.pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(...);
}
\`\`\`
In an injection context the \`destroyRef\` can be omitted.

### 3. takeUntil + Subject (classic)

\`\`\`ts
private destroy$ = new Subject<void>();
ngOnInit() { this.s$.pipe(takeUntil(this.destroy$)).subscribe(); }
ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
\`\`\`
**Important**: \`takeUntil\` must be **last** in the pipe, otherwise operators below it can outlive the unsubscription.

### 4. Subscription.add / manual unsubscribe

Collect subscriptions into one \`Subscription\` and call \`.unsubscribe()\` in \`ngOnDestroy\`. Verbose, easy to forget.

## Recommendation

async pipe → takeUntilDestroyed → takeUntil. Manual unsubscribe is the last resort. For Signals, \`toSignal\` manages the lifecycle itself.`
    }
  },
  {
    id: 'rxjs-015',
    category: 'rxjs-state',
    level: 'Medium',
    tags: ['debouncetime', 'throttletime', 'audittime', 'sampletime'],
    question: {
      ru: 'Сравните debounceTime, throttleTime, auditTime и sampleTime. Какой когда использовать?',
      en: 'Compare debounceTime, throttleTime, auditTime, and sampleTime. When do you use each?'
    },
    answer: {
      ru: `Все четыре управляют **темпом** (rate-limiting) быстрого потока, но по-разному выбирают, какое значение пропустить.

## debounceTime(ms)

- Эмитит значение, только если **прошло \`ms\` тишины** после него.
- При продолжающемся потоке откладывает эмиссию.
- Применение: **поиск по вводу** — ждём, пока пользователь перестанет печатать.
- Marble: \`a-b-c----| → ------c-|\`

## throttleTime(ms)

- Эмитит **первое** значение, затем игнорирует входящие \`ms\` миллисекунд.
- Применение: **обработка scroll/resize**, защита кнопки от частых кликов (мгновенная реакция + троттлинг).
- Marble: \`a-b-c-d-e| → a---d---|\` (leading)

## auditTime(ms)

- При значении ждёт \`ms\` и эмитит **последнее** на момент истечения окна.
- Похож на throttle, но эмитит **trailing** значение.
- Применение: «последнее значение раз в N мс».

## sampleTime(ms)

- Каждые \`ms\` эмитит **последнее** значение, если оно было (по таймеру, а не по событию).
- Применение: периодический снимок состояния потока.

\`\`\`ts
search$.pipe(debounceTime(300), distinctUntilChanged());
scroll$.pipe(throttleTime(100));
\`\`\`

## Кратко

- **debounce** — «подожди тишины» (последнее после паузы).
- **throttle** — «первое, потом игнор».
- **audit** — «последнее в конце окна».
- **sample** — «последнее по тику таймера».`,
      en: `All four control the **rate** of a fast stream, but differ in which value they let through.

## debounceTime(ms)

- Emits a value only if **\`ms\` of silence** passed after it.
- While the stream continues, it defers emission.
- Use: **search-as-you-type** — wait until the user stops typing.
- Marble: \`a-b-c----| → ------c-|\`

## throttleTime(ms)

- Emits the **first** value, then ignores incoming ones for \`ms\` milliseconds.
- Use: **scroll/resize handling**, button click protection (immediate reaction + throttling).
- Marble: \`a-b-c-d-e| → a---d---|\` (leading)

## auditTime(ms)

- On a value, waits \`ms\` and emits the **latest** value at window expiry.
- Like throttle but emits the **trailing** value.
- Use: "latest value once every N ms".

## sampleTime(ms)

- Every \`ms\` emits the **latest** value if any (driven by a timer, not by events).
- Use: a periodic snapshot of the stream's state.

\`\`\`ts
search$.pipe(debounceTime(300), distinctUntilChanged());
scroll$.pipe(throttleTime(100));
\`\`\`

## In brief

- **debounce** — "wait for silence" (latest after a pause).
- **throttle** — "first, then ignore".
- **audit** — "latest at window end".
- **sample** — "latest on a timer tick".`
    }
  },
  {
    id: 'rxjs-016',
    category: 'rxjs-state',
    level: 'Medium',
    tags: ['distinctuntilchanged', 'comparison'],
    question: {
      ru: 'Как работает distinctUntilChanged и какие подводные камни с объектами?',
      en: 'How does distinctUntilChanged work and what are the pitfalls with objects?'
    },
    answer: {
      ru: `## Поведение

\`distinctUntilChanged\` пропускает значение, только если оно **отличается от предыдущего** эмитированного. По умолчанию сравнение через \`Object.is\` (строгое).

\`\`\`ts
of(1, 1, 2, 2, 3, 1).pipe(distinctUntilChanged())
// → 1, 2, 3, 1
\`\`\`

Обратите внимание: фильтруется только **подряд идущее** дублирование. Повтор \`1\` в конце пройдёт, т.к. перед ним было \`3\`.

## Подводный камень с объектами

Объекты сравниваются **по ссылке**. Новый объект с теми же полями считается «другим»:

\`\`\`ts
state$.pipe(distinctUntilChanged())
// {a:1} !== {a:1} → пройдёт оба раза
\`\`\`

Если в потоке каждый раз новый объект (типично для immutable-обновлений), оператор не отфильтрует ничего.

## Решения

### Компаратор

\`\`\`ts
distinctUntilChanged((prev, curr) => prev.id === curr.id)
\`\`\`

### distinctUntilKeyChanged

\`\`\`ts
distinctUntilKeyChanged('id')
\`\`\`

### Сравнение по проекции

\`\`\`ts
distinctUntilChanged(
  (a, b) => a === b,
  (state) => state.user.name // эмитим только при смене имени
)
\`\`\`

## Зачем

- Убрать лишние эмиссии и перерисовки.
- В state-менеджменте селекторы NgRx тоже мемоизируют, но \`distinctUntilChanged\` полезен в самописных потоках состояния. Глубокое сравнение (\`isEqual\`) применяйте осторожно — оно дорого.`,
      en: `## Behavior

\`distinctUntilChanged\` lets a value through only if it **differs from the previously** emitted one. By default the comparison uses \`Object.is\` (strict).

\`\`\`ts
of(1, 1, 2, 2, 3, 1).pipe(distinctUntilChanged())
// → 1, 2, 3, 1
\`\`\`

Note: only **consecutive** duplicates are filtered. The trailing \`1\` passes because \`3\` came before it.

## The object pitfall

Objects are compared **by reference**. A new object with the same fields counts as "different":

\`\`\`ts
state$.pipe(distinctUntilChanged())
// {a:1} !== {a:1} → both pass
\`\`\`

If the stream emits a new object each time (typical of immutable updates), the operator filters nothing.

## Solutions

### Comparator

\`\`\`ts
distinctUntilChanged((prev, curr) => prev.id === curr.id)
\`\`\`

### distinctUntilKeyChanged

\`\`\`ts
distinctUntilKeyChanged('id')
\`\`\`

### Comparison by projection

\`\`\`ts
distinctUntilChanged(
  (a, b) => a === b,
  (state) => state.user.name // emit only when the name changes
)
\`\`\`

## Why

- Remove redundant emissions and re-renders.
- In state management, NgRx selectors memoize too, but \`distinctUntilChanged\` is useful in hand-rolled state streams. Use deep comparison (\`isEqual\`) carefully — it is expensive.`
    }
  },
  {
    id: 'rxjs-017',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['share', 'connectable', 'multicasting'],
    question: {
      ru: 'Как устроен share() под капотом? Чем отличается от connectable и устаревшего multicast?',
      en: 'How does share() work under the hood? How does it differ from connectable and the deprecated multicast?'
    },
    answer: {
      ru: `## Механика multicasting

Multicasting = вставить \`Subject\` между источником и подписчиками. Источник подписывается на Subject **один раз**, а Subject раздаёт значения всем downstream-подписчикам. Так одно выполнение cold-источника делится между многими.

## share()

\`share()\` — это автоматизированный multicast с refCount:

- При **первом** подписчике подписывается на источник через внутренний \`Subject\`.
- Последующие подписчики делят это выполнение.
- Когда счётчик подписчиков падает до **нуля**, отписывается от источника.
- При новом подписчике после обнуления — **переподписывается заново**.

В RxJS 7 \`share()\` принимает конфиг: \`connector\` (фабрика Subject), \`resetOnError\`, \`resetOnComplete\`, \`resetOnRefCountZero\`.

\`\`\`ts
source$.pipe(
  share({ resetOnRefCountZero: false }) // не сбрасывать при 0 подписчиков
);
\`\`\`

## connectable()

\`connectable(source)\` создаёт \`Connectable\` Observable: он **не подписывается** на источник, пока вы не вызовете \`.connect()\`. Даёт **ручной контроль** над моментом старта multicast — полезно, когда нужно сначала подключить всех подписчиков, потом стартовать.

\`\`\`ts
const shared = connectable(source$);
shared.subscribe(a); shared.subscribe(b);
const conn = shared.connect(); // старт здесь
// conn.unsubscribe() — остановить
\`\`\`

## multicast (deprecated)

\`multicast(subjectFactory)\` + \`refCount()\` — старый низкоуровневый API, заменён на \`connectable\` и \`share\`. Был многословным и легко вёл к ошибкам с refCount, поэтому помечен deprecated.`,
      en: `## Multicasting mechanics

Multicasting = inserting a \`Subject\` between source and subscribers. The source is subscribed via the Subject **once**, and the Subject fans values out to all downstream subscribers. Thus one execution of a cold source is shared among many.

## share()

\`share()\` is an automated multicast with refCount:

- On the **first** subscriber it subscribes to the source through an internal \`Subject\`.
- Later subscribers share that execution.
- When the subscriber count drops to **zero**, it unsubscribes from the source.
- On a new subscriber after zero — it **resubscribes from scratch**.

In RxJS 7, \`share()\` takes a config: \`connector\` (Subject factory), \`resetOnError\`, \`resetOnComplete\`, \`resetOnRefCountZero\`.

\`\`\`ts
source$.pipe(
  share({ resetOnRefCountZero: false }) // do not reset at 0 subscribers
);
\`\`\`

## connectable()

\`connectable(source)\` creates a \`Connectable\` Observable: it does **not subscribe** to the source until you call \`.connect()\`. It gives **manual control** over when the multicast starts — useful when you want to wire up all subscribers first, then start.

\`\`\`ts
const shared = connectable(source$);
shared.subscribe(a); shared.subscribe(b);
const conn = shared.connect(); // starts here
// conn.unsubscribe() — to stop
\`\`\`

## multicast (deprecated)

\`multicast(subjectFactory)\` + \`refCount()\` is the old low-level API, replaced by \`connectable\` and \`share\`. It was verbose and easily led to refCount mistakes, hence deprecated.`
    }
  },
  {
    id: 'rxjs-018',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['cold-to-hot', 'subject', 'pattern'],
    question: {
      ru: 'Покажите паттерн «action stream»: как через Subject управлять загрузкой данных реактивно.',
      en: 'Show the "action stream" pattern: how to drive data loading reactively with a Subject.'
    },
    answer: {
      ru: `## Идея

Вместо императивного «при клике вызови метод» мы заводим **поток действий** (Subject) и декларативно описываем, как из него получить данные. Это основа реактивной архитектуры (и идея, лежащая в NgRx Effects).

## Структура

- \`Subject\` — источник «команд» (поиск, перезагрузка, смена страницы).
- \`switchMap\`/\`exhaustMap\` — превращает команду в запрос с нужной семантикой отмены.
- Результат — Observable состояния, который потребляется через \`async\` pipe.

\`\`\`ts
private search$ = new Subject<string>();

readonly results$ = this.search$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query =>
    this.api.search(query).pipe(
      map(data => ({ loading: false, data, error: null })),
      startWith({ loading: true, data: [], error: null }),
      catchError(err => of({ loading: false, data: [], error: err }))
    )
  )
);

search(term: string) { this.search$.next(term); }
\`\`\`

## Почему это хорошо

- **switchMap** отменяет устаревший запрос — нет гонок «ответ пришёл не на тот запрос».
- **startWith** даёт состояние загрузки декларативно.
- **catchError внутри** switchMap не убивает внешний поток — после ошибки можно снова искать.
- Состояние \`{loading, data, error}\` — единый view-model, удобно для шаблона.

## Связь с состоянием

Этот паттерн масштабируется до полноценного state-сервиса на \`BehaviorSubject\` или до NgRx, где \`search$\` становится action, а pipe — effect.`,
      en: `## The idea

Instead of imperative "on click, call a method", we set up an **action stream** (Subject) and declaratively describe how to derive data from it. This is the basis of reactive architecture (and the idea behind NgRx Effects).

## Structure

- A \`Subject\` — the source of "commands" (search, reload, page change).
- \`switchMap\`/\`exhaustMap\` — turns a command into a request with the right cancellation semantics.
- The result is a state Observable consumed via the \`async\` pipe.

\`\`\`ts
private search$ = new Subject<string>();

readonly results$ = this.search$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query =>
    this.api.search(query).pipe(
      map(data => ({ loading: false, data, error: null })),
      startWith({ loading: true, data: [], error: null }),
      catchError(err => of({ loading: false, data: [], error: err }))
    )
  )
);

search(term: string) { this.search$.next(term); }
\`\`\`

## Why it is good

- **switchMap** cancels the stale request — no "response arrived for the wrong query" races.
- **startWith** provides the loading state declaratively.
- **catchError inside** switchMap does not kill the outer stream — after an error you can search again.
- The \`{loading, data, error}\` state is a single view-model, convenient for the template.

## Relationship to state

This pattern scales up to a full state service on a \`BehaviorSubject\`, or to NgRx, where \`search$\` becomes an action and the pipe an effect.`
    }
  },
  {
    id: 'rxjs-019',
    category: 'rxjs-state',
    level: 'Expert',
    tags: ['marble-testing', 'testscheduler', 'testing'],
    question: {
      ru: 'Что такое marble-тестирование и как работает TestScheduler с виртуальным временем?',
      en: 'What is marble testing and how does TestScheduler with virtual time work?'
    },
    answer: {
      ru: `## Проблема тестирования времени

Потоки с \`debounceTime\`, \`delay\`, \`interval\` зависят от времени. Тестировать их с реальными таймерами — медленно и хрупко. \`TestScheduler\` даёт **виртуальное время**: операторы планируют работу на нём, а тест «проматывает» время мгновенно.

## Marble-диаграммы

Строка ASCII описывает поток во времени:

- \`-\` — один «кадр» времени (frame, по умолчанию 1 мс).
- \`a\`, \`b\` — эмиссии значений.
- \`|\` — complete.
- \`#\` — error.
- \`()\` — синхронная группировка в одном кадре.
- \`^\` — точка подписки (для hot).

\`\`\`ts
import { TestScheduler } from 'rxjs/testing';

const scheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected);
});

scheduler.run(({ cold, expectObservable }) => {
  const source = cold('  -a--b--c|');
  const expected = '     -a--b--c|';
  expectObservable(source.pipe(map(x => x))).toBe(expected);
});
\`\`\`

## Тест с debounceTime

\`\`\`ts
scheduler.run(({ cold, expectObservable }) => {
  const source =   cold('a-b-c---|');
  const result = source.pipe(debounceTime(3));
  expectObservable(result).toBe('--------(c|)'); // только последний после паузы
});
\`\`\`

## Ключевые помощники

- \`cold(marble, values)\` — cold Observable.
- \`hot(marble)\` — hot, с \`^\` как точкой подписки.
- \`expectObservable(...).toBe(...)\` — сверка.
- \`expectSubscriptions(...)\` — проверка таймингов подписки/отписки.

Внутри \`scheduler.run\` все асинхронные операторы используют этот scheduler автоматически — реального времени не тратится.`,
      en: `## The problem of testing time

Streams with \`debounceTime\`, \`delay\`, \`interval\` depend on time. Testing them with real timers is slow and flaky. \`TestScheduler\` provides **virtual time**: operators schedule work on it and the test "fast-forwards" time instantly.

## Marble diagrams

An ASCII string describes a stream over time:

- \`-\` — one time "frame" (1 ms by default).
- \`a\`, \`b\` — value emissions.
- \`|\` — complete.
- \`#\` — error.
- \`()\` — synchronous grouping in one frame.
- \`^\` — subscription point (for hot).

\`\`\`ts
import { TestScheduler } from 'rxjs/testing';

const scheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected);
});

scheduler.run(({ cold, expectObservable }) => {
  const source = cold('  -a--b--c|');
  const expected = '     -a--b--c|';
  expectObservable(source.pipe(map(x => x))).toBe(expected);
});
\`\`\`

## Testing debounceTime

\`\`\`ts
scheduler.run(({ cold, expectObservable }) => {
  const source =   cold('a-b-c---|');
  const result = source.pipe(debounceTime(3));
  expectObservable(result).toBe('--------(c|)'); // only the last after a pause
});
\`\`\`

## Key helpers

- \`cold(marble, values)\` — a cold Observable.
- \`hot(marble)\` — hot, with \`^\` as the subscription point.
- \`expectObservable(...).toBe(...)\` — assertion.
- \`expectSubscriptions(...)\` — checks subscription/unsubscription timings.

Inside \`scheduler.run\`, all async operators use this scheduler automatically — no real time is spent.`
    }
  },
  {
    id: 'rxjs-020',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['ngrx', 'store', 'actions', 'reducers'],
    question: {
      ru: 'Объясните архитектуру NgRx: store, actions, reducers и однонаправленный поток данных.',
      en: 'Explain the NgRx architecture: store, actions, reducers, and unidirectional data flow.'
    },
    answer: {
      ru: `## Принцип

NgRx — реализация паттерна Redux для Angular поверх RxJS. Главный принцип — **однонаправленный поток данных** и **единый источник истины** (store).

## Составные части

### Store

Единый иммутабельный объект состояния, обёрнутый в Observable. Компоненты читают из него через селекторы, не мутируют напрямую.

### Actions

Описывают «что произошло» — событие с \`type\` и опциональным payload. Создаются через \`createAction\`:

\`\`\`ts
export const loadUsers = createAction('[Users] Load');
export const loadUsersSuccess = createAction(
  '[Users API] Load Success',
  props<{ users: User[] }>()
);
\`\`\`

### Reducers

**Чистые функции** \`(state, action) => newState\`. Не мутируют, а возвращают новый объект:

\`\`\`ts
export const reducer = createReducer(
  initialState,
  on(loadUsers, (s) => ({ ...s, loading: true })),
  on(loadUsersSuccess, (s, { users }) => ({ ...s, loading: false, users }))
);
\`\`\`

## Поток

\`Component → dispatch(action) → Reducer → new State → Selector → Component\`. Побочные эффекты (HTTP) живут в Effects, а не в reducers.

## Зачем

- **Предсказуемость**: состояние меняется только через actions, легко отлаживать (time-travel в Redux DevTools).
- **Тестируемость**: reducers — чистые функции.
- **Масштаб**: подходит для крупных приложений со сложным разделяемым состоянием.

**Цена**: много boilerplate. Для простых случаев избыточен — взвешивайте.`,
      en: `## Principle

NgRx is a Redux-pattern implementation for Angular built on RxJS. Its core principles are **unidirectional data flow** and a **single source of truth** (the store).

## Building blocks

### Store

A single immutable state object wrapped in an Observable. Components read from it via selectors and never mutate it directly.

### Actions

Describe "what happened" — an event with a \`type\` and optional payload. Created via \`createAction\`:

\`\`\`ts
export const loadUsers = createAction('[Users] Load');
export const loadUsersSuccess = createAction(
  '[Users API] Load Success',
  props<{ users: User[] }>()
);
\`\`\`

### Reducers

**Pure functions** \`(state, action) => newState\`. They never mutate; they return a new object:

\`\`\`ts
export const reducer = createReducer(
  initialState,
  on(loadUsers, (s) => ({ ...s, loading: true })),
  on(loadUsersSuccess, (s, { users }) => ({ ...s, loading: false, users }))
);
\`\`\`

## Flow

\`Component → dispatch(action) → Reducer → new State → Selector → Component\`. Side effects (HTTP) live in Effects, not in reducers.

## Why

- **Predictability**: state changes only through actions, easy to debug (time-travel in Redux DevTools).
- **Testability**: reducers are pure functions.
- **Scale**: suits large apps with complex shared state.

**Cost**: lots of boilerplate. For simple cases it is overkill — weigh the trade-off.`
    }
  },
  {
    id: 'rxjs-021',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['ngrx', 'effects', 'side-effects'],
    question: {
      ru: 'Как работают NgRx Effects? Почему важна семантика switchMap/concatMap и обработка ошибок?',
      en: 'How do NgRx Effects work? Why do switchMap/concatMap semantics and error handling matter?'
    },
    answer: {
      ru: `## Что такое Effect

Effect — это слой для **побочных эффектов** (HTTP, навигация, таймеры). Он слушает поток actions, выполняет асинхронную работу и **диспатчит новые actions** в результате. Reducers остаются чистыми.

\`\`\`ts
loadUsers$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadUsers),
    switchMap(() =>
      this.api.getUsers().pipe(
        map(users => loadUsersSuccess({ users })),
        catchError(err => of(loadUsersFailure({ error: err.message })))
      )
    )
  )
);
\`\`\`

## Выбор оператора — критичен

- **switchMap** — отменяет предыдущий запрос. Хорошо для «загрузить по фильтру», опасно для «сохранить» (потеряете команды).
- **concatMap** — очередь, сохраняет порядок. Лучший выбор для записей/мутаций.
- **mergeMap** — параллельно, без гарантий порядка.
- **exhaustMap** — игнорирует новые, пока активен текущий. Для «refresh/login».

## Обработка ошибок — обязательна

\`catchError\` должен быть **внутри** \`switchMap\`, оборачивая внутренний запрос. Если поставить его снаружи (на уровне \`actions$\`), то после первой ошибки **весь effect-поток завершится** и перестанет реагировать на actions навсегда.

## Тонкости

- Effect по умолчанию диспатчит результат. Если эффект не должен ничего диспатчить — \`createEffect(..., { dispatch: false })\`.
- Не диспатчите тот же action, на который слушаете → бесконечный цикл.
- Effects тестируются маршальными потоками actions.`,
      en: `## What an Effect is

An Effect is the layer for **side effects** (HTTP, navigation, timers). It listens to the actions stream, performs async work, and **dispatches new actions** as a result. Reducers stay pure.

\`\`\`ts
loadUsers$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadUsers),
    switchMap(() =>
      this.api.getUsers().pipe(
        map(users => loadUsersSuccess({ users })),
        catchError(err => of(loadUsersFailure({ error: err.message })))
      )
    )
  )
);
\`\`\`

## Operator choice is critical

- **switchMap** — cancels the previous request. Good for "load by filter", dangerous for "save" (you lose commands).
- **concatMap** — a queue, preserves order. The best choice for writes/mutations.
- **mergeMap** — parallel, no ordering guarantees.
- **exhaustMap** — ignores new ones while the current is active. For "refresh/login".

## Error handling is mandatory

\`catchError\` must be **inside** \`switchMap\`, wrapping the inner request. If placed outside (at the \`actions$\` level), then after the first error the **whole effect stream completes** and stops reacting to actions forever.

## Subtleties

- An Effect dispatches its result by default. If it should not dispatch anything — \`createEffect(..., { dispatch: false })\`.
- Do not dispatch the same action you listen to → an infinite loop.
- Effects are tested with marshalled action streams.`
    }
  },
  {
    id: 'rxjs-022',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['ngrx', 'selectors', 'memoization'],
    question: {
      ru: 'Как работают селекторы NgRx и их мемоизация? Зачем createSelector?',
      en: 'How do NgRx selectors and their memoization work? Why createSelector?'
    },
    answer: {
      ru: `## Что такое селектор

Селектор — **чистая функция** для извлечения и производных вычислений из состояния. Компоненты подписываются на \`store.select(selector)\` и получают только нужный срез.

## createSelector и мемоизация

\`createSelector\` создаёт **мемоизированный** селектор. Он состоит из входных селекторов и projector-функции:

\`\`\`ts
const selectUsers = (s: AppState) => s.users.list;
const selectFilter = (s: AppState) => s.users.filter;

export const selectVisibleUsers = createSelector(
  selectUsers,
  selectFilter,
  (users, filter) => users.filter(u => u.name.includes(filter))
);
\`\`\`

### Как работает мемоизация

- Селектор кэширует **последний результат** и **последние входные значения**.
- При новом вызове сравнивает входы **по ссылке** (\`===\`).
- Если входы не изменились — возвращает **закэшированный** результат, не пересчитывая projector.
- Это критично: projector (фильтрация, сортировка) может быть дорогим, а \`store.select\` эмитит на каждое изменение состояния.

## Композиция

Селекторы **компонуются**: один селектор может быть входом для другого. Это строит граф зависимостей с переиспользованием кэшей.

## Подводные камни

- Мемоизация по ссылке: если projector создаёт новый объект, а вход не менялся — кэш сработает корректно. Но если вход — новый объект каждый раз (нарушена иммутабельность), кэш бесполезен.
- Кэш хранит **один** результат. Для параметризованных селекторов с разными аргументами используют фабрики \`createSelector\`, возвращающие функцию, или \`props\`.
- \`store.select\` сам применяет \`distinctUntilChanged\`, отсекая дубликаты по ссылке.`,
      en: `## What a selector is

A selector is a **pure function** for extracting and deriving values from state. Components subscribe via \`store.select(selector)\` and receive only the slice they need.

## createSelector and memoization

\`createSelector\` builds a **memoized** selector from input selectors and a projector function:

\`\`\`ts
const selectUsers = (s: AppState) => s.users.list;
const selectFilter = (s: AppState) => s.users.filter;

export const selectVisibleUsers = createSelector(
  selectUsers,
  selectFilter,
  (users, filter) => users.filter(u => u.name.includes(filter))
);
\`\`\`

### How memoization works

- The selector caches the **last result** and the **last input values**.
- On a new call it compares inputs **by reference** (\`===\`).
- If inputs are unchanged it returns the **cached** result without re-running the projector.
- This is critical: the projector (filtering, sorting) can be expensive, while \`store.select\` emits on every state change.

## Composition

Selectors **compose**: one selector can be an input to another. This builds a dependency graph with cache reuse.

## Pitfalls

- Reference memoization: if the projector creates a new object but the input did not change, the cache works correctly. But if the input is a new object every time (immutability broken), the cache is useless.
- The cache holds **one** result. For parameterized selectors with different arguments, use \`createSelector\` factories returning a function, or \`props\`.
- \`store.select\` itself applies \`distinctUntilChanged\`, dropping reference-equal duplicates.`
    }
  },
  {
    id: 'rxjs-023',
    category: 'rxjs-state',
    level: 'Medium',
    tags: ['ngrx', 'entity-adapter', 'normalization'],
    question: {
      ru: 'Что такое NgRx Entity Adapter и зачем нужна нормализация состояния?',
      en: 'What is the NgRx Entity Adapter and why normalize state?'
    },
    answer: {
      ru: `## Проблема денормализованного состояния

Хранить коллекции как массивы объектов неудобно: поиск/обновление по id требует перебора, дублирование данных ведёт к рассинхрону. **Нормализация** хранит сущности в виде словаря по id.

## Entity Adapter

\`@ngrx/entity\` предоставляет \`createEntityAdapter\`, который управляет коллекцией в форме \`EntityState\`:

\`\`\`ts
interface EntityState<T> {
  ids: string[] | number[];        // порядок
  entities: { [id: string]: T };   // словарь по id
}
\`\`\`

## Что даёт

Готовые **immutable**-операции для reducer-ов:

\`\`\`ts
const adapter = createEntityAdapter<User>({
  selectId: (u) => u.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name)
});

const reducer = createReducer(
  adapter.getInitialState({ loading: false }),
  on(addUser, (s, { user }) => adapter.addOne(user, s)),
  on(updateUser, (s, { update }) => adapter.updateOne(update, s)),
  on(loadUsersSuccess, (s, { users }) => adapter.setAll(users, s))
);
\`\`\`

Методы: \`addOne\`, \`addMany\`, \`setAll\`, \`updateOne\`, \`upsertOne\`, \`removeOne\` и т.д.

## Готовые селекторы

\`\`\`ts
const { selectAll, selectEntities, selectIds, selectTotal } =
  adapter.getSelectors();
\`\`\`

## Преимущества

- **O(1)** доступ по id вместо перебора массива.
- Корректная иммутабельность «из коробки» (новые ссылки → мемоизация селекторов работает).
- Меньше boilerplate, единообразие CRUD.
- \`selectAll\` отдаёт массив с учётом \`sortComparer\`.`,
      en: `## The problem with denormalized state

Storing collections as arrays of objects is awkward: lookup/update by id requires iteration, and duplicated data drifts out of sync. **Normalization** stores entities as a dictionary keyed by id.

## Entity Adapter

\`@ngrx/entity\` provides \`createEntityAdapter\`, which manages a collection in \`EntityState\` form:

\`\`\`ts
interface EntityState<T> {
  ids: string[] | number[];        // order
  entities: { [id: string]: T };   // dictionary by id
}
\`\`\`

## What it provides

Ready-made **immutable** operations for reducers:

\`\`\`ts
const adapter = createEntityAdapter<User>({
  selectId: (u) => u.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name)
});

const reducer = createReducer(
  adapter.getInitialState({ loading: false }),
  on(addUser, (s, { user }) => adapter.addOne(user, s)),
  on(updateUser, (s, { update }) => adapter.updateOne(update, s)),
  on(loadUsersSuccess, (s, { users }) => adapter.setAll(users, s))
);
\`\`\`

Methods: \`addOne\`, \`addMany\`, \`setAll\`, \`updateOne\`, \`upsertOne\`, \`removeOne\`, etc.

## Ready-made selectors

\`\`\`ts
const { selectAll, selectEntities, selectIds, selectTotal } =
  adapter.getSelectors();
\`\`\`

## Benefits

- **O(1)** access by id instead of iterating an array.
- Correct immutability out of the box (new references → selector memoization works).
- Less boilerplate, uniform CRUD.
- \`selectAll\` returns an array honoring \`sortComparer\`.`
    }
  },
  {
    id: 'rxjs-024',
    category: 'rxjs-state',
    level: 'Medium',
    tags: ['ngrx', 'createfeature', 'boilerplate'],
    question: {
      ru: 'Что даёт createFeature в современном NgRx и как он уменьшает boilerplate?',
      en: 'What does createFeature provide in modern NgRx and how does it reduce boilerplate?'
    },
    answer: {
      ru: `## Проблема

Классический NgRx требует вручную: объявить feature key, зарегистрировать reducer, написать \`createFeatureSelector\` и кучу \`createSelector\` для каждого среза. Много повторяющегося кода.

## createFeature

\`createFeature\` объединяет имя, reducer и автоматически генерирует селекторы для каждого поля состояния:

\`\`\`ts
export const usersFeature = createFeature({
  name: 'users',
  reducer: createReducer(
    initialState,
    on(loadUsers, (s) => ({ ...s, loading: true })),
    on(loadUsersSuccess, (s, { users }) => ({ ...s, loading: false, users }))
  )
});

// автоматически доступны:
export const {
  name,
  reducer,
  selectUsersState,
  selectUsers,    // по полю users
  selectLoading   // по полю loading
} = usersFeature;
\`\`\`

## Что даёт

- Авто-генерация \`selectFeatureState\` и селектора **на каждое свойство** состояния.
- Не нужно вручную писать feature selector и базовые селекторы полей.
- Регистрация: \`provideState(usersFeature)\` — без отдельных строк для key и reducer.

## extraSelectors

Производные селекторы добавляются через \`extraSelectors\`, используя авто-сгенерированные как входы:

\`\`\`ts
createFeature({
  name: 'users',
  reducer,
  extraSelectors: ({ selectUsers, selectFilter }) => ({
    selectVisibleUsers: createSelector(
      selectUsers, selectFilter,
      (users, f) => users.filter(u => u.name.includes(f))
    )
  })
});
\`\`\`

## Итог

\`createFeature\` — это «standalone-эра» NgRx: меньше файлов, меньше ручных селекторов, всё связано в одном объекте. Хорошо сочетается с \`provideStore\`/\`provideState\` в standalone-приложениях.`,
      en: `## The problem

Classic NgRx requires you to manually declare a feature key, register the reducer, write \`createFeatureSelector\` and a pile of \`createSelector\` for each slice. Lots of repetitive code.

## createFeature

\`createFeature\` bundles the name and reducer and auto-generates selectors for every state field:

\`\`\`ts
export const usersFeature = createFeature({
  name: 'users',
  reducer: createReducer(
    initialState,
    on(loadUsers, (s) => ({ ...s, loading: true })),
    on(loadUsersSuccess, (s, { users }) => ({ ...s, loading: false, users }))
  )
});

// automatically available:
export const {
  name,
  reducer,
  selectUsersState,
  selectUsers,    // for the users field
  selectLoading   // for the loading field
} = usersFeature;
\`\`\`

## What it provides

- Auto-generation of \`selectFeatureState\` and a selector **for each state property**.
- No need to hand-write the feature selector and basic field selectors.
- Registration: \`provideState(usersFeature)\` — without separate lines for key and reducer.

## extraSelectors

Derived selectors are added via \`extraSelectors\`, using the auto-generated ones as inputs:

\`\`\`ts
createFeature({
  name: 'users',
  reducer,
  extraSelectors: ({ selectUsers, selectFilter }) => ({
    selectVisibleUsers: createSelector(
      selectUsers, selectFilter,
      (users, f) => users.filter(u => u.name.includes(f))
    )
  })
});
\`\`\`

## Bottom line

\`createFeature\` is the "standalone era" of NgRx: fewer files, fewer manual selectors, everything tied together in one object. It pairs well with \`provideStore\`/\`provideState\` in standalone apps.`
    }
  },
  {
    id: 'rxjs-025',
    category: 'rxjs-state',
    level: 'Expert',
    tags: ['ngrx', 'signal-store', 'signals'],
    question: {
      ru: 'Что такое @ngrx/signals SignalStore и чем он отличается от классического Store?',
      en: 'What is the @ngrx/signals SignalStore and how does it differ from the classic Store?'
    },
    answer: {
      ru: `## Идея

\`@ngrx/signals\` — новый, основанный на **Signals** подход NgRx. Вместо Observable-состояния и Redux-цикла он предлагает **функциональный, композируемый store** с минимумом boilerplate.

## signalStore

\`\`\`ts
export const UsersStore = signalStore(
  { providedIn: 'root' },
  withState({ users: [] as User[], loading: false }),
  withComputed(({ users }) => ({
    count: computed(() => users().length)
  })),
  withMethods((store, api = inject(UserApi)) => ({
    async load() {
      patchState(store, { loading: true });
      const users = await firstValueFrom(api.getAll());
      patchState(store, { users, loading: false });
    }
  }))
);
\`\`\`

## Отличия от классического Store

- **Состояние — это Signals**, а не Observable. Доступ синхронный: \`store.users()\`. Глубокие срезы тоже становятся signals.
- **Нет actions/reducers/effects** как обязательной церемонии. Изменения — через \`patchState\`. Это ближе к фасаду/сервису.
- **Computed** через \`withComputed\` — мемоизированные производные, как селекторы, но на signals.
- **Методы** инкапсулируют логику (включая асинхронную) прямо в store.

## Расширяемость

- \`withEntities\` — аналог Entity Adapter для signals.
- \`rxMethod\` — мост к RxJS: метод, принимающий Observable/значение, внутри которого можно использовать \`switchMap\` и т.п. для асинхронных эффектов с отменой.
- Кастомные features (\`signalStoreFeature\`) — переиспользуемые «миксины» поведения.

## Когда выбирать

SignalStore хорош для локального и feature-состояния, когда Redux-церемония избыточна, но нужна структура и реактивность. Классический Store — для очень крупного приложения с строгим аудитом действий и time-travel отладкой.`,
      en: `## The idea

\`@ngrx/signals\` is NgRx's new **Signals-based** approach. Instead of Observable state and the Redux cycle, it offers a **functional, composable store** with minimal boilerplate.

## signalStore

\`\`\`ts
export const UsersStore = signalStore(
  { providedIn: 'root' },
  withState({ users: [] as User[], loading: false }),
  withComputed(({ users }) => ({
    count: computed(() => users().length)
  })),
  withMethods((store, api = inject(UserApi)) => ({
    async load() {
      patchState(store, { loading: true });
      const users = await firstValueFrom(api.getAll());
      patchState(store, { users, loading: false });
    }
  }))
);
\`\`\`

## Differences from the classic Store

- **State is Signals**, not Observables. Access is synchronous: \`store.users()\`. Deep slices also become signals.
- **No mandatory actions/reducers/effects** ceremony. Changes go through \`patchState\`. This is closer to a facade/service.
- **Computed** via \`withComputed\` — memoized derivations, like selectors but on signals.
- **Methods** encapsulate logic (including async) right in the store.

## Extensibility

- \`withEntities\` — the Entity Adapter equivalent for signals.
- \`rxMethod\` — a bridge to RxJS: a method taking an Observable/value, inside which you can use \`switchMap\` etc. for async effects with cancellation.
- Custom features (\`signalStoreFeature\`) — reusable behavior "mixins".

## When to choose it

SignalStore is great for local and feature state where Redux ceremony is overkill but you still want structure and reactivity. The classic Store fits very large apps needing strict action auditing and time-travel debugging.`
    }
  },
  {
    id: 'rxjs-026',
    category: 'rxjs-state',
    level: 'Medium',
    tags: ['ngrx', 'facade', 'pattern'],
    question: {
      ru: 'Что такое facade-паттерн в NgRx и какие у него плюсы и минусы?',
      en: 'What is the facade pattern in NgRx and what are its pros and cons?'
    },
    answer: {
      ru: `## Что это

Facade — это сервис-обёртка, скрывающий детали NgRx (store, actions, selectors) за простым API. Компоненты работают с фасадом, а не напрямую со store.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private store = inject(Store);

  // выборки состояния
  readonly users$ = this.store.select(selectUsers);
  readonly loading$ = this.store.select(selectLoading);

  // команды
  load() { this.store.dispatch(loadUsers()); }
  add(user: User) { this.store.dispatch(addUser({ user })); }
}
\`\`\`

Компонент:

\`\`\`ts
facade.load();
// template: {{ facade.users$ | async }}
\`\`\`

## Плюсы

- **Инкапсуляция**: компонент не знает про actions/selectors, проще тестировать (мокаем фасад).
- **Меньше связности**: можно сменить реализацию (NgRx → SignalStore) без правки компонентов.
- **Читаемость**: компонент описывает намерения (\`load\`, \`add\`), а не механику.
- Единая точка для view-моделей (объединение нескольких селекторов).

## Минусы

- **Лишний слой**: ещё один файл, особенно если фасад просто проксирует.
- Риск превратить фасад в «бога»: огромный сервис со всем подряд.
- Скрывает явность потока actions, что некоторые команды считают анти-паттерном для Redux (теряется «трассируемость» dispatch из компонента).

## Когда применять

Полезен в крупных feature-модулях, где компонентов много и хочется изолировать их от NgRx. Для маленьких фич — избыточен.`,
      en: `## What it is

A facade is a service wrapper hiding NgRx details (store, actions, selectors) behind a simple API. Components work with the facade, not directly with the store.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private store = inject(Store);

  // state selections
  readonly users$ = this.store.select(selectUsers);
  readonly loading$ = this.store.select(selectLoading);

  // commands
  load() { this.store.dispatch(loadUsers()); }
  add(user: User) { this.store.dispatch(addUser({ user })); }
}
\`\`\`

Component:

\`\`\`ts
facade.load();
// template: {{ facade.users$ | async }}
\`\`\`

## Pros

- **Encapsulation**: the component knows nothing about actions/selectors, easier to test (mock the facade).
- **Lower coupling**: you can swap the implementation (NgRx → SignalStore) without touching components.
- **Readability**: the component expresses intent (\`load\`, \`add\`), not mechanics.
- A single place for view-models (combining several selectors).

## Cons

- **Extra layer**: another file, especially if the facade just proxies.
- Risk of turning the facade into a "god service" holding everything.
- Hides the explicitness of the action stream, which some teams consider an anti-pattern for Redux (you lose "traceability" of dispatch from the component).

## When to use

Useful in large feature modules with many components you want isolated from NgRx. For small features it is overkill.`
    }
  },
  {
    id: 'rxjs-027',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['ngxs', 'state-management'],
    question: {
      ru: 'Как устроен NGXS: state, actions, selectors? Чем отличается от NgRx?',
      en: 'How is NGXS structured: state, actions, selectors? How does it differ from NgRx?'
    },
    answer: {
      ru: `## Философия NGXS

NGXS — альтернативный state-менеджмент, ориентированный на **меньше boilerplate** и более «ангуляровский», объектно-ориентированный стиль (декораторы, классы, DI). Под капотом тоже RxJS.

## State

Состояние — это класс с декоратором \`@State\`, объединяющий данные и обработчики:

\`\`\`ts
@State<UsersStateModel>({
  name: 'users',
  defaults: { list: [], loading: false }
})
@Injectable()
export class UsersState {
  constructor(private api: UserApi) {}

  @Action(LoadUsers)
  load(ctx: StateContext<UsersStateModel>) {
    ctx.patchState({ loading: true });
    return this.api.getAll().pipe(
      tap(list => ctx.patchState({ list, loading: false }))
    );
  }
}
\`\`\`

## Actions

Actions — классы с payload. Диспатч через \`store.dispatch(new LoadUsers())\`. Обработчик действия живёт **в том же state-классе** (метод с \`@Action\`), а не в отдельном effects-файле — это ключевое отличие.

## Selectors

\`@Selector()\` создаёт мемоизированный селектор как метод класса:

\`\`\`ts
@Selector()
static activeUsers(state: UsersStateModel) {
  return state.list.filter(u => u.active);
}
\`\`\`

## Отличия от NgRx

- **Меньше файлов**: нет разделения на reducer/effect/selector — всё в state-классе.
- **Императивнее**: \`patchState\`/\`setState\` вместо чистых reducer-ов.
- **Async в @Action**: можно вернуть Observable/Promise прямо из обработчика — встроенная замена effects.
- NgRx строже следует Redux (чистые функции, явные actions), что лучше для очень крупных команд и аудита; NGXS быстрее в разработке для средних проектов.`,
      en: `## NGXS philosophy

NGXS is an alternative state manager aimed at **less boilerplate** and a more "Angular-ish", object-oriented style (decorators, classes, DI). Under the hood it also uses RxJS.

## State

State is a class with a \`@State\` decorator bundling data and handlers:

\`\`\`ts
@State<UsersStateModel>({
  name: 'users',
  defaults: { list: [], loading: false }
})
@Injectable()
export class UsersState {
  constructor(private api: UserApi) {}

  @Action(LoadUsers)
  load(ctx: StateContext<UsersStateModel>) {
    ctx.patchState({ loading: true });
    return this.api.getAll().pipe(
      tap(list => ctx.patchState({ list, loading: false }))
    );
  }
}
\`\`\`

## Actions

Actions are classes with a payload. Dispatch via \`store.dispatch(new LoadUsers())\`. The action handler lives **in the same state class** (a method with \`@Action\`), not in a separate effects file — a key difference.

## Selectors

\`@Selector()\` creates a memoized selector as a class method:

\`\`\`ts
@Selector()
static activeUsers(state: UsersStateModel) {
  return state.list.filter(u => u.active);
}
\`\`\`

## Differences from NgRx

- **Fewer files**: no split into reducer/effect/selector — everything is in the state class.
- **More imperative**: \`patchState\`/\`setState\` instead of pure reducers.
- **Async in @Action**: you can return an Observable/Promise directly from a handler — a built-in effects replacement.
- NgRx follows Redux more strictly (pure functions, explicit actions), which is better for very large teams and auditing; NGXS is faster to develop with for medium projects.`
    }
  },
  {
    id: 'rxjs-028',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['signals', 'rxjs', 'tosignal', 'interop'],
    question: {
      ru: 'Как взаимодействуют Signals и RxJS? Объясните toSignal и toObservable.',
      en: 'How do Signals and RxJS interoperate? Explain toSignal and toObservable.'
    },
    answer: {
      ru: `## Две модели реактивности

- **RxJS** — push-поток событий во времени, операторы, отмена. Идеален для асинхронных событий (HTTP, WebSocket, debounce).
- **Signals** — синхронные значения с автоматическим отслеживанием зависимостей. Идеальны для состояния UI и шаблонов.

\`@angular/core/rxjs-interop\` даёт мосты между ними.

## toSignal

Превращает Observable в Signal:

\`\`\`ts
import { toSignal } from '@angular/core/rxjs-interop';

readonly user = toSignal(this.userService.user$, { initialValue: null });
// в шаблоне: {{ user()?.name }}
\`\`\`

- Подписывается на Observable и хранит последнее значение как signal.
- **Автоматически отписывается** при уничтожении (в injection context) — нет утечек.
- Требует \`initialValue\` или \`requireSync: true\` (для синхронных источников вроде BehaviorSubject).

## toObservable

Превращает Signal в Observable:

\`\`\`ts
import { toObservable } from '@angular/core/rxjs-interop';

readonly query = signal('');
readonly results$ = toObservable(this.query).pipe(
  debounceTime(300),
  switchMap(q => this.api.search(q))
);
\`\`\`

- Под капотом использует \`effect\`, чтобы отслеживать изменения signal и эмитить их в Observable.
- Эмиссии происходят **асинхронно** (на эффект-тик), не синхронно при каждом \`set\`.

## Когда что

- Состояние, читаемое в шаблоне → Signal (или \`toSignal\` на конце потока).
- Сложная асинхронная логика (debounce, switchMap, retry) → RxJS, затем \`toSignal\` для потребления.
- \`toObservable\` — когда нужно подать signal во вход RxJS-конвейера.`,
      en: `## Two reactivity models

- **RxJS** — a push stream of events over time, with operators and cancellation. Ideal for async events (HTTP, WebSocket, debounce).
- **Signals** — synchronous values with automatic dependency tracking. Ideal for UI state and templates.

\`@angular/core/rxjs-interop\` provides bridges between them.

## toSignal

Turns an Observable into a Signal:

\`\`\`ts
import { toSignal } from '@angular/core/rxjs-interop';

readonly user = toSignal(this.userService.user$, { initialValue: null });
// in template: {{ user()?.name }}
\`\`\`

- Subscribes to the Observable and stores the latest value as a signal.
- **Automatically unsubscribes** on destroy (in an injection context) — no leaks.
- Requires \`initialValue\` or \`requireSync: true\` (for synchronous sources like BehaviorSubject).

## toObservable

Turns a Signal into an Observable:

\`\`\`ts
import { toObservable } from '@angular/core/rxjs-interop';

readonly query = signal('');
readonly results$ = toObservable(this.query).pipe(
  debounceTime(300),
  switchMap(q => this.api.search(q))
);
\`\`\`

- Under the hood it uses an \`effect\` to track signal changes and emit them into the Observable.
- Emissions happen **asynchronously** (on the effect tick), not synchronously on every \`set\`.

## When to use which

- State read in the template → Signal (or \`toSignal\` at the end of a stream).
- Complex async logic (debounce, switchMap, retry) → RxJS, then \`toSignal\` to consume.
- \`toObservable\` — when you need to feed a signal into an RxJS pipeline input.`
    }
  },
  {
    id: 'rxjs-029',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['takeuntildestroyed', 'unsubscription', 'angular'],
    question: {
      ru: 'Как работает takeUntilDestroyed и почему он лучше ручного takeUntil + Subject?',
      en: 'How does takeUntilDestroyed work and why is it better than manual takeUntil + Subject?'
    },
    answer: {
      ru: `## Что это

\`takeUntilDestroyed\` (из \`@angular/core/rxjs-interop\`, Angular 16+) — оператор, который автоматически отписывает поток при уничтожении компонента/директивы/сервиса, используя \`DestroyRef\`.

## Два режима

### В injection context

Вызванный в конструкторе или инициализаторе поля — сам берёт \`DestroyRef\` из контекста:

\`\`\`ts
export class MyComponent {
  data$ = this.service.stream$.pipe(
    takeUntilDestroyed() // DestroyRef из контекста инъекции
  );
}
\`\`\`

### Вне injection context

В методе (\`ngOnInit\`) нужно передать \`DestroyRef\` явно:

\`\`\`ts
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.service.stream$.pipe(
    takeUntilDestroyed(this.destroyRef)
  ).subscribe();
}
\`\`\`

## Под капотом

\`DestroyRef.onDestroy(cb)\` регистрирует колбэк, вызываемый при разрушении владельца. \`takeUntilDestroyed\` внутри создаёт \`Subject\`, который эмитит при этом колбэке, и применяет логику \`takeUntil\`.

## Почему лучше ручного варианта

- **Меньше кода**: не нужны поле \`destroy$\`, \`ngOnDestroy\`, \`.next()/.complete()\`.
- **Меньше ошибок**: классический паттерн легко забыть (\`complete\`) или поставить \`takeUntil\` не последним.
- **Работает вне компонентов**: в сервисах, директивах, где \`ngOnDestroy\` менее очевиден.
- Интегрирован с жизненным циклом Angular напрямую через \`DestroyRef\`.

## Нюанс

Как и \`takeUntil\`, ставьте его **последним** в pipe (после операторов, которые должны успеть отработать), иначе нижестоящие операторы могут «пережить» отписку.`,
      en: `## What it is

\`takeUntilDestroyed\` (from \`@angular/core/rxjs-interop\`, Angular 16+) is an operator that automatically unsubscribes a stream when a component/directive/service is destroyed, using \`DestroyRef\`.

## Two modes

### In an injection context

Called in a constructor or field initializer, it grabs \`DestroyRef\` from the context itself:

\`\`\`ts
export class MyComponent {
  data$ = this.service.stream$.pipe(
    takeUntilDestroyed() // DestroyRef from the injection context
  );
}
\`\`\`

### Outside an injection context

In a method (\`ngOnInit\`) you must pass \`DestroyRef\` explicitly:

\`\`\`ts
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.service.stream$.pipe(
    takeUntilDestroyed(this.destroyRef)
  ).subscribe();
}
\`\`\`

## Under the hood

\`DestroyRef.onDestroy(cb)\` registers a callback invoked when the owner is destroyed. Internally \`takeUntilDestroyed\` creates a \`Subject\` that emits in that callback and applies \`takeUntil\` logic.

## Why it is better than the manual approach

- **Less code**: no \`destroy$\` field, no \`ngOnDestroy\`, no \`.next()/.complete()\`.
- **Fewer mistakes**: the classic pattern is easy to get wrong (forget \`complete\`, or place \`takeUntil\` not last).
- **Works outside components**: in services and directives where \`ngOnDestroy\` is less obvious.
- Integrated with the Angular lifecycle directly via \`DestroyRef\`.

## Caveat

Like \`takeUntil\`, place it **last** in the pipe (after operators that must finish), otherwise downstream operators can "outlive" the unsubscription.`
    }
  },
  {
    id: 'rxjs-030',
    category: 'rxjs-state',
    level: 'Expert',
    tags: ['async-pipe', 'change-detection', 'internals'],
    question: {
      ru: 'Как async pipe работает под капотом и как он взаимодействует с change detection?',
      en: 'How does the async pipe work under the hood and how does it interact with change detection?'
    },
    answer: {
      ru: `## Что делает async pipe

\`AsyncPipe\` подписывается на Observable (или Promise), возвращает последнее эмитированное значение и **автоматически отписывается** при уничтожении хоста. Это устраняет целый класс утечек.

## Под капотом

- В методе \`transform\` пайп сравнивает переданный Observable с прошлым. Если это **новый** источник — отписывается от старого и подписывается на новый.
- При \`next\` значение сохраняется, и пайп вызывает \`ChangeDetectorRef.markForCheck()\`, помечая компонент «грязным».
- В \`ngOnDestroy\` пайпа происходит \`unsubscribe\`.

## Взаимодействие с change detection

\`markForCheck()\` критичен для стратегии **OnPush**: при OnPush компонент не проверяется на каждый тик, а только когда «помечен грязным». async pipe помечает его при каждой новой эмиссии — поэтому шаблон обновляется без ручного \`detectChanges\`.

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \\\`<span>{{ count$ | async }}</span>\\\`
})
\`\`\`

## Тонкости и подводные камни

- **Несколько \`| async\` на один поток** = несколько подписок = несколько выполнений cold-источника (несколько HTTP). Решение: \`shareReplay\` или \`@if (data$ | async; as data)\`.
- Если в шаблон передать **новый** Observable на каждый CD (например, \`obj.method()\` создаёт поток в шаблоне) — пайп будет переподписываться постоянно. Храните поток в поле.
- async pipe работает с zoneless и OnPush, потому что опирается на \`markForCheck\`, а не на Zone.js.
- С Signals альтернатива — \`toSignal\`, который тоже триггерит обновление, но через граф signals.`,
      en: `## What the async pipe does

\`AsyncPipe\` subscribes to an Observable (or Promise), returns the latest emitted value, and **automatically unsubscribes** when the host is destroyed. This removes a whole class of leaks.

## Under the hood

- In its \`transform\` method the pipe compares the passed Observable with the previous one. If it is a **new** source, it unsubscribes from the old and subscribes to the new.
- On \`next\` the value is stored and the pipe calls \`ChangeDetectorRef.markForCheck()\`, marking the component dirty.
- In the pipe's \`ngOnDestroy\` it unsubscribes.

## Interaction with change detection

\`markForCheck()\` is crucial for the **OnPush** strategy: with OnPush the component is not checked every tick, only when marked dirty. The async pipe marks it on every new emission — so the template updates without manual \`detectChanges\`.

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \\\`<span>{{ count$ | async }}</span>\\\`
})
\`\`\`

## Subtleties and pitfalls

- **Multiple \`| async\` on one stream** = multiple subscriptions = multiple executions of a cold source (multiple HTTP calls). Fix: \`shareReplay\` or \`@if (data$ | async; as data)\`.
- If you pass a **new** Observable on each CD (e.g. \`obj.method()\` creating a stream in the template), the pipe keeps resubscribing. Store the stream in a field.
- The async pipe works with zoneless and OnPush because it relies on \`markForCheck\`, not Zone.js.
- With Signals the alternative is \`toSignal\`, which also triggers updates but through the signal graph.`
    }
  },
  {
    id: 'rxjs-031',
    category: 'rxjs-state',
    level: 'Medium',
    tags: ['signals', 'rxjs', 'when-to-use'],
    question: {
      ru: 'Когда выбирать Signals, а когда RxJS? Где граница ответственности?',
      en: 'When should you choose Signals versus RxJS? Where is the boundary of responsibility?'
    },
    answer: {
      ru: `## Природа инструментов

- **Signals** — модель **синхронного состояния** с автотрекингом зависимостей. Значение всегда есть «прямо сейчас» (\`signal()\`). Pull-модель: значение читается при доступе.
- **RxJS** — модель **асинхронных событий во времени**. Push-модель: значения «толкаются» подписчику, с богатой системой операторов и отменой.

## Где Signals

- Локальное состояние UI: флаги, выбранная вкладка, форма.
- Производные значения: \`computed\`.
- Связывание состояния с шаблоном (особенно при zoneless/OnPush).
- Простые синхронные вычисления без асинхронности.

## Где RxJS

- Асинхронные события: HTTP, WebSocket, события DOM, таймеры.
- Координация во времени: \`debounceTime\`, \`switchMap\`, \`combineLatest\`, \`retry\`.
- Отмена устаревших операций (поиск, гонки запросов).
- Сложные пайплайны преобразований потока.

## Граница и связка

Распространённый паттерн: **RxJS для добычи и преобразования данных → Signal для потребления в шаблоне**:

\`\`\`ts
readonly results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    switchMap(q => this.api.search(q))
  ),
  { initialValue: [] }
);
\`\`\`

## Правило

«Состояние — в Signals, события и асинхронность — в RxJS». Не пытайтесь делать debounce/switchMap на signals (это неудобно), и не держите простой синхронный флаг в \`BehaviorSubject\`, если signal проще. Используйте \`toSignal\`/\`toObservable\` как мосты на стыке.`,
      en: `## The nature of the tools

- **Signals** — a model of **synchronous state** with automatic dependency tracking. A value always exists "right now" (\`signal()\`). Pull model: the value is read on access.
- **RxJS** — a model of **asynchronous events over time**. Push model: values are pushed to the subscriber, with a rich operator system and cancellation.

## Where Signals fit

- Local UI state: flags, selected tab, form.
- Derived values: \`computed\`.
- Binding state to the template (especially with zoneless/OnPush).
- Simple synchronous computations without async.

## Where RxJS fits

- Async events: HTTP, WebSocket, DOM events, timers.
- Time coordination: \`debounceTime\`, \`switchMap\`, \`combineLatest\`, \`retry\`.
- Cancelling stale operations (search, request races).
- Complex stream transformation pipelines.

## The boundary and the bridge

A common pattern: **RxJS to fetch and transform data → Signal to consume in the template**:

\`\`\`ts
readonly results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    switchMap(q => this.api.search(q))
  ),
  { initialValue: [] }
);
\`\`\`

## Rule of thumb

"State in Signals, events and async in RxJS." Do not try to debounce/switchMap on signals (it is awkward), and do not keep a simple synchronous flag in a \`BehaviorSubject\` when a signal is simpler. Use \`toSignal\`/\`toObservable\` as bridges at the seam.`
    }
  },
  {
    id: 'rxjs-032',
    category: 'rxjs-state',
    level: 'Expert',
    tags: ['observable', 'subscriber', 'internals'],
    question: {
      ru: 'Что происходит при вызове subscribe()? Опишите весь путь от Observable до Subscriber.',
      en: 'What happens when subscribe() is called? Describe the whole path from Observable to Subscriber.'
    },
    answer: {
      ru: `## Шаг за шагом

### 1. Нормализация Observer

\`subscribe()\` принимает либо объект-Observer (\`{next, error, complete}\`), либо функцию-next. Внутри RxJS оборачивает это в \`SafeSubscriber\` — экземпляр \`Subscriber\`.

### 2. Subscriber как страж контракта

\`Subscriber extends Subscription\` и реализует Observer. Он:

- гарантирует **грамматику** \`next* (error|complete)?\`: после терминального события игнорирует \`next\`;
- ловит исключения в колбэках;
- хранит флаг \`closed\` и список teardown-логики (т.к. он Subscription).

### 3. Запуск producer-функции

Observable вызывает свою \`_subscribe(subscriber)\` (ту функцию, что передали в конструктор). Для оператора в \`pipe\` это цепочка: каждый оператор оборачивает \`subscriber\` в свой «operator-subscriber», который трансформирует/фильтрует значения и передаёт дальше.

\`\`\`ts
// упрощённая модель оператора map
function map(fn) {
  return (source) => new Observable(sub => {
    return source.subscribe({
      next: v => sub.next(fn(v)), // трансформация
      error: e => sub.error(e),
      complete: () => sub.complete()
    });
  });
}
\`\`\`

### 4. Поток значений

Producer вызывает \`subscriber.next(v)\`. Значение проходит вверх по цепочке operator-subscriber-ов до конечного Observer.

### 5. Возврат Subscription

\`subscribe()\` возвращает \`Subscription\`. Producer-функция возвращает teardown, который регистрируется в этой Subscription.

### 6. Завершение и teardown

При \`complete()/error()\` или \`unsubscribe()\` помечается \`closed\`, и рекурсивно вызываются все teardown-функции вниз по цепочке — освобождая ресурсы на каждом уровне.

Ключевое: каждая подписка — **независимое выполнение** (unicast), а вся цепочка операторов разворачивается «изнутри наружу» при подписке.`,
      en: `## Step by step

### 1. Observer normalization

\`subscribe()\` accepts either an Observer object (\`{next, error, complete}\`) or a next function. Internally RxJS wraps it in a \`SafeSubscriber\` — an instance of \`Subscriber\`.

### 2. The Subscriber as contract guard

\`Subscriber extends Subscription\` and implements Observer. It:

- enforces the **grammar** \`next* (error|complete)?\`: after a terminal event it ignores \`next\`;
- catches exceptions in callbacks;
- holds a \`closed\` flag and a list of teardown logic (since it is a Subscription).

### 3. Running the producer function

The Observable calls its \`_subscribe(subscriber)\` (the function passed to the constructor). For an operator in \`pipe\` this is a chain: each operator wraps the \`subscriber\` in its own "operator-subscriber" that transforms/filters values and passes them on.

\`\`\`ts
// simplified model of the map operator
function map(fn) {
  return (source) => new Observable(sub => {
    return source.subscribe({
      next: v => sub.next(fn(v)), // transform
      error: e => sub.error(e),
      complete: () => sub.complete()
    });
  });
}
\`\`\`

### 4. Value flow

The producer calls \`subscriber.next(v)\`. The value travels up the chain of operator-subscribers to the final Observer.

### 5. Returning the Subscription

\`subscribe()\` returns a \`Subscription\`. The producer function returns teardown, which is registered in this Subscription.

### 6. Completion and teardown

On \`complete()/error()\` or \`unsubscribe()\`, \`closed\` is set and all teardown functions are recursively invoked down the chain — releasing resources at each level.

Key takeaway: each subscription is an **independent execution** (unicast), and the whole operator chain unfolds "inside out" upon subscription.`
    }
  },
  {
    id: 'rxjs-033',
    category: 'rxjs-state',
    level: 'Medium',
    tags: ['startwith', 'scan', 'state'],
    question: {
      ru: 'Как реализовать простой state-store на RxJS с помощью scan и BehaviorSubject?',
      en: 'How do you implement a simple RxJS state store using scan and BehaviorSubject?'
    },
    answer: {
      ru: `## Идея

Можно построить мини-Redux без библиотек: поток actions + чистая reduce-функция через \`scan\`, а текущее состояние раздаётся через мультикаст.

## Вариант на scan

\`scan\` — это «reduce во времени»: аккумулирует состояние, эмитя его на каждое действие.

\`\`\`ts
type Action = { type: 'inc' } | { type: 'dec' } | { type: 'set'; value: number };

private actions$ = new Subject<Action>();

readonly state$ = this.actions$.pipe(
  scan((state, action) => {
    switch (action.type) {
      case 'inc': return { count: state.count + 1 };
      case 'dec': return { count: state.count - 1 };
      case 'set': return { count: action.value };
    }
  }, { count: 0 }),
  startWith({ count: 0 }),
  shareReplay({ bufferSize: 1, refCount: true })
);

dispatch(action: Action) { this.actions$.next(action); }
\`\`\`

## Вариант на BehaviorSubject

Проще для императивных обновлений и синхронного чтения:

\`\`\`ts
private state = new BehaviorSubject<State>({ count: 0 });
readonly state$ = this.state.asObservable();

get snapshot() { return this.state.value; }
patch(partial: Partial<State>) {
  this.state.next({ ...this.state.value, ...partial });
}
\`\`\`

## Сравнение

- **scan** — декларативный, чистые переходы, ближе к Redux, легко тестировать; но нет синхронного снимка.
- **BehaviorSubject** — есть \`.value\` (снимок), проще для CRUD; переходы императивны.

## Важно

- \`shareReplay({bufferSize:1, refCount:true})\` нужен, чтобы все подписчики делили одно состояние и получали последнее. Без него каждый \`subscribe\` запустит \`scan\` заново.
- \`asObservable()\` скрывает \`next\` от потребителей — инкапсуляция.`,
      en: `## The idea

You can build a mini-Redux without libraries: a stream of actions + a pure reduce function via \`scan\`, with the current state fanned out via multicast.

## The scan variant

\`scan\` is "reduce over time": it accumulates state, emitting it on each action.

\`\`\`ts
type Action = { type: 'inc' } | { type: 'dec' } | { type: 'set'; value: number };

private actions$ = new Subject<Action>();

readonly state$ = this.actions$.pipe(
  scan((state, action) => {
    switch (action.type) {
      case 'inc': return { count: state.count + 1 };
      case 'dec': return { count: state.count - 1 };
      case 'set': return { count: action.value };
    }
  }, { count: 0 }),
  startWith({ count: 0 }),
  shareReplay({ bufferSize: 1, refCount: true })
);

dispatch(action: Action) { this.actions$.next(action); }
\`\`\`

## The BehaviorSubject variant

Simpler for imperative updates and synchronous reads:

\`\`\`ts
private state = new BehaviorSubject<State>({ count: 0 });
readonly state$ = this.state.asObservable();

get snapshot() { return this.state.value; }
patch(partial: Partial<State>) {
  this.state.next({ ...this.state.value, ...partial });
}
\`\`\`

## Comparison

- **scan** — declarative, pure transitions, closer to Redux, easy to test; but no synchronous snapshot.
- **BehaviorSubject** — has \`.value\` (a snapshot), simpler for CRUD; transitions are imperative.

## Important

- \`shareReplay({bufferSize:1, refCount:true})\` is needed so all subscribers share one state and get the latest. Without it each \`subscribe\` re-runs \`scan\`.
- \`asObservable()\` hides \`next\` from consumers — encapsulation.`
    }
  },
  {
    id: 'rxjs-034',
    category: 'rxjs-state',
    level: 'Expert',
    tags: ['glitch', 'combinelatest', 'gotcha'],
    question: {
      ru: 'Что такое «glitch» (промежуточные состояния) в combineLatest и как с ним бороться?',
      en: 'What is a "glitch" (intermediate state) in combineLatest and how do you deal with it?'
    },
    answer: {
      ru: `## Проблема

Когда два потока **происходят из одного источника** (diamond dependency), \`combineLatest\` может выдать **промежуточное, несогласованное** состояние — «glitch».

\`\`\`ts
const a$ = source$.pipe(map(x => x));
const b$ = source$.pipe(map(x => x * 2));

combineLatest([a$, b$]).subscribe(console.log);
// При новой эмиссии source: combineLatest сработает дважды —
// сначала [новое a, старое b], потом [новое a, новое b].
// Первая эмиссия — это glitch (a обновился, b ещё нет).
\`\`\`

## Почему так

\`combineLatest\` эмитит на **каждую** эмиссию любого входа. Поскольку \`source$\` push-ит значение синхронно сначала в \`a$\`, затем в \`b$\`, между ними combineLatest успевает эмитнуть несогласованную пару.

## Решения

### 1. Комбинировать ДО разветвления

Делайте производные вычисления одним \`map\` после \`source$\`, а не разводите и снова сводите:

\`\`\`ts
source$.pipe(map(x => ({ a: x, b: x * 2 })));
\`\`\`

### 2. distinctUntilChanged / debounceTime

\`auditTime(0)\` или \`debounceTime(0)\` после combineLatest «схлопывают» синхронную пачку эмиссий в одну (последнюю согласованную):

\`\`\`ts
combineLatest([a$, b$]).pipe(auditTime(0));
\`\`\`

### 3. Signals не глитчат

Граф \`computed\` в Angular Signals **glitch-free**: производное значение пересчитывается один раз после согласования всех зависимостей (pull + topological). Это аргумент в пользу Signals для производного состояния.

## Вывод

Glitch — следствие push-модели и diamond-зависимостей. Минимизируйте разветвление общего источника; для сложного производного состояния рассмотрите Signals.`,
      en: `## The problem

When two streams **derive from the same source** (a diamond dependency), \`combineLatest\` can emit an **intermediate, inconsistent** state — a "glitch".

\`\`\`ts
const a$ = source$.pipe(map(x => x));
const b$ = source$.pipe(map(x => x * 2));

combineLatest([a$, b$]).subscribe(console.log);
// On a new source emission combineLatest fires twice —
// first [new a, old b], then [new a, new b].
// The first emission is the glitch (a updated, b not yet).
\`\`\`

## Why it happens

\`combineLatest\` emits on **every** emission of any input. Since \`source$\` pushes synchronously first into \`a$\`, then into \`b$\`, combineLatest emits an inconsistent pair in between.

## Solutions

### 1. Combine BEFORE branching

Do derivations in a single \`map\` after \`source$\`, instead of splitting and re-joining:

\`\`\`ts
source$.pipe(map(x => ({ a: x, b: x * 2 })));
\`\`\`

### 2. distinctUntilChanged / debounceTime

\`auditTime(0)\` or \`debounceTime(0)\` after combineLatest collapses the synchronous burst into one (the last, consistent) emission:

\`\`\`ts
combineLatest([a$, b$]).pipe(auditTime(0));
\`\`\`

### 3. Signals do not glitch

Angular Signals' \`computed\` graph is **glitch-free**: a derived value is recomputed once after all dependencies settle (pull + topological). This is an argument for Signals for derived state.

## Takeaway

A glitch is a consequence of the push model and diamond dependencies. Minimize branching of a shared source; for complex derived state, consider Signals.`
    }
  },
  {
    id: 'rxjs-035',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['mergemap', 'backpressure', 'concurrency'],
    question: {
      ru: 'Что такое backpressure в контексте RxJS и как ограничить конкурентность mergeMap?',
      en: 'What is backpressure in the RxJS context and how do you limit mergeMap concurrency?'
    },
    answer: {
      ru: `## Backpressure

Backpressure — ситуация, когда **producer эмитит быстрее**, чем consumer успевает обрабатывать. В классическом RxJS нет встроенного reactive-streams backpressure (как в Project Reactor), но есть операторы для управления потоком: lossy (теряют значения) и буферизующие.

## Стратегии

### Lossy (отбрасывают)

- \`throttleTime\`, \`auditTime\`, \`sampleTime\`, \`debounceTime\` — пропускают только часть значений.
- \`exhaustMap\` — игнорирует новые, пока занят.

### Буферизующие

- \`bufferTime\`, \`bufferCount\` — собирают в пачки.
- \`concatMap\` — выстраивает в очередь (буфер растёт, если источник быстрее обработки → риск памяти).

### Ограничение конкурентности

\`mergeMap(project, concurrency)\` — второй аргумент задаёт максимум **одновременных** внутренних подписок. Остальные ставятся в очередь.

\`\`\`ts
// не более 3 параллельных загрузок одновременно
from(fileIds).pipe(
  mergeMap(id => uploadFile(id), 3)
).subscribe();
\`\`\`

## Почему это важно

- Неограниченный \`mergeMap\` на быстром источнике может породить **тысячи** одновременных HTTP-запросов → исчерпание соединений, падение сервера.
- \`concurrency = 1\` делает \`mergeMap\` эквивалентным \`concatMap\` (очередь по одному).

## Выбор стратегии

- Нужны все значения, но контролируемо → \`mergeMap(fn, N)\` или \`concatMap\`.
- Можно терять промежуточные → \`switchMap\`/\`throttle\`/\`audit\`.
- Защита от дубль-кликов → \`exhaustMap\`.

Главное — осознанно решить, что делать с «лишними» значениями: обработать с лимитом, выстроить в очередь или отбросить.`,
      en: `## Backpressure

Backpressure is when a **producer emits faster** than the consumer can process. Classic RxJS has no built-in reactive-streams backpressure (like Project Reactor), but it has operators to manage flow: lossy (drop values) and buffering.

## Strategies

### Lossy (drop)

- \`throttleTime\`, \`auditTime\`, \`sampleTime\`, \`debounceTime\` — let only some values through.
- \`exhaustMap\` — ignores new ones while busy.

### Buffering

- \`bufferTime\`, \`bufferCount\` — collect into batches.
- \`concatMap\` — queues up (the buffer grows if the source is faster than processing → memory risk).

### Limiting concurrency

\`mergeMap(project, concurrency)\` — the second argument sets the maximum number of **simultaneous** inner subscriptions. The rest are queued.

\`\`\`ts
// at most 3 parallel uploads at once
from(fileIds).pipe(
  mergeMap(id => uploadFile(id), 3)
).subscribe();
\`\`\`

## Why it matters

- An unbounded \`mergeMap\` on a fast source can spawn **thousands** of simultaneous HTTP requests → connection exhaustion, server overload.
- \`concurrency = 1\` makes \`mergeMap\` equivalent to \`concatMap\` (one-at-a-time queue).

## Choosing a strategy

- Need all values but controlled → \`mergeMap(fn, N)\` or \`concatMap\`.
- Can drop intermediates → \`switchMap\`/\`throttle\`/\`audit\`.
- Double-click protection → \`exhaustMap\`.

The key is to consciously decide what to do with "extra" values: process with a limit, queue, or drop.`
    }
  },
  {
    id: 'rxjs-036',
    category: 'rxjs-state',
    level: 'Hard',
    tags: ['architecture', 'state-management', 'patterns'],
    question: {
      ru: 'Как выбрать подход к state management в Angular-приложении? Сравните уровни сложности.',
      en: 'How do you choose a state management approach in an Angular app? Compare complexity levels.'
    },
    answer: {
      ru: `## Не всё состояние одинаково

Архитектурный навык — **подбирать инструмент под масштаб**, а не тащить NgRx везде. Разделяйте виды состояния:

- **Локальное UI** (открыт ли дропдаун) — поле компонента / signal.
- **Серверное/кэш** (данные из API) — часто лучше \`@tanstack/query\`-подобный кэш или сервис с \`shareReplay\`.
- **Глобальное клиентское** (текущий пользователь, тема, корзина) — store.

## Лестница сложности

### 1. Локальные поля / Signals

Простейшее. Для изолированного состояния компонента. Нулевой boilerplate.

### 2. Сервис с BehaviorSubject / SignalStore

«Service with a Subject»: инкапсулирует состояние, отдаёт Observable/signal. Достаточно для среднего разделяемого состояния feature-модуля.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class CartService {
  private items = signal<Item[]>([]);
  readonly total = computed(() => this.items().reduce((s, i) => s + i.price, 0));
  add(item: Item) { this.items.update(arr => [...arr, item]); }
}
\`\`\`

### 3. @ngrx/signals SignalStore

Структурированный store с computed/methods/entities — когда сервиса мало, но Redux избыточен.

### 4. NgRx Store / NGXS

Полный Redux: actions, reducers, effects, DevTools, time-travel. Для крупных приложений со сложным, широко разделяемым состоянием, многими командами, требованием аудита.

## Критерии выбора

- **Масштаб и команда**: больше людей/фич → строже структура.
- **Сложность асинхронности**: много гонок/отмен → RxJS-effects.
- **Нужен ли аудит/DevTools** → NgRx.
- **Цена boilerplate**: не платите за неё без необходимости.

Правило: начинайте с простого (signals/сервис), поднимайтесь по лестнице, только когда боль реальна.`,
      en: `## Not all state is the same

An architectural skill is **matching the tool to the scale**, not dragging NgRx everywhere. Distinguish kinds of state:

- **Local UI** (is a dropdown open) — a component field / signal.
- **Server/cache** (API data) — often better served by a \`@tanstack/query\`-like cache or a service with \`shareReplay\`.
- **Global client** (current user, theme, cart) — a store.

## The complexity ladder

### 1. Local fields / Signals

The simplest. For isolated component state. Zero boilerplate.

### 2. Service with a BehaviorSubject / SignalStore

"Service with a Subject": encapsulates state, exposes an Observable/signal. Enough for moderate shared state in a feature module.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class CartService {
  private items = signal<Item[]>([]);
  readonly total = computed(() => this.items().reduce((s, i) => s + i.price, 0));
  add(item: Item) { this.items.update(arr => [...arr, item]); }
}
\`\`\`

### 3. @ngrx/signals SignalStore

A structured store with computed/methods/entities — when a service is not enough but Redux is overkill.

### 4. NgRx Store / NGXS

Full Redux: actions, reducers, effects, DevTools, time-travel. For large apps with complex, widely shared state, many teams, and auditing requirements.

## Choice criteria

- **Scale and team**: more people/features → stricter structure.
- **Async complexity**: many races/cancellations → RxJS effects.
- **Need for auditing/DevTools** → NgRx.
- **Cost of boilerplate**: do not pay it unnecessarily.

Rule: start simple (signals/service) and climb the ladder only when the pain is real.`
    }
  }
];
