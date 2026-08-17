import { InterviewQuestion } from '../interfaces/question.interface';

export const RXJS_STATE_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'rxjs-001',
    category: 'js-state',
    level: 'Hard',
    tags: ['observable', 'internals', 'lazy', 'unicast'],
    question: {
      ru: 'Что такое Observable «под капотом»? Объясните ленивость, unicast-природу и контракт Observer.',
      en: 'What is an Observable "under the hood"? Explain laziness, the unicast nature, and the Observer contract.'
    },
    answer: {
      ru: `## Коротко

\`Observable\` — это **не поток данных, а рецепт потока**. Вы описываете функцию «что делать, когда на меня подпишутся», и она лежит без дела до первого \`subscribe()\`. Подписались — рецепт выполнился заново, **лично для вас**.

Аналогия: это не кастрюля супа, а **карточка с рецептом**. Пока никто не готовит — на кухне тихо. Пришёл второй гость — варят вторую кастрюлю с нуля, а не наливают из первой.

## Как это работает по шагам

1. \`new Observable(fn)\` просто **запоминает** функцию \`fn\`. Ничего не выполняется, побочных эффектов нет.
2. Кто-то зовёт \`subscribe(observer)\`. RxJS оборачивает ваш observer в \`Subscriber\` — «безопасную» обёртку.
3. Только теперь запускается \`fn(subscriber)\`: уходит HTTP-запрос, стартует таймер, открывается сокет.
4. Внутри \`fn\` вы дёргаете \`subscriber.next(v)\` — сколько угодно раз.
5. Заканчиваете либо \`complete()\`, либо \`error(e)\` — **терминально, ровно один раз**.
6. \`fn\` возвращает teardown-функцию; её вызовут при завершении или при \`unsubscribe()\`.
7. Пришёл второй подписчик — шаги 2–6 повторяются **с самого начала и независимо**. Это и есть **unicast**.

## Контракт Observer: грамматика потока

Observer — обычный объект с тремя методами:

- \`next(value)\` — 0..N раз;
- \`error(err)\` — терминальный, максимум один раз;
- \`complete()\` — терминальный, максимум один раз.

Формула: \`next* (error | complete)?\` — «сколько угодно next, потом максимум одно завершение». После терминального события значения не проходят, даже если источник их шлёт, и сразу срабатывает teardown. Следит за этим \`Subscriber\`: он проверяет контракт, ловит исключения в колбэках и хранит логику освобождения ресурсов.

## Пример

\`\`\`ts
const obs = new Observable<number>((subscriber) => {
  console.log('старт'); // напечатается на КАЖДУЮ подписку
  subscriber.next(1);
  subscriber.complete();
  subscriber.next(2);   // молча проигнорировано — поток уже закрыт
  return () => console.log('teardown');
});

obs.subscribe(v => console.log('A', v)); // старт, A 1, teardown
obs.subscribe(v => console.log('B', v)); // старт, B 1, teardown
\`\`\`

Почему так: \`next(2)\` теряется, потому что после \`complete()\` \`Subscriber\` закрыт. А «старт» печатается дважды, потому что каждая подписка — **отдельное выполнение**. По этой же причине в Angular HTTP-запрос не уйдёт, пока вы не подписались (или пока за вас не подписался \`async\`-пайп).

## Что сказать на собеседовании

> Observable — это ленивая unicast-абстракция над «функцией подписки». Конструктор принимает \`(subscriber) => teardown\`, и эта функция не выполняется до вызова \`subscribe()\`: сам Observable — только описание потока, а не работающий код. Каждая подписка запускает цепочку заново и создаёт независимое выполнение, поэтому два подписчика на \`http.get()\` дадут два реальных запроса. Поток обязан соблюдать контракт Observer с грамматикой \`next* (error | complete)?\`: после \`error\` или \`complete\` значений больше нет и вызывается teardown. Гарантирует это \`Subscriber\` — безопасная обёртка над Observer, которая ещё и ловит исключения в колбэках. Чтобы разделить одно выполнение между подписчиками, нужен multicast — \`share\`/\`shareReplay\`, то есть Subject между источником и потребителями.

## Ловушки

- **«Observable — это как Promise»** — нет. Promise стартует сразу (eager), кэширует один результат и не отменяется; Observable ленив, unicast, многозначен и отменяем.
- **Два \`| async\` на один \`http.get()\`** — это два реальных запроса. Лечится \`shareReplay({ bufferSize: 1, refCount: true })\`.
- **Забыли вернуть teardown** — таймер или слушатель живут после отписки: утечка и «фантомные» эмиссии.
- **\`next\` после \`complete\`** не бросает ошибку, а тихо игнорируется — значение теряется, а причину ищут долго.
- **Спросят следом**: «а Subject тогда что?» — Subject multicast и hot, он не создаёт новое выполнение на каждого подписчика.
- **И ещё**: Observable сам по себе **не асинхронен** — код внутри \`new Observable\` может отработать полностью синхронно; асинхронность приносит источник или scheduler.`,
      en: `## In short

An \`Observable\` is **not a stream of data — it is a recipe for one**. You describe a function saying "here is what to do when somebody subscribes to me", and it just sits there until the first \`subscribe()\`. Subscribe, and the recipe is executed from scratch, **just for you**.

Analogy: it is not a pot of soup, it is a **recipe card**. While nobody is cooking, the kitchen is quiet. A second guest arrives and a second pot gets cooked from the beginning — nobody pours from the first one.

## How it works, step by step

1. \`new Observable(fn)\` merely **remembers** \`fn\`. Nothing runs, no side effects happen.
2. Somebody calls \`subscribe(observer)\`. RxJS wraps your observer in a \`Subscriber\` — a "safe" wrapper.
3. Only now does \`fn(subscriber)\` run: the HTTP request goes out, the timer starts, the socket opens.
4. Inside \`fn\` you call \`subscriber.next(v)\` — as many times as you like.
5. You finish with either \`complete()\` or \`error(e)\` — **terminal, exactly once**.
6. \`fn\` returns a teardown function; it is invoked on termination or on \`unsubscribe()\`.
7. A second subscriber arrives — steps 2–6 repeat **from the start, independently**. That is **unicast**.

## The Observer contract: the grammar of a stream

An Observer is a plain object with three methods:

- \`next(value)\` — 0..N times;
- \`error(err)\` — terminal, at most once;
- \`complete()\` — terminal, at most once.

The formula: \`next* (error | complete)?\` — "any number of nexts, then at most one termination". After a terminal event no values get through, even if the producer keeps sending them, and teardown fires immediately. The \`Subscriber\` polices this: it enforces the contract, catches exceptions in callbacks, and holds the resource-releasing logic.

## Example

\`\`\`ts
const obs = new Observable<number>((subscriber) => {
  console.log('start'); // printed on EVERY subscription
  subscriber.next(1);
  subscriber.complete();
  subscriber.next(2);   // silently ignored — the stream is already closed
  return () => console.log('teardown');
});

obs.subscribe(v => console.log('A', v)); // start, A 1, teardown
obs.subscribe(v => console.log('B', v)); // start, B 1, teardown
\`\`\`

Why: \`next(2)\` is lost because the \`Subscriber\` is closed after \`complete()\`. And "start" prints twice because each subscription is a **separate execution**. Same reason an Angular HTTP request never fires until you subscribe (or until the \`async\` pipe subscribes for you).

## What to say in the interview

> An Observable is a lazy, unicast abstraction over a "subscribe function". The constructor takes \`(subscriber) => teardown\`, and that function does not run until \`subscribe()\` is called: the Observable itself is only a description of a stream, not running code. Every subscription re-runs the chain and produces an independent execution, which is why two subscribers on \`http.get()\` mean two real requests. The stream must honour the Observer contract with the grammar \`next* (error | complete)?\`: after \`error\` or \`complete\` no more values arrive and teardown runs. The \`Subscriber\` enforces that — it is a safe wrapper around the Observer that also catches exceptions in callbacks. To share a single execution across subscribers you need multicasting — \`share\`/\`shareReplay\`, i.e. a Subject sitting between producer and consumers.

## Gotchas

- **"An Observable is basically a Promise"** — no. A Promise is eager, caches one result, and cannot be cancelled; an Observable is lazy, unicast, multi-valued, and cancellable.
- **Two \`| async\` on one \`http.get()\`** means two real requests. Fix with \`shareReplay({ bufferSize: 1, refCount: true })\`.
- **Forgetting to return teardown** — the timer or listener outlives the unsubscription: a leak plus "phantom" emissions.
- **\`next\` after \`complete\`** does not throw, it is silently dropped — the value disappears and the cause is hard to track down.
- **Follow-up question**: "then what is a Subject?" — a Subject is multicast and hot; it does not create a new execution per subscriber.
- **And another**: an Observable is **not inherently asynchronous** — the code in \`new Observable\` may run fully synchronously; asynchrony comes from the producer or a scheduler.`
    }
  },
  {
    id: 'rxjs-002',
    category: 'js-state',
    level: 'Hard',
    tags: ['teardown', 'subscription', 'memory-leak'],
    question: {
      ru: 'Как работает teardown-логика и почему так важно её возвращать из функции подписки?',
      en: 'How does teardown logic work and why is it important to return it from the subscribe function?'
    },
    answer: {
      ru: `## Коротко

Teardown — это **функция уборки**, которую вы возвращаете из тела Observable. RxJS вызовет её, когда поток закончится **любым** способом: \`complete()\`, \`error()\` или \`unsubscribe()\`. Внутри вы гасите то, что зажгли: таймер, слушатель события, сокет, запрос.

Аналогия: снял квартиру — при выезде надо **сдать ключи и выключить воду**. RxJS честно напомнит вам о выезде, но кран за вас не закроет: если вы не написали teardown, вода будет литься дальше — за ваш счёт.

## Как это работает по шагам

1. Внутри \`new Observable(sub => ...)\` вы создаёте ресурс (\`setInterval\`, \`addEventListener\`, WebSocket).
2. Из этой же функции вы **возвращаете** функцию-уборщик.
3. RxJS кладёт её в объект \`Subscription\` — тот хранит список «финализаторов».
4. \`pipe\` строит **дерево** подписок: внешняя подписка добавляет внутреннюю как child.
5. Наступает конец — \`unsubscribe()\`, \`complete()\` или \`error()\`. Подписка помечается \`closed\`.
6. Все финализаторы вызываются **рекурсивно вниз по дереву**: сначала ваши, потом внутренних операторов. Так отмена доезжает до самого источника.
7. Повторный \`unsubscribe()\` ничего не ломает: teardown **идемпотентен** и выполнится ровно один раз.

## Пример

\`\`\`ts
const timer$ = new Observable<number>((sub) => {
  let i = 0;
  const id = setInterval(() => sub.next(i++), 1000);
  return () => clearInterval(id); // обязательно!
});

const s = timer$.subscribe(console.log);
setTimeout(() => s.unsubscribe(), 3500); // interval реально остановится
\`\`\`

Почему так: без \`clearInterval\` таймер тикал бы вечно. \`Subscriber\` после отписки просто **игнорирует** входящие \`next\`, но сам продюсер об этом не знает и продолжает работать — остановить его может только ваш teardown.

## Что сказать на собеседовании

> Teardown — это функция, возвращаемая из функции подписки Observable; RxJS вызывает её при любом завершении подписки: \`complete\`, \`error\` или \`unsubscribe\`. Это единственное место, где корректно освобождать ресурсы — снимать интервалы и слушатели, закрывать сокеты, отменять запросы. Технически teardown регистрируется в \`Subscription\` как финализатор, а \`pipe\` выстраивает иерархию подписок, где внешняя добавляет внутренние как children, поэтому \`unsubscribe\` рекурсивно распространяется вниз по всей цепочке операторов до источника. Важный нюанс: после отписки \`Subscriber\` перестаёт пропускать значения, но продюсер сам по себе не останавливается — без teardown он продолжит работу, и мы получим утечку памяти и фантомные эмиссии. Teardown идемпотентен: повторный \`unsubscribe\` безопасен и уборка выполнится один раз.

## Ловушки

- **Нет teardown у бесконечного источника** — классическая утечка. Особенно \`setInterval\`, \`addEventListener\`, WebSocket.
- **«Я же отписался, значит всё остановилось»** — нет: отписка глушит доставку, а не сам продюсер.
- **Кинуть исключение внутри teardown** — оставит остальные финализаторы невыполненными; уборка должна быть безопасной.
- **Забыть, что \`complete()\` тоже вызывает teardown** — поэтому HTTP-потоки чистятся сами, а \`interval\` — нет.
- **Спросят следом**: чем teardown отличается от \`finalize\`? Teardown — часть **продюсера** (внутри Observable), \`finalize\` — оператор в \`pipe\` для **потребителя**; срабатывают оба, но живут на разных уровнях.
- **И ещё**: при обёртке браузерных API один экземпляр Observable может иметь много подписчиков — считайте ресурсы на подписку, иначе \`disconnect()\` первого убьёт остальных.`,
      en: `## In short

Teardown is the **clean-up function** you return from the body of an Observable. RxJS calls it when the stream ends **any** way at all: \`complete()\`, \`error()\`, or \`unsubscribe()\`. Inside it you switch off whatever you switched on: a timer, an event listener, a socket, a request.

Analogy: you rent a flat — when you move out you **hand back the keys and turn off the tap**. RxJS reliably tells you that move-out day has come, but it will not close the tap for you: no teardown, and the water keeps running on your bill.

## How it works, step by step

1. Inside \`new Observable(sub => ...)\` you create a resource (\`setInterval\`, \`addEventListener\`, a WebSocket).
2. From that same function you **return** a clean-up function.
3. RxJS stores it in the \`Subscription\` object, which keeps a list of "finalizers".
4. \`pipe\` builds a **tree** of subscriptions: the outer subscription adds the inner one as a child.
5. The end comes — \`unsubscribe()\`, \`complete()\`, or \`error()\`. The subscription is marked \`closed\`.
6. All finalizers run **recursively down the tree**: yours first, then those of the inner operators. That is how cancellation reaches the actual producer.
7. Calling \`unsubscribe()\` again breaks nothing: teardown is **idempotent** and runs exactly once.

## Example

\`\`\`ts
const timer$ = new Observable<number>((sub) => {
  let i = 0;
  const id = setInterval(() => sub.next(i++), 1000);
  return () => clearInterval(id); // mandatory!
});

const s = timer$.subscribe(console.log);
setTimeout(() => s.unsubscribe(), 3500); // the interval really stops
\`\`\`

Why: without \`clearInterval\` the timer would tick forever. After unsubscription the \`Subscriber\` simply **ignores** incoming \`next\` calls, but the producer knows nothing about that and keeps working — only your teardown can stop it.

## What to say in the interview

> Teardown is the function returned from an Observable's subscribe function; RxJS invokes it on any termination of the subscription — \`complete\`, \`error\`, or \`unsubscribe\`. It is the only correct place to release resources: clear intervals and listeners, close sockets, cancel requests. Technically the teardown is registered on the \`Subscription\` as a finalizer, and \`pipe\` builds a hierarchy of subscriptions where the outer one adds inner ones as children, so \`unsubscribe\` propagates recursively down the whole operator chain to the source. The important nuance is that after unsubscribing the \`Subscriber\` stops delivering values, but the producer does not stop by itself — without teardown it keeps running and you get a memory leak plus phantom emissions. Teardown is idempotent: a repeated \`unsubscribe\` is safe and the clean-up happens once.

## Gotchas

- **No teardown on an infinite producer** — the classic leak. Especially \`setInterval\`, \`addEventListener\`, WebSockets.
- **"I unsubscribed, so everything stopped"** — no: unsubscribing mutes delivery, not the producer.
- **Throwing inside teardown** leaves the remaining finalizers unexecuted; clean-up must be defensive.
- **Forgetting that \`complete()\` also triggers teardown** — which is why HTTP streams clean themselves up and \`interval\` does not.
- **Follow-up question**: how does teardown differ from \`finalize\`? Teardown belongs to the **producer** (inside the Observable), \`finalize\` is an operator in the \`pipe\` for the **consumer**; both fire, but they live at different levels.
- **And another**: when wrapping browser APIs, one Observable instance can have many subscribers — count resources per subscription, or the first \`disconnect()\` kills everyone else.`
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
    category: 'js-state',
    level: 'Medium',
    tags: ['hot-cold', 'multicasting'],
    question: {
      ru: 'В чём разница между hot и cold Observable? Как сделать cold-поток горячим?',
      en: 'What is the difference between hot and cold Observables? How do you make a cold stream hot?'
    },
    answer: {
      ru: `## Коротко

Вопрос простой: **где живёт продюсер данных**. Если он рождается внутри Observable и заново на каждую подписку — поток **cold**. Если он живёт снаружи и один на всех — поток **hot**.

Аналогия: cold — это **личная запись фильма**: каждый включает с первой минуты, у каждого своя копия. Hot — **прямой эфир**: включился в середине — начало пропустил, и эфир идёт один на всех зрителей.

## Как это работает по шагам

1. У cold-потока функция подписки создаёт продюсера: \`interval\` заводит свой таймер, \`http.get\` шлёт свой запрос.
2. Второй подписчик → второй таймер, второй запрос. Значения у подписчиков **свои** и с самого начала.
3. У hot-потока продюсер уже существует: клики в документе идут независимо от того, слушает их кто-то или нет.
4. Подписчик просто **подключается к идущему эфиру** и ловит то, что случится дальше. Всё, что было до, он не увидит.
5. Чтобы сделать cold горячим, между источником и подписчиками ставят \`Subject\` — это и есть **multicasting**.
6. Источник подписывается **один раз**, \`Subject\` раздаёт его значения всем: одно выполнение на многих.

## Пример

\`\`\`ts
const cold$ = interval(1000);
const hot$ = cold$.pipe(share()); // multicast с refCount

hot$.subscribe(x => console.log('A', x));
setTimeout(() => hot$.subscribe(x => console.log('B', x)), 2500);
// A 0, A 1, A 2 / B 2, A 3 / B 3 ...
\`\`\`

Почему так: без \`share()\` у B был бы **свой** таймер и он начал бы с нуля. С \`share()\` таймер один, поэтому B подключается «в середине эфира» и сразу видит \`2\`.

## Что сказать на собеседовании

> Разница в том, где находится продюсер значений. У cold Observable продюсер создаётся внутри функции подписки и заново на каждый \`subscribe\`, поэтому каждый подписчик получает независимое выполнение с начала — это \`of\`, \`from\`, \`HttpClient.get\`, \`interval\`. У hot Observable продюсер существует вне потока и разделяется, поэтому подписчики видят только те значения, что пришли после подключения, и ранние эмиссии могут пропустить — это \`Subject\`, \`fromEvent\`, WebSocket. Превращают cold в hot мультикастингом: \`share\`, \`shareReplay\`, \`connectable\` — или устаревший \`multicast\` — вставляют между источником и подписчиками Subject, источник запускается один раз, а Subject раздаёт значения всем. Практически это важно, чтобы два \`| async\` на один HTTP-запрос не превращались в два реальных запроса.

## Ловушки

- **\`HttpClient.get()\` — cold**. Каждая подписка — новый запрос; «он же выполнился один раз» — типичная ошибка.
- **\`share()\` не хранит историю**: подписался позже — предыдущие значения не получишь. Нужна история — \`shareReplay\`.
- **Hot ≠ «уже запущен»**: \`share()\` стартует источник только с приходом первого подписчика (refCount).
- **Отписались все → \`share()\` сбрасывается**, и следующий подписчик запустит источник заново. Иногда это сюрприз.
- **Спросят следом**: warm/connectable — поток, который multicast, но стартует вручную по \`connect()\`.
- **И ещё**: Subject — это hot по определению, поэтому значения, отправленные до подписки, теряются навсегда.`,
      en: `## In short

The question is simple: **where does the producer live**. If it is born inside the Observable, freshly on every subscription, the stream is **cold**. If it lives outside and there is only one of it, the stream is **hot**.

Analogy: cold is your **personal recording of a film** — everyone starts at minute one, everyone has their own copy. Hot is a **live broadcast**: tune in halfway and you missed the beginning, and the same broadcast serves every viewer.

## How it works, step by step

1. In a cold stream the subscribe function creates the producer: \`interval\` starts its own timer, \`http.get\` sends its own request.
2. A second subscriber → a second timer, a second request. Each subscriber gets **its own** values, from the beginning.
3. In a hot stream the producer already exists: document clicks happen whether or not anyone is listening.
4. A subscriber simply **tunes into the ongoing broadcast** and catches what happens next. Anything earlier is gone for them.
5. To turn cold into hot you put a \`Subject\` between the source and the subscribers — that is **multicasting**.
6. The source is subscribed **once**, and the \`Subject\` fans its values out: one execution, many consumers.

## Example

\`\`\`ts
const cold$ = interval(1000);
const hot$ = cold$.pipe(share()); // multicast with refCount

hot$.subscribe(x => console.log('A', x));
setTimeout(() => hot$.subscribe(x => console.log('B', x)), 2500);
// A 0, A 1, A 2 / B 2, A 3 / B 3 ...
\`\`\`

Why: without \`share()\`, B would get **its own** timer and start from zero. With \`share()\` there is a single timer, so B joins "mid-broadcast" and immediately sees \`2\`.

## What to say in the interview

> The difference is where the producer of values lives. In a cold Observable the producer is created inside the subscribe function, anew on every \`subscribe\`, so each subscriber gets an independent execution from the start — that is \`of\`, \`from\`, \`HttpClient.get\`, \`interval\`. In a hot Observable the producer exists outside the stream and is shared, so subscribers only see values emitted after they connect and may miss earlier ones — that is \`Subject\`, \`fromEvent\`, WebSockets. You turn cold into hot with multicasting: \`share\`, \`shareReplay\`, \`connectable\` — or the deprecated \`multicast\` — insert a Subject between source and subscribers, the source runs once, and the Subject distributes values to everyone. In practice this matters so that two \`| async\` bindings on one HTTP call do not become two real requests.

## Gotchas

- **\`HttpClient.get()\` is cold**. Every subscription is a new request; "but it already ran once" is the classic mistake.
- **\`share()\` keeps no history**: subscribe late and earlier values are gone. Need history? Use \`shareReplay\`.
- **Hot does not mean "already started"**: \`share()\` only starts the source when the first subscriber arrives (refCount).
- **Everyone unsubscribes → \`share()\` resets**, and the next subscriber restarts the source. That surprises people.
- **Follow-up question**: warm/connectable — a stream that is multicast but starts manually via \`connect()\`.
- **And another**: a Subject is hot by definition, so anything emitted before you subscribed is lost forever.`
    }
  },
  {
    id: 'rxjs-004',
    category: 'js-state',
    level: 'Hard',
    tags: ['subjects', 'behaviorsubject', 'replaysubject'],
    question: {
      ru: 'Сравните Subject, BehaviorSubject, ReplaySubject и AsyncSubject. Когда какой использовать?',
      en: 'Compare Subject, BehaviorSubject, ReplaySubject, and AsyncSubject. When do you use each?'
    },
    answer: {
      ru: `## Коротко

Subject — это **радиостанция**: одновременно и Observable (его слушают), и Observer (в него можно вещать через \`next\`). Он всегда multicast и hot: один эфир на всех.

Четыре вида отличаются ровно одним — **что услышит опоздавший**, который подключился только что.

## Четыре Subject — в чём разница

1. **\`Subject\`** — «живой эфир без записи». Опоздавший слышит только то, что скажут дальше. Всё сказанное до подписки — потеряно.
2. **\`BehaviorSubject\`** — «эфир + табличка с текущим значением». Требует **начальное значение** и хранит последнее. Опоздавший сразу получает текущее, а потом слушает дальше. Есть синхронный геттер \`.value\`.
3. **\`ReplaySubject\`** — «эфир с записью последних N выпусков». Буферизует \`bufferSize\` значений (опционально с окном \`windowTime\`), и новый подписчик получает **весь буфер** сразу.
4. **\`AsyncSubject\`** — «объявление победителя в конце». Молчит всё время и выдаёт **только последнее** значение — и **только когда вызовут \`complete()\`**.

## Когда что использовать

- **Состояние** (текущий пользователь, тема, корзина) → \`BehaviorSubject\`. Всегда есть «значение прямо сейчас».
- **События/команды** (клик «сохранить», «перезагрузи список») → \`Subject\`. Начальное значение здесь вредно.
- **Догнать поздних подписчиков / кэш последних N событий** → \`ReplaySubject\`.
- **Единственный финальный результат операции** → \`AsyncSubject\` (по смыслу это промис).

## Пример

\`\`\`ts
const b = new BehaviorSubject(0);
b.subscribe(v => console.log('A', v)); // A 0  ← сразу текущее
b.next(1);                             // A 1
b.subscribe(v => console.log('B', v)); // B 1  ← последнее, не 0

const a = new AsyncSubject<number>();
a.subscribe(v => console.log('async', v));
a.next(1); a.next(2); a.complete();    // async 2 ← только на complete
\`\`\`

Почему так: \`BehaviorSubject\` отдаёт «текущее» всем, кто пришёл, а \`AsyncSubject\` копит и выдаёт лишь финал. Обычный \`Subject\` на месте \`b\` не напечатал бы ни \`A 0\`, ни \`B 1\`.

## Что сказать на собеседовании

> Subject — это одновременно Observable и Observer, он multicast и hot: одно выполнение раздаётся всем подписчикам. Обычный \`Subject\` не имеет ни начального значения, ни буфера, поэтому новый подписчик видит только эмиссии после подписки — это шина событий. \`BehaviorSubject\` требует начальное значение, хранит текущее, сразу отдаёт его новому подписчику и даёт синхронный \`.value\` — основа простого state-сервиса. \`ReplaySubject\` буферизует последние \`bufferSize\` значений, опционально с временным окном, а \`AsyncSubject\` эмитит только последнее значение и только при \`complete\`, то есть ведёт себя как промис. Из нюансов: большой буфер ReplaySubject удерживает ссылки на объекты и легко превращается в утечку, а Subject наружу лучше отдавать через \`asObservable()\`, чтобы потребители не могли в него писать.

## Ловушки

- **Публичный \`Subject\` в сервисе** — любой может вызвать \`next()\`. Наружу отдавайте \`asObservable()\`.
- **\`BehaviorSubject\` для событий** — новый подписчик мгновенно получит «старое» событие и выполнит действие повторно.
- **Большой \`ReplaySubject\`** удерживает объекты в памяти на всё время жизни — утечка.
- **\`AsyncSubject\` без \`complete()\`** не выдаст вообще ничего; это ловят чаще всего.
- **\`.value\` у \`BehaviorSubject\`** удобен, но провоцирует императивный стиль и гонки — читайте через поток, где можно.
- **Спросят следом**: что после \`error()\`? Subject становится «мёртвым» навсегда — новые подписчики сразу получают эту же ошибку, и \`next\` больше не проходит.`,
      en: `## In short

A Subject is a **radio station**: it is an Observable (people listen to it) and an Observer (you can broadcast into it via \`next\`) at the same time. It is always multicast and hot: one broadcast for everybody.

The four flavours differ in exactly one thing — **what a latecomer hears** the moment they tune in.

## The four Subjects — what differs

1. **\`Subject\`** — "live, no recording". A latecomer only hears what is said from now on. Everything said before is gone.
2. **\`BehaviorSubject\`** — "live plus a board showing the current value". It requires an **initial value** and holds the latest one. A latecomer gets the current value immediately, then keeps listening. It exposes a synchronous \`.value\` getter.
3. **\`ReplaySubject\`** — "live plus a recording of the last N episodes". It buffers \`bufferSize\` values (optionally within a \`windowTime\` window) and hands the **whole buffer** to a new subscriber at once.
4. **\`AsyncSubject\`** — "the winner is announced at the end". It stays silent and emits **only the last** value — and **only when \`complete()\` is called**.

## When to use which

- **State** (current user, theme, cart) → \`BehaviorSubject\`. There is always a "value right now".
- **Events/commands** (Save clicked, "reload the list") → \`Subject\`. An initial value would be harmful here.
- **Letting late subscribers catch up / caching the last N events** → \`ReplaySubject\`.
- **A single final result of an operation** → \`AsyncSubject\` (semantically a promise).

## Example

\`\`\`ts
const b = new BehaviorSubject(0);
b.subscribe(v => console.log('A', v)); // A 0  ← current value right away
b.next(1);                             // A 1
b.subscribe(v => console.log('B', v)); // B 1  ← latest, not 0

const a = new AsyncSubject<number>();
a.subscribe(v => console.log('async', v));
a.next(1); a.next(2); a.complete();    // async 2 ← only on complete
\`\`\`

Why: \`BehaviorSubject\` hands the "current" value to whoever arrives, while \`AsyncSubject\` accumulates and only emits the finale. A plain \`Subject\` in place of \`b\` would print neither \`A 0\` nor \`B 1\`.

## What to say in the interview

> A Subject is both an Observable and an Observer; it is multicast and hot, so one execution is fanned out to all subscribers. A plain \`Subject\` has no initial value and no buffer, so a new subscriber only sees emissions after subscribing — that is an event bus. A \`BehaviorSubject\` requires an initial value, holds the current one, delivers it immediately to a new subscriber, and offers a synchronous \`.value\` — that is the basis of a simple state service. A \`ReplaySubject\` buffers the last \`bufferSize\` values, optionally within a time window, and replays that buffer to new subscribers. An \`AsyncSubject\` emits only the last value and only on \`complete\`, behaving like a promise. The choice is simple: state means BehaviorSubject, events mean Subject, a replay cache means ReplaySubject, and a final result means AsyncSubject. As nuances: a large ReplaySubject buffer retains object references and easily becomes a leak, and you should expose a Subject through \`asObservable()\` so consumers cannot write into it.

## Gotchas

- **A public \`Subject\` on a service** — anyone can call \`next()\`. Expose \`asObservable()\` instead.
- **\`BehaviorSubject\` for events** — a new subscriber instantly receives a stale event and repeats the action.
- **A big \`ReplaySubject\`** pins objects in memory for its whole lifetime — a leak.
- **\`AsyncSubject\` without \`complete()\`** emits nothing at all; this is the most commonly missed detail.
- **\`.value\` on a \`BehaviorSubject\`** is convenient but invites imperative code and races — read through the stream where you can.
- **Follow-up question**: what happens after \`error()\`? The Subject is dead forever — new subscribers immediately receive that same error, and \`next\` no longer passes.`
    }
  },
  {
    id: 'rxjs-005',
    category: 'js-state',
    level: 'Expert',
    tags: ['sharereplay', 'multicasting', 'memory-leak'],
    question: {
      ru: 'Какие подводные камни у shareReplay? Объясните refCount, буфер и риск утечки.',
      en: 'What are the pitfalls of shareReplay? Explain refCount, the buffer, and the leak risk.'
    },
    answer: {
      ru: `## Коротко

\`shareReplay\` — это **запись передачи для опоздавших**: он мультикастит источник через внутренний \`ReplaySubject\` и проигрывает новым подписчикам последние \`bufferSize\` значений. Классика для кэширования HTTP-ответа.

Опасность одна: **кто выключает студию, когда все ушли**. Если никто — источник крутится вечно, а запись лежит в памяти. Это и есть утечка.

## Как это работает по шагам

1. Первый подписчик приходит → \`shareReplay\` подписывается на источник **один раз**.
2. Значения идут в внутренний \`ReplaySubject\`, который их **запоминает** (до \`bufferSize\`) и раздаёт всем.
3. Второй, третий подписчик → **не запускают** источник заново, а мгновенно получают буфер и дальше слушают эфир.
4. Все отписались. И вот тут — развилка по флагу \`refCount\`.
5. \`refCount: true\` → счётчик упал до нуля → отписка от источника, буфер сброшен. Следующий подписчик запустит всё **заново**.
6. \`refCount: false\` (историческое поведение) → источник остаётся подписанным **навсегда**, буфер живёт вечно.

## Пример

\`\`\`ts
// бесконечный источник — refCount обязателен
const ticks$ = interval(1000).pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);

// кэш HTTP-ответа: источник сам завершится, вечный кэш здесь осознан
const config$ = this.http.get<Config>('/api/config').pipe(
  shareReplay({ bufferSize: 1, refCount: false })
);
\`\`\`

Почему так: у \`interval\` нет \`complete\`, поэтому без \`refCount: true\` таймер продолжит тикать после ухода последнего подписчика — вечно. А \`http.get\` завершится сам, и «вечный» буфер из одного значения — это ровно то, что нужно для кэша конфига.

## Что сказать на собеседовании

> \`shareReplay\` мультикастит источник через ReplaySubject и повторяет буфер новым подписчикам, поэтому его любят как кэш HTTP-ответа. Главный подводный камень — \`refCount\`: исторически \`shareReplay(n)\` работал с \`refCount: false\`, и даже когда все подписчики ушли, подписка на источник не закрывалась — для бесконечного источника вроде \`interval\` или WebSocket это гарантированная утечка. Поэтому я всегда пишу явный конфиг \`shareReplay({ bufferSize: 1, refCount: true })\`: при обнулении счётчика подписчиков источник отписывается, а при появлении нового — переподписывается. Обратная сторона — буфер при этом теряется, то есть это не вечный кэш; вечный кэш — осознанный \`refCount: false\` на источнике, который завершается. И сам буфер живёт в памяти всё время жизни, так что большой \`bufferSize\` тяжёлых объектов — тоже утечка.

## Ловушки

- **\`shareReplay(1)\` вместо конфига** — короткая форма, но она не объясняет читателю про refCount; пишите объектом.
- **\`refCount: false\` на бесконечном источнике** — гарантированная утечка: сокет/таймер не закроется никогда.
- **Ждать «вечный кэш» от \`refCount: true\`** — буфер сбрасывается, когда подписчиков стало ноль, и запрос уйдёт снова.
- **\`bufferSize\` больше 1 «на всякий случай»** — удерживает тяжёлые объекты; берите ровно столько, сколько нужно.
- **\`shareReplay\` после \`catchError\`/до него** — место в pipe меняет, что именно кэшируется: успешный ответ или в том числе ошибка.
- **Спросят следом**: чем отличается от \`share({ connector: () => new ReplaySubject(1) })\` — это по сути то же самое, только с полным контролем над сбросом (\`resetOnError\`, \`resetOnComplete\`, \`resetOnRefCountZero\`).`,
      en: `## In short

\`shareReplay\` is **a recorded show for latecomers**: it multicasts the source through an internal \`ReplaySubject\` and replays the last \`bufferSize\` values to every new subscriber. The go-to way to cache an HTTP response.

There is exactly one danger: **who turns the studio off when everyone has left**. If nobody does, the source keeps running forever and the recording sits in memory. That is the leak.

## How it works, step by step

1. The first subscriber arrives → \`shareReplay\` subscribes to the source **once**.
2. Values flow into the internal \`ReplaySubject\`, which **remembers** them (up to \`bufferSize\`) and fans them out.
3. A second and third subscriber do **not** restart the source; they instantly get the buffer and then follow the live feed.
4. Everyone unsubscribes. Here is the fork in the road, decided by the \`refCount\` flag.
5. \`refCount: true\` → the count hits zero → it unsubscribes from the source and drops the buffer. The next subscriber starts everything **from scratch**.
6. \`refCount: false\` (the historical behaviour) → the source stays subscribed **forever** and the buffer lives forever.

## Example

\`\`\`ts
// infinite source — refCount is mandatory
const ticks$ = interval(1000).pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);

// caching an HTTP response: the source completes, so an eternal cache is deliberate
const config$ = this.http.get<Config>('/api/config').pipe(
  shareReplay({ bufferSize: 1, refCount: false })
);
\`\`\`

Why: \`interval\` never completes, so without \`refCount: true\` the timer keeps ticking after the last subscriber leaves — forever. \`http.get\` completes on its own, so an "eternal" one-value buffer is exactly what a config cache wants.

## What to say in the interview

> \`shareReplay\` multicasts the source through a ReplaySubject and replays the buffer to new subscribers, which is why people love it as an HTTP cache. The main pitfall is \`refCount\`. Historically \`shareReplay(n)\` behaved as \`refCount: false\`: even after every subscriber left, the subscription to the source stayed open, and for an infinite source like \`interval\` or a WebSocket that is a guaranteed leak. So I always write an explicit config: for infinite sources \`shareReplay({ bufferSize: 1, refCount: true })\`, which unsubscribes from the source when the subscriber count drops to zero and resubscribes when a new one appears. The second point is the buffer: the internal ReplaySubject holds \`bufferSize\` values for its whole lifetime, so a large buffer of heavy objects is also a leak. And third: with \`refCount: true\` the buffer is lost once all subscribers leave, so it is not an eternal cache — an eternal cache is a deliberate \`refCount: false\` on a source that completes.

## Gotchas

- **\`shareReplay(1)\` instead of the config object** — the short form hides the refCount question from the reader; use the object.
- **\`refCount: false\` on an infinite source** — a guaranteed leak: the socket or timer never closes.
- **Expecting an "eternal cache" from \`refCount: true\`** — the buffer resets at zero subscribers and the request goes out again.
- **\`bufferSize\` greater than 1 "just in case"** — it retains heavy objects; take exactly what you need.
- **Placing \`shareReplay\` before or after \`catchError\`** changes what gets cached: the successful response, or the error too.
- **Follow-up question**: how does it differ from \`share({ connector: () => new ReplaySubject(1) })\`? Essentially the same thing, but with full control over resets (\`resetOnError\`, \`resetOnComplete\`, \`resetOnRefCountZero\`).`
    }
  },
  {
    id: 'rxjs-006',
    category: 'js-state',
    level: 'Hard',
    tags: ['switchmap', 'mergemap', 'concatmap', 'exhaustmap'],
    question: {
      ru: 'Сравните switchMap, mergeMap, concatMap и exhaustMap. Когда какой и какова семантика отмены?',
      en: 'Compare switchMap, mergeMap, concatMap, and exhaustMap. When do you use each and what are the cancellation semantics?'
    },
    answer: {
      ru: `## Коротко

Все четыре делают одно и то же: берут каждое значение внешнего потока, превращают его во **внутренний** Observable (обычно запрос) и «уплощают» результат в один поток. Отличаются они ровно одним: **что делать, если новое значение пришло, пока предыдущий запрос ещё летит**.

Аналогии на пальцах:

- \`switchMap\` — **переключение каналов ТВ**: включил новый — предыдущий обрывается.
- \`concatMap\` — **очередь в кассу**: следующего обслужат, только когда уйдёт предыдущий.
- \`mergeMap\` — **несколько касс сразу**: все обслуживаются параллельно, порядок выхода случайный.
- \`exhaustMap\` — **турникет**: пока вы проходите, всех остальных он просто не замечает.

## Четыре оператора — в чём разница

1. **\`switchMap\`** — новое внешнее значение **отменяет** (делает \`unsubscribe\`) предыдущий внутренний поток и подписывается на новый. Семантика: «важен только последний».
2. **\`mergeMap\`** (он же \`flatMap\`) — запускает все внутренние потоки **параллельно**, ничего не отменяет, эмиссии чередуются. Конкурентность можно ограничить вторым аргументом: \`mergeMap(fn, 3)\`.
3. **\`concatMap\`** — строит **очередь**: следующий внутренний поток стартует только после \`complete\` предыдущего. Гарантирует порядок.
4. **\`exhaustMap\`** — пока активен текущий внутренний поток, все новые внешние значения **игнорируются** (не откладываются, а выбрасываются).

Одна картинка вместо тысячи слов — внешние значения \`a\` и \`b\` идут близко, каждый запрос длится 3 такта:

\`\`\`text
внешний:     --a--b------------
switchMap:   ------(a обрублен)--B--    только B
mergeMap:    -----A---B--------        оба, порядок как повезёт
concatMap:   -----A-----B------        оба, строго A потом B
exhaustMap:  -----A------------        только A, b выброшен
\`\`\`

## Когда что использовать

- **Поиск, фильтры, смена route-параметров** → \`switchMap\`. Устаревший ответ никому не нужен, а гонки «пришёл ответ не на тот запрос» исчезают сами.
- **Сохранения, логи, любые записи с важным порядком** → \`concatMap\`. Никогда не \`switchMap\`: он молча потеряет команды пользователя.
- **Независимые параллельные операции** (загрузка N файлов) → \`mergeMap\`, почти всегда с лимитом конкурентности.
- **Кнопка «Сохранить», login, «обновить»** → \`exhaustMap\`. Двойной клик не породит второй запрос.

## Пример

\`\`\`ts
// typeahead: отменяем устаревший запрос
input$.pipe(
  debounceTime(200),
  distinctUntilChanged(),
  switchMap(q => api.search(q))
);

// сохранение: очередь, ничего не теряем
save$.pipe(concatMap(dto => api.save(dto)));

// кнопка: игнорируем дабл-клик
click$.pipe(exhaustMap(() => api.submit(form.value)));
\`\`\`

Почему так: в поиске нужен ответ только на последний ввод — \`switchMap\` отменяет старый HTTP и заодно защищает от утечек. В сохранении терять команды нельзя, поэтому очередь. В кнопке лишние клики — мусор, их проще выбросить.

## Что сказать на собеседовании

> Все четыре — higher-order mapping операторы: проецируют внешнее значение во внутренний Observable и уплощают результат, различаясь стратегией конкурентности. \`switchMap\` при новом значении отписывается от предыдущего внутреннего потока — семантика «нужен только последний»: идеально для typeahead, заодно отменяя устаревший HTTP-запрос. \`mergeMap\` запускает всё параллельно, не отменяет и не гарантирует порядок; на быстром источнике без лимита конкурентности это лавина запросов. \`concatMap\` выстраивает очередь: следующий стартует после \`complete\` предыдущего — выбор для мутаций, где важен порядок. \`exhaustMap\` игнорирует новые значения, пока активно текущее, — защита «Сохранить» от двойного клика. Ключевой нюанс: выбор оператора — это выбор семантики отмены: \`switchMap\` на сохранении молча теряет команды пользователя.

## Ловушки

- **\`switchMap\` на мутациях** — самая частая ошибка в NgRx Effects: два быстрых «Сохранить» → первое отменено, данные потеряны.
- **\`mergeMap\` без лимита** на потоке из тысячи id → тысяча одновременных запросов.
- **\`concatMap\` с бесконечным внутренним потоком** — очередь встанет навсегда, второй элемент никогда не обработается.
- **\`exhaustMap\` не буферизует**: пропущенные значения не «догонят» позже, они выброшены насовсем.
- **\`catchError\` снаружи higher-order оператора** убьёт весь внешний поток. Ставьте его **внутри**, на внутреннем Observable.
- **Спросят следом**: \`mergeMap(fn, 1)\` эквивалентен \`concatMap\` — да, это ровно очередь по одному.`,
      en: `## In short

All four do the same job: take each value from the outer stream, turn it into an **inner** Observable (usually a request), and flatten the result into one stream. They differ in exactly one thing: **what to do when a new value arrives while the previous request is still in flight**.

Plain-language analogies:

- \`switchMap\` — **changing TV channels**: turn on a new one and the previous is cut off.
- \`concatMap\` — **a queue at the till**: the next person is served only after the previous one leaves.
- \`mergeMap\` — **several tills at once**: everyone is served in parallel, and the order they leave in is anybody's guess.
- \`exhaustMap\` — **a turnstile**: while you are going through, it simply ignores everyone else.

## The four operators — what differs

1. **\`switchMap\`** — a new outer value **cancels** (unsubscribes) the previous inner stream and subscribes to the new one. Semantics: "only the latest matters".
2. **\`mergeMap\`** (a.k.a. \`flatMap\`) — runs all inner streams **in parallel**, cancels nothing, emissions interleave. Concurrency can be capped with a second argument: \`mergeMap(fn, 3)\`.
3. **\`concatMap\`** — builds a **queue**: the next inner stream starts only after the previous one completes. Order is guaranteed.
4. **\`exhaustMap\`** — while an inner stream is active, every new outer value is **ignored** (not deferred — discarded).

One picture beats a thousand words. Outer values \`a\` and \`b\` arrive close together; each request takes 3 ticks:

\`\`\`text
outer:       --a--b------------
switchMap:   ------(a cut)--B--    only B
mergeMap:    -----A---B--------    both, order is luck
concatMap:   -----A-----B------    both, strictly A then B
exhaustMap:  -----A------------    only A, b discarded
\`\`\`

## When to use which

- **Search, filters, route-param changes** → \`switchMap\`. Nobody needs a stale response, and "the answer arrived for the wrong query" races disappear by themselves.
- **Saves, logs, any writes where order matters** → \`concatMap\`. Never \`switchMap\`: it silently drops the user's commands.
- **Independent parallel operations** (uploading N files) → \`mergeMap\`, almost always with a concurrency limit.
- **A Save button, login, "refresh"** → \`exhaustMap\`. A double click will not produce a second request.

## Example

\`\`\`ts
// typeahead: cancel the stale request
input$.pipe(
  debounceTime(200),
  distinctUntilChanged(),
  switchMap(q => api.search(q))
);

// saving: a queue, nothing is lost
save$.pipe(concatMap(dto => api.save(dto)));

// button: ignore the double click
click$.pipe(exhaustMap(() => api.submit(form.value)));
\`\`\`

Why: in search you only want the answer to the latest input, so \`switchMap\` cancels the old HTTP call and protects against leaks at the same time. In saving you cannot afford to drop commands, hence the queue. On a button the extra clicks are noise and are simply thrown away.

## What to say in the interview

> All four are higher-order mapping operators: they project each outer value into an inner Observable and flatten the result; what differs is the concurrency strategy. On a new outer value \`switchMap\` unsubscribes from the previous inner stream — "only the latest matters", perfect for typeahead and route params because the stale HTTP request is cancelled as a bonus. \`mergeMap\` runs everything in parallel, cancels nothing and guarantees no ordering; on a fast source without the concurrency argument that is a flood of requests. \`concatMap\` builds a queue — the next starts only after the previous completes — so it is the right choice for mutations where order matters. \`exhaustMap\` ignores new values while one is in flight, which is how you protect a Save button from double clicks. The key senior nuance is that picking an operator is picking cancellation semantics, not a style preference: \`switchMap\` on a save silently loses user commands, and an unbounded \`mergeMap\` exhausts the connection pool.

## Gotchas

- **\`switchMap\` on mutations** — the most common NgRx Effects bug: two quick Saves → the first is cancelled, data is lost.
- **Unbounded \`mergeMap\`** over a stream of a thousand ids → a thousand simultaneous requests.
- **\`concatMap\` with an infinite inner stream** — the queue jams forever and the second item is never processed.
- **\`exhaustMap\` does not buffer**: skipped values never "catch up" later, they are gone for good.
- **\`catchError\` outside the higher-order operator** kills the whole outer stream. Put it **inside**, on the inner Observable.
- **Follow-up question**: is \`mergeMap(fn, 1)\` equivalent to \`concatMap\`? Yes — that is exactly a one-at-a-time queue.`
    }
  },
  {
    id: 'rxjs-007',
    category: 'js-state',
    level: 'Hard',
    tags: ['combinelatest', 'forkjoin', 'zip', 'withlatestfrom'],
    question: {
      ru: 'Сравните combineLatest, forkJoin, withLatestFrom и zip. В чём ключевые отличия?',
      en: 'Compare combineLatest, forkJoin, withLatestFrom, and zip. What are the key differences?'
    },
    answer: {
      ru: `## Коротко

Все четыре объединяют несколько потоков в один, но отвечают на разные вопросы: **кто решает, когда эмитить** и **что именно берём**.

Аналогия: представьте четырёх коллег с досками, на которых они пишут числа.

- \`combineLatest\` — «фотографируем все доски каждый раз, когда **кто угодно** что-то переписал».
- \`forkJoin\` — «ждём, пока **все закончат работу**, и записываем только итоговые цифры».
- \`withLatestFrom\` — «фотографируем, только когда пишет **начальник**; остальные доски просто дописываем в кадр».
- \`zip\` — «сравниваем **строчка к строчке**: первую с первой, вторую со второй; кто быстрее — ждёт остальных».

## Четыре оператора — в чём разница

1. **\`combineLatest\`** — эмитит массив **последних** значений всех источников при **любой** эмиссии любого из них. Молчит, пока каждый источник не выдал хотя бы одно значение.
2. **\`forkJoin\`** — ждёт \`complete\` **всех** источников и эмитит их **последние** значения **ровно один раз**. Это RxJS-аналог \`Promise.all\`. Если хоть один упал — общий \`error\`.
3. **\`withLatestFrom\`** — эмитит только когда эмитит **первичный** (тот, к которому применён pipe) источник, подмешивая последние значения остальных. Вторичные источники эмиссию **не триггерят**.
4. **\`zip\`** — соединяет значения **по индексу**: 1-е с 1-м, 2-е со 2-м. Идёт по темпу самого медленного, буферизуя быстрых.

## Когда что использовать

- **Экран зависит от нескольких состояний** (фильтры + сортировка + страница) → \`combineLatest\`.
- **Стартовая загрузка: N параллельных HTTP, дождаться всех** → \`forkJoin\`.
- **«По клику возьми текущее значение формы»** → \`withLatestFrom\`. Триггер один, остальное — контекст.
- **Строгое попарное сопоставление двух потоков** → \`zip\` (нужно редко, буфер может расти).

## Пример

\`\`\`ts
// withLatestFrom: сабмит — триггер, фильтры — контекст
submit$.pipe(
  withLatestFrom(filters$),
  switchMap(([, filters]) => api.load(filters))
);

// forkJoin: всё нужное для инициализации экрана
forkJoin({
  user: api.getUser(),
  settings: api.getSettings()
}).subscribe(({ user, settings }) => init(user, settings));
\`\`\`

Почему так: если бы в первом примере стоял \`combineLatest\`, запрос уходил бы ещё и при каждом изменении фильтров — а мы хотим стрелять только по сабмиту. Во втором \`forkJoin\` даёт один аккуратный объект после того, как оба запроса завершились.

## Что сказать на собеседовании

> \`combineLatest\` эмитит массив последних значений всех источников при эмиссии любого из них, но молчит, пока каждый не выдал хотя бы одно значение, — это сборка view-модели из нескольких состояний. \`forkJoin\` — аналог \`Promise.all\`: дожидается \`complete\` всех источников и один раз отдаёт их последние значения, поэтому подходит для параллельных HTTP-запросов при инициализации, но ошибка в любом источнике роняет весь результат. \`withLatestFrom\` эмитит только по первичному источнику, добавляя последние значения вторичных, — снимок контекста по триггеру, классика для сабмита формы. \`zip\` сопоставляет значения строго по индексу, буферизуя быстрые, поэтому применяется редко. Самая частая ошибка — \`forkJoin\` на бесконечных потоках вроде \`valueChanges\`: он просто ничего не выдаст, вместо него нужен \`combineLatest\`.

## Ловушки

- **\`forkJoin\` на бесконечном источнике** (Subject, \`valueChanges\`, \`interval\`) — не эмитит **никогда**. Первое, что спросят.
- **Один упавший запрос в \`forkJoin\`** отменяет весь результат. Лечится \`catchError\` **на каждом** внутреннем потоке.
- **\`combineLatest\` не эмитит вообще**, если хотя бы один источник ещё не дал значения. Спасает \`startWith(...)\`.
- **\`combineLatest\` на «алмазных» зависимостях** (два потока из одного источника) даёт glitch — промежуточную несогласованную пару.
- **\`withLatestFrom\` до первого значения вторичного потока** молча проглатывает эмиссии триггера.
- **\`zip\` при разной скорости источников** копит буфер быстрого — потенциальная утечка памяти.`,
      en: `## In short

All four merge several streams into one, but they answer different questions: **who decides when to emit** and **what exactly gets taken**.

Analogy: picture four colleagues, each with a whiteboard they write numbers on.

- \`combineLatest\` — "photograph all the boards every time **anyone** changes theirs".
- \`forkJoin\` — "wait until **everyone has finished working**, then record only the final numbers".
- \`withLatestFrom\` — "photograph only when **the boss** writes; the other boards just happen to be in frame".
- \`zip\` — "match them **line by line**: first with first, second with second; whoever is faster waits for the rest".

## The four operators — what differs

1. **\`combineLatest\`** — emits an array of the **latest** values of all sources on **any** emission of any of them. Stays silent until every source has produced at least one value.
2. **\`forkJoin\`** — waits for \`complete\` of **all** sources and emits their **last** values **exactly once**. The RxJS equivalent of \`Promise.all\`. If any source errors, the whole thing errors.
3. **\`withLatestFrom\`** — emits only when the **primary** source (the one being piped) emits, attaching the latest values of the others. Secondary sources do **not** trigger emissions.
4. **\`zip\`** — pairs values **by index**: 1st with 1st, 2nd with 2nd. It moves at the pace of the slowest, buffering the faster ones.

## When to use which

- **A screen depending on several pieces of state** (filters + sort + page) → \`combineLatest\`.
- **Startup loading: N parallel HTTP calls, wait for all** → \`forkJoin\`.
- **"On click, take the current form value"** → \`withLatestFrom\`. One trigger, the rest is context.
- **Strict pairwise matching of two streams** → \`zip\` (rarely needed; the buffer can grow).

## Example

\`\`\`ts
// withLatestFrom: submit is the trigger, filters are context
submit$.pipe(
  withLatestFrom(filters$),
  switchMap(([, filters]) => api.load(filters))
);

// forkJoin: everything needed to initialise the screen
forkJoin({
  user: api.getUser(),
  settings: api.getSettings()
}).subscribe(({ user, settings }) => init(user, settings));
\`\`\`

Why: if the first example used \`combineLatest\`, a request would also fire on every filter change — but we only want to fire on submit. In the second, \`forkJoin\` hands us one tidy object once both requests have completed.

## What to say in the interview

> \`combineLatest\` emits an array of the latest values of all sources on any emission of any of them, but stays silent until every source has produced at least one value — which makes it good for assembling a view model out of several pieces of state. \`forkJoin\` is the \`Promise.all\` equivalent: it waits for \`complete\` on all sources and emits their last values once, so it fits parallel HTTP requests at initialisation, but an error in any source destroys the whole result. \`withLatestFrom\` emits only on the primary source, attaching the latest values of the secondary ones — a "context snapshot on a trigger", the classic form-submit pattern. \`zip\` matches values strictly by index and buffers the faster sources, so it is rarely used. The most common practical mistake is \`forkJoin\` over infinite streams like a Subject or \`valueChanges\`: it simply never emits, and what you actually want is \`combineLatest\` or \`withLatestFrom\`.

## Gotchas

- **\`forkJoin\` on an infinite source** (Subject, \`valueChanges\`, \`interval\`) — it **never** emits. The first thing they will ask.
- **One failing request in \`forkJoin\`** cancels the whole result. Fix with \`catchError\` on **each** inner stream.
- **\`combineLatest\` emits nothing at all** if even one source has not produced a value yet. \`startWith(...)\` saves you.
- **\`combineLatest\` over diamond dependencies** (two streams derived from one source) produces glitches — intermediate, inconsistent pairs.
- **\`withLatestFrom\` before the secondary stream's first value** silently swallows trigger emissions.
- **\`zip\` with sources of unequal speed** accumulates a buffer for the faster one — a potential memory leak.`
    }
  },
  {
    id: 'rxjs-008',
    category: 'js-state',
    level: 'Medium',
    tags: ['merge', 'concat', 'combination'],
    question: {
      ru: 'Чем merge отличается от concat? Когда каждый уместен?',
      en: 'How does merge differ from concat? When is each appropriate?'
    },
    answer: {
      ru: `## Коротко

Оба склеивают несколько готовых потоков в один. Разница — **подписываемся сразу на все или по очереди**.

Аналогия с трубами: \`merge\` — несколько труб **сливаются в одну**, всё течёт одновременно и вперемешку. \`concat\` — трубы **соединены последовательно**: пока не опустеет первая, вторая даже не откроется.

## Как это работает по шагам

1. \`merge(a$, b$, c$)\` подписывается на **все** источники немедленно.
2. Значения летят в общий поток **по мере поступления** — порядок определяет только время (interleaved).
3. Общий поток завершается, когда завершились **все** источники.
4. \`concat(a$, b$)\` подписывается **только на \`a$\`**. \`b$\` в этот момент даже не запущен (он же cold — значит, запроса ещё не было).
5. Как только \`a$\` вызвал \`complete()\` — идёт подписка на \`b$\`.
6. Порядок источников сохраняется строго. Если \`a$\` бесконечен, до \`b$\` очередь **никогда** не дойдёт.

## Пример

\`\`\`ts
// merge: события из разных мест — в один обработчик
merge(saveClicks$, autoSave$, hotkeySave$).subscribe(triggerSave);

// concat: сначала показать локальный кэш, потом заменить серверными
concat(cache$, network$).subscribe(render);
\`\`\`

Почему так: кнопке, автосохранению и горячей клавише всё равно, кто первый — их нужно слушать одновременно, это \`merge\`. А в паре «кэш → сеть» порядок принципиален: сначала мгновенно нарисовали старое, потом обновили свежим, это \`concat\`.

## Что сказать на собеседовании

> \`merge\` подписывается на все источники сразу и эмитит значения по мере поступления, поэтому они чередуются, а общий поток завершается, когда завершились все входы — это способ свести несколько источников событий в один обработчик. \`concat\` подписывается на источники строго по очереди: следующий стартует только после \`complete\` предыдущего, поэтому порядок источников сохраняется, и это правильный выбор для последовательных шагов вроде «сначала кэш, потом сеть». Ключевой нюанс: если первый источник в \`concat\` бесконечен, до второго очередь не дойдёт никогда — это частый баг. И полезная связка для памяти: \`mergeMap\` относится к \`merge\` так же, как \`concatMap\` к \`concat\` — те же самые стратегии конкурентности, только применённые к higher-order проекции, где внутренние потоки создаются из значений внешнего.

## Ловушки

- **Бесконечный первый источник в \`concat\`** — второй не выполнится никогда. Самая частая ошибка.
- **Ждать порядка от \`merge\`** — его нет, порядок определяется только временем прихода значений.
- **\`concat\` не запускает второй источник заранее** — если это HTTP, запрос уйдёт только после завершения первого, параллелизма не будет.
- **\`merge\` с ошибкой в одном источнике** роняет весь объединённый поток; нужен \`catchError\` на каждом входе.
- **\`merge\` умеет ограничивать конкурентность** вторым аргументом-числом — про это забывают.
- **Спросят следом**: чем \`concat\` отличается от \`forkJoin\`? \`concat\` отдаёт **все** значения по очереди, \`forkJoin\` — только **последние** и разом.`,
      en: `## In short

Both glue several existing streams into one. The difference is whether you **subscribe to them all at once or one at a time**.

The plumbing analogy: \`merge\` is several pipes **feeding one**, everything flowing simultaneously and interleaved. \`concat\` is pipes **connected end to end**: until the first one runs dry, the second does not even open.

## How it works, step by step

1. \`merge(a$, b$, c$)\` subscribes to **all** sources immediately.
2. Values fly into the combined stream **as they arrive** — the order is decided purely by timing (interleaved).
3. The combined stream completes when **all** sources have completed.
4. \`concat(a$, b$)\` subscribes **only to \`a$\`**. At that moment \`b$\` has not even started (it is cold, so no request has been made).
5. As soon as \`a$\` calls \`complete()\`, \`b$\` is subscribed.
6. Source order is strictly preserved. If \`a$\` is infinite, \`b$\` is **never** reached.

## Example

\`\`\`ts
// merge: events from different places into one handler
merge(saveClicks$, autoSave$, hotkeySave$).subscribe(triggerSave);

// concat: show the local cache first, then replace with server data
concat(cache$, network$).subscribe(render);
\`\`\`

Why: the button, the autosave, and the hotkey do not care who goes first — they must be listened to simultaneously, so \`merge\`. In the "cache then network" pair the order is the whole point: paint the stale data instantly, then refresh it, so \`concat\`.

## What to say in the interview

> \`merge\` subscribes to all sources at once and emits values as they arrive, so emissions interleave, and the combined stream completes when every input has completed — that is how you funnel several event sources into one handler. \`concat\` subscribes to sources strictly in order: the next starts only after the previous completes, so source order is preserved, which makes it the right choice for sequential steps like "cache first, then network". The key nuance is that if the first source in a \`concat\` is infinite, the second is never reached — a common bug. And a useful mnemonic: \`mergeMap\` is to \`merge\` what \`concatMap\` is to \`concat\` — the very same concurrency strategies, just applied to higher-order projection where inner streams are created from outer values.

## Gotchas

- **An infinite first source in \`concat\`** — the second one never runs. The most common mistake.
- **Expecting ordering from \`merge\`** — there is none; the order is purely the arrival order.
- **\`concat\` does not warm up the second source** — if it is HTTP, the request only goes out after the first completes, so there is no parallelism.
- **An error in one \`merge\` input** kills the whole combined stream; you need \`catchError\` on each input.
- **\`merge\` can cap concurrency** with a numeric second argument — people forget this exists.
- **Follow-up question**: how does \`concat\` differ from \`forkJoin\`? \`concat\` delivers **all** values in sequence; \`forkJoin\` delivers only the **last** ones, all at once.`
    }
  },
  {
    id: 'rxjs-009',
    category: 'js-state',
    level: 'Hard',
    tags: ['error-handling', 'catcherror', 'retry'],
    question: {
      ru: 'Как работает обработка ошибок в RxJS? Объясните catchError, retry и перезапуск потока.',
      en: 'How does error handling work in RxJS? Explain catchError, retry, and restarting a stream.'
    },
    answer: {
      ru: `## Коротко

Ошибка в RxJS — это **терминальное событие**: поток после неё мёртв. Никаких \`next\` и \`complete\`, сразу срабатывает teardown. Не обработали — ошибка всплывает наверх и в Angular попадает в глобальный \`ErrorHandler\`.

Аналогия: поток — это **конвейер**, а ошибка — рубильник. Дёрнули — лента встала навсегда. \`catchError\` — это **запасной конвейер**, который вы подставляете вместо сломанного. А \`retry\` — «перезапустить весь цех с начала».

## Как это работает по шагам

1. Где-то внутри вызывается \`subscriber.error(e)\`.
2. Ошибка идёт **вниз** по цепочке операторов к подписчику; поток помечается закрытым, teardown выполняется.
3. Если по пути встретился \`catchError(fn)\` — он **перехватывает** ошибку и вызывает вашу \`fn\`.
4. \`fn\` обязана вернуть **новый Observable**. Вернули \`of(...)\` или \`EMPTY\` — поток «продолжается» уже из него. Вернули \`throwError(() => err)\` — пробросили дальше.
5. Если встретился \`retry\` — он **не ловит** значение, а **переподписывается** на источник. Источник cold, значит вся работа выполняется заново.
6. Кончились попытки — ошибка летит дальше вниз, как обычно.

## Где ставить catchError — критично

Правило: **\`catchError\` внутри higher-order оператора спасает внешний поток; снаружи — убивает его**.

\`\`\`ts
// ПЛОХО: первая же ошибка убивает items$ навсегда
items$.pipe(
  mergeMap(id => api.get(id)),
  catchError(() => of(null))
);

// ХОРОШО: падает только один внутренний запрос
items$.pipe(
  mergeMap(id => api.get(id).pipe(catchError(() => of(null))))
);
\`\`\`

## Пример

\`\`\`ts
api.load().pipe(
  retry({
    count: 3,
    delay: (err, retryCount) => timer(2 ** retryCount * 500)
  }),
  catchError(err => {
    if (err.status === 404) return of(EMPTY_RESULT); // восстановились
    return throwError(() => err);                    // пробросили дальше
  })
);
\`\`\`

Почему так: сначала три попытки с растущей паузой (\`retry({ count, delay })\` — современная замена устаревшего \`retryWhen\`), и только если всё равно не вышло — решаем, восстановиться или пробросить. Важно помнить: \`retry\` повторяет **весь** источник, поэтому все побочные эффекты внутри него выполнятся снова.

## Что сказать на собеседовании

> В RxJS \`error\` — терминальное событие: после него не будет ни \`next\`, ни \`complete\`, срабатывает teardown, а необработанная ошибка в Angular попадает в \`ErrorHandler\`. Перехватывает её \`catchError\`, который обязан вернуть новый Observable: либо fallback-значение, либо \`throwError\` для проброса дальше. Принципиально место \`catchError\` в pipe: на уровне внешнего потока первая же ошибка завершит его навсегда, и эффект NgRx перестанет реагировать на actions, поэтому его ставят внутри higher-order оператора — тогда падает только одна итерация. \`retry(n)\` не обрабатывает ошибку, а переподписывается на источник, и раз источник cold, вся работа вместе с побочными эффектами выполняется заново. Современный API — \`retry({ count, delay })\` с экспоненциальным backoff вместо устаревшего \`retryWhen\`.

## Ловушки

- **\`catchError\` снаружи \`switchMap\`/\`mergeMap\`** — поток умирает после первой ошибки. Классика падающих NgRx Effects.
- **\`catchError\`, который ничего не возвращает** — TypeScript ругнётся, а в JS получите \`undefined\` вместо Observable.
- **\`retry\` на неидемпотентной операции** (POST «создать заказ») — три попытки = три заказа.
- **\`retry\` без \`count\`** повторяет бесконечно — на постоянно падающем сервере это DDoS собственного бэкенда.
- **\`return of(null)\` вместо \`EMPTY\`** — разница есть: \`of(null)\` эмитит значение, \`EMPTY\` просто завершает поток.
- **Спросят следом**: чем \`throwError(() => err)\` лучше \`throwError(err)\` — фабрика создаёт ошибку лениво, в момент подписки, и стек-трейс получается корректным.`,
      en: `## In short

An error in RxJS is a **terminal event**: after it the stream is dead. No more \`next\`, no \`complete\`, teardown fires immediately. Leave it unhandled and it bubbles up — in Angular, into the global \`ErrorHandler\`.

Analogy: a stream is a **conveyor belt** and an error is the emergency stop. Pull it and the belt is down for good. \`catchError\` is the **spare belt** you swap in for the broken one. \`retry\` is "restart the entire workshop from scratch".

## How it works, step by step

1. Somewhere inside, \`subscriber.error(e)\` is called.
2. The error travels **down** the operator chain to the subscriber; the stream is marked closed and teardown runs.
3. If a \`catchError(fn)\` sits on the way, it **intercepts** the error and calls your \`fn\`.
4. \`fn\` must return a **new Observable**. Return \`of(...)\` or \`EMPTY\` and the stream "continues" from that one; return \`throwError(() => err)\` and you rethrow.
5. If a \`retry\` sits on the way, it does not catch anything — it **resubscribes** to the source. The source is cold, so the whole job runs again.
6. Once attempts run out, the error continues downstream as usual.

## Where to put catchError — this is the critical bit

The rule: **\`catchError\` inside a higher-order operator saves the outer stream; outside it, it kills it**.

\`\`\`ts
// BAD: the first error kills items$ forever
items$.pipe(
  mergeMap(id => api.get(id)),
  catchError(() => of(null))
);

// GOOD: only one inner request fails
items$.pipe(
  mergeMap(id => api.get(id).pipe(catchError(() => of(null))))
);
\`\`\`

## Example

\`\`\`ts
api.load().pipe(
  retry({
    count: 3,
    delay: (err, retryCount) => timer(2 ** retryCount * 500)
  }),
  catchError(err => {
    if (err.status === 404) return of(EMPTY_RESULT); // recovered
    return throwError(() => err);                    // rethrown
  })
);
\`\`\`

Why: first three attempts with a growing pause (\`retry({ count, delay })\` is the modern replacement for the deprecated \`retryWhen\`), and only if that still fails do we decide between recovering and rethrowing. Remember: \`retry\` repeats the **whole** source, so every side effect inside it runs again.

## What to say in the interview

> In RxJS \`error\` is a terminal event: no \`next\` or \`complete\` follows it, teardown runs, and an unhandled error bubbles up — in Angular into the \`ErrorHandler\`. \`catchError\` intercepts it and must return a new Observable: either a fallback value to recover, or \`throwError\` to rethrow. The decisive detail is where \`catchError\` sits in the pipe. Place it at the outer-stream level and the very first error completes that outer stream forever — an NgRx effect, for instance, stops reacting to actions entirely. So you put \`catchError\` **inside** the higher-order operator, wrapping the inner request, and then only one iteration fails. \`retry(n)\` works differently: it does not handle the error, it resubscribes to the source, and since the source is cold, all the work including side effects runs again. The modern API is \`retry({ count, delay })\`, where \`delay\` can be a number or a function returning an Observable, which gives you exponential backoff; it replaces the deprecated \`retryWhen\`.

## Gotchas

- **\`catchError\` outside \`switchMap\`/\`mergeMap\`** — the stream dies after the first error. The classic dead-NgRx-effect bug.
- **A \`catchError\` that returns nothing** — TypeScript complains, and in plain JS you get \`undefined\` instead of an Observable.
- **\`retry\` on a non-idempotent operation** (a POST that creates an order) — three attempts, three orders.
- **\`retry\` without \`count\`** retries forever — against a consistently failing server that is DDoS-ing your own backend.
- **\`return of(null)\` versus \`EMPTY\`** — they differ: \`of(null)\` emits a value, \`EMPTY\` just completes the stream.
- **Follow-up question**: why is \`throwError(() => err)\` better than \`throwError(err)\`? The factory creates the error lazily, at subscribe time, so the stack trace is correct.`
    }
  },
  {
    id: 'rxjs-010',
    category: 'js-state',
    level: 'Hard',
    tags: ['retrywhen', 'backoff', 'error-handling'],
    question: {
      ru: 'Как реализовать экспоненциальный backoff и почему retryWhen считается устаревшим?',
      en: 'How do you implement exponential backoff, and why is retryWhen considered deprecated?'
    },
    answer: {
      ru: `## Коротко

Экспоненциальный backoff — это «стучаться всё реже»: первая повторная попытка через полсекунды, вторая через секунду, третья через две. Плюс **джиттер** — случайная добавка, чтобы все клиенты не постучались одновременно.

Аналогия: сервер упал — это как **очередь у закрытой двери**. Если все будут дёргать ручку каждую секунду, дверь не откроется никогда. Разумно: подождать, потом подольше, потом ещё дольше — и чуть-чуть вразнобой, чтобы не ломиться толпой в одну секунду.

## Как это работает по шагам

1. Запрос упал → \`retry\` вызывает вашу функцию \`delay(error, retryCount)\`.
2. Смотрим **тип ошибки**. 5xx или сетевая — есть смысл повторять. 4xx (401, 404, валидация) — повторять бессмысленно, сразу возвращаем \`throwError\`.
3. Считаем базовую задержку: \`2 ** (retryCount - 1)\` умножить на базовые миллисекунды.
4. **Ограничиваем сверху** (cap), чтобы не ждать полчаса.
5. Добавляем **джиттер** — случайные миллисекунды, чтобы разнести толпу клиентов во времени.
6. Возвращаем \`timer(...)\`. Как только он эмитит — \`retry\` переподписывается на источник, запрос уходит заново.
7. Кончился \`count\` — ошибка летит дальше вниз по потоку.

## Почему retryWhen устарел

\`retryWhen(notifier => ...)\` принимал **поток ошибок** и должен был вернуть поток-сигнал «когда повторять». Это мощно, но **неинтуитивно**: очень легко случайно создать бесконечный цикл повторов или потерять оригинальную ошибку, забыв пробросить её при исчерпании попыток. В RxJS 7.x его пометили deprecated в пользу \`retry({ count, delay })\`, который решает те же задачи явнее и безопаснее.

## Пример

\`\`\`ts
import { retry, timer, throwError } from 'rxjs';

api.load().pipe(
  retry({
    count: 4,
    delay: (error, retryCount) => {
      if (error.status >= 500) {
        const base = Math.min(1000 * 2 ** (retryCount - 1), 30_000); // backoff + cap
        const jitter = Math.random() * 300;                          // джиттер
        return timer(base + jitter);
      }
      return throwError(() => error); // 4xx не повторяем
    }
  })
);
\`\`\`

Почему так: сервер, который лежит, надо жалеть, а не добивать. И заметьте — сценарий «повторить, когда вернётся интернет» тоже покрывается этой же функцией: достаточно вернуть \`fromEvent(window, 'online')\` вместо \`timer\`, потому что \`retry\` ждёт **первую эмиссию любого** Observable.

## Что сказать на собеседовании

> \`retryWhen\` принимал поток ошибок и возвращал сигнал, определяющий момент переподписки; он был неинтуитивным — легко было получить бесконечный цикл или потерять оригинальную ошибку при исчерпании попыток, поэтому в RxJS 7.x его задепрекейтили в пользу \`retry({ count, delay })\`. Современный backoff: в \`delay\` смотрю на тип ошибки и повторяю только восстановимые — 5xx и сетевые, а 4xx сразу пробрасываю через \`throwError\`. Задержку считаю экспоненциально, как \`2\` в степени номера попытки, ограничиваю максимумом и добавляю случайный джиттер — это предотвращает thundering herd, когда все клиенты синхронно ретраят и добивают поднявшийся сервер. Возвращаю \`timer\`, а \`retry\` переподписывается по его первой эмиссии; сценарий «повторить после возврата онлайна» покрывается тем же \`delay\` через \`fromEvent(window, 'online')\`.

## Ловушки

- **Ретраить 4xx** — бессмысленно и вредно: 401 не станет 200 от повторения.
- **Backoff без cap** — \`2 ** 10\` секунд это 17 минут ожидания.
- **Backoff без джиттера** — все клиенты синхронно ударят по серверу в одну секунду (thundering herd).
- **Ретрай неидемпотентного POST** — создадите дубли заказов/платежей.
- **Забыть \`count\`** — бесконечный цикл повторов, тот же баг, за который ругали \`retryWhen\`.
- **Спросят следом**: чем \`retry\` отличается от \`repeat\`? \`retry\` переподписывается на **error**, \`repeat\` — на **complete**.`,
      en: `## In short

Exponential backoff means "knock less and less often": the first retry after half a second, the second after a second, the third after two. Plus **jitter** — a random extra, so that all clients do not knock at the same instant.

Analogy: a downed server is a **crowd at a locked door**. If everyone yanks the handle every second, the door never opens. The sensible approach is to wait, then wait longer, then longer still — and slightly out of sync, so you do not all pile in on the same second.

## How it works, step by step

1. The request fails → \`retry\` calls your \`delay(error, retryCount)\` function.
2. Look at the **error type**. 5xx or a network failure is worth retrying. 4xx (401, 404, validation) is pointless — return \`throwError\` immediately.
3. Compute the base delay: \`2 ** (retryCount - 1)\` times some base milliseconds.
4. **Cap it**, so you are not waiting half an hour.
5. Add **jitter** — a few random milliseconds to spread the crowd of clients out over time.
6. Return \`timer(...)\`. As soon as it emits, \`retry\` resubscribes to the source and the request goes out again.
7. Once \`count\` is exhausted, the error travels on downstream.

## Why retryWhen is deprecated

\`retryWhen(notifier => ...)\` took a **stream of errors** and had to return a signal stream saying "retry now". Powerful, but **unintuitive**: it was very easy to accidentally build an infinite retry loop, or to lose the original error by forgetting to rethrow when attempts ran out. RxJS 7.x deprecated it in favour of \`retry({ count, delay })\`, which solves the same problems more explicitly and more safely.

## Example

\`\`\`ts
import { retry, timer, throwError } from 'rxjs';

api.load().pipe(
  retry({
    count: 4,
    delay: (error, retryCount) => {
      if (error.status >= 500) {
        const base = Math.min(1000 * 2 ** (retryCount - 1), 30_000); // backoff + cap
        const jitter = Math.random() * 300;                          // jitter
        return timer(base + jitter);
      }
      return throwError(() => error); // do not retry 4xx
    }
  })
);
\`\`\`

Why: a server that is down needs mercy, not more hammering. And note — the "retry once the internet is back" scenario is covered by the very same function: just return \`fromEvent(window, 'online')\` instead of \`timer\`, because \`retry\` waits for the first emission of **any** Observable.

## What to say in the interview

> \`retryWhen\` took a stream of errors and returned a signal stream that decided when to resubscribe. It was unintuitive: it was easy to end up with an infinite retry loop or to lose the original error by forgetting to rethrow once attempts were exhausted, so RxJS 7.x deprecated it in favour of \`retry({ count, delay })\`. I build modern backoff like this: inside the \`delay\` function I inspect the error type and retry only recoverable failures — 5xx and network errors — while rethrowing 4xx immediately via \`throwError\`. I compute the delay exponentially as \`2\` to the power of the attempt number, cap the maximum, and add random jitter, which prevents the thundering-herd effect where all clients retry in lockstep and knock over a server that just came back. I return a \`timer\`, and \`retry\` resubscribes on its first emission; "retry after coming back online" is covered by the same \`delay\` by returning \`fromEvent(window, 'online')\`.

## Gotchas

- **Retrying 4xx** is pointless and harmful: a 401 will not turn into a 200 by repetition.
- **Backoff without a cap** — \`2 ** 10\` seconds is a 17-minute wait.
- **Backoff without jitter** — every client hits the server on the same second (thundering herd).
- **Retrying a non-idempotent POST** — you create duplicate orders or payments.
- **Forgetting \`count\`** — an infinite retry loop, exactly the bug \`retryWhen\` was blamed for.
- **Follow-up question**: how does \`retry\` differ from \`repeat\`? \`retry\` resubscribes on **error**, \`repeat\` on **complete**.`
    }
  },
  {
    id: 'rxjs-011',
    category: 'js-state',
    level: 'Medium',
    tags: ['finalize', 'teardown', 'cleanup'],
    question: {
      ru: 'Что делает finalize и чем он отличается от complete-колбэка и tap?',
      en: 'What does finalize do and how does it differ from a complete callback and tap?'
    },
    answer: {
      ru: `## Коротко

\`finalize(fn)\` — это **\`finally\` для потока**. Он выполняет \`fn\` ровно один раз при **любом** конце подписки: успешный \`complete()\`, \`error()\` или \`unsubscribe()\`.

Аналогия: вы уходите из офиса последним. Ушли ли вы вовремя, сбежали ли после аврала или вас уволили посреди дня — **свет надо выключить в любом случае**. \`finalize\` и есть этот выключатель.

## Как это работает по шагам

1. Вы включаете спиннер: \`loading = true\`.
2. Подписываетесь на поток с \`finalize(() => loading = false)\` в pipe.
3. Поток заканчивается — **неважно как**: пришёл ответ и \`complete\`, упала сеть и \`error\`, или компонент уничтожился и произошёл \`unsubscribe\`.
4. RxJS доставляет финальное уведомление подписчику.
5. **После** этого срабатывает \`finalize\` — спиннер гаснет.
6. Если в pipe несколько \`finalize\`, они вызываются **снизу вверх**: те, что ближе к подписчику, раньше.

## Чем отличается от complete-колбэка и tap

- Колбэк **\`complete\` в \`subscribe\`** срабатывает **только** при успехе. Ни ошибка, ни отписка его не вызовут — и спиннер «зависнет» на экране навсегда.
- **\`tap({ complete })\`** — то же самое: не покрывает \`unsubscribe\` и требует отдельной ветки \`error\`.
- **\`finalize\`** — единая точка для всех трёх случаев, поэтому именно он правильный инструмент для UI-состояния.

## Пример

\`\`\`ts
this.loading = true;

this.api.load().pipe(
  takeUntilDestroyed(this.destroyRef),
  finalize(() => this.loading = false) // сработает всегда
).subscribe({
  next: data => this.data = data,
  error: err => this.error = err
});
\`\`\`

Почему так: даже если пользователь уйдёт со страницы в середине запроса, \`takeUntilDestroyed\` вызовет отписку, а \`finalize\` всё равно погасит спиннер и снимет блокировку кнопки. С колбэком \`complete\` этого бы не случилось.

## Что сказать на собеседовании

> \`finalize\` — это \`finally\` для Observable: он выполняет колбэк один раз при любом завершении подписки, будь то \`complete\`, \`error\` или \`unsubscribe\`. Именно поэтому он идеален для очистки UI-состояния — скрыть спиннер, разблокировать кнопку. Колбэк \`complete\` в \`subscribe\` покрывает только успешный сценарий: при ошибке или при уничтожении компонента он не вызовется, и спиннер останется висеть; \`tap({ complete })\` тоже не покрывает \`unsubscribe\`. Из нюансов: \`finalize\` срабатывает после доставки финального уведомления подписчику, а при нескольких \`finalize\` в одном pipe порядок вызова идёт снизу вверх. И в связке с \`takeUntil\` или \`takeUntilDestroyed\` \`finalize\` тоже отработает, поэтому его удобно использовать для логирования момента закрытия потока.

## Ловушки

- **Спиннер скрывают в \`complete\`** — при ошибке он останется на экране. Классический баг.
- **\`finalize\` перед \`catchError\`** сработает раньше восстановления — порядок в pipe важен.
- **\`finalize\` внутри \`switchMap\`** отработает на каждую **отменённую** внутреннюю подписку, а не один раз в конце.
- **Ждать в \`finalize\` значение потока** — его там нет: \`finalize\` не получает данных, только факт завершения.
- **Долгая/тяжёлая работа в \`finalize\`** блокирует поток отписки — держите его лёгким.
- **Спросят следом**: чем отличается от teardown в \`new Observable\`? Teardown принадлежит продюсеру, \`finalize\` — оператор в цепочке потребителя; срабатывают оба.`,
      en: `## In short

\`finalize(fn)\` is the **\`finally\` of streams**. It runs \`fn\` exactly once on **any** end of the subscription: a successful \`complete()\`, an \`error()\`, or an \`unsubscribe()\`.

Analogy: you are the last one leaving the office. Whether you left on time, fled after a crisis, or got fired mid-afternoon — **the lights have to go off either way**. \`finalize\` is that light switch.

## How it works, step by step

1. You turn the spinner on: \`loading = true\`.
2. You subscribe to a stream that has \`finalize(() => loading = false)\` in its pipe.
3. The stream ends — **however it ends**: the response arrives and it completes, the network fails and it errors, or the component is destroyed and it unsubscribes.
4. RxJS delivers the final notification to the subscriber.
5. **After** that, \`finalize\` fires — the spinner goes away.
6. With several \`finalize\` calls in one pipe, they run **bottom-up**: the ones closer to the subscriber go first.

## How it differs from the complete callback and tap

- The **\`complete\` callback in \`subscribe\`** runs **only** on success. Neither an error nor an unsubscribe triggers it — and the spinner hangs on screen forever.
- **\`tap({ complete })\`** is the same story: it does not cover \`unsubscribe\` and needs a separate \`error\` branch.
- **\`finalize\`** is a single point covering all three cases, which is why it is the right tool for UI state.

## Example

\`\`\`ts
this.loading = true;

this.api.load().pipe(
  takeUntilDestroyed(this.destroyRef),
  finalize(() => this.loading = false) // always runs
).subscribe({
  next: data => this.data = data,
  error: err => this.error = err
});
\`\`\`

Why: even if the user navigates away mid-request, \`takeUntilDestroyed\` triggers the unsubscription and \`finalize\` still hides the spinner and re-enables the button. A \`complete\` callback would not have done that.

## What to say in the interview

> \`finalize\` is the \`finally\` of Observables: it runs a callback once on any termination of the subscription, be it \`complete\`, \`error\`, or \`unsubscribe\`. That is exactly why it is ideal for cleaning up UI state — hiding a spinner, re-enabling a button, clearing a \`disabled\` flag. The \`complete\` callback in \`subscribe\` covers only the happy path: on an error or when the component is destroyed it never fires, and the spinner stays up. \`tap({ complete })\` likewise does not cover \`unsubscribe\` and needs a separate error branch. As nuances: \`finalize\` runs after the final notification has been delivered to the subscriber, and with several \`finalize\` calls in one pipe the order is bottom-up, so the inner ones run first. And importantly, combined with \`takeUntil\` or \`takeUntilDestroyed\` it still fires, which makes it handy for logging when a stream was closed.

## Gotchas

- **Hiding the spinner in \`complete\`** — it stays on screen on error. The classic bug.
- **\`finalize\` placed before \`catchError\`** fires before the recovery — order in the pipe matters.
- **\`finalize\` inside \`switchMap\`** runs for every **cancelled** inner subscription, not once at the end.
- **Expecting the stream's value inside \`finalize\`** — it is not there: \`finalize\` receives no data, only the fact of termination.
- **Heavy work inside \`finalize\`** blocks the unsubscription path — keep it light.
- **Follow-up question**: how does it differ from teardown in \`new Observable\`? Teardown belongs to the producer, \`finalize\` is an operator in the consumer's chain; both fire.`
    }
  },
  {
    id: 'rxjs-012',
    category: 'js-state',
    level: 'Expert',
    tags: ['schedulers', 'subscribeon', 'observeon'],
    question: {
      ru: 'Что такое schedulers в RxJS? Сравните asap, async, queue, animationFrame и subscribeOn vs observeOn.',
      en: 'What are schedulers in RxJS? Compare asap, async, queue, animationFrame and subscribeOn vs observeOn.'
    },
    answer: {
      ru: `## Коротко

Scheduler — это ответ на вопрос **«когда и в каком контексте выполнить работу»**. Это абстракция над «запустить кусок кода»: прямо сейчас, в микротаске, через \`setTimeout\` или перед отрисовкой кадра.

Аналогия: scheduler — это **диспетчер задач в офисе**. Одну задачу он говорит сделать немедленно, другую — «как разгребёшь текущее», третью — «поставь на таймер», четвёртую — «перед тем, как поедет отрисовка экрана».

## Четыре scheduler-а — в чём разница

1. **\`queueScheduler\`** — синхронно, но **через очередь**. По умолчанию выполняет сразу; если во время выполнения запланировали ещё задачу, она встанет в очередь, а не уйдёт в рекурсию. Спасает от переполнения стека.
2. **\`asapScheduler\`** — **микротаска** (\`Promise.then\`/\`queueMicrotask\`). Выполнится после всего текущего синхронного кода, но **до** любых таймеров.
3. **\`asyncScheduler\`** — **макротаска** (\`setTimeout\`/\`setInterval\`). На нём построены \`delay\`, \`interval\`, \`timer\`.
4. **\`animationFrameScheduler\`** — \`requestAnimationFrame\`. Для анимаций, синхронизированных с перерисовкой браузера.

## subscribeOn vs observeOn

Это два разных «где»:

- **\`subscribeOn(scheduler)\`** — где произойдёт **сама подписка**, то есть запуск источника. Влияет на **начало**, и место в pipe не имеет значения — он всегда действует на весь источник.
- **\`observeOn(scheduler)\`** — где будут доставляться **уведомления** (\`next\`/\`error\`/\`complete\`) всем, кто **ниже** по цепочке. Влияет на **всё после себя**, поэтому место в pipe критично.

## Пример

\`\`\`ts
of(1, 2, 3, queueScheduler).subscribe(console.log); // синхронно и упорядоченно

source$.pipe(
  subscribeOn(asyncScheduler),        // подписка отложена в макротаску
  map(heavyTransform),
  observeOn(animationFrameScheduler)  // эмиссии доставляются в rAF
);
\`\`\`

Почему так: \`subscribeOn\` сдвигает **старт** источника, чтобы не блокировать текущий тик, а \`observeOn\` переносит **доставку** результата в кадр анимации, чтобы обновление DOM попало ровно в момент перерисовки и не дёргалось.

## Что сказать на собеседовании

> Scheduler — это абстракция над тем, когда и в каком контексте выполняется работа: он управляет конкурентностью и таймингом доставки. \`queueScheduler\` выполняет синхронно через очередь, защищая стек от переполнения при рекурсии; \`asapScheduler\` планирует в микротаску — после синхронного кода, но до таймеров; \`asyncScheduler\` — макротаска на \`setTimeout\`, и на нём работают \`delay\`, \`interval\` и \`timer\`; \`animationFrameScheduler\` — \`requestAnimationFrame\` для анимаций. Важно различать \`subscribeOn\`, который задаёт контекст самой подписки и действует на всю цепочку независимо от места в pipe, и \`observeOn\`, который задаёт контекст доставки операторам ниже себя, поэтому его позиция принципиальна. На практике они нужны, чтобы не блокировать UI тяжёлой работой, и в тестах — \`TestScheduler\` с виртуальным временем.

## Ловушки

- **Думать, что RxJS асинхронен по умолчанию** — нет. Без scheduler'а \`of(1,2,3)\` отработает полностью синхронно.
- **Ставить \`observeOn\` в начало pipe** и ждать эффекта на подписку — он влияет только на то, что ниже.
- **Ставить \`subscribeOn\` в конец** и думать, что это что-то меняет — он работает на весь источник независимо от позиции.
- **Несколько \`subscribeOn\` в одном pipe** — сработает только **первый**, остальные игнорируются.
- **\`animationFrameScheduler\` в фоновой вкладке** — rAF там не тикает, поток «замрёт».
- **Спросят следом**: как \`asapScheduler\` соотносится с Zone.js и zoneless — планирование в микротаску меняет момент срабатывания change detection, что легко отлаживать неправильно.`,
      en: `## In short

A scheduler answers the question **"when and in what context should this work run"**. It is an abstraction over "execute a chunk of code": right now, in a microtask, via \`setTimeout\`, or just before the next frame is painted.

Analogy: a scheduler is the **dispatcher in an office**. One task they tell you to do immediately, another "once you have cleared your desk", a third "put it on a timer", and a fourth "right before the screen refresh goes out".

## The four schedulers — what differs

1. **\`queueScheduler\`** — synchronous, but **through a queue**. It runs immediately by default; if another task is scheduled while one is running, it joins the queue instead of recursing. Saves you from stack overflow.
2. **\`asapScheduler\`** — a **microtask** (\`Promise.then\`/\`queueMicrotask\`). Runs after all the current synchronous code, but **before** any timers.
3. **\`asyncScheduler\`** — a **macrotask** (\`setTimeout\`/\`setInterval\`). \`delay\`, \`interval\`, and \`timer\` are built on it.
4. **\`animationFrameScheduler\`** — \`requestAnimationFrame\`. For animations synchronised with the browser's repaint.

## subscribeOn vs observeOn

These are two different "wheres":

- **\`subscribeOn(scheduler)\`** — where **the subscription itself** happens, i.e. where the source starts. It affects the **beginning**, and its position in the pipe is irrelevant — it always applies to the whole source.
- **\`observeOn(scheduler)\`** — where **notifications** (\`next\`/\`error\`/\`complete\`) are delivered to everything **downstream** of it. It affects **everything after itself**, so its position in the pipe is critical.

## Example

\`\`\`ts
of(1, 2, 3, queueScheduler).subscribe(console.log); // synchronous and ordered

source$.pipe(
  subscribeOn(asyncScheduler),        // subscription deferred to a macrotask
  map(heavyTransform),
  observeOn(animationFrameScheduler)  // emissions delivered inside rAF
);
\`\`\`

Why: \`subscribeOn\` shifts the **start** of the source so it does not block the current tick, while \`observeOn\` moves the **delivery** of results into the animation frame, so the DOM update lands exactly at repaint time and does not jank.

## What to say in the interview

> A scheduler in RxJS is an abstraction over when and in what context work runs; it governs concurrency and the timing of notification delivery. \`queueScheduler\` executes synchronously but through a queue, which protects against stack overflow on recursive scheduling; \`asapScheduler\` schedules into a microtask, so after the current synchronous code but before any timers; \`asyncScheduler\` is a macrotask on \`setTimeout\`, and it powers \`delay\`, \`interval\`, and \`timer\`; \`animationFrameScheduler\` uses \`requestAnimationFrame\` for animations synced with repaint. Also distinguish \`subscribeOn\` from \`observeOn\`: the first sets the context in which the subscription itself happens and applies to the whole chain regardless of its position in the pipe; the second sets the delivery context for every operator below it, so its position matters a lot. In practice schedulers are how you chunk heavy synchronous work without blocking the UI, and in tests they give you \`TestScheduler\` with virtual time for marble testing.

## Gotchas

- **Assuming RxJS is async by default** — it is not. Without a scheduler, \`of(1,2,3)\` runs completely synchronously.
- **Putting \`observeOn\` at the top of the pipe** and expecting it to affect subscription — it only affects what is below.
- **Putting \`subscribeOn\` at the bottom** and expecting that to change something — it applies to the whole source regardless of position.
- **Several \`subscribeOn\` calls in one pipe** — only the **first** takes effect, the rest are ignored.
- **\`animationFrameScheduler\` in a background tab** — rAF does not tick there, so the stream freezes.
- **Follow-up question**: how does \`asapScheduler\` interact with Zone.js and zoneless? Scheduling into a microtask changes when change detection fires, which is easy to misdiagnose.`
    }
  },
  {
    id: 'rxjs-013',
    category: 'js-state',
    level: 'Expert',
    tags: ['custom-operator', 'operatorfunction', 'pipe'],
    question: {
      ru: 'Как написать собственный оператор RxJS? Объясните OperatorFunction и использование pipe.',
      en: 'How do you write a custom RxJS operator? Explain OperatorFunction and the use of pipe.'
    },
    answer: {
      ru: `## Коротко

Оператор RxJS — это **обычная функция**, которая берёт Observable и возвращает Observable. Никакой магии: тип \`OperatorFunction<T, R>\` расшифровывается как \`(source: Observable<T>) => Observable<R>\`, а \`.pipe()\` просто прогоняет источник через цепочку таких функций.

Аналогия: оператор — это **насадка на шланг**. Вход — шланг, выход — шланг, внутри что-то происходит с водой. Свою насадку можно либо **собрать из готовых** (лейка + фильтр), либо **выточить с нуля**.

## Два способа — когда какой

1. **Композиция готовых операторов (предпочтительный).** Функция \`pipe()\` (та, что импортируется из \`rxjs\`, а не метод) склеивает несколько операторов в один. 90% случаев закрываются этим.
2. **«С нуля» через \`new Observable\`.** Нужен, когда поведения нет среди готовых операторов. Здесь вы сами подписываетесь на источник и вручную проксируете уведомления.

При способе 2 обязательно:

- **проксировать все три** уведомления — \`next\`, \`error\`, \`complete\`;
- **вернуть teardown**, отписывающий от источника, иначе утечка;
- **сохранить ленивость**: всё внутри \`new Observable\` должно запускаться только на подписку.

\`MonoTypeOperatorFunction<T>\` — частный случай \`OperatorFunction<T, T>\`, когда тип на выходе тот же.

## Пример

\`\`\`ts
// Способ 1: композиция — просто и надёжно
function searchInput<T>(ms: number): MonoTypeOperatorFunction<T> {
  return pipe(debounceTime(ms), distinctUntilChanged());
}
input$.pipe(searchInput(300));

// Способ 2: с нуля — побочный эффект только на первое значение
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
    return () => sub.unsubscribe(); // teardown обязателен!
  });
}
\`\`\`

Почему так: в первом случае мы вообще не пишем логику — только переиспользуем. Во втором \`done\` живёт **внутри функции подписки**, а не снаружи, поэтому у каждой подписки своё состояние — это и есть корректная ленивость.

## Что сказать на собеседовании

> Оператор в RxJS — это функция типа \`OperatorFunction<T, R>\`, из Observable в Observable; \`.pipe()\` прогоняет источник через цепочку таких функций. Отсюда два способа. Первый, предпочтительный, — композиция: функция \`pipe\` из \`rxjs\` склеивает несколько существующих операторов в один переиспользуемый, и этим закрывается большинство задач. Второй — с нуля: возвращаем функцию, которая принимает источник, создаёт \`new Observable\`, подписывается и вручную проксирует уведомления. Тут важно не забыть три вещи: проксировать \`next\`, \`error\` и \`complete\`; вернуть teardown, отписывающий от источника, иначе будет утечка; и держать изменяемое состояние внутри функции подписки, чтобы сохранить ленивость и независимость подписок. Если тип значения не меняется, сигнатуру удобнее объявить как \`MonoTypeOperatorFunction<T>\`.

## Ловушки

- **Состояние снаружи фабрики** (\`let done\` на уровне модуля) — все подписки начнут делить его. Классическая ошибка.
- **Забыть teardown** — источник продолжит работать после отписки потребителя.
- **Проксировать только \`next\`** — ошибки и завершение потеряются, поток «зависнет».
- **Писать своё вместо \`scan\`/\`expand\`/\`windowTime\`** — сначала проверьте, что нужного оператора действительно нет.
- **Путать функцию \`pipe()\` и метод \`.pipe()\`** — первая создаёт оператор, вторая применяет операторы к потоку.
- **Спросят следом**: почему в RxJS 7 ушли от «patched prototype operators» — потому что pipeable-функции tree-shakeable и не патчат прототип Observable.`,
      en: `## In short

An RxJS operator is **just a function** that takes an Observable and returns an Observable. No magic: the type \`OperatorFunction<T, R>\` reads as \`(source: Observable<T>) => Observable<R>\`, and \`.pipe()\` simply runs the source through a chain of such functions.

Analogy: an operator is a **nozzle for a hose**. A hose goes in, a hose comes out, and something happens to the water in between. Your own nozzle can either be **assembled from existing parts** (sprinkler + filter) or **machined from scratch**.

## Two ways — and when to use each

1. **Composing existing operators (preferred).** The \`pipe()\` function (the one imported from \`rxjs\`, not the method) glues several operators into one. This covers 90% of cases.
2. **"From scratch" via \`new Observable\`.** Needed when no built-in operator does what you want. Here you subscribe to the source yourself and proxy notifications by hand.

With way 2 you must:

- **proxy all three** notifications — \`next\`, \`error\`, \`complete\`;
- **return a teardown** that unsubscribes from the source, otherwise you leak;
- **preserve laziness**: everything inside \`new Observable\` must run only on subscribe.

\`MonoTypeOperatorFunction<T>\` is the special case of \`OperatorFunction<T, T>\` where the output type is unchanged.

## Example

\`\`\`ts
// Way 1: composition — simple and safe
function searchInput<T>(ms: number): MonoTypeOperatorFunction<T> {
  return pipe(debounceTime(ms), distinctUntilChanged());
}
input$.pipe(searchInput(300));

// Way 2: from scratch — a side effect on the first value only
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
    return () => sub.unsubscribe(); // teardown is mandatory!
  });
}
\`\`\`

Why: in the first case we write no logic at all — we only reuse. In the second, \`done\` lives **inside the subscribe function**, not outside it, so each subscription gets its own state — that is what correct laziness looks like.

## What to say in the interview

> An operator in RxJS is simply a function of type \`OperatorFunction<T, R>\` — a function that takes an Observable and returns an Observable; \`.pipe()\` runs the source through a chain of them. So there are two ways to write your own. The first and preferred one is composition: the \`pipe\` function from \`rxjs\` glues several existing operators into one reusable operator, and that covers the overwhelming majority of cases. The second is implementing from scratch: return a function that takes the source and creates a \`new Observable\`, subscribes to the source, and manually proxies notifications. Three things matter there: proxy all three channels — \`next\`, \`error\`, and \`complete\`; return a teardown that unsubscribes from the source, or you leak; and keep all mutable state inside the subscribe function so laziness and per-subscription independence are preserved. If the value type does not change, it is cleaner to type the signature as \`MonoTypeOperatorFunction<T>\`.

## Gotchas

- **State outside the factory** (a module-level \`let done\`) — every subscription starts sharing it. The classic mistake.
- **Forgetting teardown** — the source keeps running after the consumer unsubscribes.
- **Proxying only \`next\`** — errors and completion are lost and the stream appears to hang.
- **Writing your own instead of \`scan\`/\`expand\`/\`windowTime\`** — first check the operator you want really does not exist.
- **Confusing the \`pipe()\` function with the \`.pipe()\` method** — the first builds an operator, the second applies operators to a stream.
- **Follow-up question**: why did RxJS 7 move away from patched prototype operators? Because pipeable functions are tree-shakeable and do not patch the Observable prototype.`
    }
  },
  {
    id: 'rxjs-014',
    category: 'js-state',
    level: 'Hard',
    tags: ['memory-leak', 'takeuntil', 'unsubscription'],
    question: {
      ru: 'Какие есть стратегии отписки в Angular и как избежать утечек памяти?',
      en: 'What unsubscription strategies exist in Angular and how do you avoid memory leaks?'
    },
    answer: {
      ru: `## Коротко

Компонент уничтожен, а подписка жива — её колбэки продолжают выполняться и **держат ссылку на компонент**. Сборщик мусора не может его убрать: это утечка памяти плюс баги вида «обновление уже мёртвого экрана».

Аналогия: **подписка на журнал**. Съехали с квартиры, но подписку не отменили — журналы продолжают приходить на старый адрес, а почтовый ящик копит мусор.

Ключевое различие: **бесконечные** потоки (\`interval\`, \`fromEvent\`, \`Subject\`, \`BehaviorSubject\`) опасны; **завершающиеся** (HTTP) вызывают teardown сами и утекают редко.

## Четыре стратегии — от лучшей к худшей

1. **\`async\` pipe** — предпочтительно. Шаблон подписывается сам и **сам отписывается** при уничтожении. Ноль ручного кода, невозможно забыть.
2. **\`takeUntilDestroyed\` (Angular 16+)** — для случаев, когда подписка нужна в коде. В **контексте инъекции** (поле класса, конструктор) аргумент можно опустить; в методе вроде \`ngOnInit\` нужно передать \`DestroyRef\` явно.
3. **\`takeUntil\` + \`Subject\` (классика)** — работает везде, но требует поля \`destroy$\`, хука \`ngOnDestroy\` и вызовов \`next()\`/\`complete()\`. Легко забыть.
4. **\`Subscription.add\` / ручной \`unsubscribe()\`** — собрать все подписки в один объект и погасить в \`ngOnDestroy\`. Самый многословный вариант, последний выбор.

## Пример

\`\`\`ts
// 1. Лучше всего — вообще без subscribe в коде
readonly data$ = this.service.stream$; // в шаблоне: {{ data$ | async }}

// 2. Нужен побочный эффект — takeUntilDestroyed
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.service.stream$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(v => this.handle(v));
}

// 3. Классика, если Angular < 16
private destroy$ = new Subject<void>();
ngOnInit() { this.s$.pipe(takeUntil(this.destroy$)).subscribe(); }
ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
\`\`\`

Почему так: \`takeUntil\`/\`takeUntilDestroyed\` должны стоять **последними** в pipe. Если после них идут другие операторы (например \`switchMap\`), созданные ими внутренние подписки могут **пережить** отписку и продолжить работу.

## Что сказать на собеседовании

> Утечка возникает, когда компонент уничтожен, а подписка жива: её колбэки продолжают выполняться и удерживают ссылку на компонент, мешая сборке мусора. Опасны бесконечные потоки — \`interval\`, \`fromEvent\`, Subject-ы; завершающиеся вроде HTTP вызывают teardown сами. По приоритету: лучший — \`async\` pipe, где шаблон подписывается и отписывается сам; затем \`takeUntilDestroyed\` из \`@angular/core/rxjs-interop\` начиная с Angular 16, он сам берёт \`DestroyRef\` в контексте инъекции; затем \`takeUntil\` с \`destroy$\` и \`ngOnDestroy\`; и последним — ручной \`unsubscribe\` через \`Subscription.add\`. Важнейший нюанс: \`takeUntil\` обязан быть последним в pipe, иначе операторы ниже, особенно higher-order, создадут подписки, которые переживут отписку. А через Signals жизненным циклом управляет сам \`toSignal\`.

## Ловушки

- **\`takeUntil\` не последним в pipe** — внутренние подписки \`switchMap\` переживут отписку. Спрашивают почти всегда.
- **Забыть \`destroy$.complete()\`** — сам Subject останется висеть; \`next()\` без \`complete()\` — половина работы.
- **\`takeUntilDestroyed()\` без аргумента в \`ngOnInit\`** — упадёт с ошибкой: там нет injection context.
- **Вложенные \`subscribe\` внутри \`subscribe\`** — внутренние никто не отпишет. Используйте higher-order операторы.
- **Считать, что HTTP не нужно отписывать** — запрос действительно завершится сам, но колбэк выполнится на уничтоженном компоненте.
- **Несколько \`| async\` на один cold-поток** — это несколько подписок и несколько запросов; лечится \`shareReplay\`.`,
      en: `## In short

The component is destroyed but the subscription is alive — its callbacks keep running and **hold a reference to the component**. The garbage collector cannot reclaim it: that is a memory leak, plus bugs of the "updating an already-dead screen" variety.

Analogy: a **magazine subscription**. You moved out but never cancelled it — issues keep arriving at the old address and the mailbox fills with rubbish.

The key distinction: **infinite** streams (\`interval\`, \`fromEvent\`, \`Subject\`, \`BehaviorSubject\`) are dangerous; **completing** ones (HTTP) trigger teardown themselves and rarely leak.

## Four strategies, best to worst

1. **The \`async\` pipe** — preferred. The template subscribes and **unsubscribes itself** on destroy. Zero manual code, impossible to forget.
2. **\`takeUntilDestroyed\` (Angular 16+)** — for when you genuinely need a subscription in code. In an **injection context** (field initialiser, constructor) the argument can be omitted; in a method like \`ngOnInit\` you must pass \`DestroyRef\` explicitly.
3. **\`takeUntil\` + \`Subject\` (the classic)** — works everywhere, but needs a \`destroy$\` field, an \`ngOnDestroy\` hook, and \`next()\`/\`complete()\` calls. Easy to forget.
4. **\`Subscription.add\` / manual \`unsubscribe()\`** — collect all subscriptions into one object and kill them in \`ngOnDestroy\`. The most verbose option, a last resort.

## Example

\`\`\`ts
// 1. Best of all — no subscribe in code at all
readonly data$ = this.service.stream$; // template: {{ data$ | async }}

// 2. Need a side effect — takeUntilDestroyed
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.service.stream$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(v => this.handle(v));
}

// 3. The classic, if you are on Angular < 16
private destroy$ = new Subject<void>();
ngOnInit() { this.s$.pipe(takeUntil(this.destroy$)).subscribe(); }
ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
\`\`\`

Why: \`takeUntil\`/\`takeUntilDestroyed\` must be **last** in the pipe. If other operators follow them (a \`switchMap\`, say), the inner subscriptions those create can **outlive** the unsubscription and keep working.

## What to say in the interview

> A leak happens when the component is destroyed but the subscription is alive: its callbacks keep running and hold a reference to the component, so it is never garbage collected. Infinite streams are the dangerous ones — \`interval\`, \`fromEvent\`, Subjects; completing ones like HTTP trigger teardown themselves. Ranked: best is the \`async\` pipe, where the template subscribes and unsubscribes on destroy with no manual code; then \`takeUntilDestroyed\` from \`@angular/core/rxjs-interop\`, available since Angular 16, which picks up \`DestroyRef\` itself in an injection context and takes it explicitly in a method; then the classic \`takeUntil\` with a \`destroy$\` Subject and \`ngOnDestroy\`; and last, manual \`unsubscribe\` via \`Subscription.add\`. The crucial nuance is that \`takeUntil\` must be the last operator in the pipe, otherwise operators below it — especially higher-order ones — create subscriptions that outlive the unsubscription. And if the state is consumed through Signals, \`toSignal\` manages the lifecycle by itself.

## Gotchas

- **\`takeUntil\` not last in the pipe** — \`switchMap\`'s inner subscriptions outlive the unsubscription. Asked almost every time.
- **Forgetting \`destroy$.complete()\`** — the Subject itself lingers; \`next()\` without \`complete()\` is half the job.
- **\`takeUntilDestroyed()\` with no argument inside \`ngOnInit\`** — it throws: there is no injection context there.
- **Nested \`subscribe\` inside \`subscribe\`** — nobody unsubscribes the inner ones. Use higher-order operators instead.
- **Assuming HTTP needs no unsubscription** — the request does complete on its own, but the callback runs on a destroyed component.
- **Several \`| async\` on one cold stream** — that is several subscriptions and several requests; fix with \`shareReplay\`.`
    }
  },
  {
    id: 'rxjs-015',
    category: 'js-state',
    level: 'Medium',
    tags: ['debouncetime', 'throttletime', 'audittime', 'sampletime'],
    question: {
      ru: 'Сравните debounceTime, throttleTime, auditTime и sampleTime. Какой когда использовать?',
      en: 'Compare debounceTime, throttleTime, auditTime, and sampleTime. When do you use each?'
    },
    answer: {
      ru: `## Коротко

Все четыре решают одну задачу: поток «сыплет» слишком часто, а нам нужно реже. Отличаются они тем, **какое именно значение выживает** и **что запускает таймер**.

Формула на четыре слова:

- **debounce** — «подожди тишины».
- **throttle** — «первое, потом игнор».
- **audit** — «последнее в конце окна».
- **sample** — «последнее по тику часов».

Аналогия: вам звонит болтливый коллега. Debounce — «перезвоню, когда замолчишь на 3 секунды». Throttle — «первый звонок принял, следующие 3 секунды не беру трубку». Audit — «через 3 секунды после первого звонка перезвоню и спрошу последнее». Sample — «каждые 3 секунды сам звоню и спрашиваю, что нового».

## Четыре оператора — в чём разница

1. **\`debounceTime(ms)\`** — эмитит значение, только если после него **прошло \`ms\` тишины**. Пока поток идёт — эмиссия откладывается. Marble: \`a-b-c----|\` → \`------c-|\`.
2. **\`throttleTime(ms)\`** — эмитит **первое** значение сразу (leading), потом \`ms\` миллисекунд игнорирует всё входящее. Marble: \`a-b-c-d-e|\` → \`a---d---|\`.
3. **\`auditTime(ms)\`** — при первом значении **ждёт \`ms\`** и эмитит то, что оказалось **последним** к концу окна. Похож на throttle, но выдаёт trailing-значение, а не leading.
4. **\`sampleTime(ms)\`** — работает **по своему таймеру**: каждые \`ms\` отдаёт последнее значение, если оно вообще было. Событие не запускает окно — окно идёт само.

## Когда что использовать

- **Поиск по вводу, автосохранение формы** → \`debounceTime\`. Ждём, пока человек перестанет печатать.
- **Scroll, resize, mousemove** → \`throttleTime\`. Нужна мгновенная первая реакция и стабильная частота.
- **«Последнее значение не чаще, чем раз в N мс»** (обновление прогресса) → \`auditTime\`.
- **Периодический снимок состояния** (телеметрия, координаты раз в секунду) → \`sampleTime\`.

## Пример

\`\`\`ts
search$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(q => api.search(q))
);

scroll$.pipe(throttleTime(100)).subscribe(updateHeader);
\`\`\`

Почему так: в поиске лишние запросы стоят денег и создают гонки, поэтому ждём паузу. В скролле, наоборот, нельзя ждать — шапка должна отреагировать сразу, а дальше достаточно 10 обновлений в секунду.

## Что сказать на собеседовании

> Все четыре — операторы rate-limiting: они прореживают слишком быстрый поток, но по-разному выбирают выжившее значение. \`debounceTime\` пропускает значение, только если после него прошло \`ms\` тишины, — классика для поиска по вводу. \`throttleTime\` эмитит первое значение сразу и игнорирует входящие в течение окна — мгновенная реакция для scroll и resize. \`auditTime\` похож, но выжидает окно и отдаёт последнее значение на момент истечения — trailing вместо leading. \`sampleTime\` работает от собственного таймера, а не от событий: каждые \`ms\` отдаёт последнее значение. Нюанс: debounce на очень активном потоке может не выстрелить, пока идёт ввод, поэтому для гарантированной частоты обновлений берут throttle или audit; и все они опираются на \`asyncScheduler\`, поэтому тестируются через \`TestScheduler\` с виртуальным временем.

## Ловушки

- **\`debounceTime\` на непрерывном потоке** (mousemove) может не эмитить **никогда** — тишины просто не наступает.
- **\`debounceTime\` вместо \`throttleTime\` на скролле** — интерфейс «залипает», реакция приходит только после остановки.
- **\`debounceTime\` без \`distinctUntilChanged\`** в поиске — повторный ввод того же текста пошлёт лишний запрос.
- **\`throttleTime\` по умолчанию только leading**: последнее значение серии теряется. Нужен и хвост — \`{ leading: true, trailing: true }\`.
- **\`sampleTime\` не эмитит, если значений не было** — «пустые» тики просто пропускаются.
- **Спросят следом**: чем \`debounce\`/\`throttle\`/\`audit\`/\`sample\` (без \`Time\`) отличаются — они принимают Observable-длительность вместо миллисекунд, то есть окно задаётся другим потоком.`,
      en: `## In short

All four solve one problem: the stream fires far too often and we need it to fire less. They differ in **which value survives** and **what starts the clock**.

The four-word formula:

- **debounce** — "wait for silence".
- **throttle** — "first one, then ignore".
- **audit** — "the latest at the end of the window".
- **sample** — "the latest on a clock tick".

Analogy: a chatty colleague keeps calling you. Debounce — "I will call back once you have been quiet for 3 seconds". Throttle — "I took the first call; for the next 3 seconds I am not picking up". Audit — "3 seconds after your first call I will ring back and ask for the latest". Sample — "every 3 seconds I call you myself and ask what is new".

## The four operators — what differs

1. **\`debounceTime(ms)\`** — emits a value only if **\`ms\` of silence** followed it. While the stream keeps going, emission is deferred. Marble: \`a-b-c----|\` → \`------c-|\`.
2. **\`throttleTime(ms)\`** — emits the **first** value immediately (leading), then ignores everything for \`ms\` milliseconds. Marble: \`a-b-c-d-e|\` → \`a---d---|\`.
3. **\`auditTime(ms)\`** — on a value it **waits \`ms\`** and emits whatever turned out to be **latest** by the end of the window. Like throttle, but trailing instead of leading.
4. **\`sampleTime(ms)\`** — runs on **its own timer**: every \`ms\` it emits the latest value, if there was one at all. Events do not start the window — the window runs by itself.

## When to use which

- **Search-as-you-type, form autosave** → \`debounceTime\`. Wait until the human stops typing.
- **Scroll, resize, mousemove** → \`throttleTime\`. You need an instant first reaction and a steady rate.
- **"The latest value at most once every N ms"** (progress updates) → \`auditTime\`.
- **Periodic state snapshots** (telemetry, coordinates once a second) → \`sampleTime\`.

## Example

\`\`\`ts
search$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(q => api.search(q))
);

scroll$.pipe(throttleTime(100)).subscribe(updateHeader);
\`\`\`

Why: in search, extra requests cost money and create races, so we wait for the pause. In scrolling the opposite is true — the header must react immediately, and after that 10 updates a second is plenty.

## What to say in the interview

> All four are rate-limiting operators: they thin out a stream that emits too fast but pick the surviving value differently. \`debounceTime\` lets a value through only if \`ms\` of silence followed it, so while the stream keeps going emission is deferred — the classic search-as-you-type case. \`throttleTime\` emits the first value immediately and then ignores incoming ones for the window, giving an instant reaction, which scroll and resize need. \`auditTime\` is like throttle, but when a value appears it waits out the window and emits the latest one at expiry — trailing instead of leading. \`sampleTime\` is driven by its own timer rather than by events: every \`ms\` it emits the latest value if there was one — a periodic snapshot of the stream's state. One nuance: debounce on a busy stream may never fire while input continues, so when you need a guaranteed update rate you reach for throttle or audit; and all of them are built on \`asyncScheduler\`, which is what makes them testable with \`TestScheduler\` and virtual time.

## Gotchas

- **\`debounceTime\` on a continuous stream** (mousemove) may emit **never** — the silence never comes.
- **\`debounceTime\` instead of \`throttleTime\` on scroll** — the UI feels stuck, reacting only after you stop.
- **\`debounceTime\` without \`distinctUntilChanged\`** in search — retyping the same text fires a redundant request.
- **\`throttleTime\` is leading-only by default**: the last value of a burst is lost. Want the tail too? \`{ leading: true, trailing: true }\`.
- **\`sampleTime\` emits nothing when no value arrived** — empty ticks are simply skipped.
- **Follow-up question**: how do \`debounce\`/\`throttle\`/\`audit\`/\`sample\` (without \`Time\`) differ? They take an Observable duration instead of milliseconds, so the window is defined by another stream.`
    }
  },
  {
    id: 'rxjs-016',
    category: 'js-state',
    level: 'Medium',
    tags: ['distinctuntilchanged', 'comparison'],
    question: {
      ru: 'Как работает distinctUntilChanged и какие подводные камни с объектами?',
      en: 'How does distinctUntilChanged work and what are the pitfalls with objects?'
    },
    answer: {
      ru: `## Коротко

\`distinctUntilChanged\` пропускает значение, только если оно **отличается от предыдущего пропущенного**. Ключевое слово — **until**: он смотрит ровно на один шаг назад, а не помнит всю историю.

Аналогия: **охранник у турникета**, который помнит только последнего вошедшего. Тот же человек сразу следом — не пущу. Но если между ними прошёл кто-то другой — пожалуйста, проходите ещё раз.

## Как это работает по шагам

1. Оператор хранит **одно** значение — последнее пропущенное.
2. Пришло новое значение. Сравниваем его с сохранённым.
3. По умолчанию сравнение — \`Object.is\`, то есть **строгое**, по ссылке для объектов.
4. Одинаковые → значение **выбрасывается**, дальше не идёт.
5. Разные → пропускаем и **обновляем** сохранённое.
6. Никакой глобальной дедупликации не происходит: \`1, 1, 2, 2, 3, 1\` даст \`1, 2, 3, 1\` — последняя единица пройдёт, потому что перед ней была тройка.

## Главная ловушка — объекты

Объекты сравниваются **по ссылке**. Два разных объекта с одинаковыми полями — это «разное»:

\`\`\`ts
// {a: 1} !== {a: 1} → пройдут оба раза
state$.pipe(distinctUntilChanged());
\`\`\`

А поскольку иммутабельные обновления **всегда** создают новый объект, оператор в такой конфигурации не отфильтрует вообще ничего. Три способа починить:

- **Компаратор**: \`distinctUntilChanged((prev, curr) => prev.id === curr.id)\`.
- **По ключу**: \`distinctUntilKeyChanged('id')\`.
- **По проекции** — второй аргумент вытаскивает то, что реально важно.

## Пример

\`\`\`ts
// эмитим только когда изменилось имя пользователя
state$.pipe(
  distinctUntilChanged(
    (a, b) => a === b,
    (state) => state.user.name
  )
);

// в поиске — отсечь повторный ввод того же текста
input$.pipe(debounceTime(300), distinctUntilChanged());
\`\`\`

Почему так: селектор \`state => state.user.name\` превращает объект в строку, а строки сравниваются по значению. Смена \`state.settings\` больше не вызовет лишнюю перерисовку.

## Что сказать на собеседовании

> \`distinctUntilChanged\` пропускает значение, только если оно отличается от предыдущего эмитированного; по умолчанию сравнение строгое, через \`Object.is\`, и фильтруются только подряд идущие дубликаты. Главный подводный камень — объекты: они сравниваются по ссылке, а иммутабельные обновления каждый раз создают новый объект, поэтому без настройки оператор не отфильтрует ничего. Решается своим компаратором, оператором \`distinctUntilKeyChanged\` или вторым аргументом-проекцией, которая вытаскивает нужный срез. В NgRx селекторы мемоизируют сами, и \`store.select\` внутри уже применяет \`distinctUntilChanged\` по ссылке, но в самописных потоках состояния его нужно ставить вручную. И осторожно с глубоким сравнением вроде \`isEqual\`: на больших объектах это дорого — часто дешевле сравнить один вычисленный ключ.

## Ловушки

- **\`distinctUntilChanged\` на потоке новых объектов** ничего не фильтрует — самая частая ошибка.
- **Ожидать глобальной дедупликации** — её нет, только соседние значения. Для «уникальных за всё время» есть \`distinct\` (и он копит множество в памяти).
- **Глубокое сравнение по умолчанию** — дорого; сравнивайте вычисленный ключ.
- **Оператор до \`map\`, а не после** — сравниваете не то, что реально важно потребителю.
- **NaN**: \`Object.is(NaN, NaN)\` даёт \`true\`, поэтому \`NaN\` подряд будет отфильтрован (в отличие от \`===\`).
- **Спросят следом**: где он уже стоит «бесплатно» — внутри \`store.select\` в NgRx и внутри \`toSignal\` при обновлении сигнала по равенству.`,
      en: `## In short

\`distinctUntilChanged\` lets a value through only if it **differs from the previously emitted one**. The key word is **until**: it looks exactly one step back, it does not remember the whole history.

Analogy: a **doorman who only remembers the last person who walked in**. The same person again right away — not allowed. But if somebody else went through in between, in you go once more.

## How it works, step by step

1. The operator stores **one** value — the last one it let through.
2. A new value arrives. Compare it with the stored one.
3. By default the comparison is \`Object.is\`, i.e. **strict** — by reference for objects.
4. Equal → the value is **dropped** and goes no further.
5. Different → let it through and **update** the stored value.
6. There is no global deduplication: \`1, 1, 2, 2, 3, 1\` yields \`1, 2, 3, 1\` — the final one passes because a 3 came before it.

## The main trap — objects

Objects are compared **by reference**. Two distinct objects with identical fields count as "different":

\`\`\`ts
// {a: 1} !== {a: 1} → both pass
state$.pipe(distinctUntilChanged());
\`\`\`

And since immutable updates **always** create a new object, the operator in this configuration filters nothing at all. Three ways to fix it:

- **A comparator**: \`distinctUntilChanged((prev, curr) => prev.id === curr.id)\`.
- **By key**: \`distinctUntilKeyChanged('id')\`.
- **By projection** — a second argument that extracts what actually matters.

## Example

\`\`\`ts
// emit only when the user's name changes
state$.pipe(
  distinctUntilChanged(
    (a, b) => a === b,
    (state) => state.user.name
  )
);

// in search — drop retyping the same text
input$.pipe(debounceTime(300), distinctUntilChanged());
\`\`\`

Why: the selector \`state => state.user.name\` reduces the object to a string, and strings compare by value. A change in \`state.settings\` no longer causes a pointless re-render.

## What to say in the interview

> \`distinctUntilChanged\` lets a value through only if it differs from the previously emitted one; by default the comparison uses \`Object.is\`, so it is strict. Importantly it filters only consecutive duplicates and stores a single previous value, not the entire history. The main pitfall is objects: they compare by reference, and immutable updates create a fresh object every time, so without configuration the operator filters nothing. There are three fixes: a custom comparator, \`distinctUntilKeyChanged\` to compare a specific field, or the second projection argument that extracts the relevant slice and compares that. The purpose is to remove redundant emissions and re-renders. In NgRx the selectors memoize on their own and \`store.select\` already applies \`distinctUntilChanged\` by reference internally, but in hand-rolled state streams you have to add the operator yourself. And be careful with deep comparison like \`isEqual\`: it works, but on large objects it is expensive — comparing one derived key is usually cheaper.

## Gotchas

- **\`distinctUntilChanged\` on a stream of fresh objects** filters nothing — the most common mistake.
- **Expecting global deduplication** — there is none, only adjacent values. For "unique ever" there is \`distinct\` (which accumulates a set in memory).
- **Deep comparison by default** is expensive; compare a derived key instead.
- **Placing the operator before \`map\` rather than after** — you compare something other than what the consumer cares about.
- **NaN**: \`Object.is(NaN, NaN)\` is \`true\`, so consecutive \`NaN\` values are filtered (unlike with \`===\`).
- **Follow-up question**: where does it already come for free? Inside \`store.select\` in NgRx, and inside \`toSignal\` when the signal updates by equality.`
    }
  },
  {
    id: 'rxjs-017',
    category: 'js-state',
    level: 'Hard',
    tags: ['share', 'connectable', 'multicasting'],
    question: {
      ru: 'Как устроен share() под капотом? Чем отличается от connectable и устаревшего multicast?',
      en: 'How does share() work under the hood? How does it differ from connectable and the deprecated multicast?'
    },
    answer: {
      ru: `## Коротко

Multicasting — это **вставить \`Subject\` между источником и подписчиками**. Источник подписывается один раз, \`Subject\` раздаёт его значения всем. Так одно выполнение cold-потока делится между многими.

Аналогия: \`Subject\` здесь — **радиовышка**. Одна антенна ловит сигнал (один HTTP-запрос, один сокет), а вышка ретранслирует его на весь город.

\`share()\` — это готовая вышка со счётчиком слушателей. \`connectable()\` — вышка с ручным рубильником.

## Как это работает по шагам

1. Первый подписчик приходит к \`share()\`. Счётчик подписчиков: 0 → 1.
2. \`share()\` создаёт внутренний \`Subject\` (через \`connector\`) и подписывается на источник **через него**.
3. Второй и третий подписчики подключаются **к Subject**, а не к источнику. Счётчик растёт, источник запускается один раз.
4. Значения от источника идут в \`Subject\`, тот вызывает \`next\` у всех подписчиков.
5. Кто-то отписался — счётчик падает. Дошёл до **нуля** → \`share()\` отписывается от источника (это и есть refCount).
6. Пришёл новый подписчик после обнуления — цикл начинается **с шага 2**: источник запускается заново.

В RxJS 7 \`share()\` принимает конфиг: \`connector\` (фабрика Subject), \`resetOnError\`, \`resetOnComplete\`, \`resetOnRefCountZero\`.

## share vs connectable vs multicast

- **\`share()\`** — автоматический multicast с refCount: старт по первому подписчику, стоп по последнему. 95% случаев.
- **\`connectable(source)\`** — Observable, который **не подписывается** на источник, пока вы вручную не вызовете \`.connect()\`. Нужен, когда важно сначала подключить **всех** подписчиков и только потом стартовать, чтобы никто не пропустил первые значения.
- **\`multicast(subjectFactory)\` + \`refCount()\`** — старый низкоуровневый API. Он был многословным и легко приводил к ошибкам с refCount, поэтому помечен **deprecated** и заменён на \`connectable\` и \`share\`.

## Пример

\`\`\`ts
// автоматический multicast, но без сброса при нуле подписчиков
source$.pipe(share({ resetOnRefCountZero: false }));

// ручной контроль старта: сначала все подписались, потом поехали
const shared = connectable(source$);
shared.subscribe(a);
shared.subscribe(b);
const conn = shared.connect(); // источник стартует ровно здесь
// conn.unsubscribe(); — остановить multicast
\`\`\`

Почему так: с обычным \`share()\` подписчик \`a\` запустил бы источник немедленно, и \`b\` мог бы пропустить первые эмиссии. \`connectable\` решает именно эту гонку.

## Что сказать на собеседовании

> Multicasting — это вставка \`Subject\` между источником и подписчиками: источник подписывается один раз, а Subject раздаёт значения всем, поэтому одно выполнение cold-потока делится между многими. \`share()\` — автоматизированный multicast с refCount: при первом подписчике он создаёт внутренний Subject и подписывается на источник, а при обнулении счётчика отписывается и запускает всё заново с новым подписчиком. В RxJS 7 у \`share\` появился конфиг: \`connector\` задаёт фабрику Subject, а \`resetOnError\`, \`resetOnComplete\` и \`resetOnRefCountZero\` управляют моментом сброса состояния. \`connectable()\` не подписывается на источник до явного \`connect()\` — когда все подписчики должны быть подключены до первой эмиссии. А \`multicast\` с \`refCount\` — старый API, задепрекейченный в пользу \`connectable\` и \`share\`.

## Ловушки

- **Ждать от \`share()\` истории** — он не хранит буфер; для «догнать» нужен \`shareReplay\` или \`share({ connector: () => new ReplaySubject(1) })\`.
- **Забыть, что \`share()\` перезапускает источник** после обнуления подписчиков — второй HTTP-запрос там, где ожидали кэш.
- **\`share()\` в конце pipe против начала** — то, что выше него, разделяется; то, что ниже, выполняется у каждого подписчика **своё**.
- **\`connectable\` без \`connect()\`** — поток молчит, и это выглядит как «ничего не работает».
- **Потерять \`Subscription\` от \`connect()\`** — остановить multicast будет нечем: утечка.
- **Спросят следом**: при ошибке источника внутренний Subject «умирает», и без \`resetOnError: true\` все новые подписчики сразу получат ту же ошибку.`,
      en: `## In short

Multicasting means **putting a \`Subject\` between the source and the subscribers**. The source is subscribed once, and the \`Subject\` fans its values out to everyone. That is how one execution of a cold stream is shared by many.

Analogy: the \`Subject\` here is a **radio tower**. One antenna picks up the signal (one HTTP request, one socket) and the tower rebroadcasts it to the whole city.

\`share()\` is a ready-made tower with a listener counter. \`connectable()\` is a tower with a manual switch.

## How it works, step by step

1. The first subscriber arrives at \`share()\`. The subscriber count goes 0 → 1.
2. \`share()\` creates an internal \`Subject\` (via \`connector\`) and subscribes to the source **through it**.
3. The second and third subscribers connect **to the Subject**, not to the source. The count grows, the source runs once.
4. Values from the source go into the \`Subject\`, which calls \`next\` on every subscriber.
5. Someone unsubscribes — the count drops. It reaches **zero** → \`share()\` unsubscribes from the source. That is refCount.
6. A new subscriber after zero restarts the cycle **at step 2**: the source runs again.

In RxJS 7 \`share()\` takes a config: \`connector\` (a Subject factory), \`resetOnError\`, \`resetOnComplete\`, \`resetOnRefCountZero\`.

## share vs connectable vs multicast

- **\`share()\`** — automatic multicast with refCount: starts on the first subscriber, stops on the last. Covers 95% of cases.
- **\`connectable(source)\`** — an Observable that does **not subscribe** to the source until you manually call \`.connect()\`. Needed when it matters that **all** subscribers are wired up before the source starts, so nobody misses the first values.
- **\`multicast(subjectFactory)\` + \`refCount()\`** — the old low-level API. Verbose and prone to refCount mistakes, so it is **deprecated** and replaced by \`connectable\` and \`share\`.

## Example

\`\`\`ts
// automatic multicast, but no reset at zero subscribers
source$.pipe(share({ resetOnRefCountZero: false }));

// manual start control: everyone subscribes first, then we go
const shared = connectable(source$);
shared.subscribe(a);
shared.subscribe(b);
const conn = shared.connect(); // the source starts exactly here
// conn.unsubscribe(); — stop the multicast
\`\`\`

Why: with a plain \`share()\`, subscriber \`a\` would start the source immediately and \`b\` could miss the first emissions. \`connectable\` exists precisely to solve that race.

## What to say in the interview

> Multicasting is inserting a \`Subject\` between the source and the subscribers: the source is subscribed once and the Subject fans values out to all downstream subscribers, so one execution of a cold stream is shared among many. \`share()\` is an automated multicast with refCount: on the first subscriber it creates an internal Subject and subscribes to the source, and when the count drops to zero it unsubscribes from the source, restarting everything when a new subscriber appears. RxJS 7 gave \`share\` a config object: \`connector\` supplies the Subject factory, and \`resetOnError\`, \`resetOnComplete\` and \`resetOnRefCountZero\` control when its state resets. \`connectable()\` does not subscribe to the source until you explicitly call \`connect()\` — useful when all subscribers must be attached before the first emission. And \`multicast\` with \`refCount\` is the old low-level API, deprecated in favour of \`connectable\` and \`share\`.

## Gotchas

- **Expecting history from \`share()\`** — it keeps no buffer; to let subscribers catch up you need \`shareReplay\` or \`share({ connector: () => new ReplaySubject(1) })\`.
- **Forgetting that \`share()\` restarts the source** once the subscriber count hits zero — a second HTTP request where you expected a cache.
- **\`share()\` at the end of the pipe versus the start** — everything above it is shared; everything below it runs **separately** for each subscriber.
- **\`connectable\` without \`connect()\`** — the stream stays silent and it looks like nothing works.
- **Losing the \`Subscription\` returned by \`connect()\`** — you have nothing to stop the multicast with: a leak.
- **Follow-up question**: on a source error the internal Subject dies, and without \`resetOnError: true\` every new subscriber immediately receives that same error.`
    }
  },
  {
    id: 'rxjs-018',
    category: 'js-state',
    level: 'Hard',
    tags: ['cold-to-hot', 'subject', 'pattern'],
    question: {
      ru: 'Покажите паттерн «action stream»: как через Subject управлять загрузкой данных реактивно.',
      en: 'Show the "action stream" pattern: how to drive data loading reactively with a Subject.'
    },
    answer: {
      ru: `## Коротко

Вместо императивного «нажали кнопку — вызови метод, положи результат в поле» мы заводим **поток действий** (\`Subject\`) и один раз декларативно описываем: «из этого потока команд получается вот такое состояние».

Аналогия: \`Subject\` — это **лента заказов на кухне**. Официант не бежит к повару и не объясняет каждый раз, что делать: он просто вешает заказ на ленту. А кухня — это заранее описанный конвейер, который знает, как превратить заказ в блюдо.

Это основа реактивной архитектуры и ровно та идея, что лежит в NgRx Effects.

## Как это работает по шагам

1. Заводим \`private search$ = new Subject<string>()\` — приватный источник команд.
2. Публичный метод \`search(term)\` не делает ничего, кроме \`this.search$.next(term)\`. Вся логика уезжает в pipe.
3. \`debounceTime\` + \`distinctUntilChanged\` гасят лишние команды.
4. \`switchMap\` превращает команду в HTTP-запрос и **отменяет** предыдущий.
5. \`startWith\` **до** \`map\` внутри внутреннего потока даёт состояние «загружаю» декларативно, без ручных флагов.
6. \`catchError\` стоит **внутри** \`switchMap\`, поэтому ошибка убивает только одну итерацию, а не весь поток команд.
7. Наружу отдаётся один Observable вида \`{ loading, data, error }\` — готовая view-model для \`async\`-пайпа.

## Пример

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

Почему так: три вещи, которые обычно пишут руками — отмена устаревшего запроса, флаг загрузки и обработка ошибки — здесь описаны декларативно и не могут рассинхронизироваться. Компонент не хранит ни \`loading\`, ни \`error\`.

## Что сказать на собеседовании

> Паттерн action stream: вместо императивного вызова метода по клику заводим Subject как поток команд и один раз декларативно описываем, как из него получается состояние: higher-order оператор превращает команду в запрос с нужной семантикой отмены, а результат потребляется через \`async\` pipe. Важны три детали. Оператор: \`switchMap\` для поиска, он отменяет устаревший запрос и убирает гонки «ответ не на тот запрос», и \`exhaustMap\` для кнопок, чтобы двойной клик не породил второй запрос. \`startWith\` внутри внутреннего потока даёт состояние загрузки без ручных флагов. И \`catchError\` обязательно внутри higher-order оператора, иначе первая же ошибка завершит внешний поток. Наружу я отдаю единую view-model \`loading\`, \`data\`, \`error\`; тот же паттерн масштабируется до NgRx, где Subject становится потоком actions, а pipe — эффектом.

## Ловушки

- **\`catchError\` снаружи \`switchMap\`** — после первой ошибки поиск умрёт навсегда. Главный вопрос по этой теме.
- **Публичный \`Subject\`** — любой компонент сможет писать в него. Наружу только метод и \`asObservable()\`.
- **\`switchMap\` там, где нужен \`exhaustMap\`** — двойной клик по «Сохранить» отменит первый запрос на полпути.
- **Несколько \`| async\` на \`results$\`** — несколько подписок и несколько запросов; добавьте \`shareReplay({ bufferSize: 1, refCount: true })\`.
- **\`startWith\` снаружи \`switchMap\`** сработает один раз при подписке, а не на каждую команду — спиннер покажется только в первый раз.
- **Спросят следом**: чем это лучше императивного кода — состояние выводится из потока и не может рассинхронизироваться, а отмена и обработка ошибок описаны в одном месте.`,
      en: `## In short

Instead of the imperative "button clicked — call a method, stash the result in a field", we set up an **action stream** (a \`Subject\`) and describe once, declaratively: "this stream of commands produces this state".

Analogy: the \`Subject\` is the **order rail in a kitchen**. The waiter does not run to the chef and re-explain the job each time — they just clip the ticket to the rail. The kitchen is a pre-described pipeline that already knows how to turn a ticket into a dish.

This is the foundation of reactive architecture, and precisely the idea behind NgRx Effects.

## How it works, step by step

1. Declare \`private search$ = new Subject<string>()\` — a private source of commands.
2. The public method \`search(term)\` does nothing but \`this.search$.next(term)\`. All logic moves into the pipe.
3. \`debounceTime\` + \`distinctUntilChanged\` filter out redundant commands.
4. \`switchMap\` turns a command into an HTTP request and **cancels** the previous one.
5. \`startWith\` placed **before** \`map\` inside the inner stream provides the "loading" state declaratively, with no manual flags.
6. \`catchError\` sits **inside** \`switchMap\`, so an error kills only one iteration, not the whole command stream.
7. What you expose is a single Observable of \`{ loading, data, error }\` — a ready-made view model for the \`async\` pipe.

## Example

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

Why: the three things people usually hand-code — cancelling the stale request, the loading flag, and error handling — are described declaratively here and cannot drift out of sync. The component stores neither \`loading\` nor \`error\`.

## What to say in the interview

> The action stream pattern replaces the imperative "call a method on click" with a Subject that carries commands, plus a one-off declarative description of how state is derived from it: a higher-order operator turns a command into a request with the right cancellation semantics, and the result is consumed through the \`async\` pipe. Three details matter. The operator choice: \`switchMap\` for search, because it cancels the stale request and removes "the response came back for the wrong query" races, and \`exhaustMap\` for buttons so a double click does not produce a second request. \`startWith\` inside the inner stream supplies the loading state declaratively without manual flags. And \`catchError\` must be inside the higher-order operator, otherwise the first error completes the outer stream and searching stops working entirely. What I expose is a single view model with \`loading\`, \`data\` and \`error\`; the same pattern scales up to NgRx, where the Subject becomes the actions stream and the pipe becomes an effect.

## Gotchas

- **\`catchError\` outside \`switchMap\`** — after the first error, search is dead forever. The main question on this topic.
- **A public \`Subject\`** — any component can write into it. Expose only a method and \`asObservable()\`.
- **\`switchMap\` where \`exhaustMap\` belongs** — a double click on Save cancels the first request halfway.
- **Several \`| async\` on \`results$\`** — several subscriptions and several requests; add \`shareReplay({ bufferSize: 1, refCount: true })\`.
- **\`startWith\` outside \`switchMap\`** fires once on subscribe rather than per command — the spinner shows only the first time.
- **Follow-up question**: why is this better than imperative code? State is derived from the stream and cannot drift, and cancellation plus error handling live in one place.`
    }
  },
  {
    id: 'rxjs-019',
    category: 'js-state',
    level: 'Expert',
    tags: ['marble-testing', 'testscheduler', 'testing'],
    question: {
      ru: 'Что такое marble-тестирование и как работает TestScheduler с виртуальным временем?',
      en: 'What is marble testing and how does TestScheduler with virtual time work?'
    },
    answer: {
      ru: `## Коротко

Потоки с \`debounceTime\`, \`delay\`, \`interval\` зависят от времени. Тестировать их настоящими таймерами — медленно и хрупко. \`TestScheduler\` даёт **виртуальное время**: операторы планируют работу на нём, а тест «проматывает» её мгновенно.

Аналогия: это как **раскадровка мультфильма**. Вместо того чтобы смотреть три секунды анимации в реальном времени, вы кладёте рядом две ленты кадров — «что было на входе» и «что ожидаем на выходе» — и просто сравниваете их глазами.

## Алфавит marble-диаграмм

Строка ASCII описывает поток во времени:

- \`-\` — один «кадр» времени (frame, по умолчанию 1 мс).
- \`a\`, \`b\`, \`c\` — эмиссии значений (реальные значения задаются вторым аргументом).
- \`|\` — \`complete\`.
- \`#\` — \`error\`.
- \`()\` — группировка нескольких событий **в одном кадре**.
- \`^\` — точка подписки (для \`hot\`).

Ключевые помощники внутри \`scheduler.run\`:

- \`cold(marble, values)\` — cold Observable;
- \`hot(marble, values)\` — hot, где \`^\` задаёт момент подписки;
- \`expectObservable(...).toBe(...)\` — сверка результата;
- \`expectSubscriptions(...)\` — проверка таймингов подписки и отписки.

## Как это работает по шагам

1. Создаём \`new TestScheduler((actual, expected) => expect(actual).toEqual(expected))\` — колбэк сравнения из вашего тест-раннера.
2. Всю работу пишем внутри \`scheduler.run(({ cold, hot, expectObservable }) => { ... })\`.
3. Внутри \`run\` все асинхронные операторы **автоматически** используют этот scheduler вместо реальных таймеров.
4. Описываем вход строкой-диаграммой, применяем pipe.
5. Описываем ожидаемый выход второй строкой.
6. \`scheduler.run\` мгновенно проматывает виртуальное время и сравнивает — реального времени не тратится вообще.

## Пример

\`\`\`ts
import { TestScheduler } from 'rxjs/testing';

const scheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected);
});

scheduler.run(({ cold, expectObservable }) => {
  const source = cold('a-b-c---|');
  const result = source.pipe(debounceTime(3));
  expectObservable(result).toBe('--------(c|)');
});
\`\`\`

Почему так: \`a\` и \`b\` не выживают — после них тишины меньше трёх кадров. Выживает только \`c\`, и в записи \`(c|)\` скобки означают, что значение и \`complete\` пришли **в одном кадре**.

## Что сказать на собеседовании

> Marble-тестирование — это способ проверять зависящие от времени потоки, не тратя реального времени: \`TestScheduler\` даёт виртуальное время, внутри \`scheduler.run\` все асинхронные операторы планируются на нём, и тест проматывает часы мгновенно. Поток описывается ASCII-строкой: дефис — один кадр времени, по умолчанию миллисекунда, буквы — эмиссии, вертикальная черта — \`complete\`, решётка — \`error\`, скобки группируют события кадра, крышечка задаёт точку подписки для hot-потоков. Помощники — \`cold\` и \`hot\`, \`expectObservable(...).toBe(...)\` для сверки результата и \`expectSubscriptions\` для проверки таймингов подписки и отписки; последнее ценно, когда нужно доказать, что \`switchMap\` действительно отменил предыдущую подписку. Конструктор \`TestScheduler\` принимает функцию сравнения — туда я подставляю ассерт тест-раннера.

## Ловушки

- **Использовать \`TestScheduler\` вне \`scheduler.run\`** — операторы возьмут реальные таймеры, и «run mode» не включится.
- **Забыть, что \`-\` это 1 мс**, а не «немного времени»: для \`debounceTime(300)\` удобнее синтаксис \`300ms\`.
- **Не выровнять диаграммы по колонкам** — тест «падает на ровном месте», хотя логика верна.
- **Забыть скобки \`()\`** для событий в одном кадре — самая частая причина непонятных диффов.
- **Проверять только значения** — тайминги подписки/отписки без \`expectSubscriptions\` остаются непроверенными.
- **Спросят следом**: как тестировать без marble — через \`fakeAsync\`/\`tick\` в Angular; marble точнее для таймингов, \`fakeAsync\` привычнее для компонентов.`,
      en: `## In short

Streams with \`debounceTime\`, \`delay\`, or \`interval\` depend on time. Testing them with real timers is slow and flaky. \`TestScheduler\` gives you **virtual time**: operators schedule work on it and the test fast-forwards instantly.

Analogy: it is like a **cartoon storyboard**. Instead of watching three seconds of animation in real time, you lay two strips of frames side by side — "what went in" and "what we expect out" — and simply compare them.

## The marble alphabet

An ASCII string describes a stream over time:

- \`-\` — one time "frame" (1 ms by default).
- \`a\`, \`b\`, \`c\` — value emissions (the real values come from a second argument).
- \`|\` — \`complete\`.
- \`#\` — \`error\`.
- \`()\` — grouping several events **into one frame**.
- \`^\` — the subscription point (for \`hot\`).

The key helpers inside \`scheduler.run\`:

- \`cold(marble, values)\` — a cold Observable;
- \`hot(marble, values)\` — a hot one, where \`^\` marks when the subscription happens;
- \`expectObservable(...).toBe(...)\` — the assertion;
- \`expectSubscriptions(...)\` — checks subscription and unsubscription timings.

## How it works, step by step

1. Create \`new TestScheduler((actual, expected) => expect(actual).toEqual(expected))\` — the comparison callback from your test runner.
2. Put all the work inside \`scheduler.run(({ cold, hot, expectObservable }) => { ... })\`.
3. Inside \`run\`, every async operator **automatically** uses that scheduler instead of real timers.
4. Describe the input as a diagram string and apply the pipe.
5. Describe the expected output as a second string.
6. \`scheduler.run\` fast-forwards virtual time instantly and compares — no real time is spent at all.

## Example

\`\`\`ts
import { TestScheduler } from 'rxjs/testing';

const scheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected);
});

scheduler.run(({ cold, expectObservable }) => {
  const source = cold('a-b-c---|');
  const result = source.pipe(debounceTime(3));
  expectObservable(result).toBe('--------(c|)');
});
\`\`\`

Why: \`a\` and \`b\` do not survive — fewer than three frames of silence follow them. Only \`c\` makes it, and in \`(c|)\` the parentheses mean the value and the \`complete\` arrive **in the same frame**.

## What to say in the interview

> Marble testing is how you verify time-dependent streams without spending real time. \`TestScheduler\` provides virtual time: inside \`scheduler.run\` every async operator is scheduled on it and the test fast-forwards the clock instantly, so tests are fast and non-flaky. The stream is described as an ASCII string: a dash is one time frame, a millisecond by default; letters are value emissions; a pipe character is \`complete\`; a hash is \`error\`; parentheses group several events into a single frame; and a caret marks the subscription point for hot streams. The main helpers are \`cold\` and \`hot\` for building sources, \`expectObservable(...).toBe(...)\` for the assertion, and \`expectSubscriptions\` for checking subscription and unsubscription timings. That last one is valuable when you need to prove that \`switchMap\` really did cancel the previous subscription. The \`TestScheduler\` constructor takes a comparison function, into which I plug my test runner's assertion.

## Gotchas

- **Using \`TestScheduler\` outside \`scheduler.run\`** — operators fall back to real timers and "run mode" never kicks in.
- **Forgetting that \`-\` is 1 ms**, not "a bit of time": for \`debounceTime(300)\` the \`300ms\` time-progression syntax is far easier.
- **Not aligning diagrams by column** — the test fails for no apparent reason even though the logic is right.
- **Forgetting the \`()\` grouping** for events in one frame — the most common cause of baffling diffs.
- **Asserting values only** — subscription and unsubscription timings stay unverified without \`expectSubscriptions\`.
- **Follow-up question**: how do you test without marbles? Via \`fakeAsync\`/\`tick\` in Angular; marbles are more precise about timing, \`fakeAsync\` is more familiar for components.`
    }
  },
  {
    id: 'rxjs-020',
    category: 'js-state',
    level: 'Hard',
    tags: ['ngrx', 'store', 'actions', 'reducers'],
    question: {
      ru: 'Объясните архитектуру NgRx: store, actions, reducers и однонаправленный поток данных.',
      en: 'Explain the NgRx architecture: store, actions, reducers, and unidirectional data flow.'
    },
    answer: {
      ru: `## Коротко

NgRx — это Redux для Angular поверх RxJS. Две главные идеи: **единый источник истины** (одно состояние на всё приложение) и **однонаправленный поток данных** — состояние меняется **только** через actions и **только** в чистых функциях.

Аналогия: state — это **бухгалтерская книга**. Никто не подтирает цифры карандашом. Хочешь изменения — подаёшь **заявку** (action), бухгалтер (reducer) по строгим правилам выписывает **новую страницу**, а все остальные читают книгу через **выписки** (селекторы). Отсюда и time-travel: у вас есть вся история заявок.

## Из чего состоит

1. **Store** — единый иммутабельный объект состояния, обёрнутый в Observable. Компоненты **читают** его через селекторы и никогда не мутируют напрямую.
2. **Actions** — описывают «что произошло»: объект с полем \`type\` и опциональным payload. Создаются через \`createAction\`. Обратите внимание на конвенцию имён: \`'[Users] Load'\` — источник события в скобках, а \`'[Users API] Load Success'\` — уже другой источник.
3. **Reducers** — **чистые функции** вида \`(state, action) => newState\`. Ничего не мутируют, ничего не запрашивают, возвращают новый объект. Собираются через \`createReducer\` и \`on\`.
4. **Selectors** — мемоизированные функции чтения среза состояния.
5. **Effects** — единственное место для побочных эффектов (HTTP, навигация, таймеры). В reducers их быть не должно.

Полный цикл: \`Component → dispatch(action) → Reducer → новый State → Selector → Component\`. Плюс параллельная ветка: \`action → Effect → HTTP → новый action\`.

## Пример

\`\`\`ts
export const loadUsers = createAction('[Users Page] Load');
export const loadUsersSuccess = createAction(
  '[Users API] Load Success',
  props<{ users: User[] }>()
);

export const reducer = createReducer(
  initialState,
  on(loadUsers, (s) => ({ ...s, loading: true })),
  on(loadUsersSuccess, (s, { users }) => ({ ...s, loading: false, users }))
);
\`\`\`

Почему так: reducer не знает ни про HTTP, ни про компоненты — он лишь описывает переход между состояниями. Поэтому его тест — это две строчки без моков, а Redux DevTools может проиграть всю историю заново.

## Что сказать на собеседовании

> NgRx — это реализация паттерна Redux для Angular поверх RxJS: единый источник истины и однонаправленный поток данных. Store хранит единый иммутабельный объект состояния, обёрнутый в Observable; компоненты читают его через селекторы и не мутируют напрямую. Actions описывают, что произошло, — объект с типом и payload из \`createAction\`, а имя по конвенции содержит источник события в квадратных скобках. Reducers — чистые функции «состояние плюс action даёт новое состояние» из \`createReducer\` и \`on\`, а побочные эффекты вроде HTTP живут в Effects, а не в reducers — это принципиально. Плюсы — предсказуемость и time-travel в Redux DevTools, тестируемость чистых reducer-ов, масштабируемость. Цена — заметный boilerplate, поэтому для простых случаев NgRx избыточен, и \`createFeature\` с SignalStore как раз про снижение этой цены.

## Ловушки

- **Мутация состояния в reducer** (\`state.users.push(...)\`) — сломает мемоизацию селекторов и OnPush; всё перестанет обновляться.
- **HTTP внутри reducer** — reducer обязан быть чистым и синхронным. Побочные эффекты только в Effects.
- **Actions как сеттеры** (\`setUsers\`, \`setLoading\`) — антипаттерн. Action описывает **событие**, а не команду на запись.
- **Один action на несколько источников** — теряется трассируемость; поэтому в имени и указывают источник в скобках.
- **Класть в store всё подряд**, включая локальное UI-состояние — тащит boilerplate без пользы.
- **Спросят следом**: почему state должен быть сериализуемым — из-за DevTools, time-travel и гидрации; классы, \`Date\` и \`Map\` в state усложняют жизнь.`,
      en: `## In short

NgRx is Redux for Angular, built on RxJS. Two core ideas: a **single source of truth** (one state object for the whole app) and **unidirectional data flow** — state changes **only** through actions and **only** inside pure functions.

Analogy: state is an **accounting ledger**. Nobody erases figures with a pencil. Want a change? You file a **request** (an action), the accountant (the reducer) writes a **new page** by strict rules, and everyone else reads the ledger through **statements** (selectors). Hence time travel: you have the full history of requests.

## What it is made of

1. **Store** — a single immutable state object wrapped in an Observable. Components **read** it through selectors and never mutate it directly.
2. **Actions** — describe "what happened": an object with a \`type\` and an optional payload, created via \`createAction\`. Note the naming convention: \`'[Users] Load'\` names the event source in brackets, while \`'[Users API] Load Success'\` is a different source entirely.
3. **Reducers** — **pure functions** of the form \`(state, action) => newState\`. They mutate nothing, fetch nothing, and return a new object. Assembled with \`createReducer\` and \`on\`.
4. **Selectors** — memoized functions that read a slice of state.
5. **Effects** — the only place for side effects (HTTP, navigation, timers). Reducers must never contain them.

The full cycle: \`Component → dispatch(action) → Reducer → new State → Selector → Component\`. Plus the parallel branch: \`action → Effect → HTTP → new action\`.

## Example

\`\`\`ts
export const loadUsers = createAction('[Users Page] Load');
export const loadUsersSuccess = createAction(
  '[Users API] Load Success',
  props<{ users: User[] }>()
);

export const reducer = createReducer(
  initialState,
  on(loadUsers, (s) => ({ ...s, loading: true })),
  on(loadUsersSuccess, (s, { users }) => ({ ...s, loading: false, users }))
);
\`\`\`

Why: the reducer knows nothing about HTTP or components — it only describes a transition between states. So its test is two lines with no mocks, and Redux DevTools can replay the entire history.

## What to say in the interview

> NgRx is a Redux-pattern implementation for Angular built on RxJS, and its core principles are a single source of truth and unidirectional data flow. The Store holds one immutable state object wrapped in an Observable; components read from it through selectors and never mutate it directly. Actions describe what happened: an object with a type and an optional payload created via \`createAction\`, where by convention the name carries the event source in square brackets. Reducers are pure functions taking state plus an action and returning a new state, assembled with \`createReducer\` and \`on\` handlers, while side effects like HTTP live in Effects, not in reducers — that is fundamental. The upsides are predictability, which is what gives you time travel in Redux DevTools; testability, because reducers are pure; and scalability for large applications with widely shared state. The cost is noticeable boilerplate, so NgRx is overkill for simple cases — and modern \`createFeature\` and SignalStore exist precisely to reduce that cost.

## Gotchas

- **Mutating state in a reducer** (\`state.users.push(...)\`) — it breaks selector memoization and OnPush; things silently stop updating.
- **HTTP inside a reducer** — a reducer must be pure and synchronous. Side effects belong in Effects only.
- **Actions as setters** (\`setUsers\`, \`setLoading\`) — an anti-pattern. An action describes an **event**, not a write command.
- **One action reused across sources** — you lose traceability; that is exactly why the source is named in brackets.
- **Putting everything in the store**, including local UI state — you pay boilerplate for nothing.
- **Follow-up question**: why must state be serializable? Because of DevTools, time travel, and hydration; classes, \`Date\`, and \`Map\` in state make life hard.`
    }
  },
  {
    id: 'rxjs-021',
    category: 'js-state',
    level: 'Hard',
    tags: ['ngrx', 'effects', 'side-effects'],
    question: {
      ru: 'Как работают NgRx Effects? Почему важна семантика switchMap/concatMap и обработка ошибок?',
      en: 'How do NgRx Effects work? Why do switchMap/concatMap semantics and error handling matter?'
    },
    answer: {
      ru: `## Коротко

Effect — это **слой побочных эффектов**: HTTP, навигация, таймеры, localStorage. Он слушает бесконечный поток actions, отбирает нужные, делает асинхронную работу и **диспатчит новый action** с результатом. Reducers при этом остаются чистыми.

Аналогия: actions — это **радиоэфир диспетчерской**. Effect — бригада, которая слушает эфир, ловит свой позывной (\`ofType\`), выезжает на вызов и по возвращении **докладывает в тот же эфир** новым сообщением: «успех» или «провал».

## Как это работает по шагам

1. Компонент диспатчит \`loadUsers()\`.
2. Action попадает в **общий поток \`actions$\`** — его слышат все effects и все reducers.
3. Reducer, если у него есть \`on(loadUsers)\`, ставит \`loading: true\`. Синхронно и чисто.
4. Effect фильтрует поток через \`ofType(loadUsers)\` — пропускает только свой тип.
5. Higher-order оператор превращает action в HTTP-запрос.
6. Ответ маппится в **новый action**: \`loadUsersSuccess({ users })\` или \`loadUsersFailure({ error })\`.
7. Этот action возвращается в \`actions$\`, reducer его ловит и кладёт данные в state. Круг замкнулся.

## Выбор оператора и обработка ошибок — два критичных места

**Оператор** = семантика отмены:

- **\`switchMap\`** — отменяет предыдущий запрос. Хорош для «загрузить по фильтру», **опасен для «сохранить»**: потеряете команды пользователя.
- **\`concatMap\`** — очередь, сохраняет порядок. Лучший выбор для записей и мутаций.
- **\`mergeMap\`** — параллельно, без гарантий порядка.
- **\`exhaustMap\`** — игнорирует новые, пока активен текущий. Для «refresh» и login.

**\`catchError\` обязателен и обязан быть внутри** higher-order оператора, оборачивая внутренний запрос. Если поставить его снаружи, на уровне \`actions$\`, то после первой же ошибки **весь effect-поток завершится** и перестанет реагировать на actions **навсегда**, до перезагрузки страницы.

## Пример

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

// эффект без диспатча — например, навигация
redirect$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadUsersSuccess),
    tap(() => this.router.navigate(['/users']))
  ), { dispatch: false }
);
\`\`\`

Почему так: \`catchError\` внутри \`switchMap\` превращает ошибку в **обычный action**, и внешний поток \`actions$\` продолжает жить. А \`{ dispatch: false }\` нужен там, где эффект ничего не возвращает в store — иначе NgRx попытается задиспатчить \`undefined\`.

## Что сказать на собеседовании

> Effect — это слой побочных эффектов: он слушает поток actions, фильтрует его через \`ofType\`, выполняет асинхронную работу и диспатчит новые actions с результатом, благодаря чему reducers остаются чистыми. Критичны два места. Первое — выбор higher-order оператора как выбор семантики отмены: \`switchMap\` отменяет предыдущий запрос — хорош для загрузки по фильтру, но опасен для сохранения, где молча теряет команды; \`concatMap\` выстраивает очередь и сохраняет порядок — правильный выбор для мутаций; \`exhaustMap\` игнорирует новые значения, пока активно текущее, — для login и refresh. Второе — \`catchError\` обязан стоять внутри higher-order оператора: снаружи, на уровне \`actions$\`, первая же ошибка завершит весь effect-поток навсегда — классический продовый баг. Из тонкостей: для навигации и логирования нужен \`dispatch: false\`.

## Ловушки

- **\`catchError\` снаружи** — effect умирает после первой ошибки и молча перестаёт работать. Спрашивают почти всегда.
- **\`switchMap\` на сохранении** — два быстрых клика, первый запрос отменён, данные не сохранились.
- **Забыть \`{ dispatch: false }\`** на эффекте с \`tap\` — NgRx попробует задиспатчить не-action и упадёт.
- **Слушать и диспатчить один и тот же action** — бесконечный цикл, который положит вкладку.
- **Логика бизнес-правил в эффекте вместо reducer** — эффект должен оркестрировать, а не вычислять состояние.
- **Спросят следом**: как получить кусок состояния в эффекте — через \`concatLatestFrom\` (ленивый аналог \`withLatestFrom\`), чтобы селектор не вычислялся на каждый action.`,
      en: `## In short

An Effect is the **side-effect layer**: HTTP, navigation, timers, localStorage. It listens to the endless stream of actions, picks the ones it cares about, does the async work, and **dispatches a new action** with the result. Reducers stay pure throughout.

Analogy: actions are the **dispatch radio**. An Effect is the crew that monitors the channel, hears its call sign (\`ofType\`), drives out to the job, and on return **reports back on the same channel** with a new message: success or failure.

## How it works, step by step

1. A component dispatches \`loadUsers()\`.
2. The action enters the **shared \`actions$\` stream** — every effect and every reducer hears it.
3. If the reducer has an \`on(loadUsers)\`, it sets \`loading: true\`. Synchronously and purely.
4. The effect filters the stream with \`ofType(loadUsers)\`, letting only its own type through.
5. A higher-order operator turns the action into an HTTP request.
6. The response is mapped into a **new action**: \`loadUsersSuccess({ users })\` or \`loadUsersFailure({ error })\`.
7. That action goes back into \`actions$\`, the reducer picks it up and stores the data. The loop is closed.

## Operator choice and error handling — the two critical spots

**The operator** = cancellation semantics:

- **\`switchMap\`** — cancels the previous request. Good for "load by filter", **dangerous for "save"**: you lose the user's commands.
- **\`concatMap\`** — a queue, preserves order. The best choice for writes and mutations.
- **\`mergeMap\`** — parallel, no ordering guarantees.
- **\`exhaustMap\`** — ignores new ones while the current is active. For "refresh" and login.

**\`catchError\` is mandatory and must sit inside** the higher-order operator, wrapping the inner request. Put it outside, at the \`actions$\` level, and after the very first error the **whole effect stream completes** and stops reacting to actions **forever**, until a page reload.

## Example

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

// a non-dispatching effect — navigation, for instance
redirect$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadUsersSuccess),
    tap(() => this.router.navigate(['/users']))
  ), { dispatch: false }
);
\`\`\`

Why: \`catchError\` inside \`switchMap\` turns the error into an **ordinary action**, so the outer \`actions$\` stream lives on. And \`{ dispatch: false }\` is required wherever the effect returns nothing to the store — otherwise NgRx tries to dispatch \`undefined\`.

## What to say in the interview

> An Effect is the side-effect layer: it listens to the actions stream, filters it with \`ofType\`, performs async work such as HTTP, and dispatches new actions with the result, which is what keeps reducers pure. Two things are critical. First, the choice of higher-order operator, because that is a choice of cancellation semantics: \`switchMap\` cancels the previous request and suits loading by filter, but is dangerous for saving since it silently drops commands; \`concatMap\` builds a queue and preserves order, making it the right pick for mutations; \`exhaustMap\` ignores new values while one is in flight, which suits login and refresh. Second, \`catchError\` must sit inside the higher-order operator: put it outside at the \`actions$\` level and the first error completes the whole effect stream, which then stops reacting to actions forever — a classic production bug. As nuances: navigation or logging effects need \`dispatch: false\`, and you must never dispatch the same action you listen to, or you get an infinite loop.

## Gotchas

- **\`catchError\` on the outside** — the effect dies after the first error and silently stops working. Asked nearly every time.
- **\`switchMap\` on a save** — two quick clicks, the first request is cancelled, the data never lands.
- **Forgetting \`{ dispatch: false }\`** on a \`tap\`-based effect — NgRx tries to dispatch a non-action and throws.
- **Listening to and dispatching the same action** — an infinite loop that kills the tab.
- **Business rules in the effect instead of the reducer** — an effect should orchestrate, not compute state.
- **Follow-up question**: how do you read a slice of state in an effect? With \`concatLatestFrom\` (the lazy \`withLatestFrom\`), so the selector is not evaluated on every action.`
    }
  },
  {
    id: 'rxjs-022',
    category: 'js-state',
    level: 'Hard',
    tags: ['ngrx', 'selectors', 'memoization'],
    question: {
      ru: 'Как работают селекторы NgRx и их мемоизация? Зачем createSelector?',
      en: 'How do NgRx selectors and their memoization work? Why createSelector?'
    },
    answer: {
      ru: `## Коротко

Селектор — **чистая функция чтения** состояния. Компонент не роется в store целиком, а просит нужный срез: \`store.select(selectVisibleUsers)\`.

\`createSelector\` добавляет к этому **мемоизацию**: если входные данные не изменились, тяжёлое вычисление (фильтрация, сортировка) не выполняется повторно, а возвращается сохранённый результат.

Аналогия: селектор — это **вопрос бухгалтеру**. Мемоизация — его блокнот: «этот же вопрос при тех же цифрах я уже считал вчера, вот готовый ответ». Пересчитает он только если цифры реально поменялись.

## Как это работает по шагам

1. \`createSelector\` принимает **входные селекторы** и **projector-функцию** последним аргументом.
2. Пришло новое состояние — \`store.select\` дёргает селектор.
3. Селектор вызывает все входные селекторы и получает их значения.
4. Сравнивает их с **прошлыми входами по ссылке** (\`===\`).
5. Совпали → projector **не запускается**, отдаётся закэшированный результат.
6. Не совпали → projector считает заново, результат и входы **запоминаются**.
7. \`store.select\` дополнительно применяет \`distinctUntilChanged\`, поэтому одинаковый по ссылке результат вообще не долетит до подписчика.

Это критично: \`store.select\` эмитит **на каждое** изменение состояния приложения, включая изменения совершенно чужих срезов.

## Пример

\`\`\`ts
const selectUsers = (s: AppState) => s.users.list;
const selectFilter = (s: AppState) => s.users.filter;

export const selectVisibleUsers = createSelector(
  selectUsers,
  selectFilter,
  (users, filter) => users.filter(u => u.name.includes(filter))
);
\`\`\`

Почему так: если изменился, например, \`state.cart\`, то \`selectUsers\` и \`selectFilter\` вернут **те же ссылки**, projector не выполнится, а подписчик не получит эмиссию. Селекторы при этом **компонуются**: \`selectVisibleUsers\` можно передать входом в следующий селектор, и получится граф зависимостей с переиспользованием кэшей.

## Что сказать на собеседовании

> Селектор — чистая функция для извлечения среза состояния и производных вычислений; подписка идёт через \`store.select\`. \`createSelector\` строит мемоизированный селектор из входных селекторов и projector-функции: он кэширует последний результат с входами и сравнивает входы по ссылке; если они не изменились, projector не выполняется. Это важно, потому что \`store.select\` эмитит на каждое изменение состояния, а projector с фильтрацией и сортировкой может быть дорогим. Селекторы компонуются: один может быть входом для другого. Подводные камни: мемоизация по ссылке работает только при иммутабельности, а кэш хранит ровно один результат, поэтому для параметризованных селекторов нужна фабрика, возвращающая новый \`createSelector\` на каждый набор аргументов. И \`store.select\` сам применяет \`distinctUntilChanged\` по ссылке.

## Ловушки

- **Мутация состояния в reducer** ломает мемоизацию: ссылка та же, данные другие — компонент не обновится.
- **Кэш на один результат**: параметризованный селектор, вызываемый в \`*ngFor\` с разными id, **промахивается каждый раз**. Нужна фабрика.
- **Тяжёлые вычисления вне projector** — если считать до \`createSelector\`, мемоизация не поможет.
- **Projector, создающий новый объект/массив** каждый раз при неизменных входах — это нормально, кэш всё равно вернёт старую ссылку; а вот **новый вход** каждый раз убивает всё.
- **Селектор с побочными эффектами** — он обязан быть чистым, иначе time-travel в DevTools сломается.
- **Спросят следом**: как сбросить кэш — у мемоизированного селектора есть \`release()\`, а фабричные селекторы стоит освобождать при уничтожении компонента.`,
      en: `## In short

A selector is a **pure read function** over state. A component does not rummage through the whole store; it asks for the slice it needs: \`store.select(selectVisibleUsers)\`.

\`createSelector\` adds **memoization**: if the inputs have not changed, the expensive work (filtering, sorting) is not redone — the stored result is returned.

Analogy: a selector is a **question to your accountant**. Memoization is their notepad: "same question, same figures, I worked it out yesterday — here is the answer". They only recalculate if the figures actually changed.

## How it works, step by step

1. \`createSelector\` takes **input selectors** plus a **projector function** as the last argument.
2. New state arrives — \`store.select\` invokes the selector.
3. The selector calls every input selector and collects their values.
4. It compares them with the **previous inputs by reference** (\`===\`).
5. They match → the projector **does not run**, and the cached result is returned.
6. They differ → the projector recomputes, and both the result and the inputs are **stored**.
7. \`store.select\` additionally applies \`distinctUntilChanged\`, so a reference-equal result never even reaches the subscriber.

This matters because \`store.select\` emits on **every** state change in the app, including changes to entirely unrelated slices.

## Example

\`\`\`ts
const selectUsers = (s: AppState) => s.users.list;
const selectFilter = (s: AppState) => s.users.filter;

export const selectVisibleUsers = createSelector(
  selectUsers,
  selectFilter,
  (users, filter) => users.filter(u => u.name.includes(filter))
);
\`\`\`

Why: if \`state.cart\` changes, \`selectUsers\` and \`selectFilter\` return the **same references**, the projector never runs, and the subscriber gets no emission. Selectors also **compose**: \`selectVisibleUsers\` can be an input to the next selector, giving you a dependency graph with cache reuse.

## What to say in the interview

> A selector is a pure function that extracts a slice of state and derives values from it, and components subscribe to it through \`store.select\`. \`createSelector\` builds a memoized selector out of input selectors and a projector function. Memoization works like this: the selector caches the last result together with the last input values and on every call compares the inputs by reference; if they are unchanged the projector is skipped and the cached value is returned. That is essential, because \`store.select\` emits on every state change in the application and a projector doing filtering and sorting can be expensive. Selectors compose: one can be an input to another. As for pitfalls: reference memoization only works if immutability is respected. The cache holds exactly one result, so parameterized selectors need a factory that returns a fresh \`createSelector\` per argument set. And it is worth remembering that \`store.select\` applies \`distinctUntilChanged\` by reference itself, dropping duplicates.

## Gotchas

- **Mutating state in a reducer** breaks memoization: same reference, different data — the component never updates.
- **A single-result cache**: a parameterized selector called in an \`*ngFor\` with different ids **misses every time**. Use a factory.
- **Heavy work outside the projector** — computing before \`createSelector\` means memoization cannot help.
- **A projector creating a new object/array** each run with unchanged inputs is fine — the cache returns the old reference; but a **new input** each time destroys everything.
- **A selector with side effects** — it must be pure, or time travel in DevTools breaks.
- **Follow-up question**: how do you clear the cache? A memoized selector has \`release()\`, and factory-created selectors should be released when the component is destroyed.`
    }
  },
  {
    id: 'rxjs-023',
    category: 'js-state',
    level: 'Medium',
    tags: ['ngrx', 'entity-adapter', 'normalization'],
    question: {
      ru: 'Что такое NgRx Entity Adapter и зачем нужна нормализация состояния?',
      en: 'What is the NgRx Entity Adapter and why normalize state?'
    },
    answer: {
      ru: `## Коротко

Хранить коллекцию как **массив объектов** неудобно: чтобы найти или обновить элемент по id, нужно перебирать весь массив, а если те же данные лежат ещё где-то — они рассинхронизируются.

**Нормализация** — это хранить сущности в виде **словаря по id** плюс отдельный массив id для порядка. Entity Adapter из \`@ngrx/entity\` делает это за вас и даёт готовые иммутабельные операции.

Аналогия: массив — это **стопка бумаг**, где нужный документ ищешь перелистыванием. Нормализованное состояние — **картотека с номерами ячеек**: знаешь номер — достаёшь мгновенно. А отдельный список номеров хранит порядок, в котором их показывать.

## Из чего состоит

Форма состояния всегда одна:

\`\`\`ts
interface EntityState<T> {
  ids: string[] | number[];        // порядок
  entities: { [id: string]: T };   // словарь по id
}
\`\`\`

Адаптер создаётся через \`createEntityAdapter<T>()\` и настраивается двумя опциями: \`selectId\` (как достать id, если поле называется не \`id\`) и \`sortComparer\` (как сортировать).

Он даёт:

- **Иммутабельные операции для reducer**: \`addOne\`, \`addMany\`, \`setAll\`, \`setOne\`, \`updateOne\`, \`upsertOne\`, \`removeOne\`, \`removeAll\` и другие.
- **Готовые селекторы** через \`adapter.getSelectors()\`: \`selectAll\`, \`selectEntities\`, \`selectIds\`, \`selectTotal\`.
- **Начальное состояние** через \`adapter.getInitialState({ ... })\` — туда можно домешать свои поля вроде \`loading\`.

## Пример

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

const { selectAll, selectEntities, selectIds, selectTotal } =
  adapter.getSelectors();
\`\`\`

Почему так: reducer стал в три строки и не содержит ни одного \`spread\` по массиву. Все операции возвращают **новые ссылки**, поэтому мемоизация селекторов работает корректно, а \`selectAll\` отдаёт массив уже с учётом \`sortComparer\`.

## Что сказать на собеседовании

> Проблема денормализованного состояния в том, что коллекции хранятся массивами: поиск и обновление по id требуют перебора, а дублирование ведёт к рассинхрону. Нормализация решает это, храня сущности словарём по id плюс массивом \`ids\` для порядка — это и есть форма \`EntityState\`. \`@ngrx/entity\` даёт \`createEntityAdapter\`: он настраивается через \`selectId\` и \`sortComparer\` и даёт иммутабельные операции \`addOne\`, \`addMany\`, \`setAll\`, \`updateOne\`, \`upsertOne\`, \`removeOne\`, \`getInitialState\` и селекторы \`selectAll\`, \`selectEntities\`, \`selectIds\`, \`selectTotal\`. Выигрыш тройной: доступ по id за O(1), новые ссылки, благодаря которым работает мемоизация селекторов, и меньше boilerplate при CRUD. И \`selectAll\` возвращает массив с учётом \`sortComparer\`, поэтому сортировку не нужно дублировать в компоненте.

## Ловушки

- **Сортировать/фильтровать в компоненте**, когда есть \`sortComparer\` и селекторы — лишняя работа на каждый рендер.
- **\`updateOne\` ожидает \`{ id, changes }\`**, а не целую сущность; \`setOne\`/\`upsertOne\` — наоборот.
- **Разница \`addOne\` и \`upsertOne\`**: \`addOne\` **проигнорирует** уже существующий id, \`upsertOne\` обновит.
- **Разница \`setAll\` и \`addMany\`**: \`setAll\` **заменяет** коллекцию целиком, \`addMany\` дописывает.
- **\`entities[id]\` типизирован как возможно \`undefined\`** — TypeScript заставит это проверить, и это правильно.
- **Спросят следом**: зачем \`ids\` отдельно от \`entities\` — потому что порядок ключей объекта не гарантирован семантикой, а массив id даёт явный контроль над сортировкой и позволяет менять порядок без трогания самих сущностей.`,
      en: `## In short

Storing a collection as an **array of objects** is awkward: finding or updating an item by id means scanning the whole array, and if the same data also lives somewhere else, the copies drift apart.

**Normalization** means storing entities as a **dictionary keyed by id**, plus a separate array of ids for ordering. The Entity Adapter from \`@ngrx/entity\` does that for you and hands you ready-made immutable operations.

Analogy: an array is a **stack of papers** where you find a document by leafing through. Normalized state is a **filing cabinet with numbered drawers**: know the number, get it instantly. And a separate list of numbers records the order to display them in.

## What it is made of

The state shape is always the same:

\`\`\`ts
interface EntityState<T> {
  ids: string[] | number[];        // order
  entities: { [id: string]: T };   // dictionary by id
}
\`\`\`

The adapter is created with \`createEntityAdapter<T>()\` and configured with two options: \`selectId\` (how to read the id when the field is not called \`id\`) and \`sortComparer\` (how to sort).

It gives you:

- **Immutable reducer operations**: \`addOne\`, \`addMany\`, \`setAll\`, \`setOne\`, \`updateOne\`, \`upsertOne\`, \`removeOne\`, \`removeAll\` and more.
- **Ready-made selectors** via \`adapter.getSelectors()\`: \`selectAll\`, \`selectEntities\`, \`selectIds\`, \`selectTotal\`.
- **Initial state** via \`adapter.getInitialState({ ... })\`, where you can mix in your own fields such as \`loading\`.

## Example

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

const { selectAll, selectEntities, selectIds, selectTotal } =
  adapter.getSelectors();
\`\`\`

Why: the reducer is three lines and contains not a single array spread. Every operation returns **new references**, so selector memoization works correctly, and \`selectAll\` returns an array already honouring \`sortComparer\`.

## What to say in the interview

> The problem with denormalized state is that collections live in arrays: lookup and update by id require iteration, and duplicating the same data leads to drift. Normalization solves this by storing entities as a dictionary keyed by id plus a separate \`ids\` array for ordering — that is the \`EntityState\` shape. \`@ngrx/entity\` provides \`createEntityAdapter\` for such a collection: it is configured with \`selectId\` and \`sortComparer\` and exposes ready-made immutable reducer operations — \`addOne\`, \`addMany\`, \`setAll\`, \`updateOne\`, \`upsertOne\`, \`removeOne\` — plus initial state via \`getInitialState\`. You also get \`selectAll\`, \`selectEntities\`, \`selectIds\` and \`selectTotal\` out of the box. The payoff is threefold: O(1) access by id instead of scanning, correct immutability with fresh references so selector memoization genuinely works, and noticeably less boilerplate with uniform CRUD. And \`selectAll\` returns the array already sorted by \`sortComparer\`, so you need not duplicate sorting in the component.

## Gotchas

- **Sorting/filtering in the component** when \`sortComparer\` and selectors exist — wasted work on every render.
- **\`updateOne\` expects \`{ id, changes }\`**, not a whole entity; \`setOne\`/\`upsertOne\` are the opposite.
- **\`addOne\` versus \`upsertOne\`**: \`addOne\` **ignores** an already existing id, \`upsertOne\` updates it.
- **\`setAll\` versus \`addMany\`**: \`setAll\` **replaces** the whole collection, \`addMany\` appends.
- **\`entities[id]\` is typed as possibly \`undefined\`** — TypeScript makes you check, and rightly so.
- **Follow-up question**: why keep \`ids\` separate from \`entities\`? Because object key order is not something to rely on semantically, while an ids array gives explicit control over ordering and lets you reorder without touching the entities themselves.`
    }
  },
  {
    id: 'rxjs-024',
    category: 'js-state',
    level: 'Medium',
    tags: ['ngrx', 'createfeature', 'boilerplate'],
    question: {
      ru: 'Что даёт createFeature в современном NgRx и как он уменьшает boilerplate?',
      en: 'What does createFeature provide in modern NgRx and how does it reduce boilerplate?'
    },
    answer: {
      ru: `## Коротко

Классический NgRx заставляет писать одно и то же руками: объявить feature key строкой, зарегистрировать reducer, написать \`createFeatureSelector\`, а потом по \`createSelector\` **на каждое поле** состояния.

\`createFeature\` связывает имя и reducer в один объект и **сам генерирует** селектор на весь feature-стейт плюс селектор на каждое его свойство.

Аналогия: раньше вы вручную подписывали ярлык на каждую полку в шкафу. Теперь достаточно сказать «этот шкаф называется users» — **ярлыки печатаются сами**, по одному на полку.

## Что даёт createFeature

1. **Авто-генерация \`selectXxxState\`** — селектора всего среза, без ручного \`createFeatureSelector\`.
2. **Селектор на каждое свойство** состояния: есть поле \`users\` — появится \`selectUsers\`, есть \`loading\` — появится \`selectLoading\`.
3. **Регистрация одной строкой**: \`provideState(usersFeature)\` вместо отдельных аргументов для ключа и reducer.
4. **Производные селекторы через \`extraSelectors\`** — они получают авто-сгенерированные селекторы как входы, так что композиция остаётся полноценной.

## Пример

\`\`\`ts
export const usersFeature = createFeature({
  name: 'users',
  reducer: createReducer(
    initialState,
    on(loadUsers, (s) => ({ ...s, loading: true })),
    on(loadUsersSuccess, (s, { users }) => ({ ...s, loading: false, users }))
  ),
  extraSelectors: ({ selectUsers, selectFilter }) => ({
    selectVisibleUsers: createSelector(
      selectUsers, selectFilter,
      (users, f) => users.filter(u => u.name.includes(f))
    )
  })
});

export const {
  name, reducer,
  selectUsersState,
  selectUsers,        // по полю users
  selectLoading,      // по полю loading
  selectVisibleUsers  // из extraSelectors
} = usersFeature;
\`\`\`

Почему так: базовые селекторы полей — это чистый шум, их незачем писать руками. А вот бизнес-логику фильтрации всё равно нужно описать, и \`extraSelectors\` даёт для этого правильное место, не разрывая связь с фичей.

## Что сказать на собеседовании

> Классический NgRx требует вручную объявить feature key, зарегистрировать reducer, написать \`createFeatureSelector\` и отдельный \`createSelector\` на каждый срез состояния — это много повторяющегося кода. \`createFeature\` объединяет имя фичи и её reducer в один объект и автоматически генерирует селектор на весь feature-стейт плюс селектор на каждое свойство состояния: есть поле \`loading\` — есть \`selectLoading\`. Регистрируется это одной строкой \`provideState(usersFeature)\`, без отдельных аргументов для ключа и reducer. Производные селекторы добавляются через \`extraSelectors\`, куда авто-сгенерированные приходят аргументами. По сути \`createFeature\` — это NgRx standalone-эры: меньше файлов, меньше ручных селекторов, всё связано в одном объекте.

## Ловушки

- **Ждать селекторов для вложенных полей** — генерируются только селекторы **верхнего уровня** состояния.
- **Имя фичи не совпадает с ключом в state** — оно и есть ключ; переименование ломает персист и DevTools-историю.
- **Состояние-примитив или массив вместо объекта** — тогда генерировать селекторы по свойствам не из чего.
- **Писать \`createFeatureSelector\` рядом «по привычке»** — получите два разных селектора на один срез и лишние пересчёты.
- **Пытаться использовать \`extraSelectors\` для побочных эффектов** — это по-прежнему чистые функции.
- **Спросят следом**: как это сочетается с \`@ngrx/entity\` — прекрасно: \`createFeature\` даёт селекторы полей, а \`adapter.getSelectors(selectUsersState)\` достраивает \`selectAll\`/\`selectTotal\` поверх.`,
      en: `## In short

Classic NgRx makes you write the same things by hand: declare a feature key as a string, register the reducer, write a \`createFeatureSelector\`, and then one \`createSelector\` **per state field**.

\`createFeature\` ties the name and the reducer into one object and **generates for you** a selector for the whole feature slice plus a selector for every one of its properties.

Analogy: you used to hand-label every shelf in a cabinet. Now you just say "this cabinet is called users" — and the **labels print themselves**, one per shelf.

## What createFeature gives you

1. **Auto-generated \`selectXxxState\`** — the whole-slice selector, no manual \`createFeatureSelector\`.
2. **A selector per state property**: a \`users\` field gives you \`selectUsers\`, a \`loading\` field gives you \`selectLoading\`.
3. **One-line registration**: \`provideState(usersFeature)\` instead of separate arguments for key and reducer.
4. **Derived selectors via \`extraSelectors\`** — they receive the auto-generated selectors as inputs, so composition stays fully intact.

## Example

\`\`\`ts
export const usersFeature = createFeature({
  name: 'users',
  reducer: createReducer(
    initialState,
    on(loadUsers, (s) => ({ ...s, loading: true })),
    on(loadUsersSuccess, (s, { users }) => ({ ...s, loading: false, users }))
  ),
  extraSelectors: ({ selectUsers, selectFilter }) => ({
    selectVisibleUsers: createSelector(
      selectUsers, selectFilter,
      (users, f) => users.filter(u => u.name.includes(f))
    )
  })
});

export const {
  name, reducer,
  selectUsersState,
  selectUsers,        // for the users field
  selectLoading,      // for the loading field
  selectVisibleUsers  // from extraSelectors
} = usersFeature;
\`\`\`

Why: plain field selectors are pure noise and there is no reason to hand-write them. The filtering logic, however, still has to be expressed somewhere, and \`extraSelectors\` is the right place for it — without severing the link to the feature.

## What to say in the interview

> Classic NgRx makes you manually declare a feature key, register the reducer, write \`createFeatureSelector\`, and a separate \`createSelector\` for every slice of state — a lot of repetitive code. \`createFeature\` bundles the feature name and its reducer into one object and auto-generates the whole-feature-state selector plus a selector for every state property: a \`loading\` field means you get \`selectLoading\` for free. It registers in a single line with \`provideState(usersFeature)\`, without separate arguments for key and reducer. Derived selectors go into \`extraSelectors\`, which receives the auto-generated selectors as arguments, so composition and memoization work exactly as usual. Essentially \`createFeature\` is NgRx for the standalone era: fewer files, fewer hand-written selectors, everything tied together in one object, and it fits naturally with \`provideStore\` and \`provideState\` in standalone apps.

## Gotchas

- **Expecting selectors for nested fields** — only **top-level** state properties get generated selectors.
- **Assuming the feature name is separate from the state key** — it *is* the key; renaming breaks persistence and DevTools history.
- **A primitive or array state instead of an object** — then there are no properties to generate selectors from.
- **Writing a \`createFeatureSelector\` alongside out of habit** — you end up with two different selectors for one slice and redundant recomputation.
- **Trying to use \`extraSelectors\` for side effects** — they are still pure functions.
- **Follow-up question**: how does it combine with \`@ngrx/entity\`? Perfectly: \`createFeature\` gives the field selectors, and \`adapter.getSelectors(selectUsersState)\` layers \`selectAll\`/\`selectTotal\` on top.`
    }
  },
  {
    id: 'rxjs-025',
    category: 'js-state',
    level: 'Expert',
    tags: ['ngrx', 'signal-store', 'signals'],
    question: {
      ru: 'Что такое @ngrx/signals SignalStore и чем он отличается от классического Store?',
      en: 'What is the @ngrx/signals SignalStore and how does it differ from the classic Store?'
    },
    answer: {
      ru: `## Коротко

\`@ngrx/signals\` — это NgRx, переписанный на **Signals**. Вместо Observable-состояния и обязательного Redux-цикла (action → reducer → selector) он даёт **функциональный композируемый store**, который собирается из блоков как конструктор.

Аналогия: классический Store — это **завод с проходной, накладными и журналом учёта**: любое изменение оформляется бумагой, зато есть полная история. SignalStore — **мастерская**: инструменты под рукой, состояние меняется напрямую через \`patchState\`, бумаг почти нет.

## Из чего состоит

\`signalStore(...)\` принимает набор **features**, и каждая добавляет что-то своё:

1. **\`withState({...})\`** — объявляет состояние. Каждое поле автоматически становится **signal**, включая глубокие срезы.
2. **\`withComputed(...)\`** — мемоизированные производные значения. Это аналог селекторов, но на signals и без ручной мемоизации.
3. **\`withMethods(...)\`** — методы, инкапсулирующие логику, в том числе асинхронную, прямо в store. Зависимости берутся через \`inject\` в аргументах.
4. **\`withEntities(...)\`** — аналог Entity Adapter для signals.
5. **\`signalStoreFeature(...)\`** — свои переиспользуемые «миксины» поведения.

Отдельно стоит **\`rxMethod\`** — мост к RxJS: метод, который принимает значение или Observable, а внутри позволяет использовать \`switchMap\`, \`debounceTime\` и прочее для асинхронных эффектов с отменой.

## Пример

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

Почему так: в шаблоне это читается синхронно — \`store.users()\`, \`store.count()\`, \`store.loading()\`, без \`async\`-пайпа. Ни actions, ни reducers, ни отдельного файла effects: одна сущность вместо четырёх.

## Что сказать на собеседовании

> \`@ngrx/signals\` — это новый подход NgRx на Signals: вместо Observable-состояния и Redux-цикла — функциональный композируемый store, который собирается из features. \`withState\` объявляет состояние, каждое поле становится сигналом; \`withComputed\` даёт мемоизированные производные — аналог селекторов на графе сигналов; \`withMethods\` инкапсулирует логику прямо в store с инъекцией зависимостей. Отличий от классического Store три: состояние читается синхронно, а не через Observable; нет церемонии из actions, reducers и effects — изменения идут через \`patchState\`; и вся логика фичи живёт в одном объекте. Расширяется через \`withEntities\`, \`rxMethod\` как мост к RxJS и собственные features на \`signalStoreFeature\`. Беру его для feature-состояния, а классический Store — там, где важны аудит действий и time-travel.

## Ловушки

- **Терять трассируемость**: без actions в DevTools не видно, «кто и почему» изменил состояние — за простоту платят аудитом.
- **Мутировать объект внутри \`patchState\`** — обновлять нужно новыми ссылками, иначе \`computed\` не пересчитается.
- **Асинхронщина через \`async/await\` вместо \`rxMethod\`** — теряете отмену устаревших запросов и получаете гонки.
- **Гигантский store на всё приложение** — SignalStore задуман композируемым, дробите на features.
- **\`withComputed\` с побочными эффектами** — computed обязан быть чистым, для эффектов есть \`effect\`/\`rxMethod\`.
- **Спросят следом**: заменит ли это классический NgRx — нет, это другая точка на шкале: меньше церемонии, но и меньше гарантий аудита.`,
      en: `## In short

\`@ngrx/signals\` is NgRx rewritten on **Signals**. Instead of Observable state and the mandatory Redux cycle (action → reducer → selector), it gives you a **functional, composable store** assembled from building blocks.

Analogy: the classic Store is a **factory with a security gate, waybills, and a logbook**: every change is paperworked, but you get a complete history. SignalStore is a **workshop**: tools within reach, state changed directly via \`patchState\`, almost no paperwork.

## What it is made of

\`signalStore(...)\` takes a set of **features**, each adding something:

1. **\`withState({...})\`** — declares the state. Every field automatically becomes a **signal**, including deep slices.
2. **\`withComputed(...)\`** — memoized derived values. The equivalent of selectors, but on signals and with no manual memoization.
3. **\`withMethods(...)\`** — methods that encapsulate logic, including async, right inside the store. Dependencies come in via \`inject\` in the arguments.
4. **\`withEntities(...)\`** — the Entity Adapter equivalent for signals.
5. **\`signalStoreFeature(...)\`** — your own reusable behaviour "mixins".

Separately there is **\`rxMethod\`** — the bridge to RxJS: a method that accepts a value or an Observable and lets you use \`switchMap\`, \`debounceTime\` and the rest inside for async effects with cancellation.

## Example

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

Why: in the template this reads synchronously — \`store.users()\`, \`store.count()\`, \`store.loading()\` — with no \`async\` pipe. No actions, no reducers, no separate effects file: one entity instead of four.

## What to say in the interview

> \`@ngrx/signals\` is NgRx's newer, Signals-based approach: instead of Observable state and the Redux cycle it offers a functional, composable store assembled from features. \`withState\` declares the state and every field becomes a synchronously readable signal; \`withComputed\` provides memoized derivations — the selector equivalent, but on the signal graph; \`withMethods\` encapsulates logic, including async, right in the store. Three things differ from the classic Store: state is Signals rather than Observables and is read synchronously; there is no mandatory ceremony of actions, reducers and effects, since changes go through \`patchState\`; and the whole feature lives in one object rather than four files. It extends through \`withEntities\` as the Entity Adapter equivalent, \`rxMethod\` as a bridge to RxJS for async effects with cancellation, and custom features built on \`signalStoreFeature\`. I reach for it for feature state, and keep the classic Store where action auditing and time-travel debugging matter.

## Gotchas

- **Losing traceability**: without actions, DevTools cannot show who changed state and why — simplicity is paid for in auditability.
- **Mutating an object inside \`patchState\`** — you must update with new references, or \`computed\` will not recompute.
- **Doing async with plain \`async/await\` instead of \`rxMethod\`** — you lose cancellation of stale requests and get races.
- **One giant store for the whole app** — SignalStore is designed to be composed; split it into features.
- **Side effects inside \`withComputed\`** — computed must stay pure; use \`effect\`/\`rxMethod\` for effects.
- **Follow-up question**: does it replace classic NgRx? No — it is a different point on the scale: less ceremony, but fewer audit guarantees.`
    }
  },
  {
    id: 'rxjs-026',
    category: 'js-state',
    level: 'Medium',
    tags: ['ngrx', 'facade', 'pattern'],
    question: {
      ru: 'Что такое facade-паттерн в NgRx и какие у него плюсы и минусы?',
      en: 'What is the facade pattern in NgRx and what are its pros and cons?'
    },
    answer: {
      ru: `## Коротко

Facade — это **сервис-обёртка**, которая прячет весь NgRx (store, actions, selectors) за простым API. Компонент вызывает \`facade.load()\` и читает \`facade.users$\` — и понятия не имеет, что под этим лежит Redux.

Аналогия: фасад — это **стойка ресепшена**. Гость говорит «мне нужен номер», а не «оформите заявку формы 12, передайте в отдел бронирования, потом заберите ключ на складе». Внутренняя кухня спрятана, наружу торчит понятное меню.

## Из чего состоит

Фасад — это ровно две вещи:

1. **Выборки состояния** — публичные \`users$\`, \`loading$\` как \`store.select(...)\`. Компонент потребляет их через \`async\`-пайп.
2. **Команды** — методы вроде \`load()\` и \`add(user)\`, внутри которых \`store.dispatch(...)\`.

Всё. Никакой бизнес-логики: она остаётся в reducers, effects и селекторах.

## Плюсы и минусы

**Плюсы:**

- **Инкапсуляция**: компонент не знает про actions и селекторы, а в тестах фасад легко замокать одним объектом.
- **Меньше связности**: реализацию можно сменить (NgRx → SignalStore) вообще не трогая компоненты.
- **Читаемость**: компонент выражает **намерение** (\`load\`, \`add\`), а не механику.
- **Единая точка для view-моделей**: удобно собрать несколько селекторов в один поток.

**Минусы:**

- **Лишний слой**: ещё один файл, особенно бесполезный, если фасад просто проксирует один в один.
- **Риск «бога»**: фасад разрастается в огромный сервис со всем подряд.
- **Скрывает явность потока actions**: часть команд считает это анти-паттерном для Redux, потому что теряется трассируемость — из кода компонента больше не видно, какой именно action улетает.

## Пример

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private store = inject(Store);

  readonly users$ = this.store.select(selectUsers);
  readonly loading$ = this.store.select(selectLoading);

  load() { this.store.dispatch(loadUsers()); }
  add(user: User) { this.store.dispatch(addUser({ user })); }
}

// компонент: facade.load();
// шаблон:    {{ facade.users$ | async }}
\`\`\`

Почему так: компонент не импортирует ни \`Store\`, ни файлы actions и selectors. Его тест — это подстановка объекта с двумя полями и двумя методами, без \`provideMockStore\`.

## Что сказать на собеседовании

> Facade — это сервис-обёртка, скрывающая детали NgRx за простым API: наружу он выставляет выборки через \`store.select\` и команды, внутри которых делается \`dispatch\`, а компоненты работают с фасадом, а не со store напрямую. Плюсы: инкапсуляция — компонент ничего не знает про actions и селекторы, и его проще тестировать, потому что мокается один фасад; меньшая связность — реализацию можно заменить, например перейти с NgRx на SignalStore, не трогая компоненты; и читаемость, потому что компонент описывает намерение, а не механику. Минусы тоже реальные: лишний слой и лишний файл, риск god-сервиса и потеря явности потока actions — из компонента больше не видно, какой action диспатчится, поэтому часть команд считает фасад анти-паттерном для Redux. Применяю его в крупных feature-модулях, а для маленьких фич считаю избыточным.

## Ловушки

- **Фасад-прокси один в один** — чистый оверхед, добавляет файл и ничего не даёт.
- **Бизнес-логика в фасаде** — она должна быть в reducers/effects/селекторах; фасад только делегирует.
- **Один фасад на всё приложение** — превращается в god-сервис и тянет за собой весь store.
- **Хранить состояние в самом фасаде** — появится второй источник истины рядом со store.
- **Потеря трассируемости** — по коду компонента непонятно, какой action улетел; частично лечится говорящими именами методов.
- **Спросят следом**: нужен ли фасад при SignalStore — обычно нет, SignalStore сам по себе уже фасад с методами и computed.`,
      en: `## In short

A facade is a **service wrapper** that hides all of NgRx (store, actions, selectors) behind a simple API. The component calls \`facade.load()\` and reads \`facade.users$\` — with no idea that Redux sits underneath.

Analogy: a facade is the **reception desk**. The guest says "I need a room", not "file form 12, forward it to the booking department, then collect the key from the storeroom". The back office is hidden; what faces outward is a legible menu.

## What it is made of

A facade is exactly two things:

1. **State selections** — public \`users$\`, \`loading$\` built from \`store.select(...)\`. Components consume them via the \`async\` pipe.
2. **Commands** — methods like \`load()\` and \`add(user)\` that call \`store.dispatch(...)\` internally.

That is all. No business logic: that stays in reducers, effects, and selectors.

## Pros and cons

**Pros:**

- **Encapsulation**: the component knows nothing about actions or selectors, and in tests the facade is mocked with a single object.
- **Lower coupling**: the implementation can be swapped (NgRx → SignalStore) without touching a single component.
- **Readability**: the component expresses **intent** (\`load\`, \`add\`), not mechanics.
- **A single place for view models**: convenient for combining several selectors into one stream.

**Cons:**

- **An extra layer**: one more file, especially pointless when the facade proxies one-to-one.
- **God-service risk**: the facade grows into a giant service holding everything.
- **It hides the explicitness of the action stream**: some teams consider this a Redux anti-pattern, because traceability suffers — you can no longer see from the component's code which action is dispatched.

## Example

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private store = inject(Store);

  readonly users$ = this.store.select(selectUsers);
  readonly loading$ = this.store.select(selectLoading);

  load() { this.store.dispatch(loadUsers()); }
  add(user: User) { this.store.dispatch(addUser({ user })); }
}

// component: facade.load();
// template:  {{ facade.users$ | async }}
\`\`\`

Why: the component imports neither \`Store\` nor the actions and selectors files. Its test is a stub object with two fields and two methods — no \`provideMockStore\` required.

## What to say in the interview

> A facade is a service wrapper that hides NgRx details behind a simple API: it exposes state selections built from \`store.select\` and commands that dispatch internally, so components work with the facade rather than the store directly. The upsides are encapsulation — the component knows nothing about actions or selectors and is easier to test because you mock a single facade; lower coupling — you can swap the implementation, say move from NgRx to SignalStore, without touching components; and readability, since the component describes intent rather than mechanics. The downsides are real too: it is an extra layer and an extra file, especially when it proxies one-to-one; there is a risk of it becoming a god service; and it hides the explicitness of the action stream, which is why some teams consider it a Redux anti-pattern — you can no longer see from the component which action is dispatched, so traceability suffers. So I use it in large feature modules and consider it overkill for small features.

## Gotchas

- **A one-to-one proxy facade** is pure overhead: an extra file that buys nothing.
- **Business logic in the facade** — it belongs in reducers, effects, and selectors; the facade only delegates.
- **One facade for the whole app** — it becomes a god service and drags the entire store along.
- **Storing state in the facade itself** — you create a second source of truth alongside the store.
- **Loss of traceability** — the component's code no longer shows which action went out; partly mitigated by expressive method names.
- **Follow-up question**: do you need a facade with SignalStore? Usually not — a SignalStore is already a facade with methods and computed values.`
    }
  },
  {
    id: 'rxjs-027',
    category: 'js-state',
    level: 'Hard',
    tags: ['ngxs', 'state-management'],
    question: {
      ru: 'Как устроен NGXS: state, actions, selectors? Чем отличается от NgRx?',
      en: 'How is NGXS structured: state, actions, selectors? How does it differ from NgRx?'
    },
    answer: {
      ru: `## Коротко

NGXS — альтернативный state-менеджмент для Angular. Та же идея store и actions, но подан в **«ангуляровском», объектно-ориентированном** стиле: декораторы, классы, DI. Под капотом тоже RxJS.

Главное отличие в одной фразе: **в NgRx одна фича размазана по четырём файлам, в NGXS она собрана в один класс**.

Аналогия: NgRx — это **конвейер с разделением труда**: один цех выписывает заявки, другой считает, третий ходит в банк. NGXS — **универсальный мастер**: он и заявку принял, и в банк сходил, и запись в книге поправил. Быстрее, но следов меньше.

## Из чего состоит

1. **State** — класс с декоратором \`@State({ name, defaults })\`, который **объединяет данные и обработчики**. Зависимости приходят обычным Angular-DI через конструктор.
2. **Actions** — классы с payload. Диспатч: \`store.dispatch(new LoadUsers())\`.
3. **Обработчик** — метод, помеченный \`@Action(LoadUsers)\`, живущий **в том же state-классе**, а не в отдельном effects-файле. Это ключевое отличие.
4. **Мутация состояния** — через \`ctx.patchState({...})\` или \`ctx.setState(...)\`: императивнее, чем чистый reducer.
5. **Selectors** — статические методы с \`@Selector()\`, мемоизированные так же, как в NgRx.

Внутри \`@Action\` можно **вернуть Observable или Promise** — NGXS дождётся его. Это встроенная замена effects.

## Пример

\`\`\`ts
@State<UsersStateModel>({
  name: 'users',
  defaults: { list: [], loading: false }
})
@Injectable()
export class UsersState {
  constructor(private api: UserApi) {}

  @Selector()
  static activeUsers(state: UsersStateModel) {
    return state.list.filter(u => u.active);
  }

  @Action(LoadUsers)
  load(ctx: StateContext<UsersStateModel>) {
    ctx.patchState({ loading: true });
    return this.api.getAll().pipe(
      tap(list => ctx.patchState({ list, loading: false }))
    );
  }
}
\`\`\`

Почему так: тут в одном классе есть и «reducer» (\`patchState\`), и «effect» (\`this.api.getAll()\`), и «selector» (\`activeUsers\`). В NgRx это были бы четыре файла и три импорта между ними.

## Что сказать на собеседовании

> NGXS — это альтернативный state-менеджмент для Angular с меньшим boilerplate и более ангуляровским, объектно-ориентированным стилем: декораторы, классы, DI; под капотом он тоже на RxJS. Состояние объявляется классом с декоратором \`@State\`, он же содержит обработчики. Actions — классы с payload, диспатчатся через \`store.dispatch(new LoadUsers())\`, а обработчик живёт в том же state-классе как метод с \`@Action\`, а не в отдельном файле эффектов — ключевое отличие от NgRx. Состояние меняется императивно через \`patchState\` или \`setState\`, а обработчик может вернуть Observable или Promise, и NGXS его дождётся — замена effects. Селекторы — статические методы с \`@Selector()\`, тоже мемоизированные. Итог: NgRx строже следует Redux, что лучше для крупных команд и аудита, а NGXS быстрее в разработке, но платит меньшей трассируемостью.

## Ловушки

- **«NGXS не про Redux»** — про: те же однонаправленный поток и единый store, отличается только упаковка.
- **Мутировать состояние напрямую** вместо \`patchState\`/\`setState\` — сломает мемоизацию селекторов.
- **Забыть вернуть Observable из \`@Action\`** — NGXS не дождётся завершения, и \`dispatch().subscribe()\` отработает слишком рано.
- **\`@Selector()\` не статический** — селекторы объявляются статическими методами класса.
- **Толстый state-класс** — вся фича в одном файле легко разрастается; это цена «меньше файлов».
- **Спросят следом**: как выбирать между NgRx и NGXS — по требованиям к аудиту и размеру команды, а не по вкусу; в новых проектах эту нишу всё чаще занимает \`@ngrx/signals\`.`,
      en: `## In short

NGXS is an alternative state manager for Angular. Same store-and-actions idea, but served in an **"Angular-ish", object-oriented** style: decorators, classes, DI. Under the hood it too is built on RxJS.

The core difference in one sentence: **in NgRx a feature is spread across four files; in NGXS it is gathered into one class**.

Analogy: NgRx is a **production line with division of labour** — one department writes the requests, another does the maths, a third goes to the bank. NGXS is the **all-round craftsman**: took the request, went to the bank, updated the ledger. Faster, but fewer traces left behind.

## What it is made of

1. **State** — a class decorated with \`@State({ name, defaults })\` that **bundles the data and the handlers**. Dependencies arrive via ordinary Angular DI through the constructor.
2. **Actions** — classes with a payload. Dispatched as \`store.dispatch(new LoadUsers())\`.
3. **The handler** — a method marked \`@Action(LoadUsers)\` living **in that same state class**, not in a separate effects file. This is the key difference.
4. **State mutation** — via \`ctx.patchState({...})\` or \`ctx.setState(...)\`: more imperative than a pure reducer.
5. **Selectors** — static methods with \`@Selector()\`, memoized the same way as in NgRx.

Inside an \`@Action\` handler you can **return an Observable or a Promise** and NGXS will wait for it. That is the built-in effects replacement.

## Example

\`\`\`ts
@State<UsersStateModel>({
  name: 'users',
  defaults: { list: [], loading: false }
})
@Injectable()
export class UsersState {
  constructor(private api: UserApi) {}

  @Selector()
  static activeUsers(state: UsersStateModel) {
    return state.list.filter(u => u.active);
  }

  @Action(LoadUsers)
  load(ctx: StateContext<UsersStateModel>) {
    ctx.patchState({ loading: true });
    return this.api.getAll().pipe(
      tap(list => ctx.patchState({ list, loading: false }))
    );
  }
}
\`\`\`

Why: a single class here holds the "reducer" (\`patchState\`), the "effect" (\`this.api.getAll()\`), and the "selector" (\`activeUsers\`). In NgRx that would be four files and three imports between them.

## What to say in the interview

> NGXS is an alternative state manager for Angular aimed at less boilerplate and a more Angular-ish, object-oriented style: decorators, classes, DI; under the hood it is also built on RxJS. State is declared as a class with a \`@State\` decorator specifying the name and defaults, and that same class holds the handlers. Actions are classes with a payload, dispatched via \`store.dispatch(new LoadUsers())\`, and the handler lives inside the state class as a method decorated with \`@Action\` rather than in a separate effects file — the key difference from NgRx. State is changed imperatively through \`patchState\` or \`setState\` instead of pure reducers, and a handler can return an Observable or Promise which NGXS will await — that is the built-in effects replacement. Selectors are static methods with \`@Selector()\` and are memoized the same way. Comparing the two: NgRx follows Redux more strictly, which is better for large teams and auditing; NGXS is faster to develop with, but pays for it with weaker traceability.

## Gotchas

- **"NGXS is not Redux"** — it is: same unidirectional flow and single store, only the packaging differs.
- **Mutating state directly** instead of \`patchState\`/\`setState\` — it breaks selector memoization.
- **Forgetting to return the Observable from \`@Action\`** — NGXS will not await completion and \`dispatch().subscribe()\` fires too early.
- **A non-static \`@Selector()\`** — selectors are declared as static class methods.
- **A fat state class** — the whole feature in one file grows quickly; that is the price of "fewer files".
- **Follow-up question**: how do you choose between NgRx and NGXS? By auditing requirements and team size, not taste; and in new projects \`@ngrx/signals\` increasingly occupies this niche.`
    }
  },
  {
    id: 'rxjs-028',
    category: 'js-state',
    level: 'Hard',
    tags: ['signals', 'rxjs', 'tosignal', 'interop'],
    question: {
      ru: 'Как взаимодействуют Signals и RxJS? Объясните toSignal и toObservable.',
      en: 'How do Signals and RxJS interoperate? Explain toSignal and toObservable.'
    },
    answer: {
      ru: `## Коротко

В Angular две модели реактивности, и они про разное:

- **RxJS** — **push**: события во времени, богатые операторы, отмена. Про «что происходит».
- **Signals** — **pull**: значение всегда есть прямо сейчас, зависимости отслеживаются автоматически. Про «что есть».

Аналогия: Observable — **лента новостей**, которая приходит вам сама. Signal — **табло на вокзале**: там всегда написано текущее значение, и вы читаете его когда захотите.

Мосты между мирами живут в \`@angular/core/rxjs-interop\`: \`toSignal\` и \`toObservable\`.

## Как это работает по шагам

**\`toSignal(obs$)\` — из потока в табло:**

1. Подписывается на Observable **сразу**.
2. Каждый \`next\` кладёт значение в signal, который читается синхронно: \`user()\`.
3. При уничтожении владельца (в injection context) **автоматически отписывается** — утечек нет.
4. Требует \`initialValue\` — потому что до первой эмиссии у signal должно быть что-то. Либо \`requireSync: true\`, если источник **гарантированно** синхронный, как \`BehaviorSubject\`.

**\`toObservable(sig)\` — из табло в поток:**

1. Под капотом создаёт \`effect\`, который следит за сигналом.
2. При изменении сигнала эффект эмитит новое значение в Observable.
3. Важно: эмиссии **асинхронные**, они происходят на эффект-тике, а не синхронно на каждый \`set()\`. Несколько быстрых \`set\` подряд могут дать одну эмиссию с последним значением.

## Когда что использовать

- **Состояние, читаемое в шаблоне** → Signal. Или \`toSignal\` на конце RxJS-конвейера.
- **Сложная асинхронная логика** (debounce, switchMap, retry, отмена) → RxJS, а на выходе \`toSignal\` для потребления.
- **Signal нужно подать на вход RxJS-конвейера** → \`toObservable\`.

## Пример

\`\`\`ts
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

readonly query = signal('');

// signal → RxJS (сложная асинхронщина) → signal
readonly results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.api.search(q))
  ),
  { initialValue: [] as Item[] }
);
\`\`\`

Почему так: \`debounceTime\` и \`switchMap\` на голых сигналах не сделать — там нет понятия времени и отмены. А вот результат удобнее держать сигналом: в шаблоне это \`results()\` без \`async\`-пайпа, и работает при zoneless.

## Что сказать на собеседовании

> В Angular сейчас две модели реактивности. RxJS — push-модель потоков событий во времени с операторами и отменой, для асинхронных источников: HTTP, WebSocket, debounce, гонки запросов. Signals — синхронные значения с автоотслеживанием зависимостей, pull-модель для UI и шаблонов. Мосты даёт \`@angular/core/rxjs-interop\`. \`toSignal\` подписывается на Observable и хранит последнее значение как сигнал; в контексте инъекции он сам отписывается и требует либо \`initialValue\`, либо \`requireSync: true\` для синхронных источников вроде \`BehaviorSubject\`. \`toObservable\` работает обратно через \`effect\` и эмитит асинхронно, на эффект-тике, а не на каждый \`set\`, поэтому пачка быстрых изменений может схлопнуться в одну эмиссию. Правило: асинхронную координацию — на RxJS, а на границе с шаблоном перевожу в сигнал через \`toSignal\`.

## Ловушки

- **\`toSignal\` без \`initialValue\`** — тип станет \`T | undefined\`, и шаблон придётся защищать проверками.
- **\`requireSync: true\` на несинхронном источнике** — упадёт в рантайме, потому что значения на момент подписки нет.
- **Ждать синхронной эмиссии от \`toObservable\`** — её не будет, эмиссия придёт на эффект-тике.
- **\`toSignal\` вне injection context** — некому отписаться; нужен явный \`injector\` в опциях.
- **\`toSignal\` подписывается сразу**, даже если сигнал никто не читает — для тяжёлого источника это неожиданная работа.
- **Спросят следом**: что с ошибками — ошибка Observable в \`toSignal\` будет выброшена при чтении сигнала, поэтому \`catchError\` ставят в потоке, до моста.`,
      en: `## In short

Angular has two reactivity models, and they are about different things:

- **RxJS** — **push**: events over time, rich operators, cancellation. About "what is happening".
- **Signals** — **pull**: a value always exists right now, dependencies are tracked automatically. About "what is".

Analogy: an Observable is a **news feed** that arrives at you. A Signal is a **departures board** at a station: it always shows the current value and you read it whenever you like.

The bridges between the worlds live in \`@angular/core/rxjs-interop\`: \`toSignal\` and \`toObservable\`.

## How it works, step by step

**\`toSignal(obs$)\` — from stream to board:**

1. Subscribes to the Observable **immediately**.
2. Every \`next\` stores the value in a signal, read synchronously as \`user()\`.
3. When the owner is destroyed (in an injection context) it **unsubscribes automatically** — no leaks.
4. It requires \`initialValue\`, because the signal needs something before the first emission. Or \`requireSync: true\` if the source is **guaranteed** synchronous, like a \`BehaviorSubject\`.

**\`toObservable(sig)\` — from board to stream:**

1. Internally it creates an \`effect\` that watches the signal.
2. When the signal changes, the effect emits the new value into the Observable.
3. Important: emissions are **asynchronous** — they happen on the effect tick, not synchronously on every \`set()\`. Several quick \`set\` calls may collapse into one emission carrying the last value.

## When to use which

- **State read in the template** → a Signal. Or \`toSignal\` at the end of an RxJS pipeline.
- **Complex async logic** (debounce, switchMap, retry, cancellation) → RxJS, with \`toSignal\` on the way out for consumption.
- **Feeding a signal into an RxJS pipeline** → \`toObservable\`.

## Example

\`\`\`ts
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

readonly query = signal('');

// signal → RxJS (the hard async part) → signal
readonly results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.api.search(q))
  ),
  { initialValue: [] as Item[] }
);
\`\`\`

Why: \`debounceTime\` and \`switchMap\` cannot be expressed on bare signals — there is no notion of time or cancellation there. The result, on the other hand, is nicer as a signal: in the template it is just \`results()\`, no \`async\` pipe, and it works in zoneless mode.

## What to say in the interview

> Angular now has two reactivity models. RxJS is a push model of event streams over time with a rich operator set and cancellation, ideal for async sources: HTTP, WebSockets, debouncing, request races. Signals are synchronous values with automatic dependency tracking — a pull model, ideal for UI state and templates. The bridges come from \`@angular/core/rxjs-interop\`. \`toSignal\` subscribes to an Observable and stores its latest value as a signal; in an injection context it unsubscribes automatically on destroy, so no leaks, and it requires either an \`initialValue\` or \`requireSync: true\` for guaranteed-synchronous sources like a \`BehaviorSubject\`. \`toObservable\` goes the other way: internally it uses an \`effect\` to track signal changes, and those emissions are asynchronous, on the effect tick rather than on each \`set\` — an important nuance, because a burst of rapid changes can collapse into a single emission. The rule I follow: async coordination in RxJS, converting to a signal at the template boundary with \`toSignal\`.

## Gotchas

- **\`toSignal\` without \`initialValue\`** — the type becomes \`T | undefined\` and the template needs guards.
- **\`requireSync: true\` on a non-synchronous source** — it throws at runtime because no value exists at subscribe time.
- **Expecting a synchronous emission from \`toObservable\`** — there is none; it arrives on the effect tick.
- **\`toSignal\` outside an injection context** — nobody unsubscribes; pass an explicit \`injector\` in the options.
- **\`toSignal\` subscribes immediately**, even if nobody reads the signal — surprising work for a heavy source.
- **Follow-up question**: what about errors? An Observable error surfaces when the signal is read, so put \`catchError\` in the stream, before the bridge.`
    }
  },
  {
    id: 'rxjs-029',
    category: 'js-state',
    level: 'Hard',
    tags: ['takeuntildestroyed', 'unsubscription', 'angular'],
    question: {
      ru: 'Как работает takeUntilDestroyed и почему он лучше ручного takeUntil + Subject?',
      en: 'How does takeUntilDestroyed work and why is it better than manual takeUntil + Subject?'
    },
    answer: {
      ru: `## Коротко

\`takeUntilDestroyed\` (из \`@angular/core/rxjs-interop\`, Angular 16+) — оператор, который **сам** отписывает поток при уничтожении компонента, директивы или сервиса. Он делает ровно то, что раньше делали руками через \`destroy$\` Subject и \`ngOnDestroy\`, но без единой строчки церемонии.

Аналогия: раньше вы вешали на дверь **записку «уходя, погаси свет»** и надеялись, что не забудете. \`takeUntilDestroyed\` — это **датчик движения**: свет гаснет сам, потому что подключён к самому зданию (\`DestroyRef\`), а не к вашей памяти.

## Как это работает по шагам

1. Angular для каждого «владельца» (компонента, директивы, сервиса) держит \`DestroyRef\`.
2. \`DestroyRef.onDestroy(cb)\` позволяет зарегистрировать колбэк, который вызовется при уничтожении владельца.
3. Внутри \`takeUntilDestroyed\` создаётся \`Subject\`, который эмитит именно в этом колбэке.
4. Дальше применяется обычная логика \`takeUntil\` по этому Subject.
5. Владелец уничтожается → Subject эмитит → поток завершается → срабатывают все teardown и \`finalize\`.

## Два режима вызова

- **В injection context** (инициализатор поля, конструктор) — аргумент **не нужен**, \`DestroyRef\` берётся из контекста автоматически.
- **Вне injection context** (в \`ngOnInit\` и других методах) — \`DestroyRef\` нужно **получить заранее** через \`inject(DestroyRef)\` в поле и передать явно.

## Пример

\`\`\`ts
export class MyComponent {
  private destroyRef = inject(DestroyRef);

  // 1. В контексте инъекции — без аргумента
  data$ = this.service.stream$.pipe(takeUntilDestroyed());

  // 2. В методе — DestroyRef передаём явно
  ngOnInit() {
    this.service.stream$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.handle(v));
  }
}
\`\`\`

Почему так: инициализатор поля выполняется в контексте инъекции, а \`ngOnInit\` — уже нет. Вызов \`takeUntilDestroyed()\` без аргумента в методе упадёт с ошибкой, и это самая частая ошибка при переходе на него.

## Что сказать на собеседовании

> \`takeUntilDestroyed\` — оператор из \`@angular/core/rxjs-interop\`, доступный с Angular 16: он автоматически отписывает поток при уничтожении компонента, директивы или сервиса через \`DestroyRef\`. Под капотом \`DestroyRef.onDestroy\` регистрирует колбэк, оператор создаёт Subject, эмитящий в нём, и применяет обычную логику \`takeUntil\`. Режима два: в контексте инъекции — в инициализаторе поля или конструкторе — он сам возьмёт \`DestroyRef\`, а в методе вроде \`ngOnInit\` контекста уже нет, и \`DestroyRef\` нужно получить заранее и передать явно. Лучше ручного варианта тем, что не нужны ни поле \`destroy$\`, ни \`ngOnDestroy\`, и он работает вне компонентов, в сервисах и директивах. Нюанс тот же, что у \`takeUntil\`: ставить его нужно последним в pipe, иначе нижестоящие операторы, особенно higher-order, могут пережить отписку.

## Ловушки

- **\`takeUntilDestroyed()\` без аргумента в \`ngOnInit\`** — ошибка «не в контексте инъекции». Самая частая.
- **Не последним в pipe** — внутренние подписки \`switchMap\` переживут уничтожение компонента.
- **В сервисе с \`providedIn: 'root'\`** — такой сервис живёт до конца приложения, отписка не наступит никогда; это работает только для сервисов со scope-ом компонента.
- **Ждать, что он заменяет \`async\`-пайп** — нет, \`async\` всё ещё предпочтительнее, если значение просто выводится в шаблон.
- **\`inject(DestroyRef)\` внутри метода** — тоже упадёт: инъекция нужна на этапе инициализации поля.
- **Спросят следом**: как то же сделать без RxJS — через \`destroyRef.onDestroy(() => ...)\` напрямую; это тот же механизм, только вручную.`,
      en: `## In short

\`takeUntilDestroyed\` (from \`@angular/core/rxjs-interop\`, Angular 16+) is an operator that **unsubscribes for you** when a component, directive, or service is destroyed. It does exactly what you used to hand-roll with a \`destroy$\` Subject and \`ngOnDestroy\` — minus every line of ceremony.

Analogy: you used to stick a **"turn off the lights when you leave" note** on the door and hope you would remember. \`takeUntilDestroyed\` is a **motion sensor**: the lights go out by themselves, because it is wired to the building (\`DestroyRef\`) rather than to your memory.

## How it works, step by step

1. Angular keeps a \`DestroyRef\` for every "owner" — component, directive, or service.
2. \`DestroyRef.onDestroy(cb)\` lets you register a callback invoked when that owner is destroyed.
3. Inside \`takeUntilDestroyed\` a \`Subject\` is created that emits in exactly that callback.
4. Then ordinary \`takeUntil\` logic is applied against that Subject.
5. The owner is destroyed → the Subject emits → the stream completes → every teardown and \`finalize\` fires.

## Two calling modes

- **In an injection context** (field initialiser, constructor) — **no argument needed**; \`DestroyRef\` is taken from the context automatically.
- **Outside an injection context** (in \`ngOnInit\` and other methods) — you must obtain \`DestroyRef\` **in advance** via \`inject(DestroyRef)\` in a field and pass it explicitly.

## Example

\`\`\`ts
export class MyComponent {
  private destroyRef = inject(DestroyRef);

  // 1. In an injection context — no argument
  data$ = this.service.stream$.pipe(takeUntilDestroyed());

  // 2. In a method — pass DestroyRef explicitly
  ngOnInit() {
    this.service.stream$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.handle(v));
  }
}
\`\`\`

Why: a field initialiser runs in an injection context, \`ngOnInit\` does not. Calling \`takeUntilDestroyed()\` with no argument inside a method throws — and that is the single most common mistake when adopting it.

## What to say in the interview

> \`takeUntilDestroyed\` is an operator from \`@angular/core/rxjs-interop\`, available since Angular 16, that automatically unsubscribes a stream when a component, directive, or service is destroyed, using \`DestroyRef\`. Under the hood \`DestroyRef.onDestroy\` registers a callback fired when the owner is destroyed, the operator creates a Subject that emits in that callback, and applies ordinary \`takeUntil\` logic against it. It works in two modes: called in an injection context — a field initialiser or constructor — it picks up \`DestroyRef\` itself; in a method like \`ngOnInit\` there is no injection context, so you must obtain \`DestroyRef\` in advance and pass it explicitly. It beats the manual approach because there is no \`destroy$\` field and no \`ngOnDestroy\` to forget, and because it works outside components, in services and directives. The same caveat as \`takeUntil\` applies: put it last in the pipe, otherwise downstream operators — especially higher-order ones — can outlive the unsubscription.

## Gotchas

- **\`takeUntilDestroyed()\` with no argument inside \`ngOnInit\`** — "not in an injection context" error. The most common one.
- **Not last in the pipe** — \`switchMap\`'s inner subscriptions outlive the component's destruction.
- **In a \`providedIn: 'root'\` service** — such a service lives for the app's lifetime, so destruction never comes; this only helps for component-scoped services.
- **Expecting it to replace the \`async\` pipe** — it does not; \`async\` is still preferable when the value simply renders in the template.
- **\`inject(DestroyRef)\` inside a method** — that throws too: injection must happen during field initialisation.
- **Follow-up question**: how do you do the same without RxJS? Call \`destroyRef.onDestroy(() => ...)\` directly — the same mechanism, done by hand.`
    }
  },
  {
    id: 'rxjs-030',
    category: 'js-state',
    level: 'Expert',
    tags: ['async-pipe', 'change-detection', 'internals'],
    question: {
      ru: 'Как async pipe работает под капотом и как он взаимодействует с change detection?',
      en: 'How does the async pipe work under the hood and how does it interact with change detection?'
    },
    answer: {
      ru: `## Коротко

\`AsyncPipe\` делает три вещи: **подписывается** на Observable (или Promise), отдаёт в шаблон **последнее значение** и **сам отписывается** при уничтожении хоста. Плюс на каждую эмиссию дёргает change detection.

Аналогия: async pipe — это **личный секретарь шаблона**. Он подписался на рассылку за вас, кладёт свежий выпуск вам на стол, стучит в дверь («есть новости, посмотри!») и, когда вы съезжаете из кабинета, сам отменяет подписку.

## Как это работает по шагам

1. Angular вызывает метод \`transform(obs$)\` пайпа при каждой проверке.
2. Пайп сравнивает переданный Observable с **прошлым**. Тот же — ничего не делает.
3. Другой (по ссылке) — **отписывается от старого** и подписывается на новый.
4. Приходит \`next\` → значение сохраняется во внутреннем поле.
5. Пайп вызывает \`ChangeDetectorRef.markForCheck()\` — помечает компонент и всех его предков «грязными».
6. На ближайшем цикле CD Angular перечитывает \`transform\`, и тот возвращает сохранённое значение.
7. \`ngOnDestroy\` пайпа → \`unsubscribe\`. Утечка невозможна.

## Почему markForCheck — ключевой момент

При стратегии **OnPush** компонент не проверяется на каждый тик — только когда он «помечен грязным». Async pipe помечает его на **каждую новую эмиссию**, поэтому шаблон обновляется без ручного \`detectChanges()\`. И именно поэтому async pipe нормально работает в **zoneless**-режиме: он опирается на \`markForCheck\`, а не на Zone.js.

## Пример

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span>{{ count$ | async }}</span>'
})
export class CounterComponent {
  readonly count$ = this.store.count$; // поле, а не вызов метода!
}
\`\`\`

Почему так: поток лежит **в поле**. Если бы в шаблоне стоял \`{{ service.getCount() | async }}\`, то на каждый цикл CD создавался бы **новый** Observable, пайп видел бы новую ссылку и переподписывался бы бесконечно.

## Что сказать на собеседовании

> \`AsyncPipe\` подписывается на Observable или Promise, отдаёт в шаблон последнее значение и автоматически отписывается при уничтожении хоста, снимая класс утечек. Под капотом \`transform\` сравнивает Observable с предыдущим и при смене ссылки переподписывается, а на каждый \`next\` сохраняет значение и вызывает \`ChangeDetectorRef.markForCheck\`, помечая компонент и его предков грязными. Это ключ к change detection: при OnPush компонент проверяется только когда помечен грязным, и именно async pipe его помечает на каждой эмиссии, поэтому шаблон обновляется без \`detectChanges\` и работает в zoneless-режиме. Подводный камень: несколько \`| async\` на один поток — это несколько подписок и, для cold-источника, несколько HTTP-запросов; лечится \`shareReplay\` или \`@if (data$ | async; as data)\`. Альтернатива на Signals — \`toSignal\`.

## Ловушки

- **Несколько \`| async\` на один cold-поток** = несколько HTTP-запросов. Лечится \`shareReplay\` или \`@if (data$ | async; as data)\`.
- **Вызов метода в шаблоне** (\`obj.getData() | async\`) — новый Observable на каждый CD, бесконечная переподписка.
- **Ждать значения в \`ngOnInit\`** — async pipe живёт в шаблоне, в коде значения нет.
- **\`| async\` вместе с ручным \`subscribe\`** на том же потоке — две подписки и двойная работа.
- **Ошибка в потоке** проваливается в \`ErrorHandler\`, и подписка пайпа умирает — шаблон замирает. Ставьте \`catchError\` до пайпа.
- **Спросят следом**: чем отличается от \`toSignal\` — async pipe помечает компонент грязным через \`markForCheck\`, а \`toSignal\` встраивается в граф сигналов; в zoneless работают оба.`,
      en: `## In short

\`AsyncPipe\` does three things: it **subscribes** to an Observable (or Promise), hands the **latest value** to the template, and **unsubscribes itself** when the host is destroyed. Plus it nudges change detection on every emission.

Analogy: the async pipe is the **template's personal secretary**. It took out the subscription on your behalf, puts each fresh issue on your desk, knocks on the door ("news, take a look!"), and cancels the subscription itself when you move out of the office.

## How it works, step by step

1. Angular calls the pipe's \`transform(obs$)\` on every check.
2. The pipe compares the passed Observable with the **previous** one. Same reference — nothing happens.
3. A different one — it **unsubscribes from the old** and subscribes to the new.
4. A \`next\` arrives → the value is stored in an internal field.
5. The pipe calls \`ChangeDetectorRef.markForCheck()\` — marking the component and all its ancestors dirty.
6. On the next CD cycle Angular re-reads \`transform\`, which returns the stored value.
7. The pipe's \`ngOnDestroy\` → \`unsubscribe\`. A leak is impossible.

## Why markForCheck is the crux

Under **OnPush** a component is not checked every tick — only when it is marked dirty. The async pipe marks it on **every new emission**, so the template updates without a manual \`detectChanges()\`. That is also why the async pipe works fine in **zoneless** mode: it relies on \`markForCheck\`, not on Zone.js.

## Example

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span>{{ count$ | async }}</span>'
})
export class CounterComponent {
  readonly count$ = this.store.count$; // a field, not a method call!
}
\`\`\`

Why: the stream lives **in a field**. Had the template said \`{{ service.getCount() | async }}\`, every CD cycle would build a **new** Observable, the pipe would see a new reference, and it would resubscribe endlessly.

## What to say in the interview

> \`AsyncPipe\` subscribes to an Observable or Promise, returns the latest emitted value to the template, and automatically unsubscribes when the host is destroyed, which removes an entire class of leaks. Under the hood its \`transform\` compares the passed Observable with the previous one and resubscribes if the reference changed; on every \`next\` it stores the value and calls \`ChangeDetectorRef.markForCheck\`, marking the component and its ancestors dirty. That is the key to change detection: under OnPush a component is only checked when marked dirty, and it is the async pipe that marks it on every emission — so the template updates without a manual \`detectChanges\`, and it works correctly in zoneless mode since it relies on \`markForCheck\` rather than Zone.js. As for pitfalls: several \`| async\` bindings on one stream means several subscriptions and, for a cold source, several HTTP requests, fixed with \`shareReplay\` or an \`@if (data$ | async; as data)\` block. The Signals alternative is \`toSignal\`.

## Gotchas

- **Several \`| async\` on one cold stream** = several HTTP requests. Fix with \`shareReplay\` or \`@if (data$ | async; as data)\`.
- **A method call in the template** (\`obj.getData() | async\`) — a new Observable per CD cycle, endless resubscription.
- **Expecting the value in \`ngOnInit\`** — the async pipe lives in the template; the value does not exist in code.
- **\`| async\` alongside a manual \`subscribe\`** on the same stream — two subscriptions and double the work.
- **An error in the stream** falls through to the \`ErrorHandler\` and kills the pipe's subscription — the template freezes. Put \`catchError\` before the pipe.
- **Follow-up question**: how does it differ from \`toSignal\`? The async pipe marks the component dirty via \`markForCheck\`, while \`toSignal\` plugs into the signal graph; both work in zoneless mode.`
    }
  },
  {
    id: 'rxjs-031',
    category: 'js-state',
    level: 'Medium',
    tags: ['signals', 'rxjs', 'when-to-use'],
    question: {
      ru: 'Когда выбирать Signals, а когда RxJS? Где граница ответственности?',
      en: 'When should you choose Signals versus RxJS? Where is the boundary of responsibility?'
    },
    answer: {
      ru: `## Коротко

Правило в одну строку: **состояние — в Signals, события и асинхронность — в RxJS**.

Signals отвечают на вопрос «**что есть прямо сейчас**»: значение всегда доступно синхронно, зависимости отслеживаются автоматически, это pull-модель. RxJS отвечает на вопрос «**что происходит во времени**»: значения толкаются подписчику, есть операторы и отмена, это push-модель.

Аналогия: Signal — **термометр на стене**: посмотрел и узнал температуру. Observable — **лента показаний метеостанции**: события идут потоком, их можно фильтровать, усреднять, прерывать.

## Когда что использовать

**Signals — берите, если:**

- локальное состояние UI: флаги, выбранная вкладка, значения формы;
- производные значения через \`computed\`;
- связывание состояния с шаблоном, особенно при zoneless и OnPush;
- простые синхронные вычисления, где асинхронности нет вовсе.

**RxJS — берите, если:**

- асинхронные события: HTTP, WebSocket, события DOM, таймеры;
- нужна координация во времени: \`debounceTime\`, \`switchMap\`, \`combineLatest\`, \`retry\`;
- нужна отмена устаревших операций — поиск, гонки запросов;
- сложные пайплайны преобразований потока.

Проверочный вопрос: **есть ли здесь понятие времени или отмены?** Если да — это RxJS. Если нужно просто «текущее значение» — это Signal.

## Пример

\`\`\`ts
readonly query = signal('');

readonly results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.api.search(q))
  ),
  { initialValue: [] as Item[] }
);
\`\`\`

Почему так: это и есть самый ходовой паттерн — **RxJS добывает и преобразует данные, Signal их потребляет в шаблоне**. Ввод хранится сигналом, потому что это состояние; debounce и отмена сделаны в RxJS, потому что это время; результат снова сигнал, потому что его читает шаблон.

## Что сказать на собеседовании

> Это два инструмента разной природы. Signals — модель синхронного состояния с автоотслеживанием зависимостей: значение существует сейчас и читается по требованию, это pull-модель. RxJS — модель асинхронных событий во времени: значения толкаются подписчику, есть операторы и, что важно, отмена. Отсюда разделение ответственности: Signals беру для локального состояния UI, производных через \`computed\` и связывания с шаблоном; RxJS — для HTTP, WebSocket и таймеров, для координации во времени через \`debounceTime\`, \`switchMap\`, \`combineLatest\` и \`retry\` и для отмены устаревших операций. Самый частый паттерн — RxJS для добычи данных, а на выходе \`toSignal\` для шаблона; в обратную сторону работает \`toObservable\`. И антипаттерн: не делать debounce и switchMap на голых сигналах, там нет ни времени, ни отмены.

## Ловушки

- **Складывать всё в сигналы** — debounce, отмена, гонки запросов на сигналах не выражаются; получите баги вместо кода.
- **Держать булев флаг в \`BehaviorSubject\`** ради «единообразия» — лишняя подписка и \`async\`-пайп там, где хватило бы \`signal(false)\`.
- **\`effect()\` вместо \`computed()\`** для производного значения — эффект не возвращает значение и провоцирует императивные записи в другие сигналы.
- **Думать, что Signals заменяют RxJS** — нет, они закрывают только состояние; асинхронность остаётся за RxJS.
- **Цепочка \`toObservable\` → \`toSignal\` без нужды** — если асинхронности нет, мост только добавляет тик задержки.
- **Спросят следом**: почему Signals не глитчат, а \`combineLatest\` глитчит — граф сигналов пересчитывается топологически и один раз, а push-модель RxJS отдаёт промежуточные несогласованные комбинации.`,
      en: `## In short

The rule in one line: **state goes in Signals, events and async go in RxJS**.

Signals answer "**what is true right now**": the value is always available synchronously, dependencies are tracked automatically — a pull model. RxJS answers "**what is happening over time**": values are pushed to the subscriber, with operators and cancellation — a push model.

Analogy: a Signal is a **thermometer on the wall**: glance at it and you know the temperature. An Observable is the **weather station's reading tape**: events arrive as a stream that you can filter, average, or cut off.

## When to use which

**Reach for Signals when:**

- it is local UI state: flags, the selected tab, form values;
- you need derived values via \`computed\`;
- you are binding state to the template, especially under zoneless and OnPush;
- the computation is simple and synchronous with no async at all.

**Reach for RxJS when:**

- there are async events: HTTP, WebSockets, DOM events, timers;
- you need coordination over time: \`debounceTime\`, \`switchMap\`, \`combineLatest\`, \`retry\`;
- you need to cancel stale operations — search, request races;
- you have complex stream transformation pipelines.

The test question: **is there a notion of time or cancellation here?** If yes, it is RxJS. If you just need "the current value", it is a Signal.

## Example

\`\`\`ts
readonly query = signal('');

readonly results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.api.search(q))
  ),
  { initialValue: [] as Item[] }
);
\`\`\`

Why: this is the workhorse pattern — **RxJS fetches and transforms the data, a Signal consumes it in the template**. The input is a signal because it is state; debouncing and cancellation are RxJS because they are about time; the result is a signal again because the template reads it.

## What to say in the interview

> These are two tools of different natures. Signals are a model of synchronous state with automatic dependency tracking: the value always exists right now and is read on demand — a pull model. RxJS is a model of asynchronous events over time: values are pushed to the subscriber, with a rich operator set and, crucially, cancellation. Hence the division of responsibility: I use Signals for local UI state, derived values via \`computed\`, and template binding, especially with zoneless and OnPush; and RxJS for async events such as HTTP, WebSockets and timers, for time coordination through \`debounceTime\`, \`switchMap\`, \`combineLatest\` and \`retry\`, and for cancelling stale operations. The most common pattern is RxJS to fetch and transform, then \`toSignal\` for consumption in the template; \`toObservable\` works the other way. And one anti-pattern: do not try to debounce or switchMap on bare signals, since there is neither time nor cancellation there.

## Gotchas

- **Cramming everything into signals** — debouncing, cancellation, and request races cannot be expressed there; you get bugs instead of code.
- **Keeping a boolean flag in a \`BehaviorSubject\`** for "consistency" — an extra subscription and an \`async\` pipe where \`signal(false)\` would do.
- **\`effect()\` instead of \`computed()\`** for a derived value — an effect returns nothing and invites imperative writes into other signals.
- **Thinking Signals replace RxJS** — they do not; they cover state only, async stays with RxJS.
- **Chaining \`toObservable\` → \`toSignal\` needlessly** — with no async involved, the bridge only adds a tick of latency.
- **Follow-up question**: why do Signals not glitch while \`combineLatest\` does? The signal graph recomputes topologically and once, whereas the RxJS push model emits intermediate, inconsistent combinations.`
    }
  },
  {
    id: 'rxjs-032',
    category: 'js-state',
    level: 'Expert',
    tags: ['observable', 'subscriber', 'internals'],
    question: {
      ru: 'Что происходит при вызове subscribe()? Опишите весь путь от Observable до Subscriber.',
      en: 'What happens when subscribe() is called? Describe the whole path from Observable to Subscriber.'
    },
    answer: {
      ru: `## Коротко

\`subscribe()\` — это момент, когда «рецепт» превращается в работающий поток. Цепочка операторов **разворачивается снизу вверх**: подписка идёт от вашего кода к источнику, а значения потом текут обратно — от источника к вам.

Аналогия: цепочка \`pipe\` — это **вложенные коробки**. При \`subscribe\` вы открываете внешнюю, она открывает следующую, и так до самой маленькой — до источника. Только когда открыта последняя, из неё начинают вылетать значения и идти обратно наружу, по пути преобразуясь в каждой коробке.

## Как это работает по шагам

1. **Нормализация Observer.** \`subscribe()\` принимает либо объект \`{ next, error, complete }\`, либо просто функцию-next. RxJS оборачивает это в \`SafeSubscriber\` — экземпляр \`Subscriber\`.
2. **Subscriber как страж контракта.** \`Subscriber\` наследуется от \`Subscription\` и реализует Observer. Он гарантирует грамматику \`next* (error|complete)?\` — после терминального события \`next\` игнорируется; ловит исключения в колбэках; хранит флаг \`closed\` и список teardown-логики.
3. **Запуск producer-функции.** Observable вызывает свою \`_subscribe(subscriber)\` — ту самую функцию из конструктора. Для \`pipe\` это цепочка: каждый оператор оборачивает \`subscriber\` в свой «operator-subscriber», который трансформирует или фильтрует значения и передаёт дальше.
4. **Поток значений.** Producer вызывает \`subscriber.next(v)\`. Значение идёт по цепочке operator-subscriber-ов до конечного Observer.
5. **Возврат Subscription.** \`subscribe()\` возвращает \`Subscription\`; teardown, возвращённый producer-функцией, регистрируется в ней.
6. **Завершение и teardown.** При \`complete()\`, \`error()\` или \`unsubscribe()\` подписка помечается \`closed\`, и все teardown-функции вызываются рекурсивно вниз по цепочке — ресурсы освобождаются на каждом уровне.

## Пример

\`\`\`ts
// упрощённая модель оператора map — видно всю механику
function map(fn) {
  return (source) => new Observable(sub => {
    return source.subscribe({
      next: v => sub.next(fn(v)),   // трансформация
      error: e => sub.error(e),     // проксирование
      complete: () => sub.complete()
    });
  });
}
\`\`\`

Почему так: оператор не «обрабатывает поток» — он **создаёт новый Observable**, который при подписке подписывается на предыдущий. Отсюда и разворачивание «изнутри наружу», и то, что \`unsubscribe\` доезжает до источника рекурсивно.

## Что сказать на собеседовании

> При вызове \`subscribe\` аргументы — объект-Observer или функция-next — оборачиваются в \`SafeSubscriber\`, экземпляр \`Subscriber\`. Он наследуется от \`Subscription\` и реализует Observer, охраняя контракт: гарантирует грамматику \`next* (error|complete)?\`, ловит исключения в колбэках и хранит флаг \`closed\` со списком teardown. Затем Observable вызывает свою \`_subscribe\` — функцию из конструктора; если это цепочка \`pipe\`, каждый оператор оборачивает subscriber в собственный, поэтому подписка разворачивается от потребителя к источнику, а значения текут обратно к конечному Observer. При \`complete\`, \`error\` или \`unsubscribe\` подписка помечается закрытой и все teardown вызываются рекурсивно вниз по цепочке. Вывод: каждая подписка — независимое выполнение, unicast, а операторы создают новые Observable поверх предыдущих.

## Ловушки

- **«Операторы выполняются при вызове \`pipe\`»** — нет, \`pipe\` только собирает цепочку функций; работа начинается на \`subscribe\`.
- **Думать, что подписка идёт сверху вниз** — наоборот: снизу вверх, от потребителя к источнику.
- **Исключение в колбэке \`next\`** ловится \`SafeSubscriber\` и превращается в ошибку потока, а не «падает» молча в никуда.
- **Терять \`Subscription\`** — без неё нечего вызывать \`unsubscribe()\`, и остановить бесконечный источник нечем.
- **Ждать, что \`subscribe\` асинхронен** — он полностью синхронен, если синхронен продюсер.
- **Спросят следом**: чем \`Subscriber\` отличается от \`Observer\` — Observer это просто интерфейс с тремя колбэками, а Subscriber — класс, наследник Subscription, который обеспечивает контракт и владеет teardown.`,
      en: `## In short

\`subscribe()\` is the moment a "recipe" turns into a running stream. The operator chain **unfolds bottom-up**: subscription travels from your code towards the source, and values then flow back — from the source to you.

Analogy: a \`pipe\` chain is a set of **nested boxes**. On \`subscribe\` you open the outermost one, it opens the next, and so on down to the smallest — the source. Only once the last one is open do values start flying out and travelling back outwards, being transformed in each box on the way.

## How it works, step by step

1. **Observer normalization.** \`subscribe()\` accepts either an object \`{ next, error, complete }\` or just a next function. RxJS wraps it in a \`SafeSubscriber\` — an instance of \`Subscriber\`.
2. **The Subscriber as contract guard.** \`Subscriber\` extends \`Subscription\` and implements Observer. It enforces the grammar \`next* (error|complete)?\` — after a terminal event \`next\` is ignored; it catches exceptions in callbacks; and it holds a \`closed\` flag plus the list of teardown logic.
3. **Running the producer function.** The Observable calls its \`_subscribe(subscriber)\` — the very function passed to the constructor. For a \`pipe\` this is a chain: each operator wraps the \`subscriber\` in its own "operator-subscriber" that transforms or filters values and passes them along.
4. **Value flow.** The producer calls \`subscriber.next(v)\`. The value travels along the chain of operator-subscribers to the final Observer.
5. **Returning the Subscription.** \`subscribe()\` returns a \`Subscription\`; the teardown returned by the producer function is registered on it.
6. **Completion and teardown.** On \`complete()\`, \`error()\`, or \`unsubscribe()\`, the subscription is marked \`closed\` and every teardown function is invoked recursively down the chain — releasing resources at each level.

## Example

\`\`\`ts
// a simplified model of the map operator — the whole mechanism in view
function map(fn) {
  return (source) => new Observable(sub => {
    return source.subscribe({
      next: v => sub.next(fn(v)),   // transform
      error: e => sub.error(e),     // proxy
      complete: () => sub.complete()
    });
  });
}
\`\`\`

Why: an operator does not "process a stream" — it **creates a new Observable** that subscribes to the previous one when subscribed to. That is where the inside-out unfolding comes from, and why \`unsubscribe\` reaches the source recursively.

## What to say in the interview

> Calling \`subscribe\` first wraps the arguments — an Observer object or a next function — in a \`SafeSubscriber\`, an instance of \`Subscriber\`. That \`Subscriber\` extends \`Subscription\` and implements Observer, acting as the contract guard: it enforces the grammar \`next* (error|complete)?\` by ignoring \`next\` after a terminal event, catches exceptions in callbacks, and holds a \`closed\` flag along with the teardown list. Then the Observable calls its internal \`_subscribe\` — the function given to the constructor; if there is a \`pipe\` chain, each operator wraps the subscriber in its own, so subscription unfolds inside out, from consumer to source, and values flow back along the chain to the final Observer. On \`complete\`, \`error\`, or \`unsubscribe\` the subscription is marked closed and every teardown is invoked recursively down the chain. The key takeaway is that each subscription is an independent execution — unicast — and operators do not "process a stream", they build new Observables on top of previous ones.

## Gotchas

- **"Operators run when you call \`pipe\`"** — no, \`pipe\` only assembles a chain of functions; work begins at \`subscribe\`.
- **Assuming subscription flows top-down** — it is the opposite: bottom-up, from consumer to source.
- **An exception thrown in a \`next\` callback** is caught by \`SafeSubscriber\` and turned into a stream error rather than silently vanishing.
- **Losing the \`Subscription\`** — with nothing to call \`unsubscribe()\` on, an infinite producer cannot be stopped.
- **Expecting \`subscribe\` to be asynchronous** — it is entirely synchronous if the producer is.
- **Follow-up question**: how does a \`Subscriber\` differ from an \`Observer\`? An Observer is just an interface of three callbacks; a Subscriber is a class extending Subscription that enforces the contract and owns the teardown.`
    }
  },
  {
    id: 'rxjs-033',
    category: 'js-state',
    level: 'Medium',
    tags: ['startwith', 'scan', 'state'],
    question: {
      ru: 'Как реализовать простой state-store на RxJS с помощью scan и BehaviorSubject?',
      en: 'How do you implement a simple RxJS state store using scan and BehaviorSubject?'
    },
    answer: {
      ru: `## Коротко

Мини-Redux собирается без единой библиотеки. Нужны две вещи: **поток действий** и **функция, которая копит состояние**.

Ключевой оператор — \`scan\`. Это **«reduce во времени»**: обычный \`reduce\` схлопывает массив в одно значение в конце, а \`scan\` эмитит промежуточный аккумулятор **на каждое** входящее значение.

Аналогия: \`scan\` — это **банковский счёт**. Каждая операция (действие) прибавляется к текущему остатку, и после каждой операции вам показывают новый баланс. \`BehaviorSubject\` — это **та же выписка, но с табло**: там всегда написан текущий остаток, и посмотреть его можно синхронно.

## Два варианта — в чём разница

**Вариант на \`scan\`** — декларативный: чистые переходы состояния, ближе к Redux, тривиально тестируется. Но **синхронного снимка нет** — состояние существует только внутри потока.

**Вариант на \`BehaviorSubject\`** — императивный: есть \`.value\` (снимок «прямо сейчас»), проще для CRUD-обновлений. Но переходы описаны кодом, а не чистой функцией.

Две обязательные детали, без которых оба варианта ломаются:

- **\`shareReplay({ bufferSize: 1, refCount: true })\`** для \`scan\`-варианта — чтобы все подписчики делили **одно** состояние и получали последнее. Без него каждый \`subscribe\` запустит \`scan\` **заново, с нуля**.
- **\`asObservable()\`** для \`BehaviorSubject\` — чтобы потребители не могли вызвать \`next\` и писать в состояние мимо ваших методов.

## Пример

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

\`\`\`ts
// вариант на BehaviorSubject — когда нужен синхронный снимок
private state = new BehaviorSubject<State>({ count: 0 });
readonly state$ = this.state.asObservable();

get snapshot() { return this.state.value; }
patch(partial: Partial<State>) {
  this.state.next({ ...this.state.value, ...partial });
}
\`\`\`

Почему так: \`startWith\` нужен, потому что \`scan\` **не эмитит начальное значение** сам — он ждёт первого действия, и без \`startWith\` подписчик увидит пустоту до первого клика.

## Что сказать на собеседовании

> Мини-Redux на RxJS — это поток actions и чистая reduce-функция: \`scan\` — reduce во времени, он аккумулирует состояние и эмитит новое значение на каждое действие, поэтому \`Subject\` плюс \`scan\` дают redux-цикл без библиотеки. Два момента обязательны. Первый — \`startWith\`, потому что \`scan\` не отдаёт начальное значение до первого действия. Второй — \`shareReplay\` с буфером в единицу и \`refCount: true\`, чтобы все подписчики делили одно состояние; без него каждая подписка запустит \`scan\` заново со своим состоянием — классическая ошибка. Альтернатива — \`BehaviorSubject\`: он хранит текущее значение и даёт синхронный снимок через \`.value\`, а наружу отдаётся через \`asObservable()\`. Выбор: \`scan\` — когда важны чистые тестируемые переходы, \`BehaviorSubject\` — когда нужен синхронный доступ.

## Ловушки

- **Забыть \`shareReplay\`** — у каждого подписчика будет **своё** состояние. Самая частая ошибка в этом паттерне.
- **\`refCount: false\`** вместо \`true\` на бесконечном \`Subject\` — источник останется подписан навсегда.
- **Забыть \`startWith\`** — до первого действия шаблон не получит ничего.
- **Мутировать состояние в \`scan\`** (\`state.count++\`) — сломает \`distinctUntilChanged\`, OnPush и любую мемоизацию.
- **Публичный \`BehaviorSubject\`** — любой сможет писать в состояние в обход методов.
- **Спросят следом**: чем \`scan\` отличается от \`reduce\` — \`reduce\` эмитит **один раз при \`complete\`**, поэтому на бесконечном потоке он не выдаст вообще ничего.`,
      en: `## In short

A mini-Redux needs no library at all. Just two things: a **stream of actions** and a **function that accumulates state**.

The key operator is \`scan\`. It is **"reduce over time"**: an ordinary \`reduce\` collapses an array into one value at the end, while \`scan\` emits the running accumulator on **every** incoming value.

Analogy: \`scan\` is a **bank account**. Every transaction (action) is applied to the running balance, and after each one you are shown the new balance. A \`BehaviorSubject\` is **the same statement plus a display board**: the current balance is always up there and can be read synchronously.

## The two variants — what differs

**The \`scan\` variant** is declarative: pure state transitions, closest to Redux, trivially testable. But there is **no synchronous snapshot** — state exists only inside the stream.

**The \`BehaviorSubject\` variant** is imperative: it has \`.value\` (a "right now" snapshot) and is simpler for CRUD updates. But transitions are expressed as code rather than a pure function.

Two mandatory details, without which both variants break:

- **\`shareReplay({ bufferSize: 1, refCount: true })\`** for the \`scan\` variant, so all subscribers share **one** state and receive the latest. Without it every \`subscribe\` restarts \`scan\` **from scratch**.
- **\`asObservable()\`** for the \`BehaviorSubject\`, so consumers cannot call \`next\` and write into state behind your methods' backs.

## Example

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

\`\`\`ts
// the BehaviorSubject variant — when you need a synchronous snapshot
private state = new BehaviorSubject<State>({ count: 0 });
readonly state$ = this.state.asObservable();

get snapshot() { return this.state.value; }
patch(partial: Partial<State>) {
  this.state.next({ ...this.state.value, ...partial });
}
\`\`\`

Why: \`startWith\` is needed because \`scan\` **does not emit its seed** on its own — it waits for the first action, and without \`startWith\` the subscriber sees nothing until the first click.

## What to say in the interview

> A mini-Redux in RxJS is built from a stream of actions plus a pure reduce function. The \`scan\` operator is reduce over time: it accumulates state and emits a new value on every action, so a Subject of actions plus \`scan\` gives you exactly the redux cycle without a library. Two things are mandatory. First \`startWith\`, because \`scan\` does not emit the seed until the first action arrives. Second \`shareReplay\` with a buffer of one and \`refCount: true\`, so all subscribers share one state and receive the latest; without it every subscription re-runs \`scan\` with its own independent state, and that is the classic mistake. The alternative is a \`BehaviorSubject\`: it holds the current value, offers a synchronous snapshot through \`.value\`, and you expose it via \`asObservable()\`. The choice: \`scan\` when pure, testable transitions matter; \`BehaviorSubject\` when you need synchronous access. Both are the middle rung between a plain component field and full NgRx.

## Gotchas

- **Forgetting \`shareReplay\`** — every subscriber gets **its own** state. The most common bug in this pattern.
- **\`refCount: false\`** instead of \`true\` on an infinite Subject — the source stays subscribed forever.
- **Forgetting \`startWith\`** — the template receives nothing until the first action.
- **Mutating state inside \`scan\`** (\`state.count++\`) — it breaks \`distinctUntilChanged\`, OnPush, and every memoization.
- **A public \`BehaviorSubject\`** — anyone can write into state, bypassing your methods.
- **Follow-up question**: how does \`scan\` differ from \`reduce\`? \`reduce\` emits **once, on \`complete\`**, so on an infinite stream it emits nothing at all.`
    }
  },
  {
    id: 'rxjs-034',
    category: 'js-state',
    level: 'Expert',
    tags: ['glitch', 'combinelatest', 'gotcha'],
    question: {
      ru: 'Что такое «glitch» (промежуточные состояния) в combineLatest и как с ним бороться?',
      en: 'What is a "glitch" (intermediate state) in combineLatest and how do you deal with it?'
    },
    answer: {
      ru: `## Коротко

Glitch — это **промежуточное несогласованное состояние**, которое \`combineLatest\` выдаёт на долю секунды, когда его входы происходят **из одного и того же источника** (так называемая diamond-зависимость: один источник → две ветки → снова вместе).

Аналогия: два табло на вокзале питаются от одних часов, но обновляются по очереди. На мгновение первое уже показывает 12:01, а второе ещё 12:00. Пассажир, который смотрит на **оба сразу**, видит **невозможную** картину — её никогда не существовало в реальности.

## Как это происходит по шагам

1. \`source$\` эмитит новое значение.
2. Оно **синхронно** уходит в первую ветку \`a$\`, и та эмитит.
3. \`combineLatest\` реагирует **немедленно**, потому что он эмитит на **любую** эмиссию **любого** входа.
4. Но \`b$\` в этот момент **ещё не обновился** — он получит значение следующей строкой.
5. Наружу вылетает пара **[новое a, старое b]** — это и есть glitch.
6. Затем эмитит \`b$\`, и \`combineLatest\` выдаёт вторую, уже корректную пару **[новое a, новое b]**.

\`\`\`text
source:            --1--------2--------
a$ (x):            --1--------2--------
b$ (x*2):          --2--------4--------
combineLatest:     --(1,undef)(1,2)--(2,2)(2,4)--
                                ^ ок    ^ glitch  ^ ок
\`\`\`

## Три решения

1. **Комбинировать ДО разветвления.** Считайте производные значения одним \`map\` после источника, вместо того чтобы разводить поток и сводить обратно: \`source$.pipe(map(x => ({ a: x, b: x * 2 })))\`. Это лучшее решение — glitch физически невозможен.
2. **Схлопнуть синхронную пачку.** \`auditTime(0)\` или \`debounceTime(0)\` после \`combineLatest\` пропустят только **последнюю**, согласованную эмиссию из синхронной серии. Плюс \`distinctUntilChanged\` уберёт дубликаты.
3. **Использовать Signals.** Граф \`computed\` в Angular Signals **glitch-free**: производное значение пересчитывается один раз, после того как все зависимости согласованы (pull-модель плюс топологический порядок обхода).

## Пример

\`\`\`ts
// ПЛОХО: развели и свели — будет glitch
const a$ = source$.pipe(map(x => x));
const b$ = source$.pipe(map(x => x * 2));
combineLatest([a$, b$]).subscribe(console.log);

// ХОРОШО: считаем всё сразу, разветвления нет
source$.pipe(map(x => ({ a: x, b: x * 2 }))).subscribe(console.log);

// Компромисс, если развести уже пришлось
combineLatest([a$, b$]).pipe(auditTime(0)).subscribe(console.log);
\`\`\`

Почему так: \`auditTime(0)\` не «ждёт 0 миллисекунд» впустую — он откладывает эмиссию на следующий тик планировщика, и вся синхронная серия успевает завершиться, а наружу уходит только финальная согласованная пара.

## Что сказать на собеседовании

> Glitch — это промежуточное несогласованное состояние на выходе \`combineLatest\` при diamond-зависимости, когда несколько входов выведены из одного источника. Причина в том, что \`combineLatest\` эмитит на каждую эмиссию любого входа, а источник пушит значение в ветки синхронно и по очереди: первая ветка обновилась, вторая ещё нет, и между ними вылетает пара из нового и старого значений — комбинация, которой никогда не существовало. Решений три. Лучшее — комбинировать до разветвления, делая все производные вычисления одним \`map\` после источника. Второе — схлопнуть синхронную пачку через \`auditTime(0)\` или \`debounceTime(0)\` после \`combineLatest\`. Третье — Signals: граф \`computed\` в Angular glitch-free, потому что это pull-модель с топологическим обходом, и производное пересчитывается один раз после согласования зависимостей.

## Ловушки

- **Считать glitch «редкой экзотикой»** — при NgRx-селекторах и формах diamond-зависимости встречаются постоянно.
- **Лечить \`distinctUntilChanged\` в одиночку** — промежуточная пара **действительно другая**, так что он её не отсечёт.
- **\`debounceTime(0)\` на очень активном источнике** — может съедать и легитимные эмиссии, \`auditTime(0)\` безопаснее.
- **Побочные эффекты прямо в \`subscribe\`** после \`combineLatest\` — glitch отправит лишний HTTP-запрос с несогласованными параметрами.
- **Ждать glitch от \`withLatestFrom\`** — его там нет: эмиссию триггерит только первичный поток.
- **Спросят следом**: а \`zip\` глитчит? Нет, он сопоставляет по индексу, но платит за это растущим буфером.`,
      en: `## In short

A glitch is an **intermediate, inconsistent state** that \`combineLatest\` emits for a split second when its inputs derive from **the same source** (a diamond dependency: one source → two branches → back together).

Analogy: two station boards run off the same clock but refresh one after the other. For an instant the first already reads 12:01 while the second still reads 12:00. A passenger looking at **both at once** sees an **impossible** picture — one that never actually existed.

## How it happens, step by step

1. \`source$\` emits a new value.
2. It travels **synchronously** into the first branch \`a$\`, which emits.
3. \`combineLatest\` reacts **immediately**, because it emits on **any** emission of **any** input.
4. But \`b$\` **has not updated yet** — it will receive the value on the next line.
5. Out comes the pair **[new a, old b]** — that is the glitch.
6. Then \`b$\` emits and \`combineLatest\` produces the second, now correct pair **[new a, new b]**.

\`\`\`text
source:            --1--------2--------
a$ (x):            --1--------2--------
b$ (x*2):          --2--------4--------
combineLatest:     --(1,undef)(1,2)--(2,2)(2,4)--
                                ^ ok    ^ glitch  ^ ok
\`\`\`

## Three solutions

1. **Combine BEFORE branching.** Compute derived values in a single \`map\` after the source instead of splitting and re-joining: \`source$.pipe(map(x => ({ a: x, b: x * 2 })))\`. This is the best fix — a glitch becomes physically impossible.
2. **Collapse the synchronous burst.** \`auditTime(0)\` or \`debounceTime(0)\` after \`combineLatest\` lets only the **last**, consistent emission of a synchronous series through. Add \`distinctUntilChanged\` to drop duplicates.
3. **Use Signals.** Angular's \`computed\` graph is **glitch-free**: a derived value is recomputed once, after all dependencies have settled (a pull model with topological traversal).

## Example

\`\`\`ts
// BAD: split and re-joined — glitch guaranteed
const a$ = source$.pipe(map(x => x));
const b$ = source$.pipe(map(x => x * 2));
combineLatest([a$, b$]).subscribe(console.log);

// GOOD: compute everything at once, no branching
source$.pipe(map(x => ({ a: x, b: x * 2 }))).subscribe(console.log);

// A compromise if the branching already exists
combineLatest([a$, b$]).pipe(auditTime(0)).subscribe(console.log);
\`\`\`

Why: \`auditTime(0)\` does not "wait zero milliseconds" pointlessly — it defers the emission to the next scheduler tick, so the whole synchronous series finishes first and only the final consistent pair escapes.

## What to say in the interview

> A glitch is an intermediate, inconsistent state coming out of \`combineLatest\` when several of its inputs derive from the same source — a diamond dependency. The cause is that \`combineLatest\` emits on every emission of any input, while the source pushes its value into the branches synchronously and one at a time: the first branch has already updated, the second has not, and in between a pair of new and stale values escapes — a combination that never actually existed. There are three fixes. The best is to combine before branching: do all derivations in a single \`map\` after the source. The second is to collapse the synchronous burst with \`auditTime(0)\` or \`debounceTime(0)\` after \`combineLatest\`, so only the last consistent combination gets out. The third is Signals: Angular's \`computed\` graph is glitch-free because it is a pull model with topological traversal, and a derived value is recomputed once after all dependencies settle. That is a strong architectural argument for Signals when derived state gets complex.

## Gotchas

- **Treating glitches as rare exotica** — with NgRx selectors and forms, diamond dependencies show up constantly.
- **Trying to fix it with \`distinctUntilChanged\` alone** — the intermediate pair genuinely *is* different, so it will not be filtered.
- **\`debounceTime(0)\` on a very busy source** — it can swallow legitimate emissions too; \`auditTime(0)\` is safer.
- **Side effects directly in \`subscribe\`** after \`combineLatest\` — a glitch fires an extra HTTP request with inconsistent parameters.
- **Expecting glitches from \`withLatestFrom\`** — there are none: only the primary stream triggers emissions.
- **Follow-up question**: does \`zip\` glitch? No, it pairs by index — but it pays for that with a growing buffer.`
    }
  },
  {
    id: 'rxjs-035',
    category: 'js-state',
    level: 'Hard',
    tags: ['mergemap', 'backpressure', 'concurrency'],
    question: {
      ru: 'Что такое backpressure в контексте RxJS и как ограничить конкурентность mergeMap?',
      en: 'What is backpressure in the RxJS context and how do you limit mergeMap concurrency?'
    },
    answer: {
      ru: `## Коротко

Backpressure — это ситуация, когда **продюсер эмитит быстрее, чем потребитель успевает обрабатывать**.

Аналогия: **раковина, в которую вода льётся быстрее, чем уходит в слив**. Вариантов ровно три: прикрутить кран (ограничить конкурентность), поставить таз и обрабатывать по очереди (буферизовать), или часть воды просто выплеснуть (lossy-стратегии).

Важный факт: в классическом RxJS **нет** встроенного reactive-streams backpressure, как в Project Reactor, где потребитель запрашивает N элементов. Вместо этого есть операторы, которыми вы **сами** выбираете стратегию.

## Три стратегии — когда что

**1. Lossy — отбрасываем лишнее.** Годится, когда промежуточные значения не важны:

- \`throttleTime\`, \`auditTime\`, \`sampleTime\`, \`debounceTime\` — пропускают только часть значений;
- \`switchMap\` — отменяет предыдущую операцию;
- \`exhaustMap\` — игнорирует новые, пока занят (защита кнопки от дабл-клика).

**2. Буферизующие — копим и обрабатываем.** Годится, когда терять нельзя:

- \`bufferTime\`, \`bufferCount\` — собирают значения в пачки;
- \`concatMap\` — строит очередь, но помните: если источник стабильно быстрее обработки, **буфер растёт** — это риск памяти.

**3. Ограничение конкурентности — золотая середина.** \`mergeMap(project, concurrency)\`: второй аргумент задаёт максимум **одновременных** внутренних подписок, остальные ждут в очереди.

## Пример

\`\`\`ts
// не более 3 параллельных загрузок одновременно
from(fileIds).pipe(
  mergeMap(id => uploadFile(id), 3)
).subscribe();
\`\`\`

Почему так: без второго аргумента \`mergeMap\` на тысяче id откроет **тысячу** одновременных запросов — браузер упрётся в лимит соединений, а сервер может лечь. И полезный факт для памяти: \`mergeMap(fn, 1)\` — это в точности \`concatMap\`, очередь по одному.

## Что сказать на собеседовании

> Backpressure — это когда продюсер эмитит быстрее, чем консьюмер обрабатывает. В классическом RxJS нет встроенного reactive-streams backpressure, как в Project Reactor: стратегия выбирается операторами явно, и их три. Первая — lossy, осознанная потеря: \`throttleTime\`, \`auditTime\`, \`sampleTime\`, \`debounceTime\`, а также \`switchMap\`, который отменяет устаревшую операцию, и \`exhaustMap\`. Вторая — буферизация: \`bufferTime\` и \`bufferCount\` собирают пачки, а \`concatMap\` выстраивает очередь, но если источник стабильно быстрее обработки, очередь растёт — риск по памяти. Третья и самая практичная — ограничение конкурентности вторым аргументом \`mergeMap\`: неограниченный \`mergeMap\` на быстром источнике порождает тысячи запросов и исчерпывает соединения. И эквивалентность: \`mergeMap\` с конкурентностью один — это \`concatMap\`.

## Ловушки

- **\`mergeMap\` без лимита** на быстром источнике — тысячи параллельных запросов, исчерпание пула соединений.
- **\`concatMap\` как «безопасный вариант»** — он не теряет значения, но при постоянном перегрузе очередь растёт бесконечно.
- **\`bufferTime\` без ограничения размера** — на всплеске в буфер попадёт всё подряд, и память уйдёт.
- **Думать, что RxJS «сам разрулит»** — нет, стратегию выбираете вы; по умолчанию никакого backpressure нет.
- **\`debounceTime\` как решение backpressure** на непрерывном потоке — тишина не наступит, и не выйдет вообще ничего.
- **Спросят следом**: чем RxJS отличается от reactive-streams — там consumer запрашивает N элементов (pull-based request), в RxJS такого протокола нет, только операторы поверх push-модели.`,
      en: `## In short

Backpressure is when the **producer emits faster than the consumer can process**.

Analogy: **a sink filling faster than it drains**. There are exactly three options: turn the tap down (limit concurrency), put a basin under it and work through the queue (buffer), or simply tip some water away (lossy strategies).

An important fact: classic RxJS has **no** built-in reactive-streams backpressure like Project Reactor, where the consumer requests N items. Instead it gives you operators with which **you** choose the strategy.

## Three strategies — when to use which

**1. Lossy — drop the excess.** Right when intermediate values do not matter:

- \`throttleTime\`, \`auditTime\`, \`sampleTime\`, \`debounceTime\` — let only some values through;
- \`switchMap\` — cancels the previous operation;
- \`exhaustMap\` — ignores new ones while busy (double-click protection on a button).

**2. Buffering — accumulate and work through.** Right when nothing may be lost:

- \`bufferTime\`, \`bufferCount\` — collect values into batches;
- \`concatMap\` — builds a queue, but remember: if the source is consistently faster than processing, the **buffer grows** — a memory risk.

**3. Limiting concurrency — the sweet spot.** \`mergeMap(project, concurrency)\`: the second argument caps the number of **simultaneous** inner subscriptions; the rest wait in a queue.

## Example

\`\`\`ts
// at most 3 parallel uploads at once
from(fileIds).pipe(
  mergeMap(id => uploadFile(id), 3)
).subscribe();
\`\`\`

Why: without the second argument, \`mergeMap\` over a thousand ids opens **a thousand** simultaneous requests — the browser hits its connection limit and the server may fall over. A handy fact to remember: \`mergeMap(fn, 1)\` is exactly \`concatMap\`, a one-at-a-time queue.

## What to say in the interview

> Backpressure is when the producer emits values faster than the consumer can process them. Classic RxJS has no built-in reactive-streams backpressure like Project Reactor, where the consumer requests a specific number of items; instead you choose the strategy explicitly with operators, and there are three. First, lossy, deliberately dropping values: \`throttleTime\`, \`auditTime\`, \`sampleTime\`, \`debounceTime\`, plus \`switchMap\`, which cancels the stale operation, and \`exhaustMap\`, which ignores new ones while busy. Second, buffering: \`bufferTime\` and \`bufferCount\` collect values into batches and \`concatMap\` queues them up — but if the source is consistently faster than processing, the queue grows into a memory risk. Third and most practical, limiting concurrency through \`mergeMap\`'s second argument: an unbounded \`mergeMap\` on a fast source easily spawns thousands of concurrent HTTP requests, exhausting the connection pool. And a useful equivalence: \`mergeMap\` with a concurrency of one is the same as \`concatMap\`.

## Gotchas

- **Unbounded \`mergeMap\`** on a fast source — thousands of parallel requests and an exhausted connection pool.
- **Treating \`concatMap\` as "the safe option"** — it loses nothing, but under sustained overload the queue grows without bound.
- **\`bufferTime\` with no size cap** — a burst dumps everything into the buffer and memory goes with it.
- **Assuming RxJS "handles it"** — it does not; you choose the strategy, and the default is no backpressure at all.
- **\`debounceTime\` as a backpressure fix** on a continuous stream — the silence never comes and nothing is emitted at all.
- **Follow-up question**: how does RxJS differ from reactive streams? There the consumer requests N items via a pull-based request protocol; RxJS has no such protocol, only operators layered on a push model.`
    }
  },
  {
    id: 'rxjs-036',
    category: 'js-state',
    level: 'Hard',
    tags: ['architecture', 'state-management', 'patterns'],
    question: {
      ru: 'Как выбрать подход к state management в Angular-приложении? Сравните уровни сложности.',
      en: 'How do you choose a state management approach in an Angular app? Compare complexity levels.'
    },
    answer: {
      ru: `## Коротко

Главная мысль: **не всё состояние одинаково**, и архитектурный навык — подбирать инструмент под масштаб, а не тащить NgRx во все проекты подряд.

Аналогия: вы же не берёте фуру, чтобы отвезти один пакет из магазина. И не грузите мебель на велосипед. **Транспорт выбирают под груз** — со стейт-менеджментом ровно так же.

Сначала разделите **виды** состояния:

- **Локальное UI** (открыт ли дропдаун, активная вкладка) — поле компонента или signal.
- **Серверное / кэш** (данные из API) — часто лучше кэш вроде \`@tanstack/query\` или сервис с \`shareReplay\`.
- **Глобальное клиентское** (текущий пользователь, тема, корзина) — store.

## Лестница сложности — четыре ступени

1. **Локальные поля / Signals.** Простейшее. Изолированное состояние компонента, нулевой boilerplate. Начинайте всегда отсюда.
2. **Сервис с \`BehaviorSubject\` или сигналами.** Классический «service with a Subject»: инкапсулирует состояние, наружу отдаёт Observable или signal. Достаточно для среднего разделяемого состояния внутри feature-модуля.
3. **\`@ngrx/signals\` SignalStore.** Структурированный store с \`withComputed\`, \`withMethods\`, \`withEntities\` — когда обычного сервиса уже мало, но Redux-церемония избыточна.
4. **NgRx Store / NGXS.** Полный Redux: actions, reducers, effects, DevTools, time-travel. Для крупных приложений со сложным, широко разделяемым состоянием, многими командами и требованием аудита изменений.

## Критерии выбора

- **Масштаб и команда**: больше людей и фич → строже структура.
- **Сложность асинхронности**: много гонок и отмен → нужны RxJS-эффекты.
- **Нужен ли аудит и time-travel DevTools** → это аргумент в пользу NgRx.
- **Цена boilerplate**: не платите за неё, пока боль не стала реальной.

## Пример

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class CartService {
  private items = signal<Item[]>([]);
  readonly total = computed(() => this.items().reduce((s, i) => s + i.price, 0));
  add(item: Item) { this.items.update(arr => [...arr, item]); }
}
\`\`\`

Почему так: это вторая ступень лестницы, и для корзины среднего магазина её достаточно. Здесь есть инкапсуляция, производное значение и иммутабельное обновление — всё, что даёт NgRx, но без actions, reducers и трёх дополнительных файлов.

## Что сказать на собеседовании

> Состояние бывает разного вида, и смешивать их — главная ошибка. Локальное UI-состояние живёт в поле компонента или в сигнале; серверное состояние — это кэш ответов API, и его правильнее решать слоем в духе \`@tanstack/query\` или сервисом с \`shareReplay\`, а не глобальным store; и только глобальное клиентское — пользователь, тема, корзина — просится в store. Дальше лестница: локальные поля и Signals с нулевым boilerplate; сервис с \`BehaviorSubject\` для разделяемого состояния feature-модуля; \`@ngrx/signals\` SignalStore, когда сервиса мало, а Redux избыточен; и NgRx или NGXS с actions, reducers, effects и DevTools для крупных приложений с требованием аудита. Критерии — масштаб команды, сложность асинхронности, потребность в time-travel и цена boilerplate. Правило: начинать с простого и подниматься, только когда боль реальна.

## Ловушки

- **NgRx «потому что энтерпрайз»** — boilerplate платится сразу, а польза появляется только на масштабе.
- **Складывать серверный кэш в store** — вы вручную пишете инвалидацию, ретраи и дедупликацию, которые уже решены кэширующими библиотеками.
- **Локальное UI-состояние в глобальном store** — три файла ради одного булева флага.
- **Смешивать источники истины**: часть в store, часть в сервисе, часть в поле компонента — рассинхрон гарантирован.
- **«Signals заменили state-менеджеры»** — они закрывают хранение и производные значения, но не оркестрацию асинхронности и не аудит.
- **Спросят следом**: как мигрировать вверх по лестнице — фасад или SignalStore как раз и позволяют сменить реализацию, не переписывая компоненты.`,
      en: `## In short

The core idea: **not all state is the same**, and the architectural skill is matching the tool to the scale rather than dragging NgRx into every project.

Analogy: you do not hire an articulated lorry to bring one bag home from the shop. Nor do you move furniture on a bicycle. **You pick the vehicle to fit the load** — state management works exactly the same way.

First, separate the **kinds** of state:

- **Local UI** (is the dropdown open, which tab is active) — a component field or a signal.
- **Server / cache** (API data) — often better served by a cache like \`@tanstack/query\` or a service with \`shareReplay\`.
- **Global client** (current user, theme, cart) — a store.

## The complexity ladder — four rungs

1. **Local fields / Signals.** The simplest. Isolated component state, zero boilerplate. Always start here.
2. **A service with a \`BehaviorSubject\` or signals.** The classic "service with a Subject": it encapsulates state and exposes an Observable or signal. Enough for moderate shared state inside a feature module.
3. **\`@ngrx/signals\` SignalStore.** A structured store with \`withComputed\`, \`withMethods\`, \`withEntities\` — when a plain service is no longer enough but Redux ceremony is overkill.
4. **NgRx Store / NGXS.** Full Redux: actions, reducers, effects, DevTools, time travel. For large applications with complex, widely shared state, several teams, and a requirement to audit changes.

## Choice criteria

- **Scale and team**: more people and features → stricter structure.
- **Async complexity**: lots of races and cancellations → you need RxJS effects.
- **Need for auditing and time-travel DevTools** → an argument for NgRx.
- **The cost of boilerplate**: do not pay it until the pain is real.

## Example

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class CartService {
  private items = signal<Item[]>([]);
  readonly total = computed(() => this.items().reduce((s, i) => s + i.price, 0));
  add(item: Item) { this.items.update(arr => [...arr, item]); }
}
\`\`\`

Why: this is rung two of the ladder, and for a mid-sized shop's cart it is plenty. There is encapsulation, a derived value, and an immutable update — everything NgRx would give you, minus actions, reducers, and three extra files.

## What to say in the interview

> I start from the fact that state comes in different kinds, and mixing them is the main mistake. Local UI state belongs in a component field or a signal. Server state is a cache of API responses, better handled by a caching layer in the spirit of \`@tanstack/query\`, or a service with \`shareReplay\`, than pushed into a global store. Only genuinely global client state — the current user, the theme, the cart — really belongs in a store. From there I climb a ladder: local fields and Signals with zero boilerplate; a service with a \`BehaviorSubject\` for shared state within a feature module; \`@ngrx/signals\` SignalStore when a service is not enough but Redux is overkill; and full NgRx or NGXS with actions, reducers, effects, and DevTools for large applications with auditing requirements. My criteria are scale and team size, async complexity, the need for auditing and time travel, and the cost of boilerplate. The rule is simple: start simple and climb only when the pain is real, because climbing back down later costs far more.

## Gotchas

- **NgRx "because enterprise"** — the boilerplate is paid immediately, the benefit only shows up at scale.
- **Putting a server cache in the store** — you hand-roll invalidation, retries, and deduplication that caching libraries already solved.
- **Local UI state in the global store** — three files for one boolean flag.
- **Mixing sources of truth**: some in the store, some in a service, some in a component field — drift is guaranteed.
- **"Signals replaced state managers"** — they cover storage and derivation, but not async orchestration or auditability.
- **Follow-up question**: how do you migrate up the ladder? A facade or a SignalStore is precisely what lets you swap the implementation without rewriting components.`
    }
  }
];
